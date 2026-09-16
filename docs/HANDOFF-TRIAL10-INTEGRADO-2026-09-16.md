# TRIAL10 — pedido Claude e revisão integrada, 16/09/2026

**DOCUMENTAÇÃO APENAS.** Base remota conferida: `ba20b4823fd23aad588116e3f7a5c5431045571b`. Este handoff publica pedidos e referências; não integra código de produto, não comprova inspeção visual, não cria desconto e não envia e-mail. Publicar este texto não comprova leitura ou aceite por Claude.

## Pedido Claude: curadoria da abertura

**TESTADO LOCALMENTE / evidência reportada por Citações:** `scripts/test-showcase-premium.mjs:55` falha também na base limpa c1de7738. Há dois problemas distintos:

- Veo: o primeiro aprovado `6b9b363c-3185-4db7-a877-46b77e334f06` continua primeiro após o helper; o teste espera o legado ausente `dc0fe3a6-f34d-40cb-91f4-da15841a2970`.
- Kling 3: o primeiro aprovado `d6d73a90-9bd7-46a3-826a-9a4a72549e05` é ultrapassado pelo legado `216cbed2-b95f-47e7-98bc-e4c3fc3010a9`, promovido da quinta posição. É regressão real de ordenação.

Cadeia de reprodução: `APPROVED_HOME_VIDEOS_SEP16` em `lib/homeVideoCuration.ts:34` → catálogo de `scripts/test-home-curation.mjs --data` → filtro por motor em `app/KineoLanding.tsx:1047` → `orderHeroVideos` em `lib/ui/heroOpening.ts:10` → `videos[0]` em `components/EngineCycleCard.tsx:57`. Seedance e Kling 2.5 mantiveram o primeiro aprovado no diagnóstico.

**PEDIDO / dono Claude:** respeitar o pino aprovado na ordenação e usar o legado apenas como fallback, sem trocar assets nem duplicar IDs em outro mapa. Validar helper/consumidor reais, os quatro motores, ausência do pino e motores pausados. O oráculo deve refletir a decisão aprovada independentemente da implementação. Não simplesmente reancorar o teste para fazê-lo passar. O guardião original foi preservado por Citações; a cópia diagnóstica não é patch aprovado. A ordem efetiva em produção permanece desconhecida até inspeção.

Evidência completa disponível nesta máquina: `C:/kineo/.claude/worktrees/citacoes-disponibilidade-20260916/docs/citacoes-chatgpt/2026-09-16-trial10/curadoria-entrada-saida.json`. A reprodução diagnóstica nesse diretório depende do loader local novo; não foi publicada isoladamente como script executável deste handoff.

## Pedido Claude: consumidores da entrada

**FATO CONFIRMADO no candidato MMR / pedido de copy, sem alterar regras:** `app/(dashboard)/generate/GenerateClient.tsx`, WelcomeBanner perto de 21862, ainda promete todos os motores liberados quando trialLive=true. `app/(dashboard)/viral-now/ViralNowClient.tsx:400` também promete todos os motores com os créditos grátis. Atualizar condições de plano, saldo e manutenção com a fonte canônica, preservando callbacks, flags e saldo real da conta. Cobrir contas com 10 e 30 créditos e trial inativo; não conceder nem retirar crédito por esta correção. Revisar também `/ph` e mensagens de crons/admin/send-* sob posse de Claude, sem disparar mensagens para testar copy.

## Pacotes locais para uma única revisão

**DECISÃO transmitida pelo Board:** novas contas recebem 10 créditos, sem cartão, suficientes para dois Kineo 1 de 60 segundos; saldos antigos de 30 são preservados. Seedance custa 25 créditos por 60 segundos. Plano, saldo e manutenção são condições distintas. Primeiro filme premium grátis continua pausado.

| Dono | Candidato local | Integração e evidência |
|---|---|---|
| MMR | `219e1301e7ae75db1a0429c511f6d6bb853968cb` | Fonte `871e57f49fec1ff23aad7915d9bf0eb3e058827a`; consumidores `4d49a8c13b9bcc2c17288a973291f8df1c82ccdf`. Worktree `C:/kineo-wt/receita-12h-20260915-b`. 105 fonte, 36 superfícies, 72 promoção, 85 motores, 4 tópico e TypeScript aprovados. |
| Citações | `9c3e02c1e0130bba14cd346a0e45754da23335a1` | Worktree `C:/kineo/.claude/worktrees/citacoes-disponibilidade-20260916`. Sequência adae2f1c + e3d35607 + 9c3e02c1; e3d35607 equivale à fonte MMR, não duplicar. TypeScript, 105 fonte, GET ON/OFF, SSR de 8 guias + 12 públicas + 128 dinâmicas reportados aprovados após rebase. StructuredData consome OFFER.copy.sentence/planCardBody; integrar consumidores MMR antes da revisão final. |
| Parcerias | `afc666dd4129905426136a4f199cfa83b8784c8e` | Worktree `C:/kineo-wt/partners-trial10-20260916`. Fonte e37444ab equivale à fonte MMR, não duplicar. 35 render, 105 fonte e TypeScript reportados aprovados. Falha herdada `/affiliate fails closed` reproduzida na base e preservada. Comissão de 30% intacta. |

**PUBLICADO, documentação/teste apenas:** Diretórios ba20b482 às 14:52:46 UTC. Os 78 pacotes privados corrigidos não equivalem a 78 listagens externas alteradas.

### Previews e gate visual

- MMR, entrada: `C:/Users/josep/Documents/Codex/2026-09-15/receitas-novas/outputs/comparacao-trial10-entrada.html`.
- MMR, oferta/motores: `C:/Users/josep/Documents/Codex/2026-09-15/receitas-novas/outputs/comparacao-oferta-motores.html`.
- Roteiro conjunto, incluindo preservação de FIRST50, entrada normal e celular: `C:/Users/josep/Documents/Codex/2026-09-15/receitas-novas/outputs/handoff-unico-revisao-visual.md`.
- Citações: `C:/kineo/.claude/worktrees/citacoes-disponibilidade-20260916/docs/citacoes-chatgpt/2026-09-16-trial10/preview.html`; ENTREGA.md e matriz-publica.json no mesmo diretório.
- Parcerias: `C:/kineo-wt/partners-trial10-20260916/docs/previews/TRIAL10-PARTNERS-2026-09-16.html`.

**BLOQUEADO / evidência relatada:** preview local recusado pelo mecanismo de navegação, sem autorização de contorno. Não usar localhost, outro navegador ou renderizador para contornar. Os previews SSR têm limitações de CSS/mídia e não comprovam hidratação, playback nem navegação real. AGENTS.md §8 exige comparação visual antes/depois que o fundador consiga olhar. Claude/Board devem registrar responsável, SHA, origem legítima da revisão, desktop/celular, evidência e resultado. Curadoria e revisão visual são gates separados. Não colocar produto na fila antes de cumpri-los. Os GETs de 152 URLs do pacote de Citações mediram produção anterior; não comprovam essas URLs corrigidas.

## Campanha separada: 50% por dois meses

**AUTORIZAÇÃO DIRETA, 16/09/2026:** “Mandar email pra essas pessoas oferecendo 50off nos primeiros 2 meses”. Resposta posterior: “Só para quem ainda não recebeu e-mail hoje”. Mantido o filtro anterior de vídeo concluído, primeira compra, opt-out, contatos e contas internas.

**PREPARADA, NÃO ENVIADA:** 44 candidatas após reconciliação às 15:02 UTC e consulta de Gmail; os 36 envios anteriores do dia estão excluídos. FIRST50 cobre apenas a primeira fatura. Stripe retorna invalid_grant; painel falhou em duas tentativas; usuário foi solicitado a reconectar. Não há novo cupom criado/validado, nem nova receita confirmada.

**PEDIDO / dono checkout:** confirmar implementação segura de nova oferta 50% por dois meses em primeira assinatura Creator/Studio mensal. O gate observado em `app/api/stripe/checkout/route.ts:1732` cobre FIRST50/COMEBACK50; não presumir que outro código herde as restrições. Confirmar elegibilidade, preservação após login, duas mensalidades com desconto e renovação integral, sem trial/prorrata incompatíveis; excluir anuidade/avulso/assinatura existente. Evitar colisão WELCOME20 no caminho de preços. Não alterar o FIRST50 anterior. Nenhum patch financeiro foi feito por MMR.

O pedido `RECEITA-141-FIRST50-ANTIDUP` publicado em d37ccb6c continua sem confirmação de instalação. Referenciá-lo, sem duplicar envios ou dados pessoais. Listas, destinatários e IDs de mensagens permanecem privados; não publicá-los em Git. Revalidar supressões e pagamentos imediatamente antes de cada envio novo e registrar resultados reais. Esta autorização não cria automação nem follow-ups.

## Retorno necessário

**PEDIDO:** ACK de Claude com branch/arquivos reservados, correção de curadoria e teste, revisão visual válida, mecanismo de supressão confirmado e caminho da nova oferta. Somente depois da integração e gates, publicar produto pela fila autorizada e registrar SHA/deploy/verificação real. Documento remoto acessível não significa trabalho aceito ou executado.
