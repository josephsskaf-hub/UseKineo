// KINEO-NUVEM-A5-2026-10-02 — Espaços "vários destinos": 1 ponto vazio → 2 a 4 negócios rotulados num só vídeo.
// Prova: (1) interruptor próprio nasce false (casa vê); (2) preço = soma das etapas que já cobram (5 + clipe por destino),
// sem tabela nova; (3) a montagem troca o "Depois" pelo nome do negócio e o vídeo comum fica byte a byte igual; (4) a rota
// só aceita rótulo com o interruptor/casa, 2 a 4 pares, todos rotulados; (5) a tela nova é separada e o link só aparece
// para quem pode; (6) 16 línguas com as chaves novas; (7) mutantes. readFileSync + transpile.
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
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}))
  return mod.exports
}

const LIB = read('lib/spaces/spaces.ts')
const ROUTE = read('app/api/spaces/montage/route.ts')
const PAGE = read('app/(dashboard)/spaces/page.tsx')
const SINGLE = read('app/(dashboard)/spaces/SpacesClient.tsx')
const MULTI = read('app/(dashboard)/spaces/SpacesMultiClient.tsx')
const S = load(LIB)
const Cp = load(read('lib/spaces/spacesCopy.ts'))

console.log('1 — interruptor')
ok(S.SPACES_MULTI_PUBLIC === false && /export const SPACES_MULTI_PUBLIC = false\n/.test(LIB), 'nasce desligado')
ok(S.SPACES_MULTI_MIN === 2 && S.SPACES_MULTI_MAX === 4, '2 a 4 destinos')

console.log('2 — preço = soma das etapas')
ok(S.spacesMultiCredits(3, 5, 5) === 30 && S.spacesMultiCredits(2, 5, 7) === 24, '(foto pronta + clipe) × destinos')
let bad = 0
for (const n of [1, 5, 2.5]) { try { S.spacesMultiCredits(n, 5, 5) } catch { bad++ } }
ok(bad === 3, 'fora de 2–4 destinos = erro')
ok(/spacesMultiCredits\(dests\.length, NANO_CREDITS, clipCredits\)/.test(MULTI) && /t\('multiTotal', \{ n: total \}\)/.test(MULTI), 'a tela mostra o total antes do clique, com o preço do clipe que a rota informa')
ok(/fetch\('\/api\/images\/generate'/.test(MULTI) && /fetch\('\/api\/clips', \{\s*method: 'POST'/.test(MULTI), 'cobra pelas etapas de sempre (images/generate + clips), sem rota de cobrança nova')

console.log('3 — montagem')
const UID = 'e92d81bf-0068-46c3-8de7-1f67e2006756'
const O = 'https://abc.supabase.co'
const before = `${O}/storage/v1/object/public/avatars/${UID}/antes.jpg`
const clip = (i) => `${O}/storage/v1/object/public/renders/clips/${UID}/c${i}.mp4`
const plain = S.buildSpacesMontageSource({ pairs: [{ beforeUrl: before, clipUrl: clip(1) }, { beforeUrl: before, clipUrl: clip(2) }], signature: '', contact: '', fontFamily: 'Montserrat' })
const texts = (src) => src.elements.filter((e) => e.type === 'text').map((e) => e.text)
ok(texts(plain).filter((x) => x === 'AFTER').length === 2, 'sem rótulo: o "Depois" de sempre')
const multi = S.buildSpacesMontageSource({ pairs: [{ beforeUrl: before, clipUrl: clip(1), label: 'Café' }, { beforeUrl: before, clipUrl: clip(2), label: 'Pharmacy' }, { beforeUrl: before, clipUrl: clip(3), label: 'Clinic' }], signature: '', contact: '', fontFamily: 'Montserrat' })
ok(['Café', 'Pharmacy', 'Clinic'].every((l) => texts(multi).includes(l)) && !texts(multi).includes('AFTER') && texts(multi).filter((x) => x === 'BEFORE').length === 3, 'com rótulo: cada negócio no lugar do "Depois"')
const long = S.buildSpacesMontageSource({ pairs: [{ beforeUrl: before, clipUrl: clip(1), label: 'x'.repeat(80) }], signature: '', contact: '', fontFamily: 'Montserrat' })
ok(texts(long).some((x) => x.length === S.SPACES_DESTINATION_LABEL_MAX), 'rótulo cortado no limite')

function routeProblems(route) {
  const p = []
  if (!/const multi = labels\.some\(Boolean\)/.test(route)) p.push('a rota não detecta o modo vários destinos')
  if (!/if \(!spacesVisibleFor\(SPACES_MULTI_PUBLIC, isAdsInternalEmail\(user\.email\)\)\) return fail\('not_found', 404\)/.test(route)) p.push('rótulo aceito sem interruptor/casa')
  if (!/labels\.some\(\(l\) => !l\) \|\| raw\.length < SPACES_MULTI_MIN \|\| raw\.length > SPACES_MULTI_MAX/.test(route)) p.push('sem a regra 2–4 pares todos rotulados')
  if (!/\.\.\.\(multi \? \{ label: labels\[i\] \} : \{\}\)/.test(route)) p.push('o rótulo não chega à montagem')
  return p
}
console.log('4 — rota')
const rp = routeProblems(ROUTE)
ok(rp.length === 0, '/api/spaces/montage' + (rp.length ? ': ' + rp.join('; ') : ''))

console.log('5 — telas')
ok(/const multiAllowed = spacesVisibleFor\(SPACES_MULTI_PUBLIC, isAdsInternalEmail\(user\.email\)\)/.test(PAGE) && /if \(multiAllowed && searchParams\?\.mode === 'multi'\) return <SpacesMultiClient \/>/.test(PAGE), 'a página só abre a tela nova para quem pode')
ok(/\{multiAllowed \? <p[^\n]*href="\/spaces\?mode=multi"/.test(SINGLE), 'o link só aparece para quem pode')
ok(/label: d\.label\.trim\(\)/.test(MULTI) && /fetch\('\/api\/spaces\/brief'/.test(MULTI), 'a tela manda o rótulo e pesquisa a curadoria por destino')

console.log('6 — 16 línguas')
const NEW = ['multiLink', 'multiTitle', 'multiSub', 'multiS1Hint', 'multiS2Title', 'multiS2Hint', 'destLabelPlaceholder', 'addDestination', 'multiTotal', 'backToSingle']
const langs = Object.keys(Cp.SPACES_COPY)
ok(langs.length === 15 && NEW.every((k) => typeof Cp.SPACES_COPY_EN[k] === 'string' && langs.every((l) => typeof Cp.SPACES_COPY[l][k] === 'string' && Cp.SPACES_COPY[l][k].length > 0)), 'chaves novas em inglês + 15 línguas')
ok(langs.every((l) => Cp.SPACES_COPY[l].multiTotal.includes('{n}') && Cp.SPACES_COPY[l].multiS2Hint.includes('{n}')), 'marcadores {n} preservados')

console.log('Mutantes')
const mut = (label, probs) => ok(probs.length > 0, 'mutante pego: ' + label)
mut('rótulo sem interruptor', routeProblems(ROUTE.replace("if (!spacesVisibleFor(SPACES_MULTI_PUBLIC, isAdsInternalEmail(user.email))) return fail('not_found', 404)", '')))
mut('5 destinos', routeProblems(ROUTE.replace('raw.length > SPACES_MULTI_MAX', 'raw.length > 99')))
mut('rótulo perdido', routeProblems(ROUTE.replace('...(multi ? { label: labels[i] } : {})', '')))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
