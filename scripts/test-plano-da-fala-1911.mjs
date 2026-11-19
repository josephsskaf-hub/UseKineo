// KINEO-PLANO-DA-FALA-1911 · A1 [CEO 19/11] — replay determinístico do montador novo sobre os planos REAIS dos filmes citados no diagnóstico
// (docs/plano-da-fala-1911/replay-filmes-citados.json) + a trava da ligação na rota. Node puro, sem rede, sem banco, sem fal, sem OpenAI:
// executa as libs reais (lib/kling4QuatroPlanos.ts, lib/scriptParser.ts, lib/cinematic/cenaKling4.ts, lib/kling4Trial.ts) sem a descrição
// por seção (o pior caso: a chamada ao descritor falhou), então o que se vê é a parte SÓ DE CÓDIGO do A1. Confere: nenhum plano com o molde
// da pista; cada plano enviado ≤ 512 e com a proteção de letras; o sujeito volta onde o filme o perdeu; desligado = o de antes.
// `node scripts/test-plano-da-fala-1911.mjs --escrever` grava docs/plano-da-fala-1911/LADO-A-LADO.md (texto antigo × novo).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const QP = 'lib/kling4QuatroPlanos.ts', LIB = 'lib/kling4PlanoDaFala1911.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const dados = JSON.parse(read('docs/plano-da-fala-1911/replay-filmes-citados.json'))
const STYLE = { look: 'photoreal', suffix: '', lookPhrase: 'photorealistic, ultra-detailed' }
const MOLDE = 'Main subject of this shot:'
const cp = (s) => Array.from(s).length

function montar(load, f, { comDescricao }) {
  const { parseUserScript } = load('@/lib/scriptParser.ts')
  const Q = load('@/' + QP), C = load('@/lib/cinematic/cenaKling4.ts'), K = load('@/lib/kling4Trial.ts')
  const secoes = parseUserScript(f.roteiro).segments.map((s) => (comDescricao ? { ...s, descricao: null } : { ...s }))
  const prompts = f.cenas.map((p, i) => C.promptDaCenaKling4(p, STYLE, i, true))
  const falas = f.grupos.map((g) => g.map((j) => secoes[j].voiceover).join(' '))
  const q = Q.planosPorSecao({ prompts, stills: [], falas, secoes, objetoConcreto: true })
  if (!q) return null
  const stills = f.enviados.map((e, i) => (i === 0 ? (/^Scene 1: use the start image/.test(e) ? 'https://x/0.png' : null) : (/use middle keyframe/.test(e) ? `https://x/${i}.png` : null)))
  const multi = K.buildKling4TrialInput(q.prompts, stills).input.multi_prompt.map((m) => m.prompt)
  return { planos: q.prompts, enviados: multi }
}

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  const load = createOfflineLoader({ source: (rel, src) => over[rel] ?? src })
  let Q, L
  try { Q = load('@/' + QP); L = load('@/' + LIB) } catch (e) { return [`libs não carregam: ${e.message}`] }

  // ── A · a lib, executada ──
  no(L.KLING4_PLANO_DA_FALA_1911 !== 'off', 'A0 o interruptor nasce off')
  no(L.planoDaFalaLigado('off', true) || L.planoDaFalaLigado('internal', false) || !L.planoDaFalaLigado('internal', true) || !L.planoDaFalaLigado('public', false), 'A1 off | internal | public')
  no(!/LAST item shows how the story ends, with the central subject of the Topic clearly visible/.test(L.REGRA_DO_PLANO_DA_FALA) || !/never only the hint/.test(L.REGRA_DO_PLANO_DA_FALA), 'A2 a regra por seção: o último plano é o desfecho COM o sujeito; a pista nunca sozinha')
  no(JSON.stringify(L.descricoesPorSecao(['A griffin soars over Mount Meru at dawn', ''], 2)) !== JSON.stringify(['A griffin soars over Mount Meru at dawn', null]), 'A3 descrição vazia = null')
  no(L.descricoesPorSecao(['A griffin flies over the garden', 'A griffin lands on the mountain', 'A griffin reaches the stars'], 2).some((d) => d !== null) || L.descricoesPorSecao(null, 2).length !== 2, 'A4 contagem errada = todas null (nunca desloca)')
  const dz = L.secoesParaODescritor([{ voiceover: ' In 1950, a plane vanished. ', pexelsQuery: 'old newspaper' }])
  no(dz[0].voiceover !== 'In 1950, a plane vanished.' || dz[0].stockSearchQuery !== 'old newspaper', 'A5 a seção vai ao descritor com fala e pista')
  const k4 = 'Photoreal film. Medium shot, subject centered and clearly readable. Period setting: 1950 (1950s). A foggy forest path with dense fog obscuring the view.  The camera slowly pans. photorealistic, ultra-detailed, dramatic cinematic lighting, no readable text, letters Mouth closed, no speaking.'
  no(Q.acaoDaCena(k4) !== 'A foggy forest path with dense fog obscuring the view', `A6 a ação do descritor na cena do Kling 4 (${Q.acaoDaCena(k4)})`)
  no(!/^The Griffin soars upward towards the towering Mount Meru/.test(Q.acaoDaCena(dados.filmes[0].cenas[2])), `A7 a ação do descritor na cena da reserva (${Q.acaoDaCena(dados.filmes[0].cenas[2]).slice(0, 60)})`)
  no(Q.acaoDaSecao('A griffin lands on the summit of Mount Meru under the North Star', 'x', 'y') !== 'A griffin lands on the summit of Mount Meru under the North Star.', 'A8 com descrição da seção, ela é a ação')
  no(Q.acaoDaSecao(null, 'Nearly touching Polaris.', 'The Griffin soars upward') !== 'The Griffin soars upward. This shot shows only this moment: Nearly touching Polaris.', 'A9 sem descrição: ação do descritor da cena + a fala')
  no(Q.acaoDaSecao(null, 'Nearly touching Polaris.', '') !== 'This shot shows only this moment: Nearly touching Polaris.', 'A10 sem as duas: a fala (nunca a pista)')
  const longa = Q.acaoDaSecao(null, 'Nearly touching Polaris.', 'The Griffin soars ' + 'very '.repeat(80) + 'high', 120)
  no(cp(longa) > 120 || !longa.endsWith('This shot shows only this moment: Nearly touching Polaris.'), `A11 o teto corta a ação da cena, nunca a fala (${cp(longa)})`)
  no(cp(Q.acaoDaSecao('A griffin ' + 'flies '.repeat(100), 'x', '', 100)) > 100, 'A12 o teto vale também para a descrição da seção')

  // ── B · o replay dos filmes citados (só código: sem a descrição por seção) ──
  for (const f of dados.filmes) {
    let novo, velho
    try { novo = montar(load, f, { comDescricao: true }); velho = montar(load, f, { comDescricao: false }) } catch (e) { p.push(`B0 ${f.gen}: ${e.message}`); continue }
    if (!novo) { p.push(`B0 ${f.gen}: o plano por seção não montou`); continue }
    no(novo.planos.length !== f.enviados.length, `B1 ${f.gen}: ${novo.planos.length} planos (enviados: ${f.enviados.length})`)
    no(novo.enviados.some((t) => t.includes(MOLDE)), `B2 ${f.gen}: nenhum plano com o molde da pista`)
    no(!velho || !velho.planos.some((t) => t.includes(MOLDE)), `B3 ${f.gen}: o caminho de antes (sem descrição na seção) ainda é o molde — byte a byte desligado`)
    no(novo.enviados.some((t) => cp(t) > 512), `B4 ${f.gen}: todo plano enviado ≤ 512 (${novo.enviados.map(cp).join(', ')})`)
    no(novo.enviados.some((t) => !/no readable text/.test(t)), `B5 ${f.gen}: todo plano mantém a proteção de letras`)
    for (const [k, w] of Object.entries(f.tem_que_mostrar)) no(!new RegExp(w, 'i').test(novo.planos[Number(k)]), `B6 ${f.gen} plano ${Number(k) + 1}: volta a mostrar "${w}"`)
    const fundidos = f.grupos.flatMap((g, i) => (g.length > 1 ? g : [])), unicos = f.grupos.flatMap((g, i) => (g.length === 1 ? g : []))
    no(unicos.some((j) => novo.planos[j] !== velho.planos[j]), `B7 ${f.gen}: plano de cena de uma seção só fica igual`)
    no(fundidos.some((j) => !novo.planos[j].includes('This shot shows only this moment:')), `B8 ${f.gen}: cada metade leva a fala da sua seção`)
  }

  // fala reescrita pelo encaixe (a cena fundida não casa a fala exata das seções → as seções casam pelas palavras e a metade leva a fala real)
  {
    const { parseUserScript } = load('@/lib/scriptParser.ts'), C = load('@/lib/cinematic/cenaKling4.ts')
    const f = dados.filmes[0]
    const secoes = parseUserScript(f.roteiro).segments.map((s, j) => ({ ...s, descricao: j === 3 ? 'The griffin lands on the summit of Mount Meru beneath the North Star' : null }))
    const falas = ['A Griffin flies into the Garden of Eden.', 'It sits at the center of the flat earth.', 'Ascends toward Mount Meru above the clouds. Nearly touching Polaris, it defies belief.']
    const q = Q.planosPorSecao({ prompts: f.cenas.map((p, i) => C.promptDaCenaKling4(p, STYLE, i, true)), stills: [], falas, secoes, objetoConcreto: true })
    no(!q || q.prompts.some((t) => t.includes(MOLDE)) || !q.prompts[3]?.includes('The griffin lands on the summit of Mount Meru'), `B9 fala reescrita pelo encaixe: a metade ainda leva a descrição da sua seção (${q?.prompts[3]?.slice(0, 160)})`)
  }

  // ── C · a ligação na rota ──
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes("const kling4PlanoDaFala1911 = kling4TrialCandidate && verbatim && planoDaFalaLigado(KLING4_PLANO_DA_FALA_1911, isInternalEmail(user.email)) && parsedScript.segments.length > scenes.length"), 'C1 só o Kling 4 grátis literal com cena fundida, pelo interruptor')
  no(!rota.includes('? generateCinematicDescriptions(secoesParaODescritor(parsedScript.segments), prompt, classicVisualPolicy, undefined,') || !/sheet: desenhoInfantil\.personagem\.sheet \} : null, true, true\)\n/.test(rota), 'C2 o descritor por seção: o pedido como Topic, a regra do Kling 4 e a regra por seção')
  no(!rota.includes("{ role: 'system', content: porSecao ? system + REGRA_DO_PLANO_DA_FALA : system }"), 'C3 a regra por seção só na chamada por seção')
  const iDesc = rota.indexOf('const descricoesDasSecoesK4: Promise<(string | null)[]> | null'), iCenas = rota.indexOf('cobertura = await describeScenesCovered(scenes.length')
  no(!(iDesc > 0 && iCenas > iDesc), 'C4 a chamada por seção começa ANTES da das cenas (em paralelo, sem somar espera)')
  const iUsa = rota.indexOf("if (descricoesDasSecoesK4) { const d = await descricoesDasSecoesK4; parsedScript.segments.forEach((s, j) => { Object.assign(s, { descricao: d[j] ?? null }) }) }"), iEnvio = rota.indexOf('const kling4EnvioDoFilme = () =>')
  no(!(iUsa > 0 && iEnvio > iUsa), 'C5 a descrição entra nas seções antes da montagem do envio (juiz, claim e POST leem a mesma)')
  no(!rota.includes("objetoConcreto: kling4PlanoVariado }) // KINEO-K4-PLANO-POR-SECAO-1111 · KINEO-K4-PLANO-VARIADO-1111"), 'C6 a montagem de sempre continua igual (a descrição viaja na seção)')
  no(!rota.includes("fallback_scenes: classicScenePrompts.map((prompt, i) => ({ prompt, duration: scenes[i].clipSeconds ?? 6 })),"), 'C7 a reserva H3 nasce das cenas de sempre (nada do A1 toca classicScenePrompts)')
  no(rota.split('\n').filter((l) => l.includes('KINEO-PLANO-DA-FALA-1911') || l.includes('descricoesDasSecoesK4')).some((l) => /classicScenePrompts|\.aiPrompt\s*=|scenes\[[^\]]*\]\.(?:voiceover|description)\s*=/.test(l)), 'C8 o A1 não escreve nas cenas')
  return p
}

const MUT = [
  ['molde religado', QP, (s) => s.replace('if (secao.descricao !== undefined) {', 'if (false) {')],
  ['a seção não leva a descrição', QP, (s) => s.replace('const secao = a.secoes[j].descricao !== undefined ?', 'const secao = false ?')],
  ['sem a ação do descritor da cena', QP, (s) => s.replace('const acaoA1 = acaoDaSecao(secao.descricao, fala, acaoDaCena(p),', "const acaoA1 = acaoDaSecao(secao.descricao, fala, '',")],
  ['teto corta a fala', QP, (s) => s.replace("const sobra = max - Array.from(momento).length - 2", 'const sobra = max - 2')],
  ['interruptor ligado', LIB, (s) => s.replace("KLING4_PLANO_DA_FALA_1911: ModoPlanoDaFala = 'off'", "KLING4_PLANO_DA_FALA_1911: ModoPlanoDaFala = 'public'")],
  ['contagem errada desloca', LIB, (s) => s.replace('if (!Array.isArray(saida) || saida.length !== nSecoes)', 'if (!Array.isArray(saida))')],
  ['regra sem o desfecho', LIB, (s) => s.replace('The LAST item shows how the story ends, with the central subject of the Topic clearly visible in that final moment', 'The LAST item closes the film')],
  ['rota: descritor sem a regra por seção', ROTA, (s) => s.replace('sheet: desenhoInfantil.personagem.sheet } : null, true, true)\n', 'sheet: desenhoInfantil.personagem.sheet } : null, true)\n')],
  ['rota: regra em toda chamada', ROTA, (s) => s.replace("content: porSecao ? system + REGRA_DO_PLANO_DA_FALA : system }", 'content: system + REGRA_DO_PLANO_DA_FALA }')],
  ['rota: descrição não entra nas seções', ROTA, (s) => s.replace("parsedScript.segments.forEach((s, j) => { Object.assign(s, { descricao: d[j] ?? null }) })", 'void d')],
]

const p0 = await prova()
if (process.argv.includes('--escrever')) {
  const load = createOfflineLoader({})
  const linhas = ['# A1 · texto antigo × novo dos planos do Kling 4 (filmes citados no diagnóstico) · gerado por scripts/test-plano-da-fala-1911.mjs --escrever', '',
    'Antigo = o plano ENVIADO à fal (cinematic_dispatch_result). Novo = o montador do A1 sobre as mesmas cenas e o mesmo roteiro, SEM a descrição por seção (só código: o pior caso). Com o descritor por seção ligado, a ação de cada metade vem da descrição dele.', '']
  for (const f of dados.filmes) {
    const n = montar(load, f, { comDescricao: true })
    linhas.push(`## ${f.gen} (vídeo ${f.video}) · ${f.defeito}`, '')
    f.enviados.forEach((e, i) => linhas.push(`**Plano ${i + 1}**`, '', `- Antigo (${cp(e)}): ${e}`, `- Novo (${cp(n.enviados[i])}): ${n.enviados[i]}`, ''))
  }
  fs.writeFileSync(path.join(ROOT, 'docs/plano-da-fala-1911/LADO-A-LADO.md'), linhas.join('\n'))
}
if (p0.length) { console.error('FAIL test-plano-da-fala-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) {
  const orig = read(arq), mut = f(orig)
  if (mut === orig) { vivos.push(`${nome} (não pegou a fonte)`); continue }
  if (!(await prova({ [arq]: mut })).length) vivos.push(nome)
}
if (vivos.length) { console.error('FAIL test-plano-da-fala-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-plano-da-fala-1911 (${dados.filmes.length} filmes reais; ${MUT.length} mutantes mortos)`)
