-- Align legacy booking_history tables with the application schema.
-- Safe to run multiple times (idempotent).

-- Legacy column renames first (before ADD COLUMN)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_history' AND column_name = 'field_changed'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_history' AND column_name = 'field_name'
  ) THEN
    ALTER TABLE booking_history RENAME COLUMN field_changed TO field_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_history' AND column_name = 'updated_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_history' AND column_name = 'changed_by'
  ) THEN
    ALTER TABLE booking_history RENAME COLUMN updated_by TO changed_by;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_history' AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_history' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE booking_history RENAME COLUMN updated_at TO timestamp;
  END IF;
END $$;

-- Add any columns still missing after renames
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS field_name VARCHAR(100);
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS stage_from VARCHAR(50);
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS stage_to VARCHAR(50);
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS action_description TEXT;
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS changed_by VARCHAR(255);
ALTER TABLE booking_history ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE booking_history
SET action_description = COALESCE(action_description, 'History entry')
WHERE action_description IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM booking_history WHERE action_description IS NULL
  ) THEN
    ALTER TABLE booking_history ALTER COLUMN action_description SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM booking_history WHERE changed_by IS NULL
  ) THEN
    ALTER TABLE booking_history ALTER COLUMN changed_by SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_history_booking_id ON booking_history (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_timestamp ON booking_history (timestamp DESC);
