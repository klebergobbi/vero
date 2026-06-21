import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { IsBrazilianPhone, IsCpf } from "../../patient/dto/validators";

/**
 * Agendamento online público (sem JWT). O paciente se identifica por nome +
 * telefone (vira lead). Validação real é aqui (DTO) + no service (§4).
 */
export class BookDto {
  @IsString()
  unitId!: string;

  @IsString()
  professionalId!: string;

  /** Início do slot escolhido (instante ISO devolvido por GET /slots). */
  @IsISO8601()
  startsAt!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsBrazilianPhone()
  phone!: string;

  @IsOptional()
  @IsCpf()
  cpf?: string;
}
