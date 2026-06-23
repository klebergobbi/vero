import { Module } from "@nestjs/common";
import { EsignService } from "../integrations/esign/esign.service";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";

/**
 * Documentos clínicos (S32): atestados/receituários assinados digitalmente pelo
 * profissional (server-side). Reusa EsignService (hash de integridade, S18) —
 * provido aqui (stateless). PDF por URL assinada de expiração curta.
 */
@Module({
  controllers: [DocumentController],
  providers: [DocumentService, EsignService],
})
export class DocumentModule {}
