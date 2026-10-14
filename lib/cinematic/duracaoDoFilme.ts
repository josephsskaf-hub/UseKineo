// ═══ KINEO-PARCEIRO-EYEBIBLE-1410 — o filme montado tem a duração que o servidor ASSINOU, não a do seletor ═══
//
// CASO (Robert/EyeBible, parceiro, Seedance 1.5 verbatim, 14/10 14:08 UTC): pediu 60 s com um roteiro de 108 palavras.
// A rota de clipes mediu 47 s de fala e DESCEU o filme para 35 s (KINEO-DURACAO-SEGUE-O-ROTEIRO-2026-09-19, evento
// duration_followed_script 14:08:09), cobrou o preço de 35 s (cinematic_duration_price_adjusted: 35 cobrados, 14
// devolvidos) e assinou `duration: 35` no claim. O navegador, porém, mandou `duration: 60` para o /api/compose (é o
// número que a conferência de custo do nascimento exige), e o TIKTOK-61 do builder esticou a linha do tempo para 61,5 s
// com ~40 s de narração: os 7 clipes foram espalhados em fatias de 8,8 s enquanto a fala de cada cena acontecia a
// cada ~5,7 s — a imagem foi ficando para trás da narração até duas cenas, e o filme terminou com ~20 s sem voz.
// "Algumas cenas não batem com a narração" era isso.
//
// REGRA: no roteiro próprio (claim assinado com verbatim:true) de um motor clássico, quando a duração ASSINADA é menor
// que a pedida, a montagem usa a assinada — o filme acaba quando a fala acaba, como foi cobrado. Só leitura do claim
// assinado (nunca do corpo); qualquer dúvida devolve a pedida, isto é, o comportamento de antes.

const CLASSICOS = new Set(['cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_sora'])
const DURACOES_ASSINAVEIS = new Set([15, 35, 45, 60, 90])

export function duracaoDoFilmeAssinada(args: {
  pedida: number
  quality: string
  claimResponse: Record<string, unknown> | null | undefined
}): number {
  const { pedida, quality, claimResponse } = args
  if (!claimResponse || typeof claimResponse !== 'object') return pedida
  if (!CLASSICOS.has(quality)) return pedida
  if (claimResponse.verbatim !== true) return pedida
  const assinada = Number(claimResponse.duration)
  if (!DURACOES_ASSINAVEIS.has(assinada)) return pedida
  return assinada < pedida ? assinada : pedida
}
