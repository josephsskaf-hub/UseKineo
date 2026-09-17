// KINEO-FALA-X-IMAGEM-2026-09-16 — guardião: a cena mostra o que a fala diz (fundador 16/09: "os vídeos
// não estão coerentes, essa é a minha maior preocupação"). Prova: (a) o supervisor lê fala + plano por cena
// e só aceita reescrita válida; (b) a rota clássica o chama ANTES de qualquer gasto, só mexe no plano visual
// (nunca na narração), passa a reescrita pelo scrub de cenário e relata no evento e no dry-run; (c) o
// roteirista visual ganhou a regra na fonte.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
function load(file, env = {}) {
  const exports = {}
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: () => { throw new Error('import inesperado') }, process: { env }, console, Math, Date, Number, Set, Map, Array, JSON, AbortController, setTimeout, clearTimeout, fetch: undefined }, { filename: file })
  return exports
}

console.log('== (a) o supervisor ==')
const A = load('lib/cinematic/speechImageAlign.ts', { OPENAI_API_KEY: 'k' })
const cenas = [
  { voiceover: 'In 2024, more than 10 million educated young Indians entered the competitive job market.', shot: 'photorealistic. A macro close-up of a 19th-century Indian ink pot spilling on parchment' },
  { voiceover: 'Mumbai, the city of dreams, where young professionals struggle to find jobs that match their education.', shot: 'photorealistic. An aerial view of a bustling Indian city with modern skyscrapers, crowds of young professionals' },
]
const msgs = A.buildAlignMessages({ topic: 'young Indians and the job market', scenes: cenas })
checa('o modelo lê a regra ("sound off must still understand the line"), cada cena com fala + plano, e devolve keep|rewrite por cena', msgs[0].content.includes('sound off must still understand the spoken line') && msgs[0].content.includes('REWRITE the shot when it depicts something the line does not talk about') && msgs[1].content.includes('Scene 1\n  spoken: "In 2024, more than 10 million') && msgs[1].content.includes('shot: "photorealistic. A macro close-up of a 19th-century Indian ink pot') && msgs[0].content.includes('"action":"keep"|"rewrite"'))
checa('a narração nunca é objeto de reescrita (só "shot" volta)', !/rewrite the (spoken|narration|voiceover)/i.test(msgs[0].content) && msgs[0].content.includes('"shot":"<new shot when rewrite, else empty>"'))
const reply = JSON.stringify({ scenes: [
  { i: 1, action: 'rewrite', shot: 'photorealistic. A crowd of young Indian graduates in 2024 streaming out of a university gate into a busy city street, holding folders and phones, morning light', why: 'ink pot is not the job market' },
  { i: 2, action: 'keep', shot: '', why: 'already shows the line' },
  { i: 3, action: 'rewrite', shot: 'a shot for a scene that does not exist', why: 'x' },
  { i: 1, action: 'rewrite', shot: 'a second rewrite for scene 1 that must be ignored', why: 'dup' },
] })
const rw = A.parseAlignReply(reply, cenas)
checa('só a reescrita válida entra: cena 1 reescrita, cena 2 mantida, cena inexistente e duplicata ignoradas', rw.length === 1 && rw[0].index === 0 && rw[0].shot.startsWith('photorealistic. A crowd of young Indian graduates in 2024') && rw[0].before === cenas[0].shot && rw[0].why === 'ink pot is not the job market')
checa('reescrita vazia/curta/idêntica não vale; JSON inválido → nada', A.parseAlignReply(JSON.stringify({ scenes: [{ i: 1, action: 'rewrite', shot: 'too short', why: '' }, { i: 2, action: 'rewrite', shot: cenas[1].shot, why: '' }] }), cenas).length === 0 && A.parseAlignReply('not json', cenas).length === 0)
const fake = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: reply } }] }) })
const r = await A.alignShotsToSpeech({ topic: 't', scenes: cenas }, { fetchImpl: fake })
checa('caminho inteiro com resposta falsa: 1 reescrita, relato com exemplos (cena, porquê, antes/depois), modelo e ms', r && r.rewritten.length === 1 && r.relato.scenes === 2 && r.relato.rewritten === 1 && r.relato.kept === 1 && r.relato.examples[0].scene === 1 && r.relato.examples[0].why === 'ink pot is not the job market' && r.relato.model === 'gpt-4o-mini' && typeof r.relato.ms === 'number')
checa('falha aberta: HTTP não-2xx → null; cena sem fala → null; sem chave → null; interruptor off → null', (await A.alignShotsToSpeech({ topic: 't', scenes: cenas }, { fetchImpl: async () => ({ ok: false, json: async () => ({}) }) })) === null && (await A.alignShotsToSpeech({ topic: 't', scenes: [{ voiceover: '', shot: 'x' }] }, { fetchImpl: fake })) === null && (await load('lib/cinematic/speechImageAlign.ts', {}).alignShotsToSpeech({ topic: 't', scenes: cenas }, { fetchImpl: fake })) === null && load('lib/cinematic/speechImageAlign.ts', { OPENAI_API_KEY: 'k', KINEO_SPEECH_IMAGE_ALIGN: 'off' }).SPEECH_IMAGE_ALIGN_ENABLED === false)

console.log('== (b) a rota clássica ==')
const rt = rd('app/api/generate-video-cinematic/route.ts')
const iAlign = rt.indexOf('const alinhado = await alignShotsToSpeech({')
const iPrompts = rt.indexOf('const classicScenePrompts = scenes.map((scene, sceneIndex) => {')
const iDry = rt.indexOf("if (body.dry_run === true && isDryRunAccount(user.email)) {\n      const classicReport = classicDryRunReport({")
checa('o supervisor roda ANTES de montar os prompts clássicos, do dry-run e de qualquer still/POST pago', iAlign > 0 && iPrompts > iAlign && iDry > iPrompts && rt.indexOf('submitToFal(sPrompts[i]') !== -1)
checa('só o plano visual muda (aiPrompt) e passa pelo scrub de cenário; a narração (voiceover) não é tocada no bloco', rt.includes('scenes[c.index].aiPrompt = scrubInventedSetting(c.shot, historiaAlinhada).text') && !rt.slice(iAlign, iPrompts).includes('.voiceover ='))
checa('relato no evento scene_speech_alignment (versão, motor, cenas, reescritas, exemplos) e no dry-run (fala_x_imagem)', rt.includes('name: SPEECH_IMAGE_ALIGN_EVENT') && rt.includes('metadata: { version: SPEECH_IMAGE_ALIGN_VERSION, engine:') && rt.includes('fala_x_imagem: alinhamentoFalaImagem'))
checa('falha aberta na rota: try/catch com aviso, planos originais seguem', rt.slice(iAlign - 400, iPrompts).includes("console.warn('[fala-x-imagem] falhou, planos originais seguem:'"))

console.log('== (c) a regra na fonte ==')
const an = rd('app/api/analyze-idea/route.ts')
checa('o roteirista visual recebe a regra ANTES de "EXTREMELY cinematic": o plano mostra a própria fala, sem props/épocas inventadas', an.includes('EVERY visual_prompt SHOWS ITS OWN VOICEOVER LINE') && an.indexOf('EVERY visual_prompt SHOWS ITS OWN VOICEOVER LINE') < an.indexOf('- Visual prompts must be EXTREMELY cinematic and specific.') && an.includes('a line about a car crashing through a door shows the car crashing through the door, not the aftermath'))

console.log('== (d) fidelidade ao texto (a parte escrita) ==')
const gs = rd('app/api/generate-script/route.ts')
checa('o roteirista recebe a regra de fidelidade: história escrita é respeitada (mesmos personagens/eventos/tom), sem medo/drama/fatos inventados; ideia de uma linha é desenvolvida', gs.includes("FIDELITY TO THE CUSTOMER'S TEXT") && gs.includes('never add fear, horror, drama or a twist the text does not have') && gs.includes('A one-line topic is developed; a written story is respected.') && gs.indexOf("FIDELITY TO THE CUSTOMER'S TEXT") < gs.indexOf('- Every fact must be specific: names, numbers, dates, places'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
