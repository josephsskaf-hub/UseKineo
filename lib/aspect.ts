// ═══ KINEO-MULTIFORMATO-2026-09-02 — A FONTE ÚNICA DO ENQUADRAMENTO ═══════
//
// POR QUE ISTO EXISTE, E POR QUE É UMA VANTAGEM NOSSA E NÃO DELES
// ─────────────────────────────────────────────────────────────────────────
// Auditoria de 02/09 em oito concorrentes (fonte oficial, ver
// docs/MEMORIA-SESSAO-CEO-2026-09-02.md): reenquadrar é CARO para todos eles
// porque partem de um vídeo que já existe e precisam RASTREAR um sujeito.
//   · OpusClip cobra US$ 29/mês pelo tracking que libera 1:1 e 16:9
//     ("identifies key objects and actions, tracks them across frames").
//   · Submagic e Veed nem tentam: crop com reposicionamento MANUAL.
//   · InVideo re-renderiza o vídeo inteiro e cobra crédito de novo.
//   · Pictory faz re-layout de template e avisa que "some visuals may need
//     repositioning".
//
// Para nós é DIFERENTE por construção: nossas cenas são GERADAS. Não há
// sujeito a rastrear — há composição a pedir. O motor recebe `aspect_ratio` e
// devolve o quadro certo nativamente, sem crop, sem perda, sem visão
// computacional. A mesma feature que é o upsell de US$ 29 do líder é, aqui,
// um parâmetro de string.
//
// O QUE ISSO ABRE COMERCIALMENTE: hoje só vendemos para quem faz Shorts.
// 16:9 vende para YouTube longo e anúncio; 1:1 e 4:5 vendem para feed do
// Instagram e Facebook — outro comprador, outro orçamento, mesma tecnologia.
//
// ⚠️ REGRA DE SEGURANÇA DESTE ARQUIVO: 9:16 é o DEFAULT em toda função. Tudo
// aqui é aditivo. Nenhum caminho existente muda de comportamento se ninguém
// passar `aspect` — foi assim de propósito, porque 100% dos primeiros vídeos
// da casa são Shorts e um erro aqui quebraria a primeira impressão de todo
// mundo.

export const ASPECTS = ['9:16', '16:9', '1:1', '4:5'] as const
export type Aspect = (typeof ASPECTS)[number]

export const DEFAULT_ASPECT: Aspect = '9:16'

/** Aceita qualquer entrada (URL, body, banco) e devolve um ratio válido. */
export function normalizeAspect(raw: unknown): Aspect {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return (ASPECTS as readonly string[]).includes(s) ? (s as Aspect) : DEFAULT_ASPECT
}

export interface AspectSpec {
  aspect: Aspect
  /** Largura do master, em px. Sempre par (H.264 exige subsampling 4:2:0). */
  width: number
  /** Altura do master, em px. Sempre par. */
  height: number
  /** Rótulo curto para a UI. */
  label: string
  /** Onde este formato é postado — a linguagem do cliente, não a nossa. */
  where: string
  /** true quando é mais alto que largo (Shorts/Reels/TikTok). */
  vertical: boolean
  /**
   * Piso da legenda, em % do canvas. Em 9:16 o valor histórico é 78% — ele
   * existe para escapar do chrome do TikTok/Shorts (botões e nome do perfil
   * comem a faixa de baixo). Em 16:9 esse chrome não existe: legenda a 78%
   * ficaria flutuando no meio do nada, então desce para 88%. Em 1:1 e 4:5 o
   * feed do Instagram cobre menos que o Reels, mas mais que o YouTube.
   */
  captionBottomY: string
  /** Largura da caixa de legenda, em % do canvas. Quanto mais largo o quadro,
   *  menor a % — senão a linha vira faixa e perde a leitura de Short. */
  captionWidth: string
  /** Tamanho da fonte da legenda e do hook, calibrados por quadro. */
  captionFontSize: number
  hookFontSize: number
  /**
   * Barras de cinema, em % de cada lado. SÓ faz sentido em vertical: em 16:9
   * o quadro JÁ é cinema e a barra viraria moldura boba. Ver
   * FAST_LETTERBOX_PCT em lib/compose.ts.
   */
  letterboxPct: number
  /** Altura da marca d'água a partir do topo, em % — acompanha o letterbox. */
  watermarkY: string
  /** O valor exato que os modelos da fal aceitam em `aspect_ratio`. */
  falAspectRatio: string
  /** `image_size` das âncoras FLUX (lib/hollywood/anchors.ts). */
  fluxImageSize: string
  /** O que entra no prompt de cena, no lugar de "9:16 vertical framing". */
  promptFraming: string
}

const SPECS: Record<Aspect, AspectSpec> = {
  // Shorts / Reels / TikTok — o contrato de sempre. Números idênticos aos que
  // estavam chumbados antes deste arquivo existir: nada muda para quem não
  // pede outro formato.
  '9:16': {
    aspect: '9:16',
    width: 1080,
    height: 1920,
    label: 'Shorts',
    where: 'TikTok · Reels · YouTube Shorts',
    vertical: true,
    captionBottomY: '78%',
    captionWidth: '78%',
    captionFontSize: 62,
    hookFontSize: 76,
    letterboxPct: 6,
    watermarkY: '5%',
    falAspectRatio: '9:16',
    fluxImageSize: 'portrait_16_9',
    promptFraming: '9:16 vertical framing',
  },
  // YouTube longo, site, anúncio em display. Sem chrome inferior, sem
  // letterbox (o quadro já é cinema).
  '16:9': {
    aspect: '16:9',
    width: 1920,
    height: 1080,
    label: 'Widescreen',
    where: 'YouTube · site · ads',
    vertical: false,
    captionBottomY: '88%',
    captionWidth: '84%',
    captionFontSize: 46,
    hookFontSize: 58,
    letterboxPct: 0,
    watermarkY: '6%',
    falAspectRatio: '16:9',
    fluxImageSize: 'landscape_16_9',
    promptFraming: '16:9 widescreen cinematic framing',
  },
  // Feed quadrado — o formato que mais aparece em anúncio de Facebook/IG.
  '1:1': {
    aspect: '1:1',
    width: 1080,
    height: 1080,
    label: 'Square',
    where: 'Feed do Instagram · Facebook ads',
    vertical: false,
    captionBottomY: '84%',
    captionWidth: '82%',
    captionFontSize: 52,
    hookFontSize: 64,
    letterboxPct: 0,
    watermarkY: '6%',
    falAspectRatio: '1:1',
    fluxImageSize: 'square_hd',
    promptFraming: '1:1 square framing, subject centered',
  },
  // 4:5 é o formato que mais ocupa tela no feed do Instagram sem ser Reels.
  // Submagic e Veed são os únicos concorrentes que o oferecem.
  '4:5': {
    aspect: '4:5',
    width: 1080,
    height: 1350,
    label: 'Feed tall',
    where: 'Feed do Instagram (ocupa mais tela)',
    vertical: true,
    captionBottomY: '82%',
    captionWidth: '80%',
    captionFontSize: 56,
    hookFontSize: 68,
    letterboxPct: 0,
    watermarkY: '5%',
    falAspectRatio: '4:5',
    fluxImageSize: 'portrait_4_3',
    promptFraming: '4:5 vertical framing',
  },
}

export function aspectSpec(raw?: unknown): AspectSpec {
  return SPECS[normalizeAspect(raw)]
}

/** Todos os formatos, na ordem que a UI deve mostrar (o padrão primeiro). */
export function allAspectSpecs(): AspectSpec[] {
  return ASPECTS.map((a) => SPECS[a])
}

/**
 * Custo relativo de render no Creatomate (a fórmula do fornecedor é
 * largura × altura × fps). 16:9 custa o MESMO que 9:16 (mesmos pixels);
 * 1:1 custa 44% menos; 4:5 custa 30% menos. Ou seja: oferecer os formatos
 * novos não encarece nada — dois deles são mais baratos que o padrão.
 */
export function relativeRenderCost(aspect: Aspect): number {
  const base = SPECS['9:16'].width * SPECS['9:16'].height
  const s = SPECS[aspect]
  return (s.width * s.height) / base
}
