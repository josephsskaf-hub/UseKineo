// KINEO-ARGENTINA-0411 [fundador 04/11: "libera pra argentina o trial"] + KINEO-PAISES-5-0411 [fundador 04/11: "libera os 5 países"] — guardião: executa a régua real e mutante fica vermelho.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const ARQ = 'lib/freeFilmPolicy.ts'
const F = createOfflineLoader()(ARQ)
const semLinha = (pais) => createOfflineLoader({ source: (rel, t) => (rel === ARQ ? t.split(/\r?\n/).filter((l) => !l.trim().startsWith(`'${pais}',`)).join('\n') : t) })(ARQ)
checa('Argentina recebe o trial e a cota semanal', F.filmeGratisPermitido('AR') && F.filmeGratisPermitido('ar') && F.paisDaListaConfirmado('AR') === 'AR')
for (const p of ['ZA', 'TR', 'MX', 'MY', 'PR']) checa(`${p} recebe o trial e a cota semanal`, F.filmeGratisPermitido(p) && F.paisDaListaConfirmado(p) === p)
checa('quem estava fora continua fora', ['CL', 'CO', 'PE', 'UY', 'IN', 'PK', 'EG', 'UA', 'KZ', 'RS', 'CR', 'PA'].every((c) => !F.filmeGratisPermitido(c)))
checa('Brasil continua dentro', F.filmeGratisPermitido('BR'))
checa('lista sem repetidos', new Set(F.PAISES_FILME_GRATIS).size === F.PAISES_FILME_GRATIS.length)
const fonte = fs.readFileSync(ARQ, 'utf8')
checa('cada país em uma linha só, reversível', ['AR', 'ZA', 'TR', 'MX', 'MY', 'PR'].every((p) => (fonte.match(new RegExp(`^\\s*'${p}',`, 'gm')) ?? []).length === 1))
checa('mutante sem a linha fica vermelho', !semLinha('AR').filmeGratisPermitido('AR'))
const semMx = semLinha('MX')
checa('apagar a linha de um país do teste reverte só ele', !semMx.filmeGratisPermitido('MX') && semMx.filmeGratisPermitido('TR'))
console.log(falhas ? falhas + ' falha(s)' : 'tudo verde')
process.exit(falhas ? 1 : 0)
