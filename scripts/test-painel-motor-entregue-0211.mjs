// KINEO-PAINEL-MOTOR-ENTREGUE-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo.
// Caso real (02/11): viniciusssvianna (PT), 1º filme grátis às 11:03 BRT, render 5aac817a-c4b9-4c8f-adb4-18c220cbe053,
// generation 4e007250-…, claim 22d738c1-…, débito "cinematic-22d738c1-…" de 9 cr. Três defeitos do revisor:
//   1. o bloco "online agora" do /admin escreveu "24h: 1 pedido no Seedance (pronto) · 9 créditos" — o filme saiu no Kling 4.0;
//   2. o publish_pack deu o título "Descubra o polpo: um animal com três corações!" num filme falado em pt-PT ("polpo" é italiano);
//   3. o pixel_score pôs teto 85 por "texto inventado na imagem em 8 quadro(s)" — as 16 notas diziam "Texto 'usekineo.com/free' no topo".
// Os dados abaixo são os do banco (SELECT em 02/11), só o necessário.
// Uso: node scripts/test-painel-motor-entregue-0211.mjs   (cwd = raiz do repo)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok++; console.log('  ok   ' + nome) } else { falhas.push(nome); console.error('  FAIL ' + nome) } }

const USER = '550f1b6c-2326-400f-8be7-3789afbf9eaa'
const GEN = '4e007250-3273-4040-a049-8194bf91ce43'
const CLAIM_REF = 'cinematic-22d738c1-9650-5f42-3167-27ca25418a3a'
const RENDER = '5aac817a-c4b9-4c8f-adb4-18c220cbe053'
const NARRACAO = '"Este animal tem três corações!" "Sabias que o polvo tem três corações e sangue azul?" "Dois enviam sangue para as brânquias e o terceiro bombeia-o para o corpo." "E o sangue é azul devido a uma proteína com cobre! A natureza é incrível!"'
const TOPIC = 'HOOK: [Pexels: giant realistic octopus] "Este animal tem três corações!"\n\nMICRO REWARD 1: [Pexels: underwater octopus swimming] "Sabias que o polvo tem três corações e sangue azul?"\n\nMICRO REWARD 2: [Pexels: animated illustration three hearts] "Dois enviam sangue para as brânquias e o terceiro bombeia-o para o corpo."\n\nPAYOFF: [Pexels: blue ocean lighting] "E o sangue é azul devido a uma proteína com cobre! A natureza é incrível!"'
// o pacote que o modelo devolveu em 02/11 (sem a linha de crédito, que é da casa)
const PACOTE_REAL = {
  ytTitle: 'Descubra o polpo: um animal com três corações!',
  ytDescription: 'Você sabia que o polvo tem três corações e sangue azul? Dois enviam sangue para as brânquias, enquanto o terceiro bombeia para o corpo. A natureza é realmente incrível! \n\n#polpo #natureza #curiosidades #ciência #animal',
  tiktokCaption: 'Você sabia que o polvo tem três corações? 🐙 #fyp #ai #polpo #curiosidades #natureza',
  pinnedComment: 'Surpreendente, né? O polvo não só tem três corações, mas também sangue azul! Isso é pura magia da natureza!',
}

// ═══ 1. painel: motor ENTREGUE ═══════════════════════════════════════════════════════════════════════════════════════
console.log('== 1. painel /admin "online agora": motor entregue ==')
{
  const M = createOfflineLoader()('lib/admin/motorEntregue.ts')
  checa('1.1 Seedance escolhido + Kling 4 do filme grátis → "Seedance 1.5 → Kling 4.0 (filme grátis)" (nomes de lib/engineLabel.ts)',
    M.rotuloMotorPedido('cinematic_ai', { code: 'kling4', freeFilm: true }, 'Seedance') === 'Seedance 1.5 → Kling 4.0 (filme grátis)')
  checa('1.2 entregue com o mesmo nome público → rótulo de antes, sem seta', M.rotuloMotorPedido('cinematic_ai', { code: 'seedance15_cap', freeFilm: false }, 'Seedance') === 'Seedance')
  checa('1.3 Kling 4 pago que caiu no Seedance → seta sem "(filme grátis)"', M.rotuloMotorPedido('cinematic_hollywood', { code: 'seedance15_fallback', freeFilm: false }, 'Kling 3') === 'Kling 3 → Seedance 1.5')
  checa('1.4 sem motor entregue → rótulo de antes byte a byte', M.rotuloMotorPedido('cinematic_ai', null, 'Seedance') === 'Seedance')
  checa('1.5 valor de fornecedor desconhecido nunca vira selo', M.rotuloMotorPedido('cinematic_ai', { code: 'kling9-novo', freeFilm: true }, 'Seedance') === 'Seedance')
  checa('1.6 free_film_engine_used manda; videos.engine_used é reserva', JSON.stringify(M.motorEntregueDe('kling4', 'seedance')) === JSON.stringify({ code: 'kling4', freeFilm: true }) && JSON.stringify(M.motorEntregueDe(null, 'kling4')) === JSON.stringify({ code: 'kling4', freeFilm: false }) && M.motorEntregueDe(null, null) === null)
  checa('1.7 chave ida e volta', JSON.stringify(M.lerChaveMotor(M.chaveMotor('cinematic_ai', { code: 'kling4', freeFilm: true }))) === JSON.stringify({ quality: 'cinematic_ai', entregue: { code: 'kling4', freeFilm: true } }) && M.lerChaveMotor('fast').entregue === null)

  // A rota de verdade, com um banco em memória que responde só o que a rota pergunta.
  const agora = Date.parse('2026-11-02T14:44:00Z')
  const iso = (ms) => new Date(ms).toISOString()
  const DB = {
    events: [
      { user_id: USER, session_id: 'sess-1', name: 'studio_tiles_shown', path: '/studio', created_at: iso(agora - 60_000), metadata: {}, is_bot: 'false' },
      { user_id: USER, session_id: GEN, name: 'cinematic_dispatch_result', path: '/api/generate-video-cinematic', created_at: '2026-11-02T13:57:13Z', metadata: { billing_reference: CLAIM_REF, quality: 'cinematic_ai', engine: 'kling/v4/text-to-video', generation_id: GEN } },
      { user_id: USER, session_id: GEN, name: 'free_film_engine_used', path: '/api/generate-video-cinematic', created_at: '2026-11-02T13:57:12Z', metadata: { engine_used: 'kling4', generation_id: GEN, film_id: GEN, seconds: 15 } },
      { user_id: USER, session_id: GEN, name: 'compose_submission_claim', path: '/api/compose', created_at: '2026-11-02T14:01:10Z', metadata: { render_id: RENDER, generation_id: GEN, language: 'pt', narration: NARRACAO } },
      { user_id: USER, session_id: 'sess-1', name: 'studio_duration_fit_to_balance', path: '/studio', created_at: '2026-11-02T13:54:10Z', metadata: { engine: 'seedance', to: 15 }, is_bot: 'false' },
    ],
    profiles: [{ id: USER, email: 'viniciusssvianna@example.test', name: null, plan: 'free', has_paid: false, video_credits: 1, trial_credits_used: 9, trial_credits_granted: 10, signup_country: 'PT', last_country: 'PT', signup_utm_source: 'chatgpt.com', created_at: '2026-11-02T13:40:00Z' }],
    videos: [{ id: '6f4891e8-28c2-4895-b9c0-ddf506930fe4', user_id: USER, quality_mode: 'cinematic_ai', engine_used: 'kling4', render_id: RENDER, created_at: '2026-11-02T14:03:35Z' }],
    credit_debits: [{ user_id: USER, amount: 9, refunded_at: null, render_id: CLAIM_REF, created_at: '2026-11-02T13:55:51Z' }],
  }
  const valor = (row, col) => col.startsWith('metadata->>') ? row.metadata?.[col.slice(11)] : row[col]
  const consulta = (table) => {
    const f = []
    const q = {
      select: () => q, order: () => q, limit: () => q, range: () => q,
      eq: (c, v) => { f.push((r) => valor(r, c) === v); return q },
      in: (c, vs) => { f.push((r) => vs.includes(valor(r, c))); return q },
      gte: (c, v) => { f.push((r) => !r[c] || r[c] >= v); return q },
      run: () => ({ data: (DB[table] ?? []).filter((r) => f.every((fn) => fn(r))), error: null }),
    }
    return q
  }
  const admin = { rpc: async () => ({ data: [{ visitors_7d: 1, visitors_24h: 1, signups_7d: 1, signups_24h: 1, videos_24h: 1, checkouts_24h: 0 }], error: null }), from: (t) => consulta(t) }
  const RealDate = Date
  class FixedDate extends RealDate { constructor(...a) { super(...(a.length ? a : [agora])) } static now() { return agora } }
  const carregaRota = () => createOfflineLoader({
    globals: { Date: FixedDate },
    mocks: {
      'next/server': { NextResponse: { json: (body, o = {}) => ({ status: o.status ?? 200, body }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { email: 'admin@offline.example' } } }) } }) },
      '../_shared/db': { isAdminEmail: () => true, serviceClient: () => admin },
      '../_shared/mrr': { isPayingPlan: () => false, isTrialPlan: () => false },
      '@/lib/checkoutPricing': { TIER_CREDITS: {} },
      '@/lib/supabase/readAll': { readAll: async (factory) => factory().run() },
      '@/lib/admin/checkoutHonesto': { carregarCheckoutHonesto: async () => null },
    },
  })('app/api/admin/live/route.ts')
  const route = carregaRota()
  const res = await route.GET()
  const linha = res.body?.online?.find((v) => v.user_id === USER)?.spentOn ?? ''
  checa('1.8 a rota real escreve "🎬 24h: 1 pedido no Seedance 1.5 → Kling 4.0 (filme grátis) (pronto) · 9 créditos"', linha.includes('🎬 24h: 1 pedido no Seedance 1.5 → Kling 4.0 (filme grátis) (pronto) · 9 créditos'))
  checa('1.9 o rótulo antigo "no Seedance (pronto)" morreu para este caso', !linha.includes('no Seedance (pronto)'))
  // sem o evento do filme grátis, a reserva videos.engine_used (render → generation pelo compose claim) ainda acha o Kling 4
  DB.events = DB.events.filter((e) => e.name !== 'free_film_engine_used')
  const route2 = carregaRota()
  const linha2 = (await route2.GET()).body?.online?.find((v) => v.user_id === USER)?.spentOn ?? ''
  checa('1.10 reserva videos.engine_used: "Seedance 1.5 → Kling 4.0" sem "(filme grátis)"', linha2.includes('1 pedido no Seedance 1.5 → Kling 4.0 (pronto) · 9 créditos'))
  const painel = rd('components/LiveNowPanel.tsx')
  checa('1.11 o par LiveNowPanel mostra spentOn como veio (celular e mesa), sem rótulo de motor próprio', (painel.match(/\{v\.spentOn\}/g) ?? []).length === 2 && !/ENGINE_SHORT|engineLabelFor|Seedance/.test(painel))
}

// ═══ 2. publish_pack na língua do filme ══════════════════════════════════════════════════════════════════════════════
console.log('== 2. publish_pack: língua explícita + checagem barata ==')
{
  const P = createOfflineLoader()('lib/publishPack.ts')
  const id = P.idiomaDoPacote('pt', NARRACAO)
  checa('2.1 a fala do filme ("Sabias que", "bombeia-o") é pt-PT', id?.tag === 'pt-PT' && id?.nome === 'European Portuguese')
  checa('2.2 pt-BR quando a fala é brasileira', P.idiomaDoPacote('pt', 'Você sabia que o polvo tem três corações? Pois é, né.')?.tag === 'pt-BR')
  checa('2.3 pt sem marca → "pt" e o pedido manda casar a variante da fala', P.idiomaDoPacote('pt', 'O polvo tem três corações e sangue azul.')?.tag === 'pt' && /Match the Portuguese variant/.test(P.instrucaoDeIdioma(P.idiomaDoPacote('pt', 'O polvo tem três corações.'))))
  checa('2.4 região explícita é respeitada (pt_BR, es-MX) e código desconhecido não chuta', P.idiomaDoPacote('pt_BR', NARRACAO)?.tag === 'pt-BR' && P.idiomaDoPacote('es-MX', 'x')?.nome === 'Mexican Spanish' && P.idiomaDoPacote('xx', 'x') === null)
  checa('2.5 sem código no claim, palpite pela fala', P.idiomaDoPacote(null, 'The octopus has three hearts and blue blood, and this is why.')?.tag === 'en' && P.idiomaDoPacote(null, NARRACAO)?.tag === 'pt-PT')
  const linha = P.instrucaoDeIdioma(id)
  checa('2.6 a instrução nomeia a língua e proíbe parecidas de outra língua', linha.startsWith('LANGUAGE: European Portuguese (pt-PT).') && /every hashtag ENTIRELY in European Portuguese \(pt-PT\)/.test(linha) && /no Spanish, Italian or English look-alikes/.test(linha) && /never Brazilian "Você sabia"/.test(linha))
  const p = P.prepararPacote(PACOTE_REAL, { creditLine: null, narracao: NARRACAO })
  checa('2.7 o título real volta a "Descubra o polvo…"', p?.ytTitle === 'Descubra o polvo: um animal com três corações!')
  checa('2.8 hashtags #polpo → #polvo na descrição e no TikTok', p.ytDescription.includes('#polvo #natureza') && !p.ytDescription.includes('polpo') && p.tiktokCaption.includes('#polvo') && !p.tiktokCaption.includes('polpo'))
  checa('2.9 o resto do texto não é tocado (flexão, palavras corretas)', p.ytDescription.startsWith('Você sabia que o polvo tem três corações e sangue azul? Dois enviam sangue para as brânquias, enquanto o terceiro bombeia para o corpo.') && p.pinnedComment === PACOTE_REAL.pinnedComment)
  const t = P.corrigirPelaNarracao('POLPO, Polpo e corpos azuis; affect; falem; nova', 'o polvo e o corpo azul; effect; falam; novo')
  checa('2.10 caixa preservada; plural, 1ª letra, vogal↔vogal (falam/falem) e última letra (novo/nova) nunca trocados', t.texto === 'POLVO, Polvo e corpos azuis; affect; falem; nova' && t.trocas.length === 2)
  checa('2.11 sem narração, prepararPacote é byte a byte o de antes', JSON.stringify(P.prepararPacote(PACOTE_REAL)) === JSON.stringify(P.prepararPacote(PACOTE_REAL, { creditLine: null })) && P.prepararPacote(PACOTE_REAL).ytTitle.includes('polpo'))
  const cred = P.prepararPacote(PACOTE_REAL, { creditLine: 'Made with Kineo — https://www.usekineo.com', narracao: NARRACAO })
  checa('2.12 a linha de crédito da casa entra depois e intacta', cred.ytDescription.endsWith('Made with Kineo — https://www.usekineo.com') && cred.ytTitle.includes('polvo'))
  checa('2.13 o andaime em inglês sai do roteiro de reserva (HOOK, [Pexels: …], octopus)', !/HOOK|MICRO|PAYOFF|Pexels|octopus/.test(P.semAndaimeDoRoteiro(TOPIC)) && P.semAndaimeDoRoteiro(TOPIC).includes('"Sabias que o polvo tem três corações e sangue azul?"'))

  // o escritor de verdade: o pedido ao modelo leva a língua; o pacote gravado sai corrigido.
  const pedidos = [], inserts = []
  const resposta = { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(PACOTE_REAL) } }] }) }
  const tabela = (t) => {
    const f = []
    const q = {
      select: () => q, order: () => q, limit: async () => ({ data: t === 'events' ? [...DBP.events].filter((r) => f.every((fn) => fn(r))) : [], error: null }),
      eq: (c, v) => { f.push((r) => (c.startsWith('metadata->>') ? r.metadata?.[c.slice(11)] : r[c]) === v); return q },
      maybeSingle: async () => ({ data: null, error: null }),
      insert: async (row) => { inserts.push(row); return { error: null } },
    }
    return q
  }
  const DBP = { events: [{ user_id: USER, name: 'compose_submission_claim', created_at: '2026-11-02T14:01:10Z', metadata: { render_id: RENDER, language: 'pt', narration: NARRACAO } }] }
  const S = createOfflineLoader({ env: { OPENAI_API_KEY: 'sk-offline' }, globals: { fetch: async (url, init) => { pedidos.push({ url, body: JSON.parse(init.body) }); return resposta }, AbortSignal } })('lib/publishPackServer.ts')
  const pk = await S.garantirPacote({ from: tabela }, USER, { id: '6f4891e8-28c2-4895-b9c0-ddf506930fe4', title: 'HOOK:  "Este animal tem três corações!"', topic: TOPIC, render_id: RENDER }, { isFreePlan: false })
  const body = pedidos[0]?.body
  checa('2.14 o pedido nomeia pt-PT no sistema e na mensagem do vídeo', body?.messages?.[0]?.content.includes('LANGUAGE: European Portuguese (pt-PT).') && body.messages[1].content.startsWith('LANGUAGE: European Portuguese (pt-PT).') && body.messages[1].content.includes('Sabias que o polvo'))
  checa('2.15 a frase velha "language of the topic" morreu e a temperatura caiu para 0,6', !/language of the topic/.test(body.messages[0].content) && body.temperature === 0.6 && body.model === 'gpt-4o-mini')
  checa('2.16 o pacote devolvido e o gravado dizem "polvo"; o evento guarda language e spelling_fixes', pk?.ytTitle === 'Descubra o polvo: um animal com três corações!' && inserts[0]?.metadata?.ytTitle === pk.ytTitle && inserts[0].metadata.language === 'pt-PT' && JSON.stringify(inserts[0].metadata.spelling_fixes) === JSON.stringify(['polpo→polvo', 'polpo→polvo', 'polpo→polvo']))
  checa('2.17 lerPacote ignora os campos de auditoria (4 peças)', Object.keys(P.lerPacote(inserts[0].metadata)).join(',') === 'ytTitle,ytDescription,tiktokCaption,pinnedComment')
}

// ═══ 3. pixel_score: overlay nosso não é "texto inventado" ════════════════════════════════════════════════════════════
console.log('== 3. pixel_score: legenda/marca nossas fora do teto; letra no cenário continua reprovando ==')
{
  const X = createOfflineLoader()('lib/regua95/pixelScore.ts')
  const frames = Array.from({ length: 8 }, (_, i) => ({ url: `https://x/${i}.jpg`, t: i * 2, bytes: 90_000 }))
  const base = { via: 'nth_frame', model: 'gpt-4o', usdFrames: 0, usdVision: 0, ms: 1 }
  const leitura = (extra = () => ({})) => ({ frames: frames.map((_, i) => ({ i: i + 1, subject: 'realistic octopus underwater', score: 85, issues: ['invented_text'], note: "Texto 'usekineo.com/free' no topo.", ...extra(i) })), identity_consistent: true, caption_present: true, caption_legible: true, caption_language_ok: true, summary: 'Vídeo mostra polvo realista com texto inventado no topo em todas as cenas.' })
  const comMarca = { narration: NARRACAO, watermark: true }
  const real = X.normalizePixel(leitura(), { ...base, product: 'filme', frames, overlay: comMarca })
  checa('3.1 caso real (notas antigas, marca medida no RenderScript): sem teto de texto inventado, 8 quadros descontados, nota 90', !real.caps.some((c) => /texto inventado/.test(c)) && real.overlay_text_ignored?.length === 8 && real.score === 90)
  const semMarca = X.normalizePixel(leitura(), { ...base, product: 'filme', frames, overlay: { narration: NARRACAO, watermark: false } })
  checa('3.2 marca NÃO medida → nunca descontada (teto 85 fica): nada inferido da imagem', semMarca.caps.includes('texto inventado na imagem em 8 quadro(s) (teto 85)') && semMarca.score === 85)
  const semCtx = X.normalizePixel(leitura(), { ...base, product: 'filme', frames })
  checa('3.3 chamador antigo (sem overlay) → comportamento de antes', semCtx.caps.includes('texto inventado na imagem em 8 quadro(s) (teto 85)') && semCtx.overlay_text_ignored === undefined)
  const legenda = X.normalizePixel(leitura((i) => ({ note: 'Legenda sobre o polvo.', seen_text: [{ text: i % 2 ? 'SANGUE AZUL?' : 'o polvo tem três corações', where: 'caption_band' }] })), { ...base, product: 'filme', frames, overlay: { narration: NARRACAO, watermark: false } })
  checa('3.4 legenda queimada com palavras da fala (seen_text caption_band) → descontada', !legenda.caps.some((c) => /texto inventado/.test(c)) && legenda.overlay_text_ignored?.length === 8)
  const placa = X.normalizePixel(leitura((i) => ({ note: 'Placa com a palavra POLVO no aquário.', seen_text: [{ text: 'POLVO', where: i === 3 ? 'inside_scene' : 'caption_band' }] })), { ...base, product: 'filme', frames, overlay: comMarca })
  checa('3.5 letra DENTRO da cena continua reprovando, mesmo sendo palavra da fala (KINEO-CLIPE-SEM-LETRAS-0111)', placa.caps.includes('texto inventado na imagem em 1 quadro(s) (teto 85)') && placa.frames[3].issues.includes('invented_text'))
  const lixo = X.normalizePixel(leitura(() => ({ seen_text: [{ text: 'G hcwy Siny Stoite', where: 'caption_band' }] })), { ...base, product: 'filme', frames, overlay: comMarca })
  checa('3.6 letras falsas na faixa da legenda (não são da fala) continuam reprovando', lixo.caps.includes('texto inventado na imagem em 8 quadro(s) (teto 85)'))
  const misto = X.normalizePixel(leitura(() => ({ seen_text: [{ text: 'usekineo.com/free', where: 'top_band' }, { text: 'UNTITLED', where: 'inside_scene' }] })), { ...base, product: 'filme', frames, overlay: comMarca })
  checa('3.7 marca + letra no cenário no mesmo quadro → o quadro continua reprovado', misto.caps.includes('texto inventado na imagem em 8 quadro(s) (teto 85)'))
  const marcaNaLegenda = X.normalizePixel(leitura(() => ({ seen_text: [{ text: 'usekineo.com/free', where: 'caption_band' }] })), { ...base, product: 'filme', frames, overlay: comMarca })
  checa('3.8 a marca só é aceita no topo (onde a montagem a põe)', marcaNaLegenda.caps.some((c) => /texto inventado/.test(c)))
  const lida = X.normalizePixel(leitura(() => ({ note: "Texto 'usekino.com/free' visível no topo." })), { ...base, product: 'filme', frames, overlay: comMarca })
  checa('3.9 leitura torta da marca ("usekino.com/free", 8x no banco) também é a marca', !lida.caps.some((c) => /texto inventado/.test(c)))
  const notaSoltas = X.normalizePixel(leitura(() => ({ note: "Texto 'o polvo' no topo." })), { ...base, product: 'filme', frames, overlay: comMarca })
  checa('3.10 sem seen_text, a nota só serve para a marca — nunca para palavras soltas', notaSoltas.caps.some((c) => /texto inventado/.test(c)))
  const clipe = X.normalizePixel(leitura(() => ({ seen_text: [{ text: 'usekineo.com/free', where: 'top_band' }] })), { ...base, product: 'clipe', frames, overlay: comMarca })
  const ads = X.normalizePixel(leitura(() => ({ seen_text: [{ text: 'usekineo.com/free', where: 'top_band' }] })), { ...base, product: 'ads', frames, overlay: comMarca })
  checa('3.11 clipe e anúncio intocados (o desconto é só do filme)', clipe.caps.some((c) => /texto inventado/.test(c)) && ads.caps.some((c) => /texto inventado/.test(c)))
  const outro = X.normalizePixel(leitura(() => ({ issues: ['invented_text', 'deformed_face_or_hand'], score: 60, seen_text: [{ text: 'usekineo.com/free', where: 'top_band' }] })), { ...base, product: 'filme', frames, overlay: comMarca })
  checa('3.12 descontar a marca não apaga outro defeito do quadro (nem sobe a nota dele)', outro.caps.some((c) => /rosto\/mão deformado em 8/.test(c)) && outro.frames.every((f) => f.score === 60))
  const msgs = (flag) => X.buildPixelMessages({ product: 'filme', asked: 'polvo', narration: NARRACAO, ...(flag ? { expectedKineoWatermark: true } : {}) }, frames)
  checa('3.13 o juiz passa a dizer o que leu e onde (seen_text com caption_band/top_band/inside_scene)', /"seen_text": \[\{"text"/.test(msgs(false)[0].content) && /inside_scene/.test(msgs(false)[0].content) && /Letters inside the scene stay invented_text even when they spell a real word/.test(msgs(false)[0].content))
  checa('3.14 a marca só entra no pedido quando medida (opt-in de antes preservado)', /EXPECTED EDITOR OVERLAY/.test(msgs(true)[1].content[0].text) && !/EXPECTED EDITOR OVERLAY/.test(msgs(false)[1].content[0].text))
  checa('3.15 overlayDoContexto leva a fala e a marca medida', JSON.stringify(X.overlayDoContexto({ product: 'filme', asked: '', narration: 'a', spokenByScene: ['b'], expectedKineoWatermark: true })) === JSON.stringify({ narration: 'a', spokenByScene: ['b'], watermark: true }))
  const coletar = rd('lib/regua95/coletar.ts')
  checa('3.16 o cron da régua diz a marca ao juiz só quando o RenderScript gravado a tem', /\.eq\('name', 'free_redo_film_source'\)\.in\('session_id', part\)\s*\n\s*\.contains\('metadata', \{ source: \{ elements: \[\{ type: 'text', text: 'usekineo\.com\/free' \}\] \} \}\)/.test(coletar) && coletar.includes("...(gen && comMarca.has(gen) ? { expectedKineoWatermark: true } : {})"))
  const judge = rd('lib/regua95/pixelScore.ts')
  checa('3.17 o juiz real passa o overlay ao normalizePixel', judge.includes('overlay: overlayDoContexto(ctx) })'))
}

console.log(`\n${falhas.length === 0 ? '🟢' : '🔴'} painel-motor-entregue-0211: ${ok}/${ok + falhas.length}`)
if (falhas.length) { for (const f of falhas) console.error('  · ' + f); process.exit(1) }
