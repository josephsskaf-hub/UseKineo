// KINEO-MOTOR-15S-1510 — DESFAZ, em memória, o conserto do filme grátis de 15 s no roteirista e no /generate
// (app/api/generate-script/route.ts e app/(dashboard)/generate/GenerateClient.tsx), para os guardiões que conferem esses
// arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Toda linha que o conserto tocou carrega a marca KINEO-MOTOR-15S-1510. Duas formas, e só elas:
//   · TROCA — a linha da base foi reescrita: a linha nova é reconhecida pelo PREFIXO exato e volta a ser a linha da base;
//   · ACRÉSCIMO — a linha não existia: reconhecida pelo prefixo exato e removida.
// Linha marcada que não casa com nenhum prefixo = lança (o guardião fica vermelho). Cada prefixo vale UMA vez por texto.
// Com `arquivo` ('route' | 'client'), e alguma linha marcada no texto, TODOS os prefixos daquele arquivo têm de aparecer
// (conserto pela metade também lança). scripts/test-motor-15s-1510.mjs prova que, desfeito isto, os dois arquivos são
// EXATAMENTE a base (origin/main do dia).
export const MARCA_MOTOR_15S_1510 = 'KINEO-MOTOR-15S-1510'

const TROCAS = {
  client: [
    ["          message: res.status === 422 && typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : 'The writer could not finish right now. Try again in a moment.', // KINEO-MOTOR-15S-1510",
      "          message: 'The writer could not finish right now. Try again in a moment.',"],
    ["        void trackEvent('script_authoring_failed', { http: res.status, reason: typeof data?.reason === 'string' ? data.reason : null }) // KINEO-MOTOR-15S-1510",
      "        void trackEvent('script_authoring_failed', { http: res.status })"],
    ['      const aplicou = duracaoColada !== null && duracaoColada !== duration // KINEO-MOTOR-15S-1510',
      '      const aplicou = leituraColada.suggestedDuration !== null && leituraColada.suggestedDuration !== duration'],
    ['      if (duracaoColada !== null && aplicou) { // KINEO-MOTOR-15S-1510',
      '      if (leituraColada.suggestedDuration !== null && aplicou) {'],
    ['        setDuration(duracaoColada as Duration) // KINEO-MOTOR-15S-1510',
      '        setDuration(leituraColada.suggestedDuration as Duration)'],
    ['        alvoAnalise = duracaoColada as Duration // KINEO-MOTOR-15S-1510',
      '        alvoAnalise = leituraColada.suggestedDuration as Duration'],
    ['        applied_seconds: duracaoColada, // KINEO-MOTOR-15S-1510',
      '        applied_seconds: leituraColada.suggestedDuration,'],
    ['        const sobePara = sobeCabeNoSaldo ? (subidaDoAutofit ? (subidaDoAutofit.para > duration ? subidaDoAutofit.para as Duration : undefined) : sobeParaBruto) : undefined // KINEO-MOTOR-15S-1510',
      '        const sobePara = sobeCabeNoSaldo ? sobeParaBruto : undefined'],
    ["      : (opts?.scriptModeOverride ?? modoDoTextoNoCurto ?? scriptMode) === 'ai' && (opts?.structureFirst === true || modoDoTextoNoCurto !== null || !opts?.skipPreview) // KINEO-MOTOR-15S-1510",
      "      : (opts?.scriptModeOverride ?? scriptMode) === 'ai' && (opts?.structureFirst === true || !opts?.skipPreview)"],
  ],
  route: [
    ['    const regua = writerRateFor(motorDoEscritor(body.engine, isShortFilmTarget(alvoSegundos)), topic, language) // KINEO-MOTOR-15S-1510',
      '    const regua = writerRateFor(body.engine, topic, language)'],
    ['      const novaTentativa = resgateDaRecusa(decidirNovaTentativaDoRoteiro(topic), topic) // KINEO-PRIMEIRO-FILME-2026-10-13 · KINEO-MOTOR-15S-1510',
      '      const novaTentativa = decidirNovaTentativaDoRoteiro(topic) // KINEO-PRIMEIRO-FILME-2026-10-13'],
    ["            const deNovo = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.7, max_tokens: 700, messages: [{ role: 'system', content: SYSTEM_PROMPT + instrucaoDoResgate({ alvoSegundos, piso: filmeCurto ? pisoFilmeCurto : null, teto: filmeCurto ? tetoFilmeCurto : null }) }, { role: 'user', content: 'Write a viral YouTube Short script about this topic:\\n\\n' + novaTentativa.story }] }, { timeout: OPENAI_SCRIPT_TIMEOUT_MS, maxRetries: 0 }) // KINEO-PRIMEIRO-FILME-2026-10-13 · KINEO-MOTOR-15S-1510",
      "            const deNovo = await openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.7, max_tokens: 700, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: 'Write a viral YouTube Short script about this topic:\\n\\n' + novaTentativa.story }] }, { timeout: OPENAI_SCRIPT_TIMEOUT_MS, maxRetries: 0 }) // KINEO-PRIMEIRO-FILME-2026-10-13"],
    ["            await rastroDaTentativa(historiaAceita ? 'ok' : 'failed', historiaAceita ? 'story_only_accepted' : roteiroDeNovo ? 'declined_again' : 'empty_completion', { modo: novaTentativa.modo }) // KINEO-PRIMEIRO-FILME-2026-10-13 · KINEO-MOTOR-15S-1510",
      "            await rastroDaTentativa(historiaAceita ? 'ok' : 'failed', historiaAceita ? 'story_only_accepted' : roteiroDeNovo ? 'declined_again' : 'empty_completion') // KINEO-PRIMEIRO-FILME-2026-10-13"],
  ],
}

const ACRESCIMOS = {
  client: [
    "import { subidaQueOSaldoPaga, notaDaSubidaSegura, SUBIDA_SEGURA_PELO_SALDO_EVENT, MOTOR_15S_VERSION } from '@/lib/growth/motor15s' // KINEO-MOTOR-15S-1510",
    '  const [notaSubidaSegura, setNotaSubidaSegura] = useState<{ texto: string; para: number } | null>(null) // KINEO-MOTOR-15S-1510',
    '    setNotaSubidaSegura(null) // KINEO-MOTOR-15S-1510',
    '    const contaPagaNaSubida = planTier === null ? null : hasPaid || isStarter || isCreator || isStudio // KINEO-MOTOR-15S-1510',
    '    const custoDaOpcao = (segundos: number): number => costForDurationOption(segundos as Duration) // KINEO-MOTOR-15S-1510',
    "    const avisarSubidaSegura = (sub: ReturnType<typeof subidaQueOSaldoPaga>, origem: 'pasted_directive' | 'autofit'): void => {",
    "    let modoDoTextoNoCurto: 'ai' | null = null // KINEO-MOTOR-15S-1510",
    '      const subidaColada = leituraColada.suggestedDuration !== null ? subidaQueOSaldoPaga({',
    '      const duracaoColada = subidaColada ? subidaColada.para : null // KINEO-MOTOR-15S-1510',
    "      if (subidaColada) avisarSubidaSegura(subidaColada, 'pasted_directive') // KINEO-MOTOR-15S-1510",
    '        held_by_balance: subidaColada?.segurou === true, // KINEO-MOTOR-15S-1510',
    '        const subidaDoAutofit = sobeCabeNoSaldo && sobeParaBruto !== undefined ? subidaQueOSaldoPaga({',
    "        if (subidaDoAutofit) avisarSubidaSegura(subidaDoAutofit, 'autofit') // KINEO-MOTOR-15S-1510",
    "        if (sobeParaBruto !== undefined && sobePara === undefined && contaPagaNaSubida === false && duration === SEEDANCE_SHORT_SECONDS && mode === 'cinematic_ai' && aiEngine === 'seedance' && !roteiroCabeNoFilmeCurto(baseChecagem, SEEDANCE_SHORT_SECONDS, language)) modoDoTextoNoCurto = 'ai' // KINEO-MOTOR-15S-1510",
    '            {notaSubidaSegura !== null && duration === notaSubidaSegura.para && freeFilmFrom === null',
  ],
  route: [
    "import { resgateDaRecusa, instrucaoDoResgate, motorDoEscritor } from '@/lib/growth/motor15s' // KINEO-MOTOR-15S-1510",
    "import { moderationRefusalMessage } from '@/lib/safety/moderationPolicy' // KINEO-MOTOR-15S-1510",
    '    let conteudoBarrado = false // KINEO-MOTOR-15S-1510',
    "          conteudoBarrado = moderacao.reason === 'blocked' // KINEO-MOTOR-15S-1510",
    "      if (conteudoBarrado) return await recusar(422, { error: moderationRefusalMessage('blocked'), reason: 'content_not_allowed', retryable: false }",
  ],
}

/** Quantas entradas o conserto tem em cada arquivo (trocas, acréscimos) — o guardião confere contra o diff real. */
export const FORMA_MOTOR_15S_1510 = {
  client: { trocas: TROCAS.client.length, acrescimos: ACRESCIMOS.client.length },
  route: { trocas: TROCAS.route.length, acrescimos: ACRESCIMOS.route.length },
}

/** O texto de ANTES deste conserto (LF). Idempotente: sem nada marcado, devolve o texto igual (só LF). */
export function semMotor15s1510(s, arquivo) {
  const texto = String(s).replace(/\r\n/g, '\n')
  const trocas = arquivo ? TROCAS[arquivo] : [...TROCAS.client, ...TROCAS.route]
  const acrescimos = arquivo ? ACRESCIMOS[arquivo] : [...ACRESCIMOS.client, ...ACRESCIMOS.route]
  if (!trocas || !acrescimos) throw new Error('desfaz-motor-15s-1510: arquivo desconhecido: ' + arquivo)
  const usadas = new Set()
  const out = []
  let marcadas = 0
  for (const l of texto.split('\n')) {
    if (!l.includes(MARCA_MOTOR_15S_1510)) { out.push(l); continue }
    marcadas++
    const t = trocas.findIndex(([novo]) => l.startsWith(novo))
    if (t >= 0) {
      if (usadas.has('t' + t)) throw new Error('desfaz-motor-15s-1510: troca repetida: ' + l.slice(0, 120))
      usadas.add('t' + t)
      out.push(trocas[t][1])
      continue
    }
    const a = acrescimos.findIndex((p) => l.startsWith(p))
    if (a >= 0) {
      if (usadas.has('a' + a)) throw new Error('desfaz-motor-15s-1510: acréscimo repetido: ' + l.slice(0, 120))
      usadas.add('a' + a)
      continue
    }
    throw new Error('desfaz-motor-15s-1510: linha marcada inesperada: ' + l.slice(0, 120))
  }
  if (arquivo && marcadas > 0 && usadas.size !== trocas.length + acrescimos.length) {
    throw new Error(`desfaz-motor-15s-1510: forma inesperada em ${arquivo} (${usadas.size} de ${trocas.length + acrescimos.length} entradas)`)
  }
  return out.join('\n')
}
