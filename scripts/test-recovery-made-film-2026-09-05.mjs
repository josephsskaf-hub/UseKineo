/**
 * GUARDIÃO — sprint-assinaturas #8 (05/09/2026)
 *
 * O E-MAIL QUE O LEAD MAIS QUENTE DA CASA RECEBE NUNCA MENCIONOU O FILME QUE
 * A PESSOA JÁ TINHA FEITO.
 *
 * Medido em produção (05/09, contas externas, 21 dias): 84 pessoas abriram o
 * checkout e 5 pagaram. Das 79 que não pagaram, 78 viraram linha de
 * `checkout_abandoned` e 78 receberam este e-mail — mediana de 6,6h depois do
 * clique. O alcance nunca foi o problema. O CONTEÚDO era: 51 dessas 79 têm um
 * filme concluído (49 com título no banco) e o texto perguntava a elas sobre
 * atrito de PAGAMENTO, nunca sobre o filme que elas já tinham nas mãos.
 *
 * Este guardião lê os ARQUIVOS REAIS e prova as invariantes do ramo novo:
 *   · a carta só sai com contagem > 0 E título utilizável (falha aberta);
 *   · o título do CLIENTE é saneado antes de entrar no HTML do e-mail —
 *     `plainHtml()` não escapa nada, e este é o primeiro conteúdo de cliente
 *     a passar por ele;
 *   · nada de `/v/<id>`: a superfície pública de vídeo está DESLIGADA desde
 *     27/08 e todo link desses é 404;
 *   · a porta do plano e o PayPal continuam no corpo (regra K1);
 *   · zero preço, desconto, cupom ou crédito concedido;
 *   · o placar consegue separar as três cartas.
 *
 * Uso: node scripts/test-recovery-made-film-2026-09-05.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROUTE_PATH = join(ROOT, 'app', 'api', 'cron', 'send-recovery', 'route.ts')
const SERIES_PATH = join(ROOT, 'lib', 'seriesContinuation.ts')
const POLICY_PATH = join(ROOT, 'lib', 'publicSurfacePolicy.ts')

/** CRLF -> LF na LEITURA. Sem isto o guardião fica VERMELHO num checkout limpo
 *  do Windows (autocrlf=true) em toda verificação que casa duas linhas
 *  seguidas — e vermelho que não é do código ensina a ignorar o guardião. */
const lf = (raw) => raw.replace(new RegExp(String.fromCharCode(13), 'g'), '')
const route = lf(readFileSync(ROUTE_PATH, 'utf8'))
const series = lf(readFileSync(SERIES_PATH, 'utf8'))
const policy = lf(readFileSync(POLICY_PATH, 'utf8'))

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

console.log('\n== 1. A carta nova existe e é uma função de verdade ==')
const made = fnBody(route, 'function buildMadeFilmEmail(')
const sane = fnBody(route, 'function safeFilmTitle(')
const lookup = fnBody(route, 'async function latestCompletedFilm(')
check('1.1 buildMadeFilmEmail existe no arquivo real', made !== null)
check('1.2 safeFilmTitle existe no arquivo real', sane !== null)
check('1.3 latestCompletedFilm existe no arquivo real', lookup !== null)
check('1.4 a carta devolve assunto próprio (não o histórico)', made !== null && /subject: `"\$\{subjectTitle\}"/.test(made))

console.log('\n== 2. O ramo só existe com FILME e TÍTULO — falha aberta ==')
check(
  '2.1 madeTitle exige contagem > 0',
  /const madeTitle = film && film\.count > 0 \? safeFilmTitle\(film\.title\) : null/.test(route),
)
check(
  '2.2 o ramo exige título utilizável E não colide com o do primeiro filme',
  /const madeFilmBranch = !firstFilmBranch && madeTitle !== null && film !== null/.test(route),
)
check(
  '2.3 sem título, a copy histórica (buildEmail) continua sendo a saída',
  /: buildEmail\(planName, cand\.tier, userId, balance\)/.test(route),
)
check(
  '2.4 erro de consulta devolve null (desconhecido), nunca um objeto vazio',
  lookup !== null && /if \(error\)[\s\S]{0,200}return null/.test(lookup) && /catch \([\s\S]{0,160}return null/.test(lookup),
)
check(
  '2.5 o ramo do PRIMEIRO filme continua exigindo saldo (não foi afrouxado)',
  /const firstFilmBranch = canAffordFilm && films === 0/.test(route),
)

console.log('\n== 3. O título do CLIENTE é saneado antes de virar HTML ==')
check('3.1 plainHtml continua NÃO escapando (a premissa do saneador)', !/escapeHtml/.test(route))
check(
  '3.2 a única coisa que entra na carta é o retorno de safeFilmTitle',
  /buildMadeFilmEmail\(planName, cand\.tier, userId, balance, film as LatestFilm, madeTitle as string\)/.test(route) &&
    // E o título CRU nunca chega ao construtor por nenhum caminho. Sem esta
    // metade, trocar `safeFilmTitle(film.title)` por `film.title` na linha de
    // cima passava por aqui — falsificado em cópia, 05/09.
    !/buildMadeFilmEmail\([^)]*film\.title/.test(route),
)
check('3.3 o saneador remove os caracteres que abrem marcação', sane !== null && /\[<>"`\]/.test(sane))
check('3.4 o saneador remove caracteres de controle', sane !== null && /u0000-\\u001F/.test(sane))
check('3.5 o saneador limita o tamanho', sane !== null && /> 80/.test(sane))

console.log('\n== 4. Comportamento REAL do saneador (código extraído do arquivo) ==')
let safeFilmTitle = null
if (sane !== null) {
  // O corpo é JS puro depois de tirar as anotações de tipo da assinatura.
  const body = sane.slice(1, -1)
  // eslint-disable-next-line no-new-func
  safeFilmTitle = new Function('raw', body)
}
check('4.1 o corpo do saneador é executável', typeof safeFilmTitle === 'function')
if (typeof safeFilmTitle === 'function') {
  const injected = safeFilmTitle('<img src=x onerror=alert(1)> The Lake')
  check('4.2 uma tag no título não sobrevive', typeof injected === 'string' && !injected.includes('<') && !injected.includes('>'), String(injected))
  check('4.3 aspas somem (o corpo já envolve o título em aspas)', safeFilmTitle('The "Boiling" River') === 'The Boiling River')
  check('4.4 quebras de linha viram um espaço só', safeFilmTitle('Lake\nNatron\n\nKenya') === 'Lake Natron Kenya')
  check('4.5 não-string devolve null', safeFilmTitle(null) === null && safeFilmTitle(42) === null && safeFilmTitle(undefined) === null)
  check('4.6 string vazia ou só espaço devolve null', safeFilmTitle('   ') === null && safeFilmTitle('') === null)
  const long = safeFilmTitle('x'.repeat(200))
  check('4.7 título gigante é cortado em 80', typeof long === 'string' && long.length <= 80, String(long && long.length))
  check('4.8 título normal passa intacto', safeFilmTitle('The Lake That Turns Animals To Stone') === 'The Lake That Turns Animals To Stone')
}

console.log('\n== 5. NUNCA linkar /v/<id>: a superfície pública está desligada ==')
check(
  '5.1 a política continua desligada (a premissa desta regra)',
  /CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false as const/.test(policy),
)
check('5.2 a rota não linka nenhuma página pública de vídeo', !/\/v\/\$\{/.test(route) && !/'\/v\//.test(route))

console.log('\n== 6. Regra K1: comprar não depende do episódio 2 ==')
check('6.1 a porta do plano está no corpo da carta', made !== null && /campaignUrl\('\/pricing', MADE_FILM_CAMPAIGN\)/.test(made))
check('6.2 o PayPal continua oferecido', made !== null && /paypalLink\(/.test(made))
check('6.3 o convite a responder continua', made !== null && /hit reply|Hit reply/.test(made))
check('6.4 o saldo só é afirmado quando existe (creditsLine)', made !== null && /creditsLine\(balance\)/.test(made))

console.log('\n== 7. A carta não promete nada que a casa não vá cumprir ==')
check('7.1 nenhum preço digitado na carta', made !== null && !/\$\d/.test(made))
check('7.2 nenhuma promessa de desconto ou cupom', made !== null && !/discount|coupon|promo code|off your first/i.test(made))
check('7.3 nenhum crédito é concedido aqui', made !== null && !/grant|video_credits|admin_credits/i.test(made))
check(
  '7.4 o plano é medido em FILMES pelos helpers da casa, sem número digitado',
  made !== null && /filmsPerPlan\(sanitizeFilmCost\(film\.cost\)\)/.test(made) && /filmPlanLine\(r\)/.test(made),
)
check('7.5 a duração nunca é inventada (filmNoun)', made !== null && /filmNoun\(film\.durationSeconds\)/.test(made))

console.log('\n== 8. O episódio 2 usa a porta oficial, com fonte própria ==')
check(
  '8.1 a carta usa buildSeriesContinuationEmailUrl',
  made !== null && /buildSeriesContinuationEmailUrl\(APP_URL, seed, 'lifecycle_checkout_recovery_email'/.test(made),
)
check("8.2 a fonte nova existe no contrato", /'lifecycle_checkout_recovery_email'/.test(series))
check(
  '8.3 a semente é o tema real, com o título como segunda opção',
  made !== null && /const seed = \(film\.topic \?\? ''\)\.trim\(\) \|\| title/.test(made),
)

console.log('\n== 9. O placar consegue separar as TRÊS cartas ==')
check('9.1 contador próprio existe', /let sentMadeFilm = 0/.test(route))
check('9.2 só incrementa em envio ok', /if \(firstFilmBranch\) sentFirstFilm\+\+\n\s+if \(madeFilmBranch\) sentMadeFilm\+\+/.test(route))
check('9.3 o payload do cron expõe sent_made_film', /sent_made_film: sentMadeFilm,/.test(route))
check('9.4 campanha própria no utm', /const MADE_FILM_CAMPAIGN = 'checkout_recovery_made_film'/.test(route))

console.log('\n== 10. Guarda-corpos do job continuam de pé ==')
check('10.1 CRON_SECRET fail-closed intacto', /if \(!cronSecret\) return false/.test(route))
check('10.2 gate de e-mails de ciclo de vida intacto', /LIFECYCLE_EMAILS_ENABLED/.test(route))
check('10.3 supressão cruzada intacta', /loadLifecycleSuppression\(admin, userIds, HOT_LEAD_SUPPRESSION_HOURS\)/.test(route))
check('10.4 carimbo vitalício (1 e-mail por pessoa) intacto', /recovery_sent_at: new Date\(\)\.toISOString\(\)/.test(route))
check('10.5 teto por execução intacto', /MAX_EMAILS_PER_RUN/.test(route))
check('10.6 a carta nova usa o mesmo HTML das outras duas', made !== null && /html: plainHtml\(text, userId\)/.test(made))
check('10.7 o rodapé de descadastro entra nas três', (route.match(/emailFooterText\(userId\)/g) ?? []).length >= 3)

console.log(`\n${fail === 0 ? 'VERDE' : 'VERMELHO'}: ${ok} ok, ${fail} fail\n`)
process.exit(fail === 0 ? 0 : 1)
