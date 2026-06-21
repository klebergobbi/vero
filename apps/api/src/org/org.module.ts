import { Module } from "@nestjs/common";
import { OrgController } from "./org.controller";
import { OrgService } from "./org.service";

@Module({
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService], // reusado pelo PublicModule (listagem pública por slug)
})
export class OrgModule {}
