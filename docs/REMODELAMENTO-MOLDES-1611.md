# Moldes de vários trechos por dados · 16/11/2026

Pedido do dono (16/11 ~00:10): "por que não podemos fazer o do basquete e o do cachorro pra hoje?". A máquina do Pitch invader (`lib/recreate/invasor*.ts`) virou um registro de moldes (`MOLDES_DE_TRECHOS` em `lib/recreate/invasorMolde.ts`). Cada molde tem: id, título, trechos (arquivo privado, quadros, segundos, velocidade), som, alvo (pessoa pela roupa ou bicho pela aparência), cartão, segundos do filme, preço (público e da casa) e um interruptor. O Pitch invader é o 1º registro e manda à fal e à montagem exatamente o de antes (o guardião compara com o retrato gravado antes da mudança, `scripts/test-support/invasor-pedido-fal-1511.json`). A porta, as travas, a fila e as varreduras são as mesmas para todos.

## Basquete ("Slam dunk", id `basquete`)
- Origem: `docs/remodelamento-1511/DftZ5FrnJPD.mp4` (720×1280, 24 fps, 20,04 s de vídeo).
- Trechos: 0 = quadros 136–327 (5,667–13,667 s, 8 s); 1 = quadros 328–471 (13,667–19,667 s, 6 s; era 6,375 s e o Kling devolveu 6,042 s no teste 90a42302). Filme: 14 s. Regra: todo trecho tem segundo inteiro. Não há corte seco em 13,65 s (medido quadro a quadro): é uma emenda no meio do plano, como no Pitch invader.
- Alvo, como está no vídeo: camiseta PRETA com a estampa branca do evento do autor, bermuda escura, óculos. Texto: "Replace the man in the black t-shirt and dark shorts in @Video1 with the man from @Image1: his face, hair and beard match @Image1, with <cabelo e barba da foto>, and he wears no glasses. Keep his movements, the timing, the camera, the framing, every other person, the background and the lighting of @Video1 exactly. Keep the original clothing from @Video1."
- Variante "camiseta lisa" (`BASQUETE_CAMISETA_LISA`, desligada): a última frase vira "Keep the original shorts and shoes from @Video1, and he wears a plain black t-shirt." Nunca testada.
- Som: o original tem "Forever" (Drake e outros) e NÃO entra. No lugar: `hustle-02.mp3` da nossa biblioteca de música dos filmes ("Soulja Unit - Basic (2019)"; `music-novas/README.md`: as 59 faixas são CC0, domínio público, colhidas pela API do Openverse em 21/08/2026; no bucket `music`), de 1,0 s, 14,375 s, −16 LUFS.
- Preço provisório da casa: 60 créditos. Custo fal previsto: US$ 2,71 + trava (~US$ 0,07).

## Cachorro craque ("Dog goal", id `cachorro-craque`)
- Origem: `docs/videos-do-dono-1411/originais/De05eyZIhuo.mp4` (720×1280, 24 fps, 15,04 s).
- Trechos: 0 = quadros 0–191 (0–8 s); 1 = quadros 192–359 (8–15 s, 7 s). Filme: 15 s.
- Alvo: o pastor-alemão; a foto do cliente é a do pet. Texto: "Replace the German Shepherd dog in @Video1 with the dog from @Image1: his fur, face and ears match @Image1. Keep his movements, the timing, the camera, the framing, every other person, the background and the lighting of @Video1 exactly." (`pet: 'cat'` no pedido troca "dog" por "cat" na 2ª menção). Sem leitura de cabelo.
- Som: o original do vídeo (não foi ouvido).
- Preço provisório da casa: 60 créditos. Custo fal previsto: US$ 2,84 + trava.

## O que falta
1. Subir os 10 arquivos de `C:\kineo\docs\remodelamento-1611\subir-ao-bucket-privado\` ao bucket privado `quarantine`, pasta `recreate-guias/v1`, com os mesmos nomes (tamanho e sha256 no manifesto). Sem eles a rota recusa antes de cobrar.
2. Publicar (os dois só da casa: `BASQUETE_ABERTO_AO_PUBLICO` e `CACHORRO_ABERTO_AO_PUBLICO` = false).
3. Teste pago da casa de cada um (basquete ~US$ 2,80; cachorro ~US$ 2,90). No cachorro, provar antes que o Kling edit troca bicho por bicho e que a trava "não trocou" (escrita para rosto humano) não recusa um pet trocado.
4. Preço público (o dono) e a decisão da camiseta lisa (a CEO, depois do teste).

## 16/11 ~02:00 · decisões do dono (KINEO-NOVIDADE-EM-EVIDENCIA-1611)
- **Dog goal aberto ao público a 75** ("abre a 75"): `CACHORRO_ABERTO_AO_PUBLICO = true`, preço em `lib/checkoutPricing.ts` `RECREATE_PRICING_MOLDES_PUBLICOS`. Achado 1 da revisão consertado antes: um molde só vai ao público aberto E com preço (`moldeNoPublico`); `creditos: null` nunca cai na tabela por duração (15 s = 60 era o preço errado).
- **Bola dupla** ("ele fica com as duas bolas"): o texto do Dog goal agora diz "…his fur, face and ears match @Image1, and he carries the ball from @Video1 in his mouth and drops it at the same moment as in @Video1. Keep his movements…".
- **Variante humana** ("testa o humano"): molde `cachorro-craque-humano` ("Dog goal · you"), só da casa, 75 provisório, os mesmos trechos, som e cartão do cachorro; texto "Replace the German Shepherd dog in @Video1 with the man from @Image1: his face, hair and beard match @Image1, with <cabelo e barba>. Keep his movements…" (sem frase da roupa; sem "no glasses"; o gênero vem do pedido, padrão homem: o leitor da foto não lê gênero).
- **Novidade em evidência** ("já coloca sempre em evidência as novas"): regra em código. Grade do Recreate e palco da tela única: os moldes abertos da máquina de trechos na frente, do que abriu por último (`novidadesNaFrente`). Home: os cartões de molde aberto com `desde` na frente (`topoComNovidades(TOPO_DA_CASA)`). O Dog goal ainda NÃO tem cartão na home: o teste pago 48e7e5bf mostra a bola dupla e a placa com letras; o cartão entra depois do teste com o texto novo, e a regra já o põe em 1º.

## 16/11 ~04:15 · molde novo "vendedor de ilusão" (KINEO-MOLDE-VENDEDOR-1611, dono: "faz esse primeiro")
- Fonte: o vídeo nº 1 da pesquisa (TikTok @climentstudios 7702518015413292310, 2,0 mi de views), guardado só como guia interno em `C:\kineo\docs\remodelamento-1611\vendedor\` (ficha em `FICHA.txt`, folhas a 4 fps em `folhas\`).
- O vídeo: 19,1 s, UM plano sem corte, tela dividida em cima ("Original", camiseta branca, carro preto) e embaixo (o "depois": terno azul-marinho, SUV amarelo de luxo, moça no colo nos primeiros 4 s, relógio dourado aos 11-13 s). Cada metade tem 1080×608.
- Base escolhida: só o "depois", em tela cheia 16:9. Recorte 896×504 a partir de (0, 960), acima do rótulo queimado de outra empresa de IA no canto de baixo, levado a 1280×720 (o Kling 4.0 edição pede ≥ 700 px em cada lado). Perde os pés no plano aberto do começo.
- Trechos de segundo inteiro, emendas nos picos de movimento: 4 s (0-95), 8 s (96-287), 7 s (288-455). Alvo pelo terno: "the man in the dark navy suit and white shirt"; a roupa fica.
- Som: a fala dele em espanhol não entra; no lugar, hustle-04 da biblioteca CC0 (Soulja Unit - Beyond The Moon), 19 s.
- Carro: emblema e placa ilegíveis; o desenho do SUV é reconhecível e é o fundo de todo quadro (recorte não evita).
- Só da casa (`VENDEDOR_ABERTO_AO_PUBLICO = false`), 75 provisório da casa (19 s enviados, o volume do Pitch invader). Custo fal previsto: US$ 3,58 + trava. Nada na home.
- Falta: subir os 6 arquivos de `C:\kineo\docs\remodelamento-1611\subir-ao-bucket-privado-vendedor\` (manifesto junto) ao `quarantine/recreate-guias/v1`; publicar; teste pago da casa; preço público e abertura (o dono).

## 16/11 · vendedor de ilusão v2: o rosto de frente nos instantes da trava (KINEO-VENDEDOR-ROSTO-1611)
- Teste pago da casa ebe8bd47: trecho 0 trocado e aprovado; trecho 1 (4–12 s) falhou com swap_unchanged e estornou 75. A cópia do trecho 1 (renders/clips/.../ebe8bd47-…-trecho-1.mp4) mostra o rosto TROCADO: a falha é da trava, que olha 4 instantes (20/40/60/80% do trecho = 5,6 · 7,2 · 8,8 · 10,4 s do filme) e neles o rosto estava de lado, curvado sobre o capô ou cortado no topo.
- Regra deste molde: todo trecho com o rosto de frente nos 4 instantes da trava. Novos cortes: trecho 0 = 0–5 s (quadros 0–119: a moça no colo e a queda), trecho 1 = 13,125–19,125 s (quadros 315–458: abre o paletó e fala). Saem a ida ao carro e o relógio (rosto de lado ou fora do quadro). Filme de 11 s com um corte seco aos 5 s. Os 8 instantes conferidos em `C:\kineo\docs\remodelamento-1611\vendedor\folhas\trava-v2.jpg`.
- Som e cartão recortados juntos (-v2); o pôster v1 continua (quadro de 1,5 s, dentro do trecho 0). Preço provisório da casa: 45 (~4 por segundo enviado, 11 s). Custo fal previsto: US$ 2,08 + trava.
- Subir os 4 arquivos de `C:\kineo\docs\remodelamento-1611\subir-ao-bucket-privado-vendedor-v2\` (manifesto junto).
