/**
 * SPRINT V1→V4 — rodada #26
 * "o ending_soon de quem JA fez video ganha o episodio 2 do proprio tema"
 *
 * Prova, sem subir servidor:
 *   A) o contrato do link de continuacao para a fonte NOVA (lifecycle_ending_email)
 *   B) o codigo da rota: helper parametrizado, fonte por e-mail, posicao no ramo
 *      certo, CTA de /pricing e assunto intactos, zero consulta nova
 *   C) a pista do Codex intacta (preco/plano/credito/cupom fora do bloco novo)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0
const fails = []
const check = (name, cond) => { if (cond) ok++; else fails.push(name) }

// ── replica FIEL de lib/seriesContinuation.ts (funcao pura, sem TS loader) ────
const MAX = 180
const normalize = (v) => (v ?? '').replace(/\s+/g, ' ').replace(/["“”]+/g, '').trim().slice(0, MAX)
const buildPrompt = (v) => {
  const seed = normalize(v)
  if (!seed) return ''
  return `Create the next episode in the same Short series about "${seed}". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.`
}
const buildUrl = (appUrl, value, source, utm = {}) => {
  const base = appUrl.replace(/\/+$/, '')
  const params = new URLSearchParams()
  const prompt = buildPrompt(value)
  if (prompt) {
    params.set('prompt', prompt)
    params.set('autoanalyze', '1')
    params.set('series', '1')
    params.set('continuation_source', source)
  }
  for (const [k, v] of Object.entries(utm)) if (v) params.set(k, v)
  const qs = params.toString()
  return qs ? `${base}/generate?${qs}` : `${base}/generate`
}
const escapeHtmlText = (v) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const APP = 'https://www.usekineo.com'
const CAMPAIGN = 'trial_ending_episode2'
const SOURCE = 'lifecycle_ending_email'
const UTM = {
  utm_source: 'lifecycle',
  utm_medium: 'email',
  utm_campaign: CAMPAIGN,
  intent_campaign: CAMPAIGN,
}

// ══ BLOCO A — contrato do link ════════════════════════════════════════════════
const u = buildUrl(APP, 'The lake that turns animals to stone', SOURCE, UTM)
check('A1 url absoluta', u.startsWith('https://www.usekineo.com/generate?'))
check('A2 leva prompt', u.includes('prompt='))
check('A3 autoanalyze=1', u.includes('autoanalyze=1'))
check('A4 series=1', u.includes('series=1'))
check('A5 fonte NOVA e a do ending', u.includes(`continuation_source=${SOURCE}`))
check('A6 fonte do loss NAO vaza aqui', !u.includes('lifecycle_loss_email'))
check('A7 utm_source', u.includes('utm_source=lifecycle'))
check('A8 utm_medium', u.includes('utm_medium=email'))
check('A9 utm_campaign proprio', u.includes(`utm_campaign=${CAMPAIGN}`))
check('A10 intent_campaign proprio', u.includes(`intent_campaign=${CAMPAIGN}`))
check('A11 campanha do loss nao vaza', !u.includes('trial_loss_episode2'))
check('A12 prompt carrega o tema', decodeURIComponent(u.replace(/\+/g, ' ')).includes('The lake that turns animals to stone'))
check('A13 prompt pede episodio novo', decodeURIComponent(u.replace(/\+/g, ' ')).includes('Do not repeat the previous episode'))

// fail-closed: 5 formas de tema vazio => sem prompt => sem bloco
for (const [i, bad] of [null, undefined, '', '   ', '""'].entries()) {
  const url = buildUrl(APP, bad, SOURCE, UTM)
  check(`A14.${i + 1} tema vazio nao vira episodio 2`, !url.includes('prompt='))
}
// tema hostil
const hostile = '<img src=x onerror=alert(1)> "Money" & co'
const hu = buildUrl(APP, hostile, SOURCE, UTM)
check('A15 tema hostil nao quebra a url', hu.includes('prompt=') && !hu.includes('<'))
const label = `Episode 2: ${normalize(hostile)}`
const esc = escapeHtmlText(label)
check('A16 label escapado sem <', !esc.includes('<'))
check('A17 label escapado sem >', !esc.includes('>'))
check('A18 label escapado sem aspas cruas', !esc.includes('"'))
check('A19 onerror neutralizado', esc.includes('&lt;img'))
check('A20 aspas do tema somem no normalize', !normalize(hostile).includes('"'))
// teto de 180
const longo = 'a'.repeat(500)
check('A21 teto de 180 no seed', normalize(longo).length === 180)
check('A22 url do tema longo ainda valida', buildUrl(APP, longo, SOURCE, UTM).includes('prompt='))
// href do html nao pode ter & cru
const href = hu.replace(/&/g, '&amp;')
check('A23 href sem & cru', !/&(?!amp;)/.test(href))
// as duas fontes produzem urls DIFERENTES (atribuicao separada)
const uLoss = buildUrl(APP, 'same topic', 'lifecycle_loss_email', { ...UTM, utm_campaign: 'trial_loss_episode2', intent_campaign: 'trial_loss_episode2' })
const uEnd = buildUrl(APP, 'same topic', SOURCE, UTM)
check('A24 mesmo tema, duas cartas, duas urls', uLoss !== uEnd)

// ══ BLOCO B — o codigo da rota ════════════════════════════════════════════════
const routePath = path.join(ROOT, 'app/api/cron/trial-lifecycle-emails/route.ts')
const route = fs.readFileSync(routePath, 'utf8')

check('B1 helper aceita a fonte como parametro', /function episodeTwoBlock\(\s*seed: string \| null,\s*campaign: string,\s*source: SeriesContinuationSource,/.test(route))
check('B2 helper usa a fonte recebida', route.includes('buildSeriesContinuationEmailUrl(APP_URL, tema, source, {'))
check('B3 fonte fixa do loss saiu do helper', !/buildSeriesContinuationEmailUrl\(APP_URL, tema, 'lifecycle_loss_email'/.test(route))
check('B4 tipo da fonte importado', /type SeriesContinuationSource,/.test(route))
check('B5 chamada do loss passa a fonte do loss', route.includes("episodeTwoBlock(c.lastTopic, 'trial_loss_episode2', 'lifecycle_loss_email', attr)"))
check('B6 chamada do ending passa a fonte do ending', route.includes("episodeTwoBlock(c.lastTopic, 'trial_ending_episode2', 'lifecycle_ending_email', attr)"))
// sprint-assinaturas #20: 3a chamada no corpo `burned_with_film` do downgraded_loss
check('B7 exatamente tres chamadas do helper', (route.match(/episodeTwoBlock\(c\.lastTopic/g) || []).length === 3)
check('B8 fail-closed continua no helper', route.includes("if (!url.includes('prompt=')) return null"))

// posicao: a chamada do ending esta DENTRO do if (c.kind === 'ending_soon')
const iEnding = route.indexOf("if (c.kind === 'ending_soon')")
const iLoss = route.indexOf("if (c.kind === 'downgraded_loss')")
const iCallEnd = route.indexOf("'trial_ending_episode2'")
const iCallLoss = route.indexOf("'trial_loss_episode2', 'lifecycle_loss_email'")
check('B9 os dois ramos existem', iEnding > 0 && iLoss > iEnding)
check('B10 bloco novo vive no ramo do ending_soon', iCallEnd > iEnding && iCallEnd < iLoss)
check('B11 bloco do loss segue no ramo do loss', iCallLoss > iLoss)

// o ramo do ending: CTA de /pricing intacto e ANTES do bloco novo
const endingBranch = route.slice(iEnding, iLoss)
check('B12 CTA Keep Creator intacto', endingBranch.includes("${cta(url, 'Keep Creator')}"))
const iCta = endingBranch.indexOf("${cta(url, 'Keep Creator')}")
const iEp2Html = endingBranch.indexOf('${ep2 ? `${ep2.html}')
check('B13 CTA de plano vem ANTES do episodio 2', iCta > 0 && iEp2Html > iCta)
check('B14 url do ramo continua /pricing', endingBranch.includes("`${APP_URL}/pricing?${utm('trial_ending')}`"))
check('B15 assunto do ramo nao foi tocado', endingBranch.includes('return { subject, text: `${text}${footerText}`, html }'))
check('B16 texto tambem ganhou o bloco', endingBranch.includes('${ep2 ? `\\n${ep2.text}\\n` : \'\'}'))
check('B17 free residual segue da fonte unica', endingBranch.includes('getFreeTierOffer().copy.residual'))

// os desvios anteriores continuam retornando antes (quem nunca usou nao chega aqui)
check('B18 desvio neverUsed intacto', endingBranch.includes('const neverUsed = c.creditsUsed <= 0'))
check('B19 desvio failedOnUs intacto', endingBranch.includes('if (c.failedOnUs) {'))
check('B20 bloco novo depois dos dois desvios', iCallEnd > iEnding + endingBranch.indexOf('const neverUsed'))

// zero consulta nova: lastTopic continua vindo do laco que ja pagina videos
check('B21 lastTopic ainda e campo do Candidate', /lastTopic: string \| null/.test(route))
check('B22 colheita segue no select unico de videos', route.includes("select('user_id, topic, created_at')"))
check('B23 nenhum novo .from(', (route.match(/\.from\('videos'\)/g) || []).length === 1)

// ══ BLOCO C — a pista do Codex intacta ═══════════════════════════════════════
const iEp2Start = route.indexOf('function episodeTwoBlock')
const helper = route.slice(iEp2Start, route.indexOf('function escapeHtmlText'))
const proibidas = ['price', 'pricing', 'plan', 'credit', 'coupon', 'promo', 'discount', 'free', 'upgrade', 'subscribe', 'checkout']
// so o TEXTO que sai no e-mail (linhas de copy), nao os comentarios
const copy = helper.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
for (const w of proibidas) {
  check(`C-${w} fora da copy do bloco novo`, !copy.toLowerCase().includes(w.toLowerCase()))
}
check('C-nenhum valor em dinheiro na copy', !/\$\s?\d/.test(copy))
check('C-ramo do ending sem stripe', !endingBranch.toLowerCase().includes('stripe'))
check('C-ramo do ending sem promo/cupom', !/COMEBACK|promo=/.test(endingBranch))
const seriesFile = fs.readFileSync(path.join(ROOT, 'lib/seriesContinuation.ts'), 'utf8')
check('C-fonte nova declarada', seriesFile.includes("| 'lifecycle_ending_email'"))
check('C-fonte antiga preservada', seriesFile.includes("| 'lifecycle_loss_email'"))
check('C-nenhuma fonte removida', (seriesFile.match(/^\s*\| '/gm) || []).length >= 12)

console.log(`\n${ok} verificacoes ok, ${fails.length} falhas`)
if (fails.length) { console.log(fails.map((f) => ' ✗ ' + f).join('\n')); process.exit(1) }
console.log('✅ rodada #26: o ending_soon de quem ja fez video passa a oferecer o episodio 2 do proprio tema\n')
