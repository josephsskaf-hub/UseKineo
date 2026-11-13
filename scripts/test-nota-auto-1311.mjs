// KINEO-NOTA-AUTO-1311 — guardião da NOTA AUTOMÁTICA do filme (parte B da "Opção C" do fundador, 13/11/2026).
// OFFLINE: executa o código real de lib/regua95/notaRevisor.ts com fetch e banco FALSOS (nenhuma rede, chave ou custo).
// Provas:
//   N1  as categorias são as do REVISOR (SKILL.md passo 3), mesma ordem, mesmos nomes;
//   N2  a nota nasce no CÓDIGO a partir dos defeitos (base 8; leve −0,5; grave −1,5; grave central −2;
//       passos de 0,5; mesma categoria conta uma vez);
//   N3  defeito sem quadro de evidência é descartado; REPETICAO/PERSONAGEM_TROCOU exigem 2 quadros; categoria estranha vira OUTRO;
//       a nota solta do modelo ("score") é ignorada;
//   N4  o prompt lista as 19 categorias, pede evidência por quadro, NÃO pede nota, e usa só modelos do registro (lib/aiModels.ts);
//   N5  julgarNotaAuto: custo pelo uso real; HTTP != 200 ou JSON quebrado = null (nunca lança);
//   N6  interruptor NOTA_AUTO_MODE: off · sombra · on; NASCE 'sombra' (ordem da CEO 13/11 16:42); desconhecido = 'sombra', nunca 'on';
//   N7  a nota do REVISOR manda: linha com fonte != 'auto' (inclusive nula) nunca é sobrescrita;
//   N8  ponta a ponta com banco falso, JÁ NO JUIZ POR CENA (2ª tentativa, notaPorCena.ts — o cron não chama mais o juiz v1):
//       observe só grava o evento; painel grava fonte 'auto' + motor; update só com .eq('fonte','auto'); conta da casa fora do
//       painel; quadro indisponível = evento de falha (score null); filme sem plano de cenas = falha, sem nota;
//   N9  fila: só ligado, só filme, janela de 6 h, uma vez; marcador "julgando" < 5 min segura; nota < 7 = evento nota_auto_baixa;
//       caminhos: disparo na hora (compose/status, só insert novo, depois da resposta) + cron de 1 min; o coletor da régua NÃO julga mais;
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Rodar: node scripts/test-nota-auto-1311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const ARQ = 'lib/regua95/notaRevisor.ts'
const FONTE = lf(fs.readFileSync(ARQ, 'utf8'))
const COLETAR = lf(fs.readFileSync('lib/regua95/coletar.ts', 'utf8'))

const CATEGORIAS_SKILL = ['PERSONAGEM_TROCOU', 'PESSOA_FALTANDO', 'PRODUTO_FALTANDO', 'PRODUTO_DEFORMADO', 'CENA_FORA_DO_PEDIDO', 'NARRACAO_LE_INSTRUCAO', 'TEXTO_INVENTADO', 'ANATOMIA', 'LEGENDA', 'DURACAO_CURTA', 'QUADRO_PRETO_OU_BORRADO', 'MARCA_DE_TERCEIRO', 'REPETICAO', 'FINAL_FRACO', 'EFEITO_NAO_ACONTECEU', 'ROSTO_DIFERENTE_DA_FOTO', 'BOCA_FORA_DE_SINCRONIA', 'OLHOS_FECHADOS_OU_MORTOS', 'OUTRO']
// Quando a régua do revisor estiver na máquina, ela manda: a lista acima tem de ser a do SKILL.md, na mesma ordem.
const SKILL = 'C:/Users/josep/.claude/scheduled-tasks/kineo-revisor-de-videos/SKILL.md'
let categoriasDoSkill = null
try {
  const t = fs.readFileSync(SKILL, 'utf8')
  const m = /Categorias \(usar estes nomes[^:]*\):([\s\S]*?)Áudio\/voz/.exec(t)
  if (m) categoriasDoSkill = Array.from(m[1].matchAll(/\b([A-Z][A-Z_]{3,})\b/g)).map((x) => x[1])
} catch { /* fora da máquina do fundador: vale a cópia acima */ }

function carregar(transform) {
  const globals = { setTimeout: () => 0, clearTimeout() {}, AbortController }
  return createOfflineLoader({ globals, env: { OPENAI_API_KEY: 'k', FAL_KEY: 'f' }, source: transform ? (rel, text) => (rel.replace(/\\/g, '/').endsWith(ARQ) ? transform(lf(text)) : text) : null })(ARQ)
}

// resposta do juiz por cena (v2): 3 momentos; no 2º a ação não bate (com "vejo") — a régua do código tira acao/3 da base
const MOMENTO = (m, acao = 'sim', vejo = 'a fox walking on snow') => ({ m, sujeito: { da_fala: 'fox', aparece: 'sim', vejo }, acao: { bate: acao, vejo }, texto: { outro_texto: '', ilegivel: false }, epoca_lugar: { bate: 'sim', vejo } })
const VISAO_CENA = { momentos: [MOMENTO(1), MOMENTO(2, 'nao', 'a city street with cars, no snow'), MOMENTO(3)], resumo: 'resumo de teste', nota: 10 }
const RESPOSTA = (defects, extra = {}) => ({ must_appear: ['x'], frames: [], defects, summary: 'resumo de teste', score: 10, ...extra })
function falsoFetch({ visao = RESPOSTA([]), visaoOk = true, falOk = true, chamadas = [] } = {}) {
  return async (url, init) => {
    chamadas.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null })
    if (String(url).startsWith('https://fal.run/')) {
      if (!falOk) return { ok: false, status: 500, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({ images: Array.from({ length: 40 }, (_, i) => ({ url: `https://fal.media/q${i}.jpg` })) }) }
    }
    if (!visaoOk) return { ok: false, status: 429, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: typeof visao === 'string' ? visao : JSON.stringify(visao) } }], usage: { prompt_tokens: 14000, completion_tokens: 800 } }) }
  }
}
function falsoBanco({ existente = null, email = 'cliente@exemplo.com' } = {}) {
  const ops = []
  const builder = (table) => {
    const q = { table, op: 'select', filtros: [], payload: null }
    const fim = () => {
      ops.push(q)
      if (q.table === 'film_review_notes' && q.op === 'select') return { data: existente, error: null }
      if (q.op === 'select' && q.head) return { count: 2, error: null }
      return { data: null, error: null }
    }
    const b = {
      select(_c, o) { if (o?.head) q.head = true; return b },
      eq(c, v) { q.filtros.push(['eq', c, v]); return b },
      in(c, v) { q.filtros.push(['in', c, v]); return b },
      lte(c, v) { q.filtros.push(['lte', c, v]); return b },
      insert(p) { q.op = 'insert'; q.payload = p; return b },
      update(p) { q.op = 'update'; q.payload = p; return b },
      maybeSingle() { return Promise.resolve(fim()) },
      then(res, rej) { return Promise.resolve(fim()).then(res, rej) },
    }
    return b
  }
  return { ops, admin: { from: builder, auth: { admin: { getUserById: async () => ({ data: { user: email ? { email } : null }, error: null }) } } } }
}
const PLANO = { segundos: 15, elenco: [], momentos: [1, 2, 3].map((m) => ({ m, cena: m, inicio: (m - 1) * 5, fim: m * 5, fala: 'A fox walks in the snow.', nomes: [] })) }
const ENTREGA = { key: 'vid-1', user_id: 'u-1', delivered_at: new Date().toISOString(), video_url: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/x.mp4', seconds: 15, product: 'filme', notaAuto: { pedido: 'HOOK: [Pexels: forest] a fox in the snow', roteiro: 'A fox walks in the snow.', motor: 'kling4', plano: PLANO } }
// nota esperada do v2 = a régua do código (notaPorCena) aplicada à contagem desta resposta: 1 de 3 momentos com a ação errada
const P = createOfflineLoader({ globals: { setTimeout: () => 0, clearTimeout() {}, AbortController }, env: {} })('lib/regua95/notaPorCena.ts')
const NOTA_V2 = P.notaDasRespostas({ momentos: 3, semSujeito: 0, acao: 1, troca: 0, texto: 0, epoca: 0 })

async function provas(N) {
  const falhas = []
  const checa = (nome, cond) => { if (!cond) falhas.push(nome) }
  // N1
  checa('N1 categorias = SKILL', JSON.stringify(Array.from(N.CATEGORIAS_REVISOR)) === JSON.stringify(CATEGORIAS_SKILL) && (!categoriasDoSkill || JSON.stringify(categoriasDoSkill) === JSON.stringify(CATEGORIAS_SKILL)))
  // N2
  const d = (categoria, gravidade) => ({ categoria, gravidade })
  checa('N2 sem defeito = 8', N.notaDosDefeitos([]) === 8)
  checa('N2 um leve = 7,5', N.notaDosDefeitos([d('FINAL_FRACO', 'leve')]) === 7.5)
  checa('N2 grave central = 6', N.notaDosDefeitos([d('PERSONAGEM_TROCOU', 'grave')]) === 6)
  checa('N2 grave comum = 6,5', N.notaDosDefeitos([d('LEGENDA', 'grave')]) === 6.5)
  checa('N2 grave central + leve = 5,5', N.notaDosDefeitos([d('PESSOA_FALTANDO', 'grave'), d('REPETICAO', 'leve')]) === 5.5)
  checa('N2 mesma categoria conta uma vez (a mais grave)', N.notaDosDefeitos([d('REPETICAO', 'leve'), d('REPETICAO', 'grave'), d('REPETICAO', 'leve')]) === 6.5)
  checa('N2 piso 1', N.notaDosDefeitos(CATEGORIAS_SKILL.map((c) => d(c, 'grave'))) === 1)
  checa('N2 passos de 0,5', [[], [d('OUTRO', 'leve')], [d('ANATOMIA', 'grave'), d('LEGENDA', 'leve'), d('FINAL_FRACO', 'leve')]].every((x) => Number.isInteger(N.notaDosDefeitos(x) * 2)))
  // N3
  const nd = N.normalizarDefeitos(RESPOSTA([
    { category: 'ANATOMIA', severity: 'grave', frames: [], evidence: 'sem quadro' },
    { category: 'REPETICAO', severity: 'leve', frames: [3], evidence: 'um quadro só' },
    { category: 'PERSONAGEM_TROCOU', severity: 'grave', frames: [2, 7, 99], evidence: 'rosto muda' },
    { category: 'epoca_errada', severity: 'leve', frames: [1], evidence: 'carro moderno em 1800' },
    { category: 'TEXTO_INVENTADO', severity: 'GRAVE', frames: [40], evidence: 'fora do vídeo' },
  ]), 12)
  checa('N3 descarta sem evidência válida', nd.descartados === 3 && nd.defeitos.length === 2)
  checa('N3 quadro fora do vídeo sai da lista', JSON.stringify(nd.defeitos[0]?.quadros) === '[2,7]')
  checa('N3 categoria estranha vira OUTRO com o nome', nd.defeitos[1]?.categoria === 'OUTRO' && nd.defeitos[1]?.evidencia.startsWith('EPOCA_ERRADA:'))
  checa('N3 resumo do modelo', nd.resumo === 'resumo de teste')
  // N4
  const msgs = N.buildNotaAutoMessages({ quadros: [{ url: 'data:image/jpeg;base64,AA', t: 0 }, { url: 'https://x/q.jpg', t: 1.5 }], pedido: 'HOOK: [Pexels: city] a cat', roteiro: 'A cat.', produto: 'filme', motor: 'kling4', segundos: 15 }, 'high')
  const sys = msgs[0].content, user = msgs[1].content
  checa('N4 lista as 19 categorias', CATEGORIAS_SKILL.every((c) => sys.includes(`- ${c}:`)))
  checa('N4 pede evidência por quadro e NÃO pede nota', /must cite the frame indexes/.test(sys) && !/"score"|"rating"|"nota"/i.test(sys))
  checa('N4 quadros em high, URL ou data URL', user.filter((c) => c.type === 'image_url').every((c) => c.image_url.detail === 'high') && user.filter((c) => c.type === 'image_url').length === 2)
  checa('N4 pedido sem marcadores do roteirista', /a cat/.test(user[0].text) && !/Pexels|HOOK/.test(user[0].text))
  checa('N4 modelos só do registro', !/['"]gpt-[^'"]*['"]/.test(FONTE) && /NOTA_AUTO_MODEL_DEFAULT: string = AI_TEXT_MODELS\.writer/.test(FONTE))
  // N5
  const ent = { quadros: Array.from({ length: 12 }, (_, i) => ({ url: `https://x/${i}.jpg`, t: i })), pedido: 'p', roteiro: 'r', produto: 'filme', motor: 'kling4', segundos: 15 }
  const r5 = await N.julgarNotaAuto(ent, { apiKey: 'k', model: 'gpt-4o', fetchImpl: falsoFetch({ visao: RESPOSTA([{ category: 'PESSOA_FALTANDO', severity: 'grave', frames: [0, 1], evidence: 'ninguém' }]) }) })
  checa('N5 nota pelos defeitos, não pelo "score" do modelo', r5?.nota === 6 && r5?.defeitos.length === 1)
  checa('N5 custo pelo uso (gpt-4o: 14k entrada + 800 saída = US$ 0,043)', Math.abs((r5?.usd ?? 0) - 0.043) < 1e-6)
  checa('N5 HTTP != 200 = null', (await N.julgarNotaAuto(ent, { apiKey: 'k', fetchImpl: falsoFetch({ visaoOk: false }) })) === null)
  checa('N5 JSON quebrado = null', (await N.julgarNotaAuto(ent, { apiKey: 'k', fetchImpl: falsoFetch({ visao: 'não é json' }) })) === null)
  // N6
  checa('N6 interruptor nasce sombra; off desliga; on/painel = on; o resto = sombra', N.lerModoNotaAuto({}) === 'sombra' && N.lerModoNotaAuto({ NOTA_AUTO_MODE: ' OFF ' }) === 'off' && N.lerModoNotaAuto({ NOTA_AUTO_MODE: 'on' }) === 'on' && N.lerModoNotaAuto({ NOTA_AUTO_MODE: 'painel' }) === 'on' && N.lerModoNotaAuto({ NOTA_AUTO_MODE: 'observe' }) === 'sombra' && N.lerModoNotaAuto({ NOTA_AUTO_MODE: 'liga' }) === 'sombra')
  // N7
  checa('N7 a nota do revisor manda', N.decidirEscritaPainel('on', { fonte: 'revisor' }) === 'pular' && N.decidirEscritaPainel('on', { fonte: null }) === 'pular' && N.decidirEscritaPainel('on', { fonte: 'auto' }) === 'atualizar' && N.decidirEscritaPainel('on', null) === 'inserir' && N.decidirEscritaPainel('sombra', null) === 'pular' && N.decidirEscritaPainel('off', null) === 'pular')
  // N8
  const vis = VISAO_CENA
  const base = { product: 'filme', video_id: 'vid-1' }
  {
    const B = falsoBanco()
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'sombra', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ visao: vis }) })
    const ev = B.ops.filter((o) => o.table === 'events' && o.op === 'insert' && o.payload.name === 'nota_auto')
    const nomes = B.ops.filter((o) => o.table === 'events' && o.op === 'insert').map((o) => o.payload.name).join()
    checa('N8 sombra: marcador + evento nota_auto, nada no painel', nomes === 'nota_auto_inicio,nota_auto' && r.nota === NOTA_V2 && ev.length === 1 && ev[0].payload.name === 'nota_auto' && ev[0].payload.metadata.score === NOTA_V2 && ev[0].payload.metadata.version === 'nota_auto_v2_cena' && !('bruto' in ev[0].payload.metadata) && !B.ops.some((o) => o.table === 'film_review_notes'))
  }
  {
    const B = falsoBanco({ existente: null })
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'on', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ visao: vis }) })
    const ins = B.ops.find((o) => o.table === 'film_review_notes' && o.op === 'insert')
    checa('N8 painel sem linha: insere fonte auto, motor real, quem antes do @', r.painel === 'inserir' && ins?.payload.fonte === 'auto' && ins?.payload.motor === 'kling4' && ins?.payload.quem === 'cliente' && ins?.payload.nota === NOTA_V2 && JSON.stringify(ins?.payload.defeitos) === '["CENA_FORA_DO_PEDIDO"]' && ins?.payload.ordem === 4)
  }
  {
    const B = falsoBanco({ existente: { fonte: 'revisor' } })
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'on', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ visao: vis }) })
    checa('N8 painel com nota do revisor: não toca', r.painel === 'pular_nota_do_revisor' && !B.ops.some((o) => o.table === 'film_review_notes' && (o.op === 'insert' || o.op === 'update')))
  }
  {
    const B = falsoBanco({ existente: { fonte: 'auto' } })
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'on', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ visao: vis }) })
    const up = B.ops.find((o) => o.table === 'film_review_notes' && o.op === 'update')
    checa('N8 painel com nota auto: atualiza só onde fonte = auto', r.painel === 'atualizar' && !!up && up.filtros.some((f) => f[0] === 'eq' && f[1] === 'fonte' && f[2] === 'auto') && up.filtros.some((f) => f[1] === 'link'))
  }
  {
    const B = falsoBanco({ email: 'josephsskaf@gmail.com' })
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'on', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ visao: vis }) })
    checa('N8 conta da casa fora do painel', r.painel === 'pular_conta_interna' && !B.ops.some((o) => o.table === 'film_review_notes'))
  }
  {
    const B = falsoBanco()
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'on', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ falOk: false }) })
    const ev = B.ops.find((o) => o.table === 'events' && o.op === 'insert' && o.payload.name === 'nota_auto')
    checa('N8 sem quadros: evento de falha com score null, nada no painel', r.nota === null && ev?.payload.metadata.score === null && ev?.payload.metadata.falha === 'nota_auto_quadros_indisponiveis' && !B.ops.some((o) => o.table === 'film_review_notes'))
  }
  {
    const B = falsoBanco()
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'sombra', entrega: { ...ENTREGA, notaAuto: { ...ENTREGA.notaAuto, plano: null } }, base, route: '/x', fetchImpl: falsoFetch({ visao: vis }) })
    const ev = B.ops.find((o) => o.table === 'events' && o.op === 'insert' && o.payload.name === 'nota_auto')
    checa('N8 sem plano de cenas: falha registrada, sem nota (o juiz v1 não volta)', r.nota === null && ev?.payload.metadata.falha === 'nota_auto_sem_plano_de_cenas' && ev?.payload.metadata.score === null)
  }
  {
    // nota < 7 → evento nota_auto_baixa com vídeo, nota, defeitos e evidência (frente 3); validado:false até o juiz passar na régua
    const B = falsoBanco()
    const ruim = { momentos: [1, 2, 3].map((m) => MOMENTO(m, 'nao', 'a city street with cars, no snow')), resumo: 'ruim' }
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'sombra', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ visao: ruim }) })
    const b = B.ops.find((o) => o.table === 'events' && o.op === 'insert' && o.payload.name === 'nota_auto_baixa')
    checa('N8 nota < 7 = nota_auto_baixa com defeitos e evidência', r.nota < 7 && b?.payload.metadata.nota === r.nota && b?.payload.metadata.video_url === ENTREGA.video_url && b?.payload.metadata.defeitos.length === 3 && b?.payload.metadata.defeitos.every((d) => d.evidencia && d.categoria === 'CENA_FORA_DO_PEDIDO') && b?.payload.metadata.validado === false)
    const B2 = falsoBanco()
    await N.julgarEGravarNotaAuto(B2.admin, { modo: 'sombra', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ visao: vis }) })
    checa('N8 nota ≥ 7 não gera nota_auto_baixa', !B2.ops.some((o) => o.payload?.name === 'nota_auto_baixa'))
  }
  {
    const B = falsoBanco()
    const r = await N.julgarEGravarNotaAuto(B.admin, { modo: 'off', entrega: ENTREGA, base, route: '/x', fetchImpl: falsoFetch({ visao: vis }) })
    checa('N8 off: não chama nada', r.nota === null && B.ops.length === 0)
  }
  // N9
  const agora = Date.now()
  const novo = { key: 'a', delivered_at: new Date(agora - 3600_000).toISOString(), notaAuto: ENTREGA.notaAuto }
  checa('N9 pendente: só ligado, só filme, só 6 h, só uma vez', N.notaAutoPendente('sombra', novo, new Set(), agora) && !N.notaAutoPendente('off', novo, new Set(), agora) && !N.notaAutoPendente('on', { ...novo, notaAuto: null }, new Set(), agora) && !N.notaAutoPendente('on', { ...novo, delivered_at: new Date(agora - 7 * 3600_000).toISOString() }, new Set(), agora) && !N.notaAutoPendente('on', novo, new Set(['a']), agora))
  const feitas = await N.notasAutoFeitas({ from: () => null }, ['ok', 'falhou-agora', 'velha', 'desistiu', 'julgando', 'parado'], async () => ({ data: [
    { name: 'nota_auto_inicio', created_at: new Date(agora - 60_000).toISOString(), session_id: 'julgando', metadata: { version: N.NOTA_AUTO_VERSAO_DO_CRON } },
    { name: 'nota_auto_inicio', created_at: new Date(agora - 10 * 60_000).toISOString(), session_id: 'parado', metadata: { version: N.NOTA_AUTO_VERSAO_DO_CRON } },
    { created_at: new Date(agora - 60_000).toISOString(), session_id: 'ok', metadata: { version: N.NOTA_AUTO_VERSAO_DO_CRON, score: 7 } },
    { created_at: new Date(agora - 60_000).toISOString(), session_id: 'falhou-agora', metadata: { version: N.NOTA_AUTO_VERSAO_DO_CRON, score: null } },
    { created_at: new Date(agora - 60_000).toISOString(), session_id: 'velha', metadata: { version: 'nota_auto_v0', score: 7 } },
    ...[1, 2, 3].map(() => ({ created_at: new Date(agora - 5 * 3600_000).toISOString(), session_id: 'desistiu', metadata: { version: N.NOTA_AUTO_VERSAO_DO_CRON, score: null } })),
  ], error: null }), '/x', agora)
  checa('N9 feitas: nota = feito; julgando < 5 min segura; parado > 5 min volta; falha espera 1 h; 3 falhas = desiste; outra versão = de novo', feitas.has('ok') && feitas.has('falhou-agora') && feitas.has('desistiu') && !feitas.has('velha') && feitas.has('julgando') && !feitas.has('parado'))
  return falhas
}

function provasDoColetor() {
  const falhas = []
  const checa = (nome, cond) => { if (!cond) falhas.push(nome) }
  const CRON = lf(fs.readFileSync('app/api/cron/nota-auto/route.ts', 'utf8'))
  const STATUS = lf(fs.readFileSync('app/api/compose/status/[renderId]/route.ts', 'utf8'))
  const VERCEL = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
  checa('N9 o coletor da régua não julga mais a nota (um caminho só: disparo + cron)', !/notaRevisor|notaAuto/.test(COLETAR))
  checa('N9 cron de 1 em 1 minuto no vercel.json', (VERCEL.crons ?? []).some((c) => c.path === '/api/cron/nota-auto' && c.schedule === '* * * * *'))
  checa('N9 cron: segredo do cron, off sai antes do banco, no máximo NOTA_AUTO_CRON_MAX por giro', CRON.includes('process.env.CRON_SECRET') && CRON.includes("req.headers.get('authorization') === ") &&CRON.indexOf("if (modo === 'off') return") > 0 && CRON.indexOf("if (modo === 'off') return") < CRON.indexOf('createAdminClient(url') && CRON.includes('faltam.slice(0, NOTA_AUTO_CRON_MAX)'))
  checa('N9 disparo na hora: só insert NOVO de filme, interruptor ligado, depois da resposta', /if \(result\.ok && !result\.duplicate && result\.id && produtoDoVideo\(quality\) === 'filme' && lerModoNotaAuto\(\) !== 'off'\) \{[\s\S]{0,400}depoisDaResposta\('nota-auto', async \(\) => \{[\s\S]{0,500}notaAutoDoFilme\(/.test(STATUS))
  return falhas
}

let ok = 0, ruim = 0
const linha = (bom, nome) => { if (bom) { ok++; console.log('  ok  ' + nome) } else { ruim++; console.log('  XX  ' + nome) } }

const real = await provas(carregar(null))
linha(real.length === 0, `código real: todas as provas N1–N9 verdes${real.length ? ' — falharam: ' + real.join(' | ') : ''}`)
const col = provasDoColetor()
linha(col.length === 0, `caminhos da nota (disparo na hora + cron de 1 min; coletor fora)${col.length ? ' — falharam: ' + col.join(' | ') : ''}`)

const MUTANTES = [
  ['M1 painel ignora a fonte (sobrescreve o revisor)', (s) => s.replace("return existente.fonte === NOTA_AUTO_FONTE ? 'atualizar' : 'pular'", "return 'atualizar'")],
  ['M2 interruptor nasce no painel', (s) => s.replace("  if (v === 'on' || v === 'painel') return 'on'\n  return 'sombra'", "  if (v === 'on' || v === 'painel') return 'on'\n  return 'on'")],
  ['M3 defeito sem quadro conta', (s) => s.replace('if (quadros.length < minimo) { descartados++; continue }', 'if (false) { descartados++; continue }')],
  ['M4 confia na nota solta do modelo', (s) => s.replace('nota: notaDosDefeitos(defeitos),', 'nota: Number((parsed as { score?: number }).score ?? 8),')],
  ['M5 update sem o filtro da fonte', (s) => s.replace(".eq('link', link).eq('fonte', NOTA_AUTO_FONTE)", ".eq('link', link)")],
  ['M9 nota baixa sem evento para o conserto', (s) => s.replace('if (r.nota < NOTA_AUTO_CORTE_BAIXA) {', 'if (false) {')],
  ['M10 marcador "julgando" ignorado (julgamento duplo)', (s) => s.replace('if (agora - (Date.parse(ev.created_at) || 0) < NOTA_AUTO_JULGANDO_MS) feitas.add(ev.session_id)', '')],
  ['M6 categoria do revisor some', (s) => s.replace("  'OLHOS_FECHADOS_OU_MORTOS',\n", '')],
  ['M7 grave central pesa como grave comum', (s) => s.replace('nota -= CATEGORIAS_CENTRAIS.has(cat) ? REGUA_NOTA_AUTO.graveCentral : REGUA_NOTA_AUTO.grave', 'nota -= REGUA_NOTA_AUTO.grave')],
  ['M8 conta da casa entra no painel', (s) => s.replace('else if (isInternalEmail(email)) painel', 'else if (false) painel')],
]
for (const [nome, f] of MUTANTES) {
  const mutada = f(FONTE)
  if (mutada === FONTE) { linha(false, `${nome}: o mutante NÃO aplicou (âncora sumiu)`); continue }
  let falhas
  try { falhas = await provas(carregar(f)) } catch (e) { falhas = ['carregar: ' + e.message] }
  linha(falhas.length > 0, `${nome} → vermelho (${falhas.slice(0, 2).join(' | ') || 'NENHUMA prova pegou'})`)
}
console.log(`\n${ruim === 0 ? '🟢' : '🔴'} nota-auto-1311: ${ok}/${ok + ruim}`)
process.exit(ruim === 0 ? 0 : 1)
