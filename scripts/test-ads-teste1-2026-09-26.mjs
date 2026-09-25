// KINEO-ADS-TESTE1-2026-09-26 — guardião dos consertos do 1º teste de ponta a ponta do Cowork (relatório em
// docs/TESTE-STUDIO-ADS-2026-09-25.md). Cada prova usa o caso REAL que o teste achou.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const load = createOfflineLoader()

// 1. leitor de link: a imagem de compartilhamento repetida (com e sem query) não vira "2 fotos"; foto de produto primeiro
const L = load('@/lib/ads/linkReader')
const SHARE_ONLY = `<html lang="en"><head><title>Allbirds</title><meta property="og:image" content="https://cdn.allbirds.com/share.jpg"><meta property="og:image" content="https://cdn.allbirds.com/share.jpg?v=3"></head></html>`
const a = L.readLinkFacts(SHARE_ONLY, 'https://www.allbirds.com/')
checa('link: mesma imagem com/sem query conta uma vez', a.images.length === 1)
checa('link: só a imagem de compartilhamento = shareOnly (a tela pede fotos reais)', a.shareOnly === true)
checa('link: idioma da página lido do <html lang>', a.lang === 'en')
const PRODUCT = `<html lang="pt-BR"><head><meta property="og:image" content="/share.jpg"></head><body><img src="/logo.png"><img src="/img/tenis-1.jpg" width="800"><img src="/img/icon-cart.png" width="24"><img srcset="/img/tenis-2-400.jpg 400w, /img/tenis-2-1200.jpg 1200w"></body></html>`
const b = L.readLinkFacts(PRODUCT, 'https://loja.com.br/p')
checa('link: fotos de produto da página, maior do srcset, sem logo nem ícone pequeno', b.images[0] === 'https://loja.com.br/img/tenis-1.jpg' && b.images[1] === 'https://loja.com.br/img/tenis-2-1200.jpg' && !b.images.some((u) => /logo|icon/.test(u)))
checa('link: com foto de produto, a de compartilhamento não entra e shareOnly = false', !b.images.includes('https://loja.com.br/share.jpg') && b.shareOnly === false)
checa('link: lang pt de "pt-BR"', b.lang === 'pt')

// 2. oferta falsa e Flash offer sem oferta
const A = load('@/lib/ads/autoBrief')
const txt = "Allbirds — The World's Most Comfortable Shoes. Sapatos, flats e roupas feitos com materiais naturais. FREE shipping & returns. Website: allbirds.com."
const p1 = A.parseAutoBrief(JSON.stringify({ business: 'Allbirds — shoes', offer: 'sapatos, flats e roupas feitos com materiais naturais', cta: 'buy', contact: 'allbirds.com', extra: {} }), txt, 'en')
checa('oferta: lista de produtos não é oferta', p1.brief.offer === '' && p1.dropped.includes('offer_not_an_offer'))
const p2 = A.parseAutoBrief(JSON.stringify({ business: 'Allbirds — shoes', offer: 'FREE shipping & returns', cta: 'buy', contact: 'allbirds.com', extra: {} }), txt, 'en')
checa('oferta: "FREE shipping & returns" é oferta', p2.brief.offer === 'FREE shipping & returns')
const have = { photos: 3, videos: 0, logo: true }
checa('formato: sem prazo, nunca Flash offer (mesmo com oferta e palpite do GPT)', A.chooseAutoModel(p2.brief, have, 'oferta_relampago').model?.id !== 'oferta_relampago')
checa('formato: com oferta + prazo, Flash offer continua possível', A.chooseAutoModel({ ...p2.brief, extra: { deadline: 'until Friday' } }, have, 'oferta_relampago').model?.id === 'oferta_relampago')

// 3. roteiro que inventa urgência e fama é recusado
const SP = load('@/lib/ads/scriptPrompt')
const brief = { business: 'Allbirds — shoes', offer: 'FREE shipping & returns', cta: 'buy', contact: 'allbirds.com', language: 'en', tone: 'warm', audience: '', extra: {} }
for (const [frase, rot] of [['Only here, only this week.', 'only this week'], ['This offer ends soon, order now.', 'ends soon'], ['Trusted by countless satisfied customers.', 'trusted'], ['What sets us apart in the industry.', 'sets us apart'], ['Conhecido por peixes frescos em São Paulo.', 'conhecido por']])
  checa(`roteiro: "${rot}" sem apoio no brief é invenção`, SP.inventedClaims(frase, brief).length > 0)
checa('roteiro: urgência dita pelo brief é permitida', SP.inventedClaims('Only this week: free shipping.', { ...brief, offer: 'Free shipping only this week' }).length === 0)
checa('roteiro: frase comum não é barrada', SP.inventedClaims('Soft wool shoes you can wear all day. Order at allbirds.com.', brief).length === 0)
checa('prompt: proíbe urgência/fama e manda traduzir fato de outra língua', rd('lib/ads/scriptPrompt.ts').includes('Never add urgency') && rd('lib/ads/scriptPrompt.ts').includes('say it in the ad language'))

// 4. voz: telefone e site por extenso; preço intacto
const S = load('@/lib/ads/speakable')
checa('voz: WhatsApp do teste dígito por dígito, com o +', S.speakableForTts('WhatsApp +55 11 98765-4321.', 'pt') === 'WhatsApp mais cinco cinco, um um, nove oito sete seis cinco, quatro três dois um.')
checa('voz: domínio "allbirds.com" → "allbirds dot com"', S.speakableForTts('Order at allbirds.com today.', 'en') === 'Order at allbirds dot com today.')
checa('voz: domínio em pt com www e caminho', S.speakableForTts('acesse www.brasa.com.br/menu', 'pt') === 'acesse brasa ponto com ponto br')
checa('voz: preço e ano não viram telefone', S.speakableForTts('Jantar por R$189 em 2026, 50% off', 'pt') === 'Jantar por R$189 em 2026, 50% off')
checa('voz: e-mail não é tratado como site', S.speakableForTts('hi@shop.com', 'en') === 'hi@shop.com')
const RT = rd('app/api/ads/render/route.ts')
checa('render: só a VOZ usa o texto falado; o tempo das batidas acompanha', RT.includes('const narration = spokenBeats.join(\' \')') && RT.includes('beatStartTimes(spokenBeats.map(countWords)') && RT.includes('scene_captions: input.beats'))

// 5. idioma: link > texto > navegador
const AB = rd('app/api/ads/auto-brief/route.ts')
checa('idioma: página do link manda, depois o texto, depois o navegador', AB.includes("const lang = fromLink ?? narrationLanguage(detected) ?? narrationLanguage(body?.language_hint) ?? 'en'"))

// 6. tela
const W = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const ts = createRequire(import.meta.url)(join(root, 'node_modules', 'typescript'))
const fn = (name) => { const i = W.indexOf(`function ${name}(`); return W.slice(i, W.indexOf('\n}\n', i) + 3) }
const js = ts.transpileModule(`${fn('cardOffer')}\nmodule.exports = { cardOffer }`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const m = { exports: {} }; new Function('module', 'exports', js)(m, m.exports)
checa('cartão: oferta longa do Brasa vira "primeira parte · preço", sem inventar', m.exports.cardOffer('Jantar para dois com entrada, prato principal e taça de vinho por R$189, de terça a quinta até o fim do mês') === 'Jantar para dois com entrada · R$189')
checa('cartão: oferta curta fica igual', m.exports.cardOffer('Frete grátis') === 'Frete grátis')
checa('versões: herdam formato, legenda e trilha', W.includes('setRemix({ ...r, base: order, choices: choices[order.id] ?? null })') && W.includes('setCaptionStyle(remix.choices.captionStyle)'))
checa('versões: a tela diz que é A/B / tradução / formato', W.includes("'New version with a different opening (A/B)'"))
checa('reabrir: lista "Your ads" com "Open · more versions"', W.includes('Open · more versions') && W.includes('onOpenAd={(o) => {'))
checa('progresso: sem legenda não fala em captions', W.includes("(captions ? 'Adding captions and music' : 'Adding the music')"))
checa('botão selecionado visível', W.includes('.adsw .pill[aria-pressed="true"]{background:linear-gradient'))
checa('duração mostrada é a real', W.includes('About {chosenModel.seconds}–{Math.round((chosenModel.words[1] * 1.15) / 2.45 / 5) * 5} seconds'))

console.log(`test-ads-teste1-2026-09-26: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
