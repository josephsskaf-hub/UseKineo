-- KINEO-REVIVE-2026-07-26 — a mesa de dados da campanha REVIVE.
--
-- POR QUE ISSO EXISTE (o número, não a opinião):
--   713 signups, 3 pagantes na vida inteira, 0 canais do YouTube conectados.
--   A base atual é free-tier de um vídeo só; ela NÃO é o comprador do Autopilot
--   de $299/mês. O comprador está fora: canal de Shorts com 1k–50k inscritos,
--   nos nichos que o Kineo já renderiza bem (mystery, history, geography,
--   curiosity, finance-facts — ~70% dos briefs que já estão na tabela `videos`),
--   cujo ÚLTIMO UPLOAD foi há 30–120 dias. Essa pessoa provou demanda (montou o
--   canal), provou a dor (parou de exaustão) e tem NÚMEROS que dá pra repetir
--   de volta pra ela.
--
--   A jogada não é pitch, é ENTREGA: geramos 3 Shorts no estilo exato do canal
--   (3 renders Fast ≈ centavos) e hospedamos numa página por prospect em
--   usekineo.com/revive/<handle>. Esta tabela é o que essa página lê.
--
-- ⚠️ NÃO APLICADA. Enquanto não rodar no Supabase:
--      • /revive/<handle> renderiza a tela neutra "temporarily unavailable"
--        (noindex, 200) para TODO handle — de propósito: a função de leitura não
--        existe, o helper classifica como `unavailable` e NÃO como `missing`,
--        porque 404 em todo handle esconderia um problema de deploy atrás de uma
--        resposta que parece normal;
--      • POST /api/revive responde 500 e loga o erro da RPC ausente;
--      • nada mais no produto muda — nenhuma tabela existente é reescrita.
--
-- IDEMPOTENTE DE PONTA A PONTA (`create table if not exists`, `add column if
-- not exists`, `create or replace function`, `drop policy if exists` antes de
-- `create policy`). Mesmo motivo registrado nas migrations 020 e 021:
-- supabase/migrations DIVERGE da produção porque várias colunas foram
-- aplicadas à mão. Esta migration precisa poder rodar N vezes sem erro.
--
-- NUMERAÇÃO: a última em supabase/migrations é 021_autopilot.sql, então esta é
-- a 022. Depois de aplicada, mova o arquivo para supabase/migrations/.

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. PRÉ-REQUISITO DEFENSIVO em public.videos
-- ═══════════════════════════════════════════════════════════════════════════
-- A função revive_prospect_public() lá embaixo lê title, final_video_url e
-- thumbnail_url de `videos`. Em PRODUÇÃO as três já existem — lib/publicVideos.ts
-- (PUBLIC_VIDEO_COLUMNS = 'id, title, video_url, final_video_url, thumbnail_url,
-- ...') as seleciona hoje em /v/[id] e no video-sitemap, que estão no ar. Mas
-- supabase/migrations/004_videos_history.sql só garante thumbnail_url; title e
-- final_video_url foram adicionadas à mão. Sem estas três linhas a migration
-- QUEBRA num banco limpo (staging/branch) na hora de compilar a função — SQL
-- function tem o corpo validado no CREATE. São `add column if not exists`:
-- no-op absoluto em produção, e não tocam em uma única linha de dado.
alter table public.videos add column if not exists title           text;
alter table public.videos add column if not exists final_video_url text;
alter table public.videos add column if not exists thumbnail_url   text;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. public.revive_prospects — uma linha por canal abordado.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.revive_prospects (
  id                   uuid primary key default gen_random_uuid(),

  -- ── A CHAVE DA PÁGINA ────────────────────────────────────────────────────
  -- `handle` é o handle do YouTube SEM o '@', normalizado para minúsculas.
  -- É a chave da URL (/revive/<handle>) e a chave de idempotência do batch de
  -- outbound: o mesmo canal abordado duas vezes tem que virar UPDATE, nunca uma
  -- segunda linha (e nunca uma segunda página com os mesmos 3 vídeos).
  handle               text not null,

  -- ── O ESPELHO (tudo que a página mostra de volta pro prospect) ───────────
  channel_title        text not null,
  channel_url          text,
  subscriber_count     integer check (subscriber_count is null or subscriber_count >= 0),
  -- Data do último upload. É DAQUI que a página calcula "há N dias" em tempo de
  -- render, e não de days_dormant: a página vive semanas depois do dia em que o
  -- scanner rodou, e um número congelado envelheceria mentindo. days_dormant
  -- fica como o valor no momento da coleta (auditoria + fallback quando o
  -- scanner só conseguiu o "há X dias" da API e não a data exata).
  last_upload_at       date,
  days_dormant         integer check (days_dormant is null or days_dormant >= 0),
  -- Nicho detectado. TEXT livre de propósito: um CHECK com a lista fechada de
  -- hoje (mystery/history/geography/curiosity/finance_facts) faria o batch de
  -- 200 canais/semana estourar 23514 no primeiro nicho novo, e perder o
  -- prospect é mais caro que aceitar uma string fora da lista.
  niche                text,

  -- ── OS 3 EPISÓDIOS JÁ FEITOS ─────────────────────────────────────────────
  -- REUSO, não blob: são FKs para public.videos, a mesma tabela que /v/[id] e o
  -- video-sitemap já leem. Guardar URL/título aqui criaria uma segunda verdade
  -- que sai de sincronia no instante em que o render for refeito.
  -- `on delete set null` e não `cascade`: apagar um vídeo NÃO pode apagar o
  -- prospect junto com o histórico de view/click dele.
  video_1_id           uuid references public.videos(id) on delete set null,
  video_2_id           uuid references public.videos(id) on delete set null,
  video_3_id           uuid references public.videos(id) on delete set null,

  -- ── OPERAÇÃO (INTERNO — nunca sai na leitura pública, ver §4) ────────────
  contact_email        text,
  outreach_sent_at     timestamptz,
  notes                text,

  -- ── OUTCOME TRACKING ─────────────────────────────────────────────────────
  -- 504 códigos de referral produzindo 1 uso foi o que aconteceu da última vez
  -- que a gente não mediu. Sem view→click esta campanha é inauditável.
  page_first_viewed_at timestamptz,
  page_last_viewed_at  timestamptz,
  page_view_count      integer not null default 0,
  cta_first_clicked_at timestamptz,
  cta_last_clicked_at  timestamptz,
  cta_click_count      integer not null default 0,
  converted_at         timestamptz,
  converted_user_id    uuid references auth.users(id) on delete set null,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Tolerante a uma versão anterior da tabela já existir (mesma defensiva da 020/021).
alter table public.revive_prospects add column if not exists channel_url          text;
alter table public.revive_prospects add column if not exists subscriber_count     integer;
alter table public.revive_prospects add column if not exists last_upload_at       date;
alter table public.revive_prospects add column if not exists days_dormant         integer;
alter table public.revive_prospects add column if not exists niche                text;
alter table public.revive_prospects add column if not exists video_1_id           uuid;
alter table public.revive_prospects add column if not exists video_2_id           uuid;
alter table public.revive_prospects add column if not exists video_3_id           uuid;
alter table public.revive_prospects add column if not exists contact_email        text;
alter table public.revive_prospects add column if not exists outreach_sent_at     timestamptz;
alter table public.revive_prospects add column if not exists notes                text;
alter table public.revive_prospects add column if not exists page_first_viewed_at timestamptz;
alter table public.revive_prospects add column if not exists page_last_viewed_at  timestamptz;
alter table public.revive_prospects add column if not exists page_view_count      integer not null default 0;
alter table public.revive_prospects add column if not exists cta_first_clicked_at timestamptz;
alter table public.revive_prospects add column if not exists cta_last_clicked_at  timestamptz;
alter table public.revive_prospects add column if not exists cta_click_count      integer not null default 0;
alter table public.revive_prospects add column if not exists converted_at         timestamptz;
alter table public.revive_prospects add column if not exists converted_user_id    uuid;
alter table public.revive_prospects add column if not exists created_at           timestamptz not null default now();
alter table public.revive_prospects add column if not exists updated_at           timestamptz not null default now();

-- `converted` como coluna GERADA e não booleano solto: um boolean paralelo a
-- converted_at sai de sincronia na primeira vez que alguém corrigir só um dos
-- dois na mão, e aí a métrica da campanha inteira mente.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'revive_prospects' and column_name = 'converted'
  ) then
    alter table public.revive_prospects
      add column converted boolean generated always as (converted_at is not null) stored;
  end if;
end
$$;

-- ── CONSTRAINTS ────────────────────────────────────────────────────────────
do $$
begin
  -- O handle É a URL. Se não for URL-safe, a rota não bate e a página é 404
  -- silenciosa; se não for lowercase, "@MysteryFiles" e "@mysteryfiles" viram
  -- duas linhas e o mesmo canal recebe dois emails com dois conjuntos de
  -- vídeos. O CHECK é o que torna a unique lá embaixo realmente
  -- case-insensitive, sem precisar de índice em expressão.
  if not exists (
    select 1 from pg_constraint
    where conname = 'revive_prospects_handle_urlsafe' and conrelid = 'public.revive_prospects'::regclass
  ) then
    alter table public.revive_prospects
      add constraint revive_prospects_handle_urlsafe
      check (handle = lower(handle) and handle ~ '^[a-z0-9][a-z0-9._-]{1,59}$');
  end if;

  -- Três vezes o MESMO vídeo na página é o oposto de "3 próximos episódios" —
  -- destrói a única coisa que a página tem a oferecer. `is distinct from`
  -- para que slots ainda vazios (NULL) não disparem o check.
  if not exists (
    select 1 from pg_constraint
    where conname = 'revive_prospects_distinct_videos' and conrelid = 'public.revive_prospects'::regclass
  ) then
    alter table public.revive_prospects
      add constraint revive_prospects_distinct_videos
      check (
        (video_1_id is null or video_1_id is distinct from video_2_id)
        and (video_1_id is null or video_1_id is distinct from video_3_id)
        and (video_2_id is null or video_2_id is distinct from video_3_id)
      );
  end if;

  -- Chave de idempotência do batch de outbound.
  if not exists (
    select 1 from pg_constraint
    where conname = 'revive_prospects_handle_key' and conrelid = 'public.revive_prospects'::regclass
  ) then
    alter table public.revive_prospects add constraint revive_prospects_handle_key unique (handle);
  end if;

  -- FKs, para o caso da tabela ter nascido sem elas numa forma anterior.
  if not exists (
    select 1 from pg_constraint
    where conname = 'revive_prospects_video_1_id_fkey' and conrelid = 'public.revive_prospects'::regclass
  ) then
    alter table public.revive_prospects
      add constraint revive_prospects_video_1_id_fkey foreign key (video_1_id)
      references public.videos(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'revive_prospects_video_2_id_fkey' and conrelid = 'public.revive_prospects'::regclass
  ) then
    alter table public.revive_prospects
      add constraint revive_prospects_video_2_id_fkey foreign key (video_2_id)
      references public.videos(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'revive_prospects_video_3_id_fkey' and conrelid = 'public.revive_prospects'::regclass
  ) then
    alter table public.revive_prospects
      add constraint revive_prospects_video_3_id_fkey foreign key (video_3_id)
      references public.videos(id) on delete set null;
  end if;
end
$$;

-- ── ÍNDICES ────────────────────────────────────────────────────────────────
-- A unique de handle já cobre o lookup da página (é o único acesso quente).
-- Os dois abaixo servem o relatório da campanha, que é a razão de existir do
-- outcome tracking.
create index if not exists revive_prospects_created_idx
  on public.revive_prospects (created_at desc);

-- Parcial: o funil view→click só olha quem JÁ viu. Índice cheio numa coluna
-- majoritariamente NULL seria desperdício.
create index if not exists revive_prospects_viewed_idx
  on public.revive_prospects (page_first_viewed_at desc)
  where page_first_viewed_at is not null;

-- Fila do batch de envio: quem tem os 3 vídeos prontos e ainda não foi contatado.
create index if not exists revive_prospects_unsent_idx
  on public.revive_prospects (created_at)
  where outreach_sent_at is null;

-- ── updated_at ─────────────────────────────────────────────────────────────
-- Reusa o helper genérico criado na migration 001 (mesmo padrão da 004). O
-- guard existe porque um banco novo pode não ter rodado a 001 ainda.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at') then
    drop trigger if exists set_revive_prospects_updated_at on public.revive_prospects;
    create trigger set_revive_prospects_updated_at
      before update on public.revive_prospects
      for each row execute procedure update_updated_at();
  end if;
end
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS — o abuso óbvio e como ele morre.
-- ═══════════════════════════════════════════════════════════════════════════
-- A URL é ADIVINHÁVEL: /revive/<handle> onde <handle> é um handle público do
-- YouTube. Logo, "a página é pública" é obrigatório. Mas a tentação é resolver
-- isso com uma policy `for select using (true)` para o role `anon` — e isso
-- seria um vazamento grave, porque o PostgREST fica exposto no mesmo host:
--
--   GET /rest/v1/revive_prospects?select=*
--     → a LISTA INTEIRA de prospects (nossa pesquisa de mercado),
--       contact_email de todo mundo (PII de gente que nunca nos deu o email),
--       e as colunas de outcome (quem abriu, quem clicou, quem converteu).
--
-- Então NÃO existe policy de select nesta tabela. RLS ligada + zero policies =
-- anon e authenticated não leem NADA da tabela, exatamente como click_events
-- (migration 008). O acesso público acontece SÓ pela função da §4, que recebe
-- UM handle e devolve UMA linha projetada.
alter table public.revive_prospects enable row level security;

-- Explícito > implícito: a policy nomeada documenta a decisão e sobrevive a
-- alguém rodar um "enable RLS" genérico depois.
drop policy if exists "revive_no_public_read" on public.revive_prospects;
create policy "revive_no_public_read" on public.revive_prospects for select using (false);

-- Sem policy de INSERT/UPDATE/DELETE de propósito: quem escreve é
-- app/api/revive (service_role, que bypassa RLS) e as funções da §5. Deixar o
-- cliente escrever aqui permitiria forjar converted_at e page_view_count —
-- isto é, mentir na única métrica que decide se a campanha continua.
alter table public.revive_prospects force row level security;

-- Defense-in-depth: o Supabase concede privilégios de tabela a anon/authenticated
-- por padrão e é a RLS que segura. Tirando o GRANT, um `alter table ... disable
-- row level security` acidental no futuro ainda não abre a tabela.
revoke all on table public.revive_prospects from anon, authenticated;
grant all on table public.revive_prospects to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Comentários de coluna (o que "público" significa, gravado no banco).
-- ═══════════════════════════════════════════════════════════════════════════
comment on table public.revive_prospects is
  'KINEO-REVIVE — um canal dormente abordado pela campanha de outbound. Leitura pública SOMENTE via revive_prospect_public(handle).';
comment on column public.revive_prospects.contact_email is
  'INTERNO. Nunca retornado por revive_prospect_public(). É PII de alguém que não pediu contato.';
comment on column public.revive_prospects.notes is
  'INTERNO. Notas da pesquisa. Nunca sai na leitura pública.';
comment on column public.revive_prospects.days_dormant is
  'Snapshot do dia da coleta. A PÁGINA calcula os dias a partir de last_upload_at; esta coluna é auditoria e fallback.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. LEITURA PÚBLICA POR HANDLE — a única porta.
-- ═══════════════════════════════════════════════════════════════════════════
-- security definer + `where handle = ?` + LIMIT 1 + projeção fixa. O chamador
-- não escolhe colunas, não filtra por outra coluna, não ordena e não pagina:
-- não existe consulta possível que devolva um segundo prospect. O que sai é
-- exatamente o que a página renderiza — nada de contact_email, nada de notes,
-- nada de outcome.
--
-- `set search_path = public` é obrigatório numa função security definer: sem
-- isso, um search_path controlado pelo chamador pode resolver `videos` para
-- uma tabela plantada em outro schema e a função passa a ler o que o atacante
-- quiser, com os privilégios do dono.
--
-- Os vídeos vêm juntos porque isto é a ÚNICA definição de "o que é público
-- sobre um prospect" — mesma lição registrada em lib/publicVideos.ts: a página
-- e qualquer outro consumidor têm que ler pela mesma projeção, senão a regra
-- diverge em dois lugares. A página em app/revive/[handle] chama exatamente
-- esta função (com service_role), então anon e a página veem o mesmo objeto.
create or replace function public.revive_prospect_public(p_handle text)
returns table (
  handle           text,
  channel_title    text,
  channel_url      text,
  subscriber_count integer,
  last_upload_at   date,
  days_dormant     integer,
  niche            text,
  videos           jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.handle,
    p.channel_title,
    p.channel_url,
    p.subscriber_count,
    p.last_upload_at,
    p.days_dormant,
    p.niche,
    coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'slot',       s.slot,
                   'id',         v.id,
                   -- title cai para topic: boa parte das linhas de `videos`
                   -- tem title null e só o brief original em topic.
                   'title',      coalesce(nullif(btrim(v.title), ''), nullif(btrim(v.topic), '')),
                   'url',        coalesce(v.final_video_url, v.video_url),
                   'poster_url', v.thumbnail_url
                 )
                 order by s.slot
               )
        from (values (1, p.video_1_id), (2, p.video_2_id), (3, p.video_3_id)) as s(slot, video_id)
        join public.videos v on v.id = s.video_id
        -- Um slot sem URL tocável não é um vídeo: é um buraco. Melhor a página
        -- mostrar 2 vídeos de verdade que 3 caixas pretas.
        where coalesce(v.final_video_url, v.video_url) is not null
      ),
      '[]'::jsonb
    ) as videos
  from public.revive_prospects p
  where p.handle = lower(btrim(p_handle))
  limit 1;
$$;

-- ⚠️ `create function` concede EXECUTE a PUBLIC por padrão. Sem este revoke, a
-- §5 (que ESCREVE) ficaria chamável por anon e qualquer um poderia inflar
-- page_view_count. O revoke vem antes de todo grant, sempre.
revoke all on function public.revive_prospect_public(text) from public;
grant execute on function public.revive_prospect_public(text) to anon, authenticated, service_role;
comment on function public.revive_prospect_public(text) is
  'Leitura pública de UM prospect por handle. Projeção fixa: nada de PII, nada de outcome, nenhuma forma de listar. Se um dia quisermos fechar até o oráculo de existência, basta: revoke execute on function public.revive_prospect_public(text) from anon; — a página usa service_role e não é afetada.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. OUTCOME TRACKING — contadores atômicos, service_role only.
-- ═══════════════════════════════════════════════════════════════════════════
-- Por que funções e não um UPDATE do PostgREST:
--   1. `page_first_viewed_at = coalesce(page_first_viewed_at, now())` referencia
--      a própria coluna; o PostgREST não sabe escrever isso.
--   2. O incremento tem que ser atômico. Ler-e-escrever de dentro do Node abre
--      corrida entre dois renders concorrentes e perde contagem — e o número
--      que a gente perde é justamente o denominador do funil.
--   3. A janela de dedupe precisa ser avaliada NO MESMO statement do update,
--      senão duas requisições simultâneas passam as duas pelo teste.

create or replace function public.revive_mark_view(p_handle text, p_window_minutes integer default 30)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_counted boolean;
begin
  -- Um único statement: o predicado da janela e o incremento são avaliados sob
  -- o mesmo row lock. O perdedor da corrida atualiza 0 linhas e devolve false —
  -- e o chamador usa esse false para NÃO gravar o evento em `events` também,
  -- mantendo as duas contagens de acordo.
  update public.revive_prospects p
     set page_first_viewed_at = coalesce(p.page_first_viewed_at, now()),
         page_last_viewed_at  = now(),
         page_view_count      = p.page_view_count + 1
   where p.handle = lower(btrim(p_handle))
     and (
       p.page_last_viewed_at is null
       or p.page_last_viewed_at < now() - make_interval(mins => greatest(coalesce(p_window_minutes, 30), 0))
     )
  returning true into v_counted;

  return coalesce(v_counted, false);
end;
$$;

-- CTA: sem janela de dedupe. Um clique é um ato deliberado; se a pessoa voltar
-- e clicar de novo, isso é sinal, não ruído.
create or replace function public.revive_mark_click(p_handle text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_clicked boolean;
begin
  update public.revive_prospects p
     set cta_first_clicked_at = coalesce(p.cta_first_clicked_at, now()),
         cta_last_clicked_at  = now(),
         cta_click_count      = p.cta_click_count + 1
   where p.handle = lower(btrim(p_handle))
  returning true into v_clicked;

  return coalesce(v_clicked, false);
end;
$$;

-- ESTAS DUAS ESCREVEM. Só o service_role chama (app/api/revive/*). Se anon
-- pudesse chamar, o funil da campanha viraria ficção em uma tarde.
revoke all on function public.revive_mark_view(text, integer) from public;
revoke all on function public.revive_mark_click(text) from public;
grant execute on function public.revive_mark_view(text, integer) to service_role;
grant execute on function public.revive_mark_click(text) to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. VERIFICAÇÃO (rode depois de aplicar).
-- ═══════════════════════════════════════════════════════════════════════════
-- Deve devolver 3 linhas: revive_mark_click, revive_mark_view, revive_prospect_public.
--   select proname, prosecdef from pg_proc
--    where proname like 'revive%' order by proname;
--
-- Deve devolver 0 linhas (nenhum privilégio de tabela para anon/authenticated):
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'revive_prospects' and grantee in ('anon','authenticated');
--
-- O funil da campanha:
--   select count(*)                                                as prospects,
--          count(*) filter (where outreach_sent_at is not null)     as contacted,
--          count(*) filter (where page_first_viewed_at is not null) as viewed,
--          count(*) filter (where cta_first_clicked_at is not null) as clicked,
--          count(*) filter (where converted_at is not null)         as converted
--     from public.revive_prospects;
