// KINEO-PRICING-VERDADE-2026-09-27 — guardião do item V2 da sprint de 16 h (27/09): a tabela "Compare plans" do
// /pricing, a FAQ e os /terms dizem só o que o código cumpre, e TODO número da tabela deriva de lib/.
//
// O que estava errado em origin/main (365e663a) e este guardião TRAVA (literal antigo = 0 ocorrências):
//   · H3 (45 cr) e Kling 2.5 (50 cr) no Starter (60 cr) diziam "—" — o Starter compra um filme de cada;
//   · Kling 3 no Studio dizia "✅ 1/mo" — era a V6 (180 cr); a V7 deu 300 cr ao Studio = 2 filmes; Creator (150) = 1;
//   · Kling 2.5 no Studio dizia "✅ 1080p" — o motor roda em 720p nativo em todo plano; master 1080×1920 é de todos;
//   · "Saved characters 1/12/12/12" — o servidor (characterLimitFor) dá 0/3/3/10 e o trial recebe a cota de Creator;
//   · "Render time ~3-5 min" — era o Kineo 1; os motores de IA levam 8–20 min;
//   · "Priority support: Priority" — não existe fila nem SLA em lugar nenhum do código;
//   · "900+ creators · 450+ Shorts rendered" — placar de 04/08; banco de 27/09: 2.156 perfis / 1.563 filmes externos;
//   · /terms §4 cobrava "introductory first-month price" — INTRO_PRICES = preço cheio desde KINEO-NO-INTRO-2026-08-17.
//
// Como prova que os novos vêm da fonte: lê lib/checkoutPricing.ts (TIER_CREDITS), lib/credits/engineCost.ts
// (creditCostFor) e lib/characters.ts (characterLimitFor) com readFileSync, extrai os números de lá e confere que a
// tabela chama exatamente essas funções — sem import '@/' aqui dentro, sem digitar 60/150/300/45/50 no guardião.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')

let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) { passou++; console.log(`  ✓ ${nome}`) } else { falhas.push(nome); console.log(`  ✗ ${nome}`) } }
const conta = (texto, agulha) => texto.split(agulha).length - 1

const CLIENT = 'app/pricing/PricingClient.tsx'
const PAGE = 'app/pricing/page.tsx'
const TERMS = 'app/terms/page.tsx'

const client = rd(CLIENT)
const page = rd(PAGE)
const terms = rd(TERMS)
const pricingLib = rd('lib/checkoutPricing.ts')
const engineCost = rd('lib/credits/engineCost.ts')
const charactersLib = rd('lib/characters.ts')
const charactersRoute = rd('app/api/characters/route.ts')

// A tabela é o trecho entre a tag <table> (única no arquivo) e o fecho </table>; "Compare plans" como texto não serve
// de âncora porque os comentários deste mesmo item citam o nome da tabela.
const tIni = client.indexOf('<table className="w-full min-w-[700px]')
const tFim = client.indexOf('</table>', tIni)
ok(tIni > 0 && tFim > tIni && conta(client, '<table ') === 1, 'tabela "Compare plans" localizada no PricingClient (uma só <table>)')
const tabela = client.slice(tIni, tFim)

// ─── 1. Os números da fonte (lidos, não digitados) ──────────────────────────
const tierBlock = (pricingLib.match(/export const TIER_CREDITS[^{]*\{([\s\S]*?)\n\}/) ?? [])[1] ?? ''
const grant = (tier) => Number((tierBlock.match(new RegExp(`^\\s*${tier}:\\s*(\\d+),`, 'm')) ?? [])[1])
const custo = (quality) => Number((engineCost.match(new RegExp(`case '${quality}':[\\s\\S]*?return (\\d+)`)) ?? [])[1])
const starter = grant('starter'), basic = grant('basic'), pro = grant('pro')
const h3 = custo('cinematic_h3'), kling = custo('cinematic_kling'), kling3 = custo('cinematic_hollywood')
ok([starter, basic, pro, h3, kling, kling3].every((n) => Number.isInteger(n) && n > 0), `fontes lidas: TIER_CREDITS ${starter}/${basic}/${pro} · custo 60 s H3 ${h3} · Kling 2.5 ${kling} · Kling 3 ${kling3}`)
ok(/const base = creditCostFor\(quality, isPaidUser\)/.test(engineCost) && /DURATION_REFERENCE_SECONDS = 60/.test(engineCost), 'creditCostForDuration a 60 s devolve exatamente creditCostFor (referência = 60)')

const charBlock = (charactersLib.match(/export function characterLimitFor[\s\S]*?\n\}/) ?? [''])[0]
const charPro = Number((charBlock.match(/p === 'pro' \|\| p === 'pro_trial'\) return (\d+)/) ?? [])[1])
const charPaid = Number((charBlock.match(/p === 'basic' \|\| p === 'basic_trial' \|\| p === 'starter' \|\| p === 'starter_trial'\) return (\d+)/) ?? [])[1])
const charFreeMatch = charBlock.match(/return hasPaid \? (\d+) : (\d+)/) ?? []
const charFree = Number(charFreeMatch[2])
const trialLimit = Number((charactersRoute.match(/const TRIAL_CHARACTER_LIMIT = (\d+)/) ?? [])[1])
ok([charPro, charPaid, charFree, trialLimit].every(Number.isInteger), `characterLimitFor lido: free ${charFree} · starter/basic ${charPaid} · pro ${charPro} · trial (rota) ${trialLimit}`)
ok(trialLimit === charPaid, 'a cota do trial na rota é o MESMO número de characterLimitFor("basic_trial") — a página deriva de lá')
ok(/Math\.max\(planLimit, TRIAL_CHARACTER_LIMIT\)/.test(charactersRoute), 'a rota aplica Math.max(plano, cota de trial): "N during trial" é o que o servidor entrega')

// ─── 2. Literais antigos = 0 (a mentira não volta) ───────────────────────────
ok(conta(client, "'✅ 1/mo'") === 0, "literal antigo '✅ 1/mo' sumiu do PricingClient")
// Os comentários explicam o que saiu e citam o literal antigo; a trava vale para o CÓDIGO da tabela (sem comentários)
// e, mais forte, para a célula exata que mentia.
const codigoTabela = tabela.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '')
ok(conta(codigoTabela, '1080p') === 0 && conta(client, "pro: '✅ 1080p'") === 0, 'a tabela não fala mais em 1080p (720p nativo em todo plano)')
ok(!/free: '1',\n\s*starter: '12',/.test(client) && conta(tabela, "'12'") === 0, "célula '12' de personagens sumiu (era 1/12/12/12)")
ok(conta(codigoTabela, 'Priority') === 0 && conta(client, "label: 'Priority support'") === 0 && conta(client, "pro: 'Priority'") === 0, "'Priority' sumiu da tabela (label e célula)")
ok(conta(client, '900+ creators') === 0 && conta(client, '450+ Shorts rendered') === 0, "'900+ creators · 450+ Shorts rendered' sumiu")
ok(conta(codigoTabela, '~3-5 min') === 0 && conta(codigoTabela, 'Usually 3–7 min') === 0 && conta(client, "basic: '~3-5 min'") === 0 && conta(client, "free: 'Usually 3–7 min (Fast)'") === 0, 'tempo de render antigo (~3-5 / Usually 3–7) sumiu da tabela')
ok(conta(client, 'about 3–5 minutes') === 0, 'FAQ não promete mais "about 3–5 minutes"')
ok(conta(terms, 'introductory') === 0, '/terms não fala mais em preço introdutório (não existe intro)')

// ─── 3. Os novos vêm de TIER_CREDITS / creditCostForDuration / characterLimitFor ─
ok(/import \{ creditCostForDuration, type Quality \} from '@\/lib\/credits\/engineCost'/.test(client), 'PricingClient importa creditCostForDuration (a régua do caixa)')
ok(/MARKETING_REFERENCE_SECONDS,\n\s*videosPerMonth,\n\} from '@\/lib\/marketingPrice'/.test(client), 'PricingClient importa MARKETING_REFERENCE_SECONDS (60 s de referência, não digitado)')
ok(/const filmCreditsAt60s = \(quality: Quality\): number => creditCostForDuration\(quality, true, MARKETING_REFERENCE_SECONDS\)/.test(client), 'custo do filme = creditCostForDuration(quality, true, 60 s)')
ok(/const filmsPerMonthFor = \(tier: PaidTier, quality: Quality\): number => Math\.floor\(TIER_CREDITS\[tier\] \/ filmCreditsAt60s\(quality\)\)/.test(client), 'filmes/mês = Math.floor(TIER_CREDITS ÷ custo) — grant vem de TIER_CREDITS, nunca da tabela intro')
ok(!/INTRO_CREDITS\[tier\] \/ filmCreditsAt60s/.test(client), 'a contagem NÃO usa INTRO_CREDITS')
ok(/starter: filmsCell\('starter', 'cinematic_h3', 'film'\)/.test(tabela), 'H3 no Starter = filmsCell(starter, cinematic_h3)')
ok(/starter: filmsCell\('starter', 'cinematic_kling', 'film'\)/.test(tabela), 'Kling 2.5 no Starter = filmsCell(starter, cinematic_kling)')
ok(/basic: filmsCell\('basic', 'cinematic_hollywood', 'mo'\),\n\s*pro: filmsCell\('pro', 'cinematic_hollywood', 'mo'\)/.test(tabela), 'Kling 3 no Creator e no Studio = filmsCell(tier, cinematic_hollywood)')
ok(/cinematic_kling'\)\} cr\)`,\n\s*free: [^\n]*\n\s*starter: filmsCell\([^\n]*\n\s*basic: '✅',\n(?:\s*\/\/[^\n]*\n)*\s*pro: '✅',/.test(tabela), "Kling 2.5 no Studio = '✅' seco (sem resolução prometida)")

// O que a página vai PINTAR com os números de hoje (calculado com a mesma fórmula que o código usa):
const filmsCell = (grantCr, custoCr, style) => {
  const films = Math.floor(grantCr / custoCr)
  if (films < 1) return '—'
  return style === 'mo' ? `✅ ${films}/mo` : `✅ ${films} ${films === 1 ? 'film' : 'films'}`
}
ok(/if \(films < 1\) return '—'\n\s*return style === 'mo' \? `✅ \$\{films\}\/mo` : `✅ \$\{films\} \$\{films === 1 \? 'film' : 'films'\}`/.test(client), 'a fórmula do guardião é a fórmula do código (filmsCell)')
ok(filmsCell(starter, h3, 'film') === '✅ 1 film', `Starter × H3 pinta "✅ 1 film" (${starter} ≥ ${h3})`)
ok(filmsCell(starter, kling, 'film') === '✅ 1 film', `Starter × Kling 2.5 pinta "✅ 1 film" (${starter} ≥ ${kling})`)
ok(filmsCell(pro, kling3, 'mo') === '✅ 2/mo', `Studio × Kling 3 pinta "✅ 2/mo" (${pro} ÷ ${kling3})`)
ok(filmsCell(basic, kling3, 'mo') === '✅ 1/mo', `Creator × Kling 3 pinta "✅ 1/mo" (${basic} ÷ ${kling3})`)
ok(filmsCell(starter, kling3, 'mo') === '—', `Starter × Kling 3 continua "—" (${starter} < ${kling3})`)

// Personagens: derivação no servidor (page.tsx) e uso por prop no client.
ok(/import \{ characterLimitFor \} from '@\/lib\/characters'/.test(page), 'page.tsx importa characterLimitFor de lib/characters.ts')
ok(/free: characterLimitFor\('free', false\),\n\s*trial: characterLimitFor\('basic_trial', false\),\n\s*starter: characterLimitFor\('starter', true\),\n\s*basic: characterLimitFor\('basic', true\),\n\s*pro: characterLimitFor\('pro', true\),/.test(page), 'page.tsx deriva free/trial/starter/basic/pro de characterLimitFor')
ok(/<PricingClient key=\{handoff\.key\} initialBilling=\{handoff\.initialBilling\} characterLimits=\{characterLimits\} \/>/.test(page), 'page.tsx entrega characterLimits ao PricingClient')
ok(/starter: charCell\(characterLimits\?\.starter\),\n\s*basic: charCell\(characterLimits\?\.basic\),\n\s*pro: charCell\(characterLimits\?\.pro\),/.test(tabela), 'linha de personagens lê a prop (starter/basic/pro)')
ok(/free: ft\(OFFER, charCell\(characterLimits\?\.free\), characterLimits \? `\$\{characterLimits\.trial\} during trial` : '—'\)/.test(tabela), 'coluna Free = cota do trial com a nota "during trial" (via ft, como as outras células Free)')
const charCell = (n) => (typeof n === 'number' && n > 0 ? String(n) : '—')
ok(charCell(charFree) === '—' && charCell(charPaid) === '3' && charCell(charPro) === '10' && `${trialLimit} during trial` === '3 during trial', `pinta —(free) / 3 during trial / 3 / 3 / 10 com os números de hoje`)
ok(!/from '@\/lib\/characters'/.test(client), "PricingClient ('use client') NÃO importa lib/characters (node:crypto não entra no bundle do navegador)")

// Tempo de render: um só texto, FAQ e tabela.
// Reancorado 29/09 (KINEO-ENTRADA-SEEDANCE15, E2b): o Kineo 1 saiu da /pricing (trava j do E1 — quem assina não o recebe);
// o texto único segue sendo o dos motores de IA, e o "~3-5 min" antigo continua proibido (linhas acima).
ok(/const RENDER_TIME_COPY = 'AI engines 8–20 min'/.test(client), 'RENDER_TIME_COPY = "AI engines 8–20 min"')
ok(/a: `\$\{RENDER_TIME_COPY\}\. We use AI to write, voice, and edit everything automatically\.`/.test(client), 'FAQ "How fast" usa RENDER_TIME_COPY')
ok(/label: 'Render time',\n(?:\s*\/\/[^\n]*\n)*\s*free: RENDER_TIME_COPY,\n\s*starter: RENDER_TIME_COPY,\n\s*basic: RENDER_TIME_COPY,\n\s*pro: RENDER_TIME_COPY,/.test(tabela), 'as 4 células de Render time usam RENDER_TIME_COPY')

// Suporte: e-mail para todo mundo.
ok(/label: 'Support',\n\s*free: 'Email support',\n\s*starter: 'Email support',\n\s*basic: 'Email support',\n\s*pro: 'Email support',/.test(tabela), "linha de suporte = 'Support' com 'Email support' nas 4 colunas")

// Prova social com o placar de 27/09 e o comentário de origem.
ok(conta(client, '2,100+ creators · 1,500+ films · featured on There&apos;s An AI For That') === 1, "prova social = '2,100+ creators · 1,500+ films'")
ok(conta(client, 'banco 2026-09-27: 2.156 perfis externos, 1.563 vídeos completed externos') === 1, 'comentário com a origem do placar (banco 2026-09-27)')

// /terms §4.
ok(/<Section title="4\. Payments and refunds">/.test(terms), '/terms §4 = "Payments and refunds"')
ok(/is charged immediately at the price shown in checkout\. The monthly\n\s*price and the exact first renewal date are shown before payment\./.test(terms), '/terms §4 cobra "the price shown in checkout" e mostra preço + renovação antes do pagamento')
ok(conta(terms, '7-day') >= 1, '/terms mantém a garantia de 7 dias')

// Nada do que é proibido nesta entrega foi tocado: preço, créditos por plano, trial, oferta.
ok(/starter: 60,\n\s*basic: 150,\n\s*pro: 300,/.test(tierBlock), 'TIER_CREDITS intacto (60/150/300) — a entrega não mexeu em grant')

console.log(`\n${passou} verificações passaram; ${falhas.length} falharam.`)
if (falhas.length) { for (const f of falhas) console.log(`  FALHOU: ${f}`); process.exit(1) }
