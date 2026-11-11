// KINEO-K4-SEMPRE-0511 [TRAVA 8.2 — fundador 05/11 "vai"] — guardião: fala longa no filme grátis é encurtada e medida de novo ANTES do POST pago do Kling 4.
// O Seedance só entra quando encurtar falha ou não há medida. Só apaga e encurta; a voz decide; o texto só troca com a voz confirmando. Sem rede: o modelo e a voz são dublês.
// Rodar: node scripts/test-k4-sempre-0511.mjs
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
const LIB = 'lib/kling4TrialEncaixe.ts', ROTA = 'app/api/generate-video-cinematic/route.ts', STATUS = 'app/api/compose/status/[renderId]/route.ts', CLAIM = 'lib/kling4TrialClaim.ts', TELA = 'app/(dashboard)/generate/GenerateClient.tsx', COPY = 'lib/ui/refinementCopy.json'
const AVISO = 'We shortened your text to fit this free 15-second film. The 60-second version tells all of it.'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function monta(fonte) {
  const mod = { exports: {} }
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const dublos = {
    '@/lib/cinematic/sujeitoObrigatorio': { perguntaSemantica: async () => ({ ok: false }) },
    '@/lib/kling4TrialScript': { orcamentoPorSecao: (p, alvo) => p.map(() => Math.floor(alvo / p.length)) },
    '@/lib/textLanguage': { narrationWordCount: (t) => String(t).trim().split(/\s+/).filter(Boolean).length },
  }
  vm.runInNewContext(js, { exports: mod.exports, module: mod, require: (n) => dublos[n], console, Date })
  return mod.exports
}
const fala = (seconds) => ({ seconds, maxSeconds: 15.5, cabe: seconds !== null && seconds <= 15.5, reason: seconds === null ? 'narration_unmeasured_kling4' : seconds <= 15.5 ? 'fits' : 'narration_over_kling4_15s' })
const ANTES = ['One man stopped World War 3 by doing nothing at all.', 'On September 26, 1983, he ignored a false nuclear warning.', 'He prevented a war and stayed quiet for 30 years.']
const CURTO = ['One man stopped World War 3.', 'On September 26, 1983, he ignored a warning.', 'He prevented a war, quiet for 30 years.']
const MAIS_CURTO = ['One man stopped War 3.', 'On September 26, 1983, he ignored warning.', 'He prevented war, quiet for 30 years.']
const AINDA_MAIS = ['One man stopped War.', 'On September 26, 1983, ignored warning.', 'Prevented war, quiet for 30 years.']

async function prova(fonte = ler(LIB), rota = ler(ROTA), status = ler(STATUS), claim = ler(CLAIM), tela = ler(TELA)) {
  const e = []
  const M = monta(fonte)
  if (M.alvoDoEncaixe(40, 20) !== 29) e.push('A1 alvo pelo ritmo medido')
  const serve = (d, a = ANTES) => M.encaixeServe(a, d, 'en')
  if (!serve(CURTO)) e.push('B1 versão só apagando fica')
  if (serve(CURTO.slice(0, 2))) e.push('B2 perdeu cena')
  if (serve(ANTES)) e.push('B3 não encurtou')
  if (serve(['One man stopped World War 3.', 'On September 26, 1999, he ignored a warning.', 'He prevented a war, quiet for 30 years.'])) e.push('B4 número novo')
  if (serve(['A brave soldier saved everyone tonight.', 'Nobody in Moscow believed this strange story.', 'He prevented a war, quiet for 30 years.'])) e.push('B5 palavras inventadas')
  if (serve(['One man stopped World War 3.', 'On September 26, 1983, he ignored a', 'He prevented a war, quiet for 30 years.'])) e.push('B6 frase cortada')
  if (serve(['One man stopped World War 3.', 'On September 26, 1983, he ignored a warning.', 'He prevented a war.'])) e.push('B7 perdeu a revelação')
  if (serve(['One.', 'On September 26, 1983, he ignored a warning.', 'He prevented a war, quiet for 30 years.'])) e.push('B8 cena sem fala')
  const roda = (o) => M.encaixarFalaNoKling4({ falas: ANTES, fala: fala(18), language: 'en', medir: async () => fala(14.5), encurtar: async () => CURTO, ...o })
  const r1 = await roda({})
  if (!r1 || r1.falas.join(' ') !== CURTO.join(' ') || r1.fala.seconds !== 14.5 || r1.rastro.rodadas !== 1 || r1.rastro.de.segundos !== 18) e.push('C1 encurta, a voz confirma, grava o rastro')
  let n = 0
  const r2 = await M.encaixarFalaNoKling4({ falas: ANTES, fala: fala(18), language: 'en', medir: async () => (++n === 1 ? fala(16) : fala(15)), encurtar: async () => (n === 0 ? CURTO : MAIS_CURTO) })
  if (!r2 || r2.rastro.rodadas !== 2 || r2.falas.join(' ') !== MAIS_CURTO.join(' ')) e.push('C3 ainda longo: nova rodada a partir do encurtado')
  n = 0
  const nunca = await M.encaixarFalaNoKling4({ falas: ANTES, fala: fala(18), language: 'en', medir: async () => fala(16), encurtar: async () => [CURTO, MAIS_CURTO, AINDA_MAIS][n++] })
  if (nunca) e.push('C4 nunca coube: reserva')
  if (await roda({ medir: async () => fala(null) })) e.push('C5 sem medida depois de encurtar: reserva')
  if (await roda({ medir: async () => fala(9) })) e.push('C6 curta demais: não adota')
  if (await roda({ encurtar: async () => null })) e.push('C7 modelo falhou: reserva')
  if (await roda({ encurtar: async () => { throw new Error('x') } })) e.push('C8 erro não sobe')
  if (await roda({ encurtar: async () => ['inventado por completo aqui.', 'inventado por completo aqui.', 'inventado por completo aqui.'] })) e.push('C9 resposta ruim: reserva')
  if (await roda({ fala: fala(null) })) e.push('C10 sem medida inicial não encurta')
  let t = 0
  if (await roda({ agora: () => (t += 40_000), prazoMs: 30_000 })) e.push('C11 respeita o prazo')
  // D) a rota: dentro do bloco, medir é medir → nova medida → encurtar; tudo antes do POST pago; o texto só troca com a voz confirmando
  const iEmbrulho = rota.indexOf('const medirFalaDoKling4Trial = async (a: Parameters<typeof medirFalaK4Crua>[0]): Promise<FalaK4> => {')
  const iMedir = rota.indexOf('const kling4Fala: FalaK4 | null = kling4TrialCandidate')
  const iPagar = rota.indexOf('kling4Trial = await orchestrateKling4Trial({')
  if (!(iEmbrulho > 0 && iMedir > iEmbrulho && iPagar > iMedir)) e.push('D1 o embrulho vem antes da medida e do POST pago')
  const bloco = rota.slice(iEmbrulho, iMedir)
  const iCrua = bloco.indexOf('let fala = await medirFalaK4Crua(a)'), iRetentar = bloco.indexOf('if (fala.seconds === null) fala = await medirFalaK4Crua({ ...a, prazoMs: 15_000 })'), iEncaixe = bloco.indexOf('const encaixe = await encaixarFalaNoKling4(')
  if (!(iCrua > 0 && iRetentar > iCrua && iEncaixe > iRetentar)) e.push('D1 a ordem medir, nova medida, encurtar')
  if (!/if \(!encaixe\) return fala[\s\S]*s\.voiceover = encaixe\.falas\[i\]; kling4Timing\.voiceovers\[i\] = encaixe\.falas\[i\][\s\S]*parsedScript\.narration = encaixe\.falas\.join\(' '\)[\s\S]*return encaixe\.fala/.test(bloco)) e.push('D2 fala, tempo e voz trocam juntos, só com o encaixe confirmado')
  if (!/\.narration_refit = kling4Encaixe\.r\.rastro/.test(rota)) e.push('D3 rastro no claim')
  if (!/kling4Trial = \{ engineUsed: 'seedance15_fallback', costUsd: 0, reason: kling4Fala && !kling4Fala\.cabe \? kling4Fala\.reason/.test(rota)) e.push('D4 a reserva continua')
  // E) a tela diz a verdade
  if (!/kling4TrialFalaEncurtada\(resp\) \? \{ engine_note: 'narration_shortened' \}/.test(status)) e.push('E1 status avisa')
  if (!/kling4TrialFalaEncurtada[\s\S]*!== 'kling4'\) return false[\s\S]*narration_refit/.test(claim)) e.push('E2 só em filme Kling 4 encurtado')
  if (!tela.includes('{textoEncurtadoK4 ? <p data-kling4-shortened-note') || !tela.includes(AVISO) || !tela.includes("setTextoEncurtadoK4(data.engine_note === 'narration_shortened')")) e.push('E3 tela mostra o aviso')
  return e
}
const r0 = await prova()
ok(r0.length === 0, `confere (${r0.join(' | ') || 'ok'})`)
const copia = JSON.parse(fs.readFileSync(COPY, 'utf8'))
const linguas = Object.keys(copia)
ok(linguas.length === 16 && linguas.every((l) => typeof copia[l][AVISO] === 'string' && copia[l][AVISO].includes('15') && copia[l][AVISO].includes('60')), 'aviso nas 16 línguas, com os dois tempos')

const L = ler(LIB), R = ler(ROTA), C = ler(CLAIM), S = ler(STATUS), T = ler(TELA)
const MUT = [
  ['alvo ignora a medida', /A1/, () => [L.replace('(palavras * K4_ALVO_DO_ENCAIXE_SEGUNDOS) / segundos', 'palavras')]],
  ['aceita número novo', /B4/, () => [L.replace('if (novas.some((w) => /\\p{N}/u.test(w) && !velhas.has(w))) return false', '')]],
  ['aceita texto inventado', /B5/, () => [L.replace('if (novas.filter((w) => !velhas.has(w)).length > novas.length * 0.1) return false', '')]],
  ['aceita frase cortada', /B6/, () => [L.replace(' || !FIM_DE_FRASE.test(f)', '')]],
  ['aceita perder a revelação', /B7/, () => [L.replace('return !fortes.length || fortes.filter((w) => finalNovo.has(w)).length / fortes.length >= 1 / 3', 'return true').replace('if (fortes.some((w) => /\\p{N}/u.test(w) && !finalNovo.has(w))) return false', '')]],
  ['adota sem a voz confirmar', /C4/, () => [L.replace('if (medida.cabe) {', 'if (true) {')]],
  ['fala curta demais passa', /C6/, () => [L.replace("if (medida.seconds < K4_PISO_DO_ENCAIXE_SEGUNDOS) return falha('curto_demais', { rodada, segundos: medida.seconds }) // KINEO-K4-ENCAIXE-MOTIVO-1111", '') /* KINEO-K4-ENCAIXE-MOTIVO-1111: a linha agora relata o motivo */]],
  ['sem prazo', /C11/, () => [L.replace("if (agora() - inicio >= prazo) return falha('prazo', { rodada }) // KINEO-K4-ENCAIXE-MOTIVO-1111", '') /* KINEO-K4-ENCAIXE-MOTIVO-1111 */]],
  ['rota paga antes de encurtar', /D1/, () => [L, R.replace('const medirFalaDoKling4Trial = async (a: Parameters<typeof medirFalaK4Crua>[0]): Promise<FalaK4> => {', 'const semEmbrulho = async (a: Parameters<typeof medirFalaK4Crua>[0]): Promise<FalaK4> => {')]],
  ['voz sem nova tentativa', /D1/, () => [L, R.replace('if (fala.seconds === null) fala = await medirFalaK4Crua({ ...a, prazoMs: 15_000 })', '')]],
  ['fala troca e o tempo não', /D2/, () => [L, R.replace('s.voiceover = encaixe.falas[i]; kling4Timing.voiceovers[i] = encaixe.falas[i]', 's.voiceover = encaixe.falas[i]')]],
  ['verbatim fica com o texto velho', /D2/, () => [L, R.replace("if (verbatim && parsedScript.narration) parsedScript.narration = encaixe.falas.join(' ')", '')]],
  ['sem reserva', /D4/, () => [L, R.replace("kling4Trial = { engineUsed: 'seedance15_fallback', costUsd: 0, reason: kling4Fala", "kling4Trial = { engineUsed: 'kling4', costUsd: 0, reason: kling4Fala")]],
  ['tela sem aviso', /E3/, () => [L, R, S, C, T.replace('{textoEncurtadoK4 ? <p data-kling4-shortened-note', '{false ? <p data-kling4-shortened-note')]],
]
for (const [nome, esp, f] of MUT) {
  const args = f()
  const mudou = args[0] !== L || (args[1] ?? R) !== R || (args[4] ?? T) !== T
  let e; try { e = await prova(...args) } catch (x) { e = ['estourou ' + x.message] }
  ok(mudou && e.some((m) => esp.test(m)), `mutante "${nome}" fica vermelho`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
