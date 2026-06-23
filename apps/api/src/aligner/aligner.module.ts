import { Module } from "@nestjs/common";
import { AlignerController, MeAlignerController } from "./aligner.controller";
import { AlignerService } from "./aligner.service";

/**
 * Casos de alinhadores (S31): acompanhamento por etapas; equipe cria/avança,
 * paciente vê os próprios casos (etapa atual + próxima troca). Tenant-scoped
 * (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [AlignerController, MeAlignerController],
  providers: [AlignerService],
})
export class AlignerModule {}
