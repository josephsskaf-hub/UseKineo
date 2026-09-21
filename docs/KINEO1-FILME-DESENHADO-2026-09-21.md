# KINEO 1 — FILME DESENHADO (21/09/2026)

Fundador (21/09, olhando o caso jonathanschwapp@gmail.com no painel, nota 65): "vê tudo que a gente pode tirar de
bom… arrumar para os próximos vídeos ficarem melhor. E se você puder, reconstrói um vídeo com o mesmo pedido que
essa pessoa fez e manda para ele no e-mail dele. O vídeo tem que estar bem melhor com o que ele pediu."

## O caso, lido no rastro (events, 21/09 16:51–16:56 UTC)
- Cadastro 16:51:09 → `/studio/create` com o pedido vindo do ChatGPT (`chatgpt_welcome_banner_shown`) →
  `activation_autostart_eligible` → `activation_autostart_dispatched` com motor **fast** às 16:51:27.
  **A pessoa nunca viu tela de escolha**: nem motor, nem idioma, nem o aviso "Kineo 1 não desenha" (que só existe no
  /studio). Auto-start = 40% dos primeiros filmes (CLAUDE.md) e este é o caminho onde tudo falhou.
- Primeira tentativa 16:51:15: o escritor recusou (`srv_generate_script_refused` — o conserto 4 funcionou, nada cobrado).
  A retentativa passou.
- `narration_language_autodetected` → **espanhol** (0,77) para um pedido em **francês**: o detector só sabia en/pt/es e
  "un / son / en / la" caíram no espanhol.
- O pedido dizia "animation 3D colorée et joyeuse": o regex de look era inglês e exigia "3D animation" → look photoreal.
- Os 3 clipes Seedance do primeiro filme eram a casa de papelão e o carteiro (a parte boa); o banco de filmagem real pôs
  criança na neve, lago, raio-X e vinil, buscando "joyful animation", "friendly mailman", "vintage animation desk".
- Filme de 35 s para um pedido de 60 s (cota do trial); baixado às 16:56:36. Sem resposta dele depois.

## O que foi feito hoje

### 1. Filme reconstruído e entregue (rascunho no Gmail, em francês)
Seedance 1.5 · 60 s · narração **fr** · prompt = "3D animated cartoon, Pixar style, colorful and joyful, for children
aged 3 to 7. " + o texto dele, verbatim. Dry-run antes (PASS: 7 cenas, todas "stylized 3D animated film look",
character_story, 170 palavras/64 s). Render real: 25 cr da conta do fundador, **63 s**, `bebcf679`, título
"La Maison en Carton Magique!". Folha de contato conferida: casa de papelão, escadas de papel, pirouette, carteiro de
mochila caindo no coussin, ruban doré no nariz, dança com confetes — tudo no pedido, em 3D colorido. Rascunho para
jonathanschwapp@gmail.com com o link do MP4 e oferta de créditos para o 2º episódio (fundador envia).

### 2. Consertos para os próximos filmes (worktree fr-0921 → fila)
- **`lib/textLanguage.ts`** — detector passa a conhecer **fr · de · it** (FR 14, DE 20, IT 6 cadastros/30 d). As marcas
  exclusivas agora são calculadas por SUBTRAÇÃO das listas das outras línguas: "le", "un", "son", "la", "del", "um" nunca
  mais decidem sozinhas. O pedido real do Jonathan → `fr`; os textos dos guardiões de 12-13/09 seguem es/pt/en.
- **`lib/cinematic/sceneStyle.ts`** — `DRAWN_LOOK_PATTERNS` (16 línguas) vira a **fonte única** de "pedido de desenho":
  o look do Seedance/Veo/Kling 2.5 (`LOOK_RE` animated3d), o aviso do Studio (`lib/growth/kineo1FitNotice`, que perdeu a
  lista própria) e o modo desenhado do Kineo 1 leem a mesma lista. "animation 3D", "dessin animé", "Zeichentrick",
  "cartone animato", कार्टून, كرتون… Fronteira com `\p{L}` (o `\b` não enxerga "é" — "dessin animé" não casava).
- **`app/api/generate-video-fast/route.ts` + `lib/fastAiScene` + `lib/fastAiClips` + `lib/fastAiHook`** — **modo
  desenhado do Kineo 1**: pedido de desenho ⇒ TODA cena nasce de still no look pedido (até 8), os clipes Seedance
  entram sempre (até 3, trial também) no mesmo look, o gancho idem, e o banco de filmagem real NÃO entra na cena que
  já tem visual gerado (se o still falhar, o stock ainda entra — cena vazia é pior). Os prompts de still/clipe/hook
  deixam de ser "photorealistic" fixos e não transformam o personagem em silhueta (regra de pessoa REAL). Evento
  `fast_ai_still` ganha `drawn_look`. Custo ≈ 7 × 0,026 + 3 × 0,13 = **US$ 0,57** por filme desenhado.
  Isto cobre o auto-start: o servidor decide, sem depender de tela.
- **`lib/pixabay.ts`** — humor e estilo entram nos genéricos ("joyful", "friendly", "vintage", "animation", "cartoon",
  "golden", "magic", "cute"…): nunca são o sujeito da busca.
- **Aviso do Studio** — copy honesta nova: "Kineo 1 uses real footage — for a cartoon it switches to drawn stills";
  Seedance continua sendo o caminho para toda cena animada. `kineo1_fit_notice_v2`.

Guardião novo: `scripts/test-kineo1-filme-desenhado-2026-09-21.mjs` (33 verificações executadas sobre as funções puras
com o texto REAL do Jonathan + 3 mutantes: linha fr do regex, fr/de/it do detector, `continue` do desenho). Reancorados:
test-kineo1-aviso-desenho (loader resolve o import da fonte única), test-idiomas-15 (rótulo), test-historia-com-
personagens, test-primeiro-filme-video, test-kineo1-diagnostico-consertos (o sufixo fotorreal virou ramo de ternário).

## O que NÃO foi feito (decisão do fundador)
- Trial de 10 cr não cabe um Seedance (25 cr): o auto-start continua no Kineo 1 — agora desenhando. Se o fundador
  quiser que pedido de desenho no auto-start vá direto para o Seedance, é decisão de custo (US$ 0,13 × 7 cenas +
  render) e de trial.
- Personagem consistente entre cenas no Seedance (o "petit personnage" virou bebê → hamster → carteiro no filme
  reconstruído): é dívida do contrato de personagem do caminho clássico, não deste caso.
