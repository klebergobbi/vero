import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AsaasService } from "../integrations/asaas/asaas.service";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";
import { RoyaltyController } from "./royalty.controller";
import { RoyaltyService } from "./royalty.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

/**
 * Rede multi-unidade. Central de acessos (S45): troca de unidade ativa (importa
 * AuthModule p/ re-emitir tokens após revalidar a autorização). Gestão + ranking
 * de unidades (S46). Royalties por unidade de franquia (S47). PrismaService é @Global.
 */
@Module({
  imports: [AuthModule],
  controllers: [AccessController, UnitsController, RoyaltyController],
  providers: [AccessService, UnitsService, RoyaltyService, AsaasService],
})
export class AccessModule {}
