# Alarme único de saldo da fal (28/09/2026)

## O caso
- 30 dias até 27/09: **12 despachos e 36 cenas recusadas por saldo** (11/09 Seedance 16 cenas · 16/09 Seedance 9 + Veo 1 + Omni · 21/09 Seedance 10 cenas, "403 User is locked. Reason: Exhausted balance").
- **450 créditos estornados**, todos da conta do fundador; o único despacho externo (11/09 05:11) cobrou 19 cr e entregou o filme. **0 cr cobrados sem entrega.**
- O alarme era mudo ou mentiroso em 5 lugares:
  1. duas cópias (lib/falAlert e a rota cinematic, com o e-mail cravado), throttle na memória da lambda, nenhuma linha no banco — impossível provar se o e-mail saiu;
  2. o Kineo 1 (gancho + clipes do primeiro filme, o MESMO Seedance) engolia a recusa num `console.warn` e o filme caía para stock;
  3. o poll de clipe reconhecia a frase exata da fal e só logava;
  4. `lib/falAlert.looksExhausted` chamava QUALQUER 403 de saldo (um 403 de acesso acordaria o fundador);
  5. a rota mandava "balance EXHAUSTED" em EMPTY_PLAN / ZERO_POSTS, que não são saldo.

## O que mudou (commit 1 — sem trava)
- `lib/falAlert.ts` é o alarme único:
  - `looksExhausted` usa a regra de `isBalanceExhausted` (lib/cinematic/sceneDisposition) em **espelho byte-idêntico** — não importa, ver "Revisão" abaixo — e lê o `body.detail` — o @fal-ai/client põe só "Forbidden" na mensagem.
  - `alertFalExhausted({source, engine, userId, generationId, scenesRefused, context, countRow})`: id determinístico por janela fixa de 6 h (FNV-1a puro); a 1ª ocorrência reserva e manda **um** e-mail por `notifyFounder` (KINEO_ALERT_EMAIL + webhook/ntfy) com teto de 3 s; as seguintes viram linha de contagem (`alerted:false`). Envio que não saiu é re-tentado (até 3 por janela, 10 min entre elas). Nunca lança.
  - `alertDispatchDefect({kind:'EMPTY_PLAN'|'ZERO_POSTS'})`: assunto verdadeiro ("not a fal balance problem"), 1 e-mail por tipo por 6 h.
- Kineo 1: catches de `lib/fastAiHook.ts` e `lib/fastAiClips.ts` chamam o alarme com `await`.
- `/api/cinematic-clip-status`: a frase explícita de saldo alarma com `countRow:false` (o poll repete a cada poucos segundos: 1 reserva por janela, zero linhas de contagem).
- `/api/retry-hollywood-scene`: recusa explícita classificada como saldo alarma.
- `lib/avatar/veed.ts`: `void` → `await` (o throw logo depois cortava o envio na Vercel).
- `/admin/supplier-health`: card no topo — última recusa (vermelho se < 6 h) e último alarme com o estado do e-mail, botão "Recharge fal.ai", tabela por dia/fonte, e o lado do dinheiro (despachos, cenas, pessoas, estornado, cobrado com entrega, **cobrado sem entrega**). Contado no banco pela RPC `admin_fal_balance_panel`.
  - ⚠ A RPC está em `supabase/migrations/20260928090000_admin_fal_balance_panel.sql` e **ainda não foi aplicada** (a sessão só tinha leitura). Sem ela o card mostra o último alarme e a contagem exata de despachos, e avisa na tela. O SELECT da função foi rodado em produção (só leitura) e bateu: 12 · 36 · 450 · 44 · 0.
  - (d) saldo ao vivo da fal ficou fora: exige chave ADMIN da fal.

### Revisão adversarial (28/09) — o que foi consertado antes de subir
1. **O build do site quebrava (bloqueador).** `lib/falAlert` é alcançado pelo navegador: `GenerateClient.tsx` faz `import('@/lib/hollywood/router')` para o botão "Fix it for me", o router importa `PRESENTER_MODEL` de `lib/avatar/veed`, e veed importa o alarme. A 1ª versão importava `node:crypto` (e sceneDisposition, que também importa): o webpack de navegador do Next 14.2.5 falhava com `UnhandledSchemeError` e o `tsc` ficava verde — nada do push chegaria ao ar. Agora o alarme não importa `node:*` nem `lib/cinematic/*`: o id é FNV-1a puro e o classificador é espelho (regex byte-idênticas, as duas funções executadas no mesmo corpus de 405 casos). O bundle de navegador do `import()` do router volta a 0 erros, como na main.
2. **Envio que falhou calava a janela.** Se o 1º e-mail falhasse (Resend 429 no pico, teto de 3 s) ou a lambda morresse no meio, o fundador ficava sem nada até a virada das 6 h. Agora o alarme lê como a vaga terminou: `sent` = avisado; qualquer outro estado com 10+ min abre a vaga seguinte (até 3 por janela).
3. **Card verde sem medir.** Sem a migration, leitura do fallback com erro (ex.: statement timeout) virava "No balance alarm recorded yet" em verde. Agora qualquer leitura com erro = "Not measured right now" em âmbar.
4. **Vermelho seguia a 1ª recusa da janela.** Agora segue a ÚLTIMA recusa (`last_refusal_at`); no banco hoje: 21/09 02:03 UTC.

### Revisão 2 (28/09, FIX-REVISAO-2) — o que a integração achou
1. **E-mail entregue era re-enviado.** O teto de 3 s corria contra o `Promise.all` dos dois canais: Resend 200 em 50 ms + ntfy em 4 s virava `timeout`, a vaga ficava "não saiu" e o mesmo e-mail saía até 3 vezes na janela, com o painel dizendo "E-mails sent 0". Agora `notifyFounder` avisa canal a canal (`opts.onChannel`) e o alarme resolve no PRIMEIRO canal que confirma: `sent`, com o canal lento anotado como `pending`. `timeout` só quando nenhum canal confirmou em 3 s (falha rápida não conta como entrega).
2. **"Charged, NOT delivered" mandava estornar filme a caminho.** A RPC contava como parado todo débito sem compose `done` — inclusive o filme renderizando, que é exatamente quando o e-mail traz o fundador ao card. Medido (45 dias, 266 despachos 200): entrega p50 2,6 min, p99 26 min, máximo 117,5 min. A RPC (migration editada no lugar, ainda não aplicada; SELECT conferido em produção só leitura) separa `in_flight_*` (despacho com menos de 120 min, ou compose `pending` aberto há menos de 120 min) de `unrefunded_undelivered_*` (fora da janela — só este diz "refund them"). Na leitura de 11/09 05:13 UTC que o revisor refez: antes 94 cr "parados" (1 externo, entregue 1 min depois); agora 0 parados e 94 em voo. O card ganhou o tile "Charged, still rendering" ("do NOT refund").
3. **Fallback pintava de verde o que não mediu.** Sem a migration, "Charged, NOT delivered" mostrava "—" em verde "should always be 0". Agora todo tile sem número é âmbar "Not measured — waits for …sql"; `falStuckMoneyState` decide a cor (`not_measured` / `unseparated` / `stuck` / `clear`) e uma RPC que não separe o em voo nunca diz "refund them".
4. **Hollywood alarmava várias vezes, em nome do Avatar.** Cena de diálogo com âncora vai por `submitAvatarJob` (host TTS). Com a fal sem saldo, o veed alarmava `avatar_submit` (N cenas = N linhas) e o único e-mail da janela saía sem cena, pessoa nem geração; o finalizador virava linha de contagem. Agora `submitAvatarJob({ alertOnBalance: false })` deixa o alarme com quem chama (o /api/generate-avatar segue com o dele), e o commit `[TRAVA 8.2] FIX-REVISAO-2` faz a rota passar `false` e, no catch do host, ligar `ctxDespacho().balanceExhausted` quando `looksExhausted(e)` — um alarme por despacho, no finalizador, creditado ao filme (`cinematic`). No S25 a cena de diálogo recusada é retida (sem fallback O3) e, sozinha, não ligava a flag.
5. **Linha forjada pintava o card.** O `/api/events` público aceita o nome `fal_balance_exhausted` (o revisor gravou uma linha anônima com `state:'sent'` e o card ficou vermelho com "Last alarm … e-mail sent"). A porta é o `SERVER_ONLY_EVENTS` da rota de eventos (fora desta trilha, anotado). Aqui, a defesa em profundidade: o sink do navegador SEMPRE carimba `metadata.ip_hash` (medido: 100 % das linhas de cliente, 0 % das de servidor) e o alarme nunca carimba — o fallback (`.is('metadata->>ip_hash', null)`) e a RPC (`not (e.metadata ? 'ip_hash')`) ignoram essas linhas.

## O que muda com o commit 2 — `[TRAVA 8.2]` (precisa da palavra do fundador)
- `app/api/generate-video-cinematic/route.ts`: apaga as cópias locais, importa de lib/falAlert, **uma** chamada em `finalizarDespacho` quando `ctx.balanceExhausted` (cobre clássico total/parcial, Hollywood FAILFAST e — antes sem alarme — Hollywood que seguiu com ≥ 90% das cenas), e EMPTY_PLAN/ZERO_POSTS passam a `alertDispatchDefect`.

## Prova
- `node scripts/test-fal-saldo-alerta-2026-09-28.mjs` — executa o código real (classificação, id de 6 h, reserva/contagem/teto/banco fora, catches do Kineo 1 com await, a rota real do poll, parser e fallback do card; após a trava, a fatia real de `finalizarDespacho`).
- Re-ancorados (só o stub do import novo): `test-cinematic-poll-diagnostic-2026-09-11`, `test-cinematic-terminal-proof-2026-09-11`.
- Re-ancorados no commit `[TRAVA 8.2]` (mesma intenção, transporte novo): `test-despacho-vazio-2026-09-04` 1.7/7.2 (alarme próprio de EMPTY_PLAN e de ZERO_POSTS → `alertDispatchDefect`), `test-saldo-parcial-2026-09-21` (o alarme do parcial sai do finalizador único, nunca 2 e-mails), `test-leva-confiabilidade-2026-08-28` P3 (zero-posts continua alarmando sozinho).

## Riscos conhecidos
- Janela FIXA de 6 h: dois e-mails podem sair com minutos de diferença na virada da janela; uma 2ª pane na mesma janela depois de recarregar só aparece no card.
- `lib/hollywood/anchors.ts` (trava) e /images, /audio, /enhance, generate-clip seguem sem o alarme.
