# KINEO-KIDS-VENDA-LIGA-2110 — venda do Cartoon

**FATO CONFIRMADO — 21/10/2026:** integrada a `origin/main` `72d23210c` na própria `codex/kids-venda-2010`, desde `99096acad` (167 commits incorporados, `git rev-list --count 99096acad..72d23210c`). Código final verificado: `b4327f23`. Todos os commits desta tarefa levam `[TRAVA 8.2 — vai do fundador 21/10 "vamos ligar o Cartoon e vamos ver"]`.

**FATO CONFIRMADO — IMPLEMENTADO:** `KIDS_SALES_LIVE=true` (`lib/kidsVenda/kidsVenda.ts:34`), com template já ligado (`lib/kidsCartoon/kidsCartoon.ts:23`). Preservados US$29/mês/30 desenhos, pack US$49/30, primeiro grátis com marca-d'água, 15s, Seedance e tetos (`lib/kidsVenda/kidsVenda.ts:48`, `:73`, `:74`, `:87`, `:94`). Neste módulo, a única diferença para a ponta inicial é a flag.

**FATO CONFIRMADO — seis conflitos resolvidos:**

| Arquivo | Resolução |
|---|---|
| `app/api/generate-video-cinematic/route.ts:232` | Preservadas admissão `kids_order`, som novo e todas as camadas da main. |
| `scripts/test-mcp-studio-2010.mjs:302` | Main preservada; venda fora da conta do conector. |
| `scripts/test-meta95-personagem-2010.mjs:354` | Main preservada; venda desfeita antes da comparação. |
| `scripts/test-support/desfaz-bebe-que-fala-2010.mjs:95` | Venda sai primeiro; demais camadas preservadas. |
| `scripts/test-support/desfaz-menu-ugc-2010.mjs:50` | Cadeia nova da main preservada, passando pelo bebê. |
| `scripts/test-trilha-15s-1610.mjs:297` | Main preservada; somente linhas Kids fora da conta. |

**FATO CONFIRMADO — visual:** painel na tela nova (`app/(dashboard)/kids-cartoon/page.tsx:20`), cartões claros/azuis, foco e mobile ajustados. O template novo e `lib/engineWall.ts`/`lib/homeVideoCuration.ts` são idênticos à main. Comparação estática desktop/mobile, com pedidos ilustrativos: `docs/previews/kids-venda-liga-2110.html`, `.png` e `-mobile.png`.

**FATO CONFIRMADO — guardiões reancorados:** MCP Studio/original e ajuste; Meta95 personagem/original e ajuste; Trilha 15s; Saída Região; Ads Cena/Ajuste; Negação de Cena; Contrato Clássicos; Veo marcado/IA; E4; Home clara; Verbatim. Só a camada Kids declarada sai das contas alheias. O desfaz restaura **26 arquivos exatamente à main**, com CRLF/idempotência, e o guardião Kids conserva **26 mutantes**, público liberado e cenários fechados em memória (`scripts/test-support/desfaz-kids-venda-2010.mjs:27`; `scripts/test-kids-venda-2010.mjs:126`, `:283`).

**FATO CONFIRMADO — TESTADO LOCALMENTE, 21/10/2026:**

| Suíte | Executados | Verdes | Vermelhos |
|---|---:|---:|---:|
| Main `72d23210c` | 976 | 825 | 151 |
| Venda, resultado consolidado | 977 | 826 | Os mesmos 151 |

**FATO CONFIRMADO — prova:** integral no produto final, seguida da repetição dos **20 testes afetados** após todas as reâncoras, com árvore limpa. `newRed=[]`, `changedRedChecks=[]`, nenhum teste removido; zero bloqueios offline/timeouts. `tsc --noEmit --incremental false` verde nos dois lados; nenhum TS/TSX mudou depois da verificação final do produto. `git diff --check 72d23210c HEAD` verde. Logs e tentativas originais preservados em `C:/tmp/kids-venda-liga-2110/`: `origin-main.json`, `kids-venda-final.json`, `kids-venda-scope.json`, `kids-venda-consolidated-comparison.json`, `origin-main-tsc.json` e `target-tsc.json`. Rede, leitura de `.env` e credenciais foram bloqueadas na suíte.

**QUESTÃO PENDENTE / DESCONHECIDO — produção:** migration aplicada em 20/10 segundo o fundador; banco não consultado. Sem build, deploy, PR ou chamada paga nesta tarefa. A main e sua working tree foram preservadas. Habilitado/testado na branch; publicação, entrega e pagamento externo não validados nesta rodada.

**SUGESTÃO — próximo passo recomendado / o que pode melhorar:** em etapa própria, publicar e comprovar pedido externo → entrega → pagamento; os 151 vermelhos herdados continuam registrados, sem mascarar novos erros.
