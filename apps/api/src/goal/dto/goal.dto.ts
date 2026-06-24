import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export const GOAL_METRICS = ["REVENUE", "APPOINTMENTS"] as const;

export class CreateGoalDto {
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsIn(GOAL_METRICS)
  metric!: (typeof GOAL_METRICS)[number];

  /** alvo: centavos (REVENUE) ou contagem (APPOINTMENTS). */
  @IsInt()
  @Min(1)
  targetValue!: number;

  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;
}
