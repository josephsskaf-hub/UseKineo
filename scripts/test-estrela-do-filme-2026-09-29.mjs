// KINEO-ESTRELA-DO-FILME-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] — guardião da "Estrela do filme".
//
// Pedido do fundador (29/09): o filme do amigo como Aquiles na guerra de Troia, com o ROSTO do amigo em toda cena com
// protagonista. O que este guardião prova EXECUTANDO o código de verdade (transpilado aqui, sem alias @/ executado, sem rede,
// sem fal, sem crédito — fornecedor, moderação, banco e relógio são falsos):
//   A. a régua pura (lib/estrelaDoFilme.ts): dono, autorização, interruptor, motor sem âncora, 1-3 fotos, sobretaxa, quais
//      cenas levam a estrela, o pedido ao edit, a exceção ESTREITA da regra REAL PEOPLE.
//   B. o servidor (lib/estrelaServer.ts): o edit recebe as fotos ASSINADAS da própria conta; still barrado na moderação ou
//      com falha do fornecedor = null (a cena volta ao still de hoje).
//   C. a rota do filme: o bloco de âncoras clássico é byte a byte o da base; a fatia nova + o bloco rodam num sandbox — sem
//      estrela o resultado e os pedidos ao FLUX são IDÊNTICOS aos da base; com estrela o still das cenas com protagonista é o
//      do edit. Ordem: pedido/recusa/sobretaxa ANTES do claim e do débito; Kineo 1 recusa antes de qualquer trabalho.
//   D. a tela, o /studio/create, o analyze-idea, o interruptor, os eventos.
//   E. mutantes (dono, autorização, sobretaxa depois do débito, regra REAL PEOPLE aberta, interruptor aberto) ficam vermelhos.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const BASE = '54e53aa5'
const rdBase = (p) => { try { return execFileSync('git', ['-C', root, 'show', `${BASE}:${p}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n') } catch { return null } }

let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

const tsjs = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
function roda(src, req = {}) {
  const m = { exports: {} }
  new Function('module', 'exports', 'require', 'process', tsjs(src))(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) }, process)
  return m.exports
}

const U = '11111111-2222-4333-8444-555555555555'
const OUTRO = '99999999-8888-4777-8666-555555555555'
const foto = (uid, n) => `images/${uid}/refs/${String(n).padStart(8, '0')}-aaaa-4bbb-8ccc-dddddddddddd.jpg`
const SRC = {
  lib: rd('lib/estrelaDoFilme.ts'),
  ref: rd('lib/imageReference.ts'),
  srv: rd('lib/estrelaServer.ts'),
  rota: rd('app/api/generate-video-cinematic/route.ts'),
  fast: rd('app/api/generate-video-fast/route.ts'),
  studio: rd('app/(dashboard)/studio/StudioClient.tsx'),
  gen: rd('app/(dashboard)/generate/GenerateClient.tsx'),
  analyze: rd('app/api/analyze-idea/route.ts'),
  launch: rd('lib/engineLaunch.ts'),
  me: rd('app/api/me/credits/route.ts'),
  events: rd('app/api/events/route.ts'),
  mod: rd('lib/safety/contentModeration.ts'),
  router: rd('lib/hollywood/router.ts'),
  copy: rd('lib/estrelaCopy.ts'),
}
const libDe = (src = SRC) => roda(src.lib, { './imageReference': roda(src.ref) })

// ═══ A. a régua pura ════════════════════════════════════════════════════════════════════════════════════════════════
function verificaLib(src = SRC) {
  const f = []
  const c = (n, cond) => { if (!cond) f.push(n) }
  let L
  try { L = libDe(src) } catch (e) { return ['lib não transpila: ' + e.message] }
  const dec = (raw, extra = {}) => L.decideEstrelaRequest({ raw, engine: 'kling', userId: U, visible: true, anchorEnabled: true, ...extra })
  const pedido = { paths: [foto(U, 1), foto(U, 2)], consent: true }
  // sem estrela = inativa (nada muda)
  c('A1 sem `estrela` no corpo → inativa', [undefined, null, false].every((r) => { const d = dec(r); return d.ok && d.ativa === false }))
  // com estrela, fotos da própria conta
  const d1 = dec(pedido)
  c('A2 com estrela e fotos da PRÓPRIA conta → ativa com os mesmos caminhos', d1.ok && d1.ativa && JSON.stringify(d1.paths) === JSON.stringify(pedido.paths) && d1.engine === 'kling')
  // dono
  const dOutro = dec({ paths: [foto(U, 1), foto(OUTRO, 2)], consent: true })
  c('A3 foto de OUTRA conta → 400 estrela_owner', !dOutro.ok && dOutro.status === 400 && dOutro.code === 'estrela_owner')
  const dUrl = dec({ paths: ['https://evil.example/face.jpg'], consent: true })
  c('A4 URL no lugar do caminho → recusada (dono)', !dUrl.ok && dUrl.code === 'estrela_owner')
  const dTrav = dec({ paths: [`images/${U}/refs/../../${OUTRO}/refs/00000001-aaaa-4bbb-8ccc-dddddddddddd.jpg`], consent: true })
  c('A5 caminho com ../ → recusado', !dTrav.ok)
  // consentimento
  c('A6 sem autorização (consent ausente, false, "true") → 400 estrela_consent', [undefined, false, 'true', 1].every((consent) => { const d = dec({ paths: [foto(U, 1)], consent }); return !d.ok && d.status === 400 && d.code === 'estrela_consent' }))
  // quantidade
  const d4 = dec({ paths: [foto(U, 1), foto(U, 2), foto(U, 3), foto(U, 4)], consent: true })
  c('A7 mais de 3 fotos → 400 estrela_too_many', !d4.ok && d4.code === 'estrela_too_many')
  c('A8 zero fotos / repetida → 400 estrela_invalid', ['paths', 'dup'].every((k) => { const d = dec(k === 'paths' ? { paths: [], consent: true } : { paths: [foto(U, 1), foto(U, 1)], consent: true }); return !d.ok && d.code === 'estrela_invalid' }))
  // interruptor
  const dFora = dec(pedido, { visible: false })
  c('A9 interruptor desligado para conta de fora → 403 estrela_not_available (antes de olhar motor e fotos)', !dFora.ok && dFora.status === 403 && dFora.code === 'estrela_not_available' && !dec({ paths: ['x'], consent: false }, { visible: false }).ok && dec({ paths: ['x'], consent: false }, { visible: false }).code === 'estrela_not_available')
  // motor sem âncora
  c('A10 Kineo 1 / Sora / Seedance 2.5 / Avatar → 422 estrela_engine', ['fast', 'sora', 's25', 'avatar'].every((engine) => { const d = dec(pedido, { engine }); return !d.ok && d.status === 422 && d.code === 'estrela_engine' }))
  c('A11 motor com âncora mas caminho de âncora desligado (CINEMATIC_ANCHOR_ENABLED=0) → 422', (() => { const d = dec(pedido, { anchorEnabled: false }); return !d.ok && d.code === 'estrela_engine' })())
  c('A12 os 6 motores com âncora aceitam (Seedance 1.5 = engine ausente)', ['seedance', 'kling', 'veo', 'hollywood', 'h3', 'omni', undefined].every((engine) => { const d = dec(pedido, { engine }); return d.ok && d.ativa }))
  // sobretaxa
  const tab = [15, 30, 35, 60, 90].map((s) => L.estrelaSobretaxa('kling', s))
  c(`A13 sobretaxa = 5 cr a cada 6 s (15→15, 30→25, 35→30, 60→50, 90→75): ${tab.join('/')}`, JSON.stringify(tab) === '[15,25,30,50,75]')
  c('A14 sobretaxa 0 em motor sem âncora e em duração inválida', L.estrelaSobretaxa('fast', 60) === 0 && L.estrelaSobretaxa('s25', 60) === 0 && L.estrelaSobretaxa('kling', NaN) === 0 && L.estrelaSobretaxa('kling', 0) === 0)
  c('A15 sobretaxa igual em todos os motores com âncora (mesma régua para tela e servidor)', ['seedance', 'veo', 'hollywood', 'h3', 'omni', undefined].every((e) => L.estrelaSobretaxa(e, 35) === 30))
  // impressão digital do claim
  c('A16 impressão do claim: sem estrela = "" (a de sempre); com estrela muda', L.estrelaFingerprintSuffix({ ok: true, ativa: false }) === '' && L.estrelaFingerprintSuffix(d1).startsWith('|estrela:'))
  // formato
  const doc = { modo: 'documentary_faceless', motivo: 'padrao', apresentadorPedido: false }
  c('A17 formato: sem estrela devolve o MESMO objeto; com estrela documentário vira character_story; presenter fica', L.formatoComEstrela(doc, false) === doc && L.formatoComEstrela(doc, true).modo === 'character_story' && L.formatoComEstrela({ modo: 'presenter', motivo: 'x' }, true).modo === 'presenter')
  c('A18 estrelaPedida só com consent === true e fotos', L.estrelaPedida({ paths: ['a'], consent: true }) && !L.estrelaPedida({ paths: ['a'] }) && !L.estrelaPedida(undefined) && !L.estrelaPedida({ paths: [], consent: true }))
  // cenas com protagonista
  const sim = ['A bronze-armored Greek warrior charges across the beach at dawn', 'Close-up of his eyes behind the helmet', 'She raises the sword toward the gates', 'Achilles hero stands alone on the walls']
  const nao = ['The burning walls of Troy at night, wide aerial shot', 'Empty battlefield at dawn, no people, smoke drifting', 'A bronze shield lying in the sand', 'Hundreds of soldiers clash in the distance', 'Ancient map of the Aegean sea']
  c('A19 cena com pessoa no singular / pronome / herói = protagonista', sim.every((v) => L.cenaComProtagonista(v)))
  c('A20 paisagem, objeto, mapa, "no people" e tropa no plural = still de hoje', nao.every((v) => !L.cenaComProtagonista(v)))
  c('A21 cena de diálogo sempre tem o protagonista', L.cenaComProtagonista('wide shot of a harbor', 'dialogue'))
  // pedido ao edit
  const ficha = L.fichaDaEstrela('Meu amigo lutando na guerra de Troia como Aquiles', null)
  c('A22 ficha do cenário de Troia: armadura de bronze + continuidade (mesmo figurino, rosto/idade da foto) + papel do léxico (soldier)', /bronze cuirass/.test(ficha) && /same outfit in every scene/.test(ficha) && /reference photo/.test(ficha) && /\bsoldier\b/.test(ficha))
  c('A23 ficha do autor vence a do cenário', L.fichaDaEstrela('guerra de Troia', 'a tall man in a blue tunic').startsWith('a tall man in a blue tunic'))
  const p = L.promptEstrelaDaCena('Low-angle shot: a Greek warrior charges', ficha)
  c('A24 prompt do edit = cena + ficha + instrução fixa de identidade + só o protagonista tem o rosto', p.startsWith('Low-angle shot: a Greek warrior charges') && p.includes('The protagonist is the person in the reference photo(s): keep the exact face and identity.') && p.includes(ficha) && /Only the protagonist has this face/.test(p))
  const urls = ['https://sb/sign/images/u/refs/1.jpg?token=a', 'https://sb/sign/images/u/refs/2.jpg?token=b']
  const inp = L.buildEstrelaEditInput(p, urls, undefined)
  c('A25 payload do edit: prompt, image_urls = as fotos, aspect 9:16 (ou o do pedido), 1 imagem 1K', inp.prompt === p && JSON.stringify(inp.image_urls) === JSON.stringify(urls) && inp.aspect_ratio === '9:16' && inp.num_images === 1 && inp.resolution === '1K' && L.buildEstrelaEditInput(p, urls, '16:9').aspect_ratio === '16:9' && L.ESTRELA_EDIT_SLUG === 'fal-ai/nano-banana-pro/edit')
  const plano = L.planoDaEstrela([{ prompt: 'P1', visual: sim[0] }, { prompt: 'P2', visual: nao[0] }, { prompt: 'P3 The same main character appears in this scene', visual: 'the gates open' }], ficha, true)
  c('A26 plano: cena 1 (guerreiro) e 3 (ficha colada) vão ao edit; cena 2 (muralhas) não', plano[0].protagonista && !plano[1].protagonista && plano[2].protagonista && plano[1].prompt === null && plano[0].prompt.startsWith('P1'))
  c('A27 plano inativo = nenhuma cena ao edit', L.planoDaEstrela([{ prompt: 'x', visual: sim[0] }], ficha, false).every((q) => !q.protagonista && q.prompt === null))
  // telemetria sem dado pessoal
  const rel = L.relatoDaEstrela('kling', plano, 1)
  c('A28 relato do evento: só contagens (engine, scenes, anchored, fallback, version)', JSON.stringify(Object.keys(rel).sort()) === JSON.stringify(['anchored', 'engine', 'fallback', 'scenes', 'version']) && rel.scenes === 3 && rel.anchored === 1 && rel.fallback === 1)
  // REAL PEOPLE
  const base = '- REAL PEOPLE (x): NEVER prompt a recognizable close-up face of a named real person.'
  c('A29 regra REAL PEOPLE: sem estrela o texto é o de sempre, byte a byte', L.regraDePessoasReais(base, false) === base)
  const aberta = L.regraDePessoasReais(base, true)
  c('A31 plano visual em português/espanhol (supervisor fala×imagem falhou): guerreiro/ele/rosto contam; muralhas vazias não', L.cenaComProtagonista('O guerreiro avança pela praia de Troia') && L.cenaComProtagonista('El héroe levanta la lanza') && L.cenaComProtagonista('Close no rosto dele, suor e poeira') && !L.cenaComProtagonista('As muralhas de Troia queimam, vazias') && !L.cenaComProtagonista('Os navios gregos chegam à praia'))
  c('A32 o NOME do papel ("como Aquiles") marca a cena do protagonista', JSON.stringify(L.nomesDoProtagonista('Meu amigo lutando na guerra de Troia como Aquiles, forte, bolado')) === '["Aquiles"]' && JSON.stringify(L.nomesDoProtagonista('My friend fighting in the Trojan War as Achilles')) === '["Achilles"]' && L.cenaComProtagonista('Aquiles ergue a lança sobre a areia', null, ['Aquiles']) && !L.cenaComProtagonista('Troia arde ao amanhecer', null, ['Aquiles']))
  const cont = L.planoDaEstrela([{ prompt: 'a', visual: 'Ele veste a' }, { prompt: 'b', visual: 'armadura de bronze e encara as muralhas' }, { prompt: 'c', visual: 'as ruas vazias da cidade' }, { prompt: 'd', visual: 'The walls of Troy' }], ficha, true)
  c('A33 plano cortado no meio da frase herda o protagonista do anterior; negação de gente e frase nova não herdam', cont[0].protagonista && cont[1].protagonista && !cont[2].protagonista && !cont[3].protagonista)
  c('A30 com estrela: a regra-base continua INTEIRA + a exceção cobre só o protagonista SEM nome; pessoa real nomeada e figura pública seguem a regra', aberta.startsWith(base) && /ONLY to the unnamed protagonist/.test(aberta) && /NAMED real person[^.]*still follows REAL PEOPLE/.test(aberta) && /public figure/.test(aberta))
  return f
}
{
  const f = verificaLib()
  for (const n of f) checa(n, false)
  ok += 33 - f.length
}

// ═══ B. o servidor (lib/estrelaServer.ts) ═══════════════════════════════════════════════════════════════════════════
const L = libDe()
async function servidor({ bloqueia = [], falha = [], semChave = false } = {}) {
  const w = { posts: [], mods: [], signed: [] }
  const req = {
    '@fal-ai/client': { fal: { config() {}, queue: {
      status: async () => ({ status: 'COMPLETED' }),
      result: async (_m, { requestId }) => ({ data: { images: [{ url: `https://v3.fal.media/files/${requestId}.png` }] } }),
    } } },
    '@/lib/falQueue': { submitFalQueueOnce: async (slug, input) => { const i = w.posts.length; w.posts.push({ slug, input }); if (falha.includes(i)) throw new Error('fal 500'); return `req${i}` } },
    '@/lib/imageStore': { signReferencePhotos: async (paths, s) => { w.signed.push({ paths, s }); return paths.map((p) => `https://sb/sign/${p}?t=${s}`) } },
    '@/lib/imageReference': roda(SRC.ref),
    '@/lib/safety/contentModeration': { moderateContent: async (a) => { w.mods.push(a); const k = a.imageUrls[0]; return bloqueia.some((b) => k.includes(`req${b}.png`)) ? { ok: false, reason: 'blocked' } : { ok: true } } },
    '@/lib/estrelaDoFilme': L,
  }
  const old = process.env.FAL_KEY
  if (semChave) delete process.env.FAL_KEY; else process.env.FAL_KEY = 'test-key'
  const S = roda(SRC.srv, req)
  w.S = S
  w.restore = () => { if (old === undefined) delete process.env.FAL_KEY; else process.env.FAL_KEY = old }
  return w
}
{
  const w = await servidor()
  const signed = await w.S.assinarFotosDaEstrela([foto(U, 1), foto(U, 2)])
  checa('B1 as fotos são assinadas pelo MESMO assinador do /images, com os caminhos validados e 15 min', signed.length === 2 && w.signed[0].s === 900 && JSON.stringify(w.signed[0].paths) === JSON.stringify([foto(U, 1), foto(U, 2)]))
  const prompts = [0, 2].map((i) => ({ indice: i, prompt: L.promptEstrelaDaCena(`cena ${i}`, 'ficha') }))
  const r = await w.S.gerarStillsDaEstrela({ itens: prompts, total: 4, imageUrls: signed, aspect: '9:16', userId: U, engine: 'kling', pool: 2, budgetMs: 5000, pollWindowMs: 3000 })
  checa('B2 cada cena com protagonista = UM POST ao fal-ai/nano-banana-pro/edit, com image_urls = as fotos assinadas da própria conta', w.posts.length === 2 && w.posts.every((p) => p.slug === 'fal-ai/nano-banana-pro/edit' && JSON.stringify(p.input.image_urls) === JSON.stringify(signed) && p.input.prompt.includes('keep the exact face and identity')))
  checa('B3 os stills voltam no índice da cena; cenas sem protagonista ficam null', r.urls[0]?.startsWith('https://v3.fal.media/') && r.urls[1] === null && r.urls[2]?.startsWith('https://v3.fal.media/') && r.urls[3] === null && r.feitos === 2)
  checa('B4 cada still passa pela moderação de SAÍDA (surface estrela) antes de virar âncora', w.mods.length === 2 && w.mods.every((m) => m.surface === 'estrela' && m.stage === 'output' && m.userId === U))
  w.restore()
  const wb = await servidor({ bloqueia: [1], falha: [2] })
  const rb = await wb.S.gerarStillsDaEstrela({ itens: [0, 1, 2].map((i) => ({ indice: i, prompt: `p${i}` })), total: 3, imageUrls: ['u'], aspect: undefined, userId: U, engine: 'veo', pool: 1, budgetMs: 5000, pollWindowMs: 3000 })
  checa('B5 still barrado na moderação ou com falha do fornecedor = null (a cena volta ao still de hoje), o resto segue', rb.urls[0] && rb.urls[1] === null && rb.urls[2] === null && rb.motivos.moderation_blocked === 1 && rb.motivos.provider_failed === 1 && rb.feitos === 1)
  checa('B6 falha no fornecedor NÃO re-posta o mesmo still (3 itens = 3 POSTs)', wb.posts.length === 3)
  wb.restore()
  const wk = await servidor({ semChave: true })
  const rk = await wk.S.gerarStillDaEstrela({ prompt: 'p', imageUrls: ['u'], aspect: '9:16', userId: U, engine: 'kling', pollWindowMs: 1000 })
  checa('B7 sem FAL_KEY = null, nenhum POST', rk.url === null && rk.motivo === 'no_key' && wk.posts.length === 0)
  wk.restore()
}

// ═══ C. a rota do filme ═════════════════════════════════════════════════════════════════════════════════════════════
const ROTA_BASE = rdBase('app/api/generate-video-cinematic/route.ts')
const INI_BLOCO = '    if (anchorActive) {\n'
const FIM_BLOCO = '(user credits unchanged; kling=${KLING_CREDIT_COST}cr)`,\n      )\n    }\n'
const fatia = (s, a, b) => { const i = s.indexOf(a); if (i < 0) return null; const j = s.indexOf(b, i); return j < 0 ? null : s.slice(i, j + b.length) }
const blocoHead = fatia(SRC.rota, INI_BLOCO, FIM_BLOCO)
const blocoBase = ROTA_BASE ? fatia(ROTA_BASE, INI_BLOCO, FIM_BLOCO) : null
checa('C1 o bloco de âncoras FLUX clássico é BYTE A BYTE o da base ' + BASE + ' (a estrela corre ao lado, não dentro)', Boolean(blocoHead) && blocoHead === blocoBase)

// A fatia nova inteira (estrela + bloco FLUX + troca), executada. Sem estrela deve dar o MESMO que o bloco da base sozinho.
const INI_NOVA = '    const estrelaMotor = estrelaDecisao.ok && estrelaDecisao.ativa ? estrelaDecisao.engine : motorDaEstrela(body.engine) // KINEO-ESTRELA-DO-FILME-2026-09-29\n'
const FIM_NOVA = 'extra_usd: Math.round(estrelaResultado.feitos * ESTRELA_STILL_USD * 100) / 100 } }) // KINEO-ESTRELA-DO-FILME-2026-09-29\n    } // KINEO-ESTRELA-DO-FILME-2026-09-29\n'
// A estrela roda DEPOIS do pool FLUX (fora das fatias que outros guardiões executam) e ANTES do submitAllScenes (o 1º POST de clipe).
const ordemClassica = (() => { const r = SRC.rota; const a = r.indexOf(INI_BLOCO); const b = r.indexOf(INI_NOVA); const c = r.indexOf('    async function submitAllScenes('); const d = r.indexOf('const submittedScenes = await submitAllScenes(usedModel)'); return a > 0 && a < b && b < c && c < d })()
const fatiaNova = fatia(SRC.rota, INI_NOVA, FIM_NOVA)
checa('C2 a fatia da estrela na estrada clássica existe, DEPOIS do pool FLUX e ANTES do primeiro POST de clipe', Boolean(fatiaNova) && ordemClassica)
function harness(bloco) {
  return `
exports.rodaFatia = async function (ctx) {
  const { anchorEngine, scenes, classicScenePrompts, generationSeed, aspectRequested, generationId, generateCinematicSceneStill, Date,
    estrelaDecisao, estrelaAtiva, estrelaFicha, estrelaFotos, body, user, prompt, planoDaEstrela, fichaDaEstrela, gerarStillsDaEstrela,
    relatoDaEstrela, motorDaEstrela, writeServerEvent, ESTRELA_STILL_USD } = ctx
  const anchorActive = true
  const anchorI2vModel = 'i2v'
  const ANCHORS_USD = 0.1
  const KLING_CREDIT_COST = 50
  let providerSubmissionMayExist = false
  const sceneStills = new Array(scenes.length).fill(null)
${bloco}
  return { sceneStills, providerSubmissionMayExist }
}
`
}
async function simula(bloco, { ativa, cenas }) {
  const { rodaFatia } = roda(harness(bloco))
  const flux = []
  const estrelaPedidos = []
  const eventos = []
  const r = await rodaFatia({
    anchorEngine: 'kling', scenes: cenas, classicScenePrompts: cenas.map((c) => `FINAL ${c.aiPrompt}`), generationSeed: 7, aspectRequested: '9:16', generationId: 'g1',
    generateCinematicSceneStill: async (a) => { flux.push(a); return `flux:${a.scenePrompt}` }, Date,
    estrelaDecisao: ativa ? { ok: true, ativa: true, paths: [foto(U, 1)], engine: 'kling' } : { ok: true, ativa: false },
    estrelaAtiva: ativa, estrelaFicha: ativa ? L.fichaDaEstrela('Troia Aquiles', null) : null, estrelaFotos: ativa ? ['https://sb/sign/f1'] : [],
    body: { engine: 'kling' }, user: { id: U }, prompt: 'Troia Aquiles',
    planoDaEstrela: L.planoDaEstrela, fichaDaEstrela: L.fichaDaEstrela, relatoDaEstrela: L.relatoDaEstrela, motorDaEstrela: L.motorDaEstrela, ESTRELA_STILL_USD: 0.15,
    gerarStillsDaEstrela: async (a) => { estrelaPedidos.push(a); const urls = new Array(a.total).fill(null); for (const it of a.itens) urls[it.indice] = `estrela:${it.indice}`; return { urls, motivos: { ok: a.itens.length }, feitos: a.itens.length } },
    writeServerEvent: (e) => { eventos.push(e); return Promise.resolve(true) },
  })
  return { ...r, flux, estrelaPedidos, eventos }
}
const CENAS = [
  { aiPrompt: 'A Greek warrior charges across the beach', voiceover: 'a' },
  { aiPrompt: 'The burning walls of Troy at night, wide aerial shot', voiceover: 'b' },
  { aiPrompt: 'Close-up of his eyes behind the bronze helmet', voiceover: 'c' },
  { aiPrompt: 'A wooden horse at the city gates, no people', voiceover: 'd' },
]
if (fatiaNova && blocoBase) {
  const base = await simula(blocoBase, { ativa: false, cenas: CENAS })
  const semEstrela = await simula(blocoHead + fatiaNova, { ativa: false, cenas: CENAS })
  checa('C3 SEM estrela: sceneStills idênticos aos da base (todas as cenas no FLUX de sempre)', JSON.stringify(semEstrela.sceneStills) === JSON.stringify(base.sceneStills))
  checa('C4 SEM estrela: os pedidos ao FLUX (prompt, seed, aspecto, janela) são IDÊNTICOS aos da base — nenhum pedido à estrela, nenhum evento', JSON.stringify(semEstrela.flux) === JSON.stringify(base.flux) && semEstrela.estrelaPedidos.length === 0 && semEstrela.eventos.length === 0 && semEstrela.providerSubmissionMayExist === base.providerSubmissionMayExist)
  const com = await simula(blocoHead + fatiaNova, { ativa: true, cenas: CENAS })
  checa('C5 COM estrela: guerreiro (1) e olhos do herói (3) com o still do edit; muralhas (2) e cavalo sem gente (4) com o FLUX de hoje', JSON.stringify(com.sceneStills) === JSON.stringify(['estrela:0', 'flux:FINAL The burning walls of Troy at night, wide aerial shot', 'estrela:2', 'flux:FINAL A wooden horse at the city gates, no people']))
  const pe = com.estrelaPedidos[0]
  checa('C6 COM estrela: o edit recebe as fotos ASSINADAS (estrelaFotos), o prompt FINAL da cena + ficha + identidade, e o aspecto do pedido', com.estrelaPedidos.length === 1 && JSON.stringify(pe.imageUrls) === '["https://sb/sign/f1"]' && pe.itens.length === 2 && pe.itens[0].prompt.startsWith('FINAL A Greek warrior') && pe.itens[0].prompt.includes('keep the exact face and identity') && pe.aspect === '9:16' && pe.userId === U)
  checa('C7 COM estrela: o FLUX continua sendo pedido para TODAS as cenas (é a reserva de cada cena da estrela)', com.flux.length === CENAS.length)
  const ev = com.eventos.find((e) => e.name === 'estrela_scene_anchored')
  checa('C8 COM estrela: evento estrela_scene_anchored {engine, scenes, anchored, fallback} sem caminho, URL ou texto', ev && ev.metadata.engine === 'kling' && ev.metadata.scenes === 4 && ev.metadata.anchored === 2 && ev.metadata.fallback === 0 && !/images\/|https?:|Troia/.test(JSON.stringify(ev.metadata)))
  checa('C9 COM estrela: o claim fica protegido (providerSubmissionMayExist) como no FLUX', com.providerSubmissionMayExist === true)
}

function verificaRota(r = SRC.rota) {
  const f = []
  const c = (n, cond) => { if (!cond) f.push(n) }
  const i = (s) => r.indexOf(s)
  const iDec = i('const estrelaDecisao = decideEstrelaRequest({')
  const iCusto = i('    const cost = creditCostForDuration(costQuality, true, duration) + estrelaSobretaxaDe(duration)')
  const iSobre = i('const estrelaSobretaxaDe = (segundos: number): number => (estrelaAtiva ? estrelaSobretaxa(body.engine, segundos) : 0)')
  const iClaim = i('const acquired = await acquireCinematicClaim({')
  const iDebito = i('const upfrontDebit = await ensureCinematicDebit(cost)')
  const iCeleb = i('if (estrelaAtiva && mentionsContemporaryFigure(prompt)) {')
  const iAssina = i('const assinadas = await assinarFotosDaEstrela(estrelaDecisao.paths)')
  c('C10 o pedido da estrela é decidido ANTES do custo, do claim e do débito', iDec > 0 && iDec < iCusto && iCusto < iClaim && iClaim < iDebito)
  c('C11 interruptor: visible = estrelaVisible(user.email); âncora: hollywoodPath || CINEMATIC_ANCHOR_ENABLED', r.includes('visible: estrelaVisible(user.email),') && r.includes('anchorEnabled: hollywoodPath || CINEMATIC_ANCHOR_ENABLED,'))
  c('C12 recusa da estrela sai com o status da régua e charged:false, antes de tudo', /if \(!estrelaDecisao\.ok\) \{[\s\S]{0,400}return NextResponse\.json\(\{ error: estrelaDecisao\.error, reason: estrelaDecisao\.code, retryable: false, charged: false, refunded: false \}, \{ status: estrelaDecisao\.status \}\)/.test(r))
  c('C13 sobretaxa definida ANTES do custo, somada no MESMO `cost` que vai ao claim e ao débito (nunca depois)', iSobre > 0 && iSobre < iCusto && iCusto < iDebito && !/ensureCinematicDebit\((?!cost\))/.test(r.slice(iDebito)) && !/\n\s+cost = /.test(r))
  c('C14 o preço da duração entregue também leva a estrela (a diferença volta junto)', r.includes('const precoEntregue = creditCostForDuration(costQuality, true, duration) + estrelaSobretaxaDe(duration)'))
  c('C15 celebridade atual nomeada + estrela = 400 antes do custo, em qualquer motor', iCeleb > iDec && iCeleb < iCusto && /reason: 'estrela_real_person'[^\n]*charged: false/.test(r))
  c('C16 fotos assinadas ANTES do custo (foto sumida = 400, nada cobrado)', iAssina > iDec && iAssina < iCusto && /reason: 'estrela_missing'[^\n]*charged: false/.test(r))
  c('C17 impressão do claim com a estrela (mesmo generationId com/sem estrela não se confundem)', r.includes("characterId: (typeof body.characterId === 'string' ? body.characterId.trim() : '') + estrelaFingerprintSuffix(estrelaDecisao),"))
  c('C18 formato: formatoComEstrela(decidirFormato(...), estrelaPedida(body.estrela))', r.includes('const formatoVisual = formatoComEstrela(decidirFormato(prompt, tagFacelessPresente), estrelaPedida((body as { estrela?: unknown }).estrela))'))
  c('C19 hollywood: o still da estrela é a âncora da cena com protagonista (vence ambiente e FLUX); o retrato do diálogo vira a estrela', r.includes('const anchorUrl = estrelaHollywood[idx] ? estrelaHollywood[idx] : anchors // KINEO-ESTRELA-DO-FILME-2026-09-29\n            ? hs.type === \'dialogue\'') && r.includes('if (retratoEstrela && anchors) anchors = { ...anchors, portraitUrl: retratoEstrela }') && /const estrelaHollywood: \(string \| null\)\[\] = new Array\(plan\.scenes\.length\)\.fill\(null\)[^\n]*\n\s+if \(estrelaAtiva && estrelaDecisao\.ok && estrelaDecisao\.ativa\) \{/.test(r))
  c('C20 hollywood: a estrela é gerada DEPOIS do supervisor fala×imagem e ANTES do primeiro POST de cena', (() => { const a = i("console.warn('[fala-x-imagem] hollywood falhou"); const b = i('const estrelaHollywood: (string | null)[]'); const d = i('      for (const [idx, hs] of plan.scenes.entries()) {'); return a > 0 && a < b && b < d })())
  c('C21 ensaio de $0 (clássico e hollywood) mostra cena a cena quem iria ao edit', (r.match(/\.\.\.\(estrelaAtiva \? \{ estrela: \{ ficha:/g) || []).length === 2)
  c('C22 personagem da estrada clássica = a ficha da estrela (continuidade de figurino)', r.includes('const estrelaFicha: string | null = estrelaAtiva ? fichaDaEstrela(prompt, storyCharacter) : null') && r.includes('    if (estrelaFicha) classicVisualPolicy.character = estrelaFicha') && r.indexOf('    if (estrelaFicha) classicVisualPolicy.character = estrelaFicha') > r.indexOf('    const classicVisualPolicy: VisualPromptPolicy = {'))
  c('C23 planejador hollywood recebe a ficha da estrela quando o autor não deu uma', r.includes('const fichaDoPedidoTexto = deriveExplicitCharacter(prompt) ?? (estrelaAtiva ? fichaDaEstrela(prompt, null) : null)'))
  c('C24 eventos estrela_requested (aceito/recusado) e estrela_scene_anchored sem caminho nem URL no metadata', !/name: 'estrela_requested'[^\n]*(estrelaDecisao\.paths(?!\.length)|estrelaFotos|assinadas)/.test(r) && /name: 'estrela_requested'[^\n]*photos: estrelaDecisao\.paths\.length/.test(r) && /name: 'estrela_requested'[^\n]*outcome: 'refused'/.test(r))
  return f
}
{
  const f = verificaRota()
  for (const n of f) checa(n, false)
  ok += 15 - f.length
}
{
  const r = SRC.rota
  const iAceito = r.indexOf("outcome: 'accepted'")
  checa('C25 estrela_requested {outcome: accepted, engine, seconds, photos, surcharge_cr} gravado depois do custo', iAceito > r.indexOf('    const cost = creditCostForDuration(costQuality, true, duration) + estrelaSobretaxaDe(duration)') && /outcome: 'accepted', engine: [^\n]*surcharge_cr: estrelaSobretaxaDe\(duration\)/.test(r))
  const f = SRC.fast
  const iRec = f.indexOf("reason: 'estrela_engine'")
  checa('C26 Kineo 1 (/api/generate-video-fast): estrela recusada logo depois de ler o corpo, antes de qualquer trabalho', iRec > f.indexOf('body = await req.json()') && iRec < f.indexOf('stripIdeaPrefix(') && f.includes("estrelaMotorSemAncoraMensagem('fast')") && /status: 422/.test(f.slice(iRec, iRec + 200)))
}

// ═══ D. tela, /studio/create, analyze-idea, interruptor, eventos ════════════════════════════════════════════════════
{
  const s = SRC.studio
  checa('D1 /studio: bloco só com a flag `estrela` do /api/me/credits e fora do modo clipe', s.includes("if (d?.estrela === true) setEstrelaOk(true)") && s.includes("{estrelaOk && scriptMode !== 'clip' && (") && s.includes('useState<boolean>(ESTRELA_PUBLIC)'))
  checa('D2 /studio: caixa de autorização obrigatória antes de subir (mesma frase do /images) e upload pela MESMA rota com rights=true', s.includes('I have permission from the person in the photo to use their image.') && s.includes('disabled={!estrelaConsent}') && s.includes("fetch('/api/images/reference', { method: 'POST', body: form })") && s.includes("form.append('rights', 'true')") && s.includes('if (!estrelaConsent || files.length === 0) return'))
  checa('D3 /studio: preço = MESMA função do servidor, somada ao custo mostrado ANTES do clique (número, botão e linha própria)', s.includes('const estrelaCr = estrelaLigada ? estrelaSobretaxa(eng.key, duration) : 0') && s.includes("const cost = creditCostForDuration(ENGINE_QUALITY[eng.key] ?? 'cinematic_ai', true, duration) + estrelaCr") && s.includes('+{estrelaCr} cr'))
  checa('D4 /studio: motor sem âncora = aviso, sem upload; estrela só liga com motor com âncora + autorização + foto pronta', s.includes('const estrelaNoMotor = estrelaDisponivelNoMotor(eng.key)') && s.includes("const estrelaLigada = estrelaOk && scriptMode !== 'clip' && estrelaNoMotor && estrelaConsent && estrelaFotosProntas.length > 0") && s.includes("estrelaCopy(idiomaDaTela, 'off')"))
  checa('D5 /studio: o pedido da estrela vai pela sessionStorage, em sincronia com a tela (motor, duração, texto, fotos PRONTAS, autorização); nada na URL', s.includes("if (estrelaLigada) sessionStorage.setItem('kineo:studio:estrela:v1', JSON.stringify({ t: Date.now(), engine, duration, prompt: finalPrompt, paths: estrelaFotosProntas, consent: true }))") && s.includes("else sessionStorage.removeItem('kineo:studio:estrela:v1')") && s.includes('const estrelaFotosProntas = estrelaFotos.filter((f) => f.path).map((f) => f.path as string)') && !/q\.set\('estrela/.test(s))
  const genBase = rdBase('app/(dashboard)/studio/StudioClient.tsx')
  const fatiaGen = (t) => { if (!t) return null; const i = t.indexOf('  const generate = () => {'); const j = t.indexOf('\n  }\n', i); return i < 0 || j < 0 ? null : t.slice(i, j) }
  checa('D6 /studio: generate() e o botão Generate são BYTE A BYTE os da base (a estrela não mexe no clique; foto subindo não entra no preço nem no pedido)', fatiaGen(s) !== null && fatiaGen(s) === fatiaGen(genBase) && s.includes('disabled={!prompt.trim() || limit.over} className='))
  const g = SRC.gen
  checa('D7 /studio/create: usa o pedido da estrela só se motor, duração e texto da URL forem os MESMOS; lê uma vez (e apaga); manda { estrela } só num motor com âncora', g.includes("sessionStorage.removeItem('kineo:studio:estrela:v1')") && g.includes("const mesmoPedido = tok.engine === searchParams?.get('engine') && String(tok.duration) === searchParams?.get('duration') && tok.prompt === searchParams?.get('prompt')") && g.includes('...(estrelaRef.current && estrelaDisponivelNoMotor(aiEngine) ? { estrela: estrelaRef.current } : {}),'))
  checa('D8 /studio/create: o analyze-idea recebe só a MARCA estrela:true, nunca as fotos (o corpo de sempre fica literal)', g.includes('const analyzeBody = JSON.stringify({ prompt: source, duration: alvoAnalise, language, scriptMode })') && g.includes('body: estrelaRef.current ? JSON.stringify({ ...JSON.parse(analyzeBody), estrela: true }) : analyzeBody,'))
  const a = SRC.analyze
  const REGRA = '- REAL PEOPLE (KINEO-ERA-LOCK-2026-07-09): NEVER prompt a recognizable close-up face of a named real person (historical or living) — AI cannot match likeness and it breaks immersion. Show such figures from behind, in silhouette, at a distance, or imply them through details (a bicorne hat, a hand on a map, boots in mud). Write the visual_prompt so no identifiable face is the focal point.'
  checa('D9 analyze-idea: a regra REAL PEOPLE segue inteira no prompt de sistema e passa por regraDePessoasReais(…, estrela)', a.includes("${regraDePessoasReais('" + REGRA + "', estrela)}") && a.includes('buildSystemPrompt(duration, language, estrelaNoPedido)') && a.includes('const estrelaNoPedido = body.estrela === true'))
  checa('D10 analyze-idea: sem estrela, o texto que o escritor recebe é o de sempre, byte a byte (executado)', L.regraDePessoasReais(REGRA, false) === REGRA)
  checa('D11 analyze-idea: as 2 réguas de visual_prompt anexam a exceção SÓ com estrela', (a.match(/or via details like a hat or hands\)\$\{estrelaNoPedido \? `\\n- \$\{ESTRELA_REAL_PEOPLE_EXCEPTION\}` : ''\}/g) || []).length === 2)
  // celebridade: a lista do router, executada
  const reSrc = SRC.router.slice(SRC.router.indexOf('export const CONTEMPORARY_FIGURE_RE = new RegExp('), SRC.router.indexOf('\n)', SRC.router.indexOf('export const CONTEMPORARY_FIGURE_RE = new RegExp(')) + 2)
  const fnIni = SRC.router.indexOf('export function mentionsContemporaryFigure(')
  const fnSrc = SRC.router.slice(fnIni, SRC.router.indexOf('\n}', fnIni) + 2)
  let R = null
  try { R = roda(reSrc + '\n' + fnSrc) } catch (e) { R = null }
  checa('D12 celebridade nomeada continua bloqueada: "meu amigo como Aquiles igual ao Brad Pitt em Troia" e "Taylor Swift" batem na lista; "Aquiles"/"Leônidas" (mito/história) não', R && R.mentionsContemporaryFigure('meu amigo como Aquiles igual ao Brad Pitt em Troia') && R.mentionsContemporaryFigure('Taylor Swift on stage') && !R.mentionsContemporaryFigure('Meu amigo lutando na guerra de Troia como Aquiles, forte, bolado') && !R.mentionsContemporaryFigure('my friend as Leonidas at Thermopylae'))
  // interruptor
  const launch = SRC.launch
  checa('D13 ESTRELA_PUBLIC nasce false; estrelaVisible = ESTRELA_PUBLIC || casa (executado)', /export const ESTRELA_PUBLIC = false\n/.test(launch) && (() => { const E = roda(launch, { '@/lib/internalAccounts': { isInternalEmail: (e) => e === 'casa@usekineo.com' } }); return E.estrelaVisible('casa@usekineo.com') === true && E.estrelaVisible('fora@gmail.com') === false && E.estrelaVisible(null) === false })())
  checa('D14 /api/me/credits devolve estrela: estrelaVisible(user.email)', SRC.me.includes('estrela: estrelaVisible(user.email),'))
  const ev = SRC.events
  const lista = ev.slice(ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), ev.indexOf('])', ev.indexOf('const SERVER_ONLY_EVENTS = new Set([')))
  checa('D15 os dois eventos novos são só-de-servidor (o navegador não cunha)', lista.includes("'estrela_requested',") && lista.includes("'estrela_scene_anchored',"))
  checa('D16 a porta de moderação conhece a superfície estrela', /\| 'estrela'/.test(SRC.mod))
  // 16 línguas
  const C = roda(SRC.copy, { '@/lib/ui/interfaceLanguage': {} })
  const EN = Object.keys(C.ESTRELA_COPY_EN)
  const marks = (t) => (t.match(/\{(n|s)\}/g) || []).sort().join(',')
  const LANGS = ['pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
  checa('D17 textos novos nas 15 línguas + inglês, todas as chaves, mesmos marcadores {n} {s}', JSON.stringify(Object.keys(C.ESTRELA_COPY).sort()) === JSON.stringify([...LANGS].sort()) && LANGS.every((l) => JSON.stringify(Object.keys(C.ESTRELA_COPY[l]).sort()) === JSON.stringify([...EN].sort()) && EN.every((k) => C.ESTRELA_COPY[l][k].trim() && marks(C.ESTRELA_COPY[l][k]) === marks(C.ESTRELA_COPY_EN[k]))))
  checa('D18 pt: "Estrela do filme (opcional)" e o preço preenchido', C.estrelaCopy('pt', 'title') === 'Estrela do filme (opcional)' && C.estrelaCopy('pt', 'price', { n: 30, s: 35 }) === '+30 cr pela estrela em 35 s · 5 cr a cada 6 s de filme')
  const refine = JSON.parse(rd('lib/ui/refinementCopy.json'))
  checa('D19 frases reaproveitadas do /images seguem traduzidas nas 16 línguas', ['I have permission from the person in the photo to use their image.', 'Add photo', 'Remove photo', 'Up to 3 photos · JPG, PNG or WEBP · max 10 MB each', 'Check the box above to add a photo.', 'Only JPG, PNG or WEBP photos.', 'Photo is too large — max 10 MB.'].every((k) => Object.values(refine).every((d) => typeof d[k] === 'string' && d[k].trim().length > 0)))
}

// ═══ E. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════
const mut = (campo, de, para) => { if (SRC[campo].split(de).length !== 2) throw new Error('âncora do mutante não achada: ' + de.slice(0, 80)); return { ...SRC, [campo]: SRC[campo].replace(de, () => para) } }
const MUTANTES = [
  ['tirar a checagem de DONO', () => verificaLib(mut('lib', 'if (!paths.every((p) => isOwnReferencePath(p, args.userId))) return', 'if (false) return')), (f) => f.some((n) => n.startsWith('A3') || n.startsWith('A4'))],
  ['tirar o CONSENTIMENTO do servidor', () => verificaLib(mut('lib', "if (r.consent !== true) return { ok: false, status: 400, error: ESTRELA_MSG.consent, code: 'estrela_consent' }", '')), (f) => f.some((n) => n.startsWith('A6'))],
  ['cobrar a sobretaxa DEPOIS do débito', () => verificaRota(mut('rota', '    const cost = creditCostForDuration(costQuality, true, duration) + estrelaSobretaxaDe(duration)', '    const cost = creditCostForDuration(costQuality, true, duration)').rota.replace('const upfrontDebit = await ensureCinematicDebit(cost)\n', 'const upfrontDebit = await ensureCinematicDebit(cost)\n    await ensureCinematicDebit(estrelaSobretaxaDe(duration))\n')), (f) => f.some((n) => n.startsWith('C10') || n.startsWith('C13'))],
  ['abrir a regra REAL PEOPLE (exceção sem estrela)', () => verificaLib(mut('lib', 'return estrela ? `${regraBase}\\n- ${ESTRELA_REAL_PEOPLE_EXCEPTION}` : regraBase', 'return `${regraBase}\\n- ${ESTRELA_REAL_PEOPLE_EXCEPTION}`')), (f) => f.some((n) => n.startsWith('A29'))],
  ['abrir a regra REAL PEOPLE (exceção cobre pessoa nomeada)', () => verificaLib(mut('lib', "'Every NAMED real person (historical or living) and every public figure in the text still follows REAL PEOPLE: never their recognizable face.'", "'Named people may be shown too.'")), (f) => f.some((n) => n.startsWith('A30'))],
  ['abrir a regra REAL PEOPLE (sem a recusa de celebridade)', () => verificaRota(mut('rota', 'if (estrelaAtiva && mentionsContemporaryFigure(prompt)) {', 'if (false) {').rota), (f) => f.some((n) => n.startsWith('C15'))],
  ['interruptor aberto para conta de fora', () => verificaRota(mut('rota', 'visible: estrelaVisible(user.email),', 'visible: true,').rota), (f) => f.some((n) => n.startsWith('C11'))],
  ['motor sem âncora deixa de ser recusado', () => verificaLib(mut('lib', 'if (!estrelaDisponivelNoMotor(args.engine) || !args.anchorEnabled) {', 'if (false) {')), (f) => f.some((n) => n.startsWith('A10') || n.startsWith('A11'))],
]
for (const [nome, rodaMut, pega] of MUTANTES) {
  let f
  try { f = rodaMut() } catch (e) { f = ['erro: ' + e.message] }
  checa(`E. mutante "${nome}" fica VERMELHO`, Array.isArray(f) && f.length > 0 && pega(f))
}

console.log(`test-estrela-do-filme-2026-09-29: ${ok} ok · ${falhas.length} falhas`)
for (const x of falhas) console.log('  FAIL ' + x)
process.exit(falhas.length ? 1 : 0)
