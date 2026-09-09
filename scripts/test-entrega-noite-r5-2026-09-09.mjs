// ═══ GUARDIÃO — KINEO-RECUSA-QUE-NINGUEM-LEU-2026-09-09 (rotina noite r5) ═══
//
// O QUE ELE PROTEGE: a recusa determinística por narração curta é a causa nº1
// de "apertou e não saiu" por PESSOAS atingidas (21 eventos / 12 pessoas em 7
// dias; 31 pessoas em 30 dias). O servidor já recusa bem — o que faltava era
// alguém para ler. Este guardião prova que o aviso (a) só existe quando a
// pessoa NÃO leu a tela, (b) é medido pela MESMA variável que o desenha, e
// (c) nunca promete crédito que o evento não afirma.
//
// ESTILO DA CASA: `readFileSync` puro. Nada de `import ... from '@/...'` —
// alias não resolve fora do Next e o arquivo morre no import antes da 1ª
// asserção (memória: `guardioes-com-alias-nao-rodam`). CRLF normalizado na
// leitura: o checkout do Windows quebra regex de duas linhas.
import { readFileSync } from 'node:fs'

const ler = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const PURO = 'lib/entrega/refusalNotice.ts'
const SERVIDOR = 'lib/entrega/refusalNoticeServer.ts'
const PAGINA = 'app/(dashboard)/studio/create/page.tsx'
const CLIENTE = 'app/(dashboard)/generate/GenerateClient.tsx'

const puro = ler(PURO)
const servidor = ler(SERVIDOR)
const pagina = ler(PAGINA)
const cliente = ler(CLIENTE)

let ok = 0
const falhas = []
/** Ordem fixa: (nome, condição). Trocar a ordem faz trava passar sem avaliar
 *  nada (memória: `guardiao-vermelho-pode-estar-parado`). */
function check(nome, condicao) {
  if (condicao === true) { ok++; return }
  falhas.push(nome)
}

// ─── A DECISÃO PURA: as três recusas, cada uma amarrada à sua condição ─────
check(
  '1. não avisa quem JÁ LEU a tela de falha',
  puro.includes('if (fatos.sawScreenAfter) return null'),
)
check(
  '2. não avisa quem JÁ FEZ um filme depois do bloqueio',
  puro.includes('if (fatos.completedVideoAfter) return null'),
)
check(
  '3. bloqueio velho demais não vira aviso (teto explícito)',
  puro.includes('if (idade > REFUSAL_NOTICE_MAX_AGE_MS) return null'),
)
check(
  '4. relógio torto falha FECHADA (idade negativa não avisa)',
  puro.includes('if (idade < 0) return null'),
)
check(
  '5. o teto de idade é constante exportada, não número solto',
  /export const REFUSAL_NOTICE_MAX_AGE_MS = 14 \* 24 \* 60 \* 60 \* 1000/.test(puro),
)
check(
  '6. fatos sem entrada nenhuma devolvem null',
  puro.includes('if (!fatos) return null'),
)
check(
  '7. fala ou alvo inválido não vira aviso',
  puro.includes('if (!Number.isFinite(fala) || fala <= 0) return null') &&
    puro.includes('if (!Number.isFinite(alvo) || alvo <= 0) return null'),
)

// ─── A PROMESSA DE CRÉDITO: só quando o evento AFIRMA ──────────────────────
check(
  '8. `charged` é tri-estado no tipo (desconhecido não vira false)',
  /charged: boolean \| null/.test(puro),
)
check(
  '9. `nothingCharged` exige o `false` provado, nunca a ausência',
  puro.includes('nothingCharged: fatos.charged === false'),
)
check(
  '10. o servidor só grava boolean quando o evento traz boolean',
  servidor.includes("charged: typeof meta.charged === 'boolean' ? meta.charged : null"),
)

// ─── FONTE ÚNICA DA DURAÇÃO ────────────────────────────────────────────────
check(
  '11. a duração sugerida vem de largestFittingDuration, não de lista à mão',
  puro.includes("import { largestFittingDuration } from '@/lib/expandPolicy'") &&
    puro.includes('largestFittingDuration(fala) ?? 0'),
)
check(
  '12. o arquivo puro NÃO reescreve o seletor de durações',
  !/\[\s*35\s*,\s*60\s*,\s*90\s*\]/.test(puro),
)

// ─── A FRONTEIRA SERVIDOR/CLIENTE ──────────────────────────────────────────
// `tsc` fica verde com builtin de Node numa lib compartilhada e o build da
// Vercel é que paga (memória: `tsc-nao-ve-a-fronteira-servidor-cliente`).
check(
  '13. o arquivo puro não puxa @supabase/supabase-js',
  !puro.includes('@supabase/supabase-js'),
)
check(
  '14. o cliente importa APENAS o tipo, e do arquivo puro',
  cliente.includes("import type { RefusalNotice } from '@/lib/entrega/refusalNotice'"),
)
check(
  '15. o cliente NUNCA importa a metade servidor (chave de serviço no bundle)',
  !cliente.includes('refusalNoticeServer'),
)
check(
  '16. o leitor de servidor é best-effort integral (catch devolve null)',
  /\}\s*catch\s*\{\s*\n\s*return null\s*\n\s*\}/.test(servidor),
)

// ─── O LEITOR: lê a recusa certa e as duas perguntas que decidem o silêncio ─
check(
  '17. lê o bloqueio mais recente de narração da PRÓPRIA pessoa',
  servidor.includes(".eq('name', 'narration_guard_blocked')") &&
    servidor.includes(".eq('user_id', userId)") &&
    servidor.includes("order('created_at', { ascending: false })"),
)
check(
  '18. a tela vista e o filme feito são contados DEPOIS do bloqueio',
  (servidor.match(/\.gt\('created_at', blockedAt\)/g) ?? []).length === 2,
)
check(
  '19. a pergunta da tela usa o evento real de tela de falha',
  servidor.includes(".eq('name', 'generation_failed_screen_shown')"),
)

// ─── A LIGAÇÃO NA PÁGINA ───────────────────────────────────────────────────
check(
  '20. a página chama o leitor e entrega o resultado ao componente',
  pagina.includes('const refusalNotice = await lerAvisoDeRecusa(user.id)') &&
    pagina.includes('refusalNotice={refusalNotice}'),
)

// ─── A TELA: uma condição só, medida por ela mesma ─────────────────────────
const CONDICAO =
  "const mostrarAvisoDeRecusa = Boolean(refusalNotice) && phase === 'idle' && !avisoRecusaFechado"
check('21. existe UMA condição que decide o aviso', cliente.includes(CONDICAO))
check(
  '22. a impressão é gated pela MESMA variável que desenha',
  cliente.includes('if (!mostrarAvisoDeRecusa || !refusalNotice) return') &&
    cliente.includes('{mostrarAvisoDeRecusa && refusalNotice && ('),
)
check(
  '23. a impressão diz se HAVIA botão (senão "ninguém quis" = "não havia botão")',
  cliente.includes('tem_botao: refusalNotice.suggestedDuration > 0'),
)
check(
  '24. a frase de crédito só sai sob o `nothingCharged` provado',
  cliente.includes("{refusalNotice.nothingCharged ? ' No credits were charged.' : ''}") &&
    (cliente.match(/No credits were charged\./g) ?? []).length === 1,
)
check(
  '25. o botão só existe quando existe duração honesta',
  cliente.includes(
    '{refusalNotice.suggestedDuration > 0 && avisoRecusaDuracaoAplicada === null && (',
  ),
)
check(
  '26. o clique MUDA a duração de verdade e é medido',
  cliente.includes('setDuration(alvo)') &&
    cliente.includes("void trackEvent('refusal_notice_action_clicked'"),
)
check(
  '27. o aviso não toca em crédito, render, e-mail nem preço',
  !/refusalNotice[\s\S]{0,400}?(sendEmail|refund|grantCredits|checkout)/.test(cliente),
)

const total = ok + falhas.length
console.log(`\n[guardião r5 — a recusa que ninguém leu] ${ok}/${total} verdes`)
if (falhas.length > 0) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ todas verdes\n')
