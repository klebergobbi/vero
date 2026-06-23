import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
} from "@nestjs/common";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Public } from "../common/decorators/public.decorator";
import { CurrentPrincipal } from "../common/decorators/self-account.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { DocumentService } from "./document.service";
import { IssueDocumentDto } from "./dto/document.dto";

/** Documentos clínicos (S32) — equipe (record:read|write). Serve PDF por URL assinada. */
@Controller("documents")
export class DocumentController {
  constructor(private readonly documents: DocumentService) {}

  /** POST /documents — emite atestado/receituário (DRAFT). */
  @Post()
  @Permissions("record:write")
  issue(@TenantId() tenantId: string, @Body() dto: IssueDocumentDto) {
    return this.documents.issue(tenantId, {
      patientId: dto.patientId,
      type: dto.type,
      title: dto.title,
      content: dto.content,
    });
  }

  @Get()
  @Permissions("record:read")
  list(@TenantId() tenantId: string, @Query("patientId") patientId?: string) {
    return this.documents.list(tenantId, patientId);
  }

  @Get(":id")
  @Permissions("record:read")
  get(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.documents.get(tenantId, id);
  }

  /** POST /documents/:id/sign — assina (profissional, server-side). */
  @Post(":id/sign")
  @Permissions("record:write")
  sign(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @CurrentPrincipal() principal: Principal,
  ) {
    const userId = principal.kind === "staff" ? principal.userId : "";
    return this.documents.sign(tenantId, id, { userId });
  }

  /** GET /documents/:id/verify — verificação de validade (integridade + assinatura). */
  @Get(":id/verify")
  @Permissions("record:read")
  verify(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.documents.verify(tenantId, id);
  }

  /** GET /documents/:id/pdf — devolve a URL assinada do PDF. */
  @Get(":id/pdf")
  @Permissions("record:read")
  async pdfUrl(@TenantId() tenantId: string, @Param("id") id: string) {
    await this.documents.get(tenantId, id); // valida posse (anti-IDOR) antes de assinar a URL
    return this.documents.signedUrl(id);
  }

  /** GET /documents/file/:token — PDF (o token assinado valida o acesso). */
  @Public()
  @Get("file/:token")
  @Header("content-type", "application/pdf")
  @Header("content-disposition", 'inline; filename="documento.pdf"')
  async file(@Param("token") token: string): Promise<StreamableFile> {
    const documentId = this.documents.verifyToken(token);
    const pdf = await this.documents.generatePdf(documentId);
    return new StreamableFile(pdf);
  }
}
