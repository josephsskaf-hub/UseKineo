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
