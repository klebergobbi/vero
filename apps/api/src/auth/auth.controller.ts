import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { AuthService, type TokenPair } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";

// Rotas de autenticação são públicas (não exigem token nem permission).
@Public()
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * POST /auth/login — rate limit reforçado anti-brute-force: 5 req/min/IP
   * (sobrepõe o throttler global "global" só nesta rota — CLAUDE.md §4 A07).
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.auth.login(dto);
  }

  /** POST /auth/refresh — rotaciona o par de tokens; o refresh antigo é invalidado. */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<TokenPair> {
    return this.auth.refresh(dto.refreshToken);
  }

  /** POST /auth/logout — revoga a sessão (jti) do refresh token. Idempotente. */
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }
}
