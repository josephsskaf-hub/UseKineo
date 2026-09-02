# HANDOFF CODEX → CLAUDE — RODADAS 237–238

**Data:** 2026-09-02

**Workstream:** Growth / B2C

**Escopo:** diagnóstico primeiro vídeo persistido → sinal de blob do primeiro arquivo → Checkout recorrente → pagamento exato; nenhuma alteração visual, de oferta, preço, crédito, Checkout, banco ou render.

## Resultado

**IMPLEMENTADO E TESTADO LOCALMENTE:** três scripts novos produzem um relatório agregado e fail-closed para `first_video_file_value_to_subscription_v1`:

- `scripts/first-video-file-value-to-subscription-report.mjs`;
- `scripts/measure-first-video-file-value-to-subscription.mjs`;
- `scripts/test-first-video-file-value-to-subscription.mjs`.

**FATO CONFIRMADO:** `video_downloaded` é emitido no cliente somente depois de `fetch → blob → bytes → a.click()`, com `method=blob`, `bytes`, `video_id` quando disponível e `surface`. O servidor fixa o `user_id` autenticado, mas o evento continua client-side e fire-and-forget. Por isso o relatório o chama de `confirmedClientBlobSignal`, nunca de prova independente de arquivo salvo ou causa de pagamento.

**FATO CONFIRMADO:** `videos.created_at` é o relógio da linha persistida com `status=completed`; não existe `completed_at` canônico. O relatório usa o nome `firstPersistedCompletedVideo`, não “instante físico da entrega”.

## Contrato

Uma pessoa entra na coorte somente quando:

1. possui perfil externo com e-mail conhecido e não interno;
2. seu primeiro registro histórico `videos.status=completed` tem dono único, ID único, relógio válido e `video_url`;
3. esse primeiro registro está dentro da janela móvel de 30 dias e já completou sete dias de observação;
4. não existe pagamento recorrente exato anterior ao primeiro vídeo; pagamento anterior sem Checkout conciliável vira `preexistingSubscriptionUnknown` e também sai da aquisição.

O sinal de blob exige comparação literal, sem coerção, de `method=blob`, `bytes` inteiro positivo, `video_id` exatamente igual ao primeiro vídeo e `surface` em `done_screen|history|my_videos`, a partir da fronteira confiável `2026-08-05T00:22:42Z`.

Checkout e pagamento vêm exclusivamente de `buildSubscriptionRevenueLedger`. Pack, produto desconhecido, identidade conflitante, pagamento inválido, moeda/valor ausentes, pagamento anterior ao início e Session sem vínculo não viram assinatura ou receita. A primeira Stripe Session recorrente pós-vídeo ancora a pessoa; empate de timestamp ou uma primeira Session anterior/igual ao blob nunca é limpo por uma Session posterior.

Ausência de evento recebe o rótulo `noConfirmedBlobSignal`, nunca “não baixou”. Pessoas, Stripe Sessions e receita permanecem unidades separadas; moedas nunca são somadas.

## Evidência de produção

**EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-02 15:03–15:04 BRT, contas internas excluídas:**

- 295 pessoas externas tinham primeiro vídeo persistido elegível e maduro;
- 1 era assinante exata antes do primeiro vídeo e saiu da aquisição;
- coorte de aquisição madura: **294 pessoas**;
- sinal de blob confirmado do primeiro vídeo: **110 pessoas** (37,4%);
- sem sinal confirmado e sem sinal irresolvido: **184 pessoas**;
- Checkout recorrente depois do blob: **20 pessoas / 23 Stripe Sessions** (18,2% das 110 pessoas);
- Checkout recorrente sem sinal confirmado: **17 pessoas / 25 Stripe Sessions** (9,2% das 184 pessoas);
- pagamento exato da mesma Session depois do blob: **2 pessoas / 2 Stripe Sessions / USD 3.390 minor = US$ 33,90**;
- pagamento exato sem sinal confirmado: **0 pessoas / 0 Stripe Sessions / receita zero**;
- primeira Session depois do vídeo, mas antes do blob: **2 pessoas / 2 Sessions / zero pagamento**;
- vídeos completed sem relógio: 0; eventos relevantes sem relógio: 0; perfis sem relógio: 0.

**EVIDÊNCIA DE PRODUÇÃO:** a incidência observada de Checkout foi aproximadamente 1,97× no grupo com sinal confirmado de blob (18,2% versus 9,2%). Isso é associação observacional. Seleção, intenção prévia, dispositivo e qualidade percebida podem explicar parte ou toda a diferença.

## Gate e decisão

**FATO CONFIRMADO:** a amostra supera os gates mínimos de 20 pessoas maduras, 5 com sinal, 5 sem sinal e 5 pessoas com Checkout recorrente exato. Há dois pagamentos exatos na sequência principal, portanto a próxima etapa é `ready_for_reconciliation`.

**DECISÃO:** este relatório nunca emite `ready_for_product_change`. Nenhuma tela foi alterada. Antes de uma intervenção, reconciliar os dois pagamentos e tratar a hipótese como “posse percebida do arquivo antecede intenção de compra”, não como causalidade provada. Uma eventual experiência Growth acionada após download toca a zona compartilhada de `GenerateClient` e deve ser coordenada antes com o Claude.

## Auditoria e testes

- Auditoria adversarial final: **GO; P0=0, P1=0**.
- Achados corrigidos durante a auditoria: identidade ausente fora do denominador; pagamento inválido apagando Checkout; Session posterior limpando cronologia anterior; pagamento antigo sem Checkout ligado; enums com trim; empate da primeira Session; timestamps NULL removidos pelo runner; webhook com dono nulo ligado apenas pela Stripe Session; vídeo completed elegível sem dono.
- Relatório novo: **99/99**.
- Ledger canônico: **31/31**.
- Relatório B2C canônico: **43/43**.
- Regressão B2B: **78/78**.
- Total relacionado executado: **251/251**.
- `git diff --cached --check`: limpo.
- Typecheck: somente os três erros preexistentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`.

## Decisão comercial preservada

**DECISÃO APROVADA:** UseKineo comunica e vende somente em USD. Este trabalho não altera moeda, preço, SKU, oferta ou Checkout. A configuração live do Adaptive Pricing no Stripe ainda precisa ser verificada quando o Chrome autenticado estiver disponível; não afirmar que está desligada sem essa evidência.

## Próxima alternância

**SUGESTÃO:** a próxima rodada deve voltar ao B2B. O relatório de proposta comercial ainda estava em `collecting` com zero cópias identificadas na consulta de 2026-09-02 14:36 BRT; portanto a ação seguinte deve aumentar descoberta qualificada ou uso mensurável do artefato comercial sem reeditar o próprio calculador e sem comunicação externa automática.

## Estado Git

- Base da worktree: `cfa464a4aed2fbe55a7f5c2d56582426cb5f129f`.
- Branch: `codex/b2c-first-file-value-v1`.
- Commit funcional publicado: `4d88ee08b8f974676893c9e18576820a1d295085` (`measure first video file value to subscription`).
- `origin/main` confirmado nesse SHA imediatamente após o push fast-forward.
- Deploy de produção: `dpl_3wKg9LsaczvM3L55ZJkaT7G5Sh3M`, estado `READY`, origem Git no mesmo SHA, alias `www.usekineo.com` sem erro de alias.
- O commit funcional adiciona apenas scripts de medição somente leitura e este handoff; não altera interface, checkout, preço, crédito nem pipeline de render.
