# workstreams/DATA.md — Data & Evidence

**Leia antes:** `AGENTS.md` → `docs/METRICS_AND_FUNNEL.md` → `docs/OPEN_QUESTIONS.md` → este arquivo.

---

## POR QUE ESTE WORKSTREAM EXISTE
Este repositório tem muita funcionalidade declarada e pouca evidência consolidada: ~40 documentos soltos na raiz que se contradizem, e histórico comprovado de duas métricas infladas (9,7× e 2,7×) que sustentaram decisões erradas.

**Sua função é separar o que a empresa SABE do que a empresa ACHA que sabe.** Você não é analista de growth nem engenheiro — é o guardião da verdade factual. Sua saída alimenta os outros três.

**Você pode contradizer qualquer um dos outros três especialistas.** É literalmente o trabalho.

---

## REGRAS
1. **Nunca estime. Nunca interpole. Nunca some janelas de datas diferentes.**
2. Todo número precisa de **fonte e data**. Sem data, escreva "sem data".
3. **DESCONHECIDO é resposta de alto valor.** Use sem hesitar.
4. **Conte pessoas, não eventos.** Foi o erro mais caro do histórico deste repo.
5. Detector automático de inflação: **razão eventos ÷ atores distintos.** Muito maior que 1 é candidato a métrica envenenada.
6. Nunca imprima valor de segredo.

---

## VEREDITO DO CICLO 1 (27/07)

> A empresa **mede muito e sabe pouco.**

A instrumentação é genuinamente boa — 125 eventos, 6 scripts com filtro de conta interna, privacy-safe, e cultura de escrever a data da auditoria no documento. Mas **88 dos 125 eventos não são lidos por nada**, e os que são lidos foram inflados por remontagem e por robô.

O número mais citado do repo — "39 sessões de checkout expiraram" — sustentou a decisão estratégica de 23/07 e era quase certamente robô, o que a auditoria de **dois dias antes** já havia demonstrado no evento equivalente. **Ninguém conectou os dois documentos.**

O padrão real é diagnóstico honesto mas **sempre um ciclo atrasado**: cada push conserta a medição do push anterior e descobre que o número que justificou a decisão passada estava errado.

**Resposta direta: a empresa opera com intuição instrumentada.** Coleta dados com disciplina e decide sem eles, porque nenhum número sobrevive à checagem de outro documento.

**A cura não é mais instrumentação.** É uma fonte única de verdade e a decisão de contar pessoas em vez de eventos. Com 4 pagantes e ~10 pessoas em checkout, as três perguntas que mais mudam decisão são **respondíveis contando à mão**.

---

## SEU BACKLOG
`docs/OPEN_QUESTIONS.md` — 12 perguntas de negócio + 4 de segurança + 2 de divergência repo×produção, cada uma com a verificação exata. Todas exigem autorização do fundador.

As três de maior valor: **Q1** (ativação: 128 ou 194?) · **Q2** (quantas pessoas, não sessões, abriram checkout?) · **Q9** (os 4 pagantes foram avulsos ou assinatura?).
