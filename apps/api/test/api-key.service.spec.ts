import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../src/prisma/prisma.service";
import { ApiKeyService } from "../src/public-api/api-key.service";
import type { CryptoService } from "../src/record/crypto.service";

const mockPrisma = {
  apiKey: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  outboundWebhook: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

/** Cripto FAKE determinística (reversível) — o teste verifica o HMAC real. */
const fakeCrypto = {
  encryptString: (plain: string) => `ENC(${plain})`,
  decryptString: (enc: string) => enc.replace(/^ENC\(/, "").replace(/\)$/, ""),
} as unknown as CryptoService;

function buildService(isProd = false) {
  const config = {
    get: () => (isProd ? "production" : "development"),
  } as unknown as ConfigService;
  return new ApiKeyService(
    mockPrisma as unknown as PrismaService,
    fakeCrypto,
    config,
  );
}

describe("ApiKeyService", () => {
  let svc: ApiKeyService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = buildService();
  });

  describe("create + validateKey", () => {
    it("cria a chave e valida o plain value", async () => {
      const fakeRow = {
        id: "key-1",
        name: "Test Key",
        keyPrefix: "",
        scopes: ["appointments:read"],
        rateLimit: 60,
        expiresAt: null,
        createdAt: new Date(),
      };
      mockPrisma.apiKey.create.mockResolvedValue(fakeRow);

      const result = await svc.create("tenant-1", {
        name: "Test Key",
        scopes: ["appointments:read"],
      });

      expect(result.key).toMatch(/^vero_/);

      // Simula o findUnique p/ validateKey (o service hasha internamente)
      const raw = result.key;

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key-1",
        tenantId: "tenant-1",
        scopes: ["appointments:read"],
        rateLimit: 60,
        isActive: true,
        expiresAt: null,
        deletedAt: null,
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      const validated = await svc.validateKey(raw);
      expect(validated).not.toBeNull();
      expect(validated?.tenantId).toBe("tenant-1");
      expect(validated?.scopes).toEqual(["appointments:read"]);
    });

    it("validateKey retorna null para plain value errado", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);
      const result = await svc.validateKey("vero_wrong");
      expect(result).toBeNull();
    });

    it("validateKey retorna null para chave inativa", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key-1",
        tenantId: "tenant-1",
        scopes: [],
        rateLimit: 60,
        isActive: false,
        expiresAt: null,
        deletedAt: null,
      });
      const result = await svc.validateKey("vero_inactive");
      expect(result).toBeNull();
    });

    it("validateKey retorna null para chave expirada", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key-1",
        tenantId: "tenant-1",
        scopes: [],
        rateLimit: 60,
        isActive: true,
        expiresAt: new Date(Date.now() - 1000),
        deletedAt: null,
      });
      const result = await svc.validateKey("vero_expired");
      expect(result).toBeNull();
    });
  });

  describe("revoke", () => {
    it("revoga a chave do próprio tenant", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({ id: "key-1" });
      mockPrisma.apiKey.update.mockResolvedValue({});
      await expect(svc.revoke("tenant-1", "key-1")).resolves.toBeUndefined();
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "key-1" } }),
      );
    });

    it("lança ForbiddenException para chave de outro tenant (anti-IDOR)", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);
      await expect(svc.revoke("tenant-A", "key-de-B")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("branding", () => {
    it("atualiza e retorna o branding do tenant", async () => {
      mockPrisma.tenant.update.mockResolvedValue({
        name: "Vero Demo",
        brandColor: "#1a3a5c",
        logoUrl: null,
      });
      const result = await svc.updateBranding("tenant-1", {
        brandColor: "#1a3a5c",
      });
      expect(result.brandColor).toBe("#1a3a5c");
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "tenant-1" } }),
      );
    });
  });

  describe("deliverEvent", () => {
    it("envia para webhooks ativos com o evento registrado, assinado com o secret PLAIN", async () => {
      const fakeFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fakeFetch as unknown as typeof fetch;

      mockPrisma.outboundWebhook.findMany.mockResolvedValue([
        {
          url: "https://example.com/hook",
          secretEnc: fakeCrypto.encryptString("s3gredo-plain"),
        },
      ]);

      await svc.deliverEvent("tenant-1", "appointment.created", {
        id: "appt-1",
      });

      // fire-and-forget: aguarda a microtask de resolução
      await new Promise((r) => setTimeout(r, 10));
      expect(fakeFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = fakeFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://example.com/hook");
      const headers = opts.headers as Record<string, string>;
      expect(headers["X-Vero-Event"]).toBe("appointment.created");

      // O terceiro só tem o secret PLAIN — reproduz a assinatura com ele e
      // confere que bate com o que o servidor mandou (prova do bugfix).
      const crypto = jest.requireActual(
        "node:crypto",
      ) as typeof import("node:crypto");
      const expectedSig = crypto
        .createHmac("sha256", "s3gredo-plain")
        .update(opts.body as string)
        .digest("hex");
      expect(headers["X-Vero-Signature"]).toBe(`sha256=${expectedSig}`);
    });

    it("não envia se não há webhooks para o evento", async () => {
      const fakeFetch = jest.fn();
      global.fetch = fakeFetch as unknown as typeof fetch;
      mockPrisma.outboundWebhook.findMany.mockResolvedValue([]);

      await svc.deliverEvent("tenant-1", "unknown.event", {});
      await new Promise((r) => setTimeout(r, 10));
      expect(fakeFetch).not.toHaveBeenCalled();
    });

    it("anti-SSRF: pula host interno em produção (não envia, não lança)", async () => {
      const fakeFetch = jest.fn();
      global.fetch = fakeFetch as unknown as typeof fetch;
      const prodSvc = buildService(true);

      mockPrisma.outboundWebhook.findMany.mockResolvedValue([
        {
          url: "http://169.254.169.254/hook",
          secretEnc: fakeCrypto.encryptString("x"),
        },
      ]);

      await prodSvc.deliverEvent("tenant-1", "appointment.created", {});
      await new Promise((r) => setTimeout(r, 10));
      expect(fakeFetch).not.toHaveBeenCalled();
    });
  });

  describe("createWebhook — anti-SSRF", () => {
    it("recusa URL de host interno em produção", async () => {
      const prodSvc = buildService(true);
      await expect(
        prodSvc.createWebhook("tenant-1", {
          url: "http://localhost:6379/hook",
          events: ["appointment.created"],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.outboundWebhook.create).not.toHaveBeenCalled();
    });

    it("aceita URL de host interno fora de produção (dev/teste)", async () => {
      mockPrisma.outboundWebhook.create.mockResolvedValue({
        id: "wh-1",
        name: "hook",
        url: "http://localhost:4000/hook",
        events: ["appointment.created"],
        isActive: true,
        createdAt: new Date(),
      });
      const result = await svc.createWebhook("tenant-1", {
        url: "http://localhost:4000/hook",
        events: ["appointment.created"],
      });
      expect(result.secret).toBeDefined();
    });
  });
});
