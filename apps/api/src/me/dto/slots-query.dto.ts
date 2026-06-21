import { IsString, Matches } from "class-validator";

/** Consulta de slots livres pelo paciente logado (§S15c). */
export class MeSlotsQueryDto {
  @IsString()
  unitId!: string;

  @IsString()
  professionalId!: string;

  /** Data civil no fuso da unidade. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Data inválida (use YYYY-MM-DD)" })
  date!: string;
}
