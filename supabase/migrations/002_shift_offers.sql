-- Migration: shift offers and responses

CREATE TABLE shift_offers (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  volunteer_id BIGINT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'taken', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shift_id, volunteer_id)
);

CREATE TABLE shift_offer_responses (
  id BIGSERIAL PRIMARY KEY,
  offer_id BIGINT NOT NULL REFERENCES shift_offers(id) ON DELETE CASCADE,
  responder_id BIGINT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('takeover', 'swap')),
  swap_shift_id BIGINT REFERENCES shifts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: shift_offers
ALTER TABLE shift_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all shift offers"
  ON shift_offers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Volunteers can create their own shift offers"
  ON shift_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    volunteer_id IN (
      SELECT id FROM volunteers WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Volunteers can cancel their own shift offers"
  ON shift_offers FOR UPDATE
  TO authenticated
  USING (
    volunteer_id IN (
      SELECT id FROM volunteers WHERE auth_id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM volunteers WHERE auth_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete shift offers"
  ON shift_offers FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM volunteers WHERE auth_id = auth.uid() AND is_admin = true)
  );

-- RLS: shift_offer_responses
ALTER TABLE shift_offer_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all shift offer responses"
  ON shift_offer_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Volunteers can create shift offer responses"
  ON shift_offer_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    responder_id IN (
      SELECT id FROM volunteers WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Offer owners and admins can update response status"
  ON shift_offer_responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shift_offers so
      JOIN volunteers v ON v.auth_id = auth.uid()
      WHERE so.id = offer_id AND (so.volunteer_id = v.id OR v.is_admin = true)
    )
  );

-- Function: execute_takeover
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

  DELETE FROM assignments WHERE shift_id = v_shift_id AND volunteer_id = v_offer_volunteer_id;
  INSERT INTO assignments (shift_id, volunteer_id) VALUES (v_shift_id, v_responder_id);

  UPDATE shift_offer_responses SET status = 'accepted' WHERE id = p_response_id;
  UPDATE shift_offers SET status = 'taken' WHERE id = v_offer_id;
END;
$$;

-- Function: execute_swap_offer
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
