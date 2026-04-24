-- Add is_published flag to seasons
ALTER TABLE seasons ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false;

-- Update shifts RLS: non-admins only see shifts for published seasons
-- (standalone shifts without a season remain visible to all authenticated users)
DROP POLICY IF EXISTS "authenticated_read" ON shifts;
CREATE POLICY "authenticated_read" ON shifts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      is_admin()
      OR season_id IS NULL
      OR EXISTS (
        SELECT 1 FROM seasons
        WHERE seasons.id = shifts.season_id
        AND seasons.is_published = true
      )
    )
  );
