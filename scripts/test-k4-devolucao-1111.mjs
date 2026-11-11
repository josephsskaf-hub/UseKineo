// KINEO-K4-DEVOLUCAO-1111 — guardião do 2º passo de código do teto do Kling 4 grátis (a migration é
// docs/migracoes-pendentes/20261111_kling4_trial_release.sql, aplicada pela CEO). Prova, sem rede nem banco:
//   A. o envio: recusa 4xx da fal vira Kling4TrialRefusedError (nada cobrado); 5xx continua erro ambíguo;
//   B. o orquestrador: recusa → devolve a reserva UMA vez, custo 0, motivo 'provider_refused', filme no motor barato; 5xx,
//      timeout e falha antes do POST NÃO devolvem; devolução que falha não derruba o filme;
//   C. a reserva: conta de fora chama com os 3 argumentos de SEMPRE (vale antes e depois da migration — ninguém de fora muda
//      se o código sair primeiro); a casa passa p_cap_24h=false; 'teto_24h' vira motor barato; leitura da casa que falha = fora;
//   D. a devolução: 'ok'/'unchanged' = true; erro (inclusive função ainda inexistente) = false, nunca lança;
//   E. o CASO REAL de 08/11 (fal sem saldo → 403 em todo envio): as reservas que chegaram a ser feitas voltam ao dia;
//   F. a migration: regra das 24 h depois das travas (dia + conta), conta e aparelho, padrão TRUE, função antiga sai na mesma
//      transação, devolução mantém a linha contando, conferência em transação desfeita e desfazer; G. mutantes.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import('typescript')).default
const dir = mkdtempSync(join(tmpdir(), 'k4dev-'))
let seq = 0
const mod = async (src, links = {}) => {
  let o = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const [a, b] of Object.entries(links)) o = o.split(`'${a}'`).join(`'${b}'`)
  const f = join(dir, `m${seq++}.mjs`); writeFileSync(f, o); return pathToFileURL(f).href
}
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const HOUSE = 'casa@kineo.test'
const internal = await mod(`export const isInternalEmail = (e) => String(e ?? '').toLowerCase() === '${HOUSE}'`)
const lang = await mod(read('lib/textLanguage.ts'))
const SRC = { budget: read('lib/kling4TrialBudget.ts'), trial: read('lib/kling4Trial.ts'), sql: read('docs/migracoes-pendentes/20261111_kling4_trial_release.sql') }

const U = '00000000-0000-4000-8000-0000000000a1'
const CASA = '00000000-0000-4000-8000-0000000000ca'
function fakeAdmin({ codes = [], releaseCode = 'ok', authFails = false, rpcThrows = false } = {}) {
  const calls = []
  let n = 0
  return {
    calls,
    auth: { admin: { getUserById: async (id) => { if (authFails) throw new Error('auth down'); return { data: { user: { email: id === CASA ? HOUSE : 'pessoa@x.test' } } } } } },
    rpc: async (name, args) => {
      calls.push([name, args])
      if (rpcThrows) throw new Error('rede')
      if (name === 'release_kling4_trial') return releaseCode === 'error' ? { data: null, error: { message: 'function release_kling4_trial does not exist' } } : { data: { code: releaseCode }, error: null }
      const c = codes[n++] ?? 'ok'
      return { data: c === 'ok' ? { code: 'ok', reserved_milliusd: 2355 } : { code: c }, error: null }
    },
  }
}
const resp = (status, body = { request_id: 'req-1' }) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const STILL = 'https://x/s1.jpg'
const ARGS = { prompts: ['a', 'b', 'c'], approvedStills: [STILL, null, null], timing: { voiceovers: ['one two', 'three four', 'five six'], wordsPerSecond: 2.3 } }

async function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  let B, K
  try {
    B = await import(await mod(S.budget, { '@/lib/internalAccounts': internal }))
    K = await import(await mod(S.trial, { '@/lib/kling4TrialBudget': await mod(S.budget, { '@/lib/internalAccounts': internal }), '@/lib/textLanguage': lang }))
  } catch (e) { t(false, 'módulos carregam: ' + e.message); return out }

  // ── A. o envio ──
  const submitCom = async (status) => { try { await K.submitKling4TrialVideo(ARGS, { apiKey: 'k', fetchImpl: async () => resp(status) }); return null } catch (e) { return e } }
  const e403 = await submitCom(403)
  const e422 = await submitCom(422)
  const e500 = await submitCom(500)
  t(e403 instanceof K.Kling4TrialRefusedError && e403.status === 403 && e403.message === 'kling4_http_403', 'A1 403 da fal (sem saldo) = recusa explícita, mensagem de sempre no log')
  t(e422 instanceof K.Kling4TrialRefusedError, 'A2 422 (validação) também é recusa: nada foi enfileirado')
  t(e500 && !(e500 instanceof K.Kling4TrialRefusedError) && e500.message === 'kling4_http_500', 'A3 500 continua ambíguo (a fal pode ter aceitado)')

  // ── B. o orquestrador ──
  const orq = async (submitErr, { releaseThrows = false } = {}) => {
    let released = 0
    const r = await K.orchestrateKling4Trial({
      reserve: async () => ({ allowed: true, reservedUsd: 2.355, release: async () => { released++; if (releaseThrows) throw new Error('x'); return true } }),
      submit: async () => { if (submitErr) throw submitErr; return { requestId: 'r', model: 'm', submittedAt: 'now' } },
    })
    return { r, released }
  }
  let o = await orq(new K.Kling4TrialRefusedError(403))
  t(o.released === 1 && o.r.engineUsed === 'seedance15_fallback' && o.r.costUsd === 0 && o.r.reason === 'provider_refused', 'B1 recusa 4xx: devolve a reserva 1 vez, custo 0, filme no motor barato')
  o = await orq(new Error('kling4_http_500'))
  t(o.released === 0 && o.r.costUsd === 2.355 && o.r.reason === 'provider_submit_failed', 'B2 5xx/timeout: NÃO devolve, custo conservador de sempre')
  const pre = await (async () => { let released = 0; const r = await K.orchestrateKling4Trial({ reserve: async () => ({ allowed: true, release: async () => { released++ } }), submit: () => K.submitKling4TrialVideo(ARGS, { apiKey: '' }) }); return { r, released } })()
  t(pre.released === 0 && pre.r.reason === 'provider_not_submitted' && pre.r.costUsd === 0, 'B3 falha antes do POST: não devolve (comportamento de sempre)')
  o = await orq(new K.Kling4TrialRefusedError(403), { releaseThrows: true })
  t(o.r.engineUsed === 'seedance15_fallback' && o.r.reason === 'provider_refused', 'B4 devolução que falha não derruba o filme')
  o = await orq(null)
  t(o.released === 0 && o.r.engineUsed === 'kling4', 'B5 envio aceito: nada devolvido')
  const teto = await K.orchestrateKling4Trial({ reserve: async () => ({ allowed: false, reason: 'teto_24h' }), submit: async () => { throw new Error('não deveria enviar') } })
  t(teto.engineUsed === 'seedance15_fallback' && teto.reason === 'teto_24h' && teto.costUsd === 0, 'B6 teto_24h do banco: motor barato, sem envio')

  // ── C. a reserva ──
  let adm = fakeAdmin()
  let r = await B.reserveKling4Trial(adm, { jobId: 'job-1', userId: U, country: 'br' })
  const args1 = adm.calls[0]?.[1] ?? {}
  t(r.allowed === true && typeof r.release === 'function' && Object.keys(args1).sort().join(',') === 'p_country,p_job_id,p_user_id' && args1.p_country === 'BR', 'C1 conta de fora: os 3 argumentos de sempre (código vale antes da migration)')
  adm = fakeAdmin()
  r = await B.reserveKling4Trial(adm, { jobId: 'job-2', userId: CASA })
  t(adm.calls[0]?.[1]?.p_cap_24h === false, 'C2 a casa passa p_cap_24h=false (fora da regra das 24 h)')
  adm = fakeAdmin({ authFails: true })
  r = await B.reserveKling4Trial(adm, { jobId: 'job-3', userId: CASA })
  t(!('p_cap_24h' in (adm.calls[0]?.[1] ?? {})), 'C3 leitura da casa falhou: fica na regra das 24 h (lado seguro)')
  adm = fakeAdmin({ codes: ['teto_24h'] })
  r = await B.reserveKling4Trial(adm, { jobId: 'job-4', userId: U })
  t(r.allowed === false && r.reason === 'teto_24h' && !('release' in r), 'C4 teto_24h → não reserva, nada a devolver')
  adm = fakeAdmin({ codes: ['ok'] })
  r = await B.reserveKling4Trial(adm, { jobId: 'job-5', userId: U })
  await r.release()
  const rel = adm.calls.find(([n]) => n === 'release_kling4_trial')
  t(rel && rel[1].p_job_id === 'job-5' && rel[1].p_user_id === U && Object.keys(rel[1]).length === 2, 'C5 a devolução da reserva aceita aponta para o MESMO pedido')
  adm = fakeAdmin({ codes: ['cap'] })
  r = await B.reserveKling4Trial(adm, { jobId: 'job-6', userId: U })
  t(r.allowed === false && r.reason === 'cap', 'C6 teto do dia continua igual')

  // ── D. a devolução ──
  t(await B.releaseKling4Trial(fakeAdmin({ releaseCode: 'unchanged' }), { jobId: 'j', userId: U }) === true, 'D1 unchanged = já devolvida')
  t(await B.releaseKling4Trial(fakeAdmin({ releaseCode: 'error' }), { jobId: 'j', userId: U }) === false, 'D2 função ainda inexistente no banco = false, sem lançar')
  t(await B.releaseKling4Trial(fakeAdmin({ rpcThrows: true }), { jobId: 'j', userId: U }) === false, 'D3 rede caiu = false, sem lançar')
  t(await B.releaseKling4Trial(fakeAdmin(), { jobId: 'j', userId: 'nao-e-uuid' }) === false, 'D4 identidade inválida = false')

  // ── E. o caso real de 08/11: fal sem saldo, 403 em todo envio ──
  let dia = 0
  const real = {
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'pessoa@x.test' } } }) } },
    rpc: async (name) => {
      if (name === 'reserve_kling4_trial') { dia += 2355; return { data: { code: 'ok', reserved_milliusd: 2355 }, error: null } }
      dia -= 2355; return { data: { code: 'ok' }, error: null }
    },
  }
  const resultados = []
  for (const [i, who] of ['H', 'H', 'B', 'B', 'H'].entries()) {
    resultados.push(await K.orchestrateKling4Trial({
      reserve: () => B.reserveKling4Trial(real, { jobId: `08-11-${who}-${i}`, userId: U }),
      submit: () => K.submitKling4TrialVideo(ARGS, { apiKey: 'k', fetchImpl: async () => resp(403, { detail: 'User is locked. Reason: Exhausted balance.' }) }),
    }))
  }
  t(dia === 0 && resultados.every((x) => x.reason === 'provider_refused' && x.costUsd === 0), `E1 08/11: os 5 cliques recusados por falta de saldo devolvem tudo ao dia (sobra US$ ${(dia / 1000).toFixed(2)})`)

  // ── F. a migration ──
  const apl = S.sql.slice(S.sql.indexOf('APLICAR'), S.sql.indexOf('CONFERÊNCIA (logo'))
  const fn = apl.slice(apl.indexOf('create function public.reserve_kling4_trial'), apl.indexOf('create or replace function public.release_kling4_trial'))
  t(/p_cap_24h boolean default true/.test(fn), 'F1 parâmetro novo com padrão TRUE (a regra vale assim que aplicar)')
  t(apl.indexOf('drop function if exists public.reserve_kling4_trial(text, uuid, text);') > 0 && apl.indexOf('drop function') < apl.indexOf('create function public.reserve_kling4_trial'), 'F2 a de 3 parâmetros sai na MESMA transação, antes da nova (sem ambiguidade)')
  const iUser = fn.indexOf("'kling4-trial-user:'"), iDia = fn.indexOf('for update'), iRegra = fn.indexOf("'teto_24h'"), iCap = fn.indexOf("'cap'")
  t(iUser > 0 && iDia > iUser && iRegra > iDia && iCap > iRegra, 'F3 a regra das 24 h vem DEPOIS da trava por conta e da linha do dia (fecha os 2 cliques no mesmo segundo)')
  t(/f\.user_id = p_user_id and f\.reserved_milliusd = 2355 and f\.reserved_at >= v_since/.test(fn) && /other\.fingerprint_hash = mine\.fingerprint_hash/.test(fn) && /interval '24 hours'/.test(fn), 'F4 conta E aparelho, reservas de US$ 2,355 nas últimas 24 h')
  const rel2 = apl.slice(apl.indexOf('create or replace function public.release_kling4_trial'))
  t(/update public\.kling4_trial_films set released_at = now\(\) where/.test(rel2) && /greatest\(reserved_milliusd - 2355, 0\)/.test(rel2) && /engine_used = 'kling4' then return/.test(rel2), 'F5 a devolução devolve ao DIA e marca a linha, sem zerá-la (as 24 h seguem contando); filme entregue no Kling 4 nunca devolve')
  t(/grant execute on function public\.reserve_kling4_trial\(text, uuid, text, boolean\), public\.release_kling4_trial\(text, uuid\) to service_role/.test(apl) && /from public, anon, authenticated/.test(apl) && /^begin;[\s\S]*^commit;/m.test(apl), 'F6 só a service_role executa; tudo numa transação')
  const conf = S.sql.slice(S.sql.indexOf('CONFERÊNCIA (logo'), S.sql.indexOf('DESFAZER'))
  t(/begin;\s*do \$\$/.test(conf) && /end \$\$;\s*rollback;/.test(conf) && /CONFERENCIA OK/.test(conf) && /teto_24h/.test(conf) && /'unchanged'/.test(conf), 'F7 conferência numa transação DESFEITA, com o ensaio de reserva, teto, casa, devolução e aparelho')
  const desf = S.sql.slice(S.sql.indexOf('DESFAZER'))
  t(/drop function if exists public\.reserve_kling4_trial\(text, uuid, text, boolean\)/.test(desf) && /create function public\.reserve_kling4_trial\(p_job_id text, p_user_id uuid, p_country text\)/.test(desf) && /drop column if exists released_at/.test(desf), 'F8 desfazer volta a função de 3 parâmetros e tira a coluna')
  return out
}

for (const [c, m] of await suite(SRC)) ok(c, m)
const MUTANTS = [
  ['recusa não devolve', 'trial', 'try { await reservation.release?.() }', 'try { void 0 }'],
  ['4xx vira ambíguo', 'trial', 'response.status >= 400 && response.status < 500', 'response.status >= 500'],
  ['5xx também devolve', 'trial', 'response.status >= 400 && response.status < 500', 'response.status >= 400'],
  ['recusa cobra US$ 2,355', 'trial', "return { engineUsed: 'seedance15_fallback', costUsd: 0, reason: 'provider_refused' }", "return { engineUsed: 'seedance15_fallback', costUsd: KLING4_TRIAL_COST_USD, reason: 'provider_refused' }"],
  ['todo mundo passa p_cap_24h', 'budget', '...(casa ? { p_cap_24h: false } : {})', 'p_cap_24h: !casa'],
  ['casa entra na regra', 'budget', '...(casa ? { p_cap_24h: false } : {})', ''],
  ['teto_24h ignorado', 'budget', "|| row.code === 'teto_24h') return", ') return'],
  ['devolução aponta para outro pedido', 'budget', "release: () => releaseKling4Trial(admin, i) }", "release: () => releaseKling4Trial(admin, { ...i, jobId: 'x' }) }"],
  ['devolução lança', 'budget', '  } catch { return false }\n}\n\n/** One result', '  } finally { }\n}\n\n/** One result'],
  ['regra antes da trava do dia', 'sql', "  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial-user:' || p_user_id::text, 0));\n", ''],
  ['padrão FALSE', 'sql', 'p_cap_24h boolean default true', 'p_cap_24h boolean default false'],
  ['devolução zera a linha', 'sql', 'update public.kling4_trial_films set released_at = now() where', 'update public.kling4_trial_films set released_at = now(), reserved_milliusd = 0 where'],
  ['conferência sem rollback', 'sql', 'end $$;\nrollback;', 'end $$;\ncommit;'],
]
for (const [name, key, from, to] of MUTANTS) {
  if (!SRC[key].includes(from)) { ok(false, `mutante "${name}": trecho não encontrado`); continue }
  let res
  try { res = await suite({ ...SRC, [key]: SRC[key].replace(from, to) }) } catch { res = [[false, 'lançou']] } // mutante que faz o código lançar também é pego
  ok(res.some(([c]) => !c), `mutante "${name}" é pego`)
}
console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
