// KINEO-JUIZ-GRADE-1610 — guardião da GRADE DO JUIZ do "produto na mão" (Studio Ads v2, só contas internas): a calibração
// (POST /api/admin/ads-judge-calibrate) testa OUTROS MODELOS e OUTRA PERGUNTA sem publicar uma versão por tentativa. Roda com
// `node scripts/test-juiz-grade-1610.mjs`, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo typescript do repo e rodados com
// stubs (o arreio de scripts/test-ads-mao-juiz-1610.mjs; readFileSync, sem alias @/), com a visão e o BiRefNet falsos.
// Base: docs/RESULTADO-CALIBRA-JUIZ-2026-10-16.md (gpt-4o-mini: extra_person 0 de 2, 4 reprovações erradas por cor/forma, box_2d de molde).
//
// O que prova (1 seção por item):
//   G1 a lista permitida de modelos sai de lib/aiModels.ts (gpt-4o-mini, gpt-4o, gpt-4.1-mini, gpt-4.1); fora dela = erro de parse = 400 na rota;
//      `variant` só 'A' | 'B'; sem os dois = o juiz de produção;
//   G2 a variante B: a pergunta direta de pessoa extra (literal), SEM a frase "as mãos são da mesma pessoa", SEM box_2d (contagem e presença);
//   G3 a régua B: cor, forma ou material errados SOZINHOS = "não sei" (não reprova); 2+ atributos ou nome/logo errado reprova; a A não muda;
//   G4 o juiz executado na B (visão falsa): o modelo pedido nas 2 chamadas, a pergunta B, o crop "whole", a resposta crua marcada B;
//   G5 PRODUÇÃO INTOCADA: lib/ads/v2Advance.ts igual à base e chamando o juiz SEM modelo/variante; sem `judge` os corpos, o crop, a resposta crua e o
//      veredito são EXATAMENTE os da base 94d3463f4 (executado lado a lado); ADS_V2_IN_HAND_JUDGE_MODEL = AI_TEXT_MODELS.vision;
//   G6 a calibração executada passa o modelo e a variante, devolve os dois e, na B, faz 1 recorte BiRefNet por foto (não 1 por repetição);
//   G7 o recorte da B: a foto gerada INTEIRA sem fundo (BiRefNet), aparada no contorno, no branco — sem a caixa do modelo; a A segue igual;
//   G8 scripts/calibra-juiz-mao.mjs: --model/--variant no corpo, a pasta calibra-juiz/<model>-<variant>/, guardar pela combinação da resposta e
//      conferir vermelho com combinações misturadas;
//   D  desfaz exato + ida + marca + encadeamento (o desfaz do conserto do juiz e os de antes tiram esta camada primeiro) + diff só nos arquivos da lista;
//   M  mutantes (todos aplicados e vermelhos).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semJuizGrade1610, comJuizGrade1610, desfazJuizGrade1610, JUIZ_GRADE_1610_ARQUIVOS, JUIZ_GRADE_1610_NOVOS, JUIZ_GRADE_1610_BASE, MARCA_JUIZ_GRADE_1610 } from './test-support/desfaz-juiz-grade-1610.mjs'
import { semMaoJuiz1610, desfazMaoJuiz1610 } from './test-support/desfaz-ads-mao-juiz-1610.mjs'
import { desfazApresentadorV2_1710 } from './test-support/desfaz-apresentador-v2-1710.mjs' // reancorado KINEO-APRESENTADOR-V2-1710
import { desfazMaoAjuste3_1610 } from './test-support/desfaz-ads-mao-ajuste-3-1610.mjs'
import * as SCRIPT from './calibra-juiz-mao.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-JUIZ-GRADE-1610'
const rd = (p) => desfazApresentadorV2_1710(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return git('show', `${JUIZ_GRADE_1610_BASE}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-guardiao-sem-rede' // só para a visão passar da porta "sem chave": todo fetch aqui é falso

const F = {
  ih: 'lib/ads/v2ProductInHand.ts', vision: 'lib/ads/v2LockVision.ts', calib: 'lib/ads/v2JudgeCalibrate.ts', crop: 'lib/ads/v2ProductInHandCrop.ts',
  route: 'app/api/admin/ads-judge-calibrate/route.ts', advance: 'lib/ads/v2Advance.ts', models: 'lib/aiModels.ts', script: 'scripts/calibra-juiz-mao.mjs',
}

// ── carregador: transpila TS → CJS, resolve '@/' com stubs (o resto real, aiModels incluso); `over` = fonte mutante ou a da base ─────────
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const over = opts.over ?? {}
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const text = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && existsSync(join(ROOT, target))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
const CROP_STUBS = { '@fal-ai/client': { fal: {} }, '@/lib/userFootage': { footageAdminClient: () => { throw new Error('sem banco no guardião') } } }
const L = (over = {}) => makeLoader(CROP_STUBS, { over })
const AI = L()(F.models)
const H = L()(F.ih)
const VIS = L()(F.vision)
const CAL = L()(F.calib)
const CR = L()(F.crop)
const PNG = L()('lib/ads/v2Png.ts')

// ── a visão falsa: inventário (max_tokens 700) e fidelidade; cada corpo vai para o log ────────────────────────────────────
const resp = (content) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) })
const fake = (inv, fid, log) => async (_url, init) => { const b = JSON.parse(init.body); log.push(b); return resp(b.max_tokens === 700 ? inv : fid) }
const FID_OK = { name: 'yes', colors: 'yes', material: 'yes', shape: 'yes' }
const INV_B = (o = {}) => ({ bottle: 'no', bottle_count: 0, box: 'yes', box_count: 1, extra_person: 'no', hands: 'yes', ...o })
const INV_A = { products: [{ type: 'box', box_2d: [300, 400, 700, 600], visible: 'yes' }], people: [{ box_2d: [200, 300, 800, 600], visible: 'yes' }], hands: 'yes' }
const CROPS = { reference: 'https://sb/renders/ref-box.png', generated: 'data:image/png;base64,QUJD' }
const EXTRA = 'Besides the one person holding/using the product, is there ANY other person or part of another person anywhere in the image (background, window, reflection, edges)? yes/no/unsure'

// ═══ G1. a lista permitida e o parse ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nG1. modelos permitidos (lib/aiModels.ts) e variantes; fora da lista = 400')
const PROD = 'https://sb/user-footage/atheeri.jpg'
const IMG = [{ url: 'https://sb/renders/calib/foto-mao3-05.png', object: 'box', label: 'mao3-05' }]
const g1 = (C = CAL) => {
  const lista = [...C.ADS_V2_CALIBRATE_MODELS].sort().join(',')
  const p = (x) => C.adsV2CalibrateParse({ product_image_url: PROD, images: IMG, ...x })
  const d = p({})
  const b = p({ model: 'gpt-4o', variant: 'B' })
  const ruins = [{ model: 'gpt-5' }, { model: 'tts-1-hd' }, { model: 'gpt-4o-mini-tts' }, { model: 'whisper-1' }, { model: 'gpt-image-2' }, { model: 42 }, { model: '' }, { model: 'GPT-4O' }].map(p)
  const vr = [{ variant: 'C' }, { variant: 'b' }, { variant: 1 }, { variant: null }].map(p)
  return lista === 'gpt-4.1,gpt-4.1-mini,gpt-4o,gpt-4o-mini' && C.ADS_V2_CALIBRATE_MODELS[0] === AI.AI_TEXT_MODELS.vision && C.ADS_V2_CALIBRATE_MODELS.includes(AI.AI_TEXT_MODELS.writer) && C.ADS_V2_CALIBRATE_MODELS.includes(AI.AI_TEXT_MODELS.research) &&
    d.ok && d.input.model === AI.AI_TEXT_MODELS.vision && d.input.variant === 'A' && b.ok && b.input.model === 'gpt-4o' && b.input.variant === 'B' &&
    ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o-mini'].every((m) => p({ model: m }).ok) &&
    ruins.every((r) => !r.ok && /^model_must_be_one_of_/.test(r.error)) && vr.every((r) => !r.ok && r.error === 'variant_must_be_A_or_B')
}
await check('G1 executado: a lista = gpt-4o-mini (o juiz de hoje, 1º), gpt-4o, gpt-4.1-mini, gpt-4.1 — tirada de AI_TEXT_MODELS + OPENAI_SHUTDOWN_DATES; tts/whisper/imagem/desconhecido/maiúscula = model_must_be_one_of_…; variant fora de A|B = erro; sem os dois = o juiz de produção (A)', () => g1())
const RE_LITERAL = /(['"`])(?:openai\/)?(gpt-4o-mini-tts|gpt-4o-mini|gpt-4o|gpt-4\.1-mini|gpt-4\.1|tts-1-hd|tts-1|whisper-1)(?:-\d{4}-\d{2}-\d{2})?\1/
const g1b = (RT = rd(F.route), CS = rd(F.calib)) => {
  const iParse = RT.indexOf('const parsed = adsV2CalibrateParse('), iBad = RT.indexOf("if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })"), iRun = RT.indexOf('await adsV2CalibrateRun(parsed.input, fetch, crop)')
  return iParse > 0 && iBad > iParse && iRun > iBad && RT.split('adsV2CalibrateRun(').length === 2 && !RE_LITERAL.test(CS) && !RE_LITERAL.test(rd(F.vision)) && !RE_LITERAL.test(rd(F.ih)) &&
    /import \{ AI_TEXT_MODELS, OPENAI_SHUTDOWN_DATES \} from '@\/lib\/aiModels'/.test(CS)
}
await check('G1b a rota devolve 400 no erro de parse ANTES de rodar; nenhuma string crua de modelo nos arquivos de produto (a lista vem do registro central)', () => g1b())

// ═══ G2. a variante B: as perguntas ═════════════════════════════════════════════════════════════════════════════════════
console.log('\nG2. a variante B: pessoa extra direta, sem "mesma pessoa", sem box_2d')
const g2 = (M = H, V = VIS) => {
  const qB = M.ADS_V2_IN_HAND_INVENTORY_QUESTION_B
  const qA = M.ADS_V2_IN_HAND_INVENTORY_QUESTION
  const ib = V.adsV2InHandInventoryBodyFor('https://sb/g.png', { model: 'gpt-4o', variant: 'B' })
  const fb = V.adsV2InHandFidelityBodyFor('https://sb/r.png', 'https://sb/g.png', 'box', true, { model: 'gpt-4o', variant: 'B' })
  const fq = fb.messages[0].content[fb.messages[0].content.length - 1].text
  const tailA = M.adsV2InHandFidelityQuestion('box', true).slice(M.adsV2InHandFidelityQuestion('box', true).indexOf(' Answer each attribute'))
  return M.ADS_V2_IN_HAND_EXTRA_PERSON_QUESTION_B === EXTRA && qB.includes('"extra_person": ' + EXTRA) && !/box_2d/.test(qB) && !/belong to that same person/.test(qB) && !/\[ymin/.test(qB) &&
    /"bottle_count"/.test(qB) && /"box_count"/.test(qB) && /"bottle": is a bottle/.test(qB) && /"box": is a box/.test(qB) && /"hands"/.test(qB) &&
    /box_2d/.test(qA) && /belong to that same person/.test(qA) && // a A (produção) não muda
    ib.model === 'gpt-4o' && ib.temperature === 0 && ib.response_format.type === 'json_object' && ib.messages[0].content[0].image_url.detail === 'high' && ib.messages[0].content[1].text === qB && !JSON.stringify(ib).includes('box_2d') &&
    fb.model === 'gpt-4o' && fb.temperature === 0 && fq === M.adsV2InHandFidelityQuestionB('box', true) && /background removed: the person and the product they hold/.test(fq) && fq.endsWith(tailA) &&
    fb.messages[0].content[1].image_url.url === 'https://sb/r.png' && fb.messages[0].content[3].image_url.url === 'https://sb/g.png' &&
    M.adsV2InHandFidelityQuestionB('bottle', false) === M.adsV2InHandFidelityQuestion('bottle', false) && M.ADS_V2_IN_HAND_JUDGE_VARIANTS.join() === 'A,B'
}
await check('G2 a pergunta B traz LITERAL "' + EXTRA.slice(0, 60) + '…", não tem box_2d nem "belong to that same person", pede presença e contagem; o corpo B usa o modelo pedido, temperatura 0, "high", JSON; a fidelidade B diz que a foto gerada vem sem fundo e mantém os atributos da A; a pergunta A segue com box_2d', () => g2())

// ═══ G3. a régua B ══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG3. a régua B: um atributo errado sozinho = "não sei"; 2+ ou nome/logo = reprova')
const g3 = (M = H) => {
  const inv = M.adsV2ParseInHandInventoryB(INV_B())
  const v = (fid) => M.adsV2InHandTwoStageVerdictB(inv, { ...FID_OK, ...fid }, 'box', true)
  const cor = v({ colors: 'no' }), forma = v({ shape: 'no' }), mat = v({ material: 'no' }), nome = v({ name: 'no' }), dois = v({ colors: 'no', shape: 'no' }), limpo = v({})
  const a = M.adsV2InHandTwoStageVerdict(inv, { ...FID_OK, colors: 'no' }, 'box', true)
  const extra = M.adsV2InHandTwoStageVerdictB(M.adsV2ParseInHandInventoryB(INV_B({ extra_person: 'yes' })), FID_OK, 'box', true)
  const talvez = M.adsV2InHandTwoStageVerdictB(M.adsV2ParseInHandInventoryB(INV_B({ extra_person: 'unsure' })), FID_OK, 'box', true)
  const ambos = M.adsV2InHandTwoStageVerdictB(M.adsV2ParseInHandInventoryB(INV_B({ bottle: 'yes', bottle_count: 1 })), FID_OK, 'box', true)
  const doisFrascos = M.adsV2InHandTwoStageVerdictB(M.adsV2ParseInHandInventoryB(INV_B({ bottle: 'yes', bottle_count: 2, box: 'no', box_count: 0 })), FID_OK, 'bottle', true)
  const semFid = M.adsV2InHandTwoStageVerdictB(inv, null, 'box', false)
  return cor.ok && cor.fails.length === 0 && cor.unsure.includes('colors') && forma.ok && forma.unsure.includes('shape') && mat.ok && mat.unsure.includes('material') &&
    !nome.ok && nome.fails.join() === 'name' && !dois.ok && dois.fails.join() === 'colors,shape' && limpo.ok && limpo.crop === true &&
    !a.ok && a.fails.join() === 'colors' && // a A continua reprovando a cor sozinha
    !extra.ok && extra.fails.join() === 'extra_person' && talvez.ok && talvez.unsure.includes('person') && !ambos.ok && ambos.fails.join() === 'both_objects' && !doisFrascos.ok && doisFrascos.fails.join() === 'count' &&
    semFid.ok && semFid.unsure.includes('fidelity') && M.adsV2ParseInHandInventoryB({ bottle: 'no', box: 'yes' }) === null && M.adsV2ParseInHandInventoryB('lixo') === null &&
    M.adsV2ParseInHandInventoryB(INV_B({ extra_person: true })).people.length === 2 && M.adsV2ParseInHandInventoryB(INV_B()).products.every((p) => p.box === null)
}
await check('G3 B: cor, forma ou material errados sozinhos passam com "não sei"; nome/logo errado ou 2 atributos reprovam; pessoa extra "yes" reprova, "unsure" só registra; frasco E caixa e objeto em dobro reprovam pela contagem/presença; resposta sem extra_person = ilegível; a A não muda (cor sozinha reprova)', () => g3())

// ═══ G4. o juiz executado na B ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG4. o juiz executado na B (visão falsa)')
const g4 = async (V = VIS, M = H) => {
  const log = [], cropArgs = []
  let cru = null
  const crop = async (a) => { cropArgs.push(a); return CROPS }
  const r = await V.adsV2InHandLabelJudge(PROD, 'https://sb/renders/g.jpg', fake(INV_B(), { ...FID_OK, colors: 'no' }, log), 'box', (x) => { cru = x }, crop, { model: 'gpt-4.1', variant: 'B' })
  const log2 = []
  const r2 = await V.adsV2InHandLabelJudge(PROD, 'https://sb/renders/g.jpg', fake(INV_B({ extra_person: 'yes' }), FID_OK, log2), 'box', undefined, crop, { model: 'gpt-4o', variant: 'B' })
  const [inv, fid] = log
  return r && r.ok === true && r.unsure.includes('colors') && r.crop === true && log.length === 2 && inv.model === 'gpt-4.1' && fid.model === 'gpt-4.1' && inv.messages[0].content[1].text === M.ADS_V2_IN_HAND_INVENTORY_QUESTION_B &&
    !JSON.stringify(inv).includes('box_2d') && cropArgs[0].whole === true && cropArgs[0].objectBox === null && cropArgs[0].object === 'box' && cropArgs[0].sceneUrl === 'https://sb/renders/g.jpg' &&
    fid.messages[0].content[1].image_url.url === CROPS.reference && fid.messages[0].content[3].image_url.url === CROPS.generated && fid.messages[0].content[4].text === M.adsV2InHandFidelityQuestionB('box', true) &&
    cru && cru.variant === 'B' && cru.crop === true && r2 && !r2.ok && r2.fails.join() === 'extra_person' && log2.every((b) => b.model === 'gpt-4o')
}
await check('G4 executado: B com gpt-4.1 → o inventário e a fidelidade vão no gpt-4.1, a pergunta B, sem box_2d; o crop pede a foto INTEIRA (whole, sem caixa); cor sozinha passa com "não sei"; pessoa extra "yes" reprova; a resposta crua vem marcada B', () => g4())

// ═══ G5. produção intocada ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG5. produção intocada: o avanço segue no modelo de sempre e na variante A')
const VIS_BASE = L({ [F.vision]: base(F.vision) })(F.vision) // o juiz da base 94d3463f4 (a lib do produto na mão viva: só ganhou funções no fim)
const g5 = async (V = VIS, ADV = rd(F.advance)) => {
  const roda = async (Vx, judgeOpts) => {
    const log = [], cropArgs = []
    let cru = null
    const crop = async (a) => { cropArgs.push(a); return CROPS }
    const args = [PROD, 'https://sb/renders/g.png', fake(INV_A, { ...FID_OK, colors: 'no' }, log), 'box', (x) => { cru = x }, crop]
    const v = await (judgeOpts === undefined ? Vx.adsV2InHandLabelJudge(...args) : Vx.adsV2InHandLabelJudge(...args, judgeOpts))
    return JSON.stringify({ v, log, cropArgs, cru })
  }
  const vivo = await roda(V)
  const velho = await roda(VIS_BASE)
  const vazio = await roda(V, {})
  const chamada = ADV.match(/v\.adsV2InHandLabelJudge\(([^)]*)\)/g) || []
  return vivo === velho && vazio === velho && JSON.parse(vivo).log[0].model === AI.AI_TEXT_MODELS.vision && JSON.parse(vivo).v.fails.join() === 'colors' && !('whole' in JSON.parse(vivo).cropArgs[0]) && !('variant' in JSON.parse(vivo).cru) &&
    V.ADS_V2_IN_HAND_JUDGE_MODEL === AI.AI_TEXT_MODELS.vision && /export const ADS_V2_IN_HAND_JUDGE_MODEL: string = AI_TEXT_MODELS\.vision /.test(rd(F.vision)) &&
    JSON.stringify(V.adsV2InHandInventoryBodyFor('https://x/g.png')) === JSON.stringify(V.adsV2InHandInventoryBody('https://x/g.png')) &&
    JSON.stringify(V.adsV2InHandFidelityBodyFor('https://x/r.png', 'https://x/g.png', 'bottle', true)) === JSON.stringify(V.adsV2InHandFidelityBody('https://x/r.png', 'https://x/g.png', 'bottle', true)) &&
    ADV === base(F.advance) && chamada.length === 1 && chamada[0] === 'v.adsV2InHandLabelJudge(productUrl, stored, undefined, tag?.object ?? null, undefined, cropFn)' && !/variant|judgeModel|ADS_V2_CALIBRATE/.test(ADV.split('\n').filter((l) => l.includes('adsV2InHandLabelJudge')).join('\n'))
}
await check('G5 executado lado a lado: sem `judge` (e com `{}`) os corpos, o crop, a resposta crua e o veredito são EXATAMENTE os da base 94d3463f4 (modelo do registro, variante A, cor sozinha reprova); lib/ads/v2Advance.ts é byte a byte a base e chama o juiz com 6 argumentos (sem modelo/variante); ADS_V2_IN_HAND_JUDGE_MODEL = AI_TEXT_MODELS.vision', () => g5())

// ═══ G6. a calibração executada ═════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG6. a calibração passa o modelo e a variante; na B, 1 recorte por foto')
const g6 = async (C = CAL) => {
  const fotos = [{ url: 'https://sb/renders/calib/foto-mao3-05.png', object: 'box', label: 'mao3-05' }, { url: 'https://sb/renders/calib/foto-mao3-02.png', object: 'bottle', label: 'mao3-02' }]
  const runB = async () => {
    const log = [], cropArgs = []
    const crop = async (a) => { cropArgs.push(a); return CROPS }
    const p = C.adsV2CalibrateParse({ product_image_url: PROD, images: fotos, model: 'gpt-4.1', variant: 'B' })
    const out = await C.adsV2CalibrateRun(p.input, async (u, init) => { const b = JSON.parse(init.body); log.push(b); const img = b.max_tokens === 700 ? b.messages[0].content[0].image_url.url : ''; return resp(b.max_tokens === 700 ? INV_B(/mao3-05/.test(img) ? { extra_person: 'yes' } : { bottle: 'yes', bottle_count: 1, box: 'no', box_count: 0 }) : FID_OK) }, crop)
    return { out, log, cropArgs }
  }
  const { out, log, cropArgs } = await runB()
  const r5 = out.results.find((x) => x.label === 'mao3-05'), r2 = out.results.find((x) => x.label === 'mao3-02')
  const aLog = [], aCrop = []
  const outA = await C.adsV2CalibrateRun(C.adsV2CalibrateParse({ product_image_url: PROD, images: fotos }).input, fake(INV_A, FID_OK, aLog), async (a) => { aCrop.push(a); return null })
  return out.model === 'gpt-4.1' && out.variant === 'B' && out.usd === 0.14 && log.length === 12 && log.every((b) => b.model === 'gpt-4.1') && cropArgs.length === 2 && cropArgs.every((a) => a.whole === true) &&
    r5.verdict.fails.join() === 'extra_person' && r5.answers.extra_person === true && r5.answers.people === 2 && r5.stable && r5.runs.length === 3 && r5.runs[0].inventory.people.length === 2 &&
    r2.verdict.ok && r2.answers.extra_person === false && r2.answers.people === 1 && r2.answers.products.join() === 'bottle:yes' &&
    outA.model === AI.AI_TEXT_MODELS.vision && outA.variant === 'A' && outA.usd === 0.12 && aLog.every((b) => b.model === AI.AI_TEXT_MODELS.vision) && aCrop.length === 6 && aCrop.every((a) => !('whole' in a))
}
await check('G6 executado (2 fotos × 3): B no gpt-4.1 → as 12 chamadas no gpt-4.1, resposta { model: "gpt-4.1", variant: "B" }, 1 recorte inteiro por foto (2, não 6), US$ 0,14 (+1 recorte por foto); a 05 reprova em extra_person (people 2); sem model/variant = o juiz de produção (A, 6 crops com caixa, US$ 0,12)', () => g6())

// ═══ G7. o recorte inteiro ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG7. o recorte da B: a foto gerada inteira sem fundo (BiRefNet), sem a caixa do modelo')
// o recorte SEM fundo de uma foto gerada 200×100: a pessoa + o produto (vermelho) entre x 40–120, y 10–90; o resto transparente
const semFundo = () => { const W = 200, Hh = 100, d = new Uint8Array(W * Hh * 4); for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; if (x >= 40 && x < 120 && y >= 10 && y < 90) { d[o] = 220; d[o + 3] = 255 } } return { width: W, height: Hh, data: d } }
const depsG7 = (log, over = {}) => {
  const store = new Map()
  return {
    download: async (u) => { log.push('download:' + u); if (store.has(u)) return store.get(u); if (u === 'https://fal/cut-cena.png') return PNG.encodePng(semFundo(), { alpha: true }); if (u === 'https://fal/cut-prod.png') return PNG.encodePng(semFundo(), { alpha: true }); return null },
    upload: async (p, png) => { log.push('upload:' + p); store.set('https://sb/' + p, png); return 'https://sb/' + p },
    publicUrl: (p) => 'https://sb/' + p,
    cutout: async (u) => { log.push('cutout:' + u); return /produto/.test(u) ? 'https://fal/cut-prod.png' : 'https://fal/cut-cena.png' },
    inventory: async () => ({ products: [{ type: 'box', box: [0, 0, 1000, 1000], visible: 'yes' }], people: [], hands: 'unsure' }),
    ...over,
  }
}
const g7 = async (C = CR) => {
  const log = []
  const g = await C.adsV2InHandSceneCutout('https://sb/renders/cena.jpg', depsG7(log))
  const img = g ? PNG.decodePng(new Uint8Array(Buffer.from(g.slice(g.indexOf(',') + 1), 'base64'))) : null
  let red = 0
  if (img) for (let i = 0; i < img.data.length; i += 4) if (img.data[i] > 200 && img.data[i + 1] < 50) red++
  const nada = await C.adsV2InHandSceneCutout('https://sb/renders/cena.jpg', depsG7([], { cutout: async () => null }))
  const fn = C.adsV2InHandCropper({ userId: 'u1', cacheKey: 'calib-x', productUrl: 'https://x/produto.jpg' }, depsG7([]))
  const inteiro = await fn({ sceneUrl: 'https://sb/renders/cena.jpg', objectBox: null, object: 'box', whole: true })
  const semCaixaA = await fn({ sceneUrl: 'https://sb/renders/cena.jpg', objectBox: null, object: 'box' })
  return typeof g === 'string' && g.startsWith('data:image/png;base64,') && img.width === 80 && img.height === 80 && red === 80 * 80 && log.includes('cutout:https://sb/renders/cena.jpg') &&
    nada === null && inteiro && inteiro.generated.startsWith('data:image/png;base64,') && /-box\.png$/.test(inteiro.reference) && semCaixaA === null
}
await check('G7 executado: a foto gerada (até JPEG) vai inteira ao BiRefNet e volta aparada no contorno (80×80, só o primeiro plano), PNG no branco; sem recorte = null; o crop "whole" devolve a referência + esse recorte SEM caixa; sem whole e sem caixa = null (a A de sempre)', () => g7())

// ═══ G8. o script de calibração ════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG8. scripts/calibra-juiz-mao.mjs: --model/--variant, a pasta por combinação, guardar, conferir')
const g8 = (S = SCRIPT) => {
  const fotos = [{ id: 'mao3-05', url: 'https://x/5.png' }]
  const sem = S.corpo('https://x/p.jpg', fotos)
  const com = S.corpo('https://x/p.jpg', fotos, 3, { model: 'gpt-4o', variant: 'B' })
  const lanca = (fn) => { try { fn(); return false } catch { return true } }
  const R = 'C:\\raiz'
  const resp5 = (model, variant) => ({ model, ...(variant ? { variant } : {}), results: [{ label: 'mao3-05', verdict: { ok: false, fails: ['extra_person'] }, answers: { extra_person: true }, stable: true }] })
  const mistura = S.conferir([resp5('gpt-4o', 'B'), resp5('gpt-4o-mini', 'A')])
  const igual = S.conferir([resp5('gpt-4o', 'B'), resp5('gpt-4o', 'B')])
  return !('model' in sem) && !('variant' in sem) && com.model === 'gpt-4o' && com.variant === 'B' && com.images[0].object === 'box' && com.images[0].label === 'mao3-05' &&
    S.MODELO_PADRAO === AI.AI_TEXT_MODELS.vision && S.VARIANTES.join() === 'A,B' && S.combo('gpt-4.1-mini', 'B') === 'gpt-4.1-mini-B' &&
    S.pastaCombo(R, 'gpt-4o', 'B') === join(R, 'calibra-juiz', 'gpt-4o-B') && lanca(() => S.combo('../x', 'A')) && lanca(() => S.combo('gpt-4o', 'C')) &&
    S.destinoResposta(R, resp5('gpt-4o', 'B')) === join(R, 'calibra-juiz', 'gpt-4o-B', 'resp-mao3-05.json') && S.destinoResposta(R, resp5('gpt-4o-mini')) === join(R, 'calibra-juiz', 'gpt-4o-mini-A', 'resp-mao3-05.json') &&
    lanca(() => S.destinoResposta(R, resp5('gpt-4o', 'B'), { model: 'gpt-4.1' })) && lanca(() => S.destinoResposta(R, resp5('gpt-4o', 'B'), { variant: 'A' })) && lanca(() => S.destinoResposta(R, { results: [] })) &&
    mistura.ok === false && mistura.combos.length === 2 && /^ERRO combinações misturadas/.test(mistura.linhas[0]) && igual.combos.join() === 'gpt-4o-B' && !igual.linhas.some((l) => /misturadas/.test(l)) &&
    S.conferir([{ results: [] }]).combos.length === 0
}
await check('G8 o corpo leva model/variant só quando pedido; MODELO_PADRAO = AI_TEXT_MODELS.vision; a pasta é <raiz>\\calibra-juiz\\<model>-<variant>\\; guardar usa a combinação da PRÓPRIA resposta (sem variant = A) e recusa flag que não bate; conferir com combinações misturadas = vermelho', () => g8())
const g8b = (src = rd(F.script)) => /if \(cmd === 'guardar'\) \{/.test(src) && /pastaCombo\(arg\('--raiz', RAIZ\), arg\('--model'\), arg\('--variant', 'A'\)\)/.test(src) && /const juiz = \{ model: arg\('--model', MODELO_PADRAO\), variant: arg\('--variant', 'A'\) \}/.test(src) &&
  /corpo\(productUrl, \[\{ id, url: dataUrl\(png \?\? file\) \}\], repeat, juiz\)/.test(src) && /join\(pastaCombo\(raiz, juiz\.model, juiz\.variant\), 'corpos'\)/.test(src)
await check('G8b o comando: corpos --model/--variant grava em <combinação>\\corpos com model e variant no corpo; guardar existe; conferir --model/--variant lê a pasta da combinação', () => g8b())

// ═══ D. desfaz, marca, encadeamento ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, diff só nos arquivos da lista')
await check('D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-juiz-grade-1610.mjs), é EXATAMENTE a origin/main 94d3463f4; a ida devolve o vivo; os novos existem e não existiam', () =>
  JUIZ_GRADE_1610_ARQUIVOS.length === 8 && JUIZ_GRADE_1610_ARQUIVOS.every((f) => base(f) !== null && semJuizGrade1610(f, rd(f)) === base(f) && comJuizGrade1610(f, base(f)) === rd(f) && !semJuizGrade1610(f, rd(f)).includes(MARCA)) &&
  MARCA_JUIZ_GRADE_1610 === MARCA && JUIZ_GRADE_1610_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('D2 todo bloco do desfaz traz a marca; toda linha nova de lib/ e app/ traz a marca; o diff contra a base só toca os arquivos da lista e os novos (v2Advance, cobrança, motor, /start fora)', () => {
  const src = rd('scripts/test-support/desfaz-juiz-grade-1610.mjs')
  const D = JSON.parse(src.split('\n').find((l) => l.startsWith('const DESFAZ = ')).slice('const DESFAZ = '.length))
  const blocos = Object.values(D).flat()
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  const TOPO = shas[0] || 'HEAD'
  const tocados = git('diff', '--name-only', JUIZ_GRADE_1610_BASE, TOPO).trim().split('\n').filter(Boolean).concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean))
  const permitidos = new Set([...JUIZ_GRADE_1610_ARQUIVOS, ...JUIZ_GRADE_1610_NOVOS])
  const novas = JUIZ_GRADE_1610_ARQUIVOS.filter((f) => /^(lib|app)\//.test(f)).flatMap((f) => { const b = new Set(base(f).split('\n')); return rd(f).split('\n').filter((l) => l.trim() && !b.has(l)) })
  return blocos.length > 0 && blocos.every((h) => h.now.join('\n').includes(MARCA)) && tocados.length > 0 && tocados.every((f) => permitidos.has(f)) && novas.length > 50 && novas.every((l) => l.includes(MARCA)) &&
    ['lib/ads/v2Advance.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/aiModels.ts', 'app/api/ads/v2/start/route.ts', 'lib/ads/v2ShotLists.ts'].every((f) => !tocados.includes(f))
})
await check('D3 encadeamento: o desfaz do conserto do juiz (e, por ele, a 3ª rodada) tira esta camada PRIMEIRO; texto sem a marca, arquivo fora da lista e null passam igual', () => {
  return JUIZ_GRADE_1610_ARQUIVOS.every((f) => {
    const vivo = rd(f)
    const semEste = semJuizGrade1610(f, vivo)
    return semMaoJuiz1610(f, vivo) === semMaoJuiz1610(f, semEste) && desfazMaoJuiz1610(f, vivo) === desfazMaoJuiz1610(f, semEste) && desfazMaoAjuste3_1610(f, vivo) === desfazMaoAjuste3_1610(f, semEste) && desfazJuizGrade1610(f, base(f)) === base(f)
  }) && desfazJuizGrade1610(F.advance, rd(F.advance)) === rd(F.advance) && desfazJuizGrade1610(F.vision, null) === null && /^\/\/ reancorado KINEO-JUIZ-GRADE-1610|reancorado KINEO-JUIZ-GRADE-1610/.test(rd('scripts/test-ads-mao-juiz-1610.mjs'))
})

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const SRC = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, rd(f)]))
const comV = (a, b) => L({ [F.vision]: trocar(SRC.vision, a, b) })
const comIH = (a, b) => L({ [F.ih]: trocar(SRC.ih, a, b) })
const comCal = (a, b) => L({ [F.calib]: trocar(SRC.calib, a, b) })
const comCrop = (a, b) => L({ [F.crop]: trocar(SRC.crop, a, b) })
const scriptCom = async (a, b) => import('data:text/javascript,' + encodeURIComponent(trocar(SRC.script, a, b)))
const mut = async (m, fn) => { let vermelho = false; try { vermelho = !(await fn()) } catch (e) { vermelho = !/mutante (não aplicou|sem efeito)/.test(String(e && e.message)) } ok(vermelho, 'mutante vermelho: ' + m) }
await mut('a calibração aceita qualquer modelo', () => g1(comCal('!ADS_V2_CALIBRATE_MODELS.includes(model)', 'false')(F.calib)))
await mut('a lista ganha os modelos de voz (tts)', () => g1(comCal("!/-tts$/.test(m)", 'true')(F.calib)))
await mut('a calibração aceita qualquer variante', () => g1(comCal("if (variant !== 'A' && variant !== 'B') return", 'if (false) return')(F.calib)))
await mut('a rota roda antes do 400 do parse', () => g1b(trocar(SRC.route, "    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })\n", '')))
await mut('a pergunta B perde a pessoa extra da pesquisa', () => g2(comIH(`"extra_person": ' + ADS_V2_IN_HAND_EXTRA_PERSON_QUESTION_B + '.`, `"extra_person": is there another person? Answer "yes", "no" or "unsure".`)(F.ih)))
await mut('a pergunta B volta a pedir box_2d', () => g2(comIH('Image 1 is a photo. Look at the whole frame.', 'Image 1 is a photo. Look at the whole frame. Give "box_2d" as [ymin, xmin, ymax, xmax] for each item.')(F.ih)))
await mut('a pergunta B junta as mãos à mesma pessoa', () => g2(comIH('nothing passing through the product? Answer "yes", "no" or "unsure". Answer only with JSON: {"bottle"', 'nothing passing through the product? The hands of the person holding the product belong to that same person. Answer "yes", "no" or "unsure". Answer only with JSON: {"bottle"')(F.ih)))
await mut('B: a cor sozinha reprova', () => g3(comIH("no.includes('name') || no.length >= 2", 'no.length >= 1')(F.ih)))
await mut('B: nome/logo errado sozinho não reprova', () => g3(comIH("no.includes('name') || no.length >= 2", 'no.length >= 2')(F.ih)))
await mut('B: pessoa extra "unsure" reprova', () => g3(comIH("extra === 'unsure' ? [{ box: null, visible: 'unsure' as const }]", "extra === 'unsure' ? [{ box: null, visible: 'yes' as const }]")(F.ih)))
await mut('o juiz lê a resposta B com a leitura A', () => g4(comV('jv.variant === \'B\' ? adsV2ParseInHandInventoryB(invRaw) : adsV2ParseInHandInventory(invRaw)', 'adsV2ParseInHandInventory(invRaw)')(F.vision)))
await mut('o corpo B ignora o modelo pedido', () => g4(comV('return { ...b, model: j.model, messages: [{ role: \'user\', content: [{ type: \'image_url\'', 'return { ...b, messages: [{ role: \'user\', content: [{ type: \'image_url\'')(F.vision)))
await mut('o juiz B usa a caixa do modelo (sem whole)', () => g4(comV("...(jv.variant === 'B' ? { whole: true } : {})", '...({})')(F.vision)))
await mut('o juiz B usa a régua da A', () => g4(comV("(jv.variant === 'B' ? adsV2InHandTwoStageVerdictB : adsV2InHandTwoStageVerdict)", '(adsV2InHandTwoStageVerdict)')(F.vision)))
await mut('PRODUÇÃO: sem judge vira a variante B', () => g5(comV("variant: judge?.variant === 'B' ? 'B' : 'A' }", "variant: judge?.variant === 'A' ? 'A' : 'B' }")(F.vision)))
await mut('PRODUÇÃO: o modelo do juiz troca', () => g5(comV('export const ADS_V2_IN_HAND_JUDGE_MODEL: string = AI_TEXT_MODELS.vision', 'export const ADS_V2_IN_HAND_JUDGE_MODEL: string = AI_TEXT_MODELS.writer')(F.vision)))
await mut('PRODUÇÃO: a resposta crua da A ganha variant', () => g5(comV("const vB = jv.variant === 'B' ? { variant: 'B' as const } : {}", "const vB = { variant: jv.variant }")(F.vision)))
await mut('PRODUÇÃO: o avanço passa variante ao juiz', () => g5(VIS, trocar(SRC.advance, 'tag?.object ?? null, undefined, cropFn)', "tag?.object ?? null, undefined, cropFn, { variant: 'B' })")))
await mut('a calibração não passa o modelo/variante ao juiz', () => g6(comCal('(r) => { raw = r }, cropFor, judge)', '(r) => { raw = r }, cropFor)')(F.calib)))
await mut('a calibração B recorta a cada repetição', () => g6(comCal("crop && judge.variant === 'B' ? (a) =>", 'false ? (a) =>')(F.calib)))
await mut('a calibração devolve o modelo de produção', () => g6(comCal('return { model: judge.model, variant: judge.variant,', 'return { model: ADS_V2_IN_HAND_JUDGE_MODEL, variant: judge.variant,')(F.calib)))
await mut('o crop ignora whole (volta à caixa)', () => g7(comCrop('    if (whole) {', '    if (false) {')(F.crop)))
await mut('o recorte inteiro não apara o contorno', () => g7(comCrop('adsV2FitMaxSide(adsV2FlattenWhite(cropRgba(img, a)), ADS_V2_IN_HAND_CROP_MAX_SIDE), { alpha: false }) // KINEO-JUIZ-GRADE-1610', 'adsV2FitMaxSide(adsV2FlattenWhite(img), ADS_V2_IN_HAND_CROP_MAX_SIDE), { alpha: false }) // KINEO-JUIZ-GRADE-1610')(F.crop)))
await mut('o script não põe model/variant no corpo', async () => g8(await scriptCom('...(juiz ? { model: juiz.model, variant: juiz.variant } : {})', '...({})')))
await mut('conferir aceita combinações misturadas', async () => g8(await scriptCom('if (combos.length > 1) {', 'if (false) {')))
await mut('guardar aceita flag que não bate', async () => g8(await scriptCom("if ((flags.model && flags.model !== resposta.model) || (flags.variant && flags.variant !== (resposta.variant ?? 'A'))) throw", 'if (false) throw')))
await mut('o desfaz do conserto do juiz não tira esta camada primeiro', async () => {
  const p = join(ROOT, 'scripts/test-support/desfaz-ads-mao-juiz-1610.mjs')
  const src = trocar(trocar(readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), "from './desfaz-juiz-grade-1610.mjs'", `from '${pathToFileURL(join(ROOT, 'scripts/test-support/desfaz-juiz-grade-1610.mjs')).href}'`), "  let s = desfazJuizGrade1610(rel, String(text)) //", "  let s = String(text).replace(/\\r\\n/g, '\\n') //")
  const M2 = await import('data:text/javascript,' + encodeURIComponent(src))
  return JUIZ_GRADE_1610_ARQUIVOS.every((f) => { try { return M2.semMaoJuiz1610(f, rd(f)) === M2.semMaoJuiz1610(f, semJuizGrade1610(f, rd(f))) } catch { return false } })
})
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
