// [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] KINEO-PAGINAS-IA-CLARAS-2110 — fonte ÚNICA
// das páginas de entrada do ChatGPT no visual claro da home (branco + azul). 80% de quem chega do ChatGPT entra por
// /ai-video-generator/<motor>, /text-to-video-shorts, /free-ai-shorts/<nicho>, /ai-video-generator/for/<slug>,
// /gerador-de-shorts-gratis, /state-of-ai-shorts-2026, /best-ai-shorts-generators, /free-ai-shorts-generator e /chatgpt —
// e todas estavam no preto antigo, com vídeos velhos. Fundador: "as pessoas passam pelas páginas de cima e compram embaixo".
//
// PURO: zero import. Os modelos (page.tsx) e components/seo/PaginaClara.tsx leem daqui; o guardião
// scripts/test-paginas-ia-claras-2110.mjs também. Nada aqui muda URL, <title>, meta, canonical, JSON-LD nem o texto que ranqueia.

export const MARCA_PAGINAS_IA_CLARAS_2110 = 'KINEO-PAGINAS-IA-CLARAS-2110'

/** Os tokens da home clara (app/kineoLandingTheme.ts, .klp) — os mesmos da /claude-connector (app/claude-connector/palette.ts). */
export const PAGINA_CLARA = {
  bg: '#F7F7F5',
  card: '#FFFFFF',
  line: '#E4E4E0',
  line2: '#D2D2CD',
  text: '#0E1116',
  body: '#2A2F37',
  muted: '#5A5F67',
  accent: '#0A5CFF',
  accentSoft: '#E8EFFF',
  accentLine: 'rgba(10,92,255,0.35)',
  onAccent: '#fff',
  zebra: 'rgba(14,17,22,0.025)',
  hair: 'rgba(14,17,22,0.08)',
  media: '#EEF3FF',
  ok: '#0F7B4F',
  warn: '#A35A00',
  warnSoft: '#FFF4E5',
  err: '#B42318',
  purple: '#6D3FD6',
} as const

/** O fundo do <main> de cada página: o mesmo véu azul da home (radial no canto) sobre o off-white. */
export const PAGINA_CLARA_FUNDO = `radial-gradient(ellipse 1100px 650px at 0 0, #EEF3FF, rgba(238,243,255,0) 72%), ${PAGINA_CLARA.bg}`

/** Componentes partilhados com outras páginas (que seguem como estão) usam var(--kpl-*, <cor antiga>): só clareiam aqui dentro. */
const KPL_VARS: Record<keyof typeof PAGINA_CLARA, string> = {
  bg: 'bg', card: 'card', line: 'line', line2: 'line2', text: 'text', body: 'body', muted: 'muted', accent: 'accent',
  accentSoft: 'accent-soft', accentLine: 'accent-line', onAccent: 'on-accent', zebra: 'zebra', hair: 'hair', media: 'media',
  ok: 'ok', warn: 'warn', warnSoft: 'warn-soft', err: 'err', purple: 'purple',
}

/** Classe do <main> das páginas claras. */
export const PAGINA_CLARA_CLASSE = 'kpl'

const C = PAGINA_CLARA

/** CSS próprio da camada, depois do tema claro da home (app/kineoLandingTheme.ts): as variáveis --kpl-*, o MENU DO TOPO no
 *  desenho da home (88 px, logo com o raio azul, os 7 itens no mesmo tom, sublinhado azul nas 2 portas, botão azul de 9 px,
 *  hambúrguer abaixo de 1200 px) e a faixa dos 4 cards. Classes kpn-* próprias: o CSS da home (KLP_CSS, dentro da
 *  KineoLanding) não é importado nem tocado — a home segue byte a byte. */
export const PAGINA_CLARA_CSS = [
  `.kpl{${(Object.keys(KPL_VARS) as (keyof typeof PAGINA_CLARA)[]).map((k) => `--kpl-${KPL_VARS[k]}:${PAGINA_CLARA[k]}`).join(';')};color-scheme:light;overflow-x:clip}`,
  `.kpl a:focus-visible{outline:2px solid ${C.accent};outline-offset:3px;border-radius:4px}`,
  // o menu do topo (par do topo da home, como os de /examples e /trending)
  `.kpn{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.86);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid ${C.line};color:${C.text};font-family:var(--font-sans);line-height:1.5;text-align:left}`,
  `.kpn *{box-sizing:border-box}`,
  `.kpn a{text-decoration:none;color:inherit}`,
  `.kpn-in{height:88px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:28px;padding-inline:clamp(16px,1.6vw,28px)}`,
  `.kpn-logo{display:flex;align-items:center;gap:10px;width:max-content;font-size:26px;font-weight:600;letter-spacing:-1px}`,
  `.kpn-logo .mk{width:29px;height:34px;color:${C.accent}}`,
  `.kpn-links{justify-self:center;display:flex;align-items:center;gap:30px;font-size:14px;font-weight:550}`,
  `.kpn-links a{position:relative;display:inline-flex;align-items:center;min-height:48px;padding:10px 0;white-space:nowrap;color:${C.text};transition:color .15s ease}`,
  `.kpn-links a:hover{color:${C.accent}}`,
  `.kpn-links a.kpn-primary{font-weight:650}`,
  `.kpn-links a.kpn-primary::after{content:'';position:absolute;inset:auto 0 4px;height:2px;border-radius:2px;background:${C.accent}}`,
  `.kpn-right{justify-self:end;display:flex;align-items:center;gap:12px;min-width:0}`,
  `.kpn-right .kineo-interface-language{color:${C.text}!important;background:#fff!important;border-color:${C.line}!important;color-scheme:light!important;border-radius:8px!important}`,
  `.kpn-login{font-size:14px;font-weight:550;color:${C.body};white-space:nowrap}`,
  `.kpn-cta{display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;font-size:14px;font-weight:650;letter-spacing:-.01em;white-space:nowrap;border-radius:9px;background:${C.accent};color:#fff!important;border:1px solid ${C.accent};box-shadow:0 1px 2px #0A5CFF33,0 6px 16px -6px #0A5CFF55}`,
  `.kpn-cta:hover{filter:brightness(1.06)}`,
  `.kpn-toggle{display:none}`,
  `.kpn-toggle input{position:absolute;inset:0;width:44px;height:44px;opacity:0;margin:0;cursor:pointer;z-index:2}`,
  `.kpn-bars{display:flex;flex-direction:column;gap:5px;pointer-events:none}`,
  `.kpn-bars i{display:block;width:20px;height:2px;border-radius:999px;background:${C.text};transition:.15s}`,
  `.kpn-toggle input:checked~.kpn-bars i:nth-child(1){transform:translateY(7px) rotate(45deg)}`,
  `.kpn-toggle input:checked~.kpn-bars i:nth-child(2){opacity:0}`,
  `.kpn-toggle input:checked~.kpn-bars i:nth-child(3){transform:translateY(-7px) rotate(-45deg)}`,
  `.kpn-menu{display:none}`,
  `.kpn-toggle input:checked~.kpn-menu{display:flex}`,
  `@media(max-width:1390px) and (min-width:1201px){.kpn-links{gap:18px}}`,
  `@media(max-width:1300px) and (min-width:1201px){.kpn-links{gap:14px}}`,
  `@media(max-width:1200px){.kpn-in{height:72px;display:flex;justify-content:space-between}.kpn-links,.kpn-login{display:none}.kpn-toggle{display:inline-flex;position:relative;width:44px;height:44px;align-items:center;justify-content:center}.kpn-menu{position:fixed;top:72px;left:0;right:0;flex-direction:column;gap:2px;max-height:calc(100dvh - 72px);overflow-y:auto;padding:8px 18px 20px;background:#fff;border-bottom:1px solid ${C.line};z-index:59}.kpn-menu a{min-height:44px;display:flex;align-items:center;padding:10px 4px;font-size:15px;font-weight:500;color:${C.text};border-bottom:1px solid ${C.line}}.kpn-menu a.kpn-cta{margin-top:12px;min-height:48px;justify-content:center;border-bottom:none}}`,
  `@media(max-width:560px){.kpn-logo{font-size:22px}.kpn-right{gap:8px}.kpn-right>.kpn-cta{display:none}.kpn-right .kineo-interface-language{width:87px!important;max-width:87px!important;font-size:11px!important}}`,
  // a faixa dos 4 cards: o tema da home (.klp) com o mínimo da base da home, sem altura de tela e sem fundo próprio; sai da
  // coluna estreita do texto e ocupa a largura da tela (como na home), com teto de 1280 px
  `html .klp.kpl-cards{--r-pill:999px;--dur-fast:150ms;--ease-swift:cubic-bezier(.2,0,0,1);--bg:${C.bg};--card:#fff;--line:${C.line};--txt:${C.text};--muted:${C.muted};--home-action:${C.accent};--home-on-action:#fff;color-scheme:light;background:transparent;color:${C.text};font-family:var(--font-sans);line-height:1.5;-webkit-font-smoothing:antialiased;width:100vw;position:relative;left:50%;margin-left:-50vw;margin-top:26px;margin-bottom:8px;text-align:left;overflow:visible}`,
  `:where(.klp.kpl-cards) *{box-sizing:border-box;margin:0;padding:0}`,
  `.klp.kpl-cards a{text-decoration:none;color:inherit}`,
  `.klp.kpl-cards .wrap{max-width:1280px;margin-inline:auto}`,
  `.klp.kpl-cards .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:650;letter-spacing:-.01em;border:1px solid transparent;cursor:pointer}`,
  `.klp.kpl-cards .k3c{padding-top:8px}`,
].join('\n')

/** Rótulo honesto da vitrine nova (os vídeos da home e da /claude-connector — nenhum render novo). */
export const VITRINE_TITULO = 'Made with Kineo'
export const VITRINE_LINHA = 'UGC ads, product ads and narrated films — real videos made in Kineo.'
export const VITRINE_TITULO_PT = 'Feito com o Kineo'
export const VITRINE_LINHA_PT = 'Anúncios UGC, anúncios de produto e filmes narrados — vídeos reais feitos no Kineo.'

/** Os modelos que este trabalho clareou (o guardião lê cada um). */
export const MODELOS_PAGINAS_IA_CLARAS = [
  'app/ai-video-generator/[engine]/page.tsx',
  'app/text-to-video-shorts/page.tsx',
  'app/free-ai-shorts/[niche]/page.tsx',
  'app/ai-video-generator/for/[slug]/page.tsx',
  'app/gerador-de-shorts-gratis/page.tsx',
  'app/state-of-ai-shorts-2026/page.tsx',
  'app/best-ai-shorts-generators/page.tsx',
  'app/free-ai-shorts-generator/page.tsx',
  'app/chatgpt/page.tsx',
] as const

// ── /claude-connector: quem chega do ChatGPT abre na aba ChatGPT ─────────────────────────────────────────────────────

/** Veio do ChatGPT/OpenAI? utm_source OU referrer contendo "chatgpt" ou "openai" (sem diferenciar maiúscula). */
export function vemDoChatgpt(utmSource: string | null | undefined, referrer: string | null | undefined): boolean {
  const alvo = /chatgpt|openai/i
  return alvo.test(String(utmSource ?? '')) || alvo.test(String(referrer ?? ''))
}

/** Chat novo do ChatGPT com o pedido na caixa (mesmo catálogo de pedidos da página). */
export const CHATGPT_NEW_CHAT_URL = 'https://chatgpt.com/?q='
/** Fecho de cada pedido no ChatGPT: quem ainda não ligou o Kineo Studio é levado aos passos da própria página. */
export const CHATGPT_CONNECT_SENTENCE = 'If the Kineo Studio connector is not turned on in this chat, first show me how to add it: https://www.usekineo.com/claude-connector#connect'

export function chatgptPromptHref(prompt: string): string {
  return CHATGPT_NEW_CHAT_URL + encodeURIComponent(`${prompt} ${CHATGPT_CONNECT_SENTENCE}`)
}
