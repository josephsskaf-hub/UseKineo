# SPRINT 3 — ASSINATURAS: O RITUAL 1 → 2 → 3 → PAGA (05/09/2026 →)

Pista do Claude. Codex, desde 05/09, é dono do visual/navegação/espanhol de
TODAS as páginas (`docs/ESCOPO-CODEX-UX-CLAUDE-VENDAS-2026-09-05.md`, na
worktree do Codex). Esta pista: fluxo, aquisição, retorno e assinatura nova.
Meta do fundador (05/09): **2-3 assinaturas novas por dia**, com ações
executáveis — não ações de dados.

Placar canônico: marco zero `2026-09-03 16:00:00+00`, contas externas
(fora josephsskaf/usekineo/kineo.local). Verdade do dinheiro =
`payment_success` (webhook), nunca `checkout_success_viewed`.

## #0 — 05/09 10:00→11:30 BRT (sessão CEO, fora da rotina) — O CARTÃO DO EPISÓDIO 2 ESTAVA MORTO PARA 9 EM 10 PESSOAS

**O número.** Pós-marco (43h, externos): 61 cadastros → 37 fizeram o filme 1
→ 10 fizeram o 2 → 4 fizeram o 3 → 2 fizeram o 4 → 4 pessoas no checkout →
**0 pagamentos**. Mediana filme 1 → filme 2 = **22 minutos**; 6 dos 10
segundos filmes nasceram em menos de 30 min, 1 só em outro dia. O segundo
filme acontece **na mesma sessão ou não acontece**. 27 das 37 nunca voltaram.

**O defeito (medido, reproduzido, consertado).** `/api/next-episode` — a rota
que escreve o "Episode 2" pronto na tela de filme concluído — recebeu 16
chamadas hoje e devolveu **12 × 502**. Log da Vercel: `[next-episode] sem
marcadores, descartado` em 10 de 14. Sonda local com o MESMO prompt/modelo/
temperatura: **0 de 8** respostas traziam HOOK / MICRO REWARD / ESCALATION /
PAYOFF. Causa: o episódio 1 vai para o modelo em PROSA (é a narração real do
filme), e o modelo imita a prosa — a regra perde para o exemplo. A rota então
**descartava** a resposta, e o cartão simplesmente não aparecia. Sem erro na
tela: a porta do segundo filme estava fechada em silêncio.

**O conserto** (`lib/nextEpisodeMarkers.ts`, novo; `app/api/next-episode/route.ts`):
1. o prompt ganhou o ESQUELETO de saída explícito ("Episode 1 below is plain
   prose. Do NOT copy that shape") → sonda: **8 de 8** com marcadores;
2. o servidor deixa de descartar e passa a ROTULAR: aceita rótulo decorado
   (`**HOOK**`, `Payoff:`, `MICRO-REWARD`) e, se vier prosa pura, divide por
   FRASES em 4 blocos determinísticos — gancho = 1ª frase, payoff = última,
   meio ao meio — **sem tocar numa palavra** (Contrato C1 provado no teste);
3. só o irrecuperável (menos de 4 frases) continua 502; a resposta carrega
   `markersVia: model | normalized | auto_split` para medir o caminho.

**Prova.** `scripts/test-proximo-episodio-marcadores-2026-09-05.mjs` 27/27
(comportamento real da biblioteca + leitura da rota), `tsc` limpo, sonda
real 8/8. Arquivos: só os dois acima + o teste. Nenhum arquivo do lote A do
Codex (StudioClient, GenerateClient, HistoryClient, ResumeStrip,
seriesContinuation) foi tocado.

**Como medir (depois do clique).** `next_episode_failed` cair de 12/16 para
~0; `next_episode_ready` aparecer para quase toda chegada em `video_ready_viewed`;
e aí, pela primeira vez, `next_episode_clicked` ter denominador.

**O que ficou fora, de propósito.** O destino do clique ("Build next episode"
→ `/studio/create`) é o P0 do lote A do Codex; eu não mexo no botão, só no
que ele recebe.

### Estado da fila no fechamento do #0
21 entregas do ciclo de 04/09 + esta = **22 na fila, ZERO em produção**. O
publicador v11 está no disco (guardião 12/12 rodado hoje contra o bat real).
**Falta o clique.**

## #1 — 05/09 10:38→12:10 BRT (rotação 1 de 8) — 22 DOS 26 E-MAILS "VOCÊ ESTÁ SEM CRÉDITO" FORAM PARA GENTE COM CRÉDITO NA MÃO

**A jogada era a J2 do cardápio** ("o e-mail de filme pronto carrega o episódio
2"). Antes de construir, medi — e a premissa estava parcialmente errada: o
episódio 2 **já existia** no rodapé desde o #24/#26 (02/09). O que não existia
era ele chegar em quase metade das pessoas. A jogada virou o defeito real.

### O número que doía
Pós-marco (`2026-09-03 16:00:00+00`, 43h, contas externas), 61 e-mails
"Your Short is ready" — o e-mail que TODA entrega dispara, 41 pessoas:

| rodapé | e-mails | porta do episódio 2? | saldo NULL no envio |
|---|---|---|---|
| `trial_episode2` | 27 | **sim** | 0 de 27 |
| `plan_films` | 26 | **NÃO — só preço** | **22 de 26** |
| `subscriber_next` | 5 | sim | 4 de 5 |
| `plan_generic` | 3 | NÃO | 3 de 3 |

Ou seja: **29 dos 61 e-mails (48%) saíram sem nenhuma porta para o 2º filme.**
E o grupo `plan_films` não estava sem saldo — cruzando com `profiles` hoje:
**20 pessoas, 17 delas com ≥ 5 créditos na mão** (média 8,3; teto 12) — saldo
de sobra para outro filme no Kineo 1 (5cr). Quinze das 20 fizeram UM filme só.

### A causa (estrutural, não aleatória)
`videoReadyFooter` decide entre pedir o EPISÓDIO 2 e pedir o PLANO olhando
`creditsRemaining`. O ramo era `if (credits !== null && credits >= 5)`, então
**`null` caía no ramo de quem está sem saldo**. E `null` ali nunca significou
zero: significa que o remetente não sabia.

Por que ele não sabia: em `/api/compose/status`, `creditsRemaining` só recebe
número quando o débito acontece ali. Nos **motores cinematicos** o crédito é
consumido na ABERTURA do job, e o `else` do bloco de débito carimba
`creditsRemaining = null` de propósito (route.ts, "token was consumed at job
start"). Resultado: **quem usou o motor caro — justamente quem demonstrou mais
intenção — era o único a perder a porta do 2º filme.**

O comentário do #24 dizia "saldo desconhecido = a copy de hoje". Não era o que
o código fazia: com saldo desconhecido e custo conhecido, caía em `plan_films`.

### O que mudou (3 arquivos de servidor, nenhum de tela)
1. `app/api/compose/status/[renderId]/route.ts` — o `planRow` que já consulta
   `profiles` no mesmo ponto do fluxo (e DEPOIS do débito) passou a pedir
   `video_credits` junto. O rodapé recebe `creditsRemaining ?? saldoDoPerfil`.
   **Zero consulta nova.** O carimbo `video_ready_email_sent` grava o saldo
   EFETIVO e um `credits_source: debit | profile | unknown` — antes o `null`
   do débito era indistinguível de saldo zero no banco.
2. `lib/lifecycle/videoReadyFooter.ts` — guarda de biblioteca: saldo
   desconhecido + não-assinante + tema utilizável = novo ramo
   `unknown_balance_episode2`, com a porta do episódio 2 **e** a linha de plano
   (mesma função, mesma copy, mesmo link — a oferta não foi tocada). Nenhuma
   frase afirma saldo: sem número provado, não se cita número.
3. `lib/seriesContinuation.ts` — fonte própria `video_ready_unknown_balance`,
   porque `series_continuation_landed` só carrega `source`; sem ela o
   antes/depois deste conserto seria impossível de contar.

**O que NÃO mudou, de propósito:** saldo provado < 5 (e zero) continua
`plan_films` sem porta — não se manda ninguém para a parede do upgrade. Sem
tema utilizável não se inventa porta (selo honesto). Assinante segue sem preço.

### Testes
`scripts/test-rodape-saldo-desconhecido-2026-09-05.mjs` **40/40** (novo).
Bateria dos vizinhos, toda verde: `test-video-ready-footer` 50/50,
`test-video-ready-nudge` 38/38, `test-stranded-ready-footer` 42/42,
`test-serie-episodio-2` 262/262, `test-porta-episodio2-ramos` 32/32,
`test-plan-fit` 382/382, `test-proximo-episodio-marcadores` 29/29.
`npx tsc --noEmit` limpo. **Isto é a bateria do rodapé/série, não a suíte
integral** — não afirmo o que não rodei.

**Dois guardiões estavam VERMELHOS antes de eu encostar neles** (provado
rodando-os numa worktree limpa de `origin/main`): as asserções que leem a rota
comparam contra literais com `\n` e no checkout Windows o arquivo vem com
`\r\n`. Viviam vermelhos aqui e verdes na CI. Consertei o leitor dos dois
(`.split('\r\n').join('\n')`) — é o inverso do "guardião verde ≠ suíte verde":
guardião que vive vermelho é guardião que ninguém lê.

### Ferramenta nova: `scripts/alias-loader.mjs` + `alias-hooks.mjs`
O Node 24 roda `.ts` direto, mas não lê os `paths` do tsconfig — por isso só
dava para testar biblioteca sem `import` (foi por isso que `seriesContinuation`
nasceu "sem import de propósito"). O gancho resolve `@/` e destrava teste de
biblioteca de verdade. Uso: `node --import ./scripts/alias-loader.mjs <teste>`.

### Placar da rotação (marco 03/09 16:00 UTC, externos, por fonte)
| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt.com | 31 | 25 | 7 | 2 | 1 | 0 |
| taaft | 14 | 6 | 1 | 0 | 0 | 0 |
| nav | 9 | 5 | 1 | 1 | 0 | 0 |
| (sem fonte) | 6 | 2 | 1 | 1 | 2 | 0 |
| partners | 1 | 0 | 0 | 0 | 0 | 0 |
| **total** | **61** | **38** | **10** | **4** | **3** | **0** |

O ChatGPT entrega 25 dos 38 primeiros filmes e o TAAFT perde 8 de 14 antes do
primeiro filme — é a fonte que mais vaza na entrada (pauta da J6).

### Checagem zero — LIMPA
`render preso >90min` 0 · `débito sem entrega` 4, **todos os 4 ESTORNADOS**
(2 `animate-` que por desenho não criam linha em `videos`, ponto cego do #295)
· `cadastro sem crédito` 1 = `lirikp@hotmail.com`, que tem **2 filmes** — gastou
até zero, não é trial órfão · `next_episode_failed` **0 desde o deploy do #0**
(13:25 UTC) — mas `next_episode_ready` também 0: **ainda sem tráfego, o #0 não
está provado nem desmentido.** As 13 falhas de hoje são TODAS anteriores ao
push (a última 13:15 UTC, 10 min antes do commit).

### Como medir este conserto
1. `video_ready_email_sent` com `credits_source='profile'` deve aparecer — é a
   prova de que o saldo passou a ser resolvido.
2. `footer='plan_films'` deve **cair** e `unknown_balance_episode2` aparecer.
3. `series_continuation_landed` com `source='video_ready_unknown_balance'`:
   hoje as 4 portas de e-mail somam **0 chegadas em 214** desde 17/07 — todas
   as 214 vieram de superfície de app. Esta é a primeira vez que uma porta de
   e-mail vai ter denominador honesto.

### Risco
Baixo e reversível: nenhum arquivo de tela, nenhuma consulta nova, oferta e
preço intocados, e o caminho de quem tem saldo provado é byte a byte o de
ontem. O pior caso é uma porta de episódio 2 a mais num e-mail.

### PRÓXIMA JOGADA
**J6 antes da J3.** O TAAFT perde 8 de 14 antes do primeiro filme (57%),
contra 6 de 31 no ChatGPT (19%) — e o TAAFT é tráfego que o fundador PAGA com
listing e review. Vale uma rotação achando onde a conta TAAFT para (o pedido do
codex-fluxo das 11:47 já aponta uma conta TAAFT que apertou gerar e parou antes
de nascer `render_jobs`). Consertar a entrada do TAAFT vale mais que a J3,
porque J3 mexe no 3º filme de quem já está dentro, e o TAAFT nem entra.

