'use client'

// ═══ KINEO-AVISO-DE-PRONTO-2026-08-21 ══════════════════════════════════════
//
// POR QUE ISTO EXISTE, e por que NÃO é "cortar a espera":
//
// Passei a manhã tentando cortar a espera e a medição matou o plano. Da
// tabela `broll_metrics` (342 renders / 14 dias):
//     nosso código ........... 18,4s mediana
//     Creatomate ............ 182,7s mediana (p90 316,4s)
// 90% do relógio é o fornecedor renderizando 1080×1920@24. O custo dele é
// linear em pixels×fps×duração, então a ÚNICA alavanca real é baixar
// resolução — e o fundador vetou qualquer coisa que estrague o resultado.
// Otimizar os nossos 18s economizaria ~9% de uma espera de 3 minutos: trabalho
// grande, ganho invisível.
//
// ENTÃO A PERGUNTA CERTA MUDOU. Não é "quanto tempo dura?", é "quanto tempo a
// pessoa PASSA esperando?". E essas duas coisas se descolam por um motivo
// banal: em 3 minutos ninguém fica olhando uma barra. A pessoa troca de aba.
// Quando o filme fica pronto, a aba do Kineo está no fundo e ninguém avisa —
// o vídeo pronto espera pela pessoa em vez de a pessoa esperar pelo vídeo.
//
// Isso não é teoria: `send-video-ready` existe desde 03/08 porque 70% de quem
// gerava nunca baixava, e o cron nasceu justamente para alcançar quem "fechou
// a aba durante os 3-7 min de render". Só que e-mail chega em 30 MINUTOS, no
// melhor caso — a pessoa já saiu do modo de trabalho. Este aviso chega no
// SEGUNDO em que o filme existe, enquanto ela ainda está no computador, com a
// aba aberta a um clique de distância.
//
// O QUE ELE FAZ (nesta ordem de agressividade, e a ordem importa):
//   1. TÍTULO DA ABA pisca "🎬 Your film is ready" — zero permissão, zero
//      dependência, funciona em todo browser. É 90% do valor.
//   2. FAVICON ganha um ponto — reforço visual para quem tem 20 abas e não
//      lê título.
//   3. Notificação do sistema SÓ se a pessoa JÁ concedeu permissão antes.
//      NUNCA pedimos permissão aqui: um popup de permissão no meio de uma
//      espera é exatamente o tipo de atrito que faz fechar a aba, e o ganho
//      marginal sobre o título piscando é pequeno.
//
// ⚠️ NADA DE SOM. Foi uma tentação e é errado: a pessoa pode estar numa
// reunião, com fone, ou com o filho dormindo. Aviso que constrange é aviso que
// vira desinstalação. Piscar título é impossível de dar errado.
//
// ⚠️ SÓ DISPARA COM A ABA EM SEGUNDO PLANO (`document.hidden`). Quem está
// olhando a tela já viu o vídeo aparecer; piscar o título para essa pessoa é
// ruído puro. E o efeito se desfaz sozinho no primeiro foco.

import { useEffect, useRef } from 'react'

/** O título volta ao normal assim que a pessoa olha. Guardado fora do efeito
 *  para que uma re-renderização no meio do piscar não perca o original. */
const INTERVALO_MS = 1200

export function useReadyBeacon(pronto: boolean, titulo = '🎬 Your film is ready') {
  const originalRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Uma notificação por render. Sem isto, um re-render do React durante o
  // estado `done` dispararia o aviso de novo a cada ciclo.
  const jaAvisouRef = useRef(false)

  useEffect(() => {
    if (!pronto) {
      jaAvisouRef.current = false
      return
    }
    if (jaAvisouRef.current) return
    if (typeof document === 'undefined') return
    // Aba visível = a pessoa já está vendo. Não há nada para avisar.
    if (!document.hidden) return
    jaAvisouRef.current = true

    originalRef.current = document.title
    let alterna = false
    timerRef.current = setInterval(() => {
      alterna = !alterna
      document.title = alterna ? titulo : (originalRef.current ?? 'Kineo')
    }, INTERVALO_MS)

    // Notificação do sistema — SÓ com permissão já concedida. Ver o cabeçalho:
    // pedir permissão aqui seria trocar um aviso útil por um popup irritante.
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Your film is ready 🎬', {
          body: 'Kineo finished rendering. Click to watch and download.',
          // `tag` colapsa avisos: dois renders seguidos não empilham duas
          // notificações idênticas na bandeja.
          tag: 'kineo-render-ready',
        })
      }
    } catch {
      // Notification pode lançar em contexto inseguro ou em iframe. O piscar
      // do título já cobre o caso — um aviso que falha nunca pode derrubar a
      // tela que entrega o produto.
    }

    const restaurar = () => {
      if (document.hidden) return
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (originalRef.current !== null) {
        document.title = originalRef.current
        originalRef.current = null
      }
    }
    document.addEventListener('visibilitychange', restaurar)

    return () => {
      document.removeEventListener('visibilitychange', restaurar)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      // Restauração incondicional na desmontagem: sair da página com o título
      // preso em "🎬 Your film is ready" seria pior que não avisar nada.
      if (originalRef.current !== null) {
        document.title = originalRef.current
        originalRef.current = null
      }
    }
  }, [pronto, titulo])
}

export default useReadyBeacon
