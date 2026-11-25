// KINEO-HOME-TOPO-0511 [fundador 05/11: "deixar só Log in e Get started, o English vai no menu"; "cadê o presentinho?"; "colocar vários vídeos nossos, bons"] — guardião sem rede.
// Lê a fonte, executa as regras reais e confere os arquivos públicos. Cada mutante muda a fonte e precisa deixar ao menos uma verificação vermelha.
import fs from 'node:fs'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const raiz = process.cwd()
const F = {
  home: 'app/KineoLanding.tsx',
  pagina: 'app/page.tsx',
  settings: 'components/SiteSettingsMenu.tsx',
  tema: 'app/appearance.css',
  lingua: 'components/InterfaceLanguage.tsx',
  regra: 'lib/ui/caixaPresente0511.ts',
  caixa: 'components/CaixaDePresente0511.tsx',
  porta: 'lib/growth/filmesDaPorta0511.ts',
  studio: 'app/(dashboard)/studio/page.tsx',
  simples: 'components/studio/StudioSimples.tsx',
}
const lf = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8').replace(/\r\n/g, '\n')
const SRC = Object.fromEntries(Object.values(F).map((rel) => [rel, lf(rel)]))

const ID_ARTEMIS = '99ad7d12-270c-488d-a6d3-ce7d79095968'
const QUATRO_CARDS = { film: 'home-card-trailer-film', cartoon: 'home-card-trailer-cartoon' }

function problemas(mut = {}) {
  const p = []
  const checa = (nome, c) => { if (!c) p.push(nome) }
  const fonte = (rel) => mut[rel] ?? SRC[rel]
  const load = createOfflineLoader({ source: (rel, t) => mut[rel] ?? t })

  // ─── 1. O topo: o seletor no menu, só Log in e Get started à direita ─────────────────────────────────────────────────────────
  const home = fonte(F.home)
  const iLinks = home.indexOf('<div className="nav-links" data-nav-surface="top"')
  const iDireita = home.indexOf('<div className="nav-right">', iLinks)
  const iCompacto = home.indexOf('id="mobile-nav-menu"', iDireita)
  const iFimCompacto = home.indexOf('</label>', iCompacto)
  const menu = home.slice(iLinks, iDireita)
  const direita = home.slice(iDireita, iCompacto)
  const compacto = home.slice(iCompacto, iFimCompacto)
  checa('idioma dentro das configurações', fonte(F.settings).includes('<InterfaceLanguageSelect />'))
  checa('menu comum ao desktop e celular', direita.includes('<SiteSettingsMenu signedIn={isSignedIn} />'))
  // KINEO-PRICING-NO-MENU-1911 — o fundador moveu Pricing para a lista depois do conector em 19/11 às 19:38.
  const pricing = 'href="/pricing" data-nav-item="pricing"'
  checa('Pricing no topo depois do conector, no compacto e fora da direita', menu.split(pricing).length === 2 && menu.indexOf('MENU_CONNECTOR_HREF') < menu.indexOf(pricing) && compacto.split(pricing).length === 2 && !direita.includes('data-nav-item="pricing"'))
  checa('à direita não sobra seletor', !direita.includes('InterfaceLanguageSelect'))
  checa('idioma sai da navegação e do menu compacto', !menu.includes('<InterfaceLanguageSelect') && !compacto.includes('<InterfaceLanguageSelect'))
  const css = (seletor) => { const i = home.indexOf(seletor + '{'); return i < 0 ? '' : home.slice(i + seletor.length + 1, home.indexOf('}', i)) }
  const login = css('.klp .nav-login')
  checa('Log in e Get started: mesma altura', /height:40px/.test(login) && /height:40px/.test(css('.klp .nav-right>.btn-w,.klp .nav-right .nav-dashboard')))
  checa('Log in e Get started: mesma letra', /font-size:14px/.test(login) && /font-weight:650/.test(login) && direita.includes("fontSize: '14px'"))
  checa('o Log in segue escondido no compacto', home.indexOf('.klp .nav-login{display:inline-flex') < home.indexOf('.klp .nav-login{display:none}'))
  checa('foco visível no seletor', fonte(F.tema).includes('.site-settings-dialog select:focus-visible'))
  const lingua = fonte(F.lingua)
  checa('é o mesmo seletor: mesma troca de idioma nos dois jeitos', (lingua.match(/onChange=\{event => choose\(parseInterfaceLanguage\(event\.target\.value\)\)\}/g) || []).length === 1)
  checa('sem emMenu, o seletor de sempre', lingua.includes("emMenu = false") && lingua.includes("'kineo-interface-language'}"))

  // ─── 2. O presente na home ───────────────────────────────────────────────────────────────────────────────────────────────────
  checa('o presente fica fora do .nav-cta, antes de Log in e dos créditos',
    direita.includes('<CaixaDePresente0511 visitante={!initialUser} filmeGratisNoPais={freeFilmInCountry} />')
    && direita.indexOf('<CaixaDePresente0511') < direita.indexOf('nav-login')
    && direita.indexOf('<CaixaDePresente0511') < direita.indexOf('<NavCreditsBadge'))
  checa('nada do presente dentro do .nav-cta', !direita.slice(direita.indexOf('className="nav-cta"')).includes('CaixaDePresente0511'))
  // KINEO-GOOGLE-FAXINA-1011 — a caixa do visitante é IGUAL para todo país (com a cláusula); a home não lê mais o país do IP.
  checa('a home NÃO lê o país do IP', !fonte(F.pagina).includes("headers().get('x-vercel-ip-country')") && !fonte(F.pagina).includes('freeFilmInCountry='))
  checa('sem o dado do país, a caixa não promete', home.includes('freeFilmInCountry = false'))
  const R = load(F.regra)
  const { filmeGratisPermitido } = load('lib/freeFilmPolicy.ts')
  const { TRIAL_FREE_FILM_SECONDS } = load('lib/freeTierOffer.ts')
  const ids = (l) => l.map((x) => x.id).join()
  const comFilme = R.linhasDoVisitante()
  const { FREE_FILM_COUNTRY_CLAUSE } = load('lib/freeFilmPolicy.ts')
  checa('visitante (qualquer país): filme, conector e afiliado', ids(comFilme) === 'filme,claude,chatgpt,afiliado') // KINEO-PRESENTE-CONECTOR-0911
  checa('a linha não depende do argumento antigo (país)', ids(R.linhasDoVisitante(false)) === ids(R.linhasDoVisitante(true)) && R.linhasDoVisitante(false)[0].titulo === R.linhasDoVisitante(true)[0].titulo)
  checa('a linha leva a cláusula do país, enquanto a régua de país valer', filmeGratisPermitido('IN') === false && FREE_FILM_COUNTRY_CLAUSE === ' in supported countries' && comFilme[0]?.titulo === 'Your first film is free in supported countries')
  checa('a linha do filme diz a duração que cobra', comFilme[0]?.detalhe === `${TRIAL_FREE_FILM_SECONDS} s, no card`)
  checa('a linha do filme abre o cadastro no modal', comFilme[0]?.href.startsWith('/signup') && comFilme[0]?.modal === 'signup' && fonte(F.caixa).includes('data-auth-modal={linha.modal}'))
  const texto = comFilme.flatMap((l) => [l.titulo, l.detalhe ?? '']).join(' ')
  checa('visitante não vê preço nem desconto do plano', !/\$|\boff\b|annual|anual|Ends in/i.test(texto) && comFilme.every((l) => l.venceEmMs === undefined))
  const caixa = fonte(F.caixa)
  const abrir = caixa.slice(caixa.indexOf('const abrir = () => {'), caixa.indexOf('const tirarVencidas'))
  checa('visitante: abrir não vai à rede', abrir.indexOf('if (visitante) {') >= 0 && abrir.indexOf('return\n') > abrir.indexOf('if (visitante) {') && abrir.indexOf('return\n') < abrir.indexOf('lerCaixa('))
  checa('quem entrou lê a conta de verdade', abrir.includes('lerCaixa(fetch, pedido.signal)'))
  checa('o interruptor de promoção segue desligado', load('lib/growth/promoCards.ts').PROMO_CARDS_LIVE === false)

  // ─── 3. A porta do Studio: 12 filmes bons ────────────────────────────────────────────────────────────────────────────────────
  const { filmesDaPorta0511 } = load(F.porta)
  const filmes = filmesDaPorta0511()
  checa('12 filmes: 4 x 3 e 2 x 6, sem cartão sobrando', filmes.length === 12 && filmes.length % 4 === 0 && filmes.length % 2 === 0)
  checa('nenhum filme repetido', new Set(filmes.map((f) => f.id)).size === filmes.length)
  checa('a página usa a lista', /<StudioSimples\b[^>]*\bfilmes=\{filmesDaPorta0511\(\)\}/.test(fonte(F.studio)))
  checa('todo cartão tem pôster de verdade, em arquivo pequeno', filmes.every((f) => { const a = path.join(raiz, 'public', f.poster); return f.poster.startsWith('/posters/') && fs.existsSync(a) && fs.statSync(a).size > 2048 && fs.statSync(a).size < 80_000 }))
  const artemis = filmes.find((f) => f.id === ID_ARTEMIS)
  checa('o filme da Artemis, com o título e a primeira frase', artemis?.title === "NASA's rocket tore a hole in the sky" && artemis?.ideia === "NASA's rocket tore a hole in the sky.")
  checa('nada de Halloween nem preço no cartão', filmes.every((f) => !/halloween|catrina|\$|credit/i.test(`${f.title} ${f.ideia ?? ''}`)))
  const simples = fonte(F.simples)
  checa('o cartão parte da ideia, sem ela do título', simples.includes('setTexto(f.ideia ?? f.title)'))
  checa('4 colunas no computador e 2 no celular', simples.includes('.ksx-films{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))') && /@media \(max-width:560px\)\{\.ksx-films\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/.test(simples))
  checa('o Studio completo segue com a escolha dele', /<StudioClient\b[^>]*\bengineHeroes=\{engineHeroes\}[^>]*\bbestFilms=\{bestFilms\}/.test(fonte(F.studio)) && fonte(F.studio).includes('const BEST_FILM_IDS = ['))

  // ─── 4. Os dois trailers no limite de card ───────────────────────────────────────────────────────────────────────────────────
  for (const nome of Object.values(QUATRO_CARDS)) {
    const b = fs.readFileSync(path.join(raiz, 'public/previews', nome + '.mp4'))
    checa(`${nome}: até 1,5 MB`, b.length <= 1_500_000)
    checa(`${nome}: faststart`, b.indexOf('moov') > 0 && b.indexOf('moov') < b.indexOf('mdat'))
    checa(`${nome}: sem faixa de áudio`, b.indexOf('soun') < 0)
    checa(`${nome}: pôster`, fs.statSync(path.join(raiz, 'public/posters', nome + '.webp')).size > 1024)
  }
  return p
}

const troca = (rel, de, para) => { if (!SRC[rel].includes(de)) throw new Error(`mutante não encaixa em ${rel}: ${de}`); return { [rel]: SRC[rel].replace(de, para) } }
const MUTANTES = {
  'o seletor volta para a direita': troca(F.home, '<div className="nav-right">\n', '<div className="nav-right">\n          <InterfaceLanguageSelect />\n'),
  'idioma sai das configurações': troca(F.settings, '<InterfaceLanguageSelect />', ''),
  'configurações somem do topo': troca(F.home, '<SiteSettingsMenu signedIn={isSignedIn} />', ''),
  'Pricing volta para a direita': { [F.home]: troca(F.home, '            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>{/* KINEO-PRICING-NO-MENU-1911 */}\n', '')[F.home].replace('<div className="nav-right">', '<div className="nav-right"><Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>') },
  'Log in menor que Get started': troca(F.home, '.klp .nav-login{display:inline-flex;align-items:center;height:40px;font-size:14px;font-weight:650', '.klp .nav-login{display:inline-flex;align-items:center;height:32px;font-size:12px;font-weight:550'),
  'o seletor perde o foco do teclado': troca(F.tema, '.site-settings-dialog select:focus-visible', '.missing'),
  'o presente some da home': troca(F.home, '<CaixaDePresente0511 visitante={!initialUser} filmeGratisNoPais={freeFilmInCountry} />', ''),
  'o presente entra no .nav-cta e some no celular': troca(F.home, '<NavCreditsBadge opensAccount />', '<CaixaDePresente0511 /><NavCreditsBadge opensAccount />'),
  'visitante tratado como conta': troca(F.home, 'visitante={!initialUser}', 'visitante={false}'),
  'a linha perde a cláusula do país': troca(F.regra, 'Your first film is free${FREE_FILM_COUNTRY_CLAUSE}`', 'Your first film is free`'),
  'a linha volta a depender do país': troca(F.regra, "  const linhas: CaixaLinha[] = [{ id: 'filme',", "  const linhas: CaixaLinha[] = arguments[0] === false ? [] : [{ id: 'filme',"),
  'a home volta a ler o país': troca(F.pagina, '        initialUser={user ? { id: user.id } : null}\n', "        initialUser={user ? { id: user.id } : null}\n        freeFilmInCountry={filmeGratisPermitido(headers().get('x-vercel-ip-country'))}\n"),
  'visitante vê oferta do anual': troca(F.regra, 'return [...linhas, ...linhasDaCaixa(CAIXA_SEM_LEITURA, 0)]', "return [...linhas, { id: 'anual', titulo: 'Your annual offer', href: '/pricing' }, ...linhasDaCaixa(CAIXA_SEM_LEITURA, 0)]"),
  'visitante vai à rede': troca(F.caixa, 'if (visitante) {', 'if (false) {'),
  'a porta com 11 filmes': troca(F.porta, "  'a09706da-a79f-4029-b213-69f43d6a2775', // a Ilha de Páscoa\n", ''),
  'filme repetido': troca(F.porta, "'a09706da-a79f-4029-b213-69f43d6a2775', // a Ilha de Páscoa", "'90bd8367-60c6-4811-8fdd-3a5b0200eec6',"),
  'a página volta para os 5 de antes': troca(F.studio, 'filmes={filmesDaPorta0511()}', 'filmes={[]}'),
  'o cartão ignora a ideia': troca(F.simples, 'setTexto(f.ideia ?? f.title)', 'setTexto(f.title)'),
  'pôster que não existe': troca(F.porta, '`/posters/studio-door-${id}.webp`', '`/posters/nao-existe-${id}.webp`'),
}

let falhou = false
const base = problemas()
if (base.length) { falhou = true; console.log('FALHA na fonte real:'); for (const n of base) console.log('  ' + n) } else console.log('ok  a fonte real passa em tudo')
for (const [nome, mut] of Object.entries(MUTANTES)) {
  let vermelhas
  try { vermelhas = problemas(mut) } catch (err) { vermelhas = ['estourou: ' + String(err?.message ?? err).slice(0, 120)] }
  if (vermelhas.length === 0) { falhou = true; console.log(`FALHA mutante passou: ${nome}`) } else console.log(`ok  mutante vermelho (${vermelhas.length}): ${nome} → ${vermelhas[0]}`)
}
if (falhou) process.exit(1)
console.log(`\nok  ${Object.keys(MUTANTES).length} mutantes vermelhos, fonte real verde`)
