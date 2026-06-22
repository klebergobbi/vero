import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
} from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { TenantId } from "../common/decorators/tenant-id.decorator";
import { CreateReceiptDto } from "./dto/receipt.dto";
import { ReceiptService } from "./receipt.service";

/** Recibos (S24) — emite (equipe) e serve o PDF por URL assinada (pública). */
@Controller("receipts")
export class ReceiptController {
  constructor(private readonly receipts: ReceiptService) {}

  /** POST /receipts — emite o recibo de um pagamento e devolve a URL assinada. */
  @Post()
  @Permissions("billing:read")
  issue(@TenantId() tenantId: string, @Body() dto: CreateReceiptDto) {
    return this.receipts.issue(tenantId, dto.paymentId);
  }

  /** GET /receipts/file/:token — PDF do recibo (token assinado valida o acesso). */
  @Public()
  @Get("file/:token")
  @Header("content-type", "application/pdf")
  @Header("content-disposition", 'inline; filename="recibo.pdf"')
  async file(@Param("token") token: string): Promise<StreamableFile> {
    const receiptId = this.receipts.verifyToken(token);
    const pdf = await this.receipts.generatePdf(receiptId);
    return new StreamableFile(pdf);
  }
}
