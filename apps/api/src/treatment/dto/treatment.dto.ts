import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class GeneratePlanDto {
  @IsString()
  budgetId!: string;
}

export class ExecuteItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /** Data da execução (ISO). Default: agora. */
  @IsOptional()
  @IsISO8601()
  performedAt?: string;
}
