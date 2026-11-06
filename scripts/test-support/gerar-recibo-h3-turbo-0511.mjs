// KINEO-H3-TURBO-ABRE-0511 — gera desfaz-h3-turbo-0511-fontes.json: as duas entregas do H3 Max Turbo (KINEO-H3-TURBO-0511 e a abertura), medidas
// contra a base fixa em que a primeira nasceu. Uso: node scripts/test-support/gerar-recibo-h3-turbo-0511.mjs (de novo depois de editar app/, lib/ ou components/).
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..', '..')
const BASE = '497575632'
const git = (...a) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 })
const ARQUIVOS = git('diff', '--name-only', BASE, '--', 'app', 'lib', 'components').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const saida = {}
for (const file of ARQUIVOS) {
  const antes = lf(git('show', `${BASE}:${file}`))
  const agora = lf(readFileSync(join(raiz, file), 'utf8'))
  const a = antes.split('\n'), b = agora.split('\n')
  // os blocos que mudaram, nos números do próprio git (um alinhamento caseiro se perde em blocos parecidos)
  const blocos = [...git('diff', '-U0', '--ignore-space-at-eol', BASE, '--', file).matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map((m) => {
    const na = m[2] === undefined ? 1 : Number(m[2]), nb = m[4] === undefined ? 1 : Number(m[4])
    const i = na === 0 ? Number(m[1]) : Number(m[1]) - 1, j = nb === 0 ? Number(m[3]) : Number(m[3]) - 1
    return { i, ii: i + na, j, jj: j + nb }
  })
  // contexto só em linhas iguais nos dois lados (nunca entra no bloco vizinho), até o trecho ser único em cada passo do desfazer
  let t = agora
  const hunks = []
  blocos.forEach((k, n) => {
    const tetoTras = n ? blocos[n - 1].jj : 0, tetoFrente = n + 1 < blocos.length ? blocos[n + 1].j : b.length
    for (let passo = 1; ; passo++) {
      const de = Math.max(tetoTras, k.j - passo), ate = Math.min(tetoFrente, k.jj + passo)
      const h = { antes: [...a.slice(k.i - (k.j - de), k.ii), ...b.slice(k.jj, ate)].join('\n'), depois: b.slice(de, ate).join('\n') }
      if (h.depois && t.split(h.depois).length === 2) { hunks.push(h); t = t.replace(h.depois, () => h.antes); return }
      if (passo > 60) throw new Error('trecho ambíguo em ' + file)
    }
  })
  if (t !== antes) throw new Error('desfazer não devolve a base em ' + file)
  saida[file] = hunks
}
writeFileSync(join(raiz, 'scripts/test-support/desfaz-h3-turbo-0511-fontes.json'), JSON.stringify(saida, null, 1) + '\n')
console.log('recibo:', Object.keys(saida).length, 'arquivos,', Object.values(saida).reduce((s, h) => s + h.length, 0), 'trechos')
