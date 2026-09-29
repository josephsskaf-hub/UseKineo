// KINEO1-CLIPE-IA-PROMPT-2026-09-28 — guardião do prompt do clipe de IA do Kineo 1 (Seedance 1.5 t2v).
// Executa o builder REAL (lib/kineo1/aiClipPrompt.ts, módulo puro; lib/fastAiClips.ts e lib/fastAiHook.ts delegam)
// com falas reais dos 10 anúncios de 27/09 (docs/COWORK-10-ANUNCIOS-2026-09-27.md, DEFEITOS-KINEO1-10-ANUNCIOS-2026-09-28):
//   (1) o prompt nasce do SUJEITO/AÇÃO (descrição real > busca do plano > frase descritiva da fala), não da frase literal;
//   (2) marca, domínio (.com/.ng/.in, "dot n g"), URL e @handle saem do prompt (viram letra na tela);
//   (2b) REVISÃO 28/09 — a limpeza preserva o que é legítimo: "St. Louis"/"Mt."/"Dr." (abreviação de 2-3 letras não
//       fecha frase), NASA/CEO (caixa alta não é marca), "U.S."; "cold.In the morning" ganha o espaço ANTES da limpeza;
//       só TLDs conhecidos; eCredit.ng e "visit admitiy.com" seguem saindo;
//   (3) sufixo negativo firme e ÚNICO em todo prompt + pessoas sem rosto (lista ampliada) sem duplicar;
//   (4) seed determinística: estável para o mesmo (generationId, cena), muda com a cena; e a submissão manda `seed`
//       (o schema da fal do Seedance 1.5 Pro t2v tem `seed: integer | null` — conferido em 28/09).
//       REVISÃO 28/09 — seed do prompt SEM índice ganha um discriminador por chamada: a mesma fala em duas cenas do
//       mesmo filme (dois submits) = seeds diferentes; com o mesmo índice = estável.
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
    ['gancho: eCredit', H.buildHookPrompt(ECREDIT_2, 'eCredit.ng ad'), /ecredit|\.ng\b|\bdot\b/i],
    ['gancho: admitiy', H.buildHookPrompt(ADMITIY, 'admitiy'), /admitiy/i],
  ]
  for (const [nome, prompt, ruim] of casos) checa(`${nome}: prompt sem a marca/domínio → "${prompt.slice(0, 60)}…"`, !ruim.test(prompt) && prompt.length > 40)
  checa('a cena não fica vazia: a frase descritiva sobrevive à limpeza (eCredit → dados e recarga)', /data and airtime|mobile data/i.test(C.buildSceneClipPrompt(ECREDIT_2, ECREDIT_2, '')))
  checa('stripBrandsAndUrls: "Visit admitiy dot in." some inteiro (frase com < 2 palavras cai) e "See what … is building" fica', P.stripBrandsAndUrls(ADMITIY) === 'See what is building.')
  checa('extractBrandTokens acha ecredit, admitiy, smarttender, madlabs', ['ecredit', 'admitiy', 'smarttender', 'madlabs'].every((b) => P.extractBrandTokens([ECREDIT_1, ADMITIY_COM, SMART, MADLABS].join(' ')).includes(b)))
  checa('texto que GRITA (tudo em caixa alta) não perde todas as palavras', P.stripBrandsAndUrls('THE STORM HITS THE COAST AT NIGHT').length > 20)
  checa('sem marca nada muda: frase comum passa intacta', P.stripBrandsAndUrls('A storm rolls over the sea at dusk.') === 'A storm rolls over the sea at dusk.')
}

console.log('== (2b) revisão: abreviação, sigla e ponto colado ficam; domínio de verdade sai ==')
{
  const stLouis = 'The arch in St. Louis rises over the river at dusk.'
  checa('"St. Louis" preservado (antes: "St." caía como frase de 1 palavra e sobrava "Louis")', P.stripBrandsAndUrls(stLouis) === stLouis && /St\. Louis/.test(C.buildSceneClipPrompt(stLouis, '', '')))
  const mtDr = 'Mt. Fuji at dawn. Dr. Lee climbs the ridge alone.'
  checa('"Mt. Fuji" e "Dr. Lee" preservados', P.stripBrandsAndUrls(mtDr) === mtDr)
  const nasa = 'NASA engineers test the rocket at dawn.'
  checa('"NASA" preservado (caixa alta não é marca) — na função e no prompt da cena', P.stripBrandsAndUrls(nasa) === nasa && /\bNASA\b/.test(C.buildSceneClipPrompt(nasa, '', '')))
  checa('"CEO"/"FBI" preservados; extractBrandTokens não devolve sigla', P.stripBrandsAndUrls('The CEO meets the FBI at noon.') === 'The CEO meets the FBI at noon.' && P.extractBrandTokens('NASA engineers and the CEO').length === 0)
  checa('"RUIS" (título em caixa alta) fica pela mesma regra — o sufixo negativo é quem proíbe letra na tela', /\bRUIS\b/.test(C.buildSceneClipPrompt(RUIS, RUIS, '')) && conta(C.buildSceneClipPrompt(RUIS, RUIS, ''), NEG) === 1)
  checa('"U.S. Navy" preservado', /U\.S\. Navy/.test(P.stripBrandsAndUrls('U.S. Navy ships cross the bay at dawn.')))
  const ecredit = P.stripBrandsAndUrls('Buy data on eCredit.ng today.')
  checa('"eCredit.ng" removido (domínio com TLD conhecido + CamelCase)', !/ecredit|\.ng\b/i.test(ecredit) && ecredit.length > 0)
  const admitiy = P.stripBrandsAndUrls('A bright office at noon, visit admitiy.com for more.')
  checa('"visit admitiy.com" removido', !/admitiy|\.com\b/i.test(admitiy) && /bright office/.test(admitiy))
  checa('"cold.In the morning" vira "cold. In the morning" (não "the morning")', P.stripBrandsAndUrls('The desert is cold.In the morning the sand glows.') === 'The desert is cold. In the morning the sand glows.')
  checa('ponto colado não vira marca: "cold" segue no prompt', /\bcold\b/.test(C.buildSceneClipPrompt('The desert is cold.In the morning the sand glows.', '', '')))
  checa('TLD fora da lista conhecida não é domínio: "team.life" fica (antes sumia)', /team\.life/.test(P.stripBrandsAndUrls('They call it team.life and mean it.')))
  checa('a lista de TLDs é a conhecida (com, net, org, io, ai, app, co, ng, br, uk, de, fr, es, it, nl, in, us, me, tv, dev, xyz, info, biz, shop, store)', rd('lib/kineo1/aiClipPrompt.ts').includes("const TLD = 'com|net|org|io|ai|app|co|ng|br|uk|de|fr|es|it|nl|in|us|me|tv|dev|xyz|info|biz|shop|store'"))
  checa('a regra de CAIXA ALTA saiu do código (ALLCAPS_RE/isShouting não existem mais)', !/ALLCAPS_RE|isShouting/.test(rd('lib/kineo1/aiClipPrompt.ts')))
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
  const seedOk = (s) => Number.isInteger(s) && s > 0 && s < 2147483647
  // REVISÃO 28/09 — seed do prompt com discriminador por chamada.
  checa('seed(prompt, índice): estável para o mesmo par (mesma cena refeita → mesmo clipe)', P.aiClipSeedFromPrompt(p, 1) === P.aiClipSeedFromPrompt(p, 1) && seedOk(P.aiClipSeedFromPrompt(p, 1)))
  checa('seed(prompt, índice): muda com o índice (mesma fala em duas cenas do mesmo filme → clipes diferentes)', P.aiClipSeedFromPrompt(p, 1) !== P.aiClipSeedFromPrompt(p, 2) && P.aiClipSeedFromPrompt(p, 2) !== P.aiClipSeedFromPrompt(p, 3))
  checa('seed(prompt, índice): muda com o prompt', P.aiClipSeedFromPrompt(p, 1) !== P.aiClipSeedFromPrompt(p + ' x', 1))
  const semIndiceA = P.aiClipSeedFromPrompt(p), semIndiceB = P.aiClipSeedFromPrompt(p)
  checa('seed(prompt) SEM índice: duas chamadas com o mesmo prompt = seeds diferentes (contador por processo) e válidas', semIndiceA !== semIndiceB && seedOk(semIndiceA) && seedOk(semIndiceB))
  // A submissão REAL manda `seed` para a fal (schema conferido): espião no fal.queue.submit.
  const enviados = []
  const falSpy = { fal: { config() {}, queue: { submit: async (_m, { input }) => { enviados.push(input); return { request_id: 'r1' } } } } }
  const semAlerta = { looksExhausted: () => false, alertFalExhausted: async () => null }
  const Cs = roda(rd('lib/fastAiClips.ts'), { '@fal-ai/client': falSpy, './fastAiHook': {}, '@/lib/kineo1/aiClipPrompt': P, '@/lib/falAlert': semAlerta }, 'fastAiClips.ts', { FAL_KEY: 'k' })
  const Hs = roda(rd('lib/fastAiHook.ts'), { '@fal-ai/client': falSpy, '@supabase/supabase-js': { createClient: () => ({}) }, './clipVault': {}, '@/lib/kineo1/aiClipPrompt': P, '@/lib/falAlert': semAlerta }, 'fastAiHook.ts', { FAL_KEY: 'k' })
  await Cs.submitSceneClip(p) // cena 2 do filme
  await Cs.submitSceneClip(p) // cena 5 do mesmo filme, mesma fala ("Visit x.com" repetida na prosa)
  await Cs.submitSceneClip(p, 8, 4242)
  await Hs.submitAiHook(p)
  checa('submitSceneClip(prompt) manda seed inteira válida; e DUAS cenas com o mesmo prompt recebem seeds DIFERENTES', seedOk(enviados[0]?.seed) && seedOk(enviados[1]?.seed) && enviados[0].seed !== enviados[1].seed)
  checa('submitSceneClip(prompt, 8, 4242) manda a seed pedida e duration "8"', enviados[2]?.seed === 4242 && enviados[2]?.duration === '8')
  checa('o pedido de sempre segue igual (9:16, 720p, "5", sem áudio) — só ganhou a seed', enviados[0]?.aspect_ratio === '9:16' && enviados[0]?.resolution === '720p' && enviados[0]?.duration === '5' && enviados[0]?.generate_audio === false)
  checa('submitAiHook(prompt) também manda seed válida, diferente da cena com a mesma fala', seedOk(enviados[3]?.seed) && enviados[3].seed !== enviados[0].seed && enviados[3].seed !== enviados[1].seed)
  checa('a rota (trava 8.2) segue chamando com 1 argumento: submitSceneClip(clipPrompt) e submitAiHook(hookPrompt)', rd('app/api/generate-video-fast/route.ts').includes('await submitSceneClip(clipPrompt)') && rd('app/api/generate-video-fast/route.ts').includes('await submitAiHook(hookPrompt)'))
}

console.log('== (5) fonte única ==')
checa('fastAiClips e fastAiHook delegam ao módulo puro (sem lista própria de negativos)', rd('lib/fastAiClips.ts').includes("from '@/lib/kineo1/aiClipPrompt'") && rd('lib/fastAiHook.ts').includes("from '@/lib/kineo1/aiClipPrompt'") && !rd('lib/fastAiClips.ts').includes('no text, no captions') && !rd('lib/fastAiHook.ts').includes('no text, no captions'))
checa('o módulo puro não importa nada (roda no guardião por readFileSync)', !/^import /m.test(rd('lib/kineo1/aiClipPrompt.ts')))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
