import { Module } from "@nestjs/common";
import { EsignService } from "../integrations/esign/esign.service";
import { ContractController } from "./contract.controller";
import { ContractService } from "./contract.service";
import { MeContractController } from "./me-contract.controller";

@Module({
  controllers: [ContractController, MeContractController],
  providers: [ContractService, EsignService],
})
export class ContractModule {}
