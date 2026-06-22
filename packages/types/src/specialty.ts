import { z } from "zod";

/**
 * Fichas clínicas por especialidade (§6/S29). Fonte ÚNICA do conjunto de campos
 * de cada especialidade — o backend valida contra ela e o web renderiza o
 * formulário dinamicamente a partir dela (sem duplicar a definição).
 */

export const SPECIALTY_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
] as const;
export type SpecialtyFieldType = (typeof SPECIALTY_FIELD_TYPES)[number];

export interface SpecialtyField {
  id: string;
  label: string;
  type: SpecialtyFieldType;
  /** opções (apenas para type "select"). */
  options?: string[];
}

export interface SpecialtyDefinition {
  key: string;
  label: string;
  fields: SpecialtyField[];
}

export const SPECIALTY_TYPES = [
  "ORTHO",
  "IMPLANT",
  "ENDO",
  "HOF",
  "ALIGNER",
  "AESTHETIC",
] as const;
export type SpecialtyType = (typeof SPECIALTY_TYPES)[number];

export const SPECIALTY_FORMS: SpecialtyDefinition[] = [
  {
    key: "ORTHO",
    label: "Ortodontia",
    fields: [
      {
        id: "malocclusion",
        label: "Classe de má-oclusão",
        type: "select",
        options: ["Classe I", "Classe II", "Classe III"],
      },
      { id: "overjet", label: "Overjet (mm)", type: "number" },
      { id: "overbite", label: "Overbite (mm)", type: "number" },
      { id: "appliance", label: "Aparelho", type: "text" },
      { id: "goals", label: "Objetivos do tratamento", type: "textarea" },
    ],
  },
  {
    key: "IMPLANT",
    label: "Implantodontia",
    fields: [
      { id: "region", label: "Região/dente", type: "text" },
      {
        id: "boneType",
        label: "Tipo ósseo",
        type: "select",
        options: ["D1", "D2", "D3", "D4"],
      },
      { id: "brand", label: "Marca do implante", type: "text" },
      { id: "diameter", label: "Diâmetro (mm)", type: "number" },
      { id: "length", label: "Comprimento (mm)", type: "number" },
      { id: "torque", label: "Torque (Ncm)", type: "number" },
      { id: "notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    key: "ENDO",
    label: "Endodontia",
    fields: [
      { id: "tooth", label: "Dente (FDI)", type: "number" },
      { id: "diagnosis", label: "Diagnóstico", type: "text" },
      {
        id: "workingLength",
        label: "Comprimento de trabalho (mm)",
        type: "number",
      },
      { id: "canals", label: "Nº de canais", type: "number" },
      { id: "irrigant", label: "Irrigante", type: "text" },
      { id: "obturation", label: "Obturação", type: "text" },
      { id: "notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    key: "HOF",
    label: "Harmonização Orofacial",
    fields: [
      { id: "product", label: "Produto", type: "text" },
      { id: "region", label: "Região aplicada", type: "text" },
      { id: "units", label: "Quantidade/unidades", type: "number" },
      { id: "batch", label: "Lote", type: "text" },
      { id: "notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    key: "ALIGNER",
    label: "Alinhadores",
    fields: [
      { id: "totalSteps", label: "Total de etapas", type: "number" },
      { id: "currentStep", label: "Etapa atual", type: "number" },
      { id: "attachments", label: "Attachments", type: "text" },
      { id: "ipr", label: "IPR planejado", type: "text" },
      { id: "notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    key: "AESTHETIC",
    label: "Estética",
    fields: [
      { id: "procedure", label: "Procedimento", type: "text" },
      { id: "product", label: "Produto/material", type: "text" },
      { id: "area", label: "Área tratada", type: "text" },
      { id: "sessions", label: "Nº de sessões", type: "number" },
      { id: "notes", label: "Observações", type: "textarea" },
    ],
  },
];

export function getSpecialtyDefinition(
  key: string,
): SpecialtyDefinition | undefined {
  return SPECIALTY_FORMS.find((s) => s.key === key);
}

export function isValidSpecialty(key: string): boolean {
  return SPECIALTY_FORMS.some((s) => s.key === key);
}

export const specialtyTypeSchema = z.enum(SPECIALTY_TYPES);
