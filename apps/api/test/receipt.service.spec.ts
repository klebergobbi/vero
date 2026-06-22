import { NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ReceiptService } from "../src/receipt/receipt.service";
import type { PrismaService } from "../src/prisma/prisma.service";

function build() {
  const config = {
    get: () => "test-secret-32-chars-minimum-abcdef",
  } as unknown as ConfigService;
  return new ReceiptService({} as unknown as PrismaService, config);
}

describe("ReceiptService — URL assinada (S24)", () => {
  it("verifyToken aceita um token recém-assinado e devolve o receiptId", () => {
    const service = build();
    const { url } = service.signedUrl("rec123");
    const token = url.split("/").pop()!;
    expect(service.verifyToken(token)).toBe("rec123");
  });

  it("verifyToken recusa token EXPIRADO", () => {
    const service = build();
    const { url } = service.signedUrl("rec123");
    const token = url.split("/").pop()!;
    // força exp no passado mantendo a assinatura original (que não bate mais).
    const [id, , sig] = token.split(".");
    const past = Math.floor(Date.now() / 1000) - 10;
    expect(() => service.verifyToken(`${id}.${past}.${sig}`)).toThrow(
      NotFoundException,
    );
  });

  it("verifyToken recusa assinatura ADULTERADA", () => {
    const service = build();
    const { url } = service.signedUrl("rec123");
    const token = url.split("/").pop()!;
    const [id, exp] = token.split(".");
    expect(() => service.verifyToken(`${id}.${exp}.deadbeef`)).toThrow(
      NotFoundException,
    );
  });

  it("verifyToken recusa token com receiptId trocado (assinatura não bate)", () => {
    const service = build();
    const { url } = service.signedUrl("rec123");
    const [, exp, sig] = url.split("/").pop()!.split(".");
    expect(() => service.verifyToken(`outro.${exp}.${sig}`)).toThrow(
      NotFoundException,
    );
  });
});
