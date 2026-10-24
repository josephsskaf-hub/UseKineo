# KINEO-CARTOON-TRACAO-2210 — entrega de 22/10 e reancoragens de 23–24/10/2026

## Reancoragem de 24/10/2026

**FATO CONFIRMADO — IMPLEMENTADO:** integração por merge, sem rebase, da main `7950e41134dd03388e67c131501d3e2bce61a3eb` sobre a ponta já publicada `189e7e2b537e48df18849ca1a1867a1b78128493` da branch `codex/cartoon-tracao-2210`. Campanha, helper de e-mail, páginas, Instagram e previews permanecem iguais à entrega publicada. Preços, URLs, metadados, `lib/engineWall.ts` e `lib/homeVideoCuration.ts` permanecem iguais à main incorporada ou à entrega anterior, conforme a fonte correspondente. Evidência: `C:/tmp/cartoon-reanchor-2410/tracao-boundaries.json`.

**FATO CONFIRMADO — IMPLEMENTADO / TESTADO LOCALMENTE:** o guardião e o desfaz agora usam a base `7950e411` (`scripts/test-cartoon-tracao.mjs:16`; `scripts/test-support/desfaz-cartoon-tracao-2210.mjs:8`). Nove fontes existentes e 24 blocos exatos voltam à main em memória, com CRLF, caminhos Windows, idempotência e rejeição de blocos alterados, ausentes ou duplicados. A camada Cartoon sai antes dos hashes de Idiomas/Public/Escolha; o inventário histórico de Idiomas fica fixado na entrega `7950e411`, enquanto o guardião Cartoon continua conferindo uma lista finita do escopo atual (`scripts/test-idiomas-formatos-undo-2410.mjs:9`). O teste e o helper Escolha da main foram preservados integralmente; nenhum manifesto, hash ou snapshot histórico foi recapturado.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 24/10:** a primeira execução do guardião reancorado passou com **330 verificações e 17 mutantes reais de disco**, detectados por assertivas e restaurados byte a byte. A cadeia histórica passou suas nove provas adicionais, incluindo a retirada do adapter mais novo e o bypass dos hashes de Idiomas, Escolha e Pacing. TypeScript `--noEmit --incremental false` encerrou com código zero e saídas vazias. Hashes RAW das fontes antes/depois permaneceram idênticos. Fontes: `C:/tmp/cartoon-reanchor-2410/tracao-guardian-first.json`, `tracao-head-first.json` e `tracao-tsc-first.json`, com logs correspondentes.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 24/10:** os testes reais de Idiomas e Public passaram: o primeiro verificou 104 fontes exatas, as duas histórias imutáveis e o inventário; o segundo passou suas nove provas e 24 mutantes detectados por assertiva, usando os controladores e builders atuais. Fontes: `C:/tmp/cartoon-reanchor-2410/tracao-idiomas-first.json` e `tracao-public-first.json`. Essas execuções e o guardião usaram bloqueio de rede/arquivos de ambiente e serviços simulados, sem banco real, chamada paga ou envio. Os recibos preservam os hashes das fontes.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 24/10:** comparação independente da main `7950e41134dd03388e67c131501d3e2bce61a3eb` com o código reancorado `31a823061564cf2b1a0cff73cf8f5be973187c34`, na seleção dos leitores afetados e dos comandos críticos atuais:

| Execução | Comandos | Conformes ao resultado esperado | Não conformes |
|---|---:|---:|---:|
| Main 795, observação anterior após cinco diagnósticos | 324 | 297 | 27 |
| Main 795, comparação que conserva C1 como falha preexistente | 324 | 296 | 28 |
| Candidato 31a823, bruto preservado | 325 | 296 | 29 |
| Candidato 31a823, após o diagnóstico válido de GEO2; C1 continua falho | 325 | 297 | 28 |

**FATO CONFIRMADO — TESTADO LOCALMENTE:** as quatro rejeições intencionais com exit 1 estão entre os resultados conformes. A comparação encerrou sem novos vermelhos, comandos removidos ou mudanças nos membros internos falhos, incluindo os comandos conformes. A seleção contém os 56 comandos críticos atuais em 52 arquivos; não é uma nova execução integral dos 1.009 arquivos de teste. O único comando acrescentado é o guardião Cartoon sem argumentos, com 274 verificações literalmente registradas no log.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** C1 de Ads Roteiros permanece **não conforme**. Seu log bruto no candidato e na única repetição extra é byte a byte igual ao bruto da main (30 verificações verdes e uma falha C1). A execução verde anterior da main (31/0) permanece registrada como observação alternativa, sem substituir ou apagar as falhas. O diagnóstico temporário pareado conservou A/B, os seis subcasos, argumentos, prazo de 5.500 ms e assertivas: somente `curto.r.ok` falhou nas duas árvores. O carregamento levou 533 ms na main e 560 ms no candidato, deixando 4.967/4.940 ms, abaixo do mínimo de 5.000 ms. Ambos retornaram timeout sem chamar o modelo nesse subcaso; os outros cinco subcasos passaram. A classificação de falha preexistente variável é específica desse caso e das provas de fontes, entradas e resultados; nenhum prazo, teste, assertiva ou código do produto foi alterado para obter verde. O diagnóstico não atribui retrospectivamente um subpredicado aos logs brutos que não o imprimiam.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** a main conserva os 289 resultados originais, os 35 complementares e os cinco diagnósticos seriados com seus motivos. Duas repetições corrigiram a classificação do harness para mutantes de fonte; duas concluíram sem os limites internos de VM observados antes; C1 teve a observação verde alternativa descrita acima. No candidato bruto, GEO2 rejeitou quatro mutantes porque atingiram o limite interno de 5.000 ms, sem aceitar esses limites como detecção válida. Sua única repetição diagnóstica passou, com os motivos corretos. C1 foi repetido uma única vez e continuou falho. Fontes, argumentos, assertivas, limites e bloqueio offline permaneceram iguais nos dois diagnósticos; os logs brutos e diagnósticos ficam separados. A causa dos limites de GEO2 não foi demonstrada. O informe parcial em 321 comandos que havia chamado C1 de conforme foi corrigido: término do processo não significava aprovação.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** a auditoria F1 derivou seis membros falhos em A4b e quatro em U4 na main 795. Os mesmos 25 membros, referências realmente usadas por `git show`, tabelas, textos e resultados de desfaz coincidem no candidato. A mudança compartilhada de `origin/main` para `1c078ed013302ac47c42f783305df688c4e97cfd` foi revisada por entrada: 21 leitores não alcançam o fallback, um mantém o mesmo merge-base e seis têm provas específicas dos blobs/diffs lidos. O registro original continua separado da prova estrutural posterior; não foi fabricado rastreamento antigo de Git.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** 19 diferenças literais de saída foram revisadas e vinculadas aos logs RAW por SHA; não se afirma identidade literal de todos os logs. O guardião com mutantes passou com 330 verificações e 17 mutantes reais restaurados byte a byte; o desfaz cobre nove fontes e 24 blocos exatos. TypeScript passou. Fontes RAW, assets e arquivos protegidos permaneceram íntegros. As 28 não conformidades herdadas são resultados dos testes, não 28 defeitos do produto demonstrados.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** recibo consolidado `C:/tmp/cartoon-reanchor-2410/tracao-795-independent-final-receipt.json`, SHA256 `e6dbd3e6c151433253b31f56d233f21b712587953a8528d42ad3c39f1a64798a`. As provas específicas estão em `main-795-diagnostic-overlay-provenance.json`, `tracao-795-two-diagnostics-once-receipt.json`, `tracao-795-c1-paired-baseline.json`, `tracao-795-c1-paired-candidate.json`, `tracao-795-f1-actual-member-audit.json` e `shared-origin-main-fallbacks-795-31-review.json`, no mesmo diretório. As histórias abaixo mantêm suas datas e bases. O destino autorizado é somente a branch `codex/cartoon-tracao-2210`; o SHA remoto é conferido após o push. Nenhum e-mail, chamada paga, build ou deploy foi executado; publicação da branch não comprova exposição ou resultado comercial.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** os seis assets de home que impediram a primeira tentativa de merge estavam byte a byte iguais à ponta `189e7e2b`, mas marcados com `skip-worktree`. Houve backup RAW e recibo de SHA, limpeza dessa marca apenas nesses seis caminhos e restauração pontual autorizada; o merge trouxe os bytes da main. Evidência: `C:/tmp/cartoon-reanchor-2410/tracao-public-before/receipt.json`. Os demais arquivos de mídia foram preservados.

## Reancoragem de 23/10/2026

**FATO CONFIRMADO — IMPLEMENTADO:** merge real, sem rebase, da main `895d6c99638dc0af65e11ad761f4999141587fa7` na branch `codex/cartoon-tracao-2210`. O commit de código `c09262a3005171c5b7c8732afad98d5374d3255c` tem como pais a ponta anterior `f1df9a4e800558a8a109b9201c593e3bb72f3688` e essa main. Campanha, páginas, preços e Instagram permanecem iguais à entrega anterior; os ajustes próprios desta rodada integram os guardiões da main.

**FATO CONFIRMADO — IMPLEMENTADO / TESTADO LOCALMENTE:** a base Cartoon foi reancorada na nova main (`scripts/test-cartoon-tracao.mjs:16`). O desfaz recomposto cobre nove fontes existentes e 23 blocos exatos, incluindo a cabeça Escolha (`scripts/test-support/desfaz-ads-escolha-2310.mjs:33`). O Pacing mantém o seletor histórico da main; o inventário próprio de Escolha fica fixado na sua entrega encerrada, enquanto o escopo atual Cartoon segue finito (`scripts/test-ads-escolha-2310.mjs:11`; `scripts/test-cartoon-tracao.mjs:322`). Nenhum hash ou snapshot histórico foi atualizado para aceitar o merge. As provas preservam a rejeição de um caractere externo e detectam a retirada do adapter mais novo ou do hash (`scripts/test-cartoon-tracao.mjs:291`).

**FATO CONFIRMADO — TESTADO LOCALMENTE, 23/10:** `--mutants` passou com 324 verificações e 17 mutantes de disco detectados/restaurados byte a byte. A execução sem essa opção na bateria ampla passou com 268 verificações. TypeScript `--noEmit --incremental false` retornou zero. Fontes: `C:/tmp/cartoon-reanchor-2310/tracao-guardian-final.log`, `tracao-tsc-result.json` e `tracao-895-resumed/test-cartoon-tracao.mjs.log`.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 23/10:** comparação independente completa, por arquivo e por falha interna:

| Execução | Arquivos concluídos | Verdes | Vermelhos |
|---|---:|---:|---:|
| Main original, preservada | 996 | 843 | 153 |
| Main consolidada após quatro reruns em série | 996 | 846 | 150 |
| Candidato reancorado | 997 | 847 | 150 |

**FATO CONFIRMADO — TESTADO LOCALMENTE:** zero novos vermelhos, testes removidos, falhas internas alteradas, diferenças de exit/signal, timeouts ou bloqueios offline na comparação consolidada. Os 150 resultados herdados são falhas de teste no ambiente offline; não equivalem a 150 defeitos comprovados do produto. Os quatro reruns preservaram fontes e assertions: I4/Segue/Texto passaram; Demo concluiu com as mesmas D6/D10 do candidato. O raw original e os motivos permanecem separados em `main-895-complete.json`, `main-895-reruns.json`, `main-895-reruns-integrity.json` e `main-895-effective.json` em `C:/tmp/cartoon-reanchor-2310/`.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** a cobertura do candidato foi retomada com mais paralelismo no mesmo HEAD limpo: 320 resultados já concluídos, ledger e logs preservados byte a byte, seguidos dos 677 arquivos restantes. A tentativa original incompleta não foi apresentada como bateria concluída. A proveniência foi conferida por SHA e por arquivo; as fontes permaneceram intactas. Os sete testes que escrevem mutantes de fonte rodaram somente na fase exclusiva, com restauração.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** 33 diferenças literais de saída foram revisadas individualmente: inventários, PIDs, UUID de amostra, fixtures/timestamps/Git local e diagnóstico tsc. O TS2307 foi reproduzido com os dois comandos originais nas fixtures existentes; quatro fontes e compilador permaneceram idênticos, stdout igual após substituir somente o caminho exato e stderr vazio. Nos agregados F1 A4b/U4, os 15/10 membros, referências, conteúdos e membros falhos também são iguais. Recibo final: `C:/tmp/cartoon-reanchor-2310/tracao-895-independent-final-receipt.json`; detalhes por teste: `tracao-895-resumed-independent-comparison.json`; provas auxiliares: `tracao-895-resume-member-audit.json` e `limit-fit-diagnostics.json`.

**FATO CONFIRMADO:** `lib/engineWall.ts`, `lib/homeVideoCuration.ts` e `lib/kidsVenda/kidsVenda.ts` são byte a byte iguais à main incorporada. Não houve leitura de `.env`, chamada paga, envio, escrita em banco real ou comando de build/deploy. A pasta principal foi preservada; o destino de push desta entrega é somente a branch.

## Registro inicial de 22/10/2026 — evidências históricas

**FATO CONFIRMADO — IMPLEMENTADO / TESTADO LOCALMENTE:** base `origin/main` obtida no início da tarefa, `796333e9a07ee0c83bb414312a062b63f8fc32bb`; branch `codex/cartoon-tracao-2210`. A árvore principal foi preservada. Autorização: instrução do fundador em 22/10, “de 1 ao 4, vamos dar tração em todas”; publicação somente na branch, sem envio ou chamada paga.

## Campanha preparada

**FATO CONFIRMADO — IMPLEMENTADO:** `app/api/admin/send-kids-launch/route.ts:52` mantém sessão admin da casa, `force-no-store` e resposta sem cache. GET sem `confirm=SEND` é DRY_RUN: não escreve, não chama provedor e não exige chave de envio (`:73`). Retorna pessoas elegíveis, tamanho do próximo lote e totais PT/EN. Envio futuro exige `confirm=SEND&limit=N`, com inteiro de 1 a 60; ação vinda de outra origem é recusada (`:58`).

**FATO CONFIRMADO — IMPLEMENTADO:** `lib/growth/kidsLaunchEmail.ts:24` normaliza endereço e deduplica a coorte; um alias descadastrado ou bloqueado exclui o endereço inteiro. Exclui internos, qualquer pedido Kids (inclusive amostra/cancelado), envio ou tentativa anteriores e supressão recente da casa (`app/api/admin/send-kids-launch/route.ts:22`). Leituras paginadas e falha fechada antes de enviar. PT quando o país do perfil é BR, EN no restante (`lib/growth/kidsLaunchEmail.ts:19`); remetente e resposta `joseph@usekineo.com`, rodapé e cabeçalhos canônicos de descadastro (`:45`; `app/api/admin/send-kids-launch/route.ts:115`).

**FATO CONFIRMADO — IMPLEMENTADO:** o envio futuro reconsulta a elegibilidade, reserva o destinatário com PK determinística por endereço e envia com a mesma chave de idempotência (`app/api/admin/send-kids-launch/route.ts:96`; `lib/growth/kidsLaunchEmail.ts:39`). Só o aceite do provedor grava `kids_launch_email_sent` (`app/api/admin/send-kids-launch/route.ts:123`), também incluído na lista canônica `lib/lifecycle/emailEvents.ts:45`. Timeout, recusa, erro de ledger ou carimbo preservam a reserva para análise manual, sem retry automático. Aceite não comprova entrega na caixa de entrada. A cota mantém reserva para mensagens transacionais (`app/api/admin/send-kids-launch/route.ts:88`).

**QUESTÃO PENDENTE / DESCONHECIDO:** a quantidade real de destinatários não foi consultada; os números dos testes são fixtures. A rota está preparada para contar a base no dry-run autorizado após publicação. Nenhum GET foi feito ao endpoint de produção nesta tarefa.

## P07 e Instagram

**FATO CONFIRMADO — IMPLEMENTADO:** `components/kidsCartoon/KidsCartoonPages.tsx:51` atualiza as duas páginas existentes com resposta direta de 52 palavras por idioma, tabela das três ofertas, cinco FAQs e data 22/10/2026 (`:222`). Oferta dedicada derivada de `lib/kidsVenda/kidsVenda.ts:48`; cobrança brasileira em reais derivada de `lib/settlementCurrency.ts`. O P07 anterior foi adaptado à venda atual, sem manter a resposta antiga de que não havia assinatura dedicada. Metadados completos, URLs, títulos, canonicals e fontes de preço preservados (`components/kidsCartoon/KidsCartoonPages.tsx:166`; prova em `scripts/test-cartoon-tracao.mjs:204`). Sem garantia de tempo de geração. Avisos anteriores permanecem fora das cinco FAQs (`components/kidsCartoon/KidsCartoonPages.tsx:261`).

**FATO CONFIRMADO — PREPARADO:** `docs/CARTOON-INSTAGRAM-2210.md:34` contém 12 posts, seis Reels de Leo e seis carrosséis, com ganchos, legendas PT/EN, hashtags, CTA, horários BRT e temas (`:55`). Slides dos carrosséis também prontos em PT/EN. Horários classificados como hipótese; episódios, artes e publicações não foram gerados ou agendados.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** comparação visual autocontida em `docs/previews/cartoon-tracao-2210.html`, com imagens EN/PT desktop/mobile. Resumo, tabela, FAQs e avisos renderizados do componente real. QA visual sem recorte de conteúdo.

## Evidência de verificação

**FATO CONFIRMADO — TESTADO LOCALMENTE:** guardião `scripts/test-cartoon-tracao.mjs --mutants`: 303 verificações verdes e 17 mutantes de disco rejeitados por comportamento, com restauração dos bytes originais em `finally`. Exercita rota real com serviços simulados, paginação além de mil registros, erros em páginas posteriores, aliases, concorrência, rechecagem, timeout, cota, descadastro, idiomas, SSR, preços, metadados e conteúdo do Instagram. Nenhuma rede ou credencial real.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** desfaz de sete fontes / 21 blocos contra a base inicial, com CRLF, caminhos Windows, idempotência e preservação de alterações fora dos blocos (`scripts/test-cartoon-tracao.mjs:260`). Os hooks históricos removem somente essa camada; não trocam hashes ou snapshots anteriores. Mutantes extras verificam o hash direto (`:291`) e recusam caminhos fora da entrega (`:310`). Guardião integrado ao workflow crítico (`.github/workflows/guardiao.yml:112`, passo “Cartoon — campanha protegida e oferta citável”).

**FATO CONFIRMADO — TESTADO LOCALMENTE:** a primeira comparação revelou dois vermelhos novos no encadeamento histórico de Ads. A correção remove a camada Cartoon antes de aplicar mutações e hashes antigos e delimita o histórico próprio do pacing; a cerca de escopo atual passa a ser conferida por lista finita no guardião Cartoon. Após a correção, ADS Plan Failed (10 mutantes), ADS Pacing (32 mutantes) e desfaz Roteiro (725 verificações) passaram. Logs da primeira tentativa foram preservados, sem reclassificá-la como verde.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 22/10/2026:** comparação completa dos scripts de teste da base com o código final `d814f0954dfa62fe1e2ec75012a211181244395f`, sob bloqueio de rede e de leitura de arquivos de ambiente. Resultados por arquivo, não por assertiva:

| Execução | Arquivos concluídos | Verdes | Vermelhos |
|---|---:|---:|---:|
| Base original, preservada | 988 | 834 | 154 |
| Base consolidada após cinco reruns de infraestrutura | 988 | 839 | 149 |
| Candidato final | 989 | 840 | 149 |

**FATO CONFIRMADO — TESTADO LOCALMENTE:** zero novos vermelhos, zero testes removidos e zero mudanças nas assertivas que falham. O único teste novo é o guardião Cartoon, verde. Nenhum timeout ou bloqueio de rede/ambiente foi acionado. Os 149 resultados herdados são falhas de teste preexistentes; esta comparação não os classifica como 149 defeitos do produto. Fonte: `C:/tmp/cartoon-tracao-2210/candidate-v2-independent-comparison.json` (22/10/2026).

**FATO CONFIRMADO — TESTADO LOCALMENTE:** a preparação das cópias de teste deixou inicialmente arquivos de mídia indisponíveis. Os arquivos foram restaurados e somente os cinco casos afetados da base foram repetidos; passaram sem alteração de fonte. A execução original, razões individuais e reruns permanecem separados em `origin-main.json`, `baseline-rerun-reasons.json` e `origin-main-reruns.json`, todos em `C:/tmp/cartoon-tracao-2210/`. Isso corrige a comparação de infraestrutura, sem atribuir melhora ao produto.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** seis saídas vermelhas tiveram diferenças informativas revisadas: dois inventários aumentaram pela rota nova, três avisos mudaram somente o identificador do processo e um erro de compilação mudou a serialização do buffer/caminho temporário. Nesse último caso, os comandos originais foram repetidos nas mesmas fixtures: ambos retornaram o mesmo TS2307 sobre `@/lib/growth/topupEligibility`, com os quatro arquivos e o compilador inalterados. A normalização substituiu somente o caminho exato das fixtures, sem mudar opções ou assertivas. Evidências: `reviewed-output-differences.json` e `limit-fit-diagnostics.json` no mesmo diretório (22/10/2026). Não se afirma que todos os logs sejam idênticos.

**FATO CONFIRMADO — TESTADO LOCALMENTE:** `tsc --noEmit --incremental false` encerrou com código zero; evidência em `C:/tmp/cartoon-tracao-2210/candidate-final-tsc.json` e log correspondente (22/10/2026). A conferência final do guardião, incluindo mutantes, está em `C:/tmp/cartoon-tracao-2210/guardian-final.log`.

**FATO CONFIRMADO:** `lib/engineWall.ts`, `lib/homeVideoCuration.ts`, `lib/kidsVenda/kidsVenda.ts` e os arquivos das duas rotas públicas não receberam alteração. Sem leitura de `.env`, banco real, render, build, deploy, envio ou geração paga.

## O que está errado ou pode melhorar

**QUESTÃO PENDENTE / DESCONHECIDO:** preparação e testes locais não comprovam exposição, ativação, entrega ou venda externa. Os visitantes e pedidos citados na solicitação são contexto do fundador de 22/10, não uma medição reproduzida nesta tarefa. Os horários do Instagram não têm validação por Insights.

## Próximo passo recomendado

**SUGESTÃO:** revisar a comparação visual e os textos; em etapa própria, publicar a branch e consultar o dry-run com sessão admin antes de decidir qualquer lote. O envio e a geração/publicação dos episódios permanecem fora desta tarefa. Depois de distribuição autorizada, medir por pessoa externa: amostra pedida → episódio entregue → pack ou primeira mensalidade paga; renovação separada. Clique e conteúdo preparado não são receita.
