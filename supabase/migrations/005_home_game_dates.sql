-- Migration: thuiswedstrijddatums per seizoen
-- Op thuiswedstrijddagen worden extra diensten (extra_slot) ingepland naast de normale dagdelen.

CREATE TABLE home_game_dates (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  extra_slot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, date)
);

ALTER TABLE home_game_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view home game dates"
  ON home_game_dates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage home game dates"
  ON home_game_dates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM volunteers WHERE auth_id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM volunteers WHERE auth_id = auth.uid() AND is_admin = true));
