import { Module } from "@nestjs/common";
import { AppointmentModule } from "../appointment/appointment.module";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  imports: [AppointmentModule], // reusa AppointmentService (conflito/disponibilidade)
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
