# Auditoria dos 6 motores — 22/08

Um render real de **cada** motor, baixado e medido com ffmpeg. Nada aqui é
opinião: são números extraídos do arquivo final que o cliente recebe.

## O resultado

| motor | duração | voz | silêncio | quadros pretos | legenda | cena repetida |
|---|---|---|---|---|---|---|
| Kineo 1 | 46s | **98%** | 1s | **0** | — | 0 |
| Seedance 1.5 | 61s | **98%** | 1s | **0** | ✅ 4/4 | 0 |
| Kling 2.5 | 59s | **100%** | 0s | **0** | — | 0 |
| Veo 3.1 | 60s | **100%** | 0s | **0** | — | 0 |
| MiniMax H3 | 65s | ⚠️ 75% | 16s | **0** | ⚠️ 3/4 | 0 |
| Kling 3 | 70s | ❌ **69%** | **22s** | **0** | ❌ **0/6** | 0 |

## 1. O "apagão" não existe. Em nenhum motor.

**Zero quadros pretos nos seis.** A luminância mínima medida foi 44 (Kling 3)
e a máxima 72 (Kling 2.5) — todos os vídeos têm imagem do começo ao fim.

O que existe é **narração sumindo**, e ela se concentra em exatamente dois
motores: Kling 3 (22s sem voz) e H3 (16s). Os outros quatro estão entre 98% e
100% de cobertura de voz — praticamente perfeitos.

**Por que só esses dois:** são os únicos que usam o planner Hollywood, com
cenas de tipo `dialogue` (fala nativa do modelo) e `support` (narração nossa).
Os outros quatro narram por cima de tudo, sem exceção, e por isso não têm
buraco.

## 2. O Kling 3 está sem legenda nenhuma

Extraí frames em 5s, 15s, 30s, 45s, 55s e 65s. **Nenhum tem legenda.**

Comparando com o Seedance nos mesmos moldes: legenda karaokê presente em 4 de
4 frames, com a palavra corrente destacada em amarelo. Funcionando como devia.

A cadeia é essa e explica tudo:

```
nossa TTS → Whisper → legenda karaokê
```

Cena `dialogue` não passa por aí — a fala é gerada **dentro** do clipe pelo
Kling. Sem TTS, sem Whisper, sem legenda. E as cenas `support`, que teriam
narração nossa, ficaram mudas porque o roteiro acabou antes.

Resultado: o único trecho falado do filme é o único sem legenda, e o resto não
tem nem fala nem legenda.

## 3. Zero cenas repetidas

Comparei a assinatura visual a cada 5 segundos em Kling 3, H3 e Seedance.
**Nenhuma assinatura se repete em nenhum dos três.** A trava de variedade
determinística (Contrato C3) está funcionando.

## 4. Um defeito de qualidade separado

No Kling 3, o frame dos **30 segundos está borrado** — rosto irreconhecível,
imagem fora de foco. Não é apagão nem narração: é o modelo entregando uma cena
ruim. O `SHARP_SUFFIX` já está nos prompts, então isto é variância do
fornecedor, não configuração faltando. O caminho aqui seria o QA por pixel
(Laplacian/luma) que ficou registrado como V2 e exige ffmpeg no servidor.

## 5. As travas antigas continuam de pé

Conferi uma a uma no código. Todas presentes:

| trava | estado |
|---|---|
| C1 — narração verbatim | ✅ 10 referências |
| C2 — duração é contrato | ✅ 5 referências |
| C2 — FAILFAST | ✅ 4 referências |
| C3 — variedade determinística | ✅ presente (e provada pela medição) |
| C4 — watermark | ✅ 8 referências |
| KINEO-TAIL (rabo mudo do fim) | ✅ presente |
| Teto de 12s por cena | ✅ presente |
| KINEO-NARRACAO-ENCHE (nova, hoje) | ✅ presente |

⚠️ **Nota de método:** minha primeira busca deu "AUSENTE" para quatro dessas
travas. Era falso — o padrão de busca não batia por causa dos acentos. Refiz
com busca insensível a acento e todas apareceram. Foi a quinta vez em dois
dias que um resultado que parecia conclusivo estava errado; conferir de novo
antes de reportar continua sendo o passo que mais paga.

## O que sobra para consertar

1. **Legenda na cena do avatar** (task #74). A fala nativa do Kling precisaria
   ser transcrita para virar legenda — ou o `dialogueLine`, que já é texto
   conhecido, poderia gerar a legenda diretamente sem Whisper. Essa segunda
   via é bem mais barata e é por onde eu começaria.
2. **Nitidez do Kling 3** — QA por pixel com re-render da cena reprovada.

O que **não** precisa de conserto: Kineo 1, Seedance, Kling 2.5 e Veo estão
íntegros nos seis critérios medidos.
