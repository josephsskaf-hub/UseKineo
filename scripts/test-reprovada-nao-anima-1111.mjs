// KINEO-REPROVADA-NAO-ANIMA-1111 — no filme clássico (motor padrão pago, H3 Max Turbo i2v) a foto que o crítico reprovou por
// SUJEITO, IDENTIDADE ou TEXTO não vira o primeiro quadro do clipe: a cena segue sem foto (texto→vídeo do mesmo motor).
// Trava (Node puro, sem rede/banco): (a) stillPodeAnimar REAL executado (lib/cinematic/reprovadaNaoAnima.ts, só tipos importados) sobre
// relatos no formato real; (b) a rota liga a regra no ponto em que a escolha do crítico entra em sceneStills, e só lá;
// (c) nenhuma foto nova: a regra não chama gerarStill; (d) o Kling 4 grátis segue na regra dele (só PASS anima).
// Mutantes em memória no fim.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import('typescript')).default
const SRC = { lib: read('lib/cinematic/reprovadaNaoAnima.ts'), critico: read('lib/cinematic/criticoStill.ts'), route: read('app/api/generate-video-cinematic/route.ts'), k4: read('lib/kling4Trial.ts') }
const load = (src) => {
  const m = { exports: {} }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('module', 'exports', 'require', js)(m, m.exports, () => ({ JUIZ_STILL_MODELO: 'gpt-4o-mini' }))
  return m.exports
}
const U = 'https://x/s.jpg'
const relato = (o = {}) => ({ modo: 'enforce', estado_final: 'BEST_FAIL', escolhida_tentativa: 1, url_final: U,
  tentativas: [{ n: 0, url: 'https://x/o.jpg', veredito: 'FAIL', problemas: ['sujeito'] }, { n: 1, url: U, veredito: 'FAIL', problemas: o.problemas ?? ['sujeito'] }], ...o })

function problems(S) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let L
  try { L = load(S.lib) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const pode = L.stillPodeAnimar
  if (typeof pode !== 'function') return ['lib: stillPodeAnimar sumiu']
  for (const prob of ['sujeito', 'identidade', 'texto']) no(pode(relato({ problemas: [prob] })) !== false, `regra: reprovada por ${prob} ainda anima`)
  no(pode(relato({ problemas: ['anatomia', 'texto'] })) !== false, 'regra: texto junto com anatomia ainda anima')
  for (const prob of ['anatomia', 'artefato']) no(pode(relato({ problemas: [prob] })) !== true, `regra: reprovada só por ${prob} deixou de animar (fora do escopo)`)
  no(pode(relato({ estado_final: 'PASS' })) !== true, 'regra: aprovada deixou de animar')
  no(pode(relato({ estado_final: 'UNVERIFIED' })) !== true, 'regra: crítico sem resposta (UNVERIFIED) deixou de animar — viraria texto→vídeo em massa')
  no(pode(relato({ modo: 'log_only' })) !== true, 'regra: log_only mudou o filme (só mede)')
  no(pode(relato({ url_final: 'https://outra' })) !== true, 'regra: tentativa que não é a escolhida decidiu')
  no(pode(relato({ tentativas: [{ n: 1, url: U, veredito: 'PULADO', problemas: ['sujeito'] }] })) !== true, 'regra: tentativa sem FAIL decidiu')
  const fn = S.lib.slice(S.lib.indexOf('export function stillPodeAnimar('))
  no(/stillPodeAnimar|REPROVADA-NAO-ANIMA/.test(S.critico), 'criticoStill.ts foi mexido (o recibo exato do KINEO-CRITICO-OBSERVA-0911 quebra): a regra mora em reprovadaNaoAnima.ts')
  no(!S.lib.includes("import type { ProblemaStill, RelatoCriticoStill } from '@/lib/cinematic/criticoStill'") || /^import (?!type)/m.test(S.lib), 'lib: importa código (só tipos são permitidos)')
  no(/gerarStill|generateCinematicSceneStill|fetch\(/.test(fn), 'regra: gera foto nova ou chama rede')

  const r = S.route
  no(!r.includes('        const animar = stillPodeAnimar(rc) // KINEO-REPROVADA-NAO-ANIMA-1111'), 'rota: o crítico clássico não consulta a regra')
  no(!r.includes('        return { idx, url: julgado.url, animar } //'), 'rota: o crítico clássico não devolve a decisão')
  no(!r.includes('sceneStills[c.idx] = c.animar === false ? null : c.url //'), 'rota: a foto reprovada ainda entra em sceneStills')
  no(r.split('stillPodeAnimar(').length - 1 !== 1, 'rota: a regra aparece fora do crítico clássico (escopo: só o caminho clássico)')
  no(!r.includes('submitScene(scenes[i], model, i, sceneStills[i] ?? undefined)'), 'rota: cena sem foto deixou de cair no texto→vídeo do mesmo motor')
  no(!S.k4.includes("t.veredito === 'PASS'"), 'Kling 4 grátis: a regra própria (só PASS anima) mudou')
  return p
}

const atual = problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo')
const MUT = [
  ['M1 regra esquece identidade', 'lib', (s) => s.replace("['sujeito', 'identidade', 'texto']", "['sujeito', 'texto']")],
  ['M2 regra descarta também UNVERIFIED', 'lib', (s) => s.replace("if (r.modo !== 'enforce' || r.estado_final !== 'BEST_FAIL') return true", "if (r.modo !== 'enforce' || r.estado_final === 'PASS') return true")],
  ['M7 regra volta para dentro do criticoStill', 'critico', (s) => s + '\nexport function stillPodeAnimar() { return true }\n'],
  ['M3 regra vale em log_only', 'lib', (s) => s.replace("if (r.modo !== 'enforce' || r.estado_final", "if (r.estado_final")],
  ['M4 regra descarta qualquer FAIL', 'lib', (s) => s.replace('return !t.problemas.some((p) => PROBLEMAS_QUE_NAO_ANIMAM.includes(p))', 'return false')],
  ['M5 rota ignora a decisão', 'route', (s) => s.replace('sceneStills[c.idx] = c.animar === false ? null : c.url //', 'sceneStills[c.idx] = c.url //')],
  ['M6 rota sem perguntar à regra', 'route', (s) => s.replace('        const animar = stillPodeAnimar(rc) // KINEO-REPROVADA-NAO-ANIMA-1111', '        const animar = true // KINEO-REPROVADA-NAO-ANIMA-1111')],
]
for (const [nome, k, f] of MUT) {
  const s2 = f(SRC[k])
  if (s2 === SRC[k]) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems({ ...SRC, [k]: s2 })
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0]})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
