// KINEO-K4-TETO-FILME-LONGO-1711 — guardião do teto diário do Kling 4 grátis com clipe de 16 a 20 s. Sem rede, sem banco, sem fal.
//   A. a régua da reserva: sem clipe / 15 s = 2355 (hoje); 16 s = 2512; 20 s = 3140; fora da faixa = sem reserva;
//   B. teto 15 = igual a hoje: a chamada ao banco leva os MESMOS argumentos (sem p_reserve_milliusd) e devolve US$ 2,355;
//   C. teto 20: voz de 19,8 s → clipe 20 → reserva 3140 (US$ 3,14); banco que devolve outro valor = sem reserva; banco sem a
//      migration (parâmetro desconhecido) = sem reserva → motor barato; filme de 15 s com teto 20 → reserva 2355, como hoje;
//   D. o acerto: o código aceita custo 0 ou 2,355 a 3,14; a migration grava a RESERVA do filme como custo (preço exato do clipe);
//   E. a migration: faixas nos CHECKs, função antiga sai na mesma transação, padrão 2355, regra das 24 h por reserved_milliusd > 0,
//      devolução da reserva inteira, só service_role; F. a rota passa o clipe medido à reserva, DEPOIS da medição; o interruptor fica 15.
// A parte E é leitura do texto. A parte G executa o SQL em PGlite só com K4_PGLITE=<.../@electric-sql/pglite/dist/index.js>;
// sem ela, G é pulada e o SQL NÃO roda. Rodar: node scripts/test-k4-teto-filme-longo-1711.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import('typescript')).default
const dir = mkdtempSync(join(tmpdir(), 'k4teto-'))
let seq = 0
const mod = async (src, links = {}) => {
  let o = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const [a, b] of Object.entries(links)) o = o.split(`'${a}'`).join(`'${b}'`)
  const f = join(dir, `m${seq++}.mjs`); writeFileSync(f, o); return pathToFileURL(f).href
}
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const internal = await mod(`export const isInternalEmail = (e) => String(e ?? '').toLowerCase() === 'casa@kineo.test'`)
const P = await import(await mod(read('lib/kling4TrialPolicy.ts')))
const B = await import(await mod(read('lib/kling4TrialBudget.ts'), { '@/lib/internalAccounts': internal }))
const U = '00000000-0000-4000-8000-0000000000a1'
function fakeAdmin(reply) {
  const calls = []
  return {
    calls,
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'pessoa@x.test' } } }) } },
    rpc: async (name, args) => { calls.push([name, args]); return reply(name, args) },
  }
}
// O banco depois da migration: devolve a reserva pedida (padrão 2355). Antes dela: parâmetro novo = erro do PostgREST.
const bancoNovo = (_n, a) => ({ data: { code: 'ok', reserved_milliusd: a.p_reserve_milliusd ?? 2355 }, error: null })
const bancoVelho = (_n, a) => 'p_reserve_milliusd' in a ? { data: null, error: { message: 'Could not find the function public.reserve_kling4_trial(p_country, p_job_id, p_reserve_milliusd, p_user_id)' } } : { data: { code: 'ok', reserved_milliusd: 2355 }, error: null }

console.log('== A. régua da reserva ==')
ok(B.kling4TrialReserveMilliusd() === 2355 && B.kling4TrialReserveMilliusd(null) === 2355 && B.kling4TrialReserveMilliusd(15) === 2355, 'A1 sem clipe ou 15 s = 2355 (hoje)')
ok(B.kling4TrialReserveMilliusd(16) === 2512 && B.kling4TrialReserveMilliusd(20) === 3140, 'A2 16 s = 2512; 20 s = 3140')
ok(B.kling4TrialReserveMilliusd(21) === null && B.kling4TrialReserveMilliusd(14) === null && B.kling4TrialReserveMilliusd(16.5) === null, 'A3 21 s, 14 s e fração = sem reserva')
ok(B.KLING4_TRIAL_MILLIUSD_PER_SECOND === Math.round(P.KLING4_TRIAL_USD_PER_SECOND * 1000), 'A4 157 milésimos/s = KLING4_TRIAL_USD_PER_SECOND da política')
for (const s of [15, 16, 17, 18, 19, 20]) ok(B.kling4TrialReserveMilliusd(s) === Math.round(P.kling4TrialClipCostUsd(s) * 1000), `A5 ${s} s: reserva = kling4TrialClipCostUsd`)

console.log('== B. teto 15 = igual a hoje ==')
ok(P.KLING4_TRIAL_MAX_SECONDS === 15, 'B1 interruptor KLING4_TRIAL_MAX_SECONDS continua 15 (quem liga é a CEO)')
{ const clip = P.kling4TrialClipSeconds(15.2, P.KLING4_TRIAL_MAX_SECONDS) // a rota só grava clipSeconds quando passa de 15
  const a = fakeAdmin(bancoVelho)
  const r = await B.reserveKling4Trial(a, { jobId: 'job-1', userId: U, country: 'us', clipSeconds: clip > 15 ? clip : undefined })
  ok(r.allowed && r.reservedUsd === 2.355, 'B2 reserva aceita a US$ 2,355')
  ok(JSON.stringify(a.calls) === JSON.stringify([['reserve_kling4_trial', { p_job_id: 'job-1', p_user_id: U, p_country: 'US' }]]), 'B3 argumentos EXATOS de hoje (sem p_reserve_milliusd): vale com o banco de hoje') }
{ const a = fakeAdmin(bancoNovo); const r = await B.reserveKling4Trial(a, { jobId: 'job-1b', userId: U, country: 'US' })
  ok(r.allowed && r.reservedUsd === 2.355 && !('p_reserve_milliusd' in a.calls[0][1]), 'B4 depois da migration: o mesmo') }
ok(P.kling4TrialClipSeconds(16, 15) === null && P.kling4TrialClipSeconds(20, 15) === null, 'B5 teto 15: voz de 16 a 20 s nem vira clipe (o caminho de hoje decide: encaixe ou reserva)')

console.log('== C. teto 20 ==')
{ const clip = P.kling4TrialClipSeconds(19.8, 20)
  const a = fakeAdmin(bancoNovo)
  const r = await B.reserveKling4Trial(a, { jobId: 'job-2', userId: U, country: 'BR', clipSeconds: clip })
  ok(clip === 20 && r.allowed && r.reservedUsd === 3.14, 'C1 voz de 19,8 s → clipe 20 → reserva US$ 3,14')
  ok(a.calls[0][1].p_reserve_milliusd === 3140, 'C2 o banco recebe p_reserve_milliusd = 3140') }
{ const a = fakeAdmin(bancoNovo); const r = await B.reserveKling4Trial(a, { jobId: 'job-3', userId: U, country: 'BR', clipSeconds: P.kling4TrialClipSeconds(16.4, 20) })
  ok(r.allowed && r.reservedUsd === 2.669 && a.calls[0][1].p_reserve_milliusd === 2669, 'C3 voz de 16,4 s → clipe 17 → reserva 2669') }
{ const a = fakeAdmin(() => ({ data: { code: 'ok', reserved_milliusd: 2355 }, error: null }))
  const r = await B.reserveKling4Trial(a, { jobId: 'job-4', userId: U, clipSeconds: 20 })
  ok(!r.allowed && r.reason === 'unavailable', 'C4 banco que reserva MENOS que o clipe = sem Kling 4 (nunca gasta acima do reservado)') }
{ const a = fakeAdmin(bancoVelho); const r = await B.reserveKling4Trial(a, { jobId: 'job-5', userId: U, clipSeconds: 20 })
  ok(!r.allowed && r.reason === 'unavailable', 'C5 código antes da migration: clipe de 20 s fica sem reserva → motor barato') }
{ const clip = P.kling4TrialClipSeconds(14.9, 20)
  const a = fakeAdmin(bancoNovo); const r = await B.reserveKling4Trial(a, { jobId: 'job-6', userId: U, clipSeconds: clip > 15 ? clip : undefined })
  ok(clip === 15 && r.allowed && r.reservedUsd === 2.355 && !('p_reserve_milliusd' in a.calls[0][1]), 'C6 filme de 15 s com teto 20 → reserva 2355, chamada de hoje') }
{ const a = fakeAdmin(bancoNovo); const r = await B.reserveKling4Trial(a, { jobId: 'job-7', userId: U, clipSeconds: 21 })
  ok(!r.allowed && a.calls.length === 0, 'C7 clipe acima de 20 s nem chama o banco') }
{ const a = fakeAdmin(() => ({ data: { code: 'cap' }, error: null })); const r = await B.reserveKling4Trial(a, { jobId: 'job-8', userId: U, clipSeconds: 20 })
  ok(!r.allowed && r.reason === 'cap', "C8 teto do dia cheio para 3140 = 'cap' → motor barato") }

console.log('== D. acerto ==')
const rec = async (costUsd, engineUsed = 'kling4') => { const a = fakeAdmin(() => ({ data: { code: 'ok' }, error: null })); const r = await B.recordKling4TrialFilm(a, { jobId: 'job-2', userId: U, engineUsed, costUsd }); return { r, a } }
{ const x = await rec(2.355); ok(x.r && x.a.calls[0][1].p_cost_milliusd === 2355, 'D1 o marcador de hoje (2,355) segue gravando') }
{ const x = await rec(3.14); ok(x.r && x.a.calls[0][1].p_cost_milliusd === 3140, 'D2 3,14 aceito') }
{ const x = await rec(0, 'seedance15_cap'); ok(x.r && x.a.calls[0][1].p_cost_milliusd === 0, 'D3 custo 0 aceito') }
for (const c of [1, 2.354, 3.141, 5]) { const x = await rec(c); ok(!x.r && x.a.calls.length === 0, `D4 custo ${c} recusado sem chamar o banco`) }

console.log('== E. migration (leitura do texto; não roda sem pglite) ==')
const sql = read('supabase/migrations/20261117180000_kling4_trial_clip_longo.sql')
const corpo = (nome) => { const i = sql.indexOf(`function public.${nome}(`); const j = sql.indexOf('$$;', i); return i < 0 || j < 0 ? '' : sql.slice(i, j) }
ok(/^begin;$/m.test(sql) && /^commit;$/m.test(sql), 'E1 uma transação')
ok(sql.includes('check (reserved_milliusd = 0 or reserved_milliusd between 2355 and 3140)'), 'E2 CHECK da reserva: 0 ou 2355..3140')
ok(sql.includes('check ((cost_milliusd = 0 or cost_milliusd between 2355 and 3140) and cost_milliusd <= reserved_milliusd)'), 'E3 CHECK do custo: 0 ou 2355..3140 e ≤ reserva')
ok(sql.indexOf('drop function public.reserve_kling4_trial(text, uuid, text, boolean);') > 0 && sql.indexOf('drop function public.reserve_kling4_trial(text, uuid, text, boolean);') < sql.indexOf('create function public.reserve_kling4_trial('), 'E4 a assinatura antiga sai antes da nova, na mesma transação (sem sobrecarga)')
const reserve = corpo('reserve_kling4_trial')
ok(reserve.includes('p_cap_24h boolean default true') && reserve.includes('p_reserve_milliusd integer default 2355'), 'E5 parâmetros com padrão: a chamada de hoje (3 ou 4 argumentos) resolve com 2355')
ok(reserve.includes('v_amount not between 2355 and 3140') && reserve.includes('v_reserved + v_amount > 60000') && reserve.includes("'reserved_milliusd', v_amount"), 'E6 reserva valida a faixa, testa o teto com o valor do clipe e devolve esse valor')
ok((reserve.match(/f\.reserved_milliusd > 0/g) ?? []).length === 2 && !/2355\b(?! and 3140)(?!;)/.test(reserve.replace('default 2355', '')), 'E7 regra das 24 h por reserved_milliusd > 0 (conta e aparelho); nenhum 2355 fixo fora da faixa')
ok(/revoke all on function public\.reserve_kling4_trial\(text, uuid, text, boolean, integer\) from public, anon, authenticated;/.test(sql) && /grant execute on function public\.reserve_kling4_trial\(text, uuid, text, boolean, integer\) to service_role;/.test(sql), 'E8 reserva nova: só service_role')
const record = corpo('record_kling4_trial_film')
ok(record.includes('v_cost := case when p_cost_milliusd > 0 then v_film.reserved_milliusd else 0 end') && record.includes('cost_milliusd = v_cost'), 'E9 acerto grava a reserva do filme (preço exato do clipe) como custo')
ok(record.includes('p_cost_milliusd > coalesce(v_film.reserved_milliusd, 0)') && record.includes("coalesce(v_film.reserved_milliusd, 0) < 2355"), 'E10 acerto nunca acima da reserva; Kling 4 sem reserva continua recusado')
ok(record.includes("'seconds', case when v_cost > 0 then v_cost / 157 else 15 end"), 'E11 o evento diz os segundos reais (2355 → 15, como hoje)')
ok(corpo('transition_kling4_trial_fallback').includes('v_film.reserved_milliusd < 2355') && !corpo('transition_kling4_trial_fallback').includes('<> 2355'), 'E12 troca Kling → Seedance aceita a faixa')
const release = corpo('release_kling4_trial')
ok(release.includes('reserved_milliusd - v_film.reserved_milliusd') && release.includes('v_film.reserved_milliusd < 2355') && !release.includes('<> 2355'), 'E13 devolução devolve a reserva inteira do filme')
ok(/grant execute on function public\.record_kling4_trial_film\(text, uuid, text, text, integer\), public\.transition_kling4_trial_fallback\(text, uuid\),\n  public\.release_kling4_trial\(text, uuid\) to service_role;/.test(sql) && !/grant[^;]*\bto (anon|authenticated|public)\b/.test(sql), 'E14 só service_role em todas')

// Parecer da revisão (17/11): duas transições inválidas fechadas sob a mesma trava.
ok(release.includes("if v_film.engine_used = 'kling4' or coalesce(v_film.cost_milliusd, 0) > 0 then return jsonb_build_object('code', 'unavailable')"), 'E15 devolução recusa filme com custo positivo registrado (reserva → custo → troca → devolução)')
ok(record.includes('or (p_cost_milliusd > 0 and v_film.released_at is not null)'), 'E16 acerto recusa custo positivo em reserva já devolvida (reserva → devolução → custo)')

// G. SQL de verdade (PGlite em memória), só quando K4_PGLITE aponta para package/dist/index.js do @electric-sql/pglite.
if (process.env.K4_PGLITE) {
  console.log('== G. SQL executado em PGlite (banco descartável em memória) ==')
  const { PGlite } = await import(pathToFileURL(process.env.K4_PGLITE).href)
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create table public.events(id uuid primary key, name text, user_id uuid, path text, metadata jsonb);
    create table public.trial_signup_fingerprints(user_id uuid, fingerprint_hash text);
    grant select, insert, update on public.events, public.trial_signup_fingerprints to service_role;`)
  await db.exec(read('supabase/migrations/20261029011109_kling4_trial_daily_budget.sql'))
  await db.exec(read('supabase/migrations/20261029021044_kling4_trial_async_fallback.sql'))
  await db.exec(read('docs/migracoes-pendentes/20261111_kling4_trial_release.sql').split('commit;')[0] + 'commit;')
  await db.exec(sql.replace(/notify pgrst[^\n]*\n?/, ''))
  const call = async (fn, args) => {
    const e = Object.entries(args)
    await db.exec('set role service_role;')
    try { return (await db.query(`select public.${fn}(${e.map(([k], i) => `${k} => $${i + 1}`).join(',')}) as r`, e.map(([, v]) => v))).rows[0].r }
    finally { await db.exec('reset role;') }
  }
  const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const res = (j, u) => call('reserve_kling4_trial', { p_job_id: j, p_user_id: uid(u), p_country: 'br', p_reserve_milliusd: 3140 })
  const rel = (j, u) => call('release_kling4_trial', { p_job_id: j, p_user_id: uid(u) })
  const reg = (j, u, eng, c) => call('record_kling4_trial_film', { p_job_id: j, p_user_id: uid(u), p_country: 'br', p_engine_used: eng, p_cost_milliusd: c })
  const dia = async () => Number((await db.query('select coalesce(sum(reserved_milliusd),0) n from public.kling4_trial_days')).rows[0].n)
  const filme = async (j) => (await db.query('select * from public.kling4_trial_films where job_id = $1', [j])).rows[0]
  { // 1. reservar 3140 → custo 3140 → troca → devolver: recusado; o dia segue 3140
    await res('g1', 1); await reg('g1', 1, 'kling4', 3140)
    const t = await call('transition_kling4_trial_fallback', { p_job_id: 'g1', p_user_id: uid(1) })
    const r = await rel('g1', 1); const f = await filme('g1')
    ok(t.code === 'ok' && r.code === 'unavailable' && (await dia()) === 3140 && f.released_at === null && f.cost_milliusd === 3140, 'G1 custo registrado não volta ao teto: devolução = unavailable, dia 3140') }
  { // 2. reservar → devolver → custo Kling: recusado; nada gravado
    await db.exec('truncate public.kling4_trial_films, public.kling4_trial_days, public.events;')
    await res('g2', 2); const r1 = await rel('g2', 2); const r = await reg('g2', 2, 'kling4', 2355); const f = await filme('g2')
    ok(r1.code === 'ok' && r.code === 'unavailable' && f.cost_milliusd === null && f.recorded_at === null && (await dia()) === 0, 'G2 custo positivo depois da devolução = unavailable, nada gravado')
    // 3. custo zero do fallback depois de devolver continua aceito; 4. devolver de novo continua unchanged
    const r0 = await reg('g2', 2, 'seedance15_fallback', 0); const f0 = await filme('g2')
    ok(r0.code === 'ok' && f0.cost_milliusd === 0 && f0.engine_used === 'seedance15_fallback', 'G3 custo 0 do fallback depois da devolução continua aceito')
    const r2 = await rel('g2', 2)
    ok(r2.code === 'unchanged' && (await dia()) === 0, 'G4 devolver duas vezes continua unchanged; dia segue 0') }
  { // 5. caminho bom intacto: reserva → 4xx → devolver → custo 0
    await db.exec('truncate public.kling4_trial_films, public.kling4_trial_days, public.events;')
    await res('g5', 5); const r = await rel('g5', 5)
    ok(r.code === 'ok' && r.released_milliusd === 3140 && (await dia()) === 0, 'G5 devolução normal (sem custo) continua devolvendo 3140') }
  await db.close()
} else console.log('== G. pulado: sem K4_PGLITE, o SQL NÃO foi executado ==')

console.log('== F. rota e anúncio ==')
const rota = read('app/api/generate-video-cinematic/route.ts')
const iMede = rota.indexOf('if (clipK4 !== null && clipK4 > 15) kling4Timing.clipSeconds = clipK4')
const iReserva = rota.indexOf('reserveKling4Trial(cinematicAdmin, { jobId: generationId, userId: user.id, country: paisDoRequest(req.headers), clipSeconds: kling4Timing.clipSeconds })')
ok(iMede > 0 && iReserva > iMede, 'F1 a rota reserva com o clipe medido, DEPOIS da medição da voz')
const disp = read('lib/kling4TrialAvailability.ts')
ok(disp.includes('kling4TrialReserveMilliusd(KLING4_TRIAL_MAX_SECONDS) ?? 2355'), 'F2 o anúncio conta o pior caso do teto (15 = 2355)')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
