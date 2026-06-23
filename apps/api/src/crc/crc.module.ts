import { Module } from "@nestjs/common";
import { CrcController } from "./crc.controller";
import { CrcService } from "./crc.service";

/**
 * CRC — Central de Relacionamento (S34): fila priorizada de contatos do dia.
 * Importa os ReturnAlert TRIGGERED (S33) como tarefas. Tenant-scoped (anti-IDOR).
 * PrismaService é @Global.
 */
@Module({
  controllers: [CrcController],
  providers: [CrcService],
})
export class CrcModule {}
