# CITACOES-01 — checkpoint HTTP das 20h

**EVIDÊNCIA DE PRODUÇÃO — 10/09/2026:** 2026-09-10T23:03:49.624Z a 2026-09-10T23:03:53.675Z; **20:03:49–20:03:53 BRT**. Escopo limitado: 16 GETs públicos, 15 paths distintos. Sem cookies, JavaScript de cliente, clique de aquisição, credenciais ou geração de vídeo.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** continuam **cinco páginas novas publicadas** e **três preparadas sem publicação**. As cinco respondem 200 com componente próprio e canonical esperado; as três respondem 404, sem componente/canonical próprios. A variante com query da calculadora é a mesma página e não aumenta o total de publicações.

**EVIDÊNCIA DE PRODUÇÃO / CONTRADIÇÃO:** continuam as duas FAQs ativas de trial de 80 créditos em Kling/Veo, inclusive em JSON-LD; continuam as declarações USD global na home, pricing, llms e calculadora. Os três motores consultados ainda têm apresentação restritiva de Studio no texto. Não foi testada a autorização real dos motores nem a moeda do checkout.

**EVIDÊNCIA DE PRODUÇÃO / CONTRADIÇÃO INTERNA:** o llms ainda diz “Checkout currency: USD.”, mas sua lista de guias novos já informa que brasileiros pagam em reais. O grant principal do llms é 30 e os planos são os vigentes. História comercial explicitamente superada continua registrada separadamente e não é contabilizada como oferta ativa.

## Comparação com os registros anteriores

**EVIDÊNCIA DE PRODUÇÃO — bases consultadas:** `http-audit.json` das 13:49, `DIAGNOSTICO-CITACOES-01.md` seção 9 (14:02), `production-lote-01.json` (14:17) e `CHECKPOINT.json` atualizado em 2026-09-10T22:10:57.535Z. Não foram repetidas as 106 URLs da auditoria completa.

| Superfície | Registro anterior | 20h | Interpretação |
|---|---|---|---|
| Home / pricing | Trial 30 e preços atuais; cobrança global USD às 13:49 | Mesmos termos comerciais observados | A contradição de moeda persiste. Hash completo pode mudar sem mudança da oferta. |
| llms | Trial 30 e preços atuais; CheckoutUSD às 13:49; cinco links novos às 14:17 | Trial 30 e preços atuais; CheckoutUSD e texto Brasil/reais coexistem | Houve acréscimo de links; não houve eliminação da contradição global de moeda. |
| Seedance | Trial 30 às 13:49 e 14:02; outros motores rotulados Studio | Mesmo trial 30 e mesma descrição Studio | Não encontrou trial 80 ativo nesta URL. |
| Kling / Veo | 80 trial credits no FAQ e JSON-LD às 13:49 | Ambas ainda contêm 80 | Erros ativos continuam, apesar da nota de trial 30 em outras partes. |
| Calculadora / variante citada | Trial 30 e USD mundial às 14:02 | Trial 30 e USD mundial | A variante não é uma nova landing nem uma nova publicação. |
| Cinco guias iniciais | 200/componentes próprios/canonical às 14:17 | 200/componentes próprios/canonical | Publicação preservada; grant30, reais e preços derivados visíveis. |
| Três guias preparados | CHECKPOINT: preparados, não publicados | 404 sem canonical/componente próprios | Continuam pendentes. Metadados globais no 404 não comprovam uma página publicada. |

## Cobertura desta rodada

**EVIDÊNCIA DE PRODUÇÃO:** “planos” abaixo é o conjunto de valores mensais Kineo identificado nesta página, não promessa de que ela lista toda a tabela. “Studio” indica cópia restritiva, não entitlement. O JSON contém o texto, metadados, JSON-LD e hashes completos/relevantes.

| URL solicitada | HTTP | UTC | Canonical | Trial 30 | Planos USD observados | BRL/reais | Trial 80 ativo | Studio | USD global |
|---|---:|---|---|---|---|---|---|---|---|
| https://www.usekineo.com/ | 200 | 2026-09-10T23:03:49.624Z | https://www.usekineo.com | sim | 9.9 / 19.9 / 39.9 | não | não | não | sim |
| https://www.usekineo.com/pricing | 200 | 2026-09-10T23:03:50.555Z | https://www.usekineo.com/pricing | sim | 9.9 / 19.9 / 39.9 | não | não | não | sim |
| https://www.usekineo.com/llms.txt | 200 | 2026-09-10T23:03:50.606Z | — | sim | 9.9 / 19.9 / 39.9 | sim | não | não | sim |
| https://www.usekineo.com/ai-video-generator/seedance | 200 | 2026-09-10T23:03:50.670Z | https://www.usekineo.com/ai-video-generator/seedance | sim | 9.9 / 39.9 / 19.9 | não | não | sim | não |
| https://www.usekineo.com/ai-video-generator/kling | 200 | 2026-09-10T23:03:51.053Z | https://www.usekineo.com/ai-video-generator/kling | sim | 39.9 / 9.9 / 19.9 | não | sim | sim | não |
| https://www.usekineo.com/ai-video-generator/veo | 200 | 2026-09-10T23:03:51.488Z | https://www.usekineo.com/ai-video-generator/veo | sim | 39.9 / 9.9 / 19.9 | não | sim | sim | não |
| https://www.usekineo.com/cheapest-ai-shorts-maker | 200 | 2026-09-10T23:03:51.907Z | https://www.usekineo.com/cheapest-ai-shorts-maker | sim | 9.9 / 19.9 / 39.9 | não | não | não | sim |
| https://www.usekineo.com/cheapest-ai-shorts-maker?internal_source=%2Fscripts%2Fspace&utm_source=chatgpt.com | 200 | 2026-09-10T23:03:52.119Z | https://www.usekineo.com/cheapest-ai-shorts-maker | sim | 9.9 / 19.9 / 39.9 | não | não | não | sim |
| https://www.usekineo.com/ai-video-generator/free-script-to-faceless-video | 200 | 2026-09-10T23:03:52.258Z | https://www.usekineo.com/ai-video-generator/free-script-to-faceless-video | sim | 9.9 / 19.9 / 39.9 | sim | não | não | não |
| https://www.usekineo.com/ai-video-generator/free-faceless-tiktok-tools | 200 | 2026-09-10T23:03:52.522Z | https://www.usekineo.com/ai-video-generator/free-faceless-tiktok-tools | sim | 9.9 / 19.9 / 39.9 | sim | não | não | não |
| https://www.usekineo.com/ai-video-generator/complete-60-second-shorts-cost | 200 | 2026-09-10T23:03:52.733Z | https://www.usekineo.com/ai-video-generator/complete-60-second-shorts-cost | sim | 9.9 / 19.9 / 39.9 | sim | não | não | não |
| https://www.usekineo.com/vs/invideo-alternatives-faceless-shorts | 200 | 2026-09-10T23:03:52.958Z | https://www.usekineo.com/vs/invideo-alternatives-faceless-shorts | sim | 9.9 / 19.9 / 39.9 | sim | não | não | não |
| https://www.usekineo.com/ai-video-generator/faceless-shorts-under-30 | 200 | 2026-09-10T23:03:53.169Z | https://www.usekineo.com/ai-video-generator/faceless-shorts-under-30 | sim | 9.9 / 19.9 / 39.9 | sim | não | não | não |
| https://www.usekineo.com/ai-video-generator/free-youtube-shorts | 404 | 2026-09-10T23:03:53.429Z | — | N/A (404) | N/A (404) | N/A (404) | N/A (404) | N/A (404) | N/A (404) |
| https://www.usekineo.com/ai-video-generator/horror-story-60-seconds | 404 | 2026-09-10T23:03:53.631Z | — | N/A (404) | N/A (404) | N/A (404) | N/A (404) | N/A (404) | N/A (404) |
| https://www.usekineo.com/ai-video-generator/chatgpt-script-to-finished-short | 404 | 2026-09-10T23:03:53.675Z | — | N/A (404) | N/A (404) | N/A (404) | N/A (404) | N/A (404) | N/A (404) |

## Oito páginas do mandato

**EVIDÊNCIA DE PRODUÇÃO:** contagem exige HTTP 200, marcador do componente e canonical próprio. Não inclui query variants, aliases, URLs globais de layout ou páginas404.

| Página | Estado às 20h |
|---|---|
| /ai-video-generator/free-script-to-faceless-video | PUBLICADA — 200, marcador e canonical próprios |
| /ai-video-generator/free-faceless-tiktok-tools | PUBLICADA — 200, marcador e canonical próprios |
| /ai-video-generator/complete-60-second-shorts-cost | PUBLICADA — 200, marcador e canonical próprios |
| /vs/invideo-alternatives-faceless-shorts | PUBLICADA — 200, marcador e canonical próprios |
| /ai-video-generator/faceless-shorts-under-30 | PUBLICADA — 200, marcador e canonical próprios |
| /ai-video-generator/free-youtube-shorts | PENDENTE — HTTP 404, sem marcador/canonical próprios |
| /ai-video-generator/horror-story-60-seconds | PENDENTE — HTTP 404, sem marcador/canonical próprios |
| /ai-video-generator/chatgpt-script-to-finished-short | PENDENTE — HTTP 404, sem marcador/canonical próprios |

## Trechos de correção ainda aplicáveis

**FATO CONFIRMADO — base do diagnóstico:** `app/ai-video-generator/[engine]/page.tsx:172` e `:199` originam as FAQs com 80; `:153` qualifica motores como Studio. `lib/marketingPrice.ts:281`, `app/llms.txt/route.ts:313`, `app/cheapest-ai-shorts-maker/page.tsx:62` e o metadata de `app/pricing/page.tsx:21`/`:26`/`:43` foram as fontes já localizadas. Esses números de linha correspondem à base de auditoria 0f2c05a7; não foi assumido que uma linha antiga equivale à linha atual após integração.

**SUGESTÃO:** manter os pedidos aos donos existentes e verificar a oferta no próximo deploy autorizado. Texto vigente: trial grátis de 30 créditos, sem cartão, todo motor desbloqueado; saldo suficiente continua necessário; filmes de trial têm marca d’água; brasileiros pagam em reais. Nenhuma mudança foi aplicada nesta rodada.

**QUESTÃO PENDENTE / DESCONHECIDO:** este checkpoint não mede citações nem cadastros. A raiz está coletando respostas reais do ChatGPT e pode fornecer URLs adicionais para contraprova pontual. Uma resposta atual errada deve ser confrontada com a URL exata citada e a hora do GET, não atribuída automaticamente a cache.
