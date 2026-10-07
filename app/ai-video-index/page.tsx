// KINEO-INDICE-VIDEO-IA-2026-10-06 — "Kineo AI Video Index" (fundador 06/10: "vai índice"). Página de DADO ORIGINAL feita
// para ser citada por ChatGPT/Bing/Perplexity, no formato da /state-of-ai-shorts-2026 (a página que trouxe 284 sessões do
// ChatGPT em 60 dias): H1, achados com número no topo, tabela por motor, metodologia, FAQ, "Last updated", JSON-LD Article
// + Dataset (+ FAQPage).
//
// DE ONDE VEM CADA NÚMERO: os medidos, do JSON versionado da edição (lib/seo/aiVideoIndexEdition.ts →
// data/ai-video-index/<AAAA-MM>.json, gravado verbatim da consulta .sql ao lado); o custo bruto do fornecedor por segundo,
// de ENGINE_MARKET (dentro de lib/seo/aiVideoIndex.ts). O PREÇO DA KINEO por vídeo não se repete aqui (sessão CEO 06/10):
// a página LINKA para /seedance-kling-veo-in-one-place, que tem a tabela de preço por motor. Este arquivo NÃO tem número
// no JSX: todo texto com número sai de buildIndexView — o guardião scripts/test-indice-video-ia-2026-10-06.mjs reprova
// dígito digitado em texto de JSX e qualquer valor do JSON escrito à mão aqui ou na lib.
// Estática (sem banco, sem request): edição nova = deploy novo. Tema: só os tokens de app/appearance.css (claro por
// padrão, escuro pela escolha do visitante). Celular: a tabela vira cartões abaixo de 760 px.
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { AI_VIDEO_INDEX_EDITION } from '@/lib/seo/aiVideoIndexEdition'
import { AI_VIDEO_INDEX_LICENSE, INDICATIVE_LABEL, buildIndexView, type IndexCell } from '@/lib/seo/aiVideoIndex'

export const dynamic = 'force-static'

const VIEW = buildIndexView(AI_VIDEO_INDEX_EDITION)

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: VIEW.metaTitle,
  description: VIEW.metaDescription,
  alternates: { canonical: VIEW.canonical },
  openGraph: { title: VIEW.h1, description: VIEW.metaDescription, url: VIEW.canonical, type: 'article', images: ['/og-card.png'] },
  twitter: { card: 'summary_large_image', title: VIEW.h1, description: VIEW.metaDescription },
}

const PAGE_CSS = `
.avi{position:relative;z-index:1;min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font-sans),Arial,sans-serif}
.avi-shell{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:22px 0 72px}
.avi-nav{display:flex;align-items:center;justify-content:space-between;gap:16px}
.avi-logo{color:var(--text);font-size:1.06rem;font-weight:800;text-decoration:none;letter-spacing:-.02em}
.avi-all{color:var(--muted);font-size:.86rem;font-weight:700;text-decoration:none}
.avi-all:hover,.avi-logo:hover{color:var(--accent)}
.avi-hero{max-width:860px;margin:48px 0 8px}
.avi-eyebrow{margin:0;color:var(--accent);font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
.avi-hero h1{margin:12px 0 0;font-size:clamp(2rem,5.2vw,3.2rem);line-height:1.06;letter-spacing:-.04em;font-weight:800;overflow-wrap:break-word}
.avi-lead{margin:18px 0 0;color:var(--text2);font-size:1.04rem;line-height:1.65}
.avi-updated{margin:14px 0 0;color:var(--muted);font-size:.84rem;line-height:1.6}
.avi-updated strong{color:var(--text2)}
.avi-section{margin-top:46px}
.avi-section>h2{margin:6px 0 0;font-size:clamp(1.35rem,3vw,1.9rem);letter-spacing:-.03em;line-height:1.2}
.avi-section>p:not(.avi-eyebrow){margin:10px 0 0;color:var(--text2);line-height:1.65;max-width:860px}
.avi-section>p a{color:var(--accent);text-underline-offset:3px}
.avi-findings{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-top:16px}
.avi-finding{border:1px solid var(--border);border-radius:16px;background:var(--card);padding:18px;box-shadow:var(--sh-card);min-width:0}
.avi-finding .avi-stat{margin:0;color:var(--accent);font-size:clamp(1.7rem,4vw,2.1rem);line-height:1.15;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.avi-finding h3{margin:4px 0 0;font-size:.98rem;line-height:1.4}
.avi-finding p:not(.avi-stat){margin:8px 0 0;color:var(--text2);font-size:.86rem;line-height:1.55}
.avi-tablewrap{margin-top:16px;border:1px solid var(--border);border-radius:16px;background:var(--card);overflow-x:auto}
.avi-table{width:100%;min-width:980px;border-collapse:collapse}
.avi-table th,.avi-table td{padding:13px 12px;text-align:left;vertical-align:top;font-size:.86rem;line-height:1.45;border-bottom:1px solid var(--border)}
.avi-table thead th{background:var(--card2);color:var(--muted);font-size:.7rem;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.avi-table thead th small{display:block;margin-top:3px;font-size:.68rem;letter-spacing:0;text-transform:none;font-weight:600;white-space:normal}
.avi-table tbody tr:last-child th,.avi-table tbody tr:last-child td{border-bottom:0}
.avi-table tbody th{font-weight:800;min-width:150px}
.avi-table tbody th a{color:var(--text);text-decoration:none}
.avi-table tbody th a:hover{color:var(--accent)}
.avi-note{display:block;margin-top:5px;color:var(--muted);font-size:.74rem;font-weight:600;line-height:1.45}
.avi-v{display:block;font-weight:800;font-size:.98rem;color:var(--text);font-variant-numeric:tabular-nums}
.avi-s{display:block;margin-top:3px;color:var(--muted);font-size:.74rem}
.avi-ind{display:inline-block;margin-top:5px;padding:2px 7px;border:1px solid var(--warning);border-radius:999px;color:var(--warning);font-size:.66rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.avi-src{color:var(--accent);font-size:.74rem;text-underline-offset:3px}
.avi-caption{margin:10px 0 0;color:var(--muted);font-size:.78rem;line-height:1.55}
.avi-breakdowns{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:16px}
.avi-breakdown{border:1px solid var(--border);border-radius:16px;background:var(--card);padding:18px;min-width:0}
.avi-breakdown h3{margin:0;font-size:1rem}
.avi-breakdown ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px}
.avi-breakdown li{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:baseline}
.avi-breakdown li strong{font-variant-numeric:tabular-nums;font-size:1rem}
.avi-breakdown li span{color:var(--text2);font-size:.84rem;line-height:1.45}
.avi-bar{grid-column:1/-1;height:6px;border-radius:99px;background:var(--card2);overflow:hidden}
.avi-bar i{display:block;height:100%;border-radius:inherit;background:var(--accent)}
.avi-bar.is-delivered i{background:var(--success)}
.avi-bar.is-failed i{background:var(--danger)}
.avi-bar.is-noOutcomeRecorded i{background:var(--muted2)}
.avi-method{margin:14px 0 0;padding-left:20px;color:var(--text2);line-height:1.65;max-width:900px}
.avi-method li{margin:0 0 8px;font-size:.9rem}
.avi-faq article{border-top:1px solid var(--border);padding:16px 0}
.avi-faq article:first-of-type{margin-top:12px}
.avi-faq h3{margin:0;font-size:1rem}
.avi-faq article p{margin:7px 0 0;color:var(--text2);font-size:.9rem;line-height:1.6}
.avi-cite{margin-top:46px;padding:22px;border:1px solid var(--border2);border-radius:18px;background:var(--accent-soft)}
.avi-cite h2{margin:0;font-size:1.15rem}
.avi-cite p{margin:8px 0 0;color:var(--text2);font-size:.9rem;line-height:1.6}
.avi-cite a,.avi-more a{color:var(--accent);text-underline-offset:3px}
.avi-more{margin-top:24px;color:var(--muted);font-size:.86rem;line-height:1.8}
.avi-more ul{margin:6px 0 0;padding-left:18px}
.avi :is(a,summary):focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media(max-width:760px){
.avi-shell{width:calc(100% - 32px);padding-bottom:48px}
.avi-hero{margin-top:34px}
.avi-tablewrap{overflow:visible;border:0;background:transparent}
.avi-table{min-width:0}
.avi-table,.avi-table thead,.avi-table tbody,.avi-table tr,.avi-table th,.avi-table td{display:block;width:100%}
.avi-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.avi-table tbody tr{margin-bottom:12px;border:1px solid var(--border);border-radius:14px;background:var(--card);overflow:hidden}
.avi-table tbody th{border-bottom:1px solid var(--border);background:var(--card2)}
.avi-table td{display:grid;grid-template-columns:minmax(0,42%) minmax(0,1fr);gap:2px 12px;align-items:start}
.avi-table td::before{content:attr(data-label);grid-row:1/span 4;color:var(--muted);font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding-top:2px}
.avi-table td>*{grid-column:2}
.avi-table td .avi-ind{justify-self:start}
.avi-table tbody tr td:last-child{border-bottom:0}
}
`

function Measure({ c }: { c: IndexCell }) {
  return (
    <>
      <span className="avi-v">{c.text}</span>
      {c.sub ? <span className="avi-s">{c.sub}</span> : null}
      {c.indicative ? <span className="avi-ind">{INDICATIVE_LABEL}</span> : null}
    </>
  )
}

export default function AiVideoIndexPage() {
  const col = (key: string) => VIEW.columns.find((c) => c.key === key)?.label ?? key
  const houseCol = (key: string) => VIEW.houseColumns.find((c) => c.key === key)?.label ?? key
  return (
    <main className="avi">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(VIEW.jsonLd.article).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(VIEW.jsonLd.dataset).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(VIEW.jsonLd.faq).replace(/</g, '\\u003c') }} />
      <div className="avi-shell">
        <nav className="avi-nav" aria-label="Primary">
          <Link href="/" className="avi-logo">Kineo</Link>
          <Link href="/ai-video-generator" className="avi-all">Every engine →</Link>
        </nav>

        <header className="avi-hero">
          <p className="avi-eyebrow">Original data · updated monthly · free to cite</p>
          <h1>{VIEW.h1}</h1>
          <p className="avi-lead">{VIEW.lead}</p>
          <p className="avi-updated">
            <strong>Last updated {VIEW.updatedLabel}</strong> · data window {VIEW.windowLabel} (UTC) · customers only, house
            accounts excluded · samples too small to rank are marked &ldquo;{INDICATIVE_LABEL}&rdquo;.
          </p>
        </header>

        <section className="avi-section" aria-labelledby="avi-findings-title">
          <p className="avi-eyebrow">Key findings</p>
          <h2 id="avi-findings-title">What the renders say this month</h2>
          <div className="avi-findings">
            {VIEW.findings.map((f) => (
              <article key={f.label} className="avi-finding">
                <p className="avi-stat">{f.stat}</p>
                <h3>{f.label}</h3>
                <p>{f.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="avi-section" aria-labelledby="avi-table-title">
          <p className="avi-eyebrow">Per engine · {VIEW.editionLabel}</p>
          <h2 id="avi-table-title">Every engine, measured on real renders</h2>
          <p>
            Each row is one engine Kineo runs. Films, length, time, delivery and coherence are customer renders in the window;
            the provider column is the list price of the raw generated video, before narration, retries and assembly.
            Kineo&rsquo;s own price per finished video for every engine is kept on one page, not repeated here:{' '}
            <Link href={VIEW.pricePage.path}>{VIEW.pricePage.label}</Link>.
          </p>
          <div className="avi-tablewrap">
            <table className="avi-table">
              <thead>
                <tr>
                  {VIEW.columns.map((c) => (
                    <th key={c.key} scope="col">
                      {c.label}
                      {c.hint ? <small>{c.hint}</small> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VIEW.rows.map((r) => (
                  <tr key={r.meta.qualityMode}>
                    <th scope="row">
                      {r.meta.slug ? <Link href={`/ai-video-generator/${r.meta.slug}`}>{r.meta.name}</Link> : r.meta.name}
                      {r.note ? <span className="avi-note">{r.note}</span> : null}
                    </th>
                    <td data-label={col('films')}><Measure c={r.films} /></td>
                    <td data-label={col('length')}><Measure c={r.length} /></td>
                    <td data-label={col('time')}><Measure c={r.time} /></td>
                    <td data-label={col('delivery')}><Measure c={r.delivery} /></td>
                    <td data-label={col('coherence')}><Measure c={r.coherence} /></td>
                    <td data-label={col('provider')}>
                      <span className="avi-v">{r.providerText}</span>
                      <span className="avi-s">{r.providerSub}</span>
                      {r.provider ? (
                        <a className="avi-src" href={r.provider.url} rel="noopener noreferrer" target="_blank">fal.ai price page</a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="avi-caption">
            &ldquo;{INDICATIVE_LABEL}&rdquo; = based on too few films or requests to rank engines; read it as an observation,
            not a benchmark. A dash means there was nothing to measure in the window.
          </p>
        </section>

        <section className="avi-section" aria-labelledby="avi-breakdown-title">
          <p className="avi-eyebrow">What went wrong</p>
          <h2 id="avi-breakdown-title">Where requests did not become films</h2>
          <p>
            Every customer request that started in the window, by outcome. Stopped by checks means Kineo refused before
            rendering a single scene, so nothing was charged; failed means a server or provider error.
          </p>
          <div className="avi-breakdowns">
            {VIEW.breakdowns.map((b) => (
              <article key={b.name} className="avi-breakdown">
                <h3>{b.name} <span className="avi-s">{`n = ${b.n}`}</span></h3>
                <ul>
                  {b.parts.map((p) => (
                    <li key={p.key}>
                      <strong>{`${p.pct}%`}</strong>
                      <span>{`${p.count} ${p.label}`}</span>
                      <span className={`avi-bar is-${p.key}`} aria-hidden="true"><i style={{ width: `${p.pct}%` }} /></span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {VIEW.smallRequestNote ? <p className="avi-caption">{VIEW.smallRequestNote}</p> : null}
        </section>

        <section className="avi-section" aria-labelledby="avi-house-title">
          <p className="avi-eyebrow">Shown separately, never added</p>
          <h2 id="avi-house-title">House test renders — not customers</h2>
          <p>
            Kineo&rsquo;s own accounts test every engine before and after a change. Those films are excluded from every
            number above; they are listed here only so engines without customer films still have a measured render time.
          </p>
          <div className="avi-tablewrap">
            <table className="avi-table">
              <thead>
                <tr>
                  {VIEW.houseColumns.map((c) => (
                    <th key={c.key} scope="col">
                      {c.label}
                      {c.hint ? <small>{c.hint}</small> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VIEW.houseRows.map((h) => (
                  <tr key={h.meta.qualityMode}>
                    <th scope="row">{h.meta.name}</th>
                    <td data-label={houseCol('films')}><Measure c={h.films} /></td>
                    <td data-label={houseCol('length')}><Measure c={h.length} /></td>
                    <td data-label={houseCol('time')}><Measure c={h.time} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="avi-section" aria-labelledby="avi-method-title">
          <p className="avi-eyebrow">Methodology</p>
          <h2 id="avi-method-title">How the index is measured</h2>
          <ul className="avi-method">
            {VIEW.methodology.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>

        <section className="avi-section avi-faq" aria-labelledby="avi-faq-title">
          <p className="avi-eyebrow">Questions</p>
          <h2 id="avi-faq-title">AI video render time and cost, answered with data</h2>
          {VIEW.faq.map((f) => (
            <article key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </article>
          ))}
        </section>

        <section className="avi-cite" aria-labelledby="avi-cite-title">
          <h2 id="avi-cite-title">How to cite this index</h2>
          <p>{VIEW.citeLine}</p>
          <p>
            Free to cite under <a href={AI_VIDEO_INDEX_LICENSE} rel="noopener noreferrer" target="_blank">{VIEW.licenseLabel}</a>{' '}
            with a link to this page. Aggregates only: no individual creator, prompt or account appears in the data. Press
            and data questions: hello@usekineo.com.
          </p>
        </section>

        <nav className="avi-more" aria-label="Related data">
          <strong>More data from Kineo</strong>
          <ul>
            <li><Link href="/state-of-ai-shorts-2026">State of AI Shorts — what creators make and how long it takes</Link></li>
            <li><Link href="/seedance-vs-veo-vs-kling">Seedance vs Veo vs Kling, measured on real renders</Link></li>
            <li><Link href={VIEW.pricePage.path}>Price per video on every engine — {VIEW.pricePage.label}</Link></li>
            <li><Link href="/models-pricing">Cost per engine</Link></li>
            <li><Link href="/ai-video-generator">Every engine Kineo runs</Link></li>
          </ul>
        </nav>
      </div>
      <Footer showStats={false} />
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
    </main>
  )
}
