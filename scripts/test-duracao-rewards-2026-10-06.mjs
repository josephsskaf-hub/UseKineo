// KINEO-DURACAO-REWARDS-2026-10-06 — guardião da ferramenta grátis /tiktok-creator-rewards-length-checker
// ("seu roteiro tem duração para as recompensas do TikTok?", aposta C do fundador, sprint 06/10).
// O que ele prova — tudo EXECUTADO, não lido:
//   1. A RÉGUA É A DA CASA: roda lib/speechRate.ts `speechSecondsOfScript` (o original; os imports '@/' são resolvidos
//      por um carregador mínimo para os arquivos de lib/) e o espelho de lib/growth/duracaoRewards.ts no mesmo corpus —
//      segundos, ritmo e narração IGUAIS (===) nas famílias clássica (3,1) e hollywood (2,3), com e sem `speed:`.
//   2. 1 minuto e palavras faltantes certos nos 3 roteiros de exemplo (números cravados) e coerentes de 1 a 400 palavras
//      (alcança ⇔ faltam 0 ⇔ palavras ≥ as de 1:00), com o critério "at least 1 minute" (≥ 60 s) dos termos do TikTok.
//   3. Fonte oficial citada com data: a página RENDERIZADA (react-dom/server) traz o link dos termos do TikTok, a data
//      de atualização e a data da consulta na resposta direta, na tabela e na lista de fontes; só domínios oficiais.
//   4. Nenhuma promessa de "qualifies"/garantia de ganho no texto que a pessoa lê (página, resultados, llms.txt).
//   5. CTA: /studio com o roteiro palavra por palavra, 60 s, intent_campaign=tool_duracao_rewards, sem gatilho de
//      auto-start; o clique guarda a campanha de cadastro (rememberSignupCampaign) e não manda o texto; nada sai do
//      navegador enquanto a pessoa confere (sem fetch, sem efeito, sem evento por tecla).
//   6. Superfície: rota no sitemap e no llms.txt (números e datas do llms = os da lib); tema só por tokens (claro/escuro)
//      e regras de 390 px.
//   Cada bloco tem mutantes em memória que PRECISAM ficar vermelhos.
// Só readFileSync + typescript + vm (+ react-dom/server para renderizar) — sem alias @/ no guardião, sem rede, sem banco.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
const ts = require('typescript')
const React = require('react')
const jsxRuntime = require('react/jsx-runtime')
const { renderToStaticMarkup } = require('react-dom/server')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }

const LIB = 'lib/growth/duracaoRewards.ts'
const PAGE = 'app/tiktok-creator-rewards-length-checker/page.tsx'
const CLIENT = 'app/tiktok-creator-rewards-length-checker/RewardsLengthClient.tsx'
const CAMPAIGN = 'tool_duracao_rewards'
const ROUTE = '/tiktok-creator-rewards-length-checker'

// ── carregador mínimo: transpila TS/TSX e resolve só caminhos relativos, '@/lib/…' e os stubs declarados ──────────────
function carrega(arquivo, sobrescritas = {}, chamadas = []) {
  const cache = new Map()
  const stubs = {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    'next/link': { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { href: String(href), ...rest }, children) },
    '@/components/Footer': { __esModule: true, default: () => null },
    '@/lib/analytics': {
      rememberSignupCampaign: (v) => { chamadas.push(['rememberSignupCampaign', v]) },
      trackEvent: (n, m) => { chamadas.push(['trackEvent', n, m]); return Promise.resolve(true) },
    },
  }
  const existe = (f) => sobrescritas[f] !== undefined || existsSync(join(root, f))
  const resolve = (base) => {
    for (const ext of ['', '.tsx', '.ts']) if (/\.tsx?$/.test(base + ext) && existe(base + ext)) return base + ext
    throw new Error(`não achei ${base}`)
  }
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const src = sobrescritas[file] ?? rd(file)
    const js = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: file,
    }).outputText
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('@/lib/')) return load(resolve(spec.slice(2)))
      if (spec.startsWith('.')) return load(resolve(join(dirname(file), spec).replace(/\\/g, '/')))
      throw new Error(`import inesperado em ${file}: ${spec}`)
    }
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, process: { env: {} }, console, URLSearchParams, URL })
    return mod.exports
  }
  return load(arquivo)
}

const palavras = (n, w = 'word') => Array(n).fill(w).join(' ')
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const textoDe = (html) => decode(html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const hrefs = (html) => [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => decode(m[1]))
// Promessa proibida: dizer que o vídeo "se qualifica" ou garantir ganho. Critério de duração é permitido.
const PROMESSA = /qualif|guarantee|\bwill (earn|get paid|be paid|be monetized|make money)\b|\byou(?:'re| are) eligible\b/i

// ═══ 1. a régua é a da casa ════════════════════════════════════════════════════════════════════════════════════
console.log('1. régua da casa (lib/speechRate.ts speechSecondsOfScript) × espelho (lib/growth/duracaoRewards.ts)')
const CORPUS = (dr) => [
  ...dr.REWARDS_EXAMPLES.map((e) => e.script),
  '',
  '   ',
  'HOOK\n[B-roll: storm]\nPAYOFF',
  palavras(137), palavras(138), palavras(139), palavras(185), palavras(186), palavras(187),
  `speed: 1.2\n${palavras(150)}`,
  `speed: 0.8\n${palavras(150)}`,
  `speed: 1.15\n${palavras(223)}`,
  '**Hook:** Did you know octopuses have three hearts?\n\n- They have blue blood.\n- Two hearts pump blood to the gills.\n\n## Payoff\nThe third heart stops when they swim.',
  '- only a bullet\n- and another bullet line',
  'THE OCTOPUS HAS THREE HEARTS\nAnd blue blood.',
  'Visual: city at night\nThe city never sleeps. [pause] Narrator: the lights stay on.',
  palavras(620, 'longword'),
]
function auditaRegua(casa, dr) {
  const r = []
  if (JSON.stringify(casa.SPEECH_RATE_BASE) !== JSON.stringify(dr.REWARDS_RATE_BASE)) r.push('SPEECH_RATE_BASE ≠ espelho')
  if (casa.speechFamilyForQuality('seedance') !== 'classic' || casa.speechFamilyForQuality('fast') !== 'classic') r.push('Seedance/Kineo 1 não são da família clássica')
  if (casa.speechFamilyForQuality('hollywood') !== 'hollywood' || casa.speechFamilyForQuality('h3') !== 'hollywood') r.push('Kling 3/H3 não são hollywood')
  for (const s of CORPUS(dr)) {
    const v = dr.checkRewardsLength(s)
    const c = casa.speechSecondsOfScript('seedance', s)
    const h = casa.speechSecondsOfScript('hollywood', s)
    const tag = JSON.stringify(s.slice(0, 24))
    if (v.brisk.wordsPerSecond !== c.rate.wordsPerSecond) r.push(`ritmo rápido ${v.brisk.wordsPerSecond} ≠ casa ${c.rate.wordsPerSecond} em ${tag}`)
    if (v.calm.wordsPerSecond !== h.rate.wordsPerSecond) r.push(`ritmo calmo ${v.calm.wordsPerSecond} ≠ casa ${h.rate.wordsPerSecond} em ${tag}`)
    if (v.brisk.seconds !== c.seconds) r.push(`segundos (rápido) ${v.brisk.seconds} ≠ casa ${c.seconds} em ${tag}`)
    if (v.calm.seconds !== h.seconds) r.push(`segundos (calmo) ${v.calm.seconds} ≠ casa ${h.seconds} em ${tag}`)
    if (v.narratedWords > 0 && v.narration !== c.narration) r.push(`narração ≠ casa em ${tag}`)
    if (Math.abs(v.narratedWords / c.rate.wordsPerSecond - c.seconds) > 1e-6) r.push(`palavras narradas (${v.narratedWords}) não reproduzem os segundos da casa em ${tag}`)
  }
  return r
}
const casa = carrega('lib/speechRate.ts')
const dr = carrega(LIB)
const reguaFalhas = auditaRegua(casa, dr)
checa('espelho = régua da casa em ' + CORPUS(dr).length + ' textos (segundos, ritmo e narração ===)' + (reguaFalhas.length ? ` — ${reguaFalhas.slice(0, 3).join(' | ')}` : ''), reguaFalhas.length === 0)
checa('régua base da casa = { classic: 3.1, hollywood: 2.3 }', casa.SPEECH_RATE_BASE.classic === 3.1 && casa.SPEECH_RATE_BASE.hollywood === 2.3)
const libSrc = rd(LIB)
checa('bloco MIRROR delimitado no espelho', /\/\/ ═══ MIRROR: lib\/speechRate\.ts/.test(libSrc) && /\/\/ ═══ END MIRROR ═══/.test(libSrc))
// imports de uma ou várias linhas (`import {\n a,\n b,\n} from '…'`), na ordem em que aparecem
const importsDe = (src) => [...src.matchAll(/^import\s[\s\S]*?\bfrom\s+'([^']+)'/gm)].map((m) => m[1])
checa("lib pura: só importa '../narrationFit', '../scriptParser' e '../analyzeLimits'", JSON.stringify(importsDe(libSrc)) === JSON.stringify(['../narrationFit', '../scriptParser', '../analyzeLimits']))
checa('as três dependências não importam nada (nenhum import de servidor chega à página)', ['lib/narrationFit.ts', 'lib/scriptParser.ts', 'lib/analyzeLimits.ts'].every((f) => !/^\s*import\s/m.test(rd(f)) && !/\brequire\(/.test(rd(f))))
checa('lib sem process.env/node:/server-only', !/process\.env|from 'node:|server-only/.test(libSrc))
// mutantes da régua
const speechSrc = rd('lib/speechRate.ts')
const casaMut = speechSrc.replace('{ classic: 3.1, hollywood: 2.3 }', '{ classic: 3.0, hollywood: 2.3 }')
checa('mutante: a casa muda a régua clássica (3,1→3,0) → o espelho fica vermelho', casaMut !== speechSrc && auditaRegua(carrega('lib/speechRate.ts', { 'lib/speechRate.ts': casaMut }), dr).length > 0)
const semEscala = libSrc.replace('return base * (WORDS_PER_SECOND / wordsPerSecond)', 'return base')
checa('mutante: espelho sem a escala de narrationFitAt → vermelho', semEscala !== libSrc && auditaRegua(casa, carrega(LIB, { [LIB]: semEscala })).length > 0)
const semVelocidade = libSrc.replace('return Math.round(REWARDS_RATE_BASE[family] * s * 100) / 100', 'return Math.round(REWARDS_RATE_BASE[family] * 100) / 100')
checa('mutante: espelho ignora `speed:` → vermelho', semVelocidade !== libSrc && auditaRegua(casa, carrega(LIB, { [LIB]: semVelocidade })).length > 0)
const semArredondar = libSrc.replace('return Math.round(REWARDS_RATE_BASE[family] * s * 100) / 100', 'return REWARDS_RATE_BASE[family] * s')
checa('mutante: espelho sem o arredondamento a 0,01 de speechRateFor → vermelho', semArredondar !== libSrc && auditaRegua(casa, carrega(LIB, { [LIB]: semArredondar })).length > 0)
const semFallback = libSrc.replace('const narration = parseUserScript(original).narration || original', 'const narration = parseUserScript(original).narration')
checa('mutante: espelho sem o "|| texto" da narração → vermelho', semFallback !== libSrc && auditaRegua(casa, carrega(LIB, { [LIB]: semFallback })).length > 0)

// ═══ 2. 1:00 e palavras faltantes ══════════════════════════════════════════════════════════════════════════════
console.log('2. 1 minuto ("at least 1 minute") e palavras que faltam')
const ESPERADO = {
  short: { narrated: 85, ignored: 0, brisk: ['0:27', false, 101], calm: ['0:36', false, 53] },
  close: { narrated: 155, ignored: 14, brisk: ['0:50', false, 31], calm: ['1:07', true, 0] },
  ready: { narrated: 197, ignored: 0, brisk: ['1:03', true, 0], calm: ['1:25', true, 0] },
}
function auditaMinuto(d) {
  const r = []
  const um = d.wordsForOneMinute()
  if (um.brisk !== 186 || um.calm !== 138) r.push(`1:00 = ${um.brisk}/${um.calm} palavras (esperado 186/138)`)
  if (d.REWARDS_MIN_SECONDS !== 60) r.push('piso ≠ 60 s')
  if (d.REWARDS_EXAMPLES.length !== 3) r.push('não são 3 exemplos')
  for (const ex of d.REWARDS_EXAMPLES) {
    const e = ESPERADO[ex.id]
    const v = d.checkRewardsLength(ex.script)
    if (!e) { r.push(`exemplo desconhecido ${ex.id}`); continue }
    if (v.status !== 'checked' || v.narratedWords !== e.narrated || v.ignoredWords !== e.ignored) r.push(`${ex.id}: ${v.narratedWords} narradas/${v.ignoredWords} ignoradas (esperado ${e.narrated}/${e.ignored})`)
    for (const k of ['brisk', 'calm']) {
      const got = [d.formatClock(v[k].seconds), v[k].reaches, v[k].missingWords]
      if (JSON.stringify(got) !== JSON.stringify(e[k])) r.push(`${ex.id}.${k}: ${JSON.stringify(got)} (esperado ${JSON.stringify(e[k])})`)
      if (v[k].missingWords !== Math.max(0, v[k].wordsToReach - v.narratedWords)) r.push(`${ex.id}.${k}: faltam ≠ (1:00 − narradas)`)
    }
  }
  // coerência de 1 a 400 palavras, com e sem `speed:` (≥ 60 s: 186 a 3,1 alcança; 185 não)
  for (const pre of ['', 'speed: 1.2\n', 'speed: 0.7\n']) {
    for (let w = 1; w <= 400; w += 1) {
      const v = d.checkRewardsLength(pre + palavras(w))
      for (const k of ['brisk', 'calm']) {
        const x = v[k]
        const alcanca = w >= x.wordsToReach
        if (x.reaches !== alcanca || (x.missingWords === 0) !== x.reaches || (!x.reaches && x.missingWords !== x.wordsToReach - w)) { r.push(`incoerente: ${JSON.stringify(pre)}${w} palavras, ${k}`); break }
        if (x.reaches !== (x.seconds + 1e-9 >= 60)) { r.push(`alcança ≠ segundos ≥ 60 em ${w} (${k})`); break }
      }
      if (r.length > 12) return r
    }
  }
  const borda = d.checkRewardsLength(palavras(186))
  if (!borda.brisk.reaches || d.formatClock(borda.brisk.seconds) !== '1:00') r.push('186 palavras a 3,1 = 60 s tem de alcançar (≥ 60, não > 60)')
  if (d.checkRewardsLength(palavras(185)).brisk.reaches) r.push('185 palavras a 3,1 (59,7 s) não alcança')
  if (d.formatClock(59.7) !== '0:59') r.push('59,7 s não pode aparecer como 1:00')
  if (d.checkRewardsLength('HOOK\n[B-roll: storm]\nPAYOFF').status !== 'no_narration') r.push('só rótulos e direções = sem narração')
  if (d.checkRewardsLength('  ').status !== 'empty') r.push('vazio tem estado próprio')
  if (!d.checkRewardsLength(palavras(420)).calm.overShortFormMax || d.checkRewardsLength(palavras(400)).calm.overShortFormMax) r.push('aviso de 3:00 (420 palavras a 2,3 = 182,6 s sim; 400 = 173,9 s não)')
  return r
}
const minutoFalhas = auditaMinuto(dr)
checa('3 exemplos + 1..400 palavras (com e sem speed:) coerentes com ≥ 60 s' + (minutoFalhas.length ? ` — ${minutoFalhas.slice(0, 3).join(' | ')}` : ''), minutoFalhas.length === 0)
const estrito = libSrc.replace('const reaches = seconds + EPS >= REWARDS_MIN_SECONDS', 'const reaches = seconds > REWARDS_MIN_SECONDS')
checa('mutante: critério vira "mais de 1 minuto" (> 60) → vermelho (os termos dizem "at least")', estrito !== libSrc && auditaMinuto(carrega(LIB, { [LIB]: estrito })).length > 0)
const piso = libSrc.replace('return Math.max(0, Math.ceil(seconds * wordsPerSecond - EPS))', 'return Math.max(0, Math.floor(seconds * wordsPerSecond))')
checa('mutante: palavras de 1:00 com floor → vermelho', piso !== libSrc && auditaMinuto(carrega(LIB, { [LIB]: piso })).length > 0)
const arredondaRelogio = libSrc.replace('const total = Math.max(0, Math.floor((Number.isFinite(seconds) ? seconds : 0) + EPS))', 'const total = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0))')
checa('mutante: relógio arredondado para cima (59,7 → 1:00) → vermelho', arredondaRelogio !== libSrc && auditaMinuto(carrega(LIB, { [LIB]: arredondaRelogio })).length > 0)

// ═══ 3 + 4. página renderizada: fonte oficial com data, sem promessa ═════════════════════════════════════════════════
console.log('3-4. página renderizada: fonte oficial com data · nenhuma promessa de "qualifies"')
const OFICIAIS = new Set(['www.tiktok.com', 'newsroom.tiktok.com', 'support.google.com', 'about.instagram.com'])
function auditaFontes(d) {
  const r = []
  const S = d.REWARDS_SOURCES
  if (S.tiktokTermsUs.url !== 'https://www.tiktok.com/legal/page/global/creator-rewards-program-us/en') r.push('URL dos termos dos EUA')
  if (S.tiktokTermsUs.updated !== 'July 20, 2026' || !/"a duration of at least 1 minute"/.test(S.tiktokTermsUs.says)) r.push('termos dos EUA: data/"at least 1 minute"')
  if (!/"must be one minute or longer"/.test(S.tiktokTermsEea.says)) r.push('termos do EEE: "one minute or longer"')
  if (!/up to three minutes/.test(S.youtubeShorts.says) || !/won't be recommended to new audiences/.test(S.instagramReels.says)) r.push('YouTube/Instagram: o que a fonte diz')
  for (const [k, s] of Object.entries(S)) {
    let host = ''
    try { host = new URL(s.url).host } catch { /* vazio */ }
    if (!OFICIAIS.has(host)) r.push(`fonte não oficial: ${k} → ${s.url}`)
  }
  if (d.REWARDS_SOURCES_CHECKED !== 'October 6, 2026' || d.REWARDS_SOURCES_CHECKED_ISO !== '2026-10-06') r.push('data da consulta')
  return r
}
const fontesFalhas = auditaFontes(dr)
checa('fontes oficiais (termos do TikTok EUA/EEE, newsroom, YouTube Help, About Instagram) com data' + (fontesFalhas.length ? ` — ${fontesFalhas.join(' | ')}` : ''), fontesFalhas.length === 0)
const fonteFalsa = libSrc.replace("url: 'https://www.tiktok.com/legal/page/global/creator-rewards-program-us/en'", "url: 'https://some-blog.example/tiktok-rewards'")
checa('mutante: fonte trocada por blog → vermelho', fonteFalsa !== libSrc && auditaFontes(carrega(LIB, { [LIB]: fonteFalsa })).length > 0)

function renderPagina(sobrescritas = {}) {
  const mod = carrega(PAGE, sobrescritas)
  return { mod, html: renderToStaticMarkup(React.createElement(mod.default)) }
}
function auditaPagina({ mod, html }, d) {
  const r = []
  const S = d.REWARDS_SOURCES
  const um = d.wordsForOneMinute()
  const texto = textoDe(html)
  const resposta = (html.match(/<p class="drw-answer" id="short-answer">([\s\S]*?)<\/p>/) || [])[1] ?? ''
  const respostaTxt = textoDe(resposta)
  if (!/<h1>[^<]*TikTok Creator Rewards[^<]*<\/h1>/.test(html)) r.push('h1')
  if (!/at least 1 minute long/.test(respostaTxt)) r.push('resposta direta sem "at least 1 minute"')
  if (!respostaTxt.includes(`${um.calm} words at a calm ${d.REWARDS_RATE_BASE.hollywood} words per second`) || !respostaTxt.includes(`${um.brisk} words at a brisk ${d.REWARDS_RATE_BASE.classic} words per second`)) r.push('resposta direta sem as palavras de 1:00 nas duas vozes')
  if (!hrefs(resposta).includes(S.tiktokTermsUs.url)) r.push('resposta direta sem o link dos termos')
  if (!respostaTxt.includes(`last updated ${S.tiktokTermsUs.updated}`) || !respostaTxt.includes(`checked ${d.REWARDS_SOURCES_CHECKED}`)) r.push('resposta direta sem data de atualização/consulta')
  const tabela = (html.match(/<table class="drw-table">([\s\S]*?)<\/table>/) || [])[1] ?? ''
  const linhas = [...tabela.matchAll(/<tr><th scope="row">([\s\S]*?)<\/tr>/g)].map((m) => m[1])
  if (linhas.length !== 3) r.push(`tabela com ${linhas.length} plataformas (esperado 3)`)
  for (const l of linhas) {
    const links = hrefs(l)
    if (!links.length || !links.every((u) => OFICIAIS.has(new URL(u).host))) r.push('linha da tabela sem fonte oficial')
    if (!textoDe(l).includes(`checked ${d.REWARDS_SOURCES_CHECKED}`)) r.push('linha da tabela sem data da consulta')
  }
  if (!/TikTok Creator Rewards Program[\s\S]*At least 1 minute/.test(textoDe(tabela))) r.push('tabela: TikTok sem "At least 1 minute"')
  const todos = hrefs(html)
  for (const s of Object.values(S)) if (!todos.includes(s.url)) r.push(`fonte sem link na página: ${s.name}`)
  // FAQ visível = FAQ do JSON-LD
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
  const faq = ld.find((x) => x['@type'] === 'FAQPage')
  const secaoFaq = (html.match(/<section class="drw-section drw-faq"[\s\S]*?<\/section>/) || [''])[0]
  const visiveis = [...secaoFaq.matchAll(/<article><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/article>/g)].map((m) => [decode(m[1]), decode(m[2])])
  if (visiveis.length < 4) r.push(`FAQ visível com ${visiveis.length} perguntas`)
  if (!faq || faq.mainEntity.length !== visiveis.length || faq.mainEntity.some((q, i) => q.name !== visiveis[i][0] || q.acceptedAnswer.text !== visiveis[i][1])) r.push('FAQ do JSON-LD ≠ FAQ visível')
  if (!ld.some((x) => x['@type'] === 'WebApplication' && x.url === `https://www.usekineo.com${ROUTE}`)) r.push('JSON-LD WebApplication')
  if (PROMESSA.test(texto) || ld.some((x) => PROMESSA.test(JSON.stringify(x)))) r.push(`promessa proibida: "${(texto.match(PROMESSA) || JSON.stringify(ld).match(PROMESSA) || [''])[0]}"`)
  if (!texto.includes('Type one sentence. Get a finished 60-second video — voice, captions and music included — in minutes.')) r.push('frase da marca')
  const final = todos.filter((u) => u.startsWith('/studio?'))
  if (final.length !== 1) r.push(`CTA final para o Studio: ${final.length}`)
  else {
    const q = new URL(final[0], 'https://x.local').searchParams
    if (q.get('script_mode') !== 'ai' || q.get('duration') !== '60' || q.get('intent_campaign') !== CAMPAIGN || q.has('prompt')) r.push('CTA final (sem roteiro) ≠ Studio "uma frase" 60 s com a campanha')
  }
  if (mod.dynamic !== 'force-static') r.push('página não é estática')
  if (mod.metadata?.alternates?.canonical !== `https://www.usekineo.com${ROUTE}`) r.push('canonical')
  if (!/at least 1 minute|1 minute/.test(String(mod.metadata?.description))) r.push('description sem o critério')
  return r
}
const pagina = renderPagina()
const paginaFalhas = auditaPagina(pagina, dr)
checa('página: resposta direta com fonte e data, tabela 3 plataformas, fontes oficiais, FAQ = JSON-LD, CTA, sem promessa' + (paginaFalhas.length ? ` — ${paginaFalhas.join(' | ')}` : ''), paginaFalhas.length === 0)
const pageSrc = rd(PAGE)
const semData = pageSrc.replace('{S.tiktokTermsUs.updated} · checked {REWARDS_SOURCES_CHECKED}. Length', '{S.tiktokTermsUs.updated}. Length')
checa('mutante: resposta direta sem a data da consulta → vermelho', semData !== pageSrc && auditaPagina(renderPagina({ [PAGE]: semData }), dr).length > 0)
const promete = pageSrc.replace('Length is one requirement among several; TikTok\n              decides which videos earn.', 'Videos over 1:00 qualify for Creator Rewards.')
checa('mutante: "qualify for Creator Rewards" na página → vermelho', promete !== pageSrc && auditaPagina(renderPagina({ [PAGE]: promete }), dr).some((x) => x.startsWith('promessa')))
const semLinkTabela = pageSrc.replace('sources: [S.youtubeShorts],', 'sources: [],')
checa('mutante: linha da tabela sem fonte → vermelho', semLinkTabela !== pageSrc && auditaPagina(renderPagina({ [PAGE]: semLinkTabela }), dr).length > 0)

// resultados do cliente, renderizados com cada exemplo como estado inicial (mutação controlada do useState)
const clientSrc = rd(CLIENT)
const ESTADO = "const [script, setScript] = useState('')"
const TITULO = { short: 'Too short for 1:00', close: 'Long enough only at a calm pace', ready: 'Long enough for 1:00 at either pace' }
function auditaResultado(html, ex, d) {
  const r = []
  const e = ESPERADO[ex.id]
  const texto = textoDe(html)
  if (!new RegExp(`<h2>${TITULO[ex.id]}</h2>`).test(html)) r.push(`${ex.id}: veredito ≠ "${TITULO[ex.id]}"`)
  for (const k of ['brisk', 'calm']) {
    const [relogio, alcanca, faltam] = e[k]
    if (!texto.includes(relogio)) r.push(`${ex.id}.${k}: relógio ${relogio} ausente`)
    if (!alcanca && !texto.includes(`Add ${faltam} words for 1:00`)) r.push(`${ex.id}.${k}: "Add ${faltam} words for 1:00" ausente`)
  }
  const nOk = (texto.match(/✓ Reaches 1:00/g) || []).length
  if (nOk !== [e.brisk[1], e.calm[1]].filter(Boolean).length) r.push(`${ex.id}: ${nOk} "✓ Reaches 1:00"`)
  const cta = hrefs(html).filter((u) => u.startsWith('/studio?'))
  if (cta.length !== 1) r.push(`${ex.id}: ${cta.length} CTAs para o Studio`)
  else {
    const q = new URL(cta[0], 'https://x.local').searchParams
    if (q.get('prompt') !== ex.script.trim() || q.get('script_mode') !== 'verbatim' || q.get('duration') !== '60' || q.get('intent_campaign') !== CAMPAIGN) r.push(`${ex.id}: CTA não leva o roteiro verbatim + 60 s + campanha`)
    for (const k of ['create_intent', 'autoanalyze', 'studio']) if (q.has(k)) r.push(`${ex.id}: CTA com gatilho de auto-start ${k}`)
  }
  if (!texto.includes('Type one sentence. Get a finished 60-second video — voice, captions and music included — in minutes.')) r.push(`${ex.id}: frase da marca no CTA`)
  if (PROMESSA.test(texto)) r.push(`${ex.id}: promessa proibida "${texto.match(PROMESSA)[0]}"`)
  return r
}
function renderResultado(ex, src = clientSrc) {
  const mutado = src.replace(ESTADO, `const [script, setScript] = useState(${JSON.stringify(ex.script)})`)
  if (mutado === src) return '<estado inicial não encontrado>'
  const mod = carrega(CLIENT, { [CLIENT]: mutado })
  return renderToStaticMarkup(React.createElement(mod.default))
}
for (const ex of dr.REWARDS_EXAMPLES) {
  const f = auditaResultado(renderResultado(ex), ex, dr)
  checa(`resultado renderizado — exemplo "${ex.id}" (veredito, relógios, palavras que faltam, CTA)` + (f.length ? ` — ${f.join(' | ')}` : ''), f.length === 0)
}
const vazio = renderToStaticMarkup(React.createElement(carrega(CLIENT).default))
checa('estado inicial vazio: 0:00 e nenhum CTA', textoDe(vazio).includes('0:00') && !hrefs(vazio).some((u) => u.startsWith('/studio?')))
const clientePromete = clientSrc.replace("title: 'Long enough for 1:00 at either pace',", "title: 'Your video qualifies for Creator Rewards',")
checa('mutante: resultado promete "qualifies" → vermelho', clientePromete !== clientSrc && auditaResultado(renderResultado(dr.REWARDS_EXAMPLES[2], clientePromete), dr.REWARDS_EXAMPLES[2], dr).length > 0)
const libAutoStart = libSrc.replace("q.set('intent_campaign', DURACAO_REWARDS_CAMPAIGN)", "q.set('intent_campaign', DURACAO_REWARDS_CAMPAIGN)\n  q.set('create_intent', 'fast')")
checa('mutante: CTA com create_intent (auto-start) → vermelho', libAutoStart !== libSrc && (() => {
  const mod = carrega(CLIENT, { [CLIENT]: clientSrc.replace(ESTADO, `const [script, setScript] = useState(${JSON.stringify(dr.REWARDS_EXAMPLES[0].script)})`), [LIB]: libAutoStart })
  return auditaResultado(renderToStaticMarkup(React.createElement(mod.default)), dr.REWARDS_EXAMPLES[0], dr).length > 0
})())

// ═══ 5. CTA, campanha e privacidade ═══════════════════════════════════════════════════════════════════════════
console.log('5. CTA → Studio, campanha de cadastro e nada enviado enquanto confere')
function auditaClique(src) {
  const r = []
  const chamadas = []
  const mod = carrega(CLIENT, { [CLIENT]: src }, chamadas)
  const script = dr.REWARDS_EXAMPLES[1].script
  const el = mod.RewardsStudioCta({ script, placement: 'result', check: dr.checkRewardsLength(script), children: 'x' })
  if (typeof el?.props?.onClick !== 'function') return ['CTA sem onClick']
  el.props.onClick()
  if (!chamadas.some((c) => c[0] === 'rememberSignupCampaign' && c[1] === CAMPAIGN)) r.push('clique não guarda a campanha de cadastro (rememberSignupCampaign)')
  const ev = chamadas.filter((c) => c[0] === 'trackEvent').map((c) => c[1])
  if (!ev.includes('rewards_length_cta_clicked') || !ev.includes('organic_cta_clicked')) r.push(`eventos do clique: ${ev.join(',')}`)
  if (/molasses|North End/i.test(JSON.stringify(chamadas))) r.push('o clique manda o TEXTO do roteiro')
  if (chamadas.some((c) => c[0] === 'trackEvent' && c[2]?.source !== CAMPAIGN)) r.push('evento sem source = campanha')
  return r
}
function auditaPrivacidade(src) {
  const r = []
  const semComent = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '')
  if (/\bfetch\(|XMLHttpRequest|sendBeacon|useEffect|useLayoutEffect|localStorage|sessionStorage/.test(semComent)) r.push('rede/efeito/armazenamento no cliente')
  const ctaInicio = semComent.indexOf('onClick={() => {\n        rememberSignupCampaign(')
  const ctaFim = semComent.indexOf('{children}')
  const chamadas = [...semComent.matchAll(/\b(trackEvent|trackClosedEvent)\(/g)].map((m) => m.index)
  if (ctaInicio < 0 || ctaFim < 0) r.push('onClick do CTA não encontrado')
  else if (chamadas.length !== 2 || chamadas.some((i) => i < ctaInicio || i > ctaFim)) r.push(`${chamadas.length} chamadas de evento, nem todas no clique do CTA`)
  const imports = importsDe(semComent)
  if (JSON.stringify(imports) !== JSON.stringify(['react', '@/lib/analytics', '@/lib/growth/duracaoRewards'])) r.push(`imports do cliente: ${imports.join(', ')}`)
  if (!/maxLength=\{REWARDS_SCRIPT_MAX_CHARS\}/.test(semComent)) r.push('textarea sem o teto do Studio')
  return r
}
const cliqueFalhas = auditaClique(clientSrc)
checa('clique no CTA: rememberSignupCampaign("tool_duracao_rewards") + 2 eventos, sem o texto' + (cliqueFalhas.length ? ` — ${cliqueFalhas.join(' | ')}` : ''), cliqueFalhas.length === 0)
const privFalhas = auditaPrivacidade(clientSrc)
checa('enquanto confere nada sai do navegador (sem fetch/efeito/evento por tecla; eventos só no clique)' + (privFalhas.length ? ` — ${privFalhas.join(' | ')}` : ''), privFalhas.length === 0)
const semCampanha = clientSrc.replace('        rememberSignupCampaign(DURACAO_REWARDS_CAMPAIGN)\n', '')
checa('mutante: clique sem rememberSignupCampaign → vermelho', semCampanha !== clientSrc && auditaClique(semCampanha).length > 0)
const porTecla = clientSrc.replace("import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'", "import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'")
  .replace('  const verdict = check.status', "  useEffect(() => { void trackEvent('rewards_length_typed', { words: check.narratedWords }) }, [check])\n  const verdict = check.status")
checa('mutante: evento por tecla (useEffect) → vermelho', porTecla !== clientSrc && porTecla.includes('rewards_length_typed') && auditaPrivacidade(porTecla).length > 0)
const comTexto = clientSrc.replace("          placement,\n          destination: '/studio',", "          placement,\n          script,\n          destination: '/studio',")
checa('mutante: evento do clique leva o roteiro → vermelho', comTexto !== clientSrc && auditaClique(comTexto).length > 0)
// o Studio lê o que o CTA manda, e a ideia atravessa o cadastro com a campanha (executado: destinoDaIdeia)
const studioSrc = rd('app/(dashboard)/studio/StudioClient.tsx')
checa("Studio lê ?prompt, ?script_mode=verbatim, ?duration=60 e ?intent_campaign",
  /const p = sp\.get\('prompt'\)\n\s*if \(p\) setPrompt\(p\)/.test(studioSrc)
  && /if \(requestedScriptMode === 'ai' \|\| requestedScriptMode === 'verbatim'\)/.test(studioSrc)
  && /if \(requestedDuration === 35 \|\| requestedDuration === 60 \|\| requestedDuration === 90\)/.test(studioSrc)
  && /const ic = sp\.get\('intent_campaign'\)\n\s*if \(ic\) campaignRef\.current = ic/.test(studioSrc))
const ideia = carrega('lib/growth/ideiaPousaNoStudio.ts')
const roteiro = dr.REWARDS_EXAMPLES[1].script
const gerar = new URLSearchParams({ engine: 'seedance', prompt: roteiro, duration: '60', script_mode: 'verbatim', autoanalyze: '1', studio: '1', intent_campaign: CAMPAIGN })
const pouso = new URL(ideia.destinoDaIdeia(`/studio/create?${gerar.toString()}`), 'https://x.local')
checa('deslogado: Gerar → cadastro → volta ao /studio com o roteiro inteiro, verbatim, 60 s e a campanha (destinoDaIdeia)',
  pouso.pathname === '/studio' && pouso.searchParams.get('prompt') === roteiro && pouso.searchParams.get('script_mode') === 'verbatim'
  && pouso.searchParams.get('duration') === '60' && pouso.searchParams.get('intent_campaign') === CAMPAIGN && !pouso.searchParams.has('autoanalyze'))
const analyticsSrc = rd('lib/analytics.ts')
checa('signup_utm_campaign herda a campanha guardada (src.utm_campaign || storedSignupCampaign()) e o nome passa no filtro',
  /signup_utm_campaign: src\.utm_campaign \|\| storedSignupCampaign\(\) \|\|/.test(analyticsSrc)
  && analyticsSrc.includes('/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/') && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(CAMPAIGN)
  && dr.DURACAO_REWARDS_CAMPAIGN === CAMPAIGN)
checa('teto do CTA = teto do Studio para verbatim (analyzePromptMaxChars)', dr.REWARDS_SCRIPT_MAX_CHARS === carrega('lib/analyzeLimits.ts').analyzePromptMaxChars('verbatim'))

// ═══ 6. superfície: sitemap, llms.txt, tema e 390 px ═══════════════════════════════════════════════════════════
console.log('6. sitemap · llms.txt · tema claro/escuro · 390 px')
function auditaSuperficie(sitemap, llms, d) {
  const r = []
  if (d.DURACAO_REWARDS_PATH !== ROUTE || !existsSync(join(root, 'app', ROUTE.slice(1), 'page.tsx'))) r.push('rota/arquivo da página')
  if (!/url: `\$\{BASE\}\/tiktok-creator-rewards-length-checker`,\n\s*lastModified: new Date\('2026-10-06T00:00:00\.000Z'\)/.test(sitemap)) r.push('sitemap sem a rota')
  const linha = llms.split('\n').find((l) => l.includes('(${BASE}/tiktok-creator-rewards-length-checker)')) ?? ''
  if (!linha) return [...r, 'llms.txt sem a rota']
  const um = d.wordsForOneMinute()
  const n = linha.match(/about (\d+) words at a calm pace and (\d+) at a brisk pace/)
  if (!n || Number(n[1]) !== um.calm || Number(n[2]) !== um.brisk) r.push('llms: palavras de 1:00 ≠ lib')
  const v = linha.match(/\((\d\.\d) and (\d\.\d) words per second\)/)
  if (!v || Number(v[1]) !== d.REWARDS_RATE_BASE.classic || Number(v[2]) !== d.REWARDS_RATE_BASE.hollywood) r.push('llms: ritmos ≠ lib')
  if (!linha.includes(`last updated ${d.REWARDS_SOURCES.tiktokTermsUs.updated}; checked ${d.REWARDS_SOURCES_CHECKED}`)) r.push('llms: datas ≠ lib')
  if (PROMESSA.test(linha)) r.push('llms: promessa proibida')
  return r
}
const sitemapSrc = rd('app/sitemap.ts')
const llmsSrc = rd('app/llms.txt/route.ts')
const supFalhas = auditaSuperficie(sitemapSrc, llmsSrc, dr)
checa('sitemap + llms.txt com a rota; números e datas do llms = lib' + (supFalhas.length ? ` — ${supFalhas.join(' | ')}` : ''), supFalhas.length === 0)
checa('robots não bloqueia a rota', !/tiktok-creator-rewards-length-checker/.test(rd('app/robots.ts')))
checa('mutante: llms diz 190 palavras → vermelho', auditaSuperficie(sitemapSrc, llmsSrc.replace('and 186 at a brisk pace', 'and 190 at a brisk pace'), dr).length > 0)
checa('mutante: llms promete "qualifies" → vermelho', auditaSuperficie(sitemapSrc, llmsSrc.replace('eligibility for rewards is decided by TikTok', 'a 1-minute video qualifies'), dr).length > 0)
checa('mutante: sitemap sem a entrada → vermelho', auditaSuperficie(sitemapSrc.replace('/tiktok-creator-rewards-length-checker`', '/x`'), llmsSrc, dr).length > 0)
function auditaTema(src) {
  const r = []
  const css = (src.match(/const PAGE_CSS = `([\s\S]*?)`/) || [])[1] ?? ''
  if (!css) return ['PAGE_CSS ausente']
  if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(css)) r.push('cor fixa no CSS (quebra claro/escuro)')
  for (const t of ['var(--bg)', 'var(--text)', 'var(--card)', 'var(--border)', 'var(--accent)', 'var(--on-accent)']) if (!css.includes(t)) r.push(`token ${t}`)
  if (!/@media\(max-width:640px\)\{[\s\S]*\.drw-table,\.drw-table thead,\.drw-table tbody,\.drw-table tr,\.drw-table th,\.drw-table td\{display:block/.test(css)) r.push('tabela não empilha em 390 px')
  if (!/@media\(max-width:860px\)\{\.drw-tool,\.drw-method\{grid-template-columns:1fr\}\}/.test(css)) r.push('ferramenta não vira 1 coluna')
  if (!/\.drw-editor textarea\{[^}]*font-size:16px/.test(css)) r.push('textarea < 16px (zoom do iOS)')
  if (/style=\{\{[^}]*(#[0-9a-fA-F]{3,8}\b|rgba?\()/.test(src)) r.push('cor fixa em style inline')
  // body::before (globals.css) é fixed + z-index 0 e, no tema escuro, pinta um degradê POR CIMA de conteúdo sem camada.
  if (!/^\.drw\{position:relative;z-index:1;/m.test(css)) r.push('.drw sem position:relative;z-index:1 (véu do tema escuro por cima do texto)')
  return r
}
const temaFalhas = auditaTema(pageSrc)
checa('tema só por tokens de app/appearance.css (claro/escuro) + regras de 390 px' + (temaFalhas.length ? ` — ${temaFalhas.join(' | ')}` : ''), temaFalhas.length === 0)
checa('mutante: fundo #000 fixo → vermelho', auditaTema(pageSrc.replace('min-height:100vh;background:var(--bg)', 'min-height:100vh;background:#000')).length > 0)
checa('mutante: página sem camada própria (o véu fixo do body::before no tema escuro cobre o texto) → vermelho', auditaTema(pageSrc.replace('.drw{position:relative;z-index:1;', '.drw{')).length > 0)
checa('cliente sem cor fixa em style inline', !/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(clientSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '')))

console.log(falhas.length ? `\nFAIL ${falhas.length} de ${ok + falhas.length}` : `\nPASS ${ok} verificações (duração para o Creator Rewards: régua da casa, fontes, CTA, superfície)`)
process.exit(falhas.length ? 1 : 0)
