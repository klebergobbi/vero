import { Module } from "@nestjs/common";
import { DeviceController } from "./device.controller";
import { DeviceService } from "./device.service";

/**
 * Push (S13). S13a: registro de device tokens. O motor de envio (PushService +
 * fila push-sender) entra na S13b reusando o registro daqui (PrismaModule é @Global).
 */
@Module({
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class PushModule {}
