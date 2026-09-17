// sprint-v1v4 #35 — o teto de fala da frase de volta.
//
// O caso real que originou o teste: 01/09/2026 17:40 UTC, pessoa externa
// (`thiagomineiro266`), oferta ON (limite 1, janela rolante de 30 dias). O
// servidor calculou `reset_in_minutes = 42864` e a tela dela recebeu
// "Your next free video unlocks in 714h 24m — nothing to buy, just come back."
//
// Este arquivo prova as duas metades da regra nova:
//   1. espera CURTA (a janela de 24h do OFF_OFFER) continua falando igual;
//   2. espera LONGA (a janela de 30 dias do ON_OFFER) cala, e o chamador
//      volta a mostrar SO a copy da oferta.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const fonte = readFileSync(join(raiz, 'lib/freeQuotaReset.ts'), 'utf8')

let ok = 0
let falhou = 0
function checa(nome, condicao) {
  if (condicao) { ok += 1; console.log(`  ok  ${nome}`) }
  else { falhou += 1; console.log(`  FALHOU  ${nome}`) }
}

// KINEO-COTA-SEMANAL-2026-09-17 — a reimplementação local era uma CÓPIA da regra e divergiu quando a janela mudou
// (memória: superfície medida por cópia da regra). Agora o guardião transpila o módulo REAL e testa a função de produção.
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
function roda(src) { const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function('module', 'exports', 'require', js)(m, m.exports, require); return m.exports }
const REAL = roda(fonte.replace(/\r\n/g, '\n'))
const frase = (liberaEmMs, agora) => REAL.fraseDaVolta(liberaEmMs, agora)

const agora = Date.parse('2026-09-01T17:40:48.343Z')
const MIN = 60000

console.log('\n— a espera curta segue falando (OFF_OFFER, 3 por 24h) —')
checa('10 minutos fala', frase(agora + 10 * MIN, agora) === 'Your next free video unlocks in 10m — nothing to buy, just come back.')
checa('4h 12m fala', frase(agora + (4 * 60 + 12) * MIN, agora)?.includes('4h 12m') === true)
checa('23h 59m (fim da janela OFF) fala', frase(agora + (23 * 60 + 59) * MIN, agora)?.includes('23h 59m') === true)
checa('24h cravadas falam', frase(agora + 24 * 60 * MIN, agora)?.includes('24h') === true)
checa('35h 59m ainda falam', frase(agora + (35 * 60 + 59) * MIN, agora)?.includes('35h 59m') === true)
checa('36h cravadas — ultimo instante que fala', frase(agora + 36 * 60 * MIN, agora)?.includes('36h') === true)

console.log('\n— KINEO-COTA-SEMANAL-2026-09-17: a janela é de 7 dias, a espera fala em DIAS até 7 dias e cala depois —')
checa('36h + 1min ainda fala em horas ("36h 1m")', frase(agora + (36 * 60 + 1) * MIN, agora)?.includes('36h 1m') === true)
checa('37h fala em dias ("1 day 13h")', frase(agora + 37 * 60 * MIN, agora)?.includes('1 day 13h') === true)
checa('48h fala "2 days"', frase(agora + 48 * 60 * MIN, agora)?.includes('2 days') === true && !String(frase(agora + 48 * 60 * MIN, agora)).includes('48h'))
checa('6 dias 23h fala', frase(agora + (6 * 24 + 23) * 60 * MIN, agora)?.includes('6 days 23h') === true)
checa('7 dias cravados — último instante que fala', frase(agora + 7 * 24 * 60 * MIN, agora)?.includes('7 days') === true)
checa('7 dias + 1min já cala', frase(agora + (7 * 24 * 60 + 1) * MIN, agora) === null)
checa('o caso real de 42864 minutos cala', frase(agora + 42864 * MIN, agora) === null)
checa('o "714h" nunca mais pode ser gerado', frase(agora + 42864 * MIN, agora) === null && !String(frase(agora + 42864 * MIN, agora)).includes('714h'))
checa('01/10/2026 12:04 (o reset_at real) cala', frase(Date.parse('2026-10-01T12:04:17.037Z'), agora) === null)

console.log('\n— nada do que ja calava passou a falar —')
checa('null continua null', frase(null, agora) === null)
checa('instante no passado cala', frase(agora - 1, agora) === null)
checa('instante igual a agora cala', frase(agora, agora) === null)
checa('alem de 30 dias segue calando', frase(agora + 31 * 24 * 3600 * 1000, agora) === null)
checa('NaN cala', frase(Number.NaN, agora) === null)
checa('agora NaN cala', frase(agora + MIN, Number.NaN) === null)

console.log('\n— o arquivo de producao carrega a regra —')
checa('TETO_DE_FALA_MS exportado = 7 dias (KINEO-COTA-SEMANAL)', /export const TETO_DE_FALA_MS = 7 \* 24 \* 3600 \* 1000/.test(fonte))
checa('o guard usa o teto', /if \(restanteMs > TETO_DE_FALA_MS\) return null/.test(fonte))
checa('o guard vem ANTES de montar a frase',
  fonte.indexOf('if (restanteMs > TETO_DE_FALA_MS) return null') < fonte.indexOf('const minutosTotais'))
checa('a frase em si nao mudou uma letra',
  fonte.includes('return `Your next free video unlocks in ${quanto} — nothing to buy, just come back.`'))
checa('o caso real esta documentado no arquivo', fonte.includes('42864'))

const rota = readFileSync(join(raiz, 'app/api/compose/route.ts'), 'utf8')
console.log('\n— o servidor passa a medir se FALOU, nao so se SOUBE —')
checa('reset_phrase_shown vai para o evento', /reset_phrase_shown: fraseVolta !== null/.test(rota))
checa('reset_in_minutes continua no evento', /reset_in_minutes: minutosAteLiberar/.test(rota))
checa('a copy da oferta segue intacta no 402', rota.includes('${FREE_OFFER.copy.limitHitError} ${fraseVolta}'))
checa('o fallback continua sendo a copy do Codex sozinha',
  /: FREE_OFFER\.copy\.limitHitError/.test(rota))

console.log(`\n${ok} verificacoes ok, ${falhou} falharam`)
process.exit(falhou === 0 ? 0 : 1)
