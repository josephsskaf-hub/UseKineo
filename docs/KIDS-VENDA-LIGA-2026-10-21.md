# KINEO-KIDS-VENDA-LIGA-2110 — venda do Cartoon

**FATO CONFIRMADO — escopo, 21/10/2026:** integração na própria `codex/kids-venda-2010`, ponta inicial `99096acad51e9011ee0baaa4b05544f320aa3eb9`, com `origin/main` fixada em `72d23210c829278f81e39f7d7cdf42826137297c` (167 commits a incorporar, `git rev-list --count 99096acad..72d23210c`). Trabalho em worktree isolada; a working tree principal e sua `main` foram preservadas. Autorização desta tarefa: `[TRAVA 8.2 — vai do fundador 21/10 "vamos ligar o Cartoon e vamos ver"]`.

**FATO CONFIRMADO — IMPLEMENTADO:** venda ligada em `lib/kidsVenda/kidsVenda.ts:34`; abertura pública exige também o template ligado (`:40`, `lib/kidsCartoon/kidsCartoon.ts:23`). Preservados US$29/mês com 30 desenhos, pack US$49/30, primeiro grátis com marca-d'água, duração de 15s, Seedance e tetos existentes (`lib/kidsVenda/kidsVenda.ts:48`, `:73`, `:74`, `:87`, `:94`).

**FATO CONFIRMADO — conflitos resolvidos:**

| Arquivo | Resolução |
|---|---|
| `app/api/generate-video-cinematic/route.ts` | Mantidas admissão `kids_order` da venda e as duas importações de som da main; restante do merge preserva ambas as camadas. |
| `scripts/test-mcp-studio-2010.mjs` | Mantidas proteções da main e isolamento exato da camada de venda. |
| `scripts/test-meta95-personagem-2010.mjs` | Mantida evolução da main e reâncora da venda fora da conta da folha de personagem. |
| `scripts/test-support/desfaz-bebe-que-fala-2010.mjs` | Cadeia de desfaz preserva as camadas posteriores e remove a venda primeiro. |
| `scripts/test-support/desfaz-menu-ugc-2010.mjs` | Preservadas as duas camadas posteriores do merge. |
| `scripts/test-trilha-15s-1610.mjs` | Mantidas regras da main e separação da camada de venda. |

**FATO CONFIRMADO — visual:** `KidsVendaPanel` permanece montado antes do template novo (`app/(dashboard)/kids-cartoon/page.tsx:20`); `KidsVendaCards` continua nas páginas públicas/pricing. Cores, bordas, foco e mobile acompanham a tela clara. `KidsCartoonTemplate.tsx` e o módulo Kids da main permanecem idênticos à base; nenhuma tela antiga foi recuperada. Prévia estática autocontida com estado de entrega ilustrativo, e imagem antes/depois em `docs/previews/kids-venda-liga-2110.html` e `.png`.

**FATO CONFIRMADO — guardiões reancorados:** MCP Studio, Meta95 personagem, Trilha 15s, Saída Região e Negação de Cena/Ads Cena/Cena Ajuste isolam somente a camada Kids declarada. A cadeia `desfaz-ads-cena-ajuste` → demais camadas e `desfaz-bebe-que-fala` remove a venda primeiro. O desfaz Kids restaura exatamente 18 arquivos à main `72d23210c`, preservando CRLF e idempotência (`scripts/test-support/desfaz-kids-venda-2010.mjs:27`; tabela `desfaz-kids-venda-2010-trocas.json`). O guardião da venda exige público liberado para pack/piloto; desligamento em memória, template fechado, antifarm, cobrança e 26 mutantes continuam cobertos (`scripts/test-kids-venda-2010.mjs:126`, `:283`).

**FATO CONFIRMADO — TESTADO LOCALMENTE, 21/10/2026:** tabela antes × depois e comparação de checagens serão preenchidas ao terminar a suíte integral. Execução offline com rede, leitura de `.env` e herança de credenciais bloqueadas; fixtures e mutantes em cópia isolada. Sem alteração de prazos/assertions do produto para acomodar o ambiente.

**QUESTÃO PENDENTE / DESCONHECIDO — produção:** migration informada como aplicada em 20/10 pelo fundador nesta tarefa; não houve acesso ao banco para reconferir. Não houve build, deploy, PR ou chamadas pagas. A venda está habilitada no código da branch, sem publicação ou pagamento externo validado nesta rodada.

**SUGESTÃO — o que pode melhorar / próximo passo recomendado:** avaliar a publicação em rodada própria; depois comprovar pedido externo → entrega → pagamento. Suíte local e interruptor ligado não comprovam venda em produção.
