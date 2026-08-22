# Teste do Kling 3 — Stefan Mandel · 22/08

## Por que você gera, e não eu

Eu ia disparar pelo `/api/admin/demo-render`. Parei, porque seria repetir o
erro que acabei de descobrir e documentar hoje: **um worker que monta o filme
por um caminho diferente do cliente não testa o produto — testa a si mesmo.**

Foi assim que o Kling 3 saiu sem legenda nenhuma enquanto o H3 do produto
normal saiu com legenda. Se eu testasse pelo worker de novo, um resultado bom
não provaria que o cliente recebe a mesma coisa.

Gerando no site, o teste é do que o cliente vive. E como você quer postar, é
o mesmo caminho que produz o melhor arquivo.

---

## Configurações (regra da casa: script nunca vai solta)

| campo | valor |
|---|---|
| **Motor** | **Kling 3** |
| **Duração** | **60 segundos** |
| **Script** | **"Use my script as is"** — eu escrevi, é narração verbatim |
| **Custo** | 150 créditos |
| **Idioma** | Inglês |

⚠️ Não use "Let AI structure my text" — isso jogaria o roteiro fora e o GPT
reescreveria a fala, quebrando o Contrato C1.

---

## O roteiro (152 palavras · 66s de fala · 110% de cobertura)

```
HOOK
[Pexels: lottery ticket closeup]
A Romanian mathematician won the lottery fourteen times. He never broke a single law.

MICRO REWARD
[Pexels: chalkboard equations]
Stefan Mandel noticed something everyone else ignored. Sometimes a jackpot grows larger than the cost of buying every possible combination. When that happens, the lottery stops being gambling and becomes arithmetic.

ESCALATION
[Pexels: communist era eastern europe street]
He tested it first in communist Romania, on a salary of eighty eight dollars a month, and won enough to bribe his way out of the country.

RHYTHM
[Pexels: printing press paper]
Then he went bigger. Much bigger.

PAYOFF
[Pexels: computer room servers night]
In 1992 the Virginia lottery had seven million combinations at one dollar each, and a jackpot above twenty seven million. Mandel raised money from two and a half thousand investors, printed every ticket in advance, and delivered them by truck. He won twenty seven point one million dollars. Virginia investigated him for months, then admitted he had done nothing illegal. Every American lottery rewrote its rules afterward. Mandel lives on a beach in Vanuatu.
```

### Por que este tamanho

A régua nova exige 95% de cobertura de voz — no máximo 3 segundos sem
narração num vídeo de 60s. **Minha primeira versão tinha 127 palavras e foi
RECUSADA pela trava que eu mesmo acabei de escrever** (92% de cobertura).
Reescrevi com mais história real — não enchimento — até 152 palavras.

Isso é a trava funcionando antes de gastar 150 créditos, que é exatamente o
que ela existe para fazer.

---

## Checagem de fatos (cada afirmação é verificável)

| afirmação no vídeo | situação |
|---|---|
| matemático romeno, 14 vitórias | ✅ documentado |
| jackpot > custo de todas as combinações | ✅ é a tese dele, "combinatorial condensation" |
| testou na Romênia comunista | ✅ primeira vitória lá, usou para emigrar |
| salário de ~$88/mês | ✅ citado em entrevistas dele |
| Virginia 1992, ~7 milhões de combinações a $1 | ✅ 7.059.052 combinações |
| jackpot acima de $27 milhões | ✅ $27,1 milhões |
| 2.500 investidores | ✅ |
| bilhetes impressos antes e entregues de caminhão | ✅ |
| investigado e inocentado | ✅ nenhuma acusação prosperou |
| loterias americanas mudaram as regras | ✅ |
| vive em Vanuatu | ✅ |

Zero número inventado. Nenhuma estatística de algoritmo, nenhuma
porcentagem impossível — o oposto do vídeo do YouTube que eu vetei.

---

## O que eu meço quando ficar pronto

Assim que você me passar o link, eu baixo e rodo a mesma medição da auditoria:

1. **Cobertura de voz** — alvo ≥95% (no máximo 3s sem narração)
2. **Quadros pretos** — alvo zero
3. **Legenda** — frames em 6 momentos; alvo: legenda em todos
4. **Cenas repetidas** — assinatura visual a cada 5s
5. **Duração real** — alvo ≥60s para o TikTok Creator Rewards

Se passar nos cinco, o teste virou conteúdo e você posta. Se falhar em algum,
eu tenho o número exato do que consertar em vez de mais uma hipótese.

---

## Título e descrição, prontos para o caso de aprovar

**Título**
```
The Man Who Won the Lottery 14 Times — Legally
```

**Descrição**
```
Stefan Mandel was a Romanian mathematician on an $88 a month salary when he
noticed something nobody else had bothered to calculate.

Every lottery has a fixed number of possible combinations. Sometimes the
jackpot grows larger than the cost of buying all of them. When that happens,
the lottery stops being gambling and becomes arithmetic.

He proved it at home first, and won enough to buy his way out of communist
Romania. Then he scaled it. In 1992 the Virginia lottery had seven million
combinations at a dollar each, and a jackpot above twenty seven million.
Mandel raised the money from 2,500 investors, printed every ticket in
advance, and delivered them by truck.

He won $27.1 million. Virginia investigated him for months and found he had
broken no law. Lotteries across America rewrote their rules afterward — which
is the real ending: the loophole existed, someone did the math, and the game
had to change.

Made with Kineo — usekineo.com

#stefanmandel #lottery #mathematics #moneyfacts #truestory
```

**Comentário fixado**
```
The lottery didn't ban him. It just made sure nobody could do it again.
```
