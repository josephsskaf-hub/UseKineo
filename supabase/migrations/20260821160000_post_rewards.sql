-- KINEO-CREDITO-POR-POSTAR-2026-08-21
-- Já APLICADA em produção (Supabase MCP, 21/08). Este arquivo existe para que o
-- schema seja reproduzível a partir do repositório — a auditoria pegou a falta
-- dele: sem migração versionada, um ambiente novo sobe sem a tabela e a rota
-- /api/post-reward devolve 500 em silêncio, com os três guardas inexistentes.
--
-- POR QUE A TABELA EXISTE: todo filme do free tier sai com `usekineo.com/free`
-- QUEIMADO no vídeo. Isso já é um outdoor que a gente entrega de graça e nunca
-- cobra. Aqui a marca d'água deixa de ser só uma trava de conversão e passa a
-- comprar distribuição: postou, colou o link, ganha crédito.
--
-- ANTI-ABUSO, dito na cara: não dá para PROVAR que o vídeo publicado é o nosso
-- sem baixar o post e comparar quadros, e isso não vale o custo. Os índices
-- abaixo são de CONTENÇÃO, não de prova. O pior caso é alguém colar links
-- plausíveis até o teto por conta — e o teto É o orçamento máximo do abuso.
create table if not exists public.post_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid,
  url text not null,
  platform text not null,
  credits_granted int not null,
  created_at timestamptz not null default now()
);

-- A URL é o identificador natural do post, e o índice é ÚNICO NO SISTEMA
-- INTEIRO, não por usuário: duas contas colando o mesmo link é o abuso mais
-- óbvio que existe. A rota normaliza (tira query string) antes de gravar, senão
-- `?si=`/`?utm_` transformariam o mesmo post em N posts diferentes.
create unique index if not exists post_rewards_url_key on public.post_rewards (lower(url));

-- Um prêmio por filme. Parcial porque `video_id` pode ser nulo (reivindicação
-- sem vídeo associado) e nulos não colidem em índice único.
create unique index if not exists post_rewards_video_key
  on public.post_rewards (user_id, video_id) where video_id is not null;

create index if not exists post_rewards_user_idx on public.post_rewards (user_id, created_at desc);

alter table public.post_rewards enable row level security;

-- O dono lê os próprios prêmios. Escrita é SÓ do service_role: conceder crédito
-- nunca pode partir do cliente.
drop policy if exists post_rewards_select_own on public.post_rewards;
create policy post_rewards_select_own on public.post_rewards
  for select using (auth.uid() = user_id);
