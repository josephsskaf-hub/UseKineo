# A1 — campanhas mensais preservadas no pricing

**IMPLEMENTADO / TESTADO LOCALMENTE — 16/09/2026. PUBLICAÇÃO PENDENTE.**

Autorização do fundador transmitida pelo Board: “Aprovado suas sugestões podemos fazer!”. Escopo A1: corrigir a incompatibilidade criada pelo anual padrão de 9f8f9442 com campanhas mensais; manter anual para entrada comum, preservar escolha manual e não mudar preços, regras de cupom ou cobrador.

## Problema e resultado

**REPRODUZIDO em d95c44b35843168e6dd029c3b52096ddb25edb8d:** `/pricing?promo=FIRST50` abre anual e o botão Creator encaminha `billing=annual`, incompatível com o cupom mensal. O teste executa a rota, componente e handler da base; não depende de procurar uma string no código.

**IMPLEMENTADO:** a rota resolve a modalidade antes do primeiro HTML. FIRST50/COMEBACK50 iniciam mensal, inclusive quando acompanhados de um parâmetro annual conflitante. `billing=monthly` explícito também é respeitado; entrada comum, campanha sem cupom e cupom desconhecido permanecem no anual padrão. Arrays/valores não reconhecidos não inferem uma oferta. Nenhum percentual ou validade de cupom é concedido pelo cliente.

Depois de chegar à página, o visitante pode escolher anual ou mensal. Essa escolha não é sobrescrita por efeito, renderização ou mudança de atribuição. Outra entrada com modalidade/cupom mensal diferente reinicializa o estado por chave de componente. O handler explicita `billing=monthly` ou `billing=annual` e preserva promo, tier e intent_campaign validada; Autopilot/Lite permanecem mensais.

**LIMITE PRESERVADO:** se a pessoa trocar manualmente uma campanha mensal para anual, a regra existente do backend continua responsável pela elegibilidade. Este patch não muda o comportamento de cupom incompatível no servidor. A colisão de WELCOME20 e a nova oferta de 50% por dois meses continuam pedidos separados; A1 não torna essa nova oferta válida nem autoriza emails.

## Arquivos

- `app/pricing/page.tsx`: lê searchParams e passa modalidade inicial/chave estável ao componente; a rota passa a depender da query em seu render no servidor.
- `app/pricing/PricingClient.tsx`: inicializa o estado pela modalidade recebida, mantém os botões manuais e explicita mensal no destino.
- `lib/growth/pricingPlanChoiceAttribution.ts`: reutiliza o tipo/módulo existente para resolver o handoff, sem alterar os eventos.
- `scripts/test-pricing-monthly-campaign.mjs`: execução offline da rota/componente, estado e handlers; inclui reprodução na base.
- `scripts/preview-pricing-monthly-campaign.mjs`: comparação do JSX real antes/depois usando CSS compilado localmente.

Worktree isolada: `C:/kineo-wt/pricing-monthly-campaign-20260916`, branch `codex/pricing-monthly-campaign-20260916`, base d95c44b3. Nenhum pacote TRIAL10 anterior foi importado. Nenhum backend, preço, regra de cupom, API de pagamento, banco ou mídia foi editado.

## Verificação

**TESTADO LOCALMENTE:**

- 354 verificações comportamentais: query → rota → estado → URL de CTA real, desktop e mobile, SSR versus primeiro render cliente, escolha manual, troca de entrada, parâmetros repetidos/invalidos, cupom/intent preservados e Autopilot/Lite.
- 26 atribuição, 39 tier handoff, 29 sticky mobile, 68 public promo truth, 36 home/pricing/checkout.
- 70 sharing safety, 640 five improvements; TypeScript (`--noEmit --incremental false`) saída 0; diff sem erro de whitespace.

O harness executa as funções reais da aplicação com estados nomeados e setters, mas isola efeitos, rede, analytics e serviços. Não equivale a navegar em Next no navegador nem comprova desconto real Stripe. CSS compilou com aviso de base Browserslist desatualizada, sem erro; dependências não foram atualizadas.

## Comparação e próximo gate

Artefato: `C:/Users/josep/Documents/Codex/2026-09-15/receitas-novas/outputs/comparacao-campanhas-mensais.html`. Três pares (FIRST50, COMEBACK50, entrada comum) em 1280px e 390px, com modalidade e destino produzido pelo botão Creator. Usa USD e sessão fictícia; efeitos/componentes externos e mídia são isolados, fontes locais podem diferir. O arquivo não faz checkout nem chamadas externas.

**REVISÃO VISUAL PENDENTE:** AGENTS.md §8 exige “comparação antes/depois que o fundador consiga olhar”. A recusa anterior do mecanismo de preview não deve ser contornada. Board/Claude precisam inspecionar por caminho autorizado e registrar SHA, origem, largura, evidência e resultado. Não foi alegada inspeção nem publicação.

Roteiro: abrir cada campanha, confirmar mensal na primeira pintura e URL mensal no clique simulado sem criar pagamento; escolher anual e mensal manualmente; mudar atribuição mantendo a escolha; entrar em outra campanha e retornar ao pricing comum; conferir total anual e sticky mobile. Conferir navegação/hidratação reais em ambiente autorizado e que Autopilot/Lite continuam mensais. Depois, reconciliar a main/fila, repetir apenas gates afetados e publicar candidato isolado pela fila segura. Aprovação desta correção não libera novos envios ou cupom não validado.
