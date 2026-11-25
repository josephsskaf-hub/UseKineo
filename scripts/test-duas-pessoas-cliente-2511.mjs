// KINEO-DUAS-PESSOAS-CLIENTE-2511 — guardião da régua que abre a referência de DUAS pessoas fotorreais para o CLIENTE (lib/cinematic/referenciaUnica2411.ts).
// Executa a admissão REAL (admitirReferenciaUnica2411, o mesmo que a rota chama) com o elenco de cedd1250 (Elias e Mara, duas pessoas fotorreais, com
// folha). Sem rede, sem banco, sem fal. Regras provadas (cada uma com mutante que precisa morrer):
//   A. a chave: [CEO 25/11 noite] PUBLICADA em 'internal' (a régua deu volta na revisão): a chamada da rota (4 argumentos, a chave do módulo) dá ao cliente o
//      pedido de hoje ('mais_de_uma_folha'); a régua abaixo é MONTADA em 'public_humano' no teste (5º argumento), e os mutantes dela morrem por esse estado;
//      em 'internal' o cliente = o de ontem; a casa não muda com a chave;
//   B. liga: exatamente 2, os dois 'humano', os dois com folha https, fotorreal, nenhum menor → a MESMA referência da casa, com @Image2, cliente: true;
//   C. fica de fora: 3 ou mais; bicho ou criatura (nem chega à régua: 'nao_humano'); desenho, anime, 3D, desenho infantil, campo torto; menor (palavra
//      ou idade, inglês e português); protagonista pela imagem-chave; 2ª folha não https; nomes que se contêm; a mesma folha nos dois;
//   D. menor: adulto com idade, "for 5 years" e faixa 20-30 NÃO barram; criança, adolescente, "12-year-old", "aged 9", "10-15", "menina de 10 anos" barram;
//   E. a rota chama a admissão com 4 argumentos (a chave do módulo vale), e o claim grava só o código do motivo.
// O que NÃO roda aqui: o motor. A prova do motor é a do dono em 25/11 (~10 no Kling 4 com duas fichas, 10 no Gemini com duas fichas).
// Rodar: node scripts/test-duas-pessoas-cliente-2511.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const feature = 'lib/cinematic/referenciaUnica2411.ts'
const routeFile = 'app/api/generate-video-cinematic/route.ts'
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
const load = source => createOfflineLoader({ source, globals: { AbortSignal } })
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'
const F1 = 'Keep the face and outfit of @Image1.', F2 = 'Keep the face and outfit of @Image2.'
const FOLHA_E = 'https://example.org/offline/folha-elias.png', FOLHA_M = 'https://example.org/offline/folha-mara.png', FOLHA_T = 'https://example.org/offline/folha-tom.png'
const ELIAS = { nome: 'Elias', nucleo: 'Elias', tipo: 'humano', protagonista: true, canonica: 'Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; appearance anchors: 50-60, gray, short, clean-shaven, light skin, wearing button-up shirt, trousers; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing' }
const MARA = { nome: 'Mara', nucleo: 'Mara', tipo: 'humano', protagonista: false, canonica: 'Mara, caught a faint call on the radio, exactly as the author wrote; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing olive green suit; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing' }
const TOM = { nome: 'Tom', nucleo: 'Tom', tipo: 'humano', protagonista: false, canonica: 'Tom, a fisherman' }
const retrato = (elenco = [ELIAS, MARA], refs = [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: FOLHA_M }], stills = []) =>
  ({ version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: elenco, characterReferences: refs, approvedStills: stills })
const FOTO = { estilizado: false }

async function suite(change) {
  const source = (file, src) => change && file === change[0] ? src.split(change[1]).join(change[2]) : src
  const f = load(source)('@/' + feature)
  const route = source(routeFile, local(routeFile))
  // [CEO 25/11 noite] a régua montada em 'public_humano' (o estado que ela terá quando abrir); o estado PUBLICADO ('internal') é provado no bloco A
  const adm = (email, snap, filme = FOTO, duas = 'public_humano') => f.admitirReferenciaUnica2411('public_humano', email, snap, filme, duas)
  const motivo = (snap, filme = FOTO, duas) => { const a = adm(CLIENTE, snap, filme, duas); assert.ok(a && 'motivo' in a, 'esperava motivo'); return a.motivo }

  // A. a chave
  assert.equal(f.DUAS_PESSOAS_DO_CLIENTE_2511, 'internal', "publicado: 'internal'")
  igual(f.admitirReferenciaUnica2411('public_humano', CLIENTE, retrato(), FOTO), { motivo: 'mais_de_uma_folha' }, 'publicado (a chamada da rota, 4 argumentos): o cliente com duas folhas = o pedido de hoje')
  igual(f.admitirReferenciaUnica2411('public_humano', CASA, retrato(), FOTO), adm(CASA, retrato()), 'publicado: a casa igual à da régua montada')
  assert.equal(f.REFERENCIA_UNICA_2411, 'public_humano'); assert.equal(f.DUAS_REFERENCIAS_2411, 'internal', 'a chave da casa não muda')
  assert.equal(motivo(retrato(), FOTO, 'internal'), 'mais_de_uma_folha', "'internal': o cliente = o de ontem")
  const casa = adm(CASA, retrato())
  igual(adm(CASA, retrato(), FOTO, 'internal'), casa, 'a casa não muda com a chave')
  assert.ok(casa && casa.referencia && casa.referencia.segundo && !casa.cliente, 'a casa: o 2º, sem marca de cliente')

  // B. liga
  const c = adm(CLIENTE, retrato())
  assert.ok(c && 'referencia' in c && c.cliente === true, 'cliente com duas pessoas fotorreais com folha: liga, marcado cliente')
  igual(c.referencia, casa.referencia, 'cliente = a MESMA referência da casa')
  assert.equal(c.referencia.imageUrl, FOLHA_E); assert.equal(c.referencia.frase, F1)
  igual(c.referencia.segundo, { imageUrl: FOLHA_M, frase: F2, nomes: ['Mara'] }, 'o 2º: a folha da Mara, @Image2')
  igual(adm(CLIENTE, retrato([{ ...MARA }, { ...ELIAS }].map((x, i) => ({ ...x, protagonista: i === 0 })), [{ nome: 'Mara', url: FOLHA_M }, { nome: 'Elias', url: FOLHA_E }])).referencia.segundo.imageUrl, FOLHA_E, 'ordem do elenco: o protagonista é @Image1')
  { const d = f.admitirDuasPessoasDoCliente2511(retrato(), FOTO); assert.ok('referencia' in d); igual(d.referencia, casa.referencia) }

  // C. fica de fora (cliente)
  const fora = [
    ['3 pessoas, todas com folha', retrato([ELIAS, MARA, TOM], [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: FOLHA_M }, { nome: 'Tom', url: FOLHA_T }]), FOTO, 'duas_tres_ou_mais'],
    ['3 pessoas, a 3ª sem folha', retrato([ELIAS, MARA, TOM]), FOTO, 'duas_tres_ou_mais'],
    ['pessoa + bicho com folha', retrato([ELIAS, { ...MARA, tipo: 'animal' }]), FOTO, 'nao_humano'],
    ['pessoa + criatura com folha', retrato([ELIAS, { ...MARA, tipo: 'criatura' }]), FOTO, 'nao_humano'],
    ['criatura protagonista + pessoa', retrato([{ ...ELIAS, tipo: 'criatura' }, MARA]), FOTO, 'nao_humano'],
    ['desenho (estilizado)', retrato(), { estilizado: true }, 'duas_estilizado'],
    ['estilo ausente', retrato(), {}, 'duas_estilizado'],
    ['estilo torto', retrato(), { estilizado: 'false' }, 'duas_estilizado'],
    ['o protagonista pela imagem-chave', retrato([ELIAS, MARA], [{ nome: 'Mara', url: FOLHA_M }], [{ url: 'https://example.org/offline/k-elias.png', characterNames: ['Elias'] }]), FOTO, 'duas_sem_folha'],
    ['nomes que se contêm', retrato([{ ...ELIAS, nome: 'Ana Maria', nucleo: 'Ana Maria' }, { ...MARA, nome: 'Ana', nucleo: 'Ana' }], [{ nome: 'Ana Maria', url: FOLHA_E }, { nome: 'Ana', url: FOLHA_M }]), FOTO, 'duas_nomes'],
    ['a mesma folha nos dois', retrato([ELIAS, MARA], [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: FOLHA_E }]), FOTO, 'duas_nomes'],
  ]
  for (const [nome, snap, filme, m] of fora) assert.equal(motivo(snap, filme), m, nome)
  // não chega à régua: 2ª folha sem https (= uma folha só) e dois protagonistas
  assert.equal(motivo(retrato([ELIAS, MARA], [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: 'http://inseguro.example/m.png' }])), 'mais_de_um_humano', '2ª folha não https')
  assert.equal(motivo(retrato([ELIAS, { ...MARA, protagonista: true }])), 'mais_de_um', 'dois protagonistas')
  // a régua sozinha, os ramos que a guarda de uma pessoa não deixa chegar
  assert.equal(f.admitirDuasPessoasDoCliente2511(null, FOTO).motivo, 'duas_sem_folha')
  assert.equal(f.admitirDuasPessoasDoCliente2511(retrato([ELIAS, { ...MARA, protagonista: true }]), FOTO).motivo, 'duas_sem_folha', 'dois protagonistas na régua')
  assert.equal(f.admitirDuasPessoasDoCliente2511(retrato([ELIAS, { ...MARA, tipo: 'animal' }]), FOTO).motivo, 'duas_nao_humano')
  assert.equal(f.admitirDuasPessoasDoCliente2511(retrato([ELIAS, MARA], [{ nome: 'Elias', url: FOLHA_E }]), FOTO).motivo, 'duas_sem_folha', 'a 2ª sem folha na régua')

  // N2 [revisora] a 3ª pessoa sem canônica que o leitor do retrato descartou: a folha dela, ou a imagem-chave com o nome dela, fica no retrato
  assert.equal(motivo(retrato([ELIAS, MARA], [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mara', url: FOLHA_M }, { nome: 'Tom', url: FOLHA_T }])), 'duas_tres_ou_mais', 'N2: a folha de quem não está no elenco')
  assert.equal(motivo(retrato([ELIAS, MARA], undefined, [{ url: 'https://example.org/offline/k-tom.png', characterNames: ['Tom'] }])), 'duas_tres_ou_mais', 'N2: a imagem-chave de quem não está no elenco')

  // D. V1 [VOLTA da revisora] ADULTO PROVADO: sem sinal positivo de adulto = duas_menor (qualquer língua); a lista de menor é a segunda trava, em todo texto lido
  const MARA_SEM_IDADE = 'Mara, caught a faint call on the radio, exactly as the author wrote; long wavy brown hair'
  const SEM_SINAL = ['Mara, caught a faint call on the radio', 'Mara, una ragazzina con le trecce', 'Mara, a seventeen-ish dreamer', 'Mara, a jovem do rádio', 'Mara, wears a size 8-10 coat', MARA_SEM_IDADE]
  for (const canonica of SEM_SINAL) {
    assert.equal(f.adultoProvado2511({ nome: 'Mara', nucleo: 'Mara', canonica }), false, 'sem sinal de adulto: ' + canonica)
    assert.equal(motivo(retrato([ELIAS, { ...MARA, canonica }])), 'duas_menor', 'sem sinal de adulto barra: ' + canonica)
  }
  assert.equal(motivo(retrato([{ ...ELIAS, canonica: 'Elias, kept the old lighthouse alone' }, MARA])), 'duas_menor', 'o protagonista sem sinal de adulto também barra')
  const ADULTOS = ['Mara, a 30-year-old radio operator', 'Mara, 18 years old', 'appearance anchors: 20-30', 'Mara, uma mulher de 40 anos', 'Mara, a woman who worked the radio for five years',
    'Mara, a young woman with short dark hair', 'Mara, the radio officer', 'Mara, in her 30-35s', 'Mara, in her late thirties', 'Mara, aged 45', 'Mara, a médica do porto', 'Mara, a woman who is a cowboy fan with a kidney stone']
  for (const canonica of ADULTOS) {
    assert.equal(f.adultoProvado2511({ nome: 'Mara', nucleo: 'Mara', canonica }), true, 'adulto: ' + canonica)
    assert.ok('referencia' in adm(CLIENTE, retrato([ELIAS, { ...MARA, canonica }])), 'adulto liga: ' + canonica)
  }
  // [VOLTA 2 da revisora 52b12696, V3] o sinal de adulto de OUTRA pessoa no texto do personagem, ou um número que não é idade, não vale
  for (const canonica of ['Mia, tiny and wrapped in a soft blanket, carried by a woman', "Leo, small and gap-toothed, school uniform, holding his father's hand",
    'Priya, ek choti ladki, beside her grandmother', 'Sofia, 15 anni, next to her mother', 'Ece, bir çocuk, next to a woman', 'Tito, freckles and a missing front tooth, jersey numbers 23-24',
    'Nina, the daughter of a fisherman', 'Bo, holding the hand of an old man', 'Kai, quiet, beside his uncle']) {
    for (const c of [canonica, canonica.replace(/^[^,]+/, 'Mara')]) assert.equal(motivo(retrato([ELIAS, { ...MARA, canonica: c }])), 'duas_menor', 'V3 o adulto não é dele: ' + c) }
  // [V4] as formas de idade que a 2ª trava não lia
  for (const canonica of ['Theo, a young man of 17', 'Ana, 16, a woman of few words', 'Rina, a woman who looks about 15', 'Elle, a woman of seventeen with braids', 'Bea, a lady at her sweet sixteen party',
    'Lia, a woman, 16, quiet', 'Pia, a woman, ek choti ladki', 'Ece, a woman, bir çocuk', 'Lu, a woman, 15 lat', 'Ayse, a woman, 14 yaşında', 'Sara, a woman, 12 saal ki', 'Ola, a woman, dziewczynka']) {
    for (const c of [canonica, canonica.replace(/^[^,]+/, 'Mara')]) assert.equal(motivo(retrato([ELIAS, { ...MARA, canonica: c }])), 'duas_menor', 'V4 ' + c) }
  // o que continua entrando: o adulto que é DELE
  for (const [nome, canonica] of [['the woman', 'long hair, a green coat'], ['Mara', 'Mara, a woman of few words'], ['Mara', 'Mara, a mother of two, red coat'], ['Mara', 'Mara is a 35-year-old pilot'],
    ['Mara', 'Mara, in her early forties, beside her husband'], ['Mara', 'the keeper, appearance anchors: adult, short hair']]) {
    assert.ok('referencia' in adm(CLIENTE, retrato([ELIAS, { ...MARA, nome, nucleo: nome, canonica }], [{ nome: 'Elias', url: FOLHA_E }, { nome, url: FOLHA_M }])), 'V3 adulto dele entra: ' + nome + ' / ' + canonica) }
  // a segunda trava: palavra ou idade de menor, mesmo COM sinal de adulto, em nome, núcleo, canônica, roteiro ou pedido
  const MENORES = [
    ['girl', 'a girl'], ['boy', 'the boy next door'], ['teenaged', 'a teenaged skater'], ['in her teens', 'in her teens'], ['child', 'a child of the coast'], ['kid', 'the kid at the harbor'],
    ['12-year-old', 'a 12-year-old'], ['seventeen-year-old', 'a seventeen-year-old'], ['twelve years old', 'twelve years old'], ['aged 9', 'aged 9'], ['age 15', 'age 15'], ['13 y/o', 'a 13 y/o'], ['13yo', 'a 13yo'],
    ['faixa 10-15', 'anchors: 10-15'], ['faixa 6-9', 'anchors: 6-9'], ['underage', 'an underage runaway'], ['under 18', 'under 18'], ['juvenile', 'a juvenile'], ['youth', 'a youth'],
    ['high schooler', 'a high schooler'], ['middle school student', 'a middle school student'], ['8th grader', 'an 8th grader'], ['daughter', "Elias's daughter"],
    ['13 anos', 'Lia, 13 anos'], ['dezesseis anos', 'de dezesseis anos'], ['aluna', 'uma aluna'], ['garotinha', 'uma garotinha'], ['menininho', 'um menininho'], ['criancinha', 'uma criancinha'], ['ensino médio', 'estudante do ensino médio'],
    ['niña', 'una niña'], ['chica de 12 años', 'una chica de 12 años'], ['Mädchen', 'ein Mädchen'], ['Kind', 'ein Kind'], ['12-jährige', 'eine 12-jährige'], ['fille', 'une fille'], ['ado', 'un ado'], ['12 ans', 'de 12 ans'],
    ['larki', 'ek larki'], ['beti', 'Elias ki beti'],
  ]
  for (const [nome, trecho] of MENORES) {
    const canonica = 'Mara, a 30-year-old woman; ' + trecho
    assert.equal(f.textoDizMenor2511(trecho), true, 'menor: ' + nome)
    assert.equal(motivo(retrato([ELIAS, { ...MARA, canonica }])), 'duas_menor', 'menor com sinal de adulto ainda barra: ' + nome)
  }
  assert.equal(f.textoDizMenor2511('a kind man who stays for five years'), false, '"kind" (adjetivo) e "for five years" não são menor')
  assert.equal(motivo(retrato([ELIAS, { ...MARA, nome: 'Little Girl', nucleo: 'Little Girl' }], [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Little Girl', url: FOLHA_M }])), 'duas_menor', 'o nome também conta')
  assert.equal(motivo(retrato(), { estilizado: false, textoDoFilme: 'Mara, then twelve years old, runs to the pier.' }), 'duas_menor', 'a idade só no ROTEIRO barra')
  assert.equal(motivo(retrato(), { estilizado: false, textoDoFilme: 'Make a film about my daughter and me at the lighthouse.' }), 'duas_menor', 'o menor só no PEDIDO barra')
  assert.ok('referencia' in adm(CLIENTE, retrato(), { estilizado: false, textoDoFilme: 'Elias climbs the stairs. Mara listens to the radio. They watch the boat reach the harbor.' }), 'roteiro limpo: liga')
  assert.ok(adm(CASA, retrato([ELIAS, { ...MARA, canonica: 'Mara, a 12-year-old girl' }])).referencia.segundo, 'a casa não passa pela régua do cliente (como ontem)')

  // E. V2 [VOLTA da revisora] figura conhecida, pessoa real ou personagem de marca: nos DOIS, pelo nome e pela canônica; pessoa real também no roteiro e no pedido
  const ADULTA = 'a 40-year-old woman with short hair'
  for (const n of ['Barack Obama', 'Taylor Swift', 'Peter Parker', 'Lara Croft', 'Krishna', 'Bruce Wayne', 'Tony Stark']) {
    assert.equal(motivo(retrato([ELIAS, { ...MARA, nome: n, nucleo: n, canonica: ADULTA }], [{ nome: 'Elias', url: FOLHA_E }, { nome: n, url: FOLHA_M }])), 'duas_figura_conhecida', 'o 2º famoso: ' + n)
    assert.equal(motivo(retrato([{ ...ELIAS, nome: n, nucleo: n, canonica: 'a 50-year-old man' }, MARA], [{ nome: n, url: FOLHA_E }, { nome: 'Mara', url: FOLHA_M }])), 'duas_figura_conhecida', 'o protagonista famoso: ' + n)
  }
  assert.equal(motivo(retrato([ELIAS, { ...MARA, canonica: 'Mara, a 30-year-old woman who looks like Taylor Swift' }])), 'duas_figura_conhecida', 'pessoa real na canônica')
  assert.equal(motivo(retrato([ELIAS, { ...MARA, nome: 'Velin', nucleo: 'Velin', canonica: ADULTA }], [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Velin', url: FOLHA_M }]), { estilizado: false, textoDoFilme: 'Velin, a character from the game Moon Bridge, enters.' }), 'duas_figura_conhecida', 'o texto situa o nome numa obra')
  assert.equal(motivo(retrato(), { estilizado: false, textoDoFilme: 'Elias meets Barack Obama at the pier.' }), 'duas_figura_conhecida', 'pessoa real só no roteiro')
  assert.ok('referencia' in adm(CLIENTE, retrato([ELIAS, { ...MARA, nome: 'Mario Rossi', nucleo: 'Mario Rossi', canonica: ADULTA }], [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Mario Rossi', url: FOLHA_M }])), 'nome comum (Mario Rossi) liga')

  // F. a rota e o claim
  assert.ok(/admitirReferenciaUnica2411\(REFERENCIA_UNICA_2411, user\.email, [^\n]*\{ estilizado: [^\n]*\}\)/.test(route) && route.split('admitirReferenciaUnica2411(').length - 1 === 1, 'a rota chama a admissão uma vez')
  assert.ok(route.includes("textoDoFilme: [typeof prompt === 'string' ? prompt : '', typeof pedidoDoCliente === 'string' ? pedidoDoCliente : ''].join('\\n')"), 'a rota passa o roteiro e o pedido à régua')
  { const motivoRelato = f.relatoClienteSemReferencia2411({ referenciaUnicaRecusa: 'duas_figura_conhecida' })
    igual(motivoRelato, { versao: 'KINEO-REFERENCIA-UNICA-HUMANO-2411', motivo: 'duas_figura_conhecida' }, 'o claim: só a versão e o código') }
}

await suite(null)
const mutants = [
  [feature, "export const DUAS_PESSOAS_DO_CLIENTE_2511: ModoDuasPessoasDoCliente2511 = 'internal'", "export const DUAS_PESSOAS_DO_CLIENTE_2511: ModoDuasPessoasDoCliente2511 = 'public_humano'"], // [CEO 25/11 noite] a chave escapa para o cliente
  [feature, "if (motivo === 'mais_de_uma_folha' && duasDoCliente === 'public_humano') {", "if (motivo === 'mais_de_uma_folha') {"],
  [feature, "if (motivo === 'mais_de_uma_folha' && duasDoCliente === 'public_humano') {", "if ((motivo === 'mais_de_uma_folha' || motivo === 'nao_humano') && duasDoCliente === 'public_humano') {"],
  [feature, "return 'referencia' in duas ? { referencia: duas.referencia, cliente: true } : { motivo: duas.motivo }", "return 'referencia' in duas ? { referencia: duas.referencia } : { motivo: duas.motivo }"],
  [feature, "return 'referencia' in duas ? { referencia: duas.referencia, cliente: true } : { motivo: duas.motivo }", "return 'referencia' in duas ? { referencia: duas.referencia, cliente: true } : { motivo }"],
  [feature, "  if (snapshot.characters.length !== 2) return { motivo: 'duas_tres_ou_mais' }\n", ''],
  [feature, "  if (snapshot.characterReferences.some((r) => !doElenco.has(r.nome)) || snapshot.approvedStills.some((s) => s.characterNames.some((n) => !doElenco.has(n)))) return { motivo: 'duas_tres_ou_mais' } // N2\n", ''],
  [feature, "snapshot.characterReferences.some((r) => !doElenco.has(r.nome)) || snapshot.approvedStills.some(", "snapshot.approvedStills.some("],
  // (equivalente: sem a linha dos protagonistas, referenciaUnicaDoFilme dá null com dois protagonistas e a régua devolve o mesmo duas_sem_folha)
  [feature, "  if (!snapshot.characters.every((c) => c.tipo === 'humano')) return { motivo: 'duas_nao_humano' }\n", ''],
  [feature, "  if (!snapshot.characters.every((c) => snapshot.characterReferences.some((r) => r.nome === c.nome && https(r.url)))) return { motivo: 'duas_sem_folha' }\n", ''],
  [feature, "  if (filme.estilizado !== false) return { motivo: 'duas_estilizado' }", "  if (filme.estilizado === true) return { motivo: 'duas_estilizado' }"],
  // N3 [revisora] o FECHAMENTO: sem o adulto provado, a palavra desconhecida passa
  [feature, "  if (!snapshot.characters.every((c) => adultoProvado2511(c))) return { motivo: 'duas_menor' } // 5: sem o sinal de adulto = barra\n", ''],
  [feature, "if (!snapshot.characters.every((c) => adultoProvado2511(c)))", "if (!snapshot.characters.some((c) => adultoProvado2511(c)))"],
  [feature, "  return ADULTO_IDADE_PROPRIA_2511.test(oracao) || ADULTO_PALAVRA_2511.test(oracao)\n", "  return true\n"],
  // VOLTA 2 (V3 e V4)
  [feature, "  return corte ? oracao.slice(0, corte.index) : oracao\n", "  return oracao\n"], // a palavra de adulto de quem está ao lado volta a valer
  [feature, "  if (ancora && PRIMEIRA_ANCORA_ADULTA_2511.test(ancora[1].trim())) return true\n", "  if (/(?:1[89]|[2-9][0-9])\\s*-\\s*[0-9]{2}/.test(String(c.canonica))) return true\n"], // faixa solta vira adulto
  [feature, ".replace(IDADE_EM_DECADA_2511, ' aged 30 ')", ""], // "in her 30s" decepado pelo corte
  [feature, "  if ([c.nome, c.nucleo].some((n) => typeof n === 'string' && SO_ADULTO_NO_NOME_2511.test(n.trim())", "  if (false && [c.nome, c.nucleo].some((n) => typeof n === 'string' && SO_ADULTO_NO_NOME_2511.test(n.trim())"], // o núcleo \"the woman\"
  [feature, " || MENOR_IDADE_2511.test(t) || MENOR_FORMAS_2511.test(t)", " || MENOR_IDADE_2511.test(t)"],
  [feature, "const MENOR_FORMAS_2511 = new RegExp(SEM_LETRA_ANTES + 'of\\\\s+' + MAIS_NOVO_2511 + SEM_LETRA_DEPOIS +", "const MENOR_FORMAS_2511 = new RegExp('(?!)' +"],
  [feature, "(?:sweet\\\\s+sixteen|", "(?:"],
  [feature, "  '|(?:^|,)\\\\s*(?:1[0-7]|[0-9])\\\\s*(?=[,.;]|$)' +\n", ""],
  [feature, "(?:anni|anno|lat|lata|yaşında|yasinda|saal|jaar)", "(?:jaar)"],
  [feature, "(?:ladki|ladka|ladkiyan|ladke|çocuk\\\\p{L}*|", "(?:"],
  // (equivalente: idade de 10 a 17 escrita como sinal de adulto também é sinal de MENOR, e a segunda trava barra; a faixa fica como 1ª trava)
  [feature, "  if (snapshot.characters.some((c) => textoDizMenor2511(textoDoPersonagem2511(c))) || textoDizMenor2511(textoDoFilme)) return { motivo: 'duas_menor' }", "  if (snapshot.characters.some((c) => textoDizMenor2511(textoDoPersonagem2511(c)))) return { motivo: 'duas_menor' }"],
  [feature, "  if (snapshot.characters.some((c) => textoDizMenor2511(textoDoPersonagem2511(c))) || textoDizMenor2511(textoDoFilme)) return { motivo: 'duas_menor' }", "  if (textoDizMenor2511(textoDoFilme)) return { motivo: 'duas_menor' }"],
  [feature, "  [c.nome, c.nucleo, c.canonica].filter(", "  [c.canonica].filter("],
  [feature, "|teen\\\\p{L}*|", "|teen|"],
  [feature, "'crian\\\\p{L}*|menin\\\\p{L}*|garot\\\\p{L}*|", "'criança|menino|garota|"],
  [feature, "'(?:[\\\\s-]*(?:years?|yrs?)[\\\\s-]*(?:old|of\\\\s+age)|", "'(?:[\\\\s-]*(?:years?|yrs?)|"],
  [feature, "const MENOS_DE_18 = '(?:1[0-7]|[0-9]|' + POUCOS + ')'", "const MENOS_DE_18 = '(?:1[0-7]|[0-9])'"],
  [feature, "  return MENOR_PALAVRA_2511.test(t) || MENOR_ALEMAO_2511.test(t) || MENOR_IDADE_2511.test(t) || MENOR_FORMAS_2511.test(t)\n", "  return MENOR_PALAVRA_2511.test(t) || MENOR_IDADE_2511.test(t) || MENOR_FORMAS_2511.test(t)\n"], // sem o alemão (âncora da volta 2)
  [feature, "const MENOR_ALEMAO_2511 = /(?<![\\p{L}\\p{N}])(?:Kind|", "const MENOR_ALEMAO_2511 = /(?<![\\p{L}\\p{N}])(?:kind|"],
  // V2
  [feature, "  if (snapshot.characters.some((c) => figuraNaReferencia2511(c, textoDoFilme)) || mentionsRealPerson(textoDoFilme)) return { motivo: 'duas_figura_conhecida' } // 6\n", ''],
  [feature, "  if (snapshot.characters.some((c) => figuraNaReferencia2511(c, textoDoFilme)) || mentionsRealPerson(textoDoFilme))", "  if (snapshot.characters.some((c) => c.protagonista !== true && figuraNaReferencia2511(c, textoDoFilme)) || mentionsRealPerson(textoDoFilme))"],
  [feature, "figuraNaReferencia2511(c, textoDoFilme)) || mentionsRealPerson(textoDoFilme)) return", "figuraNaReferencia2511(c, textoDoFilme))) return"],
  [feature, "  if (nomes.some((n) => !!figuraConhecida(n) || !!figuraConhecidaJuiz(n) || mentionsRealPerson(n))) return true\n", "  if (nomes.some((n) => !!figuraConhecida(n) || !!figuraConhecidaJuiz(n))) return true\n"],
  [feature, "  if (nomes.some((n) => !!figuraConhecida(n) || !!figuraConhecidaJuiz(n) || mentionsRealPerson(n))) return true\n", "  if (nomes.some((n) => mentionsRealPerson(n))) return true\n"],
  [feature, "  if (typeof c.canonica === 'string' && mentionsRealPerson(c.canonica)) return true\n", ''],
  [feature, "  if ([...nomes, typeof c.canonica === 'string' ? c.canonica : '', textoDoFilme].some((t) => FICCAO_DE_MARCA_2511.test(t))) return true\n", ''],
  [feature, "  return nomes.some((n) => identidadeDeObra2511(n, textos))\n", "  return false\n"],
  [feature, "  if (!duas.segundo || duas.segundo.frase !== FRASE_SEGUNDA_PESSOA) return { motivo: 'duas_nomes' }\n", ''],
  [routeFile, "textoDoFilme: [typeof prompt === 'string' ? prompt : '', typeof pedidoDoCliente === 'string' ? pedidoDoCliente : ''].join('\\n')", "textoDoFilme: ''"],
]
let mortos = 0
for (const mutant of mutants) {
  assert.ok(local(mutant[0]).split(mutant[1]).length === 2, 'mutante não aplica (ou aplica mais de uma vez): ' + mutant[1])
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1] + ' → ' + mutant[2]) // N1 [revisora]: só AssertionError conta como morto
  mortos++
}
console.log(`PASS KINEO-DUAS-PESSOAS-CLIENTE-2511 (volta): chave PUBLICADA em 'internal' (o cliente com duas folhas = o pedido de hoje; a casa não muda); a régua montada em 'public_humano': cliente com exatamente 2 pessoas fotorreais com folha, ADULTO PROVADO nos dois (idade ≥ 18 ou palavra de adulto) e nenhum sinal de menor no elenco, no roteiro ou no pedido, sem figura conhecida, pessoa real ou personagem de marca = a referência da casa com @Image2; o resto = o pedido de hoje + o código; ${mortos}/${mutants.length} mutantes mortos.`)
