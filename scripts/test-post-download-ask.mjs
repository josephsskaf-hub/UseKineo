// Guardião de KINEO-DOWNLOAD-E-O-MOMENTO-2026-09-07.
//
// Estilo readFileSync de propósito: guardião com alias '@/' morre no import
// antes da 1ª verificação (72 testes desta casa já morreram assim). A regra
// pura é reimplementada a partir do PRÓPRIO arquivo via transpile manual? Não:
// o módulo é TS sem dependências, então o exercitamos traduzindo o corpo por
// leitura literal — e AMARRAMOS cada caso ao texto do arquivo, para que um
// mutante que troque um `if` por constante fique vermelho.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const MOD = join(raiz, 'lib/growth/postDownloadAsk.ts')
const CLIENT = join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx')
const src = readFileSync(MOD, 'utf8')
const cli = readFileSync(CLIENT, 'utf8')

let ok = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok++; return }
  falhas.push(nome)
}

// ── 1. A ORDEM DAS GUARDAS É A REGRA ──────────────────────────────────────
// Se qualquer uma destas sair de ordem, a função passa a mentir. Ancoramos em
// posição, não só em presença: um mutante que mova `hasPaid` para antes de
// `watermarkOfferVisible` fica vermelho aqui.
const iNotDl = src.indexOf("reason: 'not_downloaded'")
const iWm = src.indexOf("reason: 'watermark_offer_owns_moment'")
const iPaid = src.indexOf("reason: 'already_paid'")
const iEnding = src.indexOf("reason: 'trial_ending'")
const iActive = src.indexOf("reason: 'trial_active'")
const iNo = src.indexOf("reason: 'no_surface'")
check('1 not_downloaded existe', iNotDl > 0)
check('2 watermark_offer_owns_moment existe', iWm > 0)
check('3 already_paid existe', iPaid > 0)
check('4 trial_ending existe', iEnding > 0)
check('5 trial_active existe', iActive > 0)
check('6 no_surface existe', iNo > 0)
check('7 download entregue é a PRIMEIRA guarda', iNotDl < iWm)
check('8 watermark vence hasPaid (não empilhar oferta)', iWm < iPaid)
check('9 hasPaid vence a fase de trial', iPaid < iEnding)
check('10 ending é avaliado antes de active', iEnding < iActive)
check('11 no_surface é o último recurso', iNo > iActive)

// ── 2. CADA GUARDA ESTÁ AMARRADA À VARIÁVEL QUE DECIDE ────────────────────
// Contar texto não prova condição: um mutante que troque o `if` por `true`
// manteria a contagem intacta. Estes casos leem a EXPRESSÃO.
check('12 not_downloaded lê !downloadDelivered',
  /if\s*\(\s*!\s*input\.downloadDelivered\s*\)/.test(src))
check('13 watermark lê input.watermarkOfferVisible',
  /if\s*\(\s*input\.watermarkOfferVisible\s*\)/.test(src))
check('14 already_paid lê input.hasPaid',
  /if\s*\(\s*input\.hasPaid\s*\)/.test(src))
check('15 trial_ending compara trialPhase === ending',
  /if\s*\(\s*input\.trialPhase\s*===\s*'ending'\s*\)/.test(src))
check('16 trial_active compara trialPhase === active',
  /if\s*\(\s*input\.trialPhase\s*===\s*'active'\s*\)/.test(src))

// ── 3. A FUNÇÃO NÃO PODE CRIAR CAIXA NOVA NEM TOCAR PREÇO ─────────────────
check('17 o módulo não importa nada (é puro)', !/^\s*import\s/m.test(src))
check('18 o módulo não menciona preço', !/\$\d/.test(src))
check('19 ask:true só existe nos dois ramos de trial',
  (src.match(/\{ ask: true,/g) || []).length === 2)

// ── 4. O CLIENTE REALMENTE CONSULTA E EMITE ───────────────────────────────
// Sem estes, o módulo é biblioteca morta — o defeito que esta casa já cometeu
// (sceneTruth.ts em produção com ZERO chamadores).
check('20 o cliente importa a decisão', /decidePostDownloadAsk/.test(cli))
check('21 o cliente importa a sobrancelha', /postDownloadEyebrow/.test(cli))
check('22 emite post_download_ask_state', /post_download_ask_state/.test(cli))
check('23 o evento carrega o reason', /reason:\s*decision\.reason/.test(cli))

// ── 5. A ENTREGA VEM PRIMEIRO — E ISSO É VERIFICÁVEL ──────────────────────
// O bloco novo TEM que rodar depois do await do arquivo e sob `delivered`.
const iAwaitDl = cli.indexOf('await downloadVideoFile(')
const iDelivered = cli.indexOf('const delivered = outcome ===')
const iSetDelivered = cli.indexOf('setDownloadDelivered(true)')
check('24 setDownloadDelivered vem DEPOIS do await do arquivo', iAwaitDl > 0 && iSetDelivered > iAwaitDl)
check('25 setDownloadDelivered vem depois de calcular `delivered`', iSetDelivered > iDelivered)
check('26 o estado novo NÃO substitui watermarkedDownloadConfirmed',
  /setWatermarkedDownloadConfirmed\(true\)/.test(cli))
check('27 o watermark continua condicionado a exportType watermarked',
  /exportType === 'watermarked'\s*\)\s*\{\s*\n\s*setWatermarkedDownloadConfirmed/.test(cli))

// ── 6. O EVENTO CONTA PESSOAS, NÃO CLIQUES ────────────────────────────────
check('28 existe trava de uma vez por vídeo', /postDownloadAskLoggedRef/.test(cli))
check('29 a trava é consultada antes de emitir',
  /postDownloadAskLoggedRef\.current\.has\(askKey\)/.test(cli))
check('30 a chave é o id do vídeo', /const askKey = publicVideoId/.test(cli))

// ── 7. A SOBRANCELHA SÓ TROCA DEPOIS DO DOWNLOAD ──────────────────────────
check('31 a sobrancelha antiga continua sendo o fallback',
  /postDownloadAskEyebrow\s*\n?\s*\?\?\s*\(trialPostVideoPhase === 'ending'/.test(cli))
check('32 a sobrancelha nova só existe com ask=true',
  /postDownloadAsk\.ask\s*\n?\s*\?\s*postDownloadEyebrow/.test(cli))
check('33 a decisão do render lê o estado novo',
  /decidePostDownloadAsk\(\{\s*\n\s*downloadDelivered,/.test(cli))

// ── 8. NADA AQUI BLOQUEIA O DOWNLOAD GRÁTIS ───────────────────────────────
check('34 o módulo não fala em bloquear/gate', !/\bblock\b|\bgate\b|\bpaywall\b/i.test(src))

if (falhas.length) {
  console.error(`FALHOU ${falhas.length}:`)
  for (const f of falhas) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`post-download-ask: ${ok}/${ok} verificações OK`)
