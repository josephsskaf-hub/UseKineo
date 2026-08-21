-- KINEO-DEMO-RENDER-2026-08-21
-- Já APLICADA em produção (Supabase MCP, 21/08). Versionada aqui pelo mesmo
-- motivo da post_rewards: schema que só existe no banco não é reproduzível, e
-- a rota /api/admin/demo-render depende dela para não devolver 500 mudo.
--
-- POR QUE EXISTE: para recrutar criador de afiliado a jogada é mandar um FILME
-- PRONTO no nicho dele em vez de um pedido ("testa minha ferramenta"). Isso é
-- vários filmes por semana, e clicar no site não escala. O Autopilot, que já
-- gera sozinho, só usa o motor RÁPIDO — justamente o que não impressiona.
--
-- E POR QUE UMA FILA, E NÃO UMA CHAMADA DIRETA: a rota exige CRON_SECRET, que
-- eu não tenho e que não deve ser colado em conversa (segredo em chat vaza,
-- fica no histórico e não se revoga). Quem ENFILEIRA aqui é o service_role;
-- quem EXECUTA é o cron da Vercel, que recebe o segredo injetado pela própria
-- plataforma. O segredo nunca sai de dentro da infra.
--
-- É uma MÁQUINA DE ESTADOS porque um clipe de IA demora minutos e a lambda
-- morre em 300s. Cada passada do cron avança UM estágio:
--   queued -> submitted (clipes pedidos à fal) -> composing (render montando)
--          -> done | failed
create table if not exists public.demo_render_jobs (
  id uuid primary key default gen_random_uuid(),
  target_name text not null,           -- para quem é a demo (ex.: "Solopreneur")
  account_email text not null,         -- conta que paga o crédito e recebe o vídeo
  prompt text not null,
  engine text not null default 'cinematic',
  duration int not null default 60,
  status text not null default 'queued',
  generation_id text,
  fal_request_ids jsonb,
  fal_model text,
  fal_models jsonb,
  voiceover_script text,
  scene_captions jsonb,
  verbatim boolean default false,
  speed numeric,
  render_id text,
  video_url text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ⚠ `engine` (o que se PEDE ao motor: 'hollywood', 'h3', 'kling') e `quality`
-- (o que o COMPOSE cobra: 'cinematic_hollywood', 'cinematic_h3') são
-- vocabulários DIFERENTES. Passar um no lugar do outro faria o compose recusar
-- o render DEPOIS de o crédito já ter sido debitado — exatamente o bug de
-- 20/08 com os tiers de 35s/90s. Esta coluna guarda o `quality` que o PRÓPRIO
-- servidor devolveu na submissão, então nunca há tradução adivinhada.
alter table public.demo_render_jobs add column if not exists quality text;

create index if not exists demo_render_jobs_status_idx
  on public.demo_render_jobs (status, created_at);

-- Deny-all: só o service_role toca. Nenhum usuário final tem motivo para ler
-- ou escrever aqui, e um job carrega o e-mail da conta que será debitada.
alter table public.demo_render_jobs enable row level security;
