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
// KINEO-ESCOLHA-FALA-1111 — pedido 3e293478 (11/11 20:27, Studio Ads, Escolha, skincare UGC, "talking", rota kling4): o fundador reprovou — "a pessoa
// sequer fala… está com um narrador". O Kling 4 não tem campo de áudio nem de fala na fal; a fala ia como texto sem aspas, cortada no meio da frase
// ("Dewly daily face | cream hydrates…"), e o 3º plano pedia "off-camera". Trava (Node puro, sem rede): (a) 'talking' no Kling 3/4 vai ao Kling 3; o
// narrado e a amostra ficam como estão; (b) o Kling 4 recusa 'talking' (trava de reserva); (c) a narração real em 3 falas de frases inteiras; (d) os 3
// planos com a fala entre aspas, na boca de quem está na câmera, ≤ 500; (e) a rota da Escolha passa o modo. Mutantes no fim.
const NARRACAO = 'Looking for an all-in-one face cream? Dewly daily face cream hydrates, brightens, and smooths your skin. This cream does it all in one step. Try Dewly today.'
const K4 = 'lib/ads/kling4Paid.ts', AD = 'lib/ads/cena/adapters.ts', SH = 'lib/ads/cena/escolhaShots.ts', IE = 'lib/ads/cena/internalEscolha.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let P, A, S
  try { const load = loader(over); P = load(K4); A = load(AD); S = load(SH) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  no(P.newPaidCenaRoute('kling3', false, true, 'talking') !== 'kling3' || P.newPaidCenaRoute('kling4', false, true, 'talking') !== 'kling3', '(a) talking não foi ao Kling 3')
  no(P.newPaidCenaRoute('kling3', false, true, 'narrated') !== 'kling4' || P.newPaidCenaRoute('kling3', false, true) !== 'kling4', '(a) o narrado deixou o Kling 4')
  no(P.newPaidCenaRoute('kling3', true, true, 'talking') !== 'kling4', '(a) a amostra mudou')
  let recusou = false; try { A.cenaAssertVoiceRoute('kling4', 'talking', 'en') } catch { recusou = true }
  no(!recusou, '(b) o Kling 4 aceitou talking')
  let k3 = true; try { A.cenaAssertVoiceRoute('kling3', 'talking', 'en') } catch { k3 = false }
  no(!k3, '(b) o Kling 3 recusou talking em inglês')
  const f = S.escolhaFalasPorFrase(NARRACAO)
  no(!f || f.length !== 3 || f.some((t) => !/[.!?]$/.test(t)) || f.join(' ') !== NARRACAO, `(c) falas por frase → ${JSON.stringify(f)}`)
  const planos = S.escolhaShotPrompts('skincare', 'product', f, 'en')
  for (const [i, t] of planos.entries()) {
    no(/off-camera/i.test(t) || !t.includes(`Person on camera says ONLY in en: "${f[i]}"`) || t.length > 500, `(d) plano ${i + 1} → ${t.slice(-160)}`)
  }
  no(S.escolhaFalasPorFrase('Only one sentence here. And two.') !== null, '(c) com menos de 3 frases devia ficar a divisão de sempre')
  const ie = over[IE] ?? read(IE)
  no(!ie.includes('newPaidCenaRoute(requestedRoute, sampleMode, undefined, input.voice_mode)'), '(e) a Escolha não passa o modo')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (talking no Kling 3; fala de frases inteiras, entre aspas, na câmera; Kling 4 recusa talking)')
const k4 = read(K4), ad = read(AD), sh = read(SH)
const MUT = [
  ['M1 talking volta ao Kling 4', { [K4]: k4.replace("if (voiceMode === 'talking' && (route === 'kling3' || route === 'kling4')) return 'kling3' as const", '') }],
  ['M2 o 3º plano volta a ser off-camera', { [SH]: sh.replace('`Person on camera says ONLY in ${language}: "${speech[i]}"`', "`${i === 2 ? 'Same person off-camera' : 'Person on camera'} says ONLY in ${language}: ${speech[i]}`") }],
  ['M3 o Kling 4 volta a aceitar talking', { [AD]: ad.replace('nativeAudio: true, nativeSpeechLanguages: [],', "nativeAudio: true, nativeSpeechLanguages: ['en', 'zh'],") }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
