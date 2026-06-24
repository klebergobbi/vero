import { NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Queue } from "bullmq";
import { ReportService } from "../src/reports/report.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: {
  report?: unknown;
  payments?: unknown[];
  appts?: unknown[];
  fileReport?: unknown;
}) {
  const update = jest.fn().mockResolvedValue({});
  const prisma = {
    report: {
      create: jest.fn().mockResolvedValue({ id: "r1", status: "PENDING" }),
      findUnique: jest
        .fn()
        .mockResolvedValue(opts.report ?? opts.fileReport ?? null),
      findFirst: jest.fn().mockResolvedValue(opts.report ?? null),
      findMany: jest.fn().mockResolvedValue([]),
      update,
    },
    payment: { findMany: jest.fn().mockResolvedValue(opts.payments ?? []) },
    appointment: { findMany: jest.fn().mockResolvedValue(opts.appts ?? []) },
  } as unknown as PrismaService;
  const config = {
    get: jest.fn().mockReturnValue("test-secret"),
  } as unknown as ConfigService;
  const queue = { add: jest.fn().mockResolvedValue({}) } as unknown as Queue;
  return { service: new ReportService(prisma, config, queue), update };
}

const PERIOD = {
  periodStart: new Date("2026-06-01"),
  periodEnd: new Date("2026-06-30"),
};

describe("ReportService (S43)", () => {
  it("build BILLING gera CSV com cabeçalho, linhas e TOTAL", async () => {
    const { service, update } = build({
      report: {
        id: "r1",
        tenantId: "t1",
        type: "BILLING",
        format: "CSV",
        status: "PENDING",
        ...PERIOD,
      },
      payments: [
        {
          amountCents: 5000,
          paidAt: new Date("2026-06-10"),
          charge: { patient: { name: "Maria" } },
        },
        {
          amountCents: 3000,
          paidAt: new Date("2026-06-12"),
          charge: { patient: { name: "João" } },
        },
      ],
    });
    await service.build("r1");
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe("READY");
    const csv = (data.content as Buffer).toString("utf8");
    expect(csv).toContain('"Data";"Paciente";"Valor"'); // header (células com aspas)
    expect(csv).toContain("Maria");
    expect(csv).toContain("TOTAL");
    expect(csv).toContain("R$ 80,00"); // 5000 + 3000
    expect(data.rowCount).toBe(3); // 2 pagamentos + linha TOTAL
  });

  it("build NO_SHOW (PDF) gera bytes %PDF e marca READY", async () => {
    const { service, update } = build({
      report: {
        id: "r2",
        tenantId: "t1",
        type: "NO_SHOW",
        format: "PDF",
        status: "PENDING",
        ...PERIOD,
      },
      appts: [
        {
          startsAt: new Date("2026-06-05"),
          status: "NO_SHOW",
          patient: { name: "Ana" },
          professional: { name: "Dr. Bruno" },
        },
      ],
    });
    await service.build("r2");
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe("READY");
    expect((data.content as Buffer).subarray(0, 4).toString()).toBe("%PDF");
    expect(data.rowCount).toBe(1);
  });

  it("build idempotente: já READY → no-op (sem update)", async () => {
    const { service, update } = build({
      report: {
        id: "r3",
        tenantId: "t1",
        type: "BILLING",
        format: "CSV",
        status: "READY",
        ...PERIOD,
      },
    });
    await service.build("r3");
    expect(update).not.toHaveBeenCalled();
  });

  it("serveFile com token adulterado → 404", async () => {
    const { service } = build({});
    await expect(service.serveFile("r1.9999999999.deadbeef")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("serveFile token válido devolve o conteúdo com content-type certo", async () => {
    const { service } = build({
      fileReport: {
        content: Buffer.from("Data;Paciente;Valor"),
        format: "CSV",
        type: "BILLING",
      },
    });
    const { url } = service.signedUrl("r1");
    const token = url.replace("/reports/file/", "");
    const served = await service.serveFile(token);
    expect(served.contentType).toContain("text/csv");
    expect(served.filename).toBe("billing.csv");
  });
});
