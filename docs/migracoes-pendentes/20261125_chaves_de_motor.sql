-- KINEO-TOMADA-DO-MOTOR-2511 — NÃO APLICADA. Escrita pela Div. filmes; pede a revisão do outro CEO antes de aplicar (CLAUDE.md: "Migration pede
-- revisão do outro CEO"). Pedido da CEO Claude, 25/11 16:25 (o dono quer trocar o motor do filme grátis sem deploy).
--
-- O QUE FAZ: uma tabela de UMA linha por chave, que só o servidor (service role) lê e escreve. A rota do filme grátis lê
-- `filme_gratis_15s` (lib/cinematic/chaveDoMotor2511.ts, cache de 30 s por instância):
--   'gemini'  = o Gemini Omni Flash 1.2 para todo filme grátis com referência e 15 s (mesmo com a constante do código desligada);
--   'kling4'  = sem Gemini: o Kling 4 reference (ou o Kling 4 de sempre) no próximo pedido;
--   'reserva' = o Kling 4 grátis nem reserva: o filme vai à reserva de hoje (o caminho de "reserva indisponível").
--   SEM LINHA (ou a tabela ausente, ou erro de leitura) = vale o que está no código (GEMINI_NA_ESTEIRA_2511).
-- Pedido já enviado não lê a chave (o acompanhamento segue o marcador assinado do claim). Débito, teto do dia e selo não mudam.
--
-- SEGURANÇA: RLS ligado e NENHUMA política: anon e authenticated não leem nem escrevem (nem pela /api/events, que grava em
-- `events`, outra tabela). O service role ignora RLS.

create table if not exists public.chaves_de_motor (
  chave text primary key check (chave in ('filme_gratis_15s')),
  valor text not null check (valor in ('gemini', 'kling4', 'reserva')),
  motivo text,
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);
alter table public.chaves_de_motor enable row level security;
revoke all on table public.chaves_de_motor from anon, authenticated;
comment on table public.chaves_de_motor is 'KINEO-TOMADA-DO-MOTOR-2511: o motor do filme grátis sem deploy. Só o service role. Sem linha = o código.';

-- COMO USAR (a CEO, no SQL do Supabase; vale em até 30 s em cada instância):
--   insert into public.chaves_de_motor (chave, valor, motivo, atualizado_por) values ('filme_gratis_15s', 'kling4', 'queda do Gemini acima de 25%', 'CEO')
--     on conflict (chave) do update set valor = excluded.valor, motivo = excluded.motivo, atualizado_por = excluded.atualizado_por, atualizado_em = now();
--   delete from public.chaves_de_motor where chave = 'filme_gratis_15s';   -- volta ao código
--
-- CONFERÊNCIA depois de aplicar:
--   select relrowsecurity from pg_class where oid = 'public.chaves_de_motor'::regclass;            -- true
--   select count(*) from pg_policy where polrelid = 'public.chaves_de_motor'::regclass;             -- 0
--   select has_table_privilege('anon', 'public.chaves_de_motor', 'select');                         -- false
--
-- DESFAZER:
--   drop table if exists public.chaves_de_motor;
