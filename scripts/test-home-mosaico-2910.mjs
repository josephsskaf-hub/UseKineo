// KINEO-HOME-MOSAICO-2910 — guardião da vitrine contínua da home (fundador 29/10: "uma coisa grande com tudo, sem separações").
// Prova, lendo a fonte: (1) interruptor e montagem no KineoLanding (as faixas antigas só aparecem com ele desligado; a fileira
// "Made with Kineo — every engine" sai); (2) contagens pedidas — 6 filmes, efeitos ≥ 8, 8 clipes, imagens até o fim (≥ 34);
// (3) as imagens novas existem em public/home-mosaic/ (WebP ≤ 150 KB) e a pasta da galeria antiga não ganhou arquivo;
// (4) cartão sem preço e com selo do motor; (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-home-mosaico-2910.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function problems(landing, mosaic) {
  const p = []
  if (!/export const HOME_MOSAIC_LIVE = true/.test(mosaic)) p.push('interruptor desligado')
  if (!landing.includes("import HomeMosaic, { HOME_MOSAIC_LIVE } from '@/components/home/HomeMosaic'")) p.push('import ausente')
  if (!landing.includes('<HomeMosaic signedIn={isSignedIn} />')) p.push('vitrine não montada')
  if (!landing.includes('{!HOME_MOSAIC_LIVE && showClips && <HomeClipsStrip')) p.push('faixa de clipes antiga não fica atrás do interruptor')
  if (!landing.includes('{!HOME_MOSAIC_LIVE && trending.length >= 6')) p.push('"Made with Kineo — every engine" não sai')
  if (!landing.includes('{!HOME_MOSAIC_LIVE && <section className="home-more-tools"')) p.push('galeria antiga não fica atrás do interruptor')
  if ((landing.match(/<CitationDirectAnswer\b/g) || []).length !== 1) p.push('resposta direta montada ≠ 1 vez')
  if (!/export const HOME_MOSAIC_FILMS = 6/.test(mosaic)) p.push('filmes ≠ 6')
  if (!/export const HOME_MOSAIC_EFFECTS = (\d+)/.test(mosaic) || Number(mosaic.match(/export const HOME_MOSAIC_EFFECTS = (\d+)/)[1]) < 8) p.push('efeitos < 8')
  if (/credits|\bcr\b/.test(mosaic.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) p.push('preço no cartão')
  // KINEO-CARDS-SEM-MOTOR-0911 [fundador 09/11: "tire os nomes dos motores"] — o cartão não imprime motor; o motor segue no dado e no link
  if (/CLIP_ENGINES\[[^\]]*\]\.label|\{t\.badge\}|\{st\.engine|Multi-camera · |— Kling/.test(mosaic)) p.push('nome de motor impresso no cartão')
  // KINEO-CARDS-SEM-ETIQUETA-0911 [fundador 09/11: "Só a etiqueta"] — nenhuma etiqueta de tipo na tela; o tipo fica no aria-label de cada cartão
  if (/<i>\s*(<UiLabel>)?\s*(Clip|Multi-camera|Narrated film|Effect|Ad style|Trending format|\{tipo\})/.test(mosaic)) p.push('etiqueta de tipo visível no cartão')
  for (const a of ['— clip`}', "' — multi-camera'}", '— narrated film`}', '— effect`}', '— ad style`}', '— ${tipo}`}']) if (!mosaic.includes(a)) p.push(`tipo fora do aria-label (${a})`)
  // Founder 10/11: prepare public Recreate. Only an approved catalog id can replace the legacy destination.
  if (!mosaic.includes('new URLSearchParams({ engine: c.engine, prompt: c.prompt })') || !mosaic.includes('viaSignup(publicRecreatePath(c.id) ?? clipeNovoDestino(c), signedIn)')) p.push('o link perdeu o motor real ou o fallback do interruptor')
  return p
}

const LANDING = rd('app/KineoLanding.tsx')
const MOSAIC = rd('components/home/HomeMosaic.tsx')
const errs = problems(LANDING, MOSAIC)
ok(errs.length === 0, `(1)(2)(4) montagem, contagens e cartões${errs.length ? ': ' + errs.join('; ') : ''}`)

const extra = [...MOSAIC.matchAll(/\{ file: '([^']+)', w: (\d+), h: (\d+), alt: '[^']+' \}/g)].map((m) => ({ file: m[1], w: +m[2], h: +m[3] }))
const old = (rd('components/home/HomeImageGallery.tsx').match(/\{ file: '/g) || []).length
ok(extra.length >= 10 && old + extra.length >= 34, `(2) imagens: ${old} da galeria + ${extra.length} novas`)
const bad = extra.filter((i) => { const f = path.join(ROOT, 'public/home-mosaic', i.file); return !fs.existsSync(f) || fs.statSync(f).size > 150 * 1024 })
ok(bad.length === 0, `(3) imagens novas em public/home-mosaic/ e ≤ 150 KB${bad.length ? ': ' + bad.map((b) => b.file).join(', ') : ''}`)
ok(fs.readdirSync(path.join(ROOT, 'public/home-images')).length === old, '(3) pasta da galeria antiga sem arquivo novo')

const mut = (nome, l, m) => ok(problems(l, m).length > 0, `M ${nome}: vermelho`)
mut('interruptor off', LANDING, MOSAIC.replace('HOME_MOSAIC_LIVE = true', 'HOME_MOSAIC_LIVE = false'))
mut('trending volta', LANDING.replace('{!HOME_MOSAIC_LIVE && trending.length >= 6', '{trending.length >= 6'), MOSAIC)
mut('4 filmes', LANDING, MOSAIC.replace('HOME_MOSAIC_FILMS = 6', 'HOME_MOSAIC_FILMS = 4'))
mut('4 efeitos', LANDING, MOSAIC.replace(/HOME_MOSAIC_EFFECTS = \d+/, 'HOME_MOSAIC_EFFECTS = 4'))
// KINEO-CARDS-SEM-ETIQUETA-0911 — sem etiqueta na fonte, os mutantes injetam o texto logo antes do título (onde ela ficava); troca que não acha o alvo não conta
const injeta = (alvo, texto) => { if (!MOSAIC.includes(alvo)) throw new Error('alvo do mutante sumiu: ' + alvo); return MOSAIC.replace(alvo, alvo.replace('<span className="kmz-copy">', `<span className="kmz-copy">${texto}`)) }
mut('motor volta no selo do clipe', LANDING, injeta('<span className="kmz-copy"><b><UiLabel>{c.title}</UiLabel></b><Views video={c.video} />', '<i>{CLIP_ENGINES[c.engine].label}</i>')) // KINEO-CARDS-SEM-MOTOR-0911
mut('motor volta no filme', LANDING, injeta('<span className="kmz-copy"><b><UiLabel>{t.title}</UiLabel></b>', '<i>{t.badge}</i>')) // KINEO-CARDS-SEM-MOTOR-0911
mut('etiqueta volta no clipe', LANDING, injeta('<span className="kmz-copy"><b><UiLabel>{c.title}</UiLabel></b><Views video={c.video} />', '<i><UiLabel>Clip</UiLabel></i>')) // KINEO-CARDS-SEM-ETIQUETA-0911
mut('etiqueta volta no estilo', LANDING, injeta('<span className="kmz-copy"><b><UiLabel>{st.title}</UiLabel></b>', '<i><UiLabel>Ad style</UiLabel></i>')) // KINEO-CARDS-SEM-ETIQUETA-0911
mut('tipo sai do aria-label do filme', LANDING, MOSAIC.replace('— narrated film`}', '`}')) // KINEO-CARDS-SEM-ETIQUETA-0911
mut('link do clipe perde o motor', LANDING, MOSAIC.replace('new URLSearchParams({ engine: c.engine, prompt: c.prompt })', 'new URLSearchParams({ prompt: c.prompt })')) // KINEO-CARDS-SEM-MOTOR-0911
mut('2 respostas diretas', LANDING + '\n<CitationDirectAnswer page="home" />', MOSAIC)

console.log(`${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
