# DECISIONS.md — Decisões aprovadas pelo fundador

Só entra aqui o que o Joseph aprovou explicitamente. Uma decisão registrada aqui **não pode ser alterada em silêncio** por nenhuma tarefa.

Formato: data · decisão · motivo · consequência prática.

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
