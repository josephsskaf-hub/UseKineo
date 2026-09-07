#!/usr/bin/env node
// ═══ GUARDIÃO — KINEO-SILENCIO-QUENTE-2026-09-07 ═══════════════════════════
//
// O que este guardião protege, em uma frase: a casa passou a escrever para
// quem apertou "comprar" 30 minutos antes — e a ÚNICA coisa que impede essa
// carta de virar spam é a porta fechada por padrão (`escolherPaginaViva`) e a
// janela (`dentroDaJanela`). Se qualquer uma das duas afrouxar, gente que
// PAGOU, gente cuja sessão MORREU e gente que clicou há 2 minutos recebe
// e-mail.
//
// ⚠️ ESTE GUARDIÃO NÃO CONTA TEXTO (memória `guardiao-contar-texto-nao-prova-condicao`):
// ele extrai as duas funções puras do próprio arquivo e as AVALIA contra uma
// tabela-verdade. Um mutante que troque um termo por `true` derruba o teste.
//
// ⚠️ E NÃO IMPORTA A ROTA (memória `guardioes-com-alias-nao-rodam`): o arquivo
// usa alias `@/` e `next/server`, que morreriam no import antes da 1ª
// verificação. Lemos a fonte, cortamos as duas funções e as compilamos
// isoladas — é o único estilo que executa de verdade em scripts/.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = join(raiz, 'app/api/admin/send-checkout-hot-nudge/route.ts')
const VIZINHA = join(raiz, 'app/api/admin/send-checkout-recovery/route.ts')
const VERCEL = join(raiz, 'vercel.json')

const ler = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const src = ler(ROTA)

let ok = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok++; return }
  falhas.push(nome)
}

// ── extrair as duas funções puras e torná-las executáveis ──────────────────
function recortar(nome) {
  const marca = `export function ${nome}(`
  const i = src.indexOf(marca)
  if (i < 0) throw new Error(`função ${nome} sumiu de route.ts`)
  // do início da assinatura até a chave que a fecha, contando profundidade
  const abre = src.indexOf('{', src.indexOf(')', i))
  let d = 0
  for (let k = abre; k < src.length; k++) {
    if (src[k] === '{') d++
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1) }
  }
  throw new Error(`função ${nome} não fecha`)
}

// TypeScript → JS: só há anotações de tipo nestas duas funções, e elas são
// removíveis por corte simples porque o corpo é aritmética e comparação.
function paraJs(ts) {
  return ts
    .replace(/^export function/, 'function')
    // 1º o TIPO DE RETORNO — se sair depois, o corte genérico de `: string`
    // come metade dele e deixa `) | null {` no meio do arquivo.
    .replace(/\)\s*:\s*[A-Za-z]+(\s*\|\s*(null|undefined))*\s*\{/, ') {')
    // 2º o parâmetro-objeto inteiro (o único tipo composto destas funções)
    .replace(/:\s*\{[\s\S]*?\}(\s*\|\s*(null|undefined))+/g, '')
    // 3º os escalares, preservando valor padrão
    .replace(/:\s*number\s*=\s*/g, ' = ')
    .replace(/:\s*(number|string|boolean)\b/g, '')
}

const escolherPaginaViva = new Function(
  `${paraJs(recortar('escolherPaginaViva'))}; return escolherPaginaViva`,
)()
const JANELA_MIN = Number(/JANELA_MIN_MINUTOS\s*=\s*(\d+)/.exec(src)?.[1])
const JANELA_MAX = Number(/JANELA_MAX_MINUTOS\s*=\s*(\d+)/.exec(src)?.[1])
const dentroDaJanela = new Function(
  `const JANELA_MIN_MINUTOS=${JANELA_MIN}, JANELA_MAX_MINUTOS=${JANELA_MAX};` +
  `${paraJs(recortar('dentroDaJanela'))}; return dentroDaJanela`,
)()

// ══════════════════════════════════════════════════════════════════════════
// 1. A PORTA — tabela-verdade de `escolherPaginaViva`
// ══════════════════════════════════════════════════════════════════════════
const AGORA = 1_757_000_000_000 // ms fixos, para o teste não depender do relógio
const vivo = AGORA / 1000 + 3600 // expira daqui a 1h, em SEGUNDOS
const morto = AGORA / 1000 - 3600
const URL = 'https://checkout.stripe.com/c/pay/cs_live_x'

// o único caso que PODE receber carta
check('open + unpaid + url + prazo vivo → manda o link',
  escolherPaginaViva({ status: 'open', payment_status: 'unpaid', url: URL, expires_at: vivo }, AGORA) === URL)
check('expires_at ausente não bloqueia (a Stripe pode omitir)',
  escolherPaginaViva({ status: 'open', payment_status: 'unpaid', url: URL }, AGORA) === URL)
check('expires_at null não bloqueia',
  escolherPaginaViva({ status: 'open', payment_status: 'unpaid', url: URL, expires_at: null }, AGORA) === URL)

// os que NÃO podem
check('sessão COMPLETE (a pessoa pagou) não recebe',
  escolherPaginaViva({ status: 'complete', payment_status: 'paid', url: URL, expires_at: vivo }, AGORA) === null)
check('sessão EXPIRED é da outra carta, não desta',
  escolherPaginaViva({ status: 'expired', payment_status: 'unpaid', url: URL, expires_at: vivo }, AGORA) === null)
check('status ausente não recebe (falha fechada)',
  escolherPaginaViva({ payment_status: 'unpaid', url: URL, expires_at: vivo }, AGORA) === null)
check('open mas payment_status=paid não recebe (cinto e suspensório)',
  escolherPaginaViva({ status: 'open', payment_status: 'paid', url: URL, expires_at: vivo }, AGORA) === null)
check('open sem url não recebe — o link é a promessa inteira',
  escolherPaginaViva({ status: 'open', payment_status: 'unpaid', url: null, expires_at: vivo }, AGORA) === null)
check('open com url vazia não recebe',
  escolherPaginaViva({ status: 'open', payment_status: 'unpaid', url: '', expires_at: vivo }, AGORA) === null)
check('open com prazo VENCIDO não recebe',
  escolherPaginaViva({ status: 'open', payment_status: 'unpaid', url: URL, expires_at: morto }, AGORA) === null)
check('sessão nula não recebe',
  escolherPaginaViva(null, AGORA) === null)
check('sessão undefined não recebe',
  escolherPaginaViva(undefined, AGORA) === null)

// O DEFEITO DE 1970: se alguém comparar `expires_at` com `Date.now()` sem os
// mil, todo link parece morto e a carta nunca sai. Este check morre nesse dia.
check('expires_at é lido em SEGUNDOS, não em milissegundos',
  escolherPaginaViva({ status: 'open', payment_status: 'unpaid', url: URL, expires_at: Math.floor(AGORA / 1000) + 60 }, AGORA) === URL)

// ══════════════════════════════════════════════════════════════════════════
// 2. A JANELA — a fronteira com a carta de expiração
// ══════════════════════════════════════════════════════════════════════════
const min = (m) => AGORA - m * 60_000
check('janela mínima é de 30 minutos', JANELA_MIN === 30)
check('janela máxima é de 6 horas', JANELA_MAX === 360)
check('clicou agora: NÃO recebe (estaria digitando o cartão)', dentroDaJanela(min(0), AGORA) === false)
check('clicou há 5 min: NÃO recebe', dentroDaJanela(min(5), AGORA) === false)
check('clicou há 29 min: NÃO recebe (fronteira de baixo)', dentroDaJanela(min(29), AGORA) === false)
check('clicou há 30 min: recebe (fronteira de baixo, inclusiva)', dentroDaJanela(min(30), AGORA) === true)
check('clicou há 2h: recebe', dentroDaJanela(min(120), AGORA) === true)
check('clicou há 360 min: recebe (fronteira de cima, inclusiva)', dentroDaJanela(min(360), AGORA) === true)
check('clicou há 361 min: NÃO recebe — esfriou, é da outra carta', dentroDaJanela(min(361), AGORA) === false)
check('clicou há 25h: NÃO recebe', dentroDaJanela(min(25 * 60), AGORA) === false)
check('evento no futuro (relógio torto) NÃO recebe', dentroDaJanela(AGORA + 60_000, AGORA) === false)

// ══════════════════════════════════════════════════════════════════════════
// 3. O CHAMADOR — a janela e a porta têm de ser realmente USADAS pela rota
//    (contrato sem chamador serve zero — memória homônima)
// ══════════════════════════════════════════════════════════════════════════
check('a rota chama escolherPaginaViva na resposta da Stripe',
  /return\s+escolherPaginaViva\(s,\s*Date\.now\(\)\)/.test(src))
check('a rota busca a sessão na Stripe (não monta link à mão)',
  /stripe\.checkout\.sessions\.retrieve\(sessionId\)/.test(src))
check('a rota filtra a janela também em código, não só na query',
  /if\s*\(!dentroDaJanela\(new Date\(r\.created_at as string\)\.getTime\(\), agora\)\)\s*continue/.test(src))
check('o corte de baixo entra na query do banco (.lte com JANELA_MIN)',
  /const ate = new Date\(agora - JANELA_MIN_MINUTOS \* 60 \* 1000\)/.test(src) && /\.lte\('created_at', ate\)/.test(src))
check('a coorte nasce de checkout_started, não de sessão expirada',
  /\.eq\('name', 'checkout_started'\)/.test(src) && !/'checkout_session_expired'/.test(src))
check('quem não tem página viva é DESCARTADO antes do envio',
  /if\s*\(!link\)\s*\{\s*semPagina\+\+;\s*continue\s*\}/.test(src))
check('o laço de envio itera comPagina, nunca a lista crua',
  /for\s*\(const c of comPagina\)/.test(src) && !/for\s*\(const c of naoSuprimidos\)/.test(src))

// ══════════════════════════════════════════════════════════════════════════
// 4. AS TRAVAS DO CICLO (o fundador nomeou cada uma)
// ══════════════════════════════════════════════════════════════════════════
check('dry-run é o padrão: só envia com confirm=SEND',
  /const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(src) &&
  /if\s*\(!confirm\)\s*\{[\s\S]{0,400}mode:\s*'DRY_RUN'/.test(src))
check('teto de 30 por lote, mesmo se pedirem mais',
  /Math\.min\(limiteParam,\s*30\)/.test(src))
check('supressão de 24h aplicada à lista',
  /loadLifecycleSuppression\(admin,/.test(src) && /!sup\.isSuppressed\(c\.id\)/.test(src))
check('cabeçalho de descadastro em todo envio', /headers: unsubscribeHeaders\(c\.id\)/.test(src))
check('rodapé de descadastro no texto e no html',
  /emailFooterText\(userId\)/.test(src) && /emailFooterHtml\(userId\)/.test(src))
for (const b of ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']) {
  check(`contato proibido bloqueado: ${b}`, src.includes(`'${b}'`))
}
check('a lista de bloqueados é realmente consultada',
  /if\s*\(isBloqueado\(e\)\)\s*\{\s*excluidos\.bloqueado\+\+;\s*return false\s*\}/.test(src))
check('quem já pagou não recebe (has_paid e payment_success)',
  /p\.has_paid === true/.test(src) && /\.eq\('name', 'payment_success'\)/.test(src))
check('opt-out respeitado', /p\.email_opted_out === true/.test(src))
check('e-mail descartável barrado', /DISPOSABLE\.some/.test(src))
check('carimbo vitalício de 1 carta por pessoa',
  /const SENT_EVENT = 'checkout_hot_nudge_emailed_v1'/.test(src) &&
  /\.eq\('name', SENT_EVENT\)/.test(src) && /if\s*\(ja\.has\(id\)\)/.test(src))
check('os três dedupes passam pelo tripwire de 1000',
  (src.match(/dedupeTripwire\(/g) ?? []).length === 3)
check('a rota exige CRON_SECRET ou sessão de admin',
  /Boolean\(cronSecret\) && req\.headers\.get\('authorization'\) === `Bearer \$\{cronSecret\}`/.test(src) &&
  /ADMIN_EMAILS\.has/.test(src))
check('o link pessoal de pagamento NÃO é gravado no banco',
  /live_url_used: true/.test(src) && !/liveUrl,\s*$/m.test(src.split('metadata: {')[1] ?? ''))

// ══════════════════════════════════════════════════════════════════════════
// 5. A CARTA NÃO MENTE (cada frase tem de ser verdadeira no envio)
// ══════════════════════════════════════════════════════════════════════════
check('não promete crédito', !/\bcredits?\b/i.test(src.split('function corpoTexto')[1].split('type Candidato')[0]))
const corpo = src.split('function corpoTexto')[1].split('type Candidato')[0]
check('não inventa cupom nem desconto', !/coupon|discount|% off|promo code/i.test(corpo))
check('não usa urgência falsa nem contador',
  !/hurry|last chance|expires in \d|only \d+ left|act now/i.test(corpo))
check('nomeia o filme SÓ quando ele existe',
  /const feito = temFilme/.test(corpo) && /You got as far as the payment page/.test(corpo))
check('promete a MESMA página, não uma nova escolha',
  /same plan, same price, nothing to pick again/.test(corpo))
check('a saída barata é o trial de $1 já público, não preço novo',
  /\$1 for the first 7 days/.test(corpo) && /\$15\/month/.test(corpo))
check('o link do plano é etiquetado (senão a venda chega como tráfego direto)',
  /utm_campaign=checkout_hot_nudge/.test(src))
check('convite de resposta direta ao fundador',
  /hit reply/.test(corpo) && /REPLY_TO = 'joseph@usekineo\.com'/.test(src))
check('o assunto descreve o estado real da sessão',
  /is still open/.test(src.split('function assunto')[1].split('/** ⚠️')[0]))

// ══════════════════════════════════════════════════════════════════════════
// 6. PRECEDÊNCIA — as duas cartas do mesmo momento se excluem NOS DOIS SENTIDOS
//    (memória `a-regra-vive-em-varios-arquivos`)
// ══════════════════════════════════════════════════════════════════════════
const vizinha = ler(VIZINHA)
check('a quente exclui quem já levou a de expiração',
  /'checkout_recovery_emailed_v1'/.test(src.split('OUTRAS_CAMPANHAS = [')[1].split(']')[0]))
check('a de expiração exclui quem já levou a quente',
  /'checkout_hot_nudge_emailed_v1'/.test(vizinha.split('OUTRAS_CAMPANHAS = [')[1].split(']')[0]))
check('a quente exclui a carta da recusa de cartão',
  /'card_declined_emailed_v1'/.test(src.split('OUTRAS_CAMPANHAS = [')[1].split(']')[0]))

// ══════════════════════════════════════════════════════════════════════════
// 7. O CRON — sem ele a rota é peça sem superfície (memória homônima)
// ══════════════════════════════════════════════════════════════════════════
const vercel = ler(VERCEL)
const conf = JSON.parse(vercel)
const meu = (conf.crons ?? []).find((c) => String(c.path).includes('send-checkout-hot-nudge'))
check('o cron existe no vercel.json', Boolean(meu))
check('o cron manda de verdade (confirm=SEND)', Boolean(meu) && meu.path.includes('confirm=SEND'))
check('o cron respeita o teto de 30', Boolean(meu) && meu.path.includes('limit=30'))
check('o cron roda de 15 em 15 minutos', Boolean(meu) && meu.schedule === '6,21,36,51 * * * *')
// Cron no mesmo minuto não tem ordem — memória homônima. Nenhuma outra
// campanha de e-mail pode dividir um minuto com esta.
const meusMin = new Set([6, 21, 36, 51])
const colisoes = (conf.crons ?? [])
  .filter((c) => c !== meu && /send-|email/.test(String(c.path)))
  .filter((c) => {
    const m = String(c.schedule).split(' ')[0]
    if (m === '*') return true
    if (m.startsWith('*/')) {
      const passo = Number(m.slice(2))
      for (let k = 0; k < 60; k += passo) if (meusMin.has(k)) return true
      return false
    }
    return m.split(',').map(Number).some((k) => meusMin.has(k))
  })
  .map((c) => `${c.path} @ ${c.schedule}`)
check(`nenhuma outra campanha divide o minuto (colisões: ${colisoes.join(' | ') || 'nenhuma'})`,
  colisoes.length === 0)

// ══════════════════════════════════════════════════════════════════════════
console.log(`\n${falhas.length === 0 ? '✅' : '❌'} checkout-hot-nudge: ${ok}/${ok + falhas.length}`)
for (const f of falhas) console.log(`   ✗ ${f}`)
process.exit(falhas.length === 0 ? 0 : 1)
