// ═══ KINEO-PROTAGONISTA-SEEDANCE-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai personagem"] — O ELENCO SEMÂNTICO ═══
//
// O DEFEITO (renders de 01/11, conector, Seedance 1.5 de 15 s, "Use my script as is"):
//   · BRO (faaa6054): "BRO the muscular pigeon … a bright pink unicorn mane" → o elenco era só "the bright pink unicorn";
//   · Mila (93b10f01): Mila e o Skoczuś viraram "towering giant" (o gigante era a FLOR do roteiro);
//   · Max (39523e3f): Max virou "a small brown and white puppy" (o filhote que ele salva).
// Três rodadas de regex/léxico em lib/cinematic/folhaDePersonagem.ts consertaram esses três e quebraram outros reais
// ("Pigeon Forge" fazia da Sarah um pombo; "Imagine a dragon" virava o personagem "Imagine"; "Death Valley" virava conto fofo).
// Quem é personagem, o que ele é e quem é o protagonista é LEITURA DE TEXTO — não cabe em lista de palavras.
//
// O DESENHO (decisão de arquitetura de 01/11):
//   1. UMA chamada curta ao gpt-4o-mini (o mesmo modelo e o mesmo caminho HTTP do casting da folha), JSON estrito,
//      temperature 0, prazo ~4 s, 1 tentativa extra. Devolve {protagonist, supporting (≤3), places_and_orgs}.
//   2. O CÓDIGO confere a resposta contra o texto: nome tem de estar no texto; espécie de bicho/criatura tem de estar no texto;
//      aparência só fica se as palavras dela estão no texto; lugar/empresa listado nunca vira personagem. Dúvida = descarta.
//   3. FALHA SEGURA: sem chave, erro, prazo, JSON inválido, protagonista sem nome ou que não passa na conferência →
//      `null` e a rota segue o elenco determinístico de sempre (elencoDoRoteiro), byte a byte.
//   4. Com protagonista NOMEADO válido: o elenco do pedido passa a ser o semântico (protagonista + 1 coadjuvante, o teto
//      PERSONAGEM_MAX_PERSONAGENS); quem o determinístico já acertou (mesmo nome, mesmo tipo e espécie) fica com a ficha de
//      antes; figura mítica/da tabela (origem 'mitica') nunca é trocada. A lista de nomes válidos vai à camada elencoEpoca,
//      que deixa de inserir nome que não é personagem (lugar, "Lena is gone").
// Escopo: estrada clássica (Seedance/Kling 2.5/Veo) em character_story, incluindo o filme grátis de 15 s. Hollywood/Kling 4
// não chamam (docs/calibracao/protagonista-seedance-0111.json). Módulo puro + uma função de rede com fetch injetável.
import { canonicaDeterministica, PERSONAGEM_CASTING_MODELO, PERSONAGEM_MAX_PERSONAGENS, type FichaDePersonagem, type TipoDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { descricaoDoSerPersonificado } from '@/lib/cinematic/seresFieis'

export const MARCA_ELENCO_SEMANTICO = 'KINEO-PROTAGONISTA-SEEDANCE-0111'
export const ELENCO_SEMANTICO_VERSAO = 'elenco_semantico_v1'
export const ELENCO_SEMANTICO_MODELO: string = PERSONAGEM_CASTING_MODELO
export const ELENCO_SEMANTICO_PRAZO_MS = 4_000
export const ELENCO_SEMANTICO_TENTATIVAS = 2
export const ELENCO_SEMANTICO_MAX_COADJUVANTES = 3
/** Custo de log (US$): ~700 tokens de entrada + ~150 de saída no gpt-4o-mini. */
export const ELENCO_SEMANTICO_USD = 0.0002

export type KindSemantico = 'human' | 'animal' | 'creature' | 'object'
export interface PersonagemSemantico {
  /** O nome como o texto escreve ("BRO", "Captain Ahab") ou null para papel sem nome. */
  name: string | null
  /** Papel sem nome ("stray puppy", "old fisherman"); só quando name é null. */
  role: string | null
  kind: KindSemantico
  /** O substantivo que o TEXTO usa para o que ele é ("pigeon", "golden retriever"); gente: o papel ou 'human'. */
  species: string | null
  appearance_from_text: string
  gender_if_stated: 'male' | 'female' | null
  age_if_stated: 'child' | 'teen' | 'adult' | 'elderly' | null
}
export interface ElencoSemantico {
  protagonist: PersonagemSemantico | null
  supporting: PersonagemSemantico[]
  places_and_orgs: string[]
}

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const semTags = (t: string) => limpa(String(t ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/\*\*/g, ' '))
const TEXTO_MAX = 4000

const SISTEMA = [
  'You read the narration script of a short film and return its CAST as strict JSON.',
  'RULES:',
  '1. A character is a being that has a name or a role (the boy, the old fisherman, the stray puppy) AND acts in the story (does, says, feels or is shown doing something). A named person the story is about is a character even when they are missing, dead, absent or only described (missing-person cases, true crime, history): in "Maura Murray vanished in 2004" Maura Murray is the protagonist.',
  '2. NEVER a character: places (cities, towns, lakes, rivers, mountains, parks, streets, shops, stations) even when the place name contains an animal or creature word (Pigeon Forge, Swan Lake, Eagle Peak, Beaver Creek, Death Valley); companies, brands, apps, organizations, agencies, teams, bands; ships, planes, cars, trucks and other vehicles; titles of films, shows, ballets, books and songs; products; events; abstract ideas and metaphors; the narrator; the viewer ("you"); and imperative or opening words at the start of a sentence (Imagine, Picture, Watch, Meet, Wait, Stop, Run, Never, Only, POV, OMG, Later, Finally, Meanwhile, Not).',
  '3. An animal or creature word used as an ADJECTIVE of a thing is not a character: "a unicorn mane", "a dragon-shaped cake", "a ghost flight", "a bear hug", "a dinosaur blanket".',
  '4. A named object, food or vehicle that talks or acts like a person (Broccoli opens his eyes; the fridge replies) IS a character with kind "object". A named real person, historical figure or celebrity is kind "human".',
  '5. kind is one of "human", "animal", "creature" (fantasy, mythical, robot, alien, dinosaur, monster, ghost), "object". species is the exact noun the TEXT uses for what this character is ("pigeon", "golden retriever", "cat", "tiny robot", "baby elephant", "broccoli"); for a human use the role noun the text gives ("boy", "nurse", "old man") or "human". Never guess a species: if the text never says what a named being is, it is kind "human", species "human". A real-world species stays kind "animal" even in a cartoon (cockroach, panda, pigeon, dog). A named being stays human even when an animal appears near it: in "Max picks up a stray puppy" Max is a human and the puppy is a separate character.',
  '6. A pet or animal that belongs to someone ("his cat Whiskers", "a rescue horse named Thunder", "my golden retriever Luna") has that species; its owner is a different character.',
  '7. appearance_from_text: ONLY words the text itself uses to describe how THIS character LOOKS (visible physical traits: hair, clothes, colours, size, body), copied verbatim, at most 15 words; "" if the text gives none. Actions, places, poses and states are NOT appearance. Examples: "A stray puppy shivers in the rain" → ""; "Ahab stands on the deck in the storm" → ""; "Skoczuś, fast asleep, snoring" → ""; "Broccoli opens his eyes" → ""; "Mila, with her turquoise hair and star-shaped backpack" → "turquoise hair and star-shaped backpack"; "BRO the muscular pigeon is bald" → "muscular, bald"; "Avocado, wearing sunglasses" → "wearing sunglasses". Never invent; never write "none".',
  '8. gender_if_stated: "male", "female" or null, only from pronouns or nouns that clearly refer to THIS character. age_if_stated: "child", "teen", "adult", "elderly" or null, and age_evidence: the exact words of the text that state that age ("a little girl", "an 18-year-old", "the old man", "baby elephant"); if the text does not state the age, age_if_stated is null and age_evidence is "". A name alone never tells the age.',
  '9. protagonist: the character the story follows the most: the one who is the subject of the most sentences; a character introduced with "Meet X" is usually the protagonist. If the main character has no name, set name null and role to the role noun phrase ("old fisherman"). If the script has no character at all (pure facts, places, objects that do not act), protagonist is null.',
  '10. supporting: up to 3 other characters that are PRESENT and do something in the story, the most important first, with the same fields; someone only mentioned as absent, gone, dead, remembered or talked about ("Lena is gone") is not a supporting character. For every character also answer on_screen: true if the text shows them physically present doing something in the story, false if they are only mentioned (gone, missing, remembered, talked about). places_and_orgs: every capitalized name in the text that is NOT a character (places, organizations, vehicles, titles, products).',
  '11. name is a PROPER NAME only, copied exactly as written in the text (keep its capitalization; full name if the text gives it, e.g. "Sarah Collins"). A description such as "the old wolf" or "the soldier" is not a name: put it in role and set name to null.',
  'Reply ONLY with JSON: {"protagonist":{"name":string|null,"role":string|null,"kind":"human"|"animal"|"creature"|"object","species":string|null,"appearance_from_text":string,"gender_if_stated":"male"|"female"|null,"age_if_stated":"child"|"teen"|"adult"|"elderly"|null,"age_evidence":string,"on_screen":boolean}|null,"supporting":[...same shape...],"places_and_orgs":[string]}',
].join('\n')

export function mensagensDoElencoSemantico(texto: string): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: SISTEMA },
    { role: 'user', content: `SCRIPT:\n${semTags(texto).slice(0, TEXTO_MAX)}` },
  ]
}

// ═══ A conferência contra o texto (o código decide se a leitura do modelo pode entrar) ═══════════════════════════
const palavraNoTexto = (texto: string, w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(w)}(?![\\p{L}\\p{N}])`, 'iu').test(texto)
/** "pigeon" está no texto como "pigeon"/"pigeons"; "golden retriever" pela última palavra (o núcleo). */
function especieNoTexto(texto: string, especie: string): boolean {
  const nucleo = limpa(especie).toLowerCase().split(' ').pop() ?? ''
  if (nucleo.length < 2) return false
  const formas = [nucleo, `${nucleo}s`, `${nucleo}es`, nucleo.replace(/s$/, ''), nucleo.replace(/ies$/, 'y')]
  return formas.some((f) => f.length >= 2 && palavraNoTexto(texto, f))
}
/** A aparência só fica quando ≥ 80% das palavras de conteúdo (≥ 3 letras) estão no texto — o modelo não inventa roupa. */
function aparenciaDoTexto(texto: string, aparencia: string): string {
  const a = limpa(aparencia).replace(/^["']|["']$/g, '').slice(0, 160)
  if (!a || /^(?:none|n\/a|null|unknown)$/i.test(a)) return ''
  const palavras = a.toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter((w) => w.length >= 3)
  if (palavras.length === 0) return ''
  const t = texto.toLowerCase()
  const achadas = palavras.filter((w) => t.includes(w)).length
  return achadas / palavras.length >= 0.8 ? a.split(' ').slice(0, 15).join(' ').replace(/[\s,;.]+$/, '') : ''
}

const KINDS: readonly KindSemantico[] = ['human', 'animal', 'creature', 'object']
function lerPersonagem(bruto: unknown, texto: string, lugares: readonly string[]): PersonagemSemantico | null {
  if (!bruto || typeof bruto !== 'object') return null
  const o = bruto as Record<string, unknown>
  const kind = typeof o.kind === 'string' ? (o.kind.toLowerCase() as KindSemantico) : null
  if (!kind || !KINDS.includes(kind)) return null
  const nomeBruto = typeof o.name === 'string' && limpa(o.name) && limpa(o.name).toLowerCase() !== 'null' ? limpa(o.name) : null
  // "the old wolf" no campo do nome é descrição, não nome próprio: vira papel (nome próprio começa com maiúscula e sem artigo)
  const descricaoNoNome = !!nomeBruto && (/^(?:a|an|the)\s/i.test(nomeBruto) || !/^\p{Lu}/u.test(nomeBruto))
  const name = descricaoNoNome ? null : nomeBruto
  const roleBruto = descricaoNoNome ? nomeBruto : typeof o.role === 'string' && limpa(o.role) && limpa(o.role).toLowerCase() !== 'null' ? limpa(o.role) : null
  const role = !name && roleBruto ? roleBruto.replace(/^(?:a|an|the)\s+/i, '').toLowerCase() : null
  if (!name && !role) return null
  if (name) {
    if (name.length > 40 || !palavraNoTexto(texto, name)) return null // nome que o texto não escreve = inventado
    if (lugares.some((l) => l.toLowerCase() === name.toLowerCase())) return null // o próprio modelo disse que é lugar/empresa
  }
  if (role && !especieNoTexto(texto, role)) return null
  const speciesBruta = typeof o.species === 'string' && limpa(o.species) ? limpa(o.species).toLowerCase() : null
  let species: string | null = speciesBruta
  if (kind === 'human') species = speciesBruta && speciesBruta !== 'human' && especieNoTexto(texto, speciesBruta) ? speciesBruta : 'human'
  else if (kind === 'object') species = speciesBruta && especieNoTexto(texto, speciesBruta) ? speciesBruta : name ? name.toLowerCase() : role
  else if (!speciesBruta || !especieNoTexto(texto, speciesBruta)) return null // bicho/criatura sem a espécie escrita no texto: não confiamos
  const g = o.gender_if_stated
  const gender = g === 'male' || g === 'female' ? g : null
  const a = o.age_if_stated
  // a idade só fica com a prova: as palavras do texto que a dizem (o modelo deu "child" ao Max sem o texto dizer)
  const prova = typeof o.age_evidence === 'string' ? limpa(o.age_evidence).replace(/^["']|["']$/g, '') : ''
  const age = (a === 'child' || a === 'teen' || a === 'adult' || a === 'elderly') && prova.length >= 3 && palavraNoTexto(texto, prova) ? a : null
  return { name, role, kind, species, appearance_from_text: aparenciaDoTexto(texto, typeof o.appearance_from_text === 'string' ? o.appearance_from_text : ''), gender_if_stated: gender, age_if_stated: age }
}

/** Lê e confere a resposta. JSON inválido ou fora do formato → null (a rota segue o determinístico). */
export function lerElencoSemantico(raw: string, textoOriginal: string): ElencoSemantico | null {
  let parsed: unknown
  try { parsed = JSON.parse(String(raw ?? '')) } catch { return null }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const o = parsed as Record<string, unknown>
  if (!('protagonist' in o)) return null
  const texto = semTags(textoOriginal)
  const lugares = Array.isArray(o.places_and_orgs) ? o.places_and_orgs.filter((x): x is string => typeof x === 'string' && !!limpa(x)).map(limpa).slice(0, 20) : []
  if (o.protagonist !== null && (typeof o.protagonist !== 'object' || Array.isArray(o.protagonist))) return null
  const protagonist = o.protagonist === null ? null : lerPersonagem(o.protagonist, texto, lugares)
  if (o.protagonist !== null && !protagonist) return null // protagonista que não passa na conferência: nada do modelo entra
  const supporting = (Array.isArray(o.supporting) ? o.supporting : []).slice(0, ELENCO_SEMANTICO_MAX_COADJUVANTES)
    // coadjuvante que o próprio modelo diz que só é citado (on_screen false: "Lena is gone") não entra em cena
    .filter((s) => !(s && typeof s === 'object' && (s as { on_screen?: unknown }).on_screen === false))
    .map((s) => lerPersonagem(s, texto, lugares)).filter((s): s is PersonagemSemantico => !!s)
    .filter((s) => !protagonist || chave(s) !== chave(protagonist))
  return { protagonist, supporting, places_and_orgs: lugares }
}
const chave = (p: PersonagemSemantico) => (p.name ?? p.role ?? '').toLowerCase()

// ═══ A rede (uma chamada, 1 tentativa extra; nunca lança) ═════════════════════════════════════════════════════════
export type StatusElencoSemantico = 'ok' | 'sem_chave' | 'falhou' | 'json_invalido' | 'vazio'
export async function pedirElencoSemantico(texto: string, opts?: { timeoutMs?: number; tentativas?: number; fetchImpl?: typeof fetch; apiKey?: string }): Promise<{ elenco: ElencoSemantico | null; status: StatusElencoSemantico; tentativas: number; ms: number; raw: string | null }> {
  const t0 = Date.now()
  if (!semTags(texto)) return { elenco: null, status: 'vazio', tentativas: 0, ms: 0, raw: null }
  const key = opts?.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { elenco: null, status: 'sem_chave', tentativas: 0, ms: 0, raw: null }
  const doFetch = opts?.fetchImpl ?? fetch
  const max = Math.max(1, Math.min(3, opts?.tentativas ?? ELENCO_SEMANTICO_TENTATIVAS))
  let status: StatusElencoSemantico = 'falhou'
  let raw: string | null = null
  let n = 0
  for (; n < max; n++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? ELENCO_SEMANTICO_PRAZO_MS)
    try {
      const res = await doFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: ELENCO_SEMANTICO_MODELO, temperature: 0, max_tokens: 500, response_format: { type: 'json_object' }, messages: mensagensDoElencoSemantico(texto) }),
      })
      if (!res.ok) { status = 'falhou'; continue }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      raw = data.choices?.[0]?.message?.content ?? ''
      const elenco = lerElencoSemantico(raw, texto)
      if (elenco) return { elenco, status: 'ok', tentativas: n + 1, ms: Date.now() - t0, raw }
      status = 'json_invalido'
    } catch {
      status = 'falhou'
    } finally {
      clearTimeout(timer)
    }
  }
  return { elenco: null, status, tentativas: n, ms: Date.now() - t0, raw }
}

// ═══ Do elenco semântico às fichas que o pipeline já usa ══════════════════════════════════════════════════════════
const TIPO: Record<KindSemantico, TipoDePersonagem> = { human: 'humano', animal: 'animal', creature: 'criatura', object: 'criatura' }

/** A palavra do nome que a cena mais usa ("Roland Pernicus Oznard" → "Roland"; "Captain Ahab" → "Ahab"): vira o núcleo. */
function nucleoDoNome(nome: string, texto: string): string {
  const partes = nome.split(/\s+/).filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 2)
  if (partes.length <= 1) return nome
  let melhor = partes[partes.length - 1]
  let max = -1
  for (const w of partes) {
    const n = (texto.match(new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(w)}(?![\\p{L}\\p{N}])`, 'giu')) ?? []).length
    if (n > max || (n === max && w === partes[partes.length - 1])) { max = n; melhor = w }
  }
  return melhor.replace(/[^\p{L}\p{N}'-]/gu, '')
}

/** O papel sintético que alimenta o gerador determinístico (idade/gênero vêm do texto, não do sorteio). */
function papelSintetico(p: PersonagemSemantico): string {
  const f = p.gender_if_stated === 'female', m = p.gender_if_stated === 'male'
  switch (p.age_if_stated) {
    case 'child': return f ? 'girl' : m ? 'boy' : 'child'
    case 'teen': return f ? 'teen woman' : m ? 'teen man' : 'teen'
    case 'elderly': return f ? 'old woman' : m ? 'old man' : 'old'
    default: return f ? 'woman' : m ? 'man' : ''
  }
}

function frasesDoNome(texto: string, nome: string): string {
  return texto.split(/(?<=[.!?…])\s+|\n+/).filter((f) => palavraNoTexto(f, nome)).join(' ')
}

function fichaDe(p: PersonagemSemantico, texto: string, protagonista: boolean, usados: Set<string>): FichaDePersonagem {
  const tipo = TIPO[p.kind]
  const nome = p.name ?? `the ${p.role}`
  // a aparência do texto só entra na ficha do PROTAGONISTA: na calibração as do protagonista eram traços ("turquoise hair", "muscular,
  // bald", "torn clothes"); nas dos coadjuvantes o modelo pôs ação ("shivers in the rain", "fast asleep") — o coadjuvante fica com a determinística
  const aparencia = protagonista ? p.appearance_from_text : ''
  if (p.kind === 'object') {
    return { nome, nucleo: p.name ? nucleoDoNome(p.name, texto) : (p.role ?? nome).split(' ').pop()!, tipo, canonica: descricaoDoSerPersonificado(nome, p.species ?? nome), origem: 'deterministica', protagonista, genero: null }
  }
  if (p.kind === 'human') {
    const papel = papelSintetico(p)
    const genero = p.gender_if_stated === 'female' ? 'woman' : p.gender_if_stated === 'male' ? 'man' : null
    const nucleo = p.name ? nucleoDoNome(p.name, texto) : (p.role ?? '').split(' ').pop() ?? nome
    if (aparencia) {
      const quem = papel === 'girl' ? 'a girl about nine years old' : papel === 'boy' ? 'a boy about nine years old' : papel === 'child' ? 'a child about nine years old'
        : papel.startsWith('teen') ? `a ${papel === 'teen woman' ? 'girl' : papel === 'teen man' ? 'boy' : 'teenager'} about sixteen years old`
        : papel.startsWith('old') ? `an ${papel === 'old' ? 'elderly person' : papel.replace('old', 'elderly')}` : papel ? `a ${papel}` : 'a person'
      return { nome, nucleo, tipo, canonica: `${nome}, exactly as the author wrote: "${aparencia}", ${quem}`, origem: 'autor', protagonista, genero }
    }
    return { nome, nucleo, tipo, canonica: canonicaDeterministica(nome, 'humano', null, `${papel} | `, usados), origem: 'deterministica', protagonista, genero }
  }
  const especie = (p.species ?? '').toLowerCase()
  const nucleo = especie.split(' ').pop() ?? especie
  if (aparencia) return { nome, nucleo, tipo, canonica: `${nome}, a ${especie}, exactly as the author wrote: "${aparencia}"`, origem: 'autor', protagonista, genero: null }
  const contexto = `${p.age_if_stated === 'child' ? 'baby ' : ''}${especie} | ${frasesDoNome(texto, p.name ?? nucleo)}`
  return { nome, nucleo, tipo, canonica: canonicaDeterministica(nome, tipo, nucleo, contexto, usados), origem: 'deterministica', protagonista, genero: null }
}

const mesmoNome = (a: string, b: string) => a.toLowerCase().replace(/^the\s+/, '') === b.toLowerCase().replace(/^the\s+/, '')

export interface ElencoAplicado {
  elenco: FichaDePersonagem[]
  /** Todos os nomes que o modelo leu como personagem (protagonista + até 3 coadjuvantes), para a camada elencoEpoca. */
  nomes: string[]
  protagonista: string
  naoPersonagens: string[]
  /** fichas novas (o determinístico errava) e fichas mantidas (o determinístico já acertava) */
  novas: string[]
  mantidas: string[]
}

/**
 * O elenco do pedido com o semântico. Só age com protagonista NOMEADO (onde o defeito acontece); senão null = o elenco de
 * sempre. Quem o determinístico já acertou (mesmo nome + mesmo tipo + mesma espécie) e figura mítica ficam com a ficha de antes.
 */
export function aplicarElencoSemantico(base: ReadonlyArray<FichaDePersonagem>, sem: ElencoSemantico | null, textoOriginal: string): ElencoAplicado | null {
  if (!sem || !sem.protagonist || !sem.protagonist.name) return null
  const texto = semTags(textoOriginal)
  const todos = [sem.protagonist, ...sem.supporting]
  const usados = new Set<string>()
  const novas: string[] = []
  const mantidas: string[] = []
  const elenco = todos.slice(0, PERSONAGEM_MAX_PERSONAGENS).map((p, i): FichaDePersonagem => {
    const nome = p.name ?? `the ${p.role}`
    const antes = base.find((f) => mesmoNome(f.nome, nome))
    const tipo = TIPO[p.kind]
    const especieBate = (f: FichaDePersonagem) => tipo === 'humano' || !p.species || f.canonica.toLowerCase().includes((p.species.split(' ').pop() ?? '').toLowerCase())
    if (antes && ((antes.origem as string) === 'mitica' || (antes.tipo === tipo && especieBate(antes)))) { mantidas.push(antes.nome); return { ...antes, protagonista: i === 0 } }
    novas.push(nome)
    return fichaDe(p, texto, i === 0, usados)
  })
  return {
    elenco,
    nomes: todos.map((p) => p.name ?? `the ${p.role}`),
    protagonista: elenco[0].nome,
    naoPersonagens: [...sem.places_and_orgs],
    novas,
    mantidas,
  }
}

/** Relato de log/evento: nomes e tipos (nunca o texto do cliente). */
export function relatoDoElencoSemantico(r: { status: StatusElencoSemantico; tentativas: number; ms: number }, aplicado: ElencoAplicado | null) {
  return {
    version: ELENCO_SEMANTICO_VERSAO,
    status: r.status,
    tentativas: r.tentativas,
    ms: Math.max(0, Math.round(r.ms)),
    aplicado: !!aplicado,
    elenco: aplicado ? aplicado.elenco.map((f) => ({ nome: f.nome, tipo: f.tipo, origem: f.origem, protagonista: f.protagonista })) : [],
    novas: aplicado?.novas ?? [],
    mantidas: aplicado?.mantidas ?? [],
  }
}
