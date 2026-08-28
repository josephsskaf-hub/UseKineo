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
chk('teto anti-abuso no script', pw.includes('script.length > 4000'))

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

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)
