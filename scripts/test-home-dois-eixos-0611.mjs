// KINEO-HOME-DOIS-EIXOS-0611 — duas fileiras no desktop, o celular mantém a vitrine anterior.
// A dobra e o enquadramento são verificados no navegador; este guardião confere as regras e a mídia local.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import postcss from 'postcss'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url))
const css = postcss.parse(read('app/appearance.css').toString('utf8'))
const mosaic = read('components/home/HomeMosaic.tsx').toString('utf8')

// KINEO-HOME-TOPO-CLIPES-1311 [dono 13/11: "deixa eles na parte de cima sempre como regra, e maiores também"] — a fileira de seis cartões estreitos saiu;
// o topo são 6 clipes novos (CLIPES_NO_TOPO) em cartão grande (.kmz-big). A regra antiga do CSS não pode voltar.
assert.ok(!read('app/appearance.css').toString('utf8').includes('[data-home-cta="mosaic_motion"]{display:block'), 'a fileira estreita de 06/11 não volta')
const required = [
  [':root', '--k2f', 'max(300px,calc((100vh - 244px)/2))'],
  ['.klp:has(> #samples) .k3c-card', 'height', 'var(--k2f)'],
  ['.klp:has(> #samples) .k3c-grid', 'max-width', '100%'],
  ['.klp #samples .kmz-grid', 'grid-auto-rows', 'calc((var(--k2f) - 24px)/3)'],
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
// KINEO-CARDS-SEM-ETIQUETA-0911 [fundador 09/11: "Só a etiqueta"] — nem etiqueta de tipo na tela: o tipo vive só no aria-label
assert.ok(!mosaic.includes('<i>Multi-camera') && mosaic.includes("aria-label={t.title + ' — multi-camera'}") && !/Multi-camera · |' — Kling/.test(mosaic), 'sem etiqueta nem motor; tipo no aria-label')
const lib = read('lib/clipesNos2Lugares.ts').toString('utf8')
const topo = [...(lib.match(/export const CLIPES_NO_TOPO: readonly string\[\] = \[([^\]]+)\]/) ?? ['', ''])[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1])
assert.equal(topo.length, 6, 'o topo tem 6 clipes (duas linhas inteiras de 3)')
assert.equal(new Set(topo).size, 6, 'sem clipe repetido no topo')
const lista = lib.slice(lib.indexOf('export const CLIPES_NOVOS'), lib.indexOf('export const CLIPES_FORA_DA_VITRINE_1311'))
for (const id of topo) assert.ok(lista.includes("{ id: '" + id + "',"), id + ' do topo está na lista viva (CLIPES_NOVOS)')
assert.ok(mosaic.includes('CLIPES_NO_TOPO.flatMap((id): MotionTile[] =>') && mosaic.includes('<div className="kmz-topo-grid" data-home-topo-grid="1">{doTopo.map((t) => cartao(t, true))}</div>') && mosaic.includes('.klp .kmz-topo-grid>.kmz-t{grid-column:auto;grid-row:auto;aspect-ratio:5/6}'), 'o topo sai da lista, usa o cartão de clipe novo e fica em pé na janela 5:6 (KINEO-HOME-TOPO-5X6-1311)')
assert.ok(mosaic.includes('if (!topo && !full && NO_TOPO.has(c.id)) return null'), 'na home, quem abre o topo não se repete na grade')
assert.ok(!/video: '\/previews\/motion-\w+-0611\.mp4'/.test(mosaic), 'as seis paisagens de 06/11 saíram da home')

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

for (const id of topo) {
  checkMp4('galeria/' + id, 600_000)
  checkWebp('galeria/' + id)
}
for (const format of ['desktop', 'mobile']) {
  const base = 'home-card-wall-product-0611-' + format
  checkMp4(base, 1_500_000)
  checkWebp(base)
}
checkMp4('home-card-ugc-fone-0611', 1_500_000)
checkWebp('home-card-ugc-fone-0611')
console.log('TUDO OK: topo com 6 clipes novos em cartão grande, mídia leve com pôster, parede de produto e Fone em ação.')
