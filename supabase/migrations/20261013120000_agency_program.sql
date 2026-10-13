-- KINEO-AGENCIAS-2026-10-13 — PROGRAMA DE AGÊNCIAS (fundador 13/10, "tudo sim").
-- NÃO APLICADA: o CEO aplica depois do ok. Sem ela nada quebra:
--   · /api/agencies/apply responde 503 "applications_unavailable" (a página diz para escrever ao suporte);
--   · o webhook trata todo afiliado como criador (Business = 20%, como hoje);
--   · /admin/affiliates mostra "aplicar a migration" no lugar do botão de agência.
--
-- 1) affiliates.partner_type — 'creator' (padrão; TODAS as linhas de hoje) ou 'agency'. Agência ganha 30% na cobrança do
--    plano Business (lib/affiliateCommission.ts businessAffiliateCommissionRate); nenhum outro número muda.
alter table public.affiliates
  add column if not exists partner_type text not null default 'creator';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'affiliates_partner_type_check') then
    alter table public.affiliates
      add constraint affiliates_partner_type_check check (partner_type in ('creator', 'agency'));
  end if;
end $$;

-- 2) agency_applications — inscrições do formulário de /agencies. Escrita SÓ pela rota servidor
--    (app/api/agencies/apply/route.ts, service role, teto por IP e por e-mail). Nenhuma conta é criada.
create table if not exists public.agency_applications (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 120),
  agency        text not null check (char_length(agency) between 2 and 160),
  website       text not null check (char_length(website) between 4 and 300),
  email         text not null check (char_length(email) between 5 and 254 and position('@' in email) > 1),
  client_count  text not null check (client_count in ('1-5', '6-15', '16-40', '40+')),
  note          text check (note is null or char_length(note) <= 1000),
  status        text not null default 'new' check (status in ('new', 'contacted', 'approved', 'rejected')),
  ip_hash       text check (ip_hash is null or char_length(ip_hash) = 64),
  user_agent    text check (user_agent is null or char_length(user_agent) <= 300),
  source        text check (source is null or char_length(source) <= 120),
  notified_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists agency_applications_created on public.agency_applications (created_at desc);
create index if not exists agency_applications_email_created on public.agency_applications (lower(email), created_at desc);
create index if not exists agency_applications_ip_created on public.agency_applications (ip_hash, created_at desc);

-- RLS ligado e SEM policy: anon/authenticated não leem nem escrevem nada. Mesmo padrão da public.events (26/08):
-- privilégio de tabela tirado de PUBLIC/anon/authenticated; service_role só o que a rota e o admin usam.
alter table public.agency_applications enable row level security;
revoke all on table public.agency_applications from public, anon, authenticated;
grant select, insert, update on table public.agency_applications to service_role;
