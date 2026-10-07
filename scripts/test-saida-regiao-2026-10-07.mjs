// KINEO-SAIDA-REGIAO-2026-10-07 — guardião da saída de quem nasce 'region_paid_only' (fundador 07/10: "vai pra tudo").
// (a) FILME GRÁTIS DE 15 s: UM Seedance 1.5 de 15 s por conta 'region_paid_only', como o teste do resto do mundo.
// (b) PASSE AVULSO NA MOEDA LOCAL: ?pack=starter na parede e logo depois do filme grátis, na moeda da Stripe.
// Interruptores num lugar só (lib/freeFilmPolicy.ts): REGION_FREE_FILM_LIVE e REGION_PASS_OFFER_LIVE.
//
// EXECUTA o código real com banco e Stripe FALSOS (loader offline; alias @/ por caminho; rede e SDK proibidos):
//   1. o grant só em 'region_paid_only' — lib/reverseTrial.ts executado: PK ganha o filme; US e sem país vão ao teste;
//   2. um filme por pessoa — grant só na transição (2º login e pedido concorrente não dão de novo); a admissão REAL do
//      cinematic (bloco da rota executado) conta a vida da conta, sem janela; a trava REAL depois do claim também;
//   3. o bloqueio por abuso preservado — e-mail descartável e digital estourada viram 'blocked', sem filme; o filme
//      concedido queima a vaga do aparelho (o teste e o filme dividem as 2 ativações por digital em 30 dias);
//   4. o passe com o preço da fórmula regional — lib/regionPass.ts == buildPackAndRedirect da rota REAL (BR/PT-BR/IN/US);
//   5. o free consegue comprar o passe — GET REAL da rota de checkout com Stripe falso; a recarga segue fechada ao free;
//      sem login, o pack segue pedindo o cadastro (a compra de convidado só existe para assinatura);
//   6. os interruptores desligados devolvem o comportamento de hoje — lib/reverseTrial.ts desligado ≡ o mesmo arquivo SEM
//      os blocos novos (os dois executados lado a lado, traço a traço); a rota não consulta o banco; a oferta diz 'off';
//      telas com o interruptor na frente.
// Cada regra tem mutante; cada mutante prova por grep que foi aplicado e PRECISA ficar vermelho.
// Os interruptores são forçados em memória (ligado e desligado): o guardião vale nos dois commits (OFF e ON).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => {
  let v = false
  try { v = typeof cond === 'function' ? cond() : cond } catch (e) { v = false; nome += ` (lançou: ${e instanceof Error ? e.message : String(e)})` }
  if (v) { ok += 1; console.log('  ✓ ' + nome); return true }
  falhas.push(nome); console.error('  ✗ ' + nome); return false
}
const trocar = (src, de, para) => {
  if (src.split(de).length !== 2) throw new Error('âncora do mutante ausente/ambígua: ' + de.slice(0, 90))
  return src.replace(de, () => para)
}
const transpila = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText

const POL = 'lib/freeFilmPolicy.ts'
const RT = 'lib/reverseTrial.ts'
const PASS = 'lib/regionPass.ts'
const CIN = 'app/api/generate-video-cinematic/route.ts'
const CHK = 'app/api/stripe/checkout/route.ts'
const ROTA = 'app/api/region-pass/route.ts'
const EVT = 'app/api/events/route.ts'
const WH = 'app/api/stripe/webhook/route.ts'
const UPG = 'components/offers/ConversionUpgrade.tsx'
const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'
const BAN = 'components/RegionPaidOnlyBanner.tsx'
const LAY = 'app/(dashboard)/layout.tsx'
const OFERTA = 'components/RegionPassOffer.tsx'

const AGORA = Date.parse('2026-10-07T18:00:00Z')
class DataFixa extends Date {
  constructor(...a) { super(...(a.length ? a : [AGORA])) }
  static now() { return AGORA }
}
const ENV = {
  KINEO_REVERSE_TRIAL_ENABLED: 'true',
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
  KINEO_TRIAL_FINGERPRINT_SALT: 'sal-de-teste',
}

// ── interruptores forçados em memória (o arquivo em disco nunca é tocado) ─────────────────────────────────────────────
function comInterruptores(src, { filme, passe }) {
  const F = /^export const REGION_FREE_FILM_LIVE = (true|false)$/m
  const P = /^export const REGION_PASS_OFFER_LIVE = (true|false)$/m
  if (!F.test(src) || !P.test(src)) throw new Error('interruptor ausente em lib/freeFilmPolicy.ts (precisa ser `export const … = true|false` numa linha)')
  return src.replace(F, `export const REGION_FREE_FILM_LIVE = ${filme}`).replace(P, `export const REGION_PASS_OFFER_LIVE = ${passe}`)
}
function carrega({ filme = true, passe = true, over = {}, mocks = {}, env = {} } = {}) {
  return createOfflineLoader({
    mocks,
    env,
    globals: { Date: DataFixa },
    source: (rel, text) => {
      const t = over[rel] ?? text
      return rel === POL ? comInterruptores(t, { filme, passe }) : t
    },
  })
}

// ── banco falso do cadastro (profiles + digitais), com o mesmo contrato do supabase-js usado em lib/reverseTrial.ts ──
function bancoTrial({ perfil = {}, digitais = [], visaoAntiga = false } = {}) {
  const estado = {
    perfil: { id: 'u-1', trial_status: null, plan: 'free', has_paid: false, video_credits: 0, ...perfil },
    digitais: digitais.map((d) => ({ ...d })),
    ops: [],
    leiturasPerfil: 0,
  }
  return {
    estado,
    from(tabela) {
      const st = { tabela, op: 'select', cols: null, patch: null, filtros: [], head: false }
      const casa = (row) => st.filtros.every(([k, c, v]) => (k === 'eq' || k === 'is') ? row[c] === v : k === 'gte' ? String(row[c]) >= String(v) : k === 'neq' ? row[c] !== v : true)
      const exec = () => {
        estado.ops.push({ tabela: st.tabela, op: st.op, cols: st.cols, patch: st.patch, filtros: st.filtros })
        if (st.tabela === 'profiles') {
          if (st.op === 'update') {
            if (!casa(estado.perfil)) return { data: [], error: null }
            Object.assign(estado.perfil, st.patch)
            return { data: [{ id: estado.perfil.id }], error: null }
          }
          estado.leiturasPerfil += 1
          const v = { ...estado.perfil }
          // a 1ª leitura viu o perfil ANTES de outro pedido (do mesmo cadastro) marcar a região
          if (visaoAntiga && estado.leiturasPerfil === 1) v.trial_status = null
          return { data: v, error: null }
        }
        if (st.tabela === 'trial_signup_fingerprints') {
          if (st.op === 'insert') {
            estado.digitais.push({ ...st.patch, created_at: new Date(AGORA).toISOString() })
            return { data: null, error: null }
          }
          return { data: null, count: estado.digitais.filter(casa).length, error: null }
        }
        return { data: [], error: null }
      }
      const q = {
        select(cols, opts) { st.cols = cols ?? null; if (opts?.head) st.head = true; return q },
        update(p) { st.op = 'update'; st.patch = p; return q },
        insert(v) { st.op = 'insert'; st.patch = v; return q },
        eq(c, v) { st.filtros.push(['eq', c, v]); return q },
        is(c, v) { st.filtros.push(['is', c, v]); return q },
        gte(c, v) { st.filtros.push(['gte', c, v]); return q },
        neq(c, v) { st.filtros.push(['neq', c, v]); return q },
        maybeSingle() { return Promise.resolve(exec()) },
        single() { return Promise.resolve(exec()) },
        then(res, rej) { return Promise.resolve(exec()).then(res, rej) },
      }
      return q
    },
  }
}

/** maybeActivateReverseTrial REAL, com banco falso. `db` reaproveitado = a mesma conta (2º login). */
async function ativa({ filme = true, over = {}, country = 'PK', email = 'pessoa@example.com', fp = 'fp-a', perfil = {}, digitais = [], visaoAntiga = false, db = null } = {}) {
  const banco = db ?? bancoTrial({ perfil, digitais, visaoAntiga })
  const eventos = []
  const load = carrega({
    filme,
    passe: false,
    over,
    env: ENV,
    mocks: {
      '@supabase/supabase-js': { createClient: () => banco },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
    },
  })
  const R = load(RT)
  const r = await R.maybeActivateReverseTrial({ userId: 'u-1', email, userCreatedAt: new Date(AGORA - 60_000).toISOString(), fingerprintHash: fp, country })
  return { r, db: banco, eventos, perfil: banco.estado.perfil, digitais: banco.estado.digitais, ops: banco.estado.ops, teste: R.TRIAL_GRANT_CREDITS }
}
const temEvento = (eventos, nome) => eventos.some((e) => e.name === nome)
const evento = (eventos, nome) => eventos.find((e) => e.name === nome)

// lib/reverseTrial.ts SEM os blocos novos — a "base" que o interruptor desligado tem de reproduzir.
function semSaidaRegiao(src) {
  const corta = (s, ini, fim, incluiFim) => {
    const a = s.indexOf(ini)
    if (a < 0) throw new Error('bloco novo ausente: ' + ini.slice(0, 70))
    const b = s.indexOf(fim, a)
    if (b < 0) throw new Error('fim do bloco novo ausente: ' + fim.slice(0, 70))
    return s.slice(0, a) + s.slice(incluiFim ? b + fim.length : b)
  }
  let s = src
  s = corta(s, 'import { REGION_FREE_FILM_LIVE, REGION_FREE_FILM_GRANTED_EVENT', '// KINEO-SAIDA-REGIAO-2026-10-07\n', true)
  s = corta(s, '      // KINEO-SAIDA-REGIAO-2026-10-07 (a) — com o filme grátis de região ligado', "        return { activated: false, reason: 'fingerprint_limit' }\n      }\n", true)
  s = corta(s, '      // KINEO-SAIDA-REGIAO-2026-10-07 (a) — os créditos de UM filme', '        await concederFilmeDeRegiao(db, args)\n      }\n', true)
  s = corta(s, '// ═══ KINEO-SAIDA-REGIAO-2026-10-07 (a) — o filme grátis de região, no cadastro', '/**\n * Contabilidade do HARD CAP', false)
  if (/REGION_FREE_FILM|concederFilmeDeRegiao|digitalBarraFilmeDeRegiao/.test(s)) throw new Error('a reconstrução da base ainda tem código novo')
  return s
}

// ══ 1. as regras puras (lib/freeFilmPolicy.ts) ═══════════════════════════════════════════════════════════════════════
function provaRegras(over = {}) {
  const p = []
  const L = carrega({ filme: true, passe: true, over })
  const P = L(POL)
  const W = L('lib/freeWeeklyFilm.ts')
  const C = L('lib/credits/engineCost.ts')
  const custo15 = C.creditCostForDuration('cinematic_ai', true, 15)
  if (P.REGION_FREE_FILM_CREDITS !== custo15 || P.REGION_FREE_FILM_CREDITS !== W.FREE_WEEKLY_FILM_CREDITS) p.push(`créditos do filme (${P.REGION_FREE_FILM_CREDITS}) ≠ custo cobrado de 15 s (${custo15}) / cota semanal (${W.FREE_WEEKLY_FILM_CREDITS})`)
  if (P.REGION_FREE_FILM_QUALITY !== W.FREE_WEEKLY_FILM_QUALITY || P.REGION_FREE_FILM_SECONDS !== W.FREE_WEEKLY_FILM_SECONDS) p.push('o filme de região não é o mesmo Seedance 1.5 / 15 s da cota semanal')
  if (P.regionFreeFilmGrantCredits() !== custo15) p.push('o cadastro não soma exatamente 1 filme')
  const reg = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 14 }
  // só 'region_paid_only' sem pagar, plano grátis
  if (P.regionFreeFilmEligibility(reg) !== 'eligible') p.push('região sem pagar não é elegível')
  for (const st of ['active', 'expired', 'downgraded', 'converted', 'blocked', 'card_required', null]) {
    if (P.regionFreeFilmEligibility({ ...reg, trial_status: st }) !== 'not_region') p.push(`trial_status ${st} virou elegível ao filme de região`)
  }
  if (P.regionFreeFilmEligibility({ ...reg, has_paid: true }) !== 'paid') p.push('quem pagou continua elegível')
  if (P.regionFreeFilmEligibility({ ...reg, plan: 'starter' }) !== 'paid') p.push('quem tem plano continua elegível')
  if (P.regionFreeFilmEligibility(null) !== 'not_region') p.push('sem perfil virou elegível')
  // admissão: só Seedance 1.5, 15 s, e nenhum filme na vida da conta
  const adm = (o) => P.regionFreeFilmAdmissible({ quality: 'cinematic_ai', durationSeconds: 15, eligibility: 'eligible', priorFilms: 0, ...o })
  if (!adm({})) p.push('o 1º filme de 15 s não é admitido')
  if (adm({ priorFilms: 1 })) p.push('2º filme admitido (um por pessoa)')
  if (adm({ priorFilms: null })) p.push('contagem que falhou admitiu')
  if (adm({ durationSeconds: 35 })) p.push('35 s admitido')
  if (adm({ quality: 'cinematic_kling' })) p.push('Kling admitido')
  if (adm({ eligibility: 'not_region' })) p.push('não elegível admitido')
  // a trava depois do claim
  const exc = (o) => P.regionFreeFilmExclusive({ otherActiveHold: false, lifetimeCinematicDebits: 0, ...o })
  if (!exc({})) p.push('trava barrou o 1º filme')
  if (exc({ otherActiveHold: true })) p.push('trava deixou passar pedido simultâneo')
  if (exc({ lifetimeCinematicDebits: 1 })) p.push('trava deixou passar quem já gastou um filme')
  if (exc({ lifetimeCinematicDebits: null })) p.push('trava passou com a leitura falhando')
  // a faixa do filme
  if (!P.regionFreeFilmAvailable(reg, 0)) p.push('faixa não anuncia o filme a quem tem')
  if (P.regionFreeFilmAvailable(reg, 1)) p.push('faixa anuncia o filme depois do 1º vídeo')
  if (P.regionFreeFilmAvailable({ ...reg, video_credits: custo15 - 1 }, 0)) p.push('faixa anuncia o filme sem o saldo dele')
  if (P.regionFreeFilmAvailable({ ...reg, has_paid: true }, 0)) p.push('faixa anuncia o filme a quem pagou')
  // texto: com o filme ligado, nenhuma faixa nova diz "não disponível no seu país"; a recusa antiga continua a mesma
  const nega = /not available|não está disponível|no está disponible/i
  for (const tab of ['REGION_FREE_FILM_NOTICE', 'REGION_FREE_CLIP_NOTICE_FILM_LIVE', 'REGION_PLANS_NOTICE_FILM_LIVE']) {
    for (const lang of ['en', 'pt', 'es']) {
      const c = P[tab]?.[lang]
      if (!c || !c.title?.trim() || !c.body?.trim() || !c.cta?.trim()) p.push(`${tab}.${lang} vazio`)
      else if (nega.test(`${c.title} ${c.body}`)) p.push(`${tab}.${lang} diz "não disponível no seu país" com o filme ligado`)
    }
  }
  if (!/\b15\b/.test(P.REGION_FREE_FILM_NOTICE.en.body)) p.push('a faixa do filme não diz que ele é de 15 s')
  if (nega.test(P.REGION_FREE_FILM_REFUSAL) || !/Nothing was charged/.test(P.REGION_FREE_FILM_REFUSAL)) p.push('recusa com o filme ligado mente ou não diz que nada foi cobrado')
  if (P.REGION_PAID_ONLY_REFUSAL !== `${P.REGION_PAID_ONLY_NOTICE.en.title}. ${P.REGION_PAID_ONLY_NOTICE.en.body} Nothing was charged.`) p.push('a recusa de hoje mudou')
  // desligado: nada disto existe
  const D = carrega({ filme: false, passe: false, over })(POL)
  if (D.regionFreeFilmEligibility(reg) !== 'disabled' || D.regionFreeFilmGrantCredits() !== 0 || D.regionFreeFilmAvailable(reg, 0)) p.push('interruptor desligado ainda dá filme')
  return p
}

// ══ 2/3. o cadastro: grant só na região, um por pessoa, abuso ═══════════════════════════════════════════════════════
async function provaGrant(over = {}) {
  const p = []
  const W = carrega({ filme: true, passe: false, over })(POL)
  const filme = W.REGION_FREE_FILM_CREDITS
  const clipe = W.REGION_FREE_CLIP_CREDITS
  // (1) PK — região: marca, clipe de sempre E o filme; a digital queima 1 vaga
  const pk = await ativa({ over, country: 'PK', fp: 'fp-pk' })
  const g = evento(pk.eventos, 'region_free_film_granted')
  if (!(pk.r.reason === 'region_paid_only' && pk.perfil.trial_status === 'region_paid_only')) p.push(`PK não virou region_paid_only (${pk.r.reason})`)
  if (pk.perfil.video_credits !== clipe + filme) p.push(`PK com ${pk.perfil.video_credits} cr (esperado clipe ${clipe} + filme ${filme})`)
  if (!(g && g.metadata?.granted === true && g.metadata?.credits === filme && g.metadata?.seconds === 15 && g.metadata?.country === 'PK')) p.push('sem region_free_film_granted (granted, 15 s, país) no PK')
  if (!temEvento(pk.eventos, 'trial_region_excluded') || !temEvento(pk.eventos, 'region_free_clip_granted')) p.push('o PK perdeu o evento da região ou o clipe')
  if (temEvento(pk.eventos, 'trial_credits_granted') || pk.perfil.trial_status === 'active') p.push('o PK ganhou o TESTE (não é o filme de região)')
  if (pk.digitais.filter((d) => d.fingerprint_hash === 'fp-pk' && d.outcome === 'activated').length !== 1) p.push('o filme concedido não queimou a vaga do aparelho')
  // (1) US e sem país — fora da regra: o teste de sempre, nenhum filme de região
  for (const country of ['US', null]) {
    const t = await ativa({ over, country, fp: 'fp-us' })
    if (!(t.r.activated === true && t.perfil.trial_status === 'active')) p.push(`${country ?? 'sem país'} não recebeu o teste`)
    if (temEvento(t.eventos, 'region_free_film_granted') || t.perfil.video_credits !== t.teste) p.push(`${country ?? 'sem país'} recebeu o filme de região (saldo ${t.perfil.video_credits}, teste ${t.teste})`)
  }
  // (2) um por pessoa: 2º login da mesma conta não dá de novo
  const de2 = await ativa({ over, country: 'PK', db: pk.db })
  if (de2.r.reason !== 'trial_already_used' || de2.perfil.video_credits !== clipe + filme || temEvento(de2.eventos, 'region_free_film_granted')) p.push('2º login deu o filme de novo')
  // (2) pedido concorrente perdedor: leu o perfil antes do outro marcar → não marca, não dá clipe nem filme
  const perdedor = await ativa({ over, country: 'PK', visaoAntiga: true, perfil: { trial_status: 'region_paid_only', video_credits: clipe + filme } })
  if (perdedor.perfil.video_credits !== clipe + filme || temEvento(perdedor.eventos, 'region_free_film_granted')) p.push(`pedido concorrente deu o filme de novo (saldo ${perdedor.perfil.video_credits})`)
  // (2) nunca por cima de outro crédito: saldo de indicação 4 → 4 + clipe? não (clipe exige 0) → 4 + filme
  const comSaldo = await ativa({ over, country: 'PK', fp: 'fp-saldo', perfil: { video_credits: 4 } })
  if (comSaldo.perfil.video_credits !== 4 + filme) p.push(`filme escreveu por cima do saldo (4 → ${comSaldo.perfil.video_credits})`)
  // (3) abuso: e-mail descartável → blocked, nada
  const desc = await ativa({ over, country: 'PK', email: 'farm@mailinator.com', fp: 'fp-desc' })
  if (desc.perfil.trial_status !== 'blocked' || desc.perfil.video_credits !== 0 || temEvento(desc.eventos, 'region_free_film_granted')) p.push('descartável ganhou o filme de região')
  // (3) abuso: digital com 2 ativações em 30 dias → blocked, evento com scope, nada de filme nem clipe
  const doisDias = new Date(AGORA - 2 * 86_400_000).toISOString()
  const estourada = await ativa({ over, country: 'PK', fp: 'fp-farm', digitais: [
    { fingerprint_hash: 'fp-farm', outcome: 'activated', created_at: doisDias },
    { fingerprint_hash: 'fp-farm', outcome: 'activated', created_at: doisDias },
  ] })
  const bl = evento(estourada.eventos, 'trial_blocked_fingerprint')
  if (estourada.r.reason !== 'fingerprint_limit' || estourada.perfil.trial_status !== 'blocked' || estourada.perfil.video_credits !== 0) p.push(`digital estourada não foi barrada (${estourada.r.reason}, ${estourada.perfil.trial_status}, ${estourada.perfil.video_credits} cr)`)
  if (!(bl && bl.metadata?.scope === 'region_free_film' && bl.metadata?.country === 'PK')) p.push('barrado sem o evento trial_blocked_fingerprint (scope/país)')
  if (temEvento(estourada.eventos, 'region_free_film_granted') || temEvento(estourada.eventos, 'region_free_clip_granted')) p.push('digital estourada ganhou filme ou clipe')
  if (!estourada.digitais.some((d) => d.fingerprint_hash === 'fp-farm' && d.outcome === 'blocked')) p.push('o bloqueio não ficou na tabela de digitais (/admin/trial-abuse)')
  // (3) o filme divide a cota do aparelho com o teste: 2 filmes no mesmo aparelho, o 3º cadastro é barrado
  const banco = []
  for (let i = 0; i < 3; i++) {
    const r = await ativa({ over, country: 'PK', fp: 'fp-casa', digitais: banco })
    banco.splice(0, banco.length, ...r.digitais)
    if (i < 2 && !temEvento(r.eventos, 'region_free_film_granted')) p.push(`${i + 1}º cadastro do aparelho não ganhou o filme`)
    if (i === 2 && (r.perfil.trial_status !== 'blocked' || temEvento(r.eventos, 'region_free_film_granted'))) p.push('3º cadastro do mesmo aparelho ganhou o filme (a vaga não foi queimada)')
  }
  return p
}

// ══ 6a. desligado ≡ base (lib/reverseTrial.ts executado lado a lado com a versão SEM os blocos novos) ═══════════════
async function provaOffBase(over = {}) {
  const p = []
  const atual = over[RT] ?? rd(RT)
  let base
  try { base = semSaidaRegiao(atual) } catch (e) { return [`reconstrução da base falhou: ${e.message}`] }
  const doisDias = new Date(AGORA - 2 * 86_400_000).toISOString()
  const cenarios = [
    { country: 'PK' },
    { country: 'IN', fp: null },
    { country: 'US' },
    { country: null },
    { country: 'PK', email: 'farm@mailinator.com' },
    { country: 'PK', fp: 'fp-farm', digitais: [{ fingerprint_hash: 'fp-farm', outcome: 'activated', created_at: doisDias }, { fingerprint_hash: 'fp-farm', outcome: 'activated', created_at: doisDias }] },
    { country: 'PK', visaoAntiga: true, perfil: { trial_status: 'region_paid_only', video_credits: 5 } },
    { country: 'PK', perfil: { trial_status: 'downgraded', video_credits: 3 } },
    { country: 'PK', perfil: { has_paid: true, plan: 'starter', video_credits: 60 } },
    { country: 'PK', perfil: { video_credits: 4 } },
  ]
  const traco = (x) => JSON.stringify({ r: x.r, perfil: x.perfil, ops: x.ops, eventos: x.eventos, digitais: x.digitais })
  for (const c of cenarios) {
    const desligado = await ativa({ ...c, filme: false, over })
    const hoje = await ativa({ ...c, filme: false, over: { ...over, [RT]: base } })
    if (traco(desligado) !== traco(hoje)) p.push(`desligado ≠ hoje no cenário ${JSON.stringify(c).slice(0, 90)}`)
  }
  // a oferta do passe desligada: JSON 'off' e o clique vai ao pack de sempre, sem evento
  const PS = carrega({ filme: false, passe: false, over })(PASS)
  const reg = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 0 }
  const j = PS.decideRegionPassRequest({ userId: 'u-1', profile: reg, surface: 'wall', go: false, ipCountry: 'BR', acceptLanguage: 'pt-BR' })
  const g = PS.decideRegionPassRequest({ userId: 'u-1', profile: reg, surface: 'wall', go: true, ipCountry: 'BR', acceptLanguage: 'pt-BR' })
  if (!(j.kind === 'json' && j.body.eligible === false && j.event === null)) p.push('oferta desligada respondeu elegível ou gravou evento')
  if (!(g.kind === 'redirect' && g.location === PS.PLAIN_PASS_CHECKOUT_HREF && g.event === null)) p.push('clique com a oferta desligada gravou evento ou mudou o destino')
  // a admissão REAL da rota desligada: false e NENHUMA consulta
  const adm = await rodaAdmissao(blocoAdmissao(over), { filme: false, over, perfil: reg })
  if (adm.adm !== false || adm.consultas.length !== 0) p.push(`admissão desligada admitiu (${adm.adm}) ou consultou o banco (${adm.consultas.length})`)
  return p
}

// ══ 2/6b. o cinematic: blocos REAIS da rota executados ════════════════════════════════════════════════════════════════
const INI_ADM = '    // ═══ KINEO-SAIDA-REGIAO-2026-10-07 (a) [TRAVA 8.2 — "vai pra tudo" do fundador 07/10] — ADMISSÃO DO FILME GRÁTIS DE REGIÃO'
const FIM_ADM = '    // ═══ KINEO-E4-SAIDA-B-2026-09-29 [TRAVA 8.2 — "vai E4" do fundador] — ADMISSÃO DA COTA SEMANAL NOVA ═══'
const INI_EXC = '    // ═══ KINEO-SAIDA-REGIAO-2026-10-07 (a) [TRAVA 8.2 — "vai pra tudo" do fundador 07/10] — o filme grátis de região é UM por conta'
const FIM_EXC = '    // ═══ KINEO-E4-CONSERTO-2026-09-29'
const fatia = (src, ini, fim) => { const a = src.indexOf(ini), b = src.indexOf(fim, a); if (a < 0 || b < 0) throw new Error('bloco sumiu: ' + ini.slice(0, 60)); return src.slice(a, b) }
const blocoAdmissao = (over = {}) => fatia(over[CIN] ?? rd(CIN), INI_ADM, FIM_ADM)
const blocoTrava = (over = {}) => fatia(over[CIN] ?? rd(CIN), INI_EXC, FIM_EXC)

/** Banco falso de contagem (videos / credit_debits): conta as linhas que casam os filtros, como o PostgREST faria. */
function bancoContagem({ linhas = {}, falha = false } = {}) {
  const consultas = []
  return {
    consultas,
    from(tabela) {
      const filtros = []
      const exec = () => {
        consultas.push({ tabela, filtros })
        if (falha) return { data: null, count: null, error: { message: 'falha simulada' } }
        const rows = (linhas[tabela] ?? []).filter((r) => filtros.every(([k, c, v]) => k === 'eq' ? r[c] === v : k === 'neq' ? r[c] !== v : k === 'is' ? r[c] === v : k === 'gte' ? String(r[c]) >= String(v) : k === 'like' ? String(r[c]).startsWith(String(v).replace(/%$/, '')) : true))
        return { data: null, count: rows.length, error: null }
      }
      const q = {
        select() { return q },
        eq(c, v) { filtros.push(['eq', c, v]); return q },
        neq(c, v) { filtros.push(['neq', c, v]); return q },
        is(c, v) { filtros.push(['is', c, v]); return q },
        gte(c, v) { filtros.push(['gte', c, v]); return q },
        like(c, v) { filtros.push(['like', c, v]); return q },
        then(res, rej) { return Promise.resolve(exec()).then(res, rej) },
      }
      return q
    },
  }
}
async function rodaAdmissao(bloco, { filme = true, over = {}, perfil, pago = false, trial = false, quality = 'cinematic_ai', duracao = 15, videos = [], falha = false }) {
  const P = carrega({ filme, passe: false, over })(POL)
  const fn = `(async ({ REGION_FREE_FILM_LIVE, REGION_FREE_FILM_QUALITY, REGION_FREE_FILM_SECONDS, regionFreeFilmEligibility, regionFreeFilmAdmissible, isPaidUser, trialActive, costQuality, duration, profile, supabase, user }) => {\n${bloco}\nreturn regionFreeFilmAdmitted })`
  const f = vm.runInNewContext(transpila(fn), { Date: DataFixa })
  const db = bancoContagem({ linhas: { videos }, falha })
  const adm = await f({ ...P, isPaidUser: pago, trialActive: trial, costQuality: quality, duration: duracao, profile: perfil, supabase: db, user: { id: 'u-1' } })
  return { adm, consultas: db.consultas }
}
async function rodaTrava(bloco, { over = {}, admitido = true, held = 9, cost = 9, debitos = [], falha = false }) {
  const P = carrega({ filme: true, passe: false, over })(POL)
  const fn = `(async ({ regionFreeFilmAdmitted, cinematicAdmin, user, holds, cost, releaseBirthClaim, writeServerEvent, NextResponse, REGION_FREE_FILM_REFUSED_EVENT, REGION_FREE_FILM_IN_USE_MESSAGE, regionFreeFilmExclusive }) => {\n${bloco}\nreturn 'PASSOU' })`
  const f = vm.runInNewContext(transpila(fn), { Date: DataFixa })
  const soltos = [], eventos = []
  const db = bancoContagem({ linhas: { credit_debits: debitos }, falha })
  const r = await f({ ...P, regionFreeFilmAdmitted: admitido, cinematicAdmin: db, user: { id: 'u-1' }, holds: { ok: true, totalHeld: held, currentSeen: true }, cost, releaseBirthClaim: async (m) => { soltos.push(m); return true }, writeServerEvent: async (e) => { eventos.push(e); return true }, NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } })
  return { r, soltos, eventos, consultas: db.consultas }
}
async function provaAdmissao(over = {}) {
  const p = []
  let bloco, trava
  try { bloco = blocoAdmissao(over); trava = blocoTrava(over) } catch (e) { return [e.message] }
  const reg = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 14 }
  const velho = new Date(AGORA - 30 * 86_400_000).toISOString()
  const a = (o) => rodaAdmissao(bloco, { over, perfil: reg, ...o })
  if ((await a({})).adm !== true) p.push('o 1º filme de 15 s da região não foi admitido')
  if ((await a({ videos: [{ user_id: 'u-1', status: 'completed', created_at: velho }] })).adm) p.push('2º filme admitido (um filme de 30 dias atrás não contou: a régua é a vida da conta)')
  if ((await a({ videos: [{ user_id: 'u-1', status: 'processing', created_at: new Date(AGORA).toISOString() }] })).adm) p.push('filme em andamento não contou')
  if ((await a({ videos: [{ user_id: 'u-1', status: 'failed', created_at: velho }] })).adm !== true) p.push('filme que falhou (estornado) contou como usado')
  if ((await a({ videos: [{ user_id: 'outra', status: 'completed', created_at: velho }] })).adm !== true) p.push('filme de OUTRA conta contou')
  if ((await a({ falha: true })).adm) p.push('contagem que falhou admitiu')
  if ((await a({ duracao: 35 })).adm) p.push('35 s admitido')
  if ((await a({ quality: 'cinematic_kling' })).adm) p.push('Kling admitido')
  if ((await a({ perfil: { ...reg, trial_status: 'downgraded' } })).adm) p.push('conta grátis de país da lista admitida pelo filme de região')
  if ((await a({ perfil: { ...reg, trial_status: 'blocked' } })).adm) p.push("conta 'blocked' admitida")
  if ((await a({ pago: true })).adm || (await a({ trial: true })).adm) p.push('pagante/teste passou pela admissão da região (já têm o próprio caminho)')
  // a trava depois do claim (bloco REAL)
  const t = (o) => rodaTrava(trava, { over, ...o })
  if ((await t({})).r !== 'PASSOU') p.push('trava barrou o 1º filme')
  const dois = await t({ held: 18 })
  if (!(dois.r?.status === 402 && dois.r.body.charged === false && dois.soltos.length === 1 && dois.eventos.some((e) => e.name === 'region_free_film_refused' && e.metadata?.reason === 'other_hold'))) p.push('pedido simultâneo (hold alheio) passou ou não soltou o claim')
  const jaUsou = await t({ debitos: [{ user_id: 'u-1', render_id: 'cinematic-abc', refunded_at: null }] })
  if (jaUsou.r === 'PASSOU') p.push('débito cinematic não estornado na vida da conta e passou')
  if ((await t({ debitos: [{ user_id: 'u-1', render_id: 'cinematic-abc', refunded_at: '2026-10-01T00:00:00Z' }] })).r !== 'PASSOU') p.push('filme estornado não devolveu o direito')
  if ((await t({ debitos: [{ user_id: 'u-1', render_id: 'clips-abc', refunded_at: null }] })).r !== 'PASSOU') p.push('o clipe grátis gasto barrou o filme')
  if ((await t({ falha: true })).r === 'PASSOU') p.push('leitura de débitos falhou e passou')
  const fora = await t({ admitido: false, held: 30, debitos: [{ user_id: 'u-1', render_id: 'cinematic-x', refunded_at: null }] })
  if (fora.r !== 'PASSOU' || fora.consultas.length !== 0) p.push('a trava atingiu (ou consultou) quem não é do filme de região')
  // a costura na rota: o gate de plano, a releitura, o evento de uso, a recusa
  const src = over[CIN] ?? rd(CIN)
  const L = src.split('\n')
  const i = (linha) => L.indexOf(linha)
  const iWrap = i('    if (!regionFreeFilmAdmitted) { // KINEO-SAIDA-REGIAO-2026-10-07 — o filme grátis de região admitido pula o gate de plano (o saldo abaixo segue cobrando). Só linhas ACRESCENTADAS: o gate de dentro é o da base.')
  const iGate = i('    if (!isPaidUser && !trialActive) {')
  const iFimGate = i("    } // KINEO-SAIDA-REGIAO-2026-10-07 — fim do `if (!regionFreeFilmAdmitted)`")
  const iFimE4 = i("      } // KINEO-E4-SAIDA-B-2026-09-29 — fim do `if (!freeWeeklyAdmitted)`")
  const iAdm = L.findIndex((l) => l.startsWith('    const regionFreeFilmAdmitted: boolean = REGION_FREE_FILM_LIVE && '))
  const iStudio = L.findIndex((l) => l.startsWith('    if ((wantsKling || wantsVeo || hollywoodPath) && !isPaidUser && !(TRIAL_UNLOCKS_PREMIUM && trialActive)) {'))
  if (!(iStudio > 0 && iAdm > iStudio)) p.push('a admissão da região não está DEPOIS do gate dos motores Studio (Kling/Veo/Hollywood seguem pagos)')
  if (!(iWrap > iAdm && iGate === iWrap + 1 && iFimE4 > iGate && L[iFimE4 + 1] === '    }' && iFimGate === iFimE4 + 2)) p.push('o gate de plano não está embrulhado pela admissão da região (linhas exatas)')
  if (!src.includes('      freeWeeklyAdmitted || // KINEO-E4-SAIDA-B-2026-09-29: admitido acima pela cota semanal (15 s, Seedance, país da lista); o saldo abaixo segue cobrando\n      regionFreeFilmAdmitted || // KINEO-SAIDA-REGIAO-2026-10-07')) p.push('a releitura fresca antes do débito não honra a admissão da região')
  const iSaldo = i('    if (!currentPaid || holds.totalHeld > currentBalance) {')
  const iTrava = L.findIndex((l) => l.startsWith(INI_EXC))
  const iDebito = i('    const upfrontDebit = await ensureCinematicDebit(cost)')
  if (!(iSaldo > 0 && iTrava > iSaldo && iDebito > iTrava)) p.push('a trava da região não roda entre a auditoria do claim e o débito')
  const iUso = L.findIndex((l) => l.startsWith('    if (regionFreeFilmAdmitted) await writeServerEvent({ name: REGION_FREE_FILM_USED_EVENT,'))
  if (!(iUso > iDebito && L[iUso - 2]?.startsWith('    debitConfirmedThisRequest = { ok: true, balance: upfrontDebit.balance'))) p.push('region_free_film_used não sai logo depois do débito confirmado')
  // a recusa nova (filme ligado) vem ANTES da de sempre, dentro do mesmo gate; a de sempre fica intacta (é a do interruptor desligado)
  const iPula = i('      if (!freeWeeklyAdmitted) {')
  const iRecusaNova = i("      if (REGION_FREE_FILM_LIVE && profile?.trial_status === REGION_PAID_ONLY_TRIAL_STATUS) return NextResponse.json({ error: REGION_FREE_FILM_REFUSAL, upsell: 'creator', reason: 'plan_ai_engine', region: REGION_PAID_ONLY_TRIAL_STATUS, balance }, { status: 402 }) // KINEO-SAIDA-REGIAO-2026-10-07")
  const iRecusaHoje = i('      if (profile?.trial_status === REGION_PAID_ONLY_TRIAL_STATUS) {')
  if (!(iPula === iGate + 3 && iRecusaNova > iPula && iRecusaHoje > iRecusaNova && iRecusaHoje < iFimE4)) p.push('a recusa da região com o filme ligado não vem antes da de sempre, dentro do gate')
  if (!src.includes("          { error: REGION_PAID_ONLY_REFUSAL, upsell: 'creator', reason: 'plan_ai_engine', region: REGION_PAID_ONLY_TRIAL_STATUS, balance },")) p.push('a recusa de sempre (interruptor desligado) foi trocada')
  // trava 8.2 da casa: toda linha desta entrega na rota leva a marca (tiradas as marcadas, a rota volta à base)
  const semMarca = L.filter((l) => /regionFreeFilm|REGION_FREE_FILM|elegivelRegiao|filmesAntes|nFilmes|debitosNaVida|debitosVida|outroPedidoRegiao/.test(l) && !l.includes('KINEO-SAIDA-REGIAO-2026-10-07'))
  if (semMarca.length) p.push(`linha da saída da região sem a marca KINEO-SAIDA-REGIAO-2026-10-07 na rota: ${semMarca[0].trim().slice(0, 80)}`)
  return p
}

// ══ 4/5. o preço da fórmula regional e a compra pelo free (rota de checkout REAL executada) ═════════════════════════
function declaracoes(src, nomes) {
  const ast = ts.createSourceFile('r.ts', src, ts.ScriptTarget.Latest, true)
  return nomes.map((nome) => {
    const node = ast.statements.find((n) => (ts.isFunctionDeclaration(n) && n.name?.text === nome) || (ts.isVariableStatement(n) && n.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === nome)))
    if (!node) throw new Error('declaração sumiu da rota de checkout: ' + nome)
    return node.getText(ast).replace(/^export\s+/, '')
  }).join('\n\n')
}
/** Troca DENTRO de uma função da rota (a mesma linha existe em outros construtores). */
function trocarNaFuncao(src, nome, de, para) {
  const ast = ts.createSourceFile('r.ts', src, ts.ScriptTarget.Latest, true)
  const node = ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === nome)
  if (!node) throw new Error('função sumiu: ' + nome)
  const a = node.getStart(ast), b = node.getEnd()
  return src.slice(0, a) + trocar(src.slice(a, b), de, para) + src.slice(b)
}
async function rodaCheckout({ over = {}, url, pais, idioma = null, semLogin = false, perfil = { email: 'pessoa@example.com', stripe_customer_id: null, plan: 'free', has_paid: false, trial_status: 'region_paid_only' } }) {
  const src = over[CHK] ?? rd(CHK)
  const codigo = declaracoes(src, ['GET', 'buildPackAndRedirect', 'oneTimeIdempotencyKey', 'checkoutFailureReason', 'intentCampaignFrom', 'browserSessionIdFrom', 'STARTER_PACK', 'PACK_PRICES'])
  const L = carrega({ filme: false, passe: false, over })
  const CP = L('lib/checkoutPricing.ts')
  const SC = L('lib/settlementCurrency.ts')
  const sessoes = [], eventos = [], proibidos = []
  const nega = (n) => async () => { proibidos.push(n); return { proibido: n } }
  const supa = {
    auth: { getUser: async () => ({ data: { user: semLogin ? null : { id: 'u-1', email: 'pessoa@example.com' } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: perfil, error: null }) }) }) }),
  }
  const ctx = {
    NextResponse: { redirect: (u) => ({ redirect: String(u) }), json: (body, init) => ({ body, status: init?.status ?? 200 }) },
    process: { env: { STRIPE_SECRET_KEY: 'sk_test_falso' } },
    console: { log() {}, warn() {}, error() {} },
    createClient: () => supa,
    stripe: { checkout: { sessions: { create: async (params, opts) => { sessoes.push({ params, opts }); return { id: 'cs_test_falso', url: 'https://checkout.stripe.com/c/pay/cs_test_falso' } } } } },
    createHash: crypto.createHash,
    Date: DataFixa,
    resolveCheckoutCurrency: CP.resolveCheckoutCurrency,
    PACK_PRICE_MINOR: CP.PACK_PRICE_MINOR,
    PACK_CREDITS: CP.PACK_CREDITS,
    PACK_ADVERTISED_SECONDS: CP.PACK_ADVERTISED_SECONDS,
    resolveSettlementCurrency: SC.resolveSettlementCurrency,
    settlementAmountMinor: SC.settlementAmountMinor,
    recordCheckoutEvent: async (name, uid, meta) => { eventos.push({ name, uid, meta }) },
    isSpeculativeRequest: () => false,
    speculativeNoop: nega('speculativeNoop'),
    recordBotSuspicion: async () => {},
    buildTopupAndRedirect: nega('buildTopupAndRedirect'),
    CREDIT_SLIDER_PACK_ID: 'credits_custom',
    normalizeSliderCredits: () => 0,
    ADS_PASS_ID: 'ads_pass',
    buildAdsPassAndRedirect: nega('buildAdsPassAndRedirect'),
    isBulkPackId: () => false,
    buildBulkPackAndRedirect: nega('buildBulkPackAndRedirect'),
    buildAutopilotPilotAndRedirect: nega('buildAutopilotPilotAndRedirect'),
    buildStarter290AndRedirect: nega('buildStarter290AndRedirect'),
    buildAndRedirect: nega('buildAndRedirect'),
    readCheckoutSetupFailureContext: () => null,
    checkoutSetupFailureTelemetry: () => ({}),
    buildCheckoutSetupFailureReturnHref: () => '/pricing?checkout_setup_failed=1',
  }
  const mod = { exports: {} }
  vm.runInNewContext(transpila(codigo + '\nmodule.exports = { GET }'), { ...ctx, module: mod, exports: mod.exports })
  const headers = { 'x-vercel-ip-country': pais, 'accept-language': idioma }
  const req = { nextUrl: new URL(url), headers: { get: (n) => headers[String(n).toLowerCase()] ?? null }, cookies: { get: () => undefined } }
  const res = await mod.exports.GET(req)
  return { res, sessoes, eventos, proibidos }
}
async function provaPrecoECompra(over = {}) {
  const p = []
  const L = carrega({ filme: true, passe: true, over })
  const PS = L(PASS)
  const SC = L('lib/settlementCurrency.ts')
  const CP = L('lib/checkoutPricing.ts')
  // a fórmula: BR = BRL pela usdToBrlMinor; pt-BR fora do Brasil = BRL; Índia/Paquistão/EUA = USD (sem trilho INR)
  const casos = [
    { pais: 'BR', idioma: 'pt-BR,pt;q=0.9', moeda: 'brl' },
    { pais: 'PT', idioma: 'pt-BR', moeda: 'brl' },
    { pais: 'IN', idioma: 'en-IN', moeda: 'usd' },
    { pais: 'PK', idioma: 'ur-PK', moeda: 'usd' },
    { pais: 'US', idioma: 'en-US', moeda: 'usd' },
  ]
  for (const c of casos) {
    const preco = PS.regionPassPrice({ ipCountry: c.pais, acceptLanguage: c.idioma })
    const esperado = c.moeda === 'brl' ? SC.usdToBrlMinor(CP.PACK_PRICE_MINOR.usd) : CP.PACK_PRICE_MINOR.usd
    if (preco.currency !== c.moeda || preco.amountMinor !== esperado) p.push(`${c.pais}: passe em ${preco.currency} ${preco.amountMinor} (esperado ${c.moeda} ${esperado})`)
    if (preco.credits !== CP.PACK_CREDITS.starter || preco.seconds !== CP.PACK_ADVERTISED_SECONDS.starter) p.push(`${c.pais}: o passe não é ${CP.PACK_CREDITS.starter} cr / ${CP.PACK_ADVERTISED_SECONDS.starter} s`)
    // a MESMA conta que a rota de checkout REAL faz para o mesmo visitante — e o free compra
    const url = `https://www.usekineo.com${PS.regionPassCheckoutHref('wall')}`
    let ck
    try { ck = await rodaCheckout({ over, url, pais: c.pais, idioma: c.idioma }) } catch (e) { p.push(`${c.pais}: checkout lançou ${e.message}`); continue }
    const s = ck.sessoes[0]?.params
    if (ck.sessoes.length !== 1 || ck.proibidos.length) { p.push(`${c.pais}: conta free sem plano não abriu a sessão do passe (${ck.sessoes.length} sessões; ${ck.proibidos.join(',')}; resposta ${JSON.stringify(ck.res).slice(0, 120)})`); continue }
    if (s.mode !== 'payment' || s.line_items?.[0]?.price_data?.currency !== preco.currency || s.line_items?.[0]?.price_data?.unit_amount !== preco.amountMinor) p.push(`${c.pais}: a Stripe cobra ${s.line_items?.[0]?.price_data?.currency} ${s.line_items?.[0]?.price_data?.unit_amount}, a oferta mostra ${preco.currency} ${preco.amountMinor}`)
    if (s.metadata?.pack !== PS.REGION_PASS_SKU || s.metadata?.pack_credits !== String(CP.PACK_CREDITS.starter)) p.push(`${c.pais}: a sessão não é o SKU do passe (${s.metadata?.pack}/${s.metadata?.pack_credits})`)
    if (s.metadata?.intent_campaign !== PS.regionPassIntentCampaign('wall')) p.push(`${c.pais}: a campanha do passe de região não viajou até a sessão (vai ao payment_success)`)
    if (!String(s.success_url).includes('/studio/create?resume=wall_v1&pack=starter&session_id={CHECKOUT_SESSION_ID}')) p.push(`${c.pais}: a volta não é ao Studio (resume=wall_v1)`)
    if (ck.res?.redirect !== 'https://checkout.stripe.com/c/pay/cs_test_falso') p.push(`${c.pais}: o clique não foi à Stripe`)
  }
  // a recarga continua fechada ao free (é OUTRO SKU — o passe não passa por ela)
  const TE = L('lib/growth/topupEligibility.ts')
  if (TE.canPurchaseCreditTopup('free') !== false || TE.canPurchaseCreditTopup(null) !== false) p.push('a recarga abriu para conta free')
  const chk = over[CHK] ?? rd(CHK)
  const topup = declaracoes(chk, ['buildTopupAndRedirect'])
  const pack = declaracoes(chk, ['buildPackAndRedirect'])
  const iGate = topup.indexOf('if (!canPurchaseCreditTopup(profile?.plan)) {')
  const iCria = topup.indexOf('stripe.checkout.sessions.create(')
  if (!(iGate > 0 && iCria > iGate)) p.push('a recarga perdeu o portão de plano antes da sessão')
  if (/canPurchaseCreditTopup|has_paid|\bplan\b/.test(pack.replace(/\/\/[^\n]*/g, ''))) p.push('o construtor do pack ganhou um portão de plano')
  // o webhook (Path A) concede o pack a qualquer conta: pack_credits + has_paid, sem olhar plano
  const wh = rd(WH)
  const pathA = fatia(wh, "        if (session.mode === 'payment') {", '        // ── Path B: Subscription checkout ──')
  if (!pathA.includes("const profileUpdate: Record<string, unknown> = { video_credits: next, has_paid: true }") || /canPurchaseCreditTopup/.test(pathA)) p.push('o webhook do pack mudou: não concede pack_credits + has_paid a qualquer conta')
  if (!wh.includes('      pack: session.metadata?.pack ?? null,') || !wh.includes('      intent_campaign: session.metadata?.intent_campaign ?? null,')) p.push('payment_success não leva mais o SKU (pack) e a campanha do passe')
  // sem login: o pack pede o cadastro antes (a compra de convidado só existe para assinatura)
  try {
    const anon = await rodaCheckout({ over, url: `https://www.usekineo.com${PS.regionPassCheckoutHref('wall')}`, pais: 'BR', idioma: 'pt-BR', semLogin: true })
    if (anon.sessoes.length !== 0 || !String(anon.res?.redirect).includes('/login?reason=checkout&redirect=')) p.push('pack sem login abriu sessão ou não foi ao login')
  } catch (e) { p.push('pack sem login lançou ' + e.message) }
  const GC = L('lib/growth/guestCheckout.ts')
  if (GC.isGuestCheckoutSession({ mode: 'payment', metadata: { kineo_guest: '1' } }) !== false || GC.isGuestCheckoutSession({ mode: 'subscription', metadata: { kineo_guest: '1' } }) !== true) p.push('a compra de convidado passou a cobrir pagamento único (o webhook não entrega pack sem dono)')
  return p
}

// ══ 6c. a oferta e a rota /api/region-pass (decisão pura + rota REAL executada) ══════════════════════════════════════
async function provaRota(over = {}) {
  const p = []
  const L = carrega({ filme: true, passe: true, over })
  const PS = L(PASS)
  const reg = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 5 }
  const d = (o) => PS.decideRegionPassRequest({ userId: 'u-1', profile: reg, surface: 'after_film', go: false, ipCountry: 'BR', acceptLanguage: 'pt-BR', ...o })
  const oferta = d({})
  if (!(oferta.kind === 'json' && oferta.body.eligible === true && oferta.body.price?.currency === 'brl' && oferta.body.href === PS.regionPassGoHref('after_film') && oferta.body.balance === 5)) p.push('oferta da região no BR não saiu em BRL com o link do clique e a régua do saldo')
  if (!(oferta.event?.name === 'region_pass_offer_shown' && oferta.event.metadata.currency === 'brl' && oferta.event.metadata.sku === 'starter10' && oferta.event.metadata.surface === 'after_film')) p.push('region_pass_offer_shown sem moeda/SKU/tela')
  const clique = d({ go: true, surface: 'wall' })
  if (!(clique.kind === 'redirect' && clique.location === PS.regionPassCheckoutHref('wall') && clique.event?.name === 'region_pass_offer_clicked' && clique.event.metadata.intent_campaign === 'region_pass_wall_v1')) p.push('o clique não gravou region_pass_offer_clicked nem foi ao checkout com a campanha')
  for (const [nome, perfil] of [['teste ativo', { ...reg, trial_status: 'active' }], ['já pagou', { ...reg, has_paid: true }], ['has_paid desconhecido', { ...reg, has_paid: null }], ['plano pago', { ...reg, plan: 'starter' }], ['blocked', { ...reg, trial_status: 'blocked' }]]) {
    const j = d({ profile: perfil })
    const g = d({ profile: perfil, go: true })
    if (j.body.eligible !== false || j.event) p.push(`oferta mostrada a ${nome}`)
    if (g.location !== PS.PLAIN_PASS_CHECKOUT_HREF || g.event) p.push(`clique de ${nome} gravou evento da região ou mudou o destino`)
  }
  if (d({ userId: null }).status !== 401 || d({ surface: 'qualquer' }).status !== 400) p.push('sem sessão/tela inválida não fecha a porta')
  if (d({ go: true, surface: 'qualquer' }).location !== PS.PLAIN_PASS_CHECKOUT_HREF) p.push('tela inválida no clique não caiu no pack de sempre')
  // a campanha passa no filtro da rota de checkout (intentCampaignFrom), senão não chegaria ao payment_success
  const chk = over[CHK] ?? rd(CHK)
  const icf = vm.runInNewContext(transpila(declaracoes(chk, ['intentCampaignFrom']) + '\nintentCampaignFrom'), {})
  for (const s of PS.REGION_PASS_SURFACES) {
    const c = PS.regionPassIntentCampaign(s)
    if (icf({ nextUrl: new URL('https://x.invalid/?intent_campaign=' + c) }) !== c) p.push(`a campanha ${c} é recusada pelo checkout`)
  }
  // a rota REAL: lê sessão e perfil, grava o evento ANTES de responder, redireciona/responde o que a decisão mandou
  const roda = async (qs, perfil = reg) => {
    const eventos = []
    const supa = { auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: perfil, error: null }) }) }) }) }
    const RL = carrega({ filme: true, passe: true, over, mocks: {
      'next/server': { NextResponse: { redirect: (u) => ({ redirect: String(u) }), json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => supa },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
    } })
    const R = RL(ROTA)
    const headers = { 'x-vercel-ip-country': 'BR', 'accept-language': 'pt-BR' }
    const res = await R.GET({ nextUrl: new URL('https://www.usekineo.com/api/region-pass' + qs), headers: { get: (n) => headers[String(n).toLowerCase()] ?? null } })
    return { res, eventos }
  }
  try {
    const go = await roda('?surface=wall&go=1')
    if (!(go.res.redirect === 'https://www.usekineo.com' + PS.regionPassCheckoutHref('wall') && go.eventos.length === 1 && go.eventos[0].name === 'region_pass_offer_clicked' && go.eventos[0].userId === 'u-1')) p.push(`rota: o clique não gravou o evento de servidor e redirecionou ao checkout (${JSON.stringify(go).slice(0, 160)})`)
    const ver = await roda('?surface=pricing')
    if (!(ver.res.status === 200 && ver.res.body.eligible === true && ver.eventos.length === 1 && ver.eventos[0].name === 'region_pass_offer_shown')) p.push('rota: a oferta não respondeu com o evento de servidor')
    const fora = await roda('?surface=wall&go=1', { ...reg, has_paid: true })
    if (!(fora.res.redirect === 'https://www.usekineo.com' + PS.PLAIN_PASS_CHECKOUT_HREF && fora.eventos.length === 0)) p.push('rota: conta fora da régua gravou evento da região')
  } catch (e) { p.push('rota lançou: ' + e.message) }
  return p
}

// ══ 7. os eventos são de SERVIDOR ═════════════════════════════════════════════════════════════════════════════════════
function varre(dirs) {
  const out = []
  const anda = (d) => {
    for (const nome of readdirSync(join(root, d))) {
      if (nome === 'node_modules' || nome.startsWith('.')) continue
      const rel = d + '/' + nome
      const st = statSync(join(root, rel))
      if (st.isDirectory()) anda(rel)
      else if (/\.(ts|tsx)$/.test(nome)) out.push(rel)
    }
  }
  for (const d of dirs) anda(d)
  return out
}
const ARQUIVOS = varre(['app', 'lib', 'components'])
function provaEventos(over = {}) {
  const p = []
  const NOMES = ['region_free_film_granted', 'region_free_film_used', 'region_free_film_refused', 'region_pass_offer_shown', 'region_pass_offer_clicked']
  const evt = over[EVT] ?? rd(EVT)
  const set = fatia(evt, 'const SERVER_ONLY_EVENTS = new Set([', '\n])')
  for (const n of NOMES) if (!set.includes(`  '${n}',`)) p.push(`${n} fora de SERVER_ONLY_EVENTS (o navegador poderia cunhar)`)
  for (const f of ARQUIVOS) {
    const src = over[f] ?? rd(f)
    if (!/^['"]use client['"]/.test(src.trimStart())) continue
    for (const n of NOMES) if (src.includes(`'${n}'`)) p.push(`${f} (cliente) cita ${n}`)
  }
  const P = carrega({ filme: true, passe: true, over })(POL)
  const PS = carrega({ filme: true, passe: true, over })(PASS)
  if (P.REGION_FREE_FILM_GRANTED_EVENT !== NOMES[0] || P.REGION_FREE_FILM_USED_EVENT !== NOMES[1] || P.REGION_FREE_FILM_REFUSED_EVENT !== NOMES[2] || PS.REGION_PASS_OFFER_SHOWN_EVENT !== NOMES[3] || PS.REGION_PASS_OFFER_CLICKED_EVENT !== NOMES[4]) p.push('nome de evento mudou (a medição lê estes)')
  return p
}

// ══ 0/8. interruptores num lugar só; telas com o interruptor na frente ═════════════════════════════════════════════════
// Código sem comentários (o nome do interruptor citado num comentário não é uso). Não come `https://`.
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1')
function provaUmLugarETelas(over = {}) {
  const p = []
  for (const nome of ['REGION_FREE_FILM_LIVE', 'REGION_PASS_OFFER_LIVE']) {
    const declara = ARQUIVOS.filter((f) => new RegExp(`\\b(const|let|var) ${nome}\\b`).test(semComentarios(over[f] ?? rd(f))))
    if (declara.length !== 1 || declara[0] !== POL) p.push(`${nome} declarado em ${declara.join(', ') || 'lugar nenhum'} (tem de ser só em ${POL})`)
    for (const f of ARQUIVOS) {
      const src = over[f] ?? rd(f)
      if (f === POL || !new RegExp(`\\b${nome}\\b`).test(semComentarios(src))) continue
      if (!new RegExp(`import \\{[^}]*\\b${nome}\\b[^}]*\\} from '(@/lib/freeFilmPolicy|\\./freeFilmPolicy)'`).test(src)) p.push(`${f} usa ${nome} sem importar de lib/freeFilmPolicy`)
    }
  }
  const s = (f) => over[f] ?? rd(f)
  const upg = s(UPG), gen = s(GEN), ban = s(BAN), lay = s(LAY), ofe = s(OFERTA)
  if (!upg.includes('      {REGION_PASS_OFFER_LIVE && regionPass\n        ? <RegionPassOffer surface="wall" beforeBuy={regionPass.beforeBuy} fallback={onFilmPass ? <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} /> : null} />\n        : onFilmPass && <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} />}')) p.push('parede (modal): o passe da região não está atrás do interruptor com o cartão de sempre de fallback')
  if (!/\{REGION_PASS_OFFER_LIVE \/\* KINEO-SAIDA-REGIAO-2026-10-07[^*]*\*\/\n\s+\? <RegionPassOffer surface="pricing" fallback=\{<ConversionPassCard surface="pricing"/.test(upg)) p.push('/pricing: o passe da região não está atrás do interruptor com o cartão de sempre de fallback')
  if (!gen.includes('      regionPass={REGION_PASS_OFFER_LIVE && !isSubscriber ? { beforeBuy: onRegionPassBeforeBuy ?? undefined } : null}')) p.push('parede do Studio: o modal não pede o passe da região atrás do interruptor (só para quem não assina)')
  if (!gen.includes("              {REGION_PASS_OFFER_LIVE && phase === 'done' && notPaidProven && trialActive !== true ? (\n                <RegionPassOffer surface=\"after_film\" fallback={<RegionalFirstPack surface=\"post_video\" />} />\n              ) : (\n              <>\n              {phase === 'done' && <RegionalFirstPack surface=\"post_video\" />}\n              </>\n              )}")) p.push('filme pronto: o passe da região não está atrás do interruptor, ou some o pack regional de sempre')
  if (!ban.includes('  const film = useRegionFilmGift(REGION_FREE_FILM_LIVE && freeFilm)') || !ban.includes('  if (REGION_FREE_FILM_LIVE && film) return <RegionFreeFilmStrip />') || !ban.includes('  if (REGION_FREE_FILM_LIVE) return <RegionPaidOnlyStrip freeClip={gift} filmLive />')) p.push('faixa: o filme grátis não está atrás do interruptor')
  if (!ban.includes('  const copy = filmLive ? pickInterfaceCopy(freeClip ? REGION_FREE_CLIP_NOTICE_FILM_LIVE : REGION_PLANS_NOTICE_FILM_LIVE, language) : copyHoje')) p.push('faixa: com o filme ligado, o texto de sempre ("não disponível no seu país") continua')
  if (!/\{user && regionFreeFilmAvailable\(profile as \{[^}]*\} \| null, videosCount\) && <RegionPaidOnlyBanner freeFilm freeClip=/.test(lay) || !/&& !regionFreeFilmAvailable\(profile as \{[^}]*\} \| null, videosCount\) && <RegionPaidOnlyBanner freeClip=/.test(lay)) p.push('layout: a faixa do filme e a de sempre não são exclusivas')
  if (!ofe.includes("fetch(`/api/region-pass?surface=${surface}`") || !ofe.includes('checkout.launch(`region_pass_${surface}`, offer.href,')) p.push('o cartão não pergunta ao servidor nem navega pelo link que ele devolve')
  if (/\$\s?\d|R\$\s?\d|₹|\b4[.,]99\b|\b24[.,]90\b/.test(ofe.replace(/\/\/[^\n]*/g, ''))) p.push('o cartão do passe tem preço digitado')
  return p
}

// ══ execução ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('TESTE saída de quem nasce region_paid_only — filme grátis de 15 s + passe na moeda local (07/10)')
const PROVAS = {
  regras: () => provaRegras(),
  cadastro: () => provaGrant(),
  admissao: () => provaAdmissao(),
  precoECompra: () => provaPrecoECompra(),
  rota: () => provaRota(),
  eventos: () => provaEventos(),
  desligadoIgualHoje: () => provaOffBase(),
  umLugarETelas: () => provaUmLugarETelas(),
}
const ROTULO = {
  regras: '(1–3) regras puras: só região sem pagar; 1 filme de 15 s Seedance (custo = a função que cobra); trava; textos sem "não disponível no seu país" com o filme ligado',
  cadastro: '(1–3) cadastro EXECUTADO: PK ganha clipe + filme; US/sem país vão ao teste; 2º login e pedido concorrente nada; descartável e digital estourada → blocked; o filme queima a vaga do aparelho',
  admissao: '(2) cinematic: admissão e trava REAIS executadas (vida da conta, sem janela; simultâneo → 402 sem cobrar); costura no gate, na releitura, no evento de uso e na recusa',
  precoECompra: '(4–5) passe: preço da fórmula regional (BR/PT-BR = BRL; IN/PK/US = USD) == o que a rota REAL de checkout cobra; conta free compra; recarga segue fechada; sem login → cadastro antes',
  rota: '(6) /api/region-pass: decisão e rota REAIS — eventos de servidor shown/clicked, campanha que chega ao payment_success, régua estreita (has_paid === false)',
  eventos: '(6) os 5 eventos novos são server-only e nenhum cliente os cita',
  desligadoIgualHoje: '(6) interruptores desligados = hoje: reverseTrial desligado ≡ reverseTrial sem os blocos novos (10 cenários, traço a traço); oferta "off"; admissão sem consulta',
  umLugarETelas: '(0/6) interruptores declarados só em lib/freeFilmPolicy.ts; toda tela nova atrás do interruptor, com o cartão de sempre de fallback',
}
for (const [chave, fn] of Object.entries(PROVAS)) {
  let r
  try { r = await fn() } catch (e) { r = [`lançou: ${e instanceof Error ? e.stack : String(e)}`] }
  checa(`${ROTULO[chave]}${r.length ? ' → ' + r.join(' | ') : ''}`, r.length === 0)
}

// ══ mutantes: cada um prova por grep que foi aplicado e PRECISA ficar vermelho ══════════════════════════════════════
console.log('== mutantes ==')
const fonte = (f) => rd(f)
const M = [
  { r: '(1) grant só na região', nome: 'M1 o teste (US) também ganha o filme de região', prova: provaGrant, muda: { [RT]: (s) => trocar(s, '    return { activated: true, reason: variant }', '    await concederFilmeDeRegiao(db, args)\n    return { activated: true, reason: variant }') }, grep: { [RT]: '    await concederFilmeDeRegiao(db, args)\n    return { activated: true, reason: variant }' } },
  { r: '(1) grant só na região', nome: 'M2 elegibilidade sem exigir region_paid_only', prova: provaRegras, muda: { [POL]: (s) => trocar(s, "  if (!row || row.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) return 'not_region'\n  if (!regionPaidOnlyNoticeVisible(row)) return 'paid'", "  if (!row) return 'not_region'\n  if (!regionPaidOnlyNoticeVisible({ ...row, trial_status: REGION_PAID_ONLY_TRIAL_STATUS })) return 'paid'") }, grep: { [POL]: "  if (!row) return 'not_region'\n" } },
  { r: '(2) um filme por pessoa', nome: 'M3 grant fora da transição (pedido concorrente dá de novo)', prova: provaGrant, muda: { [RT]: (s) => trocar(s, '      if (markedPais && REGION_FREE_FILM_LIVE) {', '      if (REGION_FREE_FILM_LIVE) {') }, grep: { [RT]: '      if (REGION_FREE_FILM_LIVE) {\n        await concederFilmeDeRegiao(db, args)' } },
  { r: '(2) um filme por pessoa', nome: 'M4 admissão sem contar os filmes da conta', prova: provaRegras, muda: { [POL]: (s) => trocar(s, '    input.priorFilms === 0\n', '    input.priorFilms !== null\n') }, grep: { [POL]: '    input.priorFilms !== null\n' } },
  { r: '(2) um filme por pessoa', nome: 'M5 trava sem os débitos da vida da conta', prova: provaRegras, muda: { [POL]: (s) => trocar(s, '  return input.otherActiveHold === false && input.lifetimeCinematicDebits === 0', '  return input.otherActiveHold === false && input.lifetimeCinematicDebits !== null') }, grep: { [POL]: 'input.lifetimeCinematicDebits !== null' } },
  { r: '(2) um filme por pessoa', nome: 'M6 a rota conta só os últimos 7 dias (vira cota semanal)', prova: provaAdmissao, muda: { [CIN]: (s) => trocar(s, "            .neq('status', 'failed') // KINEO-SAIDA-REGIAO-2026-10-07\n          filmesAntes =", "            .neq('status', 'failed') // KINEO-SAIDA-REGIAO-2026-10-07\n            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // KINEO-SAIDA-REGIAO-2026-10-07\n          filmesAntes =") }, grep: { [CIN]: ".gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // KINEO-SAIDA-REGIAO-2026-10-07\n          filmesAntes =" } },
  { r: '(2) um filme por pessoa', nome: 'M7 a trava da rota ignora o pedido simultâneo', prova: provaAdmissao, muda: { [CIN]: (s) => trocar(s, '      const outroPedidoRegiao = holds.totalHeld > cost // KINEO-SAIDA-REGIAO-2026-10-07', '      const outroPedidoRegiao = false // KINEO-SAIDA-REGIAO-2026-10-07') }, grep: { [CIN]: '      const outroPedidoRegiao = false // KINEO-SAIDA-REGIAO-2026-10-07' } },
  { r: '(3) abuso preservado', nome: 'M8 sem a digital do aparelho para a região', prova: provaGrant, muda: { [RT]: (s) => trocar(s, '      if (REGION_FREE_FILM_LIVE && (await digitalBarraFilmeDeRegiao(db, args))) {', '      if (false) {') }, grep: { [RT]: "      if (false) {\n        return { activated: false, reason: 'fingerprint_limit' }" } },
  { r: '(3) abuso preservado', nome: 'M9 o filme não queima a vaga do aparelho', prova: provaGrant, muda: { [RT]: (s) => trocar(s, "    await recordTrialFingerprint(db, { hash: args.fingerprintHash ?? null, userId: args.userId, outcome: 'activated' })", '    void 0') }, grep: { [RT]: '  if (granted) {\n    void 0\n  }' } },
  { r: '(3) abuso preservado', nome: 'M10 sem o bloqueio de e-mail descartável', prova: provaGrant, muda: { [RT]: (s) => trocar(s, '    if (isDisposableEmail(args.email)) {', '    if (false) {') }, grep: { [RT]: "    if (false) {\n      console.warn(`[reverse-trial] disposable email blocked" } },
  { r: '(4) preço da fórmula regional', nome: 'M11 passe sem a fórmula (BRL com o número do dólar)', prova: provaPrecoECompra, muda: { [PASS]: (s) => trocar(s, '  const amountMinor = settlementAmountMinor(usdMinor, settlement.currency)', '  const amountMinor = usdMinor') }, grep: { [PASS]: '  const amountMinor = usdMinor\n' } },
  { r: '(4) preço da fórmula regional', nome: 'M12 passe ignora o país e o idioma', prova: provaPrecoECompra, muda: { [PASS]: (s) => trocar(s, "resolveSettlementCurrency({ ipCountry: input.ipCountry ?? 'US', acceptLanguage: input.acceptLanguage ?? null })", "resolveSettlementCurrency({ ipCountry: 'US', acceptLanguage: null })") }, grep: { [PASS]: "resolveSettlementCurrency({ ipCountry: 'US', acceptLanguage: null })" } },
  { r: '(5) o free compra o passe', nome: 'M13 portão de plano no pack (só Creator/Studio)', prova: provaPrecoECompra, muda: { [CHK]: (s) => trocarNaFuncao(s, 'buildPackAndRedirect', "    .select('email, stripe_customer_id')\n    .eq('id', user.id)\n    .single()\n", "    .select('email, stripe_customer_id')\n    .eq('id', user.id)\n    .single()\n  if (true) return redirectError('Credit top-ups are for Creator & Studio plans. Choose a plan to continue.')\n") }, grep: { [CHK]: "  if (true) return redirectError('Credit top-ups are for Creator & Studio plans. Choose a plan to continue.')\n" } },
  { r: '(6) régua estreita do passe', nome: 'M14 passe para has_paid desconhecido', prova: provaRota, muda: { [PASS]: (s) => trocar(s, '  if (row.has_paid !== false) return false', '  if (row.has_paid === true) return false') }, grep: { [PASS]: '  if (row.has_paid === true) return false' } },
  { r: '(6) desligado = hoje', nome: 'M15 grant do filme ignora o interruptor (cadastro E política)', prova: provaOffBase, muda: { [RT]: (s) => trocar(s, '      if (markedPais && REGION_FREE_FILM_LIVE) {', '      if (markedPais) {'), [POL]: (s) => trocar(s, '  return live ? REGION_FREE_FILM_CREDITS : 0', '  return REGION_FREE_FILM_CREDITS') }, grep: { [RT]: '      if (markedPais) {\n        await concederFilmeDeRegiao(db, args)', [POL]: '  return REGION_FREE_FILM_CREDITS\n' } },
  { r: '(6) desligado = hoje', nome: 'M16 admissão ignora o interruptor (rota E política)', prova: provaOffBase, muda: { [CIN]: (s) => trocar(s, '    const regionFreeFilmAdmitted: boolean = REGION_FREE_FILM_LIVE && !isPaidUser', '    const regionFreeFilmAdmitted: boolean = !isPaidUser'), [POL]: (s) => trocar(s, "  if (!live) return 'disabled'\n  if (!row || row.trial_status", '  if (!row || row.trial_status') }, grep: { [CIN]: '    const regionFreeFilmAdmitted: boolean = !isPaidUser', [POL]: "): RegionFreeFilmReason {\n  if (!row || row.trial_status" } },
  { r: '(6) desligado = hoje', nome: 'M17 oferta do passe ignora o interruptor', prova: provaOffBase, muda: { [PASS]: (s) => trocar(s, '  const live = input.live ?? REGION_PASS_OFFER_LIVE', '  const live = true') }, grep: { [PASS]: '  const live = true\n' } },
  { r: '(6) desligado = hoje', nome: 'M18 a parede mostra o passe da região sem o interruptor', prova: provaUmLugarETelas, muda: { [UPG]: (s) => trocar(s, '      {REGION_PASS_OFFER_LIVE && regionPass\n', '      {regionPass\n') }, grep: { [UPG]: '      {regionPass\n        ? <RegionPassOffer' } },
  { r: '(6) desligado = hoje', nome: 'M20 a recusa nova vale com o interruptor desligado (troca a recusa de hoje)', prova: provaAdmissao, muda: { [CIN]: (s) => trocar(s, '      if (REGION_FREE_FILM_LIVE && profile?.trial_status === REGION_PAID_ONLY_TRIAL_STATUS) return NextResponse.json({ error: REGION_FREE_FILM_REFUSAL,', '      if (profile?.trial_status === REGION_PAID_ONLY_TRIAL_STATUS) return NextResponse.json({ error: REGION_FREE_FILM_REFUSAL,') }, grep: { [CIN]: '      if (profile?.trial_status === REGION_PAID_ONLY_TRIAL_STATUS) return NextResponse.json({ error: REGION_FREE_FILM_REFUSAL,' } },
  { r: '(6) desligado = hoje', nome: 'M21 linha da entrega sem a marca na rota (tiradas as marcadas, a rota não voltaria à base)', prova: provaAdmissao, muda: { [CIN]: (s) => trocar(s, '        let filmesAntes: number | null = null // KINEO-SAIDA-REGIAO-2026-10-07', '        let filmesAntes: number | null = null') }, grep: { [CIN]: '        let filmesAntes: number | null = null\n' } },
  { r: '(6) eventos de servidor', nome: 'M19 a rota não grava o clique', prova: provaRota, muda: { [ROTA]: (s) => trocar(s, '    await writeServerEvent({ name: decision.event.name, userId: user.id, path: PATH, metadata: decision.event.metadata })', '    void 0') }, grep: { [ROTA]: '  if (decision.event && user) {\n    void 0\n  }' } },
]
for (const m of M) {
  let over
  try {
    over = {}
    for (const [f, fn] of Object.entries(m.muda)) over[f] = fn(fonte(f))
  } catch (e) { checa(`${m.nome} — âncora não encontrada (reancore): ${e.message}`, false); continue }
  // prova por grep de que o mutante EXISTE no texto que a prova vai ler
  const aplicado = Object.entries(m.grep).every(([f, trecho]) => over[f].includes(trecho) && !fonte(f).includes(trecho))
  if (!aplicado) { checa(`${m.nome} — mutante NÃO aplicado (grep não achou o texto inserido)`, false); continue }
  let r
  try { r = await m.prova(over) } catch (e) { r = [`(lançou: ${e instanceof Error ? e.message : String(e)})`] }
  checa(`${m.r} · ${m.nome} → vermelho${r.length ? ` (${r[0].slice(0, 110)})` : ''}`, r.length > 0)
}

console.log(`\n  RESULTADO: ${ok} ok · ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
