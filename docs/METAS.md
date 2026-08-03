# METAS DA EMPRESA — definidas pelo fundador em 01/08/2026

**META 1: 500 usuários PAGANTES**
**META 2: 1.000 usuários PAGANTES**

**A MÉTRICA OFICIAL DAS METAS = PLANO PAGO ATIVO** (corrigido pelo fundador em 02/08:
`has_paid` conta quem já pagou NA VIDA, incluindo reembolsados — mentira otimista).
Baseline em 02/08/2026: **PAGANTES ATIVOS = 2** (valos/basic + emilio/starter) ·
has_paid histórico = 5 · recorrentes que renovaram = 0. Usuários reais: ~875.
Query oficial: `select count(*) from profiles where plan is not null and plan <> 'free'
and <filtro contas internas>` — sempre reportar as 3 contagens juntas, meta mede a ATIVA.

## Tradução em dinheiro (mix Starter-dominante, ~R$50/mês médio)
- Meta 1 (500) ≈ **R$ 25.000+/mês** de receita recorrente
- Meta 2 (1.000) ≈ **R$ 50.000+/mês**

## A matemática do caminho (pagantes = cadastros × conversão)
| Conversão | Cadastros p/ Meta 1 | No ritmo 68/dia |
|---|---|---|
| 1% | 50.000 | ~2 anos |
| 2% | 25.000 | ~1 ano |
| 4% | 12.500 | ~6 meses |

**Conclusão operacional: a meta exige atacar as DUAS alavancas ao mesmo tempo.**
1. **Volume**: 68/dia → 150–250/dia (novos canais: Fazier, Reddit, SEO/AEO, afiliados 40%,
   diretórios em lote, case study rankeando)
2. **Conversão**: ~0,5% histórico → 2–4% (lifecycle no D+1, momento-teto, recovery de
   checkout, prova social/reviews, preço intro, confiança na marca)

## Regra para as sprints
- Toda sprint conecta o que fez a UMA das duas alavancas, com número esperado.
- O placar diário reporta a distância pela MÉTRICA OFICIAL (plano pago ativo) — marco a
  anunciar: 10, 25, 50, 100, 250, 500. has_paid é métrica secundária (histórica).
- Marco intermediário de moral: primeiro dia com 3+ vendas; primeira semana com 10+.
