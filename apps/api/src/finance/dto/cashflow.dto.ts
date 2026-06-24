import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export const CASH_DIRECTIONS = ["IN", "OUT"] as const;

export class RecordCashFlowDto {
  @IsIn(CASH_DIRECTIONS)
  direction!: (typeof CASH_DIRECTIONS)[number];

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsISO8601()
  date!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description!: string;
}

export class ReconcileCashFlowDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}
