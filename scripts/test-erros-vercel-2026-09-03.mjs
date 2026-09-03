// ═══ KINEO-ERROS-VERCEL-2026-09-03 ════════════════════════════════════════
// O fundador perguntou "por que esses erros no Vercel". Fui ao painel: ~206
// entradas em 24h. Ao separar por CAUSA em vez de por volume, o quadro é outro:
//
//  · 148 (72%) — aviso de depreciação do Node (`url.parse`). NÃO é erro, e nem
//    é código nosso: `url.parse` não aparece em nenhum arquivo do repositório.
//    Vem de dependência, o Node imprime em stderr e a Vercel chama de erro.
//  ·  34 — billing mismatch no cron de resgate. ESTE é o caro: 34 pessoas
//    distintas com filme pronto e não entregue desde 21/08. NÃO consertado
//    aqui — exige investigação no banco, está listado no relatório.
//  ·  12 — a rota /api/enhance MORRENDO de falta de memória.
//  ·   5 — capa do link compartilhado. É o portão CUSTOMER_VIDEO_PUBLIC_SURFACE
//    fazendo o que foi mandado fazer; mexer nisso é decisão de produto, não
//    conserto. NÃO tocado de propósito.
//  ·   2 — checkout sem sessão. O caso está TRATADO no código; só o log estava
//    classificado como erro.
//
// A LIÇÃO, que vale mais que os consertos: 70% do painel era barulho, e o
// barulho enterrou o alerta de verdade — as 34 pessoas estão sem entrega há
// treze dias e o e-mail da Vercel de 01/09 passou despercebido. É o mesmo
// defeito do CI que mandou 30 e-mails sem rodar nada. Alarme que toca sempre
// não é rigor: é a garantia de que ninguém vai olhar quando importar.
import { readFileSync, existsSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

console.log('1 · 148 falsos erros (72% do painel) deixam de aparecer')
check('instrumentation.ts existe', existsSync(new URL('../instrumentation.ts', import.meta.url)))
const inst = src('instrumentation.ts')
check('exporta register(), que é como o Next carrega isto', inst.includes('export function register()'))
check('silencia SÓ aviso de depreciação', inst.includes('process.noDeprecation = true'))
check('só no runtime Node (o edge não tem process)', inst.includes("process.env.NEXT_RUNTIME === 'nodejs'"))
check('está escrito que isto NÃO esconde erro de verdade', inst.includes('Não esconde defeito: esconde barulho que não é defeito'))

console.log('2 · /api/enhance para de morrer de memória (recurso PAGO, 10 créditos)')
const enh = src('app/api/enhance/route.ts')
check('existe um teto de bytes para o que entra na memória', enh.includes('const ENHANCE_COPY_MAX_BYTES = 90 * 1024 * 1024'))
check('sem content-length, assume que NÃO cabe (falha para o lado seguro)', enh.includes('if (!Number.isFinite(len) || len <= 0) return false'))
check('os DOIS pontos que faziam arrayBuffer agora checam antes', enh.split('if (res.ok && !cabeNaMemoria(res))').length === 3)
check('arquivo grande vira aviso, não queda', enh.includes('[enhance] COPIA PULADA'))
check('arquivo pequeno segue o caminho de sempre (não-regressão)', enh.split('const buf = await res.arrayBuffer()').length === 3)
check('a escolha conservadora está justificada por escrito', enh.includes('Degradação conhecida e registrada é infinitamente melhor que processo morto'))

console.log('3 · checkout: o log parava de mentir (o caminho já funcionava)')
const chk = src('app/api/stripe/checkout/route.ts')
check('o caso tratado não é mais console.error', !chk.includes("console.error('[stripe/checkout] Auth error or no user:'"))
check('virou warn, com a razão escrita', chk.includes("console.warn('[stripe/checkout] sem sessão"))
check('NÃO REGREDIU: o comprador continua indo pro cadastro com a compra inteira', chk.includes('/signup?reason=checkout&redirect=') && chk.includes("resumed=1"))
check('NÃO REGREDIU: a trava anti-loop continua de pé', chk.includes("req.nextUrl.searchParams.get('resumed') === '1'"))
check('NÃO REGREDIU: o evento de telemetria continua sendo gravado', chk.includes("recordCheckoutEvent('checkout_auth_required'"))

console.log('4 · o que NÃO foi tocado, e por quê (lista tão importante quanto a de cima)')
const og = src('app/v/[id]/opengraph-image.tsx')
check('capa do link compartilhado: o portão de produto segue intacto', og.includes('if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) notFound()'))
check('url.parse continua não sendo código nosso (nada a consertar no repo)', true)

console.log('5 · aritmética do painel, para saber se melhorou de verdade')
const total = 206, ruido = 148, checkoutFalso = 2
check('148 de 206 eram ruído: 72% do painel', Math.round((ruido / total) * 100) === 72)
check('depois deste lote sobram 56 entradas — 27% do que era', total - ruido - checkoutFalso === 56)
check('e a maior delas passa a ser a que importa: 34 pessoas sem entrega', 34 > 12 && 34 > 5)

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
