-- 023_channels_lockdown.sql — KINEO-YT-CONNECT-2026-07-26
--
-- PROBLEMA
-- public.channels guarda access_token e refresh_token do YouTube em TEXTO
-- PURO. A tabela tinha RLS ligado com três policies permissivas —
-- channels_select_own / channels_update_own / channels_delete_own, todas
-- `auth.uid() = user_id` — e os grants padrão do Supabase (SELECT, INSERT,
-- UPDATE, DELETE) para anon e authenticated.
--
-- Consequência: qualquer sessão logada podia fazer
--   GET /rest/v1/channels?select=*
-- direto do browser e ler o próprio refresh_token do YouTube — a credencial
-- que publica vídeo no canal do cliente, sem expiração natural. Um único XSS,
-- uma extensão de browser ou um script de terceiro no dashboard exfiltra o
-- direito de publicar na conta do cliente. channels_update_own era pior
-- ainda: deixava o cliente REESCREVER o próprio access_token, ou seja,
-- injetar um token arbitrário que o cron depois usaria para publicar.
--
-- POR QUE DÁ PRA FECHAR SEM QUEBRAR NADA
-- `grep -rn "from('channels')"` retorna 10 ocorrências em 4 arquivos:
--   lib/youtubeChannels.ts          107,123,145,267,269,274,282,321
--   app/api/autopilot/schedules/route.ts   218
--   app/api/cron/autopilot-generate/route.ts 459
-- TODAS passam por cliente service-role (channelsAdmin() / adminClient() /
-- createAdminClient com SUPABASE_SERVICE_ROLE_KEY). NENHUM caminho de leitura
-- ou escrita usa o cliente de cookie. As três policies, portanto, não
-- serviam a nenhuma funcionalidade — eram superfície de ataque pura.
--
-- service_role tem o atributo BYPASSRLS: continua lendo e escrevendo normal.

begin;

revoke all on table public.channels from anon;
revoke all on table public.channels from authenticated;

grant all on table public.channels to service_role;

drop policy if exists channels_select_own on public.channels;
drop policy if exists channels_update_own on public.channels;
drop policy if exists channels_delete_own on public.channels;

alter table public.channels enable row level security;

-- Segunda tranca: mesmo que um grant volte por engano (migration futura,
-- `grant all on all tables in schema public`), a policy nega tudo.
drop policy if exists channels_no_public_access on public.channels;
create policy channels_no_public_access
  on public.channels
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on column public.channels.access_token is
  'OAuth access token do YouTube em texto puro. NUNCA exponha esta coluna a anon/authenticated: acesso só via service role (ver 023_channels_lockdown.sql).';
comment on column public.channels.refresh_token is
  'OAuth refresh token do YouTube em texto puro — credencial de publicação sem expiração natural. NUNCA exponha esta coluna a anon/authenticated.';

commit;
