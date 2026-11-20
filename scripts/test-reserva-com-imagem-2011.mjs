// KINEO-RESERVA-COM-IMAGEM-2011 [CEO 20/11, prova C filme 3; cliente eec8a2d3; revisor 20/11] — guardião sem rede e sem render.
// Executa o ensureKling4TrialFallback REAL (lib/kling4TrialFallback.ts) com o claim em memória — as funções puras REAIS de lib/cinematic/claim.ts
// (marcadorDaReservaIniciada, marcadorComImagensDaReserva, modeloDaReservaDoTeste, entradaDaReserva) dentro de uma CAS falsa — e o banco falso das
// vagas, nos 3 casos reais (fixture com as cenas ASSINADAS da reserva; 5910c0e8 com os textos encurtados). Mostra o modelo e o corpo que iriam ao
// motor ANTES × DEPOIS, e prova UM desenho por filme sob concorrência, o dono sumido, a CAS perdida e a lista positiva do bucket.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let falhas = 0
const ok = (c, n) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const LIB = 'lib/cinematic/reservaComImagem2011.ts', ENVIO = 'lib/kling4TrialFallback.ts', CLAIM = 'lib/cinematic/claim.ts', EVT = 'app/api/events/route.ts'
const ler = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const CASOS = JSON.parse(ler('scripts/fixtures/reserva-com-imagem-2011-casos.json'))
const H3_I2V = 'minimax/h3-max-turbo/image-to-video', H3_T2V = 'minimax/h3-max-turbo/text-to-video'
const NOSSA = (i) => `https://abcdefgh.supabase.co/storage/v1/object/public/broll/ai-still/reserva-${i}.jpg`
const GEN = '76c4c5c4-b954-419c-85c4-e4d90c7a83fc'
let OVER_DA_PROVA = {} // o mutante da prova em curso (as provas rodam uma por vez)

/** Um mundo: o envio real com o claim em memória e uma CAS falsa por cima das funções puras reais. */
function mundo(over = OVER_DA_PROVA) {
  const fonte = (rel, src) => over[rel] ?? src
  const C = createOfflineLoader({ source: fonte })('@/' + CLAIM)
  const eventos = [], estado = { claim: null, switches: [], gravacoes: 0, perdeGravacao: false }
  const comMarcador = (m) => ({ ...estado.claim, response: { ...estado.claim.response, kling4_trial: m } })
  const claimFalso = {
    ...C,
    loadVerifiedCinematicClaim: async () => ({ ok: true, claim: estado.claim }),
    startKling4TrialFallback: async (a) => {
      const m = estado.claim.response.kling4_trial
      if (m.fallback_started === true) return { ok: true, claim: estado.claim } // a CAS: quem chega depois recebe o que está gravado
      estado.claim = comMarcador(C.marcadorDaReservaIniciada(m, a.reason, a.reservaDoDesenho ?? null))
      return { ok: true, claim: estado.claim }
    },
    gravarImagensDaReserva: async (a) => {
      estado.gravacoes++
      if (estado.perdeGravacao) return { ok: false, error: 'claim changed concurrently', conflict: true }
      const next = C.marcadorComImagensDaReserva(estado.claim.response.kling4_trial, a.dono, a.imagens, a.usd)
      if (!next) return { ok: false, error: 'not the drawing owner', conflict: true }
      estado.claim = comMarcador(next)
      return { ok: true, claim: estado.claim }
    },
    switchKling4TrialToSeedanceFallback: async () => {
      const shots = estado.claim.response.kling4_trial.fallback_scenes
      const model = C.modeloDaReservaDoTeste(shots)
      estado.switches.push({ model, inputs: shots.map((s) => C.entradaDaReserva(s, model)) })
      return { ok: true, claim: estado.claim }
    },
  }
  const F = createOfflineLoader({ source: fonte, mocks: {
    '@/lib/cinematic/claim': claimFalso,
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
function chamar(W, caso, { ligado = true, desenhar = null, agora = null, desenhos, posts }) {
  return W.F.ensureKling4TrialFallback({ db: dbFalso(), secret: 's', userId: 'u', generationId: GEN, claim: W.estado.claim, reason: caso.reason,
    reservaComImagem: ligado, ...(agora ? { agora } : {}),
    desenharImagem: async (prompt, i) => { desenhos.push(i); return desenhar ? desenhar(prompt, i) : null },
    submit: async (input) => { posts.push(['t2v', input]); return 'r' + posts.length },
    submitH3: async (input) => { posts.push(['i2v', input]); return 'h' + posts.length } })
}
async function rodar(caso, { ligado, desenhar, extra = {}, perdeGravacao = false, agora = null } = {}) {
  const W = mundo()
  W.estado.claim = claimDe(caso, extra); W.estado.perdeGravacao = perdeGravacao
  const desenhos = [], posts = []
  const r = await chamar(W, caso, { ligado, desenhar, agora, desenhos, posts })
  return { r, W, desenhos, posts, postsH3: posts.filter(([k]) => k === 'i2v').map(([, x]) => x), postsT2V: posts.filter(([k]) => k === 't2v').map(([, x]) => x) }
}

async function provas(over = {}) {
  const erros = []
  const no = (ruim, msg) => { if (ruim) erros.push(msg) }
  OVER_DA_PROVA = over
  const W0 = mundo(over), L = W0.L
  no(L.RESERVA_COM_IMAGEM_2011 !== 'off' || L.reservaComImagemLigada('off') || !L.reservaComImagemLigada('all'), "A0 o commit nasce 'off' (ligar = gasto por filme na reserva: sim do dono)")
  // a lib, direto
  { const s76 = CASOS['76c4c5c4'].shots
    no(L.cenasComImagens(s76, [NOSSA(0), null, null]) !== null || L.cenasComImagens(s76, [NOSSA(0), NOSSA(1), null])?.[1]?.image_url !== NOSSA(1) || L.cenasComImagens(s76, [NOSSA(0), NOSSA(1), null])?.[2]?.image_url !== s76[2].image_url, 'U1 cenasComImagens: só com TODAS as que faltavam; a aprovada fica')
    no(L.imagemDaReservaValida('https://v3b.fal.media/files/x/0.png') || L.imagemDaReservaValida('https://storage.googleapis.com/falserverless/x.png') || L.imagemDaReservaValida('https://evil.com/storage/v1/object/public/broll/ai-still/a.jpg') || L.imagemDaReservaValida('http://abcdefgh.supabase.co/storage/v1/object/public/broll/ai-still/a.jpg') || !L.imagemDaReservaValida(NOSSA(0)), 'U2 lista POSITIVA: só o nosso bucket (broll/ai-still no Supabase); fal, googleapis e outro domínio não')
    const parcial = await L.desenharImagensDaReserva(s76, async (_p, i) => (i === 0 ? NOSSA(0) : null), 1_000)
    no(parcial.relato.ok || JSON.stringify(parcial.relato.desenhadas) !== '[0]' || parcial.relato.usd !== 0.03, `U3 desenho parcial: relato.ok falso, conta a desenhada e o custo dela (${JSON.stringify(parcial.relato)})`)
    no(L.RESERVA_IMAGEM_TETO_MS !== 25_000 || L.RESERVA_IMAGEM_ESPERA_DO_DONO_MS !== 55_000 || !(over[LIB] ?? ler(LIB)).includes('tetoMs: number = RESERVA_IMAGEM_TETO_MS,') || !(over[ENVIO] ?? ler(ENVIO)).includes('const r = await desenharImagensDaReserva(shots, desenhar)\n'), 'U4 o teto do desenho é 25 s, padrão da lib e usado pelo envio; a espera pelo dono, 55 s') }
  // a 2ª CAS (pura, a real do claim): só o dono, só desenhando; parcial = sem_imagem com as cenas de antes
  { const s76 = CASOS['76c4c5c4'].shots, C = W0.C
    const m = { fallback_started: true, fallback_scenes: s76, reserva_com_imagem: { estado: 'desenhando', dono: 'a', desde: 'x', faltavam: [0, 1] } }
    no(C.marcadorComImagensDaReserva(m, 'b', [NOSSA(0), NOSSA(1), null], 0.06) !== null || C.marcadorComImagensDaReserva({ ...m, reserva_com_imagem: { ...m.reserva_com_imagem, estado: 'pronta' } }, 'a', [NOSSA(0), NOSSA(1), null], 0.06) !== null, 'U5 a 2ª CAS recusa quem não é o dono e o desenho já fechado')
    const parcial = C.marcadorComImagensDaReserva(m, 'a', [NOSSA(0), null, null], 0.03)
    no(parcial?.reserva_com_imagem?.estado !== 'sem_imagem' || parcial?.fallback_scenes !== s76 || parcial?.reserva_com_imagem?.usd !== 0.03, 'U6 imagem parcial = sem_imagem, as cenas como estavam, o custo pago registrado') }
  for (const [g, caso] of Object.entries(CASOS).filter(([k]) => !k.startsWith('_'))) {
    const faltam = caso.shots.map((s, i) => (s.image_url ? -1 : i)).filter((i) => i >= 0)
    const a = await rodar(caso, { ligado: false })
    no(a.desenhos.length || a.postsH3.length || a.postsT2V.length !== 3 || a.W.estado.switches[0]?.model !== H3_T2V || a.W.estado.claim.response.kling4_trial.reserva_com_imagem, `B1 ${g} desligado: o caminho de hoje (H3 só de texto, nada desenhado, nada reservado)`)
    const d = await rodar(caso, { ligado: true, desenhar: async (_p, i) => NOSSA(i) })
    const sw = d.W.estado.switches[0], rci = d.W.estado.claim.response.kling4_trial.reserva_com_imagem
    no(JSON.stringify(d.desenhos) !== JSON.stringify(faltam), `D1 ${g}: desenha só as cenas sem imagem (${JSON.stringify(d.desenhos)})`)
    no(sw?.model !== H3_I2V || d.postsH3.length !== 3 || d.postsT2V.length, `D2 ${g}: H3 com imagem nas 3 cenas, nenhum H3 só de texto`)
    no(d.postsH3.some((p, i) => p.prompt !== caso.shots[i].prompt || p.duration !== caso.shots[i].duration || p.image_url !== (caso.shots[i].image_url ?? NOSSA(i)) || p.resolution !== '768P' || 'aspect_ratio' in p), `D3 ${g}: o corpo do H3 = o texto da cena + a imagem`)
    no(rci?.estado !== 'pronta' || JSON.stringify(rci?.faltavam) !== JSON.stringify(faltam) || rci?.usd !== Math.round(faltam.length * 0.03 * 1000) / 1000, `D4 ${g}: as imagens e o custo do desenho no claim (estado pronta) (${JSON.stringify(rci)})`)
    const ev = d.W.eventos.find((e) => e.name === 'kling4_reserva_com_imagem')
    no(!ev || ev.metadata.ok !== true || ev.metadata.gravadas !== true || ev.metadata.usd !== rci?.usd || JSON.stringify(ev.metadata).includes('https://') || JSON.stringify(ev.metadata).includes(caso.shots[0].prompt.slice(0, 40)), `D5 ${g}: o evento com o custo e gravadas, só contagens (nunca URL nem texto)`)
    if (g === '76c4c5c4') console.log(`    ${g} ANTES: ${a.W.estado.switches[0]?.model} × 3 · DEPOIS: ${sw?.model} × 3, desenhadas ${JSON.stringify(d.desenhos.map((i) => i + 1))}, US$ ${rci?.usd}`)
  }
  const n = CASOS['76c4c5c4']
  { const p = await rodar(n, { ligado: true, desenhar: async (_p, i) => (i === 0 ? NOSSA(0) : null) })
    no(p.W.estado.switches[0]?.model !== H3_T2V || p.postsH3.length || p.W.estado.claim.response.kling4_trial.reserva_com_imagem?.estado !== 'sem_imagem' || p.W.estado.claim.response.kling4_trial.fallback_scenes.some((s, i) => s.image_url !== n.shots[i].image_url), 'E1 uma imagem falhou: o filme inteiro no caminho de hoje (sem_imagem), o claim sem imagem nova') }
  { const p = await rodar(n, { ligado: true, desenhar: async (_p, i) => `https://storage.googleapis.com/falserverless/${i}.png` })
    no(p.W.estado.switches[0]?.model !== H3_T2V, 'E2 imagem fora do nosso bucket não vale') }
  { const t0 = Date.now(); const r = await L.desenharImagensDaReserva(n.shots, () => new Promise(() => {}), 60)
    no(r.relato.ok || Date.now() - t0 > 400 || r.imagens.some(Boolean), 'E3 desenho pendurado: solta no teto, sem imagem') }
  // reserva já começada por outro dono que AINDA desenha: espera (nenhum desenho, nenhum POST)
  { const T = Date.parse('2026-11-20T06:00:00Z')
    const p = await rodar(n, { ligado: true, desenhar: async (_p, i) => NOSSA(i), agora: () => T + 10_000, extra: { fallback_started: true, fallback_reason: 'timeout', reserva_com_imagem: { estado: 'desenhando', dono: 'outro', desde: new Date(T).toISOString(), faltavam: [0, 1] } } })
    no(p.desenhos.length || p.posts.length || !p.r.pending, 'E4 o dono desenha há 10 s: quem chega espera (nenhum desenho, nenhum POST)')
    const q = await rodar(n, { ligado: true, desenhar: async (_p, i) => NOSSA(i), agora: () => T + 120_000, extra: { fallback_started: true, fallback_reason: 'timeout', reserva_com_imagem: { estado: 'desenhando', dono: 'outro', desde: new Date(T).toISOString(), faltavam: [0, 1] } } })
    no(q.desenhos.length || q.W.estado.claim.response.kling4_trial.reserva_com_imagem?.estado !== 'sem_imagem' || q.W.estado.switches[0]?.model !== H3_T2V, 'E5 o dono sumiu (2 min): assume sem imagem, SEM desenhar de novo, e segue o caminho de hoje') }
  // UM desenho por filme sob concorrência: o poller do cliente e o cron ao mesmo tempo
  { const W = mundo(); W.estado.claim = claimDe(n)
    const desenhos = [], postsA = [], postsB = []
    let solta; const segura = new Promise((r) => { solta = r })
    const A = chamar(W, n, { desenhar: async (_p, i) => { await segura; return NOSSA(i) }, desenhos, posts: postsA })
    await new Promise((r) => setTimeout(r, 20))
    const rB = await chamar(W, n, { desenhar: async (_p, i) => NOSSA(i), desenhos, posts: postsB })
    const rC = await chamar(W, n, { desenhar: async (_p, i) => NOSSA(i), desenhos, posts: postsB })
    solta(); await A
    no(desenhos.length !== 2 || !rB.pending || !rC.pending || postsB.length || postsA.filter(([k]) => k === 'i2v').length !== 3, `E6 3 chamadas ao mesmo tempo: UM desenho (2 cenas, não 6), as outras esperam sem POST (${desenhos.length} desenhos)`) }
  // a 2ª CAS perde: o gasto do desenho fica no evento (gravadas falso), e nenhum POST
  { const p = await rodar(n, { ligado: true, desenhar: async (_p, i) => NOSSA(i), perdeGravacao: true })
    const ev = p.W.eventos.find((e) => e.name === 'kling4_reserva_com_imagem')
    no(!ev || ev.metadata.gravadas !== false || ev.metadata.usd !== 0.06 || p.posts.length || !p.r.pending, `E7 a CAS da gravação perdeu: o evento registra o desenho pago (US$ 0,06, gravadas falso) e nada vai à fal (${JSON.stringify(ev?.metadata)})`) }
  { no(L.estiloDoStillDaReserva(CASOS['5910c0e8'].shots[1].prompt)?.look !== 'animated3d' || L.estiloDoStillDaReserva(n.shots[0].prompt) !== null || L.estiloDoStillDaReserva('A cat.') !== null, 'E8 o still da reserva segue o meio que a cena escreve') }
  { const envio = over[ENVIO] ?? ler(ENVIO), claim = over[CLAIM] ?? ler(CLAIM), ev = over[EVT] ?? ler(EVT)
    no(!claim.includes('  const nextResponse = { ...response, kling4_trial: marcadorDaReservaIniciada(marker, args.reason, args.reservaDoDesenho ?? null) }') || !claim.includes('  const next = marcadorComImagensDaReserva(marker, args.dono, args.imagens, args.usd)'), 'L1 as duas CAS reais usam as funções puras testadas')
    no(/^import [^\n]*fastAiScene/m.test(envio) || !envio.includes("await import('@/lib/fastAiScene')"), 'L2 o fastAiScene (e o SDK da fal) só é importado quando desenha')
    no(!envio.includes("look: estiloDoStillDaReserva(prompt)") || !envio.includes("aspect: '9:16'"), 'L3 o desenho padrão é o still 9:16 da rota, no estilo da cena')
    const i0 = ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), lista = ev.slice(i0, ev.indexOf('])', i0))
    no(!/^\s*'kling4_reserva_com_imagem',/m.test(lista), 'L4 o evento é só do servidor') }
  return erros
}

const base = await provas()
ok(base.length === 0, `prova nos 3 casos reais${base.length ? ': ' + base.join(' · ') : ''}`)
const MUT = [
  ['ligado no commit', LIB, (s) => s.replace("export const RESERVA_COM_IMAGEM_2011: ModoReservaComImagem2011 = 'off'", "export const RESERVA_COM_IMAGEM_2011: ModoReservaComImagem2011 = 'all'")],
  ['desenha também a que já tem imagem', LIB, (s) => s.replace('shots.map((s, i) => (temImagem(s) ? -1 : i))', 'shots.map((s, i) => (false ? -1 : i))')],
  ['falha parcial mistura motor', LIB, (s) => s.replace('  if (faltam.some((i) => !imagemDaReservaValida(imagens[i]))) return null\n', '')],
  ['lista negativa (só tira a fal)', LIB, (s) => s.replace("export const imagemDaReservaValida = (u: unknown): u is string => typeof u === 'string' && NOSSO_BUCKET_DA_IMAGEM_RE.test(u)", "export const imagemDaReservaValida = (u: unknown): u is string => typeof u === 'string' && /^https:\\/\\//.test(u) && !/fal\\.media/.test(u)")],
  ['sem o teto do desenho', LIB, (s) => s.replace('    await Promise.race([todas, new Promise<void>((ok) => { tm = setTimeout(ok, Math.max(1, tetoMs)) })])', '    await todas')],
  ['teto padrão de 250 s', LIB, (s) => s.replace('export const RESERVA_IMAGEM_TETO_MS = 25_000', 'export const RESERVA_IMAGEM_TETO_MS = 250_000')],
  ['relato ok com desenho parcial', LIB, (s) => s.replace('ok: faltam.length > 0 && desenhadas.length === faltam.length,', 'ok: desenhadas.length > 0,')],
  ['custo 0 no relato', LIB, (s) => s.replace('usd: Math.round(desenhadas.length * RESERVA_IMAGEM_USD * 1000) / 1000 }', 'usd: 0 }')],
  ['estilo sempre fotorreal', LIB, (s) => s.replace('  if (!meio || !(', '  if (true || !(')],
  ['claim: o desenho não é reservado na CAS', CLAIM, (s) => s.replace("    ...(desenho && faltam.length ? { reserva_com_imagem:", "    ...(false ? { reserva_com_imagem:")],
  ['claim: qualquer um grava (sem conferir o dono)', CLAIM, (s) => s.replace("if (!r || r.estado !== 'desenhando' || r.dono !== dono ||", "if (!r ||")],
  ['claim: imagem parcial vira pronta', CLAIM, (s) => s.replace('  const comImagens = imagens ? cenasComImagens(marker.fallback_scenes as ReservaShot[], imagens) : null\n  const custo', '  const comImagens = imagens ? (marker.fallback_scenes as ReservaShot[]).map((x, i) => (imagens[i] ? { ...x, image_url: imagens[i] } : x)) : null\n  const custo')],
  ['claim: custo fora do claim', CLAIM, (s) => s.replace("reserva_com_imagem: { ...r, estado: 'pronta', usd: custo }", "reserva_com_imagem: { ...r, estado: 'pronta', usd: 0 }")],
  ['envio: desenha sem ser o dono', ENVIO, (s) => s.replace("    if (rci.dono === dono) {", "    if (true) {")],
  ['envio: não espera o dono', ENVIO, (s) => s.replace('      if (Number.isFinite(desde) && agora() - desde < RESERVA_IMAGEM_ESPERA_DO_DONO_MS) return pending(claim)\n', '')],
  ['envio: o dono sumido nunca é assumido', ENVIO, (s) => s.replace('      if (Number.isFinite(desde) && agora() - desde < RESERVA_IMAGEM_ESPERA_DO_DONO_MS) return pending(claim)', '      return pending(claim)')],
  ['envio: segue sem a 2ª CAS', ENVIO, (s) => s.replace('      if (!gravou?.ok) return pending(claim)\n', '')],
  ['envio: gravadas sempre true', ENVIO, (s) => s.replace('gravadas: !!gravou?.ok && r.relato.ok,', 'gravadas: true,')],
  ['envio: evento só quando grava', ENVIO, (s) => s.replace("      void writeServerEvent({ name: RESERVA_COM_IMAGEM_EVENTO,", "      if (gravou?.ok) void writeServerEvent({ name: RESERVA_COM_IMAGEM_EVENTO,")],
  ['envio: usa as cenas de antes das transições', ENVIO, (s) => s.replace('  if (Array.isArray(assinadas) && assinadas.length === 3) shots = assinadas as typeof shots\n', '')],
  ['envio: import do fastAiScene no topo', ENVIO, (s) => "import { generateFastSceneStill as _g } from '@/lib/fastAiScene'\n" + s],
  ['evento fora da lista', EVT, (s) => s.replace("  'kling4_reserva_com_imagem', //", "  // 'kling4_reserva_com_imagem', //")],
]
for (const [nome, arq, f] of MUT) {
  const o = ler(arq), m = f(o)
  if (m === o) { ok(false, `mutante "${nome}" NÃO APLICOU`); continue }
  let e
  try { e = await Promise.race([provas({ [arq]: m }), new Promise((r) => setTimeout(() => r(['pendurou']), 20_000))]) } catch (x) { e = ['lançou: ' + x.message] }
  ok(e.length > 0, `mutante "${nome}" fica vermelho (${e.length} erro(s))`)
}
console.log(falhas ? `${falhas} falha(s)` : `PASS test-reserva-com-imagem-2011 (3 casos reais; ${MUT.length} mutantes)`)
process.exit(falhas ? 1 : 0)
