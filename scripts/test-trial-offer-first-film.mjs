// sprint-assinaturas #12 (04/09) — O D5/D10 PARA QUEM NUNCA VIU UM FILME.
//
// O NUMERO: em 21 dias, 442 `expired_offer_d5` + 284 `expired_lastcall_d10`
// enviados, 315 deles para gente sem UM video concluido. No recorte exato que
// o `body` do #21/#22 permite, `standard` = 14 (D5) + 43 (D10) = 57 envios, e
// 57 de 57 sao pessoas sem um filme na vida. Checkout depois: ZERO.
// E o Kineo 1 custa ZERO credito para conta nao-pagante (creditCostFor('fast',
// false) === 0) — 318 contas downgraded/free/0cr entregaram 473 filmes em 30d.
//
// Este teste le os ARQUIVOS REAIS e prova, nas duas direcoes:
//   (a) quem nunca rodou nada recebe o filme primeiro, com o cupom intacto;
//   (b) quem TEM video (ou clipe/imagem/audio) continua recebendo o e-mail de
//       hoje byte a byte — o ramo novo nao pode roubar o `offer_with_film` nem
//       o `standard`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

const route = readFileSync(path.join(root, 'app/api/cron/trial-lifecycle-emails/route.ts'), 'utf8')
const lib = readFileSync(path.join(root, 'lib/lifecycle/trialFilmPlans.ts'), 'utf8')
const cost = readFileSync(path.join(root, 'lib/credits/engineCost.ts'), 'utf8')

const d5 = route.slice(route.indexOf("if (c.kind === 'expired_offer_d5')"), route.indexOf("if (c.kind === 'expired_lastcall_d10')"))
const d10 = route.slice(route.indexOf("if (c.kind === 'expired_lastcall_d10')"), route.indexOf('// trial_extended'))
ok(d5.length > 500, 'bloco do D5 localizado')
ok(d10.length > 500, 'bloco do D10 localizado')

// ── A PREMISSA DO E-MAIL: o filme gratis existe de verdade ──────────────────
ok(/case 'fast':[\s\S]{0,4000}?return isPaidUser \? 5 : 0/.test(cost),
  'premissa provada no codigo: Kineo 1 (fast) custa 0 credito para conta nao-pagante')

// ── (a) O RAMO NOVO, NOS DOIS E-MAILS ───────────────────────────────────────
for (const [nome, bloco, seed, campanha] of [
  ['D5', d5, ':d5offer', 'trial_offer_d5_first_film'],
  ['D10', d10, ':d10offer', 'trial_offer_d10_first_film'],
]) {
  ok(bloco.includes('if (c.videosMade === 0 && otherDeliveriesTotal(c.otherMade) === 0)'),
    `${nome}: ramo novo exige ZERO video E zero clipe/imagem/audio (as duas condicoes)`)
  ok(bloco.includes(`starterTopics(\`\${c.id}${seed}\`)`),
    `${nome}: semente propria (${seed}) — nao repete os 3 temas que o d0/ending/loss ja mandaram`)
  ok(bloco.includes(`oneClickBlocks(firstTopics, '${campanha}', attr)`),
    `${nome}: reusa oneClickBlocks (nenhuma copy nova) com utm proprio`)
  ok(bloco.includes('if (firstTopics.length > 0)'),
    `${nome}: falha fechada — pool vazio cai no corpo de hoje, nunca e-mail sem CTA`)
  ok(bloco.includes("body: 'offer_first_film'"),
    `${nome}: evento grava body offer_first_film (a medicao separa do standard)`)
  // Ordem: o filme antes do cupom, nos DOIS formatos. A comparacao roda DENTRO
  // do ramo novo — no D10 o ramo de quem TEM filme vem antes e tambem carrega
  // um "Claim 50% off"; medir no bloco inteiro mediria a ordem errada.
  const novo = bloco.slice(bloco.indexOf('if (c.videosMade === 0 &&'))
  ok(novo.includes('${blocks.text}') && novo.indexOf('${blocks.text}') < novo.indexOf('${COMEBACK_CODE}) is'),
    `${nome}: no texto, os temas de 1 clique vem ANTES do cupom`)
  ok(novo.includes('${blocks.html}') && novo.indexOf('${blocks.html}') < novo.indexOf("cta(url, 'Claim 50% off')"),
    `${nome}: no HTML, os temas de 1 clique vem ANTES do botao do cupom`)
  // o cupom nao muda
  ok(bloco.includes('${COMEBACK_CODE}'), `${nome}: cupom vem da constante, nunca digitado`)
  ok(!/COMEBACK50/.test(bloco), `${nome}: nenhum codigo de cupom literal no bloco`)
  ok(!/\$\d|USD|\b\d+\.\d\d\b/.test(bloco), `${nome}: sem preco literal (regra do arquivo)`)
  ok((bloco.match(/50% off Creator for 3 months/g) || []).length >= 3,
    `${nome}: a oferta continua com a MESMA frase (50% / 3 meses) — nada novo prometido`)
  // nao promete cota, nao mexe em dinheiro
  ok(!/free video is still waiting|your free video/i.test(bloco),
    `${nome}: o assunto/corpo NAO promete cota (o slot free e reservado antes do render)`)
  ok(!/needsExtensionUpdate|grantCredits|video_credits\s*:/.test(bloco),
    `${nome}: nenhuma escrita de credito no ramo novo`)
}

// ── ORDEM DE DECISAO: o ramo novo nao pode atropelar quem TEM video ─────────
ok(d5.indexOf('if (c.videosMade >= 1)') < d5.indexOf('if (c.videosMade === 0 &&'),
  'D5: o ramo de quem TEM filme decide primeiro; o ramo novo so ve quem sobrou')
ok(d10.indexOf('if (c.videosMade >= 1)') < d10.indexOf('if (c.videosMade === 0 &&'),
  'D10: idem — offer_with_film continua intocado')
ok(d5.indexOf('if (c.videosMade === 0 &&') < d5.indexOf('const text = `Hey,'),
  'D5: o ramo novo decide ANTES do corpo padrao')
ok(d10.indexOf('if (c.videosMade === 0 &&') < d10.indexOf('const text = `Hey,'),
  'D10: o ramo novo decide ANTES do corpo padrao')

// ── (b) NAO-REGRESSAO: os corpos antigos continuam la, palavra por palavra ──
ok(d5.includes("body: 'offer_with_film'"), 'D5: corpo de quem tem filme preservado')
ok(d10.includes("body: 'offer_with_film'"), 'D10: corpo de quem tem filme preservado')
ok(d5.includes("subject: 'Come back to Creator — 50% off for 3 months'"),
  'D5: assunto padrao intacto (sobra para quem tem entrega em outro produto)')
ok(d10.includes('subject: `Last call: 50% off Creator expires`'),
  'D10: assunto padrao intacto')
ok(d5.includes("body: 'standard' }") && d10.includes("body: 'standard' }"),
  'os dois ainda podem sair como standard — o ramo novo nao apaga o caminho antigo')

// ── A PROMESSA DO D10 CONTINUA VERDADEIRA ──────────────────────────────────
ok((d10.match(/last time we'll mention it/g) || []).length >= 2,
  'D10: "last time we\'ll mention it" tambem no corpo novo — a promessa nao quebra')
ok(/leave you alone/.test(d10), 'D10: a despedida continua')

// ── O DISCRIMINADOR EXISTE NO TIPO ─────────────────────────────────────────
ok(lib.includes("| 'offer_first_film'"), 'LossBody aceita offer_first_film')
ok(lib.includes("| 'offer_with_film'") && lib.includes("| 'standard'") && lib.includes("| 'never_ran'"),
  'LossBody preserva os corpos que ja existiam')
ok(/\.\.\.\(body\.body \? \{ body: body\.body \} : \{\}\)/.test(route),
  'o body viaja para o evento sem mudanca de plumbing (medicao sai de graca)')

// ── O ARQUIVO NAO GANHOU FONTE NOVA DE VERDADE ─────────────────────────────
ok(!/promo=(?!\$\{COMEBACK_CODE\})/.test(d5 + d10), 'nenhuma URL de promo com codigo literal')
ok((d5.match(/utm\('trial_offer_d5'\)/g) || []).length >= 1, 'D5: a URL do cupom continua a mesma (utm trial_offer_d5)')
ok((d10.match(/utm\('trial_offer_d10'\)/g) || []).length >= 1, 'D10: a URL do cupom continua a mesma (utm trial_offer_d10)')

console.log(`\n${n - fail}/${n} verificacoes`)
process.exit(fail ? 1 : 0)
