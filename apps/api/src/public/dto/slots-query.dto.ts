import { IsString, Matches } from "class-validator";

/** Consulta pública de slots livres (sem JWT) — só campos mínimos. */
export class SlotsQueryDto {
  @IsString()
  unitId!: string;

  @IsString()
  professionalId!: string;

  /** Data civil no fuso da unidade. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Data inválida (use YYYY-MM-DD)" })
  date!: string;
}
