// KINEO-MOTOR-EM-MANUTENCAO-2026-09-15 — decisão do fundador (15/09, noite): MiniMax H3, Omni Flash e
// Seedance 2.5 pausados para novas gerações; Kineo 1, Kling 2.5 e Kling 3 mantidos; Seedance 1.5 e Veo 3.1
// em prova. Este guardião prova: (a) o interruptor único; (b) o servidor recusa ANTES de qualquer débito e
// deixa o ensaio de $0 interno passar; (c) as duas telas de escolha não deixam apertar o motor pausado;
// (d) as superfícies públicas (FAQ/schema, nav, tabela de preços, llms.txt, pricing, calculadora, páginas
// de motor) param de vender o que está pausado; (e) nada foi apagado (custos e páginas continuam).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp }

console.log('== (a) interruptor único, executado ==')
const launchSrc = rd('lib/engineLaunch.ts').replace(/import \{ isInternalEmail \} from '@\/lib\/internalAccounts'\n/, '')
const L = roda(launchSrc, { isInternalEmail: (e) => /@usekineo\.com$|josephsskaf/.test(String(e ?? '')) })
// REANCORADO KINEO-S25-ABRE-2026-10-06 — o Seedance 2.5 saiu da manutenção (aposta A do fundador, 06/10: 3 filmes de teste
// pelo critério do H3) e voltou SÓ para quem paga — o portão pago é provado em scripts/test-s25-abre-2026-10-06.mjs. A
// vigilância desta trava segue a mesma para quem continua pausado: o Omni (pausado, recusado antes do débito) e os ativos.
checa('omni pausado; os cinco da oferta + H3 (de volta em 22/09) + Seedance 2.5 (de volta em 06/10, só plano pago) ativos', ['omni'].every((k) => L.enginePaused(k)) && ['fast', 'seedance', 'kling', 'veo', 'hollywood', 'avatar', 'h3', 's25', '', undefined, null].every((k) => !L.enginePaused(k)))
checa('cada pausa tem data, rótulo, mensagem com "paused for maintenance", "Nothing was charged" e alternativa ativa', L.PAUSED_ENGINE_KEYS.length >= 1 && L.PAUSED_ENGINE_KEYS.every((k) => { const p = L.enginePaused(k); return p && p.since === '2026-09-15' && /paused for maintenance/.test(p.message) && /Nothing was charged/.test(p.message) && ['hollywood', 'kling'].includes(p.alternative.key) && !L.enginePaused(p.alternative.key) }))
checa('qualityPaused espelha pela quality do biller', !L.qualityPaused('cinematic_h3') && L.qualityPaused('cinematic_omni') && !L.qualityPaused('cinematic_s25') && !L.qualityPaused('cinematic_hollywood') && !L.qualityPaused('cinematic_kling') && !L.qualityPaused('cinematic_veo') && !L.qualityPaused('cinematic_ai') && !L.qualityPaused('fast'))
// KINEO-AVATAR-FORA-2026-09-28 — re-ancorada: exigia 'Seven' e a lista terminando em 'Avatar'. O fundador tirou o
// Avatar do catálogo público em 27/09 ("avatar sai por hora"): com AVATAR_PUBLIC=false a contagem é 'Six' e a lista
// termina em 'Kineo 1'. A intenção original (contagem/lista só com o que o público pode apertar) segue a mesma;
// o guardião test-avatar-fora-2026-09-28.mjs prova que virar o interruptor devolve 'Seven' e o Avatar.
// Reancorado 29/09 (KINEO-KINEO1-FORA-2026-09-29): o Kineo 1 também saiu do catálogo público (KINEO1_PUBLIC=false) —
// "Five" e a lista termina em 'Seedance 1.5'. A intenção (só o que o público pode apertar, sem Omni/S25) é a mesma.
// REANCORADO KINEO-S25-ABRE-2026-10-06 — Six: o Seedance 2.5 voltou ao catálogo público marcado "(paid plans)" (o servidor
// só o roda para plano pago) e a frase de pausa nomeia SÓ o Omni. A intenção é a mesma: só o que o público pode ver e
// apertar, sem o pausado, e o que exige plano dito na própria lista.
checa('contagem e lista públicas só com os disponíveis (Six: H3 de volta, Seedance 2.5 de volta só plano pago, sem Omni, Avatar e Kineo 1 fora do catálogo) e a frase de pausa nomeia só o Omni', L.AVATAR_PUBLIC === false && L.KINEO1_PUBLIC === false && L.VIDEO_ENGINE_COUNT_WORD === 'Six' && L.VIDEO_ENGINE_COUNT_SENTENCE_START === 'Six' && !/Omni|Avatar|Kineo 1/.test(L.VIDEO_ENGINE_LIST_COPY) && /^Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5 and Seedance 2.5 \(paid plans\)$/.test(L.VIDEO_ENGINE_LIST_COPY) && /^Omni Flash is temporarily paused/.test(L.PAUSED_ENGINES_COPY) && !/Seedance 2\.5/.test(L.PAUSED_ENGINES_COPY) && /nothing is charged/i.test(L.PAUSED_ENGINES_COPY)) // KINEO-H3-DE-VOLTA-2026-09-22 · KINEO-AVATAR-FORA-2026-09-28 · KINEO-S25-ABRE-2026-10-06
checa('S25 público (S25_PUBLIC=true, 06/10) — e o servidor só o roda para quem paga (lib/s25Access.ts) — nada foi apagado', L.S25_PUBLIC === true && rd('app/api/generate-video-cinematic/route.ts').includes("import { s25AccessFor } from '@/lib/s25Access'"))

console.log('== (b) servidor: recusa antes do débito, ensaio interno passa ==')
const rc = rd('app/api/generate-video-cinematic/route.ts')
const iGate = rc.indexOf('const pausa = enginePaused(body.engine)')
const iCost = rc.indexOf('const cost = creditCostForDuration(costQuality, true, duration)')
const iAuth = rc.indexOf("if (body.dry_run === true && !isDryRunAccount(user.email)) {")
checa('gate existe, importa do interruptor único, e vem DEPOIS da auth/dry-run e ANTES do primeiro custo de crédito', iGate > 0 && iCost > iGate && iAuth > 0 && iGate > iAuth && rc.includes("import { S25_PUBLIC, enginePaused } from '@/lib/engineLaunch'"))
checa('gate: 423 com reason engine_paused, mensagem, alternativa, charged:false; evento engine_paused_refused; ensaio de conta interna passa', rc.includes("return NextResponse.json({ error: pausa.message, reason: 'engine_paused', engine: body.engine, alternative: pausa.alternative, retryable: false, charged: false, refunded: false }, { status: 423 })") && rc.includes("name: 'engine_paused_refused'") && rc.includes("if (pausa && !isDryRunAccount(user.email)) {"))
checa('KINEO-MANUTENCAO-INTERNA: conta interna passa também no render real (log nomeado), e a decisão continua amarrada a isDryRunAccount — quem não é interno recebe o 423', rc.includes("if (pausa && isDryRunAccount(user.email) && body.dry_run !== true) console.log(`[cinematic] KINEO-MANUTENCAO-INTERNA:") && rc.indexOf("if (pausa && !isDryRunAccount(user.email)) {") < rc.indexOf("reason: 'engine_paused'") && !rc.includes("if (pausa && !(body.dry_run === true && isDryRunAccount(user.email))) {"))
{
  // executa a decisão do gate com a função real
  const decide = (engine, dryRun, email) => { const pausa = L.enginePaused(engine); return Boolean(pausa && !(dryRun === true && /josephsskaf/.test(email))) }
  // REANCORADO KINEO-S25-ABRE-2026-10-06: o caso "ensaio de cliente recusa" passa a ser no Omni (o s25 saiu da pausa; a
  // recusa dele para quem não paga é o portão pago, provado em scripts/test-s25-abre-2026-10-06.mjs).
  checa('decisão: omni real (qualquer conta) recusa; omni ensaio interno passa; kling real passa; omni ensaio de cliente recusa; s25 não é mais pausa', decide('omni', false, 'josephsskaf@gmail.com') && !decide('omni', true, 'josephsskaf@gmail.com') && !decide('kling', false, 'x@y.z') && decide('omni', true, 'cliente@x.z') && !decide('s25', false, 'cliente@x.z') && !decide('h3', false, 'cliente@x.z')) // KINEO-H3-DE-VOLTA-2026-09-22: h3 real de cliente passa
}
checa('recuperação preservada: retry-hollywood-scene, cinematic-clip-status, compose e cron não ganharam gate', !rd('app/api/retry-hollywood-scene/route.ts').includes('enginePaused') && !rd('app/api/cinematic-clip-status/route.ts').includes('enginePaused') && !rd('app/api/compose/route.ts').includes('enginePaused') && !rd('app/api/cron/finish-stranded-renders/route.ts').includes('enginePaused'))
checa('custos continuam no biller (nada apagado)', /case 'cinematic_h3'/.test(rd('lib/credits/engineCost.ts')) && /case 'cinematic_omni'/.test(rd('lib/credits/engineCost.ts')) && /case 'cinematic_s25'/.test(rd('lib/credits/engineCost.ts')))

console.log('== (c) telas de escolha ==')
const st = rd('app/(dashboard)/studio/StudioClient.tsx')
// KINEO-AVATAR-FORA-2026-09-28 — re-ancorada: o import do StudioClient ganhou AVATAR_PUBLIC ao lado de enginePaused;
// a exigência continua a mesma (enginePaused vem do interruptor único).
checa('Studio: card pausado desabilitado, com "Maintenance" e a alternativa; ?engine= pausado não é honrado; H3/Omni/S25 continuam no catálogo', /import \{ enginePaused(, [A-Za-z0-9_]+)* \} from '@\/lib\/engineLaunch'/.test(st) /* reancorado 29/09 (E2b): SEEDANCE_15S_PUBLIC tem dígitos */ && st.includes('disabled={Boolean(pausa)} aria-disabled={Boolean(pausa)} title={pausa ? pausa.message : undefined}') && st.includes('<UiLabel>Maintenance</UiLabel>') && st.includes('Temporarily paused for maintenance · use ${pausa.alternative.label} meanwhile') && st.includes("&& !ENGINES.find((x) => x.key === e)?.paused) setEngine(e as EngineKey)") && st.includes("{ key: 'omni', paused: Boolean(enginePaused('omni')),") && /key: 'h3'/.test(st) && /key: 'omni'/.test(st) && /key: 's25'/.test(st))
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('Generate: chip pausado desabilitado com "Maintenance" e alternativa; ?engine= pausado ignorado nos dois pontos', gc.includes("import { enginePaused } from '@/lib/engineLaunch'") && gc.includes('const pausa = enginePaused(m.key)') && gc.includes("{m.label}{pausa ? ' · Maintenance' : ''}") && gc.includes('Temporarily paused · use ${pausa.alternative.label} meanwhile') && gc.includes("      if (enginePaused(engine) && searchParams.get('maint') !== '1') return") && gc.includes("].includes(urlEnginePick) && (!enginePaused(urlEnginePick) || searchParams?.get('maint') === '1')"))
checa('Generate: sem &maint=1 o ?engine= pausado continua caindo no padrão (o bypass é opt-in e o servidor decide quem renderiza)', gc.includes("if (enginePaused(engine) && searchParams.get('maint') !== '1') return // KINEO-MANUTENCAO-INTERNA"))
checa('Generate: a recusa 423 chega à tela pelo ramo genérico (data.error) — o texto do servidor já traz a alternativa', gc.includes("setError(typeof data?.error === 'string' ? data.error : GENERIC_ERROR)"))

console.log('== (d) superfícies públicas ==')
const land = rd('app/KineoLanding.tsx')
checa('landing: FAQ lê a lista/pausa do interruptor; nav não mostra Omni nem H3 enquanto pausados', land.includes('<UiLabel>{VIDEO_ENGINE_LIST_COPY}</UiLabel><UiLabel>. </UiLabel><UiLabel>{PAUSED_ENGINES_COPY}</UiLabel><UiLabel> You choose the engine per video,') && land.includes("{!enginePaused('omni') && <NavEngineItem href=\"/studio?engine=omni") && land.includes("{!enginePaused('h3') && <NavEngineItem href=\"/studio?engine=h3") && !/Omni Flash \(Google’s #1-ranked video model, Aug 2026\), Veo 3\.1, Kling 3, MiniMax H3/.test(land))
const sd = rd('components/StructuredData.tsx')
checa('schema/FAQ: nenhuma lista fixa com H3/Omni; usa a lista e a frase de pausa', !/MiniMax H3/.test(sd) && !/Omni Flash/.test(sd) && (sd.match(/PAUSED_ENGINES_COPY/g) || []).length >= 2)
const mp = rd('app/models-pricing/page.tsx')
checa('tabela de preços: linhas pausadas filtradas (qualityPaused) e a nota de pausa visível; linhas continuam no catálogo', mp.includes('{ROWS.filter((r) => !qualityPaused(r.quality)).map((r) => {') && mp.includes('{PAUSED_ENGINES_COPY}') && /key: 'omni'/.test(mp) && /key: 'h3'/.test(mp))
// 16/09: o llms.txt passou a ser GERADO do interruptor único (Codex 7c6adc82) — a frase fixa saiu; a prova é o laço sobre PAUSED_ENGINE_KEYS e a frase por motor.
{
  const ll = rd('app/llms.txt/route.ts')
  const fixo = /MiniMax H3, Omni Flash and Seedance 2\.5 are temporarily paused for maintenance since 15 September 2026/.test(ll)
  const gerado = ll.includes('PAUSED_ENGINE_KEYS.map((key) => ENGINE_PAUSE[key])') && /temporarily paused for new films since \$\{pause\.since\}/.test(ll) && /does not remove this maintenance pause/.test(ll)
  checa('llms.txt: diz quem está pausado (gerado do interruptor único) e que plano/crédito não destrava', fixo || gerado)
}
const pc = rd('app/pricing/PricingClient.tsx')
// KINEO-AVATAR-FORA-2026-09-28 — re-ancorada: o resultado do Studio terminava em ', Avatar' fixo; agora ', Avatar' só
// entra com AVATAR_PUBLIC=true (Avatar fora do catálogo público desde 27/09). Omni continua fora da frase.
// KINEO-FILME-GRATIS-15S-2026-09-29 — reancorado com motivo: o Kineo 1 saiu do resultado do Studio (fora do catálogo
// público; trava (j) da E1 exige /pricing sem "Kineo 1"). O resto da trava (H3/Omni/flagship) segue igual.
checa('pricing: Studio não promete H3/Omni; linha do H3 fora do calculador; flagship = Kling 3', pc.includes("outcome: `Every available engine — Kling 3, Veo 3.1, Kling 2.5, MiniMax H3, Seedance 1.5${AVATAR_PUBLIC ? ', Avatar' : ''} — plus") && !pc.includes("name: 'MiniMax H3 films · lip-sync'") && pc.includes("{ ic: '🏆', name: 'Kling 3 films · native voice & lip sync', cost: costFlag }") && pc.includes('lip sync (Kling 3)</span>'))
const calc = rd('app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx')
checa('calculadora: sem H3 e sem Omni', !/cinematic_h3/.test(calc) && !/cinematic_omni/.test(calc))
const ep = rd('app/ai-video-generator/[engine]/page.tsx')
checa('páginas de motor continuam no ar com aviso de manutenção e link para a alternativa', ep.includes("import { enginePaused } from '@/lib/engineLaunch'") && ep.includes('{enginePaused(e.param) && (') && ep.includes('<strong>Temporarily paused for maintenance.</strong>') && ep.includes('intent_campaign=engine_paused'))
checa('preço público, créditos dos planos e trial não mudaram (interruptores da restauração intactos)', /TRIAL_CREDIT_CAP\s*=\s*10/.test(rd('lib/reverseTrial.ts')) /* KINEO-TRIAL-10 (fundador 16/09) */ && /CARD_ENTRY_ONLY\s*=\s*false/.test(rd('lib/entryPolicy.ts')))

console.log(`${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
