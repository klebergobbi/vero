import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
} from "@nestjs/common";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Public } from "../common/decorators/public.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { RequestReportDto } from "./dto/report.dto";
import { ReportService } from "./report.service";

/** Engine de relatórios (S43) — gestão (billing:read|write). */
@Controller("reports")
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  /** POST /reports — solicita um relatório (gerado em background). */
  @Post()
  @Permissions("billing:write")
  request(@TenantId() tenantId: string, @Body() dto: RequestReportDto) {
    return this.reports.request(tenantId, {
      type: dto.type,
      format: dto.format,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
    });
  }

  @Get()
  @Permissions("billing:read")
  list(@TenantId() tenantId: string) {
    return this.reports.list(tenantId);
  }

  /** GET /reports/:id — status + URL assinada de download (quando READY). */
  @Get(":id")
  @Permissions("billing:read")
  get(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.reports.get(tenantId, id);
  }

  /** GET /reports/file/:token — CSV/PDF do relatório (token assinado autoriza). */
  @Public()
  @Get("file/:token")
  @Header("content-disposition", "attachment")
  async file(@Param("token") token: string): Promise<StreamableFile> {
    const { data, contentType, filename } = await this.reports.serveFile(token);
    return new StreamableFile(data, {
      type: contentType,
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
