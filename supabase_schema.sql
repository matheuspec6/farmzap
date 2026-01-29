-- Tabela para armazenar as campanhas/envios
create table campaigns (
  id uuid default gen_random_uuid() primary key,
  name text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  message_template text,
  settings jsonb, -- armazena configurações como split_count, message_interval
  status text default 'draft', -- draft, scheduled, processing, completed, failed
  created_at timestamp with time zone default now()
);

-- Tabela para armazenar os leads de cada campanha
-- Isso substitui a ideia de "tabela por envio" por uma abordagem mais escalável e segura
-- onde usamos o campaign_id para segregar os dados.
create table leads (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) on delete cascade,
  name text,
  phone text,
  custom_fields jsonb, -- armazena todos os outros campos da planilha original
  status text default 'pending', -- pending, sent, failed
  created_at timestamp with time zone default now()
);

-- Índices para performance
create index idx_leads_campaign_id on leads(campaign_id);
create index idx_leads_status on leads(status);

-- Configurar Row Level Security (RLS) se necessário
-- alter table campaigns enable row level security;
-- alter table leads enable row level security;
