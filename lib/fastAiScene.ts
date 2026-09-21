// KINEO-1-HIBRIDO-2026-09-16 — cena que o banco de imagens não cobre vira imagem gerada.
//
// Decisão do fundador (16/09, manhã: "Vai! Já é uma melhora significativa"): o Kineo 1 é o
// motor de 100% das primeiras impressões agora que o trial é de 10 créditos, e o banco
// (Pixabay) nunca vai ter Ayodhya, Rama Setu, o Bezos ou "a mulher de Strasbourg em 1518".
// O plano de cena já sabia dizer "esta cena o banco não cobre" (lib/broll/hybrid-source.ts,
// source: 'ai'), mas a rota do Kineo 1 ignorava o campo e buscava stock mesmo assim — e
// quando o Pixabay não achava nada, RECICLAVA um clipe anterior (FALLBACK-A), que é
// exatamente a "foto que deixa a desejar" que o fundador viu nos vídeos da Índia.
//
// O que muda: para uma cena marcada (plano diz 'ai' · relevância conhecida baixa · nome
// próprio/lugar específico na narração · Pixabay sem resultado) a rota gera UM still FLUX
// (a mesma peça das âncoras, lib/hollywood/anchors.ts), persiste no NOSSO bucket (a URL do
// fal expira e o /api/compose a recusa) e entrega como clipe; o montador dá o movimento de
// câmera (Ken Burns) — mesmo tratamento dos clipes de stock. Sem rosto de pessoa real: um
// nome famoso vira cena simbólica (o escritório, as caixas, a rotina), nunca um retrato.
//
// Custo: ~US$ 0,03 por still (flux/dev), teto de 3 por filme → ≤ US$ 0,10 por Kineo 1.
// Tempo: janela de 10 s por still, sequencial, dentro dos 120 s da rota. FALHA ABERTA:
// qualquer erro devolve null e a cena segue o caminho antigo (stock/fallback). Nada de
// crédito novo para o cliente: o Kineo 1 continua 5 créditos.
//
// Interruptor: ligado por padrão; KINEO_FAST_AI_SCENES=off desliga; KINEO_FAST_AI_SCENES_MAX
// (padrão 3, teto 6) limita por filme.

import { generateCinematicSceneStill } from '@/lib/hollywood/anchors'
import type { StyleAnchor } from '@/lib/cinematic/sceneStyle' // KINEO1-FILME-DESENHADO-2026-09-21 (só tipo)
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// ═══ KINEO-SEM-FOTO-2026-09-21 — fundador: "não existe foto no Kineo… desliga as fotos e estende os clipes" ═══
// Medido 16-21/09: 99 filmes receberam 237 stills (2,4 por filme). A foto com Ken Burns no meio de clipes em movimento
// foi o que o fundador viu "na semana passada" e reprovou. O still passa a ser OPT-IN (KINEO_FAST_AI_SCENES=on) —
// nasce desligado; o lugar dele é ocupado por clipes de VÍDEO (lib/fastAiClips, 1º filme de todos + pagantes).
export const FAST_AI_SCENES_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  (process.env.KINEO_FAST_AI_SCENES ?? '').trim().toLowerCase(),
)

// R2 (16/09 tarde): 3 → 4 — o still soma ao stock da cena, e a cena que o Pixabay não acha ganha o seu.
export const FAST_AI_SCENES_MAX_DEFAULT = 4
export function fastAiScenesMax(): number {
  const raw = Number.parseInt((process.env.KINEO_FAST_AI_SCENES_MAX ?? '').trim(), 10)
  if (!Number.isFinite(raw) || raw < 0) return FAST_AI_SCENES_MAX_DEFAULT
  return Math.min(6, raw)
}

/** Relevância conhecida abaixo disto = o banco não tem a cena (escala 0-100 do plano). */
export const FAST_AI_LOW_RELEVANCE = 60
/** Janela de espera por still; a rota tem 120 s e o laço de cenas já gasta com o Pixabay. */
export const FAST_AI_STILL_WINDOW_MS = 12_000 // KINEO-STILL-NITIDO-2026-09-18: 28 passos do FLUX dev pedem ~3-5 s; era 10 s

export type FastAiSceneReason = 'plan_ai' | 'low_relevance' | 'named_entity' | 'pixabay_miss' | 'character_story' | 'first_film' | 'drawn'

const STOP = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'And', 'But', 'Or', 'So', 'Then', 'When', 'While', 'After', 'Before', 'This', 'That', 'These', 'Those', 'It', 'He', 'She', 'They', 'We', 'You', 'I', 'His', 'Her', 'Their', 'Our', 'Its', 'Now', 'Today', 'Here', 'There', 'What', 'Why', 'How', 'Who', 'Where', 'Imagine', 'Every', 'Most', 'Some', 'One', 'Two', 'Three', 'First', 'Second', 'Last', 'Meanwhile', 'Suddenly', 'Finally', 'Yes', 'No', 'Not', 'Even', 'Just', 'Only', 'Still', 'Also', 'For', 'From', 'With', 'Without', 'Inside', 'Outside', 'Under', 'Over', 'Into', 'Through', 'Because', 'If', 'As', 'By', 'To', 'Of', 'Is', 'Are', 'Was', 'Were', 'Be', 'Been', 'Do', 'Does', 'Did', 'Can', 'Could', 'Will', 'Would', 'Should', 'May', 'Might', 'Must', 'Let', 'Picture', 'Think', 'Consider', 'Remember', 'Welcome', 'Ever', 'Once', 'Nobody', 'Everyone', 'Someone', 'People', 'Scientists', 'Experts', 'Doctors', 'Studies', 'Research'])

/**
 * Nome próprio ou lugar específico na fala: palavra capitalizada que NÃO abre a frase
 * (ou duas capitalizadas seguidas, que nem no início da frase são genéricas: "Jeff Bezos",
 * "Rama Setu", "Sri Lanka"), ou um ano de quatro dígitos ("1518"). Heurística deliberadamente
 * simples e legível — o custo de um falso positivo é um still bonito no lugar de um clipe
 * de stock; o custo de um falso negativo é o clipe genérico de hoje.
 */
export function mentionsNamedEntity(text: string | null | undefined): string | null {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return null
  const par = t.match(/\b([A-Z][a-zA-Z'’-]+)\s+([A-Z][a-zA-Z'’-]+)\b/)
  if (par && !(STOP.has(par[1]) && STOP.has(par[2]))) return `${par[1]} ${par[2]}`
  const sentences = t.split(/(?<=[.!?…])\s+/)
  for (const s of sentences) {
    const words = s.split(' ')
    for (let i = 1; i < words.length; i++) {
      const w = words[i].replace(/^[("'“‘]+|[)"'”’,.;:!?]+$/g, '')
      if (/^[A-Z][a-z]{2,}$/.test(w) && !STOP.has(w)) return w
    }
  }
  const year = t.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)
  if (year) return year[1]
  return null
}

export function decideFastAiScene(input: {
  planSource?: string | null
  relevanceScore?: number | null
  voiceover?: string | null
  description?: string | null
  pixabayMiss?: boolean
}): { ai: boolean; reason: FastAiSceneReason | null; entity: string | null } {
  if (!FAST_AI_SCENES_ENABLED) return { ai: false, reason: null, entity: null }
  if (input.planSource === 'ai') return { ai: true, reason: 'plan_ai', entity: null }
  if (typeof input.relevanceScore === 'number' && Number.isFinite(input.relevanceScore) && input.relevanceScore < FAST_AI_LOW_RELEVANCE) {
    return { ai: true, reason: 'low_relevance', entity: null }
  }
  const entity = mentionsNamedEntity(input.voiceover) ?? mentionsNamedEntity(input.description)
  if (entity) return { ai: true, reason: 'named_entity', entity }
  if (input.pixabayMiss) return { ai: true, reason: 'pixabay_miss', entity: null }
  return { ai: false, reason: null, entity: null }
}

/**
 * O prompt do still nasce da DESCRIÇÃO visual da cena (o que o planejador quis mostrar), com a
 * fala como contexto. Regras fixas: sem texto legível (ressalva do Seedance 9,5), sem rosto de
 * pessoa real (nome famoso vira cena simbólica), fotorrealista, cinema.
 */
export function buildFastStillPrompt(input: { description?: string | null; voiceover?: string | null; query?: string | null; entity?: string | null; look?: StyleAnchor | null }): string {
  const desc = (input.description ?? '').replace(/\s+/g, ' ').trim()
  const query = (input.query ?? '').replace(/\s+/g, ' ').trim()
  const voice = (input.voiceover ?? '').replace(/\s+/g, ' ').trim().slice(0, 220)
  const base = desc || query || voice
  const ctx = desc && voice ? ` Context of the narration: "${voice}".` : ''
  const symbolic = input.entity ? ` If the scene involves a real person (${input.entity}), show the setting, objects and atmosphere that represent them — never a recognizable face or likeness.` : ''
  // KINEO1-FILME-DESENHADO-2026-09-21 — pedido de desenho (lib/cinematic/sceneStyle) troca o still fotorreal pelo look
  // pedido (3D animado / anime / ilustração). O "sem rosto de pessoa real" continua: personagem desenhado não é pessoa.
  if (input.look && input.look.look !== 'photoreal' && input.look.look !== 'noir') {
    return (
      `${input.look.lookPhrase}, single frame of an animated film, sharp focus on the character, crisp detail, vibrant color: ${base}.${ctx} ` +
      `No readable text, no captions, no logos, no watermark, no real person's likeness.`
    )
  }
  return (
    // KINEO-STILL-NITIDO-2026-09-18 — "shallow depth of field" + "muted" somavam névoa ao passo errado do FLUX;
    // agora: foco nítido no sujeito, contraste normal. O sujeito da fala precisa ser LEGÍVEL na tela do celular.
    `Photorealistic cinematic still, documentary photography, natural light, sharp focus on the subject, crisp detail, natural contrast: ${base}.${ctx}${symbolic} ` +
    `No readable text, no captions, no logos, no watermark, no real person's face.`
  )
}

const FAL_URL_RE = /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\//i
const STILL_BUCKET = 'broll'
const MAX_STILL_BYTES = 12 * 1024 * 1024

/** Copia o still do fal para o nosso bucket público (a URL do fal expira e o compose a recusa). */
export async function persistFastStill(falUrl: string, budgetMs = 8_000): Promise<string | null> {
  try {
    if (!falUrl) return null
    if (!FAL_URL_RE.test(falUrl)) return falUrl
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    const admin = createSupabaseAdmin(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const res = await fetch(falUrl, { signal: AbortSignal.timeout(budgetMs) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength === 0 || buf.byteLength > MAX_STILL_BYTES) return null
    const ct = (res.headers.get('content-type') ?? '').toLowerCase()
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const path = `ai-still/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await admin.storage.from(STILL_BUCKET).upload(path, buf, { contentType, upsert: false })
    if (error) return null
    const { data: pub } = admin.storage.from(STILL_BUCKET).getPublicUrl(path)
    return pub?.publicUrl ?? null
  } catch {
    return null
  }
}

/** Seed estável por filme (mesma paleta entre stills do mesmo pedido). */
export function fastStillSeed(prompt: string): number {
  let h = 2166136261
  for (let i = 0; i < prompt.length; i++) { h ^= prompt.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return (h % 1_000_000) + 1
}

/**
 * Gera + persiste um still para a cena. FALHA ABERTA: null em qualquer erro.
 * Nunca lança; nunca devolve URL do fal.
 */
export async function generateFastSceneStill(args: { prompt: string; seed: number; aspect?: string | null; windowMs?: number; look?: StyleAnchor | null }): Promise<string | null> {
  try {
    const falUrl = await generateCinematicSceneStill({
      scenePrompt: args.prompt,
      // KINEO1-FILME-DESENHADO-2026-09-21 — o sufixo fotorreal contradizia o prompt desenhado; o look traz a própria trava.
      styleSuffix: args.look && args.look.look !== 'photoreal' ? args.look.suffix : 'documentary realism, natural color grade, sharp 35mm film look', // KINEO-STILL-NITIDO — sem 'muted'
      seed: args.seed,
      pollWindowMs: args.windowMs ?? FAST_AI_STILL_WINDOW_MS,
      aspect: args.aspect ?? '9:16',
    })
    if (!falUrl) return null
    const durable = await persistFastStill(falUrl)
    if (!durable || FAL_URL_RE.test(durable)) return null
    return durable
  } catch {
    return null
  }
}

/** URL de imagem (o montador troca o elemento de vídeo por imagem com o mesmo Ken Burns). */
export const IMAGE_URL_RE = /\.(png|jpe?g|webp)(\?|#|$)/i

// ── KINEO-HISTORIA-COM-PERSONAGENS-2026-09-16 — o panda do Johny ─────────────────────────────────
//
// Fundador (16/09 noite): "vi o primeiro e tomei um susto porque tem um panda". O filme era
// "Johny's cookie heist… has a twist!" — Johny espia o biscoito, Papa entra, a migalha cai, a
// bolha de biscoito flutua. Kineo 1, 23:02Z. Nenhum still foi gerado (mentionsNamedEntity não
// pega "Johny's" com apóstrofo nem "Papa" abrindo a frase) e o banco de imagens, buscando
// "cookie"/"giggles", devolveu um PANDA. Um banco de stock nunca vai ter o Johny: história com
// personagens nomeados é, por definição, cena que o stock não cobre — cada cena vira still, e o
// stock NÃO entra nessas cenas (o still não pode ganhar um panda de companheiro).
//
// Heurística: um nome próprio (capitalizado, sem ser palavra de abertura genérica) que se REPETE
// no texto (Johny ×3), ou um papel de família (Papa, Mom, Dad, Grandma…) — os dois marcam ficção
// com personagem. Fatos, história e ciência raramente repetem um nome próprio que não seja lugar;
// e quando repetem (Bezos ×3), o still também é melhor que o stock. Custo: até 8 stills
// (~US$ 0,24) num filme que hoje custaria um panda.
//
// KINEO1-VIDEO-NAO-FOTO-2026-09-17 — o detector conta CADA FRASE UMA VEZ. A rota passava
// `${prompt} ${falas}`, e o prompt do Kineo 1 JÁ É o roteiro com as falas: toda palavra capitalizada
// contava em dobro e "aparece 2×" virava verdade para qualquer abertura de frase. "Faster. Wilder.
// Boundless." fez de "Faster" o personagem do filme da menina com o coelho (life2026dil, 17/09 02:54Z)
// — e o filme saiu com 7 fotos e 0 clipe de vídeo. Agora frases repetidas (mesmo texto) contam uma vez,
// e a rota passa só as falas.
const PAPEIS_DE_FAMILIA = new Set(['papa', 'mama', 'mom', 'mommy', 'mum', 'mummy', 'dad', 'daddy', 'grandma', 'grandpa', 'granny', 'nana', 'auntie', 'uncle'])
export const CHARACTER_STORY_MAX_STILLS = 8

/** Nome do personagem quando o texto é uma história com personagens; null caso contrário. */
export function characterStoryName(text: string | null | undefined): string | null {
  const t0 = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!t0) return null
  // Cada frase conta uma vez (o prompt do Kineo 1 repete as falas do roteiro).
  const vistas = new Set<string>()
  const t = t0
    .split(/(?<=[.!?…])\s+/)
    .filter((f) => { const k = f.trim().toLowerCase(); if (!k || vistas.has(k)) return false; vistas.add(k); return true })
    .join(' ')
  const counts = new Map<string, number>()
  for (const raw of t.split(' ')) {
    const w = raw.replace(/^[("'“‘]+|[)"'”’,.;:!?…]+$/g, '').replace(/['’]s$/, '')
    if (PAPEIS_DE_FAMILIA.has(w.toLowerCase())) return w
    if (/^[A-Z][a-z]{2,}$/.test(w) && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  let best: string | null = null
  let bestN = 0
  for (const [w, n] of counts) if (n >= 2 && n > bestN) { best = w; bestN = n }
  return best
}

// ── KINEO-PRIMEIRO-FILME-COM-STILLS-2026-09-16 — DESLIGADO em 17/09: era leitura errada do pedido ──
//
// Fundador (16/09 noite): "todo primeiro vídeo eu quero poder gastar mais 50 centavos de dólar… para
// tornar as imagens melhores". A sessão de 16/09 leu "imagens" como STILL e pôs uma foto gerada abrindo
// TODA cena do primeiro filme (teto 12, ~US$ 0,36). Fundador (17/09 madrugada, olhando dois primeiros
// filmes que saíram como slideshow — life2026dil e bekeecomedytv, 7 cenas, 7 fotos, 0 clipe): "não era
// imagem que era para abrir. Era VÍDEO, era o vídeo que era para ser melhor. […] são dois clientes a
// menos". Foto parada no primeiro filme é downgrade, não upside. A regra nasce DESLIGADA e só liga com
// KINEO_FIRST_FILM_STILLS=on (ensaio interno). O upside de VÍDEO do primeiro filme é outra peça —
// docs/KINEO1-VIDEO-NAO-FOTO-2026-09-17.md.
export const FIRST_FILM_MAX_STILLS = 12
export const FIRST_FILM_STILLS_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  (process.env.KINEO_FIRST_FILM_STILLS ?? '').trim().toLowerCase(),
)
