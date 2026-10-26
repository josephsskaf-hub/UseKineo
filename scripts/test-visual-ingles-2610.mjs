// [TRAVA 8.2 — vai do fundador 26/10 "precisa reconhecer todas as línguas, temos vídeos de todos os países"] KINEO-VISUAL-INGLES-2610
// Guardião da regra "campos visuais sempre em inglês" no escritor de cenas (lib/runway.ts):
//   A. filme em outra língua: a narração na língua do filme E description/searchKeywords/stockSearchQuery/negativeVisualPrompt/
//      visualIntent em INGLÊS (o motor de imagem/vídeo e o detector de personagens leem inglês — vale para as 37 línguas);
//   B. filme em inglês: languageRule continua '' (o prompt do escritor fica byte a byte o de antes);
//   C. a regra vive no languageRule, que entra no campo 8 (a posição que os guardiões antigos travam);
//   D. desfaz exato + mutante.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { semVisualIngles2610, VISUAL_INGLES_2610, MARCA_VISUAL_INGLES_2610 as MARCA } from './test-support/desfaz-visual-ingles-2610.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 })
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

const rw = rd('lib/runway.ts')
const linha = rw.split('\n').find((l) => l.includes('const languageRule = ')) ?? ''
// executa a linha real com um LANGUAGE_NAMES mínimo
const regra = (language) => new Function('writerOptions', 'LANGUAGE_NAMES', `${linha.replace(/\/\/.*$/, '')}; return languageRule`)({ language }, { pt: 'Brazilian Portuguese', ja: 'Japanese', ar: 'Arabic', en: 'English' })
checa('A1 português: narração em português', regra('pt').includes('Write this narration line in Brazilian Portuguese.'))
checa('A2 português: campos visuais em INGLÊS (description, stockSearchQuery, negativeVisualPrompt, visualIntent)', /description, searchKeywords, stockSearchQuery, negativeVisualPrompt, visualIntent\) MUST be written in ENGLISH/.test(regra('pt')))
checa('A3 vale para qualquer língua (japonês, árabe)', ['ja', 'ar'].every((l) => /MUST be written in ENGLISH/.test(regra(l))))
checa('A4 a legenda ("caption") fica na língua do filme', /except "caption"/.test(regra('pt')))
checa('B1 inglês: languageRule vazio (prompt byte a byte o de antes)', regra('en') === '' && regra(undefined) === '')
checa('C1 languageRule continua no fim do campo 8', /\.\$\{languageRule\}\n9\. "caption"/.test(rw))

const commits = git('log', '--format=%H', `--grep=${MARCA}`).trim().split('\n').filter(Boolean)
const base = commits.length ? `${commits[commits.length - 1]}^` : 'HEAD'
const baseSha = git('rev-parse', base).trim()
const f = 'lib/runway.ts'
const baseTxt = lf(git('show', `${baseSha}:${f}`))
checa(`D1 base da tabela = base real (${baseSha.slice(0, 9)})`, VISUAL_INGLES_2610.base === baseSha)
checa('D2 sem a camada = byte a byte a base', semVisualIngles2610(rw, f) === baseTxt)
checa('D3 idempotente e preserva CRLF', semVisualIngles2610(baseTxt, f) === baseTxt && semVisualIngles2610(rw.replace(/\n/g, '\r\n'), f) === baseTxt.replace(/\n/g, '\r\n'))
checa('D4 todo trecho novo leva a marca', VISUAL_INGLES_2610.scope[f].hunks.every((h) => h.after.includes(MARCA)))
const linhaBase = baseTxt.split('\n').find((l) => l.includes('const languageRule = ')) ?? ''
const regraBase = new Function('writerOptions', 'LANGUAGE_NAMES', `${linhaBase}; return languageRule`)({ language: 'pt' }, { pt: 'Brazilian Portuguese' })
checa('M1 base (camada desfeita): nenhuma ordem de inglês nos visuais (A2 seria vermelho)', !/ENGLISH/.test(regraBase) && regraBase.includes('Write this narration line in Brazilian Portuguese.'))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log(falhas.map((x) => ' - ' + x).join('\n')); process.exit(1) }
