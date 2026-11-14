// KINEO-FICHA-ANTES-DO-RENDER-1311 [CEO 13/11, caso da Maya 28f057bc] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com os 3 prompts REAIS do filme (cinematic_submission_claim.response.kling4_trial.scene_plan):
//   (A) o plano que o juiz marca com a ficha contradizendo o pedido tem a ordem do protagonista refeita com a pessoa da ideia: "the mother…
//       long, straight hair" some do plano INTEIRO (inclusive as frases que vazaram depois da ação) e fica "curly black hair"; a ação fica;
//   (B) sem pessoa da ideia: a ordem sai; o plano que o juiz não marcou fica igual; juiz ausente/UNVERIFIED/sem a_ficha = byte a byte;
//   (C) o texto que vai ao Kling 4 (promptDaCenaKling4) deixa de levar a ficha errada;
//   (D) a rota chama o juiz ANTES das imagens-chave e do 1º POST, só no Kling 4 grátis, atrás do interruptor, e grava o evento;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/fichaAntesDoRender1311.ts'
const globals = { AbortController, setTimeout, clearTimeout }
const carrega = (mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === ARQ ? mutar(text) : text) })

// os 3 prompts do filme 28f057bc, como o claim gravou
const LOOK = 'stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic'
const MAE = `the mother, a middle-aged woman with a warm demeanor, standing at an average height. She has smooth, caramel-toned skin and long, straight hair. Her eyes are deep brown, reflecting kindness. She wears a flowing, floral-patterned dress in vibrant colors, with a distinctive beaded necklace; origin: a Martiniquais woman, with the natural features of Martiniquais people; drawn in the film's own look (${LOOK}), the same character design in every scene`
const VAZOU = `She has smooth, caramel-toned skin and long, straight hair. Her eyes are deep brown, reflecting kindness. She wears a flowing, floral-patterned dress in vibrant colors, with a distinctive beaded necklace; origin: a Martiniquais woman, with the natural features of Martiniquais people; drawn in the film's own look (${LOOK}), the same character design in every scene.`
const MAYA = 'a beautiful 24-year-old Martinican woman, with curly black hair'
const cauda = `, same 3D animated art style in every scene, same character design and palette, consistent lighting, never mix with live-action or photorealism Setting as the customer asked: the back of the house. The same main character appears in this scene, consistent design: ${MAYA}.`
const ordem = `The only person in this shot is the same main character (${MAE}); any other person described below is replaced by this same character. `
const ACOES = [
  "Aerial view of Maya walking on a sunlit path towards her grandmother's house in Martinique.",
  'A close-up of the old Creole house, its wooden shutters slightly ajar, vibrant green vines cascading down, enveloping the weathered walls.',
  "A low-angle shot of a locked door, a shadowy figure's hand knocking softly; the air thick with anticipation as a whisper echoes, 'Enfin, Maya... Je t'attendais.'.",
]
const PROMPTS = ACOES.map((a, i) => `Film visual medium: ${LOOK}. ${ordem}${i === 0 ? 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. ' : ''}${LOOK}. ${a} ${VAZOU}${cauda}`)
const veredito = (over = {}) => ({ status: 'JUDGED', reprovado: true, falhas: ['a_ficha'], nota: 75, ms: 6809, planos: [{ plano: 1, a: 'contradiz', b: 'nao', c: 'nao' }, { plano: 2, a: 'contradiz', b: 'nao', c: 'nao' }, { plano: 3, a: 'bate', b: 'nao', c: 'nao' }], ...over })

function provas(L) {
  const erros = []
  const m = L(ARQ), c = L('lib/cinematic/cenaKling4.ts'), st = L('lib/cinematic/sceneStyle.ts')
  if (m.fichaDaOrdem(PROMPTS[0]) !== MAE) erros.push('fixture: a ordem não foi lida')
  // (A) com a pessoa da ideia
  const r = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito(), pessoaDaIdeia: MAYA })
  for (const i of [0, 1]) {
    const p = r.prompts[i]
    if (/the mother|straight hair|middle-aged|caramel-toned/.test(p)) erros.push(`A plano ${i + 1} ainda leva a ficha reprovada`)
    if (!p.includes(`The only person in this shot is the same main character (${MAYA})`) || !p.includes('curly black hair')) erros.push(`A plano ${i + 1} sem a pessoa da ideia na ordem`)
    if (!p.includes(ACOES[i]) || !p.startsWith(`Film visual medium: ${LOOK}. `)) erros.push(`A plano ${i + 1} perdeu a ação ou a trava do estilo`)
  }
  if (r.prompts[2] !== PROMPTS[2]) erros.push('B o plano que o juiz não marcou mudou')
  if (JSON.stringify(r.relato.refeitos) !== JSON.stringify([{ plano: 1, acao: 'ideia' }, { plano: 2, acao: 'ideia' }]) || r.relato.planos_contradiz.join() !== '1,2') erros.push('A relato: ' + JSON.stringify(r.relato))
  // (B) sem pessoa da ideia; juiz que não reprovou a ficha
  const s = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito(), pessoaDaIdeia: null })
  if (/The only person in this shot|the mother|straight hair/.test(s.prompts[0]) || !s.prompts[0].includes(ACOES[0]) || s.relato.refeitos[0]?.acao !== 'sem_ordem') erros.push('B sem a ideia a ordem não saiu limpa')
  for (const [nome, v] of [['null', null], ['UNVERIFIED', veredito({ status: 'UNVERIFIED' })], ['sem a_ficha', veredito({ falhas: ['e_final'] })]]) {
    const x = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: v, pessoaDaIdeia: MAYA })
    if (x.prompts.some((p, i) => p !== PROMPTS[i]) || x.relato.refeitos.length) erros.push('B juiz ' + nome + ' mexeu no plano')
  }
  // (C) o texto que vai ao Kling 4
  const style = st.deriveStyleAnchor('stylized 3D animated film')
  const antes = c.promptDaCenaKling4(PROMPTS[0], style, 0, true), depois = c.promptDaCenaKling4(r.prompts[0], style, 0, true)
  if (!/the mother|straight hair/.test(antes)) erros.push('C fixture: o texto do Kling 4 de antes já não tinha a ficha errada')
  if (/the mother|straight hair/.test(depois) || !/curly black hair/.test(depois)) erros.push('C o texto do Kling 4 ainda leva a ficha errada: ' + depois.slice(0, 200))
  return erros
}

const base = provas(carrega())
checa(`A, B e C verdes nos prompts reais da Maya${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
// (D) a rota
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const iBloco = rota.indexOf('if (kling4TrialCandidate && fichaAntesDoRenderLigada() && !qualidadeHerdada) { // KINEO-FICHA-ANTES-DO-RENDER-1311')
const iRelogio = rota.indexOf('classicScenePrompts[i] = relogioComPonteiros(classicScenePrompts[i])')
const iStills = rota.indexOf('const sceneStills: (string | null)[] = new Array(scenes.length).fill(null)')
const iPost = rota.indexOf('iniciarJuizDoPlano({ ...planoDoEnvio({ kling4Candidato: kling4TrialCandidate, kling4Input: () => (kling4Trial?.job')
checa('D o juiz roda depois do último toque no prompt e ANTES das imagens-chave e do 1º POST', iRelogio > 0 && iBloco > iRelogio && iStills > iBloco && iPost > iBloco)
const bloco = rota.slice(iBloco, rota.indexOf('} // KINEO-FICHA-ANTES-DO-RENDER-1311', iBloco))
checa('D espera o veredito (teto do juiz), refaz pelo veredito com a pessoa da ideia e grava o evento', bloco.includes('await esperarJuizDoPlano(iniciarJuizDoPlano(') && bloco.includes('refazerPlanoDaFicha({ prompts: classicScenePrompts, veredito: vFicha, pessoaDaIdeia: ideiaNaFicha?.pessoa ?? null })') && bloco.includes('name: FICHA_ANTES_EVENTO'))
checa('D falha aberta: erro do juiz não derruba o filme', bloco.includes("} catch (e) { console.warn('[cinematic] KINEO-FICHA-ANTES-DO-RENDER falhou"))
checa('D o evento é só do servidor', lf(fs.readFileSync('app/api/events/route.ts', 'utf8')).includes("'juiz_plano_ficha_antes',"))
const MUTANTES = [
  ['a ordem fica com a ficha reprovada', (s) => s.replace("const nova = pessoa ? `The only person in this shot is the same main character (${pessoa}); any other person described below is replaced by this same character. ` : ''", "const nova = m[0]")],
  ['as frases vazadas ficam', (s) => s.replace('const resto = semVazamento(p.slice(0, m.index) + p.slice(m.index + m[0].length), ficha)', 'const resto = p.slice(0, m.index) + p.slice(m.index + m[0].length)')],
  ['refaz todo plano, não só os reprovados', (s) => s.replace(".planos.filter((p) => p.a === 'contradiz').map((p) => p.plano)", '.planos.map((p) => p.plano)')],
  ['aceita veredito não julgado', (s) => s.replace("v && v.status === 'JUDGED' && v.falhas.includes('a_ficha')", "v && v.falhas.includes('a_ficha')")],
]
const src = lf(fs.readFileSync(ARQ, 'utf8'))
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
