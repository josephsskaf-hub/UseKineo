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
