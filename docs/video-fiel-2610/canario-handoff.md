# Canário manual do cumprimento do pedido — 26/10/2026

**IMPLEMENTADO / TESTADO LOCALMENTE, DESLIGADO.** `TASK_FULFILLMENT_CANARY_ENABLED=false` continua em `lib/regua95/taskFulfillmentCanary.ts`. Não houve avaliação paga, INSERT real, leitura de `.env`, nova extração, render, cron, publicação ou alteração de nota antiga. Verificação local em 26/10/2026, 03:00 BRT.

## Contrato para o ADM

**FATO CONFIRMADO:** POST `/api/admin/coerencia/canario` (`route.ts:12`) retorna 409/disabled antes de importar autenticação, criar cliente, ler chave, avaliar ou escrever. Habilitado futuramente, exige sessão e allowlist admin, recusa origem estrangeira e limita o corpo a 8192 bytes e três casos. Nenhum botão ou cron foi adicionado nesta branch.

```json
{
  "cases": [
    {
      "videoId": "UUID do vídeo",
      "generationId": "UUID da geração",
      "coherenceEventId": "UUID exato do evento coherence_v2",
      "pixelEventId": "UUID exato do evento pixel_score",
      "confirmed": {
        "source": "admin_manual",
        "seconds": 15,
        "mode": "idea",
        "language": "pt"
      }
    }
  ]
}
```

**FATO CONFIRMADO:** um a três casos, vídeo sem repetição, quatro UUIDs obrigatórios, `seconds` em 15/35/45/60/90, `mode` em idea/script; `language` opcional. Texto, URL de frame, chave, modelo ou campo extra no corpo são recusados. `confirmed.source=admin_manual` é obrigatório. Isso confirma a configuração para a avaliação manual; **não prova aceite histórico do cliente**.

**FATO CONFIRMADO:** resposta 200 inclui `cases[].result` completo, igual ao evento salvo: `task_fulfilled`, `findings` (requested/observed/defect/severity/scene/frame/time), `numerical_score`, `incomplete_reasons`, `score_basis`, `audio_evaluated:false` e `calibration_status:not_calibrated`. A UI pode mostrar a justificativa imediatamente sem outra chamada ao modelo. Uma reserva existente ou orçamento esgotado produz `evaluated:0`/nenhum resultado novo; não é uma nova aprovação.

**FATO CONFIRMADO:** consulta futura ao parecer salvo: `events.name=task_fulfillment_canary`, `session_id=videoId`, `user_id=proprietário do vídeo`, `metadata.version=task_fulfillment_canary_20261026` no topo; o parecer está em `metadata.result`. O evento conserva IDs das duas evidências e geração, `idea_source` original, `request_basis`, configuração explicitamente confirmada pelo admin e `historical_customer_acceptance_verified:false`. Não misturar a nota experimental com a régua 95.

## Evidência exata, sem backfill

**FATO CONFIRMADO:** `loadStoredCanaryCase` busca somente o vídeo exato concluído e os dois eventos exatos. Os filtros e a rechecagem exigem o mesmo proprietário, vídeo, geração, session_id e render_id; produto filme. Reutiliza `coherence_v2.metadata.evidence` e `pixel_score.metadata.frame_urls/frames`, com índices/tempos únicos e válidos. Não procura registro mais próximo, janela ou fonte alternativa. Nenhuma URL do corpo é aceita.

**FATO CONFIRMADO:** fonte `pedido_direto` ou `script_written` é preservada como original_request; `roteiro` como supplied_script. Fonte desconhecida ou só `script_written_janela`, texto/cena faltante, URL/tempo/índice de frame inválido ou vínculo de proprietário divergente retornam 422/unknown **antes de ler a chave, reservar ou avaliar**. Não há nota falsa nem tentativa de buscar novos frames. URLs históricas expiradas podem impedir a avaliação; a resposta deve permanecer desconhecida.

## Reserva atômica e teto de gasto

**EVIDÊNCIA DE PRODUÇÃO — fonte: SELECT somente leitura do coordenador/root, 26/10/2026:** no projeto de produção `cqqukkvjjrguayiyjvhh`, `information_schema` confirmou `public.events.events_pkey` PRIMARY KEY sobre `id`, UUID NOT NULL. A migration local `005_events_staging.sql` sozinha não provava isso, pois se declara STAGING ONLY. Esta implementação usa a verificação de produção informada pelo coordenador; este agente não escreveu no banco nem executou essa consulta.

**FATO CONFIRMADO:** `storedCanaryAdapters` reserva um `events.id` UUIDv5 determinístico por versão+vídeo com INSERT único e retorno do ID. `23505` significa já reservado e impede outra chamada. Não usa SELECT-then-INSERT, upsert, update, delete, lease, desbloqueio ou migration.

**FATO CONFIRMADO:** há também três IDs determinísticos de slots de orçamento por versão. Mesmo POSTs concorrentes com vídeos diferentes só conseguem três reservas globais. Claim e slot são consumidos antes do modelo e permanecem consumidos em timeout/falha/erro de gravação. Falha ambígua do INSERT não autoriza avaliação. Outra rodada paga exigiria nova versão/aprovação explícita; não há reset automático.

**FATO CONFIRMADO:** somente eventos experimentais novos: `task_fulfillment_canary_claim`, `task_fulfillment_canary_budget`, `task_fulfillment_canary`. O resultado usa ID separado e INSERT; nenhuma nota coherence_v2/pixel_score/fast_coherence é sobrescrita. O modelo é chamado pelo `runTaskFulfillmentCanaryBatch` existente, uma tentativa por caso, com os frames já gravados.

## Validação e limites

**TESTADO LOCALMENTE:** `node docs/video-fiel-2610/canario-offline.mjs`: **80 verificações, cinco mutações rejeitadas**, rede e Supabase simulados. Inclui flag false sem tocar getters, admin/CSRF, corpo inválido, proveniência/owner/frame incompletos, concorrência por vídeo, teto global de três, timeout, gravação falha e retorno completo sem segunda avaliação. Mutações: retirar gate; omitir owner; gastar após duplicate; ampliar orçamento; fingir aceite histórico. TypeScript bruto (`node node_modules/typescript/bin/tsc --noEmit --incremental false`) passou, exit 0.

**QUESTÃO PENDENTE / DESCONHECIDO:** não foi comprovada execução real do endpoint, custo faturado ou aderência do modelo. A avaliação paga e a publicação continuam dependentes da aprovação final do fundador; a flag permanece false. Não afirmar que a medição está calibrada, que o áudio foi ouvido ou que amostra estática prova movimento.

**FONTES OFICIAIS CONSULTADAS em 26/10/2026:** [INSERT e retorno via select](https://supabase.com/docs/reference/javascript/insert), [filtros](https://supabase.com/docs/reference/javascript/using-filters) e [changelog](https://supabase.com/changelog). A implementação usa INSERT com chave primária já confirmada, sem alterar schema ou SDK. Verificação de banco real nesta entrega foi substituída por testes simulados por determinação explícita do escopo.
