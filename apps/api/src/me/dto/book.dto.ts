import { IsISO8601, IsString } from "class-validator";

/** Agendamento online do paciente LOGADO (§S15c) — sem dados de lead (usa o JWT). */
export class MeBookDto {
  @IsString()
  unitId!: string;

  @IsString()
  professionalId!: string;

  /** Início do slot escolhido (instante ISO devolvido por GET /me/slots). */
  @IsISO8601()
  startsAt!: string;
}
