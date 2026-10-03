# Convite "Kineo Partners" — rascunho (03/10/2026)

**Status: RASCUNHO. Não enviar antes de:** (1) aplicar as migrations `20261003120000_courtesy_grants.sql` e
`20261003121000_partner_packs.sql`; (2) o fundador decidir se a etapa 1 sai sozinha na inscrição
(`PARTNER_PACK_LIVE` em `lib/partnerPack.ts`, hoje `false`) ou pelo botão "dar etapa 1" em `/admin/partners`.

Fontes dos números (não digitar à mão em outro lugar):
- créditos e prazo: `PARTNER_PACK_STAGE1_CREDITS` (25), `PARTNER_PACK_STAGE2_CREDITS` (25), `PARTNER_PACK_DAYS` (30) e
  `PARTNER_PACK_LEVEL` (`creator_trial`) em `lib/partnerPack.ts`;
- comissão: `AFFILIATE_COMMISSION_RATE` (0,3 → 30%) em `lib/affiliateCommission.ts`, recorrente enquanto o indicado
  assinar;
- repasse: `AFFILIATE_PAYOUT_TERMS` (liberação 30 dias depois do pagamento, PayPal até o dia 15, mínimo US$ 20);
- cupom do parceiro: 20% no primeiro mês do indicado (`AFFILIATE_COUPON_PERCENT` em `app/api/affiliate/me/route.ts`).

Regras do texto: nada de promessa de ganho, nada de "renda", nenhum número que não esteja nas fontes acima. O
parceiro ganha créditos para CRIAR; a comissão é consequência do que os indicados dele pagarem.

---

## English

**Subject:** Create with Kineo on us — and earn 30% from the people you bring

Hi {first name},

We'd like to invite you to Kineo Partners.

You get **25 credits to create with Kineo**, with the Creator engines unlocked for 30 days. Make something you'd
actually post, publish it with your personal link or coupon, and send us the post link from your partner dashboard —
after a quick review we add **25 more credits**.

From then on, you receive **30% of every payment your referred customers make, every month, for as long as they stay
subscribed.** Your coupon gives them 20% off their first month.

How it works:
1. Join at usekineo.com/affiliate — you get your link and coupon right away.
2. Create with your demo credits.
3. Post one public video with your link or coupon, and paste the post link in your dashboard.
4. Your dashboard shows link visits, signups, paying customers and commissions (pending, approved, paid out).

Commissions are released 30 days after each customer payment and paid via PayPal once a month by the 15th, with a
$20 minimum balance (smaller balances roll over).

{signature}

---

## Português

**Assunto:** Crie com a Kineo por nossa conta — e receba 30% de quem você trouxer

Oi, {nome},

Queremos te convidar para o Kineo Partners.

Você ganha **25 créditos para criar com a Kineo**, com os motores do Creator liberados por 30 dias. Faça algo que
você postaria de verdade, publique com o seu link ou cupom e mande o link do post pelo seu painel de parceiro —
depois de uma revisão rápida a gente soma **mais 25 créditos**.

A partir daí, você recebe **30% de tudo que os seus indicados pagarem, todo mês, enquanto eles assinarem.** O seu
cupom dá 20% de desconto no primeiro mês deles.

Como funciona:
1. Entre em usekineo.com/affiliate — o link e o cupom saem na hora.
2. Crie com os créditos de demonstração.
3. Poste um vídeo público com o seu link ou cupom e cole o link do post no painel.
4. O painel mostra visitas, cadastros, clientes pagantes e comissões (pendente, aprovada, paga).

A comissão é liberada 30 dias depois de cada pagamento do cliente e paga via PayPal uma vez por mês, até o dia 15,
com saldo mínimo de US$ 20 (saldo menor acumula para o mês seguinte).

{assinatura}

---

## Español

**Asunto:** Crea con Kineo por nuestra cuenta — y recibe el 30% de quien traigas

Hola, {nombre}:

Queremos invitarte a Kineo Partners.

Recibes **25 créditos para crear con Kineo**, con los motores del plan Creator desbloqueados durante 30 días. Haz algo
que de verdad publicarías, publícalo con tu enlace o cupón y envíanos el enlace de la publicación desde tu panel de
socio — tras una revisión rápida sumamos **25 créditos más**.

Desde entonces, recibes **el 30% de todo lo que paguen tus referidos, cada mes, mientras sigan suscritos.** Tu cupón
les da un 20% de descuento en su primer mes.

Cómo funciona:
1. Únete en usekineo.com/affiliate — tu enlace y tu cupón salen al instante.
2. Crea con los créditos de demostración.
3. Publica un video público con tu enlace o cupón y pega el enlace de la publicación en tu panel.
4. El panel muestra visitas, registros, clientes de pago y comisiones (pendiente, aprobada, pagada).

La comisión se libera 30 días después de cada pago del cliente y se paga por PayPal una vez al mes, antes del día 15,
con un saldo mínimo de US$ 20 (los saldos menores se acumulan para el mes siguiente).

{firma}

---

### Notas para quem envia
- Remetente: comercial/parceria nova sai de joseph@usekineo.com (regra de 29/09). Sempre rascunho; o fundador envia.
- "30% de tudo que pagarem": vale para mensalidades e pacotes avulsos. A fatura de rateio de troca de plano
  (upgrade no meio do mês, `billing_reason = subscription_update`) hoje NÃO gera comissão — 0 faturas dessas desde que o
  evento `subscription_update_invoice_paid` existe (09/09), mas se o fundador quiser o "tudo" literal, é uma linha no webhook (ver relatório de 03/10).
- Conta que já paga não recebe o pacote (a cortesia nunca vai por cima de plano). Para esse parceiro, retirar o
  primeiro parágrafo e manter só a comissão.
