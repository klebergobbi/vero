import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";

export interface ContractItemSnapshot {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface BuildBodyInput {
  patientName: string;
  planName: string | null;
  items: ContractItemSnapshot[];
  totalCents: number;
}

export interface SignatureEvidence {
  signerType: string;
  signerName: string;
  signedHash: string;
  ip: string;
  userAgent?: string;
  method: string;
}

export interface VerifyResult {
  integrityOk: boolean;
  signaturesOk: boolean;
  valid: boolean;
}

function brl(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/**
 * Assinatura eletrônica (§6/§7/S18). Produz o CORPO imutável do contrato e a
 * trilha de evidência (hash SHA-256 + IP + timestamp). A trilha já é uma
 * assinatura eletrônica simples juridicamente válida; o proxy p/ ICP qualificada
 * (Clicksign/D4Sign/BirdID) entra aqui quando configurado — nunca no client (§7).
 */
@Injectable()
export class EsignService {
  /** Monta o corpo do contrato (snapshot determinístico do orçamento aprovado). */
  buildContractBody(input: BuildBodyInput): string {
    const lines = [
      "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ODONTOLÓGICOS",
      "",
      `Paciente: ${input.patientName}`,
      `Convênio: ${input.planName ?? "Particular"}`,
      "",
      "Itens:",
      ...input.items.map(
        (it) =>
          `- ${it.quantity}x ${it.description} — ${brl(it.unitPriceCents)} = ${brl(it.quantity * it.unitPriceCents)}`,
      ),
      "",
      `TOTAL: ${brl(input.totalCents)}`,
      "",
      "O paciente declara estar ciente do plano de tratamento e dos valores acima,",
      "autorizando a execução dos procedimentos descritos. Documento assinado",
      "eletronicamente; a integridade é garantida pelo hash SHA-256 registrado.",
    ];
    return lines.join("\n");
  }

  /** Hash SHA-256 (hex) do conteúdo — prova de integridade/imutabilidade. */
  contentHash(body: string): string {
    return createHash("sha256").update(body, "utf8").digest("hex");
  }

  /**
   * Evidência de assinatura: o `signedHash` é o hash do contrato NO MOMENTO da
   * assinatura. Se depois o body for adulterado, o hash não bate (tamper-evident).
   */
  buildEvidence(params: {
    contentHash: string;
    signerName: string;
    ip: string;
    userAgent?: string;
  }): SignatureEvidence {
    const evidence: SignatureEvidence = {
      signerType: "PATIENT",
      signerName: params.signerName,
      signedHash: params.contentHash,
      ip: params.ip,
      method: "CLICK",
    };
    if (params.userAgent) evidence.userAgent = params.userAgent;
    return evidence;
  }

  /** Verifica integridade: re-hash do body bate com o contentHash e as assinaturas. */
  verify(
    body: string,
    contentHash: string,
    signatures: { signedHash: string }[],
  ): VerifyResult {
    const integrityOk = this.contentHash(body) === contentHash;
    const signaturesOk =
      signatures.length > 0 &&
      signatures.every((s) => s.signedHash === contentHash);
    return { integrityOk, signaturesOk, valid: integrityOk && signaturesOk };
  }
}
