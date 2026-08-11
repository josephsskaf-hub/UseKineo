# RASCUNHOS — e-mails da coorte de trials

`[KINEO-TRIAL-COHORT-2026-08-11]` · análise: `docs/COORTE-TRIALS-2026-08-11.md`

> ## ⚠️ NADA FOI ENVIADO
> Estes textos existem só neste arquivo. Não há rota, cron ou job que os leia.
> Enviar é decisão e ação do fundador, depois de aprovar a copy.

**Regras que estes rascunhos seguem:**
- **Sem desconto.** A política de 50% é exclusiva dos e-mails D5/D10 já existentes
  (`expired_offer_d5`, `expired_lastcall_d10`). Nenhum texto abaixo cita preço promocional.
- **Sem mentira.** Onde nós quebramos, o e-mail diz que nós quebramos.
- Curtos. Um pedido só por e-mail.
- Inglês, minúsculo no assunto (mesmo tom dos e-mails de ciclo atuais).
- Respeitar `email_opted_out` e `trial_emails_log` antes de qualquer envio.

---

## 1 · Grupo A — tentou gerar e o vídeo falhou (25 contas)

**Quem:** `trial_status='active'`, 0 vídeos, ≥1 falha — contando o conjunto de aliases
`video_generation_failed` / `generate_failed` / `generation_stage_error`. Só o primeiro nome
dava 19 e deixava 6 pessoas de fora da lista de desculpas.
**Verdade do grupo:** eles apertaram o botão e nós devolvemos erro. Muitos no apagão de 08-10.
**Pedido:** voltar e tentar de novo. Não é venda.

> **Assunto:** we broke your video — here's what happened
>
> Hi,
>
> You tried to make a video with Kineo and it failed. That wasn't your prompt or your
> connection — our render pipeline was down, and for about 33 hours it finished
> exactly zero videos. Yours was one of them.
>
> It's running again. Your trial credits were never consumed by the failed runs, so
> everything you started with is still there.
>
> If you want to try the same idea once more, it takes about a minute:
> https://shortsforgeai.com/generate
>
> Sorry for wasting your time.
>
> — Joseph, Kineo

*Não mandar para as 16 contas do grupo A que **nunca iniciaram** nada: elas não viram erro
nenhum e o pedido de desculpas soaria falso.*

---

## 2 · Grupo B — fez o vídeo e não baixou (28 contas, 13 vencem em 24h)

**Quem:** ≥1 vídeo, `video_download_clicked = 0`.
**Verdade do grupo:** o vídeo ficou pronto, eles viram, e não quiseram o arquivo.
Esse é o ponto delicado — **não** dá para escrever "seu download falhou", porque não falhou:
eles nunca clicaram. Fingir um problema técnico aqui seria mentira, e eles saberiam.
**Pedido:** feedback honesto. Este e-mail vale mais como pesquisa do que como venda.

> **Assunto:** your video is still there — what was wrong with it?
>
> Hi,
>
> You made a video with Kineo and never downloaded it. I'm not going to pretend that's
> a technical problem — the file was ready, you just didn't want it.
>
> That's useful to me, and I'd rather hear it than guess. What was off? Wrong footage,
> wrong voice, too generic, not what you asked for?
>
> Just reply to this email — it comes to me directly.
>
> Your video and your remaining credits are still in your account until your trial ends:
> https://shortsforgeai.com/history
>
> — Joseph, Kineo

---

## 3 · Grupo E — bateu no teto (1 conta, 37/40)

**Quem:** ≥30 de 40 créditos usados.
**Verdade do grupo:** provou que quer o produto (18 vídeos, 78 sessões) e está a 3 créditos do bloqueio.
**Pedido:** assinar. É o único e-mail da lista que é venda direta — e o único que ganhou esse direito.

> **Assunto:** you're 3 credits from the end of your trial
>
> Hi,
>
> You've made 18 videos on your trial and you have 3 credits left. After that the
> generator stops until you pick a plan.
>
> Creator is $24.90/month and it's the plan built for what you're already doing.
> Everything you've made stays in your account either way.
>
> https://shortsforgeai.com/pricing
>
> — Joseph, Kineo

*Se ele já recebeu `ending_soon`, mandar este no lugar, não os dois.*

---

## 4 · Grupo D — ativo, relógio acabando (4 vencem em 24h)

**Quem:** baixou ≥1 vídeo e voltou em outro dia, `trial_ends_at` < 24h.
**Verdade do grupo:** nada quebrou para eles. O único risco é não saberem a data.
**Pedido:** avisar. Sem drama.

> **Assunto:** your trial ends tomorrow
>
> Hi,
>
> Quick heads-up: your Kineo trial ends tomorrow, and you still have credits on it.
>
> If you want to use them up first, they're here:
> https://shortsforgeai.com/generate
>
> If you want to keep going after that, plans start at $9.90:
> https://shortsforgeai.com/pricing
>
> Either way, the videos you already made stay yours.
>
> — Joseph, Kineo

*Checar `trial_emails_log` — se `ending_soon` já saiu para a conta, **não** mandar este.*

---

## 5 · Grupo C — baixou e sumiu (1 conta)

**NÃO MANDAR NADA.**

Uma conta não é um segmento. A copy seria idêntica à do grupo D, e ela já está coberta pelo
`ending_soon` automático. Reavaliar quando o grupo passar de ~10 contas.

---

## Decisão pendente para o fundador

**Estender o trial dos 23 atingidos pelo apagão de 08-09/08-11?**

A favor: eles perderam dias de trial com o produto sem entregar nada — é dívida nossa.
Contra: custo de até 23 × 40 créditos e abre precedente.

Não fiz. `trial_extended` e `trial_ends_at` existem no schema; é um UPDATE, mas mexe em
entitlement e por isso ficou fora do escopo deste trabalho.

**Alerta separado, sem relação com e-mail:** `75f76a4c` (ZA) assinou Creator ontem e **nunca
recebeu um vídeo**. Foram **6 tentativas, todas falhas** — 2 nos minutos antes do pagamento e
**4 depois de já estar pagando** (21:29, 21:31, 21:38, 22:25). É a única conversão do trial e o
maior risco de chargeback da base.

Vale um contato **pessoal** do fundador, não campanha, e provavelmente antes de qualquer outro
e-mail desta lista. Sugestão de conteúdo, se ajudar:

> **Assunto:** I owe you an explanation (and your videos)
>
> Hi,
>
> You paid for Kineo yesterday and you still don't have a single video. Six of your
> renders failed — two before you paid and four after. That's entirely on us: our
> render pipeline was down.
>
> It's working now. I'd like to make your first videos myself and send them to you
> today — just reply with the topic you wanted.
>
> If you'd rather have your money back instead, say the word and I'll refund you
> immediately, no questions.
>
> — Joseph, Kineo

*Oferecer reembolso proativo aqui é mais barato que um chargeback e é a coisa honesta a fazer.
Isso é decisão do fundador — não executei nada.*
