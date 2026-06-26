import { Module } from "@nestjs/common";
import { AppointmentModule } from "../appointment/appointment.module";
import { AuthModule } from "../auth/auth.module";
import { AsaasService } from "../integrations/asaas/asaas.service";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";
import { RoyaltyController } from "./royalty.controller";
import { RoyaltyService } from "./royalty.service";
import { SchedulingCenterController } from "./scheduling-center.controller";
import { SchedulingCenterService } from "./scheduling-center.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

/**
 * Rede multi-unidade. Central de acessos (S45): troca de unidade ativa (importa
 * AuthModule p/ re-emitir tokens após revalidar a autorização). Gestão + ranking
 * de unidades (S46). Royalties por unidade de franquia (S47). Central de
 * agendamentos multi-unidade (S48): importa AppointmentModule p/ reusar
 * AppointmentService (conflito/disponibilidade). PrismaService é @Global.
 */
@Module({
  imports: [AuthModule, AppointmentModule],
  controllers: [
    AccessController,
    UnitsController,
    RoyaltyController,
    SchedulingCenterController,
  ],
  providers: [
    AccessService,
    UnitsService,
    RoyaltyService,
    AsaasService,
    SchedulingCenterService,
  ],
})
export class AccessModule {}
