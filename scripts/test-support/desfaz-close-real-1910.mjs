// KINEO-CLOSE-REAL-1910 — DESFAZ, em memória, a entrega "Close do produto real" (formato nº 2 do Studio Ads + a amostra grátis nele) para os
// guardiões que conferem rotas e telas BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Nos arquivos que a entrega toca, toda linha nova carrega a marca KINEO-CLOSE-REAL-1910 (inclusive os imports, em linha própria). Duas
// formas, e só elas:
//   · ACRÉSCIMO — linha nova com a marca: sai inteira;
//   · TROCA — a linha da base foi reescrita (só onde não há outro jeito; listadas abaixo, reconhecidas INTEIRAS): volta a ser a da base.
// O guardião scripts/test-close-real-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE o pai do 1º commit da entrega
// (CLOSE_REAL_1910_BASE), e que os arquivos novos (CLOSE_REAL_1910_NOVOS) não existiam lá.
export const MARCA_CLOSE_REAL_1910 = 'KINEO-CLOSE-REAL-1910'

/** O pai do 1º commit da entrega (origin/main de 19/10). */
export const CLOSE_REAL_1910_BASE = '57f6f4b4598660d7d53b89a751ee34f980e8606e'

/** Arquivos que a entrega toca (só acréscimos marcados + as trocas listadas). */
export const CLOSE_REAL_1910_ARQUIVOS = [
  "app/(dashboard)/ads/v2/AdsV2Client.tsx",
  "app/(dashboard)/ads/v2/AdsV2Simple.tsx",
  "app/ads/page.tsx",
  "app/api/events/route.ts",
  "lib/ads/events.ts",
  "lib/ads/sample.ts",
  "lib/ads/serverAccess.ts",
  "lib/ads/v2Advance.ts",
  "lib/ads/v2Contract.ts",
  "lib/ads/v2PlanCore.ts",
  "lib/ads/v2StartCore.ts",
  "scripts/test-ads-1foto-link-2026-10-10.mjs",
  "scripts/test-ads-3-variacoes-2026-09-30.mjs",
  "scripts/test-ads-amostra-2026-10-09.mjs",
  "scripts/test-ads-ator-2026-10-09.mjs",
  "scripts/test-ads-ator-ajustes-2026-10-09.mjs",
  "scripts/test-ads-cena-1310.mjs",
  "scripts/test-ads-consertos-1410.mjs",
  "scripts/test-ads-consertos-tela-1410.mjs",
  "scripts/test-ads-demo-universo-1410.mjs",
  "scripts/test-ads-estilos-2026-10-09.mjs",
  "scripts/test-ads-fiel-1510.mjs",
  "scripts/test-ads-fiel-2-1510.mjs",
  "scripts/test-ads-fiel-3-1510.mjs",
  "scripts/test-ads-fiel-4-1510.mjs",
  "scripts/test-ads-fiel-5-1510.mjs",
  "scripts/test-ads-fiel-6-1610.mjs",
  "scripts/test-ads-fiel-7-1610.mjs",
  "scripts/test-ads-fiel-liga-1510.mjs",
  "scripts/test-ads-fluxo-1310.mjs",
  "scripts/test-ads-formatos-1410.mjs",
  "scripts/test-ads-fundacao-2026-09-25.mjs",
  "scripts/test-ads-link-lojas-1510.mjs",
  "scripts/test-ads-link-tela-1510.mjs",
  "scripts/test-ads-lista-1510.mjs",
  "scripts/test-ads-mao-ajuste-3-1610.mjs",
  "scripts/test-ads-mao-juiz-1610.mjs",
  "scripts/test-ads-marcas-1510.mjs",
  "scripts/test-ads-modo-simples-2026-09-29.mjs",
  "scripts/test-ads-palco-voltar-1410.mjs",
  "scripts/test-ads-pos-entrega-1510.mjs",
  "scripts/test-ads-produto-na-mao-1610.mjs",
  "scripts/test-ads-produto-na-mao-ajuste-1610.mjs",
  "scripts/test-ads-quadro-studio-1510.mjs",
  "scripts/test-ads-refacao-ator-1410.mjs",
  "scripts/test-ads-refazer-cena-1410.mjs",
  "scripts/test-ads-reteste-1510.mjs",
  "scripts/test-ads-roteiros-1310.mjs",
  "scripts/test-ads-simples-acabamento-2026-09-29.mjs",
  "scripts/test-ads-ux-marca-2026-10-10.mjs",
  "scripts/test-ads-v2-servidor-2026-09-28.mjs",
  "scripts/test-ads-v2-tela-2026-09-28.mjs",
  "scripts/test-ads-video-do-cliente-2026-09-29.mjs",
  "scripts/test-afiliado-destino-1610.mjs",
  "scripts/test-afiliado-por-post-1610.mjs",
  "scripts/test-anuncio-consertos-1210.mjs",
  "scripts/test-apresentador-v2-1710.mjs",
  "scripts/test-apresentador-v2-ajuste-1710.mjs",
  "scripts/test-apresentador-v2-ajuste-3-1710.mjs",
  "scripts/test-ator-sem-depoimento-1310.mjs",
  "scripts/test-atores-ia-1310.mjs",
  "scripts/test-centro-ads-gancho-1410.mjs",
  "scripts/test-checkout-clareza-1610.mjs",
  "scripts/test-clipe360-amostra-1410.mjs",
  "scripts/test-equipe-business-2026-10-10.mjs",
  "scripts/test-filme-rapido-1710.mjs",
  "scripts/test-juiz-grade-1610.mjs",
  "scripts/test-shopify-app-1310.mjs"
]

/** Arquivos que a entrega cria. */
export const CLOSE_REAL_1910_NOVOS = [
  "lib/ads/v2CloseReal.ts",
  "lib/ads/v2CloseRealServer.ts",
  "scripts/test-support/desfaz-close-real-1910.mjs"
]

/** [linha nova (inteira), linha da base] por arquivo — gerado do diff da entrega. */
export const TROCAS_CLOSE_REAL_1910 = {
  "app/(dashboard)/ads/v2/AdsV2Client.tsx": [
    [
      "  const scopy: AdsSampleCopy | null = sample ? (ADS_V2_CLOSE_REAL_LIVE ? { ...adsSampleCopy('en'), note: adsSampleCopy('en').closeReal } : adsSampleCopy('en')) : null // KINEO-CLOSE-REAL-1910 — a amostra é o Close real (o /plan força o formato também na Produção); era: const scopy: AdsSampleCopy | null = sample ? adsSampleCopy('en') : null",
      "  const scopy: AdsSampleCopy | null = sample ? adsSampleCopy('en') : null"
    ]
  ],
  "app/(dashboard)/ads/v2/AdsV2Simple.tsx": [
    [
      "  const scopy: AdsSampleCopy | null = sample ? (ADS_V2_CLOSE_REAL_LIVE ? { ...adsSampleCopy(lang), note: adsSampleCopy(lang).closeReal } : adsSampleCopy(lang)) : null // KINEO-CLOSE-REAL-1910 — a amostra é o Close real (1 por conta, 15 s, marca-d'água); era: const scopy: AdsSampleCopy | null = sample ? adsSampleCopy(lang) : null",
      "  const scopy: AdsSampleCopy | null = sample ? adsSampleCopy(lang) : null"
    ],
    [
      "  const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC && advancedOn && formatChoice === '9:16' ? styleChoice ?? styleSuggested : 'none' // KINEO-ADS-MELHORIAS-1410 — estilo só em 9:16 (o efeito não tem outro formato) · KINEO-CLOSE-REAL-1910 — e só no \"Avançado\"; era: const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC && formatChoice === '9:16' ? styleChoice ?? styleSuggested : 'none'",
      "  const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC && formatChoice === '9:16' ? styleChoice ?? styleSuggested : 'none' // KINEO-ADS-MELHORIAS-1410 — estilo só em 9:16 (o efeito não tem outro formato)"
    ],
    [
      "  const presenterOn = ADS_V2_PRESENTER_PUBLIC && (advancedOn ? presenterChoice : adFormat === 'presenter') && presenterWhy === null // KINEO-CLOSE-REAL-1910 — o formato Apresentador liga o ator; no \"Avançado\", o interruptor de sempre; era: const presenterOn = ADS_V2_PRESENTER_PUBLIC && presenterChoice && presenterWhy === null",
      "  const presenterOn = ADS_V2_PRESENTER_PUBLIC && presenterChoice && presenterWhy === null"
    ],
    [
      "  const firstAsProduct = style !== 'none' && photoKind !== 'text' || presenterOn || (closeRealOn && photoKind !== 'text') // KINEO-CLOSE-REAL-1910 — a 1ª foto vai como produto (o recorte do gancho sai dela); era: const firstAsProduct = style !== 'none' && photoKind !== 'text' || presenterOn",
      "  const firstAsProduct = style !== 'none' && photoKind !== 'text' || presenterOn"
    ],
    [
      "  const format: AdsV2Format = closeRealOn || adsV2FormatBlock({ format: formatChoice, tier, style: null, presenter: false }) ? '9:16' : formatChoice // KINEO-CLOSE-REAL-1910 — o Close real é só 9:16; era: const format: AdsV2Format = adsV2FormatBlock({ format: formatChoice, tier, style: null, presenter: false }) ? '9:16' : formatChoice",
      "  const format: AdsV2Format = adsV2FormatBlock({ format: formatChoice, tier, style: null, presenter: false }) ? '9:16' : formatChoice"
    ],
    [
      "  const baseSig = JSON.stringify({ draftKey, sector, presenter: presenterOn, items: inAd.map((p) => [p.key, focalSig(p)]), style, ...(presenterOn && presenterPick ? { presenterPick } : {}), ...(format !== '9:16' ? { format } : {}), ...(closeRealOn ? { closeReal: true } : {}) }) // KINEO-ADS-MELHORIAS-1410 — outro formato = planejar de novo · KINEO-CLOSE-REAL-1910 — trocar para/do Close real = planejar de novo; era: a mesma linha sem a chave closeReal",
      "  const baseSig = JSON.stringify({ draftKey, sector, presenter: presenterOn, items: inAd.map((p) => [p.key, focalSig(p)]), style, ...(presenterOn && presenterPick ? { presenterPick } : {}), ...(format !== '9:16' ? { format } : {}) }) // KINEO-ADS-MELHORIAS-1410 — outro formato = planejar de novo"
    ],
    [
      "        body: { mode: 'simple', order_id: orderId, sector, logo_footage_id: logo?.footageId ?? null, ...(presenterOn ? { presenter: true } : {}), photos: uploaded, videos, card_footage_id: card.footageId, facts: chosen, ...(style !== 'none' ? { style } : {}), ...(presenterOn && presenterPick ? { presenter_id: presenterPick } : {}), ...(format !== '9:16' ? { format } : {}), ...(closeRealOn ? { close_real: true } : {}) }, // KINEO-ADS-MELHORIAS-1410 — o formato só fora do 9:16 · KINEO-CLOSE-REAL-1910 — + o Close do produto real; era: a mesma linha sem close_real",
      "        body: { mode: 'simple', order_id: orderId, sector, logo_footage_id: logo?.footageId ?? null, ...(presenterOn ? { presenter: true } : {}), photos: uploaded, videos, card_footage_id: card.footageId, facts: chosen, ...(style !== 'none' ? { style } : {}), ...(presenterOn && presenterPick ? { presenter_id: presenterPick } : {}), ...(format !== '9:16' ? { format } : {}) }, // KINEO-ADS-MELHORIAS-1410 — o formato só fora do 9:16"
    ],
    [
      "                <h2 id=\"adv2s-s3\" className=\"lab\"><span className=\"n\" aria-hidden=\"true\">3</span>{ADS_V2_CLOSE_REAL_LIVE ? afc.title : styleCopy.title}</h2>{/* KINEO-CLOSE-REAL-1910 — o passo 3 escolhe o FORMATO (Apresentador / Close real); era: o mesmo h2 com {styleCopy.title} */}",
      "                <h2 id=\"adv2s-s3\" className=\"lab\"><span className=\"n\" aria-hidden=\"true\">3</span>{styleCopy.title}</h2>"
    ],
    [
      "                {ADS_V2_STYLES_PUBLIC && advancedOn ? (/* KINEO-CLOSE-REAL-1910 — \"Ver todos\" só no Avançado; era: {ADS_V2_STYLES_PUBLIC ? ( */",
      "                {ADS_V2_STYLES_PUBLIC ? ("
    ],
    [
      "              {ADS_V2_STYLES_PUBLIC && advancedOn ? (/* KINEO-CLOSE-REAL-1910 — a fileira de estilos só no Avançado; era: {ADS_V2_STYLES_PUBLIC ? ( */",
      "              {ADS_V2_STYLES_PUBLIC ? ("
    ],
    [
      "              {ADS_V2_STYLES_PUBLIC && advancedOn && styleCopy.fidelity ? <p className=\"adsw-hint\" data-kineo=\"ads-style-fidelity\">{styleCopy.fidelity}</p> : null}{/* KINEO-ADS-FIEL-2-1510 — o aviso honesto também nos cartões compactos (16 línguas) */}{/* KINEO-CLOSE-REAL-1910 — só no Avançado */}",
      "              {ADS_V2_STYLES_PUBLIC && styleCopy.fidelity ? <p className=\"adsw-hint\" data-kineo=\"ads-style-fidelity\">{styleCopy.fidelity}</p> : null}{/* KINEO-ADS-FIEL-2-1510 — o aviso honesto também nos cartões compactos (16 línguas) */}"
    ],
    [
      "            {ADS_V2_STYLES_PUBLIC && advancedOn ? (/* KINEO-CLOSE-REAL-1910 — a escolha completa de estilos só no Avançado; era: {ADS_V2_STYLES_PUBLIC ? ( */",
      "            {ADS_V2_STYLES_PUBLIC ? ("
    ],
    [
      "                    const why = closeRealOn && fm !== '9:16' ? 'style' : adsV2FormatBlock({ format: fm, tier, style: null, presenter: false }) // KINEO-CLOSE-REAL-1910 — o Close real é só 9:16; era: const why = adsV2FormatBlock({ format: fm, tier, style: null, presenter: false })",
      "                    const why = adsV2FormatBlock({ format: fm, tier, style: null, presenter: false })"
    ],
    [
      "              {ADS_V2_PRESENTER_PUBLIC && advancedOn ? (/* KINEO-CLOSE-REAL-1910 — o interruptor do ator só no Avançado (o formato Apresentador já o liga); era: {ADS_V2_PRESENTER_PUBLIC ? ( */",
      "              {ADS_V2_PRESENTER_PUBLIC ? ("
    ],
    [
      "                  three={variations && !closeRealOn ? { on: three, onChange: setThree, copy: vcopy } : null} /* KINEO-CLOSE-REAL-1910 — o Close real não tem as 3 variações de cor; era: three={variations ? { on: three, onChange: setThree, copy: vcopy } : null} */",
      "                  three={variations ? { on: three, onChange: setThree, copy: vcopy } : null}"
    ]
  ],
  "app/ads/page.tsx": [
    [
      "              <b>Your first ad is free.</b> One ad per account in the Real product close-up format: about {ADS_V2_SCREEN_SECONDS} seconds, only your own photos with camera moves, your label 100% faithful, with a small watermark. No card needed.{/* KINEO-CLOSE-REAL-1910 — a amostra é o Close do produto real; era: One ad per account at the Commercial level, about {ADS_V2_SCREEN_SECONDS} seconds, from your own photos. No card needed. */}",
      "              <b>Your first ad is free.</b> One ad per account at the Commercial level, about {ADS_V2_SCREEN_SECONDS} seconds, from your own photos. No card needed."
    ]
  ],
  "app/api/events/route.ts": [],
  "lib/ads/events.ts": [],
  "lib/ads/sample.ts": [],
  "lib/ads/serverAccess.ts": [],
  "lib/ads/v2Advance.ts": [
    [
      "  if (!presenterSource && !closeRealSource) { // KINEO-ADS-FIEL-2-1510 · KINEO-CLOSE-REAL-1910 — o Close real tem a linha do tempo dele; era: if (!presenterSource) {",
      "  if (!presenterSource) { // KINEO-ADS-FIEL-2-1510"
    ],
    [
      "  if (voiceSeconds && !presenterSource && !closeRealSource) { // KINEO-CLOSE-REAL-1910 — era: if (voiceSeconds && !presenterSource) {",
      "  if (voiceSeconds && !presenterSource) {"
    ],
    [
      "    source = closeRealSource ?? presenterSource ?? buildAdV2Source({ // KINEO-CLOSE-REAL-1910 — o Close real primeiro; era: source = presenterSource ?? buildAdV2Source({",
      "    source = presenterSource ?? buildAdV2Source({"
    ]
  ],
  "lib/ads/v2Contract.ts": [],
  "lib/ads/v2PlanCore.ts": [],
  "lib/ads/v2StartCore.ts": [
    [
      "      await writeServerEvent({ name: 'ads_sample_started', userId: uid, path: '/api/ads/v2/start', metadata: { order_id: orderId, generation_id: generationId, billing_ref: billingRef, tier: order.tier, seconds: order.seconds, usd_estimate: usd.totalUsd, credits_list: cost, format: 'close_real', watermark: true } }) // KINEO-CLOSE-REAL-1910 — + o formato e a marca-d'água; era: o mesmo evento sem format/watermark",
      "      await writeServerEvent({ name: 'ads_sample_started', userId: uid, path: '/api/ads/v2/start', metadata: { order_id: orderId, generation_id: generationId, billing_ref: billingRef, tier: order.tier, seconds: order.seconds, usd_estimate: usd.totalUsd, credits_list: cost } })"
    ]
  ],
  "scripts/test-ads-1foto-link-2026-10-10.mjs": [
    [
      "const read = (rel) => semMarcas1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semMarcas1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-3-variacoes-2026-09-30.mjs": [
    [
      "const rd = (p) => semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-ads-amostra-2026-10-09.mjs": [
    [
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-ator-2026-10-09.mjs": [
    [
      "const readCru = (rel) => desfazApresentadorV2_1710(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)) // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 (só conta interna) veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const readCru = (rel) => desfazApresentadorV2_1710(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')) // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 (só conta interna) veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs"
    ]
  ],
  "scripts/test-ads-ator-ajustes-2026-10-09.mjs": [
    [
      "const readCru = (rel) => semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)) // reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória (semFiel3_1510 já devolve LF) /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const readCru = (rel) => semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')) // reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória (semFiel3_1510 já devolve LF)"
    ]
  ],
  "scripts/test-ads-cena-1310.mjs": [
    [
      "const rd = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-consertos-1410.mjs": [
    [
      "const rd = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-consertos-tela-1410.mjs": [
    [
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-demo-universo-1410.mjs": [
    [
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semLista1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))))))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semLista1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))))))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-estilos-2026-10-09.mjs": [
    [
      "const readCru = (rel) => semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)) // reancorado KINEO-ADS-FIEL-3-1510 — a regra do tipo da foto foi para lib/ads/v2Fiel3.ts (intacta, provada em test-ads-fiel-3-1510); sai primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const readCru = (rel) => semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')) // reancorado KINEO-ADS-FIEL-3-1510 — a regra do tipo da foto foi para lib/ads/v2Fiel3.ts (intacta, provada em test-ads-fiel-3-1510); sai primeiro, em memória"
    ]
  ],
  "scripts/test-ads-fiel-1510.mjs": [
    [
      "const rd = (p) => semFiel2_1510(p, semAfiliadoDestino1610(p, semAfiliadoPorPost1610(p, semClareza1610(p, semFiel3_1510(p, semFiel4_1510(p, semFiel5_1510(p, semFielLiga1510(p, semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p))))))))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-AFILIADO-DESTINO-1610 — o nome reservado affiliate_link_clicked (app/api/events/route.ts) sai antes de todos /* reancorado KINEO-CHECKOUT-CLAREZA-1610 (união na leva 2) · reancorado KINEO-AFILIADO-POR-POST-1610 (união na leva 2) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória · reancorado KINEO-LEVA3-1510 (união na leva 3) */ /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFiel2_1510(p, semAfiliadoDestino1610(p, semAfiliadoPorPost1610(p, semClareza1610(p, semFiel3_1510(p, semFiel4_1510(p, semFiel5_1510(p, semFielLiga1510(p, readFileSync(join(ROOT, p), 'utf8'))))))))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-AFILIADO-DESTINO-1610 — o nome reservado affiliate_link_clicked (app/api/events/route.ts) sai antes de todos /* reancorado KINEO-CHECKOUT-CLAREZA-1610 (união na leva 2) · reancorado KINEO-AFILIADO-POR-POST-1610 (união na leva 2) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória · reancorado KINEO-LEVA3-1510 (união na leva 3) */ /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-fiel-2-1510.mjs": [
    [
      "const rd = (p) => semFiel3_1510(p, semFiel4_1510(p, semFiel5_1510(p, semFielLiga1510(p, semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p))))) // reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória (semFiel3_1510 já devolve LF) /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFiel3_1510(p, semFiel4_1510(p, semFiel5_1510(p, semFielLiga1510(p, readFileSync(join(ROOT, p), 'utf8'))))) // reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória (semFiel3_1510 já devolve LF) /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-fiel-3-1510.mjs": [
    [
      "const rd = (p) => semFiel4_1510(p, semFiel5_1510(p, semFielLiga1510(p, semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p)))) // reancorado KINEO-ADS-FIEL-4-1510 — esta prova roda a trava da Fiel 3 (o lugar lido pela visão); o canto reservado sai antes, byte a byte (semFiel4_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFiel4_1510(p, semFiel5_1510(p, semFielLiga1510(p, readFileSync(join(ROOT, p), 'utf8')))) // reancorado KINEO-ADS-FIEL-4-1510 — esta prova roda a trava da Fiel 3 (o lugar lido pela visão); o canto reservado sai antes, byte a byte (semFiel4_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-fiel-4-1510.mjs": [
    [
      "const rd = (p) => semFiel5_1510(p, semFielLiga1510(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p))) // reancorado KINEO-ADS-FIEL-5-1510 — esta prova roda a trava da Fiel 4 (base fixa); a base no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFiel5_1510(p, semFielLiga1510(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p))) // reancorado KINEO-ADS-FIEL-5-1510 — esta prova roda a trava da Fiel 4 (base fixa); a base no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ads-fiel-5-1510.mjs": [
    [
      "const rd = (p) => semFielLiga1510(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10: este guardião lê o texto SEM o liga (semFielLiga1510 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFielLiga1510(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10: este guardião lê o texto SEM o liga (semFielLiga1510 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ads-fiel-6-1610.mjs": [
    [
      "const rd = (p) => semFiel7_1610(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-ADS-FIEL-7-1610 — a fiel-7 veio depois (base sempre fixa, caixa-chute): este guardião lê o texto SEM ela (semFiel7_1610 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFiel7_1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-FIEL-7-1610 — a fiel-7 veio depois (base sempre fixa, caixa-chute): este guardião lê o texto SEM ela (semFiel7_1610 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ads-fiel-7-1610.mjs": [
    [
      "const rd = (p) => semProdutoNaMao1610(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-ADS-PRODUTO-NA-MAO-1610 — o produto-na-mão veio depois: este guardião lê o texto SEM ele (semProdutoNaMao1610 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semProdutoNaMao1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-PRODUTO-NA-MAO-1610 — o produto-na-mão veio depois: este guardião lê o texto SEM ele (semProdutoNaMao1610 já devolve LF) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ads-fiel-liga-1510.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ads-fluxo-1310.mjs": [
    [
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semLista1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semLista1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-formatos-1410.mjs": [
    [
      "const rd = (rel) => semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-ads-fundacao-2026-09-25.mjs": [
    [
      "const rd = (p) => semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-ads-link-lojas-1510.mjs": [
    [
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-link-tela-1510.mjs": [
    [
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-lista-1510.mjs": [
    [
      "const read = (rel) => semFilmeRapido1710(semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semFilmeRapido1710(semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-mao-ajuste-3-1610.mjs": [
    [
      "const rd = (p) => semMaoJuiz1610(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-ADS-MAO-JUIZ-1610 — o conserto do juiz veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-ads-mao-juiz-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semMaoJuiz1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-MAO-JUIZ-1610 — o conserto do juiz veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-ads-mao-juiz-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ads-mao-juiz-1610.mjs": [
    [
      "const rd = (p) => desfazJuizGrade1610(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 (inclusive a reancoragem do guardião da 3ª rodada) sai antes */) // reancorado KINEO-JUIZ-GRADE-1610 — a grade do juiz (modelo/variante da calibração) veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-juiz-grade-1610.mjs /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => desfazJuizGrade1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 (inclusive a reancoragem do guardião da 3ª rodada) sai antes */) // reancorado KINEO-JUIZ-GRADE-1610 — a grade do juiz (modelo/variante da calibração) veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-juiz-grade-1610.mjs"
    ]
  ],
  "scripts/test-ads-marcas-1510.mjs": [
    [
      "const read = (rel) => semFilmeRapido1710(semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semFilmeRapido1710(semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-modo-simples-2026-09-29.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(semMarcas1510(p, semLinkTela1510(p, semLista1510(p, semFiel2_1510(p, semFiel3_1510(p, semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p)))))), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFilmeRapido1710(semMarcas1510(p, semLinkTela1510(p, semLista1510(p, semFiel2_1510(p, semFiel3_1510(p, readFileSync(join(RAIZ, p), 'utf8')))))), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-palco-voltar-1410.mjs": [
    [
      "const read = (rel) => semFilmeRapido1710(semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semFilmeRapido1710(semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-pos-entrega-1510.mjs": [
    [
      "const rd = (rel) => semFilmeRapido1710(lf(semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (rel) => semFilmeRapido1710(lf(semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-produto-na-mao-1610.mjs": [
    [
      "const rd = (p) => semMaoAjuste1610(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-ADS-MAO-AJUSTE-1610 — o ajuste veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-ads-produto-na-mao-ajuste-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semMaoAjuste1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-MAO-AJUSTE-1610 — o ajuste veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-ads-produto-na-mao-ajuste-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ads-produto-na-mao-ajuste-1610.mjs": [
    [
      "const rd = (p) => semMaoAjuste3_1610(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-ADS-MAO-AJUSTE-3-1610 — a 3ª rodada veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-ads-mao-ajuste-3-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semMaoAjuste3_1610(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-ADS-MAO-AJUSTE-3-1610 — a 3ª rodada veio depois: este guardião lê o texto SEM ela (já LF); ela é provada em scripts/test-ads-mao-ajuste-3-1610.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ads-quadro-studio-1510.mjs": [
    [
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-refacao-ator-1410.mjs": [
    [
      "const rd = (rel) => semFilmeRapido1710(semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)))))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (rel) => semFilmeRapido1710(semMarcas1510(rel, semLinkTela1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semFiel4_1510(rel, semFiel5_1510(rel, semFielLiga1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')))))))), rel) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LINK-TELA-1510 — a tela do leitor de link (a mais nova) sai antes das marcas · reancorado KINEO-ADS-FIEL-2-1510 · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-ADS-FIEL-4-1510 — o canto reservado da trava sai primeiro, em memória */ · reancorado KINEO-ADS-FIEL-5-1510 — a base do produto no tampo sai antes, byte a byte (semFiel5_1510 já devolve LF) · reancorado KINEO-ADS-FIEL-LIGA-1510 — o liga (o mais novo) sai PRIMEIRO, colado no readFileSync"
    ]
  ],
  "scripts/test-ads-refazer-cena-1410.mjs": [
    [
      "const rd = (rel) => semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-ads-reteste-1510.mjs": [
    [
      "const rd = (rel) => semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-ads-roteiros-1310.mjs": [
    [
      "const rd = (rel) => semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-ads-simples-acabamento-2026-09-29.mjs": [
    [
      "const rd = (p) => semFiel2_1510(p, semFiel3_1510(p, semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFiel2_1510(p, semFiel3_1510(p, readFileSync(join(RAIZ, p), 'utf8'))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-ux-marca-2026-10-10.mjs": [
    [
      "const readCru = (rel) => semMarcas1510(rel, semLista1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const readCru = (rel) => semMarcas1510(rel, semLista1510(rel, semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos · reancorado KINEO-ADS-FIEL-2-1510 (o mais novo, por dentro do desfaz da lista) · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-ads-v2-servidor-2026-09-28.mjs": [
    [
      "const rd = (p) => semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-ads-v2-tela-2026-09-28.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(semMarcas1510(p, semLista1510(p, semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p).replace(/\\r\\n/g, '\\n'))), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFilmeRapido1710(semMarcas1510(p, semLista1510(p, readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n'))), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos"
    ]
  ],
  "scripts/test-ads-video-do-cliente-2026-09-29.mjs": [
    [
      "const rd = (p) => semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-afiliado-destino-1610.mjs": [
    [
      "const read = (file) => semAfiliadoPorPost1610(file, semCloseReal1910(fs.readFileSync(path.join(root, file), 'utf8'), file).replace(/\\r\\n/g, '\\n')) /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (file) => semAfiliadoPorPost1610(file, fs.readFileSync(path.join(root, file), 'utf8').replace(/\\r\\n/g, '\\n'))"
    ]
  ],
  "scripts/test-afiliado-por-post-1610.mjs": [
    [
      "const read = (file) => semCloseReal1910(fs.readFileSync(path.join(root, file), 'utf8'), file).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-anuncio-consertos-1210.mjs": [
    [
      "const read = (rel) => semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)) // reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória (semFiel3_1510 já devolve LF) /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')) // reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória (semFiel3_1510 já devolve LF)"
    ]
  ],
  "scripts/test-apresentador-v2-1710.mjs": [
    [
      "const rd = (p) => desfazApresentadorV2Ajuste1710(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-1710 — o ajuste do apresentador v2 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-apresentador-v2-ajuste-1710.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => desfazApresentadorV2Ajuste1710(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-1710 — o ajuste do apresentador v2 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste é provado em scripts/test-apresentador-v2-ajuste-1710.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-apresentador-v2-ajuste-1710.mjs": [
    [
      "const rd = (p) => desfazApresentadorV2Ajuste3_1710(p, semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o ajuste 3 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste 3 é provado em scripts/test-apresentador-v2-ajuste-3-1710.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => desfazApresentadorV2Ajuste3_1710(p, semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-APRESENTADOR-V2-AJUSTE-3-1710 — o ajuste 3 (17/10) veio depois: este guardião lê o texto SEM ele (já LF); o ajuste 3 é provado em scripts/test-apresentador-v2-ajuste-3-1710.mjs /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-apresentador-v2-ajuste-3-1710.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p), p).replace(/\\r\\n/g, '\\n') // o arquivo VIVO (esta é a camada mais nova) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFilmeRapido1710(readFileSync(join(ROOT, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') // o arquivo VIVO (esta é a camada mais nova) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai primeiro, em memória */"
    ]
  ],
  "scripts/test-ator-sem-depoimento-1310.mjs": [
    [
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semFiel2_1510(rel, semFiel3_1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-atores-ia-1310.mjs": [
    [
      "const read = (rel) => desfazApresentadorV2_1710(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel)) // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 (só conta interna) veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => desfazApresentadorV2_1710(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')) // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 (só conta interna) veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs"
    ]
  ],
  "scripts/test-centro-ads-gancho-1410.mjs": [
    [
      "const rd = (p) => lf(semFiel2_1510(p, semFiel3_1510(p, semCloseReal1910(readFileSync(join(RAIZ, p), 'utf8'), p)))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => lf(semFiel2_1510(p, semFiel3_1510(p, readFileSync(join(RAIZ, p), 'utf8')))) // reancorado KINEO-ADS-FIEL-2-1510 — os consertos do QA da trava (15/10) saem primeiro, em memória · reancorado KINEO-ADS-FIEL-3-1510 — os consertos da validação paga da trava (15/10) saem primeiro, em memória"
    ]
  ],
  "scripts/test-checkout-clareza-1610.mjs": [
    [
      "const read = (rel) => semCloseReal1910(readFileSync(resolve(root, rel), 'utf8'), rel).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-clipe360-amostra-1410.mjs": [
    [
      "const read = (rel) => semMarcas1510(rel, semLista1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel).replace(/\\r\\n/g, '\\n'))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semMarcas1510(rel, semLista1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\\r\\n/g, '\\n'))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos"
    ]
  ],
  "scripts/test-equipe-business-2026-10-10.mjs": [
    [
      "const read = (rel) => semMarcas1510(rel, semLista1510(rel, semCloseReal1910(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel).replace(/\\r\\n/g, '\\n'))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const read = (rel) => semMarcas1510(rel, semLista1510(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\\r\\n/g, '\\n'))) // reancorado KINEO-ADS-MARCAS-1510 — as marcas (clientes) saem primeiro, em memória (provadas em test-ads-marcas-1510) · reancorado KINEO-ADS-LISTA-1510 — a lista \"Seus anúncios\" (a mais nova) sai antes de todos"
    ]
  ],
  "scripts/test-filme-rapido-1710.mjs": [
    [
      "const rd = (p) => semCloseReal1910(fs.readFileSync(path.join(RAIZ, p), 'utf8'), p).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ],
  "scripts/test-juiz-grade-1610.mjs": [
    [
      "const rd = (p) => semFilmeRapido1710(desfazApresentadorV2_1710(p, semCloseReal1910(readFileSync(join(ROOT, p), 'utf8'), p)), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const rd = (p) => semFilmeRapido1710(desfazApresentadorV2_1710(p, readFileSync(join(ROOT, p), 'utf8')), p) /* reancorado KINEO-FILME-RAPIDO-1710: a entrega de 17/10 sai por fora, em memória */ // reancorado KINEO-APRESENTADOR-V2-1710 — o apresentador v2 veio depois: este guardião lê o texto SEM ele (já LF); ele é provado em scripts/test-apresentador-v2-1710.mjs"
    ]
  ],
  "scripts/test-shopify-app-1310.mjs": [
    [
      "const ler = (...p) => semCloseReal1910(readFileSync(path.join(raiz, ...p), 'utf8'), p.join('/')).replace(/\\r\\n/g, '\\n') /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */",
      "const ler = (...p) => readFileSync(path.join(raiz, ...p), 'utf8').replace(/\\r\\n/g, '\\n')"
    ]
  ]
}

export function linhaDoCloseReal1910(l) {
  return typeof l === 'string' && l.includes(MARCA_CLOSE_REAL_1910)
}

/** As linhas da BASE que a entrega reescreveu (para os guardiões que contam linhas removidas). */
export function linhasTrocadasCloseReal1910(p) {
  return (TROCAS_CLOSE_REAL_1910[p] ?? []).map(([, base]) => base)
}

const CR = String.fromCharCode(13)
const LF = String.fromCharCode(10)

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Sem linha marcada = devolve igual (CRLF preservado). */
export function semCloseReal1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_CLOSE_REAL_1910)) return texto
  const crlf = texto.includes(CR + LF)
  const trocas = new Map((TROCAS_CLOSE_REAL_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  for (const linha of texto.split(CR + LF).join(LF).split(LF)) {
    if (!linha.includes(MARCA_CLOSE_REAL_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    // acréscimo puro: sai
  }
  const out = fora.join(LF)
  return crlf ? out.split(LF).join(CR + LF) : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazCloseReal1910(p, texto) {
  return semCloseReal1910(texto, p)
}
