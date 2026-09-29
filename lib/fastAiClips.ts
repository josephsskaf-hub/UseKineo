// KINEO1-PRIMEIRO-FILME-VIDEO-2026-09-17 — VÍDEO gerado nas cenas fracas do primeiro filme (teto US$ 0,50).
//
// Fundador (16/09 noite): "todo primeiro vídeo eu quero poder gastar mais 50 centavos de dólar… para tornar
// as imagens melhores". A sessão de 16/09 leu "imagens" como foto e o primeiro filme virou slideshow.
// Fundador (17/09 madrugada): "era VÍDEO que era para ser melhor… colocar um pedaço de Seedance nas cenas
// fracas e fortalecer… max 0.5 teto!!".
//
// O que já existia e NUNCA chegou ao filme: o AI hook (lib/fastAiHook.ts) submete um Seedance de 5 s para a
// cena 1 do primeiro filme de conta gratuita e espera 15 s na rota do Kineo 1. A Seedance leva 60-120 s.
// Medido em 17/09: 0 de 142 filmes em 12 dias saíram com o hook ("budget exhausted (15000ms)" em todo log),
// e cada um foi PAGO. A espera certa é onde o tempo já existe: no /api/compose, que gera TTS + Whisper por
// 30-60 s antes de montar o filme.
//
// Desenho:
//   rota fast (primeiro filme + conta gratuita): submete os clipes (cena 1 + as N cenas mais fracas pelo
//     relevanceScore do plano) SEM esperar; grava o evento `fast_ai_clips_pending` (session_id =
//     generation_id) com request_id + posição de cada clipe no clip_urls entregue ao cliente.
//   compose (quality 'fast'): depois do TTS/Whisper lê o evento pelo generation_id + user_id (só o servidor
//     escreve), espera os clipes com um teto de tempo, copia para o nosso bucket e encaixa cada um ABRINDO a
//     sua cena (o stock segue nos cortes seguintes). Falha aberta em tudo: sem clipe, o filme é o de sempre.
//
// Orçamento (fal, Seedance 1.5 Pro, SEM áudio: US$ 1,2 por milhão de tokens; 720×1280×24 fps×5 s/1024 =
// 108k tokens = US$ 0,13/clipe; com áudio seria 0,26 — não usamos): 3 clipes = 0,39 + até 3 stills do
// híbrido (0,03 cada) = 0,48 ≤ 0,50.

import { fal } from '@fal-ai/client'
import { persistHookClip } from './fastAiHook'
import { alertFalExhausted, looksExhausted } from '@/lib/falAlert' // KINEO-FAL-SALDO-ALERTA-2026-09-28
import type { StyleAnchor } from '@/lib/cinematic/sceneStyle' // KINEO1-FILME-DESENHADO-2026-09-21 (só tipo)
import { buildFacelessClipPrompt, buildDrawnClipPrompt, aiClipSeedFromPrompt } from '@/lib/kineo1/aiClipPrompt' // KINEO1-CLIPE-IA-PROMPT-2026-09-28

export const FIRST_FILM_BUDGET_USD = 0.5
export const SEEDANCE_720P_5S_USD = 0.13
/** KINEO1-IMAGEM-V2-2026-09-28 — o mesmo preço por segundo (0,13 / 5 s): 720p SEM áudio, US$ 1,2 por milhão de tokens. */
export const SEEDANCE_720P_USD_PER_SECOND = 0.026
/** Durações que a Seedance 1.5 Pro aceita na fal: inteiros de 4 a 12 s (espelho de lib/cinematic/shotSpec.ts, travado). */
export const SEEDANCE_MIN_SECONDS = 4
export const SEEDANCE_MAX_SECONDS = 12
export const FIRST_FILM_STILL_USD = 0.03
/** Stills do híbrido no primeiro filme com clipes de IA: 3 × 0,03 = 0,09. */
export const FIRST_FILM_STILLS_WITH_CLIPS_MAX = 3
/** KINEO1-FICCAO-STOCK-EXATO-2026-09-22 — história com personagem: até 6 stills mesmo com os 3 clipes (6 × 0,026 + 3 × 0,13 ≈ US$ 0,55). */
export const CHARACTER_STORY_STILLS_WITH_CLIPS_MAX = 6
export const FIRST_FILM_AI_CLIPS_EVENT = 'fast_ai_clips_pending'
export const FIRST_FILM_AI_CLIPS_RESULT_EVENT = 'fast_ai_clips_result'
/** Teto de espera no compose (o TTS/Whisper já consumiu 30-60 s; a Seedance costuma fechar em 60-120 s). */
export const FIRST_FILM_AI_CLIPS_AWAIT_MS = 60_000
const SEEDANCE_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const POLL_MS = 2500
const FAL_URL_RE = /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\//i

/** Interruptor: KINEO_FIRST_FILM_AI_CLIPS=off desliga (nasce LIGADO — decisão do fundador 17/09). */
export const FIRST_FILM_AI_CLIPS_ENABLED = !['0', 'false', 'no', 'off'].includes(
  (process.env.KINEO_FIRST_FILM_AI_CLIPS ?? '').trim().toLowerCase(),
)

/** Quantos clipes Seedance cabem no teto, descontando a reserva de stills. */
export function firstFilmAiClipCount(stillsMax: number = FIRST_FILM_STILLS_WITH_CLIPS_MAX): number {
  const reserva = Math.max(0, stillsMax) * FIRST_FILM_STILL_USD
  const n = Math.floor((FIRST_FILM_BUDGET_USD - reserva) / SEEDANCE_720P_5S_USD + 1e-9)
  return Math.max(0, Math.min(3, n))
}

export interface SceneRelevance {
  scene: number
  relevance: number | null
}

/**
 * As N cenas mais fracas para receber clipe gerado. A cena 1 fica de fora (é o hook). Relevância
 * desconhecida vale 75 (neutra); se NENHUMA cena tem nota, escolhe cenas espalhadas pelo filme
 * (o meio e o fim, onde o stock costuma repetir). Empate → cena mais tardia primeiro (o final é
 * onde a pessoa decide se compartilha).
 */
export function pickWeakScenes(scenes: SceneRelevance[], count: number): number[] {
  const elig = scenes.filter((s) => s.scene > 1)
  if (count <= 0 || elig.length === 0) return []
  const temNota = elig.some((s) => typeof s.relevance === 'number')
  if (!temNota) {
    const n = elig.length
    const alvos = [Math.round(n * 0.5), n].map((k) => elig[Math.max(0, Math.min(n - 1, k - 1))].scene)
    return Array.from(new Set(alvos)).slice(0, count)
  }
  return [...elig]
    .sort((a, b) => (a.relevance ?? 75) - (b.relevance ?? 75) || b.scene - a.scene)
    .slice(0, count)
    .map((s) => s.scene)
    .sort((a, b) => a - b)
}

/**
 * Prompt cinematográfico e sem rosto para a cena (mesma família do hook, com movimento de câmera explícito).
 * KINEO1-CLIPE-IA-PROMPT-2026-09-28 — delega a lib/kineo1/aiClipPrompt.ts: a base visual é o SUJEITO/AÇÃO da cena
 * (descrição real > busca do plano > frase descritiva da fala), sem marca/domínio/URL/@handle, sufixo negativo único,
 * pessoas sem rosto (lista ampliada: father, wife, students, team, evaluators…). Assinatura intocada (a rota é travada).
 */
export function buildSceneClipPrompt(description: string, voiceover: string, query: string, look?: StyleAnchor | null): string {
  // KINEO1-FILME-DESENHADO-2026-09-21 — pedido de desenho: o clipe nasce no look pedido (não "photorealistic") e o
  // personagem desenhado pode aparecer inteiro (a silhueta é regra de pessoa REAL; caso jonathanschwapp 21/09).
  if (look && look.look !== 'photoreal' && look.look !== 'noir') {
    return buildDrawnClipPrompt({ description, voiceover, query }, look, 'scene')
  }
  return buildFacelessClipPrompt({ description, voiceover, query }, 'scene')
}

export interface PendingAiClip {
  request_id: string
  scene: number
  /** Posição no clip_urls FINAL entregue ao cliente (o clipe entra ANTES desse índice). */
  at_index: number
  prompt: string
  usd: number
  /**
   * KINEO1-IMAGEM-V2-2026-09-28 — modo TROCA: índice (no clip_urls entregue) do clipe de stock que o clipe de IA
   * SUBSTITUI quando fica pronto. Ausente = modo de hoje (entra antes de `at_index`, o stock segue depois).
   */
  replace_index?: number
  /** KINEO1-IMAGEM-V2-2026-09-28 — duração pedida à fal (4-12 s); ausente = 5 s, como sempre. */
  seconds?: number
}

export interface ReadyAiClip {
  scene: number
  at_index: number
  url: string | null
  ms: number
  /** KINEO1-IMAGEM-V2-2026-09-28 — herdado do pendente (ver PendingAiClip.replace_index). */
  replace_index?: number
}

/** O enum de duração do schema da fal para a Seedance 1.5 Pro (o tipo do @fal-ai/client confirma: "4" a "12"). */
export type SeedanceSeconds = '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'
/** KINEO1-IMAGEM-V2-2026-09-28 — duração para a fal: inteiro entre 4 e 12; sem pedido (ou pedido inválido), 5. */
export function seedanceDurationParam(seconds?: number | null): SeedanceSeconds {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '5'
  return String(Math.max(SEEDANCE_MIN_SECONDS, Math.min(SEEDANCE_MAX_SECONDS, Math.ceil(seconds - 1e-9)))) as SeedanceSeconds
}

/**
 * Submete um clipe Seedance 5 s 720p sem áudio. Nunca lança; null = não submeteu.
 * KINEO1-CLIPE-IA-PROMPT-2026-09-28 — `seed` (opcional) é a semente determinística; sem ela, nasce do próprio prompt
 * (aiClipSeedFromPrompt): o mesmo prompt reproduz o mesmo clipe. O schema da fal (Seedance 1.5 Pro t2v, conferido em
 * 28/09) aceita `seed: integer | null` ("Use -1 for random"). A rota (trava 8.2) segue chamando com 1 argumento.
 */
export async function submitSceneClip(prompt: string, seconds?: number, seed?: number): Promise<string | null> {
  try {
    const falKey = process.env.FAL_KEY
    if (!falKey) return null
    fal.config({ credentials: falKey })
    const { request_id } = await fal.queue.submit(SEEDANCE_MODEL, {
      // KINEO1-IMAGEM-V2-2026-09-28 — `seconds` (opcional) troca só a duração; sem ele, o pedido é o de sempre.
      input: { prompt, aspect_ratio: '9:16', resolution: '720p', duration: '5', generate_audio: false, ...(seconds !== undefined ? { duration: seedanceDurationParam(seconds) } : {}), seed: Number.isInteger(seed) ? (seed as number) : aiClipSeedFromPrompt(prompt) },
    })
    return request_id || null
  } catch (err) {
    console.warn('[ai-clips] submit failed (non-blocking):', err instanceof Error ? err.message : String(err))
    // KINEO-FAL-SALDO-ALERTA-2026-09-28 — mesmo Seedance que recusou 10 cenas por saldo em 21/09: o clipe da cena fraca
    // do primeiro filme morria aqui em silêncio (o stock cobre a cena e ninguém sabe que a fal travou). looksExhausted
    // lê o body.detail (o SDK põe só "Forbidden" na mensagem). await, não void (void antes do return morre na Vercel).
    if (looksExhausted(err as { status?: number; message?: string; body?: unknown })) {
      await alertFalExhausted({ source: 'kineo1_clip', engine: SEEDANCE_MODEL, context: 'Kineo 1 first-film scene clip fell back to stock' })
    }
    return null
  }
}

/**
 * Espera os clipes pendentes até o teto de tempo (compartilhado), copia cada um para o nosso bucket e devolve
 * a URL durável (ou null). Nunca lança. Um clipe que não chega no tempo fica de fora — o stock cobre a cena.
 */
export async function awaitPendingAiClips(pending: PendingAiClip[], budgetMs = FIRST_FILM_AI_CLIPS_AWAIT_MS): Promise<ReadyAiClip[]> {
  const falKey = process.env.FAL_KEY
  if (!falKey || pending.length === 0) return pending.map((p) => ({ scene: p.scene, at_index: p.at_index, url: null, ms: 0 }))
  fal.config({ credentials: falKey })
  const t0 = Date.now()
  const deadline = t0 + budgetMs
  return Promise.all(
    pending.map(async (p): Promise<ReadyAiClip> => {
      try {
        while (Date.now() < deadline) {
          const status = await fal.queue.status(SEEDANCE_MODEL, { requestId: p.request_id, logs: false })
          if (status.status === 'COMPLETED') {
            const result = await fal.queue.result(SEEDANCE_MODEL, { requestId: p.request_id })
            const falUrl = (result?.data as { video?: { url?: string } } | undefined)?.video?.url ?? null
            if (!falUrl) return { scene: p.scene, at_index: p.at_index, url: null, ms: Date.now() - t0 }
            const durable = await persistHookClip(falUrl, 20_000, 'ai-scene')
            const ok = durable && !FAL_URL_RE.test(durable) ? durable : null
            return { scene: p.scene, at_index: p.at_index, url: ok, ms: Date.now() - t0 }
          }
          await new Promise((r) => setTimeout(r, POLL_MS))
        }
      } catch (err) {
        console.warn(`[ai-clips] await scene=${p.scene} failed (non-blocking):`, err instanceof Error ? err.message : String(err))
      }
      return { scene: p.scene, at_index: p.at_index, url: null, ms: Date.now() - t0 }
    }),
  ).then((prontos) => prontos.map((r, i) => comModoTroca(r, pending[i]))) // KINEO1-IMAGEM-V2-2026-09-28
}

/** KINEO1-IMAGEM-V2-2026-09-28 — o pronto herda o modo TROCA do pendente (só quando o pendente o pediu). */
function comModoTroca(r: ReadyAiClip, p: PendingAiClip | undefined): ReadyAiClip {
  return p && typeof p.replace_index === 'number' ? { ...r, replace_index: p.replace_index } : r
}

/**
 * Encaixa os clipes prontos ABRINDO a sua cena: cada um entra antes de `at_index` (índice do clip_urls
 * ORIGINAL). Ordem crescente de índice; o deslocamento dos anteriores é somado. Clipes sem URL são ignorados.
 *
 * KINEO1-IMAGEM-V2-2026-09-28 — MODO TROCA. Nos 30 filmes da amostra com clipe de IA (21-27/09), 38 das 103 cenas
 * reprovadas pelo juiz JÁ tinham um clipe Seedance pronto: foram reprovadas pelo STOCK que tocava logo depois dele. Com
 * `replace_index` (índice do clip_urls ORIGINAL, dentro do alcance), o clipe pronto SUBSTITUI aquele stock; se não
 * ficou pronto (5% dos casos: 194 de 204 prontos desde 21/09), o stock fica — cena nunca vazia. Sem `replace_index`
 * (ou fora do alcance), o encaixe é o de sempre. Troca não desloca ninguém; inserção desloca os seguintes; empate de
 * índice → a inserção vem antes (o hook abre o filme e a troca cai no clipe que ele empurrou).
 *
 * SEM LAÇO / SEM QUADRO REPETIDO (proibição do fundador) — como o montador trata o clipe (lib/compose.ts, travado, só
 * lido): no Kineo 1 não existe "duração da cena" na montagem. A lista é plana e cada clipe ganha UMA fatia de
 * clamp(total ÷ clipes, 2,5 s, 4,5 s) (FAST_MIN/MAX_CUT_SECONDS), com o corte ajustado ao início de frase DENTRO dessa
 * faixa. O elemento dura fatia + 0,06 s (sobreposição) + 0,25 s (crossfade) e começa em trim_start 0,1 s: no pior
 * caso lê 4,91 s do arquivo — um clipe de 5 s cobre qualquer fatia sem laço. A troca mantém a CONTAGEM de clipes que
 * a rota planejou (a inserção somava um e encolhia todas as fatias). O único jeito de o montador repetir um arquivo é
 * a volta de reciclagem (clipes × fatia < duração do filme): aí ele reentra no mesmo arquivo em trim_start
 * 0,1 + min(volta × (fatia + 0,6), 6) — e um clipe de 5 s daria a volta (laço). Isso já vale hoje para o clipe
 * INSERIDO; planAiClipForSlot (abaixo) calcula, com a mesma aritmética, se o índice pode reentrar e devolve a duração
 * que cobre a pior reentrada. Escolha documentada: trocar só quando a duração cobre a fatia sem laço.
 * KINEO1-SEM-LACO-2026-09-28 (FIX-REVISAO-2) — quando o teto de custo não paga essa duração, NÃO há mais o recuo para a
 * inserção de 5 s: o revisor provou (filme de 60 s do guardião, cena 3 reciclada, reentries=3, 11 s necessários, US$ 0,144
 * livres) que a rota comprava o clipe de 5 s e o montador o relia em trim 3,3 s até 5,96 s de um arquivo de 5 s, com
 * loop:true — o clipe recomeçava na tela (SEM QUADRO REPETIDO, proibição do fundador). Agora o plano diz `fits: false` com a
 * duração e o preço de verdade, e quem chama pula a cena (o stock fica).
 */
export function spliceAiClips(clipUrls: string[], ready: ReadyAiClip[]): string[] {
  const out = [...clipUrls]
  const n = clipUrls.length
  const troca = (r: ReadyAiClip) => typeof r.replace_index === 'number' && Number.isInteger(r.replace_index) && r.replace_index >= 0 && r.replace_index < n
  const pos = (r: ReadyAiClip) => (troca(r) ? (r.replace_index as number) : r.at_index)
  const prontos = ready.filter((r) => !!r.url).sort((a, b) => pos(a) - pos(b) || (troca(a) ? 1 : 0) - (troca(b) ? 1 : 0))
  let shift = 0
  for (const r of prontos) {
    if (troca(r)) {
      out[(r.replace_index as number) + shift] = r.url as string
      continue
    }
    const at = Math.max(0, Math.min(out.length, r.at_index + shift))
    out.splice(at, 0, r.url as string)
    shift++
  }
  return out
}

// ── KINEO1-IMAGEM-V2-2026-09-28 — duração do clipe de IA para a fatia do montador (espelho, lib/compose.ts é travado) ──
// Constantes copiadas de lib/compose.ts (buildCreatomateSource, caminho fast): o guardião
// scripts/test-kineo1-imagem-v2-2026-09-28.mjs lê o compose e fica vermelho se alguma mudar lá.
const FAST_SLOT_MIN_S = 2.5 // FAST_MIN_CUT_SECONDS
const FAST_SLOT_MAX_S = 4.5 // FAST_MAX_CUT_SECONDS
const FAST_TRIM_START_S = 0.1 // CLIP_TRIM_START
const FAST_GAP_OVERLAP_S = 0.06 // CLIP_GAP_OVERLAP
const FAST_CROSSFADE_S = 0.25 // FAST_CROSSFADE_SECONDS
const FAST_REUSE_STEP_S = 0.6 // reuseIndex * (segLen + 0.6)
const FAST_REUSE_CAP_S = 6 // Math.min(…, 6)
/** Segundos de arquivo que UMA fatia do montador lê (pior caso: fatia cheia, com crossfade), na volta `reentrada`. */
export function fastSlotSourceSeconds(slotSeconds: number = FAST_SLOT_MAX_S, reentrada = 0): number {
  const seg = Math.max(0, Math.min(FAST_SLOT_MAX_S, slotSeconds))
  const trim = reentrada > 0 ? FAST_TRIM_START_S + Math.min(reentrada * (seg + FAST_REUSE_STEP_S), FAST_REUSE_CAP_S) : FAST_TRIM_START_S
  return Math.round((trim + seg + FAST_GAP_OVERLAP_S + FAST_CROSSFADE_S) * 1000) / 1000
}
/**
 * Plano do clipe de IA que vai TROCAR o stock no índice `index` de uma lista de `clipCount` clipes num filme de
 * `filmSeconds`. Pior caso de reciclagem: o montador pode cortar toda fatia em 2,5 s (início de frase), então o filme
 * tem até ceil(filme ÷ 2,5) fatias; o índice reentra nas voltas em que volta × clipes + índice < fatias. Devolve a
 * duração (4-12 s, inteira) que cobre a pior leitura sem laço e o custo (US$ 0,026/s).
 * KINEO1-SEM-LACO-2026-09-28 (FIX-REVISAO-2) — `fits` = essa duração cabe em `maxUsd` (padrão: o preço de hoje, 5 s =
 * US$ 0,13) e na Seedance (≤ 12 s). `fits: false` → NÃO compre: nenhum clipe mais curto serve sem laço (antes o plano
 * recuava para 'insert' de 5 s, que reentrava em laço). O índice que não reentra custa 5 s = o mínimo: se nem isso cabe,
 * não há clipe nenhum a comprar.
 */
export function planAiClipForSlot(input: { filmSeconds: number; clipCount: number; index: number; maxUsd?: number }): { mode: 'replace'; seconds: number; usd: number; reentries: number; sourceSeconds: number; fits: boolean } {
  const film = Number.isFinite(input.filmSeconds) && input.filmSeconds > 0 ? input.filmSeconds : 0
  const n = Math.max(1, Math.floor(input.clipCount))
  const idx = Math.max(0, Math.floor(input.index))
  const fatia = Math.min(FAST_SLOT_MAX_S, Math.max(FAST_SLOT_MIN_S, film / n))
  const fatiasMax = Math.ceil(film / FAST_SLOT_MIN_S - 1e-9)
  let reentries = 0
  while ((reentries + 1) * n + idx < fatiasMax) reentries++
  let sourceSeconds = fastSlotSourceSeconds(fatia, 0)
  for (let r = 1; r <= reentries; r++) sourceSeconds = Math.max(sourceSeconds, fastSlotSourceSeconds(FAST_SLOT_MAX_S, r))
  const seconds = Math.max(5, Number(seedanceDurationParam(sourceSeconds)))
  const usd = Math.round(seconds * SEEDANCE_720P_USD_PER_SECOND * 1000) / 1000
  const maxUsd = typeof input.maxUsd === 'number' ? input.maxUsd : SEEDANCE_720P_5S_USD
  const fits = sourceSeconds <= SEEDANCE_MAX_SECONDS && usd <= maxUsd + 1e-9
  return { mode: 'replace', seconds, usd, reentries, sourceSeconds, fits }
}

/** Forma do evento pendente (validação do que vem do banco). */
export function parsePendingAiClips(raw: unknown): PendingAiClip[] {
  const m = raw && typeof raw === 'object' ? (raw as { clips?: unknown }) : null
  if (!m || !Array.isArray(m.clips)) return []
  const out: PendingAiClip[] = []
  for (const c of m.clips) {
    if (!c || typeof c !== 'object') continue
    const o = c as Record<string, unknown>
    if (typeof o.request_id !== 'string' || !o.request_id) continue
    if (typeof o.scene !== 'number' || typeof o.at_index !== 'number') continue
    out.push({
      request_id: o.request_id, scene: o.scene, at_index: o.at_index, prompt: typeof o.prompt === 'string' ? o.prompt : '', usd: typeof o.usd === 'number' ? o.usd : SEEDANCE_720P_5S_USD,
      // KINEO1-IMAGEM-V2-2026-09-28 — modo troca e duração só entram quando o evento os traz e são válidos.
      ...(typeof o.replace_index === 'number' && Number.isInteger(o.replace_index) && o.replace_index >= 0 ? { replace_index: o.replace_index } : {}),
      ...(typeof o.seconds === 'number' && Number.isInteger(o.seconds) && o.seconds >= SEEDANCE_MIN_SECONDS && o.seconds <= SEEDANCE_MAX_SECONDS ? { seconds: o.seconds } : {}),
    })
  }
  return out.slice(0, 3)
}
