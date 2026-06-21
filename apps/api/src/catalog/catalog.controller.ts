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
  Query,
} from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { CatalogService } from "./catalog.service";
import {
  CreatePlanDto,
  CreatePriceDto,
  CreateProcedureDto,
  UpdatePlanDto,
  UpdatePriceDto,
  UpdateProcedureDto,
} from "./dto/catalog.dto";

/** Catálogo comercial (S16) — tenant-scoped + deny-by-default (catalog:read|write). */
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // --- Procedimentos ---

  @Post("procedures")
  @Permissions("catalog:write")
  createProcedure(
    @TenantId() tenantId: string,
    @Body() dto: CreateProcedureDto,
  ) {
    return this.catalog.createProcedure(tenantId, dto);
  }

  @Get("procedures")
  @Permissions("catalog:read")
  listProcedures(@TenantId() tenantId: string) {
    return this.catalog.listProcedures(tenantId);
  }

  @Patch("procedures/:id")
  @Permissions("catalog:write")
  updateProcedure(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateProcedureDto,
  ) {
    return this.catalog.updateProcedure(tenantId, id, dto);
  }

  @Delete("procedures/:id")
  @Permissions("catalog:write")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeProcedure(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.catalog.removeProcedure(tenantId, id);
  }

  // --- Convênios ---

  @Post("plans")
  @Permissions("catalog:write")
  createPlan(@TenantId() tenantId: string, @Body() dto: CreatePlanDto) {
    return this.catalog.createPlan(tenantId, dto);
  }

  @Get("plans")
  @Permissions("catalog:read")
  listPlans(@TenantId() tenantId: string) {
    return this.catalog.listPlans(tenantId);
  }

  @Patch("plans/:id")
  @Permissions("catalog:write")
  updatePlan(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.catalog.updatePlan(tenantId, id, dto);
  }

  @Delete("plans/:id")
  @Permissions("catalog:write")
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlan(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.catalog.removePlan(tenantId, id);
  }

  // --- Preços (procedimento × convênio) ---

  @Post("prices")
  @Permissions("catalog:write")
  createPrice(@TenantId() tenantId: string, @Body() dto: CreatePriceDto) {
    return this.catalog.createPrice(tenantId, dto);
  }

  @Get("prices")
  @Permissions("catalog:read")
  listPrices(
    @TenantId() tenantId: string,
    @Query("procedureId") procedureId?: string,
  ) {
    return this.catalog.listPrices(tenantId, procedureId);
  }

  @Patch("prices/:id")
  @Permissions("catalog:write")
  updatePrice(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdatePriceDto,
  ) {
    return this.catalog.updatePrice(tenantId, id, dto);
  }

  @Delete("prices/:id")
  @Permissions("catalog:write")
  @HttpCode(HttpStatus.NO_CONTENT)
  removePrice(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.catalog.removePrice(tenantId, id);
  }
}
