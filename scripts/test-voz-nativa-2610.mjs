// [TRAVA 8.2 — vai do fundador 26/10 "2A"] KINEO-VOZ-NATIVA-2610 — guardião da voz nativa em português e espanhol.
// Prova, sem rede, com o código REAL de lib/textLanguage.ts e lib/ttsFallback.ts (ttsFallbackInput):
//   A. pt e es passam a ser narradas pela MiniMax 2.8 HD com a voz nativa (Portuguese_ConfidentWoman, Spanish_ConfidentWoman);
//   B. en continua na tts-1-hd da casa (usesMiniMaxNarration('en') = false); o resto das línguas MiniMax segue igual;
//   C. o corpo enviado à fal leva voice_id nativo, language_boost certo e a velocidade dentro de 0,7–1,3 (o corretivo funciona);
//   D. desfaz exato + mutantes.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { semVozNativa2610, VOZ_NATIVA_2610, MARCA_VOZ_NATIVA_2610 as MARCA } from './test-support/desfaz-voz-nativa-2610.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 })
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const roda = (src, mods = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, module: { exports: exp }, require: (id) => mods[id] ?? new Proxy({}, { get: () => () => undefined }), console, process: { env: {} }, Intl })
  return exp
}
const T_SRC = rd('lib/textLanguage.ts')
const carregar = (tsrc) => {
  const T = roda(tsrc)
  const F = roda(rd('lib/ttsFallback.ts'), { '@/lib/textLanguage': T })
  return { T, F }
}

console.log('== atual ==')
{
  const { T, F } = carregar(T_SRC)
  checa('A1 pt narrada pela MiniMax', T.usesMiniMaxNarration('pt') === true)
  checa('A2 es narrada pela MiniMax', T.usesMiniMaxNarration('es') === true)
  checa('A3 voz nativa: pt = Portuguese_ConfidentWoman, es = Spanish_ConfidentWoman', T.minimaxVoiceFor('pt') === 'Portuguese_ConfidentWoman' && T.minimaxVoiceFor('es') === 'Spanish_ConfidentWoman')
  checa('B1 en continua na voz da casa (tts-1-hd)', T.usesMiniMaxNarration('en') === false)
  checa('B2 total de línguas MiniMax = 22 de antes + pt + es', T.NARRATION_LANGUAGES.filter((l) => l.minimaxPrimary).length === 24)
  if (typeof F.ttsFallbackInput === 'function') {
    const pt = F.ttsFallbackInput('Uma menina encontra uma chave azul.', 'pt', 1.5)
    checa('C1 corpo pt: voice_id nativo, boost Portuguese, velocidade limitada a 1,3', pt.voice_setting?.voice_id === 'Portuguese_ConfidentWoman' && pt.language_boost === 'Portuguese' && pt.voice_setting?.speed === 1.3 && pt.output_format === 'url')
    const en = F.ttsFallbackInput('A girl finds a blue key.', 'en', 1)
    checa('C2 corpo en (plano B da OpenAI): sem voice_setting forçado', en.voice_setting === undefined)
  } else checa('C0 ttsFallbackInput carregou', false)
}
console.log('== D. desfaz exato ==')
{
  const commits = git('log', '--format=%H', `--grep=${MARCA}`).trim().split('\n').filter(Boolean)
  const base = commits.length ? `${commits[commits.length - 1]}^` : 'HEAD'
  const baseSha = git('rev-parse', base).trim()
  const f = 'lib/textLanguage.ts'
  const baseTxt = lf(git('show', `${baseSha}:${f}`))
  checa(`D1 base da tabela = base real (${baseSha.slice(0, 9)})`, VOZ_NATIVA_2610.base === baseSha)
  checa('D2 sem a camada = byte a byte a base', semVozNativa2610(T_SRC, f) === baseTxt)
  checa('D3 idempotente e preserva CRLF', semVozNativa2610(baseTxt, f) === baseTxt && semVozNativa2610(T_SRC.replace(/\n/g, '\r\n'), f) === baseTxt.replace(/\n/g, '\r\n'))
  checa('D4 todo trecho novo leva a marca', VOZ_NATIVA_2610.scope[f].hunks.every((h) => h.after.includes(MARCA)))
  const { T } = carregar(semVozNativa2610(T_SRC, f))
  checa('M1 base (camada desfeita): pt e es voltam à tts-1-hd (A1/A2 seriam vermelhos)', T.usesMiniMaxNarration('pt') === false && T.usesMiniMaxNarration('es') === false && T.NARRATION_LANGUAGES.filter((l) => l.minimaxPrimary).length === 22)
  const m2 = T_SRC.replace("minimaxBoost: 'Spanish', minimaxPrimary: true,", "minimaxBoost: 'Spanish',")
  checa('M2 aplicado (es sem voz nativa)', m2 !== T_SRC)
  checa('M2 → A2 vermelho', carregar(m2).T.usesMiniMaxNarration('es') === false)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log(falhas.map((x) => ' - ' + x).join('\n')); process.exit(1) }
