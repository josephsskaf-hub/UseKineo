// KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"] — DESFAZ, em memória, a entrega "filme mais
// rápido" para os guardiões que conferem rotas e telas BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o
// nome não começa com test-).
//
// Nas rotas e telas protegidas (o /api/compose, a rota do cinematic e o GenerateClient) a entrega só ACRESCENTA linhas, e
// toda linha nova carrega a marca KINEO-FILME-RAPIDO-1710 (inclusive os imports, em linha própria). Duas formas, e só elas:
//   · ACRÉSCIMO — linha nova com a marca: sai inteira;
//   · TROCA — a linha da base foi reescrita (só onde não há outro jeito; listadas abaixo, reconhecidas INTEIRAS): volta a
//     ser a da base.
// Linha com a marca que não é acréscimo puro nem troca listada não existe por construção (o guardião
// scripts/test-filme-rapido-1710.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE o pai do 1º commit da entrega).
import { MARCA_META95_IDEIA_1910 } from './desfaz-meta95-ideia-1910.mjs' // KINEO-META95-IDEIA-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]: linhaDoFilmeRapido1710 aceita a marca da camada mais nova da rota do cinematic (o desfaz dela é encadeado em semMeta95Assunto1910)
import { semMeta95Assunto1910 } from './desfaz-meta95-assunto-1910.mjs' // KINEO-META95-ASSUNTO-1910 — a camada do assunto traduzido (19/10) veio depois: sai PRIMEIRO (encadeado)
export const MARCA_FILME_RAPIDO_1710 = 'KINEO-FILME-RAPIDO-1710'

/** Arquivos protegidos que a entrega toca (só acréscimos marcados + as trocas listadas). */
export const ARQUIVOS_PROTEGIDOS_FILME_RAPIDO_1710 = [
  "app/(dashboard)/ads/v2/AdsV2Client.tsx",
  "app/(dashboard)/clips/ClipsClient.tsx",
  "app/(dashboard)/generate/GenerateClient.tsx",
  "app/api/compose/route.ts",
  "app/api/cron/finish-stranded-renders/route.ts",
  "app/api/generate-video-cinematic/route.ts",
  "lib/clips/clipServer.ts",
  "scripts/test-ads-fiel-4-1510.mjs",
  "scripts/test-ads-fiel-5-1510.mjs",
  "scripts/test-ads-fiel-6-1610.mjs",
  "scripts/test-ads-fiel-7-1610.mjs",
  "scripts/test-ads-fiel-liga-1510.mjs",
  "scripts/test-ads-lista-1510.mjs",
  "scripts/test-ads-mao-ajuste-3-1610.mjs",
  "scripts/test-ads-mao-juiz-1610.mjs",
  "scripts/test-ads-marcas-1510.mjs",
  "scripts/test-ads-modo-simples-2026-09-29.mjs",
  "scripts/test-ads-palco-voltar-1410.mjs",
  "scripts/test-ads-pos-entrega-1510.mjs",
  "scripts/test-ads-produto-na-mao-1610.mjs",
  "scripts/test-ads-produto-na-mao-ajuste-1610.mjs",
  "scripts/test-ads-refacao-ator-1410.mjs",
  "scripts/test-ads-v2-tela-2026-09-28.mjs",
  "scripts/test-ancora-legenda-1410.mjs",
  "scripts/test-apresentador-v2-1710.mjs",
  "scripts/test-apresentador-v2-ajuste-1710.mjs",
  "scripts/test-apresentador-v2-ajuste-3-1710.mjs",
  "scripts/test-cartao-recusado-1510.mjs",
  "scripts/test-cena-negacao-1510.mjs",
  "scripts/test-contrato-classicos-1410.mjs",
  "scripts/test-estrela-sobretaxa-assinada-2026-10-01.mjs",
  "scripts/test-gancho-1q-2026-10-03.mjs",
  "scripts/test-juiz-grade-1610.mjs",
  "scripts/test-juiz-still-1410.mjs",
  "scripts/test-moderacao-1410.mjs",
  "scripts/test-motor-15s-1510.mjs",
  "scripts/test-music-direction-2026-09-11.mjs",
  "scripts/test-parceiro-eyebible-1410.mjs",
  "scripts/test-parceiro-eyebible-2-1410.mjs",
  "scripts/test-reconexao-mesmo-filme-2026-10-13.mjs",
  "scripts/test-resgate-rapido-2026-09-19.mjs",
  "scripts/test-retentar-cena-1410.mjs",
  "scripts/test-sem-legenda-2026-10-06.mjs",
  "scripts/test-studio-fantasma-1510.mjs",
  "scripts/test-trilha-15s-1610.mjs",
  "scripts/test-veo-marcado-2026-09-29.mjs",
  "scripts/test-veo-modo-ia-2026-09-29.mjs"
]

/** [linha nova (inteira), linha da base] por arquivo — gerado do diff da entrega (linha nova com "era:" ↔ linha da base). */
export const TROCAS_FILME_RAPIDO_1710 = {
  "app/(dashboard)/ads/v2/AdsV2Client.tsx": [
    [
      "      schedulePoll(v.order_id, intervaloDePoll(pollDesdeRef.current.t, Date.now(), POLL_RAPIDO_ADS_MS, POLL_MS)) // KINEO-FILME-RAPIDO-1710 · polling — era: schedulePoll(v.order_id, POLL_MS)",
      "      schedulePoll(v.order_id, POLL_MS)"
    ]
  ],
  "app/(dashboard)/clips/ClipsClient.tsx": [
    [
      "    const perguntar = () => { // KINEO-FILME-RAPIDO-1710 · polling — era: const timer = window.setInterval(() => {",
      "    const timer = window.setInterval(() => {"
    ],
    [
      "      timer = window.setTimeout(perguntar, intervaloDePoll(desde, Date.now(), POLL_RAPIDO_ADS_MS, 6000)) // KINEO-FILME-RAPIDO-1710 · polling — era: }, 6000)",
      "    }, 6000)"
    ],
    [
      "    return () => window.clearTimeout(timer) // KINEO-FILME-RAPIDO-1710 · polling — era: window.clearInterval(timer)",
      "    return () => window.clearInterval(timer)"
    ]
  ],
  "app/(dashboard)/generate/GenerateClient.tsx": [
    [
      "        scheduleNextPoll(intervaloDePoll(pollStartedAt, Date.now(), POLL_RAPIDO_FILME_MS, 6000)) // KINEO-FILME-RAPIDO-1710 · polling — era: scheduleNextPoll(6000)",
      "        scheduleNextPoll(6000)"
    ],
    [
      "    pollTimerRef.current = setTimeout(pollFal, POLL_RAPIDO_FILME_MS) // KINEO-FILME-RAPIDO-1710 · polling — era: setTimeout(pollFal, 4000)",
      "    pollTimerRef.current = setTimeout(pollFal, 4000)"
    ],
    [
      "        scheduleNextComposePoll(intervaloDePoll(pollStartedAt, Date.now(), POLL_RAPIDO_FILME_MS, POLL_COMPOSING_MS)) // KINEO-FILME-RAPIDO-1710 · polling — era: scheduleNextComposePoll(POLL_COMPOSING_MS)",
      "        scheduleNextComposePoll(POLL_COMPOSING_MS)"
    ]
  ],
  "app/api/compose/route.ts": [],
  "app/api/cron/finish-stranded-renders/route.ts": [
    [
      "async function rodadaDoResgate(req: NextRequest): Promise<NextResponse> { // KINEO-FILME-RAPIDO-1710 — era: export async function GET(req: NextRequest) {",
      "export async function GET(req: NextRequest) {"
    ],
    [
      "    const attemptCount = ownAttempts(genId) // KINEO-FILME-RAPIDO-1710 — 409 pendente (a aba montando) não gasta tentativa; era: attempts.get(genId) ?? 0",
      "    const attemptCount = attempts.get(genId) ?? 0"
    ]
  ],
  "app/api/generate-video-cinematic/route.ts": [],
  "lib/clips/clipServer.ts": [],
  "scripts/test-ads-fiel-4-1510.mjs": [
    [
      "const rd = (p) => semFiel5_1510(p, semFielLiga1510(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p))) // reancorado KINEO-ADS-FIEL-5-1510 — esta prova roda a trava da Fiel 4 (base fixa); a base no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => semFiel5_1510(p, semFielLiga1510(p, readFileSync(join(ROOT, p), 'utf8'))) // reancorado KINEO-ADS-FIEL-5-1510 — esta prova roda a trava da Fiel 4 (base fixa); a base no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-fiel-5-1510.mjs": [
    [
      "const rd = (p) => semFielLiga1510(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10: este guardião lê o texto SEM o liga (semFielLiga1510 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => semFielLiga1510(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10: este guardião lê o texto SEM o liga (semFielLiga1510 já devolve LF)"
    ]
  ],
  "scripts/test-ads-fiel-6-1610.mjs": [
    [
      "const rd = (p) => semFiel7_1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-FIEL-7-1610 — a fiel-7 veio depois (base sempre fixa, caixa-chute): este guardião lê o texto SEM ela (semFiel7_1610 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => semFiel7_1610(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-ADS-FIEL-7-1610 — a fiel-7 veio depois (base sempre fixa, caixa-chute): este guardião lê o texto SEM ela (semFiel7_1610 já devolve LF)"
    ]
  ],
  "scripts/test-ads-fiel-7-1610.mjs": [
    [
      "const rd = (p) => semProdutoNaMao1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-PRODUTO-NA-MAO-1610 — o produto-na-mão veio depois: este guardião lê o texto SEM ele (semProdutoNaMao1610 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => semProdutoNaMao1610(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-ADS-PRODUTO-NA-MAO-1610 — o produto-na-mão veio depois: este guardião lê o texto SEM ele (semProdutoNaMao1610 já devolve LF)"
    ]
  ],
  "scripts/test-ads-fiel-liga-1510.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-ads-lista-1510.mjs": [
    [
      "const read = (rel) => semFilmeRapido1710(semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync",
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-mao-ajuste-3-1610.mjs": [
    [
      "const rd = (p) => semMaoJuiz1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-MAO-JUIZ-1610 — o conserto do juiz veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-ads-mao-juiz-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => semMaoJuiz1610(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-ADS-MAO-JUIZ-1610 — o conserto do juiz veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-ads-mao-juiz-1610.mjs"
    ],
    [
      "    [F.tiers, F.engines, F.shotLists, F.contract, 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/ads/v2ProductInHandServer.ts', 'lib/ads/v2ProductLockServer.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts', 'lib/ttsFallback.ts', 'lib/ads/adV2Montage.ts', 'lib/compose.ts', 'app/api/compose/route.ts'].every((f) => base(f) === semFilmeRapido1710(rd(f), f) /* reancorado KINEO-FILME-RAPIDO-1710 */)",
      "    [F.tiers, F.engines, F.shotLists, F.contract, 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/ads/v2ProductInHandServer.ts', 'lib/ads/v2ProductLockServer.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts', 'lib/ttsFallback.ts', 'lib/ads/adV2Montage.ts', 'lib/compose.ts', 'app/api/compose/route.ts'].every((f) => base(f) === rd(f))"
    ]
  ],
  "scripts/test-ads-mao-juiz-1610.mjs": [
    [
      "const rd = (p) => desfazJuizGrade1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 (inclusive a reancoragem do guardião da 3ª rodada) sai antes */) // reancorado KINEO-JUIZ-GRADE-1610 — a grade do juiz (modelo/variante da calibração) veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-juiz-grade-1610.mjs",
      "const rd = (p) => desfazJuizGrade1610(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-JUIZ-GRADE-1610 — a grade do juiz (modelo/variante da calibração) veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-juiz-grade-1610.mjs"
    ],
    [
      "  ['lib/ttsFallback.ts', 'lib/compose.ts', 'lib/ads/adV2Montage.ts', 'app/api/compose/route.ts', 'lib/ads/speakable.ts'].every((f) => base(f) === semFilmeRapido1710(rd(f), f) /* reancorado KINEO-FILME-RAPIDO-1710 */)",
      "  ['lib/ttsFallback.ts', 'lib/compose.ts', 'lib/ads/adV2Montage.ts', 'app/api/compose/route.ts', 'lib/ads/speakable.ts'].every((f) => base(f) === rd(f))"
    ],
    [
      "    [F.tiers, F.shotLists, 'lib/ads/v2Engines.ts', 'lib/ads/v2Contract.ts', 'lib/ads/v2CopyFit.ts', 'lib/ads/v2PlanCore.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/ads/v2ProductInHandServer.ts', 'lib/ads/v2ProductLockServer.ts', 'lib/ads/v2Images.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts', 'lib/ttsFallback.ts', 'lib/ads/adV2Montage.ts', 'lib/compose.ts', 'app/api/compose/route.ts'].every((f) => base(f) === semFilmeRapido1710(rd(f), f) /* reancorado KINEO-FILME-RAPIDO-1710 */)",
      "    [F.tiers, F.shotLists, 'lib/ads/v2Engines.ts', 'lib/ads/v2Contract.ts', 'lib/ads/v2CopyFit.ts', 'lib/ads/v2PlanCore.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/ads/v2ProductInHandServer.ts', 'lib/ads/v2ProductLockServer.ts', 'lib/ads/v2Images.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts', 'lib/ttsFallback.ts', 'lib/ads/adV2Montage.ts', 'lib/compose.ts', 'app/api/compose/route.ts'].every((f) => base(f) === rd(f))"
    ]
  ],
  "scripts/test-ads-marcas-1510.mjs": [
    [
      "const read = (rel) => semFilmeRapido1710(semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória",
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-modo-simples-2026-09-29.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(semMarcas1510(p, semLinkTela1510(p, semLista1510(p, semFiel2_1510(p, semFiel3_1510(p, readFileSync(join(RAIZ, p), 'utf8')))))), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória",
      "const rd = (p) => semMarcas1510(p, semLinkTela1510(p, semLista1510(p, semFiel2_1510(p, semFiel3_1510(p, readFileSync(join(RAIZ, p), 'utf8')))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-palco-voltar-1410.mjs": [
    [
      "const read = (rel) => semFilmeRapido1710(semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória",
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-pos-entrega-1510.mjs": [
    [
      "const rd = (rel) => semFilmeRapido1710(lf(semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória",
      "const rd = (rel) => lf(semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-produto-na-mao-1610.mjs": [
    [
      "const rd = (p) => semMaoAjuste1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-MAO-AJUSTE-1610 — o ajuste veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-ads-produto-na-mao-ajuste-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => semMaoAjuste1610(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-ADS-MAO-AJUSTE-1610 — o ajuste veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-ads-produto-na-mao-ajuste-1610.mjs"
    ]
  ],
  "scripts/test-ads-produto-na-mao-ajuste-1610.mjs": [
    [
      "const rd = (p) => semMaoAjuste3_1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-MAO-AJUSTE-3-1610 — a 3ª rodada veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-ads-mao-ajuste-3-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => semMaoAjuste3_1610(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-ADS-MAO-AJUSTE-3-1610 — a 3ª rodada veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-ads-mao-ajuste-3-1610.mjs"
    ]
  ],
  "scripts/test-ads-refacao-ator-1410.mjs": [
    [
      "const rd = (rel) => semFilmeRapido1710(semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync",
      "const rd = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-v2-tela-2026-09-28.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(semMarcas1510(p, semLista1510(p, readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n'))), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos",
      "const rd = (p) => semMarcas1510(p, semLista1510(p, readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n'))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos"
    ]
  ],
  "scripts/test-ancora-legenda-1410.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, linhasTrocadasTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ]
  ],
  "scripts/test-apresentador-v2-1710.mjs": [
    [
      "const rd = (p) => desfazApresentadorV2Ajuste1710(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-1710 — o ajuste do apresentador v2 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-apresentador-v2-ajuste-1710.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => desfazApresentadorV2Ajuste1710(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-1710 — o ajuste do apresentador v2 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-apresentador-v2-ajuste-1710.mjs"
    ]
  ],
  "scripts/test-apresentador-v2-ajuste-1710.mjs": [
    [
      "const rd = (p) => desfazApresentadorV2Ajuste3_1710(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o ajuste 3 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste 3 é provado em scripts/test-apresentador-v2-ajuste-3-1710.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => desfazApresentadorV2Ajuste3_1710(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o ajuste 3 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste 3 é provado em scripts/test-apresentador-v2-ajuste-3-1710.mjs"
    ]
  ],
  "scripts/test-apresentador-v2-ajuste-3-1710.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') // o arquivo VIVO (esta é a camada mais nova) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */",
      "const rd = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\\r\\n/g, '\\n') // o arquivo VIVO (esta é a camada mais nova)"
    ]
  ],
  "scripts/test-cartao-recusado-1510.mjs": [
    [
      "    const clash = crons.filter((c) => c !== mine[0] && !DE_MINUTO.has(c.path) && slots(c.schedule).some((s) => minev.has(s))) // reancorado KINEO-FILME-RAPIDO-1710 — era: sem o filtro DE_MINUTO",
      "    const clash = crons.filter((c) => c !== mine[0] && slots(c.schedule).some((s) => minev.has(s)))"
    ]
  ],
  "scripts/test-cena-negacao-1510.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ]
  ],
  "scripts/test-contrato-classicos-1410.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, linhasTrocadasTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ]
  ],
  "scripts/test-estrela-sobretaxa-assinada-2026-10-01.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, linhasTrocadasTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ],
    [
      "  checa('E25 /api/compose sem as linhas marcadas = base, byte a byte', semMarca(desfazEscritorOmni('app/api/compose/route.ts', desfazH3max('app/api/compose/route.ts', desfazParceiroEyebible1410('app/api/compose/route.ts', semFilmeRapido1710(compose, 'app/api/compose/route.ts') /* reancorado KINEO-FILME-RAPIDO-1710 */)))).split('\\n').filter((l) => !l.includes('KINEO-GANCHO-1Q-2026-10-03') && !l.includes('KINEO-SEM-LEGENDA-2026-10-06')).join('\\n') === base('app/api/compose/route.ts'))",
      "  checa('E25 /api/compose sem as linhas marcadas = base, byte a byte', semMarca(desfazEscritorOmni('app/api/compose/route.ts', desfazH3max('app/api/compose/route.ts', desfazParceiroEyebible1410('app/api/compose/route.ts', compose)))).split('\\n').filter((l) => !l.includes('KINEO-GANCHO-1Q-2026-10-03') && !l.includes('KINEO-SEM-LEGENDA-2026-10-06')).join('\\n') === base('app/api/compose/route.ts'))"
    ]
  ],
  "scripts/test-gancho-1q-2026-10-03.mjs": [
    [
      "  ok(semBusiness(semMarca(desfazEscritorOmni(ROTA, desfazH3max(ROTA, desfazParceiroEyebible1410(ROTA, semFilmeRapido1710(rota, ROTA) /* reancorado KINEO-FILME-RAPIDO-1710 */)))).split('\\n').filter((l) => !l.includes('KINEO-SEM-LEGENDA-2026-10-06')).join('\\n')) === rdBase(ROTA), 'compose: fora das linhas marcadas, byte a byte a base')",
      "  ok(semBusiness(semMarca(desfazEscritorOmni(ROTA, desfazH3max(ROTA, desfazParceiroEyebible1410(ROTA, rota)))).split('\\n').filter((l) => !l.includes('KINEO-SEM-LEGENDA-2026-10-06')).join('\\n')) === rdBase(ROTA), 'compose: fora das linhas marcadas, byte a byte a base')"
    ]
  ],
  "scripts/test-juiz-grade-1610.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(desfazApresentadorV2_1710(p, readFileSync(join(ROOT, p), 'utf8')), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs",
      "const rd = (p) => desfazApresentadorV2_1710(p, readFileSync(join(ROOT, p), 'utf8')) // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs"
    ]
  ],
  "scripts/test-juiz-still-1410.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, linhasTrocadasTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ]
  ],
  "scripts/test-moderacao-1410.mjs": [
    [
      "const rd = (p) => semMarcas1510(p, semLista1510(p, semS25FotoClipes1610(p, semFilmeRapido1710(readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n'), p) /* reancorado KINEO-FILME-RAPIDO-1710 — a mais nova sai antes de tudo */))) // reancorado KINEO-S25-FOTO-CLIPES-1610 — o motivo da fal no clipServer (o mais novo) sai antes de tudo · reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos",
      "const rd = (p) => semMarcas1510(p, semLista1510(p, semS25FotoClipes1610(p, readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n')))) // reancorado KINEO-S25-FOTO-CLIPES-1610 — o motivo da fal no clipServer (o mais novo) sai antes de tudo · reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos"
    ]
  ],
  "scripts/test-motor-15s-1510.mjs": [
    [
      "  try { d = semMotor15s1510(arq === 'route' ? semRegua35a90_1410(semModeracao1410(atual, 'script')) : desfazParceiroEyebible2_1410(rel, desfazPaywallFilmePrimeiro1510(rel, desfazStudioFantasma1510(rel, semFilmeRapido1710(atual, rel) /* reancorado KINEO-FILME-RAPIDO-1710 */))), arq) } catch (e) { d = 'ERRO: ' + e.message } // reancorado KINEO-REGUA-35-60-90-1410 · reancorado KINEO-MODERACAO-1410 · reancorado KINEO-PAYWALL-FILME-PRIMEIRO-1510",
      "  try { d = semMotor15s1510(arq === 'route' ? semRegua35a90_1410(semModeracao1410(atual, 'script')) : desfazParceiroEyebible2_1410(rel, desfazPaywallFilmePrimeiro1510(rel, desfazStudioFantasma1510(rel, atual))), arq) } catch (e) { d = 'ERRO: ' + e.message } // reancorado KINEO-REGUA-35-60-90-1410 · reancorado KINEO-MODERACAO-1410 · reancorado KINEO-PAYWALL-FILME-PRIMEIRO-1510"
    ]
  ],
  "scripts/test-music-direction-2026-09-11.mjs": [
    [
      "    rawVoiceover: 'An unsolved mystery.', body: { topic: 'Music: none' }, vertical: 'history', audioDoClique: { musica: undefined }, /* reancorado KINEO-FILME-RAPIDO-1710: a trilha do clique (ausente aqui = o caminho de sempre) */",
      "    rawVoiceover: 'An unsolved mystery.', body: { topic: 'Music: none' }, vertical: 'history',"
    ],
    [
      "      body: { topic: script }, vertical: 'history', console: rt.context.console, audioDoClique: { musica: undefined }, /* reancorado KINEO-FILME-RAPIDO-1710 */",
      "      body: { topic: script }, vertical: 'history', console: rt.context.console,"
    ],
    [
      "    rawVoiceover: 'Um mistério inquietante.', body: { topic: 'Música: sem música' }, vertical: 'history', audioDoClique: { musica: undefined }, /* reancorado KINEO-FILME-RAPIDO-1710 */",
      "    rawVoiceover: 'Um mistério inquietante.', body: { topic: 'Música: sem música' }, vertical: 'history',"
    ],
    [
      "      body: { topic: script }, vertical: 'history', console: rt.context.console, audioDoClique: { musica: undefined }, /* reancorado KINEO-FILME-RAPIDO-1710 */",
      "      body: { topic: script }, vertical: 'history', console: rt.context.console,"
    ]
  ],
  "scripts/test-parceiro-eyebible-1410.mjs": [
    [
      "  try { desfeito = semParceiroEyebible1410(p, desfazParceiroEyebible2_1410(p, desfazAncoraEJuizStill1410(p, semFilmeRapido1710(atual, p) /* reancorado KINEO-FILME-RAPIDO-1710 */))) /* KINEO-ANCORA-LEGENDA-1410 */ } catch (e) { desfeito = `ERRO ${e.message}` }",
      "  try { desfeito = semParceiroEyebible1410(p, desfazParceiroEyebible2_1410(p, desfazAncoraEJuizStill1410(p, atual))) /* KINEO-ANCORA-LEGENDA-1410 */ } catch (e) { desfeito = `ERRO ${e.message}` }"
    ]
  ],
  "scripts/test-parceiro-eyebible-2-1410.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, linhasTrocadasTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ]
  ],
  "scripts/test-reconexao-mesmo-filme-2026-10-13.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, linhasTrocadasTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ]
  ],
  "scripts/test-resgate-rapido-2026-09-19.mjs": [
    [
      "checa('idade mínima 90 s (era 4 min; antes 12) e vida 90 s (era 3 min)', L.STRANDED_MIN_AGE_MS === 90 * 1000 && L.CLIENT_ALIVE_MS === 90 * 1000) // KINEO-FILME-RAPIDO-1710 — era: 4 * 60 * 1000 e 3 * 60 * 1000",
      "checa('idade mínima 4 min (era 12) e vida 3 min', L.STRANDED_MIN_AGE_MS === 4 * 60 * 1000 && L.CLIENT_ALIVE_MS === 3 * 60 * 1000)"
    ],
    [
      "checa('cron a cada 1 min (KINEO-FILME-RAPIDO-1710; era 5)', /\"path\": \"\\/api\\/cron\\/finish-stranded-renders\",\\s*\\n\\s*\"schedule\": \"\\* \\* \\* \\* \\*\"/.test(vj))",
      "checa('cron a cada 5 min', /\"path\": \"\\/api\\/cron\\/finish-stranded-renders\",\\s*\\n\\s*\"schedule\": \"\\*\\/5 \\* \\* \\* \\*\"/.test(vj))"
    ]
  ],
  "scripts/test-retentar-cena-1410.mjs": [
    [
      "  try { desfeito = semRetentarCena1410(semFilmeRapido1710(atual, f) /* reancorado KINEO-FILME-RAPIDO-1710 */, f) } catch (e) { console.log('  ' + e.message) }",
      "  try { desfeito = semRetentarCena1410(atual, f) } catch (e) { console.log('  ' + e.message) }"
    ]
  ],
  "scripts/test-sem-legenda-2026-10-06.mjs": [
    [
      "  return semMarca(desfazEscritorOmni(ROTA, desfazH3max(ROTA, desfazParceiroEyebible1410(ROTA, semFilmeRapido1710(rota, ROTA) /* reancorado KINEO-FILME-RAPIDO-1710 */)))) === rdBase(ROTA) ? [] : ['/api/compose: há linha nova ou alterada sem a marca ' + MARCA] // KINEO-H3MAX-2026-10-13 — reancorado (ver o import)",
      "  return semMarca(desfazEscritorOmni(ROTA, desfazH3max(ROTA, desfazParceiroEyebible1410(ROTA, rota)))) === rdBase(ROTA) ? [] : ['/api/compose: há linha nova ou alterada sem a marca ' + MARCA] // KINEO-H3MAX-2026-10-13 — reancorado (ver o import)"
    ]
  ],
  "scripts/test-studio-fantasma-1510.mjs": [
    [
      "ok(desfazStudioFantasma1510(GEN_REL, semFilmeRapido1710(GEN, GEN_REL) /* reancorado KINEO-FILME-RAPIDO-1710 */) === baseGen, 'desfeito este conserto, o GenerateClient é a base byte a byte')",
      "ok(desfazStudioFantasma1510(GEN_REL, GEN) === baseGen, 'desfeito este conserto, o GenerateClient é a base byte a byte')"
    ],
    [
      "ok(hunks.length > 0 && hunks.every((h) => { const add = h.split(NL).filter((l) => l.startsWith('+') && !l.startsWith('+++')); return add.length === 0 || add.some((l) => l.includes('KINEO-STUDIO-FANTASMA-1510')) || add.every((l) => l.includes('KINEO-FILME-RAPIDO-1710')) /* reancorado KINEO-FILME-RAPIDO-1710: blocos dela, todos marcados */ }), 'todo bloco novo no GenerateClient traz a marca KINEO-STUDIO-FANTASMA-1510')",
      "ok(hunks.length > 0 && hunks.every((h) => { const add = h.split(NL).filter((l) => l.startsWith('+') && !l.startsWith('+++')); return add.length === 0 || add.some((l) => l.includes('KINEO-STUDIO-FANTASMA-1510')) }), 'todo bloco novo no GenerateClient traz a marca KINEO-STUDIO-FANTASMA-1510')"
    ]
  ],
  "scripts/test-trilha-15s-1610.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, FORMA_TRILHA_15S_1610, MARCA_TRILHA_15S_1610 as MARCA } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, FORMA_TRILHA_15S_1610, MARCA_TRILHA_15S_1610 as MARCA } from './test-support/desfaz-trilha-15s-1610.mjs'"
    ],
    [
      "  const assuntos = git('log', '--format=%s', `${base}..HEAD`, '--', ROTA, VPP, LIB).split('\\n').map((s) => s.trim()).filter(Boolean).filter((s) => !s.includes('KINEO-FILME-RAPIDO-1710')) // reancorado KINEO-FILME-RAPIDO-1710: os commits da entrega de 17/10 levam o selo deles",
      "  const assuntos = git('log', '--format=%s', `${base}..HEAD`, '--', ROTA, VPP, LIB).split('\\n').map((s) => s.trim()).filter(Boolean)"
    ]
  ],
  "scripts/test-veo-marcado-2026-09-29.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, linhasTrocadasTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ],
    [
      "  checa(`${p} byte a byte igual à base${p === 'app/api/compose/route.ts' ? ' (fora o import e o bloco marcados KINEO-VOZ-15S-MESMA-DA-MONTAGEM, só acrescentados)' : ''}`, rdBase(p) !== null && rdBase(p) === semVoz15(p, desfazCobertura15s(p, semLogo(p, desfazEscritorOmni(p, desfazH3max(p, desfazParserVoice1510(p, desfazParceiroEyebible1410(p, desfazParceiroEyebible2_1410(p, semFilmeRapido1710(rd(p), p) /* reancorado KINEO-FILME-RAPIDO-1710 */)))))))) /* reancorado KINEO-PARSER-VOICE-1510 · KINEO-PARCEIRO-EYEBIBLE-1410 */)",
      "  checa(`${p} byte a byte igual à base${p === 'app/api/compose/route.ts' ? ' (fora o import e o bloco marcados KINEO-VOZ-15S-MESMA-DA-MONTAGEM, só acrescentados)' : ''}`, rdBase(p) !== null && rdBase(p) === semVoz15(p, desfazCobertura15s(p, semLogo(p, desfazEscritorOmni(p, desfazH3max(p, desfazParserVoice1510(p, desfazParceiroEyebible1410(p, desfazParceiroEyebible2_1410(p, rd(p))))))))) /* reancorado KINEO-PARSER-VOICE-1510 · KINEO-PARCEIRO-EYEBIBLE-1410 */)"
    ]
  ],
  "scripts/test-veo-modo-ia-2026-09-29.mjs": [
    [
      "import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro, linhasTrocadasTrilha15s1610 as linhasTrocadasTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)",
      "import { semTrilha15s1610, linhaDaTrilha15s1610, linhasTrocadasTrilha15s1610 } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-TRILHA-15S [TRAVA 8.2 — vai do fundador 16/10 \"vai nos 2\"]: o plano de b-roll alinhado e o protagonista sem rosto saem em memória antes do byte a byte"
    ],
    [
      "  checa(`${p} byte a byte igual à base${p === 'app/api/compose/route.ts' ? ' (fora o import e o bloco marcados KINEO-VOZ-15S-MESMA-DA-MONTAGEM, só acrescentados)' : ''}`, rdBase(p) !== null && rdBase(p) === semCurtas(semVoz15(p, desfazCobertura15s(p, semLogo(p, desfazEscritorOmni(p, desfazH3max(p, desfazParceiroEyebible1410(p, semFilmeRapido1710(rd(p), p) /* reancorado KINEO-FILME-RAPIDO-1710 */)))))))) // reancorado KINEO-DURACOES-CURTAS: lib/narrationFit ganhou só um comentário marcado",
      "  checa(`${p} byte a byte igual à base${p === 'app/api/compose/route.ts' ? ' (fora o import e o bloco marcados KINEO-VOZ-15S-MESMA-DA-MONTAGEM, só acrescentados)' : ''}`, rdBase(p) !== null && rdBase(p) === semCurtas(semVoz15(p, desfazCobertura15s(p, semLogo(p, desfazEscritorOmni(p, desfazH3max(p, desfazParceiroEyebible1410(p, rd(p))))))))) // reancorado KINEO-DURACOES-CURTAS: lib/narrationFit ganhou só um comentário marcado"
    ]
  ]
}

/** A linha é desta entrega? (toda linha nova ou trocada leva a marca). */
export function linhaDoFilmeRapido1710(l) {
  if (typeof l === 'string' && l.includes(MARCA_META95_IDEIA_1910)) return true // KINEO-META95-IDEIA-1910: linha da camada mais nova da rota do cinematic também é de depois da base
  return typeof l === 'string' && l.includes(MARCA_FILME_RAPIDO_1710)
}

/** As linhas da BASE que a entrega reescreveu (para os guardiões que contam linhas removidas). */
export function linhasTrocadasFilmeRapido1710(p) {
  return (TROCAS_FILME_RAPIDO_1710[p] ?? []).map(([, base]) => base)
}

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Sem linha marcada = devolve igual. */
export function semFilmeRapido1710(texto, p) {
  texto = semMeta95Assunto1910(texto, p) // KINEO-META95-ASSUNTO-1910 — a camada mais nova na rota do cinematic sai primeiro
  if (typeof texto !== 'string' || !texto.includes(MARCA_FILME_RAPIDO_1710)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_FILME_RAPIDO_1710[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_FILME_RAPIDO_1710)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    // acréscimo puro: sai
  }
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazFilmeRapido1710(p, texto) {
  return semFilmeRapido1710(texto, p)
}
