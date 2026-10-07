# Visibilidade da Kineo no ChatGPT — rodada 1 (06/10/2026): o que foi feito e o que falta

Fonte: `kineo/visibilidade-chatgpt/kineo-visibilidade-chatgpt-2026-10-06.csv` (Cowork, 20 perguntas, chat temporário, busca
ligada, memória desligada). Tarefa semanal: "Kineo — visibilidade no ChatGPT (semanal)", segundas 08:52 BRT, 28 perguntas a
partir de 12/10 (ajuste do fundador em 06/10 22:30), com a coluna "página da Kineo usada como fonte" e "vs semana anterior".

## Resultado da rodada 1
- Kineo em 3/20, só nas perguntas que já citavam a marca (15, 17, 18). 0/17 nas genéricas.
- 13 ("Seedance, Kling e Veo num lugar só") = a proposta da Kineo → ganhou a Kenerate AI.
- 17 ("What is Kineo AI video maker?") → descreveu a **kineo.studio** (outra empresa); usekineo.com só no fim.
- 18 ("Is usekineo.com legit?") → "legit, mas pouco estabelecido": domínio de 30/06/2026, ScamAdviser, Gridinsoft.
- Nenhuma página da Kineo usada como fonte, nem na 15 (onde a resposta recomendou a Kineo).

## Entregue nesta sessão (main)
| Item | Onde |
|---|---|
| Página "Seedance, Kling and Veo in one place" (tabela de preço por vídeo de todo motor indexável, data, FAQ, outros que hospedam vários modelos com fonte datada) | `/seedance-kling-veo-in-one-place` |
| Página "AI faceless YouTube Shorts generator" (preço por Short por motor e quantos por plano, como funciona, quando outra ferramenta serve melhor, FAQ) | `/faceless-youtube-shorts-generator` |
| Página "Kineo vs kineo.studio — not the same company" (fatos datados dos dois lados, neutra) | `/kineo-vs-kineo-studio` |
| InVideo: a página de alternativas ganhou a linha de base do próprio InVideo (invideo.io/pricing lido em 06/10) e o preço por Short da Kineo; "[CONFIRMAR]" deixou de sair cru na tabela e na FAQ dessa página | `/vs/invideo-alternatives-faceless-shorts` |
| Marca: alias "Kineo (usekineo.com)", `disambiguatingDescription` no Organization/SoftwareApplication global e da home, H1 do llms.txt "Kineo (usekineo.com)" + linha de desambiguação | `lib/brandIdentity.ts`, `components/StructuredData.tsx`, `app/page.tsx`, `app/llms.txt/route.ts` |
| Superfícies: sitemap (lastmod 06/10), llms.txt (seção "Price-per-video answer pages"), rodapé | `app/sitemap.ts`, `components/Footer.tsx` |
| Guardião | `scripts/test-visibilidade-chatgpt-2026-10-06.mjs` |

Todo preço da Kineo nas páginas vem de `ENGINE_GEO` (mesma função que cobra). Fontes de terceiros: `lib/seo/citableHubPages.ts`.

## NÃO publicado — decisão do fundador
**`/cheapest-way-to-use-seedance-and-kling-3`** está no ramo `geo/cheapest-page-review` (prévia na Vercel). A versão honesta
diz que a Kineo **não** é a mais barata por clipe cru: na régua oficial da casa (`lib/clips/clipPriceVsMarket.ts`), em 06/10:
- Kling 3 (5 s, 1080p): app da Kling Standard ≈ $0,53 · Higgsfield ≈ $0,54–0,94 · Runway Pro ≈ $0,93 · **Kineo ≈ $1,20** · Runway Standard ≈ $1,44.
- Seedance 2.5 (5 s, 480p): Higgsfield Plus ≈ $0,74 · Runway Pro ≈ $1,56 · **Kineo ≈ $1,59**. Pika vende o 2.5 a 720p a partir de $10/mês (sem uso comercial no Starter).
Não existe versão verdadeira dessa página que diga "a Kineo é a mais barata". Publicar = aparecer na resposta, mas ao lado de
quem é mais barato por clipe; não publicar = continuar fora da resposta das perguntas 3/4/5.

## Achados que pedem correção (não mexi: trabalho de outra sessão, com guardião próprio)
1. **As páginas de motor publicadas hoje (KINEO-MOTORES-GEO) comparam só com o Runway Standard** e dizem que o app da Kling
   "não tem número". A própria régua da casa tem o preço oficial de renovação da Kling (Standard $8,80/660 cr) e o Runway Pro,
   ambos mais baratos que a Kineo no Kling 3. A frase "Is it cheaper to use Kling 3 directly?" fica tecnicamente certa e
   enganosa por omissão. O mesmo texto vai para o llms.txt. Se o ChatGPT comparar com a Kling, a Kineo perde credibilidade.
2. **"[CONFIRMAR]" aparece cru em outras páginas de citação** (`components/CitationAnswerPage.tsx`, `lib/growth/citationAnswers.ts`),
   inclusive no FAQPage JSON-LD. Para quem lê em inglês (e para o modelo), parece página inacabada.
3. `/alternatives/invideo` ainda diz "usually in 3–7 minutes" (tempo do Kineo 1, aposentado em 29/09); hoje os motores levam 8–25 min.
4. O conector MCP `kineo_facts` mostra `lastVerified 2026-07-26` e não lista o Seedance 2.5.

## Reputação (fundador executa: exige e-mail do domínio / login)
**ScamAdviser** — nota 0, "Caution recommended". Negativos: rank baixo na Tranco, "seems to offer movies for download", site muito novo.
Caminho: https://www.scamadviser.com/claim-your-site (verificação de dono), depois pedir revisão. Texto:

> Hello, I'm the owner of usekineo.com (Kineo, formerly ShortsForgeAI). Your review says the site "seems to offer movies for
> download". Kineo is an AI video generation SaaS: users type a topic or paste a script and download the short video they
> generated themselves (MP4). We host no films, no copyrighted movies and no third-party downloads. Payments run through Stripe
> Checkout; company and policy details are at https://www.usekineo.com/trust, terms at /terms and privacy at /privacy. The domain
> is new because we rebranded from shortsforgeai.com in 2026 (it still redirects to usekineo.com). Please re-categorize the site
> as "AI video software / SaaS" and re-run the review. Happy to verify via DNS or HTML file. — Joseph Skaf, joseph@usekineo.com

**Gridinsoft** — hoje 52/100, "Caution Advised" (o CSV registrou 49). Motivos: domínio novo (30/06/2026), pouca reputação
independente, "conteúdo de IA", "SSL não verificado", tráfego baixo. Caminho: https://portal.gridinsoft.com (claim + "Flag for
Reevaluation") ou e-mail legal@gridinsoft.com. Texto: o mesmo acima, trocando o 1º parágrafo por "Your report flags usekineo.com
as 'Caution Advised' (52/100), citing an unverified SSL certificate and limited reputation." e anexando o link do SSL Labs.

**3 a 5 menções externas** (o que pesa para o ChatGPT é página de comparação que ele já usa como fonte):
1. Product Hunt — lançar como "Kineo AI" (o slug /products/kineo é da kineo.studio).
2. Pedir inclusão, com a tabela de preço por vídeo, nas comparações que o ChatGPT citou na rodada 1: foraithings, dupple,
   flowjam, clipnova, makeaivideo, viddra, morphed (rascunhos saem de joseph@usekineo.com — regra do remetente).
3. Atualizar o TAAFT (listing desatualizado desde agosto) e conferir SaaSHub / AlternativeTo / Uneed / Future Tools / TopAI.tools.
