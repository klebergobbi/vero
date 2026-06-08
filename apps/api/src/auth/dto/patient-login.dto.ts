import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * Login do App do Paciente. Validação class-validator (CLAUDE.md §4 — rejeita 400).
 * `identifier` é CPF ou e-mail (resolvido no service; CPF é único por tenant).
 * `tenantSlug` é necessário porque o identificador só é único DENTRO do tenant.
 */
export class PatientLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenantSlug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier!: string;

  // Não validamos política de senha aqui (não vazar regras); só presença.
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;
}
