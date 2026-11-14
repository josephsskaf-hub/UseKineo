# Ensaio no corpus: KINEO-LINHA-DE-EPOCA-1411 (lote 1b) · Divisão 2 · 14/11/2026

Pedido da CEO às 12:25. A Earhart refeita com o código de hoje piorou de 6 para 5:
- na ilha Howland, marcada sem gente, saíram um homem de terno e chapéu, uma mulher de vestido branco e um sedã dos anos 30 com estepe;
- na cena dos navios, o sedã andou sobre o mar.

**PASS ao vivo pendente**: 3 de 3 do roteiro da Earhart, com a linha ausente na ilha e nos navios. Depois, a CEO refaz o filme, com a régua: nenhum carro em nenhuma cena e ninguém na ilha.

## A causa, no texto que vai ao motor
A camada de época punha a MESMA linha em toda cena:
> Period setting: 1937 (1930s). Any person the shot describes wears 1930s dress: fedoras, wide-lapel suits, bias-cut dresses, wool overcoats (do not add people the shot does not mention); a car or carriage, only if the shot describes one, is rounded 1930s sedans with spare wheels on the fender (do not add vehicles…); props the shot describes are rotary telephones, tube radios, newspapers; absolutely no present-day smartphones, no present-day cars…

O motor de imagem não entende "only if" nem "do not add". Ele desenha o que foi CITADO: o chapéu, o vestido e o sedã com estepe.

## O que mudou (interruptor `LINHA_DE_EPOCA_1411`; 'off' = byte a byte o de antes)
O código lê o prompt da cena:
- a frase de ROUPA só entra em cena com gente;
  - cena marcada "No people…" nunca a recebe;
  - não contam: as frases fixas da casa ("characters act naturally…", "The main person, if one is shown…", "every person, building, street, vehicle and object belongs to…") e a posse ("the keeper's logbook");
- a frase de VEÍCULO só entra quando o plano cita veículo de rua (car, cab, taxi, truck, bus, carriage, wagon, cart, tram, buggy…);
  - avião, navio e trem não chamam carro;
  - "no tanks, no cars, no trucks" e "no present-day cars" não contam como veículo;
- sem o catálogo genérico de roupa: fica "People in the shot wear period-accurate 1930s clothing true to their own place and role, with period props.";
- sem parêntese condicional, sem frase negativa e sem a lista "absolutely no present-day…";
- cena sem gente e sem veículo leva só "Period setting: 1937 (1930s).";
- quem chama sem a cena (o refazer-cena do grátis) segue com a linha de sempre.

## Ensaio no claim de 30 dias
- 31 filmes levam a linha, em 111 cenas.

| o que a cena recebe agora | cenas | leitura |
|---|---|---|
| só a data (sem gente e sem veículo de rua) | 38 | certo: ilhas, mares, florestas, planos de avião no céu, barcos de busca, close de objeto |
| perde a roupa, fica com o veículo | 2 | certo: "a car parked on a deserted road… the driver's seat remains empty" e a charrete do 9dbe1523 |
| roupa sem catálogo | 71 | certo: a cena tem gente |
| ganha veículo com gente | 2 | certo: o carro do Bobbie e o 9dbe1523 |

- **Mudam as 111 cenas**: todas perdem o catálogo e as frases negativas. 40 perdem a frase de roupa: as 14 marcadas sem gente e 26 cujo plano não mostra ninguém.
- Lidas as 26 uma a uma. Na 1ª passada, o ensaio pegou 3 erros, e a lista foi consertada:
  - "confused visitors gather" (794a8d41, os ganchos do Louvre) e "anxious travelers" (97671333) ficavam sem roupa: "visitors", "travelers" e afins entraram como gente;
  - "horse and buggy" não era veículo: "buggy" e "horse-drawn" entraram;
  - "driver door open" virava gente: "driver" e "rider" saíram.
- Fica 1 duvidosa: a charrete do 9dbe1523 ("a horse and buggy traveling") não cita o cocheiro e fica sem a frase de roupa. A trava longa da cena ("every person… period clothing") continua lá.
- 4 cenas do corpus (filmes do Kling 4) têm o plano DEPOIS da linha ("Photoreal film. Period setting…"). No caminho de hoje, `aplicarEpoca` lê o prompt inteiro antes de pôr a linha, então elas não são afetadas.

## Os planos reais (dry-runs de hoje), antes → depois
- Earhart, a ilha (sem gente): o catálogo e o sedã → "Period setting: 1937 (1930s)."
- Earhart, os navios: o catálogo e o sedã → roupa da década sem catálogo. O plano traz a ficha da Amelia, porque a fala "the search for Amelia Earhart" puxou a ficha; a roupa é coerente com isso.
- Mona Lisa, a moldura vazia e o baú (sem gente): só a data.
- 1953 (guardião antigo B3): James Turner veste a década; o carro é o da década; a estrada vazia leva só a data.

## Fora deste lote (anotado)
- A trava longa "period piece set strictly in the year 1937: every person, building, street, vehicle and object belongs to that exact time…" também cita gente e veículo em toda cena com gente.
- Na cena sem gente ela já vira a curta (KINEO-CENA-SEM-GENTE-1411). Para a cena com gente e sem veículo, ela merece o mesmo olhar, com ensaio próprio.
