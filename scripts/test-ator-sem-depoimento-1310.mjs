// KINEO-ATOR-FTC-2026-10-13 — guardião do conserto legal do ATOR do Studio Ads (fundador 13/10, "tudo sim").
// Roda com `node scripts/test-ator-sem-depoimento-1310.mjs`, sem rede, sem banco, sem alias '@/' no próprio guardião (as libs
// são transpiladas pelo carregador offline da casa, com uma OpenAI falsa).
//
// O que ele prova, EXECUTANDO o código real:
//   1. FTC — a pessoa de IA não é cliente. Os casos REAIS ("Okay, I have to tell you about this LUME", "I've been using it
//      for a week", "my skin has never looked better") e o resto da lista do fundador ("I bought", "I use", "I tried",
//      "changed my life", "I love it", "I recommend", "honestly I") são MARCADOS pela régua e CONSERTADOS para voz de
//      apresentador ("Meet LUME…"); a fala de apresentador ("Meet…", "This is…", "Here's why…", "I'll show you") passa;
//      falso positivo comum ("Use it every morning", "¡Compre ya!", "lume.io", marca "I Love Sushi") não dispara.
//   2. O PEDIDO ao modelo com ator deixou de mandar 1ª pessoa/UGC e manda apresentador; SEM ator (narrador de marca) o pedido
//      é byte a byte o da base de242d88 e a régua não muda nada (a fala passa intacta).
//   3. A extração executada: com ator, depoimento → 1 correção com o motivo → ainda depoimento → conserto em código; NUNCA 502
//      por isso (no limite sobra a marca). Sem ator, a mesma resposta passa intacta.
//   4. RÓTULO DE IA na entrega: 16 línguas, fallback inglês, nas 3 telas de resultado (simples, completo, variações), sem
//      tocar a montagem (adV2Montage.ts byte a byte o da base).
//   5. Mutantes: cada peça quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, de, para) => {
  if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70))
  const out = src.split(de).join(para)
  if (out === src) throw new Error('mutante não aplicou: ' + de.slice(0, 70))
  return out
}

const BASE = 'de242d88'
const atBase = (rel) => execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).replace(/\r\n/g, '\n')
const F = {
  honesty: 'lib/ads/v2Honesty.ts',
  brief: 'lib/ads/v2Brief.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  label: 'lib/ads/v2AiLabel.ts',
  montage: 'lib/ads/adV2Montage.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  full: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  variations: 'app/(dashboard)/ads/v2/AdsV2Variations.tsx',
  simpleLib: 'lib/ads/v2Simple.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, read(v)]))

const openaiFalsa = (respostas = []) => {
  const log = []
  return {
    log,
    openai: { chat: { completions: { create: async (params) => { log.push(structuredClone(params)); const r = respostas.shift(); return { choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r ?? {}) } }] } } } } },
  }
}
const world = (over = {}, oa = openaiFalsa()) => createOfflineLoader({
  mocks: { '@/lib/openai': { openai: oa.openai } },
  source: (rel, text) => (Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : text),
})
const base = world()
const H = base(F.honesty)
const BR = base(F.brief)
const SL = base(F.shots)
const L = base(F.label)

// ═══ 1. A RÉGUA: depoimento em 1ª pessoa com o ator ══════════════════════════════════════════════════════════════════
const REAIS = ['Okay, I have to tell you about this LUME', "I've been using it for a week", 'my skin has never looked better']
const LISTA = ['I bought it last month.', 'I use it every day.', 'I tried it and wow.', 'It changed my life.', 'I love it.', 'I recommend it to everyone.', 'Honestly I can not go back.', 'Trust me, it works.', 'Before and after one bottle.',
  'Comprei e amei.', 'Minha pele nunca esteve tão bonita.', 'Me encanta este perfume.', 'Lo compré ayer.', 'Ich liebe diesen Duft.', 'Je l’adore.', 'Я пользуюсь им каждый день.']
const APRESENTADOR = ['Meet LUME eau de parfum.', 'This is LUME — a light floral scent that lasts all day.', "Here's why it lasts all day.", "I'll show you why it lasts all day.", 'Use it every morning.', '¡Compre ya!', 'Find it at lume.io today.', 'Conheça o LUME, um perfume floral leve.', 'Conoce LUME, un perfume floral.']
ok(REAIS.every((t) => H.testimonialMarks(t, 'LUME').length > 0), '1a os 3 casos reais ("Okay, I have to tell you about this LUME", "I\'ve been using it for a week", "my skin has never looked better") são marcados como depoimento')
ok(LISTA.every((t) => H.testimonialMarks(t, 'LUME').length > 0), '1b a lista do fundador (I bought/I use/I tried/changed my life/I love/I recommend/honestly I/trust me/before and after) + pt/es/de/fr/ru é marcada')
ok(APRESENTADOR.every((t) => H.testimonialMarks(t, 'LUME').length === 0), '1c voz de apresentador passa ("Meet…", "This is…", "Here\'s why…", "I\'ll show you…"), sem falso positivo em "Use it", "¡Compre ya!", "lume.io", "Conheça", "Conoce"')
ok(H.testimonialMarks('Welcome to I Love Sushi, fresh rolls every day.', 'I Love Sushi').length === 0 && H.testimonialMarks('Welcome to I Love Sushi, fresh rolls every day.', '').length > 0,
  '1d a marca do cliente com "I"/"my" ("I Love Sushi") some antes da régua (e sem a marca seria marcada)')

const UGC = "Okay, I have to tell you about this LUME eau de parfum. I've been using it for a week and my skin has never looked better. Honestly, just try it."
const UGC_FIX = 'Meet LUME eau de parfum. Just try it.'
const consertos = [
  [UGC, UGC_FIX],
  ['Okay, I have to tell you about this LUME', 'Meet LUME'],
  ["I've been using it for a week.", 'LUME.'],
  ['My skin has never looked better. A light floral scent that lasts all day.', 'A light floral scent that lasts all day.'],
  ['Gente, preciso te contar sobre este LUME. Comprei e amei.', 'Conheça LUME.'],
  ['Tengo que contarte sobre este LUME. Me encanta.', 'Conoce LUME.'],
]
for (const [antes, depois] of consertos) {
  const r = H.repairTestimonial(antes, 'LUME')
  ok(r.text === depois && r.fixes.length > 0 && H.testimonialMarks(r.text, 'LUME').length === 0, `1e conserto: "${antes.slice(0, 48)}…" → "${depois}" (sem depoimento depois)`)
}
const limpo = 'Meet LUME eau de parfum. A light floral scent that lasts all day. Find yours today.'
ok(JSON.stringify(H.repairTestimonial(limpo, 'LUME')) === JSON.stringify({ text: limpo, fixes: [] }), '1f fala de apresentador limpa: o conserto não toca em nada')

const fonte = (extra = {}) => ({ source: 'LUME eau de parfum, a light floral scent that lasts all day', typed: 'LUME eau de parfum, a light floral scent that lasts all day', product: true, places: [], ...extra })
ok(H.honestyIssues(UGC, fonte({ presenter: true, brand: 'LUME' }), 'narration').includes(H.ADS_V2_TESTIMONIAL_WHY), '1g régua de honestidade COM ator: a narração de depoimento é recusada com o motivo (ADS_V2_TESTIMONIAL_WHY)')
ok(H.honestyIssues(UGC, fonte(), 'narration').length === 0 && H.honestyIssues('I love it', fonte({ presenter: true, brand: 'LUME' }), 'overlays[1]').length === 0,
  '1h SEM ator (narrador de marca) a régua de honestidade não muda; e só a NARRAÇÃO (o que o ator fala) é conferida, nunca as frases de tela')
ok(/16 CFR 465/.test(SRC.honesty) && /KINEO-ATOR-FTC-2026-10-13/.test(SRC.honesty), '1i a régua cita a regra da FTC e leva a marca KINEO-ATOR-FTC-2026-10-13')

// ═══ 2. O PEDIDO ao modelo ═════════════════════════════════════════════════════════════════════════════════════════
const RULE = BR.ADS_V2_PRESENTER_NARRATION_RULE
const pedidoApresentador = (rule) => /AI presenter/.test(rule) && /NOT a customer/.test(rule) && /Meet <name>/.test(rule) && /This is <name>/.test(rule) && /Here's why/.test(rule) && /third person/.test(rule) &&
  /never a testimonial/i.test(rule) && /my skin/.test(rule) && /before\/after/.test(rule) && /word count/.test(rule) &&
  !/FIRST PERSON/.test(rule) && !/UGC/.test(rule) && !/Okay, I have to tell you about/.test(rule) && !/creator/i.test(rule)
ok(pedidoApresentador(RULE), '2a com ator o pedido manda APRESENTADOR (terceira pessoa / voz de marca, "Meet…/This is…/Here\'s why…", nunca depoimento) — sumiram "FIRST PERSON", "UGC" e "Okay, I have to tell you about"')
const LUME = 'LUME eau de parfum, a light floral scent that lasts all day'
const BRIEF_LUME = { business: 'LUME — eau de parfum', offer: '', cta: 'buy', contact: '', language: 'en', tone: 'warm', audience: '', extra: { description: 'a light floral scent that lasts all day' } }
const MAXW = SL.adsV2NarrationMaxWords(15)
const BRB = world({ [F.brief]: atBase(F.brief), [F.honesty]: atBase(F.honesty) })(F.brief)
await check('2b SEM ator o pedido de texto é byte a byte o da base de242d88 (produto, simples, completo, voz desligada, com a fonte da honestidade)', () => {
  const voz = BR.simpleVoiceFor(BRIEF_LUME, LUME, 'en')
  const h = fonte()
  const casos = [
    { maxWords: 30, narration: true },
    { maxWords: 30, narration: false },
    { maxWords: MAXW, narration: true, simple: voz, ad: { product: true, presenter: false }, honesty: h },
    { maxWords: MAXW, narration: true, overlays: false, simple: voz, honesty: h },
  ]
  return casos.every((o) => JSON.stringify(BR.buildV2CopyMessages(BRIEF_LUME, 'English', o)) === JSON.stringify(BRB.buildV2CopyMessages(BRIEF_LUME, 'English', o)))
})

// ═══ 3. A extração executada (OpenAI falsa) ══════════════════════════════════════════════════════════════════════
const BRIEF_RAW = { business: 'LUME — eau de parfum', offer: '', cta: 'buy', contact: '', audience: '', tone: 'warm', extra: { description: 'a light floral scent that lasts all day' }, model_hint: '' }
const OVS = ['LUME eau de parfum', 'Light floral, all day']
const copia = (narration) => ({ narration, overlays: OVS, sector: 'store' })
const extrai = async (respostas, args = {}, over = {}) => {
  const oa = openaiFalsa([BRIEF_RAW, ...respostas])
  const r = await world(over, oa)(F.brief).extractAdsV2Brief({ text: LUME, language: 'en', languageName: 'English', maxWords: MAXW, narration: true, facts: [], sentence: LUME, productPhoto: true, ...args })
  return { r, log: oa.log }
}
const BOA = 'Meet LUME eau de parfum, a light floral scent that lasts all day. Spray it on in the morning and it stays with you until night. Find yours today.'
const consertaUgc = async (over = {}) => {
  const a = await extrai([copia(UGC), copia(UGC)], { presenter: true }, over)
  const sys = a.log[1]?.messages?.[0]?.content ?? ''
  const correcao = a.log[2]?.messages?.at(-1)?.content ?? ''
  return a.r.ok && a.r.copy.narration === UGC_FIX && a.r.honestyFixes?.some((f) => f.startsWith('testimonial')) && sys.includes(RULE) && correcao.includes(H.ADS_V2_TESTIMONIAL_WHY)
}
await check('3a COM ator: depoimento → 1 correção com o motivo → ainda depoimento → conserto em código ("' + UGC_FIX + '") — o plano NÃO cai', () => consertaUgc())
await check('3b COM ator: a correção do modelo em voz de apresentador é a gravada', async () => {
  const a = await extrai([copia(UGC), copia(BOA)], { presenter: true })
  return a.r.ok && a.r.attempts === 3 && a.r.copy.narration === BOA && !a.r.honestyFixes
})
const soMarca = async (over = {}) => {
  const tudo = "I've been using it for a week. My skin has never looked better. I love it."
  const a = await extrai([copia(tudo), copia(tudo)], { presenter: true }, over)
  return a.r.ok && a.r.copy.narration === 'LUME.'
}
await check('3c COM ator e NADA além de depoimento: sobra a marca ("LUME.") — nunca 502 por isso', () => soMarca())
await check('3d SEM ator (narrador de marca): a mesma resposta passa intacta, em 1 chamada, sem correção nem conserto', async () => {
  const a = await extrai([copia(UGC)])
  return a.r.ok && a.r.attempts === 2 && a.r.copy.narration === UGC && !a.r.honestyFixes && !a.log[1].messages[0].content.includes(RULE)
})
await check('3e a honestidade de sempre segue dura com ator: número inventado na 2ª resposta = recusa (stage copy)', async () => {
  const a = await extrai([copia(UGC), copia('Meet LUME eau de parfum. Rated 5 stars by 300 people.')], { presenter: true })
  return !a.r.ok && a.r.stage === 'copy' && a.r.why.some((w) => /300/.test(w))
})

// ═══ 4. RÓTULO DE IA na entrega ═══════════════════════════════════════════════════════════════════════════════════
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
ok(L.ADS_V2_AI_LABEL_NOTICE.en === "Made with AI — when you post it, turn on the platform's AI label (TikTok/Meta/YouTube require it for realistic AI people).", '4a o texto em inglês é o pedido pelo fundador')
ok(LANGS.every((l) => typeof L.ADS_V2_AI_LABEL_NOTICE[l] === 'string' && /TikTok\/Meta\/YouTube/.test(L.ADS_V2_AI_LABEL_NOTICE[l])) && Object.keys(L.ADS_V2_AI_LABEL_NOTICE).length === 16 &&
  new Set(Object.values(L.ADS_V2_AI_LABEL_NOTICE)).size === 16, '4b as 16 línguas da interface têm o aviso próprio (nenhuma cai no inglês) e citam TikTok/Meta/YouTube')
ok(L.adsV2AiLabelNotice('xx') === L.ADS_V2_AI_LABEL_NOTICE.en && L.adsV2AiLabelNotice(null) === L.ADS_V2_AI_LABEL_NOTICE.en && L.adsV2AiLabelNotice('pt') === L.ADS_V2_AI_LABEL_NOTICE.pt, '4c língua desconhecida = inglês')
const telaSimples = (src) => /import \{ adsV2AiLabelNotice \} from '@\/lib\/ads\/v2AiLabel'/.test(src) &&
  /phase === 'delivered' && order \? \([\s\S]*?\{downloadNote \? [^\n]*\n\s*<p className="adv2-note" role="note">\{adsV2AiLabelNotice\(lang\)\}<\/p>/.test(src) && !/copy\.done\.aiLabel/.test(src)
ok(telaSimples(SRC.simple), '4d tela de resultado do modo SIMPLES: o aviso logo abaixo do download, na língua da interface')
ok(/\{downloadNote \? [^\n]*\n\s*<p className="adv2-note" role="note">\{adsV2AiLabelNotice\('en'\)\}<\/p>/.test(SRC.full) && !/Turn on the AI-generated label when you post on TikTok/.test(SRC.full), '4e tela de resultado do modo COMPLETO (inglês): o mesmo aviso abaixo do download')
ok(/\{group\.members\.some\(\(m\) => \(status\[m\.order_id\]\?\.status \?\? m\.status\) === 'delivered'\) \? <p className="adv2-note" role="note">\{adsV2AiLabelNotice\(lang\)\}<\/p> : null\}/.test(SRC.variations), '4f quadro das VARIAÇÕES (onde se baixa cada uma): o aviso aparece quando alguma está pronta')
ok(SRC.montage === atBase(F.montage), '4g a montagem (adV2Montage.ts) é byte a byte a da base — nenhuma marca d\'água nova no vídeo')
ok(!/aiLabel/.test(SRC.simpleLib), '4h o aviso antigo (en/pt/es) saiu da tabela do modo simples — uma fonte só para o texto')

// ═══ 5. Mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════
const mutante = async (nome, rel, de, para, prova) => {
  const over = { [rel]: trocar(SRC[Object.keys(F).find((k) => F[k] === rel)], de, para) }
  let verde = false
  try { verde = !!(await prova(over)) } catch { verde = false }
  ok(!verde, `M ${nome} → vermelho`)
}
await mutante('régua sem a checagem do depoimento (honestyIssues)', F.honesty,
  "  if (h.presenter && label === 'narration' && testimonialMarks(text, h.brand).length) why.push(ADS_V2_TESTIMONIAL_WHY)\n", '',
  (over) => consertaUgc(over))
await mutante('conserto em código sem o repairTestimonial (repairCopyRaw)', F.brief,
  '      if (t.fixes.length) { out.narration = t.text; fixes.push(...t.fixes) }\n', '',
  (over) => consertaUgc(over))
await mutante('sem o degrau "nunca 502" (minWords 1)', F.brief,
  "      if (!again.ok && fixed.fixes.some((f) => f.startsWith('testimonial'))) again = checkV2Copy(fixed.raw, brief, { ...relaxedOpts, minWords: 1 })\n", '',
  (over) => soMarca(over))
await mutante('a fonte da honestidade sem o ator (presenter/brand)', F.brief,
  "...(args.presenter === true ? { presenter: true, brand: brandName(parsed.brief) } : {})", '',
  (over) => consertaUgc(over))
await mutante('pedido de volta à 1ª pessoa de criador (UGC)', F.brief,
  "Never a testimonial: no \"I bought\"", "Write it in the FIRST PERSON like a creator's video (UGC), \"Okay, I have to tell you about…\". Never a testimonial: no \"I bought\"",
  (over) => pedidoApresentador(world(over)(F.brief).ADS_V2_PRESENTER_NARRATION_RULE))
await mutante('régua que esquece o "I" de quem conta a experiência', F.honesty,
  "  [P(\"I(?:['’](?:m|ve|d))?(?!['’]ll|\\\\s+will(?![\\\\p{L}]))\", 'u'), 'I'],\n", '',
  (over) => { const Hm = world(over)(F.honesty); return LISTA.every((t) => Hm.testimonialMarks(t, 'LUME').length > 0) })
await mutante('régua que trata "use"/"compre" sem acento como espanhol', F.honesty,
  "[P('compré|usé|probé|", "[P('compr[eé]|us[eé]|prob[eé]|",
  (over) => { const Hm = world(over)(F.honesty); return APRESENTADOR.every((t) => Hm.testimonialMarks(t, 'LUME').length === 0) })
await mutante('marca sem máscara ("I Love Sushi" vira depoimento)', F.honesty,
  '  const t = maskBrand(String(text ?? \'\'), brand)\n', "  const t = String(text ?? '')\n",
  (over) => { const Hm = world(over)(F.honesty); return Hm.testimonialMarks('Welcome to I Love Sushi, fresh rolls every day.', 'I Love Sushi').length === 0 })
await mutante('tela simples sem o aviso de rótulo', F.simple,
  '<p className="adv2-note" role="note">{adsV2AiLabelNotice(lang)}</p>', '', (over) => telaSimples(over[F.simple]))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
