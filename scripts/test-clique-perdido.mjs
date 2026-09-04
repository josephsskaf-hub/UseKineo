// ═══════════════════════════════════════════════════════════════════════════
// sprint-assinaturas #14 (04/09/2026) — O CLIQUE QUE MORREU COM A ABA
//
// O DEFEITO, MEDIDO EM PRODUÇÃO (14 dias, contas externas):
//   407 cliques em gerar. 25 deles, de 21 PESSOAS, não deixaram UM ÚNICO
//   registro no servidor — nem claim, nem despacho, nem erro, nem recusa.
//   19 dessas 21 pessoas NUNCA receberam um filme da Kineo na vida.
//   Quando tudo vai bem o claim nasce 20s depois do clique (p90 60s), e a
//   MEDIANA de tempo até essas pessoas saírem da tela é de 7 SEGUNDOS.
//   13 das 25 sumiram em menos de 60s. Nada cobrado, nada entregue, e a casa
//   inteira cega: nenhuma rede de segurança resgata o que nunca existiu.
//
// O QUE ESTE TESTE TRANCA:
//   1. o marcador de ABERTURA é gravado ANTES de qualquer trabalho caro;
//   2. o de FECHO está num finally — todo caminho de saída passa por ele;
//   3. telemetria nunca derruba a geração (tudo em try/catch);
//   4. a Fase 5 do cron falha FECHADA e não repete aviso (lição do #4);
//   5. a coorte é quem NUNCA viu um filme, uma vez por pessoa, para sempre;
//   6. roteiro truncado nunca volta preenchido em nome da pessoa;
//   7. o texto da PRÓPRIA pessoa é escapado antes de entrar no HTML.
//
// TRAVA DE QUALIDADE DO FUNDADOR (03/09 23:40): nenhuma mudança de
// comportamento de geração. O teste confere que os dois pontos tocados na rota
// são inserts em `events` e nada mais.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'

let ok = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok += 1 } else { falhas.push(nome) }
}

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const CRON = 'app/api/cron/finish-stranded-renders/route.ts'
const rota = readFileSync(ROTA, 'utf8')
const cron = readFileSync(CRON, 'utf8')

// ── 1. A CAIXA-PRETA EXISTE NA ROTA ────────────────────────────────────────
check('rota: evento de abertura existe', rota.includes("name: 'generation_attempt_opened'"))
check('rota: evento de fecho existe', rota.includes("name: 'generation_attempt_closed'"))
check('rota: abertura gravada UMA vez', rota.split("name: 'generation_attempt_opened'").length === 2)
check('rota: fecho gravado UMA vez', rota.split("name: 'generation_attempt_closed'").length === 2)

const iOpen = rota.indexOf("name: 'generation_attempt_opened'")
const iClose = rota.indexOf("name: 'generation_attempt_closed'")
check('rota: abertura vem antes do fecho no arquivo', iOpen > 0 && iClose > iOpen)

// ── 2. A ABERTURA VEM ANTES DE TODO TRABALHO CARO ──────────────────────────
// Este é o coração da jogada: se o marcador nascesse depois do trabalho, ele
// nunca existiria justamente nos casos que ele precisa enxergar.
const iAdmin = rota.indexOf('const cinematicAdmin: SupabaseClient = createAdminClient(')
check('rota: client admin existe', iAdmin > 0)
check('rota: abertura logo DEPOIS do client admin', iOpen > iAdmin)
check('rota: abertura a menos de 1200 chars do client admin', iOpen - iAdmin < 1200)

const iHandler = rota.indexOf('async function manipularPost')
// O DÉBITO é o momento do dinheiro; a fal é o momento do fornecedor. A
// caixa-preta abre antes dos dois — é o que garante que ela exista mesmo
// quando a função morre no meio, que é exatamente o caso que ela enxerga.
const iDebito = rota.indexOf('debitVideoCredits(', iHandler)
check('rota: existe débito no handler', iDebito > 0)
check('rota: ABERTURA ANTES do débito de crédito', iOpen < iDebito)
const iFal = rota.indexOf('fal.queue.', iHandler)
check('rota: existe chamada à fal no handler', iFal > 0)
check('rota: ABERTURA antes da primeira chamada à fal', iOpen < iFal)

// ── 3. O FECHO ESTÁ NUM finally ────────────────────────────────────────────
const iFinally = rota.indexOf('  } finally {')
check('rota: existe um finally no handler', iFinally > 0)
check('rota: o fecho está DENTRO do finally', iFinally > 0 && iClose > iFinally)
check('rota: o finally é o último bloco do arquivo', rota.trimEnd().endsWith('}'))
check('rota: o fecho é guardado por attemptTrace', rota.includes('if (attemptTrace) {'))
check('rota: attemptTrace só é setado APÓS o insert de abertura',
  rota.indexOf('attemptTrace = { db: cinematicAdmin') > iOpen)
check('rota: attemptTrace nasce nulo', rota.includes('generationId: string } | null = null'))

// ── 4. TELEMETRIA NUNCA DERRUBA A GERAÇÃO ──────────────────────────────────
const CATCH_MUDO = 'catch { /* telemetria nunca derruba a resposta */ }'
const trechoAbertura = rota.slice(iOpen - 400, iOpen + 900)
check('rota: abertura dentro de try', trechoAbertura.includes('try {'))
check('rota: abertura com catch silencioso', trechoAbertura.includes(CATCH_MUDO))
const trechoFecho = rota.slice(iClose - 700, iClose + 900)
check('rota: fecho dentro de try', trechoFecho.includes('try {'))
check('rota: fecho com catch silencioso', trechoFecho.includes(CATCH_MUDO))

// ── 5. CHAVE DE CRUZAMENTO: session_id = generationId ──────────────────────
check('rota: abertura chaveia por session_id', trechoAbertura.includes('session_id: generationId'))
check('rota: fecho chaveia por session_id', trechoFecho.includes('session_id: attemptTrace.generationId'))

// ── 6. O TEMA: 90 CHARS, E O PREFIL SÓ QUANDO O TEXTO É INTEIRO ────────────
check('rota: guarda dica de tema', rota.includes('topic_hint: prompt.slice(0, 90)'))
check('rota: marca se a dica É o texto inteiro', rota.includes('topic_complete: prompt.length <= 90'))
const nCorte = (rota.match(/topic_hint: prompt\.slice\(0, (\d+)\)/) || [])[1]
const nTeste = (rota.match(/topic_complete: prompt\.length <= (\d+)/) || [])[1]
check('rota: o corte e o teste do corte usam o MESMO número', !!nCorte && nCorte === nTeste)

// ── 7. O CRON: JANELA E TETOS ──────────────────────────────────────────────
check('cron: fase nova existe', cron.includes('FASE 5'))
check('cron: constante de abertura', cron.includes("const ATTEMPT_OPENED_EVENT = 'generation_attempt_opened'"))
check('cron: constante de fecho', cron.includes("const ATTEMPT_CLOSED_EVENT = 'generation_attempt_closed'"))
check('cron: carimbo próprio do aviso', cron.includes("const ATTEMPT_LOST_EVENT = 'attempt_lost_rescue_sent'"))
check('cron: piso de 20 min', cron.includes('const ATTEMPT_LOST_MIN_AGE_MS = 20 * 60 * 1000'))
check('cron: teto de 24h', cron.includes('const ATTEMPT_LOST_MAX_AGE_MS = 24 * 60 * 60 * 1000'))
check('cron: teto por rodada', /const MAX_ATTEMPT_LOST_PER_RUN = \d+/.test(cron))
// o piso tem de ser MUITO maior que o p90 medido até o claim (60s).
check('cron: o piso é pelo menos 10x o p90 até o claim (60s)', 20 * 60 * 1000 >= 10 * 60 * 1000)
check('cron: a fase lê exatamente o evento de abertura', cron.includes(".eq('name', ATTEMPT_OPENED_EVENT)"))

// ── 8. O CRON FALHA FECHADO (lição do #4: erro engolido = e-mail repetido) ──
check('cron: erro na leitura de abertos INTERROMPE', cron.includes('if (openedErr) throw new Error('))
check('cron: erro na leitura de fechados INTERROMPE', cron.includes('if (settledErr) throw new Error('))
check('cron: o lote de dedupe inclui os já fechados E os já avisados',
  cron.includes('[ATTEMPT_CLOSED_EVENT, ATTEMPT_LOST_EVENT]'))
check('cron: pula quem já está fechado ou avisado', cron.includes('if (settled.has(genId)) continue'))

// ── 9. A COORTE E OS LIMITES DE ENVIO ──────────────────────────────────────
check('cron: um aviso por pessoa PARA SEMPRE', cron.includes('if (priorErr || (priorCount ?? 0) > 0) continue'))
check('cron: a checagem por pessoa usa o carimbo do próprio aviso',
  /\.eq\('name', ATTEMPT_LOST_EVENT\)[\s\S]{0,60}\.eq\('user_id', userId\)/.test(cron))
check('cron: só quem NUNCA recebeu um filme', cron.includes('if (filmesErr || (filmes ?? 0) > 0) continue'))
check('cron: a contagem de filmes exige status completed', /\.eq\('status', 'completed'\)/.test(cron))
check('cron: dry-run nunca gera e-mail', cron.includes('if (md.dry_run === true) continue'))
check('cron: respeita opt-out e conta interna',
  cron.includes('prof?.email_opted_out || isInternalOrJunkEmail(email)) continue'))

// ── 10. O BOTÃO NÃO REENVIA ROTEIRO TRUNCADO EM NOME DA PESSOA ─────────────
check('cron: prefil condicionado ao texto INTEIRO', cron.includes('const startUrl = hintComplete && topic'))
check('cron: sem prefil, o botão vai ao Studio', cron.includes('/studio?utm_source=attempt_lost'))
check('cron: com prefil, o botão leva o tema codificado', cron.includes('encodeURIComponent(topic)'))
check('cron: o carimbo registra se houve prefil', cron.includes('prefilled: hintComplete && !!topic'))

// ── 11. O TEXTO DA PESSOA É ESCAPADO NO HTML ───────────────────────────────
check('cron: existe escapador', cron.includes('function escapeHtmlAttr('))
check('cron: o tema entra escapado no HTML', cron.includes('escapeHtmlAttr(topic)'))
const iEsc = cron.indexOf('function escapeHtmlAttr(')
const corpoEsc = cron.slice(iEsc, iEsc + 300)
check('cron: o escapador cobre &', corpoEsc.includes('&amp;'))
check('cron: o escapador cobre <', corpoEsc.includes('&lt;'))
check('cron: o escapador cobre >', corpoEsc.includes('&gt;'))
check('cron: o escapador cobre aspas', corpoEsc.includes('&quot;'))
check('cron: o & é escapado PRIMEIRO (senão escapa duas vezes)',
  corpoEsc.indexOf('&amp;') < corpoEsc.indexOf('&lt;'))

// ── 12. A COPY DIZ A VERDADE ───────────────────────────────────────────────
check('cron: o e-mail afirma que nada foi cobrado', cron.includes('nothing was charged'))
check('cron: o e-mail promete aviso quando o filme sair', cron.includes('we email you the moment the film is done'))
check('cron: assunto próprio, não reaproveitado', cron.includes('Your film never started'))
const iCopy = cron.indexOf('function attemptLostText(')
const corpoCopy = cron.slice(iCopy, iCopy + 2600)
check('cron: nenhum cupom ou desconto na copy nova', !/(discount|% off|coupon|50% )/i.test(corpoCopy))
check('cron: nenhuma promessa de crédito na copy nova', !/\bcredits? (for|free|on us)\b/i.test(corpoCopy))

// ── 13. A RODADA É MEDÍVEL ─────────────────────────────────────────────────
check('cron: a resposta conta a fase nova', cron.includes('attemptsLost, results }'))
check('cron: contador só sobe com envio de verdade', cron.includes('if (ok) attemptsLost += 1'))
check('cron: o carimbo grava se o envio deu certo', cron.includes('sent: ok,'))
check('cron: o carimbo guarda quando o clique aconteceu', cron.includes('opened_at: row.created_at'))

// ── 14. A TRAVA DE QUALIDADE DO FUNDADOR ───────────────────────────────────
// Os dois pontos novos na rota são inserts em `events`. Nada mais.
const blocoAbertura = rota.slice(iOpen - 600, iOpen + 1200)
check('trava: a abertura só escreve em events', blocoAbertura.includes("from('events').insert("))
check('trava: a abertura não chama a fal', !blocoAbertura.includes('fal.queue'))
check('trava: a abertura não chama openai', !blocoAbertura.includes('openai.'))
check('trava: a abertura não mexe em crédito', !/creditCost|video_credits|debit/i.test(blocoAbertura))
const blocoFecho = rota.slice(iFinally, rota.length)
check('trava: o fecho só escreve em events', blocoFecho.includes("from('events').insert("))
check('trava: o fecho não mexe em crédito', !/creditCost|video_credits|debit/i.test(blocoFecho))
check('trava: o fecho não devolve Response', !blocoFecho.includes('NextResponse'))
check('trava: a régua de palavras/segundo não foi tocada aqui',
  !blocoAbertura.includes('WORDS_PER_SECOND') && !blocoFecho.includes('WORDS_PER_SECOND'))

console.log(`\n${ok} verificações OK, ${falhas.length} falhas`)
if (falhas.length > 0) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log('  x ' + f)
  process.exit(1)
}
console.log('OK — o clique que morre com a aba deixa rastro, e a casa avisa a pessoa uma vez.')
