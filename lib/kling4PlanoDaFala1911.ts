// ═══ KINEO-PLANO-DA-FALA-1911 · A1 [CEO 19/11; dono 19/11 ~08:00: "Cena fora do pedido em 43, personagem trocou em 25, final fraco… isso acaba hoje"] ═══
// Diagnóstico (docs/decisoes-1911/tres-defeitos/DIAGNOSTICO-CEO-1911.md, 35 filmes vistos em quadros): cena fora (8 de 16) e final fraco (7 de 12)
// nascem no plano de cenas. Desde 11/11 (KLING4_PLANO_VARIADO = 'public') cada metade de uma cena fundida do Kling 4 grátis perde o texto do
// descritor e vira o molde "Main subject of this shot: <pista>, shown in motion." — a pista [Pexels: …] de 3 a 4 palavras ("starry night sky
// with North Star": 6 s de céu, o grifo ausente, 64b0919e). Aqui, com o interruptor ligado:
//  · cada seção do roteiro ganha a SUA descrição, escrita pelo mesmo descritor da rota a partir do PEDIDO (Topic) e da FALA daquela seção, numa
//    chamada que corre em paralelo com a das cenas (sem somar espera); a regra do descritor por seção diz que a pista é só termo de busca e que
//    o último plano mostra o desfecho COM o sujeito central do pedido;
//  · a metade de cena fundida usa essa descrição como ação; sem descrição (chamada falhou), a ação é a FALA da seção — nunca a pista sozinha;
//  · o molde da pista não roda (objetoConcreto desligado).
// Não muda: as cenas (still, crítico, clipe da reserva H3 de 3 cenas), cena de uma seção só, o envio fora do Kling 4 grátis. 'off' = byte a byte.

export type ModoPlanoDaFala = 'off' | 'internal' | 'public'
export const KLING4_PLANO_DA_FALA_1911: ModoPlanoDaFala = 'off' // nasce desligado; ligar = decisão da CEO depois do revisor independente
export const KLING4_PLANO_DA_FALA_VERSAO = 'plano_da_fala_1911_v1'

export function planoDaFalaLigado(modo: ModoPlanoDaFala, contaDaCasa: boolean): boolean {
  return modo === 'public' || (modo === 'internal' && contaDaCasa === true)
}

/** Acrescentado ao sistema do descritor SÓ na chamada por seção (cada item = uma seção do roteiro). */
export const REGRA_DO_PLANO_DA_FALA = '\n- KINEO-PLANO-DA-FALA-1911: each item is ONE short shot (about 3 to 5 seconds) of a 15-second film, one per narration line, in order. Write it from the Topic (the person\'s request) and that line\'s narration: show the subject that narration is about, doing what it says. The visual hint is only a stock-footage search term: it may add surroundings but a shot is never only the hint. The LAST item shows how the story ends, with the central subject of the Topic clearly visible in that final moment, never an empty landscape, sky or mood shot.'

const norm = (t: unknown) => String(t ?? '').trim().replace(/\s+/gu, ' ')

/** As seções no formato que o descritor lê (narration + visual hint). */
export function secoesParaODescritor(secoes: ReadonlyArray<{ voiceover: string; pexelsQuery: string }>): { voiceover: string; stockSearchQuery: string; description: string }[] {
  return secoes.map((s) => ({ voiceover: norm(s.voiceover), stockSearchQuery: norm(s.pexelsQuery), description: '' }))
}

/** A descrição do descritor para cada seção (null onde veio vazia), no tamanho das seções; contagem errada = todas null (nunca desloca). */
export function descricoesPorSecao(saida: readonly unknown[] | null | undefined, nSecoes: number): (string | null)[] {
  if (!Array.isArray(saida) || saida.length !== nSecoes) return Array.from({ length: nSecoes }, () => null)
  return saida.map((d) => { const t = norm(d); return t.length >= 12 && t.length <= 320 ? t : null })
}

// acaoDaCena, acaoDaSecao e PLANO_DA_FALA_TETO moram em lib/kling4QuatroPlanos.ts (o guardião do plano por seção executa aquela lib solta, sem import).
