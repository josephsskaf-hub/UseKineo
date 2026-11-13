// KINEO-NOTA-AUTO-1MIN-1311 — guardião da NOTA EM 1 MINUTO: provedor trocável (lib/regua95/visaoProvedor.ts), filme único e
// fila do cron (lib/regua95/notaAutoFilme.ts) e a sonda do gateway (app/api/admin/nota-auto-sonda). OFFLINE (fetch e banco falsos).
//   G1  provedor padrão = OpenAI com o modelo do registro; 'gateway' = Claude (anthropic/claude-opus-5.5) — trocável por variável;
//   G2  token do gateway: AI_GATEWAY_API_KEY > cabeçalho x-vercel-oidc-token > VERCEL_OIDC_TOKEN; sem nenhum = null;
//   G3  adaptador: data URL vira imagem base64, http vira imagem por URL, texto fica texto;
//   G4  chamada ao gateway: /v1/messages, Bearer + anthropic-version, system no topo, sem prefill nem thinking; JSON achado no
//       texto (até dentro de ```json); custo pela tarifa; recusa, HTTP != 200 ou sem token = null;
//   G5  filme único: vídeo pronto → claim → nascimento → plano de cenas; clipe ou vídeo não pronto = null;
//   G6  fila do cron: só filmes, sem os já feitos/julgando;
//   G7  sonda: portão de admin antes de tudo; nunca devolve o token; diz a origem;
//   M   mutantes.
// Rodar: npx tsx scripts/test-nota-auto-1min-1311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const PROV = 'lib/regua95/visaoProvedor.ts'
const FILME = 'lib/regua95/notaAutoFilme.ts'
const SONDA = lf(fs.readFileSync('app/api/admin/nota-auto-sonda/route.ts', 'utf8'))
const fontes = { [PROV]: lf(fs.readFileSync(PROV, 'utf8')), [FILME]: lf(fs.readFileSync(FILME, 'utf8')) }
const globals = { setTimeout: () => 0, clearTimeout() {}, AbortController }
const carregar = (arq, mut) => createOfflineLoader({ globals, env: {}, source: mut ? (rel, text) => (rel.replace(/\\/g, '/').endsWith(mut.arq) ? mut.f(lf(text)) : text) : null })(arq)

function fetchGateway({ texto = '```json\n{"momentos":[{"m":1}],"resumo":"x"}\n```', status = 200, stop = 'end_turn', chamadas = [] } = {}) {
  return async (url, init) => {
    chamadas.push({ url: String(url), headers: init?.headers ?? {}, body: init?.body ? JSON.parse(init.body) : null })
    return { ok: status === 200, status, json: async () => ({ content: [{ type: 'text', text: texto }], stop_reason: stop, usage: { input_tokens: 10000, output_tokens: 1000 } }) }
  }
}

// banco falso: responde por tabela + filtros eq; "events" separa claim e nascimento pelo name
function bancoFalso({ video, claim, birth, recentes = [], feitos = [] }) {
  const from = (table) => {
    const q = { table, eq: {}, in: {} }
    const resolve = () => {
      if (table === 'videos' && q.eq.id) return { data: video && video.id === q.eq.id ? video : null, error: null }
      if (table === 'videos') return { data: recentes, error: null }
      if (table === 'events' && q.eq.name === 'compose_submission_claim') return { data: claim ? [{ metadata: claim }] : [], error: null }
      if (table === 'events' && q.eq.name === 'cinematic_submission_claim') return { data: birth ? [{ metadata: { response: birth } }] : [], error: null }
      if (table === 'events') return { data: feitos, error: null }
      return { data: null, error: null }
    }
    const b = {
      select() { return b }, eq(c, v) { q.eq[c] = v; return b }, in(c, v) { q.in[c] = v; return b }, gte() { return b }, order() { return b }, limit() { return b },
      maybeSingle() { return Promise.resolve(resolve()) }, then(res, rej) { return Promise.resolve(resolve()).then(res, rej) },
    }
    return b
  }
  return { from }
}
const readAll = async (fn) => await fn()

async function provas(P, F) {
  const falhas = []
  const checa = (nome, cond) => { if (!cond) falhas.push(nome) }
  // G1
  const d = P.lerProvedorNotaAuto({})
  const g = P.lerProvedorNotaAuto({ NOTA_AUTO_PROVEDOR: 'gateway' })
  checa('G1 padrão OpenAI com modelo do registro; gateway = Claude Opus 5.5; NOTA_AUTO_MODEL troca', d.provedor === 'openai' && /^gpt-/.test(d.modelo) && g.provedor === 'gateway' && g.modelo === 'anthropic/claude-opus-5.5' && P.lerProvedorNotaAuto({ NOTA_AUTO_PROVEDOR: 'gateway', NOTA_AUTO_MODEL: 'anthropic/claude-haiku-5.5' }).modelo === 'anthropic/claude-haiku-5.5')
  // G2
  const req = (h) => ({ headers: { get: (n) => (n === 'x-vercel-oidc-token' ? h : null) } })
  checa('G2 chave > cabeçalho OIDC > OIDC do ambiente; nada = null', P.tokenDoGateway(req('h'), { AI_GATEWAY_API_KEY: 'k', VERCEL_OIDC_TOKEN: 'e' })?.origem === 'api_key' && P.tokenDoGateway(req('h'), { VERCEL_OIDC_TOKEN: 'e' })?.token === 'h' && P.tokenDoGateway(req(null), { VERCEL_OIDC_TOKEN: 'e' })?.origem === 'oidc_ambiente' && P.tokenDoGateway(req(null), {}) === null)
  // G3
  const partes = P.partesParaAnthropic([{ type: 'text', text: 'oi' }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD', detail: 'high' } }, { type: 'image_url', image_url: { url: 'https://fal.media/q1.jpg', detail: 'high' } }])
  checa('G3 data URL → base64; http → url; texto fica', JSON.stringify(partes) === JSON.stringify([{ type: 'text', text: 'oi' }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } }, { type: 'image', source: { type: 'url', url: 'https://fal.media/q1.jpg' } }]))
  // G4
  const ch = []
  const c = { system: 'SYS', content: [{ type: 'text', text: 'T' }] }
  const r = await P.chamarVisaoJson(c, { provedor: 'gateway', modelo: 'anthropic/claude-haiku-5.5', tokenGateway: 'tok', fetchImpl: fetchGateway({ chamadas: ch }) })
  const corpo = ch[0]?.body
  checa('G4 /v1/messages com Bearer e anthropic-version; system no topo; sem prefill nem thinking', ch[0]?.url === 'https://ai-gateway.vercel.sh/v1/messages' && ch[0]?.headers.Authorization === 'Bearer tok' && ch[0]?.headers['anthropic-version'] === '2023-06-01' && corpo?.system === 'SYS' && corpo?.messages.length === 1 && corpo?.messages[0].role === 'user' && !('thinking' in (corpo ?? {})))
  checa('G4 JSON dentro de ```json; custo Haiku (10k + 1k = US$ 0,0015)', r && r.json?.resumo === 'x' && Math.abs(r.usd - 0.0015) < 1e-9 && r.provedor === 'gateway')
  checa('G4 recusa = null', (await P.chamarVisaoJson(c, { provedor: 'gateway', tokenGateway: 'tok', fetchImpl: fetchGateway({ stop: 'refusal' }) })) === null)
  checa('G4 HTTP != 200 = null', (await P.chamarVisaoJson(c, { provedor: 'gateway', tokenGateway: 'tok', fetchImpl: fetchGateway({ status: 401 }) })) === null)
  checa('G4 sem token = null (não chama)', (await P.chamarVisaoJson(c, { provedor: 'gateway', tokenGateway: null, fetchImpl: async () => { throw new Error('chamou') } })) === null)
  checa('G4 texto sem JSON = null', (await P.chamarVisaoJson(c, { provedor: 'gateway', tokenGateway: 'tok', fetchImpl: fetchGateway({ texto: 'não sei' }) })) === null)
  // G5
  const NASC = { voiceover_script: 'A fox walks in the snow. The fox finds food. The fox sleeps.', clip_word_starts: [0, 6, 10], scene_prompts: ['a', 'b', 'c'], clip_seconds: [5, 5, 5], duration: 15, prompt: 'a fox' }
  const VID = { id: 'v1', user_id: 'u1', created_at: new Date().toISOString(), quality_mode: 'cinematic_kling4', video_url: 'https://x/v.mp4', duration: 15, render_id: 'r1', topic: 'a fox in the snow', engine_used: 'kling4', script: null, prompt: null, status: 'completed' }
  const e = await F.entregaDoFilme(bancoFalso({ video: VID, claim: { generation_id: 'g1', render_id: 'r1' }, birth: NASC }), 'v1')
  checa('G5 filme pronto → plano de cenas do nascimento + pedido + motor', e && e.key === 'v1' && e.notaAuto.plano?.momentos.length === 3 && e.notaAuto.pedido === 'a fox in the snow' && e.notaAuto.motor === 'kling4' && /fox walks/.test(e.notaAuto.roteiro))
  checa('G5 clipe ou vídeo não pronto = null', (await F.entregaDoFilme(bancoFalso({ video: { ...VID, quality_mode: 'clip' } }), 'v1')) === null && (await F.entregaDoFilme(bancoFalso({ video: { ...VID, status: 'processing' } }), 'v1')) === null)
  // G6
  const fila = await F.filmesSemNotaAuto(bancoFalso({ recentes: [{ id: 'a', quality_mode: 'cinematic' }, { id: 'b', quality_mode: 'clip' }, { id: 'c', quality_mode: 'fast' }], feitos: [{ name: 'nota_auto', created_at: new Date().toISOString(), session_id: 'c', metadata: { version: 'nota_auto_v3_regua19', score: 7 } }] }), readAll, { route: '/x' })
  checa('G6 fila: só filmes, sem os já feitos', JSON.stringify(fila) === '["a"]')
  return falhas
}

function provasDaSonda() {
  const falhas = []
  const checa = (nome, cond) => { if (!cond) falhas.push(nome) }
  checa('G7 portão de admin antes de qualquer chamada', SONDA.indexOf('isAdminEmail(user.email)') > 0 && SONDA.indexOf('isAdminEmail(user.email)') < SONDA.indexOf('await fetch(GATEWAY_URL'))
  checa('G7 o token nunca volta na resposta (erro limpo, só a origem)', SONDA.includes("split(auth.token).join('[token]')") && !/NextResponse\.json\(\{[^)]*auth\.token/.test(SONDA) && SONDA.includes('origem: auth.origem'))
  return falhas
}

let ok = 0, ruim = 0
const linha = (bom, nome) => { if (bom) { ok++; console.log('  ok  ' + nome) } else { ruim++; console.log('  XX  ' + nome) } }
const real = await provas(carregar(PROV), carregar(FILME))
linha(real.length === 0, `código real: G1–G6 verdes${real.length ? ' — falharam: ' + real.join(' | ') : ''}`)
const s = provasDaSonda()
linha(s.length === 0, `sonda do gateway (G7)${s.length ? ' — falharam: ' + s.join(' | ') : ''}`)

const MUTANTES = [
  ['M1 cabeçalho OIDC ignorado', PROV, (t) => t.replace("const h = req?.headers.get('x-vercel-oidc-token')", 'const h = null')],
  ['M2 recusa aceita', PROV, (t) => t.replace("if (data.stop_reason === 'refusal') return null", '')],
  ['M3 data URL mandada como url', PROV, (t) => t.replace("return m ? { type: 'image', source: { type: 'base64', media_type: m[1].toLowerCase(), data: m[2] } } : ", 'return ')],
  ['M4 clipe entra na fila', FILME, (t) => t.replace(".filter((v) => produtoDoVideo(v.quality_mode) === 'filme').map((v) => v.id)", '.map((v) => v.id)')],
  ['M5 fila ignora os já feitos', FILME, (t) => t.replace('return filmes.filter((id) => !feitas.has(id))', 'return filmes')],
  ['M6 provedor padrão vira gateway', PROV, (t) => t.replace("=== 'gateway' ? 'gateway' : 'openai'", "=== 'openai' ? 'openai' : 'gateway'")],
]
for (const [nome, arq, f] of MUTANTES) {
  if (f(fontes[arq]) === fontes[arq]) { linha(false, `${nome}: o mutante NÃO aplicou (âncora sumiu)`); continue }
  let falhas
  try { falhas = await provas(carregar(PROV, { arq, f }), carregar(FILME, { arq, f })) } catch (e) { falhas = ['carregar: ' + e.message] }
  linha(falhas.length > 0, `${nome} → vermelho (${falhas.slice(0, 2).join(' | ') || 'NENHUMA prova pegou'})`)
}
console.log(`\n${ruim === 0 ? '🟢' : '🔴'} nota-auto-1min-1311: ${ok}/${ok + ruim}`)
process.exit(ruim === 0 ? 0 : 1)
