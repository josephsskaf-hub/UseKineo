# KINEO-CARTOON-CONSISTENCIA-2210 — reâncora de 23/10/2026

**FATO CONFIRMADO / IMPLEMENTADO:** a fase de consistência incorpora `origin/main` `9501618af9f8ae588988d79b6ea954009c378097`, obtida após a publicação da tração `189e7e2b537e48df18849ca1a1867a1b78128493`. A ponta de código examinada é `deb2d79fe237315218786ccb45dbdce1d9b0c183`. Os dez arquivos de produto permanecem iguais à entrega original `62b306ad51fa5c65a32ee768262848e2ff2d2d00`; cinco arquivos protegidos permanecem byte a byte iguais à main 950: `lib/engineWall.ts`, `lib/homeVideoCuration.ts`, `lib/kidsVenda/kidsVenda.ts`, `lib/ads/cena/escolhaVideo.ts` e `scripts/test-ads-render-fix-2310.mjs`. Fonte: `C:/tmp/cartoon-reanchor-2310/consistencia-950-boundaries-romance.json`.

**FATO CONFIRMADO / IMPLEMENTADO:** referências individuais do elenco são geradas e moderadas antes dos clipes; o compositor aplica o piso de 15 s ao Cartoon assinado; retry pago adicional desse produto é recusado antes dos fornecedores. Fontes: `lib/kidsCartoon/cartoonReferenceServer.ts:8`, `app/api/generate-video-cinematic/route.ts:6965`, `app/api/compose/route.ts:3561` e `app/api/retry-hollywood-scene/route.ts:217`. A reâncora conserva o desfaz exato de 27 arquivos para a base 950, incluindo substituição literal de `$&`: `scripts/test-support/desfaz-cartoon-consistencia-2210.mjs:6` e `scripts/test-support/desfaz-cartoon-consistencia-2210.mjs:27`.

**TESTADO LOCALMENTE — comparação de 23/10:** os resultados brutos e seus logs foram preservados; os vermelhos herdados não foram apresentados como regressões novas.

| Evidência | Arquivos de teste | Verdes | Vermelhos |
|---|---:|---:|---:|
| Main 950, execução completa bruta | 997 | 846 | 151 |
| Main 950, com 11 substituições explícitas de evidência | 997 | 853 | 144 |
| Candidato 48cf8697, execução completa bruta | 999 | 855 | 144 |
| Consolidação com POS e dois testes focados em H3 | 999 | 856 | 143 |

**TESTADO LOCALMENTE:** as onze substituições da base são nove casos de caminhos executados na mesma 950 em diretório ASCII, o caso Entrega R6 nessa árvore e Roteiros serial com o prazo interno original de 5.500 ms. As 3.407 fontes brutas da base permaneceram iguais. Fontes: `main-950-complete.json`, `main-950-ascii-paths-integrity.json`, `main-950-ascii-entrega-r6-integrity.json`, `main-950-roteiros-serial-integrity.json` e `consistencia-950-resumed-overlay-independent-comparison.json`, em `C:/tmp/cartoon-reanchor-2310/`.

**TESTADO LOCALMENTE:** a suíte de 999 foi executada em `48cf8697cf4573b6613f5ef45933b9935c02f9d5`, não novamente em H3. A ponte até `deb2d79f` confirma 3.416 fontes comuns intactas e alteração somente no teste Romance e na tabela de desfaz; as 26 entradas anteriores da tabela e as asserções/mutantes históricos permanecem iguais. Em H3 foram executados somente os dois testes focados: guardião com 477 provas, 20 mutantes integrados e cinco de duração rejeitados; Romance com 19/19 mutantes, log de 9.131 bytes idêntico à base 950. Auditoria da aplicação real dos 19 mutantes e integridade das 3.418 fontes: PASS. Fontes: `consistencia-950-romance-source-bridge.json`, `consistencia-950-romance-final-integrity.json` e `consistencia-950-romance-actual-final-review.json`.

**TESTADO LOCALMENTE / DESCONHECIDO:** POS passou isoladamente nas mesmas fontes (32 provas, incluindo 12 mutantes), com 49 dependências TypeScript iguais à base e log idêntico à 950; a falha bruta E1 permanece preservada e sua causa é desconhecida. Não se atribui essa diferença à VM nem a correção de produto. A auditoria F1 comparou 25 membros dos agregados (15 em A4b e 10 em U4), suas referências reais de Git e os mesmos quatro e três membros falhos, respectivamente: PASS. Fontes: `consistencia-950-pos-diagnostic-review.json` e `consistencia-950-f1-member-final-review.json`.

**TESTADO LOCALMENTE:** TypeScript verde, saída 0 (`--noEmit --incremental false`), em 23/10; fonte: `consistencia-950-tsc-result.json`. Verificação offline, sem leitura de `.env`, chamadas pagas, alterações financeiras ou mensagens externas. **QUESTÃO PENDENTE / DESCONHECIDO:** não há validação desta entrega em produção nem novo MP4 pago que comprove identidade visual, duração e custo total. O cálculo conhecido exclui GPT, TTS, música e montagem (`lib/kidsCartoon/cartoonConsistency.ts:32`; `app/api/generate-video-cinematic/route.ts:6966`).

**TESTADO LOCALMENTE:** recibo independente final PASS: zero testes com falha nova, zero mudanças nos membros internos falhos e zero testes removidos. O único teste herdado que passou de falha a verde foi o guardião Escolha, após correção de sua referência histórica; isso não comprova melhora de produto. Fonte: `C:/tmp/cartoon-reanchor-2310/consistencia-950-h3-independent-final-receipt.json`, SHA-256 `8afeaf1fdb04deb62ff95db6f67cef7f61a2f9ae37ec75d6edc142c0007b47af`.

**FATO CONFIRMADO:** os resultados de 22/10 abaixo permanecem como histórico separado. O [recibo versionado](verification/cartoon-consistencia-2210-suite.json) inclui as provas de 23/10 e conserva o objeto histórico de 22/10.

## Evidência histórica de 22/10/2026

**FATO CONFIRMADO / IMPLEMENTADO:** trabalho na branch `codex/cartoon-consistencia-2210`; base final `origin/main` `1b991815ca62701c2c6e06a69aa2eba068e63d5f`, incorporada sem conflitos. Commits próprios com `[TRAVA 8.2 — vai do fundador 22/10 "vamos dar tração em todas"]`. Sem deploy, PR, chamadas pagas, leitura de `.env`, migration ou mudança de preços, motor e tetos. `lib/engineWall.ts` e `lib/homeVideoCuration.ts` preservados.

**FATO CONFIRMADO / IMPLEMENTADO:** cada cena passa por um edit `fal-ai/nano-banana/edit` dos retratos canônicos e segue em Seedance 1.5 image-to-video, 720p, sem áudio do modelo. Todos os keyframes precisam estar moderados antes dos clipes; referência que falha aciona o fluxo de estorno, sem fallback para texto. O elenco recebe imagens e fichas individuais: Mia conserva sua roupa, Leo a dele; as instruções proíbem transferir aparência ou inventar gêmeos. Fontes: `lib/kidsCartoon/cartoonReferenceServer.ts:9`, `lib/kidsCartoon/cartoonConsistency.ts:16`, `app/api/generate-video-cinematic/route.ts:6962`.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** “Leo finds…” já era aceito na entrada. A falha reproduzida era a saída válida com “leo” minúsculo: antes 502 após duas tentativas; depois 200 na primeira, em EN/PT/ES. Retirada a duplicação automática do nome no prompt; não há prova de que ela causava o incidente de produção. “Make another cartoon” agora limpa ideia digitada, ideia pronta e cópia, preservando a tela clara. Fontes: `lib/kidsCartoon/kidsCartoon.ts:171`, `lib/kidsCartoon/kidsCartoon.ts:187`, `components/kidsCartoon/KidsCartoonTemplate.tsx:374`. Comparação visual: [antes/depois](previews/cartoon-consistencia-2210-before-after.html), [desktop](previews/cartoon-consistencia-2210-desktop.png) e [mobile](previews/cartoon-consistencia-2210-mobile.png).

**FATO CONFIRMADO / TESTADO LOCALMENTE:** o builder real reproduziu filmes de 13,5 e 14,2 s, usando o áudio como relógio. O ajuste final redistribui os clipes assinados até pelo menos 15 s, sem loop, congelamento ou alteração da voz. Imagem insuficiente, duplicada ou não assinada segue rejeição e estorno antes do render. Cartoon de 35 s e outros produtos mantêm o objeto original. Fontes: `lib/kidsCartoon/cartoonDuration.ts:30`, `app/api/compose/route.ts:3561`.

**FATO CONFIRMADO — CÁLCULO, NÃO FATURA:** preços públicos fal consultados em 22/10: [edit](https://fal.ai/models/fal-ai/nano-banana/edit) a US$ 0,0398/imagem; [Seedance silencioso](https://fal.ai/models/fal-ai/bytedance/seedance/v1.5/pro/image-to-video) a US$ 1,20/milhão de tokens, calculados por largura × altura × 24 fps × segundos / 1024. Implementação: `lib/kidsCartoon/cartoonConsistency.ts:7`.

| Plano | Três imagens | Vídeo 720p | Subtotal conhecido |
|---|---:|---:|---:|
| 3 × 6 s | US$ 0,11940 | US$ 0,46656 | US$ 0,58596 |
| 3 × 7 s | US$ 0,11940 | US$ 0,54432 | US$ 0,66372 |
| 3 × 8 s | US$ 0,11940 | US$ 0,62208 | US$ 0,74148 |

**FATO CONFIRMADO / IMPLEMENTADO:** uma cena extra de 6 s após três de 8 s elevaria esse subtotal a US$ 0,897. Cartoon de 15 s recusa retry pago antes do mutex/fornecedor. O cron pausa a posição/ciclo após falha com financiamento anterior, mesmo após estorno ou reativação, e confirma o registro antes do POST. Episódios continuam devidos; a pausa exige revisão e não conta como entrega. Fontes: `app/api/retry-hollywood-scene/route.ts:217`, `lib/kidsVenda/cron.ts:238`, `lib/kidsVenda/cron.ts:291`.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** havia duplicação de música após expirar um aquecimento aceito. Só no Cartoon de 15 s verificado, compose agora aguarda o mesmo job ou usa o catálogo infantil; ausência/erro de registro também usa catálogo. Outros produtos e 35 s conservam o comportamento. Uma [Lyria](https://fal.ai/models/fal-ai/lyria3/pro) custa US$ 0,08 por áudio, consulta de 22/10. Fontes: `lib/audioNoClique.ts:178`, `app/api/compose/route.ts:802`.

**HIPÓTESE — CENÁRIO CONDICIONAL:** o perfil default do render é 1080 × 1920 a 24 fps (`lib/renderProfile.ts:99`). Para exatamente 15 s, a [fórmula Creatomate](https://creatomate.com/docs/account/how-are-credits-calculated) resulta em 7,46496 créditos; não foi presumido arredondamento. Pelo [Growth 10K público](https://creatomate.com/docs/account/how-does-the-pricing-work), US$ 129/10.000, isso alocaria US$ 0,096297984. Com o plano 3 × 8 s e uma música, restariam US$ 0,010855349 na fórmula líquida do piloto `(29 × 0,971 − 0,30)/30`, antes de GPT, voz e Whisper. Contrato e perfil ativos não foram consultados; 15 s é piso, não teto do render.

**QUESTÃO PENDENTE / DESCONHECIDO:** custo total e margem efetiva permanecem desconhecidos. US$ 0,85 não está certificado como teto total. Faltam conciliar tokens, caracteres, fornecedor da voz, caches/tentativas e fatura do render. Não foram interpoladas coortes antigas de outro produto.

**TESTADO LOCALMENTE:** suíte inteira contra a base 1b, com resultados brutos preservados:

| Rodada | Testes | Verdes | Vermelhos |
|---|---:|---:|---:|
| Base 1b | 989 | 846 | 143 |
| Alvo, rodada completa bruta | 991 | 841 | 150 |
| Alvo, consolidado após reâncoras e repetições explícitas | 991 | 848 | 143 |

**TESTADO LOCALMENTE:** nenhum vermelho novo nem novo check falho dentro dos 143 históricos. A falha por prazo de Ads-Roteiros passou na única repetição, sem alteração de código ou asserção; a causa permanece hipótese. Depois foram repetidos os 49 guardiões afetados e dependentes. A auditoria interna dos agregados detectou uma regressão intermediária em A3 e um novo membro falho escondido em U4. Os seletores foram corrigidos: referências e conteúdos voltaram à base, A3 voltou a verde e A2 permaneceu verde, e os conjuntos de membros falhos de A4b/U4 coincidem com a base.

**TESTADO LOCALMENTE:** TSC verde na base e no produto; nenhum código de produto mudou após a rodada completa em `41b45ecb`. O guardião Cartoon soma 457 provas e 25/25 mutantes rejeitados; desfaz exato dos 23 arquivos existentes para 1b, com LF/CRLF e idempotência. Reâncoras: Ads-Cena-Retomada, Âncora-Legenda, Cena-Clássica-Retentativa, Cena-Negação, Contrato-Clássicos, Desenho-Som, Kling25, Moderação, Seedance-3x6, Trilha, os dois Veo, F1F4, F1-Vírgula e F1F3-Ajuste. As asserções antigas foram preservadas; a camada Cartoon sai pelo desfaz e apenas seus commits nominais autorizados saem dos históricos alheios. [Recibo completo](verification/cartoon-consistencia-2210-suite.json).

**QUESTÃO PENDENTE / DESCONHECIDO:** identidade visual e duração do MP4 real após a mudança. As provas locais verificam payloads, retratos, montagem e bloqueios; não comprovam produção ou resultado comercial. **SUGESTÃO:** após publicação e teste pago autorizados separadamente, conferir episódios de Leo com Mia e reconciliar os pedidos com a fatura.
