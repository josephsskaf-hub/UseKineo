// KINEO-TRES-MODOS-2026-09-11 — guardião dos três modos e do MODO CLIPE.
//
// Caso real: render 802f024e (11/09) — a pessoa colou um plano JSON de 10 s
// (Luffy vs. Akainu) e a Kineo narrou o JSON por cima de lava (49 s, 15 cr).
// Ordem do fundador: três modos — a IA escreve; você traz a história; ou "só
// cria as imagens do que eu descrevi" (clipe, sem narrador).
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

console.log('== a lib, executada com o texto REAL do caso ==')
const S = roda(rd('lib/cinematic/shotSpec.ts'))
const REAL = '{\n\n"clip": "07",\n\n"duration": "10 seconds",\n\n"action": "Luffy rapidly dodges the descending magma fists using extreme speed. Every dodge is purposeful and moves him closer to Akainu.",\n\n"camera": "High-speed FPV drone weaving through falling magma, tracking Luffy from behind, side tracking, then overhead shot showing Luffy\'s route directly toward Akainu.",\n\n"vfx": "magma explosions, burning debris, shockwaves, smoke trails, steam.",\n\n"combat_logic": "Luffy never randomly changes direction; every dodge is purposeful."\n}'
const r = S.detectShotSpec(REAL)
checa('o JSON do caso é reconhecido como plano', r.isShotSpec === true && r.reason === 'json_shot_spec')
checa('10 segundos lidos do campo duration', r.seconds === 10)
checa('o prompt vira prosa com a ação primeiro e sem "clip"/"duration"', r.prompt.startsWith('Luffy rapidly dodges') && !/clip|duration/i.test(r.prompt) && /camera:/i.test(r.prompt))
checa('chaves reconhecidas incluem action/camera/vfx', ['action', 'camera', 'vfx'].every((k) => r.keys.includes(k)))
const keyed = S.detectShotSpec('Shot: 07\nDuration: 8 seconds\nAction: a samurai draws his sword in the rain\nCamera: slow dolly in, low angle\nStyle: anime')
checa('linhas "chave: valor" também são plano (8 s)', keyed.isShotSpec && keyed.reason === 'keyed_shot_spec' && keyed.seconds === 8 && /samurai draws/.test(keyed.prompt))
const cam = S.detectShotSpec('FPV drone shot weaving between skyscrapers at night, neon reflections, slow motion, 6 seconds')
checa('linguagem de câmera curta sem narrativa é plano (6 s)', cam.isShotSpec && cam.reason === 'camera_language' && cam.seconds === 6)
checa('história em primeira pessoa NÃO é plano', S.detectShotSpec("My name is Tomás, and I was the last lighthouse keeper. Every night I climbed the steps.").isShotSpec === false)
checa('documentário com "close-up" mas com narrativa NÃO é plano', S.detectShotSpec('Did you know the Sahara was green 6,000 years ago? A close-up of ancient rock art shows swimmers. This is how the desert was born.').isShotSpec === false)
checa('roteiro longo com palavra "camera" NÃO é plano', S.detectShotSpec(Array(70).fill('word').join(' ') + ' handheld camera').isShotSpec === false)
checa('segundos fora de 4–12 são presos ao teto do Seedance', S.detectShotSpec('{"duration":"30 seconds","action":"x","camera":"y"}').seconds === 12 && S.detectShotSpec('{"duration":"1 second","action":"x","camera":"y"}').seconds === 4)
checa('sem duração → 10 s', S.detectShotSpec('{"action":"a cat jumps","camera":"low angle"}').seconds === 10)
checa('buildClipPrompt cola a moldura e o anti-texto', /9:16 vertical framing/.test(S.buildClipPrompt(r, '9:16')) && /no readable text/.test(S.buildClipPrompt(r, '16:9')) && /16:9 widescreen/.test(S.buildClipPrompt(r, '16:9')))
checa('CLIP_CREDITS = 5', S.CLIP_CREDITS === 5)

console.log('== as rotas ==')
const gc = rd('app/api/generate-clip/route.ts')
checa('generate-clip: debita ANTES do POST ao fal e estorna em falha não-ambígua', gc.indexOf('debitVideoCredits(supabase, { userId: user.id, renderId, cost: CLIP_CREDITS })') < gc.indexOf('submitFalQueueOnce(SEEDANCE_MODEL, input)') && /if \(!ambiguous\) await refundRenderCredits\(renderId\)/.test(gc))
checa('generate-clip: Seedance sem áudio, duração exata, aspect do pedido', /generate_audio: false/.test(gc) && /duration: String\(seconds\)/.test(gc) && /aspect_ratio: aspect/.test(gc))
checa('generate-clip: grava a posse (clip_submitted com request_id e session_id = render_id)', /name: 'clip_submitted'/.test(gc) && /session_id: renderId/.test(gc) && /request_id: requestId/.test(gc))
const cs = rd('app/api/clip-status/route.ts')
checa('clip-status: só responde ao dono (clip_submitted por user_id + session_id)', /\.eq\('name', 'clip_submitted'\)\.eq\('user_id', user\.id\)\.eq\('session_id', renderId\)/.test(cs))
checa('clip-status: persiste no bucket ANTES de declarar entregue e grava videos com quality_mode clip', cs.indexOf('persistRenderAssets({ userId: user.id, renderId, videoUrl: providerUrl') < cs.indexOf("quality_mode: 'clip'") && /credits_used: CLIP_CREDITS/.test(cs))
checa('clip-status: falha do fornecedor estorna e grava clip_failed', /refundRenderCredits\(renderId\)/.test(cs) && /name: 'clip_failed'/.test(cs))
checa('clip-status: idempotente (linha em videos completed responde done sem novo POST)', /if \(existing\?\.\[0\]\?\.status === 'completed'\)/.test(cs))

console.log('== o guarda nas rotas narradas ==')
const cin = rd('app/api/generate-video-cinematic/route.ts')
const fast = rd('app/api/generate-video-fast/route.ts')
for (const [nome, src] of [['cinematic', cin], ['fast', fast]]) {
  checa(`${nome}: plano colado → 422 shot_spec_detected antes de qualquer débito`, /reason: 'shot_spec_detected'/.test(src) && /detectShotSpec\(prompt\)/.test(src))
  checa(`${nome}: a mensagem aponta o modo clipe`, /Just this clip \(no narration\)/.test(src))
}
checa('cinematic: o guarda vem antes do claim de nascimento', cin.indexOf("reason: 'shot_spec_detected'") < cin.indexOf('validCinematicGenerationId(generationId)'))

console.log('== o Studio ==')
const st = rd('app/(dashboard)/studio/StudioClient.tsx')
checa('terceiro modo no seletor', /data-testid="script-mode-clip"/.test(st) && /Just this clip \(no narration\)/.test(st))
checa('modo clip: Generate roda o fluxo do clipe sem navegar para /generate', /if \(scriptMode === 'clip'\) \{ void generateClip\(\); return \}/.test(st))
checa('fluxo: POST /api/generate-clip → poll /api/clip-status a cada 5 s → vídeo + download', /fetch\('\/api\/generate-clip'/.test(st) && /\/api\/clip-status\?render_id=/.test(st) && /Download MP4/.test(st))
checa('botão diz o custo: Render clip · 5 cr', /Render clip · 5 cr →/.test(st))
checa('segundos: 5, 8, 10, 12', /\[5, 8, 10, 12\]\.map/.test(st))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
