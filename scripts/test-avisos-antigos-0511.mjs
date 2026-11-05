// KINEO-AVISOS-ANTIGOS-0511 — guardião: os dois cartões antigos não aparecem; a inscrição de quem já autorizou continua.
// Rodar: node scripts/test-avisos-antigos-0511.mjs
import fs from 'node:fs'
const P = fs.readFileSync('components/EnablePushBanner.tsx', 'utf8').replace(/\r\n/g, '\n'), I = fs.readFileSync('components/InstallAppBanner.tsx', 'utf8').replace(/\r\n/g, '\n'), L = fs.readFileSync('app/(dashboard)/layout.tsx', 'utf8')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const pushOff = (t) => t.includes('const CARTAO_DO_PUSH_LIGADO = false as boolean') && t.includes('if (!CARTAO_DO_PUSH_LIGADO) return null')
const instOff = (t) => t.includes('const CARTAO_DE_INSTALAR_LIGADO = false as boolean') && t.includes("if (mode === 'hidden' || !CARTAO_DE_INSTALAR_LIGADO) return null")
ok(pushOff(P), 'o cartão de push não aparece')
ok(!pushOff(P.replace('CARTAO_DO_PUSH_LIGADO = false', 'CARTAO_DO_PUSH_LIGADO = true')), 'mutante: ligar fica vermelho')
ok(instOff(I), 'o convite de instalar não aparece')
ok(!instOff(I.replace('CARTAO_DE_INSTALAR_LIGADO = false', 'CARTAO_DE_INSTALAR_LIGADO = true')), 'mutante: ligar fica vermelho')
ok(L.includes('<EnablePushBanner />'), 'o componente segue montado: quem já autorizou continua inscrito')
ok(P.indexOf('useEffect(() =>') > 0 && P.indexOf('useEffect(() =>') < P.indexOf('if (!CARTAO_DO_PUSH_LIGADO) return null'), 'o trabalho silencioso roda antes de sair')
console.log('\n' + pass + ' ok, ' + fail + ' falha(s)')
process.exit(fail ? 1 : 0)
