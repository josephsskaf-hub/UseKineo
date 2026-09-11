# [Citações] Pacote integrado para publicação assistida — 11/09/2026

**IMPLEMENTADO / TESTADO LOCALMENTE — preparação de 10/09 23h26–23h34 BRT:** três páginas e extração do catálogo revisadas na árvore integrada com a main `7827f2e07f89b55e2a020b266a48ec98247e5bd4`. Código revisado em `7c9445f4ba248b1cbe779a708afadea4b248dd8e`; o commit que contém este pacote adiciona documentação, manifesto, logs e checkpoint. **Não enfileirado nem publicado por esta entrega.**

**AUTORIZAÇÃO VIGENTE — fonte: renovação explícita do fundador recebida pelo Board em 10/09 23h17 BRT:** janela 10/09 23h30 a 11/09 23h30, retomadas a cada 30 minutos. O encerramento antigo à meia-noite está revogado; fechar somente nos 30 minutos finais da nova janela. Medição comparável em 11/09 às 20h. O Board já atualizou a automação existente; esta pista não criou outra nem alterou as demais.

**FATO CONFIRMADO — escopo:** [MANIFESTO.json](MANIFESTO.json) fixa base, HEAD, tree, quinze arquivos funcionais com blobs antes/depois e hashes dos seis artefatos reaproveitados. O diff contra a main é vazio em Stripe, checkoutPricing, entryPolicy, affiliateCommission e settlementCurrency. Todo código funcional é idêntico à integração `35dfe3c8` validada às 19h; não houve nona página, alteração da home, render, oferta ou vídeo aprovado.

| Entrega existente | URL | Estado real |
|---|---|---|
| Gratuito para Shorts | /ai-video-generator/free-youtube-shorts | Pronta local; 404 no checkpoint público das 20h |
| História de terror | /ai-video-generator/horror-story-60-seconds | Pronta local; 404 no checkpoint público das 20h |
| Roteiro do ChatGPT | /ai-video-generator/chatgpt-script-to-finished-short | Pronta local; 404 no checkpoint público das 20h |
| Extração mecânica do catálogo | lib/growth/enginePageCatalog.ts | Local, dados preservados, export inválido da rota removido |

**FATO CONFIRMADO — conteúdo e descoberta:** `lib/growth/citationAnswers.ts:4` usa helpers vigentes; oito entradas no mapa `:377`; hub `app/ai-video-generator/page.tsx:128`, sitemap `app/sitemap.ts:300` e três links novos em `app/llms.txt/route.ts:452`. Permanecem os campos de concorrentes `[CONFIRMAR]`, conforme a missão inicial. Não se apresentam como comparação comercial verificada. As ressalvas de saldo, marca no trial, duração-alvo e revisão de narração permanecem. A extração não corrige as antigas FAQs comerciais do catálogo.

**TESTADO LOCALMENTE — gates da árvore revisada:** typecheck integral executado novamente, exit 0 observado às 23h28 BRT, com `.next/types/app/ai-video-generator/[engine]/page.ts` preservado (3.577 bytes). Os cinco contratos críticos atuais de `.github/workflows/guardiao.yml` passaram entre 23:31:03 e 23:31:22 BRT. [Horários e exit codes](GATES-CRITICOS.json); logs adjacentes.

| Contrato crítico | Verificações informadas pelo teste | Exit |
|---|---:|---:|
| sharing-safety | 70 | 0 |
| five-improvements | 640 | 0 |
| locale-readiness | 2091 | 0 |
| home-curation | 178 | 0 |
| showcase-premium | 287 | 0 |

**TESTADO LOCALMENTE — limites:** showcase emite warning React sobre `fetchPriority` no adaptador de imagem do teste; exit 0 não significa console sem avisos ou teste de navegador. Reaproveitados, por identidade dos blobs: 24 comparações de catálogo em dois estados de flag, oito rotas de motor, onze GETs das páginas/discovery e preview. Guardiões pertinentes anteriores: LLMS 91, Money 322 e Arena 81 passaram; AEO e signup mantêm as duas falhas herdadas registradas no checkpoint. **Não afirmar suíte inteira verde.** Nenhum pagamento, cadastro ou geração foi testado.

**COMPARAÇÃO VISUAL PRESERVADA:** [preview autocontido das oito páginas e hub](../../citacoes-01-pages-2026-09-10/preview-citacoes-01.html), desktop/mobile, SHA256 `5d8e35b9fe0b866710ec37977cbc0a33cbad6c5970c3b1a214257c96da09c0ff`. A conferência anterior da aplicação e suas limitações estão no [PEDIDOS / CITACOES-01](../../PEDIDOS-ENTRE-PISTAS-2026-09-03.md). Nenhuma seção visual foi alterada nesta rodada; não simular um novo antes/depois.

**EVIDÊNCIA OPERACIONAL — revisão independente:** parecer sem bloqueadores concretos no delta funcional. `c633ed8b → HEAD` inclui alterações Stripe trazidas pela main; elas não pertencem ao delta desta pista. A revisão correta é `7827f2e0 → HEAD`. O merge `35dfe3c8` tem dois pais e não deve ser aplicado como cherry-pick comum.

**GO TÉCNICO CONDICIONADO — transporte:** [REVIEW-TRANSPORTE.md](REVIEW-TRANSPORTE.md) contém a revisão independente, hashes dos scripts, 13/13 testes offline apresentados pelo Board e o preflight real somente leitura. Não houve uso da fila real. O manifesto é evidência para o integrador; os scripts não leem manifesto ou allowlist de arquivos.

**PROPOSTA DE EXECUTOR ÚNICO — Board:** integrar e publicar em uma worktree limpa `codex/*` reservada por ele; Citações permanece como fornecedora do pacote e verificadora das três URLs após o deploy. Antes de qualquer escrita de fila, registrar no Board executor, raiz, branch, SHA candidato final e SHA da main revisada. A proposta não reserva um SHA consolidado ainda inexistente.

**SEQUÊNCIA MÍNIMA PARA O BOARD — instrução de integração, não executada:**

1. Fixar a main remota e a fila reais; confirmar que não avançaram e que ambas estão contidas no candidato. Criar a integração limpa a partir da main atual, preservando a main suja e `.publication-temp/`.
2. Incorporar a branch desta pista até o commit deste handoff por merge normal, preservando a ancestralidade de `35dfe3c8`. Isso traz os funcionais `7f3f9622`, `b6191289`, `c633ed8b` e os registros posteriores, sem reaplicar Stripe como alteração de Citações. Não usar união automática para conflitos do PEDIDOS.
3. Incorporar o commit revisado do transporte que o Board produzir e a sequência do kit v6: `cc9e332f09f3f1b93537515f90d7b6b3ce8d0c42`, depois seu filho `8ff80e65b62a287152d97990f65a6e160fbd1cb6`. Alvo atualizado pelo Board durante esta revisão. Ambos alteram somente `docs/KIT-AFILIADOS-2026-09-08.md`; o segundo acrescenta a ativação em português (+60/-1), conforme Git conferido. Não aplicar somente um dos dois commits. A revisão comercial nominal continua com a pista dona; não copiar contatos privados para Git.
4. Acrescentar somente os pedidos nominais por ID da fila única já revisada pelo Board, preservando os appends de todas as pistas. AF-13: C-BR02/C-BR01/C-ES01; complementos D-BR01, B03, D-BR02, A01, A03 e A22; reconciliações B02/A21; holds P04/P08 preservados. Pedidos P3 devem vir da sequência documental própria indicada pelo Board, sem trocar nomes, ampliar escopo ou supor revisão de Claude. Marcar pedido registrado, não recebido ou liberado. Não enviar contatos.
5. Rever o diff consolidado inteiro, privacidade, conflitos e gates da árvore final. Repetir typecheck com tipos Next e cinco contratos críticos se a integração alterar base/código; manter as falhas herdadas fora da alegação de verde geral. Conferir hashes dos scripts aprovados e preflight no ambiente final.
6. Com a worktree final limpa e o executor/SHA reservados, executar dali `bash scripts/enfileirar.sh`. Confirmar que a fila recebeu exatamente o candidato revisado. Se recusar, parar e reconciliar; não limpar dados nem forçar ref.
7. Na mesma worktree, chamar o **novo** `scripts/!RODAR-AGORA.bat CANDIDATE_SHA REVIEWED_MAIN_SHA`, substituindo ambos pelos SHAs completos de quarenta caracteres efetivamente revisados. O wrapper infere sua raiz pelo diretório onde está instalado. Não usar o BAT sujo da raiz C:/kineo ou o SUBIR-SITE antigo sem argumentos.
8. Confirmar ancestralidade remota e deployment ativo, então três páginas 200 com canonical/componente próprios e oito links no hub/sitemap/llms. Estado INCERTO exige consulta e reconciliação, nunca reenvio cego. Só então mudar a contagem de cinco para oito publicadas.

**NÚMERO / ESTADO — saldo:** um pacote integrado revisado nesta entrega; zero página nova adicional, enfileiramento, publicação, envio, render ou pagamento realizado. Acumulado: oito páginas produzidas, cinco publicadas, três locais. Última medição de citações: 3/20 às 20h, ante 4/20 à tarde; busca separada 7/20 em ambas. **QUESTÃO PENDENTE / DESCONHECIDO:** compradores externos e receita desta pista, sem consulta financeira canônica.

**PRÓXIMA AÇÃO — comercial:** após este handoff, priorizar a página existente de custo por filme e a passagem direta a planos, conferindo o que já está implementado para não duplicar a calculadora. Definir coorte, obstáculo, mudança mínima, evento existente e parada antes de editar; no máximo duas variantes. Arquivos reservados viram pedido. A dependência de transporte permanece única no Board, sem novo pedido de gasto/acesso ao fundador.
