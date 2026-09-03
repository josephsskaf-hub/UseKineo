# HANDOFF CODEX → CLAUDE — ROUNDS 283–284

**Data:** 2026-09-03 · **Trilha:** Growth (aquisição e assinatura) · **Estado:** validado em produção

## Sinal, decisão e ação

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, 2026-09-03 06:37 BRT):** em 6 horas alinhadas, entradas caíram de 79 para 52. TAAFT respondeu por 24 das 27 entradas perdidas (53 → 29); ChatGPT ficou 10 → 9.
- **EVIDÊNCIA DE PRODUÇÃO (mesma fonte/data):** checkout não caiu nessa janela: checkout_attempted 2 → 5 e checkout_started 2 → 3. Em 24 horas alinhadas: entradas 263 → 257; cadastros externos 38 → 51; pessoas externas com vídeo concluído 23 → 35; checkout_started 5 → 10; pagamentos 0 → 1.
- **DECISÃO:** não há evidência para rollback de conversão. A queda curta está concentrada em TAAFT; a rodada executa uma hipótese orgânica nova.

## Anti-duplicação

- **NÃO EXECUTAR — calendário ICS B2B:** tecnicamente verde, porém repete a hipótese causal do feed diário de ideias sem provar distribuição humana. A worktree foi preservada sem commit ou push.
- **NOVA — desafio social do Viral Score:** usa status e competição, não desconto, benefício de indicação, widget de afiliado ou PWA share target.

## Entrega

Depois de analisar uma ideia em /viral-score, a pessoa pode compartilhar um placar numérico:

“My Shorts idea scored 82/100 on Kineo. Hook 9/10 · Trend 7/10 · Retention 8/10 · Shareability 8/10. Can yours beat it?”

- A ideia, o veredito e as dicas continuam privados.
- Usa Web Share nativo quando disponível; depois clipboard; por último mostra uma caixa manual focada e selecionada.
- Cancelamento nativo não vira compartilhamento.
- Novo resultado invalida retorno assíncrono antigo; clique duplo no mesmo instante não duplica ação.
- Evento fechado somente depois de transporte confirmado: viral_score_scorecard_share_requested, com exatamente variant, method e score_band.

## Medição e interpretação

O relatório exige a cadeia:

1. landing com UTM exata em /viral-score;
2. resultado exato na mesma sessão;
3. um único dono externo identificado;
4. perfil atribuído e cronologia válida;
5. vídeo concluído estritamente posterior;
6. checkout recorrente posterior;
7. pagamento da mesma Stripe Session e mesmo dono;
8. assinatura ativa.

- Contas internas ficam visíveis, mas não entram no denominador e não bloqueiam o gate.
- Missing-email, dono conflitante, relógio nulo, perfil atribuído sem cadeia e financeiro malformado bloqueiam decisão.
- Pessoas compartilhando são distintas; sessões anônimas ficam separadas.
- Mínimo para observar o loop: 3 pessoas externas compartilhando.
- Gate de decisão: 20 destinatários maduros, 5 vídeos e 7 dias.
- Um pagamento exato prova o canal, nunca causalidade remetente → destinatário.

## Gates

- **TESTADO LOCALMENTE:** 236/236 verificações (73 + 71 + 31 + 38 + 23).
- **TESTADO LOCALMENTE:** typecheck com somente 3 erros preexistentes (mrr.ts, me/subscription/route.ts, TrialDowngradeModal.tsx); zero erro nos arquivos da entrega.
- **TESTADO LOCALMENTE:** build compilou; coleta de páginas parou apenas por ausência local de OPENAI_API_KEY numa rota alheia. Nenhum segredo foi lido.
- **TESTADO VISUALMENTE:** preview desktop/mobile e fallback manual em docs/previews/VIRAL-SCORE-SHARE-V1-2026-09-03.html; screenshot C:/Users/josep/AppData/Local/Temp/codex-viral-score-share-v2-final.png.
- **AUDITORIA INDEPENDENTE:** GO final dos três eixos; zero P0/P1 remanescente.

## Produção

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** commit funcional bf7f3fb862b2f2faf1025a5a63fdc6d9f67d95a5; origin/main idêntico no push.
- **VALIDADO EM PRODUÇÃO (Vercel):** deploy dpl_9JLGeuykZ2vPvfbGSPSuaN7j4HUX, READY, alias www.usekineo.com, SHA exato e sem erro de alias.
- **VALIDADO EM PRODUÇÃO (HTTP):** /viral-score responde 200 com a ferramenta pública.
- **VALIDADO EM PRODUÇÃO (observabilidade):** zero grupos de erro runtime em /viral-score nos 15 minutos posteriores.
- Nenhuma pontuação paga, render, comunicação externa, preço, crédito, plano, SKU ou checkout foi alterado.

## Freeze e próximo ataque

- Congelar app/viral-score/ViralScoreClient.tsx, lib/growth/viralScoreShare.ts e a campanha viral_score_scorecard_share_v1 até 20 destinatários maduros / 5 vídeos / 3 compartilhadores externos / 7 dias, salvo P0/P1 comprovado.
- Próxima rodada alterna para B2B e precisa atacar uma hipótese causal realmente nova; não publicar o calendário ICS descartado.
- Toda queda curta deve ser comparada em janelas iguais e decomposta por fonte antes de rollback.
