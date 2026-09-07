# Galeria e idiomas — complemento às cinco melhorias

## Autorização e coordenação

**DECISÃO APROVADA — 07/09/2026:** ajustes de Meus vídeos, correção SSR e terceiro idioma por estatística, mais verificação dos fluxos nas línguas. Registro em DECISIONS. Base incorporada: origin/main `6f6eca73`; todas as entregas do Claude, inclusive vitrine, SeasonStrip e ponte de preço em GenerateClient, preservadas. Não editamos GenerateClient, fornecedores, render, campanhas, preços ou dados.

## Implementação

**IMPLEMENTADO:** `StudioClient.tsx` e `MobileNav.tsx` emitem CSS estático como raw text. O conteúdo é literal de desenvolvedor, sem interpolação ou entrada do cliente. Não usamos suppressHydrationWarning. Teste executa React SSR com o CSS extraído do componente real, demonstra que o modo anterior escapa seletores e que o novo mantém identidade textual.

**IMPLEMENTADO:** `HistoryClient.tsx` mantém alerta de geração e oferta/continuação principal, movendo os blocos de afiliado, indicação e compartilhamento para details após a galeria. As integrações secundárias só montam na primeira abertura, permanecendo montadas depois para não repetir impressões de montagem. Observadores existentes passam a acompanhar a ativação. Os CTAs, valores, elegibilidade, dados, privacidade e downloads não mudam. O teste renderiza galeria real com fixture e verifica ordem, estado fechado e informações ainda disponíveis ao expandir.

**IMPLEMENTADO:** Hindi explícito no seletor, persistência na mesma chave versionada, inglês padrão e espanhol preservado. `interfaceHindi.ts` cobre todas as chaves atuais do dicionário UiLabel e o editor local, além de placeholders/contagens de Studio e Biblioteca. Noto Sans Devanagari via next/font, auto-hospedada e sem preload global; Manrope preservada para Latin. Preferência da UI não altera narração, prompts, preço, URL ou moeda. Valores desconhecidos como pt-BR voltam para en.

**LIMITE EXPLÍCITO:** dicionário coberto não significa produto inteiro traduzido. Artigos SEO, admin, e-mails, mensagens brutas de fornecedores, parte das ofertas antigas e descrições de ferramentas legadas não integram esta entrega. Fallback Hindi é marcado como inglês em UiText. Não há tradução automática de texto de usuário. Estatística de país é critério de priorização, não inferência de língua individual.

## Gates

**TESTADO LOCALMENTE:** testes de contratos, preços/destinos iguais, roteiros preservados, estado de erro da Biblioteca nas três abas e editor nos cinco modos, com mensagens de erro EN/ES/HI; sem rede, e-mail, banco ou render. `test-locale-readiness.mjs` entra no job crítico do Guardião. Baterias anteriores seguem separadas; não afirmamos todos os testes legados verdes.

**COMPARAÇÃO VISUAL:** `docs/previews/GALERIA-E-IDIOMAS-2026-09-07.html`, JSX real, 12 superfícies × 3 idiomas, desktop e mobile selecionáveis. Dados fictícios e mídia omitida. Mostra fallback Devanagari do computador; a fonte real será conferida no deploy. Antes fixado em 6f6eca73. Preview renderer foi corrigido para não confundir hooks dos componentes filhos com estados da página; não relaxa guardas de efeitos/rede.

**TESTADO LOCALMENTE / CI — 07/09/2026:** commit de implementação `b9b497292c6a94afd650f86cae1f98951df5b2ab`; Guardião remoto `34089775375` verde. Locale readiness: 2021 verificações; five improvements 621; interface language 1126; language navigation 23; sharing safety 68; typecheck limpo. Contagens são asserções, não pessoas nem fluxos pagos concluídos.

**EVIDÊNCIA DE PREVIEW — 07/09/2026, conferida até 06:27 UTC:** Vercel `dpl_48DbLAjeX99Dh76M8BekxFzN8ne1` READY no SHA b9b49729. Chrome do fundador: Studio EN/ES/HI sem erros de console/hidratação, roteiro de QA preservado ao trocar idioma; home Hindi e Studio mobile 390 px sem overflow horizontal. Home persiste preferência após navegação. Biblioteca anônima redireciona corretamente para login; isso NÃO valida a biblioteca autenticada. Comparação da galeria com fixture foi inspecionada em desktop/mobile.

**EVIDÊNCIA DE PREVIEW / PENDÊNCIA DO EDITOR:** exportação local combinando corte 0,25–3,25 s, 1:1, velocidade 1,5×, mudo e texto misto EN/ES/HI: primeira tentativa Hindi recusada por `export_incomplete`; ao repetir passou em EN (2,1692 s), HI (2,179367 s) e ES (2,175367 s), todos 640×640, alvo 2 s, dentro da tolerância existente de 0,18 s. Sem alteração de código do encoder, sem upload, fornecedor, render pago ou download em disco. A causa da primeira recusa é DESCONHECIDA, não atribuída ao idioma. A guarda bloqueou o arquivo não conforme. Sucesso posterior não prova eliminação da intermitência; não afrouxamos o limite nem classificamos o editor como perfeito.

**COORDENAÇÃO — 07/09/2026:** incorporada a main `a80fffb0` sem conflitos, preservando os consertos Claude de `/make` e handoff/paste. Sem edição nesses caminhos. Próximo gate: repetir typecheck/CI na integração e publicar somente com gates verdes.

**ESCOPO DE VALIDAÇÃO:** resultados de produção e verificação autenticada constam abaixo. Sem teste pago: checkout completo, envio a fornecedores e render em todas as línguas não são certificados por esta bateria. Guardião segue até 07/09 10:00 BRT, sem prolongamento automático.

## Publicação e verificação autenticada

**VALIDADO EM PRODUÇÃO — 07/09/2026:** merge fast-forward `530d8e01faeca5012ccbb7aeb09df8cb2c2fcc77`; Guardião `34090948402` verde; deploy `dpl_XjruTBD2MXfn8w37eLAuViDNYGqA` READY e alias `www.usekineo.com`. Chrome autenticado às 06:32 UTC mostrou Hindi no seletor, galeria com 9 elementos de mídia montados sob demanda e primeira mídia em y=433,16 px. Card principal mantido; secundários recolhidos depois da galeria. Comparação visual real antes/depois exibida ao fundador.

**ACHADO RESIDUAL:** o grupo antigo de erros de hidratação 425/418/423 deu lugar a um 425/422 dentro da galeria autenticada; portanto o conserto de CSS não autoriza declarar zero erro global. O preview anônimo não exercitava esse acervo.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** `HistoryClient.tsx` calculava datas com relógio e fuso implícitos. Teste executando os helpers reais reproduziu diferença entre UTC e America/Sao_Paulo perto de meia-noite e diferença de idade ao cruzar uma hora entre SSR e hidratação. Complemento: `history/page.tsx` passa um snapshot de relógio, as três funções de apresentação usam esse valor na primeira renderização e calendário absoluto usa UTC. O relógio visual atualiza só depois da hidratação. Nenhuma query, cobrança ou estado persistido de job mudou. Teste ampliado para 2034 verificações, typecheck verde. Ainda exige confirmar se esse complemento elimina o erro residual em produção.

**VALIDADO EM PRODUÇÃO — 07/09/2026, corte 06:41 UTC:** na sessão interna do fundador, busca da galeria com termo sintético sem resultado, limpeza, abertura/fechamento das opções secundárias e troca HI→ES preservando a busca funcionaram. Não foi enviada indicação nem compartilhamento. Biblioteca autenticada carregou as três abas (48 vídeos, 1 imagem, 4 áudios no limite atual da consulta); preferência ES→HI preservou a aba/ativos. Hindi em 320 px: clientWidth=scrollWidth=320, sem overflow horizontal. Não houve erro novo de console nessa navegação à Biblioteca. Não confundir esses ativos da conta interna com clientes/receita ou contagem total do acervo.

**LIMITE DE TRADUÇÃO CONFERIDO NO BROWSER:** placeholders de ferramentas antigas, oferta de próximo episódio, chips de crédito e rótulos de armazenamento podem continuar em inglês mesmo com Hindi selecionado. Isso já estava fora da cobertura declarada; não equivale a uma interface integralmente localizada.

**GUARDIÃO:** tarefa existente atualizada para ler este handoff, verificar EN/ES/HI e conservar a pendência do export local; término mantido em 07/09 10:00 BRT. Sem nova automação nem renovação. Fontes sobre tarefas agendadas consultadas no OpenAI Docs; implementação pelo controle próprio do app.

## Fechamento desta entrega — 07/09/2026 06:47:15 UTC (03:47:15 BRT)

**VALIDADO EM PRODUÇÃO:** complemento de datas `bafac16c`, integrado com o trabalho Claude até `b699401b`, publicado no SHA `91b0556694b381c3a6d842f977266323adc01d05`. Guardião integrado `34091968392` concluído com sucesso; deploy `dpl_88XwW5JxCfRQR6k5DtNfr9S3o3rs` READY, alias www.usekineo.com. `git ls-remote` confirma o SHA em main no corte acima.

**VALIDADO EM PRODUÇÃO:** Chrome autenticado carregou o bundle desse deploy. Galeria EN, recarga com Hindi persistido e recarga com espanhol persistido: zero erros novos de console após 06:45 UTC, inclusive ausência do 425/422 residual. Mobile 390 px: clientWidth=scrollWidth=390 em HI/ES. Inglês e viewport original restaurados no fim. As falhas antigas do console foram separadas por timestamp/deployment, não somadas ao pós-deploy.

**ENTREGUE:** Manrope anterior preservada; idiomas EN/ES/HI explícitos; galeria prioriza mídia com secundários recolhidos; CSS estático de Studio/MobileNav consistente entre SSR e browser; calendário/idade da galeria usam snapshot comum. Os vídeos do fundador, preços, saldo, oferta, roteiros, créditos e pipeline não foram alterados.

**PENDÊNCIAS HONESTAS:** tradução não é integral (trechos legados listados acima); export local teve uma recusa intermitente no preview que não foi explicada nem consertada; sucesso das três repetições não a encerra. Não houve teste pago de geração, checkout ou de cada fornecedor em cada língua. Portanto esta entrega está no ar, mas NÃO equivale a certificação de todos os sistemas sem qualquer erro.

**PRÓXIMO PASSO:** Guardião somente leitura até 10h BRT; consolidar seis recomendações novas, incluindo conclusão da localização legada e diagnóstico reproduzível da temporização do editor local. Não reabrir sprint comercial nem iniciar mudança no render.
