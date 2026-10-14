// KINEO-ADS-MELHORIAS-1410 — guardião da CHAMADA REPETIDA no enchimento de fala do Studio Ads v2 (lib/ads/v2CopyFit.ts,
// adsV2FitNarration). Reteste de 14/10 (roteiro B, pt): a fala terminou "Veja com seus próprios olhos. Confira de perto." — o
// enchimento colou uma chamada atrás de outra. Prova, EXECUTANDO a lib real pelo carregador offline:
//   C1 nunca duas chamadas seguidas: fala que já termina em chamada não ganha enchimento; e no máximo UMA chamada é colada;
//   C2 o enchimento que repete palavras da última frase é pulado e vale o PRÓXIMO que não repete; fala sem chamada continua
//      ganhando o enchimento de sempre (o piso de fala do reteste de 15/10 segue valendo);
//   M  mutante: sem a trava da chamada seguida = vermelho.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const REL = 'lib/ads/v2CopyFit.ts'
const SRC = fs.readFileSync(path.join(ROOT, REL), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = (m, fn) => { let v = false; try { v = !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')') } ok(v, m) }
const carregar = (src) => createOfflineLoader({ source: (rel, text) => (rel === REL && src ? src : text) })(REL)
const PT = { min: 27, max: 30, language: 'pt' }
const EN = { min: 27, max: 30, language: 'en' }
const sentences = (t) => t.split(/(?<=[.!?…])\s+/u).filter(Boolean)

const c1 = (src) => {
  const F = carregar(src)
  const a = F.adsV2FitNarration('Perfume Âmbar, um aroma quente. Veja com seus próprios olhos.', PT) // o caso do reteste
  const b = F.adsV2FitNarration('Perfume Âmbar, aroma quente.', PT) // curtíssima: antes ganhava 2-3 chamadas em fila
  const ctas = sentences(b.text).filter((x) => F.adsV2CtaLike(x, 'pt'))
  const seguidas = sentences(b.text).some((x, i, all) => i > 0 && F.adsV2CtaLike(x, 'pt') && F.adsV2CtaLike(all[i - 1], 'pt'))
  return a.text === 'Perfume Âmbar, um aroma quente. Veja com seus próprios olhos.' && a.fixes.length === 0 && ctas.length === 1 && !seguidas &&
    !/Veja com seus próprios olhos\. Confira de perto\./.test(a.text + b.text)
}
check('C1 nunca duas chamadas seguidas: "… Veja com seus próprios olhos." não ganha "Confira de perto."; fala curtíssima ganha no máximo UMA chamada', () => c1())

const c2 = (src) => {
  const F = carregar(src)
  // a última frase fala de "take": o enchimento "Take a closer look." repete a palavra e é pulado; vale o próximo
  const r = F.adsV2FitNarration('Lume amber perfume, warm and floral, easy to take with you all day long.', EN)
  const sem = F.adsV2FitNarration('Lume amber perfume, warm and floral, made to last all day long on your skin.', EN)
  return F.adsV2PadOverlaps('Take a closer look.', 'Easy to take with you.', 'en') && !F.adsV2PadOverlaps('Faça a sua escolha.', 'Aroma quente e floral.', 'pt') &&
    !/Confira de perto\.$/.test(r.text) && r.fixes.includes('speech_pad') && sentences(r.text).length === 2 &&
    sem.text === 'Lume amber perfume, warm and floral, made to last all day long on your skin. Take a closer look.' && sem.fixes.join() === 'speech_pad'
}
check('C2 o enchimento que repete a última frase é pulado e vale o PRÓXIMO; fala sem chamada segue ganhando o enchimento de sempre', () => c2())

// ═══ mutante ═════════════════════════════════════════════════════════════════════════════════════════════════════════
{
  const de = '    if (adsV2CtaLike(last, opts.language)) break // KINEO-ADS-MELHORIAS-1410'
  const n = SRC.split(de).length - 1
  let red = false
  if (n === 1) { const mut = SRC.split(de).join('    if (false) break // KINEO-ADS-MELHORIAS-1410'); try { red = !c1(mut) } catch { red = true } }
  ok(n === 1 && red, 'mutante M1 sem a trava "nunca duas chamadas seguidas": aplicou e fica VERMELHO')
}

console.log(`\ntest-ads-chamada-repetida-1410: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
