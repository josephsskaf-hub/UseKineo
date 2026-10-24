// KINEO-FILME-RAPIDO-1710 — VOZ E MÚSICA NO CLIQUE (auditoria 17/10, G1/V1).
//
// A requisição de compose ficava ~53 s parada ANTES de mandar ao Creatomate: TTS, Whisper e só então o Lyria (até 45 s),
// tudo em série — embora roteiro, voz e tema sejam conhecidos desde o clique. Agora, assim que o despacho das cenas é
// aceito (/api/generate-video-cinematic), a trilha, a voz clássica e as vozes por cena (Kling 3/H3/Omni/S25) são pedidas
// DEPOIS da resposta, enquanto a fal gera as cenas (~85 s). A montagem procura o que ficou pronto:
//   · voz: o MESMO cache de voz por conteúdo que sempre existiu (Kineo-AudioCache-2026) — chave idêntica = acerto;
//   · voz por cena: o mesmo cache, numa chave POR FILME (geração + texto + voz + velocidade);
//   · trilha: este registro guarda o prompt (hash), o job da fal e a URL — a montagem só reaproveita com o MESMO prompt.
// Se não estiver pronto, a montagem ESPERA um pouco (o que está a caminho) e, sem nada, gera como sempre. Mudou só o
// QUANDO: textos, vozes, velocidades e prompts são os que a montagem usaria.
//
// O registro é UMA linha em `events` por geração, com id determinístico (o 2º aquecimento do mesmo filme recebe 23505 e
// não roda: nunca pagar duas vezes a mesma voz). Só o processo que reservou escreve nela (escritas em fila, sem corrida).
// Sem import de projeto: o guardião (scripts/test-filme-rapido-1710.mjs) executa este arquivo com banco falso.
import { createHash } from 'node:crypto'

export const AUDIO_NO_CLIQUE_EVENT = 'audio_no_clique'
export const AUDIO_NO_CLIQUE_PATH = '/lib/audioNoClique'
export const AUDIO_NO_CLIQUE_VERSAO = 'filme_rapido_1710'
/** Quanto a montagem espera, no total, pela voz que o clique ainda está fazendo (depois disso: gera como sempre). */
export const ESPERA_DA_VOZ_MS = 25_000
/** Aquecimento mais velho que isto e ainda "pendente" = processo morto: ninguém espera por ele. */
export const AQUECIMENTO_VIVO_MS = 4 * 60 * 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BancoDoAquecimento = { from(tabela: 'events'): any }
type Resposta<T> = PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>

export type LyriaJob = { requestId: string; statusUrl: string; responseUrl: string }
export type EstadoDaParte = 'pendente' | 'pronta' | 'falhou'
export interface RegistroDoAquecimento {
  versao: string
  generation_id: string
  iniciado_em: string
  musica: { prompt_sha: string; status: EstadoDaParte; job?: LyriaJob | null; url?: string | null; ms?: number } | null
  voz: { chave: string; status: EstadoDaParte; ms?: number } | null
  cenas: { status: EstadoDaParte | 'parcial'; total: number; prontas?: number; ms?: number } | null
}

const uuidDe = (hex: string) => `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export function idDoAquecimento(generationId: string): string {
  return uuidDe(sha(`kineo:audio-no-clique:v1:${generationId}`).slice(0, 32))
}
export function shaDoPrompt(prompt: string): string {
  return sha(`lyria-prompt:v1:${prompt}`)
}
/** Chave do cache de voz da cena (Kling 3/H3/Omni/S25): por filme, para nenhuma outra montagem tocar nela. */
export function chaveDaCenaAquecida(a: { generationId: string; texto: string; voz: string; velocidade: number }): string {
  const v = Number.isFinite(a.velocidade) ? Math.round(a.velocidade * 1000) / 1000 : 1
  return sha(`kineo:cena-no-clique:v1|${a.generationId}|${a.voz}|${v}|${a.texto.trim()}`)
}

// ── o aquecimento (roda depois da resposta do despacho) ─────────────────────────────────────────────────────────────
export interface DepsDoAquecimento {
  db: BancoDoAquecimento
  agora(): number
  /** POST da trilha (lib/lyriaMusic submeterLyria). */
  submeterLyria(prompt: string): Promise<LyriaJob | null>
  /** Espera o job até o relógio absoluto (lib/lyriaMusic esperarLyria). */
  esperarLyria(job: LyriaJob, prazoAbsolutoMs: number): Promise<string | null>
}
export interface PedidoDeAquecimento {
  generationId: string
  userId: string
  /** Prompt EXATO que a montagem mandaria ao Lyria (null = sem trilha gerada nesta montagem). */
  promptMusica: string | null
  /** Voz clássica: a chave do cache e quem a produz (TTS + Whisper + cache). null = não aquecível. */
  voz: { chave: string; produzir: () => Promise<boolean> } | null
  /** Vozes por cena (estrada hollywood): uma tarefa por cena, rodadas em grupos de 3. */
  cenas: Array<() => Promise<boolean>>
  /** Quanto a trilha pode esperar aqui (o processo de fundo segue até o maxDuration da rota). */
  esperaDaTrilhaMs?: number
}

/** Reserva o aquecimento deste filme (uma vez por geração). false = já existe (ou o banco falhou): não aquece de novo. */
export async function reservarAquecimento(db: BancoDoAquecimento, pedido: PedidoDeAquecimento, agora: number): Promise<{ ok: boolean; registro: RegistroDoAquecimento }> {
  const registro: RegistroDoAquecimento = {
    versao: AUDIO_NO_CLIQUE_VERSAO,
    generation_id: pedido.generationId,
    iniciado_em: new Date(agora).toISOString(),
    musica: pedido.promptMusica ? { prompt_sha: shaDoPrompt(pedido.promptMusica), status: 'pendente' } : null,
    voz: pedido.voz ? { chave: pedido.voz.chave, status: 'pendente' } : null,
    cenas: pedido.cenas.length > 0 ? { status: 'pendente', total: pedido.cenas.length } : null,
  }
  if (!registro.musica && !registro.voz && !registro.cenas) return { ok: false, registro }
  try {
    const ins = await (db.from('events').insert({ id: idDoAquecimento(pedido.generationId), name: AUDIO_NO_CLIQUE_EVENT, user_id: pedido.userId, path: AUDIO_NO_CLIQUE_PATH, metadata: registro }) as Resposta<unknown>)
    return { ok: !ins.error, registro }
  } catch {
    return { ok: false, registro }
  }
}

/** Faz o que foi reservado: trilha, voz e cenas EM PARALELO; cada parte grava o próprio desfecho no registro. */
export async function executarAquecimento(deps: DepsDoAquecimento, pedido: PedidoDeAquecimento, registro: RegistroDoAquecimento): Promise<RegistroDoAquecimento> {
  const id = idDoAquecimento(pedido.generationId)
  let estado: RegistroDoAquecimento = { ...registro }
  let fila: Promise<void> = Promise.resolve()
  const gravar = (patch: Partial<RegistroDoAquecimento>): Promise<void> => {
    fila = fila.then(async () => {
      estado = { ...estado, ...patch }
      try { await (deps.db.from('events').update({ metadata: estado }).eq('id', id) as Resposta<unknown>) } catch { /* o registro é só para a montagem achar; falha = ela gera como sempre */ }
    })
    return fila
  }
  const t0 = deps.agora()
  const partes: Promise<unknown>[] = []
  if (pedido.promptMusica && estado.musica) {
    const promptMusica = pedido.promptMusica
    partes.push((async () => {
      const job = await deps.submeterLyria(promptMusica).catch(() => null)
      if (!job) return gravar({ musica: { ...estado.musica!, status: 'falhou', job: null, ms: deps.agora() - t0 } })
      await gravar({ musica: { ...estado.musica!, status: 'pendente', job } })
      const url = await deps.esperarLyria(job, deps.agora() + (pedido.esperaDaTrilhaMs ?? 150_000)).catch(() => null)
      return gravar({ musica: { ...estado.musica!, status: url ? 'pronta' : 'falhou', job, url: url ?? null, ms: deps.agora() - t0 } })
    })())
  }
  if (pedido.voz && estado.voz) {
    const voz = pedido.voz
    partes.push((async () => {
      const ok = await voz.produzir().catch(() => false)
      return gravar({ voz: { ...estado.voz!, status: ok ? 'pronta' : 'falhou', ms: deps.agora() - t0 } })
    })())
  }
  if (pedido.cenas.length > 0 && estado.cenas) {
    partes.push((async () => {
      let prontas = 0
      for (let i = 0; i < pedido.cenas.length; i += 3) {
        const lote = await Promise.all(pedido.cenas.slice(i, i + 3).map((t) => t().catch(() => false)))
        prontas += lote.filter(Boolean).length
      }
      return gravar({ cenas: { status: prontas === pedido.cenas.length ? 'pronta' : prontas > 0 ? 'parcial' : 'falhou', total: pedido.cenas.length, prontas, ms: deps.agora() - t0 } })
    })())
  }
  await Promise.all(partes)
  await fila
  return estado
}

// ── o lado da montagem ──────────────────────────────────────────────────────────────────────────────────────────────
export async function lerAquecimento(db: BancoDoAquecimento, generationId: string): Promise<RegistroDoAquecimento | null> {
  try {
    const r = await (db.from('events').select('metadata').eq('id', idDoAquecimento(generationId)).maybeSingle() as Resposta<{ metadata?: unknown }>)
    const md = r.data?.metadata
    if (r.error || !md || typeof md !== 'object') return null
    const reg = md as RegistroDoAquecimento
    return reg.generation_id === generationId ? reg : null
  } catch {
    return null
  }
}

const vivo = (reg: RegistroDoAquecimento, agora: number) => {
  const t = Date.parse(reg.iniciado_em)
  return Number.isFinite(t) && agora - t < AQUECIMENTO_VIVO_MS
}

/**
 * A trilha do clique para ESTE prompt. string = pronta; null = estava a caminho, esperada no orçamento de sempre, não
 * veio (a montagem não pede outra: cai no catálogo, como no estouro de hoje); undefined = nada útil (gera como sempre).
 */
export async function musicaAquecida(a: {
  db: BancoDoAquecimento
  generationId: string
  prompt: string
  esperarLyria(job: LyriaJob, prazoAbsolutoMs: number): Promise<string | null>
  orcamentoMs: number
  naoRepetirJobAceito?: boolean // KINEO-CARTOON-CONSISTENCIA-2210 — desenho15 não gera outra faixa depois de um job aceito
  agora(): number
  dormir(ms: number): Promise<void>
}): Promise<string | null | undefined> {
  const prazo = a.agora() + a.orcamentoMs
  let reg = await lerAquecimento(a.db, a.generationId)
  const daqui = (r: RegistroDoAquecimento | null) => (r?.musica && r.musica.prompt_sha === shaDoPrompt(a.prompt) ? r.musica : null)
  let m = daqui(reg)
  if (!reg || !m) return undefined
  if (m.status === 'pronta') return typeof m.url === 'string' && m.url.startsWith('https://') ? m.url : undefined
  if (m.status === 'falhou' && !(a.naoRepetirJobAceito && m.job?.requestId)) return undefined // KINEO-CARTOON-CONSISTENCIA-2210 — job aceito continua na mesma espera
  // Pendente sem job ainda (o POST está saindo): relê por alguns segundos.
  const limiteSemJob = Math.min(prazo, a.agora() + 10_000)
  while (!m.job && m.status === 'pendente' && vivo(reg!, a.agora()) && a.agora() < limiteSemJob) {
    await a.dormir(1000)
    reg = await lerAquecimento(a.db, a.generationId)
    m = daqui(reg)
    if (!m) return undefined
    if (m.status === 'pronta') return typeof m.url === 'string' && m.url.startsWith('https://') ? m.url : undefined
    if (m.status === 'falhou' && !(a.naoRepetirJobAceito && m.job?.requestId)) return undefined // KINEO-CARTOON-CONSISTENCIA-2210 — inclusive se o aquecimento terminar durante a espera
  }
  const job = m.job
  if (!job || !job.statusUrl?.startsWith('https://') || !job.responseUrl?.startsWith('https://')) return a.naoRepetirJobAceito && job?.requestId ? null : undefined // KINEO-CARTOON-CONSISTENCIA-2210 — job aceito sem URL utilizável cai no catálogo, nunca em outro POST
  // O MESMO job da fal (nada pago de novo), no orçamento de sempre da montagem.
  const url = await a.esperarLyria(job, prazo).catch(() => null)
  return url ?? null
}

/**
 * A voz que o clique está fazendo agora. Chama `buscar` (o cache de sempre) até achar, no máximo `prazoMs`. null =
 * nada a esperar (outra chave, já falhou, processo morto) ou o prazo venceu: a montagem gera como sempre.
 */
export async function esperarVozDoClique(a: {
  db: BancoDoAquecimento
  generationId: string
  /** 'voz' = a clássica (confere a chave); 'cenas' = as vozes por cena. */
  parte: 'voz' | 'cenas'
  chave?: string
  buscar(): Promise<unknown | null>
  prazoAbsolutoMs: number
  agora(): number
  dormir(ms: number): Promise<void>
  intervaloMs?: number
}): Promise<unknown | null> {
  let reg = await lerAquecimento(a.db, a.generationId)
  const pendente = (r: RegistroDoAquecimento | null) => {
    if (!r || !vivo(r, a.agora())) return false
    if (a.parte === 'voz') return !!r.voz && r.voz.chave === a.chave && r.voz.status === 'pendente'
    return !!r.cenas && r.cenas.status === 'pendente'
  }
  if (!pendente(reg)) return null
  while (a.agora() < a.prazoAbsolutoMs) {
    await a.dormir(a.intervaloMs ?? 1500)
    const achou = await a.buscar().catch(() => null)
    if (achou) return achou
    reg = await lerAquecimento(a.db, a.generationId)
    if (!pendente(reg)) return await a.buscar().catch(() => null) // terminou (pronta ou falhou): uma última olhada no cache
  }
  return null
}

/**
 * KINEO-FILME-RAPIDO-1710 — o que a MONTAGEM (/api/compose) usa, num objeto só (uma linha marcada na rota):
 *   musica(prompt) → o gancho `lyriaPronta` de selectMusicForScript;
 *   voz(chave)     → a voz clássica que o clique está fazendo (espera um pouco; null = gera como sempre);
 *   cena(texto, voz, velocidade) → a voz da cena (Kling 3/H3/Omni/S25) feita no clique, ou null.
 * Um orçamento de espera de voz para a montagem inteira (ESPERA_DA_VOZ_MS), dividido entre as cenas.
 */
export function montagemComAudioDoClique<E extends { voiceoverUrl: string; audioDuration: number; words: unknown[] }>(a: {
  db: BancoDoAquecimento
  generationId: string
  lookup(chave: string): Promise<E | null>
  esperarLyria(job: LyriaJob, prazoAbsolutoMs: number): Promise<string | null>
  orcamentoLyriaMs: number
  naoRepetirJobAceito?: () => boolean // KINEO-CARTOON-CONSISTENCIA-2210 — lida só quando a música é pedida, depois da verificação do claim
  agora?: () => number
  dormir?: (ms: number) => Promise<void>
}) {
  const agora = a.agora ?? (() => Date.now())
  const dormir = a.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  let prazoDaVoz: number | null = null
  // O que a montagem achou do clique (vai no evento compose_stage_timing): sem = nada aquecido; pronta/esperada = reaproveitou.
  const relato: { musica: 'sem' | 'pronta' | 'nao_veio'; voz: 'sem' | 'esperada'; cenas: number } = { musica: 'sem', voz: 'sem', cenas: 0 }
  const esperar = (parte: 'voz' | 'cenas', chave: string): Promise<E | null> => {
    if (prazoDaVoz === null) prazoDaVoz = agora() + ESPERA_DA_VOZ_MS
    return esperarVozDoClique({ db: a.db, generationId: a.generationId, parte, chave, buscar: () => a.lookup(chave), prazoAbsolutoMs: prazoDaVoz, agora, dormir }).catch(() => null) as Promise<E | null>
  }
  return {
    relato,
    musica: async (prompt: string) => {
      const naoRepetirJobAceito = a.naoRepetirJobAceito?.() === true // KINEO-CARTOON-CONSISTENCIA-2210 — só o claim verificado pode impedir outro gasto de música
      const r = await musicaAquecida({ db: a.db, generationId: a.generationId, prompt, esperarLyria: a.esperarLyria, orcamentoMs: a.orcamentoLyriaMs, agora, dormir, naoRepetirJobAceito }).then(r => naoRepetirJobAceito ? r ?? null : r).catch(() => naoRepetirJobAceito ? null : undefined) // KINEO-CARTOON-CONSISTENCIA-2210 — sem aquecimento útil, desenho15 usa catálogo; outros produtos mantêm o retorno de sempre
      relato.musica = typeof r === 'string' ? 'pronta' : r === null ? 'nao_veio' : 'sem'
      return r
    },
    voz: async (chave: string) => {
      const r = await esperar('voz', chave)
      if (r) relato.voz = 'esperada'
      return r
    },
    cena: async (texto: string, voz: string, velocidade: number): Promise<E | null> => {
      try {
        const chave = chaveDaCenaAquecida({ generationId: a.generationId, texto, voz, velocidade })
        const achou = (await a.lookup(chave).catch(() => null)) ?? (await esperar('cenas', chave))
        const ok = achou && achou.audioDuration > 0.3 && achou.voiceoverUrl ? achou : null
        if (ok) relato.cenas += 1
        return ok
      } catch {
        return null
      }
    },
  }
}
