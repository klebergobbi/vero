import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { ApiKeyGuard, ApiKeyScopes } from "./api-key.guard";
import { ApiKeyService } from "./api-key.service";
import {
  CreateApiKeyDto,
  CreateWebhookDto,
  UpdateBrandingDto,
} from "./dto/api-key.dto";

// ── Gestão de chaves (requer JWT de equipe + billing:read|write) ───────────

/**
 * Endpoints de gestão da API pública: chaves, webhooks e branding.
 * Protegido pelo guard global (JWT + permissions). Gated por billing:write/read.
 */
@Controller("manage")
export class ManageController {
  constructor(private readonly svc: ApiKeyService) {}

  // ── API Keys ──

  @Post("api-keys")
  @Permissions("billing:write")
  createApiKey(@TenantId() tenantId: string, @Body() dto: CreateApiKeyDto) {
    return this.svc.create(tenantId, dto);
  }

  @Get("api-keys")
  @Permissions("billing:read")
  listApiKeys(@TenantId() tenantId: string) {
    return this.svc.list(tenantId);
  }

  @Delete("api-keys/:id")
  @HttpCode(204)
  @Permissions("billing:write")
  revokeApiKey(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.svc.revoke(tenantId, id);
  }

  // ── Branding ──

  @Get("branding")
  @Permissions("billing:read")
  getBranding(@TenantId() tenantId: string) {
    return this.svc.getBranding(tenantId);
  }

  @Patch("branding")
  @Permissions("billing:write")
  updateBranding(@TenantId() tenantId: string, @Body() dto: UpdateBrandingDto) {
    return this.svc.updateBranding(tenantId, dto);
  }

  // ── Webhooks de saída ──

  @Post("webhooks")
  @Permissions("billing:write")
  createWebhook(@TenantId() tenantId: string, @Body() dto: CreateWebhookDto) {
    return this.svc.createWebhook(tenantId, dto);
  }

  @Get("webhooks")
  @Permissions("billing:read")
  listWebhooks(@TenantId() tenantId: string) {
    return this.svc.listWebhooks(tenantId);
  }

  @Delete("webhooks/:id")
  @HttpCode(204)
  @Permissions("billing:write")
  revokeWebhook(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.svc.revokeWebhook(tenantId, id);
  }
}

// ── API pública v1 (requer API key válida + escopo) ───────────────────────

/**
 * Endpoints da API pública v1 consumidos por terceiros.
 * @Public() contorna o guard global (sem JWT); @UseGuards(ApiKeyGuard) aplica
 * a validação de API key + rate limit + escopos.
 */
@Public()
@UseGuards(ApiKeyGuard)
@Controller("api/v1")
export class V1Controller {
  constructor(private readonly svc: ApiKeyService) {}

  @Get("appointments")
  @ApiKeyScopes("appointments:read")
  listAppointments(
    @TenantId() tenantId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.svc.listAppointments(tenantId, {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  @Get("patients")
  @ApiKeyScopes("patients:read")
  listPatients(@TenantId() tenantId: string, @Query("q") q?: string) {
    return this.svc.listPatients(tenantId, { ...(q ? { q } : {}) });
  }

  /** Branding público: sem escopo obrigatório — qualquer chave válida pode ler. */
  @Get("branding")
  getBranding(@TenantId() tenantId: string) {
    return this.svc.getBranding(tenantId);
  }
}
