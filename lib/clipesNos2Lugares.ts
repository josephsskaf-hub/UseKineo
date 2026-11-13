// KINEO-CLIPES-NOS-2-LUGARES-0411 — fundador 05/11: "Aproveita para colocar uns clipes desse já trocando os do Halloween, já colocando sempre
// nas telas principais. Made by Kineo também. Sempre colocar nos dois lugares, embaralhar, para o aspecto ser maior."
//
// CLIPE NOVO = UMA ENTRADA EM CLIPES_NOVOS, E SÓ. A home e o /made-with-kineo montam a mesma vitrine (components/home/HomeMosaic.tsx),
// e ela lê esta lista: entrou aqui, aparece nos dois lugares. Prévia em public/previews/galeria/<id>.mp4 (540×960, sem som, faststart)
// e pôster em public/posters/galeria/<id>.webp.
//
// KINEO-ENQUADRAMENTO-0911 — QUADRO CERTO É OBRIGATÓRIO (fundador 09/11: "a gente não pode errar isso"). Antes de subir: node scripts/enquadra.mjs <id>
// → olhar a folha (cabeça inteira com respiro, rosto, produto dentro da caixa VERDE em todo quadro — a janela deitada do computador, 1,3:1)
// → acertar o `focus` aqui → colar a linha impressa em lib/vitrineEnquadramento.ts. Sem a linha, scripts/test-enquadramento-vitrine-0911.mjs
// fica vermelho; trocou a prévia ou o pôster depois, também.
//
// Módulo puro, sem import: scripts/test-clipes-nos-2-lugares-0411.mjs o executa direto. Sem preço no cartão; selo = o motor real da
// linha da tabela `clips`, nunca "anúncio feito pela ferramenta de Ads" (estes saíram do /clips e do /images).
// KINEO-ADS-NATAL-VITRINE-1011 — fundador 10/11: "Pode colocar todos na página inicial como anúncios, né? E daí a gente vai usar 'faça seu
// anúncio aqui', né? Em vez de Recreate, a pessoa vai fazer o anúncio dela." Muda o LINK, não a verdade: o tipo 'Ad example' (exemplo de
// anúncio, dito só no aria-label) é o ÚNICO cartão que leva à criação de anúncio (/ads/new, o mesmo destino do item "Product ads" do menu do
// topo) e mostra o convite "Make your ad" no lugar do "Recreate". Continua PROIBIDO dizer ou insinuar que o vídeo foi feito pela ferramenta
// de Ads ("made with Kineo Ads", "made by the ad tool"): os 6 de 10/11 foram feitos à mão, fora do produto de Ads. O convite chama; não atribui.
export const CLIPES_NOS_2_LUGARES_MARK = 'KINEO-CLIPES-NOS-2-LUGARES-0411'

interface ClipeNovoBase {
  id: string
  title: string
  /** Linha da tabela `clips` de onde o clipe saiu. */
  clipId: string
  /** Que faixa do vídeo 9:16 a janela do cartão mostra (object-position), medida quadro a quadro. */
  focus: string
  /** Tem a mesma pessoa em cena: dois assim não ficam colados (a vitrine viraria "a moça de novo"). */
  pessoa: boolean
  /** Texto do clipe, palavra por palavra, para preencher o /clips. null = clipe feito a partir de uma foto: o texto dele só descreve o
   *  movimento ("Keep the same woman…") e sem a foto mentiria; o cartão abre o /clips no motor e a pessoa manda a foto dela. */
  prompt: string | null
}

// KINEO-OUTFIT-MORPH-HOME-0911 — fundador 09/11: um clipe pode entrar como FORMATO da moda, sem nome de motor no cartão (ele quer menos
// nome de motor nesse tipo de cartão). Honestidade: engine null + selo 'Trending format' quando quem fez o clipe não é um motor do /clips
// (CLIP_ENGINES). O cartão então não mostra motor nenhum (nunca um errado) e leva ao /clips puro, sem motor e sem texto.
export type ClipeNovo = ClipeNovoBase & (
  | {
      /** Chave de CLIP_ENGINES: o motor que de fato fez o clipe (o selo do cartão sai daqui). */
      engine: 'seedance' | 'hollywood' | 'h3'
      selo?: undefined
    }
  | {
      /** Feito fora dos motores do /clips: nenhum motor no selo nem no destino. A verdade fica no comentário da entrada. */
      engine: null
      /** O tipo do cartão (só no aria-label). 'Trending format' = clipe de uma cena, abre o /clips puro. 'Narrated film' = filme narrado feito
       *  de verdade no Kineo Studio: abre o Studio pelo mesmo link dos filmes da vitrine (KINEO-VITRINE-10-1011). */
      selo: 'Trending format' | 'Narrated film' | 'Ad example' // KINEO-ADS-NATAL-VITRINE-1011 — 'Ad example' = exemplo de anúncio: abre a criação de anúncio
    }
)

export const CLIPES_NOVOS: readonly ClipeNovo[] = [
  // KINEO-CLIPES-E-CARDS-0511 [fundador 05/11: "5 clips aprovados, viram vitrine"; "outros modelos de ugc"] — feitos no H3 Max Turbo pela rota interna /api/admin/engine-test; clipId = fal:<pedido>, sem linha na tabela `clips`.
  { id: 'pet-barista', title: 'Dog barista', engine: 'h3', clipId: 'fal:01a1ae37-2f30-7d63-ab53-52234e4ed8c8', focus: '50% 19%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'adeus-2026', title: 'Goodbye 2026, hello 2027', engine: 'h3', clipId: 'fal:01a1ae37-3613-75f0-9c89-7722df1bcb94', focus: '50% 36%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'ugc-indiano-fone', title: 'Headphones walk', engine: 'h3', clipId: 'fal:01a1ae37-80fa-7e73-861a-ab40bb2e13c3', focus: '50% 38%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'produto-perfume-marmore', title: 'Perfume in morning light', engine: 'h3', clipId: 'fal:01a1ae37-ca14-7463-8c1b-6bc50ab14e8b', focus: '50% 65%', pessoa: false, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'perfume-splash', title: 'Perfume splash', engine: 'hollywood', clipId: 'c9d321e0-0fe4-44b7-871b-2407a55bec91', focus: '50% 58%', pessoa: false, prompt: 'Vertical luxury perfume commercial, one continuous shot, no cuts. Super slow motion: one square glass perfume bottle with a gold cap and amber liquid, completely blank with no label, plunges into deep turquoise water from above, a huge crown of water erupts around it, thousands of silver bubbles rush upward, the bottle rotates slowly in the centre of the frame and catches golden light, the camera pushes in. The bottle keeps exactly the same shape and stays sharp. Rich saturated colours, high-end fragrance film. No text, no letters, no logos, no hands, no people.' },
  { id: 'iced-coffee-pour', title: 'Iced coffee pour', engine: 'seedance', clipId: 'a3576c28-47ba-4c19-a141-b5e8e196c9dd', focus: '50% 35%', pessoa: false, prompt: 'Vertical commercial coffee shot, one continuous shot. Super slow motion: dark espresso pours in a thick glossy stream from above into a tall clear glass of cold milk and ice cubes on a warm caramel background. The coffee plunges down and blooms through the white milk in swirling clouds, ice cubes turn, a few drops splash above the rim, the camera pushes in slowly. Crisp studio light, rich warm colours, high-end drink commercial. The glass is plain with no label and keeps the same shape. No text, no letters, no logos, no hands, no people.' },
  // KINEO-OUTFIT-MORPH-HOME-0911 [fundador 09/11: "tá aprovado, pode colocar na tela inicial também esse daí, outfit v6"] — formato "Outfit Morph"
  // (câmera de cima, ela rola do sofá para o tapete e a roupa troca no clique do controle e nas pás do ventilador). Verdade: feito com Kling 4.0
  // (kling/v4/image-to-video na fal), dois pedidos unidos no ffmpeg em 09/11/2026, saídas 0ab1d30e/bo9VslFC3Y8vO9Fk5QBwW e
  // 0ab1d315/oyRjMp3igUDfHE0rwpW9O. Kling 4.0 não é motor do /clips e não há linha na tabela `clips`: o cartão não mostra motor nenhum.
  { id: 'outfit-morph', title: 'Outfit morph', engine: null, selo: 'Trending format', clipId: 'fal:0ab1d30e/bo9VslFC3Y8vO9Fk5QBwW+0ab1d315/oyRjMp3igUDfHE0rwpW9O', focus: '50% 30%', pessoa: true, prompt: null }, // KINEO-OUTFIT-MORPH-HOME-0911
  // KINEO-VITRINE-10-1011 [fundador 10/11: "tá muito legal os 10… Pode colocar os 10 na tela inicial"; sobre a dança e o boneco de neve:
  // "Deixa como está"] — os 10 aprovados de 09/11. Nenhum tem linha na tabela `clips`; o clipId guarda a origem real.
  // 3 FILMES narrados, feitos de verdade no Kineo Studio com Kling 4.0 em 09/11/2026: selo 'Narrated film', o cartão abre o Studio como os outros
  // filmes da vitrine. clipId = studio:<job>/<vídeo>. Prévia = o melhor trecho contínuo, só escalado para 540×960 (sem corte nem tarja nova):
  // Mary Celeste 0–6,5 s (a tomada de abertura; 8 s não cabia em 600 KB), Anticítera 8–15 s (a engrenagem), Porta do Inferno 0–8 s (cratera e lava).
  { id: 'filme-mary-celeste', title: 'The ghost ship Mary Celeste', engine: null, selo: 'Narrated film', clipId: 'studio:772be5b8/9302d8c6', focus: '50% 36%', pessoa: false, prompt: null }, // KINEO-VITRINE-10-1011 — Studio job 772be5b8, vídeo 9302d8c6, Kling 4.0, 09/11/2026
  { id: 'filme-anticitera', title: 'The 2,000-year-old computer', engine: null, selo: 'Narrated film', clipId: 'studio:1b9e1d60/a451a9b4', focus: '50% 38%', pessoa: false, prompt: null }, // KINEO-VITRINE-10-1011 — Studio job 1b9e1d60, vídeo a451a9b4, Kling 4.0, 09/11/2026
  { id: 'filme-porta-do-inferno', title: 'The Door to Hell is fading', engine: null, selo: 'Narrated film', clipId: 'studio:9a3e5b44/1fcab375', focus: '50% 50%', pessoa: false, prompt: null }, // KINEO-VITRINE-10-1011 — Studio job 9a3e5b44, vídeo 1fcab375, Kling 4.0, 09/11/2026
  // 7 CLIPES de uma cena: foto do Nano Banana Pro + Kling 4.0 image-to-video (kling/v4/image-to-video na fal), 09/11/2026. Kling 4.0 não é motor
  // do /clips: como o outfit-morph, nenhum motor no cartão, selo 'Trending format', destino /clips puro (sem motor, sem texto). Nada leva às Ads
  // nem ao Cartoon: não foram esses produtos que fizeram estes vídeos. clipId = fal:<saída>.
  { id: 'passarela', title: 'Fashion catwalk', engine: null, selo: 'Trending format', clipId: 'fal:0ab1d89b/HbvScocR9LQY-FT8vl-CA', focus: '50% 30%', pessoa: true, prompt: null }, // KINEO-VITRINE-10-1011
  { id: 'escolha-o-favorito', title: 'Pick your favorite', engine: null, selo: 'Trending format', clipId: 'fal:0ab1d9f9/EnyKpFmu87NtPpo-kfujT', focus: '50% 22%', pessoa: true, prompt: null }, // KINEO-VITRINE-10-1011
  { id: 'dinheiro', title: 'Counting cash', engine: null, selo: 'Trending format', clipId: 'fal:0ab1d9f0/7vfzrcsW7He9IOli4H5Lk', focus: '50% 25%', pessoa: true, prompt: null }, // KINEO-VITRINE-10-1011
  { id: 'kit-skincare', title: 'Holiday skincare gift set', engine: null, selo: 'Trending format', clipId: 'fal:0ab1da00/tKyNDXU7RAxwcmy_kF-BU', focus: '50% 48%', pessoa: false, prompt: null }, // KINEO-VITRINE-10-1011
  { id: 'dragaozinho', title: 'The little dragon afraid of fire', engine: null, selo: 'Trending format', clipId: 'fal:0ab1da07/LBX9mJqp4LXh5eUkA37kb', focus: '50% 56%', pessoa: false, prompt: null }, // KINEO-VITRINE-10-1011
  { id: 'boneco-de-neve', title: 'The snowman who hides from the sun', engine: null, selo: 'Trending format', clipId: 'fal:0ab1da01/aYq5oKWE2FXdjYSbpJnH0', focus: '50% 68%', pessoa: false, prompt: null }, // KINEO-VITRINE-10-1011
  // KINEO-ADS-NATAL-VITRINE-1011 [fundador 10/11: "Pode colocar todos na página inicial como anúncios… Em vez de Recreate, a pessoa vai fazer o
  // anúncio dela"] — 6 anúncios de Natal aprovados. VERDADE: os seis feitos em 10/11/2026 com uma foto do Nano Banana Pro cada + Kling 4.0
  // image-to-video com `multi_prompt` (três tomadas), À MÃO, FORA do produto de Ads; nenhuma linha em `clips` nem em `ads_v2_orders`.
  // Por isso: sem motor no cartão, clipId = 'manual:<arquivo de origem>' (docs/referencias/ads-natal-1011/), e nada diz que a ferramenta de
  // Ads os fez — o cartão só CONVIDA ("Make your ad") e leva à criação de anúncio. Prévia = o melhor trecho contínuo ≤ 8 s, cruzando 1 corte.
  // KINEO-ADS-FALADOS-1111 — ENTRAM NO LUGAR de 3 dos 6 de Natal (skincare, caneca e manta saem da home e do /made-with-kineo; continuam na
  // seção da /ads e os arquivos ficam): com 35 clipes a vitrine passava do teto de 14 MB e a mistura do dia fazia bloco de 3 clipes novos e 10
  // células vazias na grade (medido pelo guardião). Trocar 3 por 3 mantém a contagem (32), o peso e a grade de hoje. Quais saem é curadoria:
  // a CEO/dono podem trocar a escolha (ficaram relógio, colar e o suéter de pet — produto e bicho, para variar das pessoas falando).
  // KINEO-ADS-FALADOS-1111 [dono 11/11: "Gostei muito do vídeo Halo… esse tipo de ads é o que vão mais usar no futuro e viralizar"; Amara e Rahul:
  // "Os 2 entram"; regra: "só com coisas muito top coloca na página principal as melhores e na página Made with Kineo também"] — 3 anúncios
  // FALADOS (a pessoa fala para a câmera). VERDADE: feitos À MÃO pela CEO em 11/11 no playground do fornecedor (foto-chave do Nano Banana Pro
  // + Seedance 2.0 com fala nativa), FORA do produto de Ads; nenhuma linha em `clips` nem em `ads_v2_orders`. Produtos e marcas fictícios
  // (Halo, Veil, Orra). Mesmo caminho dos 6 de Natal: selo 'Ad example', sem motor, convite "Make your ad". Prévia = os 8 s iniciais do
  // anúncio (540×960, sem som), a partir do mesmo inteiro de public/ads-exemplos/ (a /ads mostra os mesmos 3).
  { id: 'anuncio-halo-car-selfie', title: 'Halo cup, filmed in the car', engine: null, selo: 'Ad example', clipId: 'manual:ads-ugc-falado-1111/halo-sofia-seedance2.mp4', focus: '50% 22%', pessoa: true, prompt: null }, // KINEO-ADS-FALADOS-1111
  { id: 'anuncio-veil-grwm', title: 'Veil sunscreen, get ready with me', engine: null, selo: 'Ad example', clipId: 'manual:ads-ugc-falado-1111/veil-amara-seedance2.mp4', focus: '50% 20%', pessoa: true, prompt: null }, // KINEO-ADS-FALADOS-1111
  { id: 'anuncio-orra-street-interview', title: 'Orra earbuds, asked on the street', engine: null, selo: 'Ad example', clipId: 'manual:ads-ugc-falado-1111/orra-rahul-seedance2.mp4', focus: '50% 22%', pessoa: true, prompt: null }, // KINEO-ADS-FALADOS-1111
  { id: 'anuncio-relogio', title: 'The gift watch', engine: null, selo: 'Ad example', clipId: 'manual:ads-natal-1011/ad2-relogio.mp4', focus: '50% 50%', pessoa: false, prompt: null }, // KINEO-ADS-NATAL-VITRINE-1011 — prévia 4,2–12,0 s: órbita da caixa → a mão fecha no pulso
  { id: 'anuncio-colar', title: 'Gold necklace gift', engine: null, selo: 'Ad example', clipId: 'manual:ads-natal-1011/ad3-colar.mp4', focus: '50% 50%', pessoa: false, prompt: null }, // KINEO-ADS-NATAL-VITRINE-1011 — prévia 4,2–12,0 s: órbita da caixa de veludo → no pescoço
  { id: 'anuncio-sueter-pet', title: 'Christmas dog sweater', engine: null, selo: 'Ad example', clipId: 'manual:ads-natal-1011/ad5-pet.mp4', focus: '50% 38%', pessoa: true, prompt: null }, // KINEO-ADS-NATAL-VITRINE-1011 — prévia 6,5–14,5 s: o corgi corre até a lente → o abraço
  // KINEO-HOME-10-CLIPES-1311 [dono 13/11: escolheu 10 de 12 quadros ("1 e 6 não, o resto sim"); viu os 10 clipes: "Todos podem ir se você arrumar esse negócio aí
  // (a 3ª mão do creme). Todos vão pra home, todos vão pra Made by Kineo também"] — 10 clipes de uma cena. VERDADE: feitos À MÃO pela CEO em 13/11
  // no playground do fornecedor: foto parada (gpt-image-2) + MiniMax H3 Max Turbo image-to-video, 6 s, 768P; nenhuma linha em `clips` nem em
  // `ads_v2_orders`; gente inventada, sem marca. clipId = fal:<saída>. O creme é a 2ª tomada (a 1ª tinha uma mão a mais). Como os de 09/11 e 10/11:
  // sem motor no cartão; 7 são 'Trending format' (abrem o /clips puro) e 3 são 'Ad example' (convidam "Make your ad", sem dizer que a ferramenta de
  // Ads os fez). ENTRAM NO LUGAR de 10 antigos, para a vitrine seguir com 32 clipes, o teto de 14 MB e a grade de hoje (ver 11/11 acima): saem
  // virada-natal, ugc-idosa-creme, produto-tenis-rua, produto-burger-mesa e flying-burger (o mesmo assunto dos novos), duelo-de-danca, glow-up,
  // bebe-danca, ugc-homem-cafe e spinning-headphones. Curadoria da CEO: o dono pode trocar. Nenhum arquivo foi apagado.
  { id: 'selfie-confete', title: 'Selfie with the crowd', engine: null, selo: 'Trending format', clipId: 'fal:0ab243cd/JALaJedKJJ9qv3LUnIT9q', focus: '50% 33%', pessoa: true, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'sueter-aconchegante', title: 'Cozy sweater flip', engine: null, selo: 'Trending format', clipId: 'fal:0ab243d6/KYKynkoZ7STmsmJk22KmJ', focus: '50% 22%', pessoa: true, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'balao-confete', title: 'Balloon pop surprise', engine: null, selo: 'Trending format', clipId: 'fal:0ab243db/cTaoyq8jeE7w-8FhDIrkg', focus: '50% 28%', pessoa: true, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'danca-corredor', title: 'Dance in the hallway', engine: null, selo: 'Trending format', clipId: 'fal:0ab243de/ZJvxYoyYoIlJ4YYtZ9iF_', focus: '50% 38%', pessoa: true, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'raposa-lanterna', title: 'Fox and the lantern', engine: null, selo: 'Trending format', clipId: 'fal:0ab243e9/K6Di-jR20cAFJ9kNryP_I', focus: '50% 36%', pessoa: false, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'ultimo-trem', title: 'The last train', engine: null, selo: 'Trending format', clipId: 'fal:0ab243eb/xGoShgcRyDZ-qxRS91A-D', focus: '50% 52%', pessoa: false, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'carta-do-front', title: 'The letter from the front', engine: null, selo: 'Trending format', clipId: 'fal:0ab243ee/kKxVjZOJ6jvO6GB5i2m2e', focus: '50% 50%', pessoa: true, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'anuncio-tenis-pedestal', title: 'The sneaker drop', engine: null, selo: 'Ad example', clipId: 'fal:0ab243e1/KXAGTs7aSc0LLyjlsg_jF', focus: '50% 72%', pessoa: false, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'anuncio-creme-selfie', title: 'Honest face cream review', engine: null, selo: 'Ad example', clipId: 'fal:0ab24414/Q22EH_dnQykRmRdKNM5Am', focus: '50% 14%', pessoa: true, prompt: null }, // KINEO-HOME-10-CLIPES-1311
  { id: 'anuncio-burger-camera-lenta', title: 'Your burger, slow motion', engine: null, selo: 'Ad example', clipId: 'fal:0ab243f1/jcIHlvocwL6UrZndIR3Oa', focus: '50% 72%', pessoa: false, prompt: null }, // KINEO-HOME-10-CLIPES-1311
]

/** KINEO-HOME-10-CLIPES-1311 — os 10 clipes que saíram da vitrine (home e /made-with-kineo) em 13/11 para os 10 novos entrarem. O registro de
 *  origem de cada um continua aqui (outras páginas ainda usam estes arquivos, ex.: lib/seo/vitrinePaginas1011.ts e o cartão da home que
 *  alterna clipes) e os arquivos seguem em public/previews/galeria e public/posters/galeria. Para voltar um: mover a linha para CLIPES_NOVOS,
 *  tirar outro (a vitrine fica em 32), repor a linha em lib/vitrineEnquadramento.ts e em VERDADE no guardião. */
export const CLIPES_FORA_DA_VITRINE_1311: readonly ClipeNovo[] = [
  { id: 'virada-natal', title: 'Christmas sweater flip', engine: 'h3', clipId: 'fal:01a1ae37-2ed6-7493-acb9-3b42c05aae15', focus: '50% 54%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'bebe-danca', title: 'Baby kitchen dance', engine: 'h3', clipId: 'fal:01a1ae37-3003-76e1-8031-e5613d253e39', focus: '50% 70%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'glow-up', title: 'The glow-up reveal', engine: 'h3', clipId: 'fal:01a1ae37-7f7f-7d42-a0d3-18662c36f1f1', focus: '50% 34%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'ugc-homem-cafe', title: 'Coffee review', engine: 'h3', clipId: 'fal:01a1ae37-7de0-7b91-8927-ac13fd481ed5', focus: '50% 26%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'ugc-idosa-creme', title: 'Face cream review', engine: 'h3', clipId: 'fal:01a1ae37-8225-7641-855d-7b77d62f0a06', focus: '50% 25%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'produto-tenis-rua', title: 'Sneaker at sunrise', engine: 'h3', clipId: 'fal:01a1ae37-d069-7270-93f7-f0332a0e4d7c', focus: '50% 50%', pessoa: false, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'produto-burger-mesa', title: 'The burger close-up', engine: 'h3', clipId: 'fal:01a1ae37-cdde-74c1-acd8-a8dc4054634e', focus: '50% 75%', pessoa: false, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'flying-burger', title: 'Flying burger', engine: 'seedance', clipId: 'b248db19-c3fb-4b08-878c-1d10d3b9af7b', focus: '50% 40%', pessoa: false, prompt: 'Vertical commercial food shot, one continuous shot. Super slow motion: a juicy cheeseburger assembles itself in mid-air against a warm dark orange background. The toasted sesame bun, grilled patty, melting cheese, lettuce, tomato and red onion fall from above one after another and land in a perfect stack in the centre of the frame, melted cheese stretches and drips, sesame seeds and tiny crumbs bounce in the air, the camera pushes in slowly. Crisp studio light, rich appetising colours, high-end fast food commercial. No text, no letters, no logos, no packaging, no hands, no people.' },
  { id: 'spinning-headphones', title: 'Spinning headphones', engine: 'seedance', clipId: '6e6b1249-69c9-4036-b2b3-36e5c157dda1', focus: '50% 40%', pessoa: false, prompt: 'Vertical commercial tech product shot, one continuous shot. Matte black over-ear wireless headphones, completely plain with no logos and no markings, spin slowly in mid-air in the centre of the frame against a deep electric blue background. They rotate a full turn, soft neon cyan and magenta light slides across the curves, the ear cups open outward and fold back, tiny glowing dust particles drift past, the camera pushes in slowly. Crisp studio light, sleek high-end tech commercial. The headphones keep the same shape throughout. No text, no letters, no logos, no hands, no people.' },
  { id: 'duelo-de-danca', title: 'Parking lot dance-off', engine: null, selo: 'Trending format', clipId: 'fal:0ab1d9f3/iLdN6Py4oNvS6P4yUAQlQ', focus: '50% 66%', pessoa: true, prompt: null }, // KINEO-VITRINE-10-1011
]

/** KINEO-HOME-TOPO-CLIPES-1311 [dono 13/11, vendo a home sem mudança na 1ª tela: "ainda não foi"; e depois: "deixa eles na parte de cima sempre como regra, e
 *  maiores também, que são coisas mais legais"] — REGRA: os clipes novos aprovados ABREM a home, em cartão grande (3 por linha no computador,
 *  2 no celular), no lugar da antiga fileira de seis paisagens (onda, águia, rua, arraia, montanha, cavalo: "paisagem sem gente nem produto sai").
 *  São ids de CLIPES_NOVOS, na ordem em que aparecem. Clipe novo aprovado entra NA FRENTE desta lista e o último sai dela (ele continua na grade
 *  de baixo e no /made-with-kineo). Sempre 6, para fechar duas linhas inteiras. Na home, quem está aqui não se repete na grade. */
export const CLIPES_NO_TOPO: readonly string[] = ['selfie-confete', 'anuncio-creme-selfie', 'anuncio-burger-camera-lenta', 'raposa-lanterna', 'carta-do-front', 'sueter-aconchegante'] // KINEO-HOME-TOPO-5X6-1311 — só clipe que cabe em pé na janela 5:6 (o balão é corpo inteiro com braços para cima: fica na grade)

export const clipeNovoVideo = (c: Pick<ClipeNovo, 'id'>): string => `/previews/galeria/${c.id}.mp4`
export const clipeNovoPoster = (c: Pick<ClipeNovo, 'id'>): string => `/posters/galeria/${c.id}.webp`

/** KINEO-VITRINE-10-1011 — filme narrado do Kineo Studio: o cartão não usa clipeNovoDestino; abre o Studio pelo MESMO link dos filmes da
 *  vitrine (clipsFirstFilmHref, em components/home/HomeMosaic.tsx). */
export const clipeNovoAbreStudio = (c: Pick<ClipeNovo, 'selo'>): boolean => c.selo === 'Narrated film'

/** KINEO-ADS-NATAL-VITRINE-1011 — exemplo de anúncio: o cartão mostra "Make your ad" (não "Recreate") e leva à criação de anúncio. */
export const clipeNovoAnuncio = (c: Pick<ClipeNovo, 'selo'>): boolean => c.selo === 'Ad example'
/** KINEO-ADS-NATAL-VITRINE-1011 — o MESMO destino do item "Product ads" do menu do topo (app/KineoLanding.tsx, href="/ads/new"). */
export const CRIAR_ANUNCIO_HREF = '/ads/new'

/** Para onde o cartão leva (o chamador passa por viaSignup, como todo clipe da vitrine). Nada é gerado sem o clique em Gerar. */
export function clipeNovoDestino(c: Pick<ClipeNovo, 'engine' | 'prompt' | 'selo'>): string {
  if (clipeNovoAnuncio(c)) return CRIAR_ANUNCIO_HREF // KINEO-ADS-NATAL-VITRINE-1011 — só o exemplo de anúncio leva à criação de anúncio
  if (c.engine === null) return '/clips' // KINEO-OUTFIT-MORPH-HOME-0911 — formato sem motor do /clips: nem motor, nem texto
  const q = new URLSearchParams({ engine: c.engine })
  if (c.prompt) q.set('prompt', c.prompt)
  return '/clips?' + q.toString()
}

/** Fora da vitrine (home e /made-with-kineo) porque a data passou. Nenhum arquivo foi apagado e as páginas próprias seguem no ar
 *  (/ai-halloween-video, /effects/<slug>); na próxima estação é só tirar daqui. O Natal fica: estamos em novembro. */
export const FORA_DE_ESTACAO: Readonly<Record<'clipes' | 'efeitos' | 'imagens', readonly string[]>> = {
  clipes: ['werewolf'],
  efeitos: ['witch', 'zombie', 'werewolf', 'catrina', 'catrina_pet', 'dust_away', 'figurine_3d'], // dust_away e figurine_3d: o nome não diz, mas a cena abre com abóboras de Halloween acesas ao fundo
  imagens: ['pumpkin.webp'],
}

/** O dia da vitrine, em UTC: a mesma resposta em qualquer servidor ou navegador, seja qual for o fuso. */
export function diaDaVitrine(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

function semente(texto: string): number { // FNV-1a
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

/** Fisher-Yates com sorteio derivado da data (mulberry32). Mesma data + mesmo sal = mesma ordem; não usa Math.random nem o relógio. */
export function embaralhaDoDia<T>(itens: readonly T[], dia: string, sal: string): T[] {
  let s = semente(`${dia}|${sal}`)
  const sorteio = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...itens]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1))
    const guarda = out[i]; out[i] = out[j]; out[j] = guarda
  }
  return out
}

/** Espalha `extras` por `base` em intervalos iguais, começando por um extra. Sem extras, devolve a base como veio. */
export function intercala<T>(base: readonly T[], extras: readonly T[]): T[] {
  if (extras.length === 0) return [...base]
  const passo = Math.max(1, Math.floor(base.length / extras.length))
  const out: T[] = []
  let b = 0
  for (const extra of extras) {
    out.push(extra)
    for (let i = 0; i < passo && b < base.length; i++) out.push(base[b++])
  }
  while (b < base.length) out.push(base[b++])
  return out
}

/** Quebra sequências: mais de `maximo` vizinhos `colado` seguidos e um deles (o último, senão o primeiro) troca de lugar com o próximo que
 *  `podeTrocar` (mesmo tamanho de cartão), para a grade não mudar de desenho. Sem candidato, fica como está. */
export function afastaVizinhos<T>(itens: readonly T[], colado: (t: T) => boolean, podeTrocar: (a: T, b: T) => boolean, maximo = 1): T[] {
  const out = [...itens]
  const seguidos = (i: number, passo: number) => { let n = 0; for (let k = i + passo; k >= 0 && k < out.length && colado(out[k]); k += passo) n++; return n }
  for (let i = 1; i < out.length; i++) {
    if (!colado(out[i])) continue
    const run = seguidos(i, -1) + 1
    if (run <= maximo) continue
    let trocou = false
    for (const alvo of [i, i - run + 1]) {
      for (let j = i + 1; j < out.length && !trocou; j++) {
        if (colado(out[j]) || !podeTrocar(out[alvo], out[j]) || seguidos(j, -1) + seguidos(j, 1) + 1 > maximo) continue
        const guarda = out[alvo]; out[alvo] = out[j]; out[j] = guarda
        trocou = true
      }
      if (trocou) break
    }
    // KINEO-OUTFIT-MORPH-HOME-0911 — sem candidato à frente (fim da fila, poucos efeitos depois do Natal), procura para trás, do mais perto ao
    // mais longe. Só roda quando a busca de sempre falhou: onde ela achava par, a ordem é a mesma de antes.
    for (const alvo of trocou ? [] : [i, i - run + 1]) {
      for (let j = i - run; j >= 0 && !trocou; j--) {
        if (colado(out[j]) || !podeTrocar(out[alvo], out[j]) || seguidos(j, -1) + seguidos(j, 1) + 1 > maximo) continue
        const guarda = out[alvo]; out[alvo] = out[j]; out[j] = guarda
        trocou = true
      }
      if (trocou) break
    }
  }
  return out
}

/** Quantas células a grade deixa vazias: simula o `grid-auto-flow: row dense` do CSS (cada item na 1ª vaga livre, de cima para baixo). */
export function celulasVazias<T>(itens: readonly T[], tamanho: (t: T) => readonly [number, number], colunas: number): number { // KINEO-OUTFIT-MORPH-HOME-0911
  const g: boolean[][] = []
  const livre = (r: number, c: number, w: number, h: number) => {
    if (c + w > colunas) return false
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (g[y]?.[x]) return false
    return true
  }
  let topo = 0 // 1ª fileira que ainda tem vaga: acima dela nada cabe mais
  for (const t of itens) {
    const [w0, h] = tamanho(t)
    const w = Math.min(w0, colunas)
    const cheia = (r: number) => { for (let x = 0; x < colunas; x++) if (!g[r]?.[x]) return false; return true }
    while (cheia(topo)) topo++
    let feito = false
    for (let r = topo; !feito; r++) for (let c = 0; c < colunas && !feito; c++) if (livre(r, c, w, h)) {
      for (let y = r; y < r + h; y++) { g[y] = g[y] || []; for (let x = c; x < c + w; x++) g[y][x] = true }
      feito = true
    }
  }
  let n = 0
  for (let y = 0; y < g.length; y++) for (let x = 0; x < colunas; x++) if (!g[y]?.[x]) n++
  return n
}

/** Fecha o fim da grade: um cartão alto que sobra sozinho no fim deixa um degrau vazio embaixo. Tenta adiantar um dos 2 últimos cartões
 *  `alto` em 1 a 12 posições e fica com a 1ª arrumação que deixa MENOS células vazias na 1ª grade sem piorar nenhuma outra e que `aceita`.
 *  Sem ganho, devolve a fila como veio. Determinístico: mesma fila = mesma resposta. */
export function fechaOFim<T>( // KINEO-OUTFIT-MORPH-HOME-0911
  itens: readonly T[],
  alto: (t: T) => boolean,
  grades: readonly { colunas: number; tamanho: (t: T) => readonly [number, number] }[],
  aceita: (fila: readonly T[]) => boolean = () => true,
): T[] {
  const custo = (fila: readonly T[]) => grades.map((g) => celulasVazias(fila, g.tamanho, g.colunas))
  const base = custo(itens)
  if (!grades.length) return [...itens]
  const area = itens.reduce((s, t) => { const [w, h] = grades[0].tamanho(t); return s + Math.min(w, grades[0].colunas) * h }, 0)
  if (base[0] <= (grades[0].colunas - (area % grades[0].colunas)) % grades[0].colunas) return [...itens] // já no mínimo possível: nada a fechar
  let melhor: readonly T[] = itens
  let melhorCusto = base
  const altos = itens.map((t, i) => (alto(t) ? i : -1)).filter((i) => i >= 0).slice(-2).reverse()
  for (const de of altos) {
    for (let k = 1; k <= 12 && de - k >= 0; k++) {
      const fila = [...itens]
      const [movido] = fila.splice(de, 1)
      fila.splice(de - k, 0, movido)
      const c = custo(fila)
      if (c[0] < melhorCusto[0] && c.every((v, n) => v <= base[n]) && aceita(fila)) { melhor = fila; melhorCusto = c }
    }
  }
  return [...melhor]
}

/** Tira do fim da fila os itens `largo` (voltam a `cauda` posições antes do fim): cartão largo no fim da grade deixa buraco, porque não sobra
 *  cartão pequeno para fechar a fileira. */
export function semLargoNoFim<T>(itens: readonly T[], largo: (t: T) => boolean, cauda: number): T[] {
  const corte = Math.max(0, itens.length - cauda)
  const fim = itens.slice(corte)
  return [...itens.slice(0, corte), ...fim.filter(largo), ...fim.filter((t) => !largo(t))]
}

function alterna<T>(a: T[], b: T[], n: number): T[] {
  const out: T[] = []
  while (out.length < n && (a.length || b.length)) {
    const x = a.shift(); if (x !== undefined) out.push(x)
    if (out.length >= n) break
    const y = b.shift(); if (y !== undefined) out.push(y)
  }
  return out
}

/** A escalação do dia: 1/4 em cartão grande (mais que isso acaba com as imagens antes dos cartões grandes e abre buraco no fim da grade), o
 *  resto no pequeno, sempre alternando pessoa e produto, para os clipes se misturarem à vitrine sem virar bloco. O grande abre com produto e o pequeno com pessoa: a pessoa não dobra na mesma leva de cartões. */
export function clipesNovosDoDia(dia: string, lista: readonly ClipeNovo[] = CLIPES_NOVOS): { grandes: ClipeNovo[]; pequenos: ClipeNovo[] } {
  const pessoas = embaralhaDoDia(lista.filter((c) => c.pessoa), dia, 'novos-pessoa')
  const produtos = embaralhaDoDia(lista.filter((c) => !c.pessoa), dia, 'novos-produto')
  // KINEO-VITRINE-10-1011 [fundador 10/11: "Pode colocar os 10 na tela inicial"] — teto de 4 grandes: quem segura o cartão grande são as
  // imagens da vitrine (2 por grande), e elas não cresceram com a lista. Com 26 clipes, 1/4 dava 7 grandes, as imagens acabavam antes e os
  // últimos grandes sobravam sozinhos (22 células vazias no computador). Até 16 clipes a conta é a mesma de antes (16/4 = 4).
  const nGrandes = Math.min(4, Math.ceil(lista.length / 4))
  const grandes = alterna(produtos, pessoas, nGrandes)
  const pequenos = alterna(pessoas, produtos, lista.length - nGrandes)
  return { grandes, pequenos }
}
