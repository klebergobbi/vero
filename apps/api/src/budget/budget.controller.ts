import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { BudgetService } from "./budget.service";
import {
  AddBudgetItemDto,
  CreateBudgetDto,
  SetBudgetStatusDto,
} from "./dto/budget.dto";

/** Orçamentos (S17) — tenant-scoped + deny-by-default (budget:read|write). */
@Controller("budgets")
export class BudgetController {
  constructor(private readonly budgets: BudgetService) {}

  @Post()
  @Permissions("budget:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateBudgetDto) {
    return this.budgets.create(tenantId, dto);
  }

  @Get()
  @Permissions("budget:read")
  list(@TenantId() tenantId: string) {
    return this.budgets.listBudgets(tenantId);
  }

  @Get(":id")
  @Permissions("budget:read")
  getOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.budgets.getBudget(tenantId, id);
  }

  @Post(":id/items")
  @Permissions("budget:write")
  addItem(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: AddBudgetItemDto,
  ) {
    return this.budgets.addItem(tenantId, id, dto);
  }

  @Delete(":id/items/:itemId")
  @Permissions("budget:write")
  removeItem(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.budgets.removeItem(tenantId, id, itemId);
  }

  @Patch(":id/status")
  @Permissions("budget:write")
  setStatus(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: SetBudgetStatusDto,
  ) {
    return this.budgets.setStatus(tenantId, id, dto);
  }

  @Delete(":id")
  @Permissions("budget:write")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.budgets.remove(tenantId, id);
  }
}
