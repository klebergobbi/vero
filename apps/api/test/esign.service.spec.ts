import { EsignService } from "../src/integrations/esign/esign.service";

describe("EsignService (S18)", () => {
  const esign = new EsignService();
  const body = esign.buildContractBody({
    patientName: "João",
    planName: "Particular",
    items: [{ description: "Limpeza", quantity: 2, unitPriceCents: 12000 }],
    totalCents: 24000,
  });
  const hash = esign.contentHash(body);

  it("o corpo inclui paciente, itens e total; hash é determinístico", () => {
    expect(body).toContain("João");
    expect(body).toContain("Limpeza");
    expect(body).toContain("R$ 240,00");
    expect(esign.contentHash(body)).toBe(hash); // estável
  });

  it("verify: válido quando body bate com hash e a assinatura confere", () => {
    const res = esign.verify(body, hash, [{ signedHash: hash }]);
    expect(res).toEqual({
      integrityOk: true,
      signaturesOk: true,
      valid: true,
    });
  });

  it("verify: documento ADULTERADO → integrityOk false (tamper-evident)", () => {
    const tampered = body.replace("240,00", "999,00");
    const res = esign.verify(tampered, hash, [{ signedHash: hash }]);
    expect(res.integrityOk).toBe(false);
    expect(res.valid).toBe(false);
  });

  it("verify: sem assinatura → signaturesOk false", () => {
    const res = esign.verify(body, hash, []);
    expect(res.signaturesOk).toBe(false);
    expect(res.valid).toBe(false);
  });

  it("verify: assinatura de outro hash (body trocado após assinar) → inválido", () => {
    const res = esign.verify(body, hash, [{ signedHash: "outrohash" }]);
    expect(res.signaturesOk).toBe(false);
  });
});
