// KINEO-RETENTAR-CENA-1410 — DESFAZ, em memória, a retomada de cena pelo SERVIDOR (cron finish-stranded-renders + modo serviço
// da retomada /api/retry-hollywood-scene), para os guardiões que conferem esses arquivos BYTE A BYTE contra uma base antiga.
// Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Toda linha que o conserto tocou carrega a marca KINEO-RETENTAR-CENA-1410. Duas formas, e só elas:
//   · TROCA — a linha da base foi reescrita: a linha nova é reconhecida pelo PREFIXO exato (a linha inteira) e volta a ser a
//     linha da base;
//   · ACRÉSCIMO — a linha não existia: reconhecida pelo prefixo exato e removida.
// Linha marcada que não casa com nenhuma entrada = lança (o guardião fica vermelho em vez de engolir uma mudança nova). Cada
// entrada vale UMA vez por texto (linhas repetidas têm uma entrada cada), e havendo QUALQUER linha marcada, TODAS as entradas
// do arquivo têm de aparecer (conserto pela metade também lança). lib/cinematic/sceneRetryPolicy.ts é arquivo NOVO: desfeito,
// ele não existe. scripts/test-retentar-cena-1410.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (o pai do
// 1º commit com a marca — nunca origin/main, que muda depois de publicado).
export const MARCA_RETENTAR_CENA_1410 = 'KINEO-RETENTAR-CENA-1410'
export const ARQUIVO_RETOMADA_1410 = 'app/api/retry-hollywood-scene/route.ts'
export const ARQUIVO_CRON_1410 = 'app/api/cron/finish-stranded-renders/route.ts'
export const ARQUIVO_LIB_NOVA_1410 = 'lib/cinematic/sceneRetryPolicy.ts'

const FORMAS = {
  [ARQUIVO_RETOMADA_1410]: {
    TROCAS: [
  ["  const { data: { user } } = servico ? { data: { user: { id: servico } } } : await createClient().auth.getUser() // KINEO-RETENTAR-CENA-1410","  const { data: { user } } = await createClient().auth.getUser()"],
  ["    if (!await revalidate()) return soltaNaDuvida ? await soltaClassica(refused, 'ambiguous', null) : await releaseSceneRetryMutex(args, mutex) ? refused() : support() // KINEO-RETENTAR-CENA-1410","    if (!await revalidate()) return classic ? await soltaClassica(refused, 'ambiguous', null) : await releaseSceneRetryMutex(args, mutex) ? refused() : support()"],
  ["    if (soltaNaDuvida) { // KINEO-RETENTAR-CENA-1410","    if (classic) {"],
  ["      if (soltaNaDuvida) { await returnClassicAttempt(args, slot); return await soltaClassica(refused, 'ambiguous', null) } // KINEO-RETENTAR-CENA-1410","      if (classic) { await returnClassicAttempt(args, slot); return await soltaClassica(refused, 'ambiguous', null) }"],
  ["    const requestId = soltaNaDuvida // KINEO-RETENTAR-CENA-1410","    const requestId = classic"],
  ["      if (!soltaNaDuvida) { await markSceneRetryHold(args, mutex, 'retarget_failed', requestId); return support() } // KINEO-RETENTAR-CENA-1410","      if (!classic) { await markSceneRetryHold(args, mutex, 'retarget_failed', requestId); return support() }"],
  ["      if (!soltaNaDuvida || !await releaseSceneRetryMutex(args, mutex)) { // KINEO-RETENTAR-CENA-1410","      if (!classic || !await releaseSceneRetryMutex(args, mutex)) {"],
  ["        if (!soltaNaDuvida) return support() // KINEO-RETENTAR-CENA-1410","        if (!classic) return support()"],
  ["    if (soltaNaDuvida) { // KINEO-RETENTAR-CENA-1410","    if (classic) {"],
],
    ACRESCIMOS: [
  "// KINEO-RETENTAR-CENA-1410 — modo serviço do cron finish-stranded-renders (aba fechada): Bearer CRON_SECRET + x-kineo-service-user,",
  "// KINEO-RETENTAR-CENA-1410 — o mesmo par do compose. Fail-closed: sem CRON_SECRET o modo não existe; header errado cai no cookie.",
  "// KINEO-RETENTAR-CENA-1410 — O segredo troca SÓ o cookie: claim HMAC, slot provado (terminal_failed_jobs), mutex e retarget seguem iguais.",
  "function usuarioDeServico(req: NextRequest): string | null { // KINEO-RETENTAR-CENA-1410",
  "  const segredo = process.env.CRON_SECRET // KINEO-RETENTAR-CENA-1410",
  "  const id = (req.headers?.get?.('x-kineo-service-user') ?? '').trim() // KINEO-RETENTAR-CENA-1410",
  "  return segredo && req.headers?.get?.('authorization') === `Bearer ${segredo}` && /^[0-9a-f-]{36}$/i.test(id) ? id : null // KINEO-RETENTAR-CENA-1410",
  "} // KINEO-RETENTAR-CENA-1410",
  "  const servico = usuarioDeServico(req) // KINEO-RETENTAR-CENA-1410",
  "  // KINEO-RETENTAR-CENA-1410 — em modo serviço a família hollywood segue a regra da clássica na DÚVIDA: registro antes do gasto,",
  "  // KINEO-RETENTAR-CENA-1410 — POST com prazo de 25 s e, ambíguo, o mutex é SOLTO (o filme vai com as prontas). Sem ninguém na aba",
  "  // KINEO-RETENTAR-CENA-1410 — para confirmar, prender o filme esperando suporte seria pior que a cena perdida. Aba = comportamento de sempre.",
  "  const soltaNaDuvida = classic || servico !== null // KINEO-RETENTAR-CENA-1410",
],
  },
  [ARQUIVO_CRON_1410]: {
    TROCAS: [
  ["    const collected = await collectFinishedClips(requestIds, models, claimAgeMin, rastroDaColeta) // KINEO-RETENTAR-CENA-1410","    const collected = await collectFinishedClips(requestIds, models, claimAgeMin)"],
],
    ACRESCIMOS: [
  "import { createHash } from 'node:crypto' // KINEO-RETENTAR-CENA-1410",
  "import { authorizeCinematicTerminalFailures } from '@/lib/cinematic/claim' // KINEO-RETENTAR-CENA-1410",
  "import { CENA_RETRY_EVENT, executarRetentativas, type FalhaDeCena, type PlanoDaCena } from '@/lib/cinematic/sceneRetryPolicy' // KINEO-RETENTAR-CENA-1410",
  "import { HOLLYWOOD_SCENE_RETRIED_EVENT } from '@/lib/stuckScene' // KINEO-RETENTAR-CENA-1410",
  "import { POST as sceneRetryPost } from '@/app/api/retry-hollywood-scene/route' // KINEO-RETENTAR-CENA-1410",
  "  rastro?: RastroDaColeta, // KINEO-RETENTAR-CENA-1410 — falhas TERMINAIS provadas pela fila + cenas prontas, para a retomada",
  "      const fimDaFila = st as unknown as { request_id?: unknown; error?: unknown; error_type?: unknown } // KINEO-RETENTAR-CENA-1410",
  "      const erroDaFila = fimDaFila.request_id === id && typeof fimDaFila.error === 'string' && fimDaFila.error.trim() ? { message: fimDaFila.error.trim().slice(0, 400), type: typeof fimDaFila.error_type === 'string' ? fimDaFila.error_type : null } : null // KINEO-RETENTAR-CENA-1410",
  "      if (status !== 'COMPLETED' && erroDaFila) rastro?.falhas.push({ index: i, requestId: id, model, http: null, message: erroDaFila.message, errorType: erroDaFila.type }) // KINEO-RETENTAR-CENA-1410",
  "        if (url) rastro?.prontas.push({ requestId: id, model, url }) // KINEO-RETENTAR-CENA-1410",
  "        else if (erroDaFila) rastro?.falhas.push({ index: i, requestId: id, model, http: null, message: erroDaFila.message, errorType: erroDaFila.type }) // KINEO-RETENTAR-CENA-1410",
  "        if (erroDaFila) rastro?.falhas.push({ index: i, requestId: id, model, http: httpStatus, message: erroDaFila.message, errorType: erroDaFila.type }) // KINEO-RETENTAR-CENA-1410 — sem erro na fila, result() falho NÃO prova job morto: não reenvia",
  "// ═══ KINEO-RETENTAR-CENA-1410 — a cena que a fal derruba com a aba FECHADA ganha a mesma retomada da aba ═══",
  "// KINEO-RETENTAR-CENA-1410 — Antes: a coleta contava a cena como `dead` e o filme saía com N-1 cenas ou caía em too_few (estorno).",
  "// KINEO-RETENTAR-CENA-1410 — Agora, só para falha TERMINAL provada pela fila (COMPLETED + error, id conferido) e retentável",
  "// KINEO-RETENTAR-CENA-1410 — (429/408/5xx/capacidade): até 2 retentativas por cena (aba + cron somadas), com espera, via a",
  "// KINEO-RETENTAR-CENA-1410 — retomada assinada em modo serviço. Nenhum crédito se move aqui: débito e estorno seguem nos donos",
  "// KINEO-RETENTAR-CENA-1410 — de sempre (geração e too_few). Regra pura e testada em lib/cinematic/sceneRetryPolicy.ts.",
  "type RastroDaColeta = { falhas: FalhaDeCena[]; prontas: ClipResult[] } // KINEO-RETENTAR-CENA-1410",
  "function idDaRetentativa(userId: string, genId: string, p: PlanoDaCena, tipo: string): string { // KINEO-RETENTAR-CENA-1410",
  "  const hex = createHash('sha256').update(JSON.stringify(['kineo:cena-retry-cron:v1', userId, genId, p.falha.index, p.falha.requestId, tipo])).digest('hex').slice(0, 32) // KINEO-RETENTAR-CENA-1410",
  "  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}` // KINEO-RETENTAR-CENA-1410",
  "} // KINEO-RETENTAR-CENA-1410",
  "async function retentarCenasDoFilme(a: { admin: SupabaseClient; secret: string; userId: string; genId: string; claimCreatedAt: unknown; claimAgeMin: number; rastro: RastroDaColeta }): Promise<{ reenviadas: number; segurar: boolean }> { // KINEO-RETENTAR-CENA-1410",
  "  try { // KINEO-RETENTAR-CENA-1410",
  "    const { data: feitas, error: erroDoHistorico } = await a.admin.from('events').select('created_at, metadata').eq('name', HOLLYWOOD_SCENE_RETRIED_EVENT).eq('session_id', a.genId).limit(200) // KINEO-RETENTAR-CENA-1410",
  "    if (erroDoHistorico) return { reenviadas: 0, segurar: false } // KINEO-RETENTAR-CENA-1410 — sem histórico não há contagem: nunca arrisca a 3ª",
  "    const anteriores = (feitas ?? []).map((r) => ({ index: Number((r.metadata as { scene_index?: unknown } | null)?.scene_index), at: Date.parse(String(r.created_at ?? '')) })).filter((r) => Number.isInteger(r.index) && Number.isFinite(r.at)) // KINEO-RETENTAR-CENA-1410",
  "    const base = { user_id: a.userId, name: CENA_RETRY_EVENT, path: '/api/cron/finish-stranded-renders', session_id: a.genId } // KINEO-RETENTAR-CENA-1410",
  "    const r = await executarRetentativas({ // KINEO-RETENTAR-CENA-1410",
  "      falhas: a.rastro.falhas, anteriores, prontas: a.rastro.prontas.length, agora: Date.now(), idadeMin: a.claimAgeMin, // KINEO-RETENTAR-CENA-1410",
  "      inicioMs: typeof a.claimCreatedAt === 'string' ? Date.parse(a.claimCreatedAt) : NaN, // KINEO-RETENTAR-CENA-1410",
  "      deps: { // KINEO-RETENTAR-CENA-1410",
  "        marcar: async (tipo, p, metadata) => { // KINEO-RETENTAR-CENA-1410",
  "          const { error } = await a.admin.from('events').insert({ ...base, id: idDaRetentativa(a.userId, a.genId, p, tipo), metadata: { ...metadata, via: 'cron' } }) // KINEO-RETENTAR-CENA-1410",
  "          return !error ? 'nova' : (error as { code?: string }).code === '23505' ? 'repetida' : 'erro' // KINEO-RETENTAR-CENA-1410",
  "        }, // KINEO-RETENTAR-CENA-1410",
  "        provar: async (falhas) => { // KINEO-RETENTAR-CENA-1410",
  "          const prova = { db: a.admin, secret: a.secret, userId: a.userId, generationId: a.genId } // KINEO-RETENTAR-CENA-1410",
  "          if (a.rastro.prontas.length > 0 && !(await authorizeCinematicCompletedUrls({ ...prova, completed: a.rastro.prontas })).ok) return false // KINEO-RETENTAR-CENA-1410",
  "          return (await authorizeCinematicTerminalFailures({ ...prova, failed: falhas.map((f) => ({ requestId: f.requestId, model: f.model })) })).ok // KINEO-RETENTAR-CENA-1410",
  "        }, // KINEO-RETENTAR-CENA-1410",
  "        reenviar: async (f) => { // KINEO-RETENTAR-CENA-1410",
  "          try { // KINEO-RETENTAR-CENA-1410",
  "            const res = await sceneRetryPost(new NextRequest(`${APP_URL}/api/retry-hollywood-scene`, { method: 'POST', headers: serviceHeaders(a.userId), body: JSON.stringify({ generationId: a.genId, sceneIndex: f.index, model: f.model, oldRequestId: f.requestId, sanitize: false }) })) // KINEO-RETENTAR-CENA-1410",
  "            const j = (await res.json().catch(() => null)) as { requestId?: unknown } | null // KINEO-RETENTAR-CENA-1410",
  "            return { status: res.status, requestId: typeof j?.requestId === 'string' ? j.requestId : null } // KINEO-RETENTAR-CENA-1410",
  "          } catch { return { status: 0 } } // KINEO-RETENTAR-CENA-1410",
  "        }, // KINEO-RETENTAR-CENA-1410",
  "        registrar: async (_p, metadata) => { // KINEO-RETENTAR-CENA-1410",
  "          try { await a.admin.from('events').insert({ ...base, metadata: { ...metadata, via: 'cron' } }) } catch { /* rastro nunca derruba a rodada */ } // KINEO-RETENTAR-CENA-1410",
  "        }, // KINEO-RETENTAR-CENA-1410",
  "      }, // KINEO-RETENTAR-CENA-1410",
  "    }) // KINEO-RETENTAR-CENA-1410",
  "    console.log(`[stranded] gen=${a.genId.slice(0, 8)} scene_retry ${r.resultados.map((x) => `${x.index + 1}:${x.desfecho}`).join(' ')}`) // KINEO-RETENTAR-CENA-1410",
  "    return { reenviadas: r.reenviadas, segurar: r.segurar } // KINEO-RETENTAR-CENA-1410",
  "  } catch (e) { // KINEO-RETENTAR-CENA-1410",
  "    console.warn(`[stranded] gen=${a.genId.slice(0, 8)} scene_retry threw:`, e instanceof Error ? e.message : String(e)) // KINEO-RETENTAR-CENA-1410",
  "    return { reenviadas: 0, segurar: false } // KINEO-RETENTAR-CENA-1410",
  "  } // KINEO-RETENTAR-CENA-1410",
  "} // KINEO-RETENTAR-CENA-1410",
  "    const rastroDaColeta: RastroDaColeta = { falhas: [], prontas: [] } // KINEO-RETENTAR-CENA-1410",
  "    // KINEO-RETENTAR-CENA-1410 — cena terminada com erro retentável: refaz ANTES de decidir too_few (estorno) ou montar com N-1.",
  "    if (rastroDaColeta.falhas.length > 0) { // KINEO-RETENTAR-CENA-1410",
  "      const retentativa = await retentarCenasDoFilme({ admin, secret, userId, genId, claimCreatedAt: claim.created_at, claimAgeMin, rastro: rastroDaColeta }) // KINEO-RETENTAR-CENA-1410",
  "      if (retentativa.segurar) { results.push({ generation: gen8, outcome: `scene_retry_wait:${retentativa.reenviadas}/${requestIds.length}` }); continue } // KINEO-RETENTAR-CENA-1410",
  "    } // KINEO-RETENTAR-CENA-1410",
],
  },
}

/** Quantas entradas cada arquivo tem (trocas, acréscimos) — o guardião confere contra o diff real. */
export const FORMA_RETENTAR_CENA_1410 = Object.fromEntries(Object.entries(FORMAS).map(([f, v]) => [f, { trocas: v.TROCAS.length, acrescimos: v.ACRESCIMOS.length }]))

/** O texto do arquivo de ANTES deste conserto. Preserva CRLF se vier com CRLF. Idempotente: sem nada marcado, devolve igual. */
export function semRetentarCena1410(s, arquivo) {
  const forma = FORMAS[arquivo]
  if (!forma) throw new Error('desfaz-retentar-cena-1410: arquivo sem forma conhecida: ' + arquivo)
  const bruto = String(s)
  const crlf = bruto.includes('\r\n')
  const texto = crlf ? bruto.replace(/\r\n/g, '\n') : bruto
  const usadas = new Set()
  const out = []
  let marcadas = 0
  for (const l of texto.split('\n')) {
    if (!l.includes(MARCA_RETENTAR_CENA_1410)) { out.push(l); continue }
    marcadas++
    const t = forma.TROCAS.findIndex(([novo], i) => !usadas.has('t' + i) && l.startsWith(novo))
    if (t >= 0) { usadas.add('t' + t); out.push(forma.TROCAS[t][1]); continue }
    const a = forma.ACRESCIMOS.findIndex((p, i) => !usadas.has('a' + i) && l.startsWith(p))
    if (a >= 0) { usadas.add('a' + a); continue }
    throw new Error('desfaz-retentar-cena-1410: linha marcada inesperada em ' + arquivo + ': ' + l.slice(0, 140))
  }
  if (marcadas > 0 && usadas.size !== forma.TROCAS.length + forma.ACRESCIMOS.length) {
    throw new Error('desfaz-retentar-cena-1410: conserto pela metade em ' + arquivo + ' (' + usadas.size + ' de ' + (forma.TROCAS.length + forma.ACRESCIMOS.length) + ' entradas)')
  }
  const r = out.join('\n')
  return crlf ? r.replace(/\n/g, '\r\n') : r
}
