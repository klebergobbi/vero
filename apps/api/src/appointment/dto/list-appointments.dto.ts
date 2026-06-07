import { IsDateString, IsOptional, IsString } from "class-validator";

/** Filtros da listagem da agenda (todos opcionais). */
export class ListAppointmentsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;
}
