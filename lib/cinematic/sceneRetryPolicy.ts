// ═══ KINEO-RETENTAR-CENA-1410 — a cena que a fal derruba no meio do filme é refeita pelo SERVIDOR, não só pela aba ═══
// Pedido do fundador (14/10, "tudo sim", item 5 de 10): "cena falhou → retentar a CENA (hoje mata o filme)" — anotação aberta
// desde o canário S25 de 01/09 (6 cenas aceitas, 3 morreram com 503 de capacidade da fal, too_few 3/6, filme não montou).
//
// O QUE JÁ EXISTIA (medido 14/10, 30 dias, contas externas):
//   · ENVIO (POST à fila): 0 rejeição retentável em 617 cenas externas — só 403 de saldo da fal (2 filmes). 5xx/408/transporte no
//     envio são AMBÍGUOS (o job pode existir) e NUNCA se repetem: lib/falQueue é o dono único e só repete 429. Continua assim.
//   · CENA ACEITA QUE MORRE DEPOIS, COM A ABA ABERTA: o GenerateClient refaz em 2 rodadas (/api/retry-hollywood-scene,
//     original e depois suavizada). Funcionou na única ocorrência externa (04/10, Seedance 1.5, 1 de 8 → filme entregue).
//   · A MESMA CENA COM A ABA FECHADA: o cron finish-stranded-renders contava a cena como `dead` e seguia — filme com N-1
//     cenas ou too_few → estorno. Zero retentativa, e a causa só ia para o console (nenhum evento com o status).
//     34 filmes externos em 30 dias foram montados por esse caminho.
// ESTE MÓDULO fecha o terceiro caso. Lib PURA (sem '@/'): o cron injeta banco, rota e relógio; o guardião
// scripts/test-retentar-cena-1410.mjs executa ESTE código com uma fal falsa.
//
// POR QUE AQUI 5xx É RETENTÁVEL E NO ENVIO NÃO: a cena que chega a este módulo já TERMINOU na fal (COMPLETED com erro, ou
// result() recusado). O job antigo não pode mais render nem cobrar; um POST novo não duplica nada. O POST novo vai pela
// retomada assinada (/api/retry-hollywood-scene), que segue com as travas dela: mutex do compose, registro determinístico
// por (geração, cena, request antigo) antes de qualquer gasto, retarget assinado e, em modo serviço, ambiguidade SOLTA o
// filme (nunca o prende esperando suporte).

/** Retentativas por cena, somando a aba e o cron (o evento hollywood_scene_retried conta as duas). */
export const RETENTAR_CENA_MAX = 2
/** Espera antes da tentativa N (índice N-1): a 1ª conta da criação do claim, a 2ª da retentativa anterior. */
export const RETENTAR_CENA_ESPERA_MS: readonly number[] = [60_000, 5 * 60_000]
/** Depois disto, nada de cena nova: a varredura de abandono estorna aos 100 min (lib/credits/refund.ts). */
export const RETENTAR_CENA_IDADE_MAX_MIN = 70
export const CENA_RETRY_EVENT = 'cinematic_scene_retry'
/** POSTs de retomada por filme numa rodada do cron (cada um tem prazo de 25 s; o cron tem 300 s para tudo). O resto espera. */
export const RETENTAR_CENA_MAX_POR_RODADA = 4

export type ClasseDaFalha = 'retentavel' | 'conteudo' | 'saldo' | 'desconhecida'

export interface FalhaDeCena {
  index: number
  requestId: string
  model: string
  /** Status HTTP de result()/status() quando houve; null quando a fal só disse COMPLETED + error. */
  http: number | null
  /** Texto do erro da fal (status.error ou a mensagem do result()). Nunca vai inteiro para o banco. */
  message?: string | null
  errorType?: string | null
}

const SALDO = /exhausted balance|insufficient (?:funds|balance|credits)|user is locked|billing|payment required/i
const CONTEUDO = /content|moderat|policy|nsfw|safety|sensitive|prohibited|flagged|violat|not allowed|inappropriate/i
const TRANSITORIO = /capacity|overload|timed? ?out|timeout|temporar|unavailable|try again|rate.?limit|too many requests|downstream|internal server error|bad gateway|gateway|server error|busy/i

/** A cena terminada é retentável? Saldo e conteúdo primeiro: a mesma frase pode ter "error" e "policy". */
export function classificarFalhaDeCena(f: Pick<FalhaDeCena, 'http' | 'message' | 'errorType'>): ClasseDaFalha {
  const texto = `${f.errorType ?? ''} ${f.message ?? ''}`
  const http = typeof f.http === 'number' && Number.isInteger(f.http) ? f.http : null
  if (http === 401 || http === 402 || http === 403 || SALDO.test(texto)) return 'saldo'
  if (CONTEUDO.test(texto)) return 'conteudo'
  if (http === 429 || http === 408 || (http !== null && http >= 500 && http <= 599)) return 'retentavel'
  if (TRANSITORIO.test(texto) || /\b5\d\d\b/.test(texto)) return 'retentavel'
  if (http === 400 || http === 422) return 'conteudo'
  return 'desconhecida'
}

export type DecisaoDaCena = 'retentar' | 'esperar' | 'esgotada' | 'nao_retentavel' | 'sem_cena_pronta' | 'tarde_demais'

export interface PlanoDaCena {
  falha: FalhaDeCena
  classe: ClasseDaFalha
  decisao: DecisaoDaCena
  /** Número da tentativa que ESTA rodada faria (1 ou 2); as já usadas são `tentativa - 1`. */
  tentativa: number
}

/** Decide, cena a cena, o que a rodada do cron faz. Pura: mesma entrada, mesma saída. */
export function planejarRetentativas(args: {
  falhas: FalhaDeCena[]
  /** Ressubmissões já feitas desta geração (aba ou cron), com a hora. */
  anteriores: Array<{ index: number; at: number }>
  prontas: number
  agora: number
  inicioMs: number
  idadeMin: number
}): PlanoDaCena[] {
  const plano: PlanoDaCena[] = []
  const vistas = new Set<number>()
  for (const falha of args.falhas) {
    if (!Number.isInteger(falha.index) || falha.index < 0 || vistas.has(falha.index) || !falha.requestId || !falha.model) continue
    vistas.add(falha.index)
    const daCena = args.anteriores.filter((r) => r.index === falha.index && Number.isFinite(r.at))
    const usadas = daCena.length
    const tentativa = usadas + 1
    const classe = classificarFalhaDeCena(falha)
    let decisao: DecisaoDaCena
    if (classe !== 'retentavel') decisao = 'nao_retentavel'
    else if (usadas >= RETENTAR_CENA_MAX) decisao = 'esgotada'
    else if (args.prontas < 1) decisao = 'sem_cena_pronta' // a retomada exige ≥1 cena autorizada; 0 de N = estorno de sempre
    else if (!(args.idadeMin < RETENTAR_CENA_IDADE_MAX_MIN)) decisao = 'tarde_demais'
    else {
      const referencia = usadas === 0 ? args.inicioMs : Math.max(...daCena.map((r) => r.at))
      const espera = RETENTAR_CENA_ESPERA_MS[Math.min(usadas, RETENTAR_CENA_ESPERA_MS.length - 1)]
      decisao = Number.isFinite(referencia) && args.agora - referencia >= espera ? 'retentar' : 'esperar'
    }
    plano.push({ falha, classe, decisao, tentativa })
  }
  return plano
}

/** Resposta da retomada (/api/retry-hollywood-scene) chamada em modo serviço. */
export interface RespostaDaRetomada {
  status: number
  requestId?: string | null
}

export interface DepsDaRetentativa {
  /** Grava a decisão com id determinístico (geração, cena, request antigo, tipo). 'repetida' = já existe → não age. */
  marcar: (tipo: 'tentativa' | 'decisao', p: PlanoDaCena, metadata: Record<string, unknown>) => Promise<'nova' | 'repetida' | 'erro'>
  /** Prova no claim assinado as cenas prontas e as falhas terminais (a retomada só aceita slot provado). */
  provar: (falhas: FalhaDeCena[]) => Promise<boolean>
  /** O POST da retomada assinada, uma cena. Nunca lança: erro vira status 0. */
  reenviar: (falha: FalhaDeCena) => Promise<RespostaDaRetomada>
  /** Rastro do desfecho (evento cinematic_scene_retry, fase resultado). Nunca lança. */
  registrar: (p: PlanoDaCena, metadata: Record<string, unknown>) => Promise<void>
}

function sinal(f: FalhaDeCena): string {
  const t = `${f.errorType ?? ''} ${f.message ?? ''}`.trim()
  return t.replace(/https?:\/\/\S+/g, '[url]').replace(/\s+/g, ' ').slice(0, 120)
}

/**
 * A rodada: planeja, registra as decisões terminais uma vez, prova o claim e reenvia SÓ as cenas falhadas retentáveis.
 * Devolve quantas cenas ganharam job novo e `segurar`: com cena reenviada, esperando a espera ou adiada para a próxima
 * rodada, o cron NÃO monta nem estorna agora (espera a cena nova). O teto de idade (70 min) garante que a espera acaba.
 */
export async function executarRetentativas(args: {
  falhas: FalhaDeCena[]
  anteriores: Array<{ index: number; at: number }>
  prontas: number
  agora: number
  inicioMs: number
  idadeMin: number
  deps: DepsDaRetentativa
}): Promise<{ reenviadas: number; segurar: boolean; plano: PlanoDaCena[]; resultados: Array<{ index: number; desfecho: string }> }> {
  const plano = planejarRetentativas(args)
  const resultados: Array<{ index: number; desfecho: string }> = []
  const base = (p: PlanoDaCena) => ({ scene_index: p.falha.index, old_request_id: p.falha.requestId, model: p.falha.model,
    provider_http_status: p.falha.http, signal: sinal(p.falha), classe: p.classe, attempt: p.tentativa, max_attempts: RETENTAR_CENA_MAX })
  for (const p of plano) {
    if (p.decisao === 'retentar' || p.decisao === 'esperar') continue
    await args.deps.marcar('decisao', p, { ...base(p), fase: 'decisao', decisao: p.decisao })
    resultados.push({ index: p.falha.index, desfecho: p.decisao })
  }
  const todas = plano.filter((p) => p.decisao === 'retentar')
  const aRetentar = todas.slice(0, RETENTAR_CENA_MAX_POR_RODADA)
  for (const p of todas.slice(RETENTAR_CENA_MAX_POR_RODADA)) resultados.push({ index: p.falha.index, desfecho: 'proxima_rodada' })
  for (const p of plano) if (p.decisao === 'esperar') resultados.push({ index: p.falha.index, desfecho: 'esperar' })
  const esperando = resultados.some((r) => r.desfecho === 'esperar' || r.desfecho === 'proxima_rodada')
  if (aRetentar.length === 0) return { reenviadas: 0, segurar: esperando, plano, resultados }
  if (!await args.deps.provar(aRetentar.map((p) => p.falha))) {
    for (const p of aRetentar) resultados.push({ index: p.falha.index, desfecho: 'prova_falhou' })
    return { reenviadas: 0, segurar: false, plano, resultados }
  }
  let reenviadas = 0
  for (const p of aRetentar) {
    // A trava antes do gasto: uma tentativa por (geração, cena, request antigo). Duas rodadas do cron sobrepostas, ou o
    // replay da mesma, colidem aqui e não chegam à fal.
    const marca = await args.deps.marcar('tentativa', p, { ...base(p), fase: 'tentativa' })
    if (marca !== 'nova') { resultados.push({ index: p.falha.index, desfecho: marca === 'repetida' ? 'ja_tentada' : 'trava_indisponivel' }); continue }
    const r = await args.deps.reenviar(p.falha)
    const novo = r.status === 200 && typeof r.requestId === 'string' && r.requestId.length > 0 ? r.requestId : null
    if (novo) reenviadas++
    const desfecho = novo ? 'reenviada' : r.status === 409 ? 'recusada_pela_retomada' : 'nao_enviada'
    await args.deps.registrar(p, { ...base(p), fase: 'resultado', desfecho, retry_http_status: r.status, new_request_id: novo })
    resultados.push({ index: p.falha.index, desfecho })
  }
  return { reenviadas, segurar: reenviadas > 0 || esperando, plano, resultados }
}
