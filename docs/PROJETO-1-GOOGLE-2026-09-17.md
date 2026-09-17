# PROJETO 1 — GOOGLE: de 9 para 1.000 visitantes por semana (começa 17/09/2026)

**Decisão do fundador (17/09 00:40 BRT):** "amanhã colocamos no papel e começamos pelo que mais impacta; cria um projeto para o primeiro e já fazemos amanhã".

**Por que este é o nº 1:** os concorrentes não têm motor melhor (mesma fal), têm Google. Fliki: ~1 milhão de visitas/mês, quase todo orgânico, de páginas de intenção. Kineo: **9 visitantes do Google em 7 dias** (homepage_view por referrer, 10-16/09). É o maior buraco da aquisição e o único canal que cresce sozinho depois de construído. Não depende de preço (congelado até 09/10) nem de dinheiro.

**Meta e medida:**
| Marco | Quando | Como medir |
|---|---|---|
| 100 páginas de intenção no ar, indexadas | 24/09 | Google Search Console: páginas indexadas |
| 100 visitantes/semana do Google | 08/10 | `homepage_view` + `page_view` com referrer google, por ip_hash |
| 1.000 visitantes/semana do Google | 15/11 | idem |
| Cadastro por visitante ≥ 8% (TAAFT faz 29%) | contínuo | `signup_utm_source = 'google'` / visitantes |

**O que existe e reaproveita (não construir de novo):** `/ai-video-generator/<motor>` (páginas por motor), `/vs/*` (comparativos), `/examples` (20 melhores), `/v/<id>` (página pública de filme com consentimento), `/llms.txt` e `/api/facts` (fonte única de fatos), sitemap e IndexNow (publicação de filme já submete), nota de coerência por filme (escolhe os melhores exemplos com prova), filmes validados pelo fundador (Seedance 9,5 · Veo 9 · Kling 2.5 · Kling 3).

## Fases

**Fase 1 (17-19/09) — a fábrica de páginas, sem mentir.**
1. Uma rota `/make/<slug>` (ou `/ai-video-generator/for/<slug>`) que gera a página a partir de um catálogo tipado (`lib/seo/intentPages.ts`): título, H1, 3 filmes reais do catálogo (por motor e nota), o que a pessoa escreve (exemplo de prompt), o que sai, preço e trial lidos da fonte única (nada de literal), FAQ com o schema JSON-LD, CTA para /studio com `?prompt=` pré-preenchido e `utm_source=google&utm_campaign=intent_<slug>`.
2. Catálogo inicial de 100 slugs em 4 famílias: **nicho** (faceless YouTube channel, real estate, history, true crime, finance, science, motivation, kids stories, product demo, church, coach…), **formato** (YouTube Shorts, TikTok, Reels, 60-second explainer, documentary short…), **idioma** (Spanish, Hindi, Portuguese, French, German, Arabic… — o produto já narra nessas línguas), **alternativa** (InVideo, Fliki, Pictory, Synthesia, HeyGen, Runway, Pika alternative — só o que for verdade em cada comparação).
3. Guardião: toda página passa pelo mesmo teste do `/llms.txt` (preço, trial, motores pausados); nenhuma frase que o guardião de copy proíbe.
4. Sitemap com as 100; IndexNow para todas; Search Console verificado (fundador: só a verificação de DNS/HTML é dele).

**Fase 2 (22-26/09) — prova nas páginas.** Cada página mostra 3 filmes reais com nota de coerência ≥ 85 e consentimento (publicados via /v/). Vitrine por nicho vira também material para o ChatGPT citar.

**Fase 3 (29/09→) — os primeiros 100 visitantes dizem o que ranqueia.** Search Console mostra as queries; dobrar as famílias que aparecem, cortar as que não. Escrever 1 página longa por semana para a query que mais imprime.

## Dia 1 (17/09), depois do conserto do Kling 3 e do render de prova
- [ ] `lib/seo/intentPages.ts` com os 100 slugs e os textos (Claude escreve; fundador lê 5 por amostragem).
- [ ] Rota + template + JSON-LD + sitemap + IndexNow.
- [ ] Guardião `scripts/test-projeto-1-google-2026-09-17.mjs`.
- [ ] Sonda: curl em 3 páginas com controle 404; deploy; entrada no PEDIDOS.
- [ ] Fundador: verificar o domínio no Google Search Console (Claude prepara o passo a passo).

## O que NÃO é este projeto
Anúncio pago (só com conversão ≥ 3%), mudança de preço/oferta (congelado até 09/10), conteúdo de blog genérico sem filme real na página.

## Projetos seguintes na fila (um por vez)
2. Checkout no fim do 2º filme (conversão) — 3. Reativação com o filme pronto — 4. Afiliados que pagam (atribuição consertada, 50% do 1º mês, 20 YouTubers) — 5. Laço viral: "refaça este filme" na página pública — 6. Idiomas: landing por idioma + ChatGPT em ES/HI.

## Dia 1 executado — 17/09 03:19 BRT (commit 3a758149)
- 100 páginas no ar em `/ai-video-generator/for/<slug>` + hub; sitemap e llms.txt atualizados; guardião 17/17; tsc ✓.
- Próximo: sonda com controle 404, IndexNow das 101 URLs, Search Console (fundador confere o domínio verificado: `public/google1a66c904ab852fb7.html` já existe), e o placar de cadastros por `utm_source=google` a partir de hoje.
