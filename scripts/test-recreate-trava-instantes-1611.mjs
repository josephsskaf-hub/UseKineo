// KINEO-TRAVA-INSTANTES-MOLDE-1611 — guardião dos instantes da trava "não trocou" por molde e trecho, e da auditoria do juiz no evento.
// Caso (CEO 16/11): testes pagos ebe8bd47 (vendedor v1, trecho 1 = all_kept) e 1332dd10 (vendedor v2, trecho 0 = target_unclear) recusaram e estornaram
// trocas que SAÍRAM — os 20/40/60/80% do trecho caíam em rosto de lado, coberto ou pequeno; o evento não dizia o que o juiz viu.
// EXECUTA a trava real do trecho (lib/recreate/swapCheck checarTrocaDoTrecho) com fal e OpenAI falsos, e a máquina real (lib/recreate/invasor settleInvasor).
// Prova: (1) todo trecho de todo molde tem 4 instantes válidos (grade de 0,5 s, crescentes, dentro do arquivo e da saída do motor) e os escolhidos ficam
// presos; (2) sem instantes, a trava é a de antes (20/40/60/80%, quadros n…4n, 'padrao'); (3) com instantes, a fal recebe o passo comum em cada fps e o juiz
// recebe os pares NOS instantes, na ordem; (4) saída curta: só os instantes que existem, menos de 2 = incerto; (5) instantes inválidos = o padrão; (6) a regra
// não mudou (trocou = diferente da base E parecida com a foto; incerto não entrega); (7) a resposta do juiz por pessoa e os instantes vão ao evento
// recreate_invasor_trava, sem sobrescrever os campos fixos. Mutantes. Rodar: node scripts/test-recreate-trava-instantes-1611.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const SC = 'lib/recreate/swapCheck.ts', MOLDE = 'lib/recreate/invasorMolde.ts', INV = 'lib/recreate/invasor.ts', SRV = 'lib/clips/clipServer.ts'
const KLING = 'kling/v4/video-to-video/edit'
const BASE = 'https://fixture.supabase.co/storage/v1/object/sign/quarantine/recreate-guias/v1/t0.mp4?token=abc'
const SAIDA = 'https://v3.fal.media/files/saida.mp4'
const FOTO = 'https://fixture.supabase.co/storage/v1/object/public/avatars/u/face.jpg'
const PEDIDO = 'Replace the man in the dark navy suit and white shirt in @Video1 with the man from @Image1: his face, hair and beard match @Image1. Keep his movements, the timing, the camera, the framing, every other person, the background and the lighting of @Video1 exactly. Keep the original clothing from @Video1.'
// Os instantes escolhidos em 16/11 nas folhas de quadros de cada guia (presos: mudar é decisão, não acidente).
const ESCOLHIDOS = {
  'invasor-de-campo': [[2.5, 3, 4.5, 7.5], [5.5, 6, 7, 7.5], [1, 1.5, 2, 2.5]],
  basquete: [[1.5, 3.5, 5, 7.5], [3, 4, 4.5, 5]],
  'cachorro-craque': [[1, 3, 4.5, 6], [1, 3, 4.5, 5]],
  'cachorro-craque-humano': [[1, 3, 4.5, 6]],
  'vendedor-de-ilusao': [[2, 2.5, 3.5, 4], [1.5, 2, 4.5, 5]],
}

function carregar(src, metas) {
  const mod = { exports: {} }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const stubs = {
    '@/lib/aiModels': { AI_TEXT_MODELS: { writer: 'gpt-4o' } },
    '@/lib/regua95/coherenceV2': { usdFromUsage: () => 0.02 },
    '@/lib/regua95/pixelScore': { FAL_NTH_FRAME_MODEL: 'fal-ai/workflow-utilities/extract-nth-frame', FAL_USD_PER_COMPUTE_SECOND: 0.001, PIXEL_MODEL_RATES: {} },
    './formats': { RECREATE_CHECK_FRAMES: [84, 168], RECREATE_FORMATS: [] },
    './generation': { RECREATE_MODEL: 'recast', RECREATE_PROVIDER_ORIGIN: 'https://www.usekineo.com' },
    './seuVideo': { catalogoNoSeedance25: () => false, KLING4_EDIT_MODEL: KLING, SEEDANCE25_MODEL: 'seedance', SEU_VIDEO_PASTA: 'recreate-uploads', metaPorUrl: async (url) => metas[url] ?? null },
  }
  new Function('require', 'module', 'exports', 'process', js)((id) => { if (id in stubs) return stubs[id]; throw new Error('import inesperado: ' + id) }, mod, mod.exports, { env: {}, cwd: () => '.' })
  return mod.exports
}
// fal devolve max_frames imagens (a 0 é o quadro 0); a OpenAI devolve a resposta dada.
function rede(resposta, { curta = 0 } = {}) {
  const s = { fal: [], visao: null }
  const f = async (url, init) => {
    if (String(url).startsWith('https://fal.run/')) {
      const b = JSON.parse(init.body); s.fal.push({ ...b })
      const tag = b.video_url === BASE ? 'base' : 'saida'
      const n = tag === 'saida' && curta ? Math.min(curta, b.max_frames) : b.max_frames
      return { ok: true, json: async () => ({ images: Array.from({ length: n }, (_, i) => ({ url: `https://f/${tag}-${i}.jpg` })) }) }
    }
    if (String(url).includes('api.openai.com')) {
      s.visao = JSON.parse(init.body)
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ persons: [resposta] }) } }], usage: {} }) }
    }
    throw new Error('rede inesperada: ' + url)
  }
  return { s, f }
}
const TROCOU = { person: 1, visible_pairs: [1, 2, 3, 4], base_vs_result: { hair_color: 'different', beard: 'different', face_shape: 'different', glasses: 'same' }, same_person: 'no', result_vs_photo: 'yes', note: 'Hair, beard and face shape differ from the original.' }
const MANTIDA = { person: 1, visible_pairs: [1, 2], base_vs_result: { hair_color: 'same', face_shape: 'same' }, same_person: 'yes', result_vs_photo: 'no', note: 'Same face.' }
const NAO_PARECE = { person: 1, visible_pairs: [2, 3], base_vs_result: { hair_color: 'different' }, same_person: 'no', result_vs_photo: 'no', note: 'Changed but not like the photo.' }
const INCERTO = { person: 1, visible_pairs: [], base_vs_result: {}, same_person: 'uncertain', result_vs_photo: 'uncertain', note: 'Two people; target not clear.' }

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const m = loader({}, over)
  const M = m('lib/recreate/invasorMolde'), I = m('lib/recreate/invasor')
  const sc = over[SC] ?? lf(SC), srv = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
  const trava = async (resposta, { instantes, base = { segundos: 8, fps: 30 }, saida = { segundos: 8.04, fps: 24 }, curta } = {}) => {
    const S = carregar(sc, { [SAIDA]: saida })
    const r = rede(resposta, { curta })
    const v = await S.checarTrocaDoTrecho({ baseVideoUrl: BASE, baseMeta: { ...base, largura: 1080, altura: 1920 }, resultVideoUrl: SAIDA, photos: [FOTO], prompt: PEDIDO, formatId: 'vendedor-de-ilusao', ...(instantes ? { instantes } : {}) }, { fetchImpl: r.f, falKey: 'k', apiKey: 'k', budgetMs: 5000 })
    return { v, s: r.s, S }
  }

  await check('1. todo trecho de todo molde tem 4 instantes na grade de 0,5 s, crescentes, dentro do arquivo e da saída do motor; os escolhidos ficam presos', async () => {
    const S = carregar(sc, {})
    const ids = M.MOLDES_DE_TRECHOS.map((x) => x.id)
    if (ids.join() !== Object.keys(ESCOLHIDOS).join()) throw new Error('moldes sem instantes escolhidos: ' + ids.join())
    for (const mo of M.MOLDES_DE_TRECHOS) mo.trechos.forEach((t, i) => {
      const inst = t.instantesDaTrava
      if (!Array.isArray(inst) || inst.length !== 4) throw new Error(`${mo.id} t${i}: ${JSON.stringify(inst)} (4 instantes)`)
      if (JSON.stringify(inst) !== JSON.stringify(ESCOLHIDOS[mo.id][i])) throw new Error(`${mo.id} t${i}: ${inst} ≠ ${ESCOLHIDOS[mo.id][i]}`)
      if (S.instantesValidos(inst, t.segundosDoArquivo)?.join() !== inst.join()) throw new Error(`${mo.id} t${i}: inválido para a trava`)
      // a saída do motor tem o inteiro + 1 quadro (8 → 8,04): todo instante cabe nela com a folga de 0,05 s
      if (inst.some((x) => !(x <= t.segundosDoArquivo + 0.04 - 0.05))) throw new Error(`${mo.id} t${i}: instante além da saída`)
      // cada instante vira quadro INTEIRO no arquivo (24 ou 30 fps) e na saída (24 fps)
      if (inst.some((x) => !Number.isInteger(Math.round(x * t.fps * 1e6) / 1e6) || !Number.isInteger(x * 24))) throw new Error(`${mo.id} t${i}: quadro fracionário`)
    })
    if (M.moldeDeTrechos('cachorro-craque-humano').trechos[0] !== M.moldeDeTrechos('cachorro-craque').trechos[0]) throw new Error('o humano usa o MESMO arquivo do cachorro')
  })

  await check('2. sem instantes, a trava é a de antes: 20/40/60/80% do trecho, quadros n…4n em cada fps, fonte "padrao"', async () => {
    const { v, s } = await trava(TROCOU)
    if (v.result !== 'swapped' || v.instants.join() !== '1.6,3.2,4.8,6.4' || v.instants_source !== 'padrao') throw new Error(JSON.stringify([v.result, v.instants, v.instants_source]))
    const [b, r] = [s.fal.find((x) => x.video_url === BASE), s.fal.find((x) => x.video_url === SAIDA)]
    if (b.frame_interval !== 48 || b.max_frames !== 5 || r.frame_interval !== 38 || r.max_frames !== 5) throw new Error(JSON.stringify(s.fal))
    const runSrc = carregar(sc, { [SAIDA]: { segundos: 8.04, fps: 24 } })
    if (runSrc.instantesValidos(undefined, 8) !== null) throw new Error('sem instantes não é null')
  })

  await check('3. com instantes, a fal recebe o passo comum (0,5 s = 15 quadros a 30 fps, 12 a 24 fps) até o último, e o juiz recebe os pares NOS instantes, na ordem', async () => {
    const { v, s } = await trava(TROCOU, { instantes: [2.5, 3, 4.5, 7.5] })
    const [b, r] = [s.fal.find((x) => x.video_url === BASE), s.fal.find((x) => x.video_url === SAIDA)]
    if (b.frame_interval !== 15 || r.frame_interval !== 12 || b.max_frames !== 16 || r.max_frames !== 16) throw new Error(JSON.stringify(s.fal))
    if (v.instants.join() !== '2.5,3,4.5,7.5' || v.instants_source !== 'molde' || v.result !== 'swapped') throw new Error(JSON.stringify([v.result, v.instants, v.instants_source]))
    const user = s.visao.messages[1].content
    const imgs = user.filter((c) => c.type === 'image_url').map((c) => c.image_url.url)
    const esperado = [5, 6, 9, 15].flatMap((k) => [`https://f/base-${k}.jpg`, `https://f/saida-${k}.jpg`]).concat([FOTO])
    if (imgs.join() !== esperado.join()) throw new Error('pares: ' + imgs.join())
    if (!/pair 1 \(at 2\.5 s\).*pair 2 \(at 3\.0 s\).*pair 3 \(at 4\.5 s\).*pair 4 \(at 7\.5 s\)/.test(user[0].text)) throw new Error('texto dos pares: ' + user[0].text)
    // passo maior quando os instantes deixam: 1 · 2 · 3 · 4 s = passo 1 s, 4 quadros (o mesmo custo do padrão)
    const w = await trava(TROCOU, { instantes: [1, 2, 3, 4], base: { segundos: 5, fps: 24 }, saida: { segundos: 5.04, fps: 24 } })
    const wb = w.s.fal.find((x) => x.video_url === BASE)
    if (wb.frame_interval !== 24 || wb.max_frames !== 5 || w.v.instants.join() !== '1,2,3,4') throw new Error('passo de 1 s: ' + JSON.stringify(w.s.fal))
  })

  await check('4. saída mais curta: só os instantes que existem nela; menos de 2 = incerto (não entrega); extrator com menos quadros = só os pares que vieram', async () => {
    const a = await trava(TROCOU, { instantes: [2.5, 3, 4.5, 7.5], saida: { segundos: 7, fps: 24 } })
    if (a.v.instants.join() !== '2.5,3,4.5' || a.s.fal.find((x) => x.video_url === SAIDA).max_frames !== 10) throw new Error('7 s: ' + a.v.instants)
    const b = await trava(TROCOU, { instantes: [2.5, 3, 4.5, 7.5], saida: { segundos: 2.8, fps: 24 } })
    if (b.v.result !== 'uncertain' || b.v.reason !== 'result_too_short' || b.s.visao) throw new Error('2,8 s: ' + b.v.result + ' ' + b.v.reason)
    const c = await trava(TROCOU, { instantes: [2.5, 3, 4.5, 7.5], curta: 10 }) // o extrator devolveu até o quadro 9 (4,5 s)
    if (c.v.instants.join() !== '2.5,3,4.5') throw new Error('extrator curto: ' + c.v.instants)
    const d = await trava(TROCOU, { instantes: [2.5, 3, 4.5, 7.5], curta: 6 }) // só o 2,5 s
    if (d.v.result !== 'unverified' || d.s.visao) throw new Error('1 par julgado: ' + d.v.result)
  })

  await check('5. instantes inválidos (fora da grade, fora do arquivo, fora de ordem, 1 só, 5) = o padrão, nunca um par torto', async () => {
    for (const inst of [[2.4, 3, 4.5], [2.5, 3, 8], [3, 2.5, 4.5], [3, 3, 4.5], [2.5], [1, 2, 3, 4, 5], [0, 1, 2], ['1', 2]]) {
      const { v } = await trava(TROCOU, { instantes: inst })
      if (v.instants_source !== 'padrao' || v.instants.join() !== '1.6,3.2,4.8,6.4') throw new Error(JSON.stringify(inst) + ' → ' + v.instants_source)
    }
  })

  await check('6. a regra não mudou: mantida = unchanged; diferente sem parecer a foto = uncertain; sem resposta clara (2 pessoas, 1332dd10) = uncertain; só diferente E parecida = swapped', async () => {
    const r = {}
    for (const [k, x] of Object.entries({ MANTIDA, NAO_PARECE, INCERTO, TROCOU })) r[k] = (await trava(x, { instantes: [2, 2.5, 3.5, 4], base: { segundos: 5, fps: 24 }, saida: { segundos: 5.04, fps: 24 } })).v
    if (r.MANTIDA.result !== 'unchanged' || r.NAO_PARECE.result !== 'uncertain' || r.NAO_PARECE.reason !== 'changed_not_like_photo' || r.INCERTO.result !== 'uncertain' || r.INCERTO.reason !== 'target_unclear' || r.TROCOU.result !== 'swapped') throw new Error(JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.result + '/' + v.reason]))))
    if (r.TROCOU.rule !== 'alvo_4_instantes_sem_oculos_1411' || r.TROCOU.subjects[0] !== 'the man in the dark navy suit and white shirt') throw new Error('regra ou alvo: ' + r.TROCOU.rule + ' ' + r.TROCOU.subjects)
  })

  await check('7a. a resposta do juiz por pessoa vai no veredito (same_person, result_vs_photo, visible_pairs, note), curta', async () => {
    const longa = { ...INCERTO, note: 'x'.repeat(500), visible_pairs: [1, 2, 99, 'a', 3.5], same_person: ' Uncertain ', base_vs_result: { hair_color: 'Unclear', outra: 'coisa' } }
    const { v } = await trava(longa, { instantes: [2, 2.5, 3.5, 4], base: { segundos: 5, fps: 24 }, saida: { segundos: 5.04, fps: 24 } })
    const j = v.judge?.[0]
    if (!j || j.person !== 1 || j.same_person !== 'uncertain' || j.result_vs_photo !== 'uncertain' || j.visible_pairs.join() !== '1,2' || j.note.length !== 120 || j.base_vs_result.hair_color !== 'unclear' || 'outra' in j.base_vs_result) throw new Error(JSON.stringify(v.judge))
    const t = await trava(TROCOU)
    if (t.v.judge?.[0]?.same_person !== 'no' || t.v.judge[0].result_vs_photo !== 'yes' || t.v.judge[0].visible_pairs.join() !== '1,2,3,4' || t.v.judge[0].note !== TROCOU.note) throw new Error('padrão sem o juiz: ' + JSON.stringify(t.v.judge))
  })

  await check('7b. a máquina real grava no evento recreate_invasor_trava os instantes e a resposta do juiz, sem sobrescrever trecho, resultado e motivo', async () => {
    const mo = M.moldeDeTrechos('vendedor-de-ilusao')
    const inp = { prompt: PEDIDO, video_url: I.marcadorDoTrecho(0, mo.id), image_urls: [FOTO], resolution: '720p', kineo_molde: mo.id }
    const row = { id: 'c1', user_id: 'u1', status: 'processing', model: KLING, engine: 'kling', seconds: 11, credits: 45, billing_reference: 'b1', created_at: new Date(1e12).toISOString(), failure_reason: I.marcaDoTrecho(1), fal_request_id: 'req-1', fingerprint: JSON.stringify(['x', KLING, inp]) }
    const eventos = [], pedidos = []
    const aud = { instants: [1.5, 2, 4.5, 5], instants_source: 'molde', pairs_used: [1, 2], judge: [{ person: 1, same_person: 'uncertain', result_vs_photo: 'uncertain', visible_pairs: [], base_vs_result: {}, note: 'n' }], subjects: ['alvo'], target_missing: false, model: 'gpt-4o', unverified_reason: null, trecho: 99, result: 'x', reason: 'y' }
    const io = {
      now: () => 1e12 + 60_000, poll: async () => ({ state: 'done', url: SAIDA }), guardarTrecho: async () => ({ url: 'https://ours.org/t1.mp4', segundos: 6.04 }),
      mover: async () => true, conferirTroca: async (r, i, url, dados) => { pedidos.push({ i, molde: dados.molde.id }); return { result: 'uncertain', reason: 'target_unclear', usd: 0.03, auditoria: aud } },
      refund: async () => 45, markFailed: async () => true, soltarVaga: async () => {}, event: async (name, meta) => { eventos.push([name, meta]) },
    }
    await I.settleInvasor(io, row)
    const ev = eventos.find(([n]) => n === 'recreate_invasor_trava')?.[1]
    if (!ev || pedidos[0]?.i !== 1) throw new Error('sem evento da trava: ' + JSON.stringify(eventos.map(([n]) => n)))
    if (ev.trecho !== 1 || ev.result !== 'uncertain' || ev.reason !== 'target_unclear' || ev.clip_id !== 'c1') throw new Error('campos fixos sobrescritos: ' + JSON.stringify(ev))
    if (ev.instants?.join() !== '1.5,2,4.5,5' || ev.instants_source !== 'molde' || ev.judge?.[0]?.same_person !== 'uncertain' || ev.pairs_used?.join() !== '1,2') throw new Error('auditoria fora do evento: ' + JSON.stringify(ev))
    if (!eventos.some(([n, x]) => n === 'clip_failed' && x.reason === 'swap_uncertain')) throw new Error('incerto entregou')
  })

  await check('7c. o servidor passa os instantes do trecho e devolve a auditoria (instantes, fonte, pares, juiz) à máquina', async () => {
    if (!srv.includes('formatId: dados.molde.id, instantes: t.instantesDaTrava })')) throw new Error('o servidor não passa instantesDaTrava')
    for (const k of ['instants: v.instants ?? null', 'instants_source: v.instants_source ?? null', 'pairs_used: v.pairs_used ?? null', 'judge: v.judge ?? null']) if (!srv.includes(k)) throw new Error('auditoria sem ' + k)
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const sc = lf(SC), molde = lf(MOLDE), inv = lf(INV), srvSrc = lf(SRV)
const mutantes = [
  ['o molde perde os instantes do trecho 0 do vendedor', { [MOLDE]: molde.replace(', instantesDaTrava: [2, 2.5, 3.5, 4] }', ' }') }],
  ['instante do vendedor fora da grade', { [MOLDE]: molde.replace('instantesDaTrava: [1.5, 2, 4.5, 5] }', 'instantesDaTrava: [1.5, 2, 4.4, 5] }') }],
  ['a trava ignora os instantes do molde', { [SC]: sc.replace('  if (doMolde) return checarNosInstantes(', '  if (false) return checarNosInstantes(') }],
  ['o servidor não passa os instantes', { [SRV]: srvSrc.replace('formatId: dados.molde.id, instantes: t.instantesDaTrava })', 'formatId: dados.molde.id })') }],
  ['passo fixo de 0,5 s (sem o passo comum)', { [SC]: sc.replace('  return { passo: g * TRAVA_GRADE_S, posicoes: ks.map(k => k / g) }', '  return { passo: TRAVA_GRADE_S, posicoes: ks }') }],
  ['os instantes do molde no fps do original na saída', { [SC]: sc.replace('    extractInstantFrames(providerVideoUrl, opts, intervaloPara(passo, mr.fps), ate), // o fps da própria saída', '    extractInstantFrames(providerVideoUrl, opts, intervaloPara(passo, mb.fps), ate),') }],
  ['par na posição errada (um a menos)', { [SC]: sc.replace("vale.flatMap((segundos, j) => (posicoes[j] <= total ? [{ base: base.frames![posicoes[j] - 1], result: result.frames![posicoes[j] - 1], segundos }] : []))", "vale.flatMap((segundos, j) => (posicoes[j] <= total ? [{ base: base.frames![j], result: result.frames![j], segundos }] : []))") }],
  ['saída curta julgada com instante que não existe', { [SC]: sc.replace('  const vale = instantes.filter(t => t <= mr.segundos - 0.05)', '  const vale = instantes') }],
  ['instante fora da grade aceito', { [SC]: sc.replace(' || Math.abs(t / TRAVA_GRADE_S - Math.round(t / TRAVA_GRADE_S)) > 1e-9) return null', ') return null') }],
  ['instante fora de ordem aceito', { [SC]: sc.replace('    if (i > 0 && !(t > instantes[i - 1])) return null\n', '') }],
  ['o juiz fica fora do veredito', { [SC]: sc.replace(', judge: respostasDoJuiz(answer.parsed) }', ' }') }],
  ['nota do juiz sem teto', { [SC]: sc.replace("note: typeof r.note === 'string' ? r.note.slice(0, 120) : '' }", "note: typeof r.note === 'string' ? r.note : '' }") }],
  ['o evento sem a auditoria', { [INV]: inv.replace('{ ...telemetria(row), ...(veredito.auditoria ?? {}), trecho: i,', '{ ...telemetria(row), trecho: i,') }],
  ['a auditoria sobrescreve os campos fixos', { [INV]: inv.replace("{ ...telemetria(row), ...(veredito.auditoria ?? {}), trecho: i, result: veredito.result, reason: veredito.reason, usd: veredito.usd ?? null }", "{ ...telemetria(row), trecho: i, result: veredito.result, reason: veredito.reason, usd: veredito.usd ?? null, ...(veredito.auditoria ?? {}) }") }],
  ['o servidor sem o juiz na auditoria', { [SRV]: srvSrc.replace(' judge: v.judge ?? null,', '') }],
  ['a regra afrouxa no molde (diferente basta)', { [SC]: sc.replace('const swapped = persons.filter(p => p.same_as_base === false && p.matches_photo === true).length', 'const swapped = persons.filter(p => p.same_as_base === false).length') }],
  ['o padrão muda (35/70%)', { [SC]: sc.replace('export const TRAVA_INSTANTES = [0.2, 0.4, 0.6, 0.8] as const', 'export const TRAVA_INSTANTES = [0.35, 0.7] as const') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  const falhas = await bateria(over)
  if (process.env.MOSTRAR) console.log('[' + n + '] ' + falhas.map((x) => x.slice(0, 140)).join(' | '))
  if (falhas.length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS trava nos instantes do molde: 4 instantes por trecho em todo molde (rosto de frente, grade de 0,5 s, dentro do arquivo e da saída), padrão 20/40/60/80% intacto sem eles, passo comum por fps, pares nos instantes, saída curta e instantes inválidos tratados, regra igual (incerto não entrega), juiz por pessoa e instantes no evento recreate_invasor_trava; ${mortos}/${mutantes.length} mutantes mortos`)
