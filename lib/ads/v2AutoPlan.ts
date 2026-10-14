// KINEO-ADS-RETESTE-1510 — regras PURAS (sem import, servem à tela e ao servidor) do roteiro automático do quadro curto do
// Studio Ads (/ads/v2, aba "Um anúncio") e da barra do celular. Reteste de 15/10 (foto de perfume + "perfume num hotel com chuva"):
//
//   · FOCO PERDIDO DEPOIS DA FOTO: com a foto já no quadro, a 1ª letra ("a") zerava o que faltava (`missing`), o roteiro
//     automático disparava 1,2 s depois e o planAd punha busy = 'plan' — e a caixa de texto tinha disabled={locked}: caixa
//     desabilitada perde o foco no navegador, o resto da digitação caía no nada e o rascunho nasceu com a frase "a" (pedido
//     e0b62871, 14/10 12:17:05 UTC). O /plan com "a" respondeu brief_needs_business ("We could not tell which business this
//     is") e a falha PAUSOU o automático ("Automatic scripts paused") — a pessoa teve de tocar em "Write my scripts now".
//     Conserto na tela: a caixa e a cena só travam no 'start' (o débito), nunca no plano grátis; frase sem conteúdo (menos de
//     3 letras) não planeja; a pausa vale só para a MESMA assinatura (mudou o texto/foto = o automático volta); e o plano que
//     chega não rouba o foco de quem está digitando.
//   · A BARRA DO CELULAR ("15 s · Commercial · Script (free)") aparecia no meio da tela, por cima do cartão do produto. Causa
//     medida no Edge a 390 px: ela mora dentro do .kps-panel (components/ProductStage), que tem backdrop-filter — e um ancestral
//     com backdrop-filter vira o bloco de contenção de position:fixed/sticky (a barra "fixa" caiu em top 1102 numa tela de 844;
//     a sticky grudava no fim do PAINEL, não da tela). Agora, só no celular e só no painel que guarda a barra, o blur sai; a
//     barra é FIXA no rodapé (área segura; acima da navegação do celular abaixo de 768 px), a página ganha folga embaixo, e ela
//     some enquanto o botão principal do próprio quadro (.adv2q-go) está à vista — os dois nunca aparecem juntos.

/** A frase tem conteúdo para planejar? (pelo menos 3 letras, ou um ideograma/silabário CJK). "a" não tem. Pura. */
export function adsV2SentenceReady(sentence: string | null | undefined): boolean {
  const s = String(sentence ?? '')
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(s)) return true
  return (s.match(/\p{L}/gu) ?? []).length >= 3
}

/** O botão principal do quadro: enquanto ele está à vista, a barra do celular some. */
export const ADS_V2_BOARD_GO_SELECTOR = '[data-kineo="ads-quadro-go"]'

/** A barra do celular aparece? Só quando o botão do quadro NÃO está à vista (sem observador = aparece). Pura. */
export function adsV2MobileBarVisible(boardGoInView: boolean | null): boolean {
  return boardGoInView !== true
}

/** A pausa do roteiro automático vale só para a assinatura que falhou: mudou algo de verdade = o automático volta. Pura. */
export function adsV2AutoPauseLifts(pausedSig: string | null, planSig: string): boolean {
  return pausedSig !== null && pausedSig !== planSig
}
