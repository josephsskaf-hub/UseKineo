// KINEO-INDICE-VIDEO-IA-2026-10-06 — "Kineo AI Video Index" (fundador 06/10: "vai índice"). Página de DADO ORIGINAL feita
// para ser citada por ChatGPT/Bing/Perplexity, no formato da /state-of-ai-shorts-2026 (a página que trouxe 284 sessões do
// ChatGPT em 60 dias): H1, achados com número no topo, tabelas por motor, metodologia, FAQ, "Last updated", JSON-LD Article
// + Dataset (+ FAQPage).
//
// V2 (sessão CEO 06/10, antes de publicar): sem volume absoluto (a amostra só aparece como faixa, e só na metodologia);
// confiabilidade entre renders que começaram, com "not enough data" quando o desfecho desconhecido passa do corte; Kineo 1
// fora (uma linha na metodologia); motores sem amostra de cliente só em "Kineo internal test renders, indicative" (tempo e
// duração, nenhuma taxa); 4 achados com número + o link do preço por filme.
//
// DE ONDE VEM CADA NÚMERO: os medidos, do JSON versionado da edição (lib/seo/aiVideoIndexEdition.ts →
// data/ai-video-index/<AAAA-MM>.json, gravado verbatim da consulta .sql ao lado); o custo bruto do fornecedor por segundo,
// de ENGINE_MARKET (dentro de lib/seo/aiVideoIndex.ts). O PREÇO DA KINEO por vídeo não se repete aqui (sessão CEO 06/10):
// a página LINKA para /seedance-kling-veo-in-one-place, que tem a tabela de preço por motor. Este arquivo NÃO tem número
// no JSX: todo texto com número sai de buildIndexView — o guardião scripts/test-indice-video-ia-2026-10-06.mjs reprova
// dígito digitado em texto de JSX e qualquer valor do JSON escrito à mão aqui ou na lib.
// Estática (sem banco, sem request): edição nova = deploy novo. Tema: só os tokens de app/appearance.css (claro por
// padrão, escuro pela escolha do visitante). Celular: as tabelas viram cartões abaixo de 760 px.
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { AI_VIDEO_INDEX_EDITION } from '@/lib/seo/aiVideoIndexEdition'
import { AI_VIDEO_INDEX_LICENSE, INDICATIVE_LABEL, NOT_ENOUGH_DATA, buildIndexView, type IndexCell } from '@/lib/seo/aiVideoIndex'

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
.avi-section>h2{margin:6px 0 0;font-size:clamp(1.35rem,3vw,1.9rem);letter-spacing:-.03em;line-height:1.2;scroll-margin-top:24px}
.avi-section>p:not(.avi-eyebrow){margin:10px 0 0;color:var(--text2);line-height:1.65;max-width:860px}
.avi-section>p a{color:var(--accent);text-underline-offset:3px}
.avi-findings{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-top:16px}
.avi-finding{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:16px;background:var(--card);padding:18px;box-shadow:var(--sh-card);min-width:0}
.avi-finding .avi-stat{margin:0;color:var(--accent);font-size:clamp(1.7rem,4vw,2.1rem);line-height:1.15;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.avi-finding h3{margin:4px 0 0;font-size:.98rem;line-height:1.4}
.avi-finding p:not(.avi-stat){margin:8px 0 0;color:var(--text2);font-size:.86rem;line-height:1.55}
.avi-finding .avi-go{margin-top:auto;padding-top:10px;color:var(--accent);font-size:.84rem;font-weight:700;text-underline-offset:3px}
.avi-finding.is-wide{grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr) auto;column-gap:24px;align-items:center}
.avi-finding.is-wide .avi-stat{grid-row:1/span 2}
.avi-finding.is-wide h3{grid-column:2;margin:0}
.avi-finding.is-wide p:not(.avi-stat){grid-column:2;margin:3px 0 0}
.avi-finding.is-wide .avi-go{grid-column:3;grid-row:1/span 2;margin:0;padding:0;white-space:nowrap}
.avi-tablewrap{margin-top:16px;border:1px solid var(--border);border-radius:16px;background:var(--card);overflow-x:auto}
.avi-tablewrap.is-narrow{max-width:860px}
.avi-table{width:100%;min-width:760px;border-collapse:collapse}
.avi-table.is-narrow{min-width:560px}
.avi-table.is-narrow tbody th{width:44%}
.avi-table th,.avi-table td{padding:13px 12px;text-align:left;vertical-align:top;font-size:.86rem;line-height:1.45;border-bottom:1px solid var(--border)}
.avi-table thead th{background:var(--card2);color:var(--muted);font-size:.7rem;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.avi-table thead th small{display:block;margin-top:3px;font-size:.68rem;letter-spacing:0;text-transform:none;font-weight:600;white-space:normal}
.avi-table tbody tr:last-child th,.avi-table tbody tr:last-child td{border-bottom:0}
.avi-table tbody th{font-weight:800;min-width:150px}
.avi-table tbody th a{color:var(--text);text-decoration:none}
.avi-table tbody th a:hover{color:var(--accent)}
.avi-note{display:block;margin-top:5px;color:var(--muted);font-size:.74rem;font-weight:600;line-height:1.45}
.avi-v{display:block;font-weight:800;font-size:.98rem;color:var(--text);font-variant-numeric:tabular-nums}
.avi-v.is-nodata{color:var(--muted);font-style:italic;font-weight:700}
.avi-s{display:block;margin-top:3px;color:var(--muted);font-size:.74rem}
.avi-ind{display:inline-block;margin-top:5px;padding:2px 7px;border:1px solid var(--warning);border-radius:999px;color:var(--warning);font-size:.66rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.avi-src{color:var(--accent);font-size:.74rem;text-underline-offset:3px}
.avi-caption{margin:10px 0 0;color:var(--muted);font-size:.78rem;line-height:1.55}
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
.avi-finding.is-wide{display:flex;align-items:stretch}
.avi-finding.is-wide .avi-go{margin:0;padding-top:10px;white-space:normal}
.avi-tablewrap.is-narrow{max-width:none}
.avi-table.is-narrow tbody th{width:100%}
.avi-tablewrap{overflow:visible;border:0;background:transparent}
.avi-table,.avi-table.is-narrow{min-width:0}
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
      <span className={c.text === NOT_ENOUGH_DATA ? 'avi-v is-nodata' : 'avi-v'}>{c.text}</span>
      {c.sub ? <span className="avi-s">{c.sub}</span> : null}
      {c.indicative ? <span className="avi-ind">{INDICATIVE_LABEL}</span> : null}
    </>
  )
}

function EngineName({ name, slug, note }: { name: string; slug: string; note: string | null }) {
  return (
    <>
      <Link href={`/ai-video-generator/${slug}`}>{name}</Link>
      {note ? <span className="avi-note">{note}</span> : null}
    </>
  )
}

export default function AiVideoIndexPage() {
  const col = (key: string) => VIEW.columns.find((c) => c.key === key)?.label ?? key
  const testCol = (key: string) => VIEW.testColumns.find((c) => c.key === key)?.label ?? key
  const providerCol = (key: string) => VIEW.providerColumns.find((c) => c.key === key)?.label ?? key
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
            <strong>Last updated {VIEW.updatedLabel}</strong> · data window {VIEW.windowLabel} (UTC) · customer renders, with
            house accounts kept apart · sample sizes are given as ranges in the methodology.
          </p>
        </header>

        <section className="avi-section" aria-labelledby="avi-findings-title">
          <p className="avi-eyebrow">Key findings</p>
          <h2 id="avi-findings-title">What the renders say this month</h2>
          <div className="avi-findings">
            {VIEW.findings.map((f) => (
              <article key={f.label} className={f.href && !f.href.startsWith('#') ? 'avi-finding is-wide' : 'avi-finding'}>
                <p className="avi-stat">{f.stat}</p>
                <h3>{f.label}</h3>
                <p>{f.detail}</p>
                {f.href && f.linkLabel ? (
                  f.href.startsWith('#') ? (
                    <a className="avi-go" href={f.href}>{f.linkLabel}</a>
                  ) : (
                    <Link className="avi-go" href={f.href}>{f.linkLabel}</Link>
                  )
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="avi-section" aria-labelledby="avi-table-title">
          <p className="avi-eyebrow">Customer renders · {VIEW.editionLabel}</p>
          <h2 id="avi-table-title">Engines measured on customer renders</h2>
          <p>
            Time from request to finished film, length of the finished video, reliability among renders that actually
            started, and the automatic coherence score — customer renders only. Kineo&rsquo;s own price per finished video
            for every engine is kept on one page, not repeated here:{' '}
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
                {VIEW.customerRows.map((r) => (
                  <tr key={r.meta.qualityMode}>
                    <th scope="row"><EngineName name={r.meta.name} slug={r.meta.slug} note={r.note} /></th>
                    <td data-label={col('time')}><Measure c={r.time} /></td>
                    <td data-label={col('length')}><Measure c={r.length} /></td>
                    <td data-label={col('reliability')}><Measure c={r.reliability} /></td>
                    <td data-label={col('coherence')}><Measure c={r.coherence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="avi-section" aria-labelledby="avi-test-title">
          <p className="avi-eyebrow">Shown separately, never added</p>
          <h2 id="avi-test-title">{VIEW.testLabel}</h2>
          <p>
            Engines without enough customer renders in this window. Kineo&rsquo;s own accounts test every engine before and
            after a change; those films are excluded from every customer number above and shown here only so each engine
            still has a measured render time and length. No rates are published for them.
          </p>
          <div className="avi-tablewrap is-narrow">
            <table className="avi-table is-narrow">
              <thead>
                <tr>
                  {VIEW.testColumns.map((c) => (
                    <th key={c.key} scope="col">
                      {c.label}
                      {c.hint ? <small>{c.hint}</small> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VIEW.testRows.map((r) => (
                  <tr key={r.meta.qualityMode}>
                    <th scope="row"><EngineName name={r.meta.name} slug={r.meta.slug} note={r.note} /></th>
                    <td data-label={testCol('time')}><Measure c={r.time} /></td>
                    <td data-label={testCol('length')}><Measure c={r.length} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="avi-caption">
            &ldquo;{INDICATIVE_LABEL}&rdquo; = too few renders to rank engines; read it as an observation, not a benchmark.
            A dash means there was nothing to measure in the window.
          </p>
        </section>

        <section className="avi-section" aria-labelledby={VIEW.providerTableId}>
          <p className="avi-eyebrow">Provider cost</p>
          <h2 id={VIEW.providerTableId}>What the raw video costs at the provider</h2>
          <p>
            The per-second list price the inference provider (fal.ai) publishes for each model, at the resolution Kineo
            renders and without audio — the raw clip, before the script, narration, retries and assembly a finished film
            needs. Checked {VIEW.providerChecked}.
          </p>
          <div className="avi-tablewrap is-narrow">
            <table className="avi-table is-narrow">
              <thead>
                <tr>
                  {VIEW.providerColumns.map((c) => (
                    <th key={c.key} scope="col">
                      {c.label}
                      {c.hint ? <small>{c.hint}</small> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VIEW.providerRows.map((r) => (
                  <tr key={r.meta.qualityMode}>
                    <th scope="row"><EngineName name={r.meta.name} slug={r.meta.slug} note={null} /></th>
                    <td data-label={providerCol('price')}>
                      <span className="avi-v">{r.text}</span>
                      <span className="avi-s">{r.sub}</span>
                    </td>
                    <td data-label={providerCol('source')}>
                      <a className="avi-src" href={r.provider.url} rel="noopener noreferrer" target="_blank">fal.ai price page</a>
                    </td>
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
