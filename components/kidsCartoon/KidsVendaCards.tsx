'use client'

// KINEO-KIDS-VENDA-2010 — o cartão das 3 formas de venda do AI Kids Cartoon Stories (/pricing e páginas públicas /ai-kids-cartoon-videos e
// /desenho-infantil-3d-com-ia). Só aparece com KIDS_SALES_OPEN_FOR_PUBLIC = KIDS_SALES_LIVE && KIDS_CARTOON_LIVE (constante do servidor, importada do módulo puro); o botão leva ao
// /kids-cartoon#plans (exige conta — o visitante passa pelo cadastro e volta), onde a pessoa escolhe personagem/tema e paga. O preço
// NUNCA vai na URL. Frases em 16 línguas e números de lib/kidsVenda/kidsVenda.ts.
import Link from 'next/link'
import { KIDS_CARTOON_TEMPLATE_PATH } from '@/lib/kidsCartoon/kidsCartoon'
import { KIDS_SALES_OPEN_FOR_PUBLIC, kidsVendaCardText } from '@/lib/kidsVenda/kidsVenda'

const CSS = `
/* KINEO-KIDS-VENDA-LIGA-2110 — a venda acompanha os cartões claros e o azul da tela nova. */
.kvc{margin:14px 0;padding:18px;border:1px solid var(--line,#E4E4E0);border-radius:18px;background:var(--card,#fff);color:inherit;box-shadow:0 1px 2px #0E111608}
.kvc *,.kvc *::before,.kvc *::after{box-sizing:border-box}
.kvc h4{margin:0 0 10px;font-size:16px;font-weight:800;letter-spacing:-.01em}
.kvc ul{margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.6}
.kvc li+li{margin-top:4px}.kvc li b{font-weight:750}
.kvc .kvc-row{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:14px 0 0}
.kvc a.kvc-cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:11px 18px;border-radius:999px;background:var(--blue,#0A5CFF);color:var(--on-blue,#fff);font-weight:750;font-size:14px;text-decoration:none}
.kvc a.kvc-cta:focus-visible{outline:3px solid var(--blue,#0A5CFF);outline-offset:3px}
.kvc .kvc-honest{font-size:13px;color:var(--muted,#5A5F67);line-height:1.5;flex:1 1 260px}
@media(max-width:760px){.kvc a.kvc-cta{width:100%}.kvc .kvc-honest{flex-basis:100%}}
`

/** O cartão. `lang` = a língua da interface (16; desconhecida = inglês). */
export function KidsVendaCards({ lang = 'en', surface }: { lang?: string; surface: 'pricing' | 'page' }) {
  if (!KIDS_SALES_OPEN_FOR_PUBLIC) return null
  const t = kidsVendaCardText(lang)
  const href = `${KIDS_CARTOON_TEMPLATE_PATH}?utm_source=kids_${surface}#plans`
  return (
    <section className="kvc" id="kids-plans" data-kineo="kids-venda-cards" data-surface={surface} aria-label={t.title}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h4>{t.title}</h4>
      <ul>
        <li><b>{t.autopilot}</b> — {t.autopilotNote}</li>
        <li><b>{t.pack}</b> — {t.packNote}</li>
        <li>{t.sample}</li>
      </ul>
      <div className="kvc-row">
        <Link className="kvc-cta" data-kineo="kids-venda-cta" href={href}>{t.ctaOpen}</Link>
        <span className="kvc-honest">{t.honest}</span>
      </div>
    </section>
  )
}
