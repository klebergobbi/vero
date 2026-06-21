import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateBudgetDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class AddBudgetItemDto {
  @IsString()
  procedureId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  /** Preço unitário em centavos. Opcional: se ausente, vem do catálogo (PriceTable). */
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceCents?: number;
}

export class SetBudgetStatusDto {
  /** Decisão do orçamento (a partir de OPEN). */
  @IsIn(["APPROVED", "REJECTED"])
  status!: "APPROVED" | "REJECTED";
}
