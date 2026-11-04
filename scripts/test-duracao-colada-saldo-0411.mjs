// KINEO-DURACAO-COLADA-SALDO-0411 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião.
// Caso real (manolopez69, 04/11, ES, ChatGPT, conta nova, 10 cr): "de 40 segundos" subiu o Studio de 15 s para 60 s porque a análise
// automática correu com /api/credits lido e /api/me/plan ainda no ar; o próximo passo foi a tela de pagamento, 0 filmes.
// EXECUTA as linhas reais do GenerateClient (o predicado, o bloco da diretiva colada, a descida do filme grátis) com as regras reais:
//   A. o caso real e os controles: conta paga, plano ainda desconhecido, saldo desconhecido, saldo que paga o alvo, descida;
//   B. o mesmo pedido em todo motor com seletor de duração, com a função que cobra;
//   C. a ordem de chegada: o gatilho espera o saldo; saldo e prova de conta chegam juntos; a 2ª passada (conserto da recusa) segue segura;
//   D. o recibo devolve a base byte a byte;
//   M. mutantes ficam vermelhos.
// Rodar: node scripts/test-duracao-colada-saldo-0411.mjs   (sem rede, sem custo)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const ROOT = path.resolve(import.meta.dirname, '..')
process.chdir(ROOT)
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const { createOfflineLoader } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/offline-ts-loader.mjs')).href)
const { semDuracaoColadaSaldo0411, deltaDuracaoColadaSaldo0411Exato, DURACAO_COLADA_SALDO_0411 } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/desfaz-duracao-colada-saldo-0411.mjs')).href)

let verdes = 0
const falhas = []
const checa = (nome, c) => { if (c) { verdes++; console.log('  ok  ' + nome) } else { falhas.push(nome); console.log('  XX  ' + nome) } }
const lf = (t) => t.replace(/\r\n/g, '\n')
const GC_REL = 'app/(dashboard)/generate/GenerateClient.tsx'
const GC = lf(fs.readFileSync(GC_REL, 'utf8'))
const load = createOfflineLoader()
const { contaPagaNaTela } = load('@/lib/growth/contaPagaNaTela')
const { subidaQueOSaldoPaga } = load('@/lib/growth/motor15s')
const { readPastedDirectives } = load('@/lib/pastedDirectives')
const { creditCostForDuration } = load('@/lib/credits/engineCost')
const { supportedDurationsFor } = load('@/lib/durationByEngine')
const { decidirDescidaFilmeGratis } = load('@/lib/growth/descidaFilmeGratis')
const { decidirAutoanalyze } = load('@/lib/growth/studioFantasma')
const { resolverBotoesDaRecusa, consertoAutomaticoDoPrimeiroFilme } = load('@/lib/recusaBotao')

const js = (code) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
const roda = (code, env) => { const n = Object.keys(env); return new Function(...n, js(code))(...n.map((k) => env[k])) }
const entre = (src, a, b) => { const i = src.indexOf(a); if (i < 0) return null; const j = src.indexOf(b, i + a.length); return j < 0 ? null : src.slice(i + a.length, j) }

const TEXTO_REAL = 'Crea un YouTube Short vertical 9:16 de 40 segundos sobre el Manuscrito Voynich.'
// isPaidAccount da tela = hasPaid || trialActive || plano: a conta no teste (o caso real) custa na tabela true.
const custoSeedance = (s) => creditCostForDuration('cinematic_ai', true, s)
const OPCOES_SEEDANCE = [15, 35, 45, 60, 90].filter((d) => supportedDurationsFor('seedance').includes(d) || d === 15)

// Estados da tela no instante da análise automática.
const GRATIS_SEM_PLANO = { hasPaid: false, isStarter: false, isCreator: false, isStudio: false, planTier: null, activationAccountStatus: 'free' } // o caso real
const GRATIS_COM_PLANO = { ...GRATIS_SEM_PLANO, planTier: 'free' }
const NADA_LIDO = { ...GRATIS_SEM_PLANO, activationAccountStatus: 'loading' }
const LEITURA_FALHOU = { ...GRATIS_SEM_PLANO, activationAccountStatus: 'unavailable' }
const PAGA_SEM_PLANO = { ...GRATIS_SEM_PLANO, hasPaid: true, activationAccountStatus: 'paid' }
const STARTER_SEM_PLANO = { ...GRATIS_SEM_PLANO, isStarter: true, activationAccountStatus: 'paid' }
const STUDIO_COM_PLANO = { ...GRATIS_SEM_PLANO, isStudio: true, planTier: 'pro', activationAccountStatus: 'paid' }

/** A linha REAL do predicado, executada. */
function predicado(gc, estado) {
  const expr = entre(gc, '    const contaPagaNaSubida = ', ' // KINEO-')
  if (expr === null) throw Error('linha do predicado não achada')
  return roda(`return (${expr})`, { contaPagaNaTela, ...estado })
}
/** O bloco REAL da diretiva colada do handleAnalyze, executado. */
function diretiva(gc, { texto = TEXTO_REAL, duration = 15, credits = 10, estado = GRATIS_SEM_PLANO, opcoes = OPCOES_SEEDANCE, custo = custoSeedance, fixarDuracao = false } = {}) {
  const bloco = entre(gc, '    const leituraColada = readPastedDirectives(', '\n\n    // ═══ KINEO-ORDEM-NARRADA-2026-09-07')
  if (bloco === null) throw Error('bloco da diretiva não achado')
  const duracoes = [], eventos = []
  const alvo = roda('let alvoAnalise = duration\nconst leituraColada = readPastedDirectives(' + bloco + '\nreturn alvoAnalise', {
    readPastedDirectives, subidaQueOSaldoPaga, expandBaseRef: { current: texto }, opcoesDeDuracao: opcoes.map((value) => ({ value })),
    duration, credits, contaPagaNaSubida: predicado(gc, estado), custoDaOpcao: custo, opts: { fromTopic: true, fixarDuracao },
    setDuration: (d) => duracoes.push(d), avisarSubidaSegura: () => {}, trackEvent: (n, m) => eventos.push([n, m]), scriptMode: 'verbatim',
  })
  return { alvo, duracoes, evento: eventos.find((e) => e[0] === 'pasted_directives_detected')?.[1] ?? null }
}
/** A chamada REAL da descida do filme grátis no gatilho automático, executada. */
function descida(gc, { requestedSeconds = 60, balance = 10, estado = GRATIS_SEM_PLANO } = {}) {
  const trecho = entre(gc, '? decidirDescidaFilmeGratis({', '})\n        : null // KINEO-PRIMEIRO-FILME-2026-10-13')
  if (trecho === null) throw Error('chamada da descida não achada')
  return roda(`return decidirDescidaFilmeGratis({${trecho}})`, {
    decidirDescidaFilmeGratis, contaPagaNaTela, ...estado, aiEngine: 'seedance', duration: requestedSeconds, credits: balance, trialActive: true,
    SEEDANCE_SHORT_SECONDS: 15, seedance15Ok: true, custoSeedance,
  })
}

console.log('== A. o caso real e os controles ==')
{
  const leitura = readPastedDirectives(TEXTO_REAL, OPCOES_SEEDANCE)
  checa('A0 o texto real pede 40 s e o botão que cobre é maior que 15 s', leitura.directives.find((d) => d.kind === 'duration')?.askedSeconds === 40 && leitura.suggestedDuration > 15)
  checa('A0b os 15 s cabem em 10 cr e o alvo não (é por isso que o saldo decide)', custoSeedance(15) <= 10 && custoSeedance(leitura.suggestedDuration) > 10)
  const r = diretiva(GC)
  checa('A1 manolopez69: 10 cr, plano ainda no ar: fica em 15 s (nenhum setDuration)', r.alvo === 15 && r.duracoes.length === 0)
  checa('A2 o evento registra asked 40, applied 15, held_by_balance true', r.evento?.asked_seconds === 40 && r.evento?.applied_seconds === 15 && r.evento?.held_by_balance === true)
  const comPlano = diretiva(GC, { estado: GRATIS_COM_PLANO })
  checa('A3 o MESMO resultado com o plano já lido: a ordem de chegada não muda nada', comPlano.alvo === r.alvo && comPlano.evento?.held_by_balance === true)
  const alvo = leitura.suggestedDuration
  for (const [nome, estado] of [['hasPaid', PAGA_SEM_PLANO], ['Starter', STARTER_SEM_PLANO], ['Studio com plano', STUDIO_COM_PLANO]]) {
    const p = diretiva(GC, { estado })
    checa(`A4 conta paga (${nome}): sobe até o alvo, como sempre`, p.alvo === alvo && p.duracoes[0] === alvo && p.evento?.held_by_balance === false)
  }
  const nada = diretiva(GC, { estado: NADA_LIDO })
  checa('A5 plano e direitos desconhecidos: fica como sempre (sobe; "não sei" não segura)', predicado(GC, NADA_LIDO) === null && nada.alvo === alvo)
  const blip = diretiva(GC, { estado: LEITURA_FALHOU })
  checa('A6 leitura de direitos falhou (hasPaid false é só o padrão): não vira "não paga"', predicado(GC, LEITURA_FALHOU) === null && blip.alvo === alvo)
  const semSaldo = diretiva(GC, { credits: null })
  checa('A7 saldo desconhecido: fica como sempre (sobe), a regra do saldo não adivinha', semSaldo.alvo === alvo && semSaldo.evento?.held_by_balance === false)
  const pagaOAlvo = diretiva(GC, { credits: custoSeedance(alvo) })
  checa('A8 saldo que paga o alvo: sobe até o alvo', pagaOAlvo.alvo === alvo && pagaOAlvo.evento?.held_by_balance === false)
  const parcial = diretiva(GC, { credits: custoSeedance(35), texto: 'Crea un YouTube Short vertical 9:16 de 80 segundos sobre el Manuscrito Voynich.' })
  checa('A9 saldo que paga só parte: sobe até o maior que cabe', parcial.alvo === 35 && parcial.evento?.held_by_balance === true)
  const desce = diretiva(GC, { duration: 60, texto: 'Crea un YouTube Short vertical 9:16 de 15 segundos sobre el Manuscrito Voynich.' })
  checa('A10 descida: pedir menos que o seletor segue a regra de sempre (o alvo, sem o saldo segurar)', desce.evento?.held_by_balance === false && desce.alvo === desce.evento?.applied_seconds)
  const fixo = diretiva(GC, { fixarDuracao: true, credits: 999, estado: PAGA_SEM_PLANO })
  checa('A11 duração fixada pelo clique: nada sobe', fixo.alvo === 15 && fixo.duracoes.length === 0)
  const manual = diretiva(GC, { duration: 60, credits: 10, texto: 'Sobre el Manuscrito Voynich: crea un Short vertical 9:16 de 60 segundos.' })
  checa('A12 a duração que já está no seletor (escolha da pessoa) não é tocada pela diretiva', manual.duracoes.length === 0 && manual.alvo === 60)
  const d = descida(GC)
  checa('A13 ?duration=60 com 10 cr, plano no ar: desce para o filme grátis em vez da parede', d.descer === true && d.para === 15)
  checa('A14 descida igual com o plano lido', descida(GC, { estado: GRATIS_COM_PLANO }).descer === true)
  checa('A15 conta paga e estado desconhecido não descem', descida(GC, { estado: PAGA_SEM_PLANO }).descer === false && descida(GC, { estado: NADA_LIDO }).descer === false)
}

console.log('== B. todo motor com seletor de duração ==')
{
  const MOTORES = [['Seedance 1.5', 'seedance', 'cinematic_ai'], ['Veo', 'veo', 'cinematic_veo'], ['Kling 2.5', 'kling', 'cinematic_kling'], ['Kineo 1', 'fast', 'fast'], ['Kling 3', 'hollywood', 'cinematic_hollywood'], ['Kling 4', 'hollywood', 'cinematic_hollywood', [15, 30, 60]], ['MiniMax H3', 'h3', 'cinematic_h3'], ['MiniMax H3 Max', 'h3max', 'cinematic_h3max'], ['Omni', 'omni', 'cinematic_omni'], ['Seedance 2.5', 's25', 'cinematic_s25']]
  for (const [nome, motor, q, opcoesFixas] of MOTORES) {
    const opcoes = [...(opcoesFixas ?? supportedDurationsFor(motor))].sort((a, b) => a - b)
    const custo = (s) => creditCostForDuration(q, true, s)
    const menor = opcoes[0]
    const texto = 'Crea un YouTube Short vertical 9:16 de 40 segundos sobre el Manuscrito Voynich.'
    const alvo = readPastedDirectives(texto, opcoes).suggestedDuration
    if (!(alvo > menor)) { checa(`B ${nome}: 40 s não é subida a partir de ${menor} s neste motor`, true); continue }
    const saldo = custo(alvo) - 1
    if (!(saldo >= 0)) { checa(`B ${nome}: duração sem custo não tem o que segurar`, true); continue }
    const gratis = diretiva(GC, { duration: menor, credits: saldo, opcoes, custo, texto })
    const paga = diretiva(GC, { duration: menor, credits: saldo, opcoes, custo, texto, estado: PAGA_SEM_PLANO })
    checa(`B ${nome}: saldo abaixo do alvo (${saldo} < ${custo(alvo)}), conta grátis fica abaixo do alvo e dentro do saldo; paga sobe`, gratis.alvo < alvo && (gratis.alvo === menor || custo(gratis.alvo) <= saldo) && paga.alvo === alvo)
  }
}

console.log('== C. a ordem real de chegada ==')
{
  const base = { auto: true, prompt: TEXTO_REAL, chaveDaMontagem: null, consumidoNaSessao: false }
  checa('C1 o gatilho automático espera o saldo (não corre com credits null)', decidirAutoanalyze({ ...base, credits: null, creditsLoading: true }) === 'checando_saldo' && decidirAutoanalyze({ ...base, credits: null, creditsLoading: false }) === 'saldo_falhou' && decidirAutoanalyze({ ...base, credits: 10, creditsLoading: false }) === 'decidir')
  const fetchCredits = entre(GC, "const res = await fetch('/api/credits', { cache: 'no-store' })\n        if (res.status === 401)", 'setFilmsDelivered(')
  const iStatus = fetchCredits?.indexOf("setActivationAccountStatus(paidAccount ? 'paid' : 'free')") ?? -1
  const iSaldo = fetchCredits?.indexOf('setCredits(typeof data.credits') ?? -1
  checa('C2 a prova da conta entra ANTES do saldo, no mesmo bloco, sem await entre os dois', iStatus > 0 && iSaldo > iStatus && !fetchCredits.slice(iStatus, iSaldo).includes('await '))
  checa('C3 a prova exige entitlementsResolved: leitura secundária que falhou não prova nada', /const hasEntitlementFields =\s+data\.entitlementsResolved === true/.test(GC))
  const efeito = entre(GC, 'const passoAuto = decidirAutoanalyze(', 'handleAnalyze(sp, mode ===')
  checa('C4 o gatilho continua sem esperar o plano: quem paga não trava (planTier fora das dependências do efeito)', efeito !== null && GC.includes('}, [searchParams, activeRenderRestoreResolved, credits, autoWaitTick, creditsLoading])'))
  checa('C5 as 2 leituras do predicado usam a mesma regra', GC.split('contaPagaNaTela({ hasPaid, isStarter, isCreator, isStudio, planoLido: planTier !== null, provadoQueNaoPaga: activationAccountStatus === \'free\' })').length === 3)
  // A 2ª passada: a recusa do texto colado se conserta sozinha no 1º filme, e agora parte de 15 s.
  const ctx = { options: OPCOES_SEEDANCE, costFor: custoSeedance, credits: 10, duration: 15, scriptMode: 'verbatim', rawRoad: false, text: TEXTO_REAL }
  const brief = consertoAutomaticoDoPrimeiroFilme(resolverBotoesDaRecusa({ code: 'ai_structure', reason: 'brief_requires_review' }, ctx), custoSeedance(15))
  checa('C6 recusa "pedido de vídeo": o conserto automático vira modo IA, sem trocar a duração', brief?.code === 'ai_structure' && brief.seconds === undefined)
  const segunda = diretiva(GC, { duration: brief?.seconds ?? 15 })
  checa('C7 a 2ª análise vê atual=15, alvo=60 e segura de novo (antes via atual=60: "not_raising")', segunda.alvo === 15 && segunda.evento?.held_by_balance === true)
}

console.log('== D. recibo exato ==')
{
  const baseSha = DURACAO_COLADA_SALDO_0411.base
  const baseGc = lf(require('node:child_process').execFileSync('git', ['show', `${baseSha}:${GC_REL}`], { encoding: 'utf8', maxBuffer: 64 << 20 }))
  checa('D1 sem a camada, o GenerateClient é a base byte a byte', semDuracaoColadaSaldo0411(GC, GC_REL) === baseGc)
  checa('D2 o delta é exatamente o do recibo', deltaDuracaoColadaSaldo0411Exato(GC, baseGc, GC_REL) === true)
  checa('D3 edição desconhecida reprova', deltaDuracaoColadaSaldo0411Exato(GC + '\n// a mais\n', baseGc, GC_REL) === false)
  checa('D4 todo trecho novo leva a marca', DURACAO_COLADA_SALDO_0411.scope[GC_REL].hunks.every((h) => h.after.includes('KINEO-DURACAO-COLADA-SALDO-0411')))
  // Controle do defeito: a linha da base, executada, sobe para 60.
  const velho = diretiva(baseGc, { estado: GRATIS_SEM_PLANO })
  checa('D5 na base o caso real sobe (o defeito existia de verdade)', velho.alvo === 60 && velho.evento?.held_by_balance === false)
  checa('D6 na base a descida não acontece com o plano no ar', descida(baseGc).descer === false)
}

console.log('== M. mutantes ==')
{
  const NOVA = "contaPagaNaTela({ hasPaid, isStarter, isCreator, isStudio, planoLido: planTier !== null, provadoQueNaoPaga: activationAccountStatus === 'free' })"
  const m1 = GC.replace(NOVA, 'planTier === null ? null : hasPaid || isStarter || isCreator || isStudio')
  checa('M1 predicado antigo: o caso real volta a subir', diretiva(m1).alvo === 60)
  const m2 = GC.replace("provadoQueNaoPaga: activationAccountStatus === 'free'", "provadoQueNaoPaga: activationAccountStatus !== 'paid'")
  checa('M2 "não é paga" no lugar de "provado": o desconhecido viraria grátis', predicado(m2, NADA_LIDO) === false)
  const c1 = (f) => contaPagaNaTela(f)
  checa('M3 regra pura: paga vence prova velha (webhook virou has_paid depois)', c1({ hasPaid: true, isStarter: false, isCreator: false, isStudio: false, planoLido: true, provadoQueNaoPaga: true }) === true)
  checa('M4 regra pura: nenhum sinal = null', c1({ hasPaid: false, isStarter: false, isCreator: false, isStudio: false, planoLido: false, provadoQueNaoPaga: false }) === null)
  const i = GC.lastIndexOf(NOVA)
  const m5 = GC.slice(0, i) + 'planTier === null ? null : hasPaid || isStarter || isCreator || isStudio' + GC.slice(i + NOVA.length)
  checa('M5 descida com o predicado antigo: volta a parede', descida(m5).descer === false)
}

console.log(`\n${falhas.length === 0 ? 'OK' : 'FALHOU'}: ${verdes} verdes, ${falhas.length} vermelhas`)
if (falhas.length) process.exit(1)
