import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { RedisService } from "../redis/redis.service";
import { ApiKeyService } from "./api-key.service";

export const API_KEY_SCOPES_KEY = "api_key_scopes";

/** Marca rotas da API pública com os escopos exigidos. */
export const ApiKeyScopes = (...scopes: string[]) =>
  SetMetadata(API_KEY_SCOPES_KEY, scopes);

/** Extrai o token Bearer ou o header x-api-key do request. */
function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const header = req.headers["x-api-key"];
  if (typeof header === "string") return header;
  return null;
}

/**
 * Guard para rotas da API pública (S49).
 * Valida a API key, aplica rate limiting por chave (Redis INCR/EXPIRE)
 * e verifica os escopos exigidos pelo handler.
 * Rotas devem ser marcadas com @Public() + @UseGuards(ApiKeyGuard).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { tenantId?: string; apiKey?: object }>();
    const plain = extractToken(req);

    if (!plain) throw new UnauthorizedException("API key obrigatória");

    const apiKey = await this.apiKeyService.validateKey(plain);
    if (!apiKey)
      throw new UnauthorizedException("API key inválida ou expirada");

    // Rate limit: INCR por chave, janela de 60s.
    const rateKey = `api:rate:${apiKey.id}`;
    let count: number;
    try {
      count = await this.redis.incr(rateKey);
      if (count === 1) await this.redis.expire(rateKey, 60);
    } catch {
      // Falha de Redis → fail-closed (§4 "fail-closed").
      throw new ServiceUnavailableException();
    }

    if (count > apiKey.rateLimit) {
      throw new ForbiddenException(
        `Rate limit excedido (${apiKey.rateLimit} req/min)`,
      );
    }

    // Verificar escopos exigidos pelo handler.
    const required: string[] =
      this.reflector.getAllAndOverride<string[]>(API_KEY_SCOPES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];

    for (const scope of required) {
      if (!apiKey.scopes.includes(scope)) {
        throw new ForbiddenException(
          `Escopo '${scope}' não concedido a esta chave`,
        );
      }
    }

    // Injetar tenantId p/ que @TenantId() funcione nessas rotas.
    req.tenantId = apiKey.tenantId;
    req.apiKey = apiKey;

    return true;
  }
}
