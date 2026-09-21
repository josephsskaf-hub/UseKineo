// KINEO-MOTORES-DIA-2026-09-22 — guardião do Bloco A/D do plano de motores: a duração segue o roteiro no Kineo 1, e o
// juiz passa a enxergar os 8 motores (narração do claim de nascimento / recuperável / plano).
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

console.log('1) Kineo 1: a duração segue o roteiro próprio (a parede que migrou para o trial)')
const rf = rd('app/api/generate-video-fast/route.ts')
const ini = rf.indexOf('KINEO-DURACAO-SEGUE-O-ROTEIRO-KINEO1-2026-09-22')
const fim = rf.indexOf("if (!portao?.blocked) portao = { blocked: !fit.ok, reason: fit.ok ? null : 'narration_too_short',", ini)
const bloco = rf.slice(ini, fim)
checa('bloco existe, DEPOIS do allow_shorter_duration e ANTES do portão decidir', ini > 0 && fim > ini && rf.indexOf("body.allow_shorter_duration === true") < ini)
checa('só desce quando a fala não enche e o autofit explícito não rodou', bloco.includes('if (!fit.ok && !autofitApplied) {'))
checa('decisão pura compartilhada com o cinematic (ownScript = verbatim, piso 35 s)', bloco.includes('decideDurationFollowsScript({ fitOk: fit.ok, ownScript: verbatim, requestedSeconds: duration, speechSeconds: fit.speech, largestFitting: largestFittingDuration(fit.speech), floorSeconds: 35 })'))
checa('a duração nova tem que estar no seletor do Kineo 1', bloco.includes('(SUPPORTED_DURATIONS as readonly number[]).includes(seguiu.to)'))
checa('remede a fala na duração nova e marca autofit_applied', bloco.includes('fit = narrationFitAt(falaDoAutor, duration, narrationRate)') && bloco.includes('autofitApplied = true'))
checa('grava duration_followed_script com engine fast, from/to/speech/fits_now', bloco.includes("name: DURATION_FOLLOWED_SCRIPT_EVENT") && bloco.includes("metadata: { engine: 'fast', from: pedida, to: duration, speech: seguiu.speechSeconds, fits_now: fit.ok"))
checa('ensaio autorizado não grava evento', bloco.includes('if (!dryRunAutorizado) void writeServerEvent({ name: DURATION_FOLLOWED_SCRIPT_EVENT'))
checa('import do helper compartilhado', rf.includes("import { decideDurationFollowsScript, DURATION_FOLLOWED_SCRIPT_EVENT } from '@/lib/durationFollowsScript'"))
const D = roda(rd('lib/durationFollowsScript.ts'))
checa('helper: 38,7 s de fala pedindo 60 → 35 (piso 35)', JSON.stringify(D.decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 60, speechSeconds: 38.7, largestFitting: 35, floorSeconds: 35 })).includes('"to":35'))
checa('helper: texto da IA (não é roteiro próprio) nunca desce', D.decideDurationFollowsScript({ fitOk: false, ownScript: false, requestedSeconds: 60, speechSeconds: 38.7, largestFitting: 35, floorSeconds: 35 }) === null)
checa('helper: 20 s de fala (nada cabe) → recusa honesta continua', D.decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 35, speechSeconds: 20, largestFitting: null, floorSeconds: 35 }) === null)

console.log('2) o juiz enxerga os 8 motores')
const adm = rd('lib/admin/fastCoherence.ts')
checa('carrega o claim de nascimento e o recuperável junto com plano/despacho/nota', adm.includes("eq('name', 'cinematic_submission_claim').in('session_id', genIds)") && adm.includes("eq('name', 'fast_compose_recoverable').in('session_id', genIds)"))
checa('cadeia de narração: compose → nascimento (voiceover_script) → recuperável → plano (voiceovers)', adm.includes("['compose_claim', claim?.metadata?.narration]") && adm.includes("['birth_claim', birthResponse?.voiceover_script]") && adm.includes("['recoverable', recoverablePayload?.voiceover_script]") && adm.includes("['scene_plan', Array.isArray(plan?.metadata?.scenes)"))
checa('a ordem preserva a fonte antiga primeiro (nota de filmes já julgados não muda de base)', adm.indexOf("['compose_claim'") < adm.indexOf("['birth_claim'"))
checa('tema também lê o prompt completo do nascimento e o topic do recuperável', adm.includes("typeof birthResponse?.prompt === 'string' ? (birthResponse.prompt as string) : ''") && adm.includes("typeof recoverablePayload?.topic === 'string' ? (recoverablePayload.topic as string) : ''"))
checa('o evento do juiz grava narration_source (medir a cobertura por fonte)', adm.includes('narration_source: r.narration_source }') && adm.includes("narration_source: 'compose_claim' | 'birth_claim' | 'recoverable' | 'scene_plan' | null"))
checa('pending continua exigindo narração + tema + gen (sem inventar nota)', adm.includes('const pending = rows.filter((r) => !r.coherence && r.generation_id && r.narration && r.topic)'))
const jz = rd('lib/fastCoherence.ts')
checa('juiz: ausência de cenas não rebaixa a nota da narração nem vira problema', jz.includes('the ABSENCE of scenes is not a defect of the narration and must not lower prompt_vs_narration or appear in problems'))

console.log('2b) still de um quadro só (C1: navio duplicado no Veo)')
const an = rd('lib/hollywood/anchors.ts')
checa('ONE_FRAME_RULE existe e proíbe split/colagem/sujeito repetido', /const ONE_FRAME_RULE = 'one single continuous composition filling the whole frame, no split screen, no collage, no mirrored or repeated subject/.test(an))
checa('vai nos 3 stills: cena clássica, ambiente hollywood, retrato hollywood', (an.match(/\$\{ONE_FRAME_RULE\}/g) || []).length === 3)
checa('still da cena clássica também proíbe letras (i2v herda o still)', an.includes("sharp focus, ${ONE_FRAME_RULE}, no text, no letters, no watermark, no logo"))

console.log('2c) as três decisões do fundador (22/09): degrau de 35 s, selo do Omni, Avatar medido')
const st = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('degrau: só quando o custo na duração atual passa do saldo e uma duração MENOR do seletor cabe', st.includes('const stepDownFor = (key: EngineKey): { seconds: 35 | 60; cost: number } | null => {') && st.includes('if (c <= 0 || balance >= c) return null') && st.includes('for (const d of [60, 35] as const) {') && st.includes('if (d >= duration) continue'))
checa('degrau: custo pela MESMA função do cobrador (creditCostForDuration na qualidade do motor)', st.includes("const cost = creditCostForDuration(ENGINE_QUALITY[key] ?? 'cinematic_ai', true, d)"))
checa('degrau: clique troca duração + motor e grava studio_shorter_step_clicked com from/to/cost', st.includes("void trackEvent('studio_shorter_step_clicked', { engine: e.key, from: duration, to: st.seconds, cost: st.cost, balance }); setDuration(st.seconds); setEngine(e.key); setPickerOpen(false)"))
checa('degrau: impressão medida no mesmo gatilho (picker aberto) com os degraus oferecidos', st.includes("void trackEvent('studio_shorter_step_shown', { duration, balance, steps })"))
checa('degrau: não aninha <button> dentro do card-botão (role=button)', st.includes('<span role="button" tabIndex={0} className="pill on"'))
checa('selo: Omni sem "#1 ranked" no seletor do Studio', !/tag: '#1 ranked'/.test(st) && st.includes("desc: 'Google’s Gemini Omni Flash — cinematic scenes'"))
const land = rd('app/KineoLanding.tsx')
checa('selo: mega-menu sem chip "#1 RANKED" e sem "#1-ranked model" no pricing da home', !land.includes('chip="#1 RANKED"') && !land.includes('the #1-ranked model'))
checa('selo: /generate e /models-pricing sem "#1 ranked"', !rd('app/(dashboard)/generate/GenerateClient.tsx').includes("#1 ranked, Aug 2026") && !rd('app/models-pricing/page.tsx').includes('#1 ranked, Aug 2026 arena'))
checa('avatar: o card do Studio grava studio_avatar_card_clicked', st.includes("void trackEvent('studio_avatar_card_clicked', { balance })") && st.includes("router.push('/avatar')"))

console.log('3) mutantes')
const semBloco = rf.replace(/      \/\/ ═══ KINEO-DURACAO-SEGUE-O-ROTEIRO-KINEO1-2026-09-22[\s\S]*?\n      }\n      if \(!portao\?\.blocked\)/, '      if (!portao?.blocked)')
checa('mutante (bloco do Kineo 1 removido) é pego', !semBloco.includes('DURATION_FOLLOWED_SCRIPT_EVENT, userId') && semBloco.length < rf.length)
checa('mutante (cláusula fora do still da cena) é pego', (an.replace("sharp focus, ${ONE_FRAME_RULE}, no text, no letters", 'sharp focus, no text, no letters').match(/\$\{ONE_FRAME_RULE\}/g) || []).length === 2)
checa('mutante (degrau ignorando o saldo) é pego', !st.replace('if (c <= 0 || balance >= c) return null', 'if (c <= 0) return null').includes('if (c <= 0 || balance >= c) return null'))
checa('mutante (nascimento fora da cadeia) é pego', !adm.replace("['birth_claim', birthResponse?.voiceover_script],\n", '').includes("['birth_claim'"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
