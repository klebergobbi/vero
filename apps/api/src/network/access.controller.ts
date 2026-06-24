import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import {
  CurrentPrincipal,
  SelfAccount,
} from "../common/decorators/self-account.decorator";
import { AccessService } from "./access.service";
import { SwitchUnitDto } from "./dto/switch-unit.dto";

/**
 * Central de acessos multi-unidade (§S45). `@SelfAccount` libera qualquer principal
 * autenticado, mas a AccessService age só sobre o próprio principal (e nega paciente):
 * lista/troca a unidade ATIVA do próprio usuário — nunca um id de usuário do cliente.
 */
@SelfAccount()
@Controller("network")
export class AccessController {
  constructor(private readonly access: AccessService) {}

  /** GET /network/units — unidades às quais o usuário tem acesso. */
  @Get("units")
  listUnits(@CurrentPrincipal() principal: Principal) {
    return this.access.listMyUnits(principal);
  }

  /** POST /network/switch-unit — troca a unidade ativa (revalida no servidor). */
  @Post("switch-unit")
  @HttpCode(HttpStatus.OK)
  switchUnit(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: SwitchUnitDto,
  ) {
    return this.access.switchUnit(principal, dto.unitId);
  }
}
