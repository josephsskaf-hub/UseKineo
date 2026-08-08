# Rascunho de recuperação — [cliente ZA - e-mail no banco]

`KINEO-CHECKOUT-REDIRECT-2026-08-08` · **NÃO ENVIADO — aguardando aprovação do fundador**

## Contexto (para o fundador, não vai no e-mail)

- Usuário `e934461f-… (perfil ZA)`, África do Sul, conta de 07/08 18:22.
- Tentou comprar o **Creator** às 19:27 de 07/08. A sessão Stripe foi criada
  (`cs_live_… (id no banco)…`) e o navegador dele nunca conseguiu abrir a página da Stripe.
- **Essa sessão já expirou** (TTL de ~2 h desde `KINEO-FAST-RECOVERY-2026-08-02`).
  O link abaixo cria um checkout novo.
- `stripe_customer_id` está nulo e ele nunca usou o intro → **o primeiro mês a
  $9.90 vai aplicar normalmente** agora que o bug do cupom `_VALUE` foi
  corrigido. Ou seja: o link entrega exatamente o preço que o botão prometeu.
- **Sem desconto extra.** A política é 50 % só nos e-mails D5/D10, e ele está em D1.
- Ele precisa estar logado; se não estiver, o link o leva ao login e retoma o
  checkout sozinho (`?resumed=1`).

**Link:** `https://shortsforgeai.com/api/stripe/checkout?tier=basic&intro=1`

---

## E-mail (inglês)

**Assunto:** Your Kineo checkout didn't open — here's a working link

**Pré-header:** It was our bug, not your card. Nothing was charged.

---

Hi Misheck,

You tried to upgrade to Creator yesterday and the payment page never opened on
your end. That was a bug on our side, not anything you did — and nothing was
charged to you.

I found it in our logs and it's fixed now. Here's a link straight to your
checkout:

**https://shortsforgeai.com/api/stripe/checkout?tier=basic&intro=1**

That's Creator at **$9.90 for your first month**, then $19.90/month — the same
price you saw on the button. 150 credits a month, cancel anytime from your
dashboard in one click, 7-day money-back guarantee.

You'd already made a few videos before you hit that button, so I'd rather not
let a broken redirect be the reason you stopped. If it fails again, just reply
to this email and I'll sort it out personally.

Thanks for your patience,

Joseph
Kineo — shortsforgeai.com

---

## Notas de revisão

- Assume a culpa explicitamente ("bug on our side"), sem jargão técnico.
- Diz "nothing was charged" duas vezes — é a dúvida nº 1 de quem viu um checkout falhar.
- Repete o preço exato que ele viu na tela ($9.90 → $19.90), fechando o risco de
  o e-mail prometer uma coisa e a Stripe cobrar outra (que foi o segundo bug).
- Sem desconto, sem urgência falsa, sem contagem regressiva.
- Um único CTA.
- Menciona que ele já criou vídeos — é verdade (11 de 40 créditos gastos) e é o
  argumento mais forte que existe aqui.
