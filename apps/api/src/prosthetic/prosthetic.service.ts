import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

/** Campos devolvidos de um pedido protético (fonte única do select + do tipo). */
const ORDER_SELECT = {
  id: true,
  patientId: true,
  treatmentItemId: true,
  labName: true,
  description: true,
  status: true,
  sentAt: true,
  expectedReturnDate: true,
  receivedAt: true,
  notes: true,
  createdAt: true,
  patient: { select: { name: true } },
} satisfies Prisma.ProstheticOrderSelect;

type OrderRow = Prisma.ProstheticOrderGetPayload<{
  select: typeof ORDER_SELECT;
}>;

/**
 * Controle protético (§6/S35): rastreia o envio e o retorno de trabalhos do
 * laboratório, com prazos e status. ATRASO = pedido SENT cujo `expectedReturnDate`
 * já passou e ainda não voltou (calculado na leitura). Vincula-se opcionalmente ao
 * item do plano de tratamento (S30). Tenant-scoped (anti-IDOR).
 */
@Injectable()
export class ProstheticService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registra um pedido protético (REQUESTED). */
  async create(
    tenantId: string,
    input: {
      patientId: string;
      labName: string;
      description: string;
      treatmentItemId?: string;
      expectedReturnDate?: string;
      notes?: string;
    },
  ) {
    const scope = new TenantScope(tenantId);
    const patient = await this.prisma.patient.findFirst({
      where: scope.where<Prisma.PatientWhereInput>({
        id: input.patientId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    scope.ensureOwned(patient); // 403 anti-IDOR

    if (input.treatmentItemId) {
      await this.assertTreatmentItem(scope, input.treatmentItemId);
    }

    const order = await this.prisma.prostheticOrder.create({
      data: {
        tenantId,
        patientId: input.patientId,
        labName: input.labName,
        description: input.description,
        ...(input.treatmentItemId
          ? { treatmentItemId: input.treatmentItemId }
          : {}),
        ...(input.expectedReturnDate
          ? { expectedReturnDate: new Date(input.expectedReturnDate) }
          : {}),
        ...(input.notes ? { notes: input.notes } : {}),
      },
      select: ORDER_SELECT,
    });
    return this.withLate(order);
  }

  async list(tenantId: string, status?: string) {
    const scope = new TenantScope(tenantId);
    const orders = await this.prisma.prostheticOrder.findMany({
      where: scope.where<Prisma.ProstheticOrderWhereInput>(
        status
          ? {
              status: status as NonNullable<
                Prisma.ProstheticOrderWhereInput["status"]
              >,
            }
          : {},
      ),
      orderBy: { createdAt: "desc" },
      select: ORDER_SELECT,
    });
    return orders.map((o) => this.withLate(o));
  }

  /** Marca como ENVIADO ao laboratório (define `sentAt` + prazo). */
  async markSent(
    tenantId: string,
    id: string,
    input: { expectedReturnDate?: string },
  ) {
    const order = await this.assertOrder(tenantId, id);
    if (order.status === "RECEIVED" || order.status === "CANCELLED") {
      throw new ConflictException("Pedido já finalizado.");
    }
    const updated = await this.prisma.prostheticOrder.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        ...(input.expectedReturnDate
          ? { expectedReturnDate: new Date(input.expectedReturnDate) }
          : {}),
      },
      select: ORDER_SELECT,
    });
    return this.withLate(updated);
  }

  /** Marca como RECEBIDO do laboratório (define `receivedAt`). */
  async markReceived(tenantId: string, id: string) {
    const order = await this.assertOrder(tenantId, id);
    if (order.status === "CANCELLED") {
      throw new ConflictException("Pedido cancelado.");
    }
    const updated = await this.prisma.prostheticOrder.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
      select: ORDER_SELECT,
    });
    return this.withLate(updated);
  }

  async cancel(tenantId: string, id: string) {
    await this.assertOrder(tenantId, id);
    const updated = await this.prisma.prostheticOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
      select: ORDER_SELECT,
    });
    return this.withLate(updated);
  }

  // --- internos ---

  /** Anexa o flag de ATRASO (SENT + prazo vencido sem retorno). */
  private withLate(order: OrderRow) {
    const isLate =
      order.status === "SENT" &&
      order.expectedReturnDate != null &&
      order.receivedAt == null &&
      order.expectedReturnDate.getTime() < Date.now();
    return { ...order, isLate };
  }

  private async assertOrder(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const order = await this.prisma.prostheticOrder.findFirst({
      where: scope.where<Prisma.ProstheticOrderWhereInput>({ id }),
      select: { id: true, status: true },
    });
    return scope.ensureOwned(order); // 403 anti-IDOR
  }

  private async assertTreatmentItem(scope: TenantScope, itemId: string) {
    const item = await this.prisma.treatmentItem.findFirst({
      where: scope.where<Prisma.TreatmentItemWhereInput>({ id: itemId }),
      select: { id: true },
    });
    if (!item) {
      throw new BadRequestException("Item de tratamento inválido.");
    }
  }
}
