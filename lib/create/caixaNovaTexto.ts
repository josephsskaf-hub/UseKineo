// KINEO-CAIXA-NOVA-1511 — o texto da caixa nova da aba Film. MÓDULO PURO e seguro no cliente: sem e-mail, sem rede, sem preço.
// Preço nunca mora aqui: o número do Generate é precoDoGenerate (lib/create/filmNaMoldura.ts), a mesma função que cobra.
//
// A linha de confiança só diz o que o código cumpre HOJE. Cada frase tem a prova no código (o guardião scripts/test-caixa-nova-1511.mjs
// relê os arquivos da prova; se a prova sumir, ele reprova e a frase tem de sair):
//   · "No charge until you press Generate" — a caixa não chama rede que cobre: o Generate é o gerar() do StudioSimples, que só monta o
//     pedido (pedidoDoStudioSimples) e vai ao /studio/create. A mesma promessa que a tela de 3 passos já faz ("Nothing starts until you press Generate.").
//   · "Credits back if a render fails" — estorno automático: lib/credits/refund.ts refundRenderCredits, chamado na falha do filme em
//     app/api/compose/status/[renderId]/route.ts, app/api/generate-video-cinematic/route.ts e no cron app/api/cron/finish-stranded-renders/route.ts.
//   · "Private by default" — app/llms.txt/route.ts ("Customer videos are private by default…"); a página pública de um filme só nasce
//     pelo link que a própria pessoa aperta (app/api/cron/send-video-ready/route.ts publishHref, consentimento carimbado).
// Fora daqui, de propósito: tempo de entrega (não há número medido no código) e "nota" do filme.
export const CAIXA_NOVA_TITULO = 'What do you want to make?'
export const CAIXA_NOVA_PLACEHOLDER = 'Describe your film. One idea is enough: it comes out voiced, scored and captioned.'
export const CAIXA_NOVA_CONFIANCA: readonly string[] = [
  'No charge until you press Generate',
  'Credits back if a render fails',
  'Private by default',
]
export const CAIXA_NOVA_EXEMPLOS_TITULO = 'Try one'
export const CAIXA_NOVA_EXEMPLOS_DICA = 'Tap to use the idea. Nothing starts on its own.'
/** O "+" da aba Film: a caixa curta não sobe foto (o pedido do StudioSimples não leva imagem). A foto de quem estrela mora no Studio completo. */
export const CAIXA_NOVA_FOTO_FILME = { rotulo: 'Add a photo of who stars', dica: 'Opens the full studio with your idea' } as const
