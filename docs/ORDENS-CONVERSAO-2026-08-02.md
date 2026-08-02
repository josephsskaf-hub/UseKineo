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

---
# ORDENS DE CONVERSÃO — RODADA 2 (02/08 ~15h30, meta do fundador: 10 compradores)

## ORDEM 4 — E-MAIL DO TETO NO MESMO DIA (o gatilho mais quente que existe e não usamos)
Quem faz o 3º vídeo do dia provou 3× que quer o produto HOJE. O contador visual já existe;
falta o e-mail: quando um free user completa o 3º vídeo em 24h, enviar EM ATÉ 1H
(novo cron ou hook no compose): "You hit today's limit — Starter removes the wall,
first month half off". Stamp próprio (cap_hit_sent_at) + supressão cruzada 24h como os
demais. É o kwajo/emilio-pattern automatizado. Métrica: cap_hit → checkout_started no dia.

## ORDEM 5 — PROVA REAL NOS PONTOS DE DECISÃO (pricing + tela de upsell)
Hoje o /pricing não tem NENHUMA prova social. Adicionar faixa com números REAIS puxados
honestos (hardcode semanal ok): "870+ creators · videos rendered every day · rated on
TAAFT". Nada inventado, nada de fake counter. No upsell pós-vídeo, uma linha: "Join 870+
creators". Métrica: pricing_view → checkout_started.

## ORDEM 6 — OFERTA FOUNDING 50 (DECISÃO DO FUNDADOR PENDENTE — preparar, não ligar)
Proposta: primeiros 50 pagantes = "Founding Creator": preço travado pra sempre + badge no
app. Urgência honesta (contador real "5 of 50 claimed") + história pra contar no case
study. NÃO é desconto extra — é trava de preço (o intro já desconta). Sprint prepara a
mecânica (flag no profile + faixa no pricing) e o fundador dá o go/no-go no relatório 22h.

Contexto: já no ar hoje — resgate 2-4h, first-win pós-compra, garantia no radar (Ordem 2
rodada 1), cartas pessoais enviadas. Meta: 10 compradores → marcos 10/25/50 do METAS.md.
