// KINEO-ADS-SEM-LEGENDA-2026-09-26 — guardião (fundador: "tem que ter opção de sem legenda").
// Prova com o MONTADOR REAL (lib/compose buildCreatomateSource, via loader offline): as legendas moram em elementos
// de texto nas trilhas 5/7, e o filtro do compose tira SÓ elas — narração (áudio), clipes, marca d'água (trilha 9) e
// cartão ficam. E prova o caminho: tela → contrato do render → rota do anúncio → compose.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

// (1) o montador real: onde estão as legendas
const load = createOfflineLoader()
const C = load('@/lib/compose')
const words = 'Brasa grill tonight dinner for two book now on whatsapp'.split(' ').map((w, i) => ({ word: w, start: i * 0.6, end: i * 0.6 + 0.5 }))
const source = C.buildCreatomateSource({
  clipUrls: ['https://x.invalid/a.jpg', 'https://x.invalid/b.jpg', 'https://x.invalid/c.png'],
  voiceoverUrl: 'https://x.invalid/v.mp3',
  voiceoverScript: words.map((w) => w.word).join(' '),
  sceneCaptions: ['Brasa grill tonight', 'dinner for two', 'book now on whatsapp'],
  duration: 35,
  quality: 'fast',
  realAudioDuration: 6.5,
  whisperWords: words,
  musicUrl: null,
  watermark: true,
  endCard: false,
})
const els = source.elements
const isCaption = (e) => e && e.type === 'text' && [5, 7].includes(Number(e.track))
const caps = els.filter(isCaption)
checa('montador real: há legendas nas trilhas 5/7', caps.length > 0)
checa('montador real: legenda é texto falado (não marca d\'água)', caps.some((e) => /BRASA|GRILL|DINNER|WHATSAPP/i.test(String(e.text))))
const kept = els.filter((e) => !isCaption(e))
checa('sem legenda: a narração continua (áudio da trilha 4)', kept.some((e) => e.type === 'audio' && Number(e.track) === 4))
checa('sem legenda: os clipes continuam', kept.filter((e) => e.type === 'image' || e.type === 'video').length >= 3)
checa('sem legenda: a marca d\'água continua (trilha 9)', kept.some((e) => Number(e.track) === 9))
checa('sem legenda: nenhum texto falado sobra', !kept.some((e) => e.type === 'text' && /GRILL|DINNER/i.test(String(e.text))))

// (2) o filtro do compose é exatamente esse
const COMPOSE = rd('app/api/compose/route.ts')
const blk = COMPOSE.slice(COMPOSE.indexOf('if (body.captions === false) {'), COMPOSE.indexOf('// Step 5 — Submit to Creatomate'))
checa('compose: filtro só com captions === false', blk.startsWith('if (body.captions === false) {'))
checa('compose: tira só texto das trilhas 5 e 7', blk.includes("type === 'text' && [5, 7].includes(Number((e as { track?: unknown }).track))"))
checa('compose: filtro roda DEPOIS de montar e ANTES de enviar', COMPOSE.indexOf('source = buildCreatomateSource({') < COMPOSE.indexOf('if (body.captions === false) {') && COMPOSE.indexOf('if (body.captions === false) {') < COMPOSE.indexOf('// Step 5 — Submit to Creatomate'))

// (3) o caminho da escolha
const RC = load('@/lib/ads/renderContract')
const model = { beats: [{ media: 'client' }, { media: 'card' }], words: [100, 115] }
const id = '11111111-1111-1111-1111-111111111111'
const base = { order_id: id, voice: 'nova', beats: ['word '.repeat(60).trim(), 'word '.repeat(30).trim()], storyboard: [{ beatIndex: 0, footageIds: [id] }], card_footage_id: id }
const off = RC.sanitizeRenderRequest({ ...base, captions: false }, model, [id])
const on = RC.sanitizeRenderRequest(base, model, [id])
checa('contrato: captions:false chega como false', off.ok && off.value.captions === false)
checa('contrato: sem o campo = com legenda (padrão de sempre)', on.ok && on.value.captions === true)
checa('rota do anúncio: repassa ao compose só quando desligada', rd('app/api/ads/render/route.ts').includes('...(input.captions === false ? { captions: false } : {}),'))
const W = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
checa('telas: "No captions" no modo IA e no passo a passo', (W.match(/>No captions<\/button>/g) || []).length === 2)
// 26/09: o corpo ganhou formato/estilo/trilha logo depois de `captions,` (KINEO-ADS-ESTILO) — a escolha continua nas duas telas.
checa('telas: o corpo do render leva a escolha nas duas telas', (W.match(/card_footage_id: (cardId|card\.id),\n\s+captions,\n/g) || []).length === 2)

console.log(`test-ads-sem-legenda-2026-09-26: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
