
**DECISÃO APROVADA — HOLD comercial, Joseph via Board em 01/10/2026.** Prospecção e disparo da reativação preparada ficam suspensos até liberação explícita posterior ao diagnóstico coordenado pelo Board. Metas, virada do dia e botão de envio não levantam o HOLD. Preservar filas, históricos e supressões; nenhum teste de e-mail, troca de remetente/canal, investigação paralela ou mudança de DNS/configuração. A sprint de produto e e-mails transacionais existentes continuam. Relato do Board: rejeição destinatária 550 5.7.1 para Kevin Stratvert às 13:16 UTC, citando domínio e Spamhaus; não é confirmação independente de listagem nem de falha em todos os envios. Nenhum envio realizado por esta sprint.

# Sprint MRR — balanço de sábado (em preparação)

**DECISÃO APROVADA — fundador, 01/10/2026.** Meta atual: pelo menos uma assinatura NOVA por dia e conversão de cadastro >=2%. Relatório final sábado 03/10 às 20h BRT; nome literal deste arquivo preservado. Este documento ainda é parcial.

**EVIDÊNCIA DE PRODUÇÃO — baseline congelado.** Corte [01/09 06:00 UTC, 01/10 06:00 UTC): 681 cadastros externos; Studio observado 467 (limite inferior); digitação desconhecida; 444 geradores; 372 primeiros vídeos; 100 segundos; 70 pessoas com checkout; seis primeiras assinaturas positivas (`payment_success`). Todas as seis pagaram antes do primeiro vídeo: os degraus não formam uma sequência obrigatória. Fonte: [medição e SQL](stage-mrr/MEASUREMENT.md). 237 não geraram, 272 ficaram no primeiro filme, 64 de 70 checkouts não viraram assinatura nesta coorte.

**HIPÓTESE / conta de planejamento, não previsão.** 681/30 = 22,7 cadastros/dia. Conversão de 2% implica 0,454 assinatura/dia nesse volume. Uma/dia exige 50 cadastros/dia a 2%, ou 4,405% com o volume atual. Aquisição e conversão são necessárias; não declarar a meta cumprida pela entrega de código.

**EVIDÊNCIA DE PRODUÇÃO — leitura diária, 01/10 14:16:15 UTC / 11:16 BRT.** Zero primeiras assinaturas positivas observadas hoje até o corte (dia parcial). Seis nos últimos 30 dias: cinco de ChatGPT, uma origem desconhecida. Coorte móvel do corte: 681 cadastros, 464 Studio, 441 geradores, 369 primeiros filmes, 100 segundos, 71 checkout, seis primeiras assinaturas; nenhum cadastro atribuído a share. É uma janela diferente do baseline, não um antes/depois. Dados pseudonimizados e consulta: [daily-mrr-20261001.json](stage-mrr/daily-mrr-20261001.json), [daily-mrr.sql](stage-mrr/daily-mrr.sql).

| Dia BRT | Primeiras assinaturas positivas observadas |
|---|---:|
| 02/09 | 1 |
| 16/09 | 1 |
| 18/09 | 1 |
| 21/09 | 2 |
| 28/09 | 1 |
| Demais dias completos da janela | 0 por dia |
| 01/10 até 11:16 | 0 — parcial |

**EVIDÊNCIA DE PRODUÇÃO — publicação anterior, 01/10.** As alavancas gerar junto da ideia e valor em filmes no showcase estão no commit `b0fef8ceabaf6b21ff53a137cd2268f5f293c797`, agora origin/main. GET público de /showcase respondeu 200 com versão MRR. O agente não executou o publicador. Launcher de 01/10 é histórico: não pedir novo clique. A geração real pelo botão não foi testada com gasto. [Entrega histórica](stage-mrr/DELIVERY.md), [comparação visual](stage-mrr/REVIEW.html).

**FATO CONFIRMADO — IMPLEMENTADO / TESTADO LOCALMENTE, ainda não publicado.** Branch `codex/sprint-mrr-first-film-20261001`, código final `57582d91b4399b03a1b72d7960d7348174ff56a0`: primeiro filme explícito cabendo no trial; valor em filmes junto do episódio existente; prova própria/filmes por mês/termos de estorno nos planos; compartilhamento com UTM; reativação com prévia e disparo revisado pelo fundador. [Entrega detalhada](stage-mrr/NEW-GOAL-DELIVERY.md), [primeiro filme antes/depois](stage-mrr/FIRST-FILM-REVIEW.html), [demais capturas](stage-mrr/GROWTH-REVIEW.html). Preços, motores, banco manual, crons e env preservados. Nenhum e-mail enviado ou render pago.

| Entrega | Antes com mesma régua | Depois observado | Decisão provisória |
|---|---|---|---|
| Ideia → gerar | Exposição histórica equivalente desconhecida | Uma observação anônima da nova versão; zero pessoas externas identificadas até o corte | Aguardar pessoas e 48h maduras |
| Showcase → cadastro/assinatura | Não havia exposição instrumentada equivalente | Amostra identificada ainda ausente no corte | Manter medição; não atribuir venda |
| Primeiro filme com tema | Exposição histórica equivalente desconhecida | Não publicado | Candidato para próximo dia permitido |
| Episódio 2 com valor | Exposição histórica equivalente desconhecida | Não publicado | Preservar ação existente, avaliar nova versão |
| Planos com prova | Exposição histórica equivalente desconhecida | Não publicado | Preço e termos iguais; avaliar nova versão |
| Compartilhamento | Exposição histórica equivalente desconhecida | Não publicado | Cadastros/pagantes por share; anônimos separados |
| Reativação | Nenhum lote equivalente disparado | Não publicado nem enviado | Só fundador revisa e dispara |

**IMPLEMENTADO / medição.** [after-versioned-48h.sql](stage-mrr/after-versioned-48h.sql) usa versão do evento como marco, mesma janela de observação e pessoa distinta; navegação exige sessão, sessão só resolve pessoa quando inequívoca, internos excluídos por NOT EXISTS. Coortes sobrepostas não se somam. Antes comparável por superfície permanece desconhecido; baseline geral não substitui denominador de expostos. Diário conta apenas primeira assinatura positiva observada, separando renovações, reativações e avulsos. Valores de MRR incremental ainda desconhecidos.

**TESTADO LOCALMENTE — código 57582d91.** TypeScript limpo; 20 mutantes novos; 40 novas capturas (desktop/mobile, claro/escuro). Suíte inteira: 743 scripts, 542 aprovados, 201 falhas preexistentes; nenhum arquivo/asserção vermelha nova contra main b0 (740/538/202). Uma falha temporal anterior não reapareceu. Rede bloqueada e serviços simulados; não é E2E autenticado com geração. [Gates](stage-mrr/gates-new-goal-20261001.json).

**SUGESTÃO — desligamento seguro.** Flags MRR_FIRST_FILM_ENABLED, MRR_EPISODE_VALUE_ENABLED, MRR_PRICING_PROOF_ENABLED, MRR_SHARE_ENABLED e MRR_REACTIVATION_ENABLED desligam cada alavanca independentemente; aplicar pelo caminho da casa. Flags anteriores MRR_NEAR_IDEA_ENABLED e MRR_SHOWCASE_ENABLED preservadas. Nenhuma reversão exige migration ou preço. Reversão funcional dos commits 1228bbf8/4a4b9350/ef6a61ea exige revisão das dependências; preferir flags.

## Para o fundador decidir no balanço final

1. Publicar o próximo lote somente quando houver novo PUBLICAR seguro, após integração/gates no próximo dia permitido. Não clicar de novo no launcher histórico de 01/10.
2. Depois da publicação, revisar textos/destinatários em /admin/mrr-reactivation e decidir o disparo explícito. Prévia não envia; o agente não dispara.
3. Decidir se deseja marca gravada no MP4: hoje a chamada está na página/tela, porque gravação no filme toca o pipeline reservado.
4. Manter ou desligar cada flag conforme amostra madura; sem amostra, declarar desconhecido. Nenhuma alteração de preço foi aplicada.

**QUESTÃO PENDENTE / DESCONHECIDO.** Efeito causal, uma assinatura por dia sustentada e conversão >=2% ainda não comprovados. Atualizar este balanço no prazo, sem trocar ausência de amostra por zero efeito.
