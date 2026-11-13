# Telas e Produto — entrega local de 13/11/2026

**IMPLEMENTADO / NÃO PUBLICADO.** Base `origin/main` = `1c736d3a6`; revisão da CEO incorporada. Este pacote reúne a prioridade nova da missão 3, a revisão da home e as partes executáveis da missão 2. Aprovação visual e publicação continuam com Joseph/CEO. Nenhum render, envio, banco, preço ou crédito alterado.

## Para olhar primeiro

- Missão 3: [estudo e recomendação A](../home-1311/estrategias/ESTUDO-1311.md), três propostas com mídia real, ordem, motivos, botão/destino e plano de medição por pessoas em sete dias.
- [Comparação visual antes/depois](ANTES-DEPOIS.html): capturas de componentes reais em Next dev, com origem e limitações indicadas em cada par.
- A proposta antiga de Clip + Recreate foi superada pela decisão do quadro de 04:12. A retirada está em [candidato F separado](candidato-F/LEIA-ME.md), sem efeito no app desta entrega.

## O que mudou

**IMPLEMENTADO — revisão da CEO:** WallMedia permanece com prévia muda em viewport. Faixa Recreate tem seis modelos do catálogo público, cores do tema, ação branca e link para todos. Fica **depois dos seis clipes grandes do topo**, preservando a decisão 5:6/3 por linha de `9ee6eb81e` (`components/home/HomeMosaic.tsx`). Rodapé usa tokens também no hover (`lib/ui/footerPresentation.ts`); a linha Claude Fable 5.2 integra o hero do conector (`app/kineo-in-claude/GenerateInClaude.tsx`). Os três cabeçalhos já publicados em `cbf54feb8` não foram refeitos.

**IMPLEMENTADO — A/B/C:** Films abre o fluxo real diretamente; nomes e navegação móvel seguem o par. `/examples` recebe 308 exato para `/made-with-kineo`; detalhes `/examples/[slug]`, mídia e textos reutilizados preservados. Guias de motor ficam acessíveis pelo rodapé. Alterações estão no commit local `30d59ab70`.

**IMPLEMENTADO — D/E:** botão branco Recreate com alvo CSS44px e texto15px, play público44px; ações Use idea/Selected no mesmo estilo, com prioridade de CSS suficiente para manter texto escuro15px. Miniaturas de produto usam5:6 com contain, sem cortar rostos/produtos. Exemplos derivam de `CLIPES_NOVOS.produto`, uma fonte: cinco filmes, três cartoons e nove inspirações de anúncio. Sem listas paralelas para preencher espaço; sem atribuir os anúncios manuais ao gerador de Ads. Título Cartoon aprovado. Fonte e media: `lib/create/tabs.ts`, `lib/clipesNos2Lugares.ts`.

**IMPLEMENTADO — G / parte já suportada da opção A:** `/create/ads` monta o formulário existente, em vez do corredor Next screen. Produto por link/foto, What do you sell, pessoa, cenário, formato e idioma continuam funcionais; pessoa/cenário ficam visíveis e formato/idioma usam os mesmos setters em botões. Os39 idiomas permanecem disponíveis num seletor expansível. O mesmo AdsV2Workspace conserva acesso, amostra, workspace, saldo, ownerKey, retomada, BF e eventos. `/ads/v2` mantém apresentação anterior com `moldura=false`. Geração e confirmação final continuam dentro da moldura; as APIs existentes não mudaram.

## Pendências reais — não declarar concluídas

1. **D — DESCONHECIDO: cronologia dos modelos.** Catálogo já deriva todos os liberados, mas não tem data/ordem editorial confiável. Pedido registrado para Div.2 adicionar metadata em `lib/recreate/formats.ts`, arquivo dela. Não inventei “mais novo” invertendo um array.
2. **Opção A completa — BLOQUEADA pelo contrato atual.** `lib/ads/cena/plan.ts` faz whitelist sem roteiro manual/gancho; `escolhaPlan.ts` escreve o roteiro por IA. PATCH /orders altera outro nível de narração e seria sobrescrito em `v2StartCore.ts`; não serve como atalho. Pedido à Div.5 registrado: entrada validada/moderada, persistida no script usado pelo TTS, com os limites reais, sem mudar cobrança. Exemplos por baixo hoje visualizam; preencher estilo/cenário exige uma receita aprovada por exemplo, sem copiar o produto de outra marca.
3. **F — PREPARADO, não integrado.** O patch de retirada interromperia o resgate `free_clip=1` e esconderia acompanhamento de pendências/falhas. Precisa preservar esses dois fluxos antes do redirect308. Não removi silenciosamente um direito nem anunciei a retirada como completa.

## Verificação e alcance

**TESTADO LOCALMENTE:** registro final em `VALIDACAO.md`. Prova offline compara gates/props/leituras do Workspace com a página anterior; fixtures não acessam produção. Capturas usam componentes reais com sessão de visitante simulada ou páginas públicas, sem login e sem gerar conteúdo. A comparação não comprova render pago, autenticação em produção, resultado comercial ou pagamento externo.

**O que pode melhorar:** a antiga porta Ads adicionava uma passagem sem começar o trabalho. Foi corrigida; os controles que o servidor ainda ignora ficaram fora da tela. A ordem de cards só pode ser chamada melhor após medir criação entregue e pagamento, além de cliques.

**O que os concorrentes fazem:** a pesquisa da CEO foi reutilizada; as fontes oficiais reconferidas estão no estudo da missão3. Exemplos acionáveis e custo antes de confirmar são práticas documentadas, sem prova de conversão para a Kineo.

**Próximo passo recomendado:** CEO apresentar as imagens A/B/C e o formulário; escolher a estratégia a testar. Div.2 fecha cronologia; Div.5 fecha roteiro/gancho; concluir resgate e acompanhamento antes de aplicar F. Publicar só após revisão visual e checks da integração final.
