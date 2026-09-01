// ═══════════════════════════════════════════════════════════════════════════
// sprint-v1v4 #22 — A SEGUNDA RECUSA EM CINCO MINUTOS NÃO PODE SER A PRIMEIRA
// DE NOVO
// ═══════════════════════════════════════════════════════════════════════════
//
// O NÚMERO QUE MANDOU FAZER ISTO (medido 01/09 00:20 UTC, só externos, 30d):
//
//   283 falhas de geração, 102 pessoas.
//   164 delas (58%) aconteceram a MENOS DE 15 MINUTOS da falha anterior
//   DA MESMA PESSOA. 154 (54%) a menos de CINCO minutos.
//
//   E o preço disso, na mesma janela:
//     1 falha   → 41 pessoas, 22 nunca fizeram um vídeo, média 1,29 vídeos
//     2 falhas  → 29 pessoas, 15 nunca fizeram um vídeo, média 1,21 vídeos
//     3+ falhas → 32 pessoas, 19 nunca fizeram um vídeo, média 0,66 vídeos
//
//   Quem bate na parede três vezes faz METADE dos vídeos de quem bate uma.
//   A repetição não é ruído do funil: é o previsor mais forte de nunca chegar
//   ao vídeo 1 — quanto mais ao vídeo 4.
//
// O CASO AO VIVO QUE FECHOU O DIAGNÓSTICO (31/08, uma pessoa, 4 minutos):
//   23:00:32  recusa: "36s de narração para um vídeo de 45s"  (alvo fantasma)
//   23:03:53  recusa: "voiceover_script is required."  duration=45
//   23:04:15  recusa: "voiceover_script is required."  duration=35
//   Ela LEU a primeira mensagem, MUDOU a duração como mandado — e levou a
//   MESMA parede outra vez. Três paredes em quatro minutos, zero vídeo.
//
// (De quebra, este caso derruba a hipótese da rodada #21 de que o roteiro
// perdido era coisa do 45: a terceira tentativa foi em 35, uma duração real
// do seletor, e perdeu o roteiro igual. Está anotado no diário.)
//
// O DEFEITO, EM UMA FRASE: toda recusa do produto é a PRIMEIRA recusa.
// Nenhuma delas sabe que já houve outra há dois minutos, então a segunda
// repete a lição da primeira — que já se provou inútil, porque a pessoa
// obedeceu e voltou para a mesma parede.
//
// ───────────────────────────────────────────────────────────────────────────
// DUAS REGRAS QUE ESTE ARQUIVO SEGUE À RISCA
//
// 1. NA PRIMEIRA RECUSA, NADA MUDA. `avaliarEspiral` devolve `null` na posição
//    1. Nenhuma mensagem de hoje é reescrita para quem falhou uma vez só —
//    e essas são 41 das 102 pessoas. Risco cirúrgico: o comportamento novo só
//    existe onde o comportamento velho já tinha falhado.
//
// 2. NÃO ESCREVO EM PAREDE DE CRÉDITO NEM DE PLANO. `credito` e `plano` são
//    pista do Codex (oferta, preço, upgrade). Elas ENTRAM na contagem da
//    espiral e no evento — porque são metade do que a pessoa vê — mas nunca
//    ganham sufixo meu. Oitava rodada seguida sem uma linha na pista dele.
//
// E uma terceira, herdada do CLAUDE.md: nenhum sufixo promete o que o produto
// não sabe cumprir sozinho. Sem "nossa equipe responde", sem "tente mais
// tarde que estará resolvido". Só saídas que a própria tela já oferece.

/** Nome curto e estável da parede. É o que entra no evento e o que decide o
 *  sufixo. Nomes em português (idioma do diário); a copy para o cliente é a
 *  única coisa em inglês neste arquivo. */
export type Parede =
  | 'narracao_curta'
  | 'roteiro_perdido'
  | 'fornecedor'
  | 'render_preso'
  | 'credito'
  | 'plano'
  | 'outra'

/** Paredes onde a copy é do Codex. Contam na espiral, nunca ganham sufixo. */
const PAREDES_DO_CODEX: ReadonlySet<Parede> = new Set<Parede>(['credito', 'plano'])

export interface OcorrenciaDeParede {
  parede: Parede
  /** ms desde a época. */
  at: number
}

export interface Espiral {
  /** 2 = segunda recusa da janela, 3 = terceira… Nunca 1 (posição 1 → null). */
  posicao: number
  parede: Parede
  paredeAnterior: Parede
  mesmaParede: boolean
  minutosDesdeUltima: number
  /** A sequência inteira da janela, da mais antiga para a atual. */
  paredes: Parede[]
  /** Frase a ANEXAR à mensagem que o cliente já receberia. `null` = não mexer
   *  na mensagem (parede do Codex, ou parede sem saída honesta a oferecer). */
  sufixo: string | null
}

/** Janela em que duas recusas são "a mesma sessão de tentativa". 15 min cobre
 *  as 164 medidas; 5 min cobriria 154 e perderia as outras 10. */
export const JANELA_MINUTOS = 15

// ───────────────────────────────────────────────────────────────────────────
// CLASSIFICAÇÃO
//
// Casa por SUBSTRING da mensagem que o cliente recebeu (é o que os eventos
// guardam em metadata->>'error'), com fallback pelo `reason` do evento. As
// frases abaixo são as literais de produção, colhidas dos eventos de 14 dias.
// ───────────────────────────────────────────────────────────────────────────

const REGRAS: ReadonlyArray<[Parede, RegExp]> = [
  ['narracao_curta', /seconds of narration|narration_too_short|narration_guard/i],
  ['roteiro_perdido', /voiceover_script is required|voiceover_lost/i],
  ['render_preso', /already started is still holding|render_preso|active_render/i],
  ['credito', /credits left and an? .*needs|insufficient_credits|not enough credits/i],
  ['plano', /are on the paid plans|upgrade to use|plan_required/i],
  ['fornecedor', /did not accept the job|could not submit clips|compose_not_ok|provider/i],
]

export function classificarParede(texto: unknown): Parede {
  if (typeof texto !== 'string') return 'outra'
  const t = texto.trim()
  if (!t) return 'outra'
  for (const [parede, re] of REGRAS) {
    if (re.test(t)) return parede
  }
  return 'outra'
}

// ───────────────────────────────────────────────────────────────────────────
// A COPY
//
// Uma frase por parede, e só onde existe uma saída REAL que a própria tela já
// tem. Onde não existe, `null` — a mensagem de hoje fica intacta. Preferir
// não falar a inventar conselho.
// ───────────────────────────────────────────────────────────────────────────

function sufixoDe(parede: Parede, mesmaParede: boolean, posicao: number, minutos: number): string | null {
  if (PAREDES_DO_CODEX.has(parede)) return null

  const m = Math.max(1, minutos)
  const quantas = `${posicao} tries in ${m} minute${m > 1 ? 's' : ''}`

  if (parede === 'narracao_curta') {
    // A tela JÁ manda `suggestedDuration` e desenha o botão "use Xs". A pessoa
    // que volta para cá está reescrevendo o roteiro em vez de apertar o botão.
    return mesmaParede
      ? `That's ${quantas} on the same limit — you don't have to rewrite anything. The shorter length shown right here already fits the script you have; pick it and press Generate.`
      : `That's ${quantas}. You don't have to rewrite your script — the shorter length shown right here already fits it.`
  }

  if (parede === 'roteiro_perdido') {
    // Diagnóstico honesto: o texto não chegou ao último passo. Recarregar é a
    // única coisa que a pessoa pode fazer, e é verdade que costuma resolver.
    return `That's ${quantas}. Your script isn't reaching the last step — reload this page once, paste the script again, then press Generate.`
  }

  if (parede === 'fornecedor') {
    // Esta é nossa, e dizer isso vale mais que qualquer instrução.
    return `That's ${quantas}, and this one is on our side, not on your script. Nothing about what you wrote needs to change — wait a minute and press Generate again.`
  }

  if (parede === 'render_preso') {
    return `That's ${quantas}. An earlier video of yours is still finishing — open My Videos, wait for it to land, then start the new one.`
  }

  // 'outra': causa que ainda não tem nome. Sem saída honesta a oferecer, a
  // mensagem de hoje fica como está. O evento é gravado do mesmo jeito — é
  // assim que 'outra' ganha nome na próxima rodada.
  return null
}

// ───────────────────────────────────────────────────────────────────────────
// A DECISÃO
// ───────────────────────────────────────────────────────────────────────────

export function avaliarEspiral(entrada: {
  /** Recusas anteriores DA MESMA PESSOA. Ordem livre; a função ordena. */
  historico: ReadonlyArray<OcorrenciaDeParede>
  paredeAtual: Parede
  agora: number
  janelaMinutos?: number
}): Espiral | null {
  const { historico, paredeAtual, agora } = entrada
  const janela = entrada.janelaMinutos ?? JANELA_MINUTOS

  if (!Number.isFinite(agora) || !Array.isArray(historico)) return null
  if (!Number.isFinite(janela) || janela <= 0) return null

  const limite = agora - janela * 60_000
  const dentro = historico
    .filter((o) => !!o && Number.isFinite(o.at) && o.at > limite && o.at <= agora)
    .slice()
    .sort((a, b) => a.at - b.at)

  // Posição 1: primeira recusa da janela. NADA MUDA. É a metade das pessoas.
  if (dentro.length === 0) return null

  const anterior = dentro[dentro.length - 1]
  const posicao = dentro.length + 1
  const minutosDesdeUltima = Math.max(0, Math.round((agora - anterior.at) / 60_000))
  const mesmaParede = anterior.parede === paredeAtual

  return {
    posicao,
    parede: paredeAtual,
    paredeAnterior: anterior.parede,
    mesmaParede,
    minutosDesdeUltima,
    paredes: [...dentro.map((o) => o.parede), paredeAtual],
    sufixo: sufixoDe(paredeAtual, mesmaParede, posicao, minutosDesdeUltima),
  }
}

/** Anexa o sufixo sem nunca reescrever a mensagem original — a lição da
 *  #20/#21 é que o produto perde gente quando corta texto alheio. */
export function mensagemComEspiral(mensagem: string, espiral: Espiral | null): string {
  if (!espiral || !espiral.sufixo) return mensagem
  const base = (mensagem || '').trim()
  if (!base) return espiral.sufixo
  if (base.includes(espiral.sufixo)) return base
  return `${base}\n\n${espiral.sufixo}`
}

// ───────────────────────────────────────────────────────────────────────────
// LEITURA DO HISTÓRICO
//
// O cliente do banco vem INJETADO (nada de import aqui: este arquivo tem de
// rodar num teste .mjs sem Next, sem Supabase e sem env). Best-effort de cabo
// a rabo: qualquer tropeço devolve [] e a recusa de hoje sai idêntica.
// ───────────────────────────────────────────────────────────────────────────

/** Só os eventos que representam uma recusa VISTA PELA PESSOA. `generate_failed`
 *  é o que a tela mostra; os outros dois são os pontos de recusa do servidor.
 *  `generation_stage_error` fica de fora de propósito: ele duplica a mesma
 *  falha 2–3 vezes por tentativa e inflaria a posição da espiral. */
export const EVENTOS_DE_RECUSA = ['generate_failed', 'compose_refused', 'narration_guard_blocked'] as const

export async function historicoDeParedes(
  db: { from: (t: string) => any } | null | undefined,
  userId: string | null | undefined,
  agora: number,
  janelaMinutos: number = JANELA_MINUTOS,
): Promise<OcorrenciaDeParede[]> {
  try {
    if (!db || !userId) return []
    const desde = new Date(agora - janelaMinutos * 60_000).toISOString()
    const { data, error } = await db
      .from('events')
      .select('name, metadata, created_at')
      .eq('user_id', userId)
      .in('name', EVENTOS_DE_RECUSA as unknown as string[])
      .gte('created_at', desde)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error || !Array.isArray(data)) return []

    // Uma tentativa falha escreve `generate_failed` E `compose_refused` no
    // mesmo segundo. Sem isto, uma tentativa viraria espiral de duas.
    const porBalde = new Map<number, OcorrenciaDeParede>()
    for (const linha of data) {
      const at = Date.parse(linha?.created_at ?? '')
      if (!Number.isFinite(at)) continue
      const meta = linha?.metadata ?? {}
      const parede = classificarParede(meta?.error ?? meta?.reason ?? linha?.name)
      const balde = Math.floor(at / 5000) // 5s: a folga entre os eventos irmãos
      const existente = porBalde.get(balde)
      // 'outra' nunca ganha de uma parede com nome no mesmo instante.
      if (!existente || (existente.parede === 'outra' && parede !== 'outra')) {
        porBalde.set(balde, { parede, at })
      }
    }
    return [...porBalde.values()].sort((a, b) => a.at - b.at)
  } catch {
    return []
  }
}
