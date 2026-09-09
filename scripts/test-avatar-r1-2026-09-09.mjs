// KINEO-AVATAR-R1-2026-09-09 — guardião do Avatar depois do relatório dos motores.
//
// O que foi medido em 09/09: 4 filmes de Avatar/Presenter na história, todos de
// julho, todos com 3 segundos (o compose usa a duração REAL da narração e o
// roteiro de teste era uma frase), 0 clientes, e ZERO eventos de servidor em
// todo o fluxo. Os seis modelos da fal continuam no ar (HTTP 200 em 09/09).
//
// Este guardião trava: (1) narração < 12 s não vira render pago e libera a
// submissão antes de responder; (2) o fluxo grava despacho, submissão ao
// fornecedor e desfecho; (3) dry-run continua sem piso (é só voz, $0);
// (4) o compose continua usando a duração real (não inventa 30 s).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const g = rd('app/api/generate-avatar/route.ts')
const st = rd('app/api/avatar-status/route.ts')

console.log('== piso de narração ==')
checa('constante AVATAR_MIN_NARRATION_SECONDS = 12', /const AVATAR_MIN_NARRATION_SECONDS = 12/.test(g))
checa('menos de 12 s de fala → 422 narration_too_short, só fora do dry-run', /if \(!dryRun && realAudioDuration < AVATAR_MIN_NARRATION_SECONDS\) \{/.test(g) && /narration_too_short: true/.test(g) && /\{ status: 422 \}/.test(g))
checa('a submissão é liberada ANTES de responder (nada preso, nada cobrado)', /if \(!dryRun && realAudioDuration < AVATAR_MIN_NARRATION_SECONDS\) \{\n\s+await releaseAvatarSubmission\(\)/.test(g))
checa('a mensagem diz quanto tem, quanto precisa e que não cobrou', /You were not charged\./.test(g) && /at least \$\{AVATAR_MIN_NARRATION_SECONDS\} seconds of speech/.test(g))
{
  const iGuard = g.indexOf('realAudioDuration < AVATAR_MIN_NARRATION_SECONDS')
  const iUpload = g.indexOf('voiceoverUrl = await uploadVoiceoverToSupabase(user.id, audioBuffer)')
  const iSubmit = g.indexOf('submitAvatarJob(')
  checa('o piso roda ANTES do upload do mp3 e ANTES da submissão paga', iGuard > 0 && iUpload > iGuard && iSubmit > iGuard)
}

console.log('== telemetria de ponta a ponta ==')
checa('generate-avatar importa writeServerEvent', /import \{ writeServerEvent \} from '@\/lib\/serverEvents'/.test(g))
checa('avatar_dispatch_received com engine, dry_run e duração real', /name: 'avatar_dispatch_received'/.test(g) && /real_audio_duration: Number\(realAudioDuration\.toFixed\(1\)\)/.test(g))
checa('avatar_narration_too_short gravado', /name: 'avatar_narration_too_short'/.test(g))
checa('avatar_provider_submitted com request_id, custo estimado e créditos', /name: 'avatar_provider_submitted'/.test(g) && /request_id: requestId/.test(g) && /estimated_cost_usd/.test(g) && /credits: AVATAR_CREDIT_COST/.test(g))
checa('avatar-status grava o desfecho (failed com estorno, done com débito)', /import \{ writeServerEvent \} from '@\/lib\/serverEvents'/.test(st) && (st.match(/name: 'avatar_provider_settled'/g) || []).length === 2 && /status: 'failed', credits_refunded: creditsRefunded/.test(st) && /status: 'done', generation_id: bound\.claim\.generationId/.test(st))

console.log('== o que NÃO mudou ==')
checa('dry-run continua sem piso (voz só, $0)', /if \(!dryRun && realAudioDuration < AVATAR_MIN_NARRATION_SECONDS\)/.test(g))
checa('tetos de 60 s do OmniHuman/VEED/Pro continuam', /engine === 'omnihuman' && realAudioDuration > 60/.test(g) && /\(engine === 'fabric' \|\| engine === 'presenter_pro' \|\| engine === 'lipsync'\) && realAudioDuration > 60/.test(g))
checa('compose segue usando a duração real da narração (Avatar Studio manda max(3, ceil(realAudio)))', /duration: run\.realAudioDuration != null \? Math\.max\(3, Math\.ceil\(run\.realAudioDuration\)\) : run\.requestDuration/.test(rd('app/(dashboard)/avatar/AvatarStudioClient.tsx')))
checa('custos intactos: presenter 70, demais 110', /const AVATAR_CREDIT_COST = engine === 'presenter' \? 70 : 110/.test(g))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — avatar r1: piso de 12 s de fala, rastro de despacho/submissão/desfecho, dry-run e tetos intactos')
