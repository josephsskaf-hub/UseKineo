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

**EVIDÊNCIA DE PREVIEW — 07/09/2026, 06:12–06:30 UTC:** Vercel `dpl_48DbLAjeX99Dh76M8BekxFzN8ne1` READY no SHA b9b49729. Chrome do fundador: Studio EN/ES/HI sem erros de console/hidratação, roteiro de QA preservado ao trocar idioma; home Hindi e Studio mobile 390 px sem overflow horizontal. Home persiste preferência após navegação. Biblioteca anônima redireciona corretamente para login; isso NÃO valida a biblioteca autenticada. Comparação da galeria com fixture foi inspecionada em desktop/mobile.

**EVIDÊNCIA DE PREVIEW / PENDÊNCIA DO EDITOR:** exportação local combinando corte 0,25–3,25 s, 1:1, velocidade 1,5×, mudo e texto misto EN/ES/HI: primeira tentativa Hindi recusada por `export_incomplete`; ao repetir passou em EN (2,1692 s), HI (2,179367 s) e ES (2,175367 s), todos 640×640, alvo 2 s, dentro da tolerância existente de 0,18 s. Sem alteração de código do encoder, sem upload, fornecedor, render pago ou download em disco. A causa da primeira recusa é DESCONHECIDA, não atribuída ao idioma. A guarda bloqueou o arquivo não conforme. Sucesso posterior não prova eliminação da intermitência; não afrouxamos o limite nem classificamos o editor como perfeito.

**COORDENAÇÃO — 07/09/2026:** incorporada a main `a80fffb0` sem conflitos, preservando os consertos Claude de `/make` e handoff/paste. Sem edição nesses caminhos. Próximo gate: repetir typecheck/CI na integração e publicar somente com gates verdes.

**PENDENTE:** deploy de produção e verificação autenticada serão acrescentados depois de acontecerem. Sem teste pago: checkout completo, envio a fornecedores e render em todas as línguas não são certificados por esta bateria. Guardião segue até 07/09 10:00 BRT, sem prolongamento automático.
