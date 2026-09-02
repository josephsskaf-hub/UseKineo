# HANDOFF CODEX → CLAUDE — RODADAS 187–188

**Data:** 2026-09-02 (BRT)
**Workstream:** Growth / confiança cambial e conversão de retomada de checkout
**Ponta de código:** `ee5270d1dada49b834ac2de03ed2c3fe72ae5301`

## 1. Decisão comercial preservada: USD é a única verdade

**DECISÃO APROVADA pelo fundador em 2026-09-02:** anúncio, preço exibido e cobrança permanecem em USD. Não prometer moeda local. A consistência até o último segundo de decisão é parte da credibilidade da Kineo.

**FATO CONFIRMADO no código:** `lib/checkoutPricing.ts` aceita somente `CheckoutCurrency = 'usd'`; a copy canônica informa que a Kineo lista e cobra em USD mundialmente e que o banco pode converter ou aplicar tarifa.

**IMPLEMENTADO em `ee5270d1`:** o teste de verdade cambial deixou de inspecionar uma lista manual de arquivos e passou a examinar todas as strings TypeScript/TSX de `app`, `components` e `lib`. Assim, uma nova promessa executável de moeda local reprova o gate mesmo em superfície que ainda não existia quando o teste foi escrito.

**NÃO MUDOU:** preço, plano, crédito, SKU, checkout, moeda, Stripe Tax, copy visível ou layout.

## 2. O evento antigo de retomada media disponibilidade, não escolha vista

**EVIDÊNCIA DE PRODUÇÃO em 2026-09-02, Supabase somente SELECT, contas internas excluídas:** na janela de 24 horas havia cinco pessoas externas com checkout. Apenas uma tinha vídeo completo antes do checkout; essa pessoa tinha dois vídeos completos, dois cancelamentos, cinco eventos `checkout_resume_banner_viewed`, duas aberturas da página de planos salvos, um fechamento do banner e zero clique de retomada ou pagamento.

**FATO CONFIRMADO no código anterior:** `checkout_resume_banner_viewed` disparava depois da resposta da API e antes das guardas de renderização. Portanto o evento podia existir sem um pixel do banner ter sido visto. Ele foi preservado como denominador técnico, não como decisão humana.

## 3. Visualização humana da escolha implementada

**IMPLEMENTADO em `ee5270d1`:**

- novo evento `checkout_resume_choice_viewed`, versão `checkout_resume_human_view_v1`;
- exige o contêiner real com as duas escolhas — `Resume checkout` e `See smaller plans` — com pelo menos 50% de visibilidade contínua por 1 segundo;
- revalida imediatamente antes do POST: oferta, rota, elemento conectado, aba visível, ausência de checkout pendente e ausência do estado stalled;
- clicar em qualquer escolha, fechar, trocar de rota, esconder a aba ou perder visibilidade interrompe o dwell;
- deduplicação por aba via `sessionStorage`, serializada com Web Lock; `stored` e `ambiguous` são terminais, `not_stored` permite uma única repetição limitada;
- metadata fechada e categórica, sem `user_id`, e-mail, URL, valor livre, texto do usuário ou UTM;
- `resume_smaller_choice_v1` é compartilhada pelos eventos de visualização e clique para preservar o contrato comercial medido.

**AUDITORIA ADVERSARIAL:** a primeira revisão encontrou dois P1: corrida entre timer e cleanup passivo e ausência de versão comercial compartilhada. Ambos foram corrigidos. Reauditoria final: **GO, zero P0 e zero P1**. Resíduo P2: a suíte executa a policy e ancora o caller, mas não monta React + IntersectionObserver reais; não bloqueia o instrumento.

**TESTADO LOCALMENTE:** `test-checkout-resume-human-view` 111/111; `test-checkout-currency-truth` 6.788/6.788; `git diff --check` limpo. Typecheck preservou exatamente os três erros preexistentes em `mrr.ts`, `me/subscription/route.ts` e `TrialDowngradeModal.tsx`, nenhum nos arquivos desta entrega.

**NÃO MUDOU:** copy, layout, CTA, preço, plano, crédito, SKU, lógica de criação de Checkout Session, render ou banco.

## 4. Gate causal da próxima intervenção na retomada

**DECISÃO DE EXPERIMENTO:** não reeditar o banner até pelo menos cinco pessoas externas com `checkout_resume_choice_viewed` **e** sete dias de janela; vale o que ocorrer por último.

Medir por pessoas distintas, nunca por eventos:

1. `checkout_resume_banner_viewed` → disponibilidade técnica;
2. `checkout_resume_choice_viewed` → escolha realmente vista;
3. clique em retomar ou ver planos menores;
4. `payment_success` de assinatura.

Como o Web Lock pode aguardar outra montagem na mesma aba, a análise não deve exigir ordenação estrita de milissegundos entre visualização e clique para a mesma pessoa. O gate causal usa presença por pessoa e versão comercial.

## 5. Estado de publicação

**PUBLICADO:** `origin/main` avançou por fast-forward para `ee5270d1dada49b834ac2de03ed2c3fe72ae5301`.

**VALIDADO EM PRODUÇÃO em 2026-09-02:** deploy Vercel `dpl_2ssLJ2Y19LQrw49s4yawhZJdUfsS` ficou `READY`, target production, alias `www.usekineo.com`, no SHA `ee5270d1dada49b834ac2de03ed2c3fe72ae5301`. Build concluído sem erro e a consulta de logs `error`/`fatal` restrita a esse deployment retornou zero linhas.

## 6. Próxima rodada sem duplicação

**SUGESTÃO:** enquanto este gate coleta amostra, alternar para uma superfície diferente do funil B2C ou para o próximo gate B2B. Não mudar de novo moeda, banner de retomada ou oferta de primeiro vídeo antes da amostra mínima registrada nos handoffs 185–188.
