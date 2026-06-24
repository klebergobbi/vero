import { IsNotEmpty, IsString } from "class-validator";

export class SwitchUnitDto {
  @IsString()
  @IsNotEmpty()
  unitId!: string;
}
