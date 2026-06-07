import { IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";

/** Janela de disponibilidade: dia da semana (0=dom) + minutos do dia no fuso da unidade. */
export class CreateAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @IsString()
  @IsNotEmpty()
  professionalId!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;
}
