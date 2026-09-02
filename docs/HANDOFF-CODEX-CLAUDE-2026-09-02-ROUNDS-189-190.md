# HANDOFF CODEX → CLAUDE — RODADAS 189–190

**Data:** 2026-09-02 (BRT)
**Workstream:** Growth / integridade do funil B2B de afiliados
**Ponta de código:** `b23cc26da9c7bb97db496b310a6e4b62ac5d780d`

## 1. A métrica “Paid customers” aceitava compra avulsa

**FATO CONFIRMADO no código anterior:** `recordAffiliateCommission()` era chamado por sete caminhos Stripe: um checkout `mode='payment'`, quatro caminhos de assinatura inicial e dois de renovação. Todos convergiam em `commitAffiliateCommission()`, que chamava `markReferralPaid()` sempre que havia `referral_id`.

**CONTRADIÇÃO:** compra avulsa e primeira assinatura compartilhavam `type:'initial'`. Assim, Starter Pack, bulk ou outro SKU avulso elegível podia mudar `affiliate_referrals.status` para `paid`, enquanto o dashboard chama esse estado de “Paid customers” e a oferta de afiliados fala em pagamentos de assinatura.

**EVIDÊNCIA DE PRODUÇÃO herdada do handoff 185–186:** havia 11 afiliados ativos e 19 linhas de clique, mas zero referrals externos conhecidos. A correção foi feita antes da primeira conversão externa, sem necessidade de backfill.

## 2. Contrato financeiro explícito implementado

**IMPLEMENTADO em `b23cc26d`:**

- novo contrato `AffiliatePaymentKind = 'one_time' | 'subscription'`;
- os sete callers Stripe declaram a classe: um `one_time`, quatro assinaturas iniciais e duas renovações;
- compra avulsa continua criando ou reconciliando exatamente a mesma comissão pendente;
- somente `subscription` pode executar `markReferralPaid()`;
- assinatura nova preserva `find → insert → mark`; retry preserva `find → mark`;
- compra avulsa preserva `find → insert`; retry faz apenas `find`;
- valor zero continua permitindo atribuição por cupom, mas não cria comissão nem promove referral;
- Rewardful continua fora do ledger custom; `referral_id=null` continua sem inventar conversão;
- `paymentKind` inválido, ausente ou desconhecido falha fechado antes de qualquer leitura ou escrita no store.

**NÃO MUDOU:** preço, plano, crédito, SKU, Checkout Session, valor bruto, moeda, taxa ou valor de comissão, Stripe Tax, aprovação de comissão, render, UI ou banco.

## 3. Auditoria e testes

**AUDITORIA ADVERSARIAL:** primeira revisão deu GO com um P2: como o build ignora TypeScript, um caller futuro com classe inválida poderia cair silenciosamente como avulso. O runtime passou a rejeitar a classe antes de `find/insert/mark`. Reauditoria final: **GO, zero P0, P1 ou P2**.

**TESTADO LOCALMENTE:** 688/688 verificações verdes:

- affiliate ledger 83/83;
- affiliate attribution 91/91;
- affiliate funnel missions 63/63;
- affiliate destinations 266/266;
- affiliate business recruitment 48/48;
- affiliate program comparison 51/51;
- affiliate landing context 55/55;
- Stripe async checkout 31/31.

**FATO CONFIRMADO DE BASELINE:** `test-affiliate-activation.mjs` falha na âncora “one-video recovery impression” tanto no patch quanto numa worktree limpa do mesmo `origin/main` (`a83e89e7`). É falha preexistente e não relacionada aos três arquivos alterados; não foi maquiada.

**TESTADO LOCALMENTE:** typecheck manteve exatamente os três erros preexistentes em `mrr.ts`, `me/subscription/route.ts` e `TrialDowngradeModal.tsx`, nenhum nos arquivos desta entrega. `git diff --check` limpo.

## 4. Gate causal de afiliados

**DECISÃO DE EXPERIMENTO:** esta entrega corrige o denominador; não cria nova superfície nem antecipa sucesso do canal.

Para futuras pessoas externas, medir por pessoa:

1. referral atribuído;
2. checkout por classe `one_time | subscription`;
3. comissão registrada;
4. `affiliate_referrals.status='paid'`;
5. `payment_success` de assinatura e receita real.

**GATE DE PARADA:** qualquer referral `paid` cujo pagamento canônico seja somente avulso é violação imediata. Compras avulsas podem e devem continuar gerando comissão sem virar “assinante pago”.

Preservar a atual superfície de afiliados até pelo menos cinco pessoas externas referidas ou a primeira assinatura externa, conforme handoff anterior. Contar pessoas, nunca eventos.

## 5. Estado de publicação

**PUBLICADO:** `origin/main` avançou por fast-forward para `b23cc26da9c7bb97db496b310a6e4b62ac5d780d`.

**VALIDADO EM PRODUÇÃO em 2026-09-02:** deploy Vercel `dpl_HonNKdouytvxiGgY3rM5uqRgdJhj` ficou `READY`, target production, alias `www.usekineo.com`, no SHA `b23cc26da9c7bb97db496b310a6e4b62ac5d780d`. Build concluído sem erro e logs `error`/`fatal` restritos ao deployment retornaram zero linhas.

## 6. Integridade operacional do Git

**FATO CONFIRMADO:** um arquivo local `.git/refs/heads/zz-lock-morto-1788324191` com zero bytes bloqueava `git fetch`. O arquivo vazio foi movido, sem exclusão, para `C:\tmp\usekineo-git-invalid-ref-backup-zz-lock-morto-1788324191.empty`; o fetch voltou a funcionar e a ponta remota não mudou durante a correção.

## 7. Próxima rodada sem duplicação

**SUGESTÃO:** alternar agora para B2C em uma superfície diferente de moeda, retomada de checkout e oferta do primeiro vídeo, que estão em gate. Não reabrir UI de afiliados antes da amostra mínima.
