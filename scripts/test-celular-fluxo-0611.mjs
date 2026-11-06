// KINEO-CELULAR-FLUXO-0611 — guardião sem rede: cartão do ChatGPT compacto só no celular e saída do Cartoon para o filme grátis.
import fs from 'node:fs'
import ts from 'typescript'
const ler = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const css = ler('components/ChatGptWelcomeBanner.module.css')
const bloco = css.slice(css.indexOf('KINEO-CELULAR-FLUXO-0611'))
checa('compacto só abaixo de 768 px', /@media \(max-width: 767px\)/.test(bloco))
for (const c of ['.copy p', '.proof', '.noScript', '.ideaButton:disabled']) checa('celular esconde ' + c, bloco.includes(c))
checa('botão da ideia com texto continua visível', !/\.ideaButton\s*[,{]/.test(bloco.replace('.ideaButton:disabled', '')))
const jsx = ler('components/ChatGptWelcomeBanner.tsx')
checa('explicação segue no HTML para o computador', jsx.includes('Paste the complete answer with the labels intact'))
const js = ts.transpileModule(ler('lib/kidsVenda/filmeGratisDoDesenho.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const carrega = (src) => import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))
const rodar = async (src) => {
  const { filmeGratisAberto: f } = await carrega(src)
  return [
    f({ trial_status: 'active', video_credits: 10 }, 0) === true,
    f({ trial_status: 'on_request', video_credits: 0 }, 0) === true,
    f({ trial_status: 'active', video_credits: 0 }, 0) === false,
    f({ trial_status: 'active', video_credits: 10 }, 1) === false,
    f({ trial_status: 'active', video_credits: 10, has_paid: true }, 0) === false,
    f({ trial_status: 'region_paid_only', video_credits: 10 }, 0) === false,
    f({ trial_status: 'active', video_credits: 10 }, null) === false,
    f(null, 0) === false,
  ]
}
const r = await rodar(js)
r.forEach((v, i) => checa('regra caso ' + (i + 1), v))
const mut = await rodar(js.replace('filmesProntos !== 0', 'false'))
checa('mutante (ignora filme pronto) é pego', mut.includes(false))
const tela = ler('components/kidsCartoon/KidsCartoonTemplate.tsx')
checa('saída só para conta sem plano, logada, com filme aberto', tela.includes('semPlano && filmeGratis && !visitante'))
checa('o botão de desenho sem plano segue indo aos planos', tela.includes('data-kineo="kids-ver-planos"'))
const copy = ler('lib/kidsCartoon/kidsCartoon.ts')
checa('3 línguas', (copy.match(/freeFilmCta:/g) || []).length === 3)
checa('evento aceito', ler('app/api/events/route.ts').includes("'kids_cartoon_free_film_clicked'"))
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1) }
console.log('TUDO OK')
