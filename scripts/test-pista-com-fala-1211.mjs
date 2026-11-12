// KINEO-PISTA-COM-FALA-1211 — guardião do plano gravado no cinematic_dispatch_result (lib/cinematic/planoGravado.ts + a rota).
// O caso real (claim do e9418905, 11/11, Kling 4 grátis): o `submitted_prompts` de 240 caracteres guardava só moldura
// ("Film visual medium: … Named character in this shot: Argentinosaurus, a person …") — a ação da cena ("ten yellow school
// buses lined up beside it") começava depois do caractere 240 e nenhum revisor a via. Agora cada cena grava o prompt FINAL
// (até 700), a pista e o modelo. O que este guardião prova:
//   (1) a lib: corte em 700 code points, teto de 12 cenas, entrada estranha vira null e nada lança;
//   (2) a ação do plano real cabe no registro novo e NÃO cabia nos 240 de antes;
//   (3) a rota: o finalizador põe `scene_plan` no evento dentro do try da telemetria; os 5 pontos de despacho (clássico,
//       Kling 4 grátis, Kling 4 pago, 3 do hollywood) anotam; o Kling 4 grátis anota o multi_prompt do MESMO montador do POST;
//   (4) o prompt do cliente não muda: diante de origin/main a rota só GANHA linhas, e toda linha nova é desta entrega;
//   (5) mutante: a lib cortando em 240 reprova (2).
// Sem rede, sem banco, sem fornecedor. Rodar: npx tsx scripts/test-pista-com-fala-1211.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import * as P from '../lib/cinematic/planoGravado.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }
const MARCA = 'KINEO-PISTA-COM-FALA-1211'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')

// o plano 3 do e9418905 como foi ao Kling 4 (scene_fal_inputs[0].multi_prompt[2], com o código de hoje — ensaio de 12/11)
const PLANO_REAL = "3D animated film. Identity: the dinosaur, a dinosaur with scaly skin, a long heavy tail, clawed feet and a reptilian head; drawn in the film's own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors. A large Argentinosaurus standing in a prehistoric environment, with a visual comparison to ten yellow school buses lined up beside it, no readable text, letters, numbers, labels or signage Mouth closed, no speaking."

function bateria(L, rotulo) {
  let f = 0
  const chk = (c, m) => { if (!c) f++; if (rotulo === 'producao') ok(c, m) }
  const longo = 'x'.repeat(900)
  const c1 = L.cenaGravada({ i: 0, engine: 'kling/v4/image-to-video', hint: 'dinosaur animation', prompt: longo })
  chk(c1 && Array.from(c1.prompt).length === 700 && c1.prompt_chars === 900, '(1) prompt cortado em 700 code points, o tamanho real fica em prompt_chars')
  const emoji = '🦕'.repeat(710)
  const c2 = L.cenaGravada({ i: 1, prompt: emoji })
  chk(c2 && Array.from(c2.prompt).length === 700 && !c2.prompt.endsWith('\ud83e'), '(1) o corte conta code points (nunca parte um emoji)')
  chk(L.cenaGravada({ i: 0, prompt: 42 }) === null && L.cenaGravada({ i: -1, prompt: 'a' }) === null && L.cenaGravada({ i: 0.5, prompt: 'a' }) === null && L.cenaGravada({ i: 0, prompt: '  ' }) === null, '(1) entrada estranha vira null')
  let lancou = false
  try { L.anotarCena(undefined, { i: 0, prompt: 'a' }); L.anotarCena(null, { i: 0, prompt: 'a' }); L.anotarCena([], null); L.planoParaOEvento(undefined); L.planoParaOEvento([null, {}]) } catch { lancou = true }
  chk(!lancou, '(1) nada lança com entrada quebrada (telemetria nunca derruba render)')
  const vetor = []
  for (let i = 0; i < 15; i++) L.anotarCena(vetor, { i, engine: 'm', hint: 'h', prompt: `cena ${i}` })
  const ev = L.planoParaOEvento(vetor)
  chk(ev && ev.scenes.length === 12 && ev.total === 15 && ev.scenes[11].i === 11 && ev.version === L.PLANO_GRAVADO_VERSAO, '(1) teto de 12 cenas no evento, total real ao lado')
  chk(L.planoParaOEvento([]) === null, '(1) nada enviado = null (evento antigo e novo leem igual)')
  const hint = L.cenaGravada({ i: 0, hint: 'h'.repeat(300), prompt: 'a' })
  chk(hint && Array.from(hint.hint).length === 160, '(1) pista curta: até 160')
  const real = []
  L.anotarCena(real, { i: 2, engine: 'kling/v4/image-to-video', hint: 'dinosaur animation', prompt: PLANO_REAL })
  const evr = L.planoParaOEvento(real)
  chk(evr && evr.scenes[0].prompt.includes('ten yellow school buses') && evr.scenes[0].hint === 'dinosaur animation', '(2) a ação do plano real ("ten yellow school buses") está no registro novo, com a pista de onde nasceu')
  chk(!PLANO_REAL.slice(0, 240).includes('school buses'), '(2) e NÃO cabia nos 240 do submitted_prompts de antes')
  chk(evr && evr.scenes[0].prompt.endsWith('Mouth closed, no speaking.'), '(2) o registro guarda a cauda das proibições inteira (prompt ≤ 700 não é cortado)')
  return f
}

console.log('── lib ──')
bateria(P, 'producao')

console.log('── rota ──')
const rota = lf(readFileSync(ROTA, 'utf8'))
const fin = rota.slice(rota.indexOf('async function finalizarDespacho'), rota.indexOf('// ═══ KINEO-FAL-SALDO-ALERTA-2026-09-28 — O ALARME DE SALDO MORA AQUI'))
const tryIni = fin.indexOf('try {'), tryFim = fin.indexOf('} catch (e) {')
const posPlano = fin.indexOf('scene_plan: planoParaOEvento(ctx.planoDasCenas)')
ok(posPlano > tryIni && posPlano < tryFim, '(3) o finalizador põe scene_plan no evento DENTRO do try da telemetria')
ok(/planoDasCenas: \[\], \/\/ KINEO-PISTA-COM-FALA-1211/.test(rota), '(3) o contexto de despacho nasce com o vetor vazio')
const anotas = rota.split('anotarCena(').length - 1
ok(anotas >= 6, `(3) os pontos de despacho anotam (${anotas} chamadas: clássico, Kling 4 grátis, Kling 4 pago, 3 do hollywood)`)
ok(/classicSceneInputs\[sceneIndex\]\?\.prompt; anotarCena\(c\.planoDasCenas/.test(rota), '(3) clássico (H3 Turbo da reserva grátis, Kling 2.5, Veo): o prompt do input que a fal recebeu')
ok(/const e = kling4EnvioDoFilme\(\)\s+const tiros = buildKling4TrialInput\(e\.prompts, e\.approvedStills, e\.timing\)\.input\.multi_prompt/.test(rota), '(3) Kling 4 grátis: o multi_prompt do MESMO montador do POST')
const blocoK4 = rota.slice(rota.indexOf('try { // KINEO-PISTA-COM-FALA-1211 — o multi_prompt EXATO'))
ok(/^try \{[\s\S]*?\} catch \{ \/\* telemetria nunca derruba o filme \*\/ \}/.test(blocoK4), '(3) Kling 4 grátis: a anotação mora num try/catch próprio')
const hollywood = [...rota.matchAll(/ctxDespacho\(\)\.submittedPrompts\[hs\.index - 1\] = submittedPrompt\.slice\(0, 240\)[^\n]*\n\s*anotarCena\(ctxDespacho\(\)\.planoDasCenas, \{ i: hs\.index - 1/g)].length
ok(hollywood === 3, `(3) hollywood: os 3 pontos que gravam submitted_prompts também anotam (${hollywood}/3)`)

// (4) o prompt do cliente não muda: diante de origin/main, a rota só GANHA linhas, todas desta entrega (ou dentro do bloco dela)
let base = null
try { base = lf(execFileSync('git', ['show', `origin/main:${ROTA}`], { encoding: 'utf8', maxBuffer: 64 << 20 })) } catch { base = null }
if (base && !base.includes(MARCA)) {
  const antes = base.split('\n'), depois = rota.split('\n')
  // subsequência: toda linha de origin/main continua, na mesma ordem
  let j = 0
  const novas = []
  for (const linha of depois) { if (j < antes.length && linha === antes[j]) j++; else novas.push(linha) }
  ok(j === antes.length, `(4) nenhuma linha de origin/main some ou muda na rota (${antes.length - j} faltando)`)
  const fora = novas.filter((l) => !l.includes(MARCA) && !/^\s*(const e = kling4EnvioDoFilme\(\)|const tiros = buildKling4TrialInput|tiros\.forEach\(\(t, i\) => anotarCena|\} catch \{ \/\* telemetria nunca derruba o filme \*\/ \})/.test(l))
  ok(fora.length === 0, `(4) toda linha nova da rota é desta entrega (${fora.length} fora: ${fora.slice(0, 2).join(' | ').slice(0, 160)})`)
  ok(!novas.some((l) => /\b(prompt|aiPrompt|description|stockSearchQuery)\s*=(?!=)/.test(l.replace(/prompt: /g, ''))), '(4) nenhuma linha nova atribui prompt/descrição/pista de cena: o que vai à fal é byte a byte o de antes')
} else console.log('  (4) pulado: origin/main indisponível ou já contém esta entrega')

// (5) mutante: a lib cortando em 240 (o registro de antes) tem de reprovar a bateria
console.log('── mutante ──')
const src = readFileSync('lib/cinematic/planoGravado.ts', 'utf8')
const mut = src.replace('export const PLANO_GRAVADO_MAX_PROMPT = 700', 'export const PLANO_GRAVADO_MAX_PROMPT = 240')
ok(mut !== src, '(5) mutante aplicado')
const tmp = resolve('lib/cinematic/.planoGravado.mutante-1211.ts')
writeFileSync(tmp, mut)
try {
  const M = await import(pathToFileURL(tmp).href)
  const f = bateria(M, 'mutante')
  ok(f > 0, `(5) mutante "corta em 240" reprova (${f} verificação(ões) vermelha(s))`)
} finally { unlinkSync(tmp) }

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
