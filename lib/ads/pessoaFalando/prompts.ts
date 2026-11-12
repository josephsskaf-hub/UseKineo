// KINEO-ADS-PESSOA-FALANDO-1111 — passos B e C da spec: o JSON da foto-chave (fal-ai/nano-banana-pro/edit) e o do vídeo com fala
// (bytedance/seedance-2.0/image-to-video — NÃO o reference-to-video da rota seedance2 da Cena). Puro: devolve { endpoint, input }, não chama nada.
import { apresentador, formato, type ApresentadorId, type FormatoId } from './formatos'
import type { Roteiro } from './roteiro'

export const FOTO_CHAVE_ENDPOINT = 'fal-ai/nano-banana-pro/edit'
export const VIDEO_ENDPOINT = 'bytedance/seedance-2.0/image-to-video'
/** Tarifa fal (spec §2): 2 fotos-chave em 1K ≈ US$ 0,30; Seedance 2.0 720p US$ 0,3034/s. */
export const FOTO_CHAVE_USD = 0.3
export const VIDEO_USD_POR_SEGUNDO = 0.3034

export interface EntradaFotoChave { apresentadorId: ApresentadorId; formatoId: FormatoId; produto: string; fotoDoProduto: string; roupa?: string }

/** O prompt-molde da foto-chave: selfie do peito para cima, rosto no terço de cima (~40% da largura), produto na mão no peito, frente para a câmera,
 *  espaço entre o produto e o rosto, cinco dedos, a outra mão fora do quadro, BOCA FECHADA, cenário e roupa do formato. */
export function fotoChave(e: EntradaFotoChave): { endpoint: string; input: Record<string, unknown> } {
  const a = apresentador(e.apresentadorId), f = formato(e.formatoId)
  if (!a || !f || !/^https:\/\//u.test(String(e.fotoDoProduto ?? ''))) throw new Error('pessoa_falando_foto_entrada_invalida')
  const prompt = [
    `Reference image 1 is the approved presenter ${a.nome}: keep ${a.possessivo} exact face, hair and skin${e.roupa ? '' : ' and clothing'}. Reference image 2 is the exact product (${String(e.produto).trim()}): keep its whole shape, colour, lid and label.`,
    `A vertical 9:16 selfie photo taken by ${a.nome} ${f.cenario}${f.extra ? `; ${f.extra}` : ''}${e.roupa ? `, wearing ${e.roupa}` : ''}.`,
    `Framed from the chest up; ${a.possessivo} face in the upper third of the frame, about 40% of the frame width, looking straight into the lens.`,
    `One hand holds the product at chest height with its front and label facing the camera, with clear space between the product and ${a.possessivo} face; five fingers; the other hand is out of frame.`,
    'Mouth closed, lips relaxed. Photoreal, natural light, sharp focus. No text, no captions, no logos other than the product label, no phone interface.',
  ].join(' ')
  return { endpoint: FOTO_CHAVE_ENDPOINT, input: { prompt, image_urls: [a.retrato, e.fotoDoProduto], num_images: 2, resolution: '1K', output_format: 'jpeg', aspect_ratio: '9:16' } }
}

/** 10 s até 25 palavras; 12 s acima (2,3–2,6 palavras/s). */
export function duracaoDaFala(fala: string): '10' | '12' { return String(fala ?? '').trim().split(/\s+/u).filter(Boolean).length <= 25 ? '10' : '12' }

/** O prompt-molde do vídeo: enquadramento do formato + a fala INTEIRA entre aspas + uma frase por gesto + produto idêntico + uma voz só. */
export function videoComFala(e: { apresentadorId: ApresentadorId; formatoId: FormatoId; fotoChave: string }, r: Roteiro): { endpoint: string; input: Record<string, unknown>; segundos: number } {
  const a = apresentador(e.apresentadorId), f = formato(e.formatoId)
  if (!a || !f || !/^https:\/\//u.test(String(e.fotoChave ?? '')) || !r?.fala) throw new Error('pessoa_falando_video_entrada_invalida')
  const fala = String(r.fala).replace(/\s+/gu, ' ').trim().replace(/"/gu, "'")
  const gestos = (r.gestos ?? []).map((g) => `On "${String(g.palavra).trim()}" ${a.pronome} ${String(g.gesto).trim().replace(/[.\s]+$/u, '')}.`).join(' ')
  const prompt = [
    `${f.enquadramento}.`,
    `${a.nome} looks into the lens and says, in a natural, casual voice, with lips clearly synced to every word: "${fala}"`,
    gestos,
    'The product keeps its exact shape, colour and label in every frame and stays in the hand.',
    `One voice only: ${a.possessivo === 'her' ? 'hers' : 'his'}. No music, no narrator, no text on screen.`,
  ].filter(Boolean).join(' ')
  const duration = duracaoDaFala(fala)
  return { endpoint: VIDEO_ENDPOINT, input: { prompt, image_url: e.fotoChave, duration, resolution: '720p', aspect_ratio: '9:16', generate_audio: true }, segundos: Number(duration) }
}
