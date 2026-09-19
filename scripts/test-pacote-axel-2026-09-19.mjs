// PACOTE AXEL (18-19/09; fundador: "Vai nos 2" + "Vai, conserta isso e me avisa quando subir")
// A. sem auto-start pós-pagamento · B. render conduzido pelo servidor (pedido + cron órfão + modo serviço) ·
// C. duração segue o roteiro da pessoa · D. painel não diz "gerando" para tentativa que falhou. Sem rede, sem banco.
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

console.log('C) duração segue o roteiro — decisão pura (caso Axel: 34 s de fala, seletor 60 s)')
const dSrc = rd('lib/durationFollowsScript.ts')
const D = roda(dSrc)
const axel = D.decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 60, speechSeconds: 34, largestFitting: 35, floorSeconds: 15 })
checa('Axel: desce de 60 para 35 e renderiza', axel !== null && axel.to === 35 && axel.from === 60 && axel.speechSeconds === 34)
checa('fala que enche o alvo: não mexe', D.decideDurationFollowsScript({ fitOk: true, ownScript: true, requestedSeconds: 60, speechSeconds: 60, largestFitting: 60, floorSeconds: 15 }) === null)
checa('roteiro escrito pela IA (não é da pessoa): não mexe — a régua do escritor cuida', D.decideDurationFollowsScript({ fitOk: false, ownScript: false, requestedSeconds: 60, speechSeconds: 34, largestFitting: 35, floorSeconds: 15 }) === null)
checa('nada cabe (fala de 8 s): recusa honesta continua', D.decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 60, speechSeconds: 8, largestFitting: null, floorSeconds: 15 }) === null)
checa('hollywood com piso 30 s e só 35 cabendo: desce (35 ≥ 30)', D.decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 90, speechSeconds: 36, largestFitting: 35, floorSeconds: 30 })?.to === 35)
checa('nunca sobe', D.decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 35, speechSeconds: 34, largestFitting: 35, floorSeconds: 15 }) === null)
const mutD = dSrc.replace("if (to >= from) return null // descer, nunca subir", 'if (false) return null')
checa('mutante (subir) é pego', roda(mutD).decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 35, speechSeconds: 34, largestFitting: 35, floorSeconds: 15 }) !== null)
const cin = rd('app/api/generate-video-cinematic/route.ts')
checa('cinematic: a decisão roda DENTRO do bloco verbatim, depois do resgate fantasma e ANTES da recusa', /decideDurationFollowsScript\(\{[\s\S]{0,400}ownScript: true,[\s\S]{0,300}largestFitting: largestFittingDuration\(fit\.speech\)/.test(cin) && cin.indexOf('const seguir = decideDurationFollowsScript(') < cin.indexOf("await releaseBirthClaim('narration_too_short_no_charge')"))
checa('cinematic: ao descer, refaz a medição e grava duration_followed_script', /duration = seguir\.to\s*\n\s*fit = narrationFitAt\(parsedScript\.narration, duration, narrationRate\)/.test(cin) && cin.includes('name: DURATION_FOLLOWED_SCRIPT_EVENT'))

console.log('B) render conduzido pelo servidor — pedido, órfão, modo serviço')
const jSrc = rd('lib/renderJobs.ts')
const J = roda(jSrc)
const bom = { attempt_id: 'e5710bde-42da-4382-a1f2-cc2d1252a820', engine: 'fast', prompt: 'The animal deadlier than sharks', duration: 35, language: 'en', aspect: '9:16', script_mode: 'ai' }
checa('pedido válido passa', J.sanitizeRenderJobPayload(bom)?.attempt_id === bom.attempt_id)
checa('motor que não é Kineo 1 é recusado (os de IA já têm claim no servidor)', J.sanitizeRenderJobPayload({ ...bom, engine: 'seedance' }) === null)
checa('duração fora do seletor é recusada', J.sanitizeRenderJobPayload({ ...bom, duration: 47 }) === null)
checa('attempt_id inválido é recusado', J.sanitizeRenderJobPayload({ ...bom, attempt_id: 'x' }) === null)
const t0 = Date.parse('2026-09-19T02:04:51Z')
const agora = t0 + 10 * 60 * 1000
checa('Axel 10 min depois, sem progresso do servidor, sem pedido novo: ÓRFÃO', J.decideOrphanJob({ openedAtMs: t0, nowMs: agora, taken: false, serverProgressAfter: false, newerJob: false }).orphan === true)
checa('2 min depois: cedo demais (a aba pode estar viva)', J.decideOrphanJob({ openedAtMs: t0, nowMs: t0 + 2 * 60 * 1000, taken: false, serverProgressAfter: false, newerJob: false }).reason === 'too_young')
checa('servidor já viu fast_scene_plan/claim depois do pedido: não é órfão', J.decideOrphanJob({ openedAtMs: t0, nowMs: agora, taken: false, serverProgressAfter: true, newerJob: false }).reason === 'server_progressed')
checa('a pessoa fez outro pedido depois: o velho morre', J.decideOrphanJob({ openedAtMs: t0, nowMs: agora, taken: false, serverProgressAfter: false, newerJob: true }).reason === 'newer_job')
checa('já tomado por outra rodada: nunca duas vezes', J.decideOrphanJob({ openedAtMs: t0, nowMs: agora, taken: true, serverProgressAfter: false, newerJob: false }).reason === 'already_taken')
checa('7 h depois: velho demais', J.decideOrphanJob({ openedAtMs: t0, nowMs: t0 + 7 * 3600 * 1000, taken: false, serverProgressAfter: false, newerJob: false }).reason === 'too_old')
const mutJ = jSrc.replace("if (input.serverProgressAfter) return { orphan: false, reason: 'server_progressed' }", '')
checa('mutante (ignorar progresso do servidor → filme em dobro) é pego', roda(mutJ).decideOrphanJob({ openedAtMs: t0, nowMs: agora, taken: false, serverProgressAfter: true, newerJob: false }).orphan === true)
checa('o corpo que vai ao fast só leva o que a rota entende', JSON.stringify(Object.keys(J.fastRequestFromJob(J.sanitizeRenderJobPayload(bom))).sort()) === JSON.stringify(['duration', 'language', 'orphan_job', 'prompt']))
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('cliente grava o pedido logo depois de video_generation_started, com keepalive, só no Kineo 1', /trackEvent\('video_generation_started', dispatchMetadata\)[\s\S]{0,900}if \(mode === 'fast' \|\| mode === 'creator'\) \{[\s\S]{0,300}fetch\('\/api\/render-jobs', \{[\s\S]{0,200}keepalive: true/.test(gc))
const rj = rd('app/api/render-jobs/route.ts')
checa('rota do pedido exige login, valida e grava render_job_opened com session_id = attempt_id', rj.includes("if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })") && rj.includes('sanitizeRenderJobPayload(body)') && rj.includes('sessionId: job.attempt_id'))
const cron = rd('app/api/cron/finish-orphan-jobs/route.ts')
checa('cron: CRON_SECRET fail-closed, marca render_job_taken ANTES de chamar o fast, teto por rodada', cron.includes("if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })") && cron.indexOf('name: RENDER_JOB_TAKEN_EVENT') < cron.indexOf('const res = await fastPost(fastReq)') && cron.includes('if (finished >= MAX_JOBS_PER_RUN)'))
checa('cron: chama /api/generate-video-fast EM PROCESSO com os headers de serviço', cron.includes("import { POST as fastPost } from '@/app/api/generate-video-fast/route'") && cron.includes("'x-kineo-service-user': userId"))
const fast = rd('app/api/generate-video-fast/route.ts')
checa('fast: modo serviço exige Bearer CRON_SECRET + x-kineo-service-user uuid; sem eles, cookie de sempre', fast.includes("req.headers.get('authorization') === `Bearer ${serviceSecret}`") && fast.includes("/^[0-9a-f-]{36}$/i.test(serviceUserHeader)") && fast.includes('supabase = createClient()'))
const vj = rd('vercel.json')
checa('cron agendado a cada 10 min', /"path": "\/api\/cron\/finish-orphan-jobs",\s*\n\s*"schedule": "\*\/10 \* \* \* \*"/.test(vj))

console.log('A) sem auto-start pós-pagamento')
const cs = rd('lib/growth/checkoutSuccessFirstFilm.ts')
checa('interruptor dos cards DESLIGADO', roda(cs).CHECKOUT_SUCCESS_TOPIC_CARDS_ENABLED === false)
const sp = rd('app/checkout/success/page.tsx')
checa('página de sucesso: caminho único para o Studio com caixa vazia; cards só atrás do interruptor', sp.includes('data-kineo="primeiro-filme-sem-autostart"') && sp.includes('{CHECKOUT_SUCCESS_TOPIC_CARDS_ENABLED && selfServeReady && topics.length > 0'))
checa('o link do Studio não carrega create_intent (nada auto-inicia)', !roda(cs).checkoutSuccessFirstFilmCopy().href.includes('create_intent'))

console.log('D) painel ao vivo')
const live = rd('app/api/admin/live/route.ts')
checa('"gerando vídeo" só sem falha na janela; falha vira "tentou gerar e falhou"', live.includes("if (tentouGerar && !falhouNaJanela) { did.push('🎬 gerando vídeo')") && live.includes("did.push('✋ tentou gerar e falhou')"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
