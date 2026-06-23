import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { EsignService } from "../src/integrations/esign/esign.service";
import { DocumentService } from "../src/document/document.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: { patient?: unknown; doc?: unknown; user?: unknown }) {
  const create = jest.fn().mockImplementation(({ data }) => ({
    id: "doc1",
    ...data,
    status: "DRAFT",
  }));
  const update = jest.fn().mockImplementation(({ data }) => ({
    id: "doc1",
    ...data,
  }));
  const docFindFirst = jest.fn().mockResolvedValue(opts.doc ?? null);
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    user: { findFirst: jest.fn().mockResolvedValue(opts.user ?? null) },
    clinicalDocument: { create, update, findFirst: docFindFirst },
  } as unknown as PrismaService;
  const config = {
    get: jest.fn().mockReturnValue("test-secret"),
  } as unknown as ConfigService;
  const esign = new EsignService();
  return {
    service: new DocumentService(prisma, esign, config),
    create,
    update,
    esign,
  };
}

describe("DocumentService (S32)", () => {
  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build({ patient: null });
    await expect(
      service.issue("t1", {
        patientId: "alheio",
        type: "ATTESTATION",
        title: "Atestado",
        content: "Comparecimento",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("emite documento com hash do corpo (DRAFT)", async () => {
    const { service, create, esign } = build({
      patient: { id: "p1", name: "Maria" },
    });
    const res = await service.issue("t1", {
      patientId: "p1",
      type: "PRESCRIPTION",
      title: "Receita",
      content: "Amoxicilina 500mg",
    });
    const data = create.mock.calls[0][0].data;
    expect(data.body).toContain("Maria");
    expect(data.body).toContain("Amoxicilina 500mg");
    expect(data.contentHash).toBe(esign.contentHash(data.body)); // hash do corpo
    expect(res.status).toBe("DRAFT");
  });

  it("assina usa a identidade do servidor (User), não do cliente", async () => {
    const { service, update } = build({
      doc: { id: "doc1", status: "DRAFT" },
      user: { name: "Dra. Ana" },
    });
    const res = await service.sign("t1", "doc1", { userId: "u1" });
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe("SIGNED");
    expect(data.signerName).toBe("Dra. Ana");
    expect(data.signedById).toBe("u1");
    expect(res.status).toBe("SIGNED");
  });

  it("assinar documento já assinado → 409", async () => {
    const { service } = build({ doc: { id: "doc1", status: "SIGNED" } });
    await expect(service.sign("t1", "doc1", { userId: "u1" })).rejects.toThrow(
      ConflictException,
    );
  });

  it("verify: corpo íntegro + assinado → valid; corpo adulterado → inválido", async () => {
    const { esign } = build({});
    const body = "ATESTADO\n\nPaciente: Maria\n\nComparecimento";
    const goodHash = esign.contentHash(body);

    const signed = build({
      doc: {
        id: "doc1",
        body,
        contentHash: goodHash,
        status: "SIGNED",
        signedAt: new Date(),
        signerName: "Dra. Ana",
      },
    });
    const okv = await signed.service.verify("t1", "doc1");
    expect(okv.valid).toBe(true);

    const tampered = build({
      doc: {
        id: "doc1",
        body: body + " ADULTERADO",
        contentHash: goodHash,
        status: "SIGNED",
        signedAt: new Date(),
        signerName: "Dra. Ana",
      },
    });
    const badv = await tampered.service.verify("t1", "doc1");
    expect(badv.integrityOk).toBe(false);
    expect(badv.valid).toBe(false);
  });
});
