# Medição de ChatGPT · 20/11/2026

**EVIDÊNCIA DE PRODUÇÃO — SELECT somente leitura**, Supabase `cqqukkvjjrguayiyjvhh`; coleta `2026-11-20T03:13:41.407085+00:00`. Base de código `cbc82fadc`. Uso semanal inicial: **35%**.

## Janela e significado do evento

Os **14 dias completos mais recentes em BRT**, de **06/11/2026 00:00 até 20/11/2026 00:00, fim exclusivo**: `2026-11-06T03:00:00Z` → `2026-11-20T03:00:00Z`. A madrugada parcial de 20/11 não entra.

**FATO CONFIRMADO — IMPLEMENTADO:** `components/SourceCapture.tsx:83-144` emite landing_session_started uma vez por aba, usando marcador em sessionStorage. `lib/analytics.ts:47-65` cria o session_id da aba; `app/api/events/route.ts` resolve user_id pela sessão autenticada e acrescenta is_bot pelo user-agent. Não é visita com timeout de 30 minutos, pessoa distinta, cadastro, leitura atenta, citação observada ou pagamento. Bloqueadores, falha de ingestão, troca de aba/dispositivo e perda de storage deixam lacunas.

**Critério explícito:** utm_source contém chatgpt (sem diferença de maiúsculas), OU referrer_host é chatgpt, chatgpt.com ou www.chatgpt.com. O código normaliza chatgpt.com para chatgpt em `lib/acquisitionSource.ts`. Não buscamos substring em domínios de terceiros. source=ai_assistant_likely sem sinal explícito **não é ChatGPT**.

## Resultado por página de entrada

**EVIDÊNCIA DE PRODUÇÃO.** Sessões = session_id distintos, primeiro landing_session_started da janela, sem bot marcado e sem sessão vinculada a conta interna reconhecida. Path sem query string. Cadastro = perfil externo criado depois daquele pouso e antes do corte, identificado por user_id em eventos da MESMA sessão. Várias sessões vinculadas ao mesmo novo perfil: fica só o primeiro pouso ChatGPT elegível. Perfis sem vínculo de sessão não são distribuídos por página.

“1º filme” = pessoa entre esses cadastros com pedido em videos, criado depois do cadastro e antes do corte, cujo status é completed na leitura; conta uma vez. Não conta submit, falha, clip nem pagamento. **Limite:** videos não tem completed_at; não se pode afirmar que a conclusão ocorreu antes de 00:00 pelo status atual. updated_at pode mudar por outros motivos. É pedido da coorte concluído na leitura, não reconstrução exata à meia-noite.

| Página de entrada | Sessões ChatGPT | Novos cadastros vinculados | Desses, com 1º filme concluído na leitura | Sessões com identidade ambígua |
|---|---:|---:|---:|---:|
| / | 81 | 27 | 12 | 1 |
| /free-ai-shorts/cartoon | 59 | 27 | 6 | 0 |
| /how-much-do-instagram-reels-pay | 37 | 0 | 0 | 0 |
| /text-to-video-shorts | 37 | 20 | 6 | 0 |
| /ai-video-generator/for/urdu | 32 | 17 | 1 | 0 |
| /ai-video-generator/for/story-videos | 30 | 19 | 8 | 0 |
| /pricing | 20 | 2 | 0 | 0 |
| /free-ai-shorts/horror | 17 | 9 | 0 | 0 |
| /gerador-de-shorts-gratis | 17 | 10 | 8 | 0 |
| /state-of-ai-shorts-2026 | 11 | 1 | 0 | 0 |
| /ai-kids-cartoon-videos | 9 | 2 | 0 | 0 |
| /ai-ugc-ads | 7 | 4 | 2 | 0 |
| /ai-video-generator/kling-4 | 7 | 5 | 0 | 1 |
| /ai-video-generator/for/faceless-videos | 5 | 3 | 0 | 0 |
| /free-shorts-generator/de | 4 | 2 | 2 | 0 |
| /ai-video-generator/for/instagram-reels | 3 | 2 | 2 | 0 |
| /library | 3 | 0 | 0 | 0 |
| /ai-short-film-generator | 2 | 1 | 1 | 0 |
| /ai-video-generator/for/documentary-shorts | 2 | 1 | 0 | 0 |
| /free-ai-shorts/fitness | 2 | 0 | 0 | 0 |
| /how-much-does-tiktok-pay | 2 | 0 | 0 | 0 |
| /partners | 2 | 0 | 0 | 0 |
| /ai-video-generator/for/youtube-shorts | 1 | 1 | 0 | 0 |
| /best-ai-shorts-generators | 1 | 0 | 0 | 0 |
| /effects/pet-bee | 1 | 0 | 0 | 0 |
| /free-ai-shorts | 1 | 1 | 0 | 0 |
| /scripts/animals | 1 | 1 | 0 | 0 |
| /scripts/psychology | 1 | 1 | 0 | 0 |
| **TOTAL** | **395** | **156** | **48** | **2** |

**QUESTÃO PENDENTE:** duas sessões tinham mais de um user_id: uma na home e outra em /ai-video-generator/kling-4. As visitas permanecem; nenhuma conversão dessas sessões é atribuída. Quem já tinha perfil é retorno, não novo cadastro. Zero vínculo não prova zero cadastro em outra aba/dispositivo.

## Controles

| População na mesma janela | Quantidade | Unidade / uso |
|---|---:|---|
| Todos os landing_session_started brutos | 6306 | eventos, inclui robôs e internos |
| Após deduplicar session_id | 6305 | sessões |
| Sessões com is_bot=true | 1630 | excluídas |
| **Todas as origens**, sem bot marcado e excluindo sessões internas reconhecidas | 4301 | contém ChatGPT e sem origem |
| Sem referrer_host nem utm_source explícito | 2211 | subconjunto de todas as origens, **não ChatGPT** |
| ChatGPT explícito após exclusões | 395 | denominador da tabela |
| Sessões ChatGPT internas reconhecidas excluídas | 0 | filtro aplicado mesmo sem ocorrência |

**FATO CONFIRMADO / filtro:** lista exata e padrões de métricas de `lib/internalAccounts.ts` copiados para a consulta, incluindo aliases e test%. Não usa a lista mais estreita de privilégios financeiros. Anônimos não identificados não podem ser certificados como externos/humanos; “sem bot” significa somente ausência do marcador no evento. Não inferimos por IP.

## Leitura e próximo passo

**EVIDÊNCIA DE PRODUÇÃO:** /how-much-do-instagram-reels-pay tem 37 sessões explícitas e nenhum cadastro vinculado; /text-to-video-shorts também tem 37 e tem 20 cadastros vinculados, seis com filme concluído na leitura. Públicos diferentes: não prova efeito de layout. O gerador PT tem 17 sessões, dez cadastros vinculados e oito com filme concluído na leitura.

**SUGESTÃO:** cruzar intenção de compra e proximidade nas buscas para selecionar as três perguntas do passo 3. Não priorizar só volume de visitas. Novos compradores/receita não foram medidos. `MEDIDA.sql` e `MEDIDA.json` preservam consulta e agregado sem dados nominais; coleta pelo MCP autorizado, apenas SELECT.
