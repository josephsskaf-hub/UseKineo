// KINEO-PROMO-CARDS-2026-09-30 — guardião da fileira de cards grandes logo abaixo do menu da home.
//
// Prova: (1) os 3 links certos (/claude-connector, /ads e /clips), na ordem do fundador (Claude · Ads · Clips), e a fileira DEPOIS do menu e ANTES do hero;
// (2) o card do Claude não promete o que ainda não é verdade (official/partner/approved/certified/"by Anthropic",
// diretório, logo) — mesma régua do test-works-with-claude-2026-09-30; (3) vídeo mudo + loop + playsInline + pôster,
// sem autoplay nem preload pesado, tocando só quando visível; (4) prefers-reduced-motion respeitado no CSS e no JS;
// (5) as prévias existem e pesam ≤ 1,5 MB; (6) subtítulos traduzidos nas 16 línguas; (7) curadoria intocada.
// Estilo readFileSync + transpile (roda sem alias `@/`); mutantes no fim provam que cada verificação enxerga o defeito.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => {
  if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) }
}
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { throw new Error('import inesperado ' + n) })
  return m.exports
}

const dataSrc = read('lib/ui/promoCards.ts')
const compSrc = read('components/PromoCards.tsx')
const landing = read('app/KineoLanding.tsx')
const refine = JSON.parse(read('lib/ui/refinementCopy.json'))

/** Promessa que ainda não é verdade (listagem do diretório em revisão). */
const OVERCLAIM = /\b(official|officially|partner(s|ship)?|endorsed|certified|approved|verified|by anthropic|anthropic|directory|featured in claude)\b/i
/** O conector NÃO gera mídia dentro do Claude (regra do diretório): escreve o roteiro e manda para o Kineo Studio.
 *  Reprova "make videos" e qualquer gerar/criar/renderizar vídeo/clipe/anúncio "in/inside/from Claude". */
const MEDIA_IN_CLAUDE = /\bmake\s+videos?\b|\b(make|makes|making|generate|generates|generating|create|creates|creating|render|renders|rendering)\s+(?:[\w’']+[\s,]+){0,4}?(videos?|clips?|ads?|media)\b[^.]*\b(in|inside|from|within)\s+(a\s+)?claude\b/i

// ─── regras (funções puras, reaproveitadas pelos mutantes) ───────────────────
function dataProblems(src) {
  const probs = []
  let mod
  try { mod = roda(src) } catch (e) { return ['lib não transpila/roda: ' + e.message] }
  const cards = mod.PROMO_CARDS || []
  const claude = cards.find((c) => c.id === 'claude')
  const clips = cards.find((c) => c.id === 'clips')
  const ads = cards.find((c) => c.id === 'ads')
  if (cards.map((c) => c.id).join(',') !== 'claude,ads,clips') probs.push(`ordem da fileira ≠ Claude · Ads · Clips (${cards.map((c) => c.id).join(',')})`)
  if (!ads || ads.href !== '/ads') probs.push('card de Ads não aponta para /ads (a porta pública que a home já usa)')
  if (ads) {
    if (ads.title !== 'ADS: 3 VARIATIONS') probs.push('título do card de Ads mudou')
    if (ads.art.kind !== 'video' || ads.art.src !== '/previews/promo-ads-3-variacoes.mp4' || ads.art.poster !== '/posters/promo-ads-3-variacoes.webp') probs.push('card de Ads sem o vídeo/pôster do fundador')
    if (ads.gate) probs.push('card de Ads com interruptor inesperado')
  }
  if (!claude || claude.href !== '/claude-connector') probs.push('card do Claude não aponta para /claude-connector')
  // Destino numa constante única (troca em UMA linha quando a listagem do diretório for aprovada) — e nada de diretório ANTES disso.
  if (mod.CLAUDE_CARD_HREF !== '/claude-connector') probs.push(`CLAUDE_CARD_HREF = ${mod.CLAUDE_CARD_HREF} (listagem ainda em revisão: só /claude-connector)`)
  const code = src.replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, '')
  if ((code.match(/\/claude-connector/g) || []).length !== 1 || !/href: CLAUDE_CARD_HREF,/.test(code)) probs.push('destino do card do Claude fora da constante única CLAUDE_CARD_HREF')
  if (/claude\.ai\/|anthropic\.com|directory/i.test(code)) probs.push('URL de diretório/Anthropic no código dos cards antes da aprovação')
  if (!clips || clips.href !== '/clips') probs.push('card do Clips não aponta para /clips')
  if (claude) {
    const visible = [claude.title, claude.subtitle, ...(claude.art.bands || [])].join(' | ')
    if (OVERCLAIM.test(visible)) probs.push(`card do Claude promete demais: ${visible.match(OVERCLAIM)[0]}`)
    if (MEDIA_IN_CLAUDE.test(visible)) probs.push(`card do Claude diz que a mídia nasce no Claude: ${visible.match(MEDIA_IN_CLAUDE)[0]}`)
    if (!/in Claude/.test(claude.subtitle) || !/Kineo Studio/.test(claude.subtitle)) probs.push('subtítulo do Claude não diz onde cada parte acontece (roteiro no Claude, render no Kineo Studio)')
    if (claude.art.kind !== 'poster') probs.push('card do Claude deixou de ser pôster em CSS (vídeo/imagem pode carregar logo)')
    if (claude.title !== 'KINEO FOR CLAUDE') probs.push('título do card do Claude mudou')
  }
  if (clips) {
    if (clips.art.kind !== 'video') probs.push('card do Clips sem vídeo')
    if (clips.title !== 'CLIPS') probs.push('título do card do Clips mudou')
    if (!/^\/previews\/[\w-]+\.mp4$/.test(clips.art.src || '')) probs.push('vídeo do Clips fora de /previews/*.mp4')
    if (!/^\/posters\/[\w-]+\.webp$/.test(clips.art.poster || '')) probs.push('pôster do Clips fora de /posters/*.webp')
    if (clips.gate !== 'clips') probs.push('card do Clips sem o interruptor do produto')
    if (JSON.stringify(clips.art.chips) !== '["5","7","10","15"]') probs.push('durações do Clips ≠ 5·7·10·15 (as que o produto faz)')
  }
  // O card do Clips some quando o interruptor está fechado; o do Claude fica.
  if (mod.promoCardsFor) {
    const closed = mod.promoCardsFor({ clips: false }).map((c) => c.id).join(',')
    const open = mod.promoCardsFor({ clips: true }).map((c) => c.id).join(',')
    if (closed !== 'claude,ads' || open !== 'claude,ads,clips') probs.push(`promoCardsFor errado (fechado=${closed} aberto=${open})`)
  } else probs.push('promoCardsFor ausente')
  return probs
}

function componentProblems(src) {
  const probs = []
  const video = (src.match(/<video[\s\S]*?\/>/) || [''])[0]
  if (!video) probs.push('sem <video>')
  for (const attr of ['muted', 'playsInline', 'loop']) {
    if (!new RegExp(`^\\s+${attr}\\s*$`, 'm').test(video)) probs.push(`<video> sem ${attr}`)
  }
  if (!/poster=\{art\.poster\}/.test(video)) probs.push('<video> sem pôster')
  if (/\bautoPlay\b/.test(video)) probs.push('<video> com autoPlay (toca fora da tela e ignora reduced-motion)')
  if (!/preload="(none|metadata)"/.test(video)) probs.push('<video> sem preload leve')
  if (/<audio|controls/.test(video)) probs.push('<video> com controles/áudio')
  // Toca só quando visível.
  if (!/new IntersectionObserver\(/.test(src) || !/video\.play\(\)/.test(src) || !/video\.pause\(\)/.test(src)) probs.push('vídeo não é ligado/desligado por IntersectionObserver')
  // reduced-motion no JS (não toca) e no CSS (animações só em no-preference).
  if (!/matchMedia\(REDUCED_MOTION\)/.test(src) || !/const REDUCED_MOTION = '\(prefers-reduced-motion: reduce\)'/.test(src)) probs.push('JS não consulta prefers-reduced-motion')
  if (!/if \(visible && !reduce\)/.test(src)) probs.push('vídeo toca mesmo com reduced-motion')
  const css = (src.match(/PROMO_CARDS_CSS = `([\s\S]*?)`/) || [, ''])[1]
  const noPref = css.indexOf('@media (prefers-reduced-motion: no-preference){')
  const animations = [...css.matchAll(/animation:/g)].map((m) => m.index)
  if (noPref < 0) probs.push('CSS sem bloco prefers-reduced-motion: no-preference')
  else {
    const close = css.indexOf('\n}\n', noPref)
    if (animations.some((i) => i < noPref || i > close)) probs.push('animação fora do bloco no-preference (roda com reduced-motion)')
  }
  // Sem layout shift: altura por aspect-ratio.
  if (!/\.kpc-media\{[^}]*aspect-ratio:512\/348/.test(css)) probs.push('mídia sem aspect-ratio fixo')
  // Sem barra de rolagem e com snap.
  if (!/scroll-snap-type:x mandatory/.test(css) || !/scrollbar-width:none/.test(css) || !/::-webkit-scrollbar\{display:none\}/.test(css)) probs.push('fileira sem snap ou com barra de rolagem')
  // Nada de logo/imagem da Anthropic ou do Claude no componente.
  if (/<img|<Image|<svg|logo/i.test(src.replace(/\/\/.*$/gm, ''))) probs.push('imagem/logo no componente')
  const tag = (src.match(/className="kpc-tag">([^<]*)</) || [, ''])[1]
  if (OVERCLAIM.test(tag)) probs.push(`etiqueta do pôster promete demais: ${tag}`)
  return probs
}

function telemetryProblems(compCode, dataCode, eventsRoute) {
  const probs = []
  const mod = roda(dataCode)
  if (mod.PROMO_CLICK_EVENT !== 'promo_card_clicked') probs.push('evento de clique ≠ promo_card_clicked')
  const m = mod.promoClickMetadata ? mod.promoClickMetadata(mod.PROMO_CARDS[1], 1) : null
  if (!m || m.card !== 'ads' || m.position !== 2 || m.href !== '/ads' || m.promo_v !== mod.PROMO_TELEMETRY_VERSION) probs.push('metadados do clique errados (card/posição/href/versão)')
  if (m && Object.values(m).some((v) => typeof v === 'string' && /[A-Z]{3,}|\s/.test(v))) probs.push('metadados carregam texto (título/tradução) em vez do id')
  if (!compCode.includes('onClick={() => { void trackEvent(PROMO_CLICK_EVENT, promoClickMetadata(card, i)) }}')) probs.push('card sem onClick que grava promo_card_clicked')
  if (!compCode.includes("import { trackEvent } from '@/lib/analytics'")) probs.push('trackEvent não importado')
  const serverOnly = (eventsRoute.match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/) || [, ''])[1]
  if (serverOnly.includes("'promo_card_clicked'")) probs.push('promo_card_clicked na lista SERVER_ONLY (o navegador não grava)')
  return probs
}

function landingProblems(src) {
  const probs = []
  const nav = src.indexOf('</div></nav>')
  const row = src.indexOf('<PromoCards cards={promoCardsFor({ clips: clipsVisible(initialEmail) })} />')
  const hero = src.indexOf('<header className="hero">')
  if (row < 0) probs.push('fileira ausente da home')
  else if (!(nav < row && row < hero)) probs.push('fileira fora do lugar (tem de vir logo abaixo do menu, antes do hero)')
  if (!src.includes("import PromoCards from '@/components/PromoCards'")) probs.push('import do componente ausente')
  // Curadoria do fundador intocada: hero de filmes e vitrine de motores seguem na página.
  for (const keep of ['<HomeFeaturedFilms />', 'id="engines"', 'engineWall']) if (!src.includes(keep)) probs.push(`curadoria mexida: sumiu ${keep}`)
  return probs
}

function copyProblems(dict, src) {
  const probs = []
  const mod = roda(src)
  const phrases = [...new Set([...mod.PROMO_CARDS.map((c) => c.subtitle), 'NEW', 'New at Kineo'])]
  if (Object.keys(dict).length !== 16) probs.push(`refinementCopy com ${Object.keys(dict).length} línguas, não 16`)
  for (const [lang, d] of Object.entries(dict)) {
    for (const p of phrases) {
      const t = d[p]
      if (typeof t !== 'string' || !t.trim()) { probs.push(`${lang}: sem "${p}"`); continue }
      const nums = p.match(/\d+/g) || []
      if (!nums.every((n) => t.includes(n))) probs.push(`${lang}: números perdidos em "${p}"`)
      if (/Kineo/.test(p) && !/Kineo/.test(t)) probs.push(`${lang}: "Kineo" traduzido em "${p}"`)
      if (/Claude/.test(p) && !/Claude/.test(t)) probs.push(`${lang}: "Claude" traduzido em "${p}"`)
      if (OVERCLAIM.test(t) && /Claude/.test(p)) probs.push(`${lang}: tradução do card do Claude promete demais`)
    }
  }
  return probs
}

function fileProblems() {
  const probs = []
  const MAX = 1.5 * 1024 * 1024
  for (const rel of ['public/previews/promo-clips-storm.mp4', 'public/posters/promo-clips-storm.webp', 'public/previews/promo-ads-3-variacoes.mp4', 'public/posters/promo-ads-3-variacoes.webp']) {
    const p = path.join(ROOT, rel)
    if (!fs.existsSync(p)) { probs.push(`${rel} não existe`); continue }
    const size = fs.statSync(p).size
    if (size > MAX) probs.push(`${rel} tem ${(size / 1048576).toFixed(2)} MB (> 1,5 MB)`)
    if (size < 1024) probs.push(`${rel} vazio (${size} B)`)
  }
  for (const rel of ['public/previews/promo-clips-storm.mp4', 'public/previews/promo-ads-3-variacoes.mp4']) {
    const p = path.join(ROOT, rel)
    const mp4 = fs.existsSync(p) ? fs.readFileSync(p) : Buffer.alloc(0)
    const moov = mp4.indexOf('moov')
    const mdat = mp4.indexOf('mdat')
    if (!(moov > 0 && mdat > 0 && moov < mdat)) probs.push(`${rel} sem faststart (moov depois do mdat)`)
    if (mp4.includes(Buffer.from('soun'))) probs.push(`${rel} com trilha de áudio`)
  }
  return probs
}

// ─── o real ────────────────────────────────────────────────────────────────
const dp = dataProblems(dataSrc)
const eventsRoute = read('app/api/events/route.ts')
ok(dp.length === 0, `(1) dados: /claude-connector + /ads + /clips na ordem, títulos, durações, interruptor, selo honesto (${dp.join('; ') || 'ok'})`)
const cp = componentProblems(compSrc)
ok(cp.length === 0, `(2) componente: vídeo mudo+loop+playsInline+pôster, IO, reduced-motion, aspect-ratio, snap sem barra (${cp.join('; ') || 'ok'})`)
const lp = landingProblems(landing)
ok(lp.length === 0, `(3) home: fileira logo abaixo do menu, antes do hero, curadoria intacta (${lp.join('; ') || 'ok'})`)
const tp = copyProblems(refine, dataSrc)
ok(tp.length === 0, `(4) textos nas 16 línguas, números/Kineo/Claude preservados (${tp.slice(0, 4).join('; ') || 'ok'})`)
const fp = fileProblems()
ok(fp.length === 0, `(5) prévias existem, ≤ 1,5 MB, faststart, sem áudio (${fp.join('; ') || 'ok'})`)
ok(!/lib\/engineWall/.test(compSrc + dataSrc), '(6) a fileira não lê nem mexe na curadoria de lib/engineWall')

// ─── mutantes (aplicar e ver vermelho) ──────────────────────────────────────
ok(componentProblems(compSrc.replace(/^\s+muted\n/m, '\n')).length > 0, '(M1) <video> sem muted → vermelho')
ok(dataProblems(dataSrc.replace("title: 'KINEO FOR CLAUDE'", "title: 'OFFICIAL KINEO FOR CLAUDE'")).length > 0, '(M2) "official" no título do Claude → vermelho')
ok(dataProblems(dataSrc.replace("'Write your video in Claude, render it in Kineo Studio'", "'Official Claude partner for videos'")).length > 0, '(M3) "partner" no subtítulo → vermelho')
ok(dataProblems(dataSrc.replace("['KINEO IN', 'CLAUDE', 'SCRIPT → STUDIO']", "['KINEO IN', 'CLAUDE', 'BY ANTHROPIC']")).length > 0, '(M4) "by Anthropic" no pôster → vermelho')
ok(dataProblems(dataSrc.replace("CLAUDE_CARD_HREF = '/claude-connector'", "CLAUDE_CARD_HREF = '/mcp'")).length > 0, '(M5) link do Claude errado → vermelho')
ok(dataProblems(dataSrc.replace("CLAUDE_CARD_HREF = '/claude-connector'", "CLAUDE_CARD_HREF = 'https://claude.ai/directory/kineo'")).length > 0, '(M18) URL do diretório antes da aprovação → vermelho')
ok(dataProblems(dataSrc.replace('href: CLAUDE_CARD_HREF,', "href: '/claude-connector',")).length > 0, '(M19) destino digitado fora da constante única → vermelho')
ok(dataProblems(dataSrc.replace("href: '/clips'", "href: '/studio'")).length > 0, '(M6) link do Clips errado → vermelho')
ok(componentProblems(compSrc.replace(/^\s+loop\n/m, '\n')).length > 0, '(M7) <video> sem loop → vermelho')
ok(componentProblems(compSrc.replace(/^\s+playsInline\n/m, '\n')).length > 0, '(M8) <video> sem playsInline → vermelho')
ok(componentProblems(compSrc.replace('poster={art.poster}', '')).length > 0, '(M9) <video> sem pôster → vermelho')
ok(componentProblems(compSrc.replace('if (visible && !reduce)', 'if (visible)')).length > 0, '(M10) vídeo toca com reduced-motion → vermelho')
ok(componentProblems(compSrc.replace('@media (prefers-reduced-motion: no-preference){\n', '')).length > 0, '(M11) animação sem guarda de reduced-motion → vermelho')
ok(componentProblems(compSrc.replace('preload="none"', 'autoPlay preload="auto"')).length > 0, '(M12) autoPlay + preload pesado → vermelho')
ok(landingProblems(landing.replace('      <PromoCards cards={promoCardsFor({ clips: clipsVisible(initialEmail) })} />\n', '')).length > 0, '(M13) fileira removida da home → vermelho')
ok(dataProblems(dataSrc.replace("gate: 'clips',", '')).length > 0, '(M14) Clips sem interruptor → vermelho')
ok(dataProblems(dataSrc.replace("href: '/ads',", "href: '/ads/new',")).length > 0, '(M16) link de Ads errado → vermelho')
ok(dataProblems(dataSrc.replace("id: 'ads',", "id: 'ads-x',")).length > 0, '(M17) card de Ads fora da ordem/ausente → vermelho')
{
  const d = JSON.parse(JSON.stringify(refine)); delete d.pt['Write your video in Claude, render it in Kineo Studio']
  ok(copyProblems(d, dataSrc).length > 0, '(M15) subtítulo sem tradução em pt → vermelho')
}

const yp = telemetryProblems(compSrc, dataSrc, eventsRoute)
ok(yp.length === 0, `(7) clique por card grava promo_card_clicked {card, position, href, promo_v} (${yp.join('; ') || 'ok'})`)
ok(telemetryProblems(compSrc.replace('onClick={() => { void trackEvent(PROMO_CLICK_EVENT, promoClickMetadata(card, i)) }}', ''), dataSrc, eventsRoute).length > 0, '(M20) card sem medição de clique → vermelho')
ok(telemetryProblems(compSrc, dataSrc.replace('card: card.id,', 'card: card.title,'), eventsRoute).length > 0, '(M21) clique gravando o título em vez do id → vermelho')
ok(telemetryProblems(compSrc, dataSrc, eventsRoute.replace('const SERVER_ONLY_EVENTS = new Set([', "const SERVER_ONLY_EVENTS = new Set([\n  'promo_card_clicked',")).length > 0, '(M22) evento bloqueado no sink do navegador → vermelho')
ok(dataProblems(dataSrc.replace("'Write your video in Claude, render it in Kineo Studio'", "'Make videos in Claude'")).length > 0, '(M23) "Make videos in Claude" → vermelho')
ok(dataProblems(dataSrc.replace("'Write your video in Claude, render it in Kineo Studio'", "'Generate clips and ads inside Claude'")).length > 0, '(M24) "Generate clips … inside Claude" → vermelho')
ok(!MEDIA_IN_CLAUDE.test('Write your video in Claude, render it in Kineo Studio'), '(M25) a frase honesta nova NÃO é pega pela régua (sem falso vermelho)')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
