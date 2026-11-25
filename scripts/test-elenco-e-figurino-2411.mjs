// KINEO-ELENCO-E-FIGURINO-2411 — guardião sem rede e sem custo. Executa as funções REAIS (lib/cinematic/elencoEFigurino2411.ts e as camadas que ela
// alimenta: elencoDoRoteiro, lerElencoSemantico, aplicarElencoSemantico, elencoConferido, elencoDoFilme15, elencoComFichaDoPedido, promptDaFolha,
// referenciaUnicaDoFilme, buildKling4ReferenciaUnicaInput) nos três roteiros reais da prova paga de 24/11 (fixture com os eventos gravados), nas
// contraprovas e no corpus do cabeçalho de conferenciaDoElenco.ts. Cada regra tem mutante que fica vermelho pela asserção exata.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const MOD = 'lib/cinematic/elencoEFigurino2411.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const CASA = 'casa@ensaio.test'
const PADRAO_INTERNO = 'qualquer@interno-por-padrao.test'
const mocksCasa = { '@/lib/internalAccounts': { contaDaCasaExata: (e) => e === CASA, isInternalEmail: (e) => e === CASA || e === PADRAO_INTERNO } }
const carrega = (arq, mutar = null, alvo = MOD) => createOfflineLoader({ source: (rel, t) => (mutar && rel === alvo ? mutar(t) : t), mocks: mocksCasa })(arq)
const mundo = (mutar = null, alvo = MOD) => ({
  m: carrega(MOD, mutar, alvo), aj: carrega('lib/cinematic/personagemAjuste.ts', mutar, alvo), sem: carrega('lib/cinematic/elencoSemantico.ts', mutar, alvo),
  conf: carrega('lib/cinematic/conferenciaDoElenco.ts', mutar, alvo), f15: carrega('lib/filmes/filme15Elenco.ts', mutar, alvo),
  fp: carrega('lib/cinematic/fichaDoPedido.ts', mutar, alvo), folha: carrega('lib/cinematic/folhaDePersonagem.ts', mutar, alvo),
})
const FIX = JSON.parse(fs.readFileSync('scripts/fixtures/elenco-e-figurino-2411-casos.json', 'utf8')).casos
const { cooper: COO, leprince: LEP, slocum: SLO } = FIX
const LEITURA_UMA = (nome) => JSON.stringify({ protagonist: { name: nome, kind: 'human' }, supporting: [], places_and_orgs: [] })
const LEITURA_DUAS = (nome, outro) => JSON.stringify({ protagonist: { name: nome, kind: 'human' }, supporting: [{ name: null, role_text: outro, kind: 'human', on_screen: false }], places_and_orgs: [] })
const CTX_SLO = { lingua: 'en', leituraBruta: JSON.stringify(SLO.leitura_semantica.raw) }
const CTX_LEP = { lingua: 'en', leituraBruta: JSON.stringify(LEP.leitura_semantica.raw) }
const nomes = (e) => e.map((f) => f.nome)
const fic = (nome, extra = {}) => ({ nome, nucleo: nome.split(' ').pop(), tipo: 'humano', canonica: `${nome}, a person`, origem: 'deterministica', protagonista: true, genero: null, ...extra })

// ═══ 1. Le Prince: o nome curto que o roteiro prova ═══════════════════════════════════════════════════════════════════════
function provaLePrince(w) {
  const e = []
  const base = w.aj.elencoDoRoteiro(LEP.roteiro, {})
  if (nomes(base).join() !== 'Prince') e.push('1.0 base real mudou: ' + nomes(base))
  const leitura = w.sem.lerElencoSemantico(JSON.stringify(LEP.leitura_semantica.raw), LEP.roteiro)
  const conf = w.conf.conferenciaDaLeitura(leitura)
  if (JSON.stringify(conf?.nomes) !== JSON.stringify(LEP.evento_cast_checked.lidos)) e.push('1.1 leitura reconstruída não reproduz os lidos gravados')
  // ANTES (o que a produção gravou): aplicar = null e a conferência retira "Prince"
  if (w.sem.aplicarElencoSemantico(base, leitura, LEP.roteiro) !== null) e.push('1.2 antes: a leitura aplicada devia ser null')
  const antes = w.conf.elencoConferido(base, conf)
  if (antes.elenco.length !== 0 || JSON.stringify(antes.removidos) !== JSON.stringify(LEP.evento_cast_checked.removidos)) e.push('1.3 antes: não reproduz removidos=["Prince"]')
  // DEPOIS
  const r = w.m.elencoComNomeCompleto(base, conf.nomes, LEP.roteiro)
  if (JSON.stringify(r.renomeados) !== '[["Prince","Louis Le Prince"]]') e.push('1.4 renomeados=' + JSON.stringify(r.renomeados))
  const f = r.elenco[0]
  if (!f || f.nome !== 'Louis Le Prince' || f.nucleo !== 'Prince' || !f.canonica.startsWith('Louis Le Prince, ') || f.protagonista !== true) e.push('1.5 ficha renomeada errada ' + JSON.stringify(f))
  if (base[0].nome !== 'Prince') e.push('1.6 mexeu no objeto recebido')
  const aplicado = w.sem.aplicarElencoSemantico(r.elenco, leitura, LEP.roteiro)
  if (!aplicado || aplicado.protagonista !== 'Louis Le Prince' || aplicado.elenco.length !== 1) e.push('1.7 depois: leitura aplicada devia ter o Louis Le Prince ' + JSON.stringify(aplicado?.elenco?.map((x) => x.nome)))
  const depois = w.conf.elencoConferido(r.elenco, conf)
  if (depois.removidos.length !== 0 || nomes(depois.elenco).join() !== 'Louis Le Prince') e.push('1.8 depois: conferência retirou ' + depois.removidos)
  // a ficha do pedido (camada que já existe, KINEO-FICHA-DO-PEDIDO-0911) agora casa o nome e leva "bearded inventor in an 1880s suit"
  const doPedido = w.fp.elencoComFichaDoPedido(LEP.ideia, depois.elenco)
  if (!doPedido.elenco[0].canonica.includes('bearded inventor in an 1880s suit')) e.push('1.9 a ficha não leva a descrição do pedido: ' + doPedido.elenco[0].canonica)
  return { e, antes: { elenco: nomes(antes.elenco), removidos: antes.removidos }, depois: { elenco: nomes(depois.elenco), ficha: doPedido.elenco[0].canonica } }
}
// contraprovas do nome
function contraprovasNome(w) {
  const e = []
  const n = (curto, lidos, texto) => w.m.nomeCompletoProvado(curto, lidos, texto)
  const PARENTES = 'Mary Smith vanished in 1962. Her brother John Smith searched for her. Smith never stopped looking.'
  if (n('Smith', ['Mary Smith', 'John Smith'], PARENTES) !== null) e.push('C1 dois parentes viraram um')
  if (n('Smith', ['Mary Smith'], PARENTES) !== null) e.push('C2 leitura sem o irmão: "John Smith" no texto devia barrar')
  if (n('Smith', ['Mary Ann Smith', 'Ann Smith'], 'Mary Ann Smith vanished. Her daughter Ann Smith searched. Smith never stopped.') !== null) e.push('C2b mãe e filha viraram uma')
  const HARRY = 'Prince Harry left the palace. Prince waved to the crowd.'
  if (n('Prince', ['Prince Harry'], HARRY) !== null) e.push('C3 título na frente virou nome completo')
  if (n('Prince', ['Louis Le Prince'], 'In 1888, Le Prince shot a film. Le Prince boarded a train.') !== null) e.push('C4 nome completo que o roteiro não escreve')
  if (n('Lee', ['Ashley Leeson'], 'Ashley Leeson ran far and never came back.') !== null) e.push('C5 casamento por pedaço de palavra')
  if (n('the man', ['Dan Cooper'], COO.roteiro) !== null) e.push('C6 papel sem nome virou nome')
  const ARABE = 'في عام ١٨٨٨ صور Louis Le Prince أقدم فيلم. ثم صعد Prince إلى القطار ولم يره أحد بعد ذلك أبدا في أي مكان'
  if (n('Prince', ['Louis Le Prince'], ARABE) !== null) e.push('C7 escrita não latina mudou')
  // corpus do cabeçalho de conferenciaDoElenco.ts: nada é renomeado e a conferência continua retirando
  const LITUYA = 'HOOK: [Pexels: aerial ocean waves] Imagine a wave taller than the Empire State Building itself.\n\nMICRO REWARD 1: It happened in Lituya Bay, Alaska. Lituya Bay acted like a funnel.\n\nPAYOFF: The Empire State Building stands at 1,454 feet.'
  const ESSENCIAL = 'HOOK: Think beyond the 72-hour kit.\n\nPAYOFF: Essential: ready-to-eat foods. Sound: Dramatic record scratch. Moral: stay ready. Ending: Laughter.'
  for (const [rot, t] of [['Lituya', LITUYA], ['Essential', ESSENCIAL]]) {
    const base = [...w.folha.elencoDeterministico(t), ...['Building', 'Bay', 'Moral', 'Sound', 'Ending', 'Laughter', 'Bears', 'Skymaster', 'Cute', 'Among', 'Incomplete', 'Essential'].map((x) => fic(x, { protagonista: false }))]
    for (const lidos of [[], ['Maura Murray']]) {
      const r = w.m.elencoComNomeCompleto(base, lidos, t)
      if (r.renomeados.length || r.elenco !== base) e.push(`C8 ${rot}: renomeou ${JSON.stringify(r.renomeados)}`)
      const c = w.conf.elencoConferido(r.elenco, { nomes: lidos, protagonista: lidos[0] ?? '' })
      if (c.elenco.some((f) => /^(?:Building|Bay|Moral|Sound|Ending|Laughter|Bears|Skymaster|Cute|Among|Incomplete|Essential)$/.test(f.nome))) e.push(`C9 ${rot}: palavra comum ficou no elenco`)
    }
  }
  const SEM_GENTE = 'HOOK: [Pexels: ocean aerial] The ocean covers 71 percent of Earth.\n\nPAYOFF: [Pexels: deep sea] Most of it has never been mapped.'
  const vazio = w.aj.elencoDoRoteiro(SEM_GENTE, {})
  const rv = w.m.elencoComNomeCompleto(vazio, [], SEM_GENTE)
  if (vazio.length !== 0 || rv.elenco.length !== 0) e.push('C10 filme sem gente ganhou elenco')
  // nada provado = o MESMO array (desligado/sem prova = byte a byte)
  const base = w.aj.elencoDoRoteiro(SLO.roteiro, {})
  if (w.m.elencoComNomeCompleto(base, ['Joshua Slocum'], SLO.roteiro).elenco !== base) e.push('C11 sem nome curto a provar devolveu outro array')
  return e
}

// ═══ 2. Slocum: a pista não cria a 2ª pessoa ═══════════════════════════════════════════════════════════════════════════
function fichaDaLeitura(w, caso) {
  const leitura = w.sem.lerElencoSemantico(JSON.stringify(caso.leitura_semantica.raw), caso.roteiro)
  const base = w.aj.elencoDoRoteiro(caso.roteiro, {})
  return { leitura, aplicado: w.sem.aplicarElencoSemantico(base, leitura, caso.roteiro) }
}
function elenco15(w, caso, doPedido, completar, visuais = caso.visuais_do_render) {
  return w.f15.elencoDoFilme15({ elencoDoPedido: doPedido, visuals: visuais, extrair: (t) => w.conf.elencoConferido(w.aj.elencoDoRoteiro(t), null).elenco, completar })
}
function provaSlocum(w) {
  const e = []
  const { aplicado } = fichaDaLeitura(w, SLO)
  if (!aplicado || aplicado.elenco[0].canonica !== 'Joshua Slocum, man, exactly as the author wrote') e.push('2.0 leitura reconstruída não reproduz a ficha gravada: ' + aplicado?.elenco?.[0]?.canonica)
  const doPedido = aplicado.elenco
  const antes = elenco15(w, SLO, doPedido, w.sem.aceitaPapelDasCenas(SLO.roteiro))
  const gravado = SLO.evento_character_sheet_elenco.map((x) => x.nome).join(' + ')
  if (nomes(antes.elenco).join(' + ') !== gravado) e.push(`2.1 antes não reproduz o despacho (${gravado}): ${nomes(antes.elenco)}`)
  const depois = elenco15(w, SLO, doPedido, w.m.aceitaPapelSemPista(SLO.roteiro, w.sem.aceitaPapelDasCenas(SLO.roteiro), fichaDaLeitura(w, SLO).aplicado.elenco[0], CTX_SLO))
  if (nomes(depois.elenco).join() !== 'Joshua Slocum' || depois.elenco[0].protagonista !== true) e.push('2.2 depois: ' + nomes(depois.elenco))
  // o protagonista vai a toda cena (a cena do "old bearded sailor" passa a ser a do Slocum)
  const forcadas = w.f15.protagonistaEmTodaCena({ visuals: SLO.visuais_do_render, elenco: depois.elenco, porNome: true }).forcadas
  if (forcadas.join() !== '0,1,2') e.push('2.3 cenas forçadas com o Slocum: ' + forcadas)
  if (!w.m.papelSoDaPista(SLO.roteiro, 'sailor') || w.m.papelSoDaPista(SLO.roteiro, 'Slocum')) e.push('2.4 papelSoDaPista')
  return { e, antes: nomes(antes.elenco), depois: nomes(depois.elenco) }
}
function contraprovasPista(w) {
  const e = []
  // (a) dois protagonistas reais na narração: a leitura dá os dois e eles ficam
  const DOIS = 'HOOK: [Pexels: old sailor and young girl on a dock] Captain Elias Ward taught his granddaughter Nora to sail.\n\nPAYOFF: [Pexels: two people on a small boat] Nora and Elias sailed out together and never came back.'
  const doisPedido = [fic('Elias Ward', { nucleo: 'Elias' }), fic('Nora', { protagonista: false })]
  const vis = ['An old sailor teaches a young girl to sail on a dock.', 'The old sailor and the girl on a small boat at dusk.']
  const r = elenco15(w, { visuais_do_render: vis }, doisPedido, w.m.aceitaPapelSemPista(DOIS, w.sem.aceitaPapelDasCenas(DOIS), doisPedido[0], { lingua: 'en', leituraBruta: LEITURA_DUAS('Elias Ward', 'granddaughter') }), vis)
  if (nomes(r.elenco).join() !== 'Elias Ward,Nora') e.push('P1 dois protagonistas reais: ' + nomes(r.elenco))
  // (b) papel que a NARRAÇÃO escreve (e a pista repete) não é "só da pista"
  if (w.m.papelSoDaPista('HOOK: [Pexels: old sailor at the helm] An old sailor lost at sea in 1909.', 'sailor')) e.push('P2 papel da narração tratado como pista')
  // (c) gente que o texto não escreve e que nenhuma pista escreve (o avô do pedido em PT) continua entrando pelos visuais
  const PT = 'GANCHO: Uma menina encontrou uma chave azul no sótão.\n\nFINAL: O avô sorriu quando ela abriu a caixa.'
  const menina = [fic('the girl', { nucleo: 'girl' })]
  const visPT = ['A curly-haired girl holds a blue key in an attic.', 'The girl hands the key to the grandfather, who smiles.']
  const pt = elenco15(w, {}, menina, w.m.aceitaPapelSemPista(PT, null, menina[0], { lingua: 'pt', leituraBruta: LEITURA_UMA('the girl') }), visPT)
  if (!nomes(pt.elenco).some((x) => /grandfather/.test(x))) e.push('P3 o avô do pedido em PT sumiu: ' + nomes(pt.elenco))
  // (d) filme sem gente: sem elenco do pedido e sem gente nos visuais = vazio
  const vazio = elenco15(w, {}, [], w.m.aceitaPapelSemPista('HOOK: [Pexels: ocean] The ocean is deep.', null, null, { lingua: 'en', leituraBruta: null }), ['A wide shot of a deep blue ocean.'])
  if (vazio.elenco.length !== 0) e.push('P4 filme sem gente ganhou elenco')
  return e
}

// ═══ 3. Cooper: a roupa do pedido na ficha (e na folha) ═════════════════════════════════════════════════════════════════
function provaCooper(w) {
  const e = []
  const { aplicado } = fichaDaLeitura(w, COO)
  if (!aplicado || aplicado.elenco[0].canonica !== 'Dan Cooper, a man in a black tie, exactly as the author wrote') e.push('3.0 leitura reconstruída não reproduz a ficha gravada: ' + aplicado?.elenco?.[0]?.canonica)
  const gravada = { ...aplicado.elenco[0], canonica: COO.ficha_gravada_sem_ancoras }
  const look = { lookPhrase: 'photorealistic, ultra-detailed' }
  const folhaAntes = w.folha.promptDaFolha(gravada, look)
  const r = w.m.fichaComDescricaoDoPedido(COO.ideia, [gravada], COO.roteiro)
  const folhaDepois = w.folha.promptDaFolha(r.elenco[0], look)
  if (/dark suit/.test(folhaAntes)) e.push('3.1 a folha de antes já tinha o paletó?')
  if (r.descricao !== 'man in a dark suit and black tie' || !/as the request describes: man in a dark suit and black tie/.test(folhaDepois)) e.push('3.2 a folha não leva o paletó: ' + folhaDepois.slice(0, 260))
  if (!r.elenco[0].canonica.startsWith('Dan Cooper, a man in a black tie, exactly as the author wrote; as the request describes:')) e.push('3.3 a descrição entrou fora do lugar')
  if (!r.elenco[0].canonica.endsWith('period-accurate 1970s hairstyle and clothing true to their own place and role')) e.push('3.4 perdeu o resto da ficha')
  if (w.m.fichaComDescricaoDoPedido(COO.ideia, r.elenco, COO.roteiro).trocas.length !== 0) e.push('3.5 não é idempotente')
  // Slocum: "an old bearded sailor" do pedido vai à ficha dele (a mesma pessoa que os visuais descrevem)
  const s = fichaDaLeitura(w, SLO).aplicado.elenco
  const rs = w.m.fichaComDescricaoDoPedido(SLO.ideia, s, SLO.roteiro)
  if (rs.descricao !== 'old bearded sailor') e.push('3.6 Slocum: ' + rs.descricao)
  return { e, antes: folhaAntes, depois: folhaDepois, slocum: rs.elenco[0].canonica }
}
function contraprovasRoupa(w) {
  const e = []
  const { aplicado } = fichaDaLeitura(w, COO)
  const f = aplicado.elenco
  const igual = (r) => r.trocas.length === 0 && r.elenco === f
  if (!igual(w.m.fichaComDescricaoDoPedido(null, f))) e.push('R1 sem pedido mudou')
  if (!igual(w.m.fichaComDescricaoDoPedido('On November 24, 1971, Dan Cooper hijacked a passenger jet and was never found.', f))) e.push('R2 pedido sem roupa inventou traje')
  if (!igual(w.m.fichaComDescricaoDoPedido('Dan Cooper hijacked a jet, and that night he jumped wearing a parachute at the open rear door.', f))) e.push('R3 roupa de UMA cena (paraquedas) virou fixa')
  if (!igual(w.m.fichaComDescricaoDoPedido('A man in a black tie who called himself Dan Cooper hijacked a jet.', f))) e.push('R4 descrição que a ficha já tem foi duplicada')
  const bicho = [{ nome: 'Rex', nucleo: 'dog', tipo: 'animal', canonica: 'Rex, a small brown dog', origem: 'modelo', protagonista: true, genero: null }]
  if (w.m.fichaComDescricaoDoPedido('Rex, a fluffy golden dog with a red collar, waits by the door.', bicho).trocas.length !== 0) e.push('R5 bicho mexido (só o protagonista humano)')
  const dois = [{ ...f[0], protagonista: false }, { nome: 'Mara', nucleo: 'Mara', tipo: 'humano', canonica: 'Mara, a woman', origem: 'modelo', protagonista: true, genero: 'woman' }]
  const rd = w.m.fichaComDescricaoDoPedido(COO.ideia, dois, COO.roteiro)
  if (rd.trocas.length !== 0 || rd.elenco[0].canonica !== f[0].canonica) e.push('R6 coadjuvante ganhou a descrição do protagonista')
  return e
}

// ═══ 4. A referência única ligaria? (referenciaUnicaLigada + o montador) ════════════════════════════════════════════════
function provaReferencia(w, ru, k4) {
  const URL = 'https://ensaio.test/ficha.jpg'
  const snap = (elenco) => ({ characters: elenco, characterReferences: elenco.map((c) => ({ nome: c.nome, url: URL })), approvedStills: [] })
  const ref = (elenco) => ru.referenciaUnicaDoFilme(snap(elenco))
  const liga = (r, planos) => (r ? !!k4.buildKling4ReferenciaUnicaInput(planos.map((p, i) => ({ prompt: p, duration: [4, 4, 4, 3][i] ?? 3 })), r) : false)
  const cooperFicha = fichaDaLeitura(w, COO).aplicado.elenco
  const sloAntes = elenco15(w, SLO, fichaDaLeitura(w, SLO).aplicado.elenco, w.sem.aceitaPapelDasCenas(SLO.roteiro))
  const sloDepois = elenco15(w, SLO, fichaDaLeitura(w, SLO).aplicado.elenco, w.m.aceitaPapelSemPista(SLO.roteiro, w.sem.aceitaPapelDasCenas(SLO.roteiro), fichaDaLeitura(w, SLO).aplicado.elenco[0], CTX_SLO))
  const base = w.aj.elencoDoRoteiro(LEP.roteiro, {})
  const lepAntes = w.conf.elencoConferido(base, { nomes: ['Louis Le Prince'], protagonista: 'Louis Le Prince' }).elenco
  const lepDepois = w.conf.elencoConferido(w.m.elencoComNomeCompleto(base, ['Louis Le Prince'], LEP.roteiro).elenco, { nomes: ['Louis Le Prince'], protagonista: 'Louis Le Prince' }).elenco
  const planosSloForcados = w.f15.protagonistaEmTodaCena({ visuals: SLO.visuais_do_render, elenco: sloDepois.elenco, porNome: true }).visuals
  return {
    ligada: { casa: ru.referenciaUnicaLigada(ru.REFERENCIA_UNICA_2411, CASA), cliente: ru.referenciaUnicaLigada(ru.REFERENCIA_UNICA_2411, 'cliente@x.test') },
    cooper: { antes: !!ref(cooperFicha) && liga(ref(cooperFicha), COO.planos_enviados) },
    leprince: { antes: !!ref(lepAntes), depois: !!ref(lepDepois) && liga(ref(lepDepois), ['In 1888 Louis Le Prince films a garden.', 'Le Prince boards a steam train.', 'An empty vintage train compartment.', 'Le Prince walks into steam.']) },
    slocum: { antes_planos_com_slocum: SLO.planos_enviados.map((p) => k4.planoMostraOPersonagem(p, ['Joshua Slocum', 'Slocum'])), antes_snapshot: !!ref(sloAntes.elenco), depois: !!ref(sloDepois.elenco) && liga(ref(sloDepois.elenco), [...planosSloForcados, 'Empty gray ocean horizon at dusk.']) },
  }
}

// ═══ 5. O interruptor e a fiação na rota ═══════════════════════════════════════════════════════════════════════════════
function provaInterruptor(m, rota) {
  const e = []
  if (m.ELENCO_E_FIGURINO_2411 !== 'internal') e.push('S1 interruptor entregue fora de internal: ' + m.ELENCO_E_FIGURINO_2411)
  if (m.elencoEFigurinoLigado('off', CASA) !== false) e.push('S2 off liga para a casa')
  if (m.elencoEFigurinoLigado('internal', CASA) !== true) e.push('S3 internal não liga para a casa')
  if (m.elencoEFigurinoLigado('internal', 'cliente@x.test') !== false || m.elencoEFigurinoLigado('internal', null) !== false) e.push('S4 internal liga para cliente')
  if (m.elencoEFigurinoLigado('public', 'cliente@x.test') !== true) e.push('S5 public')
  // fiação: as três peças só agem com o interruptor (a variável elencoEFigurino2411) e, desligadas, a rota usa o MESMO array / a mesma regra
  const linha = (re) => rota.split(/\r?\n/).find((l) => re.test(l)) ?? ''
  if (!/const elencoEFigurino2411 = elencoEFigurinoLigado\(ELENCO_E_FIGURINO_2411, user\.email\)/.test(rota)) e.push('W1 o interruptor não lê o e-mail do usuário autenticado')
  if (!/const nomeCompleto2411 = elencoEFigurino2411 && pedidoSemantico\?\.elenco \?/.test(rota) || !/const elencoBase2411: FichaDePersonagem\[\] = nomeCompleto2411 \? nomeCompleto2411\.elenco : elencoBaseDoPedido/.test(rota)) e.push('W2 nome completo sem a porta')
  if (!/aplicarElencoSemantico\(elencoBase2411,/.test(rota) || !/elencoConferido\(elencoBase2411, conferenciaElenco\)/.test(rota)) e.push('W3 a leitura e a conferência não recebem a base 2411')
  if (!/completar: elencoEFigurino2411 && pedidoSemantico\?\.elenco \? aceitaPapelSemPista\(prompt, elencoSemantico \? aceitaPapelDasCenas\(prompt\) : null, personagemElenco\.elenco\.find\(\(f\) => f\.protagonista\) \?\? personagemElenco\.elenco\[0\], \{ lingua: narrationLanguage\.language, leituraBruta: pedidoSemantico\.raw \}\) \/\*.*?\*\/ : elencoSemantico \? aceitaPapelDasCenas\(prompt\) : true/.test(linha(/elencoFilme15 = /))) e.push('W4 o filtro da pista sem a porta, ou o caminho desligado mudou')
  const fig = linha(/fichaComDescricaoDoPedido\(/)
  const arg = /fichaComDescricaoDoPedido\(([^,]+),/.exec(fig)?.[1]
  if (!/^if \(elencoEFigurino2411 && /.test(fig.trim()) || arg !== 'body.original_idea') e.push('W5 a descrição não vem só do pedido original (arg=' + arg + ')')
  if (!/\.\.\.\(elencoEFigurino2411 && personagem\.ativo \? \{ elenco_da_folha_2411:/.test(rota)) e.push('W6 o ensaio não mostra o elenco da folha')
  for (const arq of fs.readdirSync('components', { recursive: true }).filter((x) => /\.tsx?$/.test(String(x)))) {
    const t = fs.readFileSync(`components/${arq}`, 'utf8')
    if (/elencoEFigurino2411/.test(t)) e.push('W7 componente de navegador importa o módulo: ' + arq)
  }
  return { e, arg }
}
// o argumento da rota, executado: o pedido original dá o paletó; o roteiro (com "wearing a parachute" num plano) nunca vira roupa fixa
function simulaFiacao(m, aj, sem, arg) {
  const ctx = { body: { original_idea: COO.ideia }, prompt: COO.roteiro.replace('That night, somewhere past Seattle, he jumped.', 'That night, Dan Cooper, a man wearing a parachute, jumped.') }
  const valor = arg === 'body.original_idea' ? ctx.body.original_idea : arg === 'prompt' ? ctx.prompt : null
  const leitura = sem.lerElencoSemantico(JSON.stringify(COO.leitura_semantica.raw), COO.roteiro)
  const f = sem.aplicarElencoSemantico(aj.elencoDoRoteiro(COO.roteiro, {}), leitura, COO.roteiro).elenco
  return m.fichaComDescricaoDoPedido(valor, f).descricao
}


// ═══ VOLTA 3 · as entradas do revisor (1ª e 2ª passadas), executadas ════════════════════════════════════════════════════
const ficV = (nome, genero, extra = {}) => ({ nome, nucleo: nome.split(' ').pop(), tipo: 'humano', canonica: `${nome}, a person`, origem: 'autor', protagonista: true, genero, ...extra })
const quinze = (w, rot, doPedido, vis, ctx, semantico = true) => {
  const antes = elenco15(w, {}, doPedido, semantico ? w.sem.aceitaPapelDasCenas(rot) : true, vis)
  const depois = elenco15(w, {}, doPedido, w.m.aceitaPapelSemPista(rot, semantico ? w.sem.aceitaPapelDasCenas(rot) : null, doPedido[0], ctx), vis)
  return { antes: nomes(antes.elenco), depois: nomes(depois.elenco), forcadas: w.f15.protagonistaEmTodaCena({ visuals: vis, elenco: depois.elenco, porNome: semantico }).forcadas, elenco: depois.elenco }
}
const E1 = { rot: 'GANCHO: [Pexels: girl finds a blue key in an attic] Uma menina encontrou uma chave azul no sótão.\n\nFINAL: [Pexels: grandfather smiling at a girl] O avô sorriu quando ela abriu a caixa.', vis: ['A curly-haired girl holds a blue key in an attic.', 'The girl hands the key to the grandfather, who smiles.'] }
const E1FR = { rot: 'ACCROCHE: [Pexels: strawberry and banana cartoon friends] Fraise et la banane sont les meilleures amies du monde.\n\nFIN: [Pexels: banana dancing] La banane danse pour Fraise tous les soirs.', vis: ['A cheerful strawberry named Fraise waves next to a smiling banana.', 'The banana dances while Fraise laughs.'] }
const E2 = { rot: 'HOOK: [Pexels: man leaving a farmhouse at dawn] In 1950, Tom Hale left his wife and walked into the woods.\n\nPAYOFF: [Pexels: woman waiting at a window] She waited forty years. Hale never came back.', vis: ['Tom Hale leaves a farmhouse at dawn while a woman watches from the porch.', 'A woman waits at a window, looking at the woods.'] }
const E2C = { rot: 'HOOK: [Pexels: old fisherman on a dock] Ben Ross sailed with the fishermen of Gloucester for forty years and knew every one of them by name.\n\nPAYOFF: [Pexels: old fisherman on a boat] One winter Ben Ross went out with the boat and never came home again.', vis: ['An old fisherman stands on a dock next to Ben Ross.', 'The old fisherman and Ben Ross on a boat.'] }
const IRMAS = { rot: 'HOOK: [Pexels: young woman reading a letter by a window] Mara Hale wrote to her sister every single week for forty years, and it was always the same letter.\n\nPAYOFF: [Pexels: young woman crying by a window] Mara Hale never learned why the letters stopped coming back to the old house.', vis: ['Mara Hale writes a letter while a young woman reads by a window.', 'A young woman cries alone by a window.'] }
const ESTRANHO = { rot: 'HOOK: [Pexels: old fisherman handing a key to a man] In 1950, Tom Hale met a stranger at the old dock and gave the boat away for nothing.\n\nPAYOFF: [Pexels: old fisherman sailing away] Tom Hale never saw the stranger again, and nobody in the town ever knew the name.', vis: ['An old fisherman hands a key to Tom Hale at the old dock.', 'The old fisherman sails away alone into the fog.'] }
const LEP_VIS = ['In 1888, a bearded man in an 1880s suit operates a wooden box camera in a garden.', 'Le Prince boards a steam train to Paris.', 'An empty vintage train compartment.', 'A bearded man in a long coat walks into steam on a station platform.']
const SOLDADO = 'HOOK: [Pexels: soldier in uniform at a station] Dan Cooper came home from the war in 1946.\n\nPAYOFF: [Pexels: man in a dark suit boarding a plane] Twenty years later he boarded a plane in a dark suit.'
function lePrinceNos15(w, ctx = CTX_LEP) {
  const leitura = w.sem.lerElencoSemantico(LEP.leitura_semantica.raw ? JSON.stringify(LEP.leitura_semantica.raw) : '', LEP.roteiro)
  const base = w.m.elencoComNomeCompleto(w.aj.elencoDoRoteiro(LEP.roteiro, {}), ['Louis Le Prince'], LEP.roteiro).elenco
  const aplicado = w.sem.aplicarElencoSemantico(base, leitura, LEP.roteiro)
  const doPedido = w.fp.elencoComFichaDoPedido(LEP.ideia, aplicado.elenco).elenco
  return quinze(w, LEP.roteiro, doPedido, LEP_VIS, ctx)
}
function provaVolta3(w) {
  const e = []
  // (1) gente real fica: PT, FR, a esposa, "fishermen", as irmãs, o estranho
  const r1 = quinze(w, E1.rot, [ficV('the girl', 'woman', { nucleo: 'girl', origem: 'deterministica' })], E1.vis, { lingua: 'pt', leituraBruta: LEITURA_UMA('the girl') }, false)
  if (!r1.depois.some((n) => /grandfather/.test(n))) e.push('V1 PT: o avô sumiu ' + r1.depois)
  const fr = quinze(w, E1FR.rot, [ficV('Fraise', null, { tipo: 'criatura' })], E1FR.vis, { lingua: 'en', leituraBruta: LEITURA_UMA('Fraise') }, false)
  if (fr.depois.join() !== fr.antes.join()) e.push('V1c FR (db401da3), até com a língua pedida "en" e leitura de 1: mudou ' + fr.antes + ' -> ' + fr.depois)
  const BICHO = 'HOOK: [Pexels: old dog sleeping by a fire] Every winter night, Rex waited by the fire for the farmer to come home again.\n\nPAYOFF: [Pexels: old dog by an empty chair] The farmer never came back, and Rex kept waiting by the fire for years.'
  const bi = quinze(w, BICHO, [{ nome: 'Rex', nucleo: 'Rex', tipo: 'animal', canonica: 'Rex, a brown dog', origem: 'modelo', protagonista: true, genero: null }], ['The old dog sleeps by the fire.', 'The old dog lies next to an empty chair.'], { lingua: 'en', leituraBruta: LEITURA_UMA('Rex') }, false)
  if (bi.depois.join() !== bi.antes.join()) e.push('V1f bicho: a regra (só de gente) agiu: ' + bi.antes + ' -> ' + bi.depois)
  const r2 = quinze(w, E2.rot, [ficV('Tom Hale', 'man')], E2.vis, { lingua: 'en', leituraBruta: LEITURA_UMA('Tom Hale') })
  if (r2.depois.join() !== 'Tom Hale,the woman' || r2.forcadas.length !== 0) e.push(`V2 esposa (mesmo com leitura de 1 pessoa: gênero oposto): ${r2.depois} forçadas=${r2.forcadas}`)
  const r2c = quinze(w, E2C.rot, [ficV('Ben Ross', 'man')], E2C.vis, { lingua: 'en', leituraBruta: LEITURA_UMA('Ben Ross') })
  if (!r2c.depois.some((n) => /fisherman/.test(n))) e.push('V2e "fishermen": o pescador sumiu ' + r2c.depois)
  const ir = quinze(w, IRMAS.rot, [ficV('Mara Hale', 'woman')], IRMAS.vis, { lingua: 'en', leituraBruta: LEITURA_DUAS('Mara Hale', 'sister') })
  if (!ir.depois.some((n) => /woman/.test(n)) || ir.forcadas.includes(1)) e.push(`V6 irmãs: a irmã sumiu ou a cena dela foi forçada ${ir.depois} ${ir.forcadas}`)
  const es = quinze(w, ESTRANHO.rot, [ficV('Tom Hale', 'man')], ESTRANHO.vis, { lingua: 'en', leituraBruta: LEITURA_DUAS('Tom Hale', 'stranger') })
  if (!es.depois.some((n) => /fisherman/.test(n)) || es.forcadas.includes(1)) e.push(`V7 estranho: o pescador sumiu ou a cena dele foi forçada ${es.depois} ${es.forcadas}`)
  if (w.m.pessoasDaLeitura(LEITURA_DUAS('a', 'b')) !== 2 || w.m.pessoasDaLeitura(LEITURA_UMA('a')) !== 1 || w.m.pessoasDaLeitura('nada') !== null || w.m.pessoasDaLeitura(null) !== null) e.push('V8 pessoasDaLeitura (o "só citado" conta)')
  // (3) a língua é a da voz: o Le Prince (detector dá null) com visuais que repetem a pista
  const lang = carrega('lib/textLanguage.ts')
  if (lang.detectNarrationLanguage(LEP.roteiro.replace(/\[[^\]]*\]/g, ' ')).language !== null || lang.resolveNarrationLanguage('en', LEP.roteiro).language !== 'en') e.push('V9 premissa: detector null e língua resolvida "en" no Le Prince')
  const lp = lePrinceNos15(w)
  if (lp.depois.join() !== 'Louis Le Prince') e.push('V10 Le Prince com visuais da pista: ' + lp.depois + ' (antes ' + lp.antes + ')')
  // (Slocum, nos 15 s, já está em provaSlocum; aqui: sem leitura de 1 pessoa ou fora do inglês, nada muda)
  const sloPed = fichaDaLeitura(w, SLO).aplicado.elenco
  for (const [rot, ctx] of [['V11a 2 pessoas lidas', { lingua: 'en', leituraBruta: LEITURA_DUAS('Joshua Slocum', 'wife') }], ['V11b sem leitura', { lingua: 'en', leituraBruta: null }], ['V11c língua pt', { lingua: 'pt', leituraBruta: CTX_SLO.leituraBruta }]]) {
    const r = elenco15(w, SLO, sloPed, w.m.aceitaPapelSemPista(SLO.roteiro, w.sem.aceitaPapelDasCenas(SLO.roteiro), sloPed[0], ctx))
    if (r.elenco.length !== 2) e.push(rot + ': a regra agiu na dúvida')
  }
  // (2) descrição de outra pessoa
  const coo = fichaDaLeitura(w, COO).aplicado.elenco
  const d = (idea, el = coo) => w.m.fichaComDescricaoDoPedido(idea, el).descricao
  if (d('A woman in a red dress and a man in a dark suit who called himself Dan Cooper boarded.') !== null) e.push('V3 levou a descrição de outra pessoa')
  if (d('A woman in a red coat who called herself Dan Cooper boarded.') !== null) e.push('V3b mulher numa ficha de homem')
  if (d('A woman in a red coat who called herself Dan Cooper boarded.', [{ ...coo[0], genero: null }]) !== null) e.push('V3e gênero nulo autorizou descrição de mulher')
  if (d('A man in a red coat and a man in a dark suit who called himself Dan Cooper boarded.') !== null) e.push('V3d dois homens')
  if (d('Dan Cooper, a man in a dark suit and a black tie, boarded.') !== 'man in a dark suit and a black tie') e.push('V3c "and a black tie" (roupa) virou outra pessoa')
  if (d('Dan Cooper, a tall man with his daughter in a red coat, boarded.') !== 'tall man') e.push('V3f "with his daughter in a red coat": ' + d('Dan Cooper, a tall man with his daughter in a red coat, boarded.'))
  if (d('A man in a dark suit with his wife who called himself Dan Cooper boarded.') !== 'man in a dark suit') e.push('V3g "with his wife": ' + d('A man in a dark suit with his wife who called himself Dan Cooper boarded.'))
  if (d('Dan Cooper, a tall man with a dog, boarded.') !== 'tall man') e.push('V3h "with a dog"')
  // (4) a forma da frase: "in"/"dressed in" fica; "wearing"/"with" sai
  if (d('Dan Cooper, a man wearing a parachute, jumped from the jet.') !== null) e.push('V4 paraquedas (aposto)')
  if (d('A man wearing a parachute who called himself Dan Cooper jumped.') !== null) e.push('V4b paraquedas (who called himself)')
  if (d(COO.ideia) !== 'man in a dark suit and black tie') e.push('V4d o terno do Cooper saiu: ' + d(COO.ideia))
  for (const [nome, idea, esperado] of [['Ana Ruiz', 'Ana Ruiz, a woman in blue scrubs, worked the night shift.', 'woman in blue scrubs'], ['Sam Ward', 'Sam Ward, a man in a long trench coat, walked in.', 'man in a long trench coat'], ['Joe Park', 'Joe Park, a man in a yellow helmet, ran inside.', 'man in a yellow helmet'], ['Luca Bruni', 'Luca Bruni, a man in a white apron, opened the kitchen.', 'man in a white apron']]) {
    const g = /Ana/.test(nome) ? 'woman' : 'man'
    const r = w.m.fichaComDescricaoDoPedido(idea, [ficV(nome, g, { canonica: `${nome}, exactly as the author wrote` })]).descricao
    if (r !== esperado) e.push(`V4f roupa fixa (${esperado}) saiu: ${r}`)
  }
  if (w.m.fichaComDescricaoDoPedido(SLO.ideia, fichaDaLeitura(w, SLO).aplicado.elenco).descricao !== 'old bearded sailor') e.push('V4e Slocum regrediu')
  // menores
  if (w.m.elencoComNomeCompleto([ficV('Smith', 'man', { origem: 'deterministica' })], ['John Smith'], 'John Smith vanished. Smith was never found.').renomeados.length !== 0) e.push('V5 "Smith" já casava e foi trocado')
  const rama = [ficV('Rama', 'man', { nucleo: 'Rama', canonica: 'Rama, exactly as the author wrote' })]
  if (w.m.fichaComDescricaoDoPedido('Rama, a tall man in a dark suit, waited by the river.', rama).trocas.length !== 0) e.push('V12 figura conhecida (Rama) mexida')
  return e
}
// os mutantes do revisor, por COMPORTAMENTO
function provaGuardas(w) {
  const e = []
  if (w.m.elencoEFigurinoLigado('internal', PADRAO_INTERNO) !== false) e.push('G1 interno por PADRÃO ligou (só a lista exata)')
  const coo = fichaDaLeitura(w, COO).aplicado.elenco
  const coad = { nome: 'Mara Lind', nucleo: 'Lind', tipo: 'humano', canonica: 'Mara Lind, a woman', origem: 'modelo', protagonista: false, genero: 'woman' }
  const doisH = w.m.fichaComDescricaoDoPedido('Mara Lind, a tall woman in a green raincoat, waited. ' + COO.ideia, [coo[0], coad])
  if (doisH.elenco[1].canonica !== coad.canonica) e.push('G2 coadjuvante humano ganhou descrição')
  if (w.m.nomeCompletoProvado('Prince', ['Louis Le Prince'], 'HOOK: [Pexels: Louis Le Prince with a camera] In 1888, Le Prince shot a film. Le Prince boarded a train.') !== null) e.push('G3 nome completo só na pista valeu')
  const mitica = [{ ...coo[0], origem: 'mitica' }]
  if (w.m.fichaComDescricaoDoPedido(COO.ideia, mitica).trocas.length !== 0) e.push('G4 figura mítica mexida')
  const criatura = [{ nome: 'Zorbo', nucleo: 'robot', tipo: 'criatura', canonica: 'Zorbo, a tiny robot', origem: 'modelo', protagonista: true, genero: null }]
  if (w.m.fichaComDescricaoDoPedido('Zorbo, a tiny silver robot in a red scarf, waited.', criatura).trocas.length !== 0) e.push('G5 criatura recebeu descrição de gente')
  const um = w.m.elencoComNomeCompleto([ficV('Prince', 'man', { origem: 'deterministica' })], ['Prince'], 'Prince boarded a train. Prince vanished.')
  if (um.renomeados.length !== 0 || w.m.nomeCompletoProvado('Prince', ['Prince'], 'Prince boarded a train.') !== null) e.push('G6 nome de 1 token aceito como completo')
  return e
}
// a fiação da rota EXECUTADA: as condições copiadas da rota são avaliadas com o contexto de cada caso
function condicaoDaRota(rota, re) {
  const l = rota.split(/\r?\n/).find((x) => re.test(x)) ?? ''
  const m = /if \((.*?)\) \{ const doPedido2411/.exec(l)
  return m ? m[1] : null
}
function provaFiacaoExecutada(rota) {
  const e = []
  const cond = condicaoDaRota(rota, /fichaComDescricaoDoPedido\(/)
  if (!cond) return ['F0 condição do figurino não achada']
  const avalia = (ctx) => new Function(...Object.keys(ctx), `return !!(${cond})`)(...Object.values(ctx))
  const base = { elencoEFigurino2411: true, elencoEFigurinoLigado: (modo) => modo !== 'off', FIGURINO_DO_PEDIDO_2411: 'internal', user: { email: CASA }, qualidadeHerdada: null, personagem: { ativo: true }, estrelaFicha: null, desenhoInfantil: { ativo: false }, personagemElenco: { elenco: [1] } }
  if (!avalia(base)) e.push('F1 figurino não liga no caso comum')
  for (const [k, v] of [['elencoEFigurino2411', false], ['desenhoInfantil', { ativo: true }], ['estrelaFicha', 'ficha'], ['qualidadeHerdada', {}], ['personagem', { ativo: false }], ['FIGURINO_DO_PEDIDO_2411', 'off']]) if (avalia({ ...base, [k]: v })) e.push('F2 figurino liga com ' + k)
  const l = rota.split(/\r?\n/).find((x) => /const nomeCompleto2411 = /.test(x)) ?? ''
  const c2 = /const nomeCompleto2411 = (.*?) \? elencoComNomeCompleto/.exec(l)?.[1]
  if (!c2) e.push('F3 condição do nome completo não achada')
  else {
    const av = (a, b) => new Function('elencoEFigurino2411', 'pedidoSemantico', `return !!(${c2})`)(a, b)
    if (!av(true, { elenco: {} }) || av(false, { elenco: {} }) || av(true, { elenco: null }) || av(true, null)) e.push('F4 nome completo fora da porta (interruptor + leitura)')
  }
  const l3 = rota.split(/\r?\n/).find((x) => /const elencoFilme15 = /.test(x)) ?? ''
  const c3 = /completar: (elencoEFigurino2411 && pedidoSemantico\?\.elenco) \?/.exec(l3)?.[1]
  if (!c3) e.push('F5 a regra da pista fora da porta')
  else { const av = (a, b) => new Function('elencoEFigurino2411', 'pedidoSemantico', `return !!(${c3})`)(a, b); if (!av(true, { elenco: {} }) || av(false, { elenco: {} }) || av(true, { elenco: null })) e.push('F6 regra da pista liga sem interruptor ou sem leitura') }
  return e
}

// ═══ KINEO-LEITURA-2411 · a medida (só mede; o filme não muda) ═════════════════════════════════════════════════════════
const LINGUA_RE = /^[a-z]{2,3}(?:-[a-z0-9]{2,4})?$/
function medida(w, caso, raw, visuais, doPedido, extrairExtra = null) { caso = { ...caso, roteiro: caso.roteiro ?? caso.rot };
  const lang = carrega('lib/textLanguage.ts')
  const extrair = extrairExtra ?? ((tx) => w.conf.elencoConferido(w.aj.elencoDoRoteiro(tx), null).elenco)
  const det = lang.detectNarrationLanguage(caso.roteiro.replace(/\[[^\]]*\]/g, ' ')).language
  const base = w.m.medidaDaLeitura2411({ leituraBruta: raw, linguaResolvida: 'en', linguaDoDetector: det, linguaPedida: 'en' })
  const antesFn = w.sem.aceitaPapelDasCenas(caso.roteiro)
  const m15 = (completar) => w.f15.elencoDoFilme15({ elencoDoPedido: doPedido, visuals: visuais, extrair, completar }).elenco.length
  return w.m.medidaDaRegra2411(base, { roteiro: caso.roteiro, visuais, extrair, elencoHoje: () => m15(antesFn), elencoSePublic: () => m15(w.m.aceitaPapelSemPista(caso.roteiro, antesFn, doPedido[0], { lingua: 'en', leituraBruta: raw })) })
}
const soTiposPermitidos = (b) => Object.entries(b).every(([k, v]) => v === null || typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && (k === 'versao' ? v === 'leitura_2411_v1' : LINGUA_RE.test(v))))
function provaMedida(w) {
  const e = []
  const sloPed = fichaDaLeitura(w, SLO).aplicado.elenco
  const s = medida(w, SLO, CTX_SLO.leituraBruta, SLO.visuais_do_render, sloPed)
  if (!(s.respondeu === true && s.pessoas_lidas === 1 && s.coadjuvantes_so_citados === 0 && s.papeis_so_da_pista === 1 && s.elenco_antes === 2 && s.elenco_se_public === 1 && s.a_regra_agiria === true)) e.push('L1 Slocum ' + JSON.stringify(s))
  const lpPed = lePrinceNos15(w).elenco
  const l = medida(w, LEP, CTX_LEP.leituraBruta, LEP_VIS, lpPed)
  if (!(l.pessoas_lidas === 1 && l.elenco_antes === 2 && l.elenco_se_public === 1 && l.a_regra_agiria === true && l.lingua_do_detector === null && l.lingua_resolvida === 'en')) e.push('L2 Le Prince ' + JSON.stringify(l))
  const cooPed = fichaDaLeitura(w, COO).aplicado.elenco
  const c = medida(w, COO, JSON.stringify(COO.leitura_semantica.raw), COO.planos_enviados, cooPed)
  if (!(c.pessoas_lidas === 1 && c.a_regra_agiria === false && c.elenco_antes === c.elenco_se_public)) e.push('L3 Cooper ' + JSON.stringify(c))
  // irmãs e estranho: com a leitura que vê a 2ª pessoa (só citada) a regra não agiria; com a leitura que a perde, agiria (é o que a medida vai mostrar)
  const irmaPed = [ficV('Mara Hale', 'woman')], estPed = [ficV('Tom Hale', 'man')]
  const i2 = medida(w, IRMAS, LEITURA_DUAS('Mara Hale', 'sister'), IRMAS.vis, irmaPed), i1 = medida(w, IRMAS, LEITURA_UMA('Mara Hale'), IRMAS.vis, irmaPed)
  if (!(i2.pessoas_lidas === 2 && i2.coadjuvantes_so_citados === 1 && i2.a_regra_agiria === false && i1.pessoas_lidas === 1 && i1.a_regra_agiria === true)) e.push('L4 irmãs ' + JSON.stringify([i2, i1]))
  const e2 = medida(w, ESTRANHO, LEITURA_DUAS('Tom Hale', 'stranger'), ESTRANHO.vis, estPed), e1 = medida(w, ESTRANHO, LEITURA_UMA('Tom Hale'), ESTRANHO.vis, estPed)
  if (!(e2.a_regra_agiria === false && e1.a_regra_agiria === true && e1.papeis_so_da_pista === 1)) e.push('L5 estranho ' + JSON.stringify([e2, e1]))
  // só números, booleanos e códigos de língua; nenhum nome
  for (const b of [s, l, c, i2, i1, e2, e1]) if (!soTiposPermitidos(b) || /slocum|prince|cooper|mara|hale|sailor/i.test(JSON.stringify(b))) e.push('L6 bloco com texto/nome ' + JSON.stringify(b))
  // sem leitura: respondeu false, contagem null
  const sem = w.m.medidaDaLeitura2411({ leituraBruta: null, linguaResolvida: 'pt', linguaDoDetector: null, linguaPedida: undefined })
  if (!(sem.respondeu === false && sem.pessoas_lidas === null && sem.lingua_resolvida === 'pt' && sem.lingua_pedida === null)) e.push('L7 sem leitura ' + JSON.stringify(sem))
  // a medida NÃO muda o filme: entradas intactas e o elenco que o filme usa é o mesmo, com e sem a medida
  const ped = fichaDaLeitura(w, SLO).aplicado.elenco, vis = [...SLO.visuais_do_render]
  const fotoAntes = JSON.stringify({ ped, vis })
  const doFilme = () => JSON.stringify(elenco15(w, SLO, ped, w.m.aceitaPapelSemPista(SLO.roteiro, w.sem.aceitaPapelDasCenas(SLO.roteiro), ped[0], CTX_SLO), vis).elenco)
  const filmeSem = doFilme()
  medida(w, SLO, CTX_SLO.leituraBruta, vis, ped)
  if (JSON.stringify({ ped, vis }) !== fotoAntes || doFilme() !== filmeSem) e.push('L8 a medida mexeu no elenco/visuais do filme')
  // exceção não derruba: extrair que lança = erro:true, campos da leitura mantidos
  let x = null
  try { x = medida(w, SLO, CTX_SLO.leituraBruta, vis, ped, () => { throw new Error('boom') }) } catch { x = 'lancou' }
  if (x === 'lancou' || x.erro !== true || x.pessoas_lidas !== 1) e.push('L9 exceção derrubou a medida ' + JSON.stringify(x))
  return e
}
function provaMedidaNaRota(rota) {
  const e = []
  const usos = rota.split(/\r?\n/).filter((l) => /leitura2411/.test(l))
  if (usos.length !== 4) e.push('R-L1 leitura2411 aparece em ' + usos.length + ' linhas (esperado: tipo, evento, 2 medidas)')
  if (!usos.every((l) => /leitura2411\?: MedidaDaLeitura2411 \| null/.test(l) || /leitura_2411: ctx\.leitura2411 \?\? null/.test(l) || (/try \{ /.test(l) && /catch \{/.test(l)))) e.push('R-L2 medida fora de try/catch ou lida para decidir algo')
  if (!/if \(pedidoSemantico\) \{ try \{ ctxDespacho\(\)\.leitura2411 = medidaDaLeitura2411\(/.test(rota)) e.push('R-L3 a medida da leitura não roda para todas as contas com leitura')
  if (/elencoEFigurino2411[^\n]*medidaDa(?:Leitura|Regra)2411/.test(rota)) e.push('R-L4 a medida ficou atrás do interruptor (tem de medir cliente)')
  return e
}

// ═══ Execução real ═════════════════════════════════════════════════════════════════════════════════════════════════════
const W = mundo()
const RU = carrega('lib/cinematic/referenciaUnica2411.ts')
const K4 = carrega('lib/kling4Trial.ts')
const ROTA_TXT = fs.readFileSync(ROTA, 'utf8')
console.log('KINEO-ELENCO-E-FIGURINO-2411')
const lp = provaLePrince(W)
checa('Le Prince: antes = elenco vazio (removidos ["Prince"], como o evento); depois = "Louis Le Prince" protagonista, núcleo "Prince", ficha com o pedido ' + lp.e.join(' | '), lp.e.length === 0)
const cn = contraprovasNome(W)
checa('nome: parentes, título na frente, nome não escrito, pedaço de palavra, papel, escrita não latina, Building/Bay/Moral/Sound…, sem gente, mesmo array ' + cn.join(' | '), cn.length === 0)
const sl = provaSlocum(W)
checa('Slocum: antes = "Joshua Slocum + the old bearded sailor" (o despacho gravado); depois = só o Slocum, em toda cena ' + sl.e.join(' | '), sl.e.length === 0)
const cp = contraprovasPista(W)
checa('pista: dois protagonistas reais ficam, papel da narração fica, o avô do pedido em PT entra, sem gente = vazio ' + cp.join(' | '), cp.length === 0)
const co = provaCooper(W)
checa('Cooper: a folha leva "man in a dark suit and black tie"; Slocum leva "old bearded sailor" ' + co.e.join(' | '), co.e.length === 0)
const cr = contraprovasRoupa(W)
checa('roupa: sem pedido, pedido sem roupa, paraquedas de uma cena, já na ficha, bicho, coadjuvante = nada muda ' + cr.join(' | '), cr.length === 0)
const pi = provaInterruptor(W.m, ROTA_TXT)
checa('interruptor internal (só a lista exata da casa) e fiação na rota ' + pi.e.join(' | '), pi.e.length === 0)
checa('fiação executada: o argumento da rota dá o paletó e ignora o paraquedas do roteiro', simulaFiacao(W.m, W.aj, W.sem, pi.arg) === 'man in a dark suit and black tie')
const v3 = provaVolta3(W)
checa('volta 3: PT, FR, esposa, fishermen, irmãs e estranho ficam; Le Prince com visuais da pista = 1 pessoa; dúvida não age; descrição para no with; só a roupa por in/dressed in; figura conhecida fica ' + v3.join(' | '), v3.length === 0)
const lp15 = lePrinceNos15(W)
const gd = provaGuardas(W)
checa('guardas por comportamento: lista exata, só o protagonista, nome só na pista, mítica, criatura, nome de 1 token ' + gd.join(' | '), gd.length === 0)
const fx = provaFiacaoExecutada(ROTA_TXT)
checa('fiação executada (condições da rota avaliadas) ' + fx.join(' | '), fx.length === 0)
// A referência fabricada com a ficha do papel mantém a identidade anônima até a folha e o corpo do motor.
{
  const alvo = 'Wednesday Addams'
  const d = 'pale girl with black braids'
  const r = W.m.elencoDoLeitor2411({ elenco: [], pedido: alvo + ', a ' + d + ', walked home.', roteiro: alvo + ' waited outside.', lidos: null })
  const ficha = r.elenco[0]
  const url = 'https://ensaio.test/original.png'
  const folha = ficha ? W.folha.promptDaFolha(ficha, null, false) : ''
  const ref = ficha ? RU.referenciaUnicaDoFilme({ characters:r.elenco, characterReferences:[{nome:ficha.nome, url}], approvedStills:[] }) : null
  const corpo = ref ? K4.buildKling4ReferenciaUnicaInput([{ prompt: ficha.canonica + '. Opens the door.', duration:15 }], ref) : null
  checa('ficha pelo papel, prompt real da folha e corpo de referência sem nome comercial', !!corpo && folha.includes(d) && JSON.stringify(corpo).includes(d) && ![ficha.nome,folha,JSON.stringify(corpo)].some(x => x.includes(alvo)))
}
const rf = provaReferencia(W, RU, K4)
checa('referência única: casa liga, cliente não', rf.ligada.casa === true && rf.ligada.cliente === false)
checa('referência única: Le Prince antes não ligaria (sem protagonista) e depois ligaria', rf.leprince.antes === false && rf.leprince.depois === true)
checa('referência única: Slocum depois — o montador aceitaria SE houver folha aprovada (suposição: no render real o crítico reprovou os stills por identidade, estilo e origem)', rf.slocum.depois === true)
checa('referência única: Cooper continua ligando', rf.cooper.antes === true)
{ // Le Prince nos 15 s com os visuais que repetem a pista: 4 de 4 planos com a frase (a 1ª versão dava [true,true,true,true]; a volta 2, [false,true,true,false])
  const URL = 'https://ensaio.test/ficha.jpg'
  const ref = RU.referenciaUnicaDoFilme({ characters: lp15.elenco, characterReferences: lp15.elenco.map((c) => ({ nome: c.nome, url: URL })), approvedStills: [] })
  const visForcados = W.f15.protagonistaEmTodaCena({ visuals: LEP_VIS, elenco: lp15.elenco, porNome: true }).visuals
  const env = ref ? K4.buildKling4ReferenciaUnicaInput(visForcados.map((p, i) => ({ prompt: p, duration: [4, 4, 4, 3][i] })), ref) : null
  rf.leprince.planos_com_frase_15s = env ? env.planosComFrase : null
  checa('Le Prince nos 15 s (visuais da pista): um protagonista e 4 de 4 planos com a frase', lp15.depois.join() === 'Louis Le Prince' && JSON.stringify(rf.leprince.planos_com_frase_15s) === '[true,true,true,true]')
}

const md = provaMedida(W)
checa('medida (KINEO-LEITURA-2411): Slocum, Le Prince, Cooper, irmãs e estranho com as duas leituras; só números; sem leitura; o filme não muda; exceção não derruba ' + md.join(' | '), md.length === 0)
const mr = provaMedidaNaRota(ROTA_TXT)
checa('medida na rota: todas as contas, dentro de try/catch, só gravada no evento ' + mr.join(' | '), mr.length === 0)

// ═══ Mutantes (cada um tem de ficar VERMELHO) ══════════════════════════════════════════════════════════════════════════
const mutantes = [
  ['L-M1 bloco gravando texto/nome', MOD, (t) => t.replace("lingua_pedida: codigoDeLingua(a.linguaPedida) }", "lingua_pedida: String(a.leituraBruta).slice(0, 60) }"), (w) => provaMedida(w).length > 0],
  ['L-M2 cálculo alterando o elenco do filme', MOD, (t) => t.replace("    const antes = a.elencoHoje()", "    ;(a.visuais as unknown as string[]).splice(0, 1)\n    const antes = a.elencoHoje()"), (w) => provaMedida(w).length > 0],
  ['L-M3 exceção derruba a medida', MOD, (t) => t.replace("  } catch { return { ...inicio, erro: true } }", "  } finally { /* sem catch */ }"), (w) => provaMedida(w).length > 0],
  ['L-M4 a_regra_agiria sempre false', MOD, (t) => t.replace("a_regra_agiria: sePublic < antes", "a_regra_agiria: false"), (w) => provaMedida(w).length > 0],
  ['L-M5 contagem pela leitura filtrada (sem os só citados)', MOD, (t) => t.replace("    const pessoas = pessoasDaLeitura(a.leituraBruta)", "    const pessoas = pessoasDaLeitura(a.leituraBruta) === null ? null : pessoasDaLeitura(a.leituraBruta)! - (soCitadosDaLeitura(a.leituraBruta) ?? 0)"), (w) => provaMedida(w).length > 0],
  ['L-M6 medida atrás do interruptor (rota)', ROTA, (t) => t.replace("    if (pedidoSemantico) { try { ctxDespacho().leitura2411 = medidaDaLeitura2411(", "    if (pedidoSemantico && elencoEFigurino2411) { try { ctxDespacho().leitura2411 = medidaDaLeitura2411("), (rota) => provaMedidaNaRota(rota).length > 0],
  ['L-M7 medida sem try/catch (rota)', ROTA, (t) => t.replace("if (pedidoSemantico) { try { ctxDespacho().leitura2411 = medidaDaLeitura2411({ leituraBruta: pedidoSemantico.raw, linguaResolvida: narrationLanguage.language, linguaDoDetector: narrationLanguage.detected, linguaPedida: body.language }) } catch { /* KINEO-LEITURA-2411: medida nunca derruba o filme */ } }", "if (pedidoSemantico) { ctxDespacho().leitura2411 = medidaDaLeitura2411({ leituraBruta: pedidoSemantico.raw, linguaResolvida: narrationLanguage.language, linguaDoDetector: narrationLanguage.detected, linguaPedida: body.language }) }"), (rota) => provaMedidaNaRota(rota).length > 0],
  ['M1 interruptor em public', MOD, (t) => t.replace("ELENCO_E_FIGURINO_2411: ModoElencoEFigurino2411 = 'internal'", "ELENCO_E_FIGURINO_2411: ModoElencoEFigurino2411 = 'public'"), (w) => provaInterruptor(w.m, ROTA_TXT).e.length > 0],
  ['M2 internal sem a lista exata', MOD, (t) => t.replace("(modo === 'internal' && contaDaCasaExata(email))", "(modo === 'internal')"), (w) => provaInterruptor(w.m, ROTA_TXT).e.length > 0],
  ['M3 off muda algo', MOD, (t) => t.replace("modo === 'public' || (modo === 'internal'", "modo !== 'internal' || (modo === 'internal'"), (w) => provaInterruptor(w.m, ROTA_TXT).e.length > 0],
  ['M4 casamento de nome por substring', MOD, (t) => t.replace('return p.length >= 2 && p[p.length - 1] === w', 'return p.length >= 2 && p.join(" ").includes(w)'), (w) => contraprovasNome(w).length > 0],
  ['M5 dois parentes viram um (sem a dúvida de candidatos)', MOD, (t) => t.replace('if (candidatos.length !== 1) return null', 'if (candidatos.length < 1) return null').replace("if (lidos.some((n) => n !== candidatos[0] && palavrasDoNome(n).includes(w))) return null", ''), (w) => contraprovasNome(w).length > 0],
  ['M6 sem a prova do sufixo ("John Smith" no texto)', MOD, (t) => t.replace('if (!seqs.filter((s) => terminaEm(s, w)).every((s) => ehSufixo(s, completo))) return null', ''), (w) => contraprovasNome(w).length > 0],
  ['M7 nome completo não escrito no roteiro', MOD, (t) => t.replace("if (!seqs.some((s) => s.join(' ') === completo.join(' '))) return null", ''), (w) => contraprovasNome(w).length > 0],
  ['M8 escrita não latina muda', MOD, (t) => t.replace('if (!escritaLatina(texto)) return null', ''), (w) => contraprovasNome(w).length > 0],
  ['M9 o núcleo vira o nome completo', MOD, (t) => t.replace('return { ...f, nome: completo, canonica }', 'return { ...f, nome: completo, nucleo: completo, canonica }'), (w) => provaLePrince(w).e.length > 0],
  ['M10 sem prova devolve cópia (off deixa de ser byte a byte)', MOD, (t) => t.replace('elenco: renomeados.length ? saida : (base as FichaDePersonagem[])', 'elenco: saida'), (w) => contraprovasNome(w).length > 0],
  ['M11 pista cria elenco', MOD, (t) => t.replace('&& !pistaDescreveOProtagonista(roteiro, ficha, chave, protagonista, ctx)', ''), (w) => provaSlocum(w).e.length > 0],
  ['M12 papel da narração tratado como pista', MOD, (t) => t.replace('&& !temPalavra(semTags(roteiro), k)', ''), (w) => contraprovasPista(w).length > 0],
  ['M13 roupa de uma cena vira fixa (a rota passa o roteiro)', ROTA, null, () => simulaFiacao(W.m, W.aj, W.sem, 'prompt') !== 'man in a dark suit and black tie'],
  ['M14 descrição duplicada quando a ficha já tem', MOD, (t) => t.replace('if (palavrasConteudo(descricao).every((w) => ficha.includes(w)))', 'if (false)'), (w) => contraprovasRoupa(w).length > 0],
  ['M15 a descrição vai ao 1º do elenco, não ao protagonista', MOD, (t) => t.replace('const i = elenco.findIndex((f) => f.protagonista)', 'const i = 0'), (w) => contraprovasRoupa(w).length > 0],
  ['M16 bicho ganha a descrição de gente', MOD, (t) => t.replace("p.tipo !== 'humano' || ", ''), (w) => contraprovasRoupa(w).length > 0],
  ['M17 o "who called himself" sem trechoDescreve', MOD, (t) => t.replace('if (trechoDescreve(trecho, m[1], ficha)) return trecho', 'return trecho'), (w) => w.m.autodenominadoNoPedido('the plane landed and a man who called himself Dan Cooper left', { nome: 'Dan Cooper', nucleo: 'Cooper', tipo: 'humano' }) === null ? false : true],
  ['N1 qualquer língua conta como inglês', MOD, (t) => t.replace("if (!protagonista || ctx.lingua !== 'en' || pessoasDaLeitura(ctx.leituraBruta) !== 1) return false", "if (!protagonista || pessoasDaLeitura(ctx.leituraBruta) !== 1) return false"), (w) => provaVolta3(w).length > 0],
  ['N2 sem conferir quantas pessoas a leitura leu', MOD, (t) => t.replace("|| pessoasDaLeitura(ctx.leituraBruta) !== 1) return false", ") return false"), (w) => provaVolta3(w).length > 0],
  ['N3 conta só os coadjuvantes "em cena" (o só citado some)', MOD, (t) => t.replace("r.supporting.filter((s) => s && typeof s === 'object').length", "r.supporting.filter((s) => s && typeof s === 'object' && s.on_screen !== false).length"), (w) => provaVolta3(w).length > 0],
  ['N4 sem conferir o gênero do papel × protagonista', MOD, (t) => t.replace("return !(gR && gP && gR !== gP)", "return true"), (w) => provaVolta3(w).length > 0],
  ['N5 papel/protagonista não humano também sai', MOD, (t) => t.replace("if (ficha.tipo !== 'humano' || protagonista.tipo !== 'humano' || !papelSoDaPista(roteiro, chave)) return false", "if (!papelSoDaPista(roteiro, chave)) return false"), (w) => provaVolta3(w).length > 0],
  ['N6 plural irregular (fishermen) não conta', MOD, (t) => t.replace(", n.replace(/man$/, 'men'), n.replace(/men$/, 'man')]", "]"), (w) => provaVolta3(w).length > 0],
  ['N7 descrição não para no "with"', MOD, (t) => t.replace("const curta = limpa(descricao.replace(PARADA_RE, '').replace(VESTINDO_RE, ''))", "const curta = limpa(descricao.replace(VESTINDO_RE, ''))"), (w) => provaVolta3(w).length > 0],
  ['N8 sem a trava de figura conhecida', MOD, (t) => t.replace("figuraConhecidaJuiz(p.nome) || figuraConhecida(p.nome) || ", ''), (w) => provaVolta3(w).length > 0],
  ['N9 "wearing" (equipamento de um momento) entra', MOD, (t) => t.replace(".replace(VESTINDO_RE, '')", ''), (w) => provaVolta3(w).length > 0],
  ['N10 gênero nulo da ficha autoriza gênero marcado', MOD, (t) => t.replace("if (g && g !== gF) return null", "if (g && gF && g !== gF) return null"), (w) => provaVolta3(w).length > 0],
  ['N11 duas pessoas coordenadas aceitas', MOD, (t) => t.replace("if (m && generoDoPapel(cabecaDe(m[1]))) return null // outra pessoa coordenada", ''), (w) => provaVolta3(w).length > 0],
  ['N12 troca nome que já casava', MOD, (t) => t.replace("if (!completo || mesmoPersonagem(completo, f.nome) || base.some(", "if (!completo || base.some("), (w) => provaVolta3(w).length > 0],
  ['N13 a língua volta a ser o detector do texto', MOD, (t) => t.replace("if (!protagonista || ctx.lingua !== 'en' ||", "if (!protagonista || (ctx.lingua !== 'en' || roteiro.split(' ').length < 120) ||"), (w) => provaVolta3(w).length > 0],
  ['N14 figurino sem o interruptor próprio (rota)', ROTA, (t) => t.replace("if (elencoEFigurino2411 && elencoEFigurinoLigado(FIGURINO_DO_PEDIDO_2411, user.email) && ", "if (elencoEFigurino2411 && "), (rota) => provaFiacaoExecutada(rota).length > 0],
  ['R3 figurino sem a trava do desenho infantil (rota)', ROTA, (t) => t.replace(" && !desenhoInfantil.ativo && personagemElenco.elenco.length > 0) { const doPedido2411", " && personagemElenco.elenco.length > 0) { const doPedido2411"), (rota) => provaFiacaoExecutada(rota).length > 0],
  ['R1 figurino sem o interruptor (rota)', ROTA, (t) => t.replace("if (elencoEFigurino2411 && elencoEFigurinoLigado(FIGURINO_DO_PEDIDO_2411, user.email) && !qualidadeHerdada", "if (elencoEFigurinoLigado(FIGURINO_DO_PEDIDO_2411, user.email) && !qualidadeHerdada"), (rota) => provaFiacaoExecutada(rota).length > 0],
  ['R2 regra da pista sem exigir a leitura (rota)', ROTA, (t) => t.replace("completar: elencoEFigurino2411 && pedidoSemantico?.elenco ?", "completar: elencoEFigurino2411 ?"), (rota) => provaFiacaoExecutada(rota).length > 0],
  ['R4 isInternalEmail no lugar da lista exata', MOD, (t) => t.replace("import { contaDaCasaExata } from '@/lib/internalAccounts'", "import { isInternalEmail as contaDaCasaExata } from '@/lib/internalAccounts'"), (w) => provaGuardas(w).length > 0],
  ['R5 descrição para todo humano do elenco', MOD, (t) => t.replace("const saida = elenco.map((f, k) => (k === i ? { ...f, canonica } : f))", "const saida = elenco.map((f) => (f.tipo === 'humano' ? { ...f, canonica: [f.canonica.split('; ')[0], `${MARCA_DO_PEDIDO_2411} ${descricao}`].join('; ') } : f))"), (w) => provaGuardas(w).length > 0],
  ['R6 nome completo escrito só na pista vale', MOD, (t) => t.replace(/const texto = semTags\(roteiro\)(\r?\n\s*if \(!escritaLatina\(texto\)\) return null)/, 'const texto = limpa(roteiro)$1'), (w) => provaGuardas(w).length > 0],
  ['R7 sem a trava da figura mítica', MOD, (t) => t.replace("(p.origem as string) === 'mitica' || figuraConhecidaJuiz", "figuraConhecidaJuiz"), (w) => provaGuardas(w).length > 0],
  ['R8 criatura recebe descrição de gente', MOD, (t) => t.replace("p.tipo !== 'humano' || ", ""), (w) => provaGuardas(w).length > 0],
  ['R9 nome de 1 token aceito como completo', MOD, (t) => t.replace("return p.length >= 2 && p[p.length - 1] === w", "return p.length >= 1 && p[p.length - 1] === w"), (w) => provaGuardas(w).length > 0],
]
for (const [nome, alvo, mutar, morreu] of mutantes) {
  let vermelho
  try {
    if (alvo === ROTA && mutar) { const r = mutar(ROTA_TXT); vermelho = r !== ROTA_TXT && morreu(r) }
    else if (alvo === ROTA) { const prova = provaInterruptor(W.m, ROTA_TXT.replace('fichaComDescricaoDoPedido(body.original_idea,', 'fichaComDescricaoDoPedido(prompt,')); vermelho = prova.e.length > 0 || morreu() }
    else vermelho = morreu(mundo(mutar, alvo))
  } catch (err) { vermelho = true }
  checa(`mutante morto: ${nome}`, vermelho === true)
}
// os mutantes de fato mudam a fonte (um replace que não casa seria um mutante falso)
const fonte = fs.readFileSync(MOD, 'utf8')
for (const [nome, alvo, mutar] of mutantes) if (alvo === MOD) checa(`mutante aplica: ${nome}`, mutar(fonte) !== fonte)

// ═══ Antes × depois (para o relatório) ═════════════════════════════════════════════════════════════════════════════════
console.log('\nANTES × DEPOIS')
console.log(JSON.stringify({ leprince: { antes: lp.antes, depois: lp.depois }, slocum: { antes: sl.antes, depois: sl.depois, ficha_depois: co.slocum }, cooper: { folha_antes: co.antes, folha_depois: co.depois }, referencia_unica: rf }, null, 1))
console.log(`\n${ok} ok, ${falhas} falha(s)`)
if (falhas > 0) { console.log('FAIL'); process.exit(1) } else console.log('PASS')
