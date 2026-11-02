// KINEO-PREVIA-LINGUA-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião da língua do roteiro
// da prévia das cenas. Caso de 02/11: jstarshahzad43 (Paquistão, sem filme grátis → prévia) escreveu 72 palavras em URDU; a
// tela forçava 'en' (só pt/es passavam) e a rota mandava ao escritor "Write everything in US English" + "translate nothing"
// → o gpt-4o recusou duas vezes → "the AI declined the topic". Prova, EXECUTANDO lib/scenePreviewLanguage.ts (sem rede,
// sem banco, sem fal, sem OpenAI):
//   (1) urdu, hindi, árabe (e coreano, japonês, chinês, russo, ucraniano, búlgaro, grego, hebraico, tailandês, bengali)
//       chegam ao escritor na própria língua, mesmo com a interface em inglês — e a instrução não é "US English";
//   (1b) KINEO-PREVIA-LINGUA-0211b (revisão): escrita ambígua não chuta — persa, curdo sorani e sérvio caem na língua mais
//       comum da escrita (nunca urdu para sorani); palavra estrangeira solta e nome de lugar latino não mudam a língua;
//   (2) en/pt/es saem como antes (texto latino = resolveNarrationLanguage(dica, texto), a mesma regra de sempre);
//   (3) a rota passa a língua do texto ao /api/generate-script; a tela segue mandando en/pt/es como dica;
//   (4) mutantes: a fórmula antiga (dica da interface direto) volta a dar o choque inglês+"translate nothing".
// Em origin/main: vermelho (lib ausente, rota manda a língua da interface, tela força 'en').
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n') } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const cache = new Map()
function load(rel) {
  if (cache.has(rel)) return cache.get(rel)
  const src = read(rel)
  if (src == null) return null
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  cache.set(rel, mod.exports)
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => {
    if (!p.startsWith('@/lib/')) throw new Error('import inesperado: ' + p)
    const dep = load(p.replace('@/', '') + '.ts')
    if (!dep) throw new Error('import ausente: ' + p)
    return dep
  })
  cache.set(rel, mod.exports)
  return mod.exports
}

const L = load('lib/scenePreviewLanguage.ts')
const T = load('lib/textLanguage.ts')
const ROUTE = read('app/api/scene-preview/route.ts') ?? ''
const CLIENT = read('app/(dashboard)/studio/previa/ScenePreviewClient.tsx') ?? ''
const WRITER = read('app/api/generate-script/route.ts') ?? ''
const PASTED = read('lib/pastedScript.ts') ?? ''

// A instrução de língua do escritor (/api/generate-script buildSystemPrompt), lida do próprio arquivo.
const EN_RULE = 'LANGUAGE: Write everything in US English.'
ok(WRITER.includes("language === 'en'\n      ? `" + EN_RULE + '`') && WRITER.includes('Write all voiceover sentences in ${LANGUAGE_NAMES[language]}'), 'escritor: "en" = "Write everything in US English"; outra língua = narração nessa língua')
ok(/translate nothing/.test(PASTED), 'PASTED_SCRIPT_RULE ainda diz "translate nothing" (o choque existe se a língua vier errada)')
const writerRule = (lang) => (lang === 'en' ? EN_RULE : `LANGUAGE: Write all voiceover sentences in ${T.LANGUAGE_NAMES[lang]}.`)

// Textos reais (prosa longa em urdu, ≥ 72 palavras como a do caso; os demais com 10+ palavras).
const URDU = 'پاکستان کے شمالی پہاڑوں میں ایک چھوٹا سا گاؤں ہے جہاں سردیوں میں برف اتنی گرتی ہے کہ لوگ مہینوں تک گھروں سے باہر نہیں نکل سکتے۔ ' +
  'ایک دن ایک بوڑھے چرواہے نے برف کے نیچے ایک پرانا دروازہ دیکھا۔ اس نے دروازہ کھولا تو اندر ایک لمبی سرنگ تھی جو پہاڑ کے دل تک جاتی تھی۔ ' +
  'سرنگ کی دیواروں پر ہزاروں سال پرانی تصویریں بنی ہوئی تھیں۔ گاؤں والوں کا کہنا ہے کہ یہ سرنگ ایک گمشدہ بادشاہ کا خزانہ چھپانے کے لیے بنائی گئی تھی۔ آج تک کوئی اس کے آخری سرے تک نہیں پہنچ سکا۔'
const HINDI = 'एक छोटे से गाँव में एक लड़का रहता था जो हर रात आसमान में तारों को गिनता था। एक रात उसने एक ऐसा तारा देखा जो हिल रहा था।'
const ARABIC = 'في قديم الزمان كانت هناك مدينة عظيمة في وسط الصحراء، اختفت فجأة في ليلة واحدة ولم يجد أحد أي أثر لسكانها حتى اليوم.'
const OTHERS = {
  ko: '옛날 옛적에 바다 깊은 곳에 사람들이 한 번도 본 적 없는 거대한 도시가 있었습니다. 그 도시는 하룻밤 사이에 사라졌습니다.',
  ja: '昔々、深い海の底に誰も見たことのない巨大な都市がありました。その都市はある夜、突然消えてしまいました。',
  zh: '很久以前，在大海深处有一座从来没有人见过的巨大城市。有一天晚上，这座城市突然消失了，至今没有人知道原因。',
  ru: 'Давным-давно в глубине океана был огромный город, который никто никогда не видел. Однажды ночью он исчез навсегда.',
  el: 'Μια φορά κι έναν καιρό υπήρχε μια τεράστια πόλη στον βυθό της θάλασσας που κανείς δεν είχε δει ποτέ.',
  he: 'פעם, לפני הרבה שנים, הייתה עיר ענקית בעומק הים שאף אחד לא ראה מעולם. לילה אחד היא נעלמה.',
  th: 'กาลครั้งหนึ่งนานมาแล้ว มีเมืองขนาดใหญ่อยู่ใต้ทะเลลึกที่ไม่มีใครเคยเห็นมาก่อน คืนหนึ่งเมืองนั้นก็หายไป',
  bn: 'অনেক দিন আগে সমুদ্রের গভীরে একটি বিশাল শহর ছিল যা কেউ কখনো দেখেনি। এক রাতে শহরটি হারিয়ে গেল।',
  uk: 'Колись давно в глибині океану було величезне місто, яке ніхто ніколи не бачив. Одного разу вночі воно зникло.',
  bg: 'Някога в дълбините на океана имало огромен град, който никой не е виждал. Една нощ той изчезнал завинаги.',
}

console.log('1 — línguas fora de en/pt/es chegam ao escritor na própria língua (interface em inglês)')
const pnl = L && typeof L.previaNarrationLanguage === 'function' ? L.previaNarrationLanguage : null
ok(!!pnl, 'lib/scenePreviewLanguage.ts exporta previaNarrationLanguage')
const lang = (hint, text) => (pnl ? pnl(hint, text) : hint)
const urduWords = URDU.split(/\s+/).filter(Boolean).length
ok(urduWords >= 72, `o texto de prova é colado longo como o do caso (≥ 72 palavras: ${urduWords})`)
for (const [code, text, hint] of [['ur', URDU, 'en'], ['ur', URDU, undefined], ['hi', HINDI, 'en'], ['ar', ARABIC, 'en'], ['ur', URDU, 'ur']]) {
  const got = lang(hint, text)
  ok(got === code, `${code} com dica ${hint ?? '(nenhuma)'} → ${got}`)
  ok(writerRule(got) !== EN_RULE && writerRule(got).includes(T.LANGUAGE_NAMES[code]), `${code}: o escritor NÃO recebe "US English" + "translate nothing" (recebe ${T.LANGUAGE_NAMES[code]})`)
}
for (const [code, text] of Object.entries(OTHERS)) ok(lang('en', text) === code, `${code} com interface em inglês → ${lang('en', text)} (fórmula, não remendo por língua)`)

console.log('1b — revisão 0211b: escrita ambígua e palavra solta')
const PERSA = 'روزی روزگاری در اعماق دریا شهر بزرگی بود که هیچ کس آن را ندیده بود. یک شب این شهر ناگهان گم شد و پیدا نشد.'
const SORANI = 'ڕۆژێک لە ڕۆژان شارێکی گەورە لە ناو دەریادا هەبوو کە هیچ کەس نەیبینیبوو. شەوێک ئەو شارە ون بوو.'
const SERVIO = 'Једном давно у дубини океана постојао је огроман град који нико никада није видео. Једне ноћи је нестао.'
for (const [label, text, want] of [
  ['"Los Angeles wildfires" (en)', 'Los Angeles wildfires', 'en'],
  ['"Nova Scotia Oak Island mystery" (en)', 'Nova Scotia Oak Island mystery', 'en'],
  ['"Yang Liwei first astronaut" (en)', 'Yang Liwei first astronaut', 'en'],
  ['"story of दीवाली" (palavra solta não domina)', 'story of दीवाली', 'en'],
  ['"the Kremlin (Кремль) secrets" (palavra solta)', 'the secrets of the Kremlin (Кремль) and its towers', 'en'],
  ['persa (fa fora do catálogo) → língua mais comum da escrita, nunca urdu', PERSA, 'ar'],
  ['curdo sorani → nunca urdu', SORANI, 'ar'],
  ['sérvio cirílico (fora do catálogo) → língua mais comum da escrita, nunca bg/uk por engano', SERVIO, 'ru'],
]) ok(lang('en', text) === want, `${label} → ${lang('en', text)}`)
ok(lang('en', SORANI) !== 'ur' && lang('ur', SORANI) === 'ur', 'sorani: sem marca segura vale a dica se ela for da escrita (ur), senão a mais comum (ar) — nunca urdu por chute')
ok(lang('bg', SERVIO) === 'bg' && lang('pt', SERVIO) === 'ru', 'cirílico ambíguo: dica da mesma escrita vence; dica de outra escrita não')
ok(lang('pt', 'Los Angeles wildfires') === 'pt' && lang('es', 'Nova Scotia Oak Island mystery') === 'es', 'ideia latina curta: a dica pt/es vence, como antes')

console.log('2 — en/pt/es como antes')
const EN = 'The mystery of the lost city of Atlantis and why scientists still search for it today'
const PT = 'O mistério da cidade perdida de Atlântida e por que os cientistas ainda procuram por ela hoje'
const ES = 'El misterio de la ciudad perdida de la Atlántida y por qué los científicos todavía la buscan hoy'
ok(lang('en', EN) === 'en', 'inglês + interface inglesa → en')
ok(lang('pt', PT) === 'pt', 'português + interface portuguesa → pt')
ok(lang('es', ES) === 'es', 'espanhol + interface espanhola → es')
ok(lang('en', PT) === 'pt' && lang('en', ES) === T.resolveNarrationLanguage('en', ES).language, 'português/espanhol com interface inglesa → a mesma regra de resolveNarrationLanguage (detector de sempre)')
ok(lang('pt', 'Messi contra Ronaldo') === 'pt' && lang('es', 'Messi contra Ronaldo') === 'es' && lang('en', 'Messi vs Ronaldo') === 'en', 'ideia curta sem marca de língua → segue a interface (como antes)')
ok(lang(undefined, 'Messi vs Ronaldo') === 'en' && lang('xx', 'Messi vs Ronaldo') === 'en', 'sem dica válida → en')
const latinos = [EN, PT, ES, 'Los Angeles wildfires', 'Yang Liwei first astronaut', 'Nova Scotia Oak Island mystery', 'Bir zamanlar okyanusun derinliklerinde dev bir şehir vardı ve kayboldu bir gece']
ok(latinos.every((t) => ['en', 'pt', 'es', undefined].every((h) => lang(h, t) === T.resolveNarrationLanguage(h, t).language)), 'texto latino = EXATAMENTE resolveNarrationLanguage(dica, texto) (nenhum detector novo)')
ok(!/from '@\/lib\/shortTextLanguage'/.test(read('lib/scenePreviewLanguage.ts') ?? ''), 'a prévia não usa o detector de frase curta (nome de lugar virava língua)')

console.log('3 — rota e tela')
ok(/const narration = previaNarrationLanguage\(body\?\.language, idea\)/.test(ROUTE), 'a rota resolve a língua pelo próprio texto')
ok(ROUTE.includes("body: JSON.stringify({ topic: idea, language: narration, engine: PREVIA_ENGINE_QUALITY"), 'o /api/generate-script recebe a língua do texto, não a da interface')
ok(!/JSON\.stringify\(\{ topic: idea, language,/.test(ROUTE), 'nenhuma chamada ao escritor com a língua da interface')
ok(/return refuse\(user\.id, 'not_eligible', language\)/.test(ROUTE), 'recusas seguem na língua da interface')
ok(/NextResponse\.json\(\{ script, scenes: shown, left, language: narration \}/.test(ROUTE), 'a resposta devolve a língua do roteiro (a volta ao Studio usa)')
ok(/scriptLanguage = language === 'pt' \|\| language === 'es' \? language : 'en'/.test(CLIENT), 'a tela segue mandando en/pt/es como dica (texto latino como antes)')
ok(/language: typeof j\.language === 'string' \? j\.language : scriptLanguage/.test(CLIENT), 'a tela guarda a língua que o servidor usou')

console.log('4 — mutantes')
const antiga = (hint) => (typeof hint === 'string' && /^[a-z]{2}$/.test(hint) ? hint : 'en')
ok(writerRule(antiga('en')) === EN_RULE, 'mutante "dica direto" (origin/main) → urdu recebe "US English" + "translate nothing"')
const soResolve = (hint, text) => T.resolveNarrationLanguage(hint, text).language
ok(soResolve('en', URDU) === 'en', 'mutante "só resolveNarrationLanguage" → urdu ainda vira en (o detector de 6 línguas não lê árabe/urdu)')
ok(!!L && L.dominantScript('Atlantis was a city') === null && L.dominantScript('story of दीवाली') === null && L.dominantScript(URDU)?.name === 'arabic' && L.dominantScript(HINDI)?.name === 'devanagari', 'escrita dominante = mais da metade das letras: latino/palavra solta → null; urdu → árabe; hindi → devanágari')

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
