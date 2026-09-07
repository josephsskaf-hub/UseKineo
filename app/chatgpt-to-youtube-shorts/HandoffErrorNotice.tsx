'use client'

// ═══ KINEO-HANDOFF-ERROR-VISIVEL-2026-09-06 — o erro do link deixa de ser mudo ═
//
// /make valida o deep link que um assistente (ChatGPT, Claude, Perplexity,
// Gemini) escreveu e, quando reprova, faz 302 para
// /chatgpt-to-youtube-shorts?handoff_error=<slug>. Até 06/09 NINGUÉM lia o
// parâmetro: a pessoa caía na página de marketing sem uma palavra sobre o que
// aconteceu, e o assistente que montou o link nunca aprendia que errou.
//
// POR QUE ESTE PEDAÇO É CLIENTE, E NÃO O `searchParams` DA PÁGINA: a página é
// `force-static` (SEO/AEO, prerenderizada; no Next 14 o `searchParams` de
// servidor chega VAZIO nesse modo). Tornar a página dinâmica custaria latência
// para todo crawler por causa de um aviso que só existe no caminho de erro.
// Este componente lê a query no navegador, DEPOIS da hidratação, e a página
// continua estática byte a byte. Precedente da casa: ChatGptWelcomeBanner
// (query lida no cliente, evento pelo trackEvent).
//
// O QUE NUNCA ACONTECE AQUI: o valor cru do parâmetro nunca vai para a tela.
// O texto renderizado vem de `messages`, um mapa FECHADO slug→frase montado
// no servidor (app/chatgpt-to-youtube-shorts/page.tsx) com os limites reais
// importados de @/lib/gptHandoff. Slug desconhecido = nada renderizado, nada
// emitido. Este arquivo NÃO importa @/lib/gptHandoff (ele usa node:crypto;
// tsc não vê a fronteira servidor/cliente e a Vercel quebraria no build).
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { trackEvent } from '@/lib/analytics'

/** O nome do parâmetro que app/make/route.ts escreve na URL de volta. */
export const HANDOFF_ERROR_PARAM = 'handoff_error'
/** Um link malformado passa a ser contado — pelo slug, nunca pelo conteúdo da URL. */
export const HANDOFF_ERROR_SHOWN_EVENT = 'gpt_handoff_error_shown'

type HandoffErrorNoticeProps = {
  /** O id da seção de colar roteiro da página (HANDOFF_ID) — a saída normal. */
  handoffId: string
  /** A campanha da página, para o clique de "colar abaixo" contar como os irmãos. */
  campaign: string
  /** Mapa FECHADO slug → frase, montado no servidor. Só o que está aqui é exibido. */
  messages: Readonly<Record<string, string>>
  /** Vocabulário de estilo da própria página (CARD / ACCENT) — sem CSS novo. */
  cardStyle: CSSProperties
  accent: string
}

export default function HandoffErrorNotice({ handoffId, campaign, messages, cardStyle, accent }: HandoffErrorNoticeProps) {
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    let requested: string | null = null
    try {
      requested = new URLSearchParams(window.location.search).get(HANDOFF_ERROR_PARAM)
    } catch {
      requested = null
    }
    if (!requested) return
    // Lista fechada: só um slug que a página conhece vira aviso E evento.
    // Valor inventado na URL não renderiza nada e não infla o contador.
    if (!Object.prototype.hasOwnProperty.call(messages, requested)) return
    setSlug(requested)
    void trackEvent(HANDOFF_ERROR_SHOWN_EVENT, { slug: requested })
  }, [messages])

  if (!slug) return null
  const message = messages[slug]

  return (
    <div role="status" style={{ ...cardStyle, padding: '14px 16px', margin: '0 0 18px' }}>
      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#f5f5f7' }}>{message}</p>
      <OrganicCtaLink
        href={`#${handoffId}`}
        source={campaign}
        placement="handoff_error_notice"
        analyticsEvent="organic_handoff_opened"
        focusTargetId={handoffId}
        style={{ display: 'inline-block', marginTop: 8, color: accent, fontWeight: 700, textDecoration: 'none' }}
      >
        Paste the script below ↓
      </OrganicCtaLink>
    </div>
  )
}
