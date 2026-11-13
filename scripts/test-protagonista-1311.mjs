// KINEO-PROTAGONISTA-1311 [CEO 13/11, "vai na regra do protagonista"] — guardião sem rede e sem custo.
// As leituras REAIS (ensaio de 13/11, gpt-4o-mini, roteiros dos 28 filmes grátis do Kling 4 que saíram sem rosto em 14 dias): o protagonista do
// elenco semântico e o sujeito do pedido de cada um, com o rótulo humano (história com protagonista / documentário / ambíguo).
// Trava: (a) as 9 histórias com sinal vão para character_story; NENHUM documentário e nenhum ambíguo muda (régua da CEO); (b) a rota só lê
// os sinais quando o filme ia sem rosto (história, apresentador, [faceless], desenho infantil e herdado ficam como estão) e a linha do modo
// é a de sempre; (c) a ficha do sujeito vivo: espécie + aparência, o lugar só em ideia de uma linha; (d) uma leitura do sujeito por filme
// (reaproveitada na estrada clássica e no Kling 4); (e) a leitura dos sinais nunca lança.
// Mutantes: interruptor 'off' · sem o ramo do sujeito · objeto conta como protagonista · rota não troca o modo · rota lê sinais em
// apresentador · reaproveitamento do elenco removido · ficha viva removida · leitura pronta ignorada.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const MOD = 'lib/cinematic/protagonista1311.ts'
const SUJ = 'lib/cinematic/sujeitoObrigatorio.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const ler = (f) => readFileSync(f, 'utf8')
const prot = (name, kind) => ({ protagonist: { name, kind, role: null }, supporting: [], places_and_orgs: [] })
const leit = (kind, subject_visual, descartado = null, head_noun = 'x') => ({ kind, subject_visual, descartado, head_noun, real_person: false, subject: subject_visual })
// [g, rótulo, elenco, leitura] — as leituras do ensaio (null = o leitor não deu protagonista / falhou)
const FACELESS = [
  ['b4cbb871', 'doc', null, leit('none', null, 'uso_none')], ['4e007250', 'doc', null, leit('creature', null, 'sujeito_sem_traducao')],
  ['cfb3a1f8', 'doc', null, leit('object', 'a kit of colorful hair clips')], ['a3c1a30e', 'doc', null, leit('object', null, 'visual_com_maiuscula')],
  ['5523628b', 'prot', prot('Maung Hlaing', 'human'), leit('object', 'a river flowing muddy red-brown')], ['804e9f0b', 'prot', prot('Victor', 'human'), leit('none', null, 'uso_none')],
  ['80d9a38d', 'doc', null, leit('none', null, 'uso_none')], ['193e4465', 'prot', prot('Léo', 'human'), leit('person_generic', null, 'uso_none')],
  ['c827ec0d', 'amb', null, leit('none', null, 'uso_none')], ['1756cf2f', 'amb', null, leit('object', 'mirrors reflecting a room with past events')],
  ['01f42846', 'doc', null, leit('none', null, 'uso_none')], ['ddd42436', 'prot', prot('Daniel', 'human'), leit('none', null, 'pessoa_real')],
  ['09b4bb98', 'doc', null, leit('none', null, 'uso_none')], ['bf8989ad', 'doc', null, leit('none', null, 'uso_none')],
  ['42bcd59f', 'doc', null, leit('object', null, 'visual_com_maiuscula')], ['441c0b99', 'prot', prot('Lucas', 'human'), leit('none', null, 'uso_none')],
  ['76b00b37', 'doc', null, leit('creature', null, 'visual_com_maiuscula')], ['de85d652', 'prot', prot('Luca', 'human'), leit('none', null, 'uso_none')],
  ['98063aa2', 'prot-sem-sinal', null, leit('object', null, 'sujeito_sem_traducao')], ['20336e77', 'doc', null, leit('object', 'coffee beans transforming into grounds')],
  ['32c93ee3', 'prot', prot('Gabriel', 'human'), leit('none', null, 'pessoa_real')], ['d43f44b9', 'doc', null, leit('object', 'an apocalypse bunker')],
  ['d8bfd93d', 'doc', null, leit('object', 'a sealed wooden door in a medieval castle')], ['1794140d', 'prot', prot('Гарри Поттер', 'human'), leit('none', null, 'uso_none')],
  ['4134e784', 'doc', null, leit('object', null, 'visual_com_nome_do_subject')], ['40ab9efe', 'doc', null, leit('object', 'an ancient leather ball')],
  ['82a809d0', 'doc', null, leit('none', null, 'uso_none')], ['7f92fe17', 'prot', null, leit('creature', 'a ninja cat jumping across rooftops', null, 'cat')],
]

async function problemas(mut = {}) {
  const p = []
  const L = createOfflineLoader({ source: (rel, t) => { const k = rel.replace(/\\/g, '/'); return mut[k] ? mut[k](t) : t }, globals: { setTimeout, clearTimeout, AbortController } })
  const M = L(MOD), S = L(SUJ)
  if (M.PROTAGONISTA_1311 !== 'all' || !M.protagonistaLigado() || M.protagonistaLigado('off')) p.push(`(0) interruptor = ${M.PROTAGONISTA_1311}`)
  // (a) a régua nos 28 filmes reais
  const movidos = FACELESS.filter(([, , e, l]) => M.temProtagonista({ elenco: e, leitura: l }).sim).map(([g, r]) => `${g}:${r}`)
  const errados = movidos.filter((x) => !x.endsWith(':prot'))
  if (errados.length) p.push(`(a) mudaram sem ser história: ${errados.join(', ')}`)
  if (movidos.length !== 9) p.push(`(a) mudaram ${movidos.length} de 9 histórias com sinal: ${movidos.join(', ')}`)
  // (b) a rota
  const rota = mut[ROTA] ? mut[ROTA](ler(ROTA)) : ler(ROTA)
  const guarda = "const sinais1311 = protagonistaLigado() && !qualidadeHerdada && !tagFacelessPresente && !desenhoInfantil.ativo && formatoVisual.modo !== 'presenter' && formatoVisual.modo !== 'character_story' && !isStylizedLook(styleAnchor) && classifyEngineFit(prompt).verdict !== 'stock_cannot_tell'"
  if (!rota.includes(guarda)) p.push('(b) a rota lê os sinais fora do filme sem rosto (história, apresentador, [faceless], desenho infantil ou herdado)')
  if (!rota.includes("if (protagonista1311?.sim) formatoVisual.modo = 'character_story'")) p.push('(b) a rota não troca o modo')
  if (!rota.includes("const storyMode = isStylizedLook(styleAnchor) || formatoVisual.modo === 'character_story' || classifyEngineFit(prompt).verdict === 'stock_cannot_tell'")) p.push('(b) a linha do modo mudou')
  if (rota.indexOf('const sinais1311 =') > rota.indexOf('const storyMode = isStylizedLook')) p.push('(b) os sinais vêm depois do modo')
  if (!rota.includes('(sinais1311?.elencoBruto as Awaited<ReturnType<typeof pedirElencoSemantico>> | null | undefined) ?? await pedirElencoSemantico(prompt)')) p.push('(d) o elenco semântico lido antes do modo não é reaproveitado')
  if ((rota.match(/leituraPronta1311\(\)\)/g) ?? []).length !== 2) p.push('(d) a leitura do sujeito não é reaproveitada na estrada clássica e no Kling 4')
  if (!rota.includes('if (protagonista1311?.sim && elencoDoPedido.length === 0) { const fichaViva1311 = fichaDoSujeitoVivo(sinais1311?.leitura, pedidoDoCliente); if (fichaViva1311) elencoDoPedido.push(fichaViva1311) }')) p.push('(c) a história sem elenco não ganha a ficha do sujeito vivo')
  // (c) a ficha do sujeito vivo
  const gato = { ...leit('creature', 'a ninja cat jumping across rooftops', null, 'cat'), appearance: 'ginger' }
  const umaLinha = M.fichaDoSujeitoVivo(gato, 'рыжий кот ниндзя бежит по крышам как профисиналный супер ниндзя стиль пиксар')
  if (umaLinha?.canonica !== 'the cat, a ninja cat jumping across rooftops (ginger)' || umaLinha?.tipo !== 'animal' || umaLinha?.nome !== 'the cat') p.push(`(c) ideia de uma linha: ${umaLinha?.canonica}`)
  const longa = M.fichaDoSujeitoVivo(gato, 'Um gato ruivo vive na cidade. Ele treina ninjutsu todas as noites. Um dia ele salva um pombo no telhado.')
  if (longa?.canonica !== 'the cat, a ninja cat (ginger)') p.push(`(c) pedido longo deveria ficar só com a espécie: ${longa?.canonica}`)
  if (M.fichaDoSujeitoVivo(leit('object', 'an apocalypse bunker', null, 'bunker'), 'x') !== null) p.push('(c) objeto ganhou ficha de personagem')
  // (d) uma leitura do sujeito por filme
  let chamadas = 0
  const fetchImpl = async () => { chamadas++; return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) } }
  const pronta = { ok: true, valor: gato, ms: 1, model: 'x', tentativas: 1 }
  const r1 = await S.lerSujeitoDoPedido('рыжий  кот ниндзя ', { apiKey: 'k', fetchImpl, leituraPronta: { texto: 'рыжий кот ниндзя', resultado: pronta } })
  if (r1 !== pronta || chamadas !== 0) p.push('(d) a mesma leitura foi perguntada de novo')
  await S.lerSujeitoDoPedido('outro pedido', { apiKey: 'k', fetchImpl, tentativasExtras: 0, leituraPronta: { texto: 'рыжий кот ниндзя', resultado: pronta } })
  if (chamadas !== 1) p.push('(d) texto diferente não perguntou')
  // (e) nunca lança
  const sinais = await M.lerSinaisDoProtagonista('r', 't', { elenco: async () => { throw Error('x') }, sujeito: async () => { throw Error('y') } })
  if (sinais.elenco !== null || sinais.leitura !== null) p.push('(e) erro de leitura não virou sinal ausente')
  return p
}

const atual = await problemas()
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
console.log('ok  estado atual (28 sem rosto: 9 histórias mudam, 0 documentário, 0 ambíguo; rota no lugar; ficha viva; 1 leitura por filme)')
let ok = 1, falhas = 0
const troca = (de, para) => (t) => t.replace(de, para)
const MUTANTES = [
  ["M1 interruptor 'off'", { [MOD]: troca("PROTAGONISTA_1311: ModoProtagonista = 'all'", "PROTAGONISTA_1311: ModoProtagonista = 'off'") }],
  ['M2 sem o ramo do sujeito', { [MOD]: troca('if (sujeitoVivo(a.leitura)) return', 'if (false) return') }],
  ['M3 objeto conta como protagonista', { [MOD]: troca("new Set(['creature', 'person_generic'])", "new Set(['creature', 'person_generic', 'object'])") }],
  ['M4 rota não troca o modo', { [ROTA]: troca("if (protagonista1311?.sim) formatoVisual.modo = 'character_story'", 'void 0') }],
  ['M5 rota lê sinais em apresentador', { [ROTA]: troca(" && formatoVisual.modo !== 'presenter' && formatoVisual.modo !== 'character_story'", '') }],
  ['M6 elenco não reaproveitado', { [ROTA]: troca('(sinais1311?.elencoBruto as Awaited<ReturnType<typeof pedirElencoSemantico>> | null | undefined) ?? ', '') }],
  ['M7 ficha viva removida', { [ROTA]: troca('if (fichaViva1311) elencoDoPedido.push(fichaViva1311)', 'void fichaViva1311') }],
  ['M8 leitura pronta ignorada', { [SUJ]: troca('if (opts.leituraPronta && String(opts.leituraPronta.texto', 'if (false && String(opts.leituraPronta?.texto') }],
]
for (const [nome, mut] of MUTANTES) {
  const alvo = Object.entries(mut).every(([arq, fn]) => fn(ler(arq)) !== ler(arq))
  if (!alvo) { console.log(`FALHA ${nome}: alvo não encontrado`); falhas++; continue }
  const m = await problemas(mut)
  if (!m.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++; continue }
  console.log(`ok  ${nome}: vermelho (${m[0]})`); ok++
}
console.log(`${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
