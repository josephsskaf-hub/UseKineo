// KINEO-SEEDANCE-15S-2026-09-29 — guardião do filme de 15 s no Seedance 1.5 ("vai" nominal do fundador; E2a).
// O que ele prova, executando o código real (transpile, sem alias @/) ou lendo a linha INTEIRA da fonte:
//   1. o preço do 15 s sai da função que cobra (creditCostForDuration) e cabe no crédito do trial (ambos lidos do código);
//   2. checarDuracao: 15 s (ou < 35) fora do Seedance é recusa 'only_seedance_15s'; no Seedance, ok;
//   3. na rota do cinematic a recusa e a guarda de roteiro longo vêm ANTES do custo e do débito (mutante: mover depois = vermelho);
//   4. /api/compose e /api/compose/unlock aceitam 15 e o export limpo não reescala a narração do filme de 15 s;
//   5. o interruptor SEEDANCE_15S_PUBLIC nasce false (mutante: true = vermelho);
//   6. DEFAULT_DURATION do /generate não é 15 (o 15 fica fora de DURATION_OPTIONS).
// Cada bloco tem mutante em memória que PRECISA ficar vermelho — senão o guardião não guarda nada.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}
const linhas = (src) => src.split('\n').map((l) => l.trimEnd())
const idx = (src, linha) => linhas(src).indexOf(linha)

const DUR_SRC = rd('lib/durationByEngine.ts')
const COST_SRC = rd('lib/credits/engineCost.ts')
const TRIAL_SRC = rd('lib/reverseTrial.ts')
const LAUNCH_SRC = rd('lib/engineLaunch.ts')
const ROTA = rd('app/api/generate-video-cinematic/route.ts')
const COMPOSE = rd('app/api/compose/route.ts')
const UNLOCK = rd('app/api/compose/unlock/route.ts')
const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
const STUDIO = rd('app/(dashboard)/studio/StudioClient.tsx')
const ME = rd('app/api/me/credits/route.ts')

const D = roda(DUR_SRC)
const E = roda(COST_SRC)

console.log('1) preço do 15 s e crédito do trial (lidos do código)')
const custo15 = E.creditCostForDuration('cinematic_ai', true, D.SEEDANCE_SHORT_SECONDS)
const base60 = E.creditCostFor('cinematic_ai', true)
const cap = Number(/export const TRIAL_CREDIT_CAP = (\d+)/.exec(TRIAL_SRC)?.[1])
checa('TRIAL_GRANT_CREDITS é o próprio teto (derivado, não segundo literal)', TRIAL_SRC.includes('export const TRIAL_GRANT_CREDITS = TRIAL_CREDIT_CAP'))
checa(`15 s = ceil(base de 60 s × 15/60) pela função que cobra (base ${base60} → ${custo15})`, custo15 === Math.max(1, Math.ceil(base60 * (15 / 60))))
checa(`o filme de 15 s custa 7 cr (o número do canário) — lido: ${custo15}`, custo15 === 7)
checa(`15 s cabe no crédito do trial (${custo15} ≤ ${cap})`, Number.isFinite(cap) && cap > 0 && custo15 <= cap)
checa('35 s continua NÃO cabendo no trial (o motivo do 15 s existir)', E.creditCostForDuration('cinematic_ai', true, 35) > cap)

console.log('2) checarDuracao / supportedDurationsFor')
function provaDuracao(M) {
  const r = []
  for (const eng of ['hollywood', 'h3', 's25', 'omni', 'kling', 'veo', 'sora']) {
    const c = M.checarDuracao(eng, 15)
    r.push(c.ok === false && c.recusa === 'only_seedance_15s' && c.sugestao === 35)
    r.push(M.checarDuracao(eng, 35).ok === true)
  }
  r.push(M.checarDuracao('hollywood', 30).ok === false) // qualquer alvo < 35 fora do Seedance
  for (const eng of ['seedance', 'cinematic_ai', null, undefined]) r.push(M.checarDuracao(eng, 15).ok === true)
  r.push(JSON.stringify([...M.supportedDurationsFor('seedance')]) === '[15,35,60,90]')
  r.push(JSON.stringify([...M.supportedDurationsFor('kling')]) === '[35,60,90]')
  r.push(JSON.stringify([...M.supportedDurationsFor('hollywood')]) === '[35,60,90]')
  return r.every(Boolean)
}
checa('15 s fora do Seedance recusa (hollywood/h3/s25/omni/kling/veo/sora); no Seedance aceita', provaDuracao(D))
const mutIdentidade = DUR_SRC.replace(/export function checarDuracao\(([^)]*)\): ChecagemDeDuracao \{/, 'export function checarDuracao($1): ChecagemDeDuracao {\n  return { ok: true }')
checa('mutante: checarDuracao que sempre aprova fica VERMELHO', mutIdentidade !== DUR_SRC && !provaDuracao(roda(mutIdentidade)))
const mutSeedanceTodos = DUR_SRC.replace("if (k === '' || k === 'seedance' || k === 'cinematic_ai') return true", 'return true')
checa('mutante: "todo motor é Seedance" fica VERMELHO', mutSeedanceTodos !== DUR_SRC && !provaDuracao(roda(mutSeedanceTodos)))

console.log('3) guarda de roteiro longo pedido como 15 s (B4)')
const palavras = (n) => Array.from({ length: n }, (_, i) => 'w' + i).join(' ')
function provaFala(M) {
  const s = (words, extra = {}) => M.checarFalaDoFilmeCurto({ engine: 'seedance', seconds: 15, verbatim: true, narration: palavras(words), ...extra })
  return [
    s(45).ok === true,
    s(56).ok === true, // 22,4 s ≤ 22,5 s (teto do roteirista para 15 s)
    s(57).ok === false && s(57).recusa === 'script_too_long_for_short_film' && s(57).sugestao === 35,
    s(150).ok === false,
    s(150, { verbatim: false }).ok === true, // modo IA: o roteirista escreve no tamanho
    s(150, { seconds: 35 }).ok === true,
  ].every(Boolean)
}
checa('Seedance 15 s verbatim: 45/56 palavras passam; 57/150 recusam sugerindo 35 s', provaFala(D))
const mutSemGuarda = DUR_SRC.replace('if (estSeconds > limitSeconds) {', 'if (false) {')
checa('mutante: guarda de fala desligada fica VERMELHO', mutSemGuarda !== DUR_SRC && !provaFala(roda(mutSemGuarda)))
checa('a régua da guarda é a MESMA do #442 da rota (2,5 pal/s)', D.VERBATIM_EST_WORDS_PER_SECOND === Number(/const WORDS_PER_SECOND = ([\d.]+) \/\/ ~ElevenLabs at speed 1\.05 \(conservative\)/.exec(ROTA)?.[1]))

console.log('4) ordem na rota do cinematic: recusa ANTES do custo e do débito')
const L_DUR = "      const checagemDuracao = checarDuracao(typeof body.engine === 'string' ? body.engine : null, duration)"
const L_FALA = "      const falaCurta = checarFalaDoFilmeCurto({ engine: typeof body.engine === 'string' ? body.engine : null, seconds: duration, verbatim, narration: parsedScript.narration })"
const L_HOLLY = '    const hollywoodPath = wantsHollywood || wantsH3 || wantsOmni || wantsS25'
const L_VERB = '    const verbatim = (parsedScript.hasMarkers && parsedScript.segments.length > 0) || (userSaysVerbatim && !briefDetected)'
const L_COST = '    const cost = creditCostForDuration(costQuality, true, duration)'
const L_CLAIM = '    activeBirthClaim = {'
const L_DEBIT = '    const upfrontDebit = await ensureCinematicDebit(cost)'
function provaOrdem(src) {
  const i = { dur: idx(src, L_DUR), fala: idx(src, L_FALA), holly: idx(src, L_HOLLY), verb: idx(src, L_VERB), cost: idx(src, L_COST), claim: idx(src, L_CLAIM), debit: idx(src, L_DEBIT) }
  const L = linhas(src)
  const bloco = (k) => L.slice(i[k], i[k] + 6).join('\n')
  return Object.values(i).every((v) => v >= 0) &&
    i.holly < i.dur && i.dur < i.cost && i.verb < i.fala && i.fala < i.cost && i.cost < i.claim && i.claim < i.debit &&
    /if \(!checagemDuracao\.ok\) \{[\s\S]*\{ status: 422 \}/.test(bloco('dur')) && /charged: false/.test(bloco('dur')) &&
    /if \(!falaCurta\.ok\) \{[\s\S]*\{ status: 422 \}/.test(bloco('fala'))
}
checa('recusa de 15 s fora do Seedance e guarda de roteiro longo: depois do hollywoodPath/verbatim, antes do custo, do claim e do débito', provaOrdem(ROTA))
const mover = (src, linha) => { const L = linhas(src); const a = L.indexOf(linha); if (a < 0) return src; L.splice(a, 1); const d = L.indexOf(L_DEBIT); L.splice(d + 1, 0, linha); return L.join('\n') }
checa('mutante: recusa de duração movida para depois do débito fica VERMELHO', !provaOrdem(mover(ROTA, L_DUR)))
checa('mutante: guarda de roteiro longo movida para depois do débito fica VERMELHO', !provaOrdem(mover(ROTA, L_FALA)))
checa('a recusa usa a mensagem honesta do módulo (sem subir para 35 em silêncio)', ROTA.includes('return NextResponse.json({ error: ONLY_SEEDANCE_15S_MESSAGE, reason: checagemDuracao.recusa,') && D.ONLY_SEEDANCE_15S_MESSAGE.startsWith('15-second films are available on Seedance 1.5; pick 35 s for this engine'))
checa('nenhuma troca silenciosa de duração pelo módulo na rota (duration = …checarDuracao)', !/duration = [^\n]*checarDuracao/.test(ROTA))
checa('B10: a recusa por saldo oferece 15 s só no Seedance e só com o interruptor', ROTA.includes("      const duracoesDoResgate: readonly number[] = motorPedido === 'seedance' && seedance15sVisible(user.email)") && ROTA.includes('            duracoes: duracoesDoResgate,') && ROTA.includes('      const DURACOES_DO_SELETOR = [35, 60, 90] as const'))

console.log('5) compose e export limpo aceitam 15')
const lista = (src) => JSON.parse(/\nconst SUPPORTED_DURATIONS = (\[[^\]]*\]) as const\n/.exec(src)?.[1] ?? 'null')
checa('/api/compose SUPPORTED_DURATIONS tem 15 (B7: sem ele o resgate montava a 45 s)', (lista(COMPOSE) ?? []).includes(15))
checa('/api/compose/unlock SUPPORTED_DURATIONS tem 15 (B6)', (lista(UNLOCK) ?? []).includes(15))
checa('/api/compose: piso de saldo do cinematic_ai escala pela duração', COMPOSE.includes("        const requiredCredits = creditCostForDuration('cinematic_ai', true, duration)"))
checa('export limpo: filme de 15 s não reescala a narração', UNLOCK.includes('    if (explicitSpeed != null || duration === 15) {'))
checa('/generate: ingrediente do export limpo guarda o 15', GEN.includes('requestedDuration === 15 || requestedDuration === 45 || requestedDuration === 60 || requestedDuration === 90 ? requestedDuration : 35'))

console.log('6) interruptor e botão')
const stubInterno = (interno) => ({ '@/lib/internalAccounts': { isInternalEmail: () => interno } })
const provaInterruptor = (src) => {
  const pub = roda(src, stubInterno(false))
  const casa = roda(src, stubInterno(true))
  return pub.SEEDANCE_15S_PUBLIC === false && pub.seedance15sVisible('qualquer@exemplo.com') === false && casa.seedance15sVisible('casa@exemplo.com') === true
}
checa('SEEDANCE_15S_PUBLIC nasce false: público não vê o botão; a casa vê', provaInterruptor(LAUNCH_SRC))
const mutLigado = LAUNCH_SRC.replace('export const SEEDANCE_15S_PUBLIC = false', 'export const SEEDANCE_15S_PUBLIC = true')
checa('mutante: interruptor ligado fica VERMELHO', mutLigado !== LAUNCH_SRC && !provaInterruptor(mutLigado))
checa('/api/me/credits devolve a flag seedance15 pelo interruptor', ME.includes('seedance15: seedance15sVisible(user.email)'))
checa('Studio: botão de 15 s só com Seedance escolhido e com o interruptor', STUDIO.includes("              {engine === 'seedance' && (seedance15Ok || duration === SEEDANCE_SHORT_SECONDS) && ("))
checa('Studio: trocar de motor estando em 15 volta para 35', STUDIO.includes("    if (engine !== 'seedance' && duration === SEEDANCE_SHORT_SECONDS) setDuration(MIN_DURATION_ALL_ENGINES as 35)"))
checa('Studio: ?duration=15 só com ?engine=seedance', STUDIO.includes("    } else if (requestedDuration === SEEDANCE_SHORT_SECONDS && e === 'seedance') {"))
checa('Studio: aviso do Kineo 1 mostra o custo do Seedance na duração (não 25 fixo)', STUDIO.includes("kineo1FitNoticeCopy(engineCostLabel('seedance'))"))
checa('/generate: cinto do auto-disparo aceita 15 só com engine=seedance', GEN.includes("(uDur === SEEDANCE_SHORT_SECONDS && uEng === 'seedance')"))
checa('/generate: ajuste automático em verbatim só sobe se o saldo pagar (B3)', GEN.includes('          const cabeNoSaldo = !cabe || credits === null || costForDurationOption(cabe) <= credits') && GEN.includes('          if (cabe && cabeNoSaldo) {'))

console.log('7) DEFAULT_DURATION do /generate não é 15')
const opcoes = /const DURATION_OPTIONS: \{ value: Duration; label: string \}\[\] = \[([\s\S]*?)\n\]/.exec(GEN)?.[1] ?? ''
const valores = [...opcoes.matchAll(/value: (\d+)/g)].map((m) => Number(m[1]))
checa(`DURATION_OPTIONS continua 35/60/90 (lido: ${JSON.stringify(valores)})`, JSON.stringify(valores) === '[35,60,90]')
checa('DEFAULT_DURATION = primeiro botão da lista global, que não é 15', GEN.includes('const DEFAULT_DURATION: Duration = DURATION_OPTIONS[0].value') && valores[0] !== 15)
checa('o 15 entra só pela opção do Seedance (derivada do módulo, nada digitado)', GEN.includes('const SEEDANCE_SHORT_OPTION: { value: Duration; label: string } = { value: SEEDANCE_SHORT_SECONDS as Duration,'))
checa('Studio: padrão continua 60 s', STUDIO.includes('  const [duration, setDuration] = useState<15 | 35 | 60 | 90>(60)'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) process.exit(1)
