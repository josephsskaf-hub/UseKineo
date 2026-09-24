# Kit de diretórios e listas — o que o Cowork copia, sem inventar número (24/09/2026)

Por quê: as tarefas 1-3 de 24/09 (diretórios que o ChatGPT lê · GPT Store · Sora acabou) põem a Kineo em dezenas de formulários. Cada campo preenchido de cabeça vira um preço errado indexado por meses (o TAAFT ainda diz "40 créditos" e "from $9.90/mo" da era V5). Este kit é a fonte única de copy e números; toda descrição sai daqui. Números conferidos no código em 24/09: `lib/checkoutPricing.ts` (TIER_PRICES 990/1990/3990, TIER_CREDITS 60/150/300, ANNUAL_PRICES 10×), `lib/freeTierOffer.ts` (TRIAL_GRANT_CREDITS_COPY = 10), `lib/credits/engineCost.ts`, `lib/growth/dfyOffer.ts` (Express 3500 / Pro 7500).

## 1. Identidade

- **Nome:** Kineo (também "Kineo AI"). **URL:** https://www.usekineo.com · **E-mail público:** hello@usekineo.com · **Fundador:** Joseph Skaf · **Sede:** Brasil · **Fundação:** 2026 · **Idiomas do produto:** inglês e espanhol (narração em 40+ idiomas).
- **Logo (PNG 512):** https://www.usekineo.com/icon-512.png · **maskable:** https://www.usekineo.com/icon-maskable-512.png · **favicon SVG:** https://www.usekineo.com/favicon.svg · **Cartão OG 1200×630:** https://www.usekineo.com/og-card.png
- **Screenshots (tirar novos, 1280×800, tema escuro, sem dados pessoais):** home (https://www.usekineo.com), /examples, /seedance-vs-veo-vs-kling, /studio logado na conta do fundador com um pedido digitado e o botão de gerar visível. Nunca usar screenshot antigo com "Five engines".

## 2. Copy oficial (inglês; colar como está)

- **Tagline (≤60):** `Type an idea. Get a cinematic vertical film.`
- **Descrição curta (≤160):** `Turn one idea into a narrated, captioned vertical film in about 3 minutes. Engines: Seedance 1.5, Kling 2.5, Kling 3, Veo 3.1, MiniMax H3 and Kineo 1. Free trial, no card.`
- **Descrição longa (≈90 palavras):** `Kineo is an AI video generator for YouTube Shorts, TikTok and Reels. You type an idea or paste your own script; Kineo writes the scenes, directs the shots, narrates in your language, adds captions and original music, and delivers a vertical MP4 in about 3 minutes. Choose the engine per film: Seedance 1.5 and Kling 2.5 for everyday Shorts, Kling 3, Veo 3.1 and MiniMax H3 for cinematic work, Kineo 1 for stock-footage explainers. Free trial with 10 credits, no card required. Plans from $9.90/month.`
- **Categorias:** AI video generator · text to video · YouTube Shorts maker · TikTok video maker · faceless video · AI ad maker · Sora alternative.
- **Alternativa a (marcar onde o diretório permite):** Sora, Runway, Pika, InVideo AI, Pictory, Fliki, Creatify, HeyGen, Synthesia, Canva Video.
- **Motores ativos (6, conferidos em lib/engineLaunch.ts em 24/09):** Kineo 1, Seedance 1.5, Kling 2.5, MiniMax H3, Veo 3.1, Kling 3. "6 engines" está certo; Omni Flash e Seedance 2.5 pausados.
- **O que NUNCA escrever:** "hundreds of formats", "unlimited", "12 characters", "priority queue", "1080p Kling", "premium voices", "forever storage", "instant", "no human". Nada de Sora como motor nosso (o Sora 2 foi desligado em 24/09/2026; a página é https://www.usekineo.com/sora-alternative).

## 3. Preços (vigentes desde 09/09, congelados até 09/10/2026)

| Plano | Mensal | Créditos/mês | Anual |
|---|---|---|---|
| Free trial | US$0, sem cartão | 10 créditos (2 filmes Kineo 1) | — |
| Starter | US$9.90 | 60 | US$99 |
| Creator | US$19.90 | 150 | US$199 |
| Studio | US$39.90 | 300 | US$399 |

- Custo por filme de 60 s (para "pricing details"): Kineo 1 = 5 créditos · Seedance 1.5 = 25 · MiniMax H3 = 45 · Kling 2.5 = 50 · Veo 3.1 = 100 · Kling 3 = 150. Omni Flash e Seedance 2.5 estão PAUSADOS desde 15/09: não listar como motor. Frase segura: `From under one cent per second on Kineo 1 to cinematic engines at a fixed credit price per film.`
- **Feito para você (empresas):** `Kineo Business Ads: a human editor makes your vertical ad from your brief. Express US$35 (48 h, 1 revision) or Pro US$75 (72 h, 2 revisions). Offered inside the Studio.` Não prometer self-service de anúncios (Studio Ads é 25/09 e sobe desligado).

## 4. Links com UTM (um por diretório; nunca link pelado)

Formato: `https://www.usekineo.com/?utm_source=<slug>&utm_medium=listing&utm_campaign=dir_sep24`
Slugs: `taaft` · `alternativeto` · `futurepedia` · `topai` · `saashub` · `crunchbase` · `g2` · `capterra` · `aitoolsdirectory` · `gptstore` (para o GPT) · `press_sora` (e-mails de imprensa) · `reddit` · `quora`.
Página de destino por intenção: Sora → https://www.usekineo.com/sora-alternative?utm_source=<slug>&utm_medium=listing&utm_campaign=dir_sep24 · comparação de motores → https://www.usekineo.com/seedance-vs-veo-vs-kling?utm_source=<slug>&utm_medium=listing&utm_campaign=dir_sep24 · agências → https://www.usekineo.com/ai-shorts-for-agencies?utm_source=<slug>&utm_medium=listing&utm_campaign=dir_sep24

## 5. GPT Store (strings prontas)

- **Nome:** `Kineo — AI Video Maker (Seedance, Kling 3, Veo)`
- **Descrição (≤300):** `Make a narrated, captioned vertical video from one idea. Pick the engine (Seedance 1.5, Kling 2.5, Kling 3, Veo 3.1, MiniMax H3, Kineo 1), get a script and a link to render it at usekineo.com. Free trial, 10 credits, no card. A Sora alternative that ships films, not clips.`
- **Starters:** `Make a 60s cinematic Short about the Boiling River` · `Turn this script into a video: [paste your script]` · `What's the best Sora alternative for vertical videos?` · `Make a 35s ad for my restaurant`
- **Ação:** https://www.usekineo.com/gpt/openapi.json (v1.2.2, trial de 10 créditos). Instruções do GPT: docs/GPT-KINEO-VIDEO-MAKER.md.

## 6. Imprensa — Sora acabou (assunto + corpo, inglês, rascunho no Gmail; o fundador envia)

- **Assunto:** `Sora 2 shut down today: what small creators are switching to`
- **Corpo (4 linhas):** `Hi <nome>, Sora 2 went dark on September 24. At Kineo (usekineo.com) most people who arrive looking for a replacement want a finished vertical film, not a raw clip: narration, captions and music included. We run Seedance 1.5, Kling 3, Veo 3.1 and MiniMax H3 under one director layer, from $9.90/month, with a free trial and no card. If you are covering the shutdown, I will open a free account with credits for you to try in 3 minutes, and I can share what people are asking for. Joseph Skaf, founder.`
- Só citar crescimento com número se o banco confirmar (consulta 7); sem número, a frase acima já está segura.

## 7. Como medir (SQL, por pessoa, desde 24/09 12:00 UTC)

```sql
-- cadastros e pagantes por diretório (utm_source do cadastro), campanha dir_sep24
select coalesce(nullif(lower(p.signup_utm_source),''),'(sem utm)') as origem,
       count(*) as cadastros,
       count(*) filter (where exists (select 1 from videos v where v.user_id=p.id)) as fizeram_video,
       count(*) filter (where p.has_paid) as pagaram
from profiles p
where p.created_at > '2026-09-24 12:00+00'
  and (lower(coalesce(p.signup_utm_campaign,'')) = 'dir_sep24'
       or lower(coalesce(p.signup_utm_source,'')) in ('taaft','alternativeto','futurepedia','topai','saashub','crunchbase','g2','capterra','aitoolsdirectory','gptstore','press_sora','reddit','quora'))
group by 1 order by 2 desc;

-- chegada do ChatGPT (predicado da casa) por dia, últimos 14 d
select date_trunc('day', p.created_at) as dia,
       count(*) filter (where coalesce(p.signup_utm_source,'') ~* 'chatgpt' or coalesce(p.signup_referrer,'') ~* 'chatgpt[.]com|chat[.]openai[.]com' or coalesce(p.signup_utm_campaign,'') ~* 'chatgpt|gpt_handoff') as chatgpt,
       count(*) as total
from profiles p where p.created_at > now() - interval '14 days' group by 1 order by 1;
```

Releitura: 27/09 e 30/09 (índice do Bing leva 2-3 dias). Citação conta no painel de docs/PAINEL-PROMPTS-CHATGPT-2026-09-23.md.
