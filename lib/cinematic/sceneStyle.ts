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

// ═══ KINEO-APARENCIA-DO-PEDIDO-1311 — o interruptor e as regras de língua moram AQUI (este arquivo não tem import, e guardiões dependem disso);
// o porquê, o alcance e as outras peças: lib/cinematic/aparenciaDoPedido1311.ts. 'off' = byte a byte o de antes. ═══
export type ModoAparencia1311 = 'off' | 'internal' | 'all'
/** Interruptor. Reverter: 'off' devolve o comportamento de antes para todo mundo; 'internal' = só a casa nas peças por conta. */
export const KINEO_APARENCIA_DO_PEDIDO_1311: ModoAparencia1311 = 'all'
/** As regras de língua (sem conta: o look e o assunto do plano) valem só com 'all'. */
export const regrasDeLinguaLigadas = (modo: ModoAparencia1311 = KINEO_APARENCIA_DO_PEDIDO_1311): boolean => modo === 'all'
/** "в стиле пиксар", "стиль Пиксара", "як у Діснея": o mesmo pedido que "Pixar style" (o \b do JS não enxerga cirílico: substring). */
export const ESTILO_CIRILICO_1311 = /(пиксар|піксар|дисне[йяеюї]|дісне[йяю])/iu
const MARCA_DE_ESTILO_1311_RE = /^(?:pixar|disney|dreamworks|ghibli|illumination|aardman|пиксар\p{L}*|піксар\p{L}*|дисне\p{L}*|дісне\p{L}*)$/iu
/** A palavra é nome de estúdio de estilo ("Pixar", "Пиксар", "Disney")? Nesse caso ela fala do LOOK, nunca de quem aparece no plano. */
export const marcaDeEstilo = (palavra: string): boolean => MARCA_DE_ESTILO_1311_RE.test(String(palavra ?? '').trim())
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

// ═══ KINEO1-FILME-DESENHADO-2026-09-21 — o pedido de desenho vale nas 16 línguas da casa ═══
// Caso (21/09 16:56Z, jonathanschwapp, nota 65): "animation 3D colorée et joyeuse… maison en carton… facteur" em
// FRANCÊS. O regex do look era só inglês e exigia a ordem "3D animation": "animation 3D" não casava, o filme nasceu
// photoreal (negativo "cartoon, 3d render") e a narração saiu em espanhol. Lista ÚNICA para o look (aqui), o aviso do
// Studio (lib/growth/kineo1FitNotice) e o modo desenhado do Kineo 1 (generate-video-fast). Fronteira de palavra onde
// o alfabeto permite; nos alfabetos sem espaço fixo (hindi, árabe, urdu) a substring basta.
export const DRAWN_LOOK_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(3d|3-d)\s*(animated|animation|cartoon)\b|\b(animation|animated)\s*(3d|3-d)\b|\bpixar\b|\bdisney[- ]style\b|\bcartoons?\b|\bnursery rhyme\b|\bkids'? (song|cartoon)\b|\banimated (short|film|story|video|cartoon)\b/i,
  /\b(animated|animation|anime|manga|dreamworks|claymation|stop[- ]motion|2d animated|comic book style)\b/i,
  // Línguas com acento: fronteira por \p{L} (com a flag u) — o \b do JS não enxerga "é", "ã", "ç", "ó", "ü".
  /(?<![\p{L}])(desenho animado|desenhos animados|animação|animacao|estilo anime|estilo cartoon)(?![\p{L}])/iu, // pt
  /(?<![\p{L}])(dibujos animados|dibujo animado|animación|animacion|caricatura|estilo anime)(?![\p{L}])/iu, // es
  /(?<![\p{L}])(dessin animé|dessins animés|animation 3d|film d'animation|style anime)(?![\p{L}])/iu, // fr
  /(?<![\p{L}])(zeichentrick|zeichentrickfilm|animationsfilm|animiert)(?![\p{L}])/iu, // de
  /(?<![\p{L}])(cartone animato|cartoni animati|animazione)(?![\p{L}])/iu, // it
  /(?<![\p{L}])(tekenfilm|animatie)(?![\p{L}])/iu, // nl
  /(?<![\p{L}])(kreskówka|kreskówki|animacja)(?![\p{L}])/iu, // pl
  /(?<![\p{L}])(çizgi film|animasyon)(?![\p{L}])/iu, // tr
  /(мультфильм|мультик|анимация|аниме)/i, // ru
  /(мультфільм|анімація)/i, // uk
  /(كرتون|كارتون|رسوم متحركة|أنمي)/, // ar
  /(کارٹون|اینیمیشن)/, // ur
  /(कार्टून|एनिमेशन|एनीमेशन|एनिमेटेड)/, // hi
  /(?<![\p{L}])(kartun|animasi)(?![\p{L}])/iu, // id
  /(hoạt hình|phim hoạt hình)/i, // vi
  // KINEO-APARENCIA-DO-PEDIDO-1311 — "стиль пиксар" (leonardodevenshi59, 13/11): o filme saiu fotorreal e o gato virou desenho só no fim. Com 'off': fora.
  ...(regrasDeLinguaLigadas() ? [ESTILO_CIRILICO_1311] : []),
]
// ═══ KINEO-ROMANCE-ADULTO-2026-10-13 — menção NEGADA não pede o look ═══
// d.hein.0 (13/10, Seedance 1.5, romance de adultos): "no logo animation" casou `animation` e o filme inteiro saiu [KINEO-ROMANCE-ADULTO-2026-10-13]
// "stylized 3D animated film look" — com "young couple", rostos de criança num romance. A janela do negador ("no", [KINEO-ROMANCE-ADULTO-2026-10-13]
// "not", "non-", "without", "never", "avoid", "sem", "sin", "não", "sans", "ohne", "senza"…) vai até 4 palavras, para em [KINEO-ROMANCE-ADULTO-2026-10-13]
// pontuação e em "but/just/only/instead/rather/pure"; se ela contém palavra de estilo, sai do texto ANTES do teste do look. [KINEO-ROMANCE-ADULTO-2026-10-13]
// "no text, 3D animated film" e "not photorealistic but animated" seguem desenho. Texto sem negação: byte a byte igual. [KINEO-ROMANCE-ADULTO-2026-10-13]
const NEGADOR_DE_ESTILO = String.raw`(?:no|not|non|without|never|avoid|avoiding|zero|sem|sin|nunca|nao|não|sans|ohne|kein|keine|keinen|senza|nada\s+de|pas\s+de|ni)` // KINEO-ROMANCE-ADULTO-2026-10-13
const JANELA_NEGADA_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])${NEGADOR_DE_ESTILO}(?:[\s-]+(?!(?:but|just|only|instead|rather|pure|purely|then|yet|mas|pero|sino)(?![\p{L}\p{N}]))[\p{L}\p{N}'’]+){1,4}`, 'giu') // KINEO-ROMANCE-ADULTO-2026-10-13
/** O texto sem as janelas negadas que citam estilo ("no logo animation", "without cartoon"). [KINEO-ROMANCE-ADULTO-2026-10-13] */
export function semEstiloNegado(text: string | null | undefined): string { // KINEO-ROMANCE-ADULTO-2026-10-13
  const src = text ?? '' // KINEO-ROMANCE-ADULTO-2026-10-13
  return src.replace(JANELA_NEGADA_RE, (janela: string) => (ESTILO_NA_JANELA.some((re) => re.test(janela)) ? ' ' : janela)) // KINEO-ROMANCE-ADULTO-2026-10-13
} // KINEO-ROMANCE-ADULTO-2026-10-13
/** O texto pede desenho/animação (qualquer língua da casa)? */
export function looksLikeDrawnRequest(text: string | null | undefined): boolean {
  const t = semEstiloNegado(text).trim() // KINEO-ROMANCE-ADULTO-2026-10-13 — era (text ?? '').trim()
  if (!t) return false
  return DRAWN_LOOK_PATTERNS.some((re) => re.test(t))
}
const DRAWN_LOOK_RE = new RegExp(DRAWN_LOOK_PATTERNS.map((re) => re.source).join('|'), 'iu') // 'u': \p{L} nas fronteiras — \b não enxerga 'é', 'ã', 'ç' ("dessin animé" não casava)

const LOOK_RE: Array<[RegExp, StyleLook]> = [
  [/\banime\b|\bmanga\b|\bstudio ghibli\b|\bestilo anime\b|\bstyle anime\b|аниме|أنمي/i, 'anime'],
  [DRAWN_LOOK_RE, 'animated3d'],
  [/\bstorybook\b|\bwatercolou?r\b|\billustrat(ed|ion)\b|\bpainterly\b|\bfairy ?tale\b|\bbedtime story\b/i, 'illustration'],
  [/\bfilm noir\b|\bblack and white\b|\bnoir\b/i, 'noir'],
]
// KINEO-ROMANCE-ADULTO-2026-10-13 — o que conta como "palavra de estilo" dentro de uma janela negada: os mesmos padrões do look.
const ESTILO_NA_JANELA: RegExp[] = [...DRAWN_LOOK_PATTERNS, ...LOOK_RE.map(([re]) => re)] // KINEO-ROMANCE-ADULTO-2026-10-13
const ESTILO_DESENHADO: RegExp[] = LOOK_RE.filter(([, look]) => look !== 'noir').map(([re]) => re) // KINEO-ROMANCE-ADULTO-2026-10-13
/** [KINEO-ROMANCE-ADULTO-2026-10-13]
 * KINEO-ROMANCE-ADULTO-2026-10-13 — pedido romântico é SEMPRE fotorreal: desenho/anime/3D/ilustração com "casal" é onde
 * os motores desenham rosto de criança. Noir (fotorreal P&B) e fotorreal passam intactos (o mesmo objeto). O estilo [KINEO-ROMANCE-ADULTO-2026-10-13]
 * explícito do cliente fica na trava só se não pedir desenho. [KINEO-ROMANCE-ADULTO-2026-10-13]
 */ // KINEO-ROMANCE-ADULTO-2026-10-13
export function forcePhotorealAnchor(anchor: StyleAnchor, explicitStyleSuffix?: string): StyleAnchor { // KINEO-ROMANCE-ADULTO-2026-10-13
  if (anchor.look === 'photoreal' || anchor.look === 'noir') return anchor // KINEO-ROMANCE-ADULTO-2026-10-13
  const extra = explicitStyleSuffix && explicitStyleSuffix.trim() ? explicitStyleSuffix.trim().replace(/^,\s*/, '') : '' // KINEO-ROMANCE-ADULTO-2026-10-13
  const fica = extra && !ESTILO_DESENHADO.some((re) => re.test(semEstiloNegado(extra))) ? extra : '' // KINEO-ROMANCE-ADULTO-2026-10-13
  return { look: 'photoreal', lookPhrase: LOOKS.photoreal.phrase, suffix: `, ${LOOKS.photoreal.lock}${fica ? `, ${fica}` : ''}` } // KINEO-ROMANCE-ADULTO-2026-10-13
} // KINEO-ROMANCE-ADULTO-2026-10-13

/** Decide UMA vez por filme, a partir do roteiro inteiro (nunca por cena). */
export function deriveStyleAnchor(scriptAndVisuals: string, explicitStyleSuffix?: string): StyleAnchor {
  const t = semEstiloNegado((scriptAndVisuals || '').slice(0, 8000)) // KINEO-ROMANCE-ADULTO-2026-10-13 — "no logo animation" não pede animação
  const explicit = semEstiloNegado(explicitStyleSuffix || '') // KINEO-ROMANCE-ADULTO-2026-10-13
  let look: StyleLook = 'photoreal'
  // The client's explicit style must decide the look, not merely be appended
  // after a contradictory photoreal lock chosen from a planner's description.
  const matched = LOOK_RE.find(([re]) => re.test(explicit)) ?? LOOK_RE.find(([re]) => re.test(t))
  if (matched) look = matched[1]
  const base = LOOKS[look]
  // Estilo explícito do cliente (globalStyle) manda: entra depois da trava.
  const extra = explicitStyleSuffix && explicitStyleSuffix.trim() ? explicitStyleSuffix.trim().replace(/^,\s*/, '') : ''
  if (look === 'animated3d' && pedeTomEscuro(`${t}\n${explicit}`)) { // KINEO-3D-ESCURO-0911
    const extraEscuro = extra.replace(MOOD_ALEGRE_3D_G, ' ').split(',').map((s) => s.trim()).filter(Boolean) // KINEO-3D-ESCURO-0911
    return { look, lookPhrase: LOOK_3D_ESCURO, suffix: `, ${base.lock}, suspenseful, moody${extraEscuro.length ? `, ${extraEscuro.join(', ')}` : ''}` } // KINEO-3D-ESCURO-0911
  }
  return { look, lookPhrase: base.phrase, suffix: `, ${base.lock}${extra ? `, ${extra}` : ''}` }
}

// ═══ KINEO-3D-ESCURO-0911 — 3D de terror não é Pixar ═══
// CASO (sgtoxic481, 09/11 17:11, filme grátis, render 6b84079a): o cliente colou do ChatGPT "Genre: Psychological horror …
// Visual style: Dark, cinematic 3D animation. Consistent character and realistic environments." O look 3D tinha UM molde só —
// "soft rounded shapes, bright saturated colors" — e o plano ainda colava ", energetic". Saiu desenho alegre de olho grande
// num terror (nota 4). Agora: look 3D + pedido de tom escuro (terror/suspense/sombrio, nas línguas da casa; "dark" só colado a
// palavra de estilo, nunca "dark hair") ⇒ 3D cinematográfico de luz baixa, e o mood alegre do plano sai. Pedido infantil ou
// negado ("not scary") fica no molde de sempre, byte a byte. Fotorreal, anime, ilustração e noir: intocados.
const LOOK_3D_ESCURO = 'cinematic 3D animated film look, realistic environments, moody low-key lighting, deep shadows, muted desaturated colors, not photorealistic' // KINEO-3D-ESCURO-0911
const MOOD_ALEGRE_3D_G = /(?<![\p{L}\p{N}])(?:energetic|energizing|upbeat|cheerful|cheery|happy|joyful|joyous|playful|fun|lively|bubbly|peppy|uplifting|feel[- ]good|festive|bright)(?![\p{L}\p{N}])/giu // KINEO-3D-ESCURO-0911
const TOM_ESCURO_RE = new RegExp([ // KINEO-3D-ESCURO-0911
  String.raw`horror|creepy|scary|eerie|sinister|haunted|haunting|thriller|suspense|suspenseful|ominous|gloomy|gothic|terrifying|nightmarish|menacing|macabre|dread`,
  String.raw`terror|assustador|assustadora|sombrio|sombria|macabro|arrepiante|suspense|miedo|siniestro|siniestra|escalofriante|oscuro|oscura|tenebroso|tenebrosa`,
  String.raw`horreur|effrayant|angoissant|sombre|gruselig|unheimlich|orrore|inquietante`,
].map((g) => String.raw`(?<![\p{L}\p{N}])(?:${g})(?![\p{L}\p{N}])`).join('|'), 'giu') // KINEO-3D-ESCURO-0911
const DARK_DE_ESTILO_RE = /\bdark(?:er)?\b[\s,]*(?:and\s+)?(?:cinematic|moody|gritty|3d|animated|animation|style|tone|mood|atmosphere|look|aesthetic|fantasy)\b|\b(?:style|tone|mood|look|atmosphere|aesthetic)\s*[:=-]?\s*dark\b/i // KINEO-3D-ESCURO-0911
const PEDIDO_INFANTIL_RE = /(?<![\p{L}\p{N}])(?:kids?|children|child|toddlers?|nursery|lullaby|bedtime|preschool|infantil|criança|crianças|niños|niñas|enfants)(?![\p{L}\p{N}])/iu // KINEO-3D-ESCURO-0911
const NEGADOR_ANTES_RE = /(?:^|[\s,(])(?:no|not|never|without|non|sem|sin|não|nao|nada|nunca|pas|ohne|senza|zero)(?:\s+\S+){0,2}\s*$/i // KINEO-3D-ESCURO-0911
/** O texto do cliente pede um 3D de tom escuro (terror, suspense, sombrio)? Negado ("not scary") e pedido infantil não contam. */
export function pedeTomEscuro(texto: string | null | undefined): boolean { // KINEO-3D-ESCURO-0911
  const t = String(texto ?? '').slice(0, 8000) // KINEO-3D-ESCURO-0911
  if (!t.trim() || PEDIDO_INFANTIL_RE.test(t)) return false // KINEO-3D-ESCURO-0911
  if (DARK_DE_ESTILO_RE.test(t)) return true // KINEO-3D-ESCURO-0911
  for (const m of t.matchAll(TOM_ESCURO_RE)) { // KINEO-3D-ESCURO-0911
    const antes = t.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0).split(/[.!?;\n]/).pop() ?? '' // KINEO-3D-ESCURO-0911
    if (!NEGADOR_ANTES_RE.test(antes)) return true // KINEO-3D-ESCURO-0911
  } // KINEO-3D-ESCURO-0911
  return false // KINEO-3D-ESCURO-0911
} // KINEO-3D-ESCURO-0911

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

// ═══ KINEO-SEM-LETRAS-2026-09-21 — fundador (Veo, ep. 2 da série Atlantis/Cuba: "praticamente perfeito… só as letras
// dentro do vídeo, em latim ou russo"). Os modelos de vídeo não sabem escrever: todo objeto que carrega texto vira
// pseudo-cirílico. O pedido de texto vinha de NÓS — o livro de estado do filme de Atlantis gravou "digital map",
// "articles", "newspapers"; o de Cuba pede sonar, coordenadas, National Geographic. Três camadas, todas de prompt:
// (1) negative prompt clássico igual ao hollywood (visualPromptPolicy.classicVisualNegativePrompt);
// (2) sufixo INCONDICIONAL em toda cena clássica (o Seedance não tem negative prompt) + léxico maior aqui;
// (3) o diretor visual e o supervisor fala×imagem param de pedir objeto-com-texto como sujeito (NO_TEXT_OBJECT_DIRECTION).
/** Proibição curta que vai em TODA cena clássica (Seedance/Veo/Kling 2.5), com ou sem objeto de texto. */
export const NO_READABLE_TEXT_SUFFIX = ', no readable text, letters, numbers, labels or signage anywhere in the frame'
/** Regra para quem ESCREVE a cena (diretor visual, supervisor fala×imagem): texto vira textura, nunca sujeito. */
export const NO_TEXT_OBJECT_DIRECTION =
  'Never make a text-bearing object the subject of a shot (newspaper, headline, article, document, map with labels, sign, ' +
  'plaque, historical marker, inscription, engraved stone, placard, nameplate, tombstone, ' +
  'sonar or radar readout, chart, screen, phone display, coordinates): video models cannot write and produce garbled ' +
  'foreign letters. Show such things as texture or light instead — aged paper out of focus, glowing seabed terrain without ' +
  'labels, the glow of a screen on a face, a hand over a blurred page — and never describe words, numbers or captions inside the frame. ' +
  'When the narration states a name, a date or a fact, show the place, the person or the era it belongs to — never an object that ' +
  'mentions, reads, displays or commemorates it. ' +
  // KINEO-ESCRITOR-SEM-LEITURA-1111 [CEO 11/11, item 4] — o filme do El Niño pediu "weather station showing a high temperature reading",
  // "thermometer reading significantly above average" e "overlay graphics": a regra não falava de aparelho com valor nem de gráfico por cima.
  'Never ask a device to show a value: no reading, measurement, number, percentage, temperature, speed, score, time or calendar day ' +
  'on a thermometer, gauge, dial, meter, scale, clock, speedometer, calendar or weather station — show the device as a physical object ' +
  'with its face out of focus, or show the real thing it measures. Never add overlay graphics, infographics, data overlays, lists or on-screen labels.'

/** Objetos que carregam texto: o motor vai escrever letras, e vai errar. */
const TEXT_BEARING_RE =
  /\b(ticket|newspaper|headline|article|document|letter|note|diary|journal|page|book|manuscript|map|sign|signboard|billboard|poster|label|screen|phone|smartphone|monitor|laptop|tablet|receipt|passport|id card|license|banner|chalkboard|whiteboard|menu|envelope|stamp|logo|text|caption|subtitle|writing|handwriting|sonar|radar|chart|graph|diagram|display|dashboard|readout|coordinates|gauge|dial|keyboard|clock|calendar|scoreboard|ticker|magazine|report|archive|file|folder|photograph|blueprint|plaque|plaques|marker|inscription|inscribed|engraved|engraving|placard|nameplate|tombstone|gravestone|headstone|epitaph|memorial|scroll|parchment|mentioning|commemorat\w*)\b/i

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

// ═══ MODO HISTÓRIA (09/09, medido no render 2141336f "Benny") ═══════════════
// O prompt clássico é do documentário faceless: "empty scene, no people, no
// human faces, environment-first". Numa HISTÓRIA com personagem isso vira
// homem, cachorro e criança no lugar do coelho, e o coelho só aparece no fim.
// Aqui o personagem principal é extraído UMA vez do roteiro e repetido em toda
// cena, o look vai no INÍCIO do prompt (o modelo pesa o começo) e as cláusulas
// de "cena vazia" não entram.

const ANIMAL_RE = 'bunny|rabbit|bear|fox|mouse|dragon|robot|puppy|dog|kitten|cat|owl|turtle|train|car|elephant|lion|zebra|giraffe|penguin|duck|frog|monkey|tiger|wolf|deer|unicorn|dinosaur|whale|dolphin|bee|butterfly'
const CHARACTER_RES: RegExp[] = [
  // "Benny, the tiniest bunny"  ·  "Roland Pernicus, a rough old man"
  new RegExp('\\b([A-Z][a-z]{2,}(?:\\s+[A-Z][a-z]+)?),\\s+(?:the|a|an)\\s+([a-z][a-z\\s-]{2,40}?\\b(?:' + ANIMAL_RE + '|boy|girl|man|woman|knight|princess|prince|wizard|witch|robot|astronaut|pirate|explorer|farmer|kid|child))\\b'),
  // "a little bunny named Benny"
  new RegExp('\\b(?:a|an|the)\\s+([a-z][a-z\\s-]{2,30}?\\b(?:' + ANIMAL_RE + '|boy|girl|knight|princess|prince|wizard|witch|robot|astronaut|pirate|explorer))\\s+(?:named|called)\\s+([A-Z][a-z]{2,})\\b'),
  // sem nome: "a happy little train", "the brave fox"
  new RegExp('\\b(?:a|an|the)\\s+((?:happy|little|tiny|brave|clever|lonely|curious|small|big|old|young|friendly|shy|colou?rful)\\s+(?:[a-z]+\\s+)?(?:' + ANIMAL_RE + '))\\b', 'i'),
]

// ═══ KINEO-SEEDANCE-FICHA-2026-09-15 — a descrição que o AUTOR escreveu vence ═══
// Seedance 1.5, filme 58bc7022 (fundador, 15/09, nota 9,5 "mas mudou a idade do
// personagem"): o pedido dizia "Keep the same keeper throughout: a middle-aged man
// with a short gray beard, a dark yellow raincoat and a black knit cap" e NENHUM
// dos 7 prompts enviados carregou isso — os padrões abaixo só reconheciam
// "Benny, the tiniest bunny" e afins; o faroleiro virou null e cada cena
// reinventou o homem. Aqui a descrição explícita do autor ("Keep the same X
// throughout: …", "The protagonist is …", ou "a middle-aged man with …") é
// extraída PRIMEIRO e repetida em toda cena pelo buildStoryScenePrompt.
const EXPLICIT_CHARACTER_RES: RegExp[] = [
  // "Keep the same keeper throughout: a middle-aged man with …"
  /\bkeep the same ([a-z' -]{2,40}?)\s*(?:throughout|in every scene|across (?:all )?scenes|consistent)?\s*:\s*([^.]{12,220})/i,
  // "The protagonist is a 30-year-old woman with …" · "Main character: …"
  /\b(?:the )?(?:protagonist|main character|central character|hero|heroine|lead character|narrator character)\s+(?:is|:)\s*([^.]{12,220})/i,
  // "Character: a tall old sailor …" · "Personagem: …" · "Personaje: …"
  /\b(?:character|personagem principal|personagem|protagonista|personaje)\s*:\s*([^.]{12,220})/i,
  // descrição direta com idade/aparência: "a middle-aged man with a short gray beard, a dark yellow raincoat and a black knit cap"
  /\b((?:a|an)\s+(?:\d{1,2}[- ]year[- ]old|middle[- ]aged|young|old|elderly|teenage|tall|short|weathered|rugged)\s+(?:[a-z-]+\s+){0,2}?(?:man|woman|boy|girl|keeper|fisherman|fisherwoman|sailor|soldier|nurse|doctor|farmer|teacher|traveler|traveller|stranger|detective|scientist|pilot|captain|monk|priest|knight|witch|wizard|explorer|miner|climber|hunter|engineer)\b(?:\s+(?:with|in|wearing)\s+[^.]{6,160})?)/i,
]
const limpaDescricao = (s: string) => s.replace(/\s+/g, ' ').replace(/[\s,;:]+$/, '').replace(/\s+(?:and|e|y)$/i, '').trim()
/** A descrição explícita que o autor deu ao personagem principal, ou null. Determinístico. */
export function deriveExplicitCharacter(script: string): string | null {
  const t = (script || '').replace(/\s+/g, ' ').slice(0, 4000)
  for (const re of EXPLICIT_CHARACTER_RES) {
    const m = t.match(re)
    if (!m) continue
    // o 1º padrão captura o PAPEL que o autor usou ("keeper") e a descrição; os outros só a descrição
    const papel = m.length > 2 ? limpaDescricao(m[1]).replace(/^(?:the|a|an)\s+/i, '') : ''
    const desc = limpaDescricao(m[m.length - 1])
    const d = papel && !new RegExp(`\\b${papel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(desc) ? `the ${papel}, ${desc}` : desc
    // precisa descrever gente/aparência, não uma frase qualquer do pedido
    if (d.length >= 12 && /\b(?:man|woman|boy|girl|keeper|fisher|sailor|soldier|nurse|doctor|farmer|teacher|traveler|traveller|stranger|detective|scientist|pilot|captain|monk|priest|knight|witch|wizard|explorer|miner|climber|hunter|engineer|hair|beard|coat|jacket|cap|hat|scar|eyes|year)\b/i.test(d)) return d
  }
  return null
}

/** O personagem principal, como frase curta em inglês, ou null. Determinístico. */
export function deriveStoryCharacter(script: string): string | null {
  const explicito = deriveExplicitCharacter(script)
  if (explicito) return explicito
  const t = (script || '').replace(/\s+/g, ' ').slice(0, 4000)
  const m0 = t.match(CHARACTER_RES[0])
  if (m0) return `${m0[1]}, the ${m0[2].trim()}`
  const m1 = t.match(CHARACTER_RES[1])
  if (m1) return `${m1[2]}, a ${m1[1].trim()}`
  const m2 = t.match(CHARACTER_RES[2])
  if (m2) return `a ${m2[1].trim().toLowerCase()}`
  return null
}

/**
 * Prompt de cena para HISTÓRIA: look primeiro, cena, personagem fixo, moldura
 * 9:16 e a trava de consistência. Sem "no people / empty scene".
 */
// ═══ KINEO-SEEDANCE-FICHA-2026-09-15 (Board, 2ª rodada) — a ficha SÓ entra na cena
// em que o protagonista aparece. Colar o mesmo homem em toda cena não resolve
// idade trocada: cria o homem na paisagem e no lugar do segundo personagem.
const PAPEL_NA_FICHA_RE = /\b(man|woman|boy|girl|keeper|fisherman|fisherwoman|sailor|soldier|nurse|doctor|farmer|teacher|traveler|traveller|stranger|detective|scientist|pilot|captain|monk|priest|knight|witch|wizard|explorer|princess|prince|robot|astronaut|pirate|kid|child|bunny|rabbit|bear|fox|mouse|dragon|puppy|dog|kitten|cat|owl|turtle|train|car|elephant|lion|zebra|giraffe|penguin|duck|frog|monkey|tiger|wolf|deer|unicorn|dinosaur|whale|dolphin|bee|butterfly)\b/gi
// só palavras de IDADE/GERAÇÃO ou de outra pessoa; "small"/"little" são aparência ("a small scar") e não contam
const OUTRA_PESSOA_RE = /\b(older|elderly|old|young|younger|teen|teenage|child|kid|baby|second|another|other|stranger|crowd|villagers|soldiers|men|women|children|boys|girls)\b/i
/**
 * A cena mostra o PROTAGONISTA da ficha? Só pelo papel ("keeper", "woman", "bunny") ou
 * pelo nome ("Benny"); pronome não identifica ninguém. Uma cena que descreve OUTRA
 * pessoa com o mesmo papel ("the older woman", "a young man") não recebe a ficha.
 */
export function mentionsStoryCharacter(visual: string, character: string | null): boolean {
  const v = (visual || '').toLowerCase()
  const c = (character || '').toLowerCase()
  if (!v || !c) return false
  const nome = (character || '').match(/^([A-Z][a-z]{2,}(?: [A-Z][a-z]+)?),/)?.[1]
  if (nome && new RegExp(`\\b${nome.toLowerCase()}\\b`).test(v)) return true
  const papeis = [...new Set((c.match(PAPEL_NA_FICHA_RE) ?? []).map((w) => w.toLowerCase()))]
  if (papeis.length === 0) return false
  // "keeper" da ficha casa com "lighthouse keeper" da cena; "woman" com "the woman"
  for (const papel of papeis) {
    const re = new RegExp(`\\b(?:[a-z-]+\\s+){0,3}${papel}\\b`, 'i')
    const m = v.match(re)
    if (!m) continue
    // o trecho que qualifica o papel na cena (até 3 palavras antes) não pode descrever OUTRA pessoa
    const trecho = m[0]
    const qualifica = trecho.replace(new RegExp(`\\b${papel}\\b`), '').trim()
    const cSemIdade = c.replace(/\d+[- ]year[- ]old/g, '')
    if (OUTRA_PESSOA_RE.test(qualifica) && !OUTRA_PESSOA_RE.test(cSemIdade)) continue
    return true
  }
  return false
}

/** KINEO-COMENTARIO-NAO-E-CENA-1411 v2 — fora do comentário, alguém no quadro? ("An actor evoking Lincoln": o ator está lá; a ficha fica). */
const PESSOA_NO_PLANO_RE_1411 = /(?<![\p{L}])(?:man|men|woman|women|boy|boys|girl|girls|person|people|actor|actress|figure|figures|crowd|soldiers?|workers?|families|family|child|children|kid|kids|couple|he|she|they|him|his|her|their)(?![\p{L}])/iu
export function buildStoryScenePrompt(visual: string, anchor: StyleAnchor, character: string | null): string {
  let v = (visual || '').replace(/\s+/g, ' ').trim()
  // a descrição de cena não pode reintroduzir o look oposto
  if (anchor.look !== 'photoreal') v = v.replace(/\b(photorealistic|photo-realistic|live[- ]action|realistic footage|documentary)\b/gi, '').replace(/\s{2,}/g, ' ').trim()
  v = v.replace(/[\s,;:.]+$/, '')
  if (v.length < 3) v = 'establishing shot of the story world'
  const vQuem = character ? planoParaQuemEstaNoQuadro(v, [character.split(',')[0]], (t) => PESSOA_NO_PLANO_RE_1411.test(t) || mentionsStoryCharacter(t, character)) : v // KINEO-COMENTARIO-NAO-E-CENA-1411 v2 — "…hints at the mystery of Amelia Earhart's disappearance" não põe a ficha na ilha
  const who = character && mentionsStoryCharacter(vQuem, character) ? ` The same main character appears in this scene, consistent design: ${character}.` : ''
  return (
    `${anchor.lookPhrase}. ${v}.${who} ` +
    `9:16 vertical, subject framed in the upper two-thirds with the lower third clear for captions, ` +
    `smooth camera motion, no watermark, no logo` + NO_READABLE_TEXT_SUFFIX +
    anchor.suffix
  )
}
// ═══ KINEO-PARCEIRO-EYEBIBLE-2-1410 — ELENCO de vários papéis (lib/cinematic/elencoDaHistoria.ts deriva; aqui só se aplica) ═══ // KINEO-PARCEIRO-EYEBIBLE-2-1410
// A ficha de UM protagonista acima não cobre drama com três papéis que falam (Robert/EyeBible, 14/10: o capitão mudava de // KINEO-PARCEIRO-EYEBIBLE-2-1410
// rosto a cada cena). Cada papel entra SÓ na cena que o cita pelo nome do papel inteiro ("the captain", "the wounded // KINEO-PARCEIRO-EYEBIBLE-2-1410
// soldier"); o substantivo sozinho ("the soldier") só vale quando um papel só o usa. Plural ("soldiers") não é o papel. // KINEO-PARCEIRO-EYEBIBLE-2-1410
export interface PapelDoElenco { papel: string; ficha: string } // KINEO-PARCEIRO-EYEBIBLE-2-1410
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // KINEO-PARCEIRO-EYEBIBLE-2-1410
/** Os papéis do elenco que a descrição da cena cita, na ordem do elenco. */ // KINEO-PARCEIRO-EYEBIBLE-2-1410
export function papeisNaCena(visual: string, elenco: ReadonlyArray<PapelDoElenco> | null | undefined): PapelDoElenco[] { // KINEO-PARCEIRO-EYEBIBLE-2-1410
  const v = ` ${(visual || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ')} ` // KINEO-PARCEIRO-EYEBIBLE-2-1410
  const lista = elenco ?? [] // KINEO-PARCEIRO-EYEBIBLE-2-1410
  const nucleo = (p: PapelDoElenco) => p.papel.split(' ').pop() ?? p.papel // KINEO-PARCEIRO-EYEBIBLE-2-1410
  return lista.filter((p) => { // KINEO-PARCEIRO-EYEBIBLE-2-1410
    if (new RegExp(String.raw`(?<![\p{L}\p{N}])${escapaRe(p.papel)}(?![\p{L}\p{N}])`, 'u').test(v)) return true // KINEO-PARCEIRO-EYEBIBLE-2-1410 — "captains" não é "captain"; "captain's" é
    const n = nucleo(p) // KINEO-PARCEIRO-EYEBIBLE-2-1410
    if (n === p.papel || lista.filter((o) => nucleo(o) === n).length !== 1) return false // KINEO-PARCEIRO-EYEBIBLE-2-1410
    return new RegExp(String.raw`(?<![\p{L}\p{N}])the ${escapaRe(n)}(?![\p{L}\p{N}])`, 'u').test(v) // KINEO-PARCEIRO-EYEBIBLE-2-1410
  }) // KINEO-PARCEIRO-EYEBIBLE-2-1410
} // KINEO-PARCEIRO-EYEBIBLE-2-1410
/** Cola no prompt de HISTÓRIA a ficha de cada papel que a cena cita (antes da moldura); cena sem papel: o MESMO prompt. */ // KINEO-PARCEIRO-EYEBIBLE-2-1410
export function comElencoNaCena(prompt: string, visual: string, elenco: ReadonlyArray<PapelDoElenco> | null | undefined): string { // KINEO-PARCEIRO-EYEBIBLE-2-1410
  const naCena = papeisNaCena(visual, elenco) // KINEO-PARCEIRO-EYEBIBLE-2-1410
  if (naCena.length === 0) return prompt // KINEO-PARCEIRO-EYEBIBLE-2-1410
  const frase = ` Recurring characters, identical face, hair and costume in every scene where they appear: ${naCena.map((p) => `the ${p.papel} is ${p.ficha}`).join('; ')}.` // KINEO-PARCEIRO-EYEBIBLE-2-1410
  const ancora = prompt.indexOf(' 9:16 vertical, subject framed') // KINEO-PARCEIRO-EYEBIBLE-2-1410
  return ancora >= 0 ? prompt.slice(0, ancora) + frase + prompt.slice(ancora) : prompt + frase // KINEO-PARCEIRO-EYEBIBLE-2-1410
} // KINEO-PARCEIRO-EYEBIBLE-2-1410

// ═══ KINEO-COMENTARIO-NAO-E-CENA-1411 v2 [CEO 14/11 10:22, bloqueio do revisor independente] ══════════════════════════════════════════════
// O planejador fecha o plano com uma oração de comentário: "Aerial shot of Howland Island, … empty ocean, with a stillness that hints at the
// mystery of Amelia Earhart's disappearance". O nome (ou o "her") dentro dela punha a Amelia na ilha. A v1 cortava a oração INTEIRA até o fim
// da frase e levava junto quem está no quadro: "A parade in honor of the returning soldiers, who march past the crowd" saía "sem gente".
// v2 (a opção que a CEO preferiu): a regra só existe para o plano que seria SEM GENTE se não fosse o comentário. Se o plano, fora dos
// comentários, já mostra alguém (o desfile, a banda, "An actor evoking Lincoln"), nada muda. Se não mostra, dentro do comentário saem SÓ os
// nomes do elenco e os pronomes; gente comum ("veterans", "soldiers", "the crowd") fica e segue contando. Só a decisão de quem está no quadro:
// o texto que vai ao motor não muda. Mora aqui (módulo puro, sem import: guardiões antigos carregam a sceneStyle sozinha). Interruptor COMENTARIO_NAO_E_CENA_1411: 'off' = byte a byte o de antes.
export type ModoComentarioNaoECena = 'off' | 'all'
export const COMENTARIO_NAO_E_CENA_1411: ModoComentarioNaoECena = 'all'
export const comentarioNaoECenaLigado = (modo: ModoComentarioNaoECena = COMENTARIO_NAO_E_CENA_1411) => modo === 'all'
/** O gatilho do comentário e o resto da frase. "suggesting" e "representing" ficam fora: no corpus aparecem literais ("the fridge suggesting kale"). */
const COMENTARIO_RE = /(?<![\p{L}])(?:hint(?:s|ed|ing)?\s+at|symboli[sz](?:e|es|ed|ing)|evok(?:e|es|ed|ing)|reminiscent\s+of|in\s+hono(?:u)?r\s+of|a\s+tribute\s+to|allud(?:e|es|ed|ing)\s+to)(?![\p{L}])[^.!?]*/giu
const PRONOME_RE = /(?<![\p{L}])(?:he|him|his|himself|she|her|hers|herself|they|them|their|theirs)(?![\p{L}])/giu
const escapaComentario1411 = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O plano sem os comentários (para saber se, fora deles, alguém está no quadro). */
export function foraDoComentario(visual: string): string {
  return String(visual ?? '').replace(COMENTARIO_RE, '')
}

/**
 * O plano que decide QUEM está no quadro. Fora dos comentários alguém aparece (`mostraAlguem`)? O plano igual. Não aparece? Dentro de cada
 * comentário saem os nomes do elenco (o nome inteiro e cada palavra dele com maiúscula) e os pronomes. Desligado ou sem comentário: igual.
 */
export function planoParaQuemEstaNoQuadro(visual: string, nomes: readonly string[], mostraAlguem: (texto: string) => boolean): string {
  const v = String(visual ?? '')
  if (!comentarioNaoECenaLigado()) return v
  const fora = foraDoComentario(v)
  if (fora === v || mostraAlguem(fora)) return v
  const partes = [...new Set(nomes.flatMap((n) => { const s = String(n ?? '').replace(/^the\s+/iu, '').trim(); return s ? [s, ...s.split(/\s+/u).filter((w) => /^\p{Lu}/u.test(w) && w.length > 2)] : [] }))].sort((a, b) => b.length - a.length)
  const nomeRe = partes.length ? new RegExp(`(?<![\\p{L}])(?:${partes.map(escapaComentario1411).join('|')})(?:['’]s)?(?![\\p{L}])`, 'giu') : null
  return v.replace(COMENTARIO_RE, (c) => (nomeRe ? c.replace(nomeRe, '') : c).replace(PRONOME_RE, ''))
}
// ═══ fim KINEO-COMENTARIO-NAO-E-CENA-1411 v2 ═══
