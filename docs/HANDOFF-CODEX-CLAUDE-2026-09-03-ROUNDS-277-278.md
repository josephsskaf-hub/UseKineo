# HANDOFF CODEX → CLAUDE — ROUNDS 277–278

**Data:** 03/09/2026
**Workstream:** B2C · answer engine → ferramenta útil → cadastro → primeiro vídeo → Checkout → pagamento
**Branch:** `codex/aeo-hook-workbench-v1`
**Base:** `db74b12d85a7db1f4b76f6ababf08e298cef29e0`
**Commit funcional:** `02ab8287f3a6c1024148e062519ec66a3839d620`
**Estado:** **VALIDADO EM PRODUÇÃO · RESULTADO COMERCIAL DESCONHECIDO**

## 1. Hipótese e decisão

**EVIDÊNCIA DE PRODUÇÃO — handoff 275–276, Supabase SELECT em 03/09/2026 04:13 UTC, contas internas excluídas:** no recorte curto comparável, sessões de landing e sessões atribuídas a ChatGPT caíram, enquanto pessoas com vídeo concluído cresceram. Em 24 horas móveis, houve crescimento de landing, cadastro, vídeo e Checkout, com uma assinatura exata. Isso não provava regressão causal de uma superfície existente.

**HIPÓTESE:** quando alguém pede a um mecanismo de resposta ajuda para comparar aberturas de vídeo, um link direto para uma ferramenta de cinco hooks entrega valor antes do cadastro e cria uma entrada mais intencional do que mandar todo mundo à home.

**DECISÃO:** preservar as superfícies em coleta e criar uma ação AEO nova dentro da ferramenta já existente, sem nova landing, nova oferta, desconto ou mudança visual.

## 2. Ação publicada

**IMPLEMENTADO E VALIDADO EM PRODUÇÃO:** Answer-engine Hook Workbench.

- `/api/facts` e `/llms.txt` publicam a mesma rota de ação para quem explicitamente quer comparar hooks;
- a instrução dá precedência ao roteador de criação existente quando a pessoa já quer criar diretamente de uma ideia;
- a URL usa a tríade exata `answer_engine / organic / aeo_hook_workbench_v1`;
- pares parciais, campanha diferente ou parâmetros em formato de array caem no comportamento legado;
- o fluxo legado permanece byte por byte em `/signup?utm_source=seo&utm_medium=organic&utm_campaign=push22_hook_generator`;
- tópico e hook escolhido continuam no URL do navegador durante o handoff, como já ocorria; não há alegação de armazenamento privado;
- `free_hook_result_generated` usa envelope fechado com apenas versão, entrada e quantidade de hooks úteis;
- nenhum tópico, hook, UTM, referrer, gclid, e-mail ou identificador entra nesse evento fechado;
- a aparência, os cinco resultados, a copy e os estilos da ferramenta não mudaram.

URL de ação publicada:

`https://www.usekineo.com/free-hook-generator?utm_source=answer_engine&utm_medium=organic&utm_campaign=aeo_hook_workbench_v1`

## 3. Verdade comercial fail-closed

**IMPLEMENTADO / TESTADO LOCALMENTE:** coletor manual paginado e relatório agregado.

A cadeia só conta quando prova, em ordem:

1. landing exata com a tríade e browser session;
2. resultado válido na mesma session, estritamente depois da landing;
3. cadastro externo com a atribuição exata e relógio posterior à landing;
4. tolerância máxima de cinco segundos para o POST analítico do resultado terminar depois do cadastro;
5. vídeo concluído depois de `max(cadastro, resultado)`;
6. Checkout recorrente depois do vídeo;
7. pagamento depois do início do mesmo Stripe Checkout Session;
8. owner externo idêntico, perfil ativo e receita do ledger canônico.

Abandono anônimo é diagnóstico, não corrupção. Dono sem perfil, perfil sem e-mail, identidade conflitante, perfil atribuído sem landing observável, relógio ausente, contrato AEO inválido, Checkout malformado, pagamento órfão/empatado ou colisão de Stripe Session bloqueiam o gate. Um uso posterior legítimo com `entry=default` não contamina a coorte. Resultados além da tolerância são diagnosticados, mas não destravam vídeo.

Referrer é separado da UTM e só sai em categorias allowlisted (`chatgpt.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`, `google.com`, `bing.com`, `other`, `unreported`, `invalid`). Host arbitrário nunca é publicado. O relatório não retorna pessoa, e-mail, session ID, user ID ou Stripe Session ID.

**GATE:** aguardar vinte pessoas externas maduras individualmente por sete dias. Um pagamento exato prova receita observada no canal, nunca causalidade de qual mecanismo exibiu o link. Com pelo menos cinco resultados maduros e zero vídeo, parar o caminho de ativação; com pelo menos cinco vídeos maduros e zero Checkout, parar o caminho de Checkout. Não reeditar a superfície antes da amostra mínima.

## 4. Verificação

**TESTADO LOCALMENTE:** 214/214 verificações:

- workbench, URL, caller, fluxo legado e evento fechado: 42/42;
- relatório, ledger, paginação e adversariais: 79/79;
- contrato orgânico de cadastro: 38/38;
- roteador AEO B2B preexistente: 55/55.

Os adversariais incluem campanha parcial/errada, origem externa, hook vazio, owner conflitante, perfil sem e-mail, owner sem perfil, perfil alheio incompleto, perfil atribuído sem landing, abandono anônimo, timestamps empatados, atraso analítico dentro e fora do teto, resultado em path errado, revisit default, referrer privado, Checkout malformado, pagamento sem Session, Session com dois owners e pagamento empatado com o início.

**TESTADO LOCALMENTE:** três auditorias independentes terminaram GO, P0=0 e P1=0. `git diff --check` limpo. O typecheck preserva exatamente três erros preexistentes fora do escopo: duas versões Stripe e `Promise<Promise<T>>` em `TrialDowngradeModal`.

**CONTRADIÇÃO PREEXISTENTE:** `scripts/test-chatgpt-script-handoff.mjs` espera 45 onde o produto atual usa 35. A mesma falha foi reproduzida na base limpa; não foi causada por esta entrega e não foi alterada.

**COMPARAÇÃO VISUAL:** não aplicável. Não houve mudança de copy, layout ou estilo; somente roteamento de atribuição, facts/llms e medição agregada.

## 5. Deploy e smoke

**VALIDADO EM PRODUÇÃO — Vercel, 03/09/2026:**

- deployment `dpl_4k9GRQc4ctANur3LkmoMqTLp63dL`;
- target production, estado READY, alias `www.usekineo.com`, sem erro de alias;
- SHA servido `02ab8287f3a6c1024148e062519ec66a3839d620`;
- `/api/facts` respondeu 200 e devolveu a URL de ação exata;
- `/llms.txt` respondeu 200 com a seção e a mesma URL;
- a ferramenta com a tríade exata respondeu 200 e manteve o título público;
- Vercel Runtime Errors nas três rotas, dez minutos: zero;
- nenhum browser, render, crédito, Checkout ou comunicação externa foi forçado no smoke.

## 6. Arquivos

- `app/free-hook-generator/FreeHookClient.tsx`
- `app/free-hook-generator/page.tsx`
- `app/llms.txt/route.ts`
- `lib/growth/answerEngineHookWorkbench.ts`
- `lib/growth/organicSignupTruth.ts`
- `lib/kineoFacts.ts`
- `scripts/answer-engine-hook-subscription-report.mjs`
- `scripts/measure-answer-engine-hook-subscription.mjs`
- `scripts/test-answer-engine-hook-subscription-report.mjs`
- `scripts/test-answer-engine-hook-workbench.mjs`
- `scripts/test-organic-signup-truth.mjs`

**FORA DO ESCOPO:** render, cenas, voz, legenda, crédito, preço, SKU, Checkout, banco, migration, comunicação externa, outreach, anúncio, IndexNow e recrawl.

## 7. Próxima alternância

Voltar ao B2B com uma ação nova e não visual. Não reeditar o Hook Workbench antes do gate. O scorecard compartilhável do Viral Score e o QR offline de afiliados continuam congelados até aprovação visual do fundador. Não tocar em `GenerateClient` nem upload do YouTube sem coordenação com Claude.
