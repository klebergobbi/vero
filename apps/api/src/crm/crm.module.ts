import { Module } from "@nestjs/common";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

/**
 * CRM (S44): origem (canais), indicação (quem indicou quem) e demografia dos leads;
 * relatório de ROI por canal. Tenant-scoped (anti-IDOR). PrismaService é @Global.
 */
@Module({
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
