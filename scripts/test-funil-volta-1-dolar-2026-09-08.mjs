// KINEO-VERSAO-B-FUNIL-VOLTA-2026-09-08 — guardião: a ideia sobrevive ao Stripe e o filme dispara na volta.
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

console.log('== o rascunho ==')
checa('chave única do rascunho', /const STUDIO_DRAFT_KEY = 'kineo_studio_draft_v1'/.test(gc))
checa('rascunho vive em sessionStorage (morre com a aba), nunca localStorage', /sessionStorage\.setItem\(STUDIO_DRAFT_KEY/.test(gc) && !/localStorage\.setItem\(STUDIO_DRAFT_KEY/.test(gc))
checa('grava ideia + motor + duração + hora', /JSON\.stringify\(\{ prompt: clean, quality, duration, at: Date\.now\(\) \}\)/.test(gc))
checa('regrava a cada mudança dos três', /\}, \[prompt, quality, duration\]\)/.test(gc))
checa('TTL de 45 minutos', /const STUDIO_DRAFT_TTL_MS = 45 \* 60 \* 1000/.test(gc))

console.log('== a volta ==')
checa('só restaura com ?resume=card_entry', /searchParams\?\.get\('resume'\) !== 'card_entry'\) return/.test(gc))
checa('restaura os três campos', /setPrompt\(cleanDraft\)/.test(gc) && /setQuality\(draft\.quality\)/.test(gc) && /setDuration\(draft\.duration\)/.test(gc))
checa('motor restaurado só se existe no cardápio', /QUALITY_OPTIONS\.some\(\(q\) => q\.key === draft\.quality\)/.test(gc))
checa('duração restaurada só se é uma das 4', /\[35, 45, 60, 90\] as number\[\]\)\.includes\(draft\.duration\)/.test(gc))
checa('arma o disparo só com rascunho fresco', /resumeArmedRef\.current = Boolean\(cleanDraft\) && fresh/.test(gc))

console.log('== o disparo ==')
checa('dispara só com crédito confirmado (> 0)', /if \(credits === null \|\| credits <= 0\) return/.test(gc))
checa('dispara UMA vez (ref)', /if \(!resumeArmedRef\.current \|\| resumeFiredRef\.current\) return/.test(gc) && /resumeFiredRef\.current = true/.test(gc))
checa('não dispara por cima de um render em curso', /if \(!prompt\.trim\(\) \|\| isProcessingPhase\(phase\)\) return/.test(gc))
checa('apaga o rascunho ao disparar', /sessionStorage\.removeItem\(STUDIO_DRAFT_KEY\)/.test(gc))
checa('passa pela guarda de crédito da casa (handleGenerateGuarded)', /handleGenerateGuarded\(\)\n\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n\s*\}, \[credits, prompt, quality, duration, phase\]\)/.test(gc))
checa('dois eventos: restaurado e disparado', /card_entry_resume_restored/.test(gc) && /card_entry_resume_autostart/.test(gc))

console.log('== o /checkout/success ==')
checa('destino vira /studio/create?resume=card_entry quando há rascunho', /destination = '\/studio\/create\?resume=card_entry'/.test(sp))
checa('só quando o destino padrão era /studio (self-serve)', /if \(destination === '\/studio'\) \{/.test(sp))
checa('lê a MESMA chave', /sessionStorage\.getItem\('kineo_studio_draft_v1'\)/.test(sp))
checa('Autopilot não é desviado', /readyCheckoutSuccessDestination\(flow, accountPlan\)/.test(sp))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — a ideia sobrevive ao Stripe e o filme dispara na volta')
