# Avaliador: validação de evidência — 26/10/2026

**DECISÃO APROVADA na sessão:** Joseph autorizou corrigir vídeos e o robô avaliador; foco no filme curto de 15s. Preparação local, sem publicar, gastar ou reprocessar produção. Base `9d8d3fad413d94798081528dbd61f3ba7848a76a`.

**IMPLEMENTADO:** respostas incompletas não recebem nota; quadros ausentes/duplicados, índices inválidos, leitura única e defeitos sem explicação/localização ficam explícitos. Tetos de pixel sobrevivem à média; duas flags no mesmo quadro não contam como dois quadros. Duas respostas concordantes são marcadas, não recusadas por concordarem.

## Contrato para a tela

- `lib/regua95/evidence.ts`: `EvidenceAssessment`, `EvidenceCoverage`, `EVIDENCE_VALIDATION='2026-10-26'`.
- Resultados: `score:number|null`, `evidence_validation`, `evidence_status:'complete'|'incomplete'`, `evidence_reasons:string[]`, `coverage`.
- Cobertura: `expected_frames`, `judged_frames`, `unique_frames` (`number|null`); `expected_readings`, `valid_readings` (`number`); `readings_identical:boolean`; `independent_readings:false`; `audio_evaluated:false`.
- Coerência: `fidelity_basis:'original_request'|'supplied_script'|'unverified_window'`, `idea_fidelity:number|null`, `evidence_limits`. Roteiro legítimo permanece avaliável pela correspondência com as cenas; não recebe uma metade perfeita por comparar a ideia consigo mesma.
- `contexto.ts::combinarNotaPorProduto(product,{coerencia,pixel,ugc})`: filme exige texto+pixel; Ads/clipe exige pixel; UGC exige pixel+UGC. Root aplica estados do histórico antes de chamar. Helper histórico `notaRegua` preservado para consumidores não migrados.
- Eventos/identificadores históricos preservados. Tentativa com `evidence_validation` não é automaticamente comprada de novo mesmo quando incompleta. Sem alteração de cron, env, banco, modelos ou preços.

## Canário preparado, desligado

`taskFulfillmentCanary.ts` exporta `TASK_FULFILLMENT_CANARY_ENABLED=false`, `TASK_FULFILLMENT_VERSION`, `buildTaskFulfillmentMessages`, `normalizeTaskFulfillment`, `scoreTaskFulfillmentCanary`, `runTaskFulfillmentCanaryBatch`.

Entrada exige pedido, proveniência, roteiro, cenas, quadros já existentes e configuração confirmada (`seconds`, `mode`, língua opcional). Duração desconhecida não vira falha; filme15s não é comparado com60s nem exige cinco cenas. Brief narrado literalmente, objeto incompatível e ação não demonstrada são examinados com referência à cena e, para achado visual, quadro/tempo fornecidos. Frames isolados não provam áudio ou movimento completo.

Resultado separado: `task_fulfilled:yes|no|unknown`; achados com excerto exato, observação, defeito e severidade; `numerical_score:number|null`, `calibration_status:not_calibrated`. Âncoras experimentais0/60/90/100 correspondem a tarefa não entregue/defeito de cena/cosmético/sem defeito observado; não são nota comercial nem limiar calibrado. Desconhecido mantémnull.

Batch limitado a3casos/3chamadas, uma tentativa por caso, sem render/extração/retry. Adapter deve fornecer `claimCase(key,version)` **atômico** e `save(key,result)`; falha preserva reserva e salva desconhecido. Flagfalse retorna antes de chave, claim, modelo e escrita. Endpoint/CLI manual e persistência pertencem à integração root; nenhum collector chama o canário.

## Evidência e limites

**TESTADO LOCALMENTE:** `node docs/video-fiel-2610/juiz-offline.mjs` executa módulos reais em VM, ambiente/rede/banco bloqueados, HTTP simulado. 16grupos passam; 7mutantes rejeitados. Batch com flag transformada somente em memória:3casos/3chamadas simuladas; repetição0chamadas adicionais. Typecheck bruto passou. Resultado privado: `C:/Users/josep/.codex/outputs/coerencia-audit-2610/juiz-offline-result.json`.

**REGRESSÕES DE CONTRATO EM TESTES ANTIGOS:** `test-meta95-regua-1910`:25pass/5fail (C2/C3/P2/P3 fixtures incompletas; M3 âncora antiga). `test-meta95-ugc-1910`:17pass/1fail (U5 pixel com2quadros). Não alterados. Reancorar fixtures com dados completos e dois julgamentos, mantendo asserções de defeito/cap; não relaxar validação do produto. Novo teste cobre caps/exceção UGC/corte/recusa com fixtures completas.

**DESCONHECIDO:** calibração humana, incidência de cada bug em produção, qualidade de áudio, efeito comercial. O critério legado de JPEG pequeno como quase-preto e a hipótese24fps permanecem limitações conhecidas, fora desta correção. Não há resultado publicado ou validação de cliente nesta entrega.
