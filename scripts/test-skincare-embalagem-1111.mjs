import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
function loader(over = {}) {
  const cache = new Map()
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports
    const module = { exports: {} }; cache.set(path, module)
    const req = (name) => {
      if (name.startsWith('node:')) return nativeRequire(name)
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
      const target = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
      if (!target) return {}
      return load(target)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}
// KINEO-SKINCARE-EMBALAGEM-1111 — SPEC-ADS-PESSOA-FALANDO §6: no Studio Ads (Escolha), skincare só sabia "pote" — bater as unhas na tampa, desenroscar,
// pegar com o dedo. Sérum de conta-gotas, bisnaga e frasco de pump recebiam a ação de um pote (e o motor inventava uma tampa de rosca). Trava (Node puro):
// (a) a embalagem sai do texto do produto (sérum/conta-gotas, bisnaga/tubo, pump; sem pista = pote); (b) os 3 planos do sérum, da bisnaga e do pump
// têm a sua ação e nenhum "nail taps"; o pote fica byte a byte; (c) o plano da Escolha usa a embalagem na história, na sequência e nos 3 planos.
const SH = 'lib/ads/cena/escolhaShots.ts', PL = 'lib/ads/cena/escolhaPlan.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let S
  try { S = loader(over)(SH) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  for (const [t, quer] of [['Glow Drops vitamin C serum', 'serum'], ['Veil tinted SPF moisturizer, cream tube', 'tube'], ['Body lotion in a pump bottle', 'pump'], ['Dewly daily face cream', 'jar'], ['Hidratante em bisnaga', 'tube']])
    no(S.embalagemSkincare(t) !== quer, `(a) "${t}" → ${S.embalagemSkincare(t)} (queria ${quer})`)
  const pote = S.escolhaShotPrompts('skincare', 'product', undefined, 'en')
  no(JSON.stringify(S.escolhaShotPrompts('skincare', 'product', undefined, 'en', 'jar')) !== JSON.stringify(pote) || !/nail taps/.test(pote[0]), '(b) o pote mudou')
  for (const [emb, marca] of [['serum', /dropper/], ['tube', /tube/], ['pump', /pump/]]) {
    const pl = S.escolhaShotPrompts('skincare', 'product', undefined, 'en', emb)
    no(pl.some((x) => /nail taps|scoops|jar/i.test(x)) || !pl.some((x) => marca.test(x)) || pl.some((x) => x.length > 500), `(b) ${emb}: ${pl[1].slice(150, 330)}`)
  }
  const pl = over[PL] ?? read(PL)
  no(!pl.includes("story = escolhaStory(plan.category, formatId, embalagem)") || pl.split('plan.input.language, embalagem)').length !== 3 || !pl.includes("skin && embalagem !== 'jar' ? `follow the timed sequence: ${story.shots.map("), '(c) o plano da Escolha não usa a embalagem')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (sérum, bisnaga e pump com a sua ação; o pote igual; a Escolha usa a embalagem)')
const sh = read(SH)
const MUT = [
  ['M1 tudo vira pote', { [SH]: sh.replace("if (/\\b(?:serums?|s[ée]runs?|droppers?|conta-?gotas|drops?)\\b/u.test(t)) return 'serum'", '') }],
  ['M2 a história ignora a embalagem', { [SH]: sh.replace("category === 'skincare' && embalagem !== 'jar' ? SKIN_POR_EMBALAGEM[embalagem] : CATEGORY_STORIES[category]", 'CATEGORY_STORIES[category]') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
