# Botão da versão completa · comparação de sete dias

**BASELINE · 25/11, publicação inicial com a chave OFF.** Na tela de entrega, a variante troca o plano principal para Creator (SKU mensal `basic`). Starter continua disponível. O botão abre o checkout do filme guardado. Os preços são os mesmos de `lib/checkoutPricing.ts`, inclusive quando a interface mostra o primeiro mês promocional elegível. A cobrança continua a cargo das rotas existentes. As duas opções do teste levam sua variante até a página de retorno se a pessoa sair do checkout.

**EVIDÊNCIA DE PRODUÇÃO · relatório de 25/11.** Na coorte fixa de 26/10 a 24/11, seis dos sete compradores escolheram Creator. A oferta de versão completa registrou um pagamento entre 16 contas que abriram seu checkout. A preferência geral por Creator motivou o teste. A taxa de compra específica da nova tela só poderá ser medida após exposição externa. Fonte: `docs/semana-2/DO-FILME-AO-PAGAMENTO-2511.md`, seções 4 e 5.

**SUGESTÃO · leitura pela Div. 4 no sétimo dia de exposição externa.** Fixar início e término em Brasília, excluir a lista vigente de contas da casa e usar contas distintas. Registrar o tempo de acompanhamento dos pagamentos e repetir com sete dias completos de acompanhamento por conta no corte de 30 dias anterior e no teste.

1. Denominador do teste: contas com `checkout_started`, `metadata.intent_campaign = film15_full_version` e `metadata.film_offer_version = film_ready_creator_primary_2511`. Mostrar o total e os cortes por `metadata.tier` real. Uma mesma conta pode aparecer nos dois cortes e conta uma vez no total.
2. Numerador: contas desse denominador com recibo efetivo de pagamento positivo no mesmo checkout, unindo `user_id` e `metadata.stripe_session_id` do evento à venda em produção. Apresentar fornecedores separadamente se houver recibos com esquema distinto. Deduplicar reabertura da página, retentativas e webhooks. Excluir simulação, trial e clique.
3. Mostrar também quantas contas visualizaram a oferta (`film15_full_offer_viewed`, mesma versão), para dar contexto a quem entrou no checkout. O cancelamento retoma a opção original e leva o mesmo identificador de variante.
4. Para a base histórica, usar o mesmo filtro de superfície de tela e janela de acompanhamento. Os links de e-mail usam a mesma campanha; se faltar a origem histórica, separar essas contas como indeterminadas. O total histórico de 1/16 não deve ser rotulado como uma reconstrução exclusiva da tela sem esse cruzamento.

**QUESTÃO PENDENTE · espera do primeiro filme.** A seção 6 do relatório usa a data de criação de uma linha que hoje está concluída. Para separar compra durante a espera e compra após entrega, usar o carimbo de conclusão/entrega ou seu evento e mostrar quantas contas não têm esse carimbo. O relatório traz 67 e 73 contas com checkout em trechos distintos. Conservar o corte de cada extração até reconciliar as seis contas. Nenhum desses problemas altera o destino do botão.

**TESTADO LOCALMENTE.** O teste `scripts/test-versao-completa-creator-2511.mjs` cobre os dois planos nos 16 idiomas, os estados de promoção, os links históricos, a origem e a retomada com o mesmo filme. `scripts/test-versao-completa-starter-1111.mjs` preserva o contrato anterior. A prova visual usa o componente real, um filme de exemplo e sessão simulada. O aceite de produção permanece com a CEO.

## Ativação local · 25/11

**IMPLEMENTADO.** As três chaves estão ligadas nesta candidata local. A espera do primeiro filme, a oferta de próximo filme na entrega e o Creator como opção principal da versão completa usam os preços, critérios e checkouts já existentes.

**FATO CONFIRMADO.** Espera e entrega gravam a impressão após 50% de visibilidade, respectivamente em `first_film_wait_offer_viewed` e `film_delivery_next_offer_viewed`, com `metadata.version`. A versão completa grava `film15_full_offer_viewed` com `metadata.surface = 'film_ready'`, `offer_version` e `source_video_id`. Para as duas primeiras, `checkout_started.metadata.intent_campaign` identifica a campanha. Para a versão completa nova, a sessão aberta também carrega `film_offer_version` e `film_complete_source_video_id`. O recibo vem de `payment_success` do webhook Stripe. O vínculo exige a mesma conta e a mesma sessão, com pagamento vivo e valor positivo no carimbo da Stripe. A consulta mede a assinatura cobrada naquele checkout. Entrada paga de trial, renovação e pagamentos de outra sessão ficam fora.

**QUESTÃO PENDENTE.** A versão anterior de Starter é observável na impressão. Seu checkout partilha a campanha do e-mail e não carimba uma origem de tela exclusiva. Por isso o SQL retorna as etapas de checkout e pagamento legadas como `NULL`. O Dodo via Pricing não grava a campanha dessas telas. Compras por esse caminho, outras origens e sessões sem vínculo ficam indeterminadas para atribuição. O resultado é um funil Stripe observado, com contas distintas por tela e versão. Uma mesma pessoa pode entrar em mais de uma linha. As linhas não devem ser somadas como pessoas únicas.

**SUGESTÃO · decisão da CEO Claude.** Dia 7 da exposição externa, ler o funil provisório e conferir erros de checkout. Dia 14, fechar os sete dias de entrada mais sete dias de acompanhamento a partir da primeira impressão de cada conta. Proponho desligar somente a chave da tela que fechar com **30 ou mais contas externas que abriram Stripe atribuída e zero assinaturas confirmadas**, depois de reconciliar as sessões indeterminadas e conferir se havia um meio de pagamento alternativo sem atribuição relevante ao grupo. Com menos de 30 aberturas a amostra é inconclusiva. Um problema comprovado de preço, elegibilidade ou compra que impede a conclusão autoriza propor a volta imediata à CEO, independentemente da amostra. A comparação histórica de 1 em 16 inclui o e-mail e não é controle de eficácia da tela.

**Consulta somente leitura.** Preencher `activated_at` com o instante em que as chaves ON ficaram públicas, com offset explícito. Preencher `house_exact` e `house_patterns` com as listas vigentes de `lib/internalAccounts.ts` em arrays SQL, somente no console autorizado. Usar os e-mails canônicos de `auth.users`. Sem esses parâmetros o resultado pede configuração. `as_of` permite repetir a mesma leitura. A primeira impressão de cada conta fixa a janela. Na versão completa nova, o checkout exige também uma impressão do mesmo filme. Os pagamentos usam o instante reportado pela Stripe, que tem precisão de segundos. As alternativas Starter e Creator são mostradas apenas na versão completa nova, pelo plano de fato aberto. Uma pessoa pode abrir as duas alternativas e conta uma vez no total da versão. Os agregados não retornam e-mails, IDs ou sessões.

```sql
WITH input AS (
  SELECT NULL::timestamptz AS activated_at,  -- instante real da ativação (com fuso)
         now() AS as_of,                    -- ou corte fixo para repetir a leitura
         NULL::text[] AS house_exact,       -- INTERNAL_EXACT_EMAILS
         NULL::text[] AS house_patterns     -- INTERNAL_LIKE_PATTERNS
),
cfg AS (
  SELECT *, activated_at IS NOT NULL AND as_of >= activated_at
            AND cardinality(house_exact) > 0 AND cardinality(house_patterns) > 0 AS ready
  FROM input
),
versions(surface, version, impression, campaign, stamped, legacy) AS (VALUES
  ('espera', 'first_film_wait_2511', 'first_film_wait_offer_viewed', 'first_film_wait_2511', false, false),
  ('entrega', 'film_delivery_next_2511', 'film_delivery_next_offer_viewed', 'film_delivery_next_2511', false, false),
  ('versao_completa', 'film_ready_creator_primary_2511', 'film15_full_offer_viewed', 'film15_full_version', true, false),
  ('versao_completa', 'versao_completa_starter_1111', 'film15_full_offer_viewed', 'film15_full_version', false, true)
),
windows AS (
  SELECT v.*, c.as_of, c.ready IS TRUE AS ready, c.house_exact, c.house_patterns,
         c.activated_at - CASE WHEN v.legacy THEN interval '14 days' ELSE interval '0' END AS starts,
         c.activated_at + CASE WHEN v.legacy THEN interval '-7 days' ELSE interval '7 days' END AS ends
  FROM versions v CROSS JOIN cfg c
),
impressions AS (
  SELECT w.version, e.user_id, e.created_at,
         NULLIF(e.metadata->>'source_video_id', '') AS video_id
  FROM windows w
  JOIN public.events e ON e.name = w.impression
    AND e.created_at >= w.starts AND e.created_at < w.ends AND e.created_at <= w.as_of
  JOIN auth.users u ON u.id = e.user_id
  WHERE w.ready AND NULLIF(trim(u.email), '') IS NOT NULL
    AND NOT (lower(trim(u.email)) = ANY(w.house_exact) OR lower(trim(u.email)) LIKE ANY(w.house_patterns))
    AND CASE WHEN w.stamped OR w.legacy
         THEN e.metadata->>'surface' = 'film_ready' AND e.metadata->>'offer_version' = w.version
         ELSE e.metadata->>'version' = w.version
        END
),
people AS (
  SELECT version, user_id, min(created_at) AS first_seen
  FROM impressions GROUP BY version, user_id
),
openings AS (
  SELECT DISTINCT w.version, p.user_id, p.first_seen,
         NULLIF(e.metadata->>'stripe_session_id', '') AS stripe_session,
         e.created_at AS opened_at, e.metadata->>'tier' AS tier
  FROM windows w
  JOIN people p USING (version)
  JOIN public.events e ON e.user_id = p.user_id AND e.name = 'checkout_started'
    AND e.created_at >= p.first_seen AND e.created_at < p.first_seen + interval '7 days'
    AND e.created_at <= w.as_of
  WHERE NOT w.legacy AND e.path = '/api/stripe/checkout'
    AND e.metadata->>'intent_campaign' = w.campaign
    AND e.metadata->>'billing' IN ('monthly', 'annual')
    AND (NOT w.stamped OR (
      e.metadata->>'film_offer_version' = w.version AND EXISTS (
        SELECT 1 FROM impressions i
        WHERE i.version = w.version AND i.user_id = p.user_id AND i.created_at <= e.created_at
          AND i.video_id = e.metadata->>'film_complete_source_video_id'
      )
    ))
),
receipts AS (
  SELECT o.version, o.user_id, o.stripe_session, o.opened_at, o.tier,
         p.id IS NOT NULL AS has_receipt,
         p.user_id = o.user_id AS same_user,
         p.metadata->>'stripe_payment_status' = 'paid'
           AND p.metadata->>'stripe_livemode' = 'true'
           AND p.metadata->>'checkout_mode' = 'subscription'
           AND p.metadata->>'card_trial' = 'false'
           AND CASE WHEN jsonb_typeof(p.metadata->'amount_total') = 'number'
                    THEN (p.metadata->>'amount_total')::numeric > 0 ELSE false END AS eligible_payment,
         CASE WHEN p.metadata->>'stripe_paid_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$'
              THEN (p.metadata->>'stripe_paid_at')::timestamptz END AS paid_at,
         o.first_seen, w.as_of
  FROM openings o JOIN windows w USING (version)
  LEFT JOIN public.events p ON p.name = 'payment_success' AND p.path = '/api/stripe/webhook'
    AND p.metadata->>'source' = 'stripe_webhook'
    AND p.created_at >= w.starts AND p.created_at <= w.as_of
    AND p.metadata->>'stripe_session_id' = o.stripe_session
  WHERE starts_with(o.stripe_session, 'cs_live_')
),
stripe_totals AS (
  SELECT version,
         count(DISTINCT user_id) AS abriram_stripe,
         count(DISTINCT user_id) FILTER (WHERE same_user AND eligible_payment
           AND paid_at >= date_trunc('second', opened_at) AND paid_at < first_seen + interval '7 days' AND paid_at <= as_of) AS pagaram_mensal_ou_anual,
         count(DISTINCT user_id) FILTER (WHERE tier = 'starter') AS abriram_starter,
         count(DISTINCT user_id) FILTER (WHERE tier = 'basic') AS abriram_creator,
         count(DISTINCT user_id) FILTER (WHERE tier = 'starter' AND same_user AND eligible_payment
           AND paid_at >= date_trunc('second', opened_at) AND paid_at < first_seen + interval '7 days' AND paid_at <= as_of) AS pagaram_starter,
         count(DISTINCT user_id) FILTER (WHERE tier = 'basic' AND same_user AND eligible_payment
           AND paid_at >= date_trunc('second', opened_at) AND paid_at < first_seen + interval '7 days' AND paid_at <= as_of) AS pagaram_creator,
         count(DISTINCT user_id) FILTER (WHERE has_receipt AND
           (same_user IS NOT TRUE OR paid_at IS NULL OR eligible_payment IS NULL)) AS recibo_indeterminado
  FROM receipts GROUP BY version
),
missing_key AS (
  SELECT version, count(DISTINCT user_id) AS sem_sessao_stripe_live
  FROM openings
  WHERE stripe_session IS NULL OR NOT starts_with(stripe_session, 'cs_live_')
  GROUP BY version
),
seen_totals AS (
  SELECT version, count(*) AS viram
  FROM people GROUP BY version
)
SELECT w.surface AS tela, w.version AS versao,
       w.starts AT TIME ZONE 'America/Sao_Paulo' AS inicio_brasilia,
       w.ends AT TIME ZONE 'America/Sao_Paulo' AS fim_exposicao_brasilia,
       w.as_of AT TIME ZONE 'America/Sao_Paulo' AS corte_brasilia,
       CASE WHEN w.ready THEN coalesce(s.viram, 0) END AS viram,
       CASE WHEN w.ready AND NOT w.legacy THEN coalesce(t.abriram_stripe, 0) END AS abriram_stripe,
       CASE WHEN w.ready AND NOT w.legacy THEN coalesce(t.pagaram_mensal_ou_anual, 0) END AS pagaram_mensal_ou_anual,
       CASE WHEN w.stamped AND w.ready THEN coalesce(t.abriram_starter, 0) END AS abriram_starter,
       CASE WHEN w.stamped AND w.ready THEN coalesce(t.abriram_creator, 0) END AS abriram_creator,
       CASE WHEN w.stamped AND w.ready THEN coalesce(t.pagaram_starter, 0) END AS pagaram_starter,
       CASE WHEN w.stamped AND w.ready THEN coalesce(t.pagaram_creator, 0) END AS pagaram_creator,
       CASE WHEN w.ready AND NOT w.legacy THEN coalesce(k.sem_sessao_stripe_live, 0) END AS sem_sessao_stripe_live,
       CASE WHEN w.ready AND NOT w.legacy THEN coalesce(t.recibo_indeterminado, 0) END AS recibo_indeterminado,
       CASE
         WHEN NOT w.ready THEN 'preencher ativacao e exclusoes da casa'
         WHEN w.legacy THEN 'checkout legado sem marca exclusiva da tela'
         WHEN w.as_of < w.ends + interval '7 days' THEN 'parcial'
         WHEN coalesce(k.sem_sessao_stripe_live, 0) + coalesce(t.recibo_indeterminado, 0) > 0 THEN 'reconciliar'
         WHEN coalesce(t.abriram_stripe, 0) < 30 THEN 'amostra insuficiente'
         WHEN coalesce(t.pagaram_mensal_ou_anual, 0) = 0 THEN 'revisar desligamento da versao'
         ELSE 'limiar de desligamento nao atingido'
       END AS leitura_stripe
FROM windows w LEFT JOIN seen_totals s USING (version)
LEFT JOIN stripe_totals t USING (version) LEFT JOIN missing_key k USING (version)
ORDER BY w.starts, w.surface, w.version;
```
