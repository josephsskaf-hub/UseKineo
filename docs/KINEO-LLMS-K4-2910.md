<!-- // KINEO-LLMS-K4-2910 -->
# KINEO-LLMS-K4-2910

**FATO CONFIRMADO — IMPLEMENTADO, 29/10/2026:** a branch `codex/llms-filme-gratis-kling4` parte de `2bd7c70a48243345456ffd5321b806bcb51dda4b`. O nome público do primeiro filme vem de `FREE_FILM_ENGINE_NAME`, derivado de `KLING4_TRIAL_LIVE` em `lib/freeFilmEngine.ts:5`. `FREE_FILM_LABEL` usa esse nome em `lib/freeTierOffer.ts:240`; os demais espelhos importam a mesma fonte. O OpenAPI estático consulta `getKineoFacts.trialAccess.freeFilm.engine`, preservando o identificador de handoff `seedance`.

**FATO CONFIRMADO — IMPLEMENTADO, 29/10/2026:** o diff contra a base preserva preços, créditos, duração, política de países, admissão e cards da home. Só muda copy, imports, guardiões e este registro. O nome indica o motor principal; a geração e seu fallback por orçamento não foram alterados.

**TESTADO LOCALMENTE — 29/10/2026, Node v24.18.0:** comandos executados no worktree isolado, antes das alterações e novamente após a implementação. Logs locais: `C:/Users/josep/AppData/Local/Temp/kineo-llms-k4-2910/`, prefixos `baseline-` e `final-`. O novo teste usa loader offline e stub em memória; não muda o interruptor no disco.

| Comando | Resultado final | Comparação com a base |
|---|---|---|
| `npx tsc --noEmit` | PASS, exit 0, sem erros | PASS |
| `node scripts/test-copy-filme-gratis-15s-2026-09-29.mjs` | PASS, 43/43, exit 0 | PASS, 43/43 |
| `node scripts/test-gpt-v31-facts-2026-09-24.mjs` | FAIL, exit 1 | Mesma falha anterior; verificações de copy passam |
| `node scripts/test-geo-rodada3-2026-10-08.mjs` | 37 PASS, 9 FAIL, exit 1; R10 PASS | Mesmas 9 falhas anteriores |
| `node scripts/test-llms-filme-gratis-kling4-2910.mjs` | PASS, exit 0: ligado, desligado e mutantes | Teste novo |
| `node scripts/test-gpt-handoff.mjs` | Interrompido por helper histórico, exit 1 | Mesmo erro anterior |
| `node scripts/test-mcp-studio-2010.mjs` | Interrompido por helper histórico, exit 1 | Mesmo erro anterior |

**TESTADO LOCALMENTE — falhas preexistentes, 29/10/2026:** comparação automática das linhas `FAIL` e `Error:` entre os logs da base e os finais: igualdade exata nos quatro testes com falha.

- GPT v3.1: `only approved handoff POST and facts GET exist`.
- GEO: R4d, K1, M10 e M11 falham no desfaz `upsell-filme15-2610` de `app/(dashboard)/generate/GenerateClient.tsx`; R5 e M12–M15 falham no desfaz `KINEO-JUIZ-FICHA-2710` de `app/api/generate-video-cinematic/route.ts`.
- Handoff: `COMPRA-CLAREZA-2610: app/(dashboard)/studio/StudioClient.tsx hunk 1: expected exactly 1 candidate match, found 0`.
- MCP Studio: `desfaz KINEO-JUIZ-FICHA-2710: app/api/generate-video-cinematic/route.ts mudou fora da camada (0x)`.

**FATO CONFIRMADO — guardiões preservados:** o helper `scripts/test-support/desfaz-llms-filme-gratis-kling4-2910.mjs` desfaz somente trechos exatos desta camada de copy em quatro fontes antes dos comparadores históricos do GEO. Não ignora exceções nem falhas; divergir da copy esperada lança erro. R10 continua exigindo o nome derivado do interruptor. O novo guardião executa as fontes atuais sem essa projeção, verifica `/llms.txt`, `/api/facts`, `kineoFacts`, `FREE_FILM_LABEL` e `entryPolicy`, e rejeita nome antigo com a flag ligada, facts desatualizados e rollback preso em Kling.

**QUESTÃO PENDENTE / DESCONHECIDO:** esta execução não valida o texto servido em produção após deploy. A publicação permanece com Claude, conforme o escopo solicitado.

**SUGESTÃO — próximo passo recomendado:** Claude revisar a branch e publicar pelo fluxo autorizado; após a publicação, conferir o texto efetivamente servido em `/llms.txt` e no conector. Os problemas históricos dos guardiões ficam registrados separadamente acima.


**FATO CONFIRMADO — arquivos tocados nesta entrega:**

- `app/(dashboard)/generate/GenerateClient.tsx`
- `app/gerador-de-shorts-gratis/page.tsx`
- `app/llms.txt/route.ts`
- `app/models-pricing/page.tsx`
- `app/partners/page.tsx`
- `app/seedance-vs-veo-vs-kling/page.tsx`
- `app/state-of-ai-shorts-2026/page.tsx`
- `components/CitationAnswerPage.tsx`
- `components/CitationComparisonDecision.tsx`
- `components/Kineo1RetiredNotice.tsx`
- `components/MrrFirstFilm.tsx`
- `components/SeedanceAnswerSections.tsx`
- `docs/KINEO-LLMS-K4-2910.md`
- `lib/entryPolicy.ts`
- `lib/freeFilmEngine.ts`
- `lib/freeFilmPolicy.ts`
- `lib/freeTierOffer.ts`
- `lib/growth/citationAnswers.ts`
- `lib/growth/enginePageCatalog.ts`
- `lib/growth/vsAlternativeAnswers.ts`
- `lib/kineoFacts.ts`
- `lib/lifecycle/abandonoRapido.ts`
- `lib/lifecycle/regionFirstFilmEmail.ts`
- `lib/seo/freeShortsGeneratorLangs.ts`
- `lib/seo/intentPages.ts`
- `lib/seo/paginasLote1.ts`
- `lib/seo/seedanceAnswer.ts`
- `lib/seo/trafficCitation2310.ts`
- `public/gpt/openapi.json`
- `scripts/test-copy-filme-gratis-15s-2026-09-29.mjs`
- `scripts/test-geo-rodada3-2026-10-08.mjs`
- `scripts/test-gpt-v31-facts-2026-09-24.mjs`
- `scripts/test-llms-filme-gratis-kling4-2910.mjs`
- `scripts/test-support/desfaz-llms-filme-gratis-kling4-2910.mjs`
