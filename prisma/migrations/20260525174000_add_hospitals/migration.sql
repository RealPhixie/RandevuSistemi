-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_name_key" ON "Hospital"("name");

-- Seed a default hospital so existing departments can be attached safely.
INSERT INTO "Hospital" ("id", "name", "address", "phone")
VALUES ('default-hospital', 'Merkez Hastane', NULL, NULL)
ON CONFLICT ("name") DO NOTHING;

-- AddColumn
ALTER TABLE "Department" ADD COLUMN "hospitalId" TEXT;

-- Backfill
UPDATE "Department"
SET "hospitalId" = COALESCE(
    "hospitalId",
    (SELECT "id" FROM "Hospital" WHERE "name" = 'Merkez Hastane' LIMIT 1)
);

-- AlterColumn
ALTER TABLE "Department" ALTER COLUMN "hospitalId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "Department_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Department_hospitalId_name_key" ON "Department"("hospitalId", "name");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
