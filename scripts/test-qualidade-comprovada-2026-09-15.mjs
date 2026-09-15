// KINEO-QUALIDADE-COMPROVADA-2026-09-15 — complemento do fundador (15/09): "quero todos os motores
// entregando vídeos bons … corrija problemas concretos … comprovada no resultado final".
// Os defeitos abaixo vieram dos FILMES REAIS de 15/09 (não de guardião):
//   (a) Kling 976eb60d: prompt da cena 6 com "of the ' on the '" (aspas vazias após o filtro de cenário);
//   (b) Kling 976eb60d: escritor parou no piso da faixa (119 = 7 × 17 = 86 % do alvo) → corretivo a 0,795 ×
//       persona 0,92 = voz a 0,73, arrastada;
//   (c) Kineo 1 7e48bfe5: a rota escreveu 190 palavras e escolheu 13 clipes para elas; o cliente narrou o brief
//       de 105 palavras do analyze-idea, reescrito pelo compose para 166 com frases inventadas;
//   (d) Omni 8a519488: cena 6 falhou, a retomada exige image_url e o claim guardava null → 409, filme perdido;
//   (e) Veo (ensaio): 7 × 8 s = 56 s de imagem para 60 s → o compose repetiria cena;
//   (f) Kling 3 f7351c17 / Omni 8a519488: narração inventou "London", "9:00 PM", "October 15, 2023", "1948".
// Cada bloco executa a função real (fatia transpilada) e, onde dá, reproduz o defeito na origin/main.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const main = (p) => { try { return execFileSync('git', ['show', `origin/main:${p}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n') } catch { return null } }
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, Buffer, ...globals }); return exp }

// ── (a) aspas vazias no filtro de cenário ─────────────────────────────────────────────────────
console.log('== (a) filtro de cenário não deixa aspas vazias ==')
{
  const scrubDe = (pol) => {
    const i = pol.indexOf('const SETTING_ALLOW')
    const j = pol.indexOf('\n}\n', pol.indexOf('export function scrubInventedSetting'))
    return roda(pol.slice(i, j + 3)).scrubInventedSetting
  }
  const historia = 'A night train stops at an abandoned station. A woman traveling alone notices that every clock on the platform has stopped. Inside her own suitcase, she discovers a ticket for this station, dated thirty years in the future.'
  const cena6 = "A close-up of a ticket from the original journey of the 'Orient Express on the Northern Line', displaying detailed art deco graphics, dated thirty years in the future"
  const agora = scrubDe(rd('lib/cinematic/visualPromptPolicy.ts'))(cena6, historia)
  checa(`candidato: nenhuma aspa vazia sobra (${agora.text.slice(0, 90)}…)`, !/['"“”‘’]\s*(?:(?:on|the|of|in|at)\s*)*['"“”‘’]/i.test(agora.text) && !/of the\s*,/.test(agora.text) && agora.text.includes('displaying detailed art deco graphics'))
  checa('candidato: nome citado na história fica ("thirty years in the future", "ticket", "station")', agora.text.includes('dated thirty years in the future') && agora.text.includes('ticket'))
  checa('candidato: texto sem nada a remover volta byte-idêntico (regex nova não toca aspas legítimas)', scrubDe(rd('lib/cinematic/visualPromptPolicy.ts'))("Daniel's phone on the table", "Daniel's phone rang").text === "Daniel's phone on the table")
  const polMain = main('lib/cinematic/visualPromptPolicy.ts')
  if (polMain && !polMain.includes('ASPAS_VAZIAS_RE')) {
    const antes = scrubDe(polMain)(cena6, historia)
    checa(`main: reproduz o defeito — sobra "' on the '" (${antes.text.slice(40, 80)})`, /'\s*on the\s*'/.test(antes.text))
  } else checa('main já contém o candidato (reprodução não aplicável)', Boolean(polMain) && polMain.includes('ASPAS_VAZIAS_RE'))
}

// ── (b) piso da faixa = alvo inteiro; régua por voz; corretivo não arrasta ────────────────────
console.log('== (b) escritor mira o alvo inteiro e o corretivo não arrasta a voz ==')
{
  const SW = roda(rd('lib/cinematic/sceneWords.ts').replace(/import \{ targetWordCount \} from '@\/lib\/compose'\n/, ''), { targetWordCount: (s) => Math.round(s * 3.1) })
  const r = SW.wordsPerSceneFor(60, 7, 2.3)
  checa(`60 s / 7 cenas a 2,3 pal/s: piso ${r[0]} × 7 = ${r[0] * 7} ≥ 138 (alvo inteiro), teto ${r[1]} ≤ 110 %`, r[0] * 7 >= 138 && r[1] * 7 <= Math.ceil(138 * 1.1) + 7)
  const swMain = main('lib/cinematic/sceneWords.ts')
  if (swMain && swMain.includes('(total * 0.9) / scenes')) {
    const M = roda(swMain.replace(/import \{ targetWordCount \} from '@\/lib\/compose'\n/, ''), { targetWordCount: (s) => Math.round(s * 3.1) })
    const m = M.wordsPerSceneFor(60, 7, 2.3)
    checa(`main: reproduz — piso ${m[0]} × 7 = ${m[0] * 7} < 138 (o escritor parava em 86 % do alvo)`, m[0] * 7 < 138)
  } else checa('main já contém o candidato (sceneWords)', Boolean(swMain) && !swMain.includes('(total * 0.9) / scenes'))
  // rota fast: cópia local com a mesma regra e a régua da voz
  const fast = rd('app/api/generate-video-fast/route.ts')
  const fIni = fast.indexOf('function wordsPerSceneFor(')
  const fFim = fast.indexOf('\n}\n', fIni) + 3
  const F = roda('export ' + fast.slice(fIni, fFim), { targetWordCount: (s) => Math.round(s * 3.1) })
  const f = F.wordsPerSceneFor(60, 6, 2.63)
  checa(`fast: 60 s / 6 cenas a 2,63 (fable 1,03): piso ${f[0]} × 6 = ${f[0] * 6} ≥ 158; sem régua segue 3,1 (${F.wordsPerSceneFor(60, 6)[0]} × 6 ≥ 186)`, f[0] * 6 >= 158 && F.wordsPerSceneFor(60, 6)[0] * 6 >= 186)
  checa('fast: persona resolvida e régua da voz usada na faixa, na 3ª passada e no portão', fast.includes("const fastPersona = (() => { try { return selectPersonaForScript(prompt, undefined, 'free', narrationLanguage.language as 'en' | 'pt' | 'es') } catch { return null } })()") && fast.includes("const fastRate = speechRateFor({ family: 'classic', speed: parsedScript.speed, language: narrationLanguage.language, voice: fastPersona?.voice, personaSpeed: fastPersona?.defaultSpeed })") && fast.includes('wordsPerScene: wordsPerSceneFor(duration, clipCount, fastRate.wordsPerSecond)') && fast.includes('* fastRate.wordsPerSecond) // KINEO-RITMO-POR-VOZ-KINEO1') && fast.includes('const narrationRate = fastRate'))
  checa('fast: a régua nasce DEPOIS de parsedScript e narrationLanguage e ANTES do escritor', fast.indexOf('const parsedScript = parseUserScript(prompt)') < fast.indexOf('const fastRate = ') && fast.indexOf('const narrationLanguage = resolveNarrationLanguage') < fast.indexOf('const fastRate = ') && fast.indexOf('const fastRate = ') < fast.indexOf('wordsPerScene: wordsPerSceneFor(duration, clipCount, fastRate.wordsPerSecond)'))
  // régua: fable medido
  const SR = roda(rd('lib/speechRate.ts').replace(/import \{[\s\S]*?\} from '@\/lib\/narrationFit'\n/, '').replace(/import \{ parseSpeed, parseUserScript \} from '@\/lib\/scriptParser'\n/, ''), { narrationFit: () => ({ speech: 0, target: 0, silence: 0, coverage: 1, ok: true, missingWords: 0 }), autofitDown: () => ({}), WORDS_PER_SECOND: 2.3, MIN_COVERAGE: 0.95, MIN_AUTOFIT_DOWN_COVERAGE: 0.6, AUTOFIT_DOWN_FLOOR_SECONDS: 20, AUTOFIT_DOWN_STEP_SECONDS: 5, parseSpeed: () => null, parseUserScript: () => ({ narration: '' }) })
  checa('fable a 1,03 (Kineo 1 medido: 166 palavras em 63 s) = 2,63 pal/s; voz fora da tabela segue 3,1', SR.speechRateFor({ family: 'classic', voice: 'fable', personaSpeed: 1.03 }).wordsPerSecond === 2.63 && SR.speechRateFor({ family: 'classic', voice: 'zzz' }).wordsPerSecond === 3.1)
  // escalador do compose: faixa 92–115 % e expansão fiel
  const lc = rd('lib/compose.ts')
  checa('escalador: expande abaixo de 92 % (era 85 %) e mantém +15 % acima; a expansão proíbe evento/lugar/data/número novo', lc.includes('const lo = Math.floor(targetWords * 0.92)') && lc.includes('const hi = Math.ceil(targetWords * 1.15)') && lc.includes('const expandir = words.length < lo') && (lc.match(/never add new events, places, dates, years, times, numbers or claims/g) || []).length === 2 && (lc.match(/Keep every sentence and its order; add descriptive detail, never new events, facts, places, dates or numbers/g) || []).length === 2)
  // corretivo do compose: executa a fatia real com o mundo do Kling 976eb60d (119 palavras, 47,7 s, onyx 0,92)
  const INI = '    const scaledWordCount = scaledScript.split(/\\s+/).filter(Boolean).length'
  const FIM = "        console.warn('[compose] corrective TTS pass failed — keeping original:', msg)\n      }\n    }"
  const fatiaDe = (rota) => { const a = rota.indexOf(INI); const b = rota.indexOf(FIM, a); return a < 0 || b < a ? null : rota.slice(a, b + FIM.length) }
  const montar = (fatia) => roda(`export async function rodar(ctx: any) {\n  const { scaledScript, composeRate, predictTtsSecondsFromWords, DURATION_TOLERANCE_SECONDS, cachedVoiceover, avatarMode, hasUserVoice, clonedVoiceUsed, explicitSpeed, claimVerbatim, duration, generateTTS, estimateMp3DurationSeconds, vertical, narrationTier, language, console } = ctx\n  let realAudioDuration: number = ctx.realAudioDuration\n  let audioBuffer: any = ctx.audioBuffer\n${fatia}\n  return { realAudioDuration, audioBuffer }\n}`).rodar
  const mundo = () => {
    const chamadas = []
    const ctx = {
      scaledScript: Array.from({ length: 119 }, (_, i) => `w${i}`).join(' '), composeRate: { family: 'classic', wordsPerSecond: 2.3, personaSpeed: 0.92 }, predictTtsSecondsFromWords: (w) => w / 3.1, DURATION_TOLERANCE_SECONDS: 3,
      cachedVoiceover: null, avatarMode: false, hasUserVoice: false, clonedVoiceUsed: false, explicitSpeed: null, claimVerbatim: false,
      duration: 60, realAudioDuration: 47.7, audioBuffer: Buffer.from('original'),
      generateTTS: async (_s, speed) => { chamadas.push(speed); return Buffer.from('retry@' + speed) },
      estimateMp3DurationSeconds: (buf) => { const m = /retry@([\d.]+)/.exec(String(buf)); if (!m) return 47.7; const v = Number(m[1]); return Math.round((47.7 * 0.92 / Math.max(0.7, Math.min(1.3, 0.92 * v))) * 10) / 10 },
      vertical: 'mystery', narrationTier: 'cinematic', language: 'en', console: { log: () => {}, warn: () => {} },
    }
    return { ctx, chamadas }
  }
  const fatia = fatiaDe(rd('app/api/compose/route.ts'))
  checa('fatia previsão → corretivo existe no compose', Boolean(fatia))
  if (fatia) {
    const { ctx, chamadas } = mundo()
    const r = await montar(fatia)(ctx)
    const efetiva = chamadas.length ? 0.92 * chamadas[0] : null
    checa(`candidato: corretivo pedido ${chamadas[0]?.toFixed(3)} → voz efetiva ${efetiva?.toFixed(3)} ≥ 0,85 (nunca 0,73); áudio ${r.realAudioDuration}s`, chamadas.length === 1 && efetiva >= 0.85 - 1e-9 && r.realAudioDuration > 47.7)
    checa('candidato: o piso é declarado (0,85 efetivo) e dividido pela velocidade da persona', fatia.includes('const CORRETIVO_PISO_EFETIVO = 0.85') && fatia.includes('const correctiveSpeed = Math.max(CORRETIVO_PISO_EFETIVO / (composeRate.personaSpeed || 1), correctiveRaw)'))
  }
  const rotaMain = main('app/api/compose/route.ts')
  const fm = rotaMain ? fatiaDe(rotaMain) : null
  if (fm && !fm.includes('CORRETIVO_PISO_EFETIVO')) {
    const { ctx, chamadas } = mundo()
    await montar(fm)(ctx)
    checa(`main: reproduz — corretivo ${chamadas[0]?.toFixed(3)} × 0,92 = voz a ${(0.92 * (chamadas[0] ?? 0)).toFixed(2)} (arrastada)`, chamadas.length === 1 && 0.92 * chamadas[0] < 0.75)
  } else checa('main já contém o candidato (compose)', Boolean(fm) && fm.includes('CORRETIVO_PISO_EFETIVO'))
}

// ── (c) Kineo 1: a narração é a das cenas ─────────────────────────────────────────────────────
console.log('== (c) cliente narra o texto para o qual o footage foi escolhido ==')
{
  const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('responseVoiceover/Captions não dependem mais de data.verbatim', gc.includes("const responseVoiceover = typeof data.voiceover_script === 'string' && data.voiceover_script.trim().length > 0\n          ? data.voiceover_script\n          : null") && gc.includes("const responseCaptions = Array.isArray(data.scene_captions)\n          ? data.scene_captions.filter((caption: unknown): caption is string => typeof caption === 'string')\n          : null") && !gc.includes("const responseVoiceover = data.verbatim && typeof data.voiceover_script === 'string'"))
  checa('setFastVoiceover/setFastCaptions incondicionais; velocidade explícita só no verbatim', gc.includes('        setFastVoiceover(responseVoiceover)\n        setFastCaptions(responseCaptions)\n        setTtsSpeed(data.verbatim ? responseSpeed : null)') && !gc.includes('        } else {\n          setFastVoiceover(null)\n          setFastCaptions(null)\n          setTtsSpeed(null)\n        }'))
  checa('o kickCompose continua preferindo fastVoiceover ao brief (mecanismo do Push #235 intacto)', gc.includes('fastVoiceover && fastVoiceover.trim().length > 0\n            ? fastVoiceover\n            : buildVoiceoverScript(prompt, analysis)'))
  const fast = rd('app/api/generate-video-fast/route.ts')
  checa('a rota fast devolve voiceover_script = falas das cenas (modo IA) — a fonte que o cliente agora usa', fast.includes('verbatim && parsedScript.narration ? parsedScript.narration : sceneJoinedVoiceover') && fast.includes('voiceover_script: voiceoverScript,'))
}

// ── (d) âncora real no claim → retomada do Omni possível ─────────────────────────────────────
console.log('== (d) claim guarda a image_url real por cena; a retomada aceita a cena ==')
{
  const rc = rd('app/api/generate-video-cinematic/route.ts')
  checa('rota: hSceneAnchors declarado ao lado de hSubmittedPrompts, preenchido no submit e lido no claim', rc.includes('const hSceneAnchors: (string | null)[] = []') && rc.includes('hSceneAnchors[idx] = sceneAnchor ?? null') && rc.includes('scene_anchor_urls: plan.scenes.map((s, i) => {\n          if (hSceneAnchors[i]) return hSceneAnchors[i]\n          if (!anchors) return null'))
  checa('rota: o preenchimento vem logo depois da escolha da âncora (still FLUX incluído)', rc.indexOf('const sceneAnchor = anchorUrl ?? sceneStillUrl ?? undefined') + 80 > rc.indexOf('hSceneAnchors[idx] = sceneAnchor ?? null') && rc.indexOf('hSceneAnchors[idx] = sceneAnchor ?? null') > rc.indexOf('const sceneAnchor = anchorUrl ?? sceneStillUrl ?? undefined'))
  // executa signedScene da rota de retomada: com âncora null o Omni é recusado (o 409 de ontem); com https, aceito
  const rr = rd('app/api/retry-hollywood-scene/route.ts')
  const a = rr.indexOf('function signedScene(')
  const b = rr.indexOf('\n}\n', a) + 3
  const SS = roda('export ' + rr.slice(a, b), { KLING3_I2V_MODEL: 'fal-ai/kling-video/o3/pro/image-to-video', H3_I2V_MODEL: 'minimax/h3/image-to-video', OMNI_I2V_MODEL: 'google/gemini-omni-flash/image-to-video' })
  const claimDe = (anchor) => ({ response: { scene_prompts: ['x'.repeat(40)], scene_seconds: [8], scene_anchor_urls: [anchor] } })
  const slot = { index: 0, oldRequestId: 'r', model: 'google/gemini-omni-flash/image-to-video' }
  checa('retomada: Omni com âncora null é recusado (a causa do 409 do 8a519488) e com https é aceito com a mesma âncora', SS.signedScene(claimDe(null), slot) === null && SS.signedScene(claimDe('https://v3.fal.media/still.png'), slot)?.anchor === 'https://v3.fal.media/still.png')
  const rcMain = main('app/api/generate-video-cinematic/route.ts')
  if (rcMain && !rcMain.includes('hSceneAnchors')) {
    checa('main: reproduz — scene_anchor_urls só conhece retrato/ambiente (still por cena vai como null)', rcMain.includes('scene_anchor_urls: plan.scenes.map((s) => {\n          if (!anchors) return null') && !rcMain.includes('hSceneAnchors'))
  } else checa('main já contém o candidato (âncoras)', Boolean(rcMain) && rcMain.includes('hSceneAnchors'))
}

// ── (e) Veo cobre a fala em toda duração ─────────────────────────────────────────────────────
console.log('== (e) Veo: imagem ≥ fala em 35/45/60/90 s ==')
{
  const rc = rd('app/api/generate-video-cinematic/route.ts')
  checa('rota: a regra ⌈s/8⌉ + 1 vale para todo Veo (não só > 64 s), teto 12, sem Sora', rc.includes('if (wantsVeo) clipCount = Math.max(clipCount, Math.min(12, Math.ceil(duration / 8) + 1))') && !rc.includes('if (wantsVeo && duration > 64)') && !/wantsSora\) clipCount = Math\.max/.test(rc))
  const base = (d) => Math.max(2, Math.min(9, Math.ceil(d / 9)))
  const veo = (d) => Math.max(base(d), Math.min(12, Math.ceil(d / 8) + 1))
  for (const d of [35, 45, 60, 90]) checa(`Veo ${d} s → ${veo(d)} clipes = ${veo(d) * 8} s de imagem ≥ ${d} s + folga de 1 clipe`, veo(d) * 8 >= d + 8 || veo(d) === 12)
  checa('custo e autorização registrados no código (+$1,60 a 60 s; preço público 100 cr inalterado; fundador 15/09/2026)', rc.includes('60 s passa de $5,60 para $7,20 (+$1,60)') && rc.includes('preço público (100 cr a 60 s) inalterado') && rc.includes('autorizado pelo fundador em 15/09/2026'))
  const rw = rd('lib/runway.ts')
  checa('escritor de cenas aceita 12 (teto 9 devolvia 9 cenas para os 12 clipes do Veo a 90 s)', rw.includes('const safeCount = Math.max(1, Math.min(12, Math.floor(count)))'))
  checa('ensaio de $0 clássico mede footage = cenas × segundos do clipe (é ele que barrou os 56 s)', rd('lib/cinematic/classicDryRun.ts').includes('const footageSeconds = round1(scenes.length * perClip)'))
}

// ── (f) planejador hollywood não inventa data/lugar/hora/número ───────────────────────────────
console.log('== (f) planejador: fidelidade ao pedido ==')
{
  const rt = rd('lib/hollywood/router.ts')
  const s = rt.indexOf('const system = `You are a Hollywood-grade director')
  const e = rt.indexOf('const userMsg = ', s)
  const sys = rt.slice(s, e)
  checa('regra STORY FIDELITY dentro do system prompt, com os casos reais nomeados', sys.includes('- STORY FIDELITY (STRICT — KINEO-FIDELIDADE-AO-PEDIDO-2026-09-15') && sys.includes('every event, place, clock time, date, year, name and number in the spoken lines must come FROM THE INPUT') && sys.includes('Never invent a city, a date, a year, a time of day, a price or a statistic') && sys.includes('do not resolve or explain what the input leaves open'))
  checa('o HOOK não manda mais inventar número: "TAKEN FROM THE INPUT … never invent a statistic"', sys.includes('built on a CONCRETE number or image TAKEN FROM THE INPUT') && sys.includes('never invent a statistic to sound concrete') && !sys.includes('built on a CONCRETE number (e.g.'))
  checa('a regra vem depois do bloco SCREENWRITER (contexto certo) e antes de OTHER HARD RULES', sys.indexOf('YOU ARE THE SCREENWRITER') < sys.indexOf('- STORY FIDELITY (STRICT') && sys.indexOf('- STORY FIDELITY (STRICT') < sys.indexOf('OTHER HARD RULES'))
}

console.log(`${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
