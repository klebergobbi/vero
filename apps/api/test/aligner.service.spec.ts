import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AlignerService } from "../src/aligner/aligner.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: {
  patient?: unknown;
  foundCase?: unknown;
  myCases?: unknown[];
}) {
  const create = jest.fn().mockResolvedValue({ id: "case1" });
  const update = jest.fn().mockResolvedValue({});
  const caseFindFirst = jest.fn().mockResolvedValue(opts.foundCase ?? null);
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    alignerCase: {
      create,
      update,
      findFirst: caseFindFirst,
      findMany: jest.fn().mockResolvedValue(opts.myCases ?? []),
    },
  } as unknown as PrismaService;
  return { service: new AlignerService(prisma), create, update };
}

describe("AlignerService (S31)", () => {
  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build({ patient: null });
    await expect(
      service.createCase("t1", {
        patientId: "alheio",
        title: "Caso",
        totalSteps: 3,
        intervalDays: 14,
        startDate: "2026-07-01",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("cria caso gerando N etapas com datas espaçadas pelo intervalo", async () => {
    const { service, create } = build({
      patient: { id: "p1" },
      foundCase: {
        id: "case1",
        patientId: "p1",
        title: "Caso",
        totalSteps: 3,
        currentStep: 1,
        status: "ACTIVE",
        createdAt: new Date(),
        steps: [],
      },
    });
    await service.createCase("t1", {
      patientId: "p1",
      title: "Caso",
      totalSteps: 3,
      intervalDays: 14,
      startDate: "2026-07-01T00:00:00.000Z",
    });
    const steps = create.mock.calls[0][0].data.steps.create;
    expect(steps).toHaveLength(3);
    expect(steps[0].number).toBe(1);
    // etapa 2 = 14 dias após a 1ª
    const d1 = steps[0].changeDate.getTime();
    const d2 = steps[1].changeDate.getTime();
    expect((d2 - d1) / (24 * 60 * 60 * 1000)).toBe(14);
  });

  it("advance incrementa currentStep enquanto não é a última", async () => {
    const { service, update } = build({
      foundCase: {
        id: "case1",
        currentStep: 1,
        totalSteps: 3,
        status: "ACTIVE",
      },
    });
    await service.advance("t1", "case1");
    expect(update.mock.calls[0][0].data.currentStep).toBe(2);
  });

  it("advance na última etapa → COMPLETED", async () => {
    const { service, update } = build({
      foundCase: {
        id: "case1",
        currentStep: 3,
        totalSteps: 3,
        status: "ACTIVE",
      },
    });
    await service.advance("t1", "case1");
    expect(update.mock.calls[0][0].data.status).toBe("COMPLETED");
  });

  it("advance em caso não-ativo → 409", async () => {
    const { service } = build({
      foundCase: {
        id: "case1",
        currentStep: 3,
        totalSteps: 3,
        status: "COMPLETED",
      },
    });
    await expect(service.advance("t1", "case1")).rejects.toThrow(
      ConflictException,
    );
  });

  it("myCases expõe etapa atual e próxima troca (owner-scoped)", async () => {
    const d1 = new Date("2026-07-01");
    const d2 = new Date("2026-07-15");
    const { service } = build({
      myCases: [
        {
          id: "case1",
          title: "Caso",
          totalSteps: 2,
          currentStep: 1,
          status: "ACTIVE",
          steps: [
            { number: 1, changeDate: d1 },
            { number: 2, changeDate: d2 },
          ],
        },
      ],
    });
    const res = await service.myCases("t1", "p1");
    expect(res[0]?.currentStep).toBe(1);
    expect(res[0]?.nextStep).toBe(2);
    expect(res[0]?.nextChangeDate).toEqual(d2);
  });
});
