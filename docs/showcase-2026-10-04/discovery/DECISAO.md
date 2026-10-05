# Showcase — descoberta orgânica, 01/10/2026

**EVIDÊNCIA DE PRODUÇÃO — 01/10/2026, 21:41 UTC:** [production.json](production.json) registra GET público de `/showcase` e `/sitemap.xml`. Ambos responderam HTTP 200. O portfólio contém os quatro destinos pedidos e o bloco de valor em filmes integrado pela frente MRR. O sitemap publicado não contém a URL canônica do Showcase. A leitura não executou JavaScript nem criou eventos de navegação.

**FATO CONFIRMADO — Git, 01/10/2026:** o candidato original `3aba3b0b7bbcbee9df0e66ad08b121a5a01acef9` é ancestral da main consultada `ea7b95d1b2dbc2df0741417d24741eecc06a0a2f`. Portanto não reenfileirar a entrega original. O bloco MRR está em `app/showcase/ShowcaseExperience.tsx:13` e continua fora desta alteração.

**HIPÓTESE — gargalo comercial:** a ausência do portfólio no mapa de URLs limita uma das formas de descoberta da prova por buscadores. Incluir a URL pode ajudar tráfego qualificado a chegar aos exemplos. Não é evidência de que essa ausência causou perda de vendas, nem garantia de indexação, citações ou crescimento diário do MRR.

**FATO CONFIRMADO — IMPLEMENTADO LOCALMENTE:** `app/sitemap.ts:339` inclui uma única URL canônica do portfólio, subordinada ao interruptor público existente. A data de revisão pertence somente a essa URL; outras páginas não recebem datas novas. Desligar `SHOWCASE_PUBLIC` também retira a entrada do mapa.

**FATO CONFIRMADO — IMPLEMENTADO LOCALMENTE:** `components/showcase/ShowcaseTelemetry.tsx:29` acrescenta `showcase_discovery_version=showcase_sitemap_20261001_v1` às impressões e primeiros gestos novos. A coorte original, a deduplicação e a atribuição da frente MRR são preservadas. Recibos anteriores não são apagados: não fabricar nova impressão de quem já foi contado. O marcador comprova versão do emissor; não comprova que a pessoa veio do sitemap.

**SUGESTÃO — régua de continuar/parar:** primeiro verificar a entrada canônica no sitemap público após publicação. Depois analisar as pessoas externas identificadas expostas ao marcador, cadastros vinculados e primeiras assinaturas realmente pagas, conforme [MEDICAO.md](../MEDICAO.md). Anônimos, robôs e leituras técnicas ficam separados. Continuar enquanto a página estiver íntegra; sem identidade/atribuição suficiente, manter resultado comercial desconhecido. Corrigir ou retirar a entrada se apontar para página indisponível, privada ou não canônica. Não substituir receita por cliques ou indexação.

**QUESTÃO PENDENTE / DESCONHECIDO — antes → depois:** antes, ausência no mapa público comprovada; depois técnico ainda local. Visitantes humanos, cadastros, novos assinantes e MRR atribuídos: desconhecidos. O novo campo é o corte da entrega, não a hora. Não há controle causal; relatórios não devem anunciar aumento de receita decorrente desta mudança.

**DECISÃO APROVADA — mandato do fundador e regra diária de 01/10:** trabalhar em branch nova sem repetir o PUBLICAR do dia. Branch `codex/showcase-observacao-20261001`, worktree própria `C:\kineo\.claude\worktrees\stage-showcase`. Esta correção fica local e não altera a fila nem o botão congelado anteriormente. A publicação futura exige novo fetch, integração da main/fila e gates revistos pelo caminho da casa. Nenhum envio, nova automação, crédito ou acesso financeiro foi iniciado.

**FATO CONFIRMADO — reversão:** remover a entrada do sitemap e o campo adicional de telemetria em novo commit revisado. O interruptor público continua disponível para retirar a página inteira somente se houver defeito que justifique isso. Nenhuma alteração visual foi feita; as provas visuais anteriores continuam documentando o portfólio, não a integração MRR posterior.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 01/10/2026:** código em `214c3246ef6357b4f901674bf092e5059b9afd49`. [TypeScript](tsc.json) sem diagnóstico; [guardião](guardian.txt) com 23 verificações, incluindo 17 mutantes vivos; [suíte completa](suite.json) com 741 testes de cada lado, 600 aprovados e as mesmas 141 falhas anteriores, sem teste ou asserção vermelha nova. Rede bloqueada e ambiente dos processos sem credenciais. Dois guardiões antigos que inspecionam `git diff HEAD` foram repetidos após o commit do produto, equiparando a árvore limpa da baseline; nenhum teste alheio foi alterado.

**FATO CONFIRMADO — separação de estados:** portfólio original PUBLICADO por HTTP; correção do sitemap LOCAL; EXPOSTO a pessoas únicas DESCONHECIDO; PAGO/MRR atribuídos DESCONHECIDO. A decisão de publicação não foi solicitada novamente e nenhum PUBLICAR adicional foi criado em 01/10.
