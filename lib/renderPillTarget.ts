// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PILULA-FANTASMA-2026-09-03 (sprint-assinaturas #9)
//
// O DEFEITO, medido em 14 dias de producao (contas externas):
//   152 cliques na pilula de render · 95 deles com state='rendering'
//   → 54 desses 95 (57%) carregam `render_id: null`
//   → 11 pessoas, e 6 delas NUNCA tiveram um filme completo na vida.
// O caso vivo que abriu a rodada: 03/09 22:59→23:00 BRT, uma pessoa vinda do
// chatgpt.com, no telefone (360px), que ja tinha entregue a PARTE 1 de uma
// serie e mandou renderizar a PARTE 2 (seedance, cenas todas aceitas, HTTP
// 200). Ela clicou na pilula 16 VEZES em cinco minutos e foi embora sem ver o
// filme.
//
// A CAUSA: a pilula manda TODO render para `/studio/create`, onde quem
// reconecta e `resumeServerActiveRender()` — e essa funcao comeca com
// `if (!probe.renderId) return`. Um render cinematografico ainda no fal NAO
// TEM render id (a propria /api/compose/active documenta isso desde 05/08:
// "it carries no Creatomate render id ... resumable:false ... the client must
// NOT offer 'Check progress' for it"). Ou seja: o servidor ja avisava que
// aquele render nao era religavel, e a pilula ignorava o aviso e oferecia a
// porta assim mesmo. Clicar nao mudava nada na tela — entao a pessoa clicava
// de novo. Clicar 16 vezes no mesmo botao nao e exploracao: e botao que nao
// responde.
//
// A REGRA, agora em um so lugar: um render sem id nao ganha uma porta que
// promete religar. Ele ganha a porta que cumpre — /history, onde o filme
// aparece sozinho quando termina — e um rotulo que diz isso.
//
// Funcao pura de proposito: a decisao de destino da pilula e testavel sem
// React, sem rede e sem banco (scripts/test-pilula-render-fantasma.mjs).
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoDaPilula = 'rendering' | 'failed' | 'completed'

export type AcaoDaPilula = 'resume' | 'track' | 'retry' | 'watch'

export type AlvoDaPilula = {
  /** Para onde o clique leva. Nunca uma tela que nao sabe mostrar este render. */
  href: string
  /** O texto do botao. Promete exatamente o que o destino entrega. */
  badge: string
  /** O que este clique e, para a medicao ('track' = a classe nova). */
  acao: AcaoDaPilula
  /** Verdadeiro so quando existe um render id para religar de verdade. */
  religavel: boolean
}

/**
 * `religavel` exige AS DUAS coisas: o servidor nao ter dito `resumable:false`
 * E existir um render id. O caminho compose da sonda mandava `resumable:true`
 * fixo mesmo com id nulo (a claim nasce antes do id do Creatomate existir), e
 * o cinematografico manda `resumable:false` com id nulo. Derivar das duas
 * fontes cobre os dois casos sem depender de qual delas veio errada.
 */
export function alvoDaPilula(entrada: {
  state: EstadoDaPilula
  renderId: string | null
  resumable?: boolean | null
}): AlvoDaPilula {
  if (entrada.state === 'completed') {
    return { href: '/history', badge: 'Watch', acao: 'watch', religavel: false }
  }
  if (entrada.state === 'failed') {
    return { href: '/studio/create', badge: 'Try again', acao: 'retry', religavel: false }
  }
  const religavel = entrada.resumable !== false && Boolean(entrada.renderId)
  return religavel
    ? { href: '/studio/create', badge: 'Open', acao: 'resume', religavel: true }
    : { href: '/history', badge: 'My Videos', acao: 'track', religavel: false }
}

/**
 * A frase de apoio do render que nao pode ser religado. Ela existe para tirar
 * da pessoa a tarefa de vigiar a tela: o filme cai sozinho na biblioteca.
 * Nunca fala de credito, plano nem preco (fronteira do Codex).
 */
export const FRASE_RENDER_NO_MOTOR =
  'Your AI scenes are being generated at the engine. The film saves to My Videos on its own — you do not have to wait here.'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-HISTORICO-RENDER-VIVO-2026-09-04 (#10) — o buraco que o proprio #9
// abriu, achado antes de subir.
//
// O #9 mandou o render SEM id para `/history` com o rotulo "My Videos" e a
// promessa `FRASE_RENDER_NO_MOTOR` ("the film saves to My Videos on its own").
// Duas coisas estavam erradas nisso, e as duas sao a MESMA doenca que o #9
// dizia estar curando:
//
//   1. `/history` le SO a tabela `videos` (app/(dashboard)/history/page.tsx).
//      Um render cinematografico ainda no fal NAO TEM linha em `videos` — a
//      linha nasce no fim, quando o compose termina. Ou seja: a pessoa era
//      levada para uma tela que nao sabe que o filme dela existe, e via a
//      lista velha (ou "No videos yet"). A promessa e a tela discordavam.
//
//   2. A pilula e montada em TODA pagina autenticada, `/history` inclusive.
//      Clicar "My Videos" ESTANDO em `/history` e `router.push('/history')`:
//      a rota nao muda, a tela nao muda, nada acontece. E exatamente o loop
//      de 16 cliques que o #9 mediu, mudado de lugar.
//
// `mesmaTela` e a trava pura: o clique so e oferecido quando ele MUDA de tela.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * O clique da pilula levaria para a tela em que a pessoa JA ESTA?
 *
 * Compara so a raiz da rota (sem query, sem barra final), porque e o que o
 * `router.push` enxerga: `/history?x=1` e `/history/` sao a mesma tela que
 * `/history`. Caminho desconhecido (null/vazio) devolve `false` — na duvida a
 * pilula continua oferecendo a saida, que e o comportamento de hoje.
 */
export function mesmaTela(href: string, caminhoAtual: string | null | undefined): boolean {
  if (typeof caminhoAtual !== 'string' || !caminhoAtual.trim()) return false
  const normalizar = (v: string) => {
    const semQuery = v.split('?')[0].split('#')[0].trim()
    const semBarra = semQuery.replace(/\/+$/, '')
    return semBarra === '' ? '/' : semBarra.toLowerCase()
  }
  return normalizar(href) === normalizar(caminhoAtual)
}

/** A rota que passa a mostrar o render em curso na propria tela. */
export const ROTA_BIBLIOTECA = '/history'

/**
 * A frase do cartao que o `/history` passa a mostrar enquanto o filme esta no
 * motor. E a MESMA promessa da pilula (`FRASE_RENDER_NO_MOTOR`), agora dita na
 * tela que a cumpre. Nunca fala de credito, plano nem preco (fronteira do Codex).
 */
export const TITULO_RENDER_NA_BIBLIOTECA = 'Your film is being made'
export const FRASE_RENDER_NA_BIBLIOTECA =
  'The scenes are rendering at the engine. This page picks the film up on its own when it is done — you can close the tab.'
