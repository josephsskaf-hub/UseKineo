// KINEO-IDEIA-POUSA-NO-STUDIO-2026-10-03 — guardião: a ideia digitada antes do cadastro sobrevive ao login e pousa
// PREENCHIDA no Studio (/studio), a um clique de gerar, sem auto-start.
//
// Medido em produção (30 dias, países de PAISES_FILME_GRATIS): 134/135 pessoas com ideia chegaram à tela de criar com
// ela na URL — a ideia não se perdia; ela pousava no /studio/create (casa de máquinas) e em 60/135 o auto-start de
// ativação gerou o filme sozinho. A régua (lib/growth/ideiaPousaNoStudio.ts) troca o destino nas SAÍDAS de auth.
//
// Prova: (1) a régua EXECUTADA — ideia na casa de máquinas → /studio com a ideia e as escolhas, sem create_intent/
// autoanalyze/studio; (2) o que não pode mudar não muda (sem ideia, checkout, retomada, first_win, interruptor off);
// (3) as quatro saídas usam a régua (callback OAuth+e-mail, cadastro auto-confirmado, login por senha) e a tela de
// cadastro continua calculando o destino antigo (provas de trabalho salvo); (4) o Studio recebe a conversão do Ads e o
// catch-all de origem que moravam no GenerateClient; (5) o StudioClient já lê ?prompt= para a caixa; (6) mutantes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const SRC = read('lib/growth/ideiaPousaNoStudio.ts')
const IDEA = 'The lost city under Lake Titicaca & why divers keep finding stairs'

// O destino que a tela de cadastro monta hoje para uma página SEO com create_intent=fast (activationRedirectFromSearch).
const seoDest = '/studio/create?' + new URLSearchParams({ welcome: '1', prompt: IDEA, create_intent: 'fast', intent_campaign: 'seo_engine_kineo-1', utm_source: 'seo' }).toString()
// O destino do clique em Gerar do Studio deslogado (router.push) que volta pelo /signup?redirect=.
const studioClickDest = '/studio/create?' + new URLSearchParams({ engine: 'seedance', prompt: IDEA, duration: '35', script_mode: 'ai', autoanalyze: '1', studio: '1', intent_campaign: 'studio_v4', aspect: '16:9', language: 'pt' }).toString()

function problems(M) {
  const p = []
  const q = (s) => new URL(s, 'https://x.local')
  // (1) a régua executada
  const a = M.destinoDaIdeia(seoDest + '&signup=1')
  const au = q(a)
  if (au.pathname !== '/studio') p.push(`ideia da página SEO não pousou no /studio (foi ${au.pathname})`)
  if (au.searchParams.get('prompt') !== IDEA) p.push('a ideia não chegou inteira (o & tem que sobreviver)')
  for (const k of ['create_intent', 'autoanalyze', 'studio']) if (au.searchParams.has(k)) p.push(`gatilho de auto-start atravessou: ${k}`)
  for (const k of ['signup', 'welcome', 'intent_campaign', 'utm_source']) if (!au.searchParams.has(k)) p.push(`perdeu ${k} (conversão/atribuição)`)
  const b = q(M.destinoDaIdeia(studioClickDest))
  if (b.pathname !== '/studio') p.push('clique do Studio deslogado não voltou ao Studio')
  for (const [k, v] of [['engine', 'seedance'], ['duration', '35'], ['script_mode', 'ai'], ['aspect', '16:9'], ['language', 'pt'], ['prompt', IDEA]]) if (b.searchParams.get(k) !== v) p.push(`escolha visível perdida: ${k}`)
  if (b.searchParams.has('autoanalyze') || b.searchParams.has('studio')) p.push('autoanalyze/studio atravessou do clique do Studio')
  if (q(M.destinoDaIdeia('/generate?prompt=' + encodeURIComponent('  ' + IDEA + '  '))).searchParams.get('prompt') !== IDEA) p.push('/generate (porteiro) com ideia não pousou aparada no Studio')
  if (M.destinoDaIdeia('/studio/create?prompt=x&foo=bar&evil=1').includes('foo=')) p.push('chave desconhecida atravessou')
  // (2) o que não muda
  const same = [
    '/studio/create?welcome=1', // sem ideia
    '/studio/create?welcome=1&prompt=%20%20', // ideia vazia
    '/', '/studio?prompt=x', '/pricing?prompt=x', '/go/abc123', '/affiliate',
    '/api/stripe/checkout?plan=creator&prompt=x',
    '/studio/create?prompt=x&generationId=123', '/studio/create?prompt=x&resume=1', '/studio/create?prompt=x&return=1',
    '/studio/create?prompt=x&session_id=cs_1', '/studio/create?prompt=x&wm_unlock=1', '/studio/create?prompt=x&avatar=1',
    '/studio/create?prompt=x&viral_topic=t1',
    '/studio/create?prompt=x&utm_source=checkout_success&utm_medium=first_win&create_intent=trial_best',
    '//evil.example/studio/create?prompt=x', 'https://evil.example/studio/create?prompt=x',
  ]
  for (const s of same) if (M.destinoDaIdeia(s) !== s) p.push(`destino que não podia mudar mudou: ${s}`)
  if (M.destinoDaIdeia(seoDest, false) !== seoDest) p.push('interruptor desligado não devolve o destino antigo byte a byte')
  if (M.IDEIA_POUSA_NO_STUDIO !== true) p.push('interruptor IDEIA_POUSA_NO_STUDIO desligado')
  if (!M.ideiaFoiParaOStudio(seoDest, M.destinoDaIdeia(seoDest)) || M.ideiaFoiParaOStudio('/', '/')) p.push('telemetria idea_to_studio errada')
  // trecho da ideia (o lembrete usa)
  if (M.trechoDaIdeia(seoDest) !== IDEA) p.push('trechoDaIdeia não devolve a ideia')
  if (M.trechoDaIdeia('/studio/create?prompt=' + encodeURIComponent('a\n\n  b'.padEnd(400, 'x'))).length > M.IDEIA_TRECHO_MAX) p.push('trechoDaIdeia passou do teto')
  if (M.trechoDaIdeia('/studio/create?welcome=1') !== null || M.trechoDaIdeia(null) !== null) p.push('trechoDaIdeia inventou ideia')
  return p
}

console.log('1-2 · a régua executada (e o que não muda)')
const M = load(SRC)
const real = problems(M)
ok(real.length === 0, 'régua real: ' + (real.join(' | ') || 'limpa'))

console.log('3 · as saídas de autenticação usam a régua')
const CB = read('app/auth/callback/route.ts')
ok(/import \{[^}]*destinoDaIdeia[^}]*\} from '@\/lib\/growth\/ideiaPousaNoStudio'/.test(CB), 'callback importa a régua')
ok(/if \(!isCheckoutNext\) destinationPath = destinoDaIdeia\(destinationPath\)/.test(CB), 'callback (Google/Apple e confirmação de e-mail) passa o destino não-checkout pela régua')
ok(CB.indexOf('destinoDaIdeia(destinationPath)') < CB.indexOf('const destinationUrl = new URL(destinationPath, origin)'), 'a régua roda ANTES do evento e do redirect (destination_path diz a verdade)')
ok(CB.indexOf('destinoDaIdeia(destinationPath)') < CB.indexOf('const dest = `${origin}${destinationPath}`'), 'o redirect usa o destino já trocado')
ok(/idea_to_studio: ideiaFoiParaOStudio\(destinoAntesDaIdeia, destinationPath\)/.test(CB), 'auth_callback_completed grava idea_to_studio')
const SU = read('app/(auth)/signup/page.tsx')
ok(/window\.location\.assign\(destinoDaIdeia\(nextDestination\)\)/.test(SU), 'cadastro com confirmação automática sai pela régua')
ok(/if \(prompt\) return `\/studio\/create\?\$\{activationParams\.toString\(\)\}`/.test(SU), 'a tela de cadastro segue calculando o destino antigo (provas de trabalho salvo / recuperação de senha)')
ok(!/redirectTo=\{destinoDaIdeia/.test(SU), 'o OAuth leva o destino antigo; quem troca é o callback (uma régua, um lugar)')
const LO = read('app/(auth)/login/page.tsx')
ok(/window\.location\.assign\(destinoDaIdeia\(destination\)\)/.test(LO), 'login por senha sai pela régua')

console.log('4 · o Studio recebe o que a casa de máquinas fazia na chegada do cadastro')
const SP = read('app/(dashboard)/studio/page.tsx')
ok(/<StudioIdeaArrival \/>/.test(SP) && /import StudioIdeaArrival from '@\/components\/StudioIdeaArrival'/.test(SP), '/studio monta StudioIdeaArrival')
const AR = read('components/StudioIdeaArrival.tsx')
ok(/<SignupConversionTracker \/>/.test(AR), 'conversão de cadastro do Ads/TikTok (?signup=1) dispara no Studio')
ok(/trackSignupSource\(\)/.test(AR), 'catch-all de origem (signup_country/utm) roda na chegada do cadastro')
ok(/trackEvent\('studio_idea_arrived_v1'/.test(AR) && /has_prompt: prompt\.length > 0/.test(AR), 'prova por evento: studio_idea_arrived_v1 com has_prompt')
ok(!/fetch\(|router\.push|autoanalyze|generate/i.test(AR.replace(/^\/\/.*$/gm, '').replace(/trackEvent|trackSignupSource|SignupConversionTracker|studio_idea_arrived_v1/g, '')), 'a chegada não analisa, não navega, não gera')

console.log('5 · o StudioClient já põe ?prompt= na caixa (contrato que a régua usa)')
const SC = read('app/(dashboard)/studio/StudioClient.tsx')
ok(/const p = sp\.get\('prompt'\)\s*\n\s*if \(p\) setPrompt\(p\)/.test(SC), 'StudioClient lê ?prompt= para a caixa')
ok(/router\.push\(`\/studio\/create\?\$\{q\.toString\(\)\}`\)/.test(SC), 'o clique em Gerar do Studio continua indo para a casa de máquinas (o consentimento)')

console.log('6 · mutantes (cada um tem que ser pego)')
const mut = (name, from, to) => {
  if (!SRC.includes(from)) { ok(false, `mutante "${name}" não aplicou`); return }
  let caught
  try { caught = problems(load(SRC.replace(from, to))).length > 0 } catch { caught = true }
  ok(caught, `mutante pego: ${name}`)
}
mut('create_intent atravessa', `'prompt', 'engine',`, `'prompt', 'create_intent', 'engine',`)
mut('checkout first_win vira Studio', `if (p.get('utm_source') === 'checkout_success' && p.get('utm_medium') === 'first_win') return path`, '')
mut('retomada de render vira Studio', `'generationId', 'resume',`, `'resume',`)
mut('sem ideia também vira Studio', `if (!(p.get('prompt') ?? '').trim()) return path`, '')
mut('interruptor ignorado', `if (!ligado || typeof path`, `if (typeof path`)
mut('signup some (conversão do Ads)', `'welcome', 'signup',`, `'welcome',`)
mut('qualquer chave atravessa', `if (!ATRAVESSAM.includes(k) || destino.has(k)) continue`, `if (destino.has(k)) continue`)
{
  // As duas travas de origem são redundantes de propósito (cinto e suspensório): o mutante tira as DUAS.
  const m = SRC.replace(`if (url.origin !== BASE) return path`, '').replace(` || path.startsWith('//')`, '')
  let caught
  try { caught = problems(load(m)).length > 0 } catch { caught = true }
  ok(m !== SRC && caught, 'mutante pego: rota externa (//host) aceita')
}

console.log(`\n${pass} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
