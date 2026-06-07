import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * Credenciais de login. Validação class-validator (CLAUDE.md §4 — rejeita 400).
 * Multi-tenant: `tenantSlug` identifica o tenant, pois `email` é único POR TENANT
 * (não global) — ver `@@unique([tenantId, email])` no schema.
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenantSlug!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  // Não validamos política de senha aqui (não vazar regras); só presença.
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;
}
