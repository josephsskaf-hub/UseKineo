// STUDIO-CONTADOR-VOZ (28/09/2026) — o contador da tela diz o tamanho REAL do filme com a voz escolhida
// e que o filme segue o roteiro. Fundador: "a pessoa que escolhe Kling 2.5 não sabe que precisa de N
// palavras; faz 110 e vira confusão de tempo".
// O guardião (1) MEDE a divergência antiga (régua da família na tela × régua da voz no servidor),
// (2) executa a função pura com 110/150/203 palavras a 2,3 e 3,1 pal/s e prova os ramos desce/sobe/curto/
// teto, (3) prova o espelho: nenhuma constante digitada — teto e tolerância vêm de
// lib/durationFollowsScript.ts (readFileSync), pisos vêm das rotas, persona da mesma função do servidor,
// (4) ancora a tela (GenerateClient) no contador novo sem tocar no modo "Let AI structure".
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const semImports = (src) => src.replace(/^import\s[\s\S]*?from\s+'[^']+'\s*;?\s*$/gm, '')
// expandPolicy RE-EXPORTA MIN_COVERAGE do narrationFit (getter que vira undefined sem o import): os globais juntam só valores definidos.
const globais = (...mods) => Object.fromEntries(mods.flatMap((m) => Object.entries(m)).filter(([, v]) => v !== undefined))
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, require: () => ({}), ...globals }); return exp }
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const NF = roda(rd('lib/narrationFit.ts'))
const SPX = roda(rd('lib/scriptParser.ts'))
const EP = roda(semImports(rd('lib/expandPolicy.ts')), { ...NF })
const DFS = roda(rd('lib/durationFollowsScript.ts'))
const SR = roda(semImports(rd('lib/speechRate.ts')), { ...NF, ...SPX })
const PER = roda(rd('lib/narration/personas.ts'))
const NM = roda(semImports(rd('lib/narration/niche-mapping.ts')), { ...PER })
// KINEO-ENTRADA-SEEDANCE15-2026-09-29 (E2b) — o contador passou a ler supportedDurationsFor (lib/durationByEngine.ts,
// módulo puro): o Seedance tem o botão de 15 s. O guardião injeta o módulo real, como faz com os outros.
const DBE = roda(rd('lib/durationByEngine.ts'))
const CV = roda(semImports(rd('lib/contadorVoz.ts')), globais(EP, SPX, DFS, SR, NM, NF, DBE))

const palavras = (n) => Array.from({ length: n }, (_, i) => (i % 7 === 0 ? 'mystery' : 'word')).join(' ')
const reguaDe = (wps) => ({ rate: { family: wps === 2.3 ? 'hollywood' : 'classic', wordsPerSecond: wps, speed: 1, language: 'en', basis: 'estimate' }, persona: null, floorSeconds: 15 })

console.log('== A) MEDIDA: a régua antiga da tela (família) × a régua do servidor (voz da persona) ==')
{
  const script = palavras(203)
  const telaAntiga = SR.speechSecondsOfScript('cinematic_ai', script).seconds // o contador antigo recebia `quality` da tela
  const servidor = (() => { const p = NM.selectPersonaForScript(script, undefined, 'cinematic', 'en'); return SR.speechRateFor({ family: 'classic', speed: SPX.parseSpeed(script), language: 'en', voice: p.voice, personaSpeed: p.defaultSpeed }) })()
  const servidorSeg = SR.speechSecondsAt(script, servidor)
  console.log(`   203 palavras (tema mystery): tela antiga ${Math.round(telaAntiga)} s @3,1 · servidor ${Math.round(servidorSeg)} s @${servidor.wordsPerSecond} (${NM.selectPersonaForScript(script, undefined, 'cinematic', 'en').id})`)
  checa('divergência medida: tela antiga 65 s × servidor 88 s para 203 palavras no tema mystery', Math.round(telaAntiga) === 65 && Math.round(servidorSeg) === 88)
  const tela = CV.reguaDoServidorNaTela({ engine: 'kling', script, language: 'en', vertical: null })
  checa('a tela agora prevê a MESMA persona e a MESMA régua do servidor (clássico cinematic)', tela.persona?.id === 'dark-mystery' && tela.rate.wordsPerSecond === servidor.wordsPerSecond)
  const fastServidor = (() => { const p = NM.selectPersonaForScript(script, undefined, 'free', 'en'); return SR.speechRateFor({ family: 'classic', speed: SPX.parseSpeed(script), language: 'en', voice: p.voice, personaSpeed: p.defaultSpeed }) })()
  const fastTela = CV.reguaDoServidorNaTela({ engine: 'fast', script, language: 'en' })
  checa('Kineo 1: tela prevê a persona do tier free, como generate-video-fast', fastTela.rate.wordsPerSecond === fastServidor.wordsPerSecond && fastTela.floorSeconds === 35)
  const holly = CV.reguaDoServidorNaTela({ engine: 'hollywood', script, language: 'en' })
  checa('hollywood: 2,3 pal/s, sem persona, piso hollywood (a tela antiga recebia cinematic_ai = 3,1)', holly.rate.wordsPerSecond === 2.3 && holly.persona === null && holly.floorSeconds === NF.AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD && SR.speechFamilyForQuality('cinematic_ai') === 'classic')
  checa('velocidade escrita no roteiro entra na régua, como no servidor', CV.reguaDoServidorNaTela({ engine: 'hollywood', script: 'speed: 1.2\n' + script, language: 'en' }).rate.wordsPerSecond === SR.speechRateFor({ family: 'hollywood', speed: 1.2 }).wordsPerSecond)
}

console.log('== B) os ramos, com 110/150/203 palavras a 2,3 e 3,1 pal/s ==')
{
  const v = (n, wps, req) => CV.contadorVoz({ script: palavras(n), regua: reguaDe(wps), requestedSeconds: req })
  const d110_23 = v(110, 2.3, 60)
  checa('110 @2,3, seletor 60: DESCE para 35 (fala ~48 s), faltam ~22 palavras para 60', d110_23?.kind === 'down' && d110_23.to === 35 && Math.round(d110_23.speechSeconds) === 48 && d110_23.missingWords === 22 && d110_23.words === 110)
  checa('110 @3,1, seletor 60: desce para 35 (fala ~35 s)', v(110, 3.1, 60)?.kind === 'down' && v(110, 3.1, 60).to === 35)
  checa('110 @3,1, seletor 35: cabe', v(110, 3.1, 35)?.kind === 'fits')
  const f150_23 = v(150, 2.3, 60)
  checa('150 @2,3, seletor 60: cabe e narra ~65 s (avisa que narra tudo)', f150_23?.kind === 'fits' && f150_23.narratesLonger === true)
  checa('150 @2,3, seletor 35: SOBE para 60', v(150, 2.3, 35)?.kind === 'up' && v(150, 2.3, 35).to === 60)
  checa('150 @3,1, seletor 60: desce para 35 (fala ~48 s)', v(150, 3.1, 60)?.kind === 'down' && v(150, 3.1, 60).to === 35)
  const u203_23 = v(203, 2.3, 60)
  checa('203 @2,3, seletor 60: SOBE para 90 (fala ~88 s)', u203_23?.kind === 'up' && u203_23.to === 90 && Math.round(u203_23.speechSeconds) === 88)
  checa('203 @3,1, seletor 60: cabe (~65 s)', v(203, 3.1, 60)?.kind === 'fits')
  const curto = v(40, 2.3, 35)
  checa('40 @2,3: CURTO — nenhum botão cabe; pede palavras para o menor botão', curto?.kind === 'too_short' && curto.minSeconds === 35 && curto.missingWords === 37)
  const longo = v(260, 2.3, 90)
  checa('260 @2,3: acima do teto × tolerância — recusa honesta com o teto do servidor', longo?.kind === 'too_long' && longo.maxSeconds === DFS.DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS && longo.excessWords >= 20)
  checa('238 @2,3 (103,5 s) ainda cabe no teto com tolerância: sobe para 90', v(238, 2.3, 60)?.kind === 'up' && v(238, 2.3, 60).to === 90)
  checa('menos de 8 palavras: sem linha', v(5, 2.3, 60) === null)
  checa('"Let AI structure" não passa por aqui: a função só existe para roteiro próprio (ownScript sempre true nas decisões)', /ownScript: true/.test(rd('lib/contadorVoz.ts')) && !/ownScript: false/.test(rd('lib/contadorVoz.ts')))
  // as decisões são as MESMAS funções do servidor, não uma cópia
  const espelhoDesce = DFS.decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 60, speechSeconds: 110 / 2.3, largestFitting: EP.largestFittingDuration(110 / 2.3), floorSeconds: 15 })
  checa('o "desce" do contador é o decideDurationFollowsScript do servidor', espelhoDesce?.to === d110_23.to)
  const espelhoSobe = DFS.decideDurationFollowsScriptUp({ ownScript: true, requestedSeconds: 60, speechSeconds: 203 / 2.3, largestFitting: EP.largestFittingDuration(203 / 2.3) })
  checa('o "sobe" do contador é o decideDurationFollowsScriptUp do servidor', espelhoSobe?.kind === 'up' && espelhoSobe.to === u203_23.to)
}

console.log('== C) as frases: resultado, não só "add N words" ==')
{
  const v = (n, wps, req) => CV.contadorVoz({ script: palavras(n), regua: reguaDe(wps), requestedSeconds: req })
  const desce = CV.fraseDoContador(v(110, 2.3, 60), 'Dark Mystery')
  checa('desce: diz o filme que sai, quantas palavras faltam, e que cobra a duração entregue', /Your script makes a ~48-second film with the Dark Mystery voice \(110 words\)\. Want 60s\? Add ~22 words — or keep it: the length switches to 35s and you pay for 35s\./.test(desce.text) && desce.lengthWillChange?.from === 60 && desce.lengthWillChange?.to === 35)
  const sobe = CV.fraseDoContador(v(203, 2.3, 60), null)
  checa('sobe: o seletor vai a 90 s e narra tudo (clássico); no hollywood não promete narrar tudo', sobe.text.startsWith('Your script makes a ~88-second film with this voice (203 words) — longer than 60s. The length switches to 90s and we narrate it all.') && sobe.lengthWillChange?.to === 90 && CV.fraseDoContador(v(203, 2.3, 60), null, 'cinematic_hollywood').text.endsWith('The length switches to 90s.') && !/narrate it all|full script/.test(CV.fraseDoContador(v(203, 2.3, 60), null, 'cinematic_hollywood').text))
  const curto = CV.fraseDoContador(v(40, 2.3, 35), null)
  checa('curto: "Too short for a film" + palavras para o menor botão + "let AI structure"', /^Too short for a film — 40 words ≈ 17s with this voice\. Add ~37 words to reach 35s, or let AI structure it\.$/.test(curto.text) && curto.tone === 'warn')
  const longo = CV.fraseDoContador(v(260, 2.3, 90), null)
  checa('teto: diz o teto do servidor e quantas palavras cortar', /films go up to 90s\. Trim ~\d+ words, or let AI structure it/.test(longo.text))
  const cabe = CV.fraseDoContador(v(150, 3.1, 35), null)
  checa('cabe: "✓ fills your 35s film"', /≈ 48s with this voice ✓ fills your 35s film/.test(cabe.text) && cabe.tone === 'ok')
}

console.log('== D) espelho das constantes: nada digitado no contador ==')
{
  const dfs = rd('lib/durationFollowsScript.ts')
  const cv = rd('lib/contadorVoz.ts')
  const teto = Number(/DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS = (\d+)/.exec(dfs)?.[1])
  const tol = Number(/DURATION_FOLLOWS_SCRIPT_CEILING_TOLERANCE = ([\d.]+)/.exec(dfs)?.[1])
  checa('durationFollowsScript.ts: teto 90 s e tolerância 1,15 (lidos do arquivo)', teto === 90 && tol === 1.15)
  const semComentarios = cv.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  checa('contadorVoz importa as decisões do servidor (durationFollowsScript, expandPolicy, speechRate, niche-mapping)', /import \{ decideDurationFollowsScript, decideDurationFollowsScriptUp \} from '@\/lib\/durationFollowsScript'/.test(cv) && /import \{ SUPPORTED_DURATIONS, largestFittingDuration \} from '@\/lib\/expandPolicy'/.test(cv) && /import \{ selectPersonaForScript \} from '@\/lib\/narration\/niche-mapping'/.test(cv) && /MIN_COVERAGE/.test(cv))
  checa('contadorVoz NÃO digita teto, tolerância, cobertura nem lista de durações', !/\b90\b/.test(semComentarios) && !/1\.15/.test(semComentarios) && !/0\.95/.test(semComentarios) && !/\[35, 60, 90\]/.test(semComentarios))
  const fast = rd('app/api/generate-video-fast/route.ts')
  const cin = rd('app/api/generate-video-cinematic/route.ts')
  checa('piso do Kineo 1 espelha generate-video-fast (floorSeconds: 35)', /floorSeconds: 35 \}/.test(fast) && CV.CONTADOR_FLOOR_FAST_SECONDS === 35)
  checa('piso do clássico cinematic espelha a rota (hollywood ? AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD : 15)', /floorSeconds: hollywoodPath \? AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD : 15,/.test(cin) && CV.CONTADOR_FLOOR_CLASSIC_SECONDS === 15)
  checa('persona: a tela chama selectPersonaForScript com a MESMA entrada das rotas (fast: undefined/free; cinematic: vertical/cinematic)', /selectPersonaForScript\(prompt, undefined, 'free', narrationLanguage\.language\)/.test(fast) && /selectPersonaForScript\(prompt, typeof body\.vertical === 'string' && body\.vertical\.trim\(\) \? body\.vertical\.trim\(\)\.toLowerCase\(\) : undefined, 'cinematic', narrationLanguage\.language\)/.test(cin) && /selectPersonaForScript\(script, undefined, 'free', args\.language\)/.test(cv) && /selectPersonaForScript\(script, vertical, 'cinematic', args\.language\)/.test(cv))
  checa('contadorVoz é lib pura: sem React, sem server-only, sem rede', !/from 'react'/.test(semComentarios) && !/server-only/.test(semComentarios) && !/fetch\(/.test(semComentarios) && !/process\.env/.test(semComentarios))
}

console.log('== E) a tela (GenerateClient) usa o contador novo só em "Use my script as is" ==')
{
  const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('importa o contador', /import \{ reguaDoServidorNaTela, contadorVoz, fraseDoContador, falaNaReguaDaTela, type ContadorMotor \} from '@\/lib\/contadorVoz'/.test(gc))
  const bloco = gc.slice(gc.indexOf('STUDIO-CONTADOR-VOZ-2026-09-28 — em "Use my script as is"'), gc.indexOf('const medidaTela = speechSecondsOfScript(quality, prompt)'))
  checa('o ramo verbatim vem ANTES do contador antigo e é guardado por scriptMode === \'verbatim\'', bloco.length > 0 && /if \(scriptMode === 'verbatim'\) \{/.test(bloco))
  checa('motor do contador = fast (Kineo 1/creator) ou o aiEngine da tela — nunca `quality` (cinematic_ai virava 3,1 no Kling 3)', /const motorContador: ContadorMotor = mode === 'fast' \|\| mode === 'creator' \? 'fast' : aiEngine/.test(bloco) && !/speechSecondsOfScript\(quality/.test(bloco))
  // Reancorado 29/09 (KINEO-PONTAS-15S-IDIOMA-2026-09-29, [TRAVA 8.2 — "vai conserta" do fundador]): a chamada ganhou `seconds: duration` (o 15 s do Seedance mede na voz do portão, no ritmo da língua); o que ela protege não muda.
  checa('régua prevista com roteiro, idioma e vertical da análise (a mesma entrada do servidor)', /reguaDoServidorNaTela\(\{ engine: motorContador, script: prompt, language, vertical: analysis\?\.niche \?\? null, seconds: duration \}\)/.test(bloco))
  checa('veredito e frase vêm das funções puras; o nome da persona e o motor entram na frase', /contadorVoz\(\{ script: prompt, regua: reguaVoz, requestedSeconds: duration \}\)/.test(bloco) && /fraseDoContador\(veredito, reguaVoz\.persona \? reguaVoz\.persona\.name : null, motorContador\)/.test(bloco))
  checa('quando o seletor vai mudar, a linha avisa ANTES do clique', /lengthWillChange\.from\}s → \$\{frase\.lengthWillChange\.to\}s happens automatically when you generate/.test(bloco) && /data-contador-voz=\{veredito\.kind\}/.test(bloco))
  checa('modo "Let AI structure" intocado: o contador antigo continua (speechSecondsOfScript(quality, prompt) + "add ~N words")', gc.includes('const medidaTela = speechSecondsOfScript(quality, prompt)') && /— add ~\$\{faltam\} words to fill \$\{duration\}s/.test(gc))
  // Reancorado 29/09 (KINEO-PONTAS-15S-IDIOMA-2026-09-29, [TRAVA 8.2 — "vai conserta" do fundador]): + `seconds: duration`, como o contador.
  checa('a checagem da análise (sobe o seletor em verbatim) mede na MESMA régua da voz', /const reguaAnalise = reguaDoServidorNaTela\(\{ engine: mode === 'fast' \|\| mode === 'creator' \? 'fast' : aiEngine, script: baseChecagem, language, vertical: analysis\?\.niche \?\? null, seconds: duration \}\)/.test(gc) && /const falaSeg = falaNaReguaDaTela\(baseChecagem, reguaAnalise\)/.test(gc) && !/speechSecondsOfScript\(quality, baseChecagem\)\.seconds/.test(gc))
}

console.log('== F) revisão 28/09: a checagem da análise decide pelo MESMO veredito do contador (sem 1,2×/1,15× digitados) ==')
{
  const v = (n, wps, req) => CV.contadorVoz({ script: palavras(n), regua: reguaDe(wps), requestedSeconds: req })
  // o caso do fundador: 109 palavras no Kling 2.5, persona documentary 2,45 pal/s = 44,5 s, seletor 35.
  // A régua antiga da análise (45 > 42 e 45 ≤ 69) virava o seletor para 60; o servidor descia para 35 e devolvia a diferença.
  const doc109 = v(109, 2.45, 35)
  checa('109 @2,45 com seletor 35: NÃO vira (cabe; 44,5 s não enche 60×0,95) — antes a análise virava para 60', doc109?.kind === 'fits' && doc109.narratesLonger === true)
  checa('203 @2,3 com seletor 60: vira para 90 (88 s enche 90×0,95)', v(203, 2.3, 60)?.kind === 'up' && v(203, 2.3, 60).to === 90)
  checa('180 @2,3 com seletor 60 (78 s): cabe, NÃO vira para 90 — antes a análise virava (78 > 72 e 78 ≤ 103,5)', v(180, 2.3, 60)?.kind === 'fits')
  const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
  const ini = gc.indexOf('const reguaAnalise = reguaDoServidorNaTela(')
  const fim = gc.indexOf('if (!cobre && falaSeg > 12) {', ini)
  const blocoAnalise = ini > 0 && fim > ini ? gc.slice(ini, fim) : ''
  const blocoSemComentarios = blocoAnalise.replace(/^\s*\/\/.*$/gm, '')
  checa('o bloco da análise existe e NÃO digita mais `* 1.2` nem `* 1.15`', blocoAnalise.length > 0 && !/\*\s*1\.2\b/.test(blocoSemComentarios) && !/\*\s*1\.15\b/.test(blocoSemComentarios) && !/d \* 1\.15/.test(blocoSemComentarios))
  checa('a análise sobe pelo veredito do contador (contadorVoz → kind up → botão do seletor)', /const vereditoAnalise = contadorVoz\(\{ script: baseChecagem, regua: reguaAnalise, requestedSeconds: duration \}\)/.test(blocoAnalise) && /vereditoAnalise\?\.kind === 'up' \? DURATION_OPTIONS\.find\(\(o\) => o\.value === vereditoAnalise\.to\)\?\.value : undefined/.test(blocoAnalise) && /setDuration\(sobePara\)/.test(blocoAnalise) && /alvoAnalise = sobePara/.test(blocoAnalise) && /trackEvent\('script_duration_autofit'/.test(blocoAnalise))
  checa('acima do teto fica registrado pelo mesmo veredito (too_long → script_duration_overflow)', /else if \(vereditoAnalise\?\.kind === 'too_long'\) \{\s*void trackEvent\('script_duration_overflow'/.test(blocoAnalise))
}

console.log('== G) revisão 28/09: promessas por motor — "we narrate it all" só onde provado; acima do teto o clássico corta, o Kineo 1 recusa ==')
{
  const v = (n, wps, req) => CV.contadorVoz({ script: palavras(n), regua: reguaDe(wps), requestedSeconds: req })
  const cabeMais = v(109, 2.45, 35)
  checa('Kling 2.5 (clássico): cabe e diz que narra tudo (~44s)', /✓ fills your 35s film — we narrate it all \(~44s\)/.test(CV.fraseDoContador(cabeMais, null, 'kling').text))
  checa('Kineo 1: cabe e diz que narra tudo', /we narrate it all/.test(CV.fraseDoContador(cabeMais, null, 'fast').text))
  const holly = v(150, 2.3, 60) // 65 s no hollywood a 2,3
  checa('hollywood (Kling 3/H3/Omni/S25): cabe, mas NÃO promete "we narrate it all" (apararComFolga apara cenas; sem prova)', holly?.kind === 'fits' && holly.narratesLonger === true && !/we narrate it all/.test(CV.fraseDoContador(holly, null, 'hollywood').text) && !/we narrate it all/.test(CV.fraseDoContador(holly, null, 'h3').text) && !/we narrate it all/.test(CV.fraseDoContador(holly, null, 'omni').text) && !/we narrate it all/.test(CV.fraseDoContador(holly, null, 's25').text))
  const longo = v(260, 2.3, 90)
  checa('acima do teto no clássico/hollywood: avisa que o filme é CORTADO no teto e o final se perde', /Trim ~\d+ words, or let AI structure it — otherwise we cut the film at 90s and the ending is lost\.$/.test(CV.fraseDoContador(longo, null, 'kling').text) && /we cut the film at 90s/.test(CV.fraseDoContador(longo, null, 'hollywood').text) && /we cut the film at 90s/.test(CV.fraseDoContador(longo, null, 'seedance').text))
  checa('acima do teto no Kineo 1: avisa que recusa sem cobrar, sem aviso de corte', CV.fraseDoContador(longo, null, 'fast').text.endsWith("otherwise we can't generate it (nothing is charged).") && !/we cut the film/.test(CV.fraseDoContador(longo, null, 'fast').text))
  // o espelho nas rotas: só generate-video-fast recusa acima do teto; o cinematic não importa o "sobe/teto"
  const fast = rd('app/api/generate-video-fast/route.ts')
  const cin = rd('app/api/generate-video-cinematic/route.ts')
  checa('generate-video-fast RECUSA acima do teto de 90 s (decideDurationFollowsScriptUp + script_too_long_for_engine); o cinematic NÃO aplica esse teto (não importa o "sobe") — a única recusa dele é o cap de cenas do hollywood (MAX_VERBATIM_SCENES × SCENE_CAP × 2,3 = 331 palavras, acima dos 238 do teto)', /decideDurationFollowsScriptUp/.test(fast) && /script_too_long_for_engine/.test(fast) && !/decideDurationFollowsScriptUp/.test(cin) && /const maxWords = Math\.floor\(MAX_VERBATIM_SCENES \* SCENE_CAP \* 2\.3\)/.test(cin) && /const MAX_VERBATIM_SCENES = 12/.test(cin) && /const SCENE_CAP = family === 'omni' \? 10 : 12/.test(cin))
  checa('a frase deriva o ramo do motor pela mesma função de família do servidor (speechFamilyForQuality), não por lista digitada', /const family = motor \? speechFamilyForQuality\(motor\) : null/.test(rd('lib/contadorVoz.ts')) && /const recusaNoTeto = motor === 'fast'/.test(rd('lib/contadorVoz.ts')))
}

// ── KINEO-ENTRADA-SEEDANCE15-2026-09-29 (E2b) — o filme de 15 s do Seedance no contador ──────────────────────────────
console.log('== H) Seedance a 15 s: o contador usa a lista do Seedance (15/35/60/90), os outros motores seguem em 35/60/90 ==')
{
  const reg = (engine) => CV.reguaDoServidorNaTela({ engine, script: palavras(45), language: 'en' })
  const rs = reg('seedance'), rk = reg('kling'), rf = reg('fast')
  checa('régua do Seedance traz [15, 35, 60, 90] (supportedDurationsFor, não digitado); Kling e Kineo 1 seguem [35, 60, 90]', JSON.stringify(rs.supported) === JSON.stringify(DBE.SEEDANCE_DURATIONS) && JSON.stringify(rk.supported) === JSON.stringify(DBE.DEFAULT_ENGINE_DURATIONS) && JSON.stringify(rf.supported) === JSON.stringify(DBE.DEFAULT_ENGINE_DURATIONS))
  const palavras15 = Math.ceil(DBE.SEEDANCE_SHORT_SECONDS * rs.rate.wordsPerSecond) // enche os 15 s na voz prevista
  const v15 = CV.contadorVoz({ script: palavras(palavras15), regua: rs, requestedSeconds: DBE.SEEDANCE_SHORT_SECONDS })
  checa(`Seedance 15 s com ${palavras15} palavras: cabe (não "too short — pick 35")`, v15?.kind === 'fits')
  const semLista = { ...rs, supported: undefined }
  const mut = CV.contadorVoz({ script: palavras(palavras15), regua: semLista, requestedSeconds: DBE.SEEDANCE_SHORT_SECONDS })
  checa('mutante (régua sem a lista do Seedance) → vermelho: volta a dizer "too short" para o filme de 15 s', mut?.kind === 'too_short')
  const k15 = CV.contadorVoz({ script: palavras(palavras15), regua: rk, requestedSeconds: DBE.SEEDANCE_SHORT_SECONDS })
  checa('Kling a 15 s continua "too short" (o 15 s não vaza para outro motor)', k15?.kind === 'too_short')
}

console.log(`\n${ok} verificações passaram · ${falhas.length} falharam`)
for (const f of falhas) console.log('  ✗ ' + f)
if (falhas.length) process.exit(1)
console.log('STUDIO-CONTADOR-VOZ: OK')
