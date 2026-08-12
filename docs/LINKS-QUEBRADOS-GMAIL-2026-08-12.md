# Os links dos e-mails escritos à mão saem quebrados — e um usuário avisou

`KINEO-GMAIL-WRAPPED-LINKS-2026-08-12` · sprint 19h

## O relato de campo (não é hipótese)

`marc@lienard.us`, 11/08 12:41Z, respondendo ao blast "Did Kineo work for you?":

> **"I was going to leave a survey but the link you provided did not take me there"**

Uma pessoa que **quis deixar a review**, clicou, e não chegou. A resposta dela
está **sem leitura e sem resposta há ~36 h**.

Quem é (produção, 12/08): trial **ATIVO**, conta de 08/08, **1 vídeo concluído**,
**1 de 40 créditos usados**, `email_opted_out = false`.

## O defeito

O link de review no corpo do e-mail é, literalmente:

```
https://www.google.com/url?q=https://theresanaiforthat.com/ai/kineo/&source=gmail&ust=1786499036985000&sa=E
```

Isso não é a URL do TAAFT. É o **wrapper de rastreamento do próprio Gmail**,
colado como href. O `ust=1786499036985000` é um carimbo de tempo assinado
(≈ 11/08 22:23 UTC) e o `sa=E` é a assinatura que o acompanha — o interstício
`google.com/url?q=` avalia esse par, e fora da sessão que o gerou ele degrada
para página de aviso, erro, ou é removido pelo cliente de e-mail do
destinatário.

**Como isso nasce:** a URL foi copiada de dentro de uma janela do Gmail já
renderizada (onde o Gmail reescreve todo link para exibir) em vez de digitada
crua. O corpo enviado leva o wrapper.

O mesmo e-mail leva o wrapper **também na assinatura**:
`https://www.google.com/url?q=http://usekineo.com&...`

## Alcance medido

| superfície | estado |
|---|---|
| blast "Did Kineo work for you?" (10–11/08) | **44 destinatários em bcc**, os dois links wrapeados |
| rascunho `r-2585367767906864369` → `akajitin@gmail.com` | **AINDA NÃO ENVIADO** — mesmo defeito, 2 links |

O rascunho para o `akajitin` é o caso caro: é o cliente que veio do TAAFT, pagou
em menos de 30 minutos e **se ofereceu para divulgar a Kineo nas comunidades
dele**. O link que está quebrado nesse rascunho é justamente o de
**cadastro no programa de afiliados** — a ação inteira que o e-mail pede.

## Por que não é cosmético

O TAAFT é o único canal que já produziu pagamento (2 dos 4 compradores) e trouxe
226 cadastros. A ficha está com **3,0 estrelas de 1 review** contra **9.276
cliques**. A nota é o gargalo do melhor canal da empresa — e o único disparo
feito para consertar a nota saiu com o link da review quebrado, para 44 pessoas.

## O conserto (URLs corretas, para colar cruas)

```
https://theresanaiforthat.com/ai/kineo/
https://www.usekineo.com/affiliate
https://www.usekineo.com
```

**Regra para os próximos:** digitar a URL crua no corpo, nunca colar link de
dentro de uma tela do Gmail. Se o texto contiver `google.com/url?q=`, o e-mail
não sai.

## Resposta pronta para o Marc (não enviada — Send é do fundador)

**Para:** marc@lienard.us · **Assunto:** Re: Did Kineo work for you?

```
Marc — that link was broken on my end, not yours. I pasted it out of Gmail and
it went out wrapped in a redirect that doesn't resolve. Sorry, and thank you for
telling me: you're the reason I found it, and it went to 44 people.

Here's the real one:
https://theresanaiforthat.com/ai/kineo/

No pressure at all on the review. If you'd rather just tell me what you thought,
hit reply — that's worth more to me than a rating.

Joseph
```

**Por que essa é a versão certa:** não pede nada além do que ele já quis fazer,
não anexa oferta, e não promete correção de produto que não houve. Ele está em
trial ativo com 1 de 40 créditos — a tentação de enfiar upsell aqui é exatamente
o erro que a sprint das 13h documentou (pedir cartão a quem ainda não recebeu o
que veio buscar).

## O outro inbound da ronda

`matthewahawes@gmail.com` (11/08 02:16Z): *"It's not that it didn't work, I just
wanted to see your jumping off point. Please cancel the service."*

**Nada a cancelar e nada a fazer no banco** — conferido em produção: `plan=free`,
`has_paid=false`, `stripe_subscription_id` nulo, e **`email_opted_out` já está
`true`**. O sistema já o suprimiu sozinho. Falta só uma linha de resposta
dizendo que nada foi cobrado — Send do fundador.

`aimalvabusiness@gmail.com` (07/08): recusa clara e definitiva do afiliado
("both are no"). Sem ação, sem follow-up.
