'use client'

// KINEO-SPRINT-12H-2026-07-29 — "YOUR NEXT 3 SHORTS"
//
// Rendered on the success screen, directly under the finished video, ABOVE the
// upsell. Placement is the point: production counts taken on 2026-07-29 show
// 173 of 212 activated users (82%) finished exactly one video and never
// returned. The only forward action on this screen was "Generate Another
// Short", which resets to an empty textarea — it asks the user to do the one
// job Kineo does not do for them, at the exact moment they are most likely to
// leave.
//
// Three named episodes, one tap each, turn "make another one" from a blank page
// into a choice. A channel is a series, not a pile of one-offs, and this is the
// only place in the product that says so.
//
// FAILS INVISIBLY BY DESIGN. /api/next-shorts always answers 200 with
// {ideas: []} — no auth, no key, bad JSON, timeout, all of it. When the list is
// empty this component renders null. The success screen must never show an
// error: the user already has the video they spent a credit on.
//
// SPRINT-V1V4 #7 (2026-08-31) — THE CALL TO ACTION WAS INVISIBLE.
// Measured in production: 674 shows to 420 distinct external people since
// 2026-07-30, against 15 picks by 11 people — a 2.6% pick rate per exposed
// person, and ZERO picks in the twelve days from 2026-08-19 to 2026-08-31
// (81 people exposed in that window). For comparison, the /history milestone
// block converts 6 of 23 exposed people (26%) with a tenth of the audience.
// The difference is not the audience and it is not the ideas — it is the
// affordance. Every other "next episode" surface in this product is an
// explicitly labelled button with an arrow. These three cards were unlabelled
// boxes whose ONLY clickability signal was an onMouseEnter border colour,
// which does not exist on a touchscreen. This round gives each card a
// permanently visible "Make this one →" action row and instruments the
// telemetry with is_touch / viewport_w so the next round can prove or bury
// the touch hypothesis instead of guessing.

//
// SPRINT-V1V4 #16 (2026-08-31) — THE BEST-CONVERTING IDEA SOURCE IN THE PRODUCT
// WAS NEVER OFFERED AT THE PEAK MOMENT.
// Measured in production over 30 days, external people only:
//   /viral-now seen ......... 124 people
//   a topic tapped ..........  44 people  (35% of everyone exposed)
//   pressed Generate <2h ....  24 people  (55% of the tappers)
//   got a video <2h .........  20 people  (45% of the tappers)
// Against this same screen: 15 picks from 420 exposed people, 2.6%. The
// trending shelf converts THIRTEEN TIMES better and it lives behind a nav
// link, where only 22 of the one-video cohort ever found it.
// The two offers are not competitors, they answer different questions.
// The three cards above continue the film she just made; the shelf below
// answers "I do not want more of that one, what should I make instead?".
// Until this round the success screen only ever asked the first question.
//
// Second thing this round fixes: when /api/next-shorts answers with an empty
// list this component used to render nothing at all, so the single most-seen
// post-video surface in the product simply vanished. The shelf is served by
// /api/viral-now, which is deterministic, free, has no model call and no
// database read, so it can hold the screen up on its own.

//
// SPRINT-V1V4 #19 (2026-08-31) — MOSTRADO NAO E VISTO, E NINGUEM ROLA ATE AQUI.
// Medido em producao, 7 dias, so pessoas externas:
//   video_ready_viewed ....... 67 pessoas
//   next_shorts_shown ........ 64 pessoas
//   video_download_clicked ... 33 pessoas
//   next_shorts_picked ........ 0 pessoas   <- ZERO. Em sete dias.
// A rodada #7 culpou a afordancia e deu botao com seta a cada card. Nao mudou
// nada. A #16 culpou a fonte das ideias e trouxe a prateleira de temas em alta.
// Nao mudou nada. Sobrou a hipotese que nenhuma das duas testou: a pessoa
// nunca chega aqui com os olhos. Este card mora ABAIXO do player, das
// estatisticas, das duas dicas e do ShortPackageSection inteiro (titulo, hook,
// script, plano de cenas, legenda, hashtags, CTA) — mais de mil pixels de
// texto no celular. E `next_shorts_shown` sempre foi disparado no fim do
// FETCH, nao na hora de aparecer: ele significa "carregou", nunca significou
// "foi vista". Contamos 64 exibicoes que talvez nunca tenham existido.
//
// Duas coisas mudam aqui, e so estas duas:
//  (a) VERDADE: um IntersectionObserver dispara `next_shorts_in_view` UMA vez,
//      quando o card entra de fato na tela. A partir do proximo deploy o
//      denominador de conversao desta secao passa a ser real.
//  (b) CONVITE NA HORA CERTA: a unica acao que essa tela conquista e o
//      download (33 de 67). Quando o arquivo termina de baixar, o modulo de
//      download anuncia (lib/postVideoSignal.ts) e este card vem ate a pessoa
//      — rola sozinho ate ficar visivel e troca a chamada para o unico momento
//      em que a frase e verdadeira: "arquivo salvo; o episodio 2 ja esta
//      escrito". Nada e gerado, nada e cobrado: o toque continua so
//      preenchendo o compositor.
//
// Fronteira: zero linha em GenerateClient.tsx (zona compartilhada com o
// Codex). A ponte entre download e prateleira e um CustomEvent no window.

import { useEffect, useRef, useState } from 'react'
import { ouvirVideoEntregue } from '@/lib/postVideoSignal'

/**
 * Reads the pointing device without ever touching user data. Both fields exist
 * only so the next round can answer one question with a query instead of an
 * opinion: do the people who see these cards have a mouse at all? Guarded for
 * SSR and for browsers that lack matchMedia; never throws, because a telemetry
 * helper must not be able to break the success screen.
 */
function ambienteDePonteiro(): { is_touch: boolean; viewport_w: number } {
  try {
    if (typeof window === 'undefined') return { is_touch: false, viewport_w: 0 }
    const semHover =
      typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches
    const temToque =
      (typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0) ||
      'ontouchstart' in window
    const largura = Math.round(Number(window.innerWidth) || 0)
    return {
      is_touch: Boolean(semHover || temToque),
      viewport_w: largura > 0 && largura < 20000 ? largura : 0,
    }
  } catch {
    return { is_touch: false, viewport_w: 0 }
  }
}

export interface NextShortIdea {
  title: string
  prompt: string
  angle: string
}

/**
 * The shelf item. Deliberately a LOCAL, narrow shape instead of importing
 * ViralTopic: this file must not pull lib/viralTopics into the success-screen
 * bundle (it carries the full script of every topic in the pool), and the
 * screen only ever needs these six fields. Everything is treated as untrusted
 * and clamped at render time.
 */
export interface TrendingTopic {
  id: string
  emoji: string
  label: string
  title: string
  hook: string
  prompt: string
  vertical: string
  badge: string
}

/** Keeps a value printable and bounded before it reaches the DOM or telemetry. */
function textoSeguro(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  const limpo = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  return limpo.length > max ? limpo.slice(0, max) : limpo
}

/**
 * Turns the /api/viral-now payload into shelf items. A topic without a title
 * or without a prompt is dropped rather than rendered empty: a card that puts
 * an empty composer in front of someone at her peak moment is worse than no
 * card. Never throws, for the same reason the whole component fails invisibly.
 */
export function lerTemasEmAlta(payload: unknown, quantos: number): TrendingTopic[] {
  try {
    const lista = (payload as { topics?: unknown })?.topics
    if (!Array.isArray(lista)) return []
    const saida: TrendingTopic[] = []
    for (const cru of lista) {
      if (saida.length >= quantos) break
      const t = cru as Record<string, unknown>
      const title = textoSeguro(t?.title, 90)
      const prompt = typeof t?.prompt === 'string' ? t.prompt : ''
      if (!title || prompt.trim().length < 40) continue
      saida.push({
        id: textoSeguro(t?.id, 64),
        emoji: textoSeguro(t?.emoji, 4),
        label: textoSeguro(t?.label, 40),
        title,
        hook: textoSeguro(t?.hook, 150),
        prompt,
        vertical: textoSeguro(t?.vertical, 40),
        badge: textoSeguro(t?.badge, 24),
      })
    }
    return saida
  } catch {
    return []
  }
}

interface Props {
  /** The topic/script of the Short that just finished. */
  topic: string
  title: string
  niche: string
  hook: string
  /**
   * Loads the chosen idea into the composer and returns the user to the top of
   * the flow. The parent owns the reset because only it can clear the render
   * state machine safely.
   */
  onPick: (idea: NextShortIdea) => void
  /** Fire-and-forget telemetry; the parent supplies the app's tracker. */
  onEvent?: (name: string, meta?: Record<string, unknown>) => void
}

export default function NextShortsSection({ topic, title, niche, hook, onPick, onEvent }: Props) {
  const [ideas, setIdeas] = useState<NextShortIdea[]>([])
  const [trending, setTrending] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  // #19 — verdadeiro quando o arquivo terminou de baixar. So muda o texto da
  // chamada e o realce da borda; nunca gera, nunca cobra, nunca troca as
  // ideias que ja estao na tela (trocar card debaixo do dedo e o defeito que o
  // `requestedRef` existe para evitar).
  const [chamou, setChamou] = useState(false)
  const secaoRef = useRef<HTMLDivElement | null>(null)
  // Instante em que os dados chegaram. Serve para medir quanto tempo passa
  // entre "carregou" e "foi vista" — se a distancia for grande, a cura da
  // proxima rodada e posicao, nao texto.
  const carregouEmRef = useRef<number>(0)
  const jaContouVisivelRef = useRef(false)
  const jaChamouRef = useRef(false)
  // One fetch per finished render. The generate screen is force-dynamic and
  // re-renders often; without this guard a remount would re-bill the model and
  // — worse — swap the cards out from under a user mid-click.
  const requestedRef = useRef(false)

  useEffect(() => {
    if (requestedRef.current) return
    requestedRef.current = true
    let cancelled = false
    ;(async () => {
      // The two requests are independent ON PURPOSE. The personalised ideas
      // call a model and can be slow, empty or broken; the shelf is a static
      // rotation and never is. Chaining them would let the fragile one take
      // the reliable one down with it, which is exactly the failure this
      // round is here to end. Promise.allSettled, never Promise.all.
      const [pessoais, emAlta] = await Promise.allSettled([
        (async () => {
          const res = await fetch('/api/next-shorts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, title, niche, hook }),
          })
          const data = (await res.json()) as { ideas?: NextShortIdea[] }
          return Array.isArray(data.ideas) ? data.ideas.slice(0, 3) : []
        })(),
        (async () => {
          const res = await fetch('/api/viral-now', { method: 'GET' })
          return lerTemasEmAlta(await res.json(), 3)
        })(),
      ])
      if (cancelled) return
      const list = pessoais.status === 'fulfilled' ? pessoais.value : []
      const shelf = emAlta.status === 'fulfilled' ? emAlta.value : []
      setIdeas(list)
      setTrending(shelf)
      carregouEmRef.current = Date.now()
      if (list.length > 0) onEvent?.('next_shorts_shown', { count: list.length, ...ambienteDePonteiro() })
      if (shelf.length > 0) {
        onEvent?.('next_shorts_trending_shown', {
          count: shelf.length,
          // Records whether the personalised half was there at all, so the
          // next round can read the shelf's pick rate separately for the
          // screens where it was the only thing on offer.
          had_personal: list.length > 0,
          ...ambienteDePonteiro(),
        })
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── #19 (a) A VERDADE SOBRE "MOSTRADO" ──────────────────────────────────
  // `next_shorts_shown` sempre significou "o fetch voltou". Este observador e
  // a primeira vez que o produto sabe se o card apareceu na tela de alguem.
  // Dispara UMA vez por render e desliga-se sozinho: o objetivo e o
  // denominador, nao um fluxo de eventos.
  useEffect(() => {
    if (loading) return
    const alvo = secaoRef.current
    if (!alvo) return
    if (typeof IntersectionObserver !== 'function') return
    let observer: IntersectionObserver | null = null
    try {
      observer = new IntersectionObserver(
        (entradas) => {
          for (const entrada of entradas) {
            if (!entrada.isIntersecting) continue
            if (jaContouVisivelRef.current) continue
            jaContouVisivelRef.current = true
            const desde = carregouEmRef.current
            onEvent?.('next_shorts_in_view', {
              // Segundos entre carregar e ser vista. 0 quando ja nasceu
              // visivel; alto quando a pessoa teve de rolar ate aqui.
              secs_since_shown: desde > 0 ? Math.round((Date.now() - desde) / 1000) : 0,
              ...ambienteDePonteiro(),
            })
            try {
              observer?.disconnect()
            } catch {
              /* ignore */
            }
          }
        },
        // Metade do card dentro da tela. Um pixel raspando o rodape nao e
        // "vista" — seria repetir a mentira que esta rodada veio desfazer.
        { threshold: 0.5 },
      )
      observer.observe(alvo)
    } catch {
      /* um observador que nao nasce nao pode derrubar a tela de sucesso */
    }
    return () => {
      try {
        observer?.disconnect()
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // ── #19 (b) O CONVITE VAI ATE ELA ───────────────────────────────────────
  // O download e a unica acao conquistada nesta tela. Quando ele termina, a
  // pessoa esta com o resultado na mao e sem proximo passo — e este card, que
  // e o proximo passo, esta a mil pixels dali. Ele vem.
  useEffect(() => {
    return ouvirVideoEntregue((detalhe) => {
      if (jaChamouRef.current) return
      jaChamouRef.current = true
      setChamou(true)
      onEvent?.('next_shorts_summoned', {
        source: 'download',
        method: detalhe.method,
        // Ja estava na tela quando o arquivo caiu? Se sim, o convite so trocou
        // de texto; se nao, ele tambem trouxe a pessoa ate aqui.
        was_in_view: jaContouVisivelRef.current,
        ...ambienteDePonteiro(),
      })
      // Rolagem suave e no proximo quadro: o navegador ainda esta terminando o
      // salvamento do arquivo e a barra de download pode reposicionar a pagina.
      try {
        window.requestAnimationFrame(() => {
          try {
            secaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          } catch {
            /* ignore */
          }
        })
      } catch {
        /* ignore */
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nothing to show and nothing to apologise for. The bar moved this round:
  // it now takes BOTH sources coming back empty for the screen to go quiet.
  // Before, one flaky model call was enough to erase the most-seen post-video
  // surface in the product.
  if (!loading && ideas.length === 0 && trending.length === 0) return null

  return (
    <div
      ref={secaoRef}
      className="gv-card rounded-2xl p-5 mb-6"
      style={{
        // #19 — depois do download o card acende. E o unico realce da tela
        // naquele instante, e ele dura o resto da sessao de proposito: piscar
        // e voltar ao normal deixaria a pessoa achando que perdeu alguma coisa.
        background: chamou ? 'rgba(41,151,255,.12)' : 'rgba(41,151,255,.06)',
        border: chamou ? '1px solid rgba(41,151,255,.60)' : '1px solid rgba(41,151,255,.25)',
        boxShadow: chamou ? '0 0 0 3px rgba(41,151,255,.12)' : 'none',
        transition: 'background .35s ease, border-color .35s ease, box-shadow .35s ease',
        scrollMarginTop: 24,
      }}
    >
      {/* #19 — a faixa so existe depois que o arquivo caiu. Antes disso ela
          seria mais uma promessa; depois disso ela e a unica frase da tela que
          descreve o que acabou de acontecer com ela. */}
      {chamou && (
        <div
          className="rounded-xl px-3 py-2 mb-4 text-xs leading-relaxed"
          style={{
            background: 'rgba(41,151,255,.14)',
            border: '1px solid rgba(41,151,255,.35)',
            color: '#9fd2ff',
          }}
        >
          <span style={{ fontWeight: 800, color: '#5cb3ff' }}>Video saved. </span>
          Episode 2 is already written — pick one and it lands in the composer.
          Nothing is generated and nothing is charged until you press Generate.
        </div>
      )}
      {/* The personalised half only claims space when it has something to say.
          It used to own the whole card, so an empty answer meant an empty
          screen. */}
      {(loading || ideas.length > 0) && (
      <>
      <div className="mb-1 flex items-center gap-2">
        <span style={{ fontSize: 18, lineHeight: 1 }}>🗓️</span>
        <div className="text-sm" style={{ color: '#5cb3ff', fontWeight: 700 }}>
          Your next 3 Shorts
        </div>
      </div>
      <div className="text-xs leading-relaxed mb-4" style={{ color: 'var(--muted2)' }}>
        A channel is a series, not a pile of one-offs. These continue the one you just
        made. Tap one and it lands in the composer — you still press Generate.
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.07)',
                minHeight: 104,
                opacity: 0.5,
              }}
            >
              <div
                style={{
                  height: 10,
                  width: '70%',
                  borderRadius: 5,
                  background: 'rgba(255,255,255,.10)',
                  marginBottom: 10,
                }}
              />
              <div
                style={{
                  height: 8,
                  width: '92%',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,.06)',
                  marginBottom: 6,
                }}
              />
              <div
                style={{
                  height: 8,
                  width: '60%',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,.06)',
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {ideas.map((idea, i) => (
            <button
              key={`${i}-${idea.title}`}
              type="button"
              onClick={() => {
                onEvent?.('next_shorts_picked', { index: i, angle: idea.angle, ...ambienteDePonteiro() })
                onPick(idea)
              }}
              className="rounded-xl p-4 text-left transition flex flex-col"
              style={{
                background: 'rgba(255,255,255,.035)',
                // Stronger resting border than the neutral .10 it used to have:
                // on a phone this tint is the ONLY thing saying "this is a
                // control", because there is no hover state to discover.
                border: '1px solid rgba(41,151,255,.30)',
                cursor: 'pointer',
                minHeight: 104,
                width: '100%',
                WebkitTapHighlightColor: 'rgba(41,151,255,.28)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.55)'
                e.currentTarget.style.background = 'rgba(41,151,255,.10)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
                e.currentTarget.style.background = 'rgba(255,255,255,.035)'
              }}
              // Touch has no hover, so it gets its own press feedback. Without
              // this a tap on a phone looks identical to a tap on dead text.
              onTouchStart={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.75)'
                e.currentTarget.style.background = 'rgba(41,151,255,.14)'
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
                e.currentTarget.style.background = 'rgba(255,255,255,.035)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.75)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
              }}
            >
              {idea.angle ? (
                <div
                  className="mb-2 inline-block rounded-full px-2 py-[3px] text-[9px] font-black uppercase"
                  style={{
                    letterSpacing: '.09em',
                    background: 'rgba(41,151,255,.18)',
                    color: '#5cb3ff',
                  }}
                >
                  {idea.angle}
                </div>
              ) : null}
              <div className="font-bold text-[13px] leading-snug mb-1" style={{ color: 'var(--text, #fff)' }}>
                {idea.title}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: 'var(--muted2)' }}>
                {idea.prompt.length > 96 ? `${idea.prompt.slice(0, 96)}…` : idea.prompt}
              </div>
              {/* The whole point of round #7. Every other "next episode" surface
                  in the product carries a named action with an arrow; this one
                  carried none, and it is the one 420 people actually see. The
                  row is permanently visible on purpose — it must not depend on
                  hover, which is exactly what a phone does not have. */}
              <div
                className="mt-3 pt-2 flex items-center gap-1 text-[11px] font-black uppercase"
                style={{
                  marginTop: 'auto',
                  letterSpacing: '.06em',
                  color: '#5cb3ff',
                  borderTop: '1px solid rgba(41,151,255,.16)',
                }}
              >
                Make this one <span aria-hidden="true">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
      </>
      )}

      {/* ── SPRINT-V1V4 #16 — THE TRENDING SHELF ────────────────────────────
          Same affordance rules the #7 round wrote for the cards above: a
          permanently visible labelled action, a resting border that reads as a
          control on a phone, and its own touch and focus feedback. No hover-only
          signal anywhere, because a third of this audience has no pointer.
          The tap only loads the composer. It never starts a render, exactly
          like the cards above, so an accidental tap costs a scroll and nothing
          else. */}
      {trending.length > 0 && (
        <div style={{ marginTop: ideas.length > 0 || loading ? 18 : 0 }}>
          <div className="mb-1 flex items-center gap-2">
            <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
            <div className="text-sm" style={{ color: '#5cb3ff', fontWeight: 700 }}>
              Or make what is trending right now
            </div>
          </div>
          <div className="text-xs leading-relaxed mb-3" style={{ color: 'var(--muted2)' }}>
            Written, structured and ready — you only press Generate. The shelf rotates
            through the day.
          </div>
          <div className="grid gap-2">
            {trending.map((tema, i) => (
              <button
                key={`${tema.id}-${i}`}
                type="button"
                onClick={() => {
                  onEvent?.('next_shorts_trending_picked', {
                    index: i,
                    topic_id: tema.id,
                    vertical: tema.vertical,
                    badge: tema.badge,
                    ...ambienteDePonteiro(),
                  })
                  onPick({ title: tema.title, prompt: tema.prompt, angle: tema.label })
                }}
                className="rounded-xl px-4 py-3 text-left transition flex items-center gap-3"
                style={{
                  background: 'rgba(255,255,255,.035)',
                  border: '1px solid rgba(41,151,255,.30)',
                  cursor: 'pointer',
                  width: '100%',
                  minHeight: 56,
                  WebkitTapHighlightColor: 'rgba(41,151,255,.28)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(41,151,255,.55)'
                  e.currentTarget.style.background = 'rgba(41,151,255,.10)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
                  e.currentTarget.style.background = 'rgba(255,255,255,.035)'
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(41,151,255,.75)'
                  e.currentTarget.style.background = 'rgba(41,151,255,.14)'
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
                  e.currentTarget.style.background = 'rgba(255,255,255,.035)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(41,151,255,.75)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
                  {tema.emoji || '🔥'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    className="block font-bold text-[13px] leading-snug"
                    style={{ color: 'var(--text, #fff)' }}
                  >
                    {tema.title}
                  </span>
                  {tema.hook ? (
                    <span
                      className="block text-[11px] leading-relaxed mt-[2px]"
                      style={{ color: 'var(--muted2)' }}
                    >
                      {tema.hook.length > 88 ? `${tema.hook.slice(0, 88)}…` : tema.hook}
                    </span>
                  ) : null}
                </span>
                <span
                  className="text-[11px] font-black uppercase whitespace-nowrap"
                  style={{ letterSpacing: '.06em', color: '#5cb3ff' }}
                >
                  Make this one <span aria-hidden="true">→</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
