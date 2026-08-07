-- KINEO-TRIAL-DOUBLECOUNT-2026-08-07 — CORRECAO RETROATIVA (idempotente)
-- Executada via MCP em 07/08/2026 no projeto cqqukkvjjrguayiyjvhh.
-- ANTES: 84c9ddee trial_status='expired', trial_credits_used=40, debito real=20.
-- DEPOIS: trial_status='active', trial_credits_used=20, ledger com 1 linha.
-- Rodar de novo nao muda nada (todas as 3 escritas sao condicionais).

-- 1) semear o ledger com o que JA foi contado, para o replay do RPC idempotente
--    nao voltar a somar esses mesmos renders depois do deploy.
insert into public.trial_debit_ledger (render_id, user_id, cost, created_at)
select cd.render_id, cd.user_id, cd.amount, cd.created_at
  from public.credit_debits cd
  join public.profiles p on p.id = cd.user_id
 where p.trial_status is not null
   and cd.refunded_at is null
   and cd.amount > 0
on conflict (render_id) do nothing;

-- 2) trial_credits_used = soma REAL dos debitos nao estornados do usuario.
update public.profiles p
   set trial_credits_used = coalesce(d.real_used, 0)
  from (select p2.id,
               (select sum(cd.amount)::int from public.credit_debits cd
                 where cd.user_id = p2.id and cd.refunded_at is null) as real_used
          from public.profiles p2 where p2.trial_status is not null) d
 where p.id = d.id
   and p.trial_status is not null
   and p.trial_credits_used is distinct from coalesce(d.real_used, 0);

-- 3) ressuscitar SO quem foi morto pelo bug: 'expired' com consumo real abaixo
--    do teto (40) e relogio ainda no futuro. 'converted' e 'downgraded' sao
--    terminais (pagou / creditos ja revogados) e NAO sao tocados.
update public.profiles
   set trial_status = 'active'
 where trial_status = 'expired'
   and coalesce(trial_credits_used, 0) < 40
   and trial_ends_at is not null
   and trial_ends_at > now();
