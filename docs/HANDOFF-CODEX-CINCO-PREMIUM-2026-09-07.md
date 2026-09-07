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

Pendente nesta versão: SHA final, Guardião remoto, preview navegável, deploy de produção e evidência de browser. Não classificar como publicado só por existir código.
