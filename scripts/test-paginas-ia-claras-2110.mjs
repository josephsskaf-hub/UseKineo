// [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] KINEO-PAGINAS-IA-CLARAS-2110 — guardião das
// páginas de entrada do ChatGPT no visual claro da home. Prova, lendo os arquivos REAIS (sem rede, env ou banco):
//   A. nenhum fundo escuro nos 9 modelos (toda cor de fundo literal é clara; o preto só existe como véu translúcido de selo);
//   B. o menu do topo e os 4 cards da home em cada modelo, os cards logo abaixo do título (o mesmo HomeThreeCards da home);
//   C. <title>, description, canonical, hreflang e JSON-LD intocados (linhas comparadas com a base 3e7ef8a42);
//   D. a vitrine velha saiu (nada de WallMedia/ExampleLiveMedia/ExampleVideoPlayer/NicheHouseFilm na tela) e a nova é a da
//      /claude-connector; lib/engineWall.ts e lib/homeVideoCuration.ts iguais à base;
//   E. /claude-connector: utm_source/referrer com chatgpt|openai abre a aba ChatGPT e troca "Try it in Claude" por
//      "Try it in ChatGPT" (mesmo catálogo); o selo "Engine set · <motor>" saiu;
//   F. /chatgpt: primeiro conectar (os passos da aba ChatGPT, a URL /api/mcp/studio), depois copiar; o prompt técnico
//      só dentro da caixa recolhida, sem HOOK/MICRO REWARD no texto corrido;
//   R. render real (react-dom/server, código NOVO, sem o desfaz): as 11 variações das páginas saem com o menu, 4 cards, a
//      vitrine onde havia galeria, sem fundo escuro neutro e sem texto claro do tema preto;
//   X. o desfaz dos guardiões antigos (scripts/test-support/desfaz-paginas-ia-claras-2110.mjs) é exato e fecha em falha;
//   M. mutantes: cada verificador acusa a mutação que devia acusar.
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { React, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
import { semPaginasIaClaras2110, PAGINAS_IA_CLARAS_2110_ARQUIVOS, PAGINAS_IA_CLARAS_2110_NOVOS, PAGINAS_IA_CLARAS_2110_BASE, MARCA_PAGINAS_IA_CLARAS_2110, PAGINAS_IA_CLARAS_2110_TRAVA, ehCommitPaginasIaClaras2110 } from './test-support/desfaz-paginas-ia-claras-2110.mjs'
import { semAdsCena952110, ADS_CENA_95_2110_ARQUIVOS } from './test-support/desfaz-ads-cena-95-2110.mjs'
import { semKidsVenda2010, KIDS_VENDA_2010_ARQUIVOS } from './test-support/desfaz-kids-venda-2010.mjs'

const BASE = '3e7ef8a42ea6c1f8566a6dbb55f10cc838b0dbdb' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
const rd = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const base = (p) => execFileSync('git', ['show', `${BASE}:${p}`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).replace(/\r\n/g, '\n')
let falhas = 0, oks = 0
const ok = (cond, msg) => { if (cond) { oks++; console.log('  ok  ' + msg) } else { falhas++; console.log('  FALHA  ' + msg) } }

// ── a lib pura, transpilada e importada de verdade ──────────────────────────────────────────────────────────────────
const LIB = 'lib/seo/paginasIaClaras2110.ts'
const js = ts.transpileModule(rd(LIB), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const lib = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const MODELOS = lib.MODELOS_PAGINAS_IA_CLARAS

// ── A. sem fundo escuro ─────────────────────────────────────────────────────────────────────────────────────────────
function luminancia(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** Diferença entre o canal mais forte e o mais fraco: ~0 = cinza/preto, alto = cor saturada (o azul da marca). */
function croma(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('')
  const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return Math.max(...v) - Math.min(...v)
}
/** Fundos escuros literais: hex NEUTRO (cinza/preto) de luminância < 0.4 ou quase preto (< 0.03), rgba escuro OPACO
 *  (alpha ≥ 0.7), PAGE_BG preto. O azul da marca (#0A5CFF, saturado) é botão, não fundo escuro. */
function fundosEscuros(src) {
  const achados = []
  for (const m of src.matchAll(/background(?:Color)?\s*:\s*'([^'\n]*)'|background(?:-color)?\s*:\s*([^;'\n]+);/g)) {
    const valor = m[1] ?? m[2]
    for (const hex of valor.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) { const l = luminancia(hex); if (l < 0.03 || (l < 0.4 && croma(hex) < 48)) achados.push(valor) }
    for (const rgba of valor.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)) {
      const [r, g, b, a = '1'] = rgba.slice(1)
      if (Number(r) + Number(g) + Number(b) < 200 && Number(a) >= 0.7) achados.push(valor)
    }
    if (/\bblack\b/.test(valor)) achados.push(valor)
  }
  for (const m of src.matchAll(/const PAGE_BG = '([^']+)'/g)) achados.push(m[1])
  return achados
}
const corVelha = (src) => /color:\s*'#f5f5f7'|'#2997ff'|'#86868b'/.test(src)

console.log('\nA. nenhum fundo escuro nos modelos')
for (const m of MODELOS) {
  const src = rd(m)
  const escuros = fundosEscuros(src)
  ok(escuros.length === 0, `${m}: sem fundo escuro${escuros.length ? ' — achados: ' + escuros.slice(0, 3).join(' | ') : ''}`)
  ok(!corVelha(src), `${m}: sem o texto claro/azul do tema preto (#f5f5f7, #2997ff, #86868b)`)
  ok(/<main[^>]*className=\{PAGINA_CLARA_CLASSE\}/.test(src) && /background: (PAGINA_CLARA_FUNDO|PAGE_BG)/.test(src), `${m}: <main className="kpl"> com o fundo claro da home`)
}
ok(lib.PAGINA_CLARA.bg === '#F7F7F5' && lib.PAGINA_CLARA.accent === '#0A5CFF' && lib.PAGINA_CLARA.text === '#0E1116', 'tokens = os da home clara (app/kineoLandingTheme.ts)')
const tema = rd('app/kineoLandingTheme.ts')
for (const cor of ['#F7F7F5', '#0A5CFF', '#0E1116', '#E4E4E0', '#5A5F67', '#EEF3FF']) ok(tema.includes(cor), `a cor ${cor} existe no tema da home`)

// ── B. menu do topo + 4 cards ───────────────────────────────────────────────────────────────────────────────────────
console.log('\nB. menu do topo e os 4 cards da home, logo abaixo do título')
// Os cards vêm logo depois do título E do 1º parágrafo (a resposta citável/intro): a regra de GEO da casa — o 1º parágrafo
// depois do H1 é a resposta que o ChatGPT cita (test-motores-geo, test-geo-rodada3) — continua valendo na página clara.
function cardsLogoAbaixoDoTitulo(src) {
  const fimH1 = src.indexOf('</h1>')
  const cards = src.indexOf('<PaginaClaraCards />')
  const proximoH2 = src.indexOf('<h2', fimH1)
  const entre = cards > fimH1 ? src.slice(fimH1, cards) : ''
  const blocos = (entre.match(/<\/p>|<EngineAnswerLead\b|data-kineo="geo-r3-answer"/g) ?? []).length
  return fimH1 > 0 && cards > fimH1 && (proximoH2 < 0 || cards < proximoH2) && blocos >= 1 && blocos <= 2 && src.split('<PaginaClaraCards />').length === 2
}
for (const m of MODELOS) {
  const src = rd(m)
  ok(src.split('<PaginaClaraTopo />').length === 2 && src.indexOf('<PaginaClaraTopo />') < src.indexOf('<h1'), `${m}: o menu do topo da home, uma vez, antes do título`)
  ok(cardsLogoAbaixoDoTitulo(src), `${m}: os 4 cards uma vez, logo abaixo do <h1> e do 1º parágrafo (a resposta segue colada ao título), antes do 1º <h2>`)
}
const moldura = rd('components/seo/PaginaClara.tsx')
ok(/import HomeThreeCards from '@\/components\/home\/HomeThreeCards'/.test(moldura) && /<HomeThreeCards signedIn=\{false\} kidsCard=\{HOME_4TH_CARD_LIVE\} \/>/.test(moldura), 'os cards são o MESMO componente da home (HomeThreeCards), com o 4º card pelo mesmo interruptor')
ok(/export const HOME_4TH_CARD_LIVE = true/.test(rd('lib/ui/homeKidsCard.ts')), 'o 4º card (AI Cartoon Videos) está ligado')
const ordem = rd('lib/ui/homeThreeCards.ts').match(/export const HOME_CARD_ORDER[^=]*=\s*\[([^\]]*)\]/)
ok(ordem && ordem[1].split(',').filter((x) => x.trim()).length === 3, 'Filme · Product Ads · UGC (3) + AI Cartoon Videos = 4 cards')
ok(/<HomeThreeCards signedIn=\{isSignedIn\} kidsCard=\{showKidsCard\} \/>/.test(rd('app/KineoLanding.tsx')), 'a home usa o mesmo componente (mesmos destinos dos botões azuis)')
ok(/import \{ KINEO_LANDING_THEME_CSS \} from '@\/app\/kineoLandingTheme'/.test(moldura) && !/^import .*(KLP_CSS|from '@\/app\/KineoLanding')/m.test(moldura) && rd('app/KineoLanding.tsx') === base('app/KineoLanding.tsx'), 'a faixa dos cards usa o tema claro exportado da home; a home (KineoLanding) segue byte a byte')
for (const item of ['<UiLabel>Make a film</UiLabel>','<UiLabel>Product ads</UiLabel>', '<NavUgcAdsLink data-nav-item="more:ugc" />', '{MENU_CARTOON_LABEL}', '{MENU_CONNECTOR_LABEL}', '🔥 Trending', '<UiLabel>Pricing</UiLabel>']) ok(moldura.includes(item), `o menu do topo tem ${item}`)

// ── C. title / canonical / JSON-LD intocados ────────────────────────────────────────────────────────────────────────
console.log('\nC. <title>, description, canonical, hreflang e JSON-LD iguais à base ' + BASE)
const SEO = /\btitle:|description:|canonical|alternates|languages:|hreflang|'@type'|'@context'|mainEntity|acceptedAnswer|itemListElement|application\/ld\+json|openGraph|twitter:|robots/
/** O bloco inteiro do `export const metadata` / `generateMetadata` (até o `}` da coluna 0 que o fecha). */
function blocoMetadata(src) {
  const ini = src.search(/^export (const metadata\b|(async )?function generateMetadata\b)/m)
  if (ini < 0) return ''
  const fim = src.indexOf('\n}', ini)
  return src.slice(ini, fim < 0 ? undefined : fim + 2)
}
const linhasSeo = (src) => [blocoMetadata(src), ...src.split('\n').filter((l) => SEO.test(l) && !/KINEO-PAGINAS-IA-CLARAS-2110/.test(l)).map((l) => l.trim())]
for (const m of MODELOS) ok(JSON.stringify(linhasSeo(rd(m))) === JSON.stringify(linhasSeo(base(m))), `${m}: linhas de title/description/canonical/JSON-LD iguais à base`)

// ── D. vitrine nova, curadoria intocada ─────────────────────────────────────────────────────────────────────────────
console.log('\nD. a vitrine velha saiu; a nova é a da /claude-connector; curadoria intocada')
const COM_GALERIA = ['app/ai-video-generator/[engine]/page.tsx', 'app/text-to-video-shorts/page.tsx', 'app/free-ai-shorts/[niche]/page.tsx', 'app/ai-video-generator/for/[slug]/page.tsx', 'app/gerador-de-shorts-gratis/page.tsx', 'app/free-ai-shorts-generator/page.tsx']
for (const m of COM_GALERIA) {
  const src = rd(m)
  ok(/<PaginaClaraVitrine\b/.test(src), `${m}: a vitrine atual na página`)
  ok(!/<(WallMedia|ExampleLiveMedia|ExampleVideoPlayer|NicheHouseFilm)\b|<video\b/.test(src), `${m}: nenhum player/galeria velho na tela`)
}
ok(/import ShowcaseGrid from '@\/app\/claude-connector\/ShowcaseGrid'/.test(moldura) && /<ShowcaseGrid \/>/.test(moldura), 'a vitrine é o ShowcaseGrid da /claude-connector (nenhuma curadoria nova)')
for (const p of ['lib/engineWall.ts', 'lib/homeVideoCuration.ts', 'app/claude-connector/ShowcaseGrid.tsx']) ok(rd(p) === base(p), `${p} igual à base (só leitura)`)

// ── E. /claude-connector pela origem ────────────────────────────────────────────────────────────────────────────────
console.log('\nE. /claude-connector: quem vem do ChatGPT abre na aba ChatGPT')
const casos = [
  [['chatgpt.com', null], true], [[null, 'https://chatgpt.com/'], true], [['openai', ''], true], [['ChatGPT', undefined], true],
  [[null, 'https://chat.openai.com/c/1'], true], [['google', 'https://www.google.com/'], false], [[undefined, undefined], false], [['claude', 'https://claude.ai/'], false],
]
for (const [[u, r], esperado] of casos) ok(lib.vemDoChatgpt(u, r) === esperado, `vemDoChatgpt(${JSON.stringify(u)}, ${JSON.stringify(r)}) = ${esperado}`)
ok(lib.chatgptPromptHref('Using the Kineo connector, x').startsWith('https://chatgpt.com/?q=Using%20the%20Kineo%20connector'), 'o pedido abre num chat novo do ChatGPT, codificado')
const painel = rd('app/claude-connector/ConnectPanel.tsx')
ok(/useState<TabKey>\('claude'\)/.test(painel), 'quem vem de outro lugar: a aba de sempre (Claude)')
ok(/if \(vemDoChatgpt\(sp\.get\('utm_source'\), document\.referrer\)\) setTab\('chatgpt'\)/.test(painel), 'utm_source/referrer com chatgpt|openai → aba ChatGPT')
const origem = rd('app/claude-connector/AiOrigin.tsx')
ok(/Try it in ChatGPT/.test(origem) && /Try it in Claude/.test(origem) && /Try in ChatGPT ↗/.test(origem) && /vemDoChatgpt\(new URLSearchParams\(window\.location\.search\)\.get\('utm_source'\), document\.referrer\)/.test(origem), 'a galeria troca "Try it in Claude" por "Try it in ChatGPT" pela mesma regra')
const conector = rd('app/claude-connector/page.tsx')
ok(/<TryItHeading h2Style=\{h2\}/.test(conector) && /chatgptHref=\{chatgptPromptHref\(pr\.prompt\)\}/.test(conector) && /PRESETS\.map\(/.test(conector), 'mesmo catálogo (PRESETS) nos dois casos')
ok(!/Engine set ·/.test(conector.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '')),'o selo "Engine set · <motor>" saiu dos cartões')

// ── F. /chatgpt ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\nF. /chatgpt: primeiro conectar, depois copiar; jargão só na caixa')
const pg = rd('app/chatgpt/page.tsx')
const cola = rd('app/chatgpt/ChatgptPastePanel.tsx')
ok(pg.indexOf('<ChatgptConnectSteps pasteNote={false} />') > 0 && pg.indexOf('<ChatgptConnectSteps') < pg.indexOf('<ChatgptPastePanel'), 'conectar vem antes de copiar o prompt')
ok(/export function ChatgptConnectSteps/.test(painel) && /<ChatgptConnectSteps \/>/.test(painel) && /CopyField value=\{CLAUDE_STUDIO_MCP_SERVER_URL\}/.test(painel), 'os passos são os MESMOS da aba ChatGPT da /claude-connector')
ok(/CLAUDE_STUDIO_MCP_SERVER_URL = 'https:\/\/www\.usekineo\.com\/api\/mcp\/studio'/.test(rd('lib/claudeConnect.ts')), 'a URL é https://www.usekineo.com/api/mcp/studio')
const corrido = pg.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
ok(!/HOOK|MICRO REWARD|ESCALATION|PAYOFF/.test(corrido), 'nenhum HOOK/MICRO REWARD/ESCALATION/PAYOFF no texto da página')
ok(/<details[^>]*>[\s\S]*?<summary[\s\S]*?<pre\s*\n\s*id="chatgpt-paste-prompt"[\s\S]*?\{prompt\}\s*\n\s*<\/pre>\s*\n\s*<\/details>/.test(cola), 'o prompt técnico fica dentro da caixa recolhida (<details>)')
ok(!/placeholder=\{'HOOK/.test(cola), 'a caixa de colar não mostra os rótulos técnicos')

// ── R. render real, código novo ─────────────────────────────────────────────────────────────────────────────────────
console.log('\nR. render real (react-dom/server) das páginas claras, com o código NOVO')
const plain = (name) => function Mock({ children }) { return React.createElement('div', { 'data-offline-boundary': name }, children) }
const MOCKS = {
  ...Object.fromEntries(['Footer', 'StickyFreeShortCTA', 'WallMedia', 'ExitIntentOffer'].map((n) => [`components/${n}.tsx`, { __esModule: true, default: plain(n) }])),
  'components/OrganicCtaLink.tsx': { __esModule: true, default: ({ children, source, placement, analyticsEvent, focusTargetId, ...props }) => React.createElement('a', props, children) },
  'lib/analytics.ts': { trackEvent: () => {} },
  'lib/studyStats.ts': { STUDY_REVALIDATE_SECONDS: 86400 }, // next/cache fica fora do render offline
  'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
  'lib/gptHandoff.ts': { ASSISTANT_PASTE_PROMPT: 'HOOK: x\nMICRO REWARD: y', DEFAULT_DURATION: 35, DURATIONS: [35, 60], HANDOFF_TTL_DAYS: 7, PASTE_ASSISTANTS: ['chatgpt'], SCRIPT_MAX_CHARS: 1000, ENGINE_LABELS: {} }, // node:crypto fica fora
}
const RENDERS = [
  ['app/ai-video-generator/[engine]/page.tsx', { params: { engine: 'seedance' } }, true],
  ['app/ai-video-generator/[engine]/page.tsx', { params: { engine: 'veo' } }, true],
  ['app/text-to-video-shorts/page.tsx', {}, true],
  ['app/free-ai-shorts/[niche]/page.tsx', { params: { niche: 'horror' } }, true],
  ['app/free-ai-shorts/[niche]/page.tsx', { params: { niche: 'localbusiness' } }, true],
  ['app/ai-video-generator/for/[slug]/page.tsx', { params: { slug: 'urdu' } }, true],
  ['app/gerador-de-shorts-gratis/page.tsx', {}, true],
  ['app/state-of-ai-shorts-2026/page.tsx', {}, false],
  ['app/best-ai-shorts-generators/page.tsx', {}, false],
  ['app/free-ai-shorts-generator/page.tsx', { searchParams: {} }, true],
  ['app/chatgpt/page.tsx', {}, false],
]
/** Estilos inline do HTML (fora dos <style>), sem as cores de var(--kpl-*, <fallback>) — dentro de .kpl o fallback não vale. */
function escurosNoHtml(html) {
  const ruins = []
  for (const m of html.replace(/<style[\s\S]*?<\/style>/g, '').matchAll(/style="([^"]*)"/g)) {
    const st = m[1].replace(/var\((--kpl-[a-z-]+),\s*(?:[^()]|\([^()]*\))*\)/g, 'var($1)')
    for (const x of st.matchAll(/background(?:-color)?:\s*([^;]+)/gi)) {
      for (const hex of x[1].match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) { const l = luminancia(hex); if (l < 0.03 || (l < 0.4 && croma(hex) < 48)) ruins.push(st.slice(0, 80)) }
      for (const r of x[1].matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)) if (+r[1] + +r[2] + +r[3] < 200 && Number(r[4] ?? 1) >= 0.7) ruins.push(st.slice(0, 80))
    }
    const sobreAzulOuVeu = /background:\s*(#0A5CFF|var\(--kpl-accent\)|rgba\(10,\s*12,\s*18|rgba\(0,\s*0,\s*0)|text-shadow/i.test(st)
    if (!sobreAzulOuVeu && /(?:^|;)\s*color:\s*(#f5f5f7|#d2d2d7|#86868b|#fff\b|#ffffff|rgba\(255,\s*255,\s*255)/i.test(st)) ruins.push('texto claro: ' + st.slice(0, 80))
  }
  return ruins
}
const carrega = offlineModules({ mocks: MOCKS })
for (const [file, props, vitrine] of RENDERS) {
  let html = ''
  try { html = renderToStaticMarkup(await carrega(file).default(props)) } catch (e) { ok(false, `${file} ${JSON.stringify(props)}: renderiza (${e.message.slice(0, 120)})`); continue }
  const corpo = html.replace(/<style[\s\S]*?<\/style>/g, '')
  const cards = (corpo.match(/data-home-card="/g) ?? []).length
  ok(cards === 4 && corpo.includes('data-home-3-cards="1"') && corpo.includes('data-pagina-clara="topo"'), `${file} ${JSON.stringify(props)}: menu do topo + 4 cards da home renderizados (${cards})`)
  ok(!vitrine || corpo.includes('data-pagina-clara="vitrine"'), `${file} ${JSON.stringify(props)}: ${vitrine ? 'a vitrine atual renderizada' : 'página sem galeria (nada a trocar)'}`)
  const ruins = escurosNoHtml(html)
  ok(ruins.length === 0, `${file} ${JSON.stringify(props)}: nenhum fundo escuro neutro nem texto claro do tema preto no HTML${ruins.length ? ' — ' + ruins.slice(0, 2).join(' | ') : ''}`)
}

// ── X. o desfaz dos guardiões antigos ───────────────────────────────────────────────────────────────────────────────
console.log('\nX. desfaz exato da camada (para os guardiões antigos)')
const difs = PAGINAS_IA_CLARAS_2110_ARQUIVOS.filter((f) => { try { return semPaginasIaClaras2110(readFileSync(f, 'utf8'), f).replace(/\r\n/g, '\n') !== base(f) } catch { return true } })
ok(PAGINAS_IA_CLARAS_2110_BASE === BASE && PAGINAS_IA_CLARAS_2110_ARQUIVOS.length > 0 && difs.length === 0, `X1 os ${PAGINAS_IA_CLARAS_2110_ARQUIVOS.length} arquivos tocados, desfeitos, = base ${BASE} (${difs.join(', ') || 'ok'})`)
ok(PAGINAS_IA_CLARAS_2110_ARQUIVOS.every((f) => readFileSync(f, 'utf8').includes(MARCA_PAGINAS_IA_CLARAS_2110)), 'X2 todo arquivo tocado leva a marca')
const novosOk = PAGINAS_IA_CLARAS_2110_NOVOS.every((f) => existsSync(f) && (() => { try { base(f); return false } catch { return true } })())
ok(novosOk && ['components/seo/PaginaClara.tsx', 'lib/seo/paginasIaClaras2110.ts', 'app/claude-connector/AiOrigin.tsx', 'scripts/test-paginas-ia-claras-2110.mjs'].every((f) => PAGINAS_IA_CLARAS_2110_NOVOS.includes(f)), `X3 os ${PAGINAS_IA_CLARAS_2110_NOVOS.length} arquivos novos existem e não existiam na base`)
const motorPath = 'app/ai-video-generator/[engine]/page.tsx'
let lancou = false
try { semPaginasIaClaras2110(rd(motorPath).replace('<PaginaClaraVitrine />', '<PaginaClaraVitrine id="x" />'), motorPath) } catch { lancou = true }
ok(lancou && semPaginasIaClaras2110('sem a marca', motorPath) === 'sem a marca' && semPaginasIaClaras2110(rd(motorPath), 'outro/arquivo.tsx') === rd(motorPath) && semPaginasIaClaras2110(null, motorPath) === null, 'X4 trecho mudado por outra mão lança; sem a marca / fora da lista / null volta intocado')
const crlf = rd(motorPath).replace(/\n/g, '\r\n')
ok(semPaginasIaClaras2110(crlf, motorPath) === base(motorPath).replace(/\n/g, '\r\n'), 'X5 fim de linha preservado (CRLF entra, CRLF sai)')
ok(PAGINAS_IA_CLARAS_2110_ARQUIVOS.every(p => { const restored = semPaginasIaClaras2110(rd(p), p); return semPaginasIaClaras2110(restored, p) === restored }), 'X6 desfaz idempotente em todos os arquivos existentes')
for (const p of new Set([...ADS_CENA_95_2110_ARQUIVOS, ...KIDS_VENDA_2010_ARQUIVOS])) {
  const atual = rd(p), anterior = base(p)
  ok(semPaginasIaClaras2110(atual, p) === anterior && semAdsCena952110(atual, p) === semAdsCena952110(anterior, p) && semKidsVenda2010(atual, p) === semKidsVenda2010(anterior, p), `X7 Páginas → main com Cena95/Kids → camadas anteriores exatas: ${p}`)
}
const ordemAntes = (src, primeira, segunda) => src.indexOf(primeira) >= 0 && src.indexOf(primeira) < src.indexOf(segunda)
ok(ordemAntes(rd('scripts/test-support/desfaz-ads-cena-ajuste-2110.mjs'), 'texto = semPaginasIaClaras2110(texto, p)', 'texto = semAdsCena952110(texto, p)') && ordemAntes(rd('scripts/test-support/desfaz-ads-cena-95-2110.mjs'), 'texto = semPaginasIaClaras2110(texto, p)', "const rel = String(p ?? '')") && ordemAntes(rd('scripts/test-support/desfaz-bing-seo-1510.mjs'), 'src = semPaginasIaClaras2110(src, rel)', "const key = String(rel ?? '')"), 'X8 camadas mais novas saem antes das consultas/trocas de Cena95, Ajuste e Bing')
const declarados = new Set([...PAGINAS_IA_CLARAS_2110_ARQUIVOS, ...PAGINAS_IA_CLARAS_2110_NOVOS])
const alterados = execFileSync('git', ['diff', '--name-only', BASE], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
ok(alterados.length > 0 && alterados.every(p => declarados.has(p)), 'X9 diff completo contra a main só contém arquivos declarados da camada')
const assuntos = execFileSync('git', ['log', '--format=%s', BASE + '..HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
ok(assuntos.length > 0 && assuntos.every(ehCommitPaginasIaClaras2110), 'X10 todo commit próprio leva prefixo e TRAVA exatos; nenhum assunto alheio é excluído')

// ── M. mutantes ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\nM. mutantes (cada verificador acusa o que devia)')
const motor = rd(MODELOS[0])
ok(fundosEscuros(motor.replace('background: PAGINA_CLARA_FUNDO', "background: '#000'")).length > 0, 'M1 fundo #000 no <main> é acusado')
ok(fundosEscuros("x={{ background: 'rgba(11,17,32,0.85)' }}").length > 0 && fundosEscuros("x={{ background: 'rgba(0,0,0,0.6)' }}").length === 0, 'M2 rgba escuro opaco é acusado; véu translúcido de selo passa')
ok(fundosEscuros("const PAGE_BG = '#000'").length > 0 && fundosEscuros('.a{ background: #0d0d0f; }').length > 0, 'M3 PAGE_BG preto e CSS escuro em <style> são acusados')
ok(!cardsLogoAbaixoDoTitulo(motor.replace('<PaginaClaraCards />', '')) && !cardsLogoAbaixoDoTitulo('<h1>x</h1><p>a</p><h2>y</h2><PaginaClaraCards />') && !cardsLogoAbaixoDoTitulo('<h1>x</h1><PaginaClaraCards /><p>a</p>'), 'M4 cards ausentes, abaixo do 1º <h2> ou ANTES da resposta (entre o H1 e o 1º parágrafo) são acusados')
ok(JSON.stringify(linhasSeo(motor.replace('AI Video Generator for YouTube Shorts | Kineo', 'X | Kineo'))) !== JSON.stringify(linhasSeo(base(MODELOS[0]))), 'M5 título mudado é acusado')
ok(corVelha("style={{ color: '#f5f5f7' }}"), 'M6 texto claro do tema preto é acusado')
ok(escurosNoHtml('<div style="background:#161618;color:#000"></div>').length === 1 && escurosNoHtml('<p style="color:#f5f5f7">x</p>').length === 1 && escurosNoHtml('<div style="background:var(--kpl-card, #161618);color:var(--kpl-text, #f5f5f7)"></div>').length === 0 && escurosNoHtml('<a style="background:#0A5CFF;color:#fff">x</a>').length === 0, 'M7 no HTML: fundo escuro e texto claro acusados; var(--kpl-*) e botão azul passam')
ok(ehCommitPaginasIaClaras2110(MARCA_PAGINAS_IA_CLARAS_2110 + ' ' + PAGINAS_IA_CLARAS_2110_TRAVA) && ehCommitPaginasIaClaras2110(MARCA_PAGINAS_IA_CLARAS_2110 + ': ' + PAGINAS_IA_CLARAS_2110_TRAVA) && !ehCommitPaginasIaClaras2110(MARCA_PAGINAS_IA_CLARAS_2110 + '-ALHEIO ' + PAGINAS_IA_CLARAS_2110_TRAVA) && !ehCommitPaginasIaClaras2110(MARCA_PAGINAS_IA_CLARAS_2110 + ' sem autorização') && !ehCommitPaginasIaClaras2110('outro ' + MARCA_PAGINAS_IA_CLARAS_2110 + ' ' + PAGINAS_IA_CLARAS_2110_TRAVA), 'M8 prefixo parecido, marca no meio ou TRAVA ausente não escondem commit alheio')
let extraRejeitada = false
try { semPaginasIaClaras2110(rd(motorPath) + '\n// fonte adulterada fora do bloco\n', motorPath) } catch { extraRejeitada = true }
ok(extraRejeitada, 'M9 fonte adulterada fora do bloco também é recusada pelo desfaz integral')

console.log(`\n${oks} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
