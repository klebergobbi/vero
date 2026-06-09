import { Module } from "@nestjs/common";
import { MeController } from "./me.controller";
import { MeService } from "./me.service";

/** App do Paciente — leituras owner-scoped (PrismaModule é @Global). */
@Module({
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
