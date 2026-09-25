// KINEO-ADS-ESTILO-2026-09-26 — guardião do formato, estilo de legenda e clima da trilha do Studio Ads.
// Prova com peças REAIS: o estilo troca só as legendas do montador (lib/compose); o clima vira a direção de trilha certa
// (lib/musicDirection); o contrato do render aceita os três e cai nos padrões de sempre; o caminho tela→rota→compose.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const load = createOfflineLoader()
const S = load('@/lib/ads/adStyle')
const C = load('@/lib/compose')
const MD = load('@/lib/musicDirection')

// estilo sobre o montador real
const words = 'Brasa grill tonight dinner for two'.split(' ').map((w, i) => ({ word: w, start: i * 0.6, end: i * 0.6 + 0.5 }))
const src = C.buildCreatomateSource({ clipUrls: ['https://x.invalid/a.jpg', 'https://x.invalid/b.jpg'], voiceoverUrl: 'https://x.invalid/v.mp3', voiceoverScript: words.map((w) => w.word).join(' '), sceneCaptions: ['Brasa grill tonight', 'dinner for two'], duration: 35, quality: 'fast', realAudioDuration: 4, whisperWords: words, musicUrl: null, watermark: true, endCard: false })
const caps = src.elements.filter(S.isCaptionElement)
checa('montador: há legendas para estilizar', caps.length > 0)
for (const style of ['clean', 'yellow', 'boxed']) {
  const ov = S.captionStyleOverrides(style)
  const out = src.elements.map((e) => (S.isCaptionElement(e) ? { ...e, ...ov } : e))
  checa(`estilo ${style}: toda legenda recebe as cores do estilo`, out.filter(S.isCaptionElement).every((e) => e.fill_color === ov.fill_color && e.background_color === ov.background_color))
  checa(`estilo ${style}: nada fora das legendas muda`, out.filter((e) => !S.isCaptionElement(e)).every((e, i) => e === src.elements.filter((x) => !S.isCaptionElement(x))[i]))
  checa(`estilo ${style}: texto, tempo e posição da legenda intactos`, out.filter(S.isCaptionElement).every((e, i) => e.text === caps[i].text && e.time === caps[i].time && e.y === caps[i].y))
}
checa('estilo bold = o de sempre (não troca nada)', S.captionStyleOverrides('bold') === null)

// clima da trilha na direção real
const dir = (id) => MD.resolveMusicDirection({ script: 'We bake fresh bread every morning.', musicMood: S.musicMoodFor(id) ?? undefined })
checa('trilha "No music" desliga a música', dir('none').enabled === false)
checa('trilha "Upbeat" vira hustle', dir('upbeat').mood === 'hustle' && dir('upbeat').enabled)
checa('trilha "Calm" vira nature', dir('calm').mood === 'nature')
checa('trilha "Epic" vira epic', dir('epic').mood === 'epic')
checa('trilha "Automatic" não força clima', S.musicMoodFor('auto') === null)

// contrato
const RC = load('@/lib/ads/renderContract')
const model = { beats: [{ media: 'client' }, { media: 'card' }], words: [100, 115] }
const id = '11111111-1111-1111-1111-111111111111'
const base = { order_id: id, voice: 'nova', beats: ['word '.repeat(60).trim(), 'word '.repeat(30).trim()], storyboard: [{ beatIndex: 0, footageIds: [id] }], card_footage_id: id }
const d = RC.sanitizeRenderRequest(base, model, [id])
checa('contrato: sem campos = 9:16, bold, automático', d.ok && d.value.aspect === '9:16' && d.value.captionStyle === 'bold' && d.value.music === 'auto')
const c = RC.sanitizeRenderRequest({ ...base, aspect: '16:9', captionStyle: 'boxed', music: 'calm' }, model, [id])
checa('contrato: escolhas válidas passam', c.ok && c.value.aspect === '16:9' && c.value.captionStyle === 'boxed' && c.value.music === 'calm')
const bad = RC.sanitizeRenderRequest({ ...base, aspect: '21:9', captionStyle: '<script>', music: 'loud' }, model, [id])
checa('contrato: lixo cai no padrão', bad.ok && bad.value.aspect === '9:16' && bad.value.captionStyle === 'bold' && bad.value.music === 'auto')
checa('formatos batem com lib/aspect', S.AD_FORMATS.every((f) => load('@/lib/aspect').ASPECTS.includes(f.id)))

// caminho
const AR = rd('app/api/ads/render/route.ts')
checa('rota: manda o formato ao compose', AR.includes("aspect: input.aspect ?? '9:16',"))
checa('rota: estilo e trilha só quando fogem do padrão', AR.includes("...(input.captionStyle && input.captionStyle !== 'bold' ? { caption_style: input.captionStyle } : {}),") && AR.includes("...(input.music && input.music !== 'auto' ? { music_mood: musicMoodFor(input.music) } : {}),"))
const CO = rd('app/api/compose/route.ts')
checa('compose: estilo aplicado depois de montar, antes de enviar', CO.indexOf('source = buildCreatomateSource({') < CO.indexOf('} else if (isAdCaptionStyle(body.caption_style)) {') && CO.indexOf('} else if (isAdCaptionStyle(body.caption_style)) {') < CO.indexOf('// Step 5 — Submit to Creatomate'))
checa('compose: o clima vai para a direção da trilha', CO.includes("...(typeof body.music_mood === 'string' ? { musicMood: body.music_mood.slice(0, 40) } : {}),"))
const W = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
checa('tela IA: cartão desenhado no formato escolhido', W.includes('const file = await toPngFile(fitCardToFormat(canvas, size.width, size.height))'))
checa('tela IA: formato, estilo e trilha no corpo', /captions,\n\s+aspect: format,\n\s+captionStyle,\n\s+music,/.test(W))
checa('passo a passo: estilo e trilha no corpo', /card_footage_id: card\.id,\n\s+captions,\n\s+captionStyle,\n\s+music,/.test(W))

console.log(`test-ads-estilo-2026-09-26: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
