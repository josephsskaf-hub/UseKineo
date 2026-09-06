#!/usr/bin/env node
// GUARDIÃO — KINEO-SUPPRESSION-EVENTS-2026-09-06 (sprint-assinaturas #26)
//
// O QUE ELE GUARDA: a supressão de 24h passou a ler uma QUINTA fonte — os
// carimbos de e-mail que vivem na tabela `events`. Antes deste commit,
// 7 campanhas de admin e 5 crons carimbavam só ali e eram invisíveis para a
// trava: 70 pares de e-mail em 30 min para 42 pessoas em 7 dias.
//
// ESTILO readFileSync DE PROPÓSITO: guardião que importa com alias `@/` morre
// no import antes da primeira verificação (memória `guardioes-com-alias-nao-rodam`).
//
// E ELE NÃO CONTA TEXTO: as travas que importam estão amarradas à VARIÁVEL que
// decide (`eventsDegraded`) e ao ramo que não pode existir (`closed(` dentro do
// bloco da quinta fonte). Mutante que troque o fail-open por fail-closed, que
// tire a paginação, que tire o filtro de nomes ou que devolva a fonte sem o
// sinal, tem de deixar isto VERMELHO.

import { readFileSync } from 'node:fs'

const SUP = 'lib/lifecycle/suppression.ts'
const EVT = 'lib/lifecycle/emailEvents.ts'

const sup = readFileSync(SUP, 'utf8').replace(/\r\n/g, '\n')
const evt = readFileSync(EVT, 'utf8').replace(/\r\n/g, '\n')

let ok = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok++; console.log('  ok  ' + nome) }
  else { falhas.push(nome); console.log('  XX  ' + nome) }
}

// ── 1. A LISTA CANÔNICA EXISTE E É UMA SÓ ────────────────────────────────────
console.log('\n1. lib/lifecycle/emailEvents.ts — a lista canônica')
check('exporta LIFECYCLE_EMAIL_EVENT_NAMES', /export const LIFECYCLE_EMAIL_EVENT_NAMES\s*=\s*\[/.test(evt))
check('a lista é `as const` (não vira string[] mutável)', /\]\s*as const/.test(evt))

const nomes = Array.from(evt.matchAll(/^ {2}'([a-z0-9_]+)',$/gm)).map((m) => m[1])
check('a lista tem pelo menos 25 nomes (tem ' + nomes.length + ')', nomes.length >= 25)
check('não há nome repetido na lista', new Set(nomes).size === nomes.length)

// Os três carimbos que a medição de 06/09 apontou como dominantes nos pares de
// 30 minutos. Se algum sair da lista, o defeito volta pela mesma porta.
for (const n of ['stranded_ready_sent', 'video_ready_email_sent', 'trial_lifecycle_email_sent']) {
  check("o carimbo dominante '" + n + "' está na lista", nomes.includes(n))
}
// As duas cartas de série deste ciclo, que são as que disparam hoje.
for (const n of ['season_letter_emailed_v1', 'next_episode_wall_emailed_v1']) {
  check("a campanha viva '" + n + "' está na lista", nomes.includes(n))
}

// ⚠️ A TRAVA QUE IMPEDE O PIOR ERRO POSSÍVEL NESTE ARQUIVO: pôr aqui um evento
// de LEITURA (clique, exibição) calaria a casa por 24h porque alguém ABRIU um
// e-mail. Nenhum nome de leitura conhecida pode entrar.
const PROIBIDOS = ['episode_link_clicked', 'season_shown', 'season_written',
  'season_episode_clicked', 'email_opened', 'pricing_viewed', 'checkout_started',
  'next_action_card_shown', 'publish_pack_copied']
for (const n of PROIBIDOS) {
  check("evento de LEITURA '" + n + "' NÃO está na lista", !nomes.includes(n))
}
check('nenhum nome da lista termina em _clicked/_viewed/_shown/_seen',
  !nomes.some((n) => /_(clicked|viewed|shown|seen|opened)$/.test(n)))

// ── 2. A SUPRESSÃO USA A LISTA — E NÃO UMA CÓPIA À MÃO ───────────────────────
console.log('\n2. suppression.ts — a quinta fonte está ligada')
check('importa LIFECYCLE_EMAIL_EVENT_NAMES de ./emailEvents',
  /import \{ LIFECYCLE_EMAIL_EVENT_NAMES \} from '\.\/emailEvents'/.test(sup))
check('consulta a tabela events', /\.from\('events'\)/.test(sup))
check('o filtro de nomes usa a constante, não um array literal',
  /\.in\('name', LIFECYCLE_EMAIL_EVENT_NAMES/.test(sup))
check('não existe lista de nomes de e-mail copiada dentro do suppression.ts',
  !/'(?:season_letter|next_episode_wall|checkout_recovery)_emailed_v1'\s*,/.test(sup))

// A janela é a MESMA do resto do módulo: a fonte nova não pode inventar corte
// próprio, senão a janela de 4h do hot lead vale para quatro fontes e 24h para
// a quinta.
check('a fonte nova usa o mesmo `cutoff` das outras quatro',
  /const desde = new Date\(cutoff\)\.toISOString\(\)/.test(sup) && /\.gte\('created_at', desde\)/.test(sup))

// ── 3. FALHA ABERTA — a propriedade que separa esta fonte das outras quatro ──
console.log('\n3. a quinta fonte falha ABERTA, e isso está amarrado ao código')
// A FATIA COMEÇA NO CÓDIGO, NÃO NO COMENTÁRIO — e isto é um erro que eu
// cometi na primeira versão deste guardião. Ancorar em
// `KINEO-SUPPRESSION-EVENTS-2026-09-06` casava com a MENÇÃO ao bloco lá em
// cima, na interface, e a fatia engolia o laço inteiro das quatro fontes
// antigas — com os quatro `return closed(` dentro. O guardião ficava vermelho
// pelo motivo errado (memória `falsificar-mutacao-commitar-antes`: regex solto
// casa com o próprio comentário).
const iniBloco = sup.indexOf('let eventsDegraded = false')
const fimBloco = sup.indexOf('const suppressed = new Set<string>()')
check('o bloco da quinta fonte existe e vem antes do cálculo final',
  iniBloco > 0 && fimBloco > iniBloco)
check('o bloco vem DEPOIS das quatro fontes antigas',
  iniBloco > sup.indexOf("return closed(`email_send_log: "))
check('o cabeçalho KINEO-SUPPRESSION-EVENTS-2026-09-06 documenta a fonte nova',
  sup.includes('KINEO-SUPPRESSION-EVENTS-2026-09-06'))
const bloco = sup.slice(iniBloco, fimBloco)

// ESTA é a trava central: se alguém trocar o tratamento de erro por `closed(`,
// uma falha de query passa a silenciar a base inteira.
check('o bloco da quinta fonte NUNCA chama closed() — falha aberta',
  !/return closed\(/.test(bloco))
check('o bloco marca eventsDegraded no erro de query', /eventsDegraded = true/.test(bloco))
check('o bloco tem try/catch próprio (erro dele não cai no catch das outras)',
  /try \{/.test(bloco) && /\} catch \(err\) \{/.test(bloco))
check('a variável de falha é declarada FORA do try (sobrevive ao catch)',
  /let eventsDegraded = false\n\s*try \{/.test(bloco))

// O sinal chega a quem chama: sem isto, "a quinta fonte caiu" é indistinguível
// de "estava tudo bem".
check('a interface expõe eventsDegraded', /readonly eventsDegraded\?: boolean/.test(sup))
check('o retorno de sucesso carrega eventsDegraded',
  /degraded: false, eventsDegraded \}/.test(sup))
check('eventsDegraded é OPCIONAL (não quebra implementador existente)',
  /eventsDegraded\?: boolean/.test(sup))

// ── 4. PAGINAÇÃO — truncar em 1.000 é deixar de suprimir EM SILÊNCIO ─────────
console.log('\n4. a leitura é paginada e o teto é barulhento')
check('usa .range() para paginar', /\.range\(pagina \* PAGINA, pagina \* PAGINA \+ PAGINA - 1\)/.test(bloco))
check('ordena por created_at (paginação sem ORDER BY pula linha)',
  /\.order\('created_at', \{ ascending: true \}\)/.test(bloco))
check('para quando a página vem incompleta', /if \(linhas\.length < PAGINA\) break/.test(bloco))
check('tem teto de páginas', /MAX_PAGINAS/.test(bloco))
check('teto batido marca eventsDegraded (não passa por completo)',
  /pagina >= MAX_PAGINAS\) \{[\s\S]{0,400}?eventsDegraded = true/.test(bloco))

// ── 5. O QUE A FONTE NOVA NÃO PODE FAZER ─────────────────────────────────────
console.log('\n5. limites')
check('só LÊ events (nenhum insert/update/delete na tabela)',
  !/\.from\('events'\)[\s\S]{0,200}\.(insert|update|delete|upsert)\(/.test(sup))
check('respeita o crivo isRealSendStamp via bump()', /bump\(row\.user_id, parseTime\(row\.created_at\)\)/.test(bloco))
check('filtra pelos ids consultados (não suprime quem não foi perguntado)',
  /idSet\.has\(row\.user_id\)/.test(bloco))
check('as quatro fontes antigas continuam falhando FECHADAS',
  /return closed\(`profiles: /.test(sup) && /return closed\(`checkout_abandoned: /.test(sup) &&
  /return closed\(`trial_emails_log: /.test(sup) && /return closed\(`email_send_log: /.test(sup))

console.log('\n' + (falhas.length === 0 ? 'VERDE' : 'VERMELHO') + ' — ' + ok + ' verificações ok, ' + falhas.length + ' falha(s)')
if (falhas.length) { for (const f of falhas) console.log('   · ' + f); process.exit(1) }
