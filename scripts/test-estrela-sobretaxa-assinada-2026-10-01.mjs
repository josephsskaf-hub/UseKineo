// KINEO-ESTRELA-SOBRETAXA-ASSINADA-2026-10-01 — guardião da Tarefa 0 (pedido de 01/10): a "Estrela do filme" morria na
// montagem com "These AI clips do not match their signed generation". O claim cobra filme + sobretaxa (Kling 3 a 15 s:
// 38 + 6 = 44) e o /api/compose conferia só o preço do filme (38). Agora a rota do filme ASSINA a sobretaxa na resposta do
// claim e o compose soma ESSE número (sem recalcular, sem ler o navegador).
// Só readFileSync + transpile local (guardião com alias @/ não roda). As condições do compose são EXTRAÍDAS da rota e
// EXECUTADAS com o caso real — e com a base (linhas marcadas retiradas) para provar que o caso reproduz o defeito.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

let ok = 0, falhas = 0
function checa(nome, cond) { if (cond) { ok++; console.log('  ✓', nome) } else { falhas++; console.log('  ✗', nome) } }
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const MARCA = 'KINEO-ESTRELA-SOBRETAXA-ASSINADA-2026-10-01'
const semMarca = (s) => s.split('\n').filter((l) => !l.includes(MARCA)).join('\n')

const compose = ler('app/api/compose/route.ts')
const cinematic = ler('app/api/generate-video-cinematic/route.ts')
const estrelaSrc = ler('lib/estrelaDoFilme.ts')
const custoSrc = ler('lib/credits/engineCost.ts')
const launch = ler('lib/engineLaunch.ts')

// ── a régua pura, EXECUTADA ──
const cjs = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const carregar = (src, deps = {}) => { const module = { exports: {} }; new Function('module', 'exports', 'require', cjs(src))(module, module.exports, (n) => deps[n] ?? {}); return module.exports }
const imageRef = carregar(ler('lib/imageReference.ts'))
const estrela = carregar(estrelaSrc, { './imageReference': imageRef })
const custo = carregar(custoSrc)
const { sobretaxaAssinadaDaEstrela, ESTRELA_SOBRETAXA_CAMPO, estrelaSobretaxa } = estrela
const { creditCostForDuration } = custo

checa('E1 Kling 3 a 15 s custa 38 e a estrela soma 6 (o caso de 01/10: 38 + 6 = 44)',
  creditCostForDuration('cinematic_hollywood', true, 15) === 38 && estrelaSobretaxa('hollywood', 15) === 6)
checa('E2 o campo assinado se chama estrela_sobretaxa_cr', ESTRELA_SOBRETAXA_CAMPO === 'estrela_sobretaxa_cr')
checa('E3 sobretaxa assinada 6 num claim de 44 = 6', sobretaxaAssinadaDaEstrela({ estrela_sobretaxa_cr: 6 }, 44) === 6)
checa('E4 claim sem o campo (sem estrela ou antigo) = 0', sobretaxaAssinadaDaEstrela({ duration: 15 }, 38) === 0 && sobretaxaAssinadaDaEstrela(null, 38) === 0)
checa('E5 falha fechada: texto, fração, negativo, zero ou ≥ custo = 0',
  sobretaxaAssinadaDaEstrela({ estrela_sobretaxa_cr: '6' }, 44) === 0 &&
  sobretaxaAssinadaDaEstrela({ estrela_sobretaxa_cr: 6.5 }, 44) === 0 &&
  sobretaxaAssinadaDaEstrela({ estrela_sobretaxa_cr: -6 }, 44) === 0 &&
  sobretaxaAssinadaDaEstrela({ estrela_sobretaxa_cr: 0 }, 44) === 0 &&
  sobretaxaAssinadaDaEstrela({ estrela_sobretaxa_cr: 44 }, 44) === 0)

// ── a rota do filme ASSINA a sobretaxa que somou ao cost ──
checa('E6 o cost do filme continua = preço do motor + estrelaSobretaxaDe(duration), e a duração cobrada é a mesma',
  /const cost = creditCostForDuration\(costQuality, true, duration\) \+ estrelaSobretaxaDe\(duration\)/.test(cinematic) &&
  /const duracaoCobrada = duration \/\//.test(cinematic))
const publicar = (() => { const i = cinematic.indexOf('const publishCinematicResponse = async ('); const j = cinematic.indexOf('completeCinematicClaim({', i); return i > 0 && j > i ? cinematic.slice(i, j) : '' })()
checa('E7 publishCinematicResponse grava estrela_sobretaxa_cr = estrelaSobretaxaDe(duracaoCobrada) ANTES de completar o claim (só com estrela)',
  publicar.includes(`if (estrelaAtiva) response = { ...response, ${'estrela_sobretaxa_cr'}: estrelaSobretaxaDe(duracaoCobrada) } // ${MARCA}`))
checa('E8 o mesmo response vai ao cache e ao claim (a resposta assinada carrega o campo)', /cinematicSubmissionCache\.set\(cacheKey, \{[\s\S]*?\n\s+response,/.test(publicar))

// ── o compose: as duas conferências, EXTRAÍDAS e EXECUTADAS ──
checa('E9 o compose lê a sobretaxa do CLAIM assinado (resposta + custo), nunca do corpo',
  compose.includes(`const estrelaSobretaxaAssinada = sobretaxaAssinadaDaEstrela(cinematicBirthClaim.response, cinematicBirthClaim.creditCost) // ${MARCA}`) &&
  !/estrelaSobretaxaAssinada\s*=\s*[^=]*body/.test(compose) && (compose.match(/estrelaSobretaxaAssinada =(?!=)/g) || []).length === 1)

const fatiar = (src, ini, fim) => { const i = src.indexOf(ini); if (i < 0) return null; const j = src.indexOf(fim, i + ini.length); return j < 0 ? null : src.slice(i + ini.length, j) }
const condRecusa = (src) => fatiar(src, "      if (\n        !cinematicQualities.has(trustedQuality)", "\n      ) {\n        return NextResponse.json(\n          { error: 'These AI clips do not match their signed generation.' },")
const condDegrau = (src) => fatiar(src, '        if (\n', '\n        ) {\n          console.warn(`[compose] KINEO-DEGRAU')
const montar = (corpo, prefixo = '') => (corpo == null ? null : new Function('ctx', `const { cinematicQualities, trustedQuality, quality, isServiceFinish, cinematicBirthClaim, creditCostForDuration, duration, estrelaSobretaxaAssinada, inputsMatch, claimDuration } = ctx; return (${prefixo}${corpo}
)`))
const recusaNova = montar(condRecusa(compose), '!cinematicQualities.has(trustedQuality)')
const recusaBase = montar(condRecusa(semMarca(compose)), '!cinematicQualities.has(trustedQuality)')
const degrauNovo = montar(condDegrau(compose))
const degrauBase = montar(condDegrau(semMarca(compose)))
checa('E10 as duas condições foram encontradas na rota (nova e base)', !!recusaNova && !!recusaBase && !!degrauNovo && !!degrauBase)

const Q = new Set(['cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_sora', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni', 'cinematic_s25'])
const ctx = (o = {}) => ({ cinematicQualities: Q, trustedQuality: 'cinematic_hollywood', quality: 'cinematic_hollywood', isServiceFinish: false, cinematicBirthClaim: { creditCost: 44 }, creditCostForDuration, duration: 15, estrelaSobretaxaAssinada: 6, inputsMatch: true, claimDuration: null, ...o })
const roda = (f, c) => { try { return f(c) } catch (e) { return `ERRO ${e.message}` } }
if (recusaNova && recusaBase) {
  checa('E11 REPRODUZ o defeito: na base, claim de 44 (38 + 6) é recusado', roda(recusaBase, ctx()) === true)
  checa('E12 CONSERTO: com a sobretaxa assinada 6, o claim de 44 passa', roda(recusaNova, ctx()) === false)
  checa('E13 claim de 44 SEM sobretaxa assinada continua recusado (ninguém estica preço)', roda(recusaNova, ctx({ estrelaSobretaxaAssinada: 0 })) === true)
  checa('E14 sobretaxa assinada que não fecha a conta (5 ≠ 6) continua recusada', roda(recusaNova, ctx({ estrelaSobretaxaAssinada: 5 })) === true)
  checa('E15 com estrela, clipe trocado (inputsMatch=false) continua recusado', roda(recusaNova, ctx({ inputsMatch: false })) === true)
  checa('E16 filme sem estrela (38, sobretaxa 0) passa como sempre', roda(recusaNova, ctx({ cinematicBirthClaim: { creditCost: 38 }, estrelaSobretaxaAssinada: 0 })) === false)
  checa('E17 qualidade trocada continua recusada', roda(recusaNova, ctx({ quality: 'cinematic_ai' })) === true)
  checa('E18 resgate do servidor (isServiceFinish) segue aceitando o custo do claim', roda(recusaNova, ctx({ isServiceFinish: true })) === false)
  // Sem estrela, a regra nova e a base dão o MESMO veredito em toda a grade.
  let iguais = true
  for (const q of ['cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood']) for (const d of [15, 30, 35, 60, 90]) for (const c of [7, 15, 38, 44, 88, 100]) for (const sf of [false, true]) for (const im of [false, true]) {
    const k = ctx({ trustedQuality: q, quality: q, duration: d, cinematicBirthClaim: { creditCost: c }, isServiceFinish: sf, inputsMatch: im, estrelaSobretaxaAssinada: 0 })
    if (roda(recusaNova, k) !== roda(recusaBase, k)) iguais = false
  }
  checa('E19 sem estrela (sobretaxa 0) a regra nova decide IGUAL à base em 480 combinações', iguais)
}
if (degrauNovo && degrauBase) {
  const d = (o) => ctx({ duration: 35, claimDuration: 15, ...o })
  checa('E20 degrau + estrela: claim assinado em 15 s (38 + 6) e botão 35 s → compõe em 15 s', roda(degrauNovo, d()) === true && roda(degrauBase, d()) === false)
  checa('E21 degrau sem estrela (38) segue igual à base', roda(degrauNovo, d({ cinematicBirthClaim: { creditCost: 38 }, estrelaSobretaxaAssinada: 0 })) === true && roda(degrauBase, d({ cinematicBirthClaim: { creditCost: 38 }, estrelaSobretaxaAssinada: 0 })) === true)
  checa('E22 degrau: 44 sem sobretaxa assinada não desce; resgate do servidor não desce', roda(degrauNovo, d({ estrelaSobretaxaAssinada: 0 })) === false && roda(degrauNovo, d({ isServiceFinish: true })) === false)
  checa('E23 degrau nunca estica: claim maior que o botão não desce', roda(degrauNovo, d({ duration: 15, claimDuration: 35, cinematicBirthClaim: { creditCost: 94 } })) === false)
}

// ── trava 8.2: só linhas marcadas; retiradas, as rotas voltam à base byte a byte ──
const RAIZ = new URL('..', import.meta.url)
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) { try { if (!git(['show', `${ref}:app/api/compose/route.ts`]).includes(MARCA)) { BASE = ref; break } } catch { /* próximo */ } }
}
const base = (p) => { try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
checa(`E24 base de comparação disponível (${BASE ?? 'nenhuma'})`, Boolean(BASE))
if (BASE) {
  // Reancorado 03/10 (KINEO-GANCHO-1Q-2026-10-03): o /api/compose ganhou depois disto só linhas marcadas com o gancho escrito
  // (3 imports + 2 comentários + 2 chamadas withHookFirstFrame, depois do logo); elas saem em memória junto com as da estrela.
  // Reancorado 06/10 (KINEO-SEM-LEGENDA-2026-10-06): idem — o "sem legenda" entrou só com linhas marcadas (imports, decisão, corte e gravação da versão B).
  checa('E25 /api/compose sem as linhas marcadas = base, byte a byte', semMarca(compose).split('\n').filter((l) => !l.includes('KINEO-GANCHO-1Q-2026-10-03') && !l.includes('KINEO-SEM-LEGENDA-2026-10-06')).join('\n') === base('app/api/compose/route.ts'))
  // Reancorado 06/10 duas vezes: KINEO-S25-ABRE-2026-10-06 (portão pago do 2.5: só linhas marcadas) e KINEO-S25-NOTA95-2026-10-06
  // (passada de cenas do s25: linhas marcadas + as 2 linhas da base trocadas de propósito). Ambas saem em memória dos dois lados.
  // Reancorado 06/10 (KINEO-S25-NOTA95-2026-10-06 [TRAVA 8.2 — vai do fundador 06/10 'vai nota 95']): a rota do cinematic ganhou SÓ linhas
  // marcadas KINEO-S25-NOTA95-2026-10-06 e troca de propósito DUAS linhas da base (a escolha da foto de ambiente e a montagem do prompt da
  // cena, só no ramo s25); elas saem em memória dos dois lados — o resto continua byte a byte. Prova: scripts/test-s25-nota95-2026-10-06.mjs.
  const TROCADAS_S25 = ['          const inNarratorWorld = envSig.length > 8 && hs.prompt.toLowerCase().includes(envSig)', '          const scenePromptBruto = mouthPrefix + uprightPrefix + hs.prompt + eraSuffix + mouthSuffix + spectacleSuffix']
  // Reancorado 06/10 (KINEO-JUIZ-STILL-2026-10-06 [TRAVA 8.2 — vai do fundador 06/10 'vai juiz']): o juiz da foto-base entrou na rota SÓ com
  // linhas marcadas (import, o fecho antes do laço, a foto de ambiente e o still dentro da cena, o resumo depois do laço) e nenhuma linha da
  // base trocada; elas saem em memória dos dois lados. Prova: scripts/test-juiz-still-2026-10-06.mjs.
  // Reancorado 07/10 (KINEO-SAIDA-REGIAO-2026-10-07 [TRAVA 8.2 — "vai pra tudo" do fundador 07/10]): a saída da região entrou na rota SÓ com
  // linhas marcadas (admissão do filme grátis de 15 s, embrulho do gate de plano, recusa nova, releitura, trava depois do claim, evento de uso) e
  // nenhuma linha da base trocada; elas saem em memória dos dois lados. Prova: scripts/test-saida-regiao-2026-10-07.mjs.
  const semS25 = (s) => (s == null ? s : s.split('\n').filter((l) => !l.includes('KINEO-S25-NOTA95-2026-10-06') && !l.includes('KINEO-S25-ABRE-2026-10-06') && !l.includes('KINEO-JUIZ-STILL-2026-10-06') && !l.includes('KINEO-SAIDA-REGIAO-2026-10-07') && !TROCADAS_S25.includes(l)).join('\n'))
  checa('E26 /api/generate-video-cinematic sem as linhas marcadas = base, byte a byte', semS25(semMarca(cinematic)) === semS25(base('app/api/generate-video-cinematic/route.ts')))
}
checa('E27 a Estrela continua só com a casa (ESTRELA_PUBLIC = false)', /export const ESTRELA_PUBLIC = false\n/.test(launch))

console.log(`\ntest-estrela-sobretaxa-assinada-2026-10-01: ${ok} ok · ${falhas} falhas`)
process.exit(falhas ? 1 : 0)
