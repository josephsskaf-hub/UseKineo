// KINEO-SEM-CLOAKING-0311 [fundador 03/11: "vamos tentar desbloquear nosso google ads"] — guardião.
// A home não pode mostrar uma variante às pessoas e outra ao robô: o A/B de 05/10 (ab50) dava clips_first a metade das pessoas e
// SEMPRE control ao robô, e isso é cloaking pela definição do Google (conta 186-928-2523 suspensa por "técnicas de cloaking").
// Prova: o interruptor está 'off'; com ele, humano e robô recebem control e nenhum cookie é criado. Religar o A/B exige tirar a regra do robô.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ARQ = 'lib/growth/homeClipsFirst.ts'
const M = createOfflineLoader({ globals: {} })(ARQ)
const HUMANO = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'
const ROBOS = ['AdsBot-Google (+http://www.google.com/adsbot.html)', 'Googlebot/2.1 (+http://www.google.com/bot.html)', 'Mozilla/5.0 (compatible; bingbot/2.0)']
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
checa("interruptor em 'off'", M.HOME_CLIPS_FIRST === 'off')
const id = '11111111-1111-4111-8111-111111111111'
const h = M.assignHomeVariant({ visitorId: id, userAgent: HUMANO })
checa('pessoa vê control', h.variant === 'control' && h.expose === false)
for (const ua of ROBOS) checa('robô vê a MESMA home: ' + ua.slice(0, 18), M.assignHomeVariant({ visitorId: id, userAgent: ua }).variant === h.variant)
checa('nenhum cookie de sorteio para ninguém', !M.shouldMintHomeVisitorCookie({ pathname: '/', method: 'GET', userAgent: HUMANO, existing: null }))
const interruptorOff = (s) => /export const HOME_CLIPS_FIRST: HomeClipsFirstMode = 'off'/.test(s)
const fonte = fs.readFileSync(ARQ, 'utf8')
checa('o fonte declara off', interruptorOff(fonte))
checa('mutante ab50 fica vermelho', !interruptorOff(fonte.replace("HomeClipsFirstMode = 'off'", "HomeClipsFirstMode = 'ab50'")))
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde')
process.exit(falhas ? 1 : 0)
