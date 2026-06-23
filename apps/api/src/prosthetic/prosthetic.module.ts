import { Module } from "@nestjs/common";
import { ProstheticController } from "./prosthetic.controller";
import { ProstheticService } from "./prosthetic.service";

/**
 * Controle protético (S35): rastreio de envio/retorno de laboratório com prazos,
 * status e alerta de atraso. Tenant-scoped (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [ProstheticController],
  providers: [ProstheticService],
})
export class ProstheticModule {}
