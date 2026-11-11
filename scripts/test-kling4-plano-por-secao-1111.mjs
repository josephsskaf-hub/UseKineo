// KINEO-K4-PLANO-POR-SECAO-1111 — o filme grátis do Kling 4 pede UM plano por seção do roteiro (atrás de interruptor 'internal').
// Trava (Node puro, sem rede/banco/fal): (a) o caso REAL de Pompeia (claim de 11/11 07:33 UTC, 4 seções → 3 cenas) executado na
// lib real + buildKling4TrialInput real: 4 planos, 15 s, cada plano ≥ 3 s, a 2ª metade da cena fundida sem imagem-chave, a pista
// da seção na frente; (b) nada a dividir / fala reescrita / seção que não bate / mais de 5 planos → null (os 3 planos de sempre);
// (c) interruptor nasce 'internal'; (d) a rota usa a MESMA entrada no envio pago, no juiz do plano e no claim, e a reserva/scene_plan
// continuam em 3 cenas. Mutantes em memória no fim.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import('typescript')).default
const dir = mkdtempSync(join(tmpdir(), 'k4s-'))
let seq = 0
const mod = async (src, links = {}) => {
  let o = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const [a, b] of Object.entries(links)) o = o.split(`'${a}'`).join(`'${b}'`)
  const f = join(dir, `m${seq++}.mjs`); writeFileSync(f, o); return pathToFileURL(f).href
}
const budget = await mod(read('lib/kling4TrialBudget.ts'))
const lang = await mod(read('lib/textLanguage.ts'))
const K = await import(await mod(read('lib/kling4Trial.ts'), { '@/lib/kling4TrialBudget': budget, '@/lib/textLanguage': lang }))
const SRC = { lib: read('lib/kling4QuatroPlanos.ts'), route: read('app/api/generate-video-cinematic/route.ts') }

// O caso real (claim de 6db4c2ca): as 4 seções do pedido, as 3 falas e imagens das cenas, os 3 prompts do Kling 4.
const SECOES = ['Арену в Помпеях, 79 год н.э., заполняют зрители.', 'Везувий извергается, столб пепла взмывает в небо.', 'Огненные снаряды летят, поражая арену.', 'Камни обрушиваются, арена рушится, зрители бегут в панике.'].map((v) => ({ voiceover: v, pexelsQuery: '' }))
const FALAS = [SECOES[0].voiceover, `${SECOES[1].voiceover} ${SECOES[2].voiceover}`, SECOES[3].voiceover]
const STILLS = ['https://x/s1.jpg', 'https://x/s2.jpg', 'https://x/s3.jpg']
const PROMPTS = ['Photoreal film. A wide shot of the Pompeii arena filled with spectators.', 'Photoreal film. A view of Mount Vesuvius erupting, ash and smoke rising.', 'Photoreal film. Crumbling stones fall as spectators flee.']

async function problems(S) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let Q
  try { Q = await import(await mod(S.lib)) } catch (e) { return [`lib não executa: ${e.message}`] }
  no(Q.KLING4_PLANO_POR_SECAO !== 'public', 'interruptor: não está public (aberto pela CEO em 11/11 depois do teste pago)')
  no(Q.planoPorSecaoLigado('internal', true) !== true || Q.planoPorSecaoLigado('internal', false) !== false || Q.planoPorSecaoLigado('off', true) !== false || Q.planoPorSecaoLigado('public', false) !== true, 'interruptor: regra errada')

  const q = Q.planosPorSecao({ prompts: PROMPTS, stills: STILLS, falas: FALAS, secoes: SECOES })
  if (!q) return [...p, 'Pompeia: o caso real não virou 4 planos']
  no(JSON.stringify(q.grupos) !== '[[0],[1,2],[3]]', `Pompeia: grupos errados ${JSON.stringify(q.grupos)}`)
  no(q.prompts.length !== 4 || q.falas.join(' ') !== FALAS.join(' '), 'Pompeia: os planos não cobrem a fala inteira, na ordem')
  no(q.prompts[0] !== PROMPTS[0] || q.prompts[3] !== PROMPTS[2], 'Pompeia: cena que não foi fundida mudou de prompt')
  no(!q.prompts[1].includes('Shot focus: Везувий извергается, столб пепла взмывает в небо. ') || !q.prompts[2].includes('Shot focus: Огненные снаряды летят, поражая арену. ') || q.prompts[2].includes(PROMPTS[1]), `Pompeia: a pista/ação da seção não está no plano, ou a metade repete a cena inteira (${q.prompts[2].slice(0, 90)})`) // KINEO-K4-PLANO-DA-SECAO-1111: a metade nasce da SUA seção (promptDaSecao)
  no(q.stills.join('|') !== 'https://x/s1.jpg|https://x/s2.jpg||https://x/s3.jpg', `Pompeia: imagens-chave fora do lugar (${q.stills.join('|')})`)
  const input = K.buildKling4TrialInput(q.prompts, q.stills, { voiceovers: q.falas, wordsPerSecond: 2.09 })
  const d = input.input.multi_prompt.map((m) => m.duration)
  no(d.length !== 4 || d.reduce((a, b) => a + b, 0) !== 15 || d.some((x) => x < 3), `Pompeia: durações do Kling 4 ${d.join('+')}`)
  no(input.input.duration !== 15 || input.model !== 'kling/v4/image-to-video', 'Pompeia: mudou o pedido de 15 s / o modelo (o custo seria outro)')
  no(!/Scene 3: text-directed shot/.test(input.input.multi_prompt[2].prompt), 'Pompeia: a 2ª metade ganhou imagem-chave que não existe')

  no(Q.planosPorSecao({ prompts: PROMPTS, stills: STILLS, falas: FALAS, secoes: SECOES.slice(0, 3).concat({ voiceover: 'Outra coisa.', pexelsQuery: '' }) }) !== null, 'nulo: seção que não bate com a fala virou plano')
  no(Q.planosPorSecao({ prompts: PROMPTS, stills: STILLS, falas: [FALAS[0], 'Fala reescrita pelo encaixe.', FALAS[2]], secoes: SECOES }) !== null, 'nulo: fala reescrita virou plano')
  no(Q.planosPorSecao({ prompts: PROMPTS, stills: STILLS, falas: FALAS.slice(0, 2).concat(SECOES[3].voiceover), secoes: SECOES.slice(0, 3).concat(SECOES[3]) }) === null, 'Pompeia: mesmo caso falhou')
  const tres = SECOES.slice(0, 3)
  no(Q.planosPorSecao({ prompts: PROMPTS, stills: STILLS, falas: tres.map((s) => s.voiceover), secoes: tres }) !== null, 'nulo: nada fundido virou plano novo')
  const seis = Array.from({ length: 6 }, (_, i) => ({ voiceover: `Frase ${i + 1}.`, pexelsQuery: `hint ${i}` }))
  no(Q.planosPorSecao({ prompts: PROMPTS, stills: STILLS, falas: ['Frase 1. Frase 2.', 'Frase 3. Frase 4.', 'Frase 5. Frase 6.'], secoes: seis }) !== null, 'nulo: mais de 5 planos foi ao Kling 4')
  const pre = Q.planosPorSecao({ prompts: PROMPTS, stills: STILLS, falas: [`Abertura antes. ${FALAS[0]}`, FALAS[1], FALAS[2]], secoes: SECOES })
  no(!pre || !pre.falas[0].startsWith('Abertura antes. '), 'Pompeia: a fala de antes do 1º marcador sumiu do 1º plano')

  const r = S.route
  no(!r.includes('const kling4PlanoPorSecao = planoPorSecaoLigado(KLING4_PLANO_POR_SECAO, isInternalEmail(user.email))'), 'rota: o interruptor não lê a conta da casa')
  no(!r.includes('return submitKling4TrialVideo(kling4PorSecao({') || !r.includes('const kling4EnvioDoFilme = () => kling4PorSecao({ prompts: kling4Prompts, approvedStills: kling4ApprovedStills, timing: kling4Timing })'), 'rota: o envio pago não usa os planos por seção')
  no((r.match(/const e = kling4EnvioDoFilme\(\); return buildKling4TrialInput\(e\.prompts, e\.approvedStills, e\.timing\)\.input/g) ?? []).length !== 2, 'rota: juiz do plano e claim não leem a mesma entrada do envio')
  no(!r.includes('const q = kling4PlanoPorSecao && verbatim && parsedScript.segments.length > scenes.length'), 'rota: os planos por seção valem sem seções a mais que cenas')
  no(!r.includes("fallback_scenes = classicScenePrompts.map((prompt, i) => ({ prompt, duration: scenes[i].clipSeconds ?? 6"), 'rota: a reserva deixou de ser as 3 cenas de sempre')
  no(!r.includes('const scenePlan = scenes.map((s, i) => {'), 'rota: scene_plan deixou de ser por cena')
  return p
}

const atual = await problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (Pompeia: 4+7+4 → 4 planos)')
const MUT = [
  ['M1 interruptor volta a desligado', 'lib', (s) => s.replace("export const KLING4_PLANO_POR_SECAO: ModoPlanoPorSecao = 'public'", "export const KLING4_PLANO_POR_SECAO: ModoPlanoPorSecao = 'off'")],
  ['M2 2ª metade herda a imagem', 'lib', (s) => s.replace('stills.push(pos === 0 ? (a.stills[i] ?? null) : null)', 'stills.push(a.stills[i] ?? null)')],
  ['M3 metade sem a sua seção', 'lib', (s) => s.replace('prompts.push(g.length === 1 ? a.prompts[i] : promptDaSecao(a.prompts[i], secao, { objetoConcreto: a.objetoConcreto === true }))' /* KINEO-SECAO-COM-FALA-REESCRITA-1111: a seção pode vir com a fala real */, 'prompts.push(a.prompts[i])')], // KINEO-K4-PLANO-DA-SECAO-1111
  ['M4 aceita fala que não bate', 'lib', (s) => s.replace('      if (!alvo.includes(junto)) return null\n', '').replace('    if (!grupo.length || !(junto === alvo || (i === 0 && alvo.endsWith(` ${junto}`)))) return null\n', '')],
  ['M5 sem teto de 5 planos', 'lib', (s) => s.replace('if (total > KLING4_MAX_PLANOS) return null', '')],
  ['M6 envio pago com os 3 planos', 'route', (s) => s.replace('return submitKling4TrialVideo(kling4PorSecao({', 'return submitKling4TrialVideo(({')],
  ['M7 interruptor ignora a conta', 'route', (s) => s.replace('planoPorSecaoLigado(KLING4_PLANO_POR_SECAO, isInternalEmail(user.email))', 'planoPorSecaoLigado(KLING4_PLANO_POR_SECAO, true)')],
]
for (const [nome, k, f] of MUT) {
  const s2 = f(SRC[k])
  if (s2 === SRC[k]) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = await problems({ ...SRC, [k]: s2 })
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0]})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
