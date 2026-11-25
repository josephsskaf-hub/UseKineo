// KINEO-DUAS-PESSOAS-CLIENTE-2511 — guardião da régua que abre a referência de DUAS pessoas fotorreais para o CLIENTE (lib/cinematic/referenciaUnica2411.ts).
// Executa a admissão REAL (admitirReferenciaUnica2411, o mesmo que a rota chama) com o elenco de cedd1250 (Elias e Mara, duas pessoas fotorreais, com
// folha). Sem rede, sem banco, sem fal. Regras provadas (cada uma com mutante que precisa morrer):
//   A. a chave: no commit 'public_humano'; em 'internal' o cliente = o de ontem ('mais_de_uma_folha', sem referência); a casa não muda com a chave;
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
  const adm = (email, snap, filme = FOTO, duas) => duas === undefined ? f.admitirReferenciaUnica2411('public_humano', email, snap, filme) : f.admitirReferenciaUnica2411('public_humano', email, snap, filme, duas)
  const motivo = (snap, filme = FOTO, duas) => { const a = adm(CLIENTE, snap, filme, duas); assert.ok(a && 'motivo' in a, 'esperava motivo'); return a.motivo }

  // A. a chave
  assert.equal(f.DUAS_PESSOAS_DO_CLIENTE_2511, 'public_humano', "no commit: 'public_humano'")
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

  // D. menor (cliente barra; a casa não passa por esta régua)
  const menores = [
    ['girl', 'Mara, a shy girl who loves the radio'], ['boy', 'Mara, the boy next door'], ['teenager', 'Mara, a teenager with long hair'], ['teen', 'a quiet teen'],
    ['child', 'Mara, a child of the coast'], ['kid', 'Mara, the kid at the harbor'], ['baby', 'a baby in a basket'], ['daughter', "Elias's daughter Mara"],
    ['12-year-old', 'Mara, a 12-year-old radio fan'], ['9 years old', 'Mara, 9 years old'], ['aged 9', 'Mara, aged 9'], ['faixa 10-15', 'appearance anchors: 10-15, long hair'], ['faixa 6-9', 'appearance anchors: 6-9, short hair'],
    ['16 yo', 'Mara, 16 yo'], ['criança', 'Mara, uma criança curiosa'], ['menina de 10 anos', 'Mara, menina de 10 anos'], ['com 8 anos', 'Mara, com 8 anos'], ['bebê', 'o bebê Mara'], ['adolescente', 'Mara, adolescente'],
  ]
  for (const [nome, canonica] of menores) {
    assert.equal(motivo(retrato([ELIAS, { ...MARA, canonica }])), 'duas_menor', 'menor: ' + nome)
    assert.equal(f.pareceMenor2511({ canonica }), true, 'pareceMenor: ' + nome)
  }
  assert.equal(motivo(retrato([{ ...ELIAS, canonica: 'Elias, a 14-year-old keeper' }, MARA])), 'duas_menor', 'o protagonista menor também barra')
  assert.equal(motivo(retrato([ELIAS, { ...MARA, nome: 'Little Girl', nucleo: 'Little Girl' }], [{ nome: 'Elias', url: FOLHA_E }, { nome: 'Little Girl', url: FOLHA_M }])), 'duas_menor', 'o nome também conta')
  for (const canonica of ['Mara, a 30-year-old radio operator', 'Mara, 18 years old', 'Mara, worked the radio for 5 years', 'appearance anchors: 20-30', 'Mara, uma mulher de 40 anos', 'Mara, há 5 anos no rádio', 'Mara, a cowboy fan with a kidney stone']) {
    assert.equal(f.pareceMenor2511({ canonica }), false, 'adulto: ' + canonica)
    assert.ok('referencia' in adm(CLIENTE, retrato([ELIAS, { ...MARA, canonica }])), 'adulto liga: ' + canonica)
  }
  assert.ok(adm(CASA, retrato([ELIAS, { ...MARA, canonica: 'Mara, a 12-year-old girl' }])).referencia.segundo, 'a casa não passa pela régua do cliente (como ontem)')

  // E. a rota e o claim
  assert.ok(/admitirReferenciaUnica2411\(REFERENCIA_UNICA_2411, user\.email, [^\n]*\{ estilizado: [^\n]*\}\)/.test(route) && route.split('admitirReferenciaUnica2411(').length - 1 === 1, 'a rota chama a admissão uma vez, com 4 argumentos (vale a chave do módulo)')
  { const motivoRelato = f.relatoClienteSemReferencia2411({ referenciaUnicaRecusa: 'duas_menor' })
    igual(motivoRelato, { versao: 'KINEO-REFERENCIA-UNICA-HUMANO-2411', motivo: 'duas_menor' }, 'o claim: só a versão e o código') }
}

await suite(null)
const mutants = [
  [feature, "export const DUAS_PESSOAS_DO_CLIENTE_2511: ModoDuasPessoasDoCliente2511 = 'public_humano'", "export const DUAS_PESSOAS_DO_CLIENTE_2511: ModoDuasPessoasDoCliente2511 = 'internal'"],
  [feature, "if (motivo === 'mais_de_uma_folha' && duasDoCliente === 'public_humano') {", "if (motivo === 'mais_de_uma_folha') {"],
  [feature, "if (motivo === 'mais_de_uma_folha' && duasDoCliente === 'public_humano') {", "if ((motivo === 'mais_de_uma_folha' || motivo === 'nao_humano') && duasDoCliente === 'public_humano') {"],
  [feature, "return 'referencia' in duas ? { referencia: duas.referencia, cliente: true } : { motivo: duas.motivo }", "return 'referencia' in duas ? { referencia: duas.referencia } : { motivo: duas.motivo }"],
  [feature, "return 'referencia' in duas ? { referencia: duas.referencia, cliente: true } : { motivo: duas.motivo }", "return 'referencia' in duas ? { referencia: duas.referencia, cliente: true } : { motivo }"],
  [feature, "  if (snapshot.characters.length !== 2) return { motivo: 'duas_tres_ou_mais' }\n", ''],
  // (equivalente: sem a linha dos protagonistas, referenciaUnicaDoFilme dá null com dois protagonistas e a régua devolve o mesmo duas_sem_folha)
  [feature, "  if (!snapshot.characters.every((c) => c.tipo === 'humano')) return { motivo: 'duas_nao_humano' }\n", ''],
  [feature, "  if (!snapshot.characters.every((c) => snapshot.characterReferences.some((r) => r.nome === c.nome && https(r.url)))) return { motivo: 'duas_sem_folha' }\n", ''],
  [feature, "  if (filme.estilizado !== false) return { motivo: 'duas_estilizado' }", "  if (filme.estilizado === true) return { motivo: 'duas_estilizado' }"],
  [feature, "  if (snapshot.characters.some((c) => pareceMenor2511(c))) return { motivo: 'duas_menor' }\n", ''],
  [feature, "  if (snapshot.characters.some((c) => pareceMenor2511(c))) return { motivo: 'duas_menor' }\n", "  if (snapshot.characters.some((c) => c.protagonista !== true && pareceMenor2511(c))) return { motivo: 'duas_menor' }\n"],
  [feature, "  const textos = [c.nome, c.nucleo, c.canonica]", "  const textos = [c.canonica]"],
  [feature, "|girl|girls|", "|"],
  [feature, "|criança|crianças|", "|"],
  [feature, "|teen|teens|teenager|teenagers|teenage|", "|"],
  [feature, "(?:(?:years?|yrs?)[\\s-]*old|", "(?:(?:years?|yrs?)|"],
  [feature, "|(?<![\\p{L}])aged?\\s+(?:1[0-7]|[0-9])(?![\\p{N}])|", "|"],
  [feature, "(?:1[0-7]|[0-9])\\s*(?:-|–|to)\\s*\\d{1,2}(?![\\p{N}])", "(?:1[0-7])\\s*(?:-|–|to)\\s*\\d{1,2}(?![\\p{N}])"],
  [feature, "(?<![\\p{L}])(?:de|com|tem)\\s+(?:1[0-7]|[0-9])\\s+anos(?![\\p{L}])", "(?<![\\p{L}])(?:tem)\\s+(?:1[0-7]|[0-9])\\s+anos(?![\\p{L}])"],
  [feature, "const MENOR_PALAVRA_2511 = /(?<![\\p{L}\\p{N}])", "const MENOR_PALAVRA_2511 = /(?:)"],
  // (equivalente: origem 'imagem_chave' e tipo fora de 'humano' já saem nas regras 2 e 3; a linha fica como segunda trava)
  [feature, "  if (!duas.segundo || duas.segundo.frase !== FRASE_SEGUNDA_PESSOA) return { motivo: 'duas_nomes' }\n", ''],
]
let mortos = 0
for (const mutant of mutants) {
  assert.ok(local(mutant[0]).split(mutant[1]).length === 2, 'mutante não aplica (ou aplica mais de uma vez): ' + mutant[1])
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError || err instanceof TypeError, 'SOBREVIVEU: ' + mutant[1] + ' → ' + mutant[2])
  mortos++
}
console.log(`PASS KINEO-DUAS-PESSOAS-CLIENTE-2511: chave 'public_humano' (em 'internal' o cliente = o de ontem; a casa não muda); cliente com exatamente 2 pessoas fotorreais, as duas com folha, nenhum menor = a referência da casa com @Image2; 3 ou mais, bicho, criatura, desenho, estilo torto, menor (palavra, idade e faixa, inglês e português), imagem-chave, nomes que se contêm e a mesma folha = o pedido de hoje + o código do motivo; ${mortos}/${mutants.length} mutantes mortos.`)
