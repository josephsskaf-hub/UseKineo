// KINEO-H3-TURBO-ABRE-0511 — guardião: o filme padrão aberto a todos com o nome do motor real.
// Fundador 05/11: "pode abrir para os clientes". Selo por filme, nome nas telas de venda, e o que NÃO podia mudar (filme grátis, desenho, chave, preço).
// Rodar: node scripts/test-h3-turbo-abre-0511.mjs
import fs from 'node:fs'
import ts from 'typescript'
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const N = 'MiniMax H3 Turbo'
const M = 'minimax/h3-max-turbo/image-to-video'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const carrega = async (fonte) => {
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
}

// ── o selo, executado ───────────────────────────────────────────────────────────────────────────────────────
const fonteSelo = lf('lib/engineLabel.ts')
const selo = await carrega(fonteSelo)
const claim = (over = {}) => ({ quality: 'cinematic_ai', falModels: [M, M, 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'], response: { duration: 60 }, ...over })
const seloCerto = (s) => s.engineUsedDoFilmePadrao(claim()) === 'h3_max_turbo'
  && s.engineUsedDoFilmePadrao(claim({ falModels: ['fal-ai/bytedance/seedance/v1.5/pro/image-to-video'] })) === null
  && s.engineUsedDoFilmePadrao(claim({ response: { kling4_trial: { version: 'kling4_trial_2810' } } })) === null
  && s.engineUsedDoFilmePadrao(claim({ response: { kling4_paid: { version: 'kling4_paid_2810' } } })) === null
  && s.engineUsedDoFilmePadrao(claim({ quality: 'cinematic_h3' })) === null
  && s.engineUsedDoFilmePadrao(null) === null
ok(seloCerto(selo), 'o modelo do claim decide: Turbo grava h3_max_turbo; Seedance, filme grátis, Kling 4 e outro motor não')
const mutante = await carrega(fonteSelo.replace("claim.falModels.includes(H3_TURBO_FAL_MODEL) || claim.falModels.includes(H3_TURBO_T2V_FAL_MODEL) /* KINEO-SEEDANCE-SAI-1111 */ ? 'h3_max_turbo' : null", "'h3_max_turbo'")) // KINEO-SEEDANCE-SAI-1111: a linha ganhou o t2v
ok(!seloCerto(mutante), 'mutante: selo sem olhar o modelo fica vermelho')
const mutante2 = await carrega(fonteSelo.replace('if (claim.response?.kling4_paid || claim.response?.kling4_trial) return null', ''))
ok(!seloCerto(mutante2), 'mutante: Kling 4 ganhando o selo do Turbo fica vermelho')
ok(selo.engineLabelFor('cinematic_ai', 'h3_max_turbo') === N, 'filme novo: selo ' + N)
ok(selo.engineLabelFor('cinematic_ai', null) === 'Seedance 1.5', 'filme antigo (sem engine_used): segue Seedance 1.5, sem migrar dado')
ok(selo.engineLabelFor('cinematic_ai', 'seedance15_fallback') === 'Seedance 1.5', 'reserva do filme grátis: segue Seedance 1.5')

// ── a gravação ──────────────────────────────────────────────────────────────────────────────────────────────
const St = lf('app/api/compose/status/[renderId]/route.ts')
ok(St.includes("...(engineUsedDoFilmePadrao(prepaidCinematicClaim) ? { engineUsed: 'h3_max_turbo' as const } : {})"), 'o filme entregue grava engine_used pelo claim assinado')
ok(St.includes("if (!engine) return engineUsedDoFilmePadrao(prepaidCinematicClaim) ? { engine_used: 'h3_max_turbo' } : {}"), 'a tela de filme pronto recebe o mesmo motor')
ok(lf('lib/freeRedo/filmServer.ts').includes("engine_used === 'h3_max_turbo') row.engine_used = 'h3_max_turbo'"), 'a versão refeita não volta para o selo Seedance')
const Rx = lf('lib/remixPaginas3110.ts')
ok(Rx.includes("e === 'h3_max_turbo') return 'seedance'") && Rx.includes(`e === 'h3_max_turbo') return '${N}'`), 'a página pública e o remix conhecem o motor; a chave segue seedance')

// ── o interruptor e o que não muda ──────────────────────────────────────────────────────────────────────────
const E = lf('lib/engineLaunch.ts'), R = lf('app/api/generate-video-cinematic/route.ts')
ok(E.includes('export const H3_TURBO_PUBLIC = true as boolean'), 'aberto para todos')
const escolha = 'const i2vDoFilmePadrao = H3_TURBO_I2V_MODEL // KINEO-SEEDANCE-SAI-1111' // KINEO-SEEDANCE-SAI-1111: o Seedance 1.5 sai da fal em 11/11 — o desenho infantil também vai ao H3 Turbo
const guarda = (t) => t.includes(escolha)
ok(guarda(R), 'KINEO-SEEDANCE-SAI-1111: filme grátis fora do Kling 4 e desenho infantil vão de H3 Turbo (o Seedance 1.5 sai da fal)')
ok(!guarda(R.replace('const i2vDoFilmePadrao = H3_TURBO_I2V_MODEL //', 'const i2vDoFilmePadrao = !desenhoInfantil.ativo ? H3_TURBO_I2V_MODEL : SEEDANCE_I2V_MODEL //')), 'mutante: desenho infantil de volta ao Seedance fica vermelho')
ok(R.includes(": model === SEEDANCE_MODEL ? i2vDoFilmePadrao /* KINEO-H3-TURBO-0511 */ : model === VEO_MODEL ? VEO_I2V_MODEL : model, t2vVivo]") && R.includes('const t2vVivo = model === SEEDANCE_MODEL ? H3_TURBO_T2V_MODEL : model'), 'KINEO-SEEDANCE-SAI-1111: a 2ª tentativa de texto vai ao H3 Turbo t2v')
ok(lf('lib/engineLabel.ts').includes("cinematic_ai: 'Seedance 1.5'"), 'quality_mode cinematic_ai segue com o selo antigo: é o que protege os filmes de antes')
ok(lf('lib/freeFilmEngine.ts').includes("KLING4_TRIAL_LIVE ? 'Kling 4.0 / Seedance 1.5' : 'Seedance 1.5'"), 'o nome do filme grátis não muda')
ok(lf('lib/ui/refinementCopy.json').includes('so this one was made with Seedance 1.5'), 'o aviso da reserva do filme grátis não muda: o motor ali é mesmo o Seedance')

// ── o nome nas telas ────────────────────────────────────────────────────────────────────────────────────────
const L = lf('app/KineoLanding.tsx')
const menu = (t) => t.includes(`<NavEngineItem href="/studio?engine=seedance&intent_campaign=nav_mega" name="${N}" desc="Fast, everyday narrated films" preview="/previews/galeria/adeus-2026.mp4" thumb="/posters/galeria/adeus-2026.webp" />`) && !t.includes('name="Seedance 1.5"')
ok(menu(L), 'menu do topo: o nome real, a mesma chave, sem clipe de outro motor')
ok(!menu(L.replace(`name="${N}" desc="Fast`, 'name="Seedance 1.5" desc="Fast')), 'mutante: o nome velho no menu fica vermelho')
ok(L.includes('name="Seedance 2.5"'), 'o Seedance 2.5 fica no menu')
const S = lf('app/(dashboard)/studio/StudioClient.tsx')
ok(S.includes(`{ key: 'seedance', preview: '/previews/galeria/adeus-2026.mp4', icon: 'H3T', name: '${N}'`) && S.includes("res: '768p'"), 'card do Studio: nome e resolução do motor real')
ok(S.includes("videos={scriptMode !== 'clip' && engine === 'seedance' ? []"), 'palco do Studio: filme de Seedance não leva o nome do Turbo')
ok(S.includes("bestFilms.filter((f) => f.engine !== 'seedance')"), 'vitrine do Studio: "use o motor dele" não aponta filme de Seedance para o Turbo')
ok(S.includes("name={scriptMode === 'clip' ? 'Seedance 1.5'"), 'o modo Clipe segue no Seedance 1.5')
const G = lf('app/(dashboard)/generate/GenerateClient.tsx')
ok(!/5\.9 min|5\.9 minutes|within 16\.2/.test(G), 'a mediana medida era do Seedance: não vira número do Turbo')
ok(G.includes(`'Great-quality AI visuals (${N})'`), '/generate com o nome real')
for (const [f, t] of [['app/pricing/PricingClient.tsx', `name: '${N} films'`], ['components/PricingCards.tsx', `${N} AI films/month (60 s)`], ['app/models-pricing/page.tsx', `key: 'seedance', name: '${N}'`], ['lib/kineoFacts.ts', `name: '${N}'`], ['lib/durationByEngine.ts', `return '${N}'`], ['lib/credits/creditMinutes.ts', `label: '${N}'`]]) ok(lf(f).includes(t), f + ' com o nome real')
ok(!lf('app/models-pricing/page.tsx').includes("key: 'seedance', name: 'Seedance 1.5'"), 'a tabela de preços não vende o nome velho')
ok(!/\bSeedance 1\.5\b/.test(lf('lib/estrelaCopy.ts')), 'estrela do filme: nome real nas 16 línguas')
ok(lf('app/facts/page.tsx').includes(`const SEEDANCE = engine('${N}')`), '/facts busca pelo nome de ENGINE_FACTS: nome velho aqui derruba o build, e o tsc não vê')
ok(lf('lib/growth/paidVideoCitationGuidance.ts').includes(`const destinations = ['${N}', 'MiniMax H3',`), 'a resposta a quem pergunta o que comprar segue achando o motor')
ok(lf('lib/gptHandoff.ts').includes("  seedance: 'Seedance 1.5',\n"), 'o contrato do conector fica byte a byte igual ao enviado à OpenAI')
ok(lf('app/go/[token]/page.tsx').includes(`engine === 'seedance' ? '${N}' : ENGINE_LABELS[engine]`), 'a tela do link do conector diz o motor real')

// ── preço ───────────────────────────────────────────────────────────────────────────────────────────────────
ok(St.includes('creditsUsed: free15GateFailure ? 0 : cost'), 'a cobrança não muda de lugar')
ok(!fs.existsSync('lib/pricing'), 'nenhuma pasta lib/pricing nova')
console.log('\n' + pass + ' ok, ' + fail + ' falha(s)')
process.exit(fail ? 1 : 0)
