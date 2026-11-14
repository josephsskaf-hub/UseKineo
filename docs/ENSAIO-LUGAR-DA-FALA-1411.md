# Ensaio no corpus: KINEO-LUGAR-DA-FALA-1411 e KINEO-COMENTARIO-NAO-E-CENA-1411 · Divisão 2 · 14/11/2026

Pedido da CEO às 09:50, itens B e C, a partir dos três dry-runs ao vivo com `prompt_inteiro`. O código foi executado offline sobre o claim dos últimos 30 dias, com a regra desligada e ligada. Guardião: `scripts/test-lugar-da-fala-1411.mjs` (14 ok, 8 mutantes vermelhos).

## B · O lugar do filme

### O que estava errado (com o texto exato)
- **Earhart.** As 4 cenas terminavam com "Setting of this film: the open sea Near that island."
  - No roteiro colado, a `description` de cada cena é a FALA sem pontuação.
  - A frase do lugar atravessava o ponto final ("…in the open sea. Near that island…") e ia para toda cena, inclusive a dos mecânicos na pista da Nova Guiné.
  - O filme pago das 04:16 (a7def2bc) saiu assim.
- **Racetrack.** Ficou sem lugar no 2º dry-run.
  - O pedido tem "Death Valley" e "dry lakebed", e o nome próprio contava como 2º tipo de lugar.
  - Os planos desta rodada não diziam "lakebed", só "Racetrack Playa", que é nome próprio.

### O que mudou (interruptor `LUGAR_DA_FALA_1411`; 'off' devolve byte a byte o de antes)
- **(i)** A frase do lugar sai do trecho do ROTEIRO que a fala repete palavra a palavra, com a pontuação dele (`comPontuacaoDoRoteiro`).
  - A rota passa `pedidoDoCliente` a `lugarDasCenas`.
  - Fala que não se alinha ao roteiro segue como antes.
- **(iii)** Nome próprio com maiúscula no meio da frase ("Death Valley") não conta como tipo quando o MESMO texto cita o lugar ÁRIDO pelo substantivo comum ("dry lakebed").
  - O lugar árido aceita a vírgula entre adjetivos ("an empty, dry lakebed").
- **(iv)** O nome de lugar que é só adjetivo de outra coisa não é lugar: "a family car trip", "bus driver", "car window", "house key", "market day".
  - "bus stop" e "car park" seguem lugar.
- **(ii)** "Roteiro com vários lugares dá null": na Earhart sai por (i).
  - O roteiro cita a ilha só como "that island" e "Howland Island", e nenhuma frase casa sem atravessar o ponto.
  - NÃO entrou: "sea", "ocean" e "runway" como bloqueadores. Eles mudariam filmes de praia ("beach" + "ocean" = dois tipos) sem ensaio próprio.

### Ensaio
Universo: todo filme de 30 dias em que alguma das quatro mudanças pode agir.
- 30 filmes com nome de lugar em maiúscula no meio da frase, lugar árido com vírgula, ou "Setting" no plano.
- 40 filmes com a frase do lugar nas falas e pontuação no roteiro.
- 8 filmes com "lugar + substantivo".

| filme | antes | depois | leitura |
|---|---|---|---|
| 39c5cc92 Racetrack | nada | "an empty, dry lakebed" (pedido) | certo: o leito seco em toda cena |
| a7def2bc Earhart (pago 04:16) | "the open sea Near that island" (filme) | nada | certo: a história passa por pista, ilha e mar |
| 072196d8 Bobbie | "a family car" (pedido) | nada | certo: a história vai de Indiana à porta em Silverton |
| os outros 75 | igual | igual | não muda |

**Mudam: 3 de 78, os 3 certos, zero errado.**

### O que o ensaio pegou e mudou a regra
- A 1ª versão de (iii) valia contra QUALQUER substantivo comum.
- Nos irmãos Sullivan (77c923a8), "Pearl Harbor" saía da conta e "the same ship" ia para toda cena, inclusive a da porta dos pais em Iowa.
- (iii) passou a valer só contra o lugar árido. O guardião tem o caso e um mutante.

### Alinhamento
Das 289 falas do universo, 161 se alinham ao roteiro. As outras (ideia escrita pelo nosso roteirista, roteiro cortado) seguem com a fala de sempre.

## C · A cena sem gente

### O que estava errado
- No 2º dry-run, o plano da ilha terminava com uma oração de comentário do planejador: "…with a stillness that hints at the mystery of Amelia Earhart's disappearance".
- O nome (ou o "her") dentro do comentário fazia `cenasDoElenco` pôr a Amelia na cena.
- A ficha dela ia para a ilha e a cena deixava de ser "sem gente": `cenas_sem_gente` = [].
- Executado no código real com o elenco da Earhart:
  - "…of Amelia Earhart's disappearance" e "…of her disappearance" viravam a cena;
  - "…of Amelia's disappearance" não virava (o elenco de sobra chama a ficha de "Earhart").

### O que mudou (interruptor `COMENTARIO_NAO_E_CENA_1411`)
- Para decidir QUEM está no quadro, a oração de comentário não conta, do gatilho até o fim da frase.
  - Gatilhos: "hints at", "symbolizing", "evoking", "reminiscent of", "in honor of", "a tribute to", "alluding to".
- O texto que vai ao motor não muda.
- Vale só para gente (objeto e bicho seguem iguais) e só na cena cujo plano tem o comentário.
- Mora em `cenasDoElenco`, então a trava da folha da rota (linhas 7830 e 7842) lê o mesmo que o ajuste. Sem isso, a still da ilha ainda sairia com a folha da Amelia.
- Isso tira a marca da dependência de uma oração do planejador: o comentário não decide mais quem está na cena.
- "suggesting" e "representing" ficaram fora: no corpus aparecem literais ("the smart fridge suggesting kale").

### Ensaio
Universo: 92 filmes de 30 dias com elenco, dos quais 20 têm comentário no plano. Disparos em que o comentário cita alguém do elenco ou um pronome:

| filme | cena | comentário | muda? | leitura |
|---|---|---|---|---|
| 0e5b27e5 | 9 | "symbolizing their potential return" | não: a baleia está antes do gatilho | — |
| 201b3eed | 1-3 | "He wears… symbolizing his lost home" | não: "He" antes do gatilho | — |
| 40543daf | 1 | "Eve looking curiously… symbolizing temptation" | não: Eve antes do gatilho | — |
| 4704e3f6 | 7 | "film canisters… hinting at the untold secrets they might hold" | sim: o "they" sai | certo: close de latas de filme, ninguém no quadro |
| 6e12f0fa | 2 | "the captain's hat… evoking a haunting sense of emptiness" | não | — |
| a9e9e20f | 1 | "a glowing orb of light, symbolizing God's presence" | sim: God sai | certo: Deus não ganha corpo de gente (KINEO-NOME-SEM-CORPO-1111) |
| b6068711 | 5 | "a dusty trunk… hinting at the hidden Mona Lisa" | não: a Mona Lisa é objeto | — |
| 215e1fc0, cbae855c, parked-0 | — | "suggesting…" | não: fora dos gatilhos | — |
| dry-run 14/11 Earhart | 3 | "hints at the mystery of Amelia Earhart's disappearance" | sim | certo: a ilha fica sem gente |

**Mudam: 2 filmes do corpus e o dry-run, os 3 certos, zero errado.**

## A · Ensaio 3 de 3 pela conta da casa
A lista dos roteiros vai à CEO por mensagem: cada um 3 vezes seguidas, JSON inteiro com `prompt_inteiro`.

## v2 depois do bloqueio do revisor (CEO 14/11 10:22)

### C · O bloqueio e o conserto
- A v1 cortava a oração de comentário INTEIRA, até o fim da frase, e levava junto quem estava no quadro.
- Cinco planos que na base saíam com gente passavam a ganhar "No people…", em todo motor:
  - o desfile "in honor of the returning soldiers, who march past the crowd";
  - a banda;
  - os fogos com as famílias;
  - a cerimônia no convés;
  - a estátua com os operários.
- v2, a opção que a CEO preferiu: a regra só existe para o plano que seria SEM GENTE se não fosse o comentário.
  - Fora do comentário alguém aparece (gente, gente de papel, alguém do elenco)? O plano fica igual.
  - Senão, dentro do comentário saem SÓ os nomes do elenco e os pronomes. "veterans", "soldiers" e "the crowd" ficam.
- A regra mora em `lib/cinematic/comentarioDoPlano.ts`, e as duas portas usam a mesma:
  - `cenasDoElenco` e o ajuste em `personagemAjuste.ts`;
  - `buildStoryScenePrompt` em `sceneStyle.ts`, que ainda punha "consistent design: Earhart…" na ilha e saía contraditório com o "No people".
- Executado no código real, regra ligada × desligada:
  - os 5 planos do revisor e "An actor evoking Amelia Earhart walks on stage" saem IGUAIS à base (o ator segue com a ficha);
  - só a ilha muda: sem a ficha nas duas portas e sem gente, com o nome inteiro e com o "her".
- O corpus de 30 dias segue com os 2 casos certos da v1 (as latas de filme e o "God's presence"), que não têm gente fora do comentário.

### B · Menores do revisor
- "at the bus stop" dava "the bus", e "in the hospital room" dava "the hospital".
- O substantivo logo depois que é PARTE do lugar (stop, room, ward, lobby, platform…) agora entra na frase. O tipo do lugar não muda.
- "on the city bus" já dava "the city bus".
- Corpus: os mesmos 3 filmes mudam, os 3 certos.
