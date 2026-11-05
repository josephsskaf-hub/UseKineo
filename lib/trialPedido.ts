// KINEO-TRIAL-A-PEDIDO-0411 [TRAVA 8.2 — fundador 04/11: "Metade das contas sem crédito" + "2a": filme grátis só a pedido] — o teste de 30 dias.
//
// A pergunta do fundador: "as melhores empresas não dão trial. Por que eu dou, sendo tão menor?". Em 60 dias: 13 pagantes, 9 pagaram sem ter
// feito filme; 712 contas fizeram filme e não pagaram. Metade das contas NOVAS de país com filme grátis nasce sem o crédito automático e vê a
// prévia grátis das cenas e os planos. O filme grátis continua existindo: um botão o libera na hora, então as páginas e o ChatGPT seguem dizendo a verdade.
//
//   · Só conta nova, depois de todas as portas de sempre (descartável, plano pago, país, digital). Conta que já existe não muda.
//   · Sorteio fixo pelo id da conta: a mesma pessoa cai sempre no mesmo lado. Contas da casa ficam de fora.
//   · Depois do fim, conta nova volta ao trial de sempre sozinha. Para parar antes: TRIAL_PEDIDO_LIVE = false.
//   · A varredura de trial órfão só lê trial_status NULL e a cota semanal só admite estados da lista dela: nenhuma recredita esta conta.
//
//   · KINEO-FLUXO2-G-0411: o desenho do lado "a pedido" mudou em 04/11, antes de haver resultado. Medir em separado (docs/DECISAO-TRIAL-A-PEDIDO-PREVIA-2026-11-04.md).
//
// Módulo puro: sem env, sem banco. Guardião: scripts/test-trial-a-pedido-0411.mjs.
export const TRIAL_PEDIDO_LIVE: boolean = true
export const TRIAL_PEDIDO_INICIO_UTC = '2026-11-04T17:00:00.000Z'
export const TRIAL_PEDIDO_FIM_UTC = '2026-12-04T17:00:00.000Z'
export const TRIAL_PEDIDO_STATUS = 'on_request'
export const TRIAL_PEDIDO_TESTE = 'trial_a_pedido_0411'
export const TRIAL_PEDIDO_ATRIBUIDO_EVENT = 'trial_test_assigned'
export const TRIAL_PEDIDO_LIBERADO_EVENT = 'trial_on_request_claimed'
export const TRIAL_PEDIDO_CLAIM_PATH = '/api/trial/claim'
/** KINEO-FLUXO2-G-0411 — o clique no botão principal da prévia. A faixa continua com trial_on_request_clicked: as duas portas contam separado. */
export const TRIAL_PEDIDO_PREVIA_EVENT = 'trial_on_request_preview_clicked'
const IDEIA_MAX = 2000

/** KINEO-FLUXO2-G-0411 — depois de pedir, de volta à geração com a ideia que a pessoa já escreveu. Sem ideia, o /studio de sempre. */
export function filmeGratisDestino(ideia: unknown): string {
  const texto = typeof ideia === 'string' ? ideia.trim().slice(0, IDEIA_MAX) : ''
  return texto ? `/studio?${new URLSearchParams({ prompt: texto }).toString()}` : '/studio'
}

export type LadoDoTeste = 'controle' | 'a_pedido'

/** FNV-1a de 32 bits com a marca do teste: o mesmo id cai sempre no mesmo lado, sem depender de outros sorteios. */
function fnv1a(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h >>> 0
}

/** O lado fixo desta conta. */
export function ladoDoTeste(userId: string): LadoDoTeste {
  return fnv1a(`${TRIAL_PEDIDO_TESTE}:${userId}`) % 2 === 0 ? 'controle' : 'a_pedido'
}

/** O teste está aberto neste instante? */
export function testeAberto(agoraMs: number, live: boolean = TRIAL_PEDIDO_LIVE): boolean {
  return live && agoraMs >= Date.parse(TRIAL_PEDIDO_INICIO_UTC) && agoraMs < Date.parse(TRIAL_PEDIDO_FIM_UTC)
}

/** A faixa do filme a pedido aparece? Só para quem está no lado e ainda não pagou. */
export function trialPedidoVisivel(row: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null } | null | undefined): boolean {
  if (!row || row.trial_status !== TRIAL_PEDIDO_STATUS || row.has_paid === true) return false
  const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : 'free'
  return plan === 'free' || plan === ''
}

export const TRIAL_PEDIDO_REFUSAL = 'Your free film is waiting: tap "Get my free film" at the top of this page, or pick a plan. Nothing was charged.'

export interface TrialPedidoCopy { title: string; body: string; claim: string; working: string; failed: string; preview: string; plans: string; previewHint: string }
export const TRIAL_PEDIDO_COPY: { en: TrialPedidoCopy; pt: TrialPedidoCopy; es: TrialPedidoCopy } = {
  en: { title: 'Your first film is free', body: 'See your scenes first, or get the free film when you are ready.', claim: 'Get my free film', working: 'Getting it ready…', failed: 'That did not work. Please try again.', preview: 'Preview my scenes', plans: 'See plans', previewHint: 'Your first film is free. Your script stays saved and opens ready to generate.' },
  pt: { title: 'Seu primeiro filme é grátis', body: 'Veja suas cenas antes, ou peça o filme grátis quando quiser.', claim: 'Quero meu filme grátis', working: 'Preparando…', failed: 'Não funcionou. Tente de novo.', preview: 'Ver minhas cenas', plans: 'Ver planos', previewHint: 'Seu primeiro filme é grátis. O seu roteiro fica guardado e abre pronto para gerar.' },
  es: { title: 'Tu primera película es gratis', body: 'Mira tus escenas antes, o pide la película gratis cuando quieras.', claim: 'Quiero mi película gratis', working: 'Preparando…', failed: 'No funcionó. Inténtalo de nuevo.', preview: 'Ver mis escenas', plans: 'Ver planes', previewHint: 'Tu primera película es gratis. Tu guion queda guardado y se abre listo para generar.' },
}
