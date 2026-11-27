'use client'
// KINEO-CAIXA-UNICA-0411 [fundador 04/11: "1a"] — a porta do Studio: produto, texto e Generate na mesma tela; ajustes numa folha; login só ao gerar.
//
// Olhando a Higgsfield: "a gente não deixa ele chegar na parte onde pode escrever a história dele"; "tem muito conteúdo a página"; "o motor está muito em
// evidência". O Generate monta o MESMO pedido do Studio completo e cai no /studio/create, que confere saldo e motor e, sem conta, manda ao cadastro e devolve
// ao mesmo pedido. A moldura Film oferece os ajustes de câmera e referências no próprio editor.
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { CAMERA_PRESETS } from '@/lib/create/filmCameraPresets'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { useMrrStudioFunnel } from '@/lib/growth/useMrrStudioFunnel'
import { analyzePromptMaxChars } from '@/lib/analyzeLimits'
import { promptLimitState } from '@/lib/studioPromptLimit'
import { decideSexualContentRefusal, sexualContentRefusalMessage } from '@/lib/contentPolicy/sexualContent'
import { CHATGPT_LINK_MESSAGE, isStandaloneHttpUrl } from '@/lib/scriptInput'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'
import { MIN_DURATION_ALL_ENGINES } from '@/lib/durationByEngine'
import { nomeDoMotorEscolhido, pedidoDoStudioSimples, type FilmeDaCaixa } from '@/lib/growth/studioSimples'
import { EVENTO_DA_LINHA, LINHA_DO_FILME_GRATIS, filmeGratisNaCaixa } from '@/lib/growth/filmeGratisNaCaixa' // KINEO-CAIXA-GRATIS-VISIVEL-0411
import { temCookieDeSessao } from '@/lib/growth/visitanteEscreveAntes' // KINEO-CAIXA-GRATIS-VISIVEL-0411
import { contaPagaDoSaldo } from '@/lib/create/filmNaMoldura' // KINEO-STUDIO-NA-MOLDURA-ABRE-1011
import { motorGeravel, motoresCandidatos, duracoesDoMotor, flagsDoCorpo, kling4AoVivo, motoresOpcionais, type FlagsDoSeletor, type OpcaoDeMotor } from '@/lib/create/motorOpcional' // KINEO-MOTOR-OPCIONAL-1011
import { rebaseKling4Lease } from '@/lib/kling4PaidPresentation' // KINEO-MOTOR-OPCIONAL-1011 — a mesma leitura do Kling 4.0 que o Studio antigo faz
import { KineoBrandIcon } from '@/components/KineoBolt' // KINEO-CELULAR-A-0611
import { filmSignup, restoreFilm, type FilmEntry } from '@/lib/create/publicEditor'
import { readPastedDirectives } from '@/lib/pastedDirectives'
import { requestFilmProjection } from './requestFilmProjection'
import { suggestedFilmLook, type FilmLook } from '@/lib/cinematic/filmLook2511'
import FilmStylePicker from './FilmStylePicker'
import FilmVoicePicker from './FilmVoicePicker'
import { characterVoiceAvailable } from '@/lib/cinematic/characterVoiceAvailable'
import { filmVoiceEnabled, voiceModeFields, type FilmVoiceMode } from '@/lib/cinematic/filmVoice2511'

const CSS = `
.ksx{max-width:760px;margin:0 auto;padding:clamp(20px,6vh,64px) 16px 48px;color:var(--text)}
.ksx-chips{display:flex;gap:6px;overflow-x:auto;padding:2px;margin:0 0 18px;scrollbar-width:none}
.ksx-chip{flex:none;height:44px;display:inline-flex;align-items:center;padding:0 15px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text2,var(--text));font-size:14px;font-weight:700;text-decoration:none}
.ksx-chip:hover{border-color:var(--text)}
.ksx-chip[aria-current="page"]{background:var(--text);border-color:var(--text);color:var(--bg,#fff)}
.ksx h1{margin:0 0 16px;font-size:clamp(26px,5vw,38px);line-height:1.12;font-weight:800;letter-spacing:-.02em;color:var(--text)}
.ksx-box{border:1.5px solid var(--border2,var(--border));border-radius:20px;background:var(--card);padding:14px;display:flex;flex-direction:column;gap:12px}
.ksx-box:focus-within{border-color:var(--text)}
.ksx-box textarea{width:100%;box-sizing:border-box;border:0;outline:0;resize:vertical;min-height:108px;background:transparent;color:var(--text);font-size:16px;font-weight:600;line-height:1.45;font-family:inherit;padding:2px}
.ksx-box textarea::placeholder{color:var(--muted2,var(--muted))}
.ksx-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ksx-set{height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:700;font-family:inherit;cursor:pointer}
.ksx-set:hover{border-color:var(--text)}
.ksx-set{display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap}
.ksx-set-v{font-weight:600;color:var(--muted2,var(--muted))}
.ksx-go{height:44px;margin-left:auto;padding:0 22px;border-radius:12px;border:0;background:#2997ff;color:#000;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer}
.ksx-go:focus-visible,.ksx-set:focus-visible,.ksx-chip:focus-visible,.ksx-film:focus-visible{outline:2px solid #2997ff;outline-offset:2px}
.ksx-msg{margin:0;font-size:13px;font-weight:600;line-height:1.45;color:#d7263d}
.ksx-films{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:26px}
.ksx-film{position:relative;display:block;width:100%;aspect-ratio:9/14;border:0;padding:0;border-radius:14px;overflow:hidden;background:var(--card2,var(--card));cursor:pointer;text-align:left}
.ksx-film img{width:100%;height:100%;object-fit:cover;display:block}
.ksx-film span{position:absolute;left:0;right:0;bottom:0;padding:26px 9px 9px;background:linear-gradient(transparent,rgba(0,0,0,.78));color:#fff;font-size:12px;font-weight:700;line-height:1.3}
.ksx-hint{margin:10px 0 0;font-size:13px;font-weight:600;color:var(--muted2,var(--muted))}
.ksx-gratis{margin:10px 2px 0;font-size:13px;font-weight:600;color:var(--muted2,var(--muted))}
.ksx-dim{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:80;display:flex;align-items:flex-end;justify-content:center}
.ksx-sheet{width:100%;max-width:520px;max-height:90vh;overflow:auto;box-sizing:border-box;background:var(--card);color:var(--text);border-radius:22px 22px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:16px}
.ksx-sheet h2{margin:0;font-size:19px;font-weight:800;color:var(--text)}
.ksx-lab{display:block;margin:0 0 8px;font-size:12px;font-weight:700;color:var(--muted2,var(--muted))}
.ksx-opts{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:6px}
.ksx-opt{height:44px;border-radius:11px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:700;font-family:inherit;cursor:pointer}
.ksx-opt[aria-pressed="true"]{background:var(--text);border-color:var(--text);color:var(--bg,#fff)}
.ksx-sel{width:100%;height:44px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:14px;font-weight:600;font-family:inherit;padding:0 10px}
.ksx-check{display:flex;gap:10px;align-items:center;min-height:44px;font-size:14px;font-weight:600;color:var(--text)}
.ksx-check input{width:20px;height:20px;flex:none}
.ksx-motor{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;font-size:14px;font-weight:700;color:var(--text)}
.ksx-motor a{color:#1f7fe0;font-weight:700;text-decoration:none;white-space:nowrap}
.ksx-done{height:48px;border:0;border-radius:13px;background:#2997ff;color:#000;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer}
@media (min-width:640px){.ksx-dim{align-items:center}.ksx-sheet{border-radius:22px}}
@media (max-width:560px){.ksx-films{grid-template-columns:repeat(2,minmax(0,1fr))}.ksx-go{flex:1 1 110px;margin-left:0;padding:0 12px}.ksx-set{flex:1 1 auto;padding:0 10px}}
.ksx-marca,.ksx-chip img{display:none}
/* KINEO-CELULAR-A-0611 — no celular, marca e caixa primeiro; produtos e filmes depois. */
@media (max-width:767px){
.ksx{display:flex;flex-direction:column;padding-top:clamp(24px,8vh,64px)}
.ksx-marca{display:flex;order:1;align-items:center;justify-content:center;gap:9px;margin:0 0 18px;font-size:27px;font-weight:800;letter-spacing:-.02em;color:var(--text)}
.ksx h1{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;margin:0}
.ksx-box{order:2}
.ksx-gratis{order:3}
.ksx-chips{order:4;margin:18px 0 0;overflow:visible;gap:8px;padding:0}
.ksx-chip{position:relative;flex:1 1 0;min-width:0;height:auto;aspect-ratio:4/5;align-items:flex-end;padding:8px;overflow:hidden;color:#fff;font-size:13px;text-shadow:0 1px 5px rgba(0,0,0,.85);border-radius:14px}
.ksx-chip img{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ksx-chip b{position:relative;font-weight:800}
.ksx-chip[aria-current="page"]{background:var(--card);color:#fff;border:2px solid #2997ff}
.ksx-films{order:5}
.ksx-hint{order:6}
.ksx-row{flex-wrap:nowrap;justify-content:space-between}
.ksx-set{flex:0 1 auto;border-radius:999px}
.ksx-go{flex:none;width:44px;margin-left:0;padding:0;border-radius:50%;font-size:0}
.ksx-go::before{content:"↑";font-size:20px;line-height:1}
}
@media (prefers-reduced-motion:no-preference){.ksx-sheet{animation:ksx-up .18s ease-out}@keyframes ksx-up{from{transform:translateY(16px);opacity:.6}to{transform:none;opacity:1}}}
`

const DURACOES = [15, 35, 60, 90] as const
const FORMATOS = ['9:16', '16:9', '1:1', '4:5'] as const
const PRODUTOS: ReadonlyArray<{ rotulo: string; href: string | null; img: string }> = [
  { rotulo: 'Film', href: null, img: '/posters/hero-seedance.webp' },
  { rotulo: 'Ad', href: '/ads/new?utm_source=studio_door', img: '/home-images/perfume-splash.webp' },
  { rotulo: 'Cartoon', href: '/kids-cartoon', img: '/kids-cartoon/leo.webp' },
  { rotulo: 'Clip', href: '/clips', img: '/posters/galeria/knight-cat.webp' },
]

// KINEO-STUDIO-NA-MOLDURA-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"] — o que a moldura nova recebe:
// o estado e os handlers DESTE componente, sem cópia. Gerar, recusas, eventos e o pedido continuam só aqui (gerar()).
export interface CaixaNaMoldura {
  motor: string; texto: string; escrever: (v: string) => void; caixa: RefObject<HTMLTextAreaElement>; aviso: string | null; limiteMax: number
  duracao: number; opcoesDuracao: readonly number[]; setDuracao: (d: number) => void; formato: string; formatos: readonly string[]; setFormato: (f: string) => void
  lingua: string; setLingua: (l: string) => void; palavraPorPalavra: boolean; setPalavraPorPalavra: (v: boolean) => void; maisOpcoes: string; temFilmeGratis: boolean; gerar: () => void
  /** KINEO-STUDIO-NA-MOLDURA-ABRE-1011 — a MESMA leitura de /api/credits que a linha do filme grátis; true só com prova de plano pago. */
  contaPaga: boolean
  /** KINEO-MOTOR-OPCIONAL-1011 — a escolha OPCIONAL de motor (só na moldura). null = ainda não aberta / lendo; [] com estado 'falhou' = só o padrão. */
  motores: OpcaoDeMotor[] | null; motoresEstado: 'fechado' | 'lendo' | 'pronto' | 'falhou'; abrirMotores: () => void; escolherMotor: (k: string) => void
  /** KINEO-MOTOR-OPCIONAL-1011 — a leitura do Kling 4.0 pago (GET /api/kling4-paid/availability), feita junto com as flags; null = não lida. */
  kling4: unknown
  camera: string; setCamera: (value: string) => void; gerarComReferencias: (paths: string[]) => void
  visitor?: boolean; firstFilmFree?: boolean; checkingAccount?: boolean
  filmStylePicker?: ReactNode
  filmVoicePicker?: ReactNode
}

export default function StudioSimples({ entry, filmes, motor: motorDoLink, campanha, ideiaInicial = '', moldura, showFilmStyle = false, initialFilmLook, initialVoiceMode, publicLookEntry = false }:  { entry?: FilmEntry; publicLookEntry?: boolean; filmes: ReadonlyArray<FilmeDaCaixa>; motor: string; campanha: string; ideiaInicial?: string; moldura?: (c: CaixaNaMoldura) => ReactNode; showFilmStyle?: boolean; initialFilmLook?: FilmLook; initialVoiceMode?: FilmVoiceMode }) {
  const router = useRouter()
  const registrar = useMrrStudioFunnel()
  const caixa = useRef<HTMLTextAreaElement>(null)
  const [texto, setTexto] = useState(ideiaInicial) // KINEO-CAIXA-COM-IDEIA-0611 — só preenche; o filme nunca começa sozinho
  const [styleChoice, setStyleChoice] = useState<{ initial: FilmLook; chosen: FilmLook; changed: boolean } | null>(() =>
    initialFilmLook ? { initial: initialFilmLook, chosen: initialFilmLook, changed: false } : null,
  )
  const [camera, setCamera] = useState('')
  const [voiceMode, setVoiceMode] = useState<FilmVoiceMode>(initialVoiceMode ?? 'narrator')
  const [beforeDialogue, setBeforeDialogue] = useState<{
    duration: number; language: string; style: typeof styleChoice; aspect: string; engine: string; voice: FilmVoiceMode
  } | null>(null)
  const [voiceNotice, setVoiceNotice] = useState('')
  function useNarration(reason: string) {
    if (!moldura || voiceMode !== 'characters') return
    setVoiceMode('narrator')
    setBeforeDialogue(null)
    setVoiceNotice(reason)
  }
  const suggestedLook = showFilmStyle ? suggestedFilmLook(texto) : null
  const dialoguePreset = Boolean(moldura && beforeDialogue && voiceMode === 'characters')
  const selectedLook = dialoguePreset ? 'photoreal' : showFilmStyle ? styleChoice?.chosen : undefined
  const look = selectedLook ?? suggestedLook
  const filmStylePicker = showFilmStyle && look && <FilmStylePicker look={look} text={texto} onSelect={next => {
    if (next !== 'photoreal') useNarration('Narrator selected because dialogue needs Realistic.')
    setStyleChoice(choice => ({
      initial: choice?.initial ?? look,
      chosen: next,
      changed: choice?.changed === true || next !== (choice?.chosen ?? look),
    }))
  }} />
  const touched = useRef(Boolean(entry?.resumed))
  const [checkingAccount, setCheckingAccount] = useState(Boolean(entry && !entry.visitor))
  const [duracao, setDuracao] = useState<number>(entry?.duration ?? (entry?.visitor && motorDoLink === 'seedance' && entry.confirmedCountry && !entry.resumed ? 15 : 60))
  const [formato, setFormato] = useState<string>(entry?.aspect ?? '9:16')
  const [lingua, setLingua] = useState<string>(entry?.language ?? 'auto') /* KINEO-ROTEIRO-NA-LINGUA-0411 — sem escolha, o filme fala a língua do texto */
  const voiceAvailable = filmVoiceEnabled() && characterVoiceAvailable(duracao, lingua, texto, selectedLook)
  const effectiveVoice = voiceAvailable ? voiceMode : 'narrator'
  const [palavraPorPalavra, setPalavraPorPalavra] = useState(entry?.verbatim ?? false)
  const [folha, setFolha] = useState(false)
  const [aviso, setAviso] = useState<string | null>(entry?.adjustment || null)
  const [temFilmeGratis, setTemFilmeGratis] = useState(false) // KINEO-CAIXA-GRATIS-VISIVEL-0411 — só com prova do servidor; desconhecido = não mostra
  const [contaPaga, setContaPaga] = useState(false) // KINEO-STUDIO-NA-MOLDURA-ABRE-1011 — só com prova do servidor (contaPagaNaTela); desconhecido = false
  // KINEO-MOTOR-OPCIONAL-1011 [fundador 10/11: "se a pessoa quiser escolher, ela tem que ter essa opção"] — SÓ na moldura: o motor escolhido no
  // passo Details (padrão = o do link). Sem moldura, o motor é o do link, como sempre. As flags do seletor (o MESMO /api/me/credits do Studio
  // antigo) só são lidas quando a pessoa abre a linha do motor: nada a mais na rede para quem não quer escolher.
  const [escolhido, setEscolhido] = useState(motorDoLink)
  const [filmsDelivered, setFilmsDelivered] = useState<number | null>(null)
  const [flags, setFlags] = useState<FlagsDoSeletor | null>(null)
  const [motoresEstado, setMotoresEstado] = useState<'fechado' | 'lendo' | 'pronto' | 'falhou'>('fechado')
  const [kling4, setKling4] = useState<unknown>(null)
  const motor = moldura ? escolhido : motorDoLink
  const nomeMotor = nomeDoMotorEscolhido(motor)
  const opcoesDuracao = moldura ? duracoesDoMotor(motor, kling4AoVivo(kling4)) : motor === 'seedance' ? DURACOES : DURACOES.filter((d) => d >= MIN_DURATION_ALL_ENGINES) // KINEO-MOTOR-OPCIONAL-1011: na moldura, a tabela do servidor
  function selectVoice(next: FilmVoiceMode) {
    touched.current = true
    if (!moldura) { setVoiceMode(next); return }
    if (next === 'narrator') {
      setVoiceMode(next)
      setBeforeDialogue(null)
      setVoiceNotice('Narrator selected.')
      return
    }
    if (dialoguePreset) return
    setBeforeDialogue({ duration: duracao, language: lingua, style: styleChoice, aspect: formato, engine: motor, voice: effectiveVoice })
    setDuracao(15)
    setLingua('en')
    setFormato('9:16')
    setEscolhido('seedance')
    if (showFilmStyle) setStyleChoice({ initial: styleChoice?.initial ?? look ?? 'photoreal', chosen: 'photoreal', changed: look !== 'photoreal' })
    setVoiceMode('characters')
    const extra = [formato !== '9:16' && 'vertical', motor !== 'seedance' && 'Standard engine'].filter(Boolean)
    setVoiceNotice('Dialogue set to 15 s, Realistic and English' + (extra.length ? ' · ' + extra.join(', ') : '') + '.')
  }
  function undoDialogue() {
    if (!beforeDialogue) return
    setDuracao(beforeDialogue.duration)
    setLingua(beforeDialogue.language)
    setFormato(beforeDialogue.aspect)
    setEscolhido(beforeDialogue.engine)
    setStyleChoice(beforeDialogue.style)
    setVoiceMode(beforeDialogue.voice)
    setBeforeDialogue(null)
    setVoiceNotice('Previous settings restored.')
  }
  const filmVoicePicker = filmVoiceEnabled() && <FilmVoicePicker value={voiceMode} onSelect={selectVoice} available={voiceAvailable}
    adjustOnSelect={Boolean(moldura)} notice={voiceNotice} undo={beforeDialogue ? undoDialogue : undefined} />
  const limite = useMemo(() => promptLimitState(texto, analyzePromptMaxChars(palavraPorPalavra ? 'verbatim' : 'ai')), [texto, palavraPorPalavra])

  useEffect(() => { void trackEvent('studio_simple_viewed', { engine: motorDoLink, campaign: campanha }) }, [motorDoLink, campanha]) // KINEO-MOTOR-OPCIONAL-1011: o motor do link (trocar no passo não recarrega nada)

  // KINEO-CAIXA-GRATIS-VISIVEL-0411 — sem cookie de sessão nem pergunta: visitante não vê a linha e não gera 401.
  useEffect(() => {
    if (entry ? entry.visitor : !temCookieDeSessao(document.cookie)) return
    let vivo = true
    void fetch('/api/credits', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && contaPagaDoSaldo(d)) setContaPaga(true) // KINEO-STUDIO-NA-MOLDURA-ABRE-1011 — mesma resposta, nenhuma chamada a mais
        if (vivo && typeof d?.filmsDelivered === 'number') setFilmsDelivered(d.filmsDelivered) // KINEO-MOTOR-OPCIONAL-1011 — o muro do 1º filme, da mesma resposta
        if (!vivo || !filmeGratisNaCaixa(d)) return
        if (entry && !entry.confirmedCountry) return
        setTemFilmeGratis(true)
        if (entry && motorDoLink === 'seedance' && !touched.current) setDuracao(15)
        void trackEvent(EVENTO_DA_LINHA, { engine: motorDoLink, surface: 'studio_simple' })
      })
      .catch(() => { /* leitura que falhou = não mostra */ })
      .finally(() => { if (vivo) setCheckingAccount(false) })
    return () => { vivo = false }
  }, [motorDoLink, entry?.visitor, entry?.confirmedCountry])

  useEffect(() => {
    if (!folha) return
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') setFolha(false) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [folha])

  useEffect(() => {
    if (!entry?.draftId) return
    const saved = restoreFilm(entry.draftId, !entry.visitor)
    if (!saved) { setAviso('This draft has expired or is unavailable in this tab.'); return }
    touched.current = true
    const allowedEngine = (key: string) => motoresCandidatos().includes(key) ? key : 'seedance'
    setEscolhido(allowedEngine(saved.engine))
    setCamera(CAMERA_PRESETS.find(item => item.key === saved.camera)?.key ?? '')
    setTexto(saved.text); setFormato(saved.aspect); setDuracao(saved.duration); setLingua(saved.language)
    setPalavraPorPalavra(saved.verbatim)
    if (showFilmStyle && ['photoreal', 'animated3d', 'anime'].includes(saved.look ?? '') && saved.look) setStyleChoice({ initial: saved.look, chosen: saved.look, changed: false })
    if (saved.dialogue && filmVoiceEnabled()) {
      setVoiceMode('characters')
      const previous = saved.dialogue.look
      const style = showFilmStyle && previous && ['photoreal','animated3d','anime'].includes(previous)
        ? { initial: previous, chosen: previous, changed: false } : null
      setBeforeDialogue({ ...saved.dialogue, style, engine: allowedEngine(saved.dialogue.engine), voice: 'narrator' })
      setVoiceNotice('Dialogue set to 15 s, Realistic and English.')
    }
  }, [entry?.draftId])

  const maisOpcoes = useMemo(() => {
    const q = new URLSearchParams({ avancado: '1', engine: motor, intent_campaign: campanha })
    if (texto.trim() && texto.length < 1500) q.set('prompt', texto)
    if (selectedLook) q.set('look', selectedLook)
    const { voice_mode } = voiceModeFields(effectiveVoice)
    if (voice_mode === 'characters') {
      q.set('duration', String(duracao))
      if (dialoguePreset) q.set('language', 'en')
    }
    if (voice_mode) q.set('voice_mode', voice_mode)
    return `/studio?${q.toString()}`
  }, [motor, campanha, texto, selectedLook, effectiveVoice, duracao, dialoguePreset])

  const requestedDuration = entry && readPastedDirectives(texto, opcoesDuracao).suggestedDuration
  const firstFilmFree = Boolean(entry?.confirmedCountry && (entry.visitor || temFilmeGratis) && duracao === 15 &&
    motor === 'seedance' && !palavraPorPalavra && (!requestedDuration || requestedDuration === 15))
  const verifyingOffer = useRef(false)
  const currentOrder = useRef('')
  const order = JSON.stringify([texto, motor, duracao, formato, lingua, palavraPorPalavra, selectedLook, effectiveVoice, camera])
  currentOrder.current = order
  useEffect(() => () => { currentOrder.current = '' }, [])
  function gerar() { return gerarComReferencias([]) }
  async function gerarComReferencias(paths: string[]) {
    const idea = entry && palavraPorPalavra ? texto : texto.trim()
    const direction = !palavraPorPalavra && CAMERA_PRESETS.find(p => p.key === camera)
    const t = direction ? idea + '\n\n[camera: ' + direction.prompt + ']' : idea
    const recusar = (m: string) => { setAviso(m); caixa.current?.focus() }
    if (!idea.trim()) { caixa.current?.focus(); return }
    if (isStandaloneHttpUrl(idea)) return recusar(CHATGPT_LINK_MESSAGE)
    if (limite.over) return recusar('This text is too long. Shorten it a little and try again.')
    if (direction && promptLimitState(t, limite.max).over) return recusar('Shorten your idea or set camera movement to Automatic.')
    const sexual = decideSexualContentRefusal(t)
    if (sexual.refuse) {
      void trackEvent('sexual_content_refused_client', { version: sexual.version, named_person: sexual.namedPerson, surface: 'studio_simple' })
      return recusar(sexualContentRefusalMessage(sexual.namedPerson))
    }
    if (checkingAccount) return
    if (entry?.visitor) {
      try {
        const next = filmSignup({ text: texto, ...(camera ? { camera } : {}), look: styleChoice?.chosen ?? entry.look, engine: motor, duration: duracao, aspect: formato, language: lingua, verbatim: palavraPorPalavra,
          dialogue: dialoguePreset && beforeDialogue ? { look: beforeDialogue.style?.chosen ?? entry.look, engine: beforeDialogue.engine, duration: beforeDialogue.duration, aspect: beforeDialogue.aspect, language: beforeDialogue.language } : null })
        router.push(next)
      } catch { recusar('Your browser could not save this draft. Allow session storage and try again.') }
      return
    }
    if (entry && !motorGeravel(motor, flags)) {
      if (motoresEstado === 'fechado') {
        setMotoresEstado('lendo')
        void fetch('/api/me/credits', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
          const available = flagsDoCorpo(d, filmsDelivered)
          setFlags(available); setMotoresEstado(available ? 'pronto' : 'falhou')
          setAviso(motorGeravel(motor, available) ? 'Engine available. Press Generate to continue.' : 'This engine is unavailable on your current plan. Choose Standard or check your plan.')
        }).catch(() => { setMotoresEstado('falhou'); setAviso('Could not verify engine access. Choose Standard or reload to try again.') })
        return recusar('Checking engine access…')
      }
      return recusar('This engine needs an eligible plan. Choose Standard or check your plan.')
    }
    if (firstFilmFree) {
      if (verifyingOffer.current) return
      verifyingOffer.current = true
      setCheckingAccount(true)
      try {
        const response = await fetch('/api/credits', { cache: 'no-store', credentials: 'same-origin' })
        if (!response.ok) throw new Error('Credits unavailable')
        if (!filmeGratisNaCaixa(await response.json())) {
          setTemFilmeGratis(false)
          return recusar('The free film is no longer available. Review the credit cost before continuing.')
        }
        if (currentOrder.current !== order) return
      } catch {
        return recusar('Could not confirm your free film. Try again.')
      } finally {
        verifyingOffer.current = false
        setCheckingAccount(false)
      }
    }
    try {
      if (paths.length) sessionStorage.setItem('kineo:studio:estrela:v1', JSON.stringify({ t: Date.now(), engine: motor, duration: duracao, prompt: t, paths, consent: true }))
      else sessionStorage.removeItem('kineo:studio:estrela:v1')
    } catch { if (paths.length) return recusar('Your photo selection could not be saved. Please try again.') }
    setAviso(null)
    registrar('mrr_generate_clicked')
    void trackEvent('studio_simple_generate_clicked', { engine: motor, duration: duracao, aspect: formato, language: lingua, verbatim: palavraPorPalavra, chars: t.length, page_idea_kept: ideiaInicial !== '' && t === ideiaInicial.trim() })
    if (look) {
      void trackEvent('studio_film_style_submitted', { initial_look: styleChoice?.initial ?? look, chosen_look: selectedLook ?? null, changed: styleChoice?.changed ?? false })
    }
    try { sessionStorage.setItem('kineo:studio:go:v1', JSON.stringify({ t: Date.now(), engine: motor, prompt: t, language: lingua === 'auto' ? 'en' : lingua })) } catch {}
    router.push(pedidoDoStudioSimples({ motor, texto: t, duracao, formato, lingua, palavraPorPalavra, campanha, publicFilm: Boolean(entry) || publicLookEntry, ...(selectedLook ? { look: selectedLook } : {}), ...(filmVoiceEnabled() ? { voiceMode: effectiveVoice } : {}) }))
  }

  // KINEO-STUDIO-NA-MOLDURA-1011 — com a moldura (só /create/film, interruptor CREATE_FILM_INPLACE), troca SÓ o desenho; sem ela, nada muda.
  if (moldura) {
    const escrever = (v: string) => { setTexto(v); setAviso(entry?.adjustment || null); if (v.trim()) registrar('mrr_idea_entered') } // o mesmo onChange da caixa abaixo
    // KINEO-MOTOR-OPCIONAL-1011 — abrir a linha lê as flags uma vez; falhou = só o padrão (falha fechada, como o picker do Studio).
    const abrirMotores = () => {
      if (entry?.visitor) { setMotoresEstado('falhou'); return }
      if (motoresEstado !== 'fechado') return
      setMotoresEstado('lendo')
      void fetch('/api/me/credits', { cache: 'no-store', credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { const f = flagsDoCorpo(d, filmsDelivered); setFlags(f); setMotoresEstado(f ? 'pronto' : 'falhou') })
        .catch(() => setMotoresEstado('falhou'))
      void fetch('/api/kling4-paid/availability', { cache: 'no-store', credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setKling4(rebaseKling4Lease(d, Date.now())))
        .catch(() => setKling4(null))
    }
    const motores = motoresEstado === 'pronto' && flags ? motoresOpcionais(flags) : motoresEstado === 'falhou' ? [] : null
    // Só escolhe o que a régua deixa livre (o padrão sempre); trancado e pausado nunca viram o motor do pedido.
    const escolherMotor = (k: string) => {
      const livre = k === 'seedance' || (!entry && k === motorDoLink) || (motores ?? []).some((o) => o.key === k && o.estado === 'livre')
      if (!livre) return
      touched.current = true
      if (k !== 'seedance') useNarration('Narrator selected because dialogue uses the Standard engine.')
      setEscolhido(k)
      const opcoes = duracoesDoMotor(k, kling4AoVivo(kling4))
      if (!opcoes.includes(duracao)) setDuracao(opcoes.find((d) => d >= duracao) ?? opcoes[opcoes.length - 1])
      void trackEvent('create_engine_chosen', { engine: k, from: motor })
    }

    return <>{moldura({ camera, setCamera, gerarComReferencias, ...(entry ? { visitor: entry.visitor, firstFilmFree, checkingAccount } : {}), motor, texto, escrever, caixa, aviso, limiteMax: limite.max, duracao, opcoesDuracao,
      setDuracao: d => { touched.current = true; if (d !== 15) useNarration('Narrator selected because dialogue needs 15 s.'); setDuracao(d) },
      formato, formatos: FORMATOS, setFormato: f => { touched.current = true; if (f !== '9:16') useNarration('Narrator selected because dialogue needs vertical video.'); setFormato(f) },
      lingua, setLingua: l => { touched.current = true; if (l !== 'en') useNarration('Narrator selected because dialogue needs English.'); setLingua(l) },
      palavraPorPalavra, setPalavraPorPalavra: v => { touched.current = true; setPalavraPorPalavra(v) }, maisOpcoes, temFilmeGratis: entry ? false : temFilmeGratis, gerar, contaPaga, motores, motoresEstado, abrirMotores, escolherMotor, kling4, filmStylePicker, ...(filmVoicePicker ? { filmVoicePicker } : {}) })}</>
  }

  return (
    <div className="ksx" data-testid="studio-simples">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ksx-chips" aria-label="What to make">
        {PRODUTOS.map((p) => p.href
          ? <a key={p.rotulo} className="ksx-chip" href={p.href} data-kineo={`studio-simple-${p.rotulo.toLowerCase()}`}><img src={p.img} alt="" loading="lazy" /><b>{p.rotulo}</b></a>
          : <span key={p.rotulo} className="ksx-chip" aria-current="page"><img src={p.img} alt="" loading="lazy" /><b>{p.rotulo}</b></span>)}
      </nav>
      <span className="ksx-marca" aria-hidden="true"><KineoBrandIcon size={30} />Kineo</span>{/* KINEO-CELULAR-A-0611 */}
      <h1>What&apos;s your film about?</h1>
      <div className="ksx-box">
        <textarea
          ref={caixa}
          value={texto}
          rows={4}
          aria-label="Your idea"
          placeholder="One idea is enough. A finished film comes out: voiced, scored and captioned."
          onChange={(e) => {
            setTexto(e.target.value); setAviso(null); if (e.target.value.trim()) registrar('mrr_idea_entered')
            if (process.env.NEXT_PUBLIC_KINEO_STUDIO_FILM_3D === 'true') requestFilmProjection(e.currentTarget)
          }}
        />
        {filmStylePicker}
        {filmVoicePicker}
        {aviso ? <p className="ksx-msg" role="alert">{aviso}</p> : null}
        <div className="ksx-row">
          <button type="button" className="ksx-set" data-testid="studio-simple-settings" aria-haspopup="dialog" onClick={() => setFolha(true)}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" aria-hidden="true"><path d="M2 4h7M13 4h1M2 12h1M7 12h7"></path><circle cx="11" cy="4" r="2"></circle><circle cx="5" cy="12" r="2"></circle></svg>Settings<span className="ksx-set-v">{duracao} s · {formato}</span></button>
          <button type="button" className="ksx-go" data-testid="studio-simple-generate" aria-label="Generate" onClick={gerar}>Generate</button>
        </div>
      </div>
      {temFilmeGratis ? <p className="ksx-gratis" data-testid="studio-free-film-line">{LINHA_DO_FILME_GRATIS}</p> : null}
      {filmes.length > 0 ? (
        <>
          <div className="ksx-films">
            {filmes.map((f, i) => (
              <button key={f.id} type="button" className="ksx-film" data-kineo="studio-simple-film" onClick={() => { setTexto(f.ideia ?? f.title); setAviso(null); registrar('mrr_idea_entered'); void trackEvent('studio_best_film_clicked', { film_id: f.id, engine: f.engine, position: i + 1, surface: 'studio_simple' }); caixa.current?.focus() }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.poster} alt="" loading={i < 4 ? 'eager' : 'lazy'} />
                <span>{f.title}</span>
              </button>
            ))}
          </div>
          <p className="ksx-hint">Tap a film to start from its idea.</p>
        </>
      ) : null}
      {folha ? (
        <div className="ksx-dim" onClick={(e) => { if (e.target === e.currentTarget) setFolha(false) }}>
          <div className="ksx-sheet" role="dialog" aria-modal="true" aria-label="Settings">
            <h2>Settings</h2>
            <div><span className="ksx-lab">Length</span><div className="ksx-opts">{opcoesDuracao.map((d) => <button key={d} type="button" className="ksx-opt" aria-pressed={duracao === d} onClick={() => setDuracao(d)}>{d} s</button>)}</div></div>
            <div><span className="ksx-lab">Format</span><div className="ksx-opts">{FORMATOS.map((f) => <button key={f} type="button" className="ksx-opt" aria-pressed={formato === f} onClick={() => setFormato(f)}>{f}</button>)}</div></div>
            <div><label className="ksx-lab" htmlFor="ksx-lingua">Narration</label><select id="ksx-lingua" className="ksx-sel" value={lingua} onChange={(e) => setLingua(e.target.value)}><option value="auto">Same as my text</option>{NARRATION_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}</select></div>
            <label className="ksx-check"><input type="checkbox" checked={palavraPorPalavra} onChange={(e) => setPalavraPorPalavra(e.target.checked)} />Narrate my text word for word</label>
            <div className="ksx-motor"><span>{nomeMotor ? `Engine: ${nomeMotor}` : 'Engine: Auto'}</span><a href={maisOpcoes} data-kineo="studio-simple-more">More options</a></div>
            <button type="button" className="ksx-done" onClick={() => setFolha(false)}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
