// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — KINEO-PRECEDENCIA-CARTA-RECUSA-2026-09-07
// ═══════════════════════════════════════════════════════════════════════════
// O QUE ESTE ARQUIVO IMPEDE, e não é hipotético.
//
// A carta do cartão recusado é a entrega URGENTE do fundador (07/09 12:10) e
// tem UMA pessoa na coorte. Ela nasceu agendada para `10 13 * * *` — o MESMO
// minuto de `send-hotlead-blast?segment=auto&limit=25`, uma campanha genérica
// que drena até 25 pessoas por dia por segmentos largos.
//
// As duas dividem `loadLifecycleSuppression`, uma janela de 24h fail-closed:
// quem recebeu QUALQUER e-mail de ciclo de vida nas últimas 24h sai da coorte
// de todos os outros jobs. No mesmo minuto, a ORDEM não é garantida.
//
// A COLISÃO É NOMINAL, não teórica. A única pessoa da coorte da carta em
// 07/09 é `egotisticalfr@gmail.com`: 25 créditos, **0 vídeos**, trial ativo,
// nunca recebeu hotlead nem a carta. "Tem crédito e não fez vídeo" é
// exatamente a forma do segmento `stalled`, que o `segment=auto` drena
// primeiro. Se o blast genérico rodasse antes, a pessoa levaria um "você tem
// créditos, venha usar" — e a carta que fala do CARTÃO DELA ficaria suprimida
// por 24h. No dia seguinte a mesma corrida recomeça.
//
// A REGRA QUE ESTE GUARDIÃO TRAVA: a carta rara e específica avalia a coorte
// ANTES de qualquer campanha genérica de alto volume. Precedência por relógio,
// porque a supressão não tem precedência própria.
//
// ⚠️ E ela não pode ser "consertada" perdendo o `confirm=SEND`: esta casa já
// teve dois crons dormindo 30 dias por causa disso (send-failure-recovery e
// send-momentum-nudge, acordados em 01/09).
//
// Rodar: node scripts/test-precedencia-carta-recusa.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const falhas = []
let total = 0
const ok = (nome, cond, detalhe = '') => {
  total += 1
  if (cond) console.log(`  ✓ ${nome}`)
  else { console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`); falhas.push(nome) }
}

const vercel = JSON.parse(readFileSync(path.join(raiz, 'vercel.json'), 'utf8'))
const crons = vercel.crons ?? []
const acha = (frag) => crons.find((c) => typeof c.path === 'string' && c.path.includes(frag))

// Minuto absoluto do dia, só para agendas diárias de campo único (`m h * * *`).
// Uma agenda com lista (`0 11,15,20 * * *`) tem VÁRIOS horários e não se
// compara por um número só — por isso a função devolve null e a asserção
// que depende dela falha em vez de mentir.
const minutoDoDia = (schedule) => {
  const m = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(String(schedule ?? '').trim())
  if (!m) return null
  return Number(m[2]) * 60 + Number(m[1])
}

console.log('\nA. a carta da recusa existe e está armada')

const carta = acha('send-card-declined')
const blast = acha('send-hotlead-blast')
ok('a carta do cartão recusado está no vercel.json', Boolean(carta))
ok('o blast genérico está no vercel.json (é ele que a ameaça)', Boolean(blast))
ok('a carta mantém `confirm=SEND` (sem ele o cron roda e não envia nada)',
  Boolean(carta) && carta.path.includes('confirm=SEND'))

console.log('\nB. precedência: a carta rara avalia ANTES da campanha genérica')

const tCarta = carta ? minutoDoDia(carta.schedule) : null
const tBlast = blast ? minutoDoDia(blast.schedule) : null
ok('as duas agendas são diárias de horário único (comparáveis por relógio)',
  tCarta !== null && tBlast !== null,
  `carta=${carta?.schedule} blast=${blast?.schedule}`)
ok('a carta NÃO divide o minuto com o blast genérico',
  tCarta !== null && tBlast !== null && tCarta !== tBlast,
  `ambas em ${carta?.schedule}`)
ok('a carta roda ANTES do blast genérico',
  tCarta !== null && tBlast !== null && tCarta < tBlast,
  `carta=${tCarta} blast=${tBlast}`)
// Margem: dois jobs a um minuto de distância podem se sobrepor de verdade
// (um envio em lote leva mais que 60s). Dez minutos é a folga que a casa já
// usa entre campanhas irmãs.
ok('e com pelo menos 5 minutos de folga (envio em lote não é instantâneo)',
  tCarta !== null && tBlast !== null && tBlast - tCarta >= 5,
  `folga=${tBlast - tCarta} min`)

console.log('\nC. a carta continua protegida no código')

const rota = readFileSync(path.join(raiz, 'app', 'api', 'admin', 'send-card-declined', 'route.ts'), 'utf8')
  .replace(/\r\n/g, '\n')
// A ordem do fundador nomeia quatro contatos proibidos. akajitin ESTÁ na
// coorte bruta de recusas (NG, pré-pago, 03/09) — sem esta lista o cron
// escreveria para alguém que ele mandou não contatar, sem ninguém olhando.
for (const bloqueado of ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']) {
  ok(`o contato proibido "${bloqueado}" continua bloqueado na rota`,
    rota.includes(`'${bloqueado}'`))
}
// O mutante que renomeia o simbolo (loadLifecycleSuppressionXX) SOBREVIVEU a
// primeira versao desta assercao: /loadLifecycleSuppression/ casa como
// SUBSTRING dentro do nome renomeado. Amarrar a CHAMADA e ao import mata isso.
ok('a supressão de 24h continua ligada (fail-closed)',
  /\bloadLifecycleSuppression\(/.test(rota) &&
  rota.includes("import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'") &&
  /\bisSuppressed\(/.test(rota))
// A copy só é específica se ela LER o campo que o webhook grava. O evento real
// de 07/09 traz `reason_category: "card_restricted"` — não `decline_code`.
ok('a copy lê `reason_category`, que é o campo que o evento realmente traz',
  /md\.reason_category/.test(rota))
ok('e trata o motivo do caso real (`card_restricted`)',
  /case 'card_restricted':/.test(rota))

console.log(
  `\n${total - falhas.length}/${total} verificações passaram.` +
    (falhas.length ? `\nFALHOU: ${falhas.join(' · ')}` : ''),
)
process.exit(falhas.length ? 1 : 0)
