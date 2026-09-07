#!/usr/bin/env node
// ═══ KINEO-PACOTE-NA-ENTREGA-2026-09-07 — guardiao ═══════════════════════
//
// O DEFEITO QUE ISTO IMPEDE DE VOLTAR (medido no banco em 07/09 ~01:50 BRT):
//
//   video_ready_email_sent  (rota de status)   178 em 7d / 121 pessoas
//   video_ready_nudge_sent  (cron de 2o toque)   4 em TODA a historia
//   publish_pack_written                          0
//   publish_pack_unavailable                      0
//
// O pacote de publicacao estava ligado SO no cron — 44x menos alcance que o
// e-mail de entrega, e suprimido justamente porque o e-mail de entrega ja
// saiu. A sonda morava no mesmo lugar errado e por isso tambem media zero.
//
// Este guardiao le os arquivos REAIS (readFileSync + regex; memoria
// `guardioes-com-alias-nao-rodam`: import com `@/` morre antes da 1a
// verificacao) e prova que:
//   (A) a rota de status chama o escritor, dentro de try/catch, com orcamento
//       de tempo explicito, e o e-mail sai igual quando o pacote nao nasce;
//   (B) a sonda `publish_pack_unavailable` vai junto, no caminho certo;
//   (C) o credito da casa segue a VARIAVEL que ja decide o rodape — amarrado
//       ao predicado real, nao ao texto (memoria `guardiao-contar-texto-nao-
//       prova-condicao`): trocar por `true`/`false` REPROVA;
//   (D) a marcacao vem da fonte unica (lib/publishPackEmail.ts), nos dois
//       remetentes, e o cron nao regrediu.
//
// Rodar: node scripts/test-pacote-no-email-de-entrega.mjs   (sem rede, $0)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
// Normaliza CRLF na leitura (memoria `guardiao-crlf-falso-vermelho`).
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8').split('\r\n').join('\n')

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond) ok++
  else falhas.push(nome)
}

const status = ler('app/api/compose/status/[renderId]/route.ts')
const cron = ler('app/api/cron/send-video-ready/route.ts')
const renderizador = ler('lib/publishPackEmail.ts')

// ══ (A) A ROTA DE STATUS CHAMA O ESCRITOR, E FALHA ABERTA ════════════════
check('1. a rota de status importa garantirPacote do escritor da casa', /import \{ garantirPacote \} from '@\/lib\/publishPackServer'/.test(status))
check('2. a rota de status CHAMA garantirPacote (nao so importa)', /garantirPacote\(\n\s*packAdmin,\n\s*user\.id,/.test(status))
check('3. a chamada esta dentro de try/catch (segunda rede)', /try \{[\s\S]{0,1500}?pack = await Promise\.race\(\[\n\s*garantirPacote\([\s\S]{0,900}?\} catch \(e\) \{\n\s*pack = null/.test(status))
check('4. o pack comeca null: um catch deixa o e-mail intacto', /let pack: Awaited<ReturnType<typeof garantirPacote>> = null/.test(status))
check('5. o catch NAO interrompe a rota (nada de throw/return ali)', !/\} catch \(e\) \{\n\s*pack = null\n[\s\S]{0,300}?(throw |return )/.test(status))

// Orcamento de tempo: a rota e polada pelo cliente. O limite e explicito e
// NAO maior que os 12s que o escritor ja usa no fetch.
const budget = status.match(/const PACK_TIME_BUDGET_MS = (\d[\d_]*)/)
check('6. existe um orcamento de tempo explicito para o pacote', !!budget)
check('7. o orcamento nao passa dos 12s do escritor (nao aumentamos o timeout)', !!budget && Number(budget[1].replace(/_/g, '')) <= 12_000)
check('8. o orcamento e aplicado por Promise.race, e perder a corrida da null', /Promise\.race\(\[\n\s*garantirPacote\([\s\S]{0,600}?budget,\n\s*\]\)/.test(status) && /const budget = new Promise<null>\(\(resolve\) => \{[\s\S]{0,300}?resolve\(null\)/.test(status))
check('9. o timer do orcamento e limpo (nao vaza no serverless)', /finally \{\n\s*if \(budgetTimer\) clearTimeout\(budgetTimer\)/.test(status))
check('10. o escritor recebe o id do filme e o tema real (topicFinal)', /\{ id: shareVideoId, title: null, topic: topicFinal \}/.test(status))

// O bloco entra DEPOIS do download, e o resto do e-mail nao mexeu.
const iDownload = status.indexOf('⬇ Download Your Short')
const iShare = status.indexOf('${shareHtml}')
const iPack = status.indexOf('${packHtml}')
const iReview = status.indexOf('KINEO-REVIEW-NO-EMAIL-2026-08-24')
check('11. o botao de download continua no e-mail', iDownload > 0)
check('12. o bloco de compartilhar continua no e-mail', iShare > 0)
check('13. o pacote entra DEPOIS do download e do compartilhar', iDownload < iPack && iShare < iPack)
check('14. a oferta de review do TAAFT continua, depois do pacote', iReview > iPack && /theresanaiforthat\.com\/ai\/kineo\//.test(status))
check('15. o assunto do e-mail de entrega NAO foi tocado', /subject: '⚡ Your Short is ready to download!'/.test(status))
check('16. o rodape por situacao continua antes do pacote', status.indexOf('${readyFooter.html}') < iPack)

// ══ (B) A SONDA VAI JUNTO ════════════════════════════════════════════════
check('17. sem pacote, grava publish_pack_unavailable', /if \(!pack\) \{[\s\S]{0,400}?name: 'publish_pack_unavailable'/.test(status))
check('18. a sonda diz o caminho certo (/api/compose/status, nao o do cron)', /name: 'publish_pack_unavailable',\n\s*session_id: shareVideoId \? shareVideoId\.slice\(0, 64\) : null,\n\s*path: '\/api\/compose\/status'/.test(status))
check('19. a sonda carrega o motivo vindo do onFalha (mesmo formato do cron)', /onFalha: \(motivo\) => \{ motivoPack = motivo \}/.test(status) && /reason: motivoPack \?\? 'desconhecido'/.test(status))
check('20. a sonda e best-effort (engole o proprio erro)', /name: 'publish_pack_unavailable'[\s\S]{0,600}?\} catch \{ \/\* observar nunca pode impedir o e-mail \*\/ \}/.test(status))
check('21. estourar o orcamento tem nome proprio na sonda', /'orcamento_estourado'/.test(status))
check('22. o carimbo do e-mail registra se o pacote viajou (denominador)', /name: 'video_ready_email_sent'[\s\S]{0,1500}?publish_pack: !!pack,/.test(status))

// ══ (C) O CREDITO SEGUE A VARIAVEL QUE JA DECIDE O RODAPE ════════════════
// Amarrado ao PREDICADO REAL: `readyEmailIsSubscriber` e a variavel que o
// rodape deste e-mail ja usa (`isSubscriber: readyEmailIsSubscriber`).
// Trocar a expressao por `true`, `false` ou por um predicado redigitado
// reprova aqui — e o guardiao tambem exige que a variavel exista e alimente
// o rodape, para que ninguem "resolva" renomeando as duas coisas.
check('23. isFreePlan e a NEGACAO da variavel do rodape, nao um literal', /isFreePlan: !readyEmailIsSubscriber,/.test(status) && !/isFreePlan: (true|false),/.test(status))
check('24. a variavel do rodape existe e e declarada uma vez', (status.match(/let readyEmailIsSubscriber = false/g) ?? []).length === 1)
check('25. o rodape usa a MESMA variavel (um predicado, dois leitores)', /isSubscriber: readyEmailIsSubscriber,/.test(status))
check('26. nenhum predicado de plano redigitado dentro do bloco do pacote', !/KINEO-PACOTE-NA-ENTREGA-2026-09-07[\s\S]{0,4000}?(PAID_PLANS\.has|has_paid === true|isTrialActive\()[\s\S]{0,4000}?const packHtml/.test(status))

// ══ (D) FONTE UNICA DA MARCACAO, NOS DOIS REMETENTES ═════════════════════
check('27. a rota de status renderiza pelo modulo compartilhado', /import \{ packEmailHtml \} from '@\/lib\/publishPackEmail'/.test(status) && /const packHtml = packEmailHtml\(pack, \{ theme: 'dark' \}\)/.test(status))
check('28. a rota de status NAO duplica a marcacao do pacote', !/Ready to post/.test(status) && !/const bloco = \(rotulo/.test(status))
check('29. o cron importa o renderizador compartilhado', /import \{ packEmailHtml, packEmailText \} from '@\/lib\/publishPackEmail'/.test(cron))
check('30. o cron NAO duplica mais a marcacao', !/Ready to post/.test(cron) && !/const bloco = \(rotulo/.test(cron) && /const packHtml = packEmailHtml\(ctx\.pack, \{ theme: 'light' \}\)/.test(cron))
check('31. o cron continua chamando garantirPacote (o 2o toque nao regrediu)', /pack = await garantirPacote\(\n\s*admin,\n\s*u\.id as string,/.test(cron))
check('32. o cron continua com o predicado do rodape dele', /isFreePlan: !isSubscriberProfile\(prof\)/.test(cron))
check('33. a marcacao mora UMA vez, no renderizador', (renderizador.match(/Ready to post/g) ?? []).length === 1)
check('34. o renderizador e puro: nenhum import de valor, nenhum builtin de Node', !/^import (?!type )/m.test(renderizador) && !/from 'node:|from '@\//.test(renderizador))
check('35. o renderizador escapa todo valor do pacote', /\$\{escapePackHtml\(valor\)\}/.test(renderizador) && /replace\(\/</.test(renderizador))
check('36. null => string vazia nos dois formatos', (renderizador.match(/if \(!pk\) return ''/g) ?? []).length === 2)

// O arquivo real, EXECUTADO (import relativo com extensao, que o Node resolve
// com type-stripping; nunca `@/`). Prova comportamento, nao so texto.
try {
  const mod = await import('../lib/publishPackEmail.ts')
  const vazio = mod.packEmailHtml(null, { theme: 'dark' }) === '' && mod.packEmailText(null) === ''
  const html = mod.packEmailHtml({ ytTitle: 'A <b>x</b>', ytDescription: 'd "q"', tiktokCaption: '', pinnedComment: '' }, { theme: 'dark' })
  check('37. executado: null devolve string vazia nos dois formatos', vazio)
  check('38. executado: `<` e `"` do pacote nao viram marcacao', html.includes('A &lt;b&gt;x&lt;/b&gt;') && html.includes('d &quot;q&quot;') && !html.includes('<b>'))
  check('39. executado: campo vazio nao gera bloco (nao inventa legenda)', !html.includes('TikTok caption') && !html.includes('Pinned comment'))
  check('40. executado: tema escuro nao herda a caixa clara do cron', !html.includes('#f6f7f9') && mod.packEmailHtml({ ytTitle: 'a', ytDescription: 'b', tiktokCaption: '', pinnedComment: '' }, { theme: 'light' }).includes('#f6f7f9'))
} catch (e) {
  check(`37-40. lib/publishPackEmail.ts nao executa sozinho (${e instanceof Error ? e.message : String(e)})`, false)
}

// ══ LIMITES ══════════════════════════════════════════════════════════════
check('41. nada disto toca o pipeline de qualidade', !/lib\/(compose\/|hollywood|cinematic|broll)|lyriaMusic/.test(renderizador))
check('42. o bloco novo nao cobra credito nem chama a fal', !/KINEO-PACOTE-NA-ENTREGA-2026-09-07[\s\S]{0,5000}?(debitVideoCredits|fal\.run|fal\.ai|submitToFal)[\s\S]{0,5000}?const packHtml/.test(status))

const total = ok + falhas.length
if (falhas.length) {
  console.error(`\n${ok}/${total} verificacoes passaram\n\nFALHOU:`)
  for (const f of falhas) console.error(`  ✗ ${f}`)
  process.exit(1)
}
console.log(`✓ ${ok}/${total} — o pacote de publicacao viaja no e-mail que 121 pessoas recebem, e o e-mail de hoje sai igual quando ele nao nasce`)
