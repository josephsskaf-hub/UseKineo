// KINEO-FAMOSO-SEM-REFERENCIA-2511 — guardião da admissão de UMA pessoa do cliente (lib/cinematic/referenciaUnica2411.ts, motivoClienteSemReferencia2411).
// O defeito (CEO 25/11): no caminho público de uma pessoa ('public_humano', que vai ao Gemini) a admissão não lia famoso nem pessoa real; o nome de uma pessoa
// real conhecida virava ficha e ia ao motor como referência. O conserto usa a MESMA régua da volta das duas pessoas (figuraNaReferencia2511 + mentionsRealPerson
// no roteiro e no pedido), sem lista nova: protagonista famoso, pessoa real, nome de obra ou personagem de marca = 'figura_conhecida' = sem referência.
// Prova, executando a admissão REAL duas vezes, a de agora e a de ANTES (o mesmo arquivo com o bloco novo tirado), sobre o mesmo corpus:
//   A. famoso entra = vermelho: cada famoso (pessoa real no nome, na canônica, no roteiro ou no pedido; tabela de figuras; obra; marca) era admitido antes e
//      agora volta { motivo: 'figura_conhecida' }, sem referência (logo sem Gemini: o Gemini só monta sobre o envio de referência);
//   B. casa muda = vermelho: a casa recebe EXATAMENTE o que recebia antes, famoso ou não, em 'internal' e 'public_humano';
//   C. cliente comum muda = vermelho: todo caso sem famoso devolve EXATAMENTE o de antes (admitido ou com o mesmo motivo), e um famoso já barrado por
//      outra guarda (estilizado, bicho, dois protagonistas, sem referência) guarda o motivo de antes;
//   D. as chaves e os outros modos: 'off' e 'internal' do cliente e 'public' iguais ao de antes; a rota chama a admissão uma vez, com o roteiro e o pedido.
// Rodar: node scripts/test-famoso-sem-referencia-2511.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const FEATURE = 'lib/cinematic/referenciaUnica2411.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'
// o bloco novo, como está no arquivo; tirá-lo = a admissão de ANTES
const BLOCO_INI = '  if (!referenciaUnicaDoFilme(snapshot)) return \'sem_referencia\'\n  // KINEO-FAMOSO-SEM-REFERENCIA-2511'
const ANTES = (src) => {
  const i = src.indexOf(BLOCO_INI), fim = src.indexOf('  return null\n}', i)
  assert.ok(i > 0 && fim > i, 'o bloco novo está no arquivo (âncora)')
  return src.slice(0, i) + '  return referenciaUnicaDoFilme(snapshot) ? null : \'sem_referencia\'\n}' + src.slice(fim + '  return null\n}'.length)
}

const FOLHA = (n) => `https://example.org/offline/folha-${n.toLowerCase().replace(/[^a-z]+/g, '-')}.png`
const pessoa = (nome, extra = {}) => ({ nome, nucleo: nome.split(' ').pop(), tipo: 'humano', protagonista: true, canonica: `${nome}, a 40-year-old man, exactly as the author wrote`, ...extra })
const retrato = (elenco, refs = elenco.filter((c) => c.protagonista).map((c) => ({ nome: c.nome, url: FOLHA(c.nome) })), stills = []) =>
  ({ version: 'film_quality_2910_v1', sourceGenerationId: 'offline', characters: elenco, characterReferences: refs, approvedStills: stills })
const FOTO = (texto = '') => ({ estilizado: false, textoDoFilme: texto })

// ── o corpus ──
const FAMOSOS = [ // cada um: admitido ANTES, barrado AGORA
  ['pessoa real (atual) no nome', retrato([pessoa('Barack Obama')]), FOTO()],
  ['pessoa real (atual) no nome, só o núcleo', retrato([pessoa('Taylor Swift', { nucleo: 'Swift' })]), FOTO()],
  ['pessoa real (história) no nome', retrato([pessoa('Napoleon Bonaparte')]), FOTO()],
  ['título + nome', retrato([pessoa('Captain Scott')]), FOTO()],
  ['pessoa real só na canônica', retrato([pessoa('Ivo', { canonica: 'Ivo, who looks exactly like Elon Musk' })]), FOTO()],
  ['pessoa real só no roteiro', retrato([pessoa('Ivo')]), FOTO('Ivo meets Barack Obama at the airport.')],
  ['pessoa real só no pedido', retrato([pessoa('Ivo')]), FOTO('a short film\nmake it about Cristiano Ronaldo')],
  ['personagem de marca no nome', retrato([pessoa('Peter Parker')]), FOTO()],
  ['personagem de marca só no roteiro', retrato([pessoa('Ivo')]), FOTO('Ivo dresses up as Spider-Man for the party.')],
  ['nome de obra', retrato([pessoa('Lara Croft')]), FOTO()],
  ['figura da tabela da casa (mito)', retrato([pessoa('Zeus')]), FOTO()],
]
const COMUNS = [ // nenhum famoso: o de antes, byte a byte
  ['nome comum', retrato([pessoa('Arno Vale')]), FOTO('Arno keeps the old lighthouse alone.')],
  ['papel sem nome', retrato([pessoa('the doctor', { nucleo: 'doctor' })]), FOTO('The doctor walks the empty hospital at night.')],
  ['nome comum com bicho coadjuvante sem folha', retrato([pessoa('Lena'), { nome: 'Pippo', nucleo: 'retriever', tipo: 'animal', protagonista: false, canonica: 'a golden retriever' }]), FOTO('Lena and Pippo run on the beach.')],
  ['"the captain radioed" (minúscula)', retrato([pessoa('Tomas')]), FOTO('the captain radioed a ship nearby')],
  ['texto vazio', retrato([pessoa('Rafael')]), FOTO()],
  ['protagonista pela imagem-chave', retrato([pessoa('Oskar')], [], [{ url: FOLHA('Oskar'), characterNames: ['Oskar'] }]), FOTO()],
  ['estilizado', retrato([pessoa('Arno')]), { estilizado: true, textoDoFilme: '' }],
  ['bicho', retrato([{ ...pessoa('Bento'), tipo: 'animal' }]), FOTO()],
  ['dois protagonistas', retrato([pessoa('Ana'), pessoa('Rui')]), FOTO()],
  ['sem referência', retrato([pessoa('Rafael')], []), FOTO()],
  ['dois humanos, uma folha', retrato([pessoa('Arno'), { ...pessoa('Nadia'), protagonista: false }]), FOTO()],
  ['duas folhas (régua das duas pessoas)', retrato([pessoa('Arno'), { ...pessoa('Nadia'), protagonista: false }], [{ nome: 'Arno', url: FOLHA('Arno') }, { nome: 'Nadia', url: FOLHA('Nadia') }]), FOTO()],
  ['retrato torto', null, FOTO()],
  ['campo estilizado ausente', retrato([pessoa('Rafael')]), {}],
]
const BARRADOS_POR_OUTRA = [ // famoso que já caía em outra guarda: o motivo de antes
  ['famoso estilizado', retrato([pessoa('Barack Obama')]), { estilizado: true, textoDoFilme: '' }],
  ['famoso bicho', retrato([{ ...pessoa('Zeus'), tipo: 'criatura' }]), FOTO()],
  ['famoso com dois protagonistas', retrato([pessoa('Barack Obama'), pessoa('Rui')]), FOTO()],
  ['famoso sem referência', retrato([pessoa('Barack Obama')], []), FOTO()],
]

async function suite(change) {
  const muda = (rel, t) => (change && rel === change[0] ? t.split(change[1]).join(change[2]) : t)
  const agora = createOfflineLoader({ source: (rel, t) => muda(rel, t), globals: { AbortSignal } })('@/' + FEATURE)
  const antes = createOfflineLoader({ source: (rel, t) => (rel === FEATURE ? ANTES(t) : t), globals: { AbortSignal } })('@/' + FEATURE)
  const adm = (m, modo, email, s, f) => m.admitirReferenciaUnica2411(modo, email, s, f)

  // A. famoso entra = vermelho
  for (const [rot, s, f] of FAMOSOS) {
    const a = adm(antes, 'public_humano', CLIENTE, s, f), n = adm(agora, 'public_humano', CLIENTE, s, f)
    assert.ok(a && 'referencia' in a, `A ${rot}: o caso precisa ser admitido ANTES (senão não prova nada)`)
    igual(n, { motivo: 'figura_conhecida' }, `A ${rot}: agora sem referência, motivo 'figura_conhecida'`)
    assert.equal(agora.motivoClienteSemReferencia2411(s, f), 'figura_conhecida', `A ${rot}: a guarda`)
  }
  // B. casa muda = vermelho
  for (const [rot, s, f] of [...FAMOSOS, ...COMUNS, ...BARRADOS_POR_OUTRA]) for (const modo of ['internal', 'public_humano']) {
    igual(adm(agora, modo, CASA, s, f), adm(antes, modo, CASA, s, f), `B casa (${modo}) · ${rot}: o mesmo de antes`)
  }
  { const [, s, f] = FAMOSOS[0]; assert.ok('referencia' in adm(agora, 'public_humano', CASA, s, f), 'B a casa continua com a referência no famoso (a casa não passa pela guarda)') }
  // C. cliente comum muda = vermelho
  for (const [rot, s, f] of [...COMUNS, ...BARRADOS_POR_OUTRA]) {
    igual(adm(agora, 'public_humano', CLIENTE, s, f), adm(antes, 'public_humano', CLIENTE, s, f), `C cliente · ${rot}: o mesmo de antes`)
  }
  assert.ok('referencia' in adm(agora, 'public_humano', CLIENTE, COMUNS[0][1], COMUNS[0][2]), 'C o cliente comum continua admitido (a referência, logo o Gemini)')
  // D. os outros modos
  for (const [rot, s, f] of [...FAMOSOS, ...COMUNS]) for (const modo of ['off', 'internal', 'public']) {
    igual(adm(agora, modo, CLIENTE, s, f), adm(antes, modo, CLIENTE, s, f), `D cliente em '${modo}' · ${rot}: o mesmo de antes`)
  }
  assert.equal(agora.REFERENCIA_UNICA_2411, 'public_humano', 'D a chave não muda neste commit')
  const rota = muda(ROTA, local(ROTA))
  assert.equal(rota.split('admitirReferenciaUnica2411(').length - 1, 1, 'D a rota chama a admissão uma vez')
  assert.ok(/admitirReferenciaUnica2411\(REFERENCIA_UNICA_2411, user\.email, [^\n]*textoDoFilme: \[typeof prompt === 'string' \? prompt : '', typeof pedidoDoCliente === 'string' \? pedidoDoCliente : ''\]\.join\('\\n'\)/.test(rota), 'D a rota passa o roteiro e o pedido (textoDoFilme)')
}

await suite(null)
const MUT = [
  ['tirar a guarda', FEATURE, "  if (mentionsRealPerson(textoDoFilme) || snapshot.characters.some((c) => c.protagonista === true && figuraNaReferencia2511(c, textoDoFilme))) return 'figura_conhecida'\n", ''],
  ['só o roteiro (sem o protagonista)', FEATURE, "mentionsRealPerson(textoDoFilme) || snapshot.characters.some((c) => c.protagonista === true && figuraNaReferencia2511(c, textoDoFilme))) return 'figura_conhecida'", "mentionsRealPerson(textoDoFilme)) return 'figura_conhecida'"],
  ['só o protagonista (sem o roteiro e o pedido)', FEATURE, "if (mentionsRealPerson(textoDoFilme) || snapshot.characters.some((c) => c.protagonista === true", "if (snapshot.characters.some((c) => c.protagonista === true"],
  ['o texto do filme ignorado', FEATURE, "const textoDoFilme = typeof filme.textoDoFilme === 'string' ? filme.textoDoFilme : ''\n  if (mentionsRealPerson(textoDoFilme) || snapshot", "const textoDoFilme = ''\n  if (mentionsRealPerson(textoDoFilme) || snapshot"],
  ['a guarda antes do estilizado', FEATURE, "  if (filme.estilizado !== false) return 'estilizado' // na dúvida (campo ausente ou torto), estilizado\n  if (!referenciaUnicaDoFilme(snapshot)) return 'sem_referencia'\n", "  if (snapshot.characters.some((c) => figuraNaReferencia2511(c, ''))) return 'figura_conhecida'\n  if (filme.estilizado !== false) return 'estilizado' // na dúvida (campo ausente ou torto), estilizado\n  if (!referenciaUnicaDoFilme(snapshot)) return 'sem_referencia'\n"],
  ['todo cliente barrado', FEATURE, "  return null\n}\nexport type AdmissaoReferenciaUnica2411", "  return 'figura_conhecida'\n}\nexport type AdmissaoReferenciaUnica2411"],
  ['a casa passa pela guarda', FEATURE, "if (referenciaUnicaLigada(modo, email)) { const r = referenciaUnicaDoFilme(snapshot);", "if (referenciaUnicaLigada(modo, email) && !(snapshot?.characters ?? []).some((c) => figuraNaReferencia2511(c, filme.textoDoFilme ?? ''))) { const r = referenciaUnicaDoFilme(snapshot);"],
  ['a casa barrada em tudo', FEATURE, "if (referenciaUnicaLigada(modo, email)) { const r = referenciaUnicaDoFilme(snapshot);", "if (referenciaUnicaLigada(modo, email)) return { motivo: 'figura_conhecida' }; if (false) { const r = referenciaUnicaDoFilme(snapshot);"],
  ['sem a tabela de figuras', FEATURE, "if (nomes.some((n) => !!figuraConhecida(n) || !!figuraConhecidaJuiz(n) || mentionsRealPerson(n))) return true", "if (nomes.some((n) => mentionsRealPerson(n))) return true"],
  ['sem a marca', FEATURE, "if ([...nomes, typeof c.canonica === 'string' ? c.canonica : '', textoDoFilme].some((t) => FICCAO_DE_MARCA_2511.test(t))) return true", ''],
  ['sem a canônica', FEATURE, "  if (typeof c.canonica === 'string' && mentionsRealPerson(c.canonica)) return true\n", ''],
  ['a rota sem o texto do filme', ROTA, "textoDoFilme: [typeof prompt === 'string' ? prompt : '', typeof pedidoDoCliente === 'string' ? pedidoDoCliente : ''].join('\\n')", "textoDoFilme: ''"],
]
let mortos = 0
for (const [nome, ...m] of MUT) {
  assert.equal(local(m[0]).split(m[1]).length, 2, 'mutante não aplica: ' + nome)
  await assert.rejects(suite(m), (e) => e instanceof assert.AssertionError, 'SOBREVIVEU: ' + nome)
  mortos++
}
console.log(`PASS KINEO-FAMOSO-SEM-REFERENCIA-2511: ${FAMOSOS.length} famosos (nome, núcleo, canônica, roteiro, pedido, tabela, obra, marca) admitidos antes e barrados agora com 'figura_conhecida'; ` +
  `a casa igual à de antes em ${FAMOSOS.length + COMUNS.length + BARRADOS_POR_OUTRA.length} casos × 2 chaves; ${COMUNS.length} clientes comuns e ${BARRADOS_POR_OUTRA.length} famosos já barrados por outra guarda iguais aos de antes; ` +
  `'off', 'internal' e 'public' iguais; a rota passa o roteiro e o pedido; ${mortos}/${MUT.length} mutantes mortos (só AssertionError).`)
