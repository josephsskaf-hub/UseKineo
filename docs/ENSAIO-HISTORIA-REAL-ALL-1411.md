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

## v2 depois do bloqueio do revisor (CEO 14/11)
O revisor confirmou o caso do Logan, inclusive com o casting falhando, e as fantasias em que o autor quer a obra viva (o texto final sai igual à main). Bloqueou duas coisas que a regra fazia nos OUTROS filmes.

### Bloqueio 1 · o papel sem nome que é OUTRA pessoa perdia a ficha
- A v1 tirava o papel sem nome sempre que o elenco tinha alguém nomeado do autor.
- "In 1911, Detective Louis Lépine chased the thief…" e "…Frank and Joe Sullivan… The captain gave the order…": o ladrão e o capitão perdiam a ficha e mudavam de rosto a cada cena.
- v2, o conserto aprovado pela CEO: o papel só sai quando uma cópula ou um aposto o liga ao NOME de alguém do elenco, na mesma frase.
  - "The thief was Vincenzo Peruggia", "the thief, Vincenzo Peruggia,", "Peruggia, the thief", "Peruggia was the thief".
  - A rota passa os nomes (`nomesDaGenteNomeadaDoAutor`).
- A peça 3 foi refeita no corpus: os 19 filmes pagos e colados com gente nomeada do autor, com a leitura do elenco SEM nomes (o caso do bloqueio) e normal.

| filme | papel sem nome | main | v1 | v2 | leitura |
|---|---|---|---|---|---|
| b6068711 Mona Lisa | the thief | entra | sai | sai | certo: "The thief was Vincenzo Peruggia" |
| 9aee4f6d Veterans Day | the soldier | entra | sai | sai | certo: "Henry Gunther, a soldier from Baltimore" |
| 1c770cb7 | the mysterious woman | entra | sai | entra | certo na v2: é OUTRA pessoa, não o Daniel |
| 4704e3f6 Kennedy | the woman | entra | sai | entra | certo na v2: a mulher que filma não é o Kennedy |
| 5e9123e4 Ia Drang | the pilot | entra | sai | entra | igual à main. O piloto É o Freeman, mas o texto não os liga por cópula nem aposto ("one pilot… Captain Ed Freeman… too tall to be a pilot"). A v1 acertava este por acaso |

- **Contra a main, a v2 muda 2 filmes, os 2 certos. A v1 errava 2** (a mulher misteriosa e a mulher do Kennedy).
- O Ia Drang fica como na main; a ligação por pronome é outro lote, se a CEO quiser.

### Bloqueio 2 · contagem por extenso tirava a trava de época
- "a crew of twenty nineteen year old sailors" (1942) e "a group of twenty twelve year olds" (1962) eram lidos como ano moderno, e a época sumia.
- v2: ano moderno por extenso seguido de substantivo de contagem (years, year-olds, dollars, miles, people, soldiers, sailors, kids, times…) é quantidade, não ano.
- A lista do revisor deu 11 de 11 certos: os com hífen seguem certos, os dois sem hífen voltam a 1942 e 1962, e "In twenty eighteen", "By two thousand and five" e "em dois mil e dezoito" seguem levando ao presente.
- O corpus de 11 datas por extenso segue igual: mudam 4, certos.

### Menores anotados
- "golden statue" (um ídolo) e "bronze bust" viram obra real.
- No lote E: "Louvre" e "Paris" como pessoa no dry-run da main.

## v3 depois do 2º bloqueio do revisor (CEO 14/11)
- A ligação por nome da v2 aceitava QUALQUER palavra entre o verbo e o nome.
  - Com a flag `i`, `\p{Lu}` casava minúscula. "The thief was not / NOT / hired by / working for Vincenzo Peruggia" ligava, e o ladrão perdia a ficha.
  - No aposto, "Louis Lépine, a rival of the thief" ligava o ladrão ao Lépine.
- v3:
  - sem a flag `i`;
  - entre a cópula e o nome só cabem um título (Captain, Detective, Dr.…) e partes do nome em Maiúscula-minúscula;
  - antes do papel, só adjetivo minúsculo que não é preposição, artigo nem negação: o papel é o NÚCLEO do aposto, nunca complemento dele.
- Guardião, com as frases do revisor:
  - os 5 negativos (o papel FICA): "was not", "was NOT", "was hired by", "was working for", "a rival of the thief";
  - os 6 positivos (o papel SAI): "The thief was Vincenzo Peruggia", "the thief, Vincenzo Peruggia,", "Peruggia, the thief", "Peruggia is the thief", "The thief was Vincenzo", "Captain Ed Freeman was the pilot".
- Os mutantes "qualquer palavra entre o verbo e o nome", "a flag i volta" e "qualquer palavra antes do papel" ficam vermelhos.
- A peça 3 no corpus sai igual à v2: a Mona Lisa e o Gunther mudam, certos; a mulher misteriosa, a mulher do Kennedy e o piloto do Ia Drang ficam como na main.
- Anotados, iguais à main: "the thief Vincenzo Peruggia" (sem vírgula) não liga; "The detective chased Peruggia, the thief" e "The brothers were Frank and Joe Sullivan" a camada não lê como papel.

## v4 depois do 3º bloqueio do revisor (CEO 14/11)
- No aposto, o papel que era só o 1º termo de OUTRO substantivo ainda ligava: "Louis Lépine, the thief hunter / thief catcher / thief-catcher / thief's nemesis". O ladrão perdia a ficha.
- v4, que ESTREITA a regra: no aposto o papel é a ÚLTIMA palavra do sintagma.
  - Depois dele só valem pontuação, fim de frase, who/which/that, cópula, ou "from/of + Lugar com maiúscula" (o Gunther "a soldier from Baltimore" segue ligando).
  - Outro substantivo, hífen ou apóstrofo logo depois NÃO ligam.
- A regra do papel ganhou interruptor PRÓPRIO (`PAPEL_E_O_NOMEADO_1411` em historiaReal1411.ts). Separar o papel da obra de arte e do ano custa uma linha: 'gratis_ideia' nesse interruptor.

### A lista de armadilhas da CEO (executada; "fica" = o papel mantém a própria ficha)
| texto | resultado | leitura |
|---|---|---|
| Lépine, the thief hunter / catcher / thief-catcher / thief's nemesis | fica | certo: é outra pessoa (os 4 do bloqueio) |
| Lépine, the thief's brother | fica | certo |
| Lépine, the thief taker general | fica | certo |
| Lépine, the thief and the liar | fica | conservador: ele É o ladrão, mas o papel não é a última palavra; igual à main |
| Lépine, the thief-turned-detective | fica | certo: o hífen faz do papel parte de outra coisa |
| Lépine, the thief no one caught | fica | conservador: ele É o ladrão, mas o papel não fecha o sintagma; igual à main |
| Lépine, the thief, smiled | sai | certo: o caso que liga |
| Lépine, a thief | sai | certo: o aposto indefinido diz que ele é um ladrão, e "the thief" depois é ele |

- Os dois conservadores ficam como na main (sem ficha nova nem ficha a menos). O erro, se houver, é a 2ª ficha, que já existia.
- Positivos que seguem certos: "The thief was Vincenzo Peruggia", "Peruggia, the thief", "Peruggia is the thief", "Henry Gunther, a soldier from Baltimore".

## v5: a regra de parada (CEO 14/11)
- O revisor bloqueou a v4 pela 4ª vez na regra do papel, com o vocativo: "Louis Lépine, the thief is gone, he said". O Lépine é quem ouve a fala, não o ladrão.
- A CEO aplicou a regra de parada combinada: `PAPEL_E_O_NOMEADO_1411 = 'gratis_ideia'`, e o filme pago e colado fica com o papel como na main.
- `HISTORIA_REAL_1411` segue `'all'`: a obra de arte real e o ano por extenso.
- O delta de produção contra o f7b7d47d7 é UMA linha. A lógica do papel fica como na v4, sem o conserto do vocativo.
- No filme do Logan: a obra real entra ("a still work of art"), e "the thief" fica como na main.
- A regra do papel para o filme pago volta como lote próprio, só com revisão limpa. Antes, uma lista adversária escrita por mim: vocativo, fala citada, oração intercalada, enumeração, discurso indireto, "Lépine, the thief said, was lying". Considerar o desenho invertido: ligar só quando o elenco do AUTOR traz a mesma pessoa com o papel na descrição.
