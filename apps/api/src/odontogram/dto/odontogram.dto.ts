import { IsIn, IsInt } from "class-validator";
import {
  FDI_PERMANENT_TEETH,
  TOOTH_CONDITION_KEYS,
  TOOTH_FACES,
} from "@vero/types";

export class SetToothConditionDto {
  @IsInt()
  @IsIn(FDI_PERMANENT_TEETH, { message: "Dente FDI inválido" })
  toothNumber!: number;

  @IsIn(TOOTH_FACES)
  face!: string;

  @IsIn(TOOTH_CONDITION_KEYS)
  condition!: string;
}
