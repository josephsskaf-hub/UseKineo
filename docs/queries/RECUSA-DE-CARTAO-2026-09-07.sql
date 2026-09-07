-- ═══════════════════════════════════════════════════════════════════════════
-- RECUSA DE CARTÃO — o instrumento que o CLAUDE.md declara inexistente
-- Escrito no FECHAMENTO do ciclo de aquisição, 07/09/2026 07:39 UTC.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ LEIA ANTES DE USAR ESTE ARQUIVO PARA DISCUTIR PREÇO.
--
-- O CLAUDE.md diz, como verdade permanente, que a tabela `events` "NUNCA teve
-- um único `checkout_payment_failed`" e que por isso o campo "não prova nada
-- em nenhuma direção". Isso ESTÁ DESATUALIZADO. O evento existe desde
-- 03/09/2026 (`version: stripe_checkout_failure_v1`) e grava bandeira, país,
-- tipo de cartão (crédito/débito/pré-pago), motivo e nível de risco.
--
-- O QUE ISSO **NÃO** FAZ: não reabre a conclusão fechada do fundador de que o
-- vazamento do checkout é PREÇO. Aquela conclusão foi construída sobre 44
-- pessoas, repetidas vezes. Até 07/09 havia UMA recusa de compra inicial na
-- história inteira. Uma linha não derruba o estudo.
--
-- O QUE ISSO FAZ: devolve um instrumento. "É preço ou é trilho de pagamento?"
-- deixa de exigir o painel da Stripe e vira uma consulta. Se a coluna
-- `inicial` abaixo crescer, a resposta muda — e aí sim é dado novo.

-- ── (1) TODAS as recusas da história, separando renovação de compra inicial ──
select created_at,
       metadata->>'stage'            as estagio,        -- 'initial' | 'renewal'
       metadata->>'is_renewal'       as renovacao,
       (metadata->>'amount_minor')::int / 100.0 as valor_usd,
       metadata->>'card_brand'       as bandeira,
       metadata->>'card_funding'     as tipo,           -- credit | debit | prepaid
       metadata->>'card_country'     as pais,
       metadata->>'reason_category'  as motivo,
       metadata->>'network_status'   as rede,
       user_id                       as pessoa          -- ⚠️ NULL em compra inicial
  from events
 where name = 'checkout_payment_failed'
 order by created_at;

-- Resultado em 07/09 07:39 UTC — 3 linhas:
--   03/09 10:26Z · renewal · $9,90  · prepaid NG · insufficient_funds · TEM pessoa
--   04/09 08:24Z · renewal · $24,90 · debit   AU · insufficient_funds · TEM pessoa
--   07/09 05:35Z · INITIAL · $23,20 · prepaid US · card_restricted    · **user_id NULL**
-- As duas renovações são o ralo que o `c94b140a` consertou (carência de cobrança).

-- ═══════════════════════════════════════════════════════════════════════════
-- (2) 🔴 O DEFEITO: a recusa de COMPRA INICIAL chega anônima
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O payload traz `failure_ref`, que não bate com NADA no `checkout_started`.
-- Não traz `stripe_session_id`, não traz `customer`, e o `user_id` vem null
-- (é webhook). Resultado: a casa não sabe QUEM foi recusado e não consegue
-- mandar a carta de "tente outro cartão" — que já existe
-- (`checkout_recovery_emailed_v1`, 22 disparos na história).
--
-- Hoje a ÚNICA costura possível é valor + horário, à mão:

select f.created_at                             as recusa,
       (f.metadata->>'amount_minor')::int       as valor_minor,
       s.user_id                                as provavel_pessoa,
       s.created_at                             as abriu_a_sessao,
       s.metadata->>'stripe_session_id'         as sessao_stripe,
       f.created_at - s.created_at              as intervalo
  from events f
  join events s
    on s.name = 'checkout_started'
   and s.created_at between f.created_at - interval '30 minutes' and f.created_at
   and (s.metadata->>'public_promo_first_charge_minor')::int
       = (f.metadata->>'amount_minor')::int
 where f.name = 'checkout_payment_failed'
   and f.user_id is null
 order by f.created_at desc;

-- O CONSERTO (primeira tarefa da próxima sessão): pôr `stripe_session_id` no
-- payload do `checkout_payment_failed` de estágio `initial` e ligar nele a
-- carta que já existe. Um cartão pré-pago recusado por restrição de rede é o
-- caso em que "tente outro cartão" converte — a pessoa JÁ decidiu comprar.

-- ═══════════════════════════════════════════════════════════════════════════
-- (3) O IRMÃO DO MESMO BURACO — sessões que expiraram com URL de recuperação
-- ═══════════════════════════════════════════════════════════════════════════
select count(*)                                                              as expiradas,
       count(*) filter (where (metadata->>'recovery_url_available') = 'true') as com_url_viva,
       count(*) filter (where user_id is not null)                            as com_pessoa,
       (select count(*) from events where name = 'checkout_recovery_emailed_v1') as cartas_enviadas
  from events
 where name = 'checkout_session_expired';

-- Resultado em 07/09 07:39 UTC: 108 expiradas, 89 com URL viva, 22 cartas na
-- história inteira. A de 07/09 04:30Z é um Autopilot de US$ 299 (ip_country=IN,
-- payment_status=unpaid) com URL de recuperação válida até 07/10.
-- NÃO conferi um a um se as 89 têm dono identificável — deixo o número, não a
-- conclusão.
