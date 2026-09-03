# RÉGUA REAL POR MOTOR — medição em produção, 03/09/2026

> Medido na madrugada de 02→03/09 por sessão autônoma. **Só leitura.** Nenhuma
> constante foi tocada, nenhum código de produção foi alterado.
> Ordem do fundador em vigor: *"toma muito cuidado no que você vai mexer, está
> tudo muito perfeito hoje em dia."*

---

## 0. RESUMO EM 6 LINHAS (para ler antes de decidir)

1. **A hipótese de 02/09 está morta e enterrada.** Zero vídeos externos saíram
   abaixo de 60s quando o cliente pediu 60. Zero. Em 63 filmes.
2. **Palavras por segundo NÃO É MENSURÁVEL** com os dados que existem hoje. O
   banco não guarda a narração de nenhum vídeo. Explicação e prova no §2.
   Não estimei número nenhum — conforme a ordem.
3. **Nenhuma constante precisa mudar.** Nem 3,1 nem 2,3. A régua está fazendo
   o trabalho dela.
4. **O defeito real de duração está em outro lugar:** a *continuação de série*
   no Kineo 1 entrega metade do pedido (17s para 35s pedidos).
5. **Achado de dinheiro:** 11 dos 63 filmes de 60s saíram com **exatamente 60,0s**
   — um segundo abaixo do que o TikTok Creator Rewards paga.
6. **Achado maior que os cinco acima**, encontrado no caminho: o gate
   `narration_too_short` **impediu 41 renders de 31 pessoas em 14 dias**, e
   **16 dessas pessoas nunca entregaram um único vídeo.** Detalhe no §5.

---

## 1. MÉTODO — e por que a amostra é 230, não 1.100

### 1.1 `videos.duration` só é a duração REAL desde 20/08
`app/api/compose/status/[renderId]/route.ts:468-473` (marca
`KINEO-DURACAO-REAL-2026-08-20`) passou a gravar a duração que o Creatomate
mediu no arquivo. **Antes disso a coluna guardava o valor PEDIDO**, com fallback
cravado em 30. Prova no dado: 456 vídeos `fast` com `duration` = exatamente 45
(o alvo padrão antigo) e 101 `cinematic_ai` iguais.

**Consequência:** os 1.100+ vídeos citados no briefing **não servem** para esta
pergunta. Usar o histórico inteiro compararia "pedido contra pedido" e daria
razão 1,00 em tudo — uma conclusão bonita e falsa.
Janela válida: **2026-08-20 → 2026-09-03**.

### 1.2 De onde vem o "pedido"
`events.generate_completed.metadata.duration`, pareado por `render_id`.
Verificado: esse campo assume **só** 35 / 45 / 60 / 90 (75 / 71 / 73 / 5
ocorrências) — é o botão do seletor, não a medida. E diverge de
`videos.duration` em 175 de 224 pares, o que confirma que um é pedido e o
outro é entrega.

### 1.3 Contagem no banco, não no cliente
Todas as contagens são `count(*)` em SQL dentro do Postgres. Nada passou pelo
PostgREST paginado — a classe de bug #275 (truncamento silencioso em 1000) não
tem como agir aqui.

### 1.4 Contas internas
Excluídas pela mesma lista de `lib/internalAccounts.ts` (5 e-mails exatos + 9
padrões LIKE), reproduzida em SQL. Onde os números internos aparecem, estão
**rotulados como internos** e nunca somados aos externos.

---

## 2. PALAVRAS POR SEGUNDO: NÃO É MENSURÁVEL (e isto é um achado, não uma desculpa)

Fui atrás do número e ele **não existe no banco**. Três fontes possíveis, três
becos sem saída, todos verificados:

| Fonte | O que tem | Por que não serve |
|---|---|---|
| `videos.script` | **NULL em 1.102 de 1.115 linhas.** As 13 exceções são de maio, em modos mortos (`pro`, `basic`) | A coluna existe e nunca foi escrita pelo pipeline atual |
| `videos.topic` | Texto do cliente, **cortado em 500 caracteres** (mediana = exatamente 500 nos dois motores principais = truncamento) | Duplo problema: (a) truncado; (b) no modo "Let AI structure" ele guarda a **ideia**, não a narração. Prova: nas linhas curtas (não truncadas) a mediana dá 51 palavras num filme de 45s = **1,1 pal/s**, taxa fisicamente impossível para narração. É a ideia, não a fala |
| `hollywood_resume.response` | Prompts de cena com a fala entre aspas | Guarda **só as cenas retomadas**, não o filme. Filmes de 6-9 cenas aparecem com 2-3 falas. Subconta por construção |

Nenhuma outra tabela (`render_jobs`, `broll_metrics`, `generations`,
`credit_debits`) tem texto de narração.

**Portanto:** a taxa de 2,63 pal/s medida no 3I/ATLAS é **n=1, contada à mão**,
e não é reproduzível nem generalizável. Não vou estimar as outras. Se o número
tiver que existir, ele precisa ser **instrumentado** — ver §6.

---

## 3. A TABELA — entregue ÷ pedido, por motor (contas EXTERNAS)

Janela 20/08 → 03/09. `n` = filmes concluídos com par pedido/entrega.

| Motor (`quality_mode`) | n | mediana entregue÷pedido | abaixo do alvo | ≥ alvo | alvo=60 | **entregou <60s com alvo 60** |
|---|---:|---:|---:|---:|---:|---:|
| **Kineo 1** (`fast`) | 124 | **1,00** | 18 (14,5%) | 106 | 19 | **0** |
| **Seedance 1.5** (`cinematic_ai`) | 99 | **1,03** | 1 (1,0%) | 98 | 44 | **0** |
| MiniMax H3 (`cinematic_h3`) | 3 | 1,09 | 0 | 3 | 0 | — |
| Kling 2.5 (`cinematic_kling`) | 2 | 1,13 | 0 | 2 | 0 | — |
| Omni (`cinematic_omni`) | 0 | — | — | — | — | — |
| Kling 3 / Veo / Seedance 2.5 | 0 | — | — | — | — | — |

**A coluna que interessava está zerada nos dois motores que fazem 100% dos
primeiros vídeos.** Ninguém pediu 60 e recebeu 44.

### Por botão (externos)

| Motor | alvo | n | mediana entregue | mínimo | máximo |
|---|---:|---:|---:|---:|---:|
| Kineo 1 | 35 | 30 | 37 | **17** | 48 |
| Kineo 1 | 45 | 73 | 45 | **23** | 62 |
| Kineo 1 | 60 | 19 | 62 | 60 | 87 |
| Kineo 1 | 90 | 2 | 90 | 90 | 90 |
| Seedance 1.5 | 35 | 34 | **43** | 35 | 55 |
| Seedance 1.5 | 45 | 20 | 45 | 44 | 62 |
| Seedance 1.5 | 60 | 44 | 62 | 60 | 90 |
| Seedance 1.5 | 90 | 1 | 90 | 90 | 90 |

### Motores caros — só existem em conta INTERNA (rotulado, n pequeno)

| Motor | alvo | n | mediana | abaixo |
|---|---:|---:|---:|---:|
| Omni | 60 | 6 | 65,5 | 1 (**46s**) |
| Omni | 90 | 1 | 49 | 1 (**49s** = 0,54 do alvo) |
| Omni | 35 | 2 | 43 | 0 |
| MiniMax H3 | 60 | 6 | 79 | 0 |
| Kling 3 | 60 | 4 | 65,5 | 0 |
| Kling 2.5 | 60 | 1 | 76 | 0 |
| Veo | 60 | 1 | 62 | 0 |

**n de 1 a 6. Mediana não é confiável nessa faixa — não tirar conclusão de
constante daqui.** O único sinal legítimo é qualitativo: o Omni é o único motor
que subentrega, e subentrega feio (0,54 do alvo num caso).

---

## 4. OS DOIS DEFEITOS QUE A MEDIÇÃO ACHOU

### 4.1 CONTINUAÇÃO DE SÉRIE NO KINEO 1 ENTREGA METADE (defeito de produto)

Os 18 "abaixo do alvo" do Kineo 1 não são iguais. Dezesseis estão entre 0,91 e
0,98 do alvo — arredondamento normal, ninguém percebe. **Dois são catastróficos**
e têm a mesma assinatura no `topic`:

| data | pedido | entregue | razão | início do topic |
|---|---:|---:|---:|---|
| 01/09 | 35 | **17** | 0,49 | `Create the next episode in the same Short series about "5 shocking fac…` |
| 02/09 | 35 | **20** | 0,57 | `Create the next episode in the same Short series about "the deepest ho…` |
| 03/09 | 35 | 33 | 0,94 | `Create the next episode in the same Short series about "5 shocking fac…` |

Medido isolando a assinatura, no Kineo 1, contas externas:

| caminho | n | % com entrega < 90% do alvo |
|---|---:|---:|
| normal | 115 | **0,9%** (1 caso) |
| `Create the next episode…` | 9 | **22,2%** (2 casos) |

**24× mais defeito.** `n=9` é pequeno e está dito, mas o modo de falha é
explicável: o que viaja para o gerador de roteiro não é uma ideia, é uma
**meta-instrução** ("crie o próximo episódio de…"). O roteiro nasce curto porque
nasceu de uma ordem, não de um assunto.

**Por que isso importa em dinheiro agora:** a única assinante nova da semana
(Cintia, §5 do relatório da noite) está fazendo uma **série em alemão** —
o primeiro arquivo dela chama-se `gefahrliche-begegnung-teil-1.mp4`. *Teil 1.*
Ela é, literalmente, a cliente pagante mais exposta a este bug.

### 4.2 ONZE FILMES DE "60s" SAÍRAM COM 60,0s — E O TIKTOK NÃO PAGA POR ELES

Dos 63 filmes externos com alvo 60:

| entrega | n | Creator Rewards |
|---|---:|---|
| exatamente 60s | **11** | **não paga** (o programa exige passar de 1 minuto) |
| 62s | 31 | paga |
| acima de 62s | 21 | paga |

Kineo 1: 7 de 19. Seedance 1.5: 4 de 44.

Não é a régua de narração: é o **piso de overshoot** (o `TIKTOK-61` citado no
CLAUDE.md) que não está pegando nesses casos. É o único número desta medição
que vira dinheiro do cliente direto, e são 17,5% dos filmes de 60s.

---

## 5. RECOMENDAÇÃO — uma linha por motor

| Motor | Recomendação | Por quê |
|---|---|---|
| **Kineo 1** (`fast`) | **MANTER 3,1.** Não tocar. | Mediana 1,00 e zero subentrega no alvo 60. Os 2 desastres são a série (§4.1), não a constante. Mexer na régua aqui não conserta nada e quebra 124 filmes que estão certos |
| **Seedance 1.5** (`cinematic_ai`) | **MANTER 3,1.** Não tocar. | 1 desvio em 99, e esse a 0,98. O botão de 35 entrega mediana 43 (razão 1,23) — está *passando* do alvo, que é o comportamento que o fundador chamou de certo em 02/09 |
| **MiniMax H3** | **Manter 2,3. Sem recomendação de número.** | n=3 externos / 6 internos. Amostra insuficiente para mediana confiável |
| **Kling 2.5** | **Manter. Sem recomendação de número.** | n=2. Insuficiente |
| **Kling 3** | **Manter 2,3. Sem recomendação de número.** | n=4, todos internos. Insuficiente |
| **Omni** | **Manter a constante; VIGIAR o motor.** | n=9, todos internos, mas é o único que subentrega (46s p/ 60; 49s p/ 90). O problema aparenta ser o planner do caminho hollywood, não a régua. Não mexer sem mais casos |
| **Veo / Seedance 2.5** | **Sem dado.** | Zero filmes externos na janela |

**Recomendação transversal (a única que eu faria hoje):** nada de constante.
As duas ações com retorno são (a) fazer a continuação de série mandar um
**assunto** e não uma ordem, e (b) garantir que 60 vire 61+ e nunca 60,0.

---

## 6. PARA O NÚMERO EXISTIR NA PRÓXIMA VEZ (custo: uma linha)

Hoje, para responder "qual a régua real", é preciso contar palavras à mão num
chat. Isso não escala e já produziu uma conclusão errada (a de 02/09 às 23h).

O conserto é gravar, no claim que já é emitido em todo render, dois campos que
o código **já tem na mão** no momento do despacho:

```
narration_word_count   // palavras da fala final, depois de todo replan
narration_speech_secs  // fit.speech, o mesmo valor que o gate já calcula
```

Com esses dois campos, `narration_word_count ÷ videos.duration` responde a
pergunta desta madrugada em uma consulta, por motor, para sempre — e o gate de
`narration_too_short` passa a poder ser calibrado com dado em vez de opinião.
Não muda comportamento nenhum: é telemetria.

**Não implementei.** É código de produção e a ordem da noite era medir.

---

## 7. O QUE ESTA MEDIÇÃO **NÃO** PROVA

- Nada sobre Veo, Seedance 2.5 e Kling 3 em cliente real — não há amostra.
- Nada sobre palavras por segundo, em nenhum motor (§2).
- Nada sobre o período anterior a 20/08 — a coluna mentia (§1.1).
- Nada sobre *qualidade* do filme. Duração certa e filme bom são coisas
  diferentes; aqui só se mediu duração.
- O n=9 da série (§4.1) é pequeno. O efeito é grande e o mecanismo é plausível,
  mas duas ocorrências não são uma lei.
