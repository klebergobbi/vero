import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateCommissionRuleDto {
  @IsString()
  professionalId!: string;

  @IsOptional()
  @IsString()
  procedureId?: string;

  /** percentual da comissão (0..100). */
  @IsInt()
  @Min(0)
  @Max(100)
  percent!: number;
}

export class RecordCommissionDto {
  @IsString()
  professionalId!: string;

  @IsOptional()
  @IsString()
  procedureId?: string;

  /** valor-base em centavos (> 0) sobre o qual incide o percentual. */
  @IsInt()
  @Min(1)
  baseCents!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description!: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}
