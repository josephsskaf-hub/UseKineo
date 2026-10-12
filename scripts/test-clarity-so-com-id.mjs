#!/usr/bin/env node
// KINEO-CLARITY-WELCOME20-2026-10-12 — guardião do Microsoft Clarity (gravação de sessão para entender por que quem
// chega ao pagamento não compra). Prova:
//   1. EXECUTADO lib/clarityTag.ts: ID inválido/vazio = null (nada carrega); /admin, login/cadastro/senha, /auth/*,
//      /account/billing e o login do convidado nunca gravam; page_kind só pricing/business/ads/studio/home; o snippet
//      é o oficial (https://www.clarity.ms/tag/<ID>) com o ID como literal JSON;
//   2. o layout raiz monta o componente UMA vez e só com ID; o componente usa next/script afterInteractive, para a
//      gravação (stop) fora das páginas permitidas e nunca chama identify;
//   3. campos de e-mail/senha levam data-clarity-mask="true";
//   4. mutantes: cada um deixa pelo menos uma verificação vermelha.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const LIB = 'lib/clarityTag.ts'
const TAG = 'components/ClarityTag.tsx'
const LAYOUT = 'app/layout.tsx'
const MASKED = [
  'app/(auth)/login/page.tsx',
  'app/(auth)/signup/page.tsx',
  'app/(auth)/forgot-password/page.tsx',
  'app/(auth)/reset-password/page.tsx',
  'components/AuthModal.tsx',
  'app/ai-shorts-for-agencies/AgencyBriefClient.tsx',
  'app/coming-soon/page.tsx',
  'app/(dashboard)/ads/team/TeamClient.tsx',
]
const SRC = Object.fromEntries([LIB, TAG, LAYOUT, ...MASKED].map((rel) => [rel, read(rel)]))

function loadLib(text) {
  const output = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, LIB),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)((id) => { throw new Error('clarityTag importou ' + id) }, module, module.exports)
  return module.exports
}

/** Cada <input> de e-mail/senha (type="email", type="password" ou type={... 'password'}) precisa da máscara. */
function inputsSemMascara(text) {
  const faltando = []
  const re = /<input\b[\s\S]*?\/>/g
  let m
  while ((m = re.exec(text))) {
    const tag = m[0]
    const sensivel = /type="(email|password)"/.test(tag) || /type=\{[^}]*'password'[^}]*\}/.test(tag)
    if (sensivel && !tag.includes('data-clarity-mask="true"')) faltando.push(tag.slice(0, 60).replace(/\s+/g, ' '))
  }
  return faltando
}

function problems(rep = {}) {
  const p = []
  const src = (rel) => rep[rel] ?? SRC[rel]
  let lib
  try { lib = loadLib(src(LIB)) } catch (e) { return ['lib não carrega: ' + e.message] }

  // 1. a lib executada
  for (const ruim of [undefined, null, '', '   ', 'abc', 'abc"+alert(1)+"', 'abc def', 'x'.repeat(40), '</script>']) {
    if (lib.clarityProjectId(ruim) !== null) p.push(`ID inválido aceito: ${JSON.stringify(ruim)}`)
  }
  if (lib.clarityProjectId(' abc12de3fg ') !== 'abc12de3fg') p.push('ID válido recusado')
  for (const bloqueada of ['/admin', '/admin/people', '/login', '/signup', '/signup?reason=checkout', '/forgot-password', '/reset-password', '/auth/callback', '/auth/guest-link', '/account/billing', '/checkout/guest', '/ADMIN']) {
    if (lib.clarityAllowedPath(bloqueada)) p.push(`grava em página proibida: ${bloqueada}`)
  }
  for (const livre of ['/', '/pricing', '/business', '/ads/v2', '/studio', '/administrar-nada', '/loginhelp', '/account', '/checkout/success']) {
    if (!lib.clarityAllowedPath(livre)) p.push(`deixou de gravar página permitida: ${livre}`)
  }
  const kinds = { '/': 'home', '/pricing': 'pricing', '/business': 'business', '/business/pilot': 'business', '/ads/v2': 'ads', '/studio': 'studio', '/business-video-ads': null, '/examples': null }
  for (const [path, kind] of Object.entries(kinds)) {
    if (lib.clarityPageKind(path) !== kind) p.push(`page_kind de ${path} = ${lib.clarityPageKind(path)}, devia ${kind}`)
  }
  const snip = lib.claritySnippet('abc12de3fg')
  if (!snip.includes('"https://www.clarity.ms/tag/"+i') || !snip.endsWith('(window,document,"clarity","script","abc12de3fg");')) p.push('snippet deixou de ser o oficial com o ID validado')
  if (lib.claritySnippet('abc"+x+"') !== '') p.push('snippet aceita ID inválido')

  // 2. layout + componente
  const layout = src(LAYOUT)
  // KINEO-CLARITY-ID-2026-10-12 — o ID padrão do projeto "Kineo" também passa pela régua (env tem prioridade).
  if (!layout.includes('const CLARITY_ID = clarityProjectId(process.env.NEXT_PUBLIC_CLARITY_ID || KINEO_CLARITY_PROJECT_ID)')) p.push('layout não lê o ID pela régua')
  if (lib.clarityProjectId(lib.KINEO_CLARITY_PROJECT_ID) !== 'ywlh8m9437') p.push('ID do projeto Kineo fora da régua ou trocado')
  if ((layout.match(/<ClarityTag /g) ?? []).length !== 1 || !layout.includes('{CLARITY_ID ? <ClarityTag projectId={CLARITY_ID} /> : null}')) p.push('layout não monta o Clarity UMA vez e só com ID')
  const tag = src(TAG)
  if (!tag.startsWith("'use client'")) p.push('componente não é client')
  if (!tag.includes("import Script from 'next/script'") || !tag.includes('<Script id="ms-clarity" strategy="afterInteractive">')) p.push('componente não usa next/script afterInteractive')
  if (!tag.includes('const allowed = clarityAllowedPath(pathname)') || !tag.includes('if (allowed && snippet) setArmed(true)')) p.push('o script pode baixar numa página proibida')
  if (!/if \(!allowed\) \{\n\s+if \(!stopped\.current\) \{\n\s+clarity\('stop'\)/.test(tag)) p.push('navegar para página proibida não para a gravação')
  if (!tag.includes("clarity('set', 'page_kind', kind)")) p.push('page_kind não é marcado')
  for (const rel of [LIB, TAG, LAYOUT]) {
    const semComentario = src(rel).replace(/^\s*\/\/.*$/gm, '')
    // Só a chamada do Clarity (o ttq do TikTok no layout tem um método "identify" que não é nosso assunto aqui).
    if (/\bclarity\(\s*['"]identify['"]/.test(semComentario)) p.push(`${rel} chama identify (e-mail/id para a Microsoft)`)
    if (/user\.(id|email)|userEmail|profile\.email/.test(src(rel) === layout ? '' : semComentario)) p.push(`${rel} toca e-mail/id de usuário`)
  }

  // 3. máscaras
  for (const rel of MASKED) {
    const faltando = inputsSemMascara(src(rel))
    if (faltando.length) p.push(`${rel}: campo sem data-clarity-mask: ${faltando.join(' | ')}`)
  }
  return p
}

let pass = 0
let fail = 0
const base = problems()
if (base.length === 0) { pass++; console.log('  ok  Clarity só com ID, fora das páginas proibidas, sem identify, campos mascarados') } else { fail++; for (const x of base) console.log('  FAIL ' + x) }

const troca = (rel, de, para) => {
  const s = SRC[rel]
  if (s.split(de).length !== 2) throw new Error(`mutante sem alvo único em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: s.replace(de, para) }
}
const MUTANTES = [
  ['ID qualquer passa', troca(LIB, 'export const CLARITY_ID_PATTERN = /^[a-z0-9]{6,32}$/i', 'export const CLARITY_ID_PATTERN = /^.+$/')],
  ['grava no /admin', troca(LIB, "  '/admin',\n", '')],
  ['grava no cadastro', troca(LIB, "  '/signup',\n", '')],
  ['grava no /account/billing', troca(LIB, "  '/account/billing',\n", '')],
  ['layout carrega sem ID', troca(LAYOUT, '{CLARITY_ID ? <ClarityTag projectId={CLARITY_ID} /> : null}', '<ClarityTag projectId={CLARITY_ID ?? ""} />')],
  ['script baixa em página proibida', troca(TAG, 'if (allowed && snippet) setArmed(true)', 'if (snippet) setArmed(true)')],
  ['sem stop fora das páginas permitidas', troca(TAG, "          clarity('stop')\n", '')],
  ['identify com e-mail', troca(TAG, "      if (kind) clarity('set', 'page_kind', kind)", "      if (kind) clarity('set', 'page_kind', kind)\n      clarity('identify', 'x')")],
  ['senha do login sem máscara', troca('app/(auth)/login/page.tsx', '                    id="login-password"\n                    data-clarity-mask="true"\n', '                    id="login-password"\n')],
  ['e-mail do modal sem máscara', troca('components/AuthModal.tsx', '                    type="email"\n                    data-clarity-mask="true"\n', '                    type="email"\n')],
  ['strategy trocada', troca(TAG, '<Script id="ms-clarity" strategy="afterInteractive">', '<Script id="ms-clarity" strategy="beforeInteractive">')],
]
for (const [nome, rep] of MUTANTES) {
  const m = problems(rep)
  if (m.length >= 1) { pass++; console.log(`  ok  mutante "${nome}" → vermelho (${m.length})`) } else { fail++; console.log(`  FAIL mutante "${nome}" passou verde`) }
}
console.log(`\n  verificações: ${pass + fail} · falhas: ${fail}`)
if (fail) process.exit(1)
console.log('OK — o Clarity grava só onde pode, só com ID, sem identificar ninguém')
