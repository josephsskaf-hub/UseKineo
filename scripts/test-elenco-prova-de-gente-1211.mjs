// KINEO-ELENCO-PROVA-DE-GENTE-1211 — guardião: a ficha só dá corpo de gente a quem o texto prova que é gente; a linha de origem diz a pessoa
// que a própria ficha descreve. Casos reais do banco (12/11): "Argentinosaurus, a person in their thirties with curly black hair" (e9418905),
// "Houston, a person in their thirties" (03/11), "the man …; origin: a South African woman" (657ad797).
// Prova: (1) interruptor desligado = byte a byte o de antes (folha, camada de época, linha de origem); (2) ligado: bicho/lugar sem prova saem,
// gente com prova (pronome, papel, título, primeiro nome da tabela, pronome em pt/ru…) fica; (3) a rota liga só pela conta da casa e passa a
// chave a TODOS os construtores; (4) mutantes reprovam. Sem rede. Rodar: npx tsx scripts/test-elenco-prova-de-gente-1211.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { elencoDoRoteiro } from '../lib/cinematic/personagemAjuste.ts'
import { personagensNomeados, generoDoNome } from '../lib/cinematic/elencoEpoca.ts'
import { linhaDeOrigem, elencoComOrigem } from '../lib/cinematic/origemDoElenco.ts'
import { ELENCO_PROVA_DE_GENTE, provaDeGenteLigada, generoDoNomeDaFolha } from '../lib/cinematic/provaDeGente.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }
const J = (x) => JSON.stringify(x)
const LIGA = { generoDoNome }

const SEM_PROVA = {
  dino: 'Who knew that dinosaurs could weigh more than 10 buses? Argentinosaurus was 35 meters long — a huge giant. Argentinosaurus weighed up to 100 tonnes, like 10 school buses together.',
  nessie: 'Nessie rose from the dark loch. Nessie was 12 meters long and swam past three fishing boats.',
  houston: 'Houston received the call at 3 a.m. Houston told the crew to stay calm.',
}
const COM_PROVA = {
  luca: 'Luca moved into a new building. After three days he discovered the neighbour did not exist. Luca heard three knocks every night.',
  leo: 'Leo was playing hide and seek with his favorite letters in the sunny garden. Leo covered his eyes, counting, one, two, three!',
  rudo: 'Rudo, the farmer, walked to the river. Rudo found a golden fish.',
  amna: 'Amna found a magical star in the garden. Amna smiled at the star.',
  gabrielPt: 'Esse é Gabriel. Gabriel acorda cedo e trabalha no supermercado. Ele mora com a família e Gabriel quer dar uma vida melhor a eles.',
  ivanRu: 'Иван открыл дверь. Он увидел старый дом. Иван вошёл внутрь.',
  drSmith: 'Dr. Smith opened the lab. Smith looked at the sample.',
}
const nomesFolha = (t, pg) => elencoDoRoteiro(t, pg).map((f) => f.nome)
const nomesEpoca = (t, pg) => personagensNomeados(t, null, false, pg).map((p) => p.nome)

console.log('── (1) desligado = o de antes ──')
for (const [k, t] of Object.entries({ ...SEM_PROVA, ...COM_PROVA })) {
  ok(J(elencoDoRoteiro(t)) === J(elencoDoRoteiro(t, false)), `(1) folha ${k}: sem argumento ≡ false`)
  ok(J(personagensNomeados(t)) === J(personagensNomeados(t, null, false, false)), `(1) época ${k}: sem argumento ≡ false`)
}
const homem = { nome: 'the man', canonica: 'the man, a man in their early thirties with curly hair, wearing a grey wool coat', genero: 'woman' }
ok(linhaDeOrigem(homem, 'South African') === linhaDeOrigem(homem, 'South African', undefined) && /woman/.test(linhaDeOrigem(homem, 'South African')), '(1) origem sem opção: a mesma linha de antes (o defeito continua para o cliente até virar a chave)')

console.log('── (2) ligado ──')
ok(!nomesFolha(SEM_PROVA.dino, false).length === false, '(2) base: hoje a folha faz do Argentinosaurus um gigante de roupa de pano')
for (const [k, t] of Object.entries(SEM_PROVA)) {
  ok(nomesFolha(t, LIGA).length === 0, `(2) folha ${k}: sem prova de gente → fora do elenco (${J(nomesFolha(t, false))} → [])`)
  ok(nomesEpoca(t, true).every((n) => !/Argentinosaurus|Nessie|Houston/.test(n)), `(2) época ${k}: sem "a person in their thirties"`)
}
ok(personagensNomeados(SEM_PROVA.houston, null, false, false).some((p) => /Houston, a person/.test(p.descricao)), '(2) base: hoje a época faz "Houston, a person in their thirties"')
ok(elencoDoRoteiro(SEM_PROVA.dino, LIGA).every((f) => !/garments|weathered face/.test(f.canonica)), '(2) "a huge giant" do argentinossauro não vira gigante de rosto e roupa')
const TARTARUGA = 'HOOK: [Pexels: giant tortoise on grass] Jonathan hatched around 1832. MICRO REWARD: [Pexels: tortoise eating lettuce] Jonathan is now over 190 years old and still eats fresh fruit.'
ok(elencoDoRoteiro(TARTARUGA, false).some((f) => /towering giant/.test(f.canonica)), '(2) base: hoje "giant tortoise" na etiqueta faz do Jonathan um gigante de roupa de pano')
ok(elencoDoRoteiro(TARTARUGA, LIGA).every((f) => !/towering giant|a person/.test(f.canonica)), '(2) ligado: "giant tortoise" é adjetivo — nem gigante de roupa, nem pessoa')
const GIGANTE_VERBO = 'The giant eggs him on. The giant laughs at the tiny knight.'
ok(J(elencoDoRoteiro(GIGANTE_VERBO, LIGA)) === J(elencoDoRoteiro(GIGANTE_VERBO, false)), '(2) "The giant eggs him on" (verbo) continua o ser gigante, como hoje')
for (const [k, t] of Object.entries(COM_PROVA)) {
  ok(J(nomesFolha(t, LIGA)) === J(nomesFolha(t, false)), `(2) folha ${k}: com prova de gente fica igual (${J(nomesFolha(t, false))})`)
  ok(J(nomesEpoca(t, true)) === J(nomesEpoca(t, false)), `(2) época ${k}: com prova de gente fica igual`)
}
ok(/a South African man/.test(linhaDeOrigem(homem, 'South African', { nucleoVence: true })), '(2) origem: "the man, a man…" diz "a South African man" mesmo com o gênero guardado errado')
ok(/girl/.test(linhaDeOrigem({ nome: 'Amna', canonica: 'Amna, a girl about nine years old', genero: 'woman' }, 'Pakistani', { nucleoVence: true })), '(2) origem: criança continua criança')
ok(/person/.test(linhaDeOrigem({ nome: 'X', canonica: 'X, a person in their thirties', genero: null }, 'Kenyan', { nucleoVence: true })), '(2) origem: ficha sem substantivo e sem gênero continua "person" (nada inventado)')
const filme = { texto: '', usarGeral: true, leitura: { personagens: [], geral: { origem: 'South African', evidencia: 'Johannesburg' } } }
const el = [{ nome: 'the woman', nucleo: 'woman', tipo: 'humano', canonica: 'the woman, a woman in her early thirties', origem: 'deterministica', protagonista: true, genero: 'woman' }, { nome: 'the man', nucleo: 'man', tipo: 'humano', canonica: 'the man, a man in their early thirties', origem: 'deterministica', protagonista: false, genero: 'woman' }]
const r = elencoComOrigem(el, filme, { nucleoVence: true })
ok(/origin: a South African man/.test(r.elenco[1].canonica) && /origin: a South African woman/.test(r.elenco[0].canonica), '(2) elencoComOrigem: cada um com a SUA pessoa (nada copiado de um para o outro)')

console.log('── (3) interruptor e rota ──')
ok(ELENCO_PROVA_DE_GENTE === 'internal', `(3) padrão 'internal' (é '${ELENCO_PROVA_DE_GENTE}')`)
ok(!provaDeGenteLigada('internal', false) && provaDeGenteLigada('internal', true) && provaDeGenteLigada('all', false), '(3) internal = só a casa; all = todos')
ok(generoDoNomeDaFolha === generoDoNome, '(3) a tabela injetada na folha é a da camada de época')
const rota = readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8').replace(/\r\n/g, '\n')
ok(/const provaDeGente = provaDeGenteLigada\(ELENCO_PROVA_DE_GENTE, isInternalEmail\(user\.email\)\)/.test(rota), '(3) a rota liga pela conta da casa (isInternalEmail), o mesmo teste dos outros interruptores')
ok(/elencoDeterministico\(prompt, provaDeGente \? \{ generoDoNome: generoDoNomeDaFolha \} : false\)/.test(rota) && /elencoDoRoteiro\(prompt, provaDeGente \? \{ generoDoNome: generoDoNomeDaFolha \} : false\)/.test(rota), '(3) folha: decisão de formato e elenco do pedido recebem a chave')
ok((rota.match(/\.\.\.\(provaDeGente \? \{ provaDeGente: true \} : \{\}\)/g) ?? []).length === 2, '(3) as 2 chamadas de prepararQualidadeDoFilme (hollywood e clássico) recebem a chave só quando ligada')
ok((rota.match(/provaDeGente \? \{ nucleoVence: true \} : undefined/g) ?? []).length === 3, '(3) as 3 linhas de origem (cenas, pedido, ajuste) recebem nucleoVence só quando ligada')

console.log('── (4) mutantes ──')
const muta = async (arq, de, para, teste, rotulo) => {
  const src = readFileSync(arq, 'utf8')
  const mut = src.replace(de, para)
  if (mut === src) { ok(false, `(4) mutante ${rotulo}: trecho ausente`); return }
  const tmp = resolve(arq.replace(/\.ts$/, `.mutante-1211-${Math.random().toString(36).slice(2, 7)}.ts`))
  writeFileSync(tmp, mut)
  try { const M = await import(pathToFileURL(tmp).href); ok(!teste(M), `(4) mutante ${rotulo} reprova`) } finally { unlinkSync(tmp) }
}
await muta('lib/cinematic/elencoEpoca.ts', "if (provaDeGente && tipo === 'humano' && c.titulos.length === 0 && !c.aposto && d.genero === null) return []", '', (M) => M.personagensNomeados(SEM_PROVA.houston, null, false, true).length === 0, 'época sem a regra')
await muta('lib/cinematic/folhaDePersonagem.ts', "if (provaDeGente && tipo === 'humano' && !temProvaDeGente(", "if (false && !temProvaDeGente(", (M) => M.elencoDeterministico(SEM_PROVA.nessie, LIGA).length === 0, 'folha sem a regra')
await muta('lib/cinematic/folhaDePersonagem.ts', '|| (!!generoDoNome && generoDoNome(nome) !== null)', '', (M) => M.elencoDeterministico(COM_PROVA.amna, LIGA).length === 1, 'folha sem a tabela de nomes (Amna sairia)')

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
