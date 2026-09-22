// KINEO-COMPOSE-FALHA-COM-NOME-2026-09-22 — guardião: o compose grava por que morreu.
// Medido 22/09: 637 compose_submission_claim, 137 compose_refused e ZERO evento de falha em 30 dias; H3 (15/09 ×2) e
// Omni (16/09) despacharam 7/7 e 11/11 e morreram ~40 s depois do claim como `no_detail:unreported_stage_failure`.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const src = rd('app/api/compose/route.ts')

console.log('== o contexto vive FORA do try (o catch final precisa dele) ==')
const iPost = src.indexOf('export async function POST(req: NextRequest) {')
const iCtx = src.indexOf("const composeCtx: { userId: string | null; quality: string | null; generationId: string | null; stage: string } = { userId: null, quality: null, generationId: null, stage: 'start' }")
const iTry = src.indexOf('\n  try {', iPost)
checa('composeCtx declarado depois da assinatura do POST e ANTES do try', iPost > 0 && iCtx > iPost && iTry > iCtx)
checa('quem/motor/geração entram assim que o claim existe', src.includes("composeCtx.userId = authenticatedUserId; composeCtx.generationId = generationId; composeCtx.quality = quality; composeCtx.stage = 'claimed'"))

console.log('== os estágios da estrada hollywood (onde H3/Omni morriam) e da clássica têm nome ==')
for (const st of ['hollywood_clip_transcription:${sceneIdx + 1}', 'hollywood_timeline', 'hollywood_narrations', 'hollywood_host_tts', 'voiceover_whisper_and_upload']) {
  checa(`estágio "${st}" marcado antes do trabalho`, src.includes(`composeCtx.stage = ${st.includes('${') ? '`' + st + '`' : "'" + st + "'"}`))
}
checa('o marcador da transcrição por clipe vem ANTES da chamada ao Whisper', /composeCtx\.stage = `hollywood_clip_transcription:\$\{sceneIdx \+ 1\}`[^\n]*\n\s*const lido = await transcribeClipWithTimestampsAndDuration/.test(src))
checa('o marcador da régua vem ANTES do assertCinematicTimeline', /composeCtx\.stage = 'hollywood_timeline'[^\n]*\n\s*try \{\n\s*assertCinematicTimeline\(hollywoodClips, duration\)/.test(src))

console.log('== o catch final grava o evento e responde com motivo ==')
const iCatch = src.lastIndexOf('} catch (error: unknown) {')
const catchBody = src.slice(iCatch, iCatch + 1600)
checa('catch final existe uma vez, no fim do POST', iCatch > 0 && src.indexOf('} catch (error: unknown) {') === iCatch)
checa('grava compose_failed com quality, generation_id, stage, message e stack_head — ESPERADO (await), não void', /await logComposeEvent\('compose_failed', 'compose_unexpected_error', composeCtx\.userId, \{\s*quality: composeCtx\.quality,\s*generation_id: composeCtx\.generationId,\s*stage: composeCtx\.stage,\s*message: msg\.slice\(0, 400\),/.test(catchBody) && catchBody.includes('stack_head:'))
checa('a resposta 500 carrega reason, stage, detail e generationId (o ledger do cliente deixa de sintetizar no_detail)', catchBody.includes("reason: 'compose_unexpected_error', stage: composeCtx.stage, detail: msg.slice(0, 200), generationId: composeCtx.generationId") && /\{ status: 500 \}/.test(catchBody))
checa('logComposeEvent continua best-effort (nunca lança) — o evento não pode virar uma segunda falha', /async function logComposeEvent\([\s\S]{0,400}try \{/.test(src))

console.log('== mutantes ==')
{
  const mut = src.replace(/\s*await logComposeEvent\('compose_failed'[\s\S]*?\}\)\n/, '\n')
  checa('mutante (catch sem o evento) aplicou', mut !== src)
  const body = mut.slice(mut.lastIndexOf('} catch (error: unknown) {'), mut.lastIndexOf('} catch (error: unknown) {') + 1600)
  checa('mutante é pego: sem compose_failed no catch', !/await logComposeEvent\('compose_failed'/.test(body))
}
{
  const mut = src.replace("await logComposeEvent('compose_failed'", "void logComposeEvent('compose_failed'")
  checa('mutante (void em vez de await — morre na Vercel) é pego', mut !== src && !/await logComposeEvent\('compose_failed'/.test(mut))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
