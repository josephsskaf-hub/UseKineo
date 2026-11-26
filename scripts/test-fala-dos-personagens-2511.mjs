// KINEO-FALA-DOS-PERSONAGENS-2511 — guardião do modo "personagens falam" (sem rede, sem banco, sem fal, sem render). Executa:
//   A. o módulo puro (lib/cinematic/falaDosPersonagens2511.ts): a chave ('internal' = casa exata), o pedido do corpo, a leitura "Nome: fala", a voz pela ficha,
//      o pedido FALADO ao Gemini (o cabeçalho da receita de nota 10, a cauda "Mouth closed" trocada pela fala, quem está calado de boca fechada) e a conferência;
//   B. o trecho REAL da rota (const gemini2511 … tentarGemini2511) com dublês e o fixture 499143ac: chave desligada, cliente ou voz 'narrador' = o pedido da
//      nota 10 BYTE A BYTE e nenhum campo novo; a casa com voz 'personagens' = o pedido falado, a entrada do Kling 4 guardada para a queda = a de hoje
//      (narrada); fora do formato, outra língua, roteiro da IA, pessoa real na fala ou recusa no envio = narrado, com o motivo;
//   C. o builder REAL do compose (lib/compose.ts buildCreatomateSource): falaDoMotor = o clipe com som, sem narração, sem música, 15 s; sem o campo = o de hoje;
//   D. o selo (seloDoFilmeGratis2511): falado só com o Gemini entregando; queda = narrado 'gemini_caiu'; sem o marcador = o selo de antes, byte a byte;
//   E. o texto: o compose só monta falado com o claim falado E o Gemini sem queda; a legenda e o portão leem a fala; a conferência grava no claim sem bloquear;
//      "um débito só" (a rota tem as mesmas chamadas de débito da main e o módulo não toca em crédito).
// Rodar: npx tsx scripts/test-fala-dos-personagens-2511.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const PISO = 'lib/cinematic/roteiroFalado2511.ts', IDEIA = 'lib/meta95/ideiaNoEscritor.ts'
const MOD = 'lib/cinematic/falaDosPersonagens2511.ts', ROUTE = 'app/api/generate-video-cinematic/route.ts', COMPOSE = 'app/api/compose/route.ts', BUILDER = 'lib/compose.ts'
const BUDGET = 'lib/kling4TrialBudget.ts', CLAIM = 'lib/cinematic/claim.ts', GEM = 'lib/cinematic/geminiNaEsteira2511.ts'
const lf = (t) => t.replace(/\r\n/g, '\n')
const local = (f) => lf(readFileSync(f, 'utf8'))
const daMain = (f) => { try { return lf(execSync(`git show origin/main:${f}`, { encoding: 'utf8', maxBuffer: 64 << 20 })) } catch { return null } }
const FIX = JSON.parse(readFileSync('scripts/test-support/gemini-499143ac.json', 'utf8'))
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org', USER = '00000000-0000-4000-8000-0000000000a1', GEN = '11111111-1111-4111-8111-111111111111'
const K4R = 'kling/v4/reference-to-video', GEMINI = 'google/gemini-omni-flash/v1.2/reference-to-video'
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
// as falas por plano do fixture (4 planos: Elias, Mara, Elias, Elias; 3, 4, 3 e 5 s) — texto da casa, nenhum de cliente
const FALAS = ['Elias: The storm is coming tonight.', 'Mara: "I hear a boat calling."', 'Elias: Then we give them light.', 'Elias: They made it home.']
const DURS = FIX.kling4_input.multi_prompt.map((m) => m.duration)

async function suite(change) {
  const muda = (rel, t) => (change && rel === change[0] ? t.split(change[1]).join(change[2]) : t)
  const L = createOfflineLoader({ env: { OPENAI_API_KEY: 'k' }, source: (rel, t) => muda(rel, t) })
  const f = L('@/' + MOD), g = L('@/' + GEM)
  const rota = muda(ROUTE, local(ROUTE)), compose = muda(COMPOSE, local(COMPOSE)), claimSrc = muda(CLAIM, local(CLAIM))

  // ── A. o módulo puro ──
  assert.equal(f.FALA_DOS_PERSONAGENS_2511, 'internal', "A no commit: 'internal'")
  igual([f.falaDosPersonagensLigada('internal', CASA), f.falaDosPersonagensLigada('internal', CLIENTE), f.falaDosPersonagensLigada('off', CASA), f.falaDosPersonagensLigada('internal', 'xjosephsskaf@gmail.com')], [true, false, false, false], 'A a chave: só a casa exata')
  igual([f.vozPedida2511({ voice_mode: 'characters' }), f.vozPedida2511({ voice_mode: 'Characters' }), f.vozPedida2511({}), f.vozPedida2511(null), f.vozPedida2511({ voice_mode: 'narrator' }), f.vozPedida2511({ voz: 'personagens' })], ['personagens', 'narrador', 'narrador', 'narrador', 'narrador', 'narrador'], 'A o corpo: só voice_mode "characters" liga')
  const NOMES = [['Elias Ward', 'Elias'], ['Mara Quinn', 'Mara']]
  const lidas = f.lerFalas2511(FALAS, NOMES, DURS.length)
  igual(lidas, { falas: [[{ ref: 0, nome: 'Elias Ward', texto: 'The storm is coming tonight.' }], [{ ref: 1, nome: 'Mara Quinn', texto: 'I hear a boat calling.' }], [{ ref: 0, nome: 'Elias Ward', texto: 'Then we give them light.' }], [{ ref: 0, nome: 'Elias Ward', texto: 'They made it home.' }]] }, 'A "Nome: fala", aspas opcionais, o nome curto vira o do motor')
  igual(f.lerFalas2511(['Mara: Look. Elias: I see it.'], NOMES, 1).falas, [[{ ref: 1, nome: 'Mara Quinn', texto: 'Look.' }, { ref: 0, nome: 'Elias Ward', texto: 'I see it.' }]], 'A duas falas no mesmo plano')
  igual(f.lerFalas2511(['elias ward: Hold on.', ''], NOMES, 2).falas, [[{ ref: 0, nome: 'Elias Ward', texto: 'Hold on.' }], []], 'A nome sem caixa; plano sem fala fica calado')
  for (const [nome, falas, durs, motivo] of [
    ['narração sem rótulo', ['The storm is coming tonight.', 'Mara: Hi.'], [5, 5], 'fala_fora_do_formato'],
    ['texto antes do rótulo', ['Night falls. Elias: Hold on.'], [5], 'fala_fora_do_formato'],
    ['quem não tem referência', ['Tom: Hello there.'], [5], 'falante_fora_do_elenco'],
    ['outro falante dentro da fala', ['Elias: Wait. Tom: Hello there.'], [5], 'falante_fora_do_elenco'],
    ['fala longa no filme (46 palavras)', ['Elias: ' + Array.from({ length: 23 }, (_, i) => 'w' + i).join(' ') + '.', 'Mara: ' + Array.from({ length: 23 }, (_, i) => 'v' + i).join(' ') + '.'], [5, 5], 'fala_longa'],
    ['rótulo vazio', ['Elias: ""'], [5], 'fala_fora_do_formato'],
    ['nenhuma fala', ['', ''], [5, 5], 'roteiro_sem_falas'],
    ['planos ≠ falas', ['Elias: Hi.'], [5, 5], 'planos_desencontrados'],
  ]) igual(f.lerFalas2511(falas, NOMES, durs.length), { motivo }, 'A ' + nome)
  // [T4] o tempo de cada plano no pedido falado vem das palavras: piso de 2 s, o resto proporcional, soma 15
  const tempos = (ws) => f.duracoesDaFala2511(ws.map((n, i) => (n ? [{ ref: 0, nome: 'E', texto: Array.from({ length: n }, (_, j) => 'p' + i + j).join(' ') }] : [])))
  igual(tempos([5, 5, 5, 4]), [4, 4, 4, 3], 'T4 19 palavras em 4 planos')
  igual(tempos([0, 8, 0]), [2, 11, 2], 'T4 plano calado fica no piso')
  igual(tempos([0, 0, 0]), [5, 5, 5], 'T4 sem palavra = partes iguais')
  assert.equal(f.duracoesDaFala2511(Array.from({ length: 8 }, () => [])), null, 'T4 planos demais para o piso = nada')
  for (const ws of [[5, 5, 5, 4], [8, 8, 8, 8], [7, 7, 7, 7, 7], [8, 8, 8, 0], [8, 0, 8, 8], [8, 8, 9], [1, 8, 8, 8], [6, 6, 6, 6, 6, 5]]) {
    const d = tempos(ws); assert.equal(d.reduce((a, b) => a + b, 0), 15, 'T4 soma 15: ' + ws)
    assert.ok(d.every((x, i) => x >= 2 && ws[i] <= Math.floor(f.PALAVRAS_POR_SEGUNDO_2511 * x)), 'T4 o roteiro-limite do escritor cabe em todo plano: ' + ws + ' → ' + d)
  }
  // a voz pela ficha: idade, gênero, tipo; nunca sotaque
  const voz = (x, est = false) => f.vozDaFicha2511(x, est)
  assert.equal(voz({ genero: 'man', tipo: 'humano', canonica: 'appearance anchors: 50-60, gray' }), "speaks in a clear, natural older man's voice")
  assert.equal(voz({ genero: 'woman', tipo: 'humano', canonica: 'appearance anchors: 20-30' }), "speaks in a clear, natural young woman's voice")
  assert.equal(voz({ genero: null, tipo: 'animal', canonica: 'a small green dragon' }), 'speaks in a clear, natural cartoon voice')
  assert.equal(voz({ genero: 'woman', tipo: 'humano', canonica: 'a girl with braids' }, true), "speaks in a clear, natural cartoon girl's voice")
  assert.equal(voz(null), 'speaks in a clear, natural voice')
  for (const x of [{ genero: 'man', canonica: 'a British captain' }, { genero: 'woman', canonica: 'sounds like Taylor Swift' }]) assert.ok(!/british|accent|swift/i.test(voz(x)), 'A a voz não leva sotaque nem nome')
  // o pedido falado ao Gemini
  const nota10 = g.geminiDoKling4(FIX.kling4_input, ['Elias Ward', 'Mara Quinn'])
  igual(nota10, FIX.gemini_input_nota_10, 'A o adaptador de hoje = a nota 10 (referência)')
  const VOZES = ["speaks in a clear, natural older man's voice", "speaks in a clear, natural young woman's voice"]
  const fal = f.geminiFaladoDoKling4(FIX.kling4_input, ['Elias Ward', 'Mara Quinn'], lidas.falas, VOZES)
  assert.ok('entrada' in fal, 'A o pedido falado nasce')
  const p = fal.entrada.prompt, linhas = p.split('\n')
  assert.ok(linhas[0].startsWith('15-second vertical 9:16 film, 4 shots with hard cuts, with synchronized spoken dialogue in English. REFERENCES: <IMAGE_REF_0> is Elias Ward and <IMAGE_REF_1> is Mara Quinn; each keeps the same look and the same voice in every shot where they appear. VOICES: Elias Ward speaks in a clear, natural older man\'s voice. Mara Quinn speaks in a clear, natural young woman\'s voice. Only the lines written below are spoken, exactly as written, with the lips in sync; no narrator, no other speech, no singing.'), 'A o cabeçalho da receita de nota 10')
  assert.ok(!p.includes('Mouth closed, no speaking'), 'A nenhuma cauda "Mouth closed" no pedido falado')
  const hoje = FIX.gemini_input_nota_10.prompt.split('\n')
  for (let k = 0; k < 4; k++) {
    const semTempo = (l) => l.replace(/^\d+-\d+ s \(shot \d+, hard cut\): /, '')
    const corpo = semTempo(hoje[k + 1]).slice(0, -' Mouth closed, no speaking.'.length)
    assert.ok(semTempo(linhas[k + 1]).startsWith(corpo + ' '), `A plano ${k + 1}: o texto de hoje, byte a byte, até a cauda`)
  }
  assert.ok(linhas[1].endsWith(' Elias Ward says: "The storm is coming tonight."') && linhas[2].endsWith(' Mara Quinn says: "I hear a boat calling."'), 'A a fala de quem fala, entre aspas, no fim do plano')
  igual(linhas.slice(1).map((l) => l.match(/^(\d+-\d+) s/)[1]), ['0-4', '4-8', '8-12', '12-15'], 'T4 o tempo dos planos no pedido falado vem das palavras (5, 5, 5, 4)')
  { const longo = f.lerFalas2511(['Elias: ' + Array.from({ length: 30 }, (_, i) => 'w' + i).join(' ') + '.', '', '', ''], NOMES, 4)
    igual(f.geminiFaladoDoKling4(FIX.kling4_input, ['Elias Ward', 'Mara Quinn'], longo.falas, VOZES), { motivo: 'fala_longa' }, 'T4 30 palavras num plano só (9 s, teto 27) = narrado') }
  igual([fal.entrada.image_urls, fal.entrada.duration, fal.entrada.resolution, fal.entrada.aspect_ratio], [FIX.gemini_input_nota_10.image_urls, 15, '720p', '9:16'], 'A as mesmas fotos, 15 s, 720p, 9:16')
  { const doisNoPlano = JSON.parse(JSON.stringify(FIX.kling4_input)); doisNoPlano.multi_prompt[0].prompt = doisNoPlano.multi_prompt[0].prompt.replace(' Mouth closed, no speaking.', ' Keep the face and outfit of @Image2. Mouth closed, no speaking.')
    const x = f.geminiFaladoDoKling4(doisNoPlano, ['Elias Ward', 'Mara Quinn'], lidas.falas, VOZES)
    assert.ok(x.entrada.prompt.split('\n')[1].endsWith('Elias Ward says: "The storm is coming tonight." Mara Quinn listens with the mouth closed.'), 'A quem está no plano sem falar: boca fechada') }
  { const semElias = JSON.parse(JSON.stringify(FIX.kling4_input)); semElias.multi_prompt[0].prompt = semElias.multi_prompt[0].prompt.replace(/@Image1/g, 'him')
    igual(f.geminiFaladoDoKling4(semElias, ['Elias Ward', 'Mara Quinn'], lidas.falas, VOZES), { motivo: 'falante_fora_do_plano' }, 'A quem fala tem de estar no plano') }
  { const semCauda = JSON.parse(JSON.stringify(FIX.kling4_input)); semCauda.multi_prompt[2].prompt = semCauda.multi_prompt[2].prompt.replace(' Mouth closed, no speaking.', '')
    igual(f.geminiFaladoDoKling4(semCauda, ['Elias Ward', 'Mara Quinn'], lidas.falas, VOZES), { motivo: 'plano_sem_cauda' }, 'A plano sem a cauda de hoje = narrado') }
  igual(f.geminiFaladoDoKling4(FIX.kling4_input, ['Elias Ward', 'Mara Quinn'], lidas.falas.slice(0, 3), VOZES), { motivo: 'planos_desencontrados' }, 'A falas ≠ planos')
  // [CEO 25/11, regra única do rótulo] o personagem COM nome também fala pelo NÚCLEO do papel dele ("Captain:" = Rosa, a capitã), quando o papel é único
  for (const [canonica, papel] of [['Rosa, a pirate captain, exactly as the author wrote; appearance anchors: 30-40', 'captain'], ['Elias, a lighthouse keeper named Elias', 'keeper'],
    ['Mara, the flight attendant who never sleeps', 'attendant'], ['the owl, a grumpy owl', 'owl'], ['Elias, kept the old lighthouse alone for thirty years', null], ['Rosa', null], ['Rosa, 42, tall', null],
    // [revisora 52b12696, boca errada] o papel de OUTRA pessoa na mesma oração não é o desta
    ['Mara, the wife of the captain', 'wife'], ['Mara, a friend of the keeper', 'friend'], ["Mara, the captain's wife", null], ['Mara, a nurse with the captain', 'nurse']])
    assert.equal(f.papelDaFicha2511({ nome: canonica.split(',')[0], canonica }), papel, 'papel: ' + canonica)
  { const nomes = f.nomesDaFala2511([['Rosa', 'Rosa'], ['Elias', 'Elias']], [{ nome: 'Rosa', canonica: 'Rosa, a pirate captain' }, { nome: 'Elias', canonica: 'Elias, a lighthouse keeper' }])
    igual(nomes, [['Rosa', 'Rosa', 'captain'], ['Elias', 'Elias', 'keeper']], 'o papel entra depois do nome')
    igual(f.lerFalas2511(['Captain: Hold the course.', 'Keeper: The light is on.'], nomes, 2).falas, [[{ ref: 0, nome: 'Rosa', texto: 'Hold the course.' }], [{ ref: 1, nome: 'Elias', texto: 'The light is on.' }]], '"Captain:" casa com Rosa, a capitã') }
  for (const [mara, rotulo] of [['Mara, the wife of the captain', 'Captain'], ['Mara, a friend of the keeper', 'Keeper']]) { // [revisora 52b12696] Elias sem aposto
    const nomes = f.nomesDaFala2511([['Elias'], ['Mara']], [{ nome: 'Elias', canonica: 'Elias' }, { nome: 'Mara', canonica: mara }])
    assert.ok(!nomes[1].includes(rotulo.toLowerCase()), 'boca errada: o papel do outro não entra na Mara: ' + mara)
    const r = f.lerFalas2511([rotulo + ': The storm is coming.', 'Mara: Hold on.'], nomes, 2)
    assert.ok(!('falas' in r) || !r.falas.flat().some((l) => l.nome === 'Mara' && l.texto === 'The storm is coming.'), 'boca errada: "' + rotulo + ':" não sai da boca da Mara (' + mara + ')') }
  igual(f.nomesDaFala2511([['Rosa'], ['Ana']], [{ nome: 'Rosa', canonica: 'Rosa, a pirate captain' }, { nome: 'Ana', canonica: 'Ana, a ship captain' }]), [['Rosa'], ['Ana']], 'dois capitães = ambíguo = nenhum papel')
  igual(f.nomesDaFala2511([['Rosa'], ['Captain']], [{ nome: 'Rosa', canonica: 'Rosa, a pirate captain' }, null]), [['Rosa'], ['Captain']], 'o papel que é o nome do outro = não entra')
  igual(f.nomesDaFala2511([['Rosa'], ['Elias']], [null, null]), [['Rosa'], ['Elias']], 'sem ficha = os nomes de sempre')
  // [T1 e T2] quem fala
  const ADULTOS = [{ nome: 'Elias Ward', nucleo: 'Elias', canonica: 'appearance anchors: 50-60' }, { nome: 'Mara Quinn', nucleo: 'Mara', canonica: 'appearance anchors: 20-30' }]
  assert.equal(f.admitirFalantes2511(lidas.falas, ADULTOS, NOMES, false), null, 'T1/T2 dois adultos comuns falam')
  for (const famoso of ['Elon Musk', 'Taylor Swift', 'Spider-Man', 'Mickey Mouse', 'Lara Croft', 'Napoleon']) {
    const nomes = [[famoso], NOMES[1]], fichas = [{ nome: famoso, nucleo: famoso, canonica: 'a 40-year-old man' }, ADULTOS[1]]
    const falas = f.lerFalas2511([famoso + ': We sail at dawn.', '', '', ''], nomes, 4).falas
    assert.equal(f.admitirFalantes2511(falas, fichas, nomes, false), 'falante_conhecido', 'T1 ' + famoso + ' falando = narrado')
    assert.equal(f.admitirFalantes2511(falas, fichas, nomes, true), 'falante_conhecido', 'T1 ' + famoso + ' falando no desenho = narrado') }
  assert.equal(f.admitirFalantes2511(lidas.falas, [ADULTOS[0], { nome: 'Mara Quinn', canonica: 'a 12-year-old girl' }], NOMES, false), 'falante_menor', 'T2 menor fotorreal falando = narrado')
  assert.equal(f.admitirFalantes2511(lidas.falas, [ADULTOS[0], { nome: 'Mara Quinn', canonica: 'long wavy brown hair' }], NOMES, false), 'falante_menor', 'T2 sem sinal de adulto = narrado (falha fechada)')
  assert.equal(f.admitirFalantes2511(lidas.falas, [ADULTOS[0], null], NOMES, false), 'falante_menor', 'T2 sem ficha = narrado')
  assert.equal(f.admitirFalantes2511(f.lerFalas2511(['Elias: My daughter is out there.', '', '', ''], NOMES, 4).falas, ADULTOS, NOMES, false), 'falante_menor', 'T2 a fala que diz menor barra')
  assert.equal(f.admitirFalantes2511(lidas.falas, [ADULTOS[0], { nome: 'Mara Quinn', canonica: 'a 12-year-old girl' }], NOMES, true), null, 'T2 no desenho a criança falando fica (2ª abertura decide)')
  assert.equal(f.admitirFalantes2511(f.lerFalas2511(['Elias: Hi.', '', '', ''], NOMES, 4).falas, [ADULTOS[0], { nome: 'Mara Quinn', canonica: 'a 12-year-old girl' }], NOMES, false), null, 'T2 só quem FALA passa pela régua')
  // a conferência
  const ditas = 'The storm is coming tonight. I hear a boat calling. Then we give them light. They made it home.'.split(' ')
  igual(f.conferirFala2511(ditas, lidas.falas), { versao: 'conferencia_da_fala_2511_v1', nota: 1, escritas: 19, ditas: 19, faltando: 0, inventadas: 0, certa: true }, 'A conferência exata')
  { const c = f.conferirFala2511(ditas.slice(0, 15), lidas.falas); assert.ok(!c.certa && c.nota < 0.9 && c.nota > 0.75, 'A 15 de 19 palavras (0,79) = errada (a régua é 9 de 10)') }
  { const c = f.conferirFala2511(ditas.slice(0, 9), lidas.falas); assert.ok(!c.certa && c.faltando === 10 && c.nota < 0.5, 'A metade dita = errada') }
  { const c = f.conferirFala2511([...ditas, 'and', 'then', 'the', 'end', 'of', 'all'], lidas.falas); assert.ok(!c.certa && c.inventadas === 6, 'A palavras inventadas = errada') }
  { const c = f.conferirFala2511([], lidas.falas); assert.ok(!c.certa && c.nota === 0, 'A sem transcrição = errada (nunca aprovado por falta de dado)') }
  // a montagem falada: só com o claim falado E o Gemini entregando, sem queda
  const mk = (extra = {}) => ({ motor_do_clipe: 'gemini_omni_flash', fala_2511: { versao: 'fala_dos_personagens_2511_v1', pedida: 'personagens', modo: 'falado', motivo: null, falas: lidas.falas }, ...extra })
  assert.equal(f.montagemFalada2511(mk(), GEMINI), true, 'A falado + Gemini = falado')
  for (const [nome, m, model] of [['queda para o Kling 4', mk({ motor_do_clipe: 'kling4', reserva_de: 'gemini_omni_flash' }), K4R], ['queda iniciada', mk({ gemini_queda: { estado: 'iniciada' } }), GEMINI],
    ['narrado', mk({ fala_2511: { versao: 'fala_dos_personagens_2511_v1', modo: 'narrado', motivo: 'lingua' } }), GEMINI], ['sem falas', mk({ fala_2511: { versao: 'fala_dos_personagens_2511_v1', modo: 'falado', falas: [[]] } }), GEMINI],
    ['sem marcador', { motor_do_clipe: 'gemini_omni_flash' }, GEMINI], ['nulo', null, GEMINI], ['o modelo do claim não é o Gemini', mk(), K4R]]) assert.equal(f.montagemFalada2511(m, model), false, 'A ' + nome + ' = narrado')

  // ── B. o trecho REAL da rota ──
  const ini = rota.indexOf('    const gemini2511: {'), fim = rota.indexOf('    if (kling4TrialCandidate && scenes.length === 3', ini)
  assert.ok(ini > 0 && fim > ini, 'B o trecho da tentativa do Gemini')
  const trecho = rota.slice(ini, fim)
  const rodar = async ({ email = CASA, voz = 'characters', chave = f.FALA_DOS_PERSONAGENS_2511, lingua = 'en', verbatim = true, falas = FALAS, envio = null, fichas = null } = {}) => {
    const envios = []
    const escopo = { motorDoFilmeGratis2511: async () => null, cinematicAdmin: {}, geminiNaEsteiraLigado: g.geminiNaEsteiraLigado, GEMINI_NA_ESTEIRA_2511: 'public', user: { email, id: USER },
      kling4PorSecao: (x) => x, kling4Prompts: [], kling4ApprovedStills: [], kling4Timing: { voiceovers: falas, referenciaUnica: { nomes: ['Elias Ward', 'Elias'], segundo: { nomes: ['Mara Quinn', 'Mara'] } } },
      buildKling4TrialInput: () => ({ model: K4R, input: FIX.kling4_input }), KLING4_REFERENCE_MODEL: K4R, geminiDoKling4: g.geminiDoKling4,
      submitGeminiTrialVideo: async (e) => { envios.push(e); if (envio) return envio(e); return { requestId: 'gem-1', model: GEMINI, submittedAt: 'x' } },
      GeminiRecusadoNoEnvio: g.GeminiRecusadoNoEnvio, writeServerEvent: async () => true, GEMINI_ENVIO_EVENTO: 'x', generationId: GEN, ctxDespacho: () => ({ totalPosts: 0 }), process: { env: {} },
      falaDosPersonagensLigada: f.falaDosPersonagensLigada, FALA_DOS_PERSONAGENS_2511: chave, FALA_DOS_PERSONAGENS_2511_VERSAO: f.FALA_DOS_PERSONAGENS_2511_VERSAO, vozPedida2511: f.vozPedida2511,
      lerFalas2511: f.lerFalas2511, vozDaFicha2511: f.vozDaFicha2511, admitirFalantes2511: f.admitirFalantes2511, nomesDaFala2511: f.nomesDaFala2511, geminiFaladoDoKling4: f.geminiFaladoDoKling4, body: { voice_mode: voz }, narrationLanguage: { language: lingua }, verbatim,
      mentionsRealPerson: (t) => /Obama/.test(t), isStylizedLook: () => false, styleAnchor: { look: 'photoreal' }, desenhoInfantil: { ativo: false },
      qualitySnapshot: { characters: fichas ?? [{ nome: 'Elias Ward', genero: 'man', tipo: 'humano', canonica: 'appearance anchors: 50-60' }, { nome: 'Mara Quinn', genero: 'woman', tipo: 'humano', canonica: 'appearance anchors: 20-30' }] } }
    const corpo = ts.transpile('let kling4Posts = 0\n' + trecho + '\nreturn (async () => ({ job: await tentarGemini2511(), gemini2511, fala2511: typeof fala2511 === "undefined" ? undefined : fala2511 }))()', { target: ts.ScriptTarget.ES2022 })
    const r = await Function(...Object.keys(escopo), corpo)(...Object.values(escopo))
    return { ...r, envios }
  }
  for (const [nome, opts] of [['cliente', { email: CLIENTE }], ['voice_mode narrator', { voz: 'narrator' }], ["chave 'off'", { chave: 'off' }], ['sem voice_mode no corpo', { voz: null }]]) {
    const x = await rodar(opts)
    igual(x.envios, [FIX.gemini_input_nota_10], `B ${nome}: o pedido da nota 10, byte a byte`)
    assert.equal(x.fala2511?.marcador ?? null, null, `B ${nome}: nenhum campo novo`)
  }
  { const x = await rodar()
    assert.equal(x.envios.length, 1, 'B a casa: UM pedido')
    igual(x.envios[0], fal.entrada, 'B a casa com voz personagens: o pedido falado')
    igual(x.gemini2511.kling4, { model: K4R, input: FIX.kling4_input }, 'B a entrada do Kling 4 guardada para a queda = a de hoje (narrada)')
    igual(x.gemini2511.entrada, fal.entrada, 'B o claim guarda o pedido falado que foi à fal')
    igual(x.fala2511.marcador, { versao: 'fala_dos_personagens_2511_v1', pedida: 'characters', modo: 'falado', motivo: null, falas: lidas.falas }, 'B o marcador: falado, com as falas') }
  { const x = await rodar({ falas: ['Elias: The storm is coming tonight.', 'Operator: I hear a boat calling.', '', ''], fichas: [{ nome: 'Elias Ward', genero: 'man', tipo: 'humano', canonica: 'appearance anchors: 50-60' }, { nome: 'Mara Quinn', genero: 'woman', tipo: 'humano', canonica: 'Mara Quinn, a radio operator, appearance anchors: 20-30' }] })
    assert.equal(x.fala2511.marcador.modo, 'falado', 'B rótulo pelo papel: "Operator:" = Mara, a operadora de rádio (falado)')
    assert.ok(x.envios[0].prompt.includes('Mara Quinn says: "I hear a boat calling."'), 'B o motor recebe o NOME (o papel só serve à leitura)') }
  { const x = await rodar({ verbatim: false }) // [CEO 25/11] não depende de script_mode: o roteiro do nosso escritor com "Nome: fala" vale igual
    igual(x.envios, [fal.entrada], 'B fora do verbatim (o escritor): o pedido falado'); assert.equal(x.fala2511.marcador.modo, 'falado', 'B fora do verbatim: falado') }
  for (const [nome, opts, motivo] of [['outra língua', { lingua: 'pt' }, 'lingua'], ['roteiro sem falas', { falas: ['', '', '', ''] }, 'roteiro_sem_falas'],
    ['fora do formato', { falas: ['The storm is coming.', 'Mara: Hi.', '', ''] }, 'fala_fora_do_formato'], ['pessoa real na fala', { falas: ['Elias: Obama is here.', '', '', ''] }, 'fala_com_pessoa_real'],
    ['recusa no envio', { envio: () => { throw new g.GeminiRecusadoNoEnvio(422) } }, 'gemini_recusou_no_envio'],
    ['papel ambíguo (dois operadores)', { falas: ['Elias: The storm is coming tonight.', 'Operator: I hear a boat calling.', '', ''], fichas: [{ nome: 'Elias Ward', genero: 'man', tipo: 'humano', canonica: 'Elias Ward, a radio operator, appearance anchors: 50-60' }, { nome: 'Mara Quinn', genero: 'woman', tipo: 'humano', canonica: 'Mara Quinn, a radio operator, appearance anchors: 20-30' }] }, 'falante_fora_do_elenco'],
    ['menor fotorreal falando', { fichas: [{ nome: 'Elias Ward', genero: 'man', tipo: 'humano', canonica: 'appearance anchors: 50-60' }, { nome: 'Mara Quinn', genero: 'woman', tipo: 'humano', canonica: 'a 12-year-old girl' }] }, 'falante_menor']]) {
    const x = await rodar(opts)
    assert.equal(x.fala2511.marcador.modo, 'narrado', `B ${nome}: narrado`)
    assert.equal(x.fala2511.marcador.motivo, motivo, `B ${nome}: o motivo`)
    if (nome !== 'recusa no envio') igual(x.envios, [FIX.gemini_input_nota_10], `B ${nome}: o Gemini de hoje (narrado), byte a byte`)
  }
  assert.ok(rota.includes("...((body as { voice_mode?: unknown }).voice_mode === 'characters' ? { voice_mode: 'characters' } : {})") && /escritorMarcadoDoGenerateScript\(new NextRequest[^\n]*voice_mode: 'characters'/.test(rota), 'B o escritor do servidor recebe o voice_mode (a ideia solta sai em "Nome: fala")')
  assert.ok(rota.includes(";(response.kling4_trial as Record<string, unknown>).fala_2511 = f2511\n") && rota.includes("name: 'fala_dos_personagens_2511'"), 'B o marcador vai ao claim e a um evento')
  { const i = rota.indexOf(';(response.kling4_trial as Record<string, unknown>).fala_2511 = f2511'), j = rota.lastIndexOf('    if (kling4Trial) {\n', i)
    assert.ok(j > 0 && rota.slice(j, i).includes('response.kling4_trial = {'), 'B o marcador entra no kling4_trial já criado') }
  // um débito só
  const debitos = (t) => (t.match(/debitVideoCredits\(/g) ?? []).length
  const main = daMain(ROUTE)
  if (main && !change) assert.equal(debitos(rota), debitos(main), 'B um débito só: as mesmas chamadas de débito da main')
  assert.ok(!/debit|credit|refund/i.test(local(MOD).replace(/^\s*\/\/.*$/gm, '')), 'B o módulo não toca em crédito')

  // ── C. o builder REAL do compose ──
  const M = L('@/' + BUILDER)
  const base = { clipUrls: ['https://fal.media/gemini.mp4'], voiceoverUrl: 'https://x.test/v.mp3', voiceoverScript: 'The storm is coming tonight.', sceneCaptions: [''], duration: 15, quality: 'cinematic_ai', aspect: '9:16', kling4TrialEngine: 'kling4', realAudioDuration: 15.3, musicUrl: 'https://x.test/m.mp3' }
  const fonte = (extra) => M.buildCreatomateSource({ ...base, ...extra })
  const hojeC = JSON.stringify(fonte({}))
  assert.equal(JSON.stringify(fonte({ falaDoMotor: false })), hojeC, 'C falaDoMotor false = o de hoje, byte a byte')
  const s = fonte({ falaDoMotor: true })
  const vids = s.elements.filter((e) => e.type === 'video' && e.track === 2 && e.source === base.clipUrls[0])
  assert.ok(vids.length === 1 && vids[0].volume === '100%' && vids[0].duration === 15 && vids[0].trim_start === 0, 'C o clipe inteiro, 15 s, com o som do motor')
  assert.ok(!s.elements.some((e) => e.type === 'audio' && (e.source === base.voiceoverUrl || e.source === base.musicUrl)), 'C sem narração e sem música por cima da fala')
  assert.equal(s.duration, 15, 'C o filme dura o clipe')
  { const hojeVids = JSON.parse(hojeC).elements.filter((e) => e.type === 'video' && e.track === 2); assert.ok(hojeVids.every((e) => e.volume === '0%'), 'C hoje: o clipe mudo') }
  assert.equal(JSON.stringify(fonte({ falaDoMotor: true, kling4TrialEngine: 'seedance15_fallback' })), JSON.stringify(fonte({ kling4TrialEngine: 'seedance15_fallback' })), 'C fora do clipe do Kling 4/Gemini, falaDoMotor não muda nada')
  assert.equal(JSON.stringify(fonte({ falaDoMotor: true, clipUrls: ['https://a.test/1.mp4', 'https://a.test/2.mp4'] })), JSON.stringify(fonte({ clipUrls: ['https://a.test/1.mp4', 'https://a.test/2.mp4'] })), 'C mais de um clipe: nada muda')

  // ── D. o selo ──
  const B = L('@/' + BUDGET)
  const atual = { engine_used: 'kling4', cost_usd: 2.355 }
  const mkSelo = (extra = {}) => ({ motor_do_clipe: 'gemini_omni_flash', engine_used: 'kling4', gemini_est_usd: 1.2285, cost_usd: 2.355, ...extra })
  const semFala = B.seloDoFilmeGratis2511(mkSelo(), atual)
  assert.ok(semFala && !('voz' in semFala), 'D sem o marcador: o selo de antes')
  const comFala = B.seloDoFilmeGratis2511(mkSelo({ fala_2511: mk().fala_2511 }), atual)
  igual(comFala, { ...semFala, voz: 'falado', voz_motivo: null }, 'D falado entregue pelo Gemini')
  igual(B.seloDoFilmeGratis2511(mkSelo({ fala_2511: mk().fala_2511, gemini_queda: { estado: 'sem_kling4' } }), atual)?.voz_motivo, 'gemini_caiu', 'D a queda: narrado, gemini_caiu')
  igual(B.seloDoFilmeGratis2511(mkSelo({ fala_2511: { versao: 'v', modo: 'narrado', motivo: 'lingua' } }), atual)?.voz_motivo, 'lingua', 'D narrado com o motivo')

  // ── E. o compose route e o claim (texto) ──
  // [revisora 52b12696, A] o faceless15 do filme falado: sem o F1 (que refazia a legenda com o Whisper da TTS que não toca) e sem o F3 (música e efeitos por cima)
  { const LINHA = "    if (typeof falaMontada2511 !== 'undefined' && falaMontada2511) faceless15.fases = faceless15.fases.filter(f => f !== 'f1' && f !== 'f3')\n"
    const iL = compose.indexOf(LINHA), iR = compose.indexOf('    const faceless15 = resolverFaceless15('), iA = compose.indexOf('    const faceless15Relato = aplicarFaceless15(source, faceless15, ')
    assert.ok(iR > 0 && iL > iR && iA > iL, 'A no falado o F1 e o F3 saem ANTES de aplicar o faceless15')
    const fases = (falado) => Function('faceless15', 'falaMontada2511', LINHA + 'return faceless15.fases')({ fases: ['f1', 'f2', 'f3'] }, falado)
    igual([fases(true), fases(false)], [['f2'], ['f1', 'f2', 'f3']], 'A falado: sem F1 e sem F3; narrado: as fases de hoje') }
  assert.ok(compose.includes("const falaMontada2511 = typeof montagemFalada2511 === 'function' && montagemFalada2511(marcadorDaFala2511, cinematicBirthClaim?.falModels?.[0]) && composeClipUrls.filter("), 'E o compose: falado só pelo claim e pelo modelo que entregou')
  assert.ok(compose.includes('transcribeClipWithTimestampsAndDuration(composeClipUrls.find('), 'E o Whisper do ÁUDIO DO CLIPE')
  assert.ok(compose.includes("try { await gravarConferenciaDaFala2511({ db: composeAdmin, secret: serviceRoleKey, userId: authenticatedUserId, generationId, conferencia }) } catch { /* gravar nunca derruba o filme */ }"), 'E a conferência grava no claim e nunca derruba')
  assert.ok(compose.includes("      if (typeof falaMontada2511 !== 'undefined' && falaMontada2511) composeInputs = { ...composeInputs, whisperWords: palavrasDoMotor2511 ?? undefined, voiceoverScript: falasDoMotor2511.flat().map((l) => l.texto).join(' '), falaDoMotor: true }\n      source = buildCreatomateSource(composeInputs)\n"), 'E a legenda do falado vem do som do motor (reserva: o texto das falas), e o builder liga a fala logo antes de montar')
  assert.ok(compose.includes("evidence: falaMontada2511 ? { ...captionEvidence, status: 'not_applicable' } : captionEvidence") && compose.includes("if (!(typeof falaMontada2511 !== 'undefined' && falaMontada2511) && quality === 'cinematic_ai'"), 'E as reconstruções da legenda pela narração não rodam no falado')
  assert.ok(compose.includes("const textoDoPortao2511 = falaMontada2511 ? falasDoMotor2511.flat().map((l) => l.texto).join(' ') : scaledScript") && compose.includes('narration: textoDoPortao2511'), 'E o portão do grátis conhece a fala')
  assert.ok(/export async function gravarConferenciaDaFala2511[\s\S]{0,700}fala\.modo !== 'falado'[\s\S]{0,200}if \(fala\.conferencia\) return \{ ok: true, claim: current \}/.test(claimSrc), 'E o claim: só no filme falado; a 1ª conferência fica')
  // ── F. [CEO 25/11] o piso PRÓPRIO do falado nos dois portões de tamanho (12 palavras ditas), sem vazar para o narrado ──
  const P2 = L('@/' + PISO), I = L('@/' + IDEIA), FD = L('@/' + MOD)
  assert.equal(FD.PALAVRAS_MIN_NO_FILME_FALADO_2511, 12, 'F o piso do falado = 12, reexportado por falaDosPersonagens2511')
  assert.equal(P2.PALAVRAS_MIN_NO_FILME_FALADO_2511, 12)
  const roteiro = (falas) => falas.map((x, i) => `${['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'PAYOFF'][i]}: [Pexels: ${['lighthouse at night', 'radio room', 'lamp room', 'harbor at dawn'][i]}]\n${x}`).join('\n\n')
  // a receita da nota 10 (texto da casa): 30 palavras ditas, 4 seções, 2 falantes
  const FALADO_30 = ['Mara: There is a boat out there. They cannot see the rocks.', 'Elias: Then we give them light. Hold on, Mara.', 'Mara: The lamp is turning again.', 'Mara: They made it. Elias: They always do.']
  const FALADO_24 = ['Elias: The storm is coming in tonight.', 'Mara: I can hear a boat calling.', 'Elias: Then we will give them light.', 'Mara: They made it home safely now.']
  const FALADO_16 = ['Elias: The storm is here.', 'Mara: I hear a boat.', 'Elias: Give them light.', 'Mara: They made it.']
  const FALADO_11 = ['Elias: Storm tonight.', 'Mara: A boat.', 'Elias: Light it.', 'Mara: They made it home.']
  const secoesDe = (falas) => parseUserScript(roteiro(falas)).segments.map((x) => x.voiceover)
  const { parseUserScript } = L('@/lib/scriptParser.ts')
  for (const [nome, falas, n] of [['24', FALADO_24, 24], ['30 (nota 10)', FALADO_30, 30]]) {
    igual(P2.falasDoRoteiroSemElenco2511(secoesDe(falas))?.palavras, n, 'F conta as palavras ditas: ' + nome)
    assert.equal(P2.roteiroFaladoNoPortao2511({ voiceMode: 'characters', ligada: true, ingles: true, secoes: secoesDe(falas) }), true, 'F o portão da rota deixa passar o falado de ' + nome)
    for (const [k, v] of [['voiceMode', 'narrator'], ['voiceMode', undefined], ['ligada', false], ['ingles', false]]) assert.equal(P2.roteiroFaladoNoPortao2511({ voiceMode: 'characters', ligada: true, ingles: true, secoes: secoesDe(falas), [k]: v }), false, 'F sem ' + k + ' = o portão de sempre')
    const a = I.avaliarRoteiroEscrito({ script: roteiro(falas), seconds: 15, language: 'en', falado: true })
    assert.ok(a.ok === true, 'F o escritor aceita o falado de ' + nome + ' (' + JSON.stringify(a) + ')')
    const { narrationFitAt, speechRateFor } = L('@/lib/speechRate.ts')
    if (n < 30) assert.equal(narrationFitAt(parseUserScript(roteiro(falas)).narration, 15, speechRateFor({ family: 'classic', language: 'en' })).ok, false, 'F o MESMO roteiro sem a exceção leva o 422 da rota (a cobertura do narrado): ' + nome)
  }
  { igual(P2.falasDoRoteiroSemElenco2511(secoesDe(FALADO_16))?.palavras, 14)
    assert.ok(I.avaliarRoteiroEscrito({ script: roteiro(FALADO_16), seconds: 15, language: 'en', falado: true }).ok === true, 'F o escritor aceita o falado de 14 (o piso é 12)')
    const b = I.avaliarRoteiroEscrito({ script: roteiro(FALADO_16), seconds: 15, language: 'en' })
    igual([b.ok, b.motivo], [false, 'curto'], 'F o MESMO roteiro de 14 sem o falado = o curto de hoje (o piso do narrado não vaza)') }
  assert.equal(P2.roteiroFaladoNoPortao2511({ voiceMode: 'characters', ligada: true, ingles: true, secoes: secoesDe(FALADO_11) }), false, 'F 11 palavras: recusado no portão da rota')
  igual([I.avaliarRoteiroEscrito({ script: roteiro(FALADO_11), seconds: 15, language: 'en', falado: true }).motivo], ['curto'], 'F 11 palavras: o escritor recusa')
  for (const [nome, secoes] of [['narração sem rótulo', ['The storm is coming tonight and the old keeper climbs the stairs one last time.', 'Mara: I hear a boat calling out there.']],
    ['rótulo de estrutura', ['Narrator: The storm is coming tonight, and the old keeper climbs the stairs.']], ['três falantes', ['Elias: The storm is coming tonight.', 'Mara: I hear a boat calling.', 'Tom: Then we give them light.']]]) {
    assert.equal(P2.falasDoRoteiroSemElenco2511(secoes), null, 'F fora do formato: ' + nome)
    assert.equal(P2.roteiroFaladoNoPortao2511({ voiceMode: 'characters', ligada: true, ingles: true, secoes }), false, 'F fora do formato = o portão de sempre: ' + nome) }
  // o narrado mede a mesma fala e RECUSA (o 422 de hoje), e o falado escapa só pelo bloco novo
  { const { narrationFitAt, speechRateFor } = L('@/lib/speechRate.ts')
    assert.equal(narrationFitAt(parseUserScript(roteiro(FALADO_24)).narration, 15, speechRateFor({ family: 'classic', language: 'en' })).ok, false, 'F 24 palavras ditas (28 com os rótulos) levam o 422 do narrado sem a exceção; a receita de 30 (36 com os rótulos) já cobria os 15 s') }
  { const iP = rota.indexOf('    const faladoPedido2511 = '), iE = rota.indexOf('    const ideiaNoEscritor = await escreverIdeiaNoServidor({ ...(faladoPedido2511 ? { falado: true } : {}), prompt,', iP)
    assert.ok(iP > 0 && iE > iP, 'F o pedido falado nasce antes do escritor do servidor e vai a ele')
    const linhaP = rota.slice(iP, rota.indexOf('\n', iP))
    assert.ok(linhaP.includes("(body as { voice_mode?: unknown }).voice_mode === 'characters'") && linhaP.includes('falaDosPersonagensLigada(FALA_DOS_PERSONAGENS_2511, user.email)') && linhaP.includes("narrationLanguage.language === 'en'"), 'F voice_mode + chave + inglês')
    const iG = rota.indexOf('    const faladoNoPortao2511 = '), iB = rota.indexOf('    if (verbatim && parsedScript.narration && !paidKling4 && !faladoNoPortao2511) {\n      let fit = narrationFitAt(', iG)
    assert.ok(iG > iE && iB > iG, 'F a cobertura do narrado (o 422) não roda para o falado no formato')
    const avalia = (corpo, email, lingua, falas) => Function('body', 'user', 'narrationLanguage', 'falaDosPersonagensLigada', 'FALA_DOS_PERSONAGENS_2511', 'roteiroFaladoNoPortao2511', 'parsedScript',
      ts.transpile(linhaP + '\n' + rota.slice(iG, rota.indexOf('\n', iG)) + '\nreturn faladoNoPortao2511'))(corpo, { email }, { language: lingua }, f.falaDosPersonagensLigada, f.FALA_DOS_PERSONAGENS_2511, P2.roteiroFaladoNoPortao2511, parseUserScript(roteiro(FALADO_30)))
    assert.equal(avalia({ voice_mode: 'characters' }, CASA, 'en'), true, 'F a rota (trecho real): a casa com voice_mode characters escapa do 422')
    for (const [nome, corpo, email, lingua] of [['sem voice_mode', {}, CASA, 'en'], ['narrator', { voice_mode: 'narrator' }, CASA, 'en'], ['cliente (chave interna)', { voice_mode: 'characters' }, CLIENTE, 'en'], ['outra língua', { voice_mode: 'characters' }, CASA, 'pt']])
      assert.equal(avalia(corpo, email, lingua), false, 'F a rota: ' + nome + ' = o 422 de hoje') }
  assert.ok(local(IDEIA).includes("  const aval = avaliarRoteiroEscrito({ script: limpo.script, engine, seconds: args.seconds, language: args.language, ...(args.falado === true ? { falado: true } : {}) })"), 'F o escritor do servidor repassa o falado à avaliação')
  assert.ok(compose.includes("captionEvidence: typeof falaMontada2511 !== 'undefined' && falaMontada2511 ? { ...captionEvidence, status: 'not_applicable' as const } : captionEvidence"), 'F o portão do grátis não lê a evidência da TTS que não toca')
}

await suite(null)
const mutantes = [
  [MOD, '    return [...lista, p]\n', '    return [...lista]\n'], // o papel não entra
  [MOD, "if (!p || papeis.filter((x) => x === p).length > 1 || outro(p) ||", "if (!p || outro(p) ||"], // o papel ambíguo entra
  [MOD, "if (!p || papeis.filter((x) => x === p).length > 1 || outro(p) ||", "if (!p || papeis.filter((x) => x === p).length > 1 ||"], // o papel que é o nome do outro entra
  [MOD, ".replace(/\\s+(?:named|called|who|that|which|whose)\\s+.*$/iu, '')", ".replace(/\\s+(?:named|called)\\s+.*$/iu, '')"], // a relativa vira papel
  [MOD, '  const oracao = corte ? inteira.slice(0, corte.index).trim() : inteira\n', '  const oracao = inteira\n'], // [52b12696] sem o corte: "Captain:" da boca da Mara
  [MOD, "  if (corte && /^['’]s$/iu.test(corte[0])) return null\n", ''], // [52b12696] "the captain's wife" vira "the captain"
  [ROUTE, 'nomesDaFala2511(refs.map((r) => r.nomes as string[]), fichas2511)', 'refs.map((r) => r.nomes as string[])'], // a rota não lê o papel
  [COMPOSE, "faceless15.fases = faceless15.fases.filter(f => f !== 'f1' && f !== 'f3')", "faceless15.fases = faceless15.fases.filter(f => f !== 'f3')"], // [A] o F1 volta a refazer a legenda pela TTS
  [COMPOSE, "faceless15.fases = faceless15.fases.filter(f => f !== 'f1' && f !== 'f3')", "faceless15.fases = faceless15.fases.filter(f => f !== 'f1')"], // [A] o F3 volta a pôr música e efeitos
  [PISO, 'export const PALAVRAS_MIN_NO_FILME_FALADO_2511 = 12', 'export const PALAVRAS_MIN_NO_FILME_FALADO_2511 = 25'],
  [PISO, '      if (NAO_E_FALANTE.test(nome)) return null\n', ''],
  [PISO, '  if (!linhas || nomes.size > 2) return null', '  if (!linhas) return null'],
  [PISO, "  if (a.voiceMode !== 'characters' || a.ligada !== true || a.ingles !== true) return false", "  if (a.ligada !== true || a.ingles !== true) return false"],
  [PISO, "  if (a.voiceMode !== 'characters' || a.ligada !== true || a.ingles !== true) return false", "  if (a.voiceMode !== 'characters' || a.ingles !== true) return false"],
  [PISO, '&& f.palavras >= PALAVRAS_MIN_NO_FILME_FALADO_2511 &&', '&&'],
  [IDEIA, '  if (palavras < piso && !faladoNoPiso) return nao(\'curto\')', '  if (palavras < piso) return nao(\'curto\')'],
  [IDEIA, '  const faladoNoPiso = args.falado === true && ', '  const faladoNoPiso = '],
  [IDEIA, 'return !!f && f.palavras >= PALAVRAS_MIN_NO_FILME_FALADO_2511 })()', 'return !!f })()'],
  [ROUTE, "    if (verbatim && parsedScript.narration && !paidKling4 && !faladoNoPortao2511) {", "    if (verbatim && parsedScript.narration && !paidKling4) {"],
  [ROUTE, "const faladoPedido2511 = (body as { voice_mode?: unknown }).voice_mode === 'characters' && ", 'const faladoPedido2511 = '],
  [ROUTE, "falaDosPersonagensLigada(FALA_DOS_PERSONAGENS_2511, user.email) && narrationLanguage.language === 'en'\n", 'falaDosPersonagensLigada(FALA_DOS_PERSONAGENS_2511, user.email)\n'],
  [MOD, "export const FALA_DOS_PERSONAGENS_2511: ModoFalaDosPersonagens2511 = 'internal'", "export const FALA_DOS_PERSONAGENS_2511: ModoFalaDosPersonagens2511 = 'public'"],
  [MOD, "modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))", "modo !== 'off'"],
  [MOD, "return v === 'characters' ? 'personagens' : 'narrador'", "return v ? 'personagens' : 'narrador'"],
  [MOD, "(body as { voice_mode?: unknown }).voice_mode", "(body as { voz?: unknown }).voz"],
  [ROUTE, "...((body as { voice_mode?: unknown }).voice_mode === 'characters' ? { voice_mode: 'characters' } : {})", ''],
  [ROUTE, "motivo: narrationLanguage.language !== 'en' ? 'lingua' : 'sem_gemini' }", "motivo: narrationLanguage.language !== 'en' ? 'lingua' : !verbatim ? 'roteiro_sem_falas' : 'sem_gemini' }"], // voltar a depender do verbatim
  [MOD, "      if (texto.slice(0, inicio).trim()) return { motivo: 'fala_fora_do_formato' }\n", ''],
  [MOD, "        if (qualquerRotulo.test(' ' + fala)) return { motivo: 'falante_fora_do_elenco' }", "        if (false) return { motivo: 'falante_fora_do_elenco' }"],
  [MOD, "  if (falas.flat().reduce((s, l) => s + palavras(l.texto).length, 0) > PALAVRAS_NO_FILME_2511) return { motivo: 'fala_longa' }\n", ''],
  [MOD, "    if ((falas[k] ?? []).reduce((n, l) => n + palavras(l.texto).length, 0) > Math.floor(PALAVRAS_POR_SEGUNDO_2511 * d)) return { motivo: 'fala_longa' }\n", ''],
  [MOD, "export const PISO_DO_PLANO_FALADO_2511 = 2", "export const PISO_DO_PLANO_FALADO_2511 = 1"],
  [MOD, "  const quota = w.map((x) => (W ? (resto * x) / W : resto / n))", "  const quota = w.map(() => resto / n)"],
  [MOD, "    const d = tempos[k], p = s?.prompt", "    const d = Number(s?.duration), p = s?.prompt"],
  [MOD, "    if (falanteConhecido2511(f) || (nomes[r] ?? []).some((n) => falanteConhecido2511({ nome: n }))) return 'falante_conhecido'\n", ''],
  [MOD, "  if (!estilizado) for (const r of quem) {", "  if (false) for (const r of quem) {"],
  [MOD, "    if (!falanteAdulto2511(f, falas.flat().map((l) => l.texto))) return 'falante_menor'", "    if (!falanteAdulto2511(f, [])) return 'falante_menor'"],
  [MOD, "  const quem = [...new Set(falas.flat().map((l) => l.ref))]", "  const quem = [0, 1].filter((r) => r < fichas.length)"],
  [ROUTE, "        else if (falantes2511) fm2511.motivo = falantes2511\n", ''],
  ['lib/cinematic/reguaDaPessoaNaFala2511.ts', "  return adultoProvado2511(c) && !pareceMenor2511(c) && !falas.some((t) => textoDizMenor2511(t))", "  return !pareceMenor2511(c) && !falas.some((t) => textoDizMenor2511(t))"], // a fala lê a régua única (referenciaUnica2411)
  ['lib/cinematic/reguaDaPessoaNaFala2511.ts', "  return !!c && figuraNaReferencia2511(c, '')", "  return false"],
  [MOD, "  if (!falas.some((l) => l.length)) return { motivo: 'roteiro_sem_falas' }\n", ''],
  [MOD, "with synchronized spoken dialogue in English. ", ''],
  [MOD, "Only the lines written below are spoken, exactly as written, with the lips in sync; no narrator, no other speech, no singing.", ''],
  [MOD, "    if (!p.endsWith(CAUDA_DA_BOCA_2511) || p.slice(0, -CAUDA_DA_BOCA_2511.length).includes('Mouth closed')) return { motivo: 'plano_sem_cauda' }\n", ''],
  [MOD, "    if (doPlano.some((l) => l.ref >= fotos.length || !refs.has(l.ref))) return { motivo: 'falante_fora_do_plano' }\n", ''],
  [MOD, "    const corpo = p.slice(0, -CAUDA_DA_BOCA_2511.length)", "    const corpo = p"],
  [MOD, "${quem[r]} listens with the mouth closed.", '${quem[r]} listens.'],
  [MOD, "nota >= 0.9 && inventadas", "nota >= 0.5 && inventadas"],
  // (equivalente: "m > 0" — sem falas a nota já é 0)
  [MOD, "nota >= 0.9 && inventadas <= Math.max(2, Math.ceil(m * 0.1))", "nota >= 0.9"],
  [MOD, "m.motor_do_clipe === 'gemini_omni_flash' && !m.gemini_queda && falModel", "m.motor_do_clipe === 'gemini_omni_flash' && falModel"],
  [MOD, "&& !m.gemini_queda && falModel === 'google/gemini-omni-flash/v1.2/reference-to-video'", "&& !m.gemini_queda"],
  [MOD, "idade >= 50 ? 'older'", "idade >= 50 ? 'old British'"],
  [ROUTE, "typeof falaDosPersonagensLigada === 'function' && vozPedida2511(body) === 'personagens' && falaDosPersonagensLigada(FALA_DOS_PERSONAGENS_2511, user.email)", "typeof falaDosPersonagensLigada === 'function' && falaDosPersonagensLigada(FALA_DOS_PERSONAGENS_2511, user.email)"],
  [ROUTE, "narrationLanguage.language !== 'en' ? 'lingua' : ", ''],
  [ROUTE, "        else if (mentionsRealPerson(lidas.falas.flat().map((l) => l.texto).join(' '))) fm2511.motivo = 'fala_com_pessoa_real'\n", ''],
  [ROUTE, "        gemini2511.entrada = entrada2511; gemini2511.kling4 = { model: wire.model, input: wire.input }", "        gemini2511.entrada = entrada2511; gemini2511.kling4 = { model: wire.model, input: { ...wire.input, multi_prompt: [] } }"],
  [ROUTE, "        if (fm2511 && falado2511) Object.assign(fm2511, { modo: 'falado', motivo: null, falas: falado2511 })", "        if (fm2511) Object.assign(fm2511, { modo: 'falado', motivo: null, falas: falado2511 })"],
  [ROUTE, "        if (fm2511) fm2511.motivo = 'gemini_recusou_no_envio'", "        if (false) fm2511.motivo = 'gemini_recusou_no_envio'"],
  [ROUTE, ";(response.kling4_trial as Record<string, unknown>).fala_2511 = f2511\n", '\n'],
  [BUILDER, "volume: falaDoMotorAtiva ? '100%' : '0%' }", "volume: '0%' }"],
  [BUILDER, "  if (!falaDoMotorAtiva) elements.push({ // KINEO-FALA-DOS-PERSONAGENS-2511", "  if (true) elements.push({ // KINEO-FALA-DOS-PERSONAGENS-2511"],
  [BUILDER, "  if (musicUrl && !falaDoMotorAtiva) {", "  if (musicUrl) {"],
  [BUILDER, "  if (falaDoMotorAtiva) totalDuration = 15\n", ''],
  [BUILDER, "const falaDoMotorAtiva = falaDoMotor === true && kling4TrialFilm && kling4TrialEngine === 'kling4' &&", "const falaDoMotorAtiva = falaDoMotor === true &&"],
  [BUDGET, "  const caiu = m!.motor_do_clipe !== 'gemini_omni_flash' || !!m!.gemini_queda || m!.engine_used !== 'kling4'\n", "  const caiu = false\n"],
  [BUDGET, "  if (!base || !f || typeof f !== 'object') return base\n", "  if (!base) return base\n  if (!f || typeof f !== 'object') return { ...base, voz: 'narrado', voz_motivo: null }\n"], // sem o marcador, o selo ganharia a voz
  [COMPOSE, "montagemFalada2511(marcadorDaFala2511, cinematicBirthClaim?.falModels?.[0])", "!!marcadorDaFala2511"],
  [COMPOSE, "composeInputs = { ...composeInputs, whisperWords: palavrasDoMotor2511 ?? undefined,", "composeInputs = { ...composeInputs,"],
  [COMPOSE, ", falaDoMotor: true }\n      source = buildCreatomateSource(composeInputs)", " }\n      source = buildCreatomateSource(composeInputs)"],
  [COMPOSE, "evidence: falaMontada2511 ? { ...captionEvidence, status: 'not_applicable' } : captionEvidence", "evidence: captionEvidence"],
  [CLAIM, "  if (fala.conferencia) return { ok: true, claim: current } // a 1ª conferência fica", "  // a 1ª conferência fica"],
]
let mortos = 0
for (const m of mutantes) {
  assert.ok(local(m[0]).split(m[1]).length === 2, 'mutante não aplica: ' + m[1].slice(0, 100))
  await assert.rejects(suite(m), (e) => e instanceof assert.AssertionError, 'SOBREVIVEU: ' + m[0] + ' · ' + m[1].slice(0, 100))
  mortos++
}
console.log(`PASS KINEO-FALA-DOS-PERSONAGENS-2511: chave 'internal' (casa exata) + voice_mode 'characters' (com ou sem verbatim); cliente, 'off' ou narrador = a nota 10 byte a byte; a casa = UM pedido falado ao Gemini (cabeçalho da nota 10, fala no plano, sem "Mouth closed"), o Kling 4 da queda = o de hoje (narrado); fora do formato, língua, roteiro da IA, pessoa real e recusa = narrado com o motivo; a montagem falada só com o Gemini entregando (som do motor, sem narração nem música, 15 s, legenda do Whisper do clipe); selo e claim dizem a voz; um débito só; ${mortos}/${mutantes.length} mutantes mortos.`)
