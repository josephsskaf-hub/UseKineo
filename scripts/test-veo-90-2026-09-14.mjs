// KINEO-VEO-90-2026-09-14 — só Veo (Sora fora): acima de 64 s, clipes suficientes
// para o footage cobrir a fala. Ajuste de CUSTO separado (Board, 14/09).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []; const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const rc = rd('app/api/generate-video-cinematic/route.ts')
// 15/09 (KINEO-VEO-COBRE-A-FALA, autorizado pelo fundador: "melhorias necessárias em duração"): a regra vale para TODO Veo — 60 s tinha 56 s de imagem.
checa('o ajuste existe, é SÓ Veo (sem Sora) e vale para toda duração (15/09)', rc.includes('if (wantsVeo) clipCount = Math.max(clipCount, Math.min(12, Math.ceil(duration / 8) + 1))') && !rc.includes('if (wantsVeo && duration > 64)') && !/wantsSora\) clipCount = Math\.max/.test(rc) && rc.includes('autorizado pelo fundador em 15/09/2026'))
// 15/09: o fundador aprovou o ajuste com o orçamento reconfirmado — o rótulo passa de "NÃO APROVADO" para "APROVADO pelo fundador em 15/09/2026", com o preço público declarado inalterado; o orçamento continua ESTIMATIVA com fonte.
checa('o orçamento é rotulado ESTIMATIVA, com a fonte de cada custo, receita ALOCADA separada de recebimento, margem após taxas NÃO calculada, e APROVADO pelo fundador em 15/09/2026 com preço público inalterado', rc.includes('ORÇAMENTO — ESTIMATIVA') && rc.includes('fonte: docs/PRECOS-MOTORES-V4.md') && rc.includes('fonte: lib/credits/engineCost.ts') && rc.includes('RECEITA ALOCADA por crédito') && rc.includes('Isto é ALOCAÇÃO, não recebimento') && rc.includes('NÃO está calculada aqui') && rc.includes('APROVADO pelo fundador em 15/09/2026') && rc.includes('preço público (150 cr a 90 s) inalterado') && !rc.includes('NÃO APROVADO: ajuste de CUSTO pendente') && rc.includes('$9,60') && rc.includes('$7,20') && rc.includes('150 cr = $24,75') && rc.includes('Creator $19,90/150 → $19,90') && rc.includes('Studio $39,90/300 → $19,95'))
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
const veo = (d) => Math.max(base(d), Math.min(12, Math.ceil(d / 8) + 1))
checa('Veo 90 s → 12 clipes = 96 s de footage ≥ 88,7 s de fala', veo(90) === 12 && veo(90) * 8 >= 88.7)
checa('Veo 60 s → 9 clipes = 72 s de imagem (era 7 = 56 s < 60: o compose repetia cena) — 15/09', veo(60) === 9 && veo(60) * 8 >= 61.5)
checa('Veo 35 s → 6 clipes = 48 s (era 4 = 32 s < 35) — 15/09', veo(35) === 6 && veo(35) * 8 >= 35)
console.log(`${ok} ok · ${falhas.length} falhas`); for (const f of falhas) console.log('  ✗', f); process.exit(falhas.length ? 1 : 0)
