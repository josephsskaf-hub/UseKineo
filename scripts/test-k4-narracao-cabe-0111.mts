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
import { kling4TrialFalaCabe, medirFalaDoKling4Trial, K4_TETO_MEDIDO_SEGUNDOS, K4_PRAZO_DA_MEDICAO_MS, faixaDoKling4NoEscritor, faixaDoKling4ParaOPedido, instrucaoDoKling4NoEscritor, passoDaVozNoFilmeCurto, pisoDoPortaoNaVoz, K4_FOLGA_DO_ESCRITOR, K4_FATOR_REAL_MEDIDO, type DepsDaFalaK4 } from '../lib/kling4TrialScript'
import { maxWordsCurtoDoMotor, faixaAceitaNoFilmeCurto } from '../lib/durationByEngine'
import { minCoverageFor } from '../lib/narrationFit'
import { VOICE_PERSONAS } from '../lib/narration/personas'
import { CLASSIC_VOICE_WORDS_PER_SECOND } from '../lib/speechRate'
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
// A voz ASSINADA de cada filme (narration_voice do claim: persona e velocidade — futuristic-ai já limitada a 0,98).
const E = { voice: 'echo', defaultSpeed: 0.96 }, O = { voice: 'onyx', defaultSpeed: 0.92 }, FUT = { voice: 'alloy', defaultSpeed: 0.98 }, LUX = { voice: 'alloy', defaultSpeed: 0.9 }, NOVA = { voice: 'nova', defaultSpeed: 0.97 }
const VOZ_REAL: Record<string, { voice: string; defaultSpeed: number }> = {
  bf06d4bb: E, ddf69f98: E, de6c89f9: FUT, '52995fa2': E, '6039e4e5': FUT, a603eb9b: E, '802dbace': E, f656b348: E, '4ce89c9c': E, '3d8350e3': E,
  '7aa3d055': FUT, '702699d9': LUX, a371e0ea: O, '33d4e5ad': E, '8d314182': O, e566cb2a: E, ed6e422f: NOVA, de7071ea: O, '7b178427': E, e8f91bdf: O,
}
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

console.log('== 4. o escritor do Kling 4 grátis: mira o piso do portão de 15 s (75 %), teto por voz ==')
const gs = rd('app/api/generate-script/route.ts'), rt0 = rd('app/api/generate-video-cinematic/route.ts'), ide = rd('lib/meta95/ideiaNoEscritor.ts')
const gsBase = (() => { try { return execFileSync('git', ['show', 'origin/main:app/api/generate-script/route.ts'], { encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n') } catch { return '' } })()
const LINHA_TETO_DURO = "    const tetoDuroFilmeCurto = isClassicShortEngine(typeof body.engine === 'string' ? body.engine : null) ? Math.max(tetoFilmeCurto, maxWordsCurtoDoMotor("
ok(gs.includes(LINHA_TETO_DURO) && gs.split('\n').find((l) => l.startsWith(LINHA_TETO_DURO)) === gsBase.split('\n').find((l) => l.startsWith(LINHA_TETO_DURO)), '4 teto DURO do corte por frases = a linha da base, byte a byte (a rodada reprovada o baixava)')
const iTetoDuro = gs.indexOf(LINHA_TETO_DURO), iFaixaK4 = gs.indexOf('const faixaK4 = filmeCurto && !colado.pasted ? await faixaDoKling4ParaOPedido({'), iTextoPronto = gs.indexOf('return NextResponse.json({ script: topic, alreadyStructured: true })')
ok(iTetoDuro > 0 && iFaixaK4 > iTetoDuro && iFaixaK4 > iTextoPronto, '4 a faixa do Kling 4 entra DEPOIS do teto duro (que não a lê) e do texto pronto (que fica na faixa normal); roteiro colado fora')
ok(/if \(faixaK4\) \{[^\n]*\n\s*tetoFilmeCurto = faixaK4\.max; pisoFilmeCurto = faixaK4\.min/.test(gs) && !/tetoDuroFilmeCurto\s*=\s*faixaK4/.test(gs), '4 só a faixa do escritor (teto/piso) muda; tetoDuroFilmeCurto nunca é reatribuído')
ok(gs.includes('faixaDoCinematic = faixaAceitaNoFilmeCurtoDoMotor(typeof body.engine === \'string\' ? body.engine : null, alvoSegundos, minCoverageFor(alvoSegundos), idiomaDoRitmo)'), '4 no Kling 4, "o cinematic aceita" = o portão real de 15 s (75 %): a versão curta não perde para a longa')
ok(gs.includes('const curtoParaOAlvo = (t: string) => scriptWordCount(t) < (faixaK4 ? faixaK4.min : alvoPalavras)') && gs.includes('const aindaCurto = palavras < (faixaK4 ? faixaK4.min : alvoPalavras)'), '4 o roteiro no piso da faixa não dispara "curto demais" (nem nova tentativa, nem stillShort)')
ok(gs.includes("+ (faixaK4 ? `\\n\\n${instrucaoDoKling4NoEscritor(faixaK4)}` : '')") && (gs.match(/content: PROMPT_DO_ROTEIRO/g) ?? []).length === 2, '4 a instrução do Kling 4 vai nas duas chamadas do escritor (1ª e nova tentativa)')
ok(gs.includes(".from('videos').select('id', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'failed')") && gs.includes(".like('render_id', 'cinematic-%').is('refunded_at', null)") && rt0.includes(".eq('user_id', user.id).neq('status', 'failed'),") && rt0.includes(".eq('user_id', user.id).like('render_id', 'cinematic-%').is('refunded_at', null)"), '4 elegibilidade = as MESMAS contagens da rota (filmes não falhos, débitos cinematic-% não estornados)')
ok(gs.includes('lerPago: async () =>') && !/paid: await \(async/.test(gs), '4 o perfil é lido só depois das checagens baratas (lerPago preguiçoso)')
ok(gs.includes("vertical: typeof body.vertical === 'string' ? body.vertical : null") && rt0.includes("body: JSON.stringify({ ...corpo, ...(typeof body.vertical === 'string' && body.vertical.trim() ? { vertical: body.vertical } : {}) })"), '4 caminho do servidor: o vertical do pedido chega ao escritor (a voz prevista dá o teto)')
ok(gs.includes('kling4_writer_band') && gs.includes('return NextResponse.json({ script, alreadyStructured: false, wordsPerSecond: regua.wordsPerSecond, family: regua.family, targetSeconds: alvoSegundos, minWords: alvoPalavras, words: scriptWordCount(script), pastedScript: colado.pasted, pastedReason: colado.reason })'), '4 rastro: a faixa usada vai no script_written; a resposta da rota não muda')
ok(ide.includes('faixaAceitaNoFilmeCurtoDoMotor(engine, args.seconds, minCoverageFor(args.seconds), lang).min'), '4 lib/meta95 pisoDoPortao = a cobertura do portão real (75 % até 15 s): o roteiro no piso não vira fallback no caminho do servidor')
// a faixa por voz
const PERSONAS = [...VOICE_PERSONAS.map((p) => ({ id: p.id, voice: p.voice, defaultSpeed: p.defaultSpeed })), { id: 'onyx-legacy', voice: 'onyx', defaultSpeed: 1 }]
const passo = (voice: string, defaultSpeed: number, l: string) => passoDaVozNoFilmeCurto({ voice, defaultSpeed }, l)
ok(passo('onyx', 0.92, 'en') === 2.3 && passo('echo', 0.96, 'en') === 2.45 && passo('alloy', 0.9, 'en') === 2.3 && passo('nova', 0.97, 'de') === 2.09, '4 passo da voz = a conta da rota (onyx 0,92 → 2,3; echo 0,96 → 2,45; alloy 0,9 → 2,3; nova 0,97 em de → 2,09)')
ok(pisoDoPortaoNaVoz(2.5) === 29 && pisoDoPortaoNaVoz(2.3) === 26 && pisoDoPortaoNaVoz(2.45) === 28 && pisoDoPortaoNaVoz(2.12) === 24, '4 piso do portão: ⌈15 × 75 % × passo⌉ (2,5 → 29 · 2,45 → 28 · 2,3 → 26 · de 2,12 → 24)')
const fEn = faixaDoKling4NoEscritor('en')
ok(fEn.min === 29 && fEn.max === 31 && fEn.voiceWordsPerSecond === null, `4 en, voz desconhecida (caminho do cliente): ${fEn.min}-${fEn.max} (piso na voz mais rápida; teto na mais lenta, onyx 0,92 / alloy 0,9 = 2,3)`)
ok(faixaDoKling4NoEscritor('en', 2.3).max === 31 && faixaDoKling4NoEscritor('en', 2.45).max === 33 && faixaDoKling4NoEscritor('en', 2.5).max === 33 && faixaDoKling4NoEscritor('en', 2.3).min === 29, '4 en por voz: onyx 0,92 → 29-31 · echo → 29-33 · futuristic → 29-33 (o piso nunca desce: serve a qualquer voz)')
const esperado: Record<string, [number, number]> = { pt: [29, 31], es: [29, 31], ar: [29, 31], el: [29, 31], de: [24, 26], pl: [26, 28], tr: [23, 25] }
for (const [l, [mn, mx]] of Object.entries(esperado)) { const f = faixaDoKling4NoEscritor(l); ok(f.min === mn && f.max === mx, `4 ${l}: ${f.min}-${f.max} (sem fator medido: piso + folga ${K4_FOLGA_DO_ESCRITOR})`) }
for (const l of ['en', 'pt', 'es', 'ar', 'el', 'de', 'pl', 'tr', 'ru', 'fr', 'hi', 'vi']) {
  const f = faixaDoKling4NoEscritor(l), s = faixaAceitaNoFilmeCurto(15, minCoverageFor(15), l)
  const pisoPior = Math.max(...PERSONAS.map((p) => pisoDoPortaoNaVoz(passo(p.voice, Math.min(p.defaultSpeed, 2.5 / CLASSIC_VOICE_WORDS_PER_SECOND[p.voice]), l))))
  ok(f.min >= pisoPior && f.min === s.min && f.max <= maxWordsCurtoDoMotor('seedance', 15, l) && f.max >= f.min + K4_FOLGA_DO_ESCRITOR, `4 ${l}: piso ${f.min} ≥ o portão em QUALQUER voz do 15 s (${pisoPior}) = o piso do Seedance de 15 s; teto ${f.max} ≤ guarda do Seedance`)
}
ok(seedanceShortWriterWords('en').min === 36 && seedanceShortWriterWords('en').max === 41, '4 a faixa normal do escritor en continua 36-41 (fora do Kling 4 grátis nada muda)')
// fator real medido: o pior real ÷ nominal dos filmes en que não pararam no piso
const nominal: Record<string, number> = {}
for (const [id, v] of Object.entries(VOZ_REAL)) nominal[id] = passo(v.voice, v.defaultSpeed, porId(id)[1])
const fatores = FILMES.filter((f) => f[1] === 'en' && f[4] === 0).map((f) => (narrationWordCount(f[5], 'en') / f[3]) / nominal[f[0]])
ok(K4_FATOR_REAL_MEDIDO.en <= Math.min(...fatores) && Math.min(...fatores) - K4_FATOR_REAL_MEDIDO.en < 0.01, `4 fator real en ${K4_FATOR_REAL_MEDIDO.en} ≤ o pior medido (${Math.min(...fatores).toFixed(3)}, 6039e4e5)`)
// elegibilidade (o mesmo predicado da rota): só conta de grátis sem filme e sem débito, Seedance 15 s; perfil lido por último
const conta = (films: number | null, debits: number | null) => async () => ({ films, debits })
let leuPerfil = 0
const pago = (v: boolean | null) => async () => { leuPerfil++; return v }
const pede = (o: Partial<Parameters<typeof faixaDoKling4ParaOPedido>[0]> = {}) => faixaDoKling4ParaOPedido({ engine: 'seedance', seconds: 15, language: 'en', lerPago: pago(false), contar: conta(0, 0), live: true, ...o })
ok((await pede())?.max === 31 && (await pede({ engine: undefined }))?.max === 31 && (await pede({ engine: 'cinematic_ai' }))?.max === 31, '4 1º filme grátis no Seedance 15 s (com ou sem engine) → faixa do Kling 4')
ok((await pede({ vertical: 'mystery', topic: 'A lighthouse mystery from 1900' }))?.voiceWordsPerSecond === 2.3, '4 com vertical (caminho do servidor): a voz prevista (dark-mystery, onyx 0,92 = 2,3) dá o teto')
for (const [nome, o] of [
  ['conta paga', { lerPago: pago(true) }], ['perfil ilegível', { lerPago: pago(null) }], ['já tem filme', { contar: conta(1, 0) }], ['já tem débito', { contar: conta(0, 1) }],
  ['contagem ilegível', { contar: conta(null, 0) }], ['contagem lança', { contar: async () => { throw Error('PGRST303') } }],
] as const) ok((await pede(o as never)) === null, `4 ${nome} → faixa normal`)
leuPerfil = 0
for (const [nome, o] of [['Kineo 1', { engine: 'fast' }], ['Kling 2.5', { engine: 'kling' }], ['35 s', { seconds: 35 }], ['Kling 4 grátis desligado', { live: false }]] as const) ok((await pede(o as never)) === null, `4 ${nome} → faixa normal`)
ok(leuPerfil === 0, '4 desligado ou não elegível pelo pedido: o perfil NÃO é consultado')
const inst = instrucaoDoKling4NoEscritor(fEn)
ok(inst.includes('29-31 spoken words') && /do NOT use "\.\.\." or em-dashes/.test(inst) && inst.includes('PAYOFF still delivers'), '4 a instrução dá a faixa em palavras, tira as pausas longas e mantém o PAYOFF')
// casos da revisão anterior
const PT48 = `HOOK: [Pexels: frozen planet] A Terra já foi uma bola de gelo.

MICRO REWARD 1: [Pexels: glacier] Há setecentos milhões de anos, o gelo cobriu oceanos, montanhas e até o equador.

MICRO REWARD 2: [Pexels: ice cave] Os cientistas chamam esse período de Terra Bola de Neve.

PAYOFF: [Pexels: hot spring] Mesmo assim, a vida resistiu. Ela sobreviveu em bolsões de água quente perto dos vulcões submarinos.`
const contPt = (t: string) => narrationWordCount(parseUserScript(t).narration, 'pt')
ok(contPt(PT48) === 48, `4 o roteiro pt do caso tem ${contPt(PT48)} palavras`)
const hardPt = maxWordsCurtoDoMotor('seedance', 15, 'pt'), fPt = faixaDoKling4NoEscritor('pt')
const kPt = fitShortFilmScript(PT48, { maxWords: fPt.max, minWords: fPt.min, countWords: contPt, hardMaxWords: hardPt })
const rebaixado = fitShortFilmScript(PT48, { maxWords: 20, minWords: 20, countWords: contPt, hardMaxWords: 20 })
ok(kPt.words >= fPt.min && kPt.words <= hardPt, `4 pt48 na faixa do Kling 4 (${fPt.min}-${fPt.max}, teto duro ${hardPt}) → ${kPt.words} palavras (≥ piso do portão)`)
ok(rebaixado.words < fPt.min, `4 controle: com o teto duro rebaixado (a rodada reprovada) sairia com ${rebaixado.words} — abaixo do piso`)
const contEn = (t: string) => narrationWordCount(parseUserScript(t).narration, 'en')
const hardEn = maxWordsCurtoDoMotor('seedance', 15, 'en')
const EN_LONGO = `HOOK: [Pexels: lighthouse] Three keepers vanished from a lighthouse in one night.

MICRO REWARD 1: [Pexels: island] It happened on the Flannan Isles in December 1900, far off the coast of Scotland.

MICRO REWARD 2: [Pexels: logbook] The last log spoke of a storm that no ship nearby ever saw.

PAYOFF: [Pexels: wave] The leading theory is simple. A giant rogue wave swept all three men off the rocks and into the sea.`
const kEn = fitShortFilmScript(EN_LONGO, { maxWords: fEn.max, minWords: fEn.min, countWords: contEn, hardMaxWords: hardEn })
ok(contEn(EN_LONGO) > 31 && kEn.words >= 29 && kEn.words <= hardEn, `4 en ${contEn(EN_LONGO)} palavras com a faixa do Kling 4 → ${kEn.words} (dentro de [29, teto duro ${hardEn}] — nunca abaixo do piso do portão)`)
const k55 = fitShortFilmScript(`HOOK: [Pexels: sea] ${CURTAS55}`, { maxWords: fEn.max, minWords: fEn.min, countWords: contEn, hardMaxWords: hardEn })
ok(k55.words >= 29 && k55.words <= hardEn, `4 55 palavras curtas com a faixa do Kling 4 → ${k55.words} palavras (≥ 29: o portão do Seedance aceita se a medição mandar)`)

console.log('== 5. a sobra no compose: movimento perceptível e contínuo ==')
const compose = rd('lib/compose.ts')
const ramo = compose.slice(compose.indexOf("kling4TrialEngine === 'kling4' && cleanClips.length === 1"), compose.indexOf('} else if (signedClipSeconds)'))
const anims = [...ramo.matchAll(/\? \[\{([^\]]*)\}\]|: \[\{([^\]]*)\}\]/g)].map((m) => m[1] ?? m[2])
const animCurta = anims.find((a) => /'106%'/.test(a)) ?? '', anim = anims.find((a) => /'112%'/.test(a)) ?? ''
ok(/const k4SobraCurta = totalDuration - k4Inteiro < 1\b/.test(ramo) && /animations: k4SobraCurta[^\n]*\n\s*\? \[\{[^\]]*'106%'/.test(ramo), '5 sobra < 1 s (o caso que a medição deixa passar): o empurrão de 6 % linear da base — o de 12 % nunca foi validado em render')
ok(/start_scale: k % 2 === 0 \? '100%' : '106%'/.test(animCurta) && /easing: 'linear'/.test(animCurta) && !/x_anchor/.test(animCurta), '5 o ramo curto é byte a byte a animação da base (100↔106, linear, sem âncora)')
ok(/start_scale: k % 2 === 0 \? '100%' : '112%'/.test(anim) && /end_scale: k % 2 === 0 \? '112%' : '100%'/.test(anim), '5 sobra ≥ 1 s: escala alterna 100→112 / 112→100')
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

console.log('== 7. simulação ("vai 16"): os 20 filmes reais no tamanho do alvo, com a duração REAL por palavra de cada um ==')
// Cada filme: s/palavra = segundos medidos ÷ palavras (nos 5 que pararam no piso de 15 s, um teto: a fala real foi menor).
// O escritor entrega entre o piso e o teto da faixa; simulado no PIOR caso (teto) e no piso. Cabe = ≤ 15,5 s (a régua da medição).
// A: voz desconhecida (caminho do cliente: a voz é escolhida depois, pelas palavras). B: voz do filme conhecida (caminho do servidor).
type Sim = { id: string; lingua: string; n: number; faixa: { min: number; max: number }; segMax: number; segMin: number; portao: boolean }
const simula = (f: Filme, comVoz: boolean): Sim => {
  const n = narrationWordCount(f[5], f[1]), sPP = f[3] / n, v = VOZ_REAL[f[0]]
  const faixa = faixaDoKling4NoEscritor(f[1], comVoz ? passo(v.voice, v.defaultSpeed, f[1]) : null)
  return { id: f[0], lingua: f[1], n, faixa, segMax: faixa.max * sPP, segMin: faixa.min * sPP, portao: faixa.min >= pisoDoPortaoNaVoz(passo(v.voice, v.defaultSpeed, f[1])) }
}
const placar = (sims: Sim[], campo: 'segMax' | 'segMin') => {
  const por: Record<string, [number, number]> = {}
  for (const s of sims) { por[s.lingua] ??= [0, 0]; por[s.lingua][1]++; if (s[campo] <= 15.5) por[s.lingua][0]++ }
  return { total: sims.filter((s) => s[campo] <= 15.5).length, por }
}
const fmt = (p: ReturnType<typeof placar>) => `${p.total}/20 (${Object.entries(p.por).map(([l, [a, b]]) => `${l} ${a}/${b}`).join(', ')})`
const simA = FILMES.map((f) => simula(f, false)), simB = FILMES.map((f) => simula(f, true))
for (const s of simA) console.log(`       ${s.id} ${s.lingua} ${s.n} pal. → ${s.faixa.min}-${s.faixa.max} pal.: ${s.segMin.toFixed(1)}–${s.segMax.toFixed(1)} s ${s.segMax <= 15.5 ? 'Kling 4' : s.segMin <= 15.5 ? 'Kling 4 no piso' : 'Seedance'}`)
const cabemHoje = FILMES.filter((f) => f[3] <= 15.5).length
const aMax = placar(simA, 'segMax'), aMin = placar(simA, 'segMin'), bMax = placar(simB, 'segMax'), bMin = placar(simB, 'segMin')
console.log(`       PLACAR hoje: ${cabemHoje}/20 · A teto ${fmt(aMax)} · A piso ${fmt(aMin)} · B teto ${fmt(bMax)} · B piso ${fmt(bMin)}`)
ok(cabemHoje === 6, `7 hoje (sem a faixa): ${cabemHoje} de 20 cabem no Kling 4 — o número da revisão`)
ok(aMax.total >= 15 && aMin.total >= 16, `7 voz desconhecida: ${aMax.total}/20 no teto da faixa, ${aMin.total}/20 no piso (meta ~16)`)
ok(bMax.total >= 15 && bMin.total >= 16, `7 voz conhecida: ${bMax.total}/20 no teto, ${bMin.total}/20 no piso`)
ok(aMax.por.en[0] === 10 && bMax.por.en[0] === 10, '7 inglês: 10 de 10 (inclusive onyx 0,92 e alloy, que hoje encolhiam e mesmo assim caíam no Seedance)')
ok(aMin.por.pt[0] >= 3 && aMin.por.ar[0] >= 1 && aMin.por.pl[0] === 1 && aMin.por.de[0] === 1, `7 pt ${aMin.por.pt[0]}/4 · ar ${aMin.por.ar[0]}/3 · pl ${aMin.por.pl[0]}/1 · de ${aMin.por.de[0]}/1 no piso`)
ok(simA.every((s) => s.portao) && simB.every((s) => s.portao), '7 o piso da faixa passa no portão do Seedance de 15 s na voz REAL de cada um dos 20 filmes (nenhum vira "narração curta")')
for (const id of ['de7071ea', 'e8f91bdf']) { const s = simA.find((x) => x.id === id)!; ok(s.segMin <= 15.5, `7 ${id} (onyx 0,92): no piso ${s.segMin.toFixed(1)} s → Kling 4 (hoje Seedance)`) }
{ const s = simA.find((x) => x.id === '702699d9')!; ok(s.segMax <= 12.5, `7 caso do revisor 702699d9: na faixa, ${s.segMax.toFixed(1)} s (com as 43 palavras que teve, 16,7 s)`) }
for (const id of ['802dbace', '7aa3d055', '33d4e5ad', '8d314182']) { const s = simA.find((x) => x.id === id)!; ok(s.segMin > 15.5, `7 ${id} (${s.lingua}, ${(s.segMin / s.faixa.min).toFixed(3)} s/palavra): nem no piso do portão (${s.segMin.toFixed(1)} s) cabe → a medição manda ao Seedance (rede de segurança)`) }
// fora da amostra (02/11, depois da revisão): b4cbb871, en, alloy 0,9, 41 palavras, 19,084 s medidos
{ const sPP = 19.084 / 41; ok(fEn.max * sPP <= 15.5, `7 fora da amostra b4cbb871 (02/11): ${fEn.max} palavras = ${(fEn.max * sPP).toFixed(1)} s → Kling 4`) }

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
ok(compose.includes('A sobra em si fica em até 0,5 s: a rota MEDE a fala') && compose.includes('mas quem decide é a medição') && compose.includes('mira o piso do portão de 15 s'), '9 o comentário diz: sobra ≤ 0,5 s porque a rota mede; o escritor mira, a medição decide')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
