// ═══════════════════════════════════════════════════════════════════════════
// A CARTA DA SEGUNDA TENTATIVA — guardiao da va-r8 (07/09/2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE ARQUIVO EXISTE. A rotacao #1 desta pista CANCELOU esta carta
// depois de medir que a premissa do cardapio era falsa: "voltou ao checkout
// 2+ vezes" contado por EVENTO da 104 pessoas e contado por SESSAO da 9 —
// um clique em comprar emite tres eventos com mediana de 0,86s entre eles.
// A carta voltou a existir com a premissa MEDIDA POR PESSOA. O que este
// guardiao impede, em ordem de gravidade:
//
//  1. QUE A CASA AFIRME A VISITA QUE NAO ACONTECEU. A frase "on N separate
//     visits" so pode existir quando o numero medido daquela pessoa e >= 2.
//     Com 1 visita a carta nao pode dizer NADA sobre visitas. (o achado #1)
//  2. QUE O NUMERO SEJA DIGITADO. Nenhum "$1"/"$19" no fonte: taxa e
//     mensalidade saem de lib/lifecycle/trialEntryFee.ts, que le a MESMA
//     constante que a Stripe cobra. (memoria `campo-validado-gravado-ecoado`)
//  3. QUE O ASSUNTO CARREGUE `videos.title`. Nesta casa esse campo e o PROMPT
//     CRU truncado em 120 caracteres — a coorte tem malaiala, tailandes, frase
//     cortada no meio e uma linha de conteudo adulto explicito. O cardapio
//     pedia o titulo no assunto; a medicao mandou usar a CONTAGEM.
//  4. QUE A CARTA SAIA SEM SUPRESSAO, SEM DESCADASTRO OU SEM O CARIMBO
//     REGISTRADO em LIFECYCLE_EMAIL_EVENT_NAMES — carimbo nao registrado e um
//     par de e-mails nossos com minutos de diferenca (KINEO-...-2026-09-06).
//  5. QUE A ROTA ENVIE POR PADRAO. Dry-run e o default; so `?confirm=SEND`
//     dispara, e o lote tem teto.
//  6. QUE A COORTE SEJA TRUNCADA EM SILENCIO. Os eventos de checkout sao
//     lidos PAGINADOS: `.limit()` no PostgREST corta em 1000 sem erro e some
//     com gente da lista. (auditoria 28/08, "truncamento sistemico")
//
// Roda a funcao REAL (transpileModule) — contar texto nao prova condicao
// (memoria `guardiao-que-conta-texto-nao-prova-condicao`). Cada mutante prova
// que APLICOU antes de exigir vermelho (memoria `mutacao-precisa-provar-que-aplicou`).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(root, 'node_modules/typescript'))

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

// CRLF normalizado na LEITURA (memoria `guardiao-crlf-falso-vermelho`).
const read = (p) => readFileSync(path.join(root, p), 'utf8').split('\r\n').join('\n')

function loadTs(p, mocks = {}, srcOverride = null) {
  const src = srcOverride ?? read(p)
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out)((id) => { if (id in mocks) return mocks[id]; throw new Error(`${p}: unexpected import ${id}`) }, m, m.exports)
  return m.exports
}

const ROUTE = 'app/api/admin/send-second-try-1usd/route.ts'
const src = read(ROUTE)

const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const pricing = loadTs('lib/checkoutPricing.ts', { '@/lib/credits/engineCost': engine, '@/lib/autopilot/config': autopilot })
const trialFee = loadTs('lib/lifecycle/trialEntryFee.ts', { '@/lib/checkoutPricing': pricing })
const reachLine = loadTs('lib/lifecycle/trialReachLine.ts', { '@/lib/credits/engineCost': engine })

const FOOT_HTML = '<!--FOOTER_HTML-->'
const FOOT_TEXT = '\n[FOOTER_TEXT]'
const MOCKS = {
  'next/server': { NextResponse: { json: (b, i) => ({ body: b, init: i }) } },
  '@/lib/supabase/server': { createClient: () => ({}) },
  '@supabase/supabase-js': { createClient: () => ({}) },
  '@/lib/emailSuppression': {
    emailFooterHtml: () => FOOT_HTML,
    emailFooterText: () => FOOT_TEXT,
    unsubscribeHeaders: () => ({ 'List-Unsubscribe': '<x>' }),
  },
  '@/lib/internalAccounts': { isInternalEmail: () => false },
  '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async () => ({ isSuppressed: () => false, suppressedCount: 0, degraded: false }) },
  '@/lib/lifecycle/trialEntryFee': trialFee,
  '@/lib/lifecycle/trialReachLine': reachLine,
  '@/lib/checkoutPricing': pricing,
}

const load = (srcOverride = null) => loadTs(ROUTE, MOCKS, srcOverride)
const { buildSecondTryEmail } = load()

const fee = trialFee.trialEntryFeeLabel({ compact: true })
const monthly = trialFee.trialMonthlyAfterLabel({ compact: true })
const P = (over = {}) => ({ id: 'u1', email: 'a@b.com', films: 3, visits: 1, lastCheckoutAt: '2026-08-10T00:00:00Z', ...over })

console.log('\n── 1. A VISITA: a casa so afirma o que mediu naquela pessoa')
{
  const uma = buildSecondTryEmail(P({ visits: 1 }))
  const duas = buildSecondTryEmail(P({ visits: 2 }))
  const quatro = buildSecondTryEmail(P({ visits: 4 }))
  ok(!/separate visits/.test(uma.text), '1 visita → o texto NAO fala em visitas')
  ok(!/separate visits/.test(uma.html), '1 visita → o html NAO fala em visitas')
  ok(!/\btwice\b|\btwo times\b|\bagain and again\b/i.test(uma.text), '1 visita → nenhum sinonimo de "duas vezes" escapou')
  ok(duas.text.includes('on 2 separate visits'), '2 visitas → o texto diz o numero MEDIDO')
  ok(duas.html.includes('on 2 separate visits'), '2 visitas → o html diz o numero MEDIDO')
  ok(quatro.text.includes('on 4 separate visits'), '4 visitas → o numero e o da pessoa, nao um literal')
  ok(!quatro.text.includes('on 2 separate visits'), '4 visitas → nao ha "2" chumbado em lugar nenhum')
  ok(!/separate visits/.test(buildSecondTryEmail(P({ visits: 0 })).text), '0 visitas (sessao ausente) → silencio sobre visitas')
}

console.log('\n── 2. OS FILMES: contagem da pessoa, plural derivado do numero')
{
  const um = buildSecondTryEmail(P({ films: 1 }))
  const tres = buildSecondTryEmail(P({ films: 3 }))
  ok(/You made a film with Kineo/.test(um.text), '1 filme → singular no corpo')
  ok(!/\bfilms\b/.test(um.text.split('\n')[2] || ''), '1 filme → nenhum plural sobrando na primeira frase')
  ok(!/\b1 films\b/.test(um.subject + um.text + um.html), '1 filme → nunca "1 films" (a licao do KINEO-TRIAL-25-2026-08-21)')
  ok(tres.text.includes('You made 3 films with Kineo'), '3 filmes → plural com o numero medido')
  ok(tres.subject.includes('3'), 'o assunto carrega a CONTAGEM da pessoa')
  ok(buildSecondTryEmail(P({ films: 18 })).subject.includes('18'), '18 filmes → o assunto diz 18')
}

console.log('\n── 3. O ASSUNTO NAO CARREGA `videos.title` (prompt cru truncado em 120)')
{
  const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
  ok(!/\btitle\b/.test(codeOnly), 'a rota nao le nenhum campo `title` (fora de comentario)')
  ok(!/videos.*select\([^)]*title/.test(src), 'nenhum select de videos pede `title`')
  ok(!/topic/.test(src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')), 'nenhum `topic` fora de comentario')
  const s = buildSecondTryEmail(P()).subject
  ok(s.length <= 90, `assunto cabe na caixa de entrada (${s.length} chars)`)
}

console.log('\n── 4. DINHEIRO NUNCA E DIGITADO')
{
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
  ok(!/\$\d/.test(code), 'nenhum valor em dolar digitado no codigo')
  ok(!/\b19\.90\b|\b7\/mo\b|\b\d+ ?\/month\b/.test(code), 'nenhuma mensalidade digitada')
  ok(src.includes("from '@/lib/lifecycle/trialEntryFee'"), 'a taxa vem da fonte unica do cobrador')
  const e = buildSecondTryEmail(P())
  ok(e.text.includes(fee) && e.subject.includes(fee), 'a taxa REAL aparece no corpo e no assunto')
  ok(e.text.includes(monthly), 'o que vem depois do trial aparece, derivado da tabela de precos')
  ok(e.text.includes(String(pricing.CARD_TRIAL_GRANT_CREDITS)), 'os creditos do trial vem da constante')
  ok(e.text.includes(String(pricing.CARD_TRIAL_DAYS)), 'os dias do trial vem da constante')
}

console.log('\n── 5. O ALCANCE: o que os creditos do trial COMPRAM, lido do cobrador')
{
  const filmes = reachLine.trialFilmsWithinReach(pricing.CARD_TRIAL_GRANT_CREDITS)
  const e = buildSecondTryEmail(P())
  ok(filmes >= 1, `o trial de $1 cobre ${filmes} filme(s) — se cair para 0 a frase muda sozinha`)
  ok(e.text.includes(`covers ${filmes}`), 'a carta diz o numero de filmes que a tabela do cobrador permite')
  ok(!/Kling 3/.test(e.text + e.html), 'a carta NAO nomeia o motor que o saldo do trial nao alcanca (150cr > 80cr)')
}

console.log('\n── 6. A PORTA E A QUE O COBRADOR ACEITA')
{
  const e = buildSecondTryEmail(P())
  ok(e.text.includes('tier=basic'), 'o link usa o TRIAL_TIER que o cobrador aceita')
  ok(e.text.includes('trial=1'), 'o link pede o trial pago')
  ok(e.text.includes('billing=monthly'), 'mensal — o cobrador recusa trial em anual (wantsTrial && !isAnnual)')
  ok(e.text.includes('intent_campaign=second_try_1usd'), 'a chegada e medivel pelo campo que o CHECKOUT grava')
  ok(e.text.includes('utm_campaign=second_try_1usd'), 'e pelo utm, que e o campo que a PAGINA grava (achado va-r6)')
  ok(e.html.includes('trial=1'), 'o botao do html leva para a mesma porta')
  const checkout = read('app/api/stripe/checkout/route.ts')
  ok(/const TRIAL_TIER = 'basic'/.test(checkout), 'o cobrador ainda so aceita trial no tier basic')
  ok(/searchParams\.get\('trial'\) === '1'/.test(checkout), "o cobrador ainda le ?trial=1")
  ok(/has_paid\?: boolean \| null \} \| null\)\?\.has_paid === true/.test(checkout), 'a unica recusa do trial continua sendo has_paid=true')
  ok(/CARD_TRIAL_ENABLED = true/.test(checkout), 'a porta de $1 continua LIGADA em producao')
}

console.log('\n── 7. QUEM A ROTA NUNCA PODE ALCANCAR')
{
  for (const c of ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']) {
    ok(src.includes(`'${c}'`), `contato proibido fora da lista: ${c}`)
  }
  ok(/isInternalEmail\(email\) \|\| proibido\(email\)/.test(src), 'interno E proibido saem no MESMO filtro')
  ok(/p\.email_opted_out \|\| p\.has_paid/.test(src), 'quem descadastrou e quem ja pagou nao entram')
  ok(/loadLifecycleSuppression\(admin/.test(src), 'a supressao de 24h da casa inteira e consultada')
  ok(/!supressao\.isSuppressed\(c\.id\)/.test(src), 'e o resultado dela FILTRA a lista, nao so aparece no payload')
  ok(/!jaAvisado\.has\(z\.id\)/.test(src), '1x por pessoa para sempre')
  ok(/unsubscribeHeaders\(a\.id\)/.test(src), 'headers de descadastro em todo envio')
  const e = buildSecondTryEmail(P())
  ok(e.html.includes(FOOT_HTML) && e.text.includes(FOOT_TEXT.trim()), 'rodape de descadastro no corpo (html e texto)')
}

console.log('\n── 8. O DEFAULT E NAO ENVIAR')
{
  ok(/searchParams\.get\('confirm'\) === 'SEND'/.test(src), 'so `confirm=SEND` envia')
  ok(/if \(!confirm\) \{[\s\S]{0,400}mode: 'DRY_RUN'/.test(src), 'sem confirm, a rota devolve DRY_RUN e para')
  ok(/const MAX_BATCH = 30/.test(src), 'teto de 30 por rotacao, como manda a ordem')
  ok(/Math\.min\(limitParam, MAX_BATCH\)/.test(src), 'o `limit` da URL nunca passa do teto')
  ok(/ADMIN_EMAILS\.has\(adminEmail\)/.test(src), 'rota fechada a admin logado')
  ok(/status: 403/.test(src), 'quem nao e admin leva 403')
  ok(/setTimeout\(\(r\) => setTimeout/.test(src) === false && /setTimeout\(r, 600\)/.test(src), 'pacing de 600ms entre envios')
}

console.log('\n── 9. A COORTE NAO E TRUNCADA EM SILENCIO')
{
  ok(/from \+= 1000/.test(src), 'perfis lidos em paginas de 1000')
  ok(/\.range\(from, from \+ 999\)/.test(src), 'paginacao por range, nao por limit')
  ok(/\.in\('name', CHECKOUT_INTENT\)[\s\S]{0,200}\.range\(from, from \+ 999\)/.test(src), 'os eventos de checkout tambem sao paginados')
  ok(/if \(pageErr\) throw pageErr/.test(src), 'erro de pagina estoura em vez de virar coorte menor')
  ok(!/\.in\('name', CHECKOUT_INTENT\)[\s\S]{0,120}\.limit\(/.test(src), 'os eventos de checkout NAO usam .limit (corta em 1000 sem erro)')
}

console.log('\n── 10. O CARIMBO EXISTE, E A CASA INTEIRA O ENXERGA')
{
  ok(/const STAMP = 'second_try_1usd_sent'/.test(src), 'o carimbo tem nome proprio')
  ok(/name: STAMP/.test(src), 'o carimbo e gravado depois do envio aceito')
  ok(/if \(!res\.ok\) \{[\s\S]{0,120}continue \}/.test(src), 'resend recusou → nao carimba (nada de carimbo fantasma)')
  const registry = read('lib/lifecycle/emailEvents.ts')
  ok(registry.includes("'second_try_1usd_sent'"), 'o carimbo esta em LIFECYCLE_EMAIL_EVENT_NAMES (mesmo commit)')
  ok(/films: a\.films/.test(src) && /visits: a\.visits/.test(src), 'o evento guarda o que a carta afirmou para aquela pessoa')
  ok(/fee: trialEntryFeeLabel/.test(src), 'o evento guarda a taxa do dia — carimbo do deploy')
}

// ══════════════════════════════════════════════════════════════════════════
// MUTANTES — cada um prova que APLICOU antes de exigir vermelho.
// ══════════════════════════════════════════════════════════════════════════
console.log('\n── 11. MUTANTES')
function mutante(nome, de, para, prova) {
  const mutado = src.split(de).join(para)
  if (mutado === src) { n++; fail++; console.log('FAIL', n, `mutante ${nome} NAO aplicou (ancora nao casou)`); return }
  let red = false
  try { red = prova(load(mutado)) } catch { red = true }
  ok(red, `mutante ${nome} → guardiao fica VERMELHO`)
}

mutante(
  'afirma 2 visitas para quem so teve 1',
  'const visitClause = p.visits >= 2 ? ` — on ${p.visits} separate visits` : \'\'',
  'const visitClause = ` — on 2 separate visits`',
  (m) => /separate visits/.test(m.buildSecondTryEmail(P({ visits: 1 })).text),
)
// O mutante escolhe um valor DIFERENTE do real de proposito: trocar por '$1'
// hoje seria indetectavel por comportamento, e a trava precisa morder o dia em
// que a taxa mudar e a carta continuar dizendo o numero velho.
mutante(
  'taxa digitada a mao (deixa de seguir o cobrador)',
  'const fee = trialEntryFeeLabel({ compact: true })',
  "const fee = '$5'",
  (m) => {
    const e = m.buildSecondTryEmail(P())
    return !e.subject.includes(fee) || !e.text.includes(fee)
  },
)
mutante(
  'plural chumbado',
  "const filmPhrase = p.films === 1 ? 'a film' : `${p.films} films`",
  'const filmPhrase = `${p.films} films`',
  (m) => /\b1 films\b/.test(m.buildSecondTryEmail(P({ films: 1 })).text),
)
mutante(
  'alcance chumbado em vez de lido do cobrador',
  'const reach = trialReachClause(CARD_TRIAL_GRANT_CREDITS)',
  "const reach = 'every engine is unlocked, and that covers 9 Seedance 1.5 films start to finish'",
  (m) => {
    const filmes = reachLine.trialFilmsWithinReach(pricing.CARD_TRIAL_GRANT_CREDITS)
    return !m.buildSecondTryEmail(P()).text.includes(`covers ${filmes}`)
  },
)
mutante(
  'porta apontando para tier que o cobrador recusa no trial',
  'tier=basic&billing=monthly&trial=1',
  'tier=pro&billing=monthly&trial=1',
  (m) => !m.buildSecondTryEmail(P()).text.includes('tier=basic'),
)
mutante(
  'rodape de descadastro removido',
  '</div>${emailFooterHtml(p.id)}',
  '</div>',
  (m) => !m.buildSecondTryEmail(P()).html.includes(FOOT_HTML),
)
mutante(
  'assunto passa a carregar texto cru da pessoa',
  '    : `Your ${p.films} Kineo ${filmWord} — and a ${fee} door that didn\'t exist last week`',
  '    : `Your film: ${p.lastCheckoutAt}`',
  (m) => {
    const s = m.buildSecondTryEmail(P()).subject
    return s.includes('2026-08-10') || !s.includes(fee)
  },
)

console.log(`\n${n - fail} ok / ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
