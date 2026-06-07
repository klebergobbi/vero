import { z } from "zod";

/**
 * Status do agendamento (§6: Appointment.status). Espelha o enum `AppointmentStatus`
 * do schema.prisma (manter em sincronia). CANCELLED/NO_SHOW liberam o horário.
 */
export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);

/** Status que NÃO ocupam o horário (não geram conflito). */
export const FREEING_STATUSES: readonly AppointmentStatus[] = [
  "CANCELLED",
  "NO_SHOW",
];
