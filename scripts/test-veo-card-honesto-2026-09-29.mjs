// KINEO-VEO-CARD-HONESTO-2026-09-29 — o Veo 3.1 roda em 1080p pelo mesmo preço desde 16/08 (KINEO-VEO-1080,
// fal cobra igual em 720p e 1080p), mas o card do /studio, o seletor do /generate e o mega-menu ainda diziam
// 720p e carregavam um selo "Studio" digitado — com o gate de planos DESLIGADO na fonte (restauração 09/09) e
// o Veo a 35 s cabendo no Starter. Este guardião lê a fonte (readFileSync) e EXECUTA lib/enginePlanGate.ts:
// o selo de plano só existe quando o gate está ligado, e volta sozinho (mutante) no dia em que religar.
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
const exec = (src) => {
  const exp = {}
  vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText, { exports: exp, require: () => { throw new Error('puro') } })
  return exp
}

// ── 1. o selo bate com lib/enginePlanGate.ts (executado, não lido de cabeça) ─────────────────────────────
const gateSrc = rd('lib/enginePlanGate.ts')
const gate = exec(gateSrc)
checa('enginePlanGate exporta ENGINE_GATE_ACTIVE (boolean) e enginePlanBadge (função)', typeof gate.ENGINE_GATE_ACTIVE === 'boolean' && typeof gate.enginePlanBadge === 'function')
checa('ENGINE_GATE_ACTIVE deriva da constante ENGINE_GATE_SINCE (sem env, sem número digitado)', /export const ENGINE_GATE_ACTIVE: boolean = Date\.parse\(ENGINE_GATE_SINCE\) <= Date\.now\(\)/.test(gateSrc))
checa('selo do Veo === (gate ligado ? "Studio" : null)', gate.enginePlanBadge('veo') === (gate.ENGINE_GATE_ACTIVE ? 'Studio' : null))
checa('hoje (ENGINE_GATE_SINCE no futuro) o Veo NÃO leva selo Studio', gate.ENGINE_GATE_ACTIVE === false && gate.enginePlanBadge('veo') === null && gate.enginePlanBadge('cinematic_veo') === null)
checa('Seedance e Kineo 1 nunca levam selo', gate.enginePlanBadge('seedance') === null && gate.enginePlanBadge('fast') === null && gate.enginePlanBadge('cinematic_ai') === null)
// mutante: religar o gate na fonte → o selo volta sozinho; Seedance segue livre
const ligado = exec(gateSrc.replace(/export const ENGINE_GATE_SINCE = '[^']+'/, "export const ENGINE_GATE_SINCE = '2000-01-01T00:00:00.000Z'"))
checa('mutante (gate religado em 2000): ENGINE_GATE_ACTIVE=true, Veo volta a "Studio", Seedance continua sem selo', ligado.ENGINE_GATE_ACTIVE === true && ligado.enginePlanBadge('veo') === 'Studio' && ligado.enginePlanBadge('seedance') === null)
checa('mutante NÃO altera a decisão de acesso do Seedance (not_premium)', ligado.decideEngineGate({ engine: 'seedance', plan: 'free', profileCreatedAt: '2026-09-29T00:00:00.000Z' }).allowed === true)

// ── 2. /studio — card do Veo ───────────────────────────────────────────────────────────────────────────────
const sc = rd('app/(dashboard)/studio/StudioClient.tsx')
const veoCard = sc.split('\n').find((l) => /^\s*\{ key: 'veo',/.test(l)) ?? ''
checa('card do Veo no /studio existe', veoCard.length > 0)
checa("card do Veo diz res: '1080p'", /res: '1080p'/.test(veoCard))
checa('card do Veo mostra 1080p no texto que a pessoa lê (desc)', /desc: 'Google’s flagship cinematic engine · 1080p'/.test(veoCard))
checa('card do Veo não diz 720', !/720/.test(veoCard))
checa("card do Veo não tem selo 'Studio' digitado", !/tag: 'Studio'/.test(veoCard))
checa('custo do card do Veo vem de creditCostFor, sem número digitado', /credits: `\$\{creditCostFor\('cinematic_veo', true\)\} cr`/.test(veoCard) && !/credits: ['`]\d/.test(veoCard))
checa('selo automático dos motores caros só aparece com o gate ligado (ENGINE_GATE_ACTIVE && STUDIO_ONLY_ENGINE_KEYS.has(e.key))', /\{!pausa && ENGINE_GATE_ACTIVE && STUDIO_ONLY_ENGINE_KEYS\.has\(e\.key\) && <span className="tag" title="Studio plan engine">/.test(sc))
checa('/studio importa ENGINE_GATE_ACTIVE de lib/enginePlanGate', /import \{ ENGINE_GATE_ACTIVE, STUDIO_ONLY_ENGINE_KEYS \} from '@\/lib\/enginePlanGate'/.test(sc))
checa('a expressão que o guardião aposentado (test-motor-so-no-studio) exige continua na fonte', /STUDIO_ONLY_ENGINE_KEYS\.has\(e\.key\)/.test(sc))

// ── 3. /generate — seletor ─────────────────────────────────────────────────────────────────────────────────
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
const veoGen = gc.split('\n').find((l) => /\{ key: 'veo', label: 'Veo 3.1'/.test(l)) ?? ''
checa('seletor do /generate: Veo existe', veoGen.length > 0)
checa('seletor do /generate: sub = "Google · best motion · 1080p"', /sub: 'Google · best motion · 1080p'/.test(veoGen))
checa('seletor do /generate: custo do Veo vem de creditCostForDuration na duração escolhida', /cr: creditCostForDuration\('cinematic_veo', true, duration\)/.test(veoGen))

// ── 4. mega-menu (KineoLanding) ────────────────────────────────────────────────────────────────────────────
const kl = rd('app/KineoLanding.tsx')
const veoNav = kl.split('\n').find((l) => /<NavEngineItem [^\n]*engine=veo&/.test(l)) ?? ''
checa('mega-menu: item do Veo existe', veoNav.length > 0)
checa('mega-menu: chip do Veo deriva de enginePlanBadge("veo"), não de "STUDIO" digitado', /chip=\{enginePlanBadge\('veo'\) \? 'STUDIO' : undefined\}/.test(veoNav) && !/chip="STUDIO"/.test(veoNav))
// KINEO-MENU-VIDEO-LIMPO-2026-10-09 — re-ancorado: a frase do Veo virou "Google’s video model · 1080p" (fundador, "2 sim"); o 1080p segue.
checa('mega-menu: desc do Veo diz 1080p', /desc="Google’s video model · 1080p"/.test(veoNav))
checa('mega-menu importa enginePlanBadge de lib/enginePlanGate', /import \{ enginePlanBadge \} from '@\/lib\/enginePlanGate'/.test(kl))

// ── 5. nenhuma superfície pública fala de Veo e 720 na mesma linha de CÓDIGO (comentário não conta) ────────
const superficies = [
  'app/(dashboard)/studio/StudioClient.tsx',
  'app/(dashboard)/generate/GenerateClient.tsx',
  'app/KineoLanding.tsx',
  'components/NavEngineItem.tsx',
  'components/EngineCycleCard.tsx',
  'lib/growth/enginePageCatalog.ts',
  'lib/kineoFacts.ts',
  'lib/engineWall.ts',
  'lib/seo/enginePageLangs.ts',
  'app/models-pricing/page.tsx',
  'app/pricing/PricingClient.tsx',
  'app/ai-video-generator/[engine]/page.tsx',
  'app/ph/page.tsx',
  'app/llms.txt/route.ts',
]
for (const p of superficies) {
  let src
  try { src = rd(p) } catch { checa(`${p}: arquivo existe`, false); continue }
  const ruins = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l) && /veo/i.test(l) && /\b720p?\b/.test(l))
  checa(`${p}: nenhuma linha de código fala de Veo e 720 juntos${ruins.length ? ` (${ruins.length}: ${ruins[0].trim().slice(0, 90)}…)` : ''}`, ruins.length === 0)
}

// ── 6. dicionários: a desc nova tem tradução (es + hi), senão a interface cai no inglês ────────────────────
const es = rd('lib/ui/interfaceLabels.ts')
const hi = rd('lib/ui/interfaceHindi.ts')
checa('interfaceLabels (es) traduz a desc nova do card do Veo', /'Google’s flagship cinematic engine · 1080p': '[^']*1080p'/.test(es))
checa('interfaceLabels (es) traduz a desc nova do mega-menu', /'Google’s flagship engine · 1080p': '[^']*1080p'/.test(es))
checa('interfaceHindi traduz a desc nova do card do Veo', /'Google’s flagship cinematic engine · 1080p': '[^']*1080p'/.test(hi))
checa('interfaceHindi traduz a desc nova do mega-menu', /'Google’s flagship engine · 1080p': '[^']*1080p'/.test(hi))

// ── 7. preço lido da função da casa: o Veo a 35 s cabe no grant do Starter (por isso o selo mentia) ────────
{
  const src = rd('lib/credits/engineCost.ts').split('\n').filter((l) => !/^import /.test(l)).join('\n')
  const exp = {}
  try { vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText, { exports: exp, console, require: () => ({}) }) } catch (e) { exp.__erro = String(e) }
  const custo = (s) => (typeof exp.creditCostForDuration === 'function' ? exp.creditCostForDuration('cinematic_veo', true, s) : null)
  const c35 = custo(35)
  const starter = Number((rd('lib/checkoutPricing.ts').match(/export const TIER_CREDITS[\s\S]*?starter:\s*(\d+)/) ?? [])[1])
  checa(`Veo 35 s = ${c35} cr cabe no grant do Starter (${starter} cr) — lido de creditCostForDuration e TIER_CREDITS`, Number.isFinite(c35) && c35 > 0 && Number.isFinite(starter) && c35 <= starter)
  checa(`Veo 60 s = ${custo(60)} cr e 90 s = ${custo(90)} cr continuam os da casa (100 / 150)`, custo(60) === 100 && custo(90) === 150)
}

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — o Veo diz 1080p em todas as superfícies e o selo de plano segue lib/enginePlanGate.ts')
