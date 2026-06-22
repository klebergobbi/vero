import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { CreateInvoiceDto } from "./dto/invoice.dto";
import { InvoiceService } from "./invoice.service";

/** NFS-e (S23) — tenant-scoped + deny-by-default (billing:read|write). */
@Controller("invoices")
export class InvoiceController {
  constructor(private readonly invoices: InvoiceService) {}

  @Post()
  @Permissions("billing:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoices.createForPayment(tenantId, dto.paymentId);
  }

  @Get(":id")
  @Permissions("billing:read")
  getOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.invoices.getInvoice(tenantId, id);
  }
}
