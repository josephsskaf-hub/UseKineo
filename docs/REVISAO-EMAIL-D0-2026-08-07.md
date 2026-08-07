# REVISÃO ADVERSARIAL DO E-MAIL D0 ANTES DO 1º DISPARO REAL

`[KINEO-D0-EMAIL-REVIEW-2026-08-07]` — revisão feita em 07/08/2026, entre ~12:20Z e o
primeiro disparo real do cron `app/api/cron/trial-lifecycle-emails` às **16:30 UTC**.

Arquivo revisado: `app/api/cron/trial-lifecycle-emails/route.ts`
Método: o HTML foi **renderizado de verdade** (a função `buildEmail` foi extraída do
arquivo, byte a byte, e executada em Node contra as **linhas reais de `profiles`**), não
apenas lido. Nada aqui é inferido do código: cada afirmação abaixo tem um SELECT ou um
render por trás.

---

## VEREDITO

**PODE DISPARAR HOJE (16:30Z) — porque o cron não vai enviar nada hoje.**
Os dois destinatários reais estão **suprimidos** pela trava cruzada de 24h. Não há e-mail
ruim para impedir hoje, e portanto não há nada a desligar.

**O prazo real não é hoje: é 08/08 às 16:30Z.** É nesse disparo que o D0 sai de verdade —
e, sem o push deste commit, ele sai com o texto **errado** documentado abaixo.

> Se o push não acontecer até **08/08 16:30 UTC**, a recomendação é **ADIAR o disparo**:
> `KINEO_REVERSE_TRIAL_ENABLED=false` mata a rota (linha do gate: `if (!dryRun &&
> !REVERSE_TRIAL_ENABLED) return … 'reverse_trial_flag_off'`) — **mas essa flag também
> desliga o trial inteiro**, o que é caro. A alternativa cirúrgica, e a recomendada, é
> **remover a entrada `"30 16 * * *" /api/cron/trial-lifecycle-emails` de `vercel.json`**:
> desliga só o e-mail, não toca no produto.

---

## 1. QUEM RECEBE (dados reais, SELECT em `profiles` em 07/08)

| e-mail | país | criado (Z) | trial | usados | saldo | concedido | fim do trial (Z) |
|---|---|---|---|---|---|---|---|
| `forklingaimay@gmail.com` | NP | 08:24:23 | 7d active | 1 | **39** | 40 | 2026-08-14 08:24:26 |
| `rjshayan1@gmail.com` | PK | 04:43:59 | 7d active | 1 | **39** | 40 | 2026-08-14 04:44:02 |
| `josephsskaf+t1@gmail.com` | — | 01:18:41 | downgraded | 41 | 0 | 40 | — |

O fundador (`josephsskaf+t1`) é cortado por `isTestEmail()` (`e.startsWith('josephsskaf')`)
— nunca entra em coorte nenhuma. Os outros dois **estavam devidos para `d0_welcome`**:
`status='active'`, teto não atingido, e `now − startMs` de 8h05 e 11h46 — dentro das 24h.

---

## 2. ⛔ O QUE O E-MAIL DIZIA — TRÊS AFIRMAÇÕES FALSAS PARA ESSAS DUAS CONTAS

### 2.1 O saldo: dizia 40, a pessoa tem 39

HTML renderizado (**antes**):

```html
<p style="margin:0 0 14px;"><strong>Your Creator trial is live.</strong> 40 credits just
landed in your account &mdash; everything Creator has is unlocked, no card needed.</p>
```

Assunto (**antes**): `Your Creator trial is live — 40 credits inside`

`40` é `TRIAL_CREDIT_CAP`, que é a **concessão** (`trial_credits_granted = 40`). A frase,
porém, fala de **saldo**: *"in your account"*, *"inside"*, *"just landed"*. As duas contas
reais estão em `video_credits = 39` / `trial_credits_used = 1` desde de manhã.

**Veredito: é mentira, não é concessão.** Se o texto dissesse "your trial comes with 40
credits" seria a concessão e passaria. "40 credits just landed in your account", enviado
8h depois de a pessoa gastar um, é uma afirmação sobre o saldo — e o saldo é 39. É
exatamente a classe de erro que `lib/reverseTrial.ts` diz existir para impedir ("duas
verdades sobre o mesmo instante"). Corrigido.

### 2.2 ⛔ O MAIS GRAVE: prometia motores que o servidor recusa

> `everything Creator has is unlocked`

Isto é **falso por spec**, e o produto responde **402** se a pessoa acreditar:

- `lib/reverseTrial.ts:18-19` — *"Durante o trial: mesmos direitos do CREATOR, **EXCETO os
  motores Studio (Kling / Veo / Hollywood)** — NUNCA Studio no trial."*
- `lib/reverseTrial.ts`, invariante 2 de `getEffectiveEntitlement`:
  `allowsStudioEngines: isPaidAccount` — **nunca** `treatAsPaid`.
- E o plano Creator é vendido **justamente com Hollywood**: `lib/pricing.ts:10` —
  *"Creator = $24.90/month (150 credits — **1 Hollywood film/month included**)"*.

Ou seja: "tudo que o Creator tem" inclui, por definição de preço, o motor que o trial
**nunca** libera. O primeiro e-mail do produto para o primeiro cliente real prometia um
motor que a request seguinte nega. Corrigido — e corrigido com a **mesma frase da copy
pública já aprovada pelo fundador** (`ON_COPY` em `lib/freeTierOffer.ts`: *"40 credits,
**every engine except Studio**, no card"*), para não nascer uma terceira redação.

### 2.3 "Make your first Short" para quem já fez o primeiro

Ambas as contas têm `trial_credits_used = 1` **e** `video_ready_sent_at` carimbado
(09:40:44Z e 05:40:44Z) — as duas já geraram e já receberam o "your video is ready".
O CTA e o corpo tratavam as duas como quem nunca gerou. Corrigido com condicional em
`creditsUsed`.

---

## 3. ⛔ BÔNUS ENCONTRADO NO MESMO ARQUIVO: o `ending_soon` promete 30× o free tier

Este e-mail sai para as duas contas em **12/08**. Dizia:

```
- You're back to the free daily limit
```

`daily` é a copy da flag **DESLIGADA** (`OFF_OFFER`: `limit: 3`, `windowMs: 24h`). Com
`KINEO_REVERSE_TRIAL_ENABLED=true` — o único mundo em que este e-mail existe — o free tier
é `ON_OFFER`: **`limit: 1`, `windowMs: 30 dias`**. "Free daily limit" prometia ~30× o que a
pessoa vai receber e, de quebra, esvaziava a urgência do próprio e-mail de conversão.
Corrigido lendo de `getFreeTierOffer().copy.residual`, para não poder divergir de novo.

---

## 4. O QUE FOI CORRIGIDO — HTML RENDERIZADO (DEPOIS)

### D0 para `forklingaimay@gmail.com` / `rjshayan1@gmail.com` (used=1, left=39)

Assunto: **`Your Creator trial is live — 39 credits inside`**

```html
<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:560px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial is live.</strong> You have 39 credits left &mdash; every engine except Studio (Kling, Veo and Hollywood) is unlocked, no watermark, no card needed.</p>
  <p style="margin:0 0 14px;">You've already put it to work once — the rest of the trial is for finding the format that sticks. Type any topic, hit generate, and it's done in about a minute.</p>
  <p style="margin:0 0 20px;"><a href="https://www.usekineo.com/generate?utm_source=lifecycle&amp;utm_medium=email&amp;utm_campaign=trial_d0&amp;intent_campaign=trial_d0" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Make your next Short &rarr;</a></p>
  <p style="margin:0 0 2px;">Kineo Team</p>
<p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p></div>

<div style="max-width:560px;margin:32px auto 0;padding-top:16px;border-top:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center">
  <p style="margin:0 0 6px;color:#94a3b8">You're receiving this because you created a Kineo account.</p>
  <p style="margin:0;color:#94a3b8">Kineo &middot; usekineo.com &middot; <a href="https://www.usekineo.com/unsubscribe?u=d1b6d890-c391-45c2-bfd9-864ccc58e82b&t=MaH07ZfJ2TIZ0zSCLYaBQw" style="color:#94a3b8;text-decoration:underline">Unsubscribe</a></p>
</div>
```

### D0 para quem se cadastrou e ainda não gerou (used=0, left=40)

Assunto: **`Your Creator trial is live — 40 credits inside`**

```
Your Creator trial is live. 40 credits are sitting in your account — every engine except
Studio (Kling, Veo and Hollywood) is unlocked, no watermark, no card needed.

The fastest way to see what that means: make one Short. Type any topic, hit generate, and
it's done in about a minute.

Make your first Short: https://www.usekineo.com/generate?utm_source=lifecycle&utm_medium=email&utm_campaign=trial_d0&intent_campaign=trial_d0
```

### `ending_soon` (7d), corrigido

```
- Your unused trial credits expire
- The Creator AI engines lock
- You're down to 1 free Fast video/month
```

### Diff funcional (5 mudanças de comportamento + 2 de forma)

| # | mudança | por quê |
|---|---|---|
| 1 | `creditsLeft` = `min(TRIAL_CREDIT_CAP − used, video_credits)` no `Candidate`, usado no assunto e no corpo | saldo real, nunca superestima |
| 2 | `every engine except Studio (Kling, Veo and Hollywood) … no watermark` | o trial nunca teve Studio |
| 3 | `first`/`next Short` condicional em `creditsUsed` | as duas contas já geraram |
| 4 | `ending_soon`: linha do free tier vem de `getFreeTierOffer()` | 1/mês, não 3/dia |
| 5 | `D0_WINDOW_MS` 48h → **72h** | ver §5 — com 48h o welcome podia **nunca** sair |
| 6 | `&` → `&amp;` nos `href` (helper `attr()`) | `&utm_source` é entity reference não terminada |
| 7 | corpo `max-width` 480px → 560px | o rodapé é 560px centralizado; corpo e rodapé ficavam desalinhados |

---

## 5. SUPRESSÃO, IDEMPOTÊNCIA E RISCO DE E-MAIL DUPLICADO

### 5.1 Hoje (07/08 16:30Z): **zero e-mails, zero risco**

`loadLifecycleSuppression` toma o máximo de 7 colunas datadas de `profiles`. As duas contas
têm **`video_ready_sent_at` de hoje**:

- `forklingaimay` → `2026-08-07 09:40:44Z` (6h50 antes do disparo)
- `rjshayan1` → `2026-08-07 05:40:44Z` (10h50 antes)

São carimbos **reais**, não carimbos de pulo: `send-video-ready` grava
`LIFECYCLE_SKIP_STAMP` (`1970-01-01`) quando pula (linha 233) e `new Date().toISOString()`
quando envia (linha 264); `isRealSendStamp` corta abaixo de `2020-01-01`. Ambos passam.
(O `activation_nudge_sent_at = 1970-01-01` de `forklingaimay` é o carimbo de pulo — e
corretamente **não** suprime.)

Logo: `due: 2`, `suppressed_recent_lifecycle: 2`, **`sent: 0`**. `trial_emails_log` está
**vazia** (conferido) e o disparo de hoje não escreve nada nela.

### 5.2 Amanhã (08/08 16:30Z): sem risco de duplicata, **com** risco de silêncio

- **Duplicata na direção de saída:** o cron **reivindica** a linha em `trial_emails_log`
  (`upsert` + `ignoreDuplicates`, PK `(user_id, email_kind)`) **antes** de chamar a Resend.
  Duas execuções paralelas não conseguem enviar duas vezes. ✅
- **Colisão com os outros crons:** `loadLifecycleSuppression` **já lê `trial_emails_log`**
  dentro da janela de 24h. A linha escrita às 16:30 cala `send-activation-nudge` (:40),
  `send-video-ready` (:40), `send-cap-hit` (:45), `send-post-nudge` (:50) e o
  `send-credits-back` (15:25) do dia seguinte. ✅
- **Única exceção conhecida:** `send-blackout-winback` (:35, cinco minutos depois) **não
  aplica a supressão** — deliberado e documentado no cabeçalho dele (*"an outage apology
  must not queue behind a marketing nudge"*). Só dispara se houver marcador
  `openai_quota_dead`/`openai_hang` nas últimas 48h. **Conferido agora: 0 marcadores.**
  Risco residual: se houver um blackout, a pessoa recebe D0 + pedido de desculpas no mesmo
  dia. Aceito — é o desenho, e um pedido de desculpas atrasado é pior. ⚠️ registrado

### 5.3 ⛔ O RISCO QUE A JANELA DE 48h CRIAVA: o welcome que nunca sai

A supressão de hoje **não é um caso raro — é o caso normal**. Um usuário novo que gera um
vídeo recebe `send-video-ready` no mesmo dia, e isso cala o D0 por 24h. Foi o que
aconteceu com **as duas** contas reais.

Com `D0_WINDOW_MS = 48h` o welcome tinha exatamente **duas** tentativas (D0 e D1). Como
`send-video-ready` (:10/:40), `send-cap-hit` (:15/:45) e `send-post-nudge` (:50) rodam **de
hora em hora** e carimbam a mesma janela, duas tentativas seguidas comidas fazem o welcome
**nunca existir** — em silêncio, sem erro em log nenhum, sem linha em `trial_emails_log`.
Para `rjshayan1` a segunda tentativa (08/08 16:30) cai a 35h46 do início: já era a última.

`D0_WINDOW_MS = 72h` dá três tentativas. Isso só é seguro porque a copy foi tornada neutra
no tempo no mesmo commit ("just landed" → saldo real): o texto continua verdadeiro se o
e-mail sair no D2. Para a variante 3d nada muda — `isTrialActive()` e o ramo `ending_soon`
resolvem a linha antes de chegar ao fallback.

---

## 6. CHECKLIST DE ENTREGABILIDADE E FORMA (renderizado, não inferido)

| item | resultado |
|---|---|
| Remetente | `Kineo Team <hello@usekineo.com>` ✅ |
| Reply-to | `hello@usekineo.com` — ⚠️ ver §7 |
| Idioma | inglês ✅ (nada em PT, nenhum destinatário BR) |
| Fuso / moeda | o D0 **não cita data nem preço** ✅; `ending_soon` usa "tomorrow"/"in 2 days" (relativo) ✅. Zero suposição de BRT/BRL |
| Imagens | **nenhuma** — o e-mail é 100% texto+CSS inline, abre idêntico com imagens bloqueadas ✅ |
| Links absolutos e clicáveis | ✅ `https://www.usekineo.com/...` |
| UTM | ✅ `utm_source=lifecycle&utm_medium=email&utm_campaign=trial_d0&intent_campaign=trial_d0` |
| Descadastro (rodapé) | ✅ link visível para a **página** `/unsubscribe` (não a API — scanner corporativo faria GET e descadastraria a base) |
| Descadastro (header) | ✅ `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058) |
| Placeholders | ✅ zero `{{…}}`, zero `undefined`, zero `NaN`, zero nome vazio — o texto **não usa nome** (o que é o certo: `profiles` não tem nome confiável dessas contas) |
| Desconto no D0 | ✅ **nenhuma** menção — `50%`/`COMEBACK50` só existem em `expired_offer_d5` e `expired_lastcall_d10` (verificado por regex no render) |
| Pré-header | ⚠️ não existe um dedicado; a prévia da caixa vira `"Hey, Your Creator trial is live. You have 39 credits left…"`, que é legível. Não corrigido — não está quebrado |

---

## 7. PENDÊNCIAS REGISTRADAS E **NÃO** CORRIGIDAS (decisão consciente)

1. **`reply_to: 'hello@usekineo.com'` pode ser caixa morta.** `lib/emailSuppression.ts` diz
   textualmente: *"joseph@usekineo.com é a caixa CONFIRMADAMENTE real no domínio (…hello@
   pode não receber)"* — e é por isso que o `mailto:` do `List-Unsubscribe` usa `joseph@`.
   Se o cliente responder ao welcome, a resposta pode cair no vácuo.
   **Não corrigido aqui de propósito:** os **9** crons de e-mail usam exatamente a mesma
   string. Consertar um só cria uma segunda verdade sobre qual é a caixa de resposta do
   Kineo. É uma decisão de frota, para o fundador tomar de uma vez.
2. **`NEXT_PUBLIC_APP_URL` de produção não foi verificado.** O `.env.local` da máquina tem
   `https://www.shortsforgeai.com`; o `.env.local.example` tem `https://www.usekineo.com`.
   Os dois domínios apontam para o mesmo deploy, então **o link funciona nos dois casos** —
   mas se a Vercel estiver com `shortsforgeai.com`, o CTA leva a um domínio diferente do
   remetente e da assinatura (`usekineo.com`), o que é ruído de marca e sinal fraco de spam.
   Não foi possível ler as env vars da Vercel com as ferramentas desta sessão.
   **Ação para o fundador: conferir esta única variável no painel.**
3. **`&t=` sem escapar no rodapé** (`emailFooterHtml`, `lib/emailSuppression.ts`). Mesma
   classe do item 6 da tabela, mas em infra compartilhada por 9 crons. `&t` não é entidade
   válida e todo cliente renderiza literal — risco real zero. Não mexi em infra
   compartilhada a horas de um envio real.
4. **`?dry=1` não foi executado contra produção**: `CRON_SECRET` não está no `.env.local`
   desta máquina, e a rota é fail-closed sem ele. A previsão de `sent: 0` para hoje vem da
   simulação do `dueKind` + `loadLifecycleSuppression` contra as linhas reais, não de um
   run. Vale rodar depois do push:
   `curl -H "Authorization: Bearer $CRON_SECRET" ".../api/cron/trial-lifecycle-emails?dry=1"`
5. **`COMEBACK50` não foi verificado na Stripe** (só o comentário do código afirma que
   existe). Não é urgente — o `expired_offer_d5` mais próximo é 12/08.

---

## 8. RIGOR

- `npx tsc --noEmit -p tsconfig.json` → **EXIT=0**
- EOL preservado: `route.ts` é **LF puro** no HEAD (0 CRLF) e continua LF puro; termina em
  newline. Este documento é LF.
- Revisão adversarial dupla: a 1ª passada achou §2.1 e §2.3; a 2ª passada — feita contra
  `lib/reverseTrial.ts` e `lib/pricing.ts`, não contra o e-mail — achou §2.2 (Studio) e
  §3 (free tier "daily"), que são os dois erros mais caros do arquivo.
- **Sem push.** O commit fica represado; o fundador roda o push quando voltar.
