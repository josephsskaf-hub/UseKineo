// VARREDURA-LIMITES-2026-09-23 — guardião do 1º lote da varredura de "limites desalinhados" (fundador: "vai na
// varredura" — prevenir antes de o cliente cair). Cada trava aqui é um lugar onde uma etapa aceitava o que a seguinte
// recusava ou trocava em silêncio:
//  (1) "Use my script as is" em prosa no Kineo 1 era reescrito: o navegador nunca mandava script_mode (caso Emily 22/09
//      só valia no robô de resgate);
//  (2) a rota do Kineo 1 desce/sobe a duração para caber no roteiro e o cliente cobrava a do seletor (4 pessoas pagaram
//      60/90 s por filmes de 35 s, reembolsadas em 23/09);
//  (3) o resgate de aba fechada recebia o texto da tela, não o enviado (acima de 5.000, descartado em silêncio);
//  (4) motores de IA: Studio aceita 20.000 no modo ideia, a rota recusa acima de 12.000 → condensa antes do envio;
//  (5) modo clipe: Studio mostrava 20.000 e 4:5; a rota do clipe aceita 6.000 e só 9:16/16:9/1:1.
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
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}
const G = rd('app/(dashboard)/generate/GenerateClient.tsx')
const S = rd('app/(dashboard)/studio/StudioClient.tsx')
const FAST = rd('app/api/generate-video-fast/route.ts')
const CIN = rd('app/api/generate-video-cinematic/route.ts')
const CLIP = rd('app/api/generate-clip/route.ts')
const LIM_SRC = rd('lib/analyzeLimits.ts')
const DIR_SRC = rd('lib/diretor/suggest.ts')

// (1) script_mode chega ao Kineo 1 — e a rota ainda decide por ele
const iFastFetch = G.indexOf("fetch('/api/generate-video-fast'")
const fastBody = G.slice(iFastFetch, G.indexOf('signal:', iFastFetch))
checa('(1) o envio ao Kineo 1 leva script_mode', /script_mode: scriptMode/.test(fastBody))
checa('(1) a rota do Kineo 1 ainda lê body.script_mode para narrar prosa como está', FAST.includes("const ownScript = verbatim || body.script_mode === 'verbatim'"))

// (2) a duração decidida pela rota é a do filme e a da cobrança
checa('(2) a rota do Kineo 1 devolve a duração efetiva', /return NextResponse\.json\(\{\n\s+mode: 'fast',\n\s+generationId,\n\s+prompt,\n\s+duration,/.test(FAST))
checa('(2) o cliente adota a duração da rota', G.includes("const fastDuration: Duration = ([35, 45, 60, 90] as readonly number[]).includes(Number(data?.duration))") && G.includes('setDuration(fastDuration)'))
const iAdota = G.indexOf('const fastDuration: Duration')
const trechoCheckpoint = G.slice(iAdota, G.indexOf('localStorage.setItem(activeRenderStorageKey', iAdota))
checa('(2) payload de montagem, desbloqueio e checkpoint usam a duração efetiva', (trechoCheckpoint.match(/duration: fastDuration/g) || []).length === 3 && !/\n\s+duration,\n/.test(trechoCheckpoint))

// (3) resgate de aba fechada recebe o texto enviado
const iJob = G.indexOf("engine: 'fast',\n            prompt: ")
checa('(3) render_job leva o texto ENVIADO (trimmed), não o da tela', iJob > 0 && G.slice(iJob, iJob + 120).includes('prompt: trimmed,'))

// (4) motores de IA também condensam antes do envio; o teto espelha a rota protegida
const deps = {
  '@/lib/speechRate': { SPEECH_RATE_BASE: { classic: 3.1, hollywood: 2.3 }, speechFamilyForQuality: () => 'classic', speechSecondsOfScript: () => ({ seconds: 0 }) },
  '@/lib/narrationFit': { MIN_COVERAGE: 0.95 },
  '@/lib/aspect': { ASPECTS: ['9:16', '16:9', '1:1', '4:5'] },
  '@/lib/analyzeLimits': roda(LIM_SRC),
}
const D = roda(DIR_SRC, deps)
const tetoRota = Number(CIN.match(/if \(prompt\.length > (\d+)\) \{\n\s+return NextResponse\.json\(\{ error: 'Prompt is too long\.' \}/)?.[1])
checa(`(4) teto cinematográfico do Diretor (${D.CINEMATIC_DISPATCH_MAX_CHARS}) = literal da rota protegida (${tetoRota})`, tetoRota > 0 && D.CINEMATIC_DISPATCH_MAX_CHARS === tetoRota)
checa('(4) todos os motores de IA do Studio têm teto conhecido', ['seedance', 'kling', 'veo', 'hollywood', 'h3', 'omni', 's25'].every((e) => D.diretorCharLimit(e) === tetoRota) && D.diretorCharLimit('fast') === 5000)
checa('(4) a condensação no /generate cobre Kineo 1 E motores de IA', G.includes("const motorDoEnvio = mode === 'fast' || mode === 'creator' ? 'fast' : mode === 'cinematic_ai' ? aiEngine : null") && G.includes('if (motorDoEnvio && scriptMode === \'ai\' && trimmed.length > tetoEnvio) {') && G.includes("engine: motorDoEnvio, duration:"))
checa('(4) alvo do condensado cabe na resposta do modelo (≤ 4.500)', D.diretorCondenseTarget(12000) === 4500 && D.diretorCondenseTarget(5000) === 4500)

// (5) modo clipe: teto e formatos da rota do clipe, pela fonte única
const L = roda(LIM_SRC)
checa('(5) teto do clipe = 6.000 e os outros modos intactos', L.analyzePromptMaxChars('clip') === 6000 && L.analyzePromptMaxChars('verbatim') === 5000 && L.analyzePromptMaxChars('ai') === 20000)
checa('(5) a rota do clipe lê o teto da fonte única e diz o número', CLIP.includes("import { CLIP_PROMPT_MAX_CHARS } from '@/lib/analyzeLimits'") && CLIP.includes('if (prompt.length > CLIP_PROMPT_MAX_CHARS)') && !/prompt\.length > 6000/.test(CLIP))
const formatosRota = (CLIP.match(/type Aspect = ([^\n]+)/)?.[1] ?? '').match(/'[^']+'/g)?.map((x) => x.slice(1, -1)) ?? []
checa(`(5) CLIP_ASPECTS = formatos que a rota do clipe renderiza (${formatosRota.join(', ')})`, formatosRota.length === 3 && formatosRota.every((f) => L.CLIP_ASPECTS.includes(f)) && L.CLIP_ASPECTS.length === 3)
const iClip = S.indexOf("if (scriptMode === 'clip') {")
checa('(5) o Studio confere o teto ANTES de gastar no clipe', iClip > 0 && S.slice(iClip, iClip + 80).includes('if (limit.over) return; void generateClip()'))
checa('(5) 4:5 some no modo clipe e o formato volta ao 9:16 visível', S.includes("ASPECT_PILLS.filter((a) => scriptMode !== 'clip' || (CLIP_ASPECTS as readonly string[]).includes(a.value))") && S.includes("if (scriptMode === 'clip' && !(CLIP_ASPECTS as readonly string[]).includes(aspect)) setAspect('9:16')"))

// (V1) roteiro NOSSO (modo 'ai') curto para a duração não é recusado: vira tema do escritor que enche a duração.
// Autorização nominal do fundador ("V1", 23/09) — trava 8.2 em app/api/generate-video-fast.
const blocoV1 = FAST.match(/    const falaMarcada = [^\n]+\n    const roteiroIaCurto = [^\n]+\n    const verbatim = [^\n]+\n/)?.[0] ?? ''
checa('(V1) regra do roteiro nosso presente na rota do Kineo 1', blocoV1.length > 0)
function decideV1(src, { segs, scriptMode, fits }) {
  const f = new Function('parsedScript', 'marcadoresValidos', 'body', 'narrationFitAt', 'duration', 'fastRate', `${src}\nreturn verbatim`)
  const parsed = { segments: segs.map((v) => ({ voiceover: v })) }
  return f(parsed, segs.length > 0, { script_mode: scriptMode }, () => ({ ok: fits }), 35, { wordsPerSecond: 2.6 })
}
function provaV1(src) {
  return [
    ['(V1) IA + curto → escritor enche a duração (não lê palavra por palavra)', decideV1(src, { segs: ['a b c'], scriptMode: 'ai', fits: false }) === false],
    ['(V1) IA + cabe → segue palavra por palavra', decideV1(src, { segs: ['a b c'], scriptMode: 'ai', fits: true }) === true],
    ['(V1) literal + curto → intocado (o portão continua podendo recusar)', decideV1(src, { segs: ['a b c'], scriptMode: 'verbatim', fits: false }) === true],
    ['(V1) cliente sem script_mode (antigo) + curto → comportamento de antes', decideV1(src, { segs: ['a b c'], scriptMode: undefined, fits: false }) === true],
    ['(V1) sem marcadores → não é roteiro marcado', decideV1(src, { segs: [], scriptMode: 'ai', fits: false }) === false],
  ]
}
for (const [n, c] of provaV1(blocoV1)) checa(n, c)
checa('(V1) o portão do literal continua olhando o texto do autor', FAST.includes("const ownScript = verbatim || body.script_mode === 'verbatim'"))
checa('(V1) cada reescrita é medida (sem texto)', FAST.includes("name: 'ai_script_rewritten_to_fit'") && /metadata: \{ engine: 'fast', requested_seconds: duration, speech_seconds: [^}]*version: 'v1_roteiro_nosso_cabe_20260923' \}/.test(FAST))
for (const [nome, de, para] of [
  ['V1 reescreve também o literal', "body.script_mode === 'ai' && !narrationFitAt", "body.script_mode !== 'x' && !narrationFitAt"],
  ['V1 reescreve até o que cabe', "&& !narrationFitAt(falaMarcada, duration, fastRate).ok", "&& true"],
  ['V1 desligado', "const verbatim = marcadoresValidos && !roteiroIaCurto", "const verbatim = marcadoresValidos"],
]) {
  const m = blocoV1.replace(de, para)
  checa(`mutante "${nome}" aplicou`, m !== blocoV1 && m.includes(para))
  checa(`mutante "${nome}" é pego`, provaV1(m).some(([, c]) => !c))
}

// (V2) filme cinematográfico encurtado depois do preço: a diferença volta na hora, sem mexer no claim/débito.
// Autorização nominal do fundador ("vai v2 e v3", 23/09) — trava 8.2.
const COST = roda(rd('lib/credits/engineCost.ts'))
checa('(V2) caso real axel.dickburt: Veo 60→35 s devolve 41 (100 − 59)', COST.creditCostForDuration('cinematic_veo', true, 60) - COST.creditCostForDuration('cinematic_veo', true, 35) === 41)
checa('(V2) o preço assinado continua sendo o da duração pedida (claim intacto)', CIN.includes('    const cost = creditCostForDuration(costQuality, true, duration)\n    const duracaoCobrada = duration') && CIN.includes('const upfrontDebit = await ensureCinematicDebit(cost)') && !/\n\s+cost = /.test(CIN))
const iV2 = CIN.indexOf('V2-PRECO-DA-DURACAO-ENTREGUE-2026-09-23 — autorização nominal')
checa('(V2) o ajuste roda DEPOIS do débito e DEPOIS de a duração poder mudar', iV2 > CIN.indexOf('const upfrontDebit = await ensureCinematicDebit(cost)') && iV2 > CIN.indexOf('const seguir = decideDurationFollowsScript({'))
const blocoV2 = CIN.slice(iV2, CIN.indexOf('// #442 — in verbatim mode', iV2))
checa('(V2) só quando encurtou, e pela tabela de preço real', blocoV2.includes('if (duration < duracaoCobrada) {') && blocoV2.includes('const precoEntregue = creditCostForDuration(costQuality, true, duration)') && blocoV2.includes('const diferenca = cost - precoEntregue'))
checa('(V2) crédito pelo RPC atômico, uma vez por geração (referência de cobrança)', blocoV2.includes("rpc('add_video_credits', { p_user: user.id, p_amount: diferenca })") && blocoV2.includes(".eq('metadata->>billing_reference', billingReference)") && blocoV2.indexOf('jaAjustado.length === 0') < blocoV2.indexOf("rpc('add_video_credits'"))
checa('(V2) falha do ajuste não derruba o render e fica registrada', blocoV2.includes("name: 'cinematic_duration_price_adjust_failed'") && /catch \(e\) \{/.test(blocoV2))

// (V3) os escritores de cena leem o briefing inteiro (até a fonte única), não os 1.200/600/1.500 primeiros caracteres.
const ROUTER = rd('lib/hollywood/router.ts')
const L2 = roda(rd('lib/analyzeLimits.ts'))
checa('(V3) fonte única cobre o teto do Kineo 1 e o condensado do Diretor', L2.SCENE_WRITER_INPUT_MAX_CHARS >= L2.ANALYZE_PROMPT_MAX_CHARS && L2.SCENE_WRITER_INPUT_MAX_CHARS >= D.DIRETOR_CONDENSE_MAX_CHARS)
checa('(V3) nenhum escritor de cena corta em 1.200', !/generateScenes\(prompt\.slice\(0, 1200\)/.test(FAST) && !/generateScenes\(prompt\.slice\(0, 1200\)/.test(CIN))
checa('(V3) Kineo 1 e motores de IA usam a fonte única (3 chamadas)', (FAST.match(/generateScenes\(prompt\.slice\(0, SCENE_WRITER_INPUT_MAX_CHARS\)/g) || []).length === 1 && (CIN.match(/generateScenes\(prompt\.slice\(0, SCENE_WRITER_INPUT_MAX_CHARS\)/g) || []).length === 2)
checa('(V3) planejador Hollywood lê ideia e narração pela fonte única', ROUTER.includes("Idea/topic: ${String(idea ?? '').slice(0, SCENE_WRITER_INPUT_MAX_CHARS)}") && ROUTER.includes('${String(voiceoverScript).slice(0, SCENE_WRITER_INPUT_MAX_CHARS)}') && !/slice\(0, 600\)\}/.test(ROUTER))

// (LOTE 2) export limpo PAGO e resgates devolvem o MESMO filme: formato, língua e fonte da legenda.
const UNLOCK = rd('app/api/compose/unlock/route.ts')
checa('(L2) export limpo: língua pelo catálogo das 16 (não mais só en/pt/es)', UNLOCK.includes("const language = narrationLanguage(body.language) ?? 'en'") && !/body\.language === 'pt' \? 'pt'/.test(UNLOCK))
checa('(L2) export limpo: formato do filme original chega ao builder', UNLOCK.includes('const aspect = normalizeAspect(body.aspect)') && /buildCreatomateSource\(\{[\s\S]{0,260}aspect, \/\/ LOTE2/.test(UNLOCK))
checa('(L2) export limpo: fonte da legenda da língua ANTES de montar', UNLOCK.indexOf('setActiveCaptionFont(language)') > 0 && UNLOCK.indexOf('setActiveCaptionFont(language)') < UNLOCK.indexOf('source = buildCreatomateSource({'))
checa('(L2) ingrediente do export guarda o formato e o 45 s', G.includes('  aspect?: string\n}') && G.includes('requestedDuration === 45 || requestedDuration === 60 || requestedDuration === 90') && G.includes("normalizeAspect(input.aspect) === input.aspect ? { aspect: input.aspect } : {}), // LOTE2-EXPORT-LIMPO-FIEL"))
checa('(L2) as 2 cópias do ingrediente (montagem normal e checkpoint do Kineo 1) levam o formato', (G.match(/\.\.\.\(aspectRequested !== '9:16' \? \{ aspect: aspectRequested \} : \{\}\), \/\/ LOTE2-EXPORT-LIMPO-FIEL/g) || []).length === 2)
checa('(L2) checkpoint de resgate do Kineo 1 leva o formato', G.includes("...(aspectRequested !== '9:16' ? { aspect: aspectRequested } : {}), // LOTE2-RESGATE-FIEL-2026-09-23"))
const REC = rd('app/api/render-recovery/route.ts')
checa('(L2) filtro do resgate não descarta mais o formato', REC.includes("if (aspect && aspect !== '9:16' && normalizeAspect(aspect) === aspect) out.aspect = aspect") && REC.includes("import { normalizeAspect } from '@/lib/aspect'"))
const STR = rd('app/api/cron/finish-stranded-renders/route.ts')
checa('(L2) resgate de filme de IA manda formato (claim) e língua', STR.includes("...(normalizeAspect(response.aspect) !== '9:16' ? { aspect: normalizeAspect(response.aspect) } : {}),") && STR.includes("resolveNarrationLanguage('en', typeof response.voiceover_script === 'string' ? response.voiceover_script : '').language"))
const RETRY = rd('app/api/retry-hollywood-scene/route.ts')
checa('(L2) cena refeita no formato do filme: nenhum 9:16 cravado', !RETRY.includes("aspect_ratio: '9:16'") && (RETRY.match(/aspect_ratio: scene\.aspect/g) || []).length === 4 && RETRY.includes('aspect: normalizeAspect(response?.aspect) }'))
checa('(L2) enquadramento do texto acompanha o formato', RETRY.includes('`${ENQUADRAMENTO[scene.aspect]} composition, camera upright') && !RETRY.includes('`Vertical 9:16 composition'))

// (RESGATE-SEM-DUPLICATA-2026-09-24) um pedido, um filme: pedidos repetidos pela rede não viram N filmes cobrados.
const iDup = STR.indexOf('const recoveryKeysSeen = new Set<string>()')
checa('(dup) resgate deduplica por pessoa + tema, mantendo o mais novo', iDup > 0 && STR.includes("const chaveResgate = `${userId}|${temaResgate}`") && STR.includes("if (recoveryKeysSeen.has(chaveResgate)) { results.push({ generation: gen8, outcome: 'recovery_superseded_duplicate' }); continue }"))
checa('(dup) a lista do resgate vem do mais novo para o mais velho', /\.eq\('name', RECOVERABLE_EVENT\)[\s\S]{0,200}\.order\('created_at', \{ ascending: false \}\)/.test(STR))
checa('(dup) a deduplicação roda ANTES de gravar tentativa ou compor', iDup > 0 && STR.indexOf("if (recoveryKeysSeen.has(chaveResgate))") < STR.indexOf('name: RECOVERY_ATTEMPT_EVENT, session_id: genId'))

// Mutantes (cada um precisa aplicar e cair)
function mutante(nome, src, de, para, prova) {
  if (src.split(de).length !== 2) { checa(`mutante "${nome}" aplicou`, false); return }
  const m = src.replace(de, para)
  checa(`mutante "${nome}" aplicou`, m.includes(para))
  let cai = false
  try { cai = !prova(m) } catch { cai = true }
  checa(`mutante "${nome}" é pego`, cai)
}
mutante('clipe volta a 20.000', LIM_SRC, "  if (scriptMode === 'clip') return CLIP_PROMPT_MAX_CHARS\n", '', (m) => roda(m).analyzePromptMaxChars('clip') === 6000)
mutante('Diretor esquece motores de IA', DIR_SRC, '  if ((DIRETOR_CINEMATIC_ENGINES as readonly string[]).includes(engine)) return CINEMATIC_DISPATCH_MAX_CHARS\n', '', (m) => roda(m, deps).diretorCharLimit('seedance') === tetoRota)
mutante('teto da rota muda sem o Diretor saber', CIN, 'if (prompt.length > 12000) {', 'if (prompt.length > 9000) {', (m) => Number(m.match(/if \(prompt\.length > (\d+)\) \{\n\s+return NextResponse\.json\(\{ error: 'Prompt is too long\.' \}/)?.[1]) === D.CINEMATIC_DISPATCH_MAX_CHARS)

console.log(`test-varredura-limites-2026-09-23: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
