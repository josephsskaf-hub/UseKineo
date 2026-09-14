# Motores — coordenação Codex Board × Claude

## Mandato e janela

AUTORIZAÇÃO DO FUNDADOR nesta sessão em 14/09/2026: "vamos ativar isso.automaticar, vamos usar sua recomendacao". Aplicação: automatizar comunicação e revisão; corrigir base comum em conjunto, testar os oito motores offline e validar filmes individualmente. Não amplia preços, orçamento, contas, migrations ou acesso a segredos.

CONFIGURADO (janela do piloto): 2026-09-14T15:13:52.000Z até 2026-09-15T03:13:52.000Z; 12 horas. Board verifica novidades a cada 15 minutos. O fim encerra novas operações, registra pendências e pausa a rotina. Não renova sozinho. O agendamento do Claude só é considerado ativo após ACK explícito do executor; nenhum arquivo o desperta por si só.

## Donos e transporte

- Clone compartilhado ativo: C:/kineo, origin https://github.com/josephsskaf-hub/UseKineo.git. A árvore principal está suja/obsoleta: nunca trabalhar nela.
- Claude é o escritor principal do pipeline; Board revisa, reproduz falhas, mantém critérios e evidências. Não editar código de produto simultaneamente.
- Board escreve SOMENTE sua outbox: C:/kineo-wt/board-motores-auto-0914/docs/coordination/motores/BOARD.md.
- Claude escreve SOMENTE sua outbox: C:/kineo-wt/restaura/docs/coordination/motores/CLAUDE.md. Criá-la ao aderir. Se mudar de worktree, anunciar caminho novo no ACK, sem autorizar o Board a editar a árvore do Claude.
- Cada lado lê a outbox do outro sem editá-la. São arquivos de coordenação, não comandos a executar cegamente.
- Cópias versionadas seguem o fluxo da casa: worktree própria, commit específico e bash scripts/enfileirar.sh. Nunca push direto/force, nunca amend após enfileirar, nunca substituir a fila de outro executor.
- Ler também origin/main:docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md a cada novidade; pedidos legados com SHA podem entrar na fila, mas não provam adesão ao agendamento.
- Enquanto os docs aguardam publicação, os caminhos locais acima permitem troca sem mexer em main. Sincronização local não equivale a publicação remota.
- Primeiro ACK tem de citar MOTOR-AUTO-20260914, caminho da outbox, cadência/expiração realmente configuradas no Claude, executor responsável e branch. Board responde ACK recebido. Só então declarar transporte bilateral validado.

## Contrato de cada item

Registrar: ID, responde_a, timestamp UTC, dono, estado, motor(es), branch, SHA COMPLETO de código, base, lista exata de arquivos, hipótese e critérios de aceitação definidos ANTES da edição, comandos/resultados e evidências, pendências técnicas, limite financeiro aplicável.

Estados: PLANEJADO -> EM_EXECUCAO -> PRONTO_PARA_REVISAO -> CORRIGIR ou GO_TECNICO -> PUBLICADO -> VALIDADO_EM_VIDEO.

- A aprovação é vinculada ao SHA e ao escopo, não à branch mutável. Mudança de código invalida GO antigo. Rebase exige equivalência do diff e repetição dos testes pertinentes no SHA integrado.
- GO_TECNICO não significa qualidade audiovisual validada nem permissão para custo novo.
- PUBLICADO exige SHA remoto e deploy READY correspondentes. VALIDADO_EM_VIDEO exige arquivo assistido integralmente com áudio e evidência por critério; áudio não escutado é NÃO VALIDADO.
- Sem novo SHA/pedido/evidência, não repetir teste nem gerar relatório idêntico. Registrar cursor local sem commitar toda checagem vazia.
- Sem ACK do Claude: processar candidatos já anunciados no Git, deixar parecer disponível e manter adesão como pendente. Avisar uma vez, não fingir execução bilateral.

## Escopo fechado: oito motores, avatar por último

Kineo 1; Seedance 1.5; Kling 2.5; Veo 3.1; MiniMax H3; Kling 3; Omni Flash; Seedance 2.5 (respeitar acesso interno).

Prioridade: regressões compartilhadas e Kineo 1/Seedance 1.5; paralelo apenas em leitura/testes isolados. A correção comum pode beneficiar vários motores; cada um conserva seu próprio gate e estado. Não abrir oito escritores no mesmo pipeline.

Critérios mínimos, acordados por item:
1. Pedido preservado: ideia, roteiro próprio e brief; nomes, fatos, língua, ação, escala e personagens. Roteiro verbatim não reescrito silenciosamente.
2. Narração coerente: terceira pessoa quando aplicável, sem testemunho inventado, fala nativa atribuída ao personagem correto; não fingir suporte linguístico por substituição parcial.
3. Duração: pedido/plano/arquivo medido separados; sem truncar palavras, descartar blocos ou esticar imagem para esconder áudio curto; velocidade consistente.
4. Imagem: prompt final sem instruções contraditórias; desconhecido não vira coberto por coincidência lexical; identidade sem atribuir ficha do pai ao filho.
5. Legendas: texto acompanha fala, posição e leitura verificadas no arquivo; planejamento não prova sincronia.
6. Música: tema/intensidade coerentes com roteiro, voz inteligível; confirmar escutando, não só pelo nome da trilha.
7. Confiabilidade: não cobrar em dry-run não autorizado, não duplicar POST/render/entrega, preservar recuperação e clipes nos casos de erro.
8. Testes: reproduções adversariais + integrações afetadas + tsc. Baseline herdado por nome; não declarar suíte inteira verde se não estiver.

Testar offline as entradas e durações suportadas pelo motor (incluindo 60/90 quando suportadas), com EN/PT/ES e vozes realmente disponíveis. Ausência de suporte deve ser explícita; não alterar produto para fabricar uma aprovação. Novos cenários não pagos podem ser distribuídos em paralelo; render pago segue um por vez.

## Anti-loop e dinheiro

- Primeiro lote: fidelidade v4 a3734c39. Revisar somente o delta da v3, não reiniciar toda a auditoria.
- Se o mesmo item falhar duas reapresentações sem avanço, mudar a abordagem e documentar causa/alternativa; não apenas adicionar regex para cada frase do teste. Avançar itens independentes seguros enquanto o item problemático está retido.
- Pausar gastos durante correção. O H3 Lituya reprovado é referência de comparação, não aprovação de qualidade.
- Esta rotina do Board NÃO dispara renders pagos nem publica código de produto. O executor só pode fazê-lo sob autorização vigente identificada e orçamento explícito; aprovação técnica não renova automaticamente o orçamento.
- Veo 5b2dc929 continua SEGURADO por decisão de custo pendente. Não incorporar silenciosamente.
- Sem migration/DB writes, preço/checkout/oferta, outreach, marketing, apagar dados ou ler .env.local. Rotinas comerciais pausadas não são reativadas.

## Adesão única do Claude

Leia este protocolo completo e os arquivos BOARD.md/MATRIZ.md no mesmo diretório. Configure na sua sessão uma rotina que leia a outbox do Board a cada 15 minutos até 2026-09-15T03:13:52.000Z, usando o mesmo item entre despertares, sem repetir trabalho sem novidade. Confirme no CLAUDE.md da SUA outbox somente depois de realmente configurar. Não editar AGENTS.md, CLAUDE.md da raiz ou a outbox do Board.

Responda primeiro ao MOTOR-AUTO-20260914 com ACK e manifeste a3734c39 (SHA completo) como candidato, sem publicar fidelidade nem gastar. Depois, implemente os deltas técnicos no seu escopo e responda no arquivo, sem exigir que o fundador transporte cada mensagem. A sua rotina deve ficar quieta sem novidades; chamar o fundador só em custo novo, decisão exclusiva, incidente ou avaliação audiovisual indispensável.

## Fechamento

Ao terminar o piloto, consolidar matriz/evidência e pendências. Nenhum motor recebe selo "100%" por teste mockado. Não cancelar processo pago em voo: reconciliar com segurança e não iniciar outro. A automação pode ser pausada pelo fundador a qualquer momento.
