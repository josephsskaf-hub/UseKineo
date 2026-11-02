// KINEO-PROTAGONISTA-SEEDANCE-0111 — a régua da calibração do elenco semântico (usada pelo calibrador e pelo guardião).
// Erro GRAVE: pessoa virando bicho/criatura; personagem inventado (lugar, empresa, palavra de abertura); protagonista errado;
// rodada 10: criança/adolescente com idade escrita virando adulto na FICHA aplicada (aplicarElencoSemantico sobre o elenco de sempre).
import { aplicarElencoSemantico, faixaDaFicha, type ElencoSemantico, type PersonagemSemantico, type FaixaEtaria } from '../../lib/cinematic/elencoSemantico'
import { elencoDoRoteiro } from '../../lib/cinematic/personagemAjuste'

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
  /** rodada 10: o que a FICHA aplicada tem de dizer de cada pessoa (faixa aceita, gênero, idade literal, idade que NÃO pode aparecer) */
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
      const lida = faixaDaFicha(f.canonica)
      const faixas = esp.faixa ? (Array.isArray(esp.faixa) ? esp.faixa : [esp.faixa]) : []
      const menor = faixas.length > 0 && faixas.every((x) => x !== 'adult' && x !== 'elderly')
      const virouAdulto = menor && (lida.faixa === 'adult' || lida.faixa === 'elderly')
      if (faixas.length && !faixas.includes(lida.faixa)) (virouAdulto && aplicado ? graves : erros).push(`${pre}${virouAdulto ? 'crianca_virou_' : 'faixa:'}${lida.faixa}:${nome}`)
      if (esp.genero && lida.genero !== esp.genero) erros.push(`${pre}genero:${nome}=${lida.genero}`)
      if (esp.literal && !f.canonica.includes(esp.literal)) erros.push(`${pre}idade_literal:${nome}`)
      if (esp.semLiteral && f.canonica.includes(esp.semLiteral)) erros.push(`${pre}idade_alheia:${nome}`)
    }
  }
  const unicos = (xs: string[]) => [...new Set(xs)]
  const g = unicos(graves), er = unicos(erros)
  return { acerto: g.length === 0 && er.length === 0, graves: g, erros: er, protagonista: nomeado ?? (p?.role ? `the ${p.role}` : null), kind: p?.kind ?? null, species: p?.species ?? null, fallback }
}
