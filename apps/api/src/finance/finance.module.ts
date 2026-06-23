import { Module } from "@nestjs/common";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";

/**
 * Financeiro da clínica (S37): contas a pagar/receber com baixa manual.
 * Tenant-scoped (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [AccountController],
  providers: [AccountService],
})
export class FinanceModule {}
