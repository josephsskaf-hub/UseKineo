# Teste completo do Studio Ads, modo "AI makes it" (25/09/2026, ~16h45–17h05 BRT, Cowork)

## Conta e créditos
- Conta usada: **josephsskaf@gmail.com**, a que estava logada. A josephskaf@hotmail.com não estava logada, então os vídeos saíram com a marca d'água "usekineo.com/free".
- Saldo: **203 créditos antes → 191 depois**. Foram 12 créditos, 4 anúncios de 3 créditos cada.
- O saldo no topo da tela não atualiza sozinho. Ficou em 203 depois do anúncio 1 e em 197 depois do anúncio 4, e só mostrou 191 depois de recarregar a página.

## Teste 1: link → anúncio
**Passo 1 — OK, com ressalva.**
- /ads/new não abriu na escolha "AI makes it". Abriu direto no último anúncio pronto ("Your ad is ready"), de um teste anterior.
- Para começar, cliquei em "Make another ad". Apareceu "Continuing your unfinished ad from 25/09/2026" e cliquei em "Start a new ad instead".
- Com isso já apareceu o cartão "Your brand: Brasa, +55 11 98765-4321", vindo de um teste anterior. Não usei.
- Prints: print-01, print-02, print-03.

**Passo 2 — OK técnico, conteúdo ruim.** Colei https://www.allbirds.com e cliquei em "Read my page".
- Tempo: cerca de 9 s.
- Mensagem: "Read allbirds.com: 2 photo(s). Check the text below and add anything missing."
- Fotos: 2 fotos entraram, mas as duas são **a mesma imagem de compartilhamento do site (og:image)**: 1200×630, o logotipo "allbirds" em fundo branco.
- Logo: **não entrou**.
- About your business: "Allbirds — The World's Most Comfortable Shoes. Allbirds: The world's most comfortable shoes, flats, and clothing made with natural materials like merino wool and eucalyptus. FREE shipping & returns. Website: allbirds.com."
- Print: print-04.

**Passo 3 — OK.** O logo não entrou, então subi logo-brasa.png.

**Passo 4 — OK técnico, com 3 erros de conteúdo.** "Make the plan" levou cerca de 8 s. Na tela "Check the facts":
- Business: "Allbirds — The World's Most Comfortable Shoes".
- Offer: **"sapatos, flats e roupas feitos com materiais naturais"**. Não é oferta nenhuma, e foi traduzido para português.
- Contato: "allbirds.com".
- Idioma: **Português** para um site americano em inglês.
- Formato escolhido: "Flash offer · 35s" (venda direta com prazo), sem que exista oferta.
- Print: print-05.

**Passo 5 — OK.**
- Escolhi Square 1:1, Yellow e Upbeat.
- **Troquei o idioma para English.** Com a narração em PT, o passo 8 (traduzir para PT) não faria sentido.
- Deixei a "Offer" como a IA preencheu, para testar o que ela faz.
- Etapas mostradas: "Writing your script…", "Choosing the voice and the scenes…", "Drawing your end card…", "Starting the render…" (até ~80 s), depois "Your ad is being made — Adding captions and music… 60%", depois "Your ad is ready".
- **Tempo total: cerca de 2 min.**
- Prints: print-06, print-07, print-08.

**Passo 6 — Anúncio 1 analisado quadro a quadro, com a narração transcrita.**
- Duração: **51 s**. A tela prometia 35 s.
- Quadrado: **sim**, 1080×1080.
- Legendas: **amarelas, sim**.
- Música: não consegui confirmar por análise automática se é animada. Precisa ouvir.
- Imagem: os 40 s antes do cartão final são **a mesma imagem do logotipo "allbirds" cortado**, tela branca.
- Cartão final: mostra logo, nome e contato, e o texto não corta. Mas junta o **logo da Brasa** (que subimos) com o nome "Allbirds" e o slogan em português. Botão "Buy now / allbirds.com".
- Fatos inventados na narração:
  - "Until the end of the week, enjoy our special offer"
  - "Only here, only this week"
  - "trusted by countless satisfied customers"
  - "sets us apart in the industry"
  - "This offer ends soon"
- A narração em inglês lê o campo em português: "Sapatos, Flats, Erupas, Fetuscom Materiais Naturalis".
- Faltou o único benefício real que o site deu: frete e devolução grátis.
- Link: https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/7687bb3d-527a-4847-b2bb-141ca1d0c05a.mp4 (My Videos: /history#v-b54c7c92-3b4f-477e-b11e-cff2b27fe61c)
- Na biblioteca, este anúncio aparece com o rótulo **"9:16"**, mas ele é 1:1.

## Teste 2: versões
**Passo 7 — OK.**
- "Different opening (A/B test)" leva de volta para "Check the facts" com os mesmos fatos.
- Porém **Format, Captions e Music voltam ao padrão** (Vertical 9:16, Bold, Automatic): o que escolhi no anúncio 1 se perde.
- A tela não mostra que aquilo é uma versão A/B.
- Pronto em cerca de 2 min 20 s.
- Duração: 37,7 s, vertical.
- A primeira frase **mudou**:
  - Anúncio 1: "Are you looking for shoes that combine comfort and sustainability?"
  - Anúncio 2: "Get ready for our exclusive offer on Sapatos, Flats…"
- Continua com os mesmos fatos inventados ("limited time", "only this week", "this offer ends soon").
- Link: https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/44c32798-31a4-417a-a4e2-ca93b9106779.mp4 (/history#v-6259144c-a188-46db-8bb1-66038f2453ac)
- Print: print-09.

**Passo 8 — BLOQUEIO PARCIAL: não existe caminho para voltar ao anúncio 1.**
- /ads/new sempre abre no último anúncio feito.
- Os cartões de My Videos (/history) não têm Translate nem "More versions".
- Não achei parâmetro de URL para abrir um anúncio específico.
- Por isso traduzi o anúncio que estava na tela, que é o A/B (anúncio 2). A lista de idiomas mostra Português (ela esconde o idioma atual).
- Pronto em cerca de 2 min.
- Narração em **português, sim**, com os mesmos fatos de antes, inclusive os inventados ("Até o final da semana", "Só aqui, só nesta semana").
- **O final está incompreensível.** Transcrito com dois modelos diferentes: "acesse alberts.com e garante seu mega… alferto da perivré…". Parece que o TTS lê errado "allbirds.com" e a oferta.
- O cartão final ficou em PT ("Compre agora").
- Duração: 31,7 s.
- Link: https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/fe12b420-7dbb-4104-b6bd-96c1d49dc9c4.mp4 (/history#v-71374d1c-f603-4941-ad51-0f704f84d396)
- Print: print-10.

## Teste 3: fotos próprias + kit da marca + sem legenda
**Passo 9 — OK, com mistura de marcas.**
- O cartão "Your brand" mostrou **"Allbirds / allbirds.com"**, o nome e o contato do último anúncio.
- O quadrado do logo aparece vazio na tela, mas o logo carregado é o da Brasa (512×512).
- "Use my brand" preencheu **só o logo**. About ficou vazio.
- Ou seja, o kit mistura o nome de um anúncio com o logo de outro.
- Prints: print-11, print-12.

**Passo 10 — OK.** Subi as 2 fotos e colei o texto da Brasa. Print: print-13.

**Passo 11 — OK.**
- "Make the plan" levou cerca de 6 s. Os campos vieram certos:
  - Business: "Brasa — restaurante de peixes e grelhados".
  - Offer: o jantar a R$189, de terça a quinta.
  - Contato: +55 11 98765-4321.
  - Idioma: PT.
- Escolhi Vertical 9:16 e No captions. Print: print-14.
- Pronto em cerca de 2 min.
- **Sem legenda na tela: sim.** Mesmo assim, a barra de progresso diz "Adding captions and music…".
- **Narrado: sim**, 35,6 s.
- **R$189: sim, falado certo.**
- **WhatsApp: provavelmente lido errado.** Dois modelos transcreveram "mais 511-987-6543" e "mais 5119876543", o que indica que o TTS pula dígitos de "+55 11 98765-4321". Precisa conferir ouvindo. Na tela o número aparece certo.
- Fato inventado: "conhecido por seus peixes frescos e grelhados suculentos, atraindo casais de toda São Paulo".
- **O cartão final corta o texto da oferta** ("…de terça a quinta até o fi…").
- O nome do restaurante é pronunciado "Braza".
- As fotos reais ficaram bonitas, com zoom suave.
- Link: https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/199b79c7-7881-4d51-a602-6abb64271ebb.mp4 (/history#v-e695d2b0-4bc8-48bb-815e-36db7341cc29)

## Nota "um dono de negócio postaria isso?"
- **Anúncio 1 (Allbirds, quadrado): 2/10.** São 51 s olhando o mesmo logotipo branco, com ofertas e prazos inventados e português lido em voz inglesa.
- **Anúncio 2 (A/B): 2/10.** A abertura mudou, mas os problemas são os mesmos do anúncio 1 e o logo aparece ainda mais cortado.
- **Anúncio 3 (tradução PT): 1/10.** O fechamento, com a chamada para ação, está ininteligível, e repete os prazos inventados.
- **Anúncio 4 (Brasa, fotos próprias): 6/10.** Bonito e com o preço certo, mas o WhatsApp falado parece errado, tem um elogio inventado e o texto do cartão final aparece cortado.

## As 3 coisas que mais atrapalharam
1. **Leitor de link.** Ele pega a imagem de compartilhamento do site como se fossem "2 fotos", enfia a descrição traduzida no campo Offer, põe a narração em português num site em inglês e escolhe "Flash offer" sem existir oferta. Com isso o roteiro inventa prazos e urgência, o que contradiz a promessa "The ad only says what is written here".
2. **Não há como voltar a um anúncio antigo para gerar versões.** /ads/new sempre abre no último anúncio e a biblioteca não tem Translate nem A/B. Além disso, as versões perdem formato, legenda e música escolhidos no original.
3. **Sinais da tela que confundem:**
   - O botão escolhido quase não aparece marcado.
   - O saldo não atualiza sem recarregar a página.
   - A biblioteca rotula o anúncio quadrado como 9:16.
   - A tela promete 35 s e o anúncio sai com 51 s.
   - A barra diz "Adding captions" mesmo com "No captions".
   - O kit "Your brand" mistura nome e logo de anúncios diferentes.
   - O cartão final corta o texto longo da oferta.

## Pedidos objetivos para o Code
1. **Leitor de link:**
   - Ignorar og:image quando a imagem é o logo ou tem pouca variação de cor, e procurar imagens de produto.
   - Nunca preencher Offer sem preço, desconto ou prazo explícito.
   - Tirar o idioma da página (atributo lang), não da interface.
2. **Roteiro:**
   - Com Offer vazio, não escolher "Flash offer" e proibir frases de urgência ("only this week", "ends soon", "limited time").
   - Proibir elogios não fornecidos ("trusted by countless", "conhecido por", "atraindo casais").
3. **Fala do TTS:**
   - Normalizar telefone (+55 11 98765-4321 → dígitos agrupados, sem pular nenhum).
   - Normalizar domínios (allbirds.com → "allbirds ponto com").
   - Não ler texto em outro idioma com a voz errada.
4. **Versões:** herdar Format, Captions e Music do anúncio original. Colocar "More versions" (A/B, Translate, Format) nos cartões de /history ou aceitar /ads/new?ad=<id>.
5. **Tela:**
   - Estado selecionado visível nos botões.
   - Saldo com atualização automática.
   - Rótulo de proporção real na biblioteca.
   - Duração estimada real.
   - Barra de progresso que respeite o "No captions".
   - Cartão final que quebre linha ou reduza a fonte em vez de cortar.
   - "Your brand" com nome e logo do mesmo anúncio.
