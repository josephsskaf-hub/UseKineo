// KINEO-STUDIO-CLS-2026-10-13 + KINEO-PAINEL-ORIGEM-2026-10-13 — guardião dos dois consertos aprovados pelo fundador (13/10).
//
// A) TELA DO /studio PULANDO (Clarity: CLS 1,4; Edge sem cabeça, visitante 1440×900: 0,345 → 0,007):
//   (1) o <style> de layout do Studio (grade, palco, abas) vem ANTES do conteúdo — não no fim do JSX;
//   (2) o cartão do primeiro filme (MrrFirstFilm, chega depois de 3 fetches) mora EMBAIXO da caixa da ideia; vazio, some;
//   (3) o pôster do vídeo do motor de abertura (o LCP) ganha <link rel=preload fetchPriority=high>;
//   (4) RegionPaidOnlyBanner reserva o lugar da faixa enquanto /api/region-pass responde (caixa vazia, sem texto/evento);
//   (5) TrialActiveBanner reserva o cabeçalho quando o SERVIDOR já sabe que ele abre (as 4 guardas, executadas aqui), e a
//       reserva sai na 1ª resposta, na falha e na dispensa;
// B) PAINEL /admin "SALDO E NO QUE GASTOU" — "+14 sem origem" nas contas de região:
//   (6) os presentes que o código concede entram no razão (clipe e filme grátis de região, recarga semanal com anulação,
//       cortesia e o vencimento dela, prêmio de post, subida p/ Business, concessão antiga, revogação), só quando o evento
//       PROVA o crédito; o caso mrmzedits3 (5 + 9 + 9 bônus − 9 gastos = 14) fecha em 0;
//   (7) a rota lê os eventos, soma na equação e escreve os termos;
//   (8) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Nenhum import com alias @/ no guardião (readFileSync + carregador offline).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const F = {
  STUDIO: 'app/(dashboard)/studio/StudioClient.tsx',
  PAGE: 'app/(dashboard)/studio/page.tsx',
  REGION: 'components/RegionPaidOnlyBanner.tsx',
  TRIAL: 'components/TrialActiveBanner.tsx',
  LAYOUT: 'app/(dashboard)/layout.tsx',
  RESERVE: 'lib/layout/trialBannerReserve.ts',
  GRANTS: 'lib/admin/ledgerGrants.ts',
  LIVE: 'app/api/admin/live/route.ts',
}
const src = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, read(v)]))

// ── (1)–(3) StudioClient e page ─────────────────────────────────────────────────────────────────────────────────────────
function checkStudio(t) {
  const ret = t.indexOf('<div className="stu composer-proposal"')
  const styleTop = t.indexOf('<style dangerouslySetInnerHTML={{ __html: STUDIO_LAYOUT_CSS }} />')
  const h1 = t.indexOf('<h1>', ret)
  const grid = t.indexOf('className="grid composer-proposal-grid"', ret)
  const fnEnd = t.indexOf('\nconst STUDIO_LAYOUT_CSS = `')
  const body = ret >= 0 && fnEnd > ret ? t.slice(ret, fnEnd) : ''
  const css = fnEnd >= 0 ? t.slice(fnEnd) : ''
  const styles = (body.match(/<style /g) ?? []).length
  return {
    topo: ret >= 0 && styleTop > ret && h1 > styleTop && grid > styleTop,
    tresEstilos: styles === 3, // kit, cor do motor, layout — todos no topo
    nenhumNoFim: body.lastIndexOf('<style ') < h1,
    ordem: body.indexOf('STUDIO_KIT_CSS') < body.indexOf('STAGE_CSS') && body.indexOf('STAGE_CSS') < body.indexOf('STUDIO_LAYOUT_CSS'),
    cssCompleto: css.includes('.composer-proposal .composer-proposal-grid{grid-template-columns:minmax(460px,1fr) minmax(0,1.6fr)')
      && css.includes('.studio-modes{display:flex') && css.includes('.studio-engine-hero{grid-column:2') && !css.includes('${'),
    cartaoEmbaixo: (() => {
      const ta = t.indexOf('<textarea className="studio-prompt"')
      const card = t.indexOf('<MrrFirstFilm ')
      return ta > 0 && card > ta && (t.match(/<MrrFirstFilm /g) ?? []).length === 1
    })(),
    slot: t.includes('<div className="studio-first-film-slot"><MrrFirstFilm ') && css.includes('.studio-first-film-slot:empty{display:none}'),
  }
}
const s = checkStudio(src.STUDIO)
ok(s.topo, '(1) <style> do layout do Studio vem ANTES do <h1> e da grade')
ok(s.tresEstilos && s.nenhumNoFim, '(1) os 3 <style> da tela estão no topo; nenhum depois do conteúdo')
ok(s.ordem, '(1) a ordem da cascata é a de antes: kit → cor do motor → layout')
ok(s.cssCompleto, '(1) STUDIO_LAYOUT_CSS tem a grade, as abas e o palco, sem interpolação')
ok(s.cartaoEmbaixo, '(2) o cartão do primeiro filme mora embaixo da caixa da ideia (uma vez só)')
ok(s.slot, '(2) o lugar do cartão some quando ele não aparece (:empty)')
ok(src.STUDIO.includes("{!prompt.trim() && scriptMode !== 'clip' && <div className=\"studio-first-film-slot\"><MrrFirstFilm historyEmpty={firstFilmHistoryEmpty} trialActive={trialOn} hasPaid={contaPaga} shortFilmAllowed={entrada15} balance={balance} /></div>}"),
  '(2) mesma regra de quem vê o cartão e mesmas props (nenhuma regra mudou)')
ok(/<link rel="preload" as="image" href=\{lcpPoster\} fetchPriority="high" \/>/.test(src.PAGE)
  && src.PAGE.includes("const lcpPoster = engineHeroes[SEEDANCE_15S_PUBLIC ? 'seedance' : 'fast']?.[0]?.poster")
  && src.STUDIO.includes("useState<EngineKey>(SEEDANCE_15S_PUBLIC ? 'seedance' : 'fast')"),
'(3) preload do pôster do motor de ABERTURA (o mesmo padrão do useState do StudioClient)')

// ── (4) RegionPaidOnlyBanner ────────────────────────────────────────────────────────────────────────────────────────────
function checkRegion(t) {
  const fn = t.slice(t.indexOf('function RegionStripReserve()'), t.indexOf('function useRegionFilmGift'))
  return {
    espera: t.includes('if (firstFilmOffer === undefined) return <RegionStripReserve />') && !t.includes('if (firstFilmOffer === undefined) return null'),
    vazia: /aria-hidden="true"/.test(fn) && /data-region-strip-reserve="1"/.test(fn) && /\n\s*\/>\n\s*\)\n\}/.test(fn) && !fn.includes('trackEvent') && !fn.includes('copy.'),
    altura: t.includes("REGION_STRIP_RESERVE_MIN_HEIGHT = 'clamp(142px, calc(262px - 15vw), 196px)'") && fn.includes('minHeight: REGION_STRIP_RESERVE_MIN_HEIGHT') && fn.includes("margin: '12px 16px 0'"),
  }
}
const r = checkRegion(src.REGION)
ok(r.espera, '(4) esperando /api/region-pass: a reserva no lugar do null')
ok(r.vazia, '(4) a reserva é uma caixa vazia: aria-hidden, sem texto, sem evento')
ok(r.altura, '(4) a reserva tem a margem da faixa e a altura do pôster de 110 px (+ respiro), maior no celular')

// ── (5) TrialActiveBanner + layout + guardas executadas ─────────────────────────────────────────────────────────────────
function checkTrial(t) {
  return {
    prop: t.includes('export default function TrialActiveBanner({ userKey, reserve = false }: { userKey: string; reserve?: boolean })'),
    dispensa: t.includes("if (window.localStorage.getItem(dismissKey) === '1') { setSettled(true); return }"),
    resposta: /if \(cancelled\) return\n\s*setSettled\(true\)[^\n]*\n\s*const trial = data\.trial/.test(t),
    falha: /Falha de rede não vira upsell[^\n]*\n\s*if \(!cancelled\) setSettled\(true\)/.test(t),
    so: /if \(reserve && !settled\) \{\n\s*return \(\n\s*<div\n\s*aria-hidden="true"\n\s*data-trial-banner-reserve="1"/.test(t),
  }
}
const tb = checkTrial(src.TRIAL)
ok(tb.prop, '(5) TrialActiveBanner aceita `reserve` (padrão false: nenhuma outra tela muda)')
ok(tb.dispensa && tb.resposta && tb.falha, '(5) a reserva sai na dispensa, na 1ª resposta e na falha do /api/credits')
ok(tb.so, '(5) a reserva só existe com reserve && !settled, vazia e aria-hidden')
ok(src.LAYOUT.includes("trial_ends_at, trial_credits_used, trial_credits_granted') // KINEO-STUDIO-CLS-2026-10-13")
  && src.LAYOUT.includes('<TrialActiveBanner userKey={user.id.slice(0, 8)} reserve={trialBannerReserveExpected(profile as Parameters<typeof trialBannerReserveExpected>[0])} />'),
'(5) o layout lê as 3 colunas do trial e passa a reserva decidida no servidor')

const NOW = Date.parse('2026-10-13T12:00:00Z')
const base = { trial_status: 'active', trial_ends_at: '2026-10-15T12:00:00Z', trial_credits_used: 0, trial_credits_granted: 10, plan: 'free', has_paid: false }
function reserveCases(transform = null, env = { KINEO_REVERSE_TRIAL_ENABLED: 'true' }) {
  const load = createOfflineLoader({ env, source: transform })
  const { trialBannerReserveExpected: f } = load(F.RESERVE)
  return {
    ativo: f(base, NOW) === true,
    pagou: f({ ...base, has_paid: true }, NOW) === false,
    starter: f({ ...base, plan: 'starter' }, NOW) === false,
    business: f({ ...base, plan: 'business' }, NOW) === false,
    semGrant: f({ ...base, trial_credits_granted: 0 }, NOW) === false,
    vencido: f({ ...base, trial_ends_at: '2026-10-12T12:00:00Z' }, NOW) === false,
    teto: f({ ...base, trial_credits_used: 10 }, NOW) === false,
    regiao: f({ ...base, trial_status: 'region_paid_only' }, NOW) === false,
    nulo: f(null, NOW) === false,
  }
}
const rc = reserveCases()
ok(rc.ativo, '(5) trial ativo, sem pagar, com crédito e prazo → reserva')
ok(rc.pagou && rc.starter && rc.business, '(5) pagou ou tem plano (Starter/Business…) → sem reserva (guarda 2 do banner)')
ok(rc.semGrant && rc.vencido && rc.teto && rc.regiao && rc.nulo, '(5) sem crédito, vencido, teto, região ou sem perfil → sem reserva')
ok(reserveCases(null, {}).ativo === false, '(5) flag do reverse trial desligada → sem reserva (o banner nem monta)')

// ── (6) presentes do razão, executados ──────────────────────────────────────────────────────────────────────────────────
function grantCases(transform = null) {
  const load = createOfflineLoader({ source: transform })
  const g = load(F.GRANTS)
  const d = g.ledgerGrantDelta
  const ev = (name, metadata, at, uid = 'u1') => ({ user_id: uid, name, metadata, created_at: at })
  // O caso real (SELECT de 13/10): mrmzedits3@gmail.com — region_paid_only, saldo 14, trial 0, 1 débito de 9 sem estorno,
  // +9 admin_credits_granted (devolução do filme que falhou na narração).
  const mrmz = g.summarizeLedgerGrants([
    ev('region_free_clip_granted', { source: 'signup', country: 'PK', credits: 5, granted: true }, '2026-10-13T09:40:35.191Z', 'mrmz'),
    ev('region_free_film_granted', { source: 'signup', country: 'PK', credits: 9, granted: true, quality: 'cinematic_ai', seconds: 15, balance_before: 5 }, '2026-10-13T09:40:35.361Z', 'mrmz'),
  ]).get('mrmz') ?? { total: 0, terms: [] }
  const saldo = 14, trial = 0, bonus = 9, spent = 9, refunded = 0, revoked = 0, bought = 0, subs = 0
  const gap = saldo - (trial + bonus + mrmz.total + bought + subs + refunded - spent - revoked)
  const semanal = g.summarizeLedgerGrants([
    ev('free_weekly_film_granted', { granted: 9 }, '2026-10-01T00:00:00Z'),
    ev('free_weekly_film_grant_voided', { granted: 0, reason: 'race' }, '2026-10-01T00:00:01Z'),
    ev('free_weekly_film_granted', { granted: 6 }, '2026-10-09T00:00:00Z'),
  ]).get('u1') ?? { total: NaN, terms: [] }
  const cortesia = g.summarizeLedgerGrants([
    ev('admin_courtesy_granted', { credits: 300 }, '2026-10-01T00:00:00Z'),
    ev('admin_courtesy_expired', { credits_removed: 120 }, '2026-10-08T00:00:00Z'),
  ]).get('u1') ?? { total: NaN, terms: [] }
  return {
    mrmzTotal: mrmz.total === 14,
    mrmzTermos: mrmz.terms.join(' | ') === '+ 5 Region free clip | + 9 Region free film',
    mrmzGap: gap === 0,
    naoDeu: d('region_free_clip_granted', { credits: 5, granted: false }) === 0 && d('region_free_film_granted', { credits: 9, granted: false }) === 0,
    semanal: semanal.total === 6 && semanal.terms.join() === '+ 6 Free weekly film',
    cortesia: cortesia.total === 180 && cortesia.terms.join(' | ') === '+ 300 Courtesy | − 120 Courtesy expired',
    business: d('business_upgrade_credits_granted', { credits_delta: 400, credits_granted: false }) === 0 && d('business_upgrade_credits_granted', { credits_delta: 400, credits_granted: true }) === 400,
    antigo: d('admin_credit_granted', { amount: 1000, status: 'completed' }) === 1000 && d('admin_credit_granted', { amount: 1000, status: 'pending' }) === 0,
    revogado: d('admin_credits_revoked', { credits_revoked: 30 }) === -30,
    post: d('post_reward_claimed', { credits: 10 }) === 10,
    lixo: d('region_free_film_granted', null) === 0 && d('desconhecido', { credits: 9 }) === 0 && d('admin_courtesy_granted', { credits: 'abc' }) === 0,
    lista: !g.LEDGER_GRANT_EVENTS.includes('admin_br_trial_recredited') && !g.LEDGER_GRANT_EVENTS.includes('admin_credits_granted')
      && ['region_free_clip_granted', 'region_free_film_granted', 'free_weekly_film_granted', 'free_weekly_film_grant_voided', 'admin_courtesy_granted', 'admin_courtesy_expired', 'post_reward_claimed', 'business_upgrade_credits_granted', 'admin_credit_granted', 'admin_credits_revoked'].every((n) => g.LEDGER_GRANT_EVENTS.includes(n)),
  }
}
const gc = grantCases()
ok(gc.mrmzTotal && gc.mrmzTermos, '(6) mrmzedits3: +5 Region free clip e +9 Region free film, com rótulo legível')
ok(gc.mrmzGap, '(6) mrmzedits3: 0 trial + 9 bônus + 14 presentes − 9 gastos = 14 = saldo → 0 sem origem')
ok(gc.naoDeu, '(6) presente com granted:false (a escrita perdeu a corrida) NÃO entra')
ok(gc.semanal, '(6) recarga semanal: o carimbo anulado (voided) sai; a recarga que entrou fica')
ok(gc.cortesia, '(6) cortesia soma e o vencimento dela tira (credits_removed)')
ok(gc.business && gc.antigo && gc.revogado && gc.post, '(6) Business (só com credits_granted), concessão antiga (completed), revogação e prêmio de post')
ok(gc.lixo, '(6) metadata nula, evento desconhecido ou número ilegível = 0')
ok(gc.lista, '(6) a lista tem os 10 eventos e NÃO tem o recrédito BR (já é "trial") nem o admin_credits_granted (já é "bônus")')

// ── (7) a rota do painel ────────────────────────────────────────────────────────────────────────────────────────────────
function checkLive(t) {
  return {
    importa: t.includes("import { LEDGER_GRANT_EVENTS, summarizeLedgerGrants, type LedgerGrantEvent } from '@/lib/admin/ledgerGrants'"),
    le: t.includes(".from('events').select('user_id, name, created_at, metadata').in('name', [...LEDGER_GRANT_EVENTS]).in('user_id', ids)"),
    junta: t.includes('affiliatesPromise, courtesyPromise, giftsPromise,') && t.includes('subsRes, affiliatesRes, courtesyRes, giftsRes] = await Promise.all(['),
    soma: /const expected = trialGranted \+ lg\.bonus \+ gifts\.total \+ lg\.bought \+ subs\.total \+ lg\.refunded - lg\.spent - lg\.revoked/.test(t),
    termos: t.includes('for (const t of gifts.terms) terms.push(t)'),
    gap: t.includes('const ledgerGap = saldoReal === null || ledgerNote ? 0 : saldoReal - expected'),
  }
}
const lv = checkLive(src.LIVE)
ok(lv.importa && lv.le && lv.junta, '(7) /api/admin/live lê os eventos de presente das pessoas online (all-time, paginado)')
ok(lv.soma && lv.gap, '(7) a equação soma os presentes antes de medir o "sem origem"')
ok(lv.termos, '(7) a linha do razão escreve cada presente com o rótulo')

// ── (8) mutantes ────────────────────────────────────────────────────────────────────────────────────────────────────────
const mut = (name, base, a, b, check) => {
  const m = base.split(a).join(b)
  ok(m !== base, `mutante aplicou: ${name}`)
  ok(!check(m), `mutante fica vermelho: ${name}`)
}
mut('style de layout fora do topo', src.STUDIO,
  "      <style dangerouslySetInnerHTML={{ __html: STUDIO_LAYOUT_CSS }} />\n", '',
  (t) => checkStudio(t).topo)
mut('style de layout depois do <h1>', src.STUDIO,
  '<h1><UiLabel>Studio</UiLabel></h1>', '<h1><UiLabel>Studio</UiLabel></h1><style dangerouslySetInnerHTML={{ __html: STUDIO_LAYOUT_CSS }} />',
  (t) => checkStudio(t).tresEstilos && checkStudio(t).nenhumNoFim)
mut('cartão do primeiro filme de volta para cima da caixa', src.STUDIO,
  '<textarea className="studio-prompt"', '<div className="studio-first-film-slot"><MrrFirstFilm historyEmpty={false} trialActive={null} hasPaid={null} shortFilmAllowed={false} balance={null} /></div><textarea className="studio-prompt"',
  (t) => checkStudio(t).cartaoEmbaixo)
mut('faixa de região volta a esperar com null', src.REGION,
  'if (firstFilmOffer === undefined) return <RegionStripReserve />', 'if (firstFilmOffer === undefined) return null',
  (t) => checkRegion(t).espera)
mut('reserva do trial nunca sai na falha', src.TRIAL,
  'if (!cancelled) setSettled(true)', '',
  (t) => checkTrial(t).falha)
mut('equação sem os presentes', src.LIVE, 'lg.bonus + gifts.total + lg.bought', 'lg.bonus + lg.bought', (t) => checkLive(t).soma)
// Mutantes executados (carregador com a fonte trocada): cada um precisa ter trocado o texto E virar vermelho.
const trocou = (rel, a) => (p, text) => {
  if (p !== rel) return text
  if (!text.includes(a)) throw new Error(`mutante não aplicou em ${rel}: ${a}`)
  return text
}
{
  const a = 'm.granted === true ? Math.max(0, num(m.credits)) : 0'
  let aplicou = false
  const res = grantCases((p, text) => { trocou(F.GRANTS, a)(p, text); if (p === F.GRANTS) { aplicou = true; return text.split(a).join('Math.max(0, num(m.credits))') } return text })
  ok(aplicou, 'mutante aplicou: presente de região sem olhar granted')
  ok(!res.naoDeu, 'mutante fica vermelho: presente de região sem olhar granted')
}
{
  const a = "if (r.name === 'free_weekly_film_grant_voided') {"
  let aplicou = false
  const res = grantCases((p, text) => { trocou(F.GRANTS, a)(p, text); if (p === F.GRANTS) { aplicou = true; return text.split(a).join("if (r.name === 'nunca') {") } return text })
  ok(aplicou, 'mutante aplicou: anulação da recarga semanal ignorada')
  ok(!res.semanal, 'mutante fica vermelho: anulação da recarga semanal ignorada')
}
{
  const a = 'if (profile.has_paid === true) return false'
  let aplicou = false
  const res = reserveCases((p, text) => { trocou(F.RESERVE, a)(p, text); if (p === F.RESERVE) { aplicou = true; return text.split(a).join('') } return text })
  ok(aplicou, 'mutante aplicou: reserva do trial para quem já pagou')
  ok(!res.pagou, 'mutante fica vermelho: reserva do trial para quem já pagou')
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
