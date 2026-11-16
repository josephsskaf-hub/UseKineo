// KINEO-PLACAR-FILME-GRATIS-1611 [CEO 16/11, Semana 1: placar diário do 1º filme grátis no /admin, nota do revisor + nota
// automática "em prova"] — guardião sem rede. A conta (só 1º filme, % sobre os que têm nota, sem nota, defeitos, motor, dia de
// Brasília, 168 h, régua da prova), a leitura (só plano grátis, sem conta interna, nota 'auto' não vale como revisor, evento de
// outra versão não vale) e a porta da rota (só administrador). Mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const P = createOfflineLoader()('lib/admin/placarFilmeGratis.ts')

const AGORA = Date.parse('2026-11-16T22:45:00Z') // 19:45 em Brasília
const f = (o) => ({ id: o.id ?? Math.random().toString(36).slice(2), criadoEm: o.t, motor: o.motor ?? 'kling4', primeiro: o.primeiro ?? true, notaRevisor: o.rev ?? null, defeitos: o.def ?? [], notaAuto: o.auto ?? null })
const FILMES = [
  f({ t: '2026-11-16T20:00:00Z', rev: 8, auto: 8 }),
  f({ t: '2026-11-16T12:00:00Z', rev: 5, def: ['CENA_FORA_DO_PEDIDO', 'PERSONAGEM_TROCOU'], auto: 1 }),
  f({ t: '2026-11-16T10:00:00Z', rev: 9, motor: 'h3_max_turbo', auto: 6 }), // alarme falso
  f({ t: '2026-11-16T09:00:00Z', rev: null }), // sem nota
  f({ t: '2026-11-16T02:00:00Z', rev: 6, def: ['CENA_FORA_DO_PEDIDO'], auto: 7.5 }), // 23h de 15/11 em Brasília; ruim que escapou
  f({ t: '2026-11-15T15:00:00Z', rev: 7, def: ['REPETICAO', 'CENA_FORA_DO_PEDIDO', 'CENA_FORA_DO_PEDIDO'] }),
  f({ t: '2026-11-15T15:00:00Z', rev: 10, primeiro: false }), // 2º filme da pessoa: fora
  f({ t: '2026-11-09T21:00:00Z', rev: 2 }), // 7 dias e 1h45 atrás: fora das 168 h
]
const pl = P.montarPlacar(FILMES, AGORA)
const s = pl.semana
checa('meta de 70%', pl.meta === 70)
checa('7 dias contam só 1ºs filmes dentro das 168 h', s.filmes === 6)
checa('sem nota contado à parte', s.semNota === 1 && s.comNota === 5)
checa('nota ≥ 8 e % sobre quem tem nota', s.oitoOuMais === 2 && s.pct === 40)
checa('média só de quem tem nota (8+5+9+6+7)/5', s.media === 7)
checa('defeitos: mais frequente primeiro, repetido no mesmo filme conta 1', s.defeitos[0].codigo === 'CENA_FORA_DO_PEDIDO' && s.defeitos[0].n === 3 && s.defeitos.length === 3)
const k4 = s.motores.find((m) => m.motor === 'kling4'), h3 = s.motores.find((m) => m.motor === 'h3_max_turbo')
checa('quebra por motor', k4.filmes === 5 && k4.comNota === 4 && k4.oitoOuMais === 1 && h3.filmes === 1 && h3.oitoOuMais === 1)
checa('nota auto: julgados, ≥ 8 e média', s.auto.julgados === 4 && s.auto.oitoOuMais === 1 && s.auto.media === 5.6)
checa('prova: ruins pegos (< 7) e alarme falso nos bons (≥ 7,5)', s.auto.ruins === 2 && s.auto.ruinsPegos === 1 && s.auto.bons === 2 && s.auto.alarmes === 1)
checa('7 linhas de dia, hoje primeiro', pl.dias.length === 7 && pl.dias[0].rotulo === 'Hoje' && pl.dias[0].chave === '2026-11-16' && pl.dias[6].chave === '2026-11-10')
checa('dia de Brasília: 02:00 UTC de 16/11 cai em 15/11', pl.dias[0].filmes === 4 && pl.dias[1].filmes === 2 && pl.dias[1].rotulo === '15/11')
checa('dia sem filme: tudo vazio, sem %', pl.dias[3].filmes === 0 && pl.dias[3].pct === null && pl.dias[3].media === null)
checa('leitura começa no dia mais velho ou 168 h antes', P.inicioDaLeitura(AGORA) === '2026-11-09T22:45:00.000Z')
checa('fração', P.fracao(37, 41) === '37 de 41 (90%)' && P.fracao(0, 0) === '—')

const mut = (de, para) => createOfflineLoader({ source: (rel, t) => (rel === 'lib/admin/placarFilmeGratis.ts' ? t.replace(de, para) : t) })('lib/admin/placarFilmeGratis.ts')
checa('mutante sem o filtro de 1º filme fica vermelho', mut('filmes.filter((f) => f.primeiro)', 'filmes').montarPlacar(FILMES, AGORA).semana.filmes !== 6)
checa('mutante de % sobre todos (com os sem nota) fica vermelho', mut('(100 * oito) / notados.length', '(100 * oito) / filmes.length').montarPlacar(FILMES, AGORA).semana.pct !== 40)
checa('mutante de dia em UTC fica vermelho', mut('const BRASILIA_MS = -3 * 3600_000', 'const BRASILIA_MS = 0').montarPlacar(FILMES, AGORA).dias[0].filmes !== 4)

// Leitura: banco falso com os filtros que a rota usa.
const T = {
  videos: [
    { id: 'v1', user_id: 'u1', created_at: '2026-11-16T20:00:00Z', engine_used: 'kling4', video_url: 'L1', quality_mode: 'cinematic_ai', status: 'completed' },
    { id: 'v2', user_id: 'u2', created_at: '2026-11-16T19:00:00Z', engine_used: 'kling4', video_url: 'L2', quality_mode: 'cinematic_ai', status: 'completed' },
    { id: 'v3', user_id: 'u3', created_at: '2026-11-16T18:00:00Z', engine_used: 'kling4', video_url: 'L3', quality_mode: 'cinematic_ai', status: 'completed' }, // pago
    { id: 'v4', user_id: 'u4', created_at: '2026-11-16T17:00:00Z', engine_used: 'kling4', video_url: 'L4', quality_mode: 'cinematic_ai', status: 'completed' }, // interno
    { id: 'v5', user_id: 'u5', created_at: '2026-11-16T16:00:00Z', engine_used: 'kling4', video_url: 'L5', quality_mode: 'cinematic_ai', status: 'completed' }, // já tinha vídeo antes
    { id: 'v0', user_id: 'u5', created_at: '2026-10-01T16:00:00Z', engine_used: 'kling4', video_url: 'L0', quality_mode: 'clip', status: 'completed' },
    { id: 'v6', user_id: 'u6', created_at: '2026-11-16T15:00:00Z', engine_used: null, video_url: 'L6', quality_mode: 'clip', status: 'completed' }, // clipe
    { id: 'v7', user_id: 'u1', created_at: '2026-11-16T21:00:00Z', engine_used: 'kling4', video_url: 'L7', quality_mode: 'cinematic_ai', status: 'failed' },
  ],
  profiles: [
    { id: 'u1', plan: 'free', email: 'a@cliente.com' }, { id: 'u2', plan: 'free', email: 'b@cliente.com' }, { id: 'u3', plan: 'starter', email: 'c@cliente.com' },
    { id: 'u4', plan: 'free', email: 'josephsskaf@gmail.com' }, { id: 'u5', plan: 'free', email: 'e@cliente.com' }, { id: 'u6', plan: 'free', email: 'f@cliente.com' },
  ],
  film_review_notes: [
    { link: 'L1', nota: '8.0', defeitos: [], fonte: 'revisor' },
    { link: 'L2', nota: 3, defeitos: ['ANATOMIA'], fonte: 'auto' }, // nota do juiz no painel: não é do revisor
  ],
  events: [
    { id: 'e1', name: 'nota_auto', session_id: 'v1', created_at: '2026-11-16T20:05:00Z', metadata: { version: 'nota_auto_v3_regua19', score: 6 } },
    { id: 'e2', name: 'nota_auto', session_id: 'v1', created_at: '2026-11-16T20:09:00Z', metadata: { version: 'nota_auto_v3_regua19', score: 9 } },
    { id: 'e3', name: 'nota_auto', session_id: 'v2', created_at: '2026-11-16T19:05:00Z', metadata: { version: 'nota_auto_v2', score: 2 } },
  ],
}
function falsoBanco() {
  return {
    from(tabela) {
      const filtros = []; let colunas = ''
      const q = {
        select(c) { colunas = c; return q },
        eq(c, v) { filtros.push((r) => r[c] === v); return q },
        gte(c, v) { filtros.push((r) => r[c] >= v); return q },
        lt(c, v) { filtros.push((r) => r[c] < v); return q },
        in(c, vs) { filtros.push((r) => vs.includes(r[c])); return q },
        order() { return q },
        range(a, b) {
          const linhas = T[tabela].filter((r) => filtros.every((fn) => fn(r))).slice(a, b + 1).map((r) => {
            if (tabela !== 'events') return r
            return { ...r, score: r.metadata.score, versao: r.metadata.version }
          })
          return Promise.resolve({ data: linhas, error: null })
        },
      }
      void colunas
      return q
    },
  }
}
const L = createOfflineLoader()('lib/admin/placarFilmeGratisLeitura.ts')
const lidos = await L.lerFilmesDoPlacar(falsoBanco(), AGORA)
const porId = Object.fromEntries(lidos.map((x) => [x.id, x]))
checa('só filme (cinematic_ai) concluído de conta grátis e não interna', lidos.map((x) => x.id).sort().join() === 'v1,v2,v5')
checa('nota do revisor pelo link', porId.v1.notaRevisor === 8 && porId.v1.primeiro === true)
checa('nota "auto" no painel não conta como revisor', porId.v2.notaRevisor === null)
checa('nota automática: a última da versão v3', porId.v1.notaAuto === 9)
checa('evento de outra versão não vale', porId.v2.notaAuto === null)
checa('quem já tinha vídeo antes não é 1º filme', porId.v5.primeiro === false)

// Porta da rota e lugar no painel.
async function chamaRota(admin) {
  const rota = createOfflineLoader({ mocks: {
    'next/server': { NextResponse: { json: (body, o = {}) => ({ status: o.status ?? 200, body }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { email: 'x@y' } } }) } }) },
    '../_shared/db': { isAdminEmail: () => admin, serviceClient: () => falsoBanco() },
  }, globals: { Date } })('app/api/admin/placar-filme-gratis/route.ts')
  return rota.GET()
}
checa('rota recusa quem não é administrador', (await chamaRota(false)).status === 403)
const ok = await chamaRota(true)
checa('rota devolve o placar ao administrador', ok.status === 200 && ok.body.meta === 70 && Array.isArray(ok.body.dias))
const painel = fs.readFileSync('components/LiveNowPanel.tsx', 'utf8')
const lugar = painel.indexOf('<PlacarFilmeGratis />')
checa('placar em largura cheia, depois do tráfego e antes das duas colunas', lugar > painel.indexOf('<CheckoutHonestoCard') && lugar < painel.indexOf('.lnp-duas{'))
const tela = fs.readFileSync('components/admin/PlacarFilmeGratis.tsx', 'utf8')
checa('rótulo diz a fonte (revisor) e a nota auto "em prova"', tela.includes('nota do revisor') && tela.includes('em prova') && tela.includes('Sem nota'))

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nPASS placar-filme-gratis-1611')
process.exit(falhas ? 1 : 0)
