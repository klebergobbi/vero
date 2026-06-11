import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import {
  CurrentPrincipal,
  SelfAccount,
} from "../common/decorators/self-account.decorator";
import { DeviceService } from "./device.service";
import { DeviceTokenDto, OptOutDto, RegisterDeviceDto } from "./dto/device.dto";

/**
 * Registro de device de push (S13a). @SelfAccount: qualquer principal autenticado
 * (paciente OU equipe) pode, mas o handler age só sobre o PRÓPRIO principal
 * (@CurrentPrincipal) — nunca um id/token de alvo escolhido pelo cliente.
 * Token vai no corpo (não na URL) pois contém colchetes (ExpoPushToken[...]).
 */
@Controller("me/devices")
export class DeviceController {
  constructor(private readonly devices: DeviceService) {}

  @SelfAccount()
  @Post()
  register(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.devices.register(principal, dto);
  }

  @SelfAccount()
  @Post("opt-out")
  @HttpCode(HttpStatus.OK)
  optOut(@CurrentPrincipal() principal: Principal, @Body() dto: OptOutDto) {
    return this.devices.setOptOut(principal, dto);
  }

  @SelfAccount()
  @Post("unregister")
  @HttpCode(HttpStatus.NO_CONTENT)
  unregister(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: DeviceTokenDto,
  ) {
    return this.devices.unregister(principal, dto.token);
  }
}
