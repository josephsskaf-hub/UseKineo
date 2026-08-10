// KINEO-COMPOSE-REJECT-NOREFUND-2026-08-10 — o estorno que faltava no ÚNICO
// ponto onde o render morre ANTES de existir.
//
// O QUE ESTAVA ERRADO (medido, não deduzido, na janela do apagão do Creatomate
// que começou em 09/08 16:21:08Z):
//
//   Quando o Creatomate recusa o submit, `/api/compose` devolve 502 e nenhum
//   `render_id` chega a existir. Sem `render_id`, o cliente NUNCA chama
//   `/api/compose/status/[renderId]` — que é o único lugar que estorna um
//   débito cinematográfico ao vivo (status/route.ts:1003). O crédito já foi
//   debitado lá atrás, no nascimento do clipe (`generate-video-cinematic`
//   debita ANTES do fal, chave `cinematic-<claimId>`).
//
//   Resultado: o único caminho de volta era o cron horário
//   `sweepAbandonedCinematicDebits()`, que exige `created_at < now() - 3h`
//   (lib/credits/refund.ts:201) e roda em `30 * * * *`. Os 16 estornos da
//   janela levaram de 3h05 a 4h05 — medido em `events.credits_refunded`.
//
//   Para quem está em trial com teto de 40 créditos, um clipe cinematográfico
//   custa 20. Uma recusa do fornecedor congelava METADE do trial por 3–4 horas,
//   com a pessoa olhando "Render service rejected the job" e sem saber que o
//   crédito voltaria. 18 das 22 vítimas do apagão eram de PRIMEIRO DIA.
//
// O QUE ISTO FAZ: no ramo TERMINAL do catch (502 — o fornecedor recusou de
// verdade), devolve o crédito na hora, libera o claim e registra o evento de
// auditoria. 3–4h viram 0s.
//
// O QUE ISTO NÃO FAZ, DE PROPÓSITO:
//
//   · NÃO roda no ramo AMBÍGUO (409 `pending`). Um 5xx ambíguo pode ter criado
//     o job do lado do fornecedor; o cliente ainda vai repolar e o render pode
//     entregar. Estornar ali seria dar o vídeo de graça. O cron de 3h continua
//     sendo a rede para esse caso — e ele é o lugar certo, porque só ele sabe,
//     3h depois, que a entrega não veio.
//
//   · NÃO toca no caminho AVATAR. `compose/status` deixou avatar/presenter como
//     estavam de propósito (são inalcançáveis no trial: 110/70 créditos contra
//     teto de 40, 3 renders em 30 dias) e o ativo do VEED continua pago e
//     reaproveitável. Uma variável por vez.
//
//   · NÃO toca no caminho FAST. Verificado no ledger: o fast NÃO deixa débito
//     numa recusa — `/api/compose` só cria um *hold* em `events`, e o débito do
//     fast só nasce em `compose/status:592`, dentro do ramo `succeeded`. Os 7
//     débitos `amount=1` da janela têm todos linha em `videos`: foram entregues.
//     Não há nada a estornar no fast, e mexer ali criaria estorno de render
//     entregue.
//
//   · NÃO migra `compose/status:1003` para cá. Aquele bloco está no caminho do
//     dinheiro, funciona, e carrega contexto que aqui não existe
//     (`compose_render_id`). Trocar três coisas num commit é como se perde o
//     controle da variável. Fica como dívida técnica declarada: quando alguém
//     achar um defeito NESTE arquivo, tem de conferir o gêmeo de lá.
//
// REUSO DO MOTIVO `provider_failed_refunded`: `releaseCinematicClaim` só aceita
// soltar um claim `settled` com um motivo que case
// /^provider_(all_failed|failed|abandoned)_refunded$/ (claim.ts). Essa regex é
// fronteira assinada — inventar um motivo novo aqui obrigaria a afrouxá-la, o
// que é caro por um rótulo. A distinção fica no evento de auditoria, que é
// texto livre: `reason: 'compose_provider_rejected_submission'`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { releaseCinematicClaim, type CinematicClaim } from '@/lib/cinematic/claim'
import { refundRenderCredits } from '@/lib/credits/refund'

const RELEASE_REASON = 'provider_failed_refunded'

/**
 * Estorna o débito de nascimento cinematográfico quando o fornecedor de render
 * recusa o submit de forma TERMINAL. Idempotente (o RPC `refund_render_credits`
 * reivindica a linha com UPDATE condicional em `refunded_at`) e nunca lança:
 * uma falha aqui não pode virar erro na tela de quem já perdeu o vídeo.
 *
 * @returns créditos devolvidos agora (0 quando não havia nada a devolver).
 */
export async function refundCinematicBirthOnProviderRejection(args: {
  db: SupabaseClient
  secret: string
  userId: string
  claim: CinematicClaim | null
  /** rótulo do caminho, só para log/auditoria: 'compose' | 'compose_hollywood' */
  context: string
  /** qualidade pedida no compose (pode diferir da do claim; a do claim manda) */
  composeQuality: string
}): Promise<number> {
  const { db, secret, userId, claim, context, composeQuality } = args
  try {
    if (!claim) return 0
    // `released` = o cron ou um poll anterior já devolveu. `settled` é o ÚNICO
    // estado em que existe débito vivo; `pending`/`done` ainda não debitaram.
    if (claim.status !== 'settled') return 0
    const reference = (claim.resolutionReference ?? '').trim()
    if (!reference.startsWith('cinematic-')) return 0

    const amount = await refundRenderCredits(reference)
    if (amount <= 0) return 0

    // Soltar o claim é OBRIGATÓRIO, não cosmético: um claim que continua
    // `settled` depois do estorno diz "já pago" para a próxima tentativa de
    // compose do MESMO generationId, e o render sairia de graça.
    let released = await releaseCinematicClaim({
      db, secret, userId,
      generationId: claim.generationId,
      reason: RELEASE_REASON,
      reference,
    })
    if (!released.ok) {
      // O update é condicionado à assinatura anterior, então um conflito
      // concorrente (outro submit da mesma aba) se resolve na releitura.
      released = await releaseCinematicClaim({
        db, secret, userId,
        generationId: claim.generationId,
        reason: RELEASE_REASON,
        reference,
      })
    }
    if (!released.ok) {
      // Mesmo desfecho documentado em compose/status: o dinheiro JÁ voltou e o
      // claim está preso a ESTE generationId, que morreu com este render — uma
      // geração nova nasce com claim novo. Resíduo inofensivo, não risco de
      // cobrança. E o cron NÃO reconcilia isto (lá o release só roda depois de
      // um refund com amount > 0, e o débito já está estornado).
      console.error(
        `[${context}] estorno OK mas release do claim cinematografico falhou gen=${claim.generationId}: ${released.error}` +
        ' — o credito JA voltou ao usuario; o claim fica settled (residuo inofensivo)',
      )
    }

    // Auditoria com o MESMO nome de evento que o cron e o status já escrevem,
    // para que uma consulta única enxergue os três. Nunca fatal: supabase-js
    // NÃO lança em erro de banco (devolve `{ error }`), daí o try/catch E a
    // checagem do retorno.
    try {
      const { error: auditError } = await db.from('events').insert({
        user_id: userId,
        name: 'credits_refunded',
        path: '/api/compose',
        session_id: claim.generationId,
        metadata: {
          render_id: reference,
          amount,
          reason: 'compose_provider_rejected_submission',
          quality: claim.quality,
          compose_quality: composeQuality,
          engine: claim.engine,
          context,
          refunded_at: new Date().toISOString(),
        },
      })
      if (auditError) {
        console.error(`[${context}] auditoria do estorno falhou (nao fatal): ${auditError.message}`)
      }
    } catch (auditErr) {
      console.error(
        `[${context}] auditoria do estorno lancou (nao fatal):`,
        auditErr instanceof Error ? auditErr.message : String(auditErr),
      )
    }

    return amount
  } catch (e) {
    console.error(
      `[${args.context}] estorno na recusa do fornecedor lancou (nao fatal):`,
      e instanceof Error ? e.message : String(e),
    )
    return 0
  }
}
