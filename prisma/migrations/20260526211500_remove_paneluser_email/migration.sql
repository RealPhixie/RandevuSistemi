DROP INDEX IF EXISTS "PanelUser_email_key";

ALTER TABLE "PanelUser"
  DROP COLUMN IF EXISTS "email";
