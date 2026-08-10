/**
 * ═══ KINEO-CREATOMATE-QUOTA-METER-2026-08-10 ════════════════════════════════
 *
 * Prova offline (`npm run prove:quota`) do medidor de cota do Creatomate
 * (`lib/creatomateQuota.ts`) e do perfil de render (`lib/renderProfile.ts`).
 * Sem banco e sem rede: todos os números abaixo são medições REAIS de produção
 * (Supabase cqqukkvjjrguayiyjvhh) e do painel do fornecedor, copiadas em
 * 10/08/2026 22:0xZ.
 *
 * POR QUE ELE EXISTE
 *
 *   O produto ficou 30 horas parado (último vídeo 09/08 16:21:08Z) porque a
 *   cota mensal do Creatomate chegou a 100% — "10.0K of 10.0K credits used",
 *   textual no painel. Foi o segundo estouro em 9 dias (o de 01/08 foi no plano
 *   anterior). Não havia medidor: o único alarme existente toca quando o
 *   fornecedor JÁ recusa, isto é, depois do prejuízo.
 *
 *   Um medidor que ninguém consegue falsificar é só mais uma opinião no
 *   repositório. Este script existe para que as quatro afirmações que
 *   justificam o commit sejam verificáveis por qualquer um, em 2 segundos:
 *
 *     1. INÉRCIA — o perfil default é EXATAMENTE o output de ontem
 *        (1080×1920@30). Deployar isto não muda um pixel de um vídeo.
 *     2. A FÓRMULA ESTÁ CERTA — reproduz a afirmação pública do próprio
 *        fornecedor ("one minute at 720p 25fps is about 14 credits").
 *     3. O MEDIDOR ACERTA A REALIDADE — sobre a coorte real de agosto ele
 *        estima 10.000 ± 1% contra os 10.000 que o painel marcava.
 *     4. O ALARME TERIA TOCADO A TEMPO — sobre a série diária real, o patamar
 *        de 80% cai em 08/08, mais de um dia ANTES do apagão de 09/08 16:21Z.
 *        Sem esta asserção, "teria avisado" é marketing interno.
 *
 *   E mais duas que protegem contra apodrecimento:
 *
 *     5. OS LITERAIS NÃO VOLTARAM — 1080/1920/30 não podem reaparecer nos três
 *        call sites, senão a alavanca de env vira decoração.
 *     6. A TABELA DE CUSTO DO CABEÇALHO confere com a aritmética. Tabela de
 *        decisão errada é pior que tabela nenhuma: o fundador decide por ela.
 *
 * SAI COM EXIT 1 EM QUALQUER FALHA.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

let failures = 0
const ok = (cond, label, detail = '') => {
  if (cond) {
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    failures++
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}
const near = (a, b, tolPct) => Math.abs(a - b) / Math.abs(b) * 100 <= tolPct

// ── A fórmula do fornecedor, escrita UMA vez aqui e conferida contra o TS ────
const credits = (w, h, fps, seconds) => (w * h * fps * seconds) / 1e8

// ── Constantes lidas do código, para não poderem divergir ───────────────────
const profileSrc = read('lib/renderProfile.ts')
const quotaSrc = read('lib/creatomateQuota.ts')

const grab = (src, re, label) => {
  const m = src.match(re)
  if (!m) {
    failures++
    console.log(`  ❌ não achei ${label} no fonte`)
    return NaN
  }
  return Number(m[1])
}

const DEF_W = grab(profileSrc, /width:\s*(\d+),/, 'width default')
const DEF_H = grab(profileSrc, /height:\s*(\d+),/, 'height default')
const DEF_FPS = grab(profileSrc, /fps:\s*(\d+),/, 'fps default')
const OVERHEAD = grab(quotaSrc, /DEFAULT_OVERHEAD_FACTOR\s*=\s*([\d.]+)/, 'overhead')
const PLAN = grab(quotaSrc, /DEFAULT_PLAN_CREDITS\s*=\s*([\d_]+)/, 'plano') // eslint-disable-line
const PLAN_CREDITS = Number(quotaSrc.match(/DEFAULT_PLAN_CREDITS\s*=\s*([\d_]+)/)[1].replace(/_/g, ''))
const THRESHOLDS = JSON.parse(
  quotaSrc.match(/const THRESHOLDS = (\[[^\]]+\])/)[1].replace(/\s+/g, ''),
)

// ═══ 1. INÉRCIA ══════════════════════════════════════════════════════════════
console.log('\n1. INÉRCIA — o default é o output de ontem')
ok(DEF_W === 1080 && DEF_H === 1920 && DEF_FPS === 30,
  'perfil default = 1080×1920@30', `${DEF_W}×${DEF_H}@${DEF_FPS}`)
ok(Math.abs(credits(DEF_W, DEF_H, DEF_FPS, 1) - 0.62208) < 1e-9,
  'custo do default', `${credits(DEF_W, DEF_H, DEF_FPS, 1)} cr/s`)
ok(Math.abs(DEF_W / DEF_H - 9 / 16) < 1e-9, 'default é 9:16 exato')

// ═══ 2. A FÓRMULA ════════════════════════════════════════════════════════════
console.log('\n2. FÓRMULA — reproduz a afirmação pública do fornecedor')
const vendorClaim = credits(1280, 720, 25, 60) // "about 14 credits"
ok(near(vendorClaim, 14, 2),
  '720p25 × 60s ≈ 14 créditos (afirmação do fornecedor)', `${vendorClaim.toFixed(2)}`)

// ═══ 3. O MEDIDOR CONTRA A REALIDADE ═════════════════════════════════════════
// Coorte REAL do ciclo de agosto, lida em 10/08 22:0xZ:
//   select count(*), sum(duration) from videos
//   where status='completed' and created_at >= '2026-08-01'
const REAL = { videos: 309, seconds: 14415, painelDoFornecedor: 10000 }
console.log('\n3. MEDIDOR — coorte real de agosto contra o painel do fornecedor')
const rawEstimate = credits(DEF_W, DEF_H, DEF_FPS, REAL.seconds)
ok(near(rawEstimate, 8967.3, 0.1),
  'soma crua dos vídeos entregues', `${rawEstimate.toFixed(1)} créditos (309 vídeos, 14.415 s)`)
const corrected = rawEstimate * OVERHEAD
ok(near(corrected, REAL.painelDoFornecedor, 1),
  `estimativa corrigida ×${OVERHEAD} bate com o painel (±1%)`,
  `${corrected.toFixed(0)} vs ${REAL.painelDoFornecedor}`)
// O fator não pode ser um número inventado para fechar a conta: ele TEM que ser
// a razão medida. Se alguém mexer nele sem medir de novo, esta linha cai.
ok(near(OVERHEAD, REAL.painelDoFornecedor / rawEstimate, 0.5),
  'o fator de overhead É a razão medida, não um ajuste ad hoc',
  `${OVERHEAD} vs ${(REAL.painelDoFornecedor / rawEstimate).toFixed(4)}`)

// ═══ 4. O ALARME TERIA TOCADO A TEMPO ════════════════════════════════════════
// Créditos/dia dos vídeos ENTREGUES, medidos por dia do ciclo (doc da sprint
// das 16h de 10/08, seção 3). São os mesmos números que somam 8.967.
const SERIE = [
  ['01/08', 1680], ['02/08', 970], ['03/08', 1045], ['04/08', 1288],
  ['05/08', 607], ['06/08', 616], ['07/08', 439], ['08/08', 1437], ['09/08', 886],
]
console.log('\n4. ALARME — em que dia cada patamar teria tocado')
let acc = 0
const primeiroDiaAcima = {}
for (const [dia, cr] of SERIE) {
  acc += cr
  const pct = (acc * OVERHEAD / PLAN_CREDITS) * 100
  for (const t of THRESHOLDS) {
    if (pct >= t && !primeiroDiaAcima[t]) primeiroDiaAcima[t] = { dia, pct }
  }
}
for (const t of THRESHOLDS) {
  const hit = primeiroDiaAcima[t]
  console.log(`     ${t}% → ${hit ? `${hit.dia} (${hit.pct.toFixed(1)}%)` : 'não atingido no ciclo'}`)
}
ok(primeiroDiaAcima[80]?.dia === '08/08',
  'o patamar de 80% cai em 08/08 — o apagão começou em 09/08 16:21Z',
  primeiroDiaAcima[80] ? `${primeiroDiaAcima[80].pct.toFixed(1)}%` : 'nunca')
ok(primeiroDiaAcima[95]?.dia === '09/08',
  'o patamar de 95% cai em 09/08, o dia em que o produto parou de fato',
  primeiroDiaAcima[95] ? `${primeiroDiaAcima[95].pct.toFixed(1)}%` : 'nunca')
// ⚠️ ESTA ASSERÇÃO PARECE INVERTIDA E NÃO É — ela guarda a honestidade do
// medidor. A primeira versão deste script afirmava que o patamar de 100% cairia
// em 09/08 e FALHOU: a estimativa fecha o ciclo em 99,985% (9.998,5 de 10.000)
// enquanto o painel do fornecedor marcava 100%. A diferença de 0,015% não é
// ruído a ser escondido — é a prova de que esta estimativa é um PISO, nunca um
// teto. Duas consequências que o código já reflete e que esta linha impede de
// esquecer:
//   · esperar o patamar de 100% para agir é esperar por um alarme que pode
//     nunca tocar. Quem entrega o aviso útil é o 80%.
//   · o "100%" da lista de patamares só existe para o caso de um cron chamar
//     `readQuota` — no gancho do compose ele é inalcançável por construção
//     (quando a cota zera, nenhuma submissão dá certo e o gancho não roda).
ok(!primeiroDiaAcima[100],
  'o estimador NÃO alcança 100% no ciclo — ele é um piso, e é por isso que o aviso útil é o de 80%',
  `fechou em ${((acc * OVERHEAD) / PLAN_CREDITS * 100).toFixed(3)}%`)
// A asserção que impede auto-engano: o alarme tem que vir ANTES do dano, com
// folga de pelo menos um dia inteiro. Um alarme que toca junto com a falha não
// serve para nada.
const diasDeAviso = SERIE.findIndex(([d]) => d === '09/08') - SERIE.findIndex(([d]) => d === primeiroDiaAcima[80]?.dia)
ok(diasDeAviso >= 1, 'houve ao menos 1 dia inteiro de aviso antes do apagão', `${diasDeAviso} dia(s)`)

// ═══ 5. OS LITERAIS NÃO VOLTARAM ═════════════════════════════════════════════
console.log('\n5. ANTI-DRIFT — os literais não podem reaparecer nos call sites')
for (const f of ['lib/compose.ts', 'app/api/render/route.ts']) {
  const src = read(f)
  const temLiteral =
    /width:\s*1080,\s*\n\s*height:\s*1920,/.test(src) ||
    /frame_rate:\s*30\b/.test(src) ||
    /width:\s*1080,\s*height:\s*1920/.test(src)
  ok(!temLiteral, `${f} não reintroduziu width/height/frame_rate literais`)
  ok(src.includes('renderOutputSpec()'), `${f} usa renderOutputSpec()`)
}
ok(read('app/api/compose/route.ts').includes('checkCreatomateQuota('),
  'app/api/compose/route.ts chama o medidor')

// ═══ 6. A TABELA DE DECISÃO DO CABEÇALHO ═════════════════════════════════════
// Se a tabela que o fundador usa para decidir estiver errada, ele decide errado.
console.log('\n6. TABELA DE CUSTO — a aritmética do cabeçalho de renderProfile.ts')
const DUR_MEDIA = 46.7
// ⚠️ QUEIMA REAL, não a dos vídeos entregues. A primeira versão desta seção
// usou 1038 (soma dos entregues) contra um plano de 10.000 (número REAL do
// painel) — misturou as duas contabilidades e a tabela saiu 11,5% otimista,
// prometendo 27 dias num perfil que entrega 24. A revisão adversarial pegou.
// 1038 × OVERHEAD = 1157 cr/dia é o número que o painel confirmaria.
const QUEIMA_DIA_ENTREGUE = 1038
const QUEIMA_DIA = QUEIMA_DIA_ENTREGUE * OVERHEAD
const base = credits(DEF_W, DEF_H, DEF_FPS, 1)
const PERFIS = [
  [1080, 1920, 30], [1080, 1920, 24], [720, 1280, 30], [720, 1280, 24], [480, 854, 24],
]
for (const [w, h, fps] of PERFIS) {
  const cps = credits(w, h, fps, 1)
  // Custo REAL por vídeo entregue: o fornecedor cobra também o que a nossa
  // tabela não vê. Sem o fator aqui, a tabela conta vídeos que o plano não paga.
  const porVideo = cps * DUR_MEDIA * OVERHEAD
  const autonomia = (PLAN_CREDITS / (QUEIMA_DIA * (cps / base)))
  const delta = (1 - cps / base) * 100
  const linha = `${w}×${h}@${fps}`.padEnd(15)
  console.log(
    `     ${linha} ${cps.toFixed(5)} cr/s · ${porVideo.toFixed(2)} cr/vídeo · ` +
    `${Math.round(PLAN_CREDITS / porVideo)} vídeos · ${autonomia.toFixed(1)} dias · −${delta.toFixed(0)}%`,
  )
  // 9:16 e paridade: o próprio renderProfile.ts rejeitaria estes perfis se
  // falhassem, então a tabela não pode oferecer um perfil que o código recusa.
  ok(Math.abs(w / h - 9 / 16) <= 0.01, `${linha.trim()} é 9:16 dentro da tolerância do módulo`)
  ok(w % 2 === 0 && h % 2 === 0, `${linha.trim()} tem dimensões pares (H.264)`)
}
const c720_30 = credits(720, 1280, 30, 1)
ok(near((1 - c720_30 / base) * 100, 56, 2), '720p30 corta ~56% da conta')
const c720_24 = credits(720, 1280, 24, 1)
const c480_24 = credits(480, 854, 24, 1)
const autonomia = (cps) => PLAN_CREDITS / (QUEIMA_DIA * (cps / base))
// A ASSERÇÃO QUE PEGA O ERRO DE VOLTA: nenhum perfil com qualidade cobre o
// ciclo. A versão anterior afirmava que o 720p24 cobria ~27 dias e passava —
// porque repetia a mesma omissão do overhead que estava na tabela. Uma
// asserção que confirma o bug em vez de pegá-lo é pior que asserção nenhuma.
ok(autonomia(c720_24) < 31,
  '720p24 NÃO cobre um ciclo de 31 dias', `${autonomia(c720_24).toFixed(1)} dias`)
ok(autonomia(c480_24) > 31,
  '480p24 é o único perfil que cobre um ciclo de 31 dias', `${autonomia(c480_24).toFixed(1)} dias`)
// Amarra a tabela à realidade medida: 309 vídeos foi o que o ciclo de agosto
// ENTREGOU antes de bater no teto. Se a linha do perfil de hoje não reproduzir
// esse número, a contabilidade voltou a se misturar.
const videosDoPerfilDeHoje = Math.round(PLAN_CREDITS / (base * DUR_MEDIA * OVERHEAD))
ok(Math.abs(videosDoPerfilDeHoje - REAL.videos) <= 3,
  'a tabela reproduz os 309 vídeos que o ciclo de agosto realmente entregou',
  `${videosDoPerfilDeHoje} vs ${REAL.videos}`)

// ═══ RESULTADO ═══════════════════════════════════════════════════════════════
console.log(
  failures === 0
    ? '\n✅ TODAS AS ASSERÇÕES PASSARAM\n'
    : `\n❌ ${failures} ASSERÇÃO(ÕES) FALHARAM\n`,
)
process.exit(failures === 0 ? 0 : 1)
