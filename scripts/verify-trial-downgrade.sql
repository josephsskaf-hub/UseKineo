-- QA DO CRON DE DOWNGRADE DO REVERSE TRIAL  [KINEO-TRIAL-DOWNGRADE-2026-08-06]
--
-- POR QUE ESTE ARQUIVO EXISTE. O cron /api/cron/trial-downgrade decide quanto
-- crédito REVOGAR de uma conta. Com a flag OFF a produção tem ZERO trials, então
-- não existe forma de observar o comportamento real antes de ligar — e "ligar
-- para ver" é a última coisa que se faz com código que tira dinheiro de conta de
-- usuário. Esta tabela-verdade replica a regra de lib/reverseTrial.ts em SQL e
-- pode ser rodada a qualquer momento (NÃO ESCREVE NADA; é tudo VALUES em memória).
--
-- FAZ PARTE DO QA OBRIGATÓRIO ANTES DE KINEO_REVERSE_TRIAL_ENABLED=true.
-- Se um dia a regra do TypeScript mudar e esta consulta continuar passando, é
-- porque as duas divergiram — reescrever as duas juntas ou apagar esta.
--
-- Executado em 06/08/2026: 12 de 12 casos com o resultado esperado.

with cap as (select 40::int c),  -- TRIAL_CREDIT_CAP / TRIAL_GRANT_CREDITS
casos(caso, status, ends_at, used, granted, balance, plan, has_paid, espera_due, espera_revoga) as (values
 ('01 trial vivo (nao vencido)',        'active',    now()+interval '2 day', 0,  40, 40,  'free',    false, false, 0),
 ('02 relogio venceu, nada gasto',      'active',    now()-interval '1 min', 0,  40, 40,  'free',    false, true,  40),
 ('03 relogio venceu, gastou 12',       'active',    now()-interval '1 h',   12, 40, 28,  'free',    false, true,  28),
 ('04 teto atingido (prazo no futuro)', 'expired',   now()+interval '2 day', 40, 40, 0,   'free',    false, true,  0),
 ('05 teto ULTRAPASSADO (44/40)',       'expired',   now()+interval '2 day', 44, 40, 0,   'free',    false, true,  0),
 ('06 PAGANTE por has_paid',            'active',    now()-interval '1 h',   10, 40, 130, 'free',    true,  true,  0),
 ('07 PAGANTE por plan',                'active',    now()-interval '1 h',   10, 40, 130, 'creator', false, true,  0),
 ('08 linha legada sem grant',          'active',    now()-interval '1 h',   0,  0,  5,   'free',    false, true,  0),
 ('09 prazo NULO + credito de indicacao','active',   null,                   0,  40, 45,  'free',    false, true,  40),
 ('10 ja processado (idempotencia)',    'downgraded',now()-interval '2 day', 0,  40, 0,   'free',    false, false, 0),
 ('11 saldo menor que o nao gasto',     'active',    now()-interval '1 h',   30, 40, 3,   'free',    false, true,  3),
 ('12 convertido ja fechado',           'converted', now()-interval '2 day', 5,  40, 100, 'pro',     true,  false, 0)
),
calc as (
  select caso, balance, espera_due, espera_revoga,
    -- trialNeedsDowngrade(): status ainda aberto E (relogio venceu OU prazo
    -- ilegivel OU teto atingido). 'downgraded'/'converted' sao TERMINais.
    (status in ('active','expired') and (ends_at is null or now() >= ends_at or used >= c)) as due,
    -- isPayingProfile(): DENYLIST INVERTIDA (qualquer plan != free, OU has_paid).
    -- Nao e a allowlist PAID_PLANS dos crons de e-mail: allowlist falha ABERTO no
    -- plano que ninguem lembrou de acrescentar, e falhar aberto aqui significa
    -- tirar credito de cliente pagante.
    (has_paid or (plan is not null and lower(btrim(plan)) not in ('','free'))) as paying,
    case
      when not (status in ('active','expired') and (ends_at is null or now() >= ends_at or used >= c)) then 0
      when has_paid or (plan is not null and lower(btrim(plan)) not in ('','free')) then 0
      when balance is null then 0
      else least(greatest(0, balance), greatest(0, granted - used))  -- min(saldo, nao gasto)
    end as revoga
  from casos, cap
)
select caso, due, paying, revoga,
       balance - revoga as saldo_final,
       case when not due then '(sem escrita)' when paying then 'converted' else 'downgraded' end as novo_status,
       case when due = espera_due and revoga = espera_revoga then 'OK' else '*** FALHOU ***' end as veredito
from calc order by caso;
