// KINEO-PROTAGONISTA-SEEDANCE-0111 — a régua da calibração do elenco semântico (usada pelo calibrador e pelo guardião).
// Erro GRAVE: pessoa virando bicho/criatura; personagem inventado (lugar, empresa, palavra de abertura); protagonista errado;
// rodada 10: criança/adolescente com idade escrita virando adulto na FICHA aplicada (aplicarElencoSemantico sobre o elenco de sempre).
// rodada 12: a idade "literal" esperada é a palavra do autor (o trecho copiado entra como ele escreveu), sem diferença de caixa.
// rodada 14 (NÃO INTERPRETAR IDADE NEM GÊNERO): a ficha do trecho do autor ("Zoe, 6yo, exactly as the author wrote") não pode ter NENHUMA
// palavra de pessoa/faixa nossa fora do trecho (grave: faixa_inventada) nem gênero que contradiz o caso (grave: genero_contradiz); gênero
// ausente não é erro. A faixa esperada do caso é a verdade do rótulo (lida por um humano), usada só para achar contradição. Na ficha do
// gerador (sem trecho aceito: a base), faixa contraditória (criança adulta, idoso criança, bebê idoso) com o elenco aplicado = grave.
// rodada 15: ficha do trecho do autor sem origem 'autor' = grave (casting_reescreve) — o casting do 15 s a reescreveria.
import { aplicarElencoSemantico, type ElencoSemantico, type PersonagemSemantico } from '../../lib/cinematic/elencoSemantico'
import { elencoDoRoteiro } from '../../lib/cinematic/personagemAjuste'
import type { FichaDePersonagem } from '../../lib/cinematic/folhaDePersonagem'

export type FaixaEtaria = 'baby' | 'toddler' | 'child' | 'teen' | 'adult' | 'elderly'
export interface Caso {
  id: string; fonte: string; texto: string; video_id?: string
  /** nomes aceitos para o protagonista; null na lista = "sem protagonista nomeado" também vale; null = não pode haver protagonista nomeado */
  protagonista: Array<string | null> | null
  tipo: 'human' | 'animal' | 'creature' | 'object' | null
  /** a espécie em INGLÊS que a ficha deve dizer (PT/ES: a tradução; lista = qualquer uma vale) */
  especie: string | string[] | null
  proib?: string[]; humanos?: string[]; animais?: Record<string, string>; especiesProibidas?: string[]
  proibTipo?: Record<string, string>; livre?: boolean; fallbackOk?: boolean
  /** só citados ("Lena is gone"): não podem entrar como coadjuvante em cena */
  ausentes?: string[]
  /** rodada 10: o que a FICHA aplicada tem de dizer de cada pessoa (faixa verdadeira, gênero, idade literal, idade que NÃO pode aparecer) */
  fichas?: Record<string, { faixa?: FaixaEtaria | FaixaEtaria[]; genero?: 'male' | 'female'; literal?: string; semLiteral?: string }>
}
export interface Nota { acerto: boolean; graves: string[]; erros: string[]; protagonista: string | null; kind: string | null; species: string | null; fallback: boolean }

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim()
const palavras = (s: string) => norm(s).split(' ').filter(Boolean)
/** "Sarah" casa "Sarah Collins"; "Swan" casa "Swan Lake"; nunca "man" em "woman". */
export function casaNome(a: string, b: string): boolean {
  const A = palavras(a), B = palavras(b)
  if (!A.length || !B.length) return false
  const [curto, longo] = A.length <= B.length ? [A, B] : [B, A]
  for (let i = 0; i + curto.length <= longo.length; i++) if (curto.every((w, k) => longo[i + k] === w)) return true
  return false
}

// ═══ Rodada 14: o que a ficha diz da pessoa FORA das palavras do autor ═══════════════════════════════════════════════
const CABECA_DO_AUTOR = /^(.*?), exactly as the author wrote(?=;|$)/u
/** Palavra de pessoa ou de faixa de idade (a que o gerador acrescentava: "a man in their early thirties", "an elderly woman", "a boy"). */
export const PESSOA_OU_FAIXA = /\b(?:man|woman|men|women|boy|girl|child|kid|baby|toddler|infant|newborn|teen|teenage|teenager|person|adult|grown|lady|gentleman|elderly|old|senior|young|twenties|thirties|forties|fifties|sixties|seventies|eighties)\b/i
/** A ficha é a do trecho do autor ("Nome, <trecho>, exactly as the author wrote", rodada 14)? */
export const fichaDoTrecho = (canonica: string) => CABECA_DO_AUTOR.test(String(canonica ?? ''))
/** O que a ficha diz da pessoa fora do trecho aceito, do trecho do juiz entre aspas e do nome. */
export function nossaParte(f: Pick<FichaDePersonagem, 'nome' | 'canonica'>): string {
  const original = String(f.canonica ?? '')
  const m = CABECA_DO_AUTOR.exec(original)
  let c = m ? original.slice(m[0].length) : original.startsWith(`${f.nome}, `) ? original.slice(f.nome.length + 2) : original
  c = c.replace(/exactly as the author wrote: "[^"]*"/gu, ' ')
  return c.replace(/\s+/g, ' ').trim()
}
/** A faixa e o gênero que a ficha do GERADOR diz (cabeça antes do " with "): só para a ficha que não é do trecho do autor. */
export function faixaDoGerador(canonica: string): { faixa: FaixaEtaria; genero: 'male' | 'female' | null } {
  const pessoa = ` ${canonica.split(' with ')[0].replace(/^[^,]*,\s*/, '').toLowerCase()} `
  const genero = / (?:woman|girl|lady)\b/.test(pessoa) ? 'female' : / (?:man|boy)\b/.test(pessoa) ? 'male' : null
  const anos = /(\d{1,3})-years?-old/.exec(pessoa)
  const n = anos ? Number(anos[1]) : null
  const pelosAnos = (x: number): FaixaEtaria => (x < 2 ? 'baby' : x < 4 ? 'toddler' : x < 13 ? 'child' : x < 18 ? 'teen' : x < 65 ? 'adult' : 'elderly')
  const faixa: FaixaEtaria = /\bbaby\b/.test(pessoa) ? 'baby' : /\btoddler\b/.test(pessoa) ? 'toddler' : /\b(?:teen\w*|sixteen)\b/.test(pessoa) ? 'teen' : /\belderly\b/.test(pessoa) ? 'elderly' : n !== null ? pelosAnos(n) : /\b(?:girl|boy|child|about nine)\b/.test(pessoa) ? 'child' : /\b(?:sixties|seventies|eighties)\b|\bold (?:man|woman|lady)\b/.test(pessoa) ? 'elderly' : 'adult'
  return { faixa, genero }
}
const MENORES: ReadonlySet<FaixaEtaria> = new Set(['baby', 'toddler', 'child', 'teen'])
/** Faixa lida que CONTRADIZ a verdadeira (não só "outra faixa"): criança adulta/idosa, adulto/idoso criança. */
export function faixaContradiz(verdade: ReadonlyArray<FaixaEtaria>, lida: FaixaEtaria): boolean {
  if (!verdade.length || verdade.includes(lida)) return false
  const menor = verdade.every((x) => MENORES.has(x))
  const maior = verdade.every((x) => !MENORES.has(x))
  return (menor && !MENORES.has(lida)) || (maior && MENORES.has(lida))
}

export function avaliar(c: Caso, e: ElencoSemantico | null): Nota {
  const cast: PersonagemSemantico[] = e ? [e.protagonist, ...e.supporting].filter((p): p is PersonagemSemantico => !!p) : []
  const p = e?.protagonist ?? null
  const nomeado = p?.name ?? null
  const graves: string[] = [], erros: string[] = []
  for (const m of cast) {
    const rotulos = [m.name, m.role, m.species].filter((x): x is string => !!x)
    for (const proibido of c.proib ?? []) if (rotulos.some((r) => casaNome(r, proibido)) && m.name && casaNome(m.name, proibido)) graves.push(`inventado:${m.name}`)
    for (const proibido of c.proib ?? []) if (!m.name && rotulos.some((r) => casaNome(r, proibido))) graves.push(`inventado:${m.role}`)
    if (m.name && (c.humanos ?? []).some((h) => casaNome(m.name!, h)) && m.kind !== 'human') graves.push(`pessoa_virou_${m.kind}:${m.name}`)
    for (const [nome, esp] of Object.entries(c.animais ?? {})) if (m.name && casaNome(m.name, nome) && (m.kind !== 'animal' || !casaNome(m.species ?? '', esp))) erros.push(`especie:${m.name}=${m.kind}/${m.species}`)
    for (const ep of c.especiesProibidas ?? []) if (m.name && m.species && casaNome(m.species, ep)) erros.push(`especie_proibida:${m.name}=${m.species}`)
    if (m !== p && m.name && (c.ausentes ?? []).some((n) => casaNome(m.name!, n))) erros.push(`ausente_em_cena:${m.name}`)
    for (const [nome, k] of Object.entries(c.proibTipo ?? {})) if (m.name && casaNome(m.name, nome) && m.kind === k) erros.push(`tipo:${m.name}=${k}`)
  }
  let fallback = false
  if (c.protagonista === null) {
    if (nomeado && !c.livre) graves.push(`protagonista_inventado:${nomeado}`)
  } else if (!nomeado) {
    if (!c.protagonista.includes(null)) { fallback = true; if (!c.fallbackOk) erros.push('sem_protagonista_nomeado') }
  } else if (!c.livre && !c.protagonista.some((n) => n !== null && casaNome(nomeado, n))) graves.push(`protagonista_errado:${nomeado}`)
  if (nomeado && c.tipo && p && p.kind !== c.tipo && c.protagonista?.some((n) => n !== null && casaNome(nomeado, n))) {
    if (c.tipo === 'human') graves.push(`pessoa_virou_${p.kind}:${nomeado}`)
    else erros.push(`tipo:${nomeado}=${p.kind} (esperado ${c.tipo})`)
  }
  const especies = c.especie == null ? [] : Array.isArray(c.especie) ? c.especie : [c.especie]
  if (nomeado && especies.length && p && !especies.some((esp) => casaNome(p.species ?? '', esp) || norm(p.species ?? '').includes(norm(esp)))) erros.push(`especie:${nomeado}=${p.species} (esperado ${especies.join('|')})`)
  // rodada 10: a ficha aplicada (o que vai ao motor). Sem elenco aplicado (falha segura) confere o elenco de sempre, mas o defeito dele
  // é da base, não desta leitura: erro leve com prefixo "base:", nunca grave.
  if (c.fichas) {
    const base = elencoDoRoteiro(c.texto)
    const aplicado = aplicarElencoSemantico(base, e, c.texto)
    const fichas = aplicado ? aplicado.elenco : base
    const pre = aplicado ? '' : 'base:'
    for (const [nome, esp] of Object.entries(c.fichas)) {
      const f = fichas.find((x) => casaNome(x.nome, nome))
      if (!f) { if (aplicado) erros.push(`ficha_ausente:${nome}`); continue }
      const faixas = esp.faixa ? (Array.isArray(esp.faixa) ? esp.faixa : [esp.faixa]) : []
      const nossa = nossaParte(f)
      if (fichaDoTrecho(f.canonica)) {
        // rodada 14: a ficha do trecho do autor não acrescenta pessoa/faixa ("— a boy", "an elderly woman", "early thirties")
        const inventada = PESSOA_OU_FAIXA.exec(nossa)
        if (inventada) graves.push(`faixa_inventada:${inventada[0]}:${nome}`)
        const g = f.genero === 'woman' ? 'female' : f.genero === 'man' ? 'male' : null
        if (esp.genero && g && g !== esp.genero) graves.push(`genero_contradiz:${nome}=${g}`)
        // rodada 15: a ficha do autor tem origem 'autor' — senão o casting da folha que a rota roda em todo 15 s a reescreve
        if (f.origem !== 'autor') graves.push(`casting_reescreve:${nome}`)
      } else {
        const lida = faixaDoGerador(f.canonica)
        const contradiz = faixaContradiz(faixas, lida.faixa)
        if (faixas.length && !faixas.includes(lida.faixa)) (contradiz && aplicado ? graves : erros).push(`${pre}${contradiz ? 'faixa_contradiz' : 'faixa'}:${lida.faixa}:${nome}`)
        if (esp.genero && lida.genero !== esp.genero) erros.push(`${pre}genero:${nome}=${lida.genero}`)
      }
      // rodada 12: a idade literal é a palavra do AUTOR ("de oito anos", "seven") e pode vir em qualquer caixa ("Seven-Year-Old")
      if (esp.literal && !f.canonica.toLowerCase().includes(esp.literal.toLowerCase())) erros.push(`${pre}idade_literal:${nome}`)
      // a idade alheia não pode estar no que a ficha diz DA PESSOA fora das palavras do autor ("Leo, grandson of a 78-year-old fisherman,
      // exactly as the author wrote" entra como o autor escreveu e não conta)
      if (esp.semLiteral && nossa.includes(esp.semLiteral)) erros.push(`${pre}idade_alheia:${nome}`)
    }
  }
  const unicos = (xs: string[]) => [...new Set(xs)]
  const g = unicos(graves), er = unicos(erros)
  return { acerto: g.length === 0 && er.length === 0, graves: g, erros: er, protagonista: nomeado ?? (p?.role ? `the ${p.role}` : null), kind: p?.kind ?? null, species: p?.species ?? null, fallback }
}
