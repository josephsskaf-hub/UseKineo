// KINEO-ADS-POS-ENTREGA-1510 — DESFAZ, em memória, as ferramentas depois da entrega do Studio Ads v2 (editar sem gerar de novo,
// aprovação do cliente, 9:16 + 4:5 + 1:1) nos arquivos que os guardiões conferem BYTE A BYTE contra uma base antiga. Módulo
// auxiliar; não é teste (o nome não começa com test-).
//   · lib/ads/adV2Montage.ts: o preenchimento (fundo suave + o clipe inteiro) de clipe só-9:16 num quadro de outra proporção — um
//     bloco entre '// ▼ KINEO-ADS-POS-ENTREGA-1510' e '// ▲ KINEO-ADS-POS-ENTREGA-1510' e linhas marcadas (só valem com fill:true);
//   · AdsV2Simple.tsx e AdsV2Client.tsx: o import do painel AdsV2AfterDelivery e a linha que o põe no resultado.
// Só ACRÉSCIMOS: as linhas que saem (as marcadas e as do bloco) têm o texto EXATO esperado e a contagem por arquivo é exata.
// Linha marcada com outro texto, contagem diferente ou arquivo fora da lista com a marca = lança (o guardião fica vermelho): nada
// se esconde numa linha marcada. scripts/test-ads-pos-entrega-1510.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE o pai
// do commit (git show <pai>:arquivo).
//
// ORDEM ao encadear: este desfaz roda PRIMEIRO (por dentro de todos os outros): é o mais novo, e os desfaz mais antigos conferem
// trechos vizinhos (o de melhorias confere a montagem por NÚMERO DE LINHA; palco/refação procuram trechos com as linhas ao lado).
export const MARCA_POS_ENTREGA_1510 = 'KINEO-ADS-POS-ENTREGA-1510'
const ABRE = `// ▼ ${MARCA_POS_ENTREGA_1510}`
const FECHA = `// ▲ ${MARCA_POS_ENTREGA_1510}`

const ARQUIVOS = {"lib/ads/adV2Montage.ts":["  fill?: boolean // KINEO-ADS-POS-ENTREGA-1510 — clipe que só existe em 9:16 (efeito) num quadro de outra proporção: fundo suave + o clipe INTEIRO (sem corte duro)","// ▼ KINEO-ADS-POS-ENTREGA-1510 — o PREENCHIMENTO do \"baixar 9:16 + 4:5 + 1:1\" (a mesma montagem, os MESMOS clipes, outro quadro).","// Clipe que só existe em 9:16 (plano do estilo/efeito, o ator) não leva corte duro num quadro mais largo: a MESMA técnica do","// packshot, agora com vídeo — (1) o clipe em `cover`, ampliado e mudo, sob (2) o véu escuro, e (3) o clipe INTEIRO em `contain`","// (nada do efeito nem do rosto sai do quadro). Mesmas propriedades que a casa já usa (video cover/contain, shape rgba, trim_start).","// blur_radius fica DESLIGADO (ADS_V2_FILL_BLUR = 0): regra da casa, propriedade nova só depois de UM render de validação (~US$ 0,13);","// ligar = trocar o número aqui. `volume` = o som do clipe da frente (o ator fala; plano comum é mudo); o de trás é sempre mudo.","export const ADS_V2_FILL_BLUR = 0","export function adsV2FillVideoElements(url: string, track: number, time: number, duration: number, trimStart: number, extra: Record<string, unknown> = {}, volume = '0%'): Record<string, unknown>[] {","  const source = url.trim()","  const clip = { type: 'video', track, time, duration, source, loop: false, trim_start: Math.round(Math.max(0, trimStart) * 1000) / 1000 }","  return [","    { ...clip, fit: 'cover', x: '50%', y: '50%', width: ADS_V2_PACKSHOT_BG_SCALE, height: ADS_V2_PACKSHOT_BG_SCALE, volume: '0%', ...(ADS_V2_FILL_BLUR > 0 ? { blur_radius: ADS_V2_FILL_BLUR } : {}), ...extra },","    { type: 'shape', track, time, duration, x: '50%', y: '50%', width: '100%', height: '100%', path: ADS_V2_RECT_PATH, fill_color: ADS_V2_PACKSHOT_VEIL, ...extra },","    { ...clip, fit: 'contain', x: '50%', y: '50%', width: '100%', height: '100%', volume, ...extra },","  ]","}","// ▲ KINEO-ADS-POS-ENTREGA-1510","  fill?: boolean // KINEO-ADS-POS-ENTREGA-1510 — quadro que não é 9:16: o ator INTEIRO sobre fundo suave e o cartão no quadro (adsV2CardFrame)","    if (shot.fill === true && shot.kind !== 'user_video') { elements.push(...adsV2FillVideoElements(shot.url, 2, starts[i], duration, cutStart, transition)); return } // KINEO-ADS-POS-ENTREGA-1510 — efeito só 9:16 noutro quadro: fundo suave + o clipe inteiro","  if (presenter.fill === true) elements.splice(elements.length - 1, 1, ...adsV2FillVideoElements(presenter.url, ADS_V2_PRESENTER_TRACK, 0, clip, 0, {}, '100%')) // KINEO-ADS-POS-ENTREGA-1510 — o ator inteiro (com a voz) sobre fundo suave mudo","    if (shot.fill === true && shot.kind !== 'user_video') { elements.push(...adsV2FillVideoElements(shot.url, ADS_V2_PRESENTER_INSERT_TRACK, ins.time, ins.seconds, start)); continue } // KINEO-ADS-POS-ENTREGA-1510 — insert de efeito noutro quadro: fundo suave + o clipe inteiro","  if (presenter.fill === true) Object.assign(elements[elements.length - 1], adsV2CardFrame(width, height)) // KINEO-ADS-POS-ENTREGA-1510 — 4:5/1:1: o conteúdo do cartão inteiro no quadro"],"app/(dashboard)/ads/v2/AdsV2Simple.tsx":["import AdsV2AfterDelivery from './AdsV2AfterDelivery' // KINEO-ADS-POS-ENTREGA-1510 — editar, aprovação do cliente e 3 formatos depois da entrega","            {scopy ? null : <AdsV2AfterDelivery orderId={order.order_id} lang={lang} />}{/* KINEO-ADS-POS-ENTREGA-1510 — editar sem gerar de novo · aprovação do cliente · 9:16 + 4:5 + 1:1 (a amostra grátis fica de fora) */}"],"app/(dashboard)/ads/v2/AdsV2Client.tsx":["import AdsV2AfterDelivery from './AdsV2AfterDelivery' // KINEO-ADS-POS-ENTREGA-1510 — editar, aprovação do cliente e 3 formatos depois da entrega","            {scopy ? null : <AdsV2AfterDelivery orderId={order.order_id} lang=\"en\" />}{/* KINEO-ADS-POS-ENTREGA-1510 — editar sem gerar de novo · aprovação do cliente · 9:16 + 4:5 + 1:1 (a amostra grátis fica de fora) */}"]}

/** Arquivos que o ajuste tocou (o guardião confere contra o diff real). */
export const ARQUIVOS_POS_ENTREGA_1510 = Object.keys(ARQUIVOS)
/** Linhas acrescentadas por arquivo, na ordem em que aparecem. */
export const ACRESCIMOS_POS_ENTREGA_1510 = Object.fromEntries(Object.entries(ARQUIVOS).map(([k, v]) => [k, [...v]]))

/** O texto do arquivo `p` de ANTES do ajuste. Preserva CRLF. Idempotente: sem a marca, devolve igual. */
export function semPosEntrega1510(p, s) {
  const esperadas = ARQUIVOS[p]
  const bruto = String(s)
  if (!bruto.includes(MARCA_POS_ENTREGA_1510)) return bruto
  if (!esperadas) throw new Error(`desfaz-ads-pos-entrega-1510: marca num arquivo fora do ajuste: ${p}`)
  const crlf = bruto.includes('\r\n')
  const texto = crlf ? bruto.replace(/\r\n/g, '\n') : bruto
  const out = []
  const achadas = []
  let dentro = false
  for (const l of texto.split('\n')) {
    if (dentro) { achadas.push(l); if (l.startsWith(FECHA)) dentro = false; continue }
    if (l.startsWith(ABRE)) { achadas.push(l); dentro = true; continue }
    if (l.includes(MARCA_POS_ENTREGA_1510)) { achadas.push(l); continue }
    out.push(l)
  }
  if (dentro || achadas.length !== esperadas.length || achadas.some((l, i) => l !== esperadas[i])) {
    throw new Error(`desfaz-ads-pos-entrega-1510: forma inesperada em ${p} (${achadas.length}/${esperadas.length} linhas, bloco aberto=${dentro}, ou texto diferente do esperado)`)
  }
  const t = out.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** Forma (caminho, texto) dos guardiões byte a byte: só mexe nos arquivos do ajuste; null/undefined passam direto. */
export function desfazPosEntrega1510(p, s) {
  if (s == null || !ARQUIVOS[p]) return s
  return semPosEntrega1510(p, s)
}

/** Desfaz pelo CONTEÚDO, para guardiões que leem um arquivo sem passar o caminho. Texto sem a marca passa igual. */
export function desfazPosEntrega1510Texto(s) {
  if (s == null) return s
  const bruto = String(s)
  if (!bruto.includes(MARCA_POS_ENTREGA_1510)) return bruto
  for (const p of ARQUIVOS_POS_ENTREGA_1510) {
    try { return semPosEntrega1510(p, bruto) } catch { /* forma de outro arquivo */ }
  }
  throw new Error('desfaz-ads-pos-entrega-1510: texto marcado que não bate com nenhum arquivo do ajuste')
}

/** Linha do diff que pertence a este ajuste (para guardiões que leem o `git diff` e só aceitam linhas conhecidas). */
export function linhaDaPosEntrega1510(linha) {
  return String(linha ?? '').includes(MARCA_POS_ENTREGA_1510) || Object.values(ARQUIVOS).some((ls) => ls.includes(String(linha ?? '')))
}
