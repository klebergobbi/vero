import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";

const IV_LEN = 12; // GCM nonce
const TAG_LEN = 16;

/**
 * Cifra de dados sensíveis em REPOUSO (§4 — AES-256-GCM). A chave (256 bits) é
 * derivada do JWT_SECRET por SHA-256 (sem nova env). Cada cifragem usa um IV
 * aleatório; o authTag do GCM garante integridade (decifrar falha se adulterado).
 * Formato persistido: base64( iv | authTag | ciphertext ).
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService<Env, true>) {
    const secret = config.get("JWT_SECRET", { infer: true });
    this.key = createHash("sha256").update(secret).digest(); // 32 bytes
  }

  encrypt(plain: Buffer): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString("base64");
  }

  decrypt(enc: string): Buffer {
    const raw = Buffer.from(enc, "base64");
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  encryptString(plain: string): string {
    return this.encrypt(Buffer.from(plain, "utf8"));
  }

  decryptString(enc: string): string {
    return this.decrypt(enc).toString("utf8");
  }
}
