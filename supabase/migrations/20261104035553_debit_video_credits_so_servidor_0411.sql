-- KINEO-DEBITO-SO-SERVIDOR-0411
-- JA APLICADA EM PRODUCAO (cqqukkvjjrguayiyjvhh) em 2026-11-04 03:55Z. Versionada para o repo refletir o banco.
--
-- Fecha o RPC de sessao do debito. Aberto, qualquer logado gravava no ledger o custo que quisesse: custo enorme em
-- chave inventada virava credito no estorno automatico; custo 0 em chave previsivel tornava gratis o debito real.
-- Aplicada so depois do deploy de 9f5834a16 (READY 03:45Z) passar a debitar por debit_video_credits_service
-- e os logs mostrarem zero chamadas ao RPC de sessao por 10 min.
-- ATENCAO: promover deploy anterior a 9f5834a16 quebra toda cobranca por sessao (mesmo incidente de 23/07).
-- Volta, se precisar: grant execute on function public.debit_video_credits(text, integer) to authenticated;
revoke all on function public.debit_video_credits(text, integer) from public, anon, authenticated;
grant execute on function public.debit_video_credits(text, integer) to service_role;
