UPDATE "TimeSlot" AS "slot"
SET "isBooked" = false
WHERE "slot"."isBooked" = true
  AND (
    "slot"."date" > ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Istanbul')::date)::timestamp
    OR (
      "slot"."date" = ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Istanbul')::date)::timestamp
      AND "slot"."startTime" > to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Istanbul', 'HH24:MI')
    )
  )
  AND EXISTS (
    SELECT 1
    FROM "Appointment" AS "appointment"
    WHERE "appointment"."timeSlotId" = "slot"."id"
      AND "appointment"."status" = 'CANCELLED'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "Appointment" AS "appointment"
    WHERE "appointment"."timeSlotId" = "slot"."id"
      AND "appointment"."status" IN ('SCHEDULED', 'COMPLETED', 'NO_SHOW')
  );
