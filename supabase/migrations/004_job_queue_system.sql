-- Add 'queued' status support for scan_jobs
-- Jobs beyond the 2 active concurrent limit will be queued
-- No constraint change needed since status is TEXT, but adding a comment for clarity

COMMENT ON COLUMN scan_jobs.status IS 'Job status: pending (active, waiting to run), running (actively scraping), completed, failed, queued (waiting for an active slot)';
