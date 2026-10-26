// KINEO-PRECO-VISIVEL-2026-09-02 — as 4 mudanças aprovadas pelo fundador depois
// da auditoria de nove concorrentes (Higgsfield, Hailuo, Runway, Pika, InVideo,
// OpusClip, Luma, Kling, Canva/Adobe). Achado: quem tem MUITOS motores mostra o
// preço antes do clique (Higgsfield imprime no botão Generate; Hailuo recalcula
// ao vivo); quem esconde tem 3 tiers, não 8 motores. Nós tínhamos o perfil do
// primeiro grupo e a comunicação do segundo.
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { posix } from 'node:path'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

const studio = src('app/(dashboard)/studio/StudioClient.tsx')
const models = src('app/models-pricing/page.tsx')
const sitemap = src('app/sitemap.ts')
const cost = src('lib/credits/engineCost.ts')

console.log('1 · seletor: padrão, selo e preço por card')
// Reancorado 29/09 (KINEO-ENTRADA-SEEDANCE15, E2b): o padrão segue o interruptor da entrada — Kineo 1 enquanto
// SEEDANCE_15S_PUBLIC=false (o de 02/09), Seedance quando a entrada de 15 s abrir (decisão do fundador de 29/09).
check('padrão volta a ser Kineo 1 (era seedance)', studio.includes("useState<EngineKey>(SEEDANCE_15S_PUBLIC ? 'seedance' : 'fast')"))
check('a razão do padrão está escrita, com os números de 30 dias', studio.includes('102 das 142 pararam ali') && studio.includes('3,6 videos'))
check("Kineo 1 ganha o selo 'Start here'", studio.includes("name: 'Kineo 1', tag: 'Start here'"))
check("Kineo 1 deixa de se descrever como ficha técnica", !studio.includes("desc: 'Kineo’s own engine — stock + captions'"))
check("'Popular' sai do Seedance (não era escolha, era padrão)", !studio.includes("name: 'Seedance 1.5', tag: 'Popular'"))
check('cada card do seletor mostra o custo', studio.includes('<i>{engineCostLabel(e.key)}</i>'))
check('cada card do seletor mostra quantos filmes o saldo compra', studio.includes('{filmsLabel(e.key)}'))
check('a nota de 18/08 ("preço não mora no seletor") foi revertida com a evidência nova', studio.includes('REVERTE O #2026-08-18') && studio.includes('shown on the Generate button before you'))

console.log('2 · custo no botão (padrão Higgsfield/Hailuo)')
check('o botão imprime o custo', studio.includes('`Generate · ${cost} cr →`'))
check('botão sem saldo continua dizendo quanto falta', studio.includes('`Need ${cost - balance} more credits`'))
check('custo 0 (free) não vira "0 cr" no botão', studio.includes("cost > 0\n                      ? `Generate · ${cost} cr →`") || studio.includes('cost > 0'))

console.log('3 · saldo em filmes + estorno visível')
check('linha "Your credits buy N films like this"', studio.includes('Your credits buy') && studio.includes("t('film', 'vídeo')") && studio.includes("t('films', 'vídeos')"))
check('a linha usa a MESMA função que o servidor cobra', studio.includes('creditCostForDuration(ENGINE_QUALITY[key]'))
check('nunca mostra "0 films" (só aparece com pelo menos 1)', studio.includes('Math.floor(balance / cost) > 0'))
check('promessa de estorno visível na tela de gerar', studio.includes('If a render fails, your credits come straight back'))

console.log('4 · página pública /models-pricing')
check('a página existe', models.length > 1000)
check('preço por FILME pronto, não por clipe de 5s', models.includes('finished film') && models.includes('not per 5-second clip'))
check('as três durações reais (35/60/90)', models.includes('const LENGTHS = [35, 60, 90] as const'))
check('coluna de saldo trial lê o grant canônico', models.includes('Your {TRIAL_CREDITS_SHOWN} trial credits') && /import \{[^}]*TRIAL_CREDITS_SHOWN[^}]*\} from '@\/lib\/freeTierOffer'/.test(models))
check('preço vem da função que cobra, não de número chumbado', models.includes('creditCostForDuration(r.quality, true, s)'))
check('preço do plano vem da fonte da Stripe', models.includes('STARTER_CREDITS') && models.includes('STARTER_USD_AMOUNT'))
check('S25 só aparece com o interruptor público ligado', models.includes('S25_PUBLIC'))
check('promessa de estorno também na página', models.includes('credits come straight\n        back') || models.includes('credits come straight'))
check('FAQ estruturado para o Google/AEO', models.includes("'@type': 'FAQPage'"))
check('entrou no sitemap', sitemap.includes("{ path: '/models-pricing'"))

console.log('aritmética (a mesma régua do servidor)')
// Execute the real canonical implementation; never maintain another price table.
const pureModules = new Map()
function loadPure(file) {
  if (pureModules.has(file)) return pureModules.get(file)
  const module = {exports:{}}
  pureModules.set(file,module.exports)
  const output = ts.transpileModule(src(file), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  new Function('require','module','exports','process',output)(id => {
    const target = id.startsWith('@/lib/') ? id.slice(2) + '.ts' : id.startsWith('./') ? posix.join(posix.dirname(file),id) + '.ts' : null
    if (!target || !target.startsWith('lib/')) throw Error('Unexpected pure dependency ' + id)
    return loadPure(target)
  },module,module.exports,{env:{}})
  pureModules.set(file,module.exports); return module.exports
}
const {creditCostFor,creditCostForDuration:forDuration} = loadPure('lib/credits/engineCost.ts')
const offer = loadPure('lib/freeTierOffer.ts')
check('Kineo 1 usa custo canônico atual de 5 cr e escala 35s para 3', creditCostFor('fast',true) === 5 && forDuration('fast',true,35) === 3)
check('Seedance 35s = 21 cr pela tabela aprovada de outubro', forDuration('cinematic_ai',true,35) === 21)
check('Seedance 60s = 35 cr; saldo de 25 não promete filme inteiro', forDuration('cinematic_ai',true,60) === 35 && Math.floor(25/forDuration('cinematic_ai',true,60)) === 0)
check('25 créditos compram 5 filmes Kineo 1 de 60s pela cobrança real', Math.floor(25/forDuration('fast',true,60)) === 5)
check('saldo trial e filme curto derivam da mesma fonte que a página', offer.TRIAL_SEEDANCE15_FILMS === Math.floor(offer.TRIAL_CREDITS_SHOWN / forDuration('cinematic_ai',true,offer.TRIAL_FREE_FILM_SECONDS)))
check('conta free não ganha cobrança de fast ao escalar duração', [15,35,60,90].every(seconds => forDuration('fast',false,seconds) === 0))
check('a regra de escala existe no engineCost', cost.includes('DURATION_REFERENCE_SECONDS = 60'))

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
