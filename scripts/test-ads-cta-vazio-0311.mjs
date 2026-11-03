// KINEO-ADS-CTA-VAZIO-0311 — /ads/v2 (modo escolha) envia cta:'' quando o cliente pula o campo opcional
// "Call to action"; cenaInput() recusava com cena_bad_cta e ninguém via o roteiro. Vazio/só espaços = sem CTA.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const PLAN = 'lib/ads/cena/plan.ts'
const load = (source = null) => createOfflineLoader({ evaluationTimeoutMs: 30_000, ...(source ? { source } : {}) })(PLAN)
const P = load()

// 1) O front realmente nasce com cta:'' e espalha o form inteiro no corpo do /plan.
const front = readFileSync('app/(dashboard)/ads/v2/AdsV2Escolha.tsx', 'utf8')
assert.match(front, /useState<Form>\(\{[^}]*cta: ''/, 'front: Call to action começa vazio')
assert.match(front, /action === 'plan' \? \{ stage: action, \.\.\.form,/, 'front: corpo do plan leva ...form (cta incluso)')

// 2) Corpo REAL do front (form padrão + foto + frase), como internalEscolha repassa ao cenaInput.
const form = { foto: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/ads/p.jpg', frase: 'Garrafa térmica Kineo 500 ml, mantém gelado por 24 horas', oferta: '', beneficios: '', cta: '', language: 'pt', formato: 'product', voice_mode: 'narrated', rota: '', presenter_id: 'p1', category: '', scenario_id: 's1' }
const body = { stage: 'plan', ...form, sample: false, voice_mode: 'narrated', beneficios: [], rota: 'kling3' }
const real = P.cenaInput({ ...body, voice_mode: 'narrated', actorUrl: 'https://www.usekineo.com/presenters/p1.jpg' })
assert.equal('cta' in real, false, 'caso real: cta vazio vira ausente (sem CTA)')
assert.equal(real.frase, form.frase)

// 3) Controles.
const base = { foto: form.foto, frase: form.frase }
assert.equal('cta' in P.cenaInput({ ...base, cta: '   \n\t ' }), false, 'só espaços = sem CTA')
assert.equal('cta' in P.cenaInput(base), false, 'ausente continua sem CTA')
assert.equal(P.cenaInput({ ...base, cta: '  Peça já  pelo link ' }).cta, 'Peça já pelo link', 'CTA digitado é limpo e preservado')
assert.throws(() => P.cenaInput({ ...base, cta: 42 }), /cena_bad_cta/, 'não-string continua recusado')
assert.throws(() => P.cenaInput({ ...base, cta: null }), /cena_bad_cta/, 'null continua recusado')
assert.throws(() => P.cenaInput({ ...base, cta: 'x'.repeat(301) }), /cena_bad_cta/, '>300 continua recusado')
assert.equal(P.cenaInput({ ...base, cta: 'x'.repeat(300) }).cta.length, 300, '300 ainda cabe')
assert.equal(P.cenaInput({ ...base, oferta: '' }).oferta, '', 'oferta vazia segue aceita (já era)')
assert.throws(() => P.cenaInput({ ...base, frase: '' }), /cena_bad_photo_or_sentence/, 'campo obrigatório continua obrigatório')

// 4) Mutante: a regra antiga tem que quebrar o caso real (o teste pega a regressão).
const old = load((rel, s) => rel === PLAN ? s.replace("(typeof b.cta !== 'string' || b.cta.length > 300)", "(typeof b.cta !== 'string' || !clean(b.cta) || b.cta.length > 300)") : s)
assert.throws(() => old.cenaInput({ ...base, cta: '' }), /cena_bad_cta/, 'mutante (regra antiga) recusa o caso real')

// 5) KINEO-ADS-CTA-VAZIO-0311b — recibo exato para os guardiões históricos de plan.ts: desfazer devolve a base 431d5622c byte a byte;
// qualquer edição a mais em plan.ts continua reprovando no guardião 2910 (o recibo não vira passe-livre).
const { semAdsCtaVazio0311 } = await import('./test-support/desfaz-ads-cta-vazio-0311.mjs')
const { semQualidadeElenco2910 } = await import('./test-support/desfaz-qualidade-elenco-2910.mjs')
const { execFileSync } = await import('node:child_process')
const lfx = t => t.replace(/\r\n/g, '\n'), agora = readFileSync(PLAN, 'utf8')
assert.equal(lfx(semAdsCtaVazio0311(agora, PLAN)), lfx(execFileSync('git', ['show', '431d5622cf6d34159bccd2aac8bf8514a72eb3f7:' + PLAN], { encoding: 'utf8' })), 'recibo devolve a base exata')
assert.doesNotThrow(() => semQualidadeElenco2910(agora, PLAN), 'guardião 2910 aceita plan.ts de hoje')
assert.throws(() => semQualidadeElenco2910(agora.replace('cena_bad_cta', 'cena_bad_ctx'), PLAN), /fonte divergente/, 'edição desconhecida em plan.ts continua reprovando')

console.log('PASS test-ads-cta-vazio-0311 (caso real + 9 controles + mutante + recibo)')
