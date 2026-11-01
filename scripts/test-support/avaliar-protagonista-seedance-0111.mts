// KINEO-PROTAGONISTA-SEEDANCE-0111 — a régua da calibração do elenco semântico (usada pelo calibrador e pelo guardião).
// Erro GRAVE: pessoa virando bicho/criatura; personagem inventado (lugar, empresa, palavra de abertura); protagonista errado.
import type { ElencoSemantico, PersonagemSemantico } from '../../lib/cinematic/elencoSemantico'

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
  const unicos = (xs: string[]) => [...new Set(xs)]
  const g = unicos(graves), er = unicos(erros)
  return { acerto: g.length === 0 && er.length === 0, graves: g, erros: er, protagonista: nomeado ?? (p?.role ? `the ${p.role}` : null), kind: p?.kind ?? null, species: p?.species ?? null, fallback }
}
