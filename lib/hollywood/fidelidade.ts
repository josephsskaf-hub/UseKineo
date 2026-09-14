// ═══ KINEO-FIDELIDADE-2026-09-14 (v3, após a 2ª revisão do Board) ═══════════
//
// Cenário H3 Lituya (f04527a7), revisão visual do Board: abertura em retrato
// sem o acontecimento; deslizamento narrado sobre fiorde tranquilo; onda sem
// escala; "My son and I" na voz do narrador; rostos diferentes para o mesmo
// sobrevivente. Segunda revisão: nada de depoimento inventado ("would later
// recall" exige fonte); coincidência lexical não é cobertura; a cadeia inteira
// (planejador → correção → prompt enviado) tem de ser testada; ficha completa
// normalizada, por personagem; nunca tirar 1 s sem folga segura.
//
// Tudo aqui é determinístico e puro. Só age sobre texto que o PLANEJADOR
// escreveu (modo IA); o roteiro do autor (verbatim) nunca passa por aqui.

export type IdiomaNarracao = 'en' | 'pt' | 'es'
type Genero = 'm' | 'f' | 'n'

// ── Papel e gênero do personagem da ficha ───────────────────────────────────
const PAPEIS: Array<[RegExp, Record<IdiomaNarracao, string>]> = [
  [/\bfisher(?:man|woman)\b/, { en: 'the fisherman', pt: 'o pescador', es: 'el pescador' }],
  [/\bsailor\b/, { en: 'the sailor', pt: 'o marinheiro', es: 'el marinero' }],
  [/\b(?:captain|skipper)\b/, { en: 'the captain', pt: 'o capitão', es: 'el capitán' }],
  [/\b(?:scientist|geologist)\b/, { en: 'the scientist', pt: 'o cientista', es: 'el científico' }],
  [/\bengineer\b/, { en: 'the engineer', pt: 'o engenheiro', es: 'el ingeniero' }],
  [/\bsoldier\b/, { en: 'the soldier', pt: 'o soldado', es: 'el soldado' }],
  [/\bpilot\b/, { en: 'the pilot', pt: 'o piloto', es: 'el piloto' }],
  [/\b(?:nurse|doctor)\b/, { en: 'the doctor', pt: 'o médico', es: 'el médico' }],
  [/\bfarmer\b/, { en: 'the farmer', pt: 'o agricultor', es: 'el agricultor' }],
  [/\bminer\b/, { en: 'the miner', pt: 'o mineiro', es: 'el minero' }],
  [/\bteacher\b/, { en: 'the teacher', pt: 'o professor', es: 'el maestro' }],
  [/\b(?:lighthouse )?keeper\b/, { en: 'the keeper', pt: 'o faroleiro', es: 'el farero' }],
  [/\bexplorer\b/, { en: 'the explorer', pt: 'o explorador', es: 'el explorador' }],
  [/\b(?:diver|climber|hunter|trader|merchant)\b/, { en: 'the man', pt: 'o homem', es: 'el hombre' }],
  [/\b(?:boy|son)\b/, { en: 'the boy', pt: 'o menino', es: 'el niño' }],
  [/\b(?:girl|daughter)\b/, { en: 'the girl', pt: 'a menina', es: 'la niña' }],
  [/\bwoman\b/, { en: 'the woman', pt: 'a mulher', es: 'la mujer' }],
  [/\bman\b/, { en: 'the man', pt: 'o homem', es: 'el hombre' }],
]
const PAPEL_PADRAO: Record<IdiomaNarracao, string> = { en: 'the survivor', pt: 'o sobrevivente', es: 'el sobreviviente' }

export function generoDaFicha(characterSheet: string): Genero {
  const s = (characterSheet ?? '').toLowerCase()
  if (/\b(?:woman|girl|female|she|her|daughter|mother|wife)\b/.test(s)) return 'f'
  if (/\b(?:man|boy|male|he|his|son|father|husband|beard|moustache)\b/.test(s)) return 'm'
  return 'n'
}

export function papelDoPersonagem(characterSheet: string, idioma: IdiomaNarracao = 'en'): string {
  const s = (characterSheet ?? '').toLowerCase()
  for (const [re, nomes] of PAPEIS) if (re.test(s)) return nomes[idioma]
  return PAPEL_PADRAO[idioma]
}

/** A palavra do papel sem artigo ("fisherman"), para reconhecer o protagonista num prompt em inglês. */
export function palavraDoPapel(characterSheet: string): string | null {
  const s = (characterSheet ?? '').toLowerCase()
  for (const [re, nomes] of PAPEIS) { const m = s.match(re); if (m) return nomes.en.replace(/^the /, '') }
  return null
}

// ── Narração factual em terceira pessoa (sem depoimento inventado) ────────────
const cap = (t: string) => t.replace(/(^|[.!?]\s+)([a-záéíóúãõâêôç])/g, (_m, a, b) => a + b.toUpperCase())

/**
 * Fala gerada pelo planejador para um diálogo que o modo sem rosto converteu em
 * narração: vira narração FACTUAL em terceira pessoa. Sem "would later recall",
 * sem "said" — nada de testemunho inventado. Nenhuma palavra de conteúdo some;
 * só os pronomes/auxiliares de 1ª pessoa mudam. Texto sem 1ª pessoa: intocado.
 */
export function narrarEmTerceiraPessoa(line: string, characterSheet: string, idioma: IdiomaNarracao = 'en'): string {
  const l = (line ?? '').trim()
  if (!l) return l
  const g = generoDaFicha(characterSheet)
  const papel = papelDoPersonagem(characterSheet, idioma)
  let usouPapel = false
  if (idioma === 'en') {
    if (!/\b(i|i'm|i've|i'd|i'll|my|mine|me|myself|we|we're|we've|we'd|we'll|our|ours|us|ourselves)\b/i.test(l)) return l
    const pron = g === 'f' ? 'she' : g === 'm' ? 'he' : 'they'
    const pos = g === 'f' ? 'her' : g === 'm' ? 'his' : 'their'
    const obj = g === 'f' ? 'her' : g === 'm' ? 'him' : 'them'
    const posAbs = g === 'f' ? 'hers' : g === 'm' ? 'his' : 'theirs'
    const refl = g === 'f' ? 'herself' : g === 'm' ? 'himself' : 'themselves'
    const subj = () => { if (!usouPapel) { usouPapel = true; return papel } return pron }
    let t = l
    t = t.replace(/\bmy ([a-z]+(?: [a-z]+)?) and I\b/gi, (_m, x) => `${subj()} and ${pos} ${x}`)
    t = t.replace(/\bI and my ([a-z]+)\b/gi, (_m, x) => `${subj()} and ${pos} ${x}`)
    const aux: Array<[RegExp, string]> = [[/\bI am\b|\bI'm\b/g, 'is'], [/\bI was\b/g, 'was'], [/\bI have\b|\bI've\b/g, 'has'], [/\bI had\b|\bI'd\b/g, 'had'], [/\bI will\b|\bI'll\b/g, 'will'], [/\bI can\b/g, 'can'], [/\bI could\b/g, 'could'], [/\bI do\b/g, 'does'], [/\bI don't\b/g, 'does not'], [/\bI didn't\b/g, 'did not']]
    for (const [re, v] of aux) t = t.replace(re, () => `${subj()} ${g === 'n' && v === 'is' ? 'are' : g === 'n' && v === 'has' ? 'have' : g === 'n' && v === 'does' ? 'do' : g === 'n' && v === 'does not' ? 'do not' : v}`)
    t = t.replace(/\bI\b/g, () => subj())
    t = t.replace(/\bmyself\b/gi, refl).replace(/\bmine\b/gi, posAbs).replace(/\bmy\b/gi, pos).replace(/\bme\b/gi, obj)
    t = t.replace(/\bwe're\b/gi, 'they are').replace(/\bwe've\b/gi, 'they have').replace(/\bwe'd\b/gi, 'they had').replace(/\bwe'll\b/gi, 'they will')
    t = t.replace(/\bourselves\b/gi, 'themselves').replace(/\bours\b/gi, 'theirs').replace(/\bour\b/gi, 'their').replace(/\bwe\b/gi, 'they').replace(/\bus\b/gi, 'them')
    return cap(t)
  }
  if (idioma === 'pt') {
    if (!/\b(eu|meu|minha|meus|minhas|mim|comigo|nós|nosso|nossa|nossos|nossas|estou|sou|tenho|vi|fui|vimos|tivemos|sabíamos|estávamos|éramos)\b/i.test(l)) return l
    const pron = g === 'f' ? 'ela' : g === 'm' ? 'ele' : 'eles'
    const subj = () => { if (!usouPapel) { usouPapel = true; return papel } return pron }
    let t = l
    t = t.replace(/\b(?:meu|minha) ([a-záéíóúãõâêôç]+) e eu\b/gi, (_m, x) => `${subj()} e ${g === 'f' ? 'sua' : 'seu'} ${x}`)
    const verbos: Array<[RegExp, string]> = [[/\beu estou\b/gi, 'está'], [/\beu sou\b/gi, 'é'], [/\beu tenho\b/gi, 'tem'], [/\beu vi\b/gi, 'viu'], [/\beu fui\b/gi, 'foi'], [/\bvimos\b/gi, 'viram'], [/\btivemos\b/gi, 'tiveram'], [/\bsabíamos\b/gi, 'sabiam'], [/\bestávamos\b/gi, 'estavam'], [/\béramos\b/gi, 'eram']]
    for (const [re, v] of verbos) t = t.replace(re, (m) => (/^eu /i.test(m) ? `${subj()} ${v}` : v))
    t = t.replace(/\beu\b/gi, () => subj())
    t = t.replace(/\bminhas\b/gi, 'suas').replace(/\bmeus\b/gi, 'seus').replace(/\bminha\b/gi, 'sua').replace(/\bmeu\b/gi, 'seu').replace(/\bcomigo\b/gi, `com ${pron}`).replace(/\bmim\b/gi, pron)
    t = t.replace(/\bnossas\b/gi, 'suas').replace(/\bnossos\b/gi, 'seus').replace(/\bnossa\b/gi, 'sua').replace(/\bnosso\b/gi, 'seu').replace(/\bnós\b/gi, 'eles')
    return cap(t)
  }
  // es
  if (!/\b(yo|mi|mis|mío|mía|conmigo|nosotros|nosotras|nuestro|nuestra|nuestros|nuestras|soy|estoy|tengo|vi|fui|vimos|tuvimos|sabíamos|estábamos|éramos)\b/i.test(l)) return l
  const pronEs = g === 'f' ? 'ella' : g === 'm' ? 'él' : 'ellos'
  const subjEs = () => { if (!usouPapel) { usouPapel = true; return papel } return pronEs }
  let t = l
  t = t.replace(/\bmi ([a-záéíóúñ]+) y yo\b/gi, (_m, x) => `${subjEs()} y su ${x}`)
  const verbosEs: Array<[RegExp, string]> = [[/\byo soy\b/gi, 'es'], [/\byo estoy\b/gi, 'está'], [/\byo tengo\b/gi, 'tiene'], [/\byo vi\b/gi, 'vio'], [/\byo fui\b/gi, 'fue'], [/\bvimos\b/gi, 'vieron'], [/\btuvimos\b/gi, 'tuvieron'], [/\bsabíamos\b/gi, 'sabían'], [/\bestábamos\b/gi, 'estaban'], [/\béramos\b/gi, 'eran']]
  for (const [re, v] of verbosEs) t = t.replace(re, (m) => (/^yo /i.test(m) ? `${subjEs()} ${v}` : v))
  t = t.replace(/\byo\b/gi, () => subjEs())
  t = t.replace(/\bmis\b/gi, 'sus').replace(/\bmi\b/gi, 'su').replace(/\bmíos?\b/gi, 'suyo').replace(/\bmías?\b/gi, 'suya').replace(/\bconmigo\b/gi, `con ${pronEs}`)
  t = t.replace(/\bnuestras\b/gi, 'sus').replace(/\bnuestros\b/gi, 'sus').replace(/\bnuestra\b/gi, 'su').replace(/\bnuestro\b/gi, 'su').replace(/\bnosotr[oa]s\b/gi, 'ellos')
  return cap(t)
}

// ── Fala nunca entra no prompt de IMAGEM de uma cena sem rosto ───────────────
export function silenciarFalaNoPrompt(prompt: string): string {
  return (prompt ?? '')
    .replace(/\s*["“][^"”]{6,}["”][.,]?\s*/g, ' ')
    .replace(/\s*—?\s*looking (?:straight |directly )?into the lens,? the person says:?\s*/gi, ' ')
    .replace(/\bthe person says:?\s*/gi, ' ')
    .replace(/\b(?:and|then)\s+(?:says|tells|declares|shouts|whispers|explains|announces):?\s*/gi, ', silent, mouth closed. ')
    .replace(/\b(?:says|shouts|whispers|declares|announces):\s*/gi, ' ')
    .replace(/\b(?:he|she|they|the (?:man|woman|person|old man|old woman|boy|girl))?\s*(?:begins?|starts?|continues?)\s+(?:speaking|talking|telling|narrating|explaining)\s+(?:about|of|to)\s+[^,.;]+/gi, 'silent, mouth closed')
    .replace(/\b(?:speaking|talking)\s+(?:about|to|of)\s+[^,.;]+/gi, 'silent, mouth closed')
    .replace(/\b(?:he|she)\s+(?:says|tells|narrates|explains|recounts|declares)\s+[^,.;]+/gi, 'silent, mouth closed')
    .replace(/\b(?:speaks|speaking|talks|talking|declares|says|addresses) (?:directly )?to (?:the )?(?:camera|lens|viewer)/gi, 'silent, mouth closed')
    .replace(/looks? (?:directly |straight )?(?:into|at) the (?:lens|camera)/gi, 'looks away from the camera, mouth closed')
    .replace(/turns? (?:to|toward|towards) the (?:camera|lens)/gi, 'turns away from the camera, mouth closed')
    .replace(/talking head/gi, 'wide environmental shot')
    .replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').replace(/\.\s*,/g, '.').trim()
}

// ── Nome próprio de pessoa no prompt de imagem → papel da ficha ───────────────
const VERBOS_DE_PESSOA = '(?:looks?|turns?|stands?|sits?|holds?|walks?|runs?|stares?|watches?|grips?|clings?|waits?|kneels?|leans?|climbs?|rows?|steers?|and his|and her|with his|with her)'
const NOME_PROPRIO_COM_VERBO_RE = new RegExp(`\\b([A-Z][a-z]{2,}(?: [A-Z][a-z]{2,})+)(?=,? ${VERBOS_DE_PESSOA}\\b)`, 'g')
const NOME_PROPRIO_POSSESSIVO_RE = /\b([A-Z][a-z]{2,}(?: [A-Z][a-z]{2,})+)'s\b/g
export function despersonalizarPrompt(prompt: string, characterSheet: string): string {
  const papel = papelDoPersonagem(characterSheet, 'en')
  return (prompt ?? '').replace(NOME_PROPRIO_COM_VERBO_RE, papel).replace(NOME_PROPRIO_POSSESSIVO_RE, `${papel}'s`)
}

// ── Continuidade POR PERSONAGEM: ficha completa normalizada, só no protagonista ─
export const PESSOA_NO_PROMPT_RE = /\b(?:man|woman|person|boy|girl|son|daughter|sailor|fisherman|fisherwoman|captain|soldier|scientist|survivor|face|eyes|hands|he|she|his|her|him)\b/i
export const fichaNormalizada = (t: string) => (t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

/** O prompt fala do PROTAGONISTA da ficha (papel da ficha, ou pronome do gênero da ficha)? "his son", "a young woman", "the crew" não contam. */
export function mencionaProtagonista(prompt: string, characterSheet: string): boolean {
  const p = (prompt ?? '').toLowerCase()
  const papel = palavraDoPapel(characterSheet)
  if (papel && new RegExp(`\\b${papel}\\b`).test(p)) return true
  const g = generoDaFicha(characterSheet)
  if (g === 'm') return /\b(?:he|him)\b/.test(p) || /\bhis (?!son\b|daughter\b|wife\b|crew\b|father\b|mother\b|friend\b|brother\b|sister\b)/.test(p)
  if (g === 'f') return /\bshe\b/.test(p) || /\bher (?!son\b|daughter\b|husband\b|crew\b|father\b|mother\b|friend\b|brother\b|sister\b)/.test(p)
  return false
}

export function garantirFichaNoPrompt(prompt: string, characterSheet: string): string {
  const p = (prompt ?? '').trim()
  const s = (characterSheet ?? '').trim()
  if (!s || !mencionaProtagonista(p, s)) return p
  if (fichaNormalizada(p).includes(fichaNormalizada(s))) return p
  return `${s.replace(/[.\s]+$/, '')}. ${p}`
}

// ── Cobertura da AÇÃO da narração pelo pedido visual: 3 estados, nunca aprovado por omissão ─
const STOP = new Set(['about', 'above', 'after', 'again', 'along', 'among', 'around', 'because', 'before', 'being', 'below', 'between', 'could', 'during', 'every', 'first', 'from', 'great', 'having', 'here', 'into', 'might', 'other', 'over', 'shall', 'should', 'since', 'their', 'there', 'these', 'those', 'through', 'today', 'toward', 'under', 'until', 'where', 'which', 'while', 'whole', 'would', 'years', 'later', 'never', 'still', 'thing', 'things', 'something', 'anything', 'people', 'story', 'history', 'night', 'moment', 'against', 'across', 'within', 'without', 'behind', 'already', 'almost', 'always', 'another', 'itself', 'himself', 'herself', 'themselves', 'ourselves', 'everything', 'nothing', 'immense', 'towering', 'astonishing', 'catastrophic', 'massive', 'colossal'])
const raiz = (w: string) => w.slice(0, 5)
export function palavrasDeConteudo(texto: string): string[] {
  return (texto ?? '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length >= 5 && !STOP.has(w) && !/^\d+$/.test(w))
}
/** Palavras de AÇÃO: conteúdo menos nomes próprios (Lituya, Alaska, Empire State aparecem em todo prompt e mascaravam a ação). */
export function palavrasDeAcao(voiceover: string): string[] {
  const tokens = (voiceover ?? '').replace(/[^A-Za-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean)
  const out: string[] = []
  let inicio = true
  for (const t of tokens) {
    const proprio = /^[A-Z]/.test(t) && !inicio
    inicio = false
    if (proprio) continue
    const w = t.toLowerCase()
    if (w.length >= 5 && !STOP.has(w) && !/^\d+$/.test(w)) out.push(w)
  }
  return out
}
export const ESCALA_RE = /\b(\d+(?:[.,]\d+)?)\s*(meters?|metres?|feet|foot|ft|km|kilometers?|kilometres?|miles?|tons?|tonnes?|stor(?:e)?ys|stories|floors)\b/gi
const COMPARACAO_RE = /\b(?:dwarf(?:s|ing|ed)?|taller than|higher than|as tall as|as high as|the size of|the height of|times (?:the|larger|taller|bigger|higher))\b/i
export function escalasDe(texto: string): string[] { return [...(texto ?? '').matchAll(ESCALA_RE)].map((m) => `${m[1].replace(',', '.')} ${m[2].toLowerCase().replace(/s$/, '')}`) }
export function escalaAnunciada(texto: string): boolean { return escalasDe(texto).length > 0 || COMPARACAO_RE.test(texto ?? '') }
const VIOLENTO_RE = /\b(?:landslide|rockslide|collapse[sd]?|collapsing|tsunami|wave|waves|explosion|explod\w*|erupt\w*|crash\w*|flood\w*|storm|earthquake|quake|fire|burn\w*|fall\w*|break\w*|destroy\w*|destruction|surge|torrent|avalanche)\b/i
const CALMO_RE = /\b(?:calm|still|tranquil|peaceful|quiet|serene|gentle|placid|empty|motionless|undisturbed|glassy)\b/gi
export type Cobertura = { status: 'coberta' | 'divergente' | 'desconhecida' | 'sem_narracao'; motivo: string; acao: string[]; coincidencias: string[] }

export function avaliarCobertura(prompt: string, voiceover: string, characterSheet = ''): Cobertura {
  const v = (voiceover ?? '').trim()
  const p = (prompt ?? '')
  if (!v) return { status: 'sem_narracao', motivo: 'cena sem narração', acao: [], coincidencias: [] }
  // sujeito errado: a narração nomeia o protagonista da ficha e o prompt mostra outra pessoa ("his son", "a young woman") sem ele
  const papel = characterSheet ? palavraDoPapel(characterSheet) : null
  if (papel && new RegExp(`\\b${papel}\\b`, 'i').test(v) && PESSOA_NO_PROMPT_RE.test(p) && !mencionaProtagonista(p, characterSheet)) {
    return { status: 'divergente', motivo: `sujeito errado: a narração fala de ${papel}, o prompt mostra outra pessoa`, acao: [...new Set(palavrasDeAcao(v))], coincidencias: [] }
  }
  const acao = [...new Set(palavrasDeAcao(v))]
  const raizes = new Set(acao.map(raiz))
  const coincidencias = [...new Set(palavrasDeConteudo(p).filter((w) => raizes.has(raiz(w))))]
  // ação negada no prompt ("no landslide", "without waves")
  for (const w of coincidencias) if (new RegExp(`\\b(?:no|not|without|never)\\b(?:\\s+\\w+){0,2}\\s+${w.slice(0, 5)}`, 'i').test(p)) return { status: 'divergente', motivo: `ação negada no prompt: ${w}`, acao, coincidencias }
  // contraste: narração violenta × prompt calmo
  if (VIOLENTO_RE.test(v) && CALMO_RE.test(p)) return { status: 'divergente', motivo: 'narração de evento violento sobre cena calma', acao, coincidencias }
  // escala: números com unidade divergentes
  const escV = escalasDe(v), escP = escalasDe(p)
  if (escV.length && escP.length && !escV.some((e) => escP.includes(e))) return { status: 'divergente', motivo: `escala divergente: narração ${escV.join('/')} × prompt ${escP.join('/')}`, acao, coincidencias }
  if (escalaAnunciada(v) && !escalaAnunciada(p)) return { status: 'desconhecida', motivo: 'escala anunciada na narração ausente no prompt', acao, coincidencias }
  const forte = coincidencias.length >= 2 || (coincidencias.length >= 1 && acao.length <= 2)
  if (forte) return { status: 'coberta', motivo: `ação presente: ${coincidencias.join(', ')}`, acao, coincidencias }
  return { status: 'desconhecida', motivo: coincidencias.length ? `coincidência lexical única: ${coincidencias[0]}` : 'nenhuma palavra de ação no prompt', acao, coincidencias }
}

export function primeiraFrase(texto: string): string {
  const m = (texto ?? '').trim().match(/^[^.!?]+[.!?]?/)
  return (m ? m[0] : (texto ?? '')).trim().slice(0, 200)
}

/** Só 'coberta' deixa o prompt como está. Divergente: remove a contradição (escala do prompt, adjetivos calmos) e abre com a frase da narração. Desconhecida: abre com a frase (declarada, não aprovada por omissão). */
export function garantirAcaoCentral(prompt: string, voiceover: string, characterSheet = ''): { prompt: string; cobertura: Cobertura } {
  const cobertura = avaliarCobertura(prompt, voiceover, characterSheet)
  let p = (prompt ?? '').trim()
  if (cobertura.status === 'coberta' || cobertura.status === 'sem_narracao') return { prompt: p, cobertura }
  if (cobertura.status === 'divergente') {
    if (/escala divergente/.test(cobertura.motivo)) p = p.replace(ESCALA_RE, ' ').replace(/\s{2,}/g, ' ').trim()
    if (/cena calma/.test(cobertura.motivo)) p = p.replace(CALMO_RE, ' ').replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim()
  }
  // Sem aspas: aspas no prompt de imagem viram fala na boca de alguém (2ª revisão do Board).
  return { prompt: `Shows exactly this moment, as the narration describes it: ${primeiraFrase(voiceover).replace(/["“”]/g, '')} ${p}`.replace(/\s{2,}/g, ' ').trim(), cobertura }
}

// ── A cadeia no planejador: conversão sem rosto + despersonalizar + ficha ────
export interface CenaPlano { index?: number; type: string; prompt: string; voiceover?: string; dialogueLine?: string; needsNarration?: boolean; seconds?: number }
export function aplicarFidelidadeAoPlano<T extends CenaPlano>(scenes: T[], characterSheet: string, idioma: IdiomaNarracao = 'en', semRosto = true): Array<{ index: number | undefined; convertida: boolean }> {
  const relato: Array<{ index: number | undefined; convertida: boolean }> = []
  for (const sc of scenes) {
    let convertida = false
    if (semRosto && sc.type === 'dialogue') {
      const line = (sc.dialogueLine ?? '').trim()
      sc.type = 'support'
      if (line) { sc.voiceover = narrarEmTerceiraPessoa(line, characterSheet, idioma); sc.needsNarration = true }
      delete sc.dialogueLine
      convertida = true
    }
    if (sc.type !== 'dialogue') sc.prompt = garantirFichaNoPrompt(despersonalizarPrompt(silenciarFalaNoPrompt(sc.prompt), characterSheet), characterSheet)
    relato.push({ index: sc.index, convertida })
  }
  return relato
}

// ── Apara de respiro só com folga segura; excedente registrado, nunca fala sacrificada ─
export function apararComFolga<T extends { seconds?: number }>(scenes: T[], palavrasDe: (sc: T) => number, duration: number, wps = 2.3): { aparado: number; excedente: number; reconciliado: boolean } {
  const silencio = (sc: T) => (sc.seconds || 0) - palavrasDe(sc) / wps
  const total = () => scenes.reduce((a, sc) => a + (sc.seconds || 0), 0)
  const totalSil = () => scenes.reduce((a, sc) => a + Math.max(0, silencio(sc)), 0)
  let aparado = 0
  let guard = 40
  // Board: nunca tirar 1 s de uma cena cuja folga ESTIMADA é menor que 1,25 s (sobra ≥ 0,25 s); estimativa não é áudio medido.
  while ((totalSil() > 7.5 || total() > duration * 1.05) && total() - 1 >= duration && guard-- > 0) {
    const alvo = scenes.filter((sc) => (sc.seconds || 0) > 4 && silencio(sc) >= 1.25).sort((a, b) => silencio(b) - silencio(a))[0]
    if (!alvo) break
    alvo.seconds = (alvo.seconds || 0) - 1
    aparado++
  }
  const excedente = Math.max(0, Math.round((total() - duration * 1.05) * 10) / 10)
  return { aparado, excedente, reconciliado: excedente === 0 }
}
