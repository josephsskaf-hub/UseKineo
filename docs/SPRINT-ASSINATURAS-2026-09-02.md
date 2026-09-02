# SPRINT ASSINATURAS E VENDAS — 24h contínuas (01/09 22:30 → 02/09 22:30 BRT)

Ordem do fundador (01/09, noite): "total potência, máxima criatividade, cada dia mais
assinantes e mais gente nos planos caros; nada de rodada de 5 min e uma hora parado;
reler, aprender o código, achar o que fazemos de errado. Foco: assinaturas e vendas."
Rodada a cada 20 min (tarefa kineo-sprint-assinaturas-24h). Diário = handoff canônico.
Regras: ver o prompt da tarefa e o CLAUDE.md (pistas do Codex, enfileirar.sh, nunca push).

## LINHA DE BASE — 01/09 22:20 BRT (externos, 7 dias)
| pagantes | MRR | cadastros 7d | cadastros 24h | fizeram vídeo 7d | 1 vídeo | 2 | 3 | 4+ | pessoas no checkout 7d | falhas 24h |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | ~$109 | 153 | 25 | 80 | 69 | 9 | 2 | **0** | 14 | 8 |

Leitura: 86% de quem faz vídeo para no 1º. NINGUÉM chegou ao 4º esta semana (o limiar de
11,8% de conversão). 14 pessoas chegaram ao checkout e 0 assinaram. Meta: mover gente de
v1 → v2 → v4 e dar razão de compra no checkout (sem tocar em preço — pista do Codex).

## O QUE JÁ ESTÁ NO AR HOJE (não refazer)
- Winback A (7, cupom) e B (95 pessoas +25cr; 264 elegíveis restantes — link de 1 clique
  /api/admin/send-winback-25?confirm=SEND&limit=60).
- Crons acordados: send-failure-recovery (a cada 6h) e send-momentum-nudge (13:30 UTC).
- Medições novas: review_peak_cta_seen, clean_paywall_shown.
- Admin: overview paginado (MRR real), live só presença real.
- S25 instalado atrás de S25_PUBLIC; canário falhou por 503 da fal (3/6); retry 02/09 9h.

## CARDÁPIO INICIAL (ordem de impacto; cada rodada pega 1)
1. Vídeo pronto → próximo vídeo com 1 clique (tema irmão sugerido, mesmo motor) — v1→v2.
2. Falha de render → retentar a CENA, não matar o filme (8 falhas/24h; 19 de 33 nunca voltam).
3. Tela de espera honesta por motor (S25 15-20 min; nunca morrer em 503).
4. E-mail pro Emilio (renovou, 40cr, 0 vídeos em 7d) — rascunho Gmail.
5. Rick: legendas OFF (promessa desta semana; cliente pagante + única review).
6. O que só o Studio faz, mostrado quando a pessoa escolhe um motor Studio sem plano
   (sem preço: dizer o que ganha, não quanto custa — preço é do Codex).
7. Momentum: quem fez 2-3 vídeos recebe o "faltam N pro 4º" (checar copy do cron).
8. Página de motor S25 (pronta) + páginas de motor com clipe real como prova.
9. Auditoria: débito sem entrega, claims presos, trial órfão (vigia).
10. Vídeo do dia (Batalha de LA 1942) nas 3 redes assim que o retry sair.

## RODADAS
### #0 — 22:20 BRT — linha de base + diário (Claude, sessão principal)

### #1 — 22:05→22:50 BRT — 7 primeiros-vídeos do trial morreram com as cenas PRONTAS (cinematic_abandoned_no_delivery)
**O que estava errado.** Medido em SQL (externos, 7d): `credits_refunded` com
reason `cinematic_abandoned_no_delivery` = 7 pessoas, 137cr, TODAS free/trial e
TODAS com `videos completed = 0` na vida (18pgce011, fazilazaheer, zuryat88,
aminemokhtar, ffdilraj730, giuseppe.rap, contextoaparte). Em todas: Seedance
despachado e ACEITO (cinematic_dispatch_result accepted), claim `settled` com
débito, `authorized_completed_urls` 100% preenchido (4/4, 5/5, 6/6, 7/7 — as
cenas TERMINARAM na fal), `compose_submission_claim` = 0, `stranded_*` = 0, e o
refund-sweep devolveu o crédito ~2h depois. Ou seja: pagamos a fal, o filme
existia em pedaços, e a pessoa ficou com 0 vídeos no primeiro dia — a coorte que
mais converte (trial → 1º vídeo) perdendo 1,4 pessoa/dia neste modo de falha.
Log da Vercel: /api/cron/finish-stranded-renders rodou 8× na janela do
contextoaparte (16:30→18:15 UTC) e imprimiu SÓ `checked=13 composed=0` — cada
desfecho por geração ia no JSON de resposta que ninguém lê; nenhum `skip=`,
nenhum `compose failed`, nenhum `service-finish`. As únicas saídas mudas do
código são authorize_failed / reload_failed / no_authorized_urls (depois de
`collectFinishedClips` dizer `ready`). O cliente NÃO polou (0 chamadas a
/api/cinematic-clip-status na janela — contextoaparte recarregou a página 4s
depois do dispatch, pelo `activation_autostart` recovery; giuseppe foi passear
em /audio 1s depois). Logo quem autorizou as URLs foi o próprio cron — que então
parou mudo antes do compose. Causa exata AINDA NÃO PROVADA (sem FAL_KEY local
pra replicar); o que dá pra provar é que o cron esconde o motivo.
**O que mudou (cron, só observabilidade — nenhuma decisão alterada).**
`[stranded] outcomes gen:outcome ...` a cada rodada no log; desfechos terminais
silenciosos (authorize_failed, reload_failed, no_authorized_urls, compose_*,
too_few...) viram evento `stranded_outcome` (metadata.outcome) no banco; insert do
marcador de tentativa passa a checar erro.
**Para o cliente/receita.** Nada ainda — esta rodada compra a próxima: com o
evento no banco, a rodada seguinte lê `select metadata->>'outcome' from events
where name='stranded_outcome'` e conserta o galho certo. Hipóteses em ordem:
(a) `authorizeCinematicCompletedUrls` devolvendo conflict ('completed URL is
already bound' se a fal devolver host v3/v3b diferente entre chamadas, ou 'request
id is not uniquely authorized'); (b) `loadVerifiedCinematicClaim` reprovando o
claim recém-assinado; (c) budget/ordem.
**SHA:** ver commit `sprint-assinaturas #1`. **Risco:** zero funcional; +1 log e
+N eventos raros por rodada. **Como medir:** `stranded_outcome` nas próximas 24h
+ `credits_refunded` reason `cinematic_abandoned_no_delivery` (meta: 0/semana).
**Próximo item (#2):** ler `stranded_outcome` assim que houver um settled não
entregue; se for (a), tratar URL já autorizada como idempotente (comparar por
request_id, não por URL) e compor. Em paralelo: o `activation_autostart` recovery
re-despacha 22s depois do 1º dispatch (contextoaparte: 2 gerações, 2ª recusada
com held=19, tela 'failed' + UpgradeModal 'trial_spent' aos 4 min de vida) — a
recuperação precisa checar claim vivo no servidor antes de re-despachar.
**Placar 22:50 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2, free/
churn 4); cadastros 1h=3, 24h=26; vídeos entregues 1h=0, 24h=17; falhas 24h=16
(speech=Xs 10, voiceover 2, compose_daily_free_limit 2, held 1, narration_too_short
1); checkout_started 24h=1 pessoa; 7d: 69 com 1 vídeo, 9 com 2, 2 com 3, 0 com 4+;
crons 24h: winback25_sent 120 (fundador disparou mais lotes), failure_recovery 0,
momentum_nudge 0. DESTAQUE: 7 abandonos acima; fila subiu (origin/main=d3042a5d).

### #2 — 22:30→22:50 BRT — o recovery automático do 1º vídeo re-despachava por cima de um render vivo e matava o trial aos 4 min de vida
**O que estava errado.** `GenerateClient.tsx` (zona compartilhada — aviso ao
Codex: mexi só no rail de ativação, linhas do `recoveryEligible`). O rail
`activation_autostart` guarda `dispatched:<ts>` no sessionStorage e, se a
pessoa recarrega a página antes do checkpoint do compose com 0 vídeos, RE-
DESPACHA "para recuperar a intenção". Para conta paga isso já era proibido (D1,
11/08: "o custo do falso positivo é dinheiro alheio"). Para conta grátis era
permitido — e o cinematic (Seedance, motor do trial_best) já está DEBITADO e
aceito na fal nesse instante. Medido (externos, 14d): 12
`activation_autostart_recovery_dispatched`, 9 deles entre 15s e 50s após o 1º
dispatch. Caso 489a2c31 (01/09 16:10, contextoaparte): F5 aos 4s, recovery aos
22s, servidor recusa com `held=19` (o trial inteiro preso no 1º render), tela
'failed' + UpgradeModal 'trial_spent' aos 4 min de vida; o 1º filme ficou com
todas as cenas prontas e nunca foi composto (é o mesmo caso do #1). A moeda de
ativação virava paywall + falha na primeira sessão.
**O que mudou.** Recovery de `dispatched:*` só acontece com a sonda
`/api/compose/active` (a MESMA que o lock do compose usa; ela já enxerga o
claim cinematic settled como `rendering, resumable:false`) respondendo 'none'.
'rendering' ou 'completed' → pula com `activation_autostart_skipped`
reason=`server_render_in_flight` (+`server_state`); 401/500/rede/`degraded` →
pula com `server_probe_unavailable` (fail-closed: pular custa um clique manual,
re-despachar custa o trial). Estado `eligible` (nada gasto) continua recuperando
sem sonda. O card azul que já existe mostra "Running at the engine" e vira "Your
video is ready" sozinho. Teste: `scripts/test-activation-recovery-server-truth.mjs`
(28 verificações lendo o arquivo real; 12 provando que o bloco novo não chama
geração/fetch/router/preço/plano/checkout). tsc: só os 4 pré-existentes.
**Para o cliente/receita.** Trial que dá F5 no 1º render deixa de ver "failed"
+ paywall e deixa de perder os 19cr num despacho recusado; o 1º filme chega
pelo caminho normal. ~0,6 pessoa/dia nesse modo (9/14d), todas no momento de
maior conversão.
**SHA:** commit `sprint-assinaturas #2`. **Risco:** baixo — só reduz despacho
automático; nenhum caminho manual mudou. **Como medir:** `activation_autostart_skipped`
com reason `server_render_in_flight`/`server_probe_unavailable` (esperado: ~1/dia);
`activation_autostart_recovery_dispatched` com `secs_after_first < 90` → 0;
`generation_stage_error` com `held=` para quem tem `recovery:true` → 0.
**Placar 22:45 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2, free/
churn 4); cadastros 1h=4, 24h=27; vídeos 1h=1, 24h=18; falhas 24h=17 (speech=Xs
11 — remédio #48 na fila; voiceover 2; compose_daily_free 2; held 1;
narration_too_short 1); checkout_started 24h=1; 7d: 70 com 1 vídeo, 9 com 2, 2
com 3, **0 com 4+**; crons 24h: winback25 120, failure_recovery 0, momentum 0.
**DESTAQUE:** `cinematic_abandoned_no_delivery` = **3 nas últimas 24h**
(74eca199, 489a2c31, ba254eff) — o #1 ainda está na fila (não pushado), então
segue sangrando 1-3 trials/dia. **Próximo item (#3):** não esperar o log — ler
`authorizeCinematicCompletedUrls` + `finish-stranded-renders` e reproduzir o
galho mudo com os claims reais desses 3 (authorized_completed_urls 100%,
compose_submission_claim 0); se for a autorização recusando URL já ligada,
tratar como idempotente por request_id e compor.

### #3 — 22:50→23:10 BRT — o cron de resgate declarava "terminou sozinho" para QUALQUER vídeo do dono
**O que estava errado.** `finish-stranded-renders` (Fase 1) tinha um atalho: se
o usuário tinha QUALQUER `videos.status=completed` criado depois do claim, o
cron concluía `user_finished_themselves` e pulava a geração — sem olhar QUAL
vídeo. Quem tinha um cinematic encalhado (cenas prontas na fal, compose nunca
chamado) e fazia OUTRO vídeo enquanto esperava fazia o cron abandonar o
encalhado para sempre; o refund-sweep estornava 2h depois
(`cinematic_abandoned_no_delivery`). Provado em SQL (14d, externos): dos 21
estornos, **4 têm exatamente esta assinatura** — `authorized_completed_urls`
0/N (o cron nunca chegou a conferir a fal) + 1-2 vídeos completed do mesmo
dono entre o claim e o estorno (ba254eff, rainbowindow1, youcefps442,
sr591910). Caso ba254eff (01/09 23:11, trial do chatgpt.com, celular):
Seedance 19cr aceito 6/6 às 23:12:52 → o banner do ChatGPT o levou para
/studio às 23:13:47 (poll da aba morreu) → voltou às 23:25 e fez um Kineo 1
de 3cr que saiu às 23:28 → a partir daí o cron pulou o Seedance em 8 rodadas
seguidas até o estorno de 01:31. Viu um vídeo de 3cr, perdeu o de 19cr; a fal
foi paga pelos dois. Esse desfecho era silencioso (não estava no SILENT_TERMINAL
do #1 porque parecia sucesso).
**O que mudou.** A pergunta passou a ser "ESTA geração foi composta?": existe
`compose_submission_claim` com `session_id = generation_id` (único caminho de
compose para um claim cinematográfico sem marcador nosso). Existe → pessoa
compôs sozinha (mesmo desfecho de antes). Não existe → segue para a Fase 1
(confere fal, autoriza, compõe). Trava: só decide quando `attempts` = 0 (o
compose que NÓS invocamos também grava esse claim; depois da 1ª tentativa o
teto de 2 e o resgate por e-mail cuidam). Erro da consulta → warn e segue.
Teste: `scripts/test-stranded-own-generation.mjs` (12 verificações). tsc: só
os 4 pré-existentes.
**Para o cliente/receita.** ~2 trials/semana que fizeram um 2º vídeo enquanto o
1º cinematic renderizava (justamente quem tem momentum) passam a receber o
filme pelo cron + e-mail "Your video is ready" em vez de estorno mudo.
**SHA:** `sprint-assinaturas #3`. **Risco:** baixo — só REMOVE um pulo falso; a
Fase 1 tem teto de 3 composes/rodada e 2 tentativas/geração. **Como medir:**
outcomes no log com `user_finished_themselves` caindo; `stranded_composed` para
gens cujo dono tem outro vídeo; `cinematic_abandoned_no_delivery` com
authorized 0/N + outro vídeo → 0.
**Ainda em aberto (padrão B, 13 dos 21):** `authorized_completed_urls` N/N,
`stranded_*` 0, `compose_submission_claim` 0 — alguém autorizou todas as URLs
(client poller ou cron) e o compose nunca foi tentado. Se foi o cron, morreu em
`reload_failed`/`no_authorized_urls` (agora viram `stranded_outcome` com o #1
no ar). Se foi a aba, o compose do cliente não disparou/registrou. Próxima
rodada: ler `stranded_outcome` assim que o #1 subir; se ainda não subiu,
ler `app/api/cinematic-clip-status/route.ts` e o handler de "todas prontas"
do GenerateClient para achar o que impede o compose após a última autorização.
**Placar 23:05 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2, free/
churn 4); cadastros 1h=2, 24h=24 (trial concedido 23/24); vídeos 1h=1, 24h=17;
falhas 24h=17 (script ~33s 2, voiceover 2, compose_daily_free 2, speech= 2,
narration_too_short 1…); checkout_started 24h=1; 7d: 70 com 1, 9 com 2, 2 com
3, **0 com 4+**; crons 24h: winback25 120, failure_recovery 0, momentum 0.
DESTAQUE: abandoned_no_delivery 24h = 3 (1 é o padrão A desta rodada, 2 são
padrão B) — #1+#2+#3 ainda na fila, nada disso está no ar.

### #4 — 23:10→23:45 BRT — o e-mail "Your video is ready 🎬" saía 16 vezes para a mesma pessoa
**Antes de tudo — a fila SUBIU.** origin/main = 575424c5 (Codex, 23:06 BRT) ⊇
86ccdf28: #1, #2 e #3 estão em produção desde ~23:00 BRT. `stranded_outcome`
ainda em 0 (nenhum claim settled sem entrega entrou na janela desde o deploy —
os 9 settled das últimas 20h têm `compose_submission_claim`). A primeira leitura
de causa do padrão B vem na próxima rodada com claim encalhado.
**O que eu fui procurar e o que achei no caminho.** Fui ler os logs da Vercel
dos 8 ciclos do cron entre o claim 630c37a8 (74eca199, 14:30 UTC) e o estorno
(16:30): `checked=13 composed=0` em todos, ZERO linha de `skip=pending/too_few`,
zero `compose failed` — a saída para essa geração foi ANTES do marcador de
tentativa (authorize_failed/reload_failed/no_authorized_urls, todos mudos até o
#1). Perfil do caso: cadastro 14:29:51 → autostart 14:30:11 → 14:31:53 clicou
no `topup_eligibility_handoff` e foi para /pricing (poll da aba morreu com
Seedance a 1 min de vida) → nunca voltou. O 2º padrão-B de hoje (489a2c31) é o
mesmo do #2. Sem o segredo (o `.env.local` da raiz é o exemplo, `your-project`),
não dá para verificar a assinatura do claim offline — fica para o `stranded_outcome`.
**Mas ao listar os claims settled da janela apareceu isto:** a geração 1948c6fa
(mcnivendominic789, trial, 01/09 09:16) tem **16 `stranded_ready_sent`** — o
cron compôs o filme às 09:30 (bom) e mandou "Your video is ready 🎬" às 09:45,
10:15, 10:31, 10:45 … 13:45: dezesseis cópias, uma por ciclo de 15 min, por 4
horas. Não é caso isolado (externos, desde 20/08): 74 e-mails duplicados para
14 pessoas — 16, 14, 14, 13, 7, 5, 4, 3, 3, 3, 3, 2… — e **9 de 9** resgates do
Kineo 1 (Fase 3, `stranded_fast_ready_sent`) saíram repetidos. É a pior
primeira impressão possível no exato minuto de maior propensão a assinar
(primeiro filme na mão): 16 spams da marca, unsubscribe, reputação do remetente
`hello@usekineo.com` no Resend.
**Por quê.** As três portas de e-mail do cron deduplicavam por um lookup EM
LOTE (`.in('session_id', [até 200 ids])`) cujo erro era ignorado (`const { data }
= …`) e cujo resultado alimentava um Set; lote vazio/incompleto = Set vazio =
reenvio para todo mundo naquela rodada, e na seguinte, até a geração sair da
janela de 20h. O mecanismo exato do lote falhar (URL longa? erro transitório?)
ainda não está provado — por isso o conserto não depende dele.
**O que mudou** (`app/api/cron/finish-stranded-renders/route.ts`): antes de
QUALQUER `sendEmail` (ready/rescue/fast) roda `alreadySentDirect()` — consulta
direta por ESTA geração (`.eq('name').eq('session_id').limit(1)`, sem lista),
fail-closed: erro na consulta = não envia (perder um e-mail custa um clique;
mandar 16 custa o cliente). Quando a direta acha o marcador que o lote não
tinha, grava `stranded_dedupe_miss` {event, batch_size, batch_error} e loga
`dedupe MISS` — a próxima rodada lê a causa em SQL. Os erros dos dois lotes
agora vão para o log. Nenhuma decisão de compor mudou. Teste:
`scripts/test-stranded-email-dedupe.mjs` (14 verificações lendo o arquivo
real). tsc: os 4 pré-existentes + 1 NOVO que NÃO é meu —
`components/TrialDowngradeModal.tsx(334)` veio no 575424c5 do Codex
(`ExclusiveClaim` tipo incompatível) — pista dele, anotado, não toquei.
**Para o cliente/receita.** Quem recebe o filme pelo cron passa a receber UM
e-mail. ~1 pessoa/dia deixava de ser spamada (14 em 12 dias). Reputação do
domínio preservada para os crons que vendem (winback, momentum, failure
recovery).
**SHA:** ac3978e4 (sobre 575424c5). **Risco:** baixíssimo — só REMOVE envios;
+1 consulta leve por e-mail candidato. **Como medir:** `select session_id,
count(*) from events where name in ('stranded_ready_sent','stranded_fast_ready_sent')
and created_at > now()-interval '24 hours' group by 1 having count(*)>1` → 0
linhas; `stranded_dedupe_miss` nas próximas 24h = a causa do lote.
**Placar 23:40 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2, free/
churn 4); cadastros 1h=2, 24h=25; vídeos 1h=2, 24h=18; falhas 1h=0, 24h=17
(voiceover 2, compose_daily_free 2, script ~33s 2, speech= 4, held 1);
checkout_started 24h=1; 7d: 71 com 1, 9 com 2, 2 com 3, **0 com 4+**; crons
24h: winback25 120, failure_recovery 0, momentum 0; abandoned_no_delivery 24h
= 3 trials (+1 canário S25 do fundador, 150cr). **DESTAQUE 1:** 5 cadastros
de 24h com 0 créditos — 4 gastaram os 25 do trial (`trial_credits_used=25`) e
foram `downgraded` em 8-40 MINUTOS de vida (variante 7d!, downgrade mediano
aos 40 min: o trial "de 7 dias" acaba quando os 25cr acabam, ou seja, no 1º
Seedance + 1 Kineo 1); 1 (qdd60@hello.nondon.site) nunca recebeu trial
(`trial_credits_granted=0`, sem `blocked`) — descartável, provável anti-abuso
mudo; conferir se o vigia repara errado. **DESTAQUE 2 (pista do Codex, não
toquei):** variante 3d zera o saldo no dia 3 — 49 pessoas perderam em média
18cr não usados. **Próximo item (#5):** ler `stranded_outcome` e
`stranded_dedupe_miss`; se ainda vazio, o item de maior alavanca é o momento
"trial acabou em 40 minutos": quem chega ao downgrade com 1 filme entregue
precisa de uma tela que venda o 2º filme (pista compartilhada — avisar Codex).

### #5 — 23:29→00:05 BRT — o cron de resgate ia MENTIR para a lista mais quente às 03:00 BRT
**Leitura.** `stranded_outcome` = 0 e `stranded_dedupe_miss` = 0 nas 24h (o #4
ainda está na fila; nenhum claim encalhado entrou na janela). Fila ainda NÃO
subiu: origin/main = e544305b (Codex) não contém ac3978e4. Duplicados de "Your
video is ready" nas 24h = 2 sessões (código do #4 não está no ar).
**O que fui olhar.** Os crons "acordados" em 01/09 (`send-failure-recovery` a
cada 6h e `send-momentum-nudge` 13:30 UTC): `failure_recovery_sent` e
`momentum_nudge_sent` = **0 nos últimos 3 dias** (só `winback25_sent` 120). O
`?confirm=SEND` entrou no vercel.json às 21:16 BRT (88803040) — o primeiro
disparo REAL do failure-recovery é às **06:00 UTC = 03:00 BRT de 02/09**, e do
momentum às 13:30 UTC = 10:30 BRT. Reproduzi a elegibilidade do cron em SQL
(48h, `generate_failed`, fora da lista NAO_E_BUG, sem vídeo completo, sem
carimbo, sem opt-out): **11 pessoas** — e **7 delas falharam com "Your script
is about 23 seconds of narration, but you asked for a 35-second video… Add
about 23 more words"**. Isso não é defeito: é o produto recusando 12s de
música sem história. Em 14 dias é a maior causa individual de falha de gente
real (24 falhas · 19 pessoas), e 4 dessas 7 têm os 25cr do trial intactos e
ZERO vídeo. O e-mail que ia sair para elas: "That was our fault — a bug on our
side, and it is fixed now… the same idea will work now". Três mentiras: não
era nosso, não foi consertado, e a mesma ideia com o mesmo roteiro falha
igual. Quem clica, falha de novo e aprende que a marca mente — no exato
público que já fez conta, escreveu o tema e apertou gerar.
**O que mudou** (`app/api/cron/send-failure-recovery/route.ts`):
`classifyFailure()` separa `bug` de `script_short` pela frase real de produção
(regex tolerante a `\n` e cauda truncada). `script_short` recebe e-mail
PRÓPRIO: "nothing was charged, your N credits are still there; your script was
~Xs of narration for a Ys video; two 30-second fixes: pick the length closest
to Xs, or add ~N words" — sem desculpa falsa, sem cupom, sem nomear motor,
utm_campaign `failure_recovery_script`. `bug` segue com o e-mail de desculpa
de antes. `'still holding'`/`'already started is still'` (render vivo segurando
crédito) saíram da lista de defeito. Carimbo `failure_recovery_sent` continua
1× por pessoa e ganha `metadata.kind`; dry-run mostra `by_kind`. Teste:
`scripts/test-failure-recovery-honest.mjs` (31 verificações lendo o arquivo
real, 3 frases reais do banco + 5 defeitos reais). tsc: 4 pré-existentes + o
`TrialDowngradeModal.tsx(334)` do Codex (já anotado no #4), zero meus.
**Para o cliente/receita.** ~4 trials/semana com crédito intacto e zero vídeo,
travados por uma regra que não entenderam, recebem o remédio exato em vez de
uma desculpa que não funciona. É gente a 1 clique do 1º vídeo — a fase onde a
conversão nasce (0,9% → 11,8% no 4º). E a reputação de `joseph@usekineo.com`
não estreia com uma mentira.
**⏰ CORRIDA CONTRA O RELÓGIO:** se o SUBIR-SITE não rodar antes de **03:00
BRT**, o cron de 06:00 UTC dispara a versão antiga para até 25 pessoas (7 com a
desculpa falsa). Depois do carimbo não dá para "desmandar". Se passar, a
próxima rodada mede quantos `failure_recovery_sent` saíram sem `kind` e anota
os e-mails para um follow-up honesto em rascunho.
**SHA:** c10ed216 (sobre 1c78db73). **Risco:** baixo — só muda QUAL e-mail sai
para o subgrupo e remove um grupo da lista; nenhuma decisão de envio nova.
**Como medir:** `select metadata->>'kind', count(*) from events where
name='failure_recovery_sent' and created_at>now()-interval '24 hours' group by
1`; vídeo completo em 48h de quem recebeu `script_short` (meta: ≥30%, hoje 0
desses 7 voltaram); cliques `utm_campaign=failure_recovery_script`.
**Placar 00:00 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=3, 24h=26; vídeos 1h=1, 24h=17; falhas 1h=0;
checkout_started 24h=2; 7d: 70 com 1, 9 com 2, 2 com 3, **0 com 4+**; crons
24h: winback25 120, failure_recovery 0, momentum 0 (ambos ainda antes do 1º
disparo real). **Próximo item (#6):** auditar `send-momentum-nudge` ANTES do
1º disparo real de 10:30 BRT com a mesma técnica (reproduzir a elegibilidade
em SQL e ler a copy contra o que o produto faz hoje — o #4 já mostrou que o
e-mail de "vídeo pronto" prometia 24 Fast quando o Starter dá 8); depois,
`stranded_outcome`/`stranded_dedupe_miss` assim que a fila subir.
### #0b — 23:55 BRT — DESTAQUE (fundador viu ao vivo): adrianwellsvadrian@gmail.com
Cadastro→falha em 4 min pela parede de narração + expansor growth_limit com
candidate_fits=true (texto cabia e foi descartado). Detalhes e correção sugerida no
diário da sprint v1v4 (é o fio #37/#39 dela — não duplicar; se a rodada dela não pegar
até 01:00 BRT, esta sprint pega). Seção 155 do HANDOFF avisada ao Codex.

### #6 — 23:49→00:30 BRT — o e-mail de momentum ia estrear às 10:30 BRT SEM tema para 100% da lista (e o #5 tinha um buraco)
**Leitura.** Fila NÃO subiu (origin/main = e544305b; entrega-atual tinha 4
commits meus + o handoff 156 d3e79e78). `stranded_outcome` e
`stranded_dedupe_miss` = 0 (código ainda na fila). Item planejado: auditar
`send-momentum-nudge` antes do 1º disparo real (13:30 UTC = 10:30 BRT).
**O que estava errado.** Reproduzi a elegibilidade em SQL: 756 vídeos
completos em 30d (abaixo do teto de 1.000 do PostgREST, por enquanto), 44
pessoas com 1-3 vídeos paradas há 20-96h, **24 elegíveis** (20 caem por
crédito < 5 — 19 delas `trial_downgraded`, ou seja o trial acabou antes do
e-mail existir). Todos os 24 são trial de 1-4 dias, 1 vídeo (2 com dois),
6-21cr sobrando, 0 checkout (1 exceção). Aí li o `topic` que o e-mail cita:
**`videos.topic` não guarda tema — guarda o ROTEIRO inteiro** (gancho +
"\n\n" + corpo, capado em 500 chars). O `cleanTopic` da rota devolvia `null`
para qualquer texto > 90 chars → **23 de 23 topics (161-558 chars) → `com_tema:
0`**. O e-mail sairia para TODOS na versão neutra ("You made your first film
with Kineo.") com botão "Make the next one →" para o `/generate` PELADO —
exatamente o destino de 24% que a rodada #24 do sprint v1→v4 mediu contra 53%
da continuação de série, e que aquele commit declarou trocado. A função nova
(`buildSeriesContinuationEmailUrl`) estava lá; o portão antes dela nunca
deixou um tema passar. Ninguém viu porque a rota nunca tinha disparado
(`momentum_nudge_sent` = 0 desde 20/08) e o DRY_RUN só reportava a contagem.
**O que mudou.** `lib/momentumTopic.ts` (novo): o tema é a linha do GANCHO
pela régua da casa (`extractShortTitle` de `lib/resumeStrip.ts` — a mesma de
/history, faixa da home e /studio), com filtro de INSTRUÇÃO: roteiro que
começa com "Create a 40-second Shorts video titled…", "STYLE: Bright…",
"All spoken dialogue must be in FRENCH ONLY.", "Absolutely. Below is a
**complete content package…" (4 casos reais do lote) NÃO vira "Your film
about STYLE: Bright…" — cai na versão neutra. Anchor passou a vir entre aspas
(`Your film “Ever heard of an island where no one can survive?” is sitting in
your library.`) porque gancho termina em ?/!. Sem tema utilizável, texto e
URL são byte a byte os de antes. Tripwire de truncamento na leitura de
`videos`: ≥1.000 linhas → 500 e zero envio (contagem truncada diria "You're
three away" para quem fez cinco). Teste `scripts/test-momentum-topic.mjs`
transpila os .ts com o typescript do repo e prova com os 23 roteiros reais: o
portão antigo rejeitava 23/23; o novo devolve o gancho para 19/19 filmes de
verdade e rejeita os 4 de instrução (40 verificações). tsc: 4 pré-existentes
+ TrialDowngradeModal do Codex, zero meus.
**#6b (achado no placar, consertado na mesma rodada).** 4 falhas na última
hora, 3 delas trial de 1-14 min de vida com 25cr intactos e roteiro curto —
e **2 na forma `no_detail:narration_too_short|stage=failed|http=none`, SEM
números**. A regex do #5 exige os 3 números; esse caso caía em `bug` e
receberia a desculpa falsa às 03:00 BRT. Agora `narration_too_short|
narration_guard` = `script_short` sem números, com versão genérica do mesmo
e-mail (shorter than the length you picked; 2 saídas; sem inventar
segundos). 48h: 3 falhas / 2 pessoas / 2 sem nenhum vídeo. +6 verificações.
**Para o cliente/receita.** Os ~24 primeiros destinatários (e ~8/dia daí em
frente) recebem um e-mail que cita o filme DELES e abre o Studio com o
episódio 2 já na caixa — o caminho que converte 2,2× mais em 2º vídeo, no
único e-mail da casa escrito para levar do 1º ao 4º (0,9% → 11,8%). E duas
pessoas a mais deixam de receber "foi bug nosso" por uma regra de produto.
**SHA:** f519aa7a (#6) + 32a87c70 (#6b), sobre d3e79e78. **Risco:** baixo —
só muda anchor/URL quando há gancho legível; tripwire só nega envio em
saturação. **Como medir:** DRY_RUN → `com_tema` ≥ 18 de 24 (era 0); depois do
disparo, `continuation_source=momentum_email` em `page_view`/`generate_started`
vs cliques totais utm_campaign=momentum; 2º vídeo em 72h dos destinatários
(meta ≥ 30%). `failure_recovery_sent` com `kind=script_short` cobrindo os
`no_detail:narration_too_short`.
**Placar 00:15 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=**7**, 24h=30 (4 com 0cr — os downgrades-relâmpago
do #4); vídeos 1h=1, 24h=17; falhas 1h=4 (narration_too_short 2, script
27s/35s 1, still holding 1), 24h: script curto em 2 formas = 7 de ~12;
checkout_started 24h=3; 7d: 70 com 1, 9 com 2, 2 com 3, **0 com 4+**; crons
24h: winback25 120, failure_recovery 0, momentum 0 (1ºs disparos reais 03:00
e 10:30 BRT — os dois dependem da FILA SUBIR antes). abandoned 24h = 3.
**DESTAQUE:** roteiro curto é a causa nº1 de falha de trial no 1º vídeo (7 das
~12 falhas de 24h, quase todas com 25cr intactos e minutos de vida) e o
produto RECUSA em vez de resolver — a duração é escolhida antes do texto e o
servidor devolve 422. **Próximo item (#7):** no caminho verbatim do Kineo 1,
quando a narração medida for < 95% da duração pedida, o servidor escolhe
sozinho a duração suportada mais próxima da narração (com aviso honesto na
resposta e evento `duration_auto_fit`) em vez de falhar — o e-mail do #5
manda a pessoa fazer à mão o que o código pode fazer no clique. Depois:
`stranded_outcome` assim que a fila subir.

### #7 — 00:06→00:35 BRT — o 1º `stranded_outcome` real apareceu: era o compose recusando filme PAGO A MAIS (e o teto do cron gastava as 2 balas no mesmo 400)
**Leitura.** A fila SUBIU duas vezes durante a rodada (origin/main =
585d8fdf; #4, #5, #6, #6b e o handoff 156 estão em produção). O v1v4 fechou o
caso adrianwells (914eb661, expansor apara por frase) — item #7 planejado
(auto-fit de duração) fica com aquela sprint, que já está em cima. E o
`stranded_outcome` do #1 finalmente falou: **1 evento, `compose_error_400`**.
**O caso (bf531fae / wummm709, TAAFT, 02:53 UTC).** Cadastro → auto-start
Seedance 45s (o seletor não tem 45; o auto-start manda) → a página RECARREGA
2s depois do despacho (é o "dispara 2x" do handoff 156) → recovery aos 17s
(o #2 não segurou: a sonda rodou aos 02:53:21, o claim do 1º despacho só
assentou aos 02:53:29 — o servidor ainda estava processando o POST; buraco
de corrida, anotado abaixo) → `held=19` → tela "credits held" → 2 rechecks →
**clicou em checkout do Basic ($15) aos 4 min de vida** → dispensou o banner.
Enquanto isso o 1º filme: 5/5 cenas aceitas, 19cr debitados, ninguém para
compor (poll da aba morreu no reload). O cron chegou às 03:07 e o compose
devolveu **400 "These AI clips do not match their signed generation"**.
**Causa, medida no código e no banco.** O resgate de alvo fantasma (v1v4
#20, 31/08) troca 45s→35s na linha ~2190 de generate-video-cinematic — DEPOIS
do custo (linha 1386) e do débito (2081). O claim nasce `credit_cost=19`
(preço de 45s) com `response.duration=35` (preço 15). O navegador passava por
SORTE (manda o 45 do próprio estado → 19 = 19); o cron manda a verdade do
claim (35 → 15 ≠ 19) e era recusado. O comentário do #20 dizia "nada de
preço/crédito muda (engineCost não olha duração)" — olha desde 20/08. Em 14d:
2 gerações com essa assinatura (01/09 compôs pelo navegador com 45, 02/09
morreu no cron); vai crescer porque o auto-start do trial pede 45s.
**O que fiz e o que NÃO fiz.** Escrevi o conserto do gate (pago ≥ preço do
render passa; render maior que o pago segue 400; evento
`compose_paid_above_render` com `overpaid_credits`) — 25 verificações — e ao
enfileirar descobri que **outra sessão já tinha consertado o MESMO ponto
7 min antes (489b2a66, 00:10 BRT, "em modo de resgate o custo de confiança é
o do claim"), e o fundador já tinha clicado**. Descartei o meu (regra nº 0:
não duplicar). Diferença que fica em aberto: o deles só relaxa o gate para o
cron (`isServiceFinish`); o navegador continua passando com 45 e compondo um
timeline de 45s para cenas planejadas em 35s — e a pessoa pagou 19 por um
filme de 35s (preço 15). Nenhum dos dois consertos devolve os 4cr; é
decisão de crédito do fundador (abaixo).
**O que entreguei de verdade (#7).** Com o conserto no ar, o cron AINDA
não entregaria o filme do bf531fae: as 2 tentativas do teto foram gastas
às 03:07 e 03:15 UTC com o mesmo 400 determinístico, antes do deploy. Um
400 do compose só muda com deploy — o teto não sabia disso e desistia
(e-mail de resgate "one click to finish" para quem não tem como clicar).
Agora (`finish-stranded-renders`): o lote de marcadores lê também
`stranded_outcome`; quando TODOS os desfechos anteriores da geração são
`compose_error_4xx`, o teto ganha UMA tentativa extra (2→3). 3º 400 →
desiste como antes. Qualquer outro desfecho (threw, 5xx, nenhum) mantém 2.
Custo de fornecedor zero (compose não re-despacha cena). Teste:
`scripts/test-stranded-extra-attempt-4xx.mjs` (17 verificações). tsc: os 5
pré-existentes (4 acacia/BRL + TrialDowngradeModal do Codex).
**Para o cliente/receita.** bf531fae recebe o filme + "Your video is ready"
no 1º ciclo do cron depois do deploy (se subir antes do refund-sweep, ~04:53
UTC = 01:53 BRT; depois disso o claim é estornado e o filme morre). É um
trial que já quis pagar $15 — a entrega é o que decide se ele volta ao
checkout. E toda regressão futura de 400 no compose ganha uma chance de
entrega pós-deploy em vez de virar estorno mudo.
**SHA:** b1c1d28d (sobre 585d8fdf). **Risco:** baixíssimo — +1 tentativa
bounded, só em 4xx repetido. **Como medir:** log `extra attempt after Nx
compose_error_4xx`; `stranded_composed` para e7f9f000; `stranded_outcome`
com `compose_error_4xx` seguido de `stranded_composed` na mesma gen.
**⚠ Corrida do #2 (para a próxima rodada ou handoff):** a sonda
`/api/compose/active` roda no momento da elegibilidade (02:53:21) e o
claim do 1º POST só assenta ~12s depois do despacho (02:53:29) — o servidor
ainda está no meio do generate-video-cinematic. Recovery em < 60s do 1º
despacho deveria ESPERAR (re-sondar a cada 5s até 60s) antes de decidir
'none'. É o buraco pelo qual o held=19 deste caso passou mesmo com o #2 no
ar.
**Decisão do fundador (crédito):** ghost 45→35 cobra 19 e entrega 35s (15).
Opções: (a) estornar 4cr por evento `compose_paid_above_render`/claim com
duration≠cobrada (2 casos em 14d, 8cr); (b) fazer o resgate ANTES do custo
(mover o bloco de narração para antes da linha 1386 — mudança grande no
route.ts, pista compartilhada com v1v4); (c) o auto-start parar de pedir
45s (pedir 35, que é o que o seletor vende e o que o trial_first_seedance_
35s_v2 diz no nome) — é a mais barata e mata o fantasma na origem. Minha
recomendação: (c) já, (a) manual para os 2 casos.
**Placar 00:30 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=6, 24h=30 (4 com 0cr — downgrades-relâmpago do
#4); vídeos 1h=2, 24h=18; falhas 1h=7 (narration_too_short 2, speech=3s/60s
2, speech=27s/35s 1 [adrianwells], held=19 2 [este caso]); checkout_started
24h=3 (1 é o bf531fae deste caso); 7d: 71 com 1, 9 com 2, 2 com 3, **0 com
4+**; crons 24h: winback25 120, failure_recovery 0, momentum 0 (1ºs disparos
03:00 e 10:30 BRT — #5/#6 JÁ estão no ar); stranded_outcome 24h=1 (este);
abandoned_no_delivery 24h=3. **Próximo item (#8):** a corrida do #2 acima
(esperar o claim assentar antes de declarar 'none') — é a raiz deste caso e
do 489a2c31 de ontem; depois, às 03:05 BRT, ler `failure_recovery_sent` por
`kind` (1º disparo real).

### #8 — 00:34→00:55 BRT — a sonda do #2 dizia 'none' 8 segundos antes do claim existir e liberava o re-despacho que matava o trial
**Leitura.** Fila NÃO subiu (origin/main = 585d8fdf; entrega-atual = a05a88b5
com o #7). Worktree da OneDrive travou (`index.lock` que o sistema não deixa
apagar — o mesmo defeito documentado no enfileirar.sh); rodada feita em clone
compartilhado em /tmp, como o próprio script manda. Item planejado: a corrida
do #2.
**O que estava errado.** O #2 só re-despacha um `dispatched:<ts>` de conta
grátis quando `/api/compose/active` responde 'none'. Mas a sonda lê o claim
cinematic e a linha em `videos` — e o claim do 1º POST só assenta ~12s DEPOIS
do despacho (e7f9f000: F5 às 02:53:21, claim às 02:53:29; o servidor ainda
estava no meio do generate-video-cinematic). Nessa janela 'none' é verdade e
não prova nada. Foi por aí que 489a2c31 (01/09) e e7f9f000/wummm709 (02/09,
02:53:46, visto pelo fundador) passaram COM o #2 no ar: re-despacho, servidor
recusa com `held=19`, tela 'failed' + UpgradeModal aos 4 min de vida.
`activation_autostart_recovery_dispatched` 24h = 2 — os dois nesse modo.
**O que mudou.** `GenerateClient.tsx` (zona compartilhada — aviso ao Codex:
só o rail de ativação, bloco `dispatchedRecovery`). Veredito 'idle' com menos
de 60s desde o `dispatched:<ts>` (5× os 12s medidos) = ESPERAR: volta a
'pending', rearma a sonda e re-sonda a cada 5s; 'rendering'/'completed' em
qualquer sondagem pula na hora (ramo do #2, intacto); só um 'none' com 60s+
libera o recovery. Teto de 14 re-sondagens → skip `server_probe_unavailable`
(relógio torto no futuro termina em skip, nunca em laço). ts ilegível =
comportamento antigo. Rastro: `activation_autostart_waiting`
reason=`server_claim_settling` (uma vez, com `secs_after_first`) e
`settle_probes`/`secs_after_first` no `recovery_eligible` e no `skipped`.
Teste `scripts/test-activation-recovery-claim-settle.mjs` (37 verificações,
lendo o arquivo real: ordem busy-antes-de-esperar, teto testado antes de
contar, cleanup do tick, nada novo chama geração/cobrança); o do #2 segue
28/28. tsc: 3 pré-existentes (2 acacia + TrialDowngradeModal), zero meus.
**Para o cliente/receita.** O trial que dá F5 nos primeiros segundos do 1º
render (o momento de mais ansiedade — ~0,6 pessoa/dia) espera até 60s vendo o
card azul "Running at the engine" em vez de virar 'failed' + paywall com o
trial inteiro preso. É o caso exato que o fundador viu ao vivo hoje.
**SHA:** eb1949f2 (sobre a05a88b5). **Risco:** baixo — só ADIA um re-despacho
automático em até 60s; nenhum caminho manual mudou; conta paga continua
nunca recuperando (D1). **Como medir:** `activation_autostart_waiting`
reason=server_claim_settling (~1/dia); `activation_autostart_recovery_dispatched`
com `secs_after_first < 60` → 0; `generation_stage_error` `held=` com
`recovery:true` → 0; `skipped` reason=server_render_in_flight deve subir na
mesma medida em que recovery_dispatched cai.
**Placar 00:50 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=4, 24h=30 (4 com 0cr); vídeos 1h=1, 24h=17; falhas
1h=11 (**prompt_len=6228 limite=5000 ×7**, speech 27s/35s 2, held=19 2);
checkout_started 24h=5; 7d: 70 com 1, 9 com 2, 2 com 3, **0 com 4+**; crons
24h: winback25 120, failure_recovery 0, momentum 0 (1ºs disparos 03:00 e
10:30 BRT); stranded_outcome 24h=2; recovery_dispatched 24h=2; skipped 24h=7.
**DESTAQUE (vira o #9):** adrianwellsvadrian (cadastro 02:48 UTC, 25cr
intactos, 0 vídeos, o mesmo que o fundador viu falhar por narração curta)
tentou **7 vezes em 21 min (03:09→03:30 UTC)** e as 7 morreram no cliente com
`analyze_prompt_too_long`: prompt_len=6228 > 5000. O textarea tem
maxLength=5000, então os 6.228 chars NÃO vieram do teclado — foram
REMONTADOS pela própria tela (GenerateClient.tsx:7333; hipótese: o texto
expandido/instruções da tentativa anterior de 27s/35s colados de volta na
caixa, ou prefill acumulando). A mensagem manda "Trim it" para um texto que
a pessoa não escreveu. É a 2ª parede do mesmo trial em 40 min de vida.
**Próximo item (#9):** reproduzir o remonte (ler `analyze_prompt_too_long`
com `prompt_len` e o `topic` das tentativas dele), fazer o cliente cortar
sozinho o que ELE acrescentou (ou subir o teto do analyze quando o excedente
é instrução nossa) e nunca mandar "trim" por texto que não é do autor.
Depois, 03:05 BRT: `failure_recovery_sent` por `kind` (1º disparo real).

### #9 — 00:55→01:05 BRT — (registro tardio) a caixa do /studio não tinha teto nem contador
Código subiu em 65758b05 (na main, fundador clicou); o diário desta rodada
não foi commitado pela sessão anterior. Resumo: adrianwells bateu 7× em
`prompt_len=6228 limite=5000` porque o /studio deixava colar 6.228 chars e só
a tela SEGUINTE dizia "Trim it" numa caixa que não deixa editar. Agora o teto
(5.000, lib/analyzeLimits) é medido no /studio, contador exato, botão vira
"Trim N characters to continue" e "✂ Trim to fit" corta na última frase
inteira. Eventos `studio_prompt_over_limit_shown`/`trimmed_to_limit`.
**Como medir:** `analyze_prompt_too_long` no cliente → 0 depois do deploy.

### #10 — 01:09→01:30 BRT — 4 dos 7 assinantes estão dormindo com crédito acumulando e ninguém escreve para quem JÁ paga
**Leitura.** origin/main = 872ac41c (o fundador clicou: #7, #8, #9 e o
"coerência história × duração" de outra sessão estão em produção); fila 0.
Worktree da OneDrive continua travada (`unlink: Operation not permitted`,
`index.lock` imortal) — rodada em clone compartilhado em /tmp, como o
enfileirar.sh manda. Diário do #9 faltava: registrado acima.
**O que estava errado.** Olhei os PAGANTES, não os trials. Dos 7 assinantes
externos com assinatura viva: **akajitin** (Starter, **172cr** = 4 meses de
grant intactos, último vídeo 03/08), **den.higgins** (Creator, 140cr, **1 vídeo
na vida**, último 08/08, visitou 31/08 e não gerou), **noelrss21** (Creator,
63cr, último 24/08), **emilio** (Starter, renovou 01/09, 40cr, **0 vídeos**).
São ~$56 dos ~$109 de MRR pagando por saldo parado. `events ilike '%sent%'`
em 7d para os 4 = **nada**. Todas as 16 rotas `send-*` do /admin e os 3 crons
miram quem NÃO pagou (winback, abandon, stalled, upsell, pack…). Quem paga e
não usa é invisível — e cancela ressentido no dia em que repara na fatura.
**O que mudou.** Nova rota admin `/api/admin/send-subscriber-idle` + módulo
puro `lib/lifecycle/subscriberIdle.ts`. Coorte ao vivo: has_paid · plano pago
com id de assinatura (Stripe/PayPal/Paddle) · opt-in · externo · ≥25cr (1
filme Seedance pela tabela real) · sem vídeo completo há ≥10d ou nunca · sem
atividade 24h (pode estar num render) · sem `subscriber_idle_sent` em 30d.
E-mail pessoal e honesto: "você está no plano X, seu último vídeo foi há N
dias, tem C créditos parados = F filmes Seedance ou K shorts Kineo 1; prefiro
que você tire filmes disso a pagar por saldo parado" + **3 ideias de 1 clique**
(a 1ª é "Part 2" do PRÓPRIO último vídeo; URL usa exatamente os params que o
/studio já lê: engine/prompt/duration=60/script_mode=ai + utm_campaign=
subscriber_idle) + o que mudou (Lyria 3, MiniMax 2.8 HD, Kling 3/Omni, Nano
Banana Pro) + "hit reply, it lands with me". Sem desconto, sem cupom, sem
crédito de presente (o problema é motivo, não saldo), sem preço (pista do
Codex). Dry-run por padrão, `?confirm=SEND`, lote ≤20, stamp só depois do
Resend aceitar. NÃO toca crédito, plano nem assinatura. tsc: só os 3
pré-existentes. Teste `scripts/test-subscriber-idle.mjs` (37 verificações,
incluindo: route.ts não exporta nada além de GET/config; copy sem preço; URL
bate com StudioClient). Smoke real do módulo compilado: 172cr → "6 full AI
films on Seedance, or 34 quick Kineo 1 shorts"; Emilio → "Your 40 Kineo
credits haven't been used yet".
**Para o cliente/receita.** É retenção de MRR: 4 pessoas × $7-15/mês que hoje
só recebem silêncio. Um assinante que faz 1 filme no mês seguinte à cobrança
é um assinante que não abre a fatura para cancelar. E o "Part 2" do próprio
vídeo é o caminho mais curto até o 4º vídeo (11,8% de conversão/retenção).
**SHA:** 38ac6d9c (sobre 872ac41c). **Risco:** baixo — só admin, dry-run
por padrão, nenhum efeito sem clique. Risco de copy: nenhum. Risco de fluxo:
se a pessoa estiver deslogada, /studio redireciona para login — conferir na
1ª leitura de cliques se `?prompt=` sobrevive ao login (senão, próximo item).
**Como medir:** `subscriber_idle_sent` (4 esperados no 1º disparo); em 7d,
`videos completed` desses 4 user_ids; `utm_campaign=subscriber_idle` nos
page_views; respostas no Gmail (SLA ≤48h — regra de 24/08). Sucesso = 2 dos
4 fazem um vídeo em 7 dias.
**⚠ REGRA DO SLA:** este e-mail pede resposta. Toda resposta que chegar tem
que ser respondida em ≤48h (a lição do Rick) — vou varrer o Gmail nas rodadas.
**Placar 01:10 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=3, 24h=32 (4 com 0cr); vídeos 1h=1, 24h=18;
falhas 1h=6 (`prompt_len=6228` ×6 — adrianwells, o #9 subiu há minutos);
3h: narration_too_short ×2 + speech=3s/60s ×2 (asuquoalbert — 7 palavras
para 60s; remédio é o preflight #48 da v1v4, já na main), held=19 ×2
(wummm709, caso do #8); checkout_started 24h=5; 7d: 71 com 1, 9 com 2, 2
com 3, **0 com 4+**; crons 24h: winback25 120, failure_recovery 0, momentum
0 (1ºs disparos 03:00 e 10:30 BRT).
**Próximo item (#11):** ler `failure_recovery_sent` por `kind` depois das
03:05 BRT (1º disparo real do #5/#6). Antes disso: os 2 "free" com
`stripe_subscription_id` e has_paid (valos87196 73cr/7 vídeos, brandonmooney4
20cr/6 vídeos) — são ex-assinantes que cancelaram MAS ainda têm crédito e
histórico de uso; hoje nenhum win-back fala com eles (winback25 exige
`video_credits=0` e `has_paid=false`). Coorte pequena, valor alto: já pagaram
uma vez.

### #11 — 01:29→01:45 BRT — o e-mail de fim de trial dizia "nada que mandamos virou vídeo" para quem tinha 5 clipes na Library
**Leitura.** origin/main = ee5270d1 (Codex subiu 2 commits de medição:
66e9fb4b, ee5270d1); fila tinha 2 (#10 + diário). Worktree `.claude/worktrees/
claude-assinaturas-24h` está presa a outra sessão (`locked`, caminho
/sessions/cool-bold-euler) — rodada em clone compartilhado `/tmp/assin-r11`
em cima de `entrega-atual`. ⚠ Lição de processo: `enfileirar.sh` rodado
DENTRO do clone move a `entrega-atual` do CLONE (o `--git-common-dir` é o
próprio .git dele), e o `origin/main` do clone é a `main` LOCAL obsoleta
(727a869) — daí "fila atual: 560". O que vale é o push final
`git push <raiz> HEAD:refs/heads/entrega-atual` só depois de provar que a
ponta real é ancestral do meu HEAD (`merge-base --is-ancestor`). Feito assim;
nada alheio foi tocado (fila = #10 + diário + #11).
**O que estava errado.** xzavior000 (TAAFT, 25cr, 02/09 00:31 UTC) é o lead
mais quente da noite: abriu /pricing DUAS vezes antes de gastar, foi ao
/animate e fez **5 clipes de 10s em 24 minutos**, todos entregues. No 5º bateu
no teto (`trial_expired reason=credit_cap`), foi rebaixado 30s depois
(`trial_downgraded`) e às 01:25 UTC recebeu o `downgraded_loss` na versão
"nunca rodou": assunto **"Your first video is one click away"**, corpo
**"nothing we sent you actually put a finished video in your hands"** + 3
temas de 1 clique "no free plan". Ele tinha 5 clipes na Library e 0 créditos.
É copy que mente para quem acabou de provar que o produto funciona — e o
e-mail seguinte na fila dele é o pedido de dinheiro (D5). Causa: o ponto cego
já anotado em 24/08 (`/animate`, `/images`, `/audio` NÃO criam linha em
`videos`) chegou aos e-mails de ciclo de vida: `neverRan = videosMade === 0`.
Medido 30d: **13 downgraded_loss, 10 ending_soon, 11 D5, 6 D10** foram para
gente com 0 `videos` e entrega em outro produto (9 dos 13 via Animate).
Poucos — mas são os que GASTARAM o trial.
**O que mudou.** `lib/lifecycle/otherDeliveries.ts`: conta clipes do Animate
(`animate_job_settled outcome=delivered`, por `billing_reference` DISTINTO),
`images` e `audios` por conta, paginado com ORDER BY estável, FALHA ABERTA por
fonte (zeros + `other_deliveries_degraded` nas 3 respostas do cron). No
`downgraded_loss`: `neverRan` exige 0 vídeos **E** 0 entregas; quem só tem
clipes/imagens/áudios recebe o e-mail "de quem tem vídeo" com a frase certa:
"The **5 animated clips** you already made are yours — they stay in your
Library" (número medido; nunca imprime "0 clips"). `ending_soon`, D5 e D10
intocados byte a byte. Sem crédito, sem cupom, sem preço. tsc: só os 3
pré-existentes. `scripts/test-other-deliveries.mjs`: 29 verificações (dedupe
de 45 linhas → 5 clipes; refunded não conta; fail-open por fonte; ending_soon
sem toque; ramo não concede nada).
**Para o cliente/receita.** O e-mail que antecede o pedido de compra deixa de
chamar de "nunca tentou" quem usou tudo. Para o xzavior da próxima noite: "os
5 clipes são seus + Creator devolve os motores" em vez de "faça seu primeiro
vídeo". É o grupo com maior intenção provada (gastou 100% em <30 min).
**SHA:** 2994355e (sobre 27aecbec). **Risco:** baixo — 3 leituras a mais por
run do cron (coorte pequena, paginadas); erro de leitura = copy de hoje.
**Como medir:** `trial_lifecycle_email_sent kind=downgraded_loss` para
user_id com 0 `videos` e `animate_job_settled delivered` → o assunto deixa de
ser "Your first video is one click away" (checar `subject` se o cron gravar;
senão, cruzar com o Resend). `other_deliveries_degraded=false` no JSON.
**Dívidas achadas (não bloqueiam):**
1. `sweepPublishedAnimateJobs` NÃO converge: o guarda nº 3
   (`.contains('metadata', {billing_reference})`) não acha o evento que ele
   mesmo gravou — um job de 31/08 tem **43** `animate_job_settled`, 2.407 no
   total desde 16/08, e o cron pergunta ao fal a cada hora por 7 dias por
   clipe feliz. Custo: chamadas de status (não cobradas) + ruído no `events`.
   Hipótese: o `contains` sobre jsonb com `->>` alias vs objeto; conferir com
   `metadata->>billing_reference = eq.` em vez de `cs`.
2. xzavior nunca viu checkout: ao zerar no /animate, o que a tela mostra?
   Ele tinha intenção de preço (2 pricing_view) e 5 entregas em 24 min — o
   momento "acabou o crédito no 5º clipe" é o melhor paywall da casa e hoje
   não existe medição (`animate_*` não tem evento de paywall). Candidato a
   #12 se a medição das 03:05 não trouxer nada pior.
**Placar 01:29 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=3, 24h=32 (4 com 0cr — todos `trial_downgraded`
por teto ou relógio, nenhum órfão); vídeos 1h=2, 24h=19; falhas 3h: as mesmas
do #10 (adrianwells prompt_len ×7 — pré-#9; asuquoalbert speech=3s/60s ×2 +
narration_too_short ×2; wummm709 held=19 ×2), **nada novo na última hora**;
checkout_started 24h=5; 7d: 72 com 1, 9 com 2, 2 com 3, **0 com 4+**; crons
24h: winback25 120, failure_recovery 0, momentum 0, subscriber_idle 0 (rota
do #10 ainda na fila).
**Próximo item (#12):** às 03:05 BRT ler `failure_recovery_sent` por `kind`
(1º disparo real). Se vazio de novidade: o paywall do /animate no momento
"5º clipe zerou o saldo" (dívida 2 acima) — em pista minha (produto pós-login).

### #12 — 01:49→02:08 BRT — o /animate não tinha parede quando o saldo zerava
**Leitura.** origin/main = a83e89e7 (o fundador clicou: o #11 já está na
main); fila tinha 1 (diário do #11). Ainda não são 03:05 (1º disparo real do
failure_recovery), então fui na dívida 2 do #11. Rodada em clone `/tmp/assin-r12`
sobre `entrega-atual`, push final `HEAD:refs/heads/entrega-atual` depois de
provar ancestral (lição do #11).
**O que estava errado.** Medido 30d (externos): **17 pessoas receberam clipe
do Animate; 13 estão HOJE com <5cr e nunca pagaram; só 4 das 17 abriram um
checkout algum dia.** O xzavior000 de ontem é o retrato: 2 pricing_view, 5
clipes em 24 min, saldo zerado — e a tela respondeu "you have 0 credits" em
vermelho e um botão cinza. `/images` e `/audio` abrem o popup de recarga no
402 desde 18/08; o `/animate` não abria NADA — nem no 402, nem quando o clipe
que acabou de chegar zerou o saldo, nem quando a pessoa entra sem saldo. É a
melhor intenção de compra da casa (gastou 100% em <30 min) morrendo num
beco. Detalhe que teria virado bug: o popup de recarga NÃO serve para
trial/free/starter — o checkout recusa com `topup_requires_creator_plus` e
joga a pessoa no /pricing com erro (é o que /images e /audio fazem hoje com
quem não é Creator/Studio; anotado abaixo).
**O que mudou.** `lib/animate/paywall.ts` (puro) + `AnimateClient`. A parede
aparece nos 3 momentos — entrou sem saldo (coluna do formulário, no lugar
do botão morto), o clipe chegou e zerou (embaixo do PRÓPRIO vídeo, onde os
olhos estão), e 402. Destino pela MESMA regra do checkout
(`canPurchaseCreditTopup`): Creator/Studio → `CreditsTopupModal`
surface `animate_402` (no 402 abre direto, como images/audio); trial/free/
starter → 3 linhas **Starter 40cr = 8 clips $7 · Creator 90cr = 18 clips
$15 (destacado) · Studio 180cr = 36 clips $29**, todas derivadas de
`TIER_CREDITS`/`TIER_PRICES`/`ANIMATE_COST` (zero dígito à mão), CTA
`/pricing?utm_campaign=animate_out_of_credits`. Título honesto com número
real: "Out of credits — the 5 clips you just made are yours." (nunca "0
clips"). `ANIMATE_COST` ganhou casa cliente-safe (`lib/animate/cost.ts`;
`service.ts` importa node:crypto e não podia entrar no cliente; re-exporta) e
o "Cost per clip **5 credits**" digitado virou derivado. Eventos
`animate_paywall_shown` / `animate_paywall_cta` (reason
insufficient_402|balance_after_clip|balance_on_load, destination, plan,
credits, clips_this_session), 1 por motivo por visita. Nada de crédito, cupom,
preço novo ou UpgradeModal (que ainda promete "priority render queue").
tsc: só os 3 pré-existentes. `scripts/test-animate-paywall.mjs`: **59
verificações** (executa o módulo com as tabelas REAIS lidas de
checkoutPricing/topupEligibility; prova que trial nunca vai ao popup de
recarga; que o cliente não usa service.ts; copy sem promessa da lista).
**Para o cliente/receita.** O momento de maior intenção do /animate deixa de
ser um beco: 13 pessoas/mês zeram ali e hoje 0 delas veem uma oferta. Se 1 em
13 assina o Creator (o plano que a parede destaca — é o 1º que também compra
recarga), é +$15 MRR/mês só desta tela; e Creator/Studio que zeram passam a
ter a recarga a 1 clique em vez de "0 credits" em vermelho.
**SHA:** 2fad963f (sobre 01f0fc46). **Risco:** baixo — só UI do /animate + 1
const movida (rotas importam do mesmo lugar). Cuidado real: a parede lê o
`plan` de /api/credits; se ele demorar, a 1ª parede pode nascer como
"pricing" para um Creator por 1 render — o clique é reavaliado na hora, então
o pior caso é a lista de planos aparecer por um instante.
**Como medir:** `animate_paywall_shown` por reason/destination (esperado:
~13/mês); `animate_paywall_cta` → `checkout_started` com
`pricing_surface=credits_topup_modal_animate_402` ou `page_view` /pricing com
`utm_campaign=animate_out_of_credits`; conversão desses user_ids em
`has_paid` em 7d. Sucesso = 1 assinatura vinda do /animate em 30d (hoje 0).
**Dívida achada (não bloqueia, pista minha):** `/images` e `/audio` abrem o
`CreditsTopupModal` no 402 para QUALQUER plano — um trial que clica num pack
leva o `topup_requires_creator_plus` no checkout e cai no /pricing com erro
vermelho. Medido: 0 checkout_started por `credits_topup_modal_images/audio`
em 30d, então ninguém chegou a clicar — mas a lista de planos derivada do #12
serve pronta para as duas telas. Candidato a rodada curta.
**Placar 02:05 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=1, 24h=32 (4 com 0cr, todos rebaixados por
teto/relógio); vídeos 1h=1, 24h=19; **falhas 1h=0**; 3h: as mesmas do #10/#11
(adrianwells prompt_len ×7 pré-#9; asuquoalbert speech=3s ×2 +
narration_too_short ×2; wummm709 held=19 ×2) + 1 nova `speech=27s
target=35s` (gate honesto, script curto — não é falha de motor);
checkout_started 24h=5; 7d: 72 com 1, 9 com 2, 2 com 3, **0 com 4+**; crons
24h: winback25 120, trial_lifecycle 102, failure_recovery 0, momentum 0,
subscriber_idle 0 (rota do #10 na main desde o clique — link de 1 clique
continua válido).
**Próximo item (#13):** às 03:05 BRT ler `failure_recovery_sent` por `kind`
(1º disparo real). Se vazio: a dívida acima (images/audio mandando trial ao
popup de recarga) — 20 min, reaproveita `animatePlanRows`.

### #13 — 02:09→02:30 BRT — o 402 do /images e do /audio mandava trial/free/starter comprar um pack que o checkout recusa
**Leitura.** origin/main = 293adb7b (Codex subiu 2 commits de afiliados por cima do
a83e89e7; a fila b8cc1cfb do #12 continua válida — o bat v9 rebasa). Ainda não são
03:05 (1º disparo real do failure_recovery), então fui na dívida anotada no #12.
Rodada em clone `/tmp/assin-r13` sobre `entrega-atual`, push final
`HEAD:refs/heads/entrega-atual` depois de provar ancestral.
**O que estava errado.** Desde 18/08 o 402 "Not enough credits" do /images e do
/audio abre o `CreditsTopupModal` (packs one-time) para QUALQUER plano. Recarga só
existe para Creator/Studio (`lib/growth/topupEligibility`, a mesma regra que
`/api/stripe/checkout` aplica): trial, free ou Starter que clicava num pack levava
`topup_requires_creator_plus` (403) e caía no /pricing com um erro vermelho — a
pior porta de entrada possível para a página de preços. **Medido 30d (externos): 9
pessoas usaram /images ou /audio; 7 estão hoje sem pagar e com <5cr; 0
`checkout_started` por `credits_topup_modal_images_402`/`audio_402`.** O beco
nunca converteu ninguém. Bônus do mesmo defeito: o link "Add credits →" dentro do
erro abria o mesmo pack recusado, e no /images os 3 pontos de 402 (generate,
edit, upscale) faziam isso.
**O que mudou.** `lib/credits/outOfCreditsPlans.ts` (puro; generaliza o
`animatePlanRows` do #12 para qualquer custo de unidade) + novo
`components/OutOfCreditsPlansModal.tsx` + os dois clientes. Cada cliente lê
`plan`/`credits` de `/api/credits` (mesma fonte do /animate) e `openCreditsWall()`
decide pela MESMA regra do checkout: Creator/Studio → `CreditsTopupModal` como
antes (surface `images_402`/`audio_402` intacta); trial/free/starter/desconhecido →
modal com 3 linhas **derivadas** de `TIER_CREDITS`/`TIER_PRICES` e do custo REAL da
unidade — no /images é o motor selecionado ("Starter 40 cr/mo = **20 images**
$7.00/mo" com FLUX Dev; 8 com Nano Banana), no /audio é o custo do clipe pedido
("= 20 audio clips"). Título honesto com o número da visita ("the 3 images you
just made are yours", nunca "0"), CTA `/pricing?utm_campaign=images|audio_out_of_credits`.
Plano desconhecido = planos (destino seguro: nunca manda ninguém a um pack
recusado). Eventos `images_paywall_shown`/`_cta` e `audio_paywall_shown`/`_cta`
(plan, credits, unit_cost, made_this_session). Nada de crédito, cupom, preço novo
ou toque no `CreditsTopupModal`. tsc: só os 3 pré-existentes.
`scripts/test-out-of-credits-plans.mjs`: **65 verificações** (módulo executado
com as tabelas REAIS; prova que starter/free/trial/null nunca vão ao pack, que o
modal de planos não importa checkout, que nenhum dígito de preço/crédito foi
escrito à mão, e que os 3 pontos de 402 do /images passam pela regra).
**Para o cliente/receita.** Quem zera crédito em imagem/áudio deixa de ver um
erro 403 e passa a ver "seu plano compra N imagens por mês" com o motor que ela
acabou de usar — o número que ela entende. É pouca gente (9/mês) mas é gente que
GASTOU o trial em <30 min, o perfil que mais compra; hoje 0 dessas 9 passou pelo
checkout a partir desta tela. Sucesso = 1 assinatura com utm `*_out_of_credits`
em 30d.
**SHA:** eecb562c (sobre b8cc1cfb). **Risco:** baixo — só UI dos dois clientes +
1 componente + 1 módulo novo; nenhuma rota tocada. Cuidado real: se `/api/credits`
falhar, `plan` fica 'free' e um Creator vê a lista de planos em vez da recarga
por 1 render — o clique é reavaliado depois do `refreshPlan()`.
**Como medir:** `images_paywall_shown`/`audio_paywall_shown` por plan;
`*_paywall_cta` → `page_view` /pricing com `utm_campaign=images_out_of_credits`
ou `audio_out_of_credits` → `has_paid` em 7d. Contraprova: `checkout_started` com
`pricing_surface=credits_topup_modal_images_402` só de basic/pro daqui pra frente.
**Placar 02:25 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2, free/churn
4); cadastros 1h=1, 24h=32 (4 com 0cr — os mesmos do #12, rebaixados por
teto/relógio); vídeos 1h=0, 24h=18; **falhas 1h=0**; 3h: as mesmas de antes
(adrianwells prompt_len ×7 pré-#9 + speech=27s; asuquoalbert speech=3s/
narration_too_short; wummm709 held=19) — nada novo; checkout_started 24h=5; 7d:
72 com 1, 9 com 2, 2 com 3, **0 com 4+**; crons 24h: winback25 120,
trial_lifecycle 102, failure_recovery 0, momentum 0, subscriber_idle 0.
**Próximo item (#14):** às 03:05 BRT ler `failure_recovery_sent` por `kind` (1º
disparo real do cron acordado em 01/09 — se mandar a versão errada para alguém,
vira o item). Se vazio/ok: o `UpgradeModal` ainda promete "priority render queue"
(copy que mente, lista do CLAUDE.md item 4) — é zona compartilhada, entrar com
aviso no diário; ou o e-mail de uso do Emilio (40cr, 0 vídeos após renovar 01/09)
via rascunho Gmail, aproveitando as 3 ideias de 1 clique do #10.

### #14 — 02:30→03:05 BRT — quem clicou no checkout do Creator ESPERANDO o 1º filme perdeu o filme: `no_authorized_urls` com o claim cheio
**Leitura.** origin/main = 9395b26b (fundador clicou: #1–#13 todos NO AR; fila
zerada). Ainda não eram 03:05, então fui pelo placar: `stranded_outcome` 24h =
**no_authorized_urls ×6** (1 pessoa) + compose_error_400 ×2/503 ×1 (o e7f9f000
do #7) e `cinematic_abandoned_no_delivery` 24h = 5. O ×6 é o "padrão B" do #3
(13 dos 21 estornos de 14d) aparecendo pela 1ª vez com nome — DESTAQUE.
**O que estava errado.** shaunish2097 (TAAFT, 02/09 03:37 UTC, Google):
auto-start Seedance 19cr, 5/5 cenas aceitas em 2s, saiu aos 73s, voltou às
03:42, clicou 6× no pill "rendering → resume", e às 03:43 **clicou no checkout
do Creator $15 pelo trial_active_banner** (`checkout_started`, sessão Stripe
viva) — ENQUANTO esperava o 1º filme. O cron de resgate rodou 04:03, 04:15,
04:31, 04:45, 05:01, 05:16 e saiu as 6 vezes com `no_authorized_urls`; o
refund-sweep estornou às 05:30. Resultado: quem estava com o cartão na mão
ficou com 0 vídeos e o "seu crédito voltou". No banco, o claim
51d1e375 tem `authorized_completed_urls` **5/5 preenchido**, status settled,
1 linha só (id = deterministicUuid confere). Log da Vercel das 6 rodadas: sem
`skip=` (a fal disse `ready`), sem erro de authorize/reload — só o outcome.
Executei `lib/cinematic/claim.ts` compilado (tsc → /tmp/claimsim) com um db
falso no MESMO fluxo do cron (acquire → complete → settle → authorize ×2 →
loadVerified): devolve as 5 URLs. Ou seja: a biblioteca está certa e alguma
LEITURA do cron enxerga o claim diferente do banco — e o ramo escondia qual.
**O que mudou.** No ramo `clipUrls.length === 0`: (1) `console.warn` com as 4
visões do claim (reload / retorno do authorize / linha do lote / clipes
recém-conferidos na fal) em formato `url,empty,null`; (2) FALLBACK: compõe
com a primeira visão que tiver URLs (authorize → linha do lote → fal). É
seguro porque `app/api/compose/route.ts` re-verifica `clip_urls` contra o
claim ASSINADO (`inputsMatch`) e devolve 400 se não bater — 400 que o cron já
trata (teto #7 + resgate por e-mail). Evento `stranded_diag`
(`no_authorized_urls_fallback:<fonte>`, `reload_shape`) separado do
`stranded_outcome` para não mexer na contagem do teto do #7. Só desiste com
`no_authorized_urls` quando NENHUMA visão tem URL. tsc: só os 3
pré-existentes. `scripts/test-stranded-authorized-urls-fallback.mjs`: 13
verificações (ordem das fontes, não toca crédito/rede, compose continua juiz).
**Para o cliente/receita.** O padrão B é o maior modo de morte do 1º vídeo
(13/21 estornos em 14d ≈ 1/dia, todos trial). Se o fallback compõe, o filme
chega + e-mail "Your video is ready" para gente como o shaunish2097 — que
abriu o checkout do Creator antes de ver o filme. Se não compõe, o log diz
POR QUÊ na próxima rodada. Não sei ainda a causa-raiz; anotado, não inventado.
**SHA:** b6c7e0dd (sobre 9395b26b). **Risco:** baixo — 1 ramo que antes só
desistia; pior caso = 1 compose a mais que o compose recusa com 400.
**Como medir:** `stranded_diag` (fonte que salvou) e o warn
`no_authorized_urls diag` no log; `cinematic_abandoned_no_delivery`/dia
(meta 0); `stranded_composed` para gens com esse diag.
**Placar 02:35 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=1, 24h=31 (3 com 0cr); vídeos 1h=0, 24h=18;
**falhas 1h=0**; 3h: as mesmas (adrianwells prompt_len ×7 + speech=27s;
asuquoalbert speech=3s ×2/narration_too_short ×2; wummm709 held=19 ×2);
checkout_started 24h=5 pessoas (1 é o shaunish2097 desta rodada); 7d: 72 com
1, 9 com 2, 2 com 3, **0 com 4+**; crons 24h: winback25 120,
failure_recovery 0, momentum 0, subscriber_idle 0; refunds 24h:
abandoned_no_delivery 5.
**Próximo item (#15):** (a) ler `failure_recovery_sent` por kind (03:05 já
passou — cron das 06:00 UTC); (b) assim que o bat subir, ler
`stranded_diag`/warn da próxima ocorrência e fechar a causa-raiz; (c)
shaunish2097 tem sessão Stripe aberta e 0 filmes — candidato a rascunho
pessoal com o filme montado à mão? (não há rota; anotar, não prometer).

### #15 — 02:58→03:20 BRT — o 1º disparo real do resgate de falha mandou o conselho AO CONTRÁRIO
**Leitura.** origin/main = 6b0ea206 (Codex: 2 commits de funil do Autopilot +
promo truth por cima do 9395b26b); fila = #14 (b6c7e0dd + diário), ainda não
clicada. Item (a) do #14: às 06:00 UTC o `send-failure-recovery` disparou de
verdade pela 1ª vez — **6 e-mails, todos kind=script_short** (adrianwellsvadrian,
ffdilraj730, suarezgarciakevin6, souzadelima135, livehigorxly, asuquoalbert07;
todos trial 25cr, 0 vídeos). Conferi os 6 contra `generation_stage_error`: 5
certos. O 6º é o item.
**O que estava errado.** adrianwellsvadrian (chatgpt.com, Google): às 02:52 UTC
roteiro de 27s para vídeo de 35s → o produto disse "Add about 14 more words"
(certo). Ele obedeceu — demais: voltou com **6.228 caracteres para um vídeo de
90s** e bateu SETE vezes em `prompt_len=6228 limite=5000` entre 03:09 e 03:30
(cinematic_ai e fast). Às 06:00 o cron mandou a ele "your script was about 27
seconds of narration… add about 14 more words". O conselho oposto ao problema
dele, 3h depois. Duas causas no código: (1) o cron só lia `generate_failed`, e
o teto de 5.000 é barrado NO CLIENTE (31/08) — só emite `generation_stage_error`
reason `analyze_prompt_too_long`, invisível; (2) o mapa por pessoa guardava o
PRIMEIRO erro da janela de 48h (`porPessoa.get(uid) ?? {n:0, erro}`) e ignorava
os seguintes — quem lê a mensagem, muda o texto e falha por OUTRO motivo recebia
o e-mail do motivo velho. Bônus: em 7d, "analyze_prompt_too_long" = 7 eventos/1
pessoa, mas `analyze_not_ok` (18/4) e "Could not analyze" (19/5) também nunca
viram `generate_failed` — a família "recusa na análise" inteira era invisível
ao cron (anotado; só o determinístico entrou hoje).
**O que mudou.** `app/api/cron/send-failure-recovery/route.ts`: duas fontes
(`generate_failed` ∪ `generation_stage_error` com reason
`analyze_prompt_too_long`), ordenadas por `created_at`; **o erro MAIS RECENTE
da pessoa decide** o kind; se o último for "não é bug" (saldo/regra) a pessoa
SAI (o produto disse não por último — desculpa ali seria mentira); "não é bug"
no meio não zera a contagem. Kind novo `script_long` com e-mail próprio: os
números dela ("the text you pasted was 6,228 characters, and the script box
takes up to 5,000"), quantas palavras a duração escolhida pede (2,3 wps
arredondado de 5 em 5 → "A 90-second video only needs about 205 words —
roughly 1,230 characters"), e o conserto ("paste only the narration — not the
whole conversation"); sem duração no evento não inventa palavras. Sem "our
fault", sem cupom, sem motor, utm `failure_recovery_script_long`, mesmo assunto
"30-second fix". Quem SÓ bateu no teto (sem generate_failed) agora é elegível.
tsc: só os 3 pré-existentes. `scripts/test-failure-recovery-latest-wins.mjs`:
**36 verificações** executando o classificador e a agregação REAIS extraídos da
rota (reproduz o caso do adrian minuto a minuto; prova que ordem de chegada
não importa, que "credits" por último tira a pessoa, que bug depois de "still
holding" ainda conta) + os 37 do teste antigo (2 regex ajustadas ao ternário
novo, mesma exigência).
**Para o cliente/receita.** É a lista mais quente que existe (fez conta,
escreveu, apertou gerar 8 vezes, 25cr intactos) e o único e-mail que ela
recebe da casa dizia o contrário do que ela via na tela. Agora diz o que a
tela disse por último, com o número dela. Adrian em si já está carimbado
(1× para sempre) — vai de RASCUNHO pessoal no Gmail (abaixo).
**SHA:** cc208889 (sobre 4e48eb7d/#14). **Risco:** baixo — 1 cron, só
leitura + Resend; pior caso = e-mail do kind errado para 1 pessoa por rodada,
que é exatamente o que já acontecia. Cuidado: `.eq('metadata->>reason', …)`
é filtro PostgREST em JSON — se a coluna não indexar, a consulta de 48h é
pequena (≤500) e cabe.
**Como medir:** `failure_recovery_sent` por `kind` (agora 3 valores);
`page_view` /studio com `utm_campaign=failure_recovery_script_long`; vídeo
completo em 48h para quem recebeu; contraprova: 0 pessoas cujo
`generation_stage_error` mais recente diverge do kind carimbado.
**Placar 03:00 BRT (externos):** has_paid 11 (starter 3, basic 2, pro 2,
free/churn 4); cadastros 1h=1, 24h=31 (2 com 0cr); vídeos 1h=0, 24h=18;
**falhas 1h=2** (asuquoalbert speech=3s/60s ×2 — o mesmo de antes, já
carimbado às 06:00); 3h: adrian prompt_len ×7 + asuquoalbert; checkout_started
24h=5 pessoas; 7d: 72 com 1, 9 com 2, 2 com 3, **0 com 4+**; crons 24h:
winback25 120, **failure_recovery 6 (script_short 6)**, momentum 0,
subscriber_idle 0; `stranded_diag` 24h=0 (o #14 ainda não está no ar);
stranded_outcome 3h: no_authorized_urls ×6 (shaunish2097, o do #14).
**Próximo item (#16):** (a) `momentum_nudge_sent` = 0 em 24h desde que
acordou em 01/09 — ler o cron e o vercel.json: ou a coorte está vazia de
verdade ou o filtro está errado (2ª cron "acordada" com 0 disparos = suspeito);
(b) a família "recusa na análise" (`analyze_not_ok` 18/4 pessoas + "Could not
analyze" 19/5 em 7d) — o que o servidor devolveu (500 de OpenAI? 400?) e por
que ninguém vira `generate_failed`; (c) depois do clique: `stranded_diag` do #14.
