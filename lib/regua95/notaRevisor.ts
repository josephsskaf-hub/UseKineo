// KINEO-NOTA-AUTO-1311 — NOTA AUTOMÁTICA DO FILME no servidor (parte B da "Opção C" do fundador, 13/11/2026).
//
// Por quê: a nota do painel (/admin, tabela film_review_notes) vem do REVISOR — uma sessão do Claude no PC do fundador que
// demora 5 a 12 h e gasta ~1,3 milhão de tokens por vídeo. O pixel_score do cron (lib/regua95/pixelScore.ts) é barato, mas
// deu 95–99 a filmes que o revisor avaliou com 6: pergunta "a imagem está bonita?" e não "o filme cumpre o pedido?".
//
// Este juiz imita a RÉGUA DO REVISOR (C:\Users\josep\.claude\scheduled-tasks\kineo-revisor-de-videos\SKILL.md, passo 3):
//   · olha os quadros contra o PEDIDO do cliente e o ROTEIRO narrado (quando houver);
//   · aponta DEFEITOS nas MESMAS categorias fixas do revisor, cada um com a evidência (QUAL quadro) e a gravidade;
//   · a NOTA NASCE NO CÓDIGO a partir dos defeitos (notaDosDefeitos) — a nota solta do modelo nem é pedida;
//   · defeito sem quadro válido de evidência é descartado (o modelo não "acha" defeito sem mostrar onde).
// Sem exemplo concreto de filme dentro do prompt (regra da casa 11/11: exemplo no prompt vira cópia).
// Quadros: URL (fal, em produção) ou data URL (ffmpeg local, no ensaio scripts/calibra-nota-auto-1311.mts).
// Falha aberta: erro = null, nunca exceção. Só medição — nunca bloqueia nem muda o que o cliente recebe.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { readAll as ReadAllRows } from '../supabase/readAll'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { isInternalEmail } from '@/lib/internalAccounts'
import { usdFromUsage } from '@/lib/regua95/coherenceV2'
import { FAL_NTH_FRAME_MODEL, FAL_USD_PER_COMPUTE_SECOND, PIXEL_FPS_ASSUMED, pickEvenly } from '@/lib/regua95/pixelScore'

export const NOTA_AUTO_EVENT = 'nota_auto'
export const NOTA_AUTO_VERSION = 'nota_auto_v1'
/** Quadros por filme (o revisor olha 8; aqui 12 para pegar troca de personagem e cena repetida entre cenas curtas). */
export const NOTA_AUTO_FRAMES = 12
/** Fonte gravada em film_review_notes pela nota automática. A do revisor é 'revisor' (ou nula nas linhas antigas). */
export const NOTA_AUTO_FONTE = 'auto'

/** As categorias FIXAS do revisor (SKILL.md passo 3), copiadas na mesma ordem e com os mesmos nomes. */
export const CATEGORIAS_REVISOR = [
  'PERSONAGEM_TROCOU',
  'PESSOA_FALTANDO',
  'PRODUTO_FALTANDO',
  'PRODUTO_DEFORMADO',
  'CENA_FORA_DO_PEDIDO',
  'NARRACAO_LE_INSTRUCAO',
  'TEXTO_INVENTADO',
  'ANATOMIA',
  'LEGENDA',
  'DURACAO_CURTA',
  'QUADRO_PRETO_OU_BORRADO',
  'MARCA_DE_TERCEIRO',
  'REPETICAO',
  'FINAL_FRACO',
  'EFEITO_NAO_ACONTECEU',
  'ROSTO_DIFERENTE_DA_FOTO',
  'BOCA_FORA_DE_SINCRONIA',
  'OLHOS_FECHADOS_OU_MORTOS',
  'OUTRO',
] as const
export type CategoriaRevisor = (typeof CATEGORIAS_REVISOR)[number]

/** O que cada categoria quer dizer — a definição do revisor, em inglês para o modelo (SKILL.md passo 3). */
const DEFINICAO: Record<CategoriaRevisor, string> = {
  PERSONAGEM_TROCOU: 'the same character/person changes identity between frames (different face, age, gender, hair, species or outfit for the one who should be the same)',
  PESSOA_FALTANDO: 'a person/character the request or narration is about never appears, or appears only as an unrecognisable silhouette',
  PRODUTO_FALTANDO: 'the product/object the request is about never appears on screen',
  PRODUTO_DEFORMADO: 'the product changes colour, shape or label between frames',
  CENA_FORA_DO_PEDIDO: 'frames show something unrelated to the request or to what the narration says at that point (wrong place, wrong era, wrong subject, generic filler)',
  NARRACAO_LE_INSTRUCAO: 'burned-in text/caption shows production instructions (e.g. markers, brackets, camera directions) instead of the story',
  TEXTO_INVENTADO: 'gibberish or invented text on signs, screens, papers or titles that is not the caption',
  ANATOMIA: 'deformed hands, faces, limbs or bodies (extra fingers, melted face, broken body)',
  LEGENDA: 'burned-in caption is broken, cut off, overlapping, illegible or in the wrong language',
  DURACAO_CURTA: 'the film visibly ends before the story is told',
  QUADRO_PRETO_OU_BORRADO: 'black, blank, frozen or heavily blurred frames',
  MARCA_DE_TERCEIRO: 'third-party logo or watermark (not the caption, not usekineo.com)',
  REPETICAO: 'the same shot or nearly identical image is reused in different moments of the film',
  FINAL_FRACO: 'the last frames do not close the story (abrupt cut, unrelated image, no payoff of the hook)',
  EFEITO_NAO_ACONTECEU: 'a visual effect explicitly requested never happens',
  ROSTO_DIFERENTE_DA_FOTO: 'the face does not match the reference photo given by the customer',
  BOCA_FORA_DE_SINCRONIA: 'mouth visibly out of sync with the burned-in caption',
  OLHOS_FECHADOS_OU_MORTOS: 'a featured person has closed, empty or dead-looking eyes',
  OUTRO: 'any other defect the customer would notice (say which in the evidence)',
}

/**
 * Defeitos que, GRAVES, puxam a nota para baixo de 6: são os que o revisor mais usa nos filmes ruins
 * (film_review_notes, produto filme, até 13/11: PESSOA_FALTANDO média 4,9; PERSONAGEM_TROCOU 5,8; TEXTO_INVENTADO 5,8;
 * CENA_FORA_DO_PEDIDO 6,1). Os demais, graves, levam a nota para a faixa de 6.
 */
export const CATEGORIAS_CENTRAIS: ReadonlySet<CategoriaRevisor> = new Set<CategoriaRevisor>([
  'PESSOA_FALTANDO', 'PERSONAGEM_TROCOU', 'CENA_FORA_DO_PEDIDO', 'TEXTO_INVENTADO', 'ANATOMIA', 'QUADRO_PRETO_OU_BORRADO', 'PRODUTO_FALTANDO',
])

/** A régua de nota (código, não modelo). Calibrada nas notas do revisor: filme sem defeito = 7,7 em média (7–8,5). */
export const REGUA_NOTA_AUTO = {
  base: 8,
  leve: 0.5,
  grave: 1.5,
  graveCentral: 2,
  piso: 1,
} as const

export type Gravidade = 'grave' | 'leve'
export type DefeitoAuto = { categoria: CategoriaRevisor; gravidade: Gravidade; quadros: number[]; evidencia: string }
export type QuadroAuto = { url: string; t: number | null }
export type NotaAutoEntrada = {
  quadros: QuadroAuto[]
  /** o pedido original do cliente (videos.topic / prompt); marcadores de roteiro saem em limparPedido */
  pedido: string
  /** a narração/legenda do filme, quando há (videos.script) */
  roteiro?: string | null
  produto: string
  motor: string | null
  segundos?: number | null
}
export type NotaAutoDetail = 'low' | 'high' | 'auto'
export type NotaAutoResultado = {
  version: typeof NOTA_AUTO_VERSION
  nota: number
  defeitos: DefeitoAuto[]
  /** defeitos que o modelo citou SEM quadro válido — descartados da nota, guardados só para auditoria */
  descartados: number
  resumo: string
  model: string
  detail: NotaAutoDetail
  frames: number
  usd: number
  ms: number
}

/** US$ por milhão de tokens (entrada/saída) dos modelos de visão do registro. */
export const NOTA_AUTO_RATES: Record<string, { inPerM: number; outPerM: number }> = {
  [AI_TEXT_MODELS.writer]: { inPerM: 2.5, outPerM: 10 },
  [AI_TEXT_MODELS.research]: { inPerM: 0.4, outPerM: 1.6 },
  [AI_TEXT_MODELS.vision]: { inPerM: 0.15, outPerM: 0.6 },
}
/**
 * Modelo padrão. NOTA_AUTO_MODEL troca sem deploy de código. ENSAIO DE 13/11 (scripts/calibra-nota-auto-1311.mts, 40 filmes já
 * avaliados pelo revisor): NENHUM modelo passou. gpt-4o high pegou 85% dos ruins, mas deu alarme falso em 61% dos bons; gpt-4.1-mini
 * high ficou em 60% / 33%. Por isso o interruptor NOTA_AUTO_MODE fica 'off'. Não ligar 'painel' sem um ensaio novo que passe
 * (≥ 85% nos ruins e ≤ 10% de alarme).
 */
export const NOTA_AUTO_MODEL_DEFAULT: string = AI_TEXT_MODELS.writer
export const NOTA_AUTO_DETAIL_DEFAULT: NotaAutoDetail = 'high'

const arred05 = (x: number) => Math.round(x * 2) / 2

/** Nota 0–10 em passos de 0,5, SÓ a partir dos defeitos. Mesma categoria repetida conta uma vez (a mais grave). */
export function notaDosDefeitos(defeitos: ReadonlyArray<Pick<DefeitoAuto, 'categoria' | 'gravidade'>>): number {
  const porCat = new Map<CategoriaRevisor, Gravidade>()
  for (const d of defeitos) {
    const g = porCat.get(d.categoria)
    if (g !== 'grave') porCat.set(d.categoria, d.gravidade)
  }
  let nota: number = REGUA_NOTA_AUTO.base
  for (const [cat, g] of Array.from(porCat.entries())) {
    if (g === 'grave') {
      nota -= CATEGORIAS_CENTRAIS.has(cat) ? REGUA_NOTA_AUTO.graveCentral : REGUA_NOTA_AUTO.grave
    } else {
      nota -= REGUA_NOTA_AUTO.leve
    }
  }
  return Math.max(REGUA_NOTA_AUTO.piso, Math.min(10, arred05(nota)))
}

/** Tira do pedido os marcadores do nosso roteirista ([Pexels: …], HOOK:, MICRO REWARD 1:, [Idea: …]) — sobra o que o cliente quer. */
export function limparPedido(s: string): string {
  return String(s ?? '')
    .replace(/\[(?:Pexels|Pixabay|B-?roll|Visual)[^\]]*\]/gi, ' ')
    .replace(/^\s*(?:HOOK|MICRO REWARD\s*\d*|ESCALATION|PAYOFF|RHYTHM|CTA)\s*(?:\([^)]*\))?\s*:\s*/gim, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, 1800)
}

export function buildNotaAutoMessages(e: NotaAutoEntrada, detail: NotaAutoDetail = NOTA_AUTO_DETAIL_DEFAULT) {
  const n = e.quadros.length
  const tempos = e.quadros.map((q, i) => `#${i}${q.t == null ? '' : ` @${q.t.toFixed(1)}s`}`).join(', ')
  const cats = CATEGORIAS_REVISOR.map((c) => `- ${c}: ${DEFINICAO[c]}`).join('\n')
  const system = [
    'You review short AI-generated videos for a video product, exactly like a strict human reviewer who decides whether the customer would proudly post the video.',
    'You receive the customer request, the narration (when there is one), and frames sampled evenly from the FINAL video, in order.',
    'Your job is NOT to rate beauty. Your job is to find the defects a customer would notice, by comparing the frames with the request and with the narration, and with each other.',
    'Work in this order: (1) from the request and narration, list who/what MUST appear and the story beats; (2) describe each frame in a few words; (3) check every defect category below against the frames; (4) report only defects you can point to in specific frames.',
    'Defect categories (use these exact names):',
    cats,
    'Severity: "grave" = the customer would not post the video because of it, or it breaks the story (main subject missing, identity swap of the protagonist, most frames unrelated to the request, deformed faces in the main shots, gibberish text in focus). "leve" = noticeable but the video still works.',
    'Rules: a stylised look is not a defect by itself. Burned-in captions with the narration are expected and are not TEXTO_INVENTADO. A small "usekineo.com" mark is ours, not MARCA_DE_TERCEIRO. Audio cannot be judged. Do not invent defects: if the frames match the request and narration, return an empty list.',
    `Frame indexes go from 0 to ${n - 1}. Every defect must cite the frame indexes where it is visible (for REPETICAO, cite both repeated frames; for PERSONAGEM_TROCOU, cite the frames that disagree).`,
    'Answer ONLY with JSON: {"must_appear": [string], "frames": [{"i": number, "what": string}], "defects": [{"category": string, "severity": "grave"|"leve", "frames": [number], "evidence": string}], "summary": string (one line, Portuguese, what the reviewer would write)}',
  ].join('\n\n')
  const userLines = [
    `Product: ${e.produto}. Engine: ${e.motor ?? 'unknown'}.${e.segundos ? ` Duration: ${Math.round(e.segundos)} s.` : ''}`,
    `Customer request:\n"""${limparPedido(e.pedido) || '(not recorded)'}"""`,
    e.roteiro && e.roteiro.trim() ? `Narration of the film (what the voice says, in order):\n"""${e.roteiro.trim().slice(0, 2500)}"""` : 'Narration: not recorded.',
    `${n} frames, in order: ${tempos}.`,
  ]
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: NotaAutoDetail } }> = [{ type: 'text', text: userLines.join('\n\n') }]
  for (const q of e.quadros) content.push({ type: 'image_url', image_url: { url: q.url, detail } })
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content },
  ]
}

const CAT_SET = new Set<string>(CATEGORIAS_REVISOR)

/** Do JSON do modelo para defeitos válidos. Sem quadro válido = descartado. Categoria fora da lista vira OUTRO (com o nome na evidência). */
export function normalizarDefeitos(json: unknown, nQuadros: number): { defeitos: DefeitoAuto[]; descartados: number; resumo: string } {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const lista = Array.isArray(o.defects) ? o.defects : []
  const defeitos: DefeitoAuto[] = []
  let descartados = 0
  for (const raw of lista) {
    if (!raw || typeof raw !== 'object') { descartados++; continue }
    const d = raw as Record<string, unknown>
    const nome = String(d.category ?? '').trim().toUpperCase()
    const categoria = (CAT_SET.has(nome) ? nome : 'OUTRO') as CategoriaRevisor
    const quadros = Array.from(new Set((Array.isArray(d.frames) ? d.frames : [])
      .map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0 && x < nQuadros))).sort((a, b) => a - b)
    // REPETICAO e PERSONAGEM_TROCOU só existem entre DOIS quadros; o resto precisa de pelo menos um.
    const minimo = categoria === 'REPETICAO' || categoria === 'PERSONAGEM_TROCOU' ? 2 : 1
    if (quadros.length < minimo) { descartados++; continue }
    const gravidade: Gravidade = String(d.severity ?? '').toLowerCase() === 'grave' ? 'grave' : 'leve'
    const ev = String(d.evidence ?? '').trim().slice(0, 300)
    defeitos.push({ categoria, gravidade, quadros, evidencia: categoria === 'OUTRO' && nome && nome !== 'OUTRO' ? `${nome}: ${ev}`.slice(0, 300) : ev })
  }
  const resumo = typeof o.summary === 'string' ? o.summary.trim().slice(0, 240) : ''
  return { defeitos, descartados, resumo }
}

/** Uma leitura do juiz. Falha aberta: null. */
export async function julgarNotaAuto(
  e: NotaAutoEntrada,
  opts?: { fetchImpl?: typeof fetch; apiKey?: string; model?: string; detail?: NotaAutoDetail; timeoutMs?: number; usdQuadros?: number },
): Promise<NotaAutoResultado | null> {
  const started = Date.now()
  if (!e.quadros.length) return null
  const key = opts?.apiKey ?? process.env.OPENAI_API_KEY
  if (!key) return null
  const model = opts?.model ?? process.env.NOTA_AUTO_MODEL ?? NOTA_AUTO_MODEL_DEFAULT
  const detail = opts?.detail ?? NOTA_AUTO_DETAIL_DEFAULT
  const doFetch = opts?.fetchImpl ?? fetch
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 120_000)
  try {
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 1800, response_format: { type: 'json_object' }, messages: buildNotaAutoMessages(e, detail) }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    let parsed: unknown
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '')
    } catch {
      return null
    }
    const { defeitos, descartados, resumo } = normalizarDefeitos(parsed, e.quadros.length)
    const usd = usdFromUsage(data.usage, NOTA_AUTO_RATES[model] ?? NOTA_AUTO_RATES[AI_TEXT_MODELS.writer]) + (opts?.usdQuadros ?? 0)
    return {
      version: NOTA_AUTO_VERSION,
      nota: notaDosDefeitos(defeitos),
      defeitos,
      descartados,
      resumo,
      model,
      detail,
      frames: e.quadros.length,
      usd: Math.round(usd * 1e6) / 1e6,
      ms: Date.now() - started,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** 12 quadros do MP4 final pela fal (extract-nth-frame, o mesmo modelo do pixel_score). null quando não deu. Nunca lança. */
export async function extrairQuadrosNotaAutoFal(
  videoUrl: string,
  seconds: number | null | undefined,
  opts?: { fetchImpl?: typeof fetch; falKey?: string; timeoutMs?: number },
): Promise<{ quadros: QuadroAuto[]; usd: number } | null> {
  const key = opts?.falKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY
  if (!key || !videoUrl) return null
  const doFetch = opts?.fetchImpl ?? fetch
  const s = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds : 15
  const passo = Math.max(1, Math.min(300, Math.floor((s * PIXEL_FPS_ASSUMED) / NOTA_AUTO_FRAMES)))
  const started = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 90_000)
  try {
    const res = await doFetch(`https://fal.run/${FAL_NTH_FRAME_MODEL}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: videoUrl, frame_interval: passo, max_frames: NOTA_AUTO_FRAMES + 2, output_format: 'jpg', quality: 80 }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { images?: Array<{ url?: unknown }> }
    const todos = (Array.isArray(data.images) ? data.images : [])
      .map((im, i) => ({ url: typeof im?.url === 'string' ? im.url : '', t: Math.round(((i * passo) / PIXEL_FPS_ASSUMED) * 10) / 10 }))
      .filter((q) => q.url)
    if (!todos.length) return null
    return { quadros: pickEvenly(todos, NOTA_AUTO_FRAMES), usd: ((Date.now() - started) / 1000) * FAL_USD_PER_COMPUTE_SECOND }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ── O interruptor e a regra de escrita no painel ──

export type NotaAutoMode = 'off' | 'observe' | 'painel'
/** NOTA_AUTO_MODE: nasce 'off'. Qualquer valor desconhecido = 'off' (nunca liga por engano). */
export function lerModoNotaAuto(env: Record<string, string | undefined> = process.env): NotaAutoMode {
  const v = String(env.NOTA_AUTO_MODE ?? '').trim().toLowerCase()
  return v === 'observe' || v === 'painel' ? v : 'off'
}

/**
 * O que fazer com a linha de film_review_notes do mesmo link. A NOTA DO REVISOR MANDA: linha existente com fonte diferente de
 * 'auto' (inclusive nula — as linhas antigas do revisor) nunca é tocada. Só no modo 'painel'.
 */
export function decidirEscritaPainel(modo: NotaAutoMode, existente: { fonte: string | null } | null): 'inserir' | 'atualizar' | 'pular' {
  if (modo !== 'painel') return 'pular'
  if (!existente) return 'inserir'
  return existente.fonte === NOTA_AUTO_FONTE ? 'atualizar' : 'pular'
}

/** A linha que vai para film_review_notes (mesmas colunas que o revisor preenche + motor e fonte). */
export function linhaDoPainel(r: NotaAutoResultado, x: { link: string; quando: string; quem: string | null; motor: string | null; produto: string; ordem?: number | null }) {
  return {
    link: x.link,
    quando: x.quando,
    quem: x.quem,
    motor: x.motor,
    produto: x.produto,
    ordem: x.ordem ?? null,
    nota: r.nota,
    defeitos: Array.from(new Set(r.defeitos.map((d) => d.categoria))),
    resumo: r.resumo || null,
    fonte: NOTA_AUTO_FONTE,
  }
}

// ── No cron (lib/regua95/coletar.ts): quem falta julgar, julgar e gravar ──
// O coletor só escreve em `events` pelos 3 juízes antigos (guardiões R1/U7); a nota automática tem o SEU ponto de escrita aqui:
// o evento nota_auto (observe e painel) e, só no modo 'painel', a linha de film_review_notes com fonte 'auto'.

/** Só filmes entregues nas últimas 6 h entram: ligar o interruptor não compra a nota da semana inteira de uma vez. */
export const NOTA_AUTO_JANELA_HORAS = 6
export const NOTA_AUTO_MAX_FALHAS = 3
export const NOTA_AUTO_ESPERA_FALHA_MS = 60 * 60_000

/** O que o cron precisa saber de um filme para dar a nota (preenchido só para produto 'filme' em listarEntregasRegua). */
export type NotaAutoAlvo = { pedido: string; roteiro: string | null; motor: string | null }
type EntregaNotaAuto = { key: string; user_id: string; delivered_at: string; video_url: string; seconds: number | null; product: string; notaAuto?: NotaAutoAlvo | null }

/** Chaves que NÃO entram agora: nota de verdade = feito; falha = espera 1 h e tenta de novo até 3 vezes. */
export async function notasAutoFeitas(admin: SupabaseClient, keys: string[], readAll: typeof ReadAllRows, route = '/api/cron/regua-95', agora: number = Date.now()): Promise<Set<string>> {
  const feitas = new Set<string>()
  const falhas = new Map<string, { n: number; ultima: number }>()
  const unicas = Array.from(new Set(keys))
  for (let i = 0; i < unicas.length; i += 100) {
    const part = unicas.slice(i, i + 100)
    const r = await readAll(() => admin.from('events').select('created_at, session_id, metadata').eq('name', NOTA_AUTO_EVENT).in('session_id', part), { route, table: 'events' })
    for (const ev of (r.data ?? []) as Array<{ created_at: string; session_id: string | null; metadata: Record<string, unknown> | null }>) {
      if (!ev.session_id || ev.metadata?.version !== NOTA_AUTO_VERSION) continue
      if (typeof ev.metadata?.score === 'number') { feitas.add(ev.session_id); continue }
      const f = falhas.get(ev.session_id) ?? { n: 0, ultima: 0 }
      f.n += 1
      f.ultima = Math.max(f.ultima, Date.parse(ev.created_at) || 0)
      falhas.set(ev.session_id, f)
    }
  }
  for (const [k, f] of Array.from(falhas.entries())) if (f.n >= NOTA_AUTO_MAX_FALHAS || agora - f.ultima < NOTA_AUTO_ESPERA_FALHA_MS) feitas.add(k)
  return feitas
}

/** Esta entrega precisa da nota automática agora? Só com o interruptor ligado, só filme, só dentro da janela, só uma vez. */
export function notaAutoPendente(modo: NotaAutoMode, e: Pick<EntregaNotaAuto, 'key' | 'delivered_at' | 'notaAuto'>, feitas: Set<string>, agora: number = Date.now()): boolean {
  if (modo === 'off' || !e.notaAuto) return false
  if (feitas.has(e.key)) return false
  const t = Date.parse(e.delivered_at)
  return Number.isFinite(t) && agora - t <= NOTA_AUTO_JANELA_HORAS * 3600_000
}

/** Ordem do item para o cliente contando todos os produtos (videos completos + clipes prontos até a entrega) — a mesma do revisor. */
async function ordemDoCliente(admin: SupabaseClient, userId: string, ate: string): Promise<number | null> {
  try {
    const [v, c] = await Promise.all([
      admin.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed').lte('created_at', ate),
      admin.from('clips').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'done').lte('created_at', ate),
    ])
    if (v.error || c.error || typeof v.count !== 'number' || typeof c.count !== 'number') return null
    return v.count + c.count
  } catch {
    return null
  }
}

/**
 * Julga UM filme e grava. Nunca lança. Grava SEMPRE o evento nota_auto (com a nota, ou score null + falha para a retentativa);
 * no modo 'painel', grava também a linha de film_review_notes — SEM NUNCA sobrescrever linha cuja fonte não seja 'auto'
 * (decidirEscritaPainel + o filtro .eq('fonte', 'auto') no update, para a corrida com o revisor). Contas da casa ficam fora do painel.
 */
export async function julgarEGravarNotaAuto(
  admin: SupabaseClient,
  x: { modo: NotaAutoMode; entrega: EntregaNotaAuto; base: Record<string, unknown>; route: string; fetchImpl?: typeof fetch },
): Promise<{ nota: number | null; usd: number; painel: string; erro?: string }> {
  const e = x.entrega
  const alvo = e.notaAuto
  let erro: string | undefined
  const gravarEvento = async (metadata: Record<string, unknown>) => {
    const { error } = await admin.from('events').insert({ name: NOTA_AUTO_EVENT, user_id: e.user_id, session_id: e.key, path: x.route, metadata })
    if (error) erro = [erro, `insert_${NOTA_AUTO_EVENT}: ${String(error.message).slice(0, 120)}`].filter(Boolean).join(' · ')
  }
  if (x.modo === 'off' || !alvo) return { nota: null, usd: 0, painel: 'pular' }
  try {
    const ex = await extrairQuadrosNotaAutoFal(e.video_url, e.seconds, { fetchImpl: x.fetchImpl })
    const r = ex ? await julgarNotaAuto({ quadros: ex.quadros, pedido: alvo.pedido, roteiro: alvo.roteiro, produto: e.product, motor: alvo.motor, segundos: e.seconds }, { fetchImpl: x.fetchImpl, usdQuadros: ex.usd }) : null
    if (!r) {
      const falha = ex ? 'nota_auto_visao_sem_resposta' : 'nota_auto_quadros_indisponiveis'
      await gravarEvento({ version: NOTA_AUTO_VERSION, score: null, falha, modo: x.modo, frame_count: ex?.quadros.length ?? 0, ...x.base, video_url: e.video_url })
      return { nota: null, usd: ex?.usd ?? 0, painel: 'pular', erro: [erro, falha].filter(Boolean).join(' · ') }
    }
    let painel: string = 'pular'
    if (x.modo === 'painel') {
      const u = await admin.auth.admin.getUserById(e.user_id).catch(() => null)
      const email = u?.data?.user?.email ?? null
      if (!email) painel = 'pular_sem_email'
      else if (isInternalEmail(email)) painel = 'pular_conta_interna'
      else {
        const lida = await admin.from('film_review_notes').select('fonte').eq('link', e.video_url).maybeSingle()
        if (lida.error) painel = 'pular_leitura_falhou'
        else {
          const decisao = decidirEscritaPainel(x.modo, (lida.data as { fonte: string | null } | null) ?? null)
          painel = decisao === 'pular' ? 'pular_nota_do_revisor' : decisao
          if (decisao !== 'pular') {
            const linha = linhaDoPainel(r, { link: e.video_url, quando: e.delivered_at, quem: email.split('@')[0], motor: alvo.motor, produto: e.product, ordem: await ordemDoCliente(admin, e.user_id, e.delivered_at) })
            const w = decisao === 'inserir'
              ? await admin.from('film_review_notes').insert(linha)
              : await admin.from('film_review_notes').update({ ...linha, updated_at: new Date().toISOString() }).eq('link', e.video_url).eq('fonte', NOTA_AUTO_FONTE)
            if (w.error) { painel = `${decisao}_falhou`; erro = `painel: ${String(w.error.message).slice(0, 120)}` }
          }
        }
      }
    }
    await gravarEvento({ ...r, score: r.nota, modo: x.modo, painel, ...x.base, video_url: e.video_url, pedido: alvo.pedido.slice(0, 600) })
    return { nota: r.nota, usd: r.usd, painel, ...(erro ? { erro } : {}) }
  } catch (err) {
    return { nota: null, usd: 0, painel: 'pular', erro: err instanceof Error ? err.message.slice(0, 160) : 'erro' }
  }
}
