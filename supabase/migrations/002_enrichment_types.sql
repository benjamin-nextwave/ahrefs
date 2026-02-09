-- Add enrichment type to scan_jobs
ALTER TABLE scan_jobs ADD COLUMN enrichment_type TEXT DEFAULT 'webshop'
  CHECK (enrichment_type IN ('webshop', 'bouwbedrijf'));

-- Webshop metrics: organic & paid data across time periods
CREATE TABLE webshop_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  -- Organic keywords
  organic_keywords_current INTEGER,
  organic_keywords_3m INTEGER,
  organic_keywords_6m INTEGER,
  organic_keywords_12m INTEGER,
  organic_keywords_24m INTEGER,
  -- Organic traffic
  organic_traffic_current INTEGER,
  organic_traffic_3m INTEGER,
  organic_traffic_6m INTEGER,
  organic_traffic_12m INTEGER,
  organic_traffic_24m INTEGER,
  -- Paid keywords
  paid_keywords_current INTEGER,
  paid_keywords_3m INTEGER,
  paid_keywords_6m INTEGER,
  paid_keywords_12m INTEGER,
  paid_keywords_24m INTEGER,
  -- Paid traffic
  paid_traffic_current INTEGER,
  paid_traffic_3m INTEGER,
  paid_traffic_6m INTEGER,
  paid_traffic_12m INTEGER,
  paid_traffic_24m INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bouwbedrijf metrics: competitor + content gap analysis
CREATE TABLE bouwbedrijf_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  top_competitor TEXT,
  top_competitor_traffic INTEGER,
  top_competitor_ads_keywords INTEGER,
  achievable_traffic INTEGER,
  content_gap_count INTEGER,
  content_gap_keywords JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webshop_metrics_domain ON webshop_metrics(domain_id);
CREATE INDEX idx_bouwbedrijf_metrics_domain ON bouwbedrijf_metrics(domain_id);

-- RLS (same open pattern as existing tables)
ALTER TABLE webshop_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouwbedrijf_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON webshop_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON bouwbedrijf_metrics FOR ALL USING (true) WITH CHECK (true);
