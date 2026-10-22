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
import { KIDS_PRICES, KIDS_SALES_OPEN_FOR_PUBLIC, KIDS_VENDA_DURATION, KIDS_VIDEOS, kidsPriceLabel } from '@/lib/kidsVenda/kidsVenda' // KINEO-CARTOON-TRACAO-2210
import { formatSettlementMoney, settlementAmountMinor } from '@/lib/settlementCurrency' // KINEO-CARTOON-TRACAO-2210
import {
  KIDS_EN_PATH, KIDS_PT_PATH, PAGINAS_KIDS_BASE, PAGINAS_KIDS_CAMPAIGN, PAGINAS_KIDS_MARK, PAGINAS_KIDS_REVIEWED_ISO,
  paginasKidsAlternates, paginasKidsRobots,
} from '@/lib/seo/paginasKidsCartoon2010'

export type KidsLang = 'en' | 'pt'
type Qa = { q: string; a: string }

// BEGIN KINEO-CARTOON-TRACAO-2210 — P07 atualizado para a venda dedicada, sem prazo de geração inventado.
export const CARTOON_TRACTION_UPDATED_ISO = '2026-10-22'
const CARTOON_CITATION_CSS = `
.kug .kk-offer-table{margin:22px 0 0;width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--card);font-size:14px;line-height:1.55}
.kug .kk-offer-table caption{text-align:left;font-size:16px;font-weight:750;margin:0 0 12px;color:var(--txt)}
.kug .kk-offer-table th,.kug .kk-offer-table td{text-align:left;vertical-align:top;padding:16px;border-bottom:1px solid var(--line)}
.kug .kk-offer-table thead th{background:var(--blue-soft);color:var(--blue-ink);font-size:13px}
.kug .kk-offer-table tbody th{width:29%;font-weight:750;color:var(--txt)}
.kug .kk-offer-table td{color:var(--txt2)}.kug .kk-offer-table tbody tr:last-child>*{border-bottom:0}
.kug .kk-citation-note{margin:14px 0 0;color:var(--txt2);font-size:13px;line-height:1.6}
@media(max-width:760px){
.kug .kk-offer-table{border:0;border-radius:0;background:transparent}
.kug .kk-offer-table thead{position:absolute;clip-path:inset(50%);height:1px;width:1px;overflow:hidden;white-space:nowrap}
.kug .kk-offer-table tbody,.kug .kk-offer-table tr,.kug .kk-offer-table th,.kug .kk-offer-table td{display:block;width:100%}
.kug .kk-offer-table tbody tr{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin:0 0 14px}
.kug .kk-offer-table tbody th{width:100%;background:var(--blue-soft);padding:15px 16px}
.kug .kk-offer-table td{border-bottom:0;padding:9px 16px}.kug .kk-offer-table td:last-child{padding-bottom:16px}
.kug .kk-offer-table td::before{content:attr(data-label);display:block;font-size:12px;font-weight:750;color:var(--blue-ink);margin-bottom:2px}
}
`

/** Valores exibidos vêm do contrato vendido e da mesma conversão BRL do checkout. */
export function kidsPageCitation(lang: KidsLang) {
  const pt = lang === 'pt'
  const salesOpen = KIDS_SALES_OPEN_FOR_PUBLIC
  const monthly = kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)
  const pack = kidsPriceLabel(KIDS_PRICES.pack.usdMinor)
  const monthlyBrl = formatSettlementMoney('brl', settlementAmountMinor(KIDS_PRICES.autopilot.usdMinor, 'brl'))
  const packBrl = formatSettlementMoney('brl', settlementAmountMinor(KIDS_PRICES.pack.usdMinor, 'brl'))
  const duration = KIDS_VENDA_DURATION
  const total = KIDS_VIDEOS.autopilot
  const currencyNote = pt
    ? `Preços de referência em dólar; no Brasil, a cobrança é em reais: ${monthlyBrl}/mês no piloto ou ${packBrl} pelo pack. Confira a moeda e o total no checkout.`
    : `Reference prices are in US dollars. In Brazil, checkout charges in reais: ${monthlyBrl}/month for the pilot or ${packBrl} for the pack. Check the currency and total before paying.`
  return {
    answer: !salesOpen
      ? (pt
        ? 'A Kineo cria desenhos infantis 3D narrados a partir de uma ideia, usando um de seis personagens. Escolha português, inglês ou espanhol e uma história de 15 ou 35 segundos. Leia e edite antes de gerar. O custo aparece antes da confirmação. Pequenos detalhes do personagem podem variar entre cenas.'
        : 'Kineo creates narrated 3D kids cartoons from an idea, using one of six characters. Choose English, Portuguese or Spanish and a 15- or 35-second story. Read and edit the story before generating. The credit cost appears before confirmation. Small character details can vary between scenes.')
      : pt
      ? `A Kineo transforma uma ideia em desenho infantil 3D narrado, com legendas e um de seis personagens recorrentes. Escolha português, inglês ou espanhol e revise a história escrita antes de gerar. Experimente o primeiro episódio grátis, com marca d’água. A assinatura inclui ${total} episódios de ${duration} segundos mensais; também existe pack avulso.`
      : `Kineo turns an idea into a narrated 3D kids cartoon with captions and one of six recurring characters. Choose English, Portuguese or Spanish, and review the written story first. Try one watermarked episode free. The dedicated subscription includes ${total} episodes of ${duration} seconds per month; a one-time ${KIDS_VIDEOS.pack}-episode pack is also available.`,
    caption: pt ? 'O que vem em cada opção do AI Kids Cartoon' : 'What each AI Kids Cartoon option includes',
    headers: pt ? ['O que você recebe', 'Duração do vídeo', 'Tempo e entrega', 'Preço', 'Créditos'] : ['What you receive', 'Video duration', 'Timing and delivery', 'Price', 'Credits'],
    rows: pt ? [
      ['Primeiro episódio 3D narrado, com legendas e marca d’água', `${duration} s`, 'Sem prazo fixo de geração; 1 por conta elegível, com limites regionais e diários', 'Grátis', 'Não usa seu saldo de créditos'],
      [`Piloto: ${total} episódios do mesmo personagem e tema, com título, legenda e hashtags`, `${duration} s por episódio`, '1 novo episódio por dia, na biblioteca + e-mail; geração sem prazo fixo', `${monthly}/mês`, 'Geração incluída; não usa seu saldo de créditos'],
      [`Pack: ${KIDS_VIDEOS.pack} episódios do mesmo personagem e tema, para baixar da biblioteca`, `${duration} s por episódio`, 'Produção em fila; sem prazo fixo de conclusão', `${pack}, pagamento único`, 'Geração incluída; não usa seu saldo de créditos'],
    ] : [
      ['First narrated 3D episode with captions and a watermark', `${duration} s`, 'No fixed generation time; 1 per eligible account, with regional and daily limits', 'Free', 'Does not use your credit balance'],
      [`Pilot: ${total} episodes with the same character and theme, plus titles, captions and hashtags`, `${duration} s per episode`, '1 new episode per day, in your library + email; no fixed generation time', `${monthly}/month`, 'Generation included; does not use your credit balance'],
      [`Pack: ${KIDS_VIDEOS.pack} episodes with the same character and theme, to download from your library`, `${duration} s per episode`, 'Produced in a queue; no fixed completion time', `${pack}, one-time payment`, 'Generation included; does not use your credit balance'],
    ],
    currencyNote,
    manualNote: pt
      ? 'No gerador manual, você também pode escolher 15 ou 35 segundos. Escrever e editar a história é grátis; o custo do filme em créditos aparece antes da confirmação.'
      : 'In the manual generator, you can also choose 15 or 35 seconds. Writing and editing the story is free; the film credit cost appears before confirmation.',
    updated: pt ? 'Atualizado em: 22 de outubro de 2026' : 'Updated: October 22, 2026',
    faqs: (pt ? [
      { q: 'Quais idiomas estão disponíveis?', a: 'Português do Brasil, inglês e espanhol, com narração e legendas no idioma escolhido.' },
      { q: 'Quais personagens posso escolher?', a: 'Leo, Mia, Dino, Pip, Bibi ou Ollie — personagens próprios da Kineo.' },
      { q: 'O personagem será idêntico em todos os quadros?', a: 'A descrição e o estilo 3D são reutilizados em toda cena. Pequenos detalhes, como cabelo ou roupa, ainda podem variar.' },
      { q: 'Posso editar a história antes de gerar?', a: 'Sim. No gerador manual, você lê e altera a história escrita antes de confirmar a geração do desenho; escrever e editar não cobra créditos.' },
      { q: 'Existe assinatura dedicada ao Cartoon?', a: salesOpen ? `Sim. O piloto inclui ${total} episódios de ${duration} segundos por mês por ${monthly}/mês. O pack avulso inclui ${KIDS_VIDEOS.pack} episódios por ${pack}. O primeiro episódio elegível é grátis, com marca d’água. ${currencyNote}` : 'As ofertas dedicadas estão indisponíveis no momento. Consulte o gerador e a página de preços para as opções disponíveis.' },
    ] : [
      { q: 'Which languages are available?', a: 'English, Brazilian Portuguese and Spanish, with narration and captions in the chosen language.' },
      { q: 'Which characters can I choose?', a: 'Leo, Mia, Dino, Pip, Bibi or Ollie — Kineo’s own characters.' },
      { q: 'Will the character be identical in every frame?', a: 'The character description and 3D style are reused in every scene. Small details, such as hair or clothes, can still vary.' },
      { q: 'Can I edit the story before generating?', a: 'Yes. In the manual generator, read and edit the written story before confirming cartoon generation; writing and editing do not charge credits.' },
      { q: 'Is there a dedicated cartoon subscription?', a: salesOpen ? `Yes. The pilot includes ${total} episodes of ${duration} seconds per month for ${monthly}/month. The one-time pack includes ${KIDS_VIDEOS.pack} episodes for ${pack}. The first eligible episode is free and watermarked. ${currencyNote}` : 'Dedicated offers are currently unavailable. Check the generator and pricing page for available options.' },
    ]) as Qa[],
  }
}
// END KINEO-CARTOON-TRACAO-2210

export function kidsPageCopy(lang: KidsLang) {
  const citation = kidsPageCitation(lang) // KINEO-CARTOON-TRACAO-2210
  if (lang === 'pt') {
    return {
      title: 'Vídeos de desenho com IA — histórias infantis em 3D | Kineo',
      description: 'Escreva a ideia da história, escolha o personagem e receba um desenho 3D infantil narrado, com legenda, em 9:16. Sem promessa de renda: com avisos de "conteúdo para crianças" e selo de IA.',
      eyebrow: 'Vídeos de desenho com IA',
      h1: 'Vídeos de desenho com IA: histórias infantis em 3D a partir de uma ideia',
      lead: 'Você escreve a ideia (ou escolhe uma pronta), escolhe o personagem e a língua. A Kineo escreve uma história curta e inocente e entrega um desenho 3D vertical narrado, com legenda — o mesmo personagem do começo ao fim.',
      cta: 'Fazer meu primeiro desenho', how: 'Como funciona', note: 'O preço em créditos aparece no botão de gerar, antes de você confirmar.', reviewed: 'Revisado em',
      caption: 'Curta de teste feito no fluxo de filme (Seedance 1.5, estilo 3D). Saiu com a marca usekineo.com/free porque foi feito na conta da casa.',
      summaryHeading: 'O que é', summary: [citation.answer], // KINEO-CARTOON-TRACAO-2210
      stepsHeading: 'Em 3 passos', steps: [
        { title: 'Escolha o personagem', body: 'Leo, Mia, Dino, Pip, Bibi ou Ollie — personagens próprios da Kineo, não de outro estúdio.' },
        { title: 'Escreva a ideia', body: 'Uma linha basta ("aprende a dividir os brinquedos"), ou uma das 6 ideias prontas. Escolha a língua e 15 ou 35 s.' },
        { title: 'Gere o desenho', body: 'A história sai escrita para você ler e mudar o que quiser. Um botão faz o desenho ali mesmo, com o progresso e o download na mesma página.' },
      ],
      charsHeading: 'Os personagens', charsIntro: 'Cada um tem uma ficha fixa (aparência e roupa) que vai em toda cena. A IA ainda pode variar pequenos detalhes entre as cenas.',
      ideasHeading: 'Ideias prontas (varie as histórias)',
      faqHeading: 'Perguntas frequentes',
      closingTitle: 'Faça o seu primeiro desenho', closingBody: 'Escreva uma ideia, escolha o personagem e veja a história pronta antes de gastar qualquer crédito.',
      faqs: citation.faqs, // KINEO-CARTOON-TRACAO-2210
      rulesHeading: 'Antes de publicar', // KINEO-CARTOON-TRACAO-2210
      rules: [
        { q: 'Dá para ganhar dinheiro com esses vídeos?', a: 'Não prometemos renda. No YouTube, vídeo feito para crianças precisa ser marcado como "conteúdo para crianças" (regra da COPPA): sem anúncio personalizado e sem comentários, o que paga bem menos. As plataformas também desmonetizam canais de conteúdo repetitivo produzido em massa. Use os desenhos como conteúdo de família, escola, marca ou loja, com histórias variadas.' },
        { q: 'Preciso avisar que foi feito com IA?', a: 'Sim. YouTube, TikTok e Instagram pedem o rótulo de conteúdo gerado por IA. O template entrega uma legenda pronta com "Feito com IA" — ligue também o rótulo de IA da plataforma ao postar.' },
        { q: 'Que conteúdo não é aceito?', a: 'Desenho infantil é inocente: nada de romance ou nudez, violência ou armas, zombaria ou humilhação, nem produto adulto (álcool, cigarro, aposta). Além disso vale a moderação de sempre da Kineo. Também não use personagens de outros estúdios.' },
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
    summaryHeading: 'What it is', summary: [citation.answer], // KINEO-CARTOON-TRACAO-2210
    stepsHeading: 'In 3 steps', steps: [
      { title: 'Pick the character', body: 'Leo, Mia, Dino, Pip, Bibi or Ollie — Kineo’s own characters, not another studio’s.' },
      { title: 'Type the idea', body: 'One line is enough ("learns to share toys"), or one of 6 ready ideas. Choose the language and 15 or 35 s.' },
      { title: 'Generate the cartoon', body: 'You read the written story first and change anything you like. One button makes the cartoon right there, with progress and the download on the same page.' },
    ],
    charsHeading: 'The characters', charsIntro: 'Each one has a fixed sheet (look and outfit) that goes into every scene. The AI can still vary small details between scenes.',
    ideasHeading: 'Ready ideas (vary your stories)',
    faqHeading: 'FAQ',
    closingTitle: 'Make your first cartoon', closingBody: 'Type an idea, pick a character and read the finished story before you spend any credit.',
    faqs: citation.faqs, // KINEO-CARTOON-TRACAO-2210
    rulesHeading: 'Before publishing', // KINEO-CARTOON-TRACAO-2210
    rules: [
      { q: 'Can I make money with these videos?', a: 'We do not promise income. On YouTube, videos made for children must be set as "made for kids" (COPPA rules): no personalized ads and no comments, which pays far less. Platforms also demonetize channels that mass-produce repetitive content. Use the cartoons as family, school, brand or shop content, with varied stories.' },
      { q: 'Do I have to say it was made with AI?', a: 'Yes. YouTube, TikTok and Instagram ask you to label AI-generated content. The template gives you a ready caption with "Made with AI" — also turn on the platform’s AI label when you post.' },
      { q: 'What content is not allowed?', a: 'Kids cartoons stay innocent: no romance or nudity, no violence or weapons, no mocking or humiliation, and no adult products (alcohol, smoking, gambling). Kineo’s usual moderation applies too. Do not use characters owned by other studios.' },
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
  const citation = kidsPageCitation(lang) // KINEO-CARTOON-TRACAO-2210
  const pt = lang === 'pt'
  const path = pt ? KIDS_PT_PATH : KIDS_EN_PATH
  const campaign = pt ? PAGINAS_KIDS_CAMPAIGN.pt : PAGINAS_KIDS_CAMPAIGN.en
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  const howToLd = { '@context': 'https://schema.org', '@type': 'HowTo', name: c.h1, step: c.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body, url: `${PAGINAS_KIDS_BASE}${path}#how` })) }
  return (
    <main className="kug" lang={pt ? 'pt-BR' : 'en'} data-paginas-kids={PAGINAS_KIDS_MARK}>
      <style dangerouslySetInnerHTML={{ __html: UGC_PAGE_CSS + HOME_KIDS_CARD_CSS + CARTOON_CITATION_CSS }} />
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
          {/* BEGIN KINEO-CARTOON-TRACAO-2210 — tabela legível em desktop e em cartões no celular. */}
          {KIDS_SALES_OPEN_FOR_PUBLIC ? <>
            <table className="kk-offer-table" role="table">
              <caption>{citation.caption}</caption>
              <thead><tr>{citation.headers.map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
              <tbody>{citation.rows.map(([item, ...cells]) => <tr key={item}><th scope="row">{item}</th>{cells.map((cell, index) => <td key={citation.headers[index + 1]} data-label={citation.headers[index + 1]}>{cell}</td>)}</tr>)}</tbody>
            </table>
            <p className="kk-citation-note">{citation.currencyNote}</p>
          </> : null}
          <p className="kk-citation-note">{citation.manualNote}</p>
          <p className="kk-citation-note"><time dateTime={CARTOON_TRACTION_UPDATED_ISO}>{citation.updated}</time></p>
          {/* END KINEO-CARTOON-TRACAO-2210 */}
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
      {/* BEGIN KINEO-CARTOON-TRACAO-2210 — preserva as regras existentes fora das cinco FAQs citáveis. */}
      <section className="kug-sec" aria-labelledby="kk-publishing">
        <div className="kug-wrap">
          <h2 id="kk-publishing">{c.rulesHeading}</h2>
          <ul className="kug-rules">{c.rules.map((rule) => <li key={rule.q}><strong>{rule.q}</strong><br />{rule.a}</li>)}</ul>
        </div>
      </section>
      {/* END KINEO-CARTOON-TRACAO-2210 */}
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
