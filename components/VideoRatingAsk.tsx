'use client'

// KINEO-RATING-BEFORE-REVIEW-2026-08-04 — substitui <TaaftReviewAsk/> na tela
// de sucesso.
//
// POR QUE O ANTERIOR MORREU (medido hoje, 04/08, 19:20Z):
//   · 124 exibições de `taaft_review_ask_shown` desde 15/07 (20 dias).
//   · `taaft_review_ask_clicked`: ZERO linhas na tabela de eventos. Nenhuma.
//   · A nota do TAAFT continua 3,0 com 2 avaliações — e o TAAFT é ~94% da onda
//     de cadastros, metade dos compradores da história e a fonte que os LLMs
//     leem para responder o que a Kineo é.
//   · O "revive" de 31/07 (soltar o gate de renderCount, reescrever a copy,
//     transformar o link em botão) NÃO moveu o número. Duas revivências, 0
//     cliques: pela regra de morte do fundador, a alavanca está morta e a
//     hipótese ("gates apertados + copy fraca") estava errada.
//
// A CAUSA REAL, em dois números:
//   1. Dos 84 que viram o pedido, 56 (67%) NUNCA baixaram um vídeo. Estávamos
//      pedindo elogio público a quem nem levou o arquivo. Para essa pessoa a
//      resposta honesta é "não", então ela não clica — e ainda queima a cota.
//   2. Mesmo para os 28 que baixaram, o pedido é grande demais para o tamanho
//      da relação: sair do site, ir a um terceiro e ESCREVER um texto público,
//      90 segundos depois de conhecer a ferramenta.
//
// A INVERSÃO: não pedir avaliação. Pedir uma NOTA — um toque, dentro do
// produto, depois que o arquivo já é dela (mesmo princípio do
// KINEO-DELIVER-FIRST: entregar antes de pedir). E aí:
//   · nota >= 4 → aí sim o TAAFT, para quem acabou de dizer que gostou;
//   · nota <= 3 → nada de terceiro. Um toque em "o que faltou?" e pronto.
//
// O que isso compra além da nota do TAAFT: a empresa tem 917 perfis, 322
// ativados e ZERO sinal próprio sobre a qualidade do que entrega. `video_rated`
// é o primeiro. E `video_rating_reason` ataca direto o gargalo gerar→baixar
// (32,8%): passamos a saber POR QUE 78 pessoas viram o vídeo pronto e foram
// embora sem ele.
//
// Padrão da casa (<ReferralMiniCard/>, <TaaftReviewAsk/>): autocontido, degrada
// para null em QUALQUER falha — storage bloqueado, fetch morto, valor
// desconhecido — para nunca quebrar a tela de sucesso.
import { useEffect, useState } from 'react'

// #rw_cont deixa a pessoa direto no formulário de avaliação da nossa página no
// TAAFT — sem caçar, o que mantém a promessa de "30 segundos" honesta.
const TAAFT_REVIEW_URL = 'https://theresanaiforthat.com/ai/kineo/#rw_cont'
const STORAGE_KEY = 'kineo_video_rated'
const MAX_SHOWS = 3

// Motivos em toque único. Vocabulário do usuário, não o nosso: cada um mapeia
// para uma frente de trabalho real (voz→TTS, imagens→b-roll/Pexels, legenda→
// caption layer, genérico→script). "Outro" existe para não empurrar a pessoa
// para uma caixa errada e sujar o dado.
const REASONS: { id: string; label: string }[] = [
  { id: 'footage_mismatch', label: 'Footage didn’t match the script' },
  { id: 'voice', label: 'The voice' },
  { id: 'captions', label: 'The captions' },
  { id: 'generic', label: 'Too generic / not my idea' },
  { id: 'quality', label: 'Video quality' },
  { id: 'other', label: 'Something else' },
]

// Mesmo fire-and-forget do trackEvent do GenerateClient: as duas chaves
// (`event_name` e `name`) para o schema duplo da rota, keepalive para o evento
// sobreviver à aba abrindo, erro engolido para analytics nunca afetar a UI.
function track(name: string, metadata: Record<string, unknown> = {}): void {
  try {
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: name,
        name,
        metadata: { source: 'post_video_success', ...metadata },
        path: typeof window !== 'undefined' ? window.location?.pathname : undefined,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore — tracking nunca pode estourar dentro da tela de sucesso
  }
}

// Flag terminal: a pessoa RESPONDEU (deu nota ou fechou no ×). Falha de storage
// é engolida — o pior caso é um pedido a mais na próxima sessão.
function markAnswered(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

export default function VideoRatingAsk({
  downloaded = false,
  renderCount = 0,
  videoTitle,
}: {
  /** watermarkedDownloadConfirmed do pai. O arquivo já é dela — só então perguntamos. */
  downloaded?: boolean
  renderCount?: number
  videoTitle?: string | null
}) {
  const [visible, setVisible] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [reasonSent, setReasonSent] = useState(false)

  useEffect(() => {
    // GATE 1 — a correção que motiva este componente: só depois do download.
    // 67% dos pedidos antigos iam para quem nunca levou o arquivo.
    if (!downloaded) return
    if (renderCount < 1) return
    if (visible) return
    // GATE 2 — respondido antes, ou já mostrado MAX_SHOWS vezes neste browser.
    // Se o próprio storage estourar (aba anônima / bloqueado), saímos escondidos:
    // sem storage não há como honrar as cotas, então não perguntamos.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === '1') return
      if (raw && !raw.startsWith('shown:')) return // valor desconhecido → seguro
      const shows = raw ? parseInt(raw.replace('shown:', ''), 10) || 0 : 0
      if (shows >= MAX_SHOWS) return
      window.localStorage.setItem(STORAGE_KEY, `shown:${shows + 1}`)
    } catch {
      return
    }
    setVisible(true)
    track('video_rating_shown', { render_count: renderCount })
  }, [downloaded, renderCount, visible])

  if (!visible) return null

  function choose(value: number) {
    setRating(value)
    markAnswered()
    track('video_rated', {
      rating: value,
      render_count: renderCount,
      video_title: videoTitle ?? undefined,
    })
  }

  const happy = rating !== null && rating >= 4

  return (
    <div
      className="relative rounded-2xl px-5 py-4 mt-6 w-full"
      style={{
        maxWidth: 480,
        background: '#131316',
        border: '1px solid var(--border)',
      }}
    >
      {/* × explícito = "não quero responder": grava a flag terminal. */}
      <button
        type="button"
        aria-label="Dismiss rating"
        onClick={() => {
          markAnswered()
          setVisible(false)
          track('video_rating_dismissed', { rated: rating ?? null })
        }}
        className="absolute"
        style={{
          top: 10,
          right: 12,
          background: 'transparent',
          border: 'none',
          color: '#86868b',
          fontSize: '1rem',
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>

      {rating === null && (
        <>
          <div className="text-sm font-black" style={{ color: '#f5f5f7', paddingRight: 24 }}>
            How did this Short turn out?
          </div>
          <p className="text-xs mt-1" style={{ color: '#86868b', lineHeight: 1.5 }}>
            One tap. It tells us what to fix next.
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            {[1, 2, 3, 4, 5].map((n) => {
              const lit = (hover ?? 0) >= n
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  onClick={() => choose(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    // Alvo de toque >= 44px (mobile é onde o produto é usado).
                    padding: '6px 4px',
                    minWidth: 44,
                    minHeight: 44,
                    fontSize: '1.6rem',
                    lineHeight: 1,
                    color: lit ? '#f0b429' : '#3a3a3d',
                    transition: 'color .12s ease, transform .12s ease',
                    transform: lit ? 'scale(1.06)' : 'none',
                  }}
                >
                  ★
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* NOTA ALTA — só agora o TAAFT, e para quem acabou de dizer que gostou.
          O evento mantém o nome histórico `taaft_review_ask_clicked` de
          propósito: a série temporal desde 15/07 continua comparável, e é ela
          que prova (ou mata) esta mudança. */}
      {happy && (
        <>
          <div className="text-sm font-black" style={{ color: '#f5f5f7', paddingRight: 24 }}>
            Thank you — that helps.
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#86868b', lineHeight: 1.55 }}>
            Would you say that where it counts? We&apos;re a tiny team, and our
            listing on There&apos;s An AI For That decides who finds us next.
            Same rating, 30 seconds.
          </p>
          <div className="mt-3">
            <a
              href={TAAFT_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('taaft_review_ask_clicked', { rating })}
              className="inline-block rounded-xl px-4 py-2.5 text-xs font-bold"
              style={{
                background: '#2997ff',
                border: '1px solid #2997ff',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Post my {rating}-star rating &rarr;
            </a>
          </div>
        </>
      )}

      {/* NOTA BAIXA — nenhum pedido a terceiro. Um toque e acabou. O dado que
          volta daqui é o diagnóstico de gerar→baixar que a empresa nunca teve. */}
      {rating !== null && rating <= 3 && (
        <>
          <div className="text-sm font-black" style={{ color: '#f5f5f7', paddingRight: 24 }}>
            {reasonSent ? 'Got it — thank you.' : 'What let it down?'}
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#86868b', lineHeight: 1.55 }}>
            {reasonSent
              ? 'This goes straight into what we fix next. Your credits are untouched — try another idea whenever you want.'
              : 'One tap. No form, no email.'}
          </p>
          {!reasonSent && (
            <div className="flex flex-wrap gap-2 mt-3">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setReasonSent(true)
                    track('video_rating_reason', { rating, reason: r.id })
                  }}
                  className="rounded-lg px-3 py-2 text-xs font-bold"
                  style={{
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(255,255,255,.12)',
                    color: '#d1d1d6',
                    cursor: 'pointer',
                    minHeight: 38,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
