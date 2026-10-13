// KINEO-VS-ALTERNATIVAS-1310 — as 4 páginas "alternativa a X" de 13/10/2026 (fundador: "tudo sim").
//
// POR QUÊ: /vs/invideo-alternatives-faceless-shorts gerou 2 cadastros → 1 Creator pago em 4,5 minutos (provável resposta
// do ChatGPT; o canal que paga é o ChatGPT de país rico). Copiamos a página que converte — o MESMO molde
// (components/CitationAnswerPage + o tipo CitationAnswer) — para os 4 concorrentes que a mesma pergunta costuma listar:
// Pictory, Synthesia, CapCut e OpusClip. Cada página tem um ângulo honesto (o material com que a pessoa começa).
//
// ESTE MÓDULO É PURO (sem import): sitemap, llms.txt e os links internos leem os caminhos daqui sem arrastar nada.
// Os fatos de concorrente moram SÓ aqui, cada um com o comentário `// fonte: <URL> (lido em <data>)` logo acima e a MESMA
// URL no campo `url` — o guardião scripts/test-vs-alternativas-1310.mjs reprova fato sem fonte, fonte divergente e preço
// de concorrente digitado fora deste arquivo. Fato que não deu para confirmar FICA DE FORA (ex.: preço em USD do CapCut,
// que a página dele só mostra por região e "for reference only"). Preço e oferta da Kineo NUNCA entram aqui: vêm de
// lib/growth/citationAnswers.ts e lib/growth/buyCreatorOffer.ts (as mesmas fontes da página do InVideo).

export const VS_ALT_MARK = 'KINEO-VS-ALTERNATIVAS-1310'
/** Dia em que os 4 concorrentes foram lidos nas páginas oficiais (o "Reviewed" visível e o lastmod do sitemap). */
export const VS_ALT_REVIEWED_ISO = '2026-10-13'

export type VsAlternativeId = 'pictory' | 'synthesia' | 'capcut' | 'opusclip'

/** As páginas (sitemap, llms.txt e a lista de guias leem daqui). */
export const VS_ALTERNATIVE_PAGES: Record<VsAlternativeId, { path: string; label: string }> = {
  pictory: { path: '/vs/pictory-alternatives-cinematic-shorts', label: 'Pictory alternatives for a narrated Short from one idea' },
  synthesia: { path: '/vs/synthesia-alternatives-faceless-videos', label: 'Synthesia alternatives for faceless narrated videos' },
  capcut: { path: '/vs/capcut-alternatives-no-editing-shorts', label: 'CapCut alternatives when you do not want to edit' },
  opusclip: { path: '/vs/opus-clip-alternatives-original-shorts', label: 'OpusClip alternatives for original Shorts from scratch' },
}
export const VS_ALTERNATIVE_IDS = Object.keys(VS_ALTERNATIVE_PAGES) as VsAlternativeId[]
export const VS_ALTERNATIVE_LINKS = VS_ALTERNATIVE_IDS.map((id) => VS_ALTERNATIVE_PAGES[id])

/** O ângulo honesto de cada página, numa frase (a linha do /llms.txt). Sem preço: o número mora na página, com fonte. */
const VS_ALTERNATIVE_ANGLE: Record<VsAlternativeId, string> = {
  pictory: 'Pictory turns existing material (a script, an article URL, slides) into video; Kineo turns one idea into a finished narrated cinematic Short.',
  synthesia: 'Synthesia makes videos presented by AI avatars; Kineo makes faceless narrated films with no presenter on screen.',
  capcut: 'CapCut is an editor for clips you bring; Kineo goes from one idea to a finished film with no timeline to edit.',
  opusclip: 'OpusClip finds clips inside a long video you already have; Kineo creates original Shorts from scratch, from text.',
}
/** As linhas da seção "Key pages" do /llms.txt. */
export function vsAlternativeLlmsLines(base: string): string {
  return VS_ALTERNATIVE_IDS.map((id) => {
    const page = VS_ALTERNATIVE_PAGES[id]
    return `- [${page.label}](${base}${page.path}): ${VS_ALTERNATIVE_ANGLE[id]} ${VS_COMPETITORS[id].name} facts are read on its own pages, dated ${VS_ALT_REVIEWED_ISO} and linked.`
  }).join('\n')
}

export type VsSourcedFact = { text: string; label: string; url: string; checkedOn: string }
export type VsCompetitor = {
  name: string
  /** O que a pessoa precisa ter para começar. */
  start: VsSourcedFact
  /** O que sai do outro lado. */
  output: VsSourcedFact
  /** Preço de entrada no plano MENSAL, em USD — ou a frase honesta de por que não há número. */
  price: VsSourcedFact
  /** O que dá para fazer sem pagar. */
  free: VsSourcedFact
}

export const VS_COMPETITORS: Record<VsAlternativeId, VsCompetitor> = {
  pictory: {
    name: 'Pictory',
    // fonte: https://pictory.ai/pricing (lido em 2026-10-13)
    start: { text: 'A script, an article or web URL, a PowerPoint deck or a recorded video.', label: 'Pricing page', url: 'https://pictory.ai/pricing', checkedOn: '2026-10-13' },
    // fonte: https://pictory.ai/pricing (lido em 2026-10-13)
    output: { text: 'A video built from that existing material (script, URL and PowerPoint to video).', label: 'Pricing page', url: 'https://pictory.ai/pricing', checkedOn: '2026-10-13' },
    // fonte: https://pictory.ai/pricing (lido em 2026-10-13)
    price: { text: 'Starter: USD 29/month on monthly billing.', label: 'Pricing page', url: 'https://pictory.ai/pricing', checkedOn: '2026-10-13' },
    // fonte: https://pictory.ai/pricing (lido em 2026-10-13)
    free: { text: '14-day free trial.', label: 'Pricing page', url: 'https://pictory.ai/pricing', checkedOn: '2026-10-13' },
  },
  synthesia: {
    name: 'Synthesia',
    // fonte: https://www.synthesia.io/pricing (lido em 2026-10-13)
    start: { text: 'A script, a document or a prompt.', label: 'Pricing page', url: 'https://www.synthesia.io/pricing', checkedOn: '2026-10-13' },
    // fonte: https://www.synthesia.io/pricing (lido em 2026-10-13)
    output: { text: 'Videos presented by AI avatars, plus dubbing and translation.', label: 'Pricing page', url: 'https://www.synthesia.io/pricing', checkedOn: '2026-10-13' },
    // fonte: https://www.synthesia.io/pricing (lido em 2026-10-13)
    price: { text: 'Starter: USD 29/month, billed monthly.', label: 'Pricing page', url: 'https://www.synthesia.io/pricing', checkedOn: '2026-10-13' },
    // fonte: https://www.synthesia.io/pricing (lido em 2026-10-13)
    free: { text: 'Free Basic plan with 10 minutes of video a month; free videos carry a Synthesia watermark.', label: 'Pricing page', url: 'https://www.synthesia.io/pricing', checkedOn: '2026-10-13' },
  },
  capcut: {
    name: 'CapCut',
    // fonte: https://www.capcut.com/resource/pc-professional-video-editor (lido em 2026-10-13)
    start: { text: 'Clips you bring, arranged on the multi-track timeline of the desktop editor.', label: 'Desktop editor page', url: 'https://www.capcut.com/resource/pc-professional-video-editor', checkedOn: '2026-10-13' },
    // fonte: https://www.capcut.com/resource/pc-professional-video-editor (lido em 2026-10-13)
    output: { text: 'A video you edit yourself, with helpers such as auto captions.', label: 'Desktop editor page', url: 'https://www.capcut.com/resource/pc-professional-video-editor', checkedOn: '2026-10-13' },
    // fonte: https://www.capcut.com/pricing (lido em 2026-10-13)
    price: { text: 'Prices are shown by region and marked for reference only; the final price appears after sign-in, so no USD figure is quoted here.', label: 'Pricing page', url: 'https://www.capcut.com/pricing', checkedOn: '2026-10-13' },
    // fonte: https://www.capcut.com/pricing (lido em 2026-10-13)
    free: { text: 'Free plan with templates and basic editing tools.', label: 'Pricing page', url: 'https://www.capcut.com/pricing', checkedOn: '2026-10-13' },
  },
  opusclip: {
    name: 'OpusClip',
    // fonte: https://www.opus.pro/pricing (lido em 2026-10-13)
    start: { text: 'A video you already have: a local upload, or a link such as YouTube on paid plans.', label: 'Pricing page', url: 'https://www.opus.pro/pricing', checkedOn: '2026-10-13' },
    // fonte: https://www.opus.pro/pricing (lido em 2026-10-13)
    output: { text: 'Short clips found inside that video, with AI captions and reframing to 9:16.', label: 'Pricing page', url: 'https://www.opus.pro/pricing', checkedOn: '2026-10-13' },
    // fonte: https://www.opus.pro/pricing (lido em 2026-10-13)
    price: { text: 'Starter: USD 15/month; Pro: USD 29/month.', label: 'Pricing page', url: 'https://www.opus.pro/pricing', checkedOn: '2026-10-13' },
    // fonte: https://www.opus.pro/pricing (lido em 2026-10-13)
    free: { text: 'Free plan with no card; free clips and media expire after 3 days, and watermark-free export is not included.', label: 'Pricing page', url: 'https://www.opus.pro/pricing', checkedOn: '2026-10-13' },
  },
}
