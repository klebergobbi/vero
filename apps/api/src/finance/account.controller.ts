import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { AccountService } from "./account.service";
import { CreateAccountDto } from "./dto/account.dto";

/** Contas a pagar/receber (S37) — financeiro (billing:read|write). */
@Controller("accounts")
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  /** POST /accounts — lança uma conta a pagar/receber. */
  @Post()
  @Permissions("billing:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateAccountDto) {
    return this.accounts.create(tenantId, {
      type: dto.type,
      description: dto.description,
      category: dto.category,
      amountCents: dto.amountCents,
      dueDate: dto.dueDate,
      ...(dto.notes ? { notes: dto.notes } : {}),
    });
  }

  /** GET /accounts?type=&status= — lista lançamentos (com flag de atraso). */
  @Get()
  @Permissions("billing:read")
  list(
    @TenantId() tenantId: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
  ) {
    return this.accounts.list(tenantId, {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    });
  }

  /** GET /accounts/summary — totais em aberto (pagar/receber). */
  @Get("summary")
  @Permissions("billing:read")
  summary(@TenantId() tenantId: string) {
    return this.accounts.summary(tenantId);
  }

  /** PATCH /accounts/:id/pay — baixa manual (marca como paga). */
  @Patch(":id/pay")
  @Permissions("billing:write")
  pay(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.accounts.markPaid(tenantId, id);
  }

  /** PATCH /accounts/:id/cancel — cancela o lançamento. */
  @Patch(":id/cancel")
  @Permissions("billing:write")
  cancel(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.accounts.cancel(tenantId, id);
  }
}
