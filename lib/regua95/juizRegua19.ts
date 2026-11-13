// KINEO-NOTA-AUTO-V3-1311 — 3ª tentativa do juiz: a RÉGUA INTEIRA do revisor (pedido da CEO, 13/11 16:42).
//
// O que se manteve das tentativas 1 e 2: defeito só conta com evidência por quadro; a nota sai por REGRA no código.
// O que muda (o que o revisor tem e o juiz não tinha):
//   · as 19 categorias fixas do SKILL do revisor (+ EPOCA_ERRADA, que o revisor usa e não está na lista);
//   · cada quadro vem com o TEMPO, a CENA e a FALA daquele instante (fala contra imagem, quadro a quadro);
//   · o plano de cenas: quais quadros o plano diz que mostram o MESMO personagem. PERSONAGEM_TROCOU só vale entre quadros
//     que o plano liga ao mesmo personagem, com ≥ 2 quadros (regra da CEO);
//   · o que é conta sai do CÓDIGO, não da visão: DURACAO_CURTA (duração real contra o alvo do pedido) e LINGUA_ERRADA
//     (língua da fala contra a do pedido e a escolhida).
// Sem exemplo concreto de filme no prompt (regra da casa 11/11). Falha aberta: null, nunca exceção.
import { detectNarrationLanguage, narrationLanguage } from '@/lib/textLanguage'
import { CATEGORIAS_CENTRAIS, CATEGORIAS_REVISOR, DEFINICAO_REVISOR, type CategoriaRevisor } from '@/lib/regua95/notaRevisor'
import { checagensDeIdentidade, limparPedido, type PlanoFilme, type QuadroCena } from '@/lib/regua95/notaPorCena'
import { chamarVisaoJson, type DetalheImagem, type ParteVisao, type ProvedorVisao } from '@/lib/regua95/visaoProvedor'

export const JUIZ19_VERSION = 'nota_auto_v3_regua19'
export type Categoria19 = CategoriaRevisor | 'EPOCA_ERRADA' | 'LINGUA_ERRADA'
const CATEGORIAS_VISAO: readonly Categoria19[] = [...CATEGORIAS_REVISOR.filter((c) => c !== 'DURACAO_CURTA'), 'EPOCA_ERRADA']
const DEF_EXTRA: Record<'EPOCA_ERRADA', string> = { EPOCA_ERRADA: 'clothing, technology, vehicles or buildings belong to another era than the story' }
const definicao = (c: Categoria19) => (c === 'EPOCA_ERRADA' ? DEF_EXTRA.EPOCA_ERRADA : DEFINICAO_REVISOR[c as CategoriaRevisor] ?? '')
const CENTRAIS19 = new Set<Categoria19>([...Array.from(CATEGORIAS_CENTRAIS), 'EPOCA_ERRADA'])

export type Defeito19 = { categoria: Categoria19; gravidade: 'grave' | 'leve'; quadros: number[]; evidencia: string; origem: 'visao' | 'codigo' }
export type Entrada19 = {
  plano: PlanoFilme
  quadros: QuadroCena[]
  pedido: string
  roteiro: string | null
  produto: string
  motor: string | null
  /** duração real do MP4 e o alvo pedido (requested_duration do nascimento) */
  segundos: number
  segundosPedidos?: number | null
  /** língua escolhida no pedido (response.language), quando há */
  linguaEscolhida?: string | null
}

/** Quadros que o plano liga a cada personagem recorrente (o 1º momento é a referência). */
export function quadrosPorPersonagem(p: PlanoFilme, quadros: QuadroCena[]): Map<string, number[]> {
  const out = new Map<string, number[]>()
  const ident = checagensDeIdentidade(p)
  const nomesDoMomento = new Map<number, string[]>()
  for (const m of p.momentos) nomesDoMomento.set(m.m, m.nomes)
  const recorrentes = new Set(Array.from(ident.values()).map((x) => x.nome))
  quadros.forEach((q, i) => {
    for (const nome of nomesDoMomento.get(q.m) ?? []) {
      if (!recorrentes.has(nome)) continue
      out.set(nome, [...(out.get(nome) ?? []), i])
    }
  })
  return out
}

export function buildJuiz19(e: Entrada19, detail: DetalheImagem = 'high'): { system: string; content: ParteVisao[] } {
  const n = e.quadros.length
  const porPers = quadrosPorPersonagem(e.plano, e.quadros)
  const cats = CATEGORIAS_VISAO.map((c) => `- ${c}: ${definicao(c)}`).join('\n')
  const system = [
    'You review short AI-generated films exactly like a strict human reviewer who decides whether the customer would proudly post the film.',
    'You receive the customer request, the scene plan, and frames from the FINAL film in order. Every frame comes with its time, its scene and the words the narrator is saying at that instant.',
    'Check, frame by frame, whether the image shows what the narrator is saying at that instant and what the request asks for. Then check the film as a whole.',
    'Defect categories (use these exact names):',
    cats,
    'PERSONAGEM_TROCOU is allowed ONLY between frames the plan lists as the same character (below) and needs at least 2 such frames that clearly show a different individual (face, hair, age, ethnicity, gender, species). Angle, distance, light, pose and expression changes are not a different person; a change the story asks for (ageing, costume change, transformation) is not a defect.',
    'Severity: "grave" = the customer would not post the film because of it, or it breaks the story. "leve" = noticeable, but the film still works.',
    'Rules: a stylised look is not a defect. Burned-in captions with the narration are expected (not TEXTO_INVENTADO). A small "usekineo.com" mark is ours. Audio cannot be judged. A generic but related shot is not CENA_FORA_DO_PEDIDO. Report only defects you can point to in specific frames; if the film matches, return an empty list.',
    `Frame indexes go from 0 to ${n - 1}. Every defect cites its frames and, in "evidence", what you literally see (and, for speech mismatches, the words being said).`,
    'Answer ONLY with JSON: {"frames": [{"i": number, "what": string}], "defects": [{"category": string, "severity": "grave"|"leve", "frames": [number], "evidence": string}], "summary": string (one line, Portuguese)}',
  ].join('\n\n')
  const plano = e.plano.momentos.map((m) => `Scene/moment ${m.m} (${m.inicio.toFixed(1)}–${m.fim.toFixed(1)} s): "${m.fala.slice(0, 400) || '(no speech)'}"`).join('\n')
  const mesmos = porPers.size
    ? Array.from(porPers.entries()).map(([nome, qs]) => `- "${nome}": frames ${qs.map((i) => `#${i}`).join(', ')} (reference: #${qs[0]})`).join('\n')
    : '- (the plan names no recurring character: PERSONAGEM_TROCOU cannot be reported)'
  const head = [
    `Product: ${e.produto}. Engine: ${e.motor ?? 'unknown'}. Duration: ${Math.round(e.segundos)} s.`,
    `Customer request:\n"""${limparPedido(e.pedido) || '(not recorded)'}"""`,
    `Scene plan (what the narrator says in each part):\n${plano}`,
    `Same character according to the plan:\n${mesmos}`,
  ].join('\n\n')
  const content: ParteVisao[] = [{ type: 'text', text: head }]
  const falaDe = new Map(e.plano.momentos.map((m) => [m.m, m]))
  e.quadros.forEach((q, i) => {
    const m = falaDe.get(q.m)
    content.push({ type: 'text', text: `Frame #${i} — t=${q.t.toFixed(1)} s — scene ${q.m} — narrator now: "${(m?.fala ?? '').slice(0, 300)}"` })
    content.push({ type: 'image_url', image_url: { url: q.url, detail } })
  })
  return { system, content }
}

const CAT19 = new Set<string>(CATEGORIAS_VISAO)

/** Do JSON do modelo para defeitos válidos (mesmas travas da 1ª tentativa + a do plano para PERSONAGEM_TROCOU). */
export function normalizar19(json: unknown, e: Pick<Entrada19, 'plano' | 'quadros'>): { defeitos: Defeito19[]; descartados: number; resumo: string } {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const n = e.quadros.length
  const porPers = quadrosPorPersonagem(e.plano, e.quadros)
  const defeitos: Defeito19[] = []
  let descartados = 0
  for (const raw of Array.isArray(o.defects) ? o.defects : []) {
    const d = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    if (!d) { descartados++; continue }
    const nome = String(d.category ?? '').trim().toUpperCase()
    const categoria = (CAT19.has(nome) ? nome : 'OUTRO') as Categoria19
    const quadros = Array.from(new Set((Array.isArray(d.frames) ? d.frames : []).map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < n))).sort((a, b) => a - b)
    const ev = String(d.evidence ?? '').trim()
    const minimo = categoria === 'REPETICAO' || categoria === 'PERSONAGEM_TROCOU' ? 2 : 1
    if (quadros.length < minimo || ev.split(/\s+/).length < 3) { descartados++; continue }
    if (categoria === 'PERSONAGEM_TROCOU') {
      // só entre quadros que o plano diz serem o MESMO personagem
      const ok = Array.from(porPers.values()).some((qs) => quadros.filter((i) => qs.includes(i)).length >= 2)
      if (!ok) { descartados++; continue }
    }
    const gravidade = String(d.severity ?? '').toLowerCase() === 'grave' ? 'grave' : 'leve'
    defeitos.push({ categoria, gravidade, quadros, evidencia: (categoria === 'OUTRO' && nome && nome !== 'OUTRO' ? `${nome}: ${ev}` : ev).slice(0, 300), origem: 'visao' })
  }
  return { defeitos, descartados, resumo: typeof o.summary === 'string' ? o.summary.trim().slice(0, 240) : '' }
}

/** O que é conta: duração contra o alvo e língua da fala contra o pedido. */
export function defeitosDoCodigo(e: Pick<Entrada19, 'segundos' | 'segundosPedidos' | 'pedido' | 'roteiro' | 'linguaEscolhida' | 'plano'>): Defeito19[] {
  const out: Defeito19[] = []
  const alvo = Number(e.segundosPedidos)
  if (Number.isFinite(alvo) && alvo > 0 && e.segundos > 0 && e.segundos < alvo * 0.85) {
    out.push({ categoria: 'DURACAO_CURTA', gravidade: e.segundos < alvo * 0.6 ? 'grave' : 'leve', quadros: [], evidencia: `${e.segundos.toFixed(1)} s de ${alvo} s pedidos`, origem: 'codigo' })
  }
  const fala = (e.roteiro || e.plano.momentos.map((m) => m.fala).join(' ')).trim()
  const lFala = detectNarrationLanguage(fala).language
  const lPedido = detectNarrationLanguage(limparPedido(e.pedido)).language
  const escolhida = narrationLanguage(e.linguaEscolhida)
  if (lFala && lPedido && lFala !== lPedido && escolhida !== lFala) {
    out.push({ categoria: 'LINGUA_ERRADA', gravidade: 'grave', quadros: [], evidencia: `fala em ${lFala}, pedido em ${lPedido}`, origem: 'codigo' })
  }
  return out
}

/** A régua do código. Ajustada só na metade de AJUSTE do ensaio v3 (scripts/calibra-nota-auto-v3-1311.mts). */
export const REGUA_JUIZ19 = { base: 8, leve: 0.5, grave: 1.5, graveCentral: 2, piso: 1 }
export type ReguaJuiz19 = typeof REGUA_JUIZ19

/** Nota 0–10 em passos de 0,5. Mesma categoria conta uma vez (a mais grave). */
export function nota19(defeitos: ReadonlyArray<Pick<Defeito19, 'categoria' | 'gravidade'>>, r: ReguaJuiz19 = REGUA_JUIZ19): number {
  const porCat = new Map<Categoria19, 'grave' | 'leve'>()
  for (const d of defeitos) if (porCat.get(d.categoria) !== 'grave') porCat.set(d.categoria, d.gravidade)
  let nota = r.base
  for (const [cat, g] of Array.from(porCat.entries())) nota -= g === 'grave' ? (CENTRAIS19.has(cat) ? r.graveCentral : r.grave) : r.leve
  return Math.max(r.piso, Math.min(10, Math.round(nota * 2) / 2))
}

export type Resultado19 = { version: typeof JUIZ19_VERSION; nota: number; defeitos: Defeito19[]; descartados: number; resumo: string; model: string; provedor: ProvedorVisao; frames: number; usd: number; ms: number; bruto: unknown }

export async function julgar19(e: Entrada19, opts?: { provedor?: ProvedorVisao; model?: string; tokenGateway?: string | null; fetchImpl?: typeof fetch; apiKey?: string; detail?: DetalheImagem; regua?: ReguaJuiz19; usdQuadros?: number; maxTokens?: number; tarifa?: { inPerM: number; outPerM: number } }): Promise<Resultado19 | null> {
  const t0 = Date.now()
  if (!e.quadros.length) return null
  const c = buildJuiz19(e, opts?.detail ?? 'high')
  const r = await chamarVisaoJson({ ...c, maxTokens: opts?.maxTokens ?? 4000 }, { provedor: opts?.provedor, modelo: opts?.model, tokenGateway: opts?.tokenGateway, fetchImpl: opts?.fetchImpl, apiKey: opts?.apiKey, tarifa: opts?.tarifa })
  if (!r) return null
  const { defeitos, descartados, resumo } = normalizar19(r.json, e)
  const todos = [...defeitos, ...defeitosDoCodigo(e)]
  return { version: JUIZ19_VERSION, nota: nota19(todos, opts?.regua), defeitos: todos, descartados, resumo, model: r.modelo, provedor: r.provedor, frames: e.quadros.length, usd: Math.round((r.usd + (opts?.usdQuadros ?? 0)) * 1e6) / 1e6, ms: Date.now() - t0, bruto: r.json }
}
