// KINEO-VOZ-NATIVA-HOLLYWOOD-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião da voz nativa na estrada hollywood.
// Defeito: Kling 3, Kling 4 (pago/promo), H3, H3 Max e Seedance 2.5 narravam português/espanhol com a voz americana da tts-1-hd
// (synthesizeHostSpeech, lib/hollywood/hostVoice.ts) — "sangue azul" ouvido como "cinco olhos" — com a legenda certa. Os clássicos já
// narram essas línguas na voz nativa MiniMax (lib/compose.ts, KINEO-VOZ-NATIVA-2610).
// Prova, sem rede e sem fal, com o código REAL de lib/hollywood/hostVoice.ts (synthesizeHostSpeech), lib/textLanguage.ts e
// lib/ttsFallback.ts (ttsFallbackInput — o corpo que iria à fal):
//   A. toda língua de voz nativa (usesMiniMaxNarration) sai pela MiniMax, com a MESMA velocidade final (0,7–1,3) e a língua certa;
//   B. o gênero da voz pinada é mantido (onyx/echo/fable = voz de homem na língua; nova/shimmer/alloy = de mulher);
//   C. en (e chamador sem língua) continua byte a byte na tts-1-hd com a voz e a velocidade de antes;
//   D. Kling 4 pago: a velocidade FINAL pinada (host_voice.speed_final) chega à MiniMax igual, com ou sem body.speed;
//   E. os 4 chamadores (compose ×2, audioNoCliqueServer, rota do cinematic) passam a língua; o conector devolve a língua resolvida;
//      0211b: a voz do clique nasce na MESMA língua do compose (claim > roteiro claro > interface) e a chave do cache leva a língua;
//   F. reprodução: a synthesizeHostSpeech da origin/main manda pt/es à tts-1-hd (este guardião fica vermelho lá);
//   G. recibo exato da trava + mutantes.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { VOZ_NATIVA_HOLLYWOOD_0211, semVozNativaHollywood0211 } from './test-support/desfaz-voz-nativa-hollywood-0211.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 })
const sha = (t) => createHash('sha256').update(t).digest('hex')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const compila = (src) => ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
const roda = (src, mods = {}) => {
  const exp = {}
  vm.runInNewContext(compila(src), { exports: exp, module: { exports: exp }, require: (id) => mods[id] ?? new Proxy({}, { get: () => () => undefined }), console, process: { env: {} }, Intl })
  return exp
}
const T = roda(rd('lib/textLanguage.ts'))
const F = roda(rd('lib/ttsFallback.ts'), { '@/lib/textLanguage': T })
const FALA = roda(rd('lib/falaNumeros.ts')) // KINEO-NUMEROS-FALADOS-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"]
const NATIVAS = T.NARRATION_LANGUAGES.filter((l) => l.minimaxPrimary === true).map((l) => l.code)

/** A synthesizeHostSpeech REAL do texto dado, com a OpenAI e a fal trocadas por gravadores (nenhuma chamada sai). */
function carregaHost(source) {
  const ini = source.indexOf('export async function synthesizeHostSpeech(')
  const fim = source.indexOf('\n}\n', ini) + 3
  if (ini < 0 || fim <= ini) throw Error('synthesizeHostSpeech não encontrada')
  const chamadas = { openai: [], nativa: [] }
  const box = {
    exports: {}, Buffer, stripScriptMarkers: (v) => v, usesMiniMaxNarration: T.usesMiniMaxNarration,
    falarNumerosParaTts: FALA.falarNumerosParaTts, // KINEO-NUMEROS-FALADOS-0311 — a função real que a synthesizeHostSpeech passou a importar (texto sem número = o mesmo texto; as provas abaixo não mudam)
    require: (id) => {
      if (id === '@/lib/openai') return { OPENAI_TTS_TIMEOUT_MS: 55000, openai: { audio: { speech: { create: async (input, options) => { chamadas.openai.push({ input, options }); return { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer } } } } } }
      if (id === '@/lib/ttsFallback') return { synthesizeTtsFallback: async (text, ctx) => { chamadas.nativa.push({ text, ctx, corpo: F.ttsFallbackInput(text, ctx.language, ctx.speed, ctx.gender) }); return Buffer.from('voz-nativa') } }
      throw Error('chamada não simulada: ' + id)
    },
  }
  vm.runInNewContext(compila(source.slice(ini, fim)), box, { timeout: 5000 })
  return { fala: box.exports.synthesizeHostSpeech, chamadas }
}
const limita = (s) => Math.max(0.7, Math.min(1.3, s))
const HOST = rd('lib/hollywood/hostVoice.ts')

console.log('== A. toda língua de voz nativa sai pela MiniMax, com a mesma velocidade final ==')
{
  checa(`A0 o catálogo tem pt e es entre as ${NATIVAS.length} línguas nativas (en fora)`, NATIVAS.includes('pt') && NATIVAS.includes('es') && !NATIVAS.includes('en') && NATIVAS.length >= 20)
  let todas = true
  for (const code of NATIVAS) for (const speed of [0.5, 0.94, 1.07, 1.5]) {
    const h = carregaHost(HOST)
    const audio = await h.fala({ text: 'O sangue azul corre no castelo.', voice: 'nova', speed, language: code })
    const n = h.chamadas.nativa[0]
    const certo = audio.toString() === 'voz-nativa' && h.chamadas.openai.length === 0 && h.chamadas.nativa.length === 1 &&
      n.ctx.language === code && n.ctx.speed === limita(speed) && n.corpo.voice_setting?.speed === limita(speed) &&
      n.corpo.voice_setting?.voice_id === T.minimaxVoiceFor(code, 'female') && n.corpo.language_boost === T.minimaxLanguageBoost(code) && n.text === 'O sangue azul corre no castelo.'
    if (!certo) { todas = false; console.log('    língua', code, 'velocidade', speed, JSON.stringify({ openai: h.chamadas.openai.length, nativa: n?.ctx, corpo: n?.corpo })) }
  }
  checa(`A1 ${NATIVAS.length} línguas × 4 velocidades: 0 chamadas à tts-1-hd, 1 à MiniMax, língua e boost certos, velocidade = a final limitada (0,7–1,3) no ctx E no corpo da fal`, todas)
  const h = carregaHost(HOST)
  await h.fala({ text: 'El juego terminó.', voice: 'echo', speed: 1.02, language: 'ES' })
  checa('A2 código em maiúscula (ES) também vai à voz nativa (narrationLanguage normaliza)', h.chamadas.openai.length === 0 && h.chamadas.nativa.length === 1 && h.chamadas.nativa[0].corpo.voice_setting?.voice_id === 'Spanish_ReliableMan')
  let vazio = null
  try { await carregaHost(HOST).fala({ text: '   ', voice: 'nova', language: 'pt' }) } catch (e) { vazio = e.message }
  checa('A3 texto vazio continua recusado antes de qualquer voz (nativa ou não)', vazio === 'empty host speech text')
}

console.log('== B. o gênero da voz pinada é mantido ==')
{
  const casos = [['onyx', 'male'], ['echo', 'male'], ['fable', 'male'], ['nova', 'female'], ['shimmer', 'female'], ['alloy', 'female']]
  let todos = true
  for (const [voice, gender] of casos) for (const code of ['pt', 'es']) {
    const h = carregaHost(HOST)
    await h.fala({ text: 'Uma frase.', voice, speed: 1, language: code })
    const id = h.chamadas.nativa[0]?.corpo.voice_setting?.voice_id
    if (id !== T.minimaxVoiceFor(code, gender)) { todos = false; console.log('    ', voice, code, id) }
  }
  checa('B1 onyx/echo/fable → Portuguese_ReliableMan/Spanish_ReliableMan; nova/shimmer/alloy → *_ConfidentWoman (homem da ficha não ganha voz de mulher)', todos)
  checa('B2 ttsFallbackInput sem gênero = byte a byte o de antes (voz feminina): os clássicos e o plano B não mudam',
    JSON.stringify(F.ttsFallbackInput('Uma frase.', 'pt', 1.1)) === JSON.stringify({ prompt: 'Uma frase.', output_format: 'url', language_boost: 'Portuguese', voice_setting: { voice_id: 'Portuguese_ConfidentWoman', speed: 1.1 } }) &&
    JSON.stringify(F.ttsFallbackInput('Hello')) === JSON.stringify({ prompt: 'Hello', output_format: 'url', language_boost: 'auto' }))
}

console.log('== C. en e chamador sem língua: a tts-1-hd de sempre ==')
{
  let todos = true
  for (const language of ['en', undefined, null, '', 'xx']) for (const [voice, speed] of [['onyx', 0.92], ['nova', 1.5], ['echo', 0.4]]) {
    const h = carregaHost(HOST)
    const audio = await h.fala({ text: 'Faithful narration.', voice, speed, ...(language === undefined ? {} : { language }) })
    const o = h.chamadas.openai[0]
    if (!(audio.length === 3 && h.chamadas.nativa.length === 0 && h.chamadas.openai.length === 1 && o.input.model === 'tts-1-hd' && o.input.voice === voice && o.input.speed === limita(speed) && o.input.input === 'Faithful narration.' && o.options.maxRetries === 0 && o.options.timeout === 55000)) { todos = false; console.log('    ', language, voice, speed) }
  }
  checa('C1 en / sem língua / língua desconhecida: 1 chamada tts-1-hd com a voz pinada, a velocidade limitada e o timeout de sempre; 0 à MiniMax', todos)
}

console.log('== D. Kling 4 pago: a velocidade FINAL pinada chega igual à voz nativa ==')
{
  // ≡ compose: host_voice com speed_final → pinada = final ÷ explicitSpeed (velocidadePinadaNoCompose); a síntese fala pinada × (explicitSpeed ?? 1).
  const compose = rd('app/api/compose/route.ts')
  checa('D0 o compose pina a final antes de toda síntese e multiplica de volta (fórmula de 0211e intacta)',
    compose.includes('if (hostVoiceTemVelocidadeFinal(cinematicBirthClaim?.response?.host_voice)) hollywoodPinnedVoice = { ...hollywoodPinnedVoice, defaultSpeed: velocidadePinadaNoCompose(hollywoodPinnedVoice.defaultSpeed, explicitSpeed) }') &&
    compose.includes('speed: hollywoodPinnedVoice.defaultSpeed * (explicitSpeed ?? 1.0),\n            language,'))
  let todos = true
  for (const final of [0.9, 0.94, 0.97, 1.07, 1.1]) for (const explicitSpeed of [null, 0.7, 1, 1.3]) {
    const pinada = final / (explicitSpeed ?? 1.0)
    const h = carregaHost(HOST)
    await h.fala({ text: 'Vinte e oito palavras do filme pago.', voice: 'echo', speed: pinada * (explicitSpeed ?? 1.0), language: 'pt' })
    const s = h.chamadas.nativa[0]?.corpo.voice_setting?.speed
    if (!(typeof s === 'number' && Math.abs(s - final) < 1e-9)) { todos = false; console.log('    ', final, explicitSpeed, s) }
  }
  checa('D1 final 0,9–1,1 × body.speed (ausente, 0,7, 1, 1,3): a MiniMax recebe EXATAMENTE a final (a régua 2,3 × fator do portão julga a mesma velocidade)', todos)
  // FALA-CABE (re-síntese até × 1,1) também vale na voz nativa: a velocidade sobe na MiniMax como subia na tts-1-hd.
  const h = carregaHost(HOST)
  await h.fala({ text: 'Fala que estourou por pouco.', voice: 'onyx', speed: 0.97 * 1.1, language: 'pt' })
  checa('D2 a re-síntese da FALA-CABE (× 1,1) chega à MiniMax como 1,067 (a voz nativa honra voice_setting.speed)', Math.abs((h.chamadas.nativa[0]?.corpo.voice_setting?.speed ?? 0) - 0.97 * 1.1) < 1e-9)
}

console.log('== E. os chamadores passam a língua ==')
const chamadores = () => {
  const out = []
  for (const f of git('ls-files', 'app', 'lib').split('\n').filter((p) => /\.(ts|tsx)$/.test(p))) {
    const s = rd(f)
    for (let at = s.indexOf('synthesizeHostSpeech({'); at >= 0; at = s.indexOf('synthesizeHostSpeech({', at + 1)) {
      const corpo = s.slice(at, s.indexOf('})', at) + 2)
      out.push({ f, linha: s.slice(0, at).split('\n').length, corpo })
    }
  }
  return out
}
{
  const cs = chamadores()
  const por = (f) => cs.filter((c) => c.f === f).length
  checa(`E1 ${cs.length} chamadas de synthesizeHostSpeech em app/ e lib/ — compose 2, audioNoCliqueServer 1, rota do cinematic 1 (nenhuma esquecida)`,
    cs.length === 4 && por('app/api/compose/route.ts') === 2 && por('lib/audioNoCliqueServer.ts') === 1 && por('app/api/generate-video-cinematic/route.ts') === 1)
  checa('E2 TODAS passam a língua do filme (compose: language resolvido; clique: language ≡ compose; cinematic: narrationLanguage.language)', cs.length > 0 && cs.every((c) => /\blanguage\b/.test(c.corpo)))
  for (const c of cs) console.log(`      ${c.f}:${c.linha}`)
  const cine = cs.find((c) => c.f === 'app/api/generate-video-cinematic/route.ts')
  checa('E3 a fala do apresentador (lipsync) usa a língua que a rota resolveu (texto > pedido)', !!cine && cine.corpo.includes('language: narrationLanguage.language'))
  const tools = rd('lib/mcp/studioTools.ts')
  checa('E5 o conector devolve a língua que a rota resolveu (data.language), com o pedido como reserva', tools.includes("language: typeof data.language === 'string' && data.language ? data.language : input.language,"))
}

console.log('== E4/E6/E7 (0211b). a voz do clique nasce na MESMA língua do compose e a chave do cache leva a língua ==')
{
  // As linhas REAIS das duas pontas, executadas com o textLanguage real.
  const srv = rd('lib/audioNoCliqueServer.ts')
  const ini = srv.indexOf('    const language = ') + '    const language = '.length
  const exprClique = srv.slice(ini, srv.indexOf(' // ≡ compose', ini))
  const lingClique = new Function('narrationLanguage', 'resolveNarrationLanguage', 'r', 'a', 'voiceoverScript', `return ${exprClique}`).bind(null, T.narrationLanguage, T.resolveNarrationLanguage)
  const cmp = rd('app/api/compose/route.ts')
  const l1 = cmp.slice(cmp.indexOf('    const idiomaDoFilme = resolveNarrationLanguage('), cmp.indexOf('\n', cmp.indexOf('    const idiomaDoFilme = resolveNarrationLanguage(')))
  const l2 = cmp.slice(cmp.indexOf('    let language = idiomaDoFilme.language'), cmp.indexOf('\n', cmp.indexOf('    let language = idiomaDoFilme.language')))
  const bIni = cmp.indexOf('    { // KINEO-FILME15-FIEL-2610 — o idioma que a rota de geração resolveu')
  const bFim = cmp.indexOf('    } // KINEO-FILME15-FIEL-2610\n', bIni) + '    } // KINEO-FILME15-FIEL-2610'.length
  const corpoCompose = compila(`${l1}\n${l2}\n${cmp.slice(bIni, bFim)}\nreturn language`)
  const lingCompose = (body, voiceoverScript, claimResponse) => new Function('resolveNarrationLanguage', 'narrationLanguage', 'body', 'voiceoverScript', 'cinematicBirthClaim', 'console', corpoCompose)(T.resolveNarrationLanguage, T.narrationLanguage, body, voiceoverScript, claimResponse ? { response: claimResponse } : null, { warn() {}, log() {} })
  const PT = 'O sangue azul corria nas veias da rainha, e ninguém no castelo sabia o segredo que ela guardava desde criança.'
  const ES = 'La sangre azul corría por las venas de la reina, y nadie en el castillo conocía el secreto que guardaba desde niña.'
  const EN = 'The blue blood ran through the queen veins, and nobody in the castle knew the secret she had kept since childhood.'
  const casos = [['en', PT, undefined], ['en', ES, undefined], [undefined, PT, undefined], ['pt', EN, undefined], ['en', EN, undefined], ['en', PT, 'pt'], ['en', EN, 'es'], ['pt', PT, 'en'], [null, ES, 'es']]
  let iguais = true
  for (const [ui, script, claimLang] of casos) {
    const r = claimLang ? { language: claimLang } : {}
    const c = lingClique(r, { bodyLanguage: ui }, script), m = lingCompose({ language: ui }, script, claimLang ? { language: claimLang } : null)
    if (c !== m) { iguais = false; console.log('    ', ui, claimLang, script.slice(0, 20), 'clique', c, 'compose', m) }
  }
  checa(`E4 a língua do clique = a do compose em ${casos.length} combinações (interface × roteiro × claim; claim vence, interface "en" cede ao roteiro claro)`, iguais && exprClique.includes('resolveNarrationLanguage'))
  const ui_en_pt = lingClique({}, { bodyLanguage: 'en' }, PT)
  const A = roda(rd('lib/audioNoClique.ts'), { 'node:crypto': await import('node:crypto') })
  const h = carregaHost(HOST)
  await h.fala({ text: PT, voice: 'echo', speed: 0.96, language: ui_en_pt })
  checa('E6 interface "en" + roteiro pt (sem língua no claim): o clique resolve pt e a voz que vai ao cache é a NATIVA (Portuguese_ReliableMan), 0 chamadas à tts-1-hd',
    ui_en_pt === 'pt' && h.chamadas.openai.length === 0 && h.chamadas.nativa[0]?.corpo.voice_setting?.voice_id === 'Portuguese_ReliableMan')
  const base = { generationId: 'g-0211b', texto: PT, voz: 'echo', velocidade: 0.96 }
  const kClique = A.chaveDaCenaAquecida({ ...base, lingua: ui_en_pt }), kCompose = A.chaveDaCenaAquecida({ ...base, lingua: lingCompose({ language: 'en' }, PT, null) })
  checa('E7 a chave do cache da cena leva a língua: clique pt = compose pt; uma voz feita em "en" NUNCA é reaproveitada num filme pt (cinto e suspensório)',
    kClique === kCompose && kClique !== A.chaveDaCenaAquecida({ ...base, lingua: 'en' }) && A.chaveDaCenaAquecida({ ...base, lingua: 'en' }) !== A.chaveDaCenaAquecida({ ...base, lingua: 'es' }))
  checa('E8 as duas pontas passam a língua à chave: o clique (chaveDaCenaAquecida … lingua: language) e a montagem (audioDoClique.cena(…, language))',
    srv.includes('velocidade, lingua: language })') && cmp.includes('hollywoodPinnedVoice.defaultSpeed * (explicitSpeed ?? 1.0), language /* KINEO-VOZ-NATIVA-HOLLYWOOD-0211b') && rd('lib/audioNoClique.ts').includes('const chave = chaveDaCenaAquecida({ generationId: a.generationId, texto, voz, velocidade, lingua })'))
}

console.log('== F. reprodução na origin/main ==')
{
  const commits = git('log', '--format=%H', '--grep=KINEO-VOZ-NATIVA-HOLLYWOOD-0211').trim().split('\n').filter(Boolean)
  const base = commits.length ? `${commits[commits.length - 1]}^` : 'origin/main'
  const antigo = lf(git('show', `${base}:lib/hollywood/hostVoice.ts`))
  if (antigo.includes('KINEO-VOZ-NATIVA-HOLLYWOOD-0211')) checa('F0 a base ainda não tem o conserto', false)
  else {
    const h = carregaHost(antigo)
    await h.fala({ text: 'O sangue azul corre no castelo.', voice: 'echo', speed: 0.96, language: 'pt' })
    checa(`F1 na base (${git('rev-parse', '--short', base).trim()}) o português ia à tts-1-hd americana (echo) — o defeito, reproduzido`, h.chamadas.openai.length === 1 && h.chamadas.openai[0].input.voice === 'echo' && h.chamadas.nativa.length === 0)
  }
}

console.log('== G. recibo exato da trava + mutantes ==')
{
  const R = VOZ_NATIVA_HOLLYWOOD_0211
  const arquivos = Object.keys(R.scope)
  checa('G1 o recibo cobre os 7 arquivos da entrega (0211b: + lib/audioNoClique.ts)', ['lib/hollywood/hostVoice.ts', 'lib/ttsFallback.ts', 'app/api/compose/route.ts', 'lib/audioNoCliqueServer.ts', 'app/api/generate-video-cinematic/route.ts', 'lib/mcp/studioTools.ts', 'lib/audioNoClique.ts'].every((f) => arquivos.includes(f)) && arquivos.length === 7)
  let exato = true
  for (const f of arquivos) {
    const atual = rd(f)
    if (sha(atual) !== R.scope[f].afterSha256) continue // camada mais nova por cima: o guardião dela confere
    if (sha(lf(semVozNativaHollywood0211(atual, f))) !== R.scope[f].beforeSha256) exato = false
  }
  checa('G2 desfazer os trechos devolve EXATAMENTE o antes de cada arquivo (hash)', exato)
  const editado = rd('lib/hollywood/hostVoice.ts') + '\n// edição solta\n'
  checa('G3 edição fora do recibo não é desfeita (o guardião histórico continua vermelho)', semVozNativaHollywood0211(editado, 'lib/hollywood/hostVoice.ts') === editado)
  // mutantes aplicados em memória
  const semDesvio = HOST.replace('if (args.language != null && usesMiniMaxNarration(args.language)) {', 'if (false) {')
  const m1 = carregaHost(semDesvio); await m1.fala({ text: 'Uma frase.', voice: 'nova', speed: 1, language: 'pt' })
  checa('M1 sem o desvio → o pt volta à tts-1-hd (A fica vermelho)', semDesvio !== HOST && m1.chamadas.openai.length === 1)
  const semVelocidade = HOST.replace('{ language: args.language, speed: safeSpeed, gender }', '{ language: args.language, gender }')
  const m2 = carregaHost(semVelocidade); await m2.fala({ text: 'Uma frase.', voice: 'nova', speed: 1.07, language: 'pt' })
  checa('M2 sem a velocidade → a MiniMax fala 1,0 em vez da final (D fica vermelho)', semVelocidade !== HOST && m2.chamadas.nativa[0].corpo.voice_setting.speed === 1)
  const semGenero = HOST.replace("? 'male' : 'female'", "? 'female' : 'female'")
  const m3 = carregaHost(semGenero); await m3.fala({ text: 'Uma frase.', voice: 'onyx', speed: 1, language: 'pt' })
  checa('M3 sem o gênero → homem ganha voz de mulher (B fica vermelho)', semGenero !== HOST && m3.chamadas.nativa[0].corpo.voice_setting.voice_id === 'Portuguese_ConfidentWoman')
}

console.log(`\n${ok} ok, ${falhas.length} falha(s); chamadas pagas: 0`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
