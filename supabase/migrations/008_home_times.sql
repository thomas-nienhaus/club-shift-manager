-- Migration: add home game time overrides to availability_slots
-- Allows each shift type to have different start/end times for home game days

ALTER TABLE availability_slots
  ADD COLUMN home_start_time TIME,
  ADD COLUMN home_end_time TIME;
