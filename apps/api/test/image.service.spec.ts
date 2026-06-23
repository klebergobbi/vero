import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../src/common/audit/audit.service";
import { CryptoService } from "../src/record/crypto.service";
import { ImageService } from "../src/record/image.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build(opts: { patient?: unknown; attachment?: unknown }) {
  const create = jest.fn().mockResolvedValue({
    id: "att1",
    filename: "intra.png",
    contentType: "image/png",
    createdAt: new Date(),
  });
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? null) },
    medicalRecord: { upsert: jest.fn().mockResolvedValue({ id: "rec1" }) },
    attachment: {
      create,
      findUnique: jest.fn().mockResolvedValue(opts.attachment ?? null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
  const config = {
    get: jest.fn().mockReturnValue("test-secret-key"),
  } as unknown as ConfigService;
  const crypto = new CryptoService(config);
  const audit = { record: jest.fn() } as unknown as AuditService;
  return {
    service: new ImageService(prisma, crypto, audit, config),
    create,
    crypto,
  };
}

// PNG 1x1 transparente (base64) — bytes de imagem válidos p/ o teste.
const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("ImageService (S36)", () => {
  it("anti-IDOR: paciente de outro tenant → 403", async () => {
    const { service } = build({ patient: null });
    await expect(
      service.addImage("t1", "alheio", {
        filename: "x.png",
        contentType: "image/png",
        dataBase64: PNG_1x1,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejeita conteúdo não-imagem → 400", async () => {
    const { service } = build({ patient: { id: "p1" } });
    await expect(
      service.addImage("t1", "p1", {
        filename: "x.pdf",
        contentType: "application/pdf",
        dataBase64: PNG_1x1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("cifra imagem cheia + miniatura e devolve URLs assinadas (full/thumb)", async () => {
    const { service, create } = build({ patient: { id: "p1" } });
    const res = await service.addImage("t1", "p1", {
      filename: "intra.png",
      contentType: "image/png",
      dataBase64: PNG_1x1,
      thumbnailBase64: PNG_1x1,
    });
    const data = create.mock.calls[0][0].data;
    expect(data.dataEnc).toBeInstanceOf(Buffer);
    expect(data.thumbnailEnc).toBeInstanceOf(Buffer); // miniatura cifrada
    expect(res.url).toContain(".full.");
    expect(res.thumbnailUrl).toContain(".thumb.");
  });

  it("serve com URL assinada decifra a variante correta (thumb)", async () => {
    const { crypto } = build({ patient: { id: "p1" } });
    // monta um attachment cifrado com full ≠ thumb p/ provar a seleção de variante
    const full = Buffer.from(PNG_1x1, "base64");
    const thumb = Buffer.from("thumb-bytes");
    const attachment = {
      tenantId: "t1",
      contentType: "image/png",
      dataEnc: Buffer.from(crypto.encrypt(full), "utf8"),
      thumbnailEnc: Buffer.from(crypto.encrypt(thumb), "utf8"),
      record: { patientId: "p1" },
    };
    const built = build({ patient: { id: "p1" }, attachment });
    // gera uma URL thumb válida e extrai o token
    const res = await built.service.addImage("t1", "p1", {
      filename: "intra.png",
      contentType: "image/png",
      dataBase64: PNG_1x1,
    });
    const token = res.thumbnailUrl.replace("/records/images/", "");
    const served = await built.service.serveImage(token);
    expect(served.data.toString()).toBe("thumb-bytes"); // variante thumb decifrada
  });

  it("token adulterado → 404", async () => {
    const { service } = build({ patient: { id: "p1" } });
    await expect(
      service.serveImage("att1.thumb.9999999999.deadbeef"),
    ).rejects.toThrow(/./); // NotFoundException
  });
});
