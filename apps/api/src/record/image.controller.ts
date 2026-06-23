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
import { AddImageDto } from "./dto/image.dto";
import { ImageService } from "./image.service";

/** Câmera intraoral / Image2Doc (S36) — equipe (record:read|write). */
@Controller("records")
export class ImageController {
  constructor(private readonly images: ImageService) {}

  /** POST /records/:patientId/images — anexa imagem intraoral (cifrada + thumb). */
  @Post(":patientId/images")
  @Permissions("record:write")
  add(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @Body() dto: AddImageDto,
  ) {
    return this.images.addImage(tenantId, patientId, {
      filename: dto.filename,
      contentType: dto.contentType,
      dataBase64: dto.dataBase64,
      ...(dto.thumbnailBase64 ? { thumbnailBase64: dto.thumbnailBase64 } : {}),
    });
  }

  /** GET /records/:patientId/images — galeria de imagens (URLs assinadas). */
  @Get(":patientId/images")
  @Permissions("record:read")
  list(
    @TenantId() tenantId: string,
    @Param("patientId") patientId: string,
    @CurrentPrincipal() principal: Principal,
    @Ip() ip: string,
  ) {
    const actorId = principal.kind === "staff" ? principal.userId : undefined;
    return this.images.listImages(tenantId, patientId, {
      ...(actorId ? { actorId } : {}),
      ip,
    });
  }

  /** GET /records/images/:token — imagem decifrada (token assinado autoriza). */
  @Public()
  @Get("images/:token")
  async serve(@Param("token") token: string): Promise<StreamableFile> {
    const { data, contentType } = await this.images.serveImage(token);
    return new StreamableFile(data, { type: contentType });
  }
}
