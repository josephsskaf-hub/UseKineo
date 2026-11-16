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
