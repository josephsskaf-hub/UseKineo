// KINEO-RESERVA-GRATIS-1911 [CEO 19/11, Frente 1] — menos filmes grátis caindo do Kling 4 para a reserva H3 Turbo.
// Trava (Node puro, sem rede, sem banco, sem fal): executa as libs REAIS (lib/kling4TrialReserva1911.ts, lib/kling4TrialEncaixe.ts,
// lib/kling4TrialAsyncStatus.ts, lib/vozDoFilmeCurto.ts) com medir/encurtar/poll de mentira e confere a ligação na rota e na montagem.
//  (a) roteiro não literal sem `speed:` é medido a 1,0; fala < 10 s fica no caminho de antes; `speed: 1` só no claim do Kling 4;
//      a montagem lê esse speed como velocidade explícita e não reescreve o texto (o que foi medido é o que se ouve);
//  (b) resposta vazia ou reprovada do encurtador gasta a rodada e o modelo é chamado de novo; na última, a desistência de sempre,
//      com a regra que reprovou no evento; desligado = desiste na 1ª, como antes;
//  (c) no prazo de 8 min, uma consulta de status: pronto entrega, falhou é falha, rodando espera até 12 min, fila ou erro = reserva.
// Mutantes no fim: cada um precisa fazer a trava acusar.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const proibido = (o) => () => { throw new Error(`proibido no guardião: ${o}`) }

function loader(over = {}, mocks = {}) {
  const cache = new Map()
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports
    const module = { exports: {} }; cache.set(path, module)
    const req = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      if (name.startsWith('node:')) return nativeRequire(name)
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
      const t = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
      if (!t) return nativeRequire(name)
      return load(t)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', 'setTimeout', js)(req, module, module.exports, { env: {} }, proibido('rede'), proibido('relógio'))
    return module.exports
  }
  return load
}

const FALAS = ['The arena fills with thousands of spectators under the late sun today.', 'Vesuvius erupts and a column of ash rises high into the darkening sky.', 'Stones fall, the arena collapses and 2000 terrified people run for the exits.']
const fala = (seconds) => ({ seconds, maxSeconds: 15.5, cabe: seconds !== null && seconds <= 15.5, reason: seconds === null ? 'narration_unmeasured_kling4' : seconds <= 15.5 ? 'fits' : 'narration_over_kling4_15s' })
const curto = (l) => l.map((f, i) => i === l.length - 1 ? 'Stones fall and 2000 terrified people run for the exits.' : f.split(' ').slice(0, 8).join(' ') + '.')
const ruim = (l) => l.map(() => 'Something entirely invented appears here now.')
const START = Date.parse('2026-11-19T12:00:00.000Z')
const KLING = 'kling/v4/image-to-video'
const VIDEO = 'https://fal.media/test/k4-ok.mp4'
function birth() {
  const marker = { version: 'kling4_trial_2810', engine_used: 'kling4', cost_usd: 2.355, country: 'BR', original_request_id: 'k4-original', submitted_at: new Date(START).toISOString(),
    fallback_scenes: [0, 1, 2].map((i) => ({ prompt: 'Scene ' + i, duration: 6 })), fallback_response: { scenes: ['a', 'b', 'c'], scene_captions: ['', '', ''], scene_prompts: ['a', 'b', 'c'], clip_seconds: [6, 6, 6], clip_word_starts: [0, 5, 10] } }
  return { userId: 'u', generationId: 'g', quality: 'cinematic_ai', engine: 'seedance', status: 'settled', falRequestIds: ['k4-original'], falModels: [KLING], authorizedCompletedUrls: [null],
    response: { generationId: 'g', quality: 'cinematic_ai', duration: 15, aspect: '9:16', fal_request_ids: ['k4-original'], fal_models: [KLING], kling4_trial: marker } }
}
const argsDe = (idadeMs) => { const claim = birth(); return { db: {}, secret: 'x', userId: claim.userId, generationId: claim.generationId, claim, now: START + idadeMs } }
const MIN = 60_000

async function prova(over = {}) {
  const p = []
  const no = (ruimm, msg) => { if (ruimm) p.push(msg) }
  let R, E, A, V
  try {
    const load = loader(over, { '@/lib/kling4TrialFallback': { ensureKling4TrialFallback: proibido('reserva sem mock') } })
    R = load('lib/kling4TrialReserva1911.ts'); E = load('lib/kling4TrialEncaixe.ts'); A = load('lib/kling4TrialAsyncStatus.ts'); V = load('lib/vozDoFilmeCurto.ts')
  } catch (e) { return [`libs não carregam: ${e.message}`] }

  // ── (a) a lib ──
  const fix = (o) => R.velocidadeFixadaParaMedir({ candidato: true, verbatim: false, speed: null, ...o })
  no(R.K4_MEDIR_SEMPRE_1911 !== true || E.K4_ENCAIXE_INSISTE_1911 !== true || R.K4_ESPERA_QUEM_RODA_1911 !== true, 'A0 os três interruptores nascem ligados')
  no(fix({}) !== true, 'A1 não literal sem speed é medido a 1,0')
  no(fix({ verbatim: true }) !== false, 'A2 roteiro literal fica como estava')
  no(fix({ speed: 1.1 }) !== false || fix({ speed: 0.9 }) !== false, 'A3 roteiro com speed: fica como estava')
  no(fix({ speed: 0 }) !== true || fix({ speed: 'x' }) !== true, 'A3b speed inválido conta como sem speed')
  no(fix({ candidato: false }) !== false, 'A4 só o filme grátis do Kling 4')
  no(fix({ ligado: false }) !== false, 'A5 desligado = o de antes')
  const c8 = R.falaCurtaSemEscala(fala(8), true)
  no(c8.cabe !== false || c8.reason !== 'narration_short_unscaled_kling4' || c8.seconds !== 8, 'A6 medida a 1,0 e < 10 s: não vai ao Kling 4, motivo próprio')
  no(R.falaCurtaSemEscala(fala(10), true).cabe !== true || R.falaCurtaSemEscala(fala(12.4), true).reason !== 'fits', 'A7 10 s ou mais segue')
  no(R.falaCurtaSemEscala(fala(8), false).cabe !== true, 'A8 roteiro literal curto: escolha do cliente, segue como antes')
  no(R.falaCurtaSemEscala(fala(17), true).reason !== 'narration_over_kling4_15s' || R.falaCurtaSemEscala(fala(null), true).reason !== 'narration_unmeasured_kling4', 'A9 longa e sem medida passam intactas')
  no(R.velocidadeAssinadaNoClaim({ fixada: true, foiAoKling4: true, speed: null }) !== 1, 'A10 Kling 4 medido a 1,0 assina speed 1')
  no(R.velocidadeAssinadaNoClaim({ fixada: true, foiAoKling4: false, speed: null }) !== null, 'A11 foi à reserva: speed de sempre (a montagem reescreve como antes)')
  no(R.velocidadeAssinadaNoClaim({ fixada: false, foiAoKling4: true, speed: 1.15 }) !== 1.15, 'A12 roteiro com speed: o dele')
  // a montagem: speed 1 assinado vira velocidade explícita (pula a reescrita); sem speed, undefined (reescreve, como antes)
  const voz = { vertical: null, speed_factor: 1, voice: 'onyx', persona_id: 'onyx-legacy', speed: 1 }
  no(V.vozAssinadaDoClaim({ narration_voice: voz, speed: 1 })?.speed !== 1, 'A13 compose: speed 1 no claim = explícito 1')
  no(V.vozAssinadaDoClaim({ narration_voice: voz, speed: null })?.speed !== undefined, 'A14 compose: sem speed = o de antes')
  const compose = read('app/api/compose/route.ts')
  no(!compose.includes('} else if (explicitSpeed != null || claimVerbatim) {\n      scaledScript = voiceoverScript'), 'A15 compose: velocidade explícita fala o texto como está')
  no(!compose.includes('if (vozAssinada) { body.vertical = vozAssinada.vertical; body.speed = vozAssinada.speed }'), 'A16 compose: o claim assinado vence o corpo')

  // ── (b) o encurtador, executado ──
  const rodar = async (o) => {
    const falhas = []; let chamadas = 0
    const roteiro = o.respostas
    const r = await E.encaixarFalaNoKling4({ falas: FALAS, fala: fala(17.2), language: 'en', medir: async () => fala(13.9), agora: () => 0,
      encurtar: async (atuais, alvo) => { const resp = roteiro[Math.min(chamadas, roteiro.length - 1)]; chamadas++; return resp === null ? null : resp(atuais, alvo) },
      aoFalhar: (m, d) => falhas.push({ m, d }), ...(o.insiste === undefined ? {} : { insiste: o.insiste }) })
    return { r, falhas, chamadas }
  }
  let x = await rodar({ respostas: [ruim, curto] })
  no(!x.r || x.chamadas !== 2 || x.falhas.length, 'B1 resposta reprovada: chama de novo e adota a boa')
  x = await rodar({ respostas: [null, curto] })
  no(!x.r || x.chamadas !== 2 || x.falhas.length, 'B2 resposta vazia: chama de novo')
  x = await rodar({ respostas: [ruim] })
  no(x.r !== null || x.chamadas !== 3 || x.falhas.length !== 1 || x.falhas[0].m !== 'encurtado_reprovado' || x.falhas[0].d?.porque !== 'palavra_nova' || x.falhas[0].d?.rodada !== 3, 'B3 sempre reprovada: 3 rodadas, desiste uma vez com a regra')
  x = await rodar({ respostas: [null] })
  no(x.r !== null || x.chamadas !== 3 || x.falhas.length !== 1 || x.falhas[0].m !== 'encurtar_sem_texto', 'B4 sempre vazia: 3 rodadas e o motivo de sempre')
  x = await rodar({ respostas: [ruim, curto], insiste: false })
  no(x.r !== null || x.chamadas !== 1 || x.falhas[0]?.m !== 'encurtado_reprovado', 'B5 desligado: desiste na 1ª, como antes')
  const semNumero = (l) => [...curto(l).slice(0, 2), 'Stones fall and terrified people run for the exits.']
  no(E.porQueOEncaixeNaoServe(FALAS, semNumero(FALAS), 'en') !== 'numero_do_final', 'B6 o número do final não some')
  no(E.porQueOEncaixeNaoServe(FALAS, FALAS.map((f) => f + ' Extra'), 'en') !== 'frase_aberta', 'B7 frase aberta')
  no(E.porQueOEncaixeNaoServe(FALAS, FALAS, 'en') !== 'nao_encurtou', 'B8 não encurtou')
  no(E.porQueOEncaixeNaoServe(FALAS, curto(FALAS).map((f, i) => i ? f : f.replace('.', ' 99.')), 'en') !== 'numero_novo', 'B9 número novo')
  no(E.porQueOEncaixeNaoServe(FALAS, curto(FALAS), 'en') !== null, 'B10 a boa serve')
  for (const d of [curto(FALAS), ruim(FALAS), semNumero(FALAS), FALAS, FALAS.slice(0, 2)]) no(E.encaixeServe(FALAS, d, 'en') !== (E.porQueOEncaixeNaoServe(FALAS, d, 'en') === null), 'B11 encaixeServe é a mesma régua')
  // o texto só troca com a voz confirmando (a medida de cada rodada decide)
  const longo = await E.encaixarFalaNoKling4({ falas: FALAS, fala: fala(17.2), language: 'en', medir: async () => fala(16.4), agora: () => 0, encurtar: async (l) => curto(l), aoFalhar: () => {} })
  no(longo !== null, 'B12 voz ainda acima: não adota')

  // ── (c) o prazo, executado ──
  const avancar = async (idade, poll, o = {}) => {
    let polls = 0, reserva = null
    const r = await A.advanceKling4TrialStatus(argsDe(idade), { poll: async () => { polls++; if (poll instanceof Error) throw poll; return poll },
      fallback: async (inp) => { reserva = inp.reason; return { ok: true, pending: false, claim: inp.claim, ambiguous: false, noAccepted: false } }, ...o })
    return { r, polls, reserva }
  }
  let y = await avancar(9 * MIN, { status: 'processing', url: null })
  no(y.r.kind !== 'pending' || y.reserva !== null || y.polls !== 1, 'C1 rodando aos 9 min: espera, sem reserva')
  y = await avancar(9 * MIN, { status: 'done', url: VIDEO })
  no(y.r.kind !== 'kling_done' || y.r.url !== VIDEO || y.reserva !== null, 'C2 pronto no prazo: entrega o Kling 4')
  y = await avancar(9 * MIN, { status: 'failed', url: null })
  no(y.reserva !== 'provider_failed', 'C3 falhou no prazo: reserva por falha')
  y = await avancar(9 * MIN, { status: 'pending', url: null })
  no(y.reserva !== 'timeout' || y.polls !== 1, 'C4 ainda na fila aos 9 min: reserva por tempo')
  y = await avancar(12 * MIN, { status: 'processing', url: null })
  no(y.reserva !== 'timeout', 'C5 rodando além de 12 min: reserva por tempo')
  y = await avancar(11 * MIN + 59_000, { status: 'processing', url: null })
  no(y.reserva !== null, 'C6 rodando até 12 min: ainda espera')
  y = await avancar(9 * MIN, new Error('rede'))
  no(y.reserva !== 'timeout', 'C7 consulta que lança: reserva por tempo, como antes')
  y = await avancar(9 * MIN, { status: 'processing', url: null }, { esperaQuemRoda: false })
  no(y.reserva !== 'timeout' || y.polls !== 0, 'C8 desligado: reserva no prazo sem consultar, como antes')
  y = await avancar(3 * MIN, { status: 'processing', url: null })
  no(y.r.kind !== 'pending' || y.polls !== 1 || y.reserva !== null, 'C9 antes do prazo nada muda')
  no(R.decisaoNoPrazoDoKling4({ status: 'done', temUrl: false, idadeMs: 9 * MIN, prazoMs: 8 * MIN }) !== 'timeout', 'C10 pronto sem URL não entrega')

  // ── (a) a ligação na rota ──
  const rota = over['app/api/generate-video-cinematic/route.ts'] ?? read('app/api/generate-video-cinematic/route.ts')
  const iFix = rota.indexOf('const velocidadeFixada1911 = velocidadeFixadaParaMedir({ candidato: kling4TrialCandidate, verbatim, speed: parsedScript.speed })')
  const iEmb = rota.indexOf('const medirFalaDoKling4Trial = async (a: Parameters<typeof medirFalaK4Crua>[0]): Promise<FalaK4> => {')
  const bloco = rota.slice(iEmb, rota.indexOf('const kling4Fala: FalaK4 | null = kling4TrialCandidate'))
  no(!(iFix > 0 && iEmb > iFix), 'D1 a velocidade é decidida antes do embrulho da medida')
  const iVel = bloco.indexOf('if (velocidadeFixada1911) a = { ...a, scriptSpeed: 1 }'), iCrua = bloco.indexOf('let fala = await medirFalaK4Crua(a)')
  const iCurta = bloco.indexOf('fala = falaCurtaSemEscala(fala, velocidadeFixada1911)'), iVolta = bloco.indexOf("if (fala.reason !== 'narration_over_kling4_15s') return fala")
  no(!(iVel > 0 && iCrua > iVel), 'D2 a medida (e o encurtamento, que usa o mesmo a) vai a 1,0')
  no(!(iCurta > iCrua && iVolta > iCurta), 'D3 o piso de 10 s vale antes de decidir')
  no(!rota.includes('speed: velocidadeAssinadaNoClaim({ fixada: velocidadeFixada1911, foiAoKling4: Boolean(kling4Trial?.job), speed: parsedScript.speed }),'), 'D4 o claim assina o que foi medido')
  no((rota.match(/^\s+speed: parsedScript\.speed,$/gm) ?? []).length !== 1 || !rota.includes('quality: claimQuality, verbatim, speed: parsedScript.speed,'), 'D5 só a resposta do filme clássico/grátis muda (salvamento e Kling 4 pago intactos)')
  no(!rota.includes(".split(/\\s+/).filter(Boolean).length /* KINEO-RESERVA-GRATIS-1911"), 'D6 palavras_antes conta palavras')
  return p
}

const MUT = [
  ['A: ignora o literal', 'lib/kling4TrialReserva1911.ts', (s) => s.replace('!a.candidato || a.verbatim', '!a.candidato')],
  ['A: sem piso de 10 s', 'lib/kling4TrialReserva1911.ts', (s) => s.replace('fala.seconds >= K4_PISO_DA_FALA_SEM_ESCALA_SEGUNDOS', 'fala.seconds >= 0')],
  ['A: speed 1 também na reserva', 'lib/kling4TrialReserva1911.ts', (s) => s.replace('a.fixada && a.foiAoKling4 ? 1', 'a.fixada ? 1')],
  ['A: interruptor de medida desligado', 'lib/kling4TrialReserva1911.ts', (s) => s.replace('K4_MEDIR_SEMPRE_1911: boolean = true', 'K4_MEDIR_SEMPRE_1911: boolean = false')],
  ['C: espera sem limite', 'lib/kling4TrialReserva1911.ts', (s) => s.replace("a.status === 'processing' && a.idadeMs < a.prazoMs + K4_ESPERA_EXTRA_MS", "a.status === 'processing'")],
  ['C: espera também na fila', 'lib/kling4TrialReserva1911.ts', (s) => s.replace("a.status === 'processing' && a.idadeMs", "(a.status === 'processing' || a.status === 'pending') && a.idadeMs")],
  ['B: não insiste na reprovada', 'lib/kling4TrialEncaixe.ts', (s) => s.replace('if (!encaixeServe(atuais, novas, a.language)) { if (insiste) continue;', 'if (!encaixeServe(atuais, novas, a.language)) {')],
  ['B: não insiste na vazia', 'lib/kling4TrialEncaixe.ts', (s) => s.replace('if (!novas) { if (insiste) continue;', 'if (!novas) {')],
  ['B: insiste até na última', 'lib/kling4TrialEncaixe.ts', (s) => s.replace('&& rodada < K4_RODADAS_DO_ENCAIXE', '')],
  ['B: sem a regra do número do final', 'lib/kling4TrialEncaixe.ts', (s) => s.replace("!finalNovo.has(w))) return 'numero_do_final'", "!finalNovo.has(w) && false)) return 'numero_do_final'")],
  ['C: sem a consulta no prazo', 'lib/kling4TrialAsyncStatus.ts', (s) => s.replace("if (reason === 'timeout' && storedMarker?.fallback_started !== true &&", "if (false && reason === 'timeout' && storedMarker?.fallback_started !== true &&")],
  ['C: rodando vira reserva', 'lib/kling4TrialAsyncStatus.ts', (s) => s.replace("if (decisao === 'esperar') return { kind: 'pending', claim }", '')],
  ['C: falhou vira tempo', 'lib/kling4TrialAsyncStatus.ts', (s) => s.replace("if (decisao === 'provider_failed') reason = 'provider_failed'", '')],
  ['D: rota mede sem fixar', 'app/api/generate-video-cinematic/route.ts', (s) => s.replace('if (velocidadeFixada1911) a = { ...a, scriptSpeed: 1 }', '')],
  ['D: rota sem piso', 'app/api/generate-video-cinematic/route.ts', (s) => s.replace('fala = falaCurtaSemEscala(fala, velocidadeFixada1911)', '')],
  ['D: claim com o speed de antes', 'app/api/generate-video-cinematic/route.ts', (s) => s.replace('speed: velocidadeAssinadaNoClaim({ fixada: velocidadeFixada1911, foiAoKling4: Boolean(kling4Trial?.job), speed: parsedScript.speed }),', 'speed: parsedScript.speed,')],
]

const p0 = await prova()
if (p0.length) { console.error('FAIL test-reserva-gratis-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) {
  const fonte = read(arq), mutada = f(fonte)
  if (mutada === fonte) { vivos.push(`${nome} (o mutante não pegou a fonte)`); continue }
  const p = await prova({ [arq]: mutada })
  if (!p.length) vivos.push(nome)
}
if (vivos.length) { console.error('FAIL test-reserva-gratis-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-reserva-gratis-1911 (${MUT.length} mutantes mortos)`)
