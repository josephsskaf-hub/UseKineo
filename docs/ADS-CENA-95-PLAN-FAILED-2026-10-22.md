# KINEO-ADS-CENA-95-PLAN-FAILED-2110

**FATO CONFIRMADO — IMPLEMENTADO; 22/10/2026.** Base imutável `3e7ef8a42ea6c1f8566a6dbb55f10cc838b0dbdb`, incorporada antes de editar. Correção restrita ao planejador interno e seus guardiões; nenhuma chamada paga, banco, render, `.env`, publicação ou alteração de cobrança.

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador, 22/10/2026.** Três pedidos dry_run (creme UGC/PT, tênis product/EN, GLOW UGC/EN) retornavam502 `cena_plan_failed` após8–11 segundos. Os JSONs literais, respostas GPT e causa do servidor não acompanharam o relato; foram solicitados. Isso impede atribuir a mesma causa comprovada aos três pedidos de produção.

**FATO CONFIRMADO — causa reproduzida offline.** `lib/ads/cena/plan95.ts:41` na base pedia explicitamente1,5s somente ao primeiro gancho; `lib/ads/cena/script95.ts:16` exige esse limite dos três. Duas respostas obedecendo ao prompt, com alternativas de5–7 palavras, esgotavam as duas tentativas e geravam502. O contrato também não declarava os tipos dos campos, embora o validador aceitasse somente strings. `lib/ads/cena/script95Contract.ts:5` declara JSON explícito e limita todos os três ganchos. `lib/ads/cena/plan95.ts:43` e `script95Contract.ts:9` enviam ao reparo o rascunho limitado, causa e contagens, mantendo no máximo duas tentativas de roteiro e três chamadas de planejamento no total.

**FATO CONFIRMADO — outro defeito reproduzido.** `lib/ads/cena/plan.ts:33` (`cenaInput`) aceita `beneficios:[]`, mas `lib/ads/cena/script95.ts:19` na base rejeitava sempre `benefit:''`. Agora não exige inventar um benefício quando nenhum foi fornecido/extráido; os benefícios digitados continuam obrigatórios e as regras de honestidade, ritmo, oferta e CTA permanecem. `lib/ads/cena/captions95.ts:47` e `:56` omitem somente a parte vazia e preservam texto integral e pausa de0,35s antes do CTA.

**FATO CONFIRMADO — diagnóstico.** `lib/ads/cena/internal.ts:52` registra o warn solicitado e devolve `reason` limitado a200 caracteres nos502 internos (`:56`). Autenticação/admin/lista da casa/flag são verificados antes; as recusas400 de entrada,503 de histórico e422 de moderação permanecem.

**TESTADO LOCALMENTE — provas.** O guardião `scripts/test-ads-cena-95-plan-failed-2110.mjs` exercita o POST real, o adaptador `cenaJson` real e o planejador, com chat.completions simulado (`choices[].message.content` como string JSON e `usage`). Três fixtures representativas cobrem os formatos/idiomas relatados; não são alegadas como cópias dos corpos reais ainda desconhecidos. As mesmas respostas reproduzem502 na base e planos200 na correção. Também cobre pedido sem benefícios/oferta, histórico antigo sem ator, reparo limitado, causa truncada, flag desligada, gates, recusas persistentes e mutantes. Desfaz exato: BUG → Roteiro curto → Ads95 → camadas anteriores, sem remover regras dos guardiões.

**QUESTÃO PENDENTE / DESCONHECIDO.** Resultado dos três JSONs literais de produção, saída real de GPT, disponibilidade dos fornecedores e qualidade audiovisual não foram validados sem acesso/render. O conserto torna a próxima eventual recusa diagnosticável; não promete aprovação de fatos longos demais, imagem não isolada ou conteúdo sem comprovação.

**SUGESTÃO — próximo passo.** Depois da revisão e publicação autorizadas em outra rodada, repetir os três pedidos dry_run literais e conferir200 ou o reason específico. Nenhum preço proposto ou aplicado nesta correção; créditos e estorno existentes intocados.

**TESTADO LOCALMENTE — suíte inteira, 22/10/2026.** Fontes congeladas em `c2b64bd23423cbfb5f716c7f0eb600614fb4b8d3`, comparadas com a base3e acima. O commit posterior só completa este relatório.

| Fonte | Scripts executados | Integral bruta: verdes / vermelhos | Após repetições justificadas: verdes / vermelhos |
|---|---:|---:|---:|
| Base3e | 986 / 986 | 833 / 153 | 837 / 149 |
| Candidata c2b | 987 / 987 | 836 / 151 | 838 / 149 |

**FATO CONFIRMADO — evidência dos recibos locais abaixo.** `newRed=[]`, `changedRedChecks=[]`, `fixed=[]`; os986 logs compartilhados foram comparados. Os149 scripts ainda vermelhos são os mesmos da base; não é uma suíte totalmente verde. TSC real `--noEmit --incremental false` encerrou com código0 nos dois lados (base175494ms; candidata252681ms). O guardião novo passou com10 mutantes detectados; o inventário focado dos guardiões Ads anteriores manteve147 mutantes detectados. Não são contagens globais de todos os mutantes do repositório. O desfaz do roteiro curto manteve suas725 verificações.

**FATO CONFIRMADO — contexto preservado, sem trocar fontes, relógios, limites ou assertions.** A base teve C1 de `test-ads-roteiros-1310.mjs` e dois timeouts internos de VM (`test-paginas-ugc-2010.mjs` G5; `test-motores-geo-2026-10-06.mjs` M3/M4); os três passaram em execuções isoladas. I4 de `test-ads-cena-1310.mjs` falhou inicialmente na candidata ao consumir a margem de carregamento anterior ao deadline; o teste inteiro passou60/60 sequencialmente na base e na candidata. Teste, loader, compilador e13 fontes do runtime de v2Brief têm hashes iguais. As duas fixtures Git foram repetidas com remotos exclusivamente locais/file-only: transporte passou; publicador manteve seus8/12 ancestrais. Uma tentativa da candidata excedeu MAX_PATH pelo TEMP longo; a repetição usou exatamente o TEMP nativo curto da base. Todas as tentativas e logs brutos permanecem separados. Não se atribui nenhuma dessas diferenças a uma correção de produto.

**FATO CONFIRMADO — isolamento.** Zero bloqueios das guardas e zero timeouts EXTERNOS do runner; os timeouts internos brutos estão descritos acima. Os sete testes que mutam fontes rodaram em sequência, terminaram com código0, exigiram zero reparos de bytes e deixaram as duas snapshots limpas. Os mutantes de prompt verificam o contrato de instrução com um dublê; não provam a obediência do modelo real.

**TESTADO LOCALMENTE — recibos auditáveis.** Pasta local `.claude/ads-cena-95-plan-failed-proof-2210/` na árvore principal do repositório; inventários, stdout/stderr por script, classificação nominal das153 falhas iniciais e tentativas originais preservados. SHA-256 dos recibos consolidados:

| Recibo | SHA-256 |
|---|---|
| `ads-cena-95-plan-failed-origin-main-round.json` | `719393650e76b923e6a9fddb9aea46a1a5a4bbc984e6fcd14a46018e3911065c` |
| `ads-cena-95-plan-failed-final-c2b-round.json` | `39881d363783a5b47f1cc5f51e2bba989ef62a84c470988e5a71957462a74803` |
| `ads-cena-95-plan-failed-final-c2b-comparison.json` | `8e6563757816b2b091b2721013f4d8eb1b3b045ba74a2f8f2926896b701151e6` |
| `context-retry-proof.json` | `d250fad5a2dbeb93b39e9c4ffd13683f9b4179bc93b848ca08bb61f37fdd92df` |
| `i4-source-hashes.json` | `b7f269270c1506e8a189a1b14f68db11d65ce28fe5ccdca25a795c2815ce1ca7` |

**FATO CONFIRMADO — arquivos desta camada (`git diff 3e7ef8a42 c2b64bd2 --name-only`).** Produto: `internal.ts`, `plan95.ts`, `script95.ts`, `captions95.ts` e o novo `script95Contract.ts`, todos em `lib/ads/cena/`. Provas: `scripts/test-ads-cena-95-plan-failed-2110.mjs`, `scripts/test-ads-cena-95-2110.mjs`, `scripts/test-roteiro-curto-undo-2210.mjs`. Desfaz: `scripts/test-support/desfaz-ads-cena-95-plan-failed-2110.mjs`, seu `-fontes.json` e `desfaz-roteiro-curto-2210.mjs`. Este relatório completa os12 arquivos. `engineWall`, `homeVideoCuration`, preços, níveis, cobrança, estorno e rota pública/admin permanecem sem diff contra3e.
