// KINEO-SCENE-STYLE-2026-09-09 — ESTILO TRAVADO, FECHO SEM REPETIÇÃO, TEXTO SEM LETRA ERRADA.
//
// Três defeitos vistos quadro a quadro no relatório dos motores de 09/09:
//   1. Seedance (77%): "cantiga de ninar 3D" saiu trem de brinquedo 3D na cena 1
//      e savana fotorreal da cena 2 em diante — cada cena num estilo, porque o
//      prompt clássico força "photorealistic, documentary" em toda cena e o
//      pedido de animação só sobrevivia onde o GPT o repetia.
//   2. Seedance/Kling 3: a cena de FECHO repetia a de abertura (o avião de 1953,
//      o apresentador do Cyclops) — o closer reaproveita o visual da cena 1.
//   3. Veo/Kling 2.5 (84–88%): quando a cena pede um objeto com texto (bilhete,
//      jornal, tela de celular), o motor escreve letras erradas ("Dan Copper",
//      app "SenaAyte"). Não dá para pedir texto certo; dá para pedir ilegível.
//
// Módulo PURO (sem imports): o guardião executa em sandbox. Toda função é
// determinística — mesmo roteiro, mesmo resultado, para o retry ficar estável.

export type StyleLook = 'photoreal' | 'animated3d' | 'anime' | 'illustration' | 'noir'

export interface StyleAnchor {
  look: StyleLook
  /** Vai no FIM de cada prompt de cena. */
  suffix: string
  /** O fragmento que substitui "photorealistic, ultra-detailed" quando o look não é fotorreal. */
  lookPhrase: string
}

const LOOKS: Record<StyleLook, { phrase: string; lock: string }> = {
  photoreal: {
    phrase: 'photorealistic, ultra-detailed',
    lock: 'same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain',
  },
  animated3d: {
    phrase: 'stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic',
    lock: 'same 3D animated art style in every scene, same character design and palette, consistent lighting, never mix with live-action or photorealism',
  },
  anime: {
    phrase: 'hand-drawn anime style, clean line art, cel shading, not photorealistic',
    lock: 'same anime art style in every scene, same line weight and palette, never mix with live-action or photorealism',
  },
  illustration: {
    phrase: 'storybook illustration style, painterly, soft edges, not photorealistic',
    lock: 'same illustrated storybook style in every scene, same palette and brush texture, never mix with live-action or photorealism',
  },
  noir: {
    phrase: 'photorealistic, high-contrast black and white film noir, deep shadows',
    lock: 'same black and white noir look in every scene, consistent hard lighting and grain',
  },
}

const LOOK_RE: Array<[RegExp, StyleLook]> = [
  [/\banime\b|\bmanga\b|\bstudio ghibli\b/i, 'anime'],
  [/\b(3d|3-d)\s*(animated|animation|cartoon)\b|\bpixar\b|\bdisney[- ]style\b|\bcartoon\b|\bnursery rhyme\b|\bkids'? (song|cartoon)\b|\banimated (short|film|story|video)\b/i, 'animated3d'],
  [/\bstorybook\b|\bwatercolou?r\b|\billustrat(ed|ion)\b|\bpainterly\b|\bfairy ?tale\b|\bbedtime story\b/i, 'illustration'],
  [/\bfilm noir\b|\bblack and white\b|\bnoir\b/i, 'noir'],
]

/** Decide UMA vez por filme, a partir do roteiro inteiro (nunca por cena). */
export function deriveStyleAnchor(scriptAndVisuals: string, explicitStyleSuffix?: string): StyleAnchor {
  const t = (scriptAndVisuals || '').slice(0, 8000)
  let look: StyleLook = 'photoreal'
  for (const [re, l] of LOOK_RE) if (re.test(t)) { look = l; break }
  const base = LOOKS[look]
  // Estilo explícito do cliente (globalStyle) manda: entra depois da trava.
  const extra = explicitStyleSuffix && explicitStyleSuffix.trim() ? explicitStyleSuffix.trim().replace(/^,\s*/, '') : ''
  return { look, lookPhrase: base.phrase, suffix: `, ${base.lock}${extra ? `, ${extra}` : ''}` }
}

/** Aplica o look ao prompt clássico: troca o fragmento fotorreal quando o look não é fotorreal e cola a trava. */
export function applyStyleAnchor(prompt: string, anchor: StyleAnchor): string {
  let p = prompt
  if (anchor.look !== 'photoreal') {
    p = p.replace(/photorealistic,\s*ultra-detailed/gi, anchor.lookPhrase)
    // "documentary establishing shot" contradiz animação; vira "establishing shot".
    p = p.replace(/documentary establishing shot/gi, 'establishing shot')
  }
  return p + anchor.suffix
}

/** Objetos que carregam texto: o motor vai escrever letras, e vai errar. */
const TEXT_BEARING_RE =
  /\b(ticket|newspaper|headline|document|letter|note|diary|journal|page|book|manuscript|map|sign|signboard|billboard|poster|label|screen|phone|smartphone|monitor|laptop|tablet|receipt|passport|id card|license|banner|chalkboard|whiteboard|menu|envelope|stamp|logo|text|caption|subtitle|writing|handwriting)\b/i

/** Só quando a cena pede um objeto com texto; senão, string vazia (prompt byte a byte igual). */
export function textSafetySuffix(scenePrompt: string): string {
  if (!TEXT_BEARING_RE.test(scenePrompt || '')) return ''
  return ', any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers'
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * A cena de fecho não pode ser a de abertura de novo. Compara o visual da
 * ÚLTIMA cena com todas as anteriores (normalizado); se for igual ou quase
 * (mesmas primeiras 8 palavras), devolve o índice e a variação a acrescentar.
 */
export function closingSceneVariation(visuals: string[]): { index: number; suffix: string } | null {
  if (visuals.length < 3) return null
  const last = visuals.length - 1
  const lastN = norm(visuals[last])
  if (!lastN) return null
  const head = (s: string) => s.split(' ').slice(0, 8).join(' ')
  for (let i = 0; i < last; i++) {
    const n = norm(visuals[i])
    if (!n) continue
    if (n === lastN || (head(n).length >= 24 && head(n) === head(lastN))) {
      return { index: last, suffix: ', closing shot from a different angle and distance than the opening, wider framing, later time of day, slow pull-back' }
    }
  }
  return null
}
