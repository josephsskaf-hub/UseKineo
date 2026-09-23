// KINEO-H3-VERBATIM-CORTE-2026-09-23 — render H3 do fundador (23/09, 4e2767cd e 5afb265d):
// roteiro pronto de 202/228 palavras, "Use my script as is", 60 s — recusado 2x por silêncio.
// Ensaio de $0 no plano que reprovou: o teto-rede dividia a cena longa NA FRASE (KINEO-CORTE-NA-FRASE)
// mas deixava a cabeça com os segundos do TETO (12 s): 15 palavras em 12 s = 5,5 s mudos; 11 em 12 s = 6,9 s.
// Este guardião roda a fatia real da rota (harness do test-h3-palavras) com esse plano em verbatim.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp }
const TL = roda(rd('lib/cinematic/timelineContract.ts'))
const FID = roda(rd('lib/hollywood/fidelidade.ts'))
const rota = rd('app/api/generate-video-cinematic/route.ts')
const runway = rd('lib/runway.ts')
const wordsOf = (t) => (t ?? '').trim().split(/\s+/).filter(Boolean).length

console.log('== régua intocada ==')
const tl = rd('lib/cinematic/timelineContract.ts')
checa('SILENCE_SCENE_MAX_SECONDS = 1.5 e SILENCE_TOTAL_MAX_SECONDS = 8 continuam', tl.includes('export const SILENCE_SCENE_MAX_SECONDS = 1.5') && tl.includes('export const SILENCE_TOTAL_MAX_SECONDS = 8'))
checa('a rota ainda barra com 422 plan_silence_inside_scenes quando a régua reprova (estorno + evento)', rota.includes("releaseBirthClaim('plan_silence_inside_scenes')") && rota.includes("reason: 'plan_silence_inside_scenes'") && rota.includes("name: 'plan_silence_rejected'"))

console.log('== a fatia real da rota ==')
const ini = rota.indexOf("      let duracaoReconciliada: { reconciliado: boolean; aparado_s: number; excedente_s: number; base: 'estimate' } | null = null")
const fimTxt = "            sceneMax: SILENCE_SCENE_MAX_SECONDS, totalMax: SILENCE_TOTAL_MAX_SECONDS,\n          }, { status: 422 })\n        }\n      }"
const fim = rota.indexOf(fimTxt, ini)
checa('fatia enche-silêncio → régua existe na rota', ini > 0 && fim > ini)
const fatia = rota.slice(ini, fim + fimTxt.length)
checa('a régua é avaliada sobre o plano PROJETADO pelo piso (fitCinematicPlanFloor) antes de decidir', fatia.includes('const projetar = () => planSilenceReport(fitCinematicPlanFloor(plan.scenes, duration, SCENE_CAP), ritmoVoz)'))
checa('a continuação roda DENTRO do try do enche-silêncio (modo IA), depois da apara e antes do teto-rede', fatia.includes('KINEO-H3-PALAVRAS-2026-09-15') && fatia.indexOf('const apara = apararComFolga(') < fatia.indexOf('KINEO-H3-PALAVRAS-2026-09-15') && fatia.indexOf('KINEO-H3-PALAVRAS-2026-09-15') < fatia.indexOf("console.warn('[hollywood] enche-silencio pulado:'"))
checa('só cenas sem diálogo com folga > 0,9 s pedem continuação; segundos nunca descem nesse passo', fatia.includes(".filter((x) => x.sc.type !== 'dialogue' && x.silencio > 0.9)") && fatia.includes('if (w / ritmoVoz + FOLGA_MIN_S > (pd.x.sc.seconds || 0)) pd.x.sc.seconds = Math.min(pd.x.teto, Math.ceil(w / ritmoVoz + FOLGA_MIN_S))'))
checa('a linha aceita fica intacta: só entra continuação que começa pela linha original', fatia.includes("!nova.startsWith(base.trim().replace(/[.!?…]$/, ''))) return"))
checa('rota importa appendNarrationToTargets de @/lib/runway', rota.includes("expandVoiceoversToTargets, appendNarrationToTargets, FILLER_LINE_RE } from '@/lib/runway'"))

const params = ['plan', 'verbatim', 'duration', 'DIALOGUE_CAP', 'SCENE_CAP', 'FILLER_LINE_RE', 'expandVoiceoversToTargets', 'appendNarrationToTargets', 'hollywoodLanguage', 'prompt', 'apararComFolga', 'removerDatasInventadas' /* 15/09 R4 */, 'scrubInventedSetting' /* 15/09 R9 */, 'planSilenceReport', 'writeServerEvent', 'user', 'generationId', 'family', 'verbatimOverflowWords', 'MAX_VERBATIM_SCENES', 'hollywoodVoiceover', 'releaseBirthClaim', 'cinematicAdmin', 'body', 'NextResponse', 'hollywoodTarget', 'requestedDuration', 'degrau', 'formatoVisual', 'resolveCharacterVoice', 'cinematicSceneModel', 'buildFalInput', 'confirmCinematicRefund', 'SILENCE_SCENE_MAX_SECONDS', 'SILENCE_TOTAL_MAX_SECONDS', 'fitCinematicPlanFloor', 'console', 'resolveHollywoodVoice', 'hollywoodVertical', 'sceneNarrationsForPlan']
const montar = (fatiaSrc) => roda(`export async function rodar(ctx: any) {\n  const { ${params.join(', ')} } = ctx\n${fatiaSrc}\n  return { plan, duracaoReconciliada, rejeitado: null }\n}`).rodar
const executar = montar(fatia)
const NextResponse = { json: (b, init) => ({ rejeitado: b, status: init?.status ?? 200 }) }
const ctxBase = (plan, extra = {}) => ({
  plan, verbatim: false, duration: 60, DIALOGUE_CAP: 15, SCENE_CAP: 12, FILLER_LINE_RE: /^(here is something most people do not know about|imagine|what if|most people don'?t know)/i,
  hollywoodLanguage: 'en', prompt: 'Create a 60-second historical documentary short in English about the 1958 Lituya Bay megatsunami',
  apararComFolga: FID.apararComFolga, removerDatasInventadas: FID.removerDatasInventadas ?? ((t) => ({ texto: t, removidas: [] })), scrubInventedSetting: (t) => ({ text: t, removed: [] }), planSilenceReport: TL.planSilenceReport, writeServerEvent: async (e) => { (ctxBase.eventos ??= []).push(e); return true },
  user: { id: 'u1', email: 'cliente@example.com' }, generationId: 'g1', family: 'h3', verbatimOverflowWords: 0, MAX_VERBATIM_SCENES: 12, hollywoodVoiceover: '',
  releaseBirthClaim: async () => true, cinematicAdmin: { from: () => ({ insert: async () => ({}) }) }, body: {}, NextResponse, hollywoodTarget: 68, requestedDuration: 60, degrau: null,
  formatoVisual: { modo: 'documentary_faceless' }, resolveCharacterVoice: () => null, cinematicSceneModel: () => 'x', buildFalInput: () => ({}), confirmCinematicRefund: async () => true,
  SILENCE_SCENE_MAX_SECONDS: 1.5, SILENCE_TOTAL_MAX_SECONDS: 8, fitCinematicPlanFloor: TL.fitCinematicPlanFloor, console: { log: () => {}, warn: () => {} },
  // KINEO-RITMO-DA-VOZ-2026-09-15: persona neutra (1,0) → ritmo 2,3; o caso (f) troca pela persona idosa
  resolveHollywoodVoice: () => ({ personaId: 'dark-mystery', voice: 'onyx', defaultSpeed: 1.0 }), hollywoodVertical: 'history', sceneNarrationsForPlan: (scenes) => scenes.map((sc) => sc.voiceover ?? null),
  ...extra,
})
// o planejador de ontem: 7 cenas de apoio, 103 palavras, 55 s
const frase = (n, tema) => Array.from({ length: n }, (_, i) => `${tema}${i + 1}`).join(' ')
const planoOntem = () => {
  const words = [14, 15, 15, 14, 15, 15, 15]
  const secs = [8, 8, 8, 8, 8, 8, 7]
  return { characterSheet: '', environmentSheet: 'Lituya Bay', styleSheet: 'documentary', scenes: words.map((w, i) => ({ index: i + 1, type: 'support', seconds: secs[i], prompt: `scene ${i + 1}`, voiceover: frase(w, `w${i + 1}_`) + '.', caption: '' })) }
}
// a reescrita real rendeu ~85% do pedido: aqui cada linha ganha só 2 palavras (103 → 117), como no log da Vercel
const expandComoOntem = async (items) => items.map((it) => it.text.replace(/\.$/, '') + ' extra1 extra2.')
// continuação mockada: acrescenta exatamente add_words palavras factuais ao fim, sem mexer na base
const appendFiel = async (items) => items.map((it) => `${it.text.replace(/[.!?…]$/, '')}. ${Array.from({ length: it.addWords }, (_, i) => `fato${i + 1}`).join(' ')}.`)
const appendNulo = async (items) => items.map((it) => it.text)
const appendProibido = async () => { throw new Error('continuação chamada em verbatim') }
const chamadasTexto = []
const espiao = async (items) => { chamadasTexto.push(items.length); return items.map((it) => it.text) }
const sent = (n, tag) => frase(n, tag) + '.'
// o plano sorteado que reprovou (ensaio de $0 de 23/09, 13 cenas, 15,4 s de silêncio), ANTES do teto-rede:
// as cenas 6 e 10 chegam com duas frases que somam 27 palavras (> 26 que cabem em 12 s a 2,3 pal/s)
const planoFundador = () => {
  const linhas = [
    [sent(22, 'a'), 10], [sent(15, 'b'), 7], [sent(20, 'c'), 9], [sent(13, 'd'), 6], [sent(24, 'e'), 11],
    [`${sent(15, 'sgt')} ${sent(12, 'dias')}`, 12],
    [sent(19, 'g'), 9], [sent(18, 'h'), 9], [sent(25, 'i'), 12],
    [`${sent(11, 'familias')} ${sent(16, 'outros')}`, 12],
    [sent(20, 'k'), 9],
  ]
  return { characterSheet: '', environmentSheet: 'Broome', styleSheet: 'documentary', scenes: linhas.map(([v, s], i) => ({ index: i + 1, type: 'support', seconds: s, prompt: `scene ${i + 1}`, voiceover: v, caption: '' })) }
}

console.log('== verbatim: cena dividida na frase não herda os segundos do teto ==')
{
  const plan = planoFundador()
  const falaAntes = plan.scenes.map((sc) => sc.voiceover).join(' ')
  const r = await executar(ctxBase(plan, { verbatim: true, expandVoiceoversToTargets: espiao, appendNarrationToTargets: espiao }))
  const sil = TL.planSilenceReport(plan.scenes, 2.3)
  const total = plan.scenes.reduce((a, sc) => a + sc.seconds, 0)
  const cabecaSgt = plan.scenes.find((sc) => sc.voiceover.startsWith('sgt1 '))
  const cabecaFam = plan.scenes.find((sc) => sc.voiceover.startsWith('familias1 '))
  checa(`o plano do fundador passa a régua (silêncio ${sil.total}s, pior ${sil.worst}s)`, r.status !== 422 && r.rejeitado === null && sil.ok)
  checa(`cabeça "Sergeant…" (15 palavras) não fica com 12 s — ficou ${cabecaSgt?.seconds}s`, cabecaSgt && wordsOf(cabecaSgt.voiceover) === 15 && cabecaSgt.seconds < 12 && cabecaSgt.seconds - 15 / 2.3 <= 1.4)
  checa(`cabeça "Around twenty…" (11 palavras) não fica com 12 s — ficou ${cabecaFam?.seconds}s`, cabecaFam && wordsOf(cabecaFam.voiceover) === 11 && cabecaFam.seconds < 12 && cabecaFam.seconds - 11 / 2.3 <= 1.4)
  checa('C1: a fala do autor sai idêntica, na mesma ordem, sem palavra a mais nem a menos', plan.scenes.map((sc) => sc.voiceover).join(' ') === falaAntes)
  checa('C1: nenhuma chamada ao modelo de texto em verbatim', chamadasTexto.length === 0)
  checa(`duração ${total}s ≥ 60 pedidos e nenhuma cena acima do teto (12 s)`, total >= 60 && plan.scenes.every((sc) => sc.seconds <= 12))
}

console.log('== o corte nunca derruba o piso de duração ==')
{
  // roteiro no limite: a cena longa dividida é o que segura os 60 s — encolher a cabeça não pode furar o piso
  const plan = { characterSheet: '', environmentSheet: 'x', styleSheet: 'y', scenes: [
    { index: 1, type: 'support', seconds: 12, prompt: 's1', voiceover: `${sent(8, 'p')} ${sent(20, 'q')}`, caption: '' },
    { index: 2, type: 'support', seconds: 12, prompt: 's2', voiceover: sent(26, 'r'), caption: '' },
    { index: 3, type: 'support', seconds: 12, prompt: 's3', voiceover: sent(26, 's'), caption: '' },
    { index: 4, type: 'support', seconds: 12, prompt: 's4', voiceover: sent(26, 't'), caption: '' },
    { index: 5, type: 'support', seconds: 12, prompt: 's5', voiceover: sent(26, 'u'), caption: '' },
  ] }
  const r = await executar(ctxBase(plan, { verbatim: true, expandVoiceoversToTargets: espiao, appendNarrationToTargets: espiao }))
  const total = plan.scenes.reduce((a, sc) => a + sc.seconds, 0)
  checa(`piso: ${total}s ≥ 60 depois do corte (nunca plan_duration_below_request por causa dele)`, total >= 60 && r.rejeitado?.reason !== 'plan_duration_below_request')
}

console.log('== o conserto está na rota ==')
checa('teto-rede dimensiona a cabeça pela própria fala (KINEO-H3-VERBATIM-CORTE)', /KINEO-H3-VERBATIM-CORTE-2026-09-23/.test(rota) && /const cabecaPrecisa = Math\.min\(cap, Math\.max\(4, Math\.ceil\(wordsArr\(head\)\.length \/ ritmoVoz \+ FOLGA_MIN_S\)\)\)/.test(rota))

console.log(`${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
if (falhas.length) process.exit(1)
