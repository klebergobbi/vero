import { Module } from "@nestjs/common";
import { AppointmentModule } from "../appointment/appointment.module";
import { OrgModule } from "../org/org.module";
import { MeController } from "./me.controller";
import { MeService } from "./me.service";

/** App do Paciente — leituras owner-scoped (PrismaModule é @Global). */
@Module({
  // SlotService + AppointmentService (agendamento online, S15c) + OrgService (listagens).
  imports: [AppointmentModule, OrgModule],
  controllers: [MeController],
  providers: [MeService],
  // Exportado p/ reuso da lógica idempotente de confirmação no webhook WhatsApp (S12b).
  exports: [MeService],
})
export class MeModule {}
