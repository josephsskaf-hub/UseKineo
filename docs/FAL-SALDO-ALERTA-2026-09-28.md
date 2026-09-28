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

## O que muda com o commit 2 — `[TRAVA 8.2]` (precisa da palavra do fundador)
- `app/api/generate-video-cinematic/route.ts`: apaga as cópias locais, importa de lib/falAlert, **uma** chamada em `finalizarDespacho` quando `ctx.balanceExhausted` (cobre clássico total/parcial, Hollywood FAILFAST e — antes sem alarme — Hollywood que seguiu com ≥ 90% das cenas), e EMPTY_PLAN/ZERO_POSTS passam a `alertDispatchDefect`.

## Prova
- `node scripts/test-fal-saldo-alerta-2026-09-28.mjs` — executa o código real (classificação, id de 6 h, reserva/contagem/teto/banco fora, catches do Kineo 1 com await, a rota real do poll, parser e fallback do card; após a trava, a fatia real de `finalizarDespacho`).
- Re-ancorados (só o stub do import novo): `test-cinematic-poll-diagnostic-2026-09-11`, `test-cinematic-terminal-proof-2026-09-11`.

## Riscos conhecidos
- Janela FIXA de 6 h: dois e-mails podem sair minutos apart na virada da janela; uma 2ª pane na mesma janela depois de recarregar só aparece no card.
- `lib/hollywood/anchors.ts` (trava) e /images, /audio, /enhance, generate-clip seguem sem o alarme.
