import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";

/** AuditService disponível globalmente (PrismaModule já é @Global). */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
