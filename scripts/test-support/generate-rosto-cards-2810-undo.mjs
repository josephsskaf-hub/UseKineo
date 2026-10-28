// KINEO-ROSTO-NO-CLIPE-2810 — gera as camadas DESFAZ das entregas de 28/10 deste ramo (diff REVERSO, contexto 3), uma por entrega:
//   node scripts/test-support/generate-rosto-cards-2810-undo.mjs <camada>
// Cada camada vira scripts/test-support/desfaz-<camada>.mjs, autocontida (os blocos ficam no próprio arquivo). `tip` = o commit da
// entrega (null = árvore de trabalho, só enquanto a entrega não foi commitada). Rodar de novo só se a entrega mudar.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
export const CAMADAS = {
  'rosto-no-clipe-2810': {
    fn: 'semRostoNoClipe2810',
    marca: 'KINEO-ROSTO-NO-CLIPE-2810',
    o_que: 'o botão "Put your face in it" (remix do clipe da casa com a foto da pessoa)',
    base: '24ebecdcea27bf2896856d412e417211c39eed6b',
    tip: null,
    arquivos: ['lib/homeGaleria.ts', 'lib/homeGaleriaItems.ts', 'app/api/clips/route.ts', 'components/KineoHouseGallery.tsx', 'components/home/HomeClipsStrip.tsx', 'app/(dashboard)/clips/ClipsClient.tsx'],
  },
}

function hunksOf(c, rel) {
  const args = ['-C', ROOT, '-c', 'core.autocrlf=true', 'diff', '-U3', '--no-color', c.base, ...(c.tip ? [c.tip] : []), '--', rel]
  const diff = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n')
  const hunks = []
  let cur = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) { cur = { before: [], now: [] }; hunks.push(cur); continue }
    if (!cur || line.startsWith('\\')) continue
    if (line.startsWith(' ')) { cur.before.push(line.slice(1)); cur.now.push(line.slice(1)) }
    else if (line.startsWith('-')) cur.before.push(line.slice(1))
    else if (line.startsWith('+')) cur.now.push(line.slice(1))
  }
  return hunks.map((h) => ({ before: h.before.join('\n'), now: h.now.join('\n') }))
}

const nome = process.argv[2]
const c = CAMADAS[nome]
if (!c) { console.error('camada desconhecida: ' + nome + ' (' + Object.keys(CAMADAS).join(', ') + ')'); process.exit(1) }
const files = {}
for (const rel of c.arquivos) files[rel] = hunksOf(c, rel)
const K = c.fn
const out = `// ${c.marca} — DESFAZ, em memória, esta entrega (${c.o_que}) nos arquivos que ela MODIFICOU, para os guardiões que
// conferem arquivos BYTE A BYTE contra uma base anterior. Diff REVERSO exato (contexto 3, gerado por generate-rosto-cards-2810-undo.mjs
// ${nome}): cada bloco de AGORA (moldurado por quebras de linha) aparece UMA vez e volta a ser o de ANTES. Arquivo fora da lista ou sem
// a marca volta igual. Camadas mais novas do mesmo arquivo saem ANTES desta.
export const MARCA = '${c.marca}'
export const BASE = '${c.base}'
const DESFAZ = ${JSON.stringify(files)}
export const ARQUIVOS = Object.keys(DESFAZ)
export function ${K}(text, rel) {
  if (typeof text !== 'string') return text
  const original = text
  const hunks = DESFAZ[String(rel ?? '').replace(/\\\\/g, '/').replace(/^\\.\\//, '')]
  if (!hunks || !original.includes(MARCA)) return original
  const crlf = original.includes('\\r\\n')
  let s = '\\n' + original.replace(/\\r\\n/g, '\\n') + '\\n'
  for (const h of hunks) {
    const parts = s.split('\\n' + h.now + '\\n')
    if (parts.length !== 2) throw new Error('${K}: ' + rel + ' mudou fora da camada (' + (parts.length - 1) + 'x)')
    s = parts.join('\\n' + h.before + '\\n')
  }
  s = s.slice(1, -1)
  if (s.includes(MARCA)) throw new Error('${K}: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\\n/g, '\\r\\n') : s
}
`
writeFileSync(path.join(ROOT, `scripts/test-support/desfaz-${nome}.mjs`), out)
console.log('ok', nome, Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.length])))
