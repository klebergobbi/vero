import { Module } from "@nestjs/common";
import { PublicApiModule } from "../public-api/public-api.module";
import { AppointmentController } from "./appointment.controller";
import { AppointmentService } from "./appointment.service";
import { SlotService } from "./slot.service";

@Module({
  imports: [PublicApiModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, SlotService],
  exports: [AppointmentService, SlotService],
})
export class AppointmentModule {}
