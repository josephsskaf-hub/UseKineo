# Stripe: mais tentativas de cobrança (28/09/2026) — conta live acct_1NLBTkIah5dxzSBf

Caminho no painel: Recuperação de receitas → Novas tentativas → Pagamentos com cartão → Gerenciar.
Prints em docs/cowork-stripe-retentativas-2026-09-28/.

## 1-5 · Regra de retentativas
| | ANTES | DEPOIS |
|---|---|---|
| Método | Smart Retries | Smart Retries (sem mudança) |
| Tentativas | 4 vezes | **8 vezes** (o máximo do seletor: 4 / 8 / Personalizada) |
| Prazo | 3 semanas | **2 meses** (o máximo do seletor: 1 sem / 2 sem / 3 sem / 1 mês / 2 meses / Personalizada) |
| Se todas falharem (assinatura) | cancelar a assinatura | cancelar a assinatura (sem mudança) |
| Se todas falharem (fatura) | deixar a fatura vencida | deixar a fatura vencida (sem mudança) |

- Salvo, recarregado e conferido: o painel reabre com "8 vezes" e "2 meses" (print 02).
- O print do ANTES aparece no chat da sessão, mas não foi gravado em arquivo (captura de tela instável com a aba em segundo plano). Os valores acima foram lidos da tela.
- A Stripe não mostrou nenhum aviso nem bloqueio.

## 4 · E-mails de falha (aba E-mails)
- "Enviar e-mails quando ocorrer falha nos pagamentos com cartão": LIGADO. O link é o da "página hospedada pela Stripe" (atualizar o cartão). Nada foi mudado (print 04).
- Fora do escopo, só para registro: "Enviar e-mails sobre cartões prestes a expirar" está LIGADO, mas com um "link personalizado" = https://www.usekineo.com (a home, não uma página de trocar cartão). Não mexi.

## 6 · salswina (cus_V7xL5GScRO8II0 · sub_1U7hVBIah5dxzSBfVGyCXK1w · in_1UIwHLIah5dxzSBfoX2kha68)
- Fatura H91AVF24-0002, US$ 29,00, Kineo — Studio (período 23/09–23/10), status "Tentando novamente".
- Próxima tentativa: **continua 1 de out. 00:57**. A data não mudou depois de salvar.
- Texto da Stripe na fatura: "Haverá nova tentativa de pagamento em em 3 dias. Se não for possível tentar corrigir a falha original, o pagamento só será executado se a forma de pagamento for atualizada."
- Assinatura: "Vencida"; próxima fatura US$ 29,00 em 23/10; cartão •••• 9863; metadados tier=pro, plan_credits=180.
- A Stripe NÃO mostra uma data de cancelamento em nenhuma das duas telas. Não dá para confirmar pelo painel se a política nova (2 meses) vale para esta fatura já em andamento ou só para as próximas falhas.
- Nada foi cobrado, cancelado ou alterado.

## 7 · Assinaturas vencidas / não pagas
| E-mail (4 letras) | Plano | Valor | Próxima tentativa | Status |
|---|---|---|---|---|
| sals | Kineo — Studio | US$ 29,00/mês | 01/10 00:57 | Vencida (past_due) |

- Não paga (unpaid): nenhuma ("Nenhuma assinatura encontrada").

## Observações para decisão
1. Com 2 meses de tentativas, uma assinatura vencida continua gerando fatura nova a cada ciclo. A da salswina gera a próxima em 23/10, antes de acabarem as tentativas de 23/09. O cliente pode acabar com 2 faturas abertas.
2. Enquanto a assinatura fica "Vencida", conferir no código se o webhook tira o acesso ou os créditos. Com 2 meses em vez de 3 semanas, quem não paga fica mais tempo "vivo".
3. O "Studio" da salswina custa US$ 29,00, e não os US$ 39,90 do pricing V5: é preço antigo, mantido (grandfather).
