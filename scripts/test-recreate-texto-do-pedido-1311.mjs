// KINEO-RECREATE-TEXTO-DO-PEDIDO-1311 + KINEO-RECREATE-SEM-GENERO-DA-FOTO-1311 — guardião do texto do pedido do Recreate "com o seu vídeo" no Kling
// (lib/recreate/textoDoPedido.ts + o /check). Prova, EXECUTANDO com quadro e visão falsos: (1) com a escolha da tela (`genders`), o molde da
// tela (promptPorGenero do GPT) com a descrição da visão no lugar de "the main person" — sem descrição, byte a byte o promptPorGenero; (2) sem a
// escolha, o texto NEUTRO de hoje (promptKling4) com a descrição — sem descrição, byte a byte o promptKling4; (3) o gênero NUNCA sai da foto (CEO
// 13/11): nenhuma foto vai à visão e um "man" da visão não vira texto; (4) descrição com identidade/idade/etnia/corpo cai; (5) custo somado; (6) o
// texto passa no validarPrompt da rota de gerar; (7) o /check mantém a linha da tela e só troca o texto quando há descrição. Mutantes.
// Rodar: node scripts/test-recreate-texto-do-pedido-1311.mjs
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
  await check('com a escolha da tela: molde da tela + descrição (o que trocou 4 de 4), válido na rota de gerar', async () => {
    const { s, io: x } = io()
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, generosDaTela: ['man'], posicoes: [] })
    if (!r.prompt.startsWith('Replace the dancer in the dark blue shirt in @Video1 with the man from @Image1: his face and hair match @Image1. Keep ')) throw new Error(r.prompt)
    if (r.fonte !== 'tela_e_visao' || Math.abs(r.usd - 0.0019) > 1e-9) throw new Error(r.fonte + ' ' + r.usd)
    if (!S.validarPrompt(r.prompt, 1).ok) throw new Error('a rota de gerar recusaria')
    if (s.quadros !== 1 || s.visoes !== 1) throw new Error('chamadas')
  })
  await check('sem a escolha: neutro de hoje + descrição; o "man" da visão NÃO entra', async () => {
    const { io: x } = io()
    const r = await T.montarTextoDoPedido(x, { pessoas: 1, generosDaTela: [], posicoes: [] })
    if (!r.prompt.startsWith('Replace the dancer in the dark blue shirt in @Video1 with the person from @Image1: their face and hair match @Image1. Keep ')) throw new Error(r.prompt)
    if (/\b(man|woman|his|her)\b/.test(r.prompt.replace('the dancer in the dark blue shirt', ''))) throw new Error('gênero entrou sem a escolha da tela')
    if (r.fonte !== 'visao' || !S.validarPrompt(r.prompt, 1).ok) throw new Error(r.fonte)
  })
  await check('nenhuma foto vai à visão', async () => {
    const { s, io: x } = io()
    await T.montarTextoDoPedido(x, { pessoas: 2, generosDaTela: ['man', 'woman'], posicoes: [] })
    const imgs = s.mensagens[1].content.filter((c) => c.type === 'image_url')
    if (imgs.length !== 1 || imgs[0].image_url.url !== 'https://fal.media/q.jpg') throw new Error('imagens na visão: ' + imgs.length)
    if (/reference photo/.test(s.mensagens[1].content[0].text)) throw new Error('a visão ainda pergunta pelas fotos')
  })
  await check('sem descrição = byte a byte o texto de antes (tela e neutro)', async () => {
    for (const o of [{ visaoFalha: true }, { semQuadro: true }, { data: { choices: [{ message: { refusal: 'no' } }] } }, { data: resposta({ video_people: [{ person: 1, description: 'the young asian man' }] }) }]) {
      for (const [gs, pos] of [[['man'], []], [['woman'], ['on the left']], [['man', 'woman'], []], [['woman', 'man', 'woman'], ['on the left', '', 'on the right']]]) {
        const { io: x } = io(o)
        const r = await T.montarTextoDoPedido(x, { pessoas: gs.length, generosDaTela: gs, posicoes: pos })
        if (r.prompt !== S.promptPorGenero(gs, pos)) throw new Error('difere da tela: ' + r.prompt)
        const { io: y } = io(o)
        const n = await T.montarTextoDoPedido(y, { pessoas: gs.length, generosDaTela: [], posicoes: pos })
        if (n.prompt !== S.promptKling4(gs.length, pos) || n.fonte !== 'padrao') throw new Error('difere do neutro de hoje: ' + n.prompt)
      }
    }
  })
  await check('descrição com identidade/idade/etnia/corpo cai', async () => {
    for (const d of ['the young man in red', 'the asian dancer', 'the famous singer on stage', 'the 30 year woman', 'the thin person in jeans', 'the dancer named Ana']) if (T.descricaoLimpa(d) !== null) throw new Error(d)
    if (T.descricaoLimpa('dancer in the gold jacket') !== 'the dancer in the gold jacket') throw new Error('recusou roupa')
    if (T.descricaoLimpa('the person on the left wearing a long black coat today') !== null) throw new Error('passou de 8 palavras')
  })
  await check('2 pessoas com escolha: uma descrição, outra a ordem da tela', async () => {
    const { io: x } = io({ data: resposta({ video_people: [{ person: 1, description: 'the person on the left in white' }] }) })
    const r = await T.montarTextoDoPedido(x, { pessoas: 2, generosDaTela: ['man', 'woman'], posicoes: [] })
    if (!r.prompt.startsWith('Replace the person on the left in white in @Video1 with the man from @Image1: his face and hair match @Image1. Replace the second person in @Video1 with the woman from @Image2: her face and hair match @Image2. Keep ')) throw new Error(r.prompt)
    if (!S.validarPrompt(r.prompt, 2).ok) throw new Error('rota de gerar recusaria')
  })
  await check('a visão é proibida de identificar', async () => {
    const { s, io: x } = io()
    await T.montarTextoDoPedido(x, { pessoas: 1, generosDaTela: [], posicoes: [] })
    const sys = s.mensagens[0].content
    if (!/Never identify anyone/.test(sys) || !/never mention age, ethnicity, skin/.test(sys) || !/ONLY by visible clothing and position/.test(sys)) throw new Error('sistema')
  })
  const c = (over[CHECK] ?? lf(CHECK)).replace(/\/\/[^\n]*/g, '')
  await check('o /check: linha da tela intacta, texto só com descrição, sem fotos, evento com custo', async () => {
    if (!/SEU_VIDEO_MOTOR === 'kling4' \? await montarTextoDoPedido\(ioDoTextoReal\(v\.url, v\.meta\), \{ pessoas: people, generosDaTela: \(genders as SeuVideoGender\[\] \| undefined\) \?\? \[\], posicoes: positions \}\)/.test(c)) throw new Error('montagem')
    if (/raw\.photos|ownedClipImageUrl/.test(c)) throw new Error('fotos ainda entram no /check')
    if (!c.includes('prompt: genders ? promptPorGenero(genders as SeuVideoGender[], positions) : promptDoSeuVideo(SEU_VIDEO_MOTOR, people, positions), engine: SEU_VIDEO_MOTOR')) throw new Error('o texto da tela (GPT) não é mais a base')
    if (!c.includes('const visaoAcrescenta = !!texto && texto.descricoes.some(Boolean)') || !c.includes('if (visaoAcrescenta && texto) body.prompt = texto.prompt')) throw new Error('a visão troca o texto sem descrição')
    if (!/name: TEXTO_DO_PEDIDO_EVENTO[^\n]*usd: texto\.usd/.test(c)) throw new Error('evento sem custo')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const t = lf(TXT), ch = lf(CHECK)
const mutantes = [
  ['fotos voltam à visão', { [TXT]: t.replace('mensagensDaVisao(q.url, [], n)', "mensagensDaVisao(q.url, ['https://x/foto.jpg'], n)") }],
  ['check volta a mandar fotos', { [CHECK]: ch.replace('{ pessoas: people, generosDaTela:', '{ pessoas: people, fotos: raw.photos, generosDaTela:') }],
  ['neutro vira gênero', { [TXT]: t.replace('`${sujeito} in @Video1 with the person from @Image${i + 1}`', '`${sujeito} in @Video1 with the man from @Image${i + 1}`') }],
  ['descrição fora do molde da tela', { [TXT]: t.replace("' face and hair match @Image' + (i + 1) + '.'", "' face and hair match @Image' + (i + 1) + '!'") }],
  ['sem filtro de identidade', { [TXT]: t.replace('if (!t || /\\d/.test(t) || PROIBIDAS.test(t)) return null', 'if (!t) return null') }],
  ['check: visão troca o texto sem descrição', { [CHECK]: ch.replace('const visaoAcrescenta = !!texto && texto.descricoes.some(Boolean)', 'const visaoAcrescenta = !!texto') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS texto do pedido: com a escolha da tela, o molde dela + descrição; sem escolha, o neutro de hoje + descrição; sem descrição, byte a byte o de antes; gênero nunca da foto; filtro de identidade; /check sem fotos e com custo no evento; ${mortos}/${mutantes.length} mutantes mortos`)
