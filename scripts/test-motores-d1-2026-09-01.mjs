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

console.log('\nD) VIDEO — Seedance 2.5 (familia s25, gate interno)')
const rt = ler('lib/hollywood/router.ts')
chk('slugs reais fal-ai/seedance-2.5/* (o do estudo dava 404)', rt.includes("'fal-ai/seedance-2.5/text-to-video'") && rt.includes("'fal-ai/seedance-2.5/image-to-video'"))
chk("familia 's25' no tipo CinematicFamily", rt.includes("'hollywood' | 'h3' | 'omni' | 's25'"))
chk('ponto unico de modelo conhece a familia', rt.includes("if (family === 's25') return hasAnchor ? S25_I2V_MODEL : S25_T2V_MODEL"))
chk('opcao esperta do fundador: 480p ($0.208/s) + Enhance no master', rt.includes('S25_USD_PER_SECOND = 0.208') && rt.includes("S25_RESOLUTION = '480p'"))
const rc = ler('app/api/generate-video-cinematic/route.ts')
chk('s25 entra na MESMA estrada (contrato de cena de graca)', rc.includes('wantsHollywood || wantsH3 || wantsOmni || wantsS25'))
chk('GATE: so conta interna ate os 4 carimbos', rc.includes("wantsS25 && !isInternalEmail(user.email)"))
chk("armadilha 1: duration e STRING '4'..'30'", rc.includes("duration: String(Math.max(4, Math.min(30,"))
chk("armadilha 2: aspect_ratio 9:16 explicito no t2v (default 'auto' deita o filme)", /S25_T2V_MODEL\) \{[^}]*aspect_ratio: '9:16'/s.test(rc))
chk('armadilha 3: generate_audio false (C1 — narracao e do usuario)', /S25_I2V_MODEL\) \{[^}]*generate_audio: false/s.test(rc))
chk('preco FINAL 150cr espelhado nos dois lados da cobranca', rc.includes('S25_CREDIT_COST = 150') && ler('lib/credits/engineCost.ts').includes('return 150'))
chk('#128c CONSERTADO: claim assina o motor REAL (ramo omni existia so no quality)', /claimEngine = wantsS25[^;]*wantsOmni[^;]*'omni'/s.test(rc))
const co2 = ler('app/api/compose/route.ts')
chk('compose monta s25 pelo caminho hollywood (nao o classico)', co2.includes("quality === 'cinematic_omni' || quality === 'cinematic_s25') {"))
chk('mute no compose = segunda trava do audio', co2.includes("|| quality === 'cinematic_s25', // KINEO-S25"))
chk('selo honesto: engineLabel diz Seedance 2.5', ler('lib/engineLabel.ts').includes("cinematic_s25: 'Seedance 2.5'"))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)
