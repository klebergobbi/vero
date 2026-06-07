import { PartialType } from "@nestjs/mapped-types";
import { CreatePatientDto } from "./create-patient.dto";

/** Atualização parcial: todos os campos opcionais, reusando as validações do create. */
export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
