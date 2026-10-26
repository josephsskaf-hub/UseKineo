// KINEO-PRIVACIDADE-PLUGIN-2610 — guardião da política de privacidade completa.
// Motivo: a OpenAI recusou o plugin "Kineo Script Studio" em 21/10/2026 porque a política não informava claramente
// "dados coletados, finalidades, destinatários, retenção e controles de usuário" nem as entradas/saídas das ferramentas.
//   A. as 5 seções que a revisão exige existem, com título fixo;
//   B. os destinatários são NOMEADOS (OpenAI, fal.ai, ElevenLabs, Creatomate, Stripe, Supabase, Vercel, Resend, Google);
//   C. a seção do plugin/conector lista entradas, saídas e o que nunca recebemos;
//   D. honestidade: não promete botão de apagar vídeo (não existe) nem prazo de armazenamento por plano;
//   E. a seção de cookies (KINEO-CONSENTIMENTO-1610) continua intacta;
//   F. desfaz exato + mutante.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { semPrivacidadePlugin2610 as desfaz, PRIVACIDADE_PLUGIN_2610_BASE as BASE } from './test-support/desfaz-privacidade-plugin-2610.mjs'

const F = 'app/privacy/page.tsx'
const lf = (t) => t.replace(/\r\n/g, '\n')
const src = lf(fs.readFileSync(F, 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

const titulos = ['What we collect', 'Why we use it', 'Who receives it', 'How long we keep it', 'Your controls and rights',
  'What the ChatGPT plugin and Claude connector receive and return', 'Who we are', 'Security', 'Children', 'Changes to this policy']
for (const t of titulos) checa(`A seção "${t}"`, src.includes(`title="${t}"`))

for (const p of ['OpenAI', 'fal.ai', 'ElevenLabs', 'Creatomate', 'Stripe', 'Supabase', 'Vercel', 'Resend', 'Google (YouTube)', 'Pixabay and Pexels'])
  checa(`B destinatário nomeado: ${p}`, src.includes(`<strong>${p}</strong>`))
checa('B não volta ao genérico "AI/stock providers"', !src.includes('AI/stock'))

const plugin = src.slice(src.indexOf('title="What the ChatGPT plugin'), src.indexOf('title="Why we use it"'))
checa('C entradas do plugin', plugin.includes('<strong>Inputs</strong>') && /idea or a script/.test(plugin))
checa('C saídas do plugin', plugin.includes('<strong>Outputs</strong>') && /job ID/.test(plugin))
checa('C o que nunca recebemos', plugin.includes('<strong>What we never receive</strong>') && /chat history/.test(plugin))

checa('D não promete apagar vídeo pelo app', !/Delete (your )?videos/i.test(src))
checa('D sem prazo de armazenamento por plano', !/\b(14|90)-day storage\b/.test(src))
checa('D retenção diz 30 dias após pedido/apagar', /within 30 days, including backups/.test(src))

checa('E cookies intacto', src.includes('<section id="cookies"') && src.includes('Microsoft Clarity (session') && src.includes('<strong>Affiliate</strong>: Rewardful and'))

const base = lf(execFileSync('git', ['show', `${BASE}:${F}`], { encoding: 'utf8' }))
checa(`F desfaz = base (${BASE.slice(0, 9)})`, lf(desfaz(src, F)) === base)
checa('F idempotente', lf(desfaz(base, F)) === base)
let lancou = false
try { desfaz(src.replace('<strong>Inputs</strong>', '<strong>Entradas</strong>'), F) } catch { lancou = true }
checa('M1 mudança dentro da camada não é engolida pelo desfaz', lancou)

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
