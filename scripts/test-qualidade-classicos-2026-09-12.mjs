// KINEO-QUALIDADE-CLASSICOS-2026-09-12 — guardião da leva "5 ações de qualidade"
// (fundador, 12/09 00:00): o pente fino de $0 reprovou os 4 clássicos com o
// roteiro que os 3 caros aprovam. Esta leva: (3) "as is" literal no compose,
// (4) voz na língua do texto, (5) cron enxerga cena morta, + escritor entrega a
// faixa de palavras (Seedance 74/186, Kineo 1 105/186) e "Tomás" não vira "ás".
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
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp }
const rodaAsync = roda

console.log('== (4) idioma do texto — lib executada ==')
const T = roda(rd('lib/textLanguage.ts'))
const ES = 'se trata de un hombre que busca ser feliz pero se da cuenta que la felicidad en pro de los demás no es lo que él esperaba y entonces decide cambiar su vida para siempre'
const PT = 'Eram exatamente 3h17 da madrugada quando o telefone de Lucas começou a tocar. Número desconhecido. Ele não atendeu, mas o telefone tocou de novo e de novo até que ele levantou'
const EN = 'My name is Tomás, and I was the last lighthouse keeper on the island. Every night for thirty years I climbed the steps and lit the lamp by hand, because one boat still came home this way.'
checa('história em espanhol (caso 59e1c0ce) → es', T.detectNarrationLanguage(ES).language === 'es')
checa('conto em português (caso c636e7a0) → pt', T.detectNarrationLanguage(PT).language === 'pt')
checa('roteiro em inglês → en', T.detectNarrationLanguage(EN).language === 'en')
checa('texto curto não decide', T.detectNarrationLanguage('un hombre feliz').language === null)
checa('padrão "en" cede ao texto em espanhol (switched)', (() => { const r = T.resolveNarrationLanguage('en', ES); return r.language === 'es' && r.switched === true })())
checa('ausente também cede', T.resolveNarrationLanguage(undefined, PT).language === 'pt')
checa('escolha explícita pt vence texto em inglês', (() => { const r = T.resolveNarrationLanguage('pt', EN); return r.language === 'pt' && r.switched === false })())
checa('inglês fica inglês sem troca', (() => { const r = T.resolveNarrationLanguage('en', EN); return r.language === 'en' && r.switched === false })())

console.log('== (4) rotas ==')
const fast = rd('app/api/generate-video-fast/route.ts')
const cin = rd('app/api/generate-video-cinematic/route.ts')
checa('fast: idioma resolvido depois do verbatim e passado ao escritor', /const narrationLanguage = resolveNarrationLanguage\(body\.language, prompt\)/.test(fast) && /wordsPerScene: wordsPerSceneFor\(duration, clipCount\),\n\s+language: narrationLanguage\.language,/.test(fast) && /language: narrationLanguage\.language,\n/.test(fast))
checa('fast: troca vira evento narration_language_autodetected', /name: 'narration_language_autodetected'/.test(fast))
checa('cinematic: idioma resolvido logo após wantsS25 e hollywoodLanguage usa o resolvido', cin.indexOf("const wantsS25 = body.engine === 's25'") < cin.indexOf('const narrationLanguage = resolveNarrationLanguage(body.language, prompt)') && /const hollywoodLanguage: 'en' \| 'pt' \| 'es' = narrationLanguage\.language/.test(cin))
checa('cinematic: escritor clássico recebe faixa de palavras + idioma nas DUAS chamadas', (cin.match(/generateScenes\(prompt\.slice\(0, 1200\), clipCount, hollywoodPath \? undefined : classicVisualPolicy, hollywoodPath \? undefined : classicWriterOptions\)/g) || []).length === 2 && /const classicWriterOptions = \{ wordsPerScene: wordsPerSceneFor\(duration, clipCount\), language: narrationLanguage\.language \}/.test(cin))

console.log('== escritor de cenas: idioma no campo 8 e segunda passada ==')
const rw = rd('lib/runway.ts')
checa('campo 8 leva ${languageRule} no fim (a trava do vigia e o golden hash do Codex ficam intactos)', /one narration line \(\$\{voiceoverRule\}\)\. MUST include/.test(rw) && /\.\$\{languageRule\}\n9\. "caption"/.test(rw) && /const languageRule = writerOptions\?\.language && writerOptions\.language !== 'en' \? ` Write this narration line in \$\{LANGUAGE_NAMES\[writerOptions\.language\]\}\.` : ''/.test(rw))
checa('expansão só roda com wordsPerScene e é fail-open', /if \(wps\) \{\n\s+try \{\n\s+return await expandShortVoiceovers\(scenes, wpsLo, Math\.max\(wpsLo, Math\.ceil\(wps\[1\]\)\), writerOptions\?\.language\)/.test(rw))
{
  const iF = rw.indexOf('export async function expandShortVoiceovers(')
  const iEnd = rw.indexOf('\n}\n', iF) + 3
  const cena = (n) => ({ description: 'd', searchKeywords: 'k', stockSearchQuery: 'q', negativeVisualPrompt: '', scenePurpose: 'HOOK', visualIntent: 'v', visualCategory: 'c', voiceover: Array(n).fill('word').join(' '), caption: 'cap' })
  let calls = 0
  const openai = { chat: { completions: { create: async (req) => { calls++; const input = JSON.parse(req.messages[1].content); return { choices: [{ message: { content: JSON.stringify(input.map(() => Array(30).fill('long').join(' '))) } }] } } } } }
  const src = "const LANGUAGE_NAMES = { en: 'English', pt: 'Brazilian Portuguese (pt-BR)', es: 'Spanish (es-419, Latin American)' }\nconst shortCaptionFromVoiceover = (t) => t.split(' ').slice(0, 8).join(' ')\n" + rw.slice(iF, iEnd)
  const E = rodaAsync(src, { openai })
  const run = async () => {
    const curto = await E.expandShortVoiceovers([cena(15), cena(17), cena(31)], 27, 35, 'en')
    checa('cenas curtas (15/17) são reescritas, a de 31 fica', curto[0].voiceover.split(' ').length === 30 && curto[1].voiceover.split(' ').length === 30 && curto[2].voiceover.split(' ').length === 31 && calls === 1)
    const bom = await E.expandShortVoiceovers([cena(30), cena(31), cena(29)], 27, 35, 'en')
    checa('soma dentro de 85% do piso → nenhuma chamada, cenas intactas', bom[2].voiceover.split(' ').length === 29 && calls === 1)
  }
  await run()
}

console.log('== (3) "as is" literal no compose ==')
const comp = rd('app/api/compose/route.ts')
checa('claimVerbatim lido da resposta assinada do claim, antes do escalador', /const claimVerbatim = cinematicBirthClaim\?\.response\?\.verbatim === true\n\s+let scaledScript: string/.test(comp))
checa('escalador pulado com speed OU claim verbatim', /\} else if \(explicitSpeed != null \|\| claimVerbatim\) \{\n\s+scaledScript = voiceoverScript/.test(comp))
checa('correção de ritmo também respeita o verbatim', /explicitSpeed == null &&\n\s+!claimVerbatim &&/.test(comp))
checa('fast: verbatim viaja com speed padrão 1 (o cliente só encaminha speed numérico)', /speed: verbatim \? \(parsedScript\.speed \?\? 1\) : parsedScript\.speed,/.test(fast))

console.log('== (5) cron enxerga cena morta — função executada com fal falso ==')
const cron = rd('app/api/cron/finish-stranded-renders/route.ts')
{
  const iF = cron.indexOf('async function collectFinishedClips(')
  const iEnd = cron.indexOf('\n}\n', iF) + 3
  const mk = (statuses, results) => ({ config: () => {}, queue: { status: async (m, { requestId }) => ({ status: statuses[requestId] }), result: async (m, { requestId }) => { const r = results[requestId]; if (r instanceof Error) throw r; return r } } })
  const err403 = Object.assign(new Error('forbidden'), { status: 403 })
  const src = "const STALE_SCENE_MINUTES = 120\n" + 'export ' + cron.slice(iF, iEnd)
  const ids = ['a', 'b', 'c', 'd', 'e', 'f']
  const models = ids.map(() => 'm')
  const run = async () => {
    // o caso do walid: 4 COMPLETED com URL, 2 COMPLETED cujo result() dá 403
    const fal = mk(Object.fromEntries(ids.map((i) => [i, 'COMPLETED'])), { a: { data: { video: { url: 'u1' } } }, b: { data: { video: { url: 'u2' } } }, c: { data: { video: { url: 'u3' } } }, d: { data: { video: { url: 'u4' } } }, e: err403, f: err403 })
    const C = rodaAsync(src, { fal, process: { env: { FAL_KEY: 'x' } } })
    const r = await C.collectFinishedClips(ids, models, 51)
    checa('4 prontas + 2 COMPLETED-com-erro → ready 4/6 com dead=2 (antes: pending para sempre)', r.state === 'ready' && r.clips.length === 4 && r.dead === 2)
    // cena ainda na fila com claim de 2 h → morta; 4/6 monta
    const fal2 = mk({ a: 'COMPLETED', b: 'COMPLETED', c: 'COMPLETED', d: 'COMPLETED', e: 'IN_QUEUE', f: 'IN_PROGRESS' }, { a: { data: { video: { url: 'u1' } } }, b: { data: { video: { url: 'u2' } } }, c: { data: { video: { url: 'u3' } } }, d: { data: { video: { url: 'u4' } } } })
    const C2 = rodaAsync(src, { fal: fal2, process: { env: { FAL_KEY: 'x' } } })
    const r2 = await C2.collectFinishedClips(ids, models, 130)
    checa('claim de 130 min: cena IN_QUEUE conta como morta → ready 4/6', r2.state === 'ready' && r2.clips.length === 4 && r2.dead === 2)
    const r3 = await C2.collectFinishedClips(ids, models, 20)
    checa('claim de 20 min: cena IN_QUEUE ainda é pending (não compor antes da hora)', r3.state === 'pending' && r3.done === 4)
    // 2 prontas + 4 mortas → too_few (piso 60% intacto)
    const fal3 = mk(Object.fromEntries(ids.map((i) => [i, 'COMPLETED'])), { a: { data: { video: { url: 'u1' } } }, b: { data: { video: { url: 'u2' } } }, c: err403, d: err403, e: err403, f: err403 })
    const C3 = rodaAsync(src, { fal: fal3, process: { env: { FAL_KEY: 'x' } } })
    const r4 = await C3.collectFinishedClips(ids, models, 51)
    checa('2/6 → too_few (piso de 60% continua protegendo o filme)', r4.state === 'too_few' && r4.dead === 4)
  }
  await run()
}
checa('chamador passa a idade do claim e pending velho vira rastro', /collectFinishedClips\(requestIds, models, claimAgeMin\)/.test(cron) && /outcome: `pending_stale:\$\{collected\.done\}\/\$\{collected\.total\}`/.test(cron) && /SILENT_TERMINAL = \/\^\([^/\n]*\|pending_stale\)\//.test(cron) && /const PENDING_STALE_MINUTES = 45/.test(cron))

console.log('== "Tomás" não vira "ás" (filtro de cenário com Unicode) ==')
const vpp = rd('lib/cinematic/visualPromptPolicy.ts')
{
  const iS = vpp.indexOf('const SETTING_ALLOW')
  const iE = vpp.indexOf('export function buildClassicVisualPrompt')
  const S = roda(vpp.slice(iS, iE))
  const ctx = 'My name is Tomás, and I was the last lighthouse keeper on Ilha das Cabras. Every night I climbed.'
  const r = S.scrubInventedSetting('A low-angle shot capturing Tomás climbing the stairs of the Amityville House in 1910, José waits', ctx)
  checa('Tomás sobrevive; Amityville House, 1910 e José (fora da história) saem', /Tomás/.test(r.text) && !/Amityville|1910|José/.test(r.text) && r.removed.includes('Amityville'))
  const r2 = S.scrubInventedSetting('Vintage security camera at the entrance of the Amityville House. Nokia 3310 on the table', ctx)
  checa('o caso do vigia (Amityville, Nokia 3310, Vintage) continua filtrado', !/Amityville|Nokia|3310|Vintage/.test(r2.text))
  checa('nome acentuado citado na história fica (José na história)', /José/.test(S.scrubInventedSetting('José lights the lamp', 'A história de José, o faroleiro.').text))
}

console.log('== ficha "in his late 60s" é idoso ==')
const cv = rd('lib/hollywood/characterVoice.ts')
{
  const m = cv.match(/const ELDERLY_RE = (\/.*\/i)\n/)
  const re = m ? new Function('return ' + m[1])() : null
  checa('ELDERLY_RE casa "a weathered man in his late 60s" (Omni lia como adult)', !!re && re.test('a weathered man in his late 60s, with salt-and-pepper hair') && re.test('a woman in her mid-70s') && !re.test('a man in his 30s'))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
