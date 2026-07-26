import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { CryptoService } from "../record/crypto.service";
import { ManageController, V1Controller } from "./public-api.controller";
import { ApiKeyGuard } from "./api-key.guard";
import { ApiKeyService } from "./api-key.service";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ManageController, V1Controller],
  // CryptoService provido aqui (stateless, mesmo padrão da S28/S29): cifra o
  // segredo do webhook em repouso, sem acoplar ao RecordModule.
  providers: [ApiKeyService, ApiKeyGuard, CryptoService],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class PublicApiModule {}
