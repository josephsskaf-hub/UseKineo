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
