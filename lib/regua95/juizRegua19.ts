// KINEO-NOTA-AUTO-V3-1311 — 3ª tentativa do juiz: a RÉGUA INTEIRA do revisor (pedido da CEO, 13/11 16:42). É o juiz da
// nota automática em produção (lib/regua95/notaAutoFilme.ts), na sombra.
//
// O que se manteve das tentativas 1 e 2: defeito só conta com evidência por quadro; a nota sai por REGRA no código.
// O que o juiz recebe (o que o revisor tem):
//   · as 19 categorias fixas do SKILL do revisor + EPOCA_ERRADA (só quando a história TEM época) + ESTILO_MUDOU;
//   · cada quadro com o TEMPO, a CENA e a FALA daquele instante (fala contra imagem, quadro a quadro);
//   · o plano de cenas: quais quadros o plano diz que mostram o MESMO personagem;
//   · o que é conta sai do CÓDIGO: DURACAO_CURTA (duração real × alvo, fora quando o pipeline encurtou de propósito) e
//     LINGUA_ERRADA (língua da fala × pedido × escolhida).
// CONSERTOS DE 13/11 noite (os 2 primeiros filmes julgados em produção, achados da CEO):
//   1. a nossa marca "usekineo.com" / "usekineo.com/free" no canto virava EPOCA_ERRADA ("modern website text"): o texto diz
//      que é nossa e não conta, e o código descarta qualquer defeito cuja evidência é a marca;
//   2. EPOCA_ERRADA disparava em desenho ("ambiente de desenho animado, não realista"): a categoria só existe quando o pedido ou
//      a fala têm época (pedeEpoca); fora disso nem é oferecida ao modelo e o código a descarta;
//   3. o juiz não comparava uma cena com a outra (gato fotorreal que vira desenho; desenho do gato que muda entre cenas): passo
//      explícito de comparação entre cenas, categoria ESTILO_MUDOU (central) e PERSONAGEM_TROCOU também para o protagonista
//      quando o plano não nomeia ninguém (quadros de ≥ 2 cenas diferentes).
// Sem exemplo concreto de filme no prompt (regra da casa 11/11). Falha aberta: null, nunca exceção.
import { detectNarrationLanguage, narrationLanguage } from '@/lib/textLanguage'
import { CATEGORIAS_CENTRAIS, CATEGORIAS_REVISOR, DEFINICAO_REVISOR, type CategoriaRevisor } from '@/lib/regua95/notaRevisor'
import { checagensDeIdentidade, limparPedido, type PlanoFilme, type QuadroCena } from '@/lib/regua95/notaPorCena'
import { chamarVisaoJson, type DetalheImagem, type ParteVisao, type ProvedorVisao } from '@/lib/regua95/visaoProvedor'

export const JUIZ19_VERSION = 'nota_auto_v3_regua19'
export type Categoria19 = CategoriaRevisor | 'EPOCA_ERRADA' | 'LINGUA_ERRADA' | 'ESTILO_MUDOU'
const DEF_EXTRA = {
  EPOCA_ERRADA: 'clothing, technology, vehicles or buildings belong to another era than the era of the story',
  ESTILO_MUDOU: 'the visual style changes in the middle of the film (photorealistic ↔ cartoon/3D/anime/illustration), without the story asking for it',
} as const
const definicao = (c: Categoria19) => (c === 'EPOCA_ERRADA' || c === 'ESTILO_MUDOU' ? DEF_EXTRA[c] : DEFINICAO_REVISOR[c as CategoriaRevisor] ?? '')
const CENTRAIS19 = new Set<Categoria19>([...Array.from(CATEGORIAS_CENTRAIS), 'EPOCA_ERRADA', 'ESTILO_MUDOU'])

/** A história tem época? (ano, século, período, povo antigo, guerra, "antigamente"…). Sem época, EPOCA_ERRADA não existe. */
export function pedeEpoca(texto: string): boolean {
  return /\b(1[0-9]{3}|20[0-2][0-9])s?\b|\b\d{1,2}(st|nd|rd|th)[- ]century\b|\bs[ée]culo\b|\bcentury\b|\b(bc|bce|a\.?c\.?|d\.?c\.?)\b|\b(ancient|antig[ao]s?|medieval|middle ages|idade m[ée]dia|renaissance|renascimento|victorian|vitorian[ao]|colonial|prehistoric|pr[ée]-?hist[óo]ri|stone age|bronze age|iron age|viking|roman empire|imp[ée]rio romano|romanos?|romans?|greek|gregos?|egypt|egito|pharaoh|fara[óo]|samurai|shogun|feudal|world war|guerra mundial|ww[12i]+|cold war|guerra fria|wild west|velho oeste|cowboys?|pioneers?|1920s|roaring twenties|ming|qing|aztec|asteca|maya|inca|biblical|b[íi]blic[ao]|jesus|moses|mois[ée]s|dinosaurs?|dinossauros?|future|futur[ao]|futuristic|futurista|retro|r[ée]tro|vintage|old days|antigamente)\b/i.test(texto)
}

/** A nossa marca no canto (usekineo.com, usekineo.com/free) — nunca é defeito nem prova de época. */
const MARCA_DA_CASA = /usekineo|kineo\.com|kineo\b|our (water)?mark|watermark|marca d[’']?[áa]gua|website (text|url|address)|texto de site|url (in|no|na) (the )?(corner|canto)|endere[çc]o de site/i

export type Defeito19 = { categoria: Categoria19; gravidade: 'grave' | 'leve'; quadros: number[]; evidencia: string; origem: 'visao' | 'codigo' }
export type Entrada19 = {
  plano: PlanoFilme
  quadros: QuadroCena[]
  pedido: string
  roteiro: string | null
  produto: string
  motor: string | null
  /** duração real do MP4 e o alvo pedido (requested_duration do nascimento; null quando o pipeline encurtou de propósito) */
  segundos: number
  segundosPedidos?: number | null
  /** língua escolhida no pedido (response.language), quando há */
  linguaEscolhida?: string | null
}

const textoDaHistoria = (e: Pick<Entrada19, 'pedido' | 'plano'>) => `${limparPedido(e.pedido)} ${e.plano.momentos.map((m) => m.fala).join(' ')}`
export function categoriasParaVisao(e: Pick<Entrada19, 'pedido' | 'plano'>): Categoria19[] {
  return [...CATEGORIAS_REVISOR.filter((c) => c !== 'DURACAO_CURTA'), ...(pedeEpoca(textoDaHistoria(e)) ? (['EPOCA_ERRADA'] as const) : []), 'ESTILO_MUDOU']
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
  const cats = categoriasParaVisao(e).map((c) => `- ${c}: ${definicao(c)}`).join('\n')
  const temEpoca = pedeEpoca(textoDaHistoria(e))
  const system = [
    'You review short AI-generated films exactly like a strict human reviewer who decides whether the customer would proudly post the film.',
    'You receive the customer request, the scene plan, and frames from the FINAL film in order. Every frame comes with its time, its scene and the words the narrator is saying at that instant.',
    'Step 1: check, frame by frame, whether the image shows what the narrator is saying at that instant and what the request asks for.',
    'Step 2: compare the scenes WITH EACH OTHER. Does the visual style stay the same from the first to the last frame (photorealistic, cartoon, 3D animation, anime, illustration)? Does the main character keep the same design in every scene (species, colours, fur or hair, outfit, face, size)? A change the story does not ask for is a defect: style → ESTILO_MUDOU; the character\'s design → PERSONAGEM_TROCOU.',
    'Defect categories (use these exact names):',
    cats,
    porPers.size
      ? 'PERSONAGEM_TROCOU only between frames the plan lists as the same character (below), with at least 2 such frames that clearly show a different individual or design.'
      : 'The plan names no recurring character: PERSONAGEM_TROCOU is allowed only for the protagonist, citing frames from at least 2 different scenes that clearly show a different individual or design.',
    'Angle, distance, light, pose and expression changes are not a different character; a change the story asks for (ageing, costume change, transformation) is not a defect.',
    temEpoca ? 'The story has an era: check it.' : 'The story has no specific era: do not judge the era (a cartoon, 3D or stylised look is not an era problem).',
    'Severity: "grave" = the customer would not post the film because of it, or it breaks the story. "leve" = noticeable, but the film still works.',
    'Rules: a stylised look chosen for the whole film is not a defect. Burned-in captions with the narration are expected (not TEXTO_INVENTADO). A small "usekineo.com" or "usekineo.com/free" mark, usually in a corner, is OURS: it is never a defect of any kind and never evidence about the era. Audio cannot be judged. A generic but related shot is not CENA_FORA_DO_PEDIDO. Report only defects you can point to in specific frames; if the film matches, return an empty list.',
    `Frame indexes go from 0 to ${n - 1}. Every defect cites its frames and, in "evidence", what you literally see (and, for speech mismatches, the words being said).`,
    'Answer ONLY with JSON: {"frames": [{"i": number, "what": string}], "defects": [{"category": string, "severity": "grave"|"leve", "frames": [number], "evidence": string}], "summary": string (one line, Portuguese)}',
  ].join('\n\n')
  const plano = e.plano.momentos.map((m) => `Scene/moment ${m.m} (${m.inicio.toFixed(1)}–${m.fim.toFixed(1)} s): "${m.fala.slice(0, 400) || '(no speech)'}"`).join('\n')
  const mesmos = porPers.size
    ? Array.from(porPers.entries()).map(([nome, qs]) => `- "${nome}": frames ${qs.map((i) => `#${i}`).join(', ')} (reference: #${qs[0]})`).join('\n')
    : '- (the plan names no recurring character)'
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

/** Do JSON do modelo para defeitos válidos (travas da 1ª tentativa + plano para PERSONAGEM_TROCOU + marca da casa + época). */
export function normalizar19(json: unknown, e: Pick<Entrada19, 'plano' | 'quadros'> & Partial<Pick<Entrada19, 'pedido'>>): { defeitos: Defeito19[]; descartados: number; resumo: string } {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const n = e.quadros.length
  const porPers = quadrosPorPersonagem(e.plano, e.quadros)
  const validas = new Set<string>(categoriasParaVisao({ pedido: e.pedido ?? '', plano: e.plano }))
  const todasConhecidas = new Set<string>([...CATEGORIAS_REVISOR, 'EPOCA_ERRADA', 'ESTILO_MUDOU'])
  const defeitos: Defeito19[] = []
  let descartados = 0
  for (const raw of Array.isArray(o.defects) ? o.defects : []) {
    const d = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    if (!d) { descartados++; continue }
    const nome = String(d.category ?? '').trim().toUpperCase()
    // categoria conhecida mas fora desta história (EPOCA_ERRADA sem época) = descartada; desconhecida = OUTRO
    if (todasConhecidas.has(nome) && !validas.has(nome)) { descartados++; continue }
    const categoria = (validas.has(nome) ? nome : 'OUTRO') as Categoria19
    const quadros = Array.from(new Set((Array.isArray(d.frames) ? d.frames : []).map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < n))).sort((a, b) => a - b)
    const ev = String(d.evidence ?? '').trim()
    const minimo = categoria === 'REPETICAO' || categoria === 'PERSONAGEM_TROCOU' || categoria === 'ESTILO_MUDOU' ? 2 : 1
    if (quadros.length < minimo || ev.split(/\s+/).length < 3) { descartados++; continue }
    // a nossa marca no canto nunca é defeito (conserto 1)
    if (MARCA_DA_CASA.test(ev) && categoria !== 'PERSONAGEM_TROCOU' && categoria !== 'ESTILO_MUDOU') { descartados++; continue }
    if (categoria === 'PERSONAGEM_TROCOU' || categoria === 'ESTILO_MUDOU') {
      // tem de cruzar cenas: quadros de ≥ 2 momentos diferentes
      const momentos = new Set(quadros.map((i) => e.quadros[i].m))
      if (momentos.size < 2) { descartados++; continue }
    }
    if (categoria === 'PERSONAGEM_TROCOU' && porPers.size) {
      // com personagem nomeado no plano: só entre quadros que o plano diz serem o MESMO personagem
      const ok = Array.from(porPers.values()).some((qs) => quadros.filter((i) => qs.includes(i)).length >= 2)
      if (!ok) { descartados++; continue }
    }
    const gravidade = String(d.severity ?? '').toLowerCase() === 'grave' ? 'grave' : 'leve'
    defeitos.push({ categoria, gravidade, quadros, evidencia: (categoria === 'OUTRO' && nome && nome !== 'OUTRO' ? `${nome}: ${ev}` : ev).slice(0, 300), origem: 'visao' })
  }
  // o mesmo defeito não conta duas vezes: troca de personagem nos MESMOS quadros de uma troca de estilo é consequência dela
  const estilo = defeitos.find((d) => d.categoria === 'ESTILO_MUDOU')
  const final = estilo
    ? defeitos.filter((d) => !(d.categoria === 'PERSONAGEM_TROCOU' && d.quadros.filter((i) => estilo.quadros.includes(i)).length >= 2) || (descartados++, false))
    : defeitos
  return { defeitos: final, descartados, resumo: typeof o.summary === 'string' ? o.summary.trim().slice(0, 240) : '' }
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

/**
 * O alvo de duração do nascimento — null quando o pipeline encurtou o filme de propósito (autofit_down) ou não há alvo: aí
 * DURACAO_CURTA não pode ser julgada (caso d89ce57f: "29 s de 60 s pedidos" num filme que o revisor aprovou com 7,5).
 */
export function alvoDeDuracao(response: Record<string, unknown> | null | undefined): number | null {
  if (!response) return null
  const af = response.autofit_down
  if (af === true || (af && typeof af === 'object')) return null
  const n = Number(response.requested_duration)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** A régua do código (a da 1ª tentativa, sem ajuste fino: a prova mediu esta). */
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
