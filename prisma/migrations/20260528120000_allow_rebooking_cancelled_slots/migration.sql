DROP INDEX IF EXISTS "Appointment_timeSlotId_key";

CREATE INDEX IF NOT EXISTS "Appointment_timeSlotId_idx" ON "Appointment"("timeSlotId");
