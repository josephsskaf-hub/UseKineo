// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO va-r15 — a exclusão "já entrou em outra campanha" TEM PRAZO
// ═══════════════════════════════════════════════════════════════════════════
//
// O QUE ELE PROVA, e por quê:
//
// Até 08/09 o send-checkout-hot-nudge consultava OUTRAS_CAMPANHAS sem nenhum
// corte de data. Uma carta de agosto calava PARA SEMPRE a carta que fala em
// 30 minutos: 74 das 99 pessoas com nome que bateram no checkout em 30 dias
// estavam fora por isso. Este guardião amarra o conserto à CHAMADA que decide
// (`.gte('created_at', corteOutrasCampanhas(agora))`), não à prosa do arquivo,
// e exercita a função pura nos dois lados da fronteira.
//
// Estilo readFileSync de propósito: guardião com alias `@/` morre no import
// antes da primeira verificação (memória `guardioes-com-alias-nao-rodam`).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = join(raiz, 'app/api/admin/send-checkout-hot-nudge/route.ts')
const src = readFileSync(ROTA, 'utf8')

let ok = 0
let falhou = 0
function check(nome, condicao) {
  // Ordem (nome, condição) fixa e conferida: `check(condicao, nome)` invertido
  // faz trava passar sem avaliar nada (memória `guardiao-vermelho-pode-estar-parado`).
  if (condicao === true) { ok++; return }
  falhou++
  console.log(`  🔴 ${nome}`)
}

// ── 1. A CHAMADA QUE DECIDE ────────────────────────────────────────────────
// Sem espaço-agnóstico não adianta: o checkout do Windows entrega \r\n.
const texto = src.replace(/\r\n/g, '\n')

check('a consulta de OUTRAS_CAMPANHAS existe', /\.in\('name',\s*OUTRAS_CAMPANHAS\)/.test(texto))
check(
  'a consulta de OUTRAS_CAMPANHAS é cortada por data',
  /\.in\('name',\s*OUTRAS_CAMPANHAS\)[\s\S]{0,200}?\.gte\('created_at',\s*corteOutrasCampanhas\(/.test(texto),
)
check(
  'o corte usa o MESMO relógio do resto da rota (agora), não um new Date() solto',
  /\.gte\('created_at',\s*corteOutrasCampanhas\(agora\)\)/.test(texto),
)
check('a janela é exportada (o guardião consegue importá-la)', /export const OUTRAS_CAMPANHAS_JANELA_DIAS/.test(texto))
check('a função de corte é exportada', /export function corteOutrasCampanhas\(/.test(texto))

// ── 2. AS TRAVAS QUE NÃO PODEM TER AFROUXADO JUNTO ─────────────────────────
// Este conserto ALARGA quem pode receber. Se alargar as outras cinco, vira defeito.
check(
  'o carimbo 1×-para-sempre (SENT_EVENT) continua SEM corte de data',
  /\.eq\('name',\s*SENT_EVENT\)\.in\('user_id',\s*baseIds\)\s*\n/.test(texto) &&
    !/\.eq\('name',\s*SENT_EVENT\)[\s\S]{0,160}?\.gte\('created_at'/.test(texto),
)
check(
  'payment_success continua SEM corte de data (pagante nunca recebe)',
  !/\.eq\('name',\s*'payment_success'\)[\s\S]{0,160}?\.gte\('created_at'/.test(texto),
)
check('a supressão de 24h da casa continua chamada', /loadLifecycleSuppression\(/.test(texto))
check('a supressão continua filtrando os candidatos', /isSuppressed\(/.test(texto))
check('o opt-out continua excluindo', /email_opted_out === true/.test(texto))
check('os bloqueados continuam excluídos', /isBloqueado\(/.test(texto))
check('o filtro de pagante continua', /has_paid === true/.test(texto))
check('os 4 contatos proibidos do fundador continuam nomeados',
  ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin'].every((c) => texto.includes(c)))

// ── 3. A TELA DE APROVAÇÃO DIZ A VERDADE NOVA ──────────────────────────────
check('o dry-run publica a janela em dias', /outras_campanhas_janela_dias:\s*OUTRAS_CAMPANHAS_JANELA_DIAS/.test(texto))
check('a descrição da coorte deixou de prometer "nenhuma outra campanha" sem prazo',
  !/nunca pagou · nenhuma outra campanha · opt-in/.test(texto))

// ── 4. A FUNÇÃO PURA, NOS DOIS LADOS DA FRONTEIRA ──────────────────────────
// A rota importa Stripe/Supabase e é .ts — `import()` dela neste runner não é
// confiável (e derruba o node no teardown do Windows). Então a aritmética é
// REPLICADA aqui, mas só vale depois de provar, caractere a caractere, que o
// fonte é exatamente esta aritmética. Réplica sem essa prova é teste de si
// mesma (memória `superficie-medida-por-copia-da-regra`).
const CORPO_ESPERADO = 'return new Date(agoraMs - dias * 24 * 60 * 60 * 1000).toISOString()'
check('o corpo da função de corte é exatamente a aritmética que a réplica assume',
  texto.includes(CORPO_ESPERADO))

const diasM = texto.match(/export const OUTRAS_CAMPANHAS_JANELA_DIAS = (\d+)/)
check('a janela foi lida do fonte', Boolean(diasM))
const dias = diasM ? Number(diasM[1]) : NaN
check('a janela é um número positivo', Number.isFinite(dias) && dias > 0)
check('a janela NÃO é eterna (o defeito que este guardião mata)', Number.isFinite(dias) && dias < 3650)
check('a janela é curta o bastante para a carta quente valer (<= 30 dias)',
  Number.isFinite(dias) && dias <= 30)

const corte = (agoraMs, d = dias) => new Date(agoraMs - d * 24 * 60 * 60 * 1000).toISOString()
const agora = Date.parse('2026-09-08T03:00:00.000Z')
check('o corte fica ANTES de agora', Date.parse(corte(agora)) < agora)
check('a distância do corte é exatamente a janela em dias',
  Math.abs((agora - Date.parse(corte(agora))) / 86_400_000 - dias) < 1e-6)
// A fronteira, com a janela REAL do fonte: um dia a menos cala, um dia a mais não.
const corteReal = Date.parse(corte(agora))
check('carta de (janela - 1) dias atrás continua excluindo',
  agora - (dias - 1) * 86_400_000 >= corteReal)
check('carta de (janela + 1) dias atrás deixa de excluir',
  agora - (dias + 1) * 86_400_000 < corteReal)
check('carta de exatamente a janela está na borda inclusiva do .gte',
  agora - dias * 86_400_000 >= corteReal)
check('o corte é ISO-8601 com Z (o PostgREST exige)', /^\d{4}-\d{2}-\d{2}T.*Z$/.test(corte(agora)))

console.log(`\n${falhou === 0 ? '✅' : '🔴'} ${ok} verdes, ${falhou} vermelhas`)
process.exit(falhou === 0 ? 0 : 1)
