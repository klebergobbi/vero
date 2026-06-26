import { Body, Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import type {
  AuthenticatedUser,
  Principal,
} from "../auth/strategies/jwt.strategy";
import { CreateAppointmentDto } from "../appointment/dto/create-appointment.dto";
import { CurrentPrincipal } from "../common/decorators/self-account.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CentralQueryDto } from "./dto/scheduling.dto";
import { SchedulingCenterService } from "./scheduling-center.service";

/**
 * Central de agendamentos multi-unidade (S48). Deny-by-default via guards globais.
 * O operador lê e cria agendamentos em qualquer unidade autorizada (UserUnit),
 * sem precisar trocar a unidade ativa na sessão.
 * Anti-IDOR: a service valida o UserUnit antes de expor ou criar qualquer dado.
 * Gated por appointment:read/write → apenas equipe (pacientes não têm essas permissions).
 */
@Controller("network/scheduling")
export class SchedulingCenterController {
  constructor(private readonly center: SchedulingCenterService) {}

  /** Agendamentos consolidados das unidades autorizadas do operador. */
  @Get()
  @Permissions("appointment:read")
  getConsolidated(
    @TenantId() tenantId: string,
    @CurrentPrincipal() principal: Principal,
    @Query() query: CentralQueryDto,
  ) {
    const { userId } = principal as AuthenticatedUser;
    return this.center.getConsolidated(tenantId, userId, query);
  }

  /** Unidades autorizadas do operador (para o seletor no form). */
  @Get("units")
  @Permissions("appointment:read")
  listUnits(
    @TenantId() tenantId: string,
    @CurrentPrincipal() principal: Principal,
  ) {
    const { userId } = principal as AuthenticatedUser;
    return this.center.listAuthorizedUnits(tenantId, userId);
  }

  /**
   * Cria um agendamento na unidade especificada, validando autorização
   * (UserUnit). Delega ao AppointmentService — conflito de horário → 409.
   */
  @Post("appointments")
  @HttpCode(201)
  @Permissions("appointment:write")
  book(
    @TenantId() tenantId: string,
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateAppointmentDto,
  ) {
    const { userId } = principal as AuthenticatedUser;
    return this.center.book(tenantId, userId, dto);
  }
}
