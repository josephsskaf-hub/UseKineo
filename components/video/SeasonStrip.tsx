'use client'

// ═══ KINEO-TEMPORADA-TELA-2026-09-06 (sprint-assinaturas #30) ══════════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (medido 06/09 19:00 UTC, produção):
//
//   `season_written` = 11 pessoas · `season_shown` = **0**
//
// A porta de servidor da temporada (#18/#19, app/api/season) está no ar desde
// hoje de manhã, escreve os títulos dos episódios 2 a 6, devolve o CUSTO de
// cada um vindo de `creditCostForDuration` e o SALDO da pessoa — e **nenhuma
// tela do produto a chama**. É a memória `contrato-de-servidor-sem-chamador`
// pela terceira vez em oito horas: o servidor da casa pronto, a tela ausente.
// Onze temporadas foram escritas hoje e todas as onze só existiram dentro de
// um e-mail que ninguém abriu (11 enviados, 0 retornos).
//
// ONDE ESTA FAIXA MORA, E POR QUÊ: na tela de filme pronto, logo acima da
// prateleira "your next 3 shorts". É o instante de alegria máxima — a mesma
// tela que `video_ready_viewed` mostra ter ~130 visitas por semana — e é
// exatamente de lá que 109 das 145 pessoas ativadas saem para nunca mais
// voltar, 65 delas **com saldo intacto**. Elas não foram barradas; foram
// embora satisfeitas, porque receberam o que vieram buscar: UM vídeo.
//
// A INVERSÃO: "quer fazer outro?" é uma pergunta, exige uma ideia e morre num
// formulário em branco. "O episódio 3 chama-se «X» — quer render?" é uma
// afirmação e exige um clique. O produto deixa de entregar um arquivo e passa
// a entregar **um canal começado**.
//
// ⚠ NÃO ESCREVE PREÇO. Nem um número de dólar existe neste arquivo. O custo
// em créditos e o `affordable` de cada episódio vêm PRONTOS da rota, que os
// deriva de `creditCostForDuration` — a mesma conta do cobrador (memória
// `predicado-do-cobrador-nao-se-redigita`). Quem não tem saldo lê "o resto da
// sua temporada" e vai para /pricing, onde o preço público vive.
//
// ⚠ FALHA CALADA, POR DESENHO. Rota fora do ar, 401, JSON quebrado, sem
// temporada: renderiza `null`. A tela de filme pronto NUNCA pode mostrar erro
// — a pessoa já tem o vídeo pelo qual pagou um crédito.
//
// ⚠ POR QUE POST E NÃO GET. O GET tem `escrever: false` e devolve `null` para
// quem ainda não tem temporada gravada — que é TODO MUNDO no instante em que
// o filme 1 fica pronto. Um GET aqui renderizaria nada para 100% das pessoas.
// O POST é o contrato desenhado para este momento: escreve UMA vez por filme
// (`garantirTemporada` memoiza em `events`) e devolve a MESMA temporada em
// toda chamada seguinte. Não cobra crédito, não chama a fal, não renderiza —
// escreve cinco títulos com gpt-4o-mini. Guardado por ref: uma vez por filme.

import { useEffect, useRef, useState } from 'react'

export interface SeasonEpisode {
  n: number
  title: string
  seed: string
  cost: number | null
  affordable: boolean
}

interface SeasonPayload {
  season: { fromVideoId: string | null; fromTitle: string; episodes: SeasonEpisode[] } | null
  balance: number
  episodeCost: number | null
  affordableEpisodes: number | null
}

interface Props {
  /** O filme que acabou de ficar pronto. Sem ele a rota usa o mais recente. */
  videoId: string | null
  /**
   * Carrega o tema do episódio no compositor e devolve a pessoa ao topo — a
   * MESMA convenção de `NextShortsSection.onPick`. O pai é dono do reset
   * porque só ele sabe desmontar a máquina de estado do render com segurança.
   * Nada é gerado e nada é cobrado no clique: a pessoa ainda aperta Generate.
   */
  onPick: (episode: SeasonEpisode) => void
  /** Telemetria fire-and-forget; o pai fornece o rastreador do app. */
  onEvent?: (name: string, meta?: Record<string, unknown>) => void
}

/**
 * O rótulo do episódio 1 é o TÍTULO DO FILME da pessoa, e esse campo não é um
 * título curado: é o que ela escreveu na caixa. Medido nas 11 temporadas
 * gravadas hoje — **5 passam de 70 caracteres (máx. 120) e 1 começa com
 * `*🎙️ COMPLETE VOICEOVER SCRIPT - ...`**, porque a pessoa colou o roteiro
 * inteiro. Numa linha de uma só altura isso quebra a faixa.
 *
 * Só APRESENTAÇÃO: não reescreve o que está guardado, não toca no filme e não
 * mexe no pipeline. Tira marcador de roteiro do começo, colapsa espaços e corta
 * em fronteira de palavra — nunca no meio de uma.
 */
export function rotuloDoEpisodio1(bruto: string): string {
  const limpo = bruto
    .replace(/^[\s*_#>-]+/, '')
    .replace(/^(?:🎙️?|🎬|📝)\s*/u, '')
    .replace(/^(?:COMPLETE\s+)?VOICEOVER\s+SCRIPT\s*[-–—:]*\s*/i, '')
    .replace(/^(?:HOOK|MICRO REWARD|ESCALATION|PAYOFF)\s*[-–—:]*\s*/i, '')
    .replace(/^["“']|["”']$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (limpo.length <= 64) return limpo
  const corte = limpo.slice(0, 64)
  const espaco = corte.lastIndexOf(' ')
  return `${(espaco > 40 ? corte.slice(0, espaco) : corte).trimEnd()}…`
}

export default function SeasonStrip({ videoId, onPick, onEvent }: Props) {
  const [data, setData] = useState<SeasonPayload | null>(null)
  const requestedRef = useRef<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const seenRef = useRef(false)

  useEffect(() => {
    // Uma escrita por filme. `videoId` null ainda vale uma tentativa (a rota
    // cai no último filme concluído da pessoa), mas nunca mais de uma.
    const chave = videoId ?? '(ultimo)'
    if (requestedRef.current === chave) return
    requestedRef.current = chave
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/season', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          body: JSON.stringify(videoId ? { videoId } : {}),
        })
        if (!res.ok) return
        const payload = (await res.json()) as SeasonPayload
        if (cancelled) return
        if (!payload?.season || !Array.isArray(payload.season.episodes)) return
        if (payload.season.episodes.length === 0) return
        setData(payload)
      } catch {
        // silêncio deliberado — ver cabeçalho
      }
    })()
    return () => {
      cancelled = true
    }
  }, [videoId])

  // `season_shown` só quando um humano de facto vê a faixa. A lição do
  // `next_shorts_shown` (que disparava quando o fetch resolvia) foi que
  // "carregou" e "foi visto" são números muito diferentes numa tela que tem
  // vídeo + pacote de texto + prateleira + upsell.
  useEffect(() => {
    if (!data?.season) return
    const eps = data.season.episodes
    const marcarVisto = () => {
      if (seenRef.current) return
      seenRef.current = true
      onEvent?.('season_shown', {
        episodes: eps.length,
        affordable_episodes: data.affordableEpisodes,
        episode_cost: data.episodeCost,
        balance: data.balance,
        locked: eps.filter((e) => !e.affordable).length,
      })
    }
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      marcarVisto()
      return
    }
    let io: IntersectionObserver | null = null
    try {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
              marcarVisto()
              io?.disconnect()
              return
            }
          }
        },
        { threshold: [0, 0.35, 1] },
      )
      io.observe(el)
    } catch {
      marcarVisto()
    }
    return () => {
      try {
        io?.disconnect()
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  if (!data?.season) return null
  const { season, affordableEpisodes } = data
  const episodes = season.episodes
  const bloqueados = episodes.filter((e) => !e.affordable).length

  return (
    <div
      ref={rootRef}
      style={{
        margin: '18px 0',
        padding: '16px 16px 14px',
        borderRadius: 14,
        border: '1px solid rgba(148,163,184,.28)',
        background: 'linear-gradient(180deg, rgba(30,41,59,.55), rgba(15,23,42,.35))',
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          opacity: 0.65,
          marginBottom: 4,
        }}
      >
        Your season
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
        This is not one video. It is episode 1.
      </div>
      <div style={{ fontSize: 13, opacity: 0.72, marginBottom: 12 }}>
        We already wrote the next five. Tapping one only loads it — nothing renders and
        nothing is charged until you press Generate, and this video stays saved.
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        <li style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 13, opacity: 0.6 }}>
          <span style={{ minWidth: 34, fontVariantNumeric: 'tabular-nums' }}>Ep 1</span>
          <span>✅ {rotuloDoEpisodio1(season.fromTitle)}</span>
        </li>
        {episodes.map((ep) => (
          <li key={ep.n}>
            <button
              type="button"
              disabled={!ep.affordable}
              onClick={() => {
                onEvent?.('season_episode_clicked', {
                  episode: ep.n,
                  cost: ep.cost,
                  affordable: ep.affordable,
                })
                onPick(ep)
              }}
              style={{
                width: '100%',
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
                textAlign: 'left',
                padding: '9px 10px',
                borderRadius: 10,
                border: '1px solid rgba(148,163,184,.22)',
                background: ep.affordable ? 'rgba(59,130,246,.10)' : 'transparent',
                color: 'inherit',
                cursor: ep.affordable ? 'pointer' : 'default',
                opacity: ep.affordable ? 1 : 0.45,
                font: 'inherit',
                fontSize: 13,
              }}
            >
              <span style={{ minWidth: 34, fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>
                Ep {ep.n}
              </span>
              <span style={{ flex: 1 }}>{ep.title}</span>
              {typeof ep.cost === 'number' ? (
                <span style={{ fontSize: 12, opacity: 0.65, whiteSpace: 'nowrap' }}>
                  {ep.affordable ? `${ep.cost} cr` : `🔒 ${ep.cost} cr`}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>

      {/* A MOLDURA, e ela não inventa preço: o plano deixa de ser "N créditos"
          e passa a ser "o resto da sua temporada". Quantos episódios o saldo
          paga vem de `affordableEpisodes`, calculado na rota. */}
      {bloqueados > 0 ? (
        <div
          style={{
            marginTop: 12,
            paddingTop: 11,
            borderTop: '1px solid rgba(148,163,184,.18)',
            fontSize: 13,
          }}
        >
          <span style={{ opacity: 0.78 }}>
            {typeof affordableEpisodes === 'number' && affordableEpisodes > 0
              ? `Your balance covers ${affordableEpisodes} of these. `
              : ''}
            {bloqueados === 1 ? 'The last episode' : `The remaining ${bloqueados} episodes`} of your
            season unlock with a plan.
          </span>{' '}
          <a
            href="/pricing"
            onClick={() =>
              onEvent?.('season_plan_clicked', {
                locked: bloqueados,
                affordable_episodes: affordableEpisodes,
              })
            }
            style={{ fontWeight: 600, textDecoration: 'underline' }}
          >
            Finish the season →
          </a>
        </div>
      ) : null}
    </div>
  )
}
