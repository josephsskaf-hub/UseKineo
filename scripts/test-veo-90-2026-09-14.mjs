// KINEO-VEO-90-2026-09-14 — só Veo (Sora fora): acima de 64 s, clipes suficientes
// para o footage cobrir a fala. Ajuste de CUSTO separado (Board, 14/09).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []; const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const rc = rd('app/api/generate-video-cinematic/route.ts')
checa('o ajuste existe, é SÓ Veo (sem Sora) e só acima de 64 s', rc.includes('if (wantsVeo && duration > 64) clipCount = Math.max(clipCount, Math.min(12, Math.ceil(duration / 8) + 1))') && !/wantsSora\) && duration > 64/.test(rc))
checa('o orçamento é rotulado ESTIMATIVA, com a fonte de cada custo, receita ALOCADA separada de recebimento, margem após taxas NÃO calculada, e NÃO APROVADO', rc.includes('ORÇAMENTO — ESTIMATIVA') && rc.includes('fonte: docs/PRECOS-MOTORES-V4.md') && rc.includes('fonte: lib/credits/engineCost.ts') && rc.includes('RECEITA ALOCADA por crédito') && rc.includes('Isto é ALOCAÇÃO, não recebimento') && rc.includes('NÃO está calculada aqui') && rc.includes('NÃO APROVADO: ajuste de CUSTO pendente') && rc.includes('$9,60') && rc.includes('$7,20') && rc.includes('150 cr = $24,75') && rc.includes('Creator $19,90/150 → $19,90') && rc.includes('Studio $39,90/300 → $19,95'))
// o preço real do filme, executado na função de custo da casa
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import vm from 'node:vm'
{
  const src = rd('lib/credits/engineCost.ts').split('\n').filter((l) => !/^import /.test(l)).join('\n')
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}; try { vm.runInNewContext(js, { exports: exp, console, require: () => ({}) }) } catch (e) { exp.__erro = String(e) }
  const custo = typeof exp.creditCostForDuration === 'function' ? exp.creditCostForDuration('cinematic_veo', true, 90) : null
  checa(`creditCostForDuration('cinematic_veo', pago, 90 s) = 150 cr (lido da função da casa, não de cabeça): ${custo}`, custo === 150)
  checa('… e 60 s = 100 cr', (typeof exp.creditCostForDuration === 'function' ? exp.creditCostForDuration('cinematic_veo', true, 60) : null) === 100)
}
// aritmética: mesma fórmula da rota, executada
const base = (d) => Math.max(2, Math.min(9, Math.ceil(d / 9)))
const veo = (d) => (d > 64 ? Math.max(base(d), Math.min(12, Math.ceil(d / 8) + 1)) : base(d))
checa('Veo 90 s → 12 clipes = 96 s de footage ≥ 88,7 s de fala', veo(90) === 12 && veo(90) * 8 >= 88.7)
checa('Veo 60 s → intocado (7 clipes, como hoje)', veo(60) === base(60))
checa('Veo 35 s → intocado', veo(35) === base(35))
console.log(`${ok} ok · ${falhas.length} falhas`); for (const f of falhas) console.log('  ✗', f); process.exit(falhas.length ? 1 : 0)
