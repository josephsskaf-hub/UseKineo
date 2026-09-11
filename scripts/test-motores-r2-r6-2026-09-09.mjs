// KINEO-MOTORES-R2-R6-2026-09-09 — guardião da primeira rodada de consertos dos
// motores (relatório docs/RELATORIO-MOTORES-2026-09-09.md, ordem do fundador:
// "começa pelo 2 e vai até o 6").
//
// Executa as libs PURAS em sandbox (sem imports) com casos reais lidos do
// banco em 09/09, e prova por texto que as rotas e a tela as chamam.
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
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp }); return exp }

console.log('== item 2: o Kineo 1 sabe o que não sabe contar ==')
const fit = roda(rd('lib/engineFit.ts'))
const ficcao = [
  ['coelhinho (07/09, cliente real)', 'Benny, the tiniest bunny, finds a... mysterious golden egg! Benny stares in awe. One day the little bunny discovers that the egg glows.'],
  ['cantiga 3D (07/09, cliente real)', 'Create a cute, colourful 60-second 3D animated nursery rhyme set in South Africa with a happy train chugging through the savannah.'],
  ['terror em 1ª pessoa', 'At exactly 3 a.m. I heard someone call my name from inside Room 214. The door creaked. Footsteps behind me. I ran down the corridor and suddenly the lights went out.'],
  ['fábula', 'Once upon a time a brave little fox lived at the edge of a magical forest. "Don\'t go in there," his mother said.'],
  ['personagem inventado', 'Roland Pernicus Ozxnard, a rough and gruff old man totally decked out in weapons, walks through airport security. He smiles at the guard and opens his coat.'],
]
for (const [nome, texto] of ficcao) checa(`ficção → stock_cannot_tell: ${nome}`, fit.classifyEngineFit(texto).verdict === 'stock_cannot_tell')
const documental = [
  ['mistério 1953 (cliente real)', 'A chilling disappearance... unsolved for 70 years. In 1953, a Cessna 170 aircraft vanished over Nevada. Despite an extensive search, investigators never found the plane.'],
  ['finanças', 'Can AI actually make you rich in 2026? The answer might surprise you. Individuals can now create businesses with code. However there\'s a twist: the key lies in what valuable problem you solve.'],
  ['ciência', 'How does Shazam recognize a song in seconds? Advanced audio fingerprinting technology identifies 1 billion times a year with 99% reliability.'],
  ['hábito de 30 dias (cliente real)', 'Can a 20-minute habit really transform your body in 30 days? Start with a brisk walk — 20 minutes daily. Add resistance bands to increase strength. Studies show cortisol drops significantly.'],
  ['história com "one day"', 'In 1773 Boston Harbor was the site of the Tea Party protest. One day later the British government responded. Historians say it changed American history forever.'],
  ['curto demais', 'space facts'],
]
for (const [nome, texto] of documental) checa(`documental → ok: ${nome}`, fit.classifyEngineFit(texto).verdict === 'ok')
checa('veredito traz motivo legível e sinais', (() => { const v = fit.classifyEngineFit(ficcao[0][1]); return v.verdict === 'stock_cannot_tell' && v.reason.length > 40 && v.signals.length >= 1 })())

const fastRoute = rd('app/api/generate-video-fast/route.ts')
checa('rota do Kineo 1 chama classifyEngineFit ANTES de gastar OpenAI e devolve 409 com engine_fit', /const engineFit = classifyEngineFit\(prompt\)/.test(fastRoute) && /engine_fit: \{ verdict: engineFit\.verdict/.test(fastRoute) && /\{ status: 409 \}/.test(fastRoute) && fastRoute.indexOf('classifyEngineFit(prompt)') < fastRoute.indexOf('const requestedDuration = Number(body.duration) || 45'))
checa('quem insiste passa (engineFitOverride) e fica registrado', /body\.engineFitOverride !== true/.test(fastRoute) && /engine_fit_overridden/.test(fastRoute))
checa('custo sugerido vem da fonte de custo (creditCostForDuration), nunca digitado', /creditCostForDuration\('cinematic_ai', true, requestedForFit\)/.test(fastRoute))
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('tela: 409 vira caixa de escolha, não erro vermelho', /res\.status === 409 && data && typeof data\.engine_fit === 'object'/.test(gc) && /setEngineFit\(\{/.test(gc) && /data-testid="engine-fit-box"/.test(gc))
checa('tela: "Switch" troca para Seedance (mode+aiEngine) e re-gera; "Keep" manda engineFitOverride', /data-testid="engine-fit-switch"/.test(gc) && /setMode\('cinematic_ai'\)\n\s+setAiEngine\('seedance'\)/.test(gc) && /data-testid="engine-fit-keep"/.test(gc) && /engineFitOverrideRef\.current = true/.test(gc) && /engineFitOverrideRef\.current \? \{ engineFitOverride: true \}/.test(gc))

console.log('== itens 3 e 5: estilo travado, fecho sem repetição, texto ilegível ==')
const st = roda(rd('lib/cinematic/sceneStyle.ts'))
{
  const a = st.deriveStyleAnchor('Create a cute, colourful 60-second 3D animated nursery rhyme set in South Africa')
  checa('cantiga 3D → look animated3d, com trava "never mix with live-action"', a.look === 'animated3d' && /never mix with live-action/.test(a.suffix))
  const p = st.applyStyleAnchor('savannah with elephants, faceless cinematic b-roll, photorealistic, ultra-detailed, documentary establishing shot, no text', a)
  checa('applyStyleAnchor troca "photorealistic, ultra-detailed" pelo look e cola a trava', !/photorealistic, ultra-detailed/.test(p) && /3D animated/.test(p) && /same 3D animated art style in every scene/.test(p) && !/documentary establishing shot/.test(p))
  const d = st.deriveStyleAnchor('In 1953 a Cessna vanished over Nevada. Investigators never found it.')
  checa('documentário → photoreal, prompt fotorreal fica intacto + trava de grade', d.look === 'photoreal' && /photorealistic, ultra-detailed/.test(st.applyStyleAnchor('x, photorealistic, ultra-detailed', d)) && /one consistent color grade/.test(d.suffix))
  const e = st.deriveStyleAnchor('anything', ', moody, golden hour, handheld, consistent')
  checa('globalStyle explícito do cliente entra DEPOIS da trava, não some', /moody, golden hour, handheld/.test(e.suffix) && e.suffix.indexOf('same photorealistic') < e.suffix.indexOf('moody'))
  checa('closingSceneVariation: fecho igual à abertura ganha variação; distinto não ganha', (() => {
    const rep = st.closingSceneVariation(['a small plane over the Nevada desert at dawn, wide shot', 'old map on a wooden table', 'a desert with cacti', 'A small plane over the Nevada desert at dawn, wide shot.'])
    const dif = st.closingSceneVariation(['a small plane over the desert', 'old map on a table', 'a desert with cacti', 'a memorial stone at sunset'])
    return rep !== null && rep.index === 3 && /different angle/.test(rep.suffix) && dif === null
  })())
  checa('textSafetySuffix: bilhete/jornal/tela ganham "unreadable"; paisagem fica byte a byte igual', /unreadable/.test(st.textSafetySuffix('a 1971 airline ticket on a bar counter')) && /unreadable/.test(st.textSafetySuffix('a phone screen showing a waveform')) && st.textSafetySuffix('a foggy forest at night, moonlight') === '')
  checa('determinístico (mesma entrada, mesma saída)', JSON.stringify(st.deriveStyleAnchor('3D cartoon bunny')) === JSON.stringify(st.deriveStyleAnchor('3D cartoon bunny')))
}
const cin = rd('app/api/generate-video-cinematic/route.ts')
checa('rota cinemática: âncora decidida UMA vez por filme ANTES de descrições/stills', (cin.match(/const styleAnchor = deriveStyleAnchor\(/g) || []).length === 1 && cin.indexOf('const styleAnchor = deriveStyleAnchor(') < cin.indexOf('await generateCinematicDescriptions('))
const visualPolicy = rd('lib/cinematic/visualPromptPolicy.ts')
checa('caminho clássico: política compartilhada aplica look, era e proteção de texto antes do still', /const cinematicBruto = buildClassicVisualPrompt\(visualPrompt,/.test(cin) && /textSafetySuffix\(visual\)/.test(visualPolicy) && /applyStyleAnchor\(/.test(visualPolicy))
checa('caminho clássico: fecho repetido ganha variação antes de submeter', /const closer = closingSceneVariation\(visuals\)/.test(cin) && cin.indexOf('const closer = closingSceneVariation(visuals)') < cin.indexOf('const submitScene = async ('))
checa('caminho hollywood (Kling 3/H3/Omni): textSafetySuffix antes de submeter', /scenePrompt = scenePrompt \+ textSafetySuffix\(scenePrompt\)\n\s+submittedPrompt = scenePrompt/.test(cin))

console.log('== item 3b: modo história (medido no render 2141336f "Benny") ==')
{
  checa('deriveStoryCharacter: "Benny, the tiniest bunny" → personagem nomeado', st.deriveStoryCharacter('Benny, the tiniest bunny, finds a mysterious golden egg. One day the little bunny discovers the egg glows.') === 'Benny, the tiniest bunny')
  checa('deriveStoryCharacter: "a happy little train" (sem nome) → o objeto humanizado', st.deriveStoryCharacter('Create a cute 3D animated nursery rhyme: a happy little train chugs through the savannah') === 'a happy little train')
  checa('deriveStoryCharacter: documentário → null', st.deriveStoryCharacter('In 1953 a Cessna vanished over Nevada. Investigators never found the plane.') === null)
  const an = st.deriveStyleAnchor('Create a cute, colourful 3D animated nursery rhyme about a happy little train')
  const sp = st.buildStoryScenePrompt('Aerial drone shot of a vibrant cartoon train chugging through the sunlit savannah, photorealistic', an, 'a happy little train')
  checa('buildStoryScenePrompt: look no INÍCIO, personagem fixo, sem "no people"/"empty scene", sem "photorealistic" da cena', sp.startsWith(an.lookPhrase + '. ') && /The same main character appears in this scene, consistent design: a happy little train/.test(sp) && !/no people|empty scene|no human faces/.test(sp) && !/photorealistic/.test(sp.slice(an.lookPhrase.length).replace(an.suffix, '')) && /never mix with live-action/.test(sp))
  checa('rota: storyMode = look animado OU character_story OU ficção; noir não vira personagem por si só', /const storyMode = isStylizedLook\(styleAnchor\) \|\| formatoVisual\.modo === 'character_story' \|\| classifyEngineFit\(prompt\)\.verdict === 'stock_cannot_tell'/.test(cin) && /const storyCharacter = storyMode \? deriveStoryCharacter\(prompt\) : null/.test(cin))
  checa('rota: em história/presenter a política compartilhada preserva o personagem', /buildClassicVisualPrompt\(visualPrompt,/.test(cin) && /policy\.mode !== 'documentary_faceless'/.test(visualPolicy) && /buildStoryScenePrompt\(visual, policy\.style, policy\.character/.test(visualPolicy))
  checa('rota: o contrato de cena usa o mesmo modo do prompt e do payload', /proibidosPorModo\(classicVisualMode\)/.test(cin) && /isStylizedLook\(styleAnchor\), aspectRequested, classicVisualMode\)/.test(cin))
  checa('telemetria: o prompt FINAL por cena vai para cinematic_dispatch_result (clássico e hollywood)', /submitted_prompts: ctx\.submittedPrompts\.map/.test(cin) && /c\.submittedPrompts\[sceneIndex\] = cinematic\.slice\(0, 240\)/.test(cin) && (cin.match(/ctxDespacho\(\)\.submittedPrompts\[hs\.index\] = submittedPrompt\.slice\(0, 240\)/g) || []).length === 3)
}

console.log('== item 4: Kling 3 retenta a cena em erro transitório ==')
checa('submitToFalWithOneRetry existe, retenta só transitório e nunca ambíguo', /function isTransientSubmitError\(e: unknown\): boolean/.test(cin) && /if \(e\.ambiguous\) return false/.test(cin) && /async function submitToFalWithOneRetry\(/.test(cin) && /setTimeout\(r, 2500\)/.test(cin))
checa('a submissão hollywood passa pelo retry', /id = await submitToFalWithOneRetry\(\n\s+\(\) => submitToFal\(scenePrompt, sceneModel, false, true, hs\.seconds, sceneAnchor, undefined, plan\.stylized\),/.test(cin))
{
  // executa o predicado com um erro falso da fal (classe mínima com o mesmo shape)
  const src = "class FalQueueSubmitError extends Error { ambiguous: boolean; status: number | null; constructor(m: string, o: { ambiguous: boolean; status?: number | null }) { super(m); this.ambiguous = o.ambiguous; this.status = o.status ?? null } }\n" +
    cin.slice(cin.indexOf('function isTransientSubmitError'), cin.indexOf('async function submitToFalWithOneRetry')) +
    'exports.t = isTransientSubmitError; exports.E = FalQueueSubmitError'
  const x = roda(src)
  checa('503 transitório → retenta; ambíguo → não; 422 → não; timeout de rede → sim', x.t(new x.E('x', { ambiguous: false, status: 503 })) && !x.t(new x.E('x', { ambiguous: true, status: 503 })) && !x.t(new x.E('Field required', { ambiguous: false, status: 422 })) && x.t(new Error('fetch failed: ETIMEDOUT')))
}

console.log('== item 6: H3 visível para quem paga ==')
const sc = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('Studio: H3 vem logo depois do Seedance, com selo "Fits your plan"', sc.indexOf("{ key: 'h3', icon: 'H3', name: 'MiniMax H3', tag: 'Fits your plan'") > sc.indexOf("{ key: 'seedance'") && sc.indexOf("{ key: 'h3', icon: 'H3'") < sc.indexOf("{ key: 'kling', preview:"))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — motores r2–r6: engine fit no Kineo 1, estilo travado e fecho sem repetição no Seedance, retry no Kling 3, texto ilegível de propósito, H3 na frente')
