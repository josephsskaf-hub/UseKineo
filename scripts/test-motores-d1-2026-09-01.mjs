// KINEO-MOTORES-D1-2026-09-01 — provas dos motores novos (voz + música).
// Rodar: node scripts/test-motores-d1-2026-09-01.mjs
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c, d = '') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { bad++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`) } }
const ler = (p) => readFileSync(join(R, p), 'utf8')

console.log('\n═══ MOTORES D1 — voz 2.8 HD + música Lyria 3 Pro ═══\n')

console.log('A) VOZ — MiniMax Speech-2.8 HD no /audio')
const au = ler('app/api/audio/generate/route.ts')
chk('slug novo fal-ai/minimax/speech-2.8-hd', au.includes("slug: 'fal-ai/minimax/speech-2.8-hd'"))
chk('parâmetro é prompt (o 2.8 NÃO aceita text — schema conferido)', au.includes("input: (text) => ({ prompt: text, output_format: 'url', language_boost: 'auto' })"))
chk("output_format:'url' preservado (default do 2.8 é hex = hexdump gigante)", au.includes("output_format: 'url'"))
chk('voz clonada NÃO migrou (voice_id de clone é atado ao modelo criador)', ler('lib/avatar/voice.ts').includes("fal-ai/minimax/speech-02-hd"))

console.log('\nB) MÚSICA — Lyria 3 Pro no slot de trilha existente')
const ly = ler('lib/lyriaMusic.ts')
chk('endpoint correto fal-ai/lyria3/pro', ly.includes("'https://queue.fal.run/fal-ai/lyria3/pro'"))
chk('input só com prompt (schema: sem duração, sem seed; negative deprecado)', ly.includes('JSON.stringify({ prompt: lyriaPromptFor(mood) })'))
chk('lê a saída no campo certo (audio.url)', ly.includes('out.audio?.url'))
chk('instrumental por contrato (narração é o trilho mestre — C1)', ly.includes('Instrumental only'))
chk('prazo próprio: música nunca vira gargalo do compose', ly.includes('LYRIA_BUDGET_MS = 45_000'))
chk('nunca lança: qualquer falha devolve null', ly.includes('return null') && ly.includes("catch (e) {"))

const co = ler('app/api/compose/route.ts')
chk('compose importa o Lyria', co.includes("from '@/lib/lyriaMusic'"))
chk('caminho clássico: Lyria primeiro, Pixabay como rede', co.includes('musicUrl = await getLyriaMusicUrl(') && co.includes('if (!musicUrl) musicUrl = await getBackgroundMusicUrl('))
chk('caminho hollywood: Lyria primeiro, Pixabay como rede', co.includes('hollywoodMusicUrl = await getLyriaMusicUrl(') && /if \(!hollywoodMusicUrl\) \{\s*\n\s*hollywoodMusicUrl = await getBackgroundMusicUrl\(/.test(co))
chk('o slot/mix do Creatomate não mudou (musicUrl continua o mesmo nome)', co.includes('musicUrl: hollywoodMusicUrl'))

console.log('\nC) IMAGEM — Nano Banana Pro (verificação: já estava no ar)')
const im = ler('app/api/images/generate/route.ts')
chk('slug fal-ai/nano-banana-pro presente no /images', im.includes("slug: 'fal-ai/nano-banana-pro'"))
chk('resolução NÃO enviada → default 1K (o 4K dobraria o custo em silêncio)', !im.includes("resolution"))
chk('débito idempotente com estorno em falha continua', im.includes('debitVideoCredits') && im.includes('refund'))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)
