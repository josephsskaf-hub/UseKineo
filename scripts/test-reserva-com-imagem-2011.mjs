// KINEO-RESERVA-COM-IMAGEM-2011 [CEO 20/11, prova C filme 3; cliente eec8a2d3] — guardião sem rede e sem render.
// Executa o ensureKling4TrialFallback REAL (lib/kling4TrialFallback.ts) com o claim em memória (as funções puras REAIS de lib/cinematic/claim.ts:
// marcadorDaReservaIniciada, modeloDaReservaDoTeste, entradaDaReserva) e o banco falso das vagas, nos 3 casos reais (fixture com as cenas
// ASSINADAS da reserva; 5910c0e8 com os textos encurtados, o look e a ação ficam). Mostra o modelo e o corpo que iriam ao motor ANTES × DEPOIS.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let falhas = 0
const ok = (c, n) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const LIB = 'lib/cinematic/reservaComImagem2011.ts', ENVIO = 'lib/kling4TrialFallback.ts', CLAIM = 'lib/cinematic/claim.ts', EVT = 'app/api/events/route.ts'
const ler = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const CASOS = JSON.parse(ler('scripts/fixtures/reserva-com-imagem-2011-casos.json'))
const H3_I2V = 'minimax/h3-max-turbo/image-to-video', H3_T2V = 'minimax/h3-max-turbo/text-to-video'
const NOSSA = (i) => `https://abc.supabase.co/storage/v1/object/public/broll/ai-still/reserva-${i}.jpg`

/** Um mundo: o envio real com o claim em memória. `over` troca a fonte de um arquivo (mutante). */
function mundo(over = {}) {
  const fonte = (rel, src) => over[rel] ?? src
  const C = createOfflineLoader({ source: fonte })('@/' + CLAIM) // as funções puras reais do claim
  const eventos = []
  const estado = { claim: null, starts: [], switches: [] }
  const claimFalso = {
    ...C,
    loadVerifiedCinematicClaim: async () => ({ ok: true, claim: estado.claim }),
    startKling4TrialFallback: async (a) => {
      estado.starts.push({ imagens: a.imagensDaReserva ?? null })
      const m = estado.claim.response.kling4_trial
      if (m.fallback_started === true) return { ok: true, claim: estado.claim }
      estado.claim = { ...estado.claim, response: { ...estado.claim.response, kling4_trial: C.marcadorDaReservaIniciada(m, a.reason, a.imagensDaReserva ?? null) } }
      return { ok: true, claim: estado.claim }
    },
    switchKling4TrialToSeedanceFallback: async (a) => {
      const shots = estado.claim.response.kling4_trial.fallback_scenes
      const model = C.modeloDaReservaDoTeste(shots) // a mesma regra do claim, sobre as cenas ASSINADAS
      estado.switches.push({ model, inputs: shots.map((s) => C.entradaDaReserva(s, model)) })
      return { ok: true, claim: estado.claim }
    },
  }
  const F = createOfflineLoader({ source: fonte, mocks: {
    '@/lib/cinematic/claim': claimFalso,
    '@/lib/fastAiScene': { generateFastSceneStill: async () => { throw new Error('o guardião injeta o desenho') }, fastStillSeed: () => 1 },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
    '@/lib/semConviteDeLetreiro': { entradaSemConviteDeLetreiro: (_m, x) => x },
  }, globals: { setTimeout, clearTimeout } })('@/' + ENVIO)
  const L = createOfflineLoader({ source: fonte, globals: { setTimeout, clearTimeout } })('@/' + LIB)
  return { F, L, C, estado, eventos }
}
const claimDe = (caso, extra = {}) => ({ falRequestIds: ['kling-1'], falModels: ['kling/v4/text-to-video'], authorizedCompletedUrls: [null], quality: 'cinematic_ai',
  response: { duration: 15, aspect: '9:16', kling4_trial: { version: 'kling4_trial_2810', engine_used: 'kling4', original_request_id: 'kling-1', fallback_scenes: caso.shots,
    fallback_response: { scenes: ['a', 'b', 'c'] }, ...extra } } })
const dbFalso = () => ({ rpc: async (nome) => (nome === 'claim_kling4_trial_fallback_scene' ? { data: { code: 'claimed' } } : nome === 'finalize_kling4_trial_fallback' ? { data: { code: 'finalized', request_ids: ['r1', 'r2', 'r3'], ambiguous: false } } : { data: null }) })

let OVER_DA_PROVA = {} // o mutante da prova em curso (as provas rodam uma por vez)
async function rodar(caso, { ligado, desenhar, over = OVER_DA_PROVA, extra = {} }) {
  const W = mundo(over)
  W.estado.claim = claimDe(caso, extra)
  const postsH3 = [], postsT2V = [], desenhos = []
  const r = await W.F.ensureKling4TrialFallback({ db: dbFalso(), secret: 's', userId: 'u', generationId: '76c4c5c4-b954-419c-85c4-e4d90c7a83fc', claim: W.estado.claim, reason: caso.reason,
    reservaComImagem: ligado,
    desenharImagem: async (prompt, i) => { desenhos.push(i); return desenhar ? desenhar(prompt, i) : null },
    submit: async (input) => { postsT2V.push(input); return 'r' + postsT2V.length },
    submitH3: async (input) => { postsH3.push(input); return 'h' + postsH3.length } })
  return { r, W, postsH3, postsT2V, desenhos }
}

async function provas(over = {}) {
  const erros = []
  const no = (ruim, msg) => { if (ruim) erros.push(msg) }
  OVER_DA_PROVA = over
  const W0 = mundo(over)
  // a lib, direto
  { const s76 = CASOS['76c4c5c4'].shots
    no(W0.L.cenasComImagens(s76, [NOSSA(0), null, null]) !== null || W0.L.cenasComImagens(s76, [NOSSA(0), NOSSA(1), null])?.[1]?.image_url !== NOSSA(1) || W0.L.cenasComImagens(s76, [NOSSA(0), NOSSA(1), null])?.[2]?.image_url !== s76[2].image_url, 'U1 cenasComImagens: só com TODAS as que faltavam; a aprovada fica')
    no(W0.L.imagemDaReservaValida('https://v3b.fal.media/files/x/0.png') || !W0.L.imagemDaReservaValida(NOSSA(0)) || W0.L.imagemDaReservaValida('http://x/a.png'), 'U2 imagem válida = https e do nosso bucket (a da fal expira)') }
  no(W0.L.RESERVA_COM_IMAGEM_2011 !== 'off' || W0.L.reservaComImagemLigada('off') || !W0.L.reservaComImagemLigada('all'), "A0 o commit nasce 'off' (ligar = gasto por filme na reserva: sim do dono)")
  for (const [g, caso] of Object.entries(CASOS).filter(([k]) => !k.startsWith('_'))) {
    const faltam = caso.shots.map((s, i) => (s.image_url ? -1 : i)).filter((i) => i >= 0)
    // ANTES (desligado = hoje): H3 só de texto no filme inteiro, nenhum desenho
    const a = await rodar(caso, { ligado: false })
    no(a.desenhos.length || a.postsH3.length || a.postsT2V.length !== 3 || a.W.estado.switches[0]?.model !== H3_T2V, `B1 ${g} desligado: o caminho de hoje (H3 só de texto, nada desenhado) (${a.W.estado.switches[0]?.model})`)
    // DEPOIS (ligado): as cenas sem imagem ganham a imagem; H3 com imagem nas 3; o texto da cena não muda
    const d = await rodar(caso, { ligado: true, desenhar: async (_p, i) => NOSSA(i) })
    const sw = d.W.estado.switches[0]
    no(JSON.stringify(d.desenhos) !== JSON.stringify(faltam), `D1 ${g}: desenha só as cenas sem imagem (${JSON.stringify(d.desenhos)} ≠ ${JSON.stringify(faltam)})`)
    no(sw?.model !== H3_I2V || d.postsH3.length !== 3 || d.postsT2V.length, `D2 ${g}: H3 com imagem nas 3 cenas, nenhum H3 só de texto (${sw?.model}, ${d.postsH3.length}/${d.postsT2V.length})`)
    no(d.postsH3.some((p, i) => p.prompt !== caso.shots[i].prompt || p.duration !== caso.shots[i].duration || p.image_url !== (caso.shots[i].image_url ?? NOSSA(i)) || p.resolution !== '768P' || 'aspect_ratio' in p), `D3 ${g}: o corpo do H3 = o texto da cena + a imagem (a aprovada, ou a desenhada no nosso bucket)`)
    no(!d.W.estado.claim.response.kling4_trial.reserva_com_imagem || JSON.stringify(d.W.estado.claim.response.kling4_trial.reserva_com_imagem.cenas_desenhadas) !== JSON.stringify(faltam), `D4 ${g}: as imagens entram no claim na transição que começa a reserva (assinadas)`)
    const ev = d.W.eventos.find((e) => e.name === 'kling4_reserva_com_imagem')
    no(!ev || ev.metadata.ok !== true || JSON.stringify(ev.metadata.desenhadas) !== JSON.stringify(faltam) || JSON.stringify(ev.metadata).includes('https://') || JSON.stringify(ev.metadata).includes(caso.shots[0].prompt.slice(0, 40)), `D5 ${g}: o evento só com contagens (nunca URL nem texto)`)
    if (g === '76c4c5c4') console.log(`    ${g} ANTES: ${a.W.estado.switches[0]?.model} × 3 · DEPOIS: ${sw?.model} × 3, desenhadas ${JSON.stringify(d.desenhos.map((i) => i + 1))}, US$ ${ev?.metadata?.usd}`)
  }
  const n = CASOS['76c4c5c4']
  // falha parcial = o caminho de hoje inteiro (nunca motor misturado)
  { const p = await rodar(n, { ligado: true, desenhar: async (_p, i) => (i === 0 ? NOSSA(0) : null) })
    no(p.W.estado.switches[0]?.model !== H3_T2V || p.postsH3.length || p.W.estado.claim.response.kling4_trial.reserva_com_imagem || p.W.estado.claim.response.kling4_trial.fallback_scenes.some((s, i) => s.image_url !== n.shots[i].image_url), 'E1 uma imagem falhou: o filme inteiro no caminho de hoje, o claim sem imagem nova') }
  // URL da fal (expira) não vale
  { const p = await rodar(n, { ligado: true, desenhar: async (_p, i) => `https://v3b.fal.media/files/x/${i}.png` })
    no(p.W.estado.switches[0]?.model !== H3_T2V, 'E2 imagem que não é do nosso bucket (URL da fal, expira) não vale') }
  // desenho que pendura: o teto solta (o guardião usa 25 s reais? não: o teto é argumento; aqui pela lib)
  { const W = mundo(over); const t0 = Date.now()
    const r = await W.L.desenharImagensDaReserva(n.shots, () => new Promise(() => {}), 60)
    no(r.relato.ok || Date.now() - t0 > 400 || r.imagens.some(Boolean), `E3 desenho pendurado: solta no teto, sem imagem (${Date.now() - t0} ms)`) }
  // reserva já começada (outra chamada): nada desenhado, usa as cenas assinadas
  { const p = await rodar(n, { ligado: true, desenhar: async (_p, i) => NOSSA(i), extra: { fallback_started: true, fallback_reason: 'timeout' } })
    no(p.desenhos.length || p.W.estado.switches[0]?.model !== H3_T2V, 'E4 reserva já começada: nada é desenhado; vale o que está assinado') }
  // concorrência: outra chamada começou a reserva COM imagens enquanto esta desenhava → esta usa as assinadas
  { const W = mundo(over); W.estado.claim = claimDe(n)
    const posts = []
    const r = await W.F.ensureKling4TrialFallback({ db: dbFalso(), secret: 's', userId: 'u', generationId: '76c4c5c4-b954-419c-85c4-e4d90c7a83fc', claim: W.estado.claim, reason: 'timeout', reservaComImagem: true,
      desenharImagem: async (_p, i) => { if (i === 0) { const m = W.estado.claim.response.kling4_trial; W.estado.claim = { ...W.estado.claim, response: { ...W.estado.claim.response, kling4_trial: W.C.marcadorDaReservaIniciada(m, 'timeout', [NOSSA(10), NOSSA(11), null]) } } } return NOSSA(i) },
      submit: async (x) => { posts.push(['t2v', x]); return 'r' }, submitH3: async (x) => { posts.push(['i2v', x]); return 'h' } })
    no(posts.some(([k]) => k !== 'i2v') || posts[0]?.[1]?.image_url !== NOSSA(10), 'E5 concorrência: quem chega depois usa as imagens ASSINADAS pela outra chamada (nunca as suas)') }
  // o estilo do still: a cena desenhada (3D) não ganha o sufixo fotorreal
  { const L = W0.L
    no(L.estiloDoStillDaReserva(CASOS['5910c0e8'].shots[1].prompt)?.look !== 'animated3d' || L.estiloDoStillDaReserva(n.shots[0].prompt) !== null || L.estiloDoStillDaReserva('A cat.') !== null, 'E6 o still da reserva segue o meio que a cena escreve (3D = sem o sufixo fotorreal)') }
  // a ligação
  { const envio = over[ENVIO] ?? ler(ENVIO), claim = over[CLAIM] ?? ler(CLAIM), ev = over[EVT] ?? ler(EVT)
    no(!claim.includes("const nextResponse = { ...response, kling4_trial: marcadorDaReservaIniciada(marker, args.reason, args.imagensDaReserva ?? null) }"), 'L1 a transição real (startKling4TrialFallback) usa a função pura testada')
    no(!envio.includes("const started = await startKling4TrialFallback({ ...args, originalRequestId: original, reason: args.reason, imagensDaReserva })"), 'L2 o envio passa as imagens à transição que começa a reserva')
    no(!envio.includes('look: estiloDoStillDaReserva(prompt)') || !envio.includes("aspect: '9:16'"), 'L3 o desenho padrão é o still 9:16 da rota, no estilo da cena')
    const i0 = ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), lista = ev.slice(i0, ev.indexOf('])', i0))
    no(!/^\s*'kling4_reserva_com_imagem',/m.test(lista), 'L4 o evento é só do servidor') }
  return erros
}

const base = await provas()
ok(base.length === 0, `prova nos 3 casos reais${base.length ? ': ' + base.join(' · ') : ''}`)
const MUT = [
  ['ligado no commit', LIB, (s) => s.replace("export const RESERVA_COM_IMAGEM_2011: ModoReservaComImagem2011 = 'off'", "export const RESERVA_COM_IMAGEM_2011: ModoReservaComImagem2011 = 'all'")],
  ['desenha também a que já tem imagem', LIB, (s) => s.replace('const cenasSemImagem = (shots: ReadonlyArray<ReservaShot>): number[] => shots.map((s, i) => (temImagem(s) ? -1 : i))', 'const cenasSemImagem = (shots: ReadonlyArray<ReservaShot>): number[] => shots.map((s, i) => (false ? -1 : i))')],
  ['falha parcial mistura motor', LIB, (s) => s.replace('  if (faltam.some((i) => !imagemDaReservaValida(imagens[i]))) return null\n', '')],
  ['URL da fal vale', LIB, (s) => s.replace("&& !/(?:^|\\/\\/)[^/]*fal\\.(?:media|run|ai)\\//i.test(u)", '')],
  ['sem o teto do desenho', LIB, (s) => s.replace('    await Promise.race([todas, new Promise<void>((ok) => { tm = setTimeout(ok, Math.max(1, tetoMs)) })])', '    await todas')],
  ['estilo sempre fotorreal', LIB, (s) => s.replace('  if (!meio || !(', '  if (true || !(')],
  ['claim ignora as imagens', CLAIM, (s) => s.replace("  const comImagens = imagens && Array.isArray(marker.fallback_scenes) ? cenasComImagens(marker.fallback_scenes as ReservaShot[], imagens) : null", '  const comImagens = null as ReservaShot[] | null')],
  ['envio não passa as imagens', ENVIO, (s) => s.replace('reason: args.reason, imagensDaReserva })', 'reason: args.reason })')],
  ['envio usa as cenas de antes da transição', ENVIO, (s) => s.replace('  if (Array.isArray(assinadas) && assinadas.length === 3) shots = assinadas as typeof shots\n', '')],
  ['desenha mesmo com a reserva começada', ENVIO, (s) => s.replace(' && marker.fallback_started !== true && cenasSemImagem(shots).length > 0)', ' && cenasSemImagem(shots).length > 0)')],
  // (sem mutante para 'passa a imagem mesmo com falha': é equivalente — a CAS do claim (cenasComImagens) já recusa imagem parcial, U1 e E1)
  ['evento com URL', ENVIO, (s) => s.replace("metadata: { generation_id: args.generationId, ...relatoImagem,", "metadata: { generation_id: args.generationId, ...relatoImagem, imagens: imagensDaReserva,")],
  ['evento fora da lista', EVT, (s) => s.replace("  'kling4_reserva_com_imagem', //", "  // 'kling4_reserva_com_imagem', //")],
]
for (const [nome, arq, f] of MUT) {
  const o = ler(arq), m = f(o)
  if (m === o) { ok(false, `mutante "${nome}" NÃO APLICOU`); continue }
  let e
  try { e = await Promise.race([provas({ [arq]: m }), new Promise((r) => setTimeout(() => r(['pendurou']), 15_000))]) } catch (x) { e = ['lançou: ' + x.message] }
  ok(e.length > 0, `mutante "${nome}" fica vermelho (${e.length} erro(s))`)
}
console.log(falhas ? `${falhas} falha(s)` : `PASS test-reserva-com-imagem-2011 (3 casos reais; ${MUT.length} mutantes)`)
process.exit(falhas ? 1 : 0)
