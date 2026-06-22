import { InjectQueue } from "@nestjs/bullmq";
import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";
import { NFSE_EMITTER_QUEUE, type NfseJobData } from "./nfse-emitter";

/**
 * NFS-e (§6/S23): cria a nota (PENDING) a partir de um pagamento e enfileira a
 * emissão (fila idempotente + retry/DLQ). Tenant-scoped (anti-IDOR §4). 1 NFS-e
 * por pagamento (unique).
 */
@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NFSE_EMITTER_QUEUE) private readonly queue: Queue<NfseJobData>,
  ) {}

  async createForPayment(tenantId: string, paymentId: string) {
    const scope = new TenantScope(tenantId);
    const payment = await this.prisma.payment.findFirst({
      where: scope.where<Prisma.PaymentWhereInput>({ id: paymentId }),
      select: {
        id: true,
        amountCents: true,
        invoice: { select: { id: true } },
      },
    });
    const owned = scope.ensureOwned(payment);
    if (owned.invoice) {
      throw new ConflictException("Este pagamento já tem NFS-e.");
    }

    const invoice = await this.prisma.invoice.create({
      data: { tenantId, paymentId, amountCents: owned.amountCents },
    });
    // jobId determinístico → idempotência no nível da fila.
    await this.queue.add(
      "emit",
      { invoiceId: invoice.id },
      { jobId: `nfse-${invoice.id}` },
    );
    return invoice;
  }

  async getInvoice(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const invoice = await this.prisma.invoice.findFirst({
      where: scope.where<Prisma.InvoiceWhereInput>({ id }),
    });
    return scope.ensureOwned(invoice);
  }
}
