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
import { CreateProstheticOrderDto, MarkSentDto } from "./dto/prosthetic.dto";
import { ProstheticService } from "./prosthetic.service";

/** Controle protético (S35) — equipe clínica (record:read|write). */
@Controller("prosthetic/orders")
export class ProstheticController {
  constructor(private readonly prosthetic: ProstheticService) {}

  /** POST /prosthetic/orders — registra um pedido protético. */
  @Post()
  @Permissions("record:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateProstheticOrderDto) {
    return this.prosthetic.create(tenantId, {
      patientId: dto.patientId,
      labName: dto.labName,
      description: dto.description,
      ...(dto.treatmentItemId ? { treatmentItemId: dto.treatmentItemId } : {}),
      ...(dto.expectedReturnDate
        ? { expectedReturnDate: dto.expectedReturnDate }
        : {}),
      ...(dto.notes ? { notes: dto.notes } : {}),
    });
  }

  /** GET /prosthetic/orders?status= — lista (com flag de atraso). */
  @Get()
  @Permissions("record:read")
  list(@TenantId() tenantId: string, @Query("status") status?: string) {
    return this.prosthetic.list(tenantId, status);
  }

  /** PATCH /prosthetic/orders/:id/send — marca enviado ao laboratório. */
  @Patch(":id/send")
  @Permissions("record:write")
  send(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: MarkSentDto,
  ) {
    return this.prosthetic.markSent(tenantId, id, {
      ...(dto.expectedReturnDate
        ? { expectedReturnDate: dto.expectedReturnDate }
        : {}),
    });
  }

  /** PATCH /prosthetic/orders/:id/receive — marca recebido do laboratório. */
  @Patch(":id/receive")
  @Permissions("record:write")
  receive(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.prosthetic.markReceived(tenantId, id);
  }

  /** PATCH /prosthetic/orders/:id/cancel — cancela o pedido. */
  @Patch(":id/cancel")
  @Permissions("record:write")
  cancel(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.prosthetic.cancel(tenantId, id);
  }
}
