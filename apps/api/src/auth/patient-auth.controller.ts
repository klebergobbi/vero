import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import type { TokenPair } from "./auth.service";
import { PatientAuthService } from "./patient-auth.service";
import { PatientLoginDto } from "./dto/patient-login.dto";
import { RefreshDto } from "./dto/refresh.dto";

/**
 * Autenticação do App do Paciente (CLAUDE.md S8a). Rotas públicas (emitem token,
 * não exigem um). Mesmo endurecimento da auth de equipe: erro genérico + rate
 * limit reforçado no login. A rota protegida do paciente (/me/*) chega na S8b.
 */
@Public()
@Controller("auth/patient")
export class PatientAuthController {
  constructor(private readonly auth: PatientAuthService) {}

  /** POST /auth/patient/login — anti-brute-force: 5 req/min/IP (sobrepõe o global). */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: PatientLoginDto): Promise<TokenPair> {
    return this.auth.login(dto);
  }

  /** POST /auth/patient/refresh — rotaciona o par; o refresh antigo é invalidado. */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<TokenPair> {
    return this.auth.refresh(dto.refreshToken);
  }

  /** POST /auth/patient/logout — revoga a sessão (jti) do refresh. Idempotente. */
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }
}
