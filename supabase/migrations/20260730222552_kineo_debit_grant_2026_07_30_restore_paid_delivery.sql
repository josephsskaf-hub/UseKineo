-- KINEO-DEBIT-GRANT-2026-07-30
-- JA APLICADA EM PRODUCAO (cqqukkvjjrguayiyjvhh) em 2026-07-30 22:25Z.
-- Versionada aqui para que o repo pare de mentir sobre o estado do banco.
--
-- INCIDENTE
-- Desde 2026-07-23 15:19Z nenhuma linha entrou em public.credit_debits, enquanto
-- public.render_jobs registrou 25 renders de 12 pessoas (8 do unico cliente com
-- plano pago ativo) no mesmo periodo. Taxa de falha da entrega paga: 25/25 = 100%,
-- por sete dias, sem um unico alarme.
--
-- CAUSA
-- A migration 20260723184959 (lock_debit_rpcs_from_public) revogou EXECUTE de
-- PUBLIC, e PUBLIC era o unico caminho pelo qual o papel `authenticated` enxergava
-- debit_video_credits / debit_avatar_credit. app/api/compose/status/[renderId]
-- chama esses RPCs com o client do USUARIO -- tem de ser, porque a funcao le
-- auth.uid() internamente (com service_role ela levantaria 'not authenticated').
-- Sem EXECUTE o PostgREST devolve erro, o codigo entra no ramo "nunca entregar
-- premium sem cobrar" (correto, e mantido) e DESTROI um video ja renderizado.
--
-- LICAO PARA A PROXIMA MIGRATION DE SEGURANCA
-- Revogar de PUBLIC e mudanca de comportamento, nao higiene. Quem revoga de PUBLIC
-- concede explicitamente a quem precisa, na MESMA migration.
--
-- ENDURECIMENTO ANTES DE REABRIR
-- Expor o RPC a `authenticated` abriria um buraco real: chamar direto com p_cost=0
-- faria o debito verdadeiro seguinte bater em unique_violation, devolver saldo e
-- entregar o video limpo de graca. Por isso o custo autoritativo passa a vir de
-- render_jobs.cost, escrito pelo servidor no momento do claim. render_jobs tem RLS
-- ligada e SOMENTE policy de SELECT -- o cliente nao consegue forjar a linha.
-- p_cost so e usado quando nao existe linha (renders legados: 241 debitos na
-- historia contra 62 render_jobs).
--
-- DELIBERADAMENTE NAO RECONCEDIDAS: add_video_credits e refund_render_credits.
-- Chamadores conferidos -- so webhooks (hotmart, mercadopago) e o cron de refund,
-- todos com client service_role. Reconceder deixaria o cliente creditar a propria
-- conta. A migration de 23/07 acertou nessas duas e errou so nas de debito.

create or replace function public.debit_video_credits(p_render text, p_cost integer)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_balance int;
  v_cost int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_cost is null or p_cost < 0 then
    raise exception 'invalid cost';
  end if;

  -- KINEO-DEBIT-GRANT-2026-07-30 -- custo autoritativo do servidor.
  select rj.cost into v_cost
    from render_jobs rj
   where rj.render_id::text = p_render
     and rj.user_id = v_user;
  v_cost := coalesce(v_cost, p_cost);

  begin
    insert into credit_debits (render_id, user_id, kind, amount)
    values (p_render, v_user, 'video', v_cost);
  exception when unique_violation then
    select video_credits into v_balance from profiles where id = v_user;
    return coalesce(v_balance, 0);
  end;

  update profiles
     set video_credits = greatest(coalesce(video_credits, 0) - v_cost, 0)
   where id = v_user
   returning video_credits into v_balance;
  return coalesce(v_balance, 0);
end $function$;

grant execute on function public.debit_video_credits(text, integer) to authenticated;
grant execute on function public.debit_avatar_credit(text) to authenticated;
