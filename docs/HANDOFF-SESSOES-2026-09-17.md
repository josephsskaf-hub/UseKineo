# HANDOFF ENTRE SESSÕES — estado em 17/09/2026 04:00 BRT

Escrito pela sessão "coerência + Google" (Claude, 15→17/09) para qualquer outra sessão que abra a pasta, em especial a sessão dos MOTORES aberta pelo fundador em 17/09. Tudo abaixo está na main (`fbda9ee1` ou mais nova). **Faça `git fetch origin` e trabalhe numa worktree própria sobre `origin/main` antes de tocar em qualquer arquivo citado aqui.**

## 0. Regras que valem para as duas sessões (o fundador já as deu)
- Entrega: worktree própria → commit → `git fetch && git rebase origin/main` → `bash scripts/enfileirar.sh` → `cmd //c "C:\kineo-wt\restaura\scripts\!RODAR-AGORA.bat" <HEAD> <origin/main>` → esperar o `dpl_` da home mudar. Nunca push direto, nunca `git branch -f entrega-atual`, nunca amend depois de enfileirar. `C:\kineo` (main) está sujo: não usar para push.
- Dry-run ($0) antes de todo render pago. Motores pausados ao público: H3, Omni, S25 (`lib/engineLaunch.ts`); conta interna renderiza mesmo pausado.
- Trava 8.2: tocar `app/api/generate-video-*`, `lib/cinematic/*`, `lib/hollywood/*`, `lib/compose*` deixa 3 guardiões vermelhos por caminho (despacho-vazio, memoria-episodio, caixa-vazia). Só com autorização do fundador registrada por nome nos docs (`docs/coordination/motores/CLAUDE.md` + `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`). As frases dele de 16-17/09 sobre coerência e motores já estão registradas lá.
- Rodar a suíte inteira (`for f in scripts/test-*.mjs`) antes de fechar; comparar vermelhos com o baseline; guardião alheio vermelho por texto que você mudou se REANCORA (estende), nunca se afrouxa.
- Escrita que precisa existir no fim de uma rota é `await`, não `void` (a Vercel congela a função depois da resposta; o checkpoint do servidor chegava 1 vez em 10).
- Fundador decide preço, crédito, deleção. Feedback escrito = 10 créditos automáticos (decisão dele, 16/09). E-mails da casa: rascunho no Gmail, salvo ordem explícita.

## 1. O que mudou nos motores (16→17/09) — não refazer, não desfazer
| Data | Mudança | Onde | Prova |
|---|---|---|---|
| 16/09 12:39 | Kineo 1 híbrido: cena que o stock não cobre vira still FLUX (persistido em `broll/ai-still/`), teto 4/filme; R2: still soma ao stock, seed varia | `lib/fastAiScene.ts`, `app/api/generate-video-fast/route.ts` | test-kineo1-hibrido (28) |
| 16/09 11:40 | Topic do filme = prompt DESPACHADO, não a caixa viva (caso Bezos) | `GenerateClient.tsx` (`dispatchedPromptRef`) | test-topico-do-despacho |
| 16/09 18:37 | Prompt = nossa tela colada é recusado nas duas portas | `lib/promptGuard.ts` | test-prompt-proprio |
| 16/09 20:11 | Pílula sozinha ("The unsolved mystery of") recusada; Studio não navega | `lib/promptGuard.ts` (`isBareStarter`), analyze-idea, fast route, StudioClient (`generate()`) | test-coerencia-kineo1 |
| 16/09 20:11 | Checkpoint do servidor do Kineo 1 passa a ser `await` (era `void`, chegava 8 de 88) | fast route | idem |
| 16/09 21:20 | **Supervisor fala×imagem** no caminho clássico (Seedance/Veo/Kling 2.5): 1 chamada gpt-4o-mini por filme, KEEP/REWRITE por cena, antes de qualquer gasto; evento `scene_speech_alignment`; dry-run devolve `fala_x_imagem` | `lib/cinematic/speechImageAlign.ts`, cinematic route | test-fala-x-imagem (12) |
| 16/09 21:20 | Regra na fonte: visual_prompt mostra a própria fala (analyze-idea); fidelidade ao texto da pessoa (generate-script) | analyze-idea, generate-script | idem |
| 16/09 21:20 | Kineo 1: história com personagem nomeado (Johny/Papa) → still em toda cena, stock fora | `lib/fastAiScene.ts` (`characterStoryName`), fast route | test-historia-com-personagens (20) |
| 16/09 21:30 | Kineo 1: primeiro filme de conta gratuita → still em toda cena (≤12, ~US$0,36); são IMAGENS com movimento de câmera, não vídeo; só a cena 1 tem o AI hook em vídeo (Seedance, desde agosto) | `lib/fastAiScene.ts` (`FIRST_FILM_MAX_STILLS`), fast route | idem |
| 16/09 23:15 | Motivo REAL da recusa de cena chega ao ledger (`cinematic_dispatch_result.scenes[].reason_class/http`); a "falha do Omni" de 16/09 04:48 era 403 saldo do fal | cinematic route (`ultimaRecusa`, `hRecusas`) | test-vigia-ledger-hollywood |
| 16/09 23:17 | H3 sem reescrita da fal: `prompt_expansion_mode: 'disabled'` (schema oficial tinha "balanced" por padrão); env `KINEO_H3_PROMPT_EXPANSION` | `lib/hollywood/router.ts` (`H3_PROMPT_EXPANSION`), buildFalInput | test-cinematic-speech |
| 17/09 03:47 | **Kling 3: a IMAGEM abre o prompt.** Prefixo de silêncio (17 palavras) sai da frente e vai ao `negative_prompt` só em cena sem fala (`says: "` marca diálogo); frase da narração vai ao FIM (`garantirAcaoCentral(…, posicao)`, padrão 'inicio' preserva H3/Omni/S25); supervisor fala×imagem também no caminho hollywood (evento com `engine=família`) | cinematic route, `lib/hollywood/fidelidade.ts` | test-kling3-imagens (12), primeira-pessoa e fidelidade-h3 reancorados |

Diagnóstico que motivou o último item: render Kling 3 de 17/09 03:03Z (naufrágio cananeu, 82 s, história 10): toda cena começava com 40-50 palavras iguais e a imagem vinha em terceiro → 11 cenas parecidas, "mulher muda" na cena 1. **Prova pendente:** render de 35 s do fundador (roteiro PASS no dry-run, 125 palavras) e nota visual no `/admin/coerencia`.

## 2. Ferramentas que existem agora (use, não reconstrua)
- **`/admin/coerencia`** — nota 0-100 por filme (juiz gpt-4o-mini, `lib/fastCoherence.ts`, versão `k1_coerencia_v3`, em português), texto × visual, placar por motor, filtros `?hours=&engine=&so=baixo`, 👍/👎 do cliente, botão "pedir feedback" (e-mail com 10 créditos por resposta escrita). Todo motor entra: Kineo 1 via `fast_scene_plan`, motores de IA via `cinematic_dispatch_result.submitted_prompts`. **Mudar `FAST_COHERENCE_VERSION` re-julga tudo (6 por carga).**
- `scene_speech_alignment` (evento): quantas cenas o supervisor reescreveu por filme — se cair com o tempo, a regra na fonte está funcionando.
- Painel ao vivo: razão com assinatura nomeada ("+ 60 Starter assinou 16/09"), motor real no débito cinematográfico.
- Dry-run clássico devolve `fala_x_imagem`; o dry-run hollywood retorna ANTES do supervisor (linha ~4312), então no Kling 3 a prova é o render.

## 3. Fila dos motores (o que a sessão dos motores pode pegar)
1. **Kling 3, prova:** render de 35 s (script em `docs/PEDIDOS…` KLING3-IMAGENS-R1) → nota visual no quadro → ajuste fino (eixo C3 como primeiro token; `cfg_scale`; `uprightPrefix` ainda é um prefixo de 13 palavras em toda cena — candidato a sufixo).
2. **H3:** ensaio a $0 com `prompt_expansion_mode: 'disabled'` no roteiro validado do Kling 3; se PASS, 1 render de 35 s; candidato seguinte `minimax/h3-max` (fal: "stronger prompt adherence"; conferir preço).
3. **Omni:** repetir o render de 16/09 com saldo (era saldo, não motor); "cena falhou → retentar a CENA" ainda mata o filme.
4. **S25:** 422 no i2v com pessoa (R8 manda t2v); ensaio a $0 com o mesmo roteiro.
5. **Transversal:** `seed` fixo por filme no H3 (schema aceita) contra o still-âncora; mensagem de recusa `script_too_long_for_engine` diz "241 palavras, 331 é o máximo" quando o problema é UMA frase maior que a cena — trocar por "a frase X tem N palavras e a cena aguenta M".
6. Saldo do fal em 17/09 00:30: **US$ 22,63**; alerta em US$ 20. Kling 3 de 60 s ≈ US$ 14; de 35 s ≈ US$ 7.

## 4. O que a sessão do Google está fazendo (para não colidir)
Projeto 1 (`docs/PROJETO-1-GOOGLE-2026-09-17.md`): 100 páginas de intenção em `/ai-video-generator/for/<slug>` (`lib/seo/intentPages.ts`), sitemap, llms, IndexNow — no ar desde 17/09 03:21 BRT. Próximo: fase 2 (filmes com nota alta nas páginas), Search Console em 7 dias. Arquivos que ela toca: `lib/seo/*`, `app/ai-video-generator/for/*`, `app/sitemap.ts`, `app/llms.txt/route.ts`. **A sessão dos motores não precisa tocar neles.** Arquivos que as duas podem querer: `app/api/generate-video-cinematic/route.ts` (acabou de mudar — fetch antes), `lib/hollywood/*`, `lib/cinematic/*`.

## 5. Vermelhos herdados na suíte (não são de vocês; não "consertar" sem entender)
checkout-currency-truth, limit-purchase-fit, motores-d1, paypal-canonical-catalog, sem-porteiro, troca-de-plano, gpt-handoff, autopilot-case-study-path, guardiao-2026-08-28, leva-confiabilidade, momentum-motor-gratis, multiformato, serie-memoria, recusa-analyze-copy, recusa-nao-e-tente-de-novo, ux-complete, workspace-spanish, viralnow-search-intent, vitrine-em-alta, scene-disposition (1 de 76), llms-engine-availability, painel-verdade, studio-prompt-limit, consentimento-superficie, pacote-no-email-de-entrega, video-ready-nudge. Lista completa no baseline da sessão (scratchpad); em dúvida, rodar o teste no `origin/main` limpo antes de acusar.

## 6. Placar para a manhã (17/09)
Coerência 48 h: Kineo 1 média 75 (27 filmes), Seedance 87 (22). 46 pedidos de feedback enviados às 22:05 e 22:35 BRT de 16/09 (respostas em joseph@usekineo.com e no quadro). Google: 458 páginas indexadas, 68 cliques desde 1º/07, 9 visitantes/semana — linha de base do Projeto 1.
