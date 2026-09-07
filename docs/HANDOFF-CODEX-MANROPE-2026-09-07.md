# Tipografia B — Manrope

Data: 07/09/2026. Base: 19514335e89fe7f060ef8e1f9a21d5003ef92d9d.

## Decisão e escopo

**DECISÃO APROVADA:** o fundador escolheu B/Manrope nesta conversa e pediu a troca no site para revisar antes de dormir. Autorização registrada em docs/DECISIONS.md. Idioma adicional ainda é somente recomendação.

**IMPLEMENTADO:** fonte variável Manrope auto-hospedada por next/font/google em app/layout.tsx; um token canônico em globals.css, aliases de compatibilidade para consumidores antigos e Tailwind sans/display alinhados. Famílias locais fixadas em páginas públicas passaram ao mesmo token. Ajustes de peso, espaçamento e leitura em lib/ui/homePresentation.ts e workspacePresentation.ts.

**FATO CONFIRMADO:** não houve alteração em app/KineoLanding.tsx, GenerateClient.tsx, studioKit.tsx, Sidebar/MobileNav, preços, créditos, fontes das legendas renderizadas, cobrança ou APIs. Blocos monospace/código, imagens OG e fallback de erro global continuam intencionais. Stripe hospedado e e-mails externos não fazem parte da tipografia do site.

## Gates

**TESTADO LOCALMENTE:** tsc --noEmit --incremental false, exit 0. Testes offline: test-manrope-system 83; curation-restore 247; language-navigation 23; workspace-spanish 22; interface-language 1058. Sem requisições, banco, render ou pagamento. Checks de escopo comparam os arquivos completos normalizando apenas font-family, em vez de apenas buscar nomes de funções.

**TESTADO LOCALMENTE / LIMITE:** preview autocontido em docs/previews/MANROPE-APROVADA-2026-09-07.html, 8 telas × EN/ES, controle de largura. JSX real com efeitos/integrações substituídos por fixtures; Library tem projeto fictício. Não é uma nova certificação do produto inteiro. Fonte Manrope computada no Chrome; comparação visual desktop e mobile conferida. Validação de deploy será acrescentada após publicação, sem declarar antecipadamente.

**COORDENAÇÃO:** Claude pode continuar aquisição; nenhuma mudança em handoff GPT, autenticação, campanha, Store, Stripe ou render. As páginas /chatgpt e /chatgpt-to-youtube-shorts recebem apenas font-family. Não repetir a inclusão de /chatgpt no sitemap/llms: 939b0dc0 já a entregou. Os achados de segurança da auditoria anterior não foram corrigidos por esta entrega visual.

## Cinco próximas recomendações (SUGESTÕES, não implementadas)

1. Reduzir avisos concorrentes: uma mensagem principal por etapa, mantendo a intenção de compra explícita sempre acessível.
2. Padronizar botões pelo destino: criar sempre no Studio; continuar projeto sem perder roteiro; distinguir abrir planos de gerar vídeo.
3. Biblioteca centrada em continuidade: destacar projeto recente e a ação correspondente ao estado, sem criar outro fluxo de geração.
4. Completar o espanhol antes da terceira língua: no smoke real do Studio, seletor ES e texto principal traduzido coexistem com avisos e descrições em inglês; o HTML ainda declara lang=en. Corrigir tradução e semântica de acessibilidade, sem mudar o idioma da narração.
5. Fechar os achados de privacidade/autorização e tornar o CI um gate real antes de outra grande reforma visual. Aparência profissional não certifica segurança.

## Próxima língua (SUGESTÃO)

Português do Brasil. O fundador consegue revisar naturalidade e suporte, há página /gerador-de-shorts-gratis em português no código, e EN/ES/PT compartilham alfabeto coberto pela Manrope. Isso reduz o risco operacional da terceira tradução; não prova que PT-BR será a língua com maior receita. Antes da implementação, comparar visitantes e pagamentos externos por país/idioma. Não inferir nacionalidade por nome. Interface não altera moeda USD nem a narração escolhida. Nenhum idioma foi adicionado nesta entrega.

## Publicação

**VALIDADO EM PRODUÇÃO — 07/09/2026, aproximadamente 00:48 BRT:** código 82e4c4c856e7cf90f666b1a3ed87ab3496c04bd7 publicado por fast-forward após integrar a main 482dd0a784f2d0e313b6159922aebb620b0857c7 (trabalho concorrente do Claude preservado). Preview integrado dpl_6hkt1TbYbfcazoQQTKJskcD1GRSK READY; produção dpl_HXK1uYbra9KRS6MFkMsBKHxmqDnC READY, alias www.usekineo.com. Remoto main conferido no SHA 82e4c4c8.

**TESTADO LOCALMENTE:** typecheck repetido após a integração, exit 0; teste da porta ChatGPT do Claude 49/49 adicional. Total desta entrega: 1482 verificações direcionadas, não a suíte global nem uma certificação de todas as funcionalidades. O Guardião existente usa continue-on-error; seu badge não é prova de ausência de erros.

**VALIDADO EM PRODUÇÃO:** Chrome com sessão do fundador: home com Manrope computada e h1 peso 500; Studio e Biblioteca com Manrope e sem overflow horizontal em 390 px; Studio em ES mantém peso 500. Preview: planos, ferramentas e editor com a mesma família; home em diferentes larguras e comparação antes/depois desktop/mobile. Nenhum vídeo gerado, pagamento forçado ou saldo alterado.

**LIMITE DA VALIDAÇÃO:** fonte do sistema compartilhada, não inspeção manual de cada URL parametrizada do site. A tradução parcial e o lang=en em ES são achados anteriores à troca, não corrigidos aqui. A migração não encerra a auditoria funcional/de segurança anterior. Fontes monospace, OG, fallback de erro, e-mail, checkout externo e legendas dos vídeos permanecem fora do escopo.

**COORDENAÇÃO DE PUBLICAÇÃO:** o conector de criação de PR respondeu 403; publicação autorizada foi feita por Git nativo, sem force push, após build READY e testes locais. Nenhuma árvore principal suja foi usada. Helpers locais de montagem do preview não entram no commit.
