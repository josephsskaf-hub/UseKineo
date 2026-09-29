#!/usr/bin/env node
// GUARDIÃO — defeitos dos 10 anúncios Kineo 1 de 28/09 (item copy-resgate).
//
// (A) FRASE DE SALDO NA TELA DE PRONTO. A tela dividia o saldo pelo Seedance
//     1.5 de 60 s (videosForCredits(credits, 'cinematic_ai')) qualquer que fosse
//     o motor usado: 37 cr numa conta Pro que acabou de fazer um Kineo 1 liam
//     "about 1 more 60-second AI video". Agora a conta sai do motor e da duração
//     do filme que acabou de sair (lib/growth/readyCreditsLine.ts), com
//     creditCostForDuration — a função que o servidor usa para cobrar. Conta
//     grátis não ganha contagem (crédito não compra filme para ela) e a cota vem
//     de OFFER.copy, nunca de literal "per month" / "3 … 24h".
// (B) REDE DE RESGATE. app/api/render-recovery recusava o checkpoint inteiro se
//     UM clipe viesse do fallback de estoque (lib/stockLibrary.ts, ex.:
//     res.cloudinary.com/demo no anúncio eCredit). Todo host da stockLibrary
//     tem de estar na allowlist — lido da PRÓPRIA fonte, então um host novo lá
//     sem par aqui deixa este guardião vermelho.
//
// Sem rede, sem banco, sem env, sem alias @/: lê os arquivos reais com
// readFileSync e EXECUTA os módulos puros transpilados pelo typescript do
// repo. Cada suíte roda de novo sobre mutantes em memória, e cada mutante
// precisa (1) provar que aplicou e (2) deixar a suíte vermelha.
//   node scripts/test-creditos-restantes-e-resgate-2026-09-28.mjs
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(raiz, 'package.json'))
const ts = requireFromRepo('typescript')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

const HELPER = 'lib/growth/readyCreditsLine.ts'
const CLIENTE = 'app/(dashboard)/generate/GenerateClient.tsx'
const ROTA = 'app/api/render-recovery/route.ts'
const ESTOQUE = 'lib/stockLibrary.ts'

function carregar(rel, codigo, mocks = {}) {
  const filename = join(raiz, rel)
  const out = ts.transpileModule(codigo, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  const req = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${rel} tentou importar módulo não permitido no teste: ${id}`)
  }
  new Function('require', 'module', 'exports', `${out}\n//# sourceURL=${filename}`)(req, module, module.exports)
  return module.exports
}

// Módulos reais de apoio (nenhum deles é alvo de mutação).
const engine = carregar('lib/credits/engineCost.ts', ler('lib/credits/engineCost.ts'))
const rotulo = carregar('lib/engineLabel.ts', ler('lib/engineLabel.ts'))
const entrada = carregar('lib/entryPolicy.ts', ler('lib/entryPolicy.ts'))
const oferta = carregar('lib/freeTierOffer.ts', ler('lib/freeTierOffer.ts'), {
  './credits/engineCost': engine,
  './entryPolicy': entrada,
})
const ON = oferta.buildFreeTierOffer(true)
const OFF = oferta.buildFreeTierOffer(false)
const cotaDe = (o) => ({ cardEntry: o.cardEntry, residual: o.copy.residual, chip: o.copy.chip })

// Todos os valores do tipo Quality, lidos da fonte (não digitados aqui).
const blocoQuality = (ler('lib/credits/engineCost.ts').match(/export type Quality =([\s\S]*?)\n\s*\n/) ?? [])[1] ?? ''
const QUALITIES = [...blocoQuality.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1])
const ROTULOS = new Set(
  [...QUALITIES, 'fast'].map((q) => rotulo.engineLabelFor(q)).filter((x) => typeof x === 'string'),
)

// Tira comentário de bloco, de JSX e de linha inteira. Não usa `//` no meio da
// linha (engoliria `https://`).
const semComentarios = (s) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n')

// ── (A) ─────────────────────────────────────────────────────────────────────
function suiteA({ helperSrc, clienteSrc }) {
  const falhas = []
  const ok = []
  const checa = (nome, cond) => (cond ? ok : falhas).push(nome)
  let helper
  try {
    helper = carregar(HELPER, helperSrc, { '@/lib/credits/engineCost': engine, '@/lib/engineLabel': rotulo })
  } catch (e) {
    falhas.push(`helper carrega: ${e instanceof Error ? e.message : e}`)
    return { ok, falhas }
  }
  const linha = (credits, quality, seconds, pago, o = ON, gasta = false) =>
    helper.readyCreditsLine({ credits, quality, seconds, isPaidAccount: pago, freeOffer: cotaDe(o), freeQuotaSpent: gasta })
  const custo = (q, s) => engine.creditCostForDuration(q, true, s)
  const k1 = rotulo.engineLabelFor('fast')
  const sd = rotulo.engineLabelFor('cinematic_ai')

  // A1 — a prova do enunciado: 37 cr + Kineo 1 de 60 s = 7 filmes.
  const sete = Math.floor(37 / custo('fast', 60))
  checa('A1 prova numérica: floor(37 / custo Kineo 1 60 s) === 7', sete === 7)
  checa(
    'A1 frase: 37 cr + Kineo 1 60 s → "about 7 more 60s Kineo 1 videos"',
    linha(37, 'fast', 60, true) === `enough for about 7 more 60s ${k1} videos (${custo('fast', 60)} credits each).`,
  )
  // A2 — o caso real dos anúncios (Kineo 1 de 35 s) e o antigo "not enough" falso.
  checa('A2 37 cr + Kineo 1 35 s → 12', linha(37, 'fast', 35, true).startsWith(`enough for about ${Math.floor(37 / custo('fast', 35))} more 35s ${k1} videos`) && Math.floor(37 / custo('fast', 35)) === 12)
  checa('A2 13 cr + Kineo 1 35 s → 4', linha(13, 'fast', 35, true).startsWith(`enough for about 4 more 35s ${k1} videos`) && Math.floor(13 / custo('fast', 35)) === 4)
  checa('A2 22 cr + Kineo 1 60 s não é mais "not enough"', linha(22, 'fast', 60, true).startsWith('enough for about 4 more 60s'))
  // A3 — o único caso que a frase antiga acertava continua certo (e no singular).
  checa(
    'A3 37 cr + Seedance 60 s → "about 1 more 60s Seedance 1.5 video" (singular)',
    linha(37, 'cinematic_ai', 60, true) === `enough for about 1 more 60s ${sd} video (${custo('cinematic_ai', 60)} credits each).`,
  )
  // A4 — "sem crédito": parede honesta + a saída pelo Kineo 1 quando cabe.
  const parede = linha(10, 'cinematic_ai', 35, true)
  checa(
    'A4 10 cr + Seedance 35 s → parede com o custo do motor usado',
    parede.startsWith(`not enough for another 35s ${sd} video (it takes ${custo('cinematic_ai', 35)}).`),
  )
  checa(
    'A4 … e a saída pelo Kineo 1 na mesma duração',
    parede.endsWith(`A 35s ${k1} video takes ${custo('fast', 35)} — enough for about ${Math.floor(10 / custo('fast', 35))}.`),
  )
  checa('A4 saldo que não paga nem o Kineo 1 → só a parede', linha(1, 'fast', 35, true) === `not enough for another 35s ${k1} video (it takes ${custo('fast', 35)}).`)
  // A5 — todo motor × toda duração, conta paga: sempre um motor com nome, nunca null/NaN.
  checa('A5 tipo Quality lido da fonte (>= 10 valores)', QUALITIES.length >= 10 && QUALITIES.includes('fast') && QUALITIES.includes('cinematic_s25'))
  let totais = 0
  let ruins = []
  for (const q of QUALITIES) {
    for (const s of [35, 60, 90]) {
      for (const c of [0, 1, 40, 500]) {
        totais++
        const t = linha(c, q, s, true)
        const forma = /^(enough for about \d+ more \d+s .+ videos? \(\d+ credits? each\)\.|not enough for another \d+s .+ video \(it takes \d+\)\.)/.test(t)
        const nomeado = [...ROTULOS].some((r) => t.includes(` ${r} video`))
        if (!forma || !nomeado || /null|undefined|NaN/.test(t)) ruins.push(`${q}/${s}/${c}: ${t}`)
      }
    }
  }
  checa(`A5 conta paga: ${totais} combinações nomeiam motor e custo (ruins: ${ruins.slice(0, 2).join(' | ')})`, ruins.length === 0 && totais >= 120)
  // A6 — conta grátis: sem contagem de filme, cota vinda de OFFER.copy.
  const gratisK1 = linha(25, 'fast', 35, false, ON)
  const gratisIA = linha(25, 'cinematic_ai', 60, false, ON)
  const semContagem = (t) => !/\d+ more|enough for about|AI video|per month/.test(t)
  checa('A6 grátis (flag ON): sem contagem e com a cota semanal de OFFER.copy', semContagem(gratisK1) && gratisK1.includes(ON.copy.residual) && gratisK1.includes('paid plan'))
  checa('A6 grátis que acabou de sair de um Seedance (trial vencido): sem contagem de IA', semContagem(gratisIA) && gratisIA.includes(ON.copy.residual))
  checa('A6 grátis (flag OFF): cota de 24 h de OFFER.copy', linha(25, 'fast', 35, false, OFF).includes(OFF.copy.residual))
  checa('A6 grátis com cota esgotada: diz que a cota acabou', linha(25, 'fast', 35, false, OFF, true).includes(`your free quota (${OFF.copy.residual}) is used for now.`))
  checa('A6 grátis com 0 crédito: não fala de saldo que não existe', !linha(0, 'fast', 35, false, ON).includes('they work'))
  checa('A6 Versão B (cardEntry): devolve o chip da porta', helper.readyCreditsLine({ credits: 5, quality: 'fast', seconds: 35, isPaidAccount: false, freeOffer: { cardEntry: true, residual: 'r', chip: 'CHIP' }, freeQuotaSpent: false }) === 'CHIP')

  // Fonte do helper: deriva do engineCost, sem número digitado.
  const helperCodigo = semComentarios(helperSrc)
  checa('H1 helper cobra com creditCostForDuration(q, isPaidAccount, seconds)', helperCodigo.includes('creditCostForDuration(q, input.isPaidAccount, seconds)'))
  checa('H1 helper nomeia com engineLabelFor', helperCodigo.includes('engineLabelFor(q)'))
  checa('H2 helper sem número digitado (só 0/1 de comparação)', !/\b(?![01]\b)\d+\b/.test(helperCodigo))

  // Fonte da tela (GenerateClient): o bloco "Your video is ready" até o título.
  // O título "Your video is ready" aparece em 4 lugares do arquivo (2 são
  // comentário, 1 é o cartão do render ativo): ancora no ÚLTIMO antes do
  // comentário "Push #065", que é o cabeçalho da tela de pronto.
  const fim = clienteSrc.indexOf('Push #065')
  const ini = fim > 0 ? clienteSrc.lastIndexOf('Your video is ready', fim) : -1
  const bloco = ini >= 0 && fim > ini ? clienteSrc.slice(ini, fim) : ''
  const blocoCodigo = semComentarios(bloco)
  checa(`C0 bloco da tela de pronto encontrado (${bloco.length} chars)`, bloco.length > 400 && bloco.length < 8000)
  checa(
    "C1 literal videosForCredits(credits, 'cinematic_ai') no arquivo = 0",
    clienteSrc.split("videosForCredits(credits, 'cinematic_ai')").length - 1 === 0,
  )
  checa('C1 nenhum videosForCredits( no bloco da tela de pronto', !blocoCodigo.includes('videosForCredits('))
  checa('C2 bloco sem "per month", "60-second", seedanceReferenceCost nem "3 … 24h"', !/per month|60-second|seedanceReferenceCost|\b3\b[^\n]{0,80}24\s?h/i.test(blocoCodigo))
  checa(
    'C3 a frase é decidida pelo motor/duração usados (readyCreditsLine amarrado às variáveis)',
    // Reancorado 29/09 (KINEO-ENTRADA-SEEDANCE15, E2b): a chamada ganhou os 2 campos da entrada nova (kineo1Allowed,
    // shortSeedanceSeconds) DEPOIS dos de sempre; motor/duração usados continuam amarrados às mesmas variáveis.
    /\{credits !== null && \([\s\S]{0,600}readyCreditsLine\(\{\s*credits,\s*quality: planFitNormalizedQuality,\s*seconds: duration,\s*isPaidAccount,\s*freeOffer: \{ cardEntry: OFFER\.cardEntry, residual: OFFER\.copy\.residual, chip: OFFER\.copy\.chip \},\s*freeQuotaSpent: freeFastQuotaSpent,\s*(\/\/[^\n]*\s*)?kineo1Allowed: kineo1Shown,\s*shortSeedanceSeconds: entrada15 \? SEEDANCE_SHORT_SECONDS : null,\s*\}\)/.test(blocoCodigo),
  )
  checa(
    'C4 planFitNormalizedQuality = o ref do motor que rodou (restaurado na retomada)',
    /const planFitNormalizedQuality = normalizeQuality\(\s*falUsedRef\.current\s*\?\s*falQualityRef\.current\s*:\s*mode === 'fast' \|\| mode === 'creator'\s*\?\s*'fast'\s*:\s*quality,?\s*\)/.test(clienteSrc),
  )
  checa(
    'C5 trial conta como pago (o mesmo isPaidAccount do botão Generate)',
    /const isPaidAccount = hasPaid \|\| trialActive \|\| \(planTier !== null && planTier !== 'free'\)/.test(clienteSrc),
  )
  checa("C6 import do helper", clienteSrc.includes("import { readyCreditsLine } from '@/lib/growth/readyCreditsLine'"))
  return { ok, falhas }
}

// ── (B) ─────────────────────────────────────────────────────────────────────
const MOCKS_ROTA = {
  'next/server': { NextResponse: { json: () => ({}) }, NextRequest: class {} },
  '@/lib/aspect': { normalizeAspect: (a) => a },
  '@/lib/supabase/server': { createClient: () => ({}) },
  '@supabase/supabase-js': { createClient: () => ({}) },
}
const hostDe = (u) => new URL(u).hostname.toLowerCase()

function suiteB({ rotaSrc, estoqueSrc }) {
  const falhas = []
  const ok = []
  const checa = (nome, cond) => (cond ? ok : falhas).push(nome)
  let rota
  try {
    rota = carregar(ROTA, rotaSrc, MOCKS_ROTA)
  } catch (e) {
    falhas.push(`rota carrega: ${e instanceof Error ? e.message : e}`)
    return { ok, falhas }
  }
  const urls = [
    ...estoqueSrc
      .split('\n')
      .filter((l) => !/^\s*\/\//.test(l))
      .join('\n')
      .matchAll(/url:\s*'(https:\/\/[^']+)'/g),
  ].map((m) => m[1])
  const hosts = [...new Set(urls.map(hostDe))]
  checa(`B0 stockLibrary lida da fonte (${urls.length} clipes, ${hosts.length} hosts)`, urls.length >= 10 && hosts.length >= 4)

  const lista = semComentarios((rotaSrc.match(/const ALLOWED_CLIP_HOSTS = \[([\s\S]*?)\]/) ?? [])[1] ?? '')
  const permitidos = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1])
  const naLista = (h) => permitidos.some((p) => h === p || h.endsWith(`.${p}`))
  checa("B1 'res.cloudinary.com' está na allowlist", permitidos.includes('res.cloudinary.com'))
  const fora = hosts.filter((h) => !naLista(h))
  checa(`B2 todo host da stockLibrary está na allowlist (fora: ${fora.join(', ') || 'nenhum'})`, fora.length === 0)

  const payload = (u) => ({
    quality: 'fast',
    clip_urls: ['https://cdn.pixabay.com/video/2024/01/01/x.mp4', u],
    duration: 35,
    voiceover_script: 'A short narration.',
    scene_captions: ['a', 'b'],
  })
  const aceita = (u) => {
    const r = rota.sanitizeFastComposePayload('gen-12345678', payload(u))
    return r !== null && Array.isArray(r.clip_urls) && r.clip_urls[1] === u
  }
  const recusados = urls.filter((u) => !aceita(u))
  checa(`B3 sanitizador aceita todo clipe da stockLibrary (recusados: ${recusados.length})`, urls.length > 0 && recusados.length === 0)
  checa('B3 o clipe exato do eCredit (cld-sample-video) passa', aceita('https://res.cloudinary.com/demo/video/upload/samples/cld-sample-video.mp4'))
  // Controles negativos: a allowlist continua FECHADA.
  checa('B4 host desconhecido continua recusado', !aceita('https://evil.example.com/a.mp4'))
  checa('B4 http (sem TLS) continua recusado', !aceita('http://res.cloudinary.com/demo/video/upload/dog.mp4'))
  checa('B4 sósia por sufixo (res.cloudinary.com.evil.io) recusado', !aceita('https://res.cloudinary.com.evil.io/x.mp4'))
  checa('B4 sósia sem ponto (notarchive.org) recusado', !aceita('https://notarchive.org/x.mp4'))
  return { ok, falhas }
}

// ── execução real ──────────────────────────────────────────────────────────
const real = {
  helperSrc: ler(HELPER),
  clienteSrc: ler(CLIENTE),
  rotaSrc: ler(ROTA),
  estoqueSrc: ler(ESTOQUE),
}
const rA = suiteA(real)
const rB = suiteB(real)
for (const n of [...rA.ok, ...rB.ok]) console.log(`✓ ${n}`)
for (const n of [...rA.falhas, ...rB.falhas]) console.error(`✗ ${n}`)

// ── mutantes ───────────────────────────────────────────────────────────────
const trocaUma = (src, de, para) => {
  const i = src.indexOf(de)
  return i < 0 ? src : src.slice(0, i) + para + src.slice(i + de.length)
}
const semLinha = (src, trecho) =>
  src
    .split('\n')
    .filter((l) => !l.includes(trecho))
    .join('\n')
const mutantes = [
  {
    nome: 'MA1 helper volta ao Seedance fixo',
    suite: 'A',
    campo: 'helperSrc',
    muta: (s) => trocaUma(s, 'const q = countableQuality(input.quality)', "const q: Quality = 'cinematic_ai'"),
  },
  {
    nome: 'MA2 tela passa motor fixo (Seedance) em vez do motor usado',
    suite: 'A',
    campo: 'clienteSrc',
    muta: (s) => s.replace(/(readyCreditsLine\(\{\s*credits,\s*)quality: planFitNormalizedQuality,/, (_m, a) => `${a}quality: 'cinematic_ai',`),
  },
  {
    nome: "MA3 frase antiga videosForCredits(credits, 'cinematic_ai') volta ao bloco",
    suite: 'A',
    campo: 'clienteSrc',
    muta: (s) => trocaUma(s, '{readyCreditsLine({', "{`about ${videosForCredits(credits, 'cinematic_ai')} more`}{readyCreditsLine({"),
  },
  {
    nome: 'MA4 conta grátis ganha contagem de filme de IA',
    suite: 'A',
    campo: 'helperSrc',
    muta: (s) => trocaUma(s, 'if (input.isPaidAccount) {', 'if (true) {'),
  },
  {
    nome: 'MA5 ramo grátis volta ao literal "per month"',
    suite: 'A',
    campo: 'helperSrc',
    muta: (s) => trocaUma(s, 'the free plan includes ${input.freeOffer.residual}.', 'the free plan includes 1 watermarked Fast video per month.'),
  },
  {
    nome: 'MA6 retomada perde o motor (ref trocado por Seedance fixo)',
    suite: 'A',
    campo: 'clienteSrc',
    muta: (s) => s.replace(/(const planFitNormalizedQuality = normalizeQuality\(\s*falUsedRef\.current\s*\?\s*)falQualityRef\.current/, (_m, a) => `${a}'cinematic_ai'`),
  },
  {
    nome: "MB1 'res.cloudinary.com' sai da allowlist",
    suite: 'B',
    campo: 'rotaSrc',
    muta: (s) => semLinha(s, "  'res.cloudinary.com',"),
  },
  {
    nome: "MB2 'archive.org' sai da allowlist",
    suite: 'B',
    campo: 'rotaSrc',
    muta: (s) => semLinha(s, "  'archive.org',"),
  },
  {
    nome: 'MB3 allowlist aberta (hostAllowed devolve true)',
    suite: 'B',
    campo: 'rotaSrc',
    muta: (s) => trocaUma(s, 'return ALLOWED_CLIP_HOSTS.some(', 'return true || ALLOWED_CLIP_HOSTS.some('),
  },
  {
    nome: 'MB4 stockLibrary ganha host novo sem par na allowlist',
    suite: 'B',
    campo: 'estoqueSrc',
    muta: (s) => trocaUma(s, 'const CLIPS: LibraryClip[] = [', "const CLIPS: LibraryClip[] = [\n  { url: 'https://videos.new-stock-cdn.example/a.mp4', width: 1, height: 1, duration: 1, tags: ['default'] },"),
  },
]
let mortos = 0
const vivos = []
for (const m of mutantes) {
  const fonte = { ...real }
  fonte[m.campo] = m.muta(real[m.campo])
  if (fonte[m.campo] === real[m.campo]) {
    vivos.push(`${m.nome} (NÃO APLICOU — âncora sumiu)`)
    continue
  }
  const r = m.suite === 'A' ? suiteA(fonte) : suiteB(fonte)
  if (r.falhas.length > 0) {
    mortos++
    console.log(`✓ mutante morto: ${m.nome} → ${r.falhas[0]}`)
  } else {
    vivos.push(m.nome)
  }
}
for (const v of vivos) console.error(`✗ mutante VIVO: ${v}`)

const verdes = rA.ok.length + rB.ok.length
const vermelhos = rA.falhas.length + rB.falhas.length
console.log(`\n${verdes} verificações ok, ${vermelhos} falhas · ${mortos}/${mutantes.length} mutantes mortos`)
if (vermelhos > 0 || vivos.length > 0) process.exit(1)
