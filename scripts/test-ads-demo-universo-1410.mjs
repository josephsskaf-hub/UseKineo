// KINEO-ADS-DEMO-UNIVERSO-1410 — guardião dos consertos da demo de anúncio para uma agência (14/10/2026, Studio Ads v2, fundador:
// "pode consertar agora"; Studio Ads fica fora da TRAVA 8.2 — docs/ESPEC-ANUNCIO-V2-2026-09-28.md §7). Nada de rede, nada pago:
// só readFileSync + funções puras transpiladas pelo carregador offline (scripts/test-support/offline-ts-loader.mjs) + `git show`
// da BASE = o pai do 1º commit com a marca (nunca origin/main nem a árvore de trabalho).
//
// O que prova:
//   1 leitor de link: a fixture Nuvemshop (scripts/fixtures/ads-link-nuvemshop-atheeri.html, anonimizada) REPRODUZ o defeito na
//     base ("Delina", R$ 2.750) e agora dá Atheeri, o preço de venda e a foto de 1024 px; prioridade = o produto DESTA página
//     (endereço/canonical/último trecho do caminho → mainEntity), nunca o do carrossel;
//   2 conferência nome × página: nome que não divide palavra com og:title/<title>/slug é descartado (fica o título);
//   3 língua da voz: a frase da demo → pt (sem link); .com.br/<html lang> → pt quando a frase não diz; a escolha da pessoa vence;
//     os dois detectores de antes (textLanguage — régua dos filmes, TRAVA 8.2 — e shortTextLanguage) byte a byte iguais à base;
//   4 "Salvar como meu kit da marca" vem DESMARCADO e nunca marca sozinho;
//   5 pronúncia da marca: vai SÓ à voz (as duas sínteses do v2Advance), o roteiro salvo, as frases na tela e o cartão ficam com a
//     grafia real; o /orders guarda brief.pronounce limpo e moderado; o campo mora em "Mais opções" nas 16 línguas;
//   6 tênis → graffiti_ad (moda de rua), sapato/roupa → poster_ad (o estilo de moda do catálogo); palavra desconhecida = de sempre;
//   7 dinheiro intocado (v2Billing, v2Tiers, v2StartCore, /start, /plan, v2PlanCore byte a byte) e o desfaz deste conserto devolve
//     os 7 arquivos tocados EXATAMENTE à base;
//   8 (2º commit, pedido do coordenador) o roteiro principal curto DUAS vezes é completado até o piso como as versões (fechos sem
//     fato com o nome do brief), sem passar do teto da voz (18,5 s em 15 s), sem repetir fecho entre A/B/C nem chamada dupla;
//   M mutantes (13): cada regra quebrada fica vermelha, e cada mutante prova que aplicou (âncora única, texto mudou).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semDemoUniverso1410, DEMO_UNIVERSO_1410_ARQUIVOS, MARCA_DEMO_UNIVERSO_1410 } from './test-support/desfaz-ads-demo-universo-1410.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 })
const F = {
  reader: 'lib/ads/linkReader.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  orders: 'app/api/ads/v2/orders/route.ts',
  advance: 'lib/ads/v2Advance.ts',
  styles: 'lib/ads/v2Styles.ts',
  hint: 'lib/ads/v2VoiceHint.ts',
  pron: 'lib/ads/v2Pronounce.ts',
  text: 'lib/textLanguage.ts',
  short: 'lib/shortTextLanguage.ts',
  fixture: 'scripts/fixtures/ads-link-nuvemshop-atheeri.html',
}
// A base: o pai do 1º commit que trouxe a marca a estes arquivos (antes do commit: HEAD).
const primeiro = git('log', '--reverse', '--format=%H', '-S', MARCA_DEMO_UNIVERSO_1410, '--', ...DEMO_UNIVERSO_1410_ARQUIVOS, F.hint, F.pron).trim().split('\n').filter(Boolean)[0]
const BASE = primeiro ? `${primeiro}^` : 'HEAD'
const base = (rel) => git('show', `${BASE}:${rel}`).replace(/\r\n/g, '\n')
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = (fn) => { try { return !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante não aplicou'); return out }
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const bloco = (src, inicio) => { const i = src.indexOf(inicio); if (i < 0) return ''; let d = 0; for (let j = src.indexOf('{', i + inicio.length - 1); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1) } } return '' }
const loader = (over = {}) => createOfflineLoader({ source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const vermelho = (fn) => { try { return !fn() } catch { return true } }

console.log(`base = ${BASE}${primeiro ? '' : ' (ainda sem commit com a marca)'}`)

// ═══ 1. o leitor de link ════════════════════════════════════════════════════════════════════════════════════════════
console.log('\n1. leitor de link: o produto DESTA página')
const PAGE = 'https://www.loja-exemplo.com.br/produtos/atheeri-lattafa-1d1bb/'
const FIX = read(F.fixture)
const big = (u) => /1-76f69ba6931a7f288517744376692203-1024-1024\.webp$/.test(String(u))
const leitorOk = (R) => {
  const f = R.readLinkFacts(FIX, PAGE)
  const imgs = R.productPageImages(FIX, PAGE)
  const frase = R.linkSentence(f)
  return f.title === 'Atheeri – Lattafa' && f.price === 'BRL 569' && big(f.images[0]) && f.lang === 'pt' &&
    !/Delina|Goddess|2750/.test(`${f.title} ${f.price} ${f.description}`) && big(imgs[0]) && imgs.every((u) => !/delina|65082b42/i.test(u)) &&
    /Atheeri/.test(frase) && !/Delina/.test(frase)
}
ok(tenta(() => { const f = loader({ [F.reader]: base(F.reader) })(F.reader).readLinkFacts(FIX, PAGE); return /Delina/.test(f.title) && /2750/.test(String(f.price)) }),
  '1a a fixture REPRODUZ o defeito na base: o leitor antigo devolve "Delina", R$ 2.750 (o 1º Product do carrossel de recomendados)')
ok(tenta(() => leitorOk(loader()(F.reader))), '1b agora: "Atheeri – Lattafa", BRL 569 (preço de venda da Nuvemshop), foto 1024 px primeiro, <html lang> = pt; nada do carrossel')
// Prioridade sem a Nuvemshop (sem LS.*): um recomendado que DIVIDE palavras com o título (o nome não o salva) nunca vence o produto da página.
const SEM_LS = FIX.replace(/<script type="text\/javascript">[\s\S]*?<\/script>/, '').split('"name": "Delina Eau de Parfum - Parfums de Marly"').join('"name": "Atheeri Intense – Lattafa"').split('"price": "2750"').join('"price": "999"')
const prioridadeOk = (R) => { const f = R.readLinkFacts(SEM_LS, PAGE); return f.title === 'Atheeri – Lattafa' && f.price === 'BRL 630' && !/999|Intense/.test(`${f.title} ${f.price}`) }
ok(SEM_LS !== FIX && /Atheeri Intense/.test(SEM_LS) && tenta(() => prioridadeOk(loader()(F.reader))), '1c sem LS.*, recomendado com nome parecido ("Atheeri Intense", R$ 999): vence o mainEntity da página (BRL 630 do JSON-LD dela)')
// Shopify: JSON-LD url /products/<handle> e a página aberta por /collections/x/products/<handle> = o MESMO produto (último trecho).
const SHOPIFY = `<html lang="en"><head><title>Trail Runner – Acme</title><meta property="og:title" content="Trail Runner"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Trail Runner","url":"https://acme.test/products/trail-runner","image":"https://cdn.shopify.com/s/files/1/trail.jpg","offers":{"@type":"Offer","price":"120.00","priceCurrency":"USD","url":"https://acme.test/products/trail-runner?variant=1"}}</script></head><body></body></html>`
ok(tenta(() => { const f = loader()(F.reader).readLinkFacts(SHOPIFY, 'https://acme.test/collections/shoes/products/trail-runner'); return f.title === 'Trail Runner' && f.price === 'USD 120.00' && f.images[0] === 'https://cdn.shopify.com/s/files/1/trail.jpg' }),
  '1d Shopify por coleção (/collections/x/products/y): o Product /products/y é ESTA página (preço e foto dele)')
ok(tenta(() => { const R = loader()(F.reader); const h = '<img srcset="https://x.test/a-400.jpg 400w, https://x.test/a-1200.jpg 1200w, https://x.test/a.jpg 800w">'; return R.largestImageVariant('https://x.test/a.jpg', h, 'https://x.test/') === 'https://x.test/a-1200.jpg' && R.largestImageVariant('https://x.test/z.jpg', h, 'https://x.test/') === 'https://x.test/z.jpg' }),
  '1e a maior foto pelo srcset que CITA o arquivo (1200w); arquivo que nenhum srcset cita = o mesmo endereço (nada inventado)')

// ═══ 2. conferência nome × página ═══════════════════════════════════════════════════════════════════════════════════
console.log('\n2. conferência do nome com a página')
const refs = { titles: ['Atheeri – Lattafa', 'Atheeri Lattafa Perfume Feminino Oriental Floral 2025'], url: PAGE }
const confereOk = (R) => R.productNameMatchesPage('Delina Eau de Parfum - Parfums de Marly', refs) === false && R.productNameMatchesPage('Atheeri – Lattafa', refs) === true &&
  R.productNameMatchesPage('Perfume Feminino 100ml', refs) === true /* só palavras genéricas: nada a conferir */ &&
  R.productNameMatchesPage('Runner Sneakers', { titles: [], url: 'https://x.test/products/runner-sneaker-white' }) === true &&
  R.productNameMatchesPage('Goddess Burberry', { titles: [], url: 'https://x.test/produtos/atheeri-lattafa-1d1bb/' }) === false
ok(tenta(() => confereOk(loader()(F.reader))), '2a "Delina…" × página do Atheeri = descartado; o nome certo, o slug (plural/singular) e nome só genérico passam')
// Página com UM Product sem endereço e com o nome errado (tema que copia o produto em destaque): cai no og:title, sem o preço dele.
const SOLTO = `<html lang="pt"><head><title>Atheeri Lattafa</title><meta property="og:title" content="Atheeri – Lattafa"><script type="application/ld+json">{"@type":"Product","name":"Delina Eau de Parfum - Parfums de Marly","image":"https://cdn.test/delina.jpg","offers":{"@type":"Offer","price":"2750","priceCurrency":"BRL"}}</script></head></html>`
const descarteOk = (R) => { const f = R.readLinkFacts(SOLTO, PAGE); return f.title === 'Atheeri – Lattafa' && f.price === null && !f.images.some((u) => /delina/.test(u)) }
ok(tenta(() => descarteOk(loader()(F.reader))), '2b Product sem endereço e com nome que não confere: descartado — o título vem do og:title, sem preço nem foto dele')

// ═══ 3. a língua da voz ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\n3. língua da voz')
const FRASE = 'Perfume árabe Atheeri, frasco dourado, luz quente deslizando pelo vidro'
ok(tenta(() => { const T = loader()(F.text); const S = loader()(F.short); return T.detectNarrationLanguage(FRASE).language === null && S.detectShortTextLanguage(FRASE) === null }),
  '3a a CAUSA, medida: os dois detectores devolvem null para a frase da demo ("árabe"/"deslizando" existem iguais no espanhol) — e não mudaram')
ok(read(F.text) === base(F.text) && read(F.short) === base(F.short), '3b lib/textLanguage.ts (régua dos filmes, TRAVA 8.2) e lib/shortTextLanguage.ts byte a byte iguais à base')
const H = () => loader()(F.hint)
const fraseOk = (V) => V.adsV2IberianLanguage(FRASE) === 'pt' && V.adsV2SpokenLanguage({ chosen: null, detected: null, short: null, text: FRASE, hint: null, ui: 'en' }) === 'pt' &&
  V.adsV2IberianLanguage('Perfume árabe, frasco dorado, luz caliente deslizando por el vidrio') === 'es' &&
  V.adsV2IberianLanguage('frasco dourado y dorado á') === null /* conflito */ && V.adsV2IberianLanguage('gold bottle, warm light') === null && V.adsV2IberianLanguage('dourado') === null /* sem sinal ibérico */
ok(tenta(() => fraseOk(H())), '3c a frase da demo → pt SEM link (desempate pt×es: "dourado/quente/vidro"); o espelho espanhol → es; conflito, inglês e palavra solta → null')
const dicaOk = (V) => {
  const amb = 'Atheeri Lattafa 100ml'
  const voz = (hint, ui = 'en') => V.adsV2SpokenLanguage({ chosen: null, detected: null, short: null, text: amb, hint, ui })
  return voz(V.adsV2LinkLanguageHint(null, 'https://www.gabi.com.br/produtos/x/')) === 'pt' && voz(V.adsV2LinkLanguageHint('pt', null)) === 'pt' && voz(V.adsV2LinkLanguageHint('pt-BR', 'https://shop.com')) === 'pt' &&
    voz(V.adsV2LinkLanguageHint(null, 'tienda.com.mx')) === 'es' && voz(V.adsV2LinkLanguageHint(null, 'https://shop.com/x')) === 'en' && voz(V.adsV2LinkLanguageHint(null, 'https://shop.com/x'), 'pt') === 'pt' &&
    voz(V.adsV2LinkLanguageHint('es', 'https://loja.com.br')) === 'es' /* a página declarada vence o domínio */ && V.adsV2LanguageFromHost('loja.in') === null
}
ok(tenta(() => dicaOk(H())), '3d frase ambígua: .com.br / <html lang="pt"> → pt; .mx → es; .com sem lang → a interface; a página declarada vence o domínio')
const escolhaOk = (V) => V.adsV2SpokenLanguage({ chosen: 'en', detected: 'pt', short: 'pt', text: FRASE, hint: 'pt', ui: 'pt' }) === 'en' &&
  V.adsV2SpokenLanguage({ chosen: 'es', detected: null, short: null, text: FRASE, hint: 'pt', ui: 'en' }) === 'es' &&
  V.adsV2SpokenLanguage({ chosen: null, detected: 'es', short: null, text: FRASE, hint: 'pt', ui: 'pt' }) === 'es' /* o detector de sempre vem antes do desempate e da dica */
ok(tenta(() => escolhaOk(H())), '3e a escolha EXPLÍCITA da pessoa vence tudo (frase pt + .com.br + interface pt → "en" escolhido sai em inglês)')
const telaLinguaOk = (s0) => {
  const s = code(s0)
  return /const linkLangHint = adsV2LinkLanguageHint\(linkLang, linkRead \?\? \(link\.trim\(\) \|\| null\)\)/.test(s) &&
    /const spoken: NarrationLanguage = adsV2SpokenLanguage\(\{ chosen: voiceLang, detected, short: shortLang, text: `\$\{sentence\} \$\{scene\}`, hint: linkLangHint, ui: lang \}\)/.test(s) &&
    /setLinkLang\(typeof \(r\.data as \{ lang\?: unknown \}\)\.lang === 'string'/.test(bloco(s, 'async function importLink(')) && /language: spoken,/.test(bloco(s, 'async function ensureDraft('))
}
ok(telaLinguaOk(read(F.simple)), '3f a tela: a língua da página lida (link-import) entra na dica; a voz do pedido (language) é a desta ordem')

// ═══ 4. kit da marca ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\n4. "Save as my brand kit"')
const kitOk = (s0) => {
  const s = code(s0)
  const sets = s.match(/setSaveKit\([^)]*\)/g) ?? []
  return /const \[saveKit, setSaveKit\] = useState\(false\)/.test(s) && /if \(saveKitTouchedRef\.current\) return\s*if \(otherBrand\) setSaveKit\(false\)/.test(s) &&
    sets.length === 2 && sets.every((x) => x === 'setSaveKit(false)' || x === 'setSaveKit(e.target.checked)') && /<input type="checkbox" checked=\{saveKit\}/.test(s)
}
ok(kitOk(read(F.simple)), '4a vem DESMARCADO; nada marca sozinho (só setSaveKit(false) e o clique da pessoa); outra marca continua desmarcando')

// ═══ 5. pronúncia da marca ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n5. pronúncia da marca: só a voz')
const P = () => loader()(F.pron)
const pronOk = (M) => {
  const p = M.sanitizeAdsV2Pronounce({ word: ' Atheeri ', say: 'a-TÉ-ri' })
  const narr = 'Atheeri é o perfume da noite. Conheça ATHEERI hoje; atheeris não muda.'
  const tts = M.adsV2NarrationForTts(narr, p)
  return p && p.word === 'Atheeri' && p.say === 'a-TÉ-ri' && tts === 'a-TÉ-ri é o perfume da noite. Conheça a-TÉ-ri hoje; atheeris não muda.' &&
    M.adsV2NarrationForTts(narr, null) === narr && M.adsV2NarrationForTts('Le Labo Santal', { word: 'Le Labo', say: 'luh LAH-bo' }) === 'luh LAH-bo Santal' &&
    M.adsV2NarrationForTts('Preço $1 Atheeri', { word: 'Atheeri', say: 'a-TÉ-ri' }) === 'Preço $1 a-TÉ-ri' &&
    M.sanitizeAdsV2Pronounce({ word: 'Atheeri', say: 'visit evil.com' }) === null && M.sanitizeAdsV2Pronounce({ word: 'Atheeri', say: 'call 555 1234' }) === null &&
    M.sanitizeAdsV2Pronounce({ word: 'Atheeri', say: 'atheeri' }) === null && M.sanitizeAdsV2Pronounce({ word: 'Atheeri', say: 'a b c d e f g' }) === null &&
    M.sanitizeAdsV2Pronounce({ word: '', say: 'a-TÉ-ri' }) === null && M.sanitizeAdsV2Pronounce(null) === null &&
    M.adsV2PronounceOf({ pronounce: { word: 'Atheeri', say: 'a-TÉ-ri' } })?.say === 'a-TÉ-ri' && M.adsV2PronounceOf({}) === null && M.adsV2PronounceDefaultWord('Atheeri – Lattafa') === 'Atheeri'
}
ok(tenta(() => pronOk(P())), '5a a narração que vai à voz troca a marca (palavra inteira, sem maiúscula importar; "$" literal); sem pronúncia = o MESMO texto; fala com link/número/igual/longa = recusada')
const vozOk = (s0) => {
  const s = code(s0)
  const usos = s.match(/adsV2NarrationForTts\(/g) ?? []
  return usos.length === 2 && (s.match(/speakableForTts\(adsV2NarrationForTts\(narration, adsV2PronounceOf\(order\.brief\)\), language\)/g) ?? []).length === 2 &&
    !/speakableForTts\(narration, language\)/.test(s) && !/plan\.narration\s*=[^=]/.test(s) && !/\.narration = /.test(s) &&
    (s.match(/overlays: \(plan\.overlays \?\? \[\]\)\.filter\(\(o\) => o && typeof o\.text === 'string' && o\.text\.trim\(\)\)\.map\(\(o\) => \(\{ text: o\.text, start: o\.start, end: o\.end \}\)\)/g) ?? []).length === 1 &&
    /const lines = \(plan\.overlays \?\? \[\]\)\.filter\(\(o\) => o && typeof o\.text === 'string' && o\.text\.trim\(\)\)\.map\(\(o\) => \(\{ text: o\.text, start: o\.start, end: o\.end \}\)\)/.test(s)
}
ok(vozOk(read(F.advance)), '5b v2Advance: as DUAS sínteses (ator e montagem) recebem a pronúncia; o roteiro salvo nunca é reescrito e as frases na tela seguem plan.overlays (grafia real)')
const ordersOk = (s0) => {
  const s = code(s0)
  const i = s.indexOf('const pronounce = sanitizeAdsV2Pronounce((body as Record<string, unknown> | null)?.pronounce)')
  const m = s.indexOf("const fala = await moderateTopic({ entry: 'ads-v2-orders', userId: user.id, text: pronounce.say, language: o.language })")
  const b = s.indexOf('brief.pronounce = pronounce')
  return i > s.indexOf('const brief: Record<string, unknown> = { sentence: o.sentence, link: o.link }') && i < m && m < b && b < s.indexOf(".from('ads_v2_orders')\n      .insert(") &&
    /if \(!fala\.ok\) return v2Fail\('moderation', fala\.status, \{ message: fala\.message, category: fala\.category \}\)/.test(s) && (s.match(/brief\.pronounce = /g) ?? []).length === 1
}
ok(ordersOk(read(F.orders)), '5c /orders: brief.pronounce só do sanitizador, com a fala MODERADA antes de gravar (recusa = o mesmo 4xx da moderação)')
const campoOk = (s0) => {
  const s = code(s0)
  const more = s.indexOf('<details className="adv2s-more"')
  const f = s.indexOf('data-kineo="ads-pronounce"')
  return more > 0 && f > more && f > s.indexOf('ref={contactInputRef}') && /\{narrationOn \? \(\s*<div className="adsw-f" data-kineo="ads-pronounce">/.test(s) &&
    /const pronounce = narrationOn \? sanitizeAdsV2Pronounce\(\{ word: pronWord\.trim\(\) \|\| pronWordDefault, say: pronSay \}\) : null/.test(s) &&
    /\.\.\.\(pronounce \? \{ pronounce \} : \{\}\),/.test(bloco(s, 'async function ensureDraft(')) && /link: linkRead, \.\.\.\(pronounce \? \{ pronounce \} : \{\}\) \}\)/.test(s)
}
ok(campoOk(read(F.simple)), '5d tela: o campo mora em "Mais opções" (depois do contato), só com voz; vai ao rascunho e muda a chave do rascunho')
ok(tenta(() => { const M = P(); const C = M.ADS_V2_PRONOUNCE_COPY; return Object.keys(C).length === 16 && LANGS.every((l) => C[l] && C[l].label && C[l].hint && C[l].word && C[l].say && C[l].sayPlaceholder) && new Set(LANGS.map((l) => C[l].label)).size === 16 && new Set(LANGS.map((l) => C[l].hint)).size === 16 && M.adsV2PronounceCopy('xx') === C.en && M.adsV2PronounceCopy('pt') === C.pt }),
  '5e as frases do campo nas 16 línguas, todas próprias (nenhuma cai no inglês)')
ok([F.hint, F.pron].every((f) => !/^\s*import\s(?!type)/m.test(read(f))) && !/credit|adsV2Credits|charge/i.test(code(read(F.pron))), '5f v2VoiceHint e v2Pronounce são puras (só import type) e não tocam crédito (mesmo preço)')

// ═══ 6. estilo sugerido ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\n6. estilo sugerido para moda')
const ST = () => loader()(F.styles)
const estiloOk = (S) =>
  S.adsV2StyleByProductWord('tênis branco de corrida') === 'graffiti_ad' && S.adsV2SuggestedStyle('store', 'Tênis Nike') === 'graffiti_ad' && S.adsV2StyleByProductWord('zapatillas urbanas') === 'graffiti_ad' &&
  S.adsV2StyleByProductWord('sneakers drop') === 'graffiti_ad' && S.adsV2StyleByProductWord('кроссовки') === 'graffiti_ad' &&
  S.adsV2StyleByProductWord('sapato social de couro') === 'poster_ad' && S.adsV2StyleByProductWord('camiseta oversized') === 'poster_ad' && S.adsV2StyleByProductWord('vestido de festa') === 'poster_ad' &&
  S.adsV2StyleByProductWord('Lederstiefel') === null && S.adsV2StyleByProductWord('Stiefel aus Leder') === 'poster_ad' && S.adsV2StyleByProductWord('robe de soirée') === 'poster_ad' &&
  S.adsV2StyleByProductWord('perfume e camiseta') === 'product_closeup' /* as listas de antes vêm primeiro */ && S.adsV2StyleByProductWord('fone e tênis') === 'mechanical_assembly' &&
  S.adsV2SuggestedStyle('store', 'caneca personalizada') === 'giant_product' && S.adsV2SuggestedStyle('gym', 'personal trainers') === 'giant_product' && S.adsV2SuggestedStyle('real_estate', 'loja de tênis') === 'none'
ok(tenta(() => estiloOk(ST())), '6a tênis/sneaker/zapatilla → graffiti_ad; sapato/camiseta/vestido/bota → poster_ad; perfume e eletrônico seguem primeiro; palavra desconhecida e imóvel = o de sempre')
ok(tenta(() => { const S = ST(); return /apparel/i.test(S.adsV2Style('graffiti_ad').bestFor) && /fashion/i.test(S.adsV2Style('poster_ad').bestFor) && S.ADS_V2_STYLE_KEYS.length === 17 }),
  '6b a escolha segue o próprio catálogo: graffiti_ad diz "apparel" (moda de rua), poster_ad diz "fashion"; os 17 estilos não mudaram')

// ═══ 7. dinheiro intocado e a volta exata ═══════════════════════════════════════════════════════════════════════════
console.log('\n7. dinheiro intocado e o desfaz')
const DINHEIRO = ['lib/ads/v2Billing.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts', 'lib/ads/v2PlanCore.ts', 'lib/ads/v2Link.ts', 'app/api/ads/v2/link-import/route.ts']
ok(DINHEIRO.every((f) => read(f) === base(f)), '7a v2Billing, v2Tiers, v2StartCore, /start, /plan, v2PlanCore, v2Link e /link-import byte a byte iguais à base')
ok(DEMO_UNIVERSO_1410_ARQUIVOS.length === 7 && DEMO_UNIVERSO_1410_ARQUIVOS.every((f) => tenta(() => semDemoUniverso1410(f, read(f)) === base(f))), '7b desfeito (scripts/test-support/desfaz-ads-demo-universo-1410.mjs), cada um dos 7 arquivos tocados é EXATAMENTE a base')
ok(['lib/engineWall.ts', 'lib/homeVideoCuration.ts'].every((f) => read(f) === base(f)), '7c vitrine da home (engineWall, homeVideoCuration) intocada')

// ═══ M. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (precisam ficar vermelhos)')
const SRC = { reader: read(F.reader), hint: read(F.hint), pron: read(F.pron), styles: read(F.styles), simple: read(F.simple), advance: read(F.advance), orders: read(F.orders) }
const comLeitor = (t) => loader({ [F.reader]: t })(F.reader)
const m1 = trocar(SRC.reader, '  const pick = found.find((c) => productUrls(c.node).some(isSelf))\n', '  const pick = found.find((c) => !c.main)\n')
ok(vermelho(() => prioridadeOk(comLeitor(m1))), 'M1 o 1º Product "solto" volta a vencer (o carrossel) → 1c vermelho')
const m2 = trocar(SRC.reader, '  return ok ? pick.node : undefined\n', '  return pick.node\n')
ok(vermelho(() => descarteOk(comLeitor(m2))), 'M2 sem a conferência nome × página → 2b vermelho')
const m3 = trocar(SRC.reader, '  return best\n}\n', '  return abs\n}\n')
ok(vermelho(() => leitorOk(comLeitor(m3))), 'M3 sem a maior versão da foto (fica a de 480 px) → 1b vermelho')
const m4 = trocar(SRC.reader, "  const p = nuvem?.price ?? offer?.price", "  const p = offer?.price")
ok(vermelho(() => leitorOk(comLeitor(m4))), 'M4 Nuvemshop sem o preço de venda (volta o "de" R$ 630) → 1b vermelho')
const m5 = trocar(SRC.hint, ' ?? adsV2IberianLanguage(x.text) ?? ', ' ?? ')
ok(vermelho(() => fraseOk(loader({ [F.hint]: m5 })(F.hint))), 'M5 sem o desempate pt×es (a frase da demo volta ao inglês) → 3c vermelho')
const m6 = trocar(SRC.hint, ' ?? asVoice(x.hint) ?? ', ' ?? ')
ok(vermelho(() => dicaOk(loader({ [F.hint]: m6 })(F.hint))), 'M6 sem a dica do link (.com.br/<html lang>) → 3d vermelho')
const m7 = trocar(SRC.hint, '  return asVoice(x.chosen) ?? asVoice(x.detected)', '  return asVoice(x.detected) ?? asVoice(x.chosen)')
ok(vermelho(() => escolhaOk(loader({ [F.hint]: m7 })(F.hint))), 'M7 o detector passando na frente da escolha da pessoa → 3e vermelho')
const m8 = trocar(SRC.simple, '  const [saveKit, setSaveKit] = useState(false)', '  const [saveKit, setSaveKit] = useState(true)')
ok(vermelho(() => kitOk(m8)), 'M8 kit da marca marcado de novo por padrão → 4a vermelho')
const m9 = trocar(SRC.pron, '  return narration.replace(new RegExp(', '  return narration || narration.replace(new RegExp(')
ok(vermelho(() => pronOk(loader({ [F.pron]: m9 })(F.pron))), 'M9 a pronúncia não chega à voz → 5a vermelho')
const m10 = trocar(SRC.advance, 'speakableForTts(adsV2NarrationForTts(narration, adsV2PronounceOf(order.brief)), language), true)', 'speakableForTts(narration, language), true)')
ok(vermelho(() => vozOk(m10)), 'M10 a voz da montagem sem a pronúncia → 5b vermelho')
const m11 = trocar(SRC.styles, "  ['graffiti_ad', /", "  ['giant_product', /")
ok(vermelho(() => estiloOk(loader({ [F.styles]: m11 })(F.styles))), 'M11 tênis de volta ao "Giant product" → 6a vermelho')
const m12 = trocar(SRC.orders, "      brief.pronounce = pronounce // ", "      brief.pronounce = (body as Record<string, unknown>).pronounce // ")
ok(vermelho(() => ordersOk(m12)), 'M12 o /orders gravando a pronúncia crua (sem limpar) → 5c vermelho')

// ═══ 8. o piso de fala em TODOS os roteiros (A/B/C) ═════════════════════════════════════════════════════════════════
// Demo de 14/10 (Comercial, 15 s, pt): o roteiro A escolhido acabou a voz aos 10,7 s. EXECUTADO: lib/ads/v2Brief.ts de verdade com
// uma OpenAI falsa (responde pelo max_tokens: 900 = brief, 700 = texto/correção em fila, 1100 = versões). O principal vem CURTO
// duas vezes (17 palavras, a 2ª é a correção) e as duas versões também vêm curtas.
console.log('\n8. piso de fala nos 3 roteiros')
const BRIEF_FALA = 'lib/ads/v2Brief.ts'
const FIT = 'lib/ads/v2CopyFit.ts'
function openaiFalsa({ brief, copies = [], variants = null }) {
  const fila = copies.slice()
  const create = async (params) => {
    const mt = params.max_tokens
    const r = mt === 900 ? brief : mt === 1100 ? variants : fila.shift()
    return { choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r ?? {}) } }] }
  }
  return { openai: { chat: { completions: { create } } } }
}
const JSONS = { '@/lib/ui/refinementCopy.json': JSON.parse(read('lib/ui/refinementCopy.json')) }
const FRASE_FALA = 'Perfume árabe Atheeri, frasco dourado, luz quente deslizando pelo vidro'
const BRIEF_ATHEERI = { business: 'Atheeri — perfume árabe', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }
const CURTO = { narration: 'O perfume árabe Atheeri brilha no frasco dourado. Uma luz quente desliza pelo vidro. Garanta o seu.', overlays: ['Atheeri — perfume árabe', 'Frasco dourado'], sector: 'store' }
const V_BOLD = { tone: 'bold', narration: 'Atheeri tem um frasco dourado que chama a atenção. A luz quente desliza pelo vidro e revela cada detalhe.', overlays: ['Atheeri', 'Frasco dourado'] }
const V_STORY = { tone: 'story', narration: 'No fim da tarde, a luz quente toca o frasco dourado de Atheeri. O vidro brilha e o momento fica só seu.', overlays: ['Atheeri', 'Luz quente'] }
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length
async function falaCurtaDuasVezes(over = {}) {
  const oa = openaiFalsa({ brief: BRIEF_ATHEERI, copies: [CURTO, CURTO], variants: { variants: [V_BOLD, V_STORY] } })
  const L = createOfflineLoader({ mocks: { '@/lib/openai': { openai: oa.openai }, ...JSONS }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
  const r = await L(BRIEF_FALA).extractAdsV2Brief({ text: FRASE_FALA, language: 'pt', languageName: 'Brazilian Portuguese (pt-BR)', maxWords: 30, narration: true, overlays: true, facts: [], sentence: FRASE_FALA, productPhoto: true, scripts: true })
  return { r, C: L(FIT) }
}
const FLOOR = 27
const pisoOk = ({ r }) => {
  if (!r.ok || r.speechShort) return false
  const textos = [r.copy.narration, ...(r.variants ?? []).map((v) => v.copy.narration)]
  return textos.length === 3 && textos.every((t) => palavras(t) >= FLOOR) && palavras(r.copy.narration) > palavras(CURTO.narration) && r.copy.narration.startsWith(CURTO.narration)
}
const tetoOk = ({ r, C }) => {
  if (!r.ok) return false
  const textos = [r.copy.narration, ...(r.variants ?? []).map((v) => v.copy.narration)]
  const frases = (t) => t.split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter(Boolean)
  const fechos = textos.flatMap((t, i) => frases(t).slice(frases([CURTO, V_BOLD, V_STORY][i].narration).length))
  const semChamadaDupla = textos.every((t) => frases(t).every((s, i, a) => i === 0 || !(C.adsV2CtaLike(s, 'pt') && C.adsV2CtaLike(a[i - 1], 'pt'))))
  return C.adsV2VoiceCeilingSeconds(30) === 18.5 && C.adsV2SpeechCap(30) === 29 &&
    textos.every((t) => palavras(t) <= C.adsV2SpeechCap(30) && palavras(t) / C.ADS_V2_VOICE_WPS_SLOW <= 18.5) &&
    fechos.length >= 3 && new Set(fechos.map((f) => f.toLowerCase())).size === fechos.length && semChamadaDupla &&
    !/\d|R\$|%|grátis|desconto/i.test(fechos.join(' ')) // nada de fato inventado (número, preço, oferta) nos fechos
}
let FALA = null
try { FALA = await falaCurtaDuasVezes() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')') }
ok(!!FALA && tenta(() => pisoOk(FALA)), '8a principal CURTO duas vezes (17 palavras, re-pedido) → completado até o piso (≥ 27), sem speechShort; as versões B e C também ≥ 27')
ok(!!FALA && tenta(() => tetoOk(FALA)), '8b ≤ teto: no máximo 29 palavras = 18,5 s na voz mais lenta (1,6 pal/s; voice_too_long); fechos sem número/preço, NUNCA repetidos entre A/B/C e nunca duas chamadas seguidas')
const m13 = trocar(read(BRIEF_FALA), '  if (!checked.ok && fitOpts.speech && adsV2NarrationBelow(raw, fitOpts.speech.min)) {', '  if (false && !checked.ok && fitOpts.speech && adsV2NarrationBelow(raw, fitOpts.speech.min)) {')
ok(await (async () => { try { return !pisoOk(await falaCurtaDuasVezes({ [BRIEF_FALA]: m13 })) } catch { return true } })(), 'M13 o principal re-pedido e ainda curto volta a ser aceito como veio (speechShort) → 8a vermelho')

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
