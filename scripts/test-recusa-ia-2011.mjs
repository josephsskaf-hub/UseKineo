// KINEO-RECUSA-IA-2011 — guardião da recusa do modelo [CEO 20/11; filme grátis d700489f, DE, 19/11 21:40Z].
// O caso: a 2ª tentativa do escritor (/api/generate-script, script_declined_retry outcome ok / story_only_accepted) devolveu
// "I'm sorry, I can't assist with that." — a régua antiga (lib/modelRefusal.ts) só conhecia "I'm sorry, BUT I can't…" e
// "…with that REQUEST", aceitou a frase como roteiro, a tela a mandou como prompt (prompt_length 36), o servidor a reescreveu
// (idea_written_on_server: sem_marcadores → fallback), o motor (H3 Max Turbo, reserva do grátis) filmou e a fala saiu em russo:
// "Извините, но я не могу оказать помощь с данным конкретным запросом". 30 dias no banco: a mesma frase em 3 pessoas e
// "I'm sorry, but I can only provide scripts in US English…" entregue como filme em 19/10 (c17d2e78).
// Prova, EXECUTANDO lib/modelRefusal.ts num vm:
//   (1) as frases REAIS (inglês e russo) e recusas em PT, ES, DE, FR, IT, RU, UK, PL, NL, TR, ZH e JA são recusa;
//   (2) controles que NUNCA disparam: "I'm sorry, Mom", "Desculpe pelo atraso", fala entre aspas com "disse", recusa no meio
//       da história, conto infantil, finanças, roteiro HOOK/[Pexels], "I can't make it tonight";
//   (3) a régua de antes (origin/main) NÃO pegava o caso real (o defeito existia);
//   (4) a fiação: cada caminho que escreve roteiro ou prompt chama o detector no lugar certo (ordem na rota do cinematic: antes
//       do escritor e da cobrança; depois do generateScenes, com o estorno de sempre).
// Mutantes no fim: desligar o detector, tirar a guarda de fala, ou tirar a chamada de qualquer caminho deixa o teste vermelho.
// Rodar: node scripts/test-recusa-ia-2011.mjs
import fs from 'node:fs'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const carregar = (src) => {
  const exports = {}
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { exports, require: () => ({}), String, RegExp, Math }, { filename: 'modelRefusal.ts' })
  return exports
}

const REAL_EN = "I'm sorry, I can't assist with that."
const REAL_RU = 'Извините, но я не могу оказать помощь с данным конкретным запросом.'
const REAL_RU_NARRACAO = 'Извините, но я не могу оказать помощь с данным конкретным запросом. Технологии становятся всё более сложными. Они меняют нашу жизнь каждый день. Каждое новое устройство требует новых знаний и навыков.'
const REAL_C17 = "I'm sorry, but I can only provide scripts in US English. If you have a topic or story in English, I'd be happy to help you create a viral YouTube Short script."
const LONGA_COM_CONVERSA = "I'm sorry, but I can't help with that request. However, I can write a script about the history of scientific instruments, the people who built the first microscopes, how the vacuum pump changed physics, why the telescope mattered to navigation, and many other topics that would make a great short video for your audience if you tell me which one you prefer and how long the film should be."

const POSITIVOS = [
  ['real EN (d700489f, 24/10, 28/10)', REAL_EN],
  ['real RU (fala do filme d700489f)', REAL_RU],
  ['real RU, a narração inteira do filme', REAL_RU_NARRACAO],
  ['real c17d2e78 (19/10): "I can only provide scripts in US English"', REAL_C17],
  ['EN com but + request (33c24d46, 17/09)', "I'm sorry, but I can't assist with that request."],
  ['EN sem sorry', 'I cannot help with this request.'],
  ['EN embrulhada em aspas', `"${REAL_EN}"`],
  ['EN em negrito', `**${REAL_EN}**`],
  ['EN embrulhada no formato do roteiro', `HOOK: ${REAL_EN}`],
  ['EN "As an AI"', 'As an AI language model, I cannot create that video.'],
  ['EN "I must decline"', 'I must respectfully decline this request.'],
  ['EN longa com conversa do modelo', LONGA_COM_CONVERSA],
  ['EN unable to', "Unfortunately, I'm unable to help with that."],
  ['PT', 'Desculpe, mas não posso ajudar com isso.'],
  ['PT criar esse conteúdo', 'Infelizmente, não posso criar esse conteúdo.'],
  ['PT como IA', 'Como uma IA, não posso escrever esse roteiro.'],
  ['ES', 'Lo siento, pero no puedo ayudar con eso.'],
  ['DE', 'Es tut mir leid, aber ich kann dabei nicht helfen.'],
  ['DE leider', 'Leider kann ich bei dieser Anfrage nicht helfen.'],
  ['FR', 'Je suis désolé, mais je ne peux pas vous aider avec cela.'],
  ['IT', 'Mi dispiace, ma non posso aiutarti con questa richiesta.'],
  ['RU с этим', 'Извините, я не могу с этим помочь.'],
  ['UK', 'Вибачте, але я не можу допомогти з цим.'],
  ['PL', 'Przepraszam, ale nie mogę w tym pomóc.'],
  ['NL', 'Het spijt me, maar ik kan je daar niet mee helpen.'],
  ['TR', 'Üzgünüm, ama bu konuda yardımcı olamam.'],
  ['ZH', '抱歉，我无法协助完成这个请求。'],
  ['JA', '申し訳ありませんが、そのご依頼にはお応えできません。'],
]
const NEGATIVOS = [
  ['"I\'m sorry, Mom" numa fala', "I'm sorry, Mom. I broke your favorite vase and hid the pieces under my bed. She found them on a Sunday morning."],
  ['fala entre aspas com "the doctor said"', '"I\'m sorry, I can\'t help you," the doctor said. Maria walked out into the rain and never came back to that hospital.'],
  ['fala com vocativo', "I'm sorry, I can't help with that, Mom. The old car finally died on the highway, and we walked home under the stars."],
  ['recusa dita por um personagem no MEIO da história', "The robot looked at the child for a long time. 'I'm sorry, I can't assist with that,' it said. Then it smiled and opened the door."],
  ['PT "Desculpe pelo atraso" numa história', 'Desculpe pelo atraso. O trem parou no meio do túnel e ninguém sabia por quê. Foi então que as luzes se apagaram.'],
  ['PT conto infantil', 'Era uma vez um coelho chamado Leo que pediu desculpa à tartaruga por ter rido dela. Os dois viraram melhores amigos e correram juntos até o rio.'],
  ['EN finanças', 'Sorry, but your savings account is losing money every year. Inflation at 4 percent eats 400 dollars of every 10 thousand you keep in the bank.'],
  ['ES fala de família', 'Lo siento, mamá, no volveré tarde. Eso fue lo último que dijo Ana antes de salir hacia el puerto aquella noche.'],
  ['ES história', 'Lo siento mucho por tu perro, le dijo el vecino. Pero aquel perro no había muerto: estaba escondido en el bosque.'],
  ['EN "I can\'t make it tonight"', "I'm sorry, I can't make it tonight. That was the text Jake sent an hour before the bridge collapsed."],
  ['EN "I can\'t write this anymore"', "I'm sorry, I can't write this anymore. My hands were shaking as I folded the last letter to my brother."],
  ['EN "I can\'t help it"', "I'm sorry, but I can't help it. Every time I see the ocean I want to know what lives at the bottom of the Mariana Trench."],
  ['EN roteiro HOOK/[Pexels]', 'HOOK (0-2s): [Pexels: airport] The Boeing 737 has a secret under its wing.'],
  ['RU история', 'Извините, что опоздал. Поезд застрял в тоннеле, и никто не знал почему.'],
  ['DE Geschichte', 'Es tut mir leid, dass ich zu spät bin. Der Zug blieb im Tunnel stehen.'],
  ['FR histoire', 'Désolé pour le retard, le train était bloqué. Personne ne savait pourquoi.'],
  ['EN robô narrador', 'As an AI, I was built to protect the city. But that night everything changed when the power went out.'],
  ['recusa no meio de um texto, sem aspas', "Maria opened the old letter from 1962. I'm sorry, I can't assist with that request anymore, it said in faded ink. Nobody ever found out who wrote it."],
  ['vazio', ''],
]

function checarDetector(M) {
  const falhas = []
  for (const [n, t] of POSITIVOS) if (M.looksLikeModelRefusal(t) !== true) falhas.push('recusa não pega: ' + n)
  for (const [n, t] of NEGATIVOS) if (M.looksLikeModelRefusal(t) !== false) falhas.push('alarme falso: ' + n)
  if (typeof M.algumaRecusaDoModelo !== 'function') falhas.push('algumaRecusaDoModelo ausente')
  else {
    if (M.algumaRecusaDoModelo(['Каждое научное открытие начинается с идеи.', REAL_RU, 'Технологии меняют жизнь.']) !== true) falhas.push('a fala de UMA cena que é recusa não pega')
    if (M.algumaRecusaDoModelo(['The Boeing 737 has a secret.', "I'm sorry, Mom.", null]) !== false) falhas.push('cenas normais acusadas')
  }
  if (!/could not turn this idea into a script \(the AI declined the topic\)/.test(M.MODEL_REFUSAL_MESSAGE ?? '')) falhas.push('a frase da recusa mudou (lib/recusaBotao.ts a reconhece)')
  return falhas
}

// ═══ fiação ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
const CAMINHOS = {
  'app/api/generate-video-cinematic/route.ts': (s) => {
    const f = []
    if (!s.includes("import { looksLikeModelRefusal, algumaRecusaDoModelo, MODEL_REFUSAL_MESSAGE } from '@/lib/modelRefusal'")) f.push('cinematic: import')
    const guarda = s.indexOf('    if (looksLikeModelRefusal(body.prompt)) {')
    const leitura = s.indexOf('const promptRaw = (body.prompt ?? \'\').trim()')
    const cobranca = s.indexOf('await debitVideoCredits(supabase, {')
    if (guarda < 0 || leitura < 0 || !(guarda < leitura) || !(guarda < cobranca)) f.push('cinematic: a guarda do prompt não vem antes da leitura do pedido e da cobrança')
    if (!s.includes("if (!usarIdeia2011 || !ideiaDoCliente2011) return NextResponse.json({ error: MODEL_REFUSAL_MESSAGE, reason: 'model_refused_topic', code: 'model_refused_topic', charged: false, retryable: false }, { status: 422 })")) f.push('cinematic: sem ideia, 422 sem cobrança')
    if (!s.includes('body.prompt = ideiaDoCliente2011')) f.push('cinematic: com a ideia do cliente, o filme nasce da ideia')
    if (!/const usarIdeia2011 = !!ideiaDoCliente2011 && !\(typeof body\.script_mode === 'string' && body\.script_mode\.toLowerCase\(\) === 'verbatim'\)/.test(s)) f.push('cinematic: "Use my script as is" nunca narra a ideia')
    const helper = s.indexOf('const recusaDoEscritorDeCenas2011 = async')
    if (helper < 0 || !/if \(!algumaRecusaDoModelo\(falas\)\) return null\n\s+const refunded = await confirmCinematicRefund\(\)\n\s+const released = refunded && await releaseBirthClaim\('model_refused_topic'\)/.test(s)) f.push('cinematic: a recusa nas cenas não passa pelo estorno de sempre')
    const usos = s.split('await recusaDoEscritorDeCenas2011(').length - 1
    if (usos !== 2) f.push(`cinematic: as 2 saídas do generateScenes chamam a guarda (achei ${usos})`)
    const g1 = s.indexOf('const generated = await generateScenes(')
    const u1 = s.indexOf('await recusaDoEscritorDeCenas2011(scenes.map((s) => s.voiceover))')
    if (!(g1 > 0 && u1 > g1 && u1 - g1 < 1200)) f.push('cinematic: guarda logo depois do 1º generateScenes')
    const g2 = s.indexOf('const generated = await generateScenes(', g1 + 10)
    const u2 = s.indexOf('await recusaDoEscritorDeCenas2011(recuperadas.map((s) => s.voiceover))')
    if (!(g2 > 0 && u2 > g2 && u2 - g2 < 1200)) f.push('cinematic: guarda logo depois do 2º generateScenes')
    if (!s.includes('descriptions: cobertura.descriptions.map((d, i) => (d && !looksLikeModelRefusal(d) ? d : null) ?? scenes[i].aiPrompt ?? null)')) f.push('cinematic: descrição que é recusa vira "sem descrição"')
    return f
  },
  'app/api/generate-script/route.ts': (s) => {
    const f = []
    if (!s.includes("import { looksLikeModelRefusal, MODEL_REFUSAL_MESSAGE } from '@/lib/modelRefusal'")) f.push('escritor: import')
    for (const l of ['if (looksLikeModelRefusal(script)) {', 'if (roteiroDeNovo && !looksLikeModelRefusal(roteiroDeNovo)) historiaAceita = roteiroDeNovo', 'if (texto && !looksLikeModelRefusal(texto)) historiaAceita = texto', 'if (textoDaApara && !looksLikeModelRefusal(textoDaApara)) {']) if (!s.includes(l)) f.push('escritor: ' + l)
    return f
  },
  'lib/meta95/ideiaNoEscritor.ts': (s) => (s.includes("if (looksLikeModelRefusal(parsed.narration)) return nao('recusa_do_modelo')") ? [] : ['ideia no servidor: recusa_do_modelo']),
  'app/api/expand-script/route.ts': (s) => (s.includes('if (!expandido || looksLikeModelRefusal(expandido)) {') ? [] : ['expandir: a recusa substitui o roteiro']),
  'app/api/apply-suggestion/route.ts': (s) => (s.includes('if (!improved || looksLikeModelRefusal(improved)) {') ? [] : ['sugestão: a recusa substitui o roteiro']),
  'app/api/regenerate-scene/route.ts': (s) => (s.includes('newBrollPrompt = gptBrollPrompt.length > 20 && !looksLikeModelRefusal(gptBrollPrompt) ? gptBrollPrompt : builtFallback.brollPrompt') ? [] : ['refazer cena: a recusa vai ao motor como prompt']),
  'app/api/ad-script/route.ts': (s) => (s.includes('if (!script || looksLikeModelRefusal(script)) {') ? [] : ['anúncio (avatar): a recusa vira roteiro']),
  'app/api/ads/script/route.ts': (s) => (s.includes('const semRecusa2011 = (v: ReturnType<typeof parseAdsScriptOutput>) => (v && v.some((x) => looksLikeModelRefusal(x.script)) ? null : v)') && s.split('semRecusa2011(parseAdsScriptOutput(raw, model, brief.value))').length === 3 ? [] : ['anúncio (Studio Ads): versão que é recusa passa']),
  'app/api/kids-cartoon/story/route.ts': (s) => (s.includes("if (looksLikeModelRefusal(texto)) texto = ''") ? [] : ['desenho: a recusa vira história']),
  'app/api/baby-podcast/prepare/route.ts': (s) => (s.includes("if (looksLikeModelRefusal(texto)) texto = ''") ? [] : ['podcast do bebê: a recusa vira roteiro']),
  'app/api/demo-script/route.ts': (s) => (/if \(script && looksLikeModelRefusal\(script\)\) return NextResponse\.json\(\{ script: mode === 'comment' \? fallbackCommentScript\(topic\) : mode === 'product' \? fallbackProductScript\(topic\) : fallbackDemoScript\(topic\), fallback: true \}\)[^\n]*\n\s+if \(script\) return NextResponse\.json\(\{ script \}\)/.test(s) ? [] : ['demo: a recusa vira a demo']),
}
const IMPORT_SIMPLES = "import { looksLikeModelRefusal } from '@/lib/modelRefusal'"
const COM_IMPORT_SIMPLES = ['app/api/expand-script/route.ts', 'app/api/apply-suggestion/route.ts', 'app/api/regenerate-scene/route.ts', 'app/api/ad-script/route.ts', 'app/api/ads/script/route.ts', 'app/api/kids-cartoon/story/route.ts', 'app/api/baby-podcast/prepare/route.ts', 'app/api/demo-script/route.ts']
function checarFiacao(fontes) {
  const f = []
  for (const [arq, ch] of Object.entries(CAMINHOS)) f.push(...ch(fontes[arq]))
  for (const arq of COM_IMPORT_SIMPLES) if (!fontes[arq].includes(IMPORT_SIMPLES)) f.push('import ausente em ' + arq)
  return f
}

// ═══ execução ═════════════════════════════════════════════════════════════════════════════════════════════════════════
let ok = 0
const falhas = []
const checa = (n, lista) => { if (lista.length === 0) { ok++; console.log('  ✓ ' + n) } else { falhas.push(n); console.log('  ✗ ' + n); for (const x of lista) console.log('      - ' + x) } }

const SRC = lf('lib/modelRefusal.ts')
const M = carregar(SRC)
console.log('== (1)(2) o detector ==')
checa(`${POSITIVOS.length} recusas reais e multilíngues pegas, ${NEGATIVOS.length} controles livres`, checarDetector(M))

console.log('== (3) a régua de antes não pegava o caso ==')
let antes = null
try { antes = execFileSync('git', ['show', 'origin/main:lib/modelRefusal.ts'], { encoding: 'utf8' }).replace(/\r\n/g, '\n') } catch { antes = null }
if (antes && antes !== SRC) {
  const A = carregar(antes)
  checa('origin/main deixava passar "I\'m sorry, I can\'t assist with that." e o russo', A.looksLikeModelRefusal(REAL_EN) === false && A.looksLikeModelRefusal(REAL_RU) === false ? [] : ['a régua antiga já pegava? então o defeito é outro'])
} else console.log('  · origin/main já tem esta régua (depois de publicado): pulado')

console.log('== (4) a fiação ==')
const fontes = Object.fromEntries([...Object.keys(CAMINHOS), ...COM_IMPORT_SIMPLES].map((a) => [a, lf(a)]))
checa(`${Object.keys(CAMINHOS).length} caminhos chamam o detector no lugar certo`, checarFiacao(fontes))

console.log('== mutantes (cada um TEM de reprovar) ==')
const mutantes = []
const mutDetector = (nome, de, para) => { if (!SRC.includes(de)) { mutantes.push([nome, false, 'trecho do mutante não achado']); return } let m; try { m = carregar(SRC.replace(de, para)) } catch { mutantes.push([nome, true]); return } mutantes.push([nome, checarDetector(m).length > 0]) }
mutDetector('detector desligado', "  const t = semEmbrulho(String(text ?? ''))\n  if (!t) return false", "  const t = semEmbrulho(String(text ?? ''))\n  if (t || !t) return false")
mutDetector('sem a guarda de fala (aspas, "disse", vocativo)', '  if (ASPA_DE_ABERTURA.test(f) || ETIQUETA_DE_FALA.test(f) || VOCATIVO_NO_FIM.test(f)) return false\n', '')
mutDetector('a régua de antes ("but" obrigatório)', "(?:but\\s*,?\\s*)?(?:I|we)", "but\\s*,?\\s*(?:I|we)")
mutDetector('sem o russo', '^(?:Извините|Простите|', '^(?:XИзвините|Простите|')
mutDetector('recusa em qualquer lugar do texto (a régua dos 400 caracteres)', '  if (!fs.length || !fraseDeRecusa(fs[0])) return false', '  if (!fs.length || !fs.some(fraseDeRecusa)) return false')
mutDetector('sem o teto de 60 palavras', '  if (total <= 60) return true', '  if (total <= 0) return true')
const mutFio = (nome, arq, de, para) => { if (!fontes[arq].includes(de)) { mutantes.push([nome, false, 'trecho do mutante não achado']); return } mutantes.push([nome, checarFiacao({ ...fontes, [arq]: fontes[arq].replace(de, para) }).length > 0]) }
const CIN = 'app/api/generate-video-cinematic/route.ts'
mutFio('cinematic sem a guarda do prompt', CIN, '    if (looksLikeModelRefusal(body.prompt)) {', '    if (false) {')
mutFio('cinematic narra a ideia no "Use my script as is"', CIN, "!(typeof body.script_mode === 'string' && body.script_mode.toLowerCase() === 'verbatim')", 'true')
mutFio('cinematic sem a guarda do 1º generateScenes', CIN, 'await recusaDoEscritorDeCenas2011(scenes.map((s) => s.voiceover))', 'null')
mutFio('cinematic sem a guarda do 2º generateScenes', CIN, 'await recusaDoEscritorDeCenas2011(recuperadas.map((s) => s.voiceover))', 'null')
mutFio('cinematic sem estorno na recusa das cenas', CIN, "const released = refunded && await releaseBirthClaim('model_refused_topic')", 'const released = true')
mutFio('cinematic leva a descrição-recusa ao motor', CIN, '(d && !looksLikeModelRefusal(d) ? d : null) ?? scenes[i].aiPrompt', 'd ?? scenes[i].aiPrompt')
mutFio('escritor aceita a recusa na 2ª tentativa', 'app/api/generate-script/route.ts', 'if (roteiroDeNovo && !looksLikeModelRefusal(roteiroDeNovo)) historiaAceita = roteiroDeNovo', 'if (roteiroDeNovo) historiaAceita = roteiroDeNovo')
mutFio('expandir sem a guarda', 'app/api/expand-script/route.ts', 'if (!expandido || looksLikeModelRefusal(expandido)) {', 'if (!expandido) {')
mutFio('sugestão sem a guarda', 'app/api/apply-suggestion/route.ts', 'if (!improved || looksLikeModelRefusal(improved)) {', 'if (!improved) {')
mutFio('refazer cena sem a guarda', 'app/api/regenerate-scene/route.ts', ' && !looksLikeModelRefusal(gptBrollPrompt)', '')
mutFio('anúncio (avatar) sem a guarda', 'app/api/ad-script/route.ts', 'if (!script || looksLikeModelRefusal(script)) {', 'if (!script) {')
mutFio('Studio Ads sem a guarda na correção', 'app/api/ads/script/route.ts', '      versions = semRecusa2011(parseAdsScriptOutput(raw, model, brief.value))', '      versions = parseAdsScriptOutput(raw, model, brief.value)')
mutFio('desenho sem a guarda', 'app/api/kids-cartoon/story/route.ts', "if (looksLikeModelRefusal(texto)) texto = ''", '')
mutFio('podcast do bebê sem a guarda', 'app/api/baby-podcast/prepare/route.ts', "if (looksLikeModelRefusal(texto)) texto = ''", '')
mutFio('demo sem a guarda', 'app/api/demo-script/route.ts', 'if (script && looksLikeModelRefusal(script)) return', 'if (false) return')
for (const [nome, reprovou, nota] of mutantes) { if (reprovou) { ok++; console.log('  ✓ mutante reprova: ' + nome) } else { falhas.push('mutante passou: ' + nome); console.log('  ✗ mutante PASSOU: ' + nome + (nota ? ` (${nota})` : '')) } }

console.log(`\n${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
