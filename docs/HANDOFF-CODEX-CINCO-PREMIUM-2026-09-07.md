# Cinco melhorias premium — 07/09/2026

## Mandato e isolamento

**DECISÃO DO FUNDADOR NESTE CHAT:** implementar cinco mudanças de alto nível e entregar resultados após a curadoria aprovada. Worktree própria: C:/tmp/kineo-showcase-premium-2026-09-07, branch codex/showcase-premium-sep07, base origin/main ee94da49. Árvore principal e mudanças de pagamentos do Claude preservadas.

**FATO CONFIRMADO:** a fileira antiga em components/TrendingRow.tsx enviava todo clique diretamente ao Studio; não tinha filtro, pausa nem posters; as setas sumiam abaixo de 700px em app/KineoLanding.tsx. Busca antirrepetição não encontrou essas funções na fileira da home.

## As cinco entregas

1. **IMPLEMENTADO:** seleção por motor com contagem derivada dos exemplos recebidos; todos os 22 exemplos continuam disponíveis, sem trocar vídeo ou rótulo de motor.
2. **IMPLEMENTADO:** prévia em dialog nativo, título acessível, Escape/fechar e retorno de foco; ação separada para abrir o destino já declarado do Studio/Avatar. É prévia curta, não promessa de filme completo.
3. **IMPLEMENTADO:** pausa/retomada da fileira, interrupção fora do viewport e enquanto o modal está aberto, respeito a reduced-motion/save-data/2g. Preferência de movimento monitorada uma vez na galeria, não por card.
4. **IMPLEMENTADO:** 22 posters WebP 360×640, extraídos offline dos mesmos arquivos aprovados; imagens lazy. Erro de mídia mantém saída explícita, sem retry infinito ou URL pública fabricada.
5. **IMPLEMENTADO:** controles de 44px no celular, setas com limites, teclado (setas/Home/End na região), foco visível e filtro que volta ao início da fileira.

**ESCOPO:** components/TrendingRow.tsx + CSS module, lib/ui/showcaseGallery.ts, 22 posters e testes/docs. WallMedia global, hero, bento, render, créditos, preços, pagamentos, banco e traduções de outras superfícies não foram alterados. Novos controles têm inglês, espanhol e hindi; títulos dos filmes não são retraduzidos.

## Verificação antes da publicação

**TESTADO LOCALMENTE:** TypeScript bruto limpo; test-showcase-premium --media: 192 verificações (funções reais + render React SSR + metadados dos posters); five-improvements 621; locale-readiness 2034; sharing-safety 68. Nenhuma asserção legada foi alterada.

**LIMITE:** testes SSR não comprovam cliques, foco ou reprodução no navegador. Preview HTTPS desktop/mobile e idiomas são gate separado antes da main. Nenhum teste de render pago.

Comparação visual estática autocontida: docs/previews/CINCO-PREMIUM-2026-09-07.html. CSS e imagens embutidos; controles da documentação são ilustrativos. Comparação real feita no browser contra preview de deployment.

**HIPÓTESE COMERCIAL:** separar avaliação do exemplo de entrada no Studio reduz cliques-surpresa. **RESULTADO COMERCIAL DESCONHECIDO:** não houve medição de aumento de assinaturas nem promessa de uplift. Resultado desta entrega é funcional/visual.

## Coordenação com Claude

Não tocar nesta fileira durante publicação. Nenhum pedido de mudança em fluxo do gerador ou pagamentos. Preservados todos os IDs da curadoria aprovada (incluindo robô e Kling 3).

## Gate de publicação

Primeiro preview 70ecbe72: Guardião remoto verde e deploy dpl_8EsyfdnSuEC2wC3tLtuToaJHW7Lo READY. Browser detectou dois defeitos que impediram publicação: reset CSS da home zerava padding/margin dos novos controles; foco tentava retornar enquanto o fundo ainda estava inert. Corrigidos com seletores escopados de maior especificidade e restauração após desmontar o dialog. Revalidação exigida antes da main.

**TESTE LEGADO:** test-public-video-privacy falha no allowlist antigo (linha 42) tanto nesta árvore quanto na worktree da entrega anterior. Não foi alterado para parecer verde. Contratos ativos de publicação, curadoria e SSR permanecem verdes. test-home-b2b-bridge: 27/27.

Pendente nesta versão: SHA final corrigido, novo Guardião, revalidação visual/foco e deploy de produção. Não classificar como publicado só por existir código.

## Recibo de validação — atualização posterior

**TESTADO EM PREVIEW REAL, 07/09/2026:** versão funcional final 3f0fb994dd8bf0ce99aa96cc21f592315a720bee. Guardião: run 34151167693, TypeScript e contratos críticos success. Vercel preview dpl_2s1TrpD3kcXGc4fF5VX1kZEktNPr READY.

- Desktop 1920px; mobile 390px e 320px: sem overflow horizontal nas larguras observadas. Controles móveis medidos em 44px de altura; setas 44×44.
- Filtro Omni: 5 exemplos, incluindo o robô. Filtro Kling 3: 3 exemplos. Todos: 22. Posters carregados ao percorrer a fileira: 22.
- Pausa interrompeu todos os players da fileira; sair da prévia conservou o estado. Home/End e setas respeitaram os limites.
- Prévia Omni chegou ao fim de 6s, largura nativa 540, media error nulo. Studio mantém engine=omni; Kling 3 mantém engine=hollywood.
- Inglês, espanhol e hindi: filtro, prévia, rótulos e CTA presentes. Títulos dos vídeos preservados.
- Escape e botão fechar removem modal e restauram foco no exemplo. Shift+Tab a partir do fechar leva ao CTA; Tab do CTA volta ao fechar. Conferido após correção específica de foco; não inferido do uso de dialog.
- Console de erros no preview final: vazio no trecho capturado.

**ESCOPO DA EVIDÊNCIA:** inspeção funcional da galeria, não auditoria global do site, não render pago, não medição de aumento de assinaturas.

**PUBLICAÇÃO:** main recebeu 3f0fb994 em fast-forward sobre 3bbeb922. Validação de produção abaixo será preenchida apenas após READY e smoke no domínio canônico.

**NOTA DE DIAGNÓSTICO:** o HEAD HTTP sem sessão no preview autenticado redirecionou para vercel.com/login (HTML), portanto não foi contado como teste de asset. Posters do preview foram conferidos no Chrome autorizado; a verificação HTTP anônima é feita no domínio de produção.

## VALIDADO EM PRODUÇÃO — 07/09/2026

- SHA funcional: 3f0fb994dd8bf0ce99aa96cc21f592315a720bee, confirmado em refs/heads/main.
- Vercel dpl_5mAKQHs89oJpHJN3QmAfz6PYkFMd: READY, mesmo SHA, alias www.usekineo.com.
- HTTP anônimo da home: 200, novo data-showcase presente. Os 22 posters: HEAD 200 + image/webp.
- Chrome do fundador: 22 exemplos, filtro Omni 5, prévia do robô reproduziu até o fim sem media error; destino Studio/omni preservado. Prévia nova do apresentador também reproduzida e inspecionada visualmente no domínio público.
- Pausa conferida com todos os players da fileira parados. Textos públicos confirmados em inglês, espanhol e hindi. DOM mobile 390px: cinco exemplos Omni, zero media errors, sem overflow horizontal; comparação visual mobile realizada no preview.
- Uma aba antiga ainda mostrava o HTML anterior depois de navegar para a mesma URL; recarregar carregou a versão nova. Não foi tratado como deploy concluído antes de conferir o marcador real.
- Console no recorte de validação final: nenhum erro retornado.
- Preços, créditos, render, banco e IDs aprovados: nenhuma alteração nesta entrega. Receita/conversão: não medida.

Este recibo posterior fica na branch codex/showcase-premium-sep07, além da cópia local, para não disparar outro deploy de produção apenas para registrar o deploy já validado. A implementação e a comparação visual estão na main.
