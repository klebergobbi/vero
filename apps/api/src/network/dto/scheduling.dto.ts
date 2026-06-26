import { IsDateString, IsOptional, IsString } from "class-validator";

export class CentralQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  unitId?: string;
}
