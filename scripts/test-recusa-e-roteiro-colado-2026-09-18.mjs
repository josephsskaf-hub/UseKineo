// KINEO-RECUSA-ANTES-DE-COBRAR + KINEO-ROTEIRO-COLADO-NAO-ENGORDA (18/09, fundador: "Vai no 4 e no não engordar
// roteiro colado"). Sem rede, sem banco: decisões puras com mutante + as três portas (Studio, generate-script, analyze-idea).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, () => { throw new Error('sem imports') })
  return m.exports
}

console.log('1) recusa: decisão pura')
const sexSrc = rd('lib/contentPolicy/sexualContent.ts')
const S = roda(sexSrc)
// A forma do pedido de 18/09 (espanhol, político real nomeado), com os termos mais explícitos removidos e os que
// bastam para a decisão mantidos.
const bardella = 'Jordan Bardella deja el movil para ponerse la chaqueta, cuando muchisimos fans quieren arrancarle la camisa para ver y tocar los pectorales y los gluteos que estan desnudos mientras pone cara de placer intenso'
const d1 = S.decideSexualContentRefusal(bardella)
checa('pedido de 18/09 é recusado', d1.refuse === true && d1.reason === 'sexual_content_refused')
checa('… e reconhece a pessoa nomeada', d1.namedPerson === true)
checa('mensagem com pessoa real diz "never about real people" e "Nothing was charged"', /real people/.test(S.sexualContentRefusalMessage(true)) && /Nothing was charged/.test(S.sexualContentRefusalMessage(true)))
checa('inglês explícito é recusado', S.decideSexualContentRefusal('a naked couple in a hotel room having sex on camera').refuse === true)
checa('português explícito é recusado', S.decideSexualContentRefusal('um vídeo pornô de duas pessoas peladas na praia').refuse === true)
checa('hindi explícito é recusado', S.decideSexualContentRefusal('एक नग्न लड़की का अश्लील वीडियो').refuse === true)
checa('"the deadliest animals in the world" passa', S.decideSexualContentRefusal('The animal deadlier than sharks, wolves, and lions combined... fits in your hand.').refuse === false)
checa('"sex education for teens" passa (sem ato/nudez)', S.decideSexualContentRefusal('a short about sex education for teens and consent').refuse === false)
checa('"the sexual reproduction of plants" passa', S.decideSexualContentRefusal('how the sexual reproduction of plants works').refuse === false)
checa('romance sem explícito passa ("a couple kissing under the rain")', S.decideSexualContentRefusal('a couple kissing under the rain in Paris').refuse === false)
checa('texto vazio passa', S.decideSexualContentRefusal('').refuse === false)

console.log('2) mutante: sem a lista, o pedido de 18/09 passaria')
const mutSex = sexSrc.replace('const hit = EXPLICIT_PATTERNS.some((re) => re.test(t))', 'const hit = false')
checa('mutante aplicou', mutSex !== sexSrc)
checa('mutante é pego', roda(mutSex).decideSexualContentRefusal(bardella).refuse === false)

console.log('3) roteiro colado: decisão pura')
const pastSrc = rd('lib/pastedScript.ts')
const P = roda(pastSrc)
const hindiDialogo = 'रंग-बिरंगे कार्टून स्टाइल में एक भारतीय मोहल्ले का दृश्य।\nमोटू: "चुटकी, भीम घर पर है क्या?"\nचुटकी: "नहीं है।"\nपतलू: "चल चुटकी की दुग्गी बजा देते हैं।"'
const dh = P.detectPastedScript(hindiDialogo)
checa('diálogo em hindi de 18/09 (3 linhas "Nome: fala") é roteiro colado', dh.pasted === true && dh.reason === 'dialogue' && dh.dialogueLines === 3)
checa('piso vira 90% das palavras da pessoa, não o piso da duração', P.pastedScriptMinWords(dh.words) === Math.floor(dh.words * 0.9))
const prosa = Array.from({ length: 80 }, (_, i) => 'palavra' + i).join(' ')
checa('prosa de 80 palavras é roteiro colado', P.detectPastedScript(prosa).reason === 'long_prose')
checa('ideia de 1 linha NÃO é roteiro colado (ganha o roteiro completo)', P.detectPastedScript('the mystery of the Dyatlov Pass').reason === 'short_idea')
checa('rubricas [Pexels: …] não contam como fala', P.countSpokenWords('[Pexels: moon] Imagine a secret friendship') === 4)
checa('a regra ao escritor proíbe fatos, enrolação e frases novas', /Do NOT add facts, descriptions, filler/.test(P.PASTED_SCRIPT_RULE) && /within 10%/.test(P.PASTED_SCRIPT_RULE))

console.log('4) mutante do colado: sem o teto de palavras a prosa volta a ser "ideia"')
const mutP = pastSrc.replace('if (words >= PASTED_SCRIPT_MIN_WORDS)', 'if (false)')
checa('mutante aplicou', mutP !== pastSrc)
checa('mutante é pego', roda(mutP).detectPastedScript(prosa).pasted === false)

console.log('5) as três portas')
const gs = rd('app/api/generate-script/route.ts')
checa('generate-script recusa ANTES do OpenAI (a decisão vem antes de openai.chat.completions.create)', gs.includes('const sexual = decideSexualContentRefusal(topic)') && gs.indexOf('const sexual = decideSexualContentRefusal(topic)') < gs.indexOf('openai.chat.completions.create('))
checa('generate-script: roteiro colado troca o piso pela contagem da pessoa', gs.includes('const colado = detectPastedScript(topic)') && gs.includes('? pastedScriptMinWords(colado.words)'))
checa('generate-script: regra anti-engorda entra no system prompt só para roteiro colado', gs.includes("(colado.pasted ? `\\n\\n${PASTED_SCRIPT_RULE}` : '')"))
checa('generate-script: o retry de roteiro colado cobra o que foi CORTADO, nunca "encher os 60 s"', gs.includes("you dropped part of the user's own script"))
checa('generate-script devolve pastedScript na resposta (medição)', gs.includes('pastedScript: colado.pasted'))
const ai = rd('app/api/analyze-idea/route.ts')
checa('analyze-idea recusa antes do GPT com o mesmo motivo', ai.includes('const sexual = decideSexualContentRefusal(prompt)') && ai.indexOf('const sexual = decideSexualContentRefusal(prompt)') < ai.indexOf('openai.chat.completions.create(', ai.indexOf('export async function POST')))
const st = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('Studio recusa sem navegar (return antes do sessionStorage do go)', st.indexOf('if (sexualRefusal.refuse) {') > 0 && st.indexOf('if (sexualRefusal.refuse) {') < st.indexOf("sessionStorage.setItem('kineo:studio:go:v1'"))
checa('Studio mostra a mensagem e mede', st.includes('data-kineo="recusa-sexual"') && st.includes("trackEvent('sexual_content_refused_client'"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
