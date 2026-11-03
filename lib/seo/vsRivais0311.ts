// KINEO-VS-RIVAIS-0311 — as comparações "alternativa a X" dos rivais do mesmo porte (fundador 03/11: "Sim para as páginas de
// comparação, pode fazer").
//
// POR QUÊ: o canal que paga é a busca do ChatGPT (índice do Bing) e as citações caíram desde 28-30/10
// (docs/ONDE-CONCORRENTES-ANUNCIAM-0311.md). Os 13 concorrentes do mesmo porte têm SEO entre os 2 canais principais; o Revid
// mantém 28 comparações em revid.ai/vs. Quem pergunta "X vs Y" / "alternativa a X" já está escolhendo ferramenta.
//
// O QUE JÁ EXISTIA E NÃO FOI DUPLICADO: InVideo, Pictory e OpusClip (/vs/*-alternatives-*) e Higgsfield (/kineo-vs-higgsfield)
// foram RELIDOS hoje e ganharam fatos datados aqui (VS_RIVAIS_REREAD). Páginas NOVAS: Revid, Crayo, AutoShorts, Faceless.video,
// Fliki e Zebracat, no MESMO molde que converteu (components/CitationAnswerPage).
//
// ESTE MÓDULO É PURO (sem import): sitemap, llms.txt e os links internos leem daqui sem arrastar nada. Os fatos de concorrente
// moram SÓ aqui, cada um com o comentário `// fonte: <URL> (lido em <data>)` logo acima e a MESMA URL no campo `url` — o guardião
// scripts/test-vs-rivais-0311.mjs reprova fato sem fonte, fonte divergente e número de concorrente digitado fora deste arquivo.
// Fato que não deu para confirmar na página do próprio concorrente FICA DE FORA. Preço/crédito da Kineo NUNCA entra aqui: vem de
// lib/growth/vsRivaisAnswers.ts, que lê lib/marketingPrice, lib/kling4PaidPricing e lib/freeTierOffer.

export const VS_RIVAIS_MARK = 'KINEO-VS-RIVAIS-0311'
/** Dia em que os fatos foram lidos nas páginas oficiais (o "Reviewed" visível, o dateModified e o lastmod do sitemap). */
export const VS_RIVAIS_CHECKED_ISO = '2026-11-03'
/** O carimbo visível de cada página. */
export const VS_RIVAIS_CHECKED_LABEL = 'Checked November 2026'

export type VsRivalId = 'revid' | 'crayo' | 'autoshorts' | 'facelessvideo' | 'fliki' | 'zebracat'

/** As páginas novas (sitemap, llms.txt, hub e a lista de guias leem daqui). */
export const VS_RIVAL_PAGES: Record<VsRivalId, { path: string; label: string }> = {
  revid: { path: '/vs/revid-alternative', label: 'Revid alternative: Kineo vs Revid' },
  crayo: { path: '/vs/crayo-alternative', label: 'Crayo alternative: Kineo vs Crayo' },
  autoshorts: { path: '/vs/autoshorts-alternative', label: 'AutoShorts alternative: Kineo vs AutoShorts' },
  facelessvideo: { path: '/vs/faceless-video-alternative', label: 'Faceless.video alternative: Kineo vs Faceless.video' },
  fliki: { path: '/vs/fliki-alternative', label: 'Fliki alternative: Kineo vs Fliki' },
  zebracat: { path: '/vs/zebracat-alternative', label: 'Zebracat alternative: Kineo vs Zebracat' },
}
export const VS_RIVAL_IDS = Object.keys(VS_RIVAL_PAGES) as VsRivalId[]
export const VS_RIVAL_LINKS = VS_RIVAL_IDS.map((id) => VS_RIVAL_PAGES[id])

/** As páginas que já existiam, relidas hoje: a data da página e o lastmod passam a ser os desta leitura. */
export const VS_RIVAIS_REFRESHED_PATHS: readonly string[] = [
  '/vs/invideo-alternatives-faceless-shorts',
  '/vs/pictory-alternatives-cinematic-shorts',
  '/vs/opus-clip-alternatives-original-shorts',
  '/kineo-vs-higgsfield',
]

export type VsRivalFact = { text: string; label: string; url: string; checkedOn: string }
export type VsRival = {
  name: string
  homepage: string
  /** O que a pessoa precisa ter para começar. */
  start: VsRivalFact
  /** O que sai do outro lado. */
  output: VsRivalFact
  /** De onde vêm as imagens: estoque, motores, ferramentas. */
  visuals: VsRivalFact
  /** O que acontece depois de pronto. */
  publish: VsRivalFact
  /** Preço de entrada no plano MENSAL, em USD. */
  price: VsRivalFact
  /** Todos os planos pagos publicados. */
  plans: VsRivalFact
  /** O que dá para fazer sem pagar. */
  free: VsRivalFact
}

export const VS_RIVALS: Record<VsRivalId, VsRival> = {
  revid: {
    name: 'Revid',
    homepage: 'https://www.revid.ai/',
    // fonte: https://www.revid.ai/ (lido em 2026-11-03)
    start: { text: 'A prompt, script, link, product page, audio file or PDF.', label: 'Home page', url: 'https://www.revid.ai/', checkedOn: '2026-11-03' },
    // fonte: https://www.revid.ai/ (lido em 2026-11-03)
    output: { text: 'An editable video: script, voiceover, visuals, subtitles and editing in one workflow, including multi-minute videos.', label: 'Home page', url: 'https://www.revid.ai/', checkedOn: '2026-11-03' },
    // fonte: https://www.revid.ai/pricing (lido em 2026-11-03)
    visuals: { text: 'Seedance 2.5 “and more”, up to 4K, and 100+ AI video tools on Growth. A typical 30-second video with Pro moving images and a voiceover costs about 40 to 80 credits; full AI video models cost more per second.', label: 'Pricing page', url: 'https://www.revid.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://www.revid.ai/pricing (lido em 2026-11-03)
    publish: { text: 'From Growth: publishing to TikTok, Instagram, YouTube and X, post stats, 3 Auto-Mode workers, and API, MCP and CLI access.', label: 'Pricing page', url: 'https://www.revid.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://www.revid.ai/pricing (lido em 2026-11-03)
    price: { text: 'Growth: USD 39/month (shown discounted from USD 99), or USD 32/month billed yearly, for 2,000 AI credits a month.', label: 'Pricing page', url: 'https://www.revid.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://www.revid.ai/pricing (lido em 2026-11-03)
    plans: { text: 'Hobby: USD 39/month, no credit figure shown. Growth: USD 39/month, 2,000 credits. Elite: USD 89/month, 5,000 credits. Ultra: USD 199/month, 12,000 credits. Plan credits do not roll over.', label: 'Pricing page', url: 'https://www.revid.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://www.revid.ai/pricing (lido em 2026-11-03)
    free: { text: 'Sign-up without a credit card, with free credits to try generation (the amount is not stated); a free account can also search viral videos.', label: 'Pricing page', url: 'https://www.revid.ai/pricing', checkedOn: '2026-11-03' },
  },
  crayo: {
    name: 'Crayo',
    homepage: 'https://crayo.ai/',
    // fonte: https://crayo.ai/compare/crayo-vs-klap (lido em 2026-11-03)
    start: { text: 'For AutoClip, a YouTube or TikTok link or a file upload (up to 4 GB, 1 minute to 3 hours).', label: 'Crayo comparison page', url: 'https://crayo.ai/compare/crayo-vs-klap', checkedOn: '2026-11-03' },
    // fonte: https://crayo.ai/pricing (lido em 2026-11-03)
    output: { text: 'AI-generated videos counted in workflow credits: AutoClip, Reddit videos and fake-text videos, with an advanced video editor.', label: 'Pricing page', url: 'https://crayo.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://crayo.ai/pricing (lido em 2026-11-03)
    visuals: { text: 'AI voiceovers, AI images, voice changer, face swap, subtitle remover and a YouTube and TikTok downloader. The pricing page names no generative video engine.', label: 'Pricing page', url: 'https://crayo.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://crayo.ai/pricing (lido em 2026-11-03)
    publish: { text: 'A View Tracker for tracked accounts and posts. The pricing page lists no auto-posting.', label: 'Pricing page', url: 'https://crayo.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://crayo.ai/pricing (lido em 2026-11-03)
    price: { text: 'Hobby: USD 29/month billed monthly, for 250 workflow credits and 2 hours of export a month (USD 19/month on quarterly billing).', label: 'Pricing page', url: 'https://crayo.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://crayo.ai/pricing (lido em 2026-11-03)
    plans: { text: 'Hobby: USD 29/month, 250 workflow credits. Clipper: USD 59/month, 1,000. Pro: USD 129/month, 3,000. One credit is one AI-generated video; quarterly and yearly billing cost less.', label: 'Pricing page', url: 'https://crayo.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://crayo.ai/compare/crayo-vs-klap (lido em 2026-11-03)
    free: { text: 'No free tier and no trial; twelve free browser tools need no account.', label: 'Crayo comparison page', url: 'https://crayo.ai/compare/crayo-vs-klap', checkedOn: '2026-11-03' },
  },
  autoshorts: {
    name: 'AutoShorts',
    homepage: 'https://autoshorts.ai/',
    // fonte: https://autoshorts.ai/ (lido em 2026-11-03)
    start: { text: 'A topic for a series: a preset niche or a custom prompt.', label: 'Home page', url: 'https://autoshorts.ai/', checkedOn: '2026-11-03' },
    // fonte: https://autoshorts.ai/ (lido em 2026-11-03)
    output: { text: 'New faceless videos made for your series; you can preview and edit the script, title, images and background music before they post.', label: 'Home page', url: 'https://autoshorts.ai/', checkedOn: '2026-11-03' },
    // fonte: https://autoshorts.ai/ (lido em 2026-11-03)
    visuals: { text: 'Preset visual styles, HD video resolution, background music and voice cloning; paid plans include a monthly allowance of Motion Credits.', label: 'Home page', url: 'https://autoshorts.ai/', checkedOn: '2026-11-03' },
    // fonte: https://autoshorts.ai/ (lido em 2026-11-03)
    publish: { text: 'Auto-post to your channel on every plan, on a schedule you can edit.', label: 'Home page', url: 'https://autoshorts.ai/', checkedOn: '2026-11-03' },
    // fonte: https://autoshorts.ai/ (lido em 2026-11-03)
    price: { text: 'Starter: USD 19/month, posts 3 times a week, 1 series.', label: 'Home page pricing', url: 'https://autoshorts.ai/', checkedOn: '2026-11-03' },
    // fonte: https://autoshorts.ai/ (lido em 2026-11-03)
    plans: { text: 'Starter: USD 19/month, 3 posts a week, 27 Motion Credits. Daily: USD 39/month, 1 post a day, 62. Hardcore: USD 69/month, 2 posts a day, 124. Each plan lists 1 series; yearly billing advertises 2 months free.', label: 'Home page pricing', url: 'https://autoshorts.ai/', checkedOn: '2026-11-03' },
    // fonte: https://autoshorts.ai/ (lido em 2026-11-03)
    free: { text: 'The free plan (1 video) is marked temporarily paused; the home page still offers to try it for free with no credit card. “No Watermark” is listed on every plan.', label: 'Home page pricing', url: 'https://autoshorts.ai/', checkedOn: '2026-11-03' },
  },
  facelessvideo: {
    name: 'Faceless.video',
    homepage: 'https://faceless.video/',
    // fonte: https://faceless.video/ (lido em 2026-11-03)
    start: { text: 'A content source you choose for a series; it then generates video drafts.', label: 'Home page', url: 'https://faceless.video/', checkedOn: '2026-11-03' },
    // fonte: https://faceless.video/ (lido em 2026-11-03)
    output: { text: 'AI-generated video drafts you can review and edit before posting, or let post automatically.', label: 'Home page', url: 'https://faceless.video/', checkedOn: '2026-11-03' },
    // fonte: https://faceless.video/pricing (lido em 2026-11-03)
    visuals: { text: 'All video types on every plan; different video types cost different amounts of credits. The pricing page names no video engine.', label: 'Pricing page', url: 'https://faceless.video/pricing', checkedOn: '2026-11-03' },
    // fonte: https://faceless.video/ (lido em 2026-11-03)
    publish: { text: 'Each series can auto-post to one TikTok, YouTube or Instagram account on your schedule; Starter plans connect one account.', label: 'Home page', url: 'https://faceless.video/', checkedOn: '2026-11-03' },
    // fonte: https://faceless.video/pricing (lido em 2026-11-03)
    price: { text: 'Starter: USD 20/month, 30 credits, up to 15 videos a month.', label: 'Pricing page', url: 'https://faceless.video/pricing', checkedOn: '2026-11-03' },
    // fonte: https://faceless.video/pricing (lido em 2026-11-03)
    plans: { text: 'Starter: USD 20/month, up to 15 videos. Daily: USD 35/month, up to 30. Double: USD 59/month, up to 60. Studio: USD 149/month, up to 175. Unused credits roll over while you subscribe; annual billing advertises 30% off.', label: 'Pricing page', url: 'https://faceless.video/pricing', checkedOn: '2026-11-03' },
    // fonte: https://faceless.video/ (lido em 2026-11-03)
    free: { text: '“Start for free” and “free trial” buttons; the trial terms are not stated on the home or pricing pages.', label: 'Home page', url: 'https://faceless.video/', checkedOn: '2026-11-03' },
  },
  fliki: {
    name: 'Fliki',
    homepage: 'https://fliki.ai/',
    // fonte: https://fliki.ai/pricing (lido em 2026-11-03)
    start: { text: 'Ideas, scripts, blog posts or PPTs; it also edits existing video and turns recordings into polished video.', label: 'Pricing page', url: 'https://fliki.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://fliki.ai/pricing (lido em 2026-11-03)
    output: { text: 'Videos up to 15 minutes on Standard and 40 on Premium, plus audio, thumbnails, social carousels and presentations.', label: 'Pricing page', url: 'https://fliki.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://fliki.ai/pricing (lido em 2026-11-03)
    visuals: { text: 'Stock images, video clips and music on every plan; 2,000+ voices on Premium; AI video clips and AI avatars on paid plans, with limits by tier.', label: 'Pricing page', url: 'https://fliki.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://fliki.ai/pricing (lido em 2026-11-03)
    publish: { text: 'YouTube publishing on paid plans: 50 publications a month on Standard, 120 on Premium.', label: 'Pricing page', url: 'https://fliki.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://fliki.ai/blog/best-higgsfield-alternatives (lido em 2026-11-03)
    price: { text: 'Standard: USD 28/month, or USD 21/month billed yearly, for 180 credits.', label: 'Fliki’s own blog, updated November 2, 2026', url: 'https://fliki.ai/blog/best-higgsfield-alternatives', checkedOn: '2026-11-03' },
    // fonte: https://fliki.ai/blog/best-higgsfield-alternatives (lido em 2026-11-03)
    plans: { text: 'Free: 3 credits a month. Standard: USD 28/month, 180 credits. Premium: USD 88/month (USD 66 billed yearly), 600 credits. Its pricing page showed us local currency, so these USD figures come from Fliki’s own blog.', label: 'Fliki’s own blog, updated November 2, 2026', url: 'https://fliki.ai/blog/best-higgsfield-alternatives', checkedOn: '2026-11-03' },
    // fonte: https://fliki.ai/pricing (lido em 2026-11-03)
    free: { text: 'Free forever: 3 credits a month, 720p, a Fliki watermark, no credit card.', label: 'Pricing page', url: 'https://fliki.ai/pricing', checkedOn: '2026-11-03' },
  },
  zebracat: {
    name: 'Zebracat',
    homepage: 'https://www.zebracat.ai/',
    // fonte: https://www.zebracat.ai/ (lido em 2026-11-03)
    start: { text: 'A text prompt, script, website or blog URL, audio file, or one photo.', label: 'Home page', url: 'https://www.zebracat.ai/', checkedOn: '2026-11-03' },
    // fonte: https://www.zebracat.ai/pricing (lido em 2026-11-03)
    output: { text: 'A finished, edited video with voiceover, music and captions; 1080p MP4 on paid plans.', label: 'Pricing page', url: 'https://www.zebracat.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://www.zebracat.ai/ (lido em 2026-11-03)
    visuals: { text: 'Stock clips plus generated scenes; its site names Veo 3, Kling, Seedance, Nano Banana and Pixverse. AI avatars and voice cloning on higher tiers.', label: 'Home page', url: 'https://www.zebracat.ai/', checkedOn: '2026-11-03' },
    // fonte: https://www.zebracat.ai/ (lido em 2026-11-03)
    publish: { text: 'Scheduling and posting to connected social channels.', label: 'Home page', url: 'https://www.zebracat.ai/', checkedOn: '2026-11-03' },
    // fonte: https://www.zebracat.ai/pricing (lido em 2026-11-03)
    price: { text: 'Cat Mode: USD 39/month, or USD 23/month billed yearly, for 15 videos and 350 generative AI credits a month.', label: 'Pricing page', url: 'https://www.zebracat.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://www.zebracat.ai/pricing (lido em 2026-11-03)
    plans: { text: 'Cat Mode: USD 39/month, 15 videos, 350 credits. Super Cat: USD 99/month, 40 videos, 1,400 credits. Unlimited Cat: USD 199/month, 3,600 credits. Enterprise: custom. Its FAQ also states yearly minute limits, so check them before paying.', label: 'Pricing page', url: 'https://www.zebracat.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://www.zebracat.ai/pricing (lido em 2026-11-03)
    free: { text: 'Free tier: up to 5 videos with standard AI voices at 720p, up to 30 seconds each, no credit card. Watermark removal is listed on paid plans.', label: 'Pricing page', url: 'https://www.zebracat.ai/pricing', checkedOn: '2026-11-03' },
  },
}

/** A releitura de 03/11 das páginas que já existiam (cada uma entra como fato datado na página dela). */
export const VS_RIVAIS_REREAD: {
  invideo: { plans: VsRivalFact }
  pictory: { plans: VsRivalFact; stock: VsRivalFact }
  opusclip: { plans: VsRivalFact }
  higgsfield: { plans: VsRivalFact }
} = {
  invideo: {
    // fonte: https://invideo.io/pricing (lido em 2026-11-03)
    plans: { text: 'Basic: USD 9 per seat/month, 190 credits. Pro: USD 30, 1,000 credits. Ultra: USD 80, 3,000 credits. Same per-seat monthly prices as our previous reading; annual billing is advertised at 50% off.', label: 'InVideo pricing', url: 'https://invideo.io/pricing', checkedOn: '2026-11-03' },
  },
  pictory: {
    // fonte: https://pictory.ai/pricing (lido em 2026-11-03)
    plans: { text: 'Starter: USD 29/month (USD 25 billed annually), 2,000 credits, up to 30 video minutes a month. Professional: USD 59 (USD 35), 6,000 credits, up to 90 minutes. Teams: USD 199 (USD 119), 18,000 credits, up to 300 minutes.', label: 'Pricing page', url: 'https://pictory.ai/pricing', checkedOn: '2026-11-03' },
    // fonte: https://pictory.ai/pricing (lido em 2026-11-03)
    stock: { text: 'A royalty-free stock library from Getty Images and Storyblocks: 5 million+ videos on Starter, 18 million+ on Professional.', label: 'Pricing page', url: 'https://pictory.ai/pricing', checkedOn: '2026-11-03' },
  },
  opusclip: {
    // fonte: https://www.opus.pro/pricing (lido em 2026-11-03)
    plans: { text: 'Free: post one clip a day, no credit card; clips expire after 3 days and captions carry a watermark. Starter: USD 15/month. Pro: USD 29/month. Business: custom.', label: 'Pricing page', url: 'https://www.opus.pro/pricing', checkedOn: '2026-11-03' },
  },
  higgsfield: {
    // fonte: https://higgsfield.ai/pricing (lido em 2026-11-03)
    plans: { text: 'Starter: USD 15/month billed monthly, 200 credits. Plus: USD 49/month billed monthly, or USD 39/month billed annually, 1,000 credits.', label: 'Higgsfield pricing', url: 'https://higgsfield.ai/pricing', checkedOn: '2026-11-03' },
  },
}

/** O ângulo honesto de cada página, numa frase (linha do /llms.txt). Sem preço: o número mora na página, com fonte. */
const VS_RIVAL_ANGLE: Record<VsRivalId, string> = {
  revid: 'Revid is a video workflow that also publishes, remixes viral formats and runs Auto-Mode; Kineo turns one idea into a finished narrated film on an engine you pick by name.',
  crayo: 'Crayo clips long videos and makes Reddit and fake-text formats with a timeline editor; Kineo creates an original narrated film from one idea, with generated scenes.',
  autoshorts: 'AutoShorts runs a faceless series that posts itself on a schedule; Kineo makes one finished narrated film at a time, on an engine you pick by name, and you publish it.',
  facelessvideo: 'Faceless.video generates drafts for a series and auto-posts them; Kineo makes one finished narrated film at a time, on an engine you pick by name, and you publish it.',
  fliki: 'Fliki turns ideas, scripts, blog posts and slides into videos with stock media and a large voice library; Kineo generates every scene of a short narrated film from one idea.',
  zebracat: 'Zebracat makes finished videos with stock and generated visuals, avatars and scheduling; Kineo generates every scene of a narrated film on an engine you pick by name.',
}

/** As linhas da seção "Key pages" do /llms.txt. */
export function vsRivaisLlmsLines(base: string): string {
  return VS_RIVAL_IDS.map((id) => {
    const page = VS_RIVAL_PAGES[id]
    return `- [${page.label}](${base}${page.path}): ${VS_RIVAL_ANGLE[id]} ${VS_RIVALS[id].name} facts are read on its own pages, dated ${VS_RIVAIS_CHECKED_ISO} and linked.`
  }).join('\n')
}
