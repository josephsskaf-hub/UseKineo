// KINEO-REFAZER-GRATIS-2810 — "Redo this scene — free" ÓBVIO no PRIMEIRO filme (fundador 28/10: "o primeiro filme é o
// produto"; ninguém comprou em 6 dias; a revisão diária acha filmes de trial com UMA cena errada — mascote no lugar da
// figura, personagem que some, objeto que muda). Quem vê a cena errada e não tem saída vai embora; quem conserta fica.
//
// POR CIMA do que já existe (nada aqui inventa caminho de dinheiro):
//   · 19/10 (lib/freeRedo/*): todo filme clássico (Seedance 1.5 · Kling 2.5 · Veo 3.1) ganha 1 refação grátis de 1 cena,
//     débito ZERO, linha-trava com id determinístico por filme (idempotente), teto global de 200/dia.
//   · 27/10 (lib/cinematic/refazerCena.ts + SceneRedoPanel): o painel de miniaturas na tela do filme pronto.
// ESTA ENTREGA:
//   1. O PRIMEIRO filme concluído da conta ganha 2 refações grátis no total (a regra dos demais filmes não muda: 1).
//      Como, sem tocar em débito/estorno: a 1ª refação entrega a versão nova (linha nova em `videos`, credits_used 0, como
//      sempre). Só quando o filme refeito é o PRIMEIRO da conta e esta foi a refação nº 1, o servidor guarda também o
//      RenderScript ASSINADO da versão nova, com um elo de cadeia assinado (seq 2, filme raiz, cena trocada). Isso dá à
//      versão nova a sua própria linha-trava de refação grátis — a nº 2. A versão nº 3 nunca ganha fonte: o teto de 2 é
//      estrutural (não existe linha para a 3ª), e a idempotência é a mesma de 19/10 (uma linha-trava por versão).
//   2. Uma linha curta acima do player: "Something off? Redo any scene for free on your first film." (en/pt/es).
//   3. Eventos: scene_redo_offer_viewed e scene_redo_clicked (navegador, com film_id e scene_index) e
//      scene_redo_free_used (SERVIDOR, na entrega, com film_id, scene_index e a ordem da refação grátis).
// Lib PURA (sem React, sem rede, sem node:crypto — a tela também a lê): o guardião scripts/test-refazer-gratis-2810.mjs.
export const MARCA_REFAZER_GRATIS_2810 = 'KINEO-REFAZER-GRATIS-2810'

/** Refações grátis no total do PRIMEIRO filme da conta (fundador 28/10). */
export const FREE_REDO_FIRST_FILM_TOTAL = 2
/** Refações grátis de qualquer outro filme (a regra de 19/10, intacta). */
export const FREE_REDO_OTHER_FILM_TOTAL = 1

export const SCENE_REDO_FUNNEL_EVENTS = {
  offerViewed: 'scene_redo_offer_viewed',
  clicked: 'scene_redo_clicked',
  freeUsed: 'scene_redo_free_used',
} as const

export interface SaldoGratis {
  first_film: boolean
  free_total: number
  free_used: number
  free_left: number
  free_seq: number
}

function inteiroPositivo(v: unknown, padrao: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : padrao
}

/**
 * O saldo de refações grátis de uma VERSÃO do filme.
 *   seq = qual refação grátis esta versão concede (1 = o filme original; 2 = a versão nova do primeiro filme).
 *   usadaAqui = a refação desta versão já foi entregue. usadaNaSeguinte = a versão seguinte também já usou a dela.
 * A versão nº 2 só existe para o primeiro filme (o elo assinado nasce só lá), então seq ≥ 2 ⇒ primeiro filme.
 */
export function saldoGratis(a: { primeiroFilme: boolean; seq?: unknown; usadaAqui: boolean; usadaNaSeguinte?: boolean }): SaldoGratis {
  const seq = inteiroPositivo(a.seq, 1)
  const first = a.primeiroFilme === true || seq >= 2
  const total = first ? FREE_REDO_FIRST_FILM_TOTAL : FREE_REDO_OTHER_FILM_TOTAL
  const used = Math.min(total, (seq - 1) + (a.usadaAqui ? 1 : 0) + (a.usadaAqui && a.usadaNaSeguinte ? 1 : 0))
  return { first_film: first, free_total: total, free_used: used, free_left: Math.max(0, total - used), free_seq: seq }
}

/** Depois da refação nº `seq` entregue: a versão nova ganha a refação seguinte? Só no primeiro filme e até o teto. */
export function versaoNovaGanhaRefacao(a: { primeiroFilme: boolean; seq?: unknown }): boolean {
  const seq = inteiroPositivo(a.seq, 1)
  return a.primeiroFilme === true && seq + 1 <= FREE_REDO_FIRST_FILM_TOTAL
}

/** Lê o saldo que o servidor mandou (a tela nunca calcula grátis/pago; só mostra). Campo ausente = sem oferta. */
export function saldoDaResposta(r: unknown): { firstFilm: boolean; freeLeft: number } {
  const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {}
  const left = typeof o.free_left === 'number' && Number.isInteger(o.free_left) && o.free_left > 0 ? o.free_left : 0
  return { firstFilm: o.first_film === true, freeLeft: left }
}

/** A linha acima do player aparece? Só no primeiro filme, com refação grátis sobrando e com a refação possível ali. */
export function mostrarLinhaDoPrimeiroFilme(r: unknown): boolean {
  const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {}
  const s = saldoDaResposta(o)
  const estado = typeof o.estado === 'string' ? o.estado : ''
  return s.firstFilm && s.freeLeft > 0 && (estado === 'available' || estado === 'failed_retry' || estado === 'done')
}

/** O painel deve passar para a versão nova (a refação nº 2 mora lá)? */
export function proximaVersao(r: unknown): string | null {
  const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {}
  const s = saldoDaResposta(o)
  const id = typeof o.new_video_id === 'string' ? o.new_video_id : ''
  return o.estado === 'done' && s.firstFilm && s.freeLeft > 0 && /^[0-9a-f-]{36}$/i.test(id) ? id : null
}

/** Metadados dos dois eventos do navegador (fechados: só estes campos; nada de texto livre). */
export function metaDoFunil(a: { filmId: string; videoId: string; sceneIndex: number | null; sceneCount?: number | null; firstFilm: boolean; freeLeft: number; surface: 'scene_panel' | 'player_line' }): Record<string, unknown> {
  return {
    marca: MARCA_REFAZER_GRATIS_2810,
    product: 'film',
    surface: a.surface === 'player_line' ? 'player_line' : 'scene_panel',
    film_id: a.filmId,
    video_id: a.videoId,
    scene_index: typeof a.sceneIndex === 'number' && Number.isInteger(a.sceneIndex) && a.sceneIndex >= 0 ? a.sceneIndex : null,
    scene_count: typeof a.sceneCount === 'number' && Number.isInteger(a.sceneCount) && a.sceneCount >= 0 ? a.sceneCount : null,
    first_film: a.firstFilm === true,
    free_left: Number.isInteger(a.freeLeft) && a.freeLeft > 0 ? a.freeLeft : 0,
  }
}

export interface CopyPrimeiroFilme {
  line: string
  action: string
  leftOne: string
  leftMany: string
  panelTitle: string
}

const EN: CopyPrimeiroFilme = {
  line: 'Something off? Redo any scene for free on your first film.',
  action: 'Pick a scene',
  leftOne: '1 free scene redo left on your first film.',
  leftMany: '{n} free scene redos on your first film.',
  panelTitle: 'Redo any scene — free',
}

/** en/pt/es (a tela do Studio já fala essas três); o resto cai no inglês. */
export const COPY_PRIMEIRO_FILME: Readonly<Record<'en' | 'pt' | 'es', CopyPrimeiroFilme>> = {
  en: EN,
  pt: {
    line: 'Algo errado? Refaça qualquer cena de graça no seu primeiro filme.',
    action: 'Escolher a cena',
    leftOne: 'Resta 1 refação de cena grátis no seu primeiro filme.',
    leftMany: '{n} refações de cena grátis no seu primeiro filme.',
    panelTitle: 'Refaça qualquer cena — grátis',
  },
  es: {
    line: '¿Algo no quedó bien? Rehaz cualquier escena gratis en tu primer video.',
    action: 'Elegir la escena',
    leftOne: 'Te queda 1 rehecho de escena gratis en tu primer video.',
    leftMany: '{n} rehechos de escena gratis en tu primer video.',
    panelTitle: 'Rehaz cualquier escena — gratis',
  },
}

export function copyPrimeiroFilme(lang: unknown): CopyPrimeiroFilme {
  return lang === 'pt' || lang === 'es' ? COPY_PRIMEIRO_FILME[lang] : EN
}

export function textoDoSaldo(c: CopyPrimeiroFilme, freeLeft: number): string {
  return freeLeft === 1 ? c.leftOne : c.leftMany.split('{n}').join(String(freeLeft))
}
