# HANDOFF — Clipes primeiro (05/10/2026)

Branch `codex/nuvem-clips-primeiro-0510` (nasceu de origin/main 6ac5d2b8). Nada em main, nada publicado, nenhum render
pago, nenhum e-mail, nenhum conector (Supabase/Vercel/Gmail) usado. **Todos os interruptores nascem desligados: com a
branch em produção o cliente não vê nada novo.** Medição = `docs/HANDOFF-CLIPS-PRIMEIRO-SQL-2026-10-05.sql` (não rodada).

## Interruptores (todos em código, todos desligados)

| Interruptor | Arquivo | Valor | O que liga |
|---|---|---|---|
| `CLIP_PRECO_MERCADO_PUBLIC` | lib/clips/clipPricing.ts | `false` | régua de preço por segundo pelo mercado (A) |
| `CLIP_EFFECTS_PUBLIC` | lib/clips/clipEffects.ts | `false` | galeria de efeitos para quem é de fora (B) — a casa já vê |
| `HOME_CLIPS_FIRST` | lib/growth/homeClipsFirst.ts | `'off'` | `'ab50'` = A/B 50/50 · `'all'` = todo mundo (C) |
| `PRECOS_DOIS_PRODUTOS_PUBLIC` | lib/pricingTwoProducts.ts | `false` | bloco "Clips — per second" + "Narrated films" no /pricing (D) |

Desligado = byte a byte o comportamento de hoje (provado por guardião: `clipCreditCost` igual em 46 combinações e em
1..30 s; a home atual é o mesmo componente; `/clips` sem efeitos para quem é de fora; /pricing sem bloco novo).

## O que o cliente vê (quando cada interruptor ligar)

**A — Preço do clipe pelo mercado.** Mesmo /clips, outro número de créditos. Proposta (Creator US$ 0,1993/cr):

| Motor | Concorrente mais barato (planos ≤ US$ 54,90/mês) | Hoje | Proposta | Status |
|---|---|---|---|---|
| Kling 3 1080p | Higgsfield Plus US$ 0,0784/s (fonte secundária) | 5s=8 · 10s=16 · 15s=23 | 5s=6 · 10s=11 · 15s=16 | **IMPOSSÍVEL A −10%** (fal cobra US$ 0,112/s) |
| Kling 2.5 1080p | Kling Pro US$ 0,0543/s (secundária) | 5s=5 · 10s=8 | 5s=5 · 10s=7 | **IMPOSSÍVEL A −10%** |
| Veo 3.1 Fast | Higgsfield Plus US$ 0,196/s (secundária) | 6s=7 · 8s=9 | 6s=6 · 8s=8 | **IMPOSSÍVEL A −10%** (por 1 crédito) |
| MiniMax H3 768p | Runway Pro US$ 0,1556/s (oficial) | 5/7/10/15s = 5/5/7/11 | 5/5/7/10 | −10% no 10 s e 15 s; 5/7 s presos no PISO DA CASA (5 cr) |
| Seedance 2.5 480p (pausado) | Runway Pro US$ 0,311/s | 12/16/23/35 | 11/15/21/31 | **IMPOSSÍVEL A −10%** |
| Seedance 1.5 · Omni | nenhum concorrente achado | — | igual | regra de 29/09 continua |

Régua: alvo = floor(90% × menor US$/s do mesmo modelo/resolução × s ÷ US$/cr do Creator); piso = 40% de margem no
crédito do Studio sobre o MAIOR custo fal (casa × conferido em 05/10); abaixo do piso = piso + rótulo "IMPOSSÍVEL A
−10%". Tabela inteira com 27 cotações, URL e data em `lib/clips/clipPriceVsMarket.ts` (`MARKET_QUOTES`,
`MARKET_UNKNOWN`). Fontes: WebSearch em 05/10 (o proxy bloqueia os sites); Higgsfield e Kling 2.5 só por fonte secundária
(camclo3d.com, krea.ai, atlascloud.ai); Runway oficial (help.runwayml.com, academy.runwayml.com); Kling 3 oficial
(klingai.com blog + membership). DESCONHECIDO: Higgsfield p/ Kling 2.5/Seedance 1.5/H3/Omni; Runway app p/ Seedance
1.5/Veo Fast; Hailuo app p/ H3; Pika (só motores próprios).

**B — Efeitos de 1 clique no /clips.** Galeria de 8 cartões no topo do /clips: Bring your photo to life · Product turning
360° · Zoom out to planet Earth · Cinematic slow motion · Restore and animate an old photo · Turn into a 3D cartoon ·
Color and particle burst · Storm in the background. Cada um: foto → clipe de 5 s, selo do motor real (Seedance 1.5 ou
Kling 2.5), preço executado (**5 créditos** cada, o mesmo `clipCreditCost` que o débito usa). Prévia = clipe real da casa
quando existe; sem prévia = placeholder marcado "Preview coming soon" (nenhum render pago foi feito). Upload de foto usa o
MESMO fluxo de consentimento + moderação do /clips. O servidor ignora prompt/motor/duração do navegador: resolve tudo pelo
catálogo, e recusa (interruptor, chave, foto) ANTES de ler saldo. Clipe de efeito pronto mostra **"Transformar em filme
narrado (60 s)"** → grava `clip_effect_film_upsell_clicked` no servidor e abre o Studio com a ideia do efeito, Seedance,
60 s. Copy em 16 línguas (lib/clips/clipCopy.ts). Entrada direta: `/clips?effect=<chave>`.

**C — Home "clips-first" (variante nova, home atual intocada; lib/engineWall.ts intocado).** 1º quadro = galeria de efeitos
+ "Upload a photo" grande; 2º produto = filmes narrados da casa + botão para o Studio. Deslogado: os botões vão para
`/signup?redirect=/clips?effect=<chave>` (pós-cadastro cai direto no efeito). Sorteio: hash determinístico (FNV-1a +
finalizador murmur3) do user_id, ou do cookie first-party httpOnly `kineo_vid` (180 dias, só na `/`, só para gente, só
com o interruptor ligado); balde < 5000 de 10000 = clips_first. Robô = controle. Exposição = evento de servidor
`home_variant_exposed` (rota recalcula a variante; o navegador não cunha; dedupe diário por cookie `kineo_hve`).
`clip_effect_chosen` e `clip_effect_film_upsell_clicked` carregam o carimbo do A/B (`home_ab`, `home_visitor_id`,
`home_variant`, `home_variant_visitor`); `clip_effect_ready` nasce no settle (rota de status ou cron, sem cookie) e liga à
escolha pelo `clip_id`. **Trava por pessoa:** a variante só é sorteada para quem pode usar o /clips com efeitos
(`clipsVisible(email)` + `clipEffectsVisible(isInternalEmail(email))`) — com `CLIP_EFFECTS_PUBLIC=false`, mesmo com
`HOME_CLIPS_FIRST='ab50'`, só a casa é sorteada.

**D — /pricing com dois produtos.** Abaixo de "One-time credits": "Clips — per second" (por motor, ~5 s e ~10 s, créditos +
≈US$ + ≈US$/s; Veo com 6/8 s reais), "Narrated films — per film" (15/30/60/90 s; "—" onde o motor não aceita) e "What each
plan makes per month" (Starter 12 clipes Seedance ou 7 Kling 3, ou 2 filmes Seedance 60 s; Creator 30/18 ou 6/1; Studio
60/37 ou 12/2). Nenhum número digitado: clipes de `clipCreditCost` (segue a régua A se ligada), filmes de
`creditCostForDuration`, US$ de `TIER_PRICES`/`TIER_CREDITS`. Guardião prova que, se a branch `codex/seedance-35cr-0410`
entrar (Seedance 25→35), a tabela mostra 35 sozinha.

## Como testar (local, $0)

1. `npm ci && npm run dev`.
2. **B:** logar com conta da casa → `/clips`: galeria aparece. `/clips?effect=product_360` abre o efeito. Com conta de fora:
   nada muda. Para ver como público: `CLIP_EFFECTS_PUBLIC = true`. Não apertar "Generate" (é render pago na fal).
3. **C:** `/?home_variant=clips_first` (prévia da casa, logado como casa). Para o A/B: `HOME_CLIPS_FIRST = 'ab50'` +
   `CLIP_EFFECTS_PUBLIC = true`, abrir `/` em janelas anônimas; o cookie `kineo_vid` decide o braço.
4. **D:** `PRECOS_DOIS_PRODUTOS_PUBLIC = true` → `/pricing`.
5. **A:** `CLIP_PRECO_MERCADO_PUBLIC = true` → preços do /clips e da tabela D mudam juntos.
6. Guardiões: `node scripts/test-clip-efeitos-2026-10-05.mjs` (39 ok, 11 mutantes) ·
   `node scripts/test-home-clips-first-2026-10-05.mjs` (50 ok, 15 mutantes) ·
   `node scripts/test-clip-preco-mercado-2026-10-05.mjs` (32 ok, 12 mutantes) ·
   `node scripts/test-precos-dois-produtos-2026-10-05.mjs` (23 ok, 8 mutantes) · `node scripts/test-clipes-2026-09-29.mjs`
   (1715 ok). `npx tsc --noEmit -p .` = 0 erros.

## Suíte inteira (node em cada scripts/test-*.mjs, timeout 120 s, 4 em paralelo)

| | arquivos | verdes | vermelhos |
|---|---|---|---|
| origin/main 6ac5d2b8 | 744 | 608 | 136 |
| esta branch | 748 | 613 | 135 |

Diferença: +4 guardiões novos (todos verdes) e `test-plan-fit.mjs` vermelho→verde. Este último NÃO é mudança desta
branch: rodado sozinho dá 395/395 nas DUAS árvores; o vermelho da base foi o timeout sob carga paralela. **Nenhum guardião
mudou de cor por causa da branch; nenhum foi reancorado** exceto o próprio guardião novo da home (carregador passou a
resolver imports relativos do catálogo de efeitos — comentário "Reancorado 05/10 (CLIP-EFEITOS)" no arquivo).

## Conflitos previsíveis com a branch de ativação (`codex/nuvem-ativacao-previa-br-0310`, entra antes)

- **`app/api/events/route.ts`** — ÚNICO conflito textual (`git merge-tree` conferido). As duas acrescentam linhas no fim de
  `SERVER_ONLY_EVENTS`. Resolução: manter os dois blocos.
- Semântico, sem conflito de texto: a ativação passa o destino pós-login por `destinoDaIdeia` (lib/growth/
  ideiaPousaNoStudio.ts). Conferido no código: só reescreve destino com `prompt=` na casa de máquinas — `/clips?effect=…`
  e `/clips?upload=1` passam intactos. Depois do merge, conferir à mão: `/signup?redirect=/clips?effect=product_360` →
  cadastro → cai em `/clips?effect=product_360`.
- O upsell do efeito abre `/studio?prompt=…&engine=seedance&duration=60&intent_campaign=…` para quem JÁ está logado (não
  passa por login, então `destinoDaIdeia` não age).

## Riscos

- **Robô vê o controle** na home: o Google pode tratar como cloaking se a variante virar `'all'` com robô ainda no
  controle. Com `'ab50'` é prática comum de A/B; em `'all'` o robô deveria ver a mesma coisa. (DECISÃO DO FUNDADOR.)
- `clipPricing.ts` agora importa `./clipPriceVsMarket` em tempo de execução: carregadores de guardião que recusam
  qualquer import precisariam resolver `./` (os atuais já resolvem ou não carregam esse arquivo).
- 4 efeitos sem prévia (placeholder honesto). As prévias de bring_to_life/storm_behind são filmes da casa em Kling 3,
  enquanto o efeito roda em Seedance 1.5/Kling 2.5 — o selo do motor no cartão é o real, mas a prévia é de outro motor.
- O Studio não lê `ref_image`: a foto do clipe NÃO viaja para o filme do upsell (só a ideia viaja).
- Bloco D sem telemetria de exibição/clique: acrescentar antes de ligar.

## DECISÕES DO FUNDADOR PENDENTES (em todas escolhi a opção mais conservadora: desligado / igual a hoje)

1. Ligar `CLIP_EFFECTS_PUBLIC` (efeitos para todos). Recomendo ligar ANTES do A/B, junto com prévias reais dos 4 sem vídeo.
2. Consentimento de direitos da foto: o /clips envia `rights=true` sem checkbox explícito (herdado). Pôr checkbox?
3. `HOME_CLIPS_FIRST`: `'off'` → `'ab50'`. Regra de parada proposta (SQL #5): 14 dias; se checkout/exposto da clips_first
   < controle → `'off'`; se ≥ com ≥ 300 expostos por braço → `'all'`.
4. Robô na home (cloaking) e qual id manda quando a pessoa cadastra (user_id × kineo_vid: hoje o user_id manda e a pessoa
   PODE trocar de braço no cadastro — a SQL #3 conta quem trocou).
5. `CLIP_PRECO_MERCADO_PUBLIC`: ligar ou não. Efeito real é baixar preço onde −10% é impossível (Kling 3 cai 25–31% e
   ainda fica ~3× o Higgsfield). Alternativa: nos IMPOSSÍVEL manter o preço de hoje.
6. Prateleira (planos ≤ US$ 54,90/mês) × todos os planos; mensalidade do Kling (oficial 8,8/32,56 × guias 10/37);
   preço mensal × anual (no anual os concorrentes ficam mais baratos).
7. Mínimo de 5 cr: baixar só no H3 de 5/7 s para alcançar −10%?
8. Piso de margem: régua do mercado usa 40%, a regra de 29/09 usa 50%.
9. Seedance 2.5: custo fal 0,2205 (fal hoje) × 0,208 (casa) — conferir na fatura.
10. `PRECOS_DOIS_PRODUTOS_PUBLIC`: recomendo ligar o D ANTES do A (mostra o degrau clipe → filme sem mexer em preço).

## Commits (todos com Co-Authored-By)

`git log --oneline origin/main..codex/nuvem-clips-primeiro-0510` — 18 commits + este handoff: catálogo puro dos 8 efeitos ·
servidor resolve o efeito + `clip_effect_ready` sem duplicar · `/api/clips` aceita `{effect}` + `/api/clips/effect-upsell`
· galeria + upsell no /clips · guardião dos efeitos · regra pura do A/B + servidor com trava por pessoa · cookie
`kineo_vid` no middleware · variante ClipsFirstHome · evento `home_variant_exposed` · escolha da variante num ponto só ·
guardião da home · régua de preço pelo mercado (desligada) · /pricing com dois produtos (desligado) · merges · carimbo do
A/B nos eventos de efeito. (Os SHAs mudaram uma vez nesta sessão: as 3 mensagens de merge ganharam o trailer
Co-Authored-By via reescrita só de mensagem; árvore idêntica.)

## Próxima jogada

O −10% é impossível no Kling 3 contra o Higgsfield (a fal sozinha já custa mais que 90% do preço deles): a guerra do
clipe NÃO se ganha por preço. O que o Higgsfield não vende é o degrau seguinte — o mesmo crédito vira filme narrado
pronto (60 s Seedance ≈ US$ 4,98). Ordem sugerida: (1) prévias reais dos 4 efeitos + `CLIP_EFFECTS_PUBLIC`; (2) ligar D
(o degrau clipe → filme fica visível no /pricing); (3) `HOME_CLIPS_FIRST='ab50'` com a SQL #5 como juiz; (4) só então
discutir A. Jogada não-óbvia: o efeito "Restore and animate an old photo" é o único que fala com quem NÃO é criador
(família, luto, aniversário) — ele merece um link próprio para anúncio de Dia dos Pais/Natal, porque o upsell natural
dele é o filme narrado da história daquela pessoa, e esse é o produto que o Higgsfield não tem.
