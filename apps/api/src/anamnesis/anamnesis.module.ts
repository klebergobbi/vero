import { Module } from "@nestjs/common";
import { EsignService } from "../integrations/esign/esign.service";
import { CryptoService } from "../record/crypto.service";
import {
  AnamnesisController,
  AnamnesisFillController,
} from "./anamnesis.controller";
import { AnamnesisService } from "./anamnesis.service";

/**
 * Anamnese digital (S28): templates + instâncias preenchidas/assinadas por link
 * de uso único. Reusa CryptoService (cifra das respostas, S26) e EsignService
 * (evidência de assinatura, S18) — providos aqui (stateless). AuditService é @Global.
 */
@Module({
  controllers: [AnamnesisController, AnamnesisFillController],
  providers: [AnamnesisService, CryptoService, EsignService],
})
export class AnamnesisModule {}
