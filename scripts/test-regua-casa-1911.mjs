// KINEO-REGUA-CASA-1911 — guardião da régua da casa [CEO 19/11: "tudo que envolve dinheiro, crédito, motor pago, marca d'água ou dado passa a exigir lista EXATA"].
// O cadastro confirma o e-mail sozinho: qualquer um registra qualquer endereço. Prova, EXECUTANDO lib/internalAccounts.ts e lib/cinematic/classicDryRun.ts:
//   (1) contaDaCasaExata: verdadeiro só para a lista exata (com maiúsculas e espaços normalizados); falso para joseph+x@evil.com, test…@gmail,
//       domínio parecido, subendereço do fundador e mailinator — todos verdadeiros na régua larga isInternalEmail;
//   (2) DRY_RUN_EMAILS só com endereço da lista exata (registrado): fora josephskaf@gmail.com e joseph-test@shortsforgeai.com;
//   (3) as 7 portas de dinheiro/crédito (3 travas do Kling 4 grátis, amostras do desenho e do anúncio, recarga anual) usam contaDaCasaExata, nunca isInternalEmail.
// Mutantes no fim. Rodar: node scripts/test-regua-casa-1911.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const IA = 'lib/internalAccounts.ts', DR = 'lib/cinematic/classicDryRun.ts'
const PORTAS = ['lib/kling4GratisTravaServer.ts', 'lib/kling4GratisTetoServer.ts', 'lib/kling4TrialBudget.ts', 'app/api/kids-venda/sample/route.ts', 'app/api/kids-venda/status/route.ts', 'lib/ads/cena/escolhaSampleServer.ts', 'app/api/cron/annual-credit-refill/route.ts']
const run = (src) => { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(() => ({}), m, m.exports); return m.exports }
const DRY_FONTE = (src) => 'export ' + src.match(/const DRY_RUN_EMAILS = new Set\([\s\S]*?\)\)/)[0]

function bateria(over = {}) {
  const p = [], g = (f) => over[f] ?? lf(f)
  const check = (n, fn) => { try { fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const I = run(g(IA))
  check('(1) lista exata', () => {
    for (const e of ['josephsskaf@gmail.com', '  JosephSSkaf@Gmail.com ', 'victoriaskaf96@gmail.com', 'josephskaf@hotmail.com']) if (!I.contaDaCasaExata(e)) throw new Error('a casa ficou de fora: ' + e)
    for (const e of ['joseph+qualquer@evil.com', 'testando.ana@gmail.com', 'josephskaf.fake@outlook.com', 'victoriaskafxyz@yahoo.com', 'a@mailinator.com.br', 'josephsskaf+x@gmail.com', 'josephsskaf@gmai.com', 'josephsskaf@gmail.com.evil.com', 'joseph+teste02@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com', '', null]) {
      if (I.contaDaCasaExata(e)) throw new Error('estranho passou: ' + e)
    }
    if (!I.isInternalEmail('testando.ana@gmail.com')) throw new Error('a régua larga de métrica mudou (não era para mexer)')
  })
  check('(2) dry-run só com endereço registrado', () => {
    const D = run(DRY_FONTE(g(DR)))
    for (const e of D.DRY_RUN_EMAILS) if (!I.INTERNAL_EXACT_EMAILS.includes(e)) throw new Error('fora da lista exata (sem conta): ' + e)
    if (!D.DRY_RUN_EMAILS.has('josephsskaf@gmail.com')) throw new Error('o fundador saiu do ensaio')
  })
  check('(3) as 7 portas pela lista exata', () => {
    for (const f of PORTAS) { const s = g(f); if (/\bisInternalEmail\b/.test(s) || !/\bcontaDaCasaExata\(/.test(s)) throw new Error(f) }
  })
  return p
}
const real = bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['contaDaCasaExata vira a régua larga', IA, "  return e !== '' && EXACT_SET.has(e)", "  return e !== '' && (EXACT_SET.has(e) || PATTERN_REGEXPS.some((re) => re.test(e)))"],
  ['sem normalizar maiúsculas', IA, "  const e = (email ?? '').trim().toLowerCase()\n  return e !== '' && EXACT_SET.has(e)", "  const e = (email ?? '')\n  return e !== '' && EXACT_SET.has(e)"],
  ['endereço não registrado volta ao ensaio', DR, "new Set(['josephsskaf@gmail.com'])", "new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com'])"],
  ['trava do Kling 4 volta à régua larga', PORTAS[0], 'contaDaCasaExata(email)', 'isInternalEmail(email)'],
  ['recarga anual volta à régua larga', PORTAS[6], 'contaDaCasaExata(profile.email)', 'isInternalEmail(profile.email)'],
]
let mortos = 0
for (const [n, f, de, para] of mutantes) {
  const t = lf(f)
  if (t.split(de).length !== 2) { console.error('MUTANTE SEM ÂNCORA: ' + n); process.exit(1) }
  if (bateria({ [f]: t.split(de).join(para) }).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS régua da casa: dinheiro e crédito só pela lista exata (joseph+x@evil.com, test…@gmail, domínio parecido, subendereço e endereço sem conta ficam fora); dry-run só com conta registrada (${mortos}/${mutantes.length} mutantes mortos)`)
