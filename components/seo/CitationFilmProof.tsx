import type { ReactNode } from 'react'
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'

const example = PUBLIC_EXAMPLES.find(item => item.slug === 'turkmenistan-door-to-hell')!
const CSS = `
.citation-film-proof-2411{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:22px;align-items:start}
.citation-film-proof-2411 figure{margin:30px 0 0}
.citation-film-proof-2411 video{width:100%;aspect-ratio:9/16;object-fit:contain;border:1px solid var(--kpl-line,#343438);border-radius:14px;background:#080c12}
.citation-film-proof-2411 figcaption{font-size:12px;line-height:1.5;color:var(--kpl-muted,#86868b);margin-top:8px}
@media(max-width:640px){.citation-film-proof-2411{grid-template-columns:minmax(0,1fr);gap:0}.citation-film-proof-2411 figure{display:grid;grid-template-columns:84px minmax(0,1fr);gap:12px;margin:16px 0 0;align-items:center}.citation-film-proof-2411 video{width:84px}.citation-film-proof-2411 figcaption{margin:0}}
`

// An existing founder-owned export, never a newly generated film or a customer upload.
export default function CitationFilmProof({ children, comparison = false }: { children: ReactNode; comparison?: boolean }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="citation-film-proof-2411" data-kineo="citation-film-proof-2411">
        <div>{children}</div>
        <figure>
          <video controls muted playsInline preload="metadata" src={example.videoPath} poster={posterWebpPath(example.posterPath)} aria-label={example.title} />
          <figcaption>
            <a href={`/examples/${example.slug}`} style={{ color: 'var(--kpl-accent, #2997ff)', fontWeight: 800 }}>{example.shortTitle}</a><br />
            An existing {example.previewDurationSeconds}-second preview from a {example.outputDurationSeconds}-second Kineo export.<br />
            <time dateTime="2026-11-24">Example reviewed 24 November 2026.</time>
          </figcaption>
        </figure>
      </div>
      {comparison ? (
        <p data-kineo="citation-comparison-method-2411" style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--kpl-muted, #86868b)', margin: '14px 0 24px' }}>
          <strong>Comparison method:</strong> tools are grouped by starting input and output: an idea into generated scenes, existing footage into clips, captions, or a presenter. The comparisons below keep their original source dates. This existing Kineo export demonstrates the format.
        </p>
      ) : null}
    </>
  )
}
