// KINEO-JUIZ-PLANO-0111 [TRAVA 8.2 — vai do fundador 01/11 "concordo vai"] — guardião do JUIZ DO PLANO v2 (juiz_plano_v2), SÓ OBSERVAR.
// OFFLINE: executa o código REAL de lib/juizDoPlano.ts com fetch FALSO — nenhuma rede, chave, banco ou render. Lê a rota como
// texto para provar onde o juiz entra e que ele não toca no envio. Sem medição de relógio apertada (o D1 antigo exigia < 30 ms
// logo depois de um sleep de 20 ms e falhava ~1 em 5 no Windows, cujo relógio anda de 15,6 em 15,6 ms).
// Provas:
//   O  observe NÃO muda nenhum byte do envio: (O1) entradas congeladas saem idênticas e o veredito só leva citações curtas;
//      (O2) toda linha da rota com a marca é só leitura; (O3) tirar as linhas da marca devolve a rota da base do recibo BYTE A
//      BYTE; (O4) nada fora da marca lê o juiz; o publicador (resposta ao cliente e claim) não tem juiz; 'enforce' ainda observa.
//   P  posição: hollywood DEPOIS do laço que reescreve hs.prompt e do preenchimento das cenas não enviadas; clássico/Kling 4
//      grátis/fallback DEPOIS do 1º POST; nenhuma espera no caminho pago (a única espera é a do ensaio de $0, dentro dele);
//      Kling 4 grátis julgado com os MESMOS argumentos do buildKling4TrialInput do envio.
//   K  o texto que foi à fal: multi_prompt (corte em 512 do buildKling4TrialInput REAL), fallback = prompt do input enviado.
//   V  derivação: nota só das respostas; b/c "sim" e a/d "não" reprovam; (e) é alerta; citação fora do texto é descartada;
//      sem rosto em todo plano + sujeito humano = (d) reprova em código; maioria de 3 leituras.
//   R  UMA chamada: modelo utility, n=3, json_schema estrito, mensagens = montarMensagensJuizPlano, sem o corte de 1.500.
//   F  falha segura (rede, HTTP 500, JSON inválido, fora do schema, sem chave, prazo) = UNVERIFIED dentro do teto.
//   E  evento UMA vez, dentro da promessa entregue ao waitUntil; dry_run só no ensaio de $0 (dry_run:'stills' no hollywood é render pago).
//   D  off desliga.  T  recibo TRAVA 8.2.  M  mutantes.
// Rodar: npx tsx scripts/test-juiz-plano-0111.mts
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as J from '../lib/juizDoPlano'
import { buildKling4TrialInput } from '../lib/kling4Trial'
import { AI_TEXT_MODELS } from '../lib/aiModels'
// @ts-ignore — módulo .mjs de apoio das travas (sem tipos)
import { semJuizPlano0111, deltaJuizPlano0111Exato, JUIZ_PLANO_0111 } from './test-support/desfaz-juiz-plano-0111.mjs'
import { semProtagonistaSeedance0111 } from './test-support/desfaz-protagonista-seedance-0111.mjs' // KINEO-PROTAGONISTA-SEEDANCE-0111
import { semK4NarracaoCabe0111 } from './test-support/desfaz-k4-narracao-cabe-0111.mjs' // KINEO-K4-NARRACAO-CABE-0111
import { semCasaFichaSemLetras0211 } from './test-support/desfaz-casa-ficha-sem-letras-0211.mjs' // KINEO-CASA-FICHA-SEM-LETRAS-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lf = (s: string) => String(s).replace(/\r\n/g, '\n')
const rd = (rel: string) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const MARCA = 'KINEO-JUIZ-PLANO-0111'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

// ── dublês ──
type Chamada = { url: string; body: any }
const respostaN = (conteudos: unknown[]) => new Response(JSON.stringify({ choices: conteudos.map((c) => ({ message: { content: typeof c === 'string' ? c : JSON.stringify(c) } })), usage: { prompt_tokens: 4000, completion_tokens: 900 } }), { status: 200, headers: { 'content-type': 'application/json' } })
const fetchFalso = (resposta: () => Response | Promise<Response>, chamadas: Chamada[]) => (async (url: any, init?: any) => { chamadas.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) }); return resposta() }) as unknown as typeof fetch
const congelar = <T,>(o: T): T => { if (o && typeof o === 'object') { Object.values(o as object).forEach(congelar); Object.freeze(o) } return o }
const TOKEN_LONGE = 'TOKEN_UNICO_DO_FIM_DO_PROMPT'
const FICHA_C54 = 'Visible: Skymaster, a person in their thirties with wavy chestnut hair'
const entrada = (): J.JuizPlanoEntrada => ({
  caminho: 'kling4_gratis', engine: 'kling4', verbatim: true, seconds: 15,
  pedido: '[Idea: the C-54 Skymaster that vanished over the Yukon in 1950]\nHOOK: In 1950 a C-54 vanished over the Yukon.\nPAYOFF: It was never found.',
  cenas: [
    { fala: 'In 1950 a C-54 Skymaster vanished over the Yukon.', prompt: `Photoreal film. ${FICHA_C54}, a square jaw. A foggy forest path. ${'mist '.repeat(60)}${TOKEN_LONGE}` },
    { fala: 'Forty-four people were on board.', prompt: 'Photoreal film. faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces. Snowy mountains.' },
    { fala: 'It was never found.', prompt: 'Photoreal film. faceless cinematic b-roll, no foreground human faces. Abandoned airfield at sunset.' },
  ],
})
const plano = (n: number, o: Partial<Record<string, string>> = {}) => ({ plano: n, ficha_no_texto: '', historia_diz: '', a_ficha_contradiz: 'sem_ficha', b_nome_falso: 'nao', b_nome: '', c_criatura_no_lugar: 'nao', c_citacao: '', ...o })
const RUIM = { protagonista: 'the C-54', planos: [plano(1, { ficha_no_texto: FICHA_C54, historia_diz: 'C-54 Skymaster', a_ficha_contradiz: 'sim', b_nome_falso: 'sim', b_nome: 'Skymaster' }), plano(2), plano(3)], d_sujeito: 'o avião C-54', d_sujeito_e_pessoa: 'nao', d_sujeito_aparece: 'nao', e_promessa: '', e_final_entrega: 'nao_se_aplica', e_motivo: '' }
const BOM = { protagonista: 'the C-54', planos: [plano(1), plano(2), plano(3)], d_sujeito: 'o avião C-54', d_sujeito_e_pessoa: 'nao', d_sujeito_aparece: 'sim', e_promessa: '', e_final_entrega: 'nao_se_aplica', e_motivo: '' }
const esperarMs = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── checagens da rota (funções puras sobre o texto, para os mutantes) ──
const ATRIBUICAO_PROIBIDA = /(classicScenePrompts|scenes|plan\.scenes|sceneStills|classicSceneInputs|hSubmittedPrompts|hSceneFalInputs|kling4Prompts|kling4ApprovedStills)\s*(\[[^\]]*\])?\s*(=(?!=)|\.push\(|\.splice\()|\bhs\.prompt\s*=(?!=)|\.prompt\s*=(?!=)|\bvoiceover\s*=(?!=)|\bcost\s*=(?!=)|\bprompt\s*=(?!=)|\bresponse\s*=(?!=)/
const linhasDaMarca = (rota: string) => rota.split('\n').filter((l) => l.includes(MARCA))
const soLeitura = (rota: string) => linhasDaMarca(rota).every((l) => !ATRIBUICAO_PROIBIDA.test(l.split(' // ')[0]))
const semMarca = (rota: string) => rota.split('\n').filter((l) => !l.includes(MARCA)).join('\n')
const foraDaMarcaNaoLe = (rota: string) => rota.split('\n').filter((l) => !l.includes(MARCA)).every((l) => !/juizPlano|JuizDoPlano|juiz_plano|planoDoEnvio/.test(l))
const blocoPublicador = (rota: string) => { const i = rota.indexOf('const publishCinematicResponse = async ('); return i < 0 ? '' : rota.slice(i, rota.indexOf('return settleDebitAndRespond(completed.claim, response)', i)) }
const posicoes = (rota: string) => {
  const ix = (s: string, de = 0) => rota.indexOf(s, de)
  const lacoH = ix('for (const [idx, hs] of plan.scenes.entries()) {')
  const fimLacoH = ix('        hSubmittedPrompts.push(unsubmitted.prompt + eraSuffix)\n      }\n', lacoH)
  const ultimoHsPrompt = rota.lastIndexOf('hs.prompt =', fimLacoH)
  const ultimoPostH = rota.lastIndexOf('submitToFalWithOneRetry(', fimLacoH)
  const inicioH = ix("iniciarJuizDoPlano({ caminho: 'hollywood'")
  const ledgerH = ix('// KINEO-VIGIA-LEDGER-2026-09-11 — o finalizador único (finalizarDespacho) lê', lacoH)
  const submit = ix(': await submitAllScenes(usedModel)')
  const k4Post = ix('kling4Trial = await orchestrateKling4Trial(')
  const inicioC = ix('iniciarJuizDoPlano({ ...planoDoEnvio({ kling4Candidato: kling4TrialCandidate, kling4Input: () => (kling4Trial?.job ?')
  const falIds = ix('    const falRequestIds = submittedScenes.ids')
  const ensaio = ix('if (body.dry_run === true && isDryRunAccount(user.email)) {\n      const classicReport')
  const ensaioFim = ix('...relatorioDoEnsaio,', ensaio)
  const esperas = [...rota.matchAll(/esperarJuizDoPlano\(/g)].map((m) => m.index ?? -1)
  const linhaC = rota.slice(inicioC, rota.indexOf('\n', inicioC))
  const argsEnvioK4 = /prompts: kling4Prompts, approvedStills: kling4ApprovedStills, timing: kling4Timing,/.test(rota)
  return {
    hollywood: lacoH > 0 && fimLacoH > lacoH && ultimoHsPrompt > lacoH && ultimoPostH > lacoH && inicioH > fimLacoH && inicioH > ultimoHsPrompt && inicioH > ultimoPostH && ledgerH > inicioH && rota.slice(fimLacoH, inicioH).split('\n').length === 3,
    classico: submit > 0 && k4Post > 0 && inicioC > submit && inicioC > k4Post && falIds > inicioC && rota.slice(inicioC, falIds).split('\n').length === 2,
    semEsperaNoPago: esperas.length === 1 && esperas[0] > ensaio && esperas[0] < ensaioFim && !/await\s+iniciarJuizDoPlano|await\s+esperarJuizDoPlano\(juizPlano/.test(rota.slice(0, ensaio) + rota.slice(ensaioFim)),
    k4MesmosArgs: argsEnvioK4 && linhaC.includes('buildKling4TrialInput(kling4Prompts, kling4ApprovedStills, kling4Timing).input') && linhaC.includes('inputs: classicSceneInputs })'),
    hollywoodTextoEnviado: rota.includes("cenas: plan.scenes.slice(0, hDispositions.length).map((s, i) => ({") && rota.includes("prompt: typeof hSceneFalInputs[i]?.prompt === 'string' ? String(hSceneFalInputs[i]?.prompt) : hSubmittedPrompts[i] ?? ''"),
    publicadorSemJuiz: blocoPublicador(rota).length > 200 && !/juizPlano|juiz_plano|JuizDoPlano|JuizPlano/.test(blocoPublicador(rota)),
    evento: /const registrarJuizPlano = \(v: JuizPlanoVeredito\) => writeServerEvent\(\{ name: JUIZ_PLANO_EVENT, userId: user\.id, path: '\/api\/generate-video-cinematic', sessionId: generationId, metadata: \{ generation_id: generationId, dry_run: body\.dry_run === true, \.\.\.v \} \}\)/.test(rota) && !/ehPedidoDeStills|dry_run_modo/.test(rota.split('\n').find((l) => l.includes('const registrarJuizPlano')) ?? 'ehPedidoDeStills') && (rota.match(/aoDecidir: registrarJuizPlano/g) ?? []).length === 3,
  }
}

async function main() {
  const rota = semProtagonistaSeedance0111(semK4NarracaoCabe0111(semCasaFichaSemLetras0211(rd(ROTA), ROTA) /* KINEO-CASA-FICHA-SEM-LETRAS-0211 — a camada mais nova (02/11) sai primeiro, pelo recibo exato */, ROTA) /* KINEO-K4-NARRACAO-CABE-0111 [TRAVA 8.2 — vai do fundador 02/11 "2 c"] — a camada mais nova (02/11, opção C) sai primeiro, pelo recibo exato */, ROTA) // KINEO-PROTAGONISTA-SEEDANCE-0111 — o elenco semântico (01/11, camada mais nova) sai antes, pelo recibo exato
  const lib = rd('lib/juizDoPlano.ts')
  const BASE = String(JUIZ_PLANO_0111.base)
  let base: string | null = null
  try { base = lf(execFileSync('git', ['show', `${BASE}:${ROTA}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 })) } catch { base = null }

  console.log('== O. observe não muda nenhum byte do envio ==')
  {
    const ch: Chamada[] = []
    const e = congelar(entrada())
    const antes = JSON.stringify(e)
    let evento: J.JuizPlanoVeredito | null = null
    const h = J.iniciarJuizDoPlano(e, { modo: 'observe', apiKey: 'k', waitUntil: null, fetchImpl: fetchFalso(() => respostaN([RUIM, RUIM, BOM]), ch), aoDecidir: (v) => { evento = v } })
    const v = await J.esperarJuizDoPlano(h)
    ok(JSON.stringify(e) === antes, 'O1 entradas congeladas saem idênticas (nenhuma escrita na cena, na fala ou no pedido)')
    const longos = (o: unknown): number => JSON.stringify(o).match(/"[^"]{200,}"/g)?.length ?? 0
    ok(!!v && !JSON.stringify(v).includes(TOKEN_LONGE) && !JSON.stringify(evento).includes(TOKEN_LONGE) && longos(v) === 0, 'O1 veredito e evento NÃO carregam o prompt (só citações de até 120 caracteres; nenhuma string ≥ 200)')
    ok(!!v && v.status === 'JUDGED' && v.reprovado && v.nota === 25 && v.modo === 'observe' && v.versao === 'juiz_plano_v2', `O1 julgou e reprovou pela maioria (nota ${v?.nota}, falhas ${v?.falhas.join('+')})`)
    ok(soLeitura(rota), `O2 as ${linhasDaMarca(rota).length} linhas da rota com a marca são só leitura (nenhuma atribuição a prompt/cena/plano/fala/custo/resposta)`)
    ok(linhasDaMarca(rota).length === 5, 'O2 a marca aparece em exatamente 5 linhas (import, evento, início hollywood, ensaio, início clássico)')
    ok(base !== null && semMarca(rota) === base, `O3 rota sem as linhas da marca = ${BASE.slice(0, 9)}:${ROTA} byte a byte (nenhum payload, fala ou cobrança mudou)`)
    ok(foraDaMarcaNaoLe(rota), 'O4 nenhuma linha fora da marca lê o juiz (o envio não depende dele)')
    ok(posicoes(rota).publicadorSemJuiz, 'O4 o publicador (claim assinado + resposta ao cliente) não tem juiz: o veredito nunca vai ao cliente')
    const v2 = await J.esperarJuizDoPlano(J.iniciarJuizDoPlano(entrada(), { modo: 'enforce', apiKey: 'k', waitUntil: null, fetchImpl: fetchFalso(() => respostaN([RUIM, RUIM, RUIM]), []) }))
    ok(!!v2 && v2.modo === 'observe' && v2.modo_pedido === 'enforce', "O4 'enforce' pedido ainda é só observar (modo 'observe', pedido gravado em modo_pedido)")
    ok(J.modoDoJuizDoPlano('') === 'observe' && J.modoDoJuizDoPlano('lixo') === 'observe' && J.modoDoJuizDoPlano(' OFF ') === 'off' && J.modoDoJuizDoPlano(null) === 'observe', 'O4 JUIZ_PLANO_MODE vazio/desconhecido = observe; off reconhecido')
  }

  console.log('== P. posição na rota ==')
  {
    const p = posicoes(rota)
    ok(p.hollywood, 'P1 hollywood: DEPOIS do laço que reescreve hs.prompt (último hs.prompt = e último submitToFal) e do preenchimento das cenas não enviadas')
    ok(p.hollywoodTextoEnviado, 'P1 hollywood julga só as cenas despachadas (hDispositions), com o prompt do input assinado (hSceneFalInputs) ou o prompt EXATO enviado (hSubmittedPrompts)')
    ok(p.classico, 'P2 clássico/Kling 4 grátis/fallback: DEPOIS do 1º POST (orchestrateKling4Trial e submitAllScenes), antes de ler os ids')
    ok(p.semEsperaNoPago, 'P3 nenhuma espera no caminho pago: a única espera do veredito é a do ensaio de $0, dentro dele')
    ok(p.k4MesmosArgs, 'P4 Kling 4 grátis julgado com os MESMOS argumentos do envio (kling4Prompts, kling4ApprovedStills, kling4Timing); fallback com os inputs enviados')
  }

  console.log('== K. o texto que foi à fal ==')
  {
    const falas = ['In 1950 a C-54 vanished.', 'Forty-four people were on board.', 'It was never found.']
    const longos = falas.map((_, i) => `Shot ${i + 1}: a silver C-54 Skymaster over snowy peaks. ${'very long cinematic description '.repeat(40)}`)
    const input = buildKling4TrialInput(longos, [], { voiceovers: falas, wordsPerSecond: 2.5 }).input
    const k4 = J.planoDoEnvio({ kling4Candidato: true, kling4Input: () => input, falas, inputs: [] })
    ok(k4.caminho === 'kling4_gratis' && k4.cenas.length === 3 && k4.cenas.every((c) => Array.from(c.prompt).length <= 512) && k4.cenas[0].prompt.startsWith('Shot 1: a silver C-54'), 'K1 Kling 4 grátis: o juiz lê o multi_prompt do buildKling4TrialInput REAL (≤ 512 por plano, o corte que vai à fal)')
    const fb = J.planoDoEnvio({ kling4Candidato: true, kling4Input: () => null, falas, inputs: [null, { prompt: 'ENVIADO 2' }, { prompt: '' }] })
    ok(fb.caminho === 'kling4_fallback_seedance' && fb.cenas.map((c) => c.prompt).join('|') === 'ENVIADO 2' && fb.cenas[0].fala === falas[1], 'K2 Kling 4 caiu no Seedance: caminho próprio; só o prompt do input enviado — cena sem input (não foi à fal) fica fora, a fala segue a cena')
    const ex = J.planoDoEnvio({ kling4Candidato: true, kling4Input: () => { throw new Error('kling4_empty_plan') }, falas, inputs: [{ prompt: 'a' }] })
    const cl = J.planoDoEnvio({ kling4Candidato: false, kling4Input: () => input, falas, inputs: [{ prompt: 'a' }, { prompt: 'b' }, { prompt: 'c' }] })
    ok(ex.caminho === 'kling4_fallback_seedance' && cl.caminho === 'classico' && cl.cenas[2].fala === falas[2], 'K3 montar o input que lança = fallback (nunca derruba); sem candidato = clássico (o input do Kling 4 nem é lido)')
  }

  console.log('== V. derivação (código, não o modelo) ==')
  {
    const e = entrada()
    const v1 = J.vereditoDasRespostas(e, 'observe', RUIM)
    ok(v1.status === 'JUDGED' && v1.reprovado && JSON.stringify(v1.falhas) === '["a_ficha","b_nome_falso","d_sujeito"]' && v1.nota === 25 && JSON.stringify(v1.cenas_reescreveria) === '[1]', `V1 a "contradiz" + b "sim" (nome na posição de ficha) + d "não" = reprovado, nota ${v1.nota} = 100 − 25 × 3`)
    const semMarcaDeFicha = { ...RUIM, planos: [plano(1, { ficha_no_texto: 'A foggy forest path', historia_diz: 'C-54 Skymaster', a_ficha_contradiz: 'sim' }), plano(2), plano(3)], d_sujeito_aparece: 'sim' }
    const v2 = J.vereditoDasRespostas(e, 'observe', semMarcaDeFicha)
    ok(!v2.reprovado && v2.citacoes_descartadas === 1 && v2.descartes[0].includes('a_ficha'), 'V2 a "contradiz" sem ficha de verdade (sem marca da rota) é descartada')
    const historiaInventada = { ...semMarcaDeFicha, planos: [plano(1, { ficha_no_texto: FICHA_C54, historia_diz: 'a famous Soviet pilot', a_ficha_contradiz: 'sim' }), plano(2), plano(3)] }
    ok(!J.vereditoDasRespostas(e, 'observe', historiaInventada).reprovado, 'V2 a "contradiz" com "o que a história diz" que NÃO está no pedido/fala é descartada')
    const nomeComum = { ...BOM, planos: [plano(1, { b_nome_falso: 'sim', b_nome: 'forest' }), plano(2), plano(3)] }
    ok(!J.vereditoDasRespostas(e, 'observe', nomeComum).reprovado, 'V3 b "sim" com nome que não está como PERSONAGEM (ficha) no plano é descartado')
    const criaturaSemCitacao = { ...BOM, planos: [plano(1), plano(2, { c_criatura_no_lugar: 'sim', c_citacao: 'the bright pink unicorn' }), plano(3)] }
    const criaturaComCitacao = { ...BOM, planos: [plano(1), plano(2, { c_criatura_no_lugar: 'sim', c_citacao: 'Snowy mountains' }), plano(3)] }
    ok(!J.vereditoDasRespostas(e, 'observe', criaturaSemCitacao).reprovado && J.vereditoDasRespostas(e, 'observe', criaturaComCitacao).falhas.join() === 'c_criatura', 'V3 c "sim" só conta com citação que está no texto do plano')
    const tudoSemRosto: J.JuizPlanoEntrada = { ...e, cenas: e.cenas.map((c) => ({ ...c, prompt: `${c.prompt} faceless cinematic b-roll, no foreground human faces` })) }
    const pessoa = { ...BOM, d_sujeito: 'a criança', d_sujeito_e_pessoa: 'sim' }
    const vd = J.vereditoDasRespostas(tudoSemRosto, 'observe', pessoa)
    ok(vd.reprovado && vd.falhas.join() === 'd_sujeito' && vd.d_escondido_sem_rosto && vd.d_sujeito_aparece === 'nao', 'V4 sujeito humano + TODO plano no modo sem rosto = (d) reprova em código, mesmo com o modelo dizendo "aparece"')
    ok(!J.vereditoDasRespostas(tudoSemRosto, 'observe', BOM).reprovado && !J.vereditoDasRespostas(e, 'observe', pessoa).reprovado, 'V4 sujeito não humano sem rosto = ok; humano com pelo menos 1 plano visível = ok')
    const ve = J.vereditoDasRespostas(e, 'observe', { ...BOM, e_promessa: 'o que foi achado', e_final_entrega: 'nao', e_motivo: 'nunca diz' })
    ok(!ve.reprovado && ve.falhas.join() === 'e_final' && ve.nota === 75 && ve.motivo.startsWith('alerta') && JSON.stringify(ve.cenas_reescreveria) === '[3]', 'V5 (e) "não" = alerta (nota 75, último plano marcado), sozinho não reprova — regra do pedido: a/b/c/d reprovam')
    const vm = J.combinarLeituras(e, 'observe', [J.vereditoDasRespostas(e, 'observe', RUIM), J.vereditoDasRespostas(e, 'observe', BOM), J.vereditoDasRespostas(e, 'observe', BOM)])
    const vm2 = J.combinarLeituras(e, 'observe', [J.vereditoDasRespostas(e, 'observe', RUIM), J.vereditoDasRespostas(e, 'observe', RUIM), J.vereditoDasRespostas(e, 'observe', BOM)])
    ok(!vm.reprovado && vm.leituras_validas === 3 && vm2.reprovado && vm2.falhas.join() === 'a_ficha,b_nome_falso,d_sujeito' && vm2.defeitos.length >= 3, 'V6 maioria: falha em 1 de 3 leituras não conta; em 2 de 3 conta')
    const fora = J.vereditoDasRespostas(e, 'observe', { planos: 'x' })
    ok(fora.status === 'UNVERIFIED' && fora.nota === null && !fora.reprovado, 'V7 resposta fora do schema = UNVERIFIED (nunca vira aprovado nem reprovado)')
    const s = J.JUIZ_PLANO_SCHEMA.schema
    const props = Object.keys(s.properties), itens = Object.keys(s.properties.planos.items.properties)
    ok(J.JUIZ_PLANO_SCHEMA.strict === true && s.additionalProperties === false && s.properties.planos.items.additionalProperties === false && JSON.stringify([...s.required].sort()) === JSON.stringify([...props].sort()) && JSON.stringify([...s.properties.planos.items.required].sort()) === JSON.stringify([...itens].sort()) && ![...props, ...itens].some((k) => /score|nota|grade|rating/i.test(k)), 'V8 schema estrito (tudo obrigatório, nada a mais) e SEM campo de nota livre')
  }

  console.log('== R. a chamada ==')
  {
    const ch: Chamada[] = []
    const e = entrada()
    e.cenas[1] = { ...e.cenas[1], prompt: `${'x'.repeat(3990)} FIM_DO_PLANO_LONGO` }
    await J.esperarJuizDoPlano(J.iniciarJuizDoPlano(e, { modo: 'observe', apiKey: 'k', waitUntil: null, fetchImpl: fetchFalso(() => respostaN([BOM, BOM, BOM]), ch) }))
    const b = ch[0]?.body
    ok(ch.length === 1 && ch[0].url === 'https://api.openai.com/v1/chat/completions', `R1 UMA chamada à OpenAI (${ch.length})`)
    ok(b?.model === AI_TEXT_MODELS.utility && b?.n === J.JUIZ_PLANO_LEITURAS && b?.response_format?.type === 'json_schema' && b?.response_format?.json_schema?.strict === true, `R1 modelo ${b?.model} (utility), n=${b?.n} leituras na mesma requisição, json_schema estrito`)
    ok(JSON.stringify(b?.messages) === JSON.stringify(J.montarMensagensJuizPlano(e)), 'R1 mensagens = montarMensagensJuizPlano EXATAS')
    ok(String(b?.messages?.[1]?.content).includes('FIM_DO_PLANO_LONGO') && J.JUIZ_PLANO_PLANO_CHARS >= 6000, 'R2 sem o corte de 1.500: um plano de 4.000 caracteres chega inteiro ao juiz')
    ok(!String(b?.messages?.[1]?.content).includes('no watermark, no logo') && J.limparTextoDoPlano(`a ${J.FRASES_FIXAS_DO_PLANO[0]}b`) === 'a b', 'R3 só as frases FIXAS de estilo saem (literais), o resto do plano fica')
    ok(!/regua95|coherence_v2|pixel_score/.test(rota), 'R4 a rota continua sem "regua95|coherence_v2|pixel_score" (R1 do meta95 intacto)')
  }

  console.log('== F. falha segura ==')
  {
    const casos: Array<[string, () => Response | Promise<Response>, string]> = [
      ['rede caída', () => { throw new Error('ECONNRESET') }, 'erro'],
      ['HTTP 500', () => new Response('x', { status: 500 }), 'http_500'],
      ['JSON inválido', () => respostaN(['isto não é json {', 'nem isto']), 'json_invalido'],
      ['fora do schema', () => respostaN([{ foo: 1 }]), 'resposta_fora_do_schema'],
    ]
    for (const [nome, resp, motivo] of casos) {
      const v = await J.esperarJuizDoPlano(J.iniciarJuizDoPlano(entrada(), { modo: 'observe', apiKey: 'k', waitUntil: null, fetchImpl: fetchFalso(resp, []) }))
      ok(!!v && v.status === 'UNVERIFIED' && v.nota === null && !v.reprovado && v.motivo === motivo, `F1 ${nome} → UNVERIFIED (${v?.motivo})`)
    }
    const ch: Chamada[] = []
    const semChave = await J.esperarJuizDoPlano(J.iniciarJuizDoPlano(entrada(), { modo: 'observe', apiKey: '', waitUntil: null, fetchImpl: fetchFalso(() => respostaN([BOM]), ch) }))
    ok(!!semChave && semChave.status === 'UNVERIFIED' && semChave.motivo === 'sem_chave' && ch.length === 0, 'F2 sem chave → UNVERIFIED sem chamada nenhuma')
    let eventos = 0
    const nuncaVolta = (async () => new Promise<Response>(() => {})) as unknown as typeof fetch
    const t0 = Date.now()
    const vp = await J.esperarJuizDoPlano(J.iniciarJuizDoPlano(entrada(), { modo: 'observe', apiKey: 'k', tetoMs: 300, waitUntil: null, fetchImpl: nuncaVolta, aoDecidir: () => { eventos++ } }), 300)
    const dt = Date.now() - t0
    ok(!!vp && vp.status === 'UNVERIFIED' && vp.motivo === 'prazo' && dt >= 250 && dt < 2000, `F3 fetch que nunca volta → UNVERIFIED 'prazo' (${dt} ms, teto 300)`)
    await esperarMs(100)
    ok(eventos === 1, `F3 o evento sai UMA vez mesmo no prazo (${eventos})`)
    const vx = await J.esperarJuizDoPlano(J.iniciarJuizDoPlano(entrada(), { modo: 'observe', apiKey: 'k', waitUntil: null, fetchImpl: fetchFalso(() => respostaN([BOM]), []), aoDecidir: () => { throw new Error('banco fora') } }))
    const vy = await J.esperarJuizDoPlano(J.iniciarJuizDoPlano(entrada(), { modo: 'observe', apiKey: 'k', waitUntil: null, fetchImpl: fetchFalso(() => respostaN([BOM]), []), aoDecidir: () => Promise.reject(new Error('banco fora')) }))
    ok(!!vx && vx.status === 'JUDGED' && !!vy && vy.status === 'JUDGED', 'F4 evento que explode (síncrono ou promessa) não derruba o veredito')
    const preso: J.JuizPlanoHandle = { inicio: Date.now() - 60_000, veredito: new Promise(() => {}) }
    ok((await J.esperarJuizDoPlano(preso)) === null, 'F5 esperar() conta o teto do INÍCIO: handle preso há 60 s volta null')
  }

  console.log('== E. evento juiz_plano_verdict ==')
  {
    const gravados: J.JuizPlanoVeredito[] = []
    const entregues: Promise<unknown>[] = []
    let gravouAntesDeResolver = false
    const h = J.iniciarJuizDoPlano(entrada(), { modo: 'observe', apiKey: 'k', waitUntil: (p) => { entregues.push(p) }, fetchImpl: fetchFalso(() => respostaN([RUIM, RUIM, RUIM]), []), aoDecidir: async (x) => { await esperarMs(5); gravados.push(x) } })
    ok(entregues.length === 1 && entregues[0] === h?.veredito, 'E1 a promessa do juiz (com o evento dentro) vai ao waitUntil da requisição: sobrevive à resposta sem segurar nada')
    await entregues[0]
    gravouAntesDeResolver = gravados.length === 1
    ok(gravouAntesDeResolver && J.JUIZ_PLANO_EVENT === 'juiz_plano_verdict', 'E1 quando a promessa entregue resolve, o evento JÁ foi gravado (UMA vez)')
    const campos = ['versao', 'modo', 'caminho', 'status', 'reprovado', 'nota', 'falhas', 'defeitos', 'cenas_reescreveria', 'motivo', 'leituras_falhas', 'usd', 'ms']
    ok(campos.every((c) => c in gravados[0]) && gravados[0].caminho === 'kling4_gratis' && gravados[0].usd > 0, `E2 o evento leva veredito, falhas, defeitos com citação curta, planos, custo (US$ ${gravados[0]?.usd}) e caminho`)
    ok(posicoes(rota).evento, 'E3 a rota grava JUIZ_PLANO_EVENT com sessionId = generationId e dry_run verdadeiro SÓ no ensaio de $0 (dry_run:"stills" no hollywood é render pago), pelos 3 pontos (hollywood, ensaio, clássico)')
  }

  console.log('== D. off desliga ==')
  {
    const ch: Chamada[] = []
    let eventos = 0
    const h = J.iniciarJuizDoPlano(entrada(), { modo: 'off', apiKey: 'k', waitUntil: null, fetchImpl: fetchFalso(() => respostaN([RUIM]), ch), aoDecidir: () => { eventos++ } })
    const v = await J.esperarJuizDoPlano(h)
    await esperarMs(20)
    ok(h === null && v === null && ch.length === 0 && eventos === 0, 'D1 off: handle null, nenhuma chamada, nenhum evento, esperar(null) = null (sem medir relógio)')
    const anterior = process.env.JUIZ_PLANO_MODE
    process.env.JUIZ_PLANO_MODE = 'off'
    const h2 = J.iniciarJuizDoPlano(entrada(), { apiKey: 'k', waitUntil: null, fetchImpl: fetchFalso(() => respostaN([RUIM]), ch) })
    if (anterior === undefined) delete process.env.JUIZ_PLANO_MODE; else process.env.JUIZ_PLANO_MODE = anterior
    ok(h2 === null && ch.length === 0, 'D2 JUIZ_PLANO_MODE=off no ambiente desliga sem passar modo')
  }

  console.log('== T. recibo TRAVA 8.2 (padrão 85a82bbe9) ==')
  {
    ok(/^[0-9a-f]{40}$/.test(BASE) && Object.keys(JUIZ_PLANO_0111.scope).join() === ROTA && Object.keys(JUIZ_PLANO_0111.addedSources).join() === 'lib/juizDoPlano.ts', `T1 recibo: base ${BASE.slice(0, 9)}, rota alterada + lib nova`)
    ok(base !== null && lf(semJuizPlano0111(rota, ROTA)) === base && deltaJuizPlano0111Exato(rota, base, ROTA) === true, 'T2 desfazer o recibo devolve a rota da base byte a byte')
    ok(deltaJuizPlano0111Exato(rota + '\n// edição desconhecida\n', base, ROTA) === false && deltaJuizPlano0111Exato(lib, null, 'lib/juizDoPlano.ts') === true && deltaJuizPlano0111Exato(lib + ' ', null, 'lib/juizDoPlano.ts') === false, 'T3 edição fora do recibo continua reprovando (rota e lib)')
  }

  console.log('== M. mutantes ==')
  {
    const linhaC = rota.split('\n').find((l) => l.startsWith('    iniciarJuizDoPlano({ ...planoDoEnvio({ kling4Candidato: kling4TrialCandidate,'))!
    const m1 = rota.replace(linhaC, `${linhaC.split(' // ')[0]}; classicScenePrompts[0] = 'x' // ${MARCA}`)
    ok(m1 !== rota && !soLeitura(m1), 'M1 linha da marca que escreve num prompt → O2 vermelho')
    const m2 = rota.replace(linhaC, linhaC.split(' // ')[0])
    ok(m2 !== rota && (base === null || semMarca(m2) !== base), 'M2 linha nova sem a marca → O3 vermelho')
    const m3 = rota.replace(linhaC + '\n', '').replace('    let kling4Trial: Kling4TrialResult | null = null\n', `    let kling4Trial: Kling4TrialResult | null = null\n${linhaC}\n`)
    ok(m3 !== rota && !posicoes(m3).classico, 'M3 juiz do clássico antes do 1º POST → P2 vermelho')
    const m4 = rota.replace(linhaC, linhaC.replace('    iniciarJuizDoPlano(', '    await esperarJuizDoPlano(iniciarJuizDoPlano(').replace('{ aoDecidir: registrarJuizPlano })', '{ aoDecidir: registrarJuizPlano }))'))
    ok(m4 !== rota && !posicoes(m4).semEsperaNoPago, 'M4 espera do veredito no caminho pago → P3 vermelho')
    const m5 = rota.replace('      if (estrelaAtiva) response = { ...response, estrela_sobretaxa_cr', '      response = { ...response, juiz_plano: null }\n      if (estrelaAtiva) response = { ...response, estrela_sobretaxa_cr')
    ok(m5 !== rota && !posicoes(m5).publicadorSemJuiz, 'M5 veredito na resposta ao cliente → O4 vermelho')
    const m6 = rota.replace('dry_run: body.dry_run === true, ...v } })', 'dry_run: body.dry_run === true || ehPedidoDeStills(body.dry_run), ...v } })')
    ok(m6 !== rota && !posicoes(m6).evento, 'M6 evento marcando dry_run para dry_run:"stills" (render pago no hollywood) → E3 vermelho')
    const m8 = rota.replace('cenas: plan.scenes.slice(0, hDispositions.length).map((s, i)', 'cenas: plan.scenes.map((s, i)')
    ok(m8 !== rota && !posicoes(m8).hollywoodTextoEnviado, 'M8 hollywood julgando também as cenas não enviadas → P1 vermelho')
    const linhaH = rota.split('\n').find((l) => l.startsWith("      iniciarJuizDoPlano({ caminho: 'hollywood'"))!
    const m7 = rota.replace(linhaH + '\n', '').replace('      for (const [idx, hs] of plan.scenes.entries()) {', `${linhaH}\n      for (const [idx, hs] of plan.scenes.entries()) {`)
    ok(m7 !== rota && !posicoes(m7).hollywood, 'M7 hollywood julgando antes do laço que reescreve hs.prompt → P1 vermelho')
  }

  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok · ${fail} falha(s)`)
  if (fail > 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
