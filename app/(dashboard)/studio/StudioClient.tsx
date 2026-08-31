'use client'

// KINEO-STUDIO-V4-2026-08-16 — [STAGE] Generation numa tela só (spec do fundador).
// KINEO-STUDIO-POLISH-2026-08-17 — passe de design pedido pelo fundador
// ("intuitividade + harmonia, mais gostoso de mexer, melhorar as fontes"):
//   · inline-styles → classes CSS reais (hover/focus/transições vivas)
//   · controles agrupados em CARDS numerados (1 Engine · 2 Format · 3 Image
//     · 4 Idea · 5 Camera) — o olho segue o fluxo sem pensar
//   · escala tipográfica única (títulos -.02em, labels 10.5 caps, corpo 13.5)
//   · "fase 2" vira chip SOON (copy do cliente 100% inglês; explicação
//     interna fica no title/tooltip)
//   · pills com estado selecionado em glow, hover com lift de 1px
//   · resumo vivo no card de custo: motor · duração · resolução · aspecto
import { useEffect, useMemo, useRef, useState } from 'react'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { useRouter, useSearchParams } from 'next/navigation'
// KINEO-H3-2026-08-19 — custo por motor vem da fonte única, nunca de string.
import { creditCostFor, creditCostForDuration } from '@/lib/credits/engineCost'
import type { Quality } from '@/lib/credits/engineCost'
import { isOnboardingGoalId, type OnboardingGoalId } from '@/lib/growth/onboardingGoals'
import {
  CHATGPT_QUICKSTART_VARIANT,
  isChatGptQuickstartChoice,
  type ChatGptQuickstartChoice,
} from '@/lib/growth/chatgptQuickstart'
import {
  trialFirstDeliveryStudioIntent,
  TRIAL_FIRST_DELIVERY_VERSION,
} from '@/lib/growth/trialBalanceBridge'
import { trackEvent } from '@/lib/analytics'
import { buildSeriesContinuationHref } from '@/lib/seriesContinuation'

// A chave do card → a Quality que o biller entende. Uma fonte só para os dois
// (tela e cobrança) evita a classe de bug que este arquivo já teve: custo em
// string chumbada divergindo do que o servidor debita.
const ENGINE_QUALITY: Record<string, Quality> = {
  fast: 'fast',
  seedance: 'cinematic_ai',
  kling: 'cinematic_kling',
  veo: 'cinematic_veo',
  hollywood: 'cinematic_hollywood',
  h3: 'cinematic_h3',
  omni: 'cinematic_omni', // KINEO-OMNI-2026-08-25
  avatar: 'avatar',
  presenter: 'presenter',
}

// KINEO-H3-2026-08-19 — 'h3' entra aqui. ⚠️ LIÇÃO: o motor foi adicionado ao
// seletor do /generate e NÃO apareceu para o fundador, porque a tela que ele
// usa é o /studio — que mantém a PRÓPRIA lista de motores. São dois seletores
// para a mesma decisão, e é o mesmo defeito estrutural do dia: a mesma verdade
// morando em dois lugares. Unificar os dois fica no backlog; hoje o conserto é
// o motor existir nos dois.
type EngineKey = 'fast' | 'seedance' | 'kling' | 'veo' | 'hollywood' | 'h3' | 'omni'

// KINEO-STUDIO-SPECS-2026-08-17 (fundador: 'so 1080p — as pessoas nao
// precisam saber a quantidade de clips'): a ficha tecnica interna
// (segundos por clipe) saiu da vitrine; todo entregavel final e 1080x1920
// (verificado por ffprobe), entao a spec visivel e uma so: 1080p.
const ENGINES: {
  key: EngineKey
  /** KINEO-NOITE2-2026-08-17 (#4) — clipe de 8s no hover do picker. */
  preview?: string
  icon: string
  name: string
  tag?: string
  desc: string
  res: string
  credits: string
  supportsRef: boolean
}[] = [
  // ⚠️ 'credits' saiu de string chumbada para creditCostFor(): o Kineo 1 dizia
  // "Free" e desde hoje custa 2 créditos para quem paga (dizer Free e cobrar 2
  // é cobrança-surpresa, a mesma classe de erro que passamos o dia caçando em
  // preço). Free continua vendo "Free" — para ele o custo É zero.
  { key: 'fast', icon: '⚡', name: 'Kineo 1', desc: 'Kineo’s own engine — stock + captions', res: '720p', credits: `${creditCostFor('fast', true)} cr`, supportsRef: false },
  { key: 'seedance', preview: '/previews/75728dfb-3b29-47fa-aea8-b806d549a2b9.mp4', icon: 'S', name: 'Seedance 1.5', tag: 'Popular', desc: 'The workhorse AI video engine', res: '720p', credits: `${creditCostFor('cinematic_ai', true)} cr`, supportsRef: false },
  { key: 'kling', preview: '/previews/c4e4fbab-0978-4daa-9fcf-119096370210.mp4', icon: 'K', name: 'Kling 2.5', tag: 'Best value', desc: 'Cinematic motion and camera work', res: '720p', credits: `${creditCostFor('cinematic_kling', true)} cr`, supportsRef: false },
  { key: 'veo', preview: '/previews/9bbd5d98-33e5-423f-b9cb-82f7af6c67ba.mp4', icon: 'G', name: 'Veo 3.1', tag: 'Studio', desc: 'Google’s flagship cinematic engine', res: '720p', credits: `${creditCostFor('cinematic_veo', true)} cr`, supportsRef: false },
  { key: 'hollywood', preview: '/previews/4b12925e-16e6-4b56-af5a-7047f9ae7a28.mp4', icon: 'K3', name: 'Kling 3', tag: 'Studio', desc: 'Film scenes, native voice & lip sync', res: '720p', credits: `${creditCostFor('cinematic_hollywood', true)} cr`, supportsRef: true },
  // KINEO-H3-2026-08-19 — MiniMax H3. Sem preview ainda (entra depois do
  // primeiro render de validação; vitrine com clipe de outro motor seria
  // quebrar o selo honesto). É o filme carro-chefe que CABE no plano: o
  // Creator (90cr) não fecha um Kling 3 de 150, e fecha DOIS H3 de 45.
  { key: 'h3', icon: 'H3', name: 'MiniMax H3', tag: 'New', desc: 'Cinematic film that fits your plan — 9-image consistency', res: '768p', credits: `${creditCostFor('cinematic_h3', true)} cr`, supportsRef: true },
  // KINEO-OMNI-2026-08-25 — o #1 do ranking cego de agosto (1245 Elo,
  // Artificial Analysis arena) entra no topo do catálogo. Selo honesto: a
  // claim '#1 ranked' tem fonte datada (docs/MOTOR-OMNI-FLASH-2026-08-25.md)
  // e sai do card se o ranking mudar. Sem preview ainda — entra depois do
  // render de validação (vitrine com clipe de outro motor quebraria o selo).
  { key: 'omni', icon: 'OF', name: 'Omni Flash', tag: 'New · #1 ranked', desc: 'Google’s Gemini Omni Flash — #1 video model, Aug 2026 arena', res: '720p', credits: `${creditCostFor('cinematic_omni', true)} cr`, supportsRef: true },
]

// KINEO-CEO-HOUR-2026-08-17 (#3) — 'Surprise me': mata a paralisia da pagina
// em branco com ideias do padrao viral da casa (verticais que ja performaram).
const SURPRISE_IDEAS = [
  'The lake in Venezuela where lightning strikes 28 times a minute — and never stops',
  'The wave in Alaska that was taller than the Empire State Building',
  'A diver knocks on a submarine window 100 meters down — true story',
  'The town that has been on fire underground since 1962',
  'Why airplane windows are round — the crashes that taught us',
  'The man who survived two atomic bombs in three days',
  'The door in the ocean floor scientists refuse to open',
  'How Rolex watches are made — inside the most secretive factory on Earth',
  'The island where landing is illegal — and what lives there',
  'The 1939 photo that should not exist — a smartphone in the crowd',
]

const CAMERA_PRESETS: { key: string; label: string; emoji: string; prompt: string }[] = [
  { key: 'dolly', label: 'Slow Dolly-In', emoji: '🎥', prompt: 'slow cinematic dolly-in toward the subject' },
  { key: 'crash', label: 'Crash Zoom', emoji: '⚡', prompt: 'sudden dramatic crash zoom onto the focal point' },
  { key: 'orbit', label: 'Orbit', emoji: '🌀', prompt: 'smooth 180-degree orbital camera move around the subject' },
  { key: 'fpv', label: 'FPV Drone', emoji: '🚁', prompt: 'fast FPV drone fly-through shot' },
  { key: 'crane', label: 'Crane Up', emoji: '🏗️', prompt: 'majestic crane shot rising to reveal the scene' },
  { key: 'handheld', label: 'Handheld', emoji: '🎬', prompt: 'gritty handheld documentary camera with subtle shake' },
  { key: 'macro', label: 'Macro Detail', emoji: '🔬', prompt: 'extreme macro close-up with shallow depth of field' },
  { key: 'static', label: 'Locked Tripod', emoji: '🗿', prompt: 'perfectly static tripod shot, movement inside the frame' },
]

// KINEO-STUDIO-KIT-2026-08-17 — o CSS local virou o kit compartilhado
// (components/studioKit) que veste TODOS os ambientes. Ajuste aprovado pelo
// fundador entra LA, uma vez, e atualiza o produto inteiro.

export default function StudioClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchSignature = searchParams.toString()
  const [engine, setEngine] = useState<EngineKey>('seedance')
  const [pickerOpen, setPickerOpen] = useState(false)
  // KINEO-DURACAO-FIX-2026-08-20 — o tipo ficou para trás dos botões (35/60/90)
  // e `setDuration(35)` só não explodia porque o TS não cobre este caminho.
  const [duration, setDuration] = useState<35 | 60 | 90>(60)
  const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16')
  // KINEO-RES-HONESTA-2026-08-20 — estado REMOVIDO junto com o seletor. Ele
  // nunca chegou a valer nada (o 720p vivia desabilitado) e virou perigoso:
  // um valor chamado `resolution` fixo em '1080p' convida o próximo a mandá-lo
  // ao servidor como se fosse escolha do cliente. A resolução real é do motor
  // (eng.res) e o master é sempre 1080×1920.
  // ═══ KINEO-CABE-2026-08-21 — A TELA PRECISA SABER O SALDO ═══════════════
  // Desde que o trial abriu TODOS os motores (KINEO-TETO), a pessoa vê o
  // Kling 3 destravado — e ele custa 150 créditos contra os 80 do trial. Ela
  // escolhe, escreve a ideia, clica, e leva "créditos insuficientes". Pior
  // combinação possível: mostramos o topo do catálogo e negamos na última
  // porta, depois de ela já ter investido a ideia.
  // O que cabe hoje no trial de 80: Kineo 1, Seedance, H3 e Kling 2.5 nos três
  // tiers; Presenter até 60s; Veo e Avatar só em 35s; Kling 3 em NENHUM.
  // Saber o saldo aqui permite dizer a verdade ANTES do clique.
  const [balance, setBalance] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/me/credits', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && typeof d?.credits === 'number') setBalance(d.credits) })
      .catch(() => {}) // saldo é enfeite: falhou, a tela segue como antes
    return () => { alive = false }
  }, [])
  const [preset, setPreset] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  // KINEO-STUDIO-SCRIPTMODE-2026-08-17 (fundador: 'faltou usar a script do
  // jeito que ela esta ou AI ajudar a escrever'): mesmo par de modos do
  // fluxo classico — 'ai' estrutura o texto, 'verbatim' narra palavra por
  // palavra (scripts prontos, como os do canal do fundador).
  const [scriptMode, setScriptMode] = useState<'ai' | 'verbatim'>('ai')
  const [chatGptQuickstart, setChatGptQuickstart] = useState<ChatGptQuickstartChoice | null>(null)
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const quickstartReadyTrackedRef = useRef(false)
  const [refName, setRefName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const campaignRef = useRef('studio_v4')
  const onboardingGoalRef = useRef<OnboardingGoalId | null>(null)
  // KINEO-STUDIO-MYVIDS-2026-08-17 (pedido do fundador na aprovacao: "colocar
  // na parte de baixo os meus ultimos videos — e o que falta pra completar"):
  // os 6 renders mais recentes do usuario, hover da play, clique abre o filme.
  // KINEO-CEO-HOUR-2026-08-17 (#8) — reativacao da base: banner UMA VEZ
  // anunciando o que nasceu esta semana (Images/Audio/Enhance). ~1.300 contas
  // antigas nunca souberam que isso existe.
  const [showNews, setShowNews] = useState(false)
  useEffect(() => {
    try { if (!localStorage.getItem('kineo:news:2026-08-17')) setShowNews(true) } catch {}
  }, [])
  const dismissNews = () => {
    setShowNews(false)
    try { localStorage.setItem('kineo:news:2026-08-17', '1') } catch {}
  }
  const [myVids, setMyVids] = useState<{ id: string; title: string | null; video_url: string | null; thumbnail_url: string | null; enhanced_url?: string | null }[]>([])
  useEffect(() => {
    fetch('/api/videos', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { videos: [] }))
      .then((d) => { if (Array.isArray(d?.videos)) setMyVids(d.videos.filter((v: { video_url?: string | null }) => v.video_url).slice(0, 6)) })
      .catch(() => {})
  }, [])

  // KINEO-SPRINT-V1V4-2026-08-31 (#8) — EXPOSICAO ANTES DE TAXA. A licao da
  // rodada #7: o produto tinha seis saidas para o 2o video e nenhuma sabia
  // quantas pessoas a viam, entao ninguem podia comparar. Aqui a fileira de
  // miniaturas grava, uma vez por carga, quantas pessoas a VIRAM e em que
  // ambiente — assim `series_continue_clicked` com source='studio_video_tile'
  // vira taxa por pessoa exposta, e nao numero solto.
  // Sai daqui so booleano e numero de ambiente; nenhum dado da pessoa viaja.
  const tilesShownRef = useRef(false)
  useEffect(() => {
    if (tilesShownRef.current || myVids.length === 0) return
    tilesShownRef.current = true
    const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: none)').matches
      : false
    void trackEvent('studio_tiles_shown', {
      videos: myVids.length,
      is_touch: coarse,
      viewport_w: typeof window !== 'undefined' ? window.innerWidth : null,
    })
  }, [myVids.length])

  // KINEO-STUDIO-ENTRADA-2026-08-17 — o Studio virou a porta principal (menus
  // do topo apontam pra ca): le ?engine= e ?prompt= da URL pra chegada dos
  // cards do hero/bento/mega-menu ja cair com o motor certo selecionado.
  useEffect(() => {
    const sp = new URLSearchParams(searchSignature)
    const e = sp.get('engine')
    if (e && ENGINES.some((x) => x.key === e)) setEngine(e as EngineKey)
    const p = sp.get('prompt')
    if (p) setPrompt(p)
    const requestedScriptMode = sp.get('script_mode')
    if (requestedScriptMode === 'ai' || requestedScriptMode === 'verbatim') {
      setScriptMode(requestedScriptMode)
    }
    const requestedDuration = Number(sp.get('duration'))
    if (requestedDuration === 35 || requestedDuration === 60 || requestedDuration === 90) {
      setDuration(requestedDuration)
    }
    const quickstartChoice = sp.get('chatgpt_quickstart')
    if (isChatGptQuickstartChoice(quickstartChoice)) {
      setChatGptQuickstart(quickstartChoice)
      window.requestAnimationFrame(() => promptRef.current?.focus())
      if (!quickstartReadyTrackedRef.current) {
        quickstartReadyTrackedRef.current = true
        void trackEvent('chatgpt_quickstart_studio_ready', {
          variant: CHATGPT_QUICKSTART_VARIANT,
          input_type: quickstartChoice,
          duration: requestedDuration === 35 || requestedDuration === 60 || requestedDuration === 90
            ? requestedDuration
            : null,
          engine: 'seedance',
        })
      }
    } else {
      setChatGptQuickstart(null)
    }
    // KINEO-AUDIT-CAMPAIGN-2026-08-18: a campanha da landing (nav_mega/
    // engine_tile/hero_engine) atravessa o Studio em vez de virar 'studio_v4'.
    const ic = sp.get('intent_campaign')
    if (ic) campaignRef.current = ic
    const onboardingGoal = sp.get('onboarding_goal')
    if (isOnboardingGoalId(onboardingGoal)) onboardingGoalRef.current = onboardingGoal
  }, [searchSignature])

  const eng = useMemo(() => ENGINES.find((e) => e.key === engine)!, [engine])
  // Um cálculo só, usado no preço, no botão e no aviso — para os três nunca
  // discordarem entre si (foi assim que a tela e o servidor divergiram ontem).
  const cost = creditCostForDuration(ENGINE_QUALITY[eng.key] ?? 'cinematic_ai', true, duration)

  const finalPrompt = useMemo(() => {
    const p = CAMERA_PRESETS.find((c) => c.key === preset)
    return p && prompt.trim() ? `${prompt.trim()}\n\n[camera: ${p.prompt}]` : prompt.trim()
  }, [prompt, preset])

  // KINEO-STUDIO-ONECLICK-2026-08-17 (degrau 2): o clique AQUI e o
  // consentimento de gasto — o usuario viu motor + custo e apertou Generate.
  // Token de uso unico via sessionStorage (mesma origem, 2 min de validade)
  // autoriza o /generate a disparar o render sozinho ao fim da analise; a
  // chegada ja roda ?autoanalyze=1 (primitivo do Viral Now). Resultado: UM
  // clique no Studio → analise → render → filme, sem parada na tela antiga.
  const generate = () => {
    try {
      sessionStorage.setItem('kineo:studio:go:v1', JSON.stringify({ t: Date.now(), engine, prompt: finalPrompt }))
    } catch {}
    const q = new URLSearchParams({ engine, prompt: finalPrompt, duration: String(duration), script_mode: scriptMode, autoanalyze: '1', studio: '1', intent_campaign: campaignRef.current })
    // KINEO-TRIAL-FIRST-HANDOFF-2026-08-30 — production showed 4 people
    // clicking the banner's premium first-delivery CTA, but only 1 completed
    // Seedance. One later armed the Fast activation contract. Engine/duration
    // in the Studio URL were presentation state; the machine room's explicit
    // activation contract (create_intent) was absent.
    //
    // Preserve the review boundary: the banner still spends nothing. Only the
    // person's Generate click may attach trial_best, and only while Seedance
    // remains selected. If they manually choose another engine, that choice
    // wins and this helper returns null.
    const trialCreationIntent = trialFirstDeliveryStudioIntent({
      intentCampaign: campaignRef.current,
      engine,
    })
    if (trialCreationIntent) {
      q.set('create_intent', trialCreationIntent)
      // trial_best already owns analyze + dispatch. Keeping the generic Studio
      // autoanalyze rail armed as well would let two effects race for the same
      // Generate click. Remove both generic triggers and their short-lived
      // session token so exactly one contract owns the request.
      q.delete('autoanalyze')
      q.delete('studio')
      try {
        sessionStorage.removeItem('kineo:studio:go:v1')
      } catch {}
      void trackEvent('trial_first_delivery_generate_committed', {
        source: 'studio',
        version: TRIAL_FIRST_DELIVERY_VERSION,
        engine,
        duration,
        credits_required: cost,
      })
    }
    if (onboardingGoalRef.current) q.set('onboarding_goal', onboardingGoalRef.current)
    // KINEO-STUDIO-UNIFICACAO-2026-08-24 — a casa de máquinas agora mora em
    // /studio/create (o /generate virou porteiro que redireciona). Apontar
    // direto evita o hop extra do redirect no clique mais quente do produto.
    router.push(`/studio/create?${q.toString()}`)
  }

  return (
    <div className="stu">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />

      {showNews && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '1px solid rgba(41,151,255,0.35)', background: 'rgba(41,151,255,0.06)' }}>
          <span style={{ fontSize: 13.5, color: 'var(--txt2,#c7c7cc)' }}>
            <b style={{ color: '#7cc0ff' }}>NEW this week:</b> 🖼 <a href="/images" style={{ color: '#f5f5f7' }}>AI Images</a> (6 engines) · 🎙 <a href="/audio" style={{ color: '#f5f5f7' }}>Audio studio</a> (4 voices engines) · ✨ <a href="/history" style={{ color: '#f5f5f7' }}>HD Enhance</a> on every video
          </span>
          <button type="button" onClick={dismissNews} aria-label="Dismiss" className="pill" style={{ marginLeft: 'auto' }}>✕</button>
        </div>
      )}
      <h1>Studio</h1>
      <p className="sub">Every control on one screen. Pick, type, generate.</p>

      <div className="grid">
        {/* ===== RAIL ESQUERDO — controles em cards numerados ===== */}
        <div className="rail">
          {/* 1 · Engine */}
          <div style={{ position: 'relative' }}>
            <button type="button" className="mdlbtn" onClick={() => setPickerOpen((o) => !o)}>
              <span className="lab" style={{ marginBottom: 0 }}><span className="n">1</span>Engine</span>
              <span className="mdlname" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="eng-ic" aria-hidden="true">{eng.icon}</span>
                <b>{eng.name}</b>
                {/* KINEO-RES-1080-2026-08-24 — o fundador leu "720p ▾" ao lado
                    do Kling 3 e "1080×1920 master" logo abaixo como CONTRADIÇÃO
                    ("precisa arrumar isso") — e ele é o leitor mais treinado da
                    casa; cliente tropeça igual. A decisão dele de 17/08 já dizia:
                    "só 1080p — as pessoas não precisam saber". O rótulo do card
                    fecha com a promessa da entrega (todo master é 1080×1920,
                    verificado por ffprobe); a resolução NATIVA do motor sai da
                    vitrine e vive só no hint explicativo do formato. */}
                <i style={{ marginLeft: 'auto' }}>1080p ▾</i>
              </span>
            </button>
            {pickerOpen && (
              <div className="picker">
                {ENGINES.map((e) => (
                  <button key={e.key} type="button" className={`pk${e.key === engine ? ' on' : ''}`}
                    onClick={() => { setEngine(e.key); setPickerOpen(false) }}>
                    <span className="eng-ic" aria-hidden="true">{e.icon}</span>
                    <span className="pk-tx">
                      {/* KINEO-PRECO-NO-COMPROMISSO-2026-08-18 (fundador +
                          averiguacao Higgsfield/InVideo: preco nao mora no
                          seletor — so no cartao de gerar e no /pricing). */}
                      <span className="t">
                        <b>{e.name}{e.tag && <span className="tag">{e.tag}</span>}</b>
                        {/* KINEO-RES-1080-2026-08-24 — era {e.res}: o mesmo
                            "720p" que confundiu o fundador no card fechado,
                            repetido dentro do seletor. Todos entregam o mesmo
                            master; mostrar resolução nativa aqui só recoloca a
                            contradição que acabamos de tirar. */}
                        <i>1080p</i>
                      </span>
                      <span className="d">{e.desc}</span>
                    </span>
                    {e.preview && (
                      <span className="pkv" aria-hidden="true">
                        <video src={e.preview} muted loop playsInline preload="none"
                          onMouseEnter={(ev) => { const v = ev.currentTarget; v.currentTime = 0; v.play().catch(() => {}) }} />
                      </span>
                    )}
                  </button>
                ))}
                {/* KINEO-SPRINT-UI8-2026-08-30 — Avatar era o motor INVISIVEL
                    (auditoria 28/08, achado #2): anunciado como 1 dos 8 motores,
                    0 debitos NA HISTORIA — porque nao existia em NENHUM seletor.
                    O /generate virou porteiro do /studio, entao este picker e o
                    UNICO lugar onde cliente escolhe motor. O Avatar tem pipeline
                    proprio (foto → apresentador falando), entao o card nao entra
                    no fluxo do Studio: e a PORTA para o ambiente dedicado /avatar.
                    Selo honesto: sem claim de resolucao (0 masters verificados). */}
                <button
                  type="button"
                  className="pk"
                  onClick={() => { setPickerOpen(false); router.push('/avatar') }}
                >
                  <span className="eng-ic" aria-hidden="true">🧑</span>
                  <span className="pk-tx">
                    <span className="t">
                      <b>Avatar<span className="tag">Presenter</span></b>
                      <i>Avatar Studio →</i>
                    </span>
                    <span className="d">Talking AI presenter from a photo — lip-synced, its own studio</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 2 · Format — duração + aspecto + resolução num card só */}
          <div className="card">
            <div className="lab"><span className="n">2</span>Format</div>
            <div className="row" style={{ marginBottom: 12 }}>
              {/* ═══ KINEO-DURACAO-2026-08-20 — OS TRÊS TIERS QUE O DADO PEDE ═══
                  Medido em 6M de vídeos do TikTok (Socialinsider, jan-jun/2026):
                  15-30s rende 1.000 views medianas · 30-60s rende 2.200 ·
                  60-90s rende 7.200 · 90-120s rende 9.620. Ou seja, o teto de
                  60s que a gente tinha deixava 4× de alcance na mesa. São duas
                  lógicas de ranking rodando juntas: curto ganha em taxa de
                  conclusão, longo acumula tempo de exibição — e VIEWS SEGUEM
                  TEMPO DE EXIBIÇÃO.
                  35s fica como o tier de volume (barato, para testar tema);
                  60s continua o padrão e o piso de monetização do TikTok;
                  90s é o tier de alcance. */}
              <button type="button" className={`pill${duration === 35 ? ' on' : ''}`} onClick={() => setDuration(35)}>35s</button>
              <button type="button" className={`pill${duration === 60 ? ' on' : ''}`} onClick={() => setDuration(60)}>60s ⭐</button>
              <button type="button" className={`pill${duration === 90 ? ' on' : ''}`} onClick={() => setDuration(90)} title="Mais alcance: no TikTok, 90s rende ~4x as views de um vídeo de 60s">90s 📈</button>
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <button type="button" className={`pill${aspect === '9:16' ? ' on' : ''}`} onClick={() => setAspect('9:16')}>9:16 · Shorts</button>
              <button type="button" className="pill off" title="Coming soon">16:9<span className="soon">SOON</span></button>
            </div>
            {/* ⚠️ KINEO-RES-HONESTA-2026-08-20 — a tela se contradizia.
                O card do motor mostrava "768p" (a resolução real do H3) e
                LOGO ABAIXO um botão "1080p Full HD" aparecia selecionado. Duas
                afirmações opostas na mesma tela, e a de baixo era a falsa.
                A verdade, que vale para TODOS os motores: cada um gera na
                resolução nativa dele (H3 em 768p, os demais em 720p desde a
                mudança de margem de hoje) e o Creatomate ENTREGA o master em
                1080×1920. Então a linha deixa de ser um seletor — que nunca
                selecionou nada, o 720p sempre esteve desabilitado — e passa a
                ser a informação: nativa do motor → master entregue.
                Selo honesto é ativo de marca; um botão que mente sobre a
                resolução é a mesma classe de erro do "Free" no Kineo 1. */}
            {/* KINEO-RES-1080-2026-08-24 — a dupla de pills "720p native
                (apagada) → 1080×1920 master (acesa)" era informação vestida de
                CONTROLE: pill apagada lê como "opção quebrada/desabilitada", e
                o fundador leu exatamente assim. Vira UMA pill de entrega; a
                verdade sobre a resolução nativa continua dita, mas em TEXTO no
                hint — informação em formato de informação, controle nenhum. */}
            <div className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill on" style={{ cursor: 'default' }}>1080×1920 · Full HD master</span>
            </div>
            <div className="hint">Every film is delivered as a 1080×1920 Full HD master (engines render natively at 720–768p and are mastered up). For maximum sharpness, run ✨HD Enhance on the finished film.</div>
          </div>

          {/* 3 · Reference image */}
          <div className="card">
            <div className="lab"><span className="n">3</span>Reference image <span className="soon">SOON</span></div>
            {/* KINEO-STUDIO-AUDIT-2026-08-17 — auditoria de botoes do fundador
                flagrou: o upload aceitava o arquivo mas NAO viajava pro render
                (botao morto = promessa falsa). Ate o pipe de upload ligar,
                vira SOON honesto — selo honesto vale dentro do produto tambem. */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(ev) => setRefName(ev.target.files?.[0]?.name ?? null)} />
            <button type="button" disabled className="upl no" title="Coming soon">
              🖼️ Start your video from an image — coming soon
            </button>
          </div>

          {/* Custo + Generate */}
          <div className="cost">
            <div className="sum" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="eng-ic" style={{ width: 24, height: 24, borderRadius: 7, fontSize: 10.5 }} aria-hidden="true">{eng.icon}</span>{eng.name} · {duration}s · 1080p · {aspect}{preset ? ` · ${CAMERA_PRESETS.find((c) => c.key === preset)?.label}` : ''}</div>
            {/* O número tem de mudar junto com o seletor: preço que só
                aparece DEPOIS do clique é cobrança-surpresa. O servidor cobra
                por esta mesma função (creditCostForDuration), então tela e
                fatura nunca divergem. */}
            <div className="val">
              <span>Estimated cost</span>
              <b style={balance !== null && cost > balance ? { color: '#fb923c' } : undefined}>{cost} cr</b>
            </div>
            {balance !== null && cost > balance && (
              // A verdade ANTES da ideia ser escrita, não depois do clique.
              <div className="val" style={{ color: '#fb923c', fontSize: '0.78rem' }}>
                <span>You have {balance} cr</span>
                <b style={{ fontWeight: 600 }}>{duration > 35 ? 'try 35s, or another engine' : 'try another engine'}</b>
              </div>
            )}
            {/* Expectativa de tempo ANTES do clique: o cronômetro da tela de
                render sobe sem dizer quanto é normal, e quem não conhece lê
                como travado. Fast é minutos; motor de IA é vários minutos. */}
            <div className="val" style={{ opacity: 0.75 }}>
              <span>Usually takes</span>
              <b style={{ fontWeight: 600 }}>{eng.key === 'fast' ? '3–7 min' : '8–20 min'}</b>
            </div>
            <button type="button" onClick={generate} disabled={!prompt.trim()} className={`go ${prompt.trim() ? 'ok' : 'no'}`}>
              {!prompt.trim()
                ? 'Type your idea first'
                : balance !== null && cost > balance
                  ? `Need ${cost - balance} more credits`
                  : 'Generate →'}
            </button>
            <div className="gnote">Voice, karaoke captions and score included.</div>
          </div>
        </div>

        {/* ===== DIREITA — ideia + câmera ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="lab" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span><span className="n">4</span>{chatGptQuickstart === 'finished_script' ? 'Paste your ChatGPT script' : chatGptQuickstart === 'idea' ? 'Paste your ChatGPT idea' : 'Your idea'}</span>
              <button
                type="button"
                className="pill"
                style={{ fontSize: 11 }}
                onClick={() => setPrompt(SURPRISE_IDEAS[Math.floor(Math.random() * SURPRISE_IDEAS.length)])}
              >
                🎲 Surprise me
              </button>
            </div>
            {/* KINEO-TEMPLATES-2026-08-18 (roubo com critério dos format cards
                do InVideo): um clique arma o formato — esqueleto de prompt +
                modo de script certo. */}
            {chatGptQuickstart ? (
              <div
                data-chatgpt-quickstart={chatGptQuickstart}
                style={{
                  marginBottom: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(103,232,249,.36)',
                  background: 'linear-gradient(135deg, rgba(103,232,249,.11), rgba(41,151,255,.06))',
                  color: '#c7d7e5',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <b style={{ color: '#67e8f9' }}>Continue exactly where ChatGPT stopped.</b>{' '}
                {chatGptQuickstart === 'finished_script'
                  ? 'Paste the full answer below. “Use my script as is” and the 35s target are already selected; review the Seedance cost, then press Generate.'
                  : 'Paste the idea or one sentence below. Kineo will write the hook, scenes and payoff; Seedance and the 60s target are already selected.'}
              </div>
            ) : null}
            <div className="row" style={{ marginBottom: 8 }}>
              {([
                ['📊 Facts', '5 shocking facts about ', 'ai'],
                ['🕵️ Mystery', 'The unsolved mystery of ', 'ai'],
                ['📖 True Story', 'The incredible true story of ', 'ai'],
                ['📝 My Script', '', 'verbatim'],
              ] as const).map(([label, seed, mode]) => (
                <button key={label} type="button" className="pill" style={{ fontSize: 11.5 }}
                  onClick={() => { setScriptMode(mode as 'ai' | 'verbatim'); if (seed) setPrompt(seed) }}>
                  {label}
                </button>
              ))}
            </div>
            <textarea ref={promptRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7}
              placeholder={chatGptQuickstart === 'finished_script'
                ? 'Paste the complete script from ChatGPT here…'
                : chatGptQuickstart === 'idea'
                  ? 'Paste the idea from ChatGPT here…'
                  : 'What’s your video about? One idea in — a finished film out: voiced, scored and captioned.'} />
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className={`pill${scriptMode === 'ai' ? ' on' : ''}`} onClick={() => setScriptMode('ai')}>✨ Let AI structure it</button>
              <button type="button" className={`pill${scriptMode === 'verbatim' ? ' on' : ''}`} onClick={() => setScriptMode('verbatim')}>📝 Use my script as is</button>
            </div>
            <div className="cnt">{prompt.trim() ? `${prompt.trim().split(/\s+/).length} words${scriptMode === 'verbatim' ? ' · narrated word for word' : ''}` : 'a single line is enough — or paste a full script'}</div>
          </div>

          <div>
            <div className="lab"><span className="n">5</span>Camera preset <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>optional — a pre-tested move added to your prompt</span></div>
            <div className="cams">
              {CAMERA_PRESETS.map((c) => (
                <button key={c.key} type="button" className={`cam${preset === c.key ? ' on' : ''}`}
                  onClick={() => setPreset(preset === c.key ? null : c.key)}>
                  <div className="e">{c.emoji}</div>
                  <div className="l">{c.label}</div>
                </button>
              ))}
            </div>
            {preset && (
              <div className="camline">camera: {CAMERA_PRESETS.find((c) => c.key === preset)?.prompt}</div>
            )}
          </div>

          <div className="steps">
            {[
              ['1 · CONFIGURE', 'Engine, length, resolution and camera — all on this screen.'],
              ['2 · TYPE', 'One idea. Kineo writes the script and directs every scene.'],
              ['3 · GET YOUR FILM', 'Voice, karaoke captions and score included. Download and post.'],
            ].map(([t, d]) => (
              <div key={t} className="step"><b>{t}</b><p>{d}</p></div>
            ))}
          </div>

          {/* KINEO-SPRINT-V1V4-2026-08-31 (#2) — O MARCO ONDE O PUBLICO ESTA.
              Medido em 7 dias: series_continue_clicked por fonte deu
              history_milestone=7, done_screen=2, generate_recent_video=1,
              history_video_card=1. Ou seja, o bloco de marco do /history e
              sozinho 64% de todo o "faca o proximo episodio" do produto — e
              mora numa tela que 23 pessoas visitaram. O /studio, a porta de
              criacao, teve 87 pessoas e NAO tinha marco nenhum: so a fileira
              de 6 miniaturas, cujo clique abre o MP4 cru em outra aba.
              Levar o padrao vencedor para onde o publico ja passa custa uma
              caixa e nao inventa mecanica nova: mesmo helper de tema
              (buildSeriesContinuationHref) usado pelo /history e pela tela de
              video pronto. A contagem e do proprio acervo — nada prometido. */}
          {myVids.length > 0 && (
            <div
              className="myv"
              style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span aria-hidden="true" style={{ display: 'inline-flex', gap: 4 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 99,
                          background: i < Math.min(myVids.length, 4) ? '#34d399' : 'rgba(255,255,255,.16)',
                        }}
                      />
                    ))}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#34d399' }}>
                    {myVids.length === 1
                      ? 'First Short complete'
                      : myVids.length >= 4
                        ? `${myVids.length}+ Shorts complete`
                        : `${myVids.length} of your first 4 Shorts`}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f7' }}>
                  {myVids.length === 1 ? 'Turn it into episode 2' : 'Keep your show moving'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt2,#9aa0a6)', marginTop: 2 }}>
                  Same topic, new hook and payoff — the idea comes pre-written.
                </div>
              </div>
              <a
                href={buildSeriesContinuationHref(myVids[0]?.title, 'studio_milestone')}
                className="pill on"
                style={{ textDecoration: 'none', fontWeight: 800, whiteSpace: 'nowrap' }}
                onClick={() => {
                  void trackEvent('series_continue_clicked', {
                    source: 'studio_milestone',
                    video_id: myVids[0]?.id ?? null,
                    completed_video_count: myVids.length,
                  })
                }}
              >
                Build next episode →
              </a>
            </div>
          )}

          {/* KINEO-STUDIO-MYVIDS-2026-08-17 — os ultimos renders do usuario. */}
          {myVids.length > 0 && (
            <div className="myv">
              <div className="hd">
                <div className="lab" style={{ marginBottom: 0 }}>Your latest videos</div>
                <a href="/history">See all →</a>
              </div>
              <div className="vrow">
                {myVids.map((v, idx) => (
                  <div key={v.id} className="vtile">
                    <a
                      className="vtwatch"
                      href={(v.enhanced_url ?? v.video_url) ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={v.title ? `Watch ${v.title}` : 'Watch this Short'}
                      onClick={() => {
                        void trackEvent('studio_tile_watch_clicked', {
                          video_id: v.id,
                          position: idx,
                          completed_video_count: myVids.length,
                        })
                      }}
                    >
                      {v.enhanced_url && <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 99, background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.5)', color: '#34d399' }}>✨ HD</span>}
                      <video
                        src={`${v.enhanced_url ?? v.video_url}#t=0.1`}
                        poster={v.thumbnail_url ?? undefined}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => { e.currentTarget.pause() }}
                      />
                      <span className="vtplay" aria-hidden="true">▶</span>
                    </a>
                    {v.title && <span className="vt">{v.title}</span>}
                    <a
                      className="vtnext"
                      href={buildSeriesContinuationHref(v.title, 'studio_video_tile')}
                      onClick={() => {
                        void trackEvent('series_continue_clicked', {
                          source: 'studio_video_tile',
                          video_id: v.id,
                          position: idx,
                          completed_video_count: myVids.length,
                          has_title: Boolean(v.title),
                        })
                      }}
                    >
                      Episode 2 →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
