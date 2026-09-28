# AVATAR FORA DO CATÁLOGO — 28/09/2026

Pedido do fundador (27/09): **"avatar sai por hora"**.

## O caso (medido no banco antes da mudança)

- Em toda a história: **1 filme `avatar` e 3 `presenter`** entregues. O último foi em **15/07**.
- Últimos 30 dias: 3 `avatar_dispatch_received`, e os 3 eram ensaios de $0 (`dry_run`).
- `studio_avatar_card_clicked`: **0**.
- Mesmo assim o Avatar era vendido em 14 superfícies públicas. A contagem dizia "Seven" motores, com o Avatar na lista.
- A clonagem de voz mora no `/avatar`: **5 perfis têm voz clonada e 1 deles paga**. Por isso a página continua no ar.

## A mudança: um interruptor

`lib/engineLaunch.ts` → **`AVATAR_PUBLIC = false`** + `avatarVisible(email)`. O desenho é o mesmo do `S25_PUBLIC`: o Avatar sai do catálogo público, mas as contas da casa (`isInternalEmail`) continuam vendo o card do /studio.

Não é "pausa" (`enginePaused`). A pausa escreve "manutenção" na tela e no llms.txt, e esse motivo seria falso.

### Commit 1 — superfícies de produto (todas lêem o interruptor)

| Superfície | Antes | Agora |
|---|---|---|
| Contagem/lista (FAQ da home, schema FAQ/Organization, /ph) | "Seven … Kineo 1 and Avatar" | "Six … Seedance 1.5 and Kineo 1" (derivado do interruptor) |
| kineoFacts → /llms.txt, /api/facts, /facts | linha Avatar 110 cr; Studio "…MiniMax H3 and Avatar"; Creator "Character Lock, transparent gesture clips and UGC product ads"; "Kineo has an Avatar engine" | sem Avatar; "Kineo does not currently offer an avatar or presenter engine" |
| llms.txt (ramo dormente do trial) | "…Kling 3 and Avatar are Studio-plan engines" | "…Veo 3.1 and Kling 3 are Studio-plan engines" |
| Pricing | resultado do Studio ", Avatar"; linha "AI Presenter videos" (70 cr); linha da tabela "AI Presenter — talking avatar"; FAQ do Autopilot "AI Presenter"; "✓ Character Lock" | fora (tudo atrás de `AVATAR_PUBLIC`) |
| Home | mega-menu "Talking Avatar", menu mobile "Avatar", tile do bento, 4 cards do toolkit (AI Presenter, Character Lock, Transparent Clips, UGC Product Ads) e o subtítulo que os vendia | fora para o público; o toolkit fica com 4 cards (Animate, Thumbnails, Viral Now, Free AI Shorts) |
| Studio | link "AI Presenter ↗" + card Avatar no seletor | só com a flag `avatar` do `/api/me/credits` (= `avatarVisible`) |
| Painel | banner "NEW — AI Avatar Video" | fora (o componente fica) |
| /ph | Studio "…Omni Flash, Avatar" | sem Avatar |
| Rodapé e sitemap | link e entrada `/ai-avatar` (prioridade 0.8) | fora |
| /ai-avatar | indexável | `robots: noindex, follow` (canonical mantido) |
| /studio/create | 3 ofertas do Creator com "AI Presenter"; "Record one in AI Presenter →" | sem "AI Presenter"; o link continua indo ao /avatar e agora diz "Record one in Avatar Studio →" |

`/api/me/credits` ganhou a flag `avatar` separada da `internal`. A `internal` é `s25Visible`: no dia em que o S25 abrir ela vira true para todo mundo, e não pode trazer o Avatar de volta junto.

### Commit 2 — copy de SEO/comparação (texto reescrito, não interruptor)

- `lib/comparisons.ts`: `KINEO_ENGINE_METERING` (usada em 8 páginas) e a linha de créditos pública da Kineo perderam o "AI Presenter 70". As duas respostas "Does Kineo have avatars?" (HeyGen e Synthesia) agora dizem "Not today". A mesma página do HeyGen já dizia "you cannot get a talking avatar out of Kineo at any price", então a casa se contradizia.
- `app/alternatives/[competitor]/page.tsx`: HeyGen, Synthesys e D-ID eram páginas inteiras vendendo o AI Presenter, com Character Lock e clipes de gesto. Foram reescritas em torno do filme narrado sem rosto. A linha "presenter" da tabela virou ✗ ou "Not offered today", e cada página diz que a Kineo não tem apresentador hoje e manda quem precisa de rosto na tela para o concorrente. A Synthesia também foi corrigida: dizia "optional 720p lip-synced presenter" e respondia "Yes" sobre apresentador. A clonagem de voz ficou, porque existe e o /studio/create a usa.

### Revisão 2 (28/09, FIX-REVISAO-2) — as sobras que a integração achou

- `/best-ai-shorts-generators` (sitemap e llms.txt) ainda dizia que a Kineo pode "add a talking AI Presenter" — a única superfície pública sem trava que vendia o apresentador. A frase agora deriva do `AVATAR_PUBLIC`: sem ele, "It does not offer an AI presenter or avatar today" e manda quem precisa de rosto para o HeyGen.
- A página do Kling 3 (`lib/growth/enginePageCatalog.ts`, lida por /ai-video-generator/kling-3, /facts e o hub) respondia "Yes. Character Lock saves a presenter…". Atrás do interruptor; sem ele, diz o que o motor faz (um retrato-âncora por filme, toda cena de diálogo parte dele) e que rosto salvo entre vídeos não está no catálogo hoje.
- O bento da home: 5 motores num grid de 3 colunas (2 até 700px) deixavam uma célula vazia. O último tile agora ocupa o que falta da fileira para qualquer contagem (`lib/ui/homePresentation.ts`: 3 colunas → sobra 1 = span 3, sobra 2 = span 2; 2 colunas → último ímpar = span 2; 1 coluna → sem span). Prova no guardião, bloco (g): JSX real + cascata real do `<style>` da página + auto-placement, 0 célula vazia de 1440px a 320px para 5 (visitante), 6 (casa) e 1 a 9 tiles; o mutante sem o CSS devolve o buraco nas duas larguras.
- Varredura de `app/`, `components/` e das libs que alimentam página pública: o resto que ainda cita Avatar/Presenter é o próprio /avatar e /ai-avatar (link direto), superfícies atrás de `showAvatar`/`avatarOn`/`AVATAR_PUBLIC`, rotas de admin, dicionários de tradução, a prévia `/examples/design` (só em preview) e o `EngineCycleCard` (sem nenhum importador).

## O que NÃO mudou

- O `/avatar` (Avatar Studio: clonagem de voz, personagens, gesto, anúncio UGC) e o `/api/generate-avatar` continuam no ar por link direto. O servidor não ganhou gate, e isso é de propósito: quem chega pelo link de clonar voz do /studio/create ou por um e-mail antigo não pode dar com um botão que falha.
- Preço e cobrança ficaram iguais: `engineCost` `avatar` 110 / `presenter` 70.
- `lib/engineWall`, `lib/enginePlanGate`, `EngineCycleCard` e os 16 dicionários da interface não foram tocados. Nenhum texto novo entrou na home, então nenhuma tradução ficou faltando.
- A linha "🎭 Saved characters" da tabela de preços ficou. É a cota que o servidor aplica, e o Character Lock também funciona no Kling 3 pelo /studio/create e pelos thumbnails.

## Para voltar

1. `AVATAR_PUBLIC = true` em `lib/engineLaunch.ts`. Isso sozinho traz de volta tudo do commit 1: contagem "Seven", lista, kineoFacts/llms.txt, pricing, home, Studio, banner, /ph, rodapé, sitemap e o index do /ai-avatar.
2. À mão: as 3 ofertas do Creator no GenerateClient e a copy do commit 2 (comparisons + alternatives). Esse texto foi reescrito, não posto atrás do interruptor.

## Guardiões

- Novo: `scripts/test-avatar-fora-2026-09-28.mjs`, com 39 verificações. Ele executa engineLaunch, kineoFacts, a rota do llms.txt, o `/api/me/credits`, o metadata do /ai-avatar e o biller. Também renderiza a home, o Studio, o pricing e o rodapé com o JSX real. Tem mutantes em memória em cada bloco.
- Re-ancorados, cada um com um comentário da intenção nova: `test-motores-pausados-2026-09-15` ("Six" e resultado do Studio sem Avatar), `test-app-blue-layout` (/avatar ausente para o público e presente para a casa), `test-avatar-card` (card atrás de `avatarOn`), `test-interface-language` e `test-rodape-segmentos-2026-09-27` (o /ai-avatar pode faltar no rodapé só enquanto `AVATAR_PUBLIC=false`) e, no commit 2, `test-synthesia-ai-answer` (a frase sobre o presenter agora exige "does not offer a presenter today"). O guardião novo ganhou no commit 2 o bloco (f), com 6 verificações sobre comparisons (executado) e as 4 fichas de alternativas, e passou de 39 para 45 verificações.

## Riscos

- Os motores de resposta que já guardaram o texto antigo podem citar o Avatar por um tempo.
- O `/ai-avatar` sai do índice do Google. Volta com o interruptor.
- O bento da home ficou com 5 tiles. Desde a revisão 2 o último tile ocupa o resto da fileira (sem célula vazia); com 5 motores a 2ª fileira é Veo 3.1 + Kling 3 largo.
- Ficaram de fora, porque já existiam antes: a linha do Studio no /ph e as páginas "seven engines" (/arena, /kineo-vs-higgsfield, /tiktok-creator-rewards-videos) ainda contam o Omni Flash, que está pausado.
