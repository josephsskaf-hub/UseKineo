import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const carregar = (src) => { const m = { exports: {} }; new Function('module', 'exports', 'require', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, nativeRequire); return m.exports }
// KINEO-ULTIMO-PLANO-ACONTECE-1111 — alavanca 1 inteira (CEO 11/11, atrás de 'internal'): o último plano do filme tem de ser um ACONTECIMENTO. Ensaio
// no gpt-4o-mini com 4 roteiros reais (Javé 2120f018, Pompeia, boneco 4eb0c0c9, Leo): sem a regra, o fim acontecia em 5 de 8; só com a linha do prompt,
// 6 de 8; com a linha + a refação de UM plano decidida em código, 8 de 8. Trava (Node puro, sem rede): (a) o detector — o céu parado da Javé real não
// acontece, o desabamento da Pompeia acontece; (b) a refação: pede só quando falta, aceita só com verbo de mudança e tamanho certo, e qualquer falha
// deixa o plano de antes; (c) o planejador liga a linha e a refação nas DUAS mensagens de cena, só para a casa; desligado, a mensagem é a de antes,
// byte a byte. Mutantes no fim.
const UP = 'lib/cinematic/ultimoPlanoAcontece.ts', AN = 'app/api/analyze-idea/route.ts'
const CEU = "A wide shot of a star-filled night sky, with constellations twinkling brightly, capturing the vastness of creation's beauty."
const ARENA = 'Wide shot of the amphitheater collapsing under the weight of falling ash and debris, with panicked silhouettes of people fleeing.'
async function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let U
  try { U = carregar(over[UP] ?? read(UP)) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  no(U.fimAcontece(CEU) || !U.fimAcontece(ARENA), `(a) detector: céu ${U.fimAcontece(CEU)}, arena ${U.fimAcontece(ARENA)}`)
  const cenas = () => [{ voiceover: 'It begins.', visual_prompt: 'A river at dawn.' }, { voiceover: "Romans 1:20 shows through creation, God's attributes are seen.", visual_prompt: CEU }]
  const evento = 'A dark storm cloud over the mountains breaks open and a bright shaft of golden light bursts through, sweeping across the valley as the sky clears.'
  let pedidos = 0
  const c1 = cenas(); const r1 = await U.ultimoPlanoComAcontecimento(c1, async () => { pedidos++; return JSON.stringify({ visual_prompt: evento }) })
  no(!r1.trocou || c1[1].visual_prompt !== evento || pedidos !== 1, `(b) a refação com acontecimento não entrou: ${JSON.stringify(r1)}`)
  const c2 = cenas(); const r2 = await U.ultimoPlanoComAcontecimento(c2, async () => JSON.stringify({ visual_prompt: 'A calm, still view of the star-filled night sky above quiet hills, soft light, peaceful and serene, a timeless image of creation.' }))
  no(r2.trocou || c2[1].visual_prompt !== CEU, '(b) refação sem verbo de mudança entrou')
  const c3 = cenas(); const r3 = await U.ultimoPlanoComAcontecimento(c3, async () => { throw new Error('rede') })
  no(r3.trocou || c3[1].visual_prompt !== CEU || r3.motivo !== 'falhou', '(b) falha da rede mexeu no plano')
  pedidos = 0; const c4 = [{ voiceover: 'x', visual_prompt: ARENA }]; await U.ultimoPlanoComAcontecimento(c4, async () => { pedidos++; return '{}' })
  no(pedidos !== 0, '(b) pediu de novo quando o fim já acontecia')
  no(U.ULTIMO_PLANO_ACONTECE !== 'internal' || U.ultimoPlanoAconteceLigado('internal', false) || !U.ultimoPlanoAconteceLigado('internal', true), '(c) a chave não é internal')
  const an = over[AN] ?? read(AN)
  const linha = "${ultimoPlanoLigado ? `\n  ${REGRA_ULTIMO_PLANO}` : ''}"
  no(an.split(linha).length !== 3, '(c) a linha do último plano não está nas duas mensagens de cena')
  no(an.split('if (ultimoPlanoLigado) { const r = await ultimoPlanoComAcontecimento(scenes, pedirUltimoPlano, (v) => clampToProviderLimit(withCamera(v)));').length !== 3, '(c) a refação não está nos dois caminhos')
  no(!an.includes('const ultimoPlanoLigado = ultimoPlanoAconteceLigado(ULTIMO_PLANO_ACONTECE, isInternalEmail(user.email))'), '(c) a chave não lê a conta')
  // desligado = a mensagem de antes, byte a byte (a mensagem do roteiro marcado, como no código)
  const ini = 'const visualUserMsg = `', a1 = an.indexOf(ini), b1 = an.indexOf('`\n\n      try {', a1)
  const tpl = an.slice(a1 + ini.length, b1)
  const msg = (t, ligado) => new Function('sceneList', 'estrelaNoPedido', 'ESTRELA_REAL_PEOPLE_EXCEPTION', 'personagemContinuo', 'REGRA_UM_LUGAR', 'ultimoPlanoLigado', 'REGRA_ULTIMO_PLANO', 'return `' + t + '`')([{ scene_number: 1, typeLabel: 'HOOK', duration_seconds: 4, voiceover: 'Thousands cheer.' }], false, '', () => null, '', ligado, U.REGRA_ULTIMO_PLANO)
  no(msg(tpl, false) !== msg(tpl.replace(linha, ''), false), '(c) desligado, a mensagem mudou')
  no(!msg(tpl, true).includes(U.REGRA_ULTIMO_PLANO), '(c) ligado, a linha não entrou')
  return p
}
const atual = await problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (fim parado é refeito como acontecimento, só com verbo; nas 2 mensagens; só a casa; desligado = igual)')
const up = read(UP), an = read(AN)
const MUT = [
  ['M1 a refação aceita sem verbo', { [UP]: up.replace('if (!fimAcontece(novo) || novo.length < 80 || novo.length > 450)', 'if (novo.length < 80 || novo.length > 450)') }],
  ['M2 a chave abre ao público', { [UP]: up.replace("export const ULTIMO_PLANO_ACONTECE: ModoUltimoPlano = 'internal'", "export const ULTIMO_PLANO_ACONTECE: ModoUltimoPlano = 'public'") }],
  ['M3 o roteiro colado sem a refação', { [AN]: (() => { const k = "if (ultimoPlanoLigado) { const r = await ultimoPlanoComAcontecimento(scenes"; const i = an.lastIndexOf(k); return an.slice(0, i) + 'if (false) { const r = await ultimoPlanoComAcontecimento(scenes' + an.slice(i + k.length) })() }],
  ['M4 pede de novo mesmo quando o fim já acontece', { [UP]: up.replace("if (fimAcontece(u.visual_prompt)) return { trocou: false, motivo: 'ja_acontece' }", '') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = await problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
