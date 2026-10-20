'use client'

// KINEO-KIDS-VENDA-2010 — o cartão das 3 formas de venda do AI Kids Cartoon Stories (/pricing e páginas públicas /ai-kids-cartoon-videos e
// /desenho-infantil-3d-com-ia). Só aparece com KIDS_SALES_OPEN_FOR_PUBLIC = KIDS_SALES_LIVE && KIDS_CARTOON_LIVE (constante do servidor, importada do módulo puro); o botão leva ao
// /kids-cartoon#plans (exige conta — o visitante passa pelo cadastro e volta), onde a pessoa escolhe personagem/tema e paga. O preço
// NUNCA vai na URL. Frases em 16 línguas e números de lib/kidsVenda/kidsVenda.ts.
import Link from 'next/link'
import { KIDS_CARTOON_TEMPLATE_PATH } from '@/lib/kidsCartoon/kidsCartoon'
import { KIDS_SALES_OPEN_FOR_PUBLIC, kidsVendaCardText } from '@/lib/kidsVenda/kidsVenda'

const CSS = `
.kvc{margin:12px 0;padding:14px 16px;border:1px solid #7B6CFF;border-radius:14px;background:linear-gradient(135deg,rgba(123,108,255,.10),rgba(255,111,145,.04));color:inherit}
.kvc h4{margin:0 0 8px;font-size:15px;font-weight:800}
.kvc ul{margin:0;padding:0 0 0 18px;font-size:13px;line-height:1.5}
.kvc li b{font-weight:750}
.kvc .kvc-row{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:10px 0 0}
.kvc a.kvc-cta{display:inline-block;padding:9px 14px;border-radius:10px;background:#7B6CFF;color:#fff;font-weight:800;font-size:14px;text-decoration:none}
.kvc .kvc-honest{font-size:12px;opacity:.8}
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
