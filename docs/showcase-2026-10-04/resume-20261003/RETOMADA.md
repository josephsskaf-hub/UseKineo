# Showcase — retomada de 03/10/2026

**EVIDÊNCIA DE PRODUÇÃO — 03/10/2026, 09:50 UTC:** [production.json](production.json) confirma `/showcase` público, HTTP 200 e canonical próprio; o sitemap público ainda não contém a rota. A entrega inicial não foi refeita.

**FATO CONFIRMADO — Git local:** branch `codex/showcase-observacao-20261001`, worktree `C:\kineo\.claude\worktrees\stage-showcase`. Integração de `origin/main=6ac5d2b8bbef9ad59a373f33238ca52e728e23cc` e da fila local `456f4b65f0c6c8b6687ae5107a271d9d2729cc6a` em `ea20f9edb0ec9fd34465a8af64c9211ced345cd7`. `origin/entrega-atual` continua ausente; a fila real foi preservada. Conflito somente em `docs/DECISIONS.md`, conciliado mantendo ambas as entradas.

**FATO CONFIRMADO — escopo próprio:** somente entrada canônica no sitemap, subordinada ao interruptor público, e campo `showcase_discovery_version=showcase_sitemap_20261001_v1` na impressão e primeiro gesto já existentes. Nada foi reescrito na entrega MRR; o candidato inclui a fila que já estava aguardando publicação. Detalhamento dessa fila e suas provas: `docs/stage-mrr/INTEGRATION-20261002.md`. HOLD de e-mail preservado.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 03/10/2026:** [tsc.json](tsc.json) sem diagnóstico. [browser.json](browser.json) registra o teste do navegador contra o servidor Next local, API simulada e rede externa bloqueada; 16 idiomas sem rolagem lateral, reprodução por visibilidade, seleção de exemplos, cortina e deduplicação. O mesmo teste verificou o campo adicional nos eventos e a entrada canônica no sitemap HTTP local. Não são visitas comerciais ou prova de cobrança.

| Prints locais do conjunto integrado | Claro | Escuro |
|---|---|---|
| Computador | [Página](desktop-light.jpg) | [Página](desktop-dark.jpg) |
| Celular | [Página](mobile-light.jpg) | [Página](mobile-dark.jpg) |

**EVIDÊNCIA DE PRODUÇÃO — leitura do relatório existente, corte 02/10/2026 03:07 UTC:** `docs/stage-mrr/daily-mrr-20261002.json` registra duas pessoas externas identificadas expostas à porta do Showcase na home. Isso não comprova abertura do portfólio, cadastro ou pagamento. A consulta seleciona eventos MRR pelo campo `version`; não substitui a coorte original `showcase_version`.

**QUESTÃO PENDENTE / DESCONHECIDO — resultado comercial:** pessoas na página, cadastros vinculados, primeiras assinaturas e MRR atribuídos ao Showcase continuam sem leitura conclusiva nesta sessão. Antes da primeira versão não existe coorte comparável. O relatório de sábado deve conservar a régua de `../MEDICAO.md`, separar LOCAL/PUBLICADO/EXPOSTO/PAGO e não transformar falta de dados em zero.

**SUGESTÃO — manter/desligar:** manter a prova pública e os CTAs já funcionais; levar a descoberta do sitemap pelo caminho da casa após os gates. Desligar a entrada junto da página por `SHOWCASE_PUBLIC=false` somente diante de defeito real que justifique retirar o portfólio; a correção restrita pode ser revertida separadamente. Sem nova campanha, envio, render pago ou automação.

**DECISÃO APROVADA — procedimento do fundador:** o PUBLICAR de 03/10 congela o SHA final do candidato e da main em dois argumentos completos; chama o publicador seguro da própria worktree. O agente não executa esse botão. Se fila/main avançarem depois do congelamento, o publicador recusa: conciliar e repetir os gates antes de preparar outro candidato. O limite diário de um aviso/arquivo da sessão continua valendo.

**FATO CONFIRMADO — TESTADO LOCALMENTE, gates finais de 03/10:** [suite.json](suite.json): main 744 testes, 603 aprovados, 141 falhas; candidato integrado 747 testes, 606 aprovados, as mesmas 141 falhas. Nenhum arquivo ou asserção com vermelho novo. [guardian.txt](guardian.txt): 23 verificações, incluindo 17 mutantes vivos. Nenhum teste preexistente foi reescrito nesta retomada. Novo fetch ao final confirmou main e fila nos mesmos SHAs acima.

**FATO CONFIRMADO — identificação do pacote:** o código final revisado é `ea20f9edb0ec9fd34465a8af64c9211ced345cd7`; o commit seguinte apenas registra estas provas. O SHA completo definitivo do pacote (incluindo este documento) será congelado como primeiro argumento de `C:\kineo\PUBLICAR-SHOWCASE-2026-10-03.bat`, junto da main revisada no segundo argumento. Conferir `git rev-parse codex/showcase-observacao-20261001`; nenhum hash truncado é usado pelo publicador.
