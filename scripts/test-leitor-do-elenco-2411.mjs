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
    const r = w.m.elencoDoLeitor2411({ elenco: elencoDoPedido, pedido, roteiro, lidos: leitura ? conf0?.nomes ?? [] : null, gente: leitura ? [leitura.protagonist, ...leitura.supporting].flatMap((p) => (p?.name && p.kind === 'human' ? [p.name] : [])) : null, lugares: leitura?.places_and_orgs ?? [] })
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
    // [volta 3 — VOLTA da revisora] a leitura semântica FALHANDO (~16% dos filmes): o Le Prince saía "Prince" + "Louis Le Prince", a mesma descrição
    const a0 = cadeia(w, c, { raw: null, leitor: false })
    const b0 = cadeia(w, c, { raw: null })
    if (JSON.stringify(a0.final) !== JSON.stringify(b0.final)) e.push(`M0 ${k} sem leitura: o elenco mudou ${JSON.stringify(nomes(a0.final))} → ${JSON.stringify(nomes(b0.final))}`)
    if (b0.mudancas.length !== 0) e.push(`M0 ${k} sem leitura: mudanças ${JSON.stringify(b0.mudancas)}`)
  }
  return e
}

// ═══ Contraprovas: quem NÃO entra / NÃO muda
function contraprovas(w) {
  const e = []
  const L = (o) => w.m.elencoDoLeitor2411({ elenco: [], pedido: undefined, roteiro: '', lidos: null, lugares: [], ...o })
  const fic = (nome, extra = {}) => ({ nome, nucleo: nome.split(' ').pop(), tipo: 'humano', canonica: `${nome}, a person`, origem: 'deterministica', protagonista: true, genero: null, ...extra })
  // nome só, sem descrição, lido pela leitura ("Meet Emma."): a regra de 01/11 (rodada 9) fica — sem ficha inventada
  const emma = L({ roteiro: 'Meet Emma. Emma opened the old door and stepped inside.', lidos: ['Emma'], gente: ['Emma'] })
  if (emma.elenco.length !== 0) e.push('K1 nome sem sobrenome e sem descrição entrou')
  // figura conhecida: regras de hoje (nada deduzido do nome)
  const han = L({ roteiro: 'Hanuman, a mighty monkey with a red cloth, leaped across the sea.', lidos: null })
  if (han.elenco.length !== 0) e.push('K2 figura conhecida entrou pelo leitor')
  const jesus = L({ roteiro: 'Jesus Christ, a bearded man in a white robe, walked by the sea.', pedido: 'Jesus Christ, a bearded man in a white robe, walks by the sea.', lidos: ['Jesus Christ'], gente: ['Jesus Christ'] })
  if (jesus.elenco.length !== 0) e.push('K2b figura conhecida (gente) entrou pelo leitor ' + nomes(jesus.elenco))
  // dois nomes da mesma função para o papel sem nome que ficou ("the keeper"): dúvida no passo 2 e nenhum entra como NOVO no passo 3
  const doisGuardas = w.m.elencoDoLeitor2411({ elenco: [fic('the keeper', { nucleo: 'keeper' })], pedido: 'Tom Hale is an old gray-bearded keeper in a navy coat. Sam Hale is a young red-haired keeper in a red coat.', roteiro: 'Tom Hale waved. Sam Hale ran to the light.', lidos: null, lugares: [] })
  if (nomes(doisGuardas.elenco).join() !== 'the keeper' || doisGuardas.mudancas.length) e.push('K6c dois guardas para "the keeper" ' + nomes(doisGuardas.elenco))
  // função no começo de frase não é nome
  const isto = L({ roteiro: 'This is a small brown dog with a collar. It waits by the gate.', lidos: null })
  if (isto.elenco.length !== 0) e.push('K3 "This is a …" virou personagem ' + nomes(isto.elenco))
  // o nome só no pedido, não na narração: nada
  const soPedido = L({ roteiro: 'The storm hit the coast at night. A small boat was lost.', pedido: 'Elias Ward, a gray-bearded lighthouse keeper in a navy coat, guides a boat.', lidos: null })
  if (soPedido.elenco.length !== 0) e.push('K4 nome que a narração não escreve entrou')
  // a leitura listou como lugar
  const lugar = L({ roteiro: 'Stone Harbor, a quiet fishing village with red roofs, woke up. Stone Harbor had kept its secret.', lidos: ['Stone Harbor'], gente: ['Stone Harbor'], lugares: ['Stone Harbor'] })
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
  const semLeitura = L({ roteiro: 'Elias Ward had kept the lighthouse alone for thirty years.', lidos: null, gente: ['Elias Ward'] })
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
  const cir = L({ roteiro: 'Илья Уорд хранил маяк тридцать лет. Илья Уорд зажёг огонь.', lidos: ['Илья Уорд'], gente: ['Илья Уорд'] })
  if (cir.elenco.length !== 0) e.push('K8b cirílico entrou ' + nomes(cir.elenco))
  // roteiro colado pelo cliente (sem pedido) que apresenta o bicho na narração: "Meet Juno, a …"
  const meet = w.m.elencoDoLeitor2411({ elenco: [fic('the retriever', { nucleo: 'retriever', tipo: 'animal', origem: 'modelo', canonica: 'the retriever, a golden retriever' })], pedido: null, roteiro: 'HOOK: [Pexels: dog at sea] Meet Juno, a golden retriever with a red bandana. Every evening, Juno walks to the lighthouse.', lidos: null, lugares: [] })
  if (meet.elenco[0]?.nome !== 'Juno' || !com(meet.elenco[0]?.canonica, 'golden retriever with a red bandana') || meet.mudancas[0]?.fonte !== 'roteiro') e.push('K14 "Meet Juno, a …" na narração ' + JSON.stringify(meet.elenco))
  // replay de cliente 24/11: a leitura leu "Sonic" (não "Metal Sonic"), e o artigo alemão "Ein Junge" (um menino) lido como nome
  const metal = L({ roteiro: 'Metal Sonic is altering the past for a mechanized future. Sonic teams up with a friend.', lidos: ['Sonic'], gente: [] })
  if (metal.elenco.length !== 0) e.push('K15 "Metal Sonic" entrou por sufixo ' + nomes(metal.elenco))
  const junge = L({ roteiro: 'Ein Junge fand eine goldene Tür mit einem Wunsch. Er sah Gold.', lidos: ['Ein Junge'], gente: ['Ein Junge'] })
  if (junge.elenco.length !== 0) e.push('K16 artigo alemão virou nome ' + nomes(junge.elenco))
  // a leitura leu o nome, mas como bicho/criatura (não gente): a via sem descrição não age
  const bicho = L({ roteiro: 'Captain Whiskers had guarded the ship for years.', lidos: ['Captain Whiskers'], gente: [] })
  if (bicho.elenco.length !== 0) e.push('K17 nome lido como bicho entrou como gente')
  // ═══ volta 3 (parecer da revisora, 24/11 noite)
  // a mesma pessoa com o nome pela metade (partícula): "Prince" no elenco, "Louis Le Prince, a bearded inventor…" no pedido — nada de 2ª ficha
  const prince = w.m.elencoDoLeitor2411({ elenco: [fic('Prince')], pedido: 'Louis Le Prince, a bearded inventor in an 1880s suit, boarded a train.', roteiro: 'In 1888, Louis Le Prince shot a film. Le Prince boarded a train.', lidos: null, lugares: [] })
  if (nomes(prince.elenco).join() !== 'Prince' || prince.mudancas.some((m) => m.acao === 'novo')) e.push('K18 Le Prince duplicado ' + nomes(prince.elenco))
  // a mesma descrição que uma ficha já leva, com outro nome: a mesma pessoa
  const mesmaDesc = w.m.elencoDoLeitor2411({ elenco: [fic('Lena', { origem: 'autor', canonica: 'Lena, exactly as the author wrote: "tall woman in a red coat"' })], pedido: 'Helen Park, a tall woman in a red coat, waits at the station.', roteiro: 'Helen Park waits at the station. Lena checks the clock.', lidos: null, lugares: [] })
  if (nomes(mesmaDesc.elenco).join() !== 'Lena') e.push('K19 a mesma descrição virou 2ª ficha ' + nomes(mesmaDesc.elenco))
  // nome com partícula é UM nome (era "Arc", "Gogh")
  const joana = L({ roteiro: 'Joan of Arc led the army to Orleans.', pedido: 'Joan of Arc, a young peasant girl in armor, leads an army.', lidos: null })
  if (joana.elenco.length && nomes(joana.elenco).join() !== 'Joan of Arc') e.push('K20 nome com partícula partido ' + nomes(joana.elenco))
  const gogh = L({ roteiro: 'Vincent van Gogh painted all night.', pedido: 'Vincent van Gogh, a red-bearded painter in a straw hat, paints sunflowers.', lidos: null })
  if (gogh.elenco.length && nomes(gogh.elenco).join() !== 'Vincent van Gogh') e.push('K21 van Gogh partido ' + nomes(gogh.elenco))
  if (!w.m.nomesDaNarracao2411('Joan of Arc led the army. Vincent van Gogh painted.').includes('Joan of Arc')) e.push('K22 nomesDaNarracao partiu "Joan of Arc"')
  // personagem de marca e empresa "giant" com uma menção só: o passo NOVO só cria gente
  for (const [rot, ped, rote] of [['Sonic', 'Sonic, a blue hedgehog in red sneakers, races through the city.', 'Sonic races through the city at dawn.'], ['Pikachu', 'Pikachu, a small yellow creature with red cheeks, sparks.', 'Pikachu sparks in the rain.'], ['Apple', 'Apple, a tech giant, unveils a phone.', 'Apple unveils a new phone today.']]) {
    const r = L({ roteiro: rote, pedido: ped, lidos: null })
    if (r.elenco.some(f => f.nome === rot) || (rot === 'Apple' && r.elenco.length)) e.push(`K23 ${rot} entrou ${JSON.stringify(r.elenco.map((f) => f.nome + '/' + f.tipo))}`)
  }
  const animalSemFicha = L({ roteiro: 'Sparky waited.', pedido: 'Sparky, a blue hedgehog in red sneakers, waited.' })
  if (animalSemFicha.elenco.length) e.push('K23b bicho desconhecido entrou sem ficha prévia')
  // a descrição que cita OUTRO do elenco não é desta pessoa (L8 da revisora)
  const outro = w.m.elencoDoLeitor2411({ elenco: [fic('Mara'), fic('Rex', { tipo: 'animal', nucleo: 'dog', protagonista: false })], pedido: 'Mara is a young woman in a Rex sweater.', roteiro: 'Mara walked Rex. Mara laughed.', lidos: null, lugares: [] })
  if (outro.elenco[0]?.canonica !== 'Mara, a person') e.push('K24 descrição que cita o Rex foi para a Mara ' + outro.elenco[0]?.canonica)
  // ideia × narração em conflito: vence o PEDIDO (L10 da revisora)
  const conflito = L({ roteiro: 'Elias Ward, a young man in a red jacket, kept the light. Elias Ward waited.', pedido: 'Elias Ward, a gray-bearded keeper in a navy coat, guides a boat.', lidos: null })
  if (!com(conflito.elenco[0]?.canonica, 'gray-bearded keeper in a navy coat') || conflito.mudancas[0]?.fonte !== 'pedido') e.push('K25 a narração venceu o pedido ' + conflito.elenco[0]?.canonica)
  // teto do elenco (PERSONAGEM_MAX_PERSONAGENS = 2)
  const tres = L({ roteiro: 'Elias Ward had kept the light. Mara Quinn caught the call. Tom Reed rowed the boat.', lidos: ['Elias Ward', 'Mara Quinn', 'Tom Reed'], gente: ['Elias Ward', 'Mara Quinn', 'Tom Reed'] })
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

// Casos do parecer de 24/11 e controles de desambiguação. Os textos são sintéticos.
function marcasEEmpresas(w) {
  const erros = []
  const check = (id, pass) => { if (!pass) erros.push(id) }
  const ler = (roteiro, pedido = roteiro, elenco = [], opcoes = {}) =>
    w.m.elencoDoLeitor2411({ elenco, pedido, roteiro, lidos: null, ...opcoes })
  const base = (nome, tipo, nucleo) => ({ nome, nucleo, tipo, canonica: nome, origem: 'deterministica', protagonista: true, genero: null })
  const identidades = [
    ['Sonic', 'blue hedgehog in red sneakers', 'hedgehog'],
    ['Pikachu', 'small yellow mouse with red cheeks', 'mouse'],
    ['Mickey', 'cheerful mouse in red shorts', 'mouse'],
    ['Garfield', 'lazy orange cat', 'cat'],
    ['Harry Potter', 'young boy with round glasses and a scar', 'boy'],
    ['Wednesday Addams', 'pale girl with black braids', 'girl'],
  ]
  for (const [nome, descricao, nucleo] of identidades) {
    const unico = nome + ', a ' + descricao + ', returned home.'
    for (const [origem, c] of [['roteiro', { ideia: '', roteiro: unico }], ['pedido', { ideia: unico, roteiro: nome + ' waited outside.' }]]) {
      const out = cadeia(w, c)
      const f = out.final[0]
      check('papel-' + nome + '-' + origem, out.final.length === 1 && f.nucleo === nucleo && !JSON.stringify(f).includes(nome) && f.canonica.includes(descricao) && f.origem === 'autor')
    }
  }
  for (const [nome,descricao] of [['Apple','tech giant'],['Amazon','online retail giant'],['Galeton','banking giant']]) {
    const c = { ideia: '', roteiro: nome + ', a ' + descricao + ', announced an acquisition.' }
    const out = cadeia(w, c)
    check('empresa-' + nome, out.final.length === 0)
    check('empresa-nome-' + nome, !ler(c.roteiro, c.roteiro, [base(nome,'criatura','giant')]).elenco.length)
  }
  for (const [nome, descricao] of [['Mario','short Italian plumber in a red cap'],['Elsa','young queen in a blue ice dress'],['Shrek','green ogre in a vest'],['Spider-Man','young hero in a red and blue suit'],['Lara Croft','young tomb raider in a green tank top'],['James Bond','British spy in a black tuxedo'],['Indiana Jones','archaeologist in a brown fedora'],['Sherlock Holmes','tall detective in a deerstalker hat']]) {
    const t = nome + ', a ' + descricao + ', left the building.'
    check('secundario-' + nome, !JSON.stringify(cadeia(w, { ideia:t, roteiro:t }).final).includes(nome))
  }
  const lic = ler('Velin Marlow waited outside.', 'Velin Marlow is a licensed mascot. Velin Marlow, a young boy with a red scarf, waits.')
  check('licenca', lic.elenco[0]?.nome === 'the boy' && lic.elenco[0]?.canonica.includes('young boy with a red scarf'))
  const romance = ler('Velin Marlow waited outside.', 'Velin Marlow from the novel Moon Bridge. Velin Marlow, a young boy in a yellow coat, waits.')
  check('obra-nomeada', romance.elenco[0]?.nome === 'the boy')
  const nu = ler('Harry Potter waited outside.', '', [base('Harry Potter','humano','Potter')], { lidos:['Harry Potter'], gente:['Harry Potter'] })
  check('sem-deduzir', nu.elenco.length === 0)
  const homonimo = ler('Henry Potter waited outside.', 'Henry Potter, a young boy with a red scarf, waits.')
  check('homonimo', homonimo.elenco[0]?.nome === 'Henry Potter')
  const semSobrenome = ler('Harry waited outside.', 'Harry Potter, a young boy with round glasses, waits.', [base('Harry','humano','Harry')])
  check('alias', semSobrenome.elenco.length === 1 && semSobrenome.elenco[0].nome === 'the boy')
  const semLeitura = ler('Harry Potter waited outside.', 'Harry Potter, a young boy with round glasses, waits.', [], { lidos:[] })
  check('leitura-negativa', !semLeitura.elenco.length)
  const misto = ler('Apple unveiled a phone. Brann lifted the bridge.', 'Apple, a tech giant, unveiled a phone. Brann, a towering giant with a green coat, lifted the bridge.', [base('the tech giant','criatura','giant'),base('the towering giant','criatura','giant')])
  check('gigante-fisico', misto.elenco.length === 1 && misto.elenco[0].nome === 'Brann')
  const filme = ler('Iris paused outside.', 'Iris, a young woman with a tech giant logo, waited outside.')
  check('empresa-no-acessorio', filme.elenco.every(f => f.nome !== 'empresa') && !filme.mudancas.some(m => m.acao === 'empresa'))
  const terceira = ler('Harry Potter waited.', 'Harry Potter, a young boy in a Sonic sweater, waited.')
  check('marca-no-acessorio', !terceira.elenco.some(f => f.canonica.includes('Sonic')))
  const voltou = ler('Sonic waited. Juno ran outside.', 'Sonic, a blue hedgehog, waited. Juno, a golden retriever with a red bandana, ran.', [base('the retriever','animal','retriever')])
  check('juno-com-marca', voltou.elenco.some(f => f.nome === 'Juno') && !voltou.elenco.some(f => f.nome === 'Sonic'))
  return erros
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
const errosMarca = marcasEEmpresas(real)
checa('papel original e empresa, cadeia completa e leitor ' + errosMarca.join(' | '), !errosMarca.length)
const cp = contraprovas(real)
checa('contraprovas (29): nome nu, figura (2), Le Prince, mesma descrição, Joan of Arc, van Gogh, marca e "giant" (3), descrição de outro, pedido × narração, "This is", só no pedido, lugar, dois cães (2), verbo, árabe, cirílico, sem leitura, nome curto, identidade, erro, teto, "Meet Juno" na narração, Metal Sonic, Ein Junge, bicho lido', cp.length === 0)
for (const x of cp) console.log('    ' + x)
const ir = interruptorERota(real)
checa('interruptor nasce internal; cliente desligado; UM bloco na rota entre o sujeito vivo e o casting', ir.length === 0)
for (const x of ir) console.log('    ' + x)
console.log('  relato:', JSON.stringify(p.relato))

// ═══ Mutantes: cada um tem de ficar vermelho
const MUTANTES = [
  ['V1 a mesma pessoa só por mesmoPersonagem (o VOLTA: Le Prince duplicado)', (t) => t.replace("export const mesmaPessoa2411 = (a: string, b: string): boolean => mesmoPersonagem(a, b) || ehFimDe(palavrasDaPessoa(a), palavrasDaPessoa(b)) || ehFimDe(palavrasDaPessoa(b), palavrasDaPessoa(a))", 'export const mesmaPessoa2411 = (a: string, b: string): boolean => mesmoPersonagem(a, b)')],
  ['V1b o passo 3 sem checar quem já está no elenco (L9 da revisora)', (t) => t.replace('if (usados.has(n) || elenco.some((f) => mesmaPessoa2411(f.nome, n))) continue', 'if (usados.has(n)) continue').replace('!ehFigura(n) && !elenco.some((f) => mesmaPessoa2411(f.nome, n)))', '!ehFigura(n))')],
  ['V2 sem a mesma descrição', (t) => t.replace('if (d && elenco.some((f) => f.canonica.includes(d.trecho))) continue', '')],
  ['V3 o passo NOVO cria bicho/criatura (marca, "giant")', (t) => t.replace("if (d && d.tipo !== 'humano') continue", '')],
  ['V4 sem partícula no nome', (t) => t.replace("(?: (?:${PARTICULA_2411} )?\\\\p{Lu}\\\\p{Ll}+(?:'s|’s)?){0,3}", "(?: \\\\p{Lu}\\\\p{Ll}+(?:'s|’s)?){0,2}")],
  ['V5 a descrição que cita outro do elenco passa (L8)', (t) => t.replace('if (outros.some((o) => o && !mesmoPersonagem(o, n) && /^\\p{Lu}/u.test(o) && temPalavra(t.trecho, o))) continue // cita outro do elenco', '')],
  ['V6 a narração antes do pedido (L10)', (t) => t.replace("const textos = [{ texto: pedido, fonte: 'pedido' as const }, { texto: narracao, fonte: 'roteiro' as const }]", "const textos = [{ texto: narracao, fonte: 'roteiro' as const }, { texto: pedido, fonte: 'pedido' as const }]")],
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
  ['M3c a via sem descrição aceita a leitura por sufixo/sem gente', (t) => t.replace(' && (e.gente ?? []).some((g) => norm(limpa(g)) === norm(n))', '')],
  ['M7b sem os artigos das outras línguas', (t) => t.replace('+ \'ein eine einen einem einer der die das den dem des le les une du el los las un una il lo gli uno um uma os as dos das do da del\'', '+ \'\'')],
  ['M14 lugar da leitura vira gente', (t) => t.replace('!lugares.includes(norm(n)) && ', '')],
  ['M15 a ficha nova inventa a aparência (gerador da casa no lugar da oração)', (t) => t.replace('canonica: fichaDoAutor(n, oracao)', "canonica: `${n}, a man in their early thirties with short brown hair, wearing a blue jacket`")],
  ['M16 o interruptor nasce public', (t) => t.replace("export const LEITOR_DO_ELENCO_2411: ModoElencoEFigurino2411 = 'internal'", "export const LEITOR_DO_ELENCO_2411: ModoElencoEFigurino2411 = 'public'")],
  ['M17 a ficha do autor perde o que já tinha (troca em vez de acrescentar)', (t) => t.replace("if (f.origem === 'autor') { const [cabeca, ...resto] = f.canonica.split('; '); return { ...f, canonica: [cabeca, `${MARCA_DO_PEDIDO_2411} ${d.trecho}`, ...resto].join('; ') } }", '')],
  ['M18 escrita não latina passa', (t) => t.replace('if (!narracao || !escritaLatina(narracao)) return { elenco: base, mudancas: [] }', 'if (!narracao) return { elenco: base, mudancas: [] }')],
]
const mutantesDaMarca = [
  ['sem reconhecimento de nome', 'if (NOME_DE_OBRA.has(norm(nome))) return true', '', 'papel-Harry Potter-pedido'],
  ['sem origem comercial explícita', 'ORIGEM_COMERCIAL.test(texto.slice(m.index! + m[0].length))', 'false', 'licenca'],
  ['não lê obra nomeada', 'OBRA_NOMEADA.test(texto.slice(m.index! + m[0].length))', 'false', 'obra-nomeada'],
  ['não reconhece nome abreviado', "?? obrasCitadas.find(obra => obra.split(' ').length > 1 && obra.split(' ').some(parte => norm(parte) === norm(n)))", '', 'alias'],
  ['ficha genérica conserva a descrição sorteada', "canonica: canonicaLiteral(f, d.trecho, null, null), origem: 'autor' as const", "canonica: f.canonica, origem: 'autor' as const", 'papel-Wednesday Addams-roteiro'],
  ['ficha comercial anônima volta', " || (f.tipo === 'criatura' && empresaGigante(f.nome))", '', 'empresa-Apple'],
  ['ficha comercial nomeada volta', 'empresas.includes(f.nome) ||', 'false ||', 'empresa-nome-Amazon'],
  ['leitura sem o nome passa', ' || (e.lidos && !e.lidos.some(l => mesmaPessoa2411(l, n)))', '', 'leitura-negativa'],
  ['marca copiada da roupa', 'if (d && ![...NOMES_DE_OBRA, ...obrasCitadas].some(m => temNome(d.trecho, m)))', 'if (d)', 'marca-no-acessorio'],
]
for (const [nome, antes, depois, esperado] of mutantesDaMarca) {
  const fonte = fs.readFileSync(MOD, 'utf8').replace(/\r\n/g, '\n')
  if (!fonte.includes(antes)) { checa(nome + ': âncora ausente', false); continue }
  const erros = marcasEEmpresas(mundo(t => t.replace(antes, depois)))
  checa(nome + ' → ' + esperado, erros.includes(esperado))
}

for (const [nome, mutar] of MUTANTES) {
  const fonte = fs.readFileSync(MOD, 'utf8').replace(/\r\n/g, '\n')
  if (mutar(fonte) === fonte) { checa(`${nome}: o mutante não se aplicou (texto mudou)`, false); continue }
  let vermelho
  try { vermelho = roda(mundo(mutar)).length > 0 } catch { vermelho = true }
  checa(`${nome} → vermelho`, vermelho)
}

console.log(`\n${falhas === 0 ? 'PASS' : 'FAIL'} — ${ok} ok, ${falhas} falha(s)`)
process.exit(falhas === 0 ? 0 : 1)
