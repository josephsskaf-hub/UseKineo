// ═══ KINEO-MS-UET-1111 — a etiqueta de medição da Microsoft Ads (UET), para o teste de R$ 300 no Bing ═══════════════
// POR QUÊ (fundador 11/11, "pode fazer as coisas que você achar certas"; docs/MELHORIAS-GOOGLE-ADS-E-ANUNCIO-PAGO-2026-11-11.md,
// alternativa 2): sem a tag, os cliques pagos do Bing não se ligam a nenhum pagamento. A UET é a etiqueta oficial e
// gratuita da Microsoft; a meta "assinou" sai de lib/growth/checkoutPurchasePixels.ts, só depois que o servidor confirmou
// na Stripe que a assinatura foi paga.
// AS TRAVAS (guardião scripts/test-ms-uet-1111.mjs):
//   1. Sem NEXT_PUBLIC_MS_UET_TAG_ID válido = nada carrega: o layout passa adiante o MESMO elemento de marketing de antes.
//      O ID da tag UET é só número (ex.: "187654321"); qualquer outra coisa = sem tag (nada de texto livre num <script>).
//   2. A tag viaja junto com Google Ads e TikTok pelo portão de consentimento (components/ConsentManager.tsx): só monta
//      quando marketingAllowed() diz sim. Isso é o "Basic Consent Mode" da Microsoft: tag bloqueada até o "sim" e, ao
//      carregar, o sinal ad_storage = granted (obrigatório para EEE, Reino Unido e Suíça; help.ads.microsoft.com 60119,
//      lido em 11/11/2026). Quem recusa depois: o ConsentManager recarrega a página e a tag não volta.
//   3. Variável NEXT_PUBLIC_ = embutida no build: pôr o ID na Vercel exige um novo deploy para valer.

/** O ID da tag UET ("ti" no snippet oficial) é numérico. */
export const MS_UET_TAG_ID_PATTERN = /^\d{4,12}$/

export function msUetTagId(raw: string | null | undefined): string | null {
  const id = (raw ?? '').trim()
  return MS_UET_TAG_ID_PATTERN.test(id) ? id : null
}

/**
 * O snippet oficial (help.ads.microsoft.com 56688 e 60119, lidos em 11/11/2026), com enableAutoSpaTracking (o Next
 * navega sem recarregar a página) e, logo depois, o sinal de consentimento "granted": este código só roda depois que o
 * portão de consentimento disse sim. A fila window.uetq guarda tudo até o bat.js chegar.
 */
export function msUetSnippet(tagId: string): string | null {
  const id = msUetTagId(tagId)
  if (!id) return null
  return [
    `(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${id}",enableAutoSpaTracking:true};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");`,
    `window.uetq=window.uetq||[];window.uetq.push('consent','update',{'ad_storage':'granted'});`,
  ].join('\n')
}
