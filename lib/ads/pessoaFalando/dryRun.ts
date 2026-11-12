// KINEO-ADS-PESSOA-FALANDO-1111 — o dry-run de US$ 0 da spec (§3/§4): com a entrada do cliente e o roteiro (escrito ou editado por ele), devolve os 3
// JSON — roteiro, foto-chave, vídeo — e o custo pela tarifa, sem chamar a fal. A foto-chave do vídeo ainda não existe no dry-run: vai o marcador
// "<FOTO_CHAVE_ESCOLHIDA>" no lugar da URL (a rota troca pela foto que o cliente escolher).
import { fotoChave, videoComFala, FOTO_CHAVE_USD, VIDEO_USD_POR_SEGUNDO, type EntradaFotoChave } from './prompts'
import { validarRoteiro, type Roteiro } from './roteiro'

export const MARCADOR_FOTO_CHAVE = 'https://fotochave.invalid/<FOTO_CHAVE_ESCOLHIDA>'

export function pessoaFalandoDryRun(e: EntradaFotoChave & { frase: string }, r: Roteiro) {
  const motivos = validarRoteiro(r, e)
  const foto = fotoChave(e)
  const video = videoComFala({ apresentadorId: e.apresentadorId, formatoId: e.formatoId, fotoChave: MARCADOR_FOTO_CHAVE }, r)
  const usd = Math.round((FOTO_CHAVE_USD + video.segundos * VIDEO_USD_POR_SEGUNDO) * 100) / 100
  return { dry_run: true as const, charged: false as const, roteiro: { ...r, aprovado: motivos.length === 0, motivos }, foto_chave: foto, video: { endpoint: video.endpoint, input: video.input }, segundos: video.segundos, custo_fal_usd: usd }
}
