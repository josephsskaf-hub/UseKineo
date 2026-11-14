// KINEO-HISTORIA-REAL-1411 v2 [CEO 13-14/11, item 3.3; revisão independente 14/11: B1, C1, C2, C5] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com os textos REAIS do banco (ensaio de 14/11 nos últimos 30 dias) e os casos do revisor como negativos:
//   (A) a OBRA DE ARTE do elenco de um filme de história real não desenhado ganha a ficha da obra real, e a trava de estilo de verdade não lhe põe
//       "a living creature"; torradeira, carro, mascote, comida, filme desenhado, conto sem data ou sem pessoa nomeada: intactos (C2);
//   (B) o escopo: 'gratis_ideia' cobre só o filme grátis de ideia curta; o interruptor publicado é 'all' desde 14/11 12:40 (decisão da CEO:
//       o pago e colado da Mona Lisa do Logan entra; herdado segue fora); (F) o caso do Logan com o casting FALHANDO, pelas funções da rota;
//   (C) o ano por extenso só vira ano numa DATA EXPLÍCITA (mês ou "the year"/"ano de") e só para quem pede; os 16 negativos reais ficam (B1);
//   (D) o papel sem nome não vira 2ª ficha quando o ELENCO já tem gente nomeada do autor (estrutura, não palavra); a regra de palavra saiu (C1);
//   (E) fora do escopo nada lê: anúncio, hollywood, régua e trava não conhecem a regra; a rota só passa dentro do escopo;
//   (M) mutantes ficam vermelhos — inclusive "sem interruptor", "em herdado" e "calculado e nunca aplicado" (C5).
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/historiaReal1411.ts'
const EP = 'lib/cinematic/elencoEpoca.ts' // o ano por extenso e a camada do elenco moram aqui (sem import novo: os guardiões antigos carregam este arquivo sozinhos)
const globals = { AbortController, setTimeout, clearTimeout }
const carrega = (mutar = null, arq = ARQ) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === arq ? mutar(text) : text) })

const MONA = "The Mona Lisa vanished on a Monday morning in 1911. And nobody at the Louvre noticed until the next day. The thief was Vincenzo Peruggia, an Italian handyman who had helped build the painting's glass case. On Sunday he hid in a storage closet. On Monday, with the museum closed, he lifted her off the wall, slipped her under his white work smock, and walked out. Paris panicked. The police questioned Pablo Picasso. Then, in 1913, he carried her to Florence and tried to sell her to an art dealer. The dealer called the police."
const FREEMAN = 'Why did one pilot fly back fourteen times? November fourteenth, nineteen sixty-five. The Ia Drang Valley, Vietnam. An American battalion steps off its helicopters into tall grass. Back at base, Captain Ed Freeman hears the news.'
const boneco = (nome, esp) => `${nome}, an anthropomorphic ${esp} character: a ${esp} with big expressive cartoon eyes, eyebrows and a mouth, small arms and legs, still clearly shaped and textured like a real ${esp}, not a human, no human body or human face`
const objeto = (nome, esp) => ({ nome, nucleo: nome, tipo: 'criatura', canonica: boneco(nome, esp), origem: 'deterministica', protagonista: true, genero: null })
const PERUGGIA = { nome: 'Vincenzo Peruggia', nucleo: 'Peruggia', tipo: 'humano', canonica: 'Peruggia, exactly as the author wrote: "Vincenzo Peruggia"', origem: 'autor', protagonista: false, genero: null }
const HISTORIA = { estilizado: false, temEpoca: true, personificados: new Set() }

// (C) as datas REAIS do banco (filmes da casa e roteiro de cliente, 30 dias) → o ano que tem de sair
const DATAS = [
  ['Why did one pilot fly back fourteen times? November fourteenth, nineteen sixty-five. The Ia Drang Valley, Vietnam.', 'November fourteenth, 1965.', 1965],
  ['Why did three lighthouse keepers vanish? December, nineteen hundred. A stone lighthouse on a rocky Scottish island.', 'December, 1900.', 1900],
  ['Where did the crew of this ship go? December, eighteen seventy-two. An old wooden sailing ship, the Mary Celeste', 'December, 1872.', 1872],
  ['Where did the crew of this ship go December eighteen seventy-two An old wooden sailing ship', 'December 1872 An', 1872],
  ['Why did five brothers die on one ship? On November thirteenth, nineteen forty-two, the cruiser USS Juneau was fighting', 'November thirteenth, 1942,', 1942],
  ['Em três de novembro de dois mil e treze, Vladimir e Sergei Kulakov desapareceram.', 'novembro de 2013,', null],
  ['In the year nineteen twelve, the great ship sank.', 'the year 1912, the', 1912],
  ['In March nineteen fifty in Berlin the wall went up.', 'March 1950 in', 1950],
]
// (C) NÃO é ano: 8 do banco real (os 4 primeiros a regra antiga convertia) + os do revisor
const NAO_E_ANO = [
  "Who really built the Terracotta Army? Two thousand two hundred years ago, China's first emperor",
  'A piece of a flute. Made of bone. About two thousand eight hundred years old. He called it the first.',
  'a researcher at the University of Malta has mapped two thousand six hundred and twenty-eight of these tracks',
  'a wealthy Briton who lived around sixteen hundred years ago.',
  'Inside were dozens of gears, two thousand years old. It tracked the Sun',
  'these objects connect us to personal memories, almost two thousand years later.',
  'As primeiras obras têm mais de dois mil e quinhentos anos. Os pesquisadores acham',
  'She was retired in nineteen sixty-nine, and for almost thirty years she rusted', // ano de verdade, mas SEM data explícita: fica (limite declarado)
  'Two thousand five hundred years ago, in ancient Greece, one man asked a question.',
  'Get yours today for only nineteen ninety-five.',
  'At nineteen hundred hours the squad boarded the truck.',
  'The crowd grew to two thousand.',
  'Plans start at eighteen ninety-nine a month.',
  'No estádio cabiam dois mil.',
  'She was nineteen, sixty miles from home, with two thousand soldiers.',
  'In December nineteen hundred hours of footage were lost.',
  'By March two thousand five hundred soldiers had arrived.',
  'They may nineteen hundred times repeat it.',
  // N2 (revisão independente 14/11): número colado a substantivo é contagem, mesmo depois de um mês
  'In March, nineteen fifty refugees crossed the border with Maria.',
  'On June 5th, two thousand fans waited for Taylor at the gate.',
  'May nineteen ninety-nine reasons be enough for you, Jake.',
  'In December, two thousand twenty volunteers built the bridge.',
  'The soldiers march nineteen hundred in total.', // só o mutante do mês minúsculo ("march" verbo) pega este
  'In the year nineteen twelve the great ship sank.', // limite declarado: sem vírgula e seguido de artigo minúsculo, não vira ano
  'Em novembro de dois mil e quinhentos soldados chegaram ao porto.',
  'In December two thousand five hundred men landed.',
]
// (A) o que NÃO é obra de arte (revisor, C2) mesmo em história com data e pessoa nomeada
const NAO_E_OBRA = [['Toasty', 'toaster'], ['KITT', 'car'], ['Herbie', 'car'], ['Cuppy', 'mascot'], ['Cuppy', 'coffee cup'], ['Mr. Tomato', 'tomato'], ['Robo', 'painting robot'], ['the trunk', 'trunk']]

function provas(L) {
  const erros = []
  const m = L(ARQ), ee = L(EP), tr = L('lib/cinematic/elencoTrava.ts'), st = L('lib/cinematic/sceneStyle.ts')
  const fotorreal = st.deriveStyleAnchor('photorealistic documentary')
  if (fotorreal.look !== 'photoreal') erros.push('fixture: o estilo não é fotorreal')
  // ── (A) a obra real ──
  const el = [objeto('Mona Lisa', 'painting'), PERUGGIA]
  const r = m.obraRealNoElenco(el, HISTORIA)
  const f = r.elenco[0].canonica
  if (r.trocados.join() !== 'Mona Lisa' || /anthropomorphic|cartoon eyes|arms and legs/.test(f) || !f.startsWith('Mona Lisa, the real painting: a realistic oil painting on a flat canvas in a carved wooden frame, looking exactly like the real Mona Lisa') || !/still work of art/.test(f)) erros.push('A a ficha do quadro: ' + f)
  if (r.elenco[1] !== el[1]) erros.push('A mexeu na ficha de gente')
  // a trava de estilo de VERDADE (o passo seguinte da rota) não pode pôr "a living creature" na obra; no boneco ela põe (o defeito do claim)
  const travado = tr.travarEstiloDoElenco(r.elenco, fotorreal, MONA).elenco[0].canonica
  if (/living creature/.test(travado) || travado !== f) erros.push('A a trava de estilo reescreveu a obra real: ' + travado.slice(-120))
  if (!/a living creature filmed in photorealistic live action/.test(tr.travarEstiloDoElenco(el, fotorreal, MONA).elenco[0].canonica)) erros.push('A fixture: a trava já não põe "a living creature" no boneco')
  // as três condições da assinatura de história real, uma de cada vez
  if (m.obraRealNoElenco(el, { ...HISTORIA, estilizado: true }).trocados.length) erros.push('A filme desenhado perdeu o personagem-objeto')
  if (m.obraRealNoElenco(el, { ...HISTORIA, temEpoca: false }).trocados.length) erros.push('A conto sem data: a estátua/quadro que ganha vida virou objeto morto')
  for (const [nome, outro] of [['sem gente', []], ['só papel sem nome', [{ ...PERUGGIA, nome: 'the thief' }]], ['gente do modelo', [{ ...PERUGGIA, origem: 'modelo' }]], ['só bicho', [{ ...PERUGGIA, tipo: 'animal' }]]]) {
    if (m.obraRealNoElenco([objeto('Mona Lisa', 'painting'), ...outro], HISTORIA).trocados.length) erros.push(`A sem pessoa nomeada do autor (${nome}) trocou a ficha`)
  }
  for (const [nome, esp] of NAO_E_OBRA) {
    const x = m.obraRealNoElenco([objeto(nome, esp), PERUGGIA], HISTORIA)
    if (x.trocados.length || x.elenco[0].canonica !== boneco(nome, esp)) erros.push(`A (C2) "${nome}" (${esp}) deixou de ser personagem: ${x.elenco[0].canonica.slice(0, 90)}`)
  }
  if (m.obraRealNoElenco([objeto('Canvas', 'canvas'), PERUGGIA], { ...HISTORIA, personificados: new Set(['canvas']) }).trocados.length) erros.push('A o nome que o texto personifica virou objeto')
  for (const [nome, esp, quer] of [['David', 'marble statue', 'a real, solid marble statue standing motionless on its base'], ['The Last Supper', 'fresco', 'a real fresco painted on a flat wall'], ['Mona Lisa', 'oil painting', 'a realistic oil painting on a flat canvas']]) {
    const x = m.obraRealNoElenco([objeto(nome, esp), PERUGGIA], HISTORIA).elenco[0].canonica
    if (!x.includes(quer) || /anthropomorphic/.test(x)) erros.push(`A a obra "${nome}" (${esp}): ${x.slice(0, 120)}`)
  }
  const semNome = m.obraRealNoElenco([objeto('the painting', 'painting'), PERUGGIA], HISTORIA).elenco[0].canonica
  if (/the real the |looking exactly like/.test(semNome) || !semNome.startsWith('the painting, the real painting: a realistic oil painting')) erros.push('A (M2) a obra sem nome próprio: ' + semNome.slice(0, 120))
  if (m.ehObraDeArte('painting robot') || !m.ehObraDeArte('Oil Painting') || m.ehObraDeArte('toaster') || m.ehObraDeArte(null)) erros.push('A ehObraDeArte')
  try { if (m.obraRealNoElenco(null, HISTORIA).elenco.length || m.obraRealNoElenco([{ nome: 'x' }], HISTORIA).trocados.length || m.obraRealNoElenco(el, null).trocados.length) erros.push('A entrada torta trocou ficha') } catch (e) { erros.push('A entrada torta LANÇOU: ' + e.message) }
  if (!m.historiaTemEpoca(MONA) || m.historiaTemEpoca('A statue comes alive at night in the museum.') || !m.historiaTemEpoca(FREEMAN)) erros.push('A historiaTemEpoca')
  // ── (B) o escopo ──
  const E = { gratis: true, verbatim: false, herdado: false, pedido: 'the theft of the Mona Lisa in 1911' }
  const esc = (over, modo = 'gratis_ideia') => m.escopoDaHistoriaReal({ ...E, ...over }, modo)
  if (!esc({}) || esc({ gratis: false }) || esc({ verbatim: true }) || esc({ herdado: true }) || esc({ pedido: null }) || esc({ pedido: '   ' }) || esc({ pedido: Array(61).fill('word').join(' ') }) || !esc({ pedido: Array(60).fill('word').join(' ') })) erros.push('B o escopo mínimo (grátis, ideia de 1 a 60 palavras, não colado, não herdado)')
  if (esc({}, 'off') || !esc({ gratis: false, verbatim: true, pedido: null }, 'all') || esc({ herdado: true }, 'all')) erros.push("B os modos 'off' e 'all'")
  // reancorado [CEO 14/11 12:40]: o interruptor publicado é 'all' — o pago e colado entra, o herdado segue fora
  if (m.HISTORIA_REAL_1411 !== 'all' || m.escopoDaHistoriaReal({ ...E, gratis: false, verbatim: true, pedido: MONA }) !== true || m.escopoDaHistoriaReal({ ...E, herdado: true }) !== false) erros.push('B o interruptor publicado não cobre o pago e colado (ou cobre o herdado)')
  // v3: o ano MODERNO por extenso na história ("In twenty eighteen, explorers…") a leva ao presente, como "2018" em números: sem trava
  if (ee.epocaDaHistoria('On November thirteenth, nineteen forty-two, the cruiser sank. In twenty eighteen, explorers finally found the Juneau.', { anoPorExtenso: true }) !== null || ee.epocaDaHistoria('November fourteenth, nineteen sixty-five. In two thousand one, at the White House, he received the medal.', { anoPorExtenso: true }) !== null) erros.push('C v3 a história que chega ao presente (por extenso) ganhou trava')
  if (ee.epocaDaHistoria('In August 1923 the dog went missing. He crossed more than two thousand five hundred miles.', { anoPorExtenso: true })?.ano !== 1923 || ee.epocaDaHistoria('In August 1923 the dog went missing. She counted to twenty eleven times.', { anoPorExtenso: true })?.ano !== 1923 || ee.epocaDaHistoria('December, nineteen hundred. Three keepers vanished.', { anoPorExtenso: true })?.ano !== 1900) erros.push('C v3 distância por extenso virou ano moderno, ou a data real perdeu a trava')
  // ── (C) o ano por extenso ──
  for (const [texto, trecho, ano] of DATAS) {
    const c = m.comAnosPorExtenso(texto)
    if (!c.includes(trecho)) erros.push(`C a data real não foi lida: "${texto.slice(0, 60)}" → "${c.slice(0, 80)}"`)
    const e = ee.epocaDaHistoria(texto, { anoPorExtenso: true })
    if ((e?.ano ?? null) !== ano) erros.push(`C a época de "${trecho}" saiu ${e?.ano ?? null}, queria ${ano}`)
    if (ee.epocaDaHistoria(texto) !== null && !/\d{4}/.test(texto)) erros.push(`C sem pedir, leu o ano por extenso: "${trecho}"`)
  }
  for (const texto of NAO_E_ANO) {
    if (m.comAnosPorExtenso(texto) !== texto) erros.push(`C virou ano o que não é data: "${texto.slice(0, 60)}" → "${m.comAnosPorExtenso(texto).slice(0, 80)}"`)
    if (ee.epocaDaHistoria(texto, { anoPorExtenso: true }) !== null) erros.push(`C época inventada em "${texto.slice(0, 60)}"`)
  }
  const e65 = ee.epocaDaHistoria(DATAS[0][0], { anoPorExtenso: true }), e00 = ee.epocaDaHistoria(DATAS[1][0], { anoPorExtenso: true })
  const s65 = e65 ? ee.sufixoDeEpoca(e65) : '', s00 = e00 ? ee.sufixoDeEpoca(e00) : ''
  if (!s65.includes('Period setting: 1965 (1960s)') || !s65.includes('wears 1960s dress') || !s00.includes('Period setting: 1900 (1900s)') || !s00.includes('Edwardian dress') || s65 === s00) erros.push('C a época lida não trava a roupa da década certa: ' + s65.slice(0, 80) + ' / ' + s00.slice(0, 80))
  // ── (D) o papel sem nome e o elenco ──
  const prompts = ['A dim museum gallery with an empty wall and four iron hooks.', 'A dusty storage closet door, slightly open.', 'A wooden trunk in a small rented room.']
  const falas = ['The Mona Lisa vanished on a Monday morning in 1911.', 'The thief was Vincenzo Peruggia, an Italian handyman. On Sunday he hid in a storage closet.', 'For two years the painting sat in a trunk.']
  const camada = (ctx, extra = {}, pr = prompts, fa = falas) => ee.aplicarElencoEEpoca({ prompts: pr, falas: fa, contextoOriginal: ctx, contextoFiltro: ctx, modo: 'character_story', tagFaceless: false, provaDeGente: true, ...extra })
  const b = camada(MONA), d = camada(MONA, { historiaReal: { nomeadoNoElenco: true } })
  if (!b.relato.elenco.some((x) => x.nome === 'the thief') || !b.prompts.join(' ').includes('the thief, a')) erros.push('D fixture: a base já não inventa "the thief"')
  if (d.relato.elenco.length || d.prompts.join(' ').includes('the thief, a') || d.relato.motivo_sem_elenco !== 'gente_nomeada_no_elenco') erros.push('D "the thief" ainda ganha ficha própria ao lado de Vincenzo Peruggia: ' + JSON.stringify(d.relato.elenco))
  if (d.relato.epoca?.ano !== 1911 || !d.prompts[1].includes('Period setting: 1911')) erros.push('D sem o papel inventado, a época também sumiu')
  // (C1) os casos do revisor: sem gente nomeada no elenco, a camada fica BYTE A BYTE a base
  for (const ctx of ['A young girl finds a glowing stone in the forest. Suddenly, the girl hears a voice.', 'The chef was Japanese. The chef plated the fish in silence.', 'The boy was born in Texas. The boy rode his bike to school.', 'In London, the commuter waits for the last train. The commuter checks the clock.']) {
    const pr = ['An empty forest clearing at dawn.', 'A kitchen counter with a knife and a fish.', 'A quiet station platform at night.'], fa = [ctx, '', '']
    const x = JSON.stringify(camada(ctx, {}, pr, fa)), y = JSON.stringify(camada(ctx, { historiaReal: { nomeadoNoElenco: false, anoPorExtenso: true } }, pr, fa))
    if (x !== y) erros.push(`D (C1) o protagonista sem nome mudou em "${ctx.slice(0, 40)}"`)
    if (!/the (?:young )?(?:girl|chef|boy|commuter), a/.test(JSON.parse(x).prompts.join(' '))) erros.push(`D (C1) fixture: a base não dá ficha ao papel de "${ctx.slice(0, 40)}"`)
  }
  if (ee.papelEhONomeado !== undefined || m.papelEhONomeado !== undefined) erros.push('D (C1) a regra de palavra papelEhONomeado ainda existe')
  if (!m.genteNomeadaDoAutor([PERUGGIA]) || m.genteNomeadaDoAutor([{ ...PERUGGIA, nome: 'the thief' }]) || m.genteNomeadaDoAutor([{ ...PERUGGIA, origem: 'modelo' }]) || m.genteNomeadaDoAutor([objeto('Mona Lisa', 'painting')]) || m.genteNomeadaDoAutor(null) || m.genteNomeadaDoAutor([{ ...PERUGGIA, nome: 'o ladrão' }])) erros.push('D genteNomeadaDoAutor')
  // a camada lê o ano por extenso só quando a rota pede
  const fr = ['A valley of tall grass under a grey sky.', 'A row of helicopters on a dirt airfield.', 'A radio on a wooden table.'], ff = [FREEMAN, '', '']
  if (camada(FREEMAN, {}, fr, ff).relato.epoca !== null) erros.push('D sem pedir, a camada leu 1965 (anúncio e herdado leriam também)')
  if (camada(FREEMAN, { historiaReal: { anoPorExtenso: true } }, fr, ff).relato.epoca?.ano !== 1965) erros.push('D pedindo, a camada não leu 1965')
  // ── (F) [CEO 14/11 12:40] o filme do Logan (b6068711): pago, colado, casting FALHANDO — o elenco é o do leitor semântico (a Mona Lisa como boneco
  // que fala, o Peruggia do autor). Pelas funções da rota, no interruptor PUBLICADO: a obra vira a obra real e "the thief" não entra ao lado dele.
  {
    const T = MONA
    const escopo = m.escopoDaHistoriaReal({ gratis: false, verbatim: true, herdado: false, pedido: T })
    const elenco = [objeto('Mona Lisa', 'painting'), { ...PERUGGIA, nome: 'Vincenzo Peruggia', canonica: 'Vincenzo Peruggia, exactly as the author wrote: "Vincenzo Peruggia, an Italian handyman"' }]
    const obra = escopo ? m.obraRealNoElenco(elenco, { estilizado: false, temEpoca: m.historiaTemEpoca(T), personificados: new Set() }) : { elenco, trocados: [] }
    const ml = obra.elenco.find((e) => e.nome === 'Mona Lisa')?.canonica ?? ''
    if (!escopo || /anthropomorphic|living creature|small arms and legs/.test(ml) || !/the real painting/.test(ml)) erros.push('F Logan: a Mona Lisa segue boneco vivo no pago e colado: ' + ml.slice(0, 90))
    const PLANOS = ['A dimly lit corner of the Louvre, the empty frame of the Mona Lisa on the wall, shadows creeping in.', 'Vincenzo Peruggia, dressed in a white work smock, crouched inside a dark storage closet.', "A close-up of Peruggia's hands carefully lifting the Mona Lisa from the wall.", 'A crowd gathered outside the Louvre, staring at four empty iron hooks on the wall.', 'A dusty trunk in a dimly lit room, the lid slightly ajar.', 'Peruggia walking through a bustling Florence street, the Mona Lisa hidden under his arm.', 'A close-up of art enthusiasts gazing at the iconic Mona Lisa.']
    const FALAS = ['The Mona Lisa vanished on a Monday morning in 1911.', 'The thief was Vincenzo Peruggia, an Italian handyman. On Sunday he hid in a storage closet.', 'On Monday he lifted her off the wall and walked out.', 'Crowds lined up just to stare at four empty iron hooks.', 'The most famous painting in the world sat in a trunk in Paris.', 'Then, in 1913, he carried her to Florence.', 'The crime made her famous.']
    const era = ee.aplicarElencoEEpoca({ prompts: PLANOS, falas: FALAS, contextoOriginal: T, contextoFiltro: T, modo: 'character_story', tagFaceless: false, provaDeGente: true, ...(escopo ? { historiaReal: { anoPorExtenso: true, nomeadoNoElenco: m.genteNomeadaDoAutor(obra.elenco) } } : {}) })
    if (era.prompts.some((p) => /Named character in this shot: the thief/.test(p))) erros.push('F Logan: "the thief" entrou ao lado do Peruggia')
  }
  return erros
}

const base = provas(carrega())
checa(`A, B, C e D verdes nos textos reais e nos negativos do revisor${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)

// ── (E) quem lê e quem não lê ──
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const epoca = lf(fs.readFileSync(EP, 'utf8'))
const ESCOPO = 'const historiaReal1411 = escopoDaHistoriaReal({ gratis: kling4TrialCandidate, verbatim, herdado: !!qualidadeHerdada, pedido: pedidoDoCliente })'
const OBRA = 'if (historiaReal1411) { try { const obraReal = obraRealNoElenco(elencoDoPedido, { estilizado: isStylizedLook(styleAnchor) || desenhoInfantil.ativo, temEpoca: historiaTemEpoca(prompt), personificados: nomesPersonificados(prompt) }); if (obraReal.trocados.length) { elencoDoPedido.splice(0, elencoDoPedido.length, ...obraReal.elenco);'
const iEscopo = rota.indexOf(ESCOPO), iObra = rota.indexOf(OBRA)
const iFolha = rota.indexOf('const personagemElenco: { elenco: FichaDePersonagem[]; casting: string; ms: number } = qualidadeHerdada')
checa('E a rota decide UM escopo (grátis, não colado, não herdado, o pedido do cliente) e ele manda nas três peças', iEscopo > 0 && rota.split('escopoDaHistoriaReal(').length === 2 && rota.split('obraRealNoElenco(').length === 2)
checa('E a obra real entra no elenco ANTES da folha, só dentro do escopo, com o filme desenhado e a comida que fala de fora, e É APLICADA ao elenco', iObra > iEscopo && iObra < iFolha && rota.slice(iObra, rota.indexOf('\n', iObra)).includes("} catch (e) { console.warn('[cinematic] KINEO-HISTORIA-REAL falhou, elenco segue como estava:"))
const linhaClassica = rota.split('\n').find((l) => l.includes('const elencoEpoca = prepararQualidadeDoFilme({ prompts: classicScenePrompts')) ?? ''
checa('E só a estrada clássica passa a regra à camada de época, e só dentro do escopo (fora dele a chamada fica byte a byte)', rota.split('historiaReal:').length === 2 && linhaClassica.includes('...(historiaReal1411 ? { historiaReal: { anoPorExtenso: true, nomeadoNoElenco: genteNomeadaDoAutor(elencoDoAjuste) } } : {})') && linhaClassica.includes('preservarElenco: !!qualidadeHerdada'))
checa('E (B1) anúncio, régua, trava de ficha e refazer-cena não conhecem a regra; hollywood não a passa', ['lib/ads/v2FilmQuality.ts', 'lib/ads/cena/filmQuality.ts', 'lib/regua95/perguntasHonestas.ts', 'lib/cinematic/elencoTrava.ts', 'lib/free15RefazCena0311.ts'].every((a) => { const t = fs.readFileSync(a, 'utf8'); return !/anoPorExtenso|historiaReal|comAnosPorExtenso/.test(t) }) && !/anoPorExtenso: true/.test(rota.replace(linhaClassica, '')))
checa('E a camada de época não lê interruptor global (só o que a chamada passa) e não ganhou import novo', !epoca.includes('historiaRealLigada()') &&epoca.includes('digitosAscii(opts?.anoPorExtenso === true ? comAnosPorExtenso(') && epoca.includes('epocaDaHistoria(args.contextoOriginal, { anoPorExtenso: args.historiaReal?.anoPorExtenso === true })') && !epoca.includes("from '@/lib/cinematic/historiaReal1411'"))
checa('E o repasse da camada (prepararQualidadeDoFilme) leva o argumento sem valor padrão', lf(fs.readFileSync('lib/cinematic/filmQuality.ts', 'utf8')).includes("historiaReal?: Parameters<typeof aplicarElencoEEpoca>[0]['historiaReal']") && lf(fs.readFileSync('lib/cinematic/filmQuality.ts', 'utf8')).includes('const cast = aplicarElencoEEpoca({ ...args, prompts: withRoom')) // reancorado (KINEO-FICHA-DO-AUTOR-MANDA-1411): a mesma chamada com ...args, que pode levar as fichas do autor depois

const MUTANTES = [
  // a obra real
  ['a obra real também em filme desenhado', ARQ, (s) => s.replace('if (o?.estilizado !== false || o?.temEpoca !== true', 'if (o?.temEpoca !== true')],
  ['a obra real em conto sem data', ARQ, (s) => s.replace('o?.estilizado !== false || o?.temEpoca !== true || ', 'o?.estilizado !== false || ')],
  ['a obra real sem pessoa nomeada no elenco', ARQ, (s) => s.replace(' || !genteNomeadaDoAutor(lista)) return { elenco: lista, trocados }', ') return { elenco: lista, trocados }')],
  ['(C2) qualquer objeto vira objeto morto', ARQ, (s) => s.replace('    : null\n  if (!forma) return null', '    : `a real ${esp}`\n  if (!forma) return null')],
  ['a comida que fala vira objeto', ARQ, (s) => s.replace('if (!m || o.personificados?.has(', 'if (!m || false && o.personificados?.has(')],
  ['a ficha perde a frase que a trava de estilo reconhece', ARQ, (s) => s.replace('lift and carry, filmed in photorealistic live action, the same', 'lift and carry, photographed realistically, the same')],
  ['(M2) "the real the painting"', ARQ, (s) => s.replace('const igual = n && !ARTIGO_RE.test(n) ?', 'const igual = n ?')],
  ['a pintura perde o óleo e a moldura', ARQ, (s) => s.replace("'a realistic oil painting on a flat canvas in a carved wooden frame'", "'a painting'")],
  ['"painting robot" vira obra de arte', ARQ, (s) => s.replace('const PINTURA_RE = /(?:^|\\s)(?:painting|portrait|canvas)$/i', 'const PINTURA_RE = /(?:painting|portrait|canvas)/i')],
  ['resultado calculado e nunca devolvido', ARQ, (s) => s.replace('  return { elenco: novo, trocados }', '  return { elenco: lista, trocados }')],
  // o escopo
  ['filme PAGO entra no escopo', ARQ, (s) => s.replace('return a.gratis === true && a.verbatim !== true && ', 'return a.verbatim !== true && ')],
  ['roteiro colado entra no escopo', ARQ, (s) => s.replace('a.gratis === true && a.verbatim !== true && ', 'a.gratis === true && ')],
  ['filme herdado entra no escopo', ARQ, (s) => s.replace("if (modo === 'off' || a.herdado) return false", "if (modo === 'off') return false")],
  ['pedido longo entra no escopo', ARQ, (s) => s.replace(' && n <= HISTORIA_REAL_IDEIA_MAX_PALAVRAS', '')],
  ['sem interruptor (desligado ainda roda)', ARQ, (s) => s.replace("if (modo === 'off' || a.herdado) return false", 'if (a.herdado) return false')],
  ['o interruptor publicado volta ao escopo mínimo (o Logan fica fora)', EP, (s) => s.replace("export const HISTORIA_REAL_1411: ModoHistoriaReal = 'all'", "export const HISTORIA_REAL_1411: ModoHistoriaReal = 'gratis_ideia'")],
  ['v3: o ano moderno por extenso não conta', EP, (s) => s.replace(String.raw`  if (opts?.anoPorExtenso === true && ANO_MODERNO_POR_EXTENSO_RE_1411.test(String(contexto ?? ''))) presente = true`, '')],
  ['v3: sem a preposição de tempo (contagem vira ano)', EP, (s) => s.replace(String.raw`(?:in|by|until|since|from|before|after|around|of)\s+(?:twenty`, String.raw`(?:(?:in|by|until|since|from|before|after|around|of)\s+)?(?:twenty`)],
  // gente nomeada
  ['papel sem nome conta como pessoa nomeada', ARQ, (s) => s.replace(" && !ARTIGO_RE.test(String(f?.nome ?? '').trim()))", ')')],
  ['ficha inventada pelo modelo conta como nomeada', ARQ, (s) => s.replace("f?.tipo === 'humano' && f?.origem === 'autor' && ", "f?.tipo === 'humano' && ")],
  ['bicho com nome conta como pessoa nomeada', ARQ, (s) => s.replace("f?.tipo === 'humano' && f?.origem === 'autor' && ", "f?.origem === 'autor' && ")],
  // o ano por extenso
  ['(B1) ano por extenso fora de data explícita', EP, (s) => s.replace('DATA_ANTES_RE.test(texto.slice(Math.max(0, pos - 60), pos)) && ', '')],
  ['(B1) todo mundo lê o ano por extenso (anúncio, herdado, régua)', EP, (s) => s.replace('digitosAscii(opts?.anoPorExtenso === true ? comAnosPorExtenso(', 'digitosAscii(true ? comAnosPorExtenso(')],
  ['(N2) número seguido de substantivo vira ano', EP, (s) => s.replace(' && DEPOIS_DO_ANO_RE.test(texto.slice(fim, fim + 24))', '')],
  ['mês minúsculo vale como data ("may" verbo)', EP, (s) => s.replace("const DATA_ANTES_RE = new RegExp(String.raw`(?:\\b(?:${MES_EN})", "const DATA_ANTES_RE = new RegExp(String.raw`(?:\\b(?:${MES_EN.toLowerCase()}|${MES_EN})")],
  ['a data com mês deixa de ser lida', EP, (s) => s.replace('\\b(?:${MES_EN})(?:\\s+${DIA})?\\s*,?\\s+(?:of\\s+)?|', '')],
  ['a camada ignora o pedido de ano da rota', EP, (s) => s.replace('{ anoPorExtenso: args.historiaReal?.anoPorExtenso === true }', '{ anoPorExtenso: false }')],
  // o papel sem nome
  ['(C1) papel sem nome inventado apesar da pessoa nomeada no elenco', EP, (s) => s.replace('const semNome = nomeadoJaNoElenco1411 ? null : args.provaDeGente', 'const semNome = args.provaDeGente')],
  ['(C1) a camada some com o papel sem nome em todo filme', EP, (s) => s.replace('const nomeadoJaNoElenco1411 = args.historiaReal?.nomeadoNoElenco === true', 'const nomeadoJaNoElenco1411 = true')],
]
for (const [nome, arq, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(arq, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega((t) => fn(lf(t)), arq)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
// mutantes da ROTA (texto): sem o escopo, em herdado, calculado e nunca aplicado, sem a proteção da comida — cada um derruba uma checagem (E)
const MUTANTES_DA_ROTA = [
  ['rota: a obra real sem o escopo', (s) => s.replace('if (historiaReal1411) { try { const obraReal', 'if (true) { try { const obraReal')],
  ['rota: o escopo sem o filtro de herdado', (s) => s.replace('herdado: !!qualidadeHerdada, pedido: pedidoDoCliente })', 'herdado: false, pedido: pedidoDoCliente })')],
  ['rota: o escopo sem o filtro de filme grátis', (s) => s.replace('escopoDaHistoriaReal({ gratis: kling4TrialCandidate,', 'escopoDaHistoriaReal({ gratis: true,')],
  ['rota: a obra real calculada e NUNCA aplicada ao elenco', (s) => s.replace('elencoDoPedido.splice(0, elencoDoPedido.length, ...obraReal.elenco);', '')],
  ['rota: a obra real sem a proteção da comida que fala', (s) => s.replace('temEpoca: historiaTemEpoca(prompt), personificados: nomesPersonificados(prompt) })', 'temEpoca: historiaTemEpoca(prompt) })')],
  ['rota: a obra real também em desenho infantil', (s) => s.replace('estilizado: isStylizedLook(styleAnchor) || desenhoInfantil.ativo, temEpoca', 'estilizado: isStylizedLook(styleAnchor), temEpoca')],
  ['rota: a época por extenso fora do escopo', (s) => s.replace('...(historiaReal1411 ? { historiaReal: { anoPorExtenso: true,', '...(true ? { historiaReal: { anoPorExtenso: true,')],
  ['rota: hollywood também passa a regra', (s) => s.replace('contextoOriginal: contexto, contextoFiltro: await contextoDoFiltro(contexto), modo: classicVisualMode,', 'contextoOriginal: contexto, historiaReal: { anoPorExtenso: true }, contextoFiltro: await contextoDoFiltro(contexto), modo: classicVisualMode,')],
]
const checagensDaRota = (r) => {
  const iE = r.indexOf(ESCOPO), iO = r.indexOf(OBRA)
  const lc = r.split('\n').find((l) => l.includes('const elencoEpoca = prepararQualidadeDoFilme({ prompts: classicScenePrompts')) ?? ''
  return iE > 0 && iO > iE && r.split('historiaReal:').length === 2 && lc.includes('...(historiaReal1411 ? { historiaReal: { anoPorExtenso: true, nomeadoNoElenco: genteNomeadaDoAutor(elencoDoAjuste) } } : {})') && !/anoPorExtenso: true/.test(r.replace(lc, ''))
}
checa('controle: as checagens da rota passam na rota real', checagensDaRota(rota))
for (const [nome, fn] of MUTANTES_DA_ROTA) {
  const mut = fn(rota)
  checa(`mutante "${nome}" fica vermelho (${mut !== rota ? 'aplicou' : 'NÃO APLICOU'})`, mut !== rota && !checagensDaRota(mut))
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
