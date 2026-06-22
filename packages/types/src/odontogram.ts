import { z } from "zod";

/** Faces do dente (§6/S27). WHOLE = condição do dente inteiro (ausente/implante). */
export const TOOTH_FACES = [
  "MESIAL",
  "DISTAL",
  "OCCLUSAL",
  "VESTIBULAR",
  "LINGUAL",
  "WHOLE",
] as const;
export type ToothFace = (typeof TOOTH_FACES)[number];

/**
 * Condições por dente/face. `HEALTHY` = sem condição (ao definir HEALTHY, o
 * registro é REMOVIDO — saudável é o estado padrão). Cada uma tem rótulo e cor
 * (reusados no SVG do web, S27b).
 */
export const TOOTH_CONDITIONS = [
  { key: "HEALTHY", label: "Saudável", color: "#e2e8f0" },
  { key: "CARIES", label: "Cárie", color: "#ef4444" },
  { key: "RESTORATION", label: "Restauração", color: "#3b82f6" },
  { key: "ABSENT", label: "Ausente", color: "#94a3b8" },
  { key: "EXTRACTED", label: "Extraído", color: "#1e293b" },
  { key: "IMPLANT", label: "Implante", color: "#8b5cf6" },
  { key: "CROWN", label: "Coroa", color: "#f59e0b" },
  { key: "ROOT_CANAL", label: "Canal", color: "#ec4899" },
  { key: "FRACTURE", label: "Fratura", color: "#f97316" },
  { key: "SEALANT", label: "Selante", color: "#10b981" },
] as const;

export type ToothConditionKey = (typeof TOOTH_CONDITIONS)[number]["key"];

export const TOOTH_CONDITION_KEYS = TOOTH_CONDITIONS.map((c) => c.key) as [
  ToothConditionKey,
  ...ToothConditionKey[],
];

/** Dentes permanentes (FDI): quadrantes 1–4, dentes 1–8. */
export const FDI_PERMANENT_TEETH: number[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
  45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export const toothFaceSchema = z.enum(TOOTH_FACES);
export const toothConditionSchema = z.enum(TOOTH_CONDITION_KEYS);

/** Valida número de dente FDI (permanente). */
export function isValidToothNumber(n: number): boolean {
  return FDI_PERMANENT_TEETH.includes(n);
}
