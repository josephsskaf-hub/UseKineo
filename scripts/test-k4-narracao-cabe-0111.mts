// KINEO-K4-NARRACAO-CABE-0111 [TRAVA 8.2 — vai do fundador 02/11 "2 c"] — guardião da opção C:
// o filme grátis Kling 4 (UM clipe de 15 s) só recebe fala que cabe nos 15 s, MEDIDA (a TTS da montagem sintetizada antes do
// POST pago, reaproveitada pelo cache de voz do compose, com prazo próprio) — a medição é a rede de segurança; na dúvida, Seedance.
// E o ESCRITOR, quando o pedido vai ao Kling 4 grátis, escreve para caber: faixa de PALAVRAS por língua tirada destas durações
// medidas, sempre dentro da faixa do Seedance de 15 s (o teto duro da guarda do Seedance não muda).
// Dados: os 20 `cinematic_submission_claim` com kling4_trial.engine_used='kling4' (29/10–01/11) × measured_seconds do
// `render_delivered_measured` seguinte (mvhd). Piso = o filme nunca é mais curto que 15 s: ali a fala real foi ≤ 15 s.
// Rodar: npx tsx scripts/test-k4-narracao-cabe-0111.mts
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { kling4TrialFalaCabe, medirFalaDoKling4Trial, K4_TETO_MEDIDO_SEGUNDOS, K4_PRAZO_DA_MEDICAO_MS, faixaDoKling4NoEscritor, faixaDoKling4ParaOPedido, instrucaoDoKling4NoEscritor, K4_TETO_DO_ESCRITOR_POR_LINGUA, type DepsDaFalaK4 } from '../lib/kling4TrialScript'
import { maxWordsCurtoDoMotor, faixaAceitaNoFilmeCurto } from '../lib/durationByEngine'
import { MIN_COVERAGE } from '../lib/narrationFit'
import { seedanceShortWriterWords } from '../lib/scriptWriterRate'
import { narrationWordCount } from '../lib/textLanguage'
import { parseUserScript } from '../lib/scriptParser'
import { fitShortFilmScript } from '../lib/shortFilmScript'
import type { VozDoFilmeCurto } from '../lib/vozDoFilmeCurto'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// [render, língua, voz, segundos medidos, piso (1 = o filme parou no piso de 15 s), narração do claim]
type Filme = [string, string, string, number, 0 | 1, string]
const FILMES: Filme[] = [
  ['bf06d4bb', 'pt', 'echo', 15, 1, '"Quer uma roupa linda e confortável pra dormir?" "Olha esse baby doll!" "Um modelo delicado, leve e perfeito pra suas noites." "Confira o seu... e escolha sua cor favorita!"'],
  ['ddf69f98', 'en', 'echo', 15.417, 0, 'I checked my security camera to see why I kept waking up at 3 AM. Wednesday... a tall, dark figure crawled into my room, whispered, "He\'s starting to notice us." Then... another face rose from under my bed, looking directly at the camera.'],
  ['de6c89f9', 'en', 'alloy', 16.709, 0, 'This robot had one day left to live… and one final gift to give. A tiny discarded robot collected broken toys, repairing them for lonely children. The robot shuts down... but the little girl\'s teddy bear suddenly lights up with the robot\'s tiny heart-shaped LED.'],
  ['52995fa2', 'pt', 'echo', 18.917, 0, 'Animais fofinhos em 3D... prontos para uma aventura surpreendente! Com expressões engraçadas, eles vão te fazer rir e se encantar. Música infantil animada toca enquanto as cores vibrantes brilham! No final inesperado... a diversão com esses animais fofinhos é garantida!'],
  ['6039e4e5', 'en', 'alloy', 15.5, 0, 'A breathtaking descent into BROKENBASE\'s underground universe. Each letter is a colossal futuristic skyscraper. Lasers shoot out, creating a kaleidoscope of colors. As the camera closes in... BROKENBASE transforms into an epic electronic realm.'],
  ['a603eb9b', 'pl', 'echo', 18.584, 0, 'W Izajasza 53 kryje się tajemnica Mesjasza! Przepowiednia Izajasza mówi o cierpiącym słudze, który przyniesie pokój. Zaskakujące? Prorok przewidział detale: odrzucenie, cierpienie, zbawienie. Dla nas dzisiaj... to przesłanie nadziei i odkupienia. Tajemnica Izajasza 53.'],
  ['802dbace', 'pt', 'echo', 19.792, 0, 'Um resgate desesperado... em um armazém sombrio. Serafina, agente da DIVISÃO-7, tem 18 minutos — infiltração. Guarda 1 — silencioso. Guarda 2 — derrubado. Serafina avança. Krav desafiou... mas Serafina venceu. Resgate completo.'],
  ['f656b348', 'en', 'echo', 15, 1, 'Noah\'s Ark — a story of faith and survival! Long ago, the world was filled with wickedness. But Noah wanted to obey God. A great flood is coming.” After the flood, God placed a rainbow in the sky... a promise kept.'],
  ['4ce89c9c', 'en', 'echo', 15.917, 0, 'Kali and Kameron are ready to play! Kali swoops her toy plane high above the play table. Kameron points to the toy boat bobbing with a friendly toot-toot! What will they choose next? The boat or the train... stay tuned for their guessing game!'],
  ['3d8350e3', 'ar', 'echo', 21.292, 0, 'عنوان: لا تفتح الباب الساعة 3 في الساعة الثالثة فجراً، سمع أحمد طرقاً على باب غرفته. سأل: من؟ جاءه صوت أمه: افتح يا ولدي. فتح جواله واتصل بأمه… فردّت عليه وهي تقول: «لا تفتح الباب… أنا خارج البيت!» وفجأة… سمع صوت أمه يضحك خلف الباب'],
  ['7aa3d055', 'el', 'alloy', 25.417, 0, 'Δημιουργήστε την ιστοσελίδα των ονείρων σας με... NCB Software. Εντυπωσιακά ηλεκτρονικά καταστήματα... που μαγνητίζουν τους πελάτες σας. Απρόσκοπτες εμπειρίες αγορών WooCommerce... για κάθε χρήστη. NCB Software... συνώνυμο της καινοτομίας και της αξιοπιστίας... στην ψηφιακή επιτυχία σας.'],
  ['702699d9', 'en', 'alloy', 16.709, 0, 'A girl in a luxury kitchen makes everything aesthetic. She eats her beautifully made food, then the doorbell rings. It\'s a package full of wax-cracking squishies; she cracks them all. At the mall, she buys a puppy and more... then a slumber party!'],
  ['a371e0ea', 'en', 'onyx', 15, 1, 'Did you know there\'s a planet where a day lasts longer than a year? This planet is Venus! But only 225 days to orbit the Sun. On Venus, the year ends before a single day does! The universe is really strange.'],
  ['33d4e5ad', 'ar', 'echo', 19.5, 0, 'هل سمعت عن الغواص الذي طرق نافذة غواصة على عمق 100 متر؟ في عام 2005، غواصة عسكرية كانت تقوم بدورية عميقة في المحيط الأطلسي. الغواص كان جزءًا من مهمة سرية... لمراقبة الغواصة دون أن يشعروا بوجوده.'],
  ['8d314182', 'ar', 'onyx', 24.792, 0, 'جريمة هزت ألمانيا عام ١٩٢٢... مقتل هينتركايڤك الغامض. آثار أقدام غامضة تقود من الغابة إلى الحظيرة المهجورة. ظل غريب يظهر خلف نافذة مظلمة في المزرعة. ...السر يكمن في الفانوس الذي تحرك في الظلام، يروي قصة جريمة هينتركايڤك الغامضة التي لم تُحل حتى اليوم.'],
  ['e566cb2a', 'en', 'echo', 20.584, 0, 'A child skillfully and enthusiastically crafts a colorful 3D car, surrounded by their vibrant creations. The table showcases an impressive 3D dinosaur and a charming house, inspiring further imaginative creativity. The child proudly admires their imaginative work, which serves as a testament to their creativity.'],
  ['ed6e422f', 'de', 'nova', 15, 1, 'Leo spielt fröhlich im Park. Doch plötzlich verliert Leo seinen roten Ball im Gebüsch. Leo sucht und sucht, bis er ihn findet. Leo lernt, dass geduldiges Suchen hilft. Hast du auch einen Lieblingsball?'],
  ['de7071ea', 'en', 'onyx', 18.792, 0, 'Vanished into thin air—70 years, zero leads. In 1950, a C-54 Skymaster disappeared over the Yukon wilderness. All 44 passengers were never seen again in those icy peaks. The mystery remains unsolved... a ghost flight... swallowed by time and nature.'],
  ['7b178427', 'pt', 'echo', 17.709, 0, 'Imagine acordar e descobrir que todo o planeta está coberto de gelo. Entre 720 e 635 milhões de anos atrás, a Terra congelou completamente. Mas a vida persistiu... sobrevivendo em bolsões de água líquida sob o gelo.'],
  ['e8f91bdf', 'en', 'onyx', 18.417, 0, 'A 70-year-old mystery... still unsolved. In 1953, the Flannan Isles Lighthouse keepers vanished without a trace. Their logbook mentioned a fierce storm... but the skies were clear. The leading theory? A rogue wave swept them away... leaving no clues behind.'],
]
const porId = (id: string) => FILMES.find((f) => f[0] === id) as Filme
const VOZ: Record<string, VozDoFilmeCurto | null> = {
  onyx: { id: 'dark-mystery', voice: 'onyx', defaultSpeed: 0.92, vertical: 'mystery', speedFactor: 1 },
  echo: { id: 'documentary', voice: 'echo', defaultSpeed: 0.96, vertical: 'history', speedFactor: 1 },
  legado: { id: 'onyx-legacy', voice: 'onyx', defaultSpeed: 1, vertical: null, speedFactor: 1 },
  limitada: { id: 'futuristic-ai', voice: 'alloy', defaultSpeed: 0.98, vertical: 'science', speedFactor: 0.98 / 1.04 },
} as unknown as Record<string, VozDoFilmeCurto | null>
/** TTS falsa: devolve a duração que a voz real deu (ou uma regra de ritmo), e registra o que foi pedido. */
const tts = (duracao: (script: string) => number | null, o: { falha?: 'produzir' | 'lança' | 'cache' } = {}) => {
  const pedidos: Array<Record<string, unknown>> = [], lidas: string[] = []
  const deps: DepsDaFalaK4 = {
    aquecivel: (a) => { pedidos.push(a); return { chave: `k:${a.script.length}:${a.speed}:${a.vertical ?? '-'}`, produzir: async () => { if (o.falha === 'lança') throw Error('openai 503'); return o.falha !== 'produzir' } } },
    lookup: async (chave) => { lidas.push(chave); if (o.falha === 'cache') return null; const s = duracao(String(pedidos.at(-1)?.script ?? '')); return s === null ? null : { audioDuration: s } },
  }
  return { deps, pedidos, lidas }
}
type Args = Parameters<typeof medirFalaDoKling4Trial>[0]
const base = (voiceoverScript: string, extra: Partial<Args> = {}): Args => ({ voiceoverScript, verbatim: true, scriptSpeed: undefined, voz: VOZ.onyx, language: 'en', quality: 'cinematic_ai', ...extra })

console.log('== 1. a decisão é a duração MEDIDA (teto 15,5 s), nunca uma régua de texto ==')
ok(K4_TETO_MEDIDO_SEGUNDOS === 15.5, '1 teto 15,5 s de fala medida')
for (const f of FILMES) {
  const r = kling4TrialFalaCabe(f[3]), deveCaber = f[3] <= 15.5
  ok(r.cabe === deveCaber && r.reason === (deveCaber ? 'fits' : 'narration_over_kling4_15s'), `1 ${f[0]} (${f[1]}, ${f[2]}, ${narrationWordCount(f[5], f[1])} palavras): ${f[3]} s medidos → ${deveCaber ? 'Kling 4' : 'Seedance'}`)
}
ok(!kling4TrialFalaCabe(porId('702699d9')[3]).cabe, '1 caso do revisor 702699d9 (16,7 s medidos; o estimador dizia 15,4 s e mandava ao Kling 4) → Seedance')
for (const id of ['e8f91bdf', 'de7071ea', '7b178427']) ok(!kling4TrialFalaCabe(porId(id)[3]).cabe, `1 caso do revisor ${id} (${porId(id)[3]} s) → Seedance`)
for (const id of ['f656b348', 'a371e0ea', 'ddf69f98', '6039e4e5']) ok(kling4TrialFalaCabe(porId(id)[3]).cabe, `1 ${id} (${porId(id)[3]} s) → segue no Kling 4`)
ok(kling4TrialFalaCabe(null).reason === 'narration_unmeasured_kling4' && !kling4TrialFalaCabe(null).cabe && !kling4TrialFalaCabe(NaN).cabe && !kling4TrialFalaCabe(0).cabe, '1 sem medida (null/NaN/0) → Seedance, motivo próprio')
ok(kling4TrialFalaCabe(15.5).cabe && !kling4TrialFalaCabe(15.501).cabe, '1 fronteira: 15,5 cabe; 15,501 não')

console.log('== 2. a medição: a mesma TTS da montagem, antes do POST pago ==')
const CURTAS55 = 'One man. One boat. No map. No food. The sea was cold and the wind was mad. He did not stop. Day one, day two, day three. Then he saw a light. Was it land? It was a ship. They took him in. He was safe. He had won. The sea had lost. The end.'
const n55 = narrationWordCount(CURTAS55, 'en')
ok(n55 >= 54 && n55 <= 56, `2 o texto de palavras curtas tem ${n55} palavras (o estimador antigo dava 13,5 s e mandava ao Kling 4)`)
{ // a voz real mais rápida medida nos 20 filmes: 2,79 pal/s (echo, en) — mesmo nela, 55 palavras não cabem
  const m = tts((s) => narrationWordCount(s, 'en') / 2.79)
  const r = await medirFalaDoKling4Trial(base(CURTAS55), m.deps)
  ok(!r.cabe && r.reason === 'narration_over_kling4_15s' && (r.seconds ?? 0) > 19, `2 55 palavras curtas medidas (${r.seconds} s na voz mais rápida medida) → Seedance`)
}
{ const f = porId('702699d9'), m = tts(() => f[3]); const r = await medirFalaDoKling4Trial(base(f[5], { voz: VOZ.echo }), m.deps)
  ok(!r.cabe && r.seconds === 16.709, `2 702699d9: a TTS mede 16,709 s → Seedance (motivo ${r.reason})`) }
{ const f = porId('ddf69f98'), m = tts(() => f[3]); const r = await medirFalaDoKling4Trial(base(f[5], { voz: VOZ.echo }), m.deps)
  ok(r.cabe && r.seconds === 15.417, '2 ddf69f98: 15,417 s medidos → Kling 4') }
const FAROL_ROTEIRO = `HOOK (0-2s): [Pexels: foggy forest path] A 70-year-old mystery... still unsolved.

MICRO REWARD 1: [Pexels: old newspaper clippings] In 1953, the Flannan Isles Lighthouse keepers vanished without a trace.

MICRO REWARD 2: [Pexels: stormy sea waves] Their logbook mentioned a fierce storm... but the skies were clear.

PAYOFF: [Pexels: lighthouse silhouette at dusk] The leading theory? A rogue wave swept them away... leaving no clues behind.`
{ const m = tts(() => 18.417); const r = await medirFalaDoKling4Trial(base(FAROL_ROTEIRO), m.deps)
  const p = m.pedidos[0] ?? {}
  ok(!r.cabe && r.seconds === 18.417, '2 farol e8f91bdf: 18,417 s medidos → Seedance')
  ok(m.pedidos.length === 1 && m.lidas.length === 1 && m.lidas[0] === `k:${String(p.script).length}:${p.speed}:${p.vertical}`, '2 uma síntese e a leitura da MESMA chave (a que o compose vai achar no cache)')
  ok(typeof p.script === 'string' && !/HOOK|MICRO REWARD|PAYOFF|Pexels/.test(p.script) && /rogue wave/.test(p.script), '2 o texto falado = voiceover_script sem marcadores nem pistas [Pexels] (≡ compose stripScriptMarkers)')
  ok(p.vertical === 'mystery' && p.language === 'en' && p.quality === 'cinematic_ai' && p.speed === 1, '2 voz assinada: vertical da voz, língua e qualidade do claim; fator 1 sem speed = velocidade 1,0 do compose (verbatim)') }
{ const m = tts(() => 14); await medirFalaDoKling4Trial(base('A short line about the sea.', { voz: VOZ.limitada }), m.deps)
  ok(Math.abs(Number(m.pedidos[0]?.speed) - 0.98 / 1.04) < 1e-9, '2 voz limitada (fator < 1): a velocidade explícita é o fator assinado, como no compose') }
{ const m = tts(() => 14); await medirFalaDoKling4Trial(base('A short line about the sea.', { scriptSpeed: 1.1 }), m.deps)
  ok(m.pedidos[0]?.speed === 1.1, '2 roteiro com speed: 1.1 → a TTS sai a 1,1 (velocidade do roteiro × fator 1)') }
{ const m = tts(() => 14); await medirFalaDoKling4Trial(base('A short line about the sea.', { voz: VOZ.legado }), m.deps)
  ok(m.pedidos.length === 1 && m.pedidos[0]?.vertical === undefined, '2 voz de legado (sem vertical): o compose fala onyx × 1,0 — a medição também') }
for (const [falha, nome] of [['produzir', 'TTS sem áudio'], ['lança', 'TTS lança (OpenAI 503)'], ['cache', 'cache não devolve o mp3']] as const) {
  const m = tts(() => 12, { falha }); const r = await medirFalaDoKling4Trial(base('A short line about the sea.'), m.deps)
  ok(!r.cabe && r.reason === 'narration_unmeasured_kling4', `2 ${nome} → sem medida → Seedance`)
}
{ const m = tts(() => 12); const r = await medirFalaDoKling4Trial(base('A short line about the sea.', { voz: null }), m.deps)
  ok(!r.cabe && m.pedidos.length === 0, '2 sem voz assinada (o compose usaria a voz do navegador) → Seedance, nenhuma TTS paga') }
{ const m = tts(() => 12); const r = await medirFalaDoKling4Trial(base('A short line about the sea.', { verbatim: false }), m.deps)
  ok(!r.cabe && m.pedidos.length === 0, '2 roteiro não verbatim sem velocidade explícita (o compose reescreveria o texto) → Seedance, nenhuma TTS paga') }
{ const m = tts(() => 12); const r = await medirFalaDoKling4Trial(base(''), m.deps)
  ok(!r.cabe && m.pedidos.length === 0, '2 fala vazia → Seedance') }
{ const m = tts(() => 13.9); const r = await medirFalaDoKling4Trial(base(CURTAS55), m.deps)
  ok(r.cabe, '2 sem modelo de texto: se a voz real der 13,9 s para as mesmas 55 palavras, cabe — quem decide é o mp3') }

console.log('== 3. a medição reaproveita a voz da montagem (mesma chave, sem pagar duas vezes) ==')
const lib = rd('lib/kling4TrialScript.ts'), ancs = rd('lib/audioNoCliqueServer.ts'), cps = rd('app/api/compose/route.ts')
ok(lib.includes("import('@/lib/audioNoCliqueServer')") && lib.includes("import('@/lib/compose')") && lib.includes('aquecivel: vozClassicaAquecivel, lookup: lookupCachedVoiceover'), '3 produção: vozClassicaAquecivel (TTS + Whisper + cache de voz) e lookupCachedVoiceover — as do clique e do compose')
ok(ancs.includes('const identity = resolveTtsVoiceIdentity(a.script, a.speed, a.vertical, tier, a.language, model)') && ancs.includes('if (await lookupCachedVoiceover(chave)) return true'), '3 vozClassicaAquecivel: a identidade de voz do compose e cache acertado = nada pago de novo')
ok(/resolveTtsVoiceIdentity\(\s*scaledScript,\s*explicitSpeed \?\? 1\.0,\s*vertical,\s*narrationTier,\s*language,\s*model,\s*\)/.test(cps) && cps.includes('cachedVoiceover = await lookupCachedVoiceover(voiceoverCacheKey)'), '3 o compose procura a MESMA identidade no cache antes da TTS')
ok(cps.includes('const vozAssinada = vozAssinadaDoClaim(cinematicBirthClaim?.response)') && cps.includes('} else if (explicitSpeed != null || claimVerbatim) {'), '3 o compose fala o texto como está (velocidade explícita ou verbatim) e usa a voz assinada — a mesma condição da medição')
ok(!/estimarFalaK4|kling4TrialWriterWords|kling4TrialVersaoCabe|K4_SEG_POR_LETRA|kling4TrialProvavelNoEscritor/.test(lib), '3 o estimador de letras/pausas e a faixa do escritor saíram')

console.log('== 4. o escritor do Kling 4 grátis: faixa de PALAVRAS medida, dentro da faixa do Seedance de 15 s ==')
const gs = rd('app/api/generate-script/route.ts'), rt0 = rd('app/api/generate-video-cinematic/route.ts')
const gsBase = (() => { try { return execFileSync('git', ['show', 'origin/main:app/api/generate-script/route.ts'], { encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n') } catch { return '' } })()
const LINHA_TETO_DURO = "    const tetoDuroFilmeCurto = isClassicShortEngine(typeof body.engine === 'string' ? body.engine : null) ? Math.max(tetoFilmeCurto, maxWordsCurtoDoMotor("
ok(gs.includes(LINHA_TETO_DURO) && gs.split('\n').find((l) => l.startsWith(LINHA_TETO_DURO)) === gsBase.split('\n').find((l) => l.startsWith(LINHA_TETO_DURO)), '4 teto DURO do corte por frases = a linha da base, byte a byte (a rodada reprovada o baixava)')
const iTetoDuro = gs.indexOf(LINHA_TETO_DURO), iFaixaK4 = gs.indexOf('const faixaK4 = filmeCurto && !colado.pasted ? await faixaDoKling4ParaOPedido({'), iTextoPronto = gs.indexOf('return NextResponse.json({ script: topic, alreadyStructured: true })')
ok(iTetoDuro > 0 && iFaixaK4 > iTetoDuro && iFaixaK4 > iTextoPronto, '4 a faixa do Kling 4 entra DEPOIS do teto duro (que não a lê) e do texto pronto (que fica na faixa normal); roteiro colado fora')
ok(/if \(faixaK4\) \{[^\n]*\n\s*tetoFilmeCurto = faixaK4\.max; pisoFilmeCurto = faixaK4\.min/.test(gs) && !/tetoDuroFilmeCurto\s*=\s*faixaK4/.test(gs), '4 só a faixa do escritor (teto/piso) muda; tetoDuroFilmeCurto nunca é reatribuído')
ok(gs.includes("+ (faixaK4 ? `\\n\\n${instrucaoDoKling4NoEscritor(faixaK4)}` : '')") && (gs.match(/content: PROMPT_DO_ROTEIRO/g) ?? []).length === 2, '4 a instrução do Kling 4 vai nas duas chamadas do escritor (1ª e nova tentativa)')
ok(gs.includes(".from('videos').select('id', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'failed')") && gs.includes(".like('render_id', 'cinematic-%').is('refunded_at', null)") && rt0.includes(".eq('user_id', user.id).neq('status', 'failed'),") && rt0.includes(".eq('user_id', user.id).like('render_id', 'cinematic-%').is('refunded_at', null)"), '4 elegibilidade = as MESMAS contagens da rota (filmes não falhos, débitos cinematic-% não estornados)')
ok(gs.includes('kling4_writer_band') && !gs.includes('kling4WriterBand') && gs.includes('return NextResponse.json({ script, alreadyStructured: false, wordsPerSecond: regua.wordsPerSecond, family: regua.family, targetSeconds: alvoSegundos, minWords: alvoPalavras, words: scriptWordCount(script), pastedScript: colado.pasted, pastedReason: colado.reason })'), '4 rastro: a faixa usada vai no script_written; a resposta da rota não muda')
// a faixa: interseção [piso do Seedance de 15 s, teto medido do Kling 4]
const seedEn = faixaAceitaNoFilmeCurto(15, MIN_COVERAGE, 'en'), seedDe = faixaAceitaNoFilmeCurto(15, MIN_COVERAGE, 'de')
const fEn = faixaDoKling4NoEscritor('en'), fDe = faixaDoKling4NoEscritor('de')
ok(fEn?.min === 36 && fEn?.max === 38 && seedEn.min === 36, `4 en: faixa do Kling 4 ${fEn?.min}-${fEn?.max} (piso do Seedance ${seedEn.min}, teto medido 38)`)
ok(fDe?.min === seedDe.min && fDe?.max === 33 && seedDe.min <= 33, `4 de: faixa do Kling 4 ${fDe?.min}-${fDe?.max} (piso do Seedance ${seedDe.min}, teto medido 33)`)
for (const l of ['pt', 'ar', 'pl', 'el', 'es', 'tr', 'ru', 'fr', '', 'xx']) ok(faixaDoKling4NoEscritor(l) === null, `4 ${l || '(vazio)'}: sem interseção ou sem medida → faixa normal (a medição decide)`)
for (const l of Object.keys(K4_TETO_DO_ESCRITOR_POR_LINGUA)) { const f = faixaDoKling4NoEscritor(l), s = faixaAceitaNoFilmeCurto(15, MIN_COVERAGE, l); ok(!!f && f.min >= s.min && f.max <= s.max && f.min <= f.max, `4 ${l}: faixa do Kling 4 inteira DENTRO da faixa do Seedance de 15 s (${s.min}-${s.max}) — se a medição mandar ao Seedance, o roteiro serve`) }
ok(seedanceShortWriterWords('en').min === 36 && seedanceShortWriterWords('en').max === 41, '4 a faixa normal do escritor en continua 36-41 (o Kling 4 só estreita o teto para 38)')
// elegibilidade (o mesmo predicado da rota): só conta de grátis sem filme e sem débito, Seedance 15 s
const conta = (films: number | null, debits: number | null) => async () => ({ films, debits })
const pede = (o: Partial<Parameters<typeof faixaDoKling4ParaOPedido>[0]> = {}) => faixaDoKling4ParaOPedido({ engine: 'seedance', seconds: 15, language: 'en', paid: false, contar: conta(0, 0), live: true, ...o })
ok((await pede())?.max === 38 && (await pede({ engine: undefined }))?.max === 38 && (await pede({ engine: 'cinematic_ai' }))?.max === 38, '4 1º filme grátis no Seedance 15 s (com ou sem engine) → faixa do Kling 4')
for (const [nome, o] of [
  ['conta paga', { paid: true }], ['perfil ilegível', { paid: null }], ['já tem filme', { contar: conta(1, 0) }], ['já tem débito', { contar: conta(0, 1) }],
  ['contagem ilegível', { contar: conta(null, 0) }], ['contagem lança', { contar: async () => { throw Error('PGRST303') } }], ['Kineo 1', { engine: 'fast' }],
  ['Kling 2.5', { engine: 'kling' }], ['35 s', { seconds: 35 }], ['Kling 4 grátis desligado', { live: false }], ['pt (sem interseção)', { language: 'pt' }],
] as const) ok((await pede(o as never)) === null, `4 ${nome} → faixa normal`)
const inst = instrucaoDoKling4NoEscritor(fEn!)
ok(inst.includes('36-38 spoken words') && /do NOT use "\.\.\." or em-dashes/.test(inst) && inst.includes('PAYOFF still delivers'), '4 a instrução dá a faixa em palavras, tira as pausas longas e mantém o PAYOFF')
// caso da revisão anterior: português de 48 palavras — pt não tem faixa do Kling 4, o escritor segue a normal
const PT48 = `HOOK: [Pexels: frozen planet] A Terra já foi uma bola de gelo.

MICRO REWARD 1: [Pexels: glacier] Há setecentos milhões de anos, o gelo cobriu oceanos, montanhas e até o equador.

MICRO REWARD 2: [Pexels: ice cave] Os cientistas chamam esse período de Terra Bola de Neve.

PAYOFF: [Pexels: hot spring] Mesmo assim, a vida resistiu. Ela sobreviveu em bolsões de água quente perto dos vulcões submarinos.`
const contPt = (t: string) => narrationWordCount(parseUserScript(t).narration, 'pt')
ok(contPt(PT48) === 48, `4 o roteiro pt do caso tem ${contPt(PT48)} palavras`)
const hardPt = maxWordsCurtoDoMotor('seedance', 15, 'pt')
const agora = fitShortFilmScript(PT48, { maxWords: 41, minWords: 36, countWords: contPt, hardMaxWords: hardPt })
const rebaixado = fitShortFilmScript(PT48, { maxWords: 36, minWords: 36, countWords: contPt, hardMaxWords: 36 })
ok(faixaDoKling4NoEscritor('pt') === null && agora.words >= 36 && agora.words <= hardPt, `4 pt48: sem faixa do Kling 4, teto duro da guarda (${hardPt}) → ${agora.words} palavras (≥ piso 36)`)
ok(rebaixado.words < 36, `4 controle: com o teto duro rebaixado a 36 (a rodada reprovada) sairia com ${rebaixado.words} — abaixo do piso`)
// o mesmo corte com a faixa do Kling 4 en: nunca abaixo do piso do Seedance, nem acima do teto duro dele
const contEn = (t: string) => narrationWordCount(parseUserScript(t).narration, 'en')
const hardEn = maxWordsCurtoDoMotor('seedance', 15, 'en')
const EN_LONGO = `HOOK: [Pexels: lighthouse] Three keepers vanished from a lighthouse in one night.

MICRO REWARD 1: [Pexels: island] It happened on the Flannan Isles in December 1900, far off the coast of Scotland.

MICRO REWARD 2: [Pexels: logbook] The last log spoke of a storm that no ship nearby ever saw.

PAYOFF: [Pexels: wave] The leading theory is simple. A giant rogue wave swept all three men off the rocks and into the sea.`
const kEn = fitShortFilmScript(EN_LONGO, { maxWords: fEn!.max, minWords: fEn!.min, countWords: contEn, hardMaxWords: hardEn })
ok(contEn(EN_LONGO) > 38 && kEn.words >= 36 && kEn.words <= hardEn, `4 en ${contEn(EN_LONGO)} palavras com a faixa do Kling 4 → ${kEn.words} (dentro de [36, teto duro ${hardEn}] — nunca abaixo do piso do Seedance)`)
// caso da revisão anterior: as 55 palavras curtas — o corte com a faixa do Kling 4 fica ≥ 36 e a medição decide
const k55 = fitShortFilmScript(`HOOK: [Pexels: sea] ${CURTAS55}`, { maxWords: fEn!.max, minWords: fEn!.min, countWords: contEn, hardMaxWords: hardEn })
ok(k55.words >= 36 && k55.words <= hardEn, `4 55 palavras curtas com a faixa do Kling 4 → ${k55.words} palavras (≥ 36: serve ao Seedance se a medição mandar)`)

console.log('== 5. a sobra no compose: movimento perceptível e contínuo ==')
const compose = rd('lib/compose.ts')
const ramo = compose.slice(compose.indexOf("kling4TrialEngine === 'kling4' && cleanClips.length === 1"), compose.indexOf('} else if (signedClipSeconds)'))
const anim = ramo.match(/animations: \[\{([^\]]*)\}\]/)?.[1] ?? ''
ok(ramo.length > 0 && !ramo.includes("'106%'"), '5 o empurrão de 6 % (quase parado) saiu')
ok(/start_scale: k % 2 === 0 \? '100%' : '112%'/.test(anim) && /end_scale: k % 2 === 0 \? '112%' : '100%'/.test(anim), '5 escala alterna 100→112 / 112→100 (antes: todo trecho voltava a 100 %, salto no corte)')
ok(/x_anchor: Math\.floor\(k \/ 2\) % 2 === 0 \? '38%' : '62%'/.test(anim), '5 a âncora troca de lado só a cada par (no 100 %, onde não desloca nada)')
ok(/easing: 'ease-out'/.test(anim) && !/ease-in'|playback_rate|color_filter|reversed/.test(ramo), '5 só propriedades já exercitadas em produção (ease-out, âncoras 38/62 do Ken Burns do Kineo 1)')
const quadro = (k: number) => ({ ini: k % 2 === 0 ? 100 : 112, fim: k % 2 === 0 ? 112 : 100, ancora: Math.floor(k / 2) % 2 === 0 ? 38 : 62 })
let continua = quadro(0).ini === 100
for (let k = 0; k < 6; k++) { const a = quadro(k), b = quadro(k + 1); if (a.fim !== b.ini || (a.fim !== 100 && a.ancora !== b.ancora)) continua = false }
ok(continua, '5 seis trechos seguidos: cada um começa na escala e no enquadramento em que o anterior terminou; o 1º sai de 100 % (fim do clipe inteiro)')
ok(!/loop:\s*true/.test(ramo) && ramo.includes('trim_start: round3(K4_SEGUNDOS - len)') && /const K4_CAUDA = 3\b/.test(ramo), '5 KINEO-K4-FIM-SEM-VOLTA continua: sem loop, a sobra repete o FIM, cauda de 3 s')

console.log('== 6. fiação na rota ==')
const rt = rd('app/api/generate-video-cinematic/route.ts')
const iFala = rt.indexOf('const kling4Fala: FalaK4 | null = kling4TrialCandidate && scenes.length === 3 && scenes.every(s => [6, 7, 8].includes(s.clipSeconds ?? 6)) ? await medirFalaDoKling4Trial('), iReserva = rt.indexOf('reserve: () => reserveKling4Trial(')
ok(iFala > 0 && iFala < iReserva, '6 a rota mede a fala ANTES da reserva e do POST pago do Kling 4 (só no candidato, com o plano de 3 clipes)')
ok(rt.includes("voiceoverScript: verbatim && parsedScript.narration ? parsedScript.narration : scenes.map((s) => s.voiceover).filter(Boolean).join(' ')") && rt.includes("const voiceoverScript = verbatim && parsedScript.narration\n      ? parsedScript.narration\n      : scenes.map((s) => s.voiceover).filter(Boolean).join(' ')"), '6 o texto medido é o MESMO voiceover_script que vai no claim')
ok(rt.includes('voz: vozCurta, language: narrationLanguage.language, quality: String(claimQuality)') && rt.includes('if (seedanceShortFilm && vozCurta) response.narration_voice = campoDaVozAssinada(vozCurta)'), '6 voz = a assinada no claim (vozCurta), língua e qualidade do claim')
ok(rt.includes('if (kling4TrialCandidate && scenes.length === 3 && scenes.every(s => [6, 7, 8].includes(s.clipSeconds ?? 6)) && kling4Fala?.cabe) {'), '6 só fala medida ≤ 15,5 s vai ao Kling 4')
ok(rt.includes("reason: kling4Fala && !kling4Fala.cabe ? kling4Fala.reason : 'fallback_plan_unavailable'") && rt.includes('...(kling4Fala ? { narration_fit: kling4Fala } : {})'), '6 o desvio para o Seedance fica no claim (motivo + duração medida)')
ok(!rt.includes('kling4TrialNarracaoCabe(') && !rt.includes('kling4Timing.voiceovers.join(') && !rt.slice(iFala - 2000, iReserva).includes('estSeconds'), '6 nenhum estimador na decisão do Kling 4')

console.log('== 7. simulação: os 20 filmes no tamanho do alvo, com a duração REAL por palavra de cada um ==')
// Cada filme: s/palavra = segundos medidos ÷ palavras (nos 5 que pararam no piso de 15 s, um teto: a fala real foi menor).
// Língua com faixa do Kling 4 → o escritor entrega entre min e max; simulado no PIOR caso (max). Sem faixa → o escritor
// não muda: o filme fica com as palavras que teve. Cabe = ≤ 15,5 s (a mesma régua da medição).
const simula = (f: Filme) => {
  const n = narrationWordCount(f[5], f[1]), sPorPalavra = f[3] / n, faixa = faixaDoKling4NoEscritor(f[1])
  const palavras = faixa ? faixa.max : n, palavrasMin = faixa ? faixa.min : n
  return { id: f[0], lingua: f[1], n, faixa, palavras, seg: palavras * sPorPalavra, segMin: palavrasMin * sPorPalavra }
}
const sim = FILMES.map(simula)
for (const s of sim) console.log(`       ${s.id} ${s.lingua} ${s.n} pal. → ${s.palavras} pal. ${s.seg.toFixed(1)} s ${s.seg <= 15.5 ? 'Kling 4' : 'Seedance'}${s.faixa ? ` (faixa ${s.faixa.min}-${s.faixa.max}; no piso ${s.segMin.toFixed(1)} s)` : ' (faixa normal)'}`)
const cabemHoje = FILMES.filter((f) => f[3] <= 15.5).length
const cabemC = sim.filter((s) => s.seg <= 15.5).length, cabemCMin = sim.filter((s) => s.segMin <= 15.5).length
const en = sim.filter((s) => s.lingua === 'en'), enCabem = en.filter((s) => s.seg <= 15.5).length
ok(cabemHoje === 6, `7 hoje (sem a faixa): ${cabemHoje} de 20 cabem no Kling 4 — o número da revisão`)
ok(cabemC === 8 && cabemCMin === 8, `7 com a opção C: ${cabemC} de 20 cabem (no teto da faixa; ${cabemCMin} no piso)`)
ok(en.length === 10 && enCabem === 6, `7 inglês: ${enCabem} de ${en.length} cabem — a maioria dos filmes em inglês (hoje: ${FILMES.filter((f) => f[1] === 'en' && f[3] <= 15.5).length})`)
for (const id of ['ddf69f98', 'de6c89f9', 'f656b348', '4ce89c9c', '702699d9', 'a371e0ea', 'ed6e422f']) { const s = sim.find((x) => x.id === id)!; ok(s.seg <= 15.5, `7 ${id} (${s.lingua}): ${s.n} → ${s.palavras} palavras = ${s.seg.toFixed(1)} s → Kling 4`) }
{ const s = sim.find((x) => x.id === '702699d9')!; ok(s.seg <= 14.9 && FILMES.find((f) => f[0] === '702699d9')![3] > 15.5, `7 caso do revisor 702699d9: com as 43 palavras que teve, 16,7 s (Seedance); na faixa do Kling 4, ${s.seg.toFixed(2)} s — cabe com folga`) }
for (const id of ['6039e4e5', 'e566cb2a', 'de7071ea', 'e8f91bdf']) { const s = sim.find((x) => x.id === id)!; ok(s.segMin > 15.5, `7 ${id} (en lento, ${(s.segMin / 36).toFixed(3)} s/palavra): nem no piso do Seedance (36 = ${s.segMin.toFixed(1)} s) cabe → a medição manda ao Seedance`) }
for (const s of sim.filter((x) => !x.faixa)) { const f = FILMES.find((x) => x[0] === s.id)!; ok(Math.abs(s.seg - f[3]) < 1e-9 && (s.seg <= 15.5) === kling4TrialFalaCabe(f[3]).cabe, `7 ${s.id} (${s.lingua}, sem faixa): escritor de sempre, a medição decide (${f[3]} s → ${s.seg <= 15.5 ? 'Kling 4' : 'Seedance'})`) }
// a escolha do teto en: 38 não perde nenhum dos que cabem no piso (36) e deixa ≥ 0,7 s de folga ao mais lento deles
const cabeCom = (w: number) => FILMES.filter((f) => f[1] === 'en' && w * f[3] / narrationWordCount(f[5], 'en') <= 15.5).length
ok(cabeCom(36) === 6 && cabeCom(38) === 6 && cabeCom(40) === 5, `7 teto en: 36 → ${cabeCom(36)}, 38 → ${cabeCom(38)}, 40 → ${cabeCom(40)} (40 perde o 702699d9)`)
// fora da amostra (02/11, depois da revisão): b4cbb871, en, alloy 0,9, 41 palavras, 19,084 s medidos
{ const sPP = 19.084 / 41; ok(38 * sPP > 15.5, `7 fora da amostra b4cbb871 (02/11): 38 palavras = ${(38 * sPP).toFixed(1)} s → a medição manda ao Seedance (rede de segurança)`) }

console.log('== 8. a medição tem prazo próprio: estourou = Seedance, sem travar a rota ==')
ok(K4_PRAZO_DA_MEDICAO_MS === 20_000, '8 prazo padrão 20 s (TTS + Whisper de 15 s de fala: ~5-10 s)')
{ const pedidos: unknown[] = []
  const deps: DepsDaFalaK4 = { aquecivel: (a) => { pedidos.push(a); return { chave: 'k', produzir: () => new Promise<boolean>(() => {}) } }, lookup: async () => ({ audioDuration: 12 }) }
  const t0 = Date.now(); const r = await medirFalaDoKling4Trial({ ...base('A short line about the sea.'), prazoMs: 60 }, deps); const dt = Date.now() - t0
  ok(!r.cabe && r.reason === 'narration_measure_timeout_kling4' && r.seconds === null && dt < 1000 && pedidos.length === 1, `8 TTS que nunca responde → ${r.reason} em ${dt} ms → Seedance`) }
{ const deps: DepsDaFalaK4 = { aquecivel: () => ({ chave: 'k', produzir: async () => true }), lookup: () => new Promise(() => {}) }
  const r = await medirFalaDoKling4Trial({ ...base('A short line about the sea.'), prazoMs: 40 }, deps)
  ok(!r.cabe && r.reason === 'narration_measure_timeout_kling4', '8 leitura do cache que nunca volta → prazo → Seedance') }
{ const deps: DepsDaFalaK4 = { aquecivel: () => ({ chave: 'k', produzir: async () => true }), lookup: async () => ({ audioDuration: 14.2 }) }
  const r = await medirFalaDoKling4Trial({ ...base('A short line about the sea.'), prazoMs: 5_000 }, deps)
  ok(r.cabe && r.seconds === 14.2, '8 medição dentro do prazo segue valendo (14,2 s → Kling 4)') }
ok(lib.includes('clearTimeout(timer)') && lib.includes('Promise.race([medirSemPrazo(a, deps), estouro])'), '8 o relógio é desarmado ao fim (não segura a função)')
ok(rt.includes("reason: kling4Fala && !kling4Fala.cabe ? kling4Fala.reason : 'fallback_plan_unavailable'"), '8 o motivo do prazo chega ao claim pelo mesmo caminho')

console.log('== 9. o comentário do compose diz o que o código faz ==')
ok(!compose.includes('o roteiro do Kling 4 nasce no tamanho dos 15 s') && !compose.includes('fala estimada acima de 16 s'), '9 saiu a frase errada ("o roteiro nasce no tamanho" / "fala estimada acima de 16 s")')
ok(compose.includes('A sobra em si fica em até 0,5 s: a rota MEDE a fala') && compose.includes('mas quem decide é a medição'), '9 o comentário diz: sobra ≤ 0,5 s porque a rota mede; o escritor mira, a medição decide')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
