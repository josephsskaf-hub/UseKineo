# A escada de filmes não prevê pagamento — ela descreve quem já pagou

> Medição de 04/09/2026, rotação 1 do ciclo de 10h da pista de retenção.
> Fonte: Supabase (SELECT), contas internas excluídas. Rótulos conforme AGENTS.md §4.
> **Nada foi revertido e nada deveria ser revertido por causa deste documento.**

## 1. O número que a casa vem usando

Seis entregas da sprint de retenção (#17→#19 e o plano R2/R3/R4) foram
justificadas por esta régua, que aparece em `docs/RELATORIO-CLAUDE-CICLO-2026-09-04.md`
e em vários comentários de código:

| filmes (30d) | pessoas | pagaram | % |
|---|---:|---:|---:|
| 1 filme | 319 | 2 | 0,6% |
| 2-3 | 112 | 2 | 1,8% |
| 4-7 | 13 | 2 | **15,4%** |
| 8+ | 6 | 2 | **33,3%** |

Leitura que se fez dela: *"o 4º filme prevê pagamento 23× melhor que o 1º —
mover a pessoa do filme 1 para o 2 é a jogada."*

## 2. O defeito da régua (FATO CONFIRMADO)

**Ela conta filmes feitos DEPOIS do pagamento.** Quem assina ganha crédito e
então faz filmes; a régua lê esses filmes como se fossem a causa da assinatura.

Os 13 pagantes externos de toda a história, com o corte no primeiro
`payment_success`:

| pessoa | pagou em | filmes ANTES | filmes DEPOIS |
|---|---|---:|---:|
| d51f2aac | 02/09 | 0 | 2 |
| 62aa2fcc | 31/08 | 1 | 3 |
| e7f1a87c | 23/08 | 5 | 8 |
| 8164e50a | 18/08 | 1 | 0 |
| 7d4baa98 | 17/08 | 1 | 16 |
| 75f76a4c | 10/08 | 0 | 4 |
| 0e53e01c | 03/08 | 2 | 3 |
| c91aecfe | 01/08 | 0 | 0 |
| a5737555 | 12/07 | 1 | 1 |
| a0aee4b4 | 10/07 | 1 | 5 |
| bb51a203 | 09/07 | 0 | 7 |
| 614424df | 06/07 | 1 | 1 |
| 96930eb2 | 09/06 | 0 | 0 |

- **13 filmes** foram feitos antes de pagar. **50 filmes** depois.
  **79% dos filmes dos pagantes nasceram DEPOIS do dinheiro.**
- **11 dos 13 pagantes (85%) pagaram com 1 filme ou NENHUM.**
- Só 1 pessoa na história chegou a 4+ filmes antes de pagar.

## 3. A régua honesta

Mesma pergunta, contando **só filmes anteriores ao primeiro pagamento**
(sem janela: história inteira, para não jogar pagante antigo na faixa zero):

| filmes ANTES de pagar | pessoas | pagaram | % |
|---|---:|---:|---:|
| 0 filmes | 961 | 5 | 0,52% |
| 1 filme | 570 | 6 | **1,05%** |
| 2-3 | 171 | 1 | **0,58%** |
| 4-7 | 23 | 1 | 4,35% |
| 8+ | 9 | 0 | 0,00% |

**A escada some.** O degrau que a sprint inteira está tentando construir — do
filme 1 para o 2 — é o único que a régua honesta mostra **para baixo**
(1,05% → 0,58%). O "23× melhor" não sobrevive ao corte temporal.

## 4. O que isto NÃO autoriza

- **NÃO reverter nada.** 13 pagantes é amostra pequena; a faixa 4-7 tem 23
  pessoas e 1 pagante. Critério de parada do ciclo: ausência de melhoria
  comercial com pouca amostra é **INCONCLUSIVA**, nunca motivo de reversão.
- **NÃO desligar as portas do episódio 2.** Elas continuam certas como produto:
  quem volta e encontra campo em branco vai embora (82 de 103 pessoas, #19), e
  isso é defeito de experiência independente de conversão.
- **NÃO reabrir preço.** Conclusão do fundador de 19/08 segue fechada.

## 5. O que isto muda na leitura

1. **Retenção é produto, não é a alavanca da assinatura.** Continuar a pista
   está certo; vender internamente a pista como "o caminho do dinheiro" está
   errado. Quem paga, paga cedo — com 0 ou 1 filme na mão.
2. **A régua K1 do próprio ciclo já estava certa e agora tem prova:**
   *"segundo episódio NÃO é pré-requisito para comprar"*. Os dados dizem mais:
   o segundo episódio nem sequer é indício de que a pessoa vai comprar.
3. **A faixa que concentra pagante é a de 1 filme (6 dos 13).** É a maior faixa
   com a maior taxa. O que ela precisa não é de um 2º filme — é da oferta na
   hora em que o 1º fica pronto.

## 6. LIMITAÇÕES (ler antes de citar este documento)

- **`payment_success` não distingue assinatura de pacote avulso.** 17 eventos,
  14 pessoas, de 09/06 a 02/09, e **nenhum** carrega campo `mode`, `plan` ou
  `type`. Onde este documento diz "pagou", leia "entrou dinheiro", não
  "assinou". Fechar essa lacuna é pré-requisito para qualquer meta de MRR.
- Amostra de 13. Nenhuma diferença entre faixas aqui é estatisticamente sólida.
- Filmes contados são `videos.status='completed'`. Animate/Images/Audio não
  criam linha em `videos` e ficam de fora (ponto cego conhecido, #295).
- O corte usa o PRIMEIRO `payment_success`; renovação não reabre o corte.

## 7. Como refazer

```sql
with internos as (select id from profiles where email ilike '%josephsskaf%' or email ilike '%@usekineo.com%'),
pessoas as (select id from profiles where id not in (select id from internos)),
pag as (select user_id, min(created_at) t from events
        where name='payment_success' and user_id is not null group by 1),
base as (
  select p.id,
         (select count(*) from videos v where v.user_id=p.id and v.status='completed'
            and (pag.t is null or v.created_at < pag.t)) filmes_antes,
         (pag.t is not null) pagou
  from pessoas p left join pag on pag.user_id = p.id)
select case when filmes_antes=0 then '0' when filmes_antes=1 then '1'
            when filmes_antes between 2 and 3 then '2-3'
            when filmes_antes between 4 and 7 then '4-7' else '8+' end faixa,
       count(*) pessoas, count(*) filter (where pagou) pagaram
from base group by 1 order by min(filmes_antes);
```

## 8. Próximo item que este documento cria

1. **Dar plano ao `payment_success`** (assinatura × avulso × qual tier). Sem
   isso a métrica única do ciclo — "pessoas externas novas com `payment_success`"
   — não sabe dizer se alguém assinou. Dono natural: pista do caixa (Codex);
   se ele não voltar, vira trabalho desta pista.
2. **Medir a oferta no pico do 1º filme**, que é onde os 6 pagantes de 1 filme
   estavam quando decidiram — em vez de medir o degrau para o 2º.
