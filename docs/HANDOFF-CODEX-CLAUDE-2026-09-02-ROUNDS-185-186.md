# HANDOFF CODEX → CLAUDE — RODADAS 185–186

**Data:** 2026-09-02 (BRT)
**Workstream:** Growth / conversão B2C e diagnóstico B2B
**Ponta de código:** `5e84ca29e60e548b02774fe237cc77f314b11756`

## 1. Decisão comercial preservada: USD sem surpresa

**DECISÃO APROVADA pelo fundador em 2026-09-02:** manter USD do anúncio à cobrança. A divergência entre promessa e Stripe destrói credibilidade no último segundo de decisão. Não prometer moeda local e não reabrir esse experimento sem nova decisão explícita.

## 2. Os três checkouts recentes ocorreram antes de valor entregue

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02, Supabase somente SELECT, contas internas excluídas:** a janela de 6 horas continha três pessoas externas com checkout. As três tinham `completed_before_checkout=0` e `completed_total=0`.

- Os dois primeiros atores já constam do handoff 183–184: um recebeu classificação falsa `trial_spent` com saldo ainda em 25; outro abriu checkout com créditos reservados durante geração.
- O terceiro ator anonimizado `8f7af61454bf6980225983e5d734617e` tinha zero vídeos, repetiu `analyze_prompt_too_long`, também recebeu `trial_spent` com 25 créditos e abriu checkout Starter.

**CONCLUSÃO:** não há base para classificar esses três casos como rejeição de preço. Todos chegaram ao caixa antes do primeiro vídeo entregue. A correção de `trial_spent` e o erro de análise pertencem à pista de produto do Claude; o Codex não editou `GenerateClient.tsx`.

## 3. O antigo evento de oferta confundia montagem com visão humana

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02:** `history_first_video_offer_viewed` apareceu 14 vezes para apenas duas pessoas externas em 6 horas. A razão 7× por pessoa é assinatura de remontagem, não de 14 decisões humanas.

**FATO CONFIRMADO no código anterior:** o evento disparava quando a oferta ficava elegível/montada; não exigia que o CTA estivesse visível na tela. Portanto “zero clique após 14 views” não distinguia oferta abaixo da dobra de rejeição comercial.

## 4. Medição humana implementada e auditada

**IMPLEMENTADO em `5e84ca29`:**

- `history_first_video_offer_rendered`, versão `history_first_video_rendered_v1`, mede apenas a montagem técnica do CTA real;
- `history_first_video_offer_viewed`, versão `history_first_video_human_view_v2`, exige o CTA comercial real com pelo menos 50% de visibilidade contínua por 1 segundo, aba visível, sem lightbox e sem checkout pendente;
- deduplicação por sessão e primeiro vídeo; ACK fechado com estados `stored`, `not_stored` e `ambiguous`; uma única repetição limitada ocorre apenas em `not_stored`;
- Web Lock fecha a corrida entre duas remontagens; `ambiguous` nunca reposta cegamente;
- metadata fechada e categórica, sem ID de vídeo, e-mail, URL, UTM, preço ou texto livre.

**AUDITORIA ADVERSARIAL:** primeira revisão encontrou três P1 (lightbox cobrindo CTA, remount perdendo retry e remoção do denominador técnico). Todos foram corrigidos. Reauditoria final: **GO, zero P0 e zero P1**.

**TESTADO LOCALMENTE:** `test-history-first-video-offer-human-view` 73/73; `test-history-referral-mission` 55/55; `test-history-second-video-milestone` 44/44; `git diff --check` limpo. Typecheck preservou exatamente os três erros preexistentes em `mrr.ts`, `me/subscription/route.ts` e `TrialDowngradeModal.tsx`, nenhum nos arquivos desta entrega.

**NÃO MUDOU:** layout, copy, preço, plano, crédito, SKU, checkout, render ou banco.

## 5. Gate causal da próxima intervenção B2C

**DECISÃO DE EXPERIMENTO:** preservar o card atual até 10 pessoas externas com exposição humana ou o primeiro clique/pagamento.

- Se `human_view / rendered < 50%`, a próxima hipótese é posição/descoberta.
- Se a razão for `>= 80%` e houver zero clique entre 10 pessoas, a próxima hipótese é hierarquia/oferta.
- Contar pessoas distintas, nunca eventos.

## 6. B2B e afiliados: nenhum novo front-end agora

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02, Supabase somente SELECT, contas internas excluídas:** nos últimos 30 dias, a consulta por pessoas com `first_video_generation_completed_from_viral_onboarding` e `selected_goal in ('business','agency')` retornou zero. Preservar B2B até pelo menos 5 primeiros vídeos completos desse público e 2 retornos ao History, ou o primeiro checkout/pagamento B2B.

**EVIDÊNCIA DE PRODUÇÃO herdada do handoff de 01/09:** existem 11 afiliados ativos e 19 linhas de clique, mas zero `affiliate_referrals`. Não criar nova superfície antes de 5 pessoas externas referidas.

**FATO CONFIRMADO / CONTRADIÇÃO:** compra avulsa referida pode marcar `affiliate_referrals.status='paid'`, e o dashboard chama isso de “Paid customers”, embora a promessa seja assinatura. Próxima intervenção segura é server-side: só classificar `paid customer` quando houver `payment_success` de assinatura e copiar `affiliate_system` para o evento canônico. Nenhuma mudança desse tipo foi feita nesta rodada.

## 7. Estado de publicação

**PUBLICADO:** `origin/main` avançou por fast-forward para `5e84ca29e60e548b02774fe237cc77f314b11756` sem colisão com trabalho do Claude.

**VALIDADO EM PRODUÇÃO em 2026-09-02:** deploy Vercel `dpl_FiE6AqG82PV5osRUJsv6j8cdKU2M` ficou `READY`, target production, alias `www.usekineo.com`, no SHA `5e84ca29e60e548b02774fe237cc77f314b11756`. A consulta de logs `error`/`fatal` restrita a esse deployment retornou zero linhas. Os clusters presentes na janela ampla pertenciam ao deployment anterior e ao pipeline de render, fora desta entrega.
