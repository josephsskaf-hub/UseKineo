import type { Metadata } from 'next'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { BF_TEMPLATE_IDS, bfTemplate, bfTemplateHref, type BfLanguage } from '@/lib/ads/bfCampaign'
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { ADS_ESCOLHA_SAMPLE_SECONDS } from '@/lib/ads/cena/escolhaSamplePolicy'
import { KIT_BF_CREDITS, KIT_BF_CHECKOUT_HREF, KIT_BF_SALE_ENDS_AT, kitBfCardText, kitBfSaleOpen } from '@/lib/ads/kitBfSale'
import { BF_EN_PATH, BF_PT_PATH, BF_ES_PATH, paginasUgcAlternates } from '@/lib/seo/paginasUgc2010'

const COPY = {
  en: {
    title: 'Black Friday Video Ad Kit: 3 Templates | Kineo',
    description: 'Start your Black Friday video ads with three editable templates. Add your product and real offer, review the script, then generate in Kineo.',
    date: 'Black Friday · November 27, 2026', h1: 'Your offer.\nThree ways to tell it.',
    lead: 'Turn your Black Friday promotion into a video ad. Choose a starting point, add your product photo and confirm your real offer.',
    choose: 'Choose your template', plans: 'See plans', nav: 'Video ads',
    intro: 'Three templates. Your product. Your terms.',
    note: 'Each opens an editable setup in Studio Ads. Sign in to continue; no video is generated and no credits are spent when you choose.',
    use: 'Use this template', preview: 'AD STRUCTURE',
    beats: [['Your product', 'Why buy it', 'Offer on the final shot'], ['Your product', 'Why buy it', 'Deadline on the final shot'], ['Your product', 'Its real benefit', 'Discount on the final shot']],
    visuals: ['YOUR OFFER', 'YOUR END DATE', 'YOUR PRODUCT'],
    steps: ['Add your product photo and replace the product placeholder.', 'Enter the approved offer and dates. Choose a person and scene, then review the script.', 'Generate your video, download it and upload it to your campaign platform.'],
    how: 'From template to campaign', price: 'Generate with credits you already have',
    paid: (n: number) => `A full ad is 15 s and costs ${n} credits. Each template starts a separate ad; selecting all three does not generate a batch.`,
    sample: (n: number) => `An ${n} s watermarked sample may be available once per eligible account, in selected countries, with confirmed email and subject to the daily limit. Your account’s eligibility is checked in the editor. It is not a free full ad.`,
    kit: 'Need credits? The Black Friday pack',
    business: 'Business customers use their monthly credits; there is no extra kit to buy. Other existing balances and eligible paid plans also work.',
    format: 'Output: vertical 9:16. The offer or deadline appears as final visual text, not in the voice-over. Countdown is not a live timer. No automatic ad publishing or media buying. Review the AI output before using it.',
    ready: 'Start with the offer you can stand behind.', footer: 'AI UGC Ads guide',
    faqs: [
      { q: 'Are these finished videos?', a: 'They are editable ad setups. Supply your own product photo, product facts and confirmed offer, then review the script before generating.' },
      { q: 'Does countdown add an animated timer?', a: 'No. This template displays your confirmed deadline as final visual text. The video is not a live countdown and does not update its dates automatically.' },
      { q: 'Will Kineo launch my campaign?', a: 'You download the generated video and upload it to your chosen ad platform. Kineo does not publish the ad, buy media or guarantee approval or sales.' },
    ],
  },
  pt: {
    title: 'Kit Black Friday: 3 Modelos de Anúncio | Kineo',
    description: 'Comece seus anúncios de Black Friday com três modelos editáveis. Adicione produto e oferta real, revise o roteiro e gere o vídeo na Kineo.',
    date: 'Black Friday · 27 de novembro de 2026', h1: 'Sua oferta.\nTrês jeitos de contar.',
    lead: 'Transforme sua promoção de Black Friday em anúncio em vídeo. Escolha um modelo, adicione a foto do produto e confirme sua oferta real.',
    choose: 'Escolher meu modelo', plans: 'Ver planos', nav: 'Anúncios em vídeo',
    intro: 'Três modelos. Seu produto. Suas condições.',
    note: 'Cada modelo abre um anúncio editável no Studio Ads. Entre na conta para continuar; escolher não gera vídeo nem gasta créditos.',
    use: 'Usar este modelo', preview: 'ESTRUTURA DO ANÚNCIO',
    beats: [['Seu produto', 'Por que comprar', 'Oferta no final'], ['Seu produto', 'Por que comprar', 'Prazo no final'], ['Seu produto', 'Benefício real', 'Desconto no final']],
    visuals: ['SUA OFERTA', 'SEU PRAZO', 'SEU PRODUTO'],
    steps: ['Adicione a foto e substitua o marcador pelo nome do seu produto.', 'Informe oferta e datas aprovadas. Escolha pessoa e cenário, depois revise o roteiro.', 'Gere o vídeo, baixe e envie para a plataforma da sua campanha.'],
    how: 'Do modelo à campanha', price: 'Gere com os créditos que você já tem',
    paid: (n: number) => `O anúncio completo tem 15 s e custa ${n} créditos. Cada modelo inicia um anúncio separado; escolher os três não gera um lote.`,
    sample: (n: number) => `Uma amostra de ${n} s com marca pode estar disponível uma vez por conta elegível, em países selecionados, com e-mail confirmado e sujeita ao limite diário. O editor verifica sua elegibilidade. Não é um anúncio completo grátis.`,
    kit: 'Precisa de créditos? O pacote Black Friday',
    business: 'Clientes Business usam seus créditos mensais; não precisam comprar outro kit. Outros saldos existentes e planos pagos elegíveis também servem.',
    format: 'Saída vertical 9:16. Oferta e prazo aparecem como texto visual final, não na narração. Contagem regressiva não é relógio ao vivo. Sem publicação automática nem compra de mídia. Revise o resultado da IA antes de usar.',
    ready: 'Comece pela oferta que você pode cumprir.', footer: 'Guia de anúncios UGC com IA',
    faqs: [
      { q: 'São vídeos prontos?', a: 'São anúncios editáveis. Informe foto, fatos do produto e oferta confirmada; depois revise o roteiro antes de gerar.' },
      { q: 'A contagem regressiva inclui relógio animado?', a: 'Não. O modelo coloca seu prazo confirmado no texto visual final. O vídeo não tem contagem ao vivo e não atualiza datas automaticamente.' },
      { q: 'A Kineo publica minha campanha?', a: 'Você baixa o vídeo gerado e envia à plataforma de anúncios escolhida. A Kineo não publica, compra mídia nem garante aprovação ou vendas.' },
    ],
  },
  es: {
    title: 'Kit Black Friday: 3 Plantillas de Anuncio | Kineo',
    description: 'Empieza tus anuncios de Black Friday con tres plantillas editables. Añade tu producto y oferta real, revisa el guion y genera el vídeo en Kineo.',
    date: 'Black Friday · 27 de noviembre de 2026', h1: 'Tu oferta.\nTres formas de contarla.',
    lead: 'Convierte tu promoción de Black Friday en un anuncio en vídeo. Elige una plantilla, añade la foto del producto y confirma tu oferta real.',
    choose: 'Elegir mi plantilla', plans: 'Ver planes', nav: 'Anuncios en vídeo',
    intro: 'Tres plantillas. Tu producto. Tus condiciones.',
    note: 'Cada plantilla abre un anuncio editable en Studio Ads. Inicia sesión para continuar; elegir no genera vídeos ni gasta créditos.',
    use: 'Usar esta plantilla', preview: 'ESTRUCTURA DEL ANUNCIO',
    beats: [['Tu producto', 'Por qué comprar', 'Oferta al final'], ['Tu producto', 'Por qué comprar', 'Plazo al final'], ['Tu producto', 'Beneficio real', 'Descuento al final']],
    visuals: ['TU OFERTA', 'TU PLAZO', 'TU PRODUCTO'],
    steps: ['Añade la foto y sustituye el marcador por el nombre del producto.', 'Introduce la oferta y las fechas aprobadas. Elige persona y escenario, y revisa el guion.', 'Genera el vídeo, descárgalo y súbelo a la plataforma de tu campaña.'],
    how: 'De la plantilla a la campaña', price: 'Genera con los créditos que ya tienes',
    paid: (n: number) => `El anuncio completo dura 15 s y cuesta ${n} créditos. Cada plantilla inicia un anuncio separado; elegir las tres no genera un lote.`,
    sample: (n: number) => `Una muestra de ${n} s con marca puede estar disponible una vez por cuenta elegible, en países seleccionados, con correo confirmado y sujeta al límite diario. El editor comprueba tu elegibilidad. No es un anuncio completo gratis.`,
    kit: '¿Necesitas créditos? El paquete Black Friday',
    business: 'Los clientes Business usan sus créditos mensuales; no necesitan comprar otro kit. También sirven otros saldos existentes y planes de pago elegibles.',
    format: 'Salida vertical 9:16. La oferta y el plazo aparecen como texto visual final, no en la voz. Cuenta atrás no es un reloj en directo. Sin publicación automática ni compra de medios. Revisa el resultado de la IA antes de usarlo.',
    ready: 'Empieza con la oferta que puedes cumplir.', footer: 'Guía de anuncios UGC con IA',
    faqs: [
      { q: '¿Son vídeos terminados?', a: 'Son anuncios editables. Añade foto, datos del producto y oferta confirmada, y revisa el guion antes de generar.' },
      { q: '¿La cuenta atrás incluye un reloj animado?', a: 'No. La plantilla muestra tu plazo confirmado como texto visual final. El vídeo no tiene una cuenta en directo ni actualiza sus fechas automáticamente.' },
      { q: '¿Kineo publica mi campaña?', a: 'Descarga el vídeo generado y súbelo a tu plataforma de anuncios. Kineo no publica, compra medios ni garantiza aprobación o ventas.' },
    ],
  },
}

const PATHS = { en: BF_EN_PATH, pt: BF_PT_PATH, es: BF_ES_PATH }
const CSS = `
.kbf{--ink:#12251f;--muted:#59685f;--paper:#f6f7f1;--line:#dbe1d5;background:var(--paper);color:var(--ink);font-family:Inter,Arial,sans-serif;min-height:100vh}.kbf *{box-sizing:border-box}.kbf a{color:inherit}.kbf-wrap{max-width:1160px;margin:auto;padding:0 28px}.kbf-nav{min-height:82px;display:flex;align-items:center;gap:24px;border-bottom:1px solid var(--line);font-size:13px}.kbf-brand{font-size:25px;font-weight:850;letter-spacing:-1px;text-decoration:none;margin-right:auto}.kbf-nav a{text-decoration:none}.kbf-langs{display:flex;gap:12px}.kbf-langs a[aria-current=page]{font-weight:800;text-decoration:underline;text-underline-offset:5px}.kbf-hero{display:grid;grid-template-columns:1.4fr 1fr;gap:65px;align-items:center;padding:64px 0 56px}.kbf-eyebrow{font-size:12px;font-weight:750;text-transform:uppercase;letter-spacing:.1em;margin:0 0 22px}.kbf h1{font-size:clamp(43px,5.6vw,72px);line-height:1.02;letter-spacing:-.065em;white-space:pre-line;margin:0;font-weight:800}.kbf-lead{font-size:18px;line-height:1.6;color:var(--muted);max-width:580px;margin:24px 0}.kbf-actions{display:flex;gap:20px;align-items:center;flex-wrap:wrap}.kbf-cta{display:inline-flex;align-items:center;justify-content:center;gap:14px;background:#184e3c!important;color:white!important;border:1px solid #184e3c;border-radius:9px;padding:15px 20px;font-size:14px;font-weight:750;text-decoration:none;min-height:48px}.kbf-link{font-size:13px;font-weight:700;text-underline-offset:4px}.kbf a:focus-visible{outline:3px solid #9b7100;outline-offset:5px}.kbf-hero-art{border-radius:22px;background:#dae6a8;padding:34px;transform:rotate(2deg);box-shadow:12px 14px 0 #e8ebdf;aspect-ratio:1/1;display:flex;flex-direction:column;justify-content:space-between;max-width:365px;width:100%;justify-self:center}.kbf-hero-art>span{font-size:12px;letter-spacing:.14em;font-weight:800}.kbf-hero-art strong{font-size:clamp(44px,5vw,68px);line-height:.95;letter-spacing:-.055em;font-weight:900}.kbf-hero-art p{border-top:1px solid #12251f45;padding-top:15px;margin:0;font-size:12px;letter-spacing:.07em;font-weight:750}.kbf-section{padding:42px 0;border-top:1px solid var(--line);scroll-margin-top:20px}.kbf h2{font-size:clamp(25px,3vw,34px);letter-spacing:-.045em;line-height:1.15;margin:0 0 13px}.kbf-note{font-size:14px;line-height:1.6;color:var(--muted);max-width:760px;margin:0 0 24px}.kbf-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.kbf-template{border:1px solid var(--line);border-radius:15px;background:white;overflow:hidden;display:flex;flex-direction:column;min-width:0}.kbf-visual{height:165px;display:flex;flex-direction:column;justify-content:space-between;padding:23px;background:#e3ebbb}.kbf-template:nth-child(2) .kbf-visual{background:#eee3d5}.kbf-template:nth-child(3) .kbf-visual{background:#dce6e7}.kbf-visual small{font-size:10px;font-weight:800;letter-spacing:.13em}.kbf-visual b{font-size:32px;letter-spacing:-.055em;line-height:1;max-width:180px}.kbf-template-body{padding:23px;display:flex;flex-direction:column;flex:1}.kbf-template h3{font-size:21px;letter-spacing:-.035em;margin:0 0 10px}.kbf-template p{font-size:14px;color:var(--muted);line-height:1.6;margin:0 0 17px}.kbf-beats{display:flex;flex-wrap:wrap;gap:5px;font-size:10px;margin:auto 0 22px;padding:0;list-style:none}.kbf-beats li{padding:6px 8px;background:#f4f5ef;border-radius:5px}.kbf-template .kbf-cta{width:100%;font-size:13px}.kbf-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;list-style:none;counter-reset:steps;padding:0;margin:24px 0 0}.kbf-steps li{font-size:14px;line-height:1.6;color:var(--muted);counter-increment:steps}.kbf-steps li:before{content:'0' counter(steps);display:block;font-size:12px;font-weight:800;color:#184e3c;margin-bottom:10px}.kbf-pay{display:grid;grid-template-columns:1fr 1fr;gap:40px}.kbf-pay p{font-size:14px;line-height:1.65;color:var(--muted)}.kbf-pack{border:1px solid #c7d2bc;border-radius:15px;background:#edf1e4;padding:25px}.kbf-pack h3{font-size:18px;margin:0 0 10px;letter-spacing:-.02em}.kbf-pack>strong{font-size:26px;letter-spacing:-.04em}.kbf-pack ul{padding-left:19px;color:var(--muted);font-size:13px;line-height:1.7;margin:18px 0}.kbf-pack small{display:block;margin-top:12px;color:var(--muted);line-height:1.6}.kbf-faq{max-width:850px}.kbf details{border-bottom:1px solid var(--line);padding:17px 0;font-size:14px}.kbf summary{font-weight:750;cursor:pointer;line-height:1.5}.kbf details p{color:var(--muted);line-height:1.65;margin:12px 0 0}.kbf-closing{display:flex;gap:30px;align-items:center;justify-content:space-between;padding:30px 0 50px}.kbf-closing h2{max-width:570px}.kbf-footer{display:flex;gap:20px;justify-content:space-between;font-size:12px;color:var(--muted);padding:24px 0;border-top:1px solid var(--line)}
@media(max-width:750px){.kbf-wrap{padding:0 20px}.kbf-nav{gap:13px;min-height:70px}.kbf-nav>.kbf-link{display:none}.kbf-hero{grid-template-columns:1fr;gap:30px;padding:38px 0}.kbf-hero-art{max-width:100%;aspect-ratio:auto;min-height:180px;transform:none;padding:23px;box-shadow:none}.kbf-hero-art strong{font-size:42px}.kbf-hero-art p{margin-top:20px}.kbf h1{font-size:49px}.kbf-lead{font-size:16px}.kbf-eyebrow{font-size:10px;margin-bottom:18px}.kbf-grid,.kbf-steps,.kbf-pay{grid-template-columns:1fr;gap:18px}.kbf-section{padding:32px 0}.kbf-visual{height:138px}.kbf-visual b{max-width:none}.kbf-closing{display:block;padding:10px 0 32px}.kbf-closing .kbf-cta{margin-top:10px}.kbf-footer{flex-wrap:wrap}.kbf-langs{gap:10px}.kbf-actions{gap:14px}.kbf-cta{padding:14px 17px}}
`

export function bfMetadata(lang: BfLanguage): Metadata {
  const c = COPY[lang]
  return { title: { absolute: c.title }, description: c.description, alternates: paginasUgcAlternates(PATHS[lang]), openGraph: { title: c.title, description: c.description, url: `https://www.usekineo.com${PATHS[lang]}`, locale: lang === 'pt' ? 'pt_BR' : lang === 'es' ? 'es_ES' : 'en_US' } }
}

export function BlackFridayPage({ lang }: { lang: BfLanguage }) {
  const c = COPY[lang], campaign = `black_friday_kit${lang === 'en' ? '' : `_${lang}`}`
  const pack = kitBfCardText(lang, 0), open = kitBfSaleOpen()
  const saleDate = new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : lang, { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(Date.parse(KIT_BF_SALE_ENDS_AT) - 1))
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Kineo', item: 'https://www.usekineo.com/' }, { '@type': 'ListItem', position: 2, name: 'Black Friday', item: `https://www.usekineo.com${PATHS[lang]}` }] }
  return <main className="kbf" lang={lang === 'pt' ? 'pt-BR' : lang} data-kineo="bf-campaign-2810">
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
    {[schema, crumbs].map((value) => <script key={value['@type']} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />)}
    <div className="kbf-wrap">
      <nav className="kbf-nav" aria-label="Kineo"><Link className="kbf-brand" href="/">kineo.</Link><Link className="kbf-link" href="/ads">{c.nav}</Link><div className="kbf-langs">{(['en', 'pt', 'es'] as const).map((code) => <Link key={code} href={PATHS[code]} hrefLang={code === 'pt' ? 'pt-BR' : code} aria-current={lang === code ? 'page' : undefined}>{code.toUpperCase()}</Link>)}</div></nav>
      <header className="kbf-hero"><div><p className="kbf-eyebrow">{c.date}</p><h1>{c.h1}</h1><p className="kbf-lead">{c.lead}</p><div className="kbf-actions"><a className="kbf-cta" href="#bf-templates">{c.choose}<span aria-hidden="true">↓</span></a><Link className="kbf-link" href="/pricing">{c.plans}</Link></div></div><div className="kbf-hero-art" aria-hidden="true"><span>KINEO / BLACK FRIDAY KIT</span><strong>BLACK<br />FRIDAY<br />27.11.26</strong><p>01 / 02 / 03</p></div></header>
      <section className="kbf-section" id="bf-templates" aria-labelledby="bf-templates-title"><h2 id="bf-templates-title">{c.intro}</h2><p className="kbf-note">{c.note}</p><div className="kbf-grid">{BF_TEMPLATE_IDS.map((id, i) => { const model = bfTemplate(lang, id); return <article className="kbf-template" data-bf-template={id} key={id}><div className="kbf-visual" aria-hidden="true"><small>0{i + 1} / {c.preview}</small><b>{c.visuals[i]}</b></div><div className="kbf-template-body"><h3>{model.title}</h3><p>{model.description}</p><ol className="kbf-beats" aria-label={c.preview}>{c.beats[i].map((beat) => <li key={beat}>{beat}</li>)}</ol><OrganicCtaLink className="kbf-cta" href={bfTemplateHref(lang, id)} source={campaign} placement={`template_${id}`}>{c.use}<span aria-hidden="true">↗</span></OrganicCtaLink></div></article> })}</div></section>
      <section className="kbf-section" aria-labelledby="bf-how"><h2 id="bf-how">{c.how}</h2><ol className="kbf-steps">{c.steps.map((step) => <li key={step}>{step}</li>)}</ol></section>
      <section className="kbf-section kbf-pay" aria-labelledby="bf-price"><div><h2 id="bf-price">{c.price}</h2><p data-bf-cost>{c.paid(adsV2Credits('commercial', 15))}</p><p>{c.sample(ADS_ESCOLHA_SAMPLE_SECONDS)}</p><p>{c.business}</p><p>{c.format}</p><Link className="kbf-link" href="/pricing">{c.plans} ↗</Link></div>{open ? <aside className="kbf-pack" data-bf-pack><h3>{c.kit}</h3><strong>{pack.priceLine}</strong><small>{lang === 'en' ? 'On sale through' : lang === 'pt' ? 'À venda até' : 'A la venta hasta'} {saleDate} · BRT</small><ul>{pack.bullets.map((line) => <li key={line}>{line}</li>)}</ul><OrganicCtaLink className="kbf-cta" href={KIT_BF_CHECKOUT_HREF} source={campaign} placement="existing_pack">{pack.cta}</OrganicCtaLink><small>{lang === 'en' ? `The ${KIT_BF_CREDITS} credits are a balance, not videos already made for you.` : lang === 'pt' ? `Os ${KIT_BF_CREDITS} créditos são saldo, não vídeos já feitos para você.` : `Los ${KIT_BF_CREDITS} créditos son saldo, no vídeos ya creados para ti.`}</small></aside> : null}</section>
      <section className="kbf-section kbf-faq" aria-label="FAQ">{c.faqs.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
      <div className="kbf-closing"><h2>{c.ready}</h2><a className="kbf-cta" href="#bf-templates">{c.choose}<span aria-hidden="true">↑</span></a></div>
      <footer className="kbf-footer"><span>© 2026 Kineo · Black Friday</span><Link href={lang === 'pt' ? '/anuncios-ugc-com-ia' : '/ai-ugc-ads'}>{c.footer}</Link><Link href="/terms">{lang === 'en' ? 'Terms' : lang === 'pt' ? 'Termos' : 'Términos'}</Link></footer>
    </div>
  </main>
}
