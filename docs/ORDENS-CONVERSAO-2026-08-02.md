# ORDENS DE CONVERSÃO — 02/08 (CEO interativo + fundador). SPRINTS: EXECUTAR NA PRÓXIMA RODADA.

Contexto: 6 pessoas em checkout em ~24h (recorde). 1 comprou (emilio, Starter USD, D0).
1 fraude bloqueada pela Stripe (jaymoneey — correto, não mexer). 4 abandonos REAIS:
hamzaahmedmalik90 (basic USD 00:47Z) · schwoopnation (basic USD 11:16Z) ·
hasmukhmj1511 (starter INR 13:13Z) · vomofuma7 (starter USD 17:34Z).
Padrão: 100% tiers de entrada; 2 nomes sul-asiáticos (decline bancário é hipótese forte);
19/64 pagamentos da história = "malsucedido" (decline do banco ~40%).

## ORDEM 1 — RECOVERY NO MESMO DIA (maior alavanca, executar primeiro)
Hoje: send-recovery só age sobre sessão EXPIRADA e Stripe expira em 24h → e-mail chega
D+1, intenção fria. Industry: recovery em 1–3h recupera 2–3×.
FIX: criar as Checkout Sessions com `expires_at` = agora + 2h (mín. Stripe: 30min) em
app/api/stripe/checkout/route.ts (e resume). Cron já roda a cada 2h → e-mail chega ~2–4h
após abandono. Verificar que o fluxo "resume" ainda funciona com sessão expirada (gera nova).
Métrica: recovery_sent_at→has_paid em 48h. Cuidado: NÃO tocar na cópia do e-mail (aprovada).

## ORDEM 2 — PAYPAL NO MOMENTO DO DECLINE
PayPal JÁ EXISTE (rotas app/api/paypal/* e menção em app/pricing/PricingClient.tsx — Regra
Zero: verificar como/quando aparece). Se só aparece no pricing: adicionar oferta de PayPal
no e-mail de recovery ("cartão recusou? Pague com PayPal:" + link) e/ou na tela pós-decline.
Endereça os ~40% de declines (Índia/Paquistão fortes na base).

## ORDEM 3 — MEDIR DECLINE POR PAÍS (dado pra decisão futura de pagamento local)
Stripe dashboard (sessão logada) → Payments malsucedidos → anotar países no doc da sprint.
Se 1-2 países dominarem, avaliar preço regional/métodos locais como ideia futura.

## Já vigiando (não duplicar): 4 abandonos entram no recovery automático; nudges D0 ativos;
contador momento-teto no ar; Fazier lança segunda 03/08.
