import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

/**
 * Rede multi-unidade. Central de acessos (S45): troca de unidade ativa (importa
 * AuthModule p/ re-emitir tokens após revalidar a autorização). Gestão + ranking
 * de unidades (S46): comparativo do franqueador. PrismaService é @Global.
 */
@Module({
  imports: [AuthModule],
  controllers: [AccessController, UnitsController],
  providers: [AccessService, UnitsService],
})
export class AccessModule {}
