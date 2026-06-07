import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { LEAD_SOURCES, type LeadSource } from "@vero/types";
import { IsBrazilianPhone, IsCpf } from "./validators";

/**
 * Cadastro rápido de 1ª consulta (CLAUDE.md S5): só o essencial é obrigatório.
 * Validação class-validator no DTO (§4 — rejeita 400). CPF/telefone via @vero/types.
 */
export class CreatePatientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsBrazilianPhone()
  phone!: string;

  @IsIn(LEAD_SOURCES)
  leadSource!: LeadSource;

  @IsOptional()
  @IsCpf()
  cpf?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  referredById?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
