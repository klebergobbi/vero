import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../common/repositories/tenant-scoped.helper";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Casos de alinhadores (§6/S31). Acompanhamento por etapas: ao criar um caso com
 * N etapas, as datas de troca são geradas a partir de uma data inicial + intervalo.
 * `currentStep` é a etapa em uso; a "próxima troca" é a `changeDate` da etapa
 * seguinte. Tenant-scoped (anti-IDOR); a visão do paciente é owner-scoped.
 */
@Injectable()
export class AlignerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cria o caso + gera N etapas (changeDate = startDate + (i-1)*intervalDays). */
  async createCase(
    tenantId: string,
    input: {
      patientId: string;
      title: string;
      totalSteps: number;
      intervalDays: number;
      startDate: string;
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

    const start = new Date(input.startDate);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("Data inicial inválida.");
    }

    const steps = Array.from({ length: input.totalSteps }, (_, i) => ({
      tenantId,
      number: i + 1,
      changeDate: new Date(start.getTime() + i * input.intervalDays * DAY_MS),
    }));

    const created = await this.prisma.alignerCase.create({
      data: {
        tenantId,
        patientId: input.patientId,
        title: input.title,
        totalSteps: input.totalSteps,
        steps: { create: steps },
      },
      select: { id: true },
    });
    return this.getCase(tenantId, created.id);
  }

  async listCases(tenantId: string, patientId?: string) {
    const scope = new TenantScope(tenantId);
    return this.prisma.alignerCase.findMany({
      where: scope.where<Prisma.AlignerCaseWhereInput>(
        patientId ? { patientId } : {},
      ),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        patientId: true,
        title: true,
        totalSteps: true,
        currentStep: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getCase(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const found = await this.prisma.alignerCase.findFirst({
      where: scope.where<Prisma.AlignerCaseWhereInput>({ id }),
      select: {
        id: true,
        patientId: true,
        title: true,
        totalSteps: true,
        currentStep: true,
        status: true,
        createdAt: true,
        steps: {
          orderBy: { number: "asc" },
          select: { id: true, number: true, changeDate: true, notes: true },
        },
      },
    });
    return scope.ensureOwned(found); // 403 anti-IDOR
  }

  /** Avança o paciente para a próxima etapa (ou conclui na última). */
  async advance(tenantId: string, id: string) {
    const scope = new TenantScope(tenantId);
    const found = await this.prisma.alignerCase.findFirst({
      where: scope.where<Prisma.AlignerCaseWhereInput>({ id }),
      select: { id: true, currentStep: true, totalSteps: true, status: true },
    });
    const c = scope.ensureOwned(found); // 403 anti-IDOR

    if (c.status !== "ACTIVE") {
      throw new ConflictException("Caso não está ativo.");
    }
    if (c.currentStep >= c.totalSteps) {
      await this.prisma.alignerCase.update({
        where: { id: c.id },
        data: { status: "COMPLETED" },
      });
    } else {
      await this.prisma.alignerCase.update({
        where: { id: c.id },
        data: { currentStep: c.currentStep + 1 },
      });
    }
    return this.getCase(tenantId, c.id);
  }

  /** Visão do paciente: casos próprios com etapa atual e próxima troca. */
  async myCases(tenantId: string, patientId: string) {
    const cases = await this.prisma.alignerCase.findMany({
      where: { tenantId, patientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        totalSteps: true,
        currentStep: true,
        status: true,
        steps: {
          orderBy: { number: "asc" },
          select: { number: true, changeDate: true },
        },
      },
    });

    return cases.map((c) => {
      const current = c.steps.find((s) => s.number === c.currentStep) ?? null;
      const next = c.steps.find((s) => s.number === c.currentStep + 1) ?? null;
      return {
        id: c.id,
        title: c.title,
        totalSteps: c.totalSteps,
        currentStep: c.currentStep,
        status: c.status,
        currentChangeDate: current?.changeDate ?? null,
        nextStep: next ? next.number : null,
        nextChangeDate: next?.changeDate ?? null,
      };
    });
  }
}
