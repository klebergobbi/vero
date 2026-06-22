import type { ConfigService } from "@nestjs/config";
import { CryptoService } from "../src/record/crypto.service";

function build() {
  const config = {
    get: () => "test-secret-32-chars-minimum-abcdef",
  } as unknown as ConfigService;
  return new CryptoService(config);
}

describe("CryptoService — AES-256-GCM em repouso (S26)", () => {
  it("round-trip de string (decifra de volta ao original)", () => {
    const c = build();
    const enc = c.encryptString("Paciente relata dor no dente 26.");
    expect(enc).not.toContain("dente"); // não é texto plano
    expect(c.decryptString(enc)).toBe("Paciente relata dor no dente 26.");
  });

  it("round-trip de buffer (anexo)", () => {
    const c = build();
    const bytes = Buffer.from([0, 1, 2, 250, 255, 128]);
    const enc = c.encrypt(bytes);
    expect(c.decrypt(enc).equals(bytes)).toBe(true);
  });

  it("cada cifragem usa IV novo → ciphertext diferente", () => {
    const c = build();
    expect(c.encryptString("igual")).not.toBe(c.encryptString("igual"));
  });

  it("conteúdo ADULTERADO → decifragem falha (authTag GCM)", () => {
    const c = build();
    const enc = c.encryptString("dado sensível");
    const raw = Buffer.from(enc, "base64");
    raw[raw.length - 1] ^= 0xff; // corrompe 1 byte do ciphertext
    expect(() => c.decrypt(raw.toString("base64"))).toThrow();
  });
});
