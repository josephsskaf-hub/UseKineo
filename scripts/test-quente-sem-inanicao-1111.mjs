// KINEO-QUENTE-SEM-INANICAO-1111 [CEO/fundador 11/11: "pode fazer as coisas que você achar certas"]
// Guardião da carta quente (app/api/admin/send-checkout-hot-nudge) com a janela de supressão de 4 h — a MESMA exceção do
// cron/send-recovery (KINEO-RECOVERY-STARVATION-2026-08-13). Prova:
//   A. a rota chama a supressão com HOT_LEAD_SUPPRESSION_HOURS (4 h), e o motivo do pulo diz 4 h;
//   B. a exceção continua estreita: HOT_LEAD_SUPPRESSION_HOURS = 4, o default de todos os outros é 24 h;
//   C. o que NÃO pode mudar: carimbo de 1 carta por pessoa NA VIDA (sem corte de data), pagante fora (has_paid e qualquer
//      payment_success — o assinante parado incluído), outras campanhas fora, releitura no envio (podeEnviarAgora);
//   D. a conta do caso real (hutanu.nela1): e-mail às 07:29, clique às 07:31, cron de 15 em 15 min na janela 30 min–6 h —
//      com 24 h a carta NUNCA sai; com 4 h sai dentro da janela;
//   E. mutantes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const SRC = {
  route: read('app/api/admin/send-checkout-hot-nudge/route.ts'),
  sup: read('lib/lifecycle/suppression.ts'),
  janela: read('lib/lifecycle/abandonoRapido.ts'),
}
const num = (src, name) => { const m = src.match(new RegExp(`export const ${name}\\s*=\\s*(\\d+)`)); return m ? Number(m[1]) : NaN }

/** A primeira rodada do cron (minutos 6, 21, 36, 51) dentro da janela da carta e fora da supressão; null = nunca. */
function primeiraCarta({ emailMin, clickMin, supHoras, janelaMin, janelaMax }) {
  for (let t = clickMin; t <= clickMin + janelaMax; t++) {
    if (![6, 21, 36, 51].includes(((t % 60) + 60) % 60)) continue
    const desde = t - clickMin
    if (desde < janelaMin || desde > janelaMax) continue
    if (t - emailMin < supHoras * 60) continue
    return t
  }
  return null
}

function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  // A
  t(/const sup = await loadLifecycleSuppression\(admin, candidatos\.map\(\(c\) => c\.id\), HOT_LEAD_SUPPRESSION_HOURS\)/.test(S.route), 'A1 a carta quente usa a janela curta (HOT_LEAD_SUPPRESSION_HOURS)')
  t(/import \{ HOT_LEAD_SUPPRESSION_HOURS, loadLifecycleSuppression \} from '@\/lib\/lifecycle\/suppression'/.test(S.route), 'A2 a janela vem da fonte única da supressão (nunca um número digitado)')
  t(/'suprimido_4h'/.test(S.route) && !/: 'suprimido_24h'\)/.test(S.route), 'A3 o motivo do pulo diz a janela real (suprimido_4h)')
  // B
  const hot = num(S.sup, 'HOT_LEAD_SUPPRESSION_HOURS')
  const def = num(S.sup, 'LIFECYCLE_SUPPRESSION_HOURS')
  t(hot === 4 && def === 24, `B1 exceção estreita: 4 h só para quem passa a janela curta; o default segue ${def} h`)
  t(/windowHours: number = LIFECYCLE_SUPPRESSION_HOURS/.test(S.sup), 'B2 quem não passa a janela continua com 24 h')
  // C
  t(/\.from\('events'\)\.select\('user_id'\)\.eq\('name', SENT_EVENT\)\.in\('user_id', fatia\), \{ route/.test(S.route), 'C1 o carimbo é de 1 carta por pessoa NA VIDA (sem corte de data)')
  t(/if \(p\.has_paid === true\) return 'pagante'/.test(S.route), 'C2 has_paid = pagante, fora')
  t(/\.eq\('name', 'payment_success'\)/.test(S.route) && /if \(pagou\.has\(id\)\) \{ excluidos\.pagante\+\+/.test(S.route), 'C3 qualquer payment_success na história (assinante parado incluído) = fora')
  t(/if \(outras\.has\(id\)\)/.test(S.route), 'C4 quem está em outra campanha fica fora')
  t(/return podeEnviarAgora\(\{/.test(S.route), 'C5 o envio relê pagamento e sessão segundos antes (podeEnviarAgora)')
  // D — o caso real, minutos do dia: e-mail 07:29, clique 07:31
  const janelaMin = num(S.janela, 'ABANDONO_JANELA_MIN_MINUTOS')
  const janelaMax = num(S.janela, 'ABANDONO_JANELA_MAX_MINUTOS')
  const caso = { emailMin: 7 * 60 + 29, clickMin: 7 * 60 + 31, janelaMin, janelaMax }
  const com24 = primeiraCarta({ ...caso, supHoras: def })
  const comHot = primeiraCarta({ ...caso, supHoras: hot })
  t(com24 === null, 'D1 com 24 h: a carta de quem abriu o pagamento nunca sai (a janela de 6 h fecha antes)')
  t(comHot !== null && comHot - caso.clickMin <= janelaMax, `D2 com ${hot} h: a carta sai ${comHot === null ? '—' : `${Math.floor((comHot - caso.clickMin) / 60)} h ${(comHot - caso.clickMin) % 60} min`} depois do clique, dentro da janela`)
  const semEmail = primeiraCarta({ ...caso, emailMin: -10_000, supHoras: hot })
  t(semEmail !== null && semEmail - caso.clickMin >= janelaMin, 'D3 sem e-mail recente: a carta sai no primeiro cron depois de 30 min, como antes')
  return out
}

for (const [c, m] of suite(SRC)) ok(c, m)

const MUTANTS = [
  ['volta ao default de 24 h', 'route', 'candidatos.map((c) => c.id), HOT_LEAD_SUPPRESSION_HOURS)', 'candidatos.map((c) => c.id))'],
  ['janela curta vira 24', 'sup', 'export const HOT_LEAD_SUPPRESSION_HOURS = 4', 'export const HOT_LEAD_SUPPRESSION_HOURS = 24'],
  ['carimbo ganha corte de data', 'route', ".eq('name', SENT_EVENT).in('user_id', fatia), { route", ".eq('name', SENT_EVENT).in('user_id', fatia).gte('created_at', corteOutrasCampanhas(agora)), { route"],
  ['has_paid deixa de excluir', 'route', "  if (p.has_paid === true) return 'pagante'\n", ''],
  ['payment_success deixa de excluir', 'route', "if (pagou.has(id)) { excluidos.pagante++;", "if (false) { excluidos.pagante++;"],
  ['motivo mente', 'route', "sup.degraded ? 'supressao_degradada' : 'suprimido_4h'", "sup.degraded ? 'supressao_degradada' : 'suprimido_24h'"],
]
for (const [name, key, from, to] of MUTANTS) {
  if (!SRC[key].includes(from)) { ok(false, `mutante "${name}": trecho não encontrado`); continue }
  const caught = suite({ ...SRC, [key]: SRC[key].replace(from, to) }).some(([c]) => !c)
  ok(caught, `mutante "${name}" é pego`)
}
console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
