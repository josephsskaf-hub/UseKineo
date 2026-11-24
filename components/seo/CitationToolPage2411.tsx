import type { Metadata } from 'next'
import Link from 'next/link'
import { PaginaClaraTopo } from '@/components/seo/PaginaClara'
import CitationToolForm from './CitationToolForm2411'
import { CITATION_FORMAT_CSS, CITATION_FORMAT_HERO } from '@/lib/growth/citationFormatHero2411'
import { CITATION_TOOLS_REVIEWED_ISO, type CitationTool } from '@/lib/seo/citationTools2411'
import { STANDARD_FILM_NAME } from '@/lib/seo/citacoesRotina1711'
import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine'
import { STARTER_MONTH, STARTER_CREDITS, creditsPerReferenceVideo } from '@/lib/marketingPrice'
import { TRIAL_CREDITS_SHOWN } from '@/lib/freeTierOffer'
const BASE='https://www.usekineo.com'
const path=(slug:string)=>'/ai-video-generator/for/'+slug
export function citationToolMetadata(tool:CitationTool):Metadata {
 const url=BASE+path(tool.slug)
 return {metadataBase:new URL(BASE),title:tool.title,description:tool.intro,alternates:{canonical:url},openGraph:{title:tool.title,description:tool.intro,url,type:'website'},twitter:{card:'summary_large_image',title:tool.title,description:tool.intro}}
}
const CSS=`
.ct-tool{max-width:1040px;margin:auto;padding:24px 20px 60px;color:var(--kpl-text,#0e1116)}
.ct-tool a{color:var(--kpl-accent,#0a5cff)}
.ct-tool h1{font-size:clamp(29px,4vw,44px);font-weight:650;line-height:1.12;margin:18px 0 12px;max-width:800px}
.ct-tool p{line-height:1.6;color:var(--kpl-body,#2a2f37)}
.ct-tool .ct-intro{max-width:800px;font-size:17px;margin-bottom:20px}
.ct-tool .ct-grid{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:26px;align-items:start}
.ct-tool-form,.ct-tool .ct-panel{padding:20px;border:1px solid var(--kpl-line,#e4e4e0);border-radius:18px;background:var(--kpl-card,#fff)}
.ct-tool-form fieldset{padding:0;margin:0 0 16px;border:0;display:flex;flex-wrap:wrap;gap:12px}
.ct-tool-form legend{font-size:13px;margin-bottom:8px}
.ct-tool-form label{font-size:14px;font-weight:650;line-height:1.4}
.ct-tool-form input[type=radio]{accent-color:var(--kpl-accent,#0a5cff);margin:0 5px 0 0}
.ct-tool-form textarea{box-sizing:border-box;width:100%;display:block;margin-top:8px;padding:12px;border-radius:10px;border:1px solid var(--kpl-line,#d2d2cd);background:var(--kpl-bg,#f7f7f5);color:inherit;font:inherit;font-size:16px;line-height:1.5;resize:vertical;min-height:114px}
.ct-tool-form textarea:focus-visible,.ct-tool button:focus-visible{outline:3px solid var(--kpl-accent,#0a5cff);outline-offset:3px}
.ct-tool-form button{display:block;border:0;border-radius:999px;padding:13px 18px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;max-width:100%;background:var(--kpl-accent,#0a5cff);color:var(--kpl-on-accent,#fff)}
.ct-tool-form button[type=submit]{width:100%}.ct-tool-form button:disabled{opacity:.5;cursor:not-allowed}
.ct-tool-form button.ct-example{background:transparent;color:var(--kpl-accent,#0a5cff);padding:12px 0;text-align:left}
.ct-tool-form p{font-size:12px;margin:8px 0;color:var(--kpl-muted,#5a5f67)}
.ct-tool figure{margin:0}.ct-tool video{display:block;width:100%;max-height:340px;aspect-ratio:9/16;object-fit:contain;background:#080c12;border-radius:14px}
.ct-tool figcaption{font-size:12px;line-height:1.5;color:var(--kpl-muted,#5a5f67);margin-top:10px}
.ct-tool .ct-section{margin-top:32px}.ct-tool h2{font-size:24px;line-height:1.25;font-weight:650}
.ct-tool .ct-table{overflow-x:auto;border:1px solid var(--kpl-line,#e4e4e0);border-radius:14px;background:var(--kpl-card,#fff)}
.ct-tool table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.55}
.ct-tool th,.ct-tool td{text-align:left;padding:14px;vertical-align:top;border-bottom:1px solid var(--kpl-line,#e4e4e0)}
.ct-tool th{background:var(--kpl-accent-soft,#e8efff)}
.ct-tool details{margin-top:10px}.ct-tool summary{font-weight:650;cursor:pointer}.ct-tool small{color:var(--kpl-muted,#5a5f67)}
@media(max-width:640px){.ct-tool{padding:18px 16px 40px}.ct-tool .ct-grid{grid-template-columns:minmax(0,1fr);gap:20px}.ct-tool .ct-grid figure{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;align-items:center}.ct-tool .ct-grid video{width:96px;height:170px}.ct-tool-form{padding:16px}.ct-tool table{font-size:13px}.ct-tool th,.ct-tool td{padding:10px}.ct-tool h2{font-size:22px}}
`
export default function CitationToolPage({tool}:{tool:CitationTool}) {
 const example=CITATION_FORMAT_HERO[tool.example]
 const url=BASE+path(tool.slug)
 const questions=[...tool.faq,{q:'Which model and credits does Kineo use now?',a:'The standard narrated film uses '+STANDARD_FILM_NAME+'. The free-film model label is '+FREE_FILM_ENGINE_NAME+'. Check the selected model and credit cost in Studio before you generate. Historical example films keep the labels of the models that made them.'}]
 const structured=[{'@context':'https://schema.org','@type':'FAQPage',mainEntity:questions.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))},{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Kineo',item:BASE+'/'},{'@type':'ListItem',position:2,name:'AI video tools',item:BASE+'/ai-video-generator/for'},{'@type':'ListItem',position:3,name:tool.h1,item:url}]}]
 return <main className="kpl kpl-citation-format-2411" style={{minHeight:'100vh',background:'var(--cfh-bg)',color:'var(--kpl-text,#0e1116)'}}>
  <style dangerouslySetInnerHTML={{__html:CITATION_FORMAT_CSS+CSS}}/>
  {structured.map((data,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>)}
  <PaginaClaraTopo/>
  <div className="ct-tool" data-citation-tool={tool.slug}>
   <nav aria-label="Breadcrumb"><Link href="/ai-video-generator/for">AI video tools</Link> / {tool.h1}</nav>
   <h1>{tool.h1}</h1><p className="ct-intro">{tool.intro}</p>
   <div className="ct-grid"><CitationToolForm slug={tool.slug} language={tool.language} examplePrompt={tool.examplePrompt}/><figure><video src={example.src} poster={example.poster} controls muted playsInline preload="metadata" aria-label={example.title}/><figcaption><strong>{example.title}</strong><br/>{example.badge}<br/>Historical Kineo example. Not made from the prompt on this page; not a sample of {tool.language.toUpperCase()} narration.</figcaption></figure></div>
   <section className="ct-section"><h2>Your input, your choice</h2><div className="ct-table"><table><thead><tr><th scope="col">Starting mode</th><th scope="col">What you provide</th><th scope="col">Before generating</th></tr></thead><tbody><tr><th scope="row">Write from my idea</th><td>A premise, tone and ending</td><td>Review the prepared draft in Studio</td></tr><tr><th scope="row">Use my script as is</th><td>Your finished narration</td><td>Check wording, language and length in Studio</td></tr></tbody></table></div><p>{tool.review}</p></section>
   <section className="ct-section ct-panel"><h2>Current film facts</h2><p>Standard narrated film: <strong>{STANDARD_FILM_NAME}</strong>, {creditsPerReferenceVideo('cinematic_ai')} credits for 60 seconds. Free-film model: {FREE_FILM_ENGINE_NAME}. The trial shows {TRIAL_CREDITS_SHOWN} credits; eligibility and the actual duration are shown in Studio.</p><p>Plans start at {STARTER_MONTH} for {STARTER_CREDITS} monthly credits. Other creations share the same balance. <Link href="/pricing">See current plan and trial terms</Link>.</p><small>Facts reviewed <time dateTime={CITATION_TOOLS_REVIEWED_ISO}>{CITATION_TOOLS_REVIEWED_ISO}</time>. A topic or script is not a published film. No automatic upload, audience or revenue promise.</small></section>
   <section className="ct-section"><h2>Questions</h2>{questions.map(f=><details className="ct-panel" key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section>
  </div><footer className="ct-tool" style={{borderTop:"1px solid var(--kpl-line,#e4e4e0)"}}><Link href="/">Kineo</Link> · <Link href="/pricing">Plans and trial terms</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></footer>
 </main>
}
