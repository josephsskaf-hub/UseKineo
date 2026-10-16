// KINEO-S25-FOTO-CLIPES-1610 — DESFAZ, em memória, o conserto do Seedance 2.5 com foto em lib/clips/clipServer.ts (o motivo
// da fal lido de err.body e limpo antes de virar provider_error), para os guardiões que conferem o arquivo BYTE A BYTE
// contra uma base antiga (scripts/test-moderacao-1410.mjs 4a). Módulo auxiliar; não é teste (o nome não começa com test-).
//
// As trocas abaixo foram GERADAS do diff real (pai do commit do conserto → conserto): cada uma é a linha de contexto + o
// bloco novo, linhas INTEIRAS, achada EXATAMENTE 1× — senão lança (o guardião fica vermelho). Com a marca no texto, todas
// as trocas têm de aplicar e nenhuma marca pode sobrar. Sem a marca, devolve o texto igual (só LF).
export const MARCA_S25_FOTO_CLIPES_1610 = 'KINEO-S25-FOTO-CLIPES-1610'
export const ARQUIVO_S25_FOTO_CLIPES_1610 = 'lib/clips/clipServer.ts'

const TROCAS = [
  {
    "novo": "  CLIP_PENDING_STALE_MS,\n  cleanProviderError, // KINEO-S25-FOTO-CLIPES-1610\n  falErrorDetail, // KINEO-S25-FOTO-CLIPES-1610\n",
    "velho": "  CLIP_PENDING_STALE_MS,\n"
  },
  {
    "novo": "  if (!response.ok) {\n    // KINEO-S25-FOTO-CLIPES-1610 — o corpo inteiro da fal (detail string OU lista [{loc,msg,type}], message, error), não só o\n    // detail-string; limpo (sem URL, sem a FAL_KEY, ≤300) porque vira `provider_error` no clip_failed (lib/clips/clipFlow.ts).\n    const detail = falErrorDetail(Object.keys(payload).length ? payload : raw) || raw.slice(0, 300) // KINEO-S25-FOTO-CLIPES-1610\n",
    "velho": "  if (!response.ok) {\n    const detail = typeof payload.detail === 'string' ? payload.detail : raw.slice(0, 300)\n"
  },
  {
    "novo": "    }\n    return { ok: false, ambiguous: response.status === 408 || response.status >= 500, error: cleanProviderError(`fal ${response.status}: ${detail}`, [key]) ?? `fal ${response.status}` } // KINEO-S25-FOTO-CLIPES-1610\n",
    "velho": "    }\n    return { ok: false, ambiguous: response.status === 408 || response.status >= 500, error: `fal ${response.status}: ${detail}`.slice(0, 200) }\n"
  },
  {
    "novo": "    const msg = err instanceof Error ? err.message : String(err)\n    // KINEO-S25-FOTO-CLIPES-1610 — o motivo REAL mora em err.body.detail (err.message é só \"Unprocessable Entity\"); era\n    // descartado aqui. Mesmo campo que o poller do filme lê (app/api/cinematic-clip-status pollMessageSignal). Limpo com a FAL_KEY.\n    if (status === 422 || status === 400 || /unprocessable entity/i.test(msg)) { // KINEO-S25-FOTO-CLIPES-1610\n      const detail = falErrorDetail((err as { body?: unknown })?.body) // KINEO-S25-FOTO-CLIPES-1610\n      return { state: 'failed', error: cleanProviderError(`fal ${status ?? ''} ${detail || msg}`, [process.env.FAL_KEY ?? '']) ?? `fal ${status ?? ''}` } // KINEO-S25-FOTO-CLIPES-1610\n    } // KINEO-S25-FOTO-CLIPES-1610\n",
    "velho": "    const msg = err instanceof Error ? err.message : String(err)\n    if (status === 422 || status === 400 || /unprocessable entity/i.test(msg)) return { state: 'failed', error: `fal ${status ?? ''} ${msg}`.slice(0, 200) }\n"
  }
]

/** O texto de ANTES deste conserto (LF). Só mexe em lib/clips/clipServer.ts; outro arquivo volta igual (só LF). */
export function semS25FotoClipes1610(arquivo, s) {
  const texto = String(s).replace(/\r\n/g, '\n')
  if (arquivo !== ARQUIVO_S25_FOTO_CLIPES_1610 || !texto.includes(MARCA_S25_FOTO_CLIPES_1610)) return texto
  let out = texto
  for (const t of TROCAS) {
    const partes = out.split(t.novo)
    if (partes.length !== 2) throw new Error(`desfaz-s25-foto-clipes-1610: bloco achado ${partes.length - 1}× (esperado 1): ${t.novo.slice(0, 120)}`)
    out = partes.join(t.velho)
  }
  if (out.includes(MARCA_S25_FOTO_CLIPES_1610)) throw new Error('desfaz-s25-foto-clipes-1610: sobrou linha marcada depois de desfazer')
  return out
}
