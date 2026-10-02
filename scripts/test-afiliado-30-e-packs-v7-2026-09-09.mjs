// KINEO-LOTE3-2026-09-09 — guardião: comissão de afiliado com UMA fonte (30%),
// packs de agência prometendo filmes Kineo 1 de 60 s (não "Fast" de 1 crédito),
// porta v2 no funil e a tabela de entrantes no admin.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

console.log('== afiliado 30% ==')
const com = rd('lib/affiliateCommission.ts')
checa('fonte única pura: AFFILIATE_COMMISSION_RATE = 0.3 e PCT derivado', /export const AFFILIATE_COMMISSION_RATE = 0\.3\b/.test(com) && /AFFILIATE_COMMISSION_PCT = `\$\{Math\.round\(AFFILIATE_COMMISSION_RATE \* 100\)\}%`/.test(com) && !/^import /m.test(com))
checa('cadastro de afiliado grava a fonte, não 0.4', /commission_rate: AFFILIATE_COMMISSION_RATE,/.test(rd('app/api/affiliate/apply/route.ts')) && !/commission_rate: 0\.4/.test(rd('app/api/affiliate/apply/route.ts')))
checa('/partners calcula com a fonte e não diz 40%', /const COMMISSION_RATE = AFFILIATE_COMMISSION_RATE/.test(rd('app/partners/page.tsx')) && !/40%/.test(rd('app/partners/page.tsx')))
// Reancorado 02/10 (KINEO-LACOS-TAXA-2026-10-02): o painel do afiliado deixou de digitar "30%" — a taxa vem de
// AFFILIATE_COMMISSION_PCT (a fonte acima, = 0.3). A prova continua a mesma: a tela diz a taxa da fonte e nunca "40%".
checa('app/(dashboard)/affiliate/page.tsx: taxa da fonte (AFFILIATE_COMMISSION_PCT) e nenhum "40% recurring"', /earn \{AFFILIATE_COMMISSION_PCT\} recurring/.test(rd('app/(dashboard)/affiliate/page.tsx')) && /AFFILIATE_COMMISSION_PCT[^\n]*from '@\/lib\/affiliateCommission'/.test(rd('app/(dashboard)/affiliate/page.tsx')) && !/40% recurring|40% recurrente/.test(rd('app/(dashboard)/affiliate/page.tsx')))
for (const f of ['components/Footer.tsx', 'lib/ui/interfaceLabels.ts', 'lib/ui/interfaceHindi.ts', 'lib/growth/affiliateProgramComparison.ts']) {
  checa(`${f}: 30% e nenhum "40% recurring"`, /30%/.test(rd(f)) && !/40% recurring|40% recurrente/.test(rd(f)))
}
// KINEO-PRECO-V8-A-2026-09-28 — reancorado com motivo: o kit foi reescrito em inglês depois da V7 (a frase "$29/mês → $8,70"
// não existia mais) e a escada é 12,90/29,90/54,90: 30% do Creator = US$8,97. A prova lê a tabela e o exemplo do kit.
checa('kit de afiliados: 30% e US$8,97 por Creator (US$29,90)', /30%/.test(rd('docs/KIT-AFILIADOS-2026-09-08.md')) && /\| Creator \| US\$29\.90 \| 150 \|/.test(rd('docs/KIT-AFILIADOS-2026-09-08.md')) && /US\$8\.97 on Creator/.test(rd('docs/KIT-AFILIADOS-2026-09-08.md')))

console.log('== packs de agência no V7 ==')
const cp = rd('lib/checkoutPricing.ts')
checa('bulkCreditsFor conta filmes Kineo 1 de 60 s (× custo real), com folga', /const KINEO1_60S_CREDITS = creditCostForDuration\('fast', true, 60\)/.test(cp) && /const base = videos \* KINEO1_60S_CREDITS/.test(cp))
checa('preços V7: $19 / $35 / $49 / $75', /bulk10: \{ videos: 10, usdMinor: 1900,/.test(cp) && /bulk20: \{ videos: 20, usdMinor: 3500,/.test(cp) && /bulk30: \{ videos: 30, usdMinor: 4900,/.test(cp) && /bulk50: \{ videos: 50, usdMinor: 7500,/.test(cp))
// KINEO-PRECO-V8-A-2026-09-28 — reancorado com motivo: o Starter anual foi para 12900 e o 9900 voltou a ter um dono só; a lista fica vazia.
checa('nenhum pack a $99 (e a lista de ambíguos ficou vazia: Starter anual = 12900 desde V8-A)', !/usdMinor: 9900, credits: bulkCreditsFor/.test(cp) && /AMBIGUOUS_ONE_TIME_USD_AMOUNTS: ReadonlySet<number> = new Set<number>\(\[\]\)/.test(cp))
{
  // executa a régua do pack: cada pack cobre os N filmes prometidos e custa mais por crédito que o Creator
  // o bloco começa no `export const X`, pula a anotação de tipo (que pode ter
  // chaves) até o ` = {` e termina no `\n}` seguinte
  const bloco = (nome) => { const i = cp.indexOf(`export const ${nome}`); const j = cp.indexOf(' = {', i); return `export const ${nome}` + cp.slice(j, cp.indexOf('\n}', j) + 2) }
  const src = "const creditCostForDuration = () => 5\nconst BULK_HEADROOM_RATIO = 0.2\n" +
    cp.slice(cp.indexOf('const KINEO1_60S_CREDITS'), cp.indexOf('\n}', cp.indexOf('export function bulkCreditsFor')) + 2) + '\n' +
    bloco('BULK_PACKS') + '\n' + bloco('TIER_PRICES') + '\n' + bloco('TIER_CREDITS')
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp })
  const packs = exp.BULK_PACKS
  const creatorPerCredit = exp.TIER_PRICES.basic.usd / exp.TIER_CREDITS.basic
  let cobre = true, acima = true
  for (const id of Object.keys(packs)) {
    const p = packs[id]
    if (p.credits < p.videos * 5) cobre = false
    if (p.usdMinor / p.credits <= creatorPerCredit) acima = false
  }
  checa('cada pack cobre os N filmes de 60 s que promete (créditos ≥ N × 5)', cobre)
  checa('cada pack custa mais por crédito que o Creator (regra do avulso)', acima)
  checa('bulk10 = 10 filmes × 5 + folga de 10 = 60 créditos', packs.bulk10.credits === 60)
}
checa('página de agência fala em filmes Kineo 1 de 60 s, não "Fast videos"', /30 Kineo 1 films of 60 seconds/.test(rd('app/ai-shorts-for-agencies/page.tsx')) && !/30 Fast videos/.test(rd('app/ai-shorts-for-agencies/page.tsx')))
// KINEO-FILME-GRATIS-15S-2026-09-29 — reancorado com motivo: a ponte aparece na home, no /pricing e em páginas de SEO (fora
// da página de agências); com o Kineo 1 fora do catálogo público, o nome do motor do pacote fica só em /ai-shorts-for-agencies
// (compra paga, verificada acima). A ponte segue falando em filme finalizado de 60 s, nunca em "Fast".
checa('ponte de agência fala em filme finalizado de 60 s (sem "Fast" e sem Kineo 1 fora da página de agências)', /per finished 60-second film\./.test(rd('components/AgencyVolumeBridge.tsx')) && !/Fast video|Kineo 1 film/.test(rd('components/AgencyVolumeBridge.tsx')))

console.log('== porta v2 no funil e entrantes no admin ==')
const fun = rd('lib/admin/versaoBFunnel.ts')
checa('funil lê card_entry_door_shown/clicked e intent door_v2', /'card_entry_door_shown',\s*\n\s*'card_entry_door_clicked',/.test(fun) && /case 'card_entry_door_shown': sets\.sawDoor/.test(fun) && /ic === 'door_v2'/.test(fun))
const ov = rd('app/admin/overview/page.tsx')
checa('admin: tabela "Quem entrou pela porta" por pessoa, com pagou $1 e "usou X de 80"', /Quem entrou pela porta/.test(ov) && /data-testid="entrante"/.test(ov) && /usou \$\{Math\.max\(0, CARD_ENTRY_TRIAL_CREDITS - e\.credits\)\} de \$\{CARD_ENTRY_TRIAL_CREDITS\}/.test(ov))
checa('admin: UM lugar com quem pagou $1 e esta dentro dos 7 dias (No trial de $1 agora), lendo o plano *_trial do perfil', ov.includes('data-testid="trial-1-agora-n"') && ov.includes('No trial de $1 agora') && ov.includes(".filter((p) => isTrialPlan((p.plan ?? '').toLowerCase()))") && ov.includes('data-testid="trial-1-pessoa"'))
checa('admin: dias restantes = 7 - dias desde o payment_success card_trial', ov.includes("Math.max(0, 7 - Math.floor((now - new Date(paidAt).getTime()) / DAY_MS))") && ov.includes("metaTrue(e.metadata ?? null, 'card_trial')"))
checa('admin: entrantes nascem do evento card_entry_required desde o marco', /e\.name !== 'card_entry_required'\) continue/.test(ov) && /if \(t < marcoMs \|\| entrantesMap\.has\(e\.user_id\)\) continue/.test(ov))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — afiliado 30% com fonte única, packs prometendo filmes reais, porta v2 no funil, entrantes no admin')
