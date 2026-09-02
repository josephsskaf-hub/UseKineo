# HANDOFF CODEX → CLAUDE — RODADAS 199–200

**Data:** 2026-09-02
**Pista:** Growth / B2C
**Commit funcional:** `115e7edca9a7455c360ef7781b27fd475a1588bb`
**Deploy:** `dpl_5bEkkRKVQqE6G6TztmgAeapAPf45` · READY · production · `aliasError=null`

## 1. Decisão comercial preservada

**DECISÃO APROVADA.** A jornada comercial permanece integralmente em USD. Site, oferta, checkout e cobrança devem coincidir em moeda e informação no último segundo da decisão. Estas rodadas não alteraram preço, moeda, SKU, crédito, Stripe ou copy.

## 2. Evidência que motivou a rodada

**EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT somente leitura em 2026-09-02 UTC; contas internas excluídas).** Entre seis pessoas com `result_video_value_sampled` confirmado para a primeira entrega, duas tiveram uma superfície de decisão registrada depois da amostra, quatro não tiveram, uma iniciou checkout depois da amostra, nenhuma concluiu pagamento e nenhuma teve segundo vídeo confirmado no recorte.

**LIMITAÇÃO OBRIGATÓRIA.** Esse recorte começa em quem assistiu cinco segundos e, sozinho, não contém o grupo `not_sampled`. Ele é diagnóstico, não abre gate e não prova causalidade.

## 3. O primeiro desenho foi reprovado

**AUDITORIA ADVERSARIAL / NO-GO inicial.** A primeira versão do relatório:

- selecionava somente pessoas com `result_video_value_sampled`, criando viés de seleção;
- tratava perfil sem e-mail como externo;
- chamava toda entrada no viewport de exposição humana e misturava eventos antigos sem versão;
- usava janela móvel de sete dias na mesma borda do gate.

Nada dessa versão foi commitado ou publicado.

## 4. Contrato v2 implementado

**IMPLEMENTADO.** `scripts/measure-result-video-decision-funnel.mjs` e `scripts/result-video-decision-report.mjs` agora:

- constroem o denominador pelo primeiro row `videos.status=completed` de cada pessoa, lendo todo o histórico para não classificar retorno como primeira entrega;
- usam a fronteira fixa `2026-09-01T18:48:08.098670+00:00`, o primeiro sample persistido observado em produção;
- separam a coorte em `sampled` e `not_sampled`;
- contam como pessoa externa somente `user_id` autenticado com perfil e e-mail presentes, excluindo a lista canônica de contas internas;
- mantêm perfil ausente e e-mail vazio como identidade desconhecida, nunca como externo;
- separam dwell estrito, exposição qualificada de viewport e sinais apenas diagnósticos;
- validam as versões de evento lendo as constantes diretamente dos módulos canônicos;
- verificam segundo vídeo por `attempt_id` diferente e deixam linhas sem ID como não verificáveis;
- medem pricing, checkout e pagamento somente depois da primeira entrega e, no grupo sampled, também depois da amostra de valor;
- declaram associação, nunca lift causal.

**IMPLEMENTADO.** `scripts/measurement-helpers.mjs` centraliza paginação e leitura AST da lista canônica de contas internas e das versões de evento. O relatório de afiliados passou a reutilizar o helper sem mudança de contrato.

## 5. Gate que governa a próxima decisão

**DECISÃO PRESERVADA / GATE.** Não alterar novamente as superfícies atuais antes de:

- 20 pessoas externas com primeira entrega depois da fronteira;
- pelo menos cinco `sampled`;
- pelo menos cinco `not_sampled`;
- sete dias completos desde a fronteira;
- ou primeiro pagamento real que justifique reconciliação imediata.

Eventos, sessões, rows anônimos, identidades desconhecidas e testes internos não entram como pessoas.

## 6. Validação

**TESTADO LOCALMENTE.**

- relatório B2C v2: 51/51;
- relatório de afiliados: 45/45;
- ledger de afiliados: 83/83;
- missões de afiliados: 63/63;
- sampler do vídeo entregue: 53/53;
- sintaxe Node dos três módulos novos: limpa;
- whitespace: limpo com `core.whitespace=cr-at-eol`.

**BASELINE DE TIPO.** `tsc --noEmit` repetiu exatamente três erros preexistentes e fora do escopo: dois de versão Stripe em `app/api/admin/_shared/mrr.ts` e `app/api/me/subscription/route.ts`, e um `Promise<Promise<T>>` em `components/TrialDowngradeModal.tsx`. Nenhum arquivo TypeScript foi alterado.

**AUDITORIA ADVERSARIAL FINAL:** GO · P0=0 · P1=0. O único P2 de nomenclatura foi corrigido antes do commit.

**VALIDADO EM PRODUÇÃO.** `origin/main` recebeu o SHA funcional por fast-forward. O deploy Vercel acima chegou a READY, target production, SHA exato e aliases `www.usekineo.com` / `usekineo.com`, sem erro de alias. Como a entrega contém apenas scripts manuais de medição, nenhuma UI ou rota de produção mudou.

## 7. Próxima rodada

**SUGESTÃO.** Alternar para B2B. O diagnóstico já identificado para o gerador de anúncio local permanece sem edição: medir `local_business_brief_viewed → local_business_brief_generated → local_business_brief_activation_clicked`; gate de 10 sessões elegíveis e três briefs gerados antes de considerar um caminho secundário para packs.

**COORDENAÇÃO.** Claude pode continuar produto pós-login. Não há alteração em `GenerateClient.tsx`, render, cenas, voz, legendas, créditos, checkout ou preço nestas rodadas.
