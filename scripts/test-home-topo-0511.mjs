// KINEO-HOME-TOPO-0511 [fundador 05/11: "deixar só Log in e Get started, o English vai no menu"; "cadê o presentinho?"; "colocar vários vídeos nossos, bons"] — guardião sem rede.
// Lê a fonte, executa as regras reais e confere os arquivos públicos. Cada mutante muda a fonte e precisa deixar ao menos uma verificação vermelha.
import fs from 'node:fs'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const raiz = process.cwd()
const F = {
  home: 'app/KineoLanding.tsx',
  pagina: 'app/page.tsx',
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
  checa('o menu do topo tem o seletor', menu.includes('<InterfaceLanguageSelect emMenu />'))
  checa('o seletor vem depois de Pricing', menu.indexOf('data-nav-item="pricing"') > 0 && menu.indexOf('<InterfaceLanguageSelect emMenu />') > menu.indexOf('data-nav-item="pricing"'))
  checa('à direita não sobra seletor', !direita.includes('InterfaceLanguageSelect'))
  checa('o menu compacto tem o seletor, depois de Pricing', compacto.includes('<InterfaceLanguageSelect emMenu />') && compacto.indexOf('<InterfaceLanguageSelect emMenu />') > compacto.indexOf('data-nav-item="pricing"'))
  const css = (seletor) => { const i = home.indexOf(seletor + '{'); return i < 0 ? '' : home.slice(i + seletor.length + 1, home.indexOf('}', i)) }
  const login = css('.klp .nav-login')
  checa('Log in e Get started: mesma altura', /height:40px/.test(login) && /height:40px/.test(css('.klp .nav-right>.btn-w,.klp .nav-right .nav-dashboard')))
  checa('Log in e Get started: mesma letra', /font-size:14px/.test(login) && /font-weight:650/.test(login) && direita.includes("fontSize: '14px'"))
  checa('o Log in segue escondido no compacto', home.indexOf('.klp .nav-login{display:inline-flex') < home.indexOf('.klp .nav-login{display:none}'))
  const seletor = css('.klp select.kineo-idioma-menu')
  checa('o seletor herda a letra do menu', /font:inherit/.test(seletor) && /color:inherit/.test(seletor) && /border:0/.test(seletor))
  checa('o seletor segue visível no foco do teclado', /\.kineo-idioma-menu:focus-visible\{outline:2px/.test(home))
  checa('no compacto o seletor vence o tema de .nav-right', home.includes('.klp .nav-right .nav-mobile-menu select.kineo-idioma-menu{width:100%!important'))
  const lingua = fonte(F.lingua)
  checa('é o mesmo seletor: mesma troca de idioma nos dois jeitos', (lingua.match(/onChange=\{event => choose\(parseInterfaceLanguage\(event\.target\.value\)\)\}/g) || []).length === 1)
  checa('sem emMenu, o seletor de sempre', lingua.includes("emMenu = false") && lingua.includes("'kineo-interface-language'}"))

  // ─── 2. O presente na home ───────────────────────────────────────────────────────────────────────────────────────────────────
  checa('o presente fica fora do .nav-cta, antes de Log in e dos créditos',
    direita.includes('<CaixaDePresente0511 visitante={!initialUser} filmeGratisNoPais={freeFilmInCountry} />')
    && direita.indexOf('<CaixaDePresente0511') < direita.indexOf('nav-login')
    && direita.indexOf('<CaixaDePresente0511') < direita.indexOf('<NavCreditsBadge'))
  checa('nada do presente dentro do .nav-cta', !direita.slice(direita.indexOf('className="nav-cta"')).includes('CaixaDePresente0511'))
  checa('a home lê o país com a régua que concede o crédito', fonte(F.pagina).includes("freeFilmInCountry={filmeGratisPermitido(headers().get('x-vercel-ip-country'))}"))
  checa('sem o dado do país, a caixa não promete', home.includes('freeFilmInCountry = false'))
  const R = load(F.regra)
  const { filmeGratisPermitido } = load('lib/freeFilmPolicy.ts')
  const { TRIAL_FREE_FILM_SECONDS } = load('lib/freeTierOffer.ts')
  const ids = (l) => l.map((x) => x.id).join()
  const comFilme = R.linhasDoVisitante(true)
  const semFilme = R.linhasDoVisitante(false)
  checa('visitante de país com grátis: filme e afiliado', ids(comFilme) === 'filme,afiliado')
  checa('visitante de país sem grátis: só o afiliado', ids(semFilme) === 'afiliado')
  checa('país fora da lista não recebe a promessa', filmeGratisPermitido('IN') === false && ids(R.linhasDoVisitante(filmeGratisPermitido('IN'))) === 'afiliado')
  checa('país da lista recebe', filmeGratisPermitido('US') === true && ids(R.linhasDoVisitante(filmeGratisPermitido('US'))) === 'filme,afiliado')
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
  checa('a página usa a lista', fonte(F.studio).includes('<StudioSimples filmes={filmesDaPorta0511()}'))
  checa('todo cartão tem pôster de verdade, em arquivo pequeno', filmes.every((f) => { const a = path.join(raiz, 'public', f.poster); return f.poster.startsWith('/posters/') && fs.existsSync(a) && fs.statSync(a).size > 2048 && fs.statSync(a).size < 80_000 }))
  const artemis = filmes.find((f) => f.id === ID_ARTEMIS)
  checa('o filme da Artemis, com o título e a primeira frase', artemis?.title === "NASA's rocket tore a hole in the sky" && artemis?.ideia === "NASA's rocket tore a hole in the sky.")
  checa('nada de Halloween nem preço no cartão', filmes.every((f) => !/halloween|catrina|\$|credit/i.test(`${f.title} ${f.ideia ?? ''}`)))
  const simples = fonte(F.simples)
  checa('o cartão parte da ideia, sem ela do título', simples.includes('setTexto(f.ideia ?? f.title)'))
  checa('4 colunas no computador e 2 no celular', simples.includes('.ksx-films{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))') && /@media \(max-width:560px\)\{\.ksx-films\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/.test(simples))
  checa('o Studio completo segue com a escolha dele', fonte(F.studio).includes('<StudioClient engineHeroes={engineHeroes} bestFilms={bestFilms} />') && fonte(F.studio).includes('const BEST_FILM_IDS = ['))

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
  'o seletor sai do menu do topo': troca(F.home, '<InterfaceLanguageSelect emMenu />{/* KINEO-HOME-TOPO-0511 — fundador', '{/* KINEO-HOME-TOPO-0511 — fundador'),
  'o seletor sai do menu compacto': troca(F.home, '<InterfaceLanguageSelect emMenu />{/* KINEO-HOME-TOPO-0511 — par do topo', '{/* KINEO-HOME-TOPO-0511 — par do topo'),
  'Log in menor que Get started': troca(F.home, '.klp .nav-login{display:inline-flex;align-items:center;height:40px;font-size:14px;font-weight:650', '.klp .nav-login{display:inline-flex;align-items:center;height:32px;font-size:12px;font-weight:550'),
  'o seletor perde o foco do teclado': troca(F.home, '.klp select.kineo-idioma-menu:focus-visible{outline:2px solid var(--blue);outline-offset:3px}', ''),
  'o presente some da home': troca(F.home, '<CaixaDePresente0511 visitante={!initialUser} filmeGratisNoPais={freeFilmInCountry} />', ''),
  'o presente entra no .nav-cta e some no celular': troca(F.home, '<div className="nav-cta"><NavCreditsBadge />', '<div className="nav-cta"><CaixaDePresente0511 /><NavCreditsBadge />'),
  'visitante tratado como conta': troca(F.home, 'visitante={!initialUser}', 'visitante={false}'),
  'filme grátis para qualquer país': troca(F.regra, 'if (filmeGratisNoPais) linhas.push', 'linhas.push'),
  'a home promete sem ler o país': troca(F.pagina, "filmeGratisPermitido(headers().get('x-vercel-ip-country'))", 'true'),
  'visitante vê oferta do anual': troca(F.regra, 'return [...linhas, ...linhasDaCaixa(CAIXA_SEM_LEITURA, 0)]', "return [...linhas, { id: 'anual', titulo: 'Your annual offer', href: '/pricing' }, ...linhasDaCaixa(CAIXA_SEM_LEITURA, 0)]"),
  'visitante vai à rede': troca(F.caixa, 'if (visitante) {', 'if (false) {'),
  'a porta com 11 filmes': troca(F.porta, "  'a09706da-a79f-4029-b213-69f43d6a2775', // a Ilha de Páscoa\n", ''),
  'filme repetido': troca(F.porta, "'a09706da-a79f-4029-b213-69f43d6a2775', // a Ilha de Páscoa", "'90bd8367-60c6-4811-8fdd-3a5b0200eec6',"),
  'a página volta para os 5 de antes': troca(F.studio, '<StudioSimples filmes={filmesDaPorta0511()}', '<StudioSimples filmes={[]}'),
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
