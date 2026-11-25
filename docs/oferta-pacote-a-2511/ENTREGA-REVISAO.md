# Oferta para empresa · pacote A · 25/11/2026

**PREPARADO / TESTADO LOCALMENTE · PARA REVISÃO DO KINEO 3D.** Branch codex/oferta-pacote-a-2511, worktree C:/kineo-wt/oferta-pacote-a-2511. Base final origin/main 28f7c53b8fd107b2e32e553a1b705d17c37b6bd7. Código consolidado 3f9fff59686371613c5672e78d17604a95278fce; o commit documental posterior preserva esse conteúdo.

## Decisão aplicada e material acessível

**DECISÃO APROVADA:** pacote A, 4 anúncios por US$299/mês, serviço executado pela equipe e comprado à parte da assinatura de software, máximo 3 clientes. Fonte local: [decisão de 25/11 12:03](C:/kineo/docs/estrategia/DECISAO-OFERTA-EMPRESA-PRECO-2511.md), por delegação do dono à CEO. B/C permanecem guardadas. A conta de US$159 direto e US$140 de contribuição é arredondada e condicional; quatro horas a US$30 são premissa, não medição. Fonte detalhada da conta/proposta: [consolidação aa8547f9d](C:/kineo-wt/product-story-manha-2511/docs/oferta-empresa-decisao-2511/DECISAO-2511.md).

- [Fotos antes/depois autocontidas](TELAS-ANTES-DEPOIS.html): quatro estados finais, cada um pareado com a candidata anterior.
- [Dois contatos EN/PT](PRIMEIRO-CONTATO-EN-PT.md): 73 e 72 palavras, incluindo assunto e assinatura, sem destinatário ou envio.
- [Conciliação das 30 candidatas](CONCILIACAO-CANAIS.md): escopo de apresentação visual, limites e qualificação atual pendente.
- [Lista original de Canais](C:/kineo-wt/canais-2511/docs/empresas-video-2511/LISTA-30-EMPRESAS.md): ac80dc47beab1216446d3c5f42dd8ad1f3a1b3bb, preservada em outra branch, não duplicada neste commit.
- [Recibo dos gates](GATES.json), [recibo das fotos](FOTOS-RECIBO.json) e [contagem dos textos](EMAILS-CONTAGEM.json).

## Código real e escopo

**FATO CONFIRMADO / IMPLEMENTADO:** lib/growth/companyOffer.ts:5–14 concentra quantidade, limite, formato, rodada, prazos e preço aprovado em centavos. app/company-video-service/CompanyOfferPage.tsx:36–40 usa essa constante e formatCheckoutMoney; removido override por prop. O guardião substitui a constante por 31700 em memória e exige US$317 no HTML, além de matar o mutante que fixa 29900 na tela. O piloto diz explicitamente três clientes; o aceite de clientes e a conferência de disponibilidade são humanos, não um limite de três formulários. Não há checkout deste serviço ou admissão automática no pacote.

**FATO CONFIRMADO / OFF:** lib/growth/companyOfferRelease.ts:3 continua off; app/company-video-service/page.tsx:16 fecha por notFound. O POST da oferta também fecha OFF. Os testes exercitam OFF/internal/public exclusivamente em memória. Não alterei a chave real, preço de software, checkout, cron, motor ou dados de cliente.

**FATO CONFIRMADO:** reaproveitados 4cb2109e7 + c60fb174c; a proposta já revisada de um SKU/idioma, 15s, uma rodada consolidada, prévia em três dias úteis e final em dois após feedback foi preservada. Materiais, aprovação e agenda condicionam o prazo. Não são prazos de entrega já medidos com clientes. Formulário, pedido independente, preservação de briefing anterior e caixa administrativa vêm dessa candidata, com controles mantidos. O único delta de produto em relação a c60 é a seleção do preço, remoção do override e limite visível.

## Prova visual e limites

**TESTADO LOCALMENTE:** Chrome em viewport 1920×1080 e 390×844, claro/escuro, capturas fullPage. Os JPEGs capturam a área de conteúdo com 1916/386 px: o navegador excluiu quatro pixels da barra vertical; não houve redimensionamento das fotos. Os recibos DOM registram viewport e ausência de overflow horizontal. Todo o conteúdo, inclusive formulário final, está nas capturas. As capas dos dois exemplos próprios estão legíveis; este ensaio não gerou ou renderizou vídeo novo.

O antes é o componente da candidata c60fb174c com cenário offline US$299, não produção anterior. O depois usa a constante atual sem override. Foi compilado apenas o CSS com PostCSS/Tailwind instalados; HTML obtido da execução real do componente em VM. Fontes, CSS global, appearance e CSS scoped reais são locais. Não é build Next nem validação de entrega pública. A bancada somente GET em loopback bloqueia form-action por CSP; formulário não enviado. Os testes de protocolo/armazenamento usam fixtures.

**FATO CONFIRMADO:** os insumos visuais globals.css, appearance.css, manrope.css, tailwind.config.js e checkoutPricing.ts não mudaram entre a base das fotos 6804eb793 e a base final 28f7c53b8. Rebase não alterou a oferta. FOTOS-RECIBO.json guarda hashes das oito imagens. O HTML é autocontido e abre sem servidor; os arquivos auxiliares da bancada dependem do servidor local e não substituem a folha autocontida.

## Gates e parecer de autoria

**TESTADO LOCALMENTE:** guardião da oferta PASS com 16 mutantes; os 13 anteriores foram preservados, acrescentando preço aprovado, desaparecimento do limite e desvio da constante. Sharing safety, B2B lead intake, events identity stamp, server-only events, admin fonte única, source conversion funnel e admin rápido passaram na base final. Oito executáveis verdes, um vermelho herdado. Não alego repetição dos 125 testes históricos; esta rodada cobre nove executáveis pertinentes.

**CONTRADIÇÃO HERDADA:** test-five-improvements.mjs:99 espera uma configuração de CI legada e falha “critical CI cannot ignore failure”. Mesma mensagem, asserção e código 1 na candidata e na base 28f7c53b8, reproduzida em C:/kineo-wt/oferta-pacote-a-base-2511, branch codex/oferta-pacote-a-base-2511. O teste e o workflow não foram alterados. Logs BASE-test-five-improvements.log e test-five-improvements.log. Não contar como verde ou como evidência de que as verificações seguintes rodaram.

**TIPOS:** execução inicial completa exit 0; execução após rebase registrada no recibo final de tipos e TYPECHECK-FINAL.log. Não houve build/deploy.

**PARECER DE AUTORIA:** pacote preparado para revisão independente, sem autorização de publicação inferida. O que falta: PODE IR do kineo 3d; aprovação das fotos pelo dono; capacidade/agenda concreta e aceite dos clientes; confirmação atual dos anúncios individuais; seleção/aprovação do primeiro lote pela CEO. O limite de três clientes deve ser controlado antes de aceitar pagamento, não pela contagem de leads.

**O que pode melhorar:** a lista não comprova 30 anunciantes ativos hoje. Nove evidências recentes são atribuídas a terceiro; zero confirmações diretas atuais. A conciliação preserva isso e retira promessas de funcionamento/resultado que uma imagem gerada não prova. Não há nova comparação concorrencial nesta alteração de implementação; o estudo de preços do dia 25 permanece no documento de decisão, com suas fontes e limites.

**Próximo passo recomendado:** revisão independente da ponta exata, depois avaliação visual e lote pela CEO. Quadro somente local, fora do commit. Sem push, publicação, envio, gasto, consulta de clientes ou resultado comercial reivindicado.

**HIGIENE DO DIFF:** após os gates, removido apenas CR excedente da linha 633 de FunnelClient.tsx herdada da candidata; um final de linha, sem mudança de texto ou comportamento. git diff --check fica limpo.
