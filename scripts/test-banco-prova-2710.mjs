// [TRAVA 8.2 — vai do fundador 27/10 "aprovo banco"] KINEO-BANCO-PROVA-2710
// Guardião do banco de pedidos-prova. Prova, sem rede e sem render, com o código REAL:
//   A. rota (app/api/generate-video-cinematic/route.ts): dry_run:'stills' só passa com isDryRunAccount; conta de fora leva o
//      mesmo 403 do dry_run; o bloco do banco fica DEPOIS dos stills/crítico/folha e ANTES de submitAllScenes; dentro dele só
//      estorno + evento + resposta — nenhum POST de clipe, compose, áudio ou insert em `videos`; toda linha nova leva a marca.
//   B. lib/cinematic/bancoProva.ts executada em sandbox: leitura do pedido, pedido/resposta das expectativas, a nota do caso
//      (metade crítico, metade expectativas; cena sem still = 0; folha vence FLUX), verificarExpectativas com fetch falso.
//   C. scripts/banco-prova/comparar.mjs com fixtures: total caiu → bloqueia; caso regrediu abaixo do limiar → bloqueia; caso
//      novo baixo / caso que já era baixo / caso sumido → aviso; tolerância; rodada parcial compara só o que rodou.
//   D. scripts/banco-prova/casos.json: 30 casos, ids únicos, os 8 pedidos reais verbatim, idiomas cobertos.
//   E. scripts/banco-prova/rodar.mjs: manda dry_run:'stills' (nunca true), sai com 1 no bloqueio, nenhum segredo no arquivo;
//      seedDoCaso determinística, cookie no molde do @supabase/ssr, linha de erro quando a rota não responde 200.
//   F. mutante: sem `isDryRunAccount` no gate do banco, a prova A fica vermelha.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const MARCA = 'KINEO-BANCO-PROVA-2710'

const roda = (src, mods = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  const req = (id) => { if (id in mods) return mods[id]; return new Proxy({}, { get: () => () => undefined }) }
  vm.runInNewContext(js, { exports: exp, module: { exports: exp }, require: req, console, process: { env: {} }, AbortController, setTimeout, clearTimeout, Date, JSON, Math, Number, String, Map, Set, Array, Buffer }, { filename: 'bancoProva.js' })
  return exp
}

// ── A. a rota ──
console.log('== A. a rota ==')
const ROTA = 'app/api/generate-video-cinematic/route.ts'
function provasDaRota(rota) {
  const p = []
  const iGate = rota.indexOf("const bancoProvaStills = ehPedidoDeStills(body.dry_run) && isDryRunAccount(user.email)")
  p.push(['A1 bancoProvaStills = pedido de stills E conta do ensaio (isDryRunAccount)', iGate > 0])
  p.push(['A2 conta de fora com dry_run:\'stills\' leva o mesmo 403 do dry_run, antes de qualquer reserva', /if \(\(body\.dry_run === true \|\| ehPedidoDeStills\(body\.dry_run\)\) && !isDryRunAccount\(user\.email\)\) \{[\s\S]{0,1200}?status: 403/.test(rota)])
  const iBloco = rota.indexOf('if (bancoProvaStills) { // ' + MARCA)
  const iFimBloco = rota.indexOf('\n    } // ' + MARCA + '\n', iBloco) // o fecho do `if` (4 espaços); o objeto do relato fecha com 6
  const bloco = iBloco > 0 && iFimBloco > iBloco ? rota.slice(iBloco, iFimBloco) : ''
  const iPersonagem = rota.indexOf('// <<< KINEO-META95-PERSONAGEM-2010 bloco')
  const iSubmitDef = rota.indexOf('async function submitAllScenes(')
  const iSubmitCall = rota.indexOf('await submitAllScenes(usedModel)')
  const iRelatos = rota.indexOf('bancoProvaCriticoFlux = criticoFilme.relatos')
  const iFolha = rota.indexOf('bancoProvaFolha = { folhas: folhaDe.size')
  p.push(['A3 o bloco do banco existe e fecha com a marca', bloco.length > 200])
  p.push(['A4 o bloco vem DEPOIS do crítico do still FLUX e da folha de personagem', iRelatos > 0 && iFolha > 0 && iPersonagem > 0 && iBloco > iRelatos && iBloco > iFolha && iBloco > iPersonagem])
  p.push(['A5 o bloco vem ANTES de submitAllScenes (definição e chamada): nenhum POST de clipe', iSubmitDef > iBloco && iSubmitCall > iBloco])
  p.push(['A6 o bloco estorna o claim de nascimento (releaseBirthClaim) com motivo próprio e responde charged:false', bloco.includes('await releaseBirthClaim(BANCO_PROVA_MOTIVO_ESTORNO)') && bloco.includes('charged: false') && bloco.includes('return NextResponse.json(')])
  p.push(['A7 o bloco grava o evento banco_prova_caso por caso (session_id = generation_id)', bloco.includes('name: BANCO_PROVA_EVENTO') && bloco.includes('sessionId: generationId')])
  p.push(['A8 o bloco NÃO despacha vídeo, compose, áudio, música nem grava em `videos`', bloco.length > 0 && !/submitFalQueueOnce|submitToFal|dispatchOneScene|agendarAudioNoClique|\/api\/compose|lyria|\.insert\(|from\('videos'\)|fal\.subscribe|fal\.queue/.test(bloco)])
  p.push(['A9 o bloco conta a nota com pontuarCaso e confere as expectativas do caso (verificarExpectativas)', bloco.includes('verificarExpectativas({') && bloco.includes('pontuarCaso({')])
  p.push(['A10 a semente é fixa por caso só no banco (generationSeed com bancoProvaPedido.seed; fora dele, deterministicSeed de sempre)', /const generationSeed = bancoProvaStills && bancoProvaPedido\.seed !== null \? bancoProvaPedido\.seed : deterministicSeed\(billingReference\)/.test(rota)])
  const semMarca = rota.split('\n').filter((l) => /bancoProva|BANCO_PROVA|ehPedidoDeStills|lerPedidoDoBanco/.test(l) && !l.includes(MARCA))
  p.push(['A11 toda linha da rota que toca o banco leva a marca ' + MARCA + (semMarca.length ? ` (sem marca: ${semMarca.length})` : ''), semMarca.length === 0])
  p.push(['A12 a rota não compara dry_run com a string crua (só via ehPedidoDeStills)', !rota.includes("dry_run === 'stills'")])
  p.push(['A13 o tipo do corpo aceita dry_run: boolean | \'stills\'', rota.includes("dry_run?: boolean | 'stills'")])
  return p
}
const rota = rd(ROTA)
for (const [n, c] of provasDaRota(rota)) checa(n, c)

// ── B. a lib ──
console.log('== B. lib/cinematic/bancoProva.ts ==')
const L = roda(rd('lib/cinematic/bancoProva.ts'), { '@/lib/hollywood/juizStill': { JUIZ_STILL_MODELO: 'gpt-4o-mini' } })
checa('B1 ehPedidoDeStills: só a string exata \'stills\'', L.ehPedidoDeStills('stills') === true && [true, 'true', 'STILLS', 1, 'Stills', null, undefined, { }].every((x) => L.ehPedidoDeStills(x) === false))
checa('B2 evento e versão', L.BANCO_PROVA_EVENTO === 'banco_prova_caso' && L.BANCO_PROVA_VERSAO === 'banco_prova_v1' && L.BANCO_PROVA_MODELO === 'gpt-4o-mini')
const pedido = L.lerPedidoDoBanco({ caso: '  krishna ', espera: ['  blue skin ', 'ab', 7, null, ...Array(20).fill('x'.repeat(5))], seed: 12345 })
checa('B3 lerPedidoDoBanco: caso aparado, espera aparada (≥ 3 chars, máx. 12), seed inteira', pedido.caso === 'krishna' && pedido.espera[0] === 'blue skin' && pedido.espera.length === 12 && !pedido.espera.includes('ab') && pedido.seed === 12345)
checa('B4 lerPedidoDoBanco: lixo vira sem_id; seed inválida vira null', L.lerPedidoDoBanco(null).caso === 'sem_id' && L.lerPedidoDoBanco('x').espera.length === 0 && L.lerPedidoDoBanco({ seed: -1 }).seed === null && L.lerPedidoDoBanco({ seed: 1.5 }).seed === null && L.lerPedidoDoBanco({ seed: 'abc' }).seed === null && L.lerPedidoDoBanco({ seed: 2_147_483_647 }).seed === null)
const pedidoExp = L.montarPedidoDeExpectativas({ stills: ['u1', null, 'u3', ...Array(9).fill('u')], espera: ['a girl', 'an old man'], falas: ['f1', 'f2', 'f3'], visuais: ['v1', 'v2', 'v3'] })
const partes = pedidoExp.messages[1].content
checa('B5 montarPedidoDeExpectativas: pula still nulo, teto de 8 imagens, rotula cena com fala e visual, expectativas numeradas', pedidoExp.imagens === 8 && partes.filter((p) => p.type === 'image_url').length === 8 && partes[0].text.includes('1. a girl') && partes[0].text.includes('2. an old man') && partes[1].text.startsWith('SHOT 1') && partes[1].text.includes('v1') && partes[1].text.includes('"f1"') && partes[3].text.startsWith('SHOT 3') && partes.every((p) => p.type !== 'image_url' || p.image_url.detail === 'low'))
const lida = L.lerRespostaDeExpectativas(JSON.stringify({ items: [{ index: 1, status: 'met', shot: 2, reason: 'ok' }, { index: 2, status: 'not met', reason: 'no man' }, { index: 9, status: 'met' }] }), ['a', 'b', 'c'])
checa('B6 lerRespostaDeExpectativas: mapeia por índice, "not met" vira not_met, índice fora é ignorado, sem resposta vira erro', lida.length === 3 && lida[0].estado === 'met' && lida[0].cena === 2 && lida[1].estado === 'not_met' && lida[2].estado === 'erro')
checa('B7 lerRespostaDeExpectativas: JSON ilegível ou sem items = null', L.lerRespostaDeExpectativas('nope', ['a']) === null && L.lerRespostaDeExpectativas('{"x":1}', ['a']) === null && L.lerRespostaDeExpectativas('[1]', ['a']) === null)
const relato = (cena, nota, veredito = 'PASS', problemas = [], extra = {}) => ({ versao: 'still_critic_v1', modo: 'enforce', cena, veredito, problemas, motivo: '', nota, regeraria: false, regerou: false, regeracao_ok: null, instrucao: null, veredito_regerada: null, problemas_regerada: null, nota_regerada: null, escolhida: 'original', custo_usd: 0.0005, ms: 10, chamadas: 1, modelo: 'm', erro: null, pulado_por: null, url_original: 'u', url_final: 'u', ...extra })
const regerada = relato(2, 30, 'FAIL', ['anatomia'], { regerou: true, escolhida: 'regerada', veredito_regerada: 'PASS', problemas_regerada: [], nota_regerada: 85, regeracao_ok: true })
checa('B8 fotoQueSeguiu: regerada escolhida → nota/veredito da regerada; senão a original', L.fotoQueSeguiu(regerada).nota === 85 && L.fotoQueSeguiu(regerada).veredito === 'PASS' && L.fotoQueSeguiu(relato(1, 70)).nota === 70)
const exp3 = [{ indice: 1, espera: 'a', estado: 'met', cena: 1, motivo: '' }, { indice: 2, espera: 'b', estado: 'met', cena: 2, motivo: '' }, { indice: 3, espera: 'c', estado: 'not_met', cena: null, motivo: '' }]
const n1 = L.pontuarCaso({ cenas: 3, stills: ['a', 'b', 'c'], relatosClassico: [relato(1, 90), relato(2, 80), relato(3, 70)], relatosFolha: [], expectativas: exp3 })
checa('B9 pontuarCaso: 3 PASS 90/80/70 + 2 de 3 expectativas → crítico 80, taxa 0,667, nota 73, falhas expectativa×1', n1.nota_critico === 80 && n1.taxa_expectativas === 0.667 && n1.nota === 73 && n1.falhas.expectativa === 1 && n1.cenas_com_still === 3 && n1.cenas_julgadas === 3 && n1.detalhe.length === 3 && n1.detalhe[0].origem === 'flux')
const n2 = L.pontuarCaso({ cenas: 3, stills: ['a', null, 'c'], relatosClassico: [relato(1, 90), relato(3, 60, 'FAIL', ['texto', 'sujeito'])], relatosFolha: [], expectativas: [] })
checa('B10 pontuarCaso: cena sem still = nota 0 e falha sem_still; sem expectativas a nota é só o crítico (média 50); problemas contados por tipo', n2.nota_critico === 50 && n2.taxa_expectativas === null && n2.nota === 50 && n2.falhas.sem_still === 1 && n2.falhas.texto === 1 && n2.falhas.sujeito === 1 && n2.detalhe[1].veredito === 'SEM_STILL' && n2.detalhe[1].nota === 0)
const n3 = L.pontuarCaso({ cenas: 2, stills: ['a', 'b'], relatosClassico: [relato(1, 90), relato(2, 20, 'FAIL', ['sujeito'])], relatosFolha: [relato(2, 88, 'PASS', [], { url_final: 'folha' })], expectativas: [{ indice: 1, espera: 'x', estado: 'not_applicable', cena: null, motivo: '' }] })
checa('B11 pontuarCaso: o relato da folha vence o FLUX na mesma cena; not_applicable sai do denominador (taxa null)', n3.nota_critico === 89 && n3.detalhe[1].origem === 'folha' && n3.detalhe[1].nota === 88 && !n3.falhas.sujeito && n3.taxa_expectativas === null && n3.nota === 89 && n3.expectativas_aplicaveis === 0)
const n4 = L.pontuarCaso({ cenas: 2, stills: ['a', 'b'], relatosClassico: [relato(1, null, 'ERRO', [], { erro: 'timeout' }), regerada], relatosFolha: [], expectativas: [{ indice: 1, espera: 'x', estado: 'erro', cena: null, motivo: 'sem chave' }] })
checa('B12 pontuarCaso: cena com still mas sem nota (ERRO) fica fora da média; regerada escolhida conta 85; expectativa em erro conta como não cumprida', n4.nota_critico === 85 && n4.cenas_julgadas === 1 && n4.taxa_expectativas === 0 && n4.nota === 43 && n4.falhas.expectativa === 1)
checa('B13 pontuarCaso: zero cenas → tudo null/0 sem lançar', L.pontuarCaso({ cenas: 0, stills: [], relatosClassico: [], relatosFolha: [], expectativas: [] }).nota === null)
checa('B14 custoDoCasoUsd: 3 FLUX + 1 folha + 2 com folha + crítico + visão', L.custoDoCasoUsd({ stillsFlux: 3, folhas: 1, stillsComFolha: 2, relatos: [relato(1, 90), relato(2, 90)], expectativasUsd: 0.003 }) === 0.364)
const fetchOk = async (_u, init) => { const body = JSON.parse(init.body); return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ items: [{ index: 1, status: 'met', shot: 1, reason: 'blue' }, { index: 2, status: 'not_met', shot: null, reason: 'no man' }] }) } }], usage: { prompt_tokens: body.messages.length * 3000, completion_tokens: 50 } }) } }
const v1 = await L.verificarExpectativas({ stills: ['u1', 'u2'], espera: ['blue skin', 'old man'], apiKey: 'k', fetchImpl: fetchOk })
checa('B15 verificarExpectativas: 1 chamada com todos os stills → itens por expectativa, custo > 0, sem erro', v1.itens.length === 2 && v1.itens[0].estado === 'met' && v1.itens[1].estado === 'not_met' && v1.imagens === 2 && v1.custo_usd > 0 && v1.erro === null)
let chamadas = 0
const v2 = await L.verificarExpectativas({ stills: ['u1'], espera: [], apiKey: 'k', fetchImpl: async () => { chamadas++; return { ok: true, json: async () => ({}) } } })
const v3 = await L.verificarExpectativas({ stills: [null, null], espera: ['x'], apiKey: 'k', fetchImpl: async () => { chamadas++; return { ok: true, json: async () => ({}) } } })
checa('B16 verificarExpectativas: sem `espera` ou sem still não chama nada (sem still = tudo not_met, erro sem_stills)', chamadas === 0 && v2.itens.length === 0 && v3.erro === 'sem_stills' && v3.itens[0].estado === 'not_met')
const v4 = await L.verificarExpectativas({ stills: ['u1'], espera: ['x'], apiKey: 'k', fetchImpl: async () => { throw new Error('boom') } })
const v5 = await L.verificarExpectativas({ stills: ['u1'], espera: ['x'], apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 429 }) })
const v6 = await L.verificarExpectativas({ stills: ['u1'], espera: ['x'], apiKey: '', fetchImpl: fetchOk })
checa('B17 verificarExpectativas: nunca lança — fetch que lança, HTTP 429 e sem chave viram itens em erro', v4.erro.startsWith('fetch_') && v4.itens[0].estado === 'erro' && v5.erro === 'http_429' && v6.erro === 'sem_chave')

// ── C. a comparação ──
console.log('== C. scripts/banco-prova/comparar.mjs ==')
const C = await import(pathToFileURL(join(RAIZ, 'scripts/banco-prova/comparar.mjs')).href)
const rod = (casos) => ({ casos: casos.map(([id, nota, extra]) => ({ id, nota, ...(extra ?? {}) })) })
const base = rod([['a', 80], ['b', 70], ['c', 50], ['d', 90]])
checa('C1 totalDaRodada: média com 1 casa; sem nota = null', C.totalDaRodada(base.casos) === 72.5 && C.totalDaRodada([{ nota: null }]) === null && C.totalDaRodada([]) === null)
const igual = C.compararRodadas(rod([['a', 80], ['b', 70], ['c', 50], ['d', 90]]), base)
checa('C2 rodada igual à baseline: libera, sem regressões; "c" continua abaixo = aviso', igual.bloqueia === false && igual.regressoes.length === 0 && igual.avisos.some((a) => a.startsWith('c:')) && igual.queda === 0)
const caiuTotal = C.compararRodadas(rod([['a', 70], ['b', 65], ['c', 50], ['d', 85]]), base)
checa('C3 total caiu 5 > tolerância 1: bloqueia pelo total (nenhum caso abaixo do limiar regrediu)', caiuTotal.bloqueia === true && caiuTotal.regressoes.length === 0 && caiuTotal.motivos[0].startsWith('total caiu 5 '))
const dentroTol = C.compararRodadas(rod([['a', 80], ['b', 69], ['c', 50], ['d', 89]]), base)
checa('C4 queda de 0,5 dentro da tolerância: libera', dentroTol.bloqueia === false && dentroTol.queda === 0.5)
const regrediu = C.compararRodadas(rod([['a', 81], ['b', 59], ['c', 50], ['d', 100]]), base)
checa('C5 "b" caiu de 70 para 59 (limiar 60): bloqueia por regressão mesmo com o total igual', regrediu.bloqueia === true && regrediu.regressoes.length === 1 && regrediu.regressoes[0].id === 'b' && regrediu.queda === 0 && regrediu.motivos.length === 1)
const limiarProprio = C.compararRodadas(rod([['a', 81], ['b', 59, { limiar: 50 }], ['c', 50], ['d', 100]]), base)
checa('C6 limiar próprio do caso (50): 59 não regride', limiarProprio.bloqueia === false)
const erroCaso = C.compararRodadas(rod([['a', 80], ['b', 70], ['c', 50], ['d', null, { erro: 'http_500' }]]), base, { tolerancia: 100 })
checa('C7 caso que tinha nota e agora só tem erro: bloqueia', erroCaso.bloqueia === true && erroCaso.regressoes[0].id === 'd' && /http_500/.test(erroCaso.regressoes[0].motivo))
const novo = C.compararRodadas(rod([['a', 80], ['b', 70], ['c', 50], ['d', 90], ['e', 10]]), base, { tolerancia: 100 })
checa('C8 caso novo abaixo do limiar: aviso, nunca bloqueio', novo.bloqueia === false && novo.novos.includes('e') && novo.avisos.some((a) => a.startsWith('e:')))
const parcial = C.compararRodadas(rod([['a', 80], ['c', 50]]), base)
checa('C9 rodada parcial: compara o total só sobre os casos que rodaram (65 vs 65) e marca os sumidos como aviso', parcial.bloqueia === false && parcial.total_base_comparavel === 65 && parcial.total_atual === 65 && parcial.sumidos.length === 2 && parcial.avisos.some((a) => a.includes('não rodou')))
const semBase = C.compararRodadas(rod([['a', 10]]), null)
checa('C10 sem baseline: nada bloqueia; totais da base null', semBase.bloqueia === false && semBase.total_base === null && semBase.novos.includes('a'))
const md1 = C.tabelaMarkdown({ quando: 'q', url: 'u', custo_usd: 1.5, casos: regrediu.regressoes.length ? rod([['a', 80], ['b', 59], ['c', 50], ['d', 95]]).casos : [] }, { ...regrediu, casos_base: base.casos })
checa('C11 tabelaMarkdown: uma linha por caso, BLOQUEIA quando regrediu, base ao lado', md1.includes('BLOQUEIA') && md1.includes('| b |') && md1.includes('REGREDIU') && md1.includes('| 70 |'))
checa('C12 tabelaMarkdown: "Libera" sem regressão e "Sem baseline" sem comparação', C.tabelaMarkdown({ casos: base.casos }, igual).includes('Libera') && C.tabelaMarkdown({ casos: base.casos }, null).includes('Sem baseline'))

// ── D. o banco ──
console.log('== D. scripts/banco-prova/casos.json ==')
const banco = JSON.parse(rd('scripts/banco-prova/casos.json'))
const casos = banco.casos
const ids = new Set(casos.map((c) => c.id))
checa('D1 30 casos, ids únicos, padrão 15 s Seedance com script_mode ai', casos.length === 30 && ids.size === 30 && banco.padrao.duracao === 15 && banco.padrao.motor === 'seedance' && banco.padrao.script_mode === 'ai')
checa('D2 todo caso tem id, idioma, texto, duracao 15, motor seedance e ≥ 3 expectativas (≤ 12, ≤ 200 chars)', casos.every((c) => typeof c.id === 'string' && /^[a-z0-9-]+$/.test(c.id) && typeof c.idioma === 'string' && c.idioma.length >= 2 && typeof c.texto === 'string' && c.texto.length >= 20 && c.duracao === 15 && c.motor === 'seedance' && Array.isArray(c.espera) && c.espera.length >= 3 && c.espera.length <= 12 && c.espera.every((e) => typeof e === 'string' && e.length >= 3 && e.length <= 200)))
const reais = {
  'krishna-vishwaroop': 'Under a deep indigo sky... a tiny blue-skinned Lord Krishna emerges.\n\nA glowing red-orange mandala... Sanskrit-style runes spinning behind him.\n\nColossal Vishwaroop rises... multiple serene faces and ornate armor.\n\nThe mandala flares brilliantly... Krishna stands small against the vast cosmic form.',
  'frutas-3d': 'Cute 3D animated fruit characters with human bodies. A beautiful strawberry girl wearing a pink dress, a tall banana boy wearing a black suit, a cherry girl in a red dress, and a pineapple boy in a beige outfit. Full body, colorful cinematic animation, expressive faces, high quality, vertical 9:16.',
  'urdu-amna-estrela': 'ایک چھوٹا سا راز... جادوئی ستارے کا!\n\nآمنہ کو ملا ایک جادوئی ستارہ، چمکدار اور پراسرار۔\n\nمشو، ننھا ڈریگن، ستارے کی طاقت کو سمجھنے کی کوشش کرتا ہے۔\n\nبابا نور کی مدد سے... آمنہ نے ستارے کو دوبارہ آسمان پر سجایا۔',
  'james-turner-1953': 'A 70-year-old mystery... still unsolved today!\n\nIn 1953, James Turner vanished without a trace.\n\nHis car was found running, but he was gone.\n\nThe most accepted theory? A secret Cold War mission... led him to disappear.',
  'ploc-alienigena': 'Ploc, um alienígena laranja, aperta um botão misterioso!\n\nCada espirro... um novo Ploc surge, clonando-se sem parar!\n\nGeli, a geleia roxa, tenta impedir o desastre com urgência.\n\nBip, o robô verde, acidentalmente ativa outra alavanca... aumentando o caos!',
  'the-last-train': 'Create a 15second vertical cinematic horror Short titled The Last Train. A commuter boards an empty last train. A distorted announcement says his full name and tells him to leave at the next station, but that station does not exist on the route map. The train stops in a dark tunnel. Dozens of silent passengers stand outside the windows, staring at him. The doors open; cut to black before he steps out.',
  'pakistan-flag-rooftop': 'A proud young woman waves the green and white Pakistan flag on a rooftop at sunset as fireworks burst over Lahore.',
  'sarajevo-1914': '28 June 1914, Sarajevo: Archduke Franz Ferdinand and his wife Sophie ride in an open car before the shots that started World War I.',
}
const porId = new Map(casos.map((c) => [c.id, c]))
checa('D3 os 8 pedidos reais estão no banco VERBATIM', Object.entries(reais).every(([id, texto]) => porId.get(id)?.texto === texto))
checa('D4 expectativas dos reais dizem o que falhou (Krishna azul e não mascote; Amna + Baba Noor; anos 1950; geleia não água-viva; passageiro visível; mastro na mão; Sophie)', /blue skin/i.test(porId.get('krishna-vishwaroop').espera.join(' ')) && /mascot/i.test(porId.get('krishna-vishwaroop').espera.join(' ')) && /Amna/.test(porId.get('urdu-amna-estrela').espera.join(' ')) && /Baba Noor/.test(porId.get('urdu-amna-estrela').espera.join(' ')) && /1950s/.test(porId.get('james-turner-1953').espera.join(' ')) && /jellyfish/i.test(porId.get('ploc-alienigena').espera.join(' ')) && /commuter/i.test(porId.get('the-last-train').espera.join(' ')) && /pole/i.test(porId.get('pakistan-flag-rooftop').espera.join(' ')) && /Sophie/.test(porId.get('sarajevo-1914').espera.join(' ')))
const idiomas = new Set(casos.map((c) => c.idioma))
checa('D5 idiomas cobertos: en, pt, ur, ko, hi, ar, es, ro', ['en', 'pt', 'ur', 'ko', 'hi', 'ar', 'es', 'ro'].every((l) => idiomas.has(l)))
checa('D6 famílias cobertas: desenho infantil, animais, dinheiro, história, terror, produto, texto em objeto, multidão', ['kids-', 'animais-', 'dinheiro-', 'historia-', 'terror-', 'produto-', 'texto-', 'multidao-'].every((p) => casos.filter((c) => c.id.startsWith(p)).length >= 2))

// ── E. o executor ──
console.log('== E. scripts/banco-prova/rodar.mjs ==')
const rodarSrc = rd('scripts/banco-prova/rodar.mjs')
checa('E1 manda dry_run: \'stills\' e nunca dry_run: true', rodarSrc.includes("dry_run: 'stills'") && !/dry_run:\s*true/.test(rodarSrc))
checa('E2 sai com 1 no bloqueio e com 0 sem baseline', /if \(comp\.bloqueia\) \{[^\n]*process\.exit\(1\)/.test(rodarSrc) && /sem baseline[\s\S]{0,200}process\.exit\(0\)/.test(rodarSrc))
checa('E3 documenta as envs (COOKIE ou EMAIL+SENHA, URL, PARALELO, TOLERANCIA) e --salvar-baseline', ['BANCO_PROVA_COOKIE', 'BANCO_PROVA_EMAIL', 'BANCO_PROVA_SENHA', 'BANCO_PROVA_URL', 'BANCO_PROVA_PARALELO', 'BANCO_PROVA_TOLERANCIA', '--salvar-baseline'].every((s) => rodarSrc.includes(s)))
checa('E4 nenhum segredo no arquivo (sem JWT, sem sk-, sem senha literal)', !/eyJ[A-Za-z0-9_-]{20,}/.test(rodarSrc) && !/sk-[A-Za-z0-9]{20,}/.test(rodarSrc) && !/SENHA\s*=\s*['"][^'"]+['"]/.test(rodarSrc))
checa('E5 baseline só se salva com ≥ 80 % dos casos com nota (ou --forcar) e nunca de rodada parcial sem --forcar', rodarSrc.includes('* 0.8') && rodarSrc.includes('--forcar') && /filtro\.length && !forcar/.test(rodarSrc))
const R = await import(pathToFileURL(join(RAIZ, 'scripts/banco-prova/rodar.mjs')).href)
checa('E6 seedDoCaso: determinística, inteira, < 2^31−1, diferente por caso', R.seedDoCaso('krishna-vishwaroop') === R.seedDoCaso('krishna-vishwaroop') && Number.isInteger(R.seedDoCaso('a')) && R.seedDoCaso('a') < 2_147_483_647 && R.seedDoCaso('a') !== R.seedDoCaso('b'))
const corpo = R.corpoDoCaso(casos[0], banco.padrao)
checa('E7 corpoDoCaso: generationId válido, prompt verbatim, duration 15, seedance, language, script_mode ai, banco_prova com caso/espera/seed', /^[A-Za-z0-9_-]{8,100}$/.test(corpo.generationId) && corpo.prompt === casos[0].texto && corpo.duration === 15 && corpo.engine === 'seedance' && corpo.language === casos[0].idioma && corpo.script_mode === 'ai' && corpo.dry_run === 'stills' && corpo.banco_prova.caso === casos[0].id && corpo.banco_prova.espera.length === casos[0].espera.length && corpo.banco_prova.seed === R.seedDoCaso(casos[0].id))
const ck = R.cookieDaSessao('https://cqqukkvjjrguayiyjvhh.supabase.co', { access_token: 'a'.repeat(4000), refresh_token: 'r', expires_at: 1, user: { id: 'u' } })
const ckPequeno = R.cookieDaSessao('https://cqqukkvjjrguayiyjvhh.supabase.co', { access_token: 'a', refresh_token: 'r', expires_at: 1 })
checa('E8 cookieDaSessao: molde do @supabase/ssr — sb-<ref>-auth-token, "base64-", pedaços .0/.1 acima de 3180', ck.includes('sb-cqqukkvjjrguayiyjvhh-auth-token.0=base64-') && ck.includes('sb-cqqukkvjjrguayiyjvhh-auth-token.1=') && ckPequeno.startsWith('sb-cqqukkvjjrguayiyjvhh-auth-token=base64-') && !ckPequeno.includes('.0='))
const l403 = R.linhaDoCaso(casos[0], { error: 'x', reason: 'dry_run_not_authorized' }, 403, 10, 60)
const lOk = R.linhaDoCaso(casos[0], { banco_prova: { nota: 73, nota_critico: 80, taxa_expectativas: 0.667, falhas: { expectativa: 1 }, cenas: 3, cenas_com_still: 3, refunded: true, charged: false, custo_usd: 0.05, generation_id: 'g', detalhe: [], expectativas: [] } }, 200, 10, 60)
checa('E9 linhaDoCaso: 403 vira erro sem nota; 200 com banco_prova vira a linha com nota, limiar e estorno', l403.nota === null && l403.erro === 'http_403:dry_run_not_authorized' && lOk.nota === 73 && lOk.limiar === 60 && lOk.refunded === true && lOk.charged === false && lOk.erro === null)

// ── F. mutante ──
console.log('== F. mutante ==')
const mutante = rota.replace('const bancoProvaStills = ehPedidoDeStills(body.dry_run) && isDryRunAccount(user.email)', 'const bancoProvaStills = ehPedidoDeStills(body.dry_run)')
checa('F1 sem isDryRunAccount no gate do banco, A1 fica vermelha', mutante !== rota && provasDaRota(mutante).find(([n]) => n.startsWith('A1'))[1] === false)
const mutante2 = rota.replace('await releaseBirthClaim(BANCO_PROVA_MOTIVO_ESTORNO)', 'Promise.resolve(true)')
checa('F2 sem o estorno do claim, A6 fica vermelha', provasDaRota(mutante2).find(([n]) => n.startsWith('A6'))[1] === false)

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { console.log(falhas.map((f) => '  - ' + f).join('\n')); process.exit(1) }
