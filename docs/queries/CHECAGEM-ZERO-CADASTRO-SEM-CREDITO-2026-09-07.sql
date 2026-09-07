-- ═══════════════════════════════════════════════════════════════════════════
-- CHECAGEM ZERO — "cadastro nasceu sem crédito" (o TRIAL ÓRFÃO)
-- Predicado corrigido em 07/09/2026 05:00 UTC, depois de um FALSO ALARME meu.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ LEIA ISTO ANTES DE AGIR SOBRE O NÚMERO. O CLAUDE.md autoriza a vigia a
-- **reparar trial órfão sozinha**. Com o predicado ingênuo abaixo, essa
-- autorização vira uma máquina de **dar 25 créditos a quem o guarda
-- anti-abuso acabou de recusar** — ou seja, desfazer a proteção
-- automaticamente, sem ninguém perceber.
--
-- O PREDICADO INGÊNUO (NÃO USE):
--     video_credits = 0 AND trial_credits_granted = 0
--
-- Ele acusou 4 "órfãos" em 07/09 às 05:00. Os quatro eram **abuso corretamente
-- bloqueado**: uma única impressão digital (`452367a4fdc8`) abriu **6 contas
-- @live.com em 38 minutos**; as duas primeiras ganharam trial e gastaram os 25
-- créditos em um filme cada, e as quatro seguintes foram recusadas com
-- `trial_blocked_fingerprint` (`reason: over_limit`, `max_activations: 2`,
-- `prior_activations: 2`). O `email_signup_completed` delas registra
-- `trial_reason: "fingerprint_limit"` e `trial_activated: false`.
-- **O produto agiu certo. O alarme é que estava errado.**
--
-- Duas populações têm de sair da conta, e por motivos opostos:
--   1. quem GANHOU e GASTOU  → `trial_credits_used > 0`
--   2. quem foi RECUSADO     → tem evento `trial_blocked_fingerprint`

select
  count(*)                                                      as candidatos_brutos,
  count(*) filter (where coalesce(trial_credits_used, 0) > 0)   as gastaram_tudo,
  count(*) filter (where exists (select 1 from events e
                                  where e.user_id = p.id
                                    and e.name = 'trial_blocked_fingerprint')) as bloqueados_por_abuso,
  -- ↓↓↓ ESTE é o número do alarme. Só este. ↓↓↓
  count(*) filter (where coalesce(trial_credits_used, 0) = 0
                     and not exists (select 1 from events e
                                      where e.user_id = p.id
                                        and e.name = 'trial_blocked_fingerprint')) as orfaos_de_verdade
from profiles p
where p.created_at > '2026-09-06 23:38:00+00'::timestamptz   -- troque pelo corte do seu ciclo
  and p.email not ilike '%josephsskaf%'
  and coalesce(p.video_credits, 0) = 0
  and coalesce(p.trial_credits_granted, 0) = 0;

-- Resultado em 07/09 05:00 UTC: 4 brutos, 0 gastaram, 4 bloqueados,
-- **0 órfãos de verdade**. A checagem zero PASSA.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- IRMÃ — quem está farmando trial agora (a tela existe: /admin/trial-abuse)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- select metadata->>'fingerprint' impressao,
--        count(*) bloqueios,
--        count(distinct user_id) contas,
--        min(created_at) primeiro, max(created_at) ultimo
--   from events
--  where name = 'trial_blocked_fingerprint'
--    and created_at > now() - interval '7 days'
--  group by 1 order by contas desc;
