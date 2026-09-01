// TESTE DO CONSERTO "RENDER MORTO" (sprint v1->v4 #16)
//
// Sem rede, sem banco, sem credito: le os dois arquivos e prova as invariantes.
// Roda: node scripts/test-render-morto.mjs
import fs from 'node:fs'
import path from 'node:path'

const raiz = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd()
const rota = fs.readFileSync(path.join(raiz, 'app/api/compose/active/route.ts'), 'utf8')
const pill = fs.readFileSync(path.join(raiz, 'components/ActiveRenderPill.tsx'), 'utf8')
// RODADA #17 — duas provas la embaixo liam o arquivo INTEIRO, comentario incluso.
// O cabecalho da pilula cita "/api/compose/status" justamente para jurar que NAO
// fala com ele, e o comentario da #15 cita "upgrade" para jurar que NAO encosta
// nele. Os dois testes reprovariam o arquivo por ele dizer a verdade sobre si
// mesmo. Daqui pra frente essas duas provas leem SO codigo.
const pillCode = pill
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n')

let passou = 0
const falhas = []
function checa(nome, cond) {
  if (cond) { passou++; console.log('  ok  ' + nome) }
  else { falhas.push(nome); console.log('  XX  ' + nome) }
}
const conta = (t, s) => t.split(s).length - 1

console.log('\n  TESTE — render morto para de girar para sempre\n')

// ── servidor ──────────────────────────────────────────────────────────────
checa('rota tem a marca KINEO-RENDER-MORTO-2026-09-01', rota.includes('KINEO-RENDER-MORTO-2026-09-01'))
checa('rota le generation_stage_error', rota.includes("eq('name', 'generation_stage_error')"))
checa('rota responde state failed', conta(rota, "state: 'failed',") === 1)
checa('a leitura de falha e SOMENTE leitura (nenhum insert/update/delete novo)',
  !rota.includes('.insert(') && !rota.includes('.update(') && !rota.includes('.delete('))
checa('a morte e comparada por TEMPO (nao mata a tentativa 2)', rota.includes('failureAt > claimAtMs'))
checa('a janela da falha e a MESMA janela de 15 min (usa "since")',
  rota.includes(".gte('created_at', since)") && conta(rota, 'ACTIVE_WINDOW_MS') >= 2)
checa('a falha e filtrada pelo usuario autenticado', conta(rota, "eq('user_id', user.id)") >= 3)
checa('erro na leitura da falha NAO derruba a sonda (so warn)',
  rota.includes("console.warn('[compose/active] failure lookup failed:'"))
checa('o caminho compose checa morte antes de dizer rendering',
  rota.includes('if (diedAfter(activeClaimAt)) return deadRenderResponse(activeClaim.created_at)'))
checa('o caminho cinematic checa morte antes de dizer rendering',
  rota.includes('if (diedAfter(cinematicAt)) return deadRenderResponse(activeCinematic.created_at)'))
checa('os dois returns de rendering continuam existindo', conta(rota, "state: 'rendering',") === 2)
checa('a mensagem tem teto de tamanho (nao vaza texto gigante)', rota.includes('text.length <= 400'))
checa('ha frase de reserva quando o servidor nao deu motivo',
  rota.includes("'This render stopped before it finished.'"))
checa('o estado none continua sendo a saida segura', rota.includes("state: 'none' }"))

// ── cliente ───────────────────────────────────────────────────────────────
checa('pilula tem a marca KINEO-RENDER-MORTO-2026-09-01', pill.includes('KINEO-RENDER-MORTO-2026-09-01'))
checa('pilula tem o tipo failed', pill.includes("| { state: 'failed'; message: string; startedAtMs: number }"))
checa('pilula le state failed da resposta', pill.includes("data.state === 'failed'"))
checa('pilula mostra a frase honesta de render morto', pill.includes("Render didn't finish"))
checa('botao vira "Try again"', pill.includes("isFailed ? 'Try again' : 'Watch'"))
checa('render morto volta para o compositor', pill.includes("probe.state === 'completed' ? '/history' : '/studio/create'"))
checa('o clique e medido como retry', pill.includes("probe.state === 'failed' ? 'retry' : 'watch'"))
checa('o motivo real aparece no title', pill.includes("title={probe.state === 'failed' && probe.message"))
checa('cor ambar so no estado failed', pill.includes("isFailed ? '#f59e0b'"))
checa('estado failed e dispensavel com o X', pill.includes("probe.state !== 'rendering' && dismissedId != null"))
checa('poll de 15s so roda com render de verdade', pill.includes("const hasActiveRender = probe?.state === 'rendering'"))
checa('a pilula continua sem poller proprio de status', !pillCode.includes('/api/compose/status'))
checa('a pilula continua suprimida no compositor', pill.includes("startsWith('/studio/create')"))
// RODADA #17 — tres provas que nasceram da reprovacao das 12:02. A causa nao foi
// o conserto: foram ancoras escritas contra a copia OBSOLETA da arvore principal.
checa('o tipo completed manteve seriesSeed (entrega #3 desta sprint, em producao)',
  pill.includes('seriesSeed: string | null }'))
checa('o icone condicional ficou SO na pilula horizontal',
  conta(pill, "{isFailed ? '⚠️' : '🎉'}") === 1)
checa('o cartao vertical da #15 continua intacto (Make it now + Next episode)',
  pill.includes('Make it now →') && pill.includes('Next episode →'))
checa('render MORTO nunca cai no cartao verde "Your video is ready"',
  pill.includes("if (probe.state === 'completed' && (nextSeed || (filaVisivel && fila)))"))
checa('o evento de exibicao continua saindo', conta(pill, "trackEvent('active_render_pill_shown'") === 1)
checa('os dois eventos de clique continuam saindo', conta(pill, "trackEvent('active_render_pill_clicked'") === 2)

// ── nao pisar na pista do Codex ───────────────────────────────────────────
for (const proibido of ['stripe', 'checkout', 'price', 'credits', 'trial', 'upgrade']) {
  checa('a pilula nao encosta em "' + proibido + '" (pista do Codex)',
    !pillCode.toLowerCase().includes(proibido))
}

console.log('')
if (falhas.length) {
  console.log('  RESULTADO: ' + falhas.length + ' verificacao(oes) FALHARAM.')
  for (const f of falhas) console.log('    - ' + f)
  process.exit(1)
}
console.log('  RESULTADO: ' + passou + '/' + passou + ' verificacoes passaram.')
console.log('')
