import { Injectable, Logger } from "@nestjs/common";
import { DashboardService } from "../analytics/dashboard.service";
import { CrmService } from "../crm/crm.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { AnthropicService } from "../integrations/anthropic/anthropic.service";

const CACHE_TTL_SECONDS = 3600; // 1h — chamadas de IA têm custo, cache mais longo que o dashboard
const MAX_TEXT_TOKENS = 1024;

// Disclosure de IA (§5) — HARD-CODED, nunca gerado pelo modelo.
const DISCLOSURE =
  "As sugestões abaixo são geradas por IA a partir de dados agregados do seu " +
  "tenant (sem informações de pacientes). Use como ponto de partida, não como " +
  "decisão automática.";

export interface Insight {
  type: "conversao" | "inadimplencia" | "ocupacao" | "crm";
  title: string;
  explanation: string;
  suggestion: string;
}

export interface InsightsMetrics {
  period: { from: string; to: string };
  conversion: { percent: number; approved: number; rejected: number };
  occupancy: {
    percent: number;
    bookedMinutes: number;
    capacityMinutes: number;
  };
  delinquency: {
    percent: number;
    overdueCount: number;
    dueCount: number;
    overdueCents: number;
  };
  channels: {
    sourceId: string;
    name: string;
    leads: number;
    closed: number;
    revenueCents: number;
    costCents: number;
    roiCents: number;
  }[];
}

export interface InsightsResult {
  generatedAt: string;
  cached: boolean;
  disclosure: string;
  aiAvailable: boolean;
  metrics: InsightsMetrics;
  insights: Insight[];
}

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

/**
 * Arredonda PARA CIMA (próxima hora cheia) — nunca para baixo: arredondar para
 * baixo cortaria da consulta os dados criados HOJE, dentro da hora corrente mas
 * depois de ":00" (`decidedAt`/`dueDate` reais são sempre <= "agora" < teto
 * arredondado para cima, então nada recente fica de fora). Chamadas dentro da
 * mesma hora caem no mesmo teto → mesma chave de cache.
 */
function roundUpToHour(d: Date): Date {
  const r = new Date(d);
  r.setUTCMinutes(0, 0, 0);
  r.setUTCHours(r.getUTCHours() + 1);
  return r;
}

/** Conta quantas vezes um dia-da-semana ocorre no intervalo [from, to]. */
function countWeekdayOccurrences(
  from: Date,
  to: Date,
  dayOfWeek: number,
): number {
  let count = 0;
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
  );
  while (cursor <= end) {
    if (cursor.getUTCDay() === dayOfWeek) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Insights via IA (S51): sugestões acionáveis a partir de dados AGREGADOS do
 * tenant (conversão, ocupação, inadimplência, ROI de canais CRM) — nunca envia
 * dado de paciente (nome/telefone/CPF) ao modelo, só números e rótulos de canal.
 * Disclosure de IA hard-coded (§5), nunca deixado ao modelo. Cacheado no Redis
 * (chamada a LLM tem custo) — invalidável sob demanda.
 */
@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly dashboard: DashboardService,
    private readonly crm: CrmService,
    private readonly anthropic: AnthropicService,
  ) {}

  async generate(
    tenantId: string,
    range?: { from?: string; to?: string },
  ): Promise<InsightsResult> {
    // "to" default arredondado à hora: sem isso, cada chamada sem período
    // explícito (o caso comum — a tela web não passa from/to) geraria uma
    // chave de cache diferente a cada milissegundo e o cache nunca bateria,
    // esvaziando o propósito do TTL de 1h (chamada de IA tem custo).
    const to = range?.to ? new Date(range.to) : roundUpToHour(new Date());
    const from = range?.from ? new Date(range.from) : startOfMonthUtc(to);
    const cacheKey = `insights:${tenantId}:${from.toISOString()}:${to.toISOString()}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { ...(JSON.parse(cached) as InsightsResult), cached: true };
    }

    const metrics = await this.computeMetrics(tenantId, from, to);
    const aiAvailable = this.anthropic.configured;
    const insights = aiAvailable ? await this.askForInsights(metrics) : [];

    const result: InsightsResult = {
      generatedAt: new Date().toISOString(),
      cached: false,
      disclosure: DISCLOSURE,
      aiAvailable,
      metrics,
      insights,
    };
    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      "EX",
      CACHE_TTL_SECONDS,
    );
    return result;
  }

  /** Invalida o cache de insights do tenant (gera de novo na próxima leitura). */
  async invalidate(tenantId: string): Promise<{ cleared: number }> {
    const keys = await this.redis.keys(`insights:${tenantId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
    return { cleared: keys.length };
  }

  // --- métricas agregadas (sem PII) ---

  private async computeMetrics(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<InsightsMetrics> {
    const [dashboardData, occupancy, delinquency, channels] = await Promise.all(
      [
        this.dashboard.getDashboard(tenantId, {
          from: from.toISOString(),
          to: to.toISOString(),
        }),
        this.computeOccupancy(tenantId, from, to),
        this.computeDelinquency(tenantId, from, to),
        this.crm.reportBySource(tenantId),
      ],
    );

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      conversion: {
        percent: dashboardData.kpis.conversionPercent,
        approved: dashboardData.kpis.approvedBudgets,
        rejected: dashboardData.kpis.rejectedBudgets,
      },
      occupancy,
      delinquency,
      channels: channels.map((c) => ({
        sourceId: c.sourceId,
        name: c.name,
        leads: c.leads,
        closed: c.closed,
        revenueCents: c.revenueCents,
        costCents: c.costCents,
        roiCents: c.roiCents,
      })),
    };
  }

  /** Ocupação = minutos efetivamente agendados / minutos de capacidade (Availability) no período. */
  private async computeOccupancy(tenantId: string, from: Date, to: Date) {
    const [windows, appts] = await Promise.all([
      this.prisma.availability.findMany({
        where: { tenantId },
        select: { dayOfWeek: true, startMinute: true, endMinute: true },
      }),
      this.prisma.appointment.findMany({
        where: {
          tenantId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          deletedAt: null,
          startsAt: { gte: from, lte: to },
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    let capacityMinutes = 0;
    for (const w of windows) {
      const occurrences = countWeekdayOccurrences(from, to, w.dayOfWeek);
      capacityMinutes += (w.endMinute - w.startMinute) * occurrences;
    }
    let bookedMinutes = 0;
    for (const a of appts) {
      bookedMinutes += (a.endsAt.getTime() - a.startsAt.getTime()) / 60_000;
    }
    const percent =
      capacityMinutes > 0
        ? Math.min(100, Math.round((bookedMinutes / capacityMinutes) * 100))
        : 0;
    return {
      percent,
      bookedMinutes: Math.round(bookedMinutes),
      capacityMinutes,
    };
  }

  /** Inadimplência = parcelas vencidas e ainda PENDING / parcelas com vencimento no período. */
  private async computeDelinquency(tenantId: string, from: Date, to: Date) {
    const due = await this.prisma.installment.findMany({
      where: { tenantId, dueDate: { gte: from, lte: to } },
      select: { status: true, dueDate: true, amountCents: true },
    });
    const now = new Date();
    const overdue = due.filter(
      (i) =>
        (i.status === "PENDING" || i.status === "OVERDUE") && i.dueDate < now,
    );
    const overdueCents = overdue.reduce((sum, i) => sum + i.amountCents, 0);
    const percent =
      due.length > 0 ? Math.round((overdue.length / due.length) * 100) : 0;
    return {
      percent,
      overdueCount: overdue.length,
      dueCount: due.length,
      overdueCents,
    };
  }

  // --- geração de texto (IA) ---

  private async askForInsights(metrics: InsightsMetrics): Promise<Insight[]> {
    const system = `Você analisa indicadores de gestão de uma clínica odontológica e sugere ações concretas.

Regras:
- Você recebe APENAS números agregados do tenant (nunca dados de pacientes).
- Responda SOMENTE com um array JSON válido, sem texto fora do JSON, no formato:
[{"type":"conversao"|"inadimplencia"|"ocupacao"|"crm","title":"...","explanation":"...","suggestion":"..."}]
- Gere de 2 a 5 insights, priorizando os números mais preocupantes ou mais promissores.
- "explanation" descreve o que o número indica; "suggestion" é uma ação concreta e prática.
- Seja objetivo — cada campo com no máximo 2 frases curtas.`;

    const userMessage = `Dados do período ${metrics.period.from} a ${metrics.period.to}:
- Conversão de orçamentos: ${metrics.conversion.percent}% (${metrics.conversion.approved} aprovados, ${metrics.conversion.rejected} recusados)
- Ocupação da agenda: ${metrics.occupancy.percent}% (${metrics.occupancy.bookedMinutes} min agendados de ${metrics.occupancy.capacityMinutes} min de capacidade)
- Inadimplência: ${metrics.delinquency.percent}% (${metrics.delinquency.overdueCount} de ${metrics.delinquency.dueCount} parcelas vencidas e não pagas, R$ ${(metrics.delinquency.overdueCents / 100).toFixed(2)})
- Canais de marketing: ${metrics.channels.map((c) => `${c.name} (${c.leads} leads, ${c.closed} fechados, receita R$ ${(c.revenueCents / 100).toFixed(2)}, custo R$ ${(c.costCents / 100).toFixed(2)}, ROI R$ ${(c.roiCents / 100).toFixed(2)})`).join("; ") || "nenhum canal cadastrado"}`;

    try {
      const response = await this.anthropic.createMessage({
        system,
        messages: [{ role: "user", content: userMessage }],
        maxTokens: MAX_TEXT_TOKENS,
      });
      const text = response.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return this.parseInsights(text);
    } catch (err) {
      this.logger.error(
        `Falha ao gerar insights via IA: ${(err as Error).message}`,
      );
      return [];
    }
  }

  private parseInsights(text: string): Insight[] {
    try {
      // O modelo às vezes envolve o JSON em ```json ... ``` apesar da instrução — remove.
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (i): i is Insight =>
          typeof i === "object" &&
          i !== null &&
          typeof (i as Insight).title === "string" &&
          typeof (i as Insight).explanation === "string" &&
          typeof (i as Insight).suggestion === "string",
      );
    } catch {
      this.logger.warn(
        "Resposta da IA não veio em JSON válido; devolvendo sem insights.",
      );
      return [];
    }
  }
}
