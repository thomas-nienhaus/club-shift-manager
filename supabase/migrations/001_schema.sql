-- Full schema for Kantine Planner on Supabase
-- Run this in the Supabase SQL editor to set up the database.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE availability_slots (
  id           SERIAL PRIMARY KEY,
  key          TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  start_time   TEXT,
  end_time     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteers (
  id           SERIAL PRIMARY KEY,
  auth_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE,
  phone        TEXT,
  is_admin     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteer_availability (
  id           SERIAL PRIMARY KEY,
  volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  slot         TEXT NOT NULL,
  UNIQUE(volunteer_id, slot)
);

CREATE TABLE volunteer_groups (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteer_group_members (
  id           SERIAL PRIMARY KEY,
  group_id     INTEGER NOT NULL REFERENCES volunteer_groups(id) ON DELETE CASCADE,
  volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  UNIQUE(volunteer_id)
);

CREATE TABLE seasons (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shifts (
  id         SERIAL PRIMARY KEY,
  season_id  INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  slot       TEXT NOT NULL,
  start_time TEXT,
  end_time   TEXT,
  capacity   INTEGER NOT NULL DEFAULT 99,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX shifts_date_slot_no_season_idx
  ON shifts(date, slot) WHERE season_id IS NULL;
CREATE UNIQUE INDEX shifts_season_date_slot_idx
  ON shifts(season_id, date, slot) WHERE season_id IS NOT NULL;

CREATE TABLE assignments (
  id           SERIAL PRIMARY KEY,
  shift_id     INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shift_id, volunteer_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE availability_slots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_availability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_group_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments               ENABLE ROW LEVEL SECURITY;

-- Helper: true when the current auth user is an admin volunteer
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS(
    SELECT 1 FROM volunteers
    WHERE auth_id = auth.uid() AND is_admin = true
  )
$$;

-- Read: any authenticated user
CREATE POLICY "authenticated_read" ON availability_slots      FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON volunteers              FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON volunteer_availability  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON volunteer_groups        FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON volunteer_group_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON seasons                 FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON shifts                  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON assignments             FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write: admins can do everything
CREATE POLICY "admin_all" ON availability_slots      FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_all" ON volunteers              FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_all" ON volunteer_availability  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_all" ON volunteer_groups        FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_all" ON volunteer_group_members FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_all" ON seasons                 FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_all" ON shifts                  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_all" ON assignments             FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Volunteers can update their own record (name, email, phone)
CREATE POLICY "self_update" ON volunteers
  FOR UPDATE USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());
