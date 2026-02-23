-- Backfill: Add initial "Pending" status for applications that have no status row.
-- Run once if you have existing applications that don't show in staff/admin pending list.
-- Example: psql -U postgres -d gpmsdb -f backfill_application_status.sql

INSERT INTO application_status_tbl (status, date, application_id, processed_by)
SELECT
    'Pending',
    COALESCE(a.date::date, CURRENT_DATE),
    a.application_id,
    NULL
FROM applications_tbl a
WHERE NOT EXISTS (
    SELECT 1 FROM application_status_tbl s
    WHERE s.application_id = a.application_id
);
