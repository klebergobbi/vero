import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { WhatsAppService } from "../integrations/whatsapp/whatsapp.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  dueDateRangeForStep,
  parseSteps,
  renderTemplate,
} from "./collection.util";

export interface RulerResult {
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Régua de cobrança (§6/S22): a cada execução (cron diário), para cada etapa de
 * cada régua ativa, acha as parcelas PENDENTES cujo vencimento casa com a etapa e
 * dispara o lembrete por WhatsApp. IDEMPOTENTE por (parcela, etapa) via o unique
 * de CollectionEvent — não reenvia. RESPEITA opt-out (filtra `messagingOptOut`).
 */
@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async runDueCollections(now: Date = new Date()): Promise<RulerResult> {
    const rules = await this.prisma.collectionRule.findMany({
      where: { active: true },
    });
    const result: RulerResult = { sent: 0, skipped: 0, failed: 0 };

    for (const rule of rules) {
      for (const step of parseSteps(rule.steps)) {
        const stepKey = String(step.offsetDays);
        const installments = await this.prisma.installment.findMany({
          where: {
            tenantId: rule.tenantId,
            status: "PENDING",
            dueDate: dueDateRangeForStep(now, step.offsetDays),
            // opt-out: paciente que recusou mensagens automáticas é excluído.
            charge: { patient: { messagingOptOut: false, deletedAt: null } },
          },
          select: {
            id: true,
            charge: {
              select: { patient: { select: { name: true, phone: true } } },
            },
          },
        });

        for (const inst of installments) {
          // Idempotência: registra o evento (unique). Já existe → não reenvia.
          try {
            await this.prisma.collectionEvent.create({
              data: {
                tenantId: rule.tenantId,
                installmentId: inst.id,
                stepKey,
              },
            });
          } catch (err) {
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
            ) {
              result.skipped++;
              continue;
            }
            throw err;
          }

          // Envio best-effort: o evento já registrado garante o não-reenvio mesmo
          // se o envio falhar (registrado p/ observabilidade; não retenta).
          const patient = inst.charge.patient;
          const text = renderTemplate(step.template, { nome: patient.name });
          try {
            await this.whatsapp.sendText(patient.phone, text);
            result.sent++;
          } catch {
            result.failed++;
            this.logger.warn(
              `Cobrança parcela ${inst.id} etapa ${stepKey}: falha no envio (registrada).`,
            );
          }
        }
      }
    }
    this.logger.log(
      `Régua: ${result.sent} enviadas, ${result.skipped} já enviadas, ${result.failed} falhas.`,
    );
    return result;
  }
}
