import { Module } from "@nestjs/common";
import { CryptoService } from "../record/crypto.service";
import { SpecialtyController } from "./specialty.controller";
import { SpecialtyService } from "./specialty.service";

/**
 * Fichas por especialidade (S29): vinculadas ao prontuário, valores cifrados em
 * repouso (CryptoService, provido aqui — stateless) e versionados. AuditService
 * é @Global. Campos de cada especialidade vêm de @vero/types (fonte única).
 */
@Module({
  controllers: [SpecialtyController],
  providers: [SpecialtyService, CryptoService],
})
export class SpecialtyModule {}
