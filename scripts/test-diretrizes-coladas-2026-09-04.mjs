#!/usr/bin/env node
/**
 * KINEO-DIRETRIZES-COLADAS — 04/09/2026 — sprint-retencao #9
 *
 * O DEFEITO QUE ISTO PROTEGE (30 dias, contas externas, SQL de 00:30 UTC):
 * 46 pessoas cujo PRIMEIRO filme nasceu de uma ORDEM colada fizeram um segundo
 * filme em 8,7% dos casos; as 714 que começaram de um tema normal, em 27,5%.
 * O mecanismo está nas amostras reais: o texto delas exige 2–4 minutos, 16:9,
 * "no stock footage" — e o produto entregava 35 segundos em 9:16 sem dizer uma
 * palavra. Este teste tranca a leitura dessas exigências e, principalmente,
 * tranca o que o módulo NÃO pode afirmar.
 *
 * Todos os textos abaixo saíram de `videos.topic` em produção.
 *
 * Rodar: node scripts/test-diretrizes-coladas-2026-09-04.mjs  (sem rede, $0)
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (p) => readFileSync(join(root, p), 'utf8')

let ok = 0
let fail = 0
const falhas = []
function check(nome, cond, detalhe = '') {
  if (cond) { ok += 1; return }
  fail += 1
  falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`)
  console.log(`  x ${nome}${detalhe ? ` — ${detalhe}` : ''}`)
}
function bloco(t) { console.log(`\n── ${t}`) }

// ── carrega o módulo TS de verdade (sem mock, sem reescrever a regra) ──────
const SRC = 'lib/pastedDirectives.ts'
const fonte = read(SRC)
const js = ts.transpileModule(fonte, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const { readPastedDirectives, fraseDoQueNaoDamosConta, menorBotaoQueCobre, DURACOES_SUPORTADAS } = mod

// ═══════════════════════════════════════════════════════════════════════════
bloco('1. os botões que a tela realmente tem')
// Se alguém acrescentar um botão em GenerateClient e esquecer daqui, a
// sugestão de duração passa a mentir. O teste lê o arquivo real.
const client = read('app/(dashboard)/generate/GenerateClient.tsx')
const mDur = client.match(/const DURATION_OPTIONS:[^=]*=\s*\[([\s\S]*?)\n\]/)
check('1.1 DURATION_OPTIONS encontrado no cliente', !!mDur)
const botoesDoCliente = [...(mDur?.[1] ?? '').matchAll(/value:\s*(\d+)/g)].map((m) => Number(m[1])).sort((a, b) => a - b)
check('1.2 o módulo lista exatamente os botões do cliente',
  JSON.stringify(botoesDoCliente) === JSON.stringify([...DURACOES_SUPORTADAS].sort((a, b) => a - b)),
  `cliente=${JSON.stringify(botoesDoCliente)} modulo=${JSON.stringify([...DURACOES_SUPORTADAS])}`)

bloco('2. menorBotaoQueCobre — nunca ABAIXO do pedido')
// Régua do fundador (02/09): "passar do alvo é bom; ficar abaixo é defeito".
check('2.1 25s → 35', menorBotaoQueCobre(25) === 35)
check('2.2 35s → 35 (exato não sobe)', menorBotaoQueCobre(35) === 35)
check('2.3 40s → 60 (nunca 35)', menorBotaoQueCobre(40) === 60)
check('2.4 45s → 60', menorBotaoQueCobre(45) === 60)
check('2.5 90s → 90', menorBotaoQueCobre(90) === 90)
check('2.6 91s → null (não existe botão)', menorBotaoQueCobre(91) === null)
check('2.7 240s → null', menorBotaoQueCobre(240) === null)

bloco('3. textos REAIS do banco: duração pedida vira botão')
const casos = [
  ['Create a 40-second Shorts video titled "What Would Happen If There Were No Internet for 24 Hours?" It should have an English voiceover, subtitles', 60, 'honored'],
  ['Create a 45-second vertical 9:16 cinematic YouTube Short about a young entrepreneur who starts with almost nothing', 60, 'honored'],
  ['Create a 25-30 second vertical YouTube Short about the psychology of being ignored by someone you care about.', 35, 'honored'],
  ['Create a 35–45 second YouTube Short titled:', 60, 'honored'],
  ['Create a 35–45 second vertical YouTube Short about Avengers: Doomsday.', 60, 'honored'],
  ['Create a realistic cinematic 60-second video about a forgotten 1970 Dodge Challenger that is discovered in a forest', 60, 'honored'],
  ['create a 30-second viral you tube shorts video about success mindset with cinematic visuals, fast cuts', 35, 'honored'],
]
for (const [texto, esperado, sup] of casos) {
  const r = readPastedDirectives(texto)
  const d = r.directives.find((x) => x.kind === 'duration')
  check(`3.x "${texto.slice(0, 42)}…" → ${esperado}s`,
    r.suggestedDuration === esperado && d?.support === sup,
    `veio ${r.suggestedDuration} (${d?.support}) pedido=${d?.askedSeconds}`)
}

bloco('4. o pedido que a casa NÃO atende sai marcado, não silencioso')
const longo = readPastedDirectives('Create a 2–4 minute, 16:9 widescreen educational STEM documentary-style background video for a school project titled "Modeling a Human Hand"')
const dLongo = longo.directives.find((x) => x.kind === 'duration')
check('4.1 "2–4 minute" lido como 240s', dLongo?.askedSeconds === 240, `veio ${dLongo?.askedSeconds}`)
check('4.2 240s é unsupported', dLongo?.support === 'unsupported')
check('4.3 nenhuma duração sugerida (não fingimos que cabe)', longo.suggestedDuration === null)
check('4.4 "16:9 widescreen" entra como unsupported', longo.unsupported.some((d) => d.kind === 'aspect'))
const frase = fraseDoQueNaoDamosConta(longo)
check('4.5 a frase cita os dois e diz o limite real',
  !!frase && frase.includes('4 minutes') && frase.includes('90 seconds') && frase.includes('9:16'), frase ?? 'null')

bloco('5. vertical explícito NÃO vira aviso falso')
// "vertical 9:16" é exatamente o que a casa entrega. Avisar aqui seria copy
// que mente ao contrário — assustar quem já pediu certo.
const vert = readPastedDirectives('Create a 45-second vertical 9:16 cinematic YouTube Short about a young entrepreneur')
check('5.1 nenhum aviso de proporção', !vert.unsupported.some((d) => d.kind === 'aspect'))
check('5.2 a frase honesta é null (nada a dizer)', fraseDoQueNaoDamosConta(vert) === null)
const so916 = readPastedDirectives('Make a 9:16 short about the ocean')
check('5.3 "9:16" sozinho não vira aviso', so916.unsupported.length === 0)

bloco('6. idioma e "sem banco de imagens": detectados, NUNCA recusados')
// Não medimos cobertura de voz por idioma nem fonte de imagem por motor nesta
// rodada. Prometer ou recusar sem medir é o defeito de copy que mente.
const arabe = readPastedDirectives('Create this YouTube Short ENTIRELY IN ARABIC.')
check('6.1 idioma detectado', arabe.directives.some((d) => d.kind === 'language'))
check('6.2 idioma marcado unknown', arabe.directives.find((d) => d.kind === 'language')?.support === 'unknown')
check('6.3 idioma NÃO entra em unsupported', !arabe.unsupported.some((d) => d.kind === 'language'))
check('6.4 idioma NÃO vira frase na tela', fraseDoQueNaoDamosConta(arabe) === null)
const semStock = readPastedDirectives('Create ALL visuals with AI. DO NOT use stock footage or real people.')
check('6.5 "no stock footage" detectado', semStock.directives.some((d) => d.kind === 'footage'))
check('6.6 footage marcado unknown', semStock.directives.find((d) => d.kind === 'footage')?.support === 'unknown')
check('6.7 footage NÃO vira frase na tela', fraseDoQueNaoDamosConta(semStock) === null)

bloco('7. a SEMENTE DA PRÓPRIA CASA nunca é tratada como ordem colada')
// 43 filmes nasceram da porta de continuação de série, cujo texto começa por
// "Create the next episode…". Se o módulo os classificasse como colagem, a
// coorte de medição ficaria contaminada e a tela avisaria a pessoa sobre um
// texto que o PRODUTO escreveu.
const sem = readPastedDirectives('Create the next episode in the same Short series about "How Do 200,000-Ton Ships Float?". Keep the topic and format recognizable, but use a completely new hook. Do not repeat the previous episode.')
check('7.1 looksPasted = false na semente da casa', sem.looksPasted === false)
check('7.2 a semente não produz sugestão de duração', sem.suggestedDuration === null)
check('7.3 a semente não produz nenhum unsupported', sem.unsupported.length === 0)
const semAninhada = readPastedDirectives('Create the next episode in the same Short series about "Create the next episode in the same Short series about A detective\'s office"')
check('7.4 semente aninhada também não é colagem', semAninhada.looksPasted === false)

bloco('8. looksPasted: as três famílias vistas no banco')
check('8.1 começo de ordem', readPastedDirectives('Create a mysterious cinematic YouTube Short about a strange signal from deep space.').looksPasted === true)
check('8.2 rótulo em caixa alta', readPastedDirectives('STYLE: Bright, colourful, cute high-quality 3D animation.').looksPasted === true)
check('8.3 markdown de chatbot', readPastedDirectives('# 🎬 **Instagram Reel Script: The Speed Limit !!**').looksPasted === true)
check('8.4 markdown de cena', readPastedDirectives('### Scene 1 — 0–10 sec').looksPasted === true)
check('8.5 tema normal NÃO é colagem', readPastedDirectives('5 shocking facts about money').looksPasted === false)
check('8.6 roteiro com marcadores NÃO é colagem', readPastedDirectives('HOOK\nThe ocean hides a sound nobody can explain.').looksPasted === false)

bloco('9. bordas: entrada inútil nunca derruba nem inventa')
for (const [nome, v] of [['null', null], ['undefined', undefined], ['vazio', ''], ['espaços', '   \n  '], ['numero', 123]]) {
  const r = readPastedDirectives(v)
  check(`9.x ${nome} → leitura vazia`, r.directives.length === 0 && r.suggestedDuration === null && r.looksPasted === false)
}
check('9.6 texto sem nenhuma diretriz → nada', readPastedDirectives('A story about the deep ocean').directives.length === 0)
check('9.7 pureza: duas leituras iguais dão o mesmo resultado',
  JSON.stringify(readPastedDirectives(casos[0][0])) === JSON.stringify(readPastedDirectives(casos[0][0])))
check('9.8 "24 hours" no título não vira duração de 24s',
  readPastedDirectives('What Would Happen If There Were No Internet for 24 Hours?').suggestedDuration === null)

bloco('10. trava de qualidade do fundador (03/09): o módulo não toca no motor')
// "os vídeos têm saído nota 9, NÃO QUERO QUE MEXA NISSO". Este arquivo não
// pode importar nem citar nenhuma peça do pipeline de render.
const PROIBIDO = [/lib\/compose/, /lib\/hollywood/, /lib\/cinematic/, /lib\/broll/, /lyriaMusic/, /narrationFit/, /analyze-idea/, /generate-script/]
const imports = [...fonte.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
check('10.1 o módulo não importa NADA', imports.length === 0, `importa ${JSON.stringify(imports)}`)
check('10.2 nenhum caminho proibido citado no arquivo', !PROIBIDO.some((re) => re.test(fonte)))
check('10.3 o módulo é puro (sem fetch/supabase/process)', !/\bfetch\(|supabase|process\.env|createClient/.test(fonte))

bloco('11. o cliente usa o módulo, e só onde não custa crédito')
// A leitura tem de acontecer na ANÁLISE (que não debita), nunca depois do
// débito — senão a pessoa descobre o que não damos conta com o crédito já
// gasto, que é exatamente a queixa que abriu esta rodada.
check('11.1 GenerateClient importa readPastedDirectives', /from '@\/lib\/pastedDirectives'/.test(client))
const iAnalyze = client.indexOf('async function handleAnalyze(')
const iUso = client.indexOf('readPastedDirectives(')
check('11.2 a chamada existe', iUso > 0)
check('11.3 a chamada está DENTRO de handleAnalyze', iUso > iAnalyze && iAnalyze > 0)
const trecho = client.slice(iAnalyze, iAnalyze + 9000)
check('11.4 emite pasted_directives_detected', /pasted_directives_detected/.test(trecho))
check('11.5 a sugestão de duração passa por setDuration',
  /setDuration\(leituraColada\.suggestedDuration(?:\s+as\s+Duration)?\)/.test(trecho))
// A troca de botão só pode acontecer quando há botão que COBRE o pedido —
// nunca com `suggestedDuration === null`, que é justamente o caso "2–4
// minutos": ali o certo é avisar, não silenciosamente escolher 90.
check('11.7 a troca é guardada por suggestedDuration !== null',
  /leituraColada\.suggestedDuration !== null/.test(trecho))
// O aviso é derivado do texto ao vivo e renderizado junto aos botões — se
// virasse estado setado só na análise, ele piscaria e sumiria na troca de fase.
check('11.8 o aviso é derivado de readPastedDirectives(prompt)',
  /const avisoColado = fraseDoQueNaoDamosConta\(readPastedDirectives\(prompt\)\)/.test(client))
check('11.9 o aviso é renderizado', /\{avisoColado &&/.test(client))
check('11.6 nenhum débito/render é chamado nesse trecho', !/handleGenerate|\/api\/compose|\/api\/generate-video/.test(trecho))

console.log(`\n${ok}/${ok + fail} verificacoes passaram${fail ? ` — ${fail} FALHARAM` : ''}`)
if (fail) { console.log(falhas.map((f) => `  · ${f}`).join('\n')); process.exit(1) }
