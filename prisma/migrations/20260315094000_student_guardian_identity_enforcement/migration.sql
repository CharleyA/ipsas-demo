-- Add student identity and address fields
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "birthCertificateNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "nationalIdNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "homeAddress" TEXT;

-- Add guardian national ID field
ALTER TABLE "guardians"
  ADD COLUMN IF NOT EXISTS "nationalIdNumber" TEXT;