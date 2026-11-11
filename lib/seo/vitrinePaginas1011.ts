// KINEO-VITRINE-PAGINAS-1011 [fundador 10/11: "filmes prontos da vitrine na página que o GPT cita. Vamos fazer esse"]
//
// POR QUE: em 90 dias, 13 de 17 pagantes pagaram na 1ª hora depois do cadastro e 10 de 17 sem ter feito filme nenhum — compram
// pelo que VEEM na página onde chegam. Páginas de motor/produto premium: 88 cadastros → 3 pagantes; páginas de "grátis": 510 → 0.
// ETAPA 1 (custo zero): cada página de pouso que vende ganha, logo abaixo da resposta direta, uma faixa com os MELHORES filmes que a
// casa JÁ tem daquele motor/produto. Nenhum render novo, nenhum arquivo novo em public/: só prévias e pôsteres que o site já serve.
//
// SELO HONESTO (regra da casa: badge do motor = motor real). Cada clipe abaixo diz QUAL motor o fez e ONDE o código registra isso
// (`registro`). Nenhum motor foi adivinhado: quem não tem motor registrado não entra. Cada página só aceita os motores que ela vende
// (PAGINAS[...].motores); o guardião scripts/test-vitrine-paginas-1011.mjs reprova clipe de motor alheio, prévia sem pôster, prévia
// pesada, e página-alvo sem faixa que não esteja na lista de compras da etapa 2 (COMPRAS_ETAPA2).
//
// Módulo PURO (sem import): a tela e o guardião leem o mesmo arquivo.

export type VitrineMotor = 'h3_turbo' | 'h3' | 'h3max' | 'kling3' | 'kling4' | 's25' | 'seedance15' | 'veo31' | 'recreate'

/** O nome que vai no selo (o mesmo nome que o site usa para o motor). */
export const VITRINE_MOTOR_LABEL: Readonly<Record<VitrineMotor, string>> = {
  h3_turbo: 'MiniMax H3 Turbo',
  h3: 'MiniMax H3',
  h3max: 'MiniMax H3 Max',
  kling3: 'Kling 3',
  kling4: 'Kling 4.0',
  s25: 'Seedance 2.5',
  seedance15: 'Seedance 1.5',
  veo31: 'Veo 3.1',
  recreate: 'Recreate catalog',
}

export interface VitrineClipe {
  id: string
  title: string
  /** MP4 leve, 9:16, sem som, já servido em public/previews. */
  src: string
  /** Pôster em public/posters: aparece antes de o vídeo carregar (e sem JS). */
  poster: string
  motor: VitrineMotor
  /** Onde o código registra o motor deste arquivo (auditoria do selo). */
  registro: string
}

const fs = (id: string, title: string, motor: VitrineMotor, registro: string): VitrineClipe =>
  ({ id, title, motor, registro, src: `/previews/ex-${id}.mp4`, poster: `/posters/ex-${id}.webp` })
const door = (id: string, title: string, motor: VitrineMotor): VitrineClipe =>
  ({ id: `door-${id}`, title, motor, registro: `lib/ui/homeTwoDoors.ts HOME_DOOR_FILM_TRIOS (door('${id}', …), motor conferido no banco 13/10)`, src: `/previews/door-${id}.mp4`, poster: `/posters/door-${id}.webp` })
const galeria = (id: string, title: string, motor: VitrineMotor, registro: string): VitrineClipe =>
  ({ id, title, motor, registro, src: `/previews/galeria/${id}.mp4`, poster: `/posters/galeria/${id}.webp` })
const cardHome = (id: string, title: string, motor: VitrineMotor, registro: string): VitrineClipe =>
  ({ id: `home-card-novo-${id}`, title, motor, registro, src: `/previews/home-card-novo-${id}.mp4`, poster: `/posters/home-card-novo-${id}.webp` })

const R_FOUNDER = (engine: string) => `lib/publicExamples.ts FOUNDER_SHOWCASE (engine: '${engine}')`
const R_H3_TURBO = "lib/clipesNos2Lugares.ts KINEO-CLIPES-E-CARDS-0511 (\"feitos no H3 Max Turbo\"; H3 Max Turbo = MiniMax H3 Turbo em lib/engineLabel.ts)"
const R_KLING4_FILME = 'lib/clipesNos2Lugares.ts KINEO-VITRINE-10-1011 (filme narrado do Studio, "Kling 4.0, 09/11/2026")'
const R_SHOWCASE = (badge: string) => `app/claude-connector/ShowcaseGrid.tsx SHOWCASE_GROUPS (badge '${badge}')`

/** O acervo usado nesta etapa: só arquivos com motor registrado no código. */
export const VITRINE_ACERVO = {
  // MiniMax H3 Turbo (o motor que o filme padrão vende desde 05/11): clipes de uma cena, não filmes narrados.
  petBarista: galeria('pet-barista', 'Dog barista', 'h3_turbo', R_H3_TURBO),
  adeus2026: galeria('adeus-2026', 'Goodbye 2026, hello 2027', 'h3_turbo', R_H3_TURBO),
  tenisRua: galeria('produto-tenis-rua', 'Sneaker at sunrise', 'h3_turbo', R_H3_TURBO),
  glowUp: galeria('glow-up', 'The glow-up reveal', 'h3_turbo', R_H3_TURBO),
  // Kling 3 (cinematic_hollywood).
  maracaibo: fs('4b12925e-16e6-4b56-af5a-7047f9ae7a28', 'Storm over Lake Maracaibo', 'kling3', R_FOUNDER('cinematic_hollywood')),
  krakatoa: fs('b1b69c57-0ed7-4ecf-a4fa-dbd4508fa451', 'Krakatoa, 1883: the loudest sound in history', 'kling3', R_FOUNDER('cinematic_hollywood')),
  rioQueFerve: fs('c1f80b50-1de6-4140-9ce4-b4cfbeb185c3', 'The river that boils', 'kling3', R_FOUNDER('cinematic_hollywood')),
  navioQueSumiu: fs('7efd12b8-925b-46d2-b68e-c6095cd3e92e', 'The Navy ship that evaporated', 'kling3', R_FOUNDER('cinematic_hollywood')),
  barco1955: fs('397fa32a-2f35-4e09-950c-9f7d00e23c50', 'The boat found drifting, 1955', 'kling3', R_FOUNDER('cinematic_hollywood')),
  roboSubmarino: door('07252598-1392-4226-b5d5-d02bd892d69b', 'The underwater robot', 'kling3'),
  // Kling 4.0: filmes narrados do Studio (09/11) e o lobisomem da vitrine do conector.
  maryCeleste: galeria('filme-mary-celeste', 'The ghost ship Mary Celeste', 'kling4', R_KLING4_FILME),
  anticitera: galeria('filme-anticitera', 'The 2,000-year-old computer', 'kling4', R_KLING4_FILME),
  portaDoInferno: galeria('filme-porta-do-inferno', 'The Door to Hell is fading', 'kling4', R_KLING4_FILME),
  lobisomem: { id: 'studio-kling4-werewolf-kid', title: 'The werewolf kid at the last door', motor: 'kling4', registro: R_SHOWCASE('Kling 4.0'), src: '/previews/studio-kling4-werewolf-kid.mp4', poster: '/posters/studio-kling4-werewolf-kid.webp' } as VitrineClipe,
  // MiniMax H3 (cinematic_h3).
  golfo: fs('ad6cb185-a0a2-46cf-a148-ea7503dfe6d3', 'Something spreading across the Gulf', 'h3', R_FOUNDER('cinematic_h3')),
  pompeia: fs('b8c50f61-2843-41f3-a803-ac5a4bb509f5', 'Pompeii: the wrong day', 'h3', R_FOUNDER('cinematic_h3')),
  lagoBermuda: fs('04189a48-45f7-45f4-b98c-27832702e837', 'The lake that makes Bermuda look gentle', 'h3', R_FOUNDER('cinematic_h3')),
  // Seedance 2.5 (cinematic_s25): um filme e o 1º clipe da casa.
  londres1952: door('909f9d36-45f2-42ed-8ffd-8062e933cc9c', "London's great smog, 1952", 's25'),
  farolS25: { id: 'fb1eeb41-48ca-4835-a93a-01d422a17aa4', title: 'Lighthouse in the storm', motor: 's25', registro: 'lib/clips/clipEngineShowcase.ts CLIP_ENGINE_SHOWCASE.s25 (fal-ai/seedance-2.5, 5 s)', src: '/previews/fb1eeb41-48ca-4835-a93a-01d422a17aa4.mp4', poster: '/posters/fb1eeb41-48ca-4835-a93a-01d422a17aa4.webp' } as VitrineClipe,
  // Seedance 1.5 (cinematic_ai até 05/11).
  castelo: { id: '90bd8367-60c6-4811-8fdd-3a5b0200eec6', title: 'The castle hiding inside a university building', motor: 'seedance15', registro: "lib/publicExamples.ts ENGINE_PAGE_LEAD (engine: 'cinematic_ai')", src: '/previews/ex-90bd8367-60c6-4811-8fdd-3a5b0200eec6.mp4', poster: '/posters/ex-90bd8367-60c6-4811-8fdd-3a5b0200eec6.webp' } as VitrineClipe,
  flannan: door('970d03e6-9b87-403f-bef7-810db80ba8ce', 'The Flannan Isles lighthouse', 'seedance15'),
  lituya: fs('83db8b63-b654-491e-a0aa-86ce1bc1f3d7', 'The Lituya Bay megatsunami', 'seedance15', R_FOUNDER('cinematic_ai')),
  // Veo 3.1 (fora da lista de motores desde 05/11; o filme mantém o selo do motor que o fez).
  titanic: door('d16781b8-0557-4c7e-b339-3bf048ff700c', 'Titanic', 'veo31'),
  // Recreate: os vídeos-base dos 2 formatos com swapApproved (lib/recreate/formats.ts). A prévia pública é a MESMA cena que a
  // home e o /made-with-kineo já servem (conferido quadro a quadro em 10/11 contra lib/recreate/assets/recreate-*.mp4).
  // É o vídeo ORIGINAL do catálogo, não um resultado de troca: o selo diz "Recreate catalog", nunca "your face".
  passarela: galeria('passarela', 'Runway walk', 'recreate', "lib/recreate/formats.ts (passarela, swapApproved: true) = lib/clipesNos2Lugares.ts 'passarela'"),
  favorito: galeria('escolha-o-favorito', 'Guess my favorite', 'recreate', "lib/recreate/formats.ts (escolha-o-favorito, swapApproved: true) = lib/clipesNos2Lugares.ts 'escolha-o-favorito'"),
  // Anúncios feitos no Kineo (clipes Kling 3 de 27/10 conferidos no banco). Os 6 de Natal ficam FORA: foram feitos à mão, fora do
  // produto (lib/clipesNos2Lugares.ts KINEO-ADS-NATAL-VITRINE-1011) — uma faixa "made on Kineo" mentiria a autoria.
  serum: cardHome('ugc_serum', 'Serum selfie review', 'kling3', R_SHOWCASE('Kling 3')),
  unboxing: cardHome('ugc_unboxing', 'Kitchen unboxing', 'kling3', R_SHOWCASE('Kling 3')),
  smartwatch: cardHome('smartwatch', 'Smartwatch builds itself in the air', 'kling3', R_SHOWCASE('Kling 3')),
  icedCoffee: cardHome('iced_coffee', 'Iced coffee in slow motion', 'kling3', R_SHOWCASE('Kling 3')),
  headphones: cardHome('headphones', 'Headphones, exploded view', 'kling3', R_SHOWCASE('Kling 3')),
} as const satisfies Record<string, VitrineClipe>

const A = VITRINE_ACERVO

/** As páginas-alvo (as que o ChatGPT cita e que vendem). Chave = caminho público. */
export type VitrinePagina = {
  /** Motores que a página vende: só eles podem aparecer na faixa. */
  motores: readonly VitrineMotor[]
  titulo: string
  linha: string
  clipes: readonly VitrineClipe[]
}

export const VITRINE_PAGINAS = {
  '/ai-video-generator': {
    motores: ['kling4', 'kling3', 'h3', 'h3_turbo', 's25', 'seedance15'],
    titulo: 'Made on Kineo',
    linha: 'Finished films from Kineo’s own account. Each badge names the engine that rendered the film.',
    clipes: [A.maryCeleste, A.maracaibo, A.pompeia, A.londres1952, A.castelo, A.petBarista],
  },
  // O endereço antigo do Seedance vende hoje o filme padrão no MiniMax H3 Turbo (H3_TURBO_PUBLIC). Só clipes H3 Turbo entram.
  '/ai-video-generator/seedance': {
    motores: ['h3_turbo'],
    titulo: 'Made with MiniMax H3 Turbo',
    linha: 'Single-scene clips from Kineo’s own account, rendered on MiniMax H3 Turbo, the engine that animates the scenes of this film.',
    clipes: [A.adeus2026, A.petBarista, A.tenisRua, A.glowUp],
  },
  // Se o interruptor H3_TURBO_PUBLIC desligar, a mesma URL volta a vender o Seedance 1.5: a faixa acompanha.
  '/ai-video-generator/seedance#seedance-1-5': {
    motores: ['seedance15'],
    titulo: 'Made with Seedance 1.5',
    linha: 'Finished narrated films from Kineo’s own account, rendered on Seedance 1.5.',
    clipes: [A.castelo, A.flannan, A.lituya],
  },
  '/ai-video-generator/kling-3': {
    motores: ['kling3'],
    titulo: 'Made with Kling 3',
    linha: 'Finished narrated films from Kineo’s own account, rendered on Kling 3.',
    clipes: [A.maracaibo, A.krakatoa, A.rioQueFerve, A.navioQueSumiu, A.barco1955],
  },
  '/ai-video-generator/kling-4': {
    motores: ['kling4'],
    titulo: 'Made with Kling 4.0',
    linha: 'Finished narrated films from Kineo’s own account, rendered on Kling 4.0.',
    clipes: [A.maryCeleste, A.anticitera, A.portaDoInferno, A.lobisomem],
  },
  '/ai-video-generator/minimax-h3': {
    motores: ['h3'],
    titulo: 'Made with MiniMax H3',
    linha: 'Finished narrated films from Kineo’s own account, rendered on MiniMax H3.',
    clipes: [A.pompeia, A.golfo, A.lagoBermuda],
  },
  // Nenhum render do H3 Max registrado no código: sem faixa até a etapa 2 (COMPRAS_ETAPA2).
  '/ai-video-generator/minimax-h3-max': {
    motores: ['h3max'],
    titulo: 'Made with MiniMax H3 Max',
    linha: 'Finished narrated films from Kineo’s own account, rendered on MiniMax H3 Max.',
    clipes: [],
  },
  '/ai-video-generator/seedance-2-5': {
    motores: ['s25'],
    titulo: 'Made with Seedance 2.5',
    linha: 'A finished film and a single clip from Kineo’s own account, both rendered on Seedance 2.5.',
    clipes: [A.londres1952, A.farolS25],
  },
  '/seedance-vs-veo-vs-kling': {
    motores: ['seedance15', 's25', 'veo31', 'kling3', 'kling4'],
    titulo: 'Made on Kineo: the engines on this page',
    linha: 'Finished films from Kineo’s own account. Each badge names the engine that rendered the film.',
    clipes: [A.flannan, A.londres1952, A.titanic, A.roboSubmarino, A.maryCeleste, A.castelo],
  },
  '/ai-face-swap-video': {
    motores: ['recreate'],
    titulo: 'The videos you can put your face in',
    linha: 'The original catalog videos, before any swap. You upload a front-facing photo and get the same video back with your face.',
    clipes: [A.passarela, A.favorito],
  },
  '/ai-ugc-ads': {
    motores: ['kling3'],
    titulo: 'Ads made on Kineo',
    linha: 'Product and UGC-style ads from Kineo’s own account, rendered on Kling 3.',
    clipes: [A.serum, A.unboxing, A.smartwatch, A.icedCoffee, A.headphones],
  },
  '/pricing': {
    motores: ['kling4', 'kling3', 'h3', 'h3_turbo', 's25'],
    titulo: 'What your credits make',
    linha: 'Finished films from Kineo’s own account. Each badge names the engine that rendered the film.',
    clipes: [A.portaDoInferno, A.krakatoa, A.lagoBermuda, A.adeus2026, A.anticitera, A.farolS25],
  },
} as const satisfies Record<string, VitrinePagina>

export type VitrinePaginaKey = keyof typeof VITRINE_PAGINAS

/** Páginas-alvo com a faixa PRONTA mas NÃO montada, e por quê. Montar exige a ordem do fundador (e soltar a trava citada). */
export const VITRINE_BLOQUEADAS: Readonly<Partial<Record<VitrinePaginaKey, string>>> = {
  '/pricing': 'Trava do fundador "/pricing intocado" (10/11): scripts/test-regiao-paga-1011.mjs exige app/pricing/PricingClient.tsx idêntico à origin/main e o retorno de app/pricing/page.tsx intacto. Lugar proposto: logo abaixo de <FilmsMadeProof surface="pricing" />, sob os planos.',
}

/** Mínimo de clipes para a faixa aparecer; abaixo disso a página fica sem faixa e entra na lista de compras. */
export const VITRINE_MIN_CLIPES = 2
/** Teto por prévia (bytes): a faixa é leve. As prévias HD de 7–11 MB (examples-hd-sep24) ficam fora. */
export const VITRINE_MAX_BYTES = 2_000_000

/** A faixa desta página, ou null quando o acervo do motor ainda não tem clipes suficientes. */
export function vitrineDaPagina(key: VitrinePaginaKey): VitrinePagina | null {
  const p = VITRINE_PAGINAS[key] as VitrinePagina
  return p.clipes.length >= VITRINE_MIN_CLIPES ? p : null
}

/** O selo de um clipe: sempre o motor registrado dele. */
export const vitrineSelo = (c: Pick<VitrineClipe, 'motor'>): string => VITRINE_MOTOR_LABEL[c.motor]

// ── ETAPA 2 (nada é gerado aqui) ────────────────────────────────────────────────────────────────────────────────────────────────
// Páginas que ficaram sem filme do próprio motor (ou com menos de 3) e o filme que falta. Custo em US$ do fornecedor pelas tabelas
// do código; onde o código não registra a taxa exata do motor, vale o teto registrado mais próximo (dito em `fonteCusto`).
// Temas: mistério e história reais (naufrágio, desaparecimento, catástrofe natural) — a família dos filmes que a casa mais vendeu e
// que o fundador aprovou (Mary Celeste, Lituya, Maracaibo, Krakatoa).
export interface CompraEtapa2 { pagina: VitrinePaginaKey; motor: VitrineMotor; quantidade: number; segundos: number; tema: string; usdCada: number; fonteCusto: string }
export const COMPRAS_ETAPA2: readonly CompraEtapa2[] = [
  { pagina: '/ai-video-generator/seedance', motor: 'h3_turbo', quantidade: 3, segundos: 60, tema: 'Flight 19 · The Dyatlov Pass incident · The Flannan Isles lighthouse keepers', usdCada: 5.2,
    fonteCusto: 'teto: H3 Max a US$ 0,08/s, filme de 65 s ≈ US$ 5,20 (lib/credits/engineCost.ts, cinematic_h3max); a taxa do H3 Max Turbo não está no código (filme padrão registrado: US$ 3,30 em lib/clips/clipPricing.ts)' },
  { pagina: '/ai-video-generator/minimax-h3-max', motor: 'h3max', quantidade: 2, segundos: 60, tema: 'The lost Roanoke colony · The Tunguska fireball', usdCada: 5.2,
    fonteCusto: 'lib/credits/engineCost.ts cinematic_h3max: US$ 0,08/s, filme de 65 s ≈ US$ 5,20' },
  { pagina: '/ai-video-generator/seedance-2-5', motor: 's25', quantidade: 1, segundos: 60, tema: 'The Lake Nyos night (1986)', usdCada: 13.7,
    fonteCusto: 'lib/clips/clipPricing.ts CLIP_COSTS.s25.filmFalUsd = US$ 13,70 (60 s)' },
  { pagina: '/ai-face-swap-video', motor: 'recreate', quantidade: 1, segundos: 10, tema: 'Runway walk com o rosto do fundador (foto dele, consentida)', usdCada: 3.0,
    fonteCusto: 'lib/recreate/generation.ts RECREATE_USD_PER_SECOND = 0,30 × 10 s' },
  { pagina: '/ai-face-swap-video', motor: 'recreate', quantidade: 1, segundos: 8, tema: 'Guess my favorite com o rosto do fundador e de uma 2ª pessoa que consentiu', usdCada: 2.4,
    fonteCusto: 'lib/recreate/generation.ts RECREATE_USD_PER_SECOND = 0,30 × 8 s' },
]
export const COMPRAS_TETO_USD = 55
export const comprasTotalUsd = (): number => Math.round(COMPRAS_ETAPA2.reduce((s, c) => s + c.quantidade * c.usdCada, 0) * 100) / 100
