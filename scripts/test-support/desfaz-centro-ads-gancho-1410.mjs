// KINEO-CENTRO-ADS-GANCHO-1410 — DESFAZ, em memória, a centralização aprovada pelo fundador em 14/10 ("tudo sim") para os
// guardiões que conferem estes arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa
// com test-).
//   · Studio Ads: frases de tela (lib/ads/adV2Montage.ts, anúncio de sempre E com ator) e o slogan/apoio do cartão final da
//     Produção (lib/ads/producao.ts) ganham x_alignment '50%' — a caixa (x 50%, largura 84%/86%) não muda; o texto, que o
//     Creatomate alinha à ESQUERDA da caixa por padrão (x_alignment 0%), passa a sair no meio dela;
//   · filme: o título do gancho do 1º quadro (lib/hookFirstFrame.ts) ganha o mesmo x_alignment '50%'.
// O cartão final do Ads v2 é um PNG desenhado no navegador (lib/ads/endCard.ts, textAlign 'center'): não é texto do Creatomate.
//
// Só ACRÉSCIMOS: cada linha marcada é NOVA e tem o texto EXATO esperado; a contagem por arquivo é exata. Linha marcada com outro
// texto, contagem diferente ou arquivo fora da lista com a marca = lança (o guardião fica vermelho): nada se esconde numa linha
// marcada. scripts/test-centro-ads-gancho-1410.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE o pai do primeiro
// commit marcado.
//
// ORDEM ao encadear: este desfaz roda ANTES (por dentro) dos desfaz mais antigos — o de melhorias (desfaz-melhorias-1410)
// confere o arquivo da montagem por NÚMERO DE LINHA, e as linhas novas daqui empurrariam os trechos dele.
export const MARCA_CENTRO_ADS_GANCHO_1410 = 'KINEO-CENTRO-ADS-GANCHO-1410'

const TRAVA = '[TRAVA 8.2 — vai do fundador 14/10]'
export const LINHA_FRASE_ADS_1410 = `      x_alignment: '50%', // ${MARCA_CENTRO_ADS_GANCHO_1410} ${TRAVA} — a frase de tela no MEIO da caixa de 84% (o padrão do Creatomate é a esquerda)`
export const LINHA_CARTAO_PRODUCAO_1410 = `      x_alignment: '50%', // ${MARCA_CENTRO_ADS_GANCHO_1410} ${TRAVA} — slogan e apoio do cartão final no MEIO da caixa de 86%`
export const LINHA_GANCHO_1410 = `    x_alignment: '50%', // ${MARCA_CENTRO_ADS_GANCHO_1410} ${TRAVA} — o título do gancho no MEIO da caixa (o padrão do Creatomate é a esquerda)`

const ARQUIVOS = {
  'lib/ads/adV2Montage.ts': [LINHA_FRASE_ADS_1410, LINHA_FRASE_ADS_1410],
  'lib/ads/producao.ts': [LINHA_CARTAO_PRODUCAO_1410],
  'lib/hookFirstFrame.ts': [LINHA_GANCHO_1410],
}

/** Arquivos que o ajuste tocou (o guardião confere contra o diff real). */
export const ARQUIVOS_CENTRO_ADS_GANCHO_1410 = Object.keys(ARQUIVOS)
/** Linhas acrescentadas por arquivo, na ordem em que aparecem. */
export const ACRESCIMOS_CENTRO_ADS_GANCHO_1410 = Object.fromEntries(Object.entries(ARQUIVOS).map(([k, v]) => [k, [...v]]))

/** O texto do arquivo `p` de ANTES do ajuste. Preserva CRLF. Idempotente: sem linha marcada, devolve igual. */
export function semCentroAdsGancho1410(p, s) {
  const esperadas = ARQUIVOS[p]
  const bruto = String(s)
  if (!bruto.includes(MARCA_CENTRO_ADS_GANCHO_1410)) return bruto
  if (!esperadas) throw new Error(`desfaz-centro-ads-gancho-1410: marca num arquivo fora do ajuste: ${p}`)
  const crlf = bruto.includes('\r\n')
  const texto = crlf ? bruto.replace(/\r\n/g, '\n') : bruto
  const out = []
  const achadas = []
  for (const l of texto.split('\n')) {
    if (!l.includes(MARCA_CENTRO_ADS_GANCHO_1410)) { out.push(l); continue }
    achadas.push(l)
  }
  if (achadas.length !== esperadas.length || achadas.some((l, i) => l !== esperadas[i])) {
    throw new Error(`desfaz-centro-ads-gancho-1410: forma inesperada em ${p} (${achadas.length}/${esperadas.length} linhas marcadas, ou texto diferente do esperado)`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** Forma (caminho, texto) dos guardiões byte a byte: só mexe nos arquivos do ajuste; null/undefined passam direto. */
export function desfazCentroAdsGancho1410(p, s) {
  if (s == null || !ARQUIVOS[p]) return s
  return semCentroAdsGancho1410(p, s)
}

/** Desfaz pelo CONTEÚDO, para guardiões que leem um arquivo sem passar o caminho: tenta cada arquivo do ajuste cuja forma
 *  bate. Texto sem a marca passa igual. */
export function desfazCentroAdsGancho1410Texto(s) {
  if (s == null) return s
  const bruto = String(s)
  if (!bruto.includes(MARCA_CENTRO_ADS_GANCHO_1410)) return bruto
  for (const p of ARQUIVOS_CENTRO_ADS_GANCHO_1410) {
    try { return semCentroAdsGancho1410(p, bruto) } catch { /* forma de outro arquivo */ }
  }
  throw new Error('desfaz-centro-ads-gancho-1410: texto marcado que não bate com nenhum arquivo do ajuste')
}

/** Linha do diff que pertence a este ajuste (para guardiões que leem o `git diff` e só aceitam linhas conhecidas). */
export function linhaDoCentroAdsGancho1410(linha) {
  return String(linha ?? '').includes(MARCA_CENTRO_ADS_GANCHO_1410)
}
