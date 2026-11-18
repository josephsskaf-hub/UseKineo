# Ensaio: lugar subterrâneo conta na regra de "um lugar só" (18/11/2026)

Marca no código: `KINEO-LUGAR-SUBTERRANEO-1811` em `lib/cinematic/pessoaDoPedido.ts`. Interruptor `LUGAR_SUBTERRANEO_1811` ('off' = o de antes).

## O defeito
Filme pago 426e783f (gapozweb, H3 Max Turbo, 34 s, nota 5 do revisor: CENA_FORA_DO_PEDIDO). O pedido anda da rua para o esgoto:
"…approaches a man hole cover on the cobblestone street… descends into the dark sewers… along the large dark sewer…".
`lugarDoPedido` só fixa o lugar quando o pedido cita UM tipo de lugar. A lista conhece "street" e não conhecia "sewer": contou um, e
"Setting as the customer asked: the cobblestone street." foi ao fim das 7 cenas (imagem-chave e clipe), inclusive:
"In the dark sewer, he pauses… Setting as the customer asked: the cobblestone street." (evento `cinematic_submission_claim`, `scene_fal_inputs`).

## A regra
Sewer, storm drain, tunnel, catacombs, dungeon, crypt, bunker, cellar e mineshaft contam como mais um tipo de lugar ("underground") em
`lugarDoPedido` e `lugarDasCenas`. Só contam: nunca viram a frase do lugar. Não contam quando os lugares do texto já são debaixo da terra
ou de trilho (cave, subway, metro, basement, train, station), nem em frase de proibição.

## Corpus real
1.084 pedidos distintos de 45 dias (`script_written.original_idea` e `videos.topic` de filme). Só 8 citam uma das palavras; os outros
1.076 não podem mudar (a regra só age quando a palavra está no texto). Antes → depois de `lugarDoPedido`:

| pedido | antes | depois |
|---|---|---|
| d225bcd9 (rua + esgoto, o do defeito) | the cobblestone street | null |
| 05e57901 (o roteiro dele) | null | null |
| 91321966, a861aab6 (The Last Train: trem, estação, túnel) | null | null |
| 9a58891f (barquinho: cidade, sarjeta, túnel) | null | null |
| 747d0089, 777329df (bunker) | null | null |
| 3d96bf46 (livro colado, "bunker babes") | null | null |

12 controles reais com lugar da lista e sem subterrâneo: iguais (the park, the forest, the kitchen, a medieval castle, the middle of the street, a magical forest).
Mudou 1 de 1.084, o do defeito. Repetir: `npx tsx scripts/test-lugar-subterraneo-1811.mjs --ensaio`.

## O que não foi provado
Nenhum render pago. A prova final é o próximo filme de cliente com rua + esgoto (ou castelo + masmorra) e o texto que for ao motor.
Sem o lugar fixo, quem diz o lugar de cada cena é o planejador: no 426e783f os planos 3 e 5 a 7 dizem "murky water" e "tunnels", sem a palavra "sewer".
