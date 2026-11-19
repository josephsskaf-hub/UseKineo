// KINEO-FICHA-REPROVADA-1911 [dono 19/11: "pode fechar o furo da ficha"; prova paga 8e83778f e 3df0553d] — ficha reprovada pelo juiz não vai ao motor.
// Node puro, sem rede: executa a lib REAL com os planos que FORAM à fal na prova paga (cinematic_dispatch_result) e confere a ligação na rota. Mutantes no fim.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/cinematic/fichaReprovada1911.ts', ROTA = 'app/api/generate-video-cinematic/route.ts', EVT = 'app/api/events/route.ts'
// 8e83778f (Natal): o plano 2 como foi à fal — a ficha do Daniel com as âncoras da folha (mulher de regata) e a origem "an American woman"
const NATAL = 'Scene 2: text-directed shot, no new keyframe for this scene. Photoreal film. Wide shot. Period setting: 1997 (1990s). Identity: Daniel, exactly as the author wrote: "photos show Daniel"; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing white tank top, blue jeans; origin: an American woman. In a vintage clothing shop, Emily discovers a photo strip tucked inside the pocket of a vibrant red wool coat. Mouth closed, no speaking.'
// 3df0553d (Adão e Eva): a ordem do protagonista + a cláusula da ficha travada
const EVA = 'Film visual medium: stylized 3D animated film look. Clear well-lit shot of the final moment. The only person in this shot is the same main character (Eve, exactly as the author wrote: "Eve in her own language"; appearance anchors: young adult (adult)); any other person described below is replaced by this same character. An angel with a flaming sword stands at the garden\'s entrance. The same main character appears in this scene, consistent design: Eve, exactly as the author wrote: "Eve in her own language"; appearance anchors: young adult. no readable text, letters, numbers, labels or signage'
const REPROVADA = { status: 'JUDGED', falhas: ['a_ficha'] }, APROVADA = { status: 'JUDGED', falhas: [] }

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  let F
  try { F = createOfflineLoader({ source: (rel, src) => over[rel] ?? src })('@/' + LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const rota = over[ROTA] ?? read(ROTA)
  no(F.FICHA_REPROVADA_1911 !== 'internal' || F.fichaReprovadaLigada('internal', false) || !F.fichaReprovadaLigada('internal', true) || F.fichaReprovadaLigada('off', true), "A0 'internal' = só a conta exata do ensaio; 'off' = nada")
  no((rota.match(/fichaReprovadaLigada\(FICHA_REPROVADA_1911, isDryRunAccount\(user\.email\)\)/g) ?? []).length !== 2, 'A1 o envio e o eco ligam pela régua EXATA do ensaio (isDryRunAccount)')
  // a lib nos planos reais
  const a1 = F.semAncorasDaFolha(NATAL)
  no(/appearance anchors|tank top|origin: an American woman/.test(a1) || !a1.includes('Identity: Daniel, exactly as the author wrote: "photos show Daniel".') || !a1.includes('Emily discovers a photo strip'), `F1 8e83778f: saem as âncoras da folha e a origem; o trecho do autor e a ação ficam (${a1.slice(0, 260)})`)
  const s1 = F.semFicha(NATAL)
  no(/Identity:|Daniel, exactly|tank top/.test(s1) || !s1.includes('Emily discovers a photo strip') || !s1.includes('Period setting: 1997 (1990s).'), `F2 sem ficha: a linha Identity sai inteira, a época e a ação ficam (${s1.slice(0, 200)})`)
  const s2 = F.semFicha(EVA)
  no(/The only person in this shot|consistent design|Eve, exactly/.test(s2) || !s2.includes('An angel with a flaming sword'), `F3 sem ficha: a ordem do protagonista e a cláusula da ficha travada saem (${s2})`)
  // a decisão
  const juiz = (v) => { const c = []; return { c, f: async (ps) => { c.push(ps); if (v instanceof Error) throw v; return v } } }
  { const j = juiz(APROVADA); const r = await F.fichaQueVaiAoMotor({ veredito: APROVADA, prompts: [NATAL], julgarDeNovo: j.f })
    no(r.relato.acao !== 'nada' || r.prompts[0] !== NATAL || j.c.length, 'D1 ficha aprovada: nada muda, byte a byte, sem 2ª leitura') }
  { const j = juiz(APROVADA); const r = await F.fichaQueVaiAoMotor({ veredito: REPROVADA, prompts: [NATAL], julgarDeNovo: j.f })
    no(r.relato.acao !== 'sem_ancoras' || r.prompts[0] !== a1 || j.c.length !== 1 || j.c[0][0] !== a1, `D2 reprovada e aprovada sem as âncoras: vai a ficha sem âncoras (o juiz lê o texto novo) (${r.relato.acao})`) }
  for (const [nome, v] of [['reprovada de novo', REPROVADA], ['juiz sem veredito (prazo)', null], ['juiz com erro', new Error('x')], ['juiz não julgou', { status: 'UNVERIFIED', falhas: [] }]]) {
    const r = await F.fichaQueVaiAoMotor({ veredito: REPROVADA, prompts: [NATAL, EVA], julgarDeNovo: juiz(v).f })
    no(r.relato.acao !== 'sem_ficha' || r.prompts[0] !== s1 || r.prompts[1] !== s2, `D3 ${nome}: a ficha sai dos planos (o caminho sem ficha) (${r.relato.acao})`)
  }
  { const semAncora = 'Photoreal film. Identity: the man, a tall man in a grey coat. He walks. no readable text'
    const j = juiz(APROVADA); const r = await F.fichaQueVaiAoMotor({ veredito: REPROVADA, prompts: [semAncora], julgarDeNovo: j.f })
    no(r.relato.acao !== 'sem_ficha' || j.c.length !== 0 || /Identity/.test(r.prompts[0]), 'D4 sem âncora nossa para tirar: a reprovada sai direto (nenhuma 2ª leitura à toa)') }
  // a rota
  no(!rota.includes("const fr1911 = await fichaQueVaiAoMotor({ veredito: rA2.veredito as { status?: string; falhas?: readonly string[] } | null, prompts: [...kling4PromptsDasCenas1911], julgarDeNovo: async (ps) => { aplicarCenas1911(ps); const e = kling4EnvioDoFilme();") || !rota.includes('          aplicarCenas1911(fr1911.prompts)\n'), 'R1 o envio: o passo roda sobre as cenas (as metades e a cena inteira nascem delas), depois da revisão do A2, e o juiz lê os planos montados')
  { const iA = rota.indexOf('          const fr1911 = await fichaQueVaiAoMotor('), iP = rota.indexOf('kling4Trial = await orchestrateKling4Trial({')
    no(!(iA > 0 && iP > iA), 'R2 a ficha é decidida ANTES da reserva e do POST pago') }
  no(!rota.includes('final: { planos: fichaEco1911 ? fichaEco1911.prompts : vaiAFal.planos,') || !rota.includes('ficha_reprovada: fichaEco1911 ? { ...fichaEco1911.relato, antes: vaiAFal.planos } : null,'), 'R3 o eco do dry_run mostra o texto que iria ao motor, antes e depois')
  { const ev = over[EVT] ?? read(EVT), i0 = ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), lista = i0 >= 0 ? ev.slice(i0, ev.indexOf('])', i0)) : ''
    no(!/^\s*'kling4_ficha_reprovada',/m.test(lista) || F.FICHA_REPROVADA_EVENTO !== 'kling4_ficha_reprovada' || !rota.includes('metadata: { generation_id: generationId, ...fr1911.relato } })'), 'R4 o evento é só do servidor e grava só a ação e os vereditos (nunca texto)') }
  return p
}

const MUT = [
  ['público', LIB, (s) => s.replace("export const FICHA_REPROVADA_1911: ModoFichaReprovada1911 = 'internal'", "export const FICHA_REPROVADA_1911: ModoFichaReprovada1911 = 'public'")],
  ['rota: régua larga', ROTA, (s) => s.replace('fichaReprovadaLigada(FICHA_REPROVADA_1911, isDryRunAccount(user.email))', 'fichaReprovadaLigada(FICHA_REPROVADA_1911, isInternalEmail(user.email))')],
  ['a origem fica', LIB, (s) => s.replace(".replace(/;\\s*origin:[^;.]*/gu, '')", '')],
  ['as âncoras ficam', LIB, (s) => s.replace("t.replace(/;\\s*appearance anchors:[^;.]*/gu, '')", 't')],
  ['a linha Identity fica', LIB, (s) => s.replace("    .replace(/(?:Visible(?:, seen from behind)?|Identity): .+?(?:\\.(?=\\s|$)|(?=,?\\s*no readable text))\\s*/gu, '')\n", '')],
  ['a ordem fica', LIB, (s) => s.replace("    .replace(/The only person in this shot is the same main character \\(((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*)\\); any other person described below is replaced by this same character\\.\\s*/gu, '')\n", '')],
  ['sem a 2ª leitura', LIB, (s) => s.replace('      relato.reprovada_depois = v2 && v2.status === \'JUDGED\' ? fichaReprovada(v2) : null\n', '      relato.reprovada_depois = false\n')],
  ['juiz que não julgou aprova', LIB, (s) => s.replace("relato.reprovada_depois = v2 && v2.status === 'JUDGED' ? fichaReprovada(v2) : null", 'relato.reprovada_depois = fichaReprovada(v2)')],
  ['reprovada segue como está', LIB, (s) => s.replace("    relato.acao = 'sem_ficha'; relato.ms = Date.now() - t0\n    return { prompts: base.map(semFicha), relato }", "    relato.ms = Date.now() - t0\n    return { prompts: base, relato }")],
  ['rota: o passo não aplica', ROTA, (s) => s.replace('          aplicarCenas1911(fr1911.prompts)\n', '')],
  ['rota: eco mostra o de antes', ROTA, (s) => s.replace('final: { planos: fichaEco1911 ? fichaEco1911.prompts : vaiAFal.planos,', 'final: { planos: vaiAFal.planos,')],
  ['evento fora da lista', EVT, (s) => s.replace("  'kling4_ficha_reprovada', // KINEO", "  // 'kling4_ficha_reprovada', // KINEO")],
]
const p0 = await prova()
if (p0.length) { console.error('FAIL test-ficha-reprovada-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) { const o = read(arq), m = f(o); if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue } if (!(await prova({ [arq]: m })).length) vivos.push(nome) }
if (vivos.length) { console.error('FAIL test-ficha-reprovada-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-ficha-reprovada-1911 (planos reais da prova paga: a ficha reprovada sai sem as âncoras da folha ou inteira; ${MUT.length} mutantes mortos)`)
