import { Module } from "@nestjs/common";
import { AppointmentModule } from "../appointment/appointment.module";
import { OrgModule } from "../org/org.module";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  // reusa AppointmentService (conflito/disponibilidade) e OrgService (listagens).
  imports: [AppointmentModule, OrgModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
