// ═══ KINEO-RESERVA-COM-IMAGEM-2011 [CEO 20/11, diagnóstico da prova C, filme 3; cliente eec8a2d3] ═══════════════════════════════════════
// O defeito: quando o Kling 4 do filme grátis não entrega e falta imagem aprovada em alguma das 3 cenas, a reserva vai INTEIRA pelo H3 só de texto
// (modeloDaReservaDoTeste: sem misturar motor). O H3 só de texto gera 768×1344, mas às vezes com a cena DEITADA dentro do quadro: 4 de 10 clipes
// medidos (76c4c5c4 cenas 1 e 3; eec8a2d3, cliente, 17/11, 2 de 4 entregues deitados; 5910c0e8 em pé). O H3 com imagem parte da foto vertical:
// 0 de 3 deitados (8cc34237).
// O conserto: a reserva sempre com imagem. Na hora de começar a reserva (o Kling falhou ou estourou o prazo), a cena sem imagem aprovada ganha a
// imagem-chave 9:16 desenhada do texto da própria cena (flux/dev, ~US$ 0,03, no NOSSO bucket, como os stills da rota). As URLs entram no claim na
// MESMA transição atômica que marca o início da reserva (startKling4TrialFallback): todo processo concorrente vê as mesmas cenas assinadas e o
// modelo continua saindo do dado assinado (modeloDaReservaDoTeste), agora o H3 com imagem. Faltou desenhar alguma = o caminho de hoje (H3 só de
// texto no filme inteiro), nunca motor misturado. Nunca lança.
// Atrás de RESERVA_COM_IMAGEM_2011: 'off' = o caminho de hoje, byte a byte. Ligar = gasto por filme na reserva (pede o sim do dono).
import type { ReservaShot } from '@/lib/cinematic/claim'
import type { StyleAnchor } from '@/lib/cinematic/sceneStyle'

export type ModoReservaComImagem2011 = 'off' | 'all'
export const RESERVA_COM_IMAGEM_2011: ModoReservaComImagem2011 = 'off' // CEO 20/11: 'off' no commit; ligar para cliente = gasto por filme na reserva, pede o sim do dono
export const reservaComImagemLigada = (modo: ModoReservaComImagem2011): boolean => modo === 'all'
export const RESERVA_COM_IMAGEM_VERSAO = 'reserva_com_imagem_2011_v1'
export const RESERVA_COM_IMAGEM_EVENTO = 'kling4_reserva_com_imagem'
/** flux/dev (lib/fastAiScene: ~US$ 0,03 por still). */
export const RESERVA_IMAGEM_USD = 0.03
/** O teto da espera pelas imagens (desenhadas em paralelo, cada uma com a janela do still da rota, 12 s, + a cópia ao bucket). */
export const RESERVA_IMAGEM_TETO_MS = 25_000

const temImagem = (s: ReservaShot | null | undefined): boolean => typeof s?.image_url === 'string' && /^https:\/\//.test(s.image_url)
/** As cenas (0-based) da reserva sem imagem aprovada. */
export const cenasSemImagem = (shots: ReadonlyArray<ReservaShot>): number[] => shots.map((s, i) => (temImagem(s) ? -1 : i)).filter((i) => i >= 0)

/** A imagem desenhada só vale se for nossa (bucket), https e não da fal (a URL da fal expira). */
export const imagemDaReservaValida = (u: unknown): u is string => typeof u === 'string' && /^https:\/\//.test(u) && !/(?:^|\/\/)[^/]*fal\.(?:media|run|ai)\//i.test(u)

/** As cenas com as imagens desenhadas nas que faltavam. Só devolve quando TODAS as que faltavam ganharam imagem válida; senão null (o caminho de hoje). */
export function cenasComImagens(shots: ReadonlyArray<ReservaShot>, imagens: ReadonlyArray<string | null | undefined>): ReservaShot[] | null {
  const faltam = cenasSemImagem(shots)
  if (!faltam.length || imagens.length !== shots.length) return null
  if (faltam.some((i) => !imagemDaReservaValida(imagens[i]))) return null
  return shots.map((s, i) => (faltam.includes(i) ? { ...s, image_url: imagens[i] as string } : s))
}

export interface RelatoReservaComImagem { versao: string; faltavam: number[]; desenhadas: number[]; ok: boolean; ms: number; usd: number }
/** Desenha a imagem-chave 9:16 das cenas sem imagem, em paralelo, dentro do teto. `desenhar` devolve a URL no nosso bucket ou null. Nunca lança. */
export async function desenharImagensDaReserva(
  shots: ReadonlyArray<ReservaShot>,
  desenhar: (prompt: string, indice: number) => Promise<string | null>,
  tetoMs: number = RESERVA_IMAGEM_TETO_MS,
): Promise<{ imagens: (string | null)[]; relato: RelatoReservaComImagem }> {
  const t0 = Date.now()
  const faltam = cenasSemImagem(shots)
  const imagens: (string | null)[] = shots.map(() => null)
  let tm: ReturnType<typeof setTimeout> | null = null
  try {
    const todas = Promise.all(faltam.map(async (i) => {
      try { const u = await desenhar(String(shots[i]?.prompt ?? ''), i); imagens[i] = imagemDaReservaValida(u) ? u : null } catch { imagens[i] = null }
    }))
    await Promise.race([todas, new Promise<void>((ok) => { tm = setTimeout(ok, Math.max(1, tetoMs)) })])
  } catch { /* nunca lança */ } finally { if (tm) clearTimeout(tm) }
  const fotos = [...imagens] // o que chegou dentro do teto (uma resposta tardia não muda nada)
  const desenhadas = faltam.filter((i) => imagemDaReservaValida(fotos[i]))
  return { imagens: fotos, relato: { versao: RESERVA_COM_IMAGEM_VERSAO, faltavam: faltam, desenhadas, ok: faltam.length > 0 && desenhadas.length === faltam.length, ms: Date.now() - t0, usd: Math.round(desenhadas.length * RESERVA_IMAGEM_USD * 1000) / 1000 } }
}

/** O meio que a própria cena escreve ("Film visual medium: stylized 3D animated film look…"): desenho = o still sem o sufixo fotorreal (a cena traz o look);
 *  sem meio escrito ou fotorreal = o still fotorreal de sempre. */
export function estiloDoStillDaReserva(prompt: string): StyleAnchor | null {
  const meio = /Film visual medium:\s*([^.]+)/i.exec(String(prompt ?? ''))?.[1] ?? ''
  // "stylized 3D animated film look, …, not photorealistic" contém "photo": decide a NEGAÇÃO e as palavras de desenho, não a palavra solta
  if (!meio || !(/\bnot photo/i.test(meio) || /\b(?:animated|anime|illustrat\w*|cartoon|drawn|claymation|pixel art|low-poly|painted|stylized)\b/i.test(meio))) return null
  return { look: 'animated3d', suffix: '', lookPhrase: meio.trim() }
}
