-- Migration: voeg vervaldatum toe aan aangeboden diensten
-- Een open aanbod vervalt automatisch op de dag van de dienst zelf.

ALTER TABLE shift_offers
  ADD COLUMN expires_at TIMESTAMPTZ;

-- Vul bestaande open offers in: vervalt op de startdag van de dienst (middernacht UTC)
UPDATE shift_offers so
SET expires_at = (
  SELECT s.date::DATE::TIMESTAMPTZ
  FROM shifts s
  WHERE s.id = so.shift_id
)
WHERE so.status = 'open';
