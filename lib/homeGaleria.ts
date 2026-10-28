// KINEO-GALERIA-HOME-2710 — "Made with Kineo": a galeria única de tudo o que a Kineo faz (clipes, imagens, filmes narrados).
//
// O QUE O FUNDADOR PEDIU (27/10): "A gente devia ter uma seção no início onde a gente mostra todos os nossos clips, imagens,
// tudo junto" (referência: o Explore da Higgsfield). Na mesma tarde: virar ITEM DO MENU DO TOPO, nome exato "Made with Kineo",
// com página própria (/made-with-kineo) — app/made-with-kineo/page.tsx.
//
// ESTE ARQUIVO É A CURADORIA (módulo puro, sem import — o guardião scripts/test-galeria-home-2710.mjs o executa num vm):
//   · as listas abaixo dizem O QUE aparece e EM QUE ORDEM, por tipo; a página intercala os tipos (GALERIA_MIX);
//   · mídia nova (os 8 clipes Kling 3 de 27/10) mora em public/previews/galeria + public/posters/galeria (prévia leve de 5 s,
//     540 px, sem som; o master de 12–18 MB fica no storage); o resto é mídia que o site JÁ serve (filmes do FOUNDER_SHOWCASE,
//     clipes "Trending this week", efeitos do /clips, fotos da galeria da home) — resolvida em lib/homeGaleriaItems.ts;
//   · cartão = motor + título curto. NUNCA preço nem crédito no cartão (o preço mora no botão de gerar de cada ferramenta);
//   · nada de marca de terceiro, rosto de celebridade ou personagem protegido;
//   · "Make one like this" só PREENCHE a ferramenta certa (parâmetros que ela já lê: /clips ?trend= ?effect= ?engine=
//     ?prompt=, /studio ?prompt= ?engine= ?script_mode=, /images ?engine=). Nada é gerado nem cobrado sem o clique da pessoa
//     em Gerar. O /images ainda NÃO lê ?prompt= (ImagesClient é fonte congelada pelo guardião test-ux-complete): a imagem abre
//     no motor certo (Nano Banana Pro) e a pessoa escreve a ideia — ligar o ?prompt= lá é uma entrega separada.

export const GALERIA_MARK = 'KINEO-GALERIA-HOME-2710'

/** Item do menu do topo (pedido do fundador: "Made with Kineo", nome exato — não passa pela tradução). */
export const MADE_WITH_KINEO_HREF = '/made-with-kineo'
export const MADE_WITH_KINEO_LABEL = 'Made with Kineo'
/** Id do nav_item_clicked (lib/navTelemetry aceita "more:<id>"; é o mesmo que navItemIdFor('/made-with-kineo') devolve). */
export const MADE_WITH_KINEO_NAV_ITEM = 'more:made-with-kineo'

/** Evento do clique num cartão da galeria (metadata fechada: kind, id, surface). */
export const GALERIA_CLICK_EVENT = 'home_galeria_clicked' as const

export type GaleriaKind = 'clip' | 'image' | 'film'
export type GaleriaFilter = 'all' | GaleriaKind
export const GALERIA_FILTERS: readonly { key: GaleriaFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'clip', label: 'Clips' },
  { key: 'image', label: 'Images' },
  { key: 'film', label: 'Films' },
]

/** Quantos cartões a página mostra de cara e a cada "See more" (20 fecha fileiras de 5, 4 e 2 colunas). */
export const GALERIA_PAGE_SIZE = 20

/** O ritmo do "All": 2 clipes, 1 imagem, 1 filme, repetindo (o feed misto do Explore). Tipo esgotado = pula. */
export const GALERIA_MIX: readonly GaleriaKind[] = ['clip', 'clip', 'image', 'film']

/** Fora da galeria, sempre (fundador 27/10: o clipe do cachorro com celular saiu com defeito). */
export const GALERIA_EXCLUDED: readonly string[] = ['dog_phone']

const N = ' No text, no logos, no watermark.'

/** Os 8 clipes de tendência de 27/10 (Kling 3, 5 s, 9:16, conta do fundador). Prompt = o da tabela `clips`, palavra por palavra. */
// KINEO-ROSTO-NO-CLIPE-2810 — `person: true` = o clipe mostra uma pessoa e ganha o botão "Put your face in it" (lib/clips/faceRemix.ts);
// KINEO-ROSTO-NO-CLIPE-2810 — `faceScene` = a cena reescrita para a pessoa da foto (sem ela, o remix usa o próprio prompt). Clipe novo com
// KINEO-ROSTO-NO-CLIPE-2810 — `person: true` ganha o botão sozinho, sem código novo.
export const GALERIA_NEW_CLIPS: readonly { id: string; title: string; engine: 'hollywood'; prompt: string; video: string; poster: string; person?: boolean; faceScene?: string }[] = [ // KINEO-ROSTO-NO-CLIPE-2810
  { id: 'golden-ball', title: 'Golden Ball Dance', engine: 'hollywood', video: '/previews/galeria/golden-ball.mp4', poster: '/posters/galeria/golden-ball.webp', person: true, faceScene: 'Backstage of a glamorous awards gala in a theatre with red velvet curtains and warm stage lights: the person from the photo, in a plain black tuxedo and bow tie, holds a shiny golden ball trophy in one hand and does a fun viral dance, swinging the hips and pointing down, while two friends behind copy the same dance moves, everyone laughing, glossy black floor reflecting the lights. Handheld phone video, realistic, joyful', prompt: 'Backstage of a glamorous awards gala in a theatre with red velvet curtains and warm stage lights: a confident man in a plain black tuxedo and bow tie holds a shiny golden ball trophy in one hand and does a fun viral dance, swinging his hips and pointing down, while two friends behind him, one in plain pink pajamas and one in a plain solid blue t-shirt and plain shorts with plain white sneakers, copy the same dance moves, everyone laughing, glossy black floor reflecting the lights. Handheld phone video, realistic, joyful. No text, no logos, no brand marks, no stripes on clothes or shoes, no watermark.' }, // KINEO-ROSTO-NO-CLIPE-2810 — clipe fbaa8eb5 (Kling 3, 5 s, 9:16), prompt da tabela `clips` palavra por palavra
  { id: 'lion', title: 'Lion walks into the camera', engine: 'hollywood', video: '/previews/galeria/lion.mp4', poster: '/posters/galeria/lion.webp', prompt: "Wildlife documentary shot from a photographer's low camera in tall golden savanna grass at sunset: a huge male lion walks slowly straight toward the lens, stops inches away, sniffs the camera and its breath fogs the glass. Shallow depth of field, natural light, handheld micro-shake, ultra realistic." + N },
  { id: 'cake-kitten', title: 'The cake that becomes a kitten', engine: 'hollywood', video: '/previews/galeria/cake-kitten.mp4', poster: '/posters/galeria/cake-kitten.webp', prompt: 'Close-up on a bakery table: a knife slices a fluffy white frosted cake shaped like a cat, and the cake slowly comes alive, the frosting turning into soft white fur as a real fluffy kitten stretches, blinks and meows. Warm soft light, realistic, satisfying.' + N },
  { id: 'pebble-castle', title: 'Pebbles that build a castle', engine: 'hollywood', video: '/previews/galeria/pebble-castle.mp4', poster: '/posters/galeria/pebble-castle.webp', prompt: 'Top-down then rising camera on a beach: a small pile of pebbles on wet sand starts to shake and the stones fly upward, stacking and growing into a tall fairytale stone castle with towers and flags as waves crash around it. Golden hour, epic, realistic.' + N },
  { id: 'knight-cat', title: 'Knight cat', engine: 'hollywood', video: '/previews/galeria/knight-cat.mp4', poster: '/posters/galeria/knight-cat.webp', prompt: 'A fluffy grey cat in shining medieval knight armor with a tiny red cape rides a pony through a misty castle courtyard, raises a small sword and meows heroically. Epic cinematic lighting, realistic fur and metal.' + N },
  { id: 'werewolf', title: 'Werewolf under the full moon', engine: 'hollywood', video: '/previews/galeria/werewolf.mp4', poster: '/posters/galeria/werewolf.webp', prompt: 'Night street under a full moon, handheld phone camera: a young man in a hoodie stops under a flickering streetlight, his body convulses and he transforms into a huge snarling werewolf, fur bursting through his clothes, then howls at the moon. Realistic, cinematic horror, Halloween.' + N, person: true, faceScene: 'The person from the photo stands under a streetlight on a night street under a full moon and transforms into a huge werewolf, then howls. Realistic, cinematic horror, Halloween' }, // KINEO-ROSTO-NO-CLIPE-2810
  { id: 'capybara', title: 'Dancing capybara', engine: 'hollywood', video: '/previews/galeria/capybara.mp4', poster: '/posters/galeria/capybara.webp', prompt: 'A capybara stands on its hind legs in a sunny green park and does a joyful full-body dance, swinging its hips and arms, small ducks watching nearby. Realistic fur, playful, smooth motion.' + N },
  { id: 'wizard-cat', title: 'Wizard cat at the keyboard', engine: 'hollywood', video: '/previews/galeria/wizard-cat.mp4', poster: '/posters/galeria/wizard-cat.webp', prompt: 'A very chonky grey cat wearing a blue wizard hat sits at an office desk furiously typing on a keyboard with both paws, glowing magic sparks flying from the keys, monitor light on its face, coffee mug beside it. Funny, realistic, cozy office at night.' + N },
  { id: 'kungfu-cat', title: 'Kung fu cat', engine: 'hollywood', video: '/previews/galeria/kungfu-cat.mp4', poster: '/posters/galeria/kungfu-cat.webp', prompt: 'A chubby orange tabby cat wearing a tiny white martial arts uniform with a black belt performs a perfect slow-motion flying kick in a misty bamboo dojo, lands and bows. Cinematic, realistic fur, dramatic side light.' + N },
]

/** Os 3 clipes de texto do antigo card "Clips" (Seedance 1.5, conta do fundador; já em public/previews). Prompt curto descritivo. */
export const GALERIA_TEXT_CLIPS: readonly { id: string; title: string; engine: 'seedance'; prompt: string; video: string; poster: string; focus?: string }[] = [
  { id: 'storm', title: 'Storm at sea', engine: 'seedance', video: '/previews/promo-clips-storm.mp4', poster: '/posters/promo-clips-storm.webp', prompt: 'A giant dark wave curls and crashes in a violent storm at sea, lightning splitting the black clouds, white spray blowing in the wind. Cinematic, realistic, dramatic light.' + N, focus: '62% 50%' },
  { id: 'glacier', title: 'Glacier river', engine: 'seedance', video: '/previews/promo-clips-glacier.mp4', poster: '/posters/promo-clips-glacier.webp', prompt: 'A slow aerial shot following a turquoise glacier river carving through ice and black rock, mist rising, soft morning light. Cinematic, realistic, calm.' + N },
  { id: 'surf', title: 'Surfer on a wave', engine: 'seedance', video: '/previews/promo-clips-surf.mp4', poster: '/posters/promo-clips-surf.webp', prompt: 'A surfer carves along the face of a big glassy blue wave at sunrise, spray trailing behind the board, low camera on the water. Cinematic, realistic, smooth motion.' + N },
]

/** Clipes "Trending this week" do /clips (lib/clips/clipTrends.ts), por chave — "Make one like this" = /clips?trend=. */
export const GALERIA_TREND_KEYS: readonly string[] = ['pet_dance', 'toy_to_real_car', 'golden_dribble', 'fruit_babies', 'zoo_cctv']

/** Efeitos de foto do /clips com prévia real (lib/clips/clipEffects.ts), por chave — "Make one like this" = /clips?effect=. */
export const GALERIA_EFFECT_KEYS: readonly string[] = ['color_burst', 'secret_cake', 'melt', 'zoom_out_earth', 'product_360', 'storm_behind', 'wings', 'cinematic_slowmo', 'bring_to_life']

/** Fotos da galeria da home (components/home/HomeImageGallery.tsx), por arquivo, com título curto; só retrato (cartão 9:16).
 *  O "Make one like this" abre o /images no Nano Banana Pro (motor das fotos). */
export const GALERIA_IMAGES: readonly { file: string; title: string }[] = [
  { file: 'puddle.webp', title: 'Leap over a puddle' },
  { file: 'ad-01.webp', title: 'Perfume on volcanic stone' },
  { file: 'ad-02.webp', title: 'Sneaker over a splash' },
  { file: 'raincoat.webp', title: 'Yellow raincoat by the sea' },
  { file: 'ad-03.webp', title: 'Skincare on marble' },
  { file: 'clock-blue.webp', title: 'Pastel alarm clock' },
  { file: 'ad-04.webp', title: 'Coffee bag and espresso' },
  { file: 'coffee.webp', title: 'Cozy coffee shop' },
  { file: 'ad-05.webp', title: 'Smartwatch at golden hour' },
  { file: 'apple.webp', title: 'Red apple by the window' },
  { file: 'ad-06.webp', title: 'Lipstick on satin' },
  { file: 'boutique.webp', title: 'Sneaker boutique' },
  { file: 'ad-07.webp', title: 'Headphones on pastel blocks' },
  { file: 'sneaker-white.webp', title: 'Sneaker on a pedestal' },
  { file: 'ad-08.webp', title: 'Cold can on ice' },
  { file: 'cube.webp', title: 'Puzzle cube' },
  { file: 'ad-09.webp', title: 'Leather tote' },
  { file: 'coworking.webp', title: 'Sunny coworking office' },
  { file: 'ad-10.webp', title: 'Sunglasses on the sand' },
  { file: 'clock-brass.webp', title: 'Brass clock on a windowsill' },
  { file: 'toycar.webp', title: 'Red toy car' },
]
/** Selo das fotos (o mesmo da galeria da home: "Made with Kineo Images · Nano Banana"). */
export const GALERIA_IMAGE_ENGINE_LABEL = 'Nano Banana'

/** Filmes narrados da casa (lib/publicExamples.ts FOUNDER_SHOWCASE, dono confirmado), por id, na ordem desta galeria. */
export const GALERIA_FILM_IDS: readonly string[] = [
  '4b12925e-16e6-4b56-af5a-7047f9ae7a28', // Storm over Lake Maracaibo (Kling 3)
  'f3de57b0-3486-4400-ba72-c9390774d426', // The Dyatlov Pass incident
  'c1f80b50-1de6-4140-9ce4-b4cfbeb185c3', // The river that boils
  'b8c50f61-2843-41f3-a803-ac5a4bb509f5', // Pompeii: the wrong day
  '16742e11-a2fc-4e0a-a49a-2862e0ee36b0', // The man who jumped and vanished (Veo 3.1)
  'c53789d3-a1af-46a7-a2c6-7114204316de', // Coastlines that glow electric blue
  '7efd12b8-925b-46d2-b68e-c6095cd3e92e', // The Navy ship that evaporated
  '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff', // The lake that turns animals to stone
  'b1b69c57-0ed7-4ecf-a4fa-dbd4508fa451', // Krakatoa, 1883
  '83db8b63-b654-491e-a0aa-86ce1bc1f3d7', // The Lituya Bay megatsunami
  'fbc5d391-316f-4757-aa54-0565f698cb9f', // Dinner still warm, everyone gone
  'a09706da-a79f-4029-b213-69f43d6a2775', // What Easter Island was hiding
  '397fa32a-2f35-4e09-950c-9f7d00e23c50', // The boat found drifting, 1955
  'ad6cb185-a0a2-46cf-a148-ea7503dfe6d3', // Something spreading across the Gulf
  'cbd676d0-340a-4728-8a5f-439fd9dd64c5', // The ghost ship Mary Celeste
  '99818ab0-0960-4089-a784-12b241736868', // Tunguska from above
]

/** Um cartão pronto para a tela (o que a página manda ao componente do navegador). */
export interface GaleriaItem {
  id: string
  kind: GaleriaKind
  title: string
  /** Selo honesto: o motor/produto real que fez a mídia. */
  engine: string
  /** Prévia 9:16 em laço (clipes e filmes) — null nas imagens. */
  video: string | null
  /** Pôster do vídeo ou a própria imagem. */
  poster: string
  /** "Make one like this": a ferramenta certa já preenchida. */
  href: string
  /** Que parte da mídia aparece no cartão 9:16 (object-position) — só para mídia horizontal. */
  focus?: string
  /** KINEO-ROSTO-NO-CLIPE-2810 — "Put your face in it": /clips?remix=<id> (só nos clipes de pessoa; ausente = sem botão). */
  faceHref?: string // KINEO-ROSTO-NO-CLIPE-2810
}

// ─── destinos do "Make one like this" (só parâmetros que as ferramentas já leem) ─────────────────────────────────────────
const UTM = 'made_with_kineo'
const qs = (o: Record<string, string>) => new URLSearchParams(o).toString()
/** Visitante passa pelo cadastro e volta para a ferramenta preenchida (mesmo formato do /trending e das páginas de efeito). */
export function viaSignup(target: string, signedIn: boolean): string {
  return signedIn ? target : '/signup?' + qs({ redirect: target })
}
/** Clipe por texto → /clips com motor e ideia (?engine= já existia; ?prompt= entra com esta galeria e só preenche). */
export function galeriaClipPromptHref(engine: string, prompt: string, signedIn: boolean): string {
  return viaSignup('/clips?' + qs({ engine, prompt, utm_source: UTM }), signedIn)
}
/** Clipe da vitrine "Trending this week" → /clips?trend= (o mesmo da home). */
export function galeriaClipTrendHref(key: string, signedIn: boolean): string {
  return viaSignup('/clips?' + qs({ trend: key, utm_source: UTM }), signedIn)
}
/** Efeito de foto → /clips?effect= (o mesmo das páginas de efeito e do /trending). */
export function galeriaClipEffectHref(key: string, signedIn: boolean): string {
  return viaSignup('/clips?' + qs({ effect: key, utm_source: UTM }), signedIn)
}
/** Imagem → /images já no motor que fez a foto (?engine= é o que o ImagesClient lê hoje; ver nota do topo sobre ?prompt=). */
export function galeriaImageHref(signedIn: boolean): string {
  return viaSignup('/images?' + qs({ engine: 'nanobanana', utm_source: UTM }), signedIn)
}
/** Filme → Studio com a ideia (o título) e o motor que fez o filme, se ainda estiver na oferta; a IA estrutura o roteiro. */
export function galeriaFilmHref(title: string, studioEngine: string | null): string {
  return '/studio?' + qs({ prompt: title, ...(studioEngine ? { engine: studioEngine } : {}), script_mode: 'ai', intent_campaign: UTM })
}

/** O texto que ?prompt= pode preencher (clipes e imagens): aparado, sem controle, no teto do campo; vazio = nada. */
export function galeriaPromptFromUrl(raw: string | null | undefined, max = 1000): string | null {
  if (typeof raw !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const clean = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
  return clean.length >= 3 ? clean : null
}

/** Intercala os tipos no ritmo GALERIA_MIX (tipo esgotado = pula); tira os excluídos. */
export function galeriaMix(byKind: Readonly<Record<GaleriaKind, readonly GaleriaItem[]>>): GaleriaItem[] {
  const queues: Record<GaleriaKind, GaleriaItem[]> = {
    clip: byKind.clip.filter((i) => !GALERIA_EXCLUDED.includes(i.id)),
    image: byKind.image.filter((i) => !GALERIA_EXCLUDED.includes(i.id)),
    film: byKind.film.filter((i) => !GALERIA_EXCLUDED.includes(i.id)),
  }
  const out: GaleriaItem[] = []
  let step = 0
  while (queues.clip.length + queues.image.length + queues.film.length > 0) {
    const next = queues[GALERIA_MIX[step % GALERIA_MIX.length]].shift()
    if (next) out.push(next)
    step++
  }
  return out
}

/** O filtro da página: "all" = a ordem misturada; um tipo = só ele, na mesma ordem. */
export function galeriaFiltered(items: readonly GaleriaItem[], filter: GaleriaFilter): GaleriaItem[] {
  return filter === 'all' ? [...items] : items.filter((i) => i.kind === filter)
}
