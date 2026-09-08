// Tarefas 5 (carta D+1 da porta) e 6 (trilhos por país) — guardião.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

console.log('== 5. a carta D+1 ==')
const r = rd('app/api/admin/send-card-entry-d1/route.ts')
checa('dry-run por padrão; SEND só com confirm', /const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(r) && /mode: 'DRY_RUN'/.test(r))
checa('só admin ou cron com CRON_SECRET (fail-closed)', /if \(!cronSecret\) return false/.test(r) && /ADMIN_EMAILS\.has\(adminEmail\)/.test(r))
checa('carimbo 1× por pessoa e registrado no catálogo de lifecycle', /const STAMP = 'card_entry_d1_sent'/.test(r) && /'card_entry_d1_sent',/.test(rd('lib/lifecycle/emailEvents.ts')))
checa('supressão de 24h e descadastro', /loadLifecycleSuppression\(/.test(r) && /unsubscribeHeaders\(a\.id\)/.test(r) && /emailFooterText\(p\.id\)/.test(r))
checa('contas internas e os 4 proibidos fora', /isInternalEmail\(email\) \|\| proibido\(email\)/.test(r) && /'den\.higgins', 'noelrss21', 'emiliomontinari', 'akajitin'/.test(r))
checa('lote máximo 30 e pausa entre envios', /const MAX_BATCH = 30/.test(r) && /setTimeout\(r, 600\)/.test(r))
checa('só existe sob a versão B', /if \(!CARD_ENTRY_ONLY\) return NextResponse\.json\(\{ error: 'card_entry_off'/.test(r))
checa('preço nunca digitado (fonte única)', /trialEntryFeeLabel\(\{ compact: true \}\)/.test(r) && /trialEntryFullPromise\(CARD_TRIAL_DAYS\)/.test(r) && !/\$1\b|\$19\b/.test(r.replace(/\/\/[^\n]*/g, '')))
checa('link do checkout é o trial do Creator com campanha própria', /tier=basic&billing=monthly&trial=1/.test(r) && /const CAMPAIGN = 'card_entry_d1'/.test(r))
checa('a carta faz UMA pergunta e vai para o fundador', /hit reply and tell me/.test(r) && /const REPLY_TO = 'joseph@usekineo\.com'/.test(r))
checa('quem bateu na porta ao gerar vem primeiro', /Number\(b\.hitPaywall\) - Number\(a\.hitPaywall\)/.test(r))
// a elegibilidade executada (função pura extraída do arquivo)
const fnSrc = r.match(/export function isCardEntryD1Eligible\([\s\S]*?\n\}/)[0]
const body = fnSrc.replace(/^export function isCardEntryD1Eligible\([\s\S]*?\): boolean \{/, '').replace(/\n\}$/, '')
const elig = new Function('p', 'now', 'CARD_ENTRY_TRIAL_STATUS', 'PAID_PLANS', 'MIN_AGE_MS', 'MAX_AGE_MS', body)
const H = 60 * 60 * 1000
const now = Date.now()
const PAID = new Set(['starter', 'basic', 'pro', 'basic_trial'])
const call = (p) => elig(p, now, 'card_required', PAID, 20 * H, 7 * 24 * H)
const base = { trial_status: 'card_required', has_paid: false, plan: 'free', video_credits: 0, email_opted_out: false, created_at: new Date(now - 30 * H).toISOString() }
checa('elegível: nasceu na porta, 30h, sem pagar, 0 crédito', call(base) === true)
checa('NÃO: 10h de idade (cedo demais)', call({ ...base, created_at: new Date(now - 10 * H).toISOString() }) === false)
checa('NÃO: 8 dias (velho demais)', call({ ...base, created_at: new Date(now - 8 * 24 * H).toISOString() }) === false)
checa('NÃO: já pagou', call({ ...base, has_paid: true }) === false)
checa('NÃO: está no trial de $1', call({ ...base, plan: 'basic_trial' }) === false)
checa('NÃO: tem crédito', call({ ...base, video_credits: 5 }) === false)
checa('NÃO: descadastrado', call({ ...base, email_opted_out: true }) === false)
checa('NÃO: conta antiga sem carimbo', call({ ...base, trial_status: null }) === false)

console.log('== 6. trilhos por país ==')
const geo = rd('app/api/geo/route.ts')
checa('/api/geo só anuncia UPI/Pix com o trilho AO VIVO', /const local_method = dodoMode\(\) === 'live' \? planned : null/.test(geo))
checa('/api/geo expõe o método planejado e rail_live', /local_method_planned, rail_live: local_method !== null/.test(geo))
const dodo = rd('lib/dodo.ts')
checa('mapa país→método: IN=upi, BR=pix', /IN: 'upi',\n\s*BR: 'pix',/.test(dodo))
checa('modo test recusa quem não é interno no checkout do Dodo', /if \(mode === 'test' && !isInternalEmail\(user\.email\)\)/.test(rd('app/api/dodo/checkout/route.ts')))
const ban = rd('components/CardEntryBanner.tsx')
checa('a faixa diz "cartão por enquanto — UPI/Pix em breve" só quando planejado e não ao vivo', /if \(typeof data\.local_method_planned === 'string' && data\.rail_live !== true\) setPlannedRail\(data\.local_method_planned\)/.test(ban) && /International Visa\/Mastercard for now/.test(ban))
checa('a nota não promete data', !/next week|tomorrow|this week/i.test(ban))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — carta D+1 pronta em dry-run; vitrine só oferece trilho que o cobrador aceita')
