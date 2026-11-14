# Ensaio no corpus — KINEO-BICHO-COM-NOME-1411 (lote 2: caso F) · Divisão 2 · 14/11/2026

Código: `lib/cinematic/elencoEpoca.ts` (tipoDe, a frase com cópula) e `lib/cinematic/elencoTrava.ts` (especieDaFicha), v2 depois da revisão independente. Executado offline.

## Universo (últimos 30 dias)
- 1.237 textos: 513 pedidos de filme com as falas (`cinematic_submission_claim`), 599 roteiros escritos (`script_written`, ideia + começo) e 122 anúncios (`ads_v2_orders`, narração + briefing).
- Textos com "<Nome> is/was a(n) … <bicho, criatura ou raça>": **4**.

## A cópula (tipoDe): os 4 candidatos, com a regra desligada e ligada

| texto | antes | depois | leitura |
|---|---|---|---|
| filme 8067dfdf (o burro e o elefante) | Thomas Nast e Andrew Jackson, gente | igual | certo: "Why is a donkey fighting…" não tem nome |
| filme f63c9e52 (Leo e o patinho) | Leo e "Mama Duck", gente | igual | "It was a lost baby duck" não tem nome. "Mama Duck" segue gente: defeito antigo, fora deste lote |
| roteiro 80a0f511 (o mesmo Leo) | igual | igual | idem |
| roteiro a43dcc41 (Ayesha e o dragão) | Misho, gente | **Misho, dragão (criatura)** | certo: "Misho is a tiny turquoise baby dragon" |

**Mudança no corpus: 1 texto, e a mudança está certa.** O commit b81457318 dizia "0 mudança": isso valia para os 90 pedidos do ensaio 3.1 e as 31 frases, não para o corpus inteiro. Na v1, "baby" cortava o Misho; na v2, "baby", "kid" e "toddler" não cortam.

Os textos que o revisor achou (Pickles, o ouriço; Bella, a chihuahua; um trecho de código) não estão nestes 30 dias. Pickles e Bella mudam e mudam certo: viram ouriço e chihuahua. Os dois entraram no guardião.

## A ficha (especieDaFicha): "a real living mix"
- 1.773 planos de 30 dias: "a real living mix" em **4 planos**, todos do 072196d8 (o Bobbie pago). Os 4 passam a "a real living collie".
- Nenhum plano com "mixed-breed" ou "a mix with" no corpus. Os casos do revisor ("a mix with a brown coat", "a mixed-breed dog") estão no guardião e dão "dog". "a mixed-breed cat" dá "cat".

## v2 depois da revisão independente
1. Gente com bicho segue gente. Entre o artigo e o bicho cortam: palavra de ligação (with, who, that, and, of, in, on, from, her, his…), "vet", "owner" e a lista PESSOAS do arquivo, menos baby/kid/toddler. "Lucy is a little girl with a cat", "Tom is a farmer with a horse", "Jack is a pirate with a parrot", "Mia is a vet who loves her cat" seguem gente.
2. Expressão de gente com nome de bicho segue gente: "a lone wolf", "a night owl", "a busy bee", "a dark horse", "a black sheep"…
3. Na ficha, a palavra antes de "mix" nunca é o artigo nem um adjetivo; "mixed-breed X" dá X.

Todos esses casos são cenários do guardião `scripts/test-bicho-com-nome-1411.mjs`, com um mutante para cada trava.

## v3 depois da 2ª revisão independente (14/11): o núcleo do 1º sintagma (sugestão da CEO)
- A lista de corte saiu. `nucleoDoBichoDaCopula` lê "<Nome> is/was a(n) …" só até a 1ª fronteira: palavra de ligação, possessivo, 2º artigo, verbo em -ing ou vírgula. Depois olha a última palavra antes dela. Se é bicho, é bicho; se não, segue gente ("collie mix" → collie).
- Gente FAZENDO algo com bicho segue gente: "a jockey riding a horse", "a zookeeper feeding a lion", "a dad walking the dog", "a nanny walking a dog", "a toddler hugging a puppy", "a baby holding a kitten", "a falconer releasing a hawk".
- Expressões que entraram: "mama bear", "mother hen", "papa bear", "teddy bear"…
- Limite declarado: "Bo is a stray, scruffy dog" volta ao de antes (a vírgula fecha o sintagma em "stray"). "Bo is a stray dog" é cão.
- Corpus de 30 dias, depois da v3: o mesmo 1 texto muda (Misho → dragão), certo.
