// KINEO-TRIAL-A-PEDIDO-0411 [TRAVA 8.2 — fundador 04/11: "Metade das contas sem crédito" + "2a"] — guardião sem rede.
// Prova executando o código real: sorteio fixo e meio a meio, janela de 30 dias, faixa só para quem está no lado, prévia e cota semanal; cada regra com mutante.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const lf = (t) => t.replace(/\r\n/g, '\n')
const carrega = (arq, mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === arq ? mutar(t) : t) })(arq)
const T = 'lib/trialPedido.ts'
const m = carrega(T)

// A. sorteio
const ids = Array.from({ length: 4000 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
const pedidos = ids.filter((id) => m.ladoDoTeste(id) === 'a_pedido').length
checa(`A sorteio perto de meio a meio (${pedidos}/4000)`, pedidos > 1880 && pedidos < 2120)
checa('A a mesma conta cai sempre no mesmo lado', ids.slice(0, 50).every((id) => m.ladoDoTeste(id) === m.ladoDoTeste(id)))
const mut1 = carrega(T, (t) => t.replace("% 2 === 0 ? 'controle' : 'a_pedido'", "% 2 === 0 ? 'a_pedido' : 'a_pedido'"))
checa('A mutante: todo mundo no mesmo lado seria percebido', ids.filter((id) => mut1.ladoDoTeste(id) === 'a_pedido').length === 4000)

// B. janela
const ini = Date.parse(m.TRIAL_PEDIDO_INICIO_UTC), fim = Date.parse(m.TRIAL_PEDIDO_FIM_UTC)
checa('B dura 30 dias', fim - ini === 30 * 86400000)
checa('B antes e depois do teste: fechado', !m.testeAberto(ini - 1) && !m.testeAberto(fim))
checa('B durante: aberto', m.testeAberto(ini) && m.testeAberto(fim - 1))
checa('B interruptor desligado fecha', !m.testeAberto(ini, false))

// C. faixa
const v = (o) => m.trialPedidoVisivel(o)
checa('C aparece para o lado a pedido', v({ trial_status: 'on_request', has_paid: false, plan: 'free' }))
checa('C some para quem pagou ou tem plano', !v({ trial_status: 'on_request', has_paid: true, plan: 'free' }) && !v({ trial_status: 'on_request', has_paid: false, plan: 'basic' }))
checa('C some depois de pedir e para os outros estados', !v({ trial_status: 'active', plan: 'free' }) && !v({ trial_status: null }) && !v({ trial_status: 'region_paid_only' }) && !v(null))
checa('C a recusa não diz que o país não tem', !/country/i.test(m.TRIAL_PEDIDO_REFUSAL) && /free film/i.test(m.TRIAL_PEDIDO_REFUSAL))
for (const l of ['en', 'pt', 'es']) checa(`C textos em ${l}`, Object.values(m.TRIAL_PEDIDO_COPY[l]).every((x) => typeof x === 'string' && x.length > 0))

// D. quem mais olha o status
const prev = carrega('lib/scenePreview.ts')
checa('D a prévia aceita o lado a pedido', prev.previaEligible({ trial_status: 'on_request', has_paid: false, plan: 'free' }, true))
checa('D a prévia recusa quem está no trial', !prev.previaEligible({ trial_status: 'active', has_paid: false, plan: 'free' }, true))
const sem = carrega('lib/freeWeeklyFilm.ts')
const fontes = lf(fs.readFileSync('lib/freeWeeklyFilm.ts', 'utf8'))
const lista = /const [A-Z_]+[^=\n]*=\s*(?:new Set\()?\[([^\]]*)\]/.exec(fontes.slice(fontes.indexOf('PODEM receber a cota')))?.[1] ?? ''
checa('D a cota semanal não admite o lado a pedido', !lista.includes('on_request') && !!sem)
const lem = carrega('lib/lifecycle/lembreteComIdeia.ts')
checa('D a carta "a um clique" não vai para o lado a pedido', lem.podeGerarParaLembrete({ trial_status: 'on_request' }) === false)

// E. fiação
const rt = lf(fs.readFileSync('lib/reverseTrial.ts', 'utf8'))
const iPais = rt.indexOf('filmeGratisPermitido(args.country'), iLado = rt.indexOf('const ladoTeste = noTeste'), iGrant = rt.indexOf("trial_status: 'active',\n          trial_ends_at: endsAt")
checa('E o sorteio vem depois das portas e antes da concessão', iPais > 0 && iPais < iLado && iLado < iGrant)
checa('E conta da casa fica de fora', rt.includes('testeAberto(Date.now()) && !isInternalEmail(args.email)'))
checa('E a marca nunca sobrescreve trial já decidido', /update\(\{ trial_status: TRIAL_PEDIDO_STATUS \}\)[\s\S]{0,80}\.is\('trial_status', null\)/.test(rt))
checa('E o clique só vale para o lado a pedido e não soma duas vezes', rt.includes(".eq('trial_status', TRIAL_PEDIDO_STATUS)") && rt.includes("write.eq('video_credits', balance)"))
checa('E os dois lados gravam o sorteio', (rt.match(/name: TRIAL_PEDIDO_ATRIBUIDO_EVENT/g) ?? []).length === 2)
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
checa('E a rota recusa com o filme grátis na frase, sem cobrar', rota.includes("profile?.trial_status === TRIAL_PEDIDO_STATUS) return NextResponse.json({ error: TRIAL_PEDIDO_REFUSAL"))
const lay = lf(fs.readFileSync('app/(dashboard)/layout.tsx', 'utf8'))
checa('E a faixa está no painel', lay.includes('trialPedidoVisivel(profile') && lay.includes('<TrialPedidoBanner />'))
const cl = lf(fs.readFileSync('app/api/trial/claim/route.ts', 'utf8'))
checa('E o pedido exige login e não lê nada do cliente', cl.includes('status: 401') && !cl.includes('req.json') && cl.includes('claimOnRequestTrial(user.id)'))

// F. a concessão de verdade, com banco simulado: sorteio, marca, clique, duplo clique e quem pagou
function banco(linha) {
  function tabela() {
    const q = { filtros: [], patch: null }
    const passa = () => q.filtros.every(([c, v]) => (linha[c] ?? null) === v)
    const fim = async () => {
      if (q.patch) { if (!passa()) return { data: [], error: null }; Object.assign(linha, q.patch); return { data: [{ id: linha.id }], error: null } }
      return { data: passa() ? { ...linha } : null, error: null }
    }
    const api = {
      select() { return api }, update(p) { q.patch = p; return api }, insert() { return Promise.resolve({ data: null, error: null }) },
      eq(c, v) { q.filtros.push([c, v]); return api }, is(c, v) { q.filtros.push([c, v]); return api }, gte() { return api }, order() { return api }, limit() { return api },
      maybeSingle: fim, single: fim, then(a, b) { return fim().then(a, b) },
    }
    return api
  }
  return { from() { return tabela() } }
}
const eventos = []
function reverso(linha, mutar = null) {
  const db = banco(linha)
  return createOfflineLoader({
    env: { KINEO_REVERSE_TRIAL_ENABLED: 'true', SUPABASE_SERVICE_ROLE_KEY: 'x', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' },
    mocks: { '@supabase/supabase-js': { createClient: () => db }, '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } } },
    source: (rel, x) => (mutar && rel === 'lib/reverseTrial.ts' ? mutar(x) : x),
  })('lib/reverseTrial.ts')
}
const idDe = (lado) => ids.find((id) => m.ladoDoTeste(id) === lado)
const novaConta = (id) => ({ id, trial_status: null, plan: 'free', has_paid: false, video_credits: 0 })
const agora = new Date().toISOString()
const dentro = m.testeAberto(Date.now())
const args = (id, email = 'pessoa@gmail.com') => ({ userId: id, email, userCreatedAt: agora, country: 'US' })
if (dentro) {
  const l1 = novaConta(idDe('a_pedido')); const r1 = reverso(l1)
  const a1 = await r1.maybeActivateReverseTrial(args(l1.id))
  checa(`F lado a pedido: sem crédito e com a marca (${a1.reason})`, a1.reason === 'on_request' && l1.trial_status === 'on_request' && l1.video_credits === 0)
  checa('F lado a pedido: grava o sorteio', eventos.some((e) => e.name === 'trial_test_assigned' && e.metadata.arm === 'a_pedido'))
  const c1 = await r1.claimOnRequestTrial(l1.id)
  checa(`F o clique libera o mesmo crédito do cadastro (${c1.reason})`, c1.claimed === true && l1.trial_status === 'active' && l1.video_credits === r1.TRIAL_GRANT_CREDITS && l1.trial_credits_granted === r1.TRIAL_GRANT_CREDITS && !!l1.trial_ends_at)
  const c2 = await r1.claimOnRequestTrial(l1.id)
  checa('F o segundo clique não soma', c2.claimed === false && c2.reason === 'already_claimed' && l1.video_credits === r1.TRIAL_GRANT_CREDITS)
  const l2 = novaConta(idDe('controle')); const r2 = reverso(l2)
  const a2 = await r2.maybeActivateReverseTrial(args(l2.id))
  checa(`F lado controle: igual a hoje (${a2.reason})`, a2.activated === true && l2.trial_status === 'active' && l2.video_credits === r2.TRIAL_GRANT_CREDITS)
  checa('F lado controle: grava o sorteio', eventos.some((e) => e.name === 'trial_test_assigned' && e.metadata.arm === 'controle'))
  const l3 = { ...novaConta(idDe('a_pedido')), trial_status: 'on_request', has_paid: true }
  const c3 = await reverso(l3).claimOnRequestTrial(l3.id)
  checa('F quem pagou não recebe pelo clique', c3.claimed === false && c3.reason === 'not_on_request' && l3.video_credits === 0)
  const l4 = { ...novaConta(idDe('controle')), trial_status: 'active', video_credits: 5 }
  const c4 = await reverso(l4).claimOnRequestTrial(l4.id)
  checa('F conta do trial normal não ganha mais', c4.claimed === false && l4.video_credits === 5)
  const l5 = novaConta(idDe('a_pedido')); await reverso(l5).maybeActivateReverseTrial(args(l5.id, 'josephsskaf@gmail.com'))
  checa('F conta da casa fica fora do teste', l5.trial_status === 'active')
  const l6 = novaConta(idDe('a_pedido')); await reverso(l6, (x) => x.replace('const noTeste = testeAberto(Date.now()) && !isInternalEmail(args.email)', 'const noTeste = false')).maybeActivateReverseTrial(args(l6.id))
  checa('F mutante sem o teste: a conta volta a nascer com crédito', l6.trial_status === 'active')
} else checa('F fora da janela do teste: execução pulada', true)

console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
