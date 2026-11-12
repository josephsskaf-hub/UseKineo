// KINEO-PRICING-LETRA-12-1211 [CEO 12/11, entrada como visitante no celular: defeito claro]: nenhum texto do /pricing abaixo de 12 px
// (antes ~60 entre 10 e 11,5 px: "Save 30%", "Included", "Or use your credits for", as tabelas por motor e de custo, rótulos). A raiz do
// site é 14 px: text-xs do Tailwind = 10,5 px e 0,8 rem = 11,2 px. Offline: lê todo tamanho de letra dos arquivos que desenham a página.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const FILES = ['app/pricing/PricingClient.tsx', 'components/pricing/PlanValueStage.tsx', 'components/pricing/PricingAdsBlock.tsx',
  'components/pricing/PricingBusinessBlock.tsx', 'components/pricing/PricingCreditsBlock.tsx', 'components/pricing/TwoProductsPricing.tsx']
let passed = 0
const ok = (c, m) => { assert(c, m); passed++ }

/** Todo tamanho de letra: CSS px, React (número, 'Npx', 'Nrem'), Tailwind text-[Npx] e text-xs. Em px (rem × 14). */
function tamanhos(s) {
  const out = []
  const add = (v, i) => out.push([v, s.slice(0, i).split('\n').length])
  for (const m of s.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) add(Number(m[1]), m.index)
  for (const m of s.matchAll(/fontSize:\s*'(\d+(?:\.\d+)?)px'/g)) add(Number(m[1]), m.index)
  for (const m of s.matchAll(/fontSize:\s*'(\d*\.?\d+)rem'/g)) add(Number(m[1]) * 14, m.index)
  for (const m of s.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)(?=\s*[,}\n])/g)) add(Number(m[1]), m.index)
  for (const m of s.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)) add(Number(m[1]), m.index)
  for (const m of s.matchAll(/className[=:]\s*[{"'`][^\n]*?\btext-xs\b/g)) add(10.5, m.index)
  return out
}

function all(o = {}) {
  let total = 0
  for (const f of FILES) {
    const s = (o[f] ?? read(f)).replace(/\r\n/g, '\n')
    const t = tamanhos(s)
    total += t.length
    const pequenos = t.filter(([v]) => v < 12).map(([v, l]) => `${v}px na linha ${l}`)
    ok(pequenos.length === 0, `${f}: texto abaixo de 12 px → ${pequenos.join(', ')}`)
  }
  ok(total > 150, `o guardião leu os tamanhos de verdade (${total})`)
}

all()
const real = passed
const mutants = [
  ['selo "Save 30%" volta a 10 px', 'app/pricing/PricingClient.tsx', /text-\[12px\]/, 'text-[10px]'],
  ['rótulo do cartão volta a 11 px', 'components/pricing/PlanValueStage.tsx', '.pv-label{font-size:12px', '.pv-label{font-size:11px'],
  ['text-xs volta (10,5 px)', 'components/pricing/TwoProductsPricing.tsx', /className="([^"]*)text-\[12px\]/, 'className="$1text-xs'],
  ['React fontSize: 11', 'app/pricing/PricingClient.tsx', /fontSize: 12(?=\s*[,}])/, 'fontSize: 11'],
]
let bitten = 0
for (const [name, f, a, b] of mutants) {
  const o = { [f]: read(f).replace(a, b) }
  if (o[f] === read(f)) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all(o) } catch { died = true }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-pricing-letra-12-1211: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
