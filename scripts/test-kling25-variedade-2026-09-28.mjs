// KINEO-KLING25-VARIEDADE-2026-09-28 — guardião do eixo de variedade por plano do Kling 2.5.
// Fundador, 28/09, aprovando o canário de 35 s (c83074b6, 38 s entregues) e pedindo o de 60 s chegando a 65-70 s:
// "a única coisa é mais variedade de cenas" · "melhore o Kling 2.5 (...) nas próximas uma hora foca em melhorar ele".
// Com 12 planos de 5 s o descritor repete enquadramento e movimento nos vizinhos apesar do pedido "do not repeat the
// same shot type" — pedido não é garantia. Este guardião EXECUTA (readFileSync + transpile + vm, sem rede, sem banco,
// sem fornecedor) e prova:
//   (a) a lib (lib/cinematic/klingShots kling25ShotAxis / kling25ApplyShotAxis): 12 planos → 12 eixos distintos, vizinhos
//       sempre diferentes (inclusive acima de 12), determinístico, o eixo é PREFIXO e nenhuma palavra do prompt some, os
//       sufixos de proteção (fim do prompt) ficam intactos; o teto de 2.500 chars só corta em fronteira de frase,
//       preserva a cauda e nunca decapita uma proibição;
//   (b) prompts REAIS do caminho clássico (buildClassicVisualPrompt via loader offline) nos 3 modos visuais: nada perdido;
//   (c) a rota: o ponto onde classicScenePrompts nasce — executado com wantsKling=true (12 prefixos distintos) e com
//       wantsKling=false (saída idêntica à da BASE, o pai do commit, byte a byte) — e só ESSE ponto chama a função;
//       buildFalInput (Seedance/Veo/Sora/hollywood) idêntico à base;
//   (d) mutantes: sem o prefixo, sem a rotação e com corte por contagem de palavras, as verificações ficam vermelhas.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const roda = (src, globals = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, String, RegExp, process: { env: {} }, ...globals })
  return exp
}
const palavras = (t) => String(t ?? '').replace(/[.,;:!?()]/g, ' ').split(/\s+/).filter(Boolean)

// BASE = o pai do commit KLING25-60S-VARIEDADE (o "antes"); antes do commit existir, HEAD; senão origin/main.
let BASE = null
{
  const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=KLING25-60S-VARIEDADE:', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:app/api/generate-video-cinematic/route.ts`]).includes('KINEO-KLING25-VARIEDADE')) { BASE = ref; break } } catch { /* próximo */ }
  }
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return execFileSync('git', ['show', `${BASE}:${p}`], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (pai do commit, sem o eixo) está disponível para as comparações byte a byte', Boolean(BASE))

// ═══ (a) a lib ═══
console.log('== (a) lib/cinematic/klingShots — eixo por plano ==')
const libSrc = rd('lib/cinematic/klingShots.ts')
checa('a lib continua PURA (sem import): guardiões e a rota leem a mesma régua', !/^import\s/m.test(libSrc))
const lib = roda(libSrc)
const { KLING25_SHOT_AXES, KLING25_MAX_SHOTS, KLING25_PROMPT_MAX_CHARS, kling25ShotAxis, kling25ApplyShotAxis } = lib
checa('exporta KLING25_SHOT_AXES, kling25ShotAxis e kling25ApplyShotAxis', Array.isArray(KLING25_SHOT_AXES) && typeof kling25ShotAxis === 'function' && typeof kling25ApplyShotAxis === 'function')
checa(`há tantos eixos quanto o teto de planos (${KLING25_MAX_SHOTS}): um filme de 12 planos não repete nenhum`, KLING25_SHOT_AXES.length === KLING25_MAX_SHOTS && new Set(KLING25_SHOT_AXES).size === KLING25_MAX_SHOTS)
checa('teto de prompt do fornecedor = 2.500 chars (schema da fal do Kling 2.5)', KLING25_PROMPT_MAX_CHARS === 2500)
checa('nenhum eixo pede ângulo holandês, texto ou rosto falando (STABLE_SHOT / NO_TEXT / mouth)', KLING25_SHOT_AXES.every((e) => !/dutch|tilted horizon|\btext\b|caption|letters|mouth|talking|speaking/i.test(e)))
checa('todo eixo declara escala/ângulo E um movimento de câmera', KLING25_SHOT_AXES.every((e) => /shot|close-up|view|overview/i.test(e) && /push-in|dolly|tilt|travelling|tracking|crane|orbit|drift|pull-back|gliding|rotation|rack focus/i.test(e)))

const eixos12 = Array.from({ length: 12 }, (_, i) => kling25ShotAxis(i))
checa('12 planos → 12 eixos, todos distintos', new Set(eixos12).size === 12)
const eixos14 = Array.from({ length: 14 }, (_, i) => kling25ShotAxis(i))
checa('acima do teto (14 planos) nenhum vizinho repete o eixo', eixos14.every((e, i) => i === 0 || e !== eixos14[i - 1]))
checa('determinístico: a mesma chamada devolve o mesmo eixo', eixos14.every((e, i) => kling25ShotAxis(i) === e))
checa('índice inválido cai no plano médio (eixo 0), nunca lança', kling25ShotAxis(-1) === KLING25_SHOT_AXES[0] && kling25ShotAxis(1.5) === KLING25_SHOT_AXES[0] && kling25ShotAxis(NaN) === KLING25_SHOT_AXES[0])
checa('o plano 1 é plano médio com sujeito legível (compatível com "Opening shot: show the described subject immediately")', /medium shot/i.test(kling25ShotAxis(0)) && /clearly readable/i.test(kling25ShotAxis(0)))

const CAUDA_REAL = ', no watermark, no logo. No readable on-screen text, no letters, no captions, no subtitles, no signage, no labels. Mouth closed, not speaking, no lip movement, vertical 9:16 composition'
const PROMPT_TIPICO = 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. A weathered stone valley floor with a lone boulder leaving a long trail in cracked dry mud, faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions' + CAUDA_REAL
const aplicado = kling25ApplyShotAxis(PROMPT_TIPICO, 3)
checa('o eixo é PREFIXO: o prompt começa pelo eixo do plano e segue com o prompt inteiro', aplicado.startsWith(kling25ShotAxis(3) + '. ') && aplicado.endsWith(PROMPT_TIPICO.replace(/\s+/g, ' ').trim()))
checa('nenhuma palavra do prompt original some (multiconjunto de palavras preservado)', (() => { const a = palavras(PROMPT_TIPICO); const b = palavras(aplicado); return a.every((w) => b.includes(w)) && b.length === a.length + palavras(kling25ShotAxis(3)).length })())
checa('os sufixos de proteção (cauda) ficam intactos', aplicado.endsWith(CAUDA_REAL.trim()))
checa('prompt vazio → só o eixo (o motor precisa de algo); espaços múltiplos são normalizados', kling25ApplyShotAxis('', 2) === kling25ShotAxis(2) && kling25ApplyShotAxis('  a   b  ', 2) === kling25ShotAxis(2) + '. a b')
checa('o prompt típico (~' + PROMPT_TIPICO.length + ' chars) fica muito abaixo do teto: o corte NUNCA entra no caso comum', aplicado.length < KLING25_PROMPT_MAX_CHARS / 2)

// Teto: prompt anormalmente longo. Frases numeradas para saber o que sobreviveu.
const frasesLongas = Array.from({ length: 40 }, (_, i) => `Sentence number ${i + 1} describes yet another layer of the scene with plenty of detail about light and weather and texture.`)
const PROMPT_LONGO = frasesLongas.join(' ') + CAUDA_REAL
checa('o prompt longo de teste passa mesmo do teto (senão o teste não prova nada)', (kling25ShotAxis(5) + '. ' + PROMPT_LONGO).length > KLING25_PROMPT_MAX_CHARS)
const cortado = kling25ApplyShotAxis(PROMPT_LONGO, 5)
checa('acima do teto: a saída cabe no teto', cortado.length <= KLING25_PROMPT_MAX_CHARS)
checa('acima do teto: o eixo segue na frente', cortado.startsWith(kling25ShotAxis(5) + '. '))
checa('acima do teto: a CAUDA (sufixos de proteção) sobrevive inteira', cortado.endsWith('Mouth closed, not speaking, no lip movement, vertical 9:16 composition'))
checa('acima do teto: o corte é em fronteira de FRASE — nenhuma frase numerada fica pela metade', (() => { const m = cortado.match(/Sentence number \d+ [^.]*\./g) || []; const parciais = (cortado.match(/Sentence number \d+/g) || []).length; return m.length === parciais && m.length >= 10 })())
const PROMPT_PROIBICAO = frasesLongas.slice(0, 26).join(' ') + ' Mouth closed, not speaking. Mouth' + CAUDA_REAL
const cortadoProib = kling25ApplyShotAxis(PROMPT_PROIBICAO, 7, 2500, 400)
checa('acima do teto: nunca termina o miolo num começo de proibição solto ("Mouth")', !/\bMouth\s+(?:, )?no watermark/.test(cortadoProib) && !/Sentence number \d+ [^.]*\.\s+Mouth\s*,?\s*(?:no watermark)/.test(cortadoProib) && cortadoProib.length <= 2500)
checa('teto pequeno de propósito (300 chars) ainda entrega eixo + cauda dentro do limite', (() => { const s = kling25ApplyShotAxis(PROMPT_TIPICO, 1, 300, 120); return s.length <= 300 && s.startsWith(kling25ShotAxis(1)) })())

// ═══ (b) prompts REAIS do caminho clássico ═══
console.log('== (b) prompts reais de buildClassicVisualPrompt nos 3 modos ==')
const load = createOfflineLoader()
const politica = load('@/lib/cinematic/visualPromptPolicy')
const estilo = load('@/lib/cinematic/sceneStyle')
const style = typeof estilo.resolveStyleAnchor === 'function' ? estilo.resolveStyleAnchor('cinematic') : (estilo.DEFAULT_STYLE_ANCHOR ?? estilo.STYLE_ANCHORS?.cinematic ?? { lookPhrase: 'cinematic', suffix: 'cinematic look' })
const visuais = [
  'A lone boulder on a cracked dry lakebed leaving a long trail behind it at dawn',
  'Wind-driven sheets of thin ice sliding across a shallow flooded playa',
  'Close view of rock tracks converging and diverging across the mud',
  'A survey camera mounted on a tripod overlooking the playa at dusk',
  'Storm clouds rolling over distant mountains above the valley',
  'A GPS unit resting on a rock surface with a trail behind it',
  'Frozen puddles reflecting an orange sunrise over the flat valley',
  'The valley seen from a ridge with dozens of parallel trails',
  'Rain drops hitting the dry mud and darkening its surface',
  'A boulder half-buried in mud with a fresh furrow behind it',
  'Thin ice breaking apart into floating panels under sunlight',
  'The empty playa under a star-filled night sky',
]
let modosOk = 0
for (const mode of ['documentary_faceless', 'character_story', 'presenter_requested']) {
  const prompts = visuais.map((v, i) => politica.buildClassicVisualPrompt(v, { mode, style, character: mode === 'character_story' ? 'a geologist in a wide hat' : null, eraSuffix: '', opening: i === 0, aspect: null }))
  const comEixo = prompts.map((p, i) => kling25ApplyShotAxis(p, i))
  const nadaPerdido = prompts.every((p, i) => { const a = palavras(p); const b = palavras(comEixo[i]); return a.every((w) => b.includes(w)) && comEixo[i].endsWith(p.replace(/\s+/g, ' ').trim()) })
  const prefixos = new Set(comEixo.map((p) => p.split('. ')[0]))
  const abaixoDoTeto = comEixo.every((p) => p.length <= KLING25_PROMPT_MAX_CHARS)
  if (nadaPerdido && prefixos.size === 12 && abaixoDoTeto) modosOk++
  else console.log(`   modo ${mode}: nadaPerdido=${nadaPerdido} prefixos=${prefixos.size} abaixoDoTeto=${abaixoDoTeto}`)
}
checa('nos 3 modos visuais: 12 prompts reais → 12 prefixos distintos, nada perdido, abaixo do teto', modosOk === 3)

// ═══ (c) a rota ═══
console.log('== (c) app/api/generate-video-cinematic/route.ts ==')
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const rota = rd(ROTA)
const rotaBase = rdBase(ROTA)
const routeAst = (src) => ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
function acha(ast, pred) { let f; const v = (n) => { if (!f && pred(n)) f = n; if (!f) ts.forEachChild(n, v) }; v(ast); return f }
const varDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isVariableDeclaration(x) && x.name.getText(ast) === nome); return n ? n.initializer.getText(ast) : null }
const funcaoDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === nome); return n ? n.getText(ast) : null }

checa('a rota importa kling25ApplyShotAxis de @/lib/cinematic/klingShots', /import \{[^}]*kling25ApplyShotAxis[^}]*\} from '@\/lib\/cinematic\/klingShots'/.test(rota))
const chamadas = rota.split('kling25ApplyShotAxis(').length - 1
checa('a rota chama kling25ApplyShotAxis exatamente UMA vez (o ponto onde classicScenePrompts nasce)', chamadas === 1)
const iniClassic = varDe(rota, 'classicScenePrompts')
checa('a chamada está amarrada a wantsKling no ternário: `wantsKling ? kling25ApplyShotAxis(promptDaCena, sceneIndex) : promptDaCena`', Boolean(iniClassic) && iniClassic.includes('wantsKling ? kling25ApplyShotAxis(promptDaCena, sceneIndex) : promptDaCena'))
checa('a chamada vem DEPOIS do contrato de cena (aplicarContrato → promptCorrigido) — o eixo prefixa o prompt já corrigido', Boolean(iniClassic) && iniClassic.indexOf('aplicarContrato(') < iniClassic.indexOf('kling25ApplyShotAxis('))
const rotaSemComentarios = rota.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
checa('fora de comentários, a rota cita kling25ApplyShotAxis exatamente 2 vezes: o import e a chamada dentro de classicScenePrompts (hollywood/Seedance/Veo/Sora nem sabem que existe)', rotaSemComentarios.split('kling25ApplyShotAxis').length - 1 === 2 && iniClassic.replace(/\/\/.*$/gm, '').includes('kling25ApplyShotAxis('))

// Executa o bloco real de classicScenePrompts com dependências inertes: contrato aprova tudo, builder devolve o visual.
const ambiente = (wantsKling, scenes) => ({
  wantsKling, scenes, eraSuffix: '', classicVisualMode: 'documentary_faceless', classicVisualPolicy: { mode: 'documentary_faceless' },
  buildClassicVisualPrompt: (v, pol) => (pol.opening ? 'Opening shot: subject first. ' : '') + v + CAUDA_REAL,
  montarContrato: (c) => c, aplicarContrato: (c) => ({ promptCorrigido: c.promptFinal, antes: { veredicto: 'ok', cobertura: '', motivo: '' }, depois: { veredicto: 'ok' }, acoes: [] }),
  severidadeDe: () => 'ok', proibidosPorModo: () => [], contratoRelatoClassico: [], kling25ApplyShotAxis,
})
const executaClassic = (src, wantsKling, scenes) => {
  const ini = varDe(src, 'classicScenePrompts')
  if (!ini) return null
  return roda(`export const out = ${ini}`, ambiente(wantsKling, scenes)).out
}
const cenas12 = visuais.map((v, i) => ({ aiPrompt: v, voiceover: `Line ${i + 1} of the narration.` }))
const klingHead = executaClassic(rota, true, cenas12)
const outrosHead = executaClassic(rota, false, cenas12)
const outrosBase = rotaBase ? executaClassic(rotaBase, false, cenas12) : null
const klingBase = rotaBase ? executaClassic(rotaBase, true, cenas12) : null
checa('rota (Kling, 12 cenas): 12 prompts com 12 prefixos distintos, cada um = eixo do índice', Array.isArray(klingHead) && klingHead.length === 12 && klingHead.every((p, i) => p.startsWith(kling25ShotAxis(i) + '. ')) && new Set(klingHead.map((p) => p.split('. ')[0])).size === 12)
checa('rota (Kling): nenhuma palavra do prompt da cena se perde e a cauda de proteção sobrevive', Array.isArray(klingHead) && klingHead.every((p, i) => p.endsWith((visuais[i] + CAUDA_REAL).trim()) && (i !== 0 || p.includes('Opening shot: subject first.'))))
checa('rota (Seedance/Veo/Sora = wantsKling false): saída IDÊNTICA à da base, byte a byte', Array.isArray(outrosHead) && Array.isArray(outrosBase) && JSON.stringify(outrosHead) === JSON.stringify(outrosBase))
checa('rota (wantsKling false): nenhum prompt começa por eixo', Array.isArray(outrosHead) && outrosHead.every((p) => !KLING25_SHOT_AXES.some((e) => p.startsWith(e))))
const temEixo = (p) => KLING25_SHOT_AXES.some((e) => p.includes(e))
checa('ANTES (base, Kling): nenhum dos 12 prompts trazia eixo de câmera; DEPOIS: os 12 trazem, cada um o seu, 12 distintos', Array.isArray(klingBase) && klingBase.length === 12 && klingBase.every((p) => !temEixo(p)) && klingHead.every(temEixo) && new Set(klingHead.map((p) => p.split('. ')[0])).size === 12)
checa('o still FLUX e o clipe leem o MESMO vetor (classicScenePrompts[idx] no still; classicScenePrompts[sceneIndex] no submitScene): o eixo entra nas duas peças', rota.includes('const scenePrompt = classicScenePrompts[idx]') && rota.includes('const cinematic = classicScenePrompts[sceneIndex]'))

// Outros motores byte a byte: buildFalInput e o bloco hollywood não mudaram.
if (rotaBase) {
  checa('buildFalInput (Seedance/Veo/Sora/Kling payload/hollywood) idêntico à base', funcaoDe(rota, 'buildFalInput') === funcaoDe(rotaBase, 'buildFalInput'))
  const semVariedade = (s) => s
    .replace(', kling25ApplyShotAxis }', ' }').replace(' · KINEO-KLING25-VARIEDADE-2026-09-28', '')
    .replace(/\n {6}\/\/ ═══ KINEO-KLING25-VARIEDADE-2026-09-28[\s\S]*?\.map\(\(promptDaCena, sceneIndex\) => \(wantsKling \? kling25ApplyShotAxis\(promptDaCena, sceneIndex\) : promptDaCena\)\)/, '')
  checa('fora do import, do comentário e da linha do .map, a rota é idêntica à base (Seedance/Veo/Sora/hollywood intocados)', semVariedade(rota) === semVariedade(rotaBase))
  const hollywoodHead = rota.slice(rota.indexOf('if (hollywoodPath)'), rota.indexOf('// ── end KINEO-HOLLYWOOD-2026-07-09'))
  const hollywoodBase = rotaBase.slice(rotaBase.indexOf('if (hollywoodPath)'), rotaBase.indexOf('// ── end KINEO-HOLLYWOOD-2026-07-09'))
  checa('bloco hollywood (Kling 3 / H3 / Omni / S25) idêntico à base', hollywoodHead.length > 1000 && hollywoodHead === hollywoodBase)
  const varietyHead = rd('lib/hollywood/varietyAxis.ts'), varietyBase = rdBase('lib/hollywood/varietyAxis.ts')
  checa('lib/hollywood/varietyAxis.ts (eixo da família hollywood) intocado', varietyHead === varietyBase)
  for (const f of ['lib/compose.ts', 'lib/cinematic/speechImageAlign.ts', 'lib/cinematic/visualPromptPolicy.ts', 'lib/hollywood/anchors.ts']) checa(`${f} intocado`, rd(f) === rdBase(f))
}

// ═══ (d) mutantes ═══
console.log('== (d) mutantes ==')
const mutante = (troca) => { const s = troca(libSrc); if (s === libSrc) throw new Error('mutante não aplicou'); return roda(s) }
const semRotacao = mutante((s) => s.split('index % n : 0').join('0 : 0'))
checa('mutante sem rotação (sempre o eixo 0): a verificação de 12 eixos distintos fica vermelha', new Set(Array.from({ length: 12 }, (_, i) => semRotacao.kling25ShotAxis(i))).size !== 12)
const semPrefixo = mutante((s) => s.split('const junto = `${eixo}. ${corpo}`').join('const junto = corpo'))
checa('mutante sem prefixo: o prompt não começa pelo eixo → vermelho', !semPrefixo.kling25ApplyShotAxis(PROMPT_TIPICO, 3).startsWith(kling25ShotAxis(3)))
const cortePorPalavra = mutante((s) => s.split('if (junto.length <= maxChars) return junto').join('return `${eixo}. ${corpo.split(\' \').slice(0, 14).join(\' \')}`'))
checa('mutante com corte por contagem de palavras (o bug do "Mouth"): palavras somem e a cauda morre → vermelho', (() => { const p = cortePorPalavra.kling25ApplyShotAxis(PROMPT_TIPICO, 3); return !p.endsWith(CAUDA_REAL.trim()) && palavras(p).length < palavras(PROMPT_TIPICO).length })())
const semCauda = mutante((s) => s.split('const saida = miolo ? `${eixo}. ${miolo} ${cauda}` : `${eixo}. ${cauda}`').join('const saida = `${eixo}. ${miolo}`'))
checa('mutante que descarta a cauda acima do teto: os sufixos de proteção somem → vermelho', !semCauda.kling25ApplyShotAxis(PROMPT_LONGO, 5).endsWith('vertical 9:16 composition'))

console.log(`\n${ok} verificações OK, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
