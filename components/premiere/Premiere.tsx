'use client'

// KINEO-ESTREIA-3110 — "a espera vira a estreia" (fundador 31/10: "genérico, padrão… para todos os lugares onde a
// pessoa vai gerar alguma coisa, a mesma UX… não vai ficar só nos filmes").
//
// Por quê (14 dias medidos em 31/10): 263 receberam o vídeo, 167 (59%) saíram da aba durante a espera, 101 (38%)
// baixaram, 4 fizeram o filme seguinte. O produto entrega — a pessoa é que já foi embora.
//
// Três peças, as mesmas em Filme, Clipes, Imagens, Áudio, Ads, Animate, Avatar, Desenho e Espaços:
//   1. <PremiereStage>  a sala ao vivo: um cartão por cena/imagem/variação que vira o resultado real assim que fica
//      pronto, a linha "o que vem agora", barra e tempo honesto;
//   2. <PremiereNotify> "me avise quando ficar pronto": pede a permissão SÓ no clique da pessoa; quem avisa de fato é
//      o useReadyBeacon (título da aba + notificação do sistema), que já existia;
//   3. <PremiereResult> a estreia: o resultado toca sozinho, Download grande, Compartilhar e o "próximo" já sugerido.
//      O próximo só PREENCHE a tela — o crédito sai quando a pessoa confirma lá.
//
// Só tela: nenhum motor, cobrança ou rota muda. Cada tela entrega os dados que o polling dela já recebe.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useReadyBeacon } from '@/components/video/useReadyBeacon'
import s from './premiere.module.css'
import EsperaPerguntas0511 from './EsperaPerguntas0511' // KINEO-PERGUNTAS-NA-ESPERA-0511

export type PremiereSurface =
  | 'film' | 'clip' | 'image' | 'audio' | 'ads' | 'animate' | 'avatar' | 'cartoon' | 'spaces' | 'thumbnail' | 'podcast'
export type PremiereMediaKind = 'video' | 'image' | 'audio'
export type PremiereItemStatus = 'waiting' | 'working' | 'ready' | 'failed'

export interface PremiereItem {
  key: string
  /** "Scene 2", "Image 3", "Variation B". */
  label: string
  status: PremiereItemStatus
  url?: string | null
  /** Quadro de referência antes do resultado (still da cena, foto enviada). */
  posterUrl?: string | null
  kind?: PremiereMediaKind
}

export interface PremiereNext {
  /** "Episode 2 is already written". */
  label: string
  title: string
  hint?: string
  cta: string
  href?: string
  onClick?: () => void
}

const NOUN: Record<PremiereSurface, string> = {
  film: 'film', clip: 'clip', image: 'image', audio: 'audio', ads: 'ad', animate: 'animation',
  avatar: 'video', cartoon: 'cartoon', spaces: 'video', thumbnail: 'thumbnail', podcast: 'video',
}

/** Título da aba quando fica pronto — o mesmo aviso em todas as telas. */
export function usePremiereBeacon(ready: boolean, surface: PremiereSurface) {
  useReadyBeacon(ready, `✓ Your ${NOUN[surface]} is ready`, `Your ${NOUN[surface]} is ready`)
}

function useOnce(fn: () => void, when: boolean) {
  const done = useRef(false)
  useEffect(() => {
    if (!when || done.current) return
    done.current = true
    fn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [when])
}

type Perm = 'unsupported' | 'default' | 'granted' | 'denied'
function readPerm(): Perm {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission as Perm
  } catch { return 'unsupported' }
}

export function PremiereNotify({ surface }: { surface: PremiereSurface }) {
  const [perm, setPerm] = useState<Perm>('unsupported')
  useEffect(() => { setPerm(readPerm()) }, [])
  const noun = NOUN[surface]
  if (perm === 'granted') {
    return <span className={`${s.btn} ${s.btnOn}`} role="status">✓ We&apos;ll ping you when your {noun} is ready</span>
  }
  if (perm === 'unsupported' || perm === 'denied') {
    return <span className={s.foot}>This tab will flash when your {noun} is ready.</span>
  }
  return (
    <button
      type="button"
      className={s.btn}
      onClick={async () => {
        let next: Perm = 'default'
        try { next = (await Notification.requestPermission()) as Perm } catch { next = readPerm() }
        setPerm(next)
        void trackEvent('premiere_notify_opted', { surface, permission: next })
      }}
    >
      <span aria-hidden="true">🔔</span> Ping me when it&apos;s ready
    </button>
  )
}

function ItemTile({ item, kind, failedLabel }: { item: PremiereItem; kind: PremiereMediaKind; failedLabel: string }) {
  const [muted, setMuted] = useState(true)
  const k = item.kind ?? kind
  const cls = item.status === 'ready' ? s.itemReady : item.status === 'working' ? s.itemWorking : item.status === 'failed' ? s.itemFailed : s.itemWaiting
  const dot = item.status === 'ready' ? s.dotReady : item.status === 'working' ? s.dotWorking : item.status === 'failed' ? s.dotFailed : ''
  const word = item.status === 'ready' ? 'ready' : item.status === 'working' ? 'making…' : item.status === 'failed' ? failedLabel : 'next'
  const ready = item.status === 'ready' && item.url
  return (
    <div className={`${s.item} ${cls} ${k === 'audio' ? s.audioItem : ''}`}>
      {ready && k === 'video' ? (
        <video
          src={item.url!}
          poster={item.posterUrl ?? undefined}
          autoPlay
          loop
          muted={muted}
          playsInline
          onClick={() => setMuted((m) => !m)}
          aria-label={`${item.label} — tap for sound`}
        />
      ) : ready && k === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url!} alt={item.label} loading="lazy" />
      ) : ready && k === 'audio' ? (
        <audio src={item.url!} controls preload="none" style={{ width: '100%' }} />
      ) : item.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.poster} src={item.posterUrl} alt="" aria-hidden="true" />
      ) : null}
      {k !== 'audio' && (
        <span className={s.badge} title={`${item.label} · ${word}`}><span className={`${s.dot} ${dot}`} aria-hidden="true" /><span className={s.badgeText}><span className={s.badgeFull}>{item.label}<span className={s.badgeWord}> · {word}</span></span><span className={s.badgeShort}>{item.label.match(/\d+$/)?.[0] ?? item.label}</span></span></span>
      )}
    </div>
  )
}

export function PremiereStage(props: {
  surface: PremiereSurface
  title: string
  kicker?: string
  items: PremiereItem[]
  kind?: PremiereMediaKind
  /** CSS aspect-ratio dos cartões ("9 / 16", "1 / 1", "16 / 9"). */
  ratio?: string
  wide?: boolean
  now?: { label: string; text: string } | null
  /** 0–100; null esconde a barra. */
  progress?: number | null
  /** Ex.: "About 2 min left · you can close this tab". */
  footnote?: string
  notify?: boolean
  /** Palavra do cartão que falhou: "retrying" onde a tela refaz sozinha (Filme), "failed" onde não refaz. */
  failedLabel?: string
  children?: ReactNode
}) {
  const { surface, items, kind = 'video' } = props
  const shownAt = useRef<number>(Date.now())
  const ready = items.filter((i) => i.status === 'ready').length
  const total = items.length
  useOnce(() => { shownAt.current = Date.now(); void trackEvent('premiere_shown', { surface, items: total }) }, true)
  useOnce(() => void trackEvent('premiere_first_reveal', { surface, items: total, seconds: Math.round((Date.now() - shownAt.current) / 1000) }), ready > 0)
  const pct = props.progress == null ? null : Math.max(3, Math.min(100, Math.round(props.progress)))
  return (
    <section className={s.stage} aria-label={`Your ${NOUN[surface]} is being made`} aria-live="polite">
      <div className={s.head}>
        <div style={{ minWidth: 0 }}>
          <p className={s.kicker}>{props.kicker ?? `Your ${NOUN[surface]} is being made`}</p>
          <h2 className={s.title}>{props.title}</h2>
        </div>
        {total > 1 && (
          <span className={`${s.count} ${ready === total ? s.countReady : ''}`}>{ready} of {total} ready</span>
        )}
      </div>
      {total > 0 && (
        // Todas as cenas numa fileira só (até 6; imagens largas até 4) — o cartão que sobra sozinho na 2ª linha parecia esquecido.
        <div
          className={s.grid}
          style={{
            ['--premiere-ratio' as string]: props.ratio ?? '9 / 16',
            gridTemplateColumns: `repeat(${Math.min(total, props.wide ? 4 : 6)}, minmax(0, 1fr))`,
          }}
        >
          {items.map((it) => <ItemTile key={it.key} item={it} kind={kind} failedLabel={props.failedLabel ?? 'retrying'} />)}
        </div>
      )}
      {props.now?.text ? (
        <div className={s.now}>
          <p className={s.nowLabel}>{props.now.label}</p>
          <p className={s.nowText}>{props.now.text}</p>
        </div>
      ) : null}
      {props.children}
      {surface === 'film' ? <EsperaPerguntas0511 /> : null}{/* KINEO-PERGUNTAS-NA-ESPERA-0511 — 1 clique, pulável, só na espera do filme */}
      {props.notify !== false && <div className={s.actions}><PremiereNotify surface={surface} /></div>}
      {pct != null && (
        <div className={s.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className={s.barFill} style={{ width: `${pct}%` }} />
        </div>
      )}
      {props.footnote ? <p className={s.foot}>{props.footnote}</p> : null}
    </section>
  )
}

export function PremiereNextCard({ surface, next }: { surface: PremiereSurface; next: PremiereNext }) {
  const go = () => { void trackEvent('premiere_next_clicked', { surface }); next.onClick?.() }
  return (
    <div className={s.next}>
      <p className={s.nextLabel}>{next.label}</p>
      <p className={s.nextTitle}>{next.title}</p>
      {next.href ? (
        <a className={`${s.btn} ${s.btnAccent}`} href={next.href} onClick={go}>{next.cta}</a>
      ) : (
        <button type="button" className={`${s.btn} ${s.btnAccent}`} onClick={go}>{next.cta}</button>
      )}
      {next.hint ? <p className={s.nextHint}>{next.hint}</p> : null}
    </div>
  )
}

export function PremiereResult(props: {
  surface: PremiereSurface
  kind: PremiereMediaKind
  url: string
  posterUrl?: string | null
  title?: string
  /** "Ready · 61 s". */
  meta?: string
  onDownload?: () => void
  downloadHref?: string
  downloadLabel?: string
  next?: PremiereNext | null
  /** Coisas próprias da tela (variações, legenda, opções) entre o player e o próximo. */
  children?: ReactNode
  autoPlay?: boolean
}) {
  const { surface } = props
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [shared, setShared] = useState(false)
  useOnce(() => void trackEvent('premiere_ready_seen', { surface, kind: props.kind }), true)
  useEffect(() => {
    const v = videoRef.current
    if (!v || props.autoPlay === false) return
    // A estreia começa com som quando o navegador deixa (a pessoa acabou de clicar em gerar); senão, mudo.
    v.muted = false
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
  }, [props.url, props.autoPlay])
  const download = () => {
    void trackEvent('premiere_download_clicked', { surface, kind: props.kind })
    props.onDownload?.()
  }
  const share = async () => {
    void trackEvent('premiere_share_clicked', { surface })
    try {
      // KINEO-REMIX-PAGINAS-3110 — esta estreia compartilha o arquivo (clipe, imagem, áudio não têm página pública /v/);
      // a assinatura vai junto no texto do compartilhamento, para quem recebe saber de onde veio. O filme narrado tem
      // a página pública com "Make your own version" (tela de pronto do /generate → "Create a public watch page").
      if (navigator.share) { await navigator.share({ title: props.title ?? 'Made with Kineo', text: 'Made with Kineo — usekineo.com', url: props.url }); return }
      await navigator.clipboard.writeText(props.url)
      setShared(true)
      setTimeout(() => setShared(false), 2200)
    } catch { /* cancelado pela pessoa */ }
  }
  return (
    <section className={s.result} aria-label="Premiere">
      <div className={s.head}>
        <div style={{ minWidth: 0 }}>
          <p className={s.kicker}>Premiere</p>
          {props.title ? <h2 className={s.title}>{props.title}</h2> : null}
        </div>
        {props.meta ? <span className={`${s.count} ${s.countReady}`}>{props.meta}</span> : null}
      </div>
      <div className={s.screen}>
        {props.kind === 'video' ? (
          <video ref={videoRef} src={props.url} poster={props.posterUrl ?? undefined} controls playsInline loop />
        ) : props.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.url} alt={props.title ?? 'Your image'} />
        ) : (
          <audio src={props.url} controls autoPlay={props.autoPlay !== false} style={{ width: '100%', padding: 12 }} />
        )}
      </div>
      <div className={s.actions}>
        {props.downloadHref ? (
          <a className={`${s.btn} ${s.btnPrimary}`} style={{ flex: 1 }} href={props.downloadHref} download onClick={download}>
            ⬇ {props.downloadLabel ?? 'Download'}
          </a>
        ) : (
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} style={{ flex: 1 }} onClick={download}>
            ⬇ {props.downloadLabel ?? 'Download'}
          </button>
        )}
        <button type="button" className={s.btn} onClick={share}>{shared ? '✓ Link copied' : 'Share'}</button>
      </div>
      {props.children}
      {props.next ? <PremiereNextCard surface={surface} next={props.next} /> : null}
    </section>
  )
}
