// KINEO-FOLHA-DA-REFERENCIA-2411 — guardião que EXECUTA: o módulo real (lib/cinematic/folhaDaReferencia2411.ts), os dois trechos reais da rota (onde a
// folha é guardada para a referência e a admissão da referência única) e o montador real (lib/kling4Trial.ts, POST com fetch falso: nada sai da máquina).
// Dados: os vereditos REAIS do crítico (eventos cinematic_still_critic, path_kind 'personagem') dos 3 filmes da casa de 24/11 à tarde em que a folha foi
// descartada: 9d1255bb (Bolt, robô em desenho 3D), 99b64dde (Ember, dragão fotorreal), cedd1250 (Elias e Mara, duas pessoas fotorreais).
// O que NÃO roda aqui: a geração da folha, o edit das imagens-chave e o crítico (rede paga). Só um render pago prova que a folha mantida segura o personagem.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const modulo = 'lib/cinematic/folhaDaReferencia2411.ts'
const feature = 'lib/cinematic/referenciaUnica2411.ts'
const transport = 'lib/kling4Trial.ts'
const routeFile = 'app/api/generate-video-cinematic/route.ts'
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
const load = source => createOfflineLoader({ source, globals: { AbortSignal } })
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m) // objetos de outro realm (o carregador)
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'

// [cena, veredito, problemas, regerou, regeracao_ok, veredito_regerada, problemas_regerada] — como gravado
const CRITICO = {
  '9d1255bb': [[1, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['identidade', 'estilo']], [2, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['identidade', 'estilo']], [3, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['identidade', 'estilo']]],
  '99b64dde': [[1, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['identidade', 'estilo']], [2, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['identidade', 'estilo']], [3, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['identidade', 'estilo']]],
  'cedd1250': [[1, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['estilo']], [2, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['identidade', 'estilo']], [3, 'PASS', [], false, null, null, null]],
}
const relatoDe = ([cena, veredito, problemas, regerou, regeracao_ok, veredito_regerada, problemas_regerada]) =>
  ({ cena, veredito, problemas, regerou, regeracao_ok, veredito_regerada, problemas_regerada, nota: veredito === 'PASS' ? 95 : 20, nota_regerada: regerou ? 20 : null, escolhida: 'original' })
const relatos = id => CRITICO[id].map(relatoDe)
// o Krishna de 27/10 (juizFicha.ts, cabeçalho): a identidade reprovada SEM estilo = a folha de outro personagem
const KRISHNA = [[1, 'FAIL', ['identidade'], true, true, 'FAIL', ['identidade']], [2, 'FAIL', ['identidade'], true, true, 'FAIL', ['identidade']]].map(relatoDe)

const FOLHA = id => `https://example.org/offline/folha-${id}.png`
const ELENCO = {
  '9d1255bb': { look: 'animated3d', characters: [{ nome: 'Bolt', nucleo: 'Bolt', tipo: 'criatura', protagonista: true, canonica: 'Bolt, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic), the same character design in every scene' }],
    planos: ['3D animated film. Identity: Bolt, exactly as the author wrote: "small round orange robot with big blue eyes". Bolt rolls through a gray junkyard, surrounded by piles of scrap.', '3D animated film. Close-up. Bolt lifts a rusty gear with both arms.', '3D animated film. Wide shot. A tall heap of scrap metal under the morning sun.'] },
  '99b64dde': { look: 'photoreal', characters: [{ nome: 'Ember', nucleo: 'Ember', tipo: 'criatura', protagonista: true, canonica: 'Ember, a small green dragon with a long, slender scaled body and a horned reptilian head; a living creature filmed in photorealistic live action, with real textures, weight and natural light' }],
    planos: ['Photoreal film. Wide shot. Identity: Ember, a small green dragon. Ember sits forlornly on a snowy mountain ledge.', 'Photoreal film. Ember spreads her orange wings over the valley.', 'Photoreal film. Ember breathes fire into the night sky.'] },
  'cedd1250': { look: 'photoreal', characters: [{ nome: 'Elias', nucleo: 'Elias', tipo: 'humano', protagonista: true, canonica: 'Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; a real person filmed in photorealistic live action' },
    { nome: 'Mara', nucleo: 'Mara', tipo: 'humano', protagonista: false, canonica: 'Mara, caught a faint call on the radio, exactly as the author wrote; a real person filmed in photorealistic live action' }],
    planos: ['Photoreal film. Elias climbs the spiral stairs of the old lighthouse.', 'Photoreal film. Mara leans over a crackling radio.', 'Photoreal film. Elias and Mara light the great lamp together.'] },
}
// o retrato como a rota o deixa hoje com a folha descartada: characterReferences vazio; imagem-chave nenhuma aprovada
const retratoDescartado = id => ({ version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: ELENCO[id].characters, characterReferences: [], approvedStills: [] })
const folhasDe = id => ELENCO[id].characters.map((c, i) => ({ nome: c.nome, url: FOLHA(id + '-' + i) }))
const timingDe = planos => ({ voiceovers: planos.map(() => 'one two three four five'), wordsPerSecond: 1, pelaVoz: { segundosDaVoz: 15 } })

// O trecho REAL da rota que guarda as folhas (logo depois de folhaDescartada).
function guardarFolhas(route, fr, relatosP, folhaDe) {
  const ini = route.indexOf('      if (folhaServeAReferencia2411(relatosP)) folhasDaReferencia2411 =')
  assert.ok(ini > 0 && ini > route.indexOf('const folhaDescartada = folhaErrada('), 'o guardar das folhas tem de vir depois do descarte')
  const fim = route.indexOf('\n', ini)
  return Function('folhaServeAReferencia2411', 'relatosP', 'folhaDe', 'let folhasDaReferencia2411 = []\n' + ts.transpile(route.slice(ini, fim)) + '\nreturn folhasDaReferencia2411')(fr.folhaServeAReferencia2411, relatosP, folhaDe)
}
// A admissão REAL da rota (o mesmo trecho que scripts/test-referencia-unica-2411.mjs executa).
function admitir(route, f, fr, vp, { email, snapshot, folhas, look = 'photoreal' }) {
  const ini = route.indexOf("if (!kling4Timing.fixedCharacter && kling4TrialCandidate && REFERENCIA_UNICA_2411 !== 'off') {")
  const fim = route.indexOf('// KINEO-K4-SUJEITO-0111 — revisor 01/11', ini)
  assert.ok(ini > 0 && fim > ini && route.indexOf('let folhasDaReferencia2411') < ini, 'admissão não achada, ou antes das folhas')
  const kling4Timing = { voiceovers: [], wordsPerSecond: 2 }
  Function('kling4Timing', 'kling4TrialCandidate', 'REFERENCIA_UNICA_2411', 'user', 'admitirReferenciaUnica2411', 'qualitySnapshot', 'isStylizedLook', 'styleAnchor', 'desenhoInfantil',
    'retratoDaReferencia2411', 'folhasDaReferencia2411', 'folhaDaReferenciaLigada', 'FOLHA_DA_REFERENCIA_2411',
    ts.transpile(route.slice(ini, fim)))(kling4Timing, true, f.REFERENCIA_UNICA_2411, { email }, f.admitirReferenciaUnica2411, snapshot, vp.isStylizedLook, { look }, { ativo: false },
    fr.retratoDaReferencia2411, folhas, fr.folhaDaReferenciaLigada, fr.FOLHA_DA_REFERENCIA_2411)
  return kling4Timing
}
async function post(api, args) {
  const requests = []
  await api.submitKling4TrialVideo(args, { apiKey: 'offline', fetchImpl: async (url, opts) => { requests.push({ url, body: opts.body }); return { ok: true, json: async () => ({ request_id: 'offline' }) } } })
  assert.equal(requests.length, 1)
  return { url: requests[0].url, body: requests[0].body, input: JSON.parse(requests[0].body) }
}

async function suite(change) {
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const source = (file, src) => change && file === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const modules = load(source)
  const fr = modules('@/' + modulo), f = modules('@/' + feature), api = modules('@/' + transport), vp = modules('@/lib/cinematic/visualPromptPolicy.ts')
  const route = source(routeFile, local(routeFile))

  // 1. o interruptor no commit: 'internal' = só a lista exata da casa
  assert.equal(fr.FOLHA_DA_REFERENCIA_2411, 'internal')
  assert.equal(fr.folhaDaReferenciaLigada('internal', CASA), true); assert.equal(fr.folhaDaReferenciaLigada('internal', ' JosephSSkaf@Gmail.com '), true)
  for (const e of [CLIENTE, 'joseph@usekineo.com', 'xjosephsskaf@gmail.com', '', null, undefined]) assert.equal(fr.folhaDaReferenciaLigada('internal', e), false, String(e))
  for (const e of [CASA, CLIENTE]) assert.equal(fr.folhaDaReferenciaLigada('off', e), false)
  assert.equal(fr.folhaDaReferenciaLigada('public', CLIENTE), true)

  // 2. a regra, nos vereditos reais: identidade reprovada SEMPRE com estilo = a folha serve; identidade sem estilo (Krishna) = não serve
  for (const id of Object.keys(CRITICO)) assert.equal(fr.folhaServeAReferencia2411(relatos(id)), true, id)
  assert.equal(fr.folhaServeAReferencia2411(KRISHNA), false, 'Krishna')
  assert.equal(fr.folhaServeAReferencia2411([...relatos('9d1255bb'), KRISHNA[0]]), false, 'uma cena de outro personagem basta')
  assert.equal(fr.folhaServeAReferencia2411([relatoDe([1, 'FAIL', ['identidade', 'estilo'], true, true, 'FAIL', ['identidade']])]), false, 'a regerada de outro personagem')
  assert.equal(fr.folhaServeAReferencia2411([relatoDe([1, 'FAIL', ['identidade'], false, null, null, null])]), false, 'sem refação')
  assert.equal(fr.folhaServeAReferencia2411([relatoDe([1, 'FAIL', ['identidade'], true, true, 'PASS', []])]), true, 'a refação aprovou: o juiz não pediu texto puro')
  assert.equal(fr.folhaServeAReferencia2411([relatoDe([1, 'FAIL', ['anatomia'], true, true, 'FAIL', ['anatomia']])]), true, 'outro tipo de reprovação não pesa')
  assert.equal(fr.folhaServeAReferencia2411([]), true)

  // 3. o retrato da admissão: desligado = o MESMO objeto; ligado = as folhas https voltam marcadas, sem duplicar nem tirar as que ficaram
  const s0 = retratoDescartado('9d1255bb'), folhas0 = folhasDe('9d1255bb')
  assert.equal(fr.retratoDaReferencia2411(s0, folhas0, false), s0)
  assert.equal(fr.retratoDaReferencia2411(s0, [], true), s0); assert.equal(fr.retratoDaReferencia2411(null, folhas0, true), null)
  assert.equal(fr.retratoDaReferencia2411(s0, [{ nome: 'Bolt', url: 'http://inseguro.example/f.png' }], true), s0, 'folha não https não volta')
  igual(fr.retratoDaReferencia2411(s0, folhas0, true).characterReferences, [{ nome: 'Bolt', url: folhas0[0].url, mantida: true }])
  igual(s0.characterReferences, [], 'o retrato do filme não muda')
  const ficou = { ...retratoDescartado('cedd1250'), characterReferences: [{ nome: 'Mara', url: 'https://example.org/offline/mara-aprovada.png' }] }
  igual(fr.retratoDaReferencia2411(ficou, folhasDe('cedd1250'), true).characterReferences.map(r => r.nome + ':' + (r.mantida === true)), ['Mara:false', 'Elias:true'])

  // 4. os 3 filmes da casa pelo caminho inteiro: trecho que guarda → admissão real → montador real (POST com fetch falso)
  for (const id of Object.keys(CRITICO)) {
    const E = ELENCO[id], folhaDe = new Map(folhasDe(id).map(x => [x.nome, x.url]))
    const folhas = guardarFolhas(route, fr, relatos(id), folhaDe)
    igual(folhas, folhasDe(id), id + ': as folhas guardadas')
    igual(guardarFolhas(route, fr, KRISHNA, folhaDe), [], id + ': folha de outro personagem não é guardada')
    const snap = retratoDescartado(id)
    const hoje = admitir(route, f, fr, vp, { email: CASA, snapshot: snap, folhas: [], look: E.look })
    assert.equal('referenciaUnica' in hoje, false, id + ': hoje (sem as folhas), a referência não liga')
    const t = admitir(route, f, fr, vp, { email: CASA, snapshot: snap, folhas, look: E.look })
    assert.ok(t.referenciaUnica, id + ': com o conserto, a casa liga')
    assert.equal(t.referenciaUnica.origem, 'folha_mantida'); assert.equal(t.referenciaUnica.imageUrl, folhas[0].url, id + ': a folha do protagonista')
    // as imagens-chave reprovadas não vão ao motor: o pedido leva só a folha (o pedido da referência única de sempre)
    const keyframes = E.planos.map((_, i) => 'https://example.org/offline/keyframe-reprovada-' + i + '.png')
    const envio = await post(api, { prompts: E.planos, approvedStills: keyframes, timing: { ...timingDe(E.planos), referenciaUnica: t.referenciaUnica } })
    assert.equal(envio.url, 'https://queue.fal.run/kling/v4/reference-to-video', id)
    igual(envio.input.image_urls, [folhas[0].url]); assert.ok(!envio.body.includes('keyframe-reprovada'), id + ': nenhuma imagem-chave reprovada')
    igual(Object.keys(envio.input), ['image_urls', 'multi_prompt', 'duration', 'resolution', 'aspect_ratio'])
    // 'off': a casa volta a hoje
    const off = admitir(route, f, { ...fr, FOLHA_DA_REFERENCIA_2411: 'off' }, vp, { email: CASA, snapshot: snap, folhas, look: E.look })
    assert.equal('referenciaUnica' in off, false, id + ': off = hoje')
    // cliente: byte a byte o de hoje (a admissão recebe o MESMO retrato; o pedido à fal é o mesmo)
    for (const look of [E.look, 'photoreal']) {
      const c0 = admitir(route, f, fr, vp, { email: CLIENTE, snapshot: snap, folhas: [], look }), c1 = admitir(route, f, fr, vp, { email: CLIENTE, snapshot: snap, folhas, look })
      assert.equal(JSON.stringify(c1), JSON.stringify(c0), id + ': cliente não muda')
      assert.equal('referenciaUnica' in c1, false)
      const timing = { ...timingDe(E.planos), ...(c1.referenciaUnica ? { referenciaUnica: c1.referenciaUnica } : {}) }
      assert.equal((await post(api, { prompts: E.planos, approvedStills: keyframes, timing })).body, (await post(api, { prompts: E.planos, approvedStills: keyframes, timing: timingDe(E.planos) })).body)
    }
  }
  // o cliente humano fotorreal com a folha APROVADA continua como hoje (a guarda 'public_humano' não muda)
  { const snap = { ...retratoDescartado('cedd1250'), characters: [ELENCO.cedd1250.characters[0]], characterReferences: [{ nome: 'Elias', url: 'https://example.org/offline/elias-aprovada.png' }] }
    const c = admitir(route, f, fr, vp, { email: CLIENTE, snapshot: snap, folhas: folhasDe('cedd1250') })
    assert.equal(c.referenciaUnica?.origem, 'ficha'); assert.equal(c.referenciaUnica?.imageUrl, 'https://example.org/offline/elias-aprovada.png') }
}

await suite(null)
const mutants = [
  [modulo, "export const FOLHA_DA_REFERENCIA_2411: ModoFolhaDaReferencia2411 = 'internal'", "export const FOLHA_DA_REFERENCIA_2411: ModoFolhaDaReferencia2411 = 'public'"], // escapa para o cliente
  [modulo, "export const FOLHA_DA_REFERENCIA_2411: ModoFolhaDaReferencia2411 = 'internal'", "export const FOLHA_DA_REFERENCIA_2411: ModoFolhaDaReferencia2411 = 'off'"], // a casa não ganha o conserto
  [modulo, "modo === 'internal' && contaDaCasaExata(email)", "modo === 'internal'"], // todo e-mail vira casa
  [modulo, "(Array.isArray(p) && p.includes('estilo'))", 'true'], // a folha de outro personagem serve (Krishna)
  [modulo, '    if (!decidirSemFolha(r).precisa) return true\n', ''], // a refação aprovada passa a pesar
  [modulo, "r.veredito_regerada === 'FAIL' ? r.problemas_regerada : null", 'null'], // a regerada de outro personagem não pesa
  [modulo, "r.veredito === 'FAIL' ? r.problemas : null", 'null'], // a 1ª foto não pesa
  [modulo, "  if (!ligada || !snapshot", "  if (!snapshot"], // desligado muda o retrato
  [modulo, " && /^https:\\/\\/[^\\s]+$/i.test(f.url)", ''], // folha não https volta
  [modulo, "\n    && !snapshot.characterReferences.some((r) => r?.nome === f.nome))", ')'], // duplica a que ficou
  [modulo, '...snapshot.characterReferences, ...voltam.map(', '...voltam.map('], // tira a que ficou
  [modulo, ', mantida: true }', ' }'], // a origem não diz que a folha foi mantida
  [feature, "(fichaRef as { mantida?: unknown }).mantida === true ? 'folha_mantida' : 'ficha'", "'ficha'"], // idem, pelo lado da escolha
  [routeFile, "      if (folhaServeAReferencia2411(relatosP)) folhasDaReferencia2411 =", "      if (true) folhasDaReferencia2411 ="], // a rota guarda a folha de outro personagem
  [routeFile, 'folhasDaReferencia2411 = Array.from(folhaDe, ([nome, url]) => ({ nome, url }))', 'folhasDaReferencia2411 = []'], // a rota não guarda
  [routeFile, 'retratoDaReferencia2411(qualitySnapshot, folhasDaReferencia2411, folhaDaReferenciaLigada(FOLHA_DA_REFERENCIA_2411, user.email))', 'retratoDaReferencia2411(qualitySnapshot, folhasDaReferencia2411, true)'], // a rota liga para o cliente
  [routeFile, 'retratoDaReferencia2411(qualitySnapshot, folhasDaReferencia2411, folhaDaReferenciaLigada(FOLHA_DA_REFERENCIA_2411, user.email))', 'qualitySnapshot'], // a admissão não lê as folhas
]
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-FOLHA-DA-REFERENCIA-2411: 'internal' (só a casa exata); vereditos reais de 9d1255bb, 99b64dde e cedd1250 = a folha serve e a referência liga com origem folha_mantida, só a folha vai ao motor; Krishna (identidade sem estilo) = não serve; cliente e 'off' = byte a byte; ${mortos}/${mutants.length} mutantes mortos.`)
