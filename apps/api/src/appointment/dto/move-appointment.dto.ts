import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

/** Mover/remarcar: novo horário (obrigatório) e, opcionalmente, profissional/sala. */
export class MoveAppointmentDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  professionalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  roomId?: string;
}
