// ═══ KINEO-FIDELIDADE-2026-09-14 (v4, após a 3ª revisão do Board) ═══════════
//
// Cenário H3 Lituya (f04527a7), revisão visual do Board: abertura em retrato
// sem o acontecimento; deslizamento narrado sobre fiorde tranquilo; onda sem
// escala; "My son and I" na voz do narrador; rostos diferentes para o mesmo
// sobrevivente. Segunda revisão: nada de depoimento inventado; coincidência
// lexical não é cobertura; testar a cadeia inteira; ficha completa por
// personagem; nunca tirar 1 s sem folga. Terceira revisão (v4):
//   · conversão de pessoa preserva GRAMÁTICA ("I see" → "sees"; "eu sobrevivi"
//     → "sobreviveu"; "yo recuerdo" → "recuerda"), profissão (nurse ≠ doctor) e
//     sentido; construção não suportada é DECLARADA e o texto fica intacto —
//     substituição parcial nunca é apresentada como conversão;
//   · dois substantivos não provam ação: cobertura exige uma palavra de AÇÃO
//     (verbo/evento) coincidente; "collapsed" × "remains intact" é divergente;
//     a contradição identificada (negação, calmaria, escala) é REMOVIDA do
//     prompt, não concatenada a ordens opostas; regexes sem estado global;
//   · identidade EXPLÍCITA: a ficha entra no lugar da descrição do papel
//     ("a rugged fisherman in his 60s with a white beard" → ficha), nunca por
//     pronome ("his son… he grips" não recebe a ficha do pai).
//
// Tudo aqui é determinístico e puro. Só age sobre texto que o PLANEJADOR
// escreveu (modo IA); o roteiro do autor (verbatim) nunca passa por aqui.

export type IdiomaNarracao = 'en' | 'pt' | 'es'
type Genero = 'm' | 'f' | 'n'

// ── Papel e gênero do personagem da ficha ───────────────────────────────────
// Cada papel traz "masculino|feminino" por idioma; o gênero vem da ficha.
type Papel = { re: RegExp; en: string; pt: string; es: string }
const PAPEIS: Papel[] = [
  { re: /\bfisher(?:man|woman)\b/, en: 'the fisherman|the fisherwoman', pt: 'o pescador|a pescadora', es: 'el pescador|la pescadora' },
  { re: /\bsailor\b/, en: 'the sailor', pt: 'o marinheiro|a marinheira', es: 'el marinero|la marinera' },
  { re: /\b(?:captain|skipper)\b/, en: 'the captain', pt: 'o capitão|a capitã', es: 'el capitán|la capitana' },
  { re: /\b(?:scientist|geologist)\b/, en: 'the scientist', pt: 'o cientista|a cientista', es: 'el científico|la científica' },
  { re: /\bengineer\b/, en: 'the engineer', pt: 'o engenheiro|a engenheira', es: 'el ingeniero|la ingeniera' },
  { re: /\bsoldier\b/, en: 'the soldier', pt: 'o soldado|a soldado', es: 'el soldado|la soldado' },
  { re: /\bpilot\b/, en: 'the pilot', pt: 'o piloto|a piloto', es: 'el piloto|la piloto' },
  { re: /\bnurse\b/, en: 'the nurse', pt: 'o enfermeiro|a enfermeira', es: 'el enfermero|la enfermera' },
  { re: /\b(?:doctor|physician)\b/, en: 'the doctor', pt: 'o médico|a médica', es: 'el médico|la médica' },
  { re: /\bfarmer\b/, en: 'the farmer', pt: 'o agricultor|a agricultora', es: 'el agricultor|la agricultora' },
  { re: /\bminer\b/, en: 'the miner', pt: 'o mineiro|a mineira', es: 'el minero|la minera' },
  { re: /\bteacher\b/, en: 'the teacher', pt: 'o professor|a professora', es: 'el maestro|la maestra' },
  { re: /\b(?:lighthouse )?keeper\b/, en: 'the keeper', pt: 'o faroleiro|a faroleira', es: 'el farero|la farera' },
  { re: /\bexplorer\b/, en: 'the explorer', pt: 'o explorador|a exploradora', es: 'el explorador|la exploradora' },
  { re: /\bdiver\b/, en: 'the diver', pt: 'o mergulhador|a mergulhadora', es: 'el buzo|la buza' },
  { re: /\bclimber\b/, en: 'the climber', pt: 'o alpinista|a alpinista', es: 'el escalador|la escaladora' },
  { re: /\bhunter\b/, en: 'the hunter', pt: 'o caçador|a caçadora', es: 'el cazador|la cazadora' },
  { re: /\b(?:trader|merchant)\b/, en: 'the merchant', pt: 'o comerciante|a comerciante', es: 'el comerciante|la comerciante' },
  { re: /\b(?:boy|son)\b/, en: 'the boy', pt: 'o menino', es: 'el niño' },
  { re: /\b(?:girl|daughter)\b/, en: 'the girl', pt: 'a menina', es: 'la niña' },
  { re: /\bwoman\b/, en: 'the woman', pt: 'a mulher', es: 'la mujer' },
  { re: /\bman\b/, en: 'the man', pt: 'o homem', es: 'el hombre' },
]
const PAPEL_PADRAO: Papel = { re: /$^/, en: 'the survivor', pt: 'o sobrevivente|a sobrevivente', es: 'el sobreviviente|la sobreviviente' }
const escolhe = (par: string, g: Genero) => { const [m, f] = par.split('|'); return g === 'f' && f ? f : m }

export function generoDaFicha(characterSheet: string): Genero {
  const s = (characterSheet ?? '').toLowerCase()
  if (/\b(?:woman|girl|female|she|her|daughter|mother|wife|fisherwoman)\b/.test(s)) return 'f'
  if (/\b(?:man|boy|male|he|his|son|father|husband|beard|moustache|fisherman)\b/.test(s)) return 'm'
  return 'n'
}

function entradaDoPapel(characterSheet: string): Papel | null {
  const s = (characterSheet ?? '').toLowerCase()
  for (const p of PAPEIS) if (p.re.test(s)) return p
  return null
}

export function papelDoPersonagem(characterSheet: string, idioma: IdiomaNarracao = 'en'): string {
  const g = generoDaFicha(characterSheet)
  const p = entradaDoPapel(characterSheet) ?? PAPEL_PADRAO
  return escolhe(p[idioma], g)
}

/** A palavra do papel sem artigo ("fisherman"), para reconhecer o protagonista num prompt em inglês. Ficha sem papel → null (identidade não reconhecível). */
export function palavraDoPapel(characterSheet: string): string | null {
  const p = entradaDoPapel(characterSheet)
  if (!p) return null
  return escolhe(p.en, generoDaFicha(characterSheet)).replace(/^the /, '')
}

// ── Narração factual em terceira pessoa (sem depoimento inventado) ────────────
export type Conversao = { texto: string; status: 'convertida' | 'sem_primeira_pessoa' | 'nao_suportada'; motivo: string }
const cap = (t: string) => t.replace(/(^|[.!?]\s+)([a-záéíóúãõâêôçñ])/g, (_m, a, b) => a + b.toUpperCase())
const MARCA_EN = /\b(i|i'm|i've|i'd|i'll|my|mine|me|myself|we|we're|we've|we'd|we'll|our|ours|us|ourselves)\b/i
const MARCA_PT = /\b(eu|meu|minha|meus|minhas|mim|comigo|nós|nosso|nossa|nossos|nossas)\b/i
const MARCA_ES = /\b(yo|mi|mis|mío|mía|míos|mías|conmigo|nosotros|nosotras|nuestro|nuestra|nuestros|nuestras)\b/i

// EN: verbo na forma base (presente) que ganha -s na 3ª pessoa; passado irregular fica igual; auxiliares têm tabela.
const EN_AUX: Record<string, string> = { am: 'is', was: 'was', have: 'has', had: 'had', will: 'will', would: 'would', can: 'can', could: 'could', should: 'should', must: 'must', may: 'may', might: 'might', shall: 'shall', do: 'does', did: 'did', "don't": "doesn't", "didn't": "didn't", "can't": "can't", "won't": "won't", "couldn't": "couldn't", "wouldn't": "wouldn't", "haven't": "hasn't", "hadn't": "hadn't", "wasn't": "wasn't" }
const EN_PASSADO_IRREGULAR = new Set(['saw', 'knew', 'thought', 'felt', 'heard', 'ran', 'went', 'came', 'held', 'took', 'kept', 'found', 'lost', 'got', 'gave', 'made', 'let', 'put', 'set', 'cut', 'hit', 'swam', 'sank', 'fell', 'rose', 'caught', 'threw', 'brought', 'left', 'stood', 'sat', 'lay', 'slept', 'woke', 'hid', 'fought', 'won', 'broke', 'tore', 'clung', 'hung', 'flew', 'drove', 'understood', 'meant', 'told', 'said', 'began', 'became', 'spoke', 'wrote', 'ate', 'drank', 'forgot', 'froze', 'chose', 'led', 'met', 'paid', 'read', 'rode', 'shook', 'shot', 'struck', 'swept', 'taught', 'wore', 'blew', 'grew', 'drew', 'bent', 'built', 'burnt', 'dealt', 'dug', 'fed', 'bled', 'spent', 'sent', 'lent', 'bound', 'wound', 'fled', 'sought', 'sold', 'shone', 'sang', 'rang', 'sprang', 'stung', 'stuck', 'spun', 'swung', 'lit', 'bit', 'crept', 'leapt', 'knelt', 'dove', 'strove', 'clutched', 'quit', 'shut', 'split', 'spread', 'thrust', 'wept'])
const EN_BASE = new Set(['escape', 'return', 'arrive', 'depart', 'follow', 'remain', 'float', 'answer', 'fail', 'succeed', 'rescue', 'wander', 'search', 'discover', 'explore', 'travel', 'enter', 'exit', 'hurry', 'chase', 'see', 'know', 'think', 'feel','hear', 'remember', 'run', 'go', 'come', 'hold', 'grab', 'climb', 'row', 'steer', 'look', 'watch', 'wait', 'need', 'want', 'try', 'take', 'keep', 'stay', 'live', 'survive', 'believe', 'fear', 'hope', 'pray', 'shout', 'scream', 'cry', 'call', 'tell', 'say', 'ask', 'find', 'lose', 'get', 'give', 'make', 'let', 'put', 'set', 'cut', 'hit', 'swim', 'sink', 'drown', 'fall', 'rise', 'turn', 'pull', 'push', 'reach', 'catch', 'throw', 'drop', 'lift', 'carry', 'bring', 'leave', 'move', 'stand', 'sit', 'lie', 'sleep', 'wake', 'open', 'close', 'hide', 'help', 'save', 'fight', 'win', 'break', 'tear', 'cling', 'hang', 'grip', 'fly', 'drive', 'sail', 'walk', 'jump', 'dive', 'work', 'learn', 'understand', 'mean', 'love', 'hate', 'miss', 'count', 'wonder', 'guess', 'refuse', 'decide', 'manage', 'promise', 'realize', 'notice', 'recognize', 'describe', 'explain', 'plan', 'pass', 'rush', 'wash', 'fix', 'cross', 'touch', 'start', 'stop', 'begin', 'end', 'die', 'kill', 'eat', 'drink', 'sing', 'read', 'write', 'speak', 'meet', 'pay', 'build', 'send', 'spend', 'stand', 'strike', 'sweep', 'teach', 'wear', 'blow', 'grow', 'draw', 'bend', 'deal', 'dig', 'feed', 'bleed', 'lend', 'flee', 'seek', 'sell', 'shine', 'ring', 'spring', 'sting', 'stick', 'spin', 'swing', 'light', 'bite', 'creep', 'leap', 'kneel', 'strive', 'clutch', 'shut', 'split', 'spread', 'weep', 'own', 'owe', 'trust', 'doubt', 'expect', 'suppose', 'imagine', 'forget', 'choose', 'lead', 'ride', 'shake', 'shoot', 'freeze', 'wonder', 'stare', 'gaze', 'glance', 'listen', 'smell', 'taste', 'breathe', 'gasp', 'whisper', 'yell', 'beg', 'thank', 'warn', 'wish', 'dream', 'sense', 'suspect'])
// "I'd" é ambíguo (had/would): 'had' só antes de PARTICÍPIO ("I'd seen"), 'would' só antes de forma BASE ("I'd escape"); o resto é declarado não suportado (FID-V4-R1).
const EN_PARTICIPIO = new Set(['been', 'seen', 'gone', 'done', 'known', 'taken', 'given', 'made', 'had', 'come', 'run', 'held', 'kept', 'found', 'lost', 'got', 'gotten', 'fallen', 'risen', 'caught', 'thrown', 'brought', 'left', 'stood', 'sat', 'lain', 'slept', 'woken', 'hidden', 'fought', 'won', 'broken', 'torn', 'clung', 'hung', 'flown', 'driven', 'understood', 'meant', 'told', 'said', 'begun', 'become', 'spoken', 'written', 'eaten', 'drunk', 'forgotten', 'frozen', 'chosen', 'led', 'met', 'paid', 'read', 'ridden', 'shaken', 'shot', 'struck', 'swept', 'taught', 'worn', 'blown', 'grown', 'drawn', 'bent', 'built', 'burnt', 'dealt', 'dug', 'fed', 'bled', 'spent', 'sent', 'lent', 'bound', 'wound', 'fled', 'sought', 'sold', 'shone', 'sung', 'rung', 'sprung', 'stung', 'stuck', 'spun', 'swung', 'lit', 'bitten', 'crept', 'leapt', 'knelt', 'dived', 'striven', 'quit', 'shut', 'split', 'spread', 'thrust', 'wept', 'sunk', 'swum', 'felt', 'heard', 'thought', 'cut', 'hit', 'let', 'put', 'set'])
// FID-V4-R3: as classes NÃO são exclusivas ("come", "run", "put" são base E particípio). Interseção = ambíguo
// = nao_suportada com texto intacto; nenhuma classe tem prioridade. "-ed" só sugere particípio fora da base ("need").
export const EN_BASE_E_PARTICIPIO = (): string[] => [...EN_PARTICIPIO].filter((w) => EN_BASE.has(w) || w === 'be' || w === 'have' || w === 'do')
export function auxiliarDeD(seguinte: string | undefined): 'had' | 'would' | null {
  const w = (seguinte ?? '').toLowerCase()
  if (!w) return null
  const base = EN_BASE.has(w) || w === 'be' || w === 'have' || w === 'do'
  const participio = EN_PARTICIPIO.has(w) || (!base && w.length > 3 && w.endsWith('ed'))
  if (base && participio) return null
  if (participio) return 'had'
  if (base) return 'would'
  return null
}
function conjugaEn(verbo: string): string | null {
  const v = verbo.toLowerCase()
  if (EN_AUX[v]) return EN_AUX[v]
  if (v.length > 3 && v.endsWith('ed')) return v
  if (EN_PASSADO_IRREGULAR.has(v)) return v
  if (!EN_BASE.has(v)) return null
  if (v === 'have') return 'has'
  if (v === 'go' || v === 'do') return v + 'es'
  if (/(?:s|x|z|ch|sh)$/.test(v)) return v + 'es'
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies'
  return v + 's'
}

// PT/ES: 1ª pessoa → 3ª por dicionário e por sufixos INEQUÍVOCOS; o resto é declarado não suportado
// ("-i" do pretérito em PT vale para -er e -ir e vira -eu ou -iu: só o dicionário sabe).
const PT_EU: Record<string, string> = { sobrevivi: 'sobreviveu', vi: 'viu', fui: 'foi', tive: 'teve', fiz: 'fez', disse: 'disse', corri: 'correu', ouvi: 'ouviu', senti: 'sentiu', sabia: 'sabia', estava: 'estava', era: 'era', tinha: 'tinha', estou: 'está', sou: 'é', tenho: 'tem', sei: 'sabe', vejo: 'vê', lembro: 'lembra', acho: 'acha', perdi: 'perdeu', consegui: 'conseguiu', quis: 'quis', pude: 'pôde', vim: 'veio', subi: 'subiu', caí: 'caiu', entendi: 'entendeu', decidi: 'decidiu', vivi: 'viveu', morri: 'morreu', posso: 'pode', quero: 'quer', preciso: 'precisa', sinto: 'sente', vivo: 'vive', corro: 'corre', consigo: 'consegue', devo: 'deve', vou: 'vai', ia: 'ia', ando: 'anda', segui: 'seguiu', parti: 'partiu', abri: 'abriu', saí: 'saiu', dormi: 'dormiu', servi: 'serviu', menti: 'mentiu', pedi: 'pediu', escolhi: 'escolheu', bebi: 'bebeu', comi: 'comeu', aprendi: 'aprendeu', vendi: 'vendeu', escrevi: 'escreveu', li: 'leu', recebi: 'recebeu', conheci: 'conheceu', temi: 'temeu', bati: 'bateu', desci: 'desceu', esqueci: 'esqueceu', soube: 'soube', trouxe: 'trouxe', houve: 'houve', pus: 'pôs', dei: 'deu' }
const PT_NOS: Record<string, string> = { vimos: 'viram', tivemos: 'tiveram', sabíamos: 'sabiam', estávamos: 'estavam', éramos: 'eram', fomos: 'foram', fizemos: 'fizeram', somos: 'são', estamos: 'estão', temos: 'têm', sobrevivemos: 'sobreviveram', conseguimos: 'conseguiram', ouvimos: 'ouviram', sentimos: 'sentiram', perdemos: 'perderam', decidimos: 'decidiram', subimos: 'subiram', vivemos: 'viveram', corremos: 'correram', sabemos: 'sabem', podemos: 'podem', queremos: 'querem', precisamos: 'precisam', vamos: 'vão', dissemos: 'disseram', pudemos: 'puderam', soubemos: 'souberam', viemos: 'vieram', demos: 'deram', pusemos: 'puseram', trouxemos: 'trouxeram' }
const ES_YO: Record<string, string> = { recuerdo: 'recuerda', veo: 've', soy: 'es', estoy: 'está', tengo: 'tiene', vi: 'vio', fui: 'fue', tuve: 'tuvo', hice: 'hizo', dije: 'dijo', oí: 'oyó', sentí: 'sintió', sabía: 'sabía', estaba: 'estaba', era: 'era', tenía: 'tenía', sé: 'sabe', creo: 'cree', pude: 'pudo', vine: 'vino', caí: 'cayó', vivo: 'vive', quiero: 'quiere', puedo: 'puede', necesito: 'necesita', siento: 'siente', pienso: 'piensa', voy: 'va', iba: 'iba', morí: 'murió', dormí: 'durmió', pedí: 'pidió', seguí: 'siguió', preferí: 'prefirió', mentí: 'mintió', repetí: 'repitió', serví: 'sirvió', vestí: 'vistió', herví: 'hirvió', sugerí: 'sugirió', advertí: 'advirtió', convertí: 'convirtió', divertí: 'divirtió', leí: 'leyó', creí: 'creyó', huí: 'huyó', construí: 'construyó', di: 'dio', puse: 'puso', supe: 'supo', traje: 'trajo', quise: 'quiso', anduve: 'anduvo', hube: 'hubo', debo: 'debe', hago: 'hace', digo: 'dice', salgo: 'sale', vengo: 'viene', pongo: 'pone', conozco: 'conoce', oigo: 'oye' }
const ES_NOSOTROS: Record<string, string> = { vimos: 'vieron', tuvimos: 'tuvieron', sabíamos: 'sabían', estábamos: 'estaban', éramos: 'eran', fuimos: 'fueron', hicimos: 'hicieron', somos: 'son', estamos: 'están', tenemos: 'tienen', sobrevivimos: 'sobrevivieron', logramos: 'lograron', corrimos: 'corrieron', oímos: 'oyeron', sentimos: 'sintieron', perdimos: 'perdieron', decidimos: 'decidieron', subimos: 'subieron', vivimos: 'vivieron', sabemos: 'saben', podemos: 'pueden', queremos: 'quieren', necesitamos: 'necesitan', vamos: 'van', dijimos: 'dijeron', pudimos: 'pudieron', supimos: 'supieron', vinimos: 'vinieron', dimos: 'dieron', pusimos: 'pusieron', trajimos: 'trajeron' }
const conjugaPt = (v: string) => PT_EU[v] ?? (/^[a-záéíóúãõâêôç]{2,}ei$/.test(v) ? v.slice(0, -2) + 'ou' : /(?:ava|ia)$/.test(v) && v.length > 3 ? v : null)
const conjugaPtNos = (v: string) => PT_NOS[v] ?? (v.endsWith('ávamos') ? v.slice(0, -6) + 'avam' : v.endsWith('íamos') ? v.slice(0, -5) + 'iam' : null)
const conjugaEs = (v: string) => ES_YO[v] ?? (/^[a-záéíóúñ]{2,}é$/.test(v) ? v.slice(0, -1) + 'ó' : /(?:aba|ía)$/.test(v) && v.length > 3 ? v : /[^aeiouáéíóú]í$/.test(v) && v.length > 2 ? v.slice(0, -1) + 'ió' : null)
const conjugaEsNos = (v: string) => ES_NOSOTROS[v] ?? (v.endsWith('ábamos') ? v.slice(0, -6) + 'aban' : v.endsWith('íamos') ? v.slice(0, -5) + 'ían' : null)

/**
 * Fala gerada pelo planejador para um diálogo que o modo sem rosto converteu em
 * narração: vira narração FACTUAL em terceira pessoa. Sem "would later recall",
 * sem "said" — nada de testemunho inventado. Gramática, profissão e sentido
 * preservados; construção que a tabela não cobre é DECLARADA (nao_suportada)
 * e o texto volta INTACTO — nunca substituição parcial.
 */
export function narrarEmTerceiraPessoa(line: string, characterSheet: string, idioma: IdiomaNarracao = 'en'): Conversao {
  const l = (line ?? '').trim()
  if (!l) return { texto: l, status: 'sem_primeira_pessoa', motivo: 'fala vazia' }
  const g = generoDaFicha(characterSheet)
  const papel = papelDoPersonagem(characterSheet, idioma)
  let usouPapel = false
  const pendencias: string[] = []
  const naoSuportada = (motivo: string): Conversao => ({ texto: l, status: 'nao_suportada', motivo })

  if (idioma === 'en') {
    if (!MARCA_EN.test(l)) return { texto: l, status: 'sem_primeira_pessoa', motivo: 'sem 1ª pessoa' }
    const pron = g === 'f' ? 'she' : g === 'm' ? 'he' : 'they'
    const pos = g === 'f' ? 'her' : g === 'm' ? 'his' : 'their'
    const obj = g === 'f' ? 'her' : g === 'm' ? 'him' : 'them'
    const posAbs = g === 'f' ? 'hers' : g === 'm' ? 'his' : 'theirs'
    const refl = g === 'f' ? 'herself' : g === 'm' ? 'himself' : 'themselves'
    // sujeito singular (papel, he/she) conjuga o verbo; "they" (ficha sem gênero) e sujeito composto ("X and Y") não
    const sujeito = (): { s: string; singular: boolean } => { if (!usouPapel) { usouPapel = true; return { s: papel, singular: true } } return { s: pron, singular: pron !== 'they' } }
    let t = l
    t = t.replace(/\b[Mm]y ([a-z]+(?: [a-z]+)?) and I\b/g, (_m, x) => `${sujeito().s} and ${pos} ${x}`)
    t = t.replace(/\bI and my ([a-z]+)\b/g, (_m, x) => `${sujeito().s} and ${pos} ${x}`)
    t = t.replace(/\b([A-Z][a-z]+) and I\b/g, (_m, x) => `${x} and ${sujeito().s}`)
    // "I'm / I've / I'd / I'll"
    t = t.replace(/\bI'm\b/g, () => `${sujeito().s} is`).replace(/\bI've\b/g, () => { const s = sujeito(); return `${s.s} ${s.singular ? 'has' : 'have'}` }).replace(/\bI'd\b(?:\s+(never|always|still|rather|only|just|also|sooner))?(?:\s+([A-Za-z]+))?/g, (m, adv: string | undefined, w: string | undefined) => { const aux = auxiliarDeD(w); if (!aux) { pendencias.push(`"I'd" ambíguo (had/would) antes de "${w ?? ''}"`); return m } return `${sujeito().s} ${aux}${adv ? ' ' + adv : ''} ${w}` }).replace(/\bI'll\b/g, () => `${sujeito().s} will`)
    // "I [advérbio] verbo" — o verbo é conjugado; verbo desconhecido = construção não suportada
    t = t.replace(/\bI\b(?:\s+(never|always|still|often|just|also|only|really|barely|finally|suddenly|then))?\s+([A-Za-z']+)/g, (m, adv: string | undefined, verbo: string) => {
      const s = sujeito()
      const conj = s.singular ? conjugaEn(verbo) : (EN_AUX[verbo.toLowerCase()] === undefined && !EN_BASE.has(verbo.toLowerCase()) && !EN_PASSADO_IRREGULAR.has(verbo.toLowerCase()) && !verbo.toLowerCase().endsWith('ed') ? null : (verbo.toLowerCase() === 'am' ? 'are' : verbo.toLowerCase() === 'was' ? 'were' : verbo))
      if (conj === null) { pendencias.push(`verbo desconhecido após "I": ${verbo}`); return m }
      return `${s.s}${adv ? ' ' + adv : ''} ${conj}`
    })
    if (/\bI\b/.test(t)) pendencias.push('"I" fora de "I + verbo"')
    t = t.replace(/\bmyself\b/gi, refl).replace(/\bmine\b/gi, posAbs).replace(/\bmy\b/gi, pos).replace(/\bme\b/gi, obj)
    t = t.replace(/\bwe're\b/gi, 'they are').replace(/\bwe've\b/gi, 'they have').replace(/\bwe'd\b(?:\s+(never|always|still|rather|only|just|also|sooner))?(?:\s+([A-Za-z]+))?/gi, (m, adv: string | undefined, w: string | undefined) => { const aux = auxiliarDeD(w); if (!aux) { pendencias.push(`"we'd" ambíguo (had/would) antes de "${w ?? ''}"`); return m } return `they ${aux}${adv ? ' ' + adv : ''} ${w}` }).replace(/\bwe'll\b/gi, 'they will')
    t = t.replace(/\bourselves\b/gi, 'themselves').replace(/\bours\b/gi, 'theirs').replace(/\bour\b/gi, 'their').replace(/\bwe\b/gi, 'they').replace(/\bus\b/gi, 'them')
    if (pendencias.length) return naoSuportada(pendencias.join('; '))
    if (MARCA_EN.test(t.replace(/\b(?:I)\b/g, ''))) return naoSuportada('marca de 1ª pessoa restante')
    return { texto: cap(t), status: 'convertida', motivo: 'tabela EN' }
  }

  if (idioma === 'pt') {
    const temMarca = MARCA_PT.test(l) || Object.keys(PT_NOS).some((v) => new RegExp(`\\b${v}\\b`, 'i').test(l))
    if (!temMarca) return { texto: l, status: 'sem_primeira_pessoa', motivo: 'sem 1ª pessoa' }
    const pron = g === 'f' ? 'ela' : g === 'm' ? 'ele' : 'eles'
    const sujeito = () => { if (!usouPapel) { usouPapel = true; return papel } return pron }
    let t = l
    t = t.replace(/\b(?:meu|minha) ([a-záéíóúãõâêôç]+) e eu\b/gi, (_m, x) => `${sujeito()} e ${g === 'f' ? 'sua' : 'seu'} ${x}`)
    t = t.replace(/\beu\s+([a-záéíóúãõâêôç]+)/gi, (m, verbo: string) => { const c = conjugaPt(verbo.toLowerCase()); if (c === null) { pendencias.push(`verbo desconhecido após "eu": ${verbo}`); return m } return `${sujeito()} ${c}` })
    if (/\beu\b/i.test(t)) pendencias.push('"eu" fora de "eu + verbo"')
    t = t.replace(/\bnós\s+([a-záéíóúãõâêôç]+)/gi, (m, verbo: string) => { const c = conjugaPtNos(verbo.toLowerCase()); if (c === null) { pendencias.push(`verbo desconhecido após "nós": ${verbo}`); return m } return `eles ${c}` })
    for (const [v, c] of Object.entries(PT_NOS)) t = t.replace(new RegExp(`\\b${v}\\b`, 'gi'), c)
    t = t.replace(/\b([a-záéíóúãõâêôç]{3,})(ávamos|íamos)\b/gi, (_m, r: string, s: string) => r + (s.toLowerCase() === 'ávamos' ? 'avam' : 'iam'))
    t = t.replace(/\bminhas\b/gi, 'suas').replace(/\bmeus\b/gi, 'seus').replace(/\bminha\b/gi, 'sua').replace(/\bmeu\b/gi, 'seu').replace(/\bcomigo\b/gi, `com ${pron}`).replace(/\bmim\b/gi, pron)
    t = t.replace(/\bnossas\b/gi, 'suas').replace(/\bnossos\b/gi, 'seus').replace(/\bnossa\b/gi, 'sua').replace(/\bnosso\b/gi, 'seu').replace(/\bnós\b/gi, 'eles')
    if (pendencias.length) return naoSuportada(pendencias.join('; '))
    return { texto: cap(t), status: 'convertida', motivo: 'tabela PT' }
  }

  // es
  const temMarcaEs = MARCA_ES.test(l) || Object.keys(ES_NOSOTROS).some((v) => new RegExp(`\\b${v}\\b`, 'i').test(l))
  if (!temMarcaEs) return { texto: l, status: 'sem_primeira_pessoa', motivo: 'sem 1ª pessoa' }
  const pronEs = g === 'f' ? 'ella' : g === 'm' ? 'él' : 'ellos'
  const sujeitoEs = () => { if (!usouPapel) { usouPapel = true; return papel } return pronEs }
  let t = l
  t = t.replace(/\bmi ([a-záéíóúñ]+) y yo\b/gi, (_m, x) => `${sujeitoEs()} y su ${x}`)
  t = t.replace(/\byo\s+([a-záéíóúñ]+)/gi, (m, verbo: string) => { const c = conjugaEs(verbo.toLowerCase()); if (c === null) { pendencias.push(`verbo desconhecido después de "yo": ${verbo}`); return m } return `${sujeitoEs()} ${c}` })
  if (/\byo\b/i.test(t)) pendencias.push('"yo" fuera de "yo + verbo"')
  t = t.replace(/\bnosotr[oa]s\s+([a-záéíóúñ]+)/gi, (m, verbo: string) => { const c = conjugaEsNos(verbo.toLowerCase()); if (c === null) { pendencias.push(`verbo desconhecido após "nosotros": ${verbo}`); return m } return `ellos ${c}` })
  for (const [v, c] of Object.entries(ES_NOSOTROS)) t = t.replace(new RegExp(`\\b${v}\\b`, 'gi'), c)
  t = t.replace(/\b([a-záéíóúñ]{3,})(ábamos|íamos)\b/gi, (_m, r: string, s: string) => r + (s.toLowerCase() === 'ábamos' ? 'aban' : 'ían'))
  t = t.replace(/\bmis\b/gi, 'sus').replace(/\bmi\b/gi, 'su').replace(/\bmíos?\b/gi, 'suyo').replace(/\bmías?\b/gi, 'suya').replace(/\bconmigo\b/gi, `con ${pronEs}`)
  t = t.replace(/\bnuestras\b/gi, 'sus').replace(/\bnuestros\b/gi, 'sus').replace(/\bnuestra\b/gi, 'su').replace(/\bnuestro\b/gi, 'su').replace(/\bnosotr[oa]s\b/gi, 'ellos')
  if (pendencias.length) return naoSuportada(pendencias.join('; '))
  return { texto: cap(t), status: 'convertida', motivo: 'tabela ES' }
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

// ── Continuidade por IDENTIDADE EXPLÍCITA: a ficha entra no lugar da descrição do papel ─
export const fichaNormalizada = (t: string) => (t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
export const PESSOA_NO_PROMPT_RE = /\b(?:man|woman|person|boy|girl|son|daughter|sailor|fisherman|fisherwoman|captain|soldier|scientist|survivor|nurse|doctor|face|eyes|hands|he|she|his|her|him)\b/i

const AUSENCIA = '(?:is|was|remains|stays|being)\\s+(?:absent|gone|missing|nowhere(?: to be seen| in sight)?|away|elsewhere|out of (?:the )?(?:frame|shot|sight)|not (?:here|there|visible|present|in (?:the )?(?:frame|shot)))'
const papelSource = (e: Papel) => e.re.source.replace(/^\\b|\\b$/g, '')
// FID-V4-R3: a ausência só se liga ao papel quando ele é o SUJEITO DA MESMA ORAÇÃO. Entre o papel e o predicado
// de ausência não pode haver conector de oração, outra pessoa, pronome, vírgula nem ponto-e-vírgula:
// "the fisherman grips the wheel while his son is missing" é o FILHO desaparecido, não o pescador ausente.
const CONECTOR = 'while|and|but|as|because|although|though|whereas|until|when|whenever|where|who|whose|whom|that|which|if|since|yet|so|or|nor|after|before|once|unless|then|meanwhile'
const OUTRA_PESSOA = 'man|men|woman|women|person|people|boy|boys|girl|girls|son|sons|daughter|daughters|child|children|kid|kids|wife|husband|crew|sailor|sailors|captain|stranger|friend|friends|brother|sister|mother|father|family|he|she|they|him|her|his|their|them|someone|somebody|everyone|nobody'
const NAO_ATRAVESSA = `(?!(?:${CONECTOR}|${OUTRA_PESSOA})\\b)[a-z'-]+`
/** papel como sujeito + até 4 palavras da mesma oração (nenhuma delas conector/outra pessoa) + predicado de ausência */
const ausenciaDoPapel = (r: string) => `\\b${r}\\b(?:\\s+${NAO_ATRAVESSA}){0,4}\\s+${AUSENCIA}\\b`
/** O prompt DECLARA o protagonista ausente ("the fisherman is absent", "without the fisherman")? Citar o papel para negá-lo não é presença (FID-V4-R1). */
export function protagonistaAusente(prompt: string, characterSheet: string): boolean {
  const e = entradaDoPapel(characterSheet)
  if (!e) return false
  const r = papelSource(e)
  const p = prompt ?? ''
  return new RegExp(ausenciaDoPapel(r), 'i').test(p) || new RegExp(`\\b(?:no|without)\\s+(?:the\\s+|a\\s+)?${r}\\b`, 'i').test(p)
}
/** Remove SÓ a oração que declara o protagonista ausente; o resto da frase (inclusive "while his son…") fica. */
export function removerAusencia(prompt: string, characterSheet: string): string {
  const e = entradaDoPapel(characterSheet)
  if (!e) return prompt ?? ''
  const r = papelSource(e)
  const oracao = `[;,]?\\s*(?:(?:and|but|while)\\s+)?(?:(?:the|a|an|this|one)\\s+)?(?:${NAO_ATRAVESSA}\\s+){0,3}?${ausenciaDoPapel(r)}(?:\\s+(?!(?:${CONECTOR})\\b)[^\\s.;!?,]+)*`
  return (prompt ?? '')
    .replace(new RegExp(oracao, 'i'), '')
    .replace(new RegExp(`(?:,\\s*)?\\b(?:with\\s+)?(?:no|without)\\s+(?:the\\s+|a\\s+)?${r}\\b(?:\\s+(?:in sight|visible|around|present|nearby))?`, 'i'), '')
    .replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').replace(/^\s*[,;]\s*/, '').replace(/^\s*(?:while|and|but|as|then|meanwhile)\s+/i, '').trim()
}
/** O prompt nomeia o PROTAGONISTA da ficha pelo papel ("the fisherman") como PRESENTE? Pronome não identifica ninguém ("his son… he grips" é o filho); papel citado só para declará-lo ausente não conta. */
export function mencionaProtagonista(prompt: string, characterSheet: string): boolean {
  const e = entradaDoPapel(characterSheet)
  return Boolean(e && e.re.test((prompt ?? '').toLowerCase())) && !protagonistaAusente(prompt, characterSheet)
}

export type Identidade = 'ficha_no_lugar_da_descricao' | 'ficha_ja_presente' | 'ficha_prefixada' | 'sem_identidade_explicita'
const IDADE = '(?:in (?:his|her) (?:late |early |mid-)?(?:\\d{2}s|twenties|thirties|forties|fifties|sixties|seventies|eighties)|aged \\d{1,3}|\\d{1,3} years old)'
const DESCRITOR = '(?:with|wearing|holding|carrying)\\s+(?:(?![a-z-]+(?:s|ing|ed)\\b)[a-z-]+\\s+)*?[a-z-]+(?=\\s*[,.;]|\\s+[a-z]+(?:s|ing|ed)\\b|$)'
/**
 * A ficha completa substitui a DESCRIÇÃO do papel no prompt ("a rugged fisherman in
 * his 60s with a white beard" → ficha): identidade explícita, sem descrição
 * conflitante sobrando. Sem o papel no prompt, nada é assumido.
 */
export function garantirFichaNoPrompt(prompt: string, characterSheet: string): { prompt: string; identidade: Identidade } {
  const p = (prompt ?? '').trim()
  const s = (characterSheet ?? '').trim().replace(/[.\s]+$/, '')
  const e = entradaDoPapel(s)
  if (!s || !e || !e.re.test(p.toLowerCase()) || protagonistaAusente(p, s)) return { prompt: p, identidade: 'sem_identidade_explicita' }
  if (fichaNormalizada(p).includes(fichaNormalizada(s))) return { prompt: p, identidade: 'ficha_ja_presente' }
  const papelRe = e.re.source.replace(/^\\b|\\b$/g, '')
  const frase = new RegExp(`\\b(?:a|an|the|this|one)\\s+(?:(?!(?:a|an|the)\\b)[a-z-]+\\s+){0,3}?${papelRe}\\b(?:\\s+(?:${IDADE}|${DESCRITOR}))*`, 'i')
  if (frase.test(p)) return { prompt: p.replace(frase, s).replace(/\s{2,}/g, ' '), identidade: 'ficha_no_lugar_da_descricao' }
  return { prompt: `${s}. ${p}`, identidade: 'ficha_prefixada' }
}

// ── Cobertura da AÇÃO da narração pelo pedido visual: 3 estados, nunca aprovado por omissão ─
const STOP = new Set(['about', 'above', 'after', 'again', 'along', 'among', 'around', 'because', 'before', 'being', 'below', 'between', 'could', 'during', 'every', 'first', 'from', 'great', 'having', 'here', 'into', 'might', 'other', 'over', 'shall', 'should', 'since', 'their', 'there', 'these', 'those', 'through', 'today', 'toward', 'under', 'until', 'where', 'which', 'while', 'whole', 'would', 'years', 'later', 'never', 'still', 'thing', 'things', 'something', 'anything', 'people', 'story', 'history', 'night', 'moment', 'against', 'across', 'within', 'without', 'behind', 'already', 'almost', 'always', 'another', 'itself', 'himself', 'herself', 'themselves', 'ourselves', 'everything', 'nothing', 'immense', 'towering', 'astonishing', 'catastrophic', 'massive', 'colossal', 'mouth', 'closed', 'speaking', 'movement', 'camera', 'subtle', 'handheld', 'lighting', 'natural', 'imperfect', 'showing', 'shows', 'exactly', 'narration', 'describes'])
/** Radical grosseiro, suficiente para casar formas do mesmo verbo/evento (gripped/grips → grip; waves/wave → wav; collapsing/collapsed → collaps). */
export function radical(w: string): string {
  let v = w.toLowerCase()
  if (v.length > 5 && v.endsWith('ies')) v = v.slice(0, -3) + 'y'
  else if (v.length > 5 && v.endsWith('ing')) v = v.slice(0, -3)
  else if (v.length > 4 && v.endsWith('ed')) v = v.slice(0, -2)
  else if (v.length > 4 && v.endsWith('s') && !v.endsWith('ss')) v = v.slice(0, -1)
  if (/([b-df-hj-np-tv-z])\1$/.test(v)) v = v.slice(0, -1)
  if (v.length > 4 && v.endsWith('e')) v = v.slice(0, -1)
  return v
}
export function palavrasDeConteudo(texto: string): string[] {
  return (texto ?? '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length >= 5 && !STOP.has(w) && !/^\d+$/.test(w))
}
/** Palavras de AÇÃO/conteúdo da narração: menos nomes próprios (Lituya, Alaska, Empire State aparecem em todo prompt e mascaravam a ação). */
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
// Léxico de EVENTO/AÇÃO (radicais): substantivo de lugar não prova ação — "mountain village" não é "collapsed".
const EVENTOS = new Set(['landslid', 'rockslid', 'tsunami', 'wav', 'collaps', 'explos', 'explod', 'erupt', 'crash', 'flood', 'storm', 'earthquak', 'quak', 'fire', 'burn', 'fall', 'break', 'destroy', 'destruct', 'surg', 'torrent', 'avalanch', 'rescu', 'escap', 'attack', 'battl', 'surviv', 'drown', 'sink', 'strik', 'smash', 'burst', 'sweep', 'tear', 'flee', 'crush', 'shatter', 'plung', 'climb', 'steer', 'grip', 'cling', 'hold', 'grab', 'row', 'swim', 'div', 'shout', 'scream', 'pray', 'hid', 'flight', 'impact', 'blast', 'shock', 'tremor', 'wreck', 'uproot', 'topl', 'slid', 'tumbl', 'roar', 'rush', 'race', 'ran', 'run', 'jump', 'leap', 'struggl', 'fight', 'sav', 'kill', 'die', 'death', 'drift', 'sail', 'capsiz', 'overturn', 'ignit', 'melt', 'freez', 'boil', 'rise', 'ris', 'engulf', 'bury', 'buri', 'swallow', 'devour', 'ravag', 'wipe', 'rip', 'snap', 'shak', 'trembl', 'thunder', 'lightning', 'rain', 'hail', 'blizzard', 'hurrican', 'tornado', 'cyclon', 'wildfir', 'lava', 'ash', 'reshap', 'displac', 'trigger', 'generat', 'caus', 'reach', 'hit', 'struck'])
const ehAcao = (formaV: string, formaP: string, r: string) => EVENTOS.has(r) || /(?:ed|ing)$/.test(formaV) || /(?:ed|ing)$/.test(formaP)
export const ESCALA_RE = /\b(\d+(?:[.,]\d+)?)\s*(meters?|metres?|feet|foot|ft|km|kilometers?|kilometres?|miles?|tons?|tonnes?|stor(?:e)?ys|stories|floors)\b/gi
const COMPARACAO_RE = /\b(?:dwarf(?:s|ing|ed)?|taller than|higher than|as tall as|as high as|the size of|the height of|times (?:the|larger|taller|bigger|higher))\b/i
export function escalasDe(texto: string): string[] { return [...(texto ?? '').matchAll(ESCALA_RE)].map((m) => `${m[1].replace(',', '.')} ${m[2].toLowerCase().replace(/s$/, '')}`) }
export function escalaAnunciada(texto: string): boolean { return escalasDe(texto).length > 0 || COMPARACAO_RE.test(texto ?? '') }
// Sem flag global em regex de TESTE: /g + .test() guarda lastIndex e alterna o veredito entre chamadas idênticas (3ª revisão do Board).
const VIOLENTO_RE = /\b(?:landslide|rockslide|collapse[sd]?|collapsing|tsunami|wave|waves|explosion|explod\w*|erupt\w*|crash\w*|flood\w*|storm|earthquake|quake|fire|burn\w*|fall\w*|fell|break\w*|broke|destroy\w*|destruction|surge|torrent|avalanche|toppl\w*|tore|torn|swept|struck)\b/i
// 15/09 (render H3 7bb62a29): "pristine" NÃO entra — o sufixo de nitidez do router ("pristine clarity")
// vai em TODA cena hollywood e marcava as 7 cenas de um documentário de terremoto como "divergente".
// Estado da CENA (calma/intacta) ≠ qualidade da IMAGEM (nítida).
const CALMO_PALAVRAS = 'calm|still|tranquil|peaceful|quiet|serene|gentle|placid|empty|motionless|undisturbed|glassy|intact|unharmed|untouched|undamaged|unbroken|unchanged|unscathed|remains|remaining|stands untouched'
const CALMO_RE = new RegExp(`\\b(?:${CALMO_PALAVRAS})\\b`, 'i')
const calmoGlobal = () => new RegExp(`\\b(?:${CALMO_PALAVRAS})\\b`, 'gi')
export type Cobertura = { status: 'coberta' | 'divergente' | 'desconhecida' | 'sem_narracao'; motivo: string; acao: string[]; coincidencias: string[]; contradicoes: string[] }

export function avaliarCobertura(prompt: string, voiceover: string, characterSheet = ''): Cobertura {
  const v = (voiceover ?? '').trim()
  const p = (prompt ?? '')
  if (!v) return { status: 'sem_narracao', motivo: 'cena sem narração', acao: [], coincidencias: [], contradicoes: [] }
  const acao = [...new Set(palavrasDeAcao(v))]
  // sujeito errado: a narração nomeia o protagonista da ficha e o prompt mostra outra pessoa ("his son", "a young woman") sem ele
  const e = characterSheet ? entradaDoPapel(characterSheet) : null
  if (e && e.re.test(v.toLowerCase()) && protagonistaAusente(p, characterSheet)) {
    return { status: 'divergente', motivo: `sujeito ausente: o prompt declara ${palavraDoPapel(characterSheet)} ausente enquanto a narração o descreve`, acao, coincidencias: [], contradicoes: ['ausencia'] }
  }
  if (e && e.re.test(v.toLowerCase()) && PESSOA_NO_PROMPT_RE.test(p) && !mencionaProtagonista(p, characterSheet)) {
    return { status: 'divergente', motivo: `sujeito errado: a narração fala de ${palavraDoPapel(characterSheet)}, o prompt mostra outra pessoa`, acao, coincidencias: [], contradicoes: [] }
  }
  const radV = new Map<string, string>()
  for (const w of acao) if (!radV.has(radical(w))) radV.set(radical(w), w)
  const pares: Array<{ r: string; v: string; p: string }> = []
  for (const w of new Set(palavrasDeConteudo(p))) { const r = radical(w); const fv = radV.get(r); if (fv && !pares.some((x) => x.r === r)) pares.push({ r, v: fv, p: w }) }
  const coincidencias = pares.map((x) => x.p)
  const acoesCoincidentes = pares.filter((x) => ehAcao(x.v, x.p, x.r)).map((x) => x.p)
  // ação negada no prompt ("no landslide visible", "without waves")
  for (const x of pares) {
    const neg = new RegExp(`\\b(?:no|not|without|never)\\b(?:\\s+\\w+){0,2}\\s+${x.r.slice(0, 4)}\\w*`, 'i')
    if (neg.test(p)) return { status: 'divergente', motivo: `ação negada no prompt: ${x.p}`, acao, coincidencias, contradicoes: [x.p] }
  }
  // contraste: narração violenta × prompt calmo/intacto
  if (VIOLENTO_RE.test(v) && CALMO_RE.test(p)) {
    const calmas = [...new Set((p.match(calmoGlobal()) ?? []).map((w) => w.toLowerCase()))]
    return { status: 'divergente', motivo: `narração de evento violento sobre cena calma/intacta (${calmas.join(', ')})`, acao, coincidencias, contradicoes: calmas }
  }
  // escala: números com unidade divergentes
  const escV = escalasDe(v), escP = escalasDe(p)
  if (escV.length && escP.length && !escV.some((x) => escP.includes(x))) return { status: 'divergente', motivo: `escala divergente: narração ${escV.join('/')} × prompt ${escP.join('/')}`, acao, coincidencias, contradicoes: escP }
  if (escalaAnunciada(v) && !escalaAnunciada(p)) return { status: 'desconhecida', motivo: 'escala anunciada na narração ausente no prompt', acao, coincidencias, contradicoes: [] }
  // coberta exige uma palavra de AÇÃO coincidente (verbo/evento); substantivos sozinhos não provam nada
  const forte = acoesCoincidentes.length >= 1 && (coincidencias.length >= 2 || acao.length <= 2)
  if (forte) return { status: 'coberta', motivo: `ação presente: ${acoesCoincidentes.join(', ')} (+ ${coincidencias.filter((w) => !acoesCoincidentes.includes(w)).join(', ') || 'nada'})`, acao, coincidencias, contradicoes: [] }
  return { status: 'desconhecida', motivo: coincidencias.length ? `só coincidência de substantivo/nome (${coincidencias.join(', ')}), sem ação` : 'nenhuma palavra de ação no prompt', acao, coincidencias, contradicoes: [] }
}

export function primeiraFrase(texto: string): string {
  const m = (texto ?? '').trim().match(/^[^.!?]+[.!?]?/)
  return (m ? m[0] : (texto ?? '')).trim().slice(0, 200)
}

/**
 * Só 'coberta' deixa o prompt como está. Divergente: a contradição identificada é
 * REMOVIDA (cláusula negada, adjetivo calmo/intacto, escala do prompt) e a frase da
 * narração abre o pedido. Desconhecida: abre com a frase (declarada, não aprovada
 * por omissão). Nunca duas ordens opostas no mesmo prompt.
 */
export function garantirAcaoCentral(prompt: string, voiceover: string, characterSheet = ''): { prompt: string; cobertura: Cobertura } {
  const cobertura = avaliarCobertura(prompt, voiceover, characterSheet)
  let p = (prompt ?? '').trim()
  if (cobertura.status === 'coberta' || cobertura.status === 'sem_narracao') return { prompt: p, cobertura }
  if (cobertura.status === 'divergente') {
    if (/^sujeito (?:errado|ausente)/.test(cobertura.motivo)) {
      // a direção incompatível SAI: cláusula de ausência removida e o sujeito da frase vira o da narração (não se prefixa ordem oposta)
      p = removerAusencia(p, characterSheet)
      const papelEn = papelDoPersonagem(characterSheet, 'en')
      p = cap(p.replace(/(^|[.;!?]\s+)(?:only\s+)?(?:his|her|their|the|a|an)\s+(?:(?:young|old|little|small|teenage|frightened|exhausted|lone)\s+)?(?:son|daughter|boy|girl|child|kid|wife|husband|crew|sailor|stranger|friend|brother|sister|mother|father|man|woman)\b/gi, (_m, ini: string) => `${ini}${papelEn}`))
    }
    if (/^ação negada/.test(cobertura.motivo)) {
      for (const w of cobertura.contradicoes) {
        const r = radical(w).slice(0, 4)
        p = p.replace(new RegExp(`(?:,\\s*)?(?:\\b(?:with|but|and|while)\\s+)?\\b(?:no|not|without|never)\\b(?:\\s+\\w+){0,2}\\s+${r}\\w*(?:\\s+(?!(?:the|a|an)\\b)\\w+){0,3}?(?=\\s*[,.;]|$)`, 'i'), '')
      }
    }
    if (/cena calma/.test(cobertura.motivo)) p = p.replace(calmoGlobal(), ' ')
    if (/^escala divergente/.test(cobertura.motivo)) p = p.replace(ESCALA_RE, ' ')
    p = p.replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').replace(/,\s*,/g, ',').replace(/^\s*,\s*/, '').trim()
  }
  // Sem aspas: aspas no prompt de imagem viram fala na boca de alguém (2ª revisão do Board).
  return { prompt: `Shows exactly this moment, as the narration describes it: ${primeiraFrase(voiceover).replace(/["“”]/g, '')} ${p}`.replace(/\s{2,}/g, ' ').trim(), cobertura }
}

// ── A cadeia no planejador: conversão sem rosto + despersonalizar + ficha ────
export interface CenaPlano { index?: number; type: string; prompt: string; voiceover?: string; dialogueLine?: string; needsNarration?: boolean; seconds?: number; conversao?: Conversao['status']; identidade?: Identidade }
export type RelatoCena = { index: number | undefined; convertida: boolean; conversao: Conversao['status'] | null; motivo: string | null; identidade: Identidade | null }
export function aplicarFidelidadeAoPlano<T extends CenaPlano>(scenes: T[], characterSheet: string, idioma: IdiomaNarracao = 'en', semRosto = true): RelatoCena[] {
  const relato: RelatoCena[] = []
  for (const sc of scenes) {
    let convertida = false
    let conversao: Conversao['status'] | null = null
    let motivo: string | null = null
    if (semRosto && sc.type === 'dialogue') {
      const line = (sc.dialogueLine ?? '').trim()
      sc.type = 'support'
      if (line) {
        const c = narrarEmTerceiraPessoa(line, characterSheet, idioma)
        // Não suportada: o texto fica INTACTO e o estado é declarado (nunca substituição parcial).
        sc.voiceover = c.texto
        sc.needsNarration = true
        sc.conversao = c.status
        conversao = c.status
        motivo = c.motivo
      }
      delete sc.dialogueLine
      convertida = true
    }
    let identidade: Identidade | null = null
    if (sc.type !== 'dialogue') {
      const r = garantirFichaNoPrompt(despersonalizarPrompt(silenciarFalaNoPrompt(sc.prompt), characterSheet), characterSheet)
      sc.prompt = r.prompt
      sc.identidade = r.identidade
      identidade = r.identidade
    }
    relato.push({ index: sc.index, convertida, conversao, motivo, identidade })
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
  // Board: nunca tirar 1 s de uma cena cuja folga ESTIMADA é pequena; estimativa não é áudio medido.
  // 15/09 (render H3 7bb62a29, 45 cr estornados, 7 clipes pagos ao fal perdidos): com o limiar de 1,25 s
  // a apara deixava 0,25–0,4 s de sobra, e a voz REAL (persona idosa, onyx 0,94) estourou o clipe em 3
  // cenas → o compose recusou "scene_speech_exceeds_footage" DEPOIS de pagar. Agora só se apara onde
  // sobra ≥ 1 s depois do corte (folga estimada ≥ 2,0 s); o resto é excedente declarado no claim.
  while ((totalSil() > 7.5 || total() > duration * 1.05) && total() - 1 >= duration && guard-- > 0) {
    const alvo = scenes.filter((sc) => (sc.seconds || 0) > 4 && silencio(sc) >= 2.0).sort((a, b) => silencio(b) - silencio(a))[0]
    if (!alvo) break
    alvo.seconds = (alvo.seconds || 0) - 1
    aparado++
  }
  const excedente = Math.max(0, Math.round((total() - duration * 1.05) * 10) / 10)
  return { aparado, excedente, reconciliado: excedente === 0 }
}
