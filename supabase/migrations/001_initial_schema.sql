-- scan_jobs: Container for domain scan batches
CREATE TABLE scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  total_domains INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- domains: Individual domains to scan
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scan_jobs(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- domain_metrics: Ahrefs data per domain
CREATE TABLE domain_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  dr INTEGER,                    -- Domain Rating
  traffic INTEGER,               -- Organic traffic
  refdomains INTEGER,            -- Referring domains
  backlinks INTEGER,             -- Total backlinks
  keywords INTEGER,              -- Ranking keywords
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_domains_scheduled ON domains(scheduled_date, status);
CREATE INDEX idx_domains_job ON domains(job_id);

-- No RLS (single-user app) - disable to allow public access
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_metrics ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth)
CREATE POLICY "Allow all" ON scan_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON domains FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON domain_metrics FOR ALL USING (true) WITH CHECK (true);
