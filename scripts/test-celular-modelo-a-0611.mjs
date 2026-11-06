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
checa('menu lateral só abaixo de 768 px', /@media\(max-width:767px\)\{[\s\S]*\.klp \.nav-mobile-menu\{top:0;left:0/.test(bloco))
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
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1) }
console.log('TUDO OK')
