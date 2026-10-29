# Primeiro filme grátis — Kling 4 (28/10/2026)

**DECISÃO APROVADA:** pedido do fundador de 28/10/2026, registrado em `docs/DECISIONS.md`: testar por sete dias o primeiro filme grátis em Kling 4, 15 s, nos países já admitidos. Revisão e publicação pelo Claude; esta entrega não aplica migração nem faz render pago.

**FATO CONFIRMADO / IMPLEMENTADO:** `lib/kling4TrialPolicy.ts:2` contém o único interruptor `KLING4_TRIAL_LIVE=true`. `false` faz novos pedidos seguirem o Seedance existente. Claims já aceitos continuam recuperáveis. `lib/freeFilmPolicy.ts` não foi alterado. Não muda oferta, créditos, anúncios, Kling 3/Hollywood ou planos pagos.

**FATO CONFIRMADO / IMPLEMENTADO:** o nascimento usa a admissão existente e comprova ausência de filmes anteriores e débitos cinematográficos não estornados, excluindo o próprio débito. Erro nessa leitura conserva Seedance. Pedidos financiados do produto Kids separado continuam no fluxo próprio; um desenho feito pelo trial normal pode participar. Fonte: `app/api/generate-video-cinematic/route.ts:3596`, bloco `kling4TrialCandidate`.

**FATO CONFIRMADO / IMPLEMENTADO:** `lib/kling4Trial.ts:6` envia um único `multi_prompt`, com os prompts das cenas e soma de 15 s, `resolution:720p`, `aspect_ratio:9:16`. O still existente do primeiro quadro seleciona `kling/v4/image-to-video` com `start_image_url`; sem still, `kling/v4/text-to-video`. Referências oficiais consultadas em 28/10/2026: [I2V/schema](https://fal.ai/models/kling/v4/image-to-video/api), [T2V](https://fal.ai/models/kling/v4/text-to-video), [fila fal](https://fal.ai/docs/documentation/model-apis/inference/queue).

**FATO CONFIRMADO / IMPLEMENTADO:** `supabase/migrations/20261029011109_kling4_trial_daily_budget.sql:28` reserva no banco antes do POST pago. Livro em milliUSD, dia UTC, teto 60000; cada pedido reserva 2355 (= 15 × US$ 0,157 = US$ 2,355; exibição arredondada US$ 2,36). Cabem 25 reservas, US$ 58,875; a próxima é negada. Lock transacional da identidade e `FOR UPDATE` da linha diária; duplicata não autoriza outro POST. RPCs exclusivas de service-role; tabelas com RLS. Não há devolução de reserva em falha ambígua.

**FATO CONFIRMADO / IMPLEMENTADO:** cap seleciona `seedance15_cap`; banco indisponível, recusa, 503, resultado inválido ou tempo esgotado selecionam `seedance15_fallback`. Nenhum desses caminhos repete o POST Kling ou cria outro débito de créditos. Seguem as cenas Seedance existentes, com os próprios mecanismos de recuperação/estorno se esse fornecedor também falhar. Fontes: `lib/kling4Trial.ts:78`, `app/api/generate-video-cinematic/route.ts:7377`.

**FATO CONFIRMADO / IMPLEMENTADO:** a espera Kling é limitada a 120 s e ao instante de entrada + 250 s, conservando pelo menos 50 s do orçamento da rota para Seedance/publicação. Sem tempo de entrada suficiente, não reserva Kling. A URL concluída é assinada no claim e o status usa essa prova, sem uma segunda consulta ao fornecedor. Fontes: `app/api/generate-video-cinematic/route.ts:7377`, `lib/kling4TrialClaim.ts:15`.

**FATO CONFIRMADO / IMPLEMENTADO:** `lib/compose.ts:2444` reproduz o vídeo Kling inteiro desde zero, volume `0%`, com nossa narração e música existentes; não o divide em três cópias. A montagem segue o aspecto assinado 9:16, mesmo se o navegador mandar quadrado/horizontal. Todas as três saídas do experimento têm piso 15 s. Narração maior é preservada; o vídeo pode repetir após os 15 s completos. O gate lê duração observada sem arredondar e reprova menos de 15 s. Fontes: `app/api/compose/route.ts:830`, `lib/compose.ts:2131`, `lib/free15Gate.ts:69`.

## Medição dos sete dias

**FATO CONFIRMADO / IMPLEMENTADO:** um evento imutável `free_film_engine_used` por usuário/geração, na mesma transação do resultado do livro. Campos: `engine_used`, `cost_usd`, `cost_basis`, `country`, `seconds`, `film_id`, `generation_id`. Replays do nascimento e recuperação pela montagem reparam o registro idempotentemente. Fonte: `lib/kling4TrialBudget.ts:27` e RPC `record_kling4_trial_film`.

**FATO CONFIRMADO / limite contábil:** `cost_usd` mede a reserva prudente do Kling, com `cost_basis=reserved_upper_bound`, não uma fatura consultada na fal. Falha comprovadamente anterior ao POST informa zero; após POST pode informar US$ 2,355 mesmo se o fornecedor não cobrar a falha. O teto continua retendo essa reserva. Custos de still, voz, música e Seedance não são gastos Kling desse teto.

**SUGESTÃO / procedimento D+7:** fixar a janela de exposição a partir do deploy do Claude; registrar início/fim UTC e SHA publicado. Desligar o interruptor na revisão de sete dias, salvo nova decisão do fundador. Não há agendamento ou monitoramento automático nesta entrega.

**FATO CONFIRMADO / junções disponíveis:**

- `free_film_engine_used.user_id` + `metadata.generation_id` → evento `compose_submission_claim`, mesmo usuário e `session_id`, `metadata.status='done'` → `metadata.render_id` → `videos.render_id`, mesmo usuário e `videos.status='completed'`. Fontes: `lib/cinematic/claim.ts`, `app/api/compose/route.ts`, `app/api/compose/status/[renderId]/route.ts`.
- Download efetivo: `video_downloaded`, mesmo usuário e `metadata.video_id=videos.id`. Fonte: `lib/videoDownload.ts:846`. Download sem `video_id` fica sem atribuição exata; clique não substitui download.
- Chegada ao checkout: `checkout_started`, mesmo usuário, depois da entrega, dentro da janela declarada; a rota emite após criar a sessão Stripe. Fonte: `app/api/stripe/checkout/route.ts:2998`.

**SUGESTÃO / denominadores:** por motor e país, contar pessoas externas distintas com filme concluído; numeradores são pessoas desse mesmo grupo com download do filme e com checkout posterior. Excluir internos pela regra canônica `lib/internalAccounts.ts:55`; não excluir quem pagou depois, pois isso removeria conversores. Mostrar também pedidos aceitos, entregas e falhas, separados da taxa de download. Não usar quantidade de eventos como quantidade de pessoas.

**QUESTÃO PENDENTE / DESCONHECIDO:** a base de download de 37% foi informada pelo fundador neste pedido (28/10/2026); janela/denominador não foram consultados nesta execução. Recalcular com a mesma definição antes de comparar. Cap/fallback não formam um controle aleatório: horário, país e indisponibilidade podem diferir. Uma diferença observada entre motores não comprova causalidade.

## Verificação e passagem para o Claude

**TESTADO LOCALMENTE — 28/10/2026:** guardas em `tests/kling4Trial.test.mjs`; SQL e RPCs em `tests/kling4TrialBudget.cjs`; regressões do gate em `scripts/test-filme15-gate-integration-2610.mjs` e `scripts/test-filme15-perfeito-2610.mjs`. Rede, SDKs, credenciais e render pago bloqueados nos testes. PGlite verifica SQL, limites, duplicata, rollover UTC, permissões e rollback atômico do evento; serializa requisições e não prova concorrência entre conexões reais de produção.

**TESTADO LOCALMENTE — resultado em 28/10/2026:** 16 guardas aprovadas; prova SQL aprovada; integração do gate aprovada (nove verificações); teste comportamental rejeitou nove mutantes. Typecheck completo `tsc --noEmit --incremental false --pretty false`, exit 0; `git diff --check` limpo. Comandos acima executados sem render pago, conexão a produção ou arquivos de ambiente.

**SUGESTÃO / comandos de conferência local:**

```powershell
node --test tests/kling4Trial.test.mjs
node tests/kling4TrialBudget.cjs
node scripts/test-filme15-gate-integration-2610.mjs
node scripts/test-filme15-perfeito-2610.mjs
npx tsc --noEmit --incremental false
git diff --check
```

**QUESTÃO PENDENTE / DESCONHECIDO:** migração ainda não aplicada; nenhum render Kling desta branch, publicação ou efeito de conversão foi validado em produção. Sem a migração, a reserva falha fechada e o filme segue Seedance; não interpretar isso como exposição Kling.

**O que pode melhorar — QUESTÃO PENDENTE:** latência real do Kling de 15 s neste pipeline. O prazo síncrono pode reservar/custear um Kling que termina depois do fallback. O canário deve conferir tempo, motor e livro antes da publicação.

**Próximo passo recomendado — SUGESTÃO:** Claude revisar o SHA, aplicar a migração, fazer o único render real de canário autorizado e conferir: primeira conta elegível, payload 720p/9:16, cenas contínuas, ausência de áudio Kling, voz/música presentes, duração MP4 observada ≥15 s, débito sem duplicação, evento e reserva únicos. Publicar após essa prova; no D+7 medir entrega/download/checkout e decidir desligamento ou continuação.
