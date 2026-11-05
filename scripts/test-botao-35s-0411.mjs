// KINEO-BOTAO-35S-0411 [TRAVA 8.2 — fundador 03/11: "já pode arrumar"] — guardião.
// Caso real (breakthroughs2026, 04/11 20:29 BRT, pagante, 97 cr): recusa narration_too_short (32 s de fala em 60 s), o escritor
// esgotou (still_short) e a tela ofereceu "Make it 35s". O clique trocava a duração e devolvia a tela parada: 0 filmes.
// EXECUTA os trechos reais do GenerateClient (os 2 cliques, os 2 efeitos do trilho, o handleGenerateGuarded), com a mesma
// semântica de fechamento do React: o clique enxerga a duração velha; o efeito do render seguinte, a nova.
//   A. o clique aplica a duração e começa, com o MESMO texto e a MESMA análise; os 2 botões;
//   B. duplo clique e reentrada não despacham dois;
//   C. recusa de novo mostra a recusa, sem repetir; análise que falha ou para cedo não despacha;
//   D. saldo, qualidade, pacote caindo e o aviso da ordem colada continuam mandando;
//   E. o texto que pede "30-40 seconds" não leva a duração de volta a 60 (a mesma linha do handleAnalyze);
//   F. o recibo devolve a base byte a byte; o aviso de idle e o botão de saldo não mudaram;
//   M. mutantes ficam vermelhos.
// Rodar: node scripts/test-botao-35s-0411.mjs   (sem rede, sem custo)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const ROOT = path.resolve(import.meta.dirname, '..')
process.chdir(ROOT)
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const { createOfflineLoader } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/offline-ts-loader.mjs')).href)
const { semBotao35s0411, deltaBotao35s0411Exato, BOTAO_35S_0411 } = await import(pathToFileURL(path.join(ROOT, 'scripts/test-support/desfaz-botao-35s-0411.mjs')).href)

let verdes = 0
const falhas = []
const checa = (nome, c) => { if (c) { verdes++; console.log('  ok  ' + nome) } else { falhas.push(nome); console.log('  XX  ' + nome) } }
const lf = (t) => t.replace(/\r\n/g, '\n')
const GC_REL = 'app/(dashboard)/generate/GenerateClient.tsx'
const GC = lf(fs.readFileSync(GC_REL, 'utf8'))
const load = createOfflineLoader()
const { subidaQueOSaldoPaga } = load('@/lib/growth/motor15s')
const { readPastedDirectives } = load('@/lib/pastedDirectives')

const js = (code) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
const roda = (code, env) => { const n = Object.keys(env); return new Function(...n, js(code))(...n.map((k) => env[k])) }
const entre = (src, a, b) => { const i = src.indexOf(a); if (i < 0) return null; const j = src.indexOf(b, i + a.length); return j < 0 ? null : src.slice(i + a.length, j) }
const obriga = (v, nome) => { if (v === null) throw Error('trecho não achado: ' + nome); return v }

/** Os trechos reais, recortados do texto dado (o de hoje, a base ou um mutante). */
function trechos(gc) {
  const fim = '\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, '
  const antes1 = gc.indexOf('const segundos = expandState.suggestedDuration as number')
  const ini1 = gc.lastIndexOf('onClick={() => {', antes1)
  const clique1 = gc.slice(ini1 + 'onClick={() => {'.length, gc.indexOf('\n                          }}\n', antes1))
  const antes2 = gc.indexOf('setDuration(scriptTooShort.suggestedDuration as Duration)')
  const ini2 = gc.lastIndexOf('onClick={() => {', antes2)
  const clique2 = gc.slice(ini2 + 'onClick={() => {'.length, gc.indexOf('\n                      }}\n', antes2))
  return {
    fases: JSON.parse(obriga(entre(gc, 'const PROCESSING_PHASES: Phase[] = ', '\nfunction isProcessingPhase'), 'fases').replace(/'/g, '"').replace(/,\s*\]/, ']')),
    funcoes: entre(gc, '  function duracaoMenorEmCurso(): boolean {', '\n  // PUSH #38') === null ? '' : 'function duracaoMenorEmCurso(): boolean {' + entre(gc, '  function duracaoMenorEmCurso(): boolean {', '\n  // PUSH #38'),
    clique1, clique2,
    efeitoAnalise: obriga(entre(gc, 'useEffect(() => { // KINEO-FILME-GRATIS-COMECA-0211\n', fim + '[filmeGratisTick])'), 'efeito da análise'),
    efeitoDespacho: obriga(entre(gc, 'useEffect(() => { // KINEO-FILME-GRATIS-COMECA-0211 — despacho único depois da análise do filme grátis\n', fim + '[phase, error])'), 'efeito do despacho'),
    guardado: obriga(entre(gc, '  function handleGenerateGuarded() {', '\n  }\n\n  // ═══ KINEO-RECUSA-BOTAO-3110'), 'handleGenerateGuarded'),
  }
}

/** Uma tela: estado de React (só muda no flush), refs (na hora), e os efeitos reais. */
function tela(gc, inicial = {}) {
  const t = trechos(gc)
  const S = {
    phase: 'script_completion', duration: 60, error: 'recusa', prompt: 'prévia limpa', scriptMode: 'ai', tick: 0,
    expandedScript: null, scriptTooShort: { suggestedDuration: 35, targetSeconds: 60 }, expandState: { kind: 'still_short', suggestedDuration: 35 },
    ...inicial,
  }
  const R = {
    filmeGratisDespachoRef: { current: null }, generationInFlightRef: { current: false }, structuredScriptRef: { current: 'HOOK (0-2s): roteiro dela' },
    studioOneClickFiredRef: { current: false }, studioAutoFirePendingRef: { current: true }, verbatimOrderHoldRef: { current: inicial.hold === true },
    qualityFailureRef: { current: inicial.qualidade ?? null }, expandBaseRef: { current: '' }, expandCandidateRef: { current: null }, expandRoundsRef: { current: { key: '', used: 0 } },
  }
  const log = { analises: [], geracoes: [], modal: 0, eventos: [] }
  const roteiro = inicial.roteiro ?? 'ok'
  const setters = {}
  for (const [nome, chave] of [['setDuration', 'duration'], ['setPhase', 'phase'], ['setError', 'error'], ['setPrompt', 'prompt'], ['setScriptTooShort', 'scriptTooShort'], ['setExpandState', 'expandState'], ['setExpandedScript', 'expandedScript']]) setters[nome] = (v) => { S[chave] = v }
  const env = () => ({
    ...R, ...setters,
    phase: S.phase, duration: S.duration, error: S.error, prompt: S.prompt, scriptMode: S.scriptMode,
    expandedScript: S.expandedScript, expandState: S.expandState, scriptTooShort: S.scriptTooShort, sameFailureCount: 0,
    setExpandedIsRewrite() {}, setExpandedDurationAdjustment() {}, setFilmeGratisTick(f) { S.tick = f(S.tick) },
    isProcessingPhase: (p) => t.fases.includes(p),
    trackEvent: (n, m) => { log.eventos.push({ n, m }) },
    wallV1PackSyncing: inicial.pacote === true, WALL_V1_VERSION: 'v', outOfCredits: () => inicial.semSaldo === true, openOutOfCreditsModal: () => { log.modal++ },
    handleGenerate: () => { log.geracoes.push({ duration: S.duration, texto: R.structuredScriptRef.current, modo: S.scriptMode }); if (log.geracoes.length < 5) S.gerar = true }, // teto do teste: um laço aparece como 5 despachos, não como pilha estourada
    handleGenerateGuarded: () => { const e = env(); return roda(t.guardado, e) },
    handleAnalyze: async (texto, opts) => {
      log.analises.push({ texto, opts, durationVisto: S.duration })
      await null
      if (roteiro === 'para_cedo') return
      S.phase = 'analyzing'; flush()
      await null
      if (roteiro === 'erro') { S.error = 'Could not analyze'; S.phase = 'idle'; flush(); return }
      S.phase = 'options'; flush()
    },
    filmeGratisTick: S.tick,
  })
  let vistoPhase = S.phase, vistoError = S.error, vistoTick = S.tick
  function flush() {
    const mudouTick = S.tick !== vistoTick
    const mudou = S.phase !== vistoPhase || S.error !== vistoError
    vistoTick = S.tick; vistoPhase = S.phase; vistoError = S.error
    if (mudouTick) roda(t.efeitoAnalise, env())
    if (mudou) roda(t.efeitoDespacho, env())
    // a resposta do despacho, depois do render que o disparou
    if (S.gerar) {
      S.gerar = false
      S.phase = 'generating'; flush()
      if (inicial.resposta === 'recusa') {
        R.generationInFlightRef.current = false
        S.scriptTooShort = { suggestedDuration: 0, targetSeconds: S.duration }; S.phase = 'script_completion'; flush()
        // a tela volta a 'options' por outro motivo: nada pode redespachar sozinho
        S.phase = 'options'; flush()
      }
    }
  }
  const clique = (qual) => { roda(t.funcoes + '\n' + (qual === 1 ? t.clique1 : t.clique2), env()); flush() }
  const espera = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r)) }
  return { S, R, log, clique, espera, flush }
}

const ROTEIRO = 'HOOK (0-2s): A busy professional. MICRO REWARD 1: 6:30am. PAYOFF: and it starts again.'
async function cenario(gc, inicial, passos = async (x) => { x.clique(inicial?.botao ?? 1) }) {
  const x = tela(gc, inicial)
  await passos(x)
  await x.espera()
  return x
}

console.log('== A. o clique aplica a duração e começa ==')
{
  const a = await cenario(GC, { botao: 1, expandedScript: ROTEIRO })
  const op = a.log.analises[0]
  checa('A1 o botão depois do escritor analisa com 35 s, sem prévia, sem escritor, sem subida', op?.opts?.targetSeconds === 35 && op.opts.skipPreview === true && op.opts.structureFirst === false && op.opts.fixarDuracao === true)
  checa('A2 a análise roda no render seguinte: já vê 35 s na tela', op?.durationVisto === 35)
  checa('A3 o texto é o que estava na caixa de revisão, e o modo não muda', op?.texto === ROTEIRO && op.opts.scriptModeOverride === 'ai' && a.S.scriptMode === 'ai')
  checa('A4 despacha uma vez, em 35 s, com esse texto', a.log.geracoes.length === 1 && a.log.geracoes[0].duration === 35 && a.log.geracoes[0].texto === ROTEIRO)
  checa('A5 a tela da recusa fecha', a.S.scriptTooShort === null && a.S.expandState === null && a.S.expandedScript === null)
  checa('A6 o evento diz que este clique começa o filme', a.log.eventos.some((e) => e.n === 'script_short_used_shorter_duration' && e.m.seconds === 35 && e.m.starts_film === true && e.m.from_outcome === 'still_short'))
  const b = await cenario(GC, { botao: 2, expandState: null })
  checa('A7 o irmão, antes do escritor: mesma coisa, com o roteiro que a rota recebeu', b.log.analises[0]?.opts?.targetSeconds === 35 && b.log.analises[0].texto === 'HOOK (0-2s): roteiro dela' && b.log.geracoes.length === 1 && b.log.geracoes[0].duration === 35)
  checa('A8 o one-click do Studio não dispara por cima', a.R.studioOneClickFiredRef.current === true && a.R.studioAutoFirePendingRef.current === false)
  const label1 = GC.includes('Make it {expandState.suggestedDuration}s now ({costForDurationOption(expandState.suggestedDuration as Duration)} cr) — this text fits')
  const label2 = GC.includes('Make it {scriptTooShort.suggestedDuration}s now ({costForDurationOption(scriptTooShort.suggestedDuration as Duration)} cr)')
  checa('A9 os 2 rótulos dizem que começa agora e quanto custa, pela função que cobra', label1 && label2)
}

console.log('== B. duplo clique e reentrada ==')
{
  const d = await cenario(GC, { expandedScript: ROTEIRO }, async (x) => { x.clique(1); x.S.expandState = { kind: 'still_short', suggestedDuration: 15 }; x.clique(1); x.S.scriptTooShort = { suggestedDuration: 15, targetSeconds: 60 }; x.clique(2) })
  checa('B1 clique repetido (mesmo botão e o irmão): 1 análise, 1 despacho', d.log.analises.length === 1 && d.log.geracoes.length === 1 && d.log.geracoes[0].duration === 35)
  const e = await cenario(GC, { expandedScript: ROTEIRO }, async (x) => { x.R.generationInFlightRef.current = true; x.clique(1) })
  checa('B2 geração em voo: o clique não faz nada', e.log.analises.length === 0 && e.S.duration === 60 && e.S.scriptTooShort !== null)
  const f = await cenario(GC, { phase: 'generating', expandedScript: ROTEIRO })
  checa('B3 fase em processamento: o clique não faz nada', f.log.analises.length === 0 && f.S.duration === 60)
  const g = await cenario(GC, { botao: 2, expandState: null, prompt: '  ' }, async (x) => { x.R.structuredScriptRef.current = null; x.clique(2) })
  checa('B4 sem texto: não começa nada', g.log.analises.length === 0 && g.log.geracoes.length === 0)
  const h = await cenario(GC, { duration: 35, expandedScript: ROTEIRO })
  checa('B5 a duração que acabou de ser recusada não recomeça', h.log.analises.length === 0 && h.log.geracoes.length === 0)
}

console.log('== C. recusa de novo ==')
{
  const c = await cenario(GC, { expandedScript: ROTEIRO, resposta: 'recusa' })
  checa('C1 recusou de novo: 1 despacho só, a tela da recusa fica, nada repete', c.log.geracoes.length === 1 && c.R.filmeGratisDespachoRef.current === null)
  const e = await cenario(GC, { expandedScript: ROTEIRO, roteiro: 'erro' })
  checa('C2 análise com erro: o erro fica na tela, nada é despachado', e.log.geracoes.length === 0 && e.S.error === 'Could not analyze' && e.R.filmeGratisDespachoRef.current === null)
  const p = await cenario(GC, { expandedScript: ROTEIRO, roteiro: 'para_cedo' })
  checa('C3 análise que parou antes de começar (link, portão): nada é despachado e o próximo clique vale', p.log.geracoes.length === 0 && p.R.filmeGratisDespachoRef.current === null)
}

console.log('== D. saldo e portões continuam mandando ==')
{
  const s = await cenario(GC, { expandedScript: ROTEIRO, semSaldo: true })
  checa('D1 sem saldo para a duração: abre o modal, 0 despacho', s.log.modal === 1 && s.log.geracoes.length === 0)
  const q = await cenario(GC, { expandedScript: ROTEIRO, qualidade: { reason: 'x' } })
  checa('D2 falha de qualidade pendente: 0 despacho', q.log.geracoes.length === 0)
  const k = await cenario(GC, { expandedScript: ROTEIRO, pacote: true })
  checa('D3 pacote ainda caindo: 0 despacho', k.log.geracoes.length === 0)
  const o = await cenario(GC, { expandedScript: ROTEIRO, hold: true })
  checa('D4 aviso da ordem colada: para em options, com o Generate de sempre', o.log.geracoes.length === 0 && o.S.phase === 'options')
  checa('D5 o despacho passa pelo handleGenerateGuarded', trechos(GC).efeitoDespacho.includes('handleGenerateGuarded()') && !/[^d]handleGenerate\(\)/.test(trechos(GC).efeitoDespacho))
}

console.log('== E. o texto que pede 30-40 s ==')
{
  const TEXTO = '2. "A Day in the Life of a Busy Professional"\n\nLength: 30-40 seconds\n\nFollow one person from morning to night.'
  const linha = obriga(entre(GC, '      const subidaColada = ', ' // KINEO-MOTOR-15S-1510'), 'subidaColada')
  const subida = (opts) => roda('return ' + linha, {
    leituraColada: readPastedDirectives(TEXTO, [15, 35, 60, 90]), opts, subidaQueOSaldoPaga, duration: 35, opcoesDeDuracao: [15, 35, 60, 90].map((value) => ({ value })),
    credits: 97, contaPagaNaSubida: true, custoDaOpcao: (d) => d,
  })
  checa('E1 controle: sem a trava, a mesma linha sobe de 35 para 60 (a recusa voltaria)', subida(undefined)?.para === 60)
  checa('E2 com o fixarDuracao que este clique manda: fica em 35', subida({ fixarDuracao: true }) === null)
  const autofit = GC.includes("vereditoAnalise?.kind === 'up' && !opts?.fixarDuracao")
  checa('E3 o autofit da análise respeita a mesma trava', autofit)
}

console.log('== F. recibo e vizinhos ==')
{
  const baseSha = BOTAO_35S_0411.base
  const baseGc = lf(execFileSync('git', ['show', `${baseSha}:${GC_REL}`], { encoding: 'utf8', maxBuffer: 64 << 20 }))
  checa('F1 sem a camada, o GenerateClient é a base byte a byte', semBotao35s0411(GC, GC_REL) === baseGc)
  checa('F2 o delta é exatamente o do recibo', deltaBotao35s0411Exato(GC, baseGc, GC_REL) === true)
  checa('F3 edição desconhecida reprova', deltaBotao35s0411Exato(GC + '\n// a mais\n', baseGc, GC_REL) === false)
  checa('F4 todo trecho novo leva a marca ou é só o clique marcado', BOTAO_35S_0411.scope[GC_REL].hunks.every((h) => h.after.includes('KINEO-BOTAO-35S-0411')))
  const velho = await cenario(baseGc, { expandedScript: ROTEIRO })
  checa('F5 na base o defeito existia: duração muda, 0 análise, 0 filme, tela parada', velho.S.duration === 35 && velho.S.phase === 'idle' && velho.log.analises.length === 0 && velho.log.geracoes.length === 0)
  const aviso = (src) => entre(src, "void trackEvent('refusal_notice_action_clicked'", 'Make it {refusalNotice.suggestedDuration}s')
  checa('F6 o aviso de recusa antiga ("for your next film") não mudou: o texto daquela tentativa pode não estar na caixa', aviso(GC) !== null && aviso(GC) === aviso(baseGc))
  checa('F7 o botão de saldo do seletor não mudou', GC.includes('Make it {maxAffordableDuration}s ({costForDurationOption(maxAffordableDuration)} cr) →'))
  const regua = (src) => src.split('\n').filter((l) => /largestFittingDuration\(|minCoverageFor\(/.test(l)).join('\n')
  checa('F8 nenhuma linha de régua mudou no GenerateClient', regua(GC) === regua(baseGc))
  const tocados = execFileSync('git', ['diff', '--name-only', baseSha, '--', 'lib/pastedScript.ts', 'lib/pastedDirectives.ts', 'lib/scriptParser.ts', 'lib/expandPolicy.ts', 'lib/narrationFit.ts', 'lib/speechRate.ts', 'app/api'], { encoding: 'utf8' }).trim()
  checa('F9 fora de escopo intocado (régua, motores, rotas)', tocados === '')
}

console.log('== M. mutantes ==')
{
  const troca = (a, b) => { if (!GC.includes(a)) throw Error('mutante sem alvo: ' + a); return GC.split(a).join(b) }
  const m1 = await cenario(troca('comecarNaDuracaoMenor(segundos) // KINEO-BOTAO-35S-0411', ''), { expandedScript: ROTEIRO })
  checa('M1 sem chamar o generate: o beco volta', m1.log.geracoes.length === 0)
  const m1b = await cenario(troca('comecarNaDuracaoMenor(scriptTooShort.suggestedDuration) // KINEO-BOTAO-35S-0411', ''), { botao: 2, expandState: null })
  checa('M2 sem chamar no irmão: o beco volta', m1b.log.geracoes.length === 0)
  const dois = async (x) => { x.clique(1); x.S.expandState = { kind: 'still_short', suggestedDuration: 15 }; x.clique(1) } // 2º clique com outra duração: a trava da mesma duração não mascara a guarda
  const m3 = await cenario(troca('if (duracaoMenorEmCurso()) return // KINEO-BOTAO-35S-0411', ''), { expandedScript: ROTEIRO }, dois)
  checa('M3 sem a guarda de reentrada: duplo clique analisa duas vezes', m3.log.analises.length === 2)
  const m4 = await cenario(troca('filmeGratisDespachoRef.current = null // plano, recusa ou erro: o próximo clique é dela', ''), { expandedScript: ROTEIRO, resposta: 'recusa' })
  checa('M4 sem soltar o despacho: a recusa vira laço (2+ despachos)', m4.log.geracoes.length >= 2)
  const m5 = await cenario(troca("if (phase === 'options' && !error && !verbatimOrderHoldRef.current) handleGenerateGuarded()", "if (phase === 'options' && !error && !verbatimOrderHoldRef.current) handleGenerate()"), { expandedScript: ROTEIRO, semSaldo: true })
  checa('M5 pulando o handleGenerateGuarded: sem saldo, despacharia', m5.log.geracoes.length === 1 && m5.log.modal === 0)
  const m6 = await cenario(troca('targetSeconds: p.segundos, fixarDuracao: true })', 'targetSeconds: p.segundos })'), { expandedScript: ROTEIRO })
  checa('M6 sem fixarDuracao: a análise pode subir de volta para 60', m6.log.analises[0]?.opts?.fixarDuracao !== true)
  const m7 = await cenario(troca(" && !verbatimOrderHoldRef.current) handleGenerateGuarded()", ") handleGenerateGuarded()"), { expandedScript: ROTEIRO, hold: true })
  checa('M7 sem o aviso da ordem colada: gastaria por cima do aviso', m7.log.geracoes.length === 1)
  const m8 = await cenario(troca('setDuration(segundos as Duration)', ''), { expandedScript: ROTEIRO })
  checa('M8 sem aplicar a duração: despacharia em 60 e a recusa voltaria', m8.log.geracoes[0]?.duration === 60)
  const m9 = await cenario(troca('if (!texto || segundos === duration) return', 'if (!texto) return'), { duration: 35, expandedScript: ROTEIRO })
  checa('M9 sem a trava da mesma duração: repetiria o pedido recusado', m9.log.geracoes.length === 1)
}

console.log(`\n${falhas.length === 0 ? 'OK' : 'FALHOU'}: ${verdes} verdes, ${falhas.length} vermelhas`)
if (falhas.length) process.exit(1)
