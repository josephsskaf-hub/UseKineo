#!/usr/bin/env node
// KINEO-SPACES-VISITANTE-2026-10-08 — guardião de duas portas que davam 404 para gente de fora:
//   A. /spaces sem login: era notFound(); agora vai para /signup?redirect=/spaces levando as UTMs e os identificadores de
//      clique da visita (o canal do fundador no Instagram manda gente para /spaces?utm_source=instagram&...).
//      lib/spaces/visitorRedirect.ts é EXECUTADO: redirect fixo, só parâmetros da lista passam, valor saneado.
//   B. A página chama o helper para quem NÃO tem usuário, e o 404 continua só para logado sem permissão.
//   C. /ai-faceless-video-generator (URL da ficha do SaaSHub, que virou "Discontinued" pelo 404) responde 301 para
//      /faceless-video-generator, que existe.
// Lê os arquivos reais (readFileSync + transpile; nada de import com alias '@/'). CRLF normalizado na leitura.

import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const CR = new RegExp(String.fromCharCode(13), 'g')
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(CR, '')

function loadPure(rel) {
  const output = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} importou ${id} — o módulo tem de ser puro`) },
    module,
    module.exports,
  )
  return module.exports
}

let passed = 0
const failures = []
function check(ok, label) {
  if (ok) passed += 1
  else failures.push(label)
}

// ── A. o helper, executado ────────────────────────────────────────────────────────────────────────────────────────
const mod = loadPure('lib/spaces/visitorRedirect.ts')
const href = mod.spacesSignupHref
check(typeof href === 'function', 'A0 spacesSignupHref existe e é função')

const parse = (h) => new URL(h, 'https://www.usekineo.com')
const insta = parse(href({ utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'canal_joseph' }))
check(insta.pathname === '/signup', 'A1 vai para /signup')
check(insta.searchParams.get('redirect') === '/spaces', 'A2 volta para /spaces depois do cadastro (redirect=/spaces)')
check(
  insta.searchParams.get('utm_source') === 'instagram'
    && insta.searchParams.get('utm_medium') === 'social'
    && insta.searchParams.get('utm_campaign') === 'canal_joseph',
  'A3 as UTMs do Instagram viajam até o /signup',
)

const bare = parse(href(undefined))
check(bare.pathname === '/signup' && bare.searchParams.get('redirect') === '/spaces' && [...bare.searchParams.keys()].length === 1,
  'A4 sem parâmetro nenhum: só o redirect')

const clicks = parse(href({ gclid: 'Cj0KCQjw_abc-123', msclkid: '0123456789abcdef0123456789abcdef', ref: 'PUVP53ZS' }))
check(clicks.searchParams.get('gclid') === 'Cj0KCQjw_abc-123', 'A5 gclid viaja')
check(clicks.searchParams.get('msclkid') === '0123456789abcdef0123456789abcdef', 'A6 msclkid viaja')
check(clicks.searchParams.get('ref') === 'PUVP53ZS', 'A7 código de afiliado (ref) viaja')

const hostile = parse(href({
  redirect: 'https://evil.example/x',
  next: '/admin',
  utm_source: 'https://evil.example',
  utm_campaign: 'a"b',
  utm_content: 'x'.repeat(201),
}))
check(hostile.searchParams.get('redirect') === '/spaces', 'A8 ninguém troca o destino do redirect pela URL')
check(!hostile.searchParams.has('next'), 'A9 parâmetro fora da lista não passa')
check(!hostile.searchParams.has('utm_source'), 'A10 UTM com URL dentro é descartada')
check(!hostile.searchParams.has('utm_campaign'), 'A11 UTM com aspas é descartada')
check(!hostile.searchParams.has('utm_content'), 'A12 UTM com mais de 200 caracteres é descartada')

const arr = parse(href({ utm_source: ['instagram', 'tiktok'] }))
check(arr.searchParams.get('utm_source') === 'instagram', 'A13 parâmetro repetido: vale o primeiro')

// ── B. a página usa o helper só para quem não tem usuário ────────────────────────────────────────────────────────────
const page = read('app/(dashboard)/spaces/page.tsx')
check(/import \{ notFound, redirect \} from 'next\/navigation'/.test(page), 'B1 a página importa redirect')
check(/import \{ spacesSignupHref \} from '@\/lib\/spaces\/visitorRedirect'/.test(page), 'B2 a página usa o helper puro')
check(/^\s*if \(!user\) redirect\(spacesSignupHref\(searchParams\)\)\s*$/m.test(page), 'B3 sem usuário → cadastro com a visita')
check(/^\s*if \(!spacesVisibleFor\(SPACES_PUBLIC, isAdsInternalEmail\(user\.email\)\)\) notFound\(\)\s*$/m.test(page),
  'B4 logado sem permissão continua no 404')
check(!/!user \|\|/.test(page), 'B5 o 404 não pega mais o visitante sem login')
check(!/export (const|function) (?!metadata|dynamic|default)/.test(page.replace(/export default/g, '')),
  'B6 a página não exporta nada além do que o Next aceita')

// ── C. o 301 da URL da ficha do SaaSHub ─────────────────────────────────────────────────────────────────────────────
const cfg = read('next.config.js')
check(
  /\{ source: '\/ai-faceless-video-generator', destination: '\/faceless-video-generator', permanent: true \}/.test(cfg),
  'C1 /ai-faceless-video-generator → /faceless-video-generator (301)',
)
check(existsSync(join(root, 'app/faceless-video-generator/page.tsx')), 'C2 o destino do 301 existe como página')
check(!existsSync(join(root, 'app/ai-faceless-video-generator')), 'C3 a origem não é uma página (o redirect não fica escondido)')

if (failures.length) {
  console.error(`FALHOU ${failures.length} de ${passed + failures.length}:`)
  for (const f of failures) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`ok ${passed}/${passed} — spaces visitante + 301 do SaaSHub`)
