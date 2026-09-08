# RASCUNHO — aviso aos 12 pagantes sobre os planos novos (08/09/2026)

> **Não enviado.** Sai só com "vai" do fundador, da caixa dele ou pela rota
> admin em dry-run → SEND. Os 12 **não perdem nada**: a assinatura deles na
> Stripe continua no preço antigo (a Stripe não reprecifica assinatura
> existente), e na renovação o webhook concede `TIER_CREDITS` do plano —
> que agora é MAIOR para Starter (40→60) e Creator (90→150). Ou seja, o
> pagante antigo paga o preço antigo e recebe os créditos novos. O gate de
> motor não os alcança (conta criada antes de 08/09 07:00 UTC).
>
> Por isso a carta é curta e é boa notícia. Sem pedido, sem venda.

**Assunto:** Your Kineo plan just got bigger (same price)

```
Hey,

Quick one, and it's good news.

Today I rebuilt Kineo's plans around how people actually use it — by films
per week, not by credits. New accounts now pay $9, $19 or $29.

You're not new. Your price doesn't change. But your monthly credits do:

  Starter   40 → 60 credits   (about 3 films a week)
  Creator   90 → 150 credits  (about 1 film a day)
  Studio    180 credits, every engine, as before

It applies automatically on your next renewal. Nothing to do.

One more thing: the free trial is gone. Every new account now starts with
$1 for 7 days of Creator. You were here before that — thank you for that.

If anything looks off on your account, reply to this e-mail and I'll fix it
the same day.

Joseph
usekineo.com
```

**Para quem for disparar:** lista = `profiles.has_paid = true` e conta externa
(sem josephsskaf/usekineo/kineo.local), 12 pessoas em 08/09; 1× por pessoa;
contatos proibidos fora (den.higgins, noelrss21, emiliomontinari, akajitin —
conferir se algum está entre os 12 e pular). Rota sugerida: uma
`app/api/admin/send-plan-upgrade-notice` no padrão da casa (dry-run por
padrão, carimbo por pessoa, descadastro) — **ainda não existe**; ou o
fundador manda 12 e-mails da caixa dele.
