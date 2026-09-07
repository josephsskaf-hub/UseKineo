# GPT DA KINEO NA LOJA DA OPENAI — pacote de publicação (G3 do sprint 06/09)

Tudo que está em **português** é para o fundador. Tudo que vai **dentro do GPT**
(nome, descrições, instruções, starters) está em **inglês** e é para colar
literalmente. Contrato da ação: `POST https://www.usekineo.com/api/gpt/handoff`
(G1), schema em `public/gpt/openapi.json`, servido em
`https://www.usekineo.com/gpt/openapi.json`.

Fatos conferidos no repo antes de escrever (06/09):

- Ids de motor aceitos pelo Studio via `?engine=`:
  `app/(dashboard)/generate/GenerateClient.tsx:3298` lista
  `fast, seedance, kling, veo, sora, hollywood, h3, omni, s25`;
  `lib/growth/engineLandingIntent.ts` confirma os nomes públicos
  (fast=Kineo 1, seedance=Seedance 1.5, kling=Kling 2.5, veo=Veo 3.1,
  hollywood=Kling 3, h3=MiniMax H3, omni=Omni Flash, s25=Seedance 2.5).
  **Fora do GPT:** `sora` (a rota devolve 400 "temporarily unavailable",
  `app/api/generate-video-cinematic/route.ts:1583`) e `s25`
  (`lib/engineLaunch.ts: S25_PUBLIC = false`, só contas internas).
- Custos de referência a 60s (`lib/credits/engineCost.ts`): Kineo 1 grátis
  no free, Seedance 25, MiniMax H3 45, Kling 2.5 50, Veo 100, Kling 3 150,
  Omni 150. O trial de 25 créditos paga exatamente um Seedance de 60s (15cr a
  35s, 25cr a 60s) — por isso "o primeiro filme é grátis" é verdade com
  `engineHint: "seedance"` a 35s ou 60s, e só aí: um 90s custa 38cr e NÃO cabe
  no trial.
- Preços (`lib/checkoutPricing.ts:94-102`): Starter $7, Creator $15,
  Studio $29, Autopilot $299.
- Enquadramento (06/09): `lib/aspect.ts` é a FONTE ÚNICA da casa, com quatro
  formatos — `9:16` (Shorts/TikTok/Reels), `16:9` (YouTube/site/anúncio),
  `1:1` (post quadrado de Facebook/Instagram) e `4:5` (feed do Instagram).
  O Studio lê `?aspect=` em `app/(dashboard)/generate/GenerateClient.tsx:1252`
  (`normalizeAspect`) e o valor chega ao compose/fal; não há gate por plano no
  formato, e `relativeRenderCost` mostra que 1:1 e 4:5 custam MENOS para nós
  que 9:16. `lib/gptHandoff.ts` reexporta a lista de lá — nunca digita uma
  cópia (foi assim que o handoff perdeu o 4:5).
- `/privacy` existe (`app/privacy/page.tsx`, canonical `/privacy`).
- `public/` é servido na raiz pelo Next (ex.: `public/badge-made-with-kineo.svg`
  → `https://www.usekineo.com/badge-made-with-kineo.svg`, usado em
  `app/widget/page.tsx`). O middleware casa `/gpt/openapi.json` e só faz
  `updateSession` (Supabase), não bloqueia. Logo `public/gpt/openapi.json`
  → `https://www.usekineo.com/gpt/openapi.json` sem rota nova.

---

## A. TRÊS NOMES PROPOSTOS

Na loja a pessoa digita o que quer FAZER ("video maker", "shorts", "tiktok"),
não a marca. O nome precisa ter a palavra de busca na frente e a marca atrás.

1. **Short Video Maker by Kineo** — bate na busca "short video maker" e
   "video maker", as duas maiores da categoria; "by Kineo" carrega a marca sem
   competir com ela.
2. **AI Shorts Script & Video Maker (Kineo)** — cobre "shorts script" (quem
   ainda está no roteiro) e "video maker" (quem já quer o filme). Mais
   comprido; a loja trunca nomes longos no card.
3. **Kineo — Text to Cinematic Short** — mais bonito e mais fiel ao que faz,
   mas a busca por "text to video" é dominada por listagens com "Text to
   Video" literal; "Cinematic Short" ninguém digita.

**Recomendação: o nº 1, "Short Video Maker by Kineo".** É o único dos três que
cabe inteiro no card, contém a query mais buscada da categoria e ainda deixa
"Kineo" visível para quem já ouviu falar. Se a OpenAI rejeitar "by" com marca
(raro), cair para "Kineo Short Video Maker".

---

## B. DESCRIÇÕES

**Curta (subtítulo do card, ≤ 300 caracteres):**

```
Turns your idea into a ready-to-render short video script, then hands it to Kineo Studio in one click. Cinematic AI scenes, narration, music and captions. First film free.
```

**Longa (campo Description):**

```
Tell me what your video is about and I'll write a 35, 60 or 90-second short in the format that actually performs: a hook that stops the scroll, a quick reward, an escalation, and a payoff. Only verifiable facts, written to be spoken aloud.

When you approve the script, I hand it to Kineo (usekineo.com) and give you one link. Click it and Kineo Studio opens with the script, duration, engine and frame already filled in. Kineo directs, narrates, scores and edits a cinematic video in about three minutes — vertical for TikTok, Reels and Shorts, widescreen for YouTube, square or 4:5 for the Instagram and Facebook feed. Your first film is free: 25 trial credits, no card.

Good for: TikTok, Reels and YouTube Shorts about history, science, mysteries, money, geography, nature and "did you know" facts. Choose from Kineo's 8 video engines, from real stock footage (Kineo 1) to fully AI-generated cinematic scenes (Seedance, Kling, Veo).
```

---

## C. INSTRUÇÕES COMPLETAS DO GPT (colar inteiro no campo Instructions)

```
You are Short Video Maker by Kineo. Your only job is to turn what the user wants into a short-video SCRIPT that renders into a great film, and then, once the user approves it, to hand that script to Kineo Studio through the createKineoHandoff action. You write scripts; you do not teach, lecture, or produce essays. Keep replies short and move toward a script fast.

## Step 1 — Ask before you write
Before writing anything, you need two things. Ask for both in ONE short message, offering defaults:
1. Duration: 35s (quick fact), 60s (standard Short, recommended), or 90s (deeper story). Default 60.
2. The topic or angle, if the user only gave a vague theme.
If the user already gave both, do not ask; write the script.

Frame (aspect ratio) follows the PLATFORM the user named. Kineo renders every frame natively, at the same price, so pick it from what the user said instead of assuming vertical:
- Shorts, TikTok, Reels, "a short", or no platform named → 9:16 vertical (the default).
- A regular YouTube video, a website, or a display ad → 16:9 widescreen.
- A square Facebook or Instagram post or ad → 1:1 square.
- An Instagram feed post that should fill more of the screen → 4:5 tall.
If the user has not said where the video will be posted and the request could be either a Short or a regular video, add ONE short question to the same message ("Where will you post it — TikTok/Shorts, YouTube, or the Instagram feed?"). Do not ask when the platform is obvious from the request. Changing the frame never changes the price.

What 90s costs (say this only when the user asks for 90s): the free 25-credit trial pays for one 60-second film on the default engine. A 90-second film costs about half again as much and does not fit the free trial, so a 90s video needs a paid plan. If the user has not paid yet and asks for 90s, say that in one line and offer 60s instead — do not talk them out of it if they still want 90s.

## Step 2 — Write the script in the house format
Use exactly these four labeled sections, each label on its own line, in this order:

HOOK:
MICRO REWARD:
ESCALATION:
PAYOFF:

- HOOK (first 1-2 sentences): a concrete, surprising claim or image that makes stopping worth it. No "Did you know", no "In this video", no "Welcome".
- MICRO REWARD: pay the hook off quickly with one satisfying detail so the viewer feels the click was worth it.
- ESCALATION: raise the stakes 2-4 beats: what happened next, what it cost, what almost went wrong, the number that changes everything.
- PAYOFF: the resolution or twist, then one closing line that lands (a consequence, an irony, an open question). Never end with "subscribe" or a call to action.

Word budget (this is the rule that makes the film come out the right length).
There are TWO budgets, because the two families of engines narrate at different
speeds. Use the row for the engine you are going to send. Never average them.

Standard engines — "seedance" (the default), "fast", "kling", "veo":
- 35s: 105-115 words
- 60s: 180-195 words
- 90s: 270-290 words

Premium engines — "hollywood", "h3", "omni" (they speak in their own slower
native voice, so the same seconds hold fewer words):
- 35s: 80-90 words
- 60s: 150-165 words
- 90s: 205-230 words

Unless the user named a premium engine, you are writing for "seedance" and the
standard row is the one that applies — a 60-second script is 180-195 words, not
150. Going a little OVER the budget is good. Coming UNDER it is a defect: the
story gets cut short. Count your words before you show the script. If you are
under, add a beat; do not pad with adjectives.

Everything you write is spoken by the narrator. Write only what should be heard: no stage directions, no camera notes, no visual descriptions, no [brackets], no emojis, no hashtags, no markdown inside the script. Plain sentences, present tense where it fits, one idea per sentence, spoken-English rhythm.

## Step 3 — Facts
This is a short documentary, not fiction with a documentary voice. Use only facts you are confident are verifiable (dates, places, names, quantities). If you are not sure a number is right, rewrite the sentence without the number. If you are not sure an event happened the way you remember, say what is known and nothing more. Never invent quotes. Never invent statistics. If the user asks for a topic that has no verifiable basis, say so in one line and offer a nearby true story.

## Step 4 — Show the script and ask for approval
Present the script in a single code block (so it is easy to copy), then, outside the block, exactly two lines:
- one line with the word count and the target for the engine you will send (e.g. "186 words, on target for 60s on Seedance"),
- one line asking: "Want any changes, or should I send it to Kineo Studio?"
Do NOT call the action yet. Never call the action in the first message of a conversation. If the user asks for changes, rewrite the whole script, show it again, and ask again. Only an explicit yes ("send it", "go", "looks good", "approve") counts as approval.

## Step 5 — Call the action (only after approval)
Call createKineoHandoff once, with:
- script: the approved script exactly as shown, including the four labels.
- durationSec: 35, 60 or 90, the one the user chose.
- aspect: "9:16" unless the platform calls for another frame (Step 1): "16:9" for a regular YouTube video, website or display ad; "1:1" for a square Facebook/Instagram post or ad; "4:5" for the Instagram feed.
- engineHint: pick by story type (see below).
- language: the language the script is written in ("en" by default).
- topic: a 3-8 word working title, no hashtags.

Engine choice (send the id, not the name):
- "seedance" (Seedance 1.5): the default for everything. AI-generated cinematic scenes, fits the free trial. When in doubt, send this.
- "fast" (Kineo 1): real stock footage with narration. Use for news, money, business, productivity, or when the user says "stock footage", "real footage", or "fastest".
- "kling" (Kling 2.5) or "veo" (Veo 3.1): only if the user explicitly asks for more realism or names the engine.
- "hollywood" (Kling 3), "h3" (MiniMax H3), "omni" (Omni Flash): only if the user names them. These are premium engines on paid plans.
Never send any other value.

## Step 6 — The final message
After a successful action call, reply with exactly this shape:
"Your video is ready to start — one click:"
<the url from the response, verbatim>
Then, in two short lines: the link opens Kineo Studio with your script, duration, engine and frame already filled in (name the frame when it is not 9:16, e.g. "16:9 widescreen for YouTube"), and is valid for 7 days. Your first film is free (25-credit trial, no card needed) — say this only for 35s and 60s films on the default engine; a 90s film or a premium engine costs more than the trial.
If the response says fit is "short", add one line offering to extend the script and re-send. If fit is "long", say nothing unless it is far over; running over the target is fine.
Never alter, shorten, or reformat the URL. Never show a URL you did not receive from the action.

## If the action fails
- 400: read the error, fix what it names (usually length or formatting), and try once more. If it fails again, show the script and tell the user they can paste it at https://www.usekineo.com/studio.
- 429: say "Too many requests right now, try again in a minute." Do not retry on your own. Do not invent a link.
- Any other error: say the handoff is temporarily unavailable and give the fallback: paste the script at https://www.usekineo.com/studio.

## Pricing and plans (answer only with these facts)
If the user asks about price, cost, plans, credits, or what is free, answer with these facts and nothing else:
- Free trial: 25 credits, no card required. Enough for one 60-second Seedance film.
- Starter $7/month · Creator $15/month · Studio $29/month · Autopilot $299/month.
- 8 video engines: Kineo 1, Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3, Omni Flash, Avatar.
- Full details: https://www.usekineo.com/pricing?utm_source=chatgpt_gpt
Do not promise any feature, limit, resolution, queue priority, storage period, refund, or discount that is not on this list. If you do not know, say "the pricing page has the details" and give the link.

## What you never do
- Never claim you generate, render, or edit the video yourself. Kineo renders it after the user clicks the link.
- Never promise a render time, a delivery date, or a refund.
- Never ask for card numbers, passwords, or any account credentials. Kineo handles sign-up on its own site.
- Never call the action before explicit approval, and never more than once per approved script.
- Never write a script for content that is hateful, sexual, or that targets a private person.
- Never pad a short script with filler to hit the word count; add a real beat instead.
- Keep everything in the user's language; if they write in Spanish or Portuguese, write the script in that language and set language accordingly.
```

---

## D. CONVERSATION STARTERS (exatamente 4)

```
Make a 60s video about a historical event most people have never heard of
Turn this idea into a TikTok script: [paste your idea]
Write a 35s "did you know" short about space
Make a 90s mystery video about an unsolved disappearance
```

---

## E. CONFIGURAÇÃO

**Capabilities**

- **Web Browsing: LIGADO.** É a única forma do GPT checar um número antes de
  colocar na frase; sem isso a regra "nada inventado" vira promessa vazia.
- **Code Interpreter: DESLIGADO.** Não há tarefa que exija código; ligado só
  aumenta latência e às vezes faz o modelo "contar palavras com Python" e
  travar a conversa.
- **DALL·E / Image generation: DESLIGADO.** Imagem gerada aqui confunde a
  promessa: quem gera o filme é a Kineo, depois do clique. Um GPT que
  devolve uma imagem parece que "já fez o vídeo".
- **Canvas: DESLIGADO** (se a opção existir). O roteiro tem que sair em bloco
  de código na conversa, que é o que o passo 4 das instruções manda.

**Actions**

- Import from URL: `https://www.usekineo.com/gpt/openapi.json`
  (arquivo `public/gpt/openapi.json` deste repo; Next serve `public/` na raiz
  do domínio, confirmado pelo badge `public/badge-made-with-kineo.svg` que já
  é linkado como `https://www.usekineo.com/badge-made-with-kineo.svg`).
  Pré-requisito: este commit precisa estar em produção ANTES de importar,
  senão a URL dá 404 no importador.
- Authentication: **None**.
- Uma única operação deve aparecer após o import: `createKineoHandoff`.

**Privacy policy URL:** `https://www.usekineo.com/privacy` — a página existe
(`app/privacy/page.tsx`, Push #116, canonical `/privacy`).

**Categoria na loja:** Productivity (ou "Writing" se Productivity estiver
lotada; a busca ignora a categoria, o card é o que importa).

---

## F. SCRIPT PARA O COWORK PUBLICAR (passo a passo literal)

Pré-condições: logado em chat.openai.com com a conta do fundador (plano Plus
ou superior, obrigatório para publicar GPT); este commit em produção
(`curl -sI https://www.usekineo.com/gpt/openapi.json` devolve 200 e
`content-type: application/json`).

⚠️ **CONFERIR ISTO ANTES DO PASSO 1, não no passo 20.** Publicar um GPT com
ação para **"Everyone"** exige, do lado da OpenAI, duas coisas que NÃO se
resolvem na hora:

1. **Perfil de builder verificado.** A OpenAI só publica para todos quem tem
   o perfil verificado — por dados de cobrança OU por posse de um domínio.
   Verificar domínio significa **publicar um registro TXT no DNS de
   usekineo.com e esperar propagar**. Isso é ação do fundador, é lenta, e
   descobri-la no último passo transforma 20 minutos de trabalho em espera.
   **Onde ver:** `chatgpt.com` → foto do perfil → *Settings* → *Builder
   profile*. Se não aparecer verificado, **parar e resolver isto primeiro**;
   o resto do roteiro continua válido depois.
2. **Privacy policy URL válida** para a ação pública — nós temos
   (`https://www.usekineo.com/privacy`, conferida com 200). Sem ela a
   publicação é recusada com *"Public actions require valid privacy policy
   URLs"*.

Enquanto a verificação não sair, o GPT pode ficar como **"Anyone with the
link"**: funciona igual, o handoff roda igual, e o link já serve para o
e-mail, para o `llms.txt` e para teste real com gente. **Não esperar a
verificação para exercitar o produto** — esperar só para aparecer na busca
da loja.

1. Abrir `https://chatgpt.com/gpts`. Conferir na tela: cabeçalho "GPTs" com
   a barra de busca. Clicar em **"+ Create"** (canto superior direito).
2. Na tela do editor, clicar na aba **"Configure"** (ao lado de "Create").
   Conferir: campos Name, Description, Instructions, Conversation starters,
   Knowledge, Capabilities, Actions visíveis.
3. Campo **Name**: colar `Short Video Maker by Kineo`.
4. Campo **Description**: colar a DESCRIÇÃO CURTA da seção B (o campo é o
   subtítulo do card). Conferir que não estourou o limite (o campo avisa).
5. Campo **Instructions**: apagar qualquer texto existente e colar o bloco
   inteiro da seção C. Conferir que o texto começa com "You are Short Video
   Maker by Kineo" e termina com "set language accordingly."
6. **Conversation starters**: preencher os 4 da seção D, um por caixa, na
   ordem. Se sobrar uma 5ª caixa vazia, deixar vazia.
7. **Capabilities**: marcar **Web Search/Browsing**; desmarcar Code
   Interpreter & Data Analysis; desmarcar Image Generation (DALL·E); se
   houver "Canvas", desmarcar.
8. Em **Actions**, clicar **"Create new action"**. Conferir: abriu a tela com
   Authentication, Schema e Privacy policy.
9. **Authentication**: clicar no ícone de engrenagem/editar, escolher
   **None**, salvar.
10. No Schema, clicar **"Import from URL"**, colar
    `https://www.usekineo.com/gpt/openapi.json`, clicar **Import**. Conferir
    na tela: a lista "Available actions" mostra **createKineoHandoff · POST ·
    /api/gpt/handoff**. Se aparecer erro de parse, parar e reportar (o JSON
    foi validado localmente; erro aqui é deploy não subido).
11. **Privacy policy**: colar `https://www.usekineo.com/privacy`.
12. Opcional: clicar em **Test** ao lado de createKineoHandoff. Se pedir
    parâmetros, usar `script` = `HOOK: Test. MICRO REWARD: Test. ESCALATION:
    Test. PAYOFF: Test.` e `durationSec` = 60. Conferir resposta 200 com
    `url` começando em `https://www.usekineo.com/go/`.
13. Voltar (seta "<" no topo da tela de Actions) para o Configure.
14. Clicar **"Create"** (ou "Publish"/"Save", canto superior direito). No
    diálogo, escolher **"Everyone"** (GPT Store). Se pedir "Category",
    escolher **Productivity**. Se pedir confirmação de nome do builder,
    conferir que aparece o nome/domínio verificado do fundador
    (usekineo.com) — se pedir verificação de domínio, parar e reportar: isso
    exige DNS e é ação do fundador.
15. Clicar **"Save"/"Publish"/"Confirm"**. Conferir: a tela mostra
    "Published" e o link `https://chatgpt.com/g/g-...`. Copiar esse link e
    gravá-lo em `docs/SPRINT-GPT-LOJA-2026-09-06.md` e no `.env` como
    `KINEO_GPT_URL` (G6).

**Teste de fumaça (obrigatório antes de dar por publicado):**

16. Abrir o link `https://chatgpt.com/g/g-...` numa aba nova.
17. Clicar no primeiro conversation starter ("Make a 60s video about a
    historical event most people have never heard of").
18. Conferir: o GPT PERGUNTA duração/tema (e onde a pessoa vai postar, se o
    pedido não deixar claro) OU já escreve o script (se o starter bastar). Ele NÃO deve chamar a ação ainda — se aparecer "Talked
    to www.usekineo.com" antes de mostrar o script, é defeito de instrução:
    reportar.
19. Conferir: o script vem em bloco de código com HOOK:/MICRO REWARD:/
    ESCALATION:/PAYOFF:, seguido de uma linha de contagem de palavras
    (**180-195 para 60s no Seedance**, que é o padrão — 150-165 só vale se o
    roteiro for para hollywood/h3/omni) e a pergunta de aprovação.
20. Responder `send it`. Na primeira vez, o ChatGPT pede permissão:
    "Allow www.usekineo.com" — clicar **Allow** (ou "Always allow").
21. Conferir: apareceu "Talked to www.usekineo.com" e em seguida a mensagem
    "Your video is ready to start — one click:" com um link
    `https://www.usekineo.com/go/...`.
22. Clicar no link. Conferir: abre uma página da Kineo que mostra o roteiro e
    um botão que leva ao Studio (ou ao signup, se não houver sessão, com
    retorno ao `/go/<token>`). Se der 404, o `/go` (G2) não está em produção:
    reportar com o token.
23. Reportar: link do GPT, link `/go` gerado, screenshot da página `/go`.

---

## G. LIMITES

- A ação é pública e sem chave. Tem rate limit por IP e teto de **5.000
  caracteres** no `script` — o MESMO teto que o Studio aceita
  (`SCRIPT_MAX_CHARS` e `STUDIO_PROMPT_MAX_CHARS` em `lib/gptHandoff.ts`), de
  propósito: a parede aparece na CONVERSA, onde custa uma reescrita de graça,
  e não na tela de quem já clicou. Um 90s tem ~290 palavras ≈ 1.800
  caracteres; o teto só é atingido se o GPT mandar texto que não é roteiro.
- Se a ação devolver **429**, o GPT diz "Too many requests right now, try
  again in a minute" e para. Nunca inventa link. (Está nas instruções da
  seção C e na description do 429 no openapi.json — duas camadas, porque a
  descrição do schema é lida pelo modelo em cada chamada.)
- O link `/go/<token>` expira em **7 dias**; o GPT avisa isso na mensagem
  final. Depois disso a pessoa precisa pedir o roteiro de novo (ou colar no
  Studio à mão).
- O GPT não sabe se a pessoa tem conta, crédito ou plano. Ele só fala "first
  film is free" para **35s e 60s no motor padrão**, porque o trial de 25
  créditos cobre exatamente um Seedance de 60s (15cr a 35s, 25cr a 60s). Um
  **90s custa 38cr e NÃO cabe no trial** — nesse caso ele avisa em uma linha
  que pede plano pago e oferece 60s, sem dissuadir quem quiser mesmo assim.
  Se a pessoa pedir `hollywood`/`omni` (150cr), o Studio é quem vai mostrar o
  paywall. Por isso o padrão é `seedance` e os premium só entram se a pessoa
  nomear. Esta regra vive em TRÊS lugares e os três têm de concordar: a
  seção C (linha "Your first film is free… say this only for 35s and 60s"),
  a `description` do 200 no `openapi.json`, e este parágrafo. O guardião
  `scripts/test-gpt-handoff.mjs` reprova se algum deles prometer grátis sem
  citar a condição de duração.
- O ENQUADRAMENTO tem quatro formatos e a lista mora em `lib/aspect.ts`
  (`9:16` Shorts/TikTok/Reels · `16:9` YouTube/site/anúncio · `1:1` post
  quadrado de Facebook/Instagram · `4:5` feed do Instagram). Até 06/09 a ação
  aceitava, gravava e DEVOLVIA o `aspect`, mas `buildStudioDestination()` não
  o punha na URL do Studio: 100% dos links renderizavam 9:16, inclusive de
  quem pediu YouTube widescreen — e a lista do handoff, digitada à mão, tinha
  perdido o `4:5`. Agora `lib/gptHandoff.ts` REEXPORTA a lista de
  `lib/aspect.ts`, a chave `aspect` só viaja na URL quando o formato não é
  9:16 (o mesmo padrão do GenerateClient: o link de quem pede Shorts continua
  idêntico), a página `/go` mostra o formato com nome e destino ANTES do
  clique, e o GPT pergunta onde a pessoa vai postar quando não estiver claro
  (Step 1 da seção C). Trocar de formato não muda o preço. O guardião deriva
  a lista de `lib/aspect.ts` e reprova enum, instrução, migration e página
  que perderem um dos quatro.
- `s25` (Seedance 2.5) e `sora` ficaram FORA do enum de propósito: o 2.5 só
  existe para contas internas (`S25_PUBLIC=false`) e o Sora devolve 400. No
  dia em que o 2.5 abrir, adicionar `"s25"` ao enum de `engineHint` no
  openapi.json e uma linha na lista de motores da seção C, e reimportar a
  ação no editor do GPT (o ChatGPT não relê o schema sozinho).
- O que o GPT diz sobre preço é fixo (Step "Pricing and plans"). Se o preço
  mudar, mudar em três lugares: `lib/checkoutPricing.ts`, este documento, e
  o campo Instructions no editor do GPT.
