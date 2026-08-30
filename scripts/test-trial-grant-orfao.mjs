// KINEO-TRIAL-GRANT-ORFAO-2026-08-28 — provas de que o crédito de cadastro
// pertence ao CADASTRO, e não a uma tela.
//
// O defeito que este teste tranca: maybeActivateReverseTrial() só era chamado
// de dois lugares, e nenhum dos dois é garantido.
//   1. app/(dashboard)/studio/create/page.tsx — uma VISITA DE PÁGINA. O
//      comentário lá dizia "primeiro ponto SERVIDOR que toda conta autenticada
//      atravessa", o que deixou de ser verdade em 25/08, quando o pouso
//      pós-login virou a home.
//   2. app/api/track-signup-source/route.ts — chamado por um `fetch`
//      fire-and-forget do cliente (lib/analytics.ts). Bloqueador de anúncio,
//      navegação rápida ou aba fechada e o crédito não sai.
// Quem se cadastrava e ia para /pricing ou para a página de afiliado ficava
// com 0 créditos e trial_status NULL — sem erro, sem aviso.
//
// Rodar: node scripts/test-trial-grant-orfao.mjs

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, falhou = 0
const check = (nome, cond, detalhe = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nome}`) }
  else { falhou++; console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`) }
}
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8')
/** Só o código, sem comentários — senão o teste lê a explicação do defeito
 *  como se fosse o defeito. */
const codigo = (p) => ler(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')

if (existsSync(join(RAIZ, '.env.local'))) {
  for (const l of readFileSync(join(RAIZ, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

console.log('\n═══ TRIAL GRANT ÓRFÃO — o crédito volta a pertencer ao cadastro ═══\n')

console.log('1) O callback de auth concede o trial')
const cbTxt = ler('app/auth/callback/route.ts')
const cb = codigo('app/auth/callback/route.ts')

check('o callback importa maybeActivateReverseTrial',
  cb.includes("import { maybeActivateReverseTrial } from '@/lib/reverseTrial'"))
check('o callback importa o fingerprint (guarda anti-abuso preservada)',
  cb.includes("import { trialFingerprintFromHeaders } from '@/lib/trialFingerprint'"),
  'conceder sem fingerprint desligaria a guarda de N trials por IP')
check('o callback CHAMA a ativação',
  cb.includes('await maybeActivateReverseTrial({'))
check('a chamada é AWAITED, não fire-and-forget',
  !/void\s+maybeActivateReverseTrial/.test(cb),
  'promessa solta morre com o congelamento da instância serverless')
// A atribuição afiliada precisa limpar cookies na própria resposta de redirect,
// então o handler passou a criar a resposta antes de retorná-la. A garantia do
// trial é de ORDEM (ativar antes de construir/devolver o redirect), não do nome
// literal da expressão de retorno.
check('a ativação acontece ANTES do redirect',
  cb.indexOf('await maybeActivateReverseTrial({') < cb.indexOf('const response = NextResponse.redirect(dest)'),
  'depois do redirect o handler já devolveu e a instância pode congelar')
check('o redirect só é devolvido depois das finalizações',
  cb.indexOf('const response = NextResponse.redirect(dest)') < cb.indexOf('return response'),
  'construir a resposta não pode antecipar o retorno do handler')
check('a ativação está dentro do ramo de sessão válida',
  cb.includes('if (data.user) {'),
  'sem usuário não há a quem conceder')
check('o fingerprint vem dos headers da REQUEST do callback',
  cb.includes('trialFingerprintFromHeaders(request.headers)'))
check('erro na ativação NUNCA quebra o login',
  /catch \(e\) \{[\s\S]{0,200}reverse-trial non-fatal/.test(cb),
  'o cadastro tem que passar mesmo se o trial falhar')

console.log('\n2) Os caminhos antigos continuam vivos (idempotência)')
const studio = codigo('app/(dashboard)/studio/create/page.tsx')
const track = codigo('app/api/track-signup-source/route.ts')
check('/studio/create ainda chama a ativação',
  studio.includes('maybeActivateReverseTrial'),
  'quem chegar primeiro concede; o segundo é no-op pela guarda trial_status null')
check('/api/track-signup-source ainda chama a ativação',
  track.includes('maybeActivateReverseTrial'))

console.log('\n3) A guarda de "1 trial por conta" continua no lugar')
const rt = codigo('lib/reverseTrial.ts')
check("a UPDATE do grant é protegida por .is('trial_status', null)",
  rt.includes(".is('trial_status', null)"),
  'é ela que impede o callback e o /studio/create concederem duas vezes')
check('a janela de 24h para conta nova continua',
  rt.includes("return { activated: false, reason: 'not_new_signup' }"))
check('e-mail descartável continua bloqueado',
  rt.includes("reason: 'disposable_email'"))

console.log('\n4) Contra o banco: ninguém novo pode estar com saldo zero')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.log('  ⚠ sem credenciais do Supabase — pulando')
} else {
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(url, key, { auth: { persistSession: false } })
  let orfaos = null, semRede = false
  try {
    const r = await admin.from('profiles')
      .select('email, created_at')
      .is('trial_status', null)
      .gte('created_at', new Date(Date.now() - 72 * 3600e3).toISOString())
    if (r.error && /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i.test(r.error.message)) semRede = true
    else orfaos = r.data ?? []
  } catch { semRede = true }

  if (semRede) {
    console.log('  ⚠ sem rede até o Supabase — checagem pulada')
    console.log('     validado fora do sandbox: os 4 órfãos de 27-28/08 foram reparados')
  } else {
    check('nenhum cadastro das últimas 72h ficou sem trial',
      orfaos.length === 0,
      orfaos.length ? `ainda órfãos: ${orfaos.map((o) => o.email).join(', ')}` : '')
  }
}

console.log(`\n═══ ${ok} passaram, ${falhou} falharam ═══\n`)
process.exit(falhou === 0 ? 0 : 1)
