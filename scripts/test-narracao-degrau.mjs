#!/usr/bin/env node
// ═══ KINEO-DEGRAU-2026-09-03 — o gate de narracao vira DEGRAU, nao porta ═════
//
// O caso: em 30 dias a trava de narracao (`narration_guard_blocked`) recusou
// 34 renders de ~30 pessoas; 24 deles tinham >=60% de cobertura ("faltam 2
// palavras"). Em 14 dias, 78 bloqueios de 32 pessoas, 16 delas sem NUNCA ter
// visto um video da Kineo. Agora o servidor desce o alvo para o multiplo de 5
// que a fala enche, ANTES do custo, e renderiza.
//
// Este teste prova tres coisas, nesta ordem:
//   1. a funcao pura `autofitDown` obedece a regra (dado REAL dos 34 casos);
//   2. a rota chama a funcao ANTES de `creditCostForDuration` (lendo o
//      route.ts de verdade — indice no texto, nao promessa);
//   3. ninguem afrouxou a regua por acidente (MIN_COVERAGE, WORDS_PER_SECOND).
//
// Rodar: node scripts/test-narracao-degrau.mjs   (sem rede, sem custo)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

function acharTsc(base) {
  const tentativas = []
  let dir = base
  for (let i = 0; i < 6; i++) {
    tentativas.push(join(dir, 'node_modules', 'typescript', 'bin', 'tsc'))
    const pai = dirname(dir)
    if (pai === dir) break
    dir = pai
  }
  for (const t of tentativas) if (existsSync(t)) return t
  console.error('Nao achei o typescript. Rode `npm install` na pasta do projeto.\nProcurei em:\n  ' + tentativas.join('\n  '))
  process.exit(1)
}
const TSC = acharTsc(raiz)

// narrationFit.ts e engineCost.ts nao importam nada: compilam sozinhos.
const saida = mkdtempSync(join(tmpdir(), 'kineo-degrau-'))
const requerer = createRequire(join(saida, 'x.cjs'))
mkdirSync(join(saida, 'src'), { recursive: true })
writeFileSync(join(saida, 'src', 'narrationFit.ts'), readFileSync(join(raiz, 'lib/narrationFit.ts'), 'utf8'))
writeFileSync(join(saida, 'src', 'engineCost.ts'), readFileSync(join(raiz, 'lib/credits/engineCost.ts'), 'utf8'))
try {
  execFileSync(process.execPath, [
    TSC,
    join(saida, 'src', 'narrationFit.ts'),
    join(saida, 'src', 'engineCost.ts'),
    '--outDir', join(saida, 'out'), '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--rootDir', join(saida, 'src'),
  ], { stdio: 'pipe' })
  writeFileSync(join(saida, 'out', 'package.json'), JSON.stringify({ type: 'commonjs' }))
} catch (e) {
  console.error('Nao consegui compilar:\n', e.stdout?.toString() || e.message)
  process.exit(1)
}
const N = requerer(join(saida, 'out', 'narrationFit.js'))
const C = requerer(join(saida, 'out', 'engineCost.js'))

let falhas = 0, total = 0
const checa = (nome, cond, det = '') => {
  total += 1
  if (!cond) { falhas += 1; console.error(`  x ${nome}${det ? ` — ${det}` : ''}`) }
}
const secao = (t) => console.log(`\n── ${t}`)

console.log('\nKINEO degrau de narracao — o gate desce o alvo em vez de recusar\n')

// Roteiro sintetico com N palavras faladas (a regua conta palavras, 2,3/s).
const roteiroDe = (palavras) => Array.from({ length: palavras }, (_, i) => (i % 7 === 0 ? 'extraordinary' : 'word')).join(' ')
const palavrasPara = (segundos) => Math.round(segundos * N.WORDS_PER_SECOND)

// ── 0. A regua nao foi afrouxada ──────────────────────────────────────────
secao('regua intacta')
checa('MIN_COVERAGE continua 0.95', N.MIN_COVERAGE === 0.95, `veio ${N.MIN_COVERAGE}`)
checa('WORDS_PER_SECOND continua 2.3', N.WORDS_PER_SECOND === 2.3, `veio ${N.WORDS_PER_SECOND}`)
checa('MIN_AUTOFIT_DOWN_COVERAGE = 0.60 (o degrau do dado)', N.MIN_AUTOFIT_DOWN_COVERAGE === 0.6, `veio ${N.MIN_AUTOFIT_DOWN_COVERAGE}`)
checa('AUTOFIT_DOWN_FLOOR_SECONDS = 20', N.AUTOFIT_DOWN_FLOOR_SECONDS === 20)
checa('AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD = 30 (clamp do planner)', N.AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD === 30)
checa('AUTOFIT_DOWN_STEP_SECONDS = 5', N.AUTOFIT_DOWN_STEP_SECONDS === 5)
checa('creditCostForDuration continua linear (35s < 60s < 90s)',
  C.creditCostForDuration('cinematic_ai', true, 35) < C.creditCostForDuration('cinematic_ai', true, 60) &&
  C.creditCostForDuration('cinematic_ai', true, 60) < C.creditCostForDuration('cinematic_ai', true, 90))
checa('DURATION_REFERENCE_SECONDS continua 60', C.DURATION_REFERENCE_SECONDS === 60)

// ── 1. O DADO REAL: 34 bloqueios de 30d por cobertura ─────────────────────
secao('dado real: os 24 casos >=60% descem, em cada botao do seletor')
const DESCEM = [0.94, 0.94, 0.93, 0.86, 0.86, 0.86, 0.85, 0.84, 0.84, 0.84, 0.84, 0.82, 0.80, 0.80, 0.78, 0.77, 0.76, 0.73, 0.71, 0.69, 0.67, 0.66, 0.63, 0.60]
const NAO_DESCEM = [0.57, 0.31, 0.12, 0.09, 0.09, 0.06, 0.05, 0.05, 0.05, 0.03]
checa('o dado tem 34 casos (24 + 10)', DESCEM.length + NAO_DESCEM.length === 34)

for (const alvo of [35, 60, 90]) {
  for (const cobertura of DESCEM) {
    // ceil para o caso ficar do lado certo do degrau (>=60%) apos arredondar palavras
    const palavras = Math.ceil(cobertura * alvo * N.WORDS_PER_SECOND)
    const roteiro = roteiroDe(palavras)
    const fit = N.narrationFit(roteiro, alvo)
    checa(`[${alvo}s @${cobertura}] o caso e mesmo um bloqueio de hoje (fit.ok=false, cobertura>=60%)`,
      !fit.ok && fit.coverage >= 0.6, `ok=${fit.ok} cobertura=${fit.coverage.toFixed(3)}`)
    const d = N.autofitDown(roteiro, alvo)
    const esperado = Math.floor(fit.speech / 5) * 5
    checa(`[${alvo}s @${cobertura}] desce`, d.applied && d.reason === 'applied', `reason=${d.reason}`)
    checa(`[${alvo}s @${cobertura}] alvo descido = floor(fala/5)*5 = ${esperado}`, d.effectiveSeconds === esperado, `veio ${d.effectiveSeconds}`)
    checa(`[${alvo}s @${cobertura}] alvo descido >= 20`, d.effectiveSeconds >= 20)
    checa(`[${alvo}s @${cobertura}] alvo descido < pedido`, d.effectiveSeconds < alvo)
    checa(`[${alvo}s @${cobertura}] a regua APROVA o alvo descido`, N.narrationFit(roteiro, d.effectiveSeconds).ok === true)
    checa(`[${alvo}s @${cobertura}] a fala fica ACIMA do novo alvo (nunca abaixo)`, fit.speech >= d.effectiveSeconds)
    checa(`[${alvo}s @${cobertura}] lost60sFloor so quando pediu >=60 e caiu <60`,
      d.lost60sFloor === (alvo >= 60 && d.effectiveSeconds < 60))
  }
}

secao('dado real: os 10 casos <60% NAO descem (recusa de hoje continua)')
for (const alvo of [35, 60, 90]) {
  for (const cobertura of NAO_DESCEM) {
    const palavras = Math.max(1, Math.floor(cobertura * alvo * N.WORDS_PER_SECOND))
    const roteiro = roteiroDe(palavras)
    const fit = N.narrationFit(roteiro, alvo)
    checa(`[${alvo}s @${cobertura}] cobertura medida < 60%`, fit.coverage < 0.6, `veio ${fit.coverage.toFixed(3)}`)
    const d = N.autofitDown(roteiro, alvo)
    checa(`[${alvo}s @${cobertura}] nao desce`, d.applied === false && d.reason === 'coverage_below_floor', `reason=${d.reason}`)
    checa(`[${alvo}s @${cobertura}] duracao efetiva = pedida`, d.effectiveSeconds === alvo)
  }
}

// ── 2. FLOOR e nao ROUND ──────────────────────────────────────────────────
secao('FLOOR, nunca ROUND')
{
  const r33 = roteiroDe(76) // 76/2.3 = 33.04s
  const f = N.narrationFit(r33, 35)
  checa('33s de fala em 35s = 94% (reprovado hoje)', !f.ok && f.speech > 33 && f.speech < 33.5, `fala=${f.speech.toFixed(2)}`)
  const d = N.autofitDown(r33, 35)
  checa('33s de fala -> alvo 30 (Math.round daria 35 e recriaria o defeito)', d.applied && d.effectiveSeconds === 30, `veio ${d.effectiveSeconds} reason=${d.reason}`)
  checa('33s em 30s passa na regua', N.narrationFit(r33, 30).ok)
  checa('33s em 35s (o que ROUND daria) NAO passa na regua', !N.narrationFit(r33, 35).ok)
  checa('o modulo nao usa Math.round na descida', !/Math\.round\([^)]*speech[^)]*\/\s*AUTOFIT_DOWN_STEP_SECONDS/.test(readFileSync(join(raiz, 'lib/narrationFit.ts'), 'utf8')))
}

// ── 3. Piso de 20 ─────────────────────────────────────────────────────────
secao('piso absoluto de 20s')
{
  const r21 = roteiroDe(49) // 21.3s
  const d21 = N.autofitDown(r21, 35)
  checa('21s de fala em 35s desce para 20', d21.applied && d21.effectiveSeconds === 20, `veio ${d21.effectiveSeconds} reason=${d21.reason}`)
  checa('21s em 20s passa na regua', N.narrationFit(r21, 20).ok)
  const r19 = roteiroDe(44) // 19.1s
  const d19 = N.autofitDown(r19, 35)
  checa('19s de fala em 35s NAO desce (54% de cobertura: barra na cobertura)', !d19.applied && d19.reason === 'coverage_below_floor', `reason=${d19.reason}`)
  checa('19s em 35s: duracao efetiva = pedida', d19.effectiveSeconds === 35)
  // Para exercitar o PISO isoladamente: 19s em 30s = 64% (passa na cobertura),
  // floor(19.1/5)*5 = 15 < 20 -> barra no piso.
  const f19 = N.narrationFit(r19, 30)
  checa('19s de fala em 30s tem cobertura >=60% (a cobertura nao barra)', !f19.ok && f19.coverage >= 0.6, `veio ${f19.coverage.toFixed(3)}`)
  const d19b = N.autofitDown(r19, 30)
  checa('19s de fala em 30s NAO desce (15 < piso 20)', !d19b.applied && d19b.reason === 'below_floor_seconds', `reason=${d19b.reason}`)
  checa('19s em 30s: duracao efetiva = pedida', d19b.effectiveSeconds === 30)
}

// ── 4. Piso hollywood de 30 (o planner trava em Math.max(30, …)) ──────────
secao('piso hollywood (30s)')
{
  const r25 = roteiroDe(58) // 25.2s, 72% de 35
  const dClassico = N.autofitDown(r25, 35)
  checa('classico: 25s em 35s desce para 25', dClassico.applied && dClassico.effectiveSeconds === 25, `veio ${dClassico.effectiveSeconds}`)
  const dHolly = N.autofitDown(r25, 35, { floorSeconds: N.AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD })
  checa('hollywood: 25s em 35s NAO desce (25 < 30, o planner puxaria de volta)', !dHolly.applied && dHolly.reason === 'below_floor_seconds', `reason=${dHolly.reason}`)
  const r40 = roteiroDe(93) // 40.4s, 67% de 60
  const dHolly60 = N.autofitDown(r40, 60, { floorSeconds: N.AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD })
  checa('hollywood: 40s em 60s desce para 40', dHolly60.applied && dHolly60.effectiveSeconds === 40, `veio ${dHolly60.effectiveSeconds}`)
  checa('hollywood: 60 -> 40 registra lost60sFloor', dHolly60.lost60sFloor === true)
  const r60 = roteiroDe(140) // 60.9s, 68% de 90
  const d90 = N.autofitDown(r60, 90)
  checa('90 -> 60 NAO registra lost60sFloor (ficou em 60)', d90.applied && d90.effectiveSeconds === 60 && d90.lost60sFloor === false, `veio ${d90.effectiveSeconds} lost=${d90.lost60sFloor}`)
}

// ── 5. Quem ja cabe nao e tocado; roteiro vazio nao e tocado ──────────────
secao('caminho de hoje intocado')
{
  const rCabe = roteiroDe(80) // 34.8s em 35 = 99%
  const d = N.autofitDown(rCabe, 35)
  checa('roteiro que enche o alvo: applied=false, reason=fits', !d.applied && d.reason === 'fits')
  checa('roteiro que enche o alvo: efetiva = pedida', d.effectiveSeconds === 35)
  const rSobra = roteiroDe(200) // 87s em 60: passa do alvo, e bom
  const ds = N.autofitDown(rSobra, 60)
  checa('roteiro que PASSA do alvo nao e tocado (passar e bom)', !ds.applied && ds.reason === 'fits' && ds.effectiveSeconds === 60)
  const dv = N.autofitDown('', 60)
  checa('roteiro vazio: no_narration, efetiva = pedida', !dv.applied && dv.reason === 'no_narration' && dv.effectiveSeconds === 60)
  const dz = N.autofitDown(roteiroDe(50), 0)
  checa('alvo 0/invalido: nao desce', !dz.applied)
  const dm = N.autofitDown('HOOK\n[Pexels: storm] ' + roteiroDe(76), 35)
  checa('marcadores e direcoes nao contam como fala (33s -> 30)', dm.applied && dm.effectiveSeconds === 30, `veio ${dm.effectiveSeconds}`)
}

// ── 6. Desligar a jogada = uma constante ──────────────────────────────────
secao('reversao trivial')
{
  const src = readFileSync(join(raiz, 'lib/narrationFit.ts'), 'utf8').replace(/\r\n/g, '\n')
  checa('MIN_AUTOFIT_DOWN_COVERAGE exportada e comentada com o degrau do dado', /export const MIN_AUTOFIT_DOWN_COVERAGE = 0\.60/.test(src) && src.includes('57% (1)') && src.includes('94% (2)'))
  checa('o comentario documenta como desligar (1.01)', src.includes('MIN_AUTOFIT_DOWN_COVERAGE = 1.01'))
  checa('o comentario registra a regra do fundador (passar e bom, ficar abaixo e defeito)', src.includes('ficar abaixo é defeito') && src.includes('fica ACIMA do'))
}

// ── 7. O CALLER: route.ts desce ANTES do custo ────────────────────────────
secao('route.ts — a descida acontece ANTES do custo, do claim e do debito')
{
  // Windows (autocrlf) entrega CRLF: normalizar antes de procurar por indice.
  const rota = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8').replace(/\r\n/g, '\n')
  const idx = (s) => rota.indexOf(s)
  const iImport = idx("import { autofitDown, AUTOFIT_DOWN_FLOOR_SECONDS, AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD } from '@/lib/narrationFit'")
  const iDuration = idx('let duration = Number(body.duration) || 45')
  const iRequested = idx('const requestedDuration = duration')
  const iParse = idx('const parsedScript = parseUserScript(prompt)')
  const iGuard = idx('const degrau = verbatim && parsedScript.narration')
  const iCall = idx('autofitDown(parsedScript.narration, requestedDuration')
  const iApply = idx('duration = degrau.effectiveSeconds')
  const iClip = idx('let clipCount = clipCountForDuration(duration)')
  const iCost = idx('const cost = creditCostForDuration(costQuality, true, duration)')
  const iFingerprint = idx('const claimFingerprint = cinematicRequestFingerprint({')
  const iAdmin = idx('const cinematicAdmin: SupabaseClient = createAdminClient(')
  const iEvent = idx("name: 'script_duration_autofit_down'")
  const iGate = idx('if (verbatim && parsedScript.narration) {\n      let fit = narrationFit(parsedScript.narration, duration)')
  const iBlocked = idx("name: 'narration_guard_blocked'")

  checa('importa autofitDown e os dois pisos', iImport > 0)
  checa('duration continua nascendo de body.duration || 45', iDuration > 0)
  checa('requestedDuration e congelado ANTES de qualquer descida', iRequested > iDuration && iRequested < iCall)
  checa('parseUserScript(prompt) e chamado UMA vez', (rota.match(/parseUserScript\(prompt\)/g) || []).length === 1)
  checa('parseUserScript acontece ANTES do custo', iParse > 0 && iParse < iCost)
  checa('a descida so roda no caminho verbatim com narracao', iGuard > 0 && iGuard < iCall)
  checa('a chamada de autofitDown existe', iCall > 0)
  checa('a descida (duration = degrau.effectiveSeconds) acontece ANTES de creditCostForDuration', iApply > 0 && iCost > 0 && iApply < iCost,
    `apply@${iApply} cost@${iCost}`)
  checa('a descida acontece ANTES do fingerprint do claim', iApply < iFingerprint)
  checa('clipCount le a duracao JA descida', iClip > iApply)
  checa('o piso hollywood e passado quando hollywoodPath', rota.includes('floorSeconds: hollywoodPath ? AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD : AUTOFIT_DOWN_FLOOR_SECONDS'))
  checa('o evento script_duration_autofit_down e emitido', iEvent > 0)
  checa('o evento sai no primeiro ponto em que o client admin existe (antes da trava)', iEvent > iAdmin && iEvent < iBlocked)
  for (const campo of ['requested_seconds: requestedDuration', 'effective_seconds: duration', 'speech_seconds: Math.round(degrau.speechSeconds)', 'coverage: Number(degrau.coverage.toFixed(2))', 'credits_requested: creditCostForDuration(costQuality, true, requestedDuration)', 'credits_effective: cost', 'lost_60s_floor: degrau.lost60sFloor', 'engine: claimEngine', 'quality: costQuality']) {
    checa(`evento carrega ${campo.split(':')[0]}`, rota.slice(iEvent, iEvent + 1200).includes(campo))
  }
  checa('a trava de narracao continua existindo (rede para o que NAO desceu)', iGate > 0 && iGate > iCost)
  checa('a trava continua emitindo narration_guard_blocked', iBlocked > iGate)
  checa('a trava continua estornando (releaseBirthClaim narration_too_short_no_charge)', rota.includes("await releaseBirthClaim('narration_too_short_no_charge')"))
  // A rota de recusa: a alternativa oferecida NUNCA arredonda para cima.
  checa('o 422 NAO usa Math.round(fit.speech / 5) (subiria e recriaria o defeito)', !rota.includes('Math.round(fit.speech / 5)'))
  checa('o 422 sugere a maior duracao do seletor que a fala enche (largestFittingDuration)', rota.includes('suggestedDuration: largestFittingDuration(fit.speech) ?? 0'))
  // dry_run enxerga a mesma descida
  const iDry = idx('dry_run: true,\n            verbatim,')
  checa('dry_run reporta requested/effective/autofit_down', iDry > 0 && rota.slice(iDry, iDry + 1500).includes('requested_seconds: requestedDuration') && rota.slice(iDry, iDry + 1500).includes('effective_seconds: duration') && rota.slice(iDry, iDry + 1500).includes('autofit_down: degrau?.applied === true'))
  checa('as duas respostas de sucesso carregam requested_duration', (rota.match(/requested_duration: requestedDuration/g) || []).length === 2)
  // O planner hollywood ainda trava em 30 — se isto mudar, o piso hollywood pode descer junto.
  checa('hollywoodTarget ainda trava em Math.max(30, …) (justifica o piso hollywood de 30)', /const req = Math\.max\(30, Math\.min\(90, Math\.round\(duration \|\| 60\)\)\)/.test(rota))
  // Reguas: nada de afrouxar por acidente.
  checa('route.ts nao redefine MIN_COVERAGE', !/const MIN_COVERAGE\s*=/.test(rota))
  checa('narrationFit.ts: MIN_COVERAGE = 0.95 no texto', /export const MIN_COVERAGE = 0\.95/.test(readFileSync(join(raiz, 'lib/narrationFit.ts'), 'utf8')))
  checa('narrationFit.ts: WORDS_PER_SECOND = 2.3 no texto', /export const WORDS_PER_SECOND = 2\.3/.test(readFileSync(join(raiz, 'lib/narrationFit.ts'), 'utf8')))
}

// ── 8. O OUTRO LADO: /api/compose reconhece a duracao assinada ───────────
secao('compose — a duracao assinada no claim vence o botao (sem isto: "clips do not match")')
{
  const comp = readFileSync(join(raiz, 'app/api/compose/route.ts'), 'utf8').replace(/\r\n/g, '\n')
  const iBridge = comp.indexOf('const claimDurationRaw = Number(cinematicBirthClaim.response?.duration)')
  const iStrict = comp.indexOf('(!isServiceFinish && cinematicBirthClaim.creditCost !== creditCostForDuration(trustedQuality, true, duration))')
  checa('a ponte existe', iBridge > 0)
  checa('a ponte roda ANTES da regra dura', iStrict > 0 && iBridge < iStrict)
  checa('a ponte so age quando o claim e MENOR que o botao', comp.slice(iBridge, iBridge + 800).includes('claimDuration < duration'))
  checa('a ponte exige custo do claim == custo da duracao do claim', comp.slice(iBridge, iBridge + 800).includes('cinematicBirthClaim.creditCost === creditCostForDuration(trustedQuality, true, claimDuration)'))
  checa('a ponte nao age no resgate de servico (isServiceFinish ja confia no claim)', comp.slice(iBridge, iBridge + 800).includes('!isServiceFinish &&'))
  checa('a regra dura continua existindo', iStrict > 0)

  // Simulacao da ponte com a MESMA funcao de custo: degrau legitimo passa,
  // botao esticado nao passa, resgate de fantasma antigo continua igual.
  const custo = (d) => C.creditCostForDuration('cinematic_ai', true, d)
  const ponte = (botao, claimDur, claimCost) => {
    let duration = [35, 60, 90].includes(botao) ? botao : 45 // o clamp do compose
    const ok = claimDur !== null && claimDur < duration && claimCost === custo(claimDur)
    if (ok) duration = claimDur
    return { duration, passaRegraDura: claimCost === custo(duration) }
  }
  const p1 = ponte(35, 30, custo(30))
  checa('degrau 35->30: compose compoe em 30 e a regra dura passa', p1.duration === 30 && p1.passaRegraDura)
  const p2 = ponte(60, 40, custo(40))
  checa('degrau 60->40: compose compoe em 40 e a regra dura passa', p2.duration === 40 && p2.passaRegraDura)
  const p3 = ponte(60, 90, custo(90))
  checa('claim MAIOR que o botao: ponte nao age, regra dura recusa', p3.duration === 60 && !p3.passaRegraDura)
  const p4 = ponte(35, 30, custo(35))
  checa('claim com custo que nao bate com a sua duracao: ponte nao age', p4.duration === 35)
  const p5 = ponte(45, 35, custo(45))
  checa('fantasma 45 antigo (claim cobrado a 45, resgatado a 35): ponte nao age, comportamento de hoje', p5.duration === 45 && p5.passaRegraDura)
  const p6 = ponte(35, 30, custo(30))
  checa('cliente que passar a mandar 30 (nao esta no seletor, clamp -> 45): ponte ainda acha o claim de 30', ponte(30, 30, custo(30)).duration === 30 && p6.duration === 30)
}

console.log(`\n${total} verificacoes, ${falhas} falha(s).`)
if (falhas > 0) { console.error('\nREPROVADO.'); process.exit(1) }
console.log('APROVADO — o gate desce o alvo antes do custo, e o compose reconhece a duracao assinada.\n')
