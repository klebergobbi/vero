import { Module } from "@nestjs/common";
import { MeController } from "./me.controller";
import { MeService } from "./me.service";

/** App do Paciente — leituras owner-scoped (PrismaModule é @Global). */
@Module({
  controllers: [MeController],
  providers: [MeService],
  // Exportado p/ reuso da lógica idempotente de confirmação no webhook WhatsApp (S12b).
  exports: [MeService],
})
export class MeModule {}
