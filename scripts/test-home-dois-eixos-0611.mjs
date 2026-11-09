// KINEO-HOME-DOIS-EIXOS-0611 — duas fileiras no desktop, o celular mantém a vitrine anterior.
// A dobra e o enquadramento são verificados no navegador; este guardião confere as regras e a mídia local.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import postcss from 'postcss'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url))
const css = postcss.parse(read('app/appearance.css').toString('utf8'))
const mosaic = read('components/home/HomeMosaic.tsx').toString('utf8')

const row = '.klp #samples .kmz-grid>.kmz-t:nth-child(-n+6)[data-home-cta="mosaic_motion"]'
const required = [
  [':root', '--k2f', 'max(300px,calc((100vh - 244px)/2))'],
  ['.klp:has(> #samples) .k3c-card', 'height', 'var(--k2f)'],
  ['.klp:has(> #samples) .k3c-grid', 'max-width', '100%'],
  ['.klp #samples .kmz-grid', 'grid-auto-rows', 'calc((var(--k2f) - 24px)/3)'],
  [row, 'grid-column', 'span 1'],
  [row, 'grid-row', 'span 3'],
  [row, 'display', 'block'],
]
for (const [selector, property, value] of required) {
  const matches = []
  css.walkRules(selector, rule => rule.walkDecls(property, d => {
    if (d.value === value) matches.push(d)
  }))
  assert.equal(matches.length, 1, selector + ' ' + property)
  const decl = matches[0]
  assert.ok(decl.important && decl.parent.parent.name === 'media' && decl.parent.parent.params === '(min-width:1100px)', selector + ' é só desktop')
}
assert.ok(mosaic.includes('[...HOME_MOTION_TILES, ...ordem]'), 'motion abre a vitrine')
assert.ok(mosaic.includes('if (opts.full) return ordem'), 'Made with Kineo mantém a vitrine original')
// KINEO-CARDS-SEM-MOTOR-0911 [fundador 09/11: "tire os nomes dos motores"] — o selo diz só o tipo; nada de motor no texto nem no aria-label
assert.ok(mosaic.includes('<i>Multi-camera</i>') && !/Multi-camera · |' — Kling/.test(mosaic), 'selo sem motor')
const tiles = [...mosaic.matchAll(/kind: 'motion', title: .+?video: '\/previews\/motion-(\w+)-0611\.mp4', (.+) \},/g)]
assert.deepEqual(tiles.map(m => m[1]), ['surf', 'eagle', 'rua', 'manta', 'neve', 'horse'])
assert.deepEqual(tiles.filter(m => !m[2].includes('desktopOnly: true')).map(m => m[1]), ['surf', 'rua', 'neve'])

function checkMp4(file, limit) {
  const data = read('public/previews/' + file + '.mp4')
  assert.ok(data.length > 1024 && data.length <= limit, file + ' tamanho')
  const atoms = []
  for (let offset = 0; offset + 8 <= data.length;) {
    const size = data.readUInt32BE(offset)
    assert.ok(size >= 8 && offset + size <= data.length, file + ' átomo válido')
    atoms.push(data.toString('ascii', offset + 4, offset + 8))
    offset += size
  }
  assert.ok(atoms.includes('moov') && atoms.includes('mdat') && atoms.indexOf('moov') < atoms.indexOf('mdat'), file + ' faststart')
  assert.ok(!data.includes(Buffer.from('soun')), file + ' sem áudio')
}

function checkWebp(file) {
  const data = read('public/posters/' + file + '.webp')
  assert.ok(data.length > 1024 && data.toString('ascii', 8, 12) === 'WEBP', file + ' pôster')
}

for (const [, name, fields] of tiles) {
  const base = 'motion-' + name + '-0611'
  assert.ok(fields.includes("poster: '/posters/" + base + ".webp'"))
  checkMp4(base + (fields.includes('desktopVideo:') ? '-desktop' : ''), 2_000_000)
  checkWebp(base)
}
for (const format of ['desktop', 'mobile']) {
  const base = 'home-card-wall-product-0611-' + format
  checkMp4(base, 1_500_000)
  checkWebp(base)
}
checkMp4('home-card-ugc-fone-0611', 1_500_000)
checkWebp('home-card-ugc-fone-0611')
console.log('TUDO OK: duas fileiras no desktop, 6 clipes com pôster, parede de produto e Fone em ação.')
