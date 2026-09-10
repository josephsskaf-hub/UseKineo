# CITACOES-01 — busca das 20h BRT · 10/09/2026

**EVIDÊNCIA DE PRODUÇÃO — busca pública, 10/09/2026, 20:02:11–20:03:08 BRT (23:02:11–23:03:08 UTC):** repetidas as mesmas 20 consultas individuais, dez EN e dez PT, com uma tentativa por pergunta. As 20 strings foram comparadas automaticamente com o baseline e são idênticas. A fonte operacional desta rodada foi `records[].query_exact` do `chatgpt-20-perguntas.json` da pista principal.

**EVIDÊNCIA DE PRODUÇÃO — fonte local completa:** [JSON desta medição](busca-20-perguntas.json) guarda início/fim de cada consulta, todas as URLs e ordinais retornados, metadados de crawl/publicação, presença da Kineo, concorrentes monitorados, oferta exposta e comparação por pergunta. [Baseline de hoje às 13:48–13:49 BRT](../2026-09-10-prioridade/busca-20-perguntas.json).

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma posição no ChatGPT foi medida por este subtrabalho. Os números de ordem abaixo são exclusivamente os ordinais dos blocos devolvidos pela ferramenta de busca, que intercala notícias, páginas, vídeos, Reddit e documentos. Eles não são ranking ChatGPT, Google ou Bing. Esta rodada não abriu páginas Kineo por HTTP, não criou conta e não fez cliques de aquisição.

## Resultado da comparação

**EVIDÊNCIA DE PRODUÇÃO — mesmas perguntas, mesmo dia:** a Kineo apareceu em 7 dos 20 conjuntos de busca, as mesmas sete consultas do baseline. Continuou ausente nos outros 13 conjuntos; nenhuma consulta ganhou ou perdeu presença do domínio. São 8 ocorrências de URLs Kineo nesta rodada, contra 9 antes, porque `/text-to-video-shorts` deixou de aparecer em EN06. Ocorrências de URLs não são pessoas, cadastros nem receita.

| Consulta | Kineo na busca agora | Ordinais do baseline | Ordinais das 20h | Mudança observada |
|---|---|---|---|---|
| EN01 | Não no conjunto | — | — | Mesma presença e ordem |
| EN02 | Não no conjunto | — | — | Mesma presença e ordem |
| EN03 | Não no conjunto | — | — | Mesma presença e ordem |
| EN04 | Não no conjunto | — | — | Mesma presença e ordem |
| EN05 | Não no conjunto | — | — | Mesma presença e ordem |
| EN06 | Sim | 8, 11 | 7 | Comparativo passou 8→7; texto-para-Shorts não retornou |
| EN07 | Não no conjunto | — | — | Mesma presença e ordem |
| EN08 | Não no conjunto | — | — | Mesma presença e ordem |
| EN09 | Sim | 3 | 3 | Mesma presença e ordem |
| EN10 | Sim | 4 | 4 | Mesma presença e ordem |
| PT01 | Sim | 11 | 12 | Mudou a ordem da ferramenta |
| PT02 | Não no conjunto | — | — | Mesma presença e ordem |
| PT03 | Não no conjunto | — | — | Mesma presença e ordem |
| PT04 | Sim | 6 | 6 | Mesma presença e ordem |
| PT05 | Não no conjunto | — | — | Mesma presença e ordem |
| PT06 | Sim | 2, 8 | 2, 7 | Mudou a ordem da ferramenta |
| PT07 | Não no conjunto | — | — | Mesma presença e ordem |
| PT08 | Não no conjunto | — | — | Mesma presença e ordem |
| PT09 | Não no conjunto | — | — | Mesma presença e ordem |
| PT10 | Sim | 10 | 10 | Mesma presença e ordem |

**EVIDÊNCIA DE PRODUÇÃO — URLs recuperadas da Kineo nesta rodada:**

- [https://www.usekineo.com/best-ai-shorts-generators](https://www.usekineo.com/best-ai-shorts-generators) — EN06, PT01, PT06.
- [https://www.usekineo.com/ai-video-generator/seedance](https://www.usekineo.com/ai-video-generator/seedance) — EN09.
- [https://www.usekineo.com/cheapest-ai-shorts-maker?internal_source=%2Fhow-to-start-a-faceless-youtube-channel](https://www.usekineo.com/cheapest-ai-shorts-maker?internal_source=%2Fhow-to-start-a-faceless-youtube-channel) — EN10.
- [https://www.usekineo.com/gerador-de-shorts-gratis](https://www.usekineo.com/gerador-de-shorts-gratis) — PT04, PT06, PT10.

## Oferta exposta no conteúdo da busca

**CONTRADIÇÃO — índice versus oferta vigente informada pelo fundador em 10/09:** a [página portuguesa de Shorts](https://www.usekineo.com/gerador-de-shorts-gratis) foi recuperada em PT04, PT06 e PT10 anunciando entrada de US$ 14/mês e preço único mundial. O fundador informou planos US$ 9,90 / 19,90 / 39,90 e brasileiros pagando em reais. Na captura anterior, esse preço aparecia explicitamente em PT06 e PT10; agora aparece também em PT04. É a mesma URL exposta em mais uma consulta, não prova de uma nova página errada.

**EVIDÊNCIA DE PRODUÇÃO — metadado da busca:** a ferramenta informou crawl “yesterday” para a página portuguesa e “today” para Seedance, calculadora e comparativo. Esses rótulos pertencem ao índice; não comprovam quando o HTML atual mudou e não são uma nova auditoria HTTP.

**EVIDÊNCIA DE PRODUÇÃO — EN09:** a [página Seedance](https://www.usekineo.com/ai-video-generator/seedance) manteve o ordinal 3 e expôs 30 créditos de trial, custo de 25 créditos por filme de 60 segundos e marca d’água no filme gratuito. O trecho não explicitou exigência ou dispensa de cartão; esse campo permanece desconhecido nesta observação.

**EVIDÊNCIA DE PRODUÇÃO — EN10:** a [calculadora de produção](https://www.usekineo.com/cheapest-ai-shorts-maker?internal_source=%2Fhow-to-start-a-faceless-youtube-channel) manteve o ordinal 4. O conteúdo retornado mostrou 30 créditos grátis, motores liberados, marca d’água no trial e download limpo após upgrade; não mostrou os três preços mensais numéricos. Créditos por motor foram preservados no JSON como observações do índice.

**QUESTÃO PENDENTE / DESCONHECIDO:** os trechos do comparativo em EN06, PT01 e PT06 não permitem atribuir um preço ou limite gratuito à Kineo. Menções a planos de Fliki ou VEED nessa página não foram tratadas como oferta Kineo.

**HIPÓTESE — interpretação limitada:** a estabilidade da presença em 7/20 consultas e a persistência de uma oferta antiga no trecho português são compatíveis com visibilidade ainda sem avanço nesta bateria e atualização desigual das cópias recuperadas. Não isolam efeito de conteúdo publicado, crawler, sazonalidade, modelo ou aquisição. A recuperação de citações no produto ChatGPT e a meta de cadastros permanecem dependentes das medições correspondentes da pista principal.

## Registros auditáveis por consulta

### EN01

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** What are the best free AI video generators for YouTube Shorts? Give me five options, their free limits, and website links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:11 BRT; término 2026-09-10 20:02:14 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [10 Best Free AI Video Generators for YouTube Shorts (2026)](https://parthskills.com/blog/free-ai-video-generators-for-youtube-shorts/)
3. [5 Best Free AI YouTube Shorts Makers — Tested on the Same Prompt (2026)](https://flowshorts.app/blog/youtube-shorts-maker-free-ai)
4. [Free AI YouTube Shorts Maker: What 'Free' Actually Gets You · Lumigen Blog](https://lumigen.app/blog/free-ai-youtube-shorts-maker-2026/)
5. [Best AI YouTube Shorts Generator (2026) · AITuber](https://aituber.app/blog/best-ai-youtube-shorts-generator/)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 4, 24; Pika: 24, 33; Runway: 30, 37; Higgsfield: ausente no conjunto; Fliki: ausente no conjunto; HeyGen: ausente no conjunto.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN02

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** How can I turn my script into a complete faceless video for free, including voiceover and captions? Recommend five websites with links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:11 BRT; término 2026-09-10 20:02:14 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [AI Faceless Video Generator 2026: 2,250+ Voices, Free](https://freetts.org/ai-faceless-video-generator)
3. [Best Free AI Faceless Video Generators 2026 · VIDEO AI ME · VIDEOAI.ME Blog](https://videoai.me/blog/best-free-ai-faceless-video-generators-2026)
4. [Make Faceless Videos · Free AI Faceless Video Maker](https://www.makefacelessvideos.com/)
5. [Free AI Faceless Video Generator for YouTube and other social media](https://www.heygen.com/tool/faceless-video)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 3, 6, 7, 12; Pika: ausente no conjunto; Runway: 35; Higgsfield: ausente no conjunto; Fliki: 3, 7, 12, 29, 32, 33; HeyGen: 5, 10.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN03

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** What are the best free AI tools to create TikTok videos without showing my face? Recommend five with links and explain their limits.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:11 BRT; término 2026-09-10 20:02:14 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [Best AI Video Generator for TikTok in 2026: 5 Tools Compared - Toolnova-AI](https://www.toolnova-ai.com/2026/07/best-ai-video-generator-for-tiktok.html)
3. [11 Best Free AI Video Generators 2026: Tested & Ranked](https://toolchase.com/blog/best-free-ai-video-generators-2026/)
4. [Best Free AI TikTok Video Makers (No Watermark) · Renderforest](https://www.renderforest.com/blog/free-ai-tiktok-video-maker-no-watermark)
5. [5 Best Free AI Video Generators in 2026 (No Watermark, No Sign-Up Required) · NoMusica.com](https://nomusica.com/best-free-ai-video-generators/)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 4, 14; Pika: 20, 21, 32; Runway: 11, 15, 20, 21; Higgsfield: 20; Fliki: 7, 11, 20; HeyGen: 4, 9, 25.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN04

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** I have a 60-second horror story script. What are five good websites to turn it into a narrated YouTube Short with captions? Include prices and links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:11 BRT; término 2026-09-10 20:02:14 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [Scary Story Video Generator — Faceless Horror · Fableclip](https://fableclip.com/scary-story-video-generator)
3. [7 best AI video generators for YouTube Shorts in 2026 · ClipNova](https://www.clipnova.io/en/blog/best-ai-video-generators-for-youtube-shorts)
4. [Scary Story Video Maker — Faceless Creepypasta Shorts · Nova](https://novaclipper.com/for/scary-story-video-maker)
5. [AI Horror Story Generator: Scary Story Videos for TikTok & Shorts](https://ghostshorts.com/ai-horror-story-generator)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: ausente no conjunto; Pika: ausente no conjunto; Runway: 31; Higgsfield: ausente no conjunto; Fliki: 3, 11, 29; HeyGen: ausente no conjunto.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN05

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** What is the cheapest way to make complete 60-second AI Shorts with narration and captions? Compare five tools by cost per finished video and link to them.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:26 BRT; término 2026-09-10 20:02:29 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [How to Make YouTube Shorts with AI in Under 5 Minutes · TechSifted](https://www.techsifted.com/guides/make-youtube-shorts-with-ai/)
3. [Cheapest AI Video Tools: Cost-Per-Video Ranked (2026) · AIReelVideo](https://aireelvideo.com/en/blog/cheapest-ai-video-tools)
4. [Best AI Shorts Makers 2026 — Honest Ranking (5 Tested) · Clipflow](https://clipflow.to/best/ai-shorts-maker)
5. [5 Best Free AI YouTube Shorts Makers — Tested on the Same Prompt (2026)](https://flowshorts.app/blog/youtube-shorts-maker-free-ai)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 11, 12, 17; Pika: 2, 7, 11, 26; Runway: 26; Higgsfield: ausente no conjunto; Fliki: 6, 7, 11, 27; HeyGen: ausente no conjunto.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN06

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** I wrote a YouTube Shorts script in ChatGPT. Which five tools can turn it into a finished video with voiceover and subtitles? Include entry prices and links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:26 BRT; término 2026-09-10 20:02:29 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Recuperou o comparativo Kineo no ordinal 7, destacando roteiro/voz/visuais/legendas e Fast Mode de 3–7 minutos. O trecho não mostrou preço ou quantidade do trial. A URL texto-para-Shorts que aparecia no baseline não apareceu nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — [Kineo no ordinal 7](https://www.usekineo.com/best-ai-shorts-generators):** Sem preço ou trial atribuível à Kineo no trecho retornado.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [7 best AI video generators for YouTube Shorts in 2026 · ClipNova](https://www.clipnova.io/en/blog/best-ai-video-generators-for-youtube-shorts)
3. [How to Make YouTube Shorts with AI in Under 5 Minutes · TechSifted](https://www.techsifted.com/guides/make-youtube-shorts-with-ai/)
4. [Best AI YouTube Shorts Generators (2026)](https://www.swipestory.click/en/blog/best-ai-youtube-shorts-generators)
5. [Best AI Video Generator for YouTube in 2026: 9 Tools Compared](https://screenapp.io/blog/ai-video-generator-for-youtube)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 5, 8, 10, 28; Pika: 33; Runway: 5; Higgsfield: ausente no conjunto; Fliki: 2, 7, 10, 12, 32; HeyGen: 7, 14.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN07

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** What are five affordable alternatives to InVideo AI for complete faceless YouTube Shorts? I am willing to pay. Include monthly prices and website links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:26 BRT; término 2026-09-10 20:02:29 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [Best InVideo AI Alternatives (2026): Honest Review Included](https://www.noodletomato.com/blog/best-invideo-alternative)
3. [InVideo AI Alternatives: 8 AI Video Generators (2026) · DesignRevision](https://designrevision.com/alternatives/invideo-ai)
4. [Best InVideo AI Free Alternatives in 2026: 7 Tools I Actually Tested](https://websites2know.com/best-invideo-ai-free-alternatives/)
5. [Best InVideo Alternatives in 2026 (6 Tools Compared)](https://jupitrr.com/alternatives/invideo-alternatives)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 21, 22, 23, 24, 25, 27, 28, 29, 30; Pika: ausente no conjunto; Runway: 5, 26; Higgsfield: ausente no conjunto; Fliki: 3, 5, 7, 10; HeyGen: 3, 5, 24.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN08

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** I have a budget of $30 a month for narrated faceless Shorts. Which five AI video tools would you recommend for ready-to-publish videos? Include prices and links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:26 BRT; término 2026-09-10 20:02:29 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [Compare all major AI video editors](https://faceless.so/compare)
3. [AI Video Tools Directory](https://faceless.so/directory/ai-video-tools)
4. [Best Faceless Video Generators in 2026 · Vidroot](https://vidroot.com/blog/best-faceless-video-generators-2026)
5. [The Best AI Faceless Video Generators in 2026, Compared Honestly · PassiveShorts](https://passiveshorts.com/blog/best-ai-faceless-video-generators/)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 7, 9, 13, 19, 23, 26; Pika: 19; Runway: 25; Higgsfield: 20; Fliki: 9, 24; HeyGen: 8.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN09

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Where can I make a complete 60-second video using Seedance with narration, music and captions, without assembling clips myself? Recommend five options and include prices and links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:38 BRT; término 2026-09-10 20:02:43 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Recuperou Seedance 1.5 no ordinal 3: 25 créditos por filme de 60 segundos, trial de 30 créditos e export gratuito com marca d’água. A quantidade de créditos coincide com a oferta informada pelo fundador.

**EVIDÊNCIA DE PRODUÇÃO — [Kineo no ordinal 3](https://www.usekineo.com/ai-video-generator/seedance):** Trial 30 créditos; Seedance 1.5 25 créditos/60 segundos; filme gratuito com marca d’água.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [Seedance Pricing 2026 — Free to Start, Plans from $28/mo · Seedance](https://www.seedance.tv/pricing)
3. [Seedance 1.5 AI Video Generator for YouTube Shorts · Kineo](https://www.usekineo.com/ai-video-generator/seedance)
4. [Seedance 2.0 Pricing in 2026: Full Breakdown on What Subscriptions Are Worth It](https://higgsfield.ai/blog/seedance-2-0-pricing-2026)
5. [Seedance 2.5 for Audio-Synced Video: Top 10 Platforms for 2026 - Spero Magazine](https://speromagazine.com/seedance-2-5-for-audio-synced-video-top-10-platforms-for-2026/)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 29; Pika: 27; Runway: 27; Higgsfield: 4, 14; Fliki: ausente no conjunto; HeyGen: 14.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### EN10

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Which five AI Shorts makers let me try a complete narrated video at low cost before committing to a monthly plan? Explain the trial charge, renewal price, and links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:38 BRT; término 2026-09-10 20:02:43 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Recuperou a calculadora no ordinal 4. O conteúdo retornado incluiu 30 créditos grátis, motores liberados, trial com marca d’água e upgrade para download limpo, além de custos em créditos por motor. O trecho não mostrou os três preços mensais numéricos.

**EVIDÊNCIA DE PRODUÇÃO — [Kineo no ordinal 4](https://www.usekineo.com/cheapest-ai-shorts-maker?internal_source=%2Fhow-to-start-a-faceless-youtube-channel):** 30 créditos grátis; todos os motores liberados; trial com marca d’água; download limpo após upgrade.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [Short Studio](https://shortstudio.io/)
3. [Pricing — AI video generator plans from €9/month](https://shortlify.art/pricing)
4. [Affordable AI Shorts Maker — Start With a Free Creator Trial · Kineo](https://www.usekineo.com/cheapest-ai-shorts-maker?internal_source=%2Fhow-to-start-a-faceless-youtube-channel)
5. [Best AI Shorts Makers 2026 — Honest Ranking (5 Tested) · Clipflow](https://clipflow.to/best/ai-shorts-maker)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 10, 15, 19, 20; Pika: 15; Runway: 18, 20; Higgsfield: ausente no conjunto; Fliki: 18; HeyGen: ausente no conjunto.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT01

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Quais são os melhores geradores de vídeo com IA gratuitos para YouTube Shorts? Dê cinco opções, seus limites gratuitos e links dos sites.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:38 BRT; término 2026-09-10 20:02:43 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Recuperou o comparativo Kineo no ordinal 12, sem escrever Kineo no título/trecho textual fora da URL. O trecho falou de Fliki, sem preço ou trial atribuível à Kineo.

**EVIDÊNCIA DE PRODUÇÃO — [Kineo no ordinal 12](https://www.usekineo.com/best-ai-shorts-generators):** Sem preço ou trial atribuível à Kineo no trecho retornado.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [5 Best Free AI YouTube Shorts Makers — Tested on the Same Prompt (2026)](https://flowshorts.app/blog/youtube-shorts-maker-free-ai)
2. [10 Best Free AI Video Generators for YouTube Shorts (2026)](https://parthskills.com/blog/free-ai-video-generators-for-youtube-shorts/)
3. [Melhores Criadores Gratuitos de YouTube Shorts com IA em 2026](https://www.nemovideo.com/pt-BR/blog/ai-video-generator/free-youtube-shorts-maker)
4. [Melhores geradores de vídeo IA grátis em 2026 (top 12) · iaVideo.pt](https://iavideo.pt/blog/melhores-geradores-video-ia-gratis-2026)
5. [Os melhores geradores de vídeo gratuitos IA : texto ou imagem? (2026)](https://dreamina.capcut.com/pt-br/ai-video/best-free-ai-generation-tools-2026)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 9, 10, 11, 18, 28; Pika: 10; Runway: 9, 10, 34, 35; Higgsfield: ausente no conjunto; Fliki: 12; HeyGen: 9, 10.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT02

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Como posso transformar meu roteiro em um vídeo completo sem aparecer, de graça, incluindo narração e legendas? Recomende cinco sites com links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:38 BRT; término 2026-09-10 20:02:43 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [Gerador de Vídeos Sem Rosto com IA: Sem Câmera, Sem Edição](https://www.heygen.com/pt-br/tool/faceless-video)
2. [ClipIA - Crie vídeos curtos com IA](https://clipia.com.br/)
3. [Crie vídeos só com uma ideia](https://reelava.com/)
4. [ClipNova para canais faceless, publique todo dia sem gravar](https://www.clipnova.io/pt/canais-sem-rosto)
5. [Criador de Vídeo com Inteligência Artificial Grátis — Faça Vídeo a Partir de Texto · Vivideo](https://vivideo.ai/pt-br/recursos/criador-de-video-ia)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: ausente no conjunto; Pika: 6; Runway: 6; Higgsfield: ausente no conjunto; Fliki: ausente no conjunto; HeyGen: 1, 6.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT03

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Quais são as melhores ferramentas de IA gratuitas para criar vídeos de TikTok sem mostrar meu rosto? Recomende cinco com links e explique seus limites.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:52 BRT; término 2026-09-10 20:02:55 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [Testei 5 IAs para Criar Vídeos no TikTok: Eis a Melhor em Custo-Benefício](https://inteligenciasetorial.com.br/inteligencia-artificial-para-criar-videos-no-tiktok-1-2/)
2. [Como criar vídeos com IA: as melhores ferramentas gratuitas em 2026 · Exame](https://exame.com/tecnologia/examelab/como-criar-videos-com-ia-as-melhores-ferramentas-gratuitas-em-2026/)
3. [IAs Gratuitas para Gerar Vídeos: Opções e Limites](https://acervodigital.net/melhores-ias-gratuitas-para-geracao-de-video/)
4. [IA para vídeo: Runway, Kling, Pika, HeyGen — qual usar e como criar sem aparecer · Modo Build](https://www.modobuild.com.br/blog/ia-para-videos-ferramentas-e-fluxo)
5. [Top 5 Ferramentas de IA Gratuitas p/ Criar Vídeos Sem aparecer](https://empreendersuaideia.com/ferramentas-de-ia-gratuitas-p-criar-videos-sem-aparecer-automatico/)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 8, 25; Pika: 4, 8; Runway: 4, 9, 10; Higgsfield: ausente no conjunto; Fliki: ausente no conjunto; HeyGen: 1, 4, 8.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT04

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Tenho um roteiro de história de terror de 60 segundos. Quais são cinco bons sites para transformá-lo em um YouTube Short narrado com legendas? Inclua preços e links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:52 BRT; término 2026-09-10 20:02:55 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Recuperou a página portuguesa no ordinal 6 com roteiro preservado, alvo de 35 segundos e preço anunciado de US$ 14/mês igual no mundo todo. Essa oferta do índice contradiz a instrução vigente do fundador.

**CONTRADIÇÃO — [Kineo no ordinal 6](https://www.usekineo.com/gerador-de-shorts-gratis):** Entrada US$ 14/mês e preço mundial único; não usar como oferta atual.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [Gerador de vídeos de histórias sob… · Animate Your Story](https://animateyourstory.com/pt/)
2. [odarkly.com — Crie vídeos de canal dark com IA](https://odarkly.com/)
3. [Gerador de vídeos para canal dark (com IA, em português) · Reelry](https://www.reelry.app/pt-br/gerador-de-videos-para-canal-dark)
4. [ClipIA - Crie vídeos curtos com IA](https://clipia.com.br/)
5. [Playshort — Crie Shorts e Séries de vídeo com IA](https://playshort.com.br/)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 10; Pika: ausente no conjunto; Runway: ausente no conjunto; Higgsfield: ausente no conjunto; Fliki: ausente no conjunto; HeyGen: ausente no conjunto.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT05

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Qual é a forma mais barata de fazer Shorts completos de 60 segundos com IA, narração e legendas? Compare cinco ferramentas pelo custo por vídeo finalizado e forneça seus links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:52 BRT; término 2026-09-10 20:02:55 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [Melhor IA para Cortes de Vídeo em 2026: Comparamos as 7 Principais — Autoclipper](https://autoclipper.live/blog/melhor-ia-para-cortes-2026)
3. [Vizard vs Opus Clip vs Ssemble 2026: qual ferramenta de clipping com IA vence? · Ssemble](https://www.ssemble.com/pt/blog/vizard-vs-opus-clip-vs-ssemble)
4. [7 best AI video generators for YouTube Shorts in 2026 · ClipNova](https://www.clipnova.io/en/blog/best-ai-video-generators-for-youtube-shorts)
5. [AlphaCut vs OpusClip — Comparativo de recursos, preços e qualidade (2026)](https://alphacut.video/pt/vs/alphacut-vs-opusclip)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 10, 29; Pika: ausente no conjunto; Runway: 7, 11; Higgsfield: ausente no conjunto; Fliki: ausente no conjunto; HeyGen: 11.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT06

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Escrevi um roteiro de YouTube Shorts no ChatGPT. Quais cinco ferramentas podem transformá-lo em um vídeo finalizado com narração e legendas? Inclua os preços de entrada e links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:02:52 BRT; término 2026-09-10 20:02:55 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Recuperou a página portuguesa no ordinal 2 e o comparativo no ordinal 7. A página portuguesa voltou a anunciar US$ 14/mês e preço mundial único; o comparativo não forneceu preço atribuível à Kineo.

**CONTRADIÇÃO — [Kineo no ordinal 2](https://www.usekineo.com/gerador-de-shorts-gratis):** Entrada US$ 14/mês e preço mundial único; não usar como oferta atual.

**EVIDÊNCIA DE PRODUÇÃO — [Kineo no ordinal 7](https://www.usekineo.com/best-ai-shorts-generators):** Sem preço ou trial atribuível à Kineo no trecho retornado.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [Gerador de Shorts com IA Grátis (sem aparecer) — Kineo](https://www.usekineo.com/gerador-de-shorts-gratis)
3. [Aipostou — Sua fábrica de Shorts e Carrosséis virais no piloto automático](https://aipostou.com/)
4. [Gerador de YouTube Shorts com IA · Transforme Texto em Vídeos Curtos Virais](https://www.revid.ai/pt/tools/gerador-shorts-youtube-ia)
5. [BlueTube — Transcritor de Shorts, TikTok e Instagram](https://www.bluetubeviral.com/)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 11, 27; Pika: ausente no conjunto; Runway: ausente no conjunto; Higgsfield: ausente no conjunto; Fliki: ausente no conjunto; HeyGen: ausente no conjunto.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT07

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Quais são cinco alternativas acessíveis ao InVideo AI para YouTube Shorts completos sem aparecer? Estou disposto a pagar. Inclua preços mensais e links dos sites.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:03:04 BRT; término 2026-09-10 20:03:08 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [Best InVideo AI Alternatives (2026): Honest Review Included](https://www.noodletomato.com/blog/best-invideo-alternative)
2. [7 Melhores Alternativas ao InVideo em 2026 (Testadas)](https://onvid.ai/pt-br/alternativas/invideo)
3. [Best AI YouTube Shorts Generator (2026) · AITuber](https://aituber.app/blog/best-ai-youtube-shorts-generator/)
4. [Best AI Video Generators for YouTube (2026) · Flowjam](https://www.flowjam.com/blog/best-ai-video-generators-youtube-2026)
5. [AutoTuber AI Alternatives After the Shutdown · AITuber](https://aituber.app/blog/autotuber-ai-alternatives/)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 14, 16, 17, 18, 31, 34; Pika: ausente no conjunto; Runway: ausente no conjunto; Higgsfield: ausente no conjunto; Fliki: 4, 12; HeyGen: 4.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT08

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Tenho um orçamento de US$ 30 por mês para Shorts narrados sem aparecer. Quais cinco ferramentas de vídeo com IA você recomendaria para vídeos prontos para publicar? Inclua preços e links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:03:04 BRT; término 2026-09-10 20:03:08 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [The best software for editing videos for YouTube](https://www.creativebloq.com/buying-guides/best-software-for-editing-videos-for-youtube)
2. [IA para vídeo: Runway, Kling, Pika, HeyGen — qual usar e como criar sem aparecer · Modo Build](https://www.modobuild.com.br/blog/ia-para-videos-ferramentas-e-fluxo)
3. [Best AI Video Generator for YouTube Shorts (2026 Picks) · Pexo](https://pexo.ai/blog/best-ai-video-generator-youtube-shorts-5784)
4. [21 Best AI Short-Form Video Tools (2026) · PostEverywhere](https://posteverywhere.ai/blog/20-best-ai-short-form-video-tools)
5. [5 Melhores Ferramentas de IA para Vídeos Curtos em Redes Sociais em 2026 · SimilarLabs](https://similarlabs.com/pt/blog/best-ai-short-video-tools-social-media)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 5, 11, 32; Pika: 2; Runway: 2, 11; Higgsfield: ausente no conjunto; Fliki: 30; HeyGen: 2, 5, 6.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT09

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Onde posso fazer um vídeo completo de 60 segundos usando Seedance com narração, música e legendas, sem montar os clipes por conta própria? Recomende cinco opções e inclua preços e links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:03:04 BRT; término 2026-09-10 20:03:08 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Nenhum domínio ou menção explícita à Kineo no conjunto limitado de resultados retornado. Não há oferta Kineo exposta a classificar nesta consulta.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [Seedance 2.0: modelo de vídeo com IA · Seedance Studio](https://tryseedance.ai/pt/seedance-2-0)
2. [Gerador de Videoclipes com IA para Criadores de Dança · Seeddance](https://seeddance.video/pt/music-to-video)
3. [Produzir seedance realista, anúncios em vídeo com ia, vídeos seedance 2 0](https://br.fiverr.com/leoemmanuel758/produce-realistic-seedance-ai-video-ads-seedance-2-0-videos)
4. [Seedance 2.0/2.5 AI Video Generator · Vídeos Cinematográficos em Segundos](https://seedance20.co/pt/)
5. [Melhores geradores de videoclipes com IA em 2026: ritmo, letras e controle visual](https://www.seeddance.io/pt/blog/best-ai-music-video-generators-2026)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: ausente no conjunto; Pika: ausente no conjunto; Runway: 15; Higgsfield: 3; Fliki: ausente no conjunto; HeyGen: ausente no conjunto.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

### PT10

**EVIDÊNCIA DE PRODUÇÃO — consulta exata:** Quais cinco criadores de Shorts com IA permitem testar um vídeo narrado completo a baixo custo antes de assumir um plano mensal? Explique a cobrança do teste, o preço de renovação e os links.

**EVIDÊNCIA DE PRODUÇÃO — horário:** início 2026-09-10 20:03:04 BRT; término 2026-09-10 20:03:08 BRT. Uma tentativa.

**EVIDÊNCIA DE PRODUÇÃO — resultado:** Recuperou a página portuguesa no ordinal 10, com seleção Seedance/Fast conforme saldo e preço anunciado de US$ 14/mês igual em todos os países. A quantidade de 30 créditos não estava escrita nesse trecho.

**CONTRADIÇÃO — [Kineo no ordinal 10](https://www.usekineo.com/gerador-de-shorts-gratis):** Entrada US$ 14/mês e preço mundial único; não usar como oferta atual.

**EVIDÊNCIA DE PRODUÇÃO — primeiros cinco blocos da ferramenta, sem tratá-los como recomendação editorial:**

1. [Criar Shorts com IA e Cortes Automáticos · ViralShorts AI](https://viralshortsai.com.br/)
2. [Preços sem truques. · ShortLoom.ai](https://shortloom.ai/pt/pricing)
3. [Criador de Clipes IA Grátis — Vídeos em Shorts · Short.now](https://short.now/pt/)
4. [Cortes Studio — Crie vídeos virais com IA em minutos](https://cortesstudio.com.br/)
5. [Melhores Criadores Gratuitos de YouTube Shorts com IA em 2026](https://www.nemovideo.com/pt-BR/blog/ai-video-generator/free-youtube-shorts-maker)

**EVIDÊNCIA DE PRODUÇÃO — concorrentes mencionados no texto dos blocos, por ordinal:** InVideo: 33; Pika: ausente no conjunto; Runway: ausente no conjunto; Higgsfield: ausente no conjunto; Fliki: ausente no conjunto; HeyGen: ausente no conjunto.

**QUESTÃO PENDENTE / DESCONHECIDO:** esses ordinais não são posição no ChatGPT. Contratos de concorrentes e HTML atual não foram auditados nesta rodada.

## Fechamento desta medição

**EVIDÊNCIA DE PRODUÇÃO — execução:** 20 consultas concluídas, 20 comparações de strings aprovadas, 7 presenças do domínio mantidas, nenhuma presença nova ou perdida e 4 URLs Kineo distintas recuperadas. Oferta com 30 créditos explícita em EN09/EN10; oferta antiga de entrada US$ 14 e preço mundial único exposta em PT04/PT06/PT10.

**SUGESTÃO — encaminhamento:** preservar esta captura como medição única das 20h e consolidar com a bateria real da interface do ChatGPT. Não repetir consultas extras para escolher um resultado mais favorável. A divergência da oferta recuperada continua sendo item de acompanhamento; este documento não solicita outra mudança de preço.
