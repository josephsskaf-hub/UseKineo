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

### Commit 2 — copy de SEO/comparação

Vem no commit seguinte deste branch (lib/comparisons.ts e app/alternatives/[competitor]/page.tsx).

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
- Re-ancorados, cada um com um comentário da intenção nova: `test-motores-pausados-2026-09-15` ("Six" e resultado do Studio sem Avatar), `test-app-blue-layout` (/avatar ausente para o público e presente para a casa), `test-avatar-card` (card atrás de `avatarOn`), `test-interface-language` e `test-rodape-segmentos-2026-09-27` (o /ai-avatar pode faltar no rodapé só enquanto `AVATAR_PUBLIC=false`).

## Riscos

- Os motores de resposta que já guardaram o texto antigo podem citar o Avatar por um tempo.
- O `/ai-avatar` sai do índice do Google. Volta com o interruptor.
- O bento da home ficou com 5 tiles: a 2ª fileira tem só o Kling 3 (antes tinha Kling 3 + Avatar).
- Ficaram de fora, porque já existiam antes: a linha do Studio no /ph e as páginas "seven engines" (/arena, /kineo-vs-higgsfield, /tiktok-creator-rewards-videos) ainda contam o Omni Flash, que está pausado.
