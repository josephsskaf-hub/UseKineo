// KINEO-NUVEM-A2-2026-10-02 — "logo da conta em tudo": a passada de logo do clipe avulso (/clips).
//
// POR QUE UMA PASSADA À PARTE: o clipe não tem montagem — o MP4 sai da fal e vai direto para o nosso bucket
// (lib/clips/clipServer.ts persistClipVideo). Filme do Studio, Espaços e Ads v2 ganham o logo DENTRO da montagem que já
// existe (lib/brandLogo withBrandLogo); no clipe, pôr o logo exige UMA montagem a mais no Creatomate. Ela não entra no
// caminho do dinheiro (o clipe já foi cobrado, entregue e persistido): é um botão "Add my logo" no clipe pronto, que gera
// uma CÓPIA com o logo. O clipe original nunca é tocado.
//
// CUSTO: o render do Creatomate é nosso (sem crédito do cliente nesta v1). Por isso nasce atrás de interruptor:
//   CLIPS_BRAND_LOGO_PUBLIC=false → só as contas da casa veem o botão e a rota (de fora: 404, nada é enviado);
//   true                          → todo mundo com logo na conta. Decisão do fundador (lista do handoff 04/10).
//
// MÓDULO PURO (sem import em tempo de execução): o guardião executa isolado.

export const CLIPS_BRAND_LOGO_PUBLIC = false

/** O botão/rota existem para esta conta? Público depois do "vai"; antes, só a casa. */
export function clipBrandVisible(isInternal: boolean): boolean {
  return CLIPS_BRAND_LOGO_PUBLIC || isInternal === true
}

/** Formatos com tamanho conhecido. Clipe de foto (aspect 'image') tem o formato da foto, que o banco não guarda: sem botão. */
export const CLIP_BRAND_SIZES: Readonly<Record<string, { width: number; height: number }>> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
}

export function clipBrandable(clip: { status?: unknown; video_url?: unknown; aspect?: unknown; seconds?: unknown }): boolean {
  return (
    clip.status === 'done' &&
    typeof clip.video_url === 'string' &&
    /^https:\/\//.test(clip.video_url) &&
    typeof clip.aspect === 'string' &&
    Object.prototype.hasOwnProperty.call(CLIP_BRAND_SIZES, clip.aspect) &&
    typeof clip.seconds === 'number' &&
    Number.isFinite(clip.seconds) &&
    clip.seconds > 0 &&
    clip.seconds <= 30
  )
}

/**
 * Source do Creatomate para a cópia com logo: o clipe inteiro, do jeito que saiu (com o som que ele tiver), sobre fundo
 * preto. Só propriedades que os montadores da casa já exercitam em produção (shape+path+fill_color; video com
 * fit/x/y/width/height/loop/trim_start). O logo entra DEPOIS, pela rota, com lib/brandLogo withBrandLogo (faixa 10).
 */
export const CLIP_BRAND_RECT_PATH = 'M 0 0 L 100 0 L 100 100 L 0 100 Z'
export function buildClipBrandSource(clip: { video_url: string; aspect: string; seconds: number }): Record<string, unknown> {
  if (!clipBrandable({ status: 'done', ...clip })) throw new Error('clip_brand_not_brandable')
  const size = CLIP_BRAND_SIZES[clip.aspect]
  const d = Math.round(clip.seconds * 1000) / 1000
  const full = { x: '50%', y: '50%', width: '100%', height: '100%' }
  return {
    output_format: 'mp4',
    width: size.width,
    height: size.height,
    frame_rate: 30,
    duration: d,
    snapshot_time: Math.min(1, d / 2),
    elements: [
      { type: 'shape', track: 1, time: 0, duration: d, ...full, path: CLIP_BRAND_RECT_PATH, fill_color: '#000000' },
      { type: 'video', track: 2, time: 0, duration: d, source: clip.video_url.trim(), fit: 'cover', ...full, loop: false, trim_start: 0 },
    ],
  }
}
