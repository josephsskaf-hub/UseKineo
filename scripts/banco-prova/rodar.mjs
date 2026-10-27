#!/usr/bin/env node
// KINEO-BANCO-PROVA-2710 [TRAVA 8.2 — vai do fundador 27/10 "aprovo banco"] — o executor do banco de pedidos-prova.
//
// O que faz: lê casos.json, manda cada caso para /api/generate-video-cinematic com `dry_run: 'stills'` (só conta do ensaio
// de $0: o pedido real percorre planner → prompts por cena → still FLUX → crítico e PARA antes do 1º clipe, com estorno),
// N em paralelo (padrão 4), grava docs/banco-prova/rodada-<timestamp>.json + .md, compara com docs/banco-prova/baseline.json
// (scripts/banco-prova/comparar.mjs) e sai com código 1 se o total caiu ou algum caso regrediu abaixo do limiar.
//
// USO
//   node scripts/banco-prova/rodar.mjs                      # roda tudo e compara com a baseline
//   node scripts/banco-prova/rodar.mjs --salvar-baseline    # roda tudo e grava a baseline nova (exige ≥ 80 % dos casos com nota)
//   node scripts/banco-prova/rodar.mjs --casos krishna-vishwaroop,ploc-alienigena --paralelo 2
//   node scripts/banco-prova/rodar.mjs --url http://localhost:3000
//
// ENV (nenhum segredo no repo)
//   BANCO_PROVA_URL        base do site (padrão https://www.usekineo.com; `--url` ganha)
//   BANCO_PROVA_COOKIE     o cabeçalho Cookie inteiro de uma sessão LOGADA de conta interna do ensaio (josephsskaf@gmail.com,
//                          josephskaf@gmail.com ou joseph-test@shortsforgeai.com). Como pegar: Chrome logado no site → F12 →
//                          Application → Cookies → copiar o(s) valor(es) de `sb-cqqukkvjjrguayiyjvhh-auth-token` (ou os pedaços
//                          `.0`, `.1`) no formato `nome=valor; nome2=valor2`. Dura enquanto a sessão durar (~1 h de access token;
//                          o @supabase/ssr renova pelo refresh_token no primeiro pedido).
//   — OU, em vez do cookie —
//   BANCO_PROVA_EMAIL + BANCO_PROVA_SENHA   e-mail e senha da conta de ensaio (joseph-test@shortsforgeai.com tem senha; as
//                          contas Google não). O executor faz o login por senha no Supabase (grant_type=password) e cunha o
//                          cookie no molde do @supabase/ssr (lib/mcp/studioSession.ts sessionCookiePairs).
//   BANCO_PROVA_SUPABASE_URL / BANCO_PROVA_ANON_KEY   só para o login por senha; se ausentes, lê NEXT_PUBLIC_SUPABASE_URL /
//                          NEXT_PUBLIC_SUPABASE_ANON_KEY do ambiente ou do .env.local da raiz (chave pública, não secreta).
//   BANCO_PROVA_PARALELO   (padrão 4) · BANCO_PROVA_TOLERANCIA (padrão 1 ponto) · BANCO_PROVA_LIMIAR (padrão 60)
//   BANCO_PROVA_TIMEOUT_MS (padrão 290000 — a rota tem maxDuration 300 s)
//
// CUSTO: só stills + visão. Filme de 15 s = 3 cenas → 3 stills FLUX (US$ 0,015 cada) + crítico (US$ 0,0005/foto) + no filme
// de 15 s a folha de personagem (1-2 folhas FLUX + 1-3 stills com folha ≈ US$ 0,15 cada) + 1 chamada de expectativas
// (≈ US$ 0,003) + o escritor (≈ US$ 0,001). ≈ US$ 0,05 (sem folha) a US$ 0,45 (folha em todas as cenas) por caso;
// 30 casos ≈ US$ 2-6 por rodada completa. Crédito do cliente: zero (estorno no mesmo pedido). Nenhum vídeo, voz ou música.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { compararRodadas, tabelaMarkdown, totalDaRodada, LIMIAR_PADRAO, TOLERANCIA_PADRAO } from './comparar.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..', '..')
const DOCS = join(RAIZ, 'docs', 'banco-prova')
const BASELINE = join(DOCS, 'baseline.json')

// ── args ──
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(n)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const salvarBaseline = flag('--salvar-baseline')
const forcar = flag('--forcar')
const url = (opt('--url', process.env.BANCO_PROVA_URL) || 'https://www.usekineo.com').replace(/\/+$/, '')
const paralelo = Math.max(1, Math.min(8, Number(opt('--paralelo', process.env.BANCO_PROVA_PARALELO)) || 4))
const tolerancia = Number(process.env.BANCO_PROVA_TOLERANCIA ?? TOLERANCIA_PADRAO)
const limiarPadrao = Number(process.env.BANCO_PROVA_LIMIAR ?? LIMIAR_PADRAO)
const timeoutMs = Number(process.env.BANCO_PROVA_TIMEOUT_MS) || 290_000
const filtro = (opt('--casos', '') || '').split(',').map((s) => s.trim()).filter(Boolean)

// ── .env.local (só as chaves públicas do Supabase, se faltarem) ──
function lerEnvLocal() {
  const p = join(RAIZ, '.env.local')
  if (!existsSync(p)) return {}
  const out = {}
  for (const linha of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linha)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

/** FNV-1a 32 bits do id do caso → semente fixa por caso (mesmo caso = mesmos stills entre rodadas). */
export function seedDoCaso(id) {
  let h = 0x811c9dc5
  for (const ch of String(id)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0 }
  return h % 2_147_483_647
}

/** Cookie no molde do @supabase/ssr: "base64-" + base64url(JSON) em pedaços de 3180. */
export function cookieDaSessao(supabaseUrl, session) {
  const ref = new URL(supabaseUrl).hostname.split('.')[0]
  const nome = `sb-${ref}-auth-token`
  const enc = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  if (enc.length <= 3180) return `${nome}=${enc}`
  const partes = []
  for (let i = 0, n = 0; i < enc.length; i += 3180, n++) partes.push(`${nome}.${n}=${enc.slice(i, i + 3180)}`)
  return partes.join('; ')
}

async function cookieDeAcesso() {
  if (process.env.BANCO_PROVA_COOKIE) return process.env.BANCO_PROVA_COOKIE
  const email = process.env.BANCO_PROVA_EMAIL
  const senha = process.env.BANCO_PROVA_SENHA
  if (!email || !senha) throw new Error('faltou BANCO_PROVA_COOKIE (ou BANCO_PROVA_EMAIL + BANCO_PROVA_SENHA) — veja o cabeçalho de rodar.mjs')
  const env = { ...lerEnvLocal(), ...process.env }
  const supabaseUrl = env.BANCO_PROVA_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const anon = env.BANCO_PROVA_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anon) throw new Error('login por senha precisa de BANCO_PROVA_SUPABASE_URL + BANCO_PROVA_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_URL/ANON_KEY no ambiente ou .env.local)')
  const r = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anon }, body: JSON.stringify({ email, password: senha }) })
  if (!r.ok) throw new Error(`login por senha falhou: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`)
  const s = await r.json()
  if (!s?.access_token) throw new Error('login por senha sem access_token')
  return cookieDaSessao(supabaseUrl, { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at ?? Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600), expires_in: s.expires_in ?? 3600, token_type: s.token_type ?? 'bearer', user: s.user ?? null })
}

/** O corpo que a rota recebe: o pedido real + dry_run:'stills' + o caso (id, expectativas, semente). */
export function corpoDoCaso(caso, padrao = {}) {
  return {
    generationId: randomUUID(),
    prompt: caso.texto,
    duration: caso.duracao ?? padrao.duracao ?? 15,
    engine: caso.motor ?? padrao.motor ?? 'seedance',
    language: caso.idioma,
    script_mode: caso.script_mode ?? padrao.script_mode ?? 'ai',
    dry_run: 'stills',
    banco_prova: { caso: caso.id, espera: caso.espera ?? [], seed: seedDoCaso(caso.id) },
  }
}

/** Resume a resposta da rota numa linha do caso (o que a rodada e a baseline guardam). */
export function linhaDoCaso(caso, resposta, status, ms, limiar) {
  const bp = resposta?.banco_prova
  if (status !== 200 || !bp) return { id: caso.id, idioma: caso.idioma, limiar, nota: null, erro: `http_${status}${resposta?.reason ? ':' + resposta.reason : resposta?.error ? ':' + String(resposta.error).slice(0, 80) : ''}`, ms }
  return {
    id: caso.id, idioma: caso.idioma, limiar,
    nota: bp.nota, nota_critico: bp.nota_critico, taxa_expectativas: bp.taxa_expectativas, expectativas_cumpridas: bp.expectativas_cumpridas, expectativas_aplicaveis: bp.expectativas_aplicaveis,
    falhas: bp.falhas, cenas: bp.cenas, cenas_com_still: bp.cenas_com_still, cenas_julgadas: bp.cenas_julgadas, stills_flux: bp.stills_flux, folha: bp.folha,
    refunded: bp.refunded, charged: bp.charged, custo_usd: bp.custo_usd, ms, generation_id: bp.generation_id, seed: bp.seed, engine: bp.engine, visual_mode: bp.visual_mode, anchor_active: bp.anchor_active,
    erro: bp.nota === null ? (bp.expectativas_erro || 'sem_nota') : null,
    detalhe: bp.detalhe, expectativas: bp.expectativas,
  }
}

async function rodarCaso(caso, cookie, limiar) {
  const t0 = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(`${url}/api/generate-video-cinematic`, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', Cookie: cookie, 'User-Agent': 'kineo-banco-prova/1' }, body: JSON.stringify(corpoDoCaso(caso, PADRAO)) })
    const j = await r.json().catch(() => null)
    return linhaDoCaso(caso, j, r.status, Date.now() - t0, limiar)
  } catch (err) {
    return { id: caso.id, idioma: caso.idioma, limiar, nota: null, erro: ctrl.signal.aborted ? `timeout_${timeoutMs}ms` : `fetch_${String(err?.message ?? err).slice(0, 80)}`, ms: Date.now() - t0 }
  } finally {
    clearTimeout(timer)
  }
}

let PADRAO = {}
async function main() {
  const banco = JSON.parse(readFileSync(join(AQUI, 'casos.json'), 'utf8'))
  PADRAO = banco.padrao ?? {}
  let casos = banco.casos
  if (filtro.length) casos = casos.filter((c) => filtro.includes(c.id))
  if (!casos.length) { console.error('nenhum caso selecionado'); process.exit(2) }
  const cookie = await cookieDeAcesso()
  const quando = new Date().toISOString()
  console.log(`banco de pedidos-prova · ${casos.length} casos · ${url} · ${paralelo} em paralelo · ${quando}`)
  const linhas = []
  let i = 0
  const trabalhador = async () => {
    while (i < casos.length) {
      const caso = casos[i++]
      const limiar = Number.isFinite(caso.limiar) ? caso.limiar : limiarPadrao
      const l = await rodarCaso(caso, cookie, limiar)
      linhas.push(l)
      console.log(`  ${l.nota === null ? 'ERRO' : l.nota < limiar ? 'baixo' : 'ok  '} ${caso.id.padEnd(30)} nota=${l.nota ?? '—'} critico=${l.nota_critico ?? '—'} exp=${l.expectativas_aplicaveis ? `${l.expectativas_cumpridas}/${l.expectativas_aplicaveis}` : '—'} stills=${l.cenas_com_still ?? '—'}/${l.cenas ?? '—'} ${l.erro ? 'erro=' + l.erro : ''} ${Math.round(l.ms / 1000)} s`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(paralelo, casos.length) }, trabalhador))
  linhas.sort((a, b) => casos.findIndex((c) => c.id === a.id) - casos.findIndex((c) => c.id === b.id))
  const rodada = { versao: banco.versao, quando, url, parcial: filtro.length > 0, total: totalDaRodada(linhas), custo_usd: Math.round(linhas.reduce((a, l) => a + (l.custo_usd || 0), 0) * 1000) / 1000, casos: linhas }
  mkdirSync(DOCS, { recursive: true })
  const carimbo = quando.replace(/[:.]/g, '-')
  const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null
  const comp = base ? compararRodadas(rodada, base, { tolerancia, limiarPadrao }) : null
  if (comp) comp.casos_base = base.casos.map((c) => ({ id: c.id, nota: c.nota }))
  writeFileSync(join(DOCS, `rodada-${carimbo}.json`), JSON.stringify(rodada, null, 1))
  const md = tabelaMarkdown(rodada, comp)
  writeFileSync(join(DOCS, `rodada-${carimbo}.md`), md)
  console.log('\n' + md)
  const comNota = linhas.filter((l) => l.nota !== null).length
  if (salvarBaseline) {
    if (filtro.length && !forcar) { console.error('baseline não salva: rodada parcial (--casos). Use --forcar para salvar mesmo assim.'); process.exit(2) }
    if (comNota < Math.ceil(linhas.length * 0.8) && !forcar) { console.error(`baseline não salva: só ${comNota}/${linhas.length} casos com nota (< 80 %). Use --forcar para salvar mesmo assim.`); process.exit(2) }
    writeFileSync(BASELINE, JSON.stringify({ ...rodada, casos: linhas.map(({ detalhe, expectativas, ...resto }) => resto) }, null, 1))
    console.log(`baseline salva em docs/banco-prova/baseline.json (total ${rodada.total}, ${comNota}/${linhas.length} com nota)`)
    process.exit(0)
  }
  if (!comp) { console.log('sem baseline (docs/banco-prova/baseline.json) — nada a comparar; rode com --salvar-baseline para fixar a primeira'); process.exit(0) }
  if (comp.bloqueia) { console.error(`\nBLOQUEIA: ${comp.motivos.join(' · ')}`); process.exit(1) }
  console.log('\nlibera: nenhuma regressão')
  process.exit(0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(/faltou|precisa de|login por senha/.test(String(e?.message)) ? `erro de configuração: ${e.message}` : (e?.stack ?? String(e))); process.exit(2) })
