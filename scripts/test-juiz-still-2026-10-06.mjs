// KINEO-JUIZ-STILL-2026-10-06 [TRAVA 8.2 — vai do fundador 06/10 'vai juiz'] — o juiz da FOTO-BASE antes de animar (Seedance 2.5).
// Prova, sem rede e sem render:
//   (1) o juiz só roda na família s25 (JUIZ_STILL_FAMILIAS) — H3/Omni/Kling 3 ficam como estavam (nenhuma chamada, nenhum evento);
//   (2) teto de tempo: a chamada aborta no teto (min de 6 s, folga da cena, folga do filme); a cena não regera sem tempo; o filme
//       inteiro respeita os 45 s; disjuntor depois de 2 falhas seguidas;
//   (3) falha aberta: erro de rede/HTTP/JSON, gerador que lança, juiz que lança na rota — a foto de antes segue e a cena vai ao vídeo;
//   (4) no máximo UMA regeração por foto; 2º REJECT segue a de nota maior (empate = a original);
//   (5) a instrução da foto nova é positiva e NÃO nomeia o objeto proibido (nem a correção do juiz, se ela trouxer negação, o
//       objeto, objeto com letras ou gente onde a cena não tinha);
//   (6) evento juiz_still por foto (veredito, motivo, regerou?, custo, ms) e juiz_still_resumo por filme;
//   (7) a aba /admin/coerencia lê o resumo (lib/admin/fastCoherence) e a linha do filme mostra o juiz ao lado da nota;
//   (8) mutantes: cada âncora quebrada fica vermelha — e cada mutante prova que aplicou.
// As fatias executadas são as REAIS da rota (o fecho do juiz, a cena do laço hollywood de const envSig até submittedPrompt, o
// resumo depois do laço), com a lib real (lib/hollywood/juizStill) e as libs puras do S25 (s25Cena, fidelidade, sceneTruth…).
// Estilo readFileSync + ts.transpileModule, sem alias @/ (molde scripts/test-s25-nota95-2026-10-06.mjs).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(RAIZ, 'node_modules', 'typescript'))
const React = require(join(RAIZ, 'node_modules', 'react'))
const ReactDOMServer = require(join(RAIZ, 'node_modules', 'react-dom', 'server'))
const jsxRuntime = require(join(RAIZ, 'node_modules', 'react', 'jsx-runtime'))
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const MARCA = 'KINEO-JUIZ-STILL-2026-10-06'
const LIB = 'lib/hollywood/juizStill.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const ADMIN = 'lib/admin/fastCoherence.ts'
const PAGINA = 'app/admin/coerencia/page.tsx'
const S25 = 'lib/hollywood/s25Cena.ts'
const FID = 'lib/hollywood/fidelidade.ts'
const TRUTH = 'lib/cinematic/sceneTruth.ts'
const VMODE = 'lib/cinematic/visualMode.ts'
const STYLE = 'lib/cinematic/sceneStyle.ts'

// rede proibida: o juiz só fala com o fetch falso de cada caso
globalThis.fetch = () => { throw new Error('rede proibida no guardião') }

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const silencioso = { log() {}, warn() {}, error() {} }

/** Módulo TS → exports. `mapa` resolve imports (sem mapa: módulo precisa ser puro); `escopo` injeta nomes (ex.: setTimeout falso). */
function carrega(src, { mapa = null, escopo = {}, tsx = false } = {}) {
  const js = ts.transpileModule(src, { fileName: tsx ? 'm.tsx' : 'm.ts', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const mod = { exports: {} }
  const nomes = Object.keys(escopo)
  const req = (n) => { if (mapa && n in mapa) return mapa[n]; throw new Error(`import inesperado ${n} (módulo precisa ser puro)`) }
  new Function('module', 'exports', 'require', ...nomes, js)(mod, mod.exports, req, ...nomes.map((k) => escopo[k]))
  return mod.exports
}
const fatia = (txt, ini, fim, incluiFim) => {
  const a = txt.indexOf(ini)
  const b = a < 0 ? -1 : txt.indexOf(fim, a + ini.length)
  return a < 0 || b < 0 ? null : txt.slice(a, incluiFim ? b + fim.length : b)
}
const comTeto = (p, ms) => Promise.race([p, new Promise((resolve) => setTimeout(() => resolve('__TETO_DO_GUARDIAO__'), ms))])

// ── o juiz falso: respostas em fila (objeto = JSON do modelo; número = HTTP; Error = rede; 'pendura' = só termina abortado) ──
function juizFalso(respostas, relogio, passoMs = 1_500) {
  const pedidos = []
  const fetchImpl = async (url, init) => {
    const corpo = JSON.parse(init.body)
    pedidos.push(corpo)
    if (relogio) relogio.t += passoMs
    const r = respostas.length ? respostas.shift() : { verdict: 'OK', criterion: 'none', score: 80 }
    if (r === 'pendura') return new Promise((_, rej) => init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e) }))
    if (r instanceof Error) throw r
    if (typeof r === 'number') return { ok: false, status: r, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r) } }], usage: { prompt_tokens: 6000, completion_tokens: 50 } }) }
  }
  return { fetchImpl, pedidos }
}
const relogioFalso = (t = 1_000_000) => { const r = { t }; r.agora = () => r.t; return r }

// ── o filme de Boston 1919 (fatos do roteiro de 06/10, 3a0082b2) em 3 cenas, como a rota as recebe antes do laço ──
const ROTEIRO = 'In January 1919, a steel tank in Boston held two point three million gallons of molasses. At half past noon on a warm winter day, its rivets burst with a sound like gunfire. A brown wave twenty five feet high rolled through the North End.'
const ESTILO = 'shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain'
const AMBIENTE = 'A cold harbor street in the North End of Boston in January 1919, red-brick warehouses and an elevated railway'
const ERA = ', period piece set strictly in the year 1919, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects'
const CENAS = [
  { index: 1, type: 'support', seconds: 8, voiceover: 'In January 1919, a steel tank in Boston held two point three million gallons of molasses.', prompt: `${AMBIENTE}, with a huge riveted steel tank towering over the rooftops. Cinematography (match exactly): ${ESTILO}.` },
  { index: 2, type: 'cinematic', seconds: 8, voiceover: 'At half past noon on a warm winter day, its rivets burst with a sound like gunfire.', prompt: `Extreme close-up of steel rivets bursting from a riveted steel seam, dark syrup spraying out. Cinematography (match exactly): ${ESTILO}.` },
  { index: 3, type: 'support', seconds: 8, voiceover: 'A brown wave twenty five feet high rolled through the North End.', prompt: `${AMBIENTE}, a massive brown wave of molasses rolling down the street between the warehouses. Cinematography (match exactly): ${ESTILO}.` },
]
const SEED = 123_456_789
const GEN = 'gen-juiz-boston-1919'

// respostas do juiz no filme (na ordem das chamadas)
const R_AMB_REJ = { verdict: 'REJECT', criterion: 'anachronism', object: 'glass skyscrapers', reason: 'arranha-céus de vidro em Boston 1919', fix: 'low red-brick warehouses and an elevated iron railway of 1919 Boston', score: 35 }
const R_OK_88 = { verdict: 'OK', criterion: 'none', object: '', reason: '', fix: '', score: 88 }
const R_OK_90 = { verdict: 'OK', criterion: 'none', object: '', reason: '', fix: '', score: 90 }
const R_TXT_40 = { verdict: 'REJECT', criterion: 'text', object: 'shop sign', reason: 'placa de loja com letras legíveis', fix: '', score: 40 }
const R_TXT_30 = { verdict: 'REJECT', criterion: 'text', object: 'shop sign', reason: 'letreiro legível de novo', fix: '', score: 30 }

const ENTRADA = (o = {}) => ({ indice: 2, url: 'still://3', origem: 'still', prompt: 'A massive brown wave of molasses rolling down a street of red-brick warehouses. Boston, 1919: period clothing, vehicles, tools and buildings only, no modern items. Camera upright, level horizon.', nucleo: 'A massive brown wave of molasses rolling down a street of red-brick warehouses.', epoca: 'Boston, 1919: period clothing, vehicles, tools and buildings only, no modern items.', fala: 'A brown wave twenty five feet high rolled through the North End.', plano: 'aberto', fotoAnterior: { cena: 2, url: 'still://2', plano: 'close' }, descricoesAnteriores: [{ cena: 1, descricao: 'A cold harbor street' }, { cena: 2, descricao: 'Extreme close-up of steel rivets' }], seed: SEED, ...o })

async function verificacoes(over = {}) {
  const V = []
  const v = (rotulo, prova) => V.push([rotulo, Boolean(prova)])
  const src = (p) => (over[p] ?? rd(p)).replace(/\r\n/g, '\n')
  // setTimeout do módulo: real (padrão) ou "dispara já" (prova o aborto sem esperar 6 s); registra o teto pedido
  const tetos = []
  const stReal = (fn, ms) => { tetos.push(ms); return setTimeout(fn, ms) }
  const stJa = (fn, ms) => { tetos.push(ms); queueMicrotask(fn); return 0 }
  let L, LJa, S, F, ST, VMO, SS
  try {
    L = carrega(src(LIB), { escopo: { setTimeout: stReal, clearTimeout } })
    LJa = carrega(src(LIB), { escopo: { setTimeout: stJa, clearTimeout: () => {} } })
    S = carrega(src(S25)); F = carrega(src(FID)); ST = carrega(src(TRUTH)); VMO = carrega(src(VMODE)); SS = carrega(src(STYLE))
  } catch (e) { v(`módulos carregam (a lib do juiz é pura): ${e.message}`, false); return V }

  // ═══ (1) só s25 ═══
  v('JUIZ_STILL_FAMILIAS = [s25] e juizStillLigado só no s25', JSON.stringify(L.JUIZ_STILL_FAMILIAS) === '["s25"]' && L.juizStillLigado('s25') && ['h3', 'omni', 'hollywood', 'seedance', 'kling', 'veo', '', null, undefined].every((f) => !L.juizStillLigado(f)))

  // ═══ o pedido ao juiz ═══
  {
    const p = L.montarPedidoAoJuiz(ENTRADA(), 'still://3')
    const user = p.messages[1].content
    const textos = user.filter((x) => x.type === 'text').map((x) => x.text).join('\n')
    const imgs = user.filter((x) => x.type === 'image_url')
    v('pedido: a foto (detail low) + época/lugar "Boston, 1919" + o que a cena deve mostrar + a narração + as cenas anteriores (foto e texto)', imgs.length === 2 && imgs[0].image_url.url === 'still://3' && imgs[1].image_url.url === 'still://2' && imgs.every((i) => i.image_url.detail === 'low') && textos.includes('Era and place: Boston, 1919') && textos.includes('What the shot must show: A massive brown wave') && textos.includes('Narration heard during the shot: "A brown wave') && textos.includes('scene 2: Extreme close-up of steel rivets') && p.imagens === 2)
    const sem = L.montarPedidoAoJuiz(ENTRADA({ fotoAnterior: null, epoca: '' }), 'still://3')
    v('pedido sem foto anterior: 1 imagem e "never use REPEAT"; sem época: anacronismo só contra a história', sem.imagens === 1 && JSON.stringify(sem.messages).includes('never use REPEAT') && JSON.stringify(sem.messages).includes('not stated'))
    const sis = p.messages[0].content
    v('o sistema traz os 4 critérios objetivos, "na dúvida OK" e o JSON', /ANACHRONISM/.test(sis) && /FACING_CAMERA/.test(sis) && /TEXT/.test(sis) && /REPEAT/.test(sis) && /When unsure, answer OK/.test(sis) && /"verdict":"OK"\|"REJECT"/.test(sis))
  }

  // ═══ a resposta ═══
  {
    const r1 = L.lerRespostaDoJuiz(JSON.stringify(R_AMB_REJ), true)
    v('resposta REJECT anacronismo lida (critério, objeto, motivo, correção, nota)', r1 && r1.veredito === 'REJECT' && r1.criterio === 'anacronismo' && r1.objeto === 'glass skyscrapers' && r1.nota === 35 && r1.correcao.startsWith('low red-brick'))
    const gosto = L.lerRespostaDoJuiz(JSON.stringify({ verdict: 'REJECT', criterion: 'none', reason: 'feia', score: 20 }), true)
    v('REJECT sem critério objetivo (gosto) vira OK', gosto && gosto.veredito === 'OK')
    const rep = L.lerRespostaDoJuiz(JSON.stringify({ verdict: 'REJECT', criterion: 'repeat', reason: 'igual', score: 20 }), false)
    v('REJECT por repetição sem foto anterior mostrada vira OK', rep && rep.veredito === 'OK')
    v('lixo / JSON sem veredito = null (vira ERRO, falha aberta)', L.lerRespostaDoJuiz('não é json', true) === null && L.lerRespostaDoJuiz('{"verdict":"MAYBE"}', true) === null && L.lerRespostaDoJuiz('[]', true) === null)
    const nota = L.lerRespostaDoJuiz('{"verdict":"OK","score":250}', true)
    v('nota presa em 0-100', nota && nota.nota === 100)
  }

  // ═══ (5) a instrução da foto nova ═══
  {
    const PROMPT_SEM_GENTE = ENTRADA().prompt
    const casos = [
      ['glass skyscrapers', 'low red-brick warehouses and an elevated iron railway of 1919 Boston', true],
      ['glass skyscrapers', 'no skyscrapers, only low brick buildings of 1919', false],
      ['jeans', 'a heavy wool coat and felt hat of 1816 on a farmer walking through snow', false],
      ['modern car', 'horse-drawn wagons on a cobbled street of 1919', true],
      ['neon sign', 'a shop front with a painted wooden sign of 1919', false],
      ['plastic bottle', 'a corked stoneware jug of 1816', true],
      ['plastic bottle', 'a corked glass bottle', false],
      ['smartphone', 'without any devices, a quiet street', false],
    ]
    let filtros = true
    for (const [objeto, correcao, esperado] of casos) if (L.correcaoValida(correcao, objeto, PROMPT_SEM_GENTE) !== esperado) filtros = false
    v('correção do juiz só entra positiva: sem negação, sem o substantivo do objeto, sem objeto com letras, sem pôr gente numa cena sem gente (8 casos)', filtros)
    v('correção com gente vale quando a cena já tinha gente', L.correcaoValida('a heavy wool coat and felt hat of 1816 on a farmer walking through snow', 'jeans', 'A farmer walks through the snow') === true)
    const objetos = ['glass skyscrapers', 'jeans', 'knit beanie', 'modern car', 'plastic bottle', 'smartphone', 'neon sign', 'power lines', 'asphalt road']
    let semObjeto = true
    let semNegacao = true
    for (const objeto of objetos) for (const criterio of ['anacronismo', 'encara_camera', 'texto', 'repetida']) for (const correcao of ['', `no ${objeto}`, `the ${objeto} replaced by period ones`, 'cobbled street of 1919']) {
      const { instrucao } = L.instrucaoDeRegeracao({ criterio, correcao, objeto, epoca: ENTRADA().epoca, prompt: PROMPT_SEM_GENTE, plano: 'aberto', planoAnterior: 'aberto' })
      const promptNovo = L.promptDaRegeracao(PROMPT_SEM_GENTE, ENTRADA().nucleo, instrucao)
      // a instrução não cita o objeto e o prompt da foto nova não ganha NENHUMA citação além das que o prompt da cena já tinha
      if (L.citaObjeto(instrucao, objeto) || L.contaCitacoes(promptNovo, objeto) !== L.contaCitacoes(PROMPT_SEM_GENTE, objeto)) semObjeto = false
      if (/\b(?:no|not|without|never|nothing|none|avoid)\b/i.test(instrucao)) semNegacao = false
    }
    v('instrução da foto nova NUNCA nomeia o objeto proibido e não acrescenta citação ao prompt (9 objetos × 4 critérios × 4 correções)', semObjeto)
    v('qualificador genérico não é o objeto ("modern car" proíbe "car"; a frase de época "no modern items" não conta)', JSON.stringify(L.radicaisDoObjeto('modern car')) === '["car"]' && L.contaCitacoes(PROMPT_SEM_GENTE, 'modern car') === 0 && JSON.stringify(L.radicaisDoObjeto('glass skyscrapers')) === '["glass","skyscraper"]')
    v('instrução da foto nova nunca usa negação (o motor não tem negative_prompt)', semNegacao)
    const ana = L.instrucaoDeRegeracao({ criterio: 'anacronismo', correcao: '', objeto: 'glass skyscrapers', epoca: ENTRADA().epoca, prompt: PROMPT_SEM_GENTE, plano: 'aberto', planoAnterior: null })
    const anaFix = L.instrucaoDeRegeracao({ criterio: 'anacronismo', correcao: R_AMB_REJ.fix, objeto: R_AMB_REJ.object, epoca: ENTRADA().epoca, prompt: PROMPT_SEM_GENTE, plano: 'aberto', planoAnterior: null })
    v('anacronismo: frase padrão com a época ("true to Boston, 1919"); correção boa do juiz vai na frente', ana.instrucao.includes('true to Boston, 1919') && !ana.usouCorrecao && anaFix.usouCorrecao && anaFix.instrucao.startsWith('Low red-brick warehouses') && anaFix.instrucao.includes('true to Boston, 1919'))
    const rep = L.instrucaoDeRegeracao({ criterio: 'repetida', correcao: '', objeto: '', epoca: '', prompt: PROMPT_SEM_GENTE, plano: 'aberto', planoAnterior: 'aberto' })
    v('repetida: troca de plano (anterior aberto → close-up); texto: superfícies lisas; câmera: de lado/de costas', rep.instrucao.includes('extreme close-up') && L.instrucaoDeRegeracao({ criterio: 'texto', correcao: '', objeto: 'sign', epoca: '', prompt: '', plano: null, planoAnterior: null }).instrucao === 'Every surface plain and unmarked.' && /from the side or from behind/.test(L.instrucaoDeRegeracao({ criterio: 'encara_camera', correcao: '', objeto: 'man', epoca: '', prompt: '', plano: null, planoAnterior: null }).instrucao))
    const pn = L.promptDaRegeracao(ENTRADA().prompt, ENTRADA().nucleo, 'Every surface plain and unmarked.')
    v('a instrução entra logo depois do visual da cena (onde a época mora no S25), o resto continua', pn.startsWith(`${ENTRADA().nucleo} Every surface plain and unmarked. Boston, 1919:`) && pn.endsWith('Camera upright, level horizon.'))
    const s1 = L.seedDaRegeracao(SEED, 2)
    v('semente da foto nova: outra, determinística, dentro de 31 bits', s1 !== SEED && s1 === L.seedDaRegeracao(SEED, 2) && s1 !== L.seedDaRegeracao(SEED, 3) && s1 >= 0 && s1 < 2 ** 31)
  }

  // ═══ (2)(3)(4) o julgamento de uma foto ═══
  const julga = async (entrada, respostas, { gerar = null, relogio = relogioFalso(), filme = L.novoFilmeDoJuiz(), lib = L, passo = 1_500 } = {}) => {
    const j = juizFalso(respostas, relogio, passo)
    const geradas = []
    const gerarStill = gerar ?? (async (prompt, seed, janela) => { geradas.push({ prompt, seed, janela }); relogio.t += 4_000; return `regen://${geradas.length}` })
    const r = await lib.julgarFotoBase(entrada, { filme, gerarStill: async (...a) => { if (gerar) geradas.push({ prompt: a[0], seed: a[1], janela: a[2] }); return gerarStill(...a) }, fetchImpl: j.fetchImpl, apiKey: 'chave-de-teste', agora: relogio.agora })
    return { ...r, pedidos: j.pedidos, geradas, filme }
  }
  {
    const a = await julga(ENTRADA(), [R_OK_90])
    v('OK: a foto segue, nenhuma regeração, 1 chamada, custo do juiz > 0', a.url === 'still://3' && a.geradas.length === 0 && a.relato.chamadas === 1 && a.relato.veredito === 'OK' && a.relato.custo_usd > 0 && !a.relato.regerou)
    const b = await julga(ENTRADA(), [R_TXT_40, R_OK_88])
    v('REJECT → UMA foto nova (semente nova, janela ≤ 9 s) → OK: segue a nova', b.url === 'regen://1' && b.geradas.length === 1 && b.geradas[0].seed === L.seedDaRegeracao(SEED, 2) && b.geradas[0].janela <= 9_000 && b.relato.escolhida === 'regerada' && b.relato.veredito_regerada === 'OK' && b.relato.chamadas === 2)
    v('custo da foto nova entra no relato (US$ 0,015 + as 2 chamadas)', Math.abs(b.relato.custo_usd - (0.015 + 2 * (6000 * 0.15e-6 + 50 * 0.6e-6))) < 1e-6)
    const c = await julga(ENTRADA(), [R_TXT_40, R_TXT_30])
    v('REJECT → REJECT (nota menor): segue a ORIGINAL; o gerador foi chamado UMA vez só', c.url === 'still://3' && c.geradas.length === 1 && c.relato.escolhida === 'original' && c.relato.veredito_regerada === 'REJECT' && c.pedidos.length === 2)
    const d = await julga(ENTRADA(), [R_TXT_30, R_TXT_40])
    v('REJECT → REJECT (nota maior): segue a nova; ainda uma regeração só', d.url === 'regen://1' && d.geradas.length === 1)
    const e = await julga(ENTRADA(), [R_TXT_40, R_TXT_30, R_TXT_30, R_TXT_30])
    v('no máximo 1 regeração por foto, mesmo com o juiz recusando sem parar', e.geradas.length === 1 && e.pedidos.length === 2)
    const f = await julga(ENTRADA(), [R_TXT_40], { gerar: async () => null })
    v('foto nova que falha: segue a original, regeracao_ok=false, custo da tentativa contado', f.url === 'still://3' && f.relato.regeracao_ok === false && f.relato.regerou && f.relato.custo_usd >= 0.015)
    const g = await julga(ENTRADA(), [R_TXT_40], { gerar: async () => { throw new Error('fal caiu') } })
    v('gerador que LANÇA: falha aberta (original, regeracao_ok=false, sem erro de juiz)', g.url === 'still://3' && g.relato.regeracao_ok === false && g.relato.erro === null)
    for (const [nome, resp] of [['rede', new Error('ECONNRESET')], ['HTTP 500', 500], ['JSON ilegível', 'isto não é json']]) {
      const h = await julga(ENTRADA(), [resp])
      v(`juiz com ${nome}: veredito ERRO, a foto de antes segue, nenhuma regeração`, h.url === 'still://3' && h.relato.veredito === 'ERRO' && h.geradas.length === 0 && typeof h.relato.erro === 'string')
    }
    // disjuntor: 2 falhas seguidas desligam o juiz no resto do filme
    {
      const filme = L.novoFilmeDoJuiz()
      const x1 = await julga(ENTRADA({ indice: 0, url: 'still://1', fotoAnterior: null }), [new Error('x')], { filme })
      const x2 = await julga(ENTRADA({ indice: 1, url: 'still://2', fotoAnterior: null }), [503], { filme })
      const x3 = await julga(ENTRADA({ indice: 2, url: 'still://3', fotoAnterior: null }), [R_TXT_40], { filme })
      v('disjuntor: 2 falhas seguidas → a 3ª foto nem chama o juiz (PULADO) e segue', x1.relato.veredito === 'ERRO' && x2.relato.veredito === 'ERRO' && filme.desligado && x3.relato.veredito === 'PULADO' && x3.relato.pulado_por === 'disjuntor' && x3.pedidos.length === 0 && x3.url === 'still://3')
    }
    // teto de tempo da CHAMADA: o pedido aborta no teto (setTimeout do módulo dispara já) e vira ERRO — nada pendura
    {
      tetos.length = 0
      const t = await comTeto(LJa.chamarJuiz(ENTRADA(), 'still://3', { timeoutMs: 6_000, fetchImpl: juizFalso(['pendura']).fetchImpl, apiKey: 'k' }), 1_500)
      v('teto da chamada: a chamada pendurada ABORTA no teto e vira ERRO timeout (nunca segura a cena)', t !== '__TETO_DO_GUARDIAO__' && t.veredito === 'ERRO' && /^timeout_6000ms$/.test(t.erro ?? '') && tetos.includes(6_000))
      tetos.length = 0
      const relogio = relogioFalso()
      const filme = L.novoFilmeDoJuiz()
      filme.gastoMs = 45_000 - 2_000
      await julga(ENTRADA(), [R_OK_90], { relogio, filme, lib: L, passo: 0 })
      v('teto da chamada = min(6 s, folga da cena, folga do filme): com 2 s de orçamento no filme, a chamada leva teto de 2 s', tetos.includes(2_000) && !tetos.includes(6_000))
    }
    // orçamento do FILME (45 s): esgotado, o juiz nem chama
    {
      const filme = L.novoFilmeDoJuiz()
      filme.gastoMs = 44_000
      const o = await julga(ENTRADA(), [R_TXT_40], { filme })
      v('orçamento do filme (45 s) esgotado: PULADO sem chamar o juiz, a foto segue', o.relato.veredito === 'PULADO' && o.relato.pulado_por === 'orcamento_filme' && o.pedidos.length === 0 && o.url === 'still://3')
    }
    // teto da CENA (20 s): o juiz demorou 15 s para recusar → não sobra tempo para foto nova + 2º julgamento
    {
      const relogio = relogioFalso()
      const p = await julga(ENTRADA(), [R_TXT_40, R_OK_88], { relogio, passo: 15_000 })
      v('teto da cena (20 s): recusa que chega aos 15 s não regera (pulado_por teto_cena), a foto segue', p.url === 'still://3' && p.geradas.length === 0 && p.relato.veredito === 'REJECT' && p.relato.pulado_por === 'teto_cena')
    }
    // mesma foto da cena anterior = repetição por construção (sem gastar o juiz na 1ª)
    {
      const q = await julga(ENTRADA({ url: 'still://2' }), [R_OK_88])
      v('a MESMA foto da cena anterior é recusada sem chamar o juiz (repetida) e ganha foto nova', q.relato.veredito === 'REJECT' && q.relato.criterio === 'repetida' && q.geradas.length === 1 && q.url === 'regen://1' && q.pedidos.length === 1)
    }
    // resumo do filme e leitura do painel
    {
      const filme = L.novoFilmeDoJuiz()
      await julga(ENTRADA({ indice: 0, url: 'still://1', fotoAnterior: null }), [R_OK_90], { filme })
      await julga(ENTRADA({ indice: 1, url: 'still://2', fotoAnterior: { cena: 1, url: 'still://1', plano: null } }), [R_TXT_40, R_OK_88], { filme })
      await julga(ENTRADA({ indice: 2, url: 'still://3' }), [R_TXT_40, R_TXT_30], { filme })
      const res = L.resumoDoJuizStill(filme, 4)
      v('resumo: 3 fotos, 3 julgadas, 2 recusadas, 2 refeitas, 1 salva, 1 com defeito, custo somado, motivos por cena', res.versao === 'juiz_still_v1' && res.cenas_no_filme === 4 && res.fotos === 3 && res.julgadas === 3 && res.aprovadas === 1 && res.recusadas === 2 && res.regeradas === 2 && res.salvas === 1 && res.com_defeito === 1 && res.motivos.length === 2 && res.motivos[0].cena === 2 && Math.abs(res.custo_usd - filme.relatos.reduce((s, r) => s + r.custo_usd, 0)) < 1e-6 && res.orcamento_ms === 45_000)
      const painel = L.lerResumoDoJuiz(JSON.parse(JSON.stringify(res)))
      v('o painel lê o resumo gravado (ida e volta pelo JSON); lixo = null', painel && painel.recusadas === 2 && painel.salvas === 1 && painel.motivos[1].veredito_regerada === 'REJECT' && L.lerResumoDoJuiz(null) === null && L.lerResumoDoJuiz({ versao: 'outra' }) === null && L.lerResumoDoJuiz([]) === null)
    }
  }

  // ═══ a rota: as fatias reais ═══
  const R = src(ROTA)
  v('rota: import da lib do juiz, marcado', R.includes("import { juizStillLigado, novoFilmeDoJuiz, julgarFotoBase, anterioresDoJuiz, resumoDoJuizStill, JUIZ_STILL_EVENTO, JUIZ_STILL_RESUMO_EVENTO } from '@/lib/hollywood/juizStill' // KINEO-JUIZ-STILL-2026-10-06"))
  // ordem: o fecho antes do laço; o juiz do still depois do still do S25, antes do Omni, da âncora e do POST; o da foto de
  // ambiente entre inNarratorWorld e anchorUrl; o resumo depois do laço e antes do acolchoamento
  {
    const i = (s, de = 0) => R.indexOf(s, de)
    const iFecho = i('      const juizStillCena = juizStillFilme // KINEO-JUIZ-STILL-2026-10-06')
    const iLaco = i('      for (const [idx, hs] of plan.scenes.entries()) {')
    const iStillS25 = i("          if ((hs.type === 'support' || hs.type === 'cinematic') && !anchorUrl && !s25PessoaEmQuadro) {")
    const iJuizCena = i("sceneStillUrl = await juizStillCena({ idx, url: sceneStillUrl, origem: 'still', cenas: s25Plano?.cenas ?? null })")
    const iOmni = i("          if (family === 'omni' && !anchorUrl && !sceneStillUrl && (hs.type === 'support' || hs.type === 'cinematic')) {")
    const iAncora = i('          const sceneAnchor = anchorUrl ?? sceneStillUrl ?? undefined')
    const iPost = i('            id = await submitToFalWithOneRetry(', iAncora)
    const iNarr = i('          const inNarratorWorld = envSig.length > 8')
    const iJuizAmb = i("            const ambienteJulgado = await juizStillCena({ idx, url: anchors.environmentUrl, origem: 'ambiente', cenas: s25Plano?.cenas ?? null })")
    const iAnchorUrl = i('          const anchorUrl = estrelaHollywood[idx] ? estrelaHollywood[idx] : anchors')
    const iResumo = i("name: JUIZ_STILL_RESUMO_EVENTO, userId: user.id, path: '/api/generate-video-cinematic', sessionId: generationId")
    const iPad = i('      while (hRequestIds.length < plan.scenes.length) {')
    v('rota: fecho antes do laço; juiz do still depois do still do S25 e ANTES do Omni, da âncora e do POST do vídeo', iFecho > 0 && iFecho < iLaco && iStillS25 > iLaco && iJuizCena > iStillS25 && iJuizCena < iOmni && iOmni < iAncora && iAncora < iPost)
    v('rota: juiz da foto de ambiente entre inNarratorWorld e a escolha da âncora; resumo depois do laço, antes do acolchoamento', iNarr > iLaco && iJuizAmb > iNarr && iJuizAmb < iAnchorUrl && iResumo > iPost && iResumo < iPad)
  }
  const corpoFecho = fatia(R, "      // ═══ KINEO-JUIZ-STILL-2026-10-06 [TRAVA 8.2 — vai do fundador 06/10 'vai juiz'] — o juiz da FOTO-BASE antes de animar ═══", '        : null // KINEO-JUIZ-STILL-2026-10-06\n', true)
  const corpoCena = fatia(R, "          const envSig = (plan.environmentSheet ?? '').trim().toLowerCase().slice(0, 24)", '          submittedPrompt = scenePrompt', true)
  const corpoResumo = fatia(R, '      // KINEO-JUIZ-STILL-2026-10-06 — o resumo do juiz da foto-base por filme', '\n\n      // Keep every response array parallel to plan.scenes.', false)
  if (!corpoFecho || !corpoCena || !corpoResumo) { v(`rota: fatias presentes (fecho=${!!corpoFecho} cena=${!!corpoCena} resumo=${!!corpoResumo})`, false); return V }
  let monta, cena, resumo
  try {
    monta = carrega(`export function monta(ctx: any) {\n  const { family, plan, hSceneAnchors, generationSeed, generateCinematicSceneStill, writeServerEvent, user, generationId, juizStillLigado, novoFilmeDoJuiz, julgarFotoBase, anterioresDoJuiz, JUIZ_STILL_EVENTO, ambienteComEpoca, console } = ctx\n${corpoFecho}\n  return { juizStillFilme, juizStillCena }\n}`).monta
    cena = carrega(`export async function cena(ctx: any) {\n  const { hs, idx, plan, family, hSceneAnchors, estrelaHollywood, generateCinematicSceneStill, generationSeed, OMNI_STILL_RETRY_BUDGET_MS, cinematicSceneModel, writeServerEvent, user, generationId, eraSuffix, fidelidadeRelato, garantirAcaoCentral, silenciarFalaNoPrompt, s25Plano, montarPromptS25, montarContrato, aplicarContrato, severidadeDe, proibidosPorModo, formatoVisual, contratoRelato, textSafetySuffix, console, juizStillCena } = ctx\n  let anchors = ctx.anchors\n  let omniStillRetryMs = 0\n  let sceneModel = ''\n  let submittedPrompt = ''\n${corpoCena}\n  return { submittedPrompt, ancora: hSceneAnchors[idx], anchors }\n}`).cena
    resumo = carrega(`export async function resumo(ctx: any) {\n  const { juizStillFilme, resumoDoJuizStill, plan, generationId, writeServerEvent, JUIZ_STILL_RESUMO_EVENTO, user, family, console } = ctx\n${corpoResumo}\n}`).resumo
  } catch (e) { v(`rota: fatias transpilam (${e.message})`, false); return V }

  /** O filme de Boston pelas fatias reais: fecho do juiz → cena a cena (âncora + still + juiz + montagem) → resumo. */
  const rodaFilme = async ({ family = 's25', respostas = [], julgarQuebra = false, estrela = [null, null, null], ancoras = { portraitUrl: 'RETRATO', environmentUrl: AMBIENTE_URL } } = {}) => {
    const plan = { scenes: CENAS.map((s) => ({ ...s })), characterSheet: '', environmentSheet: AMBIENTE, styleSheet: ESTILO }
    const s25Plano = family === 's25' ? S.planejarCenasS25({ cenas: plan.scenes.map((s) => ({ prompt: s.prompt, voiceover: s.voiceover, type: s.type })), roteiro: `${ROTEIRO} ${plan.scenes.map((s) => s.voiceover).join(' ')}`, characterSheet: '', styleSheet: ESTILO, idioma: 'en' }) : null
    if (s25Plano) for (const c of s25Plano.cenas) if (c) plan.scenes[c.indice].prompt = c.prompt
    const relogio = relogioFalso()
    const j = juizFalso([...respostas], relogio)
    const hSceneAnchors = []
    const eventos = []
    const regeracoes = []
    let cenaAtual = 0
    const gerar = async (a) => {
      if (a.seed === SEED) return `still://${cenaAtual + 1}`
      relogio.t += 4_000
      regeracoes.push(a)
      return `regen://${regeracoes.length}`
    }
    const writeServerEvent = async (e) => { eventos.push(e); return true }
    const { juizStillFilme, juizStillCena } = monta({
      family, plan, hSceneAnchors, generationSeed: SEED, generateCinematicSceneStill: gerar, writeServerEvent, user: { id: 'u' }, generationId: GEN,
      juizStillLigado: L.juizStillLigado, novoFilmeDoJuiz: L.novoFilmeDoJuiz, anterioresDoJuiz: L.anterioresDoJuiz, JUIZ_STILL_EVENTO: L.JUIZ_STILL_EVENTO, ambienteComEpoca: S.ambienteComEpoca, console: silencioso,
      julgarFotoBase: julgarQuebra ? async () => { throw new Error('quebrou de propósito') } : (e, d) => L.julgarFotoBase(e, { ...d, fetchImpl: j.fetchImpl, apiKey: 'chave-de-teste', agora: relogio.agora }),
    })
    let anchors = { ...ancoras }
    const enviados = []
    for (const [idx, hs] of plan.scenes.entries()) {
      cenaAtual = idx
      const r = await cena({
        hs, idx, plan, family, anchors, hSceneAnchors, estrelaHollywood: estrela, generateCinematicSceneStill: gerar, generationSeed: SEED, OMNI_STILL_RETRY_BUDGET_MS: 45000,
        cinematicSceneModel: (fam, t, a) => `${fam}/${a ? 'i2v' : 't2v'}`, writeServerEvent, user: { id: 'u' }, generationId: GEN, eraSuffix: ERA,
        fidelidadeRelato: [], garantirAcaoCentral: F.garantirAcaoCentral, silenciarFalaNoPrompt: F.silenciarFalaNoPrompt, s25Plano, montarPromptS25: S.montarPromptS25,
        montarContrato: ST.montarContrato, aplicarContrato: ST.aplicarContrato, severidadeDe: ST.severidadeDe, proibidosPorModo: VMO.proibidosPorModo,
        formatoVisual: { modo: 'documentary_faceless' }, contratoRelato: [], textSafetySuffix: SS.textSafetySuffix, console: silencioso, juizStillCena,
      })
      anchors = r.anchors
      enviados.push(r.submittedPrompt)
    }
    await resumo({ juizStillFilme, resumoDoJuizStill: L.resumoDoJuizStill, plan, generationId: GEN, writeServerEvent, JUIZ_STILL_RESUMO_EVENTO: L.JUIZ_STILL_RESUMO_EVENTO, user: { id: 'u' }, family, console: silencioso })
    return { hSceneAnchors, anchors, eventos, regeracoes, pedidos: j.pedidos, enviados, juizStillCena }
  }
  const AMBIENTE_URL = 'AMBIENTE'
  try {
    // ── (1) H3 / Omni / Kling 3: o juiz não existe ──
    for (const fam of ['h3', 'omni', 'hollywood']) {
      const o = await rodaFilme({ family: fam, respostas: [R_AMB_REJ, R_AMB_REJ, R_AMB_REJ] })
      v(`rota: família ${fam} — nenhum juiz (fecho null), nenhuma chamada, nenhum evento, âncoras como antes`, o.juizStillCena === null && o.pedidos.length === 0 && o.regeracoes.length === 0 && o.eventos.every((e) => !String(e.name).startsWith('juiz_still')) && o.hSceneAnchors[0] === 'AMBIENTE')
    }
    // ── o filme de Boston no S25, com o juiz ──
    const b = await rodaFilme({ respostas: [R_AMB_REJ, R_OK_88, R_OK_90, R_TXT_40, R_TXT_30] })
    v('S25 Boston: a foto de AMBIENTE (arranha-céus de vidro em 1919) é recusada e refeita; a nova vira a âncora da cena 1 e a do filme', b.hSceneAnchors[0] === 'regen://1' && b.anchors.environmentUrl === 'regen://1' && b.anchors.portraitUrl === 'RETRATO')
    v('S25 Boston: cena 2 (still aprovado) segue com a própria foto; cena 3 (texto, recusada 2×) segue a original de nota maior', b.hSceneAnchors[1] === 'still://2' && b.hSceneAnchors[2] === 'still://3')
    v('S25 Boston: a cena 3 pede a rua do ambiente de novo e NÃO reusa a foto (nem a nova) — "uma vez por filme" vale para a foto julgada', b.hSceneAnchors[2] !== 'regen://1' && b.hSceneAnchors[2] !== 'AMBIENTE')
    v('S25 Boston: 2 regerações no filme (uma por foto recusada), semente nova, janela ≤ 9 s', b.regeracoes.length === 2 && b.regeracoes[0].seed === L.seedDaRegeracao(SEED, 0) && b.regeracoes[1].seed === L.seedDaRegeracao(SEED, 2) && b.regeracoes.every((g) => g.pollWindowMs <= 9_000 && g.styleSuffix === ESTILO))
    v('S25 Boston: a foto nova do ambiente leva a correção positiva do juiz + "true to Boston, 1919" e NÃO nomeia o arranha-céu', /Low red-brick warehouses/.test(b.regeracoes[0].scenePrompt) && /true to Boston, 1919/.test(b.regeracoes[0].scenePrompt) && !/skyscraper|glass/i.test(b.regeracoes[0].scenePrompt))
    v('S25 Boston: a foto de ambiente refeita continua o LUGAR VAZIO (environmentSheet + época + plano de estabelecimento), nunca a ação da cena', b.regeracoes[0].scenePrompt.startsWith(AMBIENTE) && b.regeracoes[0].scenePrompt.endsWith('An empty, quiet establishing view of the place.') && !/towering|tank/i.test(b.regeracoes[0].scenePrompt) && JSON.stringify(b.pedidos[0]).includes(`What the shot must show: ${AMBIENTE}`))
    v('S25 Boston: a foto nova da cena 3 (texto) pede superfícies lisas e não nomeia a placa', b.regeracoes[1].scenePrompt.includes('Every surface plain and unmarked.') && !/\bsigns?\b|\bshop\b/i.test(b.regeracoes[1].scenePrompt))
    v('S25 Boston: o juiz vê a foto anterior a partir da cena 2 (a foto NOVA do ambiente) e a época de cada cena (1919) em todas', b.pedidos.length === 5 && JSON.stringify(b.pedidos[2]).includes('regen://1') && JSON.stringify(b.pedidos[0]).includes('Era and place: Boston, 1919') && b.pedidos.every((p) => /Era and place: [^"\\]*1919/.test(JSON.stringify(p))))
    const ev = b.eventos.filter((e) => e.name === L.JUIZ_STILL_EVENTO)
    v('evento juiz_still por foto: generation_id, veredito, motivo, regerou?, custo estimado, ms (session_id = geração)', ev.length === 3 && ev.every((e) => e.sessionId === GEN && e.metadata.generation_id === GEN && e.metadata.family === 's25' && typeof e.metadata.custo_usd === 'number' && e.metadata.custo_usd > 0 && typeof e.metadata.ms === 'number' && typeof e.metadata.regerou === 'boolean' && ['OK', 'REJECT'].includes(e.metadata.veredito)) && ev[0].metadata.origem === 'ambiente' && ev[0].metadata.motivo === 'arranha-céus de vidro em Boston 1919' && ev[0].metadata.regerou === true && ev[2].metadata.escolhida === 'original')
    const rs = b.eventos.find((e) => e.name === L.JUIZ_STILL_RESUMO_EVENTO)
    v('evento juiz_still_resumo por filme: 3 fotos, 2 recusadas, 2 refeitas, 1 salva, 1 com defeito, custo = soma das fotos', rs && rs.sessionId === GEN && rs.metadata.generation_id === GEN && rs.metadata.fotos === 3 && rs.metadata.recusadas === 2 && rs.metadata.regeradas === 2 && rs.metadata.salvas === 1 && rs.metadata.com_defeito === 1 && Math.abs(rs.metadata.custo_usd - ev.reduce((s, e) => s + e.metadata.custo_usd, 0)) < 1e-6)
    // o juiz só troca a FOTO: o texto que vai ao motor de vídeo é o mesmo de um filme sem juiz
    const semJuiz = await rodaFilme({ respostas: [], julgarQuebra: true })
    v('o juiz só troca a FOTO: o prompt de vídeo de cada cena é idêntico ao do filme sem juiz', b.enviados.length === 3 && b.enviados.every((p, k) => p === semJuiz.enviados[k]))
    // ── (3) falha aberta na rota: o juiz que lança não segura nenhuma cena ──
    v('falha aberta na rota: julgarFotoBase que LANÇA → as fotos de antes seguem e as 3 cenas vão ao vídeo', semJuiz.hSceneAnchors[0] === 'AMBIENTE' && semJuiz.hSceneAnchors[1] === 'still://2' && semJuiz.hSceneAnchors[2] === 'still://3' && semJuiz.enviados.length === 3 && semJuiz.regeracoes.length === 0)
    const caiu = await rodaFilme({ respostas: [new Error('x'), 500, R_TXT_40] })
    const rsCaiu = caiu.eventos.find((e) => e.name === L.JUIZ_STILL_RESUMO_EVENTO)
    v('falha aberta: juiz fora do ar (rede, HTTP) → disjuntor na 3ª foto, fotos originais, filme inteiro despachado, resumo diz isso', caiu.pedidos.length === 2 && caiu.hSceneAnchors.join() === 'AMBIENTE,still://2,still://3' && rsCaiu && rsCaiu.metadata.erros === 2 && rsCaiu.metadata.puladas === 1 && rsCaiu.metadata.disjuntor === true)
    // ── foto que NÃO é FLUX: estrela e personagem salvo ficam fora do juiz ──
    const est = await rodaFilme({ respostas: [R_AMB_REJ, R_OK_88, R_OK_88, R_OK_88], estrela: ['estrela://1', null, null] })
    v('still da estrela (cena 1) não passa pelo juiz e não é trocado', est.hSceneAnchors[0] === 'estrela://1' && !est.eventos.some((e) => e.name === L.JUIZ_STILL_EVENTO && e.metadata.cena === 1))
    const lock = await rodaFilme({ respostas: [R_AMB_REJ, R_OK_88, R_OK_88], ancoras: { portraitUrl: 'PERSONAGEM', environmentUrl: 'PERSONAGEM' } })
    v('personagem salvo sem âncoras geradas (ambiente = retrato): o juiz não mexe na foto do cliente', lock.hSceneAnchors[0] === 'PERSONAGEM' && !lock.eventos.some((e) => e.name === L.JUIZ_STILL_EVENTO && e.metadata.origem === 'ambiente'))
    // ── o fecho sozinho: evento com custo e falha aberta ──
    {
      const evs = []
      const { juizStillCena } = monta({ family: 's25', plan: { scenes: CENAS.map((s) => ({ ...s })), styleSheet: ESTILO }, hSceneAnchors: [], generationSeed: SEED, generateCinematicSceneStill: async () => 'regen://x', writeServerEvent: async (e) => { evs.push(e); return true }, user: { id: 'u' }, generationId: GEN, juizStillLigado: L.juizStillLigado, novoFilmeDoJuiz: L.novoFilmeDoJuiz, anterioresDoJuiz: L.anterioresDoJuiz, JUIZ_STILL_EVENTO: L.JUIZ_STILL_EVENTO, ambienteComEpoca: S.ambienteComEpoca, console: silencioso, julgarFotoBase: async () => { throw new Error('boom') } })
      const u = await juizStillCena({ idx: 1, url: 'still://2', origem: 'still', cenas: null })
      v('fecho da rota: julgarFotoBase que lança → devolve a MESMA foto (nunca null, nunca exceção)', u === 'still://2' && evs.length === 0)
    }
  } catch (e) {
    v(`rota: as fatias rodam sem lançar (${e instanceof Error ? e.message : String(e)})`, false)
  }

  // ═══ (7) a aba /admin/coerencia ═══
  try {
    const fakeCoh = { FAST_COHERENCE_EVENT: 'fast_coherence', FAST_COHERENCE_VERSION: 'x', FAST_SCENE_PLAN_EVENT: 'fast_scene_plan', TOPIC_TRUNCATION_HINT: 500, scoreFastCoherence: async () => null }
    const fakeFb = { FILM_FEEDBACK_EVENT: 'film_feedback', FILM_FEEDBACK_ASKED_EVENT: 'film_feedback_asked' }
    const A = carrega(src(ADMIN), { mapa: { '@/lib/fastCoherence': fakeCoh, '@/lib/filmFeedback': fakeFb, '@/lib/hollywood/juizStill': L } })
    const filme = L.novoFilmeDoJuiz()
    const jz = async (indice, url, respostas, origem = 'still') => L.julgarFotoBase(ENTRADA({ indice, url, origem, fotoAnterior: null }), { filme, gerarStill: async () => `regen://${indice}`, fetchImpl: juizFalso(respostas).fetchImpl, apiKey: 'k' })
    await jz(0, 'AMBIENTE', [R_AMB_REJ, R_OK_88], 'ambiente')
    await jz(1, 'still://2', [R_OK_90])
    await jz(2, 'still://3', [R_TXT_40, R_TXT_30])
    const resumoGravado = { generation_id: 'g1', family: 's25', ...L.resumoDoJuizStill(filme, 3) }
    const consultas = []
    const tabela = (q) => {
      const eq = (k) => q.f.find((x) => x[0] === 'eq' && x[1] === k)?.[2]
      if (q.t === 'videos') return [
        { id: 'v1', user_id: 'u1', created_at: new Date().toISOString(), topic: 'Boston 1919 molasses', video_url: 'https://x/v1.mp4', duration: 35, credits_used: 150, render_id: 'r1', quality_mode: 'cinematic_s25' },
        { id: 'v2', user_id: 'u1', created_at: new Date().toISOString(), topic: 'Pompeii', video_url: 'https://x/v2.mp4', duration: 60, credits_used: 150, render_id: 'r2', quality_mode: 'cinematic_hollywood' },
      ]
      if (q.t === 'profiles') return [{ id: 'u1', email: 'cliente@exemplo.com' }]
      if (q.t === 'events' && eq('name') === 'compose_submission_claim') return [{ created_at: 'x', session_id: null, user_id: 'u1', metadata: { render_id: 'r1', generation_id: 'g1', narration: 'In January 1919…' } }, { created_at: 'x', session_id: null, user_id: 'u1', metadata: { render_id: 'r2', generation_id: 'g2', narration: 'Pompeii…' } }]
      if (q.t === 'events' && eq('name') === L.JUIZ_STILL_RESUMO_EVENTO) {
        const ses = q.f.find((x) => x[0] === 'in' && x[1] === 'session_id')?.[2] ?? []
        return ses.includes('g1') ? [{ created_at: 'y', session_id: 'g1', user_id: 'u1', metadata: resumoGravado }] : []
      }
      return []
    }
    const admin = {
      from(t) {
        const q = { t, f: [] }
        const b = {
          select() { return b }, eq(k, x) { q.f.push(['eq', k, x]); return b }, neq(k, x) { q.f.push(['neq', k, x]); return b }, gte() { return b }, in(k, x) { q.f.push(['in', k, x]); return b },
          order() { return b }, limit() { return b }, insert() { return Promise.resolve({ error: null }) },
          then(res, rej) { consultas.push(q); return Promise.resolve({ data: tabela(q), error: null }).then(res, rej) },
        }
        return b
      },
    }
    const rows = await A.listFastCoherence(admin, { hours: 48, maxCompute: 0 })
    const s25 = rows.find((r) => r.video_id === 'v1')
    const k3 = rows.find((r) => r.video_id === 'v2')
    v('aba: o leitor busca juiz_still_resumo pelo generation_id de cada filme (session_id)', consultas.some((q) => q.t === 'events' && q.f.some((x) => x[0] === 'eq' && x[1] === 'name' && x[2] === L.JUIZ_STILL_RESUMO_EVENTO) && q.f.some((x) => x[0] === 'in' && x[1] === 'session_id' && x[2].includes('g1') && x[2].includes('g2'))))
    v('aba: o filme do Seedance 2.5 traz o juiz (3 julgadas, 2 recusadas, 2 refeitas, motivos, custo); o do Kling 3 vem sem (null)', s25 && s25.juiz_still && s25.juiz_still.julgadas === 3 && s25.juiz_still.recusadas === 2 && s25.juiz_still.regeradas === 2 && s25.juiz_still.motivos.length === 2 && s25.juiz_still.custo_usd > 0.03 && k3 && k3.juiz_still === null)
    // a linha do quadro, renderizada de verdade (as funções da página, de corDaNota até a página)
    const pg = src(PAGINA)
    const corpoPg = fatia(pg, 'function corDaNota(', 'export default async function AdminCoerenciaPage', false)
    const P = carrega(`${corpoPg}\nexport { Linha, JuizDaFoto }`, { tsx: true, mapa: { 'react/jsx-runtime': jsxRuntime }, escopo: { ENGINE_LABEL: { cinematic_s25: 'Seedance 2.5', cinematic_hollywood: 'Kling 3' }, ROTULO_CRITERIO: L.ROTULO_CRITERIO, PedirFeedback: () => null } })
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(P.Linha, { r: s25 }))
    v('aba: a linha do filme mostra o juiz ao lado da nota (selo 📷 2✗/3) e o detalhe (fotos, recusadas, refeitas, custo, motivos e desfecho)', html.includes('data-kineo="juiz-still-selo"') && html.includes('2✗/3') && html.includes('data-kineo="juiz-still"') && html.includes('Juiz da foto-base') && html.includes('3 fotos julgadas') && html.includes('2 recusadas') && html.includes('2 refeitas') && html.includes('foto de ambiente') && html.includes('anacronismo') && html.includes('arranha-céus de vidro em Boston 1919') && html.includes('foto nova aprovada') && html.includes('as duas recusadas — seguiu a original') && html.includes('US$ 0.0'))
    const htmlK3 = ReactDOMServer.renderToStaticMarkup(React.createElement(P.Linha, { r: k3 }))
    v('aba: filme sem juiz (outro motor / antes do deploy) — a linha sai como antes, sem o bloco', !htmlK3.includes('juiz-still') && htmlK3.includes('data-kineo="linha-coerencia"'))
    v('aba: filtro "foto recusada pelo juiz" (so=juiz) e a legenda 📷 no topo', pg.includes("if (so === 'juiz') return !!r.juiz_still && r.juiz_still.recusadas > 0") && pg.includes("['juiz', 'foto recusada pelo juiz']") && pg.includes('📷 = o juiz da foto-base, ANTES de animar'))
  } catch (e) {
    v(`aba: leitor e linha rodam (${e instanceof Error ? e.message : String(e)})`, false)
  }
  return V
}

console.log('TESTE juiz da foto-base (Seedance 2.5) — só s25, teto de tempo, falha aberta, 1 regeração, instrução sem o objeto, eventos, aba — 06/10')
const real = await verificacoes()
for (const [rotulo, prova] of real) ok(prova, rotulo)

// ── custo e latência (relatório, não verificação) ──
{
  const L = carrega(rd(LIB), { escopo: { setTimeout, clearTimeout } })
  const p1 = L.montarPedidoAoJuiz(ENTRADA({ fotoAnterior: null }), 'still://3')
  const p2 = L.montarPedidoAoJuiz(ENTRADA(), 'still://3')
  const c1 = L.custoDoJuizUsd(null, p1.imagens, p1.caracteres)
  const c2 = L.custoDoJuizUsd(null, p2.imagens, p2.caracteres)
  console.log(`    · custo estimado por foto julgada: US$ ${c1.toFixed(5)} (só a foto) · US$ ${c2.toFixed(5)} (com a foto anterior) · foto nova US$ ${L.JUIZ_STILL_REGERACAO_USD.toFixed(3)}`)
  console.log(`    · filme típico (6 fotos, 1 refeita, 7 chamadas): ≈ US$ ${(c1 + 6 * c2 + L.JUIZ_STILL_REGERACAO_USD).toFixed(3)} · teto de tempo ${L.JUIZ_STILL_ORCAMENTO_FILME_MS / 1000} s/filme, ${L.JUIZ_STILL_TETO_CENA_MS / 1000} s/cena, ${L.JUIZ_STILL_TIMEOUT_MS / 1000} s/chamada`)
}

// ── trava por diff: na rota, toda linha nova do commit do juiz (contra o pai do commit) leva o selo; nenhuma linha da base sai ──
{
  const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString().replace(/\r/g, '')
  let alvo = null
  try { const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) alvo = shas[shas.length - 1] } catch { /* sem commit ainda */ }
  let diff = ''
  try { diff = alvo ? git(['diff', '--no-color', '-U0', `${alvo}^`, alvo, '--', ROTA]) : git(['diff', '--no-color', '-U0', 'HEAD', '--', ROTA]) } catch { diff = '' }
  const novas = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1))
  const tiradas = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'))
  const semSelo = novas.filter((l) => l.trim() && !l.includes(MARCA))
  ok(novas.length > 0 && semSelo.length === 0 && tiradas.length === 0, `trava por diff (${alvo ? `commit ${alvo.slice(0, 8)} contra o pai` : 'árvore contra HEAD'}): ${novas.length} linhas novas na rota, ${semSelo.length} sem o selo ${MARCA}, ${tiradas.length} da base tiradas${semSelo.length ? ' → ' + semSelo.slice(0, 2).map((l) => l.trim().slice(0, 70)).join(' | ') : ''}`)
}

// ── (8) mutantes — cada um prova que aplicou e que derruba o guardião ──
const mutants = [
  ['L1 o juiz abre para o H3', LIB, "export const JUIZ_STILL_FAMILIAS: readonly string[] = ['s25']", "export const JUIZ_STILL_FAMILIAS: readonly string[] = ['s25', 'h3']"],
  ['L2 a chamada não aborta no teto', LIB, '  const timer = setTimeout(() => ctrl.abort(), timeoutMs)', '  const timer = setTimeout(() => undefined, timeoutMs)'],
  ['L3 o teto da cena some', LIB, '    const prazoCena = t0 + JUIZ_STILL_TETO_CENA_MS', '    const prazoCena = t0 + 10 * JUIZ_STILL_TETO_CENA_MS'],
  ['L4 o orçamento do filme esquece o gasto', LIB, '    const restanteFilme = () => JUIZ_STILL_ORCAMENTO_FILME_MS - filme.gastoMs - (agora() - t0)', '    const restanteFilme = () => JUIZ_STILL_ORCAMENTO_FILME_MS - (agora() - t0)'],
  ['L5 o teto da chamada ignora a folga', LIB, '      v1 = await chamarJuiz(e, e.url, { timeoutMs: Math.min(JUIZ_STILL_TIMEOUT_MS, restante()),', '      v1 = await chamarJuiz(e, e.url, { timeoutMs: JUIZ_STILL_TIMEOUT_MS,'],
  ['L6 o disjuntor some', LIB, "    if (v1.veredito === 'ERRO') {", "    if (v1.veredito === ('NUNCA' as string)) {"],
  ['L7 gerador que lança vira erro do juiz', LIB, '    } catch {\n      urlNova = null\n    }', '    } catch (er) {\n      throw er\n    }'],
  ['L8 segunda regeração', LIB, '    r.escolhida = escolherFoto(v1, v2, true)', "    if (v2 && v2.veredito === 'REJECT') { const u3 = await d.gerarStill(promptNovo, seedDaRegeracao(e.seed, e.indice + 1), 1_000); if (u3) urlNova = u3 }\n    r.escolhida = escolherFoto(v1, v2, true)"],
  ['L9 a correção do juiz entra sem filtro', LIB, '    if (correcaoValida(a.correcao, a.objeto, a.prompt)) {', '    if (a.correcao) {'],
  ['L10 a instrução nomeia o objeto', LIB, '    return { instrucao: padrao, usouCorrecao: false }', '    return { instrucao: `${padrao} Absolutely no ${a.objeto}.`, usouCorrecao: false }'],
  ['L11 a foto nova sai de graça no relato', LIB, '    r.custo_usd = arred(r.custo_usd + JUIZ_STILL_REGERACAO_USD)\n', ''],
  ['L12 a mesma foto da anterior passa', LIB, '    if (e.fotoAnterior && e.fotoAnterior.url === e.url) {', '    if (e.fotoAnterior && e.fotoAnterior.url === e.url && false) {'],
  ['L13 REJECT por gosto vale', LIB, "  if (r.veredito === 'REJECT' && (r.criterio === 'nenhum' ||", "  if (false && r.veredito === 'REJECT' && (r.criterio === 'nenhum' ||"],
  ['L14 a correção põe gente onde não tinha', LIB, '  if (PESSOA_RE.test(c) && !PESSOA_RE.test(promptDaCena)) return false\n', ''],
  ['L15 2º REJECT sempre fica com a nova', LIB, '  return (v2.nota ?? 0) > (v1.nota ?? 0) ? \'regerada\' : \'original\'', "  return 'regerada'"],
  ['T1 o juiz roda em toda família', ROTA, '      const juizStillFilme = juizStillLigado(family) ? novoFilmeDoJuiz() : null', '      const juizStillFilme = novoFilmeDoJuiz()'],
  ['T2 o still da cena não passa pelo juiz', ROTA, '          if (juizStillCena && sceneStillUrl) sceneStillUrl = await juizStillCena(', '          if (juizStillCena && sceneStillUrl && false) sceneStillUrl = await juizStillCena('],
  ['T3 a foto de ambiente é julgada mas não trocada', ROTA, '            if (ambienteJulgado && ambienteJulgado !== anchors.environmentUrl) anchors = { ...anchors, environmentUrl: ambienteJulgado }', '            if (false) anchors = { ...anchors, environmentUrl: ambienteJulgado }'],
  ['T4 a foto do personagem salvo vira alvo do juiz', ROTA, ' && anchors.environmentUrl !== anchors.portraitUrl) { // KINEO-JUIZ-STILL-2026-10-06', ') { // KINEO-JUIZ-STILL-2026-10-06'],
  ['T5 o juiz que lança derruba a cena', ROTA, '            return a.url // KINEO-JUIZ-STILL-2026-10-06\n', '            throw e\n'],
  ['T6 o evento perde o custo', ROTA, 'metadata: { generation_id: generationId, family, ...rj } })', 'metadata: { generation_id: generationId, family, veredito: rj.veredito } })'],
  ['T7 o resumo do filme não é gravado', ROTA, '          await writeServerEvent({ name: JUIZ_STILL_RESUMO_EVENTO,', '          void ({ name: JUIZ_STILL_RESUMO_EVENTO,'],
  ['T9 a foto de ambiente é refeita com a ação da cena (pode pôr gente)', ROTA, "              prompt: ambienteJ ? `${ambienteComEpoca(ambienteJ, s25J?.epoca ?? '')}. An empty, quiet establishing view of the place.` : cenaJ.prompt,", '              prompt: cenaJ.prompt,'],
  ['T8 a estrela vira alvo do juiz', ROTA, " && inNarratorWorld && !estrelaHollywood[idx] && anchors.environmentUrl", ' && inNarratorWorld && anchors.environmentUrl'],
  ['A1 a linha da aba perde o juiz', ADMIN, '      juiz_still: gen ? juizByGen.get(gen) ?? null : null,', '      juiz_still: null,'],
  ['A2 a aba lê o evento errado', ADMIN, ".eq('name', JUIZ_STILL_RESUMO_EVENTO)", ".eq('name', 'juiz_still_x')"],
  ['P1 a linha não mostra o juiz', PAGINA, '        {r.juiz_still && <JuizDaFoto j={r.juiz_still} />}\n', ''],
  ['P2 o selo ao lado da nota some', PAGINA, '        {r.juiz_still && (\n          <div data-kineo="juiz-still-selo"', '        {false && r.juiz_still && (\n          <div data-kineo="juiz-still-selo"'],
]
for (const [label, file, from, to] of mutants) {
  const srcText = rd(file)
  const n = srcText.split(from).length - 1
  if (n !== 1) { ok(false, `(${label}) âncora do mutante ${n === 0 ? 'não encontrada' : `ambígua (${n}×)`} — reancore`); continue }
  const mutated = srcText.replace(from, () => to)
  if (mutated === srcText || (to && !mutated.includes(to))) { ok(false, `(${label}) o mutante não aplicou`); continue }
  let bitten = false
  let porque = ''
  try {
    const r = await comTeto(verificacoes({ [file]: mutated }), 20_000)
    if (r === '__TETO_DO_GUARDIAO__') { bitten = true; porque = 'pendurou (o teto do guardião cortou)' } else {
      const falhas = r.filter(([, p]) => !p)
      bitten = falhas.length > 0
      porque = falhas[0]?.[0] ?? ''
    }
  } catch (err) {
    bitten = true
    porque = `lançou: ${err instanceof Error ? err.message : String(err)}`
  }
  ok(bitten, `(${label}) → vermelho${porque ? ` — ${porque.slice(0, 120)}` : ''}`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
