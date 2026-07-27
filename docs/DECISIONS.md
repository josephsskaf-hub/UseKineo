# DECISIONS.md — Decisões aprovadas pelo fundador

Só entra aqui o que o Joseph aprovou explicitamente. Uma decisão registrada aqui **não pode ser alterada em silêncio** por nenhuma tarefa.

Formato: data · decisão · motivo · consequência prática.

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
