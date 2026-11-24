// KINEO-JUIZ-DA-FOLHA-2411 — guardião que EXECUTA o módulo real (lib/cinematic/juizDaFolha2411.ts: o pedido, a leitura, a regra por eixo, o laço com uma folha
// nova e a tolerância do meio) com a rede FALSA (o modelo e o gerador são funções do teste: nada sai da máquina, nenhum centavo), o trecho REAL da rota que
// julga as folhas e a admissão REAL da referência única.
// As LEITURAS das duas folhas da prova paga 4 (docs/canais/2026-11-24/prova-4: FOLHA-bolt.jpg e FOLHA-ember.jpg) são o que eu (Opus 5.5) vi nas imagens,
// escritas no formato que o modelo devolve. Elas provam a REGRA, não o gpt-4o-mini: o que o modelo de produção diria de cada imagem só o
// scripts/ensaio-juiz-da-folha-2411.mjs prova (precisa da chave; ~US$ 0,002; quem roda é a CEO).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const modulo = 'lib/cinematic/juizDaFolha2411.ts'
const routeFile = 'app/api/generate-video-cinematic/route.ts'
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
const load = source => createOfflineLoader({ source, globals: { AbortSignal } })
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'

const BOLT = { nome: 'Bolt', nucleo: 'Bolt', tipo: 'criatura', protagonista: true, canonica: 'Bolt, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic), the same character design in every scene' }
const EMBER = { nome: 'Ember', nucleo: 'Ember', tipo: 'criatura', protagonista: true, canonica: 'Ember, a small green dragon with a long, slender scaled body and a horned reptilian head. Her leathery bat-like wings are orange, and she has sharp claws and a long spiked tail. A distinctive feature is her bright, expressive eyes; a living creature filmed in photorealistic live action, with real textures, weight and natural light' }
const ELIAS = { nome: 'Elias', nucleo: 'Elias', tipo: 'humano', protagonista: true, canonica: 'Elias, exactly as the author wrote: "gray-bearded lighthouse keeper in a navy coat"; a real person filmed in photorealistic live action' }
// FOLHA-bolt.jpg: um robô alto, laranja, de olhos azuis grandes, com cabeça, focinho e orelhas de cachorro; render 3D de animação
const LEITURA_BOLT = { medium: 'cartoon_3d', characters: 1, traits: [{ trait: 'small', category: 'size', visible: 'no' }, { trait: 'round', category: 'shape', visible: 'no' }, { trait: 'orange', category: 'color', visible: 'yes' }, { trait: 'robot', category: 'species', visible: 'yes' }, { trait: 'big blue eyes', category: 'feature', visible: 'yes' }] }
const BOLT_CERTO = { ...LEITURA_BOLT, traits: LEITURA_BOLT.traits.map(t => ({ ...t, visible: 'yes' })) }
// FOLHA-ember.jpg: dragão verde pequeno, corpo longo e escamado, chifres, asas laranja de morcego, garras, cauda com espinhos, olhos vivos; traços fiéis.
// O MEIO é a dúvida: eu o li como animação 3D, num filme FOTORREAL (2a01a29c, look 'photoreal'). As duas leituras ficam abaixo.
const TRACOS_EMBER = [{ trait: 'small green dragon', category: 'species', visible: 'yes' }, { trait: 'long, slender scaled body', category: 'shape', visible: 'yes' }, { trait: 'horned reptilian head', category: 'feature', visible: 'yes' }, { trait: 'leathery bat-like wings are orange', category: 'feature', visible: 'yes' }, { trait: 'sharp claws', category: 'feature', visible: 'yes' }, { trait: 'long spiked tail', category: 'feature', visible: 'yes' }, { trait: 'bright, expressive eyes', category: 'feature', visible: 'yes' }]
const EMBER_REALISTA = { medium: 'photo_or_realistic_render', characters: 1, traits: TRACOS_EMBER }
const EMBER_CARTUM = { medium: 'cartoon_3d', characters: 1, traits: TRACOS_EMBER }
const ELIAS_DESENHO = { medium: 'cartoon_2d', characters: 1, traits: [{ trait: 'gray-bearded', category: 'feature', visible: 'yes' }, { trait: 'navy coat', category: 'clothing', visible: 'yes' }] }
const resposta = o => JSON.stringify(o)

// O trecho REAL da rota que julga as folhas (logo depois do Map folhaDe), com a rede falsa.
function julgarNaRota(route, j, { email, folhaDe, elencoP, look = 'photoreal', infantil = false, candidato = true, herdada = null, ler, gerar }) {
  const ini = route.indexOf('      if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada && folhaDe.size > 0) {')
  assert.ok(ini > route.indexOf('const folhaDe = new Map<string, string>(') && ini < route.indexOf('if (qualitySnapshot) qualitySnapshot.characterReferences = Array.from(folhaDe'), 'o juiz julga a folha antes do retrato e das imagens-chave')
  const fim = route.indexOf('\n      }\n', ini) + 9
  const escopo = { juizDaFolhaLigado: j.juizDaFolhaLigado, JUIZ_DA_FOLHA_2411: j.JUIZ_DA_FOLHA_2411, user: { email }, kling4TrialCandidate: candidato, qualidadeHerdada: herdada, folhaDe, elencoP,
    julgarAFolha: j.julgarAFolha, isStylizedLook: s => s.look === 'animated3d' || s.look === 'anime' || s.look === 'illustration', styleAnchor: { look, lookPhrase: look === 'photoreal' ? 'photorealistic, ultra-detailed' : 'stylized 3D animated film look' },
    desenhoInfantil: { ativo: infantil }, lerAFolha: ler, generateCinematicSceneStill: gerar, promptDaFolha: (f) => 'Character reference sheet: ' + f.canonica, generationSeed: 7, aspectRequested: '9:16', folhasReprovadas2411: new Set() }
  const corpo = ts.transpile('return (async () => {\n' + route.slice(ini, fim) + '\nreturn { folhasReprovadas2411, juizDaFolhaRelato2411 } })()', { target: ts.ScriptTarget.ES2022 })
  return Function(...Object.keys(escopo), 'let juizDaFolhaRelato2411 = null\n' + corpo)(...Object.values(escopo))
}

async function suite(change) {
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const source = (file, src) => change && file === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const j = load(source)('@/' + modulo)
  const route = source(routeFile, local(routeFile))

  // 1. o interruptor: 'internal' = só a lista exata da casa
  assert.equal(j.JUIZ_DA_FOLHA_2411, 'internal')
  assert.equal(j.juizDaFolhaLigado('internal', CASA), true)
  for (const e of [CLIENTE, 'joseph@usekineo.com', 'xjosephsskaf@gmail.com', '', null]) assert.equal(j.juizDaFolhaLigado('internal', e), false, String(e))
  assert.equal(j.juizDaFolhaLigado('off', CASA), false)

  // 2. o pedido: só observação, sem exemplo, a descrição do AUTOR (não a nossa linha de estilo)
  assert.equal(j.descricaoParaOJuiz(BOLT), 'small round orange robot with big blue eyes')
  assert.ok(j.descricaoParaOJuiz(EMBER).startsWith('a small green dragon') && !/photorealistic|filmed/.test(j.descricaoParaOJuiz(EMBER)), 'sem a linha de estilo nossa')
  const p = JSON.stringify(j.pedidoAoJuizDaFolha('small round orange robot', 'https://x.org/f.png').messages)
  assert.ok(!/e\.g\.|for example|such as|like this|FAIL|reject/i.test(p), 'sem exemplo e sem ordem de reprovar')
  assert.ok(p.includes('small round orange robot') && p.includes('https://x.org/f.png'))

  // 3. a leitura: campo a campo; fora do formato = null
  igual(j.lerLeituraDaFolha(resposta(LEITURA_BOLT)), { meio: 'cartoon_3d', personagens: 1, tracos: LEITURA_BOLT.traits.map(t => ({ traco: t.trait, categoria: t.category, visivel: t.visible })) })
  for (const ruim of ['', 'nada', '{}', resposta({ ...LEITURA_BOLT, medium: 'painting' }), resposta({ ...LEITURA_BOLT, characters: '1' }), resposta({ ...LEITURA_BOLT, traits: null })]) assert.equal(j.lerLeituraDaFolha(ruim), null, ruim)
  assert.equal(j.lerLeituraDaFolha(resposta({ ...LEITURA_BOLT, traits: [{ trait: 'x', category: 'mood', visible: 'yes' }, { trait: 'y', category: 'color', visible: 'maybe' }] })).tracos.length, 0, 'traço fora do formato some')

  // 4. a regra POR EIXO, nas folhas da prova 4
  const ler = o => j.lerLeituraDaFolha(resposta(o))
  igual(j.decidirDaFolha(ler(LEITURA_BOLT), false), { tracos: 'forma_especie', meio: 'ok', ausentes: ['small', 'round'] }, 'Bolt: reprova em forma/espécie')
  igual(j.decidirDaFolha(ler(EMBER_REALISTA), true), { tracos: 'ok', meio: 'ok', ausentes: [] }, 'Ember lido como realista: passa')
  igual(j.decidirDaFolha(ler(EMBER_CARTUM), true), { tracos: 'ok', meio: 'meio', ausentes: [] }, 'Ember lido como animação num filme fotorreal: traços certos, meio errado')
  igual(j.decidirDaFolha(ler(EMBER_CARTUM), false), { tracos: 'ok', meio: 'ok', ausentes: [] }, 'a mesma folha num filme desenhado: passa')
  igual(j.decidirDaFolha(ler({ ...EMBER_REALISTA, characters: 2 }), true), { tracos: 'mais_de_um', meio: 'ok', ausentes: [] })
  igual(j.decidirDaFolha(ler({ ...EMBER_REALISTA, traits: [...TRACOS_EMBER, { trait: 'orange wings', category: 'color', visible: 'no' }] }), true), { tracos: 'traco', meio: 'ok', ausentes: ['orange wings'] })
  igual(j.decidirDaFolha(ler({ ...LEITURA_BOLT, traits: LEITURA_BOLT.traits.map(t => ({ ...t, visible: 'unclear' })) }), false), { tracos: 'ok', meio: 'ok', ausentes: [] }, '"unclear" não reprova')
  igual(j.decidirDaFolha(ler({ medium: 'photo_or_realistic_render', characters: 1, traits: [] }), false), { tracos: 'ok', meio: 'meio', ausentes: [] }, 'foto num filme desenhado')
  igual(j.decidirDaFolha(ler({ ...LEITURA_BOLT, medium: 'photo_or_realistic_render' }), false), { tracos: 'forma_especie', meio: 'meio', ausentes: ['small', 'round'] }, 'os dois eixos juntos')
  assert.equal(j.instrucaoDaFolhaNova(j.decidirDaFolha(ler(LEITURA_BOLT), false), 'stylized 3D animated film look'), ' Exactly as the author wrote, clearly visible: small; round. Rendered in stylized 3D animated film look.')
  assert.equal(j.instrucaoDaFolhaNova(j.decidirDaFolha(ler(EMBER_CARTUM), true), 'photorealistic, ultra-detailed'), ' Rendered in photorealistic, ultra-detailed.', 'só o meio: a folha nova pede o meio do filme')

  // 5. o laço e a tolerância
  const fila = (...rs) => { const q = [...rs]; return async () => { const r = q.shift(); return r === undefined ? assert.fail('leitura a mais') : r } }
  const chamada = o => ({ leitura: o ? ler(o) : null, custoUsd: 0.001, erro: o ? null : 'resposta_ilegivel' })
  const gerou = []
  const gerar = url => async (instrucao) => { gerou.push(instrucao); return url }
  const args = (ficha, fotorreal) => ({ ficha, url: 'https://x.org/folha-1.png', filmeFotorreal: fotorreal, lookPhrase: fotorreal ? 'photorealistic' : 'stylized 3D animated film look' })
  const NOVA = 'https://x.org/nova.png'
  const caso = async (ficha, fotorreal, leituras, url = NOVA) => { const r = await j.julgarAFolha(args(ficha, fotorreal), { ler: fila(...leituras.map(chamada)), gerar: gerar(url) }); return [r.url, r.relato] }
  const rel = (o) => ({ tipo: 'criatura', tracos: 'ok', meio: 'ok', serve: true, tentativa: 1, regerou: false, custo_usd: 0.001, ...o })
  igual(await caso(EMBER, true, [EMBER_REALISTA]), ['https://x.org/folha-1.png', rel({})], 'passa de primeira')
  gerou.length = 0
  igual(await caso(BOLT, false, [LEITURA_BOLT, BOLT_CERTO]), [NOVA, rel({ tentativa: 2, regerou: true, custo_usd: 0.002 })], 'Bolt: a folha nova serve')
  igual(gerou, [' Exactly as the author wrote, clearly visible: small; round. Rendered in stylized 3D animated film look.'], 'a folha nova leva o que faltou')
  igual(await caso(BOLT, false, [LEITURA_BOLT, LEITURA_BOLT]), [null, rel({ tracos: 'forma_especie', serve: false, tentativa: null, regerou: true, custo_usd: 0.002 })], 'traços reprovados 2 vezes: não serve (sem tolerância)')
  // [CEO 24/11] a tolerância do meio: só na 2ª, só traços certos, só bicho e criatura, só filme fotorreal
  igual(await caso(EMBER, true, [EMBER_CARTUM, EMBER_CARTUM]), [NOVA, rel({ meio: 'meio_tolerado', tentativa: 2, regerou: true, custo_usd: 0.002 })], 'criatura em animação num filme de foto: serve, meio_tolerado')
  igual(await caso({ ...EMBER, tipo: 'animal' }, true, [EMBER_CARTUM, EMBER_CARTUM]), [NOVA, rel({ tipo: 'animal', meio: 'meio_tolerado', tentativa: 2, regerou: true, custo_usd: 0.002 })], 'bicho: idem')
  igual(await caso(ELIAS, true, [ELIAS_DESENHO, ELIAS_DESENHO]), [null, rel({ tipo: 'humano', meio: 'meio', serve: false, tentativa: null, regerou: true, custo_usd: 0.002 })], 'pessoa em desenho num filme de foto: não serve')
  igual(await caso(EMBER, false, [{ ...EMBER_REALISTA }, { ...EMBER_REALISTA }]), [null, rel({ meio: 'meio', serve: false, tentativa: null, regerou: true, custo_usd: 0.002 })], 'folha foto num filme desenhado: não serve, nunca')
  igual(await caso(EMBER, true, [EMBER_CARTUM, { ...EMBER_CARTUM, traits: [...TRACOS_EMBER, { trait: 'orange wings', category: 'color', visible: 'no' }] }]), [null, rel({ tracos: 'traco', meio: 'meio', serve: false, tentativa: null, regerou: true, custo_usd: 0.002 })], 'meio e traço na 2ª: não serve')
  igual(await caso(EMBER, true, [EMBER_CARTUM, EMBER_REALISTA]), [NOVA, rel({ tentativa: 2, regerou: true, custo_usd: 0.002 })], 'a folha nova saiu no meio do filme')
  // sem leitura, folha nova que não sai
  igual(await caso(BOLT, false, [null]), [null, rel({ tracos: 'sem_leitura', meio: 'sem_leitura', serve: false, tentativa: null })], 'não julgada = não serve')
  igual(await caso(BOLT, false, [LEITURA_BOLT, null]), [null, rel({ tracos: 'sem_leitura', meio: 'sem_leitura', serve: false, tentativa: null, regerou: true, custo_usd: 0.002 })], 'a 2ª sem leitura: não serve')
  igual(await caso(BOLT, false, [LEITURA_BOLT], null), [null, rel({ tracos: 'forma_especie', serve: false, tentativa: null })], 'a folha nova não saiu')
  igual(await caso(BOLT, false, [LEITURA_BOLT], 'http://inseguro.example/n.png'), [null, rel({ tracos: 'forma_especie', serve: false, tentativa: null })])
  igual(Object.keys((await j.julgarAFolha(args(BOLT, false), { ler: fila(chamada(BOLT_CERTO)), gerar: gerar(NOVA) })).relato), ['tipo', 'tracos', 'meio', 'serve', 'tentativa', 'regerou', 'custo_usd'], 'o claim: só código e número (nenhum nome, nenhum texto)')

  // 6. a rota: a casa julga e a folha nova entra no lugar; reprovada vai para a lista; cliente, 'off', herdada e fora do filme grátis = nenhuma chamada
  { const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const leituras = [chamada(LEITURA_BOLT), chamada(BOLT_CERTO)]
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [BOLT], look: 'animated3d', ler: async () => leituras.shift(), gerar: async () => 'https://x.org/folha-bolt-2.png' })
    assert.equal(folhaDe.get('Bolt'), 'https://x.org/folha-bolt-2.png', 'a folha nova é a folha do filme'); igual([...r.folhasReprovadas2411], [])
    igual(r.juizDaFolhaRelato2411.map(x => [x.tentativa, x.serve]), [[2, true]]) }
  { const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [BOLT], look: 'animated3d', ler: async () => chamada(LEITURA_BOLT), gerar: async () => 'https://x.org/folha-bolt-2.png' })
    assert.equal(folhaDe.get('Bolt'), 'https://x.org/folha-bolt.png', 'reprovada: o caminho de hoje fica com a folha de hoje'); igual([...r.folhasReprovadas2411], ['Bolt']) }
  { const folhaDe = new Map([['Ember', 'https://x.org/folha-ember.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [EMBER], look: 'photoreal', ler: async () => chamada(EMBER_CARTUM), gerar: async () => 'https://x.org/folha-ember-2.png' })
    igual([...r.folhasReprovadas2411], [], 'Ember: meio tolerado, serve'); assert.equal(folhaDe.get('Ember'), 'https://x.org/folha-ember-2.png'); assert.equal(r.juizDaFolhaRelato2411[0].meio, 'meio_tolerado') }
  { const folhaDe = new Map([['Elias', 'https://x.org/folha-elias.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [ELIAS], look: 'photoreal', ler: async () => chamada(ELIAS_DESENHO), gerar: async () => 'https://x.org/folha-elias-2.png' })
    igual([...r.folhasReprovadas2411], ['Elias'], 'pessoa em desenho: não serve') }
  { const folhaDe = new Map([['Ember', 'https://x.org/folha-ember.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [EMBER], look: 'animated3d', ler: async () => chamada(EMBER_REALISTA), gerar: async () => 'https://x.org/folha-ember-2.png' })
    igual([...r.folhasReprovadas2411], ['Ember'], 'filme desenhado (o look da rota), folha foto: não serve') }
  for (const [nome, o] of [['cliente', { email: CLIENTE }], ['herdada', { email: CASA, herdada: {} }], ['fora do grátis', { email: CASA, candidato: false }]]) {
    const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const r = await julgarNaRota(route, j, { folhaDe, elencoP: [BOLT], ler: async () => assert.fail(nome + ': nenhuma leitura'), gerar: async () => assert.fail(nome + ': nenhuma folha'), ...o })
    assert.equal(r.juizDaFolhaRelato2411, null, nome); assert.equal(r.folhasReprovadas2411.size, 0, nome)
  }
  { const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const r = await julgarNaRota(route, { ...j, JUIZ_DA_FOLHA_2411: 'off' }, { email: CASA, folhaDe, elencoP: [BOLT], ler: async () => assert.fail('off: nenhuma leitura'), gerar: async () => assert.fail('off') })
    assert.equal(r.juizDaFolhaRelato2411, null) }

  // 7. o retrato da admissão sem a folha reprovada (e sem a imagem-chave dela): nada reprovado = o MESMO objeto
  const snap = { version: 'v', sourceGenerationId: 'x', characters: [BOLT], characterReferences: [{ nome: 'Bolt', url: 'https://x.org/f.png' }], approvedStills: [{ url: 'https://x.org/k.png', characterNames: ['Bolt'] }, { url: 'https://x.org/k2.png', characterNames: ['Zip'] }] }
  assert.equal(j.retratoSemFolhaReprovada2411(snap, new Set()), snap); assert.equal(j.retratoSemFolhaReprovada2411(snap, null), snap); assert.equal(j.retratoSemFolhaReprovada2411(null, new Set(['Bolt'])), null)
  const sem = j.retratoSemFolhaReprovada2411(snap, new Set(['Bolt']))
  igual([sem.characterReferences, sem.approvedStills.map(s => s.url)], [[], ['https://x.org/k2.png']]); igual(snap.characterReferences.length, 1, 'o retrato do filme não muda')
  assert.ok(route.includes('retratoSemFolhaReprovada2411(retratoDaReferencia2411(qualitySnapshot, folhasDaReferencia2411, folhaDaReferenciaLigada(FOLHA_DA_REFERENCIA_2411, user.email)), folhasReprovadas2411)'), 'a admissão lê o retrato sem a folha reprovada')
  assert.ok(route.includes('...(juizDaFolhaRelato2411 ? { kling4_juiz_da_folha: { versao: JUIZ_DA_FOLHA_2411_VERSAO, folhas: juizDaFolhaRelato2411 } } : {})'), 'o claim conta o juiz (só quando rodou)')
}

await suite(null)
const mutants = [
  [modulo, "export const JUIZ_DA_FOLHA_2411: ModoJuizDaFolha2411 = 'internal'", "export const JUIZ_DA_FOLHA_2411: ModoJuizDaFolha2411 = 'public'"], // escapa para o cliente
  [modulo, "modo === 'internal' && contaDaCasaExata(email)", "modo === 'internal'"],
  [modulo, "l.personagens > 1 ? 'mais_de_um' : forma.length ? 'forma_especie' :", "l.personagens > 1 ? 'mais_de_um' :"], // o cachorro-robô vira só traço
  [modulo, "ausentes(['species', 'shape', 'size'])", "ausentes(['species'])"], // forma e tamanho não contam
  [modulo, "outros.length ? 'traco' : 'ok'", "'ok'"],
  [modulo, "(filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render') ? 'meio' : 'ok'", "'ok'"], // o meio não conta
  [modulo, "(filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render') ? 'meio' : 'ok'", "(filmeFotorreal ? l.meio === 'photo_or_realistic_render' : cartum) ? 'meio' : 'ok'"], // o meio ao contrário
  [modulo, "l.personagens > 1 ? 'mais_de_um' : ", ''],
  [modulo, "t.visivel === 'no' && cats.includes(t.categoria)", "t.visivel !== 'yes' && cats.includes(t.categoria)"], // "unclear" reprova
  [modulo, "  if (!r1.leitura) return fim(null, null, null, null, false)", "  if (!r1.leitura) return fim(args.url, null, null, 1, false)"], // a folha não julgada serve
  [modulo, "  if (!r2.leitura) return fim(null, null, null, null, true)\n", "  if (!r2.leitura) return fim(nova, null, null, 2, true)\n"],
  [modulo, "  return fim(null, v2, null, null, true)\n}", "  return fim(nova, v2, null, 2, true)\n}"], // a 2ª reprovada serve
  // a tolerância, eixo a eixo
  [modulo, "v2.tracos === 'ok' && v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')", "v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')"], // tolera traço errado
  [modulo, "v2.tracos === 'ok' && v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')", "v2.tracos === 'ok' && v2.meio === 'meio' && (tipo === 'animal' || tipo === 'criatura')"], // tolera foto em filme desenhado
  [modulo, "v2.tracos === 'ok' && v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')", "v2.tracos === 'ok' && v2.meio === 'meio' && args.filmeFotorreal"], // tolera pessoa em desenho
  [modulo, "v2.tracos === 'ok' && v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')", "false"], // sem tolerância (o Ember perde a referência)
  [modulo, "return fim(nova, v2, 'meio_tolerado', 2, true)", "return fim(nova, v2, null, 2, true)"], // o claim não diz que tolerou
  [modulo, "Exactly as the author wrote, clearly visible: ${v.ausentes.join('; ')}.", 'Better character.'], // a folha nova não sabe o que faltou
  [modulo, " Rendered in ${limpa(lookPhrase) || 'the film\\'s own look'}.", ''], // a folha nova não pede o meio
  [modulo, '  if (autor && limpa(autor)) return limpa(autor)\n', ''], // o juiz lê a nossa linha de estilo
  [modulo, ".filter((r) => !reprovadas.has(r?.nome))", ''], // a admissão lê a folha reprovada
  [modulo, ".filter((s) => !(Array.isArray(s?.characterNames) && s.characterNames.some((n) => reprovadas.has(n))))", ''], // a imagem-chave da folha reprovada vira referência
  [modulo, 'relato: { tipo, tracos:', 'relato: { nome: args.ficha.nome, tipo, tracos:'], // nome no claim
  [routeFile, '        for (const j of julgadas) { if (j.url) folhaDe.set(j.nome, j.url); else folhasReprovadas2411.add(j.nome) }', '        for (const j of julgadas) { if (j.url) folhaDe.set(j.nome, j.url) }'], // a rota esquece a reprovada
  [routeFile, '        for (const j of julgadas) { if (j.url) folhaDe.set(j.nome, j.url); else', '        for (const j of julgadas) { if (false) folhaDe.set(j.nome, j.url); else'], // a folha nova não entra
  [routeFile, 'if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada', 'if (kling4TrialCandidate && !qualidadeHerdada'], // o cliente paga a leitura
  [routeFile, 'filmeFotorreal: !isStylizedLook(styleAnchor) && !desenhoInfantil.ativo,', 'filmeFotorreal: true,'], // o meio do filme ignorado
]
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-JUIZ-DA-FOLHA-2411: 'internal' (só a casa exata); por eixo (traços, meio); Bolt (prova 4) reprova em forma/espécie e a folha nova leva o que faltou; meio tolerado só para bicho e criatura em filme fotorreal com traços certos (Ember); pessoa em desenho e foto em filme desenhado não servem; reprovada ou sem leitura = a admissão não a lê; cliente, 'off', herdada e fora do grátis = nenhuma chamada; claim só com código e número; ${mortos}/${mutants.length} mutantes mortos.`)
