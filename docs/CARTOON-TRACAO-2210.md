# KINEO-CARTOON-TRACAO-2210 — entrega de 22/10/2026

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
