-- KINEO-ADMIN-RAPIDO-1710 — índices de public.events para o /admin (docs/AUDITORIA-VELOCIDADE-2026-10-17.md, parte B).
--
-- REGISTRO, NÃO EXECUÇÃO: o fundador deu o "vai" em 17/10 e os QUATRO já foram criados em produção pelo coordenador, com
-- CONCURRENTLY, com estes MESMOS nomes. Este arquivo existe para o repositório saber que eles existem. Por isso é tudo
-- IF NOT EXISTS: rodar de novo não faz nada. NÃO reaplicar à mão.
--
-- CONCURRENTLY não roda dentro de transação: se algum dia for aplicado por ferramenta que embrulha a migration em BEGIN/COMMIT,
-- rodar cada linha sozinha no SQL editor.
--
-- Para que serve cada um (quem filtra por ele):
--   events_user_created_idx   → /admin/trial-cohort (events por user_id da coorte), /admin/clientes, live/checkoutHonesto
--   events_name_created_idx   → /admin/funnel (contagem por nome no período), CEO (checkout_started, eventos de MRR)
--   events_session_idx        → /api/admin/live (visitantes por sessão), quality-radar (marcas por session_id)
--   events_generation_id_idx  → /admin/coerencia (plano e nota por metadata->>'generation_id')

create index concurrently if not exists events_user_created_idx on public.events (user_id, created_at desc);
create index concurrently if not exists events_name_created_idx on public.events (name, created_at desc);
create index concurrently if not exists events_session_idx on public.events (session_id);
create index concurrently if not exists events_generation_id_idx on public.events ((metadata->>'generation_id'));
