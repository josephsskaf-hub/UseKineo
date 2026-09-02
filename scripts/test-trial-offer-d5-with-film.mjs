// sprint-assinaturas #21 — o D5 (COMEBACK50) para quem TEM video entregue:
// manchete = o filme dela, Library primeiro, cupom identico, pedido em filmes.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }
const route = readFileSync(path.join(root, 'app/api/cron/trial-lifecycle-emails/route.ts'), 'utf8')
const lib = readFileSync(path.join(root, 'lib/lifecycle/trialFilmPlans.ts'), 'utf8')

const d5 = route.slice(route.indexOf("if (c.kind === 'expired_offer_d5')"), route.indexOf("if (c.kind === 'expired_lastcall_d10')"))
ok(d5.length > 500, 'bloco do D5 localizado')
ok(d5.includes('if (c.videosMade >= 1)'), 'ramo novo so para quem tem video entregue (videosMade real, nunca default)')
ok(d5.indexOf('if (c.videosMade >= 1)') < d5.indexOf("const text = `Hey,"), 'ramo com filme decide ANTES do corpo padrao')
ok(d5.includes("body: 'offer_with_film'"), 'evento grava body offer_with_film')
ok(d5.includes("body: 'standard' }"), 'D5 padrao grava body standard (prova qual saiu)')
ok(lib.includes("'offer_with_film'"), 'LossBody aceita offer_with_film')
// cupom: identico nos dois ramos, sem porcentagem/prazo novos
const cupons = d5.match(/\$\{COMEBACK_CODE\}/g) || []
ok(cupons.length >= 4, `cupom vem da constante COMEBACK_CODE (${cupons.length} usos), nunca digitado`)
ok(!/COMEBACK50/.test(d5), 'nenhum codigo de cupom literal no bloco')
ok((d5.match(/50% off Creator for 3 months/g) || []).length >= 3, 'oferta com a MESMA frase do e-mail padrao (50% / 3 meses) — nada novo prometido')
ok(!/\$\d|USD|\b\d+\.\d\d\b/.test(d5), 'sem preco literal (regra do arquivo)')
// links
ok(d5.includes("utm('trial_offer_d5_library')"), 'Library com utm proprio')
ok(d5.includes("promo=${COMEBACK_CODE}&${utm('trial_offer_d5')}"), 'CTA do cupom = MESMA url do padrao (promo + utm trial_offer_d5)')
ok(d5.indexOf("cta(libraryUrl, 'Open your Library')") < d5.indexOf('cta(url, `Claim 50% off`)'), 'Library vem antes do cupom no HTML')
ok(d5.includes("episodeTwoBlock(c.lastTopic, 'trial_offer_d5_episode2'"), 'episodio 2 do tema dela (falha aberta: sem tema = sem bloco)')
// filmes: so a linha do Creator (o cupom e do Creator), derivada de TIER_CREDITS
ok(d5.includes("filmsPerPlan(c.lastCost)?.find((r) => r.tier === 'basic')"), 'so a linha do Creator (tier basic), derivada de filmsPerPlan/TIER_CREDITS')
ok(d5.includes('creatorRow && creatorRow.films >= 1'), 'sem custo conhecido ou 0 filmes = a frase cala')
ok(d5.includes('filmNoun(c.lastDuration)'), 'segundos so quando a duracao e real')
// assunto
ok(d5.includes('Your ${noun} is still in your Library — and Creator is 50% off'), 'assunto com o filme dela (1 video)')
ok(d5.includes('Your ${c.videosMade} videos are still in your Library — and Creator is 50% off'), 'assunto com N videos')
ok(d5.includes("subject: 'Come back to Creator — 50% off for 3 months'"), 'quem nao tem video: assunto de hoje intocado')
// nada de dinheiro/credito
ok(!/needsExtensionUpdate|restore|grantCredits|video_credits\s*:/.test(d5), 'nenhuma escrita de credito no ramo')
ok(d5.includes('escapeHtmlText(madeLine)') && d5.includes('escapeHtmlText(filmsLine)'), 'texto derivado escapado no HTML')
console.log(`\n${n - fail}/${n} verificacoes`)
process.exit(fail ? 1 : 0)
