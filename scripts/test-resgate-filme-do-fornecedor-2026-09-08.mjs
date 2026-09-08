// Guardião do resgate de filme que mora no disco do fornecedor.
// KINEO-RESGATE-FILME-DO-FORNECEDOR-2026-09-08 (madrugada-produto #7, M3)
//
// O QUE ESTE ARQUIVO PROTEGE, EM UMA FRASE: que a casa nunca mais entregue um
// filme que vive no disco de outra empresa sem (a) deixar rastro de que isso
// aconteceu, (b) ter um caminho automático que traga o arquivo para cá antes
// da retenção do fornecedor matá-lo, e (c) recusar-se a repontar o
// `video_url` sem antes provar que o arquivo novo existe e tem o tamanho
// certo.
//
// ESTILO: readFileSync + CONTAGEM. Nada de `assert` que morre na primeira
// falha — um guardião que para no primeiro vermelho esconde os outros
// (lição de 07/09, PEDIDOS). Toda âncora é pela CONDIÇÃO, nunca pela forma
// exata do texto.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const ROTA = 'app/api/cron/rescue-vendor-assets/route.ts'
const LIB = 'lib/renderAssets.ts'
const VERCEL = 'vercel.json'

let ok = 0
const falhas = []
function check(nome, condicao) {
  if (condicao) ok += 1
  else falhas.push(nome)
}

const rota = ler(ROTA)
const lib = ler(LIB)
const vercel = ler(VERCEL)

// ── A. A ROTA EXISTE E É FECHADA ────────────────────────────────────────────
check('A1 rota lê CRON_SECRET', rota.includes('process.env.CRON_SECRET'))
check('A2 rota é fail-closed (sem segredo, nega)', /if\s*\(!cronSecret\)\s*return false/.test(rota))
check('A3 401 para quem não é o cron', rota.includes('401') && rota.includes('unauthorized'))
check('A4 usa a service key, não a anon', rota.includes('SUPABASE_SERVICE_ROLE_KEY'))
check('A5 tem orçamento de execução declarado', /export const maxDuration\s*=\s*\d+/.test(rota))

// ── B. A TRAVA QUE IMPEDE TROCAR UM FILME COM PRAZO POR UM FILME QUEBRADO ────
// Estrutural, não textual: a comparação de tamanho tem de acontecer ANTES do
// update, e o caminho da divergência tem de sair fora (continue) sem escrever.
const iVerifica = rota.indexOf('verifiedBytes !== downloadedBytes')
const iUpdate = rota.indexOf(".update({ video_url")
check('B1 existe comparação de tamanho baixado x tamanho no nosso bucket', iVerifica > -1)
check('B2 existe um update de video_url', iUpdate > -1)
check('B3 a comparação vem ANTES do update', iVerifica > -1 && iUpdate > -1 && iVerifica < iUpdate)
const blocoEntre = iVerifica > -1 && iUpdate > iVerifica ? rota.slice(iVerifica, iUpdate) : ''
check('B4 tamanho divergente abandona a linha sem escrever', blocoEntre.includes('continue'))
check('B5 o tamanho verificado vem do content-length do NOSSO objeto', /content-length/i.test(rota))

// ── C. NADA É APAGADO, EM LUGAR NENHUM ──────────────────────────────────────
check('C1 a rota não remove objeto de storage', !/\.remove\s*\(/.test(rota))
check('C2 a rota não apaga linha do banco', !/\.delete\s*\(\s*\)/.test(rota))
check('C3 a URL antiga é preservada no evento (passo desfazível)', rota.includes('vendor_url'))

// ── D. A FILA É POR PRAZO DE MORTE, E TEM DENOMINADOR ───────────────────────
check('D1 a fila vem do mais antigo para o mais novo', /ascending:\s*true/.test(rota))
check('D2 a resposta traz o denominador, não só o que foi feito', rota.includes('vendor_hosted_total'))
check('D3 há teto por rodada', /MAX_PER_RUN\s*=\s*\d+/.test(rota))
check('D4 há teto de relógio', /WALL_BUDGET_MS\s*=/.test(rota))
// O orçamento de download só faz sentido se for MAIOR que o do caminho com
// pessoa esperando — é a razão de a rota existir.
const mDown = rota.match(/DOWNLOAD_TIMEOUT_MS\s*=\s*([\d_]+)/)
const orcamentoResgate = mDown ? Number(mDown[1].replace(/_/g, '')) : 0
check('D5 o orçamento de download do resgate é maior que os 25s do caminho vivo', orcamentoResgate > 25_000)

// ── E. QUEM JÁ FOI TRATADO NÃO VOLTA PARA A FILA ────────────────────────────
check('E1 filmes já resgatados/expirados são excluídos da fila', rota.includes('alreadySeen'))
check('E2 o carimbo de expirado existe', rota.includes('vendor_asset_expired'))
check('E3 o carimbo de resgatado existe', rota.includes('vendor_asset_rescued'))
check('E4 o carimbo de falha existe', rota.includes('vendor_asset_rescue_failed'))

// ── F. O SILÊNCIO NA ENTREGA ACABOU ─────────────────────────────────────────
// A condição real: o carimbo é emitido no ramo em que a cópia NÃO aconteceu.
const iRamo = lib.indexOf('permanentVideo === videoUrl')
const iCarimbo = lib.indexOf('render_asset_left_on_vendor')
check('F1 a entrega compara o resultado com a URL do fornecedor', iRamo > -1)
check('F2 existe carimbo de "ficou no fornecedor"', iCarimbo > -1)
check('F3 o carimbo está DENTRO do ramo da falha', iRamo > -1 && iCarimbo > iRamo)
check('F4 o carimbo não pode derrubar a entrega do filme', /catch\s*\{/.test(lib.slice(iCarimbo)))
check('F5 o carimbo diz de quem é o filme', lib.slice(iRamo).includes('user_id: userId'))
check('F6 o carimbo diz qual render', lib.slice(iRamo).includes('render_id: renderId'))
// A entrega continua bounded: aumentar o prazo aqui quebraria o maxDuration
// de 60s do /api/compose/status, com a pessoa esperando.
check('F7 o caminho vivo mantém orçamento de download bounded', /downloadTimeoutMs:\s*25_000/.test(lib))

// ── G. O REMÉDIO É APERTADO SOZINHO ─────────────────────────────────────────
// Um conserto que depende de alguém lembrar de clicar não conserta nada.
check('G1 o resgate está no vercel.json', vercel.includes('/api/cron/rescue-vendor-assets'))
let cronsOk = false
let minutoUnico = false
try {
  const j = JSON.parse(vercel)
  const alvo = j.crons.filter((c) => c.path === '/api/cron/rescue-vendor-assets')
  cronsOk = alvo.length === 1 && typeof alvo[0].schedule === 'string'
  if (cronsOk) {
    const minuto = alvo[0].schedule.split(' ')[0]
    minutoUnico = j.crons.filter((c) => c.schedule.split(' ')[0] === minuto).length === 1
  }
} catch { /* JSON inválido cai no vermelho abaixo */ }
check('G2 vercel.json continua sendo JSON válido com UMA entrada do resgate', cronsOk)
check('G3 o resgate não divide o minuto com outro cron', minutoUnico)
check('G4 o gatilho não depende de query string de confirmação', !/rescue-vendor-assets\?[^"]*confirm/.test(vercel))

// ── H. O PADRÃO É AGIR ──────────────────────────────────────────────────────
// dry-run por padrão foi o que fez send-failure-recovery dormir 30 dias.
check('H1 existe um modo de inspeção sem escrita', rota.includes("'dry'"))
const mDry = rota.match(/const dryRun\s*=\s*([^\n]+)/)
check('H2 a inspeção é OPT-IN (o padrão é agir)', !!mDry && /===\s*'1'/.test(mDry[1]))

console.log(`\n${ok} verificações OK, ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length === 0 ? 0 : 1)
