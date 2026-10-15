#!/usr/bin/env node
// KINEO-SAIR-DA-CONTA-1510 — guardião do "Sign out funciona no 1º clique, sempre".
//
//   A. PROVA DA CAUSA com a @supabase/auth-js REAL do projeto: callback async de onAuthStateChange que chama o
//      Supabase por dentro (o que a Sidebar fazia) prende a trava → signOut não roda em 3 s, não chama /logout
//      e o cookie fica. Com o callback adiado (o conserto), o signOut sai e chama /logout.
//   B. Módulo puro lib/auth/sairDaConta.ts (importado de verdade): nomes, domínios e linhas de apagar cookie.
//   C. Código: todos os botões usam o caminho único; rota de servidor só POST, apaga cookies, no-store;
//      middleware não renova sessão na rota; navegação dura; sem clique duplo.
//   D. Mutantes: cada regra de C precisa ficar VERMELHA quando o código volta ao defeito.
//
// Uso: node scripts/test-sair-da-conta-1510.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
let falhas = 0
let total = 0
function ok(cond, msg) {
  total++
  if (cond) console.log('  ✓ ' + msg)
  else { falhas++; console.log('  ✗ ' + msg) }
}
const ler = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── A. prova da causa com a biblioteca real ───────────────────────────────────────────────────────────────
console.log('\nA. causa reproduzida com @supabase/auth-js ' + require('@supabase/auth-js/package.json').version)
const { GoTrueClient } = require('@supabase/auth-js')

function clienteComSessao(rede) {
  const store = new Map()
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v) }, removeItem: (k) => { store.delete(k) } }
  const agora = Math.floor(Date.now() / 1000)
  const user = { id: 'u-teste', aud: 'authenticated', email: 'teste@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
  const access = 'h.' + Buffer.from(JSON.stringify({ exp: agora + 3600, sub: 'u-teste' })).toString('base64url') + '.s'
  store.set('sb-teste-auth-token', JSON.stringify({ access_token: access, refresh_token: 'r', expires_in: 3600, expires_at: agora + 3600, token_type: 'bearer', user }))
  const fetch = async (url, init) => {
    rede.push((init?.method || 'GET') + ' ' + new URL(url).pathname)
    if (String(url).includes('/logout')) return new Response(null, { status: 204 })
    return new Response(JSON.stringify(user), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const c = new GoTrueClient({ url: 'http://auth.test/auth/v1', storageKey: 'sb-teste-auth-token', storage, autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, fetch })
  return { c, store }
}

async function tentarSair(callbackAdiado) {
  const rede = []
  const { c, store } = clienteComSessao(rede)
  await c.initializePromise
  c.onAuthStateChange(callbackAdiado
    ? (ev) => { if (ev === 'SIGNED_IN') setTimeout(() => { void c.getSession() }, 0) } // conserto da Sidebar
    : async (ev) => { if (ev === 'SIGNED_IN') await c.getSession() }) // o que supabase.from() faz por dentro
  await espera(20)
  // O que o auth-js faz quando a aba volta a ficar visível (GoTrueClient._onVisibilityChanged).
  void c._acquireLock(-1, async () => { await c._recoverAndRefresh() })
  await espera(20)
  const r = await Promise.race([c.signOut({ scope: 'local' }).then(() => 'saiu'), espera(3000).then(() => 'teto-3s')])
  return { r, cookieFicou: store.has('sb-teste-auth-token'), logout: rede.some((x) => x.includes('/logout')) }
}

const antes = await tentarSair(false)
ok(antes.r === 'teto-3s', `DEFEITO reproduzido: callback async → signOut preso além de 3 s (${antes.r})`)
ok(antes.cookieFicou, 'DEFEITO reproduzido: a sessão continua gravada quando o botão navega')
ok(!antes.logout, 'DEFEITO reproduzido: nenhum POST /logout sai (igual aos logs do Supabase desde 14/10 14:08 UTC)')
const depois = await tentarSair(true)
ok(depois.r === 'saiu', `conserto: callback adiado → signOut termina (${depois.r})`)
ok(!depois.cookieFicou, 'conserto: sessão apagada do storage')
ok(depois.logout, 'conserto: POST /logout chega ao servidor')

// ─── B. módulo puro ────────────────────────────────────────────────────────────────────────────────────────
console.log('\nB. lib/auth/sairDaConta.ts')
const m = await import(pathToFileURL(join(ROOT, 'lib/auth/sairDaConta.ts')).href)
ok(m.SAIR_DA_CONTA_ROTA === '/auth/signout', 'rota única = /auth/signout')
ok(m.SAIR_DA_CONTA_DESTINO === '/', 'destino depois de sair = home (decisão de 14/10, R6 do test-login-modal-1410)')
ok(m.ehCookieDeSessao('sb-abc-auth-token.1') && !m.ehCookieDeSessao('kineo_hv') && !m.ehCookieDeSessao('sf_aff'), 'só cookie sb-* é de sessão (afiliado e visitante ficam)')
const conhecidos = m.nomesDeSessaoConhecidos('https://cqqukkvjjrguayiyjvhh.supabase.co')
ok(['sb-cqqukkvjjrguayiyjvhh-auth-token', 'sb-cqqukkvjjrguayiyjvhh-auth-token.0', 'sb-cqqukkvjjrguayiyjvhh-auth-token.1', 'sb-cqqukkvjjrguayiyjvhh-auth-token-code-verifier'].every((n) => conhecidos.includes(n)), 'nomes conhecidos: token, pedaços .0/.1 e code-verifier')
ok(m.nomesDeSessaoConhecidos(undefined).length === 0, 'sem URL do Supabase → nenhum nome inventado')
ok(JSON.stringify(m.dominiosParaApagar('www.usekineo.com')) === JSON.stringify([null, 'www.usekineo.com', 'usekineo.com']), 'www.usekineo.com → host, www e raiz')
ok(JSON.stringify(m.dominiosParaApagar('localhost:3000')) === JSON.stringify([null]), 'localhost → só o host (Domain=localhost não vale)')
ok(JSON.stringify(m.dominiosParaApagar('127.0.0.1')) === JSON.stringify([null]), 'IP → só o host')
const linhas = m.linhasParaApagarCookies(['sb-x-auth-token', 'sb-x-auth-token', 'kineo_hv'], 'www.usekineo.com', true)
ok(linhas.length === 3, `um nome sb-* × 3 domínios = 3 linhas, sem repetir e sem tocar em kineo_hv (${linhas.length})`)
ok(linhas.every((l) => l.includes('Max-Age=0') && l.includes('Path=/') && l.includes('Expires=Thu, 01 Jan 1970') && l.includes('Secure')), 'cada linha expira agora, em Path=/, com Secure no https')
ok(linhas.some((l) => !l.includes('Domain=')) && linhas.some((l) => l.endsWith('Domain=usekineo.com')), 'apaga a versão só-host e a de Domain=usekineo.com')
ok(!m.linhaParaApagarCookie('sb-x', null, false).includes('Secure'), 'http (dev) não manda Secure')
ok(JSON.stringify(m.nomesDeSessaoNoTextoDeCookie('a=1; sb-x-auth-token.0=base64-abc; sb-x-auth-token.1=zz; sf_aff=Q')) === JSON.stringify(['sb-x-auth-token.0', 'sb-x-auth-token.1']), 'lê os sb-* de document.cookie')

// ─── C. regras de código ───────────────────────────────────────────────────────────────────────────────────
const ARQ = {
  sidebar: 'components/Sidebar.tsx',
  painel: 'components/AccountPanel.tsx',
  conta: 'app/(dashboard)/account/AccountClient.tsx',
  cliente: 'lib/auth/sairDaContaCliente.ts',
  rota: 'app/auth/signout/route.ts',
  middleware: 'middleware.ts',
}

function varrer(dir, out = []) {
  for (const nome of readdirSync(join(ROOT, dir))) {
    const p = join(dir, nome)
    const st = statSync(join(ROOT, p))
    if (st.isDirectory()) { if (nome !== 'node_modules' && !nome.startsWith('.')) varrer(p, out) }
    else if (/\.(tsx?|jsx?)$/.test(nome)) out.push(relative(ROOT, join(ROOT, p)).replace(/\\/g, '/'))
  }
  return out
}
const TODOS = [...varrer('app'), ...varrer('components'), ...varrer('lib')]

// Quem pode chamar auth.signOut: o caminho único (cliente + rota) e o fluxo de convidado do checkout (scope
// 'others'/servidor, fora deste conserto — área de pagamento).
const SIGNOUT_PERMITIDO = new Set([ARQ.cliente, ARQ.rota, 'app/api/stripe/checkout/guest-access/route.ts', 'lib/auth/guestAccess.ts'])

function regras(fonte) {
  const r = []
  const add = (cond, msg) => r.push([!!cond, msg])
  const sb = fonte[ARQ.sidebar], pn = fonte[ARQ.painel], ac = fonte[ARQ.conta], cl = fonte[ARQ.cliente], rt = fonte[ARQ.rota], mw = fonte[ARQ.middleware]

  // 1. caminho único
  const chamadoresSignOut = Object.keys(fonte).filter((f) => /\bauth\.signOut\(/.test(fonte[f]) && !SIGNOUT_PERMITIDO.has(f))
  add(chamadoresSignOut.length === 0, 'nenhum componente chama auth.signOut fora do caminho único' + (chamadoresSignOut.length ? ' → ' + chamadoresSignOut.join(', ') : ''))
  const botoesSair = Object.keys(fonte).filter((f) => f.endsWith('.tsx') && /['">]\s*Sign out\s*['"<]/.test(fonte[f]))
  const botoesSoltos = botoesSair.filter((f) => !/sairDaConta\(\)|onSignOut\b/.test(fonte[f]))
  add(botoesSair.length >= 2 && botoesSoltos.length === 0, `todo botão "Sign out" passa por sairDaConta()/onSignOut (${botoesSair.join(', ')})` + (botoesSoltos.length ? ' → soltos: ' + botoesSoltos.join(', ') : ''))
  add(/import \{ sairDaConta \} from '@\/lib\/auth\/sairDaContaCliente'/.test(sb) && /function handleSignOut\(\) \{\n\s*setSigningOut\(true\)\n\s*void sairDaConta\(\)\n\s*\}/.test(sb), 'Sidebar: handleSignOut = setSigningOut(true) + sairDaConta()')
  add(/import \{ sairDaConta \} from '@\/lib\/auth\/sairDaContaCliente'/.test(ac) && /function handleSignOut\(\) \{\n\s*if \(signingOut\) return\n\s*setSigningOut\(true\)\n\s*void sairDaConta\(\)\n\s*\}/.test(ac), '/account: handleSignOut = guarda de clique duplo + sairDaConta()')
  add(/onSignOut=\{handleSignOut\}\n\s*signingOut=\{signingOut\}/.test(sb), 'Sidebar passa signingOut ao painel da conta')

  // 2. sem clique duplo, com retorno visível
  add(/onClick=\{\(\) => \{ if \(!signingOut\) onSignOut\(\) \}\}/.test(pn) && !/onClose\(\); onSignOut\(\)/.test(pn), 'painel: o clique NÃO fecha o painel antes de sair e ignora o 2º clique')
  add(/disabled=\{signingOut\}/.test(pn) && /signingOut \? 'Signing out…' : 'Sign out'/.test(pn), 'painel: botão desligado dizendo "Signing out…"')
  add(/disabled=\{signingOut\}/.test(ac) && /signingOut \? 'Signing out…' : 'Sign out'/.test(ac), '/account: botão desligado dizendo "Signing out…"')
  add(/let saidaEmCurso: Promise<void> \| null = null/.test(cl) && /if \(!saidaEmCurso\) \{/.test(cl), 'cliente: uma saída por vez (promessa única)')

  // 3. a trava do auth-js não pode prender a saída
  const asyncListeners = Object.keys(fonte).filter((f) => /onAuthStateChange\(\s*async\b/.test(fonte[f]))
  add(asyncListeners.length === 0, 'nenhum onAuthStateChange(async …) no app (deadlock da trava)' + (asyncListeners.length ? ' → ' + asyncListeners.join(', ') : ''))
  const cb = (sb.match(/onAuthStateChange\(\(event, session\) => \{([\s\S]*?)\n    \}\)\n    return \(\) => \{ cancelled = true; subscription\.unsubscribe\(\) \}/) || [])[1] || ''
  const foraDoTimeout = cb.split('setTimeout(')[0]
  add(cb.length > 0 && !/supabase\./.test(foraDoTimeout) && /setTimeout\(\(\) => \{[\s\S]*supabase\.from\('profiles'\)[\s\S]*\}, 0\)/.test(cb), 'Sidebar: callback só mexe em estado; a consulta ao Supabase vai para setTimeout(0)')

  // 4. ordem e navegação dura no cliente
  const corpo = (cl.match(/async function executarSaida\(\)[\s\S]*?\n\}/) || [''])[0]
  const iFetch = corpo.indexOf('await fetch(SAIR_DA_CONTA_ROTA')
  const iApaga = corpo.indexOf('apagarSessaoNoNavegador()')
  const iNav = corpo.indexOf('window.location.replace(SAIR_DA_CONTA_DESTINO)')
  add(iFetch > 0 && iApaga > iFetch && iNav > iApaga, 'cliente: servidor PRIMEIRO (com cookies), apaga no navegador DEPOIS, e só então navega')
  add(/method: 'POST'/.test(corpo) && /cache: 'no-store'/.test(corpo) && /credentials: 'same-origin'/.test(corpo) && /ctrl\.abort\(\)/.test(corpo), 'cliente: POST same-origin no-store com teto (AbortController)')
  add(/stopAutoRefresh\(\)/.test(corpo), 'cliente: para a renovação automática antes de sair (nada regrava cookie)')
  add(/comTeto\(supabase\.auth\.signOut\(\{ scope: 'local' \}\), SAIR_DA_CONTA_LOCAL_TIMEOUT_MS\)/.test(corpo), 'cliente: signOut local do auth-js com teto (avisa as outras abas)')
  const handlers = [sb, ac, cl].join('\n')
  add(!/router\.(push|replace)\([^)]*(login|SAIR_DA_CONTA)/.test(handlers) && !/window\.location\.href = '\/'/.test(handlers), 'navegação dura (location.replace), nunca router.push nem href="/" com sessão viva')
  add(/document\.cookie = linha/.test(cl) && /localStorage\.removeItem/.test(cl), 'cliente: apaga sb-* em document.cookie e no localStorage')

  // 5. rota de servidor
  add(/export async function POST\(/.test(rt) && !/export (async )?function GET\(/.test(rt), 'rota: só POST (GET de saída seria deslogar por <img>)')
  add(/res\.headers\.append\('Set-Cookie', linha\)/.test(rt) && /linhasParaApagarCookies\(nomes, host, seguro\)/.test(rt), 'rota: Set-Cookie apagando cada sb-* em cada domínio')
  add(/nomesDeSessaoConhecidos\(process\.env\.NEXT_PUBLIC_SUPABASE_URL\)/.test(rt) && /request\.cookies\.getAll\(\)\.map\(\(c\) => c\.name\)\.filter\(ehCookieDeSessao\)/.test(rt), 'rota: apaga os nomes do pedido E os nomes conhecidos do projeto')
  add(/res\.headers\.set\('Cache-Control', 'no-store[^']*'\)/.test(rt), 'rota: Cache-Control no-store')
  add(/supabase\.auth\.signOut\(\{ scope: 'local' \}\)/.test(rt) && /SAIR_DA_CONTA_REVOGA_TIMEOUT_MS/.test(rt), 'rota: revoga a sessão no Supabase, com teto')
  add(/setAll\(\) \{\}/.test(rt), 'rota: cliente do Supabase não grava cookie (só a rota apaga)')
  add(/NextResponse\.redirect\(new URL\(SAIR_DA_CONTA_DESTINO, request\.url\), 303\)/.test(rt), 'rota: formulário sem JS recebe 303 para o destino (home)')

  // 6. middleware
  const iBypass = mw.indexOf(`if (request.nextUrl.pathname === '${m.SAIR_DA_CONTA_ROTA}') return NextResponse.next()`)
  const iUpdate = mw.indexOf('updateSession(request)')
  add(iBypass > 0 && iBypass < iUpdate, 'middleware: rota de saída não passa pelo updateSession (não renova cookie no apagão)')
  return r
}

console.log('\nC. regras de código')
const fonteReal = {}
for (const f of TODOS) fonteReal[f] = ler(f)
for (const f of Object.values(ARQ)) fonteReal[f] = ler(f)
const reais = regras(fonteReal)
for (const [c, msg] of reais) ok(c, msg)

// ─── D. mutantes ───────────────────────────────────────────────────────────────────────────────────────────
console.log('\nD. mutantes (cada um precisa derrubar ao menos uma regra)')
function mutante(nome, arquivo, de, para) {
  const orig = fonteReal[arquivo]
  if (!orig.includes(de)) { ok(false, `mutante "${nome}": trecho de origem não encontrado em ${arquivo}`); return }
  const mutado = { ...fonteReal, [arquivo]: orig.replace(de, para) }
  if (mutado[arquivo] === orig) { ok(false, `mutante "${nome}": não aplicou`); return }
  // Só conta regra que estava VERDE no código real e ficou vermelha no mutante (vermelho herdado não prova nada).
  const quebradas = regras(mutado).filter(([c], i) => !c && reais[i][0]).map(([, msg]) => msg)
  ok(quebradas.length > 0, `mutante "${nome}" → vermelho (${quebradas[0] || 'nada quebrou'})`)
}
mutante('callback async de volta na Sidebar', ARQ.sidebar, 'supabase.auth.onAuthStateChange((event, session) => {', 'supabase.auth.onAuthStateChange(async (event, session) => {')
mutante('await supabase dentro do callback', ARQ.sidebar, "        const userId = session.user.id\n", "        await supabase.from('profiles').select('is_pro')\n        const userId = session.user.id\n")
mutante('Sidebar volta ao race de 3 s', ARQ.sidebar, '    void sairDaConta()\n  }', "    void supabase.auth.signOut({ scope: 'local' }).finally(() => { window.location.href = '/' })\n  }")
mutante('/account volta ao signOut antigo', ARQ.conta, '    void sairDaConta()\n  }', "    void supabase.auth.signOut({ scope: 'local' })\n  }")
mutante('painel fecha antes de sair', ARQ.painel, 'onClick={() => { if (!signingOut) onSignOut() }}', 'onClick={() => { onClose(); onSignOut() }}')
mutante('painel sem disabled', ARQ.painel, 'disabled={signingOut}', '')
mutante('saída concorrente (sem promessa única)', ARQ.cliente, 'if (!saidaEmCurso) {', 'if (true) {')
mutante('apaga no navegador ANTES do servidor', ARQ.cliente, '  // 2. Servidor:', '  apagarSessaoNoNavegador()\n  // 2. Servidor:')
mutante('navegação mole (router.push)', ARQ.cliente, 'window.location.replace(SAIR_DA_CONTA_DESTINO)\n}', "router.push('/login')\n}")
mutante('rota sem no-store', ARQ.rota, "res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')", '')
mutante('rota não apaga cookie', ARQ.rota, "res.headers.append('Set-Cookie', linha)", 'void linha')
mutante('rota aceita GET', ARQ.rota, 'export async function POST(', 'export async function GET(request: NextRequest) { return POST(request) }\nexport async function POST(')
mutante('rota esquece nomes conhecidos', ARQ.rota, '    ...nomesDeSessaoConhecidos(process.env.NEXT_PUBLIC_SUPABASE_URL),\n  ]', '  ]')
mutante('middleware renova sessão na rota de saída', ARQ.middleware, "if (request.nextUrl.pathname === '/auth/signout') return NextResponse.next()", '')
mutante('middleware com rota de saída diferente da lib', ARQ.middleware, "if (request.nextUrl.pathname === '/auth/signout')", "if (request.nextUrl.pathname === '/auth/sign-out')")
mutante('botão novo de Sign out fora do caminho', ARQ.conta, "{signingOut ? 'Signing out…' : 'Sign out'}", "{signingOut ? 'Signing out…' : 'Sign out'}{/* <button onClick={() => supabase.auth.signOut()}>Sign out</button> */}")

console.log(`\n${total - falhas}/${total} verificações` + (falhas ? ` — ${falhas} FALHARAM` : ' — tudo verde'))
process.exit(falhas ? 1 : 0)
