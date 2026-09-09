# SPRINT DO TRÁFEGO FRIO — 09/09/2026

Missão do fundador (09/09 13h): **tráfego frio converte**. Quem chega de fora
sem nunca ter ouvido falar da Kineo tem que virar cadastro em ≥3% (hoje 0,7%).
O Product Hunt lança 10/09 04:01 BRT e manda todo mundo para a mesma `/ph`.

Território desta sprint: `app/ph/**`, `components/PhLanding*`, `app/signup/**`,
`app/login/**`, `components/Auth*`, `lib/growth/coldTraffic*`, `app/api/auth/**`.
Fora do território (preço e política do $1 são decisão do fundador):
`app/api/stripe/**`, `lib/checkoutPricing.ts`, `lib/entryPolicy.ts`.

---

## BASELINE DE GUARDIÕES — origin/main `6d977d80`, medido 12:53–12:55 BRT

A suíte inteira (430 arquivos `scripts/test-*.mjs`) na worktree recém-criada,
**antes de qualquer edição minha**: **113 vermelhos herdados**. Nenhum deles é
de `/ph`. Lista completa em `C:\Users\josep\AppData\Local\Temp\claude\baseline-frio.txt`;
os nomes vão de `test-activation-recovery-claim-settle` a `test-workspace-spanish`.
Toda rotação compara contra esses 113: **0 vermelhos novos** é a régua, e um
verde que fica vermelho é meu, não herdado.

---

## r1 — 12:50→13:40 BRT · INSTRUMENTAR + RETRATO

### O que mediu

Coorte: pessoas com `ph_landing_shown` e `metadata->>'utm_campaign'='reddit_sep09'`,
`is_bot=false`, chave por pessoa = `coalesce(session_id, metadata->>'ip_hash')`.
Janela: 08/09 19:00 UTC (início da campanha) até 09/09 15:07 UTC.

| degrau | pessoas | % da chegada |
|---|---|---|
| chegou na `/ph` | **167** | 100% |
| clicou no CTA (`checkout_attempted`) | **7** | 4,2% |
| viu a tela de cadastro (`checkout_auth_page_view`) | **6** | 3,6% |
| completou cadastro (`checkout_auth_completed`) | **1** | 0,6% |
| `checkout_started` | **1** | 0,6% |
| **pagou** | **0** | **0%** |

**160 de 167 (96%) não produziram um único evento além de carregar a página.**

O degrau do cadastro, pessoa a pessoa (as 7 que clicaram):

| segundos até clicar | método escolhido | voltou logada? |
|---|---|---|
| 0 | google | não |
| 0 | google | não |
| 0 | google | não |
| 0 | (nenhum) | não |
| 10 | email, google | **sim** |
| 42 | google | não |
| 49 | google | não |

**6 das 7 escolheram Google e 5 nunca voltaram.** Na coorte também há
`checkout_oauth_autostart_suppressed` (1 pessoa, 2×) e
`checkout_auth_fallback_presented` (1 pessoa, 2×) — sinal de que o caminho do
Google tem tropeço próprio. **Isto é a pauta da r3**, não um palpite.

#### ⚠️ Retificação dentro da própria r1 — e o critério que qualquer pista deve usar

A primeira versão desta tabela media "completou" por `checkout_auth_completed`,
e chegava a um número **falso e alarmante**: *23 pessoas escolheram Google em 7
dias e ZERO completaram*. O número estava errado por dois motivos que se
somam, e vale registrar os dois porque a próxima pista vai tropeçar neles:

1. **`checkout_auth_completed` é evento legado — nenhum código atual o emite.**
   `grep` em `app/ lib/ components/` só o encontra no painel do admin, que o
   *conta*. Ele tem **1 ocorrência em 7 dias** na base inteira. Quem fizer o
   numerador com ele mede zero por construção.
2. **O evento vivo não casa com a chave por sessão.** Quem fecha o caminho do
   Google é `auth_callback_completed`, emitido **no servidor**
   (`app/auth/callback/route.ts:99`): 166 ocorrências em 7 dias, **166 com
   `user_id` e apenas 6 com `session_id`**, nenhuma com `ip_hash`. Uma coorte
   chaveada em `session_id`/`ip_hash` perde 160 dessas 166.

**O critério correto** — e o usado na tabela acima — é *a sessão passou a
produzir eventos com `user_id` não nulo*. Com ele, em 7 dias e em toda a base:

| método | pessoas | voltaram logadas | chegaram ao checkout |
|---|---|---|---|
| google | 23 | **7 (30%)** | 7 |
| email + google | 1 | 1 | 1 |

Ou seja: o Google perde ~70% em toda a casa, não 100%. Na coorte fria do Reddit
perdeu 5 de 6 — pior que a média, mas **6 pessoas não sustentam a afirmação de
que o frio sofre mais**; a r3 precisa do número maior antes de concluir isso.

**Falso alarme descartado no caminho:** o painel `/admin/funnel` *não* está
quebrado. Ele já faz `Math.max(checkout_auth_completed,
checkout_auth_callback_completed)`, e o segundo vem de `auth_callback_completed`
filtrado por `is_checkout_destination` (`route.ts:773`). O plano B já existe
lá. Nenhum pedido entre pistas é necessário.

Distribuição por hora de chegada (BRT): espalhada, sem pico único — 08h=29,
23h=23, 22h=19, 21h=19, 06h=16, 00h=15, 11h=11, 03h=9. Não é rajada de robô.

### O que a medição NÃO conseguiu dizer — e por quê

Celular vs desktop: **impossível**. País: **impossível**. Tempo na página:
**impossível**. Profundidade de leitura: **impossível**.

A `/ph` produzia exatamente dois eventos em toda a sua vida — `ph_landing_shown`
e o `landing_session_started` genérico — e as chaves de metadata do segundo são
só `utm_*`, `referrer_host`, `ip_hash`, `source`, `source_known`, `surface`,
`is_bot`. Nenhuma de dispositivo, nenhuma de rolagem, nenhuma de clique.

Isso torna os "96% que não fizeram nada" **um número que não decide nada**: ele
é compatível com dois defeitos opostos, de remédios opostos —

* **(A) a página não é lida** — a pessoa abre, vê a primeira dobra e some. O
  remédio é peso/promessa/velocidade acima da dobra.
* **(B) a página é lida e a oferta é recusada** — a pessoa desce até o preço,
  lê "$1 hoje, depois $29/mês, sem plano grátis" e sai. O remédio é oferta e
  prova, e mexer na dobra não muda nada.

Escolher entre A e B sem rolagem é palpite. Foi por isso que a r1 instrumentou
antes de mudar qualquer copy.

### O que mudou

`components/PhLandingBeacon.tsx` — três sinais novos, `version: 'ph_sep10_v2'`
como **carimbo do bundle** (o corte da medição da r4 é por campo novo, nunca
por relógio):

* **`ph_scroll`** — marcos 25/50/75/100 do documento revelado, uma vez cada,
  com os segundos desde o load. Página que já cabe na tela nasce em 100%: quem
  não precisou rolar viu tudo, e contar isso como "não rolou" culparia a copy
  por um defeito inexistente.
* **`ph_cta_clicked`** — `position` (top/bottom), `seconds`, `depth` no momento
  do clique, e `href_campaign` lido do href **real** da âncora. Esse último
  campo é a prova de que a reescrita de `intent_campaign` que o beacon já fazia
  desde 08/09 realmente aplica: campo ecoado não é campo honrado.
  O listener é registrado na **fase de captura** porque o CTA é uma âncora que
  navega para fora (`/api/stripe/checkout`); `trackEvent` já usa
  `keepalive: true`, então o POST sobrevive à saída da página.
* **perfil do visitante** no próprio `ph_landing_shown`: `viewport_w`,
  `viewport_h`, `is_mobile` (< 640px), `tz` e `lang`. O Reddit é
  majoritariamente celular e a casa nunca soube quantos eram. `tz` e `lang`
  respondem de graça a hipótese de idioma que estava reservada para a r5.

`scripts/test-ph-frio-beacon-2026-09-09.mjs` — guardião novo, 22 verificações,
estilo `readFileSync` sem imports de `@/` (guardião com alias morre no import
antes da primeira verificação e passa a vida em falso verde).

### O que provou

* `npx tsc --noEmit --incremental false` → **verde**.
* Guardiões vizinhos: `test-ph-kit-2026-09-09` (66 verificações, 0 falhas) e
  `test-ph-landing-2026-09-08` (15 verificações, 0 falhas) → **verdes**.
* Guardião novo **falsificado por 5 mutantes reais**, cada um provado por grep
  do texto inserido (nunca por md5 — CRLF mente):

  | mutante | prova de que aplicou | guardião |
  |---|---|---|
  | `aoClicar, true)` → `false` (perde a fase de captura) | grep achou `aoClicar, false)` | **vermelho** |
  | apaga `marcosEnviados.current.add(marco)` (perde o dedupe) | grep achou `void 0` | **vermelho** |
  | `VERSAO` volta a `ph_sep10_v1` (perde o carimbo) | grep achou a constante v1 | **vermelho** |
  | `href_campaign` → campanha ecoada da URL | grep achou `campanha_ecoada` | **vermelho** |
  | página renomeia `ph-cta-trial-bottom` (listener casaria 1 de 2) | grep achou `cta-rodape` | **vermelho** |

  Restaurado o original, o guardião volta verde nas 22.

### O que fica para a próxima

* **r2**: ler a `/ph` em 375px de largura no navegador real (não headless), com
  o retrato da r1 na mão. Mas a hipótese só se escolhe **depois** que o
  `ph_scroll` tiver dados — sem eles, r2 decide no gosto. Se o deploy da r1
  ainda não tiver acumulado rolagem suficiente, r2 mede o que der e publica a
  mudança que a leitura em 375px sustentar sozinha.
* **r3**: o degrau do Google, com o critério retificado acima (sessão passa a
  ter `user_id`, nunca `checkout_auth_completed`). O alvo é o 30% da base
  inteira, não os 6 do Reddit. Ver `checkout_oauth_autostart_suppressed` e
  `checkout_auth_fallback_presented`.
* **r4**: corte por `metadata->>'version' = 'ph_sep10_v2'`, nunca por relógio.

### Deploy desta rotação

`6bc63a90` → `dpl_3WVqsHaJ4RtjPCQ6hbqxHGgD6AHQ`, **confirmado no ar às 12:59
BRT**: o id do deployment aparece no HTML de `https://www.usekineo.com/ph`
(sonda com User-Agent de navegador identificável — `curl` pelado é lido como
robô e cai em outro ramo).

---

## r2 — 13:02→14:05 BRT · O QUE O FRIO VÊ (e o instrumento que mentia)

> Nota de processo: a r1 rodou de 12:50 a 13:01 e esta rotação abriu às 13:02,
> antes do horário nominal da r2 (15:00). Segui a regra anti-repetição (não
> refazer o que o diário já registra) e entrei direto na pauta da r2.
> O commit é assinado `Claude Opus 5 (1M context)` e não `Fable 5.1` como pede o
> SKILL.md: quem executou esta rotação foi o Opus 5, e assinar com outro modelo
> seria registro falso.

### O que mediu — e o instrumento quebrou na mão

A r2 abriu para ler a `/ph` em 375px com o retrato da r1 na mão. A primeira
coisa que a leitura no navegador real encontrou não foi a copy: **foi a
instrumentação da r1 respondendo 100% para todo mundo.**

Medido no navegador, em produção, na `/ph` (4.427px de conteúdo em viewport de
812px), com o conteúdo rolado a 1500px:

| leitura | valor |
|---|---|
| `window.scrollY` | **0** (mesmo com o conteúdo em 1500px) |
| `documentElement.scrollHeight` | **812** (= `clientHeight`, não 4427) |
| `body.scrollHeight` | **4427** |
| fórmula da r1 | **100%** ← errada |
| fórmula correta | **52%** |

A causa é `app/globals.css:121` — `html, body { height: 100% }`. Com altura
fixa na raiz, **quem rola é o `<body>`**, e daí saem três defeitos que se somam:

1. `documentElement.scrollHeight` iguala o viewport, então
   `(scrollY + innerHeight) / scrollHeight` dá 1 **no load** — os quatro marcos
   disparam de uma vez, sem ninguém rolar nada.
2. `window.scrollY` fica preso em 0 para sempre.
3. Evento de scroll de **elemento** não borbulha até a `window` — o listener da
   r1 nunca era chamado.

O banco já gritava o sintoma e ninguém tinha olhado ainda: **4 `ph_scroll`
(25, 50, 75 e 100) em 0,52 s da mesma pessoa.** Nenhum humano rola 4.427px em
meio segundo.

**Por que isso era pior do que não medir:** o número errado é plausível. "100%
das pessoas leem a página inteira" mandaria a r4 e a r5 descartarem a hipótese
(A) (a página não é lida) e irem mexer na oferta — que é a mudança cara,
arriscada e no território do fundador. A r1 instrumentou justamente para não
escolher no gosto, e o instrumento escolhia sozinho, sempre pelo mesmo lado.

**Nenhum dado orgânico foi perdido.** Desde o deploy da r1 (15:59 UTC) até a
descoberta, a única pessoa com eventos `ph_sep10_v2` era a **própria sonda**
(1 pessoa, 8 `ph_scroll` = 2 loads × 4 marcos instantâneos, 0 cliques). O
defeito foi pego antes de qualquer visitante real passar por ele.

### O que a leitura em 375px disse (e o que ela NÃO sustenta)

Viewport 375×812, a `/ph` em produção, posições reais do documento:

| elemento | topo (px) | na primeira dobra? |
|---|---|---|
| CTA de $1 (`ph-cta-trial`) | 376 | sim |
| vídeo do robô (Omni) | 545 | sim, ~267px visíveis |
| primeiro pôster da vitrine | 961 | não |
| fim do documento | 4427 | — |

**A hipótese (a) do plano da sprint — "o CTA pede cartão antes de mostrar um
filme" — está PARCIALMENTE ERRADA e não vai virar mudança nesta rotação.**
Há vídeo na primeira dobra do celular: ele começa 169px abaixo do botão e
aparece cortado, mas aparece. O que a dobra tem de fato, na ordem: título de 3
linhas, parágrafo de **7 linhas**, botão de $1, duas linhas de letra miúda, e
só então o topo do robô.

Trocar essa ordem é uma aposta razoável — e é exatamente o tipo de aposta que a
r1 mandou não fazer sem rolagem. Agora que o instrumento mede de verdade, a
próxima rotação escolhe com dado em vez de gosto.

### O que mudou

`components/PhLandingBeacon.tsx` — o conserto tem duas metades e as duas são
necessárias:

* **`alvoDeRolagem()`** elege o elemento que realmente rola (raiz → body →
  nenhum, com folga de 1px contra arredondamento de zoom) em vez de presumir a
  janela. O evento passa a carregar **`scroller`** (`window`/`body`/`nenhum`):
  sem esse campo não há como distinguir, olhando o dado, rolagem de verdade de
  fórmula velha — as duas gravam `depth: 100` quando a página é curta.
* **o listener vai para o `document` na fase de captura**, único jeito de ouvir
  o scroll de um elemento que não borbulha. A remoção também usa `capture`,
  senão o listener vaza.

`version` sobe para **`ph_sep10_v3`**: a rolagem gravada sob `v2` é lixo
conhecido e não pode ser somada à boa. O perfil do visitante do `v2`
(`viewport_w`/`is_mobile`/`tz`/`lang`) **continua válido** — só a rolagem estava
quebrada.

`scripts/test-ph-frio-beacon-2026-09-09.mjs` — **a verificação da r1 exigia a
fórmula errada** (`window.scrollY + window.innerHeight` como regex obrigatória).
Um guardião que cristaliza a fórmula quebrada impede o conserto em vez de
proteger o sinal. Trocada por duas: a profundidade sai do alvo eleito, e soma
`alvo.topo + alvo.janela`.

`scripts/test-ph-rolagem-real-2026-09-09.mjs` — guardião novo, **19
verificações**, que não se contenta em casar texto: ele **extrai**
`alvoDeRolagem()` e `profundidade()` do componente e as **executa** contra
quatro DOMs falsos.

| cenário executado | scroller esperado | profundidade |
|---|---|---|
| a `/ph` real, body rolado a 1500 de 4427 | `body` | **52%** (antes: 100%) |
| a mesma página, visitante no topo | `body` | **18%** (antes: 100%) |
| layout comum, a janela rola | `window` | 52% |
| página curta que cabe na tela | `nenhum` | 100% |

Ele também trava a **premissa**: se `html, body { height: 100% }` sair do
`globals.css`, a verificação avisa — ninguém remove o conserto achando que o
CSS mudou sem ter olhado.

### O que provou

* `npx tsc --noEmit --incremental false` → **verde**.
* Guardiões vizinhos verdes: `test-ph-frio-beacon-2026-09-09`,
  `test-ph-kit-2026-09-09`, `test-ph-landing-2026-09-08`.
* Guardião novo **falsificado por 5 mutantes reais**, cada um provado por grep
  do texto inserido (nunca por md5 — CRLF mente):

  | mutante | prova de que aplicou | guardião |
  |---|---|---|
  | volta à fórmula da r1 (`window.scrollY + innerHeight`) | grep achou a expressão | **vermelho** |
  | `scroll` sem `capture: true` | grep achou `{ passive: true })` | **vermelho** |
  | ramo do body ignora `scrollTop` (`topo: 0`) | grep achou `topo: 0 /* mutante */` | **vermelho** |
  | `VERSAO` volta a `ph_sep10_v2` | grep achou a constante v2 | **vermelho** |
  | evento perde o campo `scroller` | grep achou a lista de metadata sem ele | **vermelho** |

  Restaurado o original, volta verde nas 19.

### Deploy desta rotação, e a prova em produção

`e90a228b` → `dpl_CjKrq5mLvaXBMfE13ngzDr2ChEyz`, **READY e confirmado no ar às
13:13 BRT** (o id aparece no HTML de `https://www.usekineo.com/ph`; sonda com
User-Agent de navegador identificável, e **controle** numa rota irmã
inexistente devolvendo 404 — sem controle, um 200 não prova nada).

Sonda ponta a ponta no navegador real, 375×812, rolando **com a roda do mouse**
até 86% do documento:

| evento | version | scroller | depth | segundos |
|---|---|---|---|---|
| `ph_landing_shown` | `ph_sep10_v3` | `body` | — | — |
| `ph_scroll` | `ph_sep10_v3` | `body` | **25** | 1 |
| `ph_scroll` | `ph_sep10_v3` | `body` | **50** | 1 |
| `ph_scroll` | `ph_sep10_v3` | `body` | **75** | 1 |

**O marco 100 não saiu — e é isso que prova o conserto.** A rolagem parou em
86% (3.000 de 4.427px), então o quarto marco não podia disparar. Antes, os
quatro saíam juntos em 0,52 s no load, sem ninguém tocar na tela.

#### Uma armadilha do teste que vale registrar

Metade desta rotação quase concluiu que o conserto tinha falhado. Rolagem
**programática** (`body.scrollTop = 1200`) move o conteúdo — medido, o pôster
foi de 961px para −239px — e **não dispara evento de scroll nenhum**: nem no
`document` em captura, nem no `body` diretamente. Quatro listeners, zero
disparos, com o conteúdo comprovadamente rolado.

Com a **roda do mouse**, no mesmo carregamento, o resultado é o oposto e
decisivo:

| listener | disparou? |
|---|---|
| `document`, fase de captura | **sim** (`target: BODY`) |
| `body`, direto | **sim** |
| `window` — o da r1 | **não** |

Ou seja: `scrollTop = N` não serve para validar telemetria de rolagem, e o
listener da r1 na `window` não receberia nada nem com a pessoa rolando de
verdade. Quem for medir rolagem em qualquer outra tela da casa: **role com a
roda, nunca por atribuição**, senão vai condenar código que funciona.

### O que fica para a próxima

* **r3** (o degrau do Google) segue como a r1 deixou: critério é *a sessão passa
  a produzir eventos com `user_id`*, nunca `checkout_auth_completed` (evento
  legado, 1 ocorrência em 7 dias). Alvo: os 30% da base inteira (23 pessoas),
  não os 6 do Reddit.
* **r4**: o corte agora é `metadata->>'version' = 'ph_sep10_v3'`. **Não somar a
  rolagem `v2` — ela é inválida por construção.** O campo `scroller` diz, linha
  a linha, se a medição é confiável: `body` ou `window` = boa; ausente = bundle
  velho.
* **A pergunta que a r4 finalmente pode responder**, e que decide o remédio:
  entre quem chega do Reddit, qual fatia passa de `depth: 25`? Se a maioria
  morre em 25, o defeito é (A) — dobra/promessa/peso. Se chega a 75/100 e não
  clica, é (B) — oferta. Tráfego medido hoje: ~11 pessoas/hora no pico
  (14h UTC), então **2h de rotação já dão amostra**.
