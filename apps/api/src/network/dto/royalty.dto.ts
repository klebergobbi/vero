import {
  IsDateString,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import type { AsaasMethod } from "../../integrations/asaas/asaas.service";

export class CalculateRoyaltyDto {
  @IsString()
  unitId!: string;

  /** Percentual de royalty (1–100). */
  @IsInt()
  @Min(1)
  @Max(100)
  percent!: number;

  /** Início do período (ISO 8601). */
  @IsDateString()
  periodStart!: string;

  /** Fim do período (ISO 8601, exclusive). */
  @IsDateString()
  periodEnd!: string;
}

export class ChargeRoyaltyDto {
  @IsIn(["PIX", "BOLETO", "CARD"])
  method!: AsaasMethod;

  /** Data de vencimento (AAAA-MM-DD). */
  @IsDateString()
  dueDate!: string;
}

export class ListRoyaltiesDto {
  @IsString()
  @IsOptional()
  unitId?: string;
}
