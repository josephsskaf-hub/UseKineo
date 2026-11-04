// KINEO-BOTOES-SEM-FREE-0411 · KINEO-CAIXA-GRATIS-VISIVEL-0411 · KINEO-CARDS-ANTES-DO-LOGIN-0411 · KINEO-ADS-SEM-PRECO-0411 — guardião sem rede da frente de 04/11, com mutantes.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
const carregar = (arq, mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === arq ? mutar(t) : t) })(arq)

// ═══ 1. Botões sem "free" ═══
const entrada = ler('lib/entryPolicy.ts')
const rotuloCurto = (t) => /ctaShort: 'Get started',/.test(t) && !/ctaShort: 'Start free'/.test(t)
checa('a porta curta diz Get started', rotuloCurto(entrada))
checa('mutante: Start free de volta fica vermelho', !rotuloCurto(entrada.replace("ctaShort: 'Get started',", "ctaShort: 'Start free',")))
const cards = carregar('lib/ui/homeThreeCards.ts')
const BOT = 'lib/ui/homeCardBotoes0411.ts'
const bot = carregar(BOT)
checa('cartão de anúncio: Make my ad', bot.homeCardBotao('product_ads', 'en', true) === 'Make my ad')
checa('cartão de UGC: Make my UGC ad', bot.homeCardBotao('ugc_ads', 'en', true) === 'Make my UGC ad')
checa('sem a amostra aberta para a pessoa, o rótulo de plano de sempre', bot.homeCardBotao('product_ads', 'en', false) === 'Make a product ad' && bot.homeCardBotao('ugc_ads', 'en', false) === 'Make a UGC ad')
const grátis = /\b(free|gr[aá]tis|gratuit|gratis|kostenlos|darmo|darmowa|[üu]cretsiz|бесплат|безкошт|مجان|مفت|मुफ़्त|miễn phí)/iu
const semGratis = (m) => Object.entries(m.HOME_CARD_BOTOES_0411).every(([, r]) => !grátis.test(r[0]) && !grátis.test(r[1]))
checa('nenhuma das 16 línguas diz grátis no botão do cartão', Object.keys(bot.HOME_CARD_BOTOES_0411).length === 16 && semGratis(bot) && Object.keys(cards.HOME_CARD_ADS_CTA).every((l) => bot.HOME_CARD_BOTOES_0411[l]))
const cardsMut = carregar(BOT, (t) => t.replace("'Fazer meu anúncio'", "'Anúncio grátis'"))
const homeTres = ler('components/home/HomeThreeCards.tsx')
checa('a home usa o rótulo novo', homeTres.includes('const adsCta = (card: HomeCardId) => homeCardBotao(card, language,'))
checa('mutante: uma língua com grátis fica vermelho', !semGratis(cardsMut))
checa('o cartão de desenho segue Make my cartoon', ler('lib/ui/homeKidsCard.ts').includes("'Make my cartoon'"))
checa('home: Make my film segue igual', ler('components/home/HomeThreeCards.tsx').includes('<UiLabel>Make my film</UiLabel>'))
checa('cadastro e modal: Create account', ler('app/(auth)/signup/page.tsx').includes("'⚡ Create account'") && ler('components/AuthModal.tsx').includes("tab === 'signup' ? 'Create account' : 'Sign In'") && !ler('app/(auth)/signup/page.tsx').includes("'⚡ Create Free Account'"))
checa('barra lateral do visitante sem free', ler('components/Sidebar.tsx').includes("'Get started →'") && !ler('components/Sidebar.tsx').includes("'Get Started Free →'"))
const botoes = carregar('lib/ui/interfaceBotoes0411.ts').INTERFACE_BOTOES_0411
for (const l of ['pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi']) checa(`Get started traduzido em ${l}, sem grátis`, typeof botoes[l]?.['Get started'] === 'string' && !grátis.test(botoes[l]['Get started']))
checa('as tabelas de língua somam o rótulo novo', ler('lib/ui/interfaceDictionaries.ts').includes('{ ...m.DICT, ...INTERFACE_BOTOES_0411[language] }'))
checa('o evento e o link do cartão não mudaram', cards.HOME_CARD_EVENT === 'home_card_clicked' && cards.homeCardHref('product_ads', false) === `/signup?redirect=${encodeURIComponent('/ads/v2?entry=product&utm_source=home_card')}`)
checa('o filme grátis segue: a linha de oferta da home continua', ler('app/KineoLanding.tsx').includes("'First {s}-second film free, watermarked'"))

// ═══ 2. A linha do filme grátis ═══
const G = 'lib/growth/filmeGratisNaCaixa.ts'
const g = carregar(G)
const base = { credits: 25, hasPaid: false, entitlementsResolved: true, isStarter: false, isCreator: false, isStudio: false, filmsDelivered: 0, trial: { phase: 'active', creditsGranted: 25, creditsUsedForDisplay: 0, msLeft: 86400000 } }
const com = (over, trial = {}) => ({ ...base, ...over, trial: { ...base.trial, ...trial } })
checa('a frase é a do fundador', g.LINHA_DO_FILME_GRATIS === '1 free film left · 15 s' && g.EVENTO_DA_LINHA === 'studio_free_film_line_shown')
checa('trial ativo sem gasto e sem filme: mostra', g.filmeGratisNaCaixa(base) === true)
const nao = {
  'corpo nulo': null, 'corpo de erro': { error: 'Unauthorized' }, 'fase none (a pedido, sem pedir)': com({}, { phase: 'none', creditsGranted: 0 }), 'fase ending': com({}, { phase: 'ending' }),
  'já pagou': com({ hasPaid: true }), 'pagamento desconhecido': com({ hasPaid: undefined }), 'direitos não lidos': com({ entitlementsResolved: false }), 'assinante': com({ isCreator: true }),
  'sem concessão': com({}, { creditsGranted: 0 }), 'sem prazo': com({}, { msLeft: null }), 'já gastou': com({}, { creditsUsedForDisplay: 5 }), 'uso desconhecido': com({}, { creditsUsedForDisplay: null }),
  'saldo não cobre': com({ credits: 1 }), 'saldo desconhecido': com({ credits: null }), 'já recebeu filme': com({ filmsDelivered: 1 }), 'filmes desconhecidos': com({ filmsDelivered: null }),
}
for (const [nome, corpo] of Object.entries(nao)) checa(`${nome}: não mostra`, g.filmeGratisNaCaixa(corpo) === false)
const gMut = carregar(G, (t) => t.replace("if (d.filmsDelivered !== 0) return false", ''))
checa('mutante: sem a guarda de filme entregue fica vermelho', gMut.filmeGratisNaCaixa(com({ filmsDelivered: 1 })) === true)
const gMut2 = carregar(G, (t) => t.replace("d.hasPaid !== false", 'd.hasPaid === true'))
checa('mutante: pagamento desconhecido liberado fica vermelho', gMut2.filmeGratisNaCaixa(com({ hasPaid: undefined })) === true)
const caixa = ler('components/studio/StudioSimples.tsx')
checa('a caixa pergunta ao servidor, só com cookie de sessão', caixa.includes('temCookieDeSessao(document.cookie)') && caixa.indexOf('temCookieDeSessao(document.cookie)') < caixa.indexOf("fetch('/api/credits'"))
checa('a linha só nasce do estado provado e mede', caixa.includes('{temFilmeGratis ? <p') && caixa.includes('useState(false) // KINEO-CAIXA-GRATIS-VISIVEL-0411') && caixa.includes('trackEvent(EVENTO_DA_LINHA'))

// ═══ 3. Cartões antes do login ═══
const V = 'lib/growth/visitanteEscreveAntes.ts'
const v = carregar(V)
const d = (r) => v.destinoDoVisitanteQueEscreve('/signup', r)
const via = (href) => new URLSearchParams(href.split('?')[1]).get('redirect')
const kids = carregar('lib/ui/homeKidsCard.ts')
checa('cartão de anúncio vai direto', d(via(cards.homeCardHref('product_ads', false))) === cards.homeCardHref('product_ads', true))
checa('cartão de UGC vai direto', d(via(cards.homeCardHref('ugc_ads', false))) === cards.homeCardHref('ugc_ads', true))
checa('cartão de desenho vai direto', d(via(kids.homeKidsCardHref(false))) === kids.homeKidsCardHref(true))
const seguem = ['/ads/v2', '/ads/v2?entry=product', '/ads/v2?entry=product&utm_source=google', '/ads/v2?entry=other&utm_source=home_card', '/ads/v2?entry=product&utm_source=home_card&order=1', '/ads/v2?entry=product&utm_source=ads_door', '/kids-cartoon', '/kids-cartoon?utm_source=google', '/kids-cartoon?utm_source=home_card&x=1', '/clips', '/pricing', 'https://evil.example/ads/v2?entry=product&utm_source=home_card', '//evil.example/kids-cartoon?utm_source=home_card']
for (const r of seguem) checa(`${r} segue pelo cadastro`, d(r) === null)
const volta = v.cadastroComVolta('/ads/v2?entry=product&utm_source=home_card')
checa('o pedido de login leva a marca da volta e não entra em laço', volta === `/signup?redirect=${encodeURIComponent('/ads/v2?entry=product&utm_source=home_card&volta=1')}` && d(via(volta)) === null)
checa('volta do desenho também', d(via(v.cadastroComVolta('/kids-cartoon?utm_source=home_card'))) === null)
const vMut = carregar(V, (t) => t.replace("if (chaves.length !== 2 || !chaves.includes('entry') || !chaves.includes('utm_source')) return null", ''))
checa('mutante: aceitar parâmetro a mais fica vermelho', vMut.destinoDoVisitanteQueEscreve('/signup', '/ads/v2?entry=product&utm_source=home_card&volta=1') !== null)
const vMut2 = carregar(V, (t) => t.replace('url.searchParams.get(\'utm_source\') === ORIGEM_DO_CARTAO && ', ''))
checa('mutante: o botão da porta desviando o cadastro fica vermelho', vMut2.destinoDoVisitanteQueEscreve('/signup', '/ads/v2?entry=product&utm_source=ads_door') !== null)
checa('a página abre sem conta só com a origem certa', v.anuncioAbreSemConta('product', 'home_card') && v.anuncioAbreSemConta('ugc', 'ads_door') && !v.anuncioAbreSemConta('product', 'google') && !v.anuncioAbreSemConta(null, 'home_card') && v.desenhoAbreSemConta('home_card') && !v.desenhoAbreSemConta(undefined))
checa('cookie de sessão: o mesmo teste do middleware', v.temCookieDeSessao('a=1; sb-abc-auth-token=x') && !v.temCookieDeSessao('a=1; sb-abc=x') && !v.temCookieDeSessao(''))
const pgAds = ler('app/(dashboard)/ads/v2/page.tsx')
const guardaAds = (t) => t.indexOf('anuncioAbreSemConta(entry') > 0 && t.indexOf('anuncioAbreSemConta(entry') < t.indexOf('if (!user) redirect(`/login') && t.indexOf('<AdsV2Client guest') < t.indexOf('if (!user) redirect(`/login')
checa('/ads/v2: visitante só pelo caminho estreito; o resto continua no login', guardaAds(pgAds) && pgAds.includes('!isUuid(resumeOrder) && !bfCampaign'))
checa('mutante: sem a porta do visitante fica vermelho', !guardaAds(pgAds.replace('anuncioAbreSemConta(entry', 'true || (entry')))
const pgKids = ler('app/(dashboard)/kids-cartoon/page.tsx')
checa('/kids-cartoon: visitante sem o painel de venda', pgKids.includes('return <KidsCartoonTemplate visitante />') && pgKids.indexOf('<KidsCartoonTemplate visitante />') < pgKids.indexOf('if (!user) redirect(`/login') && !pgKids.split('if (!user) redirect(`/login')[0].includes('<KidsVendaPanel'))
const esc = ler('app/(dashboard)/ads/v2/AdsV2Escolha.tsx')
for (const [n, a] of [['planejar', "if (guest) return pedirLogin(action)"], ['ler o link', "if (url) pedirLogin('link')"], ['subir a foto', "if (guest) return pedirLogin('photo')"]]) checa(`Escolha: ${n} pede login antes de chamar a API`, esc.includes(a))
checa('Escolha: a ordem no run é login antes de tudo', esc.indexOf('if (guest) return pedirLogin(action)') < esc.indexOf("fetch('/api/ads/v2/cena'"))
checa('Escolha: guarda antes de sair e restaura na volta', esc.includes('guardarRascunhoDoAnuncio(form, linkUrl)') && esc.includes('lerRascunhoDoAnuncio<Form>()'))
const cli = ler('app/(dashboard)/ads/v2/AdsV2Client.tsx')
checa('invólucro: visitante não pergunta marcas nem saldo nem pedidos', cli.includes('useAdsBrands(!guest)') && cli.includes('if (guest) return // KINEO-CARDS-ANTES-DO-LOGIN-0411') && cli.includes('{!guest && (mode ==='))
const kt = ler('components/kidsCartoon/KidsCartoonTemplate.tsx')
checa('desenho: o visitante não chama a API ao escrever', kt.indexOf('if (visitante) {') < kt.indexOf("fetch('/api/kids-cartoon/story'") && kt.includes('if (visitante) return'))
const R = 'lib/ads/rascunhoDoVisitante.ts'
const armazem = new Map()
const r = createOfflineLoader({ globals: { sessionStorage: { getItem: (k) => armazem.get(k) ?? null, setItem: (k, x) => armazem.set(k, x), removeItem: (k) => armazem.delete(k) } } })(R)
r.guardarRascunhoDoAnuncio({ foto: 'https://x/y.jpg', frase: 'Perfume', formato: 'ugc', outro: 'lixo' }, 'https://loja.example')
const lido = r.lerRascunhoDoAnuncio()
checa('rascunho: volta o texto, nunca a foto nem campo estranho', lido.campos.frase === 'Perfume' && lido.campos.formato === 'ugc' && !('foto' in lido.campos) && !('outro' in lido.campos) && lido.link === 'https://loja.example')
checa('rascunho: lido uma vez só', r.lerRascunhoDoAnuncio() === null)
r.guardarRascunhoDoDesenho({ character: 'mia', idea: 'x', ideaId: null, language: 'pt', duration: 15 })
checa('rascunho do desenho volta', r.lerRascunhoDoDesenho().character === 'mia' && r.lerRascunhoDoDesenho() === null)

// ═══ 4. Sem preço no /ads, passe fora de venda, Studio Ads aberto ═══
const O = 'lib/ads/offer.ts'
const of = carregar(O)
checa('o passe não está à venda', of.adsPassOnSale() === false && of.ADS_PASS_ON_SALE === false)
checa('o Studio Ads continua aberto (porta, índice, sitemap)', of.adsPassLive() === true)
checa('mutante: à venda de novo seria percebido', carregar(O, (t) => t.replace('export const ADS_PASS_ON_SALE = false', 'export const ADS_PASS_ON_SALE = true')).adsPassOnSale() === true)
const porta = ler('app/ads/page.tsx')
const miolo = (t) => t.slice(t.indexOf('export default async function StudioAdsPage'), t.indexOf('const ADS_DOOR_CSS'))
const semPreco = (t) => { const m = miolo(t); return !/ads-price"|>Price<|\{price\}|one-time|\/mo\b|\/month|US\$|\$\{?\d|AdsPaywall|KitBfBuyCard|CHECKOUT_HREF|pack=ads_pass|credits/.test(m) }
checa('/ads: nenhum preço, passe, plano, crédito ou Kit na tela', semPreco(porta))
checa('mutante: a seção de preço de volta fica vermelho', !semPreco(porta.replace('<header className="ads-hero">', '<h2 id="ads-price">Price</h2><header className="ads-hero">')))
checa('mutante: crédito por nível de volta fica vermelho', !semPreco(porta.replace('<b>{l.name}</b></div>', '<b>{l.name}</b><span>{l.credits} credits</span></div>')))
checa('/ads: um botão que abre o fluxo; visitante vai à tela sem conta', porta.includes('<DoorCta cta={cta} placement="hero" href={makerHref} />') && porta.includes('!viewer.signedIn ? ANUNCIO_DA_PORTA : MAKER_HREF'))
checa('/ads: fechado continua fora do índice; aberto continua indexado', porta.includes('...(adsPassLive() ? {} : { robots: { index: false, follow: true } })') && ler('app/sitemap.ts').includes("adsPassLive() ? [{ path: '/ads'"))
checa('o comando do passe não mudou de dono: o acesso de quem comprou segue', ler('lib/ads/access.ts').includes('ads_access_until') && ler('app/api/stripe/webhook/route.ts').includes('packMeta === ADS_PASS_ID'))
const co = ler('app/api/stripe/checkout/route.ts')
const ramo = co.slice(co.indexOf('if (packParam === ADS_PASS_ID) {'), co.indexOf('return await buildAdsPassAndRedirect(req, true)'))
checa('?pack=ads_pass vai para /pricing antes de abrir sessão', ramo.includes('if (!adsPassOnSale()) return NextResponse.redirect(`${req.nextUrl.origin}/pricing`)'))
const wiz = ler('app/(dashboard)/ads/new/AdsWizardClient.tsx')
checa('assistente: sem passe, a saída é See plans', !wiz.includes('pack=ads_pass') && !wiz.includes('adsPassPriceLabel') && !wiz.includes('Studio Ads pass') && wiz.includes('href="/pricing">See plans</Link>'))
checa('/ads/v2 sem o cartão do Kit com preço', !cli.includes('<KitBfBuyCard') && !cli.includes("from '@/components/ads/KitBfBuyCard'"))
checa('o Kit segue à venda: o componente e o /pricing continuam, o produto não foi apagado', fs.existsSync('components/ads/KitBfBuyCard.tsx') && ler('lib/ads/kitBfSale.ts').length > 0)
checa('pricing não oferece o passe por padrão', ler('lib/growth/pricingOfferBlocks.ts').includes('input.passLive ?? adsPassOnSale()'))
const fatos = carregar('lib/growth/studioAdsFacts.ts')
const fato = fatos.studioAdsFact()
checa('fatos públicos: Studio Ads existe, sem preço de passe', fato && fato.price === null && fato.credits === null && fato.kind === 'self_service_ad_maker' && !/US\$19|one-time pass|optional pass/i.test(`${fato.routingRule} ${fato.access.summary}`) && !fato.classic.includes.includes('One-time payment, no subscription'))
const seg = carregar('lib/growth/adsSegmentPresentation.ts')
checa('/ads/for: a FAQ não vende o passe', !('passPrice' in seg.adsSegmentOffer()))
checa('recusa sem passe na mensagem', !ler('lib/ads/renderContract.ts').includes('Studio Ads pass') && !ler('lib/ads/uploadFootage.ts').includes('Studio Ads pass'))
checa('a amostra grátis não mudou: a Escolha segue a mesma para quem pode', cli.includes('escolhaSample={escolhaSample}') && pgAds.includes('escolhaSampleAvailable={sampleAvailable}'))

console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
