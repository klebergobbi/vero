import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  StreamableFile,
} from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Public } from "../common/decorators/public.decorator";
import { CurrentPrincipal } from "../common/decorators/self-account.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { AddAttachmentDto, AddEntryDto } from "./dto/record.dto";
import { RecordService } from "./record.service";

/** Prontuário (S26) — equipe (record:read|write); anexos servidos por URL assinada. */
@Controller("records")
export class RecordController {
  constructor(private readonly records: RecordService) {}

  /** GET /records/:patientId — prontuário do paciente (AUDITA SENSITIVE_READ). */
  @Get(":patientId")
  @Permissions("record:read")
  view(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @CurrentPrincipal() principal: Principal,
    @Ip() ip: string,
  ) {
    const actorId = principal.kind === "staff" ? principal.userId : undefined;
    return this.records.viewRecord(tenantId, patientId, {
      ...(actorId ? { actorId } : {}),
      ip,
    });
  }

  /** POST /records/:patientId/entries — nova evolução clínica (cifrada). */
  @Post(":patientId/entries")
  @Permissions("record:write")
  addEntry(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @Body() dto: AddEntryDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    const authorId = principal.kind === "staff" ? principal.userId : "";
    return this.records.addEntry(tenantId, patientId, authorId, dto.content);
  }

  /** POST /records/:patientId/attachments — anexa imagem/exame (cifrada). */
  @Post(":patientId/attachments")
  @Permissions("record:write")
  addAttachment(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @Body() dto: AddAttachmentDto,
  ) {
    return this.records.addAttachment(tenantId, patientId, dto);
  }

  /** GET /records/attachments/:token — anexo decifrado (token assinado autoriza). */
  @Public()
  @Get("attachments/:token")
  async attachment(@Param("token") token: string): Promise<StreamableFile> {
    const { data, contentType, filename } =
      await this.records.serveAttachment(token);
    return new StreamableFile(data, {
      type: contentType,
      disposition: `inline; filename="${filename}"`,
    });
  }
}
