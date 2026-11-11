// KINEO-RECREATE-CARTAO-BRANCO-1011 [fundador 10/11: "Por que tá branco? tá errado"]
// Guardião: todo formato do catálogo do Recreate (troca de rosto E efeitos) tem pôster válido — arquivo que existe, servido pela rota
// certa, leve (o cartão não fica branco esperando), em formato de foto (JPEG/WebP, nunca PNG cru), vertical, e que NÃO é um quadro
// branco/preto (luma média medida com ffmpeg, que está no PATH). Offline: só disco e ffmpeg. Mutantes no fim.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
let passed = 0
const ok = (c, m) => { assert(c, m); passed++ }
const MAX_BYTES = 200_000

const fileOf = (formats, poster) => {
  if (poster.startsWith('/api/recreate/assets/')) {
    const name = poster.slice('/api/recreate/assets/'.length), a = formats.RECREATE_ASSETS[name]
    return a ? { path: join(ROOT, 'lib/recreate/assets', a.file), type: a.contentType, name } : null
  }
  return poster.startsWith('/') ? { path: join(ROOT, 'public', poster), type: poster.endsWith('.webp') ? 'image/webp' : 'image/jpeg', name: poster } : null
}
const probe = p => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p], { encoding: 'utf8' }).trim().split(',').map(Number)
const luma = p => execFileSync('ffmpeg', ['-v', 'error', '-i', p, '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'])[0]

function all(o = {}) {
  const formats = loader({}, o)('lib/recreate/formats')
  ok(formats.RECREATE_FORMATS.length >= 6, `catálogo com ${formats.RECREATE_FORMATS.length} formatos`)
  for (const f of formats.RECREATE_FORMATS) {
    ok(typeof f.poster === 'string' && f.poster.length > 0, `${f.id}: tem pôster`)
    const file = fileOf(formats, f.poster)
    ok(file && existsSync(file.path), `${f.id}: o pôster ${f.poster} existe em disco`)
    ok(/image\/(jpeg|webp)/.test(file.type) && !/\.png$/i.test(file.path), `${f.id}: pôster em JPEG/WebP (era um PNG de 1,96 MB no outfit-morph)`)
    ok(statSync(file.path).size <= MAX_BYTES, `${f.id}: pôster leve (${statSync(file.path).size} B ≤ ${MAX_BYTES})`)
    const [w, h] = probe(file.path)
    ok(w >= 300 && h > w, `${f.id}: pôster vertical (${w}×${h})`)
    const y = luma(file.path)
    ok(y >= 20 && y <= 220, `${f.id}: pôster não é quadro branco/preto (luma ${y})`)
    // A rota de assets entrega o pôster de troca de rosto à conta que vê o formato (owner por preview/poster).
    if (f.poster.startsWith('/api/recreate/assets/')) ok(Object.hasOwn(formats.RECREATE_ASSETS, file.name), `${f.id}: a rota conhece o pôster`)
  }
  ok(!/outfit-morph\.png/.test(o['lib/recreate/formats.ts'] ?? read('lib/recreate/formats.ts')), 'o PNG pesado saiu do catálogo')
}
all()
const real = passed
const src = read('lib/recreate/formats.ts')
const mutants = [
  ['pôster PNG pesado de volta', { 'lib/recreate/formats.ts': src.replace("'outfit-morph.jpg': { file: 'outfit-morph.jpg', contentType: 'image/jpeg' }", "'outfit-morph.png': { file: 'outfit-morph-v6.mp4', contentType: 'image/png' }").replace("poster: '/api/recreate/assets/outfit-morph.jpg'", "poster: '/api/recreate/assets/outfit-morph.png'") }],
  ['formato sem pôster', { 'lib/recreate/formats.ts': src.replace("poster: '/api/recreate/assets/elevador.jpg', ", "poster: '', ") }],
  ['pôster que não existe', { 'lib/recreate/formats.ts': src.replace("'elevador.jpg': { file: 'elevador.jpg'", "'elevador.jpg': { file: 'elevador-sumiu.jpg'") }],
  ['pôster = o vídeo inteiro', { 'lib/recreate/formats.ts': src.replace("'passarela.jpg': { file: 'recreate-passarela.jpg'", "'passarela.jpg': { file: 'recreate-passarela.mp4'") }],
]
let bitten = 0
for (const [name, o] of mutants) {
  if (Object.entries(o).some(([p, v]) => v === read(p))) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all(o) } catch { died = true }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-recreate-poster-1011: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
