'use client'

// KINEO-REGIAO-PAGA-1011 [fundador 10/11: "3 ações para a gente conseguir vender mais… ações sem dinheiro"]
// No /pricing vindo da prévia grátis: as cenas que a pessoa JÁ viu + o Starter em destaque (preço da tabela). O servidor
// decide tudo (app/api/scene-preview/pricing-strip); sem resposta "show" esta faixa não desenha nada — a página de sempre.
import { useEffect, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { REGIAO_PAGA_COPY, REGIAO_PAGA_STRIP_API, regiaoPagaFill, type RegiaoPagaScene } from '@/lib/growth/regiaoPaga1011'

type Data = { show: true; scenes: RegiaoPagaScene[]; idea: string; price: string; films: number; go: string }

export default function PreviewPricingStrip() {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(REGIAO_PAGA_COPY, language)
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    let alive = true
    fetch(REGIAO_PAGA_STRIP_API, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && d.show === true && Array.isArray(d.scenes) && typeof d.go === 'string') setData(d as Data) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [])

  if (!data) return null
  const v = { price: data.price, films: data.films }
  return (
    <section
      data-kineo="region-preview-pricing"
      style={{ margin: '16px auto 0', maxWidth: 1080, padding: '16px', borderRadius: 14, border: '1px solid rgba(41,151,255,.4)', background: 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(41,151,255,.05))', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, flex: '0 0 auto' }}>
        {data.scenes.map((s, i) => (
          <li key={`${s.label}-${i}`} style={{ width: 62, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image} alt={s.text.slice(0, 120)} style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', display: 'block' }} />
          </li>
        ))}
      </ul>
      <div style={{ flex: '1 1 300px', minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{copy.title}</div>
        {data.idea ? <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{data.idea}”</div> : null}
        <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: 'var(--text2)' }}>{regiaoPagaFill(copy.body, v)}</div>
      </div>
      <div style={{ display: 'grid', gap: 6, justifyItems: 'start', flex: '0 0 auto' }}>
        <a href={data.go} data-testid="region-preview-pricing-cta" style={{ background: '#2997ff', color: '#000', borderRadius: 999, padding: '12px 18px', fontSize: 15, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {regiaoPagaFill(copy.cta, v)}
        </a>
        <span style={{ fontSize: 12, color: 'var(--muted, var(--text2))' }}>{copy.other}</span>
      </div>
    </section>
  )
}
