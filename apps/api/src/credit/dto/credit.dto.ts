import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateCreditCheckDto {
  @IsString()
  patientId!: string;

  @IsIn(["QUERY", "INCLUSION"])
  kind!: "QUERY" | "INCLUSION";

  /** Consentimento/base legal — obrigatório true (LGPD). */
  @IsBoolean()
  consent!: boolean;

  /** Valor da dívida em centavos (obrigatório para INCLUSION). */
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;
}
