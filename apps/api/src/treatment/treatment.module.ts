import { Module } from "@nestjs/common";
import { TreatmentController } from "./treatment.controller";
import { TreatmentService } from "./treatment.service";

/**
 * Plano de tratamento + execução (S30): converte orçamento aprovado em plano
 * executável por sessão. Tenant-scoped (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [TreatmentController],
  providers: [TreatmentService],
})
export class TreatmentModule {}
