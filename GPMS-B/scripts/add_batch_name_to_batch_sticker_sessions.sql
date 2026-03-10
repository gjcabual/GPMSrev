-- Add batch_name support for existing databases
ALTER TABLE batch_sticker_sessions_tbl
ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100);

-- Backfill old rows so UI can display a value
UPDATE batch_sticker_sessions_tbl
SET batch_name = COALESCE(NULLIF(TRIM(batch_name), ''), 'Legacy Batch');

