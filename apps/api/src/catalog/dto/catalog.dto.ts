import { PartialType } from "@nestjs/mapped-types";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

// --- Procedimento ---
export class CreateProcedureDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}

export class UpdateProcedureDto extends PartialType(CreateProcedureDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// --- Convênio (Plan) ---
export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// --- Preço (PriceTable: procedimento × convênio) ---
export class CreatePriceDto {
  @IsString()
  procedureId!: string;

  @IsString()
  planId!: string;

  /** Preço em centavos (evita float em dinheiro). */
  @IsInt()
  @Min(0)
  priceCents!: number;
}

export class UpdatePriceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
