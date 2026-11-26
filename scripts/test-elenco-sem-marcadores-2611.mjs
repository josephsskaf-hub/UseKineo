// C1 26/11. Simulador da fatia REAL da rota + módulos reais. Sem rede, SDK, chave, banco ou render.
// Todos os roteiros abaixo são inéditos, escritos para este guardião; só adultos. A leitura semântica é simulada e validada pelo parser real.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const MOD = 'lib/cinematic/elencoSemantico.ts', ROUTE = 'app/api/generate-video-cinematic/route.ts'
const BASE = '5eb546cb7'
const srcBase = new Map([MOD, ROUTE].map(p => [p, execFileSync('git', ['show', `${BASE}:${p}`], { encoding: 'utf8', maxBuffer: 4e6 }).replaceAll('\r\n', '\n')]))
const local = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n')
const json = x => JSON.parse(JSON.stringify(x))
let checks = 0
const equal = (a, b, label) => { assert.deepEqual(json(a), json(b), label); checks++ }
const yes = (a, label) => { assert.ok(a, label); checks++ }
const who = (role, gender = null, extra = {}) => ({ name: null, role_text: role, role_en: role, kind: 'human', species: 'human', species_en: 'human', gender_if_stated: gender, age_text: null, on_screen: true, ...extra })
const reading = (protagonist, ...supporting) => ({ protagonist, supporting, places_and_orgs: [] })
const story = 'An adult engineer checks a copper device. He turns the handle carefully. The adult nurse asks, "Does it work?" The engineer replies, "It is ready."'
const raw = reading(who('adult engineer', 'male'), who('adult nurse'))
const names = x => x.map(f => f.nome)
const world = (transform = (p, t) => t) => {
  const l = createOfflineLoader({ source: transform })
  return { s: l(MOD), a: l('lib/cinematic/personagemAjuste.ts'), c: l('lib/cinematic/conferenciaDoElenco.ts'), p: l('lib/scriptParser.ts'), f15: l('lib/filmes/filme15Elenco.ts'), sheet: l('lib/cinematic/folhaDePersonagem.ts'), route: transform(ROUTE, local(ROUTE)) }
}
const base = world((p, t) => srcBase.get(p) ?? t)
const current = world()

// O código das condições e da aplicação vem da rota, não de um espelho neste teste.
function routeSlice(w, text = story, simulated = raw, override = {}) {
  const parsed = w.p.parseUserScript(text)
  const lido = simulated === null ? null : w.s.lerElencoSemantico(typeof simulated === 'string' ? simulated : JSON.stringify(simulated), text)
  const scope = { prompt: text, qualidadeHerdada: null, personagem: { ativo: true }, hollywoodPath: false, estrelaFicha: null, desenhoInfantil: { ativo: false }, classicVisualMode: 'character_story', tagFacelessPresente: false, escritaLatina: () => true,
    pedidoSemantico: lido ? { elenco: lido } : null, elencoBase2411: w.a.elencoDoRoteiro(text, {}), kling4TrialCandidate: true, verbatim: true, parsedScript: parsed,
    aplicarElencoSemantico: w.s.aplicarElencoSemantico, conferenciaDaLeitura: w.c.conferenciaDaLeitura, elencoConferido: w.c.elencoConferido, ...override }
  const vars = ['usarElencoSemantico', 'conferirElenco', 'elencoSemantico', 'conferenciaElenco', 'baseConferida']
  const lines = vars.map(v => {
    const line = w.route.split('\n').find(x => x.trimStart().startsWith(`const ${v} =`))
    assert.ok(line, 'declaração real da rota: ' + v)
    return line
  }).join('\n')
  const js = ts.transpile(lines + '\nreturn { elencoSemantico, baseConferida };', { target: ts.ScriptTarget.ES2022 })
  const got = Function(...Object.keys(scope), js)(...Object.values(scope))
  return { parsed, lido, base: scope.elencoBase2411, ...got, final: got.elencoSemantico?.elenco ?? got.baseConferida.elenco }
}

async function suite(w) {
  const r = routeSlice(w)
  equal(r.parsed.segments.length, 0, 'sem marcadores no parser real')
  equal(names(r.base), ['the adult engineer'], 'reprodução da extração determinística antiga')
  equal(names(r.final), ['the adult engineer', 'the adult nurse'], 'C1 coadjuvante que só pergunta entra')
  equal(r.final[0].genero, 'man', 'C1 he documentado chega à ficha')
  yes(r.final[0].canonica.includes('pronoun from script: he'), 'evidência de gênero segue no prompt')
  yes(r.final.every(f => f.origem === 'autor'), 'as fichas literais não passam por casting inventado')
  equal(r.final[1].genero, null, 'profissão não implica gênero')
  equal(r.final[1].canonica, 'the adult nurse, adult nurse, exactly as the author wrote', 'não inventa aparência da segunda pessoa')
  const cast = await w.a.elencoComCastingAjuste(story, r.final, { apiKey: 'not-a-real-key', fetchImpl: () => { throw Error('rede proibida') } })
  equal(cast.casting, 'fixo', 'casting real dispensa chamada e não reescreve as duas fichas')
  equal(cast.elenco, r.final, 'fichas intactas depois do casting')
  const flip = JSON.stringify({ characters: r.final.map(f => ({ name: f.nome, description: 'An adult woman wearing a silver coat with long dark hair and round glasses in a bright workshop' })) })
  equal(w.a.lerCastingAjuste(flip, r.final, story), r.final, 'resposta de casting contrária não troca gênero literal')
  const f15 = w.f15.elencoDoFilme15({ elencoDoPedido: r.final, visuals: ['A copper device on a table.'], extrair: x => w.a.elencoDoRoteiro(x), completar: true })
  equal(f15.elenco, r.final, 'elenco sobrevive ao complemento de cenas sem gente')
  const shots = w.a.ajustarPromptsDoElenco({ prompts: ['An adult nurse asks a question beside a copper device.'], visuals: ['An adult nurse asks a question beside a copper device.'], falas: ['The adult nurse asks, "Does it work?"'], elenco: r.final })
  yes(shots.cenas[0].nomes.includes('the adult nurse'), 'segunda pessoa reconhecida no plano real')
  yes(shots.prompts[0].includes('adult nurse'), 'ficha/papel continua no prompt final de cena')
  const female = routeSlice(w, story.replace('He turns', 'She turns'), reading(who('adult engineer', 'female'), who('adult nurse')))
  equal(female.final[0].genero, 'woman', 'she documentado')
  const agedText = 'The adult engineer, 32 years old, checks a copper device. He turns the handle. The adult nurse asks, "Is it ready?"'
  const aged = routeSlice(w, agedText, reading(who('adult engineer', 'male', { age_text: '32 years old' }), who('adult nurse')))
  equal(aged.final[0].genero, 'man', 'idade literal não apaga o pronome documentado')
  yes(aged.final[0].canonica.includes('32 years old') && aged.final[0].canonica.includes('pronoun from script: he'), 'idade e gênero documentados juntos, sem traduzir a idade')
  const gendered = routeSlice(w, 'An adult man tightens a screw. An adult woman asks, "Is it safe?"', reading(who('adult man'), who('adult woman')))
  equal(gendered.final.map(f => f.genero), ['man', 'woman'], 'papéis de gênero explícitos permanecem')
  const unknown = routeSlice(w, story.replace('He turns the handle carefully. ', ''), raw)
  equal(unknown.final[0].genero, null, 'modelo sem prova textual não ganha gênero')
  const disagreement = routeSlice(w, story, reading(who('adult engineer', 'female'), who('adult nurse')))
  equal(disagreement.final[0].genero, null, 'modelo contradiz he: não inventa gênero')
  const foreignPronoun = routeSlice(w, 'The adult engineer greets the adult nurse. She checks a device. The adult engineer asks, "Ready?"', reading(who('adult engineer', 'female'), who('adult nurse', 'female')))
  yes(!foreignPronoun.final[0].canonica.includes('pronoun from script'), 'she depois de duas pessoas não prova gênero do primeiro')
  const quoted = routeSlice(w, 'The adult engineer says, "She fixed it." The adult nurse asks, "Who did?"', reading(who('adult engineer', 'female'), who('adult nurse')))
  equal(quoted.final[0].genero, null, 'pronome dentro da fala não define quem fala')
  const quotedNext = routeSlice(w, 'The adult engineer waits. "She made it." The adult nurse asks, "Ready?"', reading(who('adult engineer', 'female'), who('adult nurse')))
  equal(quotedNext.final[0].genero, null, 'fala citada na próxima frase não define gênero')
  const conflictText = 'The adult engineer checks a copper device. He turns a handle. The adult engineer waits. She turns a dial. The adult nurse asks, "Ready?"'
  const conflict = routeSlice(w, conflictText, raw)
  equal(conflict.final[0].genero, null, 'evidência textual conflitante não é resolvida por chute')
  const absent = routeSlice(w, story, reading(who('adult engineer', 'male'), who('adult nurse', null, { on_screen: false })))
  equal(names(absent.final), ['the adult engineer'], 'coadjuvante ausente continua fora')
  const hallucinated = routeSlice(w, story, reading(who('adult engineer', 'male'), who('adult pilot')))
  equal(names(hallucinated.final), ['the adult engineer'], 'papel inventado pela leitura continua recusado')
  const extraText = story + ' The adult teacher asks, "May I look?"'
  const extra = routeSlice(w, extraText, reading(who('adult engineer', 'male'), who('adult nurse'), who('adult teacher')))
  equal(names(extra.final), ['the adult engineer', 'the adult nurse'], 'teto existente de dois não aumenta')
  for (const bad of [null, '{bad json', { protagonist: null, supporting: [], places_and_orgs: [] }]) equal(routeSlice(w, story, bad).final, routeSlice(base, story, bad).final, 'leitura ausente/ruim/vazia preserva fallback')

  // Fora do caminho corrigido, executar a fatia da rota e comparar a base por valor, não só procurar strings.
  const off = [
    { kling4TrialCandidate: false }, { verbatim: false }, { parsedScript: { segments: [{}] } },
    { qualidadeHerdada: {} }, { personagem: { ativo: false } }, { hollywoodPath: true }, { estrelaFicha: {} },
    { desenhoInfantil: { ativo: true } }, { classicVisualMode: 'presenter' }, { classicVisualMode: 'faceless' },
  ]
  for (const flags of off) equal(routeSlice(w, story, raw, flags).final, routeSlice(base, story, raw, flags).final, 'fora do escopo byte a byte: ' + JSON.stringify(flags))
  equal(w.s.aplicarElencoSemantico(r.base, r.lido, story), base.s.aplicarElencoSemantico(r.base, r.lido, story), 'API padrão não muda')
  const namedText = 'Taren, an adult engineer, checks a copper device. He turns the handle. Sella, an adult nurse, asks, "Ready?"'
  const namedRaw = reading(who('adult engineer', 'male', { name: 'Taren' }), who('adult nurse', null, { name: 'Sella' }))
  equal(routeSlice(w, namedText, namedRaw).final, routeSlice(base, namedText, namedRaw).final, 'nomeados seguem comportamento existente')
  equal(w.s.aplicarElencoSemantico(r.base, r.lido, story, { semMarcadores: false }), base.s.aplicarElencoSemantico(r.base, r.lido, story), 'opt-in false idêntico')
  return { before: routeSlice(base).final, after: r.final, aged: aged.final, shots: shots.prompts }
}

const report = await suite(current)
const mainChecks = checks
const mutants = [
  ['não admite papel sem nome', MOD, "const semNome = op.semMarcadores === true", 'const semNome = false && op.semMarcadores === true'],
  ['não liga na rota', ROUTE, 'semMarcadores: kling4TrialCandidate && verbatim && parsedScript.segments.length === 0', 'semMarcadores: false'],
  ['alarga para filme pago', ROUTE, 'kling4TrialCandidate && verbatim && parsedScript.segments.length === 0', 'verbatim && parsedScript.segments.length === 0'],
  ['alarga para marcado', ROUTE, 'kling4TrialCandidate && verbatim && parsedScript.segments.length === 0', 'kling4TrialCandidate && verbatim'],
  ['alarga para IA', ROUTE, 'kling4TrialCandidate && verbatim && parsedScript.segments.length === 0', 'kling4TrialCandidate && parsedScript.segments.length === 0'],
  ['ignora pronome documentado', MOD, "const pronome = op.semMarcadores === true && !p.name", "const pronome = false && op.semMarcadores === true && !p.name"],
  ['gênero da janela de outra pessoa', MOD, 'genero: generoEscrito(p) ?? pronome?.genero ?? null', 'genero: generoEscrito(p) ?? pronome?.genero ?? generoConfirmado(p, texto)'],
  ['aceita apresentação com outra pessoa', MOD, "outros.some((s) => palavraNoTexto(f, s)) || ", ''],
  ['aceita pronome contrário ao leitor', MOD, 'achados.some((a) => a.genero !== p.gender)', 'false'],
  ['deixa casting reescrever', MOD, "origem: 'autor', protagonista, genero: generoDaFicha", "origem: 'deterministica', protagonista, genero: generoDaFicha"],
  ['perde segundo personagem', MOD, 'todos.filter((p) => !semFicha(p)).slice(0, PERSONAGEM_MAX_PERSONAGENS)', 'todos.filter((p) => !semFicha(p)).slice(0, 1)'],
  ['aceita papel inventado', MOD, 'else return null\n  } else if (roleBruto)', 'else { role_text = roleBruto; role = roleEn }\n  } else if (roleBruto)'],
]
for (const [label, file, from, to] of mutants) {
  assert.equal(local(file).split(from).length, 2, 'mutante com âncora única: ' + label)
  let failure = null
  try { await suite(world((p, t) => p === file ? t.replace(from, to) : t)) } catch (e) { failure = e }
  assert.ok(failure instanceof assert.AssertionError, 'mutante precisa morrer por asserção de comportamento: ' + label + ' => ' + failure)
  console.log('MUTANTE MORTO: ' + label + ' → ' + failure.message.split('\n')[0])
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ base: BASE, tipo: 'SIMULADOR OFFLINE — leitura semântica simulada; fatia de rota e módulos reais; sem render', mainChecks, checks, mutants: mutants.length, ...report }, null, 2))
console.log(`C1 sem_marcadores: OK — ${checks} asserções executadas, ${mutants.length}/${mutants.length} mutantes mortos; sem rede/render/gasto.`)
