-- Legacy Firebase / manual schemas often used UUID for booking_history.booking_id.
-- The application uses bookings.id SERIAL (INTEGER).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_history'
      AND column_name = 'booking_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE booking_history DROP CONSTRAINT IF EXISTS booking_history_booking_id_fkey;

    -- UUID history rows cannot be mapped to integer booking ids
    TRUNCATE booking_history;

    ALTER TABLE booking_history DROP COLUMN booking_id;
    ALTER TABLE booking_history ADD COLUMN booking_id INTEGER NOT NULL;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'bookings'
    ) THEN
      ALTER TABLE booking_history
        ADD CONSTRAINT booking_history_booking_id_fkey
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_history_booking_id ON booking_history (booking_id);
