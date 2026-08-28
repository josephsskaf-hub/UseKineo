// KINEO-VELOCIDADE-2026-08-28 — provas da leva "videos mais rapidos, melhora limpa"
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c, d='') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { bad++; console.log(`  ✗ ${n}${d?' — '+d:''}`) } }
const ler = (p) => readFileSync(join(R, p), 'utf8')
const cod = (p) => ler(p).split('\n').filter(l=>!/^\s*(\/\/|\*)/.test(l)).join('\n')

console.log('\n═══ VELOCIDADE — a narração sai do caminho crítico ═══\n')

console.log('A) A rota de pré-aquecimento')
const pw = ler('app/api/prewarm-voiceover/route.ts')
chk('exige login', pw.includes("reason: 'auth'"))
chk('recusa sem speed explícito (chave não derivável = não chutar)', pw.includes("reason: 'no_explicit_speed'"))
chk('usa EXATAMENTE a mesma chave do compose (salt compartilhada)', pw.includes('VOICEOVER_ENGINE_VERSION') && pw.includes('computeVoiceoverCacheKey'))
chk('mesma identidade de voz (resolveTtsVoiceIdentity)', pw.includes('resolveTtsVoiceIdentity(script, speed, vertical, narrationTier, language, model)'))
chk('hit de cache = retorna sem sintetizar', pw.includes('if (hit) return NextResponse.json({ warmed: true, cached: true })'))
chk('NUNCA devolve erro fatal (fire-and-forget seguro)', pw.includes("reason: 'error'") && !pw.includes('status: 500'))
chk('teto anti-abuso no script', pw.includes('raw.length > 4000'))

console.log('\nB) A salt tem fonte única')
chk('lib/compose exporta VOICEOVER_ENGINE_VERSION', cod('lib/compose.ts').includes("export const VOICEOVER_ENGINE_VERSION = 'v2-push93-section-ellipsis'"))
const rota = cod('app/api/compose/route.ts')
chk('o compose IMPORTA a salt (const local morreu)', rota.includes("import { VOICEOVER_ENGINE_VERSION } from '@/lib/compose'") && !rota.includes("const VOICEOVER_ENGINE_VERSION ="))
chk('o caminho de cache do compose está INTACTO (hit continua pulando TTS+Whisper)', ler('app/api/compose/route.ts').includes('reusing cached voiceover — skipping TTS + Whisper'))

console.log('\nC) O gatilho no cliente')
const g = ler('app/(dashboard)/generate/GenerateClient.tsx')
chk('dispara ao entrar em fal_polling, fire-and-forget', g.includes("void fetch('/api/prewarm-voiceover'"))
chk('só com speed explícito', g.includes("typeof data.speed === 'number'"))
chk('a falha do prewarm é engolida (catch vazio)', g.includes('}).catch(() => {})'))

console.log('\nD) O prazo honesto na espera')
chk('a linha de status anuncia a mediana real (~3 min)', g.includes('typically ready in ~3 min'))
chk('o contador de cenas continua (k/N done)', g.includes('${falClipsDone.done}/${falClipsDone.total} done'))

console.log('\nE) Item 3 (Kling paralelo) foi CORTADO por decisão — nada mudou lá')
chk('submitAllScenes segue com a política serial/paralela original', ler('app/api/generate-video-cinematic/route.ts').includes('kept serial when unsure'))

console.log('\nF) AUDITORIA 28/08 — os 2 bugs pegos antes do push nunca podem voltar')
// BUG 1: o compose faz hash do script DEPOIS de stripScriptMarkers; a v1 do
// prewarm fazia hash do CRU → chave sempre diferente → cache nunca acertava
// e o TTS era pago DUAS vezes. A prova: o prewarm deriva com as MESMAS duas
// funções do compose, na mesma ordem (strip → salvage).
chk('prewarm deriva o script com stripScriptMarkers (igual ao compose)', pw.includes('stripScriptMarkers(raw)'))
chk('prewarm tem o fallback salvage (igual ao compose)', pw.includes('salvageScriptNarration(raw)'))
chk('prewarm NÃO faz hash do texto cru', !cod('app/api/prewarm-voiceover/route.ts').includes('body.script.trim()'))
// BUG 2: hollywood/h3/omni narram POR CENA — o compose retorna antes do cache
// de trilho único. Aquecer ali = um TTS inteiro pago que ninguém lê. Idem com
// voz própria/clonada. O gatilho do cliente exclui os quatro casos.
chk('cliente não aquece hollywood', g.includes("falQualityRef.current !== 'cinematic_hollywood'"))
chk('cliente não aquece h3 nem omni', g.includes("falQualityRef.current !== 'cinematic_h3'") && g.includes("falQualityRef.current !== 'cinematic_omni'"))
chk('cliente não aquece com voz própria ou clonada', g.includes('!myVoiceUrl && !useClonedVoice'))
chk('o guard governa o disparo', g.includes('prewarmUsesSingleTrackCache && typeof data.voiceover_script'))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)
