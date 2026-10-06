// KINEO-ENTRADA-SEEDANCE15-2026-09-29 — guardião da E2b: a ENTRADA do cliente novo vira o Seedance 1.5 de 15 s.
// Decisão do fundador (29/09): o filme grátis de quem chega é o Seedance de 15 s (7 cr, trial de 10 intocado); o Kineo 1
// some para conta nova e fica só para quem tem a flag kineo1 (paga e usa, ou comprou pacote/passe).
// O que ele prova, EXECUTANDO o código real (transpile; @/ resolvido pelo carregador offline, nunca pelo node) ou lendo a
// LINHA INTEIRA da fonte — cada bloco com mutante em memória que PRECISA ficar vermelho:
//   A. o escritor (app/api/generate-script, trava 8.2 com "vai" do 15 s): o ensaio real de 29/09 (64 palavras em 7 blocos,
//      recusado pela guarda do cinematic) sai com 4 blocos e DENTRO do teto da guarda, contado na régua da guarda;
//      roteiro curto demais para o corte, e alvos 35/60/90 intocados;
//   B. o auto-start (resolveActivationRender): trial 10 cr → Seedance 15 s; 5 cr → 'none', nunca 'fast'; conta paga sem
//      trial → Seedance; Kineo 1 só com a flag; roteiro longo → teaser em modo IA; entrada desligada = o de antes;
//   C. "tentar de novo" leva o motor e a duração do filme original (B9);
//   D. ?engine=fast sem Kineo 1 → Seedance; a régua kineo1NaTela ('não sei' só mostra a quem paga);
//   E. ponte do trial em 15 s (versão nova, antiga aceita) e o degrau de volta sem Kineo 1 (M3);
//   F. GPT: durationSec 15 só com Seedance; conta de trial abre em 15 s e roteiro longo vira teaser (B2);
//   G. a frase de saldo da tela de pronto oferece o Seedance de 15 s, nunca o Kineo 1 a quem não o tem;
//   H. a trava: o interruptor SEEDANCE_15S_PUBLIC é ligado no commit de junção (E2b+E3, fundador 29/09); espelhos do 15.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }
const carregar = createOfflineLoader()
/** Executa uma fonte (real ou mutante) com as dependências dadas. */
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const box = { exports: {} }
  vm.runInNewContext(js, { module: box, exports: box.exports, require: (n) => { if (n in req) return req[n]; return carregar(n) }, URLSearchParams, URL, console: { log() {}, warn() {}, error() {} } })
  return box.exports
}
const linhas = (src) => src.split('\n').map((l) => l.trimEnd())
const temLinha = (src, linha) => linhas(src).includes(linha)
const trocaLinha = (src, linha, nova) => { const L = linhas(src); const i = L.indexOf(linha); if (i < 0) return null; L[i] = nova; return L.join('\n') }
const troca = (src, a, b) => (src.includes(a) ? src.split(a).join(b) : null)

const D = carregar('lib/durationByEngine.ts')
const E = carregar('lib/credits/engineCost.ts')
const P = carregar('lib/scriptParser.ts')
const W = carregar('lib/scriptWriterRate.ts')
const SF_SRC = rd('lib/shortFilmScript.ts')
const SF = roda(SF_SRC)
const TRIAL_SRC = rd('lib/reverseTrial.ts')
const CAP = Number(/export const TRIAL_CREDIT_CAP = (\d+)/.exec(TRIAL_SRC)?.[1])
const custo = (s) => E.creditCostForDuration('cinematic_ai', true, s)
const CURTO = D.SEEDANCE_SHORT_SECONDS

console.log('A) o escritor do filme curto (generate-script) — o ensaio real de 29/09')
const EX = 'HOOK (0-2s): [Pexels: foggy lake surface] Lake Nyos: 1,700 dead in one night. How?\n\nMICRO REWARD 1: [Pexels: volcanic craters aerial] Lake Nyos sits atop a dormant volcanic crater in Cameroon.\n\nMICRO REWARD 2: [Pexels: gas bubbling in water] It released a sudden, massive cloud of carbon dioxide.\n\nMICRO REWARD 3: [Pexels: livestock lying on ground] The gas, heavier than air, blanketed the ground silently.\n\nESCALATION: [Pexels: villagers fleeing in panic] It spread over 15 miles, suffocating everything in its path.\n\nRHYTHM: [Pexels: darkening sky over lake] Silent. Deadly. Unstoppable.\n\nPAYOFF: [Pexels: deserted village aftermath] The lake\'s CO2 eruption displaced oxygen, suffocating 1,700 people... in their sleep. Follow for more.'
// A régua da guarda do cinematic: parseUserScript(prompt).narration, palavras por espaço (route.ts checarFalaDoFilmeCurto).
const falaDaGuarda = (t) => P.parseUserScript(t).narration.split(/\s+/).filter(Boolean).length
const guarda = (t) => D.checarFalaDoFilmeCurto({ engine: 'cinematic_ai', seconds: CURTO, verbatim: true, narration: P.parseUserScript(t).narration })
const regua = W.writerRateFor('cinematic_ai', 'Lake Nyos', 'en')
const TETO = Math.min(W.maxWordsFor(CURTO, regua.wordsPerSecond, regua.coverage), D.maxWordsForShortFilm(CURTO))
const PISO = Math.min(W.minWordsFor(CURTO, regua.wordsPerSecond, regua.coverage), TETO)
const cabecalhos = (t) => t.split('\n').map((l) => (/^(HOOK|MICRO REWARD \d|ESCALATION|RHYTHM|PAYOFF)\b/.exec(l.trim()) || [])[1]).filter(Boolean)
checa(`o ensaio tinha ${falaDaGuarda(EX)} palavras em ${cabecalhos(EX).length} blocos e a guarda o RECUSA (teto ${TETO}, derivado)`, falaDaGuarda(EX) === 64 && cabecalhos(EX).length === 7 && guarda(EX).ok === false && TETO <= D.maxWordsForShortFilm(CURTO) && TETO === Math.min(W.maxWordsFor(CURTO, regua.wordsPerSecond, regua.coverage), D.maxWordsForShortFilm(CURTO)))
// Reancorado 29/09 (junção com o 3x6 da main, 495c2821): o escritor do 15 s mira ~41 palavras (lib/scriptWriterRate
// seedanceShortWriterWords), abaixo do teto da guarda (56). O teto do escritor deixou de ser IGUAL ao da guarda — é o MENOR
// dos dois (a mesma linha da rota). Depois das 4 seções a guarda já aceita; o corte determinístico da rota leva ao teto.
const so4 = SF.keepShortFilmSections(EX)
const so4Cortado = SF.fitShortFilmScript(so4.script, { maxWords: TETO, minWords: PISO, countWords: falaDaGuarda })
checa(`depois do conserto: ${cabecalhos(so4.script).length} blocos (HOOK, MR1, MR2, PAYOFF na ordem), ${falaDaGuarda(so4.script)} palavras (a guarda ACEITA) e o corte da rota leva a ${so4Cortado.words} ≤ ${TETO}`,
  JSON.stringify(cabecalhos(so4.script)) === JSON.stringify(['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'PAYOFF']) && falaDaGuarda(so4.script) <= D.maxWordsForShortFilm(CURTO) && guarda(so4.script).ok === true && so4Cortado.words <= TETO && guarda(so4Cortado.script).ok === true &&
  JSON.stringify(so4.dropped) === JSON.stringify(['MICRO REWARD 3', 'ESCALATION', 'RHYTHM']) && so4.script.includes('[Pexels: deserted village aftermath]'))
{
  const mut = roda(troca(SF_SRC, '  const kept: Block[] = [hook, ...mrs.slice(0, 2), payoff]', '  const kept: Block[] = blocks'))
  const m = mut.keepShortFilmSections(EX)
  checa('mutante (mantém todos os blocos) → vermelho: 7 blocos e a guarda recusa', cabecalhos(m.script).length === 7 && guarda(m.script).ok === false)
}
// Um roteiro de 4 blocos que o modelo escreveu longo demais: o corte determinístico cabe no teto, nunca abaixo do piso.
const LONGO = so4.script.replace('in Cameroon.', 'in Cameroon. It is one of only three known exploding lakes on Earth, and scientists call it a limnic lake. Nobody in the valley saw it coming that night.')
const cont = (t) => Math.max(falaDaGuarda(t), falaDaGuarda(t))
const cortado = SF.fitShortFilmScript(LONGO, { maxWords: TETO, minWords: PISO, countWords: cont })
checa(`roteiro de 4 blocos com ${falaDaGuarda(LONGO)} palavras: corte (${cortado.cut}) até ${cortado.words} — entre o piso ${PISO} e o teto ${TETO}; a guarda aceita`, falaDaGuarda(LONGO) > TETO && cortado.words <= TETO && cortado.words >= PISO && guarda(cortado.script).ok === true)
// Reancorado 29/09 (KINEO-ROTEIRO-15S-FRASE-INTEIRA, defeito no ar "…do metrô em São." / "…perfeito para."): a "trava
// final" que picava PALAVRAS do fim do texto para caber no teto morreu — era ela (e o aparo por palavra dos blocos) que
// cortava frase no meio. Texto sem cabeçalho: sai frase inteira a frase inteira; uma "frase" só (sem pontuação) acima do
// teto sai INTEIRA, marcada overCeiling, e a guarda do cinematic recusa com "encurte", sem cobrar — nunca picada.
const semPontos = 'word '.repeat(90).trim()
const sem = SF.fitShortFilmScript(semPontos, { maxWords: TETO, minWords: PISO, countWords: cont })
checa('texto sem cabeçalhos e sem pontuação acima do teto: sai INTEIRO (overCeiling), nunca picado por palavra', sem.script === semPontos && sem.overCeiling === true && sem.cut === 'none')
const semCab = Array.from({ length: 9 }, (_, i) => `Sentence number ${i} has exactly seven words here.`).join(' ')
const semCabFit = SF.fitShortFilmScript(semCab, { maxWords: TETO, minWords: PISO, countWords: cont })
checa(`texto sem cabeçalhos com frases: ${cont(semCab)} → ${semCabFit.words} ≤ ${TETO}, só frases inteiras`, semCabFit.words <= TETO && semCabFit.script.split(/(?<=[.])\s+/).every((f) => /^Sentence number \d has exactly seven words here\.$/.test(f)))
{
  const mut = roda(troca(SF_SRC, "  return body.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean)", "  return body.split(/\\s+/).map((s) => s.trim()).filter(Boolean)"))
  checa('mutante (de volta ao corte por palavra: cada palavra vira "frase") → vermelho: o texto sem pontuação sai picado', mut.fitShortFilmScript(semPontos, { maxWords: TETO, minWords: PISO, countWords: cont }).script !== semPontos)
}
checa('alvos: 15 é filme curto; 35/60/90 NÃO (intocados)', SF.isShortFilmTarget(15) && !SF.isShortFilmTarget(35) && !SF.isShortFilmTarget(60) && !SF.isShortFilmTarget(90))
{
  const mut = roda(troca(SF_SRC, 'export const SHORT_FILM_MAX_TARGET_SECONDS = 20', 'export const SHORT_FILM_MAX_TARGET_SECONDS = 60'))
  checa('mutante (teto do filme curto em 60) → vermelho: 35 e 60 passariam a ser cortados', mut.isShortFilmTarget(35) && mut.isShortFilmTarget(60))
}
const reforco = SF.shortFilmRetryInstruction(TETO, PISO, CURTO)
checa('o reforço da nova tentativa diz "at most N spoken words" e SÓ as 4 seções', reforco.includes(`at most ${TETO} spoken words`) && reforco.includes('HOOK, MICRO REWARD 1, MICRO REWARD 2, PAYOFF') && reforco.includes('Do NOT write MICRO REWARD 3, ESCALATION or RHYTHM'))
const GS = rd('app/api/generate-script/route.ts')
// Reancorado 29/09 (KINEO-RITMO-POR-IDIOMA-15S-2026-09-29, [TRAVA 8.2 — "vai conserta" do fundador]): a linha ganhou a língua do filme curto do Seedance (idiomaDoRitmo / ritmo); o que ela protege não muda.
const L_TETO = '    const tetoFilmeCurto = Math.min(maxWordsFor(alvoSegundos, regua.wordsPerSecond, regua.coverage, idiomaDoRitmo), maxWordsForShortFilm(alvoSegundos))'
const L_REGUA = '    const falaNaReguaDaGuarda = (t: string) => parseUserScript(t).narration.split(/\\s+/).filter(Boolean).length'
const L_ANCORAS = [
  L_TETO,
  L_REGUA,
  '    const filmeCurto = isShortFilmTarget(alvoSegundos)',
  '      const so4 = keepShortFilmSections(script)',
  '    if (missing.length > 0 || payoffIsEmpty(script) || curtoParaOAlvo(script) || longoParaOFilmeCurto(script)) {',
  '                ? `Your script had problems: ${problems.join(\'; \')}. ${shortFilmRetryInstruction(tetoFilmeCurto, pisoFilmeCurto, alvoSegundos)}`',
  '    if (filmeCurto && palavrasDoFilmeCurto(script) > tetoFilmeCurto) {',
  // reancorado 29/09 (KINEO-ROTEIRO-15S-FRASE-INTEIRA): o corte ganhou o teto duro da guarda (hardMaxWords) — frases inteiras
  '      const ajuste = fitShortFilmScript(script, { maxWords: tetoFilmeCurto, minWords: pisoFilmeCurto, countWords: palavrasDoFilmeCurto, hardMaxWords: tetoDuroFilmeCurto })',
  // KINEO-ROTEIRO-15S-FRASE-INTEIRA: o fecho (4 seções → sem CTA → frases inteiras) corre logo depois da 1ª geração
  '      fimDoFilmeCurto = fecharFilmeCurto(so4.script)',
]
checa('a rota do escritor liga as 4 peças na ordem (seções → tentativa com reforço → corte final), teto derivado da guarda', L_ANCORAS.every((l) => temLinha(GS, l)) &&
  GS.indexOf(L_ANCORAS[3]) < GS.indexOf(L_ANCORAS[4]) && GS.indexOf(L_ANCORAS[4]) < GS.indexOf(L_ANCORAS[6]) && GS.indexOf(L_ANCORAS[6]) < GS.indexOf('    if (forceAuthoring) {') && GS.indexOf(L_ANCORAS[3]) < GS.indexOf(L_ANCORAS[8]) && GS.indexOf(L_ANCORAS[8]) < GS.indexOf(L_ANCORAS[4]))
checa('mutante (teto com + 10 na mesma linha) → vermelho', !temLinha(trocaLinha(GS, L_TETO, L_TETO.replace('maxWordsForShortFilm(alvoSegundos))', 'maxWordsForShortFilm(alvoSegundos)) + 10')), L_TETO))
checa('a guarda do cinematic conta na MESMA régua (parseUserScript(prompt).narration)', temLinha(rd('app/api/generate-video-cinematic/route.ts'), "      const falaCurta = checarFalaDoFilmeCurto({ engine: typeof body.engine === 'string' ? body.engine : null, seconds: duration, verbatim, narration: parsedScript.narration })") && temLinha(rd('app/api/generate-video-cinematic/route.ts'), '    const parsedScript = parseUserScript(prompt)'))

console.log('B) o auto-start escolhe motor E duração (resolveActivationRender)')
const TA_SRC = rd('lib/growth/trialActivationIntent.ts')
const TA = roda(TA_SRC)
const base = { createIntent: 'trial_best', trialActive: true, hasPaid: false, credits: CAP, requestedDuration: 35, scriptMode: 'ai', seedanceCostAt: custo, entrada15: true, shortSeconds: CURTO, promptFitsShort: true, kineo1: false }
const r = (o = {}) => TA.resolveActivationRender({ ...base, ...o })
checa(`trial de ${CAP} cr (lido do código), pediu 35 s → Seedance a ${CURTO} s (custo ${custo(CURTO)} ≤ ${CAP})`, r().engine === 'seedance' && r().duration === CURTO && custo(CURTO) <= CAP && custo(35) > CAP)
checa('link público antigo (create_intent=fast) resolve igual: Seedance 15 s', r({ createIntent: 'fast' }).engine === 'seedance' && r({ createIntent: 'fast' }).duration === CURTO)
checa('5 cr → none (nunca fast), com kineo1 false E com "não sei"', r({ credits: 5 }).engine === 'none' && r({ credits: 5, kineo1: null }).engine === 'none' && r({ credits: 5, kineo1: undefined }).engine === 'none')
checa('conta paga sem trial (acabou de pagar) → Seedance na duração pedida quando cabe; 15 s quando só o curto cabe (B5)', r({ trialActive: false, hasPaid: true, credits: 60 }).engine === 'seedance' && r({ trialActive: false, hasPaid: true, credits: 60 }).duration === 35 && r({ trialActive: false, hasPaid: true, credits: CAP }).duration === CURTO)
checa('conta grátis sem trial e sem pagar → none (o servidor recusaria o Seedance)', r({ trialActive: false, hasPaid: false }).engine === 'none')
checa('Kineo 1 só para quem tem a flag (legado) quando o Seedance não cabe', r({ credits: 5, kineo1: true }).engine === 'fast')
checa('roteiro colado longo demais para 15 s → modo IA a 15 s (teaser), nunca verbatim recusado', r({ scriptMode: 'verbatim', promptFitsShort: false }).scriptMode === 'ai' && r({ scriptMode: 'verbatim', promptFitsShort: false }).teaser === true && r({ scriptMode: 'verbatim', promptFitsShort: true }).scriptMode === 'verbatim')
checa('entrada desligada = o de antes: trial 10 cr com create_intent=fast → Kineo 1 na duração pedida', r({ entrada15: false, createIntent: 'fast' }).engine === 'fast' && r({ entrada15: false, createIntent: 'fast' }).duration === 35 && r({ entrada15: false }).reason === 'legacy')
checa('mutante (custo comparado = o de 60 s, o defeito B1) → vermelho: o trial de 10 cr fica sem filme', TA.resolveActivationRender({ ...base, seedanceCostAt: () => custo(60) }).engine === 'none')
{
  const mut = roda(troca(TA_SRC, "  if (input.kineo1 === true) {", "  if (input.kineo1 !== false || true) {"))
  checa('mutante (cai no Kineo 1 sem a flag) → vermelho: 5 cr viraria "fast"', mut.resolveActivationRender({ ...base, credits: 5 }).engine === 'fast')
}
const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('o /generate chama o resolvedor com o custo da função que cobra, a entrada, o 15 e a flag kineo1', temLinha(GEN, "  const custoSeedance = (segundos: number) => creditCostForDuration('cinematic_ai', true, segundos)") && temLinha(GEN, '      seedanceCostAt: custoSeedance,') && temLinha(GEN, '      entrada15,') && temLinha(GEN, '      shortSeconds: SEEDANCE_SHORT_SECONDS,') && temLinha(GEN, '      kineo1: kineo1Visible,') && temLinha(GEN, '    const activationDecision = resolveActivationRender({'))
checa("o 'none' sai por consumeAndSkip antes de armar (M8)", temLinha(GEN, '    if (activationEngine === null) {') && GEN.indexOf('    if (activationEngine === null) {') < GEN.indexOf("    void trackEvent('activation_autostart_eligible', metadata)"))

console.log('C) "tentar de novo" leva o motor e a duração do filme original (B9)')
const RV_SRC = rd('lib/navigation/reviewVideoRetry.ts')
const RV = roda(RV_SRC)
const q = (h) => new URL('https://x.invalid' + h).searchParams
checa('Seedance de 15 s que falhou (18 s medidos) → engine=seedance&duration=15', q(RV.reviewVideoRetryHref('Lake Nyos', { quality: 'cinematic_ai', durationSeconds: 18 })).get('engine') === 'seedance' && q(RV.reviewVideoRetryHref('Lake Nyos', { quality: 'cinematic_ai', durationSeconds: 18 })).get('duration') === '15')
checa('falhou sem MP4 → sem ?duration (o Studio escolhe a que o saldo paga)', q(RV.reviewVideoRetryHref('x', { quality: 'cinematic_ai', durationSeconds: null })).get('duration') === null)
checa('Kling de 40 s → kling/35; chamador antigo sem o filme → o padrão de antes (fast/35)', q(RV.reviewVideoRetryHref('x', { quality: 'cinematic_kling', durationSeconds: 40 })).get('engine') === 'kling' && q(RV.reviewVideoRetryHref('x', { quality: 'cinematic_kling', durationSeconds: 40 })).get('duration') === '35' && q(RV.reviewVideoRetryHref('x')).get('engine') === 'fast')
{
  const mut = roda(troca(RV_SRC, "  const engine = (original.quality && STUDIO_ENGINE_FOR_QUALITY[original.quality]) || 'fast'", "  const engine = 'fast'"))
  checa('mutante (retry crava Kineo 1) → vermelho', q(mut.reviewVideoRetryHref('x', { quality: 'cinematic_ai', durationSeconds: 18 })).get('engine') === 'fast')
}
checa('o histórico passa o filme original', rd('app/(dashboard)/history/HistoryClient.tsx').includes('reviewVideoRetryHref(video.topic, { quality: video.quality_mode, durationSeconds: video.duration ?? null })'))
const SR = carregar('lib/navigation/studioSeriesReview.ts')
checa('continuar a série leva o motor do filme de origem', q(SR.buildStudioSeriesReviewHref('A real topic about Lake Nyos', 'studio_video_tile', { quality: 'cinematic_ai' })).get('engine') === 'seedance')

console.log('D) ?engine=fast sem Kineo 1 → Seedance; a régua kineo1NaTela')
const EN_SRC = rd('lib/growth/entradaSeedance15.ts')
const EN = roda(EN_SRC)
checa('entrada desligada: Kineo 1 sempre na tela (o de antes)', EN.kineo1NaTela({ entrada15: false, kineo1: false }) === true)
checa('entrada ligada: flag false esconde; true mostra; "não sei" só mostra a quem paga', EN.kineo1NaTela({ entrada15: true, kineo1: false, hasPaid: true }) === false && EN.kineo1NaTela({ entrada15: true, kineo1: true }) === true && EN.kineo1NaTela({ entrada15: true, kineo1: null, hasPaid: true }) === true && EN.kineo1NaTela({ entrada15: true, kineo1: null, hasPaid: false }) === false && EN.kineo1NaTela({ entrada15: true, kineo1: undefined, hasPaid: null }) === false)
checa('?engine=fast (e kineo1/kineo-1) sem Kineo 1 → seedance; com Kineo 1 → fast; outro motor passa', EN.motorDaUrl('fast', false) === 'seedance' && EN.motorDaUrl('kineo-1', false) === 'seedance' && EN.motorDaUrl('fast', true) === 'fast' && EN.motorDaUrl('kling', false) === 'kling' && EN.motorDaUrl('', false) === null)
{
  const mut = roda(troca(EN_SRC, "  if (f.kineo1 === false) return false", "  if (f.kineo1 === false) return true"))
  checa('mutante (flag false não esconde) → vermelho', mut.kineo1NaTela({ entrada15: true, kineo1: false }) === true)
  const mut2 = roda(troca(EN_SRC, "  if (KINEO1_URL_KEYS.includes(e)) return kineo1Visivel ? 'fast' : 'seedance'", "  if (KINEO1_URL_KEYS.includes(e)) return 'fast'"))
  checa('mutante (?engine=fast passa cru) → vermelho', mut2.motorDaUrl('fast', false) === 'fast')
}
checa(`duração de entrada: trial ${CAP} cr → ${CURTO} s; 60 cr → 60 s; saldo desconhecido → não mexe`, EN.duracaoDeEntrada(CAP, custo) === CURTO && EN.duracaoDeEntrada(60, custo) === 60 && EN.duracaoDeEntrada(null, custo) === null)
checa(`rótulo "${EN.FREE_SHORT_FILM_LABEL}" só no trial, no Seedance a 15 s e com o custo cabendo`, EN.rotuloDoFilmeGratis({ entrada15: true, trialActive: true, balance: CAP, engine: 'seedance', duration: CURTO, custoSeedance: custo }) === `Your free ${CURTO}-second film` &&
  EN.rotuloDoFilmeGratis({ entrada15: true, trialActive: false, balance: CAP, engine: 'seedance', duration: CURTO, custoSeedance: custo }) === null &&
  EN.rotuloDoFilmeGratis({ entrada15: true, trialActive: true, balance: custo(CURTO) - 1, engine: 'seedance', duration: CURTO, custoSeedance: custo }) === null &&
  EN.rotuloDoFilmeGratis({ entrada15: false, trialActive: true, balance: CAP, engine: 'seedance', duration: CURTO, custoSeedance: custo }) === null)
const STUDIO = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('Studio: card do Kineo 1 e degraus só com kineo1Shown; ?engine=fast sem Kineo 1 vira Seedance; rótulo do filme grátis', STUDIO.includes("{ENGINES.filter((e) => (e.key !== 's25' || internal) && (e.key !== 'fast' || kineo1Shown)).map((e) => { const pausa") && temLinha(STUDIO, "    if (flagsProntas && entrada15 && engine === 'fast' && !kineo1Shown) setEngine('seedance')") && STUDIO.includes('rotuloDoFilmeGratis({ entrada15, trialActive: trialOn, balance, engine, duration, custoSeedance })') && temLinha(STUDIO, '  const kineo1Shown = kineo1NaTela({ entrada15, kineo1: flagsProntas ? kineo1Flag ?? null : kineo1Flag, hasPaid: contaPaga })'))
checa('/generate: card "Fast Mode" só com kineo1Shown; ?engine= pela régua no deep link e no cinto do one-click', GEN.includes('        {kineo1Shown && <EngineCard') && temLinha(GEN, "    const engine = motorDaUrl(searchParams.get('engine'), kineo1NaMontagem) ?? ''") && temLinha(GEN, "    const uEng = motorDaUrl(searchParams?.get('engine'), kineo1Shown) ?? '' // KINEO-ENTRADA-SEEDANCE15: ?engine=fast sem Kineo 1 = Seedance") && temLinha(GEN, '  const kineo1Shown = kineo1NaTela({ entrada15, kineo1: kineo1Visible, hasPaid })'))
checa('/generate: parede de crédito oferece o Seedance de 15 s (custo derivado) e a caixa do Kineo 1 exige kineo1Shown', GEN.includes('            credits >= custoSeedance(SEEDANCE_SHORT_SECONDS)') && GEN.includes("credits >= creditCostForDuration('fast', isPaidAccount, duration) && kineo1Shown") && GEN.includes('data-testid="trial-seedance15-offer"'))
checa('/generate: "última configuração" não devolve o Kineo 1 a quem não o tem (M2)', temLinha(GEN, "    if (lastSetup.quality === 'fast' && !kineo1Shown) return null"))
const ME = rd('app/api/me/credits/route.ts')
checa("/api/me/credits: leitura de legado que falhou vira null ('não sei', pendência 5 da E1) e a resposta leva hasPaid", ME.includes("if (l.ok === false) throw new Error('kineo1_legacy_unreadable')") && ME.includes('.catch(() => null)') && ME.includes('internal: s25Visible(user.email), s25Liberado, hasPaid, kineo1, plan })')) // reancorado KINEO-S25-ABRE-2026-10-06: + s25Liberado

console.log('E) ponte do trial em 15 s e o degrau de volta (M3)')
const TB_SRC = rd('lib/growth/trialBalanceBridge.ts')
const TB = carregar('lib/growth/trialBalanceBridge.ts')
const primeira = TB.decideTrialFirstDelivery({ trialPhase: 'active', credits: CAP, creditsUsed: 0, shortFilm: true })
checa(`primeira entrega com a entrada nova: Seedance ${primeira.duration} s por ${primeira.cost} cr (derivado), versão nova, sem "N Fast episodes"`, primeira.eligible && primeira.duration === CURTO && primeira.cost === custo(CURTO) && primeira.version === 'trial_first_seedance_15s_v1' && primeira.fastRepeatsAfterSuccess === 0 && TB.TRIAL_SHORT_FILM_DURATION === CURTO)
checa('sem a entrada nova, a primeira entrega é a de antes (35 s, versão v2)', TB.decideTrialFirstDelivery({ trialPhase: 'active', credits: CAP, creditsUsed: 0 }).duration === 35 && TB.decideTrialFirstDelivery({ trialPhase: 'active', credits: CAP, creditsUsed: 0 }).version === 'trial_first_seedance_35s_v2')
checa('a versão antiga (link já enviado) continua aceita pelo Studio, a nova também', TB.trialFirstDeliveryStudioIntent({ intentCampaign: 'trial_first_seedance_35s_v2', engine: 'seedance' }) === 'trial_best' && TB.trialFirstDeliveryStudioIntent({ intentCampaign: 'trial_first_seedance_15s_v1', engine: 'seedance' }) === 'trial_best' && TB.trialFirstDeliveryStudioIntent({ intentCampaign: 'trial_first_seedance_15s_v1', engine: 'fast' }) === null)
const volta7 = TB.decideTrialReturnLadder({ trialPhase: 'active', credits: custo(CURTO), shortFilm: true, kineo1Allowed: false })
const volta3 = TB.decideTrialReturnLadder({ trialPhase: 'active', credits: CAP - custo(CURTO), shortFilm: true, kineo1Allowed: false })
checa(`degrau de volta: ${custo(CURTO)} cr → Seedance 15 s; os ${CAP - custo(CURTO)} cr que sobram → nenhum degrau (nunca Kineo 1)`, volta7.eligible && volta7.engine === 'cinematic_ai' && volta7.duration === CURTO && !volta3.eligible && volta3.engine !== 'fast')
checa('sem a entrada nova, a sobra ainda compra o Kineo 1 (legado intacto)', TB.decideTrialReturnLadder({ trialPhase: 'active', credits: CAP - custo(CURTO) }).engine === 'fast')
{
  const mut = roda(troca(TB_SRC, '  if (input.kineo1Allowed === false) {', '  if (false) {'), { '@/lib/credits/engineCost': E })
  checa('mutante (sem a guarda do M3) → vermelho: a sobra do trial volta a comprar Kineo 1', mut.decideTrialReturnLadder({ trialPhase: 'active', credits: CAP - custo(CURTO), shortFilm: true, kineo1Allowed: false }).engine === 'fast')
}
const BANNER = rd('components/TrialActiveBanner.tsx')
checa('o banner do trial usa a entrada (interruptor público — trial nunca é conta da casa) e sem degrau Kineo 1', temLinha(BANNER, 'const ENTRADA_CURTA = SEEDANCE_15S_PUBLIC') && BANNER.includes('shortFilm: ENTRADA_CURTA, kineo1Allowed: ENTRADA_CURTA ? false : undefined') && BANNER.includes('intentCampaign: firstDelivery.version,'))
const RP = carregar('lib/growth/trialRepeatBeforeCheckout.ts')
const rep = RP.decideTrialRepeatBeforeCheckout({ trialPhase: 'active', credits: 20, bridgeEligible: false, preferredDuration: 35, shortFilm: { seconds: CURTO } })
checa('"repita antes de pagar" com a entrada nova é o Seedance de 15 s (custo derivado)', rep.action === 'episode' && rep.engine === 'cinematic_ai' && rep.duration === CURTO && rep.cost === custo(CURTO))

console.log('F) GPT: 15 s só no Seedance; trial abre em 15 s; roteiro longo vira teaser (B2)')
const G = carregar('lib/gptHandoff.ts')
checa('durationSec 15 aceito com engineHint seedance e recusado com outro motor', G.validateHandoffInput({ script: 'x y z', durationSec: 15, engineHint: 'seedance' }).ok === true && G.validateHandoffInput({ script: 'x y z', durationSec: 15, engineHint: 'kling' }).ok === false && G.validateHandoffInput({ script: 'x y z', durationSec: 45 }).ok === false && G.HANDOFF_SHORT_DURATION === CURTO)
const linha = { script: 'word '.repeat(150).trim(), duration_sec: 60, engine_hint: 'seedance', aspect: '9:16' }
const dLong = q(G.buildStudioDestination(linha, { shortSeconds: CURTO, fitsShort: false }).replace(/^\/studio(\/create)?/, ''))
const dCurto = q(G.buildStudioDestination(linha, { shortSeconds: CURTO, fitsShort: true }).replace(/^\/studio(\/create)?/, ''))
const dSem = q(G.buildStudioDestination(linha).replace(/^\/studio(\/create)?/, ''))
checa('entrada curta: Seedance a 15 s; roteiro longo abre em modo IA (teaser), curto em verbatim; sem a entrada, o destino de sempre', dLong.get('duration') === '15' && dLong.get('engine') === 'seedance' && dLong.get('script_mode') === 'ai' && dCurto.get('script_mode') === 'verbatim' && dSem.get('duration') === '60' && dSem.get('script_mode') === 'verbatim')
checa('roteiroCabeNoFilmeCurto usa o teto da guarda', EN.roteiroCabeNoFilmeCurto('word '.repeat(D.maxWordsForShortFilm(CURTO)).trim()) === true && EN.roteiroCabeNoFilmeCurto('word '.repeat(D.maxWordsForShortFilm(CURTO) + 1).trim()) === false)
const GO = rd('app/api/gpt/handoff/go/route.ts')
checa('a rota do clique decide a entrada curta com a conta logada (flag, trial/paga, saldo paga o 15 e não o pedido)', GO.includes('if (user && seedance15sVisible(user.email)) {') && GO.includes('      if (saldo !== null && podeSeedance && saldo < pedido && saldo >= curto) {') && GO.includes('buildStudioDestination(row, entradaCurta)'))

console.log('G) a frase de saldo da tela de pronto')
const RC = carregar('lib/growth/readyCreditsLine.ts')
const fraseNova = RC.readyCreditsLine({ credits: CAP, quality: 'cinematic_ai', seconds: 35, isPaidAccount: true, freeOffer: { cardEntry: false, residual: '', chip: '' }, freeQuotaSpent: false, kineo1Allowed: false, shortSeedanceSeconds: CURTO })
const fraseVelha = RC.readyCreditsLine({ credits: CAP, quality: 'cinematic_ai', seconds: 35, isPaidAccount: true, freeOffer: { cardEntry: false, residual: '', chip: '' }, freeQuotaSpent: false })
checa(`com a entrada nova: "${fraseNova}" — oferece o Seedance de 15 s e não cita o Kineo 1`, fraseNova.includes(`A ${CURTO}s Seedance 1.5 video takes ${custo(CURTO)}`) && !fraseNova.includes('Kineo 1'))
checa('sem a entrada nova, a frase é a de antes (saída pelo Kineo 1)', fraseVelha.includes('Kineo 1'))
const semKineo = RC.readyCreditsLine({ credits: 3, quality: 'cinematic_ai', seconds: 35, isPaidAccount: true, freeOffer: { cardEntry: false, residual: '', chip: '' }, freeQuotaSpent: false, kineo1Allowed: false, shortSeedanceSeconds: CURTO })
checa('3 cr sem Kineo 1: só a parede, sem oferecer Kineo 1', !semKineo.includes('Kineo 1'))

console.log('H) a trava da entrega e os espelhos do 15')
// Reancorado 29/09 (commit "Seedance 15 s PUBLICO"): a junção E2b+E3 virou o interruptor, como este check anunciava.
checa('SEEDANCE_15S_PUBLIC ligado no commit de junção (entrada + textos juntos)', temLinha(rd('lib/engineLaunch.ts'), 'export const SEEDANCE_15S_PUBLIC = true'))
const FT = carregar('lib/freeTierOffer.ts')
checa(`TRIAL_SEEDANCE15_FILMS derivado (${FT.TRIAL_SEEDANCE15_FILMS}) = floor(grant ÷ custo de 15 s) e o 15 espelha SEEDANCE_SHORT_SECONDS`, FT.TRIAL_SEEDANCE15_SECONDS === CURTO && FT.TRIAL_SEEDANCE15_FILMS === Math.floor(CAP / custo(CURTO)) && FT.TRIAL_SEEDANCE15_FILMS >= 1)
checa('TRIAL_CREDIT_CAP intocado em 10 (a entrada nova não mexe no trial)', CAP === 10)
const EXIT = rd('components/ExitIntentOffer.tsx')
// Reancorado na junção E2b+E3 (29/09): a E3 é dona do texto e o ExitIntentOffer passou a usar a frase única
// FREE_FILM_LABEL (lib/freeTierOffer) em vez de montar "free ${TRIAL_SEEDANCE15_SECONDS}-second … (Seedance 1.5)" à mão.
// Mesma força: a contagem segue vindo de TRIAL_SEEDANCE15_FILMS, e a frase da constante é conferida EXECUTANDO o módulo.
checa('ExitIntentOffer: com a entrada pública, "free 15-second film (Seedance 1.5)" pela constante derivada; nenhum "free Kineo 1 video"', EXIT.includes('TRIAL_SEEDANCE15_FILMS') && EXIT.includes('${FREE_FILM_LABEL}') && FT.FREE_FILM_LABEL === `free ${CURTO}-second film (Seedance 1.5)` && !/free Kineo 1 video|two Kineo 1 films/i.test(EXIT))

console.log(`\n${ok}/${ok + falhas.length} verificações`)
if (falhas.length) { for (const f of falhas) console.log('FALHOU:', f); process.exit(1) }
console.log('PASS — a entrada do cliente novo é o Seedance de 15 s (atrás do interruptor), sem Kineo 1 para conta nova.')
