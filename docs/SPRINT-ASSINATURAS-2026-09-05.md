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

---

### checkpoint da #1 — 11:20 BRT (14:20 UTC) — o #0 está NO AR e ainda não foi tocado por ninguém: 11 pessoas viram a porta em 6h e ZERO apertaram

Não é entrada nova: é o checkpoint da rotação que abriu 10:38 e entregou o #1
(`1f3c3f9e`, na fila). Nada de trabalho novo foi iniciado.

**Correção de relógio:** as três linhas que a #1 assinou como "12:10 BRT" em
`docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` foram escritas às **10:55 BRT**
(hora real do commit `1f3c3f9e`). Quem for ordenar pedidos por hora, use o
`git log`, não o rótulo.

#### 1. O #0 está deployado — e continua sem prova
`git ls-remote origin main` = `2ca9a06c` = o commit do #0. Produção responde
`200` em 0,75s e `POST /api/next-episode` sem sessão responde `401` (rota viva
e com porta, não 500). Deploy confirmado sem tocar no painel da Vercel.

O que o tráfego diz, hora a hora (`next_episode_requested` → `ready`/`failed`):

| hora UTC | porta vista | pediram | falhou | ok |
|---|---|---|---|---|
| 07 | 2 | 3 | 2 | 1 |
| 08 | 3 | 3 | 2 | 1 |
| 09 | 1 | 2 | 1 | 1 |
| 10 | 0 | 1 | 1 | 0 |
| 11 | 2 | 3 | 3 | 0 |
| 12 | 2 | 2 | 1 | 1 |
| 13 (até 13:15) | 4 | 1 | 1 | 0 |
| **13:20→14:20 (pós-deploy)** | **0** | **0** | **0** | **0** |

Todo pedido é um par `requested` + resposta ~3s depois. O último `failed` é
**13:15:43 UTC**, 5 minutos ANTES do commit do #0 subir — nenhuma falha depois.
Mas **nenhum acerto também**: em 60 minutos de produção não houve um único
`next_episode_requested`. A cadência anterior era ~1 a cada 20 min, então uma
hora de silêncio é plausível e **não desmente nada**. O #0 segue **não provado
e não desmentido** — exatamente onde a #1 o deixou. Não afirmo conserto.

**O número que dói, e é maior que o #0:** `series_continue_seen` = **11 nas
últimas 6h** e `next_episode_requested` no mesmo período = **5**. Mais da
metade de quem VÊ a porta do episódio 2 não a aperta. O #0 consertou o que
acontece DEPOIS do clique; o vazamento maior está ANTES dele. Isso é pauta —
e é pauta do Codex, porque é o cartão, não a rota. Pedido registrado.

#### 2. Linha de base do #1, tirada ANTES de ele subir
O #1 está na fila, não em produção. Se a base não fosse tirada agora, o
"depois" não teria com o que ser comparado. `video_ready_email_sent`, 7 dias:

| rodapé | n | % |
|---|---|---|
| `trial_episode2` (tem porta) | 48 | 43% |
| `plan_films` (parede de upgrade, **sem porta**) | 47 | 42% |
| `subscriber_next` | 12 | 11% |
| `plan_generic` | 4 | 4% |
| **total** | **111** | |

`credits_source` **não existe em nenhum dos 111** — o campo nasce com o #1.
Isso torna o teste do #1 binário e à prova de discussão:
1. `credits_source='profile'` aparecer = o saldo passou a ser resolvido;
2. `unknown_balance_episode2` aparecer e `plan_films` **cair** dos 42%;
3. `series_continuation_landed` com `source='video_ready_unknown_balance'` > 0
   = a primeira chegada por porta de e-mail em 214 chegadas desde 17/07.

**Risco que a base revela e a #1 não dimensionou:** `plan_films` é 42% de todo
o e-mail de filme pronto. Se a maioria for saldo desconhecido, o #1 move um
naco grande de gente da parede de upgrade para a porta do episódio 2 de uma
vez. É o efeito desejado, mas é grande — vale olhar o primeiro dia depois do
clique em vez de deixar correr uma semana.

#### 3. Checagem zero — LIMPA
`render preso >90min` **0** · `cadastro sem crédito 24h` **0** ·
`next_episode_failed` pós-deploy **0** · fila com **1** commit (`1f3c3f9e`),
longe do limite de 30 — não é "hora de clicar" por volume, mas o #1 só passa a
valer quando o fundador clicar.

#### Testes
Nenhum código foi tocado neste checkpoint (só `docs/`), então não rodei
`tsc` nem guardião — não haveria o que compilar de diferente. Os 40/40 do
`test-rodape-saldo-desconhecido` e a bateria de vizinhos são os da #1 e
continuam valendo; **isso é a bateria do rodapé/série, não a suíte integral.**

#### PRÓXIMA JOGADA (para a rotação das 11:38)
Mantenho a recomendação da #1 — **J6 (fonte por fonte) antes da J3** — com um
reforço vindo deste checkpoint: além do TAAFT perder 8 de 14 antes do primeiro
filme, agora há um segundo vazamento medido e barato de atacar (11 veem a
porta, 5 apertam). Os dois são "a pessoa chega e não aperta", que é o gargalo
que o funil de 24/08 já tinha nomeado.

---

### #2 — 11:38→11:50 BRT (14:38→14:50 UTC) — a casa escreveu o roteiro, a pessoa aprovou, e a casa recusou o próprio roteiro: 36 pessoas tiveram o primeiro filme pulado por "isso parece instrução de chatbot"

Jogada da rotação: **J6 (fonte por fonte)**, como a #1 e o seu checkpoint
recomendaram. O TAAFT perdia 8 de 14 antes do primeiro filme; a pergunta era
*onde* a conta TAAFT para. A resposta não era do TAAFT — era da casa.

#### 1. O número que doía

Funil por fonte, marco 03/09 16:00 UTC, 61 contas externas:

| fonte | contas | filme 1 | filme 2 | filme 3 | checkout | pagou |
|---|---|---|---|---|---|---|
| chatgpt.com | 31 | 25 | 7 | 2 | 1 | 0 |
| **taaft** | **14** | **6** | 1 | 0 | 0 | 0 |
| nav | 9 | 5 | 1 | 1 | 0 | 0 |
| (sem fonte) | 6 | 2 | 1 | 1 | 2 | 0 |
| partners | 1 | 0 | 0 | 0 | 0 | 0 |

Das **8 contas TAAFT sem nenhum filme**, o rastro de eventos diz: 7 chegaram
ao `/generate`, 4 clicaram em analisar (9 cliques entre 4 pessoas — gente
clicando de novo), 2 chegaram a `video_generation_started`. E **7 das 8**
tinham, antes de tudo isso, o mesmo evento:

    activation_autostart_skipped · reason = prompt_looks_like_instruction

#### 2. A causa, com o arquivo e a linha

`app/HomeTopicForm.tsx` é a peça que faz a home valer: o visitante digita um
tema, a casa escreve o roteiro dele **de graça** (`/api/demo-script`), ele LÊ,
aprova e clica. O handoff para o `/signup` manda esse roteiro no formato de
seções da própria casa (`buildActivationPrompt`):

    HOOK: ...
    MICRO REWARD 1: ...
    MICRO REWARD 2: ...
    ESCALATION: ...
    PAYOFF: ...

Do outro lado, `looksLikeInstruction` (`lib/momentumTopic.ts`) olha a primeira
linha e testa `LABEL_LINE = /^[A-Z][A-Z /&-]{2,}:/` — regra escrita em 02/09
para pegar `STYLE:` e `MAIN CHARACTER:` de colagem de chatbot. `HOOK:` bate.
Veredito: **instrução**. O auto-start não dispara, e a pessoa ainda recebe na
tela o aviso `"Your ChatGPT script is still here"` — sobre um roteiro que a
NOSSA home escreveu e que ela nunca colou de lugar nenhum.

A assinatura bate byte a byte: os `prompt_length` desses eventos são **338-431
chars**, com `source=homepage` e `campaign=push69_home_one_click_starters`.

#### 3. O tamanho (campanha push69, histórico completo)

| grupo | pessoas | fez filme | fez 2 filmes |
|---|---|---|---|
| **auto-start PULADO** por este motivo | **36** | 21 (58%) | 6 (17%) |
| auto-start DISPARADO | 292 | 202 (69%) | 66 (23%) |

11 pontos de primeiro filme e 6 de segundo. Correlação, não prova de causa —
mas o mecanismo aqui não é hipótese: o roteiro estava pronto e aprovado, e o
botão não apertou sozinho como aperta para todo mundo.

#### 4. O que mudou

- `lib/nextEpisodeMarkers.ts`: nasce `pareceRoteiroDaCasa()`. É **lista
  branca**, não afrouxamento: exige que a **primeira linha com conteúdo** já
  seja um marcador da casa (rótulo inline `HOOK: …` ou em linha própria) **e**
  que existam **3 marcadores distintos**. Um `HOOK:` solto no meio de uma
  colagem não vira passe livre. O arquivo já era o dono do vocabulário de
  marcadores (é dele que vive o #0), então não há segunda cópia da regex.
- `lib/momentumTopic.ts`: `looksLikeInstruction` consulta a lista branca
  **antes** de qualquer outro sinal e devolve `false`. Nada mais mudou —
  `INSTRUCTION_START`, `LABEL_LINE`, `MARKDOWN` e `RULE_PHRASE` seguem
  idênticos, e `pickMomentumTopic` (âncora do e-mail de momentum) não toca
  nesta função e continua byte a byte o de ontem.
- `scripts/alias-hooks.mjs`: passa a resolver também import relativo sem
  extensão (`./resumeStrip`). Aditivo — só age quando o caminho pedido não
  existe como está.
- `scripts/test-momentum-topic.mjs` e `scripts/test-instruction-paste-notice.mjs`:
  os dois carregam `momentumTopic` fora do Next (cópia temporária / `new
  Function`) e morriam com o import novo. Ambos passam a carregar o vizinho
  **real**, não um dublê.

#### 5. O que o cliente passa a ver

Quem aprova o roteiro na home e clica: **o primeiro filme começa a renderizar
sozinho**, como já acontece com os outros 292. Antes, caía no `/generate` com
a caixa cheia, nada acontecendo, e um aviso dizendo que o roteiro dele era
colagem do ChatGPT.

#### 6. Testes

- **Guardião novo** `scripts/test-marcador-da-casa.mjs`: **40/40 verde**. Não
  testa só a biblioteca — lê `app/HomeTopicForm.tsx` para provar que o formato
  que ele assume é o formato que a home realmente produz, e lê
  `GenerateClient.tsx` para provar que o porteiro do auto-start ainda consulta
  a função consertada. Inclui 12 verificações de **NÃO AFROUXOU** (as 6
  colagens reais de chatbot continuam sendo recusadas) e a prova de que a
  primeira linha do handoff **ainda** bate no padrão que causava o falso
  positivo — sem isso o teste poderia estar verde por acidente.
- Vizinhos rodados, **todos verdes**: `test-momentum-topic` (40),
  `test-instruction-paste-notice` (48), `test-zero-cenas-fallback` (22),
  `test-proximo-episodio-marcadores`, `test-serie-episodio-2` (262),
  `test-momentum-continuacao` (49), `test-rodape-saldo-desconhecido` (40),
  `test-porta-episodio2-ramos` (32), `test-video-ready-footer`,
  `test-video-ready-nudge`.
- `npx tsc --noEmit` **verde** (worktree com junction de `node_modules`).
- **Isto é a bateria de vizinhos, não a suíte integral** — a suíte inteira não
  foi rodada nesta rotação.
- Achado honesto de fora do escopo: `scripts/test-coerencia-historia-2026-09-02.mjs`
  está **VERMELHO (23 ok, 2 fail)** — `duration=45 na URL vira 35` e
  `onboarding: consulta /api/credits antes de escolher motor`. Rodei na base
  limpa ANTES de encostar em qualquer arquivo: **já estava vermelho, não é
  meu**. Fica registrado para não virar paisagem.

#### 7. Risco

Baixo e reversível. A mudança só pode transformar `true` em `false` num único
caminho — texto que abre em marcador da casa com 3 marcadores distintos — e o
efeito disso é o auto-start disparar para quem aprovou o roteiro. O outro
consumidor de `looksLikeInstruction` é o resgate de zero cenas em
`generate-video-cinematic`, onde `false` libera a divisão determinística do
texto: exatamente o formato que `parseViralScriptSections` foi feito para ler.
Nenhum arquivo de tela, nenhuma oferta, nenhum preço, nada do pipeline de
qualidade do filme.

#### 8. Como medir

1. `activation_autostart_skipped` com `reason=prompt_looks_like_instruction`
   **e** `campaign=push69_home_one_click_starters` deve ir a **~0** (hoje: 10
   pessoas pós-marco, 4 nas últimas 24h).
2. `activation_autostart_dispatched` da mesma campanha deve subir na mesma
   proporção.
3. Degrau `filme 1` da fonte **taaft**: 6 de 14 hoje.
4. O que **não** pode mudar: `activation_instruction_notice_viewed` de gente
   com `utm_source=chatgpt.com` e `prompt_length` de 900-1000 — essas são
   colagens de verdade e devem continuar sendo pegas.

#### 9. Placar de fechamento (marco 03/09 16:00 UTC, externos)

cadastro **61** → filme 1 **38** → filme 2 **10** → filme 3 **4** →
checkout **3** → **pagou 0**.

#### Checagem zero — LIMPA
`video preso >90min (24h)` **0** · `cadastro 24h sem crédito e sem filme` **0**
· `next_episode_failed` nas 24h **13, todos ANTES do deploy do #0** (o último é
13:15:43 UTC, e `pós-deploy = 0`) · `next_episode_ready` 5, também todos
anteriores. Em 1h30 de produção não houve **um** `next_episode_requested`: o #0
segue **não provado e não desmentido**, exatamente como a #1 o deixou. Não
afirmo conserto. `series_continue_seen` teve 2 impressões pós-deploy.

Fila: **3** commits — longe do limite de 30, mas nada disto vale um centavo
até o clique.

#### PRÓXIMA JOGADA
**J6 continua, e agora com endereço.** Os 11 pulados por "instrução" nas
últimas 24h eram 4 da nossa home (consertado agora) e **7 de `chatgpt.com` com
`prompt_length` 900-1000** — esses são colagem de verdade e o pulo está certo.
Só que estar certo não está fazendo filme: a pessoa cola a conversa inteira do
ChatGPT, o auto-start recusa (com razão) e ela some. A jogada não é afrouxar o
portão — é o servidor **devolver o roteiro limpo** dessa colagem em vez de só
recusar. `lib/pastedDirectives.ts` e o desembrulhador de colchetes do
`generate-video-cinematic` (KINEO-UNBRACKET-2026-09-04) já sabem separar fala
de direção de cena; falta ligar isso ao momento do auto-start. É a maior fonte
do produto (31 das 61 contas) parando na porta de entrada.

#### Pedidos novos
Registrados em `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`.

---

### ✅ O QUE VOCÊ PRECISA FAZER
1. **Clique no `SUBIR-SITE.bat`** (raiz de `C:\kineo`). São 3 commits na fila:
   o rodapé de saldo desconhecido (#1) e o conserto do marcador da casa (#2).
   Enquanto não clicar, nenhum dos dois existe para cliente nenhum.
2. Nada mais depende de você nesta rotação.

### 📋 O QUE ACONTECEU
A home da Kineo escreve o roteiro do visitante de graça, ele lê, aprova e
clica para criar a conta. Descobri que, do outro lado, o produto olhava esse
roteiro — escrito por nós, no nosso próprio formato — e concluía "isso é
colagem de chatbot, não vou gerar nada automaticamente". Resultado: a pessoa
caía numa tela parada com um aviso dizendo que o roteiro dela era do ChatGPT.
Aconteceu com **36 pessoas** desde que a home passou a escrever roteiro; delas,
58% chegaram a fazer um filme, contra 69% de quem teve o auto-start normal.
Nas últimas 24 horas foram 4. Sete das oito contas vindas do TAAFT que nunca
fizeram um filme pararam exatamente aí — a fonte que você paga com listing e
review estava batendo nessa porta.

O conserto ensina o produto a reconhecer o próprio formato: roteiro que começa
com os nossos marcadores e tem três deles é roteiro nosso, ponto. Tudo que era
recusado ontem continua recusado — há doze verificações no guardião só para
provar isso. Não mexi em preço, oferta, tela ou no pipeline que faz o filme.

O que ficou aberto: o degrau que decide dinheiro segue em 0 pagantes pós-marco,
e a próxima jogada é a mesma porta de entrada vista do outro lado — as sete
pessoas que colam a conversa inteira do ChatGPT e batem no mesmo portão, com
razão, e vão embora sem filme.
---

### checkpoint da #2 — 12:25 BRT — 4 pessoas apertaram gerar e receberam SILÊNCIO: nem filme, nem erro, nem prova de que o pedido chegou ao servidor

Checkpoint da rotação #2 (aberta 11:38, entregue 11:54). Não abri jogada nova:
continuei a mesma porta de entrada, agora vista do lado do servidor, e atendi o
pedido aberto do `codex-fluxo` das **11:47 de hoje** — que é sobre exatamente
esta porta.

#### 1. O que estava errado (medido)

Pós-marco (03/09 16:00 UTC, externos), **47 pessoas apertaram gerar**:
41 nasceu alguma coisa · 2 falharam **com sinal** · **4 receberam silêncio
total** — zero `render_jobs`, zero `videos`, zero `generation_stage_error`,
zero `cinematic_dispatch_result`.

Três das quatro têm a MESMA impressão digital:

| pessoa | apertou | último sinal | distância |
|---|---|---|---|
| `telemachusoben…` (TAAFT, a do pedido) | 04 11:28:20 | `render_wait_abandoned` 11:28:21 | **1 s** |
| `fernandadesuar…` | 04 23:11:24 | `render_wait_abandoned` 23:11:28 | **4 s** |
| `gelecekdosyasi…` | 05 10:49:38 | `generation_stage_reached:options` 10:49:39 | **1 s** |

**Ninguém desiste em 1 segundo.** Isso não é uma pessoa fechando a tela, é a
aba indo embora com o pedido dentro dela.

#### 2. A resposta ao pedido do Codex (11:47) — e ela é um "não existe"

O pedido pede: *"localizar o estágio servidor que ocorreu depois de
`video_generation_started`"*. Fui procurar e a resposta honesta é que
**não existe estágio servidor nenhum para localizar**. Todo o rastro entre o
clique e o primeiro erro é evento de CLIENTE. As duas rotas de despacho não
emitiam **um único** evento na entrada. Consequência prática: hoje é
**impossível distinguir** "o POST nunca saiu do navegador" de "o POST chegou e
morreu aqui dentro" — os dois deixam exatamente o mesmo silêncio. Não é que a
investigação fosse difícil; é que o dado não foi criado.

#### 3. O que mudou (arquivos)

`app/api/generate-video-fast/route.ts` e
`app/api/generate-video-cinematic/route.ts` passam a emitir
`generation_dispatch_received` na entrada, **antes de qualquer trabalho caro**
e antes do claim. Fire-and-forget (`void`, o mesmo padrão do
`recordFastFailure` que já morava no arquivo): telemetria não pode atrasar nem
derrubar o render que ela veio medir. Leva `user_id`, `path`, `engine`,
`prompt_length` (**só o tamanho, nunca o texto**) e `requested_duration`; o
cinematic leva também o `generation_id`, para casar com o
`cinematic_dispatch_result` do MESMO despacho.

Nenhuma linha de lógica de geração foi tocada — nem planner, nem escolha de
motor, nem prompt de cena, nem régua de palavras/segundo. Nada de tela, preço
ou oferta.

#### 4. Testes

`scripts/test-dispatch-entry-2026-09-05.mjs` — **24/24 verde**, lendo os
arquivos reais. **Falsifiquei antes de acreditar:** apagar o evento reprova
(8 checks vermelhos) e trocar `void` por `await` reprova o check 2. Os dois
mutantes foram revertidos e o verde refeito.

Honestidade sobre a 1ª versão do guardião: o meu check 8 reprovou **código
correto** — ele comparava a posição do evento com a primeira *menção* de um
marco caro no arquivo, e essas menções são definições de helper que moram
antes. Ordem de execução mede-se a partir do `POST`; corrigi a verificação, não
o código. **Guardião verde ≠ suíte integral verde**: rodei este guardião e o
`tsc`, não a bateria inteira.

⚠️ Armadilha reconfirmada, e a culpa foi minha: `npx tsc --noEmit` devolveu
**exit 0 com "This is not the tsc command you are looking for"** — falso verde
clássico. A causa: eu criei a worktree, rodei o `mklink` do `node_modules`
com a saída suprimida e **imprimi "junction ok" sem verificar**. A junção não
existia, não havia TypeScript nenhum para achar, e o "verde" era o vazio. Só
percebi ao pedir o compilador pelo caminho explícito. Criei a junção de
verdade, confirmei com `Test-Path` que o binário existe, e o typecheck que
consta acima é `node node_modules/typescript/bin/tsc --noEmit` rodando sobre
um `node_modules` que responde. **Regra que fica: "junction ok" só se pode
escrever depois de listar o diretório, nunca depois do comando que a cria.**

#### 5. O que o cliente passa a ver

Nada, hoje — e digo isso sem maquiar. Esta é uma peça de diagnóstico, não de
tela. A entrega visível desta rotação foi a #2 (11:54). O que isto compra é a
**próxima** rotação: quando a próxima pessoa sumir em silêncio, o banco vai
dizer se ela chegou até nós.

#### 6. Duas crenças que eu corrigi medindo (não repetir)

1. **`send-stalled-rescue` NÃO está parado.** O comentário no topo do arquivo
   diz "**0 em true**" e descreve a campanha como nunca enviada — isso é
   verdade de **11/08** e envelheceu. Hoje: **329 pessoas** com
   `stalled_rescue_emailed = true`. É o mesmo modo de falha que o próprio
   arquivo registra ("comentário com justificativa envelhece e vira bug").
2. **Ela também não precisa de clique.** O cron `/api/cron/send-stalled-rescue`
   está registrado no `vercel.json` (`30 16 * * *`) e o wrapper põe
   `confirm=SEND` sozinho. Cheguei a montar um link de um clique para ti —
   e joguei fora, porque seria pedir que clicasses no que já é automático.
   **79 pessoas** seguem na coorte (limite 50/dia), e 3 das 4 silenciosas de
   hoje estão nela: recebem hoje às 16:30 UTC sem ninguém fazer nada.

#### 7. Risco

Baixo e reversível. Duas inserções de telemetria fire-and-forget; se
`writeServerEvent` falhar, a promessa é descartada e o render segue igual.
Reverter é apagar dois blocos.

#### 8. Como medir

1. `generation_dispatch_received` deve aparecer para ~100% dos
   `video_generation_started` que não são abandonados na primeira dezena de
   segundos. Se a razão for **menor** que isso, achamos POST que não chega.
2. Pessoa com `video_generation_started` **sem** `generation_dispatch_received`
   = o pedido morreu no navegador → o conserto é de cliente (pista do Codex).
3. Pessoa **com** `generation_dispatch_received` e sem `render_jobs` = o pedido
   chegou e morreu no servidor → conserto meu, e agora com endereço.

#### 9. Placar (marco 03/09 16:00 UTC, externos)

cadastro **61** → filme 1 **38** → filme 2 **10** → filme 3 **4** →
checkout **3** → **pagou 0**. Sem mudança desde a #2 — o que é esperado:
nada da fila está em produção.

#### Checagem zero
`planned:0 && total_posts:0` (despacho vazio, fornecedor nunca chamado):
**0 hoje** em 7 despachos — mas **62 em 14 dias**, e continua sem conserto.
Silêncio total pós-marco: **4 pessoas** (esta entrada). Aba que sai em ≤10 s:
**6 despachos em 14 dias, 4 sem filme (67%)** contra **27%** de quem fica —
direção real, **volume pequeno**; não inflo isto em epidemia.

#### PRÓXIMA JOGADA
**O despacho vazio, com a régua que já provou funcionar.** 62 ocorrências em 14
dias, e o caso vivo do `claude-chat` mostra o mecanismo: 3 tentativas seguidas
com `planned:0` num alvo de 60 s, e a 4ª só funcionou porque o
`script_duration_autofit_down` baixou para 35 s — **mesmo roteiro**. O autofit
precisa rodar na **1ª** tentativa, não na 4ª; e enquanto não roda, a tela não
pode dizer "our video provider did not accept the job" sobre um fornecedor que
**nunca foi chamado** (`total_posts:0`). É a maior fila de gente que tentou
fazer filme e não fez.

---

### #3 — 12:38→13:45 BRT — 40% dos leads que chegam ao checkout NUNCA viram um filme, e o e-mail de resgate pergunta a eles o que travou no pagamento

Rotação #3 (aberta 12:38). Jogada escolhida **fora do cardápio na letra, dentro
dele no espírito**: o cardápio previa J4 (e-mail de checkout sem pagamento) —
mas J4 **já existe e está armado** (`app/api/cron/send-recovery`, a cada 2h,
disparando: 13 dos 15 leads das últimas 48h já receberam, em 30-60 min). Não
refiz. Fui ver **o que esse e-mail diz**, e é aí que estava o defeito.

#### 1. O que estava errado (medido)

`checkout_abandoned`, últimas 48h, **15 linhas**. **SEIS delas — 40% — são de
gente com ZERO filme concluído e os 25 créditos do trial INTACTOS.** Não são
compradores que travaram no cartão. São pessoas que nunca viram o produto
funcionar uma única vez.

A mecânica, rastreada evento a evento (conta `garrrrrgamel…`, 04/09):

| hora | evento | o que diz |
|---|---|---|
| 15:16:53.0 | `auth_callback_completed` | `destination_path=/api/stripe/checkout` |
| 15:16:53.4 | `trial_credits_granted` | 25 créditos |
| 15:16:54.5 | `checkout_attempted` | `tier=pro` |
| 15:16:55.6 | `checkout_started` | `videos_ok=0`, `credits_intact=true` |
| +24h | `checkout_session_expired` | unpaid, $23,20 |

**A vida inteira dessa pessoa dentro da Kineo dura 2,6 segundos.** Ela clicou um
plano deslogada, o callback a empurrou direto para uma página da Stripe de
$23,20, e ela nunca soube que tinha acabado de ganhar 25 créditos. Pós-marco,
**3 de 3** contas entraram por esse caminho (`is_checkout_destination=true`):
0 filmes, 0 pagamentos, nenhuma volta. É a coorte de **maior intenção de compra
do funil inteiro** — a única que apertou um plano — e converte **0%**.

Isto NÃO reabre a conclusão fechada do fundador ("o vazamento do checkout é
preço"). Aquela é sobre quem chega na página de pagamento e acha caro. Esta é
sobre quem chega lá **sem nunca ter visto o produto** — o próprio fundador já
nomeou como defeito em 02/09 ("checkout de conta sem vídeo = defeito, não
desejo"). Eu só achei o mecanismo e a hora.

**E o que o e-mail de resgate dizia a essas pessoas:** abre com *"did something
get in the way? A payment issue, a question about the plans?"* e a primeira bala
é *"We accept card, Link, Google Pay and Apple Pay"*. O saldo real aparecia —
como **terceira bala de quatro**, depois do PayPal — e não havia **um único
link para criar um vídeo** no e-mail inteiro.

#### 2. O que mudou (arquivos, SHA `59c8666e`)

`app/api/cron/send-recovery/route.ts` ganha um **segundo ramo**, e só para quem
a rota PROVA estar nesse caso: **0 filmes concluídos E saldo que compra um
filme**. Esse ramo lidera com o que é verdade — o crédito já está na conta, não
precisa de cartão — e leva UM link para o primeiro filme.

A **porta do plano e o PayPal continuam no corpo** (regra K1 do ciclo: ninguém
precisa de filme para comprar); só deixam de ser a manchete.

**Falha aberta por desenho:** saldo desconhecido, contagem de filmes
desconhecida (erro de query) ou **qualquer** filme concluído = a copy de hoje,
byte a byte. A contagem é exata por pessoa (`count:'exact'` + `head` + `eq`),
**nunca `.in()` sobre a coorte**: o truncamento silencioso de 1000 linhas do
PostgREST (dívida nº 3 da auditoria de 28/08) derruba linhas, e derrubar linha
aqui transformaria "tem filme" em "não tem filme" — a única direção que manda a
copy errada.

Nada de preço, plano, oferta, desconto ou promessa nova. **Nenhum crédito é
concedido.** O piso de 5cr é **importado** de `lib/lifecycle/videoReadyFooter`,
não digitado: se o Kineo 1 mudar de preço, esta rota muda junto.

#### 3. O que o cliente passa a receber

O texto que sai para a coorte de 0 filmes (renderizado do código real):

> **Your 25 credits are still here - make the film first**
>
> You got as far as the Studio checkout, but your account hasn't made a video
> yet - so you'd be paying for something you have never seen. Let's do that in
> the right order. You already have 25 credits in your account, and that is
> enough for your first film. No card needed: …/studio/create
>
> It takes about 3 minutes… If you would rather just finish what you started,
> the plan is still waiting: …/pricing · PayPal …

Isto **sai sozinho** assim que o commit estiver em produção — `send-recovery` é
cron já armado, não é rota nova. Não precisa de clique de SEND.

#### 4. Testes

`scripts/test-recovery-first-film-2026-09-05.mjs` — **50/50 verde**, lendo o
arquivo real. **Falsificado com 3 mutantes:** condição frouxa (`films !== null`)
→ reprova 2 checks; link do plano removido → reprova 2; contagem trocada por
`.in()` truncável → reprova 1. Os três revertidos e o verde refeito.
`tsc --noEmit` limpo — e desta vez o exit code foi lido **sem pipe** (a primeira
rodada tinha um erro real de tipo do cliente Supabase que o `| tail` escondia
atrás de um `EXIT=0` mentiroso; corrigido para `SupabaseClient`, o mesmo tipo
que `loadLifecycleSuppression` já usa). Junção do `node_modules` conferida com
`Test-Path` ANTES, conforme a regra da rotação passada.
**Guardião verde ≠ suíte integral verde**: rodei este guardião e o `tsc`.

#### 5. Risco

Baixo e reversível. Um ramo novo dentro de um job existente, com guarda dupla
(saldo conhecido + contagem exata) e falha aberta para a copy de hoje. Todos os
guarda-corpos do job seguem provados pelo guardião: `CRON_SECRET` fail-closed,
gate de ciclo de vida, supressão cruzada de 4h, carimbo vitalício (1 e-mail por
pessoa para sempre), teto de 25 por execução, contas de teste puladas.

#### 6. Como medir

1. `sent_first_film` no payload do cron (novo) e `branch=first_film` no log.
2. `utm_campaign=checkout_recovery_first_film` nos dois links → cliques.
3. O que importa: dessas pessoas, quantas fazem o **primeiro filme** em 72h, e
   quantas voltam ao checkout depois. Hoje a taxa é 0 de 6.

#### 7. Placar (marco 03/09 16:00 UTC, externos)

cadastro **63** → filme 1 **40** → filme 2 **11** → filme 3 **4** →
checkout **3** → **pagou 0**. (+2 cadastros, +2 filme 1, +1 filme 2 desde a #2.)
Leads de checkout pós-marco: **3**, sendo **2 sem nenhum filme e com saldo** —
os destinatários exatos do ramo novo.

**Número que muda a leitura do 1→2:** das 30 pessoas com exatamente 1 filme,
**29 têm crédito para outro** (saldo médio 15). O muro entre o filme 1 e o 2
**não é crédito** — é volta. Isso **despriorizou o J3** (crédito no clique do
episódio 3) para mim: dar crédito a quem já tem não move nada.

#### Checagem zero
`cadastro sem crédito` 1 em 24h → **falso positivo verificado**: recebeu o
grant, fez 2 filmes, gastou os 25. `lead quente sem e-mail há +3h` 1 → é conta
**paga** (pulo legítimo e reversível). `next_episode_failed` depois do #0 entrar
em produção (13:25 UTC): **0** — a porta do episódio 2 está de pé.
**`despacho vazio` (planned:0 && total_posts:0): 11 nas últimas 24h** — subiu, e
segue sem conserto.

#### PRÓXIMA JOGADA
**Duas, e a primeira é a que eu não fiz aqui de propósito.**

1. **A porta de entrada da maior intenção do funil.** O conserto de hoje resgata
   quem já foi. O que ainda está de pé é o caminho: `auth/callback` manda o
   recém-cadastrado direto para a Stripe **1 segundo depois** de conceder 25
   créditos, sem que ele saiba que os tem. A K1 proíbe pôr um muro antes da
   compra — mas não proíbe que a **página de cancelamento** (`cancel_url`, que
   hoje é `/checkout/cancelled`, uma tela de preço) saiba que essa pessoa tem
   crédito intacto e nenhum filme. É PEDIDO ao Codex (tela) + `cancel_url` meu.
2. **O despacho vazio, 11 em 24h.** Continua sendo a maior fila de gente que
   apertou gerar e não recebeu filme, e a tela ainda culpa um fornecedor que
   `total_posts:0` prova que nunca foi chamado.

---

### ✅ O QUE VOCÊ PRECISA FAZER
1. **Clique em SUBIR-SITE.bat** (raiz do C:\kineo). A fila está em **5 commits**
   e o de hoje muda um e-mail que sai sozinho a cada 2 horas — enquanto não
   subir, os leads de checkout continuam recebendo a pergunta errada.
2. **Nada mais.** Este e-mail não precisa de `?confirm=SEND`: `send-recovery` já
   é cron armado. Nenhum crédito é dado, nenhum preço muda.

### 📋 O QUE ACONTECEU
Fui atrás do e-mail que a casa manda para quem chega na página de pagamento e
não paga — e descobri que **40% dessas pessoas nunca fizeram um vídeo**. Elas
clicam um plano na página de preços, criam a conta, e o produto as joga numa
tela da Stripe de $23,20 **2,6 segundos depois** — sem nunca dizer que acabaram
de ganhar 25 créditos e sem nunca mostrar um filme. Todas as 3 que entraram por
esse caminho desde o marco foram embora e não voltaram. E o e-mail que ia atrás
delas perguntava "foi problema com o cartão?" e listava formas de pagamento.
Agora, para quem tem crédito na mão e nenhum filme, o e-mail diz a verdade:
*seus 25 créditos estão aqui, faça o filme primeiro, não precisa de cartão* — com
um link direto para criar. Quem já fez filme continua recebendo exatamente o
e-mail de hoje. O link do plano continua no corpo: ninguém é impedido de comprar.
De quebra, um número que muda a estratégia: **29 das 30 pessoas que fizeram só
um filme têm crédito para outro**. O que falta entre o 1º e o 2º filme não é
crédito — é motivo para voltar.

---

### checkpoint da #3 — 13:25 BRT — a porta do episódio 2 foi provada em produção pela PRIMEIRA VEZ com denominador; e o gargalo mudou de lugar: 15 viram, 2 apertaram

Checkpoint, não rotação nova: a #3 fechou às 12:56 com o código entregue e o
diário escrito. Vim conferir o que ela deixou por conferir, e uma das duas
conferências mudou a prioridade da próxima jogada.

#### 1. O guardião da correção CRLF: VERDE na ponta da fila

A correção `fd7bb83e` foi enfileirada às 12:56 e **não tinha sido reconferida
no checkout limpo** — que é exatamente onde o falso vermelho nasce. Rodei
`scripts/test-recovery-first-film-2026-09-05.mjs` numa worktree nova de
`entrega-atual` (`C:/kineo-wt/chk3`, junção de `node_modules` conferida **antes**,
porque sem ela o `tsc` mente com exit 0): **50 ok, 0 fail**. A correção está
provada onde importa, não só na máquina onde foi escrita.

#### 2. O #0 tinha "0 falhas" — mas ninguém tinha olhado o denominador

A #3 registrou `next_episode_failed = 0` depois do deploy e tratou isso como
prova. **Não era ainda.** Zero falhas sem saber quantas chamadas houve é o
mesmo erro que o #15 da sprint passada apontou — a casa contando aparições sem
contar tentativas. Medi os dois lados, com o corte no deploy do `2ca9a06c`
(13:20 UTC):

| janela | `next_episode_requested` | `ready` | `failed` | sucesso |
|---|---|---|---|---|
| **antes** do deploy | 18 | 5 | **13** | **28%** |
| **depois** do deploy | 2 | 2 | **0** | **100%** |

Agora sim é prova — com a ressalva honesta de tamanho: **2 chamadas é amostra
pequena**, não significância. O que se pode afirmar é que 13 de 18 falhavam e
nenhuma falhou desde então, em ~3h de tráfego real. As 13 falhas das últimas
24h são **todas anteriores** ao deploy (a última às 13:15 UTC, 5 minutos antes).
Quem ler o alerta `next_episode_failed = 13` sem cortar pelo deploy vai
reabrir um defeito que já está fechado.

#### 3. O número que muda a próxima jogada: a porta é VISTA e não é APERTADA

Na mesma janela pós-deploy: **`series_continue_seen` = 15** e
**`next_episode_requested` = 2**. Razão **13%**. O checkpoint da #1 mediu
**5/11 = 45%** algumas horas antes, com um terço do denominador.

Ou seja: a rota que a #0 consertou entrega 100% do que lhe pedem — mas
**13 em cada 15 pessoas que veem o cartão não o apertam**. O vazamento grande
não está mais atrás do clique; está no cartão. E cartão é **tela**, pista do
Codex. Não inventei causa para a alta das impressões (1,8/h → 5,5/h): pode ser
horário, e o #0 não mexe em impressão. Registrado como observação, não como
explicação.

#### 4. Placar (marco 03/09 16:00 UTC, externos)

cadastro **63** → filme 1 **40** → filme 2 **12** → filme 3 **4** →
checkout **3** → **pagou 0**. (**filme 2: 11 → 12** desde a #3.)

#### 5. Checagem zero

`cadastro sem crédito` **0** · `render preso` **0** · `next_episode_failed`
pós-deploy **0** · **`despacho vazio` (planned:0 && total_posts:0): 11 em 24h —
igual à #3, sem conserto, e é a maior fila de gente que apertou gerar e não
recebeu filme.**

#### PRÓXIMA JOGADA (para o disparo das 13:38)

A #3 propôs o `cancel_url` do checkout. O dado desta hora **despriorizou isso**:
o checkout tem 3 pessoas pós-marco; a porta do episódio 2 tem **15 impressões em
3 horas** e perde 13 delas. Mas o cartão é do Codex — então a minha metade é a
que sobrou por último e não saiu do lugar em duas rotações: **o despacho vazio,
11 em 24h**, onde a pessoa aperta gerar, não recebe filme, e a tela culpa um
fornecedor que `total_posts:0` prova que nunca foi chamado.

---

### ✅ O QUE VOCÊ PRECISA FAZER
1. **Clique em SUBIR-SITE.bat** (raiz do `C:\kineo`). A fila está em **8 commits**
   e nada dela está em produção — inclusive o e-mail da #3, que sai sozinho a
   cada 2h assim que subir.
2. **Nada mais.** Nenhum crédito foi dado, nenhum preço mudou, nenhum e-mail
   novo precisa de `?confirm=SEND`.

### 📋 O QUE ACONTECEU
Não abri frente nova: fui conferir o que a rotação anterior deixou no ar, e valeu
a pena. Primeiro, o teste da entrega das 12:51 estava verde só na máquina onde
nasceu — rodei num checkout limpo e ele passou de verdade (50 de 50). Segundo, e
mais importante: o conserto da manhã (o cartão "Episode 2", que estava morto para
9 em 10 pessoas) **foi provado funcionando em produção pela primeira vez** —
antes, 13 de 18 pedidos falhavam; depois, nenhum falhou. É pouca gente ainda
(2 pedidos), então não é para comemorar como estatística, mas a direção é clara.
E aí apareceu o número que muda o plano: **15 pessoas viram o cartão do episódio 2
nas últimas 3 horas e só 2 apertaram**. Consertamos o que acontecia depois do
clique — e agora o buraco é o clique. Esse cartão é tela, então é do Codex: deixei
o pedido com o número. Do meu lado, o que continua sangrando há duas rotações é
gente que aperta "gerar" e não recebe filme nenhum (11 casos em 24h).
