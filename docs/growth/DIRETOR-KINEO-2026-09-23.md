# Diretor Kineo — contrato do protótipo

**DECISÃO APROVADA / 23/09/2026:** o fundador aprovou seguir com sugestão opcional antes da geração. Primeira entrega: protótipo UX local, seguido de avaliação técnica na pista Claude. Não é aprovação visual antecipada, publicação em produção, gasto ou promessa comercial.

## Hipótese e reserva antes de editar

**HIPÓTESE / NOVA experiência sobre capacidade PARCIAL existente:** pessoas que chegam ao Studio com ideia pouco específica podem se beneficiar de uma sugestão adaptada ao vídeo. Obstáculo proposto pelo fundador; prevalência e efeito em assinatura ainda não medidos.

**SUGESTÃO:** coorte inicial = usuários do Studio em modo ideia ou roteiro, clip fora desta v1. Superfície = abaixo do texto e antes de Generate. Mudança reversível = sugestão separada, aplicada por escolha, original preservado e desfazer. UX reserva somente protótipo isolado; Board este contrato e adendos documentais. Nenhuma edição concorrente do Studio/backend autorizada por esta reserva.

**SUGESTÃO / sucesso e amostra:** usuário distingue original, alterações, contexto e próximo passo, sem confundir sugerir com gerar. Nenhuma pessoa externa exposta nesta fase; revisão inicial do fundador, sem conclusão estatística. Eventos existentes de contexto: `chatgpt_quickstart_studio_ready` em `app/(dashboard)/studio/StudioClient.tsx:294` e `viral_suggestion_apply` em `app/(dashboard)/generate/GenerateClient.tsx:8482`; não provam resultado desta nova experiência. Na implementação futura, definir exposição/uso sem texto privado em telemetria; medir filme concluído e primeira assinatura canônica por pessoa, separando origem confirmada, UTM e desconhecida.

**SUGESTÃO / risco e parada:** parar diante de reescrita silenciosa, perda do original, resposta de contexto antigo, cobrança/geração involuntária, fatos inventados ou redução de guardas. Sem orçamento/capacidade confirmados, permanecer offline. A1/jogada7 e suas amostras são preservadas; protótipo não abre terceira variante ativa. Corte semanal25/09 05:10UTC não é prorrogado.

## Fluxo proposto

1. Pessoa escreve ideia/roteiro e escolhe configurações normalmente.
2. Botão opcional **Melhorar para este vídeo** solicita sugestão, sem navegar para render ou mudar configurações.
3. Mostrar original/sugestão, resumo concreto das mudanças e contexto: motor, duração, idioma e formato. Não garantir resultado melhor.
4. **Usar sugestão**, **Editar** ou **Manter original**. Aplicar troca somente o texto confirmado; desfazer restaura o original. Não disparar análise que possa gerar automaticamente.
5. Somente Generate final, com custo real visível e guardas atuais, consente geração.

**SUGESTÃO / verbatim:** preservar narração literalmente por padrão; orientação visual separada não vira fala. Reescrita exige escolha explícita adicional e comparação, nunca mudança silenciosa para AI. Não inventar fatos, estatísticas ou promessas; exemplos fictícios do protótipo rotulados.

**SUGESTÃO / estados:** carregando sem dupla submissão, erro com original intacto, sugestão pronta, edição, aplicada/desfeita e resposta desatualizada. Editar texto/configuração invalida sugestão pendente; resposta tardia não sobrescreve edição. Usuário pode continuar com original. Revisão acessível por teclado/foco e em desktop/mobile.

## Reaproveitamento e limites

**FATO CONFIRMADO / base38da1190:** `app/(dashboard)/studio/StudioClient.tsx:380` documenta Generate como consentimento de gasto e token que permite render após análise. Novo botão não pode armar token nem seguir esse caminho. `app/(dashboard)/generate/GenerateClient.tsx:8476` implementa sugestão existente e em `:8500` chama análise com `skipPreview: true`; não reutilizar esse handler diretamente como fluxo novo.

**FATO CONFIRMADO / base38da1190:** `app/api/apply-suggestion/route.ts:46` limita roteiro a6000caracteres; `:51` aceita45/60/90segundos e converte outros para45; `:66` chama provedor de texto. Não cobre automaticamente configurações do Studio. Comentário sobre não cobrar créditos do cliente não prova custo operacional zero nem autoriza uso ilimitado.

**QUESTÃO PENDENTE:** Claude deve reconciliar melhorias/planejamento existentes, compatibilidade de motor/duração/idioma/formato, limites de entrada/saída, autenticação/abuso, teto de custo/latência e segurança. Não selecionar modelo novo, chamar API paga ou duplicar pipeline nesta fase. Se orientação visual separada não for suportada, declarar bloqueio; não embutir instruções narradas.

## Entregas e aceite

**DECISÃO APROVADA / Codex UX:** HTML estático autocontido antes/depois desktop e mobile, estados acima, dados fictícios e sem API. Informar caminho e verificação efetiva; não afirmar inspeção visual sem caminho permitido. Aprovação do conceito não substitui aprovação do preview.

**SUGESTÃO / Claude:** responder `DIRETOR-KINEO-20260923` com reaproveitamento possível, lacuna mínima, custo/limites e testes offline planejados. Provar zero render/débito/token de consentimento ao sugerir/aplicar; preservação verbatim/original, falhas, concorrência e resposta tardia. Implementação funcional/publicação dependem de reserva reconciliada, aprovação visual e gates vigentes; sem bypass de CI ou guardas.

**QUESTÃO PENDENTE / resultado:** nenhum aumento de qualidade, exclusividade no mercado, exposição ChatGPT, assinatura ou MRR demonstrado. Git publicado significa contrato disponível, não leitura/execução do Claude.
