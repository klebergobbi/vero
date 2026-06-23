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

export const CRC_TASK_TYPES = [
  "RETURN",
  "POST_SALE",
  "REACTIVATION",
  "BIRTHDAY",
  "OTHER",
] as const;

export class CreateCrcTaskDto {
  @IsString()
  patientId!: string;

  @IsIn(CRC_TASK_TYPES)
  type!: (typeof CRC_TASK_TYPES)[number];

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class AssignCrcTaskDto {
  /** id do profissional, ou null para desatribuir. */
  @IsOptional()
  @IsString()
  userId?: string | null;
}
