ALTER TABLE "TimeSlot" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "TimeSlot_doctorId_date_isActive_idx" ON "TimeSlot"("doctorId", "date", "isActive");
