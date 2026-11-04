// KINEO-PAGINA-IGUAL-0411 [fundador 04/11: "tem uma diferença enorme… queria deixar tudo igual"] — guardião da porta /ads.
import fs from 'node:fs'
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const src = fs.readFileSync('app/ads/page.tsx', 'utf8')
const igual = (t) => {
  const hero = t.indexOf('<header className="ads-hero">')
  const amostra = t.indexOf('<DoorCta cta={cta} placement="hero"') // KINEO-ADS-SEM-PRECO-0411 — o botão único, dentro da página
  const fimHero = t.indexOf('</header>', hero)
  return hero > 0 && amostra > hero && amostra < fimHero && !t.includes('aria-label="Free first ad"')
}
checa('o botão principal mora dentro da página, para todos', igual(src))
checa('não existe mais o bloco acima da página', !src.includes('ads-banner ads-sample" role="region" aria-label="Free first ad"'))
checa('quem já tem acesso continua com "Make your ad"', src.includes('Make your ad <span') && src.includes('<DoorCta cta={cta} placement="hero"'))
checa('mutante com o bloco de volta fica vermelho', !igual(src.replace('<header className="ads-hero">', 'aria-label="Free first ad"<header className="ads-hero">')))
const home = fs.readFileSync('app/KineoLanding.tsx', 'utf8')
const semBarra = (h) => !h.includes('<StickyFreeShortCTA') && !h.includes('home_sticky_cta')
checa('home sem a barra fixa só de quem não está logado', semBarra(home))
checa('mutante com a barra de volta fica vermelho', !semBarra(home + '<StickyFreeShortCTA />'))
const ex = fs.readFileSync('app/examples/page.tsx', 'utf8')
checa('/examples: o botão do rodapé é igual para todos', ex.includes('<UiLabel>Open Studio →</UiLabel>') && !ex.includes('Create a Fast video'))
console.log(falhas ? falhas + ' falha(s)' : 'tudo verde')
process.exit(falhas ? 1 : 0)
