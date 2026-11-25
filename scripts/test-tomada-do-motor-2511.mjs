// KINEO-TOMADA-DO-MOTOR-2511 — guardião da chave que troca o motor do filme grátis de 15 s SEM deploy. Sem rede, sem banco, sem fal.
//   A. a leitura (lib/cinematic/chaveDoMotor2511.ts): 'gemini' | 'kling4' | 'reserva' passam; valor fora da lista, erro, exceção, sem admin = null
//      (vale o código); cache de 30 s por instância (o erro também fica no cache); depois de 30 s lê de novo;
//   B. a reserva do teto (lib/kling4TrialBudget.ts): chave 'reserva' = { allowed:false, reason:'chave_reserva' } SEM chamar o banco do teto;
//      'gemini', 'kling4', sem chave e erro = a reserva de hoje (o RPC de sempre, US$ 2,355);
//   C. o orquestrador: motivo que não é 'cap' = 'seedance15_fallback' (a reserva de hoje) e o envio nem acontece;
//   D. a rota: a chave é lida DENTRO de tentarGemini2511 (que só roda no submit, depois da reserva): pedido já enviado não lê a chave;
//      'kling4'/'reserva' saem antes do Gemini; 'gemini' liga mesmo com a constante desligada; sem chave = a constante;
//   E. a migration: NÃO aplicada (em docs/migracoes-pendentes), RLS ligado, nenhuma política, revoke de anon e authenticated, os valores
//      do CHECK = os da leitura; F. débito e selo: a chave não toca em débito nem no selo (o selo segue o motor do job).
//   Mutantes: cada regra acima tem um mutante que precisa morrer. Rodar: node scripts/test-tomada-do-motor-2511.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import('typescript')).default
const dir = mkdtempSync(join(tmpdir(), 'tomada-'))
let seq = 0
const mod = async (src, links = {}) => {
  let o = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const [a, b] of Object.entries(links)) o = o.split(`'${a}'`).join(`'${b}'`)
  const f = join(dir, `m${seq++}.mjs`); writeFileSync(f, o); return pathToFileURL(f).href
}

const CHAVE = 'lib/cinematic/chaveDoMotor2511.ts'
const BUDGET = 'lib/kling4TrialBudget.ts'
const ORQ = 'lib/kling4Trial.ts'
const ROUTE = 'app/api/generate-video-cinematic/route.ts'
const SQL = 'docs/migracoes-pendentes/20261125_chaves_de_motor.sql'
const ORIGINAIS = Object.fromEntries([CHAVE, BUDGET, ORQ, ROUTE, SQL].map((p) => [p, read(p)]))
const U = '00000000-0000-4000-8000-0000000000a1'

// O banco da chave: devolve a linha (ou erro, ou lança). Conta as leituras.
function bancoDaChave(resposta) {
  const leituras = []
  return {
    leituras,
    from: (tabela) => ({ select: (col) => ({ eq: (k, v) => ({ maybeSingle: async () => { leituras.push([tabela, col, k, v]); if (resposta === 'lança') throw new Error('rede'); return resposta } }) }) }),
  }
}

async function checar(src, verbose) {
  let pass = 0, fail = 0
  const ok = (c, m) => { if (c) { pass++; if (verbose) console.log('  ok  ' + m) } else { fail++; if (verbose) console.log('  FAIL ' + m) } }
  try {
    const urlChave = await mod(src[CHAVE])
    const C = await import(urlChave)
    // A. a leitura
    const T0 = 1_000_000
    for (const v of ['gemini', 'kling4', 'reserva']) {
      C.esquecerChaveDoMotor2511(); const b = bancoDaChave({ data: { valor: v }, error: null })
      ok(await C.motorDoFilmeGratis2511(b, T0) === v, `A ${v}: a chave vale`)
      ok(JSON.stringify(b.leituras) === JSON.stringify([['chaves_de_motor', 'valor', 'chave', 'filme_gratis_15s']]), `A ${v}: lê a tabela chaves_de_motor, a linha filme_gratis_15s`)
    }
    for (const [nome, resp] of [['fora da lista', { data: { valor: 'seedance' } , error: null }], ['maiúscula', { data: { valor: 'Gemini' }, error: null }], ['sem linha', { data: null, error: null }],
      ['erro (tabela ausente)', { data: null, error: { code: '42P01' } }], ['erro com valor', { data: { valor: 'kling4' }, error: { code: 'x' } }], ['exceção', 'lança']]) {
      C.esquecerChaveDoMotor2511()
      ok(await C.motorDoFilmeGratis2511(bancoDaChave(resp), T0) === null, `A ${nome}: null (vale o código)`)
    }
    C.esquecerChaveDoMotor2511(); ok(await C.motorDoFilmeGratis2511(null, T0) === null, 'A sem admin: null')
    { C.esquecerChaveDoMotor2511(); const b = bancoDaChave({ data: { valor: 'kling4' }, error: null })
      await C.motorDoFilmeGratis2511(b, T0); await C.motorDoFilmeGratis2511(b, T0 + 29_999)
      ok(b.leituras.length === 1, 'A cache: dentro de 30 s, uma leitura só')
      await C.motorDoFilmeGratis2511(b, T0 + 30_000)
      ok(b.leituras.length === 2, 'A cache: aos 30 s lê de novo (a troca vale no próximo pedido em até 30 s)')
      ok(C.CHAVE_DO_MOTOR_CACHE_MS === 30_000, 'A cache de 30 s') }
    { C.esquecerChaveDoMotor2511(); const b = bancoDaChave({ data: null, error: { code: '42P01' } })
      await C.motorDoFilmeGratis2511(b, T0); await C.motorDoFilmeGratis2511(b, T0 + 10_000)
      ok(b.leituras.length === 1, 'A erro no cache: a tabela ausente não vira uma leitura por pedido') }
    { C.esquecerChaveDoMotor2511(); const b1 = bancoDaChave({ data: { valor: 'gemini' }, error: null }); const b2 = bancoDaChave({ data: { valor: 'reserva' }, error: null })
      await C.motorDoFilmeGratis2511(b1, T0)
      ok(await C.motorDoFilmeGratis2511(b2, T0 - 5) === 'reserva', 'A relógio para trás: lê de novo (não fica preso no cache)') }

    // B. a reserva do teto
    const internal = await mod(`export const contaDaCasaExata = () => false; export const isInternalEmail = () => false`)
    const B = await import(await mod(src[BUDGET], { '@/lib/cinematic/chaveDoMotor2511': urlChave, '@/lib/internalAccounts': internal }))
    const adminCom = (resp) => { const b = bancoDaChave(resp); const rpcs = []
      return { b, rpcs, admin: { from: b.from, auth: { admin: { getUserById: async () => ({ data: { user: { email: 'pessoa@x.test' } } }) } },
        rpc: async (name, args) => { rpcs.push([name, args]); return { data: [{ code: 'ok', reserved_milliusd: 2355 }], error: null } } } } }
    const ident = { jobId: '11111111-1111-4111-8111-111111111111', userId: U, country: 'US' }
    { C.esquecerChaveDoMotor2511(); const x = adminCom({ data: { valor: 'reserva' }, error: null })
      const r = await B.reserveKling4Trial(x.admin, ident)
      ok(r.allowed === false && r.reason === 'chave_reserva', "B 'reserva': { allowed:false, reason:'chave_reserva' }")
      ok(x.rpcs.length === 0, "B 'reserva': o banco do teto nem é chamado (nada reservado)") }
    for (const [nome, resp] of [['gemini', { data: { valor: 'gemini' }, error: null }], ['kling4', { data: { valor: 'kling4' }, error: null }], ['sem chave', { data: null, error: null }], ['erro', 'lança']]) {
      C.esquecerChaveDoMotor2511(); const x = adminCom(resp)
      const r = await B.reserveKling4Trial(x.admin, ident)
      ok(r.allowed === true && r.reservedUsd === 2.355, `B ${nome}: a reserva de hoje (US$ 2,355)`)
      ok(x.rpcs.length === 1 && x.rpcs[0][0] === 'reserve_kling4_trial', `B ${nome}: o RPC de sempre, uma vez`) }
    { C.esquecerChaveDoMotor2511(); const x = adminCom({ data: { valor: 'reserva' }, error: null })
      const r = await B.reserveKling4Trial(x.admin, { ...ident, userId: 'não-é-uuid' })
      ok(r.allowed === false && r.reason === 'unavailable' && x.b.leituras.length === 0, 'B identidade inválida: unavailable, como antes (antes da chave)') }

    // C. o orquestrador (texto: o motivo que não é 'cap' vai à reserva de hoje, e o envio só vem depois de allowed)
    const o = src[ORQ]
    const iRes = o.indexOf('try { reservation = await deps.reserve() }'), iNeg = o.indexOf('if (!reservation.allowed) return {'), iSub = o.indexOf('job: await deps.submit()')
    ok(iRes > 0 && iNeg > iRes && iSub > iNeg, 'C reserva → negada sai antes do envio → só então o envio')
    ok(o.includes("engineUsed: reservation.reason === 'cap' ? 'seedance15_cap' : 'seedance15_fallback', costUsd: 0, reason: reservation.reason,"), "C 'chave_reserva' = seedance15_fallback, custo 0, motivo gravado")

    // D. a rota
    const r = src[ROUTE]
    ok(r.includes("import { motorDoFilmeGratis2511 } from '@/lib/cinematic/chaveDoMotor2511'"), 'D a rota importa a leitura')
    const iT = r.indexOf('const tentarGemini2511 = async'), iL = r.indexOf("const motor2511 = typeof motorDoFilmeGratis2511 === 'function' ? await motorDoFilmeGratis2511(cinematicAdmin) : null", iT)
    const iK = r.indexOf("      if (motor2511 === 'kling4' || motor2511 === 'reserva') return null\n", iL)
    const iG = r.indexOf("      if (motor2511 !== 'gemini' && !geminiNaEsteiraLigado(GEMINI_NA_ESTEIRA_2511, user.email)) return null\n", iL)
    const iEnvio = r.indexOf('submitGeminiTrialVideo(entrada', iT)
    ok(iT > 0 && iL > iT && iK > iL && iG > iK && iEnvio > iG, 'D dentro de tentarGemini2511: lê a chave → kling4/reserva saem → gemini ou a constante → só então o envio ao Gemini')
    ok(r.split('motorDoFilmeGratis2511(').length - 1 === 1, 'D a rota lê a chave num lugar só (o envio novo); o acompanhamento de pedido já enviado não lê')
    const iReserve = r.indexOf('reserve: () => reserveKling4Trial(cinematicAdmin'), iSubmit = r.indexOf('const viaGemini2511 = await tentarGemini2511()', iReserve)
    ok(iReserve > 0 && iSubmit > iReserve, 'D o Gemini só é tentado no submit, depois da reserva do teto (a reserva negada = nem Gemini nem Kling 4)')

    // E. a migration
    const q = src[SQL]
    ok(/^-- KINEO-TOMADA-DO-MOTOR-2511 — NÃO APLICADA/.test(q), 'E o cabeçalho diz NÃO APLICADA')
    ok(q.includes('alter table public.chaves_de_motor enable row level security;'), 'E RLS ligado')
    ok(!/create\s+policy/i.test(q), 'E nenhuma política (anon e authenticated não leem nem escrevem)')
    ok(q.includes('revoke all on table public.chaves_de_motor from anon, authenticated;'), 'E revoke de anon e authenticated')
    ok(q.includes("check (chave in ('filme_gratis_15s'))") && q.includes("check (valor in ('gemini', 'kling4', 'reserva'))"), 'E o CHECK aceita só a chave e os 3 valores da leitura')
    ok(!/\bgrant\b/i.test(q.replace(/^--.*$/gm, '')), 'E nenhum grant fora dos comentários')

    // F. débito e selo
    ok(!/debit|credit|selo|gravarSelo/i.test(src[CHAVE].replace(/^\s*\/\/.*$/gm, '')), 'F a leitura não toca débito, crédito nem selo')
    ok(!/process\.env|NEXT_PUBLIC/.test(src[CHAVE]), 'F a leitura não lê chave de ambiente nem vai ao navegador')
  } catch (e) { fail++; if (verbose) console.log('  FAIL exceção: ' + (e?.message ?? e)) }
  return { pass, fail }
}

const base = await checar(ORIGINAIS, true)
if (base.fail) { console.log(`FAIL KINEO-TOMADA-DO-MOTOR-2511: ${base.fail} falhas, ${base.pass} ok`); process.exit(1) }

const MUTANTES = [
  [CHAVE, "export const CHAVE_DO_MOTOR_CACHE_MS = 30_000", "export const CHAVE_DO_MOTOR_CACHE_MS = 300_000"],
  [CHAVE, "agora - cache.em < CHAVE_DO_MOTOR_CACHE_MS", "agora - cache.em <= CHAVE_DO_MOTOR_CACHE_MS"],
  [CHAVE, "if (cache && agora - cache.em >= 0 && ", "if (cache && "],
  [CHAVE, "valor = error ? null : lerValorDoMotor2511(", "valor = lerValorDoMotor2511("],
  [CHAVE, "const VALORES: readonly MotorDoFilmeGratis2511[] = ['gemini', 'kling4', 'reserva']", "const VALORES: readonly MotorDoFilmeGratis2511[] = ['gemini', 'kling4', 'reserva', 'seedance' as MotorDoFilmeGratis2511]"],
  [CHAVE, "(VALORES as readonly string[]).includes(v)", "(VALORES as readonly string[]).includes(v.toLowerCase())"],
  [CHAVE, "  cache = { em: agora, valor }\n", "  if (valor !== null) cache = { em: agora, valor }\n"],
  [CHAVE, "  } catch { valor = null }\n", "  } catch { valor = 'kling4' }\n"],
  [CHAVE, ".eq('chave', CHAVE_FILME_GRATIS_15S)", ".eq('chave', 'filme_gratis')"],
  [BUDGET, "=== 'reserva') return { allowed: false, reason: 'chave_reserva' }", "=== 'reserva') return { allowed: false, reason: 'unavailable' }"],
  [BUDGET, "=== 'reserva') return { allowed: false, reason: 'chave_reserva' }", "=== 'kling4') return { allowed: false, reason: 'chave_reserva' }"],
  [BUDGET, "  try { const { motorDoFilmeGratis2511 } = await import('@/lib/cinematic/chaveDoMotor2511'); if ((await motorDoFilmeGratis2511(admin)) === 'reserva') return { allowed: false, reason: 'chave_reserva' } } catch { /* o código */ }\n", ""],
  [BUDGET, "  if (!validIdentity(i)) return { allowed: false, reason: 'unavailable' }\n  const reserva", "  const reserva"],
  [ORQ, "engineUsed: reservation.reason === 'cap' ? 'seedance15_cap' : 'seedance15_fallback'", "engineUsed: reservation.reason === 'cap' ? 'seedance15_cap' : 'kling4'"],
  [ROUTE, "      if (motor2511 === 'kling4' || motor2511 === 'reserva') return null\n", ""],
  [ROUTE, "      if (motor2511 !== 'gemini' && !geminiNaEsteiraLigado(GEMINI_NA_ESTEIRA_2511, user.email)) return null\n", "      if (!geminiNaEsteiraLigado(GEMINI_NA_ESTEIRA_2511, user.email)) return null\n"],
  [ROUTE, "import { motorDoFilmeGratis2511 } from '@/lib/cinematic/chaveDoMotor2511'", "import { motorDoFilmeGratis2511 as _m } from '@/lib/cinematic/chaveDoMotor2511'"],
  [SQL, "alter table public.chaves_de_motor enable row level security;\n", ""],
  [SQL, "revoke all on table public.chaves_de_motor from anon, authenticated;\n", "create policy leitura on public.chaves_de_motor for select using (true);\n"],
  [SQL, "check (valor in ('gemini', 'kling4', 'reserva'))", "check (valor in ('gemini', 'kling4'))"],
]
let mortos = 0
for (const [arq, de, para] of MUTANTES) {
  const n = ORIGINAIS[arq].split(de).length - 1
  if (n !== 1) { console.log(`  MUTANTE VIVO · ${arq} (trecho achado ${n}×): ${de.slice(0, 100)}`); continue }
  const r = await checar({ ...ORIGINAIS, [arq]: ORIGINAIS[arq].replace(de, () => para) }, false)
  if (r.fail > 0) mortos++; else console.log(`  MUTANTE VIVO · ${arq}: ${de.slice(0, 100)}`)
}
if (mortos !== MUTANTES.length) { console.log(`FAIL KINEO-TOMADA-DO-MOTOR-2511: ${MUTANTES.length - mortos} mutante(s) vivo(s)`); process.exit(1) }
console.log(`PASS KINEO-TOMADA-DO-MOTOR-2511: ${base.pass} ok — a chave 'gemini' | 'kling4' | 'reserva' lida em 30 s; fora da lista, sem linha, erro e exceção = o código; 'reserva' nega o teto sem chamar o banco; 'kling4' e 'reserva' saem antes do Gemini, dentro do envio novo; migration com RLS e sem política; ${mortos}/${MUTANTES.length} mutantes mortos.`)
