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

export const ACCOUNT_TYPES = ["PAYABLE", "RECEIVABLE"] as const;

export class CreateAccountDto {
  @IsIn(ACCOUNT_TYPES)
  type!: (typeof ACCOUNT_TYPES)[number];

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category!: string;

  /** valor em centavos (> 0). */
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsISO8601()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
