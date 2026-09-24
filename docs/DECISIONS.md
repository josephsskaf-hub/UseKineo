# DECISIONS.md — Decisões aprovadas pelo fundador

Só entra aqui o que o Joseph aprovou explicitamente. Uma decisão registrada aqui **não pode ser alterada em silêncio** por nenhuma tarefa.

## 2026-09-24 — Sete respostas do fundador às pendências das 3 jogadas

**DECISÕES (fundador, 24/09/2026 ~01h BRT, no chat do Claude Code, uma palavra cada):**
1. **Anual: "recarga mensal".** O plano anual passa a receber TIER_CREDITS todo mês (SET, sem rollover), pelo cron diário `app/api/cron/annual-credit-refill` (dry-run por padrão, agendado com `?confirm=SEND`; razão idempotente em `events` name=`annual_credit_refill`). A promessa do FAQ ("credits reset each month") fica verdadeira. Zero assinantes anuais na vida até esta data.
2. **Porta do formato colado no Kineo 1: "vai"** (trava 8.2 liberada nominalmente para `app/api/generate-video-fast`): a rota passa a ler o teto por modo da fonte única `lib/analyzeLimits` (verbatim 5.000; IA reescreve 20.000; clipe 6.000) em vez de 5.000 cravado, e um plano de cenas com fala rotulada (Voiceover:/Narrator:/VO:) deixa de ser recusado como "shot plan". Eventos novos: `prompt_over_writer_cap`, `shot_spec_with_speech_admitted`.
3. **Crons mortos do vercel.json: resposta "não (cartas não estão trazendo pessoas para compra)"** — o "não" e o motivo apontam para lados opostos; PENDENTE de confirmação (ver PEDIDOS TRES-JOGADAS-R2). Nada foi desregistrado.
4. **Rascunhos aos briefs de empresa: "sim".** 4 rascunhos criados no Gmail do fundador (Help Me Tenerife, Ascend AI, restaurante em Amã, eCredit.ng), cada um respondendo ao pedido que a pessoa escreveu no Studio, com o link de US$100 amarrado à conta (`client_reference_id`). O fundador revisa e envia.
5. **Adaptive Pricing na Stripe: "deixa".**
6. **Trial de cadastro novo: "manter" 10 créditos** (revisão de 30/09 antecipada; ChatGPT 5,1% × 1,4%).
7. **Rastreio de prompts: "manual até virar alguma coisa"** — painel semanal do Cowork, sem ferramenta paga.

**Kineo Empresas LIGADO em 24/09:** Payment Link `plink_1UJ23XIah5dxzSBfyfKlmOGV` (US$100, criado pelo Cowork em 23/09), cartão no Studio ativo, webhook reconhece pelo id do link; as 6 falhas do webhook da semana eram 2 checkouts abandonados de 18/09 (Supabase lento), sem pagamento perdido.


## 2026-09-23 — "Faz as 3": parede v1 + consertos, Kineo Empresas por Payment Link, páginas citadas viram portas do motor pago

**DECISÃO APROVADA (fundador, 23/09/2026 ~22h BRT, no chat do Claude Code):** "faz as 3, o que voce precisa de mim criar o link de 100 usd no stripe? se sim, cria um script pro cowork fazer isso pra mim, ele sabe fazer isso, e vamos dar sequencia." Aprova as três jogadas de `docs/ANALISE-CEO-OPORTUNIDADES-2026-09-23.md` como descritas ali, inclusive as mecânicas novas de conversão que o congelamento de 09/09 reservava a ele: (1) parede v1 dentro do modal de crédito (título do roteiro, gap exato, Starter primeiro e sem selo "recommended" no Creator nesse bloco, roteiro guardado 45 min, render só no clique) + copy positiva da caixa de top-up + padrão MENSAL no /pricing + retorno do pack ao Studio + `intent_campaign` no pack; (2) Kineo Empresas vendido antes de construído: Payment Link de US$100 na Stripe (produto novo, fora da tabela de planos; US$500 por 5 fica para depois do 1º pagamento), cartão no Studio quando o texto parece pedido de anúncio de empresa, fundador opera os 3 primeiros; inverte a decisão de 23/09 manhã ("construir a ferramenta antes da prospecção") e congela o protótipo HTML até o 1º pagamento; (3) bloco "cole o roteiro do ChatGPT → Seedance" acima da dobra nas 4 páginas que o ChatGPT já cita, sem trocar título/H1, + correção dos fatos que a IA lê + páginas /for deixam de carimbar `utm_source=google` + página de dados `/seedance-vs-veo-vs-kling` + painel semanal de prompts (Cowork).

**Motivo:** 8 candidatas refutadas 3/3 pelos dados; estas três são o que sobrou com número honesto (+US$60-130 MRR e US$200-500 avulsos em 90 d). A máquina de converter é boa (~10% dos cadastros ChatGPT de países que pagam em minutos); o topo está parado.

**Consequência prática:** preço dos 3 planos INTOCADO (US$9,90/19,90/39,90 até 09/10). O que continua pendente e é dele: anual (recarga mensal ou esconder; hoje o anual concede crédito 1×/ano e o FAQ promete mensal), os 4 rascunhos pessoais aos briefs quentes (consentimento não gravado), crons mortos do `vercel.json`, a porta do formato colado (5.000 caracteres e recusa de "shot plan" em `generate-video-fast`, trava 8.2: exige "vai" nominal), e a ferramenta paga de rastreio de prompts. Leitura: 14 dias com corte no deploy; números de morte em `docs/ANALISE-CEO-OPORTUNIDADES-2026-09-23.md` §3.


## 2026-09-23 — Diretor Kineo: sugestão opcional antes de gerar

**DECISÃO APROVADA:** ao responder “Concordo, vamos seguir”, o fundador aprovou iniciar o protótipo UX de uma sugestão de prompt/ideia no Studio, antes da geração. Original preservado, comparação e aplicação explícita, com opção de editar/manter original. No modo verbatim, não reescrever narração silenciosamente; não iniciar render, cobrar créditos ou trocar configurações ao sugerir/aplicar.

**ESCOPO APROVADO:** Codex prepara protótipo local antes/depois desktop/mobile; Claude recebe contrato de reaproveitamento técnico, sem rotina nova ou leitura presumida. Especificação em `docs/growth/DIRETOR-KINEO-2026-09-23.md`. Aprovação conceitual não é aceite visual, ativação em produção, gasto adicional, mudança de oferta/modelo ou garantia de resultado. Reservas, gates, duas variantes comerciais e corte semanal permanecem.

**ADENDO / ACEITE DO DESENHO EM23/09:** a sessão Kineo · Melhorias UX e UI registrou a mensagem direta do fundador “gostei muito aprovado” para DIRETOR-KINEO-PREVIEW.html, SHA25685DA8B1253335E629865EF6EF892F9F256CE806993C4AA7FA0A6DB6C872CFC0B. Board reconferiu arquivo/hash e registro ENTREGA.md. O aceite do desenho está resolvido para esse objeto; a mensagem não discrimina dispositivos/estados e não certifica integração, navegador, gasto ou publicação. Próxima etapa é reconciliação técnica do contrato com Claude, sem presumir leitura ou início.

Formato: data · decisão · motivo · consequência prática.

## 2026-09-22 — Exceção nominal P3-017: duas mensalidades a 50%, seguintes a 30%

**DECISÃO APROVADA pelo fundador no Board, 22/09/2026 14:27 UTC:** exclusivamente para P3-017, comissão de 50% nas duas primeiras mensalidades elegíveis efetivamente pagas de CADA cliente externo atribuído a esse parceiro; 30% nas mensalidades seguintes. O fundador esclareceu “Nos2 primeiros meses” e confirmou exclusividade após a explicitação do Board. Identidade e conversa permanecem no ledger privado de Afiliados.

**Motivo:** viabilizar a proposta ao candidato existente, que ainda não confirmou aceite. Não é prova de primeiro afiliado ativado, publicação ou venda.

**Escopo:** não altera taxa global, não se limita ao primeiro cliente e não concede 50% indefinidamente. Anuais, packs, trial, piloto gratuito, créditos, bônus e novos acúmulos não estão incluídos por inferência. É uma exceção separada do piloto AF-R2-05; não altera contratos históricos de terceiros nem reabre PayPal/50-30 já aprovados.

**Consequência / BLOQUEADO para promessa externa até validação:** Claude responde pela capacidade operacional financeira; Afiliados prepara proposta privada e coordena. Pedido único AF-P3-017-20260922 em PEDIDOS-ENTRE-PISTAS. Aprovação comercial não comprova implementação, configuração nominal, aceite do parceiro ou pagamento. Rascunho privado autorizado; envio depende de revisão separada, supressões atuais e capacidade validada. Não há autorização de escrita direta em banco, migration, render ou pagamento de teste por este registro.

---

## 2026-09-01 — Uma moeda comercial: USD em toda a jornada

**Decisão do fundador.** A UseKineo lista e cobra seus preços em USD para todos os países. A empresa não promete que mostrará ou cobrará em moeda local; eventual conversão e taxas pertencem ao banco do comprador.

**Motivo.** A mesma moeda e as mesmas informações da descoberta ao Checkout criam credibilidade exatamente no último segundo de decisão. Prometer moeda local e apresentar USD no caixa introduz surpresa onde a pessoa decide se confia o cartão à Kineo.

**Consequência prática.** Site, SEO/AEO, ofertas, e-mails, recuperação e Checkout precisam nomear USD de forma consistente e derivar preço da fonte canônica. Moeda local não volta por copy, geolocalização ou experimento silencioso; qualquer futura regionalização exige nova decisão explícita, tabela canônica, cobrança real na mesma moeda e contrato que impeça divergência. O gate de conversão da verdade USD permanece preservado: uma nova otimização de moeda ou caixa só ocorre depois da amostra já registrada no handoff.

---

## 2026-09-01 — Assinatura real é o placar comum de todo o board

**Decisão do fundador.** Toda tarefa geral da UseKineo deve declarar como contribui para converter mais assinaturas no curto, médio e longo prazo. Aquisição, AEO/SEO, B2C, B2B, afiliados, ativação, oferta e checkout são partes do mesmo sistema e precisam se complementar.

**Motivo.** Visita, cadastro, vídeo gerado, clique e Checkout Session são etapas úteis, mas não são receita. O objetivo comum das mudanças é transformar demanda e valor percebido em pagamento, assinatura ativa e renovação.

**Consequência prática.** Nenhuma iniciativa entra no board sem: cadeia causal até assinatura; métrica por pessoa externa; gate de sucesso e de parada; e verificação de conflito ou duplicação com experimentos já ativos. Curto prazo mede avanço qualificado até pagamento; médio prazo mede conversão em assinatura; longo prazo mede renovação, indicação e receita recorrente. `payment_success` e assinatura ativa são o placar final — etapas intermediárias nunca são apresentadas como venda.

---

## 2026-07-27 — Modelo operacional: o fundador fala só com o CEO

**Decisão.** O Joseph conversa exclusivamente com a sessão do CEO operacional. O CEO recorta o trabalho, distribui aos especialistas, acompanha e consolida. O fundador nunca precisa abrir as sessões especialistas para trabalhar — só para ler, se quiser.

**Motivo.** Evitar que o fundador vire o roteador de contexto entre quatro sessões, e evitar decisões contraditórias entre especialistas.

**Consequência.** O CEO lê os transcripts dos especialistas e manda instrução direta a eles. Um especialista nunca recebe ordem do fundador diretamente.

---

## 2026-07-27 — Quatro especialistas, não três

**Decisão.** Além de Design & Experience, Growth & Acquisition e Development & Systems, existe um quarto: **Data & Evidence**.

**Motivo.** O repositório tinha ~40 documentos soltos na raiz que se contradizem, e histórico comprovado de duas métricas infladas (9,7× e 2,7×) que sustentaram decisões erradas. Sem um cético dedicado, os outros três produziriam planos sobre números que não existem.

**Consequência.** Data & Evidence pode contradizer qualquer um dos outros três. Sua saída alimenta os demais.

---

## 2026-07-27 — Ciclo 1 é somente leitura

**Decisão.** A primeira rodada de cada especialista não escreve nada: sem editar arquivo, commit, push, build, deploy, script de `scripts/`, credencial ou comunicação externa.

**Motivo.** Auditar antes de agir. Diferenciar implementação de evidência.

**Resultado verificado em 27/07.** Dev, Growth e Data terminaram com working tree **completamente limpa**. Gate respeitado.

---

## 2026-07-27 — Design mexe em forma, não em conteúdo

**Decisão.** O especialista de Design **não pode** alterar preço, número de crédito, headline, CTA textual, promessa ou posicionamento. Isso é do Growth.

**Motivo.** Se Design mexer em copy antes de Growth definir a oferta, os dois entram em contradição e o trabalho precisa ser desfeito — o fundador perde duas rodadas em vez de ganhar uma.

**Consequência.** Se Design identificar que a oferta está confusa na tela, descreve o sintoma e levanta como requisito para Growth.

---

## 2026-07-27 — Entrega de design exige comparação visual

**Decisão.** Toda entrega de design ou UX inclui **antes/depois que o fundador consiga olhar** — não descrição em texto.

**Motivo.** O fundador avalia design olhando. "Ajustei o tracking do h1" não permite decisão, e sem o antes ao lado não dá para medir o salto.

**Consequência.** Design entrega as edições **mais** um HTML estático autocontido; o CEO abre e entrega a imagem. Seção que não está no preview não chega ao fundador. Detalhe em `AGENTS.md` §8.

---

## 2026-07-27 — Criar a fonte única de verdade

**Decisão.** Criar `AGENTS.md` e `docs/` como fonte canônica, para os especialistas puxarem contexto do repositório em vez de depender do CEO repetir tudo a cada sessão.

**Motivo.** Antes disso, as instruções viviam só nas mensagens de chat. Se a sessão morresse, o conhecimento morria junto.

**Escopo aprovado.** Escrever os arquivos. **Não** commitar, **não** subir. O fundador revisa antes.

---

## 2026-07-27 — REPOSICIONAMENTO: vender vídeo em atacado, não ferramenta no varejo

**Decisão do fundador.** Parar de vender assinatura de ferramenta de um em um e passar a vender **pacotes de vídeo em atacado** para clientes maiores, que compram 10–50 de uma vez. *"Não ficar pingando de um em um."*

**Motivo.** 713 cadastros produziram 4 compras avulsas e ZERO assinaturas recorrentes em ~3 meses. O ICP que paga quer serviço, não ferramenta — e é o único sem porta de entrada no site.

**Escada de preço APROVADA (27/07):**

| Pacote | Preço | Por vídeo | Custo real | Margem |
|---|---:|---:|---:|---:|
| 10 vídeos | **$99** | $9,90 | $0,50 | ~96% |
| 20 vídeos | **$179** | $8,95 | $1,00 | ~96% |
| 30 vídeos | **$249** | $8,30 | $1,50 | ~96% |
| 50 vídeos | **$379** | $7,58 | $2,50 | ~96% |

**Base do custo (FATO CONFIRMADO):** `lib/credits/engineCost.ts:32-35` declara que o Fast custa **~$0,02–0,05 para servir**. Margem já líquida de Stripe.

**Ancoragem (de `lib/comparisons.ts`):** 50 vídeos custam $4.000 na Tasty Edits e $1.547 na VidChops. Kineo a $379 é **4× a 10× mais barato**.

**Escopo dos pacotes:** vídeo **Fast** (B-roll Pexels + TTS) — o único engine VALIDADO EM PRODUÇÃO. `cinematic_ai` (20 créditos) e `avatar` (110 créditos, custo VEED ~$9,60/vídeo) **não** estão nesta escada; venderiam com economia ~60× pior e exigem tabela própria.

**Não canibaliza o Autopilot de $299:** o pacote entrega os vídeos; o Autopilot entrega **e publica sozinho no canal**. Vende continuidade, não volume.

**Consequência.** A restrição do negócio não é custo nem preço — é **achar quem compra**. Esforço de Growth vai para descoberta de canal, não para otimizar margem.

---

## 2026-07-27 — Outreach B2B liberado; e-mail de ciclo de vida segue pausado

**Decisão.** São duas coisas diferentes e têm gates opostos:
- **Ciclo de vida para a base de 713 cadastros:** PAUSADO. `KINEO_LIFECYCLE_EMAILS_ENABLED` fica desligado. *"Não quero mandar mais mensagem nenhuma por ora."*
- **Prospecção B2B nova (agências, YouTubers, empresas):** LIBERADA. O fundador quer que Growth encontre e contate.

**Limite real de capacidade, registrado.** Não existe ferramenta de envio nesta configuração — o conector de e-mail cria rascunho, não dispara. E e-mail frio em volume pelo `usekineo.com` queimaria a reputação do domínio que serve a recuperação de receita. Growth entrega tudo **até** o envio; o canal de disparo é decisão pendente.

---

## 2026-07-27 — Autorização permanente de commit, push e deploy

**Decisão.** *"Aqui você aprova tudo, deploy, commits, push, tudo é por sua conta, você não manda mensagem pra mim pra essas coisas."*

**Consequência.** O CEO commita, faz push e deploya sem consultar. Continua valendo: nada que envie comunicação externa, nada que mude preço sem aprovação, nada que escreva em banco sem autorização.

---

## PENDENTE DE DECISÃO — não execute sem aprovação

| # | Decisão necessária | Bloqueia |
|---|---|---|
| 1 | Rodar as consultas read-only de `OPEN_QUESTIONS.md` bloco A | Toda priorização |
| 2 | Corrigir o fail-open de `CRON_SECRET` (4 linhas) | Segurança |
| 3 | Agendar ou apagar os 4 crons órfãos | Recuperação de receita |
| 4 | Cadência de e-mail de ciclo de vida (evitar spam ao ligar os crons) | Item 3 |
| 5 | Virar `ignoreBuildErrors` para `false` | Qualidade — **trava deploy se a árvore não estiver em 0** |
| 6 | Corrigir o `CLAUDE.md` (afirma o domínio errado) | Toda sessão futura |
| 7 | Provar 1 entrega Autopilot ponta a ponta antes de vender o piloto de $99 | Maior exposição comercial |
| 8 | Subir ou descartar o trabalho de design das rodadas 1 e 2 | Está em worktree, não commitado |

---

## 2026-08-27 — Divisão de execução e handoff diário Codex ↔ Claude

**Decisão do fundador.** O Codex executa aquisição, fluxo e conversão em novas assinaturas. O Claude executa qualidade do gerador, render, legendas e correções técnicas desse pipeline. Uma frente só entra no território da outra por pedido explícito do fundador ou por bloqueio registrado no handoff.

**Motivo.** Permitir trabalho paralelo sem duas sessões alterarem o mesmo fluxo ou tomarem decisões sobre uma fotografia antiga do produto.

**Consequência prática.** Antes de começar um turno, cada lado atualiza e lê `origin/main`, os arquivos canônicos de `docs/` e o handoff mais recente. Ao terminar, registra no repositório: SHA de base e de entrega, arquivos alterados, testes, estado do deploy, decisões, pendências, riscos e próximo dono. Código existente não conta como produção sem validação. O fundador recebe também um bloco `COPY` completo para repassar ao outro executor.

**Regra de conflito.** Nunca há duas tarefas escrevendo na mesma working tree. Se houver sobreposição de arquivos ou se `origin/main` avançar durante o trabalho, a integração é refeita sobre a ponta remota e preserva explicitamente o trabalho já publicado.

**Dono do Plan Fit.** O Plan Fit pertence ao workstream do Codex (aquisição e conversão). A versão canônica é a que entrou em `origin/main` pelos commits `4dff13d` e `f62997b`; o segundo fecha a corrida de evidência entre abas antes de impressão e checkout. O protótipo paralelo `3173247`, criado na frente Growth/Claude, não deve ser cherry-picked nem continuado. Em 27/08/2026, `codex/plan-fit` foi rebaseada sobre `origin/main` e ficou sem commit exclusivo.

---

## 2026-08-27 — Vitrine da home restaura a curadoria autorizada pelo fundador

**Decisão do fundador.** Restaurar na home a apresentação visual multi-engine: Veo 3.1, Kling 3, MiniMax H3 e Omni Flash no topo; Kineo 1, Seedance, Kling 2.5, Veo 3.1, Kling 3 e Avatar no bento; e uma terceira fileira variada com os motores da Kineo.

**DECISÃO APROVADA.** A fonte canônica dessa vitrine é `lib/publicExamples.ts`, em `PUBLIC_ENGINE_EXAMPLES`. Em 27/08/2026, depois da reconciliação técnica mostrar que três ativos estavam ligados a contas externas à lista interna, o fundador confirmou explicitamente que todos os vídeos da curadoria são dele, assumiu a responsabilidade e autorizou restaurá-los.

**EVIDÊNCIA DE PRODUÇÃO (2026-08-27).** Uma consulta somente leitura reconciliou os candidatos com `videos.user_id → profiles.email` e a lista de contas internas em `lib/internalAccounts.ts`. Essa evidência identifica a conta, não a titularidade jurídica do vídeo; a confirmação direta do fundador governa a autorização de exibição.

**Consequência.** `CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED` continua `false`; nenhuma linha dinâmica do banco é publicada, indexada ou transformada em link `/v/`. Só a allowlist estática autorizada aparece. A terceira fileira recebe o rótulo honesto `Made with Kineo — every engine`, e não `Trending now`. Novos exemplos exigem confirmação de propriedade ou consentimento documentado.
---

## 2026-09-01 â€” ComunicaÃ§Ã£o comercial e cobranÃ§a somente em USD

**DecisÃ£o do fundador.** A Kineo anuncia preÃ§os e cobra somente em **USD**. NÃ£o promete moeda local, conversÃ£o automÃ¡tica nem um valor local diferente do que aparece no Stripe.

**Motivo.** A consistÃªncia entre site e checkout cria credibilidade exatamente no Ãºltimo segundo da decisÃ£o de compra. Uma promessa de moeda local seguida por cobranÃ§a em dÃ³lar faria o contrÃ¡rio.

**ConsequÃªncia.** `lib/checkoutPricing.ts` continua sendo a fonte Ãºnica, `CheckoutCurrency` permanece restrito a `'usd'`, e novas superfÃ­cies comerciais devem rotular USD com clareza. Alterar moeda, preÃ§o ou conversÃ£o exige nova decisÃ£o explÃ­cita. Literais histÃ³ricos BRL/INR que nÃ£o possuem caminho vivo sÃ£o dÃ­vida tÃ©cnica, nÃ£o autorizaÃ§Ã£o para reativÃ¡-los.

---

## 2026-09-03 — Growth orientado a ação criativa, não repetição

**Decisão do fundador.** A operação de aquisição e assinatura deve executar ações, não apenas produzir leituras. Cada nova rodada procura uma mecânica diferente, evita repetir telas e relatórios já em gate e usa dados para decidir o que fazer — não como substituto do que fazer.

**Motivo.** O fundador observou uma queda recente de entradas e Checkouts e identificou repetição na produção das sprints. Mais volume de artefatos semelhantes não reduz dependência de canal nem aumenta assinatura.

**Consequência.** Toda rodada de Growth classifica a ação como `NOVA`, `PARCIAL` ou `DUPLICADA`; ação duplicada não é publicada. Diagnóstico termina em executar, não executar ou pivotar. Queda só é atribuída a código após comparação de pessoas externas em janelas equivalentes e por fonte. O placar final continua sendo assinatura e receita real.

---

## 2026-09-05 — Codex assume UX integral; Claude concentra fluxo e assinaturas

**DECISÃO APROVADA — pedido explícito do fundador nesta conversa em 05/09/2026.** Codex passa a cuidar de navegação/botões, organização visual de TODAS as páginas, refinamento da home e espanhol com inglês padrão. Claude concentra fluxo, aquisição e novas assinaturas. Esta responsabilidade substitui a divisão de 31/08 no que conflitar com ela; não substitui regras de segurança e coordenação.

**Limites preservados.** Comparação visual antes/depois e aprovação por lote, vídeos reais da vitrine mantidos, sem alterações em motores/render, preços, créditos, termos ou promessas. Idioma de interface não altera moeda nem idioma de narração. Mudanças comerciais em arquivos de UX exigem coordenação antes de editar. Não há nova autorização de contatos, gasto ou escrita no banco.

**Registro operacional.** Plano, inventário integral e comunicação ao Claude em `docs/ESCOPO-CODEX-UX-CLAUDE-VENDAS-2026-09-05.md`, `docs/PLANO-UX-NAVEGACAO-EN-ES-2026-09-05.md` e `docs/INVENTARIO-PAGINAS-UX-2026-09-05.md`. Publicar o comunicado no Git não prova recebimento: ACK do Claude permanece pendente até resposta.

### Primeiro bloco de execução — oito horas

**DECISÃO APROVADA, 05/09/2026:** o fundador substituiu a proposta de 45 horas por blocos de oito horas e autorizou o primeiro agora. Janela operacional fixada em 05/09 10:14–18:14 BRT; próximo bloco só com nova autorização. Não há compromisso de finalizar todas as páginas antes dos gates de qualidade e aceite visual. Tentar terminar nas primeiras oito ou dezesseis horas é objetivo, não certificação antecipada nem renovação automática. Controle de uso a cada duas horas; não consumir resets/comprar créditos sem autorização.

## 2026-09-07 — Direção tipográfica B aprovada

**DECISÃO APROVADA:** o fundador escolheu Manrope (B), autorizou substituir a tipografia do site e entregar publicada para sua revisão. Inclui hierarquia mais leve da proposta aprovada, mantendo vídeos, layout estrutural, navegação, oferta, moeda, créditos e fontes dos vídeos intactos. Trabalho em worktree isolada, com comparação visual, typecheck, testes e validação do deploy. Não é autorização para nova reforma funcional nem mudança de segurança.

O fundador também pediu cinco recomendações e sugestão de uma terceira língua. O idioma adicional depende de sua escolha; não adicionar silenciosamente. Registro e evidências em docs/HANDOFF-CODEX-MANROPE-2026-09-07.md.

## 2026-09-07 — Cinco melhorias autorizadas após Manrope

**DECISÃO APROVADA:** executar as cinco recomendações: reduzir avisos concorrentes, uniformizar ações/destinos, destacar continuidade na biblioteca, completar lacunas de espanhol e corrigir pendências de privacidade/garantias críticas de CI. Worktree codex/five-improvements-2026-09-07 a partir de origin/main 5b155dc5. Comparação visual e testes antes de publicação. Sem nova língua, preço, crédito, render, campanha ou operação manual em dados de clientes. Mudanças de segurança testadas com dependências simuladas.

## 2026-09-07 — Complemento aprovado: galeria, CSS e terceiro idioma por evidência

**DECISÃO APROVADA:** o fundador aprovou as cinco melhorias olhando o preview, pediu Meus vídeos sem múltiplas propagandas acima da galeria, rejeitou português e escolheu selecionar a terceira língua pelos dados de países. Após o relatório `docs/IDIOMA-POR-EVIDENCIA-2026-09-07.md`, autorizou os ajustes pendentes e a verificação dos sistemas em todas as línguas. Hindi é opção manual, não idioma imposto pela localização. Inglês continua padrão e espanhol é preservado. País não é prova de língua individual.

**ESCOPO:** corrigir o CSS estático que causa divergência SSR/hidratação; manter uma oferta principal em Meus vídeos e recolher opções secundárias após a galeria; hindi no sistema explícito de rótulos com fonte Devanagari; testes locais e de navegação nos três idiomas. Textos desconhecidos permanecem em inglês, não recebem tradução automática. Não afirmar tradução integral de artigos SEO/admin/e-mails nem teste pago completo. Sem mudar roteiro, idioma de geração, valores, créditos, preços, render, campanha ou dados de clientes. Commit, CI e deploy seguem os gates já aprovados.
