-- Migration: security fixes
-- 1. Add authorization checks to execute_takeover/execute_swap_offer (SECURITY DEFINER bypass)
-- 2. Fix shift_offer_responses UPDATE policy (missing WITH CHECK)
-- 3. Add shift_offer_responses DELETE policy
-- 4. Tighten shift_offers INSERT policy (require actual assignment)

-- ── Fix 1 & 2: Recreate execute_takeover with auth check ──────────────────

CREATE OR REPLACE FUNCTION execute_takeover(p_response_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer_id BIGINT;
  v_shift_id BIGINT;
  v_offer_volunteer_id BIGINT;
  v_responder_id BIGINT;
BEGIN
  SELECT sor.offer_id, so.shift_id, so.volunteer_id, sor.responder_id
  INTO v_offer_id, v_shift_id, v_offer_volunteer_id, v_responder_id
  FROM shift_offer_responses sor
  JOIN shift_offers so ON so.id = sor.offer_id
  WHERE sor.id = p_response_id AND sor.status = 'pending' AND so.status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Response not found or not in valid state';
  END IF;

  -- Caller must be the offer owner or an admin
  IF NOT EXISTS (
    SELECT 1 FROM volunteers v
    WHERE v.auth_id = auth.uid()
      AND (v.id = v_offer_volunteer_id OR v.is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Not authorized to execute this offer';
  END IF;

  DELETE FROM assignments WHERE shift_id = v_shift_id AND volunteer_id = v_offer_volunteer_id;
  INSERT INTO assignments (shift_id, volunteer_id) VALUES (v_shift_id, v_responder_id);

  UPDATE shift_offer_responses SET status = 'accepted' WHERE id = p_response_id;
  UPDATE shift_offers SET status = 'taken' WHERE id = v_offer_id;
END;
$$;

-- ── Fix 3 & 4: Recreate execute_swap_offer with auth check ───────────────

CREATE OR REPLACE FUNCTION execute_swap_offer(p_response_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer_id BIGINT;
  v_shift_id BIGINT;
  v_offer_volunteer_id BIGINT;
  v_responder_id BIGINT;
  v_swap_shift_id BIGINT;
BEGIN
  SELECT sor.offer_id, so.shift_id, so.volunteer_id, sor.responder_id, sor.swap_shift_id
  INTO v_offer_id, v_shift_id, v_offer_volunteer_id, v_responder_id, v_swap_shift_id
  FROM shift_offer_responses sor
  JOIN shift_offers so ON so.id = sor.offer_id
  WHERE sor.id = p_response_id AND sor.status = 'pending' AND so.status = 'open' AND sor.type = 'swap';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Response not found or not in valid state for swap';
  END IF;

  -- Caller must be the offer owner or an admin
  IF NOT EXISTS (
    SELECT 1 FROM volunteers v
    WHERE v.auth_id = auth.uid()
      AND (v.id = v_offer_volunteer_id OR v.is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Not authorized to execute this swap offer';
  END IF;

  IF v_swap_shift_id IS NULL THEN
    RAISE EXCEPTION 'No swap shift specified';
  END IF;

  DELETE FROM assignments WHERE shift_id = v_shift_id AND volunteer_id = v_offer_volunteer_id;
  DELETE FROM assignments WHERE shift_id = v_swap_shift_id AND volunteer_id = v_responder_id;

  INSERT INTO assignments (shift_id, volunteer_id) VALUES (v_shift_id, v_responder_id);
  INSERT INTO assignments (shift_id, volunteer_id) VALUES (v_swap_shift_id, v_offer_volunteer_id);

  UPDATE shift_offer_responses SET status = 'accepted' WHERE id = p_response_id;
  UPDATE shift_offers SET status = 'taken' WHERE id = v_offer_id;
END;
$$;

-- ── Fix 5: shift_offer_responses — add WITH CHECK + DELETE policy ─────────

DROP POLICY IF EXISTS "Offer owners and admins can update response status" ON shift_offer_responses;
CREATE POLICY "Offer owners and admins can update response status"
  ON shift_offer_responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shift_offers so
      JOIN volunteers v ON v.auth_id = auth.uid()
      WHERE so.id = offer_id AND (so.volunteer_id = v.id OR v.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shift_offers so
      JOIN volunteers v ON v.auth_id = auth.uid()
      WHERE so.id = offer_id AND (so.volunteer_id = v.id OR v.is_admin = true)
    )
  );

CREATE POLICY "Responders can delete own response"
  ON shift_offer_responses FOR DELETE
  TO authenticated
  USING (
    responder_id IN (SELECT id FROM volunteers WHERE auth_id = auth.uid())
    OR is_admin()
  );

-- ── Fix 6: shift_offers INSERT — require actual assignment ────────────────

DROP POLICY IF EXISTS "Volunteers can create their own shift offers" ON shift_offers;
CREATE POLICY "Volunteers can create their own shift offers"
  ON shift_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    volunteer_id IN (SELECT id FROM volunteers WHERE auth_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.shift_id = shift_offers.shift_id
        AND a.volunteer_id = shift_offers.volunteer_id
    )
  );
