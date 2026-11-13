'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  AFFILIATE_LANDING_CONTEXT_VARIANT,
  type AffiliateLandingContextCopy,
} from '@/lib/growth/affiliateLandingContext'
import styles from './AffiliateLandingContext.module.css'

// KINEO-POUSO-AFILIADO-CELULAR-1311 [dono 13/11 16:16, "sim": "Eu poria um vídeo e a caixa de escrever a ideia logo no
// começo"] — 120 a 165 pessoas por dia caíam aqui pelo link do parceiro, quase todas no celular, e a 1ª caixa de texto
// ficava a ~2.285 px do topo: 14 de 544 chegaram ao Studio. Agora o bloco do parceiro traz uma prévia muda de um clipe
// já público (pôster primeiro, toca sozinha, nunca gera nada) e a linha do que é grátis NO PAÍS de quem chega; a página
// põe o formulário logo abaixo. Tudo opcional: as outras páginas que usam este bloco seguem iguais.
export interface AffiliateLandingPreview {
  poster: string
  video: string
  alt: string
}

interface Props {
  context: AffiliateLandingContextCopy | null
  targetId: string
  preview?: AffiliateLandingPreview | null
  offerLine?: string | null
  country?: string | null
}

export default function AffiliateLandingContext({ context, targetId, preview = null, offerLine = null, country = null }: Props) {
  useEffect(() => {
    if (!context) return
    const eventKey = `${AFFILIATE_LANDING_CONTEXT_VARIANT}:${context.destination}:viewed`
    try {
      if (sessionStorage.getItem(eventKey) === '1') return
      sessionStorage.setItem(eventKey, '1')
    } catch {
      // Privacy modes may disable storage. Measurement must never hide the card.
    }
    void trackEvent('affiliate_landing_context_viewed', {
      variant: AFFILIATE_LANDING_CONTEXT_VARIANT,
      destination: context.destination,
      // KINEO-POUSO-AFILIADO-CELULAR-1311 — o evento não guardava país; sem ele não dava para saber a quem prometer o grátis.
      country: country ?? null,
      inline_form: Boolean(preview),
    })
  }, [context, country, preview])

  if (!context) return null

  return (
    <aside className={styles.card} aria-label="Partner recommendation">
      <div className={styles.layout}>
        <div className={preview ? styles.lead : undefined}>
          {preview && (
            <video
              className={styles.preview}
              src={preview.video}
              poster={preview.poster}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              aria-label={preview.alt}
            />
          )}
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{context.eyebrow}</p>
            <h2 className={styles.heading}>{context.heading}</h2>
            <p className={styles.body}>{context.body}</p>
            {offerLine && <p className={styles.offer}>{offerLine}</p>}
          </div>
        </div>
        <a
          className={styles.action}
          href={`#${targetId}`}
          onClick={() => {
            void trackEvent('affiliate_landing_context_clicked', {
              variant: AFFILIATE_LANDING_CONTEXT_VARIANT,
              destination: context.destination,
              country: country ?? null,
            })
          }}
        >
          {context.action} ↓
        </a>
      </div>
    </aside>
  )
}
