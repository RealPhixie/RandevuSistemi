-- Step 1: Create the PanelUserRole enum
CREATE TYPE "PanelUserRole" AS ENUM ('ADMIN', 'DOCTOR', 'SECRETARY');

-- Step 2: Create the PanelUser table
CREATE TABLE "PanelUser" (
  "id"           TEXT NOT NULL,
  "username"     TEXT NOT NULL,
  "email"        TEXT,
  "password"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "title"        TEXT,
  "role"         "PanelUserRole" NOT NULL,
  "departmentId" TEXT,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PanelUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PanelUser_username_key" ON "PanelUser"("username");
CREATE UNIQUE INDEX "PanelUser_email_key" ON "PanelUser"("email");

-- Step 3: Migrate Admin records to PanelUser with role ADMIN
-- Admins had no email field; email stays NULL.
INSERT INTO "PanelUser" ("id", "username", "email", "password", "name", "title", "role", "departmentId", "isActive", "createdAt")
SELECT
  "id",
  "username",
  NULL,
  "password",
  "name",
  NULL,
  'ADMIN'::"PanelUserRole",
  NULL,
  true,
  "createdAt"
FROM "Admin";

-- Step 4: Migrate Doctor records to PanelUser with role DOCTOR
-- Doctors have no passwords; assign the pre-computed bcrypt hash of 'TempPass123!'.
-- Doctors have no usernames; generate one from normalized lowercased name + id suffix.
INSERT INTO "PanelUser" ("id", "username", "email", "password", "name", "title", "role", "departmentId", "isActive", "createdAt")
SELECT
  "id",
  REGEXP_REPLACE(
    REGEXP_REPLACE(LOWER(TRIM("name")), '\s+', '_', 'g'),
    '[^[:alnum:]_]',
    '',
    'g'
  )
    || '_'
    || SUBSTRING(REGEXP_REPLACE(LOWER("id"), '[^[:alnum:]]', '', 'g'), 1, 12) AS "username",
  NULL,
  '$2b$10$kYaNpXd5vi.cz8WHjZU3O.nPNbbGORowPBT1hWdsK8lfmpcCBmKwy',
  "name",
  "title",
  'DOCTOR'::"PanelUserRole",
  "departmentId",
  "isActive",
  "createdAt"
FROM "Doctor";

-- Step 5: Add FK from PanelUser to Department
ALTER TABLE "PanelUser"
  ADD CONSTRAINT "PanelUser_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Re-point TimeSlot.doctorId FK from Doctor to PanelUser
-- Doctor IDs are preserved in PanelUser, so all existing TimeSlot rows remain valid.
ALTER TABLE "TimeSlot" DROP CONSTRAINT "TimeSlot_doctorId_fkey";
ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "TimeSlot_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "PanelUser"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Add confirmation columns to Appointment
ALTER TABLE "Appointment"
  ADD COLUMN "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "confirmedById" TEXT;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "PanelUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Create DoctorNote table
CREATE TABLE "DoctorNote" (
  "id"        TEXT NOT NULL,
  "doctorId"  TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DoctorNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorNote_doctorId_patientId_key"
  ON "DoctorNote"("doctorId", "patientId");

ALTER TABLE "DoctorNote"
  ADD CONSTRAINT "DoctorNote_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "PanelUser"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DoctorNote"
  ADD CONSTRAINT "DoctorNote_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 9: Drop old tables (must happen after FK re-pointing)
DROP TABLE "Admin";
DROP TABLE "Doctor";
