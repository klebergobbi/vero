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
import { CrcService } from "./crc.service";
import { AssignCrcTaskDto, CreateCrcTaskDto } from "./dto/crc.dto";

/** CRC — Central de Relacionamento (S34). Recepção/equipe (appointment:read|write). */
@Controller("crc/tasks")
export class CrcController {
  constructor(private readonly crc: CrcService) {}

  /** POST /crc/tasks — cria uma tarefa manual. */
  @Post()
  @Permissions("appointment:write")
  create(@TenantId() tenantId: string, @Body() dto: CreateCrcTaskDto) {
    return this.crc.create(tenantId, {
      patientId: dto.patientId,
      type: dto.type,
      ...(dto.dueDate ? { dueDate: dto.dueDate } : {}),
      ...(dto.notes ? { notes: dto.notes } : {}),
      ...(dto.priority != null ? { priority: dto.priority } : {}),
      ...(dto.assignedToId ? { assignedToId: dto.assignedToId } : {}),
    });
  }

  /** POST /crc/tasks/sync — importa os ReturnAlert TRIGGERED como tarefas. */
  @Post("sync")
  @Permissions("appointment:write")
  sync(@TenantId() tenantId: string) {
    return this.crc.syncReturnAlerts(tenantId);
  }

  /** GET /crc/tasks?status= — lista priorizada de contatos. */
  @Get()
  @Permissions("appointment:read")
  list(@TenantId() tenantId: string, @Query("status") status?: string) {
    return this.crc.list(tenantId, status);
  }

  /** PATCH /crc/tasks/:id/done — marca como feito. */
  @Patch(":id/done")
  @Permissions("appointment:write")
  markDone(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.crc.markDone(tenantId, id);
  }

  /** PATCH /crc/tasks/:id/assign — atribui/desatribui a um profissional. */
  @Patch(":id/assign")
  @Permissions("appointment:write")
  assign(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: AssignCrcTaskDto,
  ) {
    return this.crc.assign(tenantId, id, dto.userId ?? null);
  }
}
