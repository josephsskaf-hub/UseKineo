-- KINEO-CORTESIA-METRICA-1410 — BACKFILL (NÃO EXECUTADO). Revisão da sessão CEO antes de rodar.
-- Projeto Supabase cqqukkvjjrguayiyjvhh. Só RE-ROTULA profiles.trial_status. NUNCA mexe em crédito, plano, has_paid,
-- trial_credits_*, trial_downgraded_at nem em courtesy_grants.
--
-- O que corrige (medido read-only em 14/10/2026, contas internas fora):
--   alanhlm90@gmail.com          creator_trial · has_paid=false · cortesia ativa desde 08/10 · 'converted' pelo cron 08/10 15:55
--   robertoberto2343@gmail.com   creator_trial · has_paid=false · cortesia ativa desde 13/10 · 'converted' pelo cron 14/10 14:55
--                                (e trial_expired credit_cap 14/10 14:08 — débitos da cortesia somando no teto do teste)
--   sp1962054@gmail.com          creator_trial · has_paid=false · cortesia ativa desde 13/10 · teste AINDA 'active' (9/10):
--                                seria o próximo "convertido" falso na rodada do cron em que o relógio/teto vencer
-- Fica como está (não é defeito):
--   historyhideshere (Logan) já 'courtesy' à mão · achieverstudios e pedro.carvalho@universoecommerce.com.br 'downgraded'
--   ANTES da cortesia (teste real terminou; pedro bateu o teto 14:46, cron 14:55, cortesia por SQL 15:11) ·
--   yasminkhattar, moebiusad, syberz204, bekircanpinardag275 em 'region_paid_only' (não é teste reverso).
-- Depois do deploy do código, toda cortesia nova fecha o teste sozinha (lib/courtesyStore.ts) e o cron não carimba mais
-- 'converted' em cortesia (lib/reverseTrial.ts downgradeExpiredTrial) — este script é só o passado.

-- ── 1) PRÉVIA (read-only). Esperado: 3 linhas — alanhlm90 (converted), robertoberto2343 (converted), sp1962054 (active).
select p.id, p.email, p.plan, p.has_paid, p.trial_status, p.video_credits, g.id as grant_id, g.created_at as courtesy_at
from public.profiles p
join public.courtesy_grants g on g.user_id = p.id and g.status = 'active'
where coalesce(p.has_paid, false) = false
  and p.plan in ('creator_trial', 'studio_trial')
  and p.trial_status in ('active', 'expired', 'converted')
  and p.stripe_subscription_id is null
  and p.email !~* '(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com)'
  -- 'converted' só se o carimbo veio DEPOIS da cortesia (o cron viu o plano da cortesia, não uma compra)
  and (p.trial_status <> 'converted' or p.trial_downgraded_at >= g.created_at)
order by p.email;

-- ── 2) CORREÇÃO (rodar só depois da prévia bater 3). Transação com trava de contagem: se não forem 3, desfaz tudo.
begin;
with alvo as (
  select p.id
  from public.profiles p
  join public.courtesy_grants g on g.user_id = p.id and g.status = 'active'
  where coalesce(p.has_paid, false) = false
    and p.plan in ('creator_trial', 'studio_trial')
    and p.trial_status in ('active', 'expired', 'converted')
    and p.stripe_subscription_id is null
    and p.email !~* '(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com)'
    and (p.trial_status <> 'converted' or p.trial_downgraded_at >= g.created_at)
), feito as (
  update public.profiles p
     set trial_status = 'courtesy'
    from alvo
   where p.id = alvo.id
     and p.trial_status in ('active', 'expired', 'converted')
  returning p.id, p.email
)
select count(*) as relabeled, string_agg(email, ', ' order by email) as emails from feito;
-- Conferir: relabeled = 3 (alanhlm90, robertoberto2343, sp1962054). Se sim: commit; se não: rollback;
-- commit;
-- rollback;

-- ── 3) OPCIONAL — marcar o trial_expired credit_cap da cortesia para o A/B poder excluí-lo (evento 5c281082…, roberto).
-- Só metadado; não apaga nada. Descomentar se a sessão CEO quiser.
-- update public.events
--    set metadata = metadata || '{"courtesy_active": true, "tag": "KINEO-CORTESIA-METRICA-1410"}'::jsonb
--  where id = '5c281082-2b59-4162-a58d-2bf0e15d425d' and name = 'trial_expired';

-- ── 4) CONFERÊNCIA pós-correção (read-only). Esperado: 0 linhas.
select p.email, p.trial_status
from public.profiles p
where p.trial_status = 'converted' and coalesce(p.has_paid, false) = false
  and p.email !~* '(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com)';
