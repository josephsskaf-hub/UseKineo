# KINEO-ADS-CENA-95-PLAN-FAILED-2110

**FATO CONFIRMADO — IMPLEMENTADO; 22/10/2026.** Base imutável `3e7ef8a42ea6c1f8566a6dbb55f10cc838b0dbdb`, incorporada antes de editar. Correção restrita ao planejador interno e seus guardiões; nenhuma chamada paga, banco, render, `.env`, publicação ou alteração de cobrança.

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador, 22/10/2026.** Três pedidos dry_run (creme UGC/PT, tênis product/EN, GLOW UGC/EN) retornavam502 `cena_plan_failed` após8–11 segundos. Os JSONs literais, respostas GPT e causa do servidor não acompanharam o relato; foram solicitados. Isso impede atribuir a mesma causa comprovada aos três pedidos de produção.

**FATO CONFIRMADO — causa reproduzida offline.** `lib/ads/cena/plan95.ts` pedia explicitamente1,5s somente ao primeiro gancho; `lib/ads/cena/script95.ts:16` exige esse limite dos três. Duas respostas obedecendo ao prompt, com alternativas de5–7 palavras, esgotavam as duas tentativas e geravam502. O contrato também não declarava os tipos dos campos, embora o validador aceitasse somente strings. O novo contrato declara JSON explícito e limita todos os três ganchos. O reparo recebe o rascunho limitado, causa e contagens, mantendo no máximo duas tentativas de roteiro e três chamadas de planejamento no total.

**FATO CONFIRMADO — outro defeito reproduzido.** `cenaInput` aceita `beneficios:[]`, mas o roteiro rejeitava sempre `benefit:''`. Agora não exige inventar um benefício quando nenhum foi fornecido/extráido; os benefícios digitados continuam obrigatórios e as regras de honestidade, ritmo, oferta e CTA permanecem. As janelas de narração omitem somente a parte vazia e preservam texto integral e pausa de0,35s antes do CTA.

**FATO CONFIRMADO — diagnóstico.** `lib/ads/cena/internal.ts` registra o warn solicitado e devolve `reason` limitado a200 caracteres nos502 internos. Autenticação/admin/lista da casa/flag são verificados antes; as recusas400 de entrada,503 de histórico e422 de moderação permanecem.

**TESTADO LOCALMENTE — provas.** O guardião `scripts/test-ads-cena-95-plan-failed-2110.mjs` exercita o POST real, o adaptador `cenaJson` real e o planejador, com chat.completions simulado (`choices[].message.content` como string JSON e `usage`). Três fixtures representativas cobrem os formatos/idiomas relatados; não são alegadas como cópias dos corpos reais ainda desconhecidos. As mesmas respostas reproduzem502 na base e planos200 na correção. Também cobre pedido sem benefícios/oferta, histórico antigo sem ator, reparo limitado, causa truncada, flag desligada, gates, recusas persistentes e mutantes. Desfaz exato: BUG → Roteiro curto → Ads95 → camadas anteriores, sem remover regras dos guardiões.

**QUESTÃO PENDENTE / DESCONHECIDO.** Resultado dos três JSONs literais de produção, saída real de GPT, disponibilidade dos fornecedores e qualidade audiovisual não foram validados sem acesso/render. O conserto torna a próxima eventual recusa diagnosticável; não promete aprovação de fatos longos demais, imagem não isolada ou conteúdo sem comprovação.

**SUGESTÃO — próximo passo.** Depois da revisão e publicação autorizadas em outra rodada, repetir os três pedidos dry_run literais e conferir200 ou o reason específico. Nenhum preço proposto ou aplicado nesta correção; créditos e estorno existentes intocados.

Resultados da suíte comparada e TypeScript serão registrados após a execução completa.
