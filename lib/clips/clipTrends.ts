// KINEO-EM-ALTA-2610 — vitrine "Em alta esta semana" na tela de Clipes (fundador 26/10: "pega os shorts que estão com trend…
// aquele do Golden que faz o drible… quero uma vitrine com algumas coisas dessas agora").
//
// Cada tendência é uma IDEIA PRONTA de clipe por texto (sem foto): o card mostra um clipe REAL feito com exatamente este
// prompt e este motor na conta da casa (selo honesto: "Made with Kling 3"), e o botão só PREENCHE motor, duração, formato
// e texto — nada é gerado nem cobrado sem a pessoa apertar "Gerar".
//
// Fonte das tendências (consultada em 26/10/2026): rankings públicos de modelos virais (cliptrend.ai/trending,
// makeviral.ai) e o vídeo real da cadela "MessiPaws" driblando (ESPN no TikTok). Fora de propósito: modelos com jogador,
// artista ou música reais (rosto e voz de terceiros).
//
// Fora após olhar os quadros (26/10): colchão de gelatina (pessoa em roupa íntima de pernas para cima — não serve em vitrine pública).
// Para trocar a vitrine: troque a lista; cada `preview` tem de apontar para um clipe feito com o `prompt` daquela linha.

export const CLIP_TRENDS_PUBLIC = true

export interface ClipTrend {
  key: string
  title: string
  sub: string
  engine: string
  seconds: number
  aspect: '9:16'
  prompt: string
  preview: { video: string; poster: string }
}

const N = ' No text, no logos, no watermark.'

export const CLIP_TRENDS: readonly ClipTrend[] = [
  {
    key: 'golden_dribble',
    title: 'Golden dribbles like a pro',
    sub: 'The dog soccer trend',
    engine: 'hollywood',
    seconds: 5,
    aspect: '9:16',
    prompt: 'A golden retriever dribbles a soccer ball on a sunny grass pitch like a pro footballer: quick paw touches, a fast spin move past an orange cone, then a joyful jumping celebration with the ball. Low tracking camera at dog height, shallow depth of field, a brief slow-motion moment on the spin, natural afternoon light, realistic fur and grass.' + N,
    preview: { video: '/previews/em-alta-golden_dribble.mp4', poster: '/posters/em-alta-golden_dribble.webp' },
  },
  {
    key: 'pet_dance',
    title: 'Pet dance',
    sub: 'Cats and dogs dancing',
    engine: 'hollywood',
    seconds: 5,
    aspect: '9:16',
    prompt: 'A fluffy orange cat stands on its hind legs and dances a catchy full-body viral dance in a cozy living room: hip sways, paw waves, a little spin, perfectly on beat, playful and adorable, realistic fur, soft daylight, static phone camera at eye level.' + N,
    preview: { video: '/previews/em-alta-pet_dance.mp4', poster: '/posters/em-alta-pet_dance.webp' },
  },
  {
    key: 'fruit_babies',
    title: 'Fruit babies',
    sub: 'Dancing fruit with baby faces',
    engine: 'hollywood',
    seconds: 5,
    aspect: '9:16',
    prompt: 'Tiny fruit babies dance together on a bright kitchen counter: a strawberry, a banana, a watermelon slice and a kiwi, each with a cute chubby baby face and little arms and legs, bouncing and spinning in sync, glossy realistic fruit texture, morning sunlight, macro lens, joyful.' + N,
    preview: { video: '/previews/em-alta-fruit_babies.mp4', poster: '/posters/em-alta-fruit_babies.webp' },
  },
  {
    key: 'toy_to_real_car',
    title: 'Toy car turns real',
    sub: 'Tiny toy to full-size car',
    engine: 'hollywood',
    seconds: 5,
    aspect: '9:16',
    prompt: 'A small red toy sports car sits on a wooden desk; the camera pushes in low and the toy smoothly grows into a real full-size red sports car parked on a city street at golden hour, one seamless continuous transformation, glossy paint reflections, cinematic. No text, no logos, no brand badges, no watermark.',
    preview: { video: '/previews/em-alta-toy_to_real_car.mp4', poster: '/posters/em-alta-toy_to_real_car.webp' },
  },
  {
    key: 'zoo_cctv',
    title: 'Night zoo camera',
    sub: 'Caught on security cam',
    engine: 'hollywood',
    seconds: 5,
    aspect: '9:16',
    prompt: 'Grainy black-and-white night-vision security camera footage of a zoo enclosure at night: a capybara suddenly stands up and starts break-dancing, spinning on its back while two other capybaras stare, slight fisheye, static wall-mounted camera, infrared glow in the animals eyes, funny and surreal.' + N,
    preview: { video: '/previews/em-alta-zoo_cctv.mp4', poster: '/posters/em-alta-zoo_cctv.webp' },
  },
]

/** Só as tendências cujo motor a conta pode usar POR TEXTO na duração da ideia; se o motor não servir, cai no 1º que serve. */
export function trendTarget<E extends { key: string; text: boolean; seconds: number[] }>(trend: ClipTrend, engines: readonly E[]): E | null {
  const fits = (e: E) => e.text && e.seconds.includes(trend.seconds)
  return engines.find((e) => e.key === trend.engine && fits(e)) ?? engines.find(fits) ?? null
}

export function clipTrendByKey(key: unknown): ClipTrend | null {
  return CLIP_TRENDS.find((t) => t.key === key) ?? null
}
