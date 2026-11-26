# C1 — elenco e gênero no caminho sem marcadores · 26/11/2026

**IMPLEMENTADO / TESTADO LOCALMENTE.** Branch `codex/c1-elenco-sem-marcadores-2611`, base `5eb546cb78a902b555256b89bc990982c75ed975`. Escopo da fila `docs/semana-2/FILA-GPT-2611.md`, item C1. Revisão independente e publicação pendentes. Nenhum push, render, acesso a banco, nova chamada de IA ou gasto.

| Etapa | Diagnóstico e correção |
|---|---|
| Parser | **FATO CONFIRMADO / TESTADO LOCALMENTE.** O roteiro inédito do guardião tem `segments.length = 0` no parser real; pertence à condição do recibo `hoje/sem_marcadores` em `app/api/generate-video-cinematic/route.ts:9039`. |
| Extração determinística | **FATO CONFIRMADO.** `lib/cinematic/folhaDePersonagem.ts:313` usa uma única ocorrência de `SEM_NOME_RE`. No ensaio, encontra apenas `the adult engineer`, com gênero `null`. A segunda pessoa aparece somente fazendo uma pergunta. |
| Leitura e aplicação | **FATO CONFIRMADO / TESTADO LOCALMENTE.** O validador semântico aceita os dois papéis presentes no texto, mas a base `5eb546cb7`, `lib/cinematic/elencoSemantico.ts:695`, retorna `null` quando o protagonista não tem nome próprio. O conferidor seguinte não adiciona papéis. A rota agora passa uma opção somente quando `kling4TrialCandidate && verbatim && parsedScript.segments.length === 0` (`route.ts:4166`). |
| Gênero | **FATO CONFIRMADO / TESTADO LOCALMENTE.** A ficha determinística sem gênero era mantida mesmo com evidência no texto. A correção admite apenas papel humano validado. O pronome precisa concordar com o leitor, iniciar a frase seguinte à apresentação do papel e não disputar essa apresentação com outra pessoa do elenco. Citação, conflito ou ausência de prova não viram gênero. Código em `lib/cinematic/elencoSemantico.ts:642`. |
| Casting e plano | **FATO CONFIRMADO / TESTADO LOCALMENTE.** As novas fichas copiam o papel, a idade literal quando existe e o pronome comprovado, com origem `autor`. O casting real conserva essas fichas sem chamada; `lerCastingAjuste`, `elencoDoFilme15` e o ajuste real de prompts preservam a segunda pessoa. O teto existente de dois personagens continua. |
| Regressão | **TESTADO LOCALMENTE.** `node scripts/test-elenco-sem-marcadores-2611.mjs --json`: 43 asserções principais e 12/12 mutantes mortos (235 asserções executadas contando as passagens parciais dos mutantes). `tsc --noEmit --incremental false -p .`, Node 22: saída 0. Gate da área será registrado após o commit limpo. |

## ✅ O QUE VOCÊ PRECISA FAZER

**SUGESTÃO.** O revisor independente deve executar o guardião com casos próprios só de adultos e conferir o escopo da condição real da rota. Após o parecer, a CEO decide o pacote e a publicação. O autor não publicou nem enfileirou.

## 📋 O QUE ACONTECEU

**TESTADO LOCALMENTE.** O simulador executa declarações da rota real, parser, validador de leitura, extração determinística, aplicação, conferência, casting, complemento do elenco e ajuste de cena. A resposta semântica é simulada e passa pelo validador real. Não é um POST HTTP completo, nem prova de resultado do motor. O guardião bloqueia rede/SDK e compara os caminhos fora do escopo com blobs da base fixa.

**TESTADO LOCALMENTE.** Antes: uma ficha, sem gênero, segundo adulto ausente. Depois: `the adult engineer`, gênero `man`, com `pronoun from script: he`; `the adult nurse`, gênero desconhecido, presente. A idade inventada para outro caso de teste é preservada literalmente. Casos de ausência, leitura inválida, papel inventado, pronome citado, outra pessoa na apresentação e conflito entre pronomes não ampliam o elenco nem inventam gênero.

**FATO CONFIRMADO.** A opção padrão da função continua desligada. Filme fora do candidato Kling 4, modo não verbatim, roteiro com marcadores, qualidade herdada, Hollywood, ficha de estrela, desenho, presenter e faceless conservaram o resultado da base no ensaio. Nenhuma chave de oferta, cobrança, admissão, segurança ou quantidade de chamadas foi alterada.

**QUESTÃO PENDENTE / DESCONHECIDO.** A leitura semântica real ainda pode omitir a pessoa; este conserto não inventa uma leitura quando ela falha. A ligação do pronome é deliberadamente conservadora: gêneros não inequívocos permanecem desconhecidos. O simulador não garante que o motor desenhará as duas pessoas. Essa última prova pertence ao canário autorizado pela CEO.

Reprodução offline:

```powershell
node scripts/test-elenco-sem-marcadores-2611.mjs --json
node node_modules/typescript/bin/tsc --noEmit --incremental false -p .
```

**SUGESTÃO.** Reversão restrita: retirar o quarto argumento `semMarcadores` da chamada em `route.ts:4166`; o padrão antigo permanece disponível. Não exige migration nem variável externa.
