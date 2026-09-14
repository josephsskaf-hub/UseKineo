# Outbox do Claude — só Claude escreve

## ACK — MOTOR-AUTO-20260914 (responde_a: MOTOR-AUTO-20260914)

- Timestamp UTC: 2026-09-14T15:41:00Z (rotina criada às 15:38Z)
- Executor: Claude (sessão CEO-executor, app desktop, aba Code)
- Worktree/caminho da outbox: C:/kineo-wt/restaura/docs/coordination/motores/CLAUDE.md (esta). Nunca C:/kineo (árvore suja).
- Branch de código: codex/fidelidade-0914 (base origin/main a23a2a74…; docs já publicados em 7e80f691). Cópias versionadas desta outbox saem por worktree própria codex/docs-motores-claude-<hhmm> + bash scripts/enfileirar.sh + !RODAR-AGORA.bat (só docs; código de produto segue SEGURADO).
- Rotina CONFIGURADA DE VERDADE (create_scheduled_task, confirmado pelo agendador do app): taskId `motor-auto-20260914-claude`, cron `*/15 * * * *` (a cada 15 min, horário local BRT), arquivo C:/Users/josep/.claude/scheduled-tasks/motor-auto-20260914-claude/SKILL.md. Término: o prompt da rotina confere `date -u` em toda rodada e, em 2026-09-15T03:13:52Z (15/09 00:13 BRT) ou depois, grava ENCERRAMENTO nesta outbox e desativa a si mesma (update_scheduled_task enabled=false). Sem renovação automática. Cursor local `.cursor-claude` (md5 do BOARD.md): rodada sem novidade = silêncio, sem teste repetido.
- Limitação conhecida do agendador (memória da casa): se o app reiniciar, a lista de tarefas pode esvaziar; a rotina só vale enquanto `list_scheduled_tasks` a mostrar. Se sumir, eu recrio do SKILL.md e registro aqui.
- Candidato manifestado: FID-V4 = a3734c39e1f5749b2eb5c6106ff7da5ced019a95 (codex/fidelidade-0914). NÃO publicar fidelidade, NÃO gastar. Veo 5b2dc929 segurado.
- Lido: PROTOCOLO.md, BOARD.md (até FID-V4-R1), MATRIZ.md, origin/main:PEDIDOS (FIDELIDADE-V4). Documentação do Board 811403dc tratada como ENFILEIRADA, não publicada.
- Limite financeiro desta adesão: zero. Nenhum render pago, nenhum dry-run pago.

## FID-V4-R2 — PRONTO_PARA_REVISAO (responde_a: FID-V4-R1)

- Timestamp UTC: 2026-09-14T15:50:00Z · dono: Claude · motor(es): MiniMax H3 (base comum hollywood: Kling 3 / Omni / S25 passam pela mesma biblioteca)
- Branch: codex/fidelidade-0914 · SHA COMPLETO: 0d45b028db63a3c22ad3ee9997c2f70e3ba41a42 (sucede a3734c39e1f5749b2eb5c6106ff7da5ced019a95; base origin/main 7e80f69129c2afc72c64a73027d4ec33583e30a1 para docs; código sobre a23a2a74) · SEGURADO (trava 8.2). Sem publicação, sem render.
- Arquivos (só o delta): lib/hollywood/fidelidade.ts · scripts/test-fidelidade-h3-2026-09-14.mjs. (router e rota inalterados desde a3734c39.)
- Hipótese e critérios definidos ANTES de editar:
  1. "I'd"/"we'd" é ambíguo (had/would). Critério: 'had' SÓ antes de particípio (lista fechada + -ed), 'would' SÓ antes de forma base (lista fechada); qualquer outro caso → nao_suportada com texto INTACTO; testar would e had e o advérbio no meio ("I'd never seen" → "had never seen", "I'd rather die" → "would rather die").
  2. Citar o papel para declará-lo ausente não é presença. Critério: prompt com "<papel> is/was/remains absent|gone|missing|nowhere…" ou "no/without the <papel>" enquanto a narração descreve o papel → cobertura 'divergente' (motivo 'sujeito ausente'); a cláusula de ausência e o sujeito errado SAEM do prompt enviado (sujeito da frase vira o da narração) em vez de prefixar ordem oposta; a ficha NÃO é colada na cláusula de ausência; caso legítimo ("His son is alone… He grips the rail" × "The boy grips the rail") fica intacto e coberto até o submittedPrompt.
- Abordagem (sem regex por frase): a decisão 'had'/'would' é gramatical por classe da palavra seguinte (particípio × base); a ausência é uma relação (papel + verbo de estado + predicado de ausência), não uma frase.
- Comandos/resultados (14/09 ~15:48Z, C:/kineo-wt/restaura @ 0d45b028):
  · node scripts/test-fidelidade-h3-2026-09-14.mjs → 100 ok · 0 falhas (rc 0); 15 verificações novas: 6 de I'd/we'd (would/had/advérbio/nao_suportada/fim de frase), 9 de sujeito ausente (helper, garantirAcaoCentral, cadeia planejador+rota até submittedPrompt, caso legítimo).
  · node …/h3-lituya-review/audit-a3734c39.cjs C:/kineo-wt/restaura → {passed:13, failed:0, total:13} (harness do Board, só leitura, sem fornecedor).
  · npx tsc --noEmit -p tsconfig.json → rc 0.
  · vizinhos: enche-silencio 19/19, visual-contract 330, cinematic-timeline 44, primeira-pessoa 21, scene-truth rc 0, cinematic-speech 184, regua-unica 74, variety-axis rc 0.
- Casos aprovados preservados: Lituya ("My son and I…"), I see/Eu sobrevivi/Yo recuerdo/nurse, negação removida, village intact × collapsed, filho sem ficha do pai, descrição conflitante substituída, estado global, apara 7×10 s×21 palavras.
- Pendências técnicas: (a) QUESTÃO PENDENTE do Board sobre nao_suportada: mantido como limitação DECLARADA (texto intacto em 1ª pessoa, estado na cena e no claim fidelidade_cena.conversao); tratamento proposto para validação em filme: a cena marcada nao_suportada segue narrada como está, sem atribuição inventada e sem bloquear a geração; se o Board preferir devolver a cena ao formato diálogo nativo (fala do próprio personagem) quando o formato permitir apresentador, é uma decisão de produto que registro aqui e não implemento sem pedido. (b) Base EN de verbos é lista fechada (cobre o vocabulário de sobrevivência/documentário); fora dela = declarado, não fingido.
- Limite financeiro: zero. Nenhum render pago ou dry-run pago. Veo 5b2dc929 segurado.
- Próximo do executor (sem pedido novo do Board): avançar testes offline independentes dos motores clássicos (Kineo 1, Seedance 1.5, Kling 2.5) sobre o SHA da main, reconciliando gates existentes sem reconstruir.

## FID-V4-R4 — PRONTO_PARA_REVISAO (responde_a: FID-V4-R3)

- Timestamp UTC: 2026-09-14T16:13:00Z (rodada automática da rotina motor-auto-20260914-claude; primeiro disparo automático com novidade) · dono: Claude · motor(es): MiniMax H3 (base comum hollywood: Kling 3 / Omni / S25)
- Branch: codex/fidelidade-0914 · SHA COMPLETO: 83aeef34f445cfc3c83610c5997e43909bbce6b7 (sucede 0d45b028db63a3c22ad3ee9997c2f70e3ba41a42; código sobre a23a2a74; docs contra origin/main c55b9c762834ee24c52791ad89a1fa6c0712765d) · SEGURADO (trava 8.2). Sem publicação, sem render.
- Arquivos (só o delta): lib/hollywood/fidelidade.ts · scripts/test-fidelidade-h3-2026-09-14.mjs. (router e rota inalterados desde a3734c39.)
- Hipótese e critérios definidos ANTES de editar:
  1. had/would: `auxiliarDeD` dava prioridade ao particípio; "come/run/put" estão nas DUAS tabelas. Critério: a decisão é por CLASSE e as classes não se sobrepõem — palavra na interseção base ∩ particípio → null → nao_suportada com texto INTACTO; nenhuma classe tem prioridade; "-ed" só sugere particípio quando a palavra NÃO está na base ("need" → would). A propriedade é provada sobre a interseção inteira (exportada), não sobre três verbos. Exclusivos preservados: escape → would, seen → had.
  2. ausência: o salto de 220 caracteres atravessava oração e pessoa. Critério: a ausência só se liga ao papel quando ele é SUJEITO DA MESMA ORAÇÃO — entre o papel e o predicado de ausência, no máximo 4 palavras, nenhuma conector (while/and/but/as/because/…/when/who/that/if/or), nenhuma outra pessoa/pronome (son/boy/crew/he/his/…), nenhuma vírgula/ponto-e-vírgula. "The fisherman grips the wheel while his son is missing" = filho desaparecido: sem ausência, coberta (grips/grips), prompt INTACTO até o submittedPrompt. Remoção vira cirúrgica: só a oração do papel sai; "while his son grips the wheel" fica e o sujeito vira o da narração. Relação não compreendida ("The fisherman, however, is absent") NÃO é removida por suspeita. "is absent" / "nowhere to be seen" / "without the fisherman" continuam reconhecidos.
- Abordagem: duas restrições de relação (classe exclusiva; sujeito da mesma oração), sem regex por frase e sem vocabulário novo para vencer o próximo exemplo.
- Comandos/resultados (14/09 16:08–16:12Z, C:/kineo-wt/restaura @ 83aeef34):
  · node scripts/test-fidelidade-h3-2026-09-14.mjs → 117 ok · 0 falhas (rc 0); 17 verificações novas (7 de had/would incl. a propriedade da interseção = 11 palavras; 10 de ausência incl. cadeia planejador+rota até o submittedPrompt).
  · falsificação por mutante (aplicado, provado por grep, restaurado): (A) interseção sem null → 5 vermelhos; (B) lookahead de conector/pessoa removido → 1 vermelho; (C) teto de 4 palavras → 40 → verde (o lookahead segura sozinho); B+C juntos → 5 vermelhos (o caso do Board cai). Duas guardas independentes cobrem a frase do Board.
  · node …/h3-lituya-review/audit-0d45b028.cjs C:/kineo-wt/restaura → {passed:18, failed:0, total:18} (harness do Board, só leitura).
  · npx tsc --noEmit -p tsconfig.json → rc 0.
  · vizinhos: enche-silencio 19/19, visual-contract 330, cinematic-timeline 44, primeira-pessoa 21, scene-truth rc 0, cinematic-speech 184, regua-unica 74, variety-axis rc 0.
- Casos fechados preservados (não reabertos): Lituya, I see/Eu sobrevivi/Yo recuerdo/nurse, "I'd escape"/"I'd seen", negação removida, village intact × collapsed, filho sem ficha do pai, descrição conflitante, estado global, apara 7×10 s×21 palavras, "Only his son…; the fisherman is absent".
- Pendências técnicas: (a) limitação declarada: papel separado do predicado por vírgula ("The fisherman, however, is absent") ou por mais de 4 palavras não é reconhecido como ausência — fica no prompt e a cobertura segue pela ação (declarada, não removida por suspeita). (b) QUESTÃO PENDENTE do R1 (nao_suportada mantém 1ª pessoa) segue como registrado no R2: tratamento = narração intacta + estado no claim; validação só em filme.
- Limite financeiro: zero. Nenhum render pago ou dry-run pago. Veo 5b2dc929 segurado.
- Próximo do executor (sem pedido novo do Board): testes offline independentes dos motores clássicos (Kineo 1, Seedance 1.5, Kling 2.5) sobre o SHA da main; nada de código de produto novo enquanto o R4 está em revisão.
