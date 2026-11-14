# Ensaio no corpus: abrir KINEO-HISTORIA-REAL-1411 para 'all' · Divisão 2 · 14/11/2026

Decisão da CEO, 14/11 12:40. Motivo: o filme pago e colado ("Use my script as is") da Mona Lisa do afiliado Logan, b6068711.
- A pintura saiu como boneco vivo.
- "the thief" entrou nas 7 cenas, ao lado do Peruggia.

O conserto já existia desde 14/11 cedo, mas só no escopo `'gratis_ideia'`. **PASS ao vivo pendente**: 3 de 3 do roteiro da Mona Lisa quando a conta da casa voltar a rodar dry-run.

## O que o interruptor liga (as três peças da história real)
1. A obra de arte do elenco, num filme não desenhado com época e gente nomeada do autor, ganha a ficha da obra real ("a realistic oil painting on a flat canvas in a carved wooden frame… a still work of art"), nunca a do boneco que fala (`obraRealNoElenco`, na rota, antes da folha).
2. A data por extenso trava a época ("November fourteenth, nineteen sixty-five" → 1965) (`epocaDaHistoria(…, { anoPorExtenso: true })`).
3. O papel sem nome ("the thief") não vira 2ª ficha quando o elenco já tem a pessoa nomeada do autor (`historiaReal.nomeadoNoElenco`).

Corpus: 514 dos 515 filmes de 30 dias são pagos ou colados. Abrir para `'all'` é, na prática, ligar para todo filme da estrada clássica que não é herdado.

## Peça 1: a obra de arte
Universo: todo nome que o leitor semântico listou como não humano (`cinematic_cast_origin`, motive `nao_humano`), 33 linhas.

| filme | nome | muda? | leitura |
|---|---|---|---|
| b6068711 (Logan) | Mona Lisa | sim: boneco → obra real | certo |
| os outros 32 (Bobbie, baleia azul, unicórnio, serpente, Jesus, God, Pip, Milo, dino, frasco…) | — | não: não são obra de arte (pintura, retrato, mural, estátua, busto) | — |

**Muda 1, certo.**

## Peça 2: o ano por extenso
Universo: os 11 pedidos pagos ou colados com data escrita por extenso.

| filme | antes | depois | leitura |
|---|---|---|---|
| 2f34daf3 Flight 19 | sem época | 1945 | certo ("December fifth, nineteen forty-five") |
| 45d83f0e Mary Celeste | sem época | 1872 | certo |
| 6e12f0fa Mary Celeste | sem época | 1872 | certo |
| a63851dd faroleiros | sem época | 1900 | certo ("December, nineteen hundred") |
| 77c923a8 Sullivans | sem época | sem época | igual: a história chega a "twenty eighteen" (o achado do Juneau) |
| 5e9123e4 Ia Drang | sem época | sem época | igual: a história chega a "two thousand one" (a medalha) |
| 0e5b27e5, 58f63487, fe14e94f, 39c5cc92, 15b67467 | sem época | sem época | igual: data moderna, ou "nineteen" de idade |

**Mudam 4, os 4 certos. Nenhum piora.**

- O ensaio pegou uma diferença de regra, e eu a consertei (v3).
- Com números, uma história de "1942 … 2018" já ficava sem trava, por chegar ao presente. Por extenso, "In twenty eighteen" não era lido, e a trava de 1942 iria também para a cena do achado de 2018.
- Agora o ano moderno por extenso com preposição de tempo (in, by, until, since, from, before, after, around, of) marca o presente, como o número.
- Sem a preposição não conta: "more than two thousand five hundred miles" (Bobbie) é distância, e "counted to twenty eleven times" é contagem.
- Por isso o Sullivans e Ia Drang ficam sem trava. O item (b) da CEO (o Sullivans sem 1942) NÃO fecha aqui: travar a época cena a cena é outro lote.

## Peça 3: o papel sem nome ao lado da pessoa nomeada
Universo: os filmes com `named_cast_era` gravado (9) em que a camada de época inseriu um protagonista sem nome.

| filme | sem nome | elenco tem gente nomeada do autor? | muda? |
|---|---|---|---|
| b6068711 (Logan) | the thief, cenas 1-7 | sim (Vincenzo Peruggia) | sim: "the thief" sai. Certo |
| 2b22a93c, 45d83f0e, 18fdbfa4, 47f1fbae, a63851dd, 20c6db25, 5520d92c, 8f8fa22a | the man, the captain, the mother… | não (só "the …" ou ficha do modelo) | não |

**Muda 1, certo.**

Limite: o `named_cast_era` só é gravado nos despachos recentes. Os filmes mais antigos não têm esse registro e não entram nesta conta.

## O caso do Logan com o casting FALHANDO (pelas funções da rota)
- Montei o elenco como o filme o teve: a Mona Lisa como boneco que fala (`descricaoDoSerPersonificado('Mona Lisa', 'painting')`) e o Peruggia do autor.
- Passei pelas mesmas funções da rota (`escopoDaHistoriaReal` → `obraRealNoElenco` → `aplicarElencoEEpoca` com os 7 planos e as falas reais), com prova de gente ligada.

| | `'gratis_ideia'` (antes) | `'all'` (agora) |
|---|---|---|
| ficha da Mona Lisa | "an anthropomorphic painting character… small arms and legs… a living creature" | "the real painting: a realistic oil painting on a flat canvas in a carved wooden frame, looking exactly like the real Mona Lisa, a still work of art…" |
| "the thief" | entra ("Named character in this shot: the thief…") | não entra |

O caso está no guardião (`scripts/test-historia-real-1411.mjs`, seção F). O mutante que volta o interruptor para `'gratis_ideia'` fica vermelho.

## Achado à parte: a cena 4 do Logan ("A gathered outside the Louvre")
- Quem apagou o sujeito "crowd" foi o supervisor fala × imagem (`lib/cinematic/speechImageAlign.ts:82`, uma chamada de modelo).
- A regra "NO EXTRAS" dele manda tirar gente que a história não cita e pôr "no other characters".
- Ele tirou a multidão que a FALA cita ("crowds lined up just to stare at four empty iron hooks") e deixou "A gathered…, with no other characters present".
- É outra área de código: vira lote próprio, depois do item 2.

## Cinco exemplos de antes e depois
1. b6068711, Mona Lisa: o boneco de olhos grandes com braços e pernas → "a realistic oil painting… a still work of art".
2. b6068711, cenas 1-7: "Named character in this shot: the thief…" → só o Peruggia, onde a cena o cita.
3. 2f34daf3, Flight 19: sem época → "period piece set strictly in the year 1945".
4. 45d83f0e, Mary Celeste: sem época → 1872.
5. a63851dd, faroleiros: sem época → 1900.
