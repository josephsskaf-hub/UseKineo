// KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 — guardião do texto do pedido do Recreate "com o seu vídeo" no Kling (lib/recreate/textoDoPedido.ts +
// o /check). Prova, EXECUTANDO com quadro e visão falsos: (1) o texto sai no molde que trocou 4 de 4 ("Replace {descrição} in @Video1 with the
// {man|woman} from @Image1: {his|her} face and hair match @Image1. Keep …") e passa no validarPrompt da rota de gerar; (2) o gênero da tela
// GANHA da visão; (3) sem gênero para toda foto, sem visão ou com a visão recusando = o texto de hoje (promptKling4), byte a byte; (4) sem foto
// e sem gênero, nada é gasto (nem quadro, nem visão); (5) descrição com identidade/idade/etnia/corpo cai; (6) custo somado; (7) o /check
// usa a montagem, só fotos da própria conta e grava o evento com o custo. Mutantes. Rodar: node scripts/test-recreate-texto-do-pedido-1311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const TXT = 'lib/recreate/textoDoPedido.ts', SV = 'lib/recreate/seuVideo.ts', CHECK = 'app/api/recreate/seu-video/check/route.ts'
function carregar(over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }; cache.set(rel, mod)
    const js = ts.transpileModule(over[rel] ?? lf(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', js)((id) => {
      if (id === '@/lib/checkoutPricing') return { recreateCreditCost: (s) => (s <= 10 ? 40 : 60) }
      if (id.startsWith('.')) return load(path.posix.join(path.posix.dirname(rel), id) + '.ts')
      throw new Error('import inesperado: ' + id)
    }, mod, mod.exports)
    return mod.exports
  }
  return { T: load(TXT), S: load(SV) }
}
const FOTO = 'https://x.supabase.co/storage/v1/object/public/renders/avatars/u1/face-1.jpg'
const resposta = (obj) => ({ choices: [{ message: { content: JSON.stringify(obj) } }] })
function io(o = {}) {
  const s = { quadros: 0, visoes: 0, mensagens: null }
  return { s, io: {
    quadro: async () => { s.quadros++; return o.semQuadro ? null : { url: 'https://fal.media/q.jpg', usd: 0.001 } },
    visao: async (m) => { s.visoes++; s.mensagens = m; if (o.visaoFalha) return null; return { data: o.data ?? resposta({ video_people: [{ person: 1, description: 'the dancer in the dark blue shirt' }], photos: [{ photo: 1, presents_as: 'man' }] }), usd: 0.0009 } },
  } }
}

async function bateria(over = {}) {
  const { T, S } = carregar(over)
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const hoje = S.promptKling4(1, [])
  await check('molde que trocou 4 de 4, válido na rota de gerar', async () => {
    const { s, io: x } = io()
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [FOTO], generosDaTela: [], posicoes: [] })
    if (!r.prompt.startsWith('Replace the dancer in the dark blue shirt in @Video1 with the man from @Image1: his face and hair match @Image1. Keep ')) throw new Error(r.prompt)
    if (r.fonte !== 'visao' || r.visao !== 'ok') throw new Error(r.fonte + ' ' + r.visao)
    if (Math.abs(r.usd - 0.0019) > 1e-9) throw new Error('custo ' + r.usd)
    if (!S.validarPrompt(r.prompt, 1).ok) throw new Error('a rota de gerar recusaria')
    if (s.quadros !== 1 || s.visoes !== 1) throw new Error('chamadas ' + s.quadros + '/' + s.visoes)
  })
  await check('gênero da tela ganha da visão (woman → her)', async () => {
    const { io: x } = io()
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [FOTO], generosDaTela: ['woman'], posicoes: [] })
    if (!/with the woman from @Image1: her face and hair match @Image1/.test(r.prompt) || r.fonte !== 'tela_e_visao') throw new Error(r.fonte + ' ' + r.prompt)
  })
  await check('sem visão/sem quadro/recusa/unclear = o texto de hoje', async () => {
    for (const o of [{ visaoFalha: true }, { semQuadro: true }, { data: { choices: [{ message: { refusal: 'no' } }] } }, { data: resposta({ video_people: [], photos: [{ photo: 1, presents_as: 'unclear' }] }) }]) {
      const { io: x } = io(o)
      const r = await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [FOTO], generosDaTela: [], posicoes: [] })
      if (r.prompt !== hoje || r.fonte !== 'padrao') throw new Error(JSON.stringify(o) + ' → ' + r.fonte)
    }
  })
  await check('só gênero da tela, visão fora: texto com gênero e a ordem de hoje', async () => {
    const { io: x } = io({ visaoFalha: true })
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [], generosDaTela: ['man'], posicoes: [] })
    if (!r.prompt.startsWith('Replace the main person in @Video1 with the man from @Image1: his face') || r.fonte !== 'tela') throw new Error(r.fonte + ' ' + r.prompt)
  })
  await check('sem foto e sem gênero: nada gasto', async () => {
    const { s, io: x } = io()
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [], generosDaTela: [], posicoes: [] })
    if (r.prompt !== hoje || s.quadros || s.visoes || r.usd !== 0) throw new Error('gastou')
  })
  await check('descrição com identidade/idade/etnia/corpo cai', async () => {
    for (const d of ['the young man in red', 'the asian dancer', 'the famous singer on stage', 'the 30 year woman', 'the thin person in jeans', 'the dancer named Ana']) if (T.descricaoLimpa(d) !== null) throw new Error(d)
    if (T.descricaoLimpa('dancer in the gold jacket') !== 'the dancer in the gold jacket') throw new Error('recusou roupa')
    if (T.descricaoLimpa('the person on the left wearing a long black coat today') !== null) throw new Error('passou de 8 palavras')
  })
  await check('3 pessoas: todas com gênero, ou o texto de hoje', async () => {
    const { io: x } = io({ data: resposta({ video_people: [{ person: 1, description: 'the person on the left in white' }], photos: [{ photo: 1, presents_as: 'man' }, { photo: 2, presents_as: 'woman' }] }) })
    const r = await T.montarTextoDoPedido(x, { pessoas: 2, fotos: [FOTO, FOTO], generosDaTela: [], posicoes: [] })
    if (!r.prompt.startsWith('Replace the person on the left in white in @Video1 with the man from @Image1: his face and hair match @Image1. Replace the second person in @Video1 with the woman from @Image2: her face and hair match @Image2. Keep ')) throw new Error(r.prompt)
    if (!S.validarPrompt(r.prompt, 2).ok) throw new Error('rota de gerar recusaria')
    const { io: y } = io({ data: resposta({ video_people: [], photos: [{ photo: 1, presents_as: 'man' }] }) })
    const r2 = await T.montarTextoDoPedido(y, { pessoas: 2, fotos: [FOTO, FOTO], generosDaTela: [], posicoes: [] })
    if (r2.prompt !== S.promptKling4(2, []) || r2.fonte !== 'padrao') throw new Error('meio gênero não caiu: ' + r2.prompt)
  })
  await check('sem descrição = byte a byte o texto da tela (promptPorGenero do GPT)', async () => {
    for (const [gs, pos] of [[['man'], []], [['woman'], ['on the left']], [['man', 'woman'], []], [['woman', 'man', 'woman'], ['on the left', '', 'on the right']]]) {
      const { io: x } = io({ visaoFalha: true })
      const r = await T.montarTextoDoPedido(x, { pessoas: gs.length, fotos: [], generosDaTela: gs, posicoes: pos })
      if (r.prompt !== S.promptPorGenero(gs, pos)) throw new Error('difere da tela: ' + r.prompt)
    }
  })
  await check('a visão é proibida de identificar', async () => {
    const { s, io: x } = io()
    await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [FOTO], generosDaTela: [], posicoes: [] })
    const sys = s.mensagens[0].content
    if (!/Never identify anyone/.test(sys) || !/never mention age, ethnicity, skin/.test(sys) || !/ONLY by visible clothing and position/.test(sys)) throw new Error('sistema')
  })
  const c = (over[CHECK] ?? lf(CHECK)).replace(/\/\/[^\n]*/g, '')
  await check('o /check monta o texto, só fotos da conta, evento com custo', async () => {
    if (!/SEU_VIDEO_MOTOR === 'kling4' \? await montarTextoDoPedido\(ioDoTextoReal\(v\.url, v\.meta\)/.test(c)) throw new Error('sem montagem')
    if (!/ownedClipImageUrl\(u, user\.id, supabaseUrl\)/.test(c)) throw new Error('foto de fora entra na visão')
    if (!c.includes('prompt: genders ? promptPorGenero(genders as SeuVideoGender[], positions) : promptDoSeuVideo(SEU_VIDEO_MOTOR, people, positions), engine: SEU_VIDEO_MOTOR')) throw new Error('o texto da tela (GPT) não é mais a base')
    if (!c.includes("const visaoAcrescenta = !!texto && texto.fonte !== 'padrao' && (texto.descricoes.some(Boolean) || !genders)") || !c.includes('if (visaoAcrescenta && texto) body.prompt = texto.prompt')) throw new Error('a visão troca o texto sem acrescentar')
    if (!/generosDaTela: \(genders as SeuVideoGender\[\] \| undefined\) \?\? \[\]/.test(c)) throw new Error('a escolha da tela não chega à montagem')
    if (!/name: TEXTO_DO_PEDIDO_EVENTO[^\n]*usd: texto\.usd/.test(c)) throw new Error('evento sem custo')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const t = lf(TXT), ch = lf(CHECK)
const mutantes = [
  ['visão ganha da tela', { [TXT]: t.replace('daTela[i] ?? daVisao[i] ?? null', 'daVisao[i] ?? daTela[i] ?? null') }],
  ['texto neutro mesmo com gênero', { [TXT]: t.replace("' in @Video1 with the ' + gs[i] + ' from @Image'", "' in @Video1 with the person from @Image'") }],
  ['descrição fora do molde da tela', { [TXT]: t.replace("' face and hair match @Image' + (i + 1) + '.'", "' face and hair match @Image' + (i + 1) + '!'") }],
  ['meio gênero passa', { [TXT]: t.replace('  if (gs.some((g) => g === null)) return null\n', '') }],
  ['sem filtro de identidade', { [TXT]: t.replace('if (!t || /\\d/.test(t) || PROIBIDAS.test(t)) return null', 'if (!t) return null') }],
  ['gasta sem foto nem gênero', { [TXT]: t.replace("  if (!a.fotos.length && !telaCompleta) return padrao('pulou', 0)\n", '') }],
  ['check aceita foto de fora', { [CHECK]: ch.replace('ownedClipImageUrl(u, user.id, supabaseUrl)', 'u') }],
  ['check: visão troca o texto da tela sem descrição', { [CHECK]: ch.replace('(texto.descricoes.some(Boolean) || !genders)', 'true') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS texto do pedido: molde com descrição e gênero (válido na rota de gerar), tela ganha da visão, queda para o texto de hoje, sem gasto sem foto/gênero, filtro de identidade, /check só com foto da conta e custo no evento; ${mortos}/${mutantes.length} mutantes mortos`)
