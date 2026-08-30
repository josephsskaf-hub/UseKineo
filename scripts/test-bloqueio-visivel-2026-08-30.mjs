// KINEO-BLOQUEIO-VISIVEL-2026-08-30 — a conta barrada por digital para de
// parecer órfã para as varreduras de reparo.
//
// O INCIDENTE: o farmer VN (digital b01e05b4660b) foi barrado em 2 contas às
// 19h de 30/08. Às 21h11 o auto-reparo de trial órfão devolveu 25cr para as
// DUAS — porque a assinatura no banco de uma conta BLOQUEADA era idêntica à
// de um cadastro que perdeu o grant por bug: trial_status NULL + 0 créditos.
// O anti-abuso virava gerador de crédito: a cada bloqueio, +25 na hora
// seguinte, para sempre.
//
// Rodar: node scripts/test-bloqueio-visivel-2026-08-30.mjs
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c, d = '') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { bad++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`) } }
const ler = (p) => readFileSync(join(R, p), 'utf8')

console.log('\n═══ BLOQUEIO VISÍVEL — o farmer não é mais recreditado ═══\n')

const rt = ler('lib/reverseTrial.ts')
const cod = rt.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

chk('o bloqueio marca trial_status = blocked',
  cod.includes("update({ trial_status: 'blocked' })"),
  'sem a marca, toda varredura de órfão lê a conta barrada como vítima')
chk('a marca é guardada por trial_status NULL (nunca sobrescreve trial real)',
  /update\(\{ trial_status: 'blocked' \}\)[\s\S]{0,120}\.is\('trial_status', null\)/.test(cod))
chk('a marca fica DENTRO do ramo de bloqueio (só quem foi barrado)',
  cod.indexOf("outcome: 'blocked'") < cod.indexOf("update({ trial_status: 'blocked' })") &&
  cod.indexOf("update({ trial_status: 'blocked' })") < cod.indexOf("name: 'trial_blocked_fingerprint'"))
chk('falha-aberto: erro ao marcar não derruba o bloqueio (só loga)',
  cod.includes('could not mark blocked profile'))
chk('o contrato silencioso continua (fingerprint_limit, sem copy acusatória)',
  cod.includes("return { activated: false, reason: 'fingerprint_limit' }"))
chk('o evento de auditoria segue sendo escrito',
  cod.includes("name: 'trial_blocked_fingerprint'"))

// A varredura de órfão (código e vigia) filtra por trial_status NULL: com a
// marca, o bloqueio some do radar delas por construção.
chk('o grant só roda com trial_status NULL (a marca basta para blindar)',
  rt.includes(".is('trial_status', null)"))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)
