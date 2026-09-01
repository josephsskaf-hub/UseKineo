// sprint-v1v4 #32 — prova a ordem nova da tela de "video pronto".
// Le os arquivos REAIS. Nao roda render, nao toca banco, nao gasta credito.
import { readFileSync } from 'node:fs'

const gc = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
const ns = readFileSync(new URL('../components/video/NextShortsSection.tsx', import.meta.url), 'utf8')
const an = readFileSync(new URL('../lib/analytics.ts', import.meta.url), 'utf8')
const ev = readFileSync(new URL('../app/api/events/route.ts', import.meta.url), 'utf8')

let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.error('FALHOU:', nome) } }

const iNext = gc.indexOf('<NextShortsSection')
const iPkg  = gc.indexOf('<ShortPackageSection')
const iNudge= gc.indexOf('Push #311 — Performance tracking nudge')

// 1..4 — a ordem da tela
t('NextShortsSection existe', iNext > 0)
t('ShortPackageSection existe', iPkg > 0)
t('prateleira do proximo episodio vem ANTES do pacote de texto', iNext < iPkg)
t('as duas continuam antes do nudge de tracking', iPkg < iNudge)

// 5..7 — nada foi apagado
t('ShortPackageSection ainda recebe analysis', /<ShortPackageSection[\s\S]{0,240}analysis=\{analysis\}/.test(gc))
t('ShortPackageSection ainda recebe onCopy', /<ShortPackageSection[\s\S]{0,240}onCopy=\{copySection\}/.test(gc))
t('NextShortsSection ainda recebe onPick', /<NextShortsSection[\s\S]{0,900}onPick=\{/.test(gc))

// 8..10 — o gatilho de render nao mudou
t('prateleira so aparece com video pronto', gc.includes("{phase === 'done' && finalVideoUrl && analysis && ("))
t('o clique NAO gera video sozinho', /Deliberately does NOT auto-generate/.test(gc))
t('o clique continua reset + setPrompt', /handleReset\(\)\s*\n\s*setPrompt\(idea\.prompt\)/.test(gc))

// 11..13 — a medicao antes/depois
t('eventos carimbam a colocacao nova', gc.includes("placement: 'above_package'"))
t('meta original preservada no carimbo', gc.includes('...(meta ?? {})'))
t('next_shorts_seen continua sendo emitido pelo componente', ns.includes("'next_shorts_seen'"))

// 14..16 — por que a hipotese do allowlist foi descartada (fica provado em codigo)
t('trackEvent do cliente nao filtra nome de evento', !/ALLOW|allowlist|WHITELIST|KNOWN_EVENTS/i.test(an))
t('/api/events nao filtra nome de evento', !/ALLOW|allowlist|WHITELIST|KNOWN_EVENTS/i.test(ev))
t('next_shorts_shown segue intacto para a serie historica', ns.includes("'next_shorts_shown'"))

// 17..20 — pista do Codex intocada nesta mudanca
const iNota = gc.indexOf('sprint-v1v4 #32 (2026-09-01)')
// exatamente o trecho que eu movi: da minha nota ate o nudge de tracking.
const bloco = gc.slice(iNota, iNudge)
t('nenhum preco no trecho movido', !/\$\d|price|Price/.test(bloco.replace(/priceless/g, '')))
t('nenhum plano/checkout no trecho movido', !/checkout|stripe|Stripe|PLAN_|planFit/.test(bloco))
t('nenhum credito debitado no trecho movido', !/debit|deduct|spendCredit/i.test(bloco))
t('o upsell continua depois das duas secoes', iNudge > iPkg && iNudge > iNext)

console.log(`${ok}/${ok + fail} verificacoes`)
process.exit(fail ? 1 : 0)
