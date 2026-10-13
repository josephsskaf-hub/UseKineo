import Link from 'next/link'
import { CITATION_ANSWER_LINKS } from '@/lib/growth/citationAnswers'
import { CITATION_ANSWER_CSS } from '@/lib/ui/citationAnswerStyles'
// KINEO-VS-ALTERNATIVAS-1310 — as 4 páginas /vs "alternativa a X" entram na mesma lista de guias (link interno do hub).
import { VS_ALTERNATIVE_LINKS } from '@/lib/seo/vsAlternatives1310'

export default function CitationAnswerLinks() {
  return <section className="kc-guides" aria-labelledby="citation-guides-heading">
    <style dangerouslySetInnerHTML={{ __html: CITATION_ANSWER_CSS }} />
    <h2 id="citation-guides-heading">Start with the video you want to make</h2>
    <p>Practical guides to scripts, faceless videos, free-trial limits and the cost of a complete Short.</p>
    <ul>{[...CITATION_ANSWER_LINKS, ...VS_ALTERNATIVE_LINKS].map((item) => <li key={item.path}><Link href={item.path}>{item.label} →</Link></li>)}</ul>
  </section>
}
