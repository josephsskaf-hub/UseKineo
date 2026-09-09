// KINEO-PLANOS-9-19-29 — guardião do gate "motores caros só do Studio".
// Executa a decisão (pura) e lê a rota para provar que o gate roda antes da
// reserva de crédito e que conta antiga não perde nada.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const exp = {}
vm.runInNewContext(ts.transpileModule(rd('lib/enginePlanGate.ts'), { compilerOptions: { module: 1, target: 9 } }).outputText, { exports: exp, require: () => { throw new Error('puro') } })
const G = exp

console.log('== decisão ==')
const nova = '2026-09-09T12:00:00.000Z'
const velha = '2026-09-01T12:00:00.000Z'
checa('conta nova Starter não usa Kling 3', G.decideEngineGate({ engine: 'hollywood', plan: 'starter', profileCreatedAt: nova }).allowed === false)
checa('conta nova Creator não usa H3', G.decideEngineGate({ engine: 'h3', plan: 'basic', profileCreatedAt: nova }).allowed === false)
checa('trial de $1 (basic_trial) não usa Omni', G.decideEngineGate({ engine: 'omni', plan: 'basic_trial', profileCreatedAt: nova }).allowed === false)
checa('recusa nomeia Studio (pro)', G.decideEngineGate({ engine: 'veo', plan: 'basic', profileCreatedAt: nova }).requiredTier === 'pro')
checa('conta nova Studio usa tudo', ['kling', 'veo', 'hollywood', 'h3', 'omni', 's25'].every((e) => G.decideEngineGate({ engine: e, plan: 'pro', profileCreatedAt: nova }).allowed))
checa('Autopilot usa tudo', G.decideEngineGate({ engine: 'hollywood', plan: 'autopilot', profileCreatedAt: nova }).allowed)
checa('Seedance é de todo mundo', G.decideEngineGate({ engine: 'seedance', plan: 'starter', profileCreatedAt: nova }).allowed && G.decideEngineGate({ engine: 'cinematic_ai', plan: 'free', profileCreatedAt: nova }).allowed)
checa('Kineo 1 é de todo mundo', G.decideEngineGate({ engine: 'fast', plan: 'free', profileCreatedAt: nova }).allowed)
checa('GRANDFATHER: conta antiga Starter continua com Kling 3', G.decideEngineGate({ engine: 'hollywood', plan: 'starter', profileCreatedAt: velha }).reason === 'grandfathered')
checa('GRANDFATHER: conta antiga em trial continua com tudo', G.decideEngineGate({ engine: 'omni', plan: 'free', profileCreatedAt: velha }).allowed)
checa('sem created_at falha FECHADA (conta nova)', G.decideEngineGate({ engine: 'h3', plan: 'basic', profileCreatedAt: null }).allowed === false)
checa('created_at ilegível falha FECHADA', G.decideEngineGate({ engine: 'h3', plan: 'basic', profileCreatedAt: 'ontem' }).allowed === false)
checa('mensagem cita Studio e $59 (V7)', /Studio engine \(\$59\/mo/.test(G.engineGateMessage('hollywood')) && /Kling 3/.test(G.engineGateMessage('hollywood')))
checa('marco do gate é 08/09/2026', G.ENGINE_GATE_SINCE === '2026-09-08T07:00:00.000Z')
const cp = rd('lib/checkoutPricing.ts')
checa('o $59 da mensagem é o preço do Studio no código (V7)', /pro:\s*\{\s*usd:\s*5900\s*\}/.test(cp) && /\(\$59\/mo, every engine\)/.test(rd('lib/enginePlanGate.ts')))

console.log('== a rota obedece ==')
const r = rd('app/api/generate-video-cinematic/route.ts')
checa('perfil lido com created_at', /trial_credits_granted, created_at'\)/.test(r))
const iGate = r.indexOf('const engineGate = decideEngineGate({')
const iCost = r.indexOf('const baseCost = wantsS25')
checa('gate existe na rota', iGate > 0)
checa('gate roda ANTES do cálculo/reserva de crédito', iGate > 0 && iCost > iGate)
checa('recusa é 402 com upsell studio (o cliente já sabe abrir o modal)', /reason: 'studio_engine_plan_gate'[\s\S]{0,200}\{ status: 402 \}/.test(r) && /upsell: 'studio',\s*\n\s*reason: 'studio_engine_plan_gate'/.test(r))
checa('gate passa o created_at do perfil', /profileCreatedAt: \(profile as \{ created_at\?: string \| null \} \| null\)\?\.created_at \?\? null/.test(r))
checa('Seedance nunca cai no gate (chave "seedance")', /: 'seedance'\n\s*const engineGate/.test(r) || /: 'seedance'\r?\n\s*const engineGate/.test(r))
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('cliente trata upsell=studio', /data\?\.upsell === 'studio' \? 'studio'/.test(gc))
const sc = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('cards do Studio mostram o selo "Studio" nos motores caros', /STUDIO_ONLY_ENGINE_KEYS\.has\(e\.key\)/.test(sc))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — motores caros só do Studio, conta antiga intacta')
