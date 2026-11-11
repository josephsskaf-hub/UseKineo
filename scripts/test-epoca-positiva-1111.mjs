// KINEO-EPOCA-POSITIVA-1111 — a trava de época vai em POSITIVO: nenhum objeto de hoje é NOMEADO no prompt (imagem-chave e clipe).
// Causa provada nas imagens-chave de 11/11: Pompeia (6db4c2ca) nasceu com carros e Pompeia (4306e307) com TANQUES — o sufixo dizia
// "absolutely no modern objects, no tanks, no cars, no trucks…" e FLUX/Kling 4/H3/S25 não têm campo negativo.
// Trava (Node puro: o bloco REAL de eraLockSuffix extraído da rota e executado): (a) os textos reais dos dois Pompeias dão a época
// com o ano antigo, sem nenhum substantivo proibido; (b) controles: 1910 segue "the year 1910"; história de hoje = ''; "geladeira
// inteligente + hieróglifos" segue ''; resolução 1080×1920 não vira ano; (c) nenhum outro lugar de app/lib monta "no tanks".
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = (p) => readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n')
const SRC = { route: read('app/api/generate-video-cinematic/route.ts') }
const PROIBIDO = /\b(?:tanks?|cars?|trucks?|plastic|asphalt|power lines|modern (?:objects|weapons|uniforms|military))\b/i

function problems(S) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  const r = S.route
  const i = r.indexOf('const ERA_YEAR_RE = '), j = r.indexOf('\n}\n', r.indexOf('function eraLockSuffix('))
  if (i < 0 || j < 0) return ['rota: eraLockSuffix não encontrada']
  let era
  try { era = new Function(`${ts.transpileModule(r.slice(i, j + 3), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText}; return eraLockSuffix`)() } catch (e) { return [`rota: o bloco não executa (${e.message})`] }
  const EN = 'Thousands cheer—unaware of looming doom. A plume rises from Mount Vesuvius... Create an ultra-photorealistic, epic Hollywood historical disaster film scene set in Pompeii, Italy, in the year 79 AD, during the catastrophic eruption of Mount Vesuvius.'
  const RU = 'Арену в Помпеях, 79 год н.э., заполняют зрители. Везувий извергается, столб пепла взмывает в небо.'
  for (const [nome, ctx] of [['Pompeia en', EN], ['Pompeia ru', RU]]) {
    const s = era(ctx)
    no(!s, `${nome}: a trava de época não ligou`)
    no(PROIBIDO.test(s), `${nome}: nomeia objeto proibido → ${s}`)
    no(!/the year 79 AD/.test(s), `${nome}: o ano antigo não entrou (${s.slice(0, 90)})`)
    no(!/period clothing, period architecture and period transport only/.test(s), `${nome}: perdeu a época em positivo`)
  }
  no(!/the year 44 BC/.test(era('Julius Caesar was murdered in 44 a.C. in Rome.')), 'a.C. não virou BC')
  no(!/the year 1910/.test(era('A farmhouse in 1910 New England.')) || PROIBIDO.test(era('A farmhouse in 1910 New England.')), '1910: ano perdido ou objeto nomeado')
  no(era('My phone got a strange message last night.') !== '', 'história de hoje ganhou trava de época')
  no(era('My smart fridge wrote ancient hieroglyphics on its screen.') !== '', 'geladeira inteligente ganhou trava de época')
  no(/the year 10(?:80|920)/.test(era('Resolution: 1080 × 1920. A dragon over a castle.')), 'resolução virou ano')
  // (c) ninguém mais monta a lista
  const achados = []
  const walk = (dir) => { for (const n of readdirSync(new URL(dir, root))) { const rel = `${dir}/${n}`; if (n === 'node_modules' || n.startsWith('.')) continue; if (statSync(new URL(rel, root)).isDirectory()) walk(rel); else if (/\.(ts|tsx)$/.test(n)) { const t = (rel === 'app/api/generate-video-cinematic/route.ts' ? r : read(rel)).replace(/\/\/[^\n]*/g, ''); if (/['"`][^'"`\n]*\bno tanks\b/.test(t)) achados.push(rel) } } }
  walk('app'); walk('lib')
  no(achados.length > 0, `"no tanks" ainda é montado em: ${achados.join(', ')}`)
  return p
}

const atual = problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (Pompeia en/ru → "the year 79 AD", nenhum objeto nomeado)')
const MUT = [
  ['M1 a lista volta', (s) => s.replace('period clothing, period architecture and period transport only, as it really looked then', 'period clothing only, absolutely no modern objects, no tanks, no cars, no trucks')],
  ['M2 ano antigo ignorado', (s) => s.replace("const antigo = ctx.match(ERA_ANTIGA_RE)", 'const antigo = null')],
  ['M3 a.C. vira AD', (s) => s.replace("? 'BC' : 'AD'}", "? 'AD' : 'AD'}")],
]
for (const [nome, f] of MUT) {
  const s2 = f(SRC.route)
  if (s2 === SRC.route) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems({ route: s2 })
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0].slice(0, 140)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
