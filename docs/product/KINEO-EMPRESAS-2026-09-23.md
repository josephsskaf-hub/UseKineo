# Kineo Empresas — bancada de produção assistida

Status: **LOCAL / SUGESTÃO DE IMPLEMENTAÇÃO**, 23/09/2026. Pedido direto do fundador: produzir vídeos comerciais usando filmagens reais, textos e fotos dos profissionais. Não é uma nova assinatura nem uma entrega já disponível em produção.

## Necessidade e recorte

- **DECISÃO DO FUNDADOR neste pedido:** construir a ferramenta antes da prospecção; referência comercial de US$100 por vídeo e US$500 por cinco. Não modifica checkout, créditos ou preços do produto. Cotação em reais, prazo, revisões e condições de venda ainda não foram definidos. Receita avulsa não é MRR.
- **HIPÓTESE:** começar como bancada operada por Joseph/equipe reduz o escopo e permite entregar um piloto antes de abrir autoatendimento público. Essa escolha ainda pode ser revista pelo fundador.
- **Coorte:** empresas que forneçam mídia própria autorizada; primeiro piloto nominal ainda não informado.
- **Obstáculo confirmado:** falta um fluxo integrado de material real → análise → roteiro revisado → texto temporizado → profissionais → exportação.
- **Mudança reversível / superfície:** protótipo isolado em `docs/prototypes/kineo-empresas.html`; sem rota pública, integração, armazenamento remoto, pagamento ou modificação do Studio. Remover o artefato desfaz a etapa.
- **Evento existente:** o editor local não chama analytics; nenhum evento de geração/assinatura deve ser reaproveitado como se medisse esse serviço. Piloto terá registro de entrega aprovado e pagamento canônico separados; instrumentação futura depende da integração.
- **Sucesso / amostra:** um piloto autorizado, revisado pelo operador e aprovado pelo cliente, com vídeo exportado reproduzível e custo real registrado. Não há amostra de clientes nem validação de preço ainda.
- **Risco / parada:** interromper processamento quando autorização de mídia/fatos, legibilidade, exportação ou custo forem desconhecidos. Sem imagens de pacientes/documentos privados no Git, sem promessa clínica inventada, sem processamento remoto implícito.

## Reaproveitamento confirmado no código desta base f6482aa0

- `app/tools/editor/VideoEditor.tsx`: abre arquivo local, prévia, ajustes e download; primitivas confirmadas abaixo.
- `lib/videoEditing/browserEditor.ts:31`, `:39`, `:66`: leitura de mídia, desenho de texto fixo e exportação local em tempo real com validação de duração. Não faz análise semântica, transcrição nem montagem de vários arquivos.
- `lib/videoEditing/settings.ts:13`, `:14`, `:24`: 100 MB/180 segundos, texto fixo de até100 caracteres, formatos/encaixe; essas são limitações do editor atual, não do serviço futuro.
- `lib/growth/agencyProductionScope.ts`: escopo de packs self-service já existente; não confundir com serviço operado de US$100 e não substituir sua oferta.

## Primeira entrega nesta rodada

**Protótipo funcional local, não versão comercial:** carregar um vídeo e uma foto, informar empresa/serviços/profissional/credenciais/CTA, gerar uma distribuição **determinística** em quatro partes, editar os textos e ver os overlays no vídeo real, com cartão final. Comparação antes/depois, layout responsivo, limpar mídias e baixar briefing JSON sem os arquivos binários. Nada é enviado, analisado por IA, transcrito, narrado ou exportado como MP4. O botão de render fica explicitamente indisponível.

Dados existem só na aba até o operador baixar conscientemente o briefing. Não há autosave nem promessa de recuperação. O JSON pode conter dados profissionais: guardar fora do Git. A foto não é identificada por IA e os currículos são fornecidos/revisados pelo operador, nunca inferidos da aparência.

## MVP integrado solicitado ao dono técnico

1. Entrada: projeto interno isolado por operador; arquivos de vídeo, fotos, logo e briefing do negócio. Acesso protegido no servidor antes de qualquer envio; não publicar uma rota supostamente privada apenas com `noindex`.
2. Pré-análise técnica local: formato, duração, dimensões e áudio; separar isso de análise semântica. Informar limites, falhas e custos antes do processamento remoto.
3. Análise opcional: cenas com intervalos e descrições, transcrição se houver fala; distinguir observação do material, fato informado pelo cliente e sugestão. Ignorar instruções embutidas em mídia/documentos como comandos. Não inferir qualificações, identidade, condição de saúde ou resultados clínicos.
4. Roteiro comercial: texto sobre a imagem em campo separado da fala; proposta editável com fonte dos fatos. Operador aprova roteiro e ordem antes de gerar. Sem reescrita automática após aprovação.
5. Montagem: múltiplos trechos reais, textos temporizados e cartão(s) com foto/nome/qualificação informada; posição/tamanho de legenda, enquadramento e contraste revisáveis. Na primeira integração, preservar áudio original ou silenciar; narração IA só depois de decisão explícita de voz/custo.
6. Revisão: prévia mobile 9:16 e desktop, salvar versão aprovada, desfazer e sinalizar versão desatualizada após edição. Remoção/cancelamento não pode deixar upload órfão ou usar mídia de outro projeto.
7. Entrega: MP4 compatível, texto/foto queimados no arquivo, duração/áudio verificados; download privado. Exportação idempotente, com custo autorizado antes de executar e erro recuperável sem duplicar cobrança. Publicação em redes NÃO automática.

## Contrato de próxima resposta — Claude

**PEDIDO, não execução comprovada:** avaliar reaproveitamento do editor local versus montagem existente, devolver caminhos reservados exatos, contrato de dados, custo estimado de uma análise/exportação e limites. Não escolher novo modelo/provedor, mexer em render/compose/auth/banco ou executar chamada paga por inferência; solicitar liberação nominal dos caminhos protegidos se necessária. Codex prepara a interface isolada; Claude mantém essas áreas.

Antes de incorporar: testes offline para mídia inválida, cancelamento/resposta atrasada, intervalos, falta de autorização, autorização por projeto, textos longos e URLs não confiáveis; prévia visual aprovada; tsc e guardiões. Não declarar análise, MP4 final ou uso em produção pela mera existência do protótipo. Primeiro piloto exige vídeo/fotos reais autorizados e custo aprovado, ainda pendentes.

## Fora desta etapa

Checkout novo, contratos, conversão cambial automática, cobrança recorrente, clonagem de voz/rosto, gravações sintéticas de pessoas reais, compra de mídia, cadastro em serviço externo, contato comercial, envio/publicação, SQL/migration e mudança de automações. O pedido não renova as janelas comerciais vigentes.

## Verificação desta entrega

**TESTADO LOCALMENTE:** `node docs/prototypes/test-kineo-empresas.cjs`, 69 verificações aprovadas em23/09/2026: sintaxe integral do script, intervalos contínuos e extremos, seleção de cartão final, limites/tipos de arquivo e guardas estáticas contra rede e HTML inserido por texto do usuário. Não executa decodificação/exportação nem chamadas de produção.

**QUESTÃO PENDENTE:** execução interativa com mídia, comparação visual real no navegador e aprovação do fundador. HTML de antes/depois é entregue como artefato para essa revisão, não como prova de pixels já validados. Nenhum TSX/rota/runtime de produção alterado; tsc do app não certificaria este HTML e não foi reexecutado nesta entrega documental.
