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
// KINEO-CARTOON-TELA-0411 [fundador 05/11] — o layout da tela nova de anúncios: cabeçalho igual, formulário à esquerda, personagem à direita (celular: formulário primeiro), um botão principal, opcionais em "More options", preço só na linha do botão final. Pedidos, endpoints e retomada do filme não mudaram.
import { cadastroComVolta } from '@/lib/growth/visitanteEscreveAntes' // KINEO-CARDS-ANTES-DO-LOGIN-0411
import { guardarRascunhoDoDesenho, lerRascunhoDoDesenho } from '@/lib/ads/rascunhoDoVisitante' // KINEO-CARDS-ANTES-DO-LOGIN-0411
import Link from 'next/link'
import { NARRATION_LANGUAGES, type NarrationLanguage } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { PremiereResult, PremiereStage, usePremiereBeacon, type PremiereItem } from '@/components/premiere/Premiere' // KINEO-ESTREIA-3110
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { STUDIO_KIT_CSS } from '@/components/studioKit' // KINEO-CARTOON-TELA-0411 — a mesma pilha de estilos do /ads/v2
import { ADS_WIZARD_THEME_CSS } from '@/app/(dashboard)/ads/new/adsWizardTheme' // KINEO-CARTOON-TELA-0411
import { ADS_QUADRO_STUDIO_CSS, ADS_QUADRO_TINT_CSS } from '@/app/(dashboard)/ads/v2/AdsV2Quadro' // KINEO-CARTOON-TELA-0411
import { ProductStageStyles, useProductStage } from '@/components/ProductStage' // KINEO-CARTOON-TELA-0411
import KidsEpisodioGratis from '@/components/kidsCartoon/KidsEpisodioGratis' // KINEO-CARTOON-TELA-0411 — o 1º episódio grátis, sem o quadro de planos
import { KIDS_EPISODIO_GRATIS_LIVE } from '@/lib/kidsVenda/ofertaKids' // KINEO-CARTOON-SO-PLANO-0411
import { KIDS_TELA_CSS, kidsTelaCopy } from '@/lib/kidsCartoon/telaCartoon' // KINEO-CARTOON-TELA-0411
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
.kkc{--line:var(--border,#E4E4E0);--txt:var(--text,#0E1116);--blue:var(--accent,#0A5CFF);--soft:var(--accent-soft,#E8EFFF)}
.kkc-sec{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;margin:0 0 14px;min-width:0}
.kkc textarea{width:100%;min-height:96px}
.kkc .kkc-go,.ace button.kkc-go{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--blue);border-radius:11px;background:var(--blue);color:#fff!important;font:inherit;font-weight:750;font-size:15px;padding:13px 22px;cursor:pointer;text-decoration:none}
.kkc-go[disabled]{opacity:.55;cursor:default}
.kkc-ghost{border:1px solid var(--line);background:transparent;color:inherit;border-radius:11px;padding:11px 18px;font:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.kkc-err{color:#C62828;margin:10px 0 0;font-size:14px}
.kkc-note{color:var(--muted);font-size:13px;margin:8px 0 0;line-height:1.5}
.kkc-story{font-size:1.05rem;line-height:1.6;margin:0 0 14px;white-space:pre-wrap}
.kkc-cap{display:flex;gap:10px;align-items:flex-start;background:var(--soft);border-radius:12px;padding:12px;font-size:14px;line-height:1.5;margin:12px 0 0}
.kkc-cap p{margin:0;flex:1}
.kkc *,.kkc *::before,.kkc *::after{box-sizing:border-box}
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
.kkc .kkc-big,.ace button.kkc-big{font-size:16px;padding:14px 26px;min-width:280px}
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
@media (max-width:760px){.kkc .kkc-go,.ace button.kkc-go{width:100%}.kkc .kkc-big,.ace button.kkc-big{min-width:0}.kkc-done{grid-template-columns:1fr}.kkc-ready{font-size:clamp(1.3rem,2.2vw,1.7rem)!important;letter-spacing:-.02em!important;text-transform:none!important;color:var(--txt)!important;margin:0 0 14px!important}
.kkc-quote{border-inline-start:3px solid var(--line);padding-inline-start:12px;margin-top:14px!important;font-style:italic}
.kkc-video{max-width:300px;margin:0 auto}.kkc-edit{min-height:280px!important}.kkc-ghost{width:100%;justify-content:center}}
`

export default function KidsCartoonTemplate({ visitante = false, episodios = null }: { /* KINEO-CARDS-ANTES-DO-LOGIN-0411 */ visitante?: boolean; /* KINEO-CARTOON-TELA-0411 — os episódios de quem já tem pedido, entre o cabeçalho e o formulário */ episodios?: ReactNode }) {
  const ui = useInterfaceLanguage()
  const t = kidsTemplateCopy(ui)
  const tela = kidsTelaCopy(ui) // KINEO-CARTOON-TELA-0411
  useProductStage('ads') // KINEO-CARTOON-TELA-0411 — o mesmo fundo e a mesma barra lateral da tela de anúncios
  const ideaLang: 'en' | 'pt' | 'es' = ui === 'pt' || ui === 'es' ? ui : 'en' // KINEO-IDIOMAS-FORMATOS-2410 — idioma editorial da interface separado da narração
  const [character, setCharacter] = useState<KidsCharacterId>('leo')
  const [idea, setIdea] = useState('')
  const [ideaId, setIdeaId] = useState<KidsIdeaId | null>(null)
  const [language, setLanguage] = useState<KidsCartoonLanguage>(isKidsCartoonLanguage(ui) ? ui : 'en')
  const [duration, setDuration] = useState<KidsCartoonDuration>(KIDS_CARTOON_DEFAULT_DURATION)
  const [stage, setStage] = useState<Stage>('idle')
  const [semPlano, setSemPlano] = useState(false) // KINEO-CARTOON-SO-PLANO-0411 — o servidor disse que esta conta não tem plano: o botão vira "See plans"
  const [error, setError] = useState<string | null>(null)
  const [needPlans, setNeedPlans] = useState(false)
  const [script, setScript] = useState('')
  const [caption, setCaption] = useState('')
  const [copied, setCopied] = useState(false)
  const [captions, setCaptions] = useState(true) // KINEO-DESENHO-SOM-2110 — legenda no vídeo (ligada por padrão)
  const [balance, setBalance] = useState<number | null>(null)
  const [clips, setClips] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [composePct, setComposePct] = useState(0)
  const [filmeGratis, setFilmeGratis] = useState(false) // KINEO-CELULAR-FLUXO-0611 — por último: o guardião do Cartoon conta os estados pela ordem
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  // KINEO-ESTREIA-3110 — o status de CADA cena que o poll já recebia (só tela) + a fala de cada cena para a linha "agora".
  const [sceneClips, setSceneClips] = useState<{ status: string; url: string | null }[]>([])
  const [sceneLines, setSceneLines] = useState<string[]>([])
  const alive = useRef(true)
  usePremiereBeacon(stage === 'done' && Boolean(videoUrl), 'cartoon') // KINEO-ESTREIA-3110

  const cost = kidsCartoonCost(duration)
  const costLine = kidsCostLine(ui, { seconds: duration, cost, balance })
  const shortCost = kidsCartoonCost(15)
  const shorterFits = duration !== 15 && typeof balance === 'number' && balance >= shortCost
  const editedRefusal = stage === 'review' ? kidsContentRefusal(script) : null
  const busy = stage === 'writing' || stage === 'starting' || stage === 'clips' || stage === 'composing'
  const char = KIDS_CHARACTERS.find((c) => c.id === character) ?? KIDS_CHARACTERS[0]

  function readBalance() {
    if (visitante) return
    fetch('/api/me/credits', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive.current && typeof d?.credits === 'number') setBalance(d.credits) })
      .catch(() => { /* sem saldo lido: a linha mostra só o preço; o servidor é a guarda final */ })
  }

  useEffect(() => {
    alive.current = true
    readBalance()
    if (!visitante) { // KINEO-CARDS-ANTES-DO-LOGIN-0411 — as escolhas de antes do login
      const r = lerRascunhoDoDesenho()
      if (r) {
        if (KIDS_CHARACTERS.some((c) => c.id === r.character)) setCharacter(r.character as KidsCharacterId)
        if (typeof r.idea === 'string') setIdea(r.idea)
        if (isKidsCartoonLanguage(r.language)) setLanguage(r.language)
        if (KIDS_IDEAS.some((i) => i.id === r.ideaId)) setIdeaId(r.ideaId as KidsIdeaId) // KINEO-CARTOON-SO-PLANO-0411
        if ((KIDS_CARTOON_DURATIONS as readonly unknown[]).includes(r.duration)) setDuration(r.duration as KidsCartoonDuration) // KINEO-CARTOON-SO-PLANO-0411
      }
    }
    if (!visitante) fetch('/api/kids-venda/status', { cache: 'no-store', credentials: 'same-origin' }).then((x) => (x.ok ? x.json() : null)).then((d: { cartoon_plan?: unknown; free_film?: unknown } | null) => { if (alive.current && d?.cartoon_plan === false) setSemPlano(true); if (alive.current && d?.free_film === true) setFilmeGratis(true) /* KINEO-CELULAR-FLUXO-0611 */ }).catch(() => { /* sem leitura: a rota decide no clique */ }) // KINEO-CARTOON-SO-PLANO-0411
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

  /** KINEO-CARTOON-SO-PLANO-0411 — sem plano: nada começa; guarda o que a pessoa escolheu e vai aos planos. */
  function irAosPlanos() {
    guardarRascunhoDoDesenho({ character, idea, ideaId, language, duration })
    void trackEvent('kids_cartoon_plans_clicked', { credits: cost, balance, duration, surface: 'form' })
    window.location.assign(KIDS_PLANS_PATH)
  }

  async function write(dur: KidsCartoonDuration = duration) {
    if (visitante) { // KINEO-CARDS-ANTES-DO-LOGIN-0411 — a primeira ação que precisa de conta: guarda as escolhas e volta à mesma tela depois do login
      guardarRascunhoDoDesenho({ character, idea, ideaId, language, duration: dur })
      void trackEvent('visitor_login_asked', { surface: 'kids_cartoon', action: 'write' })
      window.location.assign(cadastroComVolta(`${window.location.pathname}${window.location.search}`))
      return
    }
    setStage('writing'); setError(null); setNeedPlans(false); setCopied(false)
    try {
      const res = await fetch('/api/kids-cartoon/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character, language, duration: dur, idea: idea.trim(), ideaId }),
      })
      const data = await res.json().catch(() => ({})) as { script?: string; caption?: string; error?: string; reason?: string }
      if (data.reason === 'kids_plan_required') { setSemPlano(true); setError(data.error ?? null); setStage('idle'); return } // KINEO-CARTOON-SO-PLANO-0411 — a tela ainda não sabia; o servidor sabe
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
    setSceneClips([]); setSceneLines([]) // KINEO-ESTREIA-3110 — filme novo começa com a sala vazia
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
    setSceneLines(r.captions) // KINEO-ESTREIA-3110
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
          setSceneClips(list.map((c) => ({ status: typeof c?.status === 'string' ? c.status : 'processing', url: typeof c?.url === 'string' && c.url ? c.url : null }))) // KINEO-ESTREIA-3110
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
    setStage('idle'); setScript(''); setCaption(''); setVideoUrl(null); setError(null); setNeedPlans(false); setClips({ done: 0, total: 0 }); setComposePct(0)
    setSceneClips([]); setSceneLines([]) // KINEO-ESTREIA-3110
  }
  // KINEO-ESTREIA-3110 — "o próximo episódio": o MESMO personagem, língua e duração; ideia em branco. Só preenche a tela —
  // a história nova é revisada e o crédito só sai no "Make my cartoon".
  function nextEpisode() {
    restart(); setIdea(''); setIdeaId(null)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* nada */ }
  }

  const progress = stage === 'starting' ? 4 : stage === 'clips' ? 6 + Math.round((clips.total > 0 ? clips.done / clips.total : 0) * 64) : stage === 'composing' ? 72 + Math.round(Math.min(100, composePct) * 0.26) : 100
  const reviewing = stage === 'review' || (stage === 'failed' && Boolean(script))
  const renderView = stage === 'starting' || stage === 'clips' || stage === 'composing' || stage === 'done'
  // KINEO-ESTREIA-3110 — a sala ao vivo do desenho: um cartão por cena (com o rosto do personagem até a cena ficar pronta),
  // que vira o clipe real no poll em que a cena fica pronta; a linha "agora" é a fala da próxima cena.
  const premiereCount = sceneClips.length || clips.total || sceneLines.length
  const premiereItems: PremiereItem[] = Array.from({ length: premiereCount }, (_, i) => {
    const c = sceneClips[i]
    const pronta = c?.status === 'done' && Boolean(c.url)
    return {
      key: `k${i}`,
      label: `Scene ${i + 1}`,
      status: pronta ? 'ready' as const : c?.status === 'failed' ? (stage === 'clips' ? 'failed' as const : 'waiting' as const) : stage === 'clips' ? 'working' as const : 'waiting' as const,
      url: pronta ? c!.url : null,
      posterUrl: char.portrait || null,
    }
  }).filter((it) => stage !== 'composing' || it.status === 'ready')
  const premiereNext = premiereItems.findIndex((it) => it.status !== 'ready')
  const premiereLine = stage === 'clips' && premiereNext >= 0 ? (sceneLines[premiereNext] ?? '').trim() : ''
  const premiereNow = premiereLine
    ? { label: `Scene ${premiereNext + 1} · the narrator says`, text: `“${premiereLine.length > 180 ? `${premiereLine.slice(0, 177)}…` : premiereLine}”` }
    : { label: 'Now', text: stage === 'composing' ? t.stepVoice : t.stepScenes }
  const premiereTitle = (() => { const first = (script.match(/^[^.!?。！？]*[.!?。！？]?/)?.[0] ?? '').trim(); return first ? (first.length > 110 ? `${first.slice(0, 107)}…` : first) : `${char.name}’s cartoon` })()

  return (
    <div className="stu adsw adv2 kps-page adv2q kkc" data-kids-cartoon="template" data-stage={stage}>
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: ADS_WIZARD_THEME_CSS }} />
      <ProductStageStyles />
      <style dangerouslySetInnerHTML={{ __html: ADS_QUADRO_TINT_CSS + ADS_QUADRO_STUDIO_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: KIDS_TELA_CSS + KIDS_TEMPLATE_CSS }} />
      <header className="adsw-header adv2-head">
        <div>
          <h1>{t.title}</h1>
          <p className="sub">{t.lead}</p>
        </div>
      </header>
      {/* KINEO-CELULAR-FLUXO-0611 — conta sem plano com filme grátis aberto: a saída vem antes dos personagens; o desenho segue só com plano. */}
      {semPlano && filmeGratis && !visitante ? (
        <section className="ace-card" data-kineo="kids-filme-gratis">
          <p className="ace-hint">{t.freeFilmNote}</p>
          <Link className="kkc-go kkc-big" href="/studio" onClick={() => { void trackEvent('kids_cartoon_free_film_clicked', { surface: 'top' }) }}>{t.freeFilmCta} <span aria-hidden="true">→</span></Link>
        </section>
      ) : null}
      {episodios}
      <div className="kps-grid">
      <div className="kps-panel">
      {renderView ? (
        <section className="kkc-sec" data-kids-render={stage}>
          <div className="kkc-who"><img src={char.portrait} alt="" /><div><b>{char.name}</b><span>{kidsDurationChip(ui, duration, cost)} · {LANG_LABEL[language]}</span></div></div>
          {stage === 'done' && videoUrl ? (
            // KINEO-ESTREIA-3110 — a estreia: o desenho toca sozinho, Download grande (o mesmo kids_cartoon_downloaded), biblioteca e legenda logo abaixo.
            <PremiereResult
              surface="cartoon"
              kind="video"
              url={videoUrl}
              posterUrl={char.portrait || null}
              title={t.stepReady}
              meta={`${duration} s · ${LANG_LABEL[language]}`}
              downloadHref={videoUrl}
              downloadLabel={t.download}
              onDownload={() => { void trackEvent('kids_cartoon_downloaded', { character, language, duration }) }}
              next={{ label: 'Next episode', title: `${char.name}’s next adventure`, hint: 'Same character, a new story — you review it before anything is charged.', cta: 'Make the next episode', onClick: nextEpisode }}
            >
              <div className="kkc-actions">
                <Link className="kkc-ghost" href="/library">{t.library}</Link>
              </div>
              {caption ? (
                <div className="kkc-cap">
                  <p><b>{t.caption}</b><br />{caption}<br /><small>{t.label}</small></p>
                  <button type="button" className="kkc-ghost" onClick={() => { try { void navigator.clipboard.writeText(caption); setCopied(true) } catch { /* sem área de transferência */ } }}>{copied ? t.copied : t.copy}</button>
                </div>
              ) : null}
            </PremiereResult>
          ) : (
            // KINEO-ESTREIA-3110 — a espera vira a estreia: a mesma sala de todas as telas de geração (components/premiere).
            <PremiereStage
              surface="cartoon"
              title={premiereTitle}
              items={premiereItems}
              kind="video"
              ratio="9 / 16"
              now={premiereNow}
              progress={progress}
            >
              <p className="kkc-note">{t.wait}</p>
            </PremiereStage>
          )}
        </section>
      ) : (
        <div className="ace" data-kineo="kids-formulario">
          {reviewing ? null : (<>
          <section className="ace-card" aria-label={t.character} data-kineo="kids-personagem">
            <h3 className="ace-step"><b>1</b>{t.character}</h3>
            <fieldset className="ace-faces" aria-label={t.character}>
              {KIDS_CHARACTERS.map((c) => (
                <label key={c.id} className="ace-radio" data-selected={character === c.id} data-kids-character={c.id}>
                  <input type="radio" name="kkc-character" value={c.id} checked={character === c.id} disabled={busy} onChange={() => setCharacter(c.id)} />
                  <span className="kkc-face" aria-hidden="true">{c.portrait ? <img src={c.portrait} alt="" /> : c.name.slice(0, 1)}</span>
                  <strong>{c.name}</strong>
                  <small>{c.kind[ideaLang]}</small>
                  {character === c.id ? <span className="ace-check" aria-hidden="true">✓</span> : null}
                </label>
              ))}
            </fieldset>
          </section>

          <section className="ace-card" aria-label={t.idea} data-kineo="kids-ideia">
            <h3 className="ace-step"><b>2</b>{t.idea}</h3>
            <label className="ace-field"><textarea aria-label={t.idea} value={idea} maxLength={KIDS_IDEA_MAX_CHARS} placeholder={t.ideaPlaceholder} disabled={busy} onChange={(e) => { setIdea(e.target.value); setIdeaId(null) }} /></label>
            <p className="ace-hint">{t.ready}</p>
            <div className="kkc-chips">
              {KIDS_IDEAS.map((i) => (
                <button key={i.id} type="button" className="kkc-chip" aria-pressed={ideaId === i.id} disabled={busy} onClick={() => { setIdeaId(i.id); setIdea('') }} data-kids-idea={i.id}>{i[ideaLang]}</button>
              ))}
            </div>
          </section>

          {/* KINEO-CARTOON-TELA-0411 — os opcionais fechados e montados, como no anúncio: nenhum valor se perde ao fechar; sem preço aqui. */}
          <details className="ace-more" data-kineo="kids-mais-opcoes">
            <summary><strong>{tela.more}</strong><span className="ace-more-list">{tela.moreList}</span></summary>
            <div className="ace-open-body">
            <div className="ace-fields">
              <label className="ace-field">{t.language}
                <select aria-label={t.language} value={language} disabled={busy} onChange={e => { if (isKidsCartoonLanguage(e.target.value)) setLanguage(e.target.value) }} style={{ width: '100%', minHeight: 46, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)', color: 'var(--txt)', font: 'inherit', colorScheme: 'inherit' }}>{NARRATION_LANGUAGES.map(l => <option key={l.code} value={l.code} lang={l.code} dir={l.rtl ? 'rtl' : 'ltr'}>{l.native}</option>)}</select>
              </label>
              <div className="ace-field">{t.duration}
                <div className="ace-seg" role="group" aria-label={t.duration}>{KIDS_CARTOON_DURATIONS.map((d) => <button key={d} type="button" aria-pressed={duration === d} disabled={busy} onClick={() => setDuration(d)}>{d} s</button>)}</div>
              </div>
            </div>
            <p className="ace-hint">{t.rules}</p>
            </div>
          </details>
          </>)}

          {stage === 'idle' || stage === 'writing' || (stage === 'failed' && !script) ? (
            <div className="ace-actions" data-kineo="kids-botao">
              {semPlano && !visitante ? <button type="button" className="kkc-go kkc-big" data-kineo="kids-ver-planos" onClick={irAosPlanos}>{t.plans} <span aria-hidden="true">→</span></button> : <button type="button" className="kkc-go kkc-big" onClick={() => { void write() }} disabled={busy || (!idea.trim() && !ideaId)}>{stage === 'writing' ? t.writing : t.write} <span aria-hidden="true">→</span></button>}
              {error ? <p className="kkc-err" role="alert">{error}</p> : null}
              {KIDS_EPISODIO_GRATIS_LIVE && !visitante ? <KidsEpisodioGratis character={character} language={language} tema={idea} /> : null}
            </div>
          ) : (
            <section className="ace-card" aria-label={t.story} data-kids-story="1">
              <h3 className="ace-step">{t.story}</h3>
              <div className="kkc-who"><img src={char.portrait} alt="" /><div><b>{char.name}</b><span>{char.kind[ideaLang]} · {LANG_LABEL[language]}</span></div></div>
              <div className="ace-field"><textarea className="kkc-edit" value={script} maxLength={KIDS_HANDOFF_PROMPT_MAX_CHARS} onChange={(e) => { setScript(e.target.value); if (stage === 'failed') setStage('review') }} aria-label={t.story} /></div>
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
        </div>
      )}
      </div>
      {/* KINEO-CARTOON-TELA-0411 — a prévia honesta: o retrato do personagem escolhido, com o rótulo de ilustração; o filme é feito depois. */}
      <div className="adv2s-slot">
        <aside className="ace-stage" aria-label={tela.preview} data-kineo="kids-previa">
          <span className="ace-tag">{tela.tag}</span>
          <h3>{char.name}</h3>
          <p>{char.kind[ideaLang]}</p>
          <div className="ace-stage-media">
            <img className="ace-stage-portrait" src={char.portrait} alt={char.name} />
            <span className="ace-stage-label">{tela.illustrative}</span>
          </div>
        </aside>
      </div>
      </div>
    </div>
  )
}
