ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS patient_species text,
ADD COLUMN IF NOT EXISTS patient_owner text;
