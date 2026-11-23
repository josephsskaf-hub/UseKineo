# Correção R7 — editorial e fonte de preço separados

**IMPLEMENTADO / TESTADO LOCALMENTE — 22/11/2026.** Devolutiva da CEO Codex ao lote 3bb319880, parecer docs/revisoes-2211/citacoes-compradores-2111.md. Mesmo ramo codex/citacoes-compradores-2111. Código do conserto 831705430a6eac4c927b5b0d8e8a770e7db23bde. Sem publicação, gasto, render, conta nova, submissão IndexNow ou alteração de preço.

**FATO CONFIRMADO:** app/vs/invideo-alternatives-faceless-shorts/page.tsx:44–62 passa reviewDate=BUYER_BATCH2_DATE ao molde da página. O Article e o WebPage editorial têm dateModified 21/11, e o sitemap conserva lastmod 21/11 porque a resposta foi revista nesse dia. O snapshot local das fontes de preço tem identificador próprio, tipo CreativeWork, dateModified 03/11 e citation com a URL primária já existente. Article, WebPage e snapshot são ligados por IDs; a data do snapshot não é apresentada como data de modificação do site do fornecedor. O texto visível distingue revisão editorial e conferência da fonte.

**FATO CONFIRMADO:** nenhuma data de verificação de concorrente foi avançada sem nova leitura. O parágrafo de fonte de InVideo de 03/11, a referência histórica de 08/10 e a tabela histórica de quatro alternativas de 11/09 permanecem com suas datas. Valores continuam vindo dos módulos já usados; não foram adicionados preços literais em JSX. O componente genérico CitationAnswerPage não foi alterado.

| Escopo | Data preservada/corrigida | Onde a prova aparece |
|---|---|---|
| Resposta e fluxo editorial do InVideo | 2026-11-21 | “Reviewed”, time editorial, Article e WebPage #buyer-answer |
| Fontes de preço de InVideo, leitura de 03/11 | 2026-11-03 | time da fonte, parágrafo com fonte/checkedOn e CreativeWork #invideo-pricing-snapshot |
| Página no sitemap | 2026-11-21 | lastmod, protegido pelo R7 seletivo |
| Tabela histórica das quatro alternativas | 2026-09-11 | Caption e fontes da tabela conservados |

## O que o teste agora protege

**TESTADO LOCALMENTE:** reprodução antes do conserto, node scripts/test-vs-rivais-0311.mjs, saída 1: R7 lastmod 21/11 versus expectativa única de 03/11; R7 dateModified escolhia o primeiro WebPage e esperava 03/11. A seleção por posição não distinguia os escopos.

**TESTADO LOCALMENTE:** R7 corrigido exige sitemap 21/11 só na URL InVideo (as demais comparações continuam em 03/11); Article e WebPage editorial 21/11; snapshot e checkedOn da fonte 03/11; URL primária preservada; ligação entre os três nós; duas datas visíveis. Os 26 mutantes existentes continuam ativos. Quatro novos mutantes fazem regredir a data editorial visível, fingir nova leitura de preço, voltar o Article à data antiga e voltar o sitemap a 03/11.

**TESTADO LOCALMENTE:** execução isolada final, sem servidor local, mundo real PASS e **30/30 mutantes vermelhos**, saída 0. A primeira tentativa desta volta detectou também uma checagem sensível à grafia dateTime do HTML do React; ela foi corrigida para comparação sem distinção de maiúsculas do atributo, sem retirar a exigência das duas datas. O limite de avaliação do carregador offline continua igual.

**CORREÇÃO DE EVIDÊNCIA ANTERIOR:** a bateria antiga retornou zero vermelho novo porque o R7 também falhou na base por outro motivo: R5 /llms.txt excedeu 5.000 ms. A candidata falhava em R7. Comparar somente status de saída não separou as causas. Os logs antigos são preservados, mas aquele resultado não deve ser usado para dizer que R7 estava aprovado. Nesta volta, R7 é executado isoladamente e separado dos demais guardiões, com inspeção de “PASS mundo real” e das mutações; o arquivo novos-vermelhos não foi alterado.

**COMPARADOR FINAL:** 46 guardiões cobertos: R7 isolado verde (mundo real + 30 mutantes, comparador saída 0) e outros 45 pelo comparador, 25 já vermelhos na main f9e8e26bc, zero vermelho novo, saída 0. Inventário inclui test-paginas-ia-0111.mts. Checkout efetivo da base confirmado pelo reflog e registrado no agregado GUARDIOES-R7-2211.json.

**TIPOS:** TypeScript bruto completo --noEmit --incremental false, saída 0, depois do fechamento dos comparadores. Nenhum arquivo de produto foi alterado depois do código fotografado.

## Preservação e fotos reais

**EVIDÊNCIA LOCAL:** quatro pares antes/depois do Next real: 1920/390, claro/escuro, visitante, cookies recusados no controle. 16 JPGs antes e 18 depois; cabeçalho, bloco de decisão, fontes de preço e FAQ. Zero exceções de runtime registradas, nenhum aumento do scroll. HTML autocontido fora do Git: C:/kineo/docs/citacoes-compradores-2111/provas-r7-2211/COMPARACAO-R7.html (6.347.911 bytes). DOM, JSON-LD e logs no mesmo diretório, ignorado por regra local exata. Nenhuma prova pesada foi adicionada ao bundle ou a .codex/visualizations.

| Tema/largura | Parágrafos antigos preservados | Tabelas antigas preservadas | 1ª resposta | Datas do JSON-LD |
|---|---:|---:|---|---|
| light / 1920 | 26/26 | 2/2 | Idêntica | Article/WebPage 2026-11-21; preço 2026-11-03 |
| light / 390 | 26/26 | 2/2 | Idêntica | Article/WebPage 2026-11-21; preço 2026-11-03 |
| dark / 1920 | 26/26 | 2/2 | Idêntica | Article/WebPage 2026-11-21; preço 2026-11-03 |
| dark / 390 | 26/26 | 2/2 | Idêntica | Article/WebPage 2026-11-21; preço 2026-11-03 |

**TESTADO LOCALMENTE:** test-citacoes-compradores-2111 também passou depois do conserto: dez páginas, 20 perguntas, parágrafos/tabelas anteriores, uma FAQPage por página e três controles fora do alvo. Nenhum TS/TSX mudou depois das fotos. Os novos scripts de teste continuam usando os módulos reais offline; as fotos usam Next sem mocks.

## Medida desta entrega

**EVIDÊNCIA DE PRODUÇÃO — SELECT somente leitura**, corte 22/11 01:39:50 BRT. Desde o marco publicado da primeira leva (21/11 23:47): **3 sessões explícitas ChatGPT**, de dois atores identificados; home 2 e gerador PT 1. Outras origens 20 sessões no total após filtros, das quais 16 sem origem explícita; estas não entram em ChatGPT. Mesmo relógio do dia anterior: ChatGPT 0, todas as origens 26 e sem origem 26. Não se calcula crescimento percentual sobre zero.

**FATO CONFIRMADO / LIMITE:** sessão é entrada registrada por aba, não pessoa, cadastro, filme ou pagamento. Critério de ChatGPT e exclusão de bots/internos são os mesmos do MEDIDA anterior. Banco lido em 22/11 01:39:50 BRT, corte truncado ao segundo no próprio banco, sem tempo futuro. MEDIDA-R7-2211.sql/.json contêm todas as entradas e controles; a janela de 14 dias completos continua em 08–22/11 e não deve ser somada à janela desde o deploy. A correção R7 e as dez páginas da segunda leva ainda não foram publicadas, portanto esses números não medem efeito delas.

**O que estava errado:** tratamos um vermelho diferente na base como prova suficiente para descartar R7; a revisão isolada mostrou a regressão real. A correção concreta é identificar os escopos de data e conferir esse guardião sozinho, sem alterar números de preço ou simular frescor de fonte.

**PRÓXIMO PASSO RECOMENDADO:** CEO Codex reexecutar R7 e conferir os quatro novos mutantes, sitemap, Article e snapshot por seus IDs. O aval do dono ao lote anterior segue registrado; publicação continua com a CEO após a revisão. Não há nova aprovação de foto sendo solicitada nesta sessão. Sem janela pós-publicação da segunda leva, ganho de tráfego ou pagamento segue desconhecido.
