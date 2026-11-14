// KINEO-GUIA-PRIVADO-1411 [CEO 14/11: "APROVO a A" — o guia do molde de movimento num caminho PRIVADO do nosso bucket, manifesto com tamanho e sha256 no
// repositório, URL assinada de 1 h para a fal e redirecionamento curto para o cartão]. Antes o MP4 do guia morava em lib/recreate/assets, ia inteiro no
// pacote das funções /api/recreate (teto de 45 MB, em 44,4) e era lido inteiro em memória a cada pedido. Agora o repositório guarda só ESTE manifesto
// (o nome do arquivo, o tamanho e o sha256); o arquivo mora no bucket privado `quarantine`, pasta recreate-guias/v1 (a limpeza de 48 h do bucket só
// toca a pasta da auditoria da trava). Cópia de segurança: o original em docs/decisoes-1311 (fora do repositório) e a cópia pública antiga em
// renders/recreate-sources/v1 (a que o 1º pedido pago subiu; a varredura horária copia dela para o privado SÓ se o sha256 bater).
// Guardião: scripts/test-recreate-movimento-1411.mjs (manifesto, sha256, URL assinada nunca em evento ou log, falha antes do débito).

export const GUIAS_BUCKET = 'quarantine'
export const GUIAS_PASTA = 'recreate-guias/v1'
/** Onde o 1º pedido pago publicou o guia (bucket público): fonte da cópia para o privado, com o sha256 conferido. */
export const GUIAS_LEGADO_BUCKET = 'renders'
export const GUIAS_LEGADO_PASTA = 'recreate-sources/v1'

export type GuiaDoMolde = { arquivo: string; bytes: number; sha256: string }
/** chave do guia (o `guia` do molde) → o arquivo no bucket privado, o tamanho e o sha256 conferidos. */
export const GUIAS_MANIFESTO: Readonly<Record<string, GuiaDoMolde>> = {
  'jogada-de-futebol.mp4': { arquivo: 'recreate-mov-jogada-de-futebol-v1.mp4', bytes: 2917240, sha256: '652ffcdcae22c910e029147aa382558c3b4de57794ddc2a7b7fd935921da69b8' },
}

export const guiaDoManifesto = (chave: string | undefined | null): GuiaDoMolde | null => (chave && Object.hasOwn(GUIAS_MANIFESTO, chave) ? GUIAS_MANIFESTO[chave] : null)
export const guiaCaminho = (chave: string | undefined | null): string | null => { const g = guiaDoManifesto(chave); return g ? `${GUIAS_PASTA}/${g.arquivo}` : null }
