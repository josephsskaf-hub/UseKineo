# CITACOES-01 — auditoria HTTP pública completa

**EVIDÊNCIA DE PRODUÇÃO — VALIDADO EM PRODUÇÃO:** GETs em 2026-09-10T16:49:15.975Z a 2026-09-10T16:49:20.979Z; 10/09/2026, 13:49:15–13:49:20 BRT. Base de código: `0f2c05a7ea916b1615827cdfa9af5af33debaea1`.

**FATO CONFIRMADO — IMPLEMENTADO:** inventário derivado de `app/sitemap.ts:221`, `app/sitemap.ts:267`, `app/ai-video-generator/[engine]/page.tsx:346` e `lib/comparisons.ts:4442`/`:4459`; confronto com sitemap público. Relatório apenas; nenhum código de produto alterado.

**EVIDÊNCIA DE PRODUÇÃO:** todas as 60 páginas canônicas ativas responderam 200 e todos os 46 aliases responderam 308 para a URL canônica auditada. Cobertura de 106 URLs existentes, mais sitemap 200. O probe Seedance 2.5 respondeu 404 esperado: `S25_PUBLIC=false` em `lib/engineLaunch.ts:14`; ausente do sitemap. Um probe inválido `/ai-video-generator/faq`, erro da regex inicial, foi separado em `extraDiagnosticProbes` e não conta como rota nem falha do site.

**EVIDÊNCIA DE PRODUÇÃO / CONTRADIÇÃO:** dois motores ainda publicam 80 créditos de trial no FAQ visível no HTML e no FAQPage JSON-LD. A oferta atual do `/llms.txt` declara 30. Há também doze URLs com moeda global USD que conflita com a orientação do fundador sobre brasileiros pagarem em reais.

**QUESTÃO PENDENTE / DESCONHECIDO:** esta auditoria não valida o checkout em BRL nem atribui causalidade à queda de cadastros. A existência de contradições de trial é mecanismo plausível para respostas incorretas; não prova efeito causal sobre citações ou tráfego. Nenhuma leitura de banco foi feita.

## Correções pedidas: URL → erro → texto correto

**SUGESTÃO:** encaminhar os arquivos compartilhados ao autor atual; preservar a proteção de checkout, preço e política de entrada. O texto abaixo corrige informação pública e não altera a oferta.

| URL | Erro ativo e superfície | Texto correto sugerido | Fonte do código |
|---|---|---|---|
| https://www.usekineo.com/ | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/marketingPrice.ts:281`; `app/KineoLanding.tsx:1574` |
| https://www.usekineo.com/pricing | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text; meta description; OpenGraph description; Twitter description | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/marketingPrice.ts:281`; `app/pricing/PricingClient.tsx:938`; `app/pricing/PricingClient.tsx:128`; `app/pricing/page.tsx:21`; `app/pricing/page.tsx:26`; `app/pricing/page.tsx:43` |
| https://www.usekineo.com/llms.txt | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `app/llms.txt/route.ts:313`; `lib/kineoFacts.ts:683` |
| https://www.usekineo.com/ai-video-generator/kling | Active FAQ and FAQPage JSON-LD claim an 80-credit trial. HTML text; FAQPage JSON-LD | Every new account starts with 30 free credits, no card, and every engine unlocked. Kling 2.5 costs 50 credits per 60-second reference video, so the trial balance does not cover one full reference video. Trial films are watermarked; a paid plan unlocks clean downloads. | `app/ai-video-generator/[engine]/page.tsx:172` |
| https://www.usekineo.com/ai-video-generator/veo | Active FAQ and FAQPage JSON-LD claim an 80-credit trial. HTML text; FAQPage JSON-LD | Every new account starts with 30 free credits, no card, and every engine unlocked. Veo 3.1 costs 100 credits per 60-second reference video, so the trial balance does not cover one full reference video. Trial films are watermarked; a paid plan unlocks clean downloads. | `app/ai-video-generator/[engine]/page.tsx:199` |
| https://www.usekineo.com/vs/heygen-vs-kineo | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |
| https://www.usekineo.com/vs/kineo-vs-opus-clip | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |
| https://www.usekineo.com/vs/kineo-vs-pictory | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |
| https://www.usekineo.com/vs/kineo-vs-submagic | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |
| https://www.usekineo.com/vs/captions-vs-kineo | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |
| https://www.usekineo.com/vs/creatify-vs-kineo | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |
| https://www.usekineo.com/vs/descript-vs-kineo | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |
| https://www.usekineo.com/vs/kineo-vs-quso | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |
| https://www.usekineo.com/vs/kineo-vs-synthesia | Public copy says Kineo charges USD worldwide (or declares only USD), while the founder states Brazilian customers pay in reais. This audit did not open checkout or verify payment routing. HTML text or plain text | Prices shown here are in USD. Customers in Brazil pay in BRL (reais); consult the checkout for the amount in reais. | `lib/comparisons.ts:346` |

**EVIDÊNCIA DE PRODUÇÃO:** nenhum 40% de comissão, oferta ativa de entrada por $1 ou exigência ativa de cartão foi encontrado no escopo. Os preços mensais Starter/Creator/Studio encontrados são os vigentes; não trocar preços dos concorrentes, anuais, pacotes ou Autopilot. `25 credits` nas páginas é custo de Seedance, não um trial antigo.

**EVIDÊNCIA DE PRODUÇÃO / HISTÓRICO EXPLICITAMENTE SUPERADO:** `/llms.txt` mantém no bloco “Recently shipped” referências a entrada antiga e preços anteriores com supersessão explícita (`app/llms.txt/route.ts:394–412`). Não são oferta atual. **SUGESTÃO:** simplificar o feed citável removendo da seção ativa a história comercial vencida, mantendo registro interno; isso reduz ambiguidade textual, mas o benefício para citações ainda é HIPÓTESE.

**QUESTÃO PENDENTE / DESCONHECIDO:** o “Typical turnaround 3–7 minutes” é comum a todos os motores em `app/ai-video-generator/[engine]/page.tsx:533`; o `/llms.txt` limita a medida a Fast e diz que motores generativos levam mais tempo. Convém qualificar o prazo por motor antes de reutilizar esse trecho. Não foi testado render.

## Cobertura enumerada

**EVIDÊNCIA DE PRODUÇÃO:** cada linha traz resultado da requisição pública. Texto extraído, JSON-LD completo, metadados, SHA256 do corpo e cabeçalhos de cache estão em `http-audit.json`. Não é cópia de índice de busca.

| URL | Status | UTC | BRT | Cache |
|---|---:|---|---|---|
| https://www.usekineo.com/ | 200 | 2026-09-10T16:49:16.396Z | 2026-09-10T13:49:16.396-03:00 | MISS |
| https://www.usekineo.com/pricing | 200 | 2026-09-10T16:49:16.397Z | 2026-09-10T13:49:16.397-03:00 | PRERENDER |
| https://www.usekineo.com/llms.txt | 200 | 2026-09-10T16:49:16.398Z | 2026-09-10T13:49:16.398-03:00 | HIT |
| https://www.usekineo.com/chatgpt-to-youtube-shorts | 200 | 2026-09-10T16:49:16.398Z | 2026-09-10T13:49:16.398-03:00 | PRERENDER |
| https://www.usekineo.com/chatgpt | 200 | 2026-09-10T16:49:16.399Z | 2026-09-10T13:49:16.399-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator | 200 | 2026-09-10T16:49:16.400Z | 2026-09-10T13:49:16.400-03:00 | PRERENDER |
| https://www.usekineo.com/vs | 200 | 2026-09-10T16:49:16.478Z | 2026-09-10T13:49:16.478-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator/kineo-1 | 200 | 2026-09-10T16:49:16.814Z | 2026-09-10T13:49:16.814-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator/seedance | 200 | 2026-09-10T16:49:16.845Z | 2026-09-10T13:49:16.845-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator/kling | 200 | 2026-09-10T16:49:16.943Z | 2026-09-10T13:49:16.943-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator/veo | 200 | 2026-09-10T16:49:17.010Z | 2026-09-10T13:49:17.010-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator/kling-3 | 200 | 2026-09-10T16:49:17.015Z | 2026-09-10T13:49:17.015-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator/minimax-h3 | 200 | 2026-09-10T16:49:17.032Z | 2026-09-10T13:49:17.032-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator/gemini-omni-flash | 200 | 2026-09-10T16:49:17.204Z | 2026-09-10T13:49:17.204-03:00 | PRERENDER |
| https://www.usekineo.com/ai-video-generator/seedance-2-5 | 404 | 2026-09-10T16:49:17.275Z | 2026-09-10T13:49:17.275-03:00 | HIT |
| https://www.usekineo.com/vs/heygen-vs-synthesia | 200 | 2026-09-10T16:49:17.320Z | 2026-09-10T13:49:17.320-03:00 | PRERENDER |
| https://www.usekineo.com/vs/opus-clip-vs-submagic | 200 | 2026-09-10T16:49:17.422Z | 2026-09-10T13:49:17.422-03:00 | PRERENDER |
| https://www.usekineo.com/vs/captions-vs-submagic | 200 | 2026-09-10T16:49:17.441Z | 2026-09-10T13:49:17.441-03:00 | PRERENDER |
| https://www.usekineo.com/vs/descript-vs-opus-clip | 200 | 2026-09-10T16:49:17.450Z | 2026-09-10T13:49:17.450-03:00 | PRERENDER |
| https://www.usekineo.com/vs/klap-vs-opus-clip | 200 | 2026-09-10T16:49:17.455Z | 2026-09-10T13:49:17.455-03:00 | HIT |
| https://www.usekineo.com/vs/opus-clip-vs-quso | 200 | 2026-09-10T16:49:17.588Z | 2026-09-10T13:49:17.588-03:00 | PRERENDER |
| https://www.usekineo.com/vs/creatify-vs-heygen | 200 | 2026-09-10T16:49:17.671Z | 2026-09-10T13:49:17.671-03:00 | PRERENDER |
| https://www.usekineo.com/vs/pictory-vs-submagic | 200 | 2026-09-10T16:49:17.797Z | 2026-09-10T13:49:17.797-03:00 | PRERENDER |
| https://www.usekineo.com/vs/heygen-vs-kineo | 200 | 2026-09-10T16:49:17.833Z | 2026-09-10T13:49:17.833-03:00 | PRERENDER |
| https://www.usekineo.com/vs/kineo-vs-opus-clip | 200 | 2026-09-10T16:49:17.874Z | 2026-09-10T13:49:17.874-03:00 | PRERENDER |
| https://www.usekineo.com/vs/kineo-vs-pictory | 200 | 2026-09-10T16:49:17.941Z | 2026-09-10T13:49:17.941-03:00 | PRERENDER |
| https://www.usekineo.com/vs/kineo-vs-submagic | 200 | 2026-09-10T16:49:18.023Z | 2026-09-10T13:49:18.023-03:00 | PRERENDER |
| https://www.usekineo.com/vs/captions-vs-heygen | 200 | 2026-09-10T16:49:18.201Z | 2026-09-10T13:49:18.201-03:00 | PRERENDER |
| https://www.usekineo.com/vs/captions-vs-synthesia | 200 | 2026-09-10T16:49:18.205Z | 2026-09-10T13:49:18.205-03:00 | PRERENDER |
| https://www.usekineo.com/vs/creatify-vs-synthesia | 200 | 2026-09-10T16:49:18.246Z | 2026-09-10T13:49:18.246-03:00 | PRERENDER |
| https://www.usekineo.com/vs/heygen-vs-pictory | 200 | 2026-09-10T16:49:18.337Z | 2026-09-10T13:49:18.337-03:00 | PRERENDER |
| https://www.usekineo.com/vs/heygen-vs-submagic | 200 | 2026-09-10T16:49:18.372Z | 2026-09-10T13:49:18.372-03:00 | PRERENDER |
| https://www.usekineo.com/vs/heygen-vs-opus-clip | 200 | 2026-09-10T16:49:18.482Z | 2026-09-10T13:49:18.482-03:00 | PRERENDER |
| https://www.usekineo.com/vs/heygen-vs-quso | 200 | 2026-09-10T16:49:18.656Z | 2026-09-10T13:49:18.656-03:00 | PRERENDER |
| https://www.usekineo.com/vs/captions-vs-descript | 200 | 2026-09-10T16:49:18.684Z | 2026-09-10T13:49:18.684-03:00 | HIT |
| https://www.usekineo.com/vs/captions-vs-opus-clip | 200 | 2026-09-10T16:49:18.755Z | 2026-09-10T13:49:18.755-03:00 | PRERENDER |
| https://www.usekineo.com/vs/captions-vs-quso | 200 | 2026-09-10T16:49:18.777Z | 2026-09-10T13:49:18.777-03:00 | PRERENDER |
| https://www.usekineo.com/vs/captions-vs-pictory | 200 | 2026-09-10T16:49:18.803Z | 2026-09-10T13:49:18.803-03:00 | PRERENDER |
| https://www.usekineo.com/vs/descript-vs-submagic | 200 | 2026-09-10T16:49:18.937Z | 2026-09-10T13:49:18.937-03:00 | PRERENDER |
| https://www.usekineo.com/vs/descript-vs-quso | 200 | 2026-09-10T16:49:18.942Z | 2026-09-10T13:49:18.942-03:00 | PRERENDER |
| https://www.usekineo.com/vs/descript-vs-pictory | 200 | 2026-09-10T16:49:19.141Z | 2026-09-10T13:49:19.141-03:00 | PRERENDER |
| https://www.usekineo.com/vs/quso-vs-submagic | 200 | 2026-09-10T16:49:19.160Z | 2026-09-10T13:49:19.160-03:00 | PRERENDER |
| https://www.usekineo.com/vs/captions-vs-creatify | 200 | 2026-09-10T16:49:19.197Z | 2026-09-10T13:49:19.197-03:00 | PRERENDER |
| https://www.usekineo.com/vs/creatify-vs-descript | 200 | 2026-09-10T16:49:19.212Z | 2026-09-10T13:49:19.212-03:00 | PRERENDER |
| https://www.usekineo.com/vs/creatify-vs-opus-clip | 200 | 2026-09-10T16:49:19.359Z | 2026-09-10T13:49:19.359-03:00 | PRERENDER |
| https://www.usekineo.com/vs/creatify-vs-pictory | 200 | 2026-09-10T16:49:19.383Z | 2026-09-10T13:49:19.383-03:00 | PRERENDER |
| https://www.usekineo.com/vs/creatify-vs-quso | 200 | 2026-09-10T16:49:19.581Z | 2026-09-10T13:49:19.581-03:00 | PRERENDER |
| https://www.usekineo.com/vs/creatify-vs-submagic | 200 | 2026-09-10T16:49:19.640Z | 2026-09-10T13:49:19.640-03:00 | PRERENDER |
| https://www.usekineo.com/vs/descript-vs-heygen | 200 | 2026-09-10T16:49:19.652Z | 2026-09-10T13:49:19.652-03:00 | PRERENDER |
| https://www.usekineo.com/vs/descript-vs-synthesia | 200 | 2026-09-10T16:49:19.806Z | 2026-09-10T13:49:19.806-03:00 | PRERENDER |
| https://www.usekineo.com/vs/opus-clip-vs-pictory | 200 | 2026-09-10T16:49:19.812Z | 2026-09-10T13:49:19.812-03:00 | PRERENDER |
| https://www.usekineo.com/vs/opus-clip-vs-synthesia | 200 | 2026-09-10T16:49:19.824Z | 2026-09-10T13:49:19.824-03:00 | PRERENDER |
| https://www.usekineo.com/vs/pictory-vs-quso | 200 | 2026-09-10T16:49:20.036Z | 2026-09-10T13:49:20.036-03:00 | PRERENDER |
| https://www.usekineo.com/vs/pictory-vs-synthesia | 200 | 2026-09-10T16:49:20.039Z | 2026-09-10T13:49:20.039-03:00 | PRERENDER |
| https://www.usekineo.com/vs/quso-vs-synthesia | 200 | 2026-09-10T16:49:20.048Z | 2026-09-10T13:49:20.048-03:00 | PRERENDER |
| https://www.usekineo.com/vs/submagic-vs-synthesia | 200 | 2026-09-10T16:49:20.201Z | 2026-09-10T13:49:20.201-03:00 | PRERENDER |
| https://www.usekineo.com/vs/captions-vs-kineo | 200 | 2026-09-10T16:49:20.260Z | 2026-09-10T13:49:20.260-03:00 | PRERENDER |
| https://www.usekineo.com/vs/creatify-vs-kineo | 200 | 2026-09-10T16:49:20.285Z | 2026-09-10T13:49:20.285-03:00 | PRERENDER |
| https://www.usekineo.com/vs/descript-vs-kineo | 200 | 2026-09-10T16:49:20.436Z | 2026-09-10T13:49:20.436-03:00 | PRERENDER |
| https://www.usekineo.com/vs/kineo-vs-quso | 200 | 2026-09-10T16:49:20.456Z | 2026-09-10T13:49:20.456-03:00 | PRERENDER |
| https://www.usekineo.com/vs/kineo-vs-synthesia | 200 | 2026-09-10T16:49:20.542Z | 2026-09-10T13:49:20.542-03:00 | PRERENDER |
| https://www.usekineo.com/vs/synthesia-vs-heygen | 308 | 2026-09-10T16:49:20.649Z | 2026-09-10T13:49:20.649-03:00 | — → /vs/heygen-vs-synthesia |
| https://www.usekineo.com/vs/submagic-vs-opus-clip | 308 | 2026-09-10T16:49:20.658Z | 2026-09-10T13:49:20.658-03:00 | — → /vs/opus-clip-vs-submagic |
| https://www.usekineo.com/vs/submagic-vs-captions | 308 | 2026-09-10T16:49:20.660Z | 2026-09-10T13:49:20.660-03:00 | — → /vs/captions-vs-submagic |
| https://www.usekineo.com/vs/opus-clip-vs-descript | 308 | 2026-09-10T16:49:20.663Z | 2026-09-10T13:49:20.663-03:00 | — → /vs/descript-vs-opus-clip |
| https://www.usekineo.com/vs/opus-clip-vs-klap | 308 | 2026-09-10T16:49:20.667Z | 2026-09-10T13:49:20.667-03:00 | — → /vs/klap-vs-opus-clip |
| https://www.usekineo.com/vs/quso-vs-opus-clip | 308 | 2026-09-10T16:49:20.671Z | 2026-09-10T13:49:20.671-03:00 | — → /vs/opus-clip-vs-quso |
| https://www.usekineo.com/vs/heygen-vs-creatify | 308 | 2026-09-10T16:49:20.684Z | 2026-09-10T13:49:20.684-03:00 | — → /vs/creatify-vs-heygen |
| https://www.usekineo.com/vs/submagic-vs-pictory | 308 | 2026-09-10T16:49:20.700Z | 2026-09-10T13:49:20.700-03:00 | — → /vs/pictory-vs-submagic |
| https://www.usekineo.com/vs/kineo-vs-heygen | 308 | 2026-09-10T16:49:20.706Z | 2026-09-10T13:49:20.706-03:00 | — → /vs/heygen-vs-kineo |
| https://www.usekineo.com/vs/opus-clip-vs-kineo | 308 | 2026-09-10T16:49:20.713Z | 2026-09-10T13:49:20.713-03:00 | — → /vs/kineo-vs-opus-clip |
| https://www.usekineo.com/vs/pictory-vs-kineo | 308 | 2026-09-10T16:49:20.714Z | 2026-09-10T13:49:20.714-03:00 | — → /vs/kineo-vs-pictory |
| https://www.usekineo.com/vs/submagic-vs-kineo | 308 | 2026-09-10T16:49:20.719Z | 2026-09-10T13:49:20.719-03:00 | — → /vs/kineo-vs-submagic |
| https://www.usekineo.com/vs/heygen-vs-captions | 308 | 2026-09-10T16:49:20.723Z | 2026-09-10T13:49:20.723-03:00 | — → /vs/captions-vs-heygen |
| https://www.usekineo.com/vs/synthesia-vs-captions | 308 | 2026-09-10T16:49:20.729Z | 2026-09-10T13:49:20.729-03:00 | — → /vs/captions-vs-synthesia |
| https://www.usekineo.com/vs/synthesia-vs-creatify | 308 | 2026-09-10T16:49:20.730Z | 2026-09-10T13:49:20.730-03:00 | — → /vs/creatify-vs-synthesia |
| https://www.usekineo.com/vs/pictory-vs-heygen | 308 | 2026-09-10T16:49:20.738Z | 2026-09-10T13:49:20.738-03:00 | — → /vs/heygen-vs-pictory |
| https://www.usekineo.com/vs/submagic-vs-heygen | 308 | 2026-09-10T16:49:20.742Z | 2026-09-10T13:49:20.742-03:00 | — → /vs/heygen-vs-submagic |
| https://www.usekineo.com/vs/opus-clip-vs-heygen | 308 | 2026-09-10T16:49:20.743Z | 2026-09-10T13:49:20.743-03:00 | — → /vs/heygen-vs-opus-clip |
| https://www.usekineo.com/vs/quso-vs-heygen | 308 | 2026-09-10T16:49:20.756Z | 2026-09-10T13:49:20.756-03:00 | — → /vs/heygen-vs-quso |
| https://www.usekineo.com/vs/descript-vs-captions | 308 | 2026-09-10T16:49:20.762Z | 2026-09-10T13:49:20.762-03:00 | — → /vs/captions-vs-descript |
| https://www.usekineo.com/vs/opus-clip-vs-captions | 308 | 2026-09-10T16:49:20.763Z | 2026-09-10T13:49:20.763-03:00 | — → /vs/captions-vs-opus-clip |
| https://www.usekineo.com/vs/quso-vs-captions | 308 | 2026-09-10T16:49:20.774Z | 2026-09-10T13:49:20.774-03:00 | — → /vs/captions-vs-quso |
| https://www.usekineo.com/vs/pictory-vs-captions | 308 | 2026-09-10T16:49:20.776Z | 2026-09-10T13:49:20.776-03:00 | — → /vs/captions-vs-pictory |
| https://www.usekineo.com/vs/submagic-vs-descript | 308 | 2026-09-10T16:49:20.782Z | 2026-09-10T13:49:20.782-03:00 | — → /vs/descript-vs-submagic |
| https://www.usekineo.com/vs/quso-vs-descript | 308 | 2026-09-10T16:49:20.784Z | 2026-09-10T13:49:20.784-03:00 | — → /vs/descript-vs-quso |
| https://www.usekineo.com/vs/pictory-vs-descript | 308 | 2026-09-10T16:49:20.787Z | 2026-09-10T13:49:20.787-03:00 | — → /vs/descript-vs-pictory |
| https://www.usekineo.com/vs/submagic-vs-quso | 308 | 2026-09-10T16:49:20.795Z | 2026-09-10T13:49:20.795-03:00 | — → /vs/quso-vs-submagic |
| https://www.usekineo.com/vs/creatify-vs-captions | 308 | 2026-09-10T16:49:20.795Z | 2026-09-10T13:49:20.795-03:00 | — → /vs/captions-vs-creatify |
| https://www.usekineo.com/vs/descript-vs-creatify | 308 | 2026-09-10T16:49:20.803Z | 2026-09-10T13:49:20.803-03:00 | — → /vs/creatify-vs-descript |
| https://www.usekineo.com/vs/opus-clip-vs-creatify | 308 | 2026-09-10T16:49:20.809Z | 2026-09-10T13:49:20.809-03:00 | — → /vs/creatify-vs-opus-clip |
| https://www.usekineo.com/vs/pictory-vs-creatify | 308 | 2026-09-10T16:49:20.811Z | 2026-09-10T13:49:20.811-03:00 | — → /vs/creatify-vs-pictory |
| https://www.usekineo.com/vs/quso-vs-creatify | 308 | 2026-09-10T16:49:20.818Z | 2026-09-10T13:49:20.818-03:00 | — → /vs/creatify-vs-quso |
| https://www.usekineo.com/vs/submagic-vs-creatify | 308 | 2026-09-10T16:49:20.820Z | 2026-09-10T13:49:20.820-03:00 | — → /vs/creatify-vs-submagic |
| https://www.usekineo.com/vs/heygen-vs-descript | 308 | 2026-09-10T16:49:20.821Z | 2026-09-10T13:49:20.821-03:00 | — → /vs/descript-vs-heygen |
| https://www.usekineo.com/vs/synthesia-vs-descript | 308 | 2026-09-10T16:49:20.830Z | 2026-09-10T13:49:20.830-03:00 | — → /vs/descript-vs-synthesia |
| https://www.usekineo.com/vs/pictory-vs-opus-clip | 308 | 2026-09-10T16:49:20.832Z | 2026-09-10T13:49:20.832-03:00 | — → /vs/opus-clip-vs-pictory |
| https://www.usekineo.com/vs/synthesia-vs-opus-clip | 308 | 2026-09-10T16:49:20.838Z | 2026-09-10T13:49:20.839-03:00 | — → /vs/opus-clip-vs-synthesia |
| https://www.usekineo.com/vs/quso-vs-pictory | 308 | 2026-09-10T16:49:20.840Z | 2026-09-10T13:49:20.840-03:00 | — → /vs/pictory-vs-quso |
| https://www.usekineo.com/vs/synthesia-vs-pictory | 308 | 2026-09-10T16:49:20.848Z | 2026-09-10T13:49:20.848-03:00 | — → /vs/pictory-vs-synthesia |
| https://www.usekineo.com/vs/synthesia-vs-quso | 308 | 2026-09-10T16:49:20.850Z | 2026-09-10T13:49:20.850-03:00 | — → /vs/quso-vs-synthesia |
| https://www.usekineo.com/vs/synthesia-vs-submagic | 308 | 2026-09-10T16:49:20.850Z | 2026-09-10T13:49:20.850-03:00 | — → /vs/submagic-vs-synthesia |
| https://www.usekineo.com/vs/kineo-vs-captions | 308 | 2026-09-10T16:49:20.856Z | 2026-09-10T13:49:20.856-03:00 | — → /vs/captions-vs-kineo |
| https://www.usekineo.com/vs/kineo-vs-creatify | 308 | 2026-09-10T16:49:20.856Z | 2026-09-10T13:49:20.856-03:00 | — → /vs/creatify-vs-kineo |
| https://www.usekineo.com/vs/kineo-vs-descript | 308 | 2026-09-10T16:49:20.859Z | 2026-09-10T13:49:20.859-03:00 | — → /vs/descript-vs-kineo |
| https://www.usekineo.com/vs/quso-vs-kineo | 308 | 2026-09-10T16:49:20.865Z | 2026-09-10T13:49:20.865-03:00 | — → /vs/kineo-vs-quso |
| https://www.usekineo.com/vs/synthesia-vs-kineo | 308 | 2026-09-10T16:49:20.867Z | 2026-09-10T13:49:20.867-03:00 | — → /vs/kineo-vs-synthesia |

## Método e limites

**FATO CONFIRMADO / TESTADO LOCALMENTE:** os dois arquivos `.mjs` desta pasta fazem apenas GETs públicos e processam o resultado local; não são scripts da pasta de produção. HTML extraído exclui scripts e estilos; JSON-LD é registrado separadamente. O método não executa JavaScript de cliente nem determina visibilidade por CSS. Cada URL teve uma tentativa bem-sucedida; limite configurado de duas tentativas.

**EVIDÊNCIA DE PRODUÇÃO:** sitemap público contém todas as sete páginas de motor ativas, os dois hubs e os 46 pares canônicos do código. Os aliases estão fora do sitemap e redirecionam. Não houve falha de acesso às URLs publicadas do escopo.

**HIPÓTESE:** as contradições ativas de créditos podem manter respostas erradas depois da restauração. A existência do histórico explicitamente superado e a discrepância de moeda ampliam a ambiguidade; medir respostas reais e cadastros em janelas iguais continua necessário.

**SUGESTÃO / EXECUTAR:** corrigir as duas FAQs e seu JSON-LD primeiro; encaminhar as declarações globais de moeda para o dono do módulo compartilhado, sem tocar preço ou checkout. Em seguida, repetir a mesma bateria real de perguntas EN/PT com registro de fontes e posição, em sessão independente.
