// KINEO-PRICING-DETALHE-0611 — guardião sem rede: cancelar longe do botão, lista aberta e números tirados do custo real.
import fs from 'node:fs'
const ler = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const pagina = ler('app/pricing/PricingClient.tsx'), cartao = ler('components/pricing/PlanValueStage.tsx'), inclui = ler('components/pricing/PricingIncludes0511.tsx'), lista = ler('lib/pricing/planoDetalhado.ts')
checa('topo sem cancelar', !pagina.includes("{['Cancel anytime', MONEY_BACK_GUARANTEE]"))
const sob = pagina.slice(pagina.indexOf('save={annual'), pagina.indexOf('extra={localMethod'))
checa('sem cancelar embaixo do botão', !/cancel anytime/i.test(sob))
checa('cancelar continua informado', inclui.includes('Cancel anytime from your account') && pagina.includes("q: 'Can I cancel anytime?'"))
const aberto = cartao.indexOf('data-kineo="plano-detalhe"'), fechado = cartao.indexOf('<details className="pv-more">')
checa('lista aberta antes do que é a um clique', aberto > 0 && aberto < fechado)
checa('lista não fica dentro do clique', !cartao.slice(fechado, cartao.indexOf('</details>')).includes('props.included'))
checa('ad e desenho vêm do custo real', lista.includes("adsV2Credits('commercial', 15)") && lista.includes('KLING4_AD_CREDITS') && lista.includes("creditCostForDuration('cinematic_ai', true, 35)"))
checa('alternativas não somam com os filmes', cartao.includes('Or use your credits for'))
checa('nada de fila prioritária nem ilimitado', !/priority|unlimited/i.test(lista))
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1) }
console.log('TUDO OK')
