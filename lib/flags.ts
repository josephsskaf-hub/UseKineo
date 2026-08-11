// KINEO-OFFER290-2026-07-07 — central, importable feature flags.
//
// OFFER_290_ENABLED gates the entire first-purchase URGENCY offer
// ($4.90 → $2.90, 10 Fast videos, 24h countdown, 1-per-account). While it is
// `false`:
//   • the <Offer290Banner/> renders nothing,
//   • /api/stripe/checkout?pack=starter290 returns 410 (SKU disabled),
//   • /api/credits does not surface the offer fields.
// The founder flips it to `true` (single line below) to go live. Build-only for now.
// KINEO-SPRINT-OFFER-2026-07-14 — DESLIGADO por ordem do Joseph (sprint de
// oferta única: só intro-month $4.90/$9.90 nas superfícies públicas; o $2.90
// one-time conflitava e não gera MRR). Banner some, SKU volta 410.
export const OFFER_290_ENABLED = false

// KINEO-CINEMATIC-ANCHOR-2026-07-24 — gates the optional anchor + image-to-video
// path for the CLASSIC Kling engine (cross-scene visual consistency: one FLUX
// still per scene sharing the style sheet + per-generation seed, each scene then
// animated via Kling i2v so the clips read as one world instead of independent
// t2v draws). OFF by default: while false, every classic engine stays pure
// text-to-video and behaves BYTE-IDENTICALLY to before this feature existed.
// Flip via env KINEO_CINEMATIC_ANCHOR_ENABLED (truthy = '1' | 'true' | 'yes' | 'on').
export const CINEMATIC_ANCHOR_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  (process.env.KINEO_CINEMATIC_ANCHOR_ENABLED ?? '').trim().toLowerCase(),
)

// KINEO-DISTRIBUTION-LOOP-2026-08-11 — o HANDOFF pós-download.
//
// O número que abriu esta sprint: 918 vídeos gerados, 365 downloads, e
// `posted_shorts` com 3 linhas (duas delas do próprio fundador, via upload
// direto). O convite para POSTAR existe na tela de sucesso desde 31/07, mas
// mora ~600 linhas de JSX abaixo do botão de download, depois do paywall, do
// card de share e do "Build the next episode" — ou seja, fora da tela no exato
// segundo em que a pessoa acabou de receber o arquivo e ainda está com a
// atenção livre. Enquanto isso o e-mail `send-post-nudge` mandava o pedido
// DIAS depois (69 envios, zero colagens).
//
// Com a flag LIGADA (padrão), um download entregue com sucesso:
//   • rola a seção "postar" para o centro da tela, UMA vez por render;
//   • troca o título dela para o momento ("o arquivo está com você");
//   • marca a borda para a pessoa saber onde olhou.
// Nada mais muda: mesmos botões, mesmas rotas, mesmos créditos, mesmo texto de
// promessa. É reposicionamento de atenção, não feature nova.
//
// DESLIGAR: NEXT_PUBLIC_KINEO_POST_HANDOFF=off. Com 'off' os três efeitos acima
// não acontecem — o scroll não roda, o título é o original e a borda é a
// original.
//
// DUAS COISAS NÃO SÃO GATEADAS PELA FLAG, de propósito:
//
//   1. a INSTRUMENTAÇÃO (post_invite_viewed, post_invite_paste_focused,
//      youtube_upload_started/succeeded/failed, wall_paste_*). Medir o degrau
//      cego é o pré-requisito de qualquer decisão futura, e um evento não muda
//      nada do que o usuário vê. Gatear a medição junto com o experimento é
//      como desligar o velocímetro ao tirar o pé do acelerador.
//   2. a COPY VERDADEIRA (POST_TO_EARN_PASTE_NOTE e POST_TO_EARN_DIRECT_PITCH
//      em lib/postToEarn.ts). Um link colado hoje NÃO é creditado na hora — sem
//      YOUTUBE_API_KEY no ambiente ele vai para revisão humana —, e um upload
//      direto é. Um kill-switch que reintroduzisse a promessa enganosa não é um
//      kill-switch, é um botão de mentir de novo.
export const POST_HANDOFF_ENABLED =
  (process.env.NEXT_PUBLIC_KINEO_POST_HANDOFF ?? '').trim().toLowerCase() !== 'off'
