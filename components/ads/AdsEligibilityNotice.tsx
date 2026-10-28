'use client'
// KINEO-ADS-SIMPLES-2810 — o aviso HONESTO no topo do /ads/v2 para quem entrou sem poder criar de graça (lib/ads/eligibilityPure.ts):
// amostra já usada, região fora da lista, e-mail não confirmado, descartável, teto do dia, amostra pausada ou livro ilegível.
// Nunca é uma parede: a pessoa fica na tela de criação, com a frase, o preço em créditos e o botão dos planos. A página
// (servidor) decide se o mostra; este componente só traduz (a língua da interface mora no navegador). Línguas: en · pt · es
// (lib pura), o resto cai no inglês.
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { adsEligibilityCopy, type AdsEligibilityDecision } from '@/lib/ads/eligibilityPure'

export const ADS_ELIGIBILITY_NOTICE_CSS = `
.adv2-elig{margin:0 0 16px;padding:14px 16px;border:1px solid var(--ads-line,#d9dedb);border-left:4px solid var(--accent,#4062e8);border-radius:14px;background:var(--card,#fff);color:var(--text,#1f2c28);display:grid;gap:6px}
.adv2-elig p{margin:0;line-height:1.5}
.adv2-elig .adv2-elig-t{font-weight:760}
.adv2-elig .adv2-elig-a{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:4px}
.adv2-elig .adv2-elig-a a{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;background:var(--accent,#4062e8);color:#fff;text-decoration:none;font-weight:750;font-size:13px}
.adv2-elig .adv2-elig-a a.ghost{background:transparent;color:var(--text,#1f2c28);border:1px solid var(--ads-line,#d9dedb)}
`

export default function AdsEligibilityNotice({ decision, credits, resetIso, sampleOrderId }: { decision: AdsEligibilityDecision; credits: number; resetIso?: string | null; sampleOrderId?: string | null }) {
  const language = useInterfaceLanguage()
  const c = adsEligibilityCopy(decision, language, { credits, resetIso })
  if (!c) return null
  const pt = language === 'pt', es = language === 'es'
  return (
    <section className="adv2-elig" role="status" data-kineo="ads-eligibility-notice" data-state={decision.state} data-reason={decision.reason ?? ''}>
      <style dangerouslySetInnerHTML={{ __html: ADS_ELIGIBILITY_NOTICE_CSS }} />
      <p className="adv2-elig-t">{c.title}</p>
      <p>{c.body}</p>
      <p className="adv2-elig-a">
        <a href="/pricing?intent_campaign=ads_eligibility">{c.plans} →</a>
        {sampleOrderId ? <a className="ghost" href={`/ads/v2?order=${encodeURIComponent(sampleOrderId)}`}>{pt ? 'Ver a minha amostra' : es ? 'Ver mi muestra' : 'See my sample'}</a> : null}
      </p>
    </section>
  )
}
