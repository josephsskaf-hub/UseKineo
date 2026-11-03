// KINEO-PAINEL-MOTOR-ENTREGUE-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo.
// Caso real (02/11): viniciusssvianna (PT), 1º filme grátis às 11:03 BRT, render 5aac817a-c4b9-4c8f-adb4-18c220cbe053,
// generation 4e007250-…, claim 22d738c1-…, débito "cinematic-22d738c1-…" de 9 cr. Três defeitos do revisor:
//   1. o bloco "online agora" do /admin escreveu "24h: 1 pedido no Seedance (pronto) · 9 créditos" — o filme saiu no Kling 4.0;
//   2. o publish_pack deu o título "Descubra o polpo: um animal com três corações!" num filme falado em pt-PT ("polpo" é italiano);
//   3. o pixel_score pôs teto 85 por "texto inventado na imagem em 8 quadro(s)" — as 16 notas diziam "Texto 'usekineo.com/free' no topo".
// 2ª leva (revisão de 02/11): SIMPLIFICAR. Sem correção automática de palavra no pacote (estragava world/morte/cuervo/Muster/Mario);
// o painel muda só o TEXTO (grupo e "prontos" iguais à base); o desconto do pixel é só da marca medida e só no cron da régua.
// Uso: node scripts/test-painel-motor-entregue-0211.mjs   (cwd = raiz do repo)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semElencoTrava0311 } from './test-support/desfaz-elenco-trava-0311.mjs' // KINEO-ELENCO-TRAVA-0311 — o portão ganhou o still com folha; o recibo EXATO desfaz só essa camada (edição a mais continua reprovando)
import { semGratisRefaz0311 } from './test-support/desfaz-gratis-refaz-0311.mjs' // KINEO-GRATIS-REFAZ-CENA-0311 — [TRAVA 8.2 — fundador 03/11: "As 2 sim"] o portão refaz a cena do teto novo no 1º filme grátis; camada mais nova, sai primeiro
import { GRATIS_REFAZ_0311 } from './test-support/desfaz-gratis-refaz-0311.mjs' // KINEO-GRATIS-REFAZ-IMAGEM-0311 — o commit-base gravado no recibo da camada de baixo (a origin/main de agora já contém essa camada publicada)
import { semGratisRefazImagem0311 } from './test-support/desfaz-gratis-refaz-imagem-0311.mjs' // KINEO-GRATIS-REFAZ-IMAGEM-0311 — [TRAVA 8.2 — fundador 03/11: "três sim"] o portão refaz também o still da cena; camada mais nova, sai primeiro

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const base = (rel) => execFileSync('git', ['show', `origin/main:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok++; console.log('  ok   ' + nome) } else { falhas.push(nome); console.error('  FAIL ' + nome) } }

const USER = '550f1b6c-2326-400f-8be7-3789afbf9eaa'
const GEN = '4e007250-3273-4040-a049-8194bf91ce43'
const CLAIM_REF = 'cinematic-22d738c1-9650-5f42-3167-27ca25418a3a'
const RENDER = '5aac817a-c4b9-4c8f-adb4-18c220cbe053'
const NARRACAO = '"Este animal tem três corações!" "Sabias que o polvo tem três corações e sangue azul?" "Dois enviam sangue para as brânquias e o terceiro bombeia-o para o corpo." "E o sangue é azul devido a uma proteína com cobre! A natureza é incrível!"'
const PACOTE_REAL = {
  ytTitle: 'Descubra o polpo: um animal com três corações!',
  ytDescription: 'Você sabia que o polvo tem três corações e sangue azul? Dois enviam sangue para as brânquias, enquanto o terceiro bombeia para o corpo. A natureza é realmente incrível! \n\n#polpo #natureza #curiosidades #ciência #animal',
  tiktokCaption: 'Você sabia que o polvo tem três corações? 🐙 #fyp #ai #polpo #curiosidades #natureza',
  pinnedComment: 'Surpreendente, né? O polvo não só tem três corações, mas também sangue azul! Isso é pura magia da natureza!',
}

// ═══ 1. painel: nome do motor ENTREGUE, só no texto ═══════════════════════════════════════════════════════════════════
console.log('== 1. painel /admin "online agora": motor entregue (só o texto) ==')
{
  const M = createOfflineLoader()('lib/admin/motorEntregue.ts')
  const k4free = { code: 'kling4', freeFilm: true }
  checa('1.1 Seedance escolhido + Kling 4 do filme grátis → "Seedance 1.5 → Kling 4.0 (filme grátis)"', M.rotuloMotorGrupo('cinematic_ai', [k4free], 'Seedance', false) === 'Seedance 1.5 → Kling 4.0 (filme grátis)')
  checa('1.2 grupo MISTO (Kling 4 + Seedance) → texto de antes', M.rotuloMotorGrupo('cinematic_ai', [k4free, { code: 'seedance15_cap', freeFilm: false }], 'Seedance', false) === 'Seedance')
  checa('1.3 grupo com um débito sem motor entregue → texto de antes', M.rotuloMotorGrupo('cinematic_ai', [k4free, null], 'Seedance', false) === 'Seedance' && M.rotuloMotorGrupo('cinematic_ai', [], 'Seedance', false) === 'Seedance')
  checa('1.4 entregue = vendido (Seedance 1.5) → texto de antes, sem seta', M.rotuloMotorGrupo('cinematic_ai', [{ code: 'seedance15_cap', freeFilm: false }], 'Seedance', false) === 'Seedance')
  checa('1.5 Kling 4 pago (cinematic_hollywood + paidLive) entregue kling4 → "Kling 4.0", sem seta', M.rotuloMotorGrupo('cinematic_hollywood', [{ code: 'kling4', freeFilm: false }, { code: 'kling4', freeFilm: false }], 'Kling 3', true) === 'Kling 4.0')
  checa('1.6 o mesmo sem paidLive → "Kling 3 → Kling 4.0"', M.rotuloMotorGrupo('cinematic_hollywood', [{ code: 'kling4', freeFilm: false }], 'Kling 3', false) === 'Kling 3 → Kling 4.0')
  checa('1.7 Kling 4 pago que caiu no Seedance → "Kling 4.0 → Seedance 1.5"', M.rotuloMotorGrupo('cinematic_hollywood', [{ code: 'seedance15_fallback', freeFilm: false }], 'Kling 3', true) === 'Kling 4.0 → Seedance 1.5')
  checa('1.8 valor de fornecedor desconhecido nunca vira selo', M.rotuloMotorGrupo('cinematic_ai', [{ code: 'kling9-novo', freeFilm: true }], 'Seedance', false) === 'Seedance')
  checa('1.9 free_film_engine_used manda; videos.engine_used é reserva', JSON.stringify(M.motorEntregueDe('kling4', 'seedance')) === JSON.stringify(k4free) && JSON.stringify(M.motorEntregueDe(null, 'kling4')) === JSON.stringify({ code: 'kling4', freeFilm: false }) && M.motorEntregueDe(null, null) === null)

  // A rota de verdade, com um banco em memória que responde só o que a rota pergunta.
  const agora = Date.parse('2026-11-02T14:44:00Z')
  const iso = (ms) => new Date(ms).toISOString()
  const casoReal = () => ({
    events: [
      { user_id: USER, session_id: 'sess-1', name: 'studio_tiles_shown', path: '/studio', created_at: iso(agora - 60_000), metadata: {}, is_bot: 'false' },
      { user_id: USER, session_id: GEN, name: 'cinematic_dispatch_result', path: '/api/generate-video-cinematic', created_at: '2026-11-02T13:57:13Z', metadata: { billing_reference: CLAIM_REF, quality: 'cinematic_ai', engine: 'kling/v4/text-to-video', generation_id: GEN } },
      { user_id: USER, session_id: GEN, name: 'free_film_engine_used', path: '/api/generate-video-cinematic', created_at: '2026-11-02T13:57:12Z', metadata: { engine_used: 'kling4', generation_id: GEN, film_id: GEN, seconds: 15 } },
      { user_id: USER, session_id: GEN, name: 'compose_submission_claim', path: '/api/compose', created_at: '2026-11-02T14:01:10Z', metadata: { render_id: RENDER, generation_id: GEN, language: 'pt', narration: NARRACAO } },
    ],
    profiles: [{ id: USER, email: 'viniciusssvianna@example.test', name: null, plan: 'free', has_paid: false, video_credits: 1, trial_credits_used: 9, trial_credits_granted: 10, signup_country: 'PT', last_country: 'PT', signup_utm_source: 'chatgpt.com', created_at: '2026-11-02T13:40:00Z' }],
    videos: [{ id: '6f4891e8-28c2-4895-b9c0-ddf506930fe4', user_id: USER, quality_mode: 'cinematic_ai', engine_used: 'kling4', render_id: RENDER, created_at: '2026-11-02T14:03:35Z' }],
    credit_debits: [{ user_id: USER, amount: 9, refunded_at: null, render_id: CLAIM_REF, created_at: '2026-11-02T13:55:51Z' }],
  })
  let DB = casoReal()
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
  const linhaDaRota = async () => {
    const route = createOfflineLoader({
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
    return (await route.GET()).body?.online?.find((v) => v.user_id === USER)?.spentOn ?? ''
  }
  const l1 = await linhaDaRota()
  checa('1.10 a rota real escreve "🎬 24h: 1 pedido no Seedance 1.5 → Kling 4.0 (filme grátis) (pronto) · 9 créditos"', l1.includes('🎬 24h: 1 pedido no Seedance 1.5 → Kling 4.0 (filme grátis) (pronto) · 9 créditos') && !l1.includes('no Seedance (pronto)'))
  DB.events = DB.events.filter((e) => e.name !== 'free_film_engine_used')
  checa('1.11 reserva videos.engine_used (render → generation pelo compose claim): sem "(filme grátis)"', (await linhaDaRota()).includes('1 pedido no Seedance 1.5 → Kling 4.0 (pronto) · 9 créditos'))
  // Refutação da 1ª leva: 2 débitos Seedance, um Kling 4 grátis e outro sem motor entregue, 1 vídeo pronto.
  DB = casoReal()
  DB.credit_debits.push({ user_id: USER, amount: 9, refunded_at: null, render_id: 'cinematic-outro', created_at: '2026-11-02T14:10:00Z' })
  DB.events.push({ user_id: USER, session_id: 'gen-2', name: 'cinematic_dispatch_result', path: '/api/generate-video-cinematic', created_at: '2026-11-02T14:10:30Z', metadata: { billing_reference: 'cinematic-outro', quality: 'cinematic_ai', generation_id: 'gen-2' } })
  const l3 = await linhaDaRota()
  checa('1.12 grupo misto: UMA linha, texto de antes e "prontos" contados uma vez ("2 pedidos no Seedance (1 pronto · 1 montando) · 18 créditos")', (l3.match(/🎬 24h/g) ?? []).length === 1 && l3.includes('🎬 24h: 2 pedidos no Seedance (1 pronto · 1 montando) · 18 créditos'))
  const rota = rd('app/api/admin/live/route.ts'), rotaBase = base('app/api/admin/live/route.ts')
  const linhaProntos = 'const prontos = Math.min(v.n, delivered24.get(`${p.id as string}|${q}`) ?? 0)'
  checa('1.13 agrupamento e conta de "prontos" idênticos à base', rota.includes(linhaProntos) && rotaBase.includes(linhaProntos) && rota.includes('const cur = m.get(q) ?? { n: 0, cr: 0 }') && rota.includes("const q = jobQuality.get(String(d.render_id)) ?? '?'") && !/chaveMotor|lerChaveMotor/.test(rota))
  const painel = rd('components/LiveNowPanel.tsx')
  checa('1.14 o par LiveNowPanel mostra spentOn como veio (celular e mesa), sem rótulo de motor próprio', (painel.match(/\{v\.spentOn\}/g) ?? []).length === 2 && !/ENGINE_SHORT|engineLabelFor|Seedance/.test(painel))
}

// ═══ 2. publish_pack: só a língua explícita no pedido ═════════════════════════════════════════════════════════════════
console.log('== 2. publish_pack: língua e variante explícitas, sem correção automática ==')
{
  const P = createOfflineLoader()('lib/publishPack.ts')
  const id = P.idiomaDoPacote('pt', NARRACAO)
  checa('2.1 a fala do filme ("Sabias que" + "bombeia-o", nenhuma marca do Brasil) é pt-PT', id?.tag === 'pt-PT' && id?.nome === 'European Portuguese')
  checa('2.2 pt-BR só com 2+ marcas brasileiras e nenhuma europeia', P.idiomaDoPacote('pt', 'Você sabia que o polvo tem três corações? Pois é, né.')?.tag === 'pt-BR')
  const amb = P.idiomaDoPacote('pt', 'O polvo tem três corações e sangue azul.')
  checa('2.3 variante não clara → "Portuguese, same variant as the narration" (não chuta pt-PT)', amb?.tag === 'pt' && P.instrucaoDeIdioma(amb).startsWith('LANGUAGE: Portuguese, same variant as the narration.'))
  checa('2.4 uma marca só, ou marcas dos dois lados → não chuta', P.idiomaDoPacote('pt', 'Sabias que o polvo tem três corações?')?.tag === 'pt' && P.idiomaDoPacote('pt', 'Sabias? Tens de ver. Você sabia, né?')?.tag === 'pt')
  checa('2.5 região explícita do claim é respeitada (pt_BR, es-MX)', P.idiomaDoPacote('pt_BR', NARRACAO)?.tag === 'pt-BR' && P.idiomaDoPacote('es-MX', 'x')?.nome === 'Mexican Spanish')
  const novos = { yue: 'Cantonese', fi: 'Finnish', da: 'Danish', no: 'Norwegian', bg: 'Bulgarian', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian', ca: 'Catalan', nn: 'Norwegian Nynorsk', af: 'Afrikaans' }
  checa('2.6 códigos do claim que faltavam (yue, fi, da, no, bg, hr, sk, sl, ca, nn, af) têm nome', Object.entries(novos).every(([c, n]) => P.idiomaDoPacote(c, '')?.nome === n && P.instrucaoDeIdioma(P.idiomaDoPacote(c, '')).startsWith(`LANGUAGE: ${n} (${c}).`)))
  checa('2.7 sem código no claim, ou código desconhecido → pedido genérico "a língua da narração" (sem palpite)', P.idiomaDoPacote(null, 'The octopus has three hearts.') === null && P.idiomaDoPacote('xx', NARRACAO) === null && /exact language \(and regional variant\) of THE VIDEO narration/.test(P.instrucaoDeIdioma(null)))
  const linha = P.instrucaoDeIdioma(id)
  checa('2.8 a instrução nomeia a língua e a variante', linha.startsWith('LANGUAGE: European Portuguese (pt-PT).') && /every hashtag ENTIRELY in European Portuguese \(pt-PT\)/.test(linha))
  checa('2.9 a correção automática de palavra SUMIU (sem quaseIgual/corrigirPelaNarracao no módulo)', !('corrigirPelaNarracao' in P) && !('corrigirPacotePelaNarracao' in P) && !/quaseIgual|corrigirPelaNarracao|spelling_fixes/.test(rd('lib/publishPack.ts') + rd('lib/publishPackServer.ts')))
  const certas = { ytTitle: 'The world would end', ytDescription: 'morte monte · cuervo cuerpo · Muster Mutter · Mario Marco · العربية · 日本語', tiktokCaption: 'x', pinnedComment: 'y' }
  checa('2.10 refutação da revisão: world/morte/cuervo/Muster/Mario/árabe/japonês saem intactos', JSON.stringify(P.prepararPacote(certas)) === JSON.stringify(certas))
  checa('2.11 prepararPacote é o da base (o pacote que o modelo escrever passa como veio)', P.prepararPacote(PACOTE_REAL).ytTitle === PACOTE_REAL.ytTitle && rd('lib/publishPack.ts').startsWith(base('lib/publishPack.ts')))

  const pedidos = [], inserts = []
  const resposta = { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(PACOTE_REAL) } }] }) }
  const DBP = { events: [{ user_id: USER, name: 'compose_submission_claim', created_at: '2026-11-02T14:01:10Z', metadata: { render_id: RENDER, language: 'pt', narration: NARRACAO } }] }
  const tabela = (t) => {
    const f = []
    const q = {
      select: () => q, order: () => q, limit: async () => ({ data: t === 'events' ? DBP.events.filter((r) => f.every((fn) => fn(r))) : [], error: null }),
      eq: (c, v) => { f.push((r) => (c.startsWith('metadata->>') ? r.metadata?.[c.slice(11)] : r[c]) === v); return q },
      maybeSingle: async () => ({ data: null, error: null }),
      insert: async (row) => { inserts.push(row); return { error: null } },
    }
    return q
  }
  const S = createOfflineLoader({ env: { OPENAI_API_KEY: 'sk-offline' }, globals: { fetch: async (url, init) => { pedidos.push({ url, body: JSON.parse(init.body) }); return resposta }, AbortSignal } })('lib/publishPackServer.ts')
  const pk = await S.garantirPacote({ from: tabela }, USER, { id: '6f4891e8-28c2-4895-b9c0-ddf506930fe4', title: 'x', topic: 'y', render_id: RENDER }, { isFreePlan: false })
  const body = pedidos[0]?.body
  checa('2.12 o pedido nomeia pt-PT no sistema e na mensagem do vídeo', body?.messages?.[0]?.content.includes('LANGUAGE: European Portuguese (pt-PT).') && body.messages[1].content.startsWith('LANGUAGE: European Portuguese (pt-PT).') && body.messages[1].content.includes('Sabias que o polvo'))
  checa('2.13 a frase velha "language of the topic" morreu; temperatura 0,6; modelo e UMA chamada como antes', !/language of the topic/.test(body.messages[0].content) && body.temperature === 0.6 && body.model === 'gpt-4o-mini' && pedidos.length === 1)
  checa('2.14 o evento guarda language=pt-PT e nada de spelling_fixes; o pacote passa como o modelo escreveu', inserts[0]?.metadata?.language === 'pt-PT' && !('spelling_fixes' in inserts[0].metadata) && pk?.ytTitle === PACOTE_REAL.ytTitle)
  checa('2.15 lerPacote ignora o campo de auditoria (4 peças)', Object.keys(P.lerPacote(inserts[0].metadata)).join(',') === 'ytTitle,ytDescription,tiktokCaption,pinnedComment')
}

// ═══ 3. pixel_score: só a marca d'água medida, só no cron da régua ════════════════════════════════════════════════════
console.log("== 3. pixel_score: marca d'água medida fora do teto (cron da régua); o resto continua reprovando ==")
{
  const X = createOfflineLoader()('lib/regua95/pixelScore.ts')
  const frames = Array.from({ length: 8 }, (_, i) => ({ url: `https://x/${i}.jpg`, t: i * 2, bytes: 90_000 }))
  const ctxBase = { via: 'nth_frame', model: 'gpt-4o', usdFrames: 0, usdVision: 0, ms: 1 }
  const leitura = (extra = () => ({})) => ({ frames: frames.map((_, i) => ({ i: i + 1, subject: 'realistic octopus underwater', score: 85, issues: ['invented_text'], note: "Texto 'usekineo.com/free' no topo.", ...extra(i) })), identity_consistent: true, caption_present: true, caption_legible: true, caption_language_ok: true, summary: 'Vídeo mostra polvo realista com texto inventado no topo em todas as cenas.' })
  const regua = { ...ctxBase, product: 'filme', frames, marcaMedida: true }
  const teto8 = 'texto inventado na imagem em 8 quadro(s) (teto 85)'
  const real = X.normalizePixel(leitura(), regua)
  checa('3.1 caso real no cron (marca medida): sem teto de texto inventado, 8 quadros descontados, nota 90', !real.caps.some((c) => /texto inventado/.test(c)) && real.overlay_text_ignored?.length === 8 && real.score === 90)
  checa('3.2 sem marcaMedida (portão do filme de 15 s / chamador antigo) → teto 85 como antes', X.normalizePixel(leitura(), { ...ctxBase, product: 'filme', frames }).caps.includes(teto8) && X.normalizePixel(leitura(), { ...ctxBase, product: 'filme', frames, marcaMedida: false }).score === 85)
  checa('3.3 legenda com palavras da fala NÃO é descontada', X.normalizePixel(leitura(() => ({ note: 'Legenda sobre o polvo.', seen_text: [{ text: 'o polvo tem três corações', where: 'caption_band' }] })), regua).caps.includes(teto8))
  checa('3.4 letra dentro da cena continua reprovando (KINEO-CLIPE-SEM-LETRAS-0111)', X.normalizePixel(leitura(() => ({ seen_text: [{ text: 'POLVO', where: 'inside_scene' }] })), regua).caps.includes(teto8))
  checa('3.5 marca lida fora do topo, ou marca + letra no cenário → continua reprovando', X.normalizePixel(leitura(() => ({ seen_text: [{ text: 'usekineo.com/free', where: 'caption_band' }] })), regua).caps.includes(teto8) && X.normalizePixel(leitura(() => ({ seen_text: [{ text: 'usekineo.com/free', where: 'top_band' }, { text: 'UNTITLED', where: 'inside_scene' }] })), regua).caps.includes(teto8))
  checa('3.6 leitura torta do OCR ("usekino.com/free", "USEKINEO COM") também é a marca', !X.normalizePixel(leitura(() => ({ note: "Texto 'usekino.com/free' visível no topo." })), regua).caps.some((c) => /texto inventado/.test(c)) && X.ehMarcaKineo('USEKINEO COM') && !X.ehMarcaKineo('usekinetic') && !X.ehMarcaKineo('o polvo'))
  checa('3.7 nota sem a marca entre aspas, ou sem "topo" → continua reprovando', X.normalizePixel(leitura(() => ({ note: "Texto 'o polvo' no topo." })), regua).caps.includes(teto8) && X.normalizePixel(leitura(() => ({ note: "Texto 'usekineo.com/free' numa placa." })), regua).caps.includes(teto8))
  checa('3.8 clipe e anúncio intocados (o desconto é só do filme)', X.normalizePixel(leitura(), { ...regua, product: 'clipe' }).caps.some((c) => /texto inventado/.test(c)) && X.normalizePixel(leitura(), { ...regua, product: 'ads' }).caps.some((c) => /texto inventado/.test(c)))
  const baixo = X.normalizePixel(leitura(() => ({ score: 60 })), regua)
  checa('3.9 nota abaixo do teto (60) com só a marca: o texto sai do teto mas a nota NÃO sobe', baixo.frames.every((f) => f.score === 60 && f.issues.length === 0) && baixo.score === 60)
  const outro = X.normalizePixel(leitura(() => ({ issues: ['invented_text', 'deformed_face_or_hand'], score: 85 })), regua)
  checa('3.10 marca + outro defeito: o outro teto fica e a nota do quadro não sobe', outro.caps.some((c) => /rosto\/mão deformado em 8/.test(c)) && outro.frames.every((f) => f.score === 85))
  checa('3.11 versão MANTIDA em regua95_pixel_v1 (decisão 02/11: sem re-julgar 7 dias) e o degrau de 02/11 documentado no código', X.PIXEL_SCORE_VERSION === 'regua95_pixel_v1' && real.version === 'regua95_pixel_v1' && rd('lib/regua95/pixelScore.ts').includes('DEGRAU NO HISTÓRICO EM 02/11/2026'))
  const C = createOfflineLoader()('lib/regua95/coletar.ts')
  const antigas = [{ created_at: '2026-11-02T14:04:38Z', session_id: '6f4891e8-28c2-4895-b9c0-ddf506930fe4', user_id: USER, metadata: { version: 'regua95_pixel_v1', score: 85, caps: [teto8] } }]
  const lidoQ = { in: () => lidoQ, select: () => lidoQ }
  const feitas = await C.notasExistentes({ from: () => lidoQ }, ['6f4891e8-28c2-4895-b9c0-ddf506930fe4'], async () => ({ data: antigas, error: null }))
  checa('3.11b o cron NÃO re-julga a entrega antiga: a nota v1 de 02/11 (teto 85 pela marca) conta como feita', feitas.has('pixel_score:6f4891e8-28c2-4895-b9c0-ddf506930fe4'))
  const msgs = (o) => X.buildPixelMessages({ product: 'filme', asked: 'polvo', narration: NARRACAO, expectedKineoWatermark: true }, frames, 'low', o)
  const baseMsgs = createOfflineLoader({ source: (rel, text) => rel === 'lib/regua95/pixelScore.ts' ? base(rel) : text })('lib/regua95/pixelScore.ts').buildPixelMessages({ product: 'filme', asked: 'polvo', narration: NARRACAO, expectedKineoWatermark: true }, frames, 'low')
  checa('3.12 portão do filme de 15 s: mensagens ao juiz byte a byte as da base sem marcaMedida', JSON.stringify(msgs(undefined)) === JSON.stringify(baseMsgs))
  checa('3.13 no cron (marcaMedida) o juiz é pedido a dizer o que leu e onde (seen_text)', /"seen_text": \[\{"text"/.test(msgs({ marcaMedida: true })[0].content) && !/seen_text/.test(msgs(undefined)[0].content))
  const px = rd('lib/regua95/pixelScore.ts')
  checa('3.14 scorePixel (usado pelo portão free15) não liga o desconto', /return judgeFrames\(ctx, ex\.frames, \{ fetchImpl: opts\?\.fetchImpl, apiKey: opts\?\.apiKey, model: opts\?\.model, via: ex\.via, usdFrames: ex\.usd, startedAt: started, timeoutMs: opts\?\.timeoutMs \}\)/.test(px) && semElencoTrava0311(semGratisRefaz0311(semGratisRefazImagem0311(rd('lib/free15GateServer.ts'), 'lib/free15GateServer.ts'), 'lib/free15GateServer.ts'), 'lib/free15GateServer.ts') === execFileSync('git', ['show', `${GRATIS_REFAZ_0311.base}:lib/free15GateServer.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n')) // KINEO-ELENCO-TRAVA-0311 — era: rd(…) === base(…) · KINEO-GRATIS-REFAZ-CENA-0311 — + semGratisRefaz0311 (a camada mais nova sai antes) · KINEO-GRATIS-REFAZ-IMAGEM-0311 — + semGratisRefazImagem0311 antes de todas; compara com o commit-base do recibo gratis-refaz (era: base(…) = origin/main, que já contém a camada publicada)
  const coletar = rd('lib/regua95/coletar.ts')
  checa('3.15 o cron diz a marca ao juiz só quando o RenderScript gravado a tem, e só então liga o desconto', /\.eq\('name', 'free_redo_film_source'\)\.in\('session_id', part\)\s*\n\s*\.contains\('metadata', \{ source: \{ elements: \[\{ type: 'text', text: 'usekineo\.com\/free' \}\] \} \}\)/.test(coletar) && coletar.includes("...(gen && comMarca.has(gen) ? { expectedKineoWatermark: true } : {})") && coletar.includes("...(e.pixel.expectedKineoWatermark === true ? { marcaMedida: true } : {})"))
}

console.log(`\n${falhas.length === 0 ? '🟢' : '🔴'} painel-motor-entregue-0211: ${ok}/${ok + falhas.length}`)
if (falhas.length) { for (const f of falhas) console.error('  · ' + f); process.exit(1) }
