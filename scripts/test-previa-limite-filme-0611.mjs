// KINEO-PREVIA-LIMITE-FILME-0611 — guardião sem rede: o limite da prévia oferece o filme grátis só a quem ainda pode pedir, e nada começa sozinho.
import fs from 'node:fs'
const t = fs.readFileSync('app/(dashboard)/studio/previa/ScenePreviewClient.tsx', 'utf8').replace(/\r\n/g, '\n')
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
checa('só no lado a pedido, sem prévia na tela, com limite', t.includes('aPedido && !preview && (limite || left === 0)'))
checa('os 3 limites abrem o botão', ['daily_limit', 'total_limit', 'global_limit'].every((r) => t.includes("j?.reason === '" + r + "'")))
checa('falha de roteiro não abre o botão', !t.includes("j?.reason === 'script_failed'"))
checa('o botão só vive no clique', t.includes('data-testid="scene-preview-limit-claim"') && /onClick=\{\(\) => \{ void pedirFilme\(\) \}\}/.test(t) && !/useEffect\([^\n]*pedirFilme/.test(t))
checa('volta à caixa com a ideia, sem gerar', t.includes("voltaParaCaixa(idea) ?? '/studio'"))
checa('medição separa esta porta', t.includes("surface: preview ? 'preview' : 'preview_limit'"))
checa('quem tem prévia segue pelo caminho de antes', t.includes('window.location.assign(previaResumeStudioHref({ t: Date.now(), idea: preview.idea || idea'))
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1) }
console.log('TUDO OK')
