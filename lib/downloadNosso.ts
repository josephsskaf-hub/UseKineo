// KINEO-DOWNLOAD-NOSSO-1311 [dono 13/11 ~20:10, depois de um Recreate: "a URL ainda tá parecendo Supabase lá em cima. Tem que arrumar
// isso daí quando a pessoa vai clicar para baixar."] — todo link de baixar mídia NOSSA passa por /api/download, no nosso domínio.
//
// Por que um redirecionamento e não um proxy de bytes: o Storage do Supabase já sabe responder `Content-Disposition: attachment` com o
// nome que a gente escolhe (`?download=<nome>`, conferido em 13/11 num clipe real: 206 + attachment; filename=…). Com attachment o
// navegador BAIXA e a página fica onde está — a barra de endereço nunca mostra o Supabase e não abre aba com o vídeo tocando. A rota
// confere a sessão e o dono (o id da conta é um pedaço do caminho em TODO arquivo de cliente: medido em 13/11 nas tabelas videos,
// clips, images, audios e enhanced — 100% dos caminhos em renders/), grava o evento e manda o 302. Custo de banda na Vercel: zero
// (os bytes continuam saindo do Storage). Um proxy de bytes passaria até 120 MB por função sem ganho para o cliente.
//
// Módulo PURO (sem rede, sem Next): a tela usa downloadHref; a rota usa caminhoDoArquivo/donoDoCaminho/nomeDoArquivo.

export const DOWNLOAD_ROUTE = '/api/download'
export const DOWNLOAD_SERVED_EVENT = 'media_download_served'

/** Extensões que a rota entrega (vídeo, imagem, áudio). Outra extensão = 404. */
export const EXTENSOES_DE_MIDIA = ['mp4', 'webm', 'mov', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'mp3', 'wav', 'm4a'] as const

const PREFIXO_PUBLICO = '/storage/v1/object/public/renders/'
const SEGMENTO = /^[A-Za-z0-9._-]+$/

/** Caminho dentro do bucket renders, validado: sem "..", sem barra dupla, só caracteres seguros, extensão de mídia. null = não é nosso. */
export function caminhoValido(caminho: string | null | undefined): string | null {
  if (typeof caminho !== 'string' || caminho.length === 0 || caminho.length > 300) return null
  const partes = caminho.split('/')
  if (partes.length < 2) return null
  for (const p of partes) if (!p || p === '.' || p === '..' || !SEGMENTO.test(p)) return null
  const ext = extensao(caminho)
  if (!ext || !(EXTENSOES_DE_MIDIA as readonly string[]).includes(ext)) return null
  return caminho
}

/** Se a URL é um arquivo público do NOSSO bucket renders, devolve o caminho dentro dele; senão null (link de fora fica como está). */
export function caminhoDoArquivo(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || !/(^|\.)supabase\.co$/i.test(u.hostname)) return null
    if (!u.pathname.startsWith(PREFIXO_PUBLICO)) return null
    return caminhoValido(decodeURIComponent(u.pathname.slice(PREFIXO_PUBLICO.length)))
  } catch {
    return null
  }
}

/** O arquivo é desta conta? O id da conta tem de ser UM pedaço inteiro do caminho (nunca um pedaço de nome). */
export function donoDoCaminho(caminho: string, userId: string | null | undefined): boolean {
  if (!userId || userId.length < 8) return false
  return caminho.split('/').slice(0, -1).includes(userId)
}

export function extensao(caminho: string): string | null {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(caminho)
  return m ? m[1].toLowerCase() : null
}

/** Nome do arquivo salvo: só letras, números, ponto, hífen e sublinhado; sempre com a extensão REAL do arquivo; padrão kineo-video. */
export function nomeDoArquivo(nome: string | null | undefined, caminho: string): string {
  const ext = extensao(caminho) ?? 'mp4'
  const base = String(nome ?? '')
    .replace(/\.[A-Za-z0-9]{2,5}$/, '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
  return `${base || 'kineo-video'}.${ext}`
}

/**
 * O href de baixar que a TELA usa. Arquivo nosso → /api/download?f=<caminho>&name=<nome>[&s=<tela>] (nosso domínio).
 * Qualquer outra URL volta igual (fornecedor de fora, blob:, vazio) — a tela não perde o link que já tinha.
 */
export function downloadHref(url: string, nome: string, tela?: string): string {
  const caminho = caminhoDoArquivo(url)
  if (!caminho) return url
  const q = new URLSearchParams({ f: caminho, name: nomeDoArquivo(nome, caminho) })
  if (tela && SEGMENTO.test(tela)) q.set('s', tela)
  return `${DOWNLOAD_ROUTE}?${q.toString()}`
}

/** URL final do Storage com o nome de baixar (a rota manda o 302 para cá). */
export function urlDeBaixar(baseSupabase: string, caminho: string, nome: string): string {
  const base = baseSupabase.replace(/\/+$/, '')
  return `${base}${PREFIXO_PUBLICO}${caminho}?download=${encodeURIComponent(nome)}`
}
