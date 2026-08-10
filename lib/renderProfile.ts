// KINEO-RENDER-PROFILE-2026-08-10 — a resolução do output deixa de ser um
// literal repetido em 3 arquivos e vira UMA alavanca de custo.
//
// POR QUE ESTE ARQUIVO EXISTE (medido no fornecedor, não deduzido):
//
//   Em 10/08 às 22:0xZ o painel do Creatomate mostrava, textual:
//   "Credit Usage — 10.0K of 10.0K credits used — 100%". O produto estava
//   parado desde 09/08 16:21:08Z. Não era bug, não era cobrança: era o TETO
//   MENSAL do plano Growth 10K, atingido no dia 9 de um ciclo de 31.
//
//   A fórmula é pública (creatomate.com/docs/account/how-are-credits-calculated):
//
//       créditos = (width × height × fps × duração_em_segundos) / 100.000.000
//
//   Conferida contra a afirmação pública do próprio fornecedor ("one minute of
//   video at 720p 25fps is about 14 credits"): 1280×720×25×60/1e8 = 13,82 ✅
//
//   Com o output de hoje (1080×1920 @ 30fps) cada SEGUNDO custa 0,62208
//   crédito. O vídeo médio da casa tem 46,7s → 29 créditos DE VÍDEO ENTREGUE.
//
//   ⚠️ 29 NÃO é o que o fornecedor cobra por vídeo, e confundir os dois foi um
//   erro real desta sprint, pego na revisão adversarial. O painel marcou 10.000
//   com 8.967 créditos de vídeos entregues: tudo que a nossa tabela não vê
//   (renders que falharam depois de gastar pixels, jobs abandonados, a rota
//   legada, testes) soma 11,5% por cima. O custo REAL por vídeo entregue é
//   29,05 × 1,115 = **32,39 créditos**, e a queima real é 1.157 créditos/dia,
//   não 1.038. A tabela abaixo usa os números REAIS — a primeira versão dela
//   usava os de vídeo entregue e prometia 27 dias de autonomia num perfil que
//   entrega 24. Tabela de decisão otimista é pior que tabela nenhuma: o
//   fundador escolhe por ela e estoura de novo.
//
// O QUE ESTE MÓDULO MUDA — E O QUE ELE DELIBERADAMENTE NÃO MUDA:
//
//   NÃO muda nada hoje. Os defaults são EXATAMENTE 1080×1920@30, byte por byte
//   o que os três call sites emitiam antes. Um deploy deste commit produz
//   vídeos idênticos aos de ontem. Isso é proposital: a decisão de resolução é
//   do fundador (é qualidade de produto, não bug) e ela continua sem resposta.
//
//   O que muda é o CUSTO DE EXERCER a decisão. Antes: editar 3 arquivos, abrir
//   PR, esperar push, esperar build. Agora: uma variável de ambiente na Vercel.
//   Isso importa porque, no dia em que este arquivo nasceu, havia 12 commits
//   presos sem push e o produto estava fora há 30 horas — ou seja, a via
//   "editar código" estava comprovadamente indisponível, e a via "mudar env"
//   não estava.
//
// TABELA DE DECISÃO (duração média 46,7s · plano 10.000 · overhead 1,115 já
// aplicado, ou seja: números que o painel do fornecedor confirmaria):
//
//   perfil            cr/seg    cr/vídeo   vídeos/ciclo   autonomia   Δ custo
//   1080×1920@30      0,62208     32,39        309         8,6 dias    —
//   1080×1920@24      0,49766     25,91        386        10,8 dias    −20%
//    720×1280@30      0,27648     14,39        695        19,4 dias    −56%
//    720×1280@24      0,22118     11,52        868        24,3 dias    −64%
//    480× 854@24      0,09838      5,12       1953        54,6 dias    −84%
//
//   Conferência que dá confiança na linha de cima: 309 vídeos/ciclo é
//   EXATAMENTE o número de vídeos que o ciclo de agosto entregou antes de bater
//   no teto. A tabela reproduz a realidade medida, não uma projeção.
//
//   ⚠️ NENHUM perfil acima do 480×854@24 cobre um ciclo de 31 dias no plano de
//   10.000. Nem o 720p24 (24,3 dias). Quem quiser 1080p tem que pagar plano
//   maior — não existe resolução que faça o 10K durar o mês inteiro mantendo
//   qualidade. O 480×854@24 é exatamente o free tier especificado na troca
//   atômica do reverse trial: aquele item não é só receita, é o único perfil
//   que fecha a conta de render.
//
// ⚠️ ESTE MÓDULO NUNCA LANÇA. Env inválida cai no default e loga. Um erro de
// configuração não pode virar um render que não sai — foi assim que perdemos
// 30 horas.

export type RenderProfile = {
  width: number
  height: number
  fps: number
}

export const DEFAULT_RENDER_PROFILE: RenderProfile = {
  width: 1080,
  height: 1920,
  fps: 30,
}

// Limites de sanidade. Não são gosto: fora deles o Creatomate recusa o job ou
// o YouTube rejeita o Short, e nos dois casos o sintoma chega ao usuário como
// "o vídeo não saiu" — o mesmo sintoma do apagão que este arquivo endereça.
const BOUNDS = {
  width: [360, 2160],
  height: [640, 3840],
  fps: [12, 60],
} as const

function readDimension(
  key: 'width' | 'height' | 'fps',
  raw: string | undefined,
): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number(raw.trim())
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    console.warn(`[renderProfile] ${key}="${raw}" não é inteiro — usando o default`)
    return null
  }
  const [min, max] = BOUNDS[key]
  if (n < min || n > max) {
    console.warn(`[renderProfile] ${key}=${n} fora de [${min}, ${max}] — usando o default`)
    return null
  }
  // Dimensão ímpar quebra o encoder H.264 (subsampling 4:2:0 exige par). O fps
  // não tem essa restrição.
  if (key !== 'fps' && n % 2 !== 0) {
    console.warn(`[renderProfile] ${key}=${n} é ímpar — H.264 exige par; usando o default`)
    return null
  }
  return n
}

let CACHED: RenderProfile | null = null

/**
 * O perfil de output efetivo. Lido do ambiente na primeira chamada e
 * memoizado por instância de lambda (o valor não muda em runtime; muda com um
 * redeploy, que é justamente a alavanca que queremos).
 */
export function renderProfile(): RenderProfile {
  if (CACHED) return CACHED

  const width = readDimension('width', process.env.KINEO_RENDER_WIDTH) ?? DEFAULT_RENDER_PROFILE.width
  const height = readDimension('height', process.env.KINEO_RENDER_HEIGHT) ?? DEFAULT_RENDER_PROFILE.height
  const fps = readDimension('fps', process.env.KINEO_RENDER_FPS) ?? DEFAULT_RENDER_PROFILE.fps

  // 9:16 é contrato de produto (Shorts/TikTok), não preferência. Um output
  // fora da proporção passa no encoder e é rejeitado/encaixotado na
  // plataforma — falha silenciosa, a pior categoria. Se a env quebrar a
  // proporção, o perfil INTEIRO volta ao default: meio perfil aplicado é pior
  // que nenhum.
  const ratio = width / height
  const target = 9 / 16
  if (Math.abs(ratio - target) > 0.01) {
    console.warn(
      `[renderProfile] ${width}×${height} não é 9:16 (${ratio.toFixed(4)} vs ${target.toFixed(4)}) — ` +
        `voltando ao perfil default inteiro`,
    )
    CACHED = { ...DEFAULT_RENDER_PROFILE }
    return CACHED
  }

  CACHED = { width, height, fps }
  if (
    width !== DEFAULT_RENDER_PROFILE.width ||
    height !== DEFAULT_RENDER_PROFILE.height ||
    fps !== DEFAULT_RENDER_PROFILE.fps
  ) {
    console.log(
      `[renderProfile] perfil NÃO-DEFAULT ativo: ${width}×${height}@${fps} ` +
        `(${creditsPerSecond(CACHED).toFixed(5)} cr/s vs ${creditsPerSecond(DEFAULT_RENDER_PROFILE).toFixed(5)} do default)`,
    )
  }
  return CACHED
}

/** Créditos Creatomate por segundo de vídeo, pela fórmula do fornecedor. */
export function creditsPerSecond(profile: RenderProfile = renderProfile()): number {
  return (profile.width * profile.height * profile.fps) / 100_000_000
}

/** Créditos Creatomate para uma duração, pela fórmula do fornecedor. */
export function creditsForSeconds(
  seconds: number,
  profile: RenderProfile = renderProfile(),
): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return creditsPerSecond(profile) * seconds
}

/**
 * O bloco de output que vai no payload do Creatomate. Existe para que os call
 * sites não voltem a escrever os literais — a duplicação em 3 arquivos foi
 * exatamente o que tornou a resolução "difícil de mudar" e, por consequência,
 * o que manteve a queima em 1.038 cr/dia sem ninguém revisar.
 */
export function renderOutputSpec(): { output_format: 'mp4'; width: number; height: number; frame_rate: number } {
  const p = renderProfile()
  return { output_format: 'mp4', width: p.width, height: p.height, frame_rate: p.fps }
}

/** Só para teste — o cache por lambda esconderia mudanças de env no mesmo processo. */
export function __resetRenderProfileCacheForTests(): void {
  CACHED = null
}
