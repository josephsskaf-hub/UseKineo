# Showcase — entrega de 04/10/2026

**DECISÃO APROVADA — fundador, 01/10/2026:** esta entrega passou de stage para encaminhamento a produção pelo publicador revisado da casa. O nome deste arquivo mantém a data solicitada; o relatório de sábado corresponde a 03/10/2026, 20h, São Paulo.

## Resultado

**FATO CONFIRMADO — IMPLEMENTADO:** `/showcase` apresenta filmes, imagens, espaços antes/depois e anúncios da casa, com o formato visual do Studio. Quem chega pode examinar os exemplos e abrir o produto correspondente. Headline e CTAs pedidos estão em `app/showcase/ShowcaseClient.tsx:61`; estilos e variação pública em `app/showcase/showcase.css:1`.

**FATO CONFIRMADO — IMPLEMENTADO:** selos reais e mídia local derivada do catálogo autorizado (`lib/showcase.ts:1`); seis filmes e três peças em cada outra seção. Nada de masters ou vídeos de clientes. As prévias tocam só visíveis, pausam na saída/aba oculta e respeitam movimento reduzido (`components/showcase/ShowcaseMedia.tsx:1`).

**FATO CONFIRMADO — IMPLEMENTADO:** 16 idiomas completos, incluindo títulos e controles (`lib/showcaseCopy.ts:1`); seletor de aparência claro/escuro; link no rodapé global (`components/Footer.tsx:86`); title, description, canonical e imagem social próprios (`app/showcase/page.tsx:8`). Imagem social composta localmente a partir das capas existentes, sem geração paga.

## Prova visual

**FATO CONFIRMADO — TESTADO LOCALMENTE, 01/10/2026:** [ANTES-DEPOIS.html](showcase-2026-10-04/ANTES-DEPOIS.html) é autocontido, sem servidor/build, e contém cada seção e rodapé em comparação desktop/mobile. Botões trocam os prints de tema claro e escuro. Antes: `/showcase` devolvia 404 na base `87825d3225af384ed4c887a7faf7bacbe4546c47` ([prova](showcase-2026-10-04/baseline-browser.json)).

| Prints locais | Claro | Escuro |
|---|---|---|
| Computador | [Página completa](showcase-2026-10-04/desktop-light.jpg) | [Página completa](showcase-2026-10-04/desktop-dark.jpg) |
| Celular | [Página completa](showcase-2026-10-04/mobile-light.jpg) | [Página completa](showcase-2026-10-04/mobile-dark.jpg) |

**FATO CONFIRMADO — TESTADO LOCALMENTE, 01/10/2026:** [browser.json](showcase-2026-10-04/browser.json) registra 200 anônimo, troca de todas as peças, pausa, cortina manual, fonte ausente nos vídeos fora da tela, metadados, 16 idiomas a 360 px sem rolagem lateral e RTL. Os eventos/API foram simulados e toda rede externa do navegador foi bloqueada; este arquivo não é evidência de produção.

## Gates

**FATO CONFIRMADO — TESTADO LOCALMENTE, 01/10/2026:** [guardian.txt](showcase-2026-10-04/guardian.txt): 17 verificações, incluindo 12 mutantes que fazem a mesma asserção falhar (motor errado, mídia privada/master, idioma ausente, vídeo fora da tela, aba oculta, fonte antecipada, rodapé ausente, interruptor desconectado, duplicação e evento sem versão/confirmação).

**FATO CONFIRMADO — TESTADO LOCALMENTE, 01/10/2026:** [tsc.txt](showcase-2026-10-04/tsc.txt): TypeScript do projeto inteiro, sem diagnóstico. A suíte completa e o comparativo por arquivo/asserção ficam em [suite.json](showcase-2026-10-04/suite.json). Resultado em 01/10/2026: main 596/737 aprovados; candidato 597/738 aprovados; as mesmas 141 falhas anteriores; nenhum teste ou asserção com vermelho novo. Falhas já existentes na main não foram escondidas nem “corrigidas” fora do escopo. O guardião do rodapé foi reancorado apenas para o link aprovado; preserva o conjunto exato dos demais destinos.

## Branch, SHA e publicação

**FATO CONFIRMADO — Git local, 01/10/2026:** worktree `C:\kineo\.claude\worktrees\stage-showcase`; branch de desenvolvimento `stage/showcase`; implementação e ajuste final do contrato em `e86a8d97f00478abf4540024f3433b3e839fadb3`. A branch `codex/showcase-20261001` será a portadora da fila, exigida por `scripts/enfileirar.sh:7`. Commits posteriores somente empacotam documentação/provas.

**FATO CONFIRMADO — procedimento:** o SHA FINAL DO CANDIDATO e o SHA completo da main revisada ficam congelados, literalmente, nos dois argumentos do arquivo `C:\kineo\PUBLICAR-SHOWCASE-2026-10-01.bat`. Esse é o identificador definitivo da publicação, incluindo este relatório (um arquivo rastreado não pode conter o hash do próprio commit sem mudá-lo). Conferência local: `git rev-parse codex/showcase-20261001`; código validado: `git log --oneline 87825d32..codex/showcase-20261001`.

**CONTRADIÇÃO — conciliada com segurança:** o remoto não tem `origin/entrega-atual` na consulta de 01/10; a fila real é `refs/heads/entrega-atual`. Foi consultada e incluída antes de enfileirar. O publicador da raiz é legado e não valida os SHAs; o PUBLICAR chama `scripts\!RODAR-AGORA.bat` da própria worktree, cuja versão revisada recusa divergência da main/fila. Nenhum arquivo legado foi sobrescrito e nenhum push direto foi dado.

**QUESTÃO PENDENTE / DESCONHECIDO:** enfileirar/criar o botão não confirma publicação nem deploy. Até a execução pelo fundador e a verificação pública posterior, o estado comercial continua aguardando publicação. Nenhum resultado é declarado VALIDADO EM PRODUÇÃO por testes locais.

## Medição: antes → depois

**FATO CONFIRMADO — IMPLEMENTADO:** impressão e primeiro gesto carregam `showcase_version=showcase_v1`; campanha de passagem `showcase_v1` preserva a origem externa anterior. Veja [MEDICAO.md](showcase-2026-10-04/MEDICAO.md) para pessoa identificada, anonimato, exclusão de internos/bots, vínculo de cadastro e receita realmente paga.

| Resultado | Antes | Depois |
|---|---|---|
| Pessoas identificadas expostas | Sem coorte comparável | Aguardando publicação e leitura real da v1 |
| Cadastros atribuídos | Sem coorte comparável | Aguardando publicação e leitura real da v1 |
| Novos pagantes recorrentes | Sem coorte comparável | Aguardando cobrança comprovada da coorte |
| MRR atribuído por moeda | Sem coorte comparável | Desconhecido; nenhum valor estimado |

**SUGESTÃO — manter:** portfólio com exemplos aprovados e atribuição versionada, enquanto a coorte acumula evidência. **SUGESTÃO — desligar:** somente se houver defeito real de mídia/acesso/privacidade ou medição incorreta, pelos interruptores abaixo. **QUESTÃO PENDENTE / DESCONHECIDO — para o fundador decidir no sábado:** próxima curadoria/campanha com base nos cadastros e pagamentos verificados; nenhum gasto foi iniciado nesta entrega.

## Como desfazer

**FATO CONFIRMADO — IMPLEMENTADO:** `SHOWCASE_PUBLIC=false`, em `lib/showcaseTelemetry.ts:2`, desliga página e link do rodapé; `SHOWCASE_TELEMETRY_ENABLED=false`, na linha seguinte, desliga só a coleta. Aplicar em nova branch, validar e publicar pelo mesmo caminho da casa. Não mudar ambiente, banco, main ou fila por força. Se a entrega ainda não foi publicada, não executar o PUBLICAR; preservar a fila alheia e conciliar sua retirada em outra entrega revisada.
