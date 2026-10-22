// KINEO-BEBE-QUE-FALA-2010 — as páginas públicas do "AI Kids Cartoon Stories": /ai-kids-cartoon-videos (EN) e
// /desenho-infantil-3d-com-ia (PT, hreflang nos dois). Mesma linguagem das páginas do UGC (UGC_PAGE_CSS de components/ugc/UgcPages.tsx):
// o que é, 3 passos, os 6 personagens, o exemplo real (o curta de teste nota 10, render 4f6c8a40), FAQ honesta e o botão.
// Interruptor: KIDS_CARTOON_PAGES_LIVE (lib/kidsCartoon/kidsCartoon.ts) — desligado, a rota responde 404 com noindex.
// Honestidade (fundador 20/10 + pesquisa docs/PESQUISA-BEBE-QUE-FALA-2026-10-20.md): sem prometer renda; avisa o "made for kids" do
// YouTube, o selo de IA das plataformas e a punição de conteúdo repetitivo em massa. Sem número de crédito: o preço aparece no
// botão de gerar (o mesmo de qualquer filme Seedance 1.5 da duração).
// KINEO-DESENHO-SOM-2110 — sem a pílula do motor no topo (fundador 21/10: nome de motor na porta de entrada "perde a vontade de comprar");
// os passos e a FAQ do preço dizem o fluxo novo (o filme sai na mesma página, com a linha de créditos logo acima do botão).
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import UgcVideo from '@/components/ugc/UgcVideo'
import KidsCtaLink from '@/components/kidsCartoon/KidsCtaLink'
import { KidsVendaCards } from '@/components/kidsCartoon/KidsVendaCards' // KINEO-KIDS-VENDA-2010 — piloto/pack/grátis (só com KIDS_SALES_LIVE; 16 línguas; sem promessa de renda)
import { UGC_PAGE_CSS } from '@/components/ugc/UgcPages'
import { KIDS_CARTOON_PAGES_LIVE, KIDS_CHARACTERS, KIDS_IDEAS } from '@/lib/kidsCartoon/kidsCartoon'
import { HOME_KIDS_CARD_CLIP, HOME_KIDS_CARD_CSS } from '@/lib/ui/homeKidsCard'
import {
  KIDS_EN_PATH, KIDS_PT_PATH, PAGINAS_KIDS_BASE, PAGINAS_KIDS_CAMPAIGN, PAGINAS_KIDS_MARK, PAGINAS_KIDS_REVIEWED_ISO,
  paginasKidsAlternates, paginasKidsRobots,
} from '@/lib/seo/paginasKidsCartoon2010'

export type KidsLang = 'en' | 'pt'
type Qa = { q: string; a: string }

export function kidsPageCopy(lang: KidsLang) {
  if (lang === 'pt') {
    return {
      title: 'Vídeos de desenho com IA — histórias infantis em 3D | Kineo',
      description: 'Escreva a ideia da história, escolha o personagem e receba um desenho 3D infantil narrado, com legenda, em 9:16. Sem promessa de renda: com avisos de "conteúdo para crianças" e selo de IA.',
      eyebrow: 'Vídeos de desenho com IA',
      h1: 'Vídeos de desenho com IA: histórias infantis em 3D a partir de uma ideia',
      lead: 'Você escreve a ideia (ou escolhe uma pronta), escolhe o personagem e a língua. A Kineo escreve uma história curta e inocente e entrega um desenho 3D vertical narrado, com legenda — o mesmo personagem do começo ao fim.',
      cta: 'Fazer meu primeiro desenho', how: 'Como funciona', note: 'O preço em créditos aparece no botão de gerar, antes de você confirmar.', reviewed: 'Revisado em',
      caption: 'Curta de teste feito no fluxo de filme (Seedance 1.5, estilo 3D). Saiu com a marca usekineo.com/free porque foi feito na conta da casa.',
      summaryHeading: 'O que é', summary: [
        'Um curta de 15 ou 35 segundos em desenho 3D, no formato vertical das redes, com narração e legenda. A história é escrita pela IA a partir da sua ideia, curta e inocente, com um final gentil.',
        'O filme sai pelo motor Seedance 1.5, o mesmo dos filmes da Kineo, com o estilo 3D travado e a descrição do personagem repetida em toda cena.',
      ],
      stepsHeading: 'Em 3 passos', steps: [
        { title: 'Escolha o personagem', body: 'Leo, Mia, Dino, Pip, Bibi ou Ollie — personagens próprios da Kineo, não de outro estúdio.' },
        { title: 'Escreva a ideia', body: 'Uma linha basta ("aprende a dividir os brinquedos"), ou uma das 6 ideias prontas. Escolha a língua e 15 ou 35 s.' },
        { title: 'Gere o desenho', body: 'A história sai escrita para você ler e mudar o que quiser. Um botão faz o desenho ali mesmo, com o progresso e o download na mesma página.' },
      ],
      charsHeading: 'Os personagens', charsIntro: 'Cada um tem uma ficha fixa (aparência e roupa) que vai em toda cena. A IA ainda pode variar pequenos detalhes entre as cenas.',
      ideasHeading: 'Ideias prontas (varie as histórias)',
      faqHeading: 'Perguntas frequentes',
      closingTitle: 'Faça o seu primeiro desenho', closingBody: 'Escreva uma ideia, escolha o personagem e veja a história pronta antes de gastar qualquer crédito.',
      faqs: [
        { q: 'Dá para ganhar dinheiro com esses vídeos?', a: 'Não prometemos renda. No YouTube, vídeo feito para crianças precisa ser marcado como "conteúdo para crianças" (regra da COPPA): sem anúncio personalizado e sem comentários, o que paga bem menos. As plataformas também desmonetizam canais de conteúdo repetitivo produzido em massa. Use os desenhos como conteúdo de família, escola, marca ou loja, com histórias variadas.' },
        { q: 'Preciso avisar que foi feito com IA?', a: 'Sim. YouTube, TikTok e Instagram pedem o rótulo de conteúdo gerado por IA. O template entrega uma legenda pronta com "Feito com IA" — ligue também o rótulo de IA da plataforma ao postar.' },
        { q: 'Quanto custa?', a: 'O mesmo que qualquer filme da Kineo na duração escolhida (15 ou 35 s). Logo acima do botão aparece quantos créditos ele usa e com quantos você fica, antes de confirmar; escrever a história não cobra nada.' },
        { q: 'O personagem fica igual em todas as cenas?', a: 'A descrição do personagem e o estilo 3D vão em toda cena. Na maioria dos filmes ele fica reconhecível do começo ao fim, mas é IA: detalhes como cabelo ou roupa ainda podem variar um pouco.' },
        { q: 'Que conteúdo não é aceito?', a: 'Desenho infantil é inocente: nada de romance ou nudez, violência ou armas, zombaria ou humilhação, nem produto adulto (álcool, cigarro, aposta). Além disso vale a moderação de sempre da Kineo. Também não use personagens de outros estúdios.' },
        { q: 'Em que línguas?', a: 'O template escreve em português, inglês ou espanhol; a narração e a legenda saem na língua escolhida.' },
      ] as Qa[],
    }
  }
  return {
    title: 'AI Cartoon Videos — 3D kids cartoon stories | Kineo',
    description: 'Type a story idea, pick a character and get a narrated 3D kids cartoon with captions in 9:16. No income promises: includes the "made for kids" and AI-label rules.',
    eyebrow: 'AI cartoon videos',
    h1: 'AI cartoon videos: narrated 3D kids stories from one idea',
    lead: 'You type the idea (or pick a ready one), choose the character and the language. Kineo writes a short, innocent story and renders a vertical 3D cartoon with narration and captions — the same character from start to finish.',
    cta: 'Make my first cartoon', how: 'How it works', note: 'The credit price shows on the Generate button, before you confirm.', reviewed: 'Reviewed',
    caption: 'Test short made with the film flow (Seedance 1.5, 3D style). It carries the usekineo.com/free mark because it was made on the house account.',
    summaryHeading: 'What it is', summary: [
      'A 15- or 35-second 3D cartoon in the vertical social format, with narration and captions. The AI writes the story from your idea: short, innocent and with a kind ending.',
      'The film is rendered on Seedance 1.5, the same engine as Kineo films, with the 3D style locked and the character description repeated in every scene.',
    ],
    stepsHeading: 'In 3 steps', steps: [
      { title: 'Pick the character', body: 'Leo, Mia, Dino, Pip, Bibi or Ollie — Kineo’s own characters, not another studio’s.' },
      { title: 'Type the idea', body: 'One line is enough ("learns to share toys"), or one of 6 ready ideas. Choose the language and 15 or 35 s.' },
      { title: 'Generate the cartoon', body: 'You read the written story first and change anything you like. One button makes the cartoon right there, with progress and the download on the same page.' },
    ],
    charsHeading: 'The characters', charsIntro: 'Each one has a fixed sheet (look and outfit) that goes into every scene. The AI can still vary small details between scenes.',
    ideasHeading: 'Ready ideas (vary your stories)',
    faqHeading: 'FAQ',
    closingTitle: 'Make your first cartoon', closingBody: 'Type an idea, pick a character and read the finished story before you spend any credit.',
    faqs: [
      { q: 'Can I make money with these videos?', a: 'We do not promise income. On YouTube, videos made for children must be set as "made for kids" (COPPA rules): no personalized ads and no comments, which pays far less. Platforms also demonetize channels that mass-produce repetitive content. Use the cartoons as family, school, brand or shop content, with varied stories.' },
      { q: 'Do I have to say it was made with AI?', a: 'Yes. YouTube, TikTok and Instagram ask you to label AI-generated content. The template gives you a ready caption with "Made with AI" — also turn on the platform’s AI label when you post.' },
      { q: 'How much does it cost?', a: 'The same as any Kineo film of the length you choose (15 or 35 s). Right above the button you see how many credits it uses and how many you will have left, before you confirm; writing the story is free.' },
      { q: 'Does the character stay the same in every scene?', a: 'The character description and the 3D style go into every scene. In most films the character stays recognizable from start to finish, but this is AI: details like hair or clothes can still vary a little.' },
      { q: 'What content is not allowed?', a: 'Kids cartoons stay innocent: no romance or nudity, no violence or weapons, no mocking or humiliation, and no adult products (alcohol, smoking, gambling). Kineo’s usual moderation applies too. Do not use characters owned by other studios.' },
      { q: 'Which languages?', a: 'The template writes in English, Portuguese or Spanish; narration and captions come out in the chosen language.' },
    ] as Qa[],
  }
}

function ld(obj: unknown) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }} />
}

export function kidsPageMetadata(lang: KidsLang): Metadata {
  const c = kidsPageCopy(lang)
  const alternates = paginasKidsAlternates(lang === 'pt' ? KIDS_PT_PATH : KIDS_EN_PATH)
  return {
    title: { absolute: c.title },
    description: c.description,
    alternates,
    robots: paginasKidsRobots(KIDS_CARTOON_PAGES_LIVE),
    openGraph: { title: c.title, description: c.description, url: alternates.canonical, type: 'website', siteName: 'Kineo (usekineo.com)', locale: lang === 'pt' ? 'pt_BR' : 'en_US' },
  }
}

export function KidsCartoonPage({ lang }: { lang: KidsLang }) {
  const c = kidsPageCopy(lang)
  const pt = lang === 'pt'
  const path = pt ? KIDS_PT_PATH : KIDS_EN_PATH
  const campaign = pt ? PAGINAS_KIDS_CAMPAIGN.pt : PAGINAS_KIDS_CAMPAIGN.en
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  const howToLd = { '@context': 'https://schema.org', '@type': 'HowTo', name: c.h1, step: c.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body, url: `${PAGINAS_KIDS_BASE}${path}#how` })) }
  return (
    <main className="kug" lang={pt ? 'pt-BR' : 'en'} data-paginas-kids={PAGINAS_KIDS_MARK}>
      <style dangerouslySetInnerHTML={{ __html: UGC_PAGE_CSS + HOME_KIDS_CARD_CSS }} />
      {ld(faqLd)}{ld(howToLd)}
      <div className="kug-wrap">
        <nav className="kug-nav" aria-label={pt ? 'Navegação' : 'Main navigation'}>
          <Link className="kug-brand" href="/">Kineo</Link>
          <Link className="kug-hide-sm" href={pt ? KIDS_EN_PATH : KIDS_PT_PATH}>{pt ? 'English' : 'Português'}</Link>
          <Link href="/pricing">{pt ? 'Preços' : 'Pricing'}</Link>
        </nav>
        <header className="kug-hero">
          <div>
            <p className="kug-eyebrow">{c.eyebrow}</p>
            <h1>{c.h1}</h1>
            <p className="kug-lead">{c.lead}</p>
            <div className="kug-actions">
              <KidsCtaLink className="kug-cta" campaign={campaign} placement="hero">{c.cta} <span aria-hidden="true">→</span></KidsCtaLink>
              <a className="kug-link" href="#how">{c.how}</a>
            </div>
            <p className="kug-note">{c.note}</p>
            <p className="kug-reviewed">{c.reviewed} {PAGINAS_KIDS_REVIEWED_ISO}</p>
          </div>
          <figure className="kug-media" style={{ margin: 0 }}>
            <span className="k3c-kids-art" aria-hidden="true" />
            {HOME_KIDS_CARD_CLIP ? <UgcVideo src={HOME_KIDS_CARD_CLIP.src} poster={HOME_KIDS_CARD_CLIP.poster} label={c.h1} /> : null}
            <span className="kug-shade" aria-hidden="true" />
            <figcaption className="kug-cap">{c.caption}</figcaption>
          </figure>
        </header>
      </div>
      <section className="kug-sec" aria-labelledby="kk-summary">
        <div className="kug-wrap">
          <h2 id="kk-summary">{c.summaryHeading}</h2>
          <div className="kug-summary">{c.summary.map((p) => <p key={p}>{p}</p>)}</div>
        </div>
      </section>
      <section className="kug-sec" id="how" aria-labelledby="kk-how">
        <div className="kug-wrap">
          <h2 id="kk-how">{c.stepsHeading}</h2>
          <ol className="kug-steps">{c.steps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>)}</ol>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kk-chars">
        <div className="kug-wrap">
          <h2 id="kk-chars">{c.charsHeading}</h2>
          <p className="kug-intro">{c.charsIntro}</p>
          <div className="kug-grid3">{KIDS_CHARACTERS.map((ch) => <article className="kug-card" key={ch.id} data-kids-character={ch.id}><h3>{ch.name} · {ch.kind[lang]}</h3><p>{ch.sheet.replace(/^[^,]+,\s*/, '')}</p></article>)}</div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kk-ideas">
        <div className="kug-wrap">
          <h2 id="kk-ideas">{c.ideasHeading}</h2>
          <ul className="kug-rules">{KIDS_IDEAS.map((i) => <li key={i.id}>{i[lang]}</li>)}</ul>
        </div>
      </section>
      <div className="kug-wrap"><KidsVendaCards lang={lang} surface="page" /></div>{/* KINEO-KIDS-VENDA-2010 — os planos (piloto US$ 29/mês · pack US$ 49 · 1º grátis) antes do FAQ; nada com a venda desligada */}
      <section className="kug-sec" aria-labelledby="kk-faq">
        <div className="kug-wrap">
          <h2 id="kk-faq">{c.faqHeading}</h2>
          <div className="kug-faq">{c.faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </div>
      </section>
      <div className="kug-wrap">
        <div className="kug-closing">
          <div><h2>{c.closingTitle}</h2><p>{c.closingBody}</p></div>
          <KidsCtaLink className="kug-cta" campaign={campaign} placement="closing">{c.cta} <span aria-hidden="true">→</span></KidsCtaLink>
        </div>
      </div>
      <Footer />
    </main>
  )
}
