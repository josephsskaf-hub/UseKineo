# HANDOFF CODEX → CLAUDE — 2026-09-01 · RODADAS 181–182

**Base lida:** `origin/main = e544305b8194bc52b2cf7bf4a23762c3e4b14f07`
**Divisão preservada:** Codex em Growth B2C/B2B; nenhum arquivo de render, cena, voz, legenda, crédito ou admin foi alterado.

## Decisão comercial registrada nesta rodada

**DECISÃO APROVADA (fundador, 01/09/2026).** Preço, comunicação comercial e cobrança permanecem somente em **USD**. A coerência entre o que a Kineo anuncia e o que o Stripe cobra é parte da confiança no último segundo de decisão; não se promete moeda local nem conversão automática.

**FATO CONFIRMADO.** `lib/checkoutPricing.ts:49` restringe `CheckoutCurrency` a `'usd'`, e `lib/checkoutPricing.ts:615-617` resolve toda origem para USD.

**CONTRADIÇÃO técnica, sem caminho vivo.** `app/api/stripe/checkout/route.ts:637,658` ainda contém propriedades históricas `brl`/`inr` em dois objetos tipados como `Record<'usd', number>`. `resolveCheckoutCurrency()` nunca as retorna, mas elas geram dois dos cinco erros de typecheck da ponta. Não foram corrigidas nesta entrega porque o escopo é outro e a limpeza deve entrar isolada.

---

## Rodada 181 — B2C · oferta comercial some depois de falha opcional

### Evidência

**EVIDÊNCIA DE PRODUÇÃO (Supabase SELECT, fronteira 2026-09-01T19:47:24.677Z; contas internas excluídas).** Quatro pessoas externas chegaram a `video_generation_completed|video_ready_viewed`; duas registraram `result_video_value_sampled`; nenhuma registrou exposição comercial pós-vídeo, pricing, checkout ou pagamento. A amostra é pequena e não prova causalidade.

**EVIDÊNCIA DE PRODUÇÃO (Vercel Runtime Logs, mesma fronteira).** Houve quatro `POST /api/next-episode`, todos HTTP 502, todos com `[next-episode] sem marcadores, descartado`. Os horários foram 21:16, 23:28, 01:24 e 02:09 UTC. Logs e eventos não compartilham identificador suficiente para atribuir esses quatro requests às quatro pessoas; não fazer essa inferência.

**FATO CONFIRMADO.** O cliente reserva o slot comercial quando `trialRepeatDecision.action === 'episode'` (`app/(dashboard)/generate/GenerateClient.tsx:4753-4764,5008-5016,10616-10618`). A chamada opcional ignora resposta não-200 e candidato inválido (`:10388-10425`). O card de episódio só renderiza quando há candidato ou loading (`:14503-14518`), enquanto o card de assinatura exige `!showTrialRepeatEpisode` (`:14637-14645`). Depois do 502, `loading=false`, `nextEpisode=null`, mas `showTrialRepeatEpisode=true`: o slot fica vazio.

### Estado

**IMPLEMENTADO EM PACOTE TEMPORÁRIO, NÃO APLICADO.** Foi desenhado um único state machine por resultado/base/idioma com timeout de 28s, cancelamento, proteção contra corrida A→B e ownership único entre loading, episódio e assinatura. O helper temporário compilou isoladamente. A revisão adversarial exigiu e o desenho já incorporou timeout, isolamento por resultado, unmount e telemetria alinhada ao JSX.

**BLOQUEIO DE AUTORIZAÇÃO.** `GenerateClient.tsx` é zona compartilhada: Claude é dono do fluxo de criação; Codex é dono do slot comercial. O fundador foi informado e precisa responder explicitamente `Autorizo essa alteração no GenerateClient` antes de o patch ser aplicado. Nenhuma linha desse pacote entrou na worktree ou no Git.

### Gate após futura publicação

- preservar a variante até 10 pessoas externas com `result_video_value_sampled` depois da fronteira;
- loading não pode emitir impressão de oferta;
- `ready` mede episódio; `unavailable` mede o card recorrente existente;
- parar imediatamente em impressão duplicada, ação ausente ou qualquer efeito em render/crédito/checkout.

---

## Rodada 182 — B2B · denominador dos packs só existe depois do ACK

### Causa

**FATO CONFIRMADO.** `AgencyPacksClient` gravava `sessionStorage=1` antes de chamar `trackEvent('agency_bulk_page_viewed')`. `trackEvent()` só retorna `true` quando `/api/events` confirma `stored:true` (`lib/analytics.ts:432-477`). Uma falha transitória, HTTP inválido ou `stored:false` apagava permanentemente aquela visita do denominador da sessão.

**HIPÓTESE causal.** A amostra B2B pode estar subcontada e fazer o board interpretar perda técnica como falta de demanda. Evento ausente não deixa linha; a quantidade histórica perdida é **DESCONHECIDA**.

### Mudança

**VALIDADO EM PRODUCAO (02/09/2026 03:00 UTC).** Commit `77c2107dba38a5bd8d18e74f7525292ca44a27d9` publicado em `origin/main`; deploy `dpl_9dp8Vxaa6XQCm9vmYC6otJ3vmiZT` em estado `READY`, target production.

**EVIDENCIA DE PRODUCAO.** `https://www.usekineo.com/ai-shorts-for-agencies` respondeu HTTP 200 com assets presos ao deploy acima. O bundle da pagina contem `viewed:v3`, `agency_bulk_page_viewed` e `AbortController`, e nao contem o marker v2. A varredura Vercel de 30 minutos encontrou zero erro de runtime na rota.

- `lib/growth/reliablePageView.ts`: recorder single-flight, máximo de dois transportes, marker somente após ACK, latch em memória se storage for negado e lifetimes compartilhados via `AbortSignal`;
- `app/ai-shorts-for-agencies/AgencyPacksClient.tsx`: usa o recorder sem alterar DOM, copy, CTA, href, preço ou checkout;
- marker novo `viewed:v3`: o preclaim histórico `v2` não consegue suprimir a primeira medição íntegra;
- unmount barra o retry; StrictMode/remount mantém o retry se ainda houver uma lifetime ativa;
- `scripts/test-reliable-page-view.mjs`: casos executáveis de ACK, concorrência, remount, storage negado, marker legado, teto, unmount e StrictMode;
- `scripts/test-b2b-distribution.mjs`: âncora atualizada com o motivo da fronteira v2→v3.

### Gates locais

- `test-reliable-page-view`: **10/10**;
- `test-b2b-bulk-page`: **32/32**;
- `test-b2b-distribution`: **85/85**;
- `test-bulk-checkout-truth`: **63/63**;
- `test-money-truth-contract`: **308/308**;
- `git diff --check`: limpo;
- typecheck: os mesmos **5 erros da ponta limpa**, zero nos arquivos tocados. A comparação foi executada no mesmo SHA limpo.
- build local: webpack **compilou com sucesso**; a coleta de paginas parou porque a worktree isolada nao possui `OPENAI_API_KEY`. Nenhum segredo foi lido ou copiado. A Vercel continua sendo o gate de build com env de producao.

**REVISÃO ADVERSARIAL.** Primeira versão recebeu NO-GO por reutilizar o marker envenenado v2 e deixar retry sobreviver ao unmount. A v2 fecha os dois. Parecer final: **GO; P0=0, P1=0, P2=1 futuro**. O P2 é apenas portabilidade: o helper genérico usa `window.setTimeout`, mas o único caller atual é client-side dentro de `useEffect`.

### Gate pós-deploy

- registrar SHA/deploy e fronteira UTC;
- contar pessoas externas identificadas por `DISTINCT user_id` e anônimos separadamente por `DISTINCT session_id`;
- acompanhar `agency_bulk_page_viewed → agency_bulk_pack_clicked → bulk_checkout_started → bulk_purchase_completed|payment_success` por `entry`;
- vigiar razão de evento por `(ator, entry)` próxima de 1;
- não reeditar UI/oferta antes de 20 sessões externas ou do primeiro avanço humano no funil.

### Próximo dono

- **Codex:** preservar a variante B2B ate o gate de amostra e aplicar o fallback B2C somente apos autorizacao especifica.
- **Claude:** nenhuma ação necessária; apenas preservar os arquivos desta entrega ao rebasear sua frente.
