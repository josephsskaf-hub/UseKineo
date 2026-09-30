// KINEO-ADS-3VAR-COR-2026-09-30 — guardião do véu de cor das "3 variações" do anúncio v2.
// Caso real: 1º teste pago (30/09, Photo Motion, 85 cr, Villa Versace) entregou 3 vídeos quase iguais — a `grade` no prompt
// não aparece porque "Keep everything exactly as in the photo" vence. Conserto: a cor do look entra NA MONTAGEM, como um
// véu rgba por cima dos planos (nunca do cartão). Fundador: "vai".
// Prova: (1) anúncio comum = source idêntico ao de antes (sem véu); (2) variação = 1 shape na trilha do véu, do 0 ao fim dos
// planos, com a cor do look; (3) as 3 cores são diferentes e válidas; (4) a rota de montagem passa variationTintOf(brief);
// (5) a tela não promete mais "cenário" que a foto do cliente não troca; (6) mutantes. Estilo readFileSync + transpile.
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
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const montSrc = read('lib/ads/adV2Montage.ts')
const varSrc = read('lib/ads/v2Variations.ts')
const advSrc = read('lib/ads/v2Advance.ts')

const base = {
  width: 1080, height: 1920, fontFamily: 'Inter', cardUrl: 'https://x.test/card.png', cardSeconds: 2.5, musicUrl: null,
  shots: [1, 2, 3].map((n) => ({ url: 'https://x.test/' + n + '.mp4', kind: 'video', cutStart: 0, cutSeconds: n === 3 ? 4.5 : 4, measuredSeconds: 5 })),
  overlays: [{ text: 'Frase', start: 0.5, end: 3 }],
}
const brief = (slot) => ({ variation: { slot, group_id: '11111111-1111-4111-8111-111111111111', anchor_order_id: '22222222-2222-4222-8222-222222222222' } })

function problems(M, V) {
  const probs = []
  let semVeu, comNull
  try { semVeu = M.buildAdV2Source(base); comNull = M.buildAdV2Source({ ...base, tint: null }) } catch (e) { return ['montagem comum quebrou: ' + e.message] }
  if (JSON.stringify(semVeu) !== JSON.stringify(comNull)) probs.push('tint null muda o source do anúncio comum')
  if (semVeu.elements.some((el) => el.track === M.ADS_V2_TINT_TRACK)) probs.push('anúncio comum ganhou elemento na trilha do véu')
  const tints = ['A', 'B', 'C'].map((s) => V.variationTintOf(brief(s)))
  if (V.variationTintOf({}) !== null || V.variationTintOf(null) !== null) probs.push('pedido sem variação ganhou véu')
  if (new Set(tints).size !== 3) probs.push(`as 3 cores não são distintas (${tints.join(' | ')})`)
  for (const t of tints) if (typeof t !== 'string' || !M.ADS_V2_TINT_RE.test(t)) probs.push(`cor inválida para a montagem: ${t}`)
  const alpha = (t) => parseFloat(String(t).split(',')[3])
  for (const t of tints) if (!(alpha(t) >= 0.1 && alpha(t) <= 0.25)) probs.push(`véu fraco ou forte demais: ${t}`)
  for (const [i, t] of tints.entries()) {
    let src
    try { src = M.buildAdV2Source({ ...base, tint: t }) } catch (e) { probs.push(`variação ${i} quebrou a montagem: ${e.message}`); continue }
    const veus = src.elements.filter((el) => el.track === M.ADS_V2_TINT_TRACK)
    if (veus.length !== 1) { probs.push(`variação ${i}: ${veus.length} véus`); continue }
    const v = veus[0]
    if (v.type !== 'shape' || v.fill_color !== t || !v.path) probs.push(`variação ${i}: véu não é shape+path com a cor do look`)
    if (v.time !== 0 || v.duration !== 12.5) probs.push(`variação ${i}: véu fora da janela dos planos (${v.time}→${v.duration})`)
    const card = src.elements.find((el) => el.type === 'image' && el.source === base.cardUrl)
    if (!card || v.time + v.duration > card.time + 1e-9) probs.push(`variação ${i}: véu cobre o cartão final`)
    const visuais = src.elements.filter((el) => el.type !== 'audio').map((el) => el.track)
    if (Math.max(...visuais) !== M.ADS_V2_TINT_TRACK) probs.push(`variação ${i}: véu não está por cima dos planos`)
  }
  let recusou = false
  try { M.buildAdV2Source({ ...base, tint: 'rgba(255,0,0,0.9)' }) } catch { recusou = true }
  if (!recusou) probs.push('véu que lava a foto (alfa 0,9) foi aceito')
  return probs
}

const M = load(montSrc)
const V = load(varSrc)
const p = problems(M, V)
ok(p.length === 0, `(1-3) comum intacto; variação com 1 véu na cor do look, só sobre os planos; 3 cores distintas (${p.join('; ') || 'ok'})`)
ok(/tint: variationTintOf\(order\.brief\),/.test(advSrc) && /import \{[^}]*\bvariationTintOf\b[^}]*\} from '@\/lib\/ads\/v2Variations'/.test(advSrc), '(4) a montagem do pedido passa variationTintOf(order.brief)')
ok(!/looks \(scene, colors|looks diferentes \(cenário, cores|looks distintos \(escenario, colores/.test(varSrc), '(5) a tela não promete cenário novo em toda variação')
ok(!/^\s*import\s/m.test(montSrc) && !/^\s*import\s/m.test(varSrc), '(0) libs continuam puras (nenhum import)')

// (6) mutantes
ok(problems(load(montSrc.replace("type: 'shape', track: ADS_V2_TINT_TRACK, time: 0, duration: shotsSeconds,", "type: 'shape', track: ADS_V2_TINT_TRACK, time: 0, duration: total,")), V).length > 0, '(M1) véu vaza para o cartão → vermelho')
ok(problems(load(montSrc.replace('  if (tint !== null) {', '  if (false) {')), V).length > 0, '(M2) montagem ignora o véu → vermelho')
ok(problems(M, load(varSrc.replace("tint: 'rgba(255,40,140,0.16)'", "tint: 'rgba(30,110,255,0.14)'"))).length > 0, '(M3) duas variações com a mesma cor → vermelho')
ok(problems(M, load(varSrc.replace("  return tag ? ADS_V2_LOOKS[tag.slot].tint : null", "  return ADS_V2_LOOKS.A.tint"))).length > 0, '(M4) anúncio comum ganha véu → vermelho')
ok(problems(load(montSrc.replace('export const ADS_V2_TINT_TRACK = 7', 'export const ADS_V2_TINT_TRACK = 2')), V).length > 0, '(M5) véu debaixo dos planos → vermelho')
ok(!/tint: variationTintOf\(order\.brief\),/.test(advSrc.replace('      tint: variationTintOf(order.brief),\n', '')), '(M6) rota sem o véu → a âncora (4) some')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
