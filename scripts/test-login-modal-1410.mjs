// KINEO-LOGIN-MODAL-1410 — guardião do modal de entrar/criar conta da home (fundador 14/10, "vai": login e cadastro num
// MODAL por cima da home, como Higgsfield e Krea; sair da conta pousa na home).
//
// O QUE ELE PROVA (lendo os arquivos reais com readFileSync e EXECUTANDO lib/authModal.ts transpilado; sem alias @/):
//   R1 o modal NÃO tem autenticação própria: carrega as telas de app/(auth)/login/page.tsx e app/(auth)/signup/page.tsx
//      e não chama Supabase, Google nem signUp/signIn por conta própria;
//   R2 as telas continuam com as MESMAS chamadas de sempre (senha, cadastro, Google, descartável, trial por senha,
//      conversões, atribuição);
//   R3 dentro das telas o modal só muda o LAYOUT: `inModal` não entra em handleLogin/handleSignup, e fora do modal o
//      contexto vale false (as páginas ficam como antes);
//   R4 o ?redirect atravessa intacto: a query do link vira a query da home (auth=<modo> + o resto byte a byte) ANTES de a
//      tela montar; fechar tira só os parâmetros de entrada;
//   R5 o middleware manda a rota protegida para `/?auth=login&redirect=<rota>` (e o ramo de quem já está logado em
//      /login|/signup continua);
//   R6 sair da conta pousa em `/` (Sidebar e /account), nunca em /login;
//   R7 /login, /signup e /auth/callback continuam existindo;
//   R8 app/auth/callback/route.ts (que concede o trial) está byte a byte igual ao da base 8e3bcfd4;
//   R9 home: "Log in"/"Start free" do menu (topo e celular) marcados para abrir o modal com o MESMO href; o menu não
//      encolheu (mesma contagem de data-nav-item da base); engineWall/homeVideoCuration intocados;
//   R10 o modal: diálogo modal, X, Esc, clique no fundo, foco preso (Tab), fundo sem rolar, 440 px, portal;
//   R11 a abertura vira evento (auth_modal_opened).
//   (M) mutantes: cada um quebra uma regra de propósito, prova que aplicou e fica vermelho.
//
// Base fixa: 8e3bcfd4 (origin/main no dia). Se o callback, o engineWall ou a curadoria mudarem DE PROPÓSITO depois,
// reancorar a base aqui com o motivo.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const BASE = '8e3bcfd4'
const readRaw = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const read = (rel) => readRaw(rel).replace(/\r\n/g, '\n')
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))
function baseFile(rel) {
  try {
    return execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    return null
  }
}
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\s*\}/g, '{}')

const PATHS = {
  modal: 'components/auth/HomeAuthModal.tsx',
  ctx: 'components/auth/AuthSurfaceContext.tsx',
  lib: 'lib/authModal.ts',
  login: 'app/(auth)/login/page.tsx',
  signup: 'app/(auth)/signup/page.tsx',
  landing: 'app/KineoLanding.tsx',
  mw: 'lib/supabase/middleware.ts',
  sidebar: 'components/Sidebar.tsx',
  account: 'app/(dashboard)/account/AccountClient.tsx',
  callback: 'app/auth/callback/route.ts',
  engineWall: 'lib/engineWall.ts',
  curation: 'lib/homeVideoCuration.ts',
}
const REAL = Object.fromEntries(Object.entries(PATHS).map(([k, rel]) => [k, exists(rel) ? read(rel) : '']))
// O callback é comparado byte a byte com o blob da base no formato do repositório (LF): o core.autocrlf do Windows põe
// CRLF só na cópia de trabalho.
REAL.callbackRaw = REAL.callback
const BASES = {
  callbackRaw: baseFile(PATHS.callback)?.replace(/\r\n/g, '\n') ?? null,
  engineWall: baseFile(PATHS.engineWall),
  curation: baseFile(PATHS.curation),
  landing: baseFile(PATHS.landing),
}

function runLib(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const box = { exports: {} }
  vm.runInNewContext(js, { module: box, exports: box.exports, URLSearchParams, URL })
  return box.exports
}

function fnBody(src, header, terminator = '\n  }\n') {
  const start = src.indexOf(header)
  if (start < 0) return null
  const end = src.indexOf(terminator, start)
  return end < 0 ? null : src.slice(start, end)
}

function rules(F) {
  const out = []
  const ok = (id, cond, label) => out.push([id, Boolean(cond), label])
  const modalCode = stripComments(F.modal)

  // R1 — o modal reaproveita as telas, sem autenticação própria.
  ok('R1', F.modal.includes("import('@/app/(auth)/login/page')") && F.modal.includes("import('@/app/(auth)/signup/page')"),
    'o modal carrega as telas de /login e /signup (app/(auth)/*/page.tsx)')
  ok('R1', !/createClient|supabase|signInWithPassword|signUp\(|signInWithOAuth|GoogleSignInButton|isDisposableEmail/.test(modalCode),
    'o modal não chama Supabase/Google/signUp por conta própria (zero lógica de autenticação duplicada)')
  ok('R1', /<AuthSurfaceProvider value=\{\{ inModal: true \}\}>/.test(F.modal) && /<LoginScreen key=/.test(F.modal) && /<SignupScreen key=/.test(F.modal),
    'as telas rodam dentro do provedor inModal=true')

  // R2 — as telas mantêm as chamadas de sempre.
  ok('R2', F.login.includes('await supabase.auth.signInWithPassword({ email, password })'), '/login: entrar por senha')
  ok('R2', F.login.includes('<GoogleSignInButton redirectTo={getRedirect()} analyticsSurface="login_page"'), '/login: Google com o mesmo destino')
  ok('R2', F.login.includes('trackSignupSource()') && F.login.includes("trackCheckoutAuthStep('completed', 'login_page', destination, 'email')"), '/login: atribuição e funil')
  ok('R2', F.signup.includes('await supabase.auth.signUp({') && F.signup.includes('isDisposableEmail(email)'), '/signup: cadastro + bloqueio de descartável')
  ok('R2', F.signup.includes("fetch('/api/auth/activation-completed'") && F.signup.includes('GOOGLE_ADS_SIGNUP_CONVERSION') && F.signup.includes("ttq.track('CompleteRegistration'"),
    '/signup: trial por senha + conversões Google Ads/TikTok')
  ok('R2', F.signup.includes('redirectTo={activationRedirect}') && F.signup.includes('activationRedirectFromSearch(window.location.search)'), '/signup: Google e destino lidos da query')

  // R3 — dentro das telas, o modal só mexe no layout.
  for (const [name, src, header] of [['login', F.login, 'async function handleLogin('], ['signup', F.signup, 'async function handleSignup(']]) {
    const body = fnBody(src, header)
    ok('R3', body && !body.includes('inModal'), `${name}: ${header.trim()} não depende de inModal`)
    ok('R3', (src.match(/useAuthSurface\(\)/g) ?? []).length === 1, `${name}: lê o contexto uma vez`)
    ok('R3', src.includes("{!inModal && <Link") && src.includes("{!inModal && <div className=\"hidden md:flex"), `${name}: no modal só saem o "Back to Home" e a vitrine`)
  }
  ok('R3', F.ctx.includes('createContext<AuthSurface>({ inModal: false })'), 'fora do modal o contexto vale false (páginas como antes)')

  // R4 — o ?redirect atravessa intacto.
  let lib = null
  try { lib = runLib(F.lib) } catch { lib = null }
  if (!lib) {
    ok('R4', false, 'lib/authModal.ts executa')
  } else {
    const redirect = '/clips?effect=wings&utm_source=trending'
    const s1 = new URLSearchParams(lib.authModalSearch('signup', `?redirect=${encodeURIComponent(redirect)}&utm_source=nav&prompt=a%20b`))
    ok('R4', s1.get('auth') === 'signup' && s1.get('redirect') === redirect && s1.get('utm_source') === 'nav' && s1.get('prompt') === 'a b',
      'link /signup?redirect=… → /?auth=signup com redirect, utm e prompt idênticos')
    const s2 = new URLSearchParams(lib.authModalSearch('login', '?auth=signup&redirect=%2Fhistory&reason=checkout'))
    ok('R4', s2.getAll('auth').length === 1 && s2.get('auth') === 'login' && s2.get('redirect') === '/history' && s2.get('reason') === 'checkout',
      'trocar de aba mantém redirect e reason, com um só auth')
    ok('R4', lib.searchWithoutAuthModal('?auth=login&redirect=%2Fhistory&utm_source=x') === '?utm_source=x' && lib.searchWithoutAuthModal('?auth=signup') === '',
      'fechar tira só os parâmetros de entrada')
    ok('R4', lib.authModeFromPath('/login') === 'login' && lib.authModeFromPath('/signup/') === 'signup' && lib.authModeFromPath('/loginx') === null && lib.authModeFromPath('/') === null,
      'só /login e /signup viram modal')
    ok('R4', lib.authModeFromParam('login') === 'login' && lib.authModeFromParam('signup') === 'signup' && lib.authModeFromParam('admin') === null, '?auth= aceita só login/signup')
    ok('R4', lib.AUTH_MODAL_PARAM === 'auth' && lib.AUTH_MODAL_LINK_ATTR === 'data-auth-modal', 'nomes do parâmetro e do atributo')
  }
  const openBody = fnBody(F.modal, 'const open = useCallback(', '\n  }, [])') ?? ''
  const iReplace = openBody.indexOf('authModalSearch(next, linkSearch)')
  const iSetMode = openBody.indexOf('setMode(next)')
  ok('R4', iReplace > 0 && iSetMode > iReplace && openBody.includes('window.history.replaceState('),
    'a query do link entra na barra (replaceState) ANTES de a tela montar')
  ok('R4', F.modal.includes("open(next, url.search, insideModal ? 'switch' : 'click', anchor)") && F.modal.includes("open(fromUrl, window.location.search, 'url')"),
    'clique leva a query do link; URL leva a query da home')

  // R5 — middleware.
  ok('R5', F.mw.includes("url.pathname = '/'") && F.mw.includes("url.searchParams.set('auth', 'login')") && !F.mw.includes("url.pathname = '/login'"),
    'rota protegida sem sessão → /?auth=login (modal da home)')
  ok('R5', F.mw.includes("url.searchParams.set('redirect', request.nextUrl.pathname)"), 'o middleware preserva o redirect')
  ok('R5', F.mw.includes("if (user && (pathname === '/login' || pathname === '/signup')) {"), 'logado em /login|/signup continua sendo levado ao destino')

  // R6 — sair pousa na home.
  for (const [name, src] of [['Sidebar', F.sidebar], ['AccountClient', F.account]]) {
    const body = fnBody(src, 'async function handleSignOut(') ?? ''
    ok('R6', body.includes("window.location.href = '/'") && !body.includes('/login'), `${name}: sair → /`)
  }

  // R7 — rotas antigas vivas.
  ok('R7', F.login.includes('export default function LoginPage()') && F.signup.includes('export default function SignupPage()'), '/login e /signup continuam páginas')
  ok('R7', F.callbackRaw.length > 0, '/auth/callback existe')

  // R8 — callback intocado.
  ok('R8', BASES.callbackRaw !== null && F.callbackRaw === BASES.callbackRaw, `app/auth/callback/route.ts byte a byte igual a ${BASE}`)

  // R9 — home.
  ok('R9', F.landing.includes('<Link className="nav-login" href="/login" data-nav-item="login" data-auth-modal="login">'), 'topo: "Log in" abre o modal, mesmo href')
  ok('R9', F.landing.includes(': <Link href="/login" data-nav-item="login" data-auth-modal="login">'), 'celular: "Log in" abre o modal, mesmo href')
  ok('R9', F.landing.includes("data-auth-modal=\"signup\" href={referralBridge ? '#try-kineo' : '/signup?utm_source=nav'}"), 'topo: "Start free" abre o modal, mesmo href')
  ok('R9', F.landing.includes("data-auth-modal=\"signup\" href={referralBridge ? '#try-kineo' : '/signup?utm_source=nav-mobile'}"), 'celular: "Start free" abre o modal, mesmo href')
  ok('R9', F.landing.includes('<HomeAuthModal signedIn={isSignedIn} />'), 'a home monta o modal')
  const navCount = (src) => (src.match(/data-nav-item=/g) ?? []).length
  ok('R9', BASES.landing !== null && navCount(F.landing) === navCount(BASES.landing), `o menu não encolheu (${navCount(F.landing)} itens data-nav-item, igual à base)`)
  ok('R9', BASES.engineWall !== null && F.engineWall === BASES.engineWall.replace(/\r\n/g, '\n'), 'lib/engineWall.ts intocado')
  ok('R9', BASES.curation !== null && F.curation === BASES.curation.replace(/\r\n/g, '\n'), 'lib/homeVideoCuration.ts intocado')

  // R10 — o modal em si.
  ok('R10', F.modal.includes('role="dialog"') && F.modal.includes('aria-modal="true"') && F.modal.includes('aria-label="Close"'), 'diálogo modal com X')
  ok('R10', F.modal.includes("e.key === 'Escape'") && F.modal.includes("e.key !== 'Tab'") && F.modal.includes('if (e.target === e.currentTarget) close()'), 'Esc, foco preso e clique no fundo')
  ok('R10', F.modal.includes("document.body.style.overflow = 'hidden'") && F.modal.includes('maxWidth: 440') && F.modal.includes('createPortal('), 'fundo parado, 440 px, portal')
  ok('R10', F.modal.includes("document.addEventListener('click', onClick, true)") && !stripComments(F.modal).includes('stopPropagation'), 'intercepta sem engolir a telemetria do menu')

  // R11 — evento.
  ok('R11', F.lib.includes("export const AUTH_MODAL_OPENED_EVENT = 'auth_modal_opened'") && F.modal.includes('void trackEvent(AUTH_MODAL_OPENED_EVENT, { mode: next, trigger })'), 'abertura vira auth_modal_opened')
  return out
}

let pass = 0
let fail = 0
for (const [id, cond, label] of rules(REAL)) {
  if (cond) pass++
  else { fail++; console.error(`FAIL ${id} — ${label}`) }
}

// R8 no nível do git: o objeto que o callback viraria num commit é o MESMO blob da base.
try {
  const now = execFileSync('git', ['hash-object', PATHS.callback], { cwd: ROOT, encoding: 'utf8' }).trim()
  const was = execFileSync('git', ['rev-parse', `${BASE}:${PATHS.callback}`], { cwd: ROOT, encoding: 'utf8' }).trim()
  if (now && now === was) pass++
  else { fail++; console.error(`FAIL R8 — blob do callback ${now} difere da base ${was}`) }
} catch {
  fail++
  console.error('FAIL R8 — git indisponível para conferir o blob do callback')
}

// Mutantes: cada um prova que aplicou (o texto existia) e que a regra-alvo fica vermelha.
const MUTANTS = [
  ['M1 o modal deixa de levar a query do link', 'modal', 'authModalSearch(next, linkSearch)', "authModalSearch(next, '')", 'R4'],
  ['M2 a lib derruba o redirect', 'lib', 'if (key !== AUTH_MODAL_PARAM) next.append(key, value)', "if (key !== AUTH_MODAL_PARAM && key !== 'redirect') next.append(key, value)", 'R4'],
  ['M3 o middleware perde o redirect', 'mw', "url.searchParams.set('redirect', request.nextUrl.pathname)", '', 'R5'],
  ['M4 sair volta a pousar no /login', 'sidebar', "      window.location.href = '/'", "      window.location.href = '/login'", 'R6'],
  ['M5 o modal ganha Supabase próprio', 'modal', 'const [mode, setMode] = useState', 'const supabase = createClient()\n  const [mode, setMode] = useState', 'R1'],
  ['M6 o modal muda a lógica do login', 'login', '    e.preventDefault()\n    setLoading(true)', '    e.preventDefault()\n    if (inModal) return\n    setLoading(true)', 'R3'],
  ['M7 o callback muda', 'callbackRaw', 'maybeActivateReverseTrial({', 'maybeActivateReverseTrial( {', 'R8'],
  ['M8 o "Log in" do topo volta a trocar de página', 'landing', 'data-nav-item="login" data-auth-modal="login">', 'data-nav-item="login">', 'R9'],
  ['M9 o Esc deixa de fechar', 'modal', "e.key === 'Escape'", "e.key === 'Esc_'", 'R10'],
]
for (const [name, key, from, to, target] of MUTANTS) {
  if (!REAL[key].includes(from)) { fail++; console.error(`FAIL ${name}: mutante não aplicou (texto ausente)`); continue }
  const mutated = { ...REAL, [key]: REAL[key].replace(from, to) }
  const red = rules(mutated).filter(([id, cond]) => id === target && !cond)
  if (red.length > 0) pass++
  else { fail++; console.error(`FAIL ${name}: ${target} continuou verde`) }
}

console.log(`test-login-modal-1410: ${pass} ok, ${fail} falha(s) (${MUTANTS.length} mutantes)`)
process.exit(fail === 0 ? 0 : 1)
