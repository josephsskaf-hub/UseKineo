// KINEO-FICHA-REPROVADA-NO-HOJE-2011 [CEO 20/11, prova C filme 3 (1c770cb7 / 76c4c5c4)] — guardião sem rede.
// O filme 3 caiu no caminho de hoje (descrição que não coube) e levou ao motor "Identity: Daniel… origin: an American woman" nos planos 3 e 4, embora o juiz de
// ANTES das imagens (juiz_plano_ficha_antes, 02:45:08) já tivesse reprovado a_ficha. Executa a lib REAL nos planos que FORAM à fal e confere a ligação na rota.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let falhas = 0
const ok = (c, n) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const LIB = 'lib/cinematic/fichaReprovada1911.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const ler = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
// 76c4c5c4, planos 3 e 4 do cinematic_dispatch_result (o que foi à fal), e o plano 1 (a Emily, sem ficha nossa)
const P1 = 'Photoreal film. Wide shot. Period setting: 1997 (1990s). Everyone shown has the natural features of American people. Visible: Emily, a woman in her thirties with long wavy hair, a natural face, wearing period-accurate 1990s clothing, origin: an American woman. Main subject of this shot: snowfall New York City street, shown in motion. no readable text, letters, numbers, labels or signage. Every sign is a plain block of colour. Mouth closed, no speaking.'
const P3 = 'Photoreal film. Period setting: 1997 (1990s). Identity: Daniel, exactly as the author wrote: "photos show Daniel"; appearance anchors: 20-30, medium length, wavy dark brown, clean-shaven, light skin, wearing white top, black cropped blazer; origin: an American woman. Cast: a man and a woman, both adults. A close-up of a photo strip held by Emily, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'
const P4 = 'Photoreal film. Period setting: 1997 (1990s). Identity: Daniel, exactly as the author wrote: "photos show Daniel"; appearance anchors: 20-30, medium length, wavy dark brown, clean-shaven, light skin, wearing white top, black cropped blazer; origin: an American woman. Cast: a man and a woman, both adults. A close-up of the last photo in the strip, showing Sarah, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'
const ANTES = { status: 'JUDGED', falhas: ['a_ficha'], nota: 75 } // o juiz_plano_ficha_antes das 02:45:08

async function provas(over = {}) {
  const e = []
  const no = (ruim, msg) => { if (ruim) e.push(msg) }
  let F
  try { F = createOfflineLoader({ source: (rel, src) => over[rel] ?? src })('@/' + LIB) } catch (x) { return [`lib não carrega: ${x.message}`] }
  const rota = over[ROTA] ?? ler(ROTA)
  no(F.FICHA_REPROVADA_NO_HOJE_2011 !== 'internal' || !F.fichaReprovadaLigada('internal', true) || F.fichaReprovadaLigada('internal', false), "A0 'internal': só a conta exata do ensaio")
  // a lib, nos planos reais do filme 3, com o veredito do juiz de antes
  { const r = await F.fichaQueVaiAoMotor({ veredito: ANTES, prompts: [P1, P3, P4], julgarDeNovo: async () => ANTES })
    no(r.relato.acao !== 'sem_ficha' || /Identity:|Daniel, exactly|appearance anchors|an American woman\. Cast/.test(r.prompts[1] + r.prompts[2]) || !r.prompts[1].includes('A close-up of a photo strip held by Emily') || !r.prompts[2].includes('showing Sarah'), `F1 reprovada de novo: a identidade do Daniel sai dos planos 3 e 4; a ação fica (${r.prompts[1].slice(0, 160)})`) }
  { const r = await F.fichaQueVaiAoMotor({ veredito: ANTES, prompts: [P1, P3, P4], julgarDeNovo: async () => ({ status: 'JUDGED', falhas: [] }) })
    no(r.relato.acao !== 'sem_ancoras' || /appearance anchors|origin: an American woman/.test(r.prompts[1]) || !r.prompts[1].includes('Identity: Daniel, exactly as the author wrote: "photos show Daniel".'), `F2 aprovada sem as âncoras: vai a ficha do autor, sem a folha e a origem (${r.prompts[1].slice(0, 160)})`) }
  { const r = await F.fichaQueVaiAoMotor({ veredito: { status: 'JUDGED', falhas: [] }, prompts: [P1, P3, P4], julgarDeNovo: async () => { throw new Error('não devia') } })
    no(r.relato.acao !== 'nada' || r.prompts[1] !== P3, 'F3 juiz de antes sem a_ficha: byte a byte') }
  // a rota
  const iFlag = rota.indexOf('    const fichaJaAgiu1911 = { v: false }'), iA2 = rota.indexOf("    if (kling4DescritorForte1911 && descricoesDasSecoesK4 && parsedScript.segments.every("), iMarca = rota.indexOf('          fichaJaAgiu1911.v = true'), iA2Ficha = rota.indexOf('          aplicarCenas1911(fr1911.prompts)\n')
  const iHoje = rota.indexOf('    if (kling4TrialCandidate && !fichaJaAgiu1911.v && fichaReprovadaLigada(FICHA_REPROVADA_NO_HOJE_2011, isDryRunAccount(user.email)) && fichaReprovada(vereditoAntes1311)) {'), iPago = rota.indexOf('kling4Trial = await orchestrateKling4Trial({')
  no(!(iFlag > 0 && iA2 > iFlag && iMarca > iA2Ficha && iA2Ficha > iA2 && iHoje > iMarca && iPago > iHoje), 'R1 a marca nasce antes do A2, vira true quando a ficha age lá dentro, e o passo de fora roda DEPOIS do A2 e ANTES do POST pago')
  no(!rota.includes('const frHoje2011 = await fichaQueVaiAoMotor({ veredito: vereditoAntes1311, prompts: [...kling4Prompts],') || !rota.includes('        frHoje2011.prompts.forEach((p, i) => { kling4Prompts[i] = p })\n'), 'R2 o veredito é o do juiz de ANTES das imagens; o resultado volta às cenas do Kling 4')
  no(!rota.includes("        if (frHoje2011.relato.acao === 'sem_ficha') kling4Timing.fixedCharacter = referenciaSemFicha(kling4Timing.fixedCharacter)"), 'R3 sem a ficha, a referência do personagem fixo perde o que vem da ficha')
  no(!rota.includes("metadata: { generation_id: generationId, ...frHoje2011.relato, caminho: rastro1911?.caminho ?? 'hoje', veredito_de: 'juiz_plano_ficha_antes', ...limiteDaImagem({ acao: frHoje2011.relato.acao, imagens: kling4ApprovedStills, referencia: !!kling4Timing.fixedCharacter }) } })"), 'R4 o evento diz de onde veio o veredito e o caminho, só contagens (nunca texto)')
  no(!rota.includes("import { FICHA_REPROVADA_NO_HOJE_2011, fichaReprovada } from '@/lib/cinematic/fichaReprovada1911'"), 'R5 o interruptor próprio')
  return e
}

const base = await provas()
ok(base.length === 0, `provas com os planos reais do filme 3${base.length ? ': ' + base.join(' · ') : ''}`)
const MUT = [
  ['público', LIB, (s) => s.replace("export const FICHA_REPROVADA_NO_HOJE_2011: ModoFichaReprovada1911 = 'internal'", "export const FICHA_REPROVADA_NO_HOJE_2011: ModoFichaReprovada1911 = 'public'")],
  ['rota: régua larga', ROTA, (s) => s.replace('fichaReprovadaLigada(FICHA_REPROVADA_NO_HOJE_2011, isDryRunAccount(user.email))', 'fichaReprovadaLigada(FICHA_REPROVADA_NO_HOJE_2011, true)')],
  ['rota: roda duas vezes (sem a marca)', ROTA, (s) => s.replace('if (kling4TrialCandidate && !fichaJaAgiu1911.v && fichaReprovadaLigada(FICHA_REPROVADA_NO_HOJE_2011', 'if (kling4TrialCandidate && fichaReprovadaLigada(FICHA_REPROVADA_NO_HOJE_2011')],
  ['rota: a marca nunca vira true', ROTA, (s) => s.replace('          fichaJaAgiu1911.v = true // KINEO-FICHA-REPROVADA-NO-HOJE-2011\n', '')],
  ['rota: sem o juiz de antes (roda sempre)', ROTA, (s) => s.replace(' && fichaReprovada(vereditoAntes1311)) {', ') {')],
  ['rota: o resultado não volta às cenas', ROTA, (s) => s.replace('        frHoje2011.prompts.forEach((p, i) => { kling4Prompts[i] = p })\n', '')],
  ['rota: a referência mantém a ficha', ROTA, (s) => s.replace("        if (frHoje2011.relato.acao === 'sem_ficha') kling4Timing.fixedCharacter = referenciaSemFicha(kling4Timing.fixedCharacter)\n", '')],
  ['rota: evento sem a origem do veredito', ROTA, (s) => s.replace(" veredito_de: 'juiz_plano_ficha_antes',", '')],
  ['rota: depois do POST pago', ROTA, (s) => { const i = s.indexOf('    // KINEO-FICHA-REPROVADA-NO-HOJE-2011 [CEO 20/11, prova C filme 3]'), j = s.indexOf('    let kling4Trial: Kling4TrialResult | null = null\n'); if (i < 0 || j < 0) return s; const bloco = s.slice(i, j); const t = s.slice(0, i) + s.slice(j); const k = t.indexOf('kling4Trial = await orchestrateKling4Trial({'); const fim = t.indexOf('\n', t.indexOf('\n', k) + 1); return t.slice(0, fim + 1) + bloco + t.slice(fim + 1) }],
]
for (const [nome, arq, f] of MUT) {
  const o = ler(arq), m = f(o)
  if (m === o) { ok(false, `mutante "${nome}" NÃO APLICOU`); continue }
  const e = await provas({ [arq]: m })
  ok(e.length > 0, `mutante "${nome}" fica vermelho (${e.length} erro(s))`)
}
console.log(falhas ? `${falhas} falha(s)` : `PASS test-ficha-reprovada-no-hoje-2011 (planos reais do filme 3; ${MUT.length} mutantes)`)
process.exit(falhas ? 1 : 0)
