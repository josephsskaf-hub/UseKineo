// KINEO-SILENCIO-NA-TELA-2026-09-23 + KINEO-EDITAR-VOLTA-AO-STUDIO-2026-09-23
// Caso real: render H3 do fundador (23/09, 4e2767cd) recusado com
// plan_silence_inside_scenes, words_to_add=19. A tela dizia só "This video
// needs a review"; e "Edit my idea" prendia quem veio do /studio na cortina
// "Directing your film…". Guardião roda o parser de verdade (type stripping).
import fs from 'node:fs'
import { parseQualityFailureExit, ADD_WORDS_REASONS } from '../lib/qualityFailureExit.ts'

let ok = 0, falhas = 0
const checa = (nome, cond) => { if (cond) ok++; else { falhas++; console.log('  ✗ ' + nome) } }
const norm = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const falha = (reason) => ({ generationId: '4e2767cd-2cbf-43a9-a98f-6cdc174885fb', reason, refunded: true, refundConfirmed: true, claimReleased: true, noDebit: false, canEdit: true, retryable: false })
const corpo = { qualityCheckFailed: true, reason: 'plan_silence_inside_scenes', wordsToAdd: 19 }

const s = parseQualityFailureExit(corpo, falha('plan_silence_inside_scenes'))
checa('silêncio com wordsToAdd=19 → guidance add_words e 19 palavras', s?.guidance === 'add_words' && s?.wordsToAdd === 19)
checa('a razão do silêncio está no conjunto', ADD_WORDS_REASONS.has('plan_silence_inside_scenes'))
checa('sem wordsToAdd → sem guidance (tela genérica, nunca número inventado)', parseQualityFailureExit({ qualityCheckFailed: true }, falha('plan_silence_inside_scenes'))?.guidance === null)
checa('wordsToAdd inválido (texto, 0, fração, negativo) → null', ['19', 0, 2.5, -3].every((v) => parseQualityFailureExit({ wordsToAdd: v }, falha('plan_silence_inside_scenes'))?.wordsToAdd === null))
checa('outra razão com wordsToAdd no corpo não vira add_words', parseQualityFailureExit(corpo, falha('plan_duration_below_request'))?.guidance === null)
checa('S25 continua engine_or_format e sem palavras', (() => { const e = parseQualityFailureExit(corpo, falha('s25_dialogue_without_host')); return e?.guidance === 'engine_or_format' && e?.wordsToAdd === null })())
checa('sem falha validada → sem saída', parseQualityFailureExit(corpo, null) === null)

const painel = norm('components/VideoQualityFailurePanel.tsx')
checa('painel troca título pelo de palavras quando add_words', painel.includes("wordsToAdd !== null ? copy.wordsTitle : copy.title"))
checa('painel diz o número do servidor', painel.includes('copy.wordsDetail(wordsToAdd)') && /Add about \$\{n\} more word/.test(painel))
checa('painel lê add_words da saída, não recalcula', painel.includes("exit?.guidance === 'add_words' ? exit.wordsToAdd : null"))
checa('es e hi têm a mesma frase', (painel.match(/wordsDetail: \(n: number\)/g) ?? []).length === 3)

const cliente = norm('app/(dashboard)/generate/GenerateClient.tsx')
const i = cliente.indexOf('const editAfterQualityFailure = useCallback(')
const bloco = cliente.slice(i, cliente.indexOf('\n  }, [router])', i) + 15)
checa('editar achado e fecha com deps [router]', i > 0 && bloco.endsWith('}, [router])'))
checa('chegada do studio (?studio=1) volta para /studio', /if \(atual\.get\('studio'\) === '1'\) \{[\s\S]*router\.push\(`\/studio\?\$\{volta\.toString\(\)\}`\)\s*\n\s*return/.test(bloco))
checa('a volta leva texto, motor, duração, modo, língua e formato', ["'engine', 'prompt', 'duration', 'script_mode', 'language', 'aspect'"].every((x) => bloco.includes(x)))
checa('a volta NÃO leva autoanalyze nem studio=1 (não redispara)', !/volta\.set\('(autoanalyze|studio)'/.test(bloco))
checa('fora do studio continua voltando a idle', bloco.indexOf("setPhase('idle')") > bloco.indexOf('router.push'))

console.log(`${ok} ok · ${falhas} falhas`)
if (falhas) process.exit(1)
