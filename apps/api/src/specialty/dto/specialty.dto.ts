import { IsObject } from "class-validator";

export class SaveSpecialtyDto {
  /** Respostas { campoId: valor }; filtradas pela definição da especialidade. */
  @IsObject()
  values!: Record<string, unknown>;
}
