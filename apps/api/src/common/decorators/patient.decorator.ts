import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";

/**
 * Marca uma rota como do APP DO PACIENTE. A PermissionsGuard trata rotas @Patient
 * numa faixa própria (exige principal de paciente; não checa permissions de papel)
 * e mantém deny-by-default: token de equipe NÃO abre rota @Patient e vice-versa.
 */
export const IS_PATIENT_KEY = "isPatientRoute";
export const Patient = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PATIENT_KEY, true);

interface PatientRequest {
  user?: { kind?: string; patientId?: string };
}

/**
 * Injeta o `patientId` do paciente autenticado (posto pela JwtStrategy).
 * Fail-closed: se não for um principal de paciente → 401. Use para escopar
 * queries ao dono (anti-IDOR: paciente só acessa os próprios dados).
 */
export const PatientId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<PatientRequest>();
    const id = req.user?.kind === "patient" ? req.user.patientId : undefined;
    if (!id) throw new UnauthorizedException();
    return id;
  },
);
