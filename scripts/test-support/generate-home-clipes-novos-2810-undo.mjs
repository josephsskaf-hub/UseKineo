// KINEO-HOME-CLIPES-NOVOS-2810 — gera scripts/test-support/desfaz-home-clipes-novos-2810.mjs (diff REVERSO, contexto 3) a partir de
// `git diff BASE -- <arquivos>`. Rodar de novo só se esta entrega mudar: node scripts/test-support/generate-home-clipes-novos-2810-undo.mjs
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const BASE = 'f7b9439147061f4c0f7c96861c8bc7c597176482'
const ARQUIVOS = ['components/home/HomeClipsStrip.tsx']
const MARCA = 'KINEO-HOME-CLIPES-NOVOS-2810'

const files = {}
for (const rel of ARQUIVOS) {
  const diff = execFileSync('git', ['-C', ROOT, '-c', 'core.autocrlf=false', 'diff', '-U3', '--no-color', BASE, '--', rel], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
  const hunks = []
  let cur = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) { cur = { before: [], now: [] }; hunks.push(cur); continue }
    if (!cur || line.startsWith('\\')) continue
    if (line.startsWith(' ')) { cur.before.push(line.slice(1)); cur.now.push(line.slice(1)) }
    else if (line.startsWith('-')) cur.before.push(line.slice(1))
    else if (line.startsWith('+')) cur.now.push(line.slice(1))
  }
  files[rel] = hunks.map((h) => ({ before: h.before.join('\n'), now: h.now.join('\n') }))
}

const out = `// ${MARCA} — DESFAZ, em memória, esta entrega (faixa de Clipes da home com os 8 clipes novos de 27/10) nos arquivos que ela
// MODIFICOU, para os guardiões que conferem arquivos BYTE A BYTE contra uma base anterior. Diff REVERSO exato (contexto 3, gerado por
// generate-home-clipes-novos-2810-undo.mjs): cada bloco de AGORA (moldurado por quebras de linha) aparece UMA vez e volta a ser o de
// ANTES. Arquivo fora da lista ou sem a marca volta igual. É a camada mais nova destes arquivos — desfaça ESTA primeiro.
export const HOME_CLIPES_NOVOS_2810_MARCA = '${MARCA}'
export const HOME_CLIPES_NOVOS_2810_BASE = '${BASE}'
const DESFAZ = ${JSON.stringify(files)}
export const HOME_CLIPES_NOVOS_2810_ARQUIVOS = Object.keys(DESFAZ)
/** Arquivos novos desta entrega (não existem na base). */
export const HOME_CLIPES_NOVOS_2810_NOVOS = [
  'scripts/test-home-clipes-novos-2810.mjs', 'scripts/test-support/desfaz-home-clipes-novos-2810.mjs',
  'scripts/test-support/generate-home-clipes-novos-2810-undo.mjs',
]
export function semHomeClipesNovos2810(text, rel) {
  if (typeof text !== 'string') return text
  const original = text
  const hunks = DESFAZ[String(rel ?? '').replace(/\\\\/g, '/').replace(/^\\.\\//, '')]
  if (!hunks || !original.includes(HOME_CLIPES_NOVOS_2810_MARCA)) return original
  const crlf = original.includes('\\r\\n')
  let s = '\\n' + original.replace(/\\r\\n/g, '\\n') + '\\n'
  for (const h of hunks) {
    const parts = s.split('\\n' + h.now + '\\n')
    if (parts.length !== 2) throw new Error('semHomeClipesNovos2810: ' + rel + ' mudou fora da camada (' + (parts.length - 1) + 'x)')
    s = parts.join('\\n' + h.before + '\\n')
  }
  s = s.slice(1, -1)
  if (s.includes(HOME_CLIPES_NOVOS_2810_MARCA)) throw new Error('semHomeClipesNovos2810: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\\n/g, '\\r\\n') : s
}
`
writeFileSync(path.join(ROOT, 'scripts/test-support/desfaz-home-clipes-novos-2810.mjs'), out)
console.log('ok', Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.length])))
