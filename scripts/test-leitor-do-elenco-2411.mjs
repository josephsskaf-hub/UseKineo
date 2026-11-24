// KINEO-LEITOR-DO-ELENCO-2411 — guardião sem rede e sem custo. Executa as funções REAIS da cadeia do elenco do pedido na ordem da rota
// (elencoDoRoteiro → elencoComNomeCompleto → lerElencoSemantico/aplicarElencoSemantico → elencoConferido → fichaDoSujeitoVivo → [elencoDoLeitor2411]
// → elencoComFichaDoPedido (0911/1311) → fichaComDescricaoDoPedido (2411) → elencoDoFilme15) nos ensaios da casa de 24/11 (Elias Ward/Mara Quinn
// bf823182, Elias/Mara 9ce9576c, Juno 9467548b, Bolt, Ember), nos 3 roteiros reais da manhã (Cooper, Le Prince, Slocum: sem regressão) e nas
// contraprovas. Cada regra tem mutante que fica vermelho pela asserção exata. O casting (gpt-4o-mini) não roda: ele não reescreve ficha 'autor'.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const MOD = 'lib/cinematic/elencoEFigurino2411.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const CASA = 'casa@ensaio.test'
const mocksCasa = { '@/lib/internalAccounts': { contaDaCasaExata: (e) => e === CASA, isInternalEmail: (e) => e === CASA } }
const carrega = (arq, mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === MOD ? mutar(t) : t), mocks: mocksCasa })(arq)
const mundo = (mutar = null) => ({
  m: carrega(MOD, mutar), aj: carrega('lib/cinematic/personagemAjuste.ts', mutar), sem: carrega('lib/cinematic/elencoSemantico.ts', mutar),
  conf: carrega('lib/cinematic/conferenciaDoElenco.ts', mutar), f15: carrega('lib/filmes/filme15Elenco.ts', mutar),
  fp: carrega('lib/cinematic/fichaDoPedido.ts', mutar), p13: carrega('lib/cinematic/protagonista1311.ts', mutar),
})
const CASA_FIX = JSON.parse(fs.readFileSync('scripts/fixtures/leitor-do-elenco-2411-casos.json', 'utf8')).casos
const MANHA = JSON.parse(fs.readFileSync('scripts/fixtures/elenco-e-figurino-2411-casos.json', 'utf8')).casos
const pistas = (r) => (String(r).match(/\[[^\]]*\]/g) ?? []).map((p) => p.replace(/^\[(?:Pexels|Pixabay|Stock)?:?\s*/i, '').replace(/\]$/, ''))
const nomes = (e) => e.map((f) => f.nome)

/** A cadeia do elenco do pedido, na ordem da rota (estrada clássica, character_story, conta da casa). `leitor` = com o passo novo. */
function cadeia(w, c, { raw = undefined, sujeito = null, leitor = true, pedido = c.ideia } = {}) {
  const roteiro = c.roteiro
  const base0 = w.aj.elencoDoRoteiro(roteiro, {})
  const leitura = raw === undefined || raw === null ? null : w.sem.lerElencoSemantico(typeof raw === 'string' ? raw : JSON.stringify(raw), roteiro)
  const conf0 = w.conf.conferenciaDaLeitura(leitura)
  const nc = leitura ? w.m.elencoComNomeCompleto(base0, conf0?.nomes ?? [], roteiro) : null
  const base = nc ? nc.elenco : base0
  const aplicado = leitura ? w.sem.aplicarElencoSemantico(base, leitura, roteiro) : null
  const conferencia = !aplicado ? w.conf.conferenciaDaLeitura(leitura) : null
  const baseConf = w.conf.elencoConferido(base, conferencia)
  const elencoDoPedido = (aplicado ? aplicado.elenco : baseConf.elenco).map((f) => ({ ...f }))
  if (sujeito && elencoDoPedido.length === 0) { const v = w.p13.fichaDoSujeitoVivo(sujeito, pedido); if (v) elencoDoPedido.push(v) }
  let mudancas = []
  if (leitor) {
    const r = w.m.elencoDoLeitor2411({ elenco: elencoDoPedido, pedido, roteiro, lidos: leitura ? conf0?.nomes ?? [] : null, lugares: leitura?.places_and_orgs ?? [] })
    mudancas = r.mudancas
    if (r.mudancas.length) elencoDoPedido.splice(0, elencoDoPedido.length, ...r.elenco)
  }
  let elenco = elencoDoPedido
  const p0911 = w.fp.elencoComFichaDoPedido(pedido, elenco, { aparencia1311: true })
  if (p0911.literais.length) elenco = p0911.elenco
  if (elenco.length) { const d = w.m.fichaComDescricaoDoPedido(pedido, elenco); if (d.trocas.length) elenco = d.elenco }
  const extrair = (t) => w.conf.elencoConferido(w.aj.elencoDoRoteiro(t), conferencia).elenco
  const f15 = w.f15.elencoDoFilme15({ elencoDoPedido: elenco, visuals: pistas(roteiro), extrair, completar: aplicado ? w.sem.aceitaPapelDasCenas(roteiro) : true })
  return { antesDoLeitor: aplicado ? 'semantico' : 'deterministico', elenco, final: f15.elenco.length ? f15.elenco : elenco, mudancas, aplicado, base: base0 }
}
const sem = (s, ...ws) => ws.every((x) => !String(s).toLowerCase().includes(x))
const com = (s, ...ws) => ws.every((x) => String(s).includes(x))

function provas(w) {
  const e = []
  const F = CASA_FIX
  // ═══ (a) Elias Ward e Mara Quinn (bf823182): o gravado e o conserto
  const farolAntes = cadeia(w, F.farol, { raw: F.farol.leitura_simulada, leitor: false })
  if (farolAntes.aplicado !== null || farolAntes.base.length !== 0 || farolAntes.elenco.length !== 0) e.push('A0 o antes não reproduz o gravado (aplicar null, base [], elenco vazio)')
  const farol = cadeia(w, F.farol, { raw: F.farol.leitura_simulada })
  const [el, ma] = farol.final
  if (nomes(farol.final).join('|') !== 'Elias Ward|Mara Quinn') e.push('A1 elenco ' + nomes(farol.final))
  if (!el?.protagonista || el?.tipo !== 'humano' || el?.origem !== 'autor' || !com(el?.canonica, 'gray-bearded lighthouse keeper in a navy coat')) e.push('A2 Elias ' + JSON.stringify(el))
  if (ma?.protagonista || ma?.tipo !== 'humano' || !com(ma?.canonica, 'young red-haired radio operator in a green sweater')) e.push('A3 Mara ' + JSON.stringify(ma))
  if (JSON.stringify(farol.mudancas.map((x) => [x.acao, x.fonte, x.forma])) !== '[["novo","pedido","aposto"],["novo","pedido","aposto"]]') e.push('A4 mudanças ' + JSON.stringify(farol.mudancas))
  // sem pedido (roteiro colado): entra só com o que a narração diz dele — nenhuma aparência sorteada
  const semPedido = cadeia(w, F.farol, { raw: F.farol.leitura_simulada, pedido: null })
  const elSP = semPedido.final[0]
  if (nomes(semPedido.final).join('|') !== 'Elias Ward|Mara Quinn' || elSP?.canonica !== 'Elias Ward, had kept the lighthouse alone for thirty years, exactly as the author wrote' || !sem(semPedido.final.map((f) => f.canonica).join(' '), 'hair', 'wearing', 'early thirties', 'eyes')) e.push('A5 sem pedido ' + JSON.stringify(semPedido.final.map((f) => f.canonica)))
  // a leitura respondeu SEM eles (julgou): nada; a leitura não respondeu e não há descrição: nada (sobrenome sozinho não basta)
  const julgado = cadeia(w, F.farol, { raw: { protagonist: null, supporting: [], places_and_orgs: [] } })
  if (julgado.final.length !== 0 || julgado.mudancas.length !== 0) e.push('A6 leitura sem eles e mesmo assim entrou ' + nomes(julgado.final))
  const semLeituraSemPedido = cadeia(w, F.farol, { raw: null, pedido: null })
  if (semLeituraSemPedido.final.length !== 0) e.push('A7 sem leitura e sem descrição entrou ' + nomes(semLeituraSemPedido.final))
  // ═══ (a') a cópula do pedido (9ce9576c): a aparência entra nas duas fichas
  const f2Antes = cadeia(w, F.farol2, { raw: F.farol2.leitura_simulada, leitor: false })
  if (f2Antes.elenco[0]?.canonica !== F.farol2.gravado.canonica_elias) e.push('B0 o antes não reproduz a canônica gravada: ' + f2Antes.elenco[0]?.canonica)
  const f2 = cadeia(w, F.farol2, { raw: F.farol2.leitura_simulada })
  if (nomes(f2.final).join('|') !== 'Elias|Mara') e.push('B1 elenco ' + nomes(f2.final))
  if (!com(f2.final[0]?.canonica, 'old gray-bearded lighthouse keeper in a navy coat', 'kept the old lighthouse')) e.push('B2 Elias ' + f2.final[0]?.canonica)
  if (!com(f2.final[1]?.canonica, 'young red-haired radio operator in a green sweater')) e.push('B3 Mara ' + f2.final[1]?.canonica)
  if (JSON.stringify(f2.mudancas.map((x) => [x.acao, x.forma])) !== '[["descricao","copula"],["descricao","copula"]]') e.push('B4 mudanças ' + JSON.stringify(f2.mudancas))
  // ═══ (b) Juno (9467548b): a leitura recusa (o "json" gravado) e o sujeito vira "the retriever"
  if (w.sem.lerElencoSemantico(JSON.stringify(F.juno.leitura_simulada), F.juno.roteiro) !== null) e.push('C0 a leitura do Juno devia ser recusada (espécie fora da narração)')
  const junoAntes = cadeia(w, F.juno, { raw: null, sujeito: F.juno.sujeito_gravado, leitor: false })
  if (nomes(junoAntes.final).join() !== 'the retriever' || !sem(junoAntes.final[0]?.canonica, 'bandana')) e.push('C1 o antes não reproduz "the retriever" sem bandana: ' + JSON.stringify(junoAntes.final))
  const juno = cadeia(w, F.juno, { raw: null, sujeito: F.juno.sujeito_gravado })
  const j = juno.final[0]
  if (juno.final.length !== 1 || j?.nome !== 'Juno' || j?.tipo !== 'animal' || j?.nucleo !== 'retriever' || !j?.protagonista || j?.origem !== 'autor' || !com(j?.canonica, 'golden retriever with a red bandana')) e.push('C2 Juno ' + JSON.stringify(juno.final))
  if (JSON.stringify(juno.mudancas.map((x) => [x.acao, x.tipo])) !== '[["nome","animal"]]') e.push('C3 mudanças ' + JSON.stringify(juno.mudancas))
  // ═══ Bolt e Ember: a cadeia de hoje já leva o robô (0911); o leitor não muda nada nem atrapalha
  const boltLeitura = { protagonist: { name: 'Bolt', role_text: null, kind: 'creature', species: 'robot', species_en: 'robot', appearance_from_text: '', gender_if_stated: 'male', on_screen: true }, supporting: [], places_and_orgs: [] }
  const bolt = cadeia(w, F.bolt, { raw: boltLeitura })
  if (bolt.final[0]?.nome !== 'Bolt' || !com(bolt.final[0]?.canonica, 'small round orange robot with big blue eyes')) e.push('D1 Bolt ' + JSON.stringify(bolt.final[0]))
  if (JSON.stringify(bolt.final) !== JSON.stringify(cadeia(w, F.bolt, { raw: boltLeitura, leitor: false }).final)) e.push('D2 o leitor mudou o Bolt que a camada de 09/11 já cobre')
  const boltSemLeitura = cadeia(w, F.bolt, { raw: null })
  if (boltSemLeitura.final[0]?.nome !== 'Bolt' || !com(boltSemLeitura.final[0]?.canonica, 'small round orange robot with big blue eyes')) e.push('D3 Bolt sem leitura ' + JSON.stringify(boltSemLeitura.final[0]))
  const ember = cadeia(w, F.ember, { raw: null })
  if (ember.mudancas.length !== 0) e.push('D4 Ember: "orange wings" não passa na régua de descrição (limite declarado) e nada devia mudar ' + JSON.stringify(ember.mudancas))
  return { e, relato: { farol: nomes(farol.final), juno: j?.canonica, farol2: f2.final.map((f) => f.canonica) } }
}

// ═══ Os 3 roteiros da manhã (Cooper, Le Prince, Slocum): com o leitor = sem o leitor, ficha por ficha
function semRegressao(w) {
  const e = []
  for (const k of ['cooper', 'leprince', 'slocum']) {
    const c = MANHA[k]
    const raw = c.leitura_semantica.raw
    const a = cadeia(w, c, { raw, leitor: false })
    const b = cadeia(w, c, { raw })
    if (JSON.stringify(a.final) !== JSON.stringify(b.final)) e.push(`M ${k}: o elenco mudou ${JSON.stringify(a.final.map((f) => f.canonica))} → ${JSON.stringify(b.final.map((f) => f.canonica))}`)
    if (b.mudancas.length !== 0) e.push(`M ${k}: mudanças ${JSON.stringify(b.mudancas)}`)
  }
  return e
}

// ═══ Contraprovas: quem NÃO entra / NÃO muda
function contraprovas(w) {
  const e = []
  const L = (o) => w.m.elencoDoLeitor2411({ elenco: [], pedido: undefined, roteiro: '', lidos: null, lugares: [], ...o })
  const fic = (nome, extra = {}) => ({ nome, nucleo: nome.split(' ').pop(), tipo: 'humano', canonica: `${nome}, a person`, origem: 'deterministica', protagonista: true, genero: null, ...extra })
  // nome só, sem descrição, lido pela leitura ("Meet Emma."): a regra de 01/11 (rodada 9) fica — sem ficha inventada
  const emma = L({ roteiro: 'Meet Emma. Emma opened the old door and stepped inside.', lidos: ['Emma'] })
  if (emma.elenco.length !== 0) e.push('K1 nome sem sobrenome e sem descrição entrou')
  // figura conhecida: regras de hoje (nada deduzido do nome)
  const han = L({ roteiro: 'Hanuman, a mighty monkey with a red cloth, leaped across the sea.', lidos: null })
  if (han.elenco.length !== 0) e.push('K2 figura conhecida entrou pelo leitor')
  // função no começo de frase não é nome
  const isto = L({ roteiro: 'This is a small brown dog with a collar. It waits by the gate.', lidos: null })
  if (isto.elenco.length !== 0) e.push('K3 "This is a …" virou personagem ' + nomes(isto.elenco))
  // o nome só no pedido, não na narração: nada
  const soPedido = L({ roteiro: 'The storm hit the coast at night. A small boat was lost.', pedido: 'Elias Ward, a gray-bearded lighthouse keeper in a navy coat, guides a boat.', lidos: null })
  if (soPedido.elenco.length !== 0) e.push('K4 nome que a narração não escreve entrou')
  // a leitura listou como lugar
  const lugar = L({ roteiro: 'Stone Harbor, a quiet fishing village with red roofs, woke up. Stone Harbor had kept its secret.', lidos: ['Stone Harbor'], lugares: ['Stone Harbor'] })
  if (lugar.elenco.length !== 0) e.push('K5 lugar entrou')
  // dois nomes da mesma espécie para "the dog": dúvida = nada
  const dois = w.m.elencoDoLeitor2411({ elenco: [fic('the dog', { nucleo: 'dog', tipo: 'animal', origem: 'modelo' })], pedido: 'Rex, a big brown dog with a collar, and Max, a small white dog with a bell, wait at the door.', roteiro: 'Rex barked. Max ran to the gate.', lidos: null, lugares: [] })
  if (nomes(dois.elenco).join() !== 'the dog' || dois.mudancas.length) e.push('K6 dois nomes da mesma espécie renomearam ' + nomes(dois.elenco))
  const doisCopula = w.m.elencoDoLeitor2411({ elenco: [fic('the dog', { nucleo: 'dog', tipo: 'animal', origem: 'modelo' })], pedido: 'Rex is a big brown dog with a collar. Max is a small white dog with a bell.', roteiro: 'Rex barked. Max ran to the gate.', lidos: null, lugares: [] })
  if (nomes(doisCopula.elenco).join() !== 'the dog') e.push('K6b dois cães descritos em frases separadas renomearam ' + nomes(doisCopula.elenco))
  // descrição com verbo (a régua de 09/11, tudo ou nada)
  const verbo = L({ roteiro: 'Jake Moss, a 40-year-old bearded trucker kills the engine. Jake Moss waited.', lidos: null })
  if (verbo.elenco.length !== 0) e.push('K7 descrição com verbo entrou ' + JSON.stringify(verbo.elenco))
  // escrita não latina
  const arabe = L({ roteiro: 'كان إلياس وارد يحرس المنارة وحده لمدة ثلاثين عاما', lidos: ['إلياس وارد'] })
  if (arabe.elenco.length !== 0) e.push('K8 escrita não latina')
  // sobrenome sem leitura que respondeu (o sobrenome só vale com a leitura): nada
  const semLeitura = L({ roteiro: 'Elias Ward had kept the lighthouse alone for thirty years.', lidos: null })
  if (semLeitura.elenco.length !== 0) e.push('K9 nome e sobrenome sem leitura entrou')
  // nome curto do elenco e descrição com o sobrenome no pedido ("Elias" × "Elias Ward, a …"): a descrição é dele
  const curto = w.m.elencoDoLeitor2411({ elenco: [fic('Elias', { origem: 'autor', canonica: 'Elias, kept the old lighthouse alone, exactly as the author wrote' })], pedido: 'Elias Ward, a gray-bearded lighthouse keeper in a navy coat, guides a lost boat home.', roteiro: 'Elias had kept the old lighthouse alone. Elias lit the lamp.', lidos: ['Elias'], lugares: [] })
  if (!com(curto.elenco[0]?.canonica, 'as the request describes: gray-bearded lighthouse keeper in a navy coat')) e.push('K10 nome curto não leu o aposto com sobrenome ' + curto.elenco[0]?.canonica)
  // nada a fazer = o MESMO array; erro dentro = o MESMO array
  const nada = [fic('Lena')]
  if (w.m.elencoDoLeitor2411({ elenco: nada, pedido: undefined, roteiro: 'Lena walked home.', lidos: ['Lena'], lugares: [] }).elenco !== nada) e.push('K11 sem mudança não devolveu o mesmo array')
  const ruim = [null]
  let r
  try { r = w.m.elencoDoLeitor2411({ elenco: ruim, pedido: 'Juno, a golden retriever with a red bandana, waits.', roteiro: { toString() { throw new Error('roteiro ilegível') } }, lidos: null, lugares: [] }) } catch { r = null }
  if (!r || r.elenco !== ruim || r.mudancas.length) e.push('K12 erro dentro do leitor lançou ou mudou o elenco')
  // escrita não latina COM maiúscula (cirílico): nada
  const cir = L({ roteiro: 'Илья Уорд хранил маяк тридцать лет. Илья Уорд зажёг огонь.', lidos: ['Илья Уорд'] })
  if (cir.elenco.length !== 0) e.push('K8b cirílico entrou ' + nomes(cir.elenco))
  // roteiro colado pelo cliente (sem pedido) que apresenta o bicho na narração: "Meet Juno, a …"
  const meet = w.m.elencoDoLeitor2411({ elenco: [fic('the retriever', { nucleo: 'retriever', tipo: 'animal', origem: 'modelo', canonica: 'the retriever, a golden retriever' })], pedido: null, roteiro: 'HOOK: [Pexels: dog at sea] Meet Juno, a golden retriever with a red bandana. Every evening, Juno walks to the lighthouse.', lidos: null, lugares: [] })
  if (meet.elenco[0]?.nome !== 'Juno' || !com(meet.elenco[0]?.canonica, 'golden retriever with a red bandana') || meet.mudancas[0]?.fonte !== 'roteiro') e.push('K14 "Meet Juno, a …" na narração ' + JSON.stringify(meet.elenco))
  // teto do elenco (PERSONAGEM_MAX_PERSONAGENS = 2)
  const tres = L({ roteiro: 'Elias Ward had kept the light. Mara Quinn caught the call. Tom Reed rowed the boat.', lidos: ['Elias Ward', 'Mara Quinn', 'Tom Reed'] })
  if (tres.elenco.length !== 2) e.push('K13 teto do elenco ' + nomes(tres.elenco))
  return e
}

// ═══ Interruptor e rota
function interruptorERota(w) {
  const e = []
  if (w.m.LEITOR_DO_ELENCO_2411 !== 'internal') e.push('I1 o interruptor devia nascer internal: ' + w.m.LEITOR_DO_ELENCO_2411)
  if (w.m.elencoEFigurinoLigado(w.m.LEITOR_DO_ELENCO_2411, 'cliente@qualquer.test') !== false) e.push('I2 cliente ligado')
  if (w.m.elencoEFigurinoLigado(w.m.LEITOR_DO_ELENCO_2411, CASA) !== true) e.push('I3 casa desligada')
  const rota = fs.readFileSync(ROTA, 'utf8')
  const usos = rota.match(/elencoDoLeitor2411\(/g) ?? []
  if (usos.length !== 1) e.push('I4 chamadas na rota: ' + usos.length)
  if (!/if \(elencoEFigurinoLigado\(LEITOR_DO_ELENCO_2411, user\.email\) && !qualidadeHerdada && personagem\.ativo && !estrelaFicha && !desenhoInfantil\.ativo && !tagFacelessPresente && classicVisualMode === 'character_story'\) \{ const leitor2411 = elencoDoLeitor2411\(/.test(rota)) e.push('I5 a guarda da rota mudou')
  const i = rota.indexOf('const leitor2411 = elencoDoLeitor2411(')
  const j = rota.indexOf('const personagemElenco: { elenco: FichaDePersonagem[]; casting: string; ms: number }')
  const k = rota.indexOf('if (protagonista1311?.sim && elencoDoPedido.length === 0) { const fichaViva1311')
  if (!(k > 0 && i > k && j > i)) e.push('I6 o bloco não está entre o sujeito vivo e o casting')
  return e
}

function roda(w) {
  const p = provas(w)
  return [...p.e, ...semRegressao(w), ...contraprovas(w), ...interruptorERota(w)]
}

console.log('KINEO-LEITOR-DO-ELENCO-2411 — código real')
const real = mundo()
const p = provas(real)
checa('(a) Elias Ward + Mara Quinn entram com barba, casaco, cabelo ruivo e suéter; sem pedido, só a oração do autor', !p.e.some((x) => /^A/.test(x)))
checa("(a') a cópula do pedido (\"Elias is an old…\") entra nas duas fichas", !p.e.some((x) => /^B/.test(x)))
checa('(b) Juno: nome, espécie e bandana na ficha; o 15 s não duplica o cachorro', !p.e.some((x) => /^C/.test(x)))
checa('Bolt e Ember: nada piora', !p.e.some((x) => /^D/.test(x)))
for (const x of p.e) console.log('    ' + x)
const reg = semRegressao(real)
checa('Cooper, Le Prince e Slocum: o elenco final é o MESMO com e sem o leitor', reg.length === 0)
for (const x of reg) console.log('    ' + x)
const cp = contraprovas(real)
checa('contraprovas (16): nome nu, figura, "This is", só no pedido, lugar, dois cães (2), verbo, árabe, cirílico, sem leitura, nome curto, identidade, erro, teto, "Meet Juno" na narração', cp.length === 0)
for (const x of cp) console.log('    ' + x)
const ir = interruptorERota(real)
checa('interruptor nasce internal; cliente desligado; UM bloco na rota entre o sujeito vivo e o casting', ir.length === 0)
for (const x of ir) console.log('    ' + x)
console.log('  relato:', JSON.stringify(p.relato))

// ═══ Mutantes: cada um tem de ficar vermelho
const MUTANTES = [
  ['M1 a leitura que respondeu sem o nome não barra', (t) => t.replace('if (d && leu !== false) {', 'if (d) {')],
  ['M2 nome sem sobrenome entra sem descrição', (t) => t.replace("leu === true && n.split(' ').length >= 2", "leu === true && n.split(' ').length >= 1")],
  ['M3 sobrenome entra sem a leitura', (t) => t.replace("} else if (!d && leu === true && n.split(' ')", "} else if (!d && leu !== false && n.split(' ')")],
  ['M4 dois nomes para a mesma ficha sem nome', (t) => t.replace('if (achados.length !== 1 || disputam.length !== 1', 'if (achados.length < 1 || disputam.length < 1')],
  ['M5 figura conhecida entra', (t) => t.replace('const ehFigura = (nome: string) => !!figuraConhecidaJuiz(nome) || !!figuraConhecida(nome)', 'const ehFigura = (nome: string) => false')],
  ['M6 o passo 1 invade o aposto da camada de 09/11', (t) => t.replace('if (pedido && (apostoDoPedido(pedido, f, nomesDoElenco()) || nomeadoNoPedido(pedido, f, nomesDoElenco()))) return f', '')],
  ['M7 palavra de função vira nome', (t) => t.replace('while (ws.length && NUNCA_NOME_2411.has(norm(ws[0]))) ws = ws.slice(1)', '')],
  ['M8 sem a cópula', (t) => t.replace('if (c) saida.push(', 'if (false) saida.push(')],
  ['M9 sem o sobrenome entre o nome e o aposto', (t) => t.replace("fim += (SOBRENOMES_RE.exec(texto.slice(fim, fim + 60))?.[0] ?? '').length", '')],
  ['M10 sem o try/catch', (t) => t.replace('} catch { return { elenco: base, mudancas: [] } }', '} finally { void 0 }')],
  ['M11 sem mudança devolve cópia', (t) => t.replace('if (!mudancas.length) return { elenco: base, mudancas: [] }', 'if (!mudancas.length) return { elenco: [...base], mudancas: [] }')],
  ['M12 sem o teto do elenco', (t) => t.replace('if (elenco.length >= PERSONAGEM_MAX_PERSONAGENS) break', '')],
  ['M13 a descrição não precisa passar na régua', (t) => t.replace('if (!trechoDescreve(t.trecho, t.artigo, { nome: n, nucleo: esperado.nucleo, tipo: esperado.tipo })) continue', '')],
  ['M4b sem a disputa na mesma frase', (t) => t.replace('if (achados.length !== 1 || disputam.length !== 1 || disputam[0] !== achados[0].n || usados.has(achados[0].n)) return f', 'if (achados.length !== 1 || usados.has(achados[0].n)) return f')],
  ['M4c o papel sem nome que ficou não barra o novo', (t) => t.replace('if (d && elenco.some((f) => !nomeProprio2411(f.nome) && temPalavra(d.trecho, f.nucleo))) continue', '')],
  ['M14 lugar da leitura vira gente', (t) => t.replace('!lugares.includes(norm(n)) && ', '')],
  ['M15 a ficha nova inventa a aparência (gerador da casa no lugar da oração)', (t) => t.replace('canonica: fichaDoAutor(n, oracao)', "canonica: `${n}, a man in their early thirties with short brown hair, wearing a blue jacket`")],
  ['M16 o interruptor nasce public', (t) => t.replace("export const LEITOR_DO_ELENCO_2411: ModoElencoEFigurino2411 = 'internal'", "export const LEITOR_DO_ELENCO_2411: ModoElencoEFigurino2411 = 'public'")],
  ['M17 a ficha do autor perde o que já tinha (troca em vez de acrescentar)', (t) => t.replace("if (f.origem === 'autor') { const [cabeca, ...resto] = f.canonica.split('; '); return { ...f, canonica: [cabeca, `${MARCA_DO_PEDIDO_2411} ${d.trecho}`, ...resto].join('; ') } }", '')],
  ['M18 escrita não latina passa', (t) => t.replace('if (!narracao || !escritaLatina(narracao)) return { elenco: base, mudancas: [] }', 'if (!narracao) return { elenco: base, mudancas: [] }')],
]
for (const [nome, mutar] of MUTANTES) {
  const fonte = fs.readFileSync(MOD, 'utf8').replace(/\r\n/g, '\n')
  if (mutar(fonte) === fonte) { checa(`${nome}: o mutante não se aplicou (texto mudou)`, false); continue }
  let vermelho
  try { vermelho = roda(mundo(mutar)).length > 0 } catch { vermelho = true }
  checa(`${nome} → vermelho`, vermelho)
}

console.log(`\n${falhas === 0 ? 'PASS' : 'FAIL'} — ${ok} ok, ${falhas} falha(s)`)
process.exit(falhas === 0 ? 0 : 1)
