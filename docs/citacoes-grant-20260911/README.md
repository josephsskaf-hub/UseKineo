# [Citações] Menor grant mensal para Kling e Veo

**IMPLEMENTADO · 11/09/2026.** Patch isolado sobre `9bf0525e799e311191aa076593daed6b7b4aff86`, branch `codex/citacoes-grant-20260911`. O único delta funcional são dois valores em `lib/growth/enginePageCatalog.ts`: Kling passa de `Studio` para `Starter`; Veo passa de `Studio` para `Creator`.

**FATO CONFIRMADO.** O tipo `Engine.tier` descreve o menor grant mensal capaz de pagar uma referência inteira, não um bloqueio de acesso (`lib/growth/enginePageCatalog.ts:30`). Os custos são 50 créditos em Kling e 100 em Veo para 60 segundos, derivados de `creditsPerReferenceVideo` (`lib/marketingPrice.ts:86`). A sequência de grants mensais de `TIER_CREDITS` é 60/150/300 (`lib/checkoutPricing.ts:424`), portanto os primeiros grants suficientes são respectivamente Starter e Creator. Fontes verificadas em 11/09/2026.

**FATO CONFIRMADO.** Os consumidores existentes propagam os valores para a nota abaixo do hero, a linha da ficha técnica, as linhas do comparativo presente nas páginas de motores e os cards do hub. As cores dos dois rótulos no comparativo e no hub também acompanham a condição existente de `tier`. Os consumidores não foram editados: `app/ai-video-generator/[engine]/page.tsx:118`, `app/ai-video-generator/page.tsx:118`.

**TESTADO LOCALMENTE.** `node docs/citacoes-grant-20260911/verify-and-preview.cjs` passou com seis checks: diff de exatamente dois valores; primeiro grant suficiente pelos helpers reais; igualdade de todos os demais dados do catálogo; fontes protegidas e consumidores intactos; seis contextos visuais afetados renderizados; elegibilidade dos CTAs grátis inalterada. Sem tentativa de rede nem vídeo gerado. Horário e hashes: [verification.json](verification.json).

**TESTADO LOCALMENTE.** `node C:/kineo/node_modules/typescript/bin/tsc --noEmit --incremental false` terminou com código 0 para todas as fontes TypeScript incluídas no projeto. Na cópia disponível da `.next/types` havia apenas `package.json`, sem tipos gerados de rotas: não se apresenta este resultado como validação desses tipos. Não foi feito build nem geração de tipos; a `.next` da raiz permaneceu intacta.

**IMPLEMENTADO.** [preview.html](preview.html) contém pares antes/depois em desktop de 1100 px e mobile de 390 px: duas notas do hero, duas fichas técnicas, as duas linhas afetadas do comparativo e os dois cards do hub. O gerador extrai o JSX real dos consumidores intactos. Os cards usam o estado sem mídias; as tabelas conservam os estilos e comportamentos existentes. O HTML pode ser visualizado sem build, servidor ou rede.

**QUESTÃO PENDENTE.** A raiz fará QA no Next real e os gates apropriados da integração. Este patch não muda preços, grants, bloqueios de acesso, FAQs, intros, CTAs, V1 ou V2; não declara saneamento de outros textos. Não houve publicação, push ou enfileiramento nesta worktree. A raiz executará o transporte sob coordenação do Board.
