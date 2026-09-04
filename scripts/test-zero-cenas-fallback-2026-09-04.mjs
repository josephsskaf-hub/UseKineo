#!/usr/bin/env node
// KINEO-ZERO-SCENES-FALLBACK-2026-09-04
// Prova, lendo o arquivo REAL, que um construtor de cenas vazio nao vira mais
// filme perdido: o outro construtor tenta, com trava contra narrar instrucao.
import { readFileSync } from 'node:fs'

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const src = readFileSync(ROTA, 'utf8')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log(`  ok  ${n}`) } else { falhas.push(n); console.log(`  XX  ${n}`) } }

console.log(`\nlendo ${ROTA}\n`)

const iFallback = src.indexOf('KINEO-ZERO-SCENES-FALLBACK-2026-09-04')
const iGuard = src.indexOf('if (scenes.length === 0 && prompt.trim().length > 0) {')
const iL2B = src.indexOf('// L2B - prefer the smart BrollPlan per-scene cinematic prompt when provided')
const iVerbatimBuild = src.indexOf('const picked = resolveVerbatimSegments(parsedScript, clipCount)')
const iAiBuild = src.indexOf('const generated = await generateScenes(prompt.slice(0, 1200), clipCount)')
const iDispatch = src.indexOf('c.planned = scenes.length')
const iZeroSaida = src.indexOf('if (planoVazio) {')

checa('o bloco de fallback existe', iFallback > -1)
checa('a guarda so dispara com ZERO cenas e texto nao-vazio', iGuard > -1)
checa('o fallback vem DEPOIS dos dois construtores', iGuard > iVerbatimBuild && iGuard > iAiBuild)
checa('o fallback vem ANTES do L2B (plano do cliente) e do despacho', iGuard < iL2B && iGuard < iDispatch)
checa('a saida verdadeira do #21 (planoVazio) continua existindo depois, para quando nada recupera', iZeroSaida > iGuard)

const bloco = src.slice(iFallback, iL2B)
// KINEO-UNBRACKET-2026-09-04 — causa raiz reproduzida: cleanNarration apaga [colchetes];
// roteiro do ChatGPT com toda fala entre colchetes -> narracao vazia -> 0 cenas.
checa('verbatim vazio -> 1a tentativa: tirar colchetes e faixas de tempo e re-parsear (palavras do cliente)', /if \(verbatim\) \{[\s\S]*?const desembrulhado = prompt[\s\S]*?replace\(\/\[\\\[\\\]\]\/g, ' '\)[\s\S]*?const reparse = parseUserScript\(desembrulhado\)/.test(bloco))
checa('o re-parse so vira cenas se a narracao desembrulhada nao for vazia', bloco.includes("const beats = reparse.narration.trim() ? resolveVerbatimSegments(reparse, clipCount) : []"))
checa("via = 'unbracket' quando recupera as palavras do cliente", bloco.includes("via = 'unbracket'"))
checa('o desembrulho descarta linha que e so direcao de cena (Visual:/Camera:/Music:...) antes do re-parse', bloco.includes('const DIRECAO_LINHA = /^\\s*(visual|visuals|camera|shot') && bloco.includes('.filter((l) => !DIRECAO_LINHA.test(l))'))
checa('o desembrulho tira faixas de tempo "0:00-0:02:" que a TTS leria em voz alta', /replace\(\/\\b\\d\{1,2\}:\\d\{2\}\\s\*\[-\\u2013\]\\s\*\\d\{1,2\}:\\d\{2\}\\s\*:\?\/g, ' '\)/.test(bloco))
checa('verbatim vazio -> 2a tentativa: planner de IA (generateScenes) sobre o texto cru', /via = 'unbracket'[\s\S]*?\} else \{[\s\S]*?generateScenes\(prompt\.slice\(0, 1200\), clipCount\)[\s\S]*?via = 'ai_planner'/.test(bloco))
checa('a IA e o SEGUNDO recurso, nunca o primeiro (unbracket vem antes no texto)', bloco.indexOf("via = 'unbracket'") > -1 && bloco.indexOf("via = 'unbracket'") < bloco.indexOf("via = 'ai_planner'"))
checa('ai vazio -> divisor deterministico (resolveVerbatimSegments)', /else if \(!pareceInstrucao\) \{[\s\S]*?resolveVerbatimSegments\(parseUserScript\(prompt\), clipCount\)/.test(bloco))
checa('NUNCA narra instrucao: o divisor so roda se !looksLikeInstruction', bloco.includes('const pareceInstrucao = looksLikeInstruction(prompt)') && bloco.includes('else if (!pareceInstrucao)'))
checa('o import de looksLikeInstruction existe', src.includes("import { looksLikeInstruction } from '@/lib/momentumTopic'"))
checa('scenes so e substituido quando recuperou algo', bloco.includes('if (recuperadas.length > 0) scenes = recuperadas'))
checa('erro do fallback nao derruba a rota (try/catch com warn)', /catch \(e\) \{[\s\S]*?zero-scenes fallback falhou/.test(bloco))
checa('grava cinematic_zero_scenes_recovered com from/via/recovered', bloco.includes("name: 'cinematic_zero_scenes_recovered'") && bloco.includes('from: origem') && bloco.includes('via,') && bloco.includes('recovered: recuperadas.length'))
checa('a telemetria carrega looks_like_instruction/segments/narration_chars/prompt_chars', ['looks_like_instruction', 'segments:', 'narration_chars', 'prompt_chars'].every((k) => bloco.includes(k)))
checa('telemetria nunca derruba a resposta', bloco.includes('catch { /* telemetria nunca derruba a resposta */ }'))

// trava de qualidade: para scenes.length > 0 o bloco e inerte (nao ha outra atribuicao a scenes dentro dele)
// `let recuperadas: typeof scenes = []` e anotacao de tipo, nao atribuicao — sai da conta.
const atribuicoes = (bloco.replace(/typeof scenes = /g, '').match(/\bscenes = /g) || []).length
checa('dentro do bloco ha exatamente 1 atribuicao a scenes, e ela e condicional', atribuicoes === 1)
checa('nada muda para quem hoje gera filme: o bloco inteiro esta dentro da guarda de ZERO cenas', bloco.indexOf('if (scenes.length === 0 && prompt.trim().length > 0) {') < bloco.indexOf('scenes = recuperadas'))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { console.log('\nFALHOU:'); falhas.forEach((f) => console.log(`  - ${f}`)); process.exit(1) }
console.log('\nOK — construtor vazio deixou de ser filme perdido\n')
