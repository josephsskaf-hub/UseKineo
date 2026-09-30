// KINEO-PROMO-CARDS-2026-09-30 — guardião da fileira de cards grandes logo abaixo do menu da home.
//
// Prova: (1) os 4 links certos (/claude-connector, /ads, /clips e /images), na ordem do fundador (Claude · Ads · Clips · Nano Banana Pro), e a fileira DEPOIS do menu e ANTES do hero;
// REANCORADO 30/09 (fundador: "quatro cards na primeira fileira… 3 vídeos rodando igual a gente tinha anteriormente"): cada card é um
// carrossel de 3 vídeos que troca no onEnded; o do Claude deixou de ser pôster em CSS — as faixas viraram letreiro por cima das
// amostras feitas NA Kineo que a /claude-connector já mostra (sem logo da Anthropic), e o card de Images não promete 4K (o gerador
// não pede resolução ao fornecedor: sai 1376×768).
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
  const images = cards.find((c) => c.id === 'images')
  if (cards.map((c) => c.id).join(',') !== 'claude,ads,clips,images') probs.push(`ordem da fileira ≠ Claude · Ads · Clips · Images (${cards.map((c) => c.id).join(',')})`)
  for (const c of cards) {
    const clipsOk = c.art && c.art.kind === 'reel' && Array.isArray(c.art.clips) && c.art.clips.length === 3
      && c.art.clips.every((v) => /^\/previews\/promo-[\w-]+\.mp4$/.test(v.src) && /^\/posters\/promo-[\w-]+\.webp$/.test(v.poster))
    if (!clipsOk) probs.push('card ' + c.id + ' sem os 3 vídeos (/previews/promo-*.mp4 + /posters/promo-*.webp)')
  }
  if (!ads || ads.href !== '/ads') probs.push('card de Ads não aponta para /ads (a porta pública que a home já usa)')
  if (ads) {
    if (ads.title !== 'ADS: 3 VARIATIONS') probs.push('título do card de Ads mudou')
    if ((ads.art.clips || []).map((v) => v.src).join(',') !== '/previews/promo-ads-a.mp4,/previews/promo-ads-b.mp4,/previews/promo-ads-c.mp4') probs.push('card de Ads sem os 3 anúncios A/B/C')
    // Fundador 30/09: "deixar os cards limpos… sem 5 s, 7 s, 10, 15… sem ABC".
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
    if ((claude.art.clips || []).some((v) => !/^\/previews\/promo-claude-\d\.mp4$/.test(v.src))) probs.push('card do Claude com vídeo fora das amostras Kineo (promo-claude-N)')
    if (JSON.stringify(claude.art.bands) !== '["KINEO IN CLAUDE"]') probs.push('letreiro do Claude ≠ "KINEO IN CLAUDE" (uma linha, pequeno)')
    if (!['cobalt', 'glass', 'paper'].includes(claude.art.bandTone)) probs.push('cor do letreiro do Claude fora das 3 aprovadas')
    if (OVERCLAIM.test(claude.art.tag || '')) probs.push('etiqueta do Claude promete demais')
    if (claude.title !== 'KINEO FOR CLAUDE') probs.push('título do card do Claude mudou')
  }
  if (clips) {
    if (clips.title !== 'CLIPS') probs.push('título do card do Clips mudou')
    if (clips.gate !== 'clips') probs.push('card do Clips sem o interruptor do produto')

  }
  if (cards.some((c) => 'chips' in c.art || 'tag' in c.art || 'badge' in c.art)) probs.push('card com chips/etiqueta/selo por cima do vídeo (fundador 30/09: cards limpos, "sem clips new")')
  if (!images || images.href !== '/images') probs.push('card de Images não aponta para /images')
  if (images) {
    if (images.title !== 'NANO BANANA PRO') probs.push('título do card de Images mudou')
    if (/\b[248]K\b|ultra ?hd/i.test([images.title, images.subtitle, images.art.tag || ''].join(' '))) probs.push('card de Images promete resolução que o gerador não pede (sai 1376×768)')
    if (images.gate) probs.push('card de Images com interruptor inesperado')
  }
  // O card do Clips some quando o interruptor está fechado; o do Claude fica.
  if (mod.promoCardsFor) {
    const closed = mod.promoCardsFor({ clips: false }).map((c) => c.id).join(',')
    const open = mod.promoCardsFor({ clips: true }).map((c) => c.id).join(',')
    if (closed !== 'claude,ads,images' || open !== 'claude,ads,clips,images') probs.push(`promoCardsFor errado (fechado=${closed} aberto=${open})`)
  } else probs.push('promoCardsFor ausente')
  return probs
}

function componentProblems(src) {
  const probs = []
  const video = (src.match(/<video[\s\S]*?\/>/) || [''])[0]
  if (!video) probs.push('sem <video>')
  for (const attr of ['muted', 'playsInline']) {
    if (!new RegExp(`^\\s+${attr}\\s*$`, 'm').test(video)) probs.push(`<video> sem ${attr}`)
  }
  // Carrossel: troca no FIM do vídeo (nunca timer fixo) e só repete sozinho quando o card tem 1 vídeo.
  if (!/onEnded=\{\(\) => setActive\(\(i \+ 1\) % count\)\}/.test(video)) probs.push('<video> não passa para o próximo no onEnded')
  if (!/loop=\{count === 1\}/.test(video)) probs.push('<video> sem loop para card de 1 vídeo (ou com loop que trava o carrossel)')
  if (/setInterval|setTimeout\(\s*\(\)\s*=>\s*setActive/.test(src)) probs.push('carrossel com timer fixo')
  if (!/poster=\{clip\.poster\}/.test(video)) probs.push('<video> sem pôster')
  if (/\bautoPlay\b/.test(video)) probs.push('<video> com autoPlay (toca fora da tela e ignora reduced-motion)')
  if (!/preload="(none|metadata)"/.test(video)) probs.push('<video> sem preload leve')
  if (/<audio|controls/.test(video)) probs.push('<video> com controles/áudio')
  // Toca só quando visível.
  if (!/new IntersectionObserver\(/.test(src) || !/video\.play\(\)/.test(src) || !/video\.pause\(\)/.test(src)) probs.push('vídeo não é ligado/desligado por IntersectionObserver')
  if (!/querySelector<HTMLVideoElement>\('video\[data-on\]'\)/.test(src)) probs.push('IntersectionObserver não mira só o vídeo ativo do carrossel')
  if (!/dataset\.visible === '1' && !reduce/.test(src)) probs.push('próximo vídeo toca fora da tela ou com reduced-motion')
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
  // REANCORADO 30/09 — fundador: "tira essa parte" (a grade "Video" com os tiles de motor saiu da home; os motores seguem no mega-menu e no /studio).
  for (const keep of ['<HomeFeaturedFilms />', 'engineWall']) if (!src.includes(keep)) probs.push(`curadoria mexida: sumiu ${keep}`)
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
  // Todas as prévias e pôsteres que os cards citam (12 vídeos + 12 pôsteres em 30/09), lidos do próprio arquivo de dados.
  const clips = roda(dataSrc).PROMO_CARDS.flatMap((c) => c.art.clips || [])
  const mp4s = clips.map((v) => 'public' + v.src)
  for (const rel of [...mp4s, ...clips.map((v) => 'public' + v.poster)]) {
    const p = path.join(ROOT, rel)
    if (!fs.existsSync(p)) { probs.push(`${rel} não existe`); continue }
    const size = fs.statSync(p).size
    if (size > MAX) probs.push(`${rel} tem ${(size / 1048576).toFixed(2)} MB (> 1,5 MB)`)
    if (size < 1024) probs.push(`${rel} vazio (${size} B)`)
  }
  if (mp4s.length !== 12) probs.push(`${mp4s.length} vídeos nos cards (esperado 4 × 3 = 12)`)
  for (const rel of mp4s) {
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
ok(dp.length === 0, `(1) dados: /claude-connector + /ads + /clips + /images na ordem, 3 vídeos por card, títulos, cards limpos, interruptor, selo honesto (${dp.join('; ') || 'ok'})`)
const cp = componentProblems(compSrc)
ok(cp.length === 0, `(2) componente: carrossel mudo+playsInline+pôster, troca no fim do vídeo, IO, reduced-motion, aspect-ratio, snap sem barra (${cp.join('; ') || 'ok'})`)
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
ok(dataProblems(dataSrc.replace("bands: ['KINEO IN CLAUDE'],", "bands: ['KINEO IN CLAUDE BY ANTHROPIC'],")).length > 0, '(M4) "by Anthropic" no letreiro → vermelho')
ok(dataProblems(dataSrc.replace("bandTone: 'cobalt',", "bandTone: 'cobalt',\n      tag: 'Connector · MCP',")).length > 0, '(M4b) etiqueta de volta por cima do vídeo → vermelho')
ok(dataProblems(dataSrc.replace("clip('promo-clips-surf')],", "clip('promo-clips-surf')],\n      chips: ['5', '7', '10', '15'],")).length > 0, '(M29) chips de duração de volta no Clips → vermelho')
ok(dataProblems(dataSrc.replace("clip('promo-clips-surf')],", "clip('promo-clips-surf')],\n      badge: 'NEW',")).length > 0, '(M30) selo NEW de volta no Clips → vermelho')
ok(dataProblems(dataSrc.replace("'Pro images from a sentence", "'4K images from a sentence")).length > 0, '(M26) card de Images prometendo 4K → vermelho')
ok(dataProblems(dataSrc.replace("clip('promo-ads-c')]", "clip('promo-ads-a')]")).length > 0, '(M27) Ads sem a variação C → vermelho')
ok(dataProblems(dataSrc.replace(", clip('promo-clips-surf')]", ']')).length > 0, '(M28) card com 2 vídeos em vez de 3 → vermelho')
ok(dataProblems(dataSrc.replace("CLAUDE_CARD_HREF = '/claude-connector'", "CLAUDE_CARD_HREF = '/mcp'")).length > 0, '(M5) link do Claude errado → vermelho')
ok(dataProblems(dataSrc.replace("CLAUDE_CARD_HREF = '/claude-connector'", "CLAUDE_CARD_HREF = 'https://claude.ai/directory/kineo'")).length > 0, '(M18) URL do diretório antes da aprovação → vermelho')
ok(dataProblems(dataSrc.replace('href: CLAUDE_CARD_HREF,', "href: '/claude-connector',")).length > 0, '(M19) destino digitado fora da constante única → vermelho')
ok(dataProblems(dataSrc.replace("href: '/clips'", "href: '/studio'")).length > 0, '(M6) link do Clips errado → vermelho')
ok(componentProblems(compSrc.replace('loop={count === 1}', 'loop')).length > 0, '(M7) <video> em loop eterno (carrossel nunca troca) → vermelho')
ok(componentProblems(compSrc.replace('onEnded={() => setActive((i + 1) % count)}', '')).length > 0, '(M7b) carrossel sem troca no fim do vídeo → vermelho')
ok(componentProblems(compSrc.replace("querySelector<HTMLVideoElement>('video[data-on]')", "querySelector<HTMLVideoElement>('video')")).length > 0, '(M7c) IO tocando o 1º vídeo em vez do ativo → vermelho')
ok(componentProblems(compSrc.replace(/^\s+playsInline\n/m, '\n')).length > 0, '(M8) <video> sem playsInline → vermelho')
ok(componentProblems(compSrc.replace('poster={clip.poster}', '')).length > 0, '(M9) <video> sem pôster → vermelho')
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
