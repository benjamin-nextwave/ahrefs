-- Migration: Replace mock data schema with real Ahrefs API data schema
-- Webshops: monthly organic + paid traffic history (12 months)
-- Bouwbedrijven: organic keyword research data

-- Drop old mock-based webshop_metrics table and recreate
DROP TABLE IF EXISTS webshop_metrics;
CREATE TABLE webshop_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  -- Monthly traffic data as JSONB array:
  -- [{date: "2025-03", organic_traffic: 12345, paid_traffic: 6789}, ...]
  traffic_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webshop_metrics_domain ON webshop_metrics(domain_id);
ALTER TABLE webshop_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON webshop_metrics FOR ALL USING (true) WITH CHECK (true);

-- Drop old mock-based bouwbedrijf_metrics table and recreate
DROP TABLE IF EXISTS bouwbedrijf_metrics;
CREATE TABLE bouwbedrijf_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  -- Organic keywords data as JSONB array:
  -- [{keyword: "...", volume: X, traffic: Y, position: Z, difficulty: D}, ...]
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_keywords INTEGER DEFAULT 0,
  total_traffic INTEGER DEFAULT 0,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bouwbedrijf_metrics_domain ON bouwbedrijf_metrics(domain_id);
ALTER TABLE bouwbedrijf_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON bouwbedrijf_metrics FOR ALL USING (true) WITH CHECK (true);
