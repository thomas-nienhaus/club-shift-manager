-- Mark one availability slot as the default extra slot for home games
ALTER TABLE availability_slots ADD COLUMN is_home_game_slot BOOLEAN NOT NULL DEFAULT false;
