# Rascunhos para os DOIS SÓCIOS DE DIRETÓRIO — 07/09/2026 (va-r12)

> ⚠️ **DESATUALIZADO EM 08/09 (versão B + planos novos).** Antes de enviar, trocar a tabela por: **$1 trial (7 dias de Creator, 80cr, cartão) · Starter $9/60cr · Creator $19/150cr · Studio $29/180cr · anual 10 meses · SEM free tier.** "Free trial $0 — 25 credits" e "Starter $7" abaixo estão MORTOS. Ver docs/AUDITORIA-PRECOS-2026-09-08.md §4.

> **O fundador envia da caixa dele.** A casa NÃO manda e-mail automático para
> estes dois de propósito — é a mesma regra da lista do Autopilot: contato B2B
> merece pessoa, não campanha.

---

## Por que estes dois estão fora da carta de criador

A rotação anterior (va-r11) descobriu que dois dos 15 sócios não são criadores
avulsos: são **sites de diretório de software**. Para um criador, o ativo é o
link de afiliado. Para um diretório, o ativo é a **ficha do produto** — e a
nossa está desatualizada em toda parte.

**Eles receberam, sim, a carta automática de sócio às 23:18 BRT** (não deu
tempo de mudar o cron com segurança, e a carta não é falsa: ela leva o link
deles e a notícia do $1). Estes rascunhos são o pedido que de fato serve a um
diretório, e que a carta genérica não faz: **atualizar a ficha**.

---

## ⚠️ A TABELA DE PREÇO VERDADEIRA (lida do código, não dos documentos)

Conferido em `lib/checkoutPricing.ts` na ponta de `origin/main`. **Os dois
documentos da casa estão desatualizados e não devem ser usados como fonte:**
o `CLAUDE.md` ainda descreve a tabela V5 (`$9.90 / $19.90 / $39.90`, trial de
50 créditos), que **morreu em 19/08** na revisão V6.

| plano | preço hoje | créditos | onde está no código |
|---|---|---|---|
| Starter | **$7/mês** | 40 | `TIER_PRICES.starter = 700` |
| Creator | **$15/mês** | 90 | `TIER_PRICES.basic = 1500` |
| Studio | **$29/mês** | 160 | `TIER_PRICES.pro = 2900` |
| Autopilot | $299/mês | 400 | `AUTOPILOT_PRICES` |
| **Trial de cartão** | **$1 por 7 dias** → depois $15/mês | **80 no ato** | `CARD_TRIAL_ENTRY_FEE_MINOR = 100`, `CARD_TRIAL_DAYS = 7`, `CARD_TRIAL_GRANT_CREDITS = 80` |
| Trial grátis (sem cartão) | $0 | **25** | `TRIAL_GRANT_CREDITS_COPY = 25` |

**O que qualquer ficha nossa lá fora provavelmente diz de errado:** "from
$9.90/mo" (é $7), "40 créditos grátis" ou "50 créditos grátis" (são 25), e
**nenhuma mencionaria a entrada de $1, que nasceu hoje.**

---

## ✉️ RASCUNHO 1 — ColorMango

**Para:** `john@colormango.com`
**Assunto:** Kineo pricing changed today — updated details for your listing

```
Hi John,

Joseph here, founder of Kineo (usekineo.com). You listed us back in July.

Our pricing changed today and I'd rather you hear it from me than have a
stale page: we added a $1 entry. Anyone can now try the Creator plan for
7 days for $1, with 80 credits up front, then $15/month if they stay.

Updated details for the listing, if it's useful:

  Free trial     $0 — 25 credits, no card
  Paid trial     $1 for 7 days (80 credits), then $15/mo
  Starter        $7/mo — 40 credits
  Creator        $15/mo — 90 credits
  Studio         $29/mo — 160 credits

So "from $9.90/mo" (if that's what the page still says) is now "from $7/mo",
and the headline is really the $1 trial.

What Kineo does, in one line: you type an idea and it directs, narrates and
edits a cinematic vertical short in about three minutes — nine engines
behind one button, including Veo, Kling and Seedance.

Your affiliate link is still live and still 40%:
https://www.usekineo.com/a/8WVZSBUX

If a deal page or a coupon would work better for your audience than a plain
listing, tell me what format you need and I'll set it up.

Joseph
usekineo.com
```

---

## ✉️ RASCUNHO 2 — ToolRiot

**Para:** `hello@toolriot.com`
**Assunto:** Kineo pricing changed today — updated details for your listing

```
Hi,

Joseph here, founder of Kineo (usekineo.com). You signed up as a partner at
the start of August and I don't think we ever sent you anything usable —
that's on me.

Our pricing changed today, so here's the current picture for your listing:

  Free trial     $0 — 25 credits, no card
  Paid trial     $1 for 7 days (80 credits), then $15/mo
  Starter        $7/mo — 40 credits
  Creator        $15/mo — 90 credits
  Studio         $29/mo — 160 credits

The $1 seven-day trial is new as of today and it's the number worth leading
with — it's the cheapest way anyone can actually test the thing.

What it does: you type an idea, and it directs, narrates and edits a
cinematic vertical short in about three minutes. Nine engines behind one
button (Veo, Kling, Seedance and others). Examples, if you want stills or
clips for the listing: https://www.usekineo.com/examples

Your partner link, 40% recurring:
https://www.usekineo.com/a/J7SCBLLU

If you need screenshots, a logo pack, or a short demo clip in a specific
size, just tell me the spec and I'll send it over.

Joseph
usekineo.com
```

---

## 🔧 A FICHA QUE SÓ O FUNDADOR PODE EDITAR — TAAFT

`https://theresanaiforthat.com/ai/kineo/` é **nossa** (a conta é do fundador),
e o `CLAUDE.md` registra desde 25/08 que ela está desatualizada: fala em trial
de 40 créditos e "from $9.90/mo". Com a tabela acima, **as duas linhas estão
erradas** e agora falta a terceira, que é a que vende.

Sugestão de texto curto para o campo de preço:

```
Free: 25 credits, no card.
$1 for a 7-day Creator trial (80 credits), then $15/mo.
Plans from $7/mo.
```

---

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Enviar os dois rascunhos acima** da sua caixa (`john@colormango.com` e
   `hello@toolriot.com`). São os dois únicos sócios que são canal de
   distribuição, e nunca receberam material.
2. **Corrigir o preço na ficha do TAAFT** com o bloco de texto acima — a
   página é sua e hoje anuncia dois números que não existem mais.

## 📋 O QUE ACONTECEU

A casa tem dois parceiros de distribuição parados desde julho/agosto, e a
carta automática de sócio que saiu hoje foi escrita para criadores ("poste
para o seu público") — que não é o que um diretório faz. Estes dois rascunhos
fazem o pedido certo: atualizar a ficha, com a tabela de preço conferida no
código. E ao conferir, apareceu o achado que vale além destes dois e-mails:
**o `CLAUDE.md` ainda descreve a tabela de preço V5, que morreu em 19/08.**
Qualquer sessão que escrever preço a partir dele vai publicar $9.90 e 50
créditos — os dois errados.
