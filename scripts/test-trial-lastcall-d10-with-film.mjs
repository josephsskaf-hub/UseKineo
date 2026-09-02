// sprint-assinaturas #22 — o D10 (ultima chamada do COMEBACK50) para quem TEM
// video entregue: manchete = o filme dela, Library primeiro, cupom identico,
// "ultima vez" continua verdadeira, pedido em filmes; sem video = e-mail de hoje.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }
const route = readFileSync(path.join(root, 'app/api/cron/trial-lifecycle-emails/route.ts'), 'utf8')

const start = route.indexOf("if (c.kind === 'expired_lastcall_d10')")
const end = route.indexOf('// trial_extended', start)
const d10 = route.slice(start, end)
ok(d10.length > 500 && end > start, 'bloco do D10 localizado')
ok(d10.includes('if (c.videosMade >= 1)'), 'ramo novo so para quem tem video entregue (videosMade real)')
ok(d10.indexOf('if (c.videosMade >= 1)') < d10.indexOf("const text = `Hey,"), 'ramo com filme decide ANTES do corpo padrao')
ok(d10.includes("body: 'offer_with_film'"), 'evento grava body offer_with_film (mesma chave do D5)')
ok(d10.includes("html, body: 'standard' }"), 'D10 padrao grava body standard (prova qual saiu)')
// cupom identico, nada novo prometido
const cupons = d10.match(/\$\{COMEBACK_CODE\}/g) || []
ok(cupons.length >= 4, `cupom vem da constante COMEBACK_CODE (${cupons.length} usos), nunca digitado`)
ok(!/COMEBACK50/.test(d10), 'nenhum codigo de cupom literal no bloco')
ok((d10.match(/50% off Creator for 3 months/g) || []).length >= 4, 'MESMA frase da oferta (50% / 3 meses) nos dois ramos')
ok(!/\$\d|USD|\b\d+\.\d\d\b/.test(d10), 'sem preco literal (regra do arquivo)')
ok((d10.match(/last time we'll mention it/g) || []).length >= 4, '"ultima vez" mantida nos dois ramos (o cron nao manda nada depois do D10)')
ok(!/ends here|expires today|tonight|hours left/i.test(d10.slice(0, d10.indexOf("const text = `Hey,"))), 'ramo com filme nao inventa prazo de expiracao que o cupom nao tem')
// links
ok(d10.includes("utm('trial_offer_d10_library')"), 'Library com utm proprio')
ok(d10.includes("promo=${COMEBACK_CODE}&${utm('trial_offer_d10')}"), 'CTA do cupom = MESMA url do padrao (promo + utm trial_offer_d10)')
ok(d10.indexOf("cta(libraryUrl, 'Open your Library')") < d10.indexOf("cta(url, 'Claim 50% off')"), 'Library vem antes do cupom no HTML')
ok(d10.includes("episodeTwoBlock(c.lastTopic, 'trial_offer_d10_episode2'"), 'episodio 2 do tema dela (falha aberta: sem tema = sem bloco)')
// filmes: so a linha do Creator, derivada de TIER_CREDITS
ok(d10.includes("filmsPerPlan(c.lastCost)?.find((r) => r.tier === 'basic')"), 'so a linha do Creator (tier basic), derivada de filmsPerPlan/TIER_CREDITS')
ok(d10.includes('creatorRow && creatorRow.films >= 1'), 'sem custo conhecido ou 0 filmes = a frase cala')
ok(d10.includes('filmNoun(c.lastDuration)'), 'segundos so quando a duracao e real')
// assunto
ok(d10.includes('Last call on 50% off Creator — your ${noun} is waiting in your Library'), 'assunto com o filme dela (1 video)')
ok(d10.includes('Last call on 50% off Creator — your ${c.videosMade} videos are waiting in your Library'), 'assunto com N videos')
ok(d10.includes('subject: `Last call: 50% off Creator expires`'), 'quem nao tem video: assunto de hoje intocado')
// corpo padrao intocado (controle do A/B)
const std = d10.slice(d10.indexOf("const text = `Hey,"))
ok(std.includes("Quick heads-up, and then we'll leave you alone: your 50% off Creator for 3 months (code ${COMEBACK_CODE}) is still live, but this is the last time we'll mention it."), 'texto padrao byte a byte')
ok(std.includes("After this it's full price. No hard feelings either way."), 'rodape padrao byte a byte')
// nada de dinheiro/credito
ok(!/needsExtensionUpdate|restore|grantCredits|video_credits\s*:/.test(d10), 'nenhuma escrita de credito no ramo')
ok(d10.includes('escapeHtmlText(madeLine)') && d10.includes('escapeHtmlText(filmsLine)'), 'texto derivado escapado no HTML')
// o evento so grava body quando existe — D10 agora sempre tem
ok(route.includes('...(body.body ? { body: body.body } : {})'), 'evento trial_lifecycle_email_sent grava body quando existe')
console.log(`\n${n - fail}/${n} verificacoes`)
process.exit(fail ? 1 : 0)
