import { Module } from "@nestjs/common";
import { CommissionController } from "./commission.controller";
import { CommissionService } from "./commission.service";

/**
 * Comissões (S40): regras por profissional/procedimento, cálculo da comissão de
 * procedimentos executados/pagos e relatório por profissional e período.
 * Tenant-scoped (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [CommissionController],
  providers: [CommissionService],
})
export class CommissionModule {}
