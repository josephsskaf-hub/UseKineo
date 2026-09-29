// KINEO1-CLIPE-IA-PROMPT-2026-09-28 — guardião do prompt do clipe de IA do Kineo 1 (Seedance 1.5 t2v).
// Executa o builder REAL (lib/kineo1/aiClipPrompt.ts, módulo puro; lib/fastAiClips.ts e lib/fastAiHook.ts delegam)
// com falas reais dos 10 anúncios de 27/09 (docs/COWORK-10-ANUNCIOS-2026-09-27.md, DEFEITOS-KINEO1-10-ANUNCIOS-2026-09-28):
//   (1) o prompt nasce do SUJEITO/AÇÃO (descrição real > busca do plano > frase descritiva da fala), não da frase literal;
//   (2) marca, domínio (.com/.ng/.in, "dot n g"), URL e @handle saem do prompt (viram letra na tela);
//   (3) sufixo negativo firme e ÚNICO em todo prompt + pessoas sem rosto (lista ampliada) sem duplicar;
//   (4) seed determinística: estável para o mesmo (generationId, cena), muda com a cena; e a submissão manda `seed`
//       (o schema da fal do Seedance 1.5 Pro t2v tem `seed: integer | null` — conferido em 28/09).
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
function roda(src, requireMap = {}, file = 'x.ts', env = {}) {
  const exports = {}
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: (m) => requireMap[m] ?? {}, process: { env }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Object, RegExp, String, Promise, setTimeout, clearTimeout }, { filename: file })
  return exports
}

const P = roda(rd('lib/kineo1/aiClipPrompt.ts'), {}, 'aiClipPrompt.ts')
const C = roda(rd('lib/fastAiClips.ts'), { '@fal-ai/client': { fal: {} }, './fastAiHook': {}, '@/lib/kineo1/aiClipPrompt': P }, 'fastAiClips.ts')
const H = roda(rd('lib/fastAiHook.ts'), { '@fal-ai/client': { fal: {} }, '@supabase/supabase-js': { createClient: () => ({}) }, './clipVault': {}, '@/lib/kineo1/aiClipPrompt': P }, 'fastAiHook.ts')
const NEG = P.AI_CLIP_NEGATIVE_SUFFIX
const conta = (s, sub) => s.split(sub).length - 1

// ── Falas reais (verbatim: description === voiceover, como a rota monta a prosa do "Use my script as is") ──
const ECREDIT_1 = 'eCredit.ng is a Nigerian digital platform that makes buying mobile data and airtime simple, fast and convenient.'
const ECREDIT_2 = 'Stay connected with eCredit.ng. Buy your data and airtime online today, at eCredit dot n g.'
const ADMITIY = 'See what ADMITIY is building. Visit admitiy dot in.'
const ADMITIY_COM = 'Your next step starts here. Visit admitiy.com and see the team at work.'
const SMART = 'SmartTender AI, built by Unnati, reads every tender document and delivers a precise evaluation to the team.'
const MADLABS = 'MadLabs turns your idea into a working app in weeks. Follow @madlabs.io for updates or visit https://madlabs.io/start'
const RUIS = 'RUIS is een boek over Nadia. Zij werkt in een controlekamer in de nacht.'

console.log('== (1) sujeito/ação, não a palavra literal ==')
{
  const p = C.buildSceneClipPrompt(ECREDIT_1, ECREDIT_1, 'ecredit mobile data')
  checa('fala verbatim + busca com marca: a base é a frase descritiva da fala sem a marca (plataforma de dados/recarga)', /digital platform/i.test(p) && /mobile data/i.test(p) && !/ecredit/i.test(p))
  const q = C.buildSceneClipPrompt(ECREDIT_2, ECREDIT_2, 'smartphone topping up mobile data at night')
  checa('fala verbatim + busca boa do plano: a base é a busca (sujeito/ação em inglês), não a fala', q.startsWith('smartphone topping up mobile data at night,') && !/stay connected/i.test(q))
  const r = C.buildSceneClipPrompt(ECREDIT_2, ECREDIT_2, 'Stay connected with')
  checa('busca de reserva (4 primeiras palavras da fala) é lixo: cai para a frase descritiva, sem a chamada para ação', !/^stay connected/i.test(r) && /data and airtime/i.test(r))
  const d = C.buildSceneClipPrompt('a cracked desert floor under heat haze', 'Death Valley is one of the hottest places on Earth.', 'death valley heat')
  checa('descrição real (≠ fala) continua sendo a base', d.startsWith('a cracked desert floor under heat haze,'))
  checa('tela/app na cena ganha a instrução de tela de lado e fora de foco', /screen shown at an angle/.test(C.buildSceneClipPrompt('', 'Open the app on your phone and tap once.', 'phone app tap')) && !/screen shown at an angle/.test(d))
}

console.log('== (2) marca, domínio, URL e @handle fora do prompt ==')
{
  const casos = [
    ['eCredit.ng (1ª frase)', C.buildSceneClipPrompt(ECREDIT_1, ECREDIT_1, ''), /ecredit|\.ng\b/i],
    ['eCredit dot n g', C.buildSceneClipPrompt(ECREDIT_2, ECREDIT_2, ''), /ecredit|\.ng\b|\bdot\b|\bn g\b/i],
    ['Visit admitiy dot in', C.buildSceneClipPrompt(ADMITIY, ADMITIY, 'startup office'), /admitiy|\bdot\b/i],
    ['Visit admitiy.com', C.buildSceneClipPrompt(ADMITIY_COM, ADMITIY_COM, ''), /admitiy|\.com\b/i],
    ['SmartTender / Unnati (CamelCase)', C.buildSceneClipPrompt(SMART, SMART, ''), /smarttender|smart tender/i],
    ['MadLabs + @handle + URL', C.buildSceneClipPrompt(MADLABS, MADLABS, ''), /madlabs|@|https?:|\.io\b/i],
    ['RUIS (caixa alta, NL)', C.buildSceneClipPrompt(RUIS, RUIS, ''), /\bRUIS\b/],
    ['gancho: eCredit', H.buildHookPrompt(ECREDIT_2, 'eCredit.ng ad'), /ecredit|\.ng\b|\bdot\b/i],
    ['gancho: admitiy', H.buildHookPrompt(ADMITIY, 'admitiy'), /admitiy/i],
  ]
  for (const [nome, prompt, ruim] of casos) checa(`${nome}: prompt sem a marca/domínio → "${prompt.slice(0, 60)}…"`, !ruim.test(prompt) && prompt.length > 40)
  checa('a cena não fica vazia: a frase descritiva sobrevive à limpeza (eCredit → dados e recarga)', /data and airtime|mobile data/i.test(C.buildSceneClipPrompt(ECREDIT_2, ECREDIT_2, '')))
  checa('stripBrandsAndUrls: "Visit admitiy dot in." some inteiro (frase com < 2 palavras cai) e "See what … is building" fica', P.stripBrandsAndUrls(ADMITIY) === 'See what is building.')
  checa('extractBrandTokens acha ecredit, admitiy, smarttender, madlabs, ruis', ['ecredit', 'admitiy', 'smarttender', 'madlabs', 'ruis'].every((b) => P.extractBrandTokens([ECREDIT_1, ADMITIY_COM, SMART, MADLABS, RUIS].join(' ')).includes(b)))
  checa('texto que GRITA (tudo em caixa alta) não perde todas as palavras', P.stripBrandsAndUrls('THE STORM HITS THE COAST AT NIGHT').length > 20)
  checa('sem marca nada muda: frase comum passa intacta', P.stripBrandsAndUrls('A storm rolls over the sea at dusk.') === 'A storm rolls over the sea at dusk.')
}

console.log('== (3) sufixo negativo único + pessoas sem rosto ==')
{
  const todos = [
    C.buildSceneClipPrompt(ECREDIT_1, ECREDIT_1, ''), C.buildSceneClipPrompt(SMART, SMART, 'tender evaluation'), C.buildSceneClipPrompt('bar interior', '', ''),
    C.buildSceneClipPrompt('', 'fala', 'query'), H.buildHookPrompt('a storm over the sea', 'storm'), H.buildHookPrompt('', 'eCredit.ng ad'),
    C.buildSceneClipPrompt('a friendly mailman climbs the paper stairs', 'Le facteur monte', 'mailman', { look: 'animated3d', lookPhrase: '3D animated, Pixar style', suffix: ', vibrant colors' }),
    H.buildHookPrompt('a cute character in a cardboard house', 'topic', { look: 'anime', lookPhrase: 'anime style', suffix: ', cel shaded' }),
  ]
  checa('TODO prompt (cena, gancho, fotorreal e desenhado) contém o sufixo negativo exatamente UMA vez', todos.every((p) => conta(p, NEG) === 1))
  checa('o sufixo é o firme: text, letters, logos, brand names, signs, subtitles, watermarks', /no readable text, no letters, no logos, no brand names, no signs, no subtitles, no watermarks/.test(NEG))
  checa('fotorreal: "no recognizable human faces" UMA vez (não duplica com o sufixo); desenhado: sem essa regra (personagem inteiro)', todos.slice(0, 6).every((p) => conta(p, 'no recognizable human faces') === 1) && todos.slice(6).every((p) => conta(p, 'no recognizable human faces') === 0 && p.includes("no real person's likeness")))
  const pessoas = C.buildSceneClipPrompt('the father, his wife and their daughter greet the students and the team of evaluators', '', '')
  checa('father/wife/daughter/students/team/evaluators viram silhueta distante (a lista antiga só cobria man|woman|person…)', !/\b(father|wife|daughter|students|team|evaluators)\b/i.test(pessoas) && /distant silhouetted figure/.test(pessoas))
  checa('âncoras dos guardiões antigos seguem: "girl" vira silhueta; "slow camera movement"; ", photorealistic, dramatic lighting"', /distant silhouetted figure/.test(C.buildSceneClipPrompt('a little girl with a rabbit', '', '')) && /slow camera movement/.test(C.buildSceneClipPrompt('bar interior', '', '')) && /, photorealistic, dramatic lighting/.test(C.buildSceneClipPrompt('bar interior', '', '')))
  checa('nada cai vazio: fala só com marca vira o sujeito de reserva, ainda com o sufixo', C.buildSceneClipPrompt('ADMITIY.', 'ADMITIY.', '').startsWith(P.AI_CLIP_FALLBACK_SUBJECT))
}

console.log('== (4) seed determinística ==')
{
  const g = '4375f641-164e-4f66-936b-8bf5fd95e915'
  const s1 = P.aiClipSeed(g, 1), s1b = P.aiClipSeed(g, 1), s2 = P.aiClipSeed(g, 2), s3 = P.aiClipSeed(g, 3)
  checa('seed(gen, i) é estável (mesma entrada → mesmo número)', s1 === s1b && Number.isInteger(s1) && s1 > 0 && s1 < 2147483647)
  checa('seed muda com a cena (1 ≠ 2 ≠ 3) e com o generationId', new Set([s1, s2, s3]).size === 3 && P.aiClipSeed('8c13ccf5-d122-435a-b50a-b7ec52e63e8b', 1) !== s1)
  checa('FNV-1a é o da casa (mesmo algoritmo de lib/returningSeed.ts): fnv1a("") = 0x811c9dc5, fnv1a("a") = 0xe40c292c', P.fnv1a('') === 0x811c9dc5 && P.fnv1a('a') === 0xe40c292c)
  const p = C.buildSceneClipPrompt(ECREDIT_1, ECREDIT_1, '')
  checa('seed do prompt (quem submete sem generationId): estável e diferente entre prompts', P.aiClipSeedFromPrompt(p) === P.aiClipSeedFromPrompt(p) && P.aiClipSeedFromPrompt(p) !== P.aiClipSeedFromPrompt(p + ' x'))
  // A submissão REAL manda `seed` para a fal (schema conferido): espião no fal.queue.submit.
  const enviados = []
  const falSpy = { fal: { config() {}, queue: { submit: async (_m, { input }) => { enviados.push(input); return { request_id: 'r1' } } } } }
  const semAlerta = { looksExhausted: () => false, alertFalExhausted: async () => null }
  const Cs = roda(rd('lib/fastAiClips.ts'), { '@fal-ai/client': falSpy, './fastAiHook': {}, '@/lib/kineo1/aiClipPrompt': P, '@/lib/falAlert': semAlerta }, 'fastAiClips.ts', { FAL_KEY: 'k' })
  const Hs = roda(rd('lib/fastAiHook.ts'), { '@fal-ai/client': falSpy, '@supabase/supabase-js': { createClient: () => ({}) }, './clipVault': {}, '@/lib/kineo1/aiClipPrompt': P, '@/lib/falAlert': semAlerta }, 'fastAiHook.ts', { FAL_KEY: 'k' })
  await Cs.submitSceneClip(p)
  await Cs.submitSceneClip(p, 8, 4242)
  await Hs.submitAiHook(p)
  checa('submitSceneClip(prompt) manda seed = seed do prompt; (prompt, 8, 4242) manda a seed pedida e duration "8"', enviados[0]?.seed === P.aiClipSeedFromPrompt(p) && enviados[1]?.seed === 4242 && enviados[1]?.duration === '8')
  checa('o pedido de sempre segue igual (9:16, 720p, "5", sem áudio) — só ganhou a seed', enviados[0]?.aspect_ratio === '9:16' && enviados[0]?.resolution === '720p' && enviados[0]?.duration === '5' && enviados[0]?.generate_audio === false)
  checa('submitAiHook(prompt) também manda a seed do prompt', enviados[2]?.seed === P.aiClipSeedFromPrompt(p))
  checa('a rota (trava 8.2) segue chamando com 1 argumento: submitSceneClip(clipPrompt) e submitAiHook(hookPrompt)', rd('app/api/generate-video-fast/route.ts').includes('await submitSceneClip(clipPrompt)') && rd('app/api/generate-video-fast/route.ts').includes('await submitAiHook(hookPrompt)'))
}

console.log('== (5) fonte única ==')
checa('fastAiClips e fastAiHook delegam ao módulo puro (sem lista própria de negativos)', rd('lib/fastAiClips.ts').includes("from '@/lib/kineo1/aiClipPrompt'") && rd('lib/fastAiHook.ts').includes("from '@/lib/kineo1/aiClipPrompt'") && !rd('lib/fastAiClips.ts').includes('no text, no captions') && !rd('lib/fastAiHook.ts').includes('no text, no captions'))
checa('o módulo puro não importa nada (roda no guardião por readFileSync)', !/^import /m.test(rd('lib/kineo1/aiClipPrompt.ts')))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
