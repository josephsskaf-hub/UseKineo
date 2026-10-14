// KINEO-CLIPE360-AMOSTRA-1410 — pedido de GIRO/360° no clipe livre com foto (fundador, 14/10, "tudo sim").
//
// Caso real (14/10): o Pedro (agência, prospecção de 13/10) escolheu o efeito "Produto 360°", saiu do /clips pela barra
// lateral e voltou — a escolha morava só na memória da tela e sumiu — e então escreveu "crie um vídeo do produto girando em
// 360° em cima de uma mesa preta". O pedido foi como clipe LIVRE no Seedance 1.5 a partir de UMA foto: a estátua mal se mexeu.
// Uma foto só não mostra a parte de trás do produto; o motor de vídeo a partir de foto não inventa um giro completo.
//
// O QUE ISTO FAZ: antes de gerar, a tela do /clips lê o texto. Se ele pede para girar (pt/en/es e vizinhas), mostra uma nota
// honesta e, se o efeito "Produto 360°" estiver na galeria DESTA conta (o servidor só manda efeito que a conta pode apertar),
// oferece a troca em 1 clique. Sem o efeito, a nota diz a verdade e sugere órbita lenta ou aproximação lenta. NUNCA bloqueia:
// o botão de gerar segue igual, e o pedido vai exatamente como foi escrito.
//
// MÓDULO PURO (nenhum import): a tela e o guardião (scripts/test-clipe360-amostra-1410.mjs) usam a MESMA função.

/** O efeito para onde a nota leva (lib/clips/clipEffects.ts). */
export const CLIP_ROTATE_EFFECT_KEY = 'product_360'

/** Onde a escolha de efeito do /clips sobrevive à ida e volta pela barra lateral (sessionStorage, só nesta aba). */
export const CLIP_EFFECT_MEMORY_KEY = 'kineo.clips.effect.v1'

// Palavras de giro em pt/en/es (e as formas vizinhas de it/fr), inteiras: "girafa", "spinach" e "rodapé" não contam.
// "360" vale sozinho (360°, 360º, 360 graus, 360-degree), mas não dentro de outro número nem "360p".
const ROTATE_WORDS = [
  // pt
  'girando', 'girar', 'gira', 'gire', 'giro', 'girada', 'girado', 'giratória', 'giratoria', 'giratório', 'giratorio',
  'rodando', 'rotacionando', 'rotacionar', 'rotação', 'rotacao', 'rotativo', 'rotativa',
  'dando voltas', 'dar uma volta', 'volta completa',
  // en
  'rotate', 'rotates', 'rotating', 'rotation', 'rotated', 'spin', 'spins', 'spinning', 'spun', 'turntable',
  'turn around', 'turns around', 'turning around', 'revolve', 'revolves', 'revolving',
  // es
  'rotar', 'rotando', 'rotación', 'rotacion', 'dando vueltas',
  'da la vuelta', 'vuelta completa', 'plataforma giratoria',
  // it/fr (vizinhas baratas). De fora de propósito: "rodar"/"tourner" (= filmar ou rodar o vídeo), "rota" (= caminho em pt).
  'pivoter', 'ruotare', 'ruotando', 'rotante',
]

function escapeRe(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const WORD_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:${ROTATE_WORDS.map(escapeRe).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}\\p{N}])`, 'iu')
const THREE_SIXTY_RE = /(?<![\d.,])360(?![\d])(?!\s*p\b)/i

/** O texto pede para girar o produto (360°, girar, rodar, rotate, spin, turntable, rotar…)? */
export function asksForRotation(text: unknown): boolean {
  if (typeof text !== 'string') return false
  const t = text.normalize('NFC')
  if (!t.trim()) return false
  return THREE_SIXTY_RE.test(t) || WORD_RE.test(t)
}

export type ClipRotateHint = null | { kind: 'switch'; effect: string } | { kind: 'orbit' }

/**
 * A nota do giro aparece? Só no clipe LIVRE (sem efeito escolhido), COM foto (é a foto única que não mostra o verso) e com
 * texto que pede giro. 'switch' = o efeito está na galeria desta conta (troca em 1 clique); 'orbit' = não está (a nota sugere
 * órbita lenta ou aproximação). null = nada aparece. Nunca decide se pode gerar: isso continua no canGenerate de sempre.
 */
export function clipRotateHint(input: { prompt: unknown; withPhoto: boolean; effectChosen: boolean; effectKeys: readonly string[] }): ClipRotateHint {
  if (input.effectChosen) return null
  if (input.withPhoto !== true) return null
  if (!asksForRotation(input.prompt)) return null
  return input.effectKeys.includes(CLIP_ROTATE_EFFECT_KEY) ? { kind: 'switch', effect: CLIP_ROTATE_EFFECT_KEY } : { kind: 'orbit' }
}

/**
 * Qual efeito volta para a tela ao abrir o /clips. ?effect= da URL vence; senão, o que a pessoa escolheu nesta aba
 * (sessionStorage). Só vale chave que a galeria DESTA conta trouxe — efeito sumido do catálogo não volta.
 */
export function restoredClipEffect(input: { fromUrl: string | null; remembered: string | null; effectKeys: readonly string[] }): string | null {
  if (input.fromUrl && input.effectKeys.includes(input.fromUrl)) return input.fromUrl
  if (input.remembered && input.effectKeys.includes(input.remembered)) return input.remembered
  return null
}
