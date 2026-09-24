# Raio e navegação — 24/09/2026

**DECISÃO DO USUÁRIO NESTA TAREFA:** usar o raio azul aprovado da homepage em todos os ícones da interface, incluindo o Studio, e retirar temporariamente Editing tools e Arena da navegação.

**IMPLEMENTADO:** `components/KineoBolt.tsx` centraliza o glifo ϟ, tipografia e azul #2997ff. Aplicado a marca, menu lateral, cabeçalho móvel, planos, autenticação, créditos, seleção de motor, rodapé e raios decorativos das páginas e controles. Botões usam a cor de seu texto quando necessária para contraste sobre azul sólido. `KineoBoltText` troca apenas o glifo na apresentação de textos escritos pelo produto; chaves de tradução e conteúdo de usuários permanecem intactos.

**IMPLEMENTADO:** links Editing tools e Arena removidos da navegação principal; Editing tools também removido do menu móvel e o atalho para o mesmo hub retirado do rodapé. Rotas e código das ferramentas preservados para reforma posterior. Não houve alteração da composição, filmes, prompts, cobrança, autenticação ou geração.

**TESTADO LOCALMENTE:** TypeScript sem erros; os 20 scripts críticos do Guardião passaram, incluindo 2.091 verificações de idioma, 180 de home, 90 de navegação e fluxos do app, 70 de publicação/autoria e 640 das cinco melhorias. Galeria com 553 verificações também aprovada.

**ARTEFATO VISUAL:** RAIO-MENUS-ANTES-DEPOIS.html no diretório de outputs da tarefa, com comparação do JSX real de navegação pública, Studio/menu lateral, planos, login e rodapé em desktop/celular. Dados de conta e saldo são fictícios. Verificação interativa e evidência de publicação registradas no handoff externo após o deploy.
