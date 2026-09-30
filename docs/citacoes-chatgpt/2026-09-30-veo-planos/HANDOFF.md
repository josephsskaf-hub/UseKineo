# A30-01 — Veo: planos antes do cadastro — 30/09/2026

**AUTORIZAÇÃO DIRETA / IMPLEMENTADO LOCALMENTE:** fundador pediu ampliar as ações de aquisição pelo ChatGPT nesta sessão. Uma implementação ativa independente; S24-01 permanece congelada em sua branch, aguardando sua revisão, e S24-02 está publicada. Nenhuma tarefa, agenda, renovação ou subagente criado.

**Pergunta do comprador / HIPÓTESE:** “Quero um Short narrado com Veo. Qual plano atende meu trabalho e como assino?” O caminho aos planos deve poder anteceder cadastro e experimentação. A mudança não comprova aumento de tráfego ou conversão.

**Página e mudança / FATO CONFIRMADO:** `/ai-video-generator/veo`: a linha de ações do hero reutiliza o componente já publicado em Seedance. O próximo passo principal passa a ser “See plans & credits” para `/pricing`; “Create your account” continua disponível com `engine=veo` e `intent_campaign=seo_engine_veo`. Fontes: `app/ai-video-generator/[engine]/page.tsx:169`, `components/SeedanceHeroActions.tsx:11,21`, `scripts/test-veo-hero-plans-2026-09-30.mjs:22,25,36`. Nenhuma alteração em preço, créditos, trial, motores, mídia, catálogo ou traduções.

**SHA / PREPARADO:** código testado `cdb154e2e598ff7eaae783b2e448ff42112d5da2`; base `7dbd47c152bad94c4af1b73744db71c7e08aaf3d`; branch `codex/citacoes-veo-planos-20260930`; worktree `C:/kineo-wt/citacoes-empresas-20260925`. Este handoff é documentação posterior aos testes. Commit do handoff não altera o código nem o resultado visual. Deploy novo desconhecido; não enfileirado.

**Testes / TESTADO LOCALMENTE em 30/09/2026:** typecheck bruto PASS. Os 34 scripts compartilhados passaram na base e no candidato; o candidato também passou o novo guardião Veo (24 verificações comportamentais), totalizando 35 scripts. Inclui os 28 contratos críticos atuais. Cinco mutantes rejeitados pelas asserções esperadas, incluindo troca indevida do CTA pago para cadastro. Nenhuma regressão nessa bateria. Fonte privada: `ampliacao-20260930/veo-planos/COMPARACAO-FINAL.json`, com logs da base e candidato preservados. Suítes concluídas de S24 não foram repetidas; não se declara inventário legado inteiro verde nem CI remoto.

**Reancoragem / FATO CONFIRMADO:** os guardiões antigos congelavam a aplicação do componente apenas em Seedance. A extensão explícita a Veo foi reancorada em `scripts/test-citation-engine-metadata.mjs` e `scripts/test-seedance-hero-plans-2026-09-28.mjs:18`; o novo teste compara HTML inteiro dos demais motores (incluindo Seedance) e todo Veo fora da linha de ações contra a base. Título, descrição, canonical e demais metadados idênticos. Não houve normalização ampla de conteúdo ou dispensa de falha.

**Bloqueio anterior / TESTADO LOCALMENTE:** parser `v2Contract` corrigido por Claude (`6fa4a1df`) e contrato crítico preexistente de HistoryClient reancorado pela pista UX/UI (`ff9e975e`), preservados na base. `test-locale-readiness.mjs` e `test-interface-language.mjs` passaram dos dois lados em 30/09. Não há impedimento crítico residual nessa bateria nem edição própria nessas áreas.

**Descoberta / FATO CONFIRMADO:** rota existente no sitemap pelo catálogo (`app/sitemap.ts:255`), ligação interna dos demais motores (`app/ai-video-generator/[engine]/page.tsx:411`), canonical próprio preservado. Não há `noindex` novo no layout ou página e a rota não coincide com a lista de bloqueios (`app/robots.ts:39`). FAQ e marcação ficam idênticas à base pelo teste de HTML fora do hero. Não houve alteração em fontes compartilhadas reservadas, robots ou sitemap.

**Preview / PREPARADO:** `C:/Users/josep/.codex/outputs/01a088dd-908c-7c42-9bac-3e886e72a785/ampliacao-20260930/veo-planos/preview-cdb154e2/antes-depois.html`. Antes/depois completo em 1040 e 390px, com metadados e contexto da página. Posters próprios autorizados incorporados; sem reprodução, navegação, cliente real ou rede. Componentes compartilhados sem alteração identificados; fonte Arial de fallback; oferta em fixture canônica ON sem leitura de ambiente. Abertura no painel retornou queued. Revisão humana própria permanece pendente; não se alega inspeção de pixels concluída.

**Publicação / QUESTÃO PENDENTE:** após aprovação deste resultado, fetch e conciliação da fila/origin, mantendo candidatos de outras pistas. `scripts/enfileirar.sh` no fluxo autorizado; fundador publica via `C:/kineo/SUBIR-SITE.bat`. Sem push direto ou publicação de trabalho alheio. Após deploy, verificar somente conteúdo/CTAs/destinos/atribuição alterados, informar a Master para público comprador de Shorts narrados com Veo e submeter somente a URL alterada pelo procedimento IndexNow autorizado. Submissão não comprova indexação.

**URL entregue à Master / QUESTÃO PENDENTE:** nenhuma URL nova pronta para distribuição desta A30-01; publicação pendente. S24-02 anterior fica separada.

**Exposição ou compradores / DESCONHECIDOS:** preparação, testes e commits não são pessoas ou receita. Sem nova consulta financeira ou atribuição ChatGPT inventada. Sucesso comercial requer fonte externa autorizada depois da publicação; não se promete multiplicação de visitas, clientes ou MRR.

**Próximo impedimento / QUESTÃO PENDENTE:** revisão visual própria deste pacote. Recomendação: aprovar Veo e as duas portas S24-01, cada qual pelo seu preview; alternativa: apontar ajuste específico. Aceite de agências ou Seedance não substitui esta revisão.
