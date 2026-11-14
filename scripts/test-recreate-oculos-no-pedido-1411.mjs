// KINEO-RECREATE-OCULOS-NO-PEDIDO-1411 — guardião do pedido 6 da CEO (14/11): os óculos no texto SUGERIDO do Recreate "com o seu vídeo".
// Medido pela CEO com uma variável só: sem a frase, o motor manteve os óculos da pessoa do vídeo (clip 568db487); com ", and he wears no glasses",
// saiu sem óculos (clip 9afc54fa). EXECUTA lib/recreate/textoDoPedido.ts com quadro e visão falsos, nos QUATRO casos: óculos só no vídeo → ", and
// he/she wears no glasses"; só na foto → ", wearing the glasses from @ImageN"; nos dois → os da foto; em nenhum → nada. Sem certeza ("unclear",
// sem foto, visão fora) → nada, e o texto fica byte a byte o de antes. A pergunta dos óculos vai na MESMA chamada de visão (uma só por /check).
// O texto passa no validarPrompt da rota de gerar. Mutantes. Rodar: node scripts/test-recreate-oculos-no-pedido-1411.mjs
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
const resposta = (video, foto, extra = {}) => ({ choices: [{ message: { content: JSON.stringify({
  video_people: [{ person: 1, description: 'the man in the dark blue shirt', wears_glasses: video }, ...(extra.video2 !== undefined ? [{ person: 2, description: 'the woman in the red dress', wears_glasses: extra.video2 }] : [])],
  photos: [{ photo: 1, presents_as: 'man', wears_glasses: foto }, ...(extra.foto2 !== undefined ? [{ photo: 2, presents_as: 'woman', wears_glasses: extra.foto2 }] : [])],
}) } }] })
function io(data, o = {}) {
  const s = { visoes: 0, mensagens: null }
  return { s, io: { quadro: async () => ({ url: 'https://fal.media/q.jpg', usd: 0.001 }), visao: async (m) => { s.visoes++; s.mensagens = m; return o.visaoFalha ? null : { data, usd: 0.0009 } } } }
}

async function bateria(over = {}) {
  const { T, S } = carregar(over)
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const roda = async (video, foto, a = {}) => { const w = io(resposta(video, foto, a.extra), a); const r = await T.montarTextoDoPedido(w.io, { pessoas: a.pessoas ?? 1, fotos: a.fotos ?? [FOTO], generosDaTela: a.generos ?? ['man'], posicoes: [] }); return { r, s: w.s } }
  const BASE = 'Replace the man in the dark blue shirt in @Video1 with the man from @Image1: his face and hair match @Image1'
  await check('óculos só no VÍDEO: tira', async () => {
    const { r, s } = await roda('yes', 'no')
    if (!r.prompt.startsWith(BASE + ', and he wears no glasses. Keep ')) throw new Error(r.prompt)
    if (JSON.stringify(r.oculos) !== '["tirar"]' || s.visoes !== 1 || !S.validarPrompt(r.prompt, 1).ok) throw new Error('oculos/visão/rota')
  })
  await check('óculos só na FOTO: usa os da foto', async () => {
    const { r } = await roda('no', 'yes')
    if (!r.prompt.startsWith(BASE + ', wearing the glasses from @Image1. Keep ') || JSON.stringify(r.oculos) !== '["usar"]' || !S.validarPrompt(r.prompt, 1).ok) throw new Error(r.prompt)
  })
  await check('óculos nos DOIS: os da foto', async () => {
    const { r } = await roda('yes', 'yes')
    if (!r.prompt.startsWith(BASE + ', wearing the glasses from @Image1. Keep ')) throw new Error(r.prompt)
  })
  await check('óculos em NENHUM: nada', async () => {
    const { r } = await roda('no', 'no')
    if (!r.prompt.startsWith(BASE + '. Keep ') || JSON.stringify(r.oculos) !== '[null]') throw new Error(r.prompt)
  })
  await check('sem certeza: nada (unclear, sem foto, visão fora) e o texto de antes', async () => {
    for (const [v, f] of [['unclear', 'no'], ['yes', 'unclear'], ['unclear', 'unclear'], [undefined, undefined]]) {
      const { r } = await roda(v, f)
      if (/glasses/.test(r.prompt)) throw new Error(`${v}/${f}: ` + r.prompt)
    }
    const semFoto = await roda('yes', 'no', { fotos: [] })
    if (/glasses/.test(semFoto.r.prompt)) throw new Error('sem foto escreveu óculos')
    const fora = await roda('yes', 'no', { visaoFalha: true })
    if (fora.r.prompt !== S.promptPorGenero(['man'], [])) throw new Error('visão fora: difere do texto da tela')
  })
  await check('mulher: she; neutro de 1 pessoa: they; 2 pessoas com gênero: cada uma a sua; neutro de 2: nada', async () => {
    const a = await roda('yes', 'no', { generos: ['woman'] })
    if (!/with the woman from @Image1: her face and hair match @Image1, and she wears no glasses\./.test(a.r.prompt)) throw new Error(a.r.prompt)
    const b = await roda('yes', 'unclear', { generos: [] }) // sugestão "man" vem da visão; óculos da foto incertos → nada
    if (/glasses/.test(b.r.prompt)) throw new Error('incerto na foto: ' + b.r.prompt)
    const c = await roda('yes', 'no', { generos: ['man', 'woman'], pessoas: 2, fotos: [FOTO, FOTO], extra: { video2: 'no', foto2: 'yes' } })
    if (!/from @Image1: his face and hair match @Image1, and he wears no glasses\. Replace the woman in the red dress in @Video1 with the woman from @Image2: her face and hair match @Image2, wearing the glasses from @Image2\./.test(c.r.prompt) || !S.validarPrompt(c.r.prompt, 2).ok) throw new Error(c.r.prompt)
    const d = T.textoNeutroComDescricao(1, ['the man in the dark blue shirt'], [], ['tirar'])
    if (!/with the person from @Image1: their face and hair match @Image1, and they wear no glasses\./.test(d)) throw new Error(d)
    const e = T.textoNeutroComDescricao(2, [], [], ['tirar', 'usar'])
    if (/glasses/.test(e) || e !== S.promptKling4(2, [])) throw new Error('neutro de 2 pessoas mudou: ' + e)
  })
  await check('a regra pura', async () => {
    const d = T.decidirOculos
    if (d(true, false) !== 'tirar' || d(false, true) !== 'usar' || d(true, true) !== 'usar' || d(false, false) !== null || d(true, null) !== null || d(null, false) !== null || d(null, true) !== 'usar') throw new Error('decidirOculos')
  })
  await check('a pergunta vai na MESMA chamada de visão; o /check troca o texto e grava os óculos', async () => {
    const { s } = await roda('yes', 'no')
    const sys = s.mensagens[0].content
    if ((sys.match(/"wears_glasses": "yes"\|"no"\|"unclear"/g) ?? []).length !== 2) throw new Error('a visão não pergunta dos óculos do vídeo e da foto')
    if (!/Never identify anyone/.test(sys)) throw new Error('sistema')
    const c = (over[CHECK] ?? lf(CHECK)).replace(/\/\/[^\n]*/g, '')
    if (!c.includes("texto.descricoes.some(Boolean) || texto.oculos.some(Boolean) || !!cabelos?.some(Boolean) || (!genders && texto.generoDe === 'sugestao')") || !/oculos: texto\.oculos[ ,}]/.test(c)) throw new Error('/check') // reancorado KINEO-RECREATE-ALVO-POR-QUADROS-1411 (+ candidatos no evento) // reancorado KINEO-RECREATE-MOVIMENTO-1411 (+ o cabelo lido da foto, com o interruptor)
    if ((c.match(/montarTextoDoPedido\(/g) ?? []).length !== 1) throw new Error('mais de uma montagem (chamada a mais)')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const t = lf(TXT), ch = lf(CHECK)
const mutantes = [
  ['tira os óculos sem certeza da foto', { [TXT]: t.replace("  if (noVideo === true && naFoto === false) return 'tirar'", "  if (noVideo === true) return 'tirar'") }],
  ['nunca tira', { [TXT]: t.replace("  if (noVideo === true && naFoto === false) return 'tirar'\n", '') }],
  ['nunca usa os da foto', { [TXT]: t.replace("  if (naFoto === true) return 'usar'\n", '') }],
  ['cláusula some do molde', { [TXT]: t.replace(" + clausulaDosOculos(a.oculos?.[i], i + 1, gs[i] === 'man' ? 'he' : 'she') + '.'", " + '.'") }],
  ['pronome errado', { [TXT]: t.replace("clausulaDosOculos(a.oculos?.[i], i + 1, gs[i] === 'man' ? 'he' : 'she')", "clausulaDosOculos(a.oculos?.[i], i + 1, 'he')") }],
  ['óculos de quem não tem foto', { [TXT]: t.replace('(i < fotos.length ? decidirOculos(lido.oculosNoVideo[i], lido.oculosNaFoto[i]) : null)', "(lido.oculosNoVideo[i] ? 'tirar' : null)") }],
  ['neutro de 2 ganha cláusula', { [TXT]: t.replace("${n === 1 ? clausulaDoCabelo(cabelos[0]) + clausulaDosOculos(oculos[0], 1, 'they') : ''}", "${clausulaDoCabelo(cabelos[0]) + clausulaDosOculos(oculos[0], 1, 'they')}") }], // reancorado KINEO-RECREATE-MOVIMENTO-1411 (a linha ganhou a cláusula do cabelo; o mutante é o mesmo)
  ['check não troca o texto pelos óculos', { [CHECK]: ch.replace(' || texto.oculos.some(Boolean)', '') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS óculos no pedido: só no vídeo = "wears no glasses"; só na foto ou nos dois = "wearing the glasses from @ImageN"; em nenhum ou sem certeza = nada; mesma chamada de visão; texto válido na rota de gerar; ${mortos}/${mutantes.length} mutantes mortos`)
