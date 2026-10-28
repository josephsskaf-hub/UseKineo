// KINEO-CARDS-ROSTO-2810 — guardião dos cards 1, 2 e 4 da home (fundador 27/10). Prova: (A) card 1 (filme): o lobisomem entra e a porta
// em Marte sai; (B) card 2 (produto): o perfume gigante SAI e o relógio que se monta entra — relógio + café + fone + tênis; (C) card 4
// (desenho 3D): bebê com cachorrinho + abóbora + gatinho cavaleiro + lobinho (4 no total); (D) card 3 (UGC), a curadoria da vitrine
// (lib/engineWall.ts) e o resto do arquivo intactos — desfeita esta camada, lib/ui/homeThreeCards.ts volta BYTE A BYTE à base, e toda
// linha nova leva a marca; (E) prévias leves no disco (≤ 1,5 MB, pôster .webp); (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-cards-rosto-2810.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { semCardsRosto2810, BASE, MARCA } from './test-support/desfaz-cards-rosto-2810.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const ARQ = 'lib/ui/homeThreeCards.ts'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const base = (rel) => lf(execFileSync('git', ['-C', ROOT, 'show', `${BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 1 << 26 }))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

/** Os nomes de prévia de um card, na ordem, lidos da fonte. */
function lista(src, card) {
  const i = src.indexOf(`  ${card}: { default: [`)
  if (i < 0) return null
  const fim = src.indexOf('] }', i)
  return [...src.slice(i, fim).matchAll(/preview\('([^']+)'/g)].map((m) => m[1])
}

function checa(src) {
  const e = []
  const films = lista(src, 'films') ?? []
  const prod = lista(src, 'product_ads') ?? []
  const kids = lista(src, 'kids_cartoon') ?? []
  if (!films.includes('galeria/werewolf')) e.push('card 1 sem o lobisomem')
  if (films.some((n) => /mars_door/.test(n))) e.push('card 1 ainda com a porta em Marte')
  if (JSON.stringify(prod) !== JSON.stringify(['home-card-novo-smartwatch', 'home-card-novo-iced_coffee', 'home-card-novo-headphones', 'home-card-novo-floating_sneaker2'])) e.push(`card 2 ≠ relógio + café + fone + tênis: ${prod.join(', ')}`)
  if (/giant_perfume/.test(src)) e.push('perfume gigante ainda no arquivo')
  if (JSON.stringify(kids) !== JSON.stringify(['home-card-novo-baby_puppy', 'home-card-novo-pumpkin', 'home-card-novo-knight_kitten', 'home-card-novo-werewolf_pup'])) e.push(`card 4 ≠ bebê + abóbora + gatinho + lobinho: ${kids.join(', ')}`)
  for (const n of [...films.filter((x) => x !== 'home-card-film-flannan'), ...prod, ...kids]) {
    const v = path.join(ROOT, 'public/previews', n + '.mp4')
    const p = path.join(ROOT, 'public/posters', n + '.webp')
    if (!fs.existsSync(v) || !fs.existsSync(p)) { e.push(`${n}: prévia/pôster ausente`); continue }
    if (fs.statSync(v).size > 1.5 * 1024 * 1024) e.push(`${n}: prévia acima de 1,5 MB`)
  }
  // card 3 e o resto: desfeita a camada, o arquivo é a base byte a byte
  const b = base(ARQ)
  if (JSON.stringify(lista(src, 'ugc_ads')) !== JSON.stringify(lista(b, 'ugc_ads'))) e.push('card 3 (UGC) mexido')
  let volta
  try { volta = semCardsRosto2810(src, ARQ) } catch (err) { return [...e, 'desfaz: ' + err.message] }
  if (lf(volta) !== b) e.push('desfeito ≠ base')
  const bs = new Set(b.split('\n'))
  const soltas = src.split('\n').filter((l) => !bs.has(l) && !l.includes(MARCA))
  if (soltas.length) e.push('linha nova sem a marca: ' + soltas[0].slice(0, 80))
  return e
}

console.log('KINEO-CARDS-ROSTO-2810 — cards 1, 2 e 4 da home')
const SRC = rd(ARQ)
const erros = checa(SRC)
for (const x of erros) console.log('   ·', x)
ok(erros.length === 0, `A-E cards trocados, card 3 e o resto intactos (${erros.length} erro[s])`)
ok(rd('lib/engineWall.ts') === base('lib/engineWall.ts'), 'D curadoria da vitrine (lib/engineWall.ts) intocada')
ok(fs.existsSync(path.join(ROOT, 'public/previews/galeria/werewolf.mp4')), 'A prévia do lobisomem é a da galeria (nada duplicado)')

const mut = (nome, de, para) => { const s = SRC.replace(de, para); ok(s !== SRC && checa(s).length > 0, `M ${nome}: vermelho`) }
mut('perfume volta', "preview('home-card-novo-smartwatch', '50% 45%'),", "preview('home-card-novo-giant_perfume', '50% 40%'),")
mut('porta em Marte volta', "preview('galeria/werewolf', '50% 40%'),", "preview('home-card-novo-film_mars_door', '50% 45%'),")
mut('raposa no lugar do lobinho', "preview('home-card-novo-werewolf_pup',", "preview('home-card-novo-fox',")
mut('card 3 mexido', "preview('home-card-novo-ugc_podcast',", "preview('home-card-novo-ugc_serum',")
mut('linha nova sem marca', '  ] }, // KINEO-CARDS-NOVOS-2610\n  ugc_ads', '  ] }, // KINEO-CARDS-NOVOS-2610\n  // solta\n  ugc_ads')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
