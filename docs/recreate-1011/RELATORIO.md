# Recreate — alternativa B implementada — 10/11/2026

| Peça | Estado | Onde ver |
|---|---|---|
| Fotos → ajustes → criar | IMPLEMENTADO / TESTADO LOCALMENTE; texto em inglês e controles reais | `app/recreate/RecreateClient.tsx:210`; `desktop.png`; `mobile.png` |
| Base video à direita | IMPLEMENTADO / TESTADO LOCALMENTE: prévia grande fixa no quadro direito enquanto fotos e catálogo rolam separadamente; no celular, prévia antes dos campos | `app/recreate/RecreateClient.tsx:248`; `app/recreate/recreate.css`; `visual-checks.json` |
| Fotos por posição | IMPLEMENTADO / TESTADO LOCALMENTE: campos independentes; adicionar fora de ordem, substituir e remover preservam pessoa 1 / pessoa 2 | `app/recreate/RecreateClient.tsx:98`; `test-photo-flow.cjs` |
| Paleta e símbolo da Kineo | IMPLEMENTADO / TESTADO LOCALMENTE: tokens existentes de aparência e símbolo compartilhado; temas claro e escuro respeitados | `app/recreate/recreate.css:2`; `components/KineoBolt.tsx:3`; `app/appearance.css:5` |
| Nomes em inglês | IMPLEMENTADO: Video templates, Base video, Your version | `app/recreate/RecreateClient.tsx:210`; `app/recreate/RecreateClient.tsx:249`; `app/recreate/RecreateClient.tsx:254` |
| Antes/depois | PREPARADO / INSPECIONADO VISUALMENTE: mesmo formato Elevator no antes e depois, desktop e celular, componentes reais renderizados com dados simulados | `ANTES-DEPOIS.html`; `compare-desktop.png`; `compare-mobile.png` |
| Acesso e cobrança | PRESERVADOS / guardião offline executado: apenas contas internas, preço só no Generate, fonte canônica e débito no servidor | `../recreate-0911/test-recreate.cjs`; `lib/recreate/access.ts`; `lib/checkoutPricing.ts:11` |
| Publicação | NÃO PUBLICADO; lote local, sem mover fila, aplicar migration, acessar credenciais ou executar render pago | Gate do lote original em `../recreate-0911/RELATORIO.md` |

## ✅ O QUE VOCÊ PRECISA FAZER

1. **SUGESTÃO — sessão CEO:** conferir a comparação e fazer a revisão técnica do lote acumulado, incluindo a migration social que segue não aplicada. A decisão visual B já foi aprovada pelo fundador; não há pedido de nova autorização para implementá-la.
2. **SUGESTÃO — sessão CEO:** seguir a fila existente somente depois da conferência/aplicação autorizada da migration e integração com a base de publicação. O primeiro canário pago continua na sessão CEO, com conta interna e conferência de identidade, entrega, débito e estorno.

## 📋 O QUE ACONTECEU

**DECISÃO APROVADA:** Joseph aprovou a alternativa B e pediu os nomes em inglês em 10/11/2026; registro em `docs/DECISIONS.md`, seção dessa data. O vídeo escolhido saiu da miniatura do painel esquerdo e passou ao quadro grande da direita. Fotos, ajustes opcionais e Generate viraram três cartões à esquerda. A biblioteca continua com todos os formatos próprios e os efeitos existentes. No celular, a prévia vem antes do painel, conforme a proposta aprovada.

**FATO CONFIRMADO / IMPLEMENTADO:** cada posição de foto tem seleção, prévia local, troca e remoção próprias. Ao remover a primeira pessoa, a segunda não muda de posição. O recorte de rosto e a composição de duas fotos reaproveitam as funções atuais. As fotos só são enviadas quando a pessoa aciona Generate. Os campos exigidos e a permissão precisam estar preenchidos; alterações durante preparação ou geração ficam bloqueadas. Trocar o vídeo-base limpa fotos, permissão e pedido anterior. O status do resultado usa “Your version”.

**FATO CONFIRMADO / IMPLEMENTADO:** o CSS usa os tokens existentes (`--bg`, `--sidebar-bg`, `--card`, `--indigo`, `--accent` e pares), preservando a preferência de tema. Não altera o tema global. O símbolo vem de `KineoBrandIcon`. API, motor, preço, autorização e SQL não foram modificados nesta atualização. Não há nova promessa de vídeo longo, sequência de cenas, Motion, upload de vídeo externo ou publicação no YouTube.

**TESTADO LOCALMENTE — 10/11/2026:** TypeScript completo e guardião de Recreate. Os handlers reais da interface foram executados com adaptadores de arquivo e API locais: escolha das fotos fora de ordem, remoção da pessoa 1 mantendo a pessoa 2, substituição, composição esquerda/direita, recorte na receita de Swap, mudança de formato, permissão e recusa de upload com saldo insuficiente. A mesma suíte conserva os testes de preço adulterado, conta externa, reenvio, débito antes do fornecedor, estorno e tarifas de todos os efeitos. Os mutantes de preço fora do Generate e nome de motor foram reancorados nos novos elementos sem retirar as verificações.

**TESTADO LOCALMENTE — visual:** Chrome headless em perfil temporário isolado, documentos SSR autocontidos e nenhum backend real. Verificação de geometria em viewports reais de 1280, 390 e 320 px; prévia à direita no desktop e acima no celular; ausência de transbordamento horizontal; abertura nativa dos ajustes; estabilidade da referência durante rolagem do painel e da galeria; casos de uma foto, duas fotos, efeito de preset, catálogo e tema claro. A primeira captura direta não representava um viewport estreito real devido ao mínimo de janela do Chrome; foi descartada e regenerada com iframe de dimensões explícitas. As evidências finais registram e exigem a largura efetiva, não apenas o argumento de lançamento. Imagens finais abertas e inspecionadas. Os vídeos aparecem em pôsteres; isto não comprova reprodução real.

**QUESTÃO PENDENTE / NÃO TESTADO EM PRODUÇÃO:** autenticação e tema da conta publicada, seleção real de foto pessoal, qualidade do recorte, upload/moderação reais, provedor, persistência e cobrança em produção. O teste de handlers usa arquivos/API simulados e o teste visual usa SSR, não uma sessão autenticada em produção. As falhas legadas anteriores seguem discriminadas no relatório do lote original; não se declara toda a suíte do repositório verde.

**SUGESTÃO / próximo passo recomendado:** revisão e canário interno no gate já acordado. A Parte 2 (botão de série), a moldura Film · Cartoon · Recreate e uma futura montagem de vários clipes continuam fora desta alteração visual.
