// KINEO-BEBE-QUE-FALA-2010 — as páginas públicas do "AI Baby Podcast": /ai-baby-podcast-videos (EN) e /videos-bebe-podcast-ia (PT), no padrão
// das páginas do UGC (UGC_PAGE_CSS). Interruptor: BABY_PODCAST_PAGES_LIVE (lib/kidsCartoon/babyPodcast.ts) — desligado = 404 + noindex.
// Honestidade (pesquisa docs/PESQUISA-BEBE-QUE-FALA-2026-10-20.md): humor/marca/UGC, nunca "renda passiva"; bebê fotorrealista = rótulo de IA
// obrigatório; texto ORIGINAL (dublar podcast alheio esbarra em "conteúdo reutilizado"); sem número de crédito (o preço fica no botão).
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import BabyCtaLink from '@/components/kidsCartoon/BabyCtaLink'
import { UGC_PAGE_CSS } from '@/components/ugc/UgcPages'
import { HOME_KIDS_CARD_CSS } from '@/lib/ui/homeKidsCard'
import { BABY_PODCAST_ENGINE_LABEL, BABY_PODCAST_PAGES_LIVE, BABY_PODCAST_PATHS, babiesReady } from '@/lib/kidsCartoon/babyPodcast'
import { PAGINAS_KIDS_BASE, PAGINAS_KIDS_REVIEWED_ISO, paginasKidsRobots } from '@/lib/seo/paginasKidsCartoon2010'

export type BabyLang = 'en' | 'pt'

export function babyPageCopy(lang: BabyLang) {
  if (lang === 'pt') {
    return {
      title: 'Bebê podcast com IA — vídeos de bebê falando | Kineo',
      description: 'Escolha um bebê de IA com fone e microfone, escreva o tema e receba um clipe vertical do bebê falando, com voz sincronizada e legenda. Humor inocente, com selo de IA.',
      eyebrow: 'Bebê podcast com IA', h1: 'Vídeos de bebê podcast com IA, a partir de um tema',
      lead: 'Você escolhe um dos bebês da Kineo (fone, microfone, estúdio aconchegante), escreve o tema ou cola o texto, e recebe um clipe 9:16 do bebê falando, com a boca sincronizada à voz e legenda.',
      cta: 'Fazer meu vídeo de bebê', how: 'Como funciona', note: 'O preço em créditos aparece no botão de gerar, antes de você confirmar.', reviewed: 'Revisado em',
      steps: [
        { title: 'Escolha o bebê', body: 'Retratos fixos da Kineo — o mesmo bebê volta sempre, bom para série.' },
        { title: 'Escreva o tema', body: 'A IA escreve 30 a 45 palavras engraçadas e inocentes, ou você cola o seu texto (português ou inglês).' },
        { title: 'Gere o clipe', body: 'O bebê fala com voz infantil e lábios sincronizados (Kling AI Avatar); a legenda entra sozinha.' },
      ],
      faqHeading: 'Perguntas frequentes', closingTitle: 'Faça o seu bebê podcast', closingBody: 'Escreva o tema e leia a fala antes de gastar qualquer crédito.',
      faqs: [
        { q: 'Dá para ganhar dinheiro com isso?', a: 'Não prometemos renda. Use o bebê podcast como humor, conteúdo de marca ou anúncio UGC. Clipes abaixo de 1 minuto não entram em programas como o Creator Rewards, e as plataformas desmonetizam conteúdo repetitivo produzido em massa — varie os temas.' },
        { q: 'Preciso avisar que é IA?', a: 'Sim. Um bebê fotorrealista é conteúdo de IA realista: YouTube, TikTok e Instagram exigem o rótulo de IA. A tela entrega uma legenda com "Gerado por IA" — ligue também o rótulo da plataforma ao postar.' },
        { q: 'Posso dublar um podcast famoso?', a: 'Não. O texto é original, escrito pela IA ou por você. Usar áudio de outro podcast esbarra em direitos e na regra de conteúdo reutilizado das plataformas.' },
        { q: 'Quanto custa?', a: 'O mesmo do apresentador de IA da Kineo para esse clipe curto; o número em créditos aparece no botão de gerar antes de você confirmar. Escrever a fala não cobra nada.' },
        { q: 'Que conteúdo não é aceito?', a: 'É uma figura infantil: nada de romance ou nudez, violência ou armas, palavrão, zombaria ou humilhação, nem produto adulto (álcool, cigarro, aposta). Vale também a moderação de sempre da Kineo.' },
        { q: 'É conteúdo para crianças?', a: 'O bebê podcast é humor para adultos. Se você fizer um vídeo pensado para crianças, o YouTube exige marcá-lo como "conteúdo para crianças" (sem anúncio personalizado e sem comentários).' },
      ],
    }
  }
  return {
    title: 'AI Baby Podcast — talking baby podcast videos | Kineo',
    description: 'Pick an AI baby with headphones and a mic, type a topic and get a vertical clip of the baby talking, with lip-synced voice and captions. Innocent humor, AI-labeled.',
    eyebrow: 'AI baby podcast', h1: 'Talking baby podcast videos with AI, from one topic',
    lead: 'Pick one of Kineo’s babies (headphones, studio mic, cozy room), type a topic or paste your text, and get a 9:16 clip of the baby talking, lips synced to the voice, with captions.',
    cta: 'Make my baby video', how: 'How it works', note: 'The credit price shows on the Generate button, before you confirm.', reviewed: 'Reviewed',
    steps: [
      { title: 'Pick the baby', body: 'Kineo’s fixed portraits — the same baby comes back every time, great for a series.' },
      { title: 'Type the topic', body: 'The AI writes 30–45 funny, innocent words, or you paste your own text (English or Portuguese).' },
      { title: 'Generate the clip', body: 'The baby talks with a childlike voice and synced lips (Kling AI Avatar); captions are added for you.' },
    ],
    faqHeading: 'FAQ', closingTitle: 'Make your baby podcast', closingBody: 'Type the topic and read the lines before you spend any credit.',
    faqs: [
      { q: 'Can I make money with this?', a: 'We do not promise income. Use the baby podcast as humor, brand content or a UGC-style ad. Clips under 1 minute do not qualify for programs like Creator Rewards, and platforms demonetize mass-produced repetitive content — vary your topics.' },
      { q: 'Do I have to say it is AI?', a: 'Yes. A photorealistic baby is realistic AI content: YouTube, TikTok and Instagram require the AI label. The screen gives you a caption with "AI-generated" — also turn on the platform’s AI label when you post.' },
      { q: 'Can I dub a famous podcast?', a: 'No. The lines are original, written by the AI or by you. Reusing another podcast’s audio runs into rights issues and the platforms’ reused-content rules.' },
      { q: 'How much does it cost?', a: 'The same as Kineo’s AI presenter for this short clip; the credit number shows on the Generate button before you confirm. Writing the lines is free.' },
      { q: 'What content is not allowed?', a: 'It is a child figure: no romance or nudity, no violence or weapons, no swearing, no mocking or humiliation, and no adult products (alcohol, smoking, gambling). Kineo’s usual moderation applies too.' },
      { q: 'Is this made for kids?', a: 'The baby podcast is humor for adults. If you make a video aimed at children, YouTube requires you to set it as "made for kids" (no personalized ads, no comments).' },
    ],
  }
}

function ld(obj: unknown) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }} />
}

export function babyPageMetadata(lang: BabyLang): Metadata {
  const c = babyPageCopy(lang)
  const path = lang === 'pt' ? BABY_PODCAST_PATHS.pt : BABY_PODCAST_PATHS.en
  return {
    title: { absolute: c.title },
    description: c.description,
    alternates: { canonical: `${PAGINAS_KIDS_BASE}${path}`, languages: { en: `${PAGINAS_KIDS_BASE}${BABY_PODCAST_PATHS.en}`, 'pt-BR': `${PAGINAS_KIDS_BASE}${BABY_PODCAST_PATHS.pt}`, 'x-default': `${PAGINAS_KIDS_BASE}${BABY_PODCAST_PATHS.en}` } },
    robots: paginasKidsRobots(BABY_PODCAST_PAGES_LIVE),
    openGraph: { title: c.title, description: c.description, url: `${PAGINAS_KIDS_BASE}${path}`, type: 'website', siteName: 'Kineo (usekineo.com)', locale: lang === 'pt' ? 'pt_BR' : 'en_US' },
  }
}

export function BabyPodcastPage({ lang }: { lang: BabyLang }) {
  const c = babyPageCopy(lang)
  const pt = lang === 'pt'
  const campaign = pt ? 'baby_podcast_page_pt' : 'baby_podcast_page'
  const babies = babiesReady()
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  return (
    <main className="kug" lang={pt ? 'pt-BR' : 'en'} data-paginas-baby="KINEO-BEBE-QUE-FALA-2010">
      <style dangerouslySetInnerHTML={{ __html: UGC_PAGE_CSS + HOME_KIDS_CARD_CSS }} />
      {ld(faqLd)}
      <div className="kug-wrap">
        <nav className="kug-nav" aria-label={pt ? 'Navegação' : 'Main navigation'}>
          <Link className="kug-brand" href="/">Kineo</Link>
          <Link className="kug-hide-sm" href={pt ? BABY_PODCAST_PATHS.en : BABY_PODCAST_PATHS.pt}>{pt ? 'English' : 'Português'}</Link>
          <Link href="/pricing">{pt ? 'Preços' : 'Pricing'}</Link>
        </nav>
        <header className="kug-hero">
          <div>
            <p className="kug-eyebrow">{c.eyebrow}</p>
            <h1>{c.h1}</h1>
            <p className="kug-lead">{c.lead}</p>
            <div className="kug-actions">
              <BabyCtaLink className="kug-cta" campaign={campaign} placement="hero">{c.cta} <span aria-hidden="true">→</span></BabyCtaLink>
              <a className="kug-link" href="#how">{c.how}</a>
            </div>
            <p className="kug-note">{c.note}</p>
            <p className="kug-reviewed">{c.reviewed} {PAGINAS_KIDS_REVIEWED_ISO}</p>
          </div>
          <figure className="kug-media" style={{ margin: 0 }}>
            {babies[0] ? <img src={babies[0].portrait} alt={pt ? 'Bebê de IA com fone e microfone' : 'AI baby with headphones and a microphone'} /> : <span className="k3c-kids-art" aria-hidden="true" />}
            <span className="kug-shade" aria-hidden="true" />
            <span className="kug-badge" aria-hidden="true">{BABY_PODCAST_ENGINE_LABEL} · AI-GENERATED</span>
          </figure>
        </header>
      </div>
      <section className="kug-sec" id="how" aria-labelledby="kb-how">
        <div className="kug-wrap">
          <h2 id="kb-how">{pt ? 'Em 3 passos' : 'In 3 steps'}</h2>
          <ol className="kug-steps">{c.steps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>)}</ol>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kb-faq">
        <div className="kug-wrap">
          <h2 id="kb-faq">{c.faqHeading}</h2>
          <div className="kug-faq">{c.faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </div>
      </section>
      <div className="kug-wrap">
        <div className="kug-closing">
          <div><h2>{c.closingTitle}</h2><p>{c.closingBody}</p></div>
          <BabyCtaLink className="kug-cta" campaign={campaign} placement="closing">{c.cta} <span aria-hidden="true">→</span></BabyCtaLink>
        </div>
      </div>
      <Footer />
    </main>
  )
}
