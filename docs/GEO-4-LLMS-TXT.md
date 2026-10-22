# GEO 4 — Proposta para /llms.txt

[SUGESTÃO — PREPARADO, NÃO PUBLICADO] Tarefa KINEO-GEO-NOITE-2110. Pesquisa iniciada em 21/10/2026, America/Sao_Paulo. Esta proposta usa a resposta HTTP pública obtida em 21/10, e não apenas a cópia do índice de busca. Preço de referência: [pricing ao vivo](https://www.usekineo.com/pricing), consulta 21/10/2026. Base de código somente para corroboração: 72d23210.

## 1. O que está errado ou pode melhorar

[CONTRADIÇÃO] A resposta pública de [/llms.txt](https://www.usekineo.com/llms.txt), consulta 21/10/2026, linha 153 da captura [llms_txt.txt](geo-evidence-2110/llms_txt.txt), diz que brasileiros normalmente pagam em BRL. [/pricing](https://www.usekineo.com/pricing), na mesma consulta, informa que lista e cobra em USD mundialmente. [FATO CONFIRMADO — IMPLEMENTADO] O tipo de moeda aceita somente USD: lib/checkoutPricing.ts:55. Correção pronta no bloco B. Não abrir o link direto de checkout do arquivo para “verificar”: este trabalho não autoriza iniciar uma compra.

[EVIDÊNCIA DE PRODUÇÃO — declaração pública, 21/10/2026] O arquivo já apresenta Product Ads, AI UGC e Cartoon; portanto “adicionar produtos ausentes” duplicaria informação. As primeiras seções destacam anúncios antes da explicação de filmes: captura, linhas 14–42. [SUGESTÃO] Colocar Make a Film primeiro, seguido de Product Ads, AI UGC Ads e AI Cartoon Videos. O briefing do fundador de 21/10 informa que filmes geram a receita atual; não reauditei pagamentos.

[EVIDÊNCIA DE PRODUÇÃO — declaração pública, 21/10/2026] A captura tem 702 linhas, incluindo histórico de preços, comparações, instruções de campanha, tabelas e índice de páginas. Fonte e data: captura HTTP pública de /llms.txt, 21/10/2026; contagem do arquivo salvo. [HIPÓTESE] A mistura de termos atuais com termos históricos aumenta o risco de uma resposta recuperar a oferta errada. Não há teste que prove que encurtar o arquivo aumenta citações.

[CONTRADIÇÃO / QUESTÃO PENDENTE] O arquivo anuncia descontos iniciais de Creator/Studio e um checkout direto; a página de pricing consultada não os apresenta na mesma seção de planos. Fontes: captura /llms.txt, linhas 130, 134 e 150; /pricing, consulta 21/10/2026. Isso não prova desconto desligado. [SUGESTÃO] Omitir promoção no resumo até a fonte ao vivo escolhida pelo fundador confirmá-la; usar valores mensais regulares.

[EVIDÊNCIA DE PRODUÇÃO — declaração pública, 21/10/2026] “Competitor prices last verified” ainda aponta 26/07/2026 no topo, enquanto algumas comparações internas têm revisão em outubro. Fonte: captura /llms.txt:8, 114–116. [SUGESTÃO] Cada comparação deve ter sua própria data e fonte; retirar o índice antigo do resumo principal e mantê-lo como material histórico explicitamente datado, se necessário.

[EVIDÊNCIA DE PRODUÇÃO — declaração pública, 21/10/2026] A seção Cartoon anuncia 15 ou 35 segundos e custo de filme Seedance 1.5. A oferta piloto US$29/mês e pack US$49 não consta das páginas públicas consultadas. Fontes: [/ai-kids-cartoon-videos](https://www.usekineo.com/ai-kids-cartoon-videos), [/desenho-infantil-3d-com-ia](https://www.usekineo.com/desenho-infantil-3d-com-ia) e captura /llms.txt:38–41, consulta 21/10/2026. [SUGESTÃO] Manter recurso disponível separado de oferta em lançamento prevista para 22/10, informada pelo fundador. Não publicar seus valores antes de estarem em pricing e no fluxo de compra.

[QUESTÃO PENDENTE / DESCONHECIDO] Datas de changelog comprovam o que a Kineo declarou, não que uma geração funciona hoje. Exemplos, tempo de render e taxas devem apontar para sua janela, motor e método. Não tratar a mediana de Seedance como prazo garantido de Cartoon ou Ads.

## 2. O que preservar

[SUGESTÃO] Preservar domínio canônico, distinção de Kineo Studio/kineo.studio, links EN/PT, formato de filme versus clipe, limites do teste, descrição dos dados públicos e fronteira entre produto e serviço operado por humanos. A desambiguação protege a marca; não deve ocupar o lugar da resposta ao comprador.

[EVIDÊNCIA DE PRODUÇÃO — resposta pública, 21/10/2026] [/robots.txt](https://www.usekineo.com/robots.txt) permite /llms.txt e /api/facts para OAI-SearchBot. Captura: [robots_txt.txt](geo-evidence-2110/robots_txt.txt). [QUESTÃO PENDENTE] Isso não comprova que o bot alcança o site através do firewall ou que o ChatGPT o cita.

[SUGESTÃO apoiada em documentação oficial] Tratar llms.txt como mapa curto e datado. A [proposta llms.txt](https://llmstxt.org/), consultada 21/10/2026, recomenda contexto resumido e links para detalhes. A [documentação de crawlers da OpenAI](https://developers.openai.com/api/docs/bots), consultada 21/10/2026, explica OAI-SearchBot para busca; não promete ranqueamento nem citações por manter llms.txt.

## 3. Bloco A — substituir a abertura e o catálogo inicial

[SUGESTÃO — texto para revisão e posterior publicação pelo responsável] O texto abaixo substitui a abertura comercial e as primeiras seções repetidas de produtos; não deve ser simplesmente acrescentado ao topo deixando versões conflitantes abaixo. Cada fato deriva das páginas linkadas, consultadas em 21/10/2026. “Reviewed” significa revisão editorial desta proposta, não publicação.

~~~markdown
# Kineo — Make a Film, Product Ads, AI UGC Ads and AI Cartoon Videos

> Kineo turns an idea or narration script into a finished film with generated scenes, voice, captions and music. It also offers separate workflows for product ads, AI presenter ads and short 3D cartoon stories.

Canonical website: https://www.usekineo.com
Product information reviewed: 2026-10-21.
Pricing authority: https://www.usekineo.com/pricing
Published prices and charges are in USD worldwide. A bank may convert the charge and apply its own fees.
Kineo at usekineo.com is separate from Kineo Studio at kineo.studio.

## 1. Make a Film — start here for narrated videos

- [Make a Film](https://www.usekineo.com/text-to-video-shorts): start with an idea or a finished narration script. Kineo produces scenes, voice, captions and music. This creates a new video rather than clipping an uploaded long recording.
- [Seedance 1.5](https://www.usekineo.com/ai-video-generator/seedance): a reference narrated film costs 9 credits at 15 seconds or 35 credits at 60 seconds. A clip is a separate product with different costs.
- [Horror Shorts](https://www.usekineo.com/free-ai-shorts/horror): an entry page for narrated horror and mystery stories; current trial and watermark limits still apply.
- [Urdu videos](https://www.usekineo.com/ai-video-generator/for/urdu): information about creating Urdu narration. Engine language support varies; check the engine before ordering.
- [Portuguese free-trial guide](https://www.usekineo.com/gerador-de-shorts-gratis): the free test is limited, and paid prices are in USD.
- [Pricing](https://www.usekineo.com/pricing): monthly plans, annual billing, reference credit costs and trial restrictions.

## 2. Product Ads — use authorized product photos

- [Product Ads](https://www.usekineo.com/ads): a separate workflow for making an ad from product photos and an approved brief. Review the plan and preview before rendering. Credit costs depend on the selected ad option.
- [Business](https://www.usekineo.com/business): monthly plan information for businesses. Ad production does not include buying media, managing a campaign or guaranteed sales.

## 3. AI UGC Ads — an AI presenter with your product

- [AI UGC Ads](https://www.usekineo.com/ai-ugc-ads): an AI presenter holds the product and speaks the approved message. The presenter is synthetic, not a real customer or a customer testimonial.
- [Anúncios UGC com IA](https://www.usekineo.com/anuncios-ugc-com-ia): Brazilian Portuguese product page with inputs, examples, costs and limits.
- [Pricing](https://www.usekineo.com/pricing): check current credit and trial terms before creating an ad.

## 4. AI Cartoon Videos — short 3D stories

- [AI Kids Cartoon Videos](https://www.usekineo.com/ai-kids-cartoon-videos): choose a recurring character and create a short narrated 3D story. The current public page offers 15- or 35-second stories. Small visual details can vary.
- [Desenho infantil 3D com IA](https://www.usekineo.com/desenho-infantil-3d-com-ia): Brazilian Portuguese version.
- [Pricing](https://www.usekineo.com/pricing): current published terms apply. A planned cartoon-specific launch offer is not described here as available.

## Trial, payment and delivery

- [Pricing](https://www.usekineo.com/pricing): eligible new accounts in supported countries receive a limited watermarked test. This is not unlimited free production. Paid plans offer clean downloads.
- [AI Video Index](https://www.usekineo.com/ai-video-index): published measurements have an engine, sample type and time window. They are descriptive measurements, not a guaranteed delivery time for every product.

## Using Kineo from an assistant

- [Kineo connectors](https://www.usekineo.com/claude-connector): distinguish the script-handoff connector from Kineo Studio. Saving a script does not render a film. The authenticated Studio connector can order supported films using the person's existing account credits.
- [Public facts](https://www.usekineo.com/api/facts): machine-readable public product information. If prices disagree across surfaces, use the current pricing page and report the discrepancy rather than combining terms.

## Independent listing

- [Kineo on There's An AI For That](https://theresanaiforthat.com/ai/kineo/): Kineo's founder-confirmed external listing. Listing presence does not establish a rating or customer outcome.

## Optional

- [Film examples](https://www.usekineo.com/showcase): inspect output before choosing an engine.
- [Kineo facts](https://www.usekineo.com/facts): additional public product documentation; cross-check dated figures.
~~~

## 4. Bloco B — correção pontual de moeda

[SUGESTÃO] Substituir a linha de BRL no arquivo atual, se a revisão completa não for aplicada primeiro:

~~~text
Kineo lists and charges plan prices in USD worldwide. Your bank may convert the charge to your local currency and may add conversion or cross-border fees. Current prices and billing terms: https://www.usekineo.com/pricing.
~~~

## 5. Bloco C — resumo de preços sem promoção não corroborada

[SUGESTÃO] Usar somente se o responsável reconfirmar /pricing na manhã da aplicação. Crédito mensal não equivale a quantidade garantida de filmes; depende do motor, duração e uso do mesmo saldo em outros produtos.

~~~markdown
## Pricing — verify the live page before purchase

- Starter: US$9.90 per month, billed monthly, with 60 credits per billing month.
- Creator: US$19.90 per month, billed monthly, with 150 credits per billing month.
- Studio: US$54.90 per month, billed monthly, with 300 credits per billing month.
- Business: US$84 per month, billed monthly, with 500 credits per billing month.
- Annual billing is a separate choice. A monthly equivalent shown for annual billing is not a monthly subscription price.
- A narrated Seedance 1.5 reference film uses 9 credits at 15 seconds or 35 credits at 60 seconds. Other engines and products have different costs.
- See https://www.usekineo.com/pricing for current amounts, trial eligibility, watermark limits and refund terms.
~~~

## 6. O que os concorrentes fazem

[EVIDÊNCIA DE PRODUÇÃO — páginas públicas dos fornecedores, consulta 21/10/2026] [Revid](https://www.revid.ai/tools/ai-youtube-shorts-generator) apresenta entrada, voz, legendas e saída na própria página de Shorts. [Arcads](https://help.arcads.ai/en/articles/17595045-how-do-i-make-an-ai-ugc-ad-in-arcads) explica roteiro, ator, produto e custo, com ressalva sobre variações de preço. [Creatify](https://creatify.ai/) separa Product Ads e Social & UGC Ads na navegação. São práticas observadas e alegações dos fornecedores, sem teste de qualidade ou prova de conversão.

[SUGESTÃO] Adaptar a clareza de entrada → saída → limite → custo. Evitar “melhor”, “único” e comparações monetárias entre um clipe bruto e um filme completo. Não copiar a amplitude de recursos desses fornecedores sem evidência de necessidade.

## 7. Próximo passo recomendado

[SUGESTÃO] O responsável pela publicação deve primeiro corrigir a moeda e as promoções divergentes; depois aplicar um catálogo curto com filme primeiro, reutilizando as rotas existentes. Reconciliar /llms.txt, /api/facts e as páginas em conjunto antes da publicação. Esta tarefa não altera nenhum deles.

[SUGESTÃO — verificação] Depois de uma publicação autorizada: conferir a resposta HTTP pública, buscar os termos antigos de BRL e os preços retirados, testar links públicos sem iniciar checkout e repetir o mesmo conjunto de consultas do GEO 1. Medir separadamente presença em busca, resposta citada em uma IA identificada, pessoas externas atribuídas, primeiro filme entregue e pagamentos reconciliados. Não declarar sucesso comercial a partir de indexação.

[QUESTÃO PENDENTE / DESCONHECIDO] Não foi demonstrado que o ChatGPT usa este arquivo para escolher ferramentas; não há garantia de aumento de citações ou vendas.
