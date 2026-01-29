-- Reset completo: derruba objetos em ordem segura
DROP VIEW IF EXISTS campaign_stats;
DROP TABLE IF EXISTS group_leads;
DROP TABLE IF EXISTS lead_groups;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS campaigns;
DROP TYPE IF EXISTS lead_status;
DROP TYPE IF EXISTS campaign_status;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('rascunho','agendado','processando','concluido','falhou','cancelado','excluido');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('pendente','agendado','enviado','falhou');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  message_template TEXT,
  settings JSONB,
  status campaign_status DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ
);

DO $$ BEGIN
  ALTER TABLE campaigns
    ALTER COLUMN status TYPE campaign_status USING status::campaign_status;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE IF EXISTS campaigns
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS campaigns
  ADD CONSTRAINT campaigns_dates_chk CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  custom_fields JSONB,
  status lead_status DEFAULT 'pendente',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads
  ADD CONSTRAINT leads_campaign_phone_unique UNIQUE (campaign_id, phone);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_status ON leads(campaign_id, status);

CREATE OR REPLACE VIEW campaign_stats AS
SELECT
  c.id AS campaign_id,
  COUNT(l.id) AS total_leads,
  SUM(CASE WHEN l.status::text IN ('pendente','pending') THEN 1 ELSE 0 END) AS pending_count,
  SUM(CASE WHEN l.status::text IN ('agendado','scheduled') THEN 1 ELSE 0 END) AS scheduled_count,
  SUM(CASE WHEN l.status::text IN ('enviado','sent') THEN 1 ELSE 0 END) AS sent_count,
  SUM(CASE WHEN l.status::text IN ('falhou','failed') THEN 1 ELSE 0 END) AS failed_count
FROM campaigns c
LEFT JOIN leads l ON l.campaign_id = c.id
GROUP BY c.id;

CREATE TABLE IF NOT EXISTS lead_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES lead_groups(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  custom_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE group_leads
  ADD CONSTRAINT group_leads_unique_phone UNIQUE (group_id, phone);

CREATE INDEX IF NOT EXISTS idx_group_leads_group_id ON group_leads(group_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
