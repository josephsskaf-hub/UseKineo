// KINEO-VERSAO-B-FUNIL-VOLTA-2026-09-08 — guardião: a ideia sobrevive ao Stripe e o filme dispara na volta.
//
// ⚠ REANCORADO EM 09/09 (sprint ChatGPT r4). Este guardião foi escrito em 08/09
// como um retrato BYTE A BYTE da primeira implementação, e por isso passou a
// AFIRMAR TRÊS DEFEITOS que a r4 achou lendo o caminho pago linha a linha:
//
//   · dizia "grava ideia + MOTOR + duração" ancorando em
//     `{ prompt: clean, quality, duration, at }` — mas `quality` NÃO é o motor.
//     Quem escolhe o motor é `mode` + `aiEngine`, e nenhum dos dois era gravado.
//     Na volta do Stripe o `mode` renascia em 'fast': quem comprou um motor
//     cinematográfico recebia um Kineo 1, sem aviso e sem erro na tela.
//   · exigia `QUALITY_OPTIONS.some(...)` como validação do quality restaurado —
//     lista LEGADA de 3 entradas que não contém os dois valores vivos
//     ('fast' e 'cinematic_ai'), então o quality era recusado em 100% dos casos.
//   · exigia `credits <= 0` como régua do disparo, enquanto o gerador exige
//     `credits >= selectedCost`. Duas réguas: com os 80 créditos do $1 e um
//     motor de 150, o autostart afirmaria ter começado, apagaria o rascunho, e
//     entregaria um modal de "sem créditos" a quem acabou de pagar.
//
// As INTENÇÕES originais estão todas preservadas abaixo, uma a uma, e três
// delas ficaram MAIS ESTRITAS (motor de verdade, cardápio vivo, régua única).
// Nada foi afrouxado. O que mudou foi o alvo das âncoras: a verdade do rascunho
// mora agora em lib/growth/cardEntryResumeDraft.ts.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
const sp = rd('app/checkout/success/page.tsx')
const mod = rd('lib/growth/cardEntryResumeDraft.ts')

console.log('== o rascunho ==')
checa('chave única do rascunho, com dono único', /export const CARD_ENTRY_DRAFT_KEY = 'kineo_studio_draft_v1'/.test(mod))
checa('nenhuma tela redigita a chave', !/'kineo_studio_draft_v1'/.test(gc) && !/'kineo_studio_draft_v1'/.test(sp))
checa('rascunho vive em sessionStorage (morre com a aba), nunca localStorage', /sessionStorage\.setItem\(\s*CARD_ENTRY_DRAFT_KEY/.test(gc) && !/localStorage\.setItem\(\s*CARD_ENTRY_DRAFT_KEY/.test(gc))
checa('grava ideia + MOTOR DE VERDADE (mode + aiEngine) + duração + hora', /serializeCardEntryDraft\(\{ prompt: clean, quality, duration, mode, engine: aiEngine, at: Date\.now\(\) \}\)/.test(gc))
checa('regrava a cada mudança dos cinco', /\}, \[prompt, quality, duration, mode, aiEngine\]\)/.test(gc))
checa('TTL de 45 minutos', /export const CARD_ENTRY_DRAFT_TTL_MS = 45 \* 60 \* 1000/.test(mod))

console.log('== a volta ==')
checa('só restaura com ?resume=card_entry', /searchParams\?\.get\('resume'\) !== 'card_entry'\) return/.test(gc))
checa('restaura ideia + quality + duração', /setPrompt\(draft\.prompt\)/.test(gc) && /setQuality\(draft\.quality\)/.test(gc) && /setDuration\(draft\.duration as Duration\)/.test(gc))
checa('restaura TAMBÉM o motor — o defeito que a r4 fechou', /setMode\(draft\.mode\)/.test(gc) && /setAiEngine\(draft\.engine\)/.test(gc))
checa('quality restaurada só se está no cardápio VIVO (não na lista legada)', /const DRAFT_QUALITIES: readonly DraftQuality\[\] = \['fast', 'basic', 'basic_ai', 'pro', 'cinematic_ai'\]/.test(mod))
checa('motor e modo restaurados só se existem no cardápio', /const DRAFT_MODES: readonly DraftMode\[\]/.test(mod) && /const DRAFT_ENGINES: readonly DraftEngine\[\]/.test(mod))
checa('duração restaurada só se é uma das 4', /const DRAFT_DURATIONS: readonly number\[\] = \[35, 45, 60, 90\]/.test(mod))
checa('campo ausente/inválido vira null e NÃO vira um chute', /if \(draft\.mode\) setMode/.test(gc) && /if \(draft\.engine\) setAiEngine/.test(gc))
checa('arma o disparo só com rascunho fresco', /resumeArmedRef\.current = draft\.fresh/.test(gc))

console.log('== o disparo ==')
checa('dispara só com saldo já lido', /if \(credits === null\) return/.test(gc))
checa('régua ÚNICA: pergunta ao mesmo caixa que o botão (outOfCredits)', /if \(outOfCredits\(\)\) \{/.test(gc) && !/if \(credits === null \|\| credits <= 0\) return/.test(gc))
checa('bloqueado por saldo, o rascunho FICA e o evento não mente', /card_entry_resume_blocked/.test(gc))
checa('dispara UMA vez (ref)', /if \(!resumeArmedRef\.current \|\| resumeFiredRef\.current\) return/.test(gc) && /resumeFiredRef\.current = true/.test(gc))
checa('não dispara por cima de um render em curso', /if \(!prompt\.trim\(\) \|\| isProcessingPhase\(phase\)\) return/.test(gc))
checa('apaga o rascunho ao disparar', /sessionStorage\.removeItem\(CARD_ENTRY_DRAFT_KEY\)/.test(gc))
checa('passa pela guarda de crédito da casa (handleGenerateGuarded)', /handleGenerateGuarded\(\)\n\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n\s*\}, \[credits, prompt, quality, duration, phase, mode, aiEngine\]\)/.test(gc))
checa('dois eventos: restaurado e disparado', /card_entry_resume_restored/.test(gc) && /card_entry_resume_autostart/.test(gc))
checa('os eventos dizem COM QUE MOTOR — senão não há denominador', /engine_restored/.test(gc) && /card_entry_resume_autostart', \{ quality, duration, credits, mode, engine: aiEngine \}/.test(gc))

console.log('== o /checkout/success ==')
checa('destino vira /studio/create?resume=card_entry quando há rascunho', /destination = '\/studio\/create\?resume=card_entry'/.test(sp))
checa('só quando o destino padrão era /studio (self-serve)', /if \(destination === '\/studio'\) \{/.test(sp))
checa('lê a MESMA chave, importada do dono', /sessionStorage\.getItem\(CARD_ENTRY_DRAFT_KEY\)/.test(sp) && /from '@\/lib\/growth\/cardEntryResumeDraft'/.test(sp))
checa('Autopilot não é desviado', /readyCheckoutSuccessDestination\(flow, accountPlan\)/.test(sp))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — a ideia E O MOTOR sobrevivem ao Stripe, e o filme dispara na volta')
