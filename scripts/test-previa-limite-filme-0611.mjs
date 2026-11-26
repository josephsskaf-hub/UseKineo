// KINEO-PREVIA-LIMITE-FILME-0611 — guardião sem rede: o limite da prévia oferece o filme grátis só a quem ainda pode pedir, e nada começa sozinho.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const t = fs.readFileSync('app/(dashboard)/studio/previa/ScenePreviewClient.tsx', 'utf8').replace(/\r\n/g, '\n')
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
checa('só no lado a pedido, sem prévia na tela, com limite', t.includes('aPedido && !preview && (limite || left === 0)'))
checa('os 3 limites abrem o botão', ['daily_limit', 'total_limit', 'global_limit'].every((r) => t.includes("j?.reason === '" + r + "'")))
checa('falha de roteiro não abre o botão', !t.includes("j?.reason === 'script_failed'"))
checa('o botão só vive no clique', t.includes('data-testid="scene-preview-limit-claim"') && /onClick=\{\(\) => \{ void pedirFilme\(\) \}\}/.test(t) && !/useEffect\([^\n]*pedirFilme/.test(t))
const volta = t.match(/: (voltaParaCaixa\(idea, filmLook, voiceModeFields\(voiceMode\)\.voice_mode\))\s*\n\s*window\.location\.assign\(fallback \?\? '\/studio'\)/)?.[1]
const load = createOfflineLoader()
const { voltaParaCaixa } = load('@/lib/growth/ideiaDaPagina')
const { voiceModeFields } = load('@/lib/cinematic/filmVoice2511')
const destino = volta && new Function('voltaParaCaixa', 'voiceModeFields', 'voiceMode', 'idea', 'filmLook', 'return (' + volta + ") ?? '/studio'")
const link = (idea, filmLook) => new URL(destino(voltaParaCaixa, voiceModeFields, undefined, idea, filmLook), 'https://example.invalid')
checa('volta à caixa com a ideia, sem gerar', Boolean(destino) && link('A storm & a ship').href === 'https://example.invalid/studio?ideia=A+storm+%26+a+ship' && link('').pathname === '/studio')
checa('retomada preserva o estilo que a pessoa escolheu, sem disparar', Boolean(destino) && link('A storm', 'anime').search === '?ideia=A+storm&look=anime')
checa('medição separa esta porta', t.includes("surface: preview ? 'preview' : 'preview_limit'"))
checa('quem tem prévia segue pelo caminho de antes', t.includes('window.location.assign(previaResumeStudioHref(filmDraft(preview)))') && t.includes('idea: originalScript || preview.idea || idea, script: preview.script'))
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1) }
console.log('TUDO OK')
