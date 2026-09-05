/**
 * GUARDIÃO — sprint-assinaturas #3 (05/09/2026)
 *
 * O e-mail de lead quente (`app/api/cron/send-recovery`) tratava "desistiu de
 * pagar" e "nunca viu o produto" como a MESMA pessoa. Medido em produção:
 * 6 das 15 linhas de `checkout_abandoned` das últimas 48h são de gente com
 * ZERO filme concluído e os 25 créditos do trial intactos — e a abertura do
 * e-mail perguntava "did something get in the way? A payment issue?".
 *
 * Este guardião lê o ARQUIVO REAL (nunca uma cópia, nunca um mock do texto) e
 * prova as invariantes que fazem o ramo novo ser seguro:
 *   · o ramo só existe quando 0 filmes E saldo que compra um filme;
 *   · desconhecido cai na copy de HOJE (falha aberta);
 *   · o piso de crédito é IMPORTADO, não digitado;
 *   · a contagem de filmes é exata por pessoa (nada de `.in()` truncável);
 *   · a porta do plano continua no corpo (regra K1);
 *   · nada de preço, desconto, cupom ou concessão de crédito entrou junto;
 *   · o assunto histórico continua sendo o de quem JÁ fez filme.
 *
 * Uso: node scripts/test-recovery-first-film-2026-09-05.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROUTE_PATH = join(ROOT, 'app', 'api', 'cron', 'send-recovery', 'route.ts')
const FOOTER_PATH = join(ROOT, 'lib', 'lifecycle', 'videoReadyFooter.ts')

const route = readFileSync(ROUTE_PATH, 'utf8')
const footer = readFileSync(FOOTER_PATH, 'utf8')

let ok = 0
let fail = 0
const check = (name, cond, detail = '') => {
  if (cond) {
    ok += 1
    console.log(`  ok   ${name}`)
  } else {
    fail += 1
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/** Corpo de uma função de topo de arquivo, por chaves balanceadas. */
function fnBody(src, signature) {
  const start = src.indexOf(signature)
  if (start < 0) return null
  const open = src.indexOf('{', start)
  if (open < 0) return null
  let depth = 0
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') {
      depth -= 1
      if (depth === 0) return src.slice(open, i + 1)
    }
  }
  return null
}

console.log('\n== 1. O ramo novo existe e é uma função de verdade ==')
const firstFilm = fnBody(route, 'function buildFirstFilmEmail(')
check('1.1 buildFirstFilmEmail existe no arquivo real', firstFilm !== null)
check('1.2 buildEmail (a copy de hoje) continua existindo', fnBody(route, 'function buildEmail(') !== null)
check(
  '1.3 o ramo é escolhido no laço de envio, não num helper morto',
  /firstFilmBranch\s*\n?\s*\?\s*buildFirstFilmEmail\(/.test(route),
)

console.log('\n== 2. A CONDIÇÃO: 0 filmes E saldo que compra um filme ==')
check('2.1 firstFilmBranch exige films === 0', /const firstFilmBranch = canAffordFilm && films === 0/.test(route))
check(
  '2.2 canAffordFilm exige saldo conhecido E >= piso',
  /const canAffordFilm = balance !== null && balance >= NEXT_VIDEO_MIN_CREDITS/.test(route),
)
check(
  '2.3 films só é consultado quando o saldo já compra um filme',
  /const films = canAffordFilm \? await completedFilmCount\(admin, userId\) : null/.test(route),
)

console.log('\n== 3. FALHA ABERTA: desconhecido usa a copy de HOJE ==')
const countFn = fnBody(route, 'async function completedFilmCount(')
check('3.1 completedFilmCount existe', countFn !== null)
check('3.2 erro de query devolve null (desconhecido)', countFn !== null && /if \(error\)[\s\S]{0,160}return null/.test(countFn))
check('3.3 exceção devolve null (desconhecido)', countFn !== null && /catch \([\s\S]{0,120}return null/.test(countFn))
check(
  '3.4 null NUNCA satisfaz a condição do ramo (=== 0 é estrito)',
  /films === 0/.test(route) && !/films\s*==\s*0[^=]/.test(route),
  'um `films == 0` frouxo deixaria null virar 0',
)

console.log('\n== 4. O piso de crédito é IMPORTADO, não digitado ==')
check(
  '4.1 NEXT_VIDEO_MIN_CREDITS vem de lib/lifecycle/videoReadyFooter',
  /import \{ NEXT_VIDEO_MIN_CREDITS \} from '@\/lib\/lifecycle\/videoReadyFooter'/.test(route),
)
check('4.2 e esse símbolo é realmente exportado de lá', /export const NEXT_VIDEO_MIN_CREDITS/.test(footer))
check(
  '4.3 a rota não redefine um piso próprio',
  !/const\s+\w*MIN_CREDITS\w*\s*=\s*\d/.test(route),
)

console.log('\n== 5. Contagem de filmes à prova do truncamento de 1000 linhas ==')
check(
  '5.1 usa count exato com head (não traz linhas)',
  countFn !== null && /count: 'exact'[\s\S]{0,40}head: true/.test(countFn),
)
check('5.2 filtra por uma pessoa só (eq), nunca .in() sobre a coorte', countFn !== null && /\.eq\('user_id', userId\)/.test(countFn) && !/\.in\(/.test(countFn))
check("5.3 conta apenas filme CONCLUÍDO", countFn !== null && /\.eq\('status', 'completed'\)/.test(countFn))

console.log('\n== 6. Regra K1: a porta do plano continua aberta no e-mail ==')
check('6.1 o corpo novo leva o link de /pricing', firstFilm !== null && /campaignUrl\('\/pricing'\)/.test(firstFilm))
check('6.2 o corpo novo mantém o PayPal', firstFilm !== null && /paypalLink\(/.test(firstFilm))
check('6.3 o corpo novo leva UM link para fazer o primeiro filme', firstFilm !== null && /campaignUrl\('\/studio\/create'\)/.test(firstFilm))
check(
  '6.4 o link do primeiro filme aparece ANTES do link do plano (a manchete mudou)',
  firstFilm !== null && firstFilm.indexOf("campaignUrl('/studio/create')") < firstFilm.indexOf("campaignUrl('/pricing')"),
)

console.log('\n== 7. Nada de preço, desconto, promessa ou crédito novo ==')
const PROIBIDO = [/discount/i, /coupon/i, /promo code/i, /% off/i, /free month/i, /we'll add/i, /we will add/i, /extra credits/i]
for (const re of PROIBIDO) {
  check(`7.x o ramo novo não contém ${re}`, firstFilm !== null && !re.test(firstFilm))
}
check(
  '7.8 o ramo novo não escreve nenhum valor em dinheiro',
  firstFilm !== null && !/\$\s?\d/.test(firstFilm),
)
check(
  '7.9 o job não concede crédito (nenhum update de video_credits)',
  !/video_credits\s*:/.test(route),
)
check(
  '7.10 o número de créditos vem do saldo lido, não de um literal',
  firstFilm !== null && /Math\.floor\(balance\)/.test(firstFilm) && !/\b25 credits\b/.test(firstFilm),
)

console.log('\n== 8. O assunto: um por ramo, e o histórico intacto ==')
check("8.1 o assunto histórico virou constante", /const RECOVERY_SUBJECT = 'Quick question about your Kineo checkout'/.test(route))
check('8.2 buildEmail devolve o assunto histórico', /return \{ subject: RECOVERY_SUBJECT,/.test(route))
check('8.3 o ramo novo devolve um assunto próprio', firstFilm !== null && /subject: `Your \$\{credits\}/.test(firstFilm))
check(
  '8.4 o POST do Resend usa o assunto escolhido, não um literal',
  /subject,\n\s+text,/.test(route) && !/subject: 'Quick question about your Kineo checkout',\n\s+text/.test(route),
)

console.log('\n== 9. Medição: o placar consegue separar os dois textos ==')
check('9.1 contador do ramo novo existe', /let sentFirstFilm = 0/.test(route))
check('9.2 só incrementa em envio ok', /sent\+\+\n\s+if \(firstFilmBranch\) sentFirstFilm\+\+/.test(route))
check('9.3 o payload do cron expõe sent_first_film', /sent_first_film: sentFirstFilm,/.test(route))
check('9.4 o log diz qual ramo saiu', /branch=\$\{firstFilmBranch \? 'first_film' : 'checkout'\}/.test(route))
check(
  '9.5 os links do ramo novo carregam utm_campaign próprio',
  /const FIRST_FILM_CAMPAIGN = 'checkout_recovery_first_film'/.test(route) &&
    /utm_campaign=\$\{FIRST_FILM_CAMPAIGN\}/.test(route),
)

console.log('\n== 10. Guarda-corpos do job continuam de pé ==')
check('10.1 CRON_SECRET fail-closed intacto', /if \(!cronSecret\) return false/.test(route))
check('10.2 gate de e-mails de ciclo de vida intacto', /LIFECYCLE_EMAILS_ENABLED/.test(route))
check('10.3 supressão cruzada intacta', /loadLifecycleSuppression\(admin, userIds, HOT_LEAD_SUPPRESSION_HOURS\)/.test(route))
check('10.4 carimbo vitalício (1 e-mail por pessoa) intacto', /recovery_sent_at: new Date\(\)\.toISOString\(\)/.test(route))
check('10.5 teto por execução intacto', /MAX_EMAILS_PER_RUN/.test(route))
check('10.6 contas de teste/fundador continuam puladas', /isTestEmail\(email\)/.test(route))

console.log('\n== 11. O HTML do ramo novo é o MESMO do e-mail de hoje ==')
check('11.1 plainHtml foi extraído', fnBody(route, 'function plainHtml(') !== null)
check('11.2 buildEmail usa plainHtml', /html: plainHtml\(text, userId\)/.test(route))
check('11.3 buildFirstFilmEmail usa plainHtml', firstFilm !== null && /html: plainHtml\(text, userId\)/.test(firstFilm))
check('11.4 o rodapé de descadastro entra nos dois', (route.match(/emailFooterText\(userId\)/g) ?? []).length >= 2)

console.log(`\n${fail === 0 ? 'VERDE' : 'VERMELHO'}: ${ok} ok, ${fail} fail\n`)
process.exit(fail === 0 ? 0 : 1)
