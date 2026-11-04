// KINEO-ARGENTINA-0411 [fundador 04/11: "libera pra argentina o trial"] — guardião: executa a régua real e mutante fica vermelho.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const ARQ = 'lib/freeFilmPolicy.ts'
const F = createOfflineLoader()(ARQ)
checa('Argentina recebe o trial e a cota semanal', F.filmeGratisPermitido('AR') && F.filmeGratisPermitido('ar') && F.paisDaListaConfirmado('AR') === 'AR')
checa('quem estava fora continua fora', ['MX', 'CL', 'CO', 'PE', 'UY', 'IN', 'PK', 'EG', 'UA'].every((c) => !F.filmeGratisPermitido(c)))
checa('Brasil continua dentro', F.filmeGratisPermitido('BR'))
checa('lista sem repetidos', new Set(F.PAISES_FILME_GRATIS).size === F.PAISES_FILME_GRATIS.length)
const fonte = fs.readFileSync(ARQ, 'utf8')
checa('uma linha só, reversível', (fonte.match(/'AR',/g) ?? []).length === 1)
const semAr = createOfflineLoader({ source: (rel, t) => (rel === ARQ ? t.split(/\r?\n/).filter((l) => !l.trim().startsWith("'AR',")).join('\n') : t) })(ARQ)
checa('mutante sem a linha fica vermelho', !semAr.filmeGratisPermitido('AR'))
console.log(falhas ? falhas + ' falha(s)' : 'tudo verde')
process.exit(falhas ? 1 : 0)
