// KINEO-JUIZ-DA-FOLHA-2411 — guardião que EXECUTA o módulo real (lib/cinematic/juizDaFolha2411.ts: o pedido, a leitura, a regra, o laço com uma folha nova)
// com a rede FALSA (o modelo e o gerador são funções do teste: nada sai da máquina, nenhum centavo), o trecho REAL da rota que julga as folhas e a
// admissão REAL da referência única.
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
// FOLHA-bolt.jpg: um robô alto, laranja, de olhos azuis grandes, com cabeça, focinho e orelhas de cachorro; render 3D de animação
const LEITURA_BOLT = { medium: 'cartoon_3d', characters: 1, traits: [{ trait: 'small', category: 'size', visible: 'no' }, { trait: 'round', category: 'shape', visible: 'no' }, { trait: 'orange', category: 'color', visible: 'yes' }, { trait: 'robot', category: 'species', visible: 'yes' }, { trait: 'big blue eyes', category: 'feature', visible: 'yes' }] }
// FOLHA-ember.jpg: dragão verde pequeno, corpo longo e escamado, chifres, asas laranja de morcego, garras, cauda com espinhos, olhos vivos; traços fiéis.
// O MEIO é a dúvida: eu o li como animação 3D (proporções de personagem, olhos grandes), num filme FOTORREAL (2a01a29c, look 'photoreal'). As duas leituras ficam abaixo.
const TRACOS_EMBER = [{ trait: 'small green dragon', category: 'species', visible: 'yes' }, { trait: 'long, slender scaled body', category: 'shape', visible: 'yes' }, { trait: 'horned reptilian head', category: 'feature', visible: 'yes' }, { trait: 'leathery bat-like wings are orange', category: 'feature', visible: 'yes' }, { trait: 'sharp claws', category: 'feature', visible: 'yes' }, { trait: 'long spiked tail', category: 'feature', visible: 'yes' }, { trait: 'bright, expressive eyes', category: 'feature', visible: 'yes' }]
const LEITURA_EMBER_REALISTA = { medium: 'photo_or_realistic_render', characters: 1, traits: TRACOS_EMBER }
const LEITURA_EMBER_CARTUM = { medium: 'cartoon_3d', characters: 1, traits: TRACOS_EMBER }
const resposta = o => JSON.stringify(o)

// O trecho REAL da rota que julga as folhas (logo depois do Map folhaDe), com a rede falsa.
function julgarNaRota(route, j, { email, folhaDe, elencoP, look = 'photoreal', infantil = false, candidato = true, herdada = null, ler, gerar }) {
  const ini = route.indexOf('      if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada && folhaDe.size > 0) {')
  assert.ok(ini > route.indexOf('const folhaDe = new Map<string, string>(') && ini < route.indexOf('if (qualitySnapshot) qualitySnapshot.characterReferences = Array.from(folhaDe'), 'o juiz julga a folha antes do retrato e das imagens-chave')
  const fim = route.indexOf('\n      }\n', ini) + 9
  const escopo = { juizDaFolhaLigado: j.juizDaFolhaLigado, JUIZ_DA_FOLHA_2411: j.JUIZ_DA_FOLHA_2411, user: { email }, kling4TrialCandidate: candidato, qualidadeHerdada: herdada, folhaDe, elencoP,
    julgarAFolha: j.julgarAFolha, isStylizedLook: s => s.look === 'animated3d' || s.look === 'anime' || s.look === 'illustration', styleAnchor: { look, lookPhrase: look === 'photoreal' ? 'photorealistic, ultra-detailed' : 'stylized 3D animated film look' },
    desenhoInfantil: { ativo: infantil }, lerAFolha: ler, generateCinematicSceneStill: gerar, promptDaFolha: (f) => 'Character reference sheet: ' + f.canonica, generationSeed: 7, aspectRequested: '9:16', folhasReprovadas2411: new Set(), juizDaFolhaRelato2411: null }
  const corpo = ts.transpile('return (async () => {\n' + route.slice(ini, fim) + '\nreturn { folhasReprovadas2411, juizDaFolhaRelato2411 } })()', { target: ts.ScriptTarget.ES2022 })
  return Function(...Object.keys(escopo).filter(k => k !== 'juizDaFolhaRelato2411'), 'let juizDaFolhaRelato2411 = null\n' + corpo)(...Object.keys(escopo).filter(k => k !== 'juizDaFolhaRelato2411').map(k => escopo[k]))
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

  // 4. a regra, nas duas folhas da prova 4
  const ler = o => j.lerLeituraDaFolha(resposta(o))
  igual(j.decidirDaFolha(ler(LEITURA_BOLT), false), { passa: false, motivo: 'forma_especie', ausentes: ['small', 'round'] }, 'Bolt: reprova em forma/espécie')
  igual(j.decidirDaFolha(ler(LEITURA_EMBER_REALISTA), true), { passa: true }, 'Ember lido como realista: passa')
  igual(j.decidirDaFolha(ler(LEITURA_EMBER_CARTUM), true), { passa: false, motivo: 'meio', ausentes: [] }, 'Ember lido como animação num filme fotorreal: reprova no meio')
  igual(j.decidirDaFolha(ler(LEITURA_EMBER_CARTUM), false), { passa: true }, 'a mesma folha num filme desenhado: passa')
  igual(j.decidirDaFolha(ler({ ...LEITURA_EMBER_REALISTA, characters: 2 }), true), { passa: false, motivo: 'mais_de_um', ausentes: [] })
  igual(j.decidirDaFolha(ler({ ...LEITURA_EMBER_REALISTA, traits: [...TRACOS_EMBER, { trait: 'orange wings', category: 'color', visible: 'no' }] }), true), { passa: false, motivo: 'traco', ausentes: ['orange wings'] })
  igual(j.decidirDaFolha(ler({ ...LEITURA_BOLT, traits: LEITURA_BOLT.traits.map(t => ({ ...t, visible: 'unclear' })) }), false), { passa: true }, '"unclear" não reprova')
  igual(j.decidirDaFolha(ler({ medium: 'photo_or_realistic_render', characters: 1, traits: [] }), false), { passa: false, motivo: 'meio', ausentes: [] }, 'foto num filme desenhado')
  assert.equal(j.instrucaoDaFolhaNova(j.decidirDaFolha(ler(LEITURA_BOLT), false), 'stylized 3D animated film look'), ' Exactly as the author wrote, clearly visible: small; round. Rendered in stylized 3D animated film look.')

  // 5. o laço: passa / folha nova que passa / reprova duas vezes / sem leitura / folha nova que não sai
  const fila = (...rs) => { const q = [...rs]; return async () => { const r = q.shift(); return r === undefined ? assert.fail('leitura a mais') : r } }
  const chamada = o => ({ leitura: o ? ler(o) : null, custoUsd: 0.001, erro: o ? null : 'resposta_ilegivel' })
  const gerou = []
  const gerar = url => async (instrucao) => { gerou.push(instrucao); return url }
  const args = (ficha, fotorreal) => ({ ficha, url: 'https://x.org/folha-1.png', filmeFotorreal: fotorreal, lookPhrase: fotorreal ? 'photorealistic' : 'stylized 3D animated film look' })
  igual(await j.julgarAFolha(args(EMBER, true), { ler: fila(chamada(LEITURA_EMBER_REALISTA)), gerar: gerar('https://x.org/nova.png') }), { url: 'https://x.org/folha-1.png', relato: { nome: 'Ember', veredito: 'passou', motivo: null, regerou: false, custo_usd: 0.001 } })
  gerou.length = 0
  igual(await j.julgarAFolha(args(BOLT, false), { ler: fila(chamada(LEITURA_BOLT), chamada({ ...LEITURA_BOLT, traits: LEITURA_BOLT.traits.map(t => ({ ...t, visible: 'yes' })) })), gerar: gerar('https://x.org/nova.png') }),
    { url: 'https://x.org/nova.png', relato: { nome: 'Bolt', veredito: 'passou_na_2a', motivo: null, regerou: true, custo_usd: 0.002 } }, 'Bolt: a folha nova serve')
  igual(gerou, [' Exactly as the author wrote, clearly visible: small; round. Rendered in stylized 3D animated film look.'], 'a folha nova leva o que faltou')
  igual(await j.julgarAFolha(args(BOLT, false), { ler: fila(chamada(LEITURA_BOLT), chamada(LEITURA_BOLT)), gerar: gerar('https://x.org/nova.png') }),
    { url: null, relato: { nome: 'Bolt', veredito: 'reprovada', motivo: 'forma_especie', regerou: true, custo_usd: 0.002 } }, 'reprovou de novo: não serve')
  igual(await j.julgarAFolha(args(BOLT, false), { ler: fila(chamada(null)), gerar: gerar('https://x.org/nova.png') }), { url: null, relato: { nome: 'Bolt', veredito: 'sem_leitura', motivo: null, regerou: false, custo_usd: 0.001 } }, 'não julgada = não serve')
  igual(await j.julgarAFolha(args(BOLT, false), { ler: fila(chamada(LEITURA_BOLT)), gerar: gerar(null) }), { url: null, relato: { nome: 'Bolt', veredito: 'reprovada', motivo: 'forma_especie', regerou: false, custo_usd: 0.001 } })
  igual(await j.julgarAFolha(args(BOLT, false), { ler: fila(chamada(LEITURA_BOLT)), gerar: gerar('http://inseguro.example/n.png') }), { url: null, relato: { nome: 'Bolt', veredito: 'reprovada', motivo: 'forma_especie', regerou: false, custo_usd: 0.001 } })
  igual(await j.julgarAFolha(args(BOLT, false), { ler: fila(chamada(LEITURA_BOLT), chamada(null)), gerar: gerar('https://x.org/nova.png') }), { url: null, relato: { nome: 'Bolt', veredito: 'reprovada', motivo: 'forma_especie', regerou: true, custo_usd: 0.002 } }, 'a 2ª sem leitura: não serve')

  // 6. a rota: a casa julga e a folha nova entra no lugar; reprovada vai para a lista; cliente, 'off', herdada e fora do filme grátis = nenhuma chamada
  { const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const leituras = [chamada(LEITURA_BOLT), chamada({ ...LEITURA_BOLT, traits: LEITURA_BOLT.traits.map(t => ({ ...t, visible: 'yes' })) })]
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [BOLT], look: 'animated3d', ler: async () => leituras.shift(), gerar: async () => 'https://x.org/folha-bolt-2.png' })
    assert.equal(folhaDe.get('Bolt'), 'https://x.org/folha-bolt-2.png', 'a folha nova é a folha do filme'); igual([...r.folhasReprovadas2411], [])
    igual(r.juizDaFolhaRelato2411.map(x => x.veredito), ['passou_na_2a']) }
  { const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [BOLT], look: 'animated3d', ler: async () => chamada(LEITURA_BOLT), gerar: async () => 'https://x.org/folha-bolt-2.png' })
    assert.equal(folhaDe.get('Bolt'), 'https://x.org/folha-bolt.png', 'reprovada: o caminho de hoje fica com a folha de hoje'); igual([...r.folhasReprovadas2411], ['Bolt']) }
  { const folhaDe = new Map([['Ember', 'https://x.org/folha-ember.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [EMBER], look: 'photoreal', ler: async () => chamada(LEITURA_EMBER_REALISTA), gerar: async () => assert.fail('não regera') })
    igual([...r.folhasReprovadas2411], []); assert.equal(folhaDe.get('Ember'), 'https://x.org/folha-ember.png') }
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
  [modulo, "  if (forma.length) return { passa: false, motivo: 'forma_especie', ausentes: forma }\n", ''], // o cachorro-robô passa como traço
  [modulo, "ausentes(['species', 'shape', 'size'])", "ausentes(['species'])"], // forma e tamanho não contam
  [modulo, "  if (outros.length) return { passa: false, motivo: 'traco', ausentes: outros }\n", ''],
  [modulo, "filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render'", 'false'], // o meio não conta
  [modulo, "filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render'", "filmeFotorreal ? l.meio === 'photo_or_realistic_render' : cartum"], // o meio ao contrário
  [modulo, "  if (l.personagens > 1) return { passa: false, motivo: 'mais_de_um', ausentes: [] }\n", ''],
  [modulo, "t.visivel === 'no' && cats.includes(t.categoria)", "t.visivel !== 'yes' && cats.includes(t.categoria)"], // "unclear" reprova
  [modulo, "  if (!r1.leitura) return fim(null, 'sem_leitura', null, false)", "  if (!r1.leitura) return fim(args.url, 'sem_leitura', null, false)"], // a folha não julgada serve
  [modulo, "return v2.passa ? fim(nova, 'passou_na_2a', null, true) : fim(null, 'reprovada', v2.motivo, true)", "return fim(nova, 'passou_na_2a', null, true)"], // a 2ª reprovada serve
  [modulo, "  if (!r2.leitura) return fim(null, 'reprovada', v1.motivo, true)\n", "  if (!r2.leitura) return fim(nova, 'passou_na_2a', null, true)\n"],
  [modulo, "Exactly as the author wrote, clearly visible: ${v.ausentes.join('; ')}.", 'Better character.'], // a folha nova não sabe o que faltou
  [modulo, '  if (autor && limpa(autor)) return limpa(autor)\n', ''], // o juiz lê a nossa linha de estilo
  [modulo, ".filter((r) => !reprovadas.has(r?.nome))", ''], // a admissão lê a folha reprovada
  [modulo, ".filter((s) => !(Array.isArray(s?.characterNames) && s.characterNames.some((n) => reprovadas.has(n))))", ''], // a imagem-chave da folha reprovada vira referência
  [routeFile, '        for (const j of julgadas) { if (j.url) folhaDe.set(j.relato.nome, j.url); else folhasReprovadas2411.add(j.relato.nome) }', '        for (const j of julgadas) { if (j.url) folhaDe.set(j.relato.nome, j.url) }'], // a rota esquece a reprovada
  [routeFile, '        for (const j of julgadas) { if (j.url) folhaDe.set(j.relato.nome, j.url); else', '        for (const j of julgadas) { if (false) folhaDe.set(j.relato.nome, j.url); else'], // a folha nova não entra
  [routeFile, 'if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada', 'if (kling4TrialCandidate && !qualidadeHerdada'], // o cliente paga a leitura
  [routeFile, 'filmeFotorreal: !isStylizedLook(styleAnchor) && !desenhoInfantil.ativo,', 'filmeFotorreal: true,'], // o meio do filme ignorado
]
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-JUIZ-DA-FOLHA-2411: 'internal' (só a casa exata); Bolt (prova 4) reprova em forma/espécie (small, round) e a folha nova leva o que faltou; Ember passa nos traços (no meio, depende da leitura do modelo); reprovada 2x ou sem leitura = a admissão não a lê; cliente, 'off', herdada e fora do grátis = nenhuma chamada; ${mortos}/${mutants.length} mutantes mortos.`)
