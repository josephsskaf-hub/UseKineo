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
  checa('escalador: expande abaixo de 92 % (era 85 %) e só condensa acima de +25 % (R17; era +15 %); a expansão proíbe evento/lugar/data/número novo', lc.includes('const lo = Math.floor(targetWords * 0.92)') && lc.includes('const hi = Math.ceil(targetWords * 1.25)') && rd('lib/cinematic/classicDryRun.ts').includes('export const COMPOSE_RESCALE_TOLERANCE = 0.25') && lc.includes('const expandir = words.length < lo') && (lc.match(/never add new events, places, dates, years, times, numbers or claims/g) || []).length === 2 && (lc.match(/Keep every sentence and its order; add descriptive detail, never new events, facts, places, dates or numbers/g) || []).length === 2)
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
  const SS = roda('export ' + rr.slice(a, b), { KLING3_I2V_MODEL: 'fal-ai/kling-video/o3/pro/image-to-video', H3_I2V_MODEL: 'minimax/h3/image-to-video', OMNI_I2V_MODEL: 'google/gemini-omni-flash/image-to-video', S25_I2V_MODEL: 'fal-ai/seedance-2.5/image-to-video' })
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

// ── (g) escritor R2: contagem exigida, abreviação não quebra frase, metade nova com outro plano, expansão indexada ──
console.log('== (g) escritor de cenas: 9 pedidas / 6 devolvidas, "Dr.", expansão indexada ==')
{
  const rw = rd('lib/runway.ts')
  const fnDe = (src, name) => { const sf = ts.createSourceFile('r.ts', src, ts.ScriptTarget.Latest, true); let found; const visit = (n) => { if (!found && ts.isFunctionDeclaration(n) && n.name?.text === name) found = n; if (!found) ts.forEachChild(n, visit) }; visit(sf); const t = found.getText(sf); return /^export /.test(t) ? t : 'export ' + t }
  const fn = (name) => fnDe(rw, name)
  const pedidos = []
  const seis = Array.from({ length: 6 }, (_, k) => ({ description: `shot ${k + 1}`, searchKeywords: `k${k + 1}`, stockSearchQuery: `medium shot q${k + 1}`, negativeVisualPrompt: 'x', scenePurpose: 'EXPLANATION', visualIntent: 'y', visualCategory: 'general_documentary', voiceover: k === 1 ? 'The geologist, Dr. Emily Carter, watched closely as the needle moved. At dawn she peered through the window at the red glow.' : `line ${k + 1} with some words here`, caption: `c${k + 1}` }))
  const openai = { chat: { completions: { create: async (req) => {
    pedidos.push(req.messages.map((m) => m.content).join('\n'))
    if (pedidos.length === 1) return { choices: [{ message: { content: JSON.stringify(seis) } }] }
    // expansão: resposta INDEXADA, com uma linha omitida e uma curta demais (nunca substitui por texto menor)
    const items = JSON.parse(req.messages[1].content)
    return { choices: [{ message: { content: JSON.stringify(items.filter((it) => it.i !== 0).map((it) => ({ i: it.i, text: it.i === 3 ? 'short' : `${it.text} now expanded with sixteen concrete words about the same event and place today` }))) } }] }
  } } } }
  const api = roda([fn('shortCaptionFromVoiceover'), fn('generateScenes'), fn('expandShortVoiceovers')].join('\n'), { openai, detectVisualCategory: () => undefined, LANGUAGE_NAMES: { en: 'English' }, classicVisualNegativePrompt: () => 'x', isStylizedLook: () => false, visualDescriptionDirection: () => 'y', aspectSpec: () => ({ promptFraming: '9:16' }) })
  const r = await api.generateScenes('A volcano observatory at dawn. A geologist notices the needle.', 9, undefined, { wordsPerScene: [16, 17] })
  // 15/09 (KINEO-CENAS-DISTINTAS): com faixa o modelo planeja no máximo 7 cenas DISTINTAS (Veo cf8cbce5 inventou "café" para a 6ª de 9); o resto nasce da divisão com outro plano.
  checa(`9 pedidas com faixa: o modelo recebe 7 distintas (${pedidos[0].includes('Plan 7 scenes') && pedidos[0].includes('You MUST return exactly 7 scene objects') ? 'sim' : 'não'}) e o resultado tem 9 cenas (${r.length})`, pedidos[0].includes('Plan 7 scenes') && pedidos[0].includes('You MUST return exactly 7 scene objects') && !pedidos[0].includes('Plan 9 scenes') && r.length === 9)
  checa('a linha falada pede fidelidade ao texto da ideia (sem nome, hora, data ou estatística inventados)', pedidos[0].includes('never invent a character name, a time of day, a date or a statistic'))
  checa('"Dr. Emily Carter" não vira fim de frase: nenhuma cena com ≤ 4 palavras', r.every((s) => s.voiceover.split(/\s+/).length > 4) && !r.some((s) => /Dr\.$/.test(s.voiceover.trim())))
  const divididas = r.filter((s) => /of the same moment: /.test(s.description))
  checa(`as cenas nascidas de divisão (${divididas.length}) mostram o mesmo assunto com outro plano (descrição e consulta diferentes da origem)`, divididas.length >= 1 && divididas.every((s) => /^(Close-up detail|Wide establishing shot) of the same moment: shot \d/.test(s.description) && /^(close-up macro|wide establishing) q\d/.test(s.stockSearchQuery)))
  checa('expansão indexada: linhas devolvidas com {i, text} crescem; a omitida e a mais curta ficam como estavam', pedidos.length >= 2 && pedidos[1].includes('"i": <the same i you received>') && r.filter((s) => / now expanded with sixteen concrete words/.test(s.voiceover)).length >= 5 && !r.some((s) => s.voiceover === 'short'))
  // reprodução na main: array de strings com tamanho diferente → nada aplicado
  const rwMain = main('lib/runway.ts')
  if (rwMain && !rwMain.includes('KINEO-ESCRITOR-R2')) {
    const pedidosM = []
    const openaiM = { chat: { completions: { create: async (req) => { pedidosM.push(req); if (pedidosM.length === 1) return { choices: [{ message: { content: JSON.stringify(seis) } }] }; const arr = JSON.parse(req.messages[1].content); return { choices: [{ message: { content: JSON.stringify(arr.slice(1).map((t) => `${t} now expanded with sixteen concrete words about the same event and place today`)) } }] } } } } }
    const fnM = (name) => fnDe(rwMain, name)
    const apiM = roda([fnM('shortCaptionFromVoiceover'), fnM('generateScenes'), fnM('expandShortVoiceovers')].join('\n'), { openai: openaiM, detectVisualCategory: () => undefined, LANGUAGE_NAMES: { en: 'English' }, classicVisualNegativePrompt: () => 'x', isStylizedLook: () => false, visualDescriptionDirection: () => 'y', aspectSpec: () => ({ promptFraming: '9:16' }) })
    const rm = await apiM.generateScenes('A volcano observatory at dawn. A geologist notices the needle.', 9, undefined, { wordsPerScene: [16, 17] })
    checa(`main: reproduz — "Dr." vira cena de 3 palavras e uma linha a menos na resposta descarta TODA a expansão (${rm.filter((s) => / now expanded/.test(s.voiceover)).length} aplicadas)`, rm.some((s) => /Dr\.$/.test(s.voiceover.trim())) && rm.filter((s) => / now expanded/.test(s.voiceover)).length === 0)
  } else checa('main já contém o candidato (escritor R2)', Boolean(rwMain) && rwMain.includes('KINEO-ESCRITOR-R2'))
}

// ── (h) S25: datas/horas inventadas saem da fala; acréscimo de fala indexado e com motivo ──
console.log('== (h) data inventada removida em código; acréscimo de fala indexado ==')
{
  const fd = rd('lib/hollywood/fidelidade.ts')
  const a = fd.indexOf('const MESES = ')
  const b = fd.indexOf('\n}\n', fd.indexOf('export function removerDatasInventadas')) + 3
  const F = roda(fd.slice(a, b))
  const pedido = 'A research station on the Antarctic coast during a storm. The last entry is dated today and signed with his name. An old watchmaker closes his shop at night. In 1963 a landslide forced most of its people to leave.'
  const c1 = F.removerDatasInventadas('The Antarctic research station stands isolated, battered by a fierce storm on March 3, 2023.', pedido)
  checa(`"on March 3, 2023" sai inteiro com a preposição: "${c1.texto}"`, c1.texto === 'The Antarctic research station stands isolated, battered by a fierce storm.' && c1.removidas.length === 1)
  const c2 = F.removerDatasInventadas('In a quiet corner of London, an old watchmaker closes his shop at precisely 9:00 PM each night, locking the door behind him.', pedido)
  checa(`"at precisely 9:00 PM each night" sai: "${c2.texto}"`, /closes his shop(?: at precisely)?, locking the door behind him\.$/.test(c2.texto) && !/9:00/.test(c2.texto))
  const c3 = F.removerDatasInventadas("Inside, engraved, is his own name and tomorrow's date: October 15, 2023.", pedido)
  checa(`"October 15, 2023" sai e a frase fecha com ponto: "${c3.texto}"`, c3.texto === "Inside, engraved, is his own name and tomorrow's date:." || c3.texto === "Inside, engraved, is his own name and tomorrow's date." || /tomorrow's date\.?$/.test(c3.texto))
  const c4 = F.removerDatasInventadas('In 1963 a landslide forced most of its people to leave; in 1980 an earthquake emptied the last houses.', pedido + ' 1980')
  checa('ano que ESTÁ no pedido fica (1963, 1980)', c4.texto.includes('In 1963') && c4.texto.includes('in 1980') && c4.removidas.length === 0)
  const c5 = F.removerDatasInventadas('The map, meticulously drawn in 1948 by her grandfather, reveals secrets.', 'a map drawn by her grandfather')
  checa(`"in 1948" sai: "${c5.texto}"`, c5.texto === 'The map, meticulously drawn by her grandfather, reveals secrets.' )
  checa('texto sem data volta byte-idêntico', F.removerDatasInventadas('He looks up: through the window, his own station has gone dark.', pedido).texto === 'He looks up: through the window, his own station has gone dark.')
  const c6 = F.removerDatasInventadas('At precisely 5:47 AM, the early morning light begins to illuminate the observatory.', 'A volcano observatory at dawn.')
  checa(`R18: "At precisely 5:47 AM," sai inteiro e a frase recomeça com maiúscula: "${c6.texto}"`, c6.texto === 'The early morning light begins to illuminate the observatory.')
  const rt = rd('lib/hollywood/router.ts')
  checa('planejador aplica a remoção às falas (voiceover e dialogueLine) com o pedido como contexto, depois da fidelidade', rt.includes("import { aplicarFidelidadeAoPlano, removerDatasInventadas, fichaDoPedido, trocarFichaNosPrompts } from '@/lib/hollywood/fidelidade'") && rt.includes('const r = removerDatasInventadas(v, contexto)') && rt.indexOf('KINEO-DATA-INVENTADA') > rt.indexOf('if (hostFits) aplicarFidelidadeAoPlano('))
  // acréscimo indexado: resposta com uma linha omitida e outra que reescreve a base
  const rw = rd('lib/runway.ts')
  const fnDe2 = (name) => { const sf = ts.createSourceFile('r.ts', rw, ts.ScriptTarget.Latest, true); let found; const visit = (n) => { if (!found && ts.isFunctionDeclaration(n) && n.name?.text === name) found = n; if (!found) ts.forEachChild(n, visit) }; visit(sf); const t = found.getText(sf); return /^export /.test(t) ? t : 'export ' + t }
  const avisos = []
  const openai = { chat: { completions: { create: async (req) => { const lote = JSON.parse(req.messages[1].content); return { choices: [{ message: { content: JSON.stringify(lote.filter((x) => x.i !== 1).map((x) => ({ i: x.i, text: x.i === 2 ? 'This continuation is far too long to fit inside the ten word ceiling of that scene.' : x.i === 3 ? 'Cold air rises. Then a much longer second sentence follows that would never fit in the room left.' : 'Cold air moves across the ice, and the lamp keeps turning.' }))) } }] } } } } }
  const A = roda([ 'const FILLER_LINE_RE = /^(here is something most people do not know about|imagine|what if|most people don\'?t know)/i', fnDe2('juntarContinuacao'), fnDe2('appendNarrationToTargets'), fnDe2('pedidoDeFiccao'), rw.slice(rw.indexOf('const REGRA_FICCAO = '), rw.indexOf('\n', rw.indexOf('const REGRA_FICCAO = '))), fnDe2('pedirContinuacao') ].join('\n'), { openai, LANGUAGE_NAMES: { en: 'English' }, console: { log: () => {}, warn: (m) => avisos.push(String(m)) } })
  const itens = [ { text: 'The light comes from an old lighthouse frozen into the ice.', addWords: 5, maxWords: 25 }, { text: 'He puts on his red parka.', addWords: 5, maxWords: 25 }, { text: 'Inside, a logbook lies open on a table.', addWords: 5, maxWords: 10 }, { text: 'The lamp still turns above the ice.', addWords: 5, maxWords: 12 } ]
  const r = await A.appendNarrationToTargets(itens, 'en', 'a lighthouse on the ice', 1)
  checa(`indexado: a linha 0 cresce (${r[0].split(/\s+/).length} palavras), a 1 (omitida) e a 2 (passaria do teto de 10) ficam como estavam`, r[0].startsWith('The light comes from an old lighthouse frozen into the ice. Cold air') && r[1] === itens[1].text && r[2] === itens[2].text)
  checa(`toda recusa tem motivo no log (${avisos.length}): omitida e longa demais`, avisos.some((m) => /line 1 had no continuation/.test(m)) && avisos.some((m) => /line 2 refused \(\d+ > max 10 words\)/.test(m)))
  checa(`R6: continuação longa demais (18 palavras para 5 de sobra) fica com a PRIMEIRA frase quando ela cabe: "${r[3]}"`, r[3] === 'The lamp still turns above the ice. Cold air rises.' && avisos.some((m) => /line 3 trimmed to its first sentence/.test(m)))
  checa('o pedido de continuação é indexado e proíbe inventar data/nome/estatística', rw.includes('Return ONLY a JSON array of objects {"i": <the same i you received>, "text": "<the continuation only>"}') && rw.includes('never invent names, dates, years, clock times or statistics that are not in the topic'))
}

// ── (i) S25: a rota de status e a retomada conhecem o Seedance 2.5 (render 4328b078 girou em 503 com 7 clipes pagos) ──
console.log('== (i) status/retomada reconhecem os modelos do Seedance 2.5 ==')
{
  const st = rd('app/api/cinematic-clip-status/route.ts')
  const i = st.indexOf('const ALLOWED_MODELS = new Set(['); const j = st.indexOf('])', i)
  const lista = st.slice(i, j)
  checa('status: S25_I2V_MODEL e S25_T2V_MODEL na lista permitida, espelhando lib/hollywood/router', lista.includes('S25_I2V_MODEL') && lista.includes('S25_T2V_MODEL') && st.includes("const S25_I2V_MODEL = 'fal-ai/seedance-2.5/image-to-video'") && rd('lib/hollywood/router.ts').includes("export const S25_I2V_MODEL = 'fal-ai/seedance-2.5/image-to-video'"))
  const rr = rd('app/api/retry-hollywood-scene/route.ts')
  checa('retomada: S25 permitido, i2v exige âncora e o payload segue o schema (duration string, 480p, sem áudio)', rr.includes('OMNI_I2V_MODEL, S25_I2V_MODEL, S25_T2V_MODEL])') && rr.includes('[KLING3_I2V_MODEL, H3_I2V_MODEL, OMNI_I2V_MODEL, S25_I2V_MODEL].includes(slot.model)') && rr.includes("if (model === S25_I2V_MODEL) return { image_url: scene.anchor, prompt, duration: String(Math.max(4, Math.min(30, scene.seconds))), resolution: S25_RESOLUTION, generate_audio: false }"))
  const stMain = main('app/api/cinematic-clip-status/route.ts')
  if (stMain && !stMain.includes('S25_I2V_MODEL')) checa('main: reproduz — a lista não tem o Seedance 2.5 (503 "unsupported model")', !stMain.slice(stMain.indexOf('const ALLOWED_MODELS'), stMain.indexOf('])', stMain.indexOf('const ALLOWED_MODELS'))).includes('seedance-2.5'))
  else checa('main já contém o candidato (status S25)', Boolean(stMain) && stMain.includes('S25_I2V_MODEL'))
}
// ── (j) ficha do pedido vence a do planejador; no S25 a cena com pessoa vai em t2v (hipótese do 422) ──
console.log('== (j) ficha do pedido no planejador hollywood; S25 pessoa → t2v ==')
{
  const fd = rd('lib/hollywood/fidelidade.ts')
  const a = fd.indexOf('export function fichaDoPedido('); const b = fd.indexOf('\n}\n', fd.indexOf('export function trocarFichaNosPrompts')) + 3
  const F = roda(fd.slice(a, b))
  const pedido = 'a broad-shouldered man in his fifties with a gray beard, a red parka and a black wool hat'
  const modelo = 'A rugged male engineer in his late 30s, with short brown hair, wearing a red parka and snow goggles, slightly weathered face from harsh conditions'
  checa('fichaDoPedido: as palavras do pedido vencem; sem pedido, fica a do modelo', F.fichaDoPedido(modelo, pedido) === pedido && F.fichaDoPedido(modelo, null) === modelo && F.fichaDoPedido(modelo, 'x') === modelo)
  const cenas = [{ prompt: `Close-up shot of ${modelo} staring out a frosted window.` }, { prompt: 'Wide shot of the station in the storm.' }, { prompt: `Medium shot of ${modelo}, red parka.` }]
  const n = F.trocarFichaNosPrompts(cenas, modelo, pedido)
  checa(`trocarFichaNosPrompts: ${n} prompts trocados, o resto intacto`, n === 2 && cenas[0].prompt === `Close-up shot of ${pedido} staring out a frosted window.` && cenas[1].prompt === 'Wide shot of the station in the storm.' && cenas[2].prompt.startsWith(`Medium shot of ${pedido},`))
  const rt = rd('lib/hollywood/router.ts')
  checa('planejador: recebe characterHint, exige no prompt (CHARACTER FROM THE INPUT) e aplica em código depois da fidelidade', rt.includes('characterHint?: string | null') && rt.includes('CHARACTER FROM THE INPUT (STRICT — KINEO-FICHA-DO-PEDIDO-2026-09-15') && rt.includes('const characterSheet = args.characterHint ? sanitizeRealPeople(fichaDoPedido(fichaDoModelo, args.characterHint)) : fichaDoModelo') && rt.includes('trocarFichaNosPrompts(outScenes, fichaDoModelo, characterSheet)') && rt.indexOf('trocarFichaNosPrompts(outScenes') > rt.indexOf('if (hostFits) aplicarFidelidadeAoPlano('))
  const rc = rd('app/api/generate-video-cinematic/route.ts')
  checa(`rota: a ficha do pedido vai a TODAS as chamadas do planejador (${(rc.match(/characterHint: fichaDoPedidoTexto/g) || []).length} de ${(rc.split('planHollywoodScenes({').length - 1)}) — R9: o plano final vinha de um replan sem ela`, rc.includes('const fichaDoPedidoTexto = deriveExplicitCharacter(prompt)') && (rc.match(/characterHint: fichaDoPedidoTexto/g) || []).length === (rc.split('planHollywoodScenes({').length - 1) && rc.includes('deriveExplicitCharacter, deriveStyleAnchor'))
  checa('varredura final: contexto = só o pedido (o brief da IA trazia a data) e nomes/lugares inventados saem da fala (scrubInventedSetting)', rc.includes('const contextoDatas = prompt') && rc.includes('const r2 = scrubInventedSetting(r.texto, contextoDatas)') && rd('lib/hollywood/router.ts').includes("const contexto = String(idea ?? '')"))
  checa('rota: no S25 a cena com pessoa em quadro pula o still (t2v) — hipótese registrada como tal', rc.includes('KINEO-S25-PESSOA-T2V-2026-09-15 (HIPÓTESE, não provada)') && rc.includes("const s25PessoaEmQuadro = family === 's25' && ") && rc.includes("if ((hs.type === 'support' || hs.type === 'cinematic') && !anchorUrl && !s25PessoaEmQuadro) {"))
  const SS = rd('lib/cinematic/sceneStyle.ts')
  const i2 = SS.indexOf('const EXPLICIT_CHARACTER_RES'); const j2 = SS.indexOf('\n}\n', SS.indexOf('export function deriveExplicitCharacter')) + 3
  let extraiu = null
  try { const E = roda(SS.slice(i2, j2).replace(/^const limpaDescricao[^\n]*\n/m, ''), { limpaDescricao: (s) => s.replace(/\s+/g, ' ').replace(/[\s,;:]+$/, '').replace(/\s+(?:and|e|y)$/i, '').trim() }); extraiu = E.deriveExplicitCharacter('Keep the same engineer throughout: a broad-shouldered man in his fifties with a gray beard, a red parka and a black wool hat.\n\nUse third-person voiceover throughout.') } catch (e) { extraiu = 'ERRO ' + (e instanceof Error ? e.message : String(e)) }
  checa(`deriveExplicitCharacter lê a ficha do pedido do S25: ${JSON.stringify(extraiu)}`, typeof extraiu === 'string' && /fifties/.test(extraiu) && /gray beard/.test(extraiu) && /black wool hat/.test(extraiu))
}

// ── (k) R10: sobra curta reescreve ao alvo; terceira pessoa exigida → replan; partícula no nome próprio ──
console.log('== (k) sobra curta → reescrita; primeira pessoa → replan; Salar de Uyuni inteiro ==')
{
  const rc = rd('app/api/generate-video-cinematic/route.ts')
  checa('rota: cena com < 6 palavras de sobra é reescrita (pede teto + 4, aceita teto + 2) (expandVoiceoversToTargets); as outras seguem por acréscimo', rc.includes('const porReescrita = pedidos.filter((pd) => pd.maxWords - wordsOfLine(lineOf(pd.x.sc)) < 6)') && rc.includes('targetWords: pd.maxWords + 4, maxWords: pd.maxWords + 2') && rc.includes('const novas = await expandVoiceoversToTargets(alvos, hollywoodLanguage, prompt.slice(0, 300))') && rc.includes('const continuacoes = porAcrescimo.length > 0 ? await appendNarrationToTargets(') && rc.includes('porAcrescimo.forEach((pd, k) => {'))
  const rt = rd('lib/hollywood/router.ts')
  checa('planejador: pedido em terceira pessoa + ≥ 2 falas em primeira → UM replan com o motivo (personRetry)', rt.includes('personRetry?: boolean') && rt.includes("if (!args.personRetry && /\\bthird[- ]person\\b/i.test(String(idea ?? '')))") && rt.includes('return planHollywoodScenes({ ...args, personRetry: true, shortRetryFeedback:') && rt.indexOf('KINEO-TERCEIRA-PESSOA-2026-09-15 — ensaio') > rt.indexOf('trocarFichaNosPrompts(outScenes'))
  const pol = rd('lib/cinematic/visualPromptPolicy.ts')
  const i = pol.indexOf('const SETTING_ALLOW'); const j = pol.indexOf('\n}\n', pol.indexOf('export function scrubInventedSetting'))
  const scrub = roda(pol.slice(i, j + 3)).scrubInventedSetting
  const r = scrub("In the heart of Bolivia's Salar de Uyuni, I traverse the salt flats, searching for the X.", 'A cartographer crosses a salt desert on foot, following a map drawn by her grandfather.')
  checa(`"Bolivia's Salar de Uyuni" sai inteiro, sem sobrar "de": "${r.text}"`, r.text === 'In the heart, I traverse the salt flats, searching for the X.' && r.removed.includes('de'))
  checa('nome do pedido com partícula fica ("Rio de Janeiro" na história)', scrub('Aerial view of Rio de Janeiro at dawn', 'A boy in Rio de Janeiro wakes up early.').text === 'Aerial view of Rio de Janeiro at dawn')
  // R19 — filme do Veo acd05d78 (16/09 01:35 UTC, deploy 4793d2f0): a varredura deixou "St. Helens", "ʻumaʻu crater" e
  // ", ensuring no repetition" nos prompts enviados; e a fala saiu "The geologist, observes" depois de tirar o nome.
  const hist = 'A volcano observatory at dawn. A geologist on the night shift notices the seismograph needle drawing wider and wider lines.'
  const k1 = scrub("A macro close-up of a geologist's hands scribbling notes, surrounded by geological maps of the Mount St. Helens eruption, with the volcano's peak in the blurry background.", hist)
  checa(`R19: "Mount St. Helens" sai inteiro (nada de "St. Helens" sobrando): "${k1.text}"`, k1.text === "A macro close-up of a geologist's hands scribbling notes, surrounded by geological maps of the eruption, with the volcano's peak in the blurry background." && k1.removed.includes('St.') && k1.removed.includes('Helens'))
  const k2 = scrub('Aerial view of the active volcano, a bright orange lava lake bubbling within the Halemaʻumaʻu crater at Kilauea, Hawaii, with gases rising.', hist)
  checa(`R19: "Halemaʻumaʻu" (okina) sai inteiro, sem "ʻumaʻu", e Kilauea/Hawaii junto: "${k2.text}"`, k2.text === 'Aerial view of the active volcano, a bright orange lava lake bubbling within the crater, with gases rising.' && k2.removed.includes('Halemaʻumaʻu'))
  const k3 = scrub('A close-up montage of distinct volcanic events, including the seismograph’s needle and the glowing crater, ensuring no repetition. 9:16 vertical framing.', hist)
  checa(`R19: ", ensuring no repetition" (instrução de variedade copiada) sai da descrição: "${k3.text}"`, k3.text === 'A close-up montage of distinct volcanic events, including the seismograph’s needle and the glowing crater. 9:16 vertical framing.')
  const k4 = scrub('The geologist, Elena Vance, observes the seismograph needle drawing wider lines.', hist)
  checa(`R19: aposto de nome inventado sai com as duas vírgulas ("The geologist observes", não "The geologist, observes"): "${k4.text}"`, k4.text === 'The geologist observes the seismograph needle drawing wider lines.')
  checa('R19: a vírgula fica quando o que segue é pronome/conjunção ("at the observatory, she")', scrub('Later, at the observatory, Elena Vance, she checks the needle.', hist).text === 'Later, at the observatory, she checks the needle.')
  checa('R19: nome com abreviação citado no pedido fica ("Dr. Vance")', scrub('Dr. Vance reads the seismograph at dawn.', 'Dr. Vance works the night shift at the observatory.').text === 'Dr. Vance reads the seismograph at dawn.')
  checa('R19: frase que termina em palavra curta capitalizada não engole a seguinte ("…in Rio. Suddenly…")', scrub('The boy runs in Rio. Suddenly the lights go out.', 'A boy in Rio runs home.').text === 'The boy runs in Rio. Suddenly the lights go out.')
  checa('R19: a base 4793d2f0 (antes do R19) ainda casava "St. Helens" e a okina pela metade (o conserto é do 093eecae)', (() => { const m = (() => { try { return execFileSync('git', ['show', '4793d2f0:lib/cinematic/visualPromptPolicy.ts'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n') } catch { return null } })(); if (!m) return false; const i2 = m.indexOf('const SETTING_ALLOW'); const j2 = m.indexOf('\n}\n', m.indexOf('export function scrubInventedSetting')); const s0 = roda(m.slice(i2, j2 + 3)).scrubInventedSetting; return /St\. Helens/.test(s0('maps of the Mount St. Helens eruption', hist).text) || /ʻumaʻu/.test(s0('within the Halemaʻumaʻu crater', hist).text) })())
}

console.log('== (m) hora por palavra e personagem genérico (fila fácil, 16/09) ==')
{
  const fd = rd('lib/hollywood/fidelidade.ts')
  const a = fd.indexOf('const MESES = '); const b = fd.indexOf('\n}\n', fd.indexOf('export function removerDatasInventadas')) + 3
  const F = roda(fd.slice(a, b))
  const h1 = F.removerDatasInventadas('At precisely midnight, the night train stops at a deserted station.', 'A night train stops at an abandoned station. A woman traveling alone.')
  checa(`hora por palavra fora do pedido sai inteira: "${h1.texto}"`, h1.texto === 'The night train stops at a deserted station.' && h1.removidas.length === 1)
  const h2 = F.removerDatasInventadas('At midnight, a lone lighthouse keeper notices the beam.', 'At midnight, a lone lighthouse keeper notices that his lighthouse is flashing.')
  checa('hora por palavra citada no pedido FICA', h2.texto === 'At midnight, a lone lighthouse keeper notices the beam.' && h2.removidas.length === 0)
  const h3 = F.removerDatasInventadas('She reaches the spot at dawn, cold and silent.', 'A cartographer crosses a salt desert at noon.')
  checa(`"at dawn" sai no meio da frase sem quebrar: "${h3.texto}"`, h3.texto === 'She reaches the spot, cold and silent.')
  const vm = rd('lib/cinematic/visualMode.ts')
  const i2 = vm.indexOf('export const PERSONAGEM_GENERICO_RE'); const j2 = vm.indexOf('\n', i2)
  const RE = roda(vm.slice(i2, j2 + 1)).PERSONAGEM_GENERICO_RE
  checa('personagem genérico: "a young cartographer", "an old watchmaker", "a lone lighthouse keeper" casam; "a young tree" não', RE.test('A young cartographer with a long black braid crosses a salt desert') && RE.test('An old watchmaker closes his shop') && RE.test('a lone lighthouse keeper notices') && !RE.test('a young tree grows'))
  checa('decidirFormato usa o padrão genérico nos dois ramos (com e sem negação de apresentador)', (vm.match(/\?\? PERSONAGEM_GENERICO_RE\.exec\(roteiro\)\?\.\[0\]/g) || []).length === 2)
}

console.log('== (l) continuação/reescrita em pedido de ficção: sem lugar real, sem número, sem salto de enredo ==')
{
  const rw = rd('lib/runway.ts')
  checa('pedidoDeFiccao existe e é executável: "fictional adventure short" e "Story:" são ficção; "historical documentary about the 1958 Lituya Bay" não', (() => { const i = rw.indexOf('export function pedidoDeFiccao'); const j = rw.indexOf('\n', i); const f = roda(rw.slice(i, j + 1)).pedidoDeFiccao; return f('Create a 60-second fictional adventure short in English.') && f('Story: a boy finds a key') && !f('Create a 60-second historical documentary short in English about the 1958 Lituya Bay megatsunami') })())
  checa('pedirContinuacao e pedirReescrita trocam o pedido de "fato, número, lugar" pela regra de ficção quando o pedido é ficção', rw.includes("const REGRA_FICCAO = 'This is FICTION: add a concrete detail of the SAME moment") && rw.includes("${ficcao ? REGRA_FICCAO : 'adding specific, true detail (facts, numbers, places, consequences) that follows naturally after the given line.'}") && rw.includes("${ficcao ? REGRA_FICCAO : 'adds specific, true detail'}") && (rw.match(/const ficcao = pedidoDeFiccao\(topic\)/g) || []).length === 2)
}

console.log(`${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
