-- Seed data for Kantine Planner
-- Run AFTER creating the schema. Replace placeholder emails before running.
--
-- Auth users must be created separately via the Supabase dashboard or API.
-- After creating an auth user, update the volunteer's auth_id:
--   UPDATE volunteers SET auth_id = '<uuid from auth.users>' WHERE email = 'admin@example.nl';

-- Availability slots
INSERT INTO availability_slots (key, label, sort_order, is_active, start_time, end_time) VALUES
  ('wednesday_evening',  'Woensdagavond',   1, true,  NULL,    NULL),
  ('thursday_evening',   'Donderdagavond',  2, true,  NULL,    NULL),
  ('saturday_morning',   'Zaterdagochtend', 3, true,  '09:00', '13:00'),
  ('saturday_afternoon', 'Zaterdagmiddag',  4, true,  '13:00', '17:00'),
  ('sunday_morning',     'Zondagochtend',   5, true,  NULL,    NULL),
  ('sunday_afternoon',   'Zondagmiddag',    6, true,  NULL,    NULL),
  ('friday_evening',     'Vrijdagavond',    7, true,  NULL,    NULL);

-- Admin volunteer (create a matching auth user via Supabase dashboard with this email)
INSERT INTO volunteers (name, email, is_admin) VALUES
  ('Admin', 'admin@example.nl', true);
