-- KINEO-ADS-POS-ENTREGA-1510 — o que a agência faz DEPOIS da entrega do anúncio v2: VERSÕES (edição rápida e 9:16 + 4:5 + 1:1,
-- montadas de novo no Creatomate com os MESMOS clipes — nada volta à fal) e APROVAÇÃO do cliente (link privado assinado, sem login).
--
-- ⚠️ NÃO APLICADA. A sessão principal aplica. Até lá as rotas /api/ads/v2/edit|versions|formats|approval respondem 503 'not_ready'
-- (ou lista vazia) via isMissingPosEntregaTable, nunca 500, e o anúncio de sempre segue intocado. Idempotente: create ... if not
-- exists / drop trigger if exists. NÃO toca em ads_v2_orders, ads_v2_shots, videos, credit_debits nem em nada de dinheiro.
--
-- Código que lê estes nomes: lib/ads/v2PostDeliveryServer.ts (ADS_V2_VERSION_COLS, ADS_V2_APPROVAL_COLS),
-- lib/ads/v2PostDelivery.ts (formatos, estados, limites). Guardião: scripts/test-ads-pos-entrega-1510.mjs.

create table if not exists public.ads_v2_versions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ads_v2_orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- v1 é a entrega original (ads_v2_orders.video_id); cada edição/formato é v2, v3…
  version integer not null check (version >= 2),
  kind text not null check (kind in ('edit', 'format')),
  format text not null default '9:16' check (format in ('9:16', '4:5', '1:1')),
  base_version_id uuid references public.ads_v2_versions (id) on delete set null,
  -- Os formatos pedidos juntos ("Get 9:16 + 4:5 + 1:1") dividem o mesmo batch_id.
  batch_id uuid,
  -- A edição aplicada: { overlays: text[]|null, cardUrl: text|null, music: 'keep'|'none'|faixa, order: int[]|null }.
  edits jsonb not null default '{}'::jsonb,
  status text not null default 'rendering' check (status in ('rendering', 'delivered', 'failed')),
  -- Hoje sempre 0 (ADS_V2_EDIT_CREDITS): a montagem de edição sai grátis. Nenhuma rota debita por esta tabela.
  credits_charged integer not null default 0 check (credits_charged >= 0),
  creatomate_render_id text,
  -- Carimbo gravado ANTES do POST ao Creatomate: com ele e sem creatomate_render_id o envio é AMBÍGUO e nunca é repetido.
  submit_at timestamptz,
  video_id uuid,
  video_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  failed_at timestamptz,
  unique (order_id, version)
);

comment on table public.ads_v2_versions is
  'KINEO-ADS-POS-ENTREGA-1510 — versões de um anúncio v2 entregue (edição sem gerar de novo; 9:16/4:5/1:1). Cada versão pronta também tem uma linha em videos (render_id adsv2edit-<id>). Escrita só pelo servidor (service role).';

create index if not exists ads_v2_versions_order_idx on public.ads_v2_versions (order_id, version);
create index if not exists ads_v2_versions_rendering_idx on public.ads_v2_versions (user_id, status) where status = 'rendering';

create table if not exists public.ads_v2_approvals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ads_v2_orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- null = o vídeo da entrega original; senão uma versão pronta.
  version_id uuid references public.ads_v2_versions (id) on delete set null,
  video_id uuid not null,
  -- sha256 do token do link (lib/ads/v2ApprovalToken.ts). O token em si nunca é gravado.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- Cópia do MP4 em renders/share/<aleatório>.mp4: o caminho de sempre carrega o id da conta.
  share_video_url text not null,
  -- O ÚNICO dado da agência que a página pública mostra.
  brand_name text not null check (char_length(brand_name) between 1 and 60),
  lang text not null default 'en',
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'revoked')),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  viewed_at timestamptz,
  decided_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null
);

comment on table public.ads_v2_approvals is
  'KINEO-ADS-POS-ENTREGA-1510 — link de aprovação do cliente da agência (sem login). Uma decisão por link (pending → approved | changes_requested). Escrita só pelo servidor (service role).';

create index if not exists ads_v2_approvals_user_created_idx on public.ads_v2_approvals (user_id, created_at desc);
create index if not exists ads_v2_approvals_order_idx on public.ads_v2_approvals (order_id);

-- Mesma postura de ads_v2_orders/ads_v2_shots: RLS ligado e NENHUMA policy; as rotas usam a service key depois de conferir o dono.
alter table public.ads_v2_versions enable row level security;
alter table public.ads_v2_approvals enable row level security;
revoke all on table public.ads_v2_versions from anon, authenticated;
revoke all on table public.ads_v2_approvals from anon, authenticated;

-- updated_at pela MESMA função das tabelas do v2 (migrations_pending/2026-09-29_ads_v2.sql).
drop trigger if exists ads_v2_versions_touch_updated_at on public.ads_v2_versions;
create trigger ads_v2_versions_touch_updated_at
  before update on public.ads_v2_versions
  for each row execute function public.ads_v2_touch_updated_at();

drop trigger if exists ads_v2_approvals_touch_updated_at on public.ads_v2_approvals;
create trigger ads_v2_approvals_touch_updated_at
  before update on public.ads_v2_approvals
  for each row execute function public.ads_v2_touch_updated_at();
