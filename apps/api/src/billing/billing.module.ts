import { Module } from "@nestjs/common";
import { AsaasService } from "../integrations/asaas/asaas.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  controllers: [BillingController],
  providers: [BillingService, AsaasService],
})
export class BillingModule {}
