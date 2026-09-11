# [Citações] Revisão independente do transporte assistido

**PARECER — GO TÉCNICO CONDICIONADO, 10/09/2026 23h33 BRT:** os scripts revisados podem transportar um candidato previamente integrado/testado usando dois SHAs explícitos, desde que o preflight abaixo seja repetido na worktree final limpa e um executor único seja reservado. Não é autorização para publicar qualquer conteúdo ou SHA, nem atestado de execução real.

**FATO CONFIRMADO — código candidato:** `enfileirar.sh:25` atualiza a fila por CAS local com SHA anterior; `:8–13` recusa sujeira/operações pendentes/fila aberta. `publish-reviewed-queue.sh:32` envia um objeto imutável por push normal; recusa fila/base divergentes e trata ponta final inesperada como INCERTO. O BAT `:5` recebe candidato/main, ambos completos, e usa seu próprio diretório para a raiz. Não há reset, limpeza, rebase, force, retry ou fallback.

**TESTADO LOCALMENTE — fonte Board:** treze cenários offline aprovados no resultado `C:/Users/josep/AppData/Local/Temp/kineo-transport-offline-WR6ia6/result.json`, timestamp `2026-09-11T02:29:10.022Z`, SHA256 `3f931266b782de2592a48aa0a666662bb51258d8c06f00b94cfdf61ce73e0395`. O código do teste foi lido integralmente: usa repositórios bare novos locais, protocolo file, configuração isolada e preserva fixtures. Citações não repetiu os testes ou executou transporte real. A evidência cobre a corrida CAS local e a fila alterada no pre-push sem alterar o objeto publicado; não prova todos os interleavings.

| Arquivo revisado em C:/kineo-wt/transport-safe-20260911 | SHA256 |
|---|---|
| scripts/enfileirar.sh | 7b6e3bb9a3df63ee532aff4c36d5f33d2683c7777a18fd475efa301771ab1b61 |
| scripts/publish-reviewed-queue.sh | 4dd68ba16cd7a4bb2781b3b1e81f26adca6cc18b8930e2b9a750aeb6524f366c |
| scripts/!RODAR-AGORA.bat | ebb8108ba5b60c4f3895820886ac698a9691b3e520595cce79e9729a5ab75c99 |
| scripts/test-safe-transport-offline.mjs | 4d6b0a942313883fb347376b11850644030f25af80d1b0e5154e22bb05ae4ffb |
| scripts/.gitattributes | 25a57345dae42655a869d129f330b374bb1abb4aee3fef00d6b8ee4bef03bc7d |

**EVIDÊNCIA OPERACIONAL — preflight observado em 11/09 02:33:13–14 UTC:** [PREFLIGHT-TRANSPORTE.json](PREFLIGHT-TRANSPORTE.json), sem imprimir valores sensíveis. Nas duas worktrees, fetch e push de origin resolvem exclusivamente para `https://github.com/josephsskaf-hub/UseKineo.git`; fila direta em `7827f2e07f89b55e2a020b266a48ec98247e5bd4`, não aberta em worktree; nenhum hook ativo ou variável Git de redirecionamento listada. Sem configuração de mirror, receivepack, sshCommand, followTags ou hooksPath. As worktrees têm trabalho em andamento; **não são candidatas limpas para enfileirar agora**. A pasta temporária preservada de Citações não deve ser removida para satisfazer o gate.

**CONDIÇÕES OBRIGATÓRIAS ANTES DO USO:**

- Ref da fila direta e posse coordenada: o `update-ref` usado segue symrefs. O script não recusa por si só uma fila simbólica para outra branch.
- Ambiente sem `GIT_DIR`, `GIT_WORK_TREE` ou outros redirecionamentos de Git: os scripts só recusam explicitamente `GIT_INDEX_FILE`.
- Origin/pushurl/config/hooks novamente conferidos na raiz final; a proteção desses valores é do preflight, não do script genérico.
- Worktree limpa com candidato contendo main e fila, arquivos e conteúdo revisados, gates preservados, dois SHAs completos registrados e executor único.
- Mesmos hashes de transporte. Se mudar a implementação, renovar a revisão pertinente antes do uso.
- Usar o wrapper com dois argumentos. SUBIR-SITE/callers antigos sem argumentos não são compatíveis e falham de forma fechada.

**LIMITE CONFIRMADO:** o CAS é local; o remoto usa somente fast-forward normal de SHA fixo. Um avanço concorrente da main para outro ancestral do candidato pode ser aceito sem perder commits. Avanço divergente é recusado; resultado final inesperado vira INCERTO. Não alegar CAS remoto absoluto, atomicidade global com outras worktrees ou ausência de toda corrida possível.

**PROPOSTA DE EXECUTOR:** Board integra, reserva raiz/branch/SHA e publica uma única vez pelo protocolo aprovado; Citações revisa e valida as URLs após o deployment. A [sequência mínima do pacote](README.md) inclui as três páginas, catálogo, kit canônico e pedidos por ID. O SHA consolidado ainda não existe; nunca substituir por um SHA parcial da pista e publicá-lo como pacote completo.
