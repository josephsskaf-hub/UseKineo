// KINEO-CELULAR-A-0611 — guardião sem rede: tema escuro só por padrão no celular, preferência salva vence, computador intacto.
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const ler = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const js = ts.transpileModule(ler('lib/ui/appearance.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const mod = { exports: {} }
vm.runInNewContext(js, { module: mod, exports: mod.exports })
const boot = mod.exports.APPEARANCE_BOOT
const roda = (src, salvo, celular) => {
  const document = { documentElement: { dataset: {} } }
  vm.runInNewContext(src, { document, localStorage: { getItem: () => salvo }, matchMedia: () => ({ matches: celular }) })
  return document.documentElement.dataset.theme
}
const prova = (src) => [
  roda(src, null, true) === 'dark',
  roda(src, null, false) === 'light',
  roda(src, 'light', true) === 'light',
  roda(src, 'dark', false) === 'dark',
  roda(src, 'qualquer', false) === 'light',
]
prova(boot).forEach((v, i) => checa('tema caso ' + (i + 1), v))
checa('mutante (claro salvo não vence) é pego', prova(boot.replace("s!=='light'&&", '')).includes(false))
const semMedia = { documentElement: { dataset: {} } }
vm.runInNewContext(boot, { document: semMedia, localStorage: { getItem: () => null } })
checa('navegador sem matchMedia fica no claro', semMedia.documentElement.dataset.theme === 'light')
const css = ler('app/appearance.css'), bloco = css.slice(css.indexOf('KINEO-CELULAR-A-0611'))
checa('menu lateral só abaixo de 768 px', /@media\(max-width:767px\)\{[\s\S]*\.klp \.nav-mobile-menu\{position:fixed!important;top:0!important/.test(bloco))
checa('barra de baixo some só no celular', /@media\(max-width:767px\)\{[\s\S]*\.kineo-mobile-nav\{display:none!important\}/.test(bloco))
const home = ler('app/KineoLanding.tsx')
for (const item of ['video', 'business', 'pricing', 'login']) checa('menu mantém ' + item, home.includes(`data-nav-item="${item}"`))
checa('tocar fora fecha o menu', bloco.includes('.klp .nav-toggle-input:checked{position:fixed;inset:0'))
checa('o arquivo da home não muda', !home.includes('KINEO-CELULAR-A-0611'))
const barra = ler('components/TopBar.tsx'), lado = ler('components/Sidebar.tsx')
checa('botão do menu com 44 px', barra.includes('md:hidden w-11 h-11'))
checa('idioma e aparência também na gaveta', lado.includes('kineo-gaveta-extras') && /kineo-gaveta-extras"><InterfaceLanguageSelect \/><AppearanceSettingsButton \/>/.test(lado))
checa('Sidebar importa o que usa', /InterfaceLanguageSelect/.test(lado.slice(0, lado.indexOf('export default'))) && /AppearanceSettingsButton/.test(lado.slice(0, lado.indexOf('export default'))))
const portas = ler('components/home/HomePortasCelular.tsx'), caixa = ler('components/studio/StudioSimples.tsx')
checa('portas só no celular', portas.includes('.kpc{display:none}') && portas.includes('@media(max-width:767px)'))
checa('imagens das portas não baixam no computador', (portas.match(/loading="lazy"/g) || []).length === 2)
checa('portas usam o mesmo destino dos cartões', portas.includes('homeCardHref(p.card, signedIn)') && portas.includes('homeKidsCardHref(signedIn)'))
for (const f of ['public/posters/ugc-porta.webp', 'public/home-images/perfume-splash.webp', 'public/kids-cartoon/leo.webp', 'public/posters/hero-seedance.webp', 'public/posters/galeria/knight-cat.webp']) checa('existe ' + f, fs.existsSync(f))
checa('evento novo não está na lista só do servidor', !ler('app/api/events/route.ts').includes('home_phone_box_clicked'))
checa('Generate segue com nome para leitor de tela', caixa.includes('aria-label="Generate"'))
checa('tela de criar: mudança só abaixo de 768 px', caixa.includes('.ksx-marca,.ksx-chip img{display:none}') && caixa.includes('@media (max-width:767px)'))
const entradas = css.slice(css.indexOf('KINEO-CELULAR-ENTRADAS-0611'))
checa('entradas no escuro só no celular', entradas.includes('@media(max-width:767px)') && entradas.includes("html[data-theme='dark'] .kpl{--kpl-bg:#07090D"))
checa('cor clara principal tem par escura', entradas.includes('[style*="color:#0E1116"]') && entradas.includes('[style*="background:#FFFFFF"]'))
checa('menu lateral nas entradas', entradas.includes('.kpn-menu{position:fixed!important') && entradas.includes('.kpn-toggle input:checked{position:fixed!important'))
checa('entradas não mostram título de galeria sem galeria', entradas.includes('.kpl .kpc-tit{display:none!important}'))
checa('idioma no menu das entradas', ler('components/seo/PaginaClara.tsx').includes('<InterfaceLanguageSelect emMenu />'))
checa('véu do tema escuro abaixo do texto', css.includes('body::before{z-index:-1}'))
const ideiaJs = ts.transpileModule(ler('lib/growth/ideiaDaPagina.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const ideias = await import('data:text/javascript;base64,' + Buffer.from(ideiaJs).toString('base64'))
checa('nicho conhecido traz a ideia dele', ideias.ideiaDaPagina('/free-ai-shorts/horror') === 'The 3am rule you should never break')
checa('nicho desconhecido e home ficam sem ideia', ideias.ideiaDaPagina('/free-ai-shorts/xyz') === null && ideias.ideiaDaPagina('/') === null && ideias.ideiaDaPagina(null) === null)
checa('nome de propriedade não vira ideia', ideias.ideiaDaPagina('/free-ai-shorts/constructor') === null)
const fonteNichos = ler('app/free-ai-shorts/[niche]/page.tsx')
for (const [n, texto] of Object.entries(ideias.IDEIAS_DOS_NICHOS)) checa('ideia de ' + n + ' existe na página', fonteNichos.includes(texto))
checa('ideias das 2 páginas existem nelas', ler('app/free-ai-shorts-generator/page.tsx').includes(ideias.ideiaDaPagina('/free-ai-shorts-generator')) && ler('app/gerador-de-shorts-gratis/page.tsx').includes(ideias.ideiaDaPagina('/gerador-de-shorts-gratis')))
checa('link vira texto limpo', ideias.ideiaDoLink('  a   b ') === 'a b')
checa('link recusa lista, endereço e texto longo', ideias.ideiaDoLink(['a']) === '' && ideias.ideiaDoLink('https://x.com') === '' && ideias.ideiaDoLink('a'.repeat(201)) === '')
checa('endereço leva a ideia codificada', ideias.hrefDaCaixa('a b').endsWith('&ideia=a%20b') && !ideias.hrefDaCaixa(null).includes('ideia'))
const caixaSimples = ler('components/studio/StudioSimples.tsx')
checa('ideia só preenche: Generate continua no clique', caixaSimples.includes('useState(ideiaInicial)') && caixaSimples.includes('onClick={gerar}') && !/useEffect\([^\n]*gerar\(\)/.test(caixaSimples))
const cssTudo = ler('app/appearance.css'), primeira = cssTudo.slice(cssTudo.indexOf('KINEO-PRIMEIRA-TELA-CELULAR-0611'))
checa('aviso do teste sai só no celular e só na tela de criar', /@media\(max-width:767px\)\{\s*body:has\(\.ksx\) \.kineo-aviso-teste\{display:none!important\}/.test(primeira))
checa('as 2 formas do aviso têm a classe', (ler('components/TrialActiveBanner.tsx').match(/kineo-aviso-teste/g) || []).length === 2)
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1) }
console.log('TUDO OK')
