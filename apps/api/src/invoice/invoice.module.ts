import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { NfseService } from "../integrations/nfse/nfse.service";
import { InvoiceController } from "./invoice.controller";
import { InvoiceService } from "./invoice.service";
import {
  NFSE_EMITTER_DLQ,
  NFSE_EMITTER_QUEUE,
  NfseEmitterProcessor,
} from "./nfse-emitter";

/**
 * NFS-e (S23): cria a nota a partir de um pagamento e emite via integrador
 * (`NfseService`) numa fila `nfse-emitter` com retry/backoff/DLQ (prefeituras
 * instáveis). Status e retorno persistidos na Invoice.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: NFSE_EMITTER_QUEUE }),
    BullModule.registerQueue({ name: NFSE_EMITTER_DLQ }),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, NfseService, NfseEmitterProcessor],
})
export class InvoiceModule {}
