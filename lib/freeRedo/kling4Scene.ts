import { SEEDANCE_MODEL, SEEDANCE_I2V_MODEL } from '@/lib/classicSceneRetry'
import { seedanceSecondsForFreeKlingScene } from '@/lib/cinematic/refazerGratis2810'
import { kling4TrialEngineFromClaim } from '@/lib/kling4TrialClaim'
import type { CenaRefazivel, ClaimParaRefazer } from '@/lib/freeRedo/core'

type Obj = Record<string, unknown>
type Segment = { item: Obj; start: number; end: number }
const EPS = .0001
const near = (a: number, b: number) => Math.abs(a - b) < EPS
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : NaN
const https = (v: unknown): v is string => typeof v === 'string' && /^https:\/\//.test(v)
const r6 = (n: number) => Math.round(n * 1e6) / 1e6

function segments(source: unknown): Segment[] {
  const out: Segment[] = []
  const walk = (raw: unknown, offset: number) => {
    if (!raw || typeof raw !== 'object') return
    const o = raw as Obj
    if (!Array.isArray(o.elements)) return
    for (const value of o.elements) {
      if (!value || typeof value !== 'object') continue
      const item = value as Obj, start = offset + (num(item.time) || 0), duration = num(item.duration)
      if (item.type === 'video' && Number(item.track) === 2 && Number.isFinite(duration) && duration > 0) out.push({ item, start, end: start + duration })
      walk(item, start)
    }
  }
  walk(source, 0)
  return out
}

function covers(list: Segment[], url: string, start: number, end: number, original: string): boolean {
  const overlap = list.filter(s => s.start < end - EPS && s.end > start + EPS)
  if (!overlap.length || overlap.some(s => s.item.source !== url)) return false
  overlap.sort((a, b) => a.start - b.start)
  let cursor = start
  for (const s of overlap) {
    const a = Math.max(start, s.start), b = Math.min(end, s.end)
    if (!near(a, cursor)) return false
    const trim = num(s.item.trim_start) || 0
    const actual = trim + a - s.start
    const expected = url === original ? a : a - start
    if (!near(actual % 15, expected)) return false
    cursor = b
  }
  return near(cursor, end)
}

/** Virtual shots belong to the signed Kling plan, while current media comes from the signed RenderScript. */
export function cenasKling4ParaRefazer(claim: ClaimParaRefazer, source: unknown, trocadas?: Readonly<Record<number, string>> | null): CenaRefazivel[] {
  const response = claim.response
  if (kling4TrialEngineFromClaim(response) !== 'kling4' || claim.falModels.length !== 1 ||
      !['kling/v4/text-to-video', 'kling/v4/image-to-video'].includes(claim.falModels[0])) return []
  const original = claim.authorizedCompletedUrls[0]
  if (!https(original)) return []
  const marker = response!.kling4_trial as Obj, plan = marker.scene_plan
  const payload = Array.isArray(response!.scene_fal_inputs) ? response!.scene_fal_inputs[0] as Obj : null
  const prompts = payload?.multi_prompt
  if (!Array.isArray(plan) || plan.length !== 3 || !Array.isArray(prompts) || prompts.length !== plan.length) return []
  let end = 0
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i] as Obj, shot = prompts[i] as Obj
    if (!p || typeof p !== 'object' || !shot || typeof shot !== 'object' || !near(num(p.start_seconds), end) ||
        seedanceSecondsForFreeKlingScene(p.duration_seconds) === null || num(shot.duration) !== num(p.duration_seconds) ||
        typeof p.prompt !== 'string' || p.prompt.trim().length < 20 || p.prompt.length > 5800 ||
        !(p.still_url === null || https(p.still_url))) return []
    end += num(p.duration_seconds)
  }
  if (!near(end, 15)) return []
  const list = segments(source), out: CenaRefazivel[] = []
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i] as Obj, start = num(p.start_seconds), duration = num(p.duration_seconds)
    const candidates = [...new Set(list.filter(s => s.start < start + duration - EPS && s.end > start + EPS).map(s => s.item.source).filter(https))]
    const valid = candidates.filter(url => covers(list, url, start, start + duration, original))
    const clipUrl = valid.length === 1 ? valid[0] : null
    if (!clipUrl || trocadas?.[i] && trocadas[i] !== clipUrl) continue
    const still = https(p.still_url) ? p.still_url : null
    out.push({ index: i, model: still ? SEEDANCE_I2V_MODEL : SEEDANCE_MODEL,
      seconds: seedanceSecondsForFreeKlingScene(duration), text: String(p.text || p.description || '').slice(0, 280), clipUrl,
      input: { prompt: p.prompt, duration: String(seedanceSecondsForFreeKlingScene(duration)), resolution: '720p', aspect_ratio: '9:16', generate_audio: false,
        ...(still ? { image_url: still } : {}) },
      interval: { start, duration, originalUrl: original, originalSeconds: 15 }, previewStart: clipUrl === original ? start : 0,
    })
  }
  return out
}

/** Cut only the selected absolute interval. Split original Kling loops at 15s to preserve their exact source time. */
export function emendarCenaKling4(source: Obj, scene: CenaRefazivel, newUrl: string): { source: Obj; trocados: number } {
  const window = scene.interval
  if (!window || !https(newUrl) || !covers(segments(source), scene.clipUrl, window.start, window.start + window.duration, window.originalUrl)) return { source, trocados: 0 }
  const copy = JSON.parse(JSON.stringify(source)) as Obj
  const start = window.start, end = start + window.duration
  let inserted = false
  const walk = (parent: Obj, offset: number) => {
    if (!Array.isArray(parent.elements)) return
    const next: unknown[] = []
    for (const value of parent.elements) {
      if (!value || typeof value !== 'object') { next.push(value); continue }
      const item = value as Obj, at = offset + (num(item.time) || 0), until = at + num(item.duration)
      if (item.type !== 'video' || Number(item.track) !== 2 || item.source !== scene.clipUrl || !(at < end - EPS && until > start + EPS)) {
        walk(item, at); next.push(item); continue
      }
      const trim = num(item.trim_start) || 0
      const keep = (a: number, b: number) => {
        while (b - a > EPS) {
          const media = trim + a - at, isOriginal = item.source === window.originalUrl
          const sourceTime = isOriginal ? ((media % 15) + 15) % 15 : media
          const len = isOriginal ? Math.min(b - a, 15 - sourceTime) : b - a
          next.push({ ...item, time: r6(a - offset), duration: r6(len), trim_start: r6(sourceTime), loop: false })
          a += len
        }
      }
      keep(at, Math.min(start, until))
      if (!inserted) {
        next.push({ ...item, time: r6(start - offset), duration: window.duration, source: newUrl, trim_start: 0, loop: true, volume: '0%' })
        inserted = true
      }
      keep(Math.max(end, at), until)
    }
    parent.elements = next
  }
  walk(copy, 0)
  return { source: copy, trocados: inserted ? 1 : 0 }
}
