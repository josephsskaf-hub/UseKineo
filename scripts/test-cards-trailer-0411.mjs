// KINEO-CARDS-TRAILER-0411 — Filmes e Cartoon mostram só o trailer aprovado, um clipe, sem pausa no laço; Produto e UGC intocados.
// Os mesmos limites das prévias de card (≤ 1,5 MB decimais, faststart, sem áudio); o tocador real é executado com vídeos dublês.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = process.cwd()
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n')
function modulo(f) {
  const out = ts.transpileModule(rd(f), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(out, { module, exports: module.exports, require: (id) => { throw Error('import inesperado: ' + id) } })
  return module.exports
}
let n = 0
const ok = (c, m) => { assert.ok(c, m); n++ }

// 1. Só os dois cards aprovados, um clipe cada, enquadrado pelo topo (o texto do card cobre a parte de baixo).
const { HOME_CARD_TRAILERS_0411: T } = modulo('lib/ui/homeCardsTrailer0411.ts')
ok(JSON.stringify(Object.keys(T).sort()) === '["films","kids_cartoon","product_ads","ugc_ads"]', 'os 4 cards têm trailer (KINEO-CARDS-TRAILER-4-0411)')
for (const [card, name] of [['films', 'home-card-trailer-film'], ['kids_cartoon', 'home-card-trailer-cartoon'], ['product_ads', 'home-card-trailer-product'], ['ugc_ads', 'home-card-trailer-ugc']]) {
  ok(T[card].length === 1, card + ': um clipe só')
  const c = T[card][0]
  ok(c.src === `/previews/${name}.mp4` && c.poster === `/posters/${name}.webp`, card + ': arquivos com o nome combinado')
  ok(c.objectPosition === '50% 0%' && c.mobileObjectPosition === '50% 0%', card + ': ancorado no topo nos dois tamanhos')
  ok(fs.statSync(path.join(ROOT, 'public', c.poster)).size > 1024, card + ': pôster existe')
  // 2. Mesmas regras das prévias de card.
  const b = fs.readFileSync(path.join(ROOT, 'public', c.src))
  ok(b.length <= 1_500_000, card + ': no máximo 1,5 MB decimais')
  const tipos = []
  for (let o = 0; o + 8 <= b.length;) { let s = b.readUInt32BE(o); const t = b.toString('latin1', o + 4, o + 8); if (s === 1) s = Number(b.readBigUInt64BE(o + 8)); if (s === 0) s = b.length - o; assert.ok(s >= 8, 'átomo válido'); tipos.push(t); o += s }
  ok(tipos.indexOf('moov') >= 0 && tipos.indexOf('moov') < tipos.indexOf('mdat'), card + ': faststart')
  ok(!b.includes(Buffer.from('soun')), card + ': sem trilha de áudio')
}

// 3. Os componentes usam o trailer só nesses cards; sem playlist, o caminho antigo.
const media = rd('components/home/HomeCardCycleMedia.tsx'), tres = rd('components/home/HomeThreeCards.tsx'), kids = rd('components/home/HomeKidsCard.tsx')
ok(media.includes('const clips = playlist ?? homeCardClips(card, language)'), 'sem playlist, as listas de sempre')
ok(tres.includes('playlist={HOME_CARD_TRAILERS_0411[card]}'), 'faixa de cards lê o trailer pelo id do card')
ok(kids.includes('playlist={HOME_CARD_TRAILERS_0411.kids_cartoon}'), 'card de Cartoon lê o trailer')

// 4. Produto e UGC seguem as listas de hoje.
const pure = modulo('lib/ui/homeThreeCards.ts')
ok(pure.HOME_CARD_PLAYLISTS.product_ads.default.length === 3, 'Produto continua com os 3 clipes')
ok(pure.HOME_CARD_PLAYLISTS.ugc_ads.default.length === 4, 'UGC continua com os 4 clipes')

// 5. O tocador real: um clipe liga o laço nativo e nunca baixa o segundo buffer; lista normal não liga.
function monta(clips) {
  const videos = [0, 1].map(() => {
    const ev = {}, attrs = {}
    return { ev, attrs, style: { setProperty() {} }, src: '', currentTime: 3, ended: false, loop: 'nunca', preload: '', poster: '', plays: 0, pause() {}, load() {}, play() { this.plays++; return Promise.resolve() }, addEventListener(k, f) { ev[k] = f }, removeEventListener(k) { delete ev[k] }, setAttribute(k, v) { attrs[k] = v }, removeAttribute(k) { delete attrs[k] }, hasAttribute(k) { return k in attrs } }
  })
  const out = ts.transpileModule(rd('lib/ui/homeCardPlayback.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  let vis
  const ctx = { module, exports: module.exports, Set, Array, String, window: {}, document: { hidden: false, addEventListener() {}, removeEventListener() {} }, IntersectionObserver: class { constructor(f) { vis = f } observe() {} disconnect() {} } }
  vm.runInNewContext(out, ctx)
  module.exports.attachHomeCardPlayback({ querySelectorAll: () => videos }, clips)
  vis([{ isIntersecting: true, intersectionRatio: 1 }])
  return videos
}
const uma = monta(T.films)
ok(uma[0].loop === true, 'um clipe: laço nativo ligado')
ok(uma[0].src === T.films[0].src && uma[1].src === '', 'um clipe: o segundo buffer não baixa nada')
uma[0].ev.playing?.()
ok(uma[1].src === '', 'um clipe: tocando, continua sem baixar o segundo buffer')
uma[0].ended = true; uma[0].ev.ended?.()
ok(uma[0].currentTime === 0, 'se o navegador ainda assim encerrar, volta ao início')
const varias = monta(pure.HOME_CARD_PLAYLISTS.ugc_ads.default)
ok(varias[0].loop === false, 'lista com vários clipes: sem laço, segue a troca de sempre')

console.log(`ok KINEO-CARDS-TRAILER-0411: ${n} verificações`)
