// KINEO-CARTOON-SO-PLANO-0411 [TRAVA 8.2 — fundador 05/11: "só dentro do plano com crédito (plano comprado)"]
// Quem pode fazer desenho: conta da casa, plano de assinatura corrente, ou quem comprou piloto/pack. Nada mais abre: crédito de teste,
// crédito dado à mão, plano *_trial (inclui cortesia) e pacote avulso antigo em conta free continuam podendo ver a tela e escrever a ideia.
// Por que não has_paid: ele fica true depois que a assinatura acaba e depois de qualquer pacote avulso.
// O plano segue a Stripe pelo webhook: cancelada, fica o plano até subscription.deleted, no fim do período pago; anual usa o mesmo nome de plano;
// past_due mantém o acesso enquanto a Stripe repete o cartão. Acabou, vira 'free' e fecha aqui.
// O pedido do cron com run pendente presa ao generationId passa sempre: o que já está na fila termina e é entregue.
// Sem kids_cartoon no pedido, esta regra não lê nada e não muda nada. Guardião: scripts/test-cartoon-so-plano-0411.mjs.
import { ADS_SUBSCRIBER_PLANS, isAdsInternalEmail } from '@/lib/ads/access'
import { KIDS_ORDERS_TABLE, kidsOrderAdmits, kidsServiceClient } from '@/lib/kidsVenda/server'

export const KIDS_PLANO_REASON = 'kids_plan_required'
export const KIDS_PLANO_SEM_LEITURA_REASON = 'kids_plan_unverified'

const MENSAGEM = {
  en: 'Cartoons are included in paid plans and use your plan credits. Choose a plan to make this one. Nothing was charged.',
  pt: 'Os desenhos fazem parte dos planos pagos e usam os créditos do plano. Escolha um plano para fazer este. Nada foi cobrado.',
  es: 'Los dibujos forman parte de los planes de pago y usan los créditos del plan. Elige un plan para hacer este. No se cobró nada.',
} as const
const SEM_LEITURA = {
  en: 'We could not confirm your plan right now. Nothing was charged. Please try again in a minute.',
  pt: 'Não conseguimos confirmar seu plano agora. Nada foi cobrado. Tente de novo em um minuto.',
  es: 'No pudimos confirmar tu plan ahora. No se cobró nada. Inténtalo de nuevo en un minuto.',
} as const
const lingua = (l: unknown): 'en' | 'pt' | 'es' => (l === 'pt' || l === 'es' ? l : 'en')

/** O plano corrente é de assinatura comprada? A mesma lista do Studio Ads: sem *_trial, sem piloto de prazo. */
export function temPlanoComprado(plan: unknown): boolean {
  return typeof plan === 'string' && ADS_SUBSCRIBER_PLANS.includes(plan.trim().toLowerCase())
}

export type AcessoAoDesenho = 'ok' | 'sem_plano' | 'sem_leitura'

/** paraHistoria: o cron escreve a história como a pessoa, antes do filme; o pedido grátis já na fila precisa passar por ali. */
export async function kidsAcessoAoDesenho(i: { userId: string; email: string | null | undefined; paraHistoria?: boolean }): Promise<AcessoAoDesenho> {
  if (isAdsInternalEmail(i.email)) return 'ok' // lista EXATA: isInternalEmail também casa padrões como 'test%', e aí um cliente chamado test123 passaria
  const db = kidsServiceClient()
  if (!db) return 'sem_leitura'
  try {
    const perfil = await db.from('profiles').select('plan').eq('id', i.userId).maybeSingle()
    if (perfil.error) return 'sem_leitura'
    if (temPlanoComprado((perfil.data as { plan?: unknown } | null)?.plan)) return 'ok'
    const pedidos = await db.from(KIDS_ORDERS_TABLE).select('kind, status').eq('user_id', i.userId).limit(50)
    if (pedidos.error) return (pedidos.error as { code?: string }).code === '42P01' || (pedidos.error as { code?: string }).code === 'PGRST205' ? 'sem_plano' : 'sem_leitura'
    const linhas = (pedidos.data ?? []) as { kind?: string; status?: string }[]
    if (linhas.some((o) => o.kind !== 'sample' && o.status !== 'cancelled')) return 'ok'
    if (i.paraHistoria && linhas.some((o) => o.kind === 'sample' && o.status === 'active')) return 'ok'
    return 'sem_plano'
  } catch {
    return 'sem_leitura'
  }
}

export type RecusaDoDesenho = { status: number; corpo: { error: string; reason: string; upsell?: 'creator'; charged: false } }

export function kidsRecusaDeAcesso(acesso: AcessoAoDesenho, language: unknown): RecusaDoDesenho | null {
  if (acesso === 'ok') return null
  if (acesso === 'sem_leitura') return { status: 503, corpo: { error: SEM_LEITURA[lingua(language)], reason: KIDS_PLANO_SEM_LEITURA_REASON, charged: false } }
  // 402 com upsell: o /generate já trata como portão de plano e abre a caixa de planos com esta frase; a tela do desenho mostra o link de planos.
  return { status: 402, corpo: { error: MENSAGEM[lingua(language)], reason: KIDS_PLANO_REASON, upsell: 'creator', charged: false } }
}

/** A guarda da rota do filme. null = segue o caminho de sempre. Sem kids_cartoon, sai aqui, sem nenhuma leitura. */
export async function kidsRecusaSemPlano(i: { raw: unknown; kidsOrder: unknown; userId: string; email: string | null | undefined; generationId: string; engine: unknown; duration: unknown; language: unknown }): Promise<RecusaDoDesenho | null> {
  if (i.raw === undefined || i.raw === null || i.raw === '') return null
  const acesso = await kidsAcessoAoDesenho({ userId: i.userId, email: i.email })
  if (acesso === 'ok') return null
  if (await kidsOrderAdmits({ raw: i.kidsOrder, userId: i.userId, generationId: i.generationId, engine: i.engine, duration: i.duration })) return null
  return kidsRecusaDeAcesso(acesso, i.language)
}
