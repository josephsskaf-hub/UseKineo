'use client'

// KINEO-REGIAO-PAGA-1011 [fundador 10/11: "3 ações para a gente conseguir vender mais… ações sem dinheiro"]
// A faixa "seu filme + Starter": as cenas que a pessoa JÁ viu + o Starter em destaque (preço da tabela). Duas telas:
// o /pricing vindo da prévia (surface 'pricing') e a prévia recusada pelo limite (surface 'preview_limit'). O servidor decide
// tudo (app/api/scene-preview/pricing-strip); sem resposta "show" esta faixa não desenha nada — a tela de sempre.
// Na conferência da casa (qa) a faixa vem marcada "QA sample" / "only the Kineo team sees this".
import { useEffect, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { PREVIA_RESUME_STORAGE_KEY, type PreviaResume } from '@/lib/scenePreview'
import { REGIAO_PAGA_COPY, REGIAO_PAGA_STRIP_API, regiaoPagaFill, type RegiaoPagaScene, type RegiaoPagaSurface } from '@/lib/growth/regiaoPaga1011'
// KINEO-REGIAO-FILME-199-1011 [fundador 10/11: "1.99 1 filme!"] — com `film199` na resposta (o servidor decidiu: conta
// elegível com o interruptor 'public', ou a conferência da casa), o botão principal vira o filme avulso de 15 s (preço da fonte única) e o
// Starter desce para secundário. Preço, créditos e segundos vêm do servidor (fonte única lib/checkoutPricing.ts).
import { REGIAO_FILME_199_COPY, regiaoFilme199Fill, type RegiaoFilme199Offer } from '@/lib/growth/regiaoFilme199'
import { CARD_ENTRY_DRAFT_KEY, serializeCardEntryDraft } from '@/lib/growth/cardEntryResumeDraft'
import { WALL_V1_PACK_BALANCE_KEY } from '@/lib/growth/wallV1'

type Data = { show: true; qa: boolean; scenes: RegiaoPagaScene[]; idea: string; script: string; language: string; price: string; films: number; go: string; film199?: RegiaoFilme199Offer }

export default function PreviewPricingStrip({ surface = 'pricing' }: { surface?: RegiaoPagaSurface }) {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(REGIAO_PAGA_COPY, language)
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`${REGIAO_PAGA_STRIP_API}?surface=${surface}`, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && d.show === true && Array.isArray(d.scenes) && typeof d.go === 'string') setData(d as Data) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [surface])

  if (!data) return null
  const v = { price: data.price, films: data.films }
  // A retomada depois de pagar (ScenePreviewResumeBanner) lê esta chave — a mesma que o "Turn into a film" grava.
  const saveResume = () => {
    if (data.qa || !data.script.trim()) return
    try {
      const saved: PreviaResume = { t: Date.now(), idea: data.idea, script: data.script, language: data.language }
      localStorage.setItem(PREVIA_RESUME_STORAGE_KEY, JSON.stringify(saved))
    } catch { /* sem armazenamento: o roteiro continua no servidor (GET /api/scene-preview) */ }
  }
  // KINEO-REGIAO-FILME-199-1011 — o filme avulso volta a /studio/create?resume=wall_v1 (a volta do pacote, que espera o
  // crédito cair): o rascunho dessa volta vive no sessionStorage DESTA aba, então o roteiro vai junto, no motor e na
  // duração do filme comprado. Conferência da casa nunca grava nada.
  const film = data.film199 && typeof data.film199.go === 'string' ? data.film199 : null
  const saveFilmResume = () => {
    saveResume()
    if (!film || film.qa || data.qa || !data.script.trim()) return
    try {
      sessionStorage.setItem(CARD_ENTRY_DRAFT_KEY, serializeCardEntryDraft({ prompt: data.script, quality: 'cinematic_ai', duration: film.seconds, mode: 'cinematic_ai', engine: 'seedance', at: Date.now() }))
      if (typeof film.balance === 'number' && film.balance >= 0) sessionStorage.setItem(WALL_V1_PACK_BALANCE_KEY, String(film.balance))
    } catch { /* sem armazenamento: o aviso da prévia no painel leva ao mesmo roteiro */ }
  }
  if (film) {
    const fc = pickInterfaceCopy(REGIAO_FILME_199_COPY, language)
    const fv = { price: film.price, seconds: film.seconds, starterPrice: data.price, films: data.films }
    return (
      <section
        data-kineo="region-preview-pricing"
        data-surface={surface}
        data-offer="film199"
        data-qa={data.qa || film.qa ? '1' : undefined}
        style={{ margin: '16px auto 0', maxWidth: 1080, padding: '16px', borderRadius: 14, border: data.qa || film.qa ? '2px dashed #d93025' : '1px solid rgba(41,151,255,.4)', background: 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(41,151,255,.05))', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}
      >
        {data.qa || film.qa ? <div style={{ flex: '1 1 100%', fontSize: 12, fontWeight: 800, color: '#d93025', textTransform: 'uppercase', letterSpacing: '.04em' }}>{copy.qa}</div> : null}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, flex: '0 0 auto' }}>
          {data.scenes.map((s, i) => (
            <li key={`${s.label}-${i}`} style={{ width: 62, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={s.text.slice(0, 120)} style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', display: 'block' }} />
            </li>
          ))}
        </ul>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: 'var(--text2)' }}>{fc.kicker}</div>
          <div style={{ marginTop: 2, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{regiaoFilme199Fill(fc.title, fv)}</div>
          {data.idea ? <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{data.idea}”</div> : null}
          <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: 'var(--text2)' }}>{regiaoFilme199Fill(fc.body, fv)}</div>
        </div>
        <div style={{ display: 'grid', gap: 6, justifyItems: 'start', flex: '0 0 auto' }}>
          <a href={film.go} onClick={saveFilmResume} data-testid="region-film-199-cta" style={{ background: '#2997ff', color: '#000', borderRadius: 999, padding: '12px 18px', fontSize: 15, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {regiaoFilme199Fill(fc.cta, fv)}
          </a>
          <a href={data.go} onClick={saveResume} data-testid="region-preview-pricing-cta" style={{ fontSize: 13, color: 'var(--text2)' }}>
            {regiaoFilme199Fill(fc.starter, fv)}
          </a>
        </div>
      </section>
    )
  }
  return (
    <section
      data-kineo="region-preview-pricing"
      data-surface={surface}
      data-qa={data.qa ? '1' : undefined}
      style={{ margin: '16px auto 0', maxWidth: 1080, padding: '16px', borderRadius: 14, border: data.qa ? '2px dashed #d93025' : '1px solid rgba(41,151,255,.4)', background: 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(41,151,255,.05))', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}
    >
      {data.qa ? <div style={{ flex: '1 1 100%', fontSize: 12, fontWeight: 800, color: '#d93025', textTransform: 'uppercase', letterSpacing: '.04em' }}>{copy.qa}</div> : null}
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
        <a href={data.go} onClick={saveResume} data-testid="region-preview-pricing-cta" style={{ background: '#2997ff', color: '#000', borderRadius: 999, padding: '12px 18px', fontSize: 15, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {regiaoPagaFill(copy.cta, v)}
        </a>
        {surface === 'pricing'
          ? <span style={{ fontSize: 12, color: 'var(--muted, var(--text2))' }}>{copy.other}</span>
          : <a href="/pricing?from=scene_preview" onClick={saveResume} style={{ fontSize: 13, color: 'var(--text2)' }}>{copy.seeAll}</a>}
      </div>
    </section>
  )
}
