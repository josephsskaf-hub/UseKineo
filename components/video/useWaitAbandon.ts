'use client'

// KINEO-SAIDA-DA-ESPERA-2026-08-31 (sprint-v1v4 #6)
//
// O NUMERO QUE OBRIGOU ESTE ARQUIVO (medido hoje, 7 dias, so gente externa):
//
//   94 pessoas apertaram gerar  ->  66 receberam filme.
//   27 apertaram e nunca completaram. Dessas 27:
//       13 deixaram um `generation_stage_error` (sabemos o porque)
//       14 NAO deixaram absolutamente nada
//            - 4 tem video `completed` no banco e nenhum evento de conclusao
//            - 10 nao tem nem linha em `videos`
//   Das 10 sem nada, o ULTIMO estagio registrado foi:
//       generating 6 / analyzing 1 / clips_ready 1 / options 1 / script_preview 1
//
// Ou seja: o maior grupo de gente que some do produto some DENTRO DA ESPERA,
// e o produto nao registra a saida. Nao e falha de render -- e ausencia total
// de registro. A rodada #5 acabou de garantir que toda FALHA diz o motivo;
// este arquivo fecha o buraco vizinho: a saida silenciosa NAO e falha, e por
// isso nenhum tratador de erro jamais a viu.
//
// POR QUE MEDIR ANTES DE CONSERTAR (e nao mais um botao):
// A tentacao era escrever "pode fechar a aba, a gente te avisa por e-mail".
// O `send-video-ready` existe e e bom, mas so alcanca quem TEM video
// `completed` -- e 10 dessas 12 pessoas nunca tiveram linha em `videos`. A
// frase seria mentira justamente para quem mais precisa dela, e o CLAUDE.md ja
// tem uma lista de "copy que mente" grande demais. Primeiro descobrir se a
// pessoa saiu, quando saiu e se voltou; a promessa vem depois, verdadeira.
//
// O QUE ELE NAO FAZ, de proposito:
//   - nao muda UMA linha de tela, nem fluxo, nem credito, nem preco;
//   - nao carrega prompt, topico, titulo nem e-mail -- so estagio, modo e
//     segundos. Nenhum dado da pessoa viaja;
//   - nao tenta segurar a pessoa (nada de `beforeunload`, que e exatamente o
//     popup irritante que faz fechar aba).
//
// COMO SOBREVIVE AO FECHAMENTO DA ABA: `trackEvent` ja faz `fetch` com
// `keepalive: true` (lib/analytics.ts), que e o mecanismo desenhado para
// requisicao disparada em `pagehide`. Nao precisa de `sendBeacon`.
//
// POR QUE `pagehide` E NAO `unload`: `unload` nao dispara no bfcache do
// Safari/Chrome mobile -- justamente onde mais gente troca de aba. `pagehide`
// dispara nos dois casos.

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

/** Estagio nunca vai para o banco cru: so rotulos conhecidos do pipeline. */
const MAX_ESTAGIO = 40

function estagioSeguro(estagio: string | null | undefined): string {
  const bruto = (estagio ?? '').trim()
  if (!bruto) return 'unknown'
  // So letras, numeros e sublinhado -- o estagio e rotulo interno, nunca texto
  // de pessoa. Se um dia alguem passar o topico aqui por engano, ele morre.
  const limpo = bruto.replace(/[^a-zA-Z0-9_]/g, '').slice(0, MAX_ESTAGIO)
  return limpo || 'unknown'
}

function segundosDesde(inicio: number | null): number {
  if (inicio === null) return 0
  const s = Math.round((Date.now() - inicio) / 1000)
  return s >= 0 && s < 86400 ? s : 0
}

export interface WaitAbandonInput {
  /** true enquanto existe render em voo (qualquer estagio de processamento). */
  ativo: boolean
  /** rotulo do estagio atual do pipeline (`generating`, `clips_ready`, ...). */
  estagio: string | null | undefined
  /** motor/modo escolhido, para separar espera de 40s de espera de 6min. */
  modo?: string | null
}

/**
 * Registra a saida -- e a volta -- de quem esta esperando um render.
 *
 * Eventos emitidos (no maximo um de cada por render):
 *   - `render_wait_backgrounded` -- a aba foi para segundo plano na espera
 *   - `render_wait_returned`     -- a pessoa voltou (traz quanto ficou fora)
 *   - `render_wait_abandoned`    -- a pagina foi embora com o render em voo
 */
export function useWaitAbandon({ ativo, estagio, modo }: WaitAbandonInput): void {
  const inicioRef = useRef<number | null>(null)
  const escondidoEmRef = useRef<number | null>(null)
  const jaAvisouSaidaRef = useRef(false)
  const jaAvisouVoltaRef = useRef(false)
  const jaAvisouAbandonoRef = useRef(false)
  // Estagio e modo mudam durante a espera; os refs deixam os ouvintes lerem o
  // valor de AGORA sem reassinar `pagehide` a cada troca de estagio (reassinar
  // no meio da espera e a receita classica de perder o evento de saida).
  const estagioRef = useRef<string | null | undefined>(estagio)
  const modoRef = useRef<string | null | undefined>(modo)
  estagioRef.current = estagio
  modoRef.current = modo

  useEffect(() => {
    if (!ativo) {
      // Render terminou (pronto ou falhou): zera para o proximo.
      inicioRef.current = null
      escondidoEmRef.current = null
      jaAvisouSaidaRef.current = false
      jaAvisouVoltaRef.current = false
      jaAvisouAbandonoRef.current = false
      return
    }
    if (typeof document === 'undefined' || typeof window === 'undefined') return
    if (inicioRef.current === null) inicioRef.current = Date.now()

    const base = () => ({
      stage: estagioSeguro(estagioRef.current),
      mode: estagioSeguro(modoRef.current),
      waited_s: segundosDesde(inicioRef.current),
    })

    const aoTrocarVisibilidade = () => {
      if (document.hidden) {
        if (jaAvisouSaidaRef.current) return
        jaAvisouSaidaRef.current = true
        escondidoEmRef.current = Date.now()
        void trackEvent('render_wait_backgrounded', base())
        return
      }
      // Voltou. So interessa se chegou a sair.
      if (!jaAvisouSaidaRef.current || jaAvisouVoltaRef.current) return
      jaAvisouVoltaRef.current = true
      void trackEvent('render_wait_returned', {
        ...base(),
        away_s: segundosDesde(escondidoEmRef.current),
      })
    }

    const aoSair = () => {
      if (jaAvisouAbandonoRef.current) return
      jaAvisouAbandonoRef.current = true
      void trackEvent('render_wait_abandoned', {
        ...base(),
        // Distingue "fechou a aba olhando a barra" de "trocou de aba e nunca
        // mais voltou" -- sao duas pessoas diferentes e pedem consertos
        // diferentes.
        was_backgrounded: jaAvisouSaidaRef.current,
        hidden_at_exit: document.hidden,
      })
    }

    document.addEventListener('visibilitychange', aoTrocarVisibilidade)
    window.addEventListener('pagehide', aoSair)
    return () => {
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade)
      window.removeEventListener('pagehide', aoSair)
    }
  }, [ativo])
}

export default useWaitAbandon
