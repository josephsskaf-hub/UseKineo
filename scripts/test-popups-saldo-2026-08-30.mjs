// KINEO-POPUPS-2026-08-30 — auditoria dos popups de crédito + o furo do saldo
// parcial.
//
// O DEFEITO (achado no caso gapozweb, assinante Starter com 51 créditos
// queimando 80/dia): a guarda `outOfCredits()` era CEGA AO PREÇO — bastava
// `credits > 0` para liberar o clique. Quem tinha saldo menor que o motor
// escolhido mandava a request e levava 402 do servidor, SEM nenhum popup: a
// superfície que vende pacote de crédito só abre por `outOfCredits()`.
//
// Rodar: node scripts/test-popups-saldo-2026-08-30.mjs
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c, d = '') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { bad++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`) } }
const ler = (p) => readFileSync(join(R, p), 'utf8')
const semComentario = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

console.log('\n═══ POPUPS DE CRÉDITO — saldo parcial deixa de virar 402 mudo ═══\n')

const g = ler('app/(dashboard)/generate/GenerateClient.tsx')
const gc = semComentario(g)

console.log('A) A guarda passou a enxergar o preço')
chk('compara saldo com o custo do que está selecionado',
  gc.includes('return selectedCost > 0 && credits < selectedCost'),
  'sem isto, 51 créditos clicavam um Kling 3 de 150 e comiam 402')
chk('o cego `credits > 0 → libera` morreu',
  !gc.includes('if (credits > 0) return false'))
chk('saldo zero continua bloqueando (comportamento antigo intacto)',
  gc.includes('if (credits <= 0) return true'))
chk('Fast segue livre (contrato do cadastro novo)',
  gc.includes("if (mode === 'fast') return false"))
chk('saldo desconhecido (null) não bloqueia ninguém',
  gc.includes('if (credits === null) return false'))
chk('token cinematográfico do Pro continua valendo com saldo 0',
  gc.includes("if (mode === 'cinematic' && cinematicTokens > 0) return false"))

console.log('\nB) O custo usado é o mesmo que o servidor cobra')
chk('selectedCost vem de creditCostForDuration (nunca tabela local)',
  gc.includes('creditCostForDuration('),
  'a lição do "Generate · 20 credits" que debitava 30')
chk('o botão mostra o MESMO selectedCost que a guarda usa',
  g.includes('`Generate${selectedCost === 0'))

console.log('\nC) A caixa que abre já vende crédito para assinante')
chk('o bloqueio abre o modal de crédito',
  gc.includes("onClick={outOfCredits() ? () => openOutOfCreditsModal('credits')"))
chk('o modal sabe se a pessoa é assinante',
  gc.includes('isSubscriber={isStarter || isCreator || isStudio}'))
chk('e nesse caso oferece pacote, não troca de plano',
  g.includes('Out of credits mid-month? Top up instantly'))

console.log('\nD) As outras superfícies de crédito seguem de pé')
chk('CreditsTopupModal montado no /images (402)',
  ler('app/(dashboard)/images/ImagesClient.tsx').includes('<CreditsTopupModal surface="images_402"'))
chk('CreditsTopupModal montado no /audio (402)',
  ler('app/(dashboard)/audio/AudioClient.tsx').includes('<CreditsTopupModal surface="audio_402"'))
chk('chip "+" da sidebar abre o topup',
  ler('components/Sidebar.tsx').includes('<CreditsTopupModal surface="sidebar_chip"'))
chk('banner de saldo baixo segue só para NÃO-assinante (por desenho)',
  ler('app/(dashboard)/generate/LowCreditsUpsell.tsx').includes('THRESHOLD = 5'))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)
