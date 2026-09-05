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

---

### #4 — 13:38→14:50 BRT — o e-mail "seu vídeo não saiu" chega, na mediana, 25 DIAS depois: a campanha certa no relógio errado

Rotação #4 (aberta no disparo de 13:38). **Hipótese registrada na abertura:** a
#3 e o checkpoint dela deixaram como próxima jogada "o despacho vazio, 11 em
24h, a maior fila de gente que aperta gerar e não recebe filme". Fui verificar
antes de codar. **A hipótese caiu, e duas outras caíram junto** — o que mudou
completamente o que esta rotação entregou.

#### 1. As três coisas que eu ia consertar e NÃO precisavam de conserto

**(a) O "despacho vazio, 11 em 24h" é uma janela CONGELADA, não uma sangria.**
As 11 ocorrências existem, mas **todas** nasceram numa rajada de 1h15 ontem
(04/09, 20:27→21:42 UTC). O último despacho vazio da casa foi há **19,2 horas**.
E **6 das 11 não têm `user_id`** (`claim_action=unknown`) — são o ramo de 401 que
o próprio CLAUDE.md registra como observação não-bloqueante, não gente esperando
filme. Pessoas reais atrás dos 11: **duas**. O número "11 em 24h" não subiu entre
a #2 e a #3: é a MESMA rajada passeando dentro de uma janela móvel, e vai virar
0 sozinho hoje à noite. Duas rotações o chamaram de "a maior fila"; não é.

**(b) J3 do cardápio (crédito garantido no 3º filme) resolveria um problema que
não existe.** Medido, coorte pós-marco, saldo por degrau:

| filmes | pessoas | com >=5cr (compra um Kineo 1) | saldo médio |
|---|---|---|---|
| 0 | 23 | **19** | 21 |
| 1 | 28 | **27** | 15 |
| 2 | 8 | **7** | 10 |
| 3 | 2 | 2 | 44 |
| 4 | 2 | 0 | 1 |

Crédito só é muro no **4º** filme, onde há 2 pessoas. Dar crédito no clique do
episódio 3 seria dar crédito a quem já tem crédito na mão. **J3 fica
despriorizado até o degrau 4 ter gente.**

**(c) A ordenação da campanha de resgate não é o defeito** — e essa era a
suspeita óbvia. Volto a ela no item 3.

#### 2. O buraco que eu achei que tinha achado — e que não era buraco

Rastreando as 23 pessoas pós-marco com ZERO filmes: 14 chegaram na tela de
gerar, 5 apertaram gerar, e **4 delas não deixaram nenhum rastro depois de
`generation_stage_reached: generating`** — sem despacho, sem erro, sem linha em
`videos`. Silêncio absoluto. Uma delas é de **hoje, 10:49 UTC**.

Aí a hipótese que parecia matadora: `send-activation-nudge` **carimba
`LIFECYCLE_SKIP_STAMP` de propósito em quem apertou gerar** (route.ts:126-141,
KINEO-NUDGE-WRONG-EMAIL-2026-08-13) e `send-failure-recovery` só alcança quem
tem mensagem de defeito explícita — e essas 4 não têm evento de erro nenhum.
Conferido no banco: as 5 estão com `activation_nudge_sent_at = 1970-01-01` (o
sentinela), 25 créditos intactos, `email_opted_out=false`. Parecia que a casa
tinha marcado como "ativado" quem nunca viu um filme, e ninguém falava com elas.

**Falso.** O hand-off funciona. `send-stalled-rescue` existe exatamente para essa
coorte ("started but not completed"), tem cron em rampa desde 13/08, e no banco:
**354 pessoas já receberam**, 175 nos últimos 7 dias, último envio **hoje às
16:30:51 UTC** — e **4 das 5** já receberam. Não construí cron redundante. Fica
registrado para quem vier: **essa porta existe e está aberta.**

#### 3. O número que doía, e que é o que esta rotação consertou

Se o e-mail certo sai sozinho, **quando** ele chega? Medido sobre os **302
envios dos últimos 14 dias**:

| medida | valor |
|---|---|
| mediana entre a pessoa apertar gerar e receber o e-mail que fala disso | **597 horas — 24,9 DIAS** |
| chegaram em menos de 2 horas | **3 de 302** |
| lote de hoje (25 pessoas, 16:30 UTC): mediana / máximo | **19,2 dias / 26,7 dias** |
| desfecho dos 302 | **1 filme, 0 pagamentos** |

E a ordenação **não** é a causa — provei antes de mexer. No lote de hoje, as 5
pessoas com evento de início nas últimas 48h eram **exatamente** as 5 com trial
vivo, e a prioridade por relógio as pôs na frente (a mais rápida recebeu em
2,4h). Reordenar não mudaria um único envio.

A causa é o **relógio da rampa**: um lote por dia, 16:30 UTC. Quem quebra às
17:00 espera **23,5 horas** pelo único e-mail da casa escrito para ela. E a lei
medida deste produto (plano, §1) é que a intenção morre em ~30 minutos.

#### 4. O que mudou (SHA `01b0cbe6`, na fila como `f93668b5`)

- **`app/api/admin/send-stalled-rescue/route.ts`** — `distinctUserIdsForEvents`
  passa a devolver `latestAt`: a campanha sabia QUEM começou e nunca QUANDO. E a
  paginação ganha `ORDER BY (created_at, id)` — `.range()` sem ordenação é o
  defeito que o CLAUDE.md registra no broll-gc. Parâmetro **opcional**
  `fresh_hours=N` restringe a coorte a quem tem o último início dentro de N
  horas; **ausente = byte a byte o comportamento de hoje**. `fresh_hours` entra
  nos payloads de DRY_RUN e de SENT ao lado da coorte total (senão uma faixa de
  2 pessoas pareceria a coorte inteira encolhendo).
- **`app/api/cron/send-stalled-rescue-fresh/route.ts` (novo)** — segunda passada
  de hora em hora, janela de 48h, teto de 5 por execução, chamando o **MESMO
  GET** da rota admin (zero duplicação, como o wrapper diário já fazia).
- **`vercel.json`** — entrada horária, caminho **sem query string**: a armadilha
  que o próprio docblock da rampa documenta como falha SILENCIOSA.

**Nenhuma copy nova, nenhuma promessa, nenhum preço.** É o mesmo e-mail revisado,
o mesmo `SUBJECT`, os mesmos filtros — só que hoje, não em 19 dias.

#### 5. O que o cliente passa a receber

A pessoa que apertar gerar e não receber filme recebe, **dentro de 1 hora**, o
e-mail "That video you started never came out — let's fix it" — em vez de 19 a
26 dias depois, quando já esqueceu que existiu uma Kineo. **Depois que o
fundador armar** (item 2 da lista de ações): a rota **nasce desarmada de
propósito**, pela regra do ciclo (rota nova nasce dry-run, o SEND é dele).

#### 6. Por que isso não vira e-mail repetido nem enxurrada

Pelo invariante que já sustentava a rampa e continua byte a byte:
`stalled_rescue_emailed` é boolean e a coorte filtra `.eq(FLAG_COLUMN, false)` —
**1 e-mail por pessoa, para sempre**. Quem a faixa rápida atender não aparece no
lote das 16:30. Volume: a coorte fresca é minúscula por construção — medida
hoje, **2 pessoas** com início nas últimas 48h em toda a fila (fila total
restante: **53**, drena em ~2 dias). O teto por execução é trava para o dia de
um apagão de fornecedor.

#### 7. Testes — e a distinção honesta

`scripts/test-stalled-frescor-2026-09-05.mjs`: **62 verificações, 62 ok**, lendo
os arquivos REAIS (rota admin, os dois crons, o `vercel.json`). **Falsificado com
14 mutações aplicadas de verdade nos arquivos** — 14 de 14 derrubam o guardião.

Uma delas merece registro porque quase passou: a 1ª versão do check do
invariante usava um regex solto de `.eq(FLAG_COLUMN, false)` e **sobreviveu à
remoção da linha real** — porque o comentário que eu mesmo escrevi na rota cita
a chamada, e o regex casava com o comentário. Um guardião que lê a própria
documentação como se fosse código não guarda nada. Agora o check está ancorado
na linha inteira.

Reconferido no **checkout limpo da ponta da fila** (`C:/kineo-wt/chk4`, junção de
`node_modules` antes): **62 ok, 0 fail** — é onde o falso vermelho por CRLF
nasce, e não nasceu. `npx tsc --noEmit` exit 0.

Vizinhos: `test-cobertura-supressao-2026-09-04` **57 ok / 0 falha**,
`test-lifecycle-suppression-ledger` **29/29**, `test-cron-dryrun-eterno` **28 ok**,
`test-failure-recovery-honest` **40 ok**. **Isto é a bateria de vizinhos, NÃO a
suíte integral.**
ATENÇÃO: `test-failure-recovery-latest-wins` está **VERMELHO** (SyntaxError ao
montar `new Function` do trecho extraído). **Já estava vermelho na base limpa** e
não é desta entrega: ele lê `cron/send-failure-recovery`, que meu diff não toca
(o diff são 4 arquivos: rota admin, cron novo, guardião, vercel.json).

#### 8. Risco

Baixo e reversível em uma linha. Sem a env, nada muda para ninguém. Com a env, o
que muda é **quando** um e-mail que já sai sozinho sai. O risco real é a rota
desarmada dormir sem ninguém notar — por isso o modo desarmado é **barulhento**
(`mode:'DISARMED'`, `would_send` preenchido, `console.warn`): o CLAUDE.md
registra dois crons que dormiram 30 dias devolvendo 200 OK em silêncio.

#### 9. Como medir

Repetir a consulta do item 3 daqui a 48h com o corte no dia em que a env for
armada: a mediana das pessoas **frescas** deve cair de dias para horas, e o
denominador certo é `stalled_rescue_sent_at` menos o último evento de início,
nunca "quantos e-mails saíram".

#### 10. Placar (marco 03/09 16:00 UTC, externos)

cadastro **63** → filme 1 **40** → filme 2 **12** → filme 3 **4** →
checkout **3** → **pagou 0**. Sem mudança desde o checkpoint da #3 — esperado:
**nada da fila está em produção** (agora 9 commits).

#### 11. Checagem zero — ELA ACUSOU, e por isso ela é a próxima rotação

`render preso` **0** · `next_episode_failed` pós-deploy **0** · `despacho vazio`
**11 em 24h, mas o último há 19,2h e 6 sem pessoa** (item 1a) ·
**`cadastro sem crédito`: 6 contas, e 4 são DEFEITO.**

As 4 (`0327ed78`, `42a7e7c1`, `c8918db4`, `d94efa45`, todas de 04/09, três delas
em 6 minutos) têm `video_credits = 0`, `trial_credits_used = 0`,
`trial_status = null`, **zero** `trial_credits_granted` e **zero**
`auth_callback_completed`. Todas têm `email_signup_completed`.

Isso importa porque o conserto do trial órfão de 28/08 (`a1fed16`) moveu a
concessão para `app/auth/callback/route.ts` justamente por ser "o único ponto
servidor que TODA conta nova cruza". **Estas quatro não cruzaram.** O caminho de
cadastro por **e-mail** parece não passar pelo callback — e quem entra por ele
nasce com 0 créditos e não tem como fazer um único filme. As outras 2 do total
de 6 gastaram tudo legitimamente (1 e 2 filmes) e não são defeito.

#### PRÓXIMA JOGADA (para a próxima rotação)

**As 4 contas que nasceram com 0 créditos em 04/09** — pela regra do ciclo,
checagem zero que acusa vira a rotação seguinte, e esta já tem endereço: provar
se `email_signup_completed` sem `auth_callback_completed` é um caminho de
cadastro que escapa da concessão, e fechar no servidor. É o degrau ZERO do
funil: quem nasce sem crédito não chega a ser medido em nenhum dos outros.

#### Pedidos novos ao Codex
Nenhum. Esta rotação foi inteira de servidor.

---

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Clique em SUBIR-SITE.bat** (raiz do `C:\kineo`). A fila está em **9
   commits** e **nada dela está em produção** — inclusive o conserto do
   auto-start da #2, que hoje pula o primeiro filme de 10 pessoas por rotular o
   roteiro da própria home como "colagem de chatbot".
2. **Depois do deploy, crie a variável de ambiente na Vercel:**
   `KINEO_STALLED_FRESH_ENABLED` = `true` (Production). É o interruptor único da
   faixa rápida. Sem ela a rota roda, mede e **não manda e-mail nenhum** —
   aparece no log como `DISARMED` com `would_send`.
3. **Nada mais.** Nenhum crédito foi dado, nenhum preço mudou, nenhuma copy nova
   foi escrita, nenhum e-mail novo precisa de `?confirm=SEND`.

### 📋 O QUE ACONTECEU

Fui atrás do que a rotação anterior apontou como a maior sangria e descobri que
não era: os "11 casos em 24h" são uma única rajada de ontem à noite passeando
numa janela móvel, metade deles sem pessoa nenhuma atrás. Derrubei também a
jogada de dar crédito no 3º filme — medi o saldo degrau a degrau e **quase todo
mundo já tem crédito**; crédito só falta no 4º filme, onde há duas pessoas.

O que achei no lugar foi melhor. Existe na casa um e-mail feito exatamente para
quem aperta "gerar" e não recebe filme — e ele funciona, sai sozinho, já foi para
354 pessoas. Só que ele chega, na mediana, **25 dias depois**. Três de 302
chegaram em menos de duas horas. Um e-mail que diz "seu vídeo não saiu, vamos
consertar" chegando quase um mês depois não é resgate, é lembrete de fracasso —
e o resultado bate: 1 filme e 0 pagamentos em 302 envios.

A causa não era a fila (essa parte está certa e provei antes de mexer); era o
relógio: a campanha roda **uma vez por dia**. Então construí uma faixa rápida:
de hora em hora, só para quem quebrou nas últimas 48 horas, no máximo 5 por vez,
usando o mesmo e-mail e os mesmos filtros. Quem quebrar hoje é procurado hoje.
Ela nasce desligada de propósito — você liga com uma variável, item 2 acima.

Por fim, o alarme automático acusou uma coisa que precisa de atenção:
**quatro contas de ontem nasceram com zero créditos**. Todas entraram por
cadastro de e-mail e nenhuma passou pelo ponto do servidor que dá o trial. É o
mesmo defeito de 28/08 reaparecendo por outra porta — e quem nasce sem crédito
não consegue fazer nem o primeiro filme. É a próxima rotação.
---

## checkpoint da #4 — 14:00→14:50 BRT — o alarme que ia comer a próxima rotação já estava consertado havia 27 horas

### 1. O que eu ia fazer, e por que não fiz

O fechamento da #4 apontou a próxima rotação com endereço: **4 contas de 04/09
nasceram com `video_credits = 0` e `trial_status = null`**, todas com
`email_signup_completed` e **sem** `auth_callback_completed`, e a leitura era
"o cadastro por e-mail escapa da concessão do trial — é o mesmo defeito de
28/08 por outra porta". Degrau zero do funil: quem nasce sem crédito não faz um
filme, não chega a checkout nenhum.

Cheguei a construir a rede: `app/api/cron/trial-repair`, de hora em hora,
delegando a concessão à função viva, desarmada por env, com guardião de 37
verificações e 6 mutantes. **Apaguei tudo antes de commitar.** O anti-repetição
achou o conserto já pronto na main:

`292eaba4` — *"sprint-assinaturas #9: o cadastro por E-MAIL E SENHA nascia sem
os 25 creditos"*, de **04/09 às 10:08 BRT (13:08 UTC)**. Ele põe
`maybeActivateReverseTrial()` dentro de `app/api/auth/activation-completed/route.ts`
— a rota de servidor que o cadastro por senha atravessa, espelho exato do
callback do OAuth — com `await`, fingerprint dos headers e o desfecho gravado no
próprio `email_signup_completed`. E o guardião `scripts/test-trial-grant-orfao.mjs`
**já cobre essa porta**: rodei agora, **25 passaram, 0 falharam**, com um bloco
inteiro ("1b) O cadastro por E-MAIL E SENHA tambem concede") escrito para ela.

### 2. A prova de que está consertado EM PRODUÇÃO, com corte no deploy

`email_signup_completed`, 10 dias, cortado no commit:

| fase | cadastros por e-mail | sem o campo `trial_activated` | concedeu ALI | já tinha |
|---|---|---|---|---|
| antes de `292eaba4` | 39 | **39** | 0 | 0 |
| depois | 3 | 0 | **2** | 1 (`lost_race`) |

Ou seja: dos 3 cadastros por senha depois do deploy, **2 receberam os 25
créditos nesta rota** — sem ela dependeriam do `fetch` do navegador, que é
exatamente o que falhou nas 4 vítimas — e 1 chegou com o crédito já dado (o
cliente ganhou a corrida; caso saudável).

E o desfecho no banco, por dia (359 cadastros externos em 14 dias):

`22/08` 0 · `23/08` 1 · `26/08` 1 · `01/09` 1 · **`04/09` 4** · **`05/09` 0 em 18**.

**As 4 são de 04/09 04:58 e 11:03–11:09 UTC — todas ANTERIORES ao commit das
13:08 UTC.** Não é uma sangria aberta; é uma poça que a janela móvel de 24h/14d
continuava mostrando como se fosse de agora.

### 3. Por que a checagem zero errou, e o que fazer para não errar de novo

É a terceira vez neste ciclo que a mesma armadilha morde (a #4 já tinha
derrubado os "11 despachos vazios em 24h" pelo mesmo motivo): **a checagem zero
não tem corte no deploy do conserto.** Uma janela móvel sobre uma rajada velha
lê defeito morto como defeito vivo, e a regra "checagem zero que acusa vira a
próxima rotação" transforma isso em uma rotação inteira gasta.

Regra para as próximas rotações, e ela é de uma linha:
**antes de escalar qualquer item da checagem zero, procure o commit que
endereça o sintoma (`git log --oneline -- <arquivo provável>`) e recorte a
medição no horário dele.** Se todas as ocorrências forem anteriores, o item é
histórico — anote e siga.

Consulta com o corte, para copiar:
`... and created_at > '2026-09-04 13:08:00+00'` sobre a coorte de
`trial_status is null and video_credits = 0`. Hoje: **0**.

### 4. O que eu NÃO entreguei, e por que isso é a resposta certa

Não subiu cron novo. A causa está fechada na porta certa (uma rota de servidor
que a pessoa atravessa obrigatoriamente), e a rede que eu tinha escrito seria
uma **segunda cópia da regra de trial** — o par de bugs de 05/08 e 07/08 deste
projeto nasceu exatamente assim. Superfície nova para um defeito medido em
0 de 18 no dia seguinte ao conserto é custo sem receita.

### 5. Correção de um fato herdado que ainda está errado no CLAUDE.md

O CLAUDE.md diz que o grant mora em `app/auth/callback/route.ts`, "o único
ponto servidor que TODA conta nova cruza". Isso é verdade **só para OAuth e
link mágico**. Hoje a concessão tem QUATRO portas: callback (OAuth),
`activation-completed` (e-mail+senha, desde 04/09), `track-signup-source`
(fetch do cliente) e a visita a `/studio/create`. Quem for investigar "conta
sem crédito" precisa saber disso — eu perdi tempo lendo a versão do arquivo na
**main local suja** (727a869, reprovada e obsoleta), onde o callback ainda não
concede. Ler arquivo pelo `C:\kineo` sem conferir contra `origin/main` é
armadilha ativa.

### 6. Placar (marco 03/09 16:00 UTC, externos)

cadastro **64** → filme 1 **40** → filme 2 **12** → filme 3 **4** →
checkout **3** → **pagou 0**. Uma linha a mais que o fechamento da #4, resto
idêntico — **a fila continua inteira fora de produção**.

### 7. Checagem zero (com os cortes certos)

`cadastro sem crédito` pós-`292eaba4`: **0** · `render preso`: **0** ·
`next_episode_failed` pós-`2ca9a06c` (corte 13:25 UTC de 05/09): **0** ·
`trial_blocked_fingerprint` em 10 dias: **5, todas de 30-31/08** (guarda
anti-abuso, não defeito). **Nada acusa.**

### PRÓXIMA JOGADA (para a rotação que abrir em seguida)

**J2 do cardápio, sem desvio.** O alarme que desviaria a rotação está morto, e o
número que continua doendo é o mesmo: das pessoas que fazem UM filme, a maioria
não volta, e o e-mail de filme pronto é o único canal de volta. J2 = o e-mail
levar o **Episódio 2 já escrito** (título + link de 1 clique via
`seriesContinuation`), não um convite genérico. É servidor inteiro
(`lib/lifecycle/*`, `app/api/cron/send-video-ready`), é a peça mais eficiente do
produto, e o #1 já preparou o terreno (`credits_source`, o ramo de saldo
desconhecido). **Atenção ao construir:** `lib/lifecycle/videoReadyFooter.ts` foi
tocado pelo #1, que está NA FILA — a worktree tem de nascer de `origin/main` e o
`enfileirar.sh` rebasa por cima; conferir o arquivo depois do rebase.

---

## #5 — 14:39→15:35 BRT — as 4 fontes de e-mail marcam ZERO aterrissagem em 30 dias, e as 7 de dentro do app funcionam

### 1. A jogada era J2. O dado mudou a jogada — e a J2 já estava metade feita

O plano mandava J2: "o e-mail de filme pronto carrega o Episódio 2 já escrito".
O anti-repetição achou metade disso PRONTO na main: os commits `99fe4c99`
(#24) e `f877dafa` (#26) já põem um bloco **"Episode 2: <tema da pessoa>"** no
rodapé do e-mail de vídeo pronto, tanto na rota de status quanto no cron. Não
refiz. Medi — e a medição achou um defeito maior que a J2.

### 2. O número que doía

`series_continuation_landed`, 30 dias, por fonte:

| fonte | aterrissagens | onde vive |
|---|---|---|
| history_video_card | 42 | tela |
| generate_recent_video | 24 | tela |
| history_milestone | 24 | tela |
| done_screen | 22 | tela |
| studio_milestone | 20 | tela |
| render_pill | 8 | tela |
| landing_resume_strip | 7 | tela |
| **video_ready_email** | **0** | e-mail |
| **momentum_email** | **0** | e-mail |
| **lifecycle_loss_email** | **0** | e-mail |
| **lifecycle_ending_email** | **0** | e-mail |

Sete fontes de dentro do app entregam. As quatro de e-mail marcam **zero
linhas** — não "poucas". E o denominador não é pequeno: em 30 dias saíram
**102** `momentum_nudge_sent` (a campanha cujo botão É esse), **65**
`video_ready_email_sent` com rodapé de episódio 2 (**47 pessoas**) e **2.871**
`trial_lifecycle_email_sent`. O botão está no e-mail: os carimbos trazem
`has_topic:true`.

### 3. O que o rastreio achou (curl na URL real, deslogado)

```
/generate?prompt=...&series=1&continuation_source=video_ready_email
  → 307 /studio/create?...    (porteiro do #296, query intacta)
  → 307 /signup?redirect=...  (a página decide signup vs login)
```

A query sobrevive à viagem inteira — **isso está correto e não é o defeito**.
O defeito é o DESTINO: **`/signup`**. A escolha entre entrar e se cadastrar é
feita por `hasPriorSession` — *existe cookie `sb-…auth-token` neste
navegador?* Para um clique vindo do inbox essa resposta é estruturalmente
**não**: o Gmail do telefone abre em webview própria, o link é aberto em outro
aparelho, a aba é anônima. Ou seja: a pessoa que **já tem conta** — o e-mail
foi endereçado a ela, cadastrada, com filme entregue — recebe um formulário de
**CRIAR CONTA**. As sete fontes de dentro do app nunca passam por ali porque
sempre têm sessão viva. É a única diferença entre as fontes que funcionam e as
que marcam zero.

### 4. O que mudou (SHA `9e02dbbb` na fila)

Rota nova `app/api/episode-link` (só servidor) + `lib/seriesContinuation.ts`:

1. **Conta o clique.** Não existia NENHUM evento entre "e-mail enviado" e
   "aterrissou". `episode_link_clicked` grava fonte, se havia sessão, e um
   sinalizador de robô (varredor de e-mail bate em URL de inbox e inflaria a
   conta sem etiqueta).
2. **Manda para a porta certa.** Com sessão → `/studio/create` direto (o
   apelido legado `/generate` e seu 307 saem do caminho). Sem sessão →
   `/login` (ENTRAR), com o destino inteiro no `?redirect`. O middleware já
   honra esse `?redirect` para quem tem sessão (KINEO-CHECKOUT-RESUME).

**Contrato preservado:** sem tema utilizável a URL é byte a byte a de antes
(`/generate` + utm) — nunca inventamos o assunto do vídeo da pessoa (#24). Os
links de dentro do app não passam pela porta. Falha sempre aberta. O destino
passa pelo mesmo guarda do login (`normalizeInternalRedirect`), então não há
redirecionamento aberto.

### 5. O que o cliente passa a ver

Quem recebe "seu filme está pronto" no celular e toca em **Episode 2: <o tema
dela>** cai numa tela de **entrar** com o episódio 2 esperando do outro lado —
não num formulário de criar uma conta que ela já tem.

### 6. Honestidade sobre o que isto ainda NÃO prova

Com o dado de hoje **não dá para separar** "ninguém clica no botão" de "clica e
morre no cadastro" — não havia degrau entre envio e aterrissagem. O conserto
endereça a segunda hipótese e **o contador endereça a pergunta**. Se, publicado,
`episode_link_clicked` subir e a aterrissagem continuar zero, a causa é outra e
o próximo passo é o `/login`, não o link. Se nem o clique aparecer, o problema é
o e-mail (assunto/posição do botão), não a porta. **Isto é o critério de parada.**

### 7. Testes

Guardião novo `scripts/test-porta-episodio-email-2026-09-05.mjs` **40/40**
(roda a função REAL e lê a rota real). `test-serie-episodio-2` **262/262** com
a verificação de contrato atualizada. `npx tsc --noEmit` **0 erros**.
Guardião verde ≠ suíte integral verde: rodei 8 baterias vizinhas e três já
estavam **vermelhas em `origin/main` ANTES desta mudança** — conferido em
worktree limpa do origin/main: `test-video-ready-footer` 44/46,
`test-data-cache-no-store` 17/19, `test-episodio2-ending` 67/68. Não são
minhas e não foram consertadas aqui.

### 8. Placar (marco 03/09 16:00 UTC, externos)

cadastro **65** → filme 1 **42** → filme 2 **12** → filme 3 **4** →
checkout **3** → **pagou 0**. (+1 cadastro e +2 primeiros filmes desde a #4.)
**A fila inteira continua fora de produção** — 12 commits esperando o clique.

### 9. Checagem zero (com os cortes no deploy)

cadastro sem crédito pós-`292eaba4`: **0** · `next_episode_failed`
pós-`2ca9a06c`: **0** · render preso >2h: **0**. **Nada acusa.**

### PRÓXIMA JOGADA

**J3 do cardápio** (3º filme garantido no clique) só depois que a fila subir —
sem publicação, cada rotação nova empilha peça que ninguém usa. Se a fila subir,
a primeira medição é `episode_link_clicked` por `bot=false`: ela decide entre
consertar o `/login` (se clicam e não chegam) ou o e-mail (se não clicam).

---

## #6 — 18:10 BRT — FECHAMENTO DO CICLO: 13 pessoas fizeram 2+ filmes neste ciclo e NENHUMA delas viu a tela de checkout; os 3 checkouts que existiram vieram de gente com 0 e 1 filme

Rotação de fechamento (J8). A janela do ciclo (10:38 → 18:38 BRT) acaba em
28 minutos. Não abro jogada nova: o cardápio manda fechar, e abrir código agora
empilharia peça na fila que já tem 13 commits parados.

### 1. O número que doía, e que só apareceu ao olhar PESSOA A PESSOA

Os placares das rotações #1 a #5 mediram degraus agregados. No fechamento eu
cruzei os degraus por pessoa, e o funil agregado escondia isto:

| pessoa (fonte) | filmes | créditos que sobraram | viu checkout? |
|---|---|---|---|
| zeechimzere (chatgpt) | **4** | 1 | **não** |
| swan425225 (direto, mailshan) | 4 | 1 | não |
| hornbrookkelly (chatgpt) | 3 | 7 | **não** |
| 3fb44a22…@vmail.dev (direto) | 3 | 80 | não |
| + 9 pessoas com 2 filmes | 2 | 0 a 19 | **nenhuma** |
| muhammadalhajisanusi (chatgpt) | 1 | 12 | sim |
| garrrrrgamel (direto) | **0** | 25 intactos | sim |
| medtepsu (direto) | **0** | 25 intactos | sim |

**13 pessoas fizeram 2 ou mais filmes neste ciclo. Zero chegaram ao checkout.**
Os 3 únicos checkouts do ciclo vieram de 1 pessoa com um filme e **2 pessoas
com nenhum filme e os 25 créditos do trial intactos** — o padrão que o
CLAUDE.md já classificou como defeito, não desejo (checkout de conta sem vídeo
é gente batendo numa parede, não gente querendo comprar).

Isto reposiciona o gargalo do ciclo inteiro. As 6 rotações trabalharam o degrau
1→2 (porta do episódio 2, e-mails, links). Esse degrau **melhorou** — 13 de 42
chegam ao segundo filme, contra 12 na #5. Mas o degrau seguinte, 2+ filmes →
checkout, é **0 de 13**. O produto entrega, o crédito acaba (`lirikp` está com
2 filmes e **0 créditos**; zeechimzere com 4 filmes e 1 crédito) e a pessoa não
encontra a porta de comprar. Ninguém trabalhou esse degrau hoje.

### 2. Placar final do ciclo (marco 03/09 16:00 UTC, contas externas)

cadastro **66** → filme 1 **42** → filme 2 **13** → filme 3 **4** →
checkout **3** → **pagou 0**.

Por fonte — a leitura que o fundador pediu ("fonte por fonte"):

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | pagou |
|---|---|---|---|---|---|---|
| **chatgpt** | 34 | 28 (82%) | 10 (29%) | 2 | 1 | 0 |
| **taaft** | 16 | 9 (56%) | **1 (6%)** | 0 | 0 | 0 |
| **(direto)** | 9 | **0** | 0 | 0 | **2** | 0 |
| nav | 3 | 3 | 0 | 0 | 0 | 0 |
| tempmail.so | 2 | 2 | 2 | 2 | 0 | 0 |
| google / partners | 2 | 0 | 0 | 0 | 0 | 0 |

Três fatos que saem daí e que não estavam escritos em lugar nenhum:

- **O ChatGPT é a casa toda.** 34 de 66 cadastros, 28 de 42 primeiros filmes,
  10 de 13 segundos filmes. Toda a atividade do produto vem de uma fonte só.
- **O TAAFT traz gente que não volta.** 16 cadastros, 9 fazem o primeiro filme,
  **1 faz o segundo** (6%, contra 29% do ChatGPT) e nenhum chega ao checkout.
  A listagem do TAAFT está desatualizada desde 01/09 (fala em 40cr e
  "from $9.90/mo"; hoje é 50cr e $7) — quem chega por lá encontra um produto
  diferente do anunciado. É a hipótese mais barata de testar do próximo ciclo.
- **Os 9 cadastros "(direto)" fizeram ZERO filmes e produziram 2 dos 3
  checkouts.** Não é tráfego frio comprando: é gente que entra sem contexto,
  não consegue gerar, e vai bater na página de plano.

### 3. A checagem zero acusou 13 falhas — e o alarme era artefato de medição

A varredura bruta devolveu `next_episode_failed = 13` nas últimas 24h e
`next_episode_requested = 22`. Isso soaria como "o conserto do #0 não pegou".
Não é. Recortando no horário real do commit `2ca9a06c` (05/09 13:25 UTC):

| janela | pedidos | prontos | falhas |
|---|---|---|---|
| **antes** do deploy | 18 | 5 | **13** |
| **depois** do deploy | 4 | **4** | **0** |

**5/18 (28%) antes, 4/4 (100%) depois.** As 13 falhas são todas anteriores ao
deploy; a última é de 13:15 UTC, dez minutos antes do commit. O conserto do #0
está provado em produção com denominador — é a primeira prova real dele.

Registro o método porque esta armadilha já custou duas rotações em ciclos
anteriores: **medição de checagem zero sem corte no horário do deploy mede o
defeito que você acabou de consertar.** Achar o commit vem antes de escalar
o alarme.

Resto da checagem zero, com os cortes certos: cadastro sem crédito **0** ·
render preso >2h **0** · débito sem entrega **0**. Nada acusa.

### 4. O que o ciclo entregou — 6 peças, TODAS ainda fora de produção menos uma

| # | o que consertou | SHA |
|---|---|---|
| #0 | `/api/next-episode` devolvia 502 em 12 de 16 chamadas (modelo responde em prosa, rota descartava) | `2ca9a06c` **← única no ar** |
| #1 | 22 de 26 e-mails "você está sem crédito" foram para gente COM crédito (`null` lido como zero) | `1f3c3f9e` |
| #2 | 36 pessoas tiveram o primeiro filme pulado porque "HOOK:" foi lido como colagem de chatbot | `547a8b87` |
| #3 | e-mail de resgate perguntava "o que travou no pagamento?" a quem nunca viu um filme (40% dos leads) | `fe2dcd01` |
| #4 | e-mail "seu vídeo não saiu" chegava 25 dias depois (mediana 597h) | `f93668b5` |
| #5 | botão de episódio 2 dos e-mails levava quem JÁ TEM CONTA para a tela de criar conta | `9e02dbbb` |

**13 commits na fila, 0 no ar.** O #0 subiu porque foi publicado às 10:25 BRT,
antes de a fila crescer. Tudo de #1 a #5 espera um clique. As melhorias do
degrau 1→2 medidas hoje (13 segundos filmes contra 12) vêm do #0 sozinho —
os outros cinco consertos ainda não tocaram um cliente.

### 5. O que eu NÃO fiz, e por quê

- **J3 (3º filme garantido no clique), J4, J5, J6, J7 do cardápio: não feitos.**
  Decisão registrada na #5 e mantida: sem publicação, cada rotação nova empilha
  peça que ninguém usa. Seis consertos parados valem menos que um no ar.
- **Nenhum e-mail foi enviado.** As rotas de campanha continuam dry-run; o SEND
  é o link do fundador.
- **Nenhum render pago, nenhuma alteração de preço, plano ou oferta.**
- **Nenhum arquivo de tela tocado** (pista do Codex). O pedido aberto da #5
  sobre o aterrissamento do clique de inbox continua na fila de pedidos.

### 6. PRÓXIMA JOGADA (para o ciclo que o fundador decidir abrir)

**Primeira, e antes de qualquer código: publicar.** Depois do clique, a medição
que vale é `episode_link_clicked` por `bot=false` — ela separa "não clicam"
(problema de e-mail) de "clicam e não chegam" (problema de `/login`), e os
cinco consertos passam a existir para o cliente.

**Segunda, e é a jogada nova que este fechamento descobriu: o degrau
2+ filmes → checkout, que é 0 de 13.** Ninguém trabalhou esse degrau em nenhuma
das 6 rotações porque o funil agregado não o mostrava. As três pessoas mais
quentes do ciclo (4, 4 e 3 filmes) terminaram com 1, 1 e 7 créditos e nunca
viram uma página de plano. A peça certa é de servidor e cabe na minha pista:
quando o saldo não cobre mais um filme do motor que a pessoa **acabou de
usar**, a resposta da geração devolve o contrato de "próxima ação" apontando
para o plano — não um banner genérico, e sim "seu próximo filme custa N, você
tem M". É a J5 do cardápio, reapontada do degrau 1→2 para o degrau que os
dados de hoje mostraram estar seco.

**Terceira, barata e não é código:** o TAAFT converte 6% no segundo filme
contra 29% do ChatGPT, e a listagem promete 40cr e $9.90 quando o produto dá
50cr e $7. Corrigir a listagem é edição de dashboard, custo zero.

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Clicar em `SUBIR-SITE.bat`** (raiz de `C:\kineo`). São **13 commits** e
   **5 consertos** parados — nada do que este ciclo fez depois das 10:25 chegou
   a um cliente. É a única ação que transforma o dia em produto.
2. **Conferir, depois do clique**, que o log termina em "SUBIU N ENTREGA(S)" e
   que `git rev-list --count origin/main..entrega-atual` volta a 0.
3. **Atualizar a listagem do TAAFT** no dashboard deles: hoje anuncia trial de
   40cr e "from $9.90/mo"; o real é 50cr e $7. É a fonte que mais perde gente
   entre o 1º e o 2º filme (6% contra 29% do ChatGPT).
4. **Decidir se abre o próximo ciclo** e com qual foco — a recomendação está no
   item 6 acima: publicar primeiro, depois atacar o degrau 2+ filmes → checkout.

### 📋 O QUE ACONTECEU

O ciclo de 8 horas fechou com **6 consertos prontos e 1 no ar**. O que subiu
(#0) já deu resultado medido: a porta do episódio 2 saiu de 28% de sucesso para
**100%** em produção, com denominador e corte no deploy — é a primeira coisa
deste sprint que se pode chamar de provada.

O que o fechamento descobriu, e que muda a prioridade do próximo ciclo: **o
muro não está mais no segundo filme, está na hora de pagar.** Treze pessoas
fizeram dois ou mais filmes hoje e nenhuma delas chegou a ver a página de
plano; várias terminaram com o crédito no fim (uma com 4 filmes e 1 crédito,
outra com 2 filmes e zero). Os três únicos checkouts do dia vieram de gente
que **não conseguiu fazer filme nenhum** — que é sinal de defeito, não de
intenção de compra. O produto está entregando e depois emudecendo exatamente
no momento em que a pessoa mais gostou dele.

E uma leitura de aquisição que não existia escrita: **o ChatGPT é praticamente
a casa inteira** (34 dos 66 cadastros, 28 dos 42 primeiros filmes), enquanto o
TAAFT traz gente que faz um filme e some — provavelmente porque a listagem de
lá ainda anuncia o preço e o trial antigos.

Zero assinantes no ciclo, contra a meta de 2 a 3 por dia. A causa mais provável
não é falta de conserto: é que **cinco dos seis consertos nunca saíram do
computador**.

---

## #7 — 15:39→16:30 BRT — 21 pessoas ficaram sem saldo para repetir o filme que acabaram de fazer, e UMA achou a porta de comprar

**Nota de calendário antes de tudo:** a entrada anterior está rotulada "#6 —
18:10 BRT — FECHAMENTO DO CICLO", mas foi escrita às **15:15** (`git log` do
commit `664a3962`). A janela do ciclo vai até **18:38 BRT** — o fechamento saiu
**três rotações cedo**. O ciclo não acabou; esta é a rotação #7, e ainda cabem
mais duas antes do fecho real. Registro para que a próxima sessão não leia
"FECHAMENTO" e pare com 3 horas de janela na mesa.

### 1. A jogada, e por que foi esta

O cardápio manda J5. O fechamento prematuro, apesar de precoce, acertou o
diagnóstico e nomeou a mesma peça: o degrau **2+ filmes → checkout, que era
0 de 13**. Seis rotações trabalharam o degrau 1→2; ninguém tinha trabalhado o
degrau de pagar. Confirmei com dado próprio antes de codar.

### 2. O número que doía

Marco 03/09 16:00 UTC, contas externas, cruzando **pessoa a pessoa** o saldo
com o preço que ela pagou no último filme:

| | |
|---|---|
| entregaram um filme | **44** |
| ficaram com saldo MENOR que o preço do filme que acabaram de fazer | **21** |
| dessas 21, chegaram ao checkout | **1** |
| das 23 que ainda tinham saldo, chegaram ao checkout | **0** |

E o formato da parede é sempre o mesmo:

- **11 pessoas** estão no ponto idêntico: trial de 25, um Seedance de 15,
  sobram 10 — e o próximo filme do mesmo motor custa 15.
- **3 pessoas** estão a **UM crédito** do próximo filme (pagaram 13, sobrou 12).
- **6 delas já tinham feito 2 ou mais filmes** — ou seja, gente que gostou.

**O que a casa fazia nesse instante: nada.** O saldo mora num canto da tela, o
preço do motor mora no /studio, e ninguém nunca junta os dois números na frente
da pessoa. Ela clica em gerar, o modal de upgrade aparece como **recusa**
(`upgrade_modal_opened` reason=`trial_spent`) e a conversa começa por "não".

### 3. O que mudou (SHA `1b930e9a`, na fila)

`app/api/next-action` — contrato de servidor que responde, **antes** do clique,
com os dois números na mão: `state` (`first_film` / `dry` / `can_continue`),
saldo, quanto custou o último filme, quanto falta, os motores que o saldo
**ainda** paga, e a porta do plano.

Três regras que vieram dos dados, não do gosto:

1. **O preço não é inventado.** "Quanto custa o próximo" é o `credits_used` que
   a pessoa literalmente acabou de pagar, lido do banco. As alternativas usam
   `creditCostForDuration` — a fonte única do cobrador, mesmo `isPaidUser`,
   mesma duração do filme feito. Um guardião compara o `PAID_PLANS` da rota com
   o do `/api/generate-video-cinematic` e fica **vermelho se divergirem**: é a
   trava contra a classe "copy que mente" (achado 4 da auditoria de 28/08).
2. **Regra K1:** a porta do plano não depende de ter filme nem roteiro. Vai em
   todos os estados, inclusive no de saldo desconhecido. Os 2 checkouts do ciclo
   vieram de contas com 0 filmes — trancar essa porta atrás de um render seria
   fechá-la na cara de quem mais a procura.
3. **Leitura pura.** Não concede crédito, não cobra, não envia e-mail, não toca
   preço nem oferta. Um evento e mais nada.

Saldo desconhecido **não** vira saldo zero — a lição da #1 deste mesmo sprint,
que mandou 22 de 26 e-mails "você está sem crédito" para gente **com** crédito.

O rebaixamento de motor **reusa** `buildSeriesContinuationHref`, que já sabia
carregar o `?engine` acessível quando quem chama **prova** que o saldo não
cobre (sprint-retencao #2). Aqui a prova existe, e o parâmetro só viaja no
estado seco.

### 4. O que o cliente passa a receber

Hoje, **nada ainda** — e isto precisa ficar escrito sem maquiagem. A rota
devolve JSON; **a tela é da pista do Codex**. O que existe agora é (a) o
contrato pronto e (b) o denominador: `next_action_served` passa a dar
denominador ao degrau que hoje é 21 → 1 e que ninguém conseguia contar.

### 5. Testes — e um verde falso que eu peguei no meio do caminho

`scripts/test-next-action-2026-09-05.mjs`: **39/39**, lendo os arquivos REAIS
(rota, `engineCost`, `seriesContinuation` e o cobrador). Falsificado por
mutação: divergir o `PAID_PLANS`, mandar o `?engine` sem prova de saldo e tirar
o dedupe deixam o guardião **vermelho**; restaurado, verde.

⚠ **O primeiro `npx tsc` desta rotação deu exit 0 mentindo.** A junção do
`node_modules` não tinha sido criada (o `mklink` falhou em silêncio) e o npx
nem tinha TypeScript — ele "passou" porque não rodou. Depois de montar a
junção: **0 erros**, e uma sonda com erro proposital devolveu 1 erro, provando
que o verde é verde. Guardião verde ≠ suíte integral verde: rodei o meu, não a
bateria inteira.

### 6. Risco

Baixo e reversível: rota nova, `GET`, nenhum caller em produção ainda. Se o
contrato estiver errado, ninguém o vê — o pior caso é um evento a mais no
banco. O único risco de verdade é o espelho do `PAID_PLANS` envelhecer, e é
exatamente isso que o guardião trava.

### 7. Placar (marco 03/09 16:00 UTC, contas externas)

cadastro **67** → filme 1 **43** → filme 2 **13** → filme 3 **4** →
checkout **3** → **pagou 0**

| fonte | cadastro | filme 1 | filme 2 | filme 3 | checkout |
|---|---|---|---|---|---|
| chatgpt | 34 | 29 | 10 | 2 | 1 |
| taaft | 16 | 9 | **1** | 0 | 0 |
| (direto) | 13 | 2 | 2 | 2 | 2 |
| nav | 3 | 3 | 0 | 0 | 0 |
| partners | 1 | 0 | 0 | 0 | 0 |

### 8. Checagem zero — limpa

cadastro sem crédito (24h) **0** · render preso >2h **0** · débito sem entrega
**0** · `next_episode_failed` pós-deploy **0** contra **4** pedidos → o conserto
do #0 segue **4/4 (100%)**.

### PRÓXIMA JOGADA

**O que a rotação seguinte precisa medir é se o `?engine` rebaixado realmente
salva a pessoa seca.** Depois que a fila subir, o SQL é `next_action_served`
com `state='dry'` cruzado com `series_continuation_landed` de
`source='next_action'` → filme entregue em 24h. Se as 21 pessoas do quadro
acima virarem filme com o motor barato, o degrau seco deixa de ser 21 → 1.

**A jogada não-óbvia que este dado abre:** os **11 casos idênticos** (trial 25,
Seedance 15, sobram 10) não são azar — são **aritmética do trial**. O trial dá
25 e o motor mais escolhido custa 15: o segundo filme do mesmo motor é
**impossível por construção**, e três pessoas ficaram a **1 crédito** dele. Não
estou propondo mexer em preço nem em oferta (é decisão do fundador, e limite
deste ciclo): estou registrando que **o número 25 e o número 15 foram
escolhidos em mesas diferentes e nunca foram somados na mesma conta.** Quem
decidir isso deve ver os dois lado a lado.

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Clicar em `SUBIR-SITE.bat`** (raiz de `C:\kineo`). A fila está em **15
   commits** e **6 consertos** parados — nada disso tocou um cliente ainda. É a
   ação de maior alavanca do dia, e é a mesma pendência de 15:15.
2. **Conferir**, depois do clique, que o log termina em "SUBIU N ENTREGA(S)" e
   que `git rev-list --count origin/main..entrega-atual` volta a **0**.
3. **Atualizar a listagem do TAAFT** (dashboard deles): anuncia trial de 40cr e
   "from $9.90/mo"; o real é 50cr e $7. É a fonte que mais perde gente do 1º
   para o 2º filme — 1 em 16 hoje.

### 📋 O QUE ACONTECEU

Descobri, olhando pessoa a pessoa, que **21 das 44 pessoas que fizeram um filme
terminaram sem saldo para fazer outro igual — e só uma delas achou a página de
plano.** Onze estão no ponto exato de "trial de 25, filme de 15, sobram 10", e
três estão a um único crédito do próximo filme. O produto entrega, a pessoa
gosta, o crédito acaba, e a casa fica muda justamente aí.

Construí a peça de servidor que quebra esse silêncio: um contrato que diz, com
os dois números na mão, "seu último filme custou 15, você tem 10", oferece o
motor que o saldo ainda paga e mostra a porta do plano — sem inventar preço
(usa a mesma função que cobra) e sem prometer nada sobre os planos.

A tela é da pista do Codex e já está pedida. E fica um recado de calendário: o
"fechamento" escrito às 15:15 saiu três rotações cedo — o ciclo vai até 18:38.
