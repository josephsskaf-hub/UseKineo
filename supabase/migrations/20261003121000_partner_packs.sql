-- KINEO-PARTNERS-PACOTE-2026-10-03 — pacote de demonstração do parceiro (regra em lib/partnerPack.ts, escritas em
-- lib/partnerPackStore.ts). NÃO APLICADA: o CEO aplica depois do ok, e DEPOIS de 20261003120000_courtesy_grants.
-- Sem esta tabela o painel do afiliado e a lista de parceiros mostram "pacote indisponível" e nada quebra.
--
-- Uma linha por afiliado (unique): 1 pacote por afiliado, para sempre. Os créditos moram na cortesia
-- (courtesy_grants, source = 'partner_pack'); aqui ficam as etapas e o link do post público que o admin confere.

create table if not exists public.partner_packs (
  id                 uuid primary key default gen_random_uuid(),
  affiliate_id       uuid not null unique references public.affiliates(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  courtesy_grant_id  uuid references public.courtesy_grants(id) on delete set null,
  stage1_at          timestamptz,
  post_url           text check (post_url is null or (char_length(post_url) <= 500 and post_url like 'https://%')),
  post_status        text not null default 'none' check (post_status in ('none', 'pending', 'approved', 'rejected')),
  post_submitted_at  timestamptz,
  post_reviewed_at   timestamptz,
  post_reviewed_by   text,
  stage2_at          timestamptz,
  granted_by         text not null,
  created_at         timestamptz not null default now()
);

create index if not exists partner_packs_post_pending on public.partner_packs (post_submitted_at) where post_status = 'pending';

alter table public.partner_packs enable row level security;
