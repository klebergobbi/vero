import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateProstheticOrderDto {
  @IsString()
  patientId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  labName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsString()
  treatmentItemId?: string;

  @IsOptional()
  @IsISO8601()
  expectedReturnDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class MarkSentDto {
  @IsOptional()
  @IsISO8601()
  expectedReturnDate?: string;
}
