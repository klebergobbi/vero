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

export class CreateLeadSourceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  /** investimento de marketing no canal (centavos). */
  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;
}

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  leadSourceId?: string;

  @IsOptional()
  @IsString()
  referredByPatientId?: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}

export class UpdateLeadStatusDto {
  @IsIn(["NEW", "SCHEDULED", "CLOSED", "LOST"])
  status!: "NEW" | "SCHEDULED" | "CLOSED" | "LOST";

  @IsOptional()
  @IsInt()
  @Min(1)
  valueCents?: number;
}
