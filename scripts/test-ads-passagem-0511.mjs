// KINEO-ADS-PASSAGEM-0511 — guardião: depois do clique, a vitrine antiga "Made on Kineo" não aparece no caminho para a tela nova do anúncio.
// Rodar: node scripts/test-ads-passagem-0511.mjs
import fs from 'node:fs'
const lf = (t) => t.replace(/\r\n/g, '\n')
const C = lf(fs.readFileSync('app/(dashboard)/ads/v2/AdsV2Client.tsx', 'utf8')), S = lf(fs.readFileSync('app/(dashboard)/ads/v2/AdsV2Simple.tsx', 'utf8'))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
function prova(c = C, s = S) {
  const e = []
  const cond = c.match(/const vaiPraTelaNova = (.*)/)?.[1] ?? ''
  if (!cond.includes("mode === null")) e.push('A1 vale no instante antes de ler a URL')
  if (!cond.includes('!groupId')) e.push('A2 retomada de grupo segue como antes')
  if (!cond.includes('escolhaSample') || !cond.includes('escolhaInternal') || !cond.includes('escolhaOwnerKey')) e.push('A3 a mesma condição que abre a tela nova')
  if (!s.includes('(props.escolhaInternal === true && !props.sample || props.escolhaSample === true) && props.escolhaOwnerKey')) e.push('A4 a condição da tela nova mudou: revisar vaiPraTelaNova')
  if (!c.includes('{vaiPraTelaNova || (mode === \'simple\' && simplePreview) ? null : <ProductStage name={shell.title}')) e.push('B1 palco antigo escondido')
  if (!c.includes('{vaiPraTelaNova || (mode === \'simple\' && simplePreview && !groupId) ? null : (')) e.push('B2 fileira antiga escondida')
  if (!/import\('\.\/AdsV2Escolha'\), \{ ssr: false, loading: \(\) => <div aria-busy="true"/.test(s)) e.push('C1 carregando no lugar da tela em branco')
  return e
}
const r = prova()
ok(r.length === 0, 'confere (' + (r.join(' | ') || 'ok') + ')')
for (const [nome, esp, a] of [
  ['sem o instante antes da URL', /A1/, [C.replace("(mode === 'simple' || mode === null) && !groupId", "mode === 'simple' && !groupId")]],
  ['grupo também some', /A2/, [C.replace('&& !groupId && ((escolhaInternal', '&& ((escolhaInternal')]],
  ['palco volta', /B1/, [C.replace("{vaiPraTelaNova || (mode === 'simple' && simplePreview) ? null : <ProductStage", "{mode === 'simple' && simplePreview ? null : <ProductStage")]],
  ['fileira volta', /B2/, [C.replace("{vaiPraTelaNova || (mode === 'simple' && simplePreview && !groupId) ? null : (", "{mode === 'simple' && simplePreview && !groupId ? null : (")]],
  ['sem carregando', /C1/, [C, S.replace(', loading: () => <div aria-busy="true"', ', x: () => <div aria-busy="true"')]],
]) ok(prova(...a).some((m) => esp.test(m)), 'mutante "' + nome + '" fica vermelho')
console.log('\n' + pass + ' ok, ' + fail + ' falha(s)')
process.exit(fail ? 1 : 0)
