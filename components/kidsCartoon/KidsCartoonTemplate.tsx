'use client'

// KINEO-BEBE-QUE-FALA-2010 — a tela do template "AI Kids Cartoon Stories" (/kids-cartoon). Regras, listas e textos em
// lib/kidsCartoon/kidsCartoon.ts (puro); quem valida e escreve a história é o servidor (/api/kids-cartoon/story).
//
// KINEO-DESENHO-NOTA9-2110 [TRAVA 8.2 — vai do fundador 21/10 "experiência no mínimo 9"] — o fundador testou em produção e o
// "Make my cartoon" caía no /generate antigo (escuro, categorias adultas, parede de motores, "+21", mediana). Agora o fluxo
// INTEIRO acontece aqui, na tela clara: personagem com rosto → ideia → história para revisar/editar → UMA linha de custo (o
// preço real: creditCostForDuration('cinematic_ai', true, s), a MESMA conta que o servidor debita) → um botão grande → o filme
// sai nesta tela, com progresso, player e download. Os pedidos são os MESMOS do /generate no Seedance 1.5 com "Use my script as
// is" e kids_cartoon (lib kidsCinematicPayload/kidsComposePayload): POST /api/generate-video-cinematic → /api/cinematic-clip-status
// (com a retomada de cena de 2 rodadas do /generate) → POST /api/compose → /api/compose/status. Moderação, regra infantil,
// personagem em toda cena, marca d'água e débito continuam no servidor; se a aba fechar, o cron finish-stranded-renders termina.
// KINEO-DESENHO-SOM-2110 — sem a pílula do motor no topo (fundador 21/10: nome de motor na porta de entrada "perde a vontade de comprar"); o botão
// "Captions on the video" (ligado por padrão) viaja no corpo do filme como kids_captions:false quando desligado.
import Link from 'next/link'
import { NARRATION_LANGUAGES, type NarrationLanguage } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
import { useEffect, useRef, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import {
  KIDS_CARTOON_DEFAULT_DURATION,
  KIDS_CARTOON_DURATIONS,
  KIDS_CHARACTERS,
  KIDS_HANDOFF_PROMPT_MAX_CHARS,
  KIDS_IDEAS,
  KIDS_IDEA_MAX_CHARS,
  KIDS_PLANS_PATH,
  KIDS_REFUSAL_MESSAGE,
  isKidsCartoonLanguage,
  kidsCinematicPayload,
  kidsComposePayload,
  kidsContentRefusal,
  kidsCostLine,
  kidsDurationChip,
  kidsTemplateCopy,
  type KidsCartoonDuration,
  type KidsCartoonLanguage,
  type KidsCharacterId,
  type KidsIdeaId,
} from '@/lib/kidsCartoon/kidsCartoon'

const LANG_LABEL = Object.fromEntries(NARRATION_LANGUAGES.map(l => [l.code, l.native])) as Record<NarrationLanguage, string> // KINEO-IDIOMAS-FORMATOS-2410
/** O preço do filme na duração: a MESMA função e os MESMOS argumentos do débito do servidor (generate-video-cinematic). */
export function kidsCartoonCost(seconds: number): number {
  return creditCostForDuration('cinematic_ai', true, seconds)
}

const POLL_MS = 5000
const CLIPS_DEADLINE_MS = 25 * 60_000
const COMPOSE_DEADLINE_MS = 20 * 60_000
const RENDER_KEY = 'kineo:kids-cartoon:render:v1'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
function newGenerationId(): string {
  try { if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID() } catch { /* cai no id local */ }
  return `kids-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

/** O que precisa sobreviver a um recarregar de página (só dados do próprio pedido; nada de segredo). */
interface KidsRender {
  generationId: string
  startedAt: number
  script: string
  caption: string
  character: KidsCharacterId
  language: KidsCartoonLanguage
  duration: KidsCartoonDuration
  ids: (string | null)[]
  model: string
  models: string[]
  scenePrompts: string[]
  voiceover: string
  captions: string[]
  speed: number | null
  quality: string
  retried: number
  renderId: string | null
}

type Stage = 'idle' | 'writing' | 'review' | 'starting' | 'clips' | 'composing' | 'done' | 'failed'

export const KIDS_TEMPLATE_CSS = `
.kkc{--bg:#F7F7F5;--card:#fff;--line:#E4E4E0;--txt:#0E1116;--muted:#5A5F67;--blue:#0A5CFF;--soft:#E8EFFF;max-width:980px;margin:0 auto;padding:28px 20px 64px;color:var(--txt);font-family:var(--font-sans),Inter,system-ui,sans-serif}
html[data-theme=dark] .kkc{--bg:#07090D;--card:#10141B;--line:#1F2530;--txt:#F2F4F7;--muted:#9AA3B2;--blue:#4D8DFF;--soft:#12203A}
.kkc h1{font-size:clamp(1.6rem,3vw,2.3rem);letter-spacing:-.03em;margin:10px 0 6px;font-weight:820}
.kkc-badge{display:inline-flex;gap:7px;align-items:center;font-size:11px;font-weight:800;letter-spacing:.11em;padding:6px 10px;border-radius:999px;background:var(--soft);color:var(--blue)}
.kkc-lead{color:var(--muted);margin:0 0 22px;line-height:1.55;max-width:62ch}
.kkc-sec{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin:0 0 14px}
.kkc-sec h2{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 12px;font-weight:800}
.kkc-chars{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
.kkc-char{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;border-radius:14px;border:2px solid var(--line);background:transparent;color:inherit;cursor:pointer;font:inherit}
.kkc-char[aria-pressed=true]{border-color:var(--blue);background:var(--soft)}
.kkc-face{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:24px;color:#fff;background:linear-gradient(135deg,#FFB347,#FF6F91 55%,#7B6CFF);overflow:hidden}
.kkc-face img{width:100%;height:100%;object-fit:cover}
.kkc-char b{font-size:14px}.kkc-char span{font-size:12px;color:var(--muted)}
.kkc textarea{width:100%;min-height:72px;border-radius:12px;border:1px solid var(--line);padding:12px;font:inherit;background:transparent;color:inherit;resize:vertical}
.kkc-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
.kkc-chip{border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}
.kkc-chip[aria-pressed=true]{border-color:var(--blue);background:var(--soft);color:var(--blue)}
.kkc-row{display:flex;flex-wrap:wrap;gap:24px}
.kkc-seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px}
.kkc-seg button{border:0;background:transparent;color:inherit;font:inherit;font-size:14px;padding:7px 14px;border-radius:999px;cursor:pointer}
.kkc-seg button[aria-pressed=true]{background:var(--blue);color:#fff}
.kkc-go{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;background:var(--blue);color:#fff!important;font:inherit;font-weight:750;font-size:15px;padding:13px 22px;cursor:pointer;text-decoration:none}
.kkc-go[disabled]{opacity:.55;cursor:default}
.kkc-ghost{border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;padding:11px 18px;font:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.kkc-err{color:#C62828;margin:10px 0 0;font-size:14px}
.kkc-note{color:var(--muted);font-size:13px;margin:8px 0 0;line-height:1.5}
.kkc-story{font-size:1.05rem;line-height:1.6;margin:0 0 14px;white-space:pre-wrap}
.kkc-cap{display:flex;gap:10px;align-items:flex-start;background:var(--soft);border-radius:12px;padding:12px;font-size:14px;line-height:1.5;margin:12px 0 0}
.kkc-cap p{margin:0;flex:1}
.kkc *,.kkc *::before,.kkc *::after{box-sizing:border-box}
.kkc-chars-lg .kkc-char{padding:12px 6px 10px}
.kkc-chars-lg .kkc-face{width:84px;height:84px;box-shadow:0 6px 18px -10px rgba(14,17,22,.45)}
.kkc-char[aria-pressed=true] .kkc-face{outline:3px solid var(--blue);outline-offset:2px}
.kkc-char[disabled]{cursor:default;opacity:.6}
.kkc-who{display:flex;align-items:center;gap:12px;margin:0 0 12px}
.kkc-who img{width:52px;height:52px;border-radius:50%;object-fit:cover}
.kkc-who b{display:block;font-size:16px}.kkc-who span{font-size:13px;color:var(--muted)}
.kkc-edit{min-height:180px!important;font-size:1.02rem!important;line-height:1.6}
.kkc-buy{display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--line);margin-top:16px;padding-top:16px}
.kkc-cost{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;line-height:1.4}
.kkc-toggle{display:flex;align-items:flex-start;gap:12px;margin:16px 0 0;cursor:pointer}
.kkc-toggle input{appearance:none;-webkit-appearance:none;width:44px;height:26px;border-radius:999px;background:var(--line);position:relative;flex-shrink:0;cursor:pointer;transition:background .2s;margin:0}
.kkc-toggle input::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s}
.kkc-toggle input:checked{background:var(--blue)}.kkc-toggle input:checked::after{transform:translateX(18px)}
.kkc-toggle input:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.kkc-toggle b{display:block;font-size:15px}.kkc-toggle small{display:block;font-size:13px;color:var(--muted);margin-top:2px}
.kkc-cost i{width:9px;height:9px;border-radius:50%;background:#12B76A;flex-shrink:0}
.kkc-cost[data-enough=false]{color:#B42318}.kkc-cost[data-enough=false] i{background:#B42318}
.kkc-big{font-size:17px;padding:16px 28px;justify-content:center;min-width:280px}
.kkc-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.kkc-steps{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:10px}
.kkc-steps li{display:flex;align-items:center;gap:12px;font-size:15px;color:var(--muted)}
.kkc-steps li b{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:13px;border:2px solid var(--line);flex-shrink:0}
.kkc-steps li[data-s=on]{color:var(--txt);font-weight:700}.kkc-steps li[data-s=on] b{border-color:var(--blue);border-top-color:transparent;animation:kkcspin 1s linear infinite}
.kkc-steps li[data-s=ok]{color:var(--txt)}.kkc-steps li[data-s=ok] b{background:#12B76A;border-color:#12B76A;color:#fff}
.kkc-bar{height:8px;border-radius:999px;background:var(--soft);overflow:hidden;margin:16px 0 0}
.kkc-bar i{display:block;height:100%;background:var(--blue);border-radius:999px;transition:width .6s ease}
.kkc-done{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:24px;align-items:start}
.kkc-ready{font-size:clamp(1.3rem,2.2vw,1.7rem)!important;letter-spacing:-.02em!important;text-transform:none!important;color:var(--txt)!important;margin:0 0 14px!important}
.kkc-quote{border-inline-start:3px solid var(--line);padding-inline-start:12px;margin-top:14px!important;font-style:italic}
.kkc-video{width:100%;aspect-ratio:9/16;border-radius:16px;background:#000;display:block;object-fit:contain}
@keyframes kkcspin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.kkc-steps li[data-s=on] b{animation:none}}
@media (max-width:760px){.kkc{padding:18px 16px 48px}.kkc-chars{grid-template-columns:repeat(3,minmax(0,1fr))}.kkc-go{width:100%;justify-content:center}.kkc-big{min-width:0}.kkc-chars-lg .kkc-face{width:72px;height:72px}.kkc-done{grid-template-columns:1fr}.kkc-ready{font-size:clamp(1.3rem,2.2vw,1.7rem)!important;letter-spacing:-.02em!important;text-transform:none!important;color:var(--txt)!important;margin:0 0 14px!important}
.kkc-quote{border-inline-start:3px solid var(--line);padding-inline-start:12px;margin-top:14px!important;font-style:italic}
.kkc-video{max-width:300px;margin:0 auto}.kkc-edit{min-height:280px!important}.kkc-ghost{width:100%;justify-content:center}}
`

export default function KidsCartoonTemplate() {
  const ui = useInterfaceLanguage()
  const t = kidsTemplateCopy(ui)
  const ideaLang: 'en' | 'pt' | 'es' = ui === 'pt' || ui === 'es' ? ui : 'en' // KINEO-IDIOMAS-FORMATOS-2410 — idioma editorial da interface separado da narração
  const [character, setCharacter] = useState<KidsCharacterId>('leo')
  const [idea, setIdea] = useState('')
  const [ideaId, setIdeaId] = useState<KidsIdeaId | null>(null)
  const [language, setLanguage] = useState<KidsCartoonLanguage>(isKidsCartoonLanguage(ui) ? ui : 'en')
  const [duration, setDuration] = useState<KidsCartoonDuration>(KIDS_CARTOON_DEFAULT_DURATION)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [needPlans, setNeedPlans] = useState(false)
  const [script, setScript] = useState('')
  const [caption, setCaption] = useState('')
  const [copied, setCopied] = useState(false)
  const [captions, setCaptions] = useState(true) // KINEO-DESENHO-SOM-2110 — legenda no vídeo (ligada por padrão)
  const [balance, setBalance] = useState<number | null>(null)
  const [clips, setClips] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [composePct, setComposePct] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const alive = useRef(true)

  const cost = kidsCartoonCost(duration)
  const costLine = kidsCostLine(ui, { seconds: duration, cost, balance })
  const shortCost = kidsCartoonCost(15)
  const shorterFits = duration !== 15 && typeof balance === 'number' && balance >= shortCost
  const editedRefusal = stage === 'review' ? kidsContentRefusal(script) : null
  const busy = stage === 'writing' || stage === 'starting' || stage === 'clips' || stage === 'composing'
  const char = KIDS_CHARACTERS.find((c) => c.id === character) ?? KIDS_CHARACTERS[0]

  function readBalance() {
    fetch('/api/me/credits', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive.current && typeof d?.credits === 'number') setBalance(d.credits) })
      .catch(() => { /* sem saldo lido: a linha mostra só o preço; o servidor é a guarda final */ })
  }

  useEffect(() => {
    alive.current = true
    readBalance()
    const onCredits = () => readBalance()
    window.addEventListener('creditsChanged', onCredits)
    // Retomada: o filme que estava saindo nesta conta, nesta aba ou noutra, continua na mesma tela depois de recarregar.
    try {
      const raw = localStorage.getItem(RENDER_KEY)
      const r = raw ? (JSON.parse(raw) as KidsRender) : null
      if (r && typeof r.generationId === 'string' && Date.now() - r.startedAt < CLIPS_DEADLINE_MS + COMPOSE_DEADLINE_MS) {
        setCharacter(r.character); setLanguage(r.language); setDuration(r.duration); setScript(r.script); setCaption(r.caption)
        void follow(r)
      } else if (raw) localStorage.removeItem(RENDER_KEY)
    } catch { /* sem armazenamento */ }
    return () => { alive.current = false; window.removeEventListener('creditsChanged', onCredits) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function save(r: KidsRender | null) {
    try { if (r) localStorage.setItem(RENDER_KEY, JSON.stringify(r)); else localStorage.removeItem(RENDER_KEY) } catch { /* sem armazenamento */ }
  }
  function fail(message: string, reason: string, plans = false) {
    if (!alive.current) return
    setError(message); setNeedPlans(plans); setStage('failed')
    void trackEvent('kids_cartoon_failed', { reason, character, language, duration })
  }

  async function write(dur: KidsCartoonDuration = duration) {
    setStage('writing'); setError(null); setNeedPlans(false); setCopied(false)
    try {
      const res = await fetch('/api/kids-cartoon/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character, language, duration: dur, idea: idea.trim(), ideaId }),
      })
      const data = await res.json().catch(() => ({})) as { script?: string; caption?: string; error?: string }
      if (!res.ok || !data.script) { setError(data.error ?? 'Something went wrong. Nothing was charged — please try again.'); setStage(script ? 'review' : 'idle'); return }
      setScript(data.script); setCaption(data.caption ?? ''); setStage('review')
      void trackEvent('kids_cartoon_story_ready', { character, language, duration: dur, idea_id: ideaId })
    } catch {
      setError('Network error. Nothing was charged — please try again.'); setStage(script ? 'review' : 'idle')
    }
  }

  /** POST com a reconexão de sempre do /generate (409/503 + pending = o MESMO pedido ainda sendo aceito; o generationId é a chave). */
  async function postJson(url: string, body: unknown): Promise<{ res: Response; data: Record<string, unknown> }> {
    for (let i = 0; ; i++) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json().catch(() => ({})) as Record<string, unknown>
        if ((res.status === 409 || res.status === 503) && data.pending === true && i < 40) {
          await sleep(typeof data.retry_after_ms === 'number' ? Math.min(10000, Math.max(1000, data.retry_after_ms)) : i < 4 ? 3000 : 10000)
          continue
        }
        return { res, data }
      } catch {
        if (i >= 12) throw new Error('network')
        await sleep(i < 4 ? 3000 : 10000)
      }
    }
  }

  async function make() {
    const texto = script.trim()
    if (!texto || kidsContentRefusal(texto)) return
    const generationId = newGenerationId()
    setStage('starting'); setError(null); setNeedPlans(false); setVideoUrl(null); setClips({ done: 0, total: 0 }); setComposePct(0)
    void trackEvent('kids_cartoon_make_clicked', { character, language, duration, credits: cost, balance, captions })
    try {
      const { res, data } = await postJson('/api/generate-video-cinematic', kidsCinematicPayload({ generationId, script: texto, request: { character, language, duration }, captions }))
      if (res.status === 401) { window.location.href = `/login?redirect=${encodeURIComponent('/kids-cartoon')}`; return }
      const msg = typeof data.error === 'string' ? data.error : null
      if (res.status === 402) {
        // credits_held_by_render: o saldo está preso num filme que ainda volta sozinho — pedir compra aqui seria o defeito de 15/08.
        fail(msg ?? `You need ${cost} credits.`, `dispatch_402_${typeof data.reason === 'string' ? data.reason : 'credits'}`, data.reason !== 'credits_held_by_render')
        readBalance(); return
      }
      if (!res.ok) { fail(msg ?? 'The cartoon could not start. Nothing was charged — please try again.', `dispatch_${res.status}`); return }
      if (data.generationId !== generationId) { fail('We could not verify this cartoon. Nothing was composed — please try again.', 'generation_id_mismatch'); return }
      const ids = Array.isArray(data.fal_request_ids) ? data.fal_request_ids.map((x) => (typeof x === 'string' ? x : null)) : []
      const r: KidsRender = {
        generationId, startedAt: Date.now(), script: texto, caption, character, language, duration, ids,
        model: typeof data.fal_model === 'string' ? data.fal_model : '',
        models: Array.isArray(data.fal_models) ? data.fal_models.filter((m): m is string => typeof m === 'string') : [],
        scenePrompts: Array.isArray(data.scene_prompts) ? data.scene_prompts.map((x) => (typeof x === 'string' ? x : '')) : [],
        voiceover: typeof data.voiceover_script === 'string' && data.voiceover_script.trim() ? data.voiceover_script : texto,
        captions: Array.isArray(data.scene_captions) ? data.scene_captions.map((x) => (typeof x === 'string' ? x : '')) : [],
        speed: typeof data.speed === 'number' ? data.speed : null,
        quality: typeof data.quality === 'string' ? data.quality : 'cinematic_ai',
        retried: 0, renderId: null,
      }
      save(r)
      try { window.dispatchEvent(new Event('creditsChanged')) } catch { /* nada */ }
      // A voz aquecida no mesmo instante do /generate (fogo-e-esquece: se falhar, o compose sintetiza como sempre).
      if (r.speed !== null) void fetch('/api/prewarm-voiceover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: r.voiceover, speed: r.speed, language, quality: r.quality, generationId }) }).catch(() => {})
      await follow(r)
    } catch {
      fail('Network error. If anything was charged, it is returned automatically when the cartoon does not finish.', 'network')
    }
  }

  /** Acompanha o filme até o fim: cenas → montagem → pronto. Mesmos endpoints, parâmetros e saídas do /generate. */
  async function follow(r0: KidsRender) {
    let r = { ...r0 }
    try {
      if (!r.renderId) {
        setStage('clips')
        const started = Date.now()
        let urls: string[] | null = null
        while (alive.current && !urls) {
          if (Date.now() - started > CLIPS_DEADLINE_MS) { save(null); fail('This is taking far longer than usual. Your credits are returned automatically if it does not finish.', 'clips_deadline'); return }
          await sleep(POLL_MS)
          const q = `ids=${encodeURIComponent(JSON.stringify(r.ids))}${r.model ? `&model=${encodeURIComponent(r.model)}` : ''}${r.models.length ? `&models=${encodeURIComponent(JSON.stringify(r.models))}` : ''}&generationId=${encodeURIComponent(r.generationId)}`
          const s = await fetch(`/api/cinematic-clip-status?${q}`, { cache: 'no-store' }).then(async (x) => ({ ok: x.ok, status: x.status, data: await x.json().catch(() => ({})) as Record<string, unknown> })).catch(() => null)
          if (!s) continue
          if (!s.ok) {
            if (s.status === 502) { save(null); fail(typeof s.data.error === 'string' ? s.data.error : 'The scenes could not be drawn. Your credits were refunded automatically.', 'clips_502'); return }
            if (s.status === 404) { save(null); fail('This cartoon was closed and your credits were already returned.', 'clips_404'); return }
            continue
          }
          const list = Array.isArray(s.data.clips) ? s.data.clips as { status?: string; url?: string | null }[] : []
          const total = typeof s.data.total === 'number' ? s.data.total : r.ids.length
          setClips({ done: typeof s.data.done === 'number' ? s.data.done : 0, total })
          if (s.data.allDone !== true) continue
          // A retomada de cena do /generate: 1ª rodada com o prompt original, 2ª suavizada no servidor (sanitize).
          const failedIdx = list.map((c, i) => (c.status === 'failed' ? i : -1)).filter((i) => i >= 0)
          if (failedIdx.length > 0 && r.scenePrompts.length > 0 && r.retried < 2) {
            r = { ...r, retried: r.retried + 1 }
            const next = [...r.ids]
            let changed = false
            for (const fi of failedIdx) {
              const p = r.scenePrompts[fi]
              if (!p || p.length < 20) continue
              try {
                const rr = await fetch('/api/retry-hollywood-scene', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: p, anchorUrl: null, seconds: 10, model: r.models[fi] ?? (r.model || undefined), generationId: r.generationId, sceneIndex: fi, oldRequestId: r.ids[fi] ?? null, sanitize: r.retried === 2 }),
                })
                const rj = await rr.json().catch(() => ({})) as { requestId?: unknown }
                if (rr.ok && typeof rj.requestId === 'string') { next[fi] = rj.requestId; changed = true }
              } catch { /* melhor esforço: a cena segue fora, como no /generate */ }
            }
            save(r)
            if (changed) { r = { ...r, ids: next }; save(r); continue }
          }
          const done = list.filter((c) => c.status === 'done' && typeof c.url === 'string' && c.url).map((c) => c.url as string)
          if (done.length === 0) { save(null); fail('All the scenes failed. Your credits are returned automatically — please try again.', 'all_clips_failed'); return }
          urls = done
        }
        if (!alive.current || !urls) return
        setStage('composing')
        const c = await postJson('/api/compose', kidsComposePayload({ generationId: r.generationId, clipUrls: urls, voiceover: r.voiceover, captions: r.captions, duration: r.duration, topic: r.script, quality: r.quality, language: r.language, speed: r.speed }))
        const renderId = typeof c.data.render_id === 'string' ? c.data.render_id : ''
        if (c.res.status === 402) { save(null); fail(typeof c.data.error === 'string' ? c.data.error : 'This needs more credits.', 'compose_402', true); return }
        if (!c.res.ok || !renderId) { save(null); fail(typeof c.data.error === 'string' ? c.data.error : 'Adding the voice failed. Any credits taken are returned automatically.', `compose_${c.res.status}`); return }
        r = { ...r, renderId }
        save(r)
      }
      setStage('composing')
      const started = Date.now()
      const q = new URLSearchParams({ quality: r.quality, resume: '1', rapido: '1', duration: String(r.duration), topic: r.script.slice(0, 500) })
      if (r.caption) q.set('ytdesc', r.caption.slice(0, 600))
      while (alive.current) {
        if (Date.now() - started > COMPOSE_DEADLINE_MS) { save(null); fail('This is taking far longer than usual. You will find the cartoon in your library when it finishes.', 'compose_deadline'); return }
        await sleep(POLL_MS)
        const s = await fetch(`/api/compose/status/${encodeURIComponent(r.renderId as string)}?${q.toString()}`, { cache: 'no-store' }).then(async (x) => ({ ok: x.ok, status: x.status, data: await x.json().catch(() => ({})) as Record<string, unknown> })).catch(() => null)
        if (!s) continue
        if (s.ok && s.data.phase === 'done' && typeof s.data.final_video_url === 'string' && s.data.final_video_url) {
          save(null)
          setVideoUrl(s.data.final_video_url); setComposePct(100); setStage('done')
          try { window.dispatchEvent(new Event('creditsChanged')) } catch { /* nada */ }
          void trackEvent('kids_cartoon_ready', { character: r.character, language: r.language, duration: r.duration, ms: Date.now() - r.startedAt })
          return
        }
        if (s.ok && s.data.phase === 'failed') { save(null); fail(typeof s.data.error === 'string' ? s.data.error : 'The cartoon failed. Any credits taken are returned automatically.', 'compose_failed'); return }
        if (s.ok && typeof s.data.progress === 'number') setComposePct(s.data.progress)
        if (!s.ok && (s.status === 400 || s.status === 403 || s.status === 404 || s.status === 410 || s.status === 422)) { save(null); fail(typeof s.data.error === 'string' ? s.data.error : 'This cartoon can no longer be resumed.', `status_${s.status}`); return }
      }
    } catch {
      fail('Network error. If anything was charged, it is returned automatically when the cartoon does not finish.', 'network')
    }
  }

  function restart() {
    save(null)
    setIdea(''); setIdeaId(null); setCopied(false) // KINEO-CARTOON-CONSISTENCIA-2210 — outro desenho começa sem tema, ideia pronta nem cópia do episódio anterior
    setStage('idle'); setScript(''); setCaption(''); setVideoUrl(null); setError(null); setNeedPlans(false); setClips({ done: 0, total: 0 }); setComposePct(0)
  }

  const progress = stage === 'starting' ? 4 : stage === 'clips' ? 6 + Math.round((clips.total > 0 ? clips.done / clips.total : 0) * 64) : stage === 'composing' ? 72 + Math.round(Math.min(100, composePct) * 0.26) : 100
  const reviewing = stage === 'review' || (stage === 'failed' && Boolean(script))
  const renderView = stage === 'starting' || stage === 'clips' || stage === 'composing' || stage === 'done'
  const stepState = (n: 1 | 2 | 3): 'on' | 'ok' | 'off' => {
    const cur = stage === 'done' ? 4 : stage === 'composing' ? 2 : 1
    return n < cur ? 'ok' : n === cur ? 'on' : 'off'
  }

  return (
    <main className="kkc" data-kids-cartoon="template" data-stage={stage}>
      <style dangerouslySetInnerHTML={{ __html: KIDS_TEMPLATE_CSS }} />
      <h1>{t.title}</h1>
      <p className="kkc-lead">{t.lead}</p>

      {renderView ? (
        <section className="kkc-sec" aria-live="polite" data-kids-render={stage}>
          <div className="kkc-who"><img src={char.portrait} alt="" /><div><b>{char.name}</b><span>{kidsDurationChip(ui, duration, cost)} · {LANG_LABEL[language]}</span></div></div>
          {stage === 'done' && videoUrl ? (
            <div className="kkc-done">
              <video className="kkc-video" src={videoUrl} controls playsInline preload="metadata" />
              <div>
                <h2 className="kkc-ready">{t.stepReady}</h2>
                <div className="kkc-actions">
                  <a className="kkc-go kkc-big" href={videoUrl} download onClick={() => { void trackEvent('kids_cartoon_downloaded', { character, language, duration }) }}>{t.download} <span aria-hidden="true">↓</span></a>
                  <Link className="kkc-ghost" href="/library">{t.library}</Link>
                </div>
                {caption ? (
                  <div className="kkc-cap">
                    <p><b>{t.caption}</b><br />{caption}<br /><small>{t.label}</small></p>
                    <button type="button" className="kkc-ghost" onClick={() => { try { void navigator.clipboard.writeText(caption); setCopied(true) } catch { /* sem área de transferência */ } }}>{copied ? t.copied : t.copy}</button>
                  </div>
                ) : null}
                <p className="kkc-note"><button type="button" className="kkc-ghost" onClick={restart}>{t.another}</button></p>
              </div>
            </div>
          ) : (
            <>
              <ol className="kkc-steps">
                <li data-s={stepState(1)}><b aria-hidden="true">{stepState(1) === 'ok' ? '✓' : stepState(1) === 'on' ? '' : '1'}</b>{t.stepScenes}{stage === 'clips' && clips.total > 0 ? ` · ${clips.done}/${clips.total}` : ''}</li>
                <li data-s={stepState(2)}><b aria-hidden="true">{stepState(2) === 'ok' ? '✓' : stepState(2) === 'on' ? '' : '2'}</b>{t.stepVoice}</li>
                <li data-s={stepState(3)}><b aria-hidden="true">3</b>{t.stepReady}</li>
              </ol>
              <div className="kkc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>
              <p className="kkc-note">{t.wait}</p>
              {script ? <p className="kkc-note kkc-quote">“{script}”</p> : null}
            </>
          )}
        </section>
      ) : (
        <>
          {reviewing ? null : (<>
          <section className="kkc-sec" aria-label={t.character}>
            <h2>{t.character}</h2>
            <div className="kkc-chars kkc-chars-lg">
              {KIDS_CHARACTERS.map((c) => (
                <button key={c.id} type="button" className="kkc-char" aria-pressed={character === c.id} disabled={busy} onClick={() => setCharacter(c.id)} data-kids-character={c.id}>
                  <span className="kkc-face" aria-hidden="true">{c.portrait ? <img src={c.portrait} alt="" /> : c.name.slice(0, 1)}</span>
                  <b>{c.name}</b>
                  <span>{c.kind[ideaLang]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="kkc-sec" aria-label={t.idea}>
            <h2>{t.idea}</h2>
            <textarea value={idea} maxLength={KIDS_IDEA_MAX_CHARS} placeholder={t.ideaPlaceholder} disabled={busy} onChange={(e) => { setIdea(e.target.value); setIdeaId(null) }} />
            <p className="kkc-note">{t.ready}</p>
            <div className="kkc-chips">
              {KIDS_IDEAS.map((i) => (
                <button key={i.id} type="button" className="kkc-chip" aria-pressed={ideaId === i.id} disabled={busy} onClick={() => { setIdeaId(i.id); setIdea('') }} data-kids-idea={i.id}>{i[ideaLang]}</button>
              ))}
            </div>
          </section>

          <section className="kkc-sec">
            <div className="kkc-row">
              <div>
                <h2>{t.language}</h2>
                <select aria-label={t.language} value={language} disabled={busy} onChange={e => { if (isKidsCartoonLanguage(e.target.value)) setLanguage(e.target.value) }} style={{ width: '100%', minHeight: 46, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)', color: 'var(--txt)', font: 'inherit', colorScheme: 'inherit' }}>{NARRATION_LANGUAGES.map(l => <option key={l.code} value={l.code} lang={l.code} dir={l.rtl ? 'rtl' : 'ltr'}>{l.native}</option>)}</select>
              </div>
              <div>
                <h2>{t.duration}</h2>
                <div className="kkc-seg">{KIDS_CARTOON_DURATIONS.map((d) => <button key={d} type="button" aria-pressed={duration === d} disabled={busy} onClick={() => setDuration(d)}>{kidsDurationChip(ui, d, kidsCartoonCost(d))}</button>)}</div>
              </div>
            </div>
            <p className="kkc-note">{t.rules}</p>
          </section>
          </>)}

          {stage === 'idle' || stage === 'writing' || (stage === 'failed' && !script) ? (
            <div>
              <button type="button" className="kkc-go kkc-big" onClick={() => { void write() }} disabled={busy || (!idea.trim() && !ideaId)}>{stage === 'writing' ? t.writing : t.write} <span aria-hidden="true">→</span></button>
              {error ? <p className="kkc-err" role="alert">{error}</p> : null}
            </div>
          ) : (
            <section className="kkc-sec" aria-label={t.story} data-kids-story="1">
              <h2>{t.story}</h2>
              <div className="kkc-who"><img src={char.portrait} alt="" /><div><b>{char.name}</b><span>{char.kind[ideaLang]} · {LANG_LABEL[language]}</span></div></div>
              <textarea className="kkc-edit" value={script} maxLength={KIDS_HANDOFF_PROMPT_MAX_CHARS} onChange={(e) => { setScript(e.target.value); if (stage === 'failed') setStage('review') }} aria-label={t.story} />
              <p className="kkc-note">{t.storyHint} {t.rules}</p>
              {editedRefusal ? <p className="kkc-err" role="alert">{language === 'pt' ? KIDS_REFUSAL_MESSAGE.pt : KIDS_REFUSAL_MESSAGE.en}</p> : null}
              <div className="kkc-actions" style={{ marginTop: 10 }}>
                <button type="button" className="kkc-ghost" onClick={() => { void write() }}>{t.again}</button>
                <button type="button" className="kkc-ghost" onClick={() => { setStage('idle'); setScript(''); setError(null) }}>{t.back}</button>
              </div>
              <label className="kkc-toggle" data-kids-captions="1"><input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} /><span><b>{t.captionsToggle}</b><small>{t.captionsHint}</small></span></label>
              <div className="kkc-buy" data-kids-cost="1">
                <p className="kkc-cost" data-enough={String(costLine.enough)}><i aria-hidden="true" />{costLine.text}</p>
                {costLine.enough === false ? (
                  <div className="kkc-actions">
                    <Link className="kkc-go kkc-big" href={KIDS_PLANS_PATH} onClick={() => { void trackEvent('kids_cartoon_plans_clicked', { credits: cost, balance, duration }) }}>{t.plans} <span aria-hidden="true">→</span></Link>
                    {shorterFits ? <button type="button" className="kkc-ghost" onClick={() => { setDuration(15); void write(15) }}>{t.shorter} · {kidsDurationChip(ui, 15, shortCost).split(' · ').slice(1).join(' · ')}</button> : null}
                  </div>
                ) : (
                  <div><button type="button" className="kkc-go kkc-big" onClick={make} disabled={!script.trim() || Boolean(editedRefusal)}>{t.make} <span aria-hidden="true">→</span></button></div>
                )}
                {error ? <p className="kkc-err" role="alert">{error}</p> : null}
                {stage === 'failed' && needPlans ? <p className="kkc-note"><Link className="kkc-ghost" href={KIDS_PLANS_PATH}>{t.plans}</Link></p> : null}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
