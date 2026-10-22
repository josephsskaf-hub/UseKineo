# KINEO-CARTOON-CONSISTENCIA-2210 — 22/10/2026

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
