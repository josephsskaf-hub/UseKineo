// KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 [revisor 14/11 12:21] — guardião sem rede. O caso: 1º vídeo de um cliente dos EUA
// (nota 5, não baixou) colou no Clipe, com foto, um roteiro de desenho 3D de 30 s em ÁRABE (três falas entre «», contagem,
// narração) e recebeu um clipe de 5 s. Prova, executando a função REAL (lib/clips/clipTextoLongo.ts):
//   (A) o roteiro árabe do caso e roteiros em russo, japonês, chinês, turco, hindi, coreano e árabe curto → filme;
//   (B) 36 pedidos curtos de clipe em 13 línguas (inclui "16:9", "1080x1920", letreiro entre aspas, 5 e 12 s) → clipe;
//   (C) decidirClipeNoStudio (Studio) segue a mesma régua;
//   (M) mutantes morrem: sem a regra das aspas, sem a duração em outra escrita, sem os algarismos arábico-índicos,
//       "16:9" aceito como duração, sem a medida de escrita sem espaço, sem a narração em outras línguas.
// Rodar: node scripts/test-clipe-roteiro-qualquer-lingua-1411.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = { longo: 'lib/clips/clipTextoLongo.ts', studio: 'lib/clips/clipNoStudio0311.ts' }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function load(over = {}) {
  const cache = {}
  const compile = (rel) => {
    if (cache[rel]) return cache[rel].exports
    const js = ts.transpileModule(over[rel] ?? read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const mod = { exports: {} }
    cache[rel] = mod
    new Function('require', 'module', 'exports', js)((s) => { if (s === './clipTextoLongo') return compile(F.longo); throw new Error('import inesperado ' + s) }, mod, mod.exports)
    return mod.exports
  }
  return { longo: compile(F.longo), studio: compile(F.studio) }
}

// O texto do caso (14/11 12:21), sem nome de cliente.
const CASO_ARABE = `أنشئ فيديو كرتوني ثلاثي الأبعاد مدته 30 ثانية، بنسبة 16:9، داخل مطعم بيتزا ملون، مع موسيقى حماسية ومؤثرات صوتية.

يبدأ المشهد برنين جرس طلبية عاجلة لطالبات الثامن (٣). يفتح الشيف صناديق المكونات ويكتشف أنها فارغة، ثم يقول بدهشة:

«يا بطلات الثامن (٣)! وصلتنا طلبية عاجلة، لكن مكونات البيتزا الخمسة اختفت! أمامكن خمسة تحديات رياضية، وكل إجابة صحيحة ستمنحكن مكونًا جديدًا لإكمال البيتزا!»

تظهر العجينة والجبن والبيبروني والفلفل والزيتون مع مؤثرات مشوقة.

يبتسم الشيف ويقول: «معلمتكن أشواق تنتظر إبداعاتكن! هل أنتن مستعدات؟»

يظهر عد تنازلي 3، 2، 1، ثم يعلن بحماس: «تحدي بيتزا الرياضيات يبدأ الآن!»

اجعل التعليق الصوتي باللغة العربية الفصحى، مع انتقالات سينمائية سريعة وشخصية شيف مرحة.`

// Roteiros de filme fora das 5 línguas do site. Cada um, curto, pega por UM sinal (para os mutantes morrerem).
export const FILMES = [
  ['ar · caso real 14/11', CASO_ARABE],
  ['ar · só duração em ٣٠', 'فيديو كرتوني مدته ٣٠ ثانية عن قطة في المطبخ'],
  ['ar · só falas «»', 'الطاهي يقول «مرحبا بكم في مطبخنا الصغير» والطفل يرد «أنا جائع جدا اليوم»'],
  ['ar · só narração', 'قصة قطة صغيرة في المدينة مع التعليق الصوتي بالعربية'],
  ['ru · только длительность', 'мультфильм на 30 секунд про кота и собаку'],
  ['ru · озвучка', 'ролик про кота с озвучкой на русском'],
  ['ja · 「」 duas falas', '猫が言う「ここは僕の家だよ」。犬が答える「いや、ここは僕の家だよ」'],
  ['ja · 60秒', '猫と犬の60秒のアニメを作って'],
  ['ja · texto longo sem espaço', '昔々、ある小さな村に一匹の猫が住んでいました' + 'その猫は毎朝早く起きて村の広場へ行き、子供たちと一緒に遊ぶのが大好きでした'.repeat(3)],
  ['zh · 旁白', '一只小猫的故事，加上中文旁白'],
  ['zh · 1分钟', '做一个1分钟的动画，讲小猫找妈妈'],
  ['ko · 30초 + 내레이션', '고양이 이야기 30초 애니메이션, 한국어 내레이션'],
  ['tr · 30 saniyelik', 'kedi ve köpek hakkında 30 saniyelik çizgi film'],
  ['tr · seslendirme', 'kedinin hikayesi, Türkçe seslendirme ile'],
  ['hi · 1 मिनट', 'बिल्ली और कुत्ते की 1 मिनट की कहानी'],
  ['hi · कथावाचक', 'एक बिल्ली की कहानी, हिंदी कथावाचक के साथ'],
  ['id · 45 detik', 'animasi kucing 45 detik dengan narasi'],
  ['vi · 20 giây', 'phim hoạt hình con mèo 20 giây'],
  ['th · 30 วินาที', 'การ์ตูนแมว 30 วินาที'],
]

export const CLIPES = [
  ['en · cat 5 seconds', 'a cat jumping, 5 seconds'],
  ['en · 16:9', 'slow zoom on a coffee cup, 16:9'],
  ['en · sign "OPEN"', 'neon sign that says "OPEN" in the rain'],
  ['en · two short labels', 'a cake with "Happy Birthday" and a card saying "Love you"'],
  ['en · 1080x1920', 'woman smiling at camera, 1080x1920, 12 s'],
  ['pt · 8 segundos', 'um cachorro correndo na praia, 8 segundos'],
  ['pt · 9:16', 'carro vermelho na chuva, 9:16'],
  ['es · 5 segundos', 'un perro saltando en el parque, 5 segundos'],
  ['es · atardecer', 'olas rompiendo en la playa al atardecer'],
  ['ar · 5 ثوان', 'قطة تقفز لمدة 5 ثوان'],
  ['ar · ٥ ثوانٍ', 'قطة تقفز لمدة ٥ ثوانٍ'],
  ['ar · 16:9', 'سيارة حمراء تسير تحت المطر، 16:9'],
  ['ar · 10 ثواني', 'رجل يبتسم للكاميرا، 10 ثواني'],
  ['ar · foto dos chefs', 'الطهاة الثلاثة يبتسمون ويلوحون للكاميرا'],
  ['ar · sem duração', 'طفل يلعب بالكرة في الحديقة'],
  ['hi · 5 सेकंड', 'समुद्र तट पर दौड़ता हुआ कुत्ता, 5 सेकंड'],
  ['hi · 16:9', 'बारिश में लाल कार, 16:9'],
  ['hi · बिल्ली', 'एक बिल्ली मेज पर कूदती है'],
  ['ru · 5 секунд', 'кошка прыгает на стол, 5 секунд'],
  ['ru · 16:9', 'красная машина под дождём, 16:9'],
  ['ru · 10 сек', 'девушка улыбается в камеру, 10 сек'],
  ['ja · 5秒', '猫がテーブルに飛び乗る、5秒'],
  ['ja · 16:9', '雨の中の赤い車、16:9'],
  ['ja · 「OPEN」', '看板に「OPEN」と書いてある'],
  ['ja · 3分の1', '画面の3分の1に猫が映る'],
  ['tr · 5 saniye', 'masaya zıplayan bir kedi, 5 saniye'],
  ['tr · 16:9', 'yağmurda kırmızı araba, 16:9'],
  ['tr · 10 saniye', 'kameraya gülümseyen kadın, 10 saniye'],
  ['zh · 5秒', '一只猫跳上桌子，5秒'],
  ['ko · 5초', '고양이가 테이블 위로 뛰어오른다, 5초'],
  ['id · 5 detik', 'kucing melompat ke meja, 5 detik'],
  ['vi · 5 giây', 'con mèo nhảy lên bàn, 5 giây'],
  ['th · 5 วินาที', 'แมวกระโดดขึ้นโต๊ะ 5 วินาที'],
  ['de · 5 Sekunden', 'eine Katze springt auf den Tisch, 5 Sekunden'],
  ['fr · 10 secondes', 'un chat saute sur la table, 10 secondes'],
  ['en · 2024 + 3 shots', 'Paris in 2024, 3 shots of the Eiffel tower at night'],
]

function checa(L) {
  const erros = []
  for (const [nome, t] of FILMES) if (L.longo.pareceRoteiroDeFilme(t) !== true) erros.push(`filme virou clipe: ${nome}`)
  for (const [nome, t] of CLIPES) if (L.longo.pareceRoteiroDeFilme(t) !== false) erros.push(`clipe virou filme: ${nome}`)
  if (L.studio.decidirClipeNoStudio(CASO_ARABE) !== 'filme') erros.push('Studio: caso árabe não vira filme')
  if (L.studio.decidirClipeNoStudio('قطة تقفز لمدة 5 ثوان') !== 'clipe') erros.push('Studio: clipe árabe curto não é clipe')
  return erros
}

console.log('(A/B/C) função real')
const base = checa(load())
for (const [nome] of FILMES) ok(!base.includes(`filme virou clipe: ${nome}`), `filme · ${nome}`)
for (const [nome] of CLIPES) ok(!base.includes(`clipe virou filme: ${nome}`), `clipe · ${nome}`)
ok(!base.some((e) => e.startsWith('Studio')), 'Studio decide igual (caso árabe → filme; clipe árabe → clipe)')
ok(FILMES.length >= 7 && CLIPES.length >= 30, `corpus: ${FILMES.length} filmes, ${CLIPES.length} clipes`)

console.log('(M) mutantes')
const longo = read(F.longo)
const mutantes = [
  ['sem a regra das aspas', longo.replace('if (falasEntreAspas(t) >= CLIP_FALAS_ENTRE_ASPAS) return true', '')],
  ['sem as palavras de segundo em árabe', longo.replace('ثاني[ةه]|ثانیه|ثوان[يى]?|', '')],
  ['sem os algarismos arábico-índicos', longo.replace("[٠-٩۰-۹०-९０-９]", '[０-９]')],
  ['"16:9" aceito como duração', longo.replace("const ANTES_DO_NUMERO = '(?<![\\\\d:.,x×/])'", "const ANTES_DO_NUMERO = '(?<![\\\\d])'").replace("${SEGUNDOS}[\\\\s-]*(?:", "${SEGUNDOS}[\\\\s-]*(?:|")],
  ['sem a medida de escrita sem espaço', longo.replace('return (t.match(IDEOGRAMA_RE) ?? []).length > CLIP_ROTEIRO_IDEOGRAMAS', 'return false')],
  ['sem a narração em outras línguas', longo.replace('if (PEDE_NARRACAO_RE.test(t)) return true', '')],
  ['falas sem mínimo de palavras', longo.replace('.length >= 3 ||', '.length >= 1 ||')],
  ['"3分の1" vira minuto', longo.replace("分(?!の)", '分')],
]
for (const [nome, src] of mutantes) {
  ok(src !== longo, `mutante "${nome}" aplicou`)
  let erros
  try { erros = checa(load({ [F.longo]: src })) } catch (e) { erros = [String(e)] }
  ok(erros.length > 0, `mutante "${nome}" fica vermelho (${erros.length}: ${erros[0] ?? ''})`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
