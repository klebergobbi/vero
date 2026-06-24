import { Module } from "@nestjs/common";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { CashFlowController } from "./cashflow.controller";
import { CashFlowService } from "./cashflow.service";

/**
 * Financeiro da clínica: contas a pagar/receber (S37) + fluxo de caixa e
 * conciliação (S38). Tenant-scoped (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [AccountController, CashFlowController],
  providers: [AccountService, CashFlowService],
})
export class FinanceModule {}
