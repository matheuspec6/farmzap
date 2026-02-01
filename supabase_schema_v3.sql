-- Supabase Schema V3
-- Changes:
-- 1. Added message_templates table (replacing localStorage)
-- 2. Renamed/Refined structures to support "Canais" (Channels) terminology
-- 3. Added global contacts and tags support (replacing localStorage)
-- 4. Updated campaigns structure to support new scheduling features

-- Reset objects (Safe Drop)
DROP VIEW IF EXISTS campaign_stats;
DROP TABLE IF EXISTS group_leads; -- Deprecated in V3
DROP TABLE IF EXISTS lead_groups; -- Deprecated in V3
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS contact_tags;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS message_templates;
DROP TABLE IF EXISTS channels;
DROP TYPE IF EXISTS lead_status;
DROP TYPE IF EXISTS campaign_status;

-- Enums
DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('rascunho', 'agendado', 'processando', 'concluido', 'falhou', 'cancelado', 'excluido');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('pendente', 'agendado', 'enviado', 'falhou');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Message Templates (Modelos de Mensagem)
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Marketing', -- Marketing, Utilidade, Autenticação
  content TEXT,
  type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'active', -- active, inactive
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_modified TIMESTAMPTZ DEFAULT now(),
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_message_templates_status ON message_templates(status);

-- 2. Channels (Canais - formerly Instances)
-- Optional: Cache for Evolution API instances or local overrides
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- Evolution instance name
  description TEXT,
  status TEXT DEFAULT 'disconnected',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tags (Etiquetas)
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#000000',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Global Contacts (Contatos)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: Contacts <-> Tags
CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

-- 5. Campaigns (Envios)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  message_template TEXT, -- Snapshot of content
  message_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL, -- Reference for history
  settings JSONB, -- Stores split_count, interval, ai_merge, channel selection, etc.
  status campaign_status DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ
);

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_dates_chk;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_dates_chk CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- 6. Leads (Campaign Targets)
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Link to global contact if available
  name TEXT, -- Snapshot name
  phone TEXT, -- Snapshot phone
  custom_fields JSONB,
  status lead_status DEFAULT 'pendente',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_campaign_phone_unique;
ALTER TABLE leads ADD CONSTRAINT leads_campaign_phone_unique UNIQUE (campaign_id, phone);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_status ON leads(campaign_id, status);

-- 7. Stats View
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

-- 8. App Settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
