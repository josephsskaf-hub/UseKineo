// KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 + KINEO-RECREATE-GENERO-SUGERIDO-1411 — guardião do texto do pedido do Recreate "com o seu vídeo" no Kling
// (lib/recreate/textoDoPedido.ts + o /check). Prova, EXECUTANDO com quadro e visão falsos: (1) com a escolha da tela (`genders`), ela GANHA: o
// molde da tela (promptPorGenero do GPT) com a descrição — sem descrição, byte a byte o promptPorGenero; (2) sem a escolha e com as fotos, a
// SUGESTÃO da visão (man|woman) já escreve o texto e volta em `sugestao` para a tela pré-marcar (dono 14/11: "o prompt já vem escrito"); (3) sem
// sugestão para toda foto (ou sem fotos), o neutro de hoje com a descrição — sem descrição, byte a byte o promptKling4; (4) só fotos da conta;
// (5) descrição com identidade/idade/etnia/corpo cai; (6) custo e origem do gênero no evento; (7) o texto passa no validarPrompt da rota de gerar;
// (8) a linha da tela no /check fica intacta. Mutantes. Rodar: node scripts/test-recreate-texto-do-pedido-1311.mjs
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
const PADRAO = resposta({ video_people: [{ person: 1, description: 'the dancer in the dark blue shirt' }], photos: [{ photo: 1, presents_as: 'man' }] })
function io(o = {}) {
  const s = { quadros: 0, visoes: 0, mensagens: null }
  return { s, io: {
    quadro: async () => { s.quadros++; return o.semQuadro ? null : { url: 'https://fal.media/q.jpg', usd: 0.001 } },
    visao: async (m) => { s.visoes++; s.mensagens = m; if (o.visaoFalha) return null; return { data: o.data ?? PADRAO, usd: 0.0009 } },
  } }
}

async function bateria(over = {}) {
  const { T, S } = carregar(over)
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  await check('sem a escolha, com foto: a sugestão já escreve o texto (molde da tela + descrição)', async () => {
    const { s, io: x } = io()
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [FOTO], generosDaTela: [], posicoes: [] })
    if (!r.prompt.startsWith('Replace the dancer in the dark blue shirt in @Video1 with the man from @Image1: his face and hair match @Image1. Keep ')) throw new Error(r.prompt)
    if (r.fonte !== 'sugestao' || r.generoDe !== 'sugestao' || JSON.stringify(r.sugestao) !== '["man"]') throw new Error(r.fonte + ' ' + r.generoDe + ' ' + JSON.stringify(r.sugestao))
    if (Math.abs(r.usd - 0.0019) > 1e-9 || !S.validarPrompt(r.prompt, 1).ok) throw new Error('custo ou rota de gerar')
    const imgs = s.mensagens[1].content.filter((c) => c.type === 'image_url')
    if (imgs.length !== 2) throw new Error('a foto não foi à visão')
  })
  await check('a escolha da tela ganha da sugestão (e a sugestão volta para pré-marcar)', async () => {
    const { io: x } = io()
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [FOTO], generosDaTela: ['woman'], posicoes: [] })
    if (!/with the woman from @Image1: her face and hair match @Image1/.test(r.prompt) || r.generoDe !== 'tela' || r.fonte !== 'tela_e_visao') throw new Error(r.generoDe + ' ' + r.prompt)
    if (JSON.stringify(r.sugestao) !== '["man"]') throw new Error('a sugestão sumiu')
  })
  await check('sem foto e sem escolha: neutro de hoje + descrição, sem gênero', async () => {
    const { s, io: x } = io()
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [], generosDaTela: [], posicoes: [] })
    if (!r.prompt.startsWith('Replace the dancer in the dark blue shirt in @Video1 with the person from @Image1: their face and hair match @Image1. Keep ')) throw new Error(r.prompt)
    if (r.generoDe !== 'nenhum' || s.mensagens[1].content.filter((c) => c.type === 'image_url').length !== 1) throw new Error('foto/gênero')
  })
  await check('sugestão incompleta (uma foto "unclear"): neutro, nada inventado', async () => {
    const { io: x } = io({ data: resposta({ video_people: [], photos: [{ photo: 1, presents_as: 'man' }, { photo: 2, presents_as: 'unclear' }] }) })
    const r = await T.montarTextoDoPedido(x, { pessoas: 2, fotos: [FOTO, FOTO], generosDaTela: [], posicoes: [] })
    if (r.prompt !== S.promptKling4(2, []) || r.generoDe !== 'nenhum' || JSON.stringify(r.sugestao) !== '["man",null]') throw new Error(r.generoDe + ' ' + r.prompt)
  })
  await check('sem descrição nem sugestão = byte a byte o texto de antes (tela e neutro)', async () => {
    for (const o of [{ visaoFalha: true }, { semQuadro: true }, { data: { choices: [{ message: { refusal: 'no' } }] } }, { data: resposta({ video_people: [{ person: 1, description: 'the young asian man' }] }) }]) {
      for (const [gs, pos] of [[['man'], []], [['woman'], ['on the left']], [['man', 'woman'], []], [['woman', 'man', 'woman'], ['on the left', '', 'on the right']]]) {
        const { io: x } = io(o)
        const r = await T.montarTextoDoPedido(x, { pessoas: gs.length, fotos: gs.map(() => FOTO), generosDaTela: gs, posicoes: pos })
        if (r.prompt !== S.promptPorGenero(gs, pos)) throw new Error('difere da tela: ' + r.prompt)
        const { io: y } = io(o)
        const n = await T.montarTextoDoPedido(y, { pessoas: gs.length, fotos: [], generosDaTela: [], posicoes: pos })
        if (n.prompt !== S.promptKling4(gs.length, pos) || n.fonte !== 'padrao') throw new Error('difere do neutro de hoje: ' + n.prompt)
      }
    }
  })
  await check('descrição com identidade/idade/etnia/corpo cai', async () => {
    for (const d of ['the young man in red', 'the asian dancer', 'the famous singer on stage', 'the 30 year woman', 'the thin person in jeans', 'the dancer named Ana']) if (T.descricaoLimpa(d) !== null) throw new Error(d)
    if (T.descricaoLimpa('dancer in the gold jacket') !== 'the dancer in the gold jacket') throw new Error('recusou roupa')
  })
  await check('a visão é proibida de identificar e só diz man/woman/unclear', async () => {
    const { s, io: x } = io()
    await T.montarTextoDoPedido(x, { pessoas: 1, fotos: [FOTO], generosDaTela: [], posicoes: [] })
    const sys = s.mensagens[0].content
    if (!/Never identify anyone/.test(sys) || !/never mention age, ethnicity, skin/.test(sys) || !/"presents_as": "man"\|"woman"\|"unclear"/.test(sys)) throw new Error('sistema')
    for (const v of ['male', 'Woman', 'other', 'boy', '']) if (['other', 'boy', ''].includes(v) ? T.generoValido(v) !== null : T.generoValido(v) === null) throw new Error('generoValido ' + v)
  })
  const c = (over[CHECK] ?? lf(CHECK)).replace(/\/\/[^\n]*/g, '')
  await check('o /check: só fotos da conta, sugestão devolvida, linha da tela intacta, evento com a origem do gênero', async () => {
    if (!/ownedClipImageUrl\(u, user\.id, supabaseUrl\)/.test(c) || !/\{ pessoas: people, fotos, generosDaTela:/.test(c)) throw new Error('fotos')
    if (!c.includes('body.suggested_genders = texto ? texto.sugestao : []')) throw new Error('sem suggested_genders')
    if (!c.includes('prompt: genders ? promptPorGenero(genders as SeuVideoGender[], positions) : promptDoSeuVideo(SEU_VIDEO_MOTOR, people, positions), engine: SEU_VIDEO_MOTOR')) throw new Error('o texto da tela (GPT) não é mais a base')
    if (!c.includes("const visaoAcrescenta = !!texto && (texto.descricoes.some(Boolean) || texto.oculos.some(Boolean) || (!genders && texto.generoDe === 'sugestao'))")) throw new Error('regra da troca do texto') // reancorado KINEO-RECREATE-OCULOS-NO-PEDIDO-1411: + os óculos (guardião próprio: scripts/test-recreate-oculos-no-pedido-1411.mjs)
    if (!/name: TEXTO_DO_PEDIDO_EVENTO[^\n]*usd: texto\.usd[^\n]*genero_de: texto\.generoDe/.test(c)) throw new Error('evento sem custo ou sem a origem do gênero')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const t = lf(TXT), ch = lf(CHECK)
const mutantes = [
  ['fotos não vão à visão', { [TXT]: t.replace('mensagensDaVisao(q.url, fotos, n)', 'mensagensDaVisao(q.url, [], n)') }],
  ['sugestão ganha da tela', { [TXT]: t.replace('  if (telaCompleta) {', '  if (telaCompleta && !sugestaoCompleta) {') }],
  ['sugestão incompleta escreve gênero', { [TXT]: t.replace('const sugestaoCompleta = sugestao.every((g) => g !== null)', 'const sugestaoCompleta = sugestao.some((g) => g !== null)') }],
  ['descrição fora do molde da tela', { [TXT]: t.replace("gs[i] === 'man' ? 'he' : 'she') + '.'", "gs[i] === 'man' ? 'he' : 'she') + '!'") }], // reancorado KINEO-RECREATE-OCULOS-NO-PEDIDO-1411: a frase ganhou a cláusula dos óculos antes do ponto
  ['sem filtro de identidade', { [TXT]: t.replace('if (!t || /\\d/.test(t) || PROIBIDAS.test(t)) return null', 'if (!t) return null') }],
  ['check aceita foto de fora', { [CHECK]: ch.replace('ownedClipImageUrl(u, user.id, supabaseUrl)', 'u') }],
  ['check não devolve a sugestão', { [CHECK]: ch.replace('body.suggested_genders = texto ? texto.sugestao : []', 'body.suggested_genders = []') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS texto do pedido: tela ganha; sem ela a sugestão da visão já escreve o texto e volta para pré-marcar; sugestão incompleta = neutro; sem descrição nem sugestão, byte a byte o de antes; só fotos da conta; filtro de identidade; origem do gênero e custo no evento; ${mortos}/${mutantes.length} mutantes mortos`)
