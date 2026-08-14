## 14/08 sprint 11h — UM EVENTO PODE EXISTIR, ESTAR CERTO, E MESMO ASSIM SER INVISIVEL

`KINEO-EXAMPLES-PROVA-SEM-PORTA-2026-08-14` (commit `f54a419`).
Rotacao de aquisicao desta sprint: **Funil (melhoria de conversao) + Analytics**.

**REGRA NOVA, e ela e transferivel para toda a base:** um evento gravado sem
`session_id` nao existe para a operacao. `example_video_play` (162 linhas) e
`example_watch_cta_click` (16) estavam no banco desde 21/07, corretos, com
metadata rica — e 100% deles sem sessao, porque os componentes postavam com um
`fetch` cru em `/api/events` em vez de `trackEvent` (o unico caminho que anexa
`session_id` + UTMs de first-touch). Como TODO funil da casa agrupa por sessao,
`/examples/*` apareceu em todos os documentos como "187 sessoes -> 1 video",
quando o que estava la era **82% de play — a maior taxa de engajamento organico
que esta casa tem em qualquer superficie.**

E a regra 3 do PROMPT-DIARIO ("zero sobre nada nao e evidencia de nada") por um
caminho novo: **o denominador estava certo e o numerador estava desconectado
dele.** Antes de chamar uma superficie de morta, conferir a ORFANDADE dos eventos
dela: `count(*) filter (where session_id is null)` sobre o total.

**Corolario que evita o erro simetrico — orfandade NEM SEMPRE e defeito.** A
varredura achou 15 nomes 100% orfaos e a maioria e legitima:
`trial_lifecycle_email_sent`, `trial_credits_granted`, `trial_downgraded`,
`credits_back_sent`, `post_nudge_sent`, `blackout_winback_sent`, `trial_expired`
sao de servidor/cron — nao existe sessao de navegador para anexar e o `user_id`
ja os torna analisaveis. **Orfao so e bug quando o evento nasce de um CLIQUE.**
(`auth_callback_completed`, 407 linhas, e caso de fronteira: roda antes de o
cliente montar. Divida conhecida, nao regressao.)

**Segundo aprendizado, sobre PLANO e nao sobre codigo.** As 10h propuseram levar
a porta as ~45 paginas de artigo de SEO *depois* de medir as duas paginas novas.
A medicao ja estava no banco: 13 paginas tem porta instrumentada ha semanas, e
**toda pagina acima de 10 sessoes converte 0% (8 maiores = 316 sessoes, zero
cliques)**, enquanto as duas que convertem (67% e 41%) sao FERRAMENTAS. Antes de
esperar dado novo, checar se o dado velho ja responde — Regra Zero aplicada a
MEDICAO, nao so a construcao.

**Hipotese concorrente testada e insuficiente (registrar, para nao ser reaberta
como se fosse novidade):** "as paginas de exemplo ranqueiam pelo TOPICO do video,
entao o trafego e turista". Provavelmente verdade para `/examples/japan-*` e
`/examples/runit-*` (137 das 187 sessoes). **Mas nao explica
`/cheapest-ai-shorts-maker`:** consulta de fundo de funil pura, DUAS portas
instrumentadas com a copy certa, mesmo `OrganicCtaLink` que fez 284 cliques na
home nos mesmos 30 dias — 41 sessoes, zero cliques. Uma hipotese que explica o
caso facil e falha no caso decisivo nao substitui a conclusao.

**Divida NOVA registrada:** `shorts-money-calculator` (449 linhas),
`niche-picker` (789) e `viral-score` (221) sao ferramentas COMPLETAS, do formato
que converte 41-67%, e **nenhuma tem uma unica saida para o produto**. Conectar as
tres e mais barato que escrever qualquer pagina de SEO nova.

---

## 11/08/2026 sprint 19h — ANALYTICS: o resgate de vídeo entra no funil (`video_rescue_sent`)

Rotação de aquisição desta sprint: **Analytics**. `KINEO-RESCUE-EVENT-2026-08-11`.

**Regra Zero primeiro, e ela corrigiu a própria entrega:** a sprint das 16h
registrou que `send-video-rescue` "é o único cron de lifecycle que não deixa
nenhum rastro no banco". **Falso** — ele já gravava `video_rescue_sent_at` em
`profiles` desde sempre. O que faltava é outra coisa, e é a que importa: a
coluna responde *"esta pessoa já recebeu?"* e nada mais. Ela não junta com o
resto do funil, que vive em `events`.

Consequência medida: **377 envios reais**, o último hoje às 14:01Z, e **zero
linhas** comparáveis com `payment_success`. Ninguém consegue perguntar "dos que
receberam o resgate, quantos voltaram e quantos compraram" — que é exatamente a
pergunta que a **regra de morte dos 7 dias** exige para manter ou matar a
alavanca. Uma alavanca imortal por falta de medição é o modo de falha mais caro
do playbook, e esta estava nele há semanas.

O evento carrega `hours_since_last_video`, que é o eixo que separa "voltou
porque o e-mail chegou na hora certa" de "voltou de qualquer jeito". Escrito
DEPOIS do carimbo de `video_rescue_sent_at`, de propósito: analytics nunca
disputa prioridade com a garantia de não mandar o mesmo e-mail duas vezes.

**Nenhuma mudança de público, de copy ou de cadência** — o gate de e-mail para
fora continua sendo do fundador. O que muda é que na próxima leitura o resgate
terá denominador.

## 11/08/2026 sprint 19h — o A/B 3d×7d não decide nada, e a ativação decide

`KINEO-AB-CENSORING-2026-08-11` (detalhe completo em `GATES-ABERTOS.md`).
Números do experimento, contas internas fora, maturidade por âncora imutável:

| braço | elegíveis | maturados | converteram | entregaram vídeo | ativação | estendidos |
|---|---:|---:|---:|---:|---:|---:|
| 3d | 57 | **21** | 1 | 29 | **50,9%** | **11** |
| 7d | 59 | **0** | 0 | 33 | **55,9%** | 0 |

Três coisas para a operação de aquisição:
1. **Nenhuma decisão de duração de trial pode citar conversão.** 2.318 maturados
   por braço para detectar o dobro; hoje um dos braços tem zero.
2. **A ativação é o caminho curto** — 169 por braço, ~2 semanas. E ela está
   apontando para o 7d (+5,0pp), o oposto do que a leitura antiga sugeria.
3. **O 7d ainda não devolveu um único dado de fim de trial.** Qualquer relatório
   que comparar os braços antes de ~17/08 está comparando um braço com nada.

## 03/08/2026 — tarde (sessão CEO, conta @Josephsskaf93)
1. Reply SEM link → x.com/SergiuszBuilds/status/2084261015563198637 (criador com 40 views perguntando se continua com Shorts). Conselho: hook nos 1.5s, portar a lógica do slide 1, cadência 2 semanas.
2. Reply COM link → thread @thesarmie x.com/thesarmie/status/2084306418002272512 (stack de tools grátis p/ faceless, 3.2K views/2h, comentários cheios de iniciantes). Link: usekineo.com/?utm_source=x&t=stack (URL fresca — ?utm_source=x puro já estava cacheado no X com card velho).
- LIÇÃO: X cacheia card POR URL EXATA. O founder queimou ?utm_source=x no teste → sempre adicionar &t=<contexto> único por post.
- CARD NOVO CONFIRMADO: preview no composer mostrou o design safe-zone limpo ("Type an idea. Get a finished Short.") → /og-card.png no ar.
- Próximos replies de hoje: SEM link (ratio 2/3). Máx 5/dia.

## 03/08/2026 23:11-23:15 — OUTREACH CLIPPERS (Whop DM, conta do fundador, ENVIADAS)
1. Carlos @carlosdelzo — Clipea.us (818 membros, comunidade latina, msg em espanhol) — 23:11
2. Eugene Litman @eugene50 — Clip Studios (799 membros; Sean Paul/Daecolm/LaRussell) — 23:14
3. adan @adanmaxwell — VitaClips (4.402 membros, 150M+ views, $80K+ pagos a clippers) — 23:15
Oferta: link de parceiro 40% recorrente + destaque na pagina earn-money-clipping + video demo.
Alcance potencial se fixarem: ~6.000 clippers.
LICAO OPERACIONAL: o Whop NAO guarda texto nao enviado — ao navegar para outra conversa o
rascunho some, e resto do texto antigo pode se MISTURAR com o novo (aconteceu com o Eugene).
Regra: digitar UMA mensagem, enviar, so entao ir para a proxima; sempre ctrl+a + Delete antes de digitar.
LICAO 2: nao existe e-mail desses donos de comunidade — canal e DM. Rascunho de Gmail com
"[copiar p/ Whop DM]" no assunto confundiu o fundador; nao repetir esse padrao, preparar direto no canal.
PROXIMO: monitorar resposta e cliques nos codigos de afiliado; se responderem, criar link dedicado por comunidade.

## 04/08/2026 14:50Z — RONDA DO DIA DO PH (Ordem N, sprint 11h)
- **Product Hunt (producthunt.com/products/kineo-2):** lançamento no ar, "Launching today",
  **3 pontos, 0 comentários externos**. O único comentário é o de maker do fundador (1d).
  **Nada a responder** — a ronda foi executada e não havia superfície de engajamento.
  Não se pediu upvote (regra do fundador + regra da plataforma).
- **Leaderboard 04/08:** corte do top-17 em **73 pontos**; nº1 Hey Noah com 271. Kineo fora
  por uma ordem de grandeza.
- **Banco:** 0 eventos com ref/utm `producthunt` em 24h — nenhum cadastro veio do PH.
- **TAAFT no mesmo período (comparação que importa):** 24 usuários no /generate, 20 iniciaram
  geração, 12 concluíram vídeo, 6 baixaram, 5 viram pricing, 0 compraram.
- **Whop:** sem resposta nova visível dos 3 donos (Carlos/Eugene/adan) até 15:00Z.
- LIÇÃO: PH sem rede prévia é troféu, não canal. O custo real do dia não foi o tempo — foi o
  freeze do pipeline de render (Ordem L congelada), pago por 3 pontos.

## 06/08 noite — BLITZ TIER A: FUNDADOR ENVIOU os e-mails do Gmail (Conor Martin $100 + demais rascunhos existentes). Sprints: NAO reenviar e-mail; seguir com DM X do Sanji (prioridade velocidade), Adam e Typeform do Steffen; monitorar respostas e negociar. Pagamento so na entrega (gate fundador).

## 06/08 ~22h (sprint CEO) — RONDA DE RESPOSTAS: 3 INBOUNDS DE 03/08 SEM RESPOSTA HÁ 3 DIAS
Todos ainda NÃO LIDOS na caixa de entrada. Nenhum constava neste log.
1. **akajitin@gmail.com** (03/08 16:00, thread `19fc822818bcafb5`, msg `19fc85b2d2da9fb0`) —
   cliente vindo do TAAFT que testou e PAGOU em <30 min. Respondeu ao agradecimento do fundador:
   *"I can advertise your app to my large communities, do you want me to work with you?"*
   → **RASCUNHO DE RESPOSTA CRIADO NO GMAIL** na própria thread (id `r-2585367767906864369`).
   Proposta: link de parceiro 40% recorrente (mesmo termo já autorizado para o Whop em 03/08) +
   créditos-bônus para quem chegar pelo link dele (o post vira presente, não anúncio) + oferta de
   produzir a peça pronta. Pergunta: quais comunidades/tamanho e qual formato.
   **PENDENTE: fundador revisar e ENVIAR** (envio de e-mail é gate).
2. **contact@rforrank.com** (03/08 15:48) — oferece promoção em TinyLaunch/Uneed/PeerPush/
   ScrollLaunch. Vendedor de promoção paga → GATE DE TRÁFEGO PAGO. Não respondido.
3. **jwins774@gmail.com** (03/08 17:14) — "promote on Fazier and other AI directories, bring you to
   top 1 rank". Mesma categoria. Não respondido.
**Whop:** `whop.com/messages` aberto — nenhuma conversa nova visível; sem resposta de Carlos/
Eugene/adan até 06/08 22h. Mantido em monitoramento.
**PROVA SOCIAL DE GRAÇA NÃO APROVEITADA:** Fazier 04/08 — **Kineo foi #2 Produto do Dia**, com badge
para reivindicar. TAAFT 05/08 — **1.000 cliques** + 9 saves na semana. Nada disso aparece no site.
LIÇÃO: a ronda de respostas rendeu mais por minuto que qualquer diretório ou página de SEO desta
semana. O canal mais barato da empresa é a caixa de entrada que ninguém abriu — e ele decai por dia.

---

## 07/08 22:20Z — Sprint 19h · ronda + auditoria de canal

**Buraco de log preenchido:** as 4 sprints anteriores de hoje (10h, 11h, 13h,
16h) não registraram nada aqui. Nenhuma delas fez ronda de engajamento — logo
**não há risco de resposta duplicada**, mas o dia ficou sem registro até agora.

### Auditoria da ficha do TAAFT (lida em produção)
Único canal real da empresa e o que mais precisa de ação humana:
- **`Owner tools locked` / `Verify ownership`** — a ficha nunca foi verificada
  pelo dono. Sem verificação não há analytics nem edição da página.
- **Nota `3.0`, de 1 única review**, para **9.276 cliques** enviados ao site.
  Saves: 28. Rank 2026: **#240**. Votos 3↑/1↓.
- Preço da ficha (`Free + from $9.90/mo`) **contradiz o Q&A da própria página**
  (`$11.90 / $24.90 / $37.90`). **Zero menção aos 40 créditos do trial.**
- Copy ainda na oferta velha: `Your first Short is free`,
  `videos produced during the free trial do bear a small watermark`.
- **Tráfego do canal caiu 95% em 7 dias** (66 pessoas/dia em 31/07 → 3 hoje).

→ Tudo isso é ação da conta do fundador (login em site de terceiro). Listado no
RESUMO PARA O CEO da sprint 19h em `docs/SPRINT-2026-08-07.md`.

### Pedido de review dentro do produto: trocado, e continua não produzindo
`taaft_review_ask_shown` parou em **04/08 21:49** (troca por `<VideoRatingAsk/>`,
commit `43e2a3b`). O substituto: `video_rating_shown` = **19 impressões / 13
pessoas** desde 05/08 e **`video_rated` = 1 evento na história**.
`taaft_review_ask_clicked` segue em **ZERO desde 15/07**.
Causa provável e nova: o gate do `<VideoRatingAsk/>` é **ter o arquivo na mão**,
e 1 em cada 3 celulares nunca recebe o arquivo (ver sprint 19h, item 1).

### Aquisição executada nesta sprint
**IndexNow — 164 URLs reenviadas, HTTP 200, 22:14:10Z.** Inclui as 28 páginas
`/free-ai-shorts/*` cuja copy mudou hoje. Script (`scripts/submit-indexnow.mjs`)
e chave pública já existiam — Regra Zero, nada reescrito.

### Inbounds de 03/08: seguem SEM RESPOSTA (5 dias)
Nenhuma ação nova nesta sprint — envio de e-mail para fora continua sendo Send
do fundador (PROMPT-DIARIO). Estado inalterado desde 06/08 22h:
- `akajitin@gmail.com` — cliente do TAAFT, pagou em <30min, **ofereceu divulgar
  o app para as comunidades dele**. Rascunho pronto no Gmail
  (`r-2585367767906864369`), aguardando Send. ⚠️ **Com o TAAFT caindo 95%, este
  é o lead de aquisição mais quente e mais barato que a empresa tem, e está
  esfriando há 5 dias.** Antes de enviar, conferir se o rascunho (escrito em
  06/08) ainda bate com a oferta atual — o free tier e o trial mudaram hoje.
- `contact@rforrank.com` e `jwins774@gmail.com` — promoção paga; seguem no gate
  de tráfego pago (QA do trial + flag).
- Whop (Eugene / adan / Carlos): sem conversa nova. Nenhuma DM enviada hoje.

---

## 08/08 ~13:00Z — sprint 10h (CEO)

**Ronda de respostas: NÃO feita nesta sprint.** As sprints da madrugada (06:15–08:01)
também não registraram nada aqui. Logo, **não há risco de resposta duplicada** — e os
inbounds de 03/08 (`akajitin@gmail.com`, rascunho `r-2585367767906864369` no Gmail)
continuam **sem resposta há 6 dias**. O aviso de 07/08 continua valendo: a oferta mudou
desde que o rascunho foi escrito (trial de 40 créditos), então ele precisa ser
**atualizado antes** de qualquer envio.

**Aquisição desta sprint (AEO, commit `b4b5d4e`):** medido que o **ChatGPT virou o maior
canal de entrada da empresa** — 6 cadastros em 24h contra 1 do TAAFT, com ativação
equivalente (66,7% vs 68%) e custo zero. O TAAFT caiu de ~66 cadastros/dia (31/07) para 1.

**O achado que muda a prioridade do canal:** o `/api/facts` — endpoint que o nosso próprio
`/llms.txt` manda o agente buscar — publicava `videosPer24h: 1` numa janela de 720h, ou
seja **afirmava "1 vídeo grátis por dia", 30x a franquia real**, para exatamente o canal
que mais cresce. Somado a um `Last verified` sem sujeito que datava o documento de ANTES
da evidência que ele apresenta. Corrigido nas 3 superfícies (`/llms.txt`, `/api/facts`,
`/facts`).

**Não feito, e por quê:** diretórios novos (Ordem S) seguem exigindo formulário e conta em
site de terceiro = gate do fundador. TAAFT $347 (Ordem O) segue no **gate de tráfego pago**:
0 conversões de trial, e agora com um canal orgânico de custo zero acelerando, encher o
funil pago é ainda menos defensável. DMs do Blitz Tier A (Sanji/Adam/Steffen) não enviadas.

---

## 10/08 ~06:40Z — sprint madrugada (CEO)

**Ronda de respostas: NÃO feita nesta sprint.** Os inbounds de 03/08 seguem sem
resposta (**7 dias**): `akajitin@gmail.com` (rascunho `r-2585367767906864369` no
Gmail, aguardando Send do fundador — e a oferta mudou de novo desde que ele foi
escrito), `contact@rforrank.com` e `jwins774@gmail.com` (gate de tráfego pago).
DMs do Blitz Tier A não enviadas. Envio de e-mail para fora continua sendo Send
do fundador (PROMPT-DIARIO) — nenhum risco de resposta duplicada.

### Aquisição desta sprint: o canal nº1 mudou de dono, e está medido

Usei as colunas de PRIMEIRO TOQUE que **já existiam** em `profiles`
(`signup_utm_source` / `signup_referrer`) — Regra Zero, nada construído.

**`chatgpt` passou o `taaft` como maior canal EXTERNO de entrada:**
08/08 → 7 × 2 · **09/08 → 13 × 4** · 10/08 parcial → 4 × 0.
Contra 65 cadastros do TAAFT num único dia em 31/07: o canal de custo zero virou
o principal enquanto o diretório secava.

**⚠️ UM NÚMERO MEU DERRUBADO ANTES DE VIRAR RELATÓRIO.** A primeira query dizia
"TAAFT ativa 4,0%". Falso: media `trial_credits_used > 0`, e a maioria dos 150
do TAAFT se cadastrou **antes de o trial existir** — o zero era por construção,
não por comportamento. Medindo por **vídeo gerado** (válido nas duas eras) e
contando PESSOAS, últimos 9 dias:

| fonte | pessoas | ativaram | % | pagaram |
|---|---|---|---|---|
| taaft | 150 | 97 | **64,7%** | **2** |
| homepage (etiqueta interna) | 39 | 35 | 89,7% | 0 |
| chatgpt | 35 | 17 | 48,6% | 0 |
| (direct) | 25 | 8 | 32,0% | 0 |

**A nuance que impede a conclusão errada:** o TAAFT é o **único canal que já
produziu pagamento** (2). O `chatgpt` tem **0 pagamentos em 35 pessoas**.
"ChatGPT é o nº1 em entrada" NÃO é "desligar o TAAFT" — é "a entrada mudou de
dono e a saída ainda não seguiu". Próxima pergunta do canal: por que 48,6% de
ativação não vira uma única compra.

### Superfícies de máquina: conferidas por FETCH DO ARQUIVO SERVIDO
`/llms.txt` e `/api/facts` estão **corretos e atuais** — o trial de 40 créditos
na oração principal, `videosPer24h: null` + `freeVideosPerWindow: 1` em janela de
720h. A correção de 08/08 segurou. **Nada refeito.**

---

## 10/08 sprint 21h — PLACAR DE CAC POR CANAL construido (Ordem O destravada por medicao)

Documento: `docs/CAC-POR-CANAL-2026-08-10.md`. Era o pre-requisito registrado em
3 lugares para decidir o TAAFT $347.

Funil por primeiro toque, 14 dias, internos fora:
`taaft` 226 pessoas / 54,4% ativaram / 13 trials / **2 pagaram** ·
`homepage` 43 / 81,4% / 33 / 0 · `chatgpt` 40 / 42,5% / 30 / **0** ·
`(direct)` 25 / 32,0% / 18 / 0 · `sticky_cta` 1 / **1 conversao**.

**VEREDITO: nao comprar o $347.** Payback em 1 mes exige ~1.577 cadastros
incrementais (0,885% x US$24,90 = US$0,22 de receita por cadastro/mes); o canal
faz 16,1/dia organico. Em 3 meses de retencao seriam ~525 — mas nao ha retencao
medida (baseline: 0 assinaturas recorrentes na historia), entao a unica conta
honesta e a de 1 mes.

**ACHADO QUE VALE MAIS QUE A DECISAO:** rotulo de superficie interna
(`homepage`, `sticky_cta`, `kineo_user`) sobrescreve a origem externa em
`signup_utm_source`. **42 dos 47 perfis com rotulo interno tem
`signup_referrer` NULO** — irrecuperavel. A unica conversao da historia esta
nesse balde. **Nenhum investimento pago sera avaliavel depois enquanto isso nao
for corrigido.** Correcao: so gravar `signup_utm_source` a partir de `utm_source`
de URL externa, mandar rotulo de superficie para `signup_surface`, e gravar
`signup_referrer` SEMPRE (hoje fica nulo quando ha utm).

**Reordenacao do TAAFT:** o canal nao tem problema de volume, tem problema de
conversao — 226 pessoas viraram 13 trials. Antes de qualquer dolar: (1) consertar
o rotulo de origem; (2) o fundador fazer `Verify ownership` na ficha gratuita,
que entregou 226 cadastros de graca estando desatualizada, com nota 3,0 e sem
nenhuma mencao aos 40 creditos do trial.

**Ronda de respostas: NAO feita, por decisao.** Com o render parado ha 31h50,
nao se abre torneira de aquisicao. O rascunho do `akajitin` (o promotor do
TAAFT) segue parado e deve ser reescrito com a oferta atual **depois** que o
render voltar — manda-lo hoje seria pagar audiencia para ver erro 502.


---

## 11/08 sprint 21h - A CAMPANHA ORFA: 231 pessoas, e-mail pronto desde 26/07, zero envios

`KINEO-STALLED-RESCUE-ORPHAN-2026-08-11` (commit `d60adde`).

**NAO REFAZER: a campanha para "comecou e nunca completou" EXISTE.** Fica em
`app/api/admin/send-stalled-rescue/route.ts`, nao em `cron/send-video-rescue`.
Quem procurar de novo por "como falar com quem quebrou" vai achar o cron irmao,
concluir que ele exige linha em `videos` e comecar a escrever do zero - foi
exatamente o que a sprint das 16h ia fazer. A rota certa e admin-gated e nao
tem cron, por isso nao aparece no `vercel.json`.

Coorte medida em 11/08 (internos, descartaveis e opt-outs fora): **231**
alcancaveis, **0** ja contactadas, **0** opt-outs. **37 em trial ATIVO** com
**1.469 creditos vivos**, 16 vencendo em 72h. 13 estao tambem em
`checkout_abandoned` e foram EXCLUIDAS (dono e o `send-recovery`).

Estado: codigo corrigido e commitado, **nao disparado**. O primeiro lote e uma
URL de um clique no relatorio do fundador (dry run + `?confirm=SEND&limit=50`).
Idempotente: `stalled_rescue_emailed` + `stalled_rescue_sent_at`.

**Achado transferivel para qualquer e-mail futuro:** a mesma frase de abertura
foi reescrita 3x e ficou falsa 3x, sempre por afirmar algo sobre O QUE A CASA
MANDOU - "you got no error" (falsa para ~58%), "we never once wrote to you"
(falsa para 216 de 231, que receberam o activation nudge), "nothing we sent you
acknowledged that" (falsa para 33, que receberam o `send-blackout-winback`, cujo
texto diz *"The failure was ours"*). Toda afirmacao desse tipo exige enumerar
corretamente TODOS os jobs de e-mail, e a lista muda toda semana. A frase que
ficou afirma o RESULTADO e e verdadeira por construcao da coorte: *"nothing
we've sent you since has actually put a finished video in your hands"*.

Dividas registradas para nao serem redescobertas: `lib/internalAccounts.ts` nao
cobre `@usekineo.com`; `send-blackout-winback` e cron de e-mail e NAO esta em
`PROFILE_TIMESTAMP_COLUMNS`; `send-video-rescue` tem a mesma consulta de
`checkout_abandoned` falhando ABERTA que foi corrigida aqui.


---

## 12/08 sprint 13h - A EXTENSAO DE TRIAL PREMIAVA QUEM NAO USOU O PRODUTO

`KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12` (commit `dcb1944`) e
`KINEO-LOSS-NEVER-RAN-2026-08-12` (commit `ee01c20`).

**NAO REFAZER: o criterio da extensao JA FOI corrigido.** Ele era
`trial_credits_used < 10` em `app/api/cron/trial-lifecycle-emails/route.ts` e
agora e `videosMade >= 3 && usableAfterExtension >= 1`. Quem for reabrir o
assunto: a constante `EXTENSION_MAX_CREDITS_USED` **nao existe mais**, e
`scripts/prove-trial-clock-monotonic.mjs` tem gate sintatico que falha se ela
voltar.

Placar do instrumento antes da troca (medido, nao deduzido): **25 envios de
`trial_extended`, 0 vidoes gerados depois, 0 conversoes, media 2,6 creditos
usados de 40, 10 dos 25 sem nenhum video na vida.** 24 dessas contas seguem
dentro do numero "trials ativos" com saldo medio 39,0/40 - **o numero de trials
ativos esta inflado por elas, e vai continuar inflado ate essas contas
vencerem.**

**Achado estrutural, transferivel:** a extensao reescreve `trial_status` para
`'active'`, entao ela TIRA a pessoa da coorte `expired`/`downgraded`. Toda
sequencia que pede dinheiro (`downgraded_loss`, `expired_offer_d5` COMEBACK50,
`expired_lastcall_d10`) mora nessa coorte. Qualquer mecanismo futuro que
"ressuscite" um trial tem esse mesmo efeito colateral e precisa ser avaliado
por ele, nao so pela intencao.

**Correcao de causalidade, para ninguem repetir a afirmacao errada:** o D5
(COMEBACK50) tem 0 envios na historia, mas a causa e **calendario**. O fim de
trial mais antigo da base e 09/08 e o D5 dele abre em 14/08. A extensao atrasa
o D5 em +3d para a metade de baixo do funil - real, mas nao explica o zero.

**Segunda divida paga na mesma sprint:** o `downgraded_loss` afirmava "The
videos you already made are yours" para TODO mundo, inclusive para os 51 trials
ativos com zero video que agora caem nele. Corrigido com o trilho de 1 clique
que ja existia (`oneClickBlocks`). A frase segura sobre o que a casa mandou
continua sendo a que fala do RESULTADO ("nothing we sent you actually put a
finished video in your hands") - 3a vez que essa forma se prova a unica
verdadeira por construcao da coorte.

**Divida NOVA registrada, para nao ser redescoberta:** a semente de
`starterTopics` e a mesma no `d0_welcome`, no `ending_soon` e (antes desta
sprint) seria a mesma no `downgraded_loss` - a pessoa receberia os MESMOS 3
temas em 3 e-mails seguidos. Resolvido aqui com sufixo `:loss` na semente, mas
o `ending_soon` ainda repete os temas do `d0_welcome`. Vale o mesmo sufixo la.


---

## 12/08 sprint 16h - "NAO GASTOU CREDITO" NAO E "NAO TENTOU"

`KINEO-FAILED-BY-US-2026-08-12` (commit `57ac670`) e
`KINEO-REJECTION-COPY-2026-08-12` (commit `02e9a33`).

**CORRECAO DE NUMERO PUBLICADO NOS DOCS DE HOJE. NAO REPETIR O ANTIGO.** A
sprint das 10h escreveu "dos 50 trials sem video, 0 tentaram e falharam; 50
nunca tentaram" e as 13h herdaram. Medido em `events`: dos 52 trials ativos com
zero video, **52 abriram /generate, 43 clicaram analyze, 35 chamaram
generate_started e 23 tem falha registrada** - 22 classificaveis como NOSSAS,
21 exclusivamente dentro do apagao Creatomate de 09-10/08. Ate 8 tentativas por
pessoa, zero sucessos, **zero creditos queimados**.

**A CAUSA DO ERRO E TRANSFERIVEL, e e o aprendizado da sprint:** `videos` e
`trial_credits_used` NAO sao duas fontes independentes que se confirmam. As
duas medem a mesma coisa, porque **quando a falha e nossa o debito nao
acontece**. Quem tentou 5 vezes e foi derrubado fica, nas duas tabelas,
identico a quem nunca abriu o app. Toda coorte definida por AUSENCIA (nao
gerou / nao comprou / nao usou) passa por `events` antes de virar decisao.

**NAO REFAZER: send-blackout-winback nao alcancou ninguem, e nao adianta
mexer nele para esta coorte.** 0 envios desde 01/08, medido. Ele exige marcador
de apagao nas ultimas 48h e o simbolo `creatomate_rejected` so passou a ser
escrito no deploy de 10/08, DEPOIS do fim do apagao. A janela dessas 23 pessoas
fechou para sempre naquele cron - quem as alcanca sao `ending_soon` (12 delas;
as outras 10 ja queimaram o claim permanente da PK) e `downgraded_loss` (as 23,
ninguem recebeu ainda).

**Divida NOVA registrada:** `app/api/compose/unlock/route.ts` responde 502 SEM
disparar `alertCreatomateDown` - apagao que so atinja esse caminho e invisivel.
E o ramo `neverUsed` do `ending_soon` (commit das 10h) imprime "the 0 credits
in your account expire with it" se o saldo for 0; hoje sao 0 contas ativas
nesse estado, e a guarda entrou SO na copy nova.

**Ideia MEDIDA E MORTA (nao reabrir sem dado novo):** "o onboarding e
instrumento cego, 60% saem sem evento". Nao e - 93,7% desse grupo tinha
`activation_autostart` e nunca precisou da tela. Controlado por isso, quem
clica converte 37,5% x 28,2% de quem pula. O bruto (44% x 66%) diz o oposto,
por Simpson. `viral_onboarding_primary_clicked` e
`first_video_started_from_viral_onboarding` sao o MESMO clique (104 x 104
pessoas, 0,060s de intervalo medio) - nao contar como dois sinais.

---

## 12/08/2026 — sprint 19h — RONDA DE RESPOSTAS FEITA (última completa era 07/08)

Caixa de entrada varrida (`in:inbox newer_than:7d`, promoções/social/updates fora).
**3 respostas humanas, todas não lidas. Nenhuma resposta enviada — Send é gate do
fundador.** Detalhe completo em `docs/LINKS-QUEBRADOS-GMAIL-2026-08-12.md`.

| quem | quando | o que disse | estado / ação |
|---|---|---|---|
| `marc@lienard.us` | 11/08 12:41Z | *"I was going to leave a survey but the link you provided did not take me there"* | **ABERTO — resposta pronta no doc, falta Send.** Trial ATIVO, 1 vídeo, 1 de 40 créditos. **NÃO responder de novo sem checar se o fundador já mandou.** |
| `matthewahawes@gmail.com` | 11/08 02:16Z | *"Please cancel the service"* | **FECHADO no banco:** `plan=free`, `has_paid=false`, sem assinatura Stripe, `email_opted_out` **já true**. Nada a cancelar. Falta só uma linha dizendo que nada foi cobrado. |
| `aimalvabusiness@gmail.com` | 07/08 17:16Z | recusa do afiliado ("both are no", sem comissão em nenhum formato) | **MORTO. Sem follow-up, nunca.** |

### Achado da ronda (não é resposta, é defeito)

O blast **"Did Kineo work for you?"** de 10–11/08 saiu para **44 pessoas em bcc**
com o link da review sendo o **wrapper do Gmail** colado como href
(`google.com/url?q=…&ust=…&sa=E`) em vez da URL crua. O Marc é a prova de campo
de que ele não resolve.

**O mesmo defeito está no rascunho `r-2585367767906864369` para
`akajitin@gmail.com`, que AINDA NÃO SAIU** — e ali o link quebrado é o de
**cadastro no afiliado**, a ação inteira que o e-mail pede. Corrigir antes de
enviar; URLs corretas no doc.

**Regra nova:** URL crua digitada no corpo. Se o texto contiver
`google.com/url?q=`, o e-mail não sai.

### Não feito nesta ronda

PH, X, Reddit, Fazier, TAAFT e Whop **não** foram varridos (exigem login em site
de terceiro). Whop: Carlos/Eugene/adan seguem sem resposta desde 03/08.
