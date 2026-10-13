// KINEO-OMNI-ETAPA1-2026-10-13 — guardião: a recusa do compose ANTES do fornecedor grava `compose_failed` com motivo,
// estágio e a frase.
//
// Diagnóstico (docs/OMNI-ETAPA1-2026-10-13.md): os 2 filmes Omni que "morreram no compose sem motivo gravado"
// (8a519488 15/09 22:40Z e e7918140 16/09 04:36Z) NÃO passaram pelo catch geral instrumentado em 22/09
// (KINEO-COMPOSE-FALHA-COM-NOME): foram RECUSAS de qualidade em rejectBeforeProviderSubmission —
// cinematic_timeline_too_short (6 de 7 cenas; 1 job do Omni terminal na fal) e scene_narration_failed (TTS da cena 8).
// O motivo ficou só em compose_submission_claim.quality_rejection.reason (sem a frase); o cliente gravou
// `no_detail:unreported_stage_failure`. O mesmo buraco pegou o H3 7127d8b4 em 25/09 (scene_speech_exceeds_footage) —
// DEPOIS da instrumentação de 22/09. Este guardião EXECUTA a função real da rota (extraída e transpilada) com dublês:
//   (1) cada recusa (qualidade, voz, 500 de montagem) grava UM compose_failed, AWAIT, ANTES de responder;
//   (2) o evento carrega motivo, estágio, generation_id, quality, http_status, code e a frase do servidor;
//   (3) o caminho financeiro (rejectCinematicQuality / releaseGenerationClaim / resposta) segue igual;
//   (4) mutantes: sem o evento, com `void`, e o evento depois da resposta — todos pegos.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ', n) } else { falhas.push(n); console.log('  FALHA', n) } }
const src = rd('app/api/compose/route.ts')

const INICIO = '    async function rejectBeforeProviderSubmission(response: NextResponse): Promise<NextResponse> {'
const extrai = (texto) => {
  const i = texto.indexOf(INICIO)
  const j = texto.indexOf('\n    }\n', i)
  return i > 0 && j > i ? texto.slice(i, j + 7) : ''
}
const funcao = extrai(src)
checa('a função real existe e foi extraída', funcao.length > 500)
checa('a função é única no arquivo', src.indexOf(INICIO) === src.lastIndexOf(INICIO))
checa('o evento é AWAIT e vem antes do primeiro return', (() => { const e = funcao.indexOf("await logComposeEvent('compose_failed'"); const r = funcao.indexOf('return '); return e > 0 && r > e })())

function roda(fonte, { body, status = 422, debited = true, stage = 'hollywood_timeline' }) {
  const ordem = []
  const eventos = []
  const ctx = {
    authenticatedUserId: 'u-1', generationId: 'g-1', quality: 'cinematic_omni', composeCtx: { stage }, cinematicUpstreamDebited: debited,
    composeAdmin: {}, serviceRoleKey: 'x', ownsSubmissionClaim: true, composeProviderAttempted: false,
    logComposeEvent: async (name, reason, userId, metadata) => { ordem.push('evento'); eventos.push({ name, reason, userId, metadata }) },
    rejectCinematicQuality: async (args) => { ordem.push('estorno'); return { reason: args.reason, refunded: true } },
    qualityFailureResponse: (facts, error) => { ordem.push('resposta-qualidade'); return { tipo: 'qualidade', facts, error } },
    releaseGenerationClaim: async () => { ordem.push('libera') },
    String, Promise,
  }
  ctx.globalThis = ctx
  const response = { status, clone: () => ({ json: async () => body }), tipo: 'original' }
  ctx.__resp = response
  const code = ts.transpileModule(`${fonte}\nglobalThis.__p = rejectBeforeProviderSubmission(globalThis.__resp)`, { compilerOptions: { target: 9, module: 99 } }).outputText
  vm.runInNewContext(code, ctx)
  return ctx.__p.then((r) => ({ r, ordem, eventos }))
}

console.log('== (1)-(3) as recusas reais ==')
const timeline = await roda(funcao, { body: { error: 'Your completed scenes cover 52s, below the requested 60s. The existing clips have been kept; no final render was submitted. Contact support to recover this generation.', qualityCheckFailed: true, reason: 'cinematic_timeline_too_short', retryable: false, generationId: 'g-1' } })
const ev = timeline.eventos[0]
checa('8a519488 (timeline curta): 1 compose_failed com o motivo da qualidade', timeline.eventos.length === 1 && ev.name === 'compose_failed' && ev.reason === 'cinematic_timeline_too_short' && ev.userId === 'u-1')
checa('… com estágio, geração, motor, http e a FRASE (os 52 s)', ev.metadata.kind === 'rejected_before_provider' && ev.metadata.stage === 'hollywood_timeline' && ev.metadata.generation_id === 'g-1' && ev.metadata.quality === 'cinematic_omni' && ev.metadata.http_status === 422 && ev.metadata.message.includes('cover 52s, below the requested 60s') && ev.metadata.upstream_debited === true)
checa('… o evento vem ANTES do estorno e da resposta; o caminho financeiro segue igual', JSON.stringify(timeline.ordem) === JSON.stringify(['evento', 'estorno', 'resposta-qualidade']) && timeline.r.tipo === 'qualidade' && timeline.r.facts.reason === 'cinematic_timeline_too_short')
const narr = await roda(funcao, { stage: 'hollywood_host_tts', body: { error: "Scene 8's narration could not be verified. Your generated clips are preserved; no replacement voice was added.", code: 'cinematic_narration_unverified', recoverable: true } })
checa('e7918140 (TTS da cena 8): reason scene_narration_failed, code e estágio do TTS', narr.eventos.length === 1 && narr.eventos[0].reason === 'scene_narration_failed' && narr.eventos[0].metadata.code === 'cinematic_narration_unverified' && narr.eventos[0].metadata.stage === 'hollywood_host_tts' && narr.eventos[0].metadata.message.startsWith("Scene 8's narration"))
const monta = await roda(funcao, { status: 500, stage: 'hollywood_source', body: { error: 'Could not assemble the render: clip 3 has no url' } })
checa('500 de montagem sem motivo mapeado: reason http_500 + a frase; resposta ORIGINAL devolvida, claim liberado', monta.eventos.length === 1 && monta.eventos[0].reason === 'http_500' && monta.eventos[0].metadata.message.includes('clip 3 has no url') && monta.r.tipo === 'original' && JSON.stringify(monta.ordem) === JSON.stringify(['evento', 'libera']))
const semCorpo = await roda(funcao, { status: 400, body: null, debited: false })
checa('resposta sem JSON: não quebra (reason http_400, message vazia)', semCorpo.eventos.length === 1 && semCorpo.eventos[0].reason === 'http_400' && semCorpo.eventos[0].metadata.message === '' && semCorpo.eventos[0].metadata.code === null)
const naoDebitado = await roda(funcao, { debited: false, body: { reason: 'cinematic_timeline_too_short', error: 'x' } })
checa('qualidade sem débito upstream: evento + libera + resposta de qualidade (como antes)', JSON.stringify(naoDebitado.ordem) === JSON.stringify(['evento', 'libera', 'resposta-qualidade']))

console.log('== (4) mutantes ==')
const TRECHO_EVENTO = /\n      await logComposeEvent\('compose_failed'[\s\S]*?\}\) \/\/ KINEO-OMNI-ETAPA1-2026-10-13\n/
{
  const mut = funcao.replace(TRECHO_EVENTO, '\n')
  checa('mutante (sem o evento) aplicou', mut !== funcao)
  const r = await roda(mut, { body: { reason: 'cinematic_timeline_too_short', error: 'x' } })
  checa('mutante (sem o evento) é pego', r.eventos.length === 0)
}
{
  const mut = funcao.replace("await logComposeEvent('compose_failed'", "void logComposeEvent('compose_failed'")
  checa('mutante (void em vez de await) é pego', mut !== funcao && !/await logComposeEvent\('compose_failed'/.test(mut))
}
{
  const bloco = funcao.match(TRECHO_EVENTO)?.[0] ?? ''
  const mut = funcao.replace(TRECHO_EVENTO, '\n').replace('\n      return response\n', `${bloco}      return response\n`)
  const r = await roda(mut, { body: { reason: 'cinematic_timeline_too_short', error: 'x' } })
  checa('mutante (evento depois da resposta de qualidade) é pego', bloco.length > 0 && mut !== funcao && r.eventos.length === 0)
}

console.log('== a cobertura ==')
checa('as 2 mortes do Omni estão no mapa de qualidade (timeline e narração)', funcao.includes("cinematic_timeline_too_short: 'cinematic_timeline_too_short'") && funcao.includes("cinematic_narration_unverified: 'scene_narration_failed'"))
checa('a régua e o TTS da estrada hollywood recusam por esta função (são os pontos onde o Omni morreu)', /assertCinematicTimeline\(hollywoodClips, duration\)[\s\S]{0,400}return rejectBeforeProviderSubmission\(/.test(src) && /code: 'cinematic_narration_unverified'/.test(src))
checa('o catch geral de 22/09 continua (exceção)', src.includes("await logComposeEvent('compose_failed', 'compose_unexpected_error', composeCtx.userId, {"))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { for (const f of falhas) console.log('FALHA:', f); process.exit(1) }
