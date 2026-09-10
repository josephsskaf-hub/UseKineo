import Link from 'next/link'
import { CITATION_ANSWER_LINKS } from '@/lib/growth/citationAnswers'
import { CITATION_ANSWER_CSS } from '@/lib/ui/citationAnswerStyles'

export default function CitationAnswerLinks() {
  return <section className="kc-guides" aria-labelledby="citation-guides-heading">
    <style dangerouslySetInnerHTML={{ __html: CITATION_ANSWER_CSS }} />
    <h2 id="citation-guides-heading">Start with the video you want to make</h2>
    <p>Practical guides to scripts, faceless videos, free-trial limits and the cost of a complete Short.</p>
    <ul>{CITATION_ANSWER_LINKS.map((item) => <li key={item.path}><Link href={item.path}>{item.label} →</Link></li>)}</ul>
  </section>
}
