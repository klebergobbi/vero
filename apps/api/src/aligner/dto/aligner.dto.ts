import {
  IsISO8601,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class CreateAlignerCaseDto {
  @IsString()
  patientId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  totalSteps!: number;

  /** Intervalo de troca entre alinhadores (dias). */
  @IsInt()
  @Min(1)
  @Max(90)
  intervalDays!: number;

  /** Data de início do 1º alinhador (ISO). */
  @IsISO8601()
  startDate!: string;
}
