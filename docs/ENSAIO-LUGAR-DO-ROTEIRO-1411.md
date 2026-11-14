# Ensaio no corpus — KINEO-LUGAR-DO-ROTEIRO-1411 (lote 3: caso E) · Divisão 2 · 14/11/2026

Código: `lib/cinematic/pessoaDoPedido.ts` (lugarDoPedido e lugarDasCenas), regra desligada × ligada, executado offline sobre o claim dos últimos 30 dias (516 filmes).

## O que a regra já fazia e por que o Racetrack ficou sem lugar
- O roteiro colado JÁ era lido: sem ideia original, `pedidoDoCliente` é o texto do roteiro, e a rota passa por `lugarDoPedido` e, sem ele, por `lugarDasCenas`.
- O pedido do Racetrack cita dois lugares (Death Valley e o leito seco), então fica null por desenho.
- Nas cenas, a lista não conhecia "lakebed" nem "playa": não havia lugar nenhum, e o motor fez do deserto um lago ártico.

## O que mudou
- "lakebed", "lake bed", "dry lake", "playa", "salt flat(s)", "sand dunes" e "dunes" entram na lista.
- Esses lugares e "desert" contam como UM tipo de lugar.
- No Racetrack, as cenas citam "Racetrack Playa" e "the cracked lakebed". O tipo é um só, e a cena 3 (o gelo na água rasa) não tinha lugar. Agora toda cena ganha "Setting of this film: the cracked lakebed.".

## Ensaio 1: os 18 filmes que citam lugar árido ou de costa
Universo: os filmes cujo pedido ou planos citam lakebed, playa, salt flat, dunes, prairie, savannah, tundra, marsh, swamp, lagoon, coastline, cliff, plateau, oasis ou reef.

| filme | pedido / cenas (antes) | depois | leitura |
|---|---|---|---|
| 39c5cc92 Racetrack | – / – | – / the cracked lakebed | certo: o caso |
| os outros 17 (faroleiros, Jonathan ×2, North Sentinel, Arábia Saudita, Lituya Bay, polvo, ilha proibida, leão × urso, Nikumaroro, farol nos penhascos, Issyk-Kul, tempestade solar, farol que acende, Terra parada, drones no Iêmen, SS United States) | – | igual | não muda |

**Mudam: 1 de 18, e certo.**
Fora deste lote, sem mudança: no 6ce4440c (leão × urso), o lugar do filme "a dense jungle" já vai para a cena da savana. É defeito antigo; "savannah" não está na lista.

## Ensaio 2: a vírgula entre adjetivos (testada e NÃO entrou)
- O lote previa aceitar "an empty, dry lakebed". Rodei a variante nos 19 filmes de 30 dias com "prep + artigo + palavras com vírgula + lugar".
- Com ela, 4 filmes mudavam e 2 saíam errados:
  · dc4ac291: o jardim do Éden ia para a cena de Lúcifer caindo entre as estrelas;
  · b483996f: a rua da chuva ia para a cena do gatinho já no cobertor.
  · Os 2 certos eram e1c37645 (parque) e 6fc13d83 (prado).
- Pela régua (zero errado), a vírgula ficou fora. O Racetrack não precisa dela.
- Com a versão entregue, os 19 filmes da vírgula: 0 mudança.

Os casos estão no guardião `scripts/test-lugar-do-roteiro-1411.mjs`: o Racetrack, deserto + dunas + playa, praia + deserto, o Éden e o gatinho. Um mutante devolve a vírgula, e o guardião fica vermelho.

## v2 depois do dry-run ao vivo (14/11, 08:35): o Racetrack ficou sem lugar na produção
- A causa, no caminho que a rota executa: o lugar do filme é lido de `scenes.map((s) => s.description)`. No roteiro colado, a description de cada cena é a FALA ("Rocks in Death Valley move by themselves On an empty dry lakebed called Racetrack Playa…"). Ela tem dois lugares (Death Valley e o leito seco), então dá null.
- O ensaio da v1 lia os PLANOS gravados no claim. Foi a minha conta errada, não o módulo.
- Conserto: quando a leitura das descrições dá null, uma 2ª leitura usa os PLANOS (aiPrompt), e só para o lugar ÁRIDO. Ler os planos para todo lugar mudaria cerca de 189 dos 516 filmes de 30 dias, e isso pede ensaio próprio.
- Corpus (30 dias, planos do claim com um tipo de lugar só, árido, e alguma cena sem lugar):
  · 39c5cc92 (Racetrack) → "the cracked lakebed", certo;
  · 507fe433 (Layla e Qais) → "the desert", certo: a cena 3 dos dois juntos fica no deserto da história;
  · 8f5dc353 (caminhão no deserto) → sem preposição + artigo antes de "desert", null, sem mudança.
- O nome próprio com maiúscula no meio da frase não conta como tipo ("the Dunes casino", "Racetrack Playa"). Pendentes anotados: "the playa by the ocean" dá "the playa"; "the dunes by the beach" perde o lugar (dois tipos).
- O ensaio de US$ 0 ganhou `scenes[i].prompt_inteiro`: o plano inteiro. O `prompt` de sempre é cortado em 400 caracteres e escondia a época e o lugar, que vêm no fim.
