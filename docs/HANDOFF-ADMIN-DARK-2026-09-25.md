# ADM escuro e Home sem atalho de tema — 25/09/2026

DECISÃO DO FUNDADOR: corrigir cards brancos/textos ilegíveis no ADM escuro; retirar o atalho de aparência junto ao idioma/créditos na Home.

FATO CONFIRMADO: CeoClient mantém fundo preto e cards escuros explícitos, enquanto LiveNowPanel usa `--card` e títulos usam `--text`. O Light global fazia estes elementos herdarem branco/grafite.

IMPLEMENTADO: app/admin/layout.tsx e app/(dashboard)/admin/layout.tsx aplicam o mesmo escopo `.kineo-admin-theme`, que reutiliza a declaração Dark em app/appearance.css. Sem mudar preferência persistida, autenticação, dados, métricas ou ações administrativas. A Home remove apenas seu AppearanceSettingsButton; AccountPanel e AccountClient mantêm o acesso à aparência.

TESTADO LOCALMENTE: typecheck bruto; sharing safety (70); five improvements (646); comparação do JSX real do CEO/LiveNowPanel com dados fictícios e sem rede. Prévia em outputs/admin-dark-20260925/antes-depois.html e home-menu.html no workspace visual. A validação em produção depende da conclusão do deploy.

ESCOPO: cores do conteúdo administrativo e atalho da Home. Não há alteração no menu público das outras páginas nem na lógica de cobrança/geração.
