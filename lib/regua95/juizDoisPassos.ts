// KINEO-NOTA-AUTO-2PASSOS-1311 — juiz em DOIS PASSOS (hipótese da CEO, 13/11 tarde): o modelo concorda com o pedido porque o lê
// ANTES de olhar ("gatinho laranja na chuva" + gato cinza no seco = "bate"). Então:
//   PASSO 1 — DESCRIÇÃO ÀS CEGAS (visão): só os quadros e o tempo de cada um; nada de pedido, roteiro ou plano. Campos fechados
//             por quadro: quem aparece (tipo, espécie/pessoa, cor, idade, roupa), quantos, onde, sinais de época, estilo, texto
//             legível, defeito visível e "igual ao quadro anterior?".
//   PASSO 2 — COMPARAÇÃO EM TEXTO (sem imagem): descrição + pedido + fala de cada cena + plano → divergências com categoria da
//             régua do revisor, o quadro e a citação dos dois lados. O que é conta sai do CÓDIGO: espécie do mesmo personagem
//             trocou entre quadros (o plano diz que é o mesmo) = PERSONAGEM_TROCOU; estilo mudou no meio = OUTRO; duração e língua.
// A nota sai por REGRA (nota19), nunca do modelo. Falha aberta: null.
import { CATEGORIAS_REVISOR, DEFINICAO_REVISOR, type CategoriaRevisor } from '@/lib/regua95/notaRevisor'
import { limparPedido, type QuadroCena } from '@/lib/regua95/notaPorCena'
import { defeitosDoCodigo, nota19, quadrosPorPersonagem, type Categoria19, type Defeito19, type Entrada19, type ReguaJuiz19 } from '@/lib/regua95/juizRegua19'
import { chamarVisaoJson, type DetalheImagem, type ParteVisao, type ProvedorVisao } from '@/lib/regua95/visaoProvedor'

export const JUIZ2P_VERSION = 'nota_auto_v4_dois_passos'
const ESTILOS = ['foto_real', '3d', 'anime', 'ilustracao', 'outro'] as const

export type Sujeito = { tipo: string; especie: string; cor: string; idade: string; roupa: string }
export type Descricao = { i: number; sujeitos: Sujeito[]; quantos: number; onde: string; epoca: string; estilo: (typeof ESTILOS)[number]; texto: string; defeito: string; igual_anterior: boolean }

export function buildPasso1(quadros: QuadroCena[], detail: DetalheImagem = 'high'): { system: string; content: ParteVisao[] } {
  const system = [
    'You describe frames from a short video, one by one, as a careful neutral observer. You do NOT know what the video is supposed to be about: describe only what is literally visible.',
    'For EVERY frame return closed fields:',
    '- sujeitos: the main visible beings or objects (max 3). For each: tipo ("pessoa", "animal", "objeto", "lugar"), especie (for a person: man/woman/boy/girl/baby; for an animal: the species; for an object: what it is), cor (dominant colours: fur, skin tone, object colour), idade (apparent age: baby/child/teen/young adult/adult/elderly, or "-"), roupa (clothing in a few words, or "-");',
    '- quantos: how many people/animals are visible; onde: the place in a few words (indoor/outdoor, kind of place, weather);',
    '- epoca: visible era cues (cars, phones, clothing, architecture, technology), or "nenhum";',
    `- estilo: one of ${ESTILOS.join(', ')};`,
    '- texto: any legible text other than a subtitle caption at the bottom (empty if none); defeito: any visible deformity (hands, faces, melted objects, extra limbs) or "nenhum";',
    '- igual_anterior: true when the frame is practically the same image as the previous frame.',
    'Answer ONLY with JSON: {"quadros": [{"i": number, "sujeitos": [{"tipo": string, "especie": string, "cor": string, "idade": string, "roupa": string}], "quantos": number, "onde": string, "epoca": string, "estilo": string, "texto": string, "defeito": string, "igual_anterior": boolean}]}',
  ].join('\n')
  const content: ParteVisao[] = [{ type: 'text', text: `${quadros.length} frames, in order.` }]
  quadros.forEach((q, i) => {
    content.push({ type: 'text', text: `Frame #${i} — t=${q.t.toFixed(1)} s` })
    content.push({ type: 'image_url', image_url: { url: q.url, detail } })
  })
  return { system, content }
}

const s = (x: unknown, n = 120) => (typeof x === 'string' ? x.trim().slice(0, n) : '')
export function normalizarPasso1(json: unknown, n: number): Descricao[] {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const out: Descricao[] = []
  for (const raw of Array.isArray(o.quadros) ? o.quadros : []) {
    const q = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    const i = Number(q?.i)
    if (!q || !Number.isInteger(i) || i < 0 || i >= n || out.some((d) => d.i === i)) continue
    const est = String(q.estilo ?? '').toLowerCase() as Descricao['estilo']
    out.push({
      i,
      sujeitos: (Array.isArray(q.sujeitos) ? q.sujeitos : []).slice(0, 3).map((x) => { const y = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>; return { tipo: s(y.tipo, 20), especie: s(y.especie, 40), cor: s(y.cor, 60), idade: s(y.idade, 30), roupa: s(y.roupa, 80) } }),
      quantos: Number.isFinite(Number(q.quantos)) ? Number(q.quantos) : 0,
      onde: s(q.onde), epoca: s(q.epoca), estilo: (ESTILOS as readonly string[]).includes(est) ? est : 'outro', texto: s(q.texto), defeito: s(q.defeito), igual_anterior: q.igual_anterior === true,
    })
  }
  return out.sort((a, b) => a.i - b.i)
}

/** O que é conta, a partir da descrição às cegas. */
export function defeitosDaDescricao(desc: Descricao[], e: Pick<Entrada19, 'plano' | 'quadros'>): Defeito19[] {
  const out: Defeito19[] = []
  // espécie do personagem que o plano diz ser o MESMO trocou entre quadros (ex.: gato → cachorro; homem → mulher)
  const porI = new Map(desc.map((d) => [d.i, d]))
  for (const [nome, qs] of Array.from(quadrosPorPersonagem(e.plano, e.quadros).entries())) {
    const especies = qs.map((i) => porI.get(i)?.sujeitos.find((x) => x.tipo === 'pessoa' || x.tipo === 'animal')?.especie.toLowerCase()).map((x, k) => ({ x, i: qs[k] })).filter((y) => y.x)
    const distintas = Array.from(new Set(especies.map((y) => y.x)))
    if (distintas.length >= 2) {
      const maior = distintas.map((d) => especies.filter((y) => y.x === d).length).sort((a, b) => b - a)
      if (maior[1] >= 2) out.push({ categoria: 'PERSONAGEM_TROCOU', gravidade: 'grave', quadros: especies.map((y) => y.i), evidencia: `"${nome}": ${distintas.join(' × ')}`, origem: 'codigo' })
    }
  }
  // estilo mudou no meio (dois estilos com ≥ 2 quadros cada)
  const est = new Map<string, number>()
  for (const d of desc) est.set(d.estilo, (est.get(d.estilo) ?? 0) + 1)
  const fortes = Array.from(est.entries()).filter(([k, v]) => k !== 'outro' && v >= 2)
  if (fortes.length >= 2) out.push({ categoria: 'OUTRO', gravidade: 'leve', quadros: desc.map((d) => d.i), evidencia: `estilo muda no filme: ${fortes.map(([k, v]) => `${k} ×${v}`).join(', ')}`, origem: 'codigo' })
  return out
}

const CATEGORIAS_TEXTO: readonly Categoria19[] = [...CATEGORIAS_REVISOR.filter((c) => c !== 'DURACAO_CURTA' && c !== 'PERSONAGEM_TROCOU' && c !== 'ROSTO_DIFERENTE_DA_FOTO' && c !== 'BOCA_FORA_DE_SINCRONIA'), 'EPOCA_ERRADA']

export function buildPasso2(desc: Descricao[], e: Entrada19): { system: string; content: ParteVisao[] } {
  const cats = CATEGORIAS_TEXTO.map((c) => `- ${c}: ${c === 'EPOCA_ERRADA' ? 'visible era cues contradict the era of the story' : DEFINICAO_REVISOR[c as CategoriaRevisor]}`).join('\n')
  const system = [
    'You compare what a film SHOWS (a neutral frame-by-frame description written by someone who did not know the story) with what it SHOULD show (the customer request and what the narrator says at each instant).',
    'List every divergence a strict reviewer would flag. For each one quote BOTH sides: what the request or the speech says, and what the description of that frame says. Do not assume anything the description does not say: missing detail is not a divergence; a contradiction is.',
    'Categories (use these exact names):',
    cats,
    'Severity: "grave" = it breaks the story or the customer would not post it; "leve" = noticeable but the film still works. A generic but related shot is not CENA_FORA_DO_PEDIDO.',
    'Answer ONLY with JSON: {"divergencias": [{"category": string, "severity": "grave"|"leve", "frames": [number], "pedido_ou_fala": string, "quadro": string}], "summary": string (one line, Portuguese)}',
  ].join('\n\n')
  const fala = new Map(e.plano.momentos.map((m) => [m.m, m.fala]))
  const linhas = desc.map((d) => {
    const q = e.quadros[d.i]
    const suj = d.sujeitos.map((x) => `${x.tipo}/${x.especie}/${x.cor}/${x.idade}/${x.roupa}`).join('; ') || '-'
    return `#${d.i} t=${q?.t.toFixed(1)}s scene ${q?.m} | narrator now: "${(fala.get(q?.m ?? -1) ?? '').slice(0, 240)}" | SHOWS: ${suj} | count ${d.quantos} | where: ${d.onde} | era: ${d.epoca} | style: ${d.estilo} | text: ${d.texto || '-'} | defect: ${d.defeito || '-'}${d.igual_anterior ? ' | same as previous' : ''}`
  })
  const content: ParteVisao[] = [{ type: 'text', text: [`Customer request:\n"""${limparPedido(e.pedido) || '(not recorded)'}"""`, `Frames (description + what the narrator says at that instant):\n${linhas.join('\n')}`].join('\n\n') }]
  return { system, content }
}

export function normalizarPasso2(json: unknown, n: number): { defeitos: Defeito19[]; resumo: string } {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const ok = new Set<string>(CATEGORIAS_TEXTO)
  const defeitos: Defeito19[] = []
  for (const raw of Array.isArray(o.divergencias) ? o.divergencias : []) {
    const d = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    if (!d) continue
    const nome = String(d.category ?? '').trim().toUpperCase()
    const quadros = Array.from(new Set((Array.isArray(d.frames) ? d.frames : []).map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < n)))
    const lado1 = s(d.pedido_ou_fala, 200), lado2 = s(d.quadro, 200)
    if (!quadros.length || !lado1 || !lado2) continue // divergência sem os dois lados citados não conta
    const minimo = nome === 'REPETICAO' ? 2 : 1
    if (quadros.length < minimo) continue
    defeitos.push({ categoria: (ok.has(nome) ? nome : 'OUTRO') as Categoria19, gravidade: String(d.severity ?? '').toLowerCase() === 'grave' ? 'grave' : 'leve', quadros, evidencia: `pedido/fala: ${lado1} · quadro: ${lado2}`.slice(0, 300), origem: 'visao' })
  }
  return { defeitos, resumo: s(o.summary, 240) }
}

export type Resultado2P = { version: typeof JUIZ2P_VERSION; nota: number; defeitos: Defeito19[]; descricao: Descricao[]; resumo: string; usd: number; ms: number; bruto: { passo1: unknown; passo2: unknown } }

export async function julgarDoisPassos(e: Entrada19, opts: { provedor?: ProvedorVisao; modeloVisao?: string; modeloTexto?: string; apiKey?: string; tokenGateway?: string | null; fetchImpl?: typeof fetch; tarifaVisao?: { inPerM: number; outPerM: number }; tarifaTexto?: { inPerM: number; outPerM: number }; regua?: ReguaJuiz19 }): Promise<Resultado2P | null> {
  const t0 = Date.now()
  if (!e.quadros.length) return null
  const comum = { provedor: opts.provedor, apiKey: opts.apiKey, tokenGateway: opts.tokenGateway, fetchImpl: opts.fetchImpl }
  const p1 = await chamarVisaoJson({ ...buildPasso1(e.quadros), maxTokens: 6000 }, { ...comum, modelo: opts.modeloVisao, tarifa: opts.tarifaVisao })
  if (!p1) return null
  const descricao = normalizarPasso1(p1.json, e.quadros.length)
  if (!descricao.length) return null
  const p2 = await chamarVisaoJson({ ...buildPasso2(descricao, e), maxTokens: 4000 }, { ...comum, modelo: opts.modeloTexto ?? opts.modeloVisao, tarifa: opts.tarifaTexto ?? opts.tarifaVisao })
  if (!p2) return null
  const { defeitos, resumo } = normalizarPasso2(p2.json, e.quadros.length)
  const todos = [...defeitos, ...defeitosDaDescricao(descricao, e), ...defeitosDoCodigo(e)]
  return { version: JUIZ2P_VERSION, nota: nota19(todos, opts.regua), defeitos: todos, descricao, resumo, usd: Math.round((p1.usd + p2.usd) * 1e6) / 1e6, ms: Date.now() - t0, bruto: { passo1: p1.json, passo2: p2.json } }
}
