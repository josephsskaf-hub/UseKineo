// KINEO-VIGIA-DESCRICAO / KINEO-VIGIA-ERA — 2026-09-11 (vigia dos motores, rotação 16:30)
//
// Dois filmes reais de conta externa, mesma tarde, mesmo defeito de família:
// a camada visual escrita pelo GPT (generateCinematicDescriptions) INVENTA o
// que a história não diz, e o código confia nela.
//
//   802f024e (Seedance, 19:02 UTC): o descritor devolveu 2 descrições para 5
//   cenas; as cenas 3-5 subiram para a fal com o pedaço CRU da narração como
//   prompt visual ("...negative prompt no clones..., faceless cinematic b-roll").
//   c636e7a0 (Seedance, 19:33 UTC, conto de terror em PT-BR, telefone que
//   recebe MENSAGEM, apartamento): 5 de 7 descrições inventaram época e lugar
//   (rotary phone 1960s, Victorian home, Nokia 3310, Winchester Mystery House,
//   1910 New England farmhouse, motel 1970s). O "1910" casou com ERA_YEAR_RE
//   — que lia aiPrompt/description — e as 7 cenas subiram com "period piece
//   set strictly in the year 1910, no modern objects".
//
// O que fica protegido:
//   1. o descritor faz uma SEGUNDA chamada cobrando EXACTLY N antes de o
//      chamador cair no texto cru;
//   2. o descritor é proibido de inventar lugar real/década/marca fora da
//      narração; sem era = presente;
//   3. a era vem SÓ das palavras da história (tema + fala), nunca de
//      aiPrompt/description.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const rt = rd('app/api/generate-video-cinematic/route.ts')
const conta = (s) => rt.split(s).length - 1

console.log('== 1. o descritor cobra a contagem antes de cair no texto cru ==')
checa('laço de 2 tentativas em generateCinematicDescriptions', /let best: string\[\] = \[\]\n\s*for \(let tentativa = 0; tentativa < 2; tentativa\+\+\) \{/.test(rt))
checa('segunda chamada pede EXACTLY N, em ordem', /Return EXACTLY \$\{scenes\.length\} descriptions, one per scene, in order\./.test(rt))
checa('primeira chamada usa a mensagem original; a segunda acrescenta a cobrança', /content: tentativa === 0 \? userMsg : `\$\{userMsg\}\\n\\nYour previous answer had \$\{best\.length\} descriptions\./.test(rt))
checa('guarda a MELHOR resposta (mais descrições não vazias), nunca a última', /if \(got\.filter\(Boolean\)\.length > best\.filter\(Boolean\)\.length\) best = got/.test(rt))
checa('para quando cobre todas as cenas; devolve best', /if \(best\.filter\(Boolean\)\.length >= scenes\.length\) break/.test(rt) && /\n  return best\n\}/.test(rt))
checa('a conversão do laço ainda é executável (o corpo transpila e fecha)', (() => {
  const i = rt.indexOf('async function generateCinematicDescriptions(')
  const j = rt.indexOf('\n}\n', i)
  const src = rt.slice(i, j + 3)
  try { ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }); return /return best\n\}/.test(src) } catch { return false }
})())

console.log('== 2. o descritor não inventa lugar, época nem marca ==')
checa('regra: NEVER add a real-world landmark/named house/city/decade/year/brand/model fora da narração', /- NEVER add a real-world landmark, named house, city, decade, year, brand or model that the narration or topic does not mention/.test(rt))
checa('regra: sem era na narração = PRESENT-DAY, telefone com mensagem = smartphone', /If the narration gives no era, the setting is PRESENT-DAY with present-day objects \(a phone that receives a text message is a smartphone, never a rotary phone\)/.test(rt))
checa('regra: um cenário consistente entre cenas', /Keep one consistent setting across scenes unless the narration moves\./.test(rt))
checa('a regra vive DENTRO do prompt de sistema do descritor (antes do "Include a camera move")', rt.indexOf('- NEVER add a real-world landmark') < rt.indexOf('- Include a camera move (aerial, slow push-in, tracking, pan, or macro)') && rt.indexOf('- NEVER add a real-world landmark') > rt.indexOf('You are a cinematographer.'))

console.log('== 3. a era vem das palavras da história, nunca da camada visual ==')
checa('eraLockSuffix lê tema + fala (voiceover) e NADA mais', /const eraSuffix = eraLockSuffix\(\n\s*`\$\{prompt\} \$\{scenes\.map\(\(s\) => s\.voiceover \?\? ''\)\.join\(' '\)\}`,\n\s*\)/.test(rt))
checa('aiPrompt e description NÃO entram na detecção de era', !/eraLockSuffix\([\s\S]{0,200}s\.aiPrompt/.test(rt) && !/eraLockSuffix\([\s\S]{0,200}s\.description/.test(rt))
checa('só existe UMA chamada de eraLockSuffix no caminho (comentário + declaração + 1 uso)', conta('const eraSuffix = eraLockSuffix(') === 1 && conta('= eraLockSuffix(') === 1)
// Executa eraLockSuffix de verdade com o caso real: a fala em PT-BR com "3h17" não abre era;
// e a descrição "1910 New England farmhouse", que ANTES disparava, agora fica de fora por construção.
{
  const i = rt.indexOf('const ERA_YEAR_RE')
  const j = rt.indexOf('\n}\n', rt.indexOf('function eraLockSuffix'))
  const js = ts.transpileModule(rt.slice(i, j + 3) + '\nexports.eraLockSuffix = eraLockSuffix', { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp })
  const fala = 'Eram exatamente 3h17 da madrugada quando o telefone de Lucas começou a tocar. Dessa vez, apareceu uma mensagem: Não atenda.'
  const descricaoInventada = 'A close-up of a tarnished brass peephole on a rustic door of a 1910 New England farmhouse'
  checa('caso real: a fala de hoje (3h17, mensagem no telefone) NÃO abre era', exp.eraLockSuffix(fala) === '')
  checa('caso real: a descrição inventada "1910 New England farmhouse" ABRIRIA era 1910 (o defeito antigo)', /the year 1910/.test(exp.eraLockSuffix(`${fala} ${descricaoInventada}`)))
  checa('história que DIZ a época continua trancando ("In 1805, Napoleon...")', /the year 1805/.test(exp.eraLockSuffix('In 1805, Napoleon crossed the Alps.')))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
