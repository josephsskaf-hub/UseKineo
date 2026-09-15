// KINEO-SALVAGE-ESTORNO-2026-09-15 — render a791cb45 (fundador, 15/09 19:29Z): o salvage
// reaproveitou os 7 clipes COMPLETED do 7bb62a29 (0 POSTs novos, $0 de fal), o compose recusou
// por qualidade (scene_speech_exceeds_footage) e os 45 cr NÃO foram estornados
// (credit_debits cinematic-46b4d849… refunded_at null). Causa: o salvage cravava
// `cinematicSubmissionUncertain = true` em TODO reaproveitamento, e o portão de estorno
// (lib/cinematic/qualityRejection: submission_uncertain !== true && jobs terminais) recusa,
// com razão, estornar uma submissão incerta. Este guardião executa a FATIA REAL do salvage
// com o fal mockado e prova: (a) na origin/main o reaproveitamento de 7 clipes certos sai
// "incerto" (reprodução do bug de dinheiro); (b) no candidato a incerteza é HERDADA da
// submissão original (falsa → falsa; verdadeira → verdadeira); (c) um slot sem id durável
// volta a marcar incerteza; (d) o portão de estorno da biblioteca continua intacto.
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

const INI = '              const freshIds: (string | null)[] = []'
const FIM = "                return publishCinematicResponse(patched, freshIds, storedModels)\n              }"
const PARAMS = ['fal', 'falKey', 'storedIds', 'storedModels', 'sPrompts', 'sAnchors', 'sSeconds', 'submitToFal', 'salvageFp', 'console', 'ctxDespacho', 'generationId', 'storedResp', 'HOLLYWOOD_MODELS']
function fatiaDe(src) { const a = src.indexOf(INI); const b = src.indexOf(FIM, a); return a < 0 || b < a ? null : src.slice(a, b + FIM.length) }
function montar(fatia) {
  return roda(`export async function rodar(ctx: any) {\n  const { ${PARAMS.join(', ')} } = ctx\n  let cinematicSubmissionUncertain = false\n  let providerSubmissionMayExist = false\n  const publishCinematicResponse = (patched: any, ids: any, models: any) => ({ salvage: { patched, ids, models }, uncertain: cinematicSubmissionUncertain, mayExist: providerSubmissionMayExist })\n${fatia}\n  return { salvage: null, uncertain: cinematicSubmissionUncertain, mayExist: providerSubmissionMayExist }\n}`).rodar
}

const rota = rd('app/api/generate-video-cinematic/route.ts')
const fatia = fatiaDe(rota)
checa('fatia do salvage existe na rota', Boolean(fatia))
checa('candidato: a incerteza é herdada da submissão original (submission_uncertain !== false), não cravada', fatia.includes('cinematicSubmissionUncertain = storedResp.submission_uncertain !== false') && !fatia.includes('cinematicSubmissionUncertain = true\n              let reused = 0'))
checa('candidato: slot sem id durável volta a marcar incerteza antes de publicar', fatia.includes("if (freshIds.some((id) => !id)) cinematicSubmissionUncertain = true"))
const lib = rd('lib/cinematic/qualityRejection.ts')
checa('biblioteca intacta: o estorno por qualidade continua exigindo submissão certa E jobs terminais', lib.includes("claim.response?.submission_uncertain !== true && cinematicJobsAreTerminal(claim)") && lib.includes("if (!qualityRefundJobsAreTerminal(claim)) return result('provider_jobs_not_terminal')"))

// ── o mundo do a791cb45: 7 slots, todos COMPLETED com vídeo, nenhum POST novo ──
const IDS = Array.from({ length: 7 }, (_, i) => `01a0a665-000${i}-7000-8000-00000000000${i}`)
function mundo(opts = {}) {
  const status = opts.status ?? (() => ({ status: 'COMPLETED' }))
  const result = opts.result ?? (() => ({ data: { video: { url: 'https://v3b.fal.media/files/x/clip.mp4' } } }))
  const posts = []
  const ctx = {
    fal: { queue: { status: async (m, { requestId }) => status(requestId), result: async (m, { requestId }) => result(requestId) } }, falKey: 'fixture',
    storedIds: [...IDS], storedModels: IDS.map(() => 'minimax/h3/image-to-video'), sPrompts: IDS.map((_, i) => `prompt ${i + 1}`), sAnchors: IDS.map(() => null), sSeconds: [8, 12, 10, 11, 9, 10, 11],
    submitToFal: opts.submitToFal ?? (async (p) => { posts.push(p); return 'novo-' + posts.length }), salvageFp: '6e5a3231aaaa', console: { log: () => {}, warn: () => {} }, ctxDespacho: () => ({}),
    generationId: 'a791cb45-ba1b-4686-8ddd-c67f565f831b', storedResp: { submission_uncertain: opts.storedUncertain ?? false, scene_seconds: [8, 12, 10, 11, 9, 10, 11] }, HOLLYWOOD_MODELS: { dialogue: 'x' },
  }
  return { ctx, posts }
}

console.log('== (a) reprodução na origin/main: 7 clipes certos reaproveitados saem "incertos" → sem estorno ==')
{
  let rotaMain = null
  try { rotaMain = execFileSync('git', ['show', 'origin/main:app/api/generate-video-cinematic/route.ts'], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch {}
  const fm = rotaMain ? fatiaDe(rotaMain) : null
  if (fm && !fm.includes('KINEO-SALVAGE-ESTORNO-2026-09-15')) {
    const { ctx, posts } = mundo()
    const r = await montar(fm)(ctx)
    checa(`main: salvage publica os 7 clipes (0 POSTs) e mesmo assim marca submission_uncertain=true — é o que travou o estorno do a791cb45`, r.salvage && r.salvage.ids.every(Boolean) && posts.length === 0 && r.uncertain === true)
  } else {
    checa('reprodução na main pulada (origin/main já traz o conserto, ou git indisponível)', true)
  }
}

console.log('== (b) candidato: incerteza herdada ==')
{
  const { ctx, posts } = mundo()
  const r = await montar(fatia)(ctx)
  checa('original certa + 7 clipes COMPLETED com vídeo + 0 POSTs → publica os 7 e a submissão continua CERTA (estorno por qualidade volta a ser possível)', r.salvage && r.salvage.ids.join(',') === IDS.join(',') && posts.length === 0 && r.uncertain === false)
  const b = mundo({ storedUncertain: true })
  const rb = await montar(fatia)(b.ctx)
  checa('original INCERTA → o salvage continua incerto (nunca lava uma submissão duvidosa)', rb.salvage && rb.uncertain === true)
}

console.log('== (c) slot sem prova durável ==')
{
  // status lança E a re-submissão lança → slot null → incerto (mas ainda publica: 6 de 7 ≥ 60 % dos segundos)
  const c = mundo({ status: (rid) => { if (rid === IDS[3]) throw new Error('fal status down'); return { status: 'COMPLETED' } }, submitToFal: async () => { throw new Error('fal submit down') } })
  const rc = await montar(fatia)(c.ctx)
  checa('um slot sem id (status e re-submissão falharam) → publica com 6 de 7 e marca INCERTA', rc.salvage && rc.salvage.ids.filter(Boolean).length === 6 && rc.uncertain === true)
  // slot morto re-submetido com sucesso: id novo conhecido → continua certa
  const d = mundo({ status: (rid) => ({ status: rid === IDS[3] ? 'FAILED' : 'COMPLETED' }) })
  const rdd = await montar(fatia)(d.ctx)
  checa('slot morto re-submetido com id novo conhecido → 7 ids, 1 POST, submissão continua certa', rdd.salvage && rdd.salvage.ids.every(Boolean) && d.posts.length === 1 && rdd.uncertain === false)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
