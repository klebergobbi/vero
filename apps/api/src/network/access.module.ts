import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";

/**
 * Central de acessos multi-unidade (S45). Importa AuthModule p/ re-emitir tokens
 * (AuthService) após revalidar a autorização da unidade. PrismaService é @Global.
 */
@Module({
  imports: [AuthModule],
  controllers: [AccessController],
  providers: [AccessService],
})
export class AccessModule {}
