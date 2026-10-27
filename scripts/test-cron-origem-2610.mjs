// KINEO-CRON-ORIGEM-2610 — guardião: o cron do autopilot/desenhos chama o próprio site pelo domínio público em produção.
// Motivo: a Proteção de Deploy (SSO) da Vercel bloqueia *.vercel.app; as 15 amostras de desenho falharam com story_401.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

const { cronSelfOrigin, CRON_PUBLIC_ORIGIN } = createOfflineLoader()('lib/cronSelfOrigin.ts')
checa('A1 produção vinda de *.vercel.app → domínio público', cronSelfOrigin('https://kineo-abc123-josephsskaf-hubs-projects.vercel.app', 'production') === 'https://www.usekineo.com')
checa('A2 produção já no domínio público → mantém', cronSelfOrigin('https://www.usekineo.com', 'production') === 'https://www.usekineo.com')
checa('A3 preview mantém a própria origem (testa o deploy de preview)', cronSelfOrigin('https://kineo-git-x.vercel.app', 'preview') === 'https://kineo-git-x.vercel.app')
checa('A4 local mantém', cronSelfOrigin('http://localhost:3000', undefined) === 'http://localhost:3000')
checa('A5 origem inválida em produção → domínio público (falha fechada)', cronSelfOrigin('lixo', 'production') === CRON_PUBLIC_ORIGIN)

const rota = fs.readFileSync('app/api/cron/autopilot-generate/route.ts', 'utf8').replace(/\r\n/g, '\n')
checa('B1 a rota usa cronSelfOrigin para o baseUrl', /const baseUrl = cronSelfOrigin\(req\.nextUrl\.origin, process\.env\.VERCEL_ENV\)/.test(rota))
checa('B2 não sobrou baseUrl cru da request', !/const baseUrl = req\.nextUrl\.origin\s*$/m.test(rota))
checa('B3 o mesmo baseUrl serve os 3 passes (publicar, gerar, desenhos)', /publishPass\(\{ db, baseUrl/.test(rota) && /generatePass\(\{ db, baseUrl/.test(rota) && /kidsPass\(\{ db, baseUrl/.test(rota))
const mut = cronSelfOrigin('https://x.vercel.app', 'production') !== 'https://x.vercel.app'
checa('M1 sem a troca, A1 seria vermelho', mut)

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
