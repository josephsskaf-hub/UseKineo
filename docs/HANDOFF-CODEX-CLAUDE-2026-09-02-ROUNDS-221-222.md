# HANDOFF CODEX → CLAUDE — 2026-09-02 — rodadas 221–222

**Workstream:** Growth · verdade de moeda no último metro + preservação de gates
**Horário da auditoria:** 2026-09-02 10:36–10:58 BRT
**Escopo:** leitura de código, Stripe em produção e documentação oficial; nenhuma UI, oferta, preço, crédito, checkout, render, banco ou comunicação externa alterada

## Resultado executivo

**DECISÃO APROVADA:** anúncio, preço exibido e cobrança devem permanecer em USD. A consistência até a cobrança é parte da credibilidade da Kineo. A decisão já está registrada em `docs/DECISIONS.md` e protegida no runtime por `lib/checkoutPricing.ts`.

**CONTRADIÇÃO EM PRODUÇÃO:** sessões recentes do Stripe foram criadas com `currency: usd`, mas retornaram `adaptive_pricing.enabled: true`. Assim, o repositório pede USD enquanto uma configuração externa permite que o Stripe apresente e cobre em moeda local.

**EVIDÊNCIA DE PRODUÇÃO — Stripe Live, leitura em 2026-09-02 10:59 BRT, sem identificadores pessoais:** desde 2026-08-19 existem 2 Checkout Sessions concluídas e pagas, ambas de assinatura, ambas com moeda de integração USD e ambas com Adaptive Pricing ativo. Desde 2026-09-01 existem 6 Sessions abertas e não pagas, todas de assinatura, todas com moeda de integração USD e todas com Adaptive Pricing ativo.

**QUESTÃO PENDENTE / DESCONHECIDO:** os objetos listados de Checkout Session, PaymentIntent e Subscription não trouxeram `presentment_details`. Portanto ainda não há prova de qual moeda cada comprador viu. Não usar `currency: usd` como substituto dessa prova: a documentação da Stripe diz que a moeda de integração pode continuar USD mesmo quando a moeda apresentada ao comprador é local.

**FATO CONFIRMADO NO CÓDIGO:** nenhuma criação de Checkout Session em `app/api/stripe/checkout/route.ts` declara `adaptive_pricing`. A busca no runtime encontrou apenas as chamadas `stripe.checkout.sessions.create`; portanto o comportamento observado não é uma moeda local escolhida pelo código da Kineo.

**EVIDÊNCIA EXTERNA — documentação oficial Stripe, consultada em 2026-09-02:** Adaptive Pricing localiza o preço segundo a localização do comprador, permite pagamento na moeda local e pode manter essa moeda em cobranças recorrentes. Os objetos de API continuam expondo a moeda da integração, e a moeda apresentada fica em `presentment_details`; por isso `currency: usd` sozinho não prova que o comprador viu ou pagou USD. Fonte: <https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing?platform=web&payment-ui=checkout-form>.

## Decisão operacional

**SUGESTÃO:** desativar Adaptive Pricing no Stripe Dashboard para novas Checkout Sessions e validar uma sessão real até a tela final, sem pagamento. Não alterar preços, SKUs, cupons, Tax ou assinaturas existentes.

**GATE DE AUTORIZAÇÃO:** a alteração é externa e muda o Checkout. O Codex pediu ao fundador a autorização literal `Pode desligar o Adaptive Pricing`; nenhuma escrita no Stripe foi feita antes dela.

## Preservação dos outros experimentos

**B2C — DECISÃO DE GATE:** `recurring_checkout_24h_v1` continua sem reedição. A próxima Session cruza 24 horas em 2026-09-02 14:43 BRT; antes disso não existe novo sinal terminal suficiente para mudar a superfície.

**B2B — DECISÃO DE GATE:** briefing local, planner, proposta e afiliados continuam coletando amostra. Não abrir outra UI B2B até ocorrer um `checkout_started` recorrente atribuível ao briefing local ou 20 pessoas externas gerarem o briefing. Packs, eventos brutos e sessões anônimas não contam como assinatura.

## Próxima ação

Após autorização do fundador: desligar Adaptive Pricing, abrir uma nova Checkout Session em produção sem pagar, provar que a tela final permanece em USD e registrar horário/evidência. Depois das 14:43 BRT, reconciliar a primeira Session madura do gate B2C antes de escolher qualquer nova intervenção.
