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

| segundos até clicar | método escolhido | completou? |
|---|---|---|
| 0 | google | não |
| 0 | google | não |
| 0 | google | não |
| 0 | (nenhum) | não |
| 10 | email, google | **sim** |
| 42 | google | não |
| 49 | google | não |

**6 das 7 escolheram Google e 5 nunca voltaram.** A única pessoa que completou
foi a única que apareceu com `email` no rastro. Na coorte também há
`checkout_oauth_autostart_suppressed` (1 pessoa, 2×) e
`checkout_auth_fallback_presented` (1 pessoa, 2×) — sinal de que o caminho do
Google tem tropeço próprio. **Isto é a pauta da r3**, não um palpite.

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
* **r3**: o degrau do Google. 6 de 7 escolheram Google, 5 não voltaram. Ver
  `checkout_oauth_autostart_suppressed` e `checkout_auth_fallback_presented`.
* **r4**: corte por `metadata->>'version' = 'ph_sep10_v2'`, nunca por relógio.
