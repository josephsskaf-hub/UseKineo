// One visual contract for the classic clip, its still and its safe fallback.
// Pure/deterministic: no provider calls, narration rewriting or new model cost.
import { aspectSpec } from '../aspect'
import { applyStyleAnchor, buildStoryScenePrompt, textSafetySuffix, NO_READABLE_TEXT_SUFFIX, type StyleAnchor } from './sceneStyle'
import { comElencoNaCena, type PapelDoElenco } from './sceneStyle' // KINEO-PARCEIRO-EYEBIBLE-2-1410
import type { VisualMode } from './visualMode'

export interface VisualPromptPolicy {
  mode: VisualMode
  style: StyleAnchor
  character?: string | null
  /** KINEO-PARCEIRO-EYEBIBLE-2-1410 — o elenco fixo dos papéis que falam (drama com vários personagens); ausente = como sempre. */ // KINEO-PARCEIRO-EYEBIBLE-2-1410
  elenco?: ReadonlyArray<PapelDoElenco> | null // KINEO-PARCEIRO-EYEBIBLE-2-1410
  aspect?: string | null
  eraSuffix?: string
  opening?: boolean
}

// Preserve the classic faceless identity guard. Story/presenter requests do not
// run through it: deleting the requested protagonist contradicted those modes.
const PERSON_NOUN_RE = /\b(?:(?:a|an|the)\s+)?(?:(?:random|generic|young|old|asian|white|black|european|american|middle[-\s]?aged)\s+)*(?:businessman|businesswoman|man|woman|men|women|person|persons|people|guy|guys|boy|boys|girl|girls|lady|ladies|gentleman|ceo|entrepreneur|trader|crowd|family|child|children|kid|kids|student|students)s?\b/gi
const NAMED_TITLE_RE = /\b(?:[Ee]mperor|[Gg]eneral|[Mm]arshal|[Kk]ing|[Qq]ueen|[Tt]sar|[Cc]zar|[Pp]resident|[Cc]ommander|[Cc]olonel|[Aa]dmiral|[Cc]aptain|[Dd]uke|[Ll]ord|[Ss]ir|[Kk]aiser|[Pp]haraoh)\s+[A-Z][\w'-]+/g
const NAMED_FIGURE_RE = /\b(?:napoleon(?:\s+bonaparte)?|bonaparte|wellington|hitler|stalin|churchill|caesar|cleopatra|genghis\s+khan|alexander\s+the\s+great|abraham\s+lincoln|george\s+washington|joan\s+of\s+arc)\b/gi

export function isStylizedLook(style: StyleAnchor): boolean {
  return style.look === 'animated3d' || style.look === 'anime' || style.look === 'illustration'
}

/** No blanket people ban: faceless means no foreground face or presenter. */
export function classicVisualNegativePrompt(mode: VisualMode, stylized: boolean): string {
  const format = mode === 'presenter' ? ''
    : mode === 'character_story' ? 'talking head, looking directly into the camera, '
      : 'foreground human face, close-up portrait, talking head, presenter, '
  const look = stylized ? '' : 'cartoon, anime, illustration, 3d render, '
  // KINEO-SEM-LETRAS-2026-09-21 — a estrada clássica mandava só 'text, logo, caption'; a hollywood já proibia
  // placas/legendas/alfabeto estrangeiro. Mesma lista nas duas (Veo, Kling 2.5 t2v e i2v recebem negative_prompt).
  return format + look + 'blur, distort, low quality, watermark, text, logo, caption, on-screen text, readable signs, subtitles, captions, letters, numbers, labels, foreign text, chinese text, cyrillic text, phone screen with text, newspaper headline, map labels, plaque, inscription, engraved lettering'
}

/** Remove stale hard-coded orientation instructions, not the scene content. */
export function applyVisualFraming(prompt: string, aspect?: string | null): string {
  const frame = aspectSpec(aspect)
  return prompt
    .replace(/(?:\b(?:vertical|widescreen|square|portrait|landscape)\s+)*\b(?:9:16|16:9|1:1|4:5)(?:\s+(?:vertical|widescreen|square|portrait|landscape|cinematic|framing|composition))*/gi, frame.promptFraming)
}

// KINEO-CENAS-FIEIS-2610 — direção da chamada que já existe, antes de still/vídeo.
// A variedade da câmera nunca autoriza trocar o elenco ou inventar um evento.
export const SCENE_FIDELITY_DIRECTION =
  'SCENE FIDELITY (takes priority over camera variety): the customer request fixes the cast, objects, relationships, setting and event order; each scene\'s own spoken line fixes its action and current state. ' +
  'Keep every specified subject distinct: same number, species, identity, size, clothing, colors and named accessories across shots, changing only when the story says so. Never merge two characters into one or add an unrequested presenter, bystander, animal, vehicle, weapon or decorative prop. ' +
  'Show the requested action happening, with its participants and target readable: a fight requires a concrete strike, block or dodge, not a portrait, heroic pose, static face-off or unrelated aftermath. Use one clear action beat per shot in the requested sequence; do not invent combat or damage for a scene that does not ask for it. ' +
  'Carry established states forward until the spoken story changes them; the final shot must retain the final stated state. For a state change, seed the shot in the resulting state rather than relying on an unfinished transformation. ' +
  'Reusing the same subjects is correct when their action advances. Vary framing and camera distance around those subjects, never replace them to create variety. If an input leaves a detail unknown, keep it unspecified; do not import objects or facts from examples or another scene. These are directing rules, not words or objects to depict.'

// KINEO-ELENCO-EPOCA-2710 [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"] — o pedido ao escritor de cenas e ao descritor: elenco nomeado em cena, época nas roupas/carros, nome inventado não se traduz. // KINEO-ELENCO-EPOCA-2710
// A garantia em código (quem não apareceu entra; 1953 ganha figurino; geleia ≠ jellyfish) é lib/cinematic/elencoEpoca.ts, na rota, depois do último toque no prompt. // KINEO-ELENCO-EPOCA-2710
export const ELENCO_EPOCA_DIRECTION = // KINEO-ELENCO-EPOCA-2710
  'NAMED CAST AND ERA: every person or creature the idea names (or clearly treats as its protagonist) must appear, identified by that same name and one short consistent look, in the description of at least one scene — preferably the scene whose narration mentions them; the protagonist is visible in scene 1 and is never replaced by a side character or an animal companion. ' + // KINEO-ELENCO-EPOCA-2710
  'When the idea states a year, decade or historical period, every scene with people, vehicles or interiors shows period-accurate clothing, cars, phones and props for that time (1953 means 1950s hats, coats and chrome sedans — never hoodies or smartphones). ' + // KINEO-ELENCO-EPOCA-2710
  'Invented character names stay as names, never translated; describe what the character IS by the meaning of the source-language word (Portuguese "geleia" is a jelly/gelatin blob creature, never a jellyfish).' // KINEO-ELENCO-EPOCA-2710

/** Shared direction for the existing description call; no additional LLM call. */
export function visualDescriptionDirection(policy: VisualPromptPolicy): string {
  const mode = policy.mode === 'documentary_faceless'
    ? 'Faceless visual storytelling: environments, objects, hands or distant silhouettes; no foreground face or unrelated presenter.'
    : policy.mode === 'character_story'
      ? 'Show the described characters and actions. Preserve their identity and design; they do not address the camera.'
      : 'Preserve the explicitly requested on-screen presenter and setting; do not replace the subject with an empty landscape.'
  return `${mode} ${policy.style.lookPhrase}. ${policy.style.suffix}. ${aspectSpec(policy.aspect).promptFraming}. ${SCENE_FIDELITY_DIRECTION} ${ELENCO_EPOCA_DIRECTION}` // KINEO-ELENCO-EPOCA-2710 — era: …${SCENE_FIDELITY_DIRECTION}`
}

// KINEO-VIGIA-CENARIO-2026-09-11 — a metade determinística do VISUAL-DRIFT-11.
// Dois filmes reais de conta externa na mesma tarde (597f8237 e c636e7a0,
// Seedance): a camada visual escrita pelo GPT inventou lugar e época que a
// história não diz — "Amityville House", "Winchester Mystery House in San
// Jose, California", "1910 New England farmhouse", "vintage Nokia 3310",
// "1970s Bakelite rotary phone", "abandoned Victorian home" — para um conto
// de hoje, com telefone que recebe MENSAGEM. A regra no prompt do descritor
// (16:30) é pedido; isto é garantia: nome próprio, ano/década e adjetivo de
// época que NÃO estão nas palavras da história (tema + fala) não sobem para a
// fal. Nome que a história cita (Luffy, Daniel, Napoleon, Paris) fica.
// Puro: nenhuma chamada de modelo, nunca toca a narração.
const SETTING_ALLOW = new Set(['earth', 'moon', 'sun', 'god', 'internet', 'christmas', 'halloween', 'wifi', 'tv', 'led', 'gps', 'dna'])
// Sequência de palavras Capitalizadas (com 's / -era colados), com número
// opcional colado no fim ("Nokia 3310", "Model 500").
// KINEO-NOME-ACENTUADO-2026-09-12 — o pente fino de $0 (12/09) mostrou o
// prompt de cena chamando o Tomás de "ás": `[A-Z][a-z]` e `\b` são ASCII, então
// "Tomás" era lido como "Tom"+"ás", "tom" não estava nas palavras da história
// ("tomás" está) e o nome saía cortado. Classes Unicode (\p{Lu}/\p{Ll}) e
// fronteiras por lookaround: nome acentuado é UMA palavra.
// KINEO-PARTICULA-NO-NOME-2026-09-15 — ensaio do Omni: "Bolivia's Salar de Uyuni" saía como "Salar" + "Uyuni" e sobrava "In the heart of de,".
// Partícula minúscula entre palavras capitalizadas (de/da/do/del/della/di/von/van/der/la/le/el/al/y/e) faz parte do nome.
// KINEO-ABREVIACAO-E-OKINA-2026-09-15 (R19, filme do Veo acd05d78): o planejador escreveu "Mount St. Helens" e
// "Halemaʻumaʻu crater at Kilauea, Hawaii" numa história sem lugar; a varredura tirou "Mount" e "Halema" e mandou ao
// motor "maps of the St. Helens eruption" e "the ʻumaʻu crater". Causa: "St." não era palavra (uma minúscula só) e a
// okina (ʻ, letra modificadora) ficava fora da classe, então o nome casava pela metade. Agora a abreviação de título/
// lugar (St./Mt./Ft./Dr./Mr./Mrs./Ms./Prof./Gen./Col./Capt./Lt./Sgt./Rev.) faz parte do nome, apóstrofo/okina seguido de
// minúscula fica dentro da palavra, e o nome só casa INTEIRO (fim em fronteira) — nada sobra colado.
const SETTING_ABREV = String.raw`(?:(?:St|Mt|Ft|Dr|Mr|Mrs|Ms|Prof|Gen|Col|Capt|Lt|Sgt|Rev)\. )?`
const SETTING_PALAVRA = String.raw`\p{Lu}(?:[\p{Ll}\p{Lm}]|['’ʻ](?=[\p{Ll}\p{Lm}])){2,}(?:-\p{Ll}+)?`
const SETTING_PROPER_RUN_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])${SETTING_ABREV}${SETTING_PALAVRA}(?: (?:(?:de|da|do|dos|das|del|della|di|von|van|der|den|la|le|el|al|y|e) )?${SETTING_ABREV}${SETTING_PALAVRA})*(?: \d{2,4}(?![\p{L}\p{N}]))?(?![\p{L}\p{N}])`, 'gu')
// R19 — a instrução de variedade da rota ("do not repeat the same shot type") voltou copiada DENTRO da descrição da
// cena 9 do Veo ("…the geologist's focused expressions, ensuring no repetition."). Instrução não é imagem: sai.
const META_VARIEDADE_RE = /,?\s*(?:(?:ensuring|making sure|taking care|guaranteeing)\s+(?:that\s+)?(?:there\s+is\s+)?(?:no|zero)\s+repetition|(?:avoiding|without)\s+(?:any\s+)?repetition|(?:distinct|different)\s+from\s+(?:the\s+)?(?:previous|earlier|prior|other)\s+(?:scenes?|shots?))(?:\s+(?:of|from|with)\s+(?:the\s+)?(?:previous|earlier|prior|other)\s+(?:scenes?|shots?))?/gi
// R19 — "The geologist, Elena Vance, observes…" virava "The geologist, observes…": o aposto sai com as DUAS vírgulas,
// a não ser que o que segue seja pronome/conjunção/preposição ("at the observatory, she"), onde uma vírgula é gramática.
const APOS_VIRGULA_FICA = new Set(['she', 'he', 'they', 'it', 'we', 'you', 'i', 'the', 'a', 'an', 'and', 'but', 'or', 'nor', 'yet', 'so', 'while', 'as', 'where', 'when', 'who', 'whom', 'which', 'with', 'in', 'on', 'at', 'of', 'for', 'from', 'to', 'by', 'into', 'onto', 'under', 'over', 'near', 'through', 'across', 'then', 'now', 'still', 'his', 'her', 'their', 'its', 'this', 'that', 'these', 'those'])
const SETTING_YEAR_RE = /(?:\b(?:1[0-9]{3}|20[0-9]{2})s?\b|(?:^|\s)['’]?[1-9]0s\b)/g
const SETTING_ERA_ADJ_RE = /\b(victorian|edwardian|georgian|medieval|ancient|renaissance|colonial|napoleonic|vintage|retro|antique|old[- ]fashioned)(?:-era)?\b/gi

// KINEO-META95-ASSUNTO-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — a comparação ignora acento, i sem ponto e plural: "İstanbul" é
// KINEO-META95-ASSUNTO-1910 — "Istanbul", "Bermudas" é "Bermuda", "Tomás" é "Tomas". (Outra LÍNGUA — "Osmanlı" × "Ottoman" — é o assunto traduzido que a
// KINEO-META95-ASSUNTO-1910 — rota acrescenta ao contexto: lib/cinematic/assuntoTraduzido.ts.) Mesma função dos dois lados, por isso simétrica.
export function normalizarAssunto(w: string): string { // KINEO-META95-ASSUNTO-1910
  return w.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ø/g, 'o').replace(/đ/g, 'd').replace(/ł/g, 'l') // KINEO-META95-ASSUNTO-1910
} // KINEO-META95-ASSUNTO-1910
function settingWords(context: string): Set<string> {
  return new Set(((context || '').match(/[\p{L}\p{N}]+/gu) ?? []).map(normalizarAssunto)) // KINEO-META95-ASSUNTO-1910 — era .toLowerCase().match(…)
}
// KINEO-META95-ASSUNTO-1910 — restos do apagão (a0b58200, urdu): o nome inventado da moça saía e sobrava "A vibrant scene of confidently posing in front of
// KINEO-META95-ASSUNTO-1910 — the iconic at sunrise" e "no , no added props". Nome inteiro removido depois de preposição/verbo que pede objeto e antes de um
// KINEO-META95-ASSUNTO-1910 — verbo em -ing vira "a person" (o faceless troca por silhueta de costas, a história mantém); depois de "the iconic/famous/…" e
// KINEO-META95-ASSUNTO-1910 — antes de preposição/pontuação vira "landmark"; "no <nome>," some com o "no". Sem nome removido: byte a byte igual.
const RESTO_PEDE_SUJEITO_RE = /\b(?:of|showing|shows|with|featuring|depicting|depicts|as|while|where|watching|follows|following|captures|capturing|reveals|revealing)\s+$/i // KINEO-META95-ASSUNTO-1910
const RESTO_VERBO_ING_RE = /^\s+(?:(?:\p{Ll}+ly\s+)?\p{Ll}+ing\b|with\s+(?:a|an|the)\s+\p{Ll}+\s+(?:expression|smile|grin|look|gaze|face)\b|(?:wearing|dressed)\b)/u // KINEO-META95-ASSUNTO-1910 — "[nome] confidently posing", "[nome] with a joyful expression", "[nome] wearing…"
const RESTO_ADJ_DE_LUGAR_RE = /\b(?:the|a|an)\s+(?:iconic|famous|historic|historical|legendary|majestic|grand|towering|mighty|great|sacred|holy|magnificent|renowned|celebrated|monumental|imposing)\s+$/i // KINEO-META95-ASSUNTO-1910 — "the iconic [Taj Mahal] at sunrise" → landmark
const RESTO_ADJ_DE_AMBIENTE_RE = /\b(?:the|a|an)\s+(?:bustling|crowded|busy|quiet|lively|sprawling|vast|vibrant|colorful|colourful|dusty|rainy|foggy|snowy|sunlit|moonlit)\s+$/i // KINEO-META95-ASSUNTO-1910 — "the bustling [Spice Bazaar] of Istanbul" → place
const RESTO_DEPOIS_DE_LUGAR_RE = /^\s*(?:[,.;:)]|$|(?:at|in|on|of|with|under|during|against|beneath|before|after|as|while)\b)/i // KINEO-META95-ASSUNTO-1910
function restoDoApagao(before: string, after: string): string { // KINEO-META95-ASSUNTO-1910 — o que entra no lugar de um nome removido inteiro
  if (RESTO_PEDE_SUJEITO_RE.test(before) && RESTO_VERBO_ING_RE.test(after)) return 'a person' // KINEO-META95-ASSUNTO-1910
  if (RESTO_ADJ_DE_LUGAR_RE.test(before) && RESTO_DEPOIS_DE_LUGAR_RE.test(after)) return 'landmark' // KINEO-META95-ASSUNTO-1910
  if (RESTO_ADJ_DE_AMBIENTE_RE.test(before) && RESTO_DEPOIS_DE_LUGAR_RE.test(after)) return 'place' // KINEO-META95-ASSUNTO-1910
  return '' // KINEO-META95-ASSUNTO-1910
} // KINEO-META95-ASSUNTO-1910

export interface SettingScrub { text: string; removed: string[] }

/**
 * Remove from a GPT-written shot description every proper noun, year/decade
 * and era adjective absent from the story words. A sentence-initial single
 * capitalised word stays (it is just capitalised). A number glued to a
 * removed name ("Nokia 3310", "Model 500") goes with it.
 */
export function scrubInventedSetting(visual: string, context: string): SettingScrub {
  const src = visual || ''
  if (!src.trim()) return { text: src, removed: [] }
  const ctx = settingWords(context)
  const base = (w: string) => normalizarAssunto(w).replace(/\.$/, '').replace(/['’]\p{Ll}+$/u, '').replace(/-[a-z]+$/, '') // KINEO-META95-ASSUNTO-1910 — era w.toLowerCase() e só o 's: "Timur'un", "Devri'ne" (turco) casam com Timur/Devri
  const emCtx = (b: string) => ctx.has(b) || ctx.has(b + 's') || ctx.has(b + 'es') || (b.length > 4 && /s$/.test(b) && (ctx.has(b.slice(0, -1)) || (/es$/.test(b) && ctx.has(b.slice(0, -2))))) // KINEO-META95-ASSUNTO-1910 — plural de um lado só
  const known = (w: string) => emCtx(base(w)) || SETTING_ALLOW.has(base(w)) // KINEO-META95-ASSUNTO-1910 — era ctx.has(base(w))
  const removed: string[] = []
  let out = src.replace(META_VARIEDADE_RE, (m: string) => { removed.push(m.trim()); return '' })
  out = out.replace(SETTING_PROPER_RUN_RE, (run: string, offset: number, whole: string) => {
    const words = run.split(' ')
    const before = whole.slice(0, offset)
    const sentenceStart = /(?:^|[.!?;:]\s*|\(\s*|["“]\s*)$/.test(before)
    const nomes = words.filter((w) => !/^\d+$/.test(w))
    if (nomes.length === 1 && words.length === nomes.length && sentenceStart) return run
    const nomeRemovido = nomes.some((w) => !known(w))
    const kept = words.filter((w) => (/^\d+$/.test(w) ? (ctx.has(w) || !nomeRemovido) : known(w)))
    if (kept.length === words.length) return run
    for (const w of words) if (!kept.includes(w)) removed.push(w)
    if (kept.length === 0) return restoDoApagao(before, whole.slice(offset + run.length)) // KINEO-META95-ASSUNTO-1910 — nome inteiro fora: "a person" / "landmark" / nada
    return kept.join(' ')
  })
  out = out.replace(SETTING_YEAR_RE, (m: string) => {
    const digits = m.replace(/[^0-9]/g, '')
    if (ctx.has(digits) || ctx.has(digits + 's')) return m
    removed.push(m.trim())
    return m.startsWith(' ') ? ' ' : ''
  })
  out = out.replace(SETTING_ERA_ADJ_RE, (m: string, adj: string) => {
    const a = adj.toLowerCase()
    if (ctx.has(a) || ctx.has(a.replace(/[- ]/g, ''))) return m
    removed.push(m)
    return ''
  })
  if (!removed.length) return { text: src, removed }
  // limpeza do que sobrou: preposição/artigo pendurados, vírgulas dobradas, espaços
  // KINEO-ASPAS-VAZIAS-2026-09-15 — Kling 976eb60d (15/09), cena 6: "a ticket from the original journey of
  // the ' on the ', displaying…" — o nome próprio dentro das aspas foi removido e sobrou a casca. Aspas
  // cujo conteúdo virou só preposição/artigo somem inteiras; a limpeza abaixo então apara o "of the".
  const ASPAS_VAZIAS_RE = /["'“”‘’]\s*(?:(?:in|at|of|near|from|on|the|a|an|and|inside|outside|across|through|toward|towards|into|onto|over|under|behind|beside|along|past)\s*)*["'“”‘’]/gi
  for (let i = 0; i < 6; i++) {
    out = out
      .replace(ASPAS_VAZIAS_RE, '')
      .replace(/\b(?:no|his|her|its|their)\s*,\s*(?=\p{L})/giu, '') // KINEO-META95-ASSUNTO-1910 — "no , no added props" → "no added props" (o determinante órfão sai com a vírgula dele)
      .replace(/\s*\b(?:in|at|of|near|from|on|inside|outside|across|through|toward|towards|into|onto|over|under|behind|beside|along|past|the|a|an)\s*(?=[,.;)]|$)/gi, '')
      .replace(/\b(?:in|at|of|near|from|on|across|through|toward|towards|into|onto|over|under|behind|beside|along|past)\s+(?=(?:in|at|of|near|from|on|across|through|toward|towards|into|onto|over|under|behind|beside|along|past)\b)/gi, '')
      .replace(/,(?:\s*,)+\s*(?=([\p{L}\p{N}]+))/gu, (_m: string, w: string) => (APOS_VIRGULA_FICA.has(w.toLowerCase()) ? ', ' : ' '))
      .replace(/(?:\s*,){2,}/g, ',')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+([,.;)])/g, '$1')
      .replace(/,\s*\./g, '.')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,.;]+/, '')
      .trim()
  }
  // R13 (ensaio do Omni): "an ancient structure" → "an structure" depois de remover o adjetivo de época; o artigo segue a palavra.
  out = out.replace(/\b(an)\s+(?=[^aeiouAEIOU\s])/g, 'a ').replace(/\b(An)\s+(?=[^aeiouAEIOU\s])/g, 'A ')
  out = out.replace(/(^|[.!?…]\s+)(\p{Ll})/gu, (_m, p, c) => p + c.toUpperCase())
  return { text: out, removed }
}

// ═══ KINEO-ROMANCE-ADULTO-2026-10-13 — o apagão de pessoa do faceless não pode deixar frase quebrada ═══
// d.hein.0 (13/10): "Close-up shot of a man and a woman standing…" virava "Close-up shot of and standing…" — o motor [KINEO-ROMANCE-ADULTO-2026-10-13]
// recebia uma frase sem sujeito e inventava. Agora cada pessoa apagada vira uma marca; grupos coordenados ("a man and a [KINEO-ROMANCE-ADULTO-2026-10-13]
// woman", "men, women and children") viram UMA marca; possessivo ("a man's hands") some com a pessoa; marca depois de [KINEO-ROMANCE-ADULTO-2026-10-13]
// preposição/verbo que pede objeto ("of", "with", "between", "showing"…) vira o sujeito neutro do faceless (a mesma [KINEO-ROMANCE-ADULTO-2026-10-13]
// silhueta de costas dos nomes reais); o resto vira espaço, exatamente como antes. Sem pessoa no texto: byte a byte igual. [KINEO-ROMANCE-ADULTO-2026-10-13]
const PESSOA_APAGADA = '\u0000P\u0000' // KINEO-ROMANCE-ADULTO-2026-10-13
const GRUPO_DE_PESSOAS_RE = /\u0000P\u0000(?:\s*(?:,|\band\b|\bor\b|&|\bwith\b)\s*\u0000P\u0000)+/g // KINEO-ROMANCE-ADULTO-2026-10-13
const PEDE_OBJETO = String.raw`(?:of|with|between|among|amongst|featuring|showing|shows|depicting|depicts|by|for|from|to|at|beside|behind|near|toward|towards|around|about|watching|follows|following|reveals|revealing|captures|capturing)` // KINEO-ROMANCE-ADULTO-2026-10-13
function semPessoaSemFragmento(texto: string): string { // KINEO-ROMANCE-ADULTO-2026-10-13
  if (!texto.includes(PESSOA_APAGADA)) return texto // KINEO-ROMANCE-ADULTO-2026-10-13
  return texto // KINEO-ROMANCE-ADULTO-2026-10-13
    .replace(GRUPO_DE_PESSOAS_RE, '\u0000G\u0000') // KINEO-ROMANCE-ADULTO-2026-10-13
    .replace(/\u0000[PG]\u0000['’]s\b\s*/g, '') // KINEO-ROMANCE-ADULTO-2026-10-13 — "a man's hands" → "hands"
    .replace(new RegExp(String.raw`\b(${PEDE_OBJETO})\s*\u0000G\u0000`, 'gi'), '$1 distant silhouetted figures seen from behind') // KINEO-ROMANCE-ADULTO-2026-10-13
    .replace(new RegExp(String.raw`\b(${PEDE_OBJETO})\s*\u0000P\u0000`, 'gi'), '$1 a distant silhouetted figure seen from behind') // KINEO-ROMANCE-ADULTO-2026-10-13
    .replace(/\u0000[PG]\u0000/g, ' ') // KINEO-ROMANCE-ADULTO-2026-10-13 — o resto: espaço, como sempre
} // KINEO-ROMANCE-ADULTO-2026-10-13
// KINEO-TRILHA-15S >>> [TRAVA 8.2 — vai do fundador 16/10 "vai nos 2"] o protagonista do faceless vira forma SEM ROSTO, não espaço
// KINEO-TRILHA-15S — 91a25fbb (Exu Marabô, 15/10): o supervisor escreveu "a silhouette of a lost man standing alone" e o apagão
// KINEO-TRILHA-15S — mandou ao motor "a silhouette of a lost standing alone" (também "chasing in a blue shalwar kameez", "in a
// KINEO-TRILHA-15S — vibrant blue jalabiya stands"). Agora a pessoa que NÃO vem depois de preposição/verbo que pede objeto (esse
// KINEO-TRILHA-15S — caso já vira a silhueta neutra, acima) e não é possessivo ("a man's hands", acima) MANTÉM o substantivo e
// KINEO-TRILHA-15S — ganha a forma sem rosto, escolhida pelo sujeito, sem sorteio: ação de mão logo depois ("holding", "writing"…)
// KINEO-TRILHA-15S — → "…, seen only as hands in close-up,"; a frase já fala de silhueta → "… seen from behind"; grupo/plural →
// KINEO-TRILHA-15S — "… seen from behind as distant silhouettes"; uma pessoa → "… seen in silhouette from behind". As palavras
// KINEO-TRILHA-15S — mantidas levam ROSTO_PROTEGIDO (U+E000) depois da 1ª letra para o PERSON_NOUN_RE não as apagar em seguida;
// KINEO-TRILHA-15S — a marca sai no fim do sujeito. Sem pessoa no texto: byte a byte igual. A cauda fixa do prompt não é tocada.
const ROSTO_PROTEGIDO = '\uE000' // KINEO-TRILHA-15S
const GRUPO_DE_PESSOAS_TEXTO_RE = new RegExp(String.raw`(?:${PERSON_NOUN_RE.source})(?:\s*(?:,|\band\b|\bor\b|&|\bwith\b)\s*(?:${PERSON_NOUN_RE.source}))*`, 'gi') // KINEO-TRILHA-15S
const PEDE_OBJETO_ANTES_RE = new RegExp(String.raw`\b${PEDE_OBJETO}\s*$`, 'i') // KINEO-TRILHA-15S
const ACAO_DE_MAO_RE = /^\s*,?\s*(?:[a-z]+ly\s+)?(?:holding|holds|hold|clutching|clutches|gripping|grips|grabbing|grabs|writing|writes|typing|types|counting|counts|signing|signs|opening|opens|pouring|pours|cooking|cooks|cutting|cuts|chopping|stirring|kneading|reaching|reaches|touching|touches|flipping|flips|tapping|taps|scrolling|drawing|draws|painting|paints|planting|plants|placing|places|picking|picks|handing|offering|offers|lighting|lights|folding|unfolding|wrapping|unwrapping|sewing|knitting|shuffling|dealing)\b/i // KINEO-TRILHA-15S
const GRUPO_OU_PLURAL_RE = /\band\b|\bor\b|\bwith\b|,|&|(?:\b(?:men|women|people|children|crowd|family)|s)$/i // KINEO-TRILHA-15S
function pessoaSemRosto(grupo: string, pos: number, todo: string): string { // KINEO-TRILHA-15S — replacer de GRUPO_DE_PESSOAS_TEXTO_RE
  const antes = todo.slice(0, pos) // KINEO-TRILHA-15S
  const depois = todo.slice(pos + grupo.length) // KINEO-TRILHA-15S
  if (PEDE_OBJETO_ANTES_RE.test(antes) || /^['’]s\b/.test(depois)) return grupo // KINEO-TRILHA-15S — esses dois casos já têm forma própria (semPessoaSemFragmento)
  const mantido = grupo.replace(/\b[A-Za-z]/g, (c: string) => c + ROSTO_PROTEGIDO) // KINEO-TRILHA-15S — "man" → "m\uE000an": o PERSON_NOUN_RE não casa mais
  if (ACAO_DE_MAO_RE.test(depois)) return `${mantido}, seen only as hands in close-up${/^\s*,/.test(depois) ? '' : ','}` // KINEO-TRILHA-15S — mãos em close
  if (/silhouett/i.test(antes)) return `${mantido} seen from behind` // KINEO-TRILHA-15S — figura vista de trás (a silhueta já está na frase)
  return GRUPO_OU_PLURAL_RE.test(grupo.trim()) ? `${mantido} seen from behind as distant silhouettes` : `${mantido} seen in silhouette from behind` // KINEO-TRILHA-15S — silhueta de costas
} // KINEO-TRILHA-15S
// <<< KINEO-TRILHA-15S
export function buildClassicVisualPrompt(visual: string, policy: VisualPromptPolicy): string {
  let prompt: string
  if (policy.mode !== 'documentary_faceless') {
    prompt = buildStoryScenePrompt(visual, policy.style, policy.character ?? null)
    if (policy.elenco && policy.elenco.length > 0) prompt = comElencoNaCena(prompt, visual, policy.elenco) // KINEO-PARCEIRO-EYEBIBLE-2-1410 — o capitão é o mesmo homem em toda cena que o cita
  } else {
    const subject = semPessoaSemFragmento((visual || '') // KINEO-ROMANCE-ADULTO-2026-10-13 — o apagão de pessoa não deixa "of and"
      .replace(NAMED_FIGURE_RE, 'a distant silhouetted figure seen from behind')
      .replace(NAMED_TITLE_RE, 'a distant silhouetted figure seen from behind')
      .replace(GRUPO_DE_PESSOAS_TEXTO_RE, pessoaSemRosto) // KINEO-TRILHA-15S — protagonista sem rosto, substantivo mantido
      .replace(PERSON_NOUN_RE, PESSOA_APAGADA)) // KINEO-ROMANCE-ADULTO-2026-10-13 — era .replace(PERSON_NOUN_RE, ' ')
      .replace(/\s+/g, ' ').replace(/^[\s,.;:–-]+/, '').trim().split(ROSTO_PROTEGIDO).join('') // KINEO-TRILHA-15S — a marca das palavras mantidas sai aqui
    prompt = applyStyleAnchor(
      `${subject || 'the described story setting'}, faceless cinematic b-roll, ` +
      'focus on the described subject and its environment, no foreground human faces, ' +
      'photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, ' +
      'subject clearly framed with the lower third clear for captions, no watermark, no logo' + NO_READABLE_TEXT_SUFFIX,
      policy.style,
    )
  }
  const opening = policy.opening
    ? 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. '
    : ''
  // Non-speaking illustration is not an avatar/lip-sync claim.
  const performance = policy.mode === 'character_story' ? ', characters act naturally within the scene without addressing the viewer' : ''
  return opening + applyVisualFraming(prompt, policy.aspect) + performance +
    (policy.eraSuffix || '') + textSafetySuffix(visual) + `, ${aspectSpec(policy.aspect).promptFraming}`
}
