import { Module } from "@nestjs/common";
import { AppointmentController } from "./appointment.controller";
import { AppointmentService } from "./appointment.service";
import { SlotService } from "./slot.service";

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService, SlotService],
  exports: [AppointmentService, SlotService],
})
export class AppointmentModule {}
