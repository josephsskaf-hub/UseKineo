# HANDOFF CODEX → CLAUDE — RODADAS 191–192

**Data:** 2026-09-02 (BRT)
**Workstream:** Growth / verdade da oferta pública no último metro B2C
**Commit de código:** `9147505b02a2058bfbe750c9b4e786bff02886d1`
**Ponta compartilhada ao escrever:** `9395b26be13d71bccc2d8a0655b73a37532ee35c` — contém `9147505b` como ancestral

## 1. A frase pública podia terminar em preço cheio

**FATO CONFIRMADO no código anterior:** o `WelcomeOfferModal` promete “first month is 20% off” e “the discount applies itself at checkout” e envia `promo=WELCOME20` (`components/WelcomeOfferModal.tsx:249,253,275`). A rota tentava criar ou localizar o cupom, mas capturava a falha e seguia para uma Checkout Session sem desconto.

**CONTRADIÇÃO:** o checkout e a oferta já são USD-only, mas uma falha de integração ainda podia trocar uma promessa pública de 20% por preço cheio no instante da decisão. A moeda não era o problema; a divergência entre o que foi dito e o que seria cobrado era.

## 2. Contrato fail-closed implementado

**IMPLEMENTADO em `9147505b`:**

- `WELCOME20` é reconhecido antes de `checkout_attempted` (`route.ts:827,945`);
- telemetria fechada, sem código cru, ID Stripe, e-mail ou texto livre: `requested → verified → applied | failed`;
- `verified` significa que os objetos Stripe passaram; `applied` só nasce depois que a Checkout Session existe (`route.ts:2131-2146`);
- a validação exige o PromotionCode exato e ativo, não expirado/esgotado, sem restrição de primeira compra, valor mínimo ou moeda escondida, e sem cliente incompatível;
- o Coupon precisa ser exatamente `KINEO_WELCOME20`, válido, não apagado, `percent_off=20`, `duration=once`, sem `amount_off`, expiração, `currency_options` ou restrição de produto;
- `resolvePromisedPublicPromo()` captura not-found, throw e objeto divergente (`lib/growth/publicPromoTruth.ts:180-205`);
- um invariant executável envolve toda criação recorrente da Session, inclusive o retry de reparo de Customer (`route.ts:2069`, `publicPromoTruth.ts:215-223`);
- promessa não comprovada termina em 409/redirect honesto, “you have not been charged”, antes de `sessions.create`;
- sucesso carrega a categoria e o estado na Session e na Subscription;
- a URL pós-pagamento e o valor de conversão passam a usar o primeiro débito real: Creator `$12.00`, Studio `$23.20`, derivados de 20%, sem mudar a cobrança;
- o estado categórico entra na assinatura de idempotência, impedindo reutilizar uma Session anterior ao contrato novo.

**NÃO MUDOU:** copy, modal, preço de lista, moeda, plano, crédito, SKU, trial, direito, checkout privado, intro, recuperação, pagamento dinâmico, Stripe Tax, render, banco ou migration.

## 3. Testes, baseline e auditoria

**TESTADO LOCALMENTE:** 7.314/7.314 verificações verdes nas suítes executadas de promo público, modal, moeda, Stripe async, leitura de profile, janela de Session, verdade de falha, fallback, guidance, value context, prova visual, cancelamento e ponte de autenticação.

O teste novo executa a policy, o resolver assíncrono e o invariant com Stripe falso:

- promoção não verificada → zero chamadas a `checkout.sessions.create`;
- promoção verificada → exatamente uma chamada;
- checkout comum → exatamente uma chamada;
- not-found, lookup throw, Coupon errado e restrição oculta → rejeição nomeada;
- todas as restrições nativas do Stripe 16.2/API `2024-06-20` têm caso red/green.

**FATO CONFIRMADO DE BASELINE:** o typecheck mantém exatamente três erros preexistentes (`mrr.ts`, `me/subscription/route.ts`, `TrialDowngradeModal.tsx`) e nenhum nos três arquivos da entrega. O build local compilou o patch e depois falhou na coleta por `OPENAI_API_KEY` ausente; uma worktree limpa do mesmo `origin/main` compilou e falhou no mesmo ponto, sem ler `.env.local`.

**FATO CONFIRMADO DE BASELINE:** `test-pricing-saved-checkout.mjs` e `test-checkout-setup-failure-return.mjs` falham com as mesmas âncoras tanto no patch quanto na worktree limpa; não foram maquiados nem incluídos no placar verde.

**AUDITORIA ADVERSARIAL:** a primeira revisão encontrou dois P1 — restrições nativas do PromotionCode não modeladas e teste de integração por ordem textual. Ambos foram corrigidos. A segunda revisão encontrou um P2 de semântica `applied` antes da Session; corrigido com o estado intermediário `verified`. Veredito final: **GO, zero P0/P1/P2**.

## 4. Gate causal

**DECISÃO DE EXPERIMENTO:** não reabrir o `WelcomeOfferModal` nem sua oferta antes de pelo menos cinco pessoas externas distintas com a promessa registrada **e** sete dias completos, o que ocorrer por último.

Medir por pessoa externa, excluindo contas internas:

1. `public_promo_state=requested`;
2. `verified | failed`, com razão fechada;
3. `applied` + `checkout_started`;
4. `payment_success` de assinatura;
5. receita real e plano.

**GATE DE PARADA IMEDIATA:** qualquer `checkout_started` com `public_promo_kind=welcome_first_month_20` e estado diferente de `applied`, ou qualquer primeiro débito diferente de 80% do preço mensal canônico.

## 5. Publicação e risco declarado

**PUBLICADO:** `origin/main` recebeu `9147505b` por fast-forward. O Claude publicou depois `9395b26b`, que preserva este commit como ancestral; não houve colisão de história.

**VALIDADO EM PRODUÇÃO em 2026-09-02:** deployment Vercel `dpl_73UC8C67FF5XUcHbArRGxCJ5GsoD`, Next.js, target production, SHA `9147505b`, estado `READY`, aliasado em `www.usekineo.com`, sem erro de alias.

**RISCO CONHECIDO / FORA DO ESCOPO:** `FIRST50`, `CREATOR20`, `CREATOR30` e `CREATOR50` ainda carregam comentários e comportamento best-effort históricos. Esta entrega prova apenas a promessa pública viva do modal `WELCOME20`; não declarar que todo cupom antigo do produto já é fail-closed. Inventariar distribuição ainda ativa antes de mexer neles.

## 6. Próxima rodada sem duplicação

**SUGESTÃO:** alternar para B2B em uma superfície diferente de afiliados e desta rota Stripe. Preservar os gates de `WELCOME20`, retomada de checkout, moeda e afiliados; apenas medir até a amostra mínima.
