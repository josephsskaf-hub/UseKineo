// KINEO-STUDIO-FANTASMA-1510 — guardião dos 4 defeitos da tela do Studio (/studio/create) achados seguindo 4 contas-agente
// (docs/ROBOS-DE-REVIEW-E-DIRETORIOS-2026-10-15.md):
//   1. FILME FANTASMA — ?autoanalyze=1 ficava na URL; recarregar/voltar reanalisava sem clique (Tab, vmail.dev).
//   2. TRAVA DE SALDO FURADA — esperava 1,5 s o saldo e seguia SEM a guarda (Tab: 1 cr, filme a 9).
//   3. "VIDEO GENERATION FAILED" FALSO — erro do navegador com o filme ainda no forno do servidor (bu.app: 2 × "falhou",
//      2 filmes entregues 11 min depois).
//   4. DOWNLOAD — o botão ficava abaixo do player de 78vh (Tab e AgentMail foram ao /history).
// Executa a regra pura (lib/growth/studioFantasma.ts, transpilada com o typescript do projeto) e lê a fiação no GenerateClient
// (readFileSync: o alias @/ não roda aqui). Confere que o servidor continua barrando filme pago sem saldo (402 antes do débito).
// Mutantes no fim: cada um precisa ficar vermelho.
import fs from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os' // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — virtual historical diff only; source files are never rewritten.
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { desfazStudioFantasma1510 } from './test-support/desfaz-studio-fantasma-1510.mjs'
import { semFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]: o GenerateClient ganhou só linhas marcadas (link trocado depois da resposta)
import { semRoteiroCurto2210 } from './test-support/desfaz-roteiro-curto-2210.mjs' // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — reverse this exact delta only for the historical byte comparison; keep feature and mutant checks intact.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const mut = (src, de, para) => { if (!src.includes(de)) throw new Error('mutante não aplicou: ' + de.slice(0, 90)); return src.replace(de, para) }

const LIB_REL = 'lib/growth/studioFantasma.ts'
const GEN_REL = 'app/(dashboard)/generate/GenerateClient.tsx'
const LIB = read(LIB_REL)
const GEN = read(GEN_REL)
const CINE = read('app/api/generate-video-cinematic/route.ts')

function loadPuro(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

// ── A regra pura ─────────────────────────────────────────────────────────────────────────────────────────────────────
function checksPuro(src) {
  const f = []
  const c = (cond, nome) => { if (!cond) f.push(nome) }
  let L
  try { L = loadPuro(src) } catch (e) { return ['lib não carrega: ' + e.message] }
  c(/^import /m.test(src) === false, 'lib pura sem import')
  // (1) chave da aba: estável, sem o texto, distingue textos
  const k1 = L.autoanalyzeSessionKey('The ocean holds salt')
  c(k1 === L.autoanalyzeSessionKey('  The ocean holds salt  '), '(1) chave ignora espaços nas pontas (a mesma trim do efeito)')
  c(k1 !== L.autoanalyzeSessionKey('The ocean holds sand'), '(1) textos diferentes → chaves diferentes')
  c(!k1.includes('ocean') && k1.startsWith(L.AUTOANALYZE_SESSION_PREFIX + ':'), '(1) o texto não vai para o storage (só hash + tamanho)')
  // (1) a marca da aba
  const agora = 1_800_000_000_000
  c(L.jaConsumidoNaAba({ marcaRaw: String(agora - 5000), studioGoRaw: null, agoraMs: agora }) === true, '(1) recarga 5 s depois: já consumido')
  c(L.jaConsumidoNaAba({ marcaRaw: null, studioGoRaw: null, agoraMs: agora }) === false, '(1) sem marca: não consumido')
  c(L.jaConsumidoNaAba({ marcaRaw: 'lixo', studioGoRaw: null, agoraMs: agora }) === false, '(1) marca ilegível não vale')
  c(L.jaConsumidoNaAba({ marcaRaw: String(agora - L.AUTOANALYZE_SESSION_TTL_MS - 1), studioGoRaw: null, agoraMs: agora }) === false, '(1) marca vencida não vale')
  c(L.jaConsumidoNaAba({ marcaRaw: String(agora - 60_000), studioGoRaw: JSON.stringify({ t: agora - 1000 }), agoraMs: agora }) === false, '(1) clique novo no /studio (token mais novo que a marca) vence a marca')
  c(L.jaConsumidoNaAba({ marcaRaw: String(agora - 60_000), studioGoRaw: JSON.stringify({ t: agora - 120_000 }), agoraMs: agora }) === true, '(1) token velho (o do clique original) não reabre')
  c(L.jaConsumidoNaAba({ marcaRaw: String(agora - 60_000), studioGoRaw: '{quebrado', agoraMs: agora }) === true, '(1) token ilegível não reabre')
  // (1) a URL
  const sem = L.enderecoSemAutoanalyze('https://www.usekineo.com/studio/create?engine=seedance&prompt=A%20B&duration=15&autoanalyze=1&studio=1#x')
  c(sem === '/studio/create?engine=seedance&prompt=A+B&duration=15&studio=1#x', '(1) só autoanalyze sai; prompt, motor, duração, studio e hash ficam')
  c(L.enderecoSemAutoanalyze('https://www.usekineo.com/studio/create?prompt=x') === null, '(1) sem o gatilho: nada a regravar')
  // (1+2) a decisão do efeito
  const base = { auto: true, prompt: 'roman empire', chaveDaMontagem: null, consumidoNaSessao: false, credits: 10, creditsLoading: false }
  c(L.decidirAutoanalyze({ ...base, auto: false }) === 'nada', '(1) sem autoanalyze=1: nada')
  c(L.decidirAutoanalyze({ ...base, prompt: '   ' }) === 'nada', '(1) sem texto: nada')
  c(L.decidirAutoanalyze({ ...base, chaveDaMontagem: 'roman empire' }) === 'ja_consumido', '(1) mesma montagem: já consumido')
  c(L.decidirAutoanalyze({ ...base, consumidoNaSessao: true }) === 'ja_consumido', '(1) recarga na mesma aba: já consumido')
  c(L.decidirAutoanalyze({ ...base, consumidoNaSessao: true, credits: null, creditsLoading: true }) === 'ja_consumido', '(1) a marca vence até a espera do saldo (recarga nunca reanalisa)')
  c(L.decidirAutoanalyze({ ...base, credits: null, creditsLoading: true }) === 'checando_saldo', '(2) saldo carregando: espera, não segue')
  c(L.decidirAutoanalyze({ ...base, credits: null, creditsLoading: false }) === 'saldo_falhou', '(2) leitura terminou sem saldo: pede de novo, não segue')
  c(L.decidirAutoanalyze({ ...base, credits: 1 }) === 'decidir', '(2) saldo lido (1): vai para a guarda de sempre')
  c(L.decidirAutoanalyze({ ...base, credits: 0 }) === 'decidir', '(2) saldo 0 lido também decide (a parede é da guarda)')
  // (3) ainda no forno
  const inicio = agora - 70_000
  c(L.decidirAindaNoForno({ probe: { state: 'rendering' }, inicioMs: inicio, pedidoKineo1Aberto: false }).emVoo === true, '(3) sonda diz rendering: em voo')
  c(L.decidirAindaNoForno({ probe: { state: 'completed', completedAtMs: inicio + 1 }, inicioMs: inicio, pedidoKineo1Aberto: false }).motivo === 'server_delivered', '(3) filme mais novo que o clique: entregue')
  c(L.decidirAindaNoForno({ probe: { state: 'completed', completedAtMs: inicio - 1 }, inicioMs: inicio, pedidoKineo1Aberto: false }).emVoo === false, '(3) filme ANTERIOR ao clique não conta')
  c(L.decidirAindaNoForno({ probe: null, inicioMs: inicio, pedidoKineo1Aberto: true }).motivo === 'kineo1_job_open', '(3) Kineo 1 com pedido gravado no servidor: o cron termina')
  c(L.decidirAindaNoForno({ probe: null, inicioMs: inicio, pedidoKineo1Aberto: false }).emVoo === false, '(3) nada no servidor: falha de verdade (tela de sempre)')
  c(L.filmeDoAvisoChegou({ state: 'completed', completedAtMs: inicio + 5 }, inicio) && !L.filmeDoAvisoChegou({ state: 'rendering' }, inicio), '(3) o aviso some quando o filme DESTE pedido chega')
  c(L.STILL_RENDERING_COPY === "Still rendering — this can take up to 15–20 min. We'll keep it in your Library.", '(3) a frase pedida, literal')
  c(L.CHECKING_CREDITS_COPY === 'Checking your credits…', '(2) a frase pedida, literal')
  c(L.STILL_RENDERING_POLL_MAX_MS >= 20 * 60 * 1000, '(3) a tela pergunta pelo menos os 20 min prometidos')
  return f
}

// ── A fiação no GenerateClient ───────────────────────────────────────────────────────────────────────────────────────
function efeitoAuto(G) {
  const i0 = G.indexOf("const auto = searchParams?.get('autoanalyze') === '1'")
  const i1 = G.indexOf('}, [searchParams, activeRenderRestoreResolved, credits, autoWaitTick, creditsLoading])', i0)
  return i0 > 0 && i1 > i0 ? G.slice(i0, i1) : ''
}
function corpoFuncao(G, assinatura) {
  const i0 = G.indexOf(assinatura)
  if (i0 < 0) return ''
  const i1 = G.indexOf('\n  }\n', i0)
  return i1 > i0 ? G.slice(i0, i1) : ''
}
function checksFonte(G, CINEMATIC) {
  const f = []
  const c = (cond, nome) => { if (!cond) f.push(nome) }
  const eff = efeitoAuto(G)
  c(eff.length > 0, 'efeito do autoanalyze achado (deps com creditsLoading)')
  const iAnalisa = eff.indexOf("handleAnalyze(sp, { fromTopic: true, skipPreview: true })")
  const iPasso = eff.indexOf('const passoAuto = decidirAutoanalyze({ auto, prompt: sp, chaveDaMontagem: autoAnalyzeKeyRef.current, consumidoNaSessao, credits, creditsLoading })')
  const iJa = eff.indexOf("if (passoAuto === 'ja_consumido') {")
  const iChec = eff.indexOf("if (passoAuto === 'checando_saldo') { setAutoanalyzeSaldo('checando_saldo'); return }")
  const iFalhou = eff.indexOf("if (passoAuto === 'saldo_falhou') {")
  const iGuarda = eff.indexOf('if (credits !== null && outOfCredits()) {')
  // (1)
  c(eff.includes("jaConsumidoNaAba({ marcaRaw: sessionStorage.getItem(autoanalyzeSessionKey(key)), studioGoRaw: sessionStorage.getItem('kineo:studio:go:v1'), agoraMs: Date.now() })"), '(1) o efeito lê a marca da aba e o token do clique do /studio')
  c(/try \{ consumidoNaSessao = jaConsumidoNaAba\([\s\S]*?\} catch \{/.test(eff), '(1) leitura do sessionStorage com try/catch')
  c(iPasso > 0 && iJa > iPasso && iAnalisa > iJa, '(1) "já consumido" é decidido ANTES de qualquer análise')
  c(/if \(passoAuto === 'ja_consumido'\) \{[^}]*consumirAutoanalyze\(key, false\)[\s\S]*?return\n\s+\} \/\/ KINEO-STUDIO-FANTASMA-1510/.test(eff), '(1) já consumido: tira o gatilho da URL e sai sem analisar')
  c((eff.match(/consumirAutoanalyze\(key\)/g) || []).length === 2, '(1) consumido UMA vez nos dois desfechos (parede e análise)')
  c(!/autoAnalyzeKeyRef\.current = key\n/.test(eff), '(1) nenhum desfecho marca só a chave da montagem (sem marca de aba e sem limpar a URL)')
  const iConsAnalise = eff.lastIndexOf('consumirAutoanalyze(key)')
  c(iConsAnalise > 0 && iConsAnalise < iAnalisa, '(1) a URL perde o gatilho ANTES do roteiro começar')
  const cons = corpoFuncao(G, '  function consumirAutoanalyze(key: string, marcar = true) {')
  c(cons.includes('autoAnalyzeKeyRef.current = key'), '(1) consumir marca a chave da montagem')
  c(cons.includes('if (marcar) { try { sessionStorage.setItem(autoanalyzeSessionKey(key), String(Date.now())) } catch {'), '(1) consumir grava a marca da aba (try/catch)')
  c(cons.includes("const semGatilho = enderecoSemAutoanalyze(window.location.href)") && cons.includes("window.history.replaceState(null, '', semGatilho)"), '(1) consumir tira o gatilho da URL com replaceState(null…) — o roteador adota a URL nova')
  c(!cons.includes('window.history.replaceState(window.history.state'), '(1) não usa o estado do Next (o roteador regravaria a URL velha)')
  c(G.includes('if (urlPrompt) { try { sessionStorage.setItem(autoanalyzeSessionKey(urlPrompt), String(Date.now())) } catch {'), '(1) a retomada de render por recarga marca o texto na aba')
  c((G.match(/limparMarcasAutoanalyze\(\) \/\/ KINEO-STUDIO-FANTASMA-1510/g) || []).length === 2, '(1) série e ideia da fila (cliques explícitos) reabrem o auto-start')
  // nenhum render pago sem clique: o efeito só ANALISA; o disparo do render continua preso ao token do clique (2 min, consumido na leitura)
  c(!/handleGenerate|handleGenerateGuarded/.test(eff), '(1) o efeito do autoanalyze nunca dispara render')
  c(G.includes("sessionStorage.removeItem('kineo:studio:go:v1')\n      const tok = JSON.parse(raw) as { t?: number }\n      if (!tok?.t || Date.now() - tok.t > 120_000)"), '(1) o one-click continua exigindo o token do clique (consumido na leitura, 2 min)')
  // (2)
  c(!eff.includes('setTimeout(() => setAutoWaitTick((t) => t + 1), 1500)') && !G.includes('autoWaitScheduledRef'), '(2) o "espera 1,5 s e segue" morreu')
  c(iChec > iPasso && iFalhou > iPasso && iGuarda > iFalhou && iAnalisa > iGuarda, '(2) checando/falhou saem ANTES da guarda e do roteiro')
  c(/if \(passoAuto === 'saldo_falhou'\) \{[\s\S]*?setAutoanalyzeSaldo\('saldo_falhou'\)[\s\S]*?return\n\s+\} \/\/ KINEO-STUDIO-FANTASMA-1510/.test(eff), '(2) leitura falhou: mostra e sai (não segue às cegas)')
  c(G.includes("{autoanalyzeSaldo === 'saldo_falhou' ? CREDITS_READ_FAILED_COPY : CHECKING_CREDITS_COPY}") && G.includes('data-testid="autoanalyze-credits-hold"'), '(2) a tela diz "Checking your credits…" / "tente de novo"')
  c(/onClick=\{\(\) => tentarLerSaldoDeNovo\(\)\}/.test(G) && corpoFuncao(G, '  function tentarLerSaldoDeNovo() {').includes("window.dispatchEvent(new Event('creditsChanged'))"), '(2) "Try again" relê /api/credits (creditsChanged)')
  c(/outOfCredits\(\)\) \{[\s\S]*?openOutOfCreditsModal\(\)\n\s+return\n\s+\}/.test(eff), '(2) a parede de sempre segue antes do roteiro')
  c(G.includes("    if (mode === 'fast') return false\n    if (credits === null) return false"), '(2) outOfCredits não foi redigitada')
  // o servidor: filme pago sem saldo é 402 ANTES de débito/submissão (a tela não é a única trava)
  c(/if \(balance < cost\) \{\n\s+const trialBuyer/.test(CINEMATIC) && CINEMATIC.indexOf('if (balance < cost) {\n      const trialBuyer') < CINEMATIC.indexOf('await submitToFal('), '(2) servidor: portão balance < cost antes de submeter à fal')
  // (3)
  const helper = corpoFuncao(G, '  async function aindaNoFornoAntesDeFalhar(')
  c(helper.includes('const probe = await refreshServerActiveRender()'), '(3) pergunta a /api/compose/active antes de falar')
  c(helper.includes('pedidoKineo1Aberto: (mode === \'fast\' || mode === \'creator\') && attemptId !== null && renderJobAbertoRef.current === attemptId'), '(3) Kineo 1: o pedido gravado no servidor DESTE clique conta')
  c(helper.includes('if (!decisao.emVoo) return false') && helper.includes("setPhase('idle')") && helper.includes('setAindaNoForno({ desde: inicioMs, motivo: decisao.motivo })'), '(3) em voo: aviso, sem tela de falha')
  c(!helper.includes('trackGenerationFailure') && !helper.includes("'generation_stage_error'"), '(3) em voo não grava generation_stage_error (a sonda leria como morte)')
  for (const [motivo, etapa] of [['fast_threw', 'generating'], ['cinematic_threw', 'generating'], ['compose_threw', 'clips_ready']]) {
    const i = G.indexOf(`if (await aindaNoFornoAntesDeFalhar('${etapa}', '${motivo}', err,`)
    const j = G.indexOf(`trackGenerationFailure('${etapa}', '${motivo}'`)
    const k = G.indexOf('setError(GENERIC_ERROR)', i)
    c(i > 0 && j > i && k > i && k < j, `(3) ${motivo}: pergunta ao servidor ANTES de "Video generation failed" e do evento de falha`)
  }
  c(G.includes('}).then((r) => { if (r.ok) renderJobAbertoRef.current = pedidoAttemptId })') && G.includes('renderJobAbertoRef.current = null // KINEO-STUDIO-FANTASMA-1510'), '(3) o pedido do Kineo 1 só conta com 200 do servidor, e só o deste clique')
  c(G.indexOf('geracaoInicioRef.current = Date.now() // KINEO-STUDIO-FANTASMA-1510') > 0 && G.indexOf('geracaoInicioRef.current = Date.now() // KINEO-STUDIO-FANTASMA-1510') < G.indexOf("trackEvent('generate_started', dispatchMetadata)"), '(3) o relógio do clique nasce no despacho')
  c(G.includes('{STILL_RENDERING_COPY}') && G.includes('data-testid="still-rendering-notice"') && G.includes('href="/library"'), '(3) o aviso mostra a frase e o caminho da Biblioteca')
  c(/if \(filmeDoAvisoChegou\([\s\S]*?setAindaNoForno\(null\)/.test(G) && G.includes('}, STILL_RENDERING_POLL_EVERY_MS)'), '(3) a tela segue perguntando e o aviso dá lugar ao "Your video is ready"')
  c(G.includes('hasBlockingUi: Boolean(error || showUpgradeModal || activeRenderGateBlocked || aindaNoForno)'), '(3) o aviso segura a tela (o redirecionamento ao /studio não o engole)')
  // (4)
  const iHead = G.indexOf('<div className="done-result-heading">')
  const iTop = G.indexOf('data-testid="done-download-top"', iHead)
  const iFrame = G.indexOf('className="gv-done-frame rounded-2xl overflow-hidden mt-6"', iHead)
  c(iHead > 0 && iTop > iHead && iFrame > iTop, '(4) "Download MP4" no cabeçalho da tela pronta, ANTES do player')
  const botao = iTop > 0 ? G.slice(G.lastIndexOf('<a\n', iTop), G.indexOf('</a>', iTop)) : ''
  c(botao.includes('href={finalVideoUrl}') && botao.includes('void handleDownload(e)') && botao.includes('download={'), '(4) mesmo arquivo e mesmo download do botão grande (lib/videoDownload, o do /history)')
  c(/Download MP4\n/.test(botao), '(4) rótulo em texto ("Download MP4"), não só ícone')
  c(G.indexOf('{analysis?.title?.trim() || \'Untitled Video\'}') > iTop, '(4) o título segue sendo o último <p> do cabeçalho (CSS :last-child)')
  return f
}

console.log('— regra pura')
const fPuro = checksPuro(LIB)
for (const n of fPuro) ok(false, n)
ok(fPuro.length === 0, `regra pura: ${fPuro.length} falha(s)`)
console.log('— fiação')
const fFonte = checksFonte(GEN, CINE)
for (const n of fFonte) ok(false, n)
ok(fFonte.length === 0, `fiação: ${fFonte.length} falha(s)`)

// ── O desfaz (para os guardiões byte a byte): tirado este conserto, o GenerateClient é a base exata ──────────────────
// Base = pai do 1º commit com a marca (depois de publicado, origin/main já contém o conserto); antes do commit, origin/main.
const BASE_REF = (() => {
  try {
    const shas = execFileSync('git', ['-C', ROOT, 'log', '--format=%H', '--grep=KINEO-STUDIO-FANTASMA-1510', 'HEAD'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)
    return shas.length ? shas[shas.length - 1] + '^' : 'origin/main'
  } catch { return 'origin/main' }
})()
console.log('— desfaz (base ' + BASE_REF + ')')
const NL = String.fromCharCode(10)
const semCR = (t) => t.split(String.fromCharCode(13)).join('')
const baseGen = semCR(execFileSync('git', ['-C', ROOT, 'show', BASE_REF + ':' + GEN_REL], { encoding: 'utf8', maxBuffer: 1 << 28 }))
ok(desfazStudioFantasma1510(GEN_REL, semFilmeRapido1710(semRoteiroCurto2210(GEN, GEN_REL), GEN_REL) /* KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 · reancorado KINEO-FILME-RAPIDO-1710 */) === baseGen, 'desfeito este conserto, o GenerateClient é a base byte a byte')
ok(desfazStudioFantasma1510('lib/x.ts', 'a KINEO-STUDIO-FANTASMA-1510') === 'a KINEO-STUDIO-FANTASMA-1510' && desfazStudioFantasma1510(GEN_REL, 'x' + NL + 'y') === 'x' + NL + 'y', 'o desfaz não toca outro arquivo nem arquivo sem a marca')
ok((() => { try { desfazStudioFantasma1510(GEN_REL, GEN.replace('data-testid="done-download-top"', 'data-testid="x"')); return false } catch { return true } })(), 'o desfaz recusa conserto pela metade')
// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — keep the original hunk assertion against the exact source with only our delta undone.
const diffHistorico2210 = (() => {
  const scratch = fs.mkdtempSync(path.join(tmpdir(), 'kineo-studio-fantasma-2210-'))
  const before = path.join(scratch, 'before.tsx')
  const after = path.join(scratch, 'after.tsx')
  try {
    fs.writeFileSync(before, baseGen, 'utf8')
    fs.writeFileSync(after, semRoteiroCurto2210(GEN, GEN_REL), 'utf8')
    try { return execFileSync('git', ['diff', '--no-index', '-U0', '--no-color', '--', before, after], { encoding: 'utf8', maxBuffer: 1 << 28 }) }
    catch (e) { if (e.status === 1 && typeof e.stdout === 'string') return e.stdout; throw e }
  } finally {
    fs.rmSync(before, { force: true })
    fs.rmSync(after, { force: true })
    fs.rmdirSync(scratch)
  }
})()
const hunks = semCR(diffHistorico2210).split(NL + '@@').slice(1) // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22
ok(hunks.length > 0 && hunks.every((h) => { const add = h.split(NL).filter((l) => l.startsWith('+') && !l.startsWith('+++')); return add.length === 0 || add.some((l) => l.includes('KINEO-STUDIO-FANTASMA-1510')) || add.every((l) => l.includes('KINEO-FILME-RAPIDO-1710')) || add.every((l) => l.includes('KINEO-FILME-RAPIDO-1710') || l.includes('KINEO-BEBE-QUE-FALA-2010')) /* reancorado KINEO-BEBE-QUE-FALA-2010: blocos do kids_cartoon (um deles colado no import da filme-rápido), todos marcados */ /* reancorado KINEO-FILME-RAPIDO-1710: blocos dela, todos marcados */ }), 'todo bloco novo no GenerateClient traz a marca KINEO-STUDIO-FANTASMA-1510')

// ── Mutantes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('— mutantes (cada um precisa ficar vermelho)')
const mutPuro = [
  ['marca da aba ignorada', (s) => mut(s, "  if (input.consumidoNaSessao) return 'ja_consumido'\n", '')],
  ['saldo nulo segue (o defeito de 1,5 s)', (s) => mut(s, "  if (input.credits === null) return input.creditsLoading ? 'checando_saldo' : 'saldo_falhou'\n", '')],
  ['falha de leitura vira espera eterna', (s) => mut(s, "input.creditsLoading ? 'checando_saldo' : 'saldo_falhou'", "'checando_saldo'")],
  ['URL perde o prompt junto', (s) => mut(s, '  url.searchParams.delete(AUTOANALYZE_PARAM)\n', "  url.searchParams.delete(AUTOANALYZE_PARAM)\n  url.searchParams.delete('prompt')\n")],
  ['clique novo do /studio bloqueado', (s) => mut(s, '  return !cliqueNovo\n', '  return true\n')],
  ['filme antigo conta como entregue', (s) => mut(s, '&& p.completedAtMs >= input.inicioMs) {', ') {')],
  ['Kineo 1 aberto ignorado', (s) => mut(s, "  if (input.pedidoKineo1Aberto) return { emVoo: true, motivo: 'kineo1_job_open' }\n", '')],
]
for (const [nome, fn] of mutPuro) ok(checksPuro(fn(LIB)).length > 0, 'mutante puro reprovado: ' + nome)
const mutFonte = [
  ['volta o "espera 1,5 s"', (s) => mut(s, "if (passoAuto === 'checando_saldo') { setAutoanalyzeSaldo('checando_saldo'); return }", "if (passoAuto === 'checando_saldo') { setTimeout(() => setAutoWaitTick((t) => t + 1), 1500) }")],
  ['análise só marca a chave (gatilho fica na URL)', (s) => mut(s, "    consumirAutoanalyze(key) // KINEO-STUDIO-FANTASMA-1510 (era: autoAnalyzeKeyRef.current = key) — consumido UMA vez: chave, marca da aba e URL\n    if (process.env", '    autoAnalyzeKeyRef.current = key\n    if (process.env')],
  ['replaceState com o estado do Next', (s) => mut(s, "window.history.replaceState(null, '', semGatilho)", "window.history.replaceState(window.history.state, '', semGatilho)")],
  ['marca da aba não lida', (s) => mut(s, 'const passoAuto = decidirAutoanalyze({ auto, prompt: sp, chaveDaMontagem: autoAnalyzeKeyRef.current, consumidoNaSessao, credits', 'const passoAuto = decidirAutoanalyze({ auto, prompt: sp, chaveDaMontagem: autoAnalyzeKeyRef.current, consumidoNaSessao: false, credits')],
  ['falha de saldo segue', (s) => mut(s, "      setAutoanalyzeSaldo('saldo_falhou')\n", "      setAutoanalyzeSaldo('saldo_falhou')\n      handleAnalyze(sp, { fromTopic: true, skipPreview: true })\n")],
  ['fast_threw falha sem perguntar', (s) => mut(s, "        if (await aindaNoFornoAntesDeFalhar('generating', 'fast_threw', err, Date.now() - fastBranchStartedAt)) return // KINEO-STUDIO-FANTASMA-1510 (3)\n", '')],
  ['compose_threw falha sem perguntar', (s) => mut(s, "        if (await aindaNoFornoAntesDeFalhar('clips_ready', 'compose_threw', err, null)) return // KINEO-STUDIO-FANTASMA-1510 (3)\n", '')],
  ['aviso grava generation_stage_error', (s) => mut(s, "    void trackEvent('generation_still_rendering_shown', {", "    trackGenerationFailure(etapa, motivo, {})\n    void trackEvent('generation_still_rendering_shown', {")],
  ['pedido do Kineo 1 conta sem 200', (s) => mut(s, '}).then((r) => { if (r.ok) renderJobAbertoRef.current = pedidoAttemptId })', '}).then(() => { renderJobAbertoRef.current = pedidoAttemptId })')],
  ['download volta só para baixo do player', (s) => mut(s, 'data-testid="done-download-top"', 'data-testid="done-download-top-x"')],
  ['download sem texto', (s) => mut(s, '<span aria-hidden="true">⬇</span> Download MP4\n', '<span aria-hidden="true">⬇</span>\n')],
]
for (const [nome, fn] of mutFonte) ok(checksFonte(fn(GEN), CINE).length > 0, 'mutante da fiação reprovado: ' + nome)

console.log(`test-studio-fantasma-1510: ${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
