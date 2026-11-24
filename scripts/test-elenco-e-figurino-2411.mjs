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
const mocksCasa = { '@/lib/internalAccounts': { contaDaCasaExata: (e) => e === CASA, isInternalEmail: (e) => e === CASA } }
const carrega = (arq, mutar = null, alvo = MOD) => createOfflineLoader({ source: (rel, t) => (mutar && rel === alvo ? mutar(t) : t), mocks: mocksCasa })(arq)
const mundo = (mutar = null, alvo = MOD) => ({
  m: carrega(MOD, mutar, alvo), aj: carrega('lib/cinematic/personagemAjuste.ts', mutar, alvo), sem: carrega('lib/cinematic/elencoSemantico.ts', mutar, alvo),
  conf: carrega('lib/cinematic/conferenciaDoElenco.ts', mutar, alvo), f15: carrega('lib/filmes/filme15Elenco.ts', mutar, alvo),
  fp: carrega('lib/cinematic/fichaDoPedido.ts', mutar, alvo), folha: carrega('lib/cinematic/folhaDePersonagem.ts', mutar, alvo),
})
const FIX = JSON.parse(fs.readFileSync('scripts/fixtures/elenco-e-figurino-2411-casos.json', 'utf8')).casos
const { cooper: COO, leprince: LEP, slocum: SLO } = FIX
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
  const depois = elenco15(w, SLO, doPedido, w.m.aceitaPapelSemPista(SLO.roteiro, w.sem.aceitaPapelDasCenas(SLO.roteiro)))
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
  const r = elenco15(w, { visuais_do_render: vis }, doisPedido, w.m.aceitaPapelSemPista(DOIS, w.sem.aceitaPapelDasCenas(DOIS)), vis)
  if (nomes(r.elenco).join() !== 'Elias Ward,Nora') e.push('P1 dois protagonistas reais: ' + nomes(r.elenco))
  // (b) papel que a NARRAÇÃO escreve (e a pista repete) não é "só da pista"
  if (w.m.papelSoDaPista('HOOK: [Pexels: old sailor at the helm] An old sailor lost at sea in 1909.', 'sailor')) e.push('P2 papel da narração tratado como pista')
  // (c) gente que o texto não escreve e que nenhuma pista escreve (o avô do pedido em PT) continua entrando pelos visuais
  const PT = 'GANCHO: Uma menina encontrou uma chave azul no sótão.\n\nFINAL: O avô sorriu quando ela abriu a caixa.'
  const menina = [fic('the girl', { nucleo: 'girl' })]
  const visPT = ['A curly-haired girl holds a blue key in an attic.', 'The girl hands the key to the grandfather, who smiles.']
  const pt = elenco15(w, {}, menina, w.m.aceitaPapelSemPista(PT, null), visPT)
  if (!nomes(pt.elenco).some((x) => /grandfather/.test(x))) e.push('P3 o avô do pedido em PT sumiu: ' + nomes(pt.elenco))
  // (d) filme sem gente: sem elenco do pedido e sem gente nos visuais = vazio
  const vazio = elenco15(w, {}, [], w.m.aceitaPapelSemPista('HOOK: [Pexels: ocean] The ocean is deep.', null), ['A wide shot of a deep blue ocean.'])
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
  const r = w.m.fichaComDescricaoDoPedido(COO.ideia, [gravada])
  const folhaDepois = w.folha.promptDaFolha(r.elenco[0], look)
  if (/dark suit/.test(folhaAntes)) e.push('3.1 a folha de antes já tinha o paletó?')
  if (r.descricao !== 'man in a dark suit and black tie' || !/as the request describes: man in a dark suit and black tie/.test(folhaDepois)) e.push('3.2 a folha não leva o paletó: ' + folhaDepois.slice(0, 260))
  if (!r.elenco[0].canonica.startsWith('Dan Cooper, a man in a black tie, exactly as the author wrote; as the request describes:')) e.push('3.3 a descrição entrou fora do lugar')
  if (!r.elenco[0].canonica.endsWith('period-accurate 1970s hairstyle and clothing true to their own place and role')) e.push('3.4 perdeu o resto da ficha')
  if (w.m.fichaComDescricaoDoPedido(COO.ideia, r.elenco).trocas.length !== 0) e.push('3.5 não é idempotente')
  // Slocum: "an old bearded sailor" do pedido vai à ficha dele (a mesma pessoa que os visuais descrevem)
  const s = fichaDaLeitura(w, SLO).aplicado.elenco
  const rs = w.m.fichaComDescricaoDoPedido(SLO.ideia, s)
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
  const rd = w.m.fichaComDescricaoDoPedido(COO.ideia, dois)
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
  const sloDepois = elenco15(w, SLO, fichaDaLeitura(w, SLO).aplicado.elenco, w.m.aceitaPapelSemPista(SLO.roteiro, w.sem.aceitaPapelDasCenas(SLO.roteiro)))
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
  if (!/completar: elencoEFigurino2411 && pedidoSemantico\?\.elenco \? aceitaPapelSemPista\(prompt, elencoSemantico \? aceitaPapelDasCenas\(prompt\) : null\) \/\*.*?\*\/ : elencoSemantico \? aceitaPapelDasCenas\(prompt\) : true/.test(linha(/elencoFilme15 = /))) e.push('W4 o filtro da pista sem a porta, ou o caminho desligado mudou')
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
const rf = provaReferencia(W, RU, K4)
checa('referência única: casa liga, cliente não', rf.ligada.casa === true && rf.ligada.cliente === false)
checa('referência única: Le Prince antes não ligaria (sem protagonista) e depois ligaria', rf.leprince.antes === false && rf.leprince.depois === true)
checa('referência única: Slocum depois ligaria com a ficha (um protagonista, frase nos planos dele)', rf.slocum.depois === true)
checa('referência única: Cooper continua ligando', rf.cooper.antes === true)

// ═══ Mutantes (cada um tem de ficar VERMELHO) ══════════════════════════════════════════════════════════════════════════
const mutantes = [
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
  ['M11 pista cria elenco', MOD, (t) => t.replace('&& !papelSoDaPista(roteiro, chave)', ''), (w) => provaSlocum(w).e.length > 0],
  ['M12 papel da narração tratado como pista', MOD, (t) => t.replace('&& !temPalavra(semTags(roteiro), k)', ''), (w) => contraprovasPista(w).length > 0],
  ['M13 roupa de uma cena vira fixa (a rota passa o roteiro)', ROTA, null, () => simulaFiacao(W.m, W.aj, W.sem, 'prompt') !== 'man in a dark suit and black tie'],
  ['M14 descrição duplicada quando a ficha já tem', MOD, (t) => t.replace('if (palavrasConteudo(descricao).every((w) => ficha.includes(w)))', 'if (false)'), (w) => contraprovasRoupa(w).length > 0],
  ['M15 a descrição vai ao 1º do elenco, não ao protagonista', MOD, (t) => t.replace('const i = elenco.findIndex((f) => f.protagonista)', 'const i = 0'), (w) => contraprovasRoupa(w).length > 0],
  ['M16 bicho ganha a descrição de gente', MOD, (t) => t.replace("p.tipo !== 'humano' || ", ''), (w) => contraprovasRoupa(w).length > 0],
  ['M17 o "who called himself" sem trechoDescreve', MOD, (t) => t.replace('if (trechoDescreve(trecho, m[1], ficha)) return trecho', 'return trecho'), (w) => w.m.autodenominadoNoPedido('the plane landed and a man who called himself Dan Cooper left', { nome: 'Dan Cooper', nucleo: 'Cooper', tipo: 'humano' }) === null ? false : true],
]
for (const [nome, alvo, mutar, morreu] of mutantes) {
  let vermelho
  try {
    if (alvo === ROTA) { const prova = provaInterruptor(W.m, ROTA_TXT.replace('fichaComDescricaoDoPedido(body.original_idea,', 'fichaComDescricaoDoPedido(prompt,')); vermelho = prova.e.length > 0 || morreu() }
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
