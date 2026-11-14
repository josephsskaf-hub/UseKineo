# Ensaio no corpus: os achados do revisor (item D da CEO, 14/11) · Divisão 2

Guardião: `scripts/test-revisor-d-1411.mjs` (9 ok, 6 mutantes vermelhos) e `scripts/test-ficha-do-autor-manda-1411.mjs` (6 ok, 4 mutantes vermelhos).

## 1. `prompt_inteiro` mostrava o texto no ponto do ensaio (KINEO-PROMPT-DO-MOTOR-1411)
- Depois do ensaio, a rota ainda mexe no texto:
  - os eixos do filme grátis;
  - a trava da folha (a ficha em toda cena com personagem);
  - o corte do Kling 4.
- O ensaio de US$ 0 agora devolve `prompt_do_motor`: as mesmas funções, na mesma ordem, sobre uma CÓPIA.
  - `etapas` diz quais etapas rodaram;
  - por cena: `still_e_clipe`, e `kling4` no grátis.
- Não entram: as âncoras lidas da folha (visão paga) e o ajuste do sujeito do Kling 4.
- O guardião confere que a rota, depois do ensaio, segue com as três etapas na mesma ordem. Se a rota mudar, ele avisa.

## 2. Ficha do autor (KINEO-FICHA-DO-AUTOR-MANDA-1411 v2)
Universo: os 30 filmes de 30 dias com ficha de autor humana no claim. Rodei a v1 da main contra a v2.

| proposta | resultado no corpus | decisão |
|---|---|---|
| O nome tem de apontar UMA pessoa da camada ("John" com John Carter e John Miller = de ninguém) | 0 mudança | ENTROU |
| O 1º nome sozinho só vale para o nome inteiro se o autor escreveu o nome inteiro | d2201895: a ficha "Mara" é a da Mara Lindqvist. Exigir o nome inteiro devolvia a sorteada "in her thirties, shoulder-length dark hair" para a mulher de cinquenta, de cabelo curto ruivo. ERRADO | NÃO entrou |
| Ficha parcial ("wears a red scarf") guarda idade, gênero e cabelo da sorteada | Na mesma Mara, o cabelo sorteado contradiz o texto ("short red hair"). A ficha do autor guarda só "a tall woman", e a sorteada não leu o texto. ERRADO | NÃO entrou |

- Para a ficha parcial, o caminho que não erra é ler idade, gênero e cabelo do PRÓPRIO texto do autor (a frase inteira da Mara) e não da sorteada. Isso é lote próprio, com ensaio.
- O mutante que sobrevivia ("ficha do autor vale para bicho") agora morre: o Bobbie com uma ficha de gente de mesmo nome não ganha "a man in a grey hat".

## 3. Deserto de passagem (KINEO-LUGAR-DA-FALA-1411 (v))
- `lugarAridoDosPlanos` levava a todas as cenas o árido citado num plano só.
- Corpus: 7 filmes de 30 dias com árido nos planos.
  - Os certos têm o árido em 2 planos ou mais: Racetrack (lakebed nos planos 2 e 4) e Layla e Qais (desert nos planos 1 e 2).
  - Os de passagem têm em 1: o 8f5dc353 e "the lake bed" debaixo d'água do a6b950a5.
- A 2ª leitura passa a exigir o árido em 2 planos ou mais.
- No histórico muda 0 filme: os de passagem já davam null por outro motivo. É proteção.

## 4. "the mechanics of the garage door" (KINEO-CENA-SEM-GENTE-1411 v5)
- O grupo ("garage", "workshop", "base"…) seguido de uma coisa ("door", "opener", "gate", "lock", "engine"…) é o mecanismo, não gente.
- "Mechanics of the garage work on a vintage car" e "Mechanics of the air force" seguem gente.
- Corpus de 30 dias: 0 ocorrência. É proteção.

## Registro (CEO 14/11 12:40): o deserto num plano só não se espalha, de propósito
- Nos 3 dry-runs da Layla e Qais, o planejador pôs "in a vast desert" só no plano 1, e a fala, em hindustâni, não diz deserto.
- Pela régua dos 2 planos (item 3 acima), o árido não vai às outras cenas.
- A CEO aceitou: um plano só é o mesmo caso do deserto de passagem.
