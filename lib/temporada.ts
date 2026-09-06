// ═══ KINEO-TEMPORADA-2026-09-06 (sprint-assinaturas #18) ═══════════════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (7 dias, 230 pessoas externas, medido
// no fechamento de 06/09):
//
//   230 cadastros → 145 fizeram o filme 1 → **109 pararam em EXATAMENTE UM**
//   → 36 fizeram 2+ → 2 pagaram.
//
//   E o detalhe que muda tudo: das 109 que pararam, apenas **9 (8%) bateram
//   na parede de crédito**. **65 (60%) ainda têm saldo para outro filme
//   agora** e nunca esbarraram em nada. Elas não foram barradas. Elas foram
//   embora **satisfeitas**, ~30 minutos depois do filme ficar pronto.
//
// A LEITURA (e é ela que justifica esta peça): quem recebe um filme e vai
// embora satisfeito não está insatisfeito com o produto — está com o produto
// ERRADO na cabeça. Ela veio buscar UM VÍDEO, recebeu UM VÍDEO, e o negócio
// fechou. Ninguém assina uma fábrica de coisa que já terminou.
//
// A INVERSÃO: o produto não é "um vídeo", é "o seu canal". No instante em que
// o filme 1 fica pronto, a casa escreve os TÍTULOS dos episódios 2 a 6 da
// mesma série e diz: **a sua temporada já existe**. Deixa de ser "quer fazer
// outro?" (pergunta, exige ideia, morre em formulário em branco) e vira "o
// episódio 3 chama-se assim — quer render?" (afirmação, exige um clique).
//
// POR QUE ISTO MONETIZA SEM TOCAR EM PREÇO: o plano deixa de ser "60 créditos
// por $9.90" (unidade que ninguém sente) e passa a ser "o resto da sua
// temporada". O cálculo de quantos episódios cabem vem SEMPRE de
// `creditCostForDuration` — nunca de número digitado aqui. Esta biblioteca não
// conhece preço, não conhece plano e não escreve oferta.
//
// ⚠ NÃO TOCA NO PIPELINE DE QUALIDADE. Título é texto FORA do pipeline: nada
// aqui lê ou escreve prompt de cena, régua de palavras/segundo, motor, música
// ou narração. O episódio só vira filme pelo fluxo normal, cobrado normalmente.
//
// ⚠ NÃO CRIA TABELA. Mesma escolha do `next_episode_written` (#14): a
// temporada mora em `events`, chaveada por `session_id = videoId`. Sem
// migration, sem DDL, e um `delete from events where name='season_written'`
// desfaz tudo.

/** Nome do evento que guarda a temporada escrita. */
export const TEMPORADA_EVENT = 'season_written'

/** 14 dias — a mesma janela da memória do episódio 2, de propósito: as duas
 *  peças são lidas pelas MESMAS cartas de ciclo de vida, e memórias com
 *  validades diferentes produziriam um e-mail que nomeia o episódio 2 e não
 *  sabe mais o nome do 3. */
export const TEMPORADA_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** Do episódio 2 ao 6. Cinco é escolha de produto, não de engenharia: é o
 *  bastante para a pessoa VER uma temporada (um número menor lê como "mais um
 *  vídeo") e pouco o bastante para caber numa faixa sem rolagem e numa carta
 *  sem virar lista. */
export const PRIMEIRO_EPISODIO = 2
export const ULTIMO_EPISODIO = 6
export const TOTAL_EPISODIOS = ULTIMO_EPISODIO - PRIMEIRO_EPISODIO + 1

export const MAX_TITULO_CHARS = 120
/** A semente é o que vira `prompt` no deeplink. O teto é o mesmo
 *  `MAX_SERIES_SEED_LENGTH` de lib/seriesContinuation, por construção: uma
 *  semente maior que isso seria cortada lá adiante e a pessoa clicaria num
 *  título que não corresponde ao que o compositor recebe. */
export const MAX_SEMENTE_CHARS = 180

export type EpisodioDaTemporada = {
  /** 2..6 */
  n: number
  title: string
  /** o tema que vira `prompt` quando a pessoa clica */
  seed: string
}

export type TemporadaEscrita = {
  episodes: EpisodioDaTemporada[]
  /** o filme que originou a temporada — para a carta poder dizer "do seu X" */
  fromTitle: string | null
}

function texto(v: unknown, teto: number): string {
  if (typeof v !== 'string') return ''
  // A ORDEM IMPORTA e ja me pegou: as aspas tem de sair DEPOIS do trim.
  // Um titulo que chega com espaco na frente nao casa com `^["…]` e a aspa
  // sobrevive ate a tela. Trim -> aspas -> trim.
  return v
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["“”']+|["“”']+$/g, '')
    .trim()
    .slice(0, teto)
}

/**
 * Recorta e valida o que vai ser GRAVADO.
 *
 * Devolve null quando não há temporada de verdade. A regra é deliberadamente
 * dura — **ou os cinco episódios, ou nenhum**: uma temporada com buracos vira,
 * na tela e na carta, "Ep2 · Ep4 · Ep6", que lê como defeito e não como
 * catálogo. Escrever de novo custa uma chamada de gpt-4o-mini; mostrar uma
 * temporada quebrada custa a impressão de que a casa não sabe o que fez.
 */
export function prepararTemporada(bruto: unknown, fromTitle?: unknown): TemporadaEscrita | null {
  const lista = Array.isArray(bruto)
    ? bruto
    : bruto && typeof bruto === 'object' && Array.isArray((bruto as { episodes?: unknown }).episodes)
      ? ((bruto as { episodes: unknown[] }).episodes)
      : null
  if (!lista) return null

  const episodes: EpisodioDaTemporada[] = []
  const vistos = new Set<string>()
  for (let i = 0; i < lista.length && episodes.length < TOTAL_EPISODIOS; i++) {
    const item = lista[i] as { title?: unknown; seed?: unknown; topic?: unknown } | null
    if (!item || typeof item !== 'object') continue
    const title = texto(item.title, MAX_TITULO_CHARS)
    // A semente cai para o título quando o modelo não manda uma. Título é
    // sempre um assunto utilizável; deixar a semente vazia mataria o clique.
    const seed = texto(item.seed ?? item.topic ?? item.title, MAX_SEMENTE_CHARS) || title
    if (!title || !seed) continue
    // Título repetido é o modo de falha mais comum destes modelos e o mais
    // caro aqui: cinco linhas iguais destroem a ideia de temporada.
    const chave = title.toLowerCase()
    if (vistos.has(chave)) continue
    vistos.add(chave)
    episodes.push({ n: PRIMEIRO_EPISODIO + episodes.length, title, seed })
  }

  if (episodes.length < TOTAL_EPISODIOS) return null
  return { episodes, fromTitle: texto(fromTitle, MAX_TITULO_CHARS) || null }
}

/** Lê o que foi gravado. Falha SEMPRE aberta: qualquer coisa estranha devolve
 *  null e quem chama decide (escrever de novo, ou simplesmente não mostrar
 *  temporada). Perder a memória custa uma chamada de modelo; devolver meia
 *  temporada custa a peça inteira. */
export function lerTemporada(metadata: unknown): TemporadaEscrita | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as { episodes?: unknown; fromTitle?: unknown }
  return prepararTemporada(m.episodes, m.fromTitle)
}

/** A memória ainda vale? Mesma regra do episódio 2. Data ilegível = NÃO vale
 *  (fail-closed): reescrever é barato, mostrar temporada de duas semanas atrás
 *  como se fosse nova não é. */
export function temporadaAindaVale(criadoEm: string | null | undefined, agora: number): boolean {
  if (!criadoEm) return false
  const t = Date.parse(criadoEm)
  if (!Number.isFinite(t)) return false
  return agora - t < TEMPORADA_TTL_MS
}

// ═══ KINEO-TEMPORADA-CADEADO-2026-09-06 (sprint-assinaturas #31) ═══════════
//
// O NÚMERO QUE MANDOU ESCREVER ISTO (medido 06/09, a ÚNICA exposição real da
// faixa da #30, payload do próprio `season_shown`):
//
//   balance: 5 · episode_cost: 5 · episodes: 5 · affordable_episodes: 1 · locked: 0
//
// `affordable_episodes: 1` e `locked: 0` na MESMA linha do MESMO evento. Com 5
// créditos e 5 por episódio, quatro dos cinco deviam estar atrás do plano.
//
// Os dois números saem de duas contas, ambas certas, que respondem a perguntas
// DIFERENTES: `affordable` de cada episódio é "cabe UM?" (`custo <= balance`,
// feita isoladamente cinco vezes — com 5<=5 os cinco dizem sim), e
// `affordableEpisodes` é "quantos cabem?" (`floor(balance/custo)` = 1). A tela
// derivava o cadeado da PRIMEIRA. Como qualquer pessoa com saldo para um
// episódio devolve zero bloqueados, a moldura de monetização — o convite para
// o plano — ficou desligada para praticamente toda a gente. A oferta só
// apareceria para quem tem saldo ABAIXO de um episódio, que é justamente quem
// não consegue agir sobre ela.
//
// Nada aqui redigita preço nem refaz a conta do cobrador (memória
// `predicado-do-cobrador-nao-se-redigita`): esta função só escolhe QUAL das
// duas contas decide o cadeado, e a escolhida é a acumulada.

export type AcessoDaTemporada = {
  /** Quantos episódios da faixa o saldo de hoje paga, em sequência a partir
   *  do primeiro. Posicional: o episódio da posição i está liberado se
   *  `i < liberados`. */
  liberados: number
  /** Quantos ficam atrás do plano. É deste número que a moldura vive. */
  bloqueados: number
}

/**
 * @param totalNaFaixa quantos episódios a faixa está a pintar.
 * @param affordableEpisodes a conta ACUMULADA da rota (`floor(saldo/custo)`),
 *        ou `null` quando o custo do episódio é desconhecido.
 */
export function acessoDaTemporada(
  totalNaFaixa: number,
  affordableEpisodes: number | null | undefined,
): AcessoDaTemporada {
  const total = Number.isFinite(totalNaFaixa) && totalNaFaixa > 0 ? Math.floor(totalNaFaixa) : 0
  // DESCONHECIDO NÃO VIRA ZERO. Sem a conta acumulada não há como saber o que
  // o saldo paga: a faixa continua clicável (clicar só carrega o roteiro, não
  // cobra) e a moldura fica CALADA em vez de inventar um cadeado.
  if (typeof affordableEpisodes !== 'number' || !Number.isFinite(affordableEpisodes)) {
    return { liberados: total, bloqueados: 0 }
  }
  const liberados = Math.max(0, Math.min(total, Math.floor(affordableEpisodes)))
  return { liberados, bloqueados: total - liberados }
}

// ═══ KINEO-TEMPORADA-COTA-2026-09-06 (sprint-assinaturas #32) ══════════════
//
// O NÚMERO QUE MANDOU ESCREVER ISTO (medido 06/09 em produção, 7 dias):
//
//   156 pessoas terminaram um filme. Em **77** o filme mais recente é `fast`.
//   Dessas, **19** não têm trial ativo nem plano pago — e para elas
//   `creditCostForDuration('fast', false, s)` devolve **0**.
//
// Com custo 0, a rota devolvia `affordableEpisodes: null` — o ramo "custo
// desconhecido" — e `acessoDaTemporada` (#31), por prudência deliberada,
// traduz desconhecido para "não invento cadeado": cinco episódios LIBERADOS.
// Ou seja, a faixa prometia cinco episódios grátis a quem o portão vai recusar
// no primeiro clique: o Kineo 1 grátis não é cobrado em CRÉDITO, é cobrado em
// COTA (1 por janela rolante de 30 dias, `lib/freeTierOffer`), e quem acabou
// de receber o filme 1 gastou exatamente essa vaga.
//
// Custo 0 nunca significou "de graça à vontade". Significa "esta moeda não é
// crédito". A pergunta certa deixa de ser `floor(saldo/custo)` — divisão por
// zero disfarçada de `null` — e passa a ser "quantas vagas de cota sobram?".
//
// ⚠ NÃO REDIGITA O PREDICADO DO COBRADOR (memória
// `predicado-do-cobrador-nao-se-redigita`): quem decide se esta pessoa paga em
// cota é `getEffectiveEntitlement().countsAgainstFreeQuota`, e quem conta as
// vagas é `countFreeFastUsage` — a MESMA função que o `compose` usa para
// RECUSAR. Esta biblioteca não conhece limite, janela, plano nem preço: recebe
// o número já contado e escolhe qual moeda decide o cadeado.

/**
 * Quantos episódios da faixa a pessoa consegue render HOJE — em qualquer das
 * duas moedas da casa.
 *
 * @param custo créditos por episódio (`creditCostForDuration`), ou `null`
 *        quando o motor/duração do filme 1 não permitiram calcular.
 * @param saldo créditos em carteira.
 * @param cotaRestante vagas livres da cota free na janela, já contadas pelo
 *        mesmo código que recusa no `compose`. `null` = não foi possível
 *        contar (falha de leitura) OU a pessoa não paga em cota.
 * @param total quantos episódios a faixa está a pintar.
 *
 * @returns quantos cabem, ou `null` para "não sei" — e `null` mantém a moldura
 *          CALADA, nunca a transforma em zero (o lado que inventaria cadeado).
 */
export function episodiosQueCabem(input: {
  custo: number | null | undefined
  saldo: number
  cotaRestante: number | null | undefined
  total: number
}): number | null {
  const { custo, saldo, cotaRestante, total } = input
  const teto = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0
  if (typeof custo !== 'number' || !Number.isFinite(custo)) return null

  // MOEDA COTA. Custo zero não é "ilimitado": é "não se paga em crédito".
  if (custo <= 0) {
    if (typeof cotaRestante !== 'number' || !Number.isFinite(cotaRestante)) return null
    return Math.max(0, Math.min(teto, Math.floor(cotaRestante)))
  }

  // MOEDA CRÉDITO. Conta acumulada, a mesma que o #31 escolheu.
  const s = Number.isFinite(saldo) && saldo > 0 ? Math.floor(saldo) : 0
  return Math.max(0, Math.min(teto, Math.floor(s / custo)))
}
