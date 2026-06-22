import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
} from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Public } from "../common/decorators/public.decorator";
import { CurrentPrincipal } from "../common/decorators/self-account.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { AnamnesisService } from "./anamnesis.service";
import {
  CreateTemplateDto,
  SendAnamnesisDto,
  SubmitFillDto,
} from "./dto/anamnesis.dto";

/** Anamnese digital (S28) — rotas da EQUIPE (record:read|write). */
@Controller("anamnesis")
export class AnamnesisController {
  constructor(private readonly anamnesis: AnamnesisService) {}

  /** Modelos reutilizáveis. Declarado ANTES de `:id` (evita colisão de rota). */
  @Post("templates")
  @Permissions("record:write")
  createTemplate(@TenantId() tenantId: string, @Body() dto: CreateTemplateDto) {
    return this.anamnesis.createTemplate(tenantId, {
      name: dto.name,
      ...(dto.procedureKey ? { procedureKey: dto.procedureKey } : {}),
      questions: dto.questions,
    });
  }

  @Get("templates")
  @Permissions("record:read")
  listTemplates(@TenantId() tenantId: string) {
    return this.anamnesis.listTemplates(tenantId);
  }

  /** Envia a anamnese a um paciente; devolve o link de uso único. */
  @Post()
  @Permissions("record:write")
  send(@TenantId() tenantId: string, @Body() dto: SendAnamnesisDto) {
    return this.anamnesis.send(tenantId, {
      patientId: dto.patientId,
      templateId: dto.templateId,
    });
  }

  /** Visualiza a anamnese preenchida (AUDITA SENSITIVE_READ). */
  @Get(":id")
  @Permissions("record:read")
  view(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @CurrentPrincipal() principal: Principal,
    @Ip() ip: string,
  ) {
    const actorId = principal.kind === "staff" ? principal.userId : undefined;
    return this.anamnesis.view(tenantId, id, {
      ...(actorId ? { actorId } : {}),
      ip,
    });
  }
}

/**
 * Preenchimento/assinatura REMOTO por link de uso único (§S28). PÚBLICO (sem JWT):
 * a anamnese é resolvida SÓ pelo token (capability), nunca por id do cliente.
 */
@Controller("anamnesis/fill")
export class AnamnesisFillController {
  constructor(private readonly anamnesis: AnamnesisService) {}

  @Get(":token")
  @Public()
  getForm(@Param("token") token: string) {
    return this.anamnesis.getFillForm(token);
  }

  @Post(":token")
  @Public()
  @HttpCode(200)
  submit(
    @Param("token") token: string,
    @Body() dto: SubmitFillDto,
    @Ip() ip: string,
  ) {
    return this.anamnesis.submitFill(token, dto.answers, { ip });
  }
}
