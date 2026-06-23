import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateReturnAlertDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  /** Data do retorno (ISO). Use isto OU intervalDays. */
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  /** Dias a partir de hoje até o retorno (ex.: 180 = 6 meses). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  intervalDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class SetReturnAlertStatusDto {
  @IsIn(["DONE", "CANCELLED"])
  status!: "DONE" | "CANCELLED";
}
