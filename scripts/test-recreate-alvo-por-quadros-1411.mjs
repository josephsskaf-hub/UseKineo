// KINEO-RECREATE-ALVO-POR-QUADROS-1411 — guardião do pedido 7 da CEO (14/11) e da regra sem frase negativa.
// Caso: clip d379ec6e (molde "invasor de campo"): a visão viu UM quadro em que dois homens estavam no chão e descreveu o jogador ("the person in red shirt
// on ground"); o motor não trocou ninguém. EXECUTA lib/recreate/textoDoPedido (montarTextoDoPedido) com quadros e visão de mentira:
//  · a visão recebe 3 quadros (~10%, 50%, 90%) na MESMA chamada, antes das fotos, com a regra "quem aparece em mais quadros; no empate, o maior e
//    mais central" e "roupa que não muda, nunca pose";
//  · dois candidatos (o caso d379ec6e): o texto usa o ESCOLHIDO, e a lista volta (até 3) com o índice; sem escolha = texto neutro, nunca um chute;
//  · uma pessoa só (a dança): o texto usa a descrição, e a lista volta vazia;
//  · a pose de um instante sai da descrição ("on the ground", "lying", "sitting");
//  · 1 quadro só: mensagens byte a byte as de antes;
//  · nenhum texto sugerido tem frase negativa sobre as outras pessoas ("do not change", "don't") — CEO 14/11: com ela o motor não troca;
//  · o servidor extrai os 3 quadros numa extração só e o /check devolve target_candidates e target_choice.
// Mutantes. Rodar: node scripts/test-recreate-alvo-por-quadros-1411.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const TXT = 'lib/recreate/textoDoPedido.ts', SV = 'lib/recreate/seuVideo.ts', SRV = 'lib/recreate/seuVideoServer.ts', CHECK = 'app/api/recreate/seu-video/check/route.ts'
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
const QUADROS = ['https://fal.media/q10.jpg', 'https://fal.media/q50.jpg', 'https://fal.media/q90.jpg']
const NAVY = 'the man in the dark navy long-sleeve shirt and dark trousers'
const resposta = (corpo) => ({ choices: [{ message: { content: JSON.stringify(corpo) } }] })
// O caso d379ec6e: dois candidatos plausíveis; o protagonista (o de azul-marinho, presente nos 3 quadros) primeiro.
const INVASOR = (chosen = 1) => resposta({
  video_people: [{ person: 1, description: NAVY, wears_glasses: 'no' }],
  candidates: [{ description: NAVY }, { description: 'the player in the red kit on the ground' }], chosen,
  photos: [{ photo: 1, presents_as: 'man', wears_glasses: 'no' }],
})
// KINEO-RECREATE-TEXTO-REVISAO-3-1411 (M17) — os óculos lidos são os da pessoa 1 (o 1º candidato): escolhido outro, ou nenhum, a cláusula dos óculos não pode ir para o texto.
const INVASOR_OCULOS = (chosen) => resposta({ video_people: [{ person: 1, description: NAVY, wears_glasses: 'yes' }], candidates: [{ description: NAVY }, { description: 'the player in the red kit' }], chosen, photos: [{ photo: 1, presents_as: 'man', wears_glasses: 'no' }] })
const DANCA = resposta({ video_people: [{ person: 1, description: 'the dancer in the white top and black shorts', wears_glasses: 'no' }], candidates: [{ description: 'the dancer in the white top and black shorts' }], chosen: 1, photos: [{ photo: 1, presents_as: 'woman', wears_glasses: 'no' }] })
function io(data, o = {}) {
  const s = { visoes: 0, mensagens: null, quadro: 0, quadros: 0 }
  const base = { quadro: async () => { s.quadro++; return { url: QUADROS[1], usd: 0.001 } }, visao: async (m) => { s.visoes++; s.mensagens = m; return { data, usd: 0.002 } } }
  return { s, io: o.umQuadro ? base : { ...base, quadros: async () => { s.quadros++; return { urls: o.urls ?? QUADROS, usd: 0.002 } } } }
}

async function bateria(over = {}) {
  const { T, S } = carregar(over)
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const roda = async (data, a = {}) => { const w = io(data, a); const r = await T.montarTextoDoPedido(w.io, { pessoas: a.pessoas ?? 1, fotos: a.fotos ?? [FOTO], generosDaTela: a.generos ?? [], posicoes: a.posicoes ?? [] }); return { r, s: w.s } }
  await check('a visão vê 3 quadros na MESMA chamada, antes das fotos, com a regra do alvo e sem pose', async () => {
    const { r, s } = await roda(INVASOR())
    if (s.visoes !== 1 || s.quadros !== 1 || s.quadro !== 0 || r.quadros !== 3) throw new Error(`chamadas: visão ${s.visoes}, quadros ${s.quadros}, quadro ${s.quadro}, vistos ${r.quadros}`)
    const conteudo = s.mensagens[1].content, imgs = conteudo.filter((c) => c.type === 'image_url').map((c) => c.image_url.url)
    if (JSON.stringify(imgs) !== JSON.stringify([...QUADROS, FOTO])) throw new Error('imagens: ' + imgs.join(','))
    if (conteudo.some((c) => c.type === 'image_url' && c.image_url.detail !== 'low')) throw new Error('detalhe')
    const texto = conteudo[0].text, sys = s.mensagens[0].content
    if (!/Images 1 to 3 are frames of the SAME video, at about 10%, 50% and 90% of its length/.test(texto) || !/appears in the MOST of these frames; on a tie, the one who is the largest and most central across the frames/.test(texto) || !/image 4 is reference photo 1/.test(texto)) throw new Error('texto: ' + texto)
    if (!/NEVER describe a pose or an action of one moment/.test(sys) || !/the top and the bottom and their colours/.test(sys) || !/"candidates"/.test(sys) || !/Never identify anyone/.test(sys)) throw new Error('sistema')
  })
  await check('caso d379ec6e: dois candidatos → o texto usa o ESCOLHIDO (o de azul-marinho); a lista volta com o índice', async () => {
    const { r } = await roda(INVASOR(1))
    if (!r.prompt.startsWith(`Replace ${NAVY} in @Video1 with the man from @Image1: his face and hair match @Image1`)) throw new Error(r.prompt)
    if (JSON.stringify(r.candidatos) !== JSON.stringify([NAVY, 'the player in the red kit']) || r.escolhido !== 0) throw new Error(JSON.stringify([r.candidatos, r.escolhido]))
    const b = await roda(INVASOR(2))
    if (!b.r.prompt.startsWith('Replace the player in the red kit in @Video1 with the man from @Image1') || b.r.escolhido !== 1) throw new Error('escolhido 2: ' + b.r.prompt)
  })
  await check('dois candidatos e nenhuma escolha: texto NEUTRO (o de antes), nunca um chute', async () => {
    for (const chosen of [0, 9, null, 'x']) {
      const { r } = await roda(INVASOR(chosen))
      if (!r.prompt.startsWith('Replace the main person in @Video1 with the man from @Image1') || r.escolhido !== null || r.candidatos.length !== 2 || r.descricoes[0] !== null) throw new Error(`chosen ${chosen}: ${r.prompt.slice(0, 90)} / ${r.escolhido}`)
    }
  })
  await check('uma pessoa só (a dança): o texto usa a descrição; lista vazia', async () => {
    const { r } = await roda(DANCA)
    if (!r.prompt.startsWith('Replace the dancer in the white top and black shorts in @Video1 with the woman from @Image1: her face and hair match @Image1')) throw new Error(r.prompt)
    if (r.candidatos.length !== 0 || r.escolhido !== null) throw new Error(JSON.stringify([r.candidatos, r.escolhido]))
  })
  await check('KINEO-RECREATE-TEXTO-REVISAO-3-1411 (M17): óculos com candidatos — escolhido o 1º = a cláusula dele; escolhido outro ou nenhum = sem óculos', async () => {
    const um = (await roda(INVASOR_OCULOS(1))).r
    if (!um.prompt.includes(`Replace ${NAVY} in @Video1 with the man from @Image1: his face and hair match @Image1, and he wears no glasses.`) || JSON.stringify(um.oculos) !== '["tirar"]') throw new Error('escolhido 1: ' + um.prompt.slice(0, 160))
    for (const chosen of [2, 0]) {
      const r = (await roda(INVASOR_OCULOS(chosen))).r
      if (/glasses/i.test(r.prompt) || JSON.stringify(r.oculos) !== '[null]') throw new Error(`escolhido ${chosen}: os óculos da pessoa 1 foram para o texto: ` + r.prompt.slice(0, 160))
    }
  })
  await check('a pose de um instante sai da descrição', async () => {
    for (const [d, esperado] of [['the person in red shirt on ground', 'the person in red shirt'], ['the man in the navy shirt lying on the grass', 'the man in the navy shirt'], ['the woman in the red dress sitting', 'the woman in the red dress'], ['the dancer in white', 'the dancer in white'], ['the man in the navy shirt standing', 'the man in the navy shirt'], ['the woman in red sitting on a bench', 'the woman in red'], ['the man in white by the car', 'the man in white'], ['the woman dancing in the yellow dress', 'the woman in the yellow dress']]) {
      if (T.descricaoLimpa(d) !== esperado) throw new Error(`${d} → ${T.descricaoLimpa(d)}`)
    }
    if (T.descricaoLimpa('lying on the ground') !== null) throw new Error('só pose virou descrição')
    if (T.descricaoLimpa(NAVY) !== NAVY || T.MAX_PALAVRAS_DESCRICAO !== 12 || T.descricaoLimpa('the man in the dark navy long-sleeve shirt and dark trousers with white shoes') !== null) throw new Error('teto de palavras (roupa de cima e de baixo cabe; 13 não)')
  })
  await check('1 quadro só (io de antes): mensagens byte a byte as de antes; a lista não é lida', async () => {
    const { r, s } = await roda(INVASOR(2), { umQuadro: true })
    if (s.quadro !== 1 || r.quadros !== 1 || s.mensagens[1].content[0].text !== 'Image 1 is a frame of the video: describe the MAIN person (the largest and most central).\nThen image 2 is reference photo 1: say if the person in each photo presents as a man or a woman.') throw new Error('mensagem de 1 quadro mudou')
    if (r.candidatos.length || !r.prompt.startsWith(`Replace ${NAVY} in @Video1`)) throw new Error('1 quadro leu os candidatos')
  })
  await check('nenhum texto sugerido tem frase negativa sobre as outras pessoas ("do not change", "don\'t")', async () => {
    const textos = []
    for (const data of [INVASOR(1), INVASOR(0), DANCA]) for (const generos of [[], ['man'], ['woman']]) textos.push((await roda(data, { generos })).r.prompt)
    textos.push((await roda(resposta({ video_people: [{ person: 1, description: 'the man in white', wears_glasses: 'yes' }, { person: 2, description: 'the woman in red', wears_glasses: 'no' }], photos: [{ photo: 1, presents_as: 'man', wears_glasses: 'no' }, { photo: 2, presents_as: 'woman', wears_glasses: 'yes' }] }), { pessoas: 2, fotos: [FOTO, FOTO] })).r.prompt)
    textos.push((await roda(resposta({}), { pessoas: 3, fotos: [], posicoes: ['on the left', 'in the center', 'on the right'] })).r.prompt)
    textos.push(S.promptPadrao(1), S.promptPadrao(3, ['on the left', 'in the center', 'on the right']), T.textoNeutroComDescricao(2, [], []), T.textoComGenero({ fotos: 1, generos: ['man'], descricoes: [NAVY] }))
    for (const x of textos) if (/\bdo not\b|\bdon['’]t\b|\bnever change\b/i.test(x)) throw new Error('frase negativa: ' + x)
    if (textos.length < 15) throw new Error('poucos textos')
  })
  const srv = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, ''), ch = (over[CHECK] ?? lf(CHECK)).replace(/\/\/[^\n]*/g, '')
  await check('servidor: os 3 quadros numa extração só (10% da duração, 9 quadros, o 1º, o 5º e o 9º)', async () => {
    if (!srv.includes('const r = await extractInstantFrames(videoUrl, {}, intervaloPara(meta.segundos * 0.1, meta.fps), 9)') || !srv.includes('f.length >= 9 ? [f[0], f[4], f[8]]')) throw new Error('extração')
  })
  await check('/check: devolve target_candidates e target_choice e grava no evento; uma montagem só', async () => {
    if (!ch.includes('body.target_candidates = texto ? texto.candidatos : []') || !ch.includes('body.target_choice = texto ? texto.escolhido : null')) throw new Error('resposta')
    if (!ch.includes('candidatos: texto.candidatos, escolhido: texto.escolhido, quadros: texto.quadros')) throw new Error('evento')
    if ((ch.match(/montarTextoDoPedido\(/g) ?? []).length !== 1) throw new Error('chamada a mais')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const t = lf(TXT), srv = lf(SRV), ch = lf(CHECK)
const mutantes = [
  ['um quadro só', { [TXT]: t.replace('const q = io.quadros ? await io.quadros() : await io.quadro()', 'const q = false ? await io.quadros!() : await io.quadro()') }],
  ['sem a regra "mais quadros"', { [TXT]: t.replace("'The TARGET is the person who appears in the MOST of these frames; on a tie, the one who is the largest and most central across the frames. Describe the target as person 1. ' +", "'Describe the main person as person 1. ' +") }],
  ['pose pode', { [TXT]: t.replace("    'in the whole video: the top and the bottom and their colours (for example: \"the man in the dark navy long-sleeve shirt and dark trousers\", ' +\n    '\"the woman in the red dress\"). NEVER describe a pose or an action of one moment (no \"on the ground\", \"lying\", \"sitting\", \"running\", \"falling\"). ' +", "    'in the whole video. ' +") }],
  ['pose não sai da descrição', { [TXT]: t.replace("v.replace(POSE, ' ').replace(", 'v.replace(') }],
  ['ignora o escolhido (sempre o 1º)', { [TXT]: t.replace('            descricoes = [i === null ? null : c.candidatos[i]]', '            descricoes = [c.candidatos[0]]') }],
  ['sem escolha vira chute', { [TXT]: t.replace('            const i = c.escolhido !== null && c.escolhido >= 1 && c.escolhido <= c.candidatos.length ? c.escolhido - 1 : null', '            const i = c.escolhido !== null && c.escolhido >= 1 && c.escolhido <= c.candidatos.length ? c.escolhido - 1 : 0') }],
  ['lista não volta', { [TXT]: t.replace('            candidatos = c.candidatos\n', '') }],
  ['fotos antes dos quadros', { [TXT]: t.replace("content: [{ type: 'text' as const, text }, ...quadros.map(img), ...fotos.map(img)]", "content: [{ type: 'text' as const, text }, ...fotos.map(img), ...quadros.map(img)]") }],
  ['M17: óculos da pessoa 1 com outro escolhido', { [TXT]: t.replace('            if (i !== 0) oculos = [null]', '            if (i === null) oculos = [null]') }],
  ['M17: óculos mantidos sem escolha', { [TXT]: t.replace('            if (i !== 0) oculos = [null]', '            void 0') }],
  ['lugar fica na descrição', { [TXT]: t.replace('(?:bench|chair|sofa', '(?:xbench|chair|sofa') }],
  ['standing fica na descrição', { [TXT]: t.replace('|crouching|standing|walking|', '|crouching|walking|') }],
  ['servidor: quadros fora do lugar', { [SRV]: srv.replace('f.length >= 9 ? [f[0], f[4], f[8]]', 'f.length >= 9 ? [f[0], f[1], f[2]]') }],
  ['check sem a lista', { [CHECK]: ch.replace('  body.target_candidates = texto ? texto.candidatos : []\n', '') }],
  ['frase negativa volta', { [TXT]: t.replace("const TAIL = 'Keep the choreography,", "const TAIL = 'Do not change the other people. Keep the choreography,") }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS alvo por 3 quadros: a visão vê 10/50/90% numa chamada; quem aparece em mais quadros; sem pose; dois candidatos = o escolhido e a lista; sem escolha = neutro; uma pessoa = descrição; 1 quadro = o de antes; nenhum texto com "do not change"; ${mortos}/${mutantes.length} mutantes mortos`)
