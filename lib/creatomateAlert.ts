// KINEO-CREATOMATE-BLACKOUT-2026-08-10 — alarme do ÚNICO fornecedor que entra
// em 100% dos renders.
//
// POR QUE ESTE ARQUIVO EXISTE (medido, não deduzido — Supabase cqqukkvjjrguayiyjvhh,
// leitura de 10/08 14:0xZ):
//
//   · último vídeo concluído da empresa: 09/08 16:21:08Z
//   · última linha em `render_jobs`:      09/08 16:0x Z
//   · `generation_stage_error` com `reason='compose_not_ok'` e `http_status=502`:
//     55 eventos / 26 pessoas, primeiro 08/08 16:34Z, último 10/08 13:18Z
//
// Ou seja: o produto ficou ~22h sem produzir UM vídeo, com gente entrando e
// gastando crédito, e NINGUÉM foi avisado. `lib/openaiAlert.ts` e
// `lib/falAlert.ts` existem desde julho; o Creatomate — que é o gargalo de
// TODO render, Fast ou IA (ver comentário em `submitCreatomateRender`) — era o
// único fornecedor sem detecção. O playbook de blackout deste repositório tem
// duas metades permanentes (detecção + recuperação) e o Creatomate não tinha
// nenhuma das duas.
//
// Fire-and-forget, throttle de 30 min por instância de lambda — mesma forma do
// falAlert, de propósito: um alarme novo com receita de throttle diferente é
// mais uma coisa para manter.
//
// ⚠️ ESTE MÓDULO NUNCA LANÇA. Uma falha de alarme não pode virar uma falha de
// produto: quem chama já está no `catch` do caminho que perde o vídeo.

// Classificação do sintoma. NÃO é usada para decidir se alerta — alerta sempre
// que o provedor recusa —, e sim para o ASSUNTO do e-mail, porque as duas
// causas têm ações OPOSTAS do outro lado ("recarregar/renovar plano" ×
// "esperar/abrir ticket"). PROMPT-DIARIO, sprint 13h de 05/08: alarme com
// receita errada é pior que alarme nenhum.
export function looksLikeBillingBlock(status: number | undefined, message: string): boolean {
  const blob = message.toLowerCase()
  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    /quota|credit|balance|payment|billing|subscription|plan|expired|suspend|unauthor|forbidden|invalid api key/.test(blob)
  )
}

let LAST_CREATOMATE_ALERT = 0

export async function alertCreatomateDown(input: {
  context: string
  status?: number
  message: string
}): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key || key === 'your_resend_api_key_here') return
    const now = Date.now()
    if (now - LAST_CREATOMATE_ALERT < 30 * 60 * 1000) return
    LAST_CREATOMATE_ALERT = now

    const billing = looksLikeBillingBlock(input.status, input.message)
    const from = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'
    const subject = billing
      ? '🚨 Kineo: Creatomate BLOQUEADO (conta/plano) — NENHUM vídeo está sendo renderizado'
      : '🚨 Kineo: Creatomate recusando renders — NENHUM vídeo está sendo renderizado'
    // Duas receitas separadas, porque as ações são opostas.
    const whatToDo = billing
      ? 'AÇÃO: abrir https://creatomate.com/dashboard e conferir plano/saldo/chave de API. ' +
        'O status devolvido é típico de conta bloqueada, cota estourada ou chave inválida — ' +
        'não passa sozinho com o tempo.'
      : 'AÇÃO: conferir https://creatomate.com/dashboard e o status do provedor. ' +
        'Se for instabilidade, passa sozinho — NÃO recarregue nada por causa deste e-mail.'

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      // ⚠️ TIMEOUT OBRIGATÓRIO. Quem chama isto está no `catch` do compose e
      // responde na linha seguinte, e `maxDuration` daquela rota é 300s: sem
      // limite aqui, um Resend lento transforma "seu vídeo falhou" numa
      // ampulheta de minutos — o alarme pioraria exatamente o incidente que ele
      // veio anunciar. 8s é maior que qualquer envio saudável e menor que
      // qualquer paciência.
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: ['josephsskaf@gmail.com'],
        subject,
        text:
          'O Creatomate está recusando a criação de renders AGORA. ' +
          'Ele entra em TODO vídeo (Fast e IA), então o produto inteiro está parado enquanto isto durar.\n\n' +
          `Contexto: ${input.context}\n` +
          `HTTP do provedor: ${typeof input.status === 'number' ? input.status : '(sem status — conexão/timeout)'}\n` +
          `Mensagem: ${input.message.slice(0, 500)}\n` +
          `Hora: ${new Date().toISOString()}\n\n` +
          `${whatToDo}\n\n` +
          'Este alarme é throttled em 30 min por instância — se chegar de novo, ainda está caindo.',
      }),
    })
    console.error('[creatomate-alert] CREATOMATE RECUSANDO RENDERS — fundador alertado')
  } catch (e) {
    console.error('[creatomate-alert] alert email failed:', e instanceof Error ? e.message : String(e))
  }
}
