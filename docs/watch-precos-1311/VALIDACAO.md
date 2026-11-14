# Preços WATCH · opção A · revisão local

**IMPLEMENTADO / TESTADO LOCALMENTE · 14/11/2026 (São Paulo).** Ramo `codex/watch-precos-1311`, criado após `git fetch origin`, sobre `56e24d47a8b3a4f1fad64e0f829c1794ae086500`. Entrega isolada em `m6-precos`; nenhum push, deploy, compra ou alteração em backend. Início e entrega registrados por acréscimo no quadro compartilhado.

## Resultado para olhar

**TESTADO LOCALMENTE.** Abra [COMPARACAO.html](COMPARACAO.html): arquivo autocontido de 7,1 MB, CSS e nove PNGs embutidos. Contém antes/depois da primeira tela e da página inteira em 390 e 1920 pixels, mais anual com detalhes abertos. Não precisa de internet, build ou servidor. Os PNGs originais estão em [prints](prints/), com dimensões/estado e rede da execução em [CAPTURAS.json](CAPTURAS.json); dimensões PNG efetivas e SHA-256 em [ARTEFATOS.json](ARTEFATOS.json).

**FATO CONFIRMADO.** A flag `WATCH_PRICING_PUBLIC` continua `false` em `lib/pricingWatch.ts:3`. A rota pública `/pricing` usa o layout anterior; a revisão está em `/pricing-preview?billing=monthly` e `/pricing-preview?billing=annual`, com `noindex`, canonical de `/pricing` e ausência no sitemap (`app/pricing-preview/page.tsx:5`). O novo guardião compara o HTML SSR da apresentação pública com a base nos dois períodos e nas duas condições de liquidação, sem diferença.

**FATO CONFIRMADO.** A opção A usa o mesmo `PricingClient`, os mesmos cálculos e os mesmos handlers de compra. `watchPreview` é uma prop opcional para integração com a Etapa 5 (`app/pricing/PricingClient.tsx:385`). Nenhum arquivo de preço, checkout, assinatura, oferta ou rota de pagamento foi alterado. O componente continua derivando valores de `checkoutPricing`, créditos de `TIER_CREDITS` e equivalências dos helpers canônicos.

## O que mudou

**FATO CONFIRMADO.** O Creator vem primeiro no DOM e na leitura por teclado, seguido de Starter e Studio (`PricingClient.tsx:1262`). A mesma ordem também é usada no desktop para manter a ordem de foco coerente. O cartão compacto tem seis blocos: nome, preço/período/moeda local, créditos, filmes padrão, botão e detalhes (`components/pricing/PlanValueStage.tsx:237`). O botão permanece fora de `details` e preserva o contrato existente: primeiro seleciona, depois compra.

**FATO CONFIRMADO.** `See what's included` começa fechado, mantendo no HTML as equivalências, alternativas de Ads/Cartoon, projetos, HD e tabela por motor. O bloco comum de inclusões aparece uma vez. A garantia canônica fica no topo; a política completa segue na FAQ fechada. Uma única alternância controla mensal/anual. A resposta de créditos explica corretamente os dois períodos de renovação. Contador e depoimento existentes ficam juntos antes das comparações; Business aparece em seção explícita; moeda e conector Claude ficam no rodapé. As respostas completas da FAQ estão no HTML mesmo fechadas (`PricingClient.tsx:2193`).

**TESTADO LOCALMENTE.** Em 390 × 844, o botão do Creator termina aproximadamente em y=580, dentro da primeira tela, e a nota de liquidação BRL está visível sob o preço. A execução verificou ausência de overflow horizontal, textos visíveis com pelo menos 12px, três detalhes fechados com tabelas no HTML e FAQ toda fechada. As medidas exatas estão no manifesto da captura, não são métricas de clientes.

## Verificações

**TESTADO LOCALMENTE.** O typecheck de fonte usou a configuração do repo com os mesmos includes de TypeScript e exclusão adicional de `.next`, por arquivo temporário externo à worktree. O typecheck bruto com tipos gerados permanece registrado como falha herdada abaixo. Logs completos: [WATCH-GUARDIAO.log](WATCH-GUARDIAO.log), [VALIDACAO-TESTES.log](VALIDACAO-TESTES.log) e [TESTES.json](TESTES.json).

| Verificação offline | Resultado |
| --- | --- |
| Novo `test-watch-precos-1311.mjs` | 114 asserções, paridade SSR em 4 cenários, 9/9 mutantes rejeitados pelo alvo esperado |
| `test-pricing-mensal-1111.mjs` | passou; 16/16 mutantes |
| `test-pricing-inclui-0511.mjs` | 7 verificações |
| `test-pricing-plan-choice-attribution.mjs` | 34/34 |
| `test-pricing-tier-handoff.mjs` | 39/39 |
| `test-pricing-detalhe-0611.mjs` | 8 verificações; contrato legado preservado |
| `test-pricing-business-path.mjs` | 10/10 |
| `test-pricing-letra-12-1211.mjs` | 7 verificações; 4/4 mutantes |
| `test-pricing-saved-checkout.mjs` | 65/65 |
| `test-precos-0511.mjs` | 15 verificações; agora protege a conta nos dois ramos do cartão |
| Chromium local | 9 PNGs; anual e detalhes acionados; zero exceções de runtime |
| Typecheck da fonte final, sem artefatos `.next` | passou, exit 0; [TYPECHECK-FONTE.log](TYPECHECK-FONTE.log) |
| `git diff --check` | passou |

**TESTADO LOCALMENTE.** A automação usa Chromium local em perfil temporário, viewport 390 × 844 ou 1920 × 1080 e porta isolada 4188. A foto inteira expande apenas a altura da viewport para pintar todas as camadas; a primeira tela e suas asserções usam as alturas reais acima. Todas as chamadas `/api/*` recebem fixtures locais; qualquer rede externa é bloqueada. Visitante sem sessão, consentimento negado, exibição USD/liquidação BRL e ofertas fechadas. Nenhum botão de checkout foi clicado; nenhum segredo ou `.env.local` foi lido. `CAPTURAS.json` registra o tráfego simulado/bloqueado e zero erros.

## O que está errado ou pode melhorar

**FATO CONFIRMADO / HERDADO.** O typecheck bruto passou antes do dev server gerar tipos. Depois da compilação local, `tsc --noEmit --incremental false` aponta `TS2344` em `.next/types/app/pricing/page.ts`, porque a rota antiga aceita o objeto inteiro de props como opcional. `app/pricing/page.tsx` é idêntico à base e não foi alterado. O erro e a comparação estão em [TYPECHECK-GERADO-HERDADO.log](TYPECHECK-GERADO-HERDADO.log) e [HERDADOS.json](HERDADOS.json). **SUGESTÃO:** corrigir a assinatura da rota em uma alteração separada e repetir o typecheck com os tipos gerados; não tratar o build com erros ignorados como prova de tipos.

**FATO CONFIRMADO / HERDADO.** Dois guardiões antigos não chegam às próprias asserções: `test-precos-cartao-valor-2026-10-09.mjs` falha no desfazedor `semClareza1610`; `test-works-with-claude-2026-09-30.mjs` falha no desfazedor aninhado de H3. A mesma transformação falha com a mesma mensagem sobre a base e sobre este ramo, registrado em `HERDADOS.json`. Os novos testes executam o cartão real e protegem o link honesto do conector, sem alegação oficial/parceria. **SUGESTÃO:** reancorar os dois desfazedores separadamente, com mutantes, sem alterar esta proposta para satisfazer âncoras antigas.

**QUESTÃO PENDENTE.** O estudo aponta divergência antiga na FAQ sobre acesso a Kling; esta entrega preserva a oferta e não tenta inferir um direito novo. Os números e o depoimento de prova social são os já existentes no código, não uma nova medição. **SUGESTÃO:** Growth/CEO confirmar a política real e a atualidade da prova antes da ativação pública.

## O que os concorrentes fazem

**FATO CONFIRMADO (fonte documental fornecida, consulta do estudo em 13/11/2026).** O [estudo aprovado](C:/kineo/docs/ESTUDO-PAGINA-DE-PRECOS-LIDERES-2026-11-13.md) e seus prints comparam [Pika](https://pika.art/pricing), [Higgsfield](https://higgsfield.ai/pricing), [Runway](https://runway.com/pricing), [Kling](https://kling.ai/app/membership/membership-plan) e [InVideo](https://invideo.io/pricing/). O estudo observa plano popular primeiro em Pika/Higgsfield e recomenda reduzir a primeira decisão a preço, créditos, equivalência e botão. Esta entrega adapta essa hierarquia à Kineo e mantém a liquidação local visível. Não é evidência de conversão ou receita desses concorrentes nem da Kineo.

## Próximo passo recomendado

**SUGESTÃO.** CEO revisar o HTML autocontido e aprovar a composição. Integrar a prop `watchPreview` na Etapa 5 mantendo a flag pública fechada; só ativar mediante decisão explícita. Depois de publicação autorizada, medir pessoas externas de `pricing_view` a checkout/pagamento, respeitando os contratos de atribuição existentes. A entrega atual prova apresentação local e preservação de código; não prova resultado comercial ou funcionamento do checkout em produção.

**TESTADO LOCALMENTE / reprodução.** Na worktree completa com dependências existentes, execute os testes listados com `node scripts/<nome>`. Para as fotos, suba Next local em `127.0.0.1:4188` e execute `node scripts/preview-watch-pricing-1311.mjs`; `PRICING_PREVIEW_PORT`, `PRICING_CDP_PORT` e `CHROMIUM_PATH` permitem portas/binário próprios. O script responde APIs em memória e regenera PNGs, manifesto e HTML. Não use conta real para esse procedimento.
