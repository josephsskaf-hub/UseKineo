# Citações no ChatGPT — sprint de 12 horas

**DECISÃO DO FUNDADOR — 17/09/2026:** criar nesta conversa uma sprint de 12 horas dedicada às citações da Kineo no ChatGPT, uma das cinco prioridades declaradas, para aumentar tráfego qualificado e novos compradores. Não é renovação das outras pistas.

**CONFIGURADO — destino corrigido por ordem expressa do fundador:** heartbeat `kineo-cita-es-24h-at-14-09` reaproveitado, renomeado para `Kineo · Citações ChatGPT · Sprint 12h`, executa exclusivamente na sessão Kineo · Citações no ChatGPT `01a088dd-908c-7c42-9bac-3e886e72a785`. Board `01a03e3e-5f63-7cf1-8b9f-6c6646b446b7` apenas coordena. Janela original preservada: 17/09 **04:30–16:30 BRT**, equivalente a **07:30–19:30 UTC**. Checkpoints a cada 30 minutos, doze rotações de uma hora e encerramento às 16:30. Sem reinício, extensão, segundo agendamento ou renovação automática. Notificação preexistente preservada. Agendamento não significa execução contínua entre disparos; disponibilidade do app, computador e conta condiciona a execução.

## Norte e limites da prova

**HIPÓTESE:** respostas claras, atuais e verificáveis nas fontes que já recebem citações reduzem recomendações erradas e ajudam visitantes com intenção de compra. Publicar conteúdo não garante rastreamento, citação, posição, clique ou assinatura.

**MÉTODO:** medir separadamente (1) respostas independentes do ChatGPT que citam Kineo e a URL citada; (2) visitas atribuídas, com anônimos separados; (3) pessoas externas cadastradas; (4) checkout por pessoa; (5) primeira assinatura paga, reconciliada pelo servidor; (6) receita por moeda, reembolsos e MRR. Não somar invoice e payment_success da mesma transação. Sem vínculo, atribuição DESCONHECIDA. Não usar IP como pessoa nem marcar Google como ChatGPT.

**EVIDÊNCIA HISTÓRICA:** a bateria real de 12/09 registrou 6/20 listas com Kineo, quatro respostas com oferta antiga e nenhum link para os oito guias. Fonte: `docs/citacoes-chatgpt/2026-09-12-20h/RELATORIO.md`. Não é o placar de hoje. O relato da correção de disponibilidade de 16/09 está em `docs/citacoes-chatgpt/2026-09-16-disponibilidade/ENTREGA.md`; reconciliar seus commits antes de alterar a mesma fonte.

**FATO CONFIRMADO — código inspecionado em origin/main em 17/09:** `lib/entryPolicy.ts:36` e `lib/reverseTrial.ts:142` definem 10 créditos; `lib/engineLaunch.ts:51` lista H3, Omni e Seedance 2.5 em manutenção. Valores e estados precisam ser relidos a cada alteração de copy. Documentos de julho/agosto e o programa de 10/09 têm fatos obsoletos; não copiar suas ofertas.

## Execução, sem repetir trabalho

| Rotações | Trabalho prioritário | Evidência exigida |
| --- | --- | --- |
| 1–2 | Reconciliar main, candidatos locais e benchmark; escolher até três lacunas concretas em fontes existentes | Contrato causal, reprodução e dono de cada arquivo; uma bateria real, se houver acesso permitido |
| 3–5 | Corrigir a principal contradição ou link quebrado ainda existente; melhorar resposta factual útil em superfície livre | Teste de comportamento, typecheck, guardiões pertinentes, preview quando visual, SHA e resposta pública |
| 6 | Checkpoint intermediário | Exposição e funil comparável, sem confundir ausência de amostra com falha; não repetir bateria inteira sem motivo |
| 7–9 | Segunda lacuna independente ou concluir publicação da primeira; reaproveitar exemplo autorizado e motor/duração/custo verdadeiros | Ação útil entregue, sem página duplicada, promessa de perfeição ou nova oferta |
| 10–11 | Validar o que entrou no ar; nova bateria comparável somente se acesso e janela justificarem | Perguntas literais, respostas completas, modo/modelo observáveis, URLs, limites de comparação |
| 12 | Consolidar antes/depois e pendências; não iniciar mudança que exceda o prazo | Publicado versus local, citações, compradores/receita comprovados ou desconhecidos; pausar heartbeat no fechamento |

**REGRA:** cada checkpoint continua a mesma entrega. Não exige uma nova página, auditoria ou contato. Máximo de duas variantes comerciais simultâneas. Sem mudança de dado, código ou acesso, não repetir testes nem alertas do mesmo bloqueio. Se uma hipótese não tem amostra, preservá-la. Usar aproximadamente 80% do trabalho em execução/validação e 20% em pesquisa necessária, sem fabricar atividade.

## Fronteiras e coordenação

**FATO DOCUMENTADO:** `docs/HANDOFF-SESSOES-2026-09-17.md` reserva à pista Google do Claude `lib/seo/**`, `app/ai-video-generator/for/**`, `app/sitemap.ts` e `app/llms.txt/route.ts`; já existe um catálogo de 100 páginas. Não construir outra fábrica nem editar esses caminhos concorrencialmente. Lacuna ali vira pedido específico no arquivo entre pistas. Citações trabalha nas fontes existentes que estiverem livres, com reserva antes de editar. MMR continua dono de pricing/campanhas/checkout. Motores, render, auth, admin e cron ficam fora.

**AUTORIDADE:** execução dentro da pista pública pelos gates da casa; sem mudança de preço, oferta, crédito, comissão ou termos. Sem e-mail/outreach/publicação social, mídia paga, diretório, recrawl/IndexNow, conta nova, render ou pagamento de teste. Nenhuma migration/escrita em banco/segredo/.env.local. Consulta financeira somente leitura pelo acesso autorizado, com skill da integração. Não contornar bloqueio de navegador/preview.

**PROTOCOLO:** worktree própria de origin/main atualizado; apply_patch; testes comportamentais, tsc e guardiões pertinentes; comparação visual quando aplicável. Inspecionar scripts antes de usar `enfileirar.sh` e batch com dois SHAs revisados. Sem force, reset alheio, amend após fila ou push direto. Deploy e exposição são provas separadas. PII e capturas de contas permanecem privadas.

**COORDENAÇÃO REALIZADA:** a preparação foi feita no Board e a execução transferida à sessão Citações por correção do fundador, recebida no primeiro disparo em 17/09 07:30Z. Board entregou a worktree e não editará nela. O diário preserva a preparação anterior e registra a correção, sem pesquisa paralela. Git compartilhado não equivale a ACK do Claude. Diário desta janela em `DIARIO.md`.
