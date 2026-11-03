// KINEO-FOLHA-PAGANTE-0311 [TRAVA 8.2 — fundador 03/11 "universalizar"; Canal do Revisor: Rick, 3ª troca de personagem] — guardião.
// Caso: gapozweb (anual) 03/11 14:53 BRT, Seedance pago 60→90 s, "Roland Pernicus Oznard, a gruff old man with shoulder-length
// gray-brown hair" → ~7 Rolands diferentes (nota 4,5). Nenhum cinematic_character_sheet (a folha era só interna / grátis 15 s) e o
// crítico do still reprovou 6 cenas em modo log_only (regeracoes 0). Prova:
//   (A) a decisão REAL (decidirPersonagem, executada) liga a folha para o pagante nas regras de sempre e respeita [faceless]/Estrela/motor;
//   (B) a rota liga a folha do pagante DEPOIS de isPaidUser e ANTES do casting/folha (os dois leitores de qualidadeFilme.gerarFolha);
//   (C) o crítico do still fica em 'enforce' para pagante com personagem (grátis 15 s continua enforce; o resto continua log_only);
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const F = createOfflineLoader({ globals: { AbortController, setTimeout: () => 0, clearTimeout() {} } })('lib/cinematic/folhaDePersonagem.ts')
const base = { interna: true, pedido: ['personagem'], engine: 'seedance', anchorEnabled: true, estrelaAtiva: false, tagFaceless: false }
checa('A pagante no Seedance ganha a folha', F.decidirPersonagem(base).ativo === true)
checa('A Kling 2.5 e Veo também', F.decidirPersonagem({ ...base, engine: 'kling' }).ativo && F.decidirPersonagem({ ...base, engine: 'veo' }).ativo)
checa('A [faceless], Estrela, âncora desligada e motor fora continuam sem folha', !F.decidirPersonagem({ ...base, tagFaceless: true }).ativo && !F.decidirPersonagem({ ...base, estrelaAtiva: true }).ativo && !F.decidirPersonagem({ ...base, anchorEnabled: false }).ativo && !F.decidirPersonagem({ ...base, engine: 'hollywood' }).ativo)

function provasRota(r) {
  const erros = []
  const LIGA = "if (isPaidUser && !qualidadeFilme.gerarFolha && decidirPersonagem({ interna: true, pedido: ['personagem'], engine: body.engine, anchorEnabled: CINEMATIC_ANCHOR_ENABLED, estrelaAtiva, tagFaceless: tagFacelessPresente }).ativo) qualidadeFilme.gerarFolha = true"
  const iPago = r.indexOf('const isPaidUser = profile?.has_paid === true || PAID_PLANS.has(planVal)'), iLiga = r.indexOf(LIGA)
  const iCasting = r.indexOf('qualidadeFilme.gerarFolha ? await elencoComCastingAjuste(prompt, elencoDoPedido)'), iFolha = r.indexOf('if (qualidadeFilme.gerarFolha && anchorActive && !estrelaAtiva && elencoDoAjuste.length > 0)')
  if (!(iPago > 0 && iLiga > iPago)) erros.push('B a folha do pagante não é ligada depois de isPaidUser')
  if (!(iCasting > iLiga && iFolha > iLiga)) erros.push('B a folha do pagante não vem antes do casting e da folha')
  if (!r.includes("modoDoCriticoDoStill(undefined, seedanceShortFilm || (isPaidUser && personagemElenco.elenco.length > 0) ? 'enforce' : 'log_only')")) erros.push('C o crítico não refaz para o pagante com personagem')
  return erros
}
const rota = lf(fs.readFileSync(ROTA, 'utf8'))
const e = provasRota(rota)
checa(`B/C a rota liga a folha e o crítico do pagante${e.length ? ': ' + e.join(' · ') : ''}`, e.length === 0)
const MUTANTES = [
  ['sem a folha do pagante', (s) => s.replace(') qualidadeFilme.gerarFolha = true // KINEO-FOLHA-PAGANTE-0311', ') void 0 // KINEO-FOLHA-PAGANTE-0311').replace('if (isPaidUser && !qualidadeFilme.gerarFolha', 'if (false && !qualidadeFilme.gerarFolha')],
  ['crítico volta a log_only no pago', (s) => s.replace("seedanceShortFilm || (isPaidUser && personagemElenco.elenco.length > 0) ? 'enforce'", "seedanceShortFilm ? 'enforce'")],
]
for (const [nome, fn] of MUTANTES) {
  const m = fn(rota)
  checa(`mutante "${nome}" fica vermelho`, m !== rota && provasRota(m).length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
