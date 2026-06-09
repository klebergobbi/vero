import { Controller, Delete, HttpCode, HttpStatus } from "@nestjs/common";
import {
  CurrentPrincipal,
  SelfAccount,
} from "../common/decorators/self-account.decorator";
import type { Principal } from "./strategies/jwt.strategy";
import { AccountService } from "./account.service";

/**
 * Exclusão de conta in-app (CLAUDE.md §5 — Apple 5.1.1 + Google). @SelfAccount:
 * qualquer principal autenticado age só sobre a PRÓPRIA conta (id vem do JWT).
 */
@SelfAccount()
@Controller()
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  /** DELETE /me — anonimiza dados pessoais e bloqueia login (paciente ou equipe). */
  @Delete("me")
  @HttpCode(HttpStatus.OK)
  async deleteMe(
    @CurrentPrincipal() principal: Principal,
  ): Promise<{ ok: true }> {
    if (principal.kind === "patient") {
      await this.accounts.deletePatient(
        principal.tenantId,
        principal.patientId,
      );
    } else {
      await this.accounts.deleteStaff(principal.tenantId, principal.userId);
    }
    return { ok: true };
  }
}
