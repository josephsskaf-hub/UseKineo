// KINEO-FREE-CLEAN-LEAK-2026-09-07 — guardião do buraco GRANDE que a ordem do
// fundador ("liga marca d'água no trial") deixou aberto.
//
// O QUE FOI MEDIDO ANTES (30 dias, contas externas, `video_downloaded` cruzado
// com `videos.quality_mode` pelo `metadata.video_id`):
//
//   export_type | plan | has_paid | trial_status | quality_mode  | filmes | pessoas
//   clean       | free | false    | downgraded   | cinematic_ai  |   143  |   72
//   clean       | free | false    | active       | cinematic_ai  |    23  |   13
//
// A linha de cima é 5,5x a de baixo, e só a de baixo foi alcançada pelo
// conserto das 17:00 (`9f2822b0`). Quem terminou o trial, nunca pagou e
// renderiza Seedance levava o filme LIMPO — exatamente o que a assinatura
// vende. E 127 dessas pessoas VIRAM a caixa que pede dinheiro
// (`trial_post_video_offer_viewed`): a oferta chegou, ela é que não tinha o
// que oferecer.
//
// Este guardião NÃO conta texto. Ele EXTRAI as expressões que decidem e as
// AVALIA (memória `guardiao-contar-texto-nao-prova-condicao`), e cada mutante
// PROVA que foi escrito antes de exigir vermelho (memória
// `mutacao-precisa-provar-que-aplicou`). Estilo readFileSync de propósito:
// guardião com import `@/` morre antes da primeira verificação (memória
// `guardioes-com-alias-nao-rodam`).
import { readFileSync, writeFileSync } from 'node:fs'

const COMPOSE = 'app/api/compose/route.ts'
const UNLOCK = 'app/api/compose/unlock/route.ts'

let pass = 0
const fails = []
const ok = (name, cond) => { if (cond) pass++; else fails.push(name) }
const eq = (name, got, want) => ok(`${name} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, got === want)

// CRLF normalizado NA LEITURA: `.gitattributes` entrega estes arquivos com
// \r\n no Windows e âncora de duas linhas nunca casaria (memória
// `guardiao-crlf-falso-vermelho`).
const norm = (s) => s.split('\r\n').join('\n')
const read = (p) => norm(readFileSync(p, 'utf8'))
const compose = read(COMPOSE)
const unlock = read(UNLOCK)

// ── 1) A VARIÁVEL EXISTE NO ESCOPO QUE O BUILDER ALCANÇA ───────────────────
// O KINEO-TETO-HOTFIX de 20/08 derrubou TODO render em produção por usar
// `ent.*` direto no builder: `ent` mora dentro do bloco de entitlement. O
// padrão obrigatório é declarar fora, atribuir dentro, ler no builder.
const declAt = compose.indexOf('    let isFreePlanCinematic = false')
ok('isFreePlanCinematic e declarada no escopo externo', declAt > 0)
const entBlockAt = compose.indexOf("    if (quality === 'cinematic_ai' || quality === 'fast') {")
ok('bloco de entitlement existe', entBlockAt > 0)
ok('a declaracao vem ANTES do bloco de entitlement', declAt > 0 && entBlockAt > 0 && declAt < entBlockAt)

// ── 2) A ATRIBUIÇÃO MORA DENTRO DO RAMO cinematic_ai ───────────────────────
// Âncora pela ABERTURA do ramo: o que importa é onde a linha vive, não que
// ela exista em algum lugar do arquivo.
const aiBranchAt = compose.indexOf("      if (quality === 'cinematic_ai') {")
ok('ramo cinematic_ai existe', aiBranchAt > 0)
const aiBranch = compose.slice(aiBranchAt, aiBranchAt + 3000)
const aiAssign = /isFreePlanCinematic = ([^\n]+)/.exec(aiBranch)
ok('o ramo cinematic_ai atribui isFreePlanCinematic', Boolean(aiAssign))

// ── 3) TABELA-VERDADE DA ATRIBUIÇÃO, AVALIADA DE VERDADE ───────────────────
// A regra, escrita como fatos: conta grátis que nunca pagou sai MARCADA; quem
// paga (inclusive o trial de $1, que é `plan basic` + assinatura `trialing`)
// sai LIMPA. `!ent.isPaidAccount` é o predicado do cobrador, não uma cópia
// (memória `predicado-do-cobrador-nao-se-redigita`).
if (aiAssign) {
  const expr = aiAssign[1].replace(/\s*$/, '')
  const evalAssign = (isFreePlan, hasPaid, isPaidAccount) =>
    Function('isFreePlan', 'hasPaid', 'ent', `"use strict"; return (${expr})`)(isFreePlan, hasPaid, { isPaidAccount })
  eq('free, nunca pagou, trial vencido -> MARCA (o buraco de 72 pessoas)', evalAssign(true, false, false), true)
  eq('free, nunca pagou, trial ATIVO -> MARCA (ja era, agora por dois caminhos)', evalAssign(true, false, false), true)
  eq('trial de $1: conta paga -> LIMPO', evalAssign(true, false, true), false)
  eq('comprador de pacote (free + has_paid) -> LIMPO', evalAssign(true, true, false), false)
  eq('assinante -> LIMPO', evalAssign(false, false, true), false)
  eq('plano pago sem flag de conta paga -> LIMPO', evalAssign(false, false, false), false)
}

// ── 4) A DECISÃO FINAL LÊ O TERMO NOVO, E OS ANTIGOS CONTINUAM LÁ ──────────
const wmAssign = /watermarkApplied =\n([\s\S]{0,400}?)\n    let source: Record<string, unknown>/.exec(compose)
ok('watermarkApplied e atribuido antes do builder', Boolean(wmAssign))
if (wmAssign) {
  const expr = wmAssign[1].trim()
  const evalWm = (fast, trial, forced, cine) => {
    const src = expr.replace(/FORCE_WATERMARK_EMAILS\.has\([^)]*\)[^\n]*/g, 'FORCED')
    return Function('isFreePlanFast', 'isTrialRender', 'FORCED', 'isFreePlanCinematic',
      `"use strict"; return (${src})`)(fast, trial, forced, cine)
  }
  eq('watermark: o termo NOVO sozinho ja marca', evalWm(false, false, false, true), true)
  eq('watermark: free fast (termo antigo intacto)', evalWm(true, false, false, false), true)
  eq('watermark: trial (termo antigo intacto)', evalWm(false, true, false, false), true)
  eq('watermark: conta do #434 (termo antigo intacto)', evalWm(false, false, true, false), true)
  eq('watermark: pagante continua LIMPO', evalWm(false, false, false, false), false)
}

// ── 5) O PAR OBRIGATÓRIO: O QUE EU MARCO, A CASA SABE DESMARCAR ────────────
// Marcar sem saber desmarcar seria vender um "export limpo" que a casa não
// entrega — o pecado que o PEDIDOS registra para os motores premium. Aqui não
// há caso novo: /api/compose/unlock aceita `cinematic_ai` desde `9f2822b0`.
ok('unlock aceita cinematic_ai no rebuild', /REBUILD_QUALITIES = new Set\(\[[^\]]*'cinematic_ai'[^\]]*\]\)/.test(unlock))
ok('unlock monta com a quality do filme, nao com fast cravado', unlock.includes('        quality: rebuildQuality,'))
ok('unlock continua entregando limpo', unlock.includes('        watermark: false,'))
ok('unlock continua custando 0 credito', unlock.includes('const intendedCost = 0'))
// Premium continua FORA de propósito (narração por cena não se remonta pelo
// builder clássico) — esta entrega não os inclui e o guardião prova isso.
for (const q of ['cinematic_kling', 'cinematic_veo', 'cinematic_h3', 'cinematic_omni', 'cinematic_s25']) {
  ok(`premium ${q} continua fora do rebuild`, !new RegExp(`REBUILD_QUALITIES = new Set\\(\\[[^\\]]*'${q}'`).test(unlock))
}

// ── 6) O QUE NÃO PODE TER MUDADO — "só o booleano" ─────────────────────────
// Preço, crédito, régua, clamp, cota e end card ficam onde estavam. O termo
// novo aparece UMA vez fora da própria declaração/atribuição: em
// `watermarkApplied`. Se aparecer noutro lugar, alguém o pendurou num gate de
// dinheiro.
const usos = (compose.match(/isFreePlanCinematic/g) || []).length
const usosEmComentario = (compose.match(/\/\/[^\n]*isFreePlanCinematic/g) || []).length
eq('isFreePlanCinematic aparece 3x em codigo (declara, atribui, le)', usos - usosEmComentario, 3)
ok('o custo do cinematic_ai nao mudou', compose.includes("const requiredCredits = creditCostFor('cinematic_ai', true)"))
ok('o preco do render nao mudou', compose.includes("creditCostForDuration(quality, quality === 'fast' ? !isFreePlanFast : false, duration)"))
ok('isFreePlanFast nao mudou', compose.includes('isFreePlanFast = isFreePlan && !hasPaid && !ent.isTrial'))
ok('isTrialRender do ramo cinematic_ai nao mudou', aiBranch.includes('isTrialRender = ent.isTrial && !ent.isPaidAccount'))
ok('o end card continua so do free fast', compose.includes('          withEndCard = true'))
ok('o end card NAO foi pendurado no termo novo', !/withEndCard = [^\n]*isFreePlanCinematic/.test(compose))
ok('o gate de acesso ao cinematic_ai nao mudou', compose.includes('      const hasPaidCreditAccess ='))

// ── 7) A RESPOSTA CONTINUA CONTANDO A VERDADE PARA A TELA ──────────────────
// Sem isto a tela cai no fallback e volta a adivinhar — e é o fallback que
// rotulava 'clean' um download com marca.
ok('a resposta devolve watermark', compose.includes('      watermark: watermarkApplied,'))
ok('o builder le watermarkApplied', compose.includes('        watermark: watermarkApplied,'))

// ── 8) MUTANTES ────────────────────────────────────────────────────────────
// Cada um PROVA que foi escrito (conteúdo antes != depois) antes de exigir
// vermelho. Mutante que não aplicou devolve verde e se lê como guardião
// resistindo — é assim que um guardião mente.
const MUTANTES = [
  ['apagar o termo novo da decisao final', COMPOSE,
    '      isFreePlanCinematic ||\n', ''],
  ['trocar a atribuicao por false fixo (texto do comentario intacto)', COMPOSE,
    'isFreePlanCinematic = isFreePlan && !hasPaid && !ent.isPaidAccount',
    'isFreePlanCinematic = false'],
  ['trocar && por || na atribuicao (marcaria ate assinante)', COMPOSE,
    'isFreePlanCinematic = isFreePlan && !hasPaid && !ent.isPaidAccount',
    'isFreePlanCinematic = isFreePlan || !hasPaid || !ent.isPaidAccount'],
  ['esquecer o comprador do trial de $1', COMPOSE,
    'isFreePlanCinematic = isFreePlan && !hasPaid && !ent.isPaidAccount',
    'isFreePlanCinematic = isFreePlan && !hasPaid'],
  ['pendurar o end card no termo novo', COMPOSE,
    '          withEndCard = true',
    '          withEndCard = true || isFreePlanCinematic'],
  ['tirar o cinematic_ai do rebuild (marcar sem saber desmarcar)', UNLOCK,
    "const REBUILD_QUALITIES = new Set(['fast', 'cinematic_ai'])",
    "const REBUILD_QUALITIES = new Set(['fast'])"],
]

const originais = new Map([[COMPOSE, readFileSync(COMPOSE, 'utf8')], [UNLOCK, readFileSync(UNLOCK, 'utf8')]])
const rodarSozinho = process.argv[1].endsWith('test-free-clean-leak.mjs') && !process.env.KINEO_NO_MUTANTS

if (rodarSozinho) {
  const { execFileSync } = await import('node:child_process')
  for (const [nome, arquivo, de, para] of MUTANTES) {
    const antes = originais.get(arquivo)
    // O `de` foi escrito com \n; o arquivo em disco pode estar com \r\n.
    const eol = antes.includes('\r\n') ? '\r\n' : '\n'
    const alvo = eol === '\r\n' ? de.split('\n').join('\r\n') : de
    const sub = eol === '\r\n' ? para.split('\n').join('\r\n') : para
    const depois = antes.replace(alvo, sub)
    if (depois === antes) { fails.push(`mutante NAO ANCOROU: ${nome}`); continue }
    let vermelho = false
    try {
      writeFileSync(arquivo, depois)
      // Prova que a mutação chegou ao disco antes de julgar o resultado.
      const relido = readFileSync(arquivo, 'utf8')
      if (relido === antes) { fails.push(`mutante NAO FOI ESCRITO: ${nome}`); continue }
      try {
        execFileSync(process.execPath, [process.argv[1]], {
          env: { ...process.env, KINEO_NO_MUTANTS: '1' }, stdio: 'pipe',
        })
      } catch { vermelho = true }
    } finally {
      writeFileSync(arquivo, antes)
    }
    ok(`mutante reprovado: ${nome}`, vermelho)
  }
}

console.log(`\n[test-free-clean-leak] ${pass}/${pass + fails.length} verificacoes`)
if (fails.length) {
  console.error('\nFALHOU:')
  for (const f of fails) console.error('  x ' + f)
  process.exit(1)
}
console.log('OK - o filme gratuito sai marcado no Seedance, e a casa sabe desmarca-lo.')
