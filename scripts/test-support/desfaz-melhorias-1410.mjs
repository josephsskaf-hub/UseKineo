// KINEO-ADS-MELHORIAS-1410 — DESFAZ, em memória, as melhorias do Studio Ads v2 de 14/10 (packshot com a foto real, refazer UMA
// cena no modo simples, formatos 4:5 e 1:1) nos arquivos que os guardiões conferem BYTE A BYTE contra uma base antiga
// (lib/ads/v2PlanCore.ts via shopify-extracao-v2-1310.mjs e test-ads-fluxo-1310 I1; as funções de dinheiro da tela simples em
// test-ads-fluxo-1310 I2). Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Regra: toda linha nova ou mudada carrega a marca KINEO-ADS-MELHORIAS-1410. As NOVAS saem inteiras; as MUDADAS (VOLTA, texto
// EXATO de agora → texto EXATO de antes) voltam. Uma linha marcada que é MUDADA mas não está em VOLTA não existe: toda linha
// marcada que não está em VOLTA sai, então uma mudança de dinheiro escondida numa linha marcada ficaria de fora da impressão —
// por isso scripts/test-ads-formatos-1410.mjs e test-ads-packshot-1410.mjs conferem que as linhas marcadas do núcleo são
// EXATAMENTE as esperadas (contagem + nenhuma fala de crédito, débito ou preço).
export const MARCA_MELHORIAS_1410 = 'KINEO-ADS-MELHORIAS-1410'

/** Linhas MUDADAS: [agora, antes] (texto exato da linha inteira, sem o \r). */
export const VOLTA_MELHORIAS_1410 = [
  // app/(dashboard)/ads/v2/AdsV2Simple.tsx: o estilo efetivo (só em 9:16), a assinatura do plano, o recorte e o upload no formato,
  // e o corpo do /plan com o formato (só fora do 9:16). Texto EXATO de agora → texto EXATO de antes.
  ["  const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC && formatChoice === '9:16' ? styleChoice ?? styleSuggested : 'none' // KINEO-ADS-MELHORIAS-1410 — estilo só em 9:16 (o efeito não tem outro formato)",
   "  const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC ? styleChoice ?? styleSuggested : 'none'"],
  ["  const baseSig = JSON.stringify({ draftKey, sector, presenter: presenterOn, items: inAd.map((p) => [p.key, focalSig(p)]), style, ...(presenterOn && presenterPick ? { presenterPick } : {}), ...(format !== '9:16' ? { format } : {}) }) // KINEO-ADS-MELHORIAS-1410 — outro formato = planejar de novo",
   "  const baseSig = JSON.stringify({ draftKey, sector, presenter: presenterOn, items: inAd.map((p) => [p.key, focalSig(p)]), style, ...(presenterOn && presenterPick ? { presenterPick } : {}) })"],
  ["      const sig = uploadSig(p) + (format !== '9:16' && !p.video ? `@${format}` : '') // KINEO-ADS-MELHORIAS-1410 — outro formato = recortar e subir de novo",
   "      const sig = uploadSig(p)"],
  ["        const file = p.video ? p.video.file : await cropToFormat(p, format) // KINEO-ADS-MELHORIAS-1410 — 9:16 = cropToVertical (o de sempre)",
   "        const file = p.video ? p.video.file : await cropToVertical(p)"],
  ["        body: { mode: 'simple', order_id: orderId, sector, logo_footage_id: logo?.footageId ?? null, ...(presenterOn ? { presenter: true } : {}), photos: uploaded, videos, card_footage_id: card.footageId, facts: chosen, ...(style !== 'none' ? { style } : {}), ...(presenterOn && presenterPick ? { presenter_id: presenterPick } : {}), ...(format !== '9:16' ? { format } : {}) }, // KINEO-ADS-MELHORIAS-1410 — o formato só fora do 9:16",
   "        body: { mode: 'simple', order_id: orderId, sector, logo_footage_id: logo?.footageId ?? null, ...(presenterOn ? { presenter: true } : {}), photos: uploaded, videos, card_footage_id: card.footageId, facts: chosen, ...(style !== 'none' ? { style } : {}), ...(presenterOn && presenterPick ? { presenter_id: presenterPick } : {}) },"],
]

/** O texto de ANTES destas melhorias (LF). Sem linha marcada, devolve o texto igual (só LF). */
export function semMelhorias1410(s) {
  const volta = new Map(VOLTA_MELHORIAS_1410)
  const out = []
  for (const l of String(s).replace(/\r\n/g, '\n').split('\n')) {
    if (!l.includes(MARCA_MELHORIAS_1410)) { out.push(l); continue }
    if (volta.has(l)) { out.push(volta.get(l)); continue }
  }
  return out.join('\n')
}


// ── DESFAZ_ARQ: o diff REVERSO exato (gerado contra a base a1f3dbff) dos arquivos inteiros conferidos byte a byte (a montagem).
// Cada trecho confere que as linhas de agora são EXATAMENTE as destas melhorias e devolve as de antes; qualquer outra mudança = lança.
const DESFAZ_ARQ = {"lib/ads/adV2Montage.ts":{"hunks":[{"at":52,"del":["  /** KINEO-ADS-MELHORIAS-1410 — só no plano `text` que é o PACKSHOT (a foto real do produto): fundo suave + foto inteira com zoom. */","  packshot?: boolean","}","","// ── KINEO-ADS-MELHORIAS-1410 — o PACKSHOT (a foto real do produto, sem IA) ─────────────────────────────────────────────────","// Três elementos na trilha dos planos, só com propriedades que a casa JÁ usa em produção (image + fit cover/contain — contain no","// logo de lib/brandLogo.ts e no cartão de lib/ads/producao.ts — + largura acima de 100% como no vídeo do cliente + animations scale","// + shape rgba): (1) a MESMA foto em `cover`, ampliada, sob (2) um véu escuro — o fundo suave que enche o quadro","// quando a foto não tem a proporção dele; (3) a foto INTEIRA em `contain` (nada do produto é cortado) com um zoom lento.","// Foto já na proporção do quadro (o caso de hoje: o navegador recorta no formato do anúncio) = a camada 2 cobre a 1 inteira.","// blur_radius NÃO entra: nunca foi exercitado num render nosso (regra da casa: propriedade nova só com render de validação).","export const ADS_V2_PACKSHOT_ZOOM_END = '106%'","export const ADS_V2_PACKSHOT_BG_SCALE = '118%'","export const ADS_V2_PACKSHOT_VEIL = 'rgba(0,0,0,0.45)'","/** Os 3 elementos do packshot (fundo cover ampliado · véu · foto inteira em contain com zoom). `extra` = transição de entrada. */","export function adsV2PackshotElements(url: string, track: number, time: number, duration: number, extra: Record<string, unknown> = {}): Record<string, unknown>[] {","  const source = url.trim()","  return [","    { type: 'image', track, time, duration, source, fit: 'cover', x: '50%', y: '50%', width: ADS_V2_PACKSHOT_BG_SCALE, height: ADS_V2_PACKSHOT_BG_SCALE, ...extra },","    { type: 'shape', track, time, duration, x: '50%', y: '50%', width: '100%', height: '100%', path: ADS_V2_RECT_PATH, fill_color: ADS_V2_PACKSHOT_VEIL, ...extra },","    { type: 'image', track, time, duration, source, fit: 'contain', x: '50%', y: '50%', width: '100%', height: '100%', ...extra, animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_PACKSHOT_ZOOM_END, easing: 'linear' }] },","  ]","}","","/**"," * KINEO-ADS-MELHORIAS-1410 — o cartão final é um PNG 1080×1920 (lib/ads/endCard.ts, desenhado no navegador). Num quadro de outra"," * proporção (4:5, 1:1) ele entra com a largura inteira e é DESLOCADO para que a caixa do conteúdo (logo, nome, oferta, chamada e"," * contato: de 12% a 64% da altura do cartão, END_CARD_SAFE) fique dentro do quadro — o fundo do cartão cobre a tela inteira, então"," * o que sai do quadro é só fundo. Mesma técnica (e as mesmas propriedades) do vídeo do cliente: o elemento na proporção do"," * próprio conteúdo, deslocado por x/y. Quadro 9:16 (ou mais alto) = o cartão de sempre, 100% × 100%."," */","export const ADS_V2_CARD_ASPECT = 1080 / 1920","export const ADS_V2_CARD_CONTENT = { top: 0.12, bottom: 0.64 } as const","export function adsV2CardFrame(frameW: number, frameH: number): { x: string; y: string; width: string; height: string } {","  const full = { x: '50%', y: '50%', width: '100%', height: '100%' }","  if (!finitePos(frameW) || !finitePos(frameH)) return full","  const F = frameW / frameH","  if (F <= ADS_V2_CARD_ASPECT * (1 + ADS_V2_USER_VIDEO_ASPECT_TOLERANCE)) return full","  const eh = F / ADS_V2_CARD_ASPECT // altura do cartão em frações da altura do quadro (> 1)","  const win = 1 / eh // fração da altura do cartão que aparece","  const mid = (ADS_V2_CARD_CONTENT.top + ADS_V2_CARD_CONTENT.bottom) / 2","  const top = Math.min(1 - win, Math.max(0, mid - win / 2)) // topo da janela, em frações do cartão","  return { x: '50%', y: pct(eh / 2 - top * eh), width: '100%', height: pct(eh) }"],"ins":[]},{"at":234,"del":["    if (shot.kind === 'text' && shot.packshot === true) {","      // KINEO-ADS-MELHORIAS-1410 — o packshot: fundo suave (a mesma foto, ampliada, sob véu) + a foto inteira com zoom lento.","      elements.push(...adsV2PackshotElements(shot.url, 2, starts[i], duration, transition))","      return","    }"],"ins":[]},{"at":284,"del":["    ...adsV2CardFrame(width, height), // KINEO-ADS-MELHORIAS-1410 — 9:16 = 100% × 100% (o de sempre); 4:5 e 1:1 = o conteúdo do cartão inteiro no quadro"],"ins":["    x: '50%', y: '50%', width: '100%', height: '100%',"]},{"at":435,"del":["    const still = !!s && s.kind === 'text' && s.packshot === true // KINEO-ADS-MELHORIAS-1410 — o packshot entra como insert (foto parada: sem clipe medido)","    if (!s || (s.kind === 'text' && !still) || !isHttps(s.url) || (!still && !finitePos(s.measuredSeconds)) || !finitePos(s.cutSeconds)) continue"],"ins":["    if (!s || s.kind === 'text' || !isHttps(s.url) || !finitePos(s.measuredSeconds) || !finitePos(s.cutSeconds)) continue"]},{"at":438,"del":["    const seconds = still ? r3(Math.min(ADS_V2_PRESENTER_INSERT_SECONDS, ADS_V2_PRESENTER_INSERT_MAX, s.cutSeconds)) : r3(Math.min(ADS_V2_PRESENTER_INSERT_SECONDS, ADS_V2_PRESENTER_INSERT_MAX, s.cutSeconds, (s.measuredSeconds as number) - start)) // KINEO-ADS-MELHORIAS-1410"],"ins":["    const seconds = r3(Math.min(ADS_V2_PRESENTER_INSERT_SECONDS, ADS_V2_PRESENTER_INSERT_MAX, s.cutSeconds, s.measuredSeconds - start))"]},{"at":482,"del":["    if (shot.kind === 'text' && shot.packshot === true) { elements.push(...adsV2PackshotElements(shot.url, ADS_V2_PRESENTER_INSERT_TRACK, ins.time, ins.seconds)); continue } // KINEO-ADS-MELHORIAS-1410 — a foto real do produto, corte seco como os outros inserts"],"ins":[]}]}}

/** O arquivo de ANTES destas melhorias (LF). Lança se o arquivo não for exatamente o destas melhorias nos trechos mudados. */
export function semMelhorias1410Arquivo(rel, text) {
  const d = DESFAZ_ARQ[rel]
  if (!d) return String(text).replace(/\r\n/g, '\n')
  const lines = String(text).replace(/\r\n/g, '\n').split('\n')
  for (const h of [...d.hunks].reverse()) {
    const got = lines.slice(h.at, h.at + h.del.length)
    if (JSON.stringify(got) !== JSON.stringify(h.del)) throw new Error('semMelhorias1410Arquivo: ' + rel + ' mudou fora destas melhorias (linha ' + (h.at + 1) + ')')
    lines.splice(h.at, h.del.length, ...h.ins)
  }
  return lines.join('\n')
}
/** As linhas que estas melhorias ACRESCENTARAM no arquivo (para conferir o que entrou). */
export function linhasMelhorias1410(rel) { return (DESFAZ_ARQ[rel]?.hunks ?? []).flatMap((h) => h.del) }
